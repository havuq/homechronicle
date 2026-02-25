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
 */
export async function migrateDb() {
  await pool.query(`
    CREATE EXTENSION IF NOT EXISTS pg_trgm;

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

    CREATE TABLE IF NOT EXISTS event_logs_archive (
      archived_id     BIGSERIAL PRIMARY KEY,
      source_id       BIGINT      NOT NULL,
      timestamp       TIMESTAMPTZ NOT NULL,
      accessory_id    TEXT        NOT NULL,
      accessory_name  TEXT        NOT NULL,
      room_name       TEXT,
      service_type    TEXT,
      characteristic  TEXT        NOT NULL,
      old_value       TEXT,
      new_value       TEXT        NOT NULL,
      raw_iid         INT,
      archived_at     TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );

    CREATE UNIQUE INDEX IF NOT EXISTS idx_event_logs_archive_source_id
      ON event_logs_archive (source_id);

    CREATE INDEX IF NOT EXISTS idx_event_logs_timestamp_id
      ON event_logs (timestamp DESC, id DESC);

    CREATE INDEX IF NOT EXISTS idx_event_logs_accessory
      ON event_logs (accessory_name);

    CREATE INDEX IF NOT EXISTS idx_event_logs_accessory_ts
      ON event_logs (accessory_name, timestamp DESC, id DESC);

    CREATE INDEX IF NOT EXISTS idx_event_logs_accessory_trgm
      ON event_logs USING GIN (accessory_name gin_trgm_ops);

    CREATE INDEX IF NOT EXISTS idx_event_logs_room
      ON event_logs (room_name);

    CREATE INDEX IF NOT EXISTS idx_event_logs_room_ts
      ON event_logs (room_name, timestamp DESC, id DESC);

    CREATE INDEX IF NOT EXISTS idx_event_logs_char
      ON event_logs (characteristic);

    CREATE INDEX IF NOT EXISTS idx_event_logs_char_ts
      ON event_logs (characteristic, timestamp DESC, id DESC);

    CREATE INDEX IF NOT EXISTS idx_event_logs_timestamp_trunc
      ON event_logs (date_trunc('hour', timestamp AT TIME ZONE 'UTC'));
  `);
  console.log('[db] Schema ready.');
}

export async function runRetentionSweep({
  retentionDays,
  archiveBeforeDelete = true,
}) {
  if (!Number.isFinite(retentionDays) || retentionDays <= 0) {
    return { archived: 0, deleted: 0, cutoffDays: retentionDays };
  }

  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    if (archiveBeforeDelete) {
      const moveResult = await client.query(
        `WITH moved AS (
           INSERT INTO event_logs_archive
             (source_id, timestamp, accessory_id, accessory_name, room_name,
              service_type, characteristic, old_value, new_value, raw_iid)
           SELECT id, timestamp, accessory_id, accessory_name, room_name,
                  service_type, characteristic, old_value, new_value, raw_iid
           FROM event_logs
           WHERE timestamp < NOW() - ($1::int * INTERVAL '1 day')
           ON CONFLICT (source_id) DO NOTHING
           RETURNING source_id
         )
         DELETE FROM event_logs logs
         USING moved
         WHERE logs.id = moved.source_id`,
        [retentionDays]
      );
      await client.query('COMMIT');
      return { archived: moveResult.rowCount, deleted: moveResult.rowCount, cutoffDays: retentionDays };
    }

    const deleteResult = await client.query(
      `DELETE FROM event_logs
       WHERE timestamp < NOW() - ($1::int * INTERVAL '1 day')`,
      [retentionDays]
    );

    await client.query('COMMIT');
    return { archived: 0, deleted: deleteResult.rowCount, cutoffDays: retentionDays };
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }
}

export { pool };
