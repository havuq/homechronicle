/**
 * subscriber.js — connects to paired HomeKit accessories and subscribes
 * to characteristic value-change events.
 *
 * Exports:
 *   startSubscribers(pairings) → void
 *   stopSubscriber(deviceId)   → void
 */

import { HttpClient } from 'hap-controller';
import { insertEvent, pool } from './db.js';
import { processAlertsForEvent } from './alerts.js';

// Maps short HAP service UUID → human-readable label stored in the DB.
// This must match the keys expected by getServiceIcon() in web/src/lib/icons.js.
const SERVICE_TYPE_LABELS = new Map([
  ['43',  'Lightbulb'],
  ['49',  'Switch'],
  ['47',  'Outlet'],
  ['40',  'Fan'],
  ['B7',  'Fan'],              // FanV2
  ['41',  'GarageDoorOpener'],
  ['45',  'LockMechanism'],
  ['4A',  'Thermostat'],
  ['7E',  'SecuritySystem'],
  ['85',  'MotionSensor'],
  ['80',  'ContactSensor'],
  ['86',  'OccupancySensor'],
  ['8A',  'TemperatureSensor'],
  ['82',  'HumiditySensor'],
  ['84',  'LightSensor'],
  ['8D',  'AirQualitySensor'],
  ['83',  'LeakSensor'],
  ['87',  'SmokeSensor'],
  ['7F',  'CarbonMonoxideSensor'],
  ['97',  'CarbonDioxideSensor'],
  ['81',  'Door'],
  ['8B',  'Window'],
  ['8C',  'WindowCovering'],
  ['BB',  'AirPurifier'],
  ['BC',  'HeaterCooler'],
  ['BD',  'HumidifierDehumidifier'],
  ['CF',  'IrrigationSystem'],
  ['D0',  'Valve'],
  ['96',  'Battery'],
  ['110', 'Camera'],
  ['121', 'Doorbell'],
  ['D8',  'Television'],
]);

// Characteristics worth logging. Keys are the HAP characteristic type UUIDs
// (short form). Values are human-readable names stored in the DB.
const WATCHED_CHARACTERISTICS = new Map([
  // Lightbulb / switch
  ['25',   'On'],
  // Door / garage
  ['E',    'CurrentDoorState'],
  ['F',    'TargetDoorState'],
  // Lock
  ['1D',   'LockCurrentState'],
  ['1E',   'LockTargetState'],
  // Sensors
  ['22',   'MotionDetected'],
  ['6D',   'ContactSensorState'],
  ['71',   'OccupancyDetected'],
  ['30',   'CurrentTemperature'],
  ['10',   'CurrentRelativeHumidity'],
  // Security system
  ['66',   'SecuritySystemCurrentState'],
  ['67',   'SecuritySystemTargetState'],
  // Brightness / colour (smart bulbs)
  ['8',    'Brightness'],
  ['C0',   'ColorTemperature'],
  ['13',   'Hue'],
  ['2F',   'Saturation'],
  // Appliances / fans / purifiers (Homebridge plugins)
  ['B0',   'Active'],
  ['AB',   'FilterLifeLevel'],
  ['95',   'AirQuality'],
  ['75',   'VOCDensity'],
  ['76',   'PM2_5Density'],
  ['64',   'CurrentAmbientLightLevel'],
  // Battery
  ['68',   'StatusLowBattery'],
  ['5B',   'BatteryLevel'],
]);

// Milliseconds before attempting reconnect after a lost connection
let reconnectBaseMs = Number.parseInt(process.env.RECONNECT_BASE_MS ?? '5000', 10);
let reconnectMaxMs  = Number.parseInt(process.env.RECONNECT_MAX_MS ?? '60000', 10);
if (!Number.isFinite(reconnectBaseMs) || reconnectBaseMs < 1) reconnectBaseMs = 5_000;
if (!Number.isFinite(reconnectMaxMs) || reconnectMaxMs < reconnectBaseMs) reconnectMaxMs = 60_000;
const RUN_CYCLE_NAME_REGEX = /(run leveling|run clean cycle)/i;
const RUN_CYCLE_OFF_DELAY_MS = Number.parseInt(
  process.env.RUN_CYCLE_OFF_DELAY_MS ?? `${15 * 60_000}`,
  10
);

// In-memory cache of last-seen values: "deviceId:aid.iid" → value string.
// Used to populate old_value on each event so the UI can show before→after.
// Survives reconnects within the same process; cleared on restart.
const valueCache = new Map();
const delayedOffTimers = new Map();
const subscriberSessions = new Map();
let connectAccessoryImpl = connectAccessory;

async function processAlertsSafe(eventPayload, insertedRow) {
  try {
    await processAlertsForEvent(pool, {
      ...eventPayload,
      eventId: insertedRow?.id,
      timestamp: insertedRow?.timestamp ?? new Date().toISOString(),
    });
  } catch (err) {
    console.error('[alerts] Processing failed:', err.message ?? err.stack ?? err);
  }
}

/**
 * Start subscribers for all entries in the pairings map.
 *
 * @param {Record<string, object>} pairings  - content of pairings.json
 * @param {Record<string, string>} rooms     - content of rooms.json (accessoryId → roomName)
 * @param {(id: string) => object|null} getPairing
 *   Optional callback that returns the *current* pairing for a device ID.
 *   Used so reconnects pick up a refreshed address/port if pairings.json
 *   was updated (e.g. by a discovery scan) while we were backing off.
 */
export function startSubscribers(pairings, rooms = {}, getPairing = null) {
  for (const [deviceId, pairing] of Object.entries(pairings)) {
    startSubscriber(deviceId, pairing, rooms, getPairing);
  }
}

export function startSubscriber(deviceId, pairing, rooms = {}, getPairing = null) {
  stopSubscriber(deviceId);
  const session = {
    deviceId,
    rooms,
    getPairing,
    retryDelayMs: reconnectBaseMs,
    stopped: false,
    reconnectTimeout: null,
    client: null,
    eventHandler: null,
    disconnectHandler: null,
  };
  subscriberSessions.set(deviceId, session);
  connectAccessoryImpl(session, pairing);
}

export function stopSubscriber(deviceId) {
  const session = subscriberSessions.get(deviceId);
  if (!session) return;

  session.stopped = true;
  if (session.reconnectTimeout) {
    clearTimeout(session.reconnectTimeout);
    session.reconnectTimeout = null;
  }

  if (session.client) {
    if (session.eventHandler) session.client.off('event', session.eventHandler);
    if (session.disconnectHandler) session.client.off('event-disconnect', session.disconnectHandler);
    session.client = null;
  }

  for (const [timerKey, timeoutId] of delayedOffTimers.entries()) {
    if (timerKey.startsWith(`${deviceId}:`)) {
      clearTimeout(timeoutId);
      delayedOffTimers.delete(timerKey);
    }
  }

  for (const key of valueCache.keys()) {
    if (key.startsWith(`${deviceId}:`)) valueCache.delete(key);
  }

  subscriberSessions.delete(deviceId);
}

function connectAccessory(session, pairing) {
  if (session.stopped) return;
  const { deviceId, rooms, getPairing } = session;
  const { name: accessoryName, address, port, longTermData } = pairing;

  console.log(`[subscriber] Connecting to ${accessoryName} (${address}:${port})`);

  const client = new HttpClient(deviceId, address, port, longTermData);
  session.client = client;

  client.getAccessories().then(async (accessories) => {
    // Build a map of "aid.iid" → { serviceType, characteristicName, childName, componentName }
    // Using the composite key avoids iid collisions when a bridge has multiple
    // child accessories that each start their iid numbering from 1.
    const iidMeta = buildIidMetaMap(accessories);

    // subscribeCharacteristics() expects an array of "aid.iid" strings
    const watchedKeys = [...iidMeta.keys()];

    if (watchedKeys.length === 0) {
      console.log(`[subscriber] ${accessoryName}: no watched characteristics found`);
      return;
    }

    // HAP events are emitted on the client instance itself (HttpClient extends
    // EventEmitter). subscribeCharacteristics() returns Promise<void|null> —
    // NOT an EventEmitter — so .on() must be called on `client`, not on the
    // return value.
    const handleEvent = async (event) => {
      if (session.stopped) return;
      const changes = event?.characteristics ?? (Array.isArray(event) ? event : [event]);
      for (const change of changes) {
        const key  = `${change.aid}.${change.iid}`;
        const meta = iidMeta.get(key);
        if (!meta) {
          console.log(`[event-skip] ${accessoryName} aid=${change.aid} iid=${change.iid} value=${change.value} (not in watched list)`);
          continue;
        }

        // Use a component-specific label when an accessory exposes multiple
        // watched services (e.g. switch + sensor under the same parent name).
        const effectiveName = meta.componentName || meta.childName || accessoryName;
        // For bridges, suffix the deviceId with the aid so each child is distinct
        const effectiveId = change.aid > 1 ? `${deviceId}:${change.aid}` : deviceId;

        // Look up (and then update) the cached previous value for this characteristic
        const cacheKey = `${effectiveId}:${change.aid}.${change.iid}`;
        const oldValue = valueCache.get(cacheKey) ?? null;
        const newValue = String(change.value);
        valueCache.set(cacheKey, newValue);

        // Skip inserting if the value hasn't actually changed
        // (some accessories re-broadcast the same value on reconnect)
        if (oldValue !== null && oldValue === newValue) {
          console.log(`[event-skip] ${effectiveName} → ${meta.characteristicName}: unchanged (${newValue})`);
          continue;
        }

        const eventPayload = {
          accessoryId:    effectiveId,
          accessoryName:  effectiveName,
          // rooms.json stores child overrides keyed by effectiveId.
          // If the child has no override, fall back to the top-level bridge entry
          // so setting a room on the bridge automatically covers all its children.
          roomName:       rooms[effectiveId] ?? (change.aid > 1 ? rooms[deviceId] : null) ?? null,
          serviceType:    meta.serviceType,
          characteristic: meta.characteristicName,
          oldValue,
          newValue,
          rawIid:         change.iid,
        };

        // Run-cycle switches often auto-reset immediately. Delay OFF logging so
        // users see completion later rather than an instant auto-off.
        const timerKey = `${effectiveId}:${change.aid}.${change.iid}`;
        const isRunCycleSwitch =
          meta.characteristicName === 'On' &&
          RUN_CYCLE_NAME_REGEX.test(effectiveName) &&
          Number.isFinite(RUN_CYCLE_OFF_DELAY_MS) &&
          RUN_CYCLE_OFF_DELAY_MS > 0;

        if (isRunCycleSwitch && newValue === 'true') {
          const pending = delayedOffTimers.get(timerKey);
          if (pending) {
            clearTimeout(pending);
            delayedOffTimers.delete(timerKey);
          }
        }

        if (isRunCycleSwitch && newValue === 'false' && oldValue === 'true') {
          const pending = delayedOffTimers.get(timerKey);
          if (pending) clearTimeout(pending);

          const timeoutId = setTimeout(async () => {
            delayedOffTimers.delete(timerKey);
            try {
              const inserted = await insertEvent(eventPayload);
              await processAlertsSafe(eventPayload, inserted);
              console.log(
                `[event-delayed] ${effectiveName} → ${meta.characteristicName}: ${change.value} ` +
                `(delayed ${Math.round(RUN_CYCLE_OFF_DELAY_MS / 1000)}s)`
              );
            } catch (err) {
              console.error(`[subscriber] Delayed DB insert failed:`, err.message ?? err.stack ?? err);
            }
          }, RUN_CYCLE_OFF_DELAY_MS);

          delayedOffTimers.set(timerKey, timeoutId);
          console.log(
            `[event-delay] ${effectiveName} → ${meta.characteristicName}: ${change.value} ` +
            `queued for ${Math.round(RUN_CYCLE_OFF_DELAY_MS / 1000)}s`
          );
          continue;
        }

        try {
          const inserted = await insertEvent(eventPayload);
          await processAlertsSafe(eventPayload, inserted);
          console.log(`[event] ${effectiveName} → ${meta.characteristicName}: ${change.value}`);
        } catch (err) {
          console.error(`[subscriber] DB insert failed:`, err.message ?? err.stack ?? err);
        }
      }
    };

    session.eventHandler = handleEvent;
    client.on('event', handleEvent);

    // 'event-disconnect' fires when the HAP subscription connection drops.
    // The argument is the previously-subscribed list — pass it straight back
    // to resubscribe without needing to rebuild the key list.
    const disconnectHandler = async (formerSubscribes) => {
      if (session.stopped) return;
      console.warn(`[subscriber] ${accessoryName}: disconnected, resubscribing…`);
      try {
        await client.subscribeCharacteristics(formerSubscribes);
        console.log(`[subscriber] ${accessoryName}: resubscribed to ${formerSubscribes.length} characteristic(s)`);
      } catch (err) {
        console.error(`[subscriber] ${accessoryName}: resubscribe failed:`, err.message ?? err.stack ?? err);
        scheduleReconnect(session, pairing);
      }
    };
    session.disconnectHandler = disconnectHandler;
    client.on('event-disconnect', disconnectHandler);

    try {
      await client.subscribeCharacteristics(watchedKeys);
      session.retryDelayMs = reconnectBaseMs;
      console.log(`[subscriber] ${accessoryName}: subscribed to ${watchedKeys.length} characteristic(s)`);
    } catch (err) {
      console.error(`[subscriber] ${accessoryName}: subscribe failed:`, err.message ?? err.stack ?? err);
      scheduleReconnect(session, pairing);
    }

  }).catch((err) => {
    console.error(`[subscriber] ${accessoryName}: getAccessories failed:`, err.message ?? err.stack ?? err);
    scheduleReconnect(session, pairing);
  });
}

function scheduleReconnect(session, pairing) {
  if (session.stopped) return;
  const { deviceId, getPairing } = session;
  const nextDelay = Math.min(session.retryDelayMs * 2, reconnectMaxMs);
  session.retryDelayMs = nextDelay;
  console.log(`[subscriber] ${pairing.name}: retrying in ${nextDelay / 1000}s`);
  session.reconnectTimeout = setTimeout(() => {
    if (session.stopped) return;
    session.reconnectTimeout = null;
    // Re-read the pairing so reconnects pick up any address/port changes
    // that occurred (e.g. from a discovery scan) while we were backing off.
    const latestPairing = (getPairing && getPairing(deviceId)) ?? pairing;
    if (latestPairing.address !== pairing.address || latestPairing.port !== pairing.port) {
      console.log(
        `[subscriber] ${pairing.name}: using refreshed address ` +
        `${latestPairing.address}:${latestPairing.port}`
      );
    }
    connectAccessoryImpl(session, latestPairing);
  }, nextDelay);
}

/**
 * Walk the HAP accessories object and return a Map of:
 *   "aid.iid" → { serviceType, characteristicName, childName, componentName }
 *
 * Using the composite "aid.iid" key avoids collisions when a bridge exposes
 * multiple child accessories that each start their iid namespace from 1.
 * childName is the child accessory's Name characteristic value (null for
 * standalone non-bridge accessories where the pairing name is used instead).
 */
function buildIidMetaMap(accessories) {
  const map = new Map();

  for (const acc of accessories?.accessories ?? []) {
    // Try to extract the child accessory's name from its AccessoryInformation service
    // UUID 3E = AccessoryInformation, UUID 23 = Name characteristic
    const infoService = acc.services?.find((s) => shortUuid(s.type) === '3E');
    const nameProp    = infoService?.characteristics?.find((c) => shortUuid(c.type) === '23');
    const childName   = nameProp?.value ?? null;
    const watchedServiceTypes = new Set();

    // Identify whether this accessory has multiple watched service types.
    for (const service of acc.services ?? []) {
      const shortType = shortUuid(service.type);
      const serviceType = SERVICE_TYPE_LABELS.get(shortType) ?? shortType;
      const hasWatchedChar = (service.characteristics ?? []).some((c) =>
        WATCHED_CHARACTERISTICS.has(shortUuid(c.type))
      );
      if (hasWatchedChar) watchedServiceTypes.add(serviceType);
    }
    const shouldDisambiguateByService = watchedServiceTypes.size > 1;

    for (const service of acc.services ?? []) {
      const shortType  = shortUuid(service.type);
      const serviceType = SERVICE_TYPE_LABELS.get(shortType) ?? shortType;

      for (const char of service.characteristics ?? []) {
        const charType = shortUuid(char.type);
        const charName = WATCHED_CHARACTERISTICS.get(charType) ?? null;

        if (charName) {
          // "aid.iid" is globally unique across all accessories in a bridge
          const componentName = (shouldDisambiguateByService && childName)
            ? `${childName} · ${serviceType}`
            : childName;
          map.set(`${acc.aid}.${char.iid}`, {
            serviceType,
            characteristicName: charName,
            childName,  // null for single non-bridge accessories
            componentName, // label per service when needed
          });
        }
      }
    }
  }

  return map;
}

/** Convert full UUID like 00000025-0000-1000-8000-0026BB765291 → "25" */
function shortUuid(uuid = '') {
  const match = uuid.match(/^0*([0-9A-Fa-f]+)-/);
  return match ? match[1].toUpperCase() : uuid.toUpperCase();
}

export const __testHooks = {
  buildIidMetaMap,
  scheduleReconnect,
  getSession(deviceId) {
    return subscriberSessions.get(deviceId) ?? null;
  },
  setReconnectWindow(baseMs, maxMs) {
    reconnectBaseMs = baseMs;
    reconnectMaxMs = maxMs;
  },
  setConnectAccessoryImpl(fn) {
    connectAccessoryImpl = fn;
  },
  resetState() {
    for (const [deviceId] of subscriberSessions) {
      stopSubscriber(deviceId);
    }
    connectAccessoryImpl = connectAccessory;
    reconnectBaseMs = 5_000;
    reconnectMaxMs = 60_000;
  },
};
