/**
 * subscriber.js — connects to paired HomeKit accessories and subscribes
 * to characteristic value-change events.
 *
 * Exports: startSubscribers(pairings) → void
 */

import { HttpClient } from 'hap-controller';
import { insertEvent } from './db.js';

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
const RECONNECT_BASE_MS = 5_000;
const RECONNECT_MAX_MS  = 60_000;

// In-memory cache of last-seen values: "deviceId:aid.iid" → value string.
// Used to populate old_value on each event so the UI can show before→after.
// Survives reconnects within the same process; cleared on restart.
const valueCache = new Map();

/**
 * Start subscribers for all entries in the pairings map.
 *
 * @param {Record<string, object>} pairings - content of pairings.json
 * @param {Record<string, string>} rooms    - content of rooms.json (accessoryId → roomName)
 */
export function startSubscribers(pairings, rooms = {}) {
  for (const [deviceId, pairing] of Object.entries(pairings)) {
    connectAccessory(deviceId, pairing, rooms, RECONNECT_BASE_MS);
  }
}

function connectAccessory(deviceId, pairing, rooms, retryDelayMs) {
  const { name: accessoryName, address, port, longTermData } = pairing;

  console.log(`[subscriber] Connecting to ${accessoryName} (${address}:${port})`);

  const client = new HttpClient(deviceId, address, port, longTermData);

  client.getAccessories().then(async (accessories) => {
    // Build a map of "aid.iid" → { serviceType, characteristicName, childName }
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
      const changes = event?.characteristics ?? (Array.isArray(event) ? event : [event]);
      for (const change of changes) {
        const key  = `${change.aid}.${change.iid}`;
        const meta = iidMeta.get(key);
        if (!meta) {
          console.log(`[event-skip] ${accessoryName} aid=${change.aid} iid=${change.iid} value=${change.value} (not in watched list)`);
          continue;
        }

        // For bridges, use the child accessory's name; fall back to bridge name
        const effectiveName = meta.childName || accessoryName;
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

        try {
          await insertEvent({
            accessoryId:    effectiveId,
            accessoryName:  effectiveName,
            roomName:       rooms[effectiveId] ?? null,  // from rooms.json; HAP doesn't expose rooms
            serviceType:    meta.serviceType,
            characteristic: meta.characteristicName,
            oldValue,
            newValue,
            rawIid:         change.iid,
          });
          console.log(`[event] ${effectiveName} → ${meta.characteristicName}: ${change.value}`);
        } catch (err) {
          console.error(`[subscriber] DB insert failed:`, err.message ?? err.stack ?? err);
        }
      }
    };

    client.on('event', handleEvent);

    // 'event-disconnect' fires when the HAP subscription connection drops.
    // The argument is the previously-subscribed list — pass it straight back
    // to resubscribe without needing to rebuild the key list.
    client.on('event-disconnect', async (formerSubscribes) => {
      console.warn(`[subscriber] ${accessoryName}: disconnected, resubscribing…`);
      try {
        await client.subscribeCharacteristics(formerSubscribes);
        console.log(`[subscriber] ${accessoryName}: resubscribed to ${formerSubscribes.length} characteristic(s)`);
      } catch (err) {
        console.error(`[subscriber] ${accessoryName}: resubscribe failed:`, err.message ?? err.stack ?? err);
        scheduleReconnect(deviceId, pairing, rooms, retryDelayMs);
      }
    });

    try {
      await client.subscribeCharacteristics(watchedKeys);
      console.log(`[subscriber] ${accessoryName}: subscribed to ${watchedKeys.length} characteristic(s)`);
    } catch (err) {
      console.error(`[subscriber] ${accessoryName}: subscribe failed:`, err.message ?? err.stack ?? err);
      scheduleReconnect(deviceId, pairing, rooms, retryDelayMs);
    }

  }).catch((err) => {
    console.error(`[subscriber] ${accessoryName}: getAccessories failed:`, err.message ?? err.stack ?? err);
    scheduleReconnect(deviceId, pairing, rooms, retryDelayMs);
  });
}

function scheduleReconnect(deviceId, pairing, rooms, retryDelayMs) {
  const nextDelay = Math.min(retryDelayMs * 2, RECONNECT_MAX_MS);
  console.log(`[subscriber] ${pairing.name}: retrying in ${nextDelay / 1000}s`);
  setTimeout(() => connectAccessory(deviceId, pairing, rooms, nextDelay), retryDelayMs);
}

/**
 * Walk the HAP accessories object and return a Map of:
 *   "aid.iid" → { serviceType, characteristicName, childName }
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

    for (const service of acc.services ?? []) {
      const shortType  = shortUuid(service.type);
      const serviceType = SERVICE_TYPE_LABELS.get(shortType) ?? shortType;

      for (const char of service.characteristics ?? []) {
        const charType = shortUuid(char.type);
        const charName = WATCHED_CHARACTERISTICS.get(charType) ?? null;

        if (charName) {
          // "aid.iid" is globally unique across all accessories in a bridge
          map.set(`${acc.aid}.${char.iid}`, {
            serviceType,
            characteristicName: charName,
            childName,  // null for single non-bridge accessories
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
