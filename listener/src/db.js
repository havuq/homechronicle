/**
 * db.js — PostgreSQL client and event insertion helper.
 */

import pg from 'pg';

const { Pool } = pg;

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

pool.on('error', (err) => {
  console.error('[db] Unexpected pool error:', err.message ?? err.stack ?? err);
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

/**
 * Ensure the database schema exists.
 * Safe to call on every startup — uses IF NOT EXISTS throughout.
 * This removes the dependency on postgres init.sql running at container start.
 */
export async function migrateDb() {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS event_logs (
      id              BIGSERIAL PRIMARY KEY,
      timestamp       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      accessory_id    TEXT        NOT NULL,
      accessory_name  TEXT        NOT NULL,
      room_name       TEXT,
      service_type    TEXT,
      characteristic  TEXT        NOT NULL,
      old_value       TEXT,
      new_value       TEXT        NOT NULL,
      raw_iid         INT
    );

    CREATE INDEX IF NOT EXISTS idx_event_logs_timestamp
      ON event_logs (timestamp DESC);

    CREATE INDEX IF NOT EXISTS idx_event_logs_accessory
      ON event_logs (accessory_name);

    CREATE INDEX IF NOT EXISTS idx_event_logs_room
      ON event_logs (room_name);

    CREATE INDEX IF NOT EXISTS idx_event_logs_char
      ON event_logs (characteristic);

    CREATE INDEX IF NOT EXISTS idx_event_logs_timestamp_trunc
      ON event_logs (date_trunc('hour', timestamp));
  `);
  console.log('[db] Schema ready.');
}

export { pool };
