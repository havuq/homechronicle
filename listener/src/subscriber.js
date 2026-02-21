/**
 * subscriber.js — connects to paired HomeKit accessories and subscribes
 * to characteristic value-change events.
 *
 * Exports: startSubscribers(pairings) → void
 */

import { HttpClient } from 'hap-controller';
import { insertEvent } from './db.js';

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
  // Brightness (nice to have)
  ['8',    'Brightness'],
]);

// Milliseconds before attempting reconnect after a lost connection
const RECONNECT_BASE_MS = 5_000;
const RECONNECT_MAX_MS  = 60_000;

/**
 * Start subscribers for all entries in the pairings map.
 *
 * @param {Record<string, object>} pairings - content of pairings.json
 */
export function startSubscribers(pairings) {
  for (const [deviceId, pairing] of Object.entries(pairings)) {
    connectAccessory(deviceId, pairing, RECONNECT_BASE_MS);
  }
}

function connectAccessory(deviceId, pairing, retryDelayMs) {
  const { name: accessoryName, address, port, longTermData } = pairing;

  console.log(`[subscriber] Connecting to ${accessoryName} (${address}:${port})`);

  const client = new HttpClient(deviceId, address, port, longTermData);

  client.getAccessories().then((accessories) => {
    // Build a map of iid → { serviceType, characteristicName } for quick lookup
    const iidMeta = buildIidMetaMap(accessories);

    // Collect iids we care about
    const watchedIids = [...iidMeta.keys()].filter((iid) => iidMeta.get(iid) !== null);

    if (watchedIids.length === 0) {
      console.log(`[subscriber] ${accessoryName}: no watched characteristics found`);
      return;
    }

    // Subscribe to value-change events
    client.subscribeCharacteristics(watchedIids).then((sub) => {
      console.log(`[subscriber] ${accessoryName}: subscribed to ${watchedIids.length} characteristic(s)`);

      sub.on('event', async (event) => {
        for (const change of event.characteristics ?? []) {
          const meta = iidMeta.get(change.iid);
          if (!meta) continue;

          try {
            await insertEvent({
              accessoryId:    deviceId,
              accessoryName,
              roomName:       null,  // HAP protocol doesn't expose room names; populated later if needed
              serviceType:    meta.serviceType,
              characteristic: meta.characteristicName,
              oldValue:       null,  // hap-controller events only provide new value
              newValue:       String(change.value),
              rawIid:         change.iid,
            });
            console.log(`[event] ${accessoryName} → ${meta.characteristicName}: ${change.value}`);
          } catch (err) {
            console.error(`[subscriber] DB insert failed:`, err.message);
          }
        }
      });

      sub.on('close', () => {
        console.warn(`[subscriber] ${accessoryName}: connection closed, reconnecting in ${retryDelayMs / 1000}s`);
        setTimeout(() => {
          const nextDelay = Math.min(retryDelayMs * 2, RECONNECT_MAX_MS);
          connectAccessory(deviceId, pairing, nextDelay);
        }, retryDelayMs);
      });

    }).catch((err) => {
      console.error(`[subscriber] ${accessoryName}: subscribe failed:`, err.message);
      scheduleReconnect(deviceId, pairing, retryDelayMs);
    });

  }).catch((err) => {
    console.error(`[subscriber] ${accessoryName}: getAccessories failed:`, err.message);
    scheduleReconnect(deviceId, pairing, retryDelayMs);
  });
}

function scheduleReconnect(deviceId, pairing, retryDelayMs) {
  const nextDelay = Math.min(retryDelayMs * 2, RECONNECT_MAX_MS);
  console.log(`[subscriber] ${pairing.name}: retrying in ${nextDelay / 1000}s`);
  setTimeout(() => connectAccessory(deviceId, pairing, nextDelay), retryDelayMs);
}

/**
 * Walk the HAP accessories object and return a Map of:
 *   iid (number) → { serviceType, characteristicName } | null
 *
 * null means the iid exists but is not in WATCHED_CHARACTERISTICS.
 */
function buildIidMetaMap(accessories) {
  const map = new Map();

  for (const acc of accessories?.accessories ?? []) {
    for (const service of acc.services ?? []) {
      const serviceType = shortUuid(service.type);

      for (const char of service.characteristics ?? []) {
        const charType = shortUuid(char.type);
        const charName = WATCHED_CHARACTERISTICS.get(charType) ?? null;

        if (charName) {
          map.set(char.iid, { serviceType, characteristicName: charName });
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
