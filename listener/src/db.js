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

  const result = await pool.query(
    `INSERT INTO event_logs
       (accessory_id, accessory_name, room_name, service_type,
        characteristic, old_value, new_value, raw_iid)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
     RETURNING id, timestamp`,
    [accessoryId, accessoryName, roomName, serviceType,
      characteristic, oldValue, String(newValue), rawIid]
  );
  return result.rows[0];
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

    CREATE TABLE IF NOT EXISTS alert_rules (
      id              BIGSERIAL PRIMARY KEY,
      name            TEXT        NOT NULL,
      enabled         BOOLEAN     NOT NULL DEFAULT TRUE,
      scope_type      TEXT        NOT NULL DEFAULT 'all',
      scope_value     TEXT,
      characteristic  TEXT,
      operator        TEXT        NOT NULL DEFAULT 'equals',
      match_value     TEXT        NOT NULL,
      target_url      TEXT        NOT NULL,
      quiet_minutes   INT         NOT NULL DEFAULT 0,
      created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      CONSTRAINT chk_alert_scope_type
        CHECK (scope_type IN ('all', 'room', 'accessory', 'characteristic')),
      CONSTRAINT chk_alert_operator
        CHECK (operator IN ('equals', 'not_equals', 'contains')),
      CONSTRAINT chk_alert_quiet_minutes
        CHECK (quiet_minutes >= 0 AND quiet_minutes <= 10080)
    );

    CREATE TABLE IF NOT EXISTS alert_deliveries (
      id              BIGSERIAL PRIMARY KEY,
      rule_id         BIGINT      NOT NULL REFERENCES alert_rules(id) ON DELETE CASCADE,
      event_id        BIGINT      REFERENCES event_logs(id) ON DELETE SET NULL,
      status          TEXT        NOT NULL,
      target_url      TEXT        NOT NULL,
      response_code   INT,
      error           TEXT,
      sent_at         TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      CONSTRAINT chk_alert_delivery_status
        CHECK (status IN ('sent', 'failed', 'suppressed'))
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

    CREATE INDEX IF NOT EXISTS idx_alert_rules_enabled
      ON alert_rules (enabled);

    CREATE INDEX IF NOT EXISTS idx_alert_rules_updated
      ON alert_rules (updated_at DESC);

    CREATE INDEX IF NOT EXISTS idx_alert_deliveries_rule_sent
      ON alert_deliveries (rule_id, sent_at DESC);

    CREATE INDEX IF NOT EXISTS idx_alert_deliveries_event
      ON alert_deliveries (event_id);
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
