/**
 * db.js — PostgreSQL client and event insertion helper.
 */

import pg from 'pg';

const { Pool } = pg;

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

pool.on('error', (err) => {
  console.error('[db] Unexpected pool error:', err.message);
});

/**
 * Insert a single HomeKit event into event_logs.
 *
 * @param {object} event
 * @param {string} event.accessoryId      - HAP accessory identifier
 * @param {string} event.accessoryName
 * @param {string|null} event.roomName
 * @param {string|null} event.serviceType - e.g. "Lightbulb"
 * @param {string} event.characteristic   - e.g. "On"
 * @param {string|null} event.oldValue
 * @param {string} event.newValue
 * @param {number|null} event.rawIid      - HAP instance ID
 */
export async function insertEvent(event) {
  const {
    accessoryId,
    accessoryName,
    roomName = null,
    serviceType = null,
    characteristic,
    oldValue = null,
    newValue,
    rawIid = null,
  } = event;

  await pool.query(
    `INSERT INTO event_logs
       (accessory_id, accessory_name, room_name, service_type,
        characteristic, old_value, new_value, raw_iid)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
    [accessoryId, accessoryName, roomName, serviceType,
     characteristic, oldValue, String(newValue), rawIid]
  );
}

export { pool };
