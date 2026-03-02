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
import {
  cacheAccessoryMetadata,
  clearAccessoryMetadata,
} from './accessory-metadata.js';

const ALERTS_ENABLED = !/^(0|false|no|off)$/i.test(process.env.ALERTS_ENABLED ?? 'false');

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
const subscriberStats = new Map();
let connectAccessoryImpl = connectAccessory;

async function processAlertsSafe(eventPayload, insertedRow) {
  if (!ALERTS_ENABLED) return;
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
  const stats = {
    connectAttempts: 0,
    reconnectSchedules: 0,
    disconnects: 0,
    resubscribeSuccesses: 0,
    resubscribeFailures: 0,
    subscribeFailures: 0,
    accessoriesQueryFailures: 0,
    lastConnectedAt: null,
    lastSubscribedAt: null,
    lastError: null,
    lastErrorAt: null,
  };
  const session = {
    deviceId,
    rooms,
    getPairing,
    pairingName: pairing.name,
    retryDelayMs: reconnectBaseMs,
    stopped: false,
    reconnectTimeout: null,
    client: null,
    eventHandler: null,
    disconnectHandler: null,
    stats,
  };
  subscriberSessions.set(deviceId, session);
  subscriberStats.set(deviceId, stats);
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
  clearAccessoryMetadata(deviceId);
  subscriberStats.delete(deviceId);

  subscriberSessions.delete(deviceId);
}

function connectAccessory(session, pairing) {
  if (session.stopped) return;
  const { deviceId, rooms, getPairing, stats } = session;
  const { name: accessoryName, address, port, longTermData } = pairing;
  session.pairingName = accessoryName;
  stats.connectAttempts += 1;

  console.log(`[subscriber] Connecting to ${accessoryName} (${address}:${port})`);

  const client = new HttpClient(deviceId, address, port, longTermData);
  session.client = client;

  client.getAccessories().then(async (accessories) => {
    const { iidMetaMap: iidMeta } = cacheAccessoryMetadata({
      deviceId,
      pairingName: accessoryName,
      accessories,
    });
    stats.lastConnectedAt = new Date().toISOString();

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
          protocol:       'homekit',
          transport:      'ip',
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
      stats.disconnects += 1;
      console.warn(`[subscriber] ${accessoryName}: disconnected, resubscribing…`);
      try {
        await client.subscribeCharacteristics(formerSubscribes);
        stats.resubscribeSuccesses += 1;
        stats.lastSubscribedAt = new Date().toISOString();
        console.log(`[subscriber] ${accessoryName}: resubscribed to ${formerSubscribes.length} characteristic(s)`);
      } catch (err) {
        stats.resubscribeFailures += 1;
        stats.lastError = err.message ?? String(err);
        stats.lastErrorAt = new Date().toISOString();
        console.error(`[subscriber] ${accessoryName}: resubscribe failed:`, err.message ?? err.stack ?? err);
        scheduleReconnect(session, pairing);
      }
    };
    session.disconnectHandler = disconnectHandler;
    client.on('event-disconnect', disconnectHandler);

    try {
      await client.subscribeCharacteristics(watchedKeys);
      session.retryDelayMs = reconnectBaseMs;
      stats.lastSubscribedAt = new Date().toISOString();
      console.log(`[subscriber] ${accessoryName}: subscribed to ${watchedKeys.length} characteristic(s)`);
    } catch (err) {
      stats.subscribeFailures += 1;
      stats.lastError = err.message ?? String(err);
      stats.lastErrorAt = new Date().toISOString();
      console.error(`[subscriber] ${accessoryName}: subscribe failed:`, err.message ?? err.stack ?? err);
      scheduleReconnect(session, pairing);
    }

  }).catch((err) => {
    stats.accessoriesQueryFailures += 1;
    stats.lastError = err.message ?? String(err);
    stats.lastErrorAt = new Date().toISOString();
    console.error(`[subscriber] ${accessoryName}: getAccessories failed:`, err.message ?? err.stack ?? err);
    scheduleReconnect(session, pairing);
  });
}

function scheduleReconnect(session, pairing) {
  if (session.stopped) return;
  const { deviceId, getPairing } = session;
  if (session.stats) session.stats.reconnectSchedules += 1;
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

export function getSubscriberStats(deviceId) {
  const stats = subscriberStats.get(deviceId);
  if (!stats) return null;
  return {
    ...stats,
    reconnectAttempts: Math.max(0, stats.connectAttempts - 1),
  };
}

export const __testHooks = {
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
