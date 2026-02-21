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

    // Subscribe to value-change events
    client.subscribeCharacteristics(watchedKeys).then((sub) => {
      console.log(`[subscriber] ${accessoryName}: subscribed to ${watchedKeys.length} characteristic(s)`);

      sub.on('event', async (event) => {
        for (const change of event.characteristics ?? []) {
          // Events include both aid and iid — use composite key for lookup
          const key  = `${change.aid}.${change.iid}`;
          const meta = iidMeta.get(key);
          if (!meta) continue;

          // For bridges, use the child accessory's name; fall back to bridge name
          const effectiveName = meta.childName || accessoryName;
          // For bridges, suffix the deviceId with the aid so each child is distinct
          const effectiveId = change.aid > 1 ? `${deviceId}:${change.aid}` : deviceId;

          try {
            await insertEvent({
              accessoryId:    effectiveId,
              accessoryName:  effectiveName,
              roomName:       null,  // HAP protocol doesn't expose room names; populated later if needed
              serviceType:    meta.serviceType,
              characteristic: meta.characteristicName,
              oldValue:       null,  // hap-controller events only provide new value
              newValue:       String(change.value),
              rawIid:         change.iid,
            });
            console.log(`[event] ${effectiveName} → ${meta.characteristicName}: ${change.value}`);
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
      const serviceType = shortUuid(service.type);

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
