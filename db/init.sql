-- HomeChronicle — database schema
-- This file runs automatically when the postgres container first starts.

CREATE EXTENSION IF NOT EXISTS pg_trgm;

CREATE TABLE IF NOT EXISTS event_logs (
    id              BIGSERIAL PRIMARY KEY,
    timestamp       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    accessory_id    TEXT        NOT NULL,   -- HAP aid (accessory identifier)
    accessory_name  TEXT        NOT NULL,
    room_name       TEXT,                   -- NULL if accessory has no room
    service_type    TEXT,                   -- e.g. "Lightbulb", "MotionSensor"
    characteristic  TEXT        NOT NULL,   -- e.g. "On", "MotionDetected"
    old_value       TEXT,                   -- NULL on first observation
    new_value       TEXT        NOT NULL,
    raw_iid         INT                     -- HAP instance ID, useful for debugging
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

-- Primary query pattern: latest events, optionally filtered
CREATE INDEX IF NOT EXISTS idx_event_logs_timestamp_id   ON event_logs (timestamp DESC, id DESC);
CREATE INDEX IF NOT EXISTS idx_event_logs_accessory      ON event_logs (accessory_name);
CREATE INDEX IF NOT EXISTS idx_event_logs_accessory_ts   ON event_logs (accessory_name, timestamp DESC, id DESC);
CREATE INDEX IF NOT EXISTS idx_event_logs_accessory_trgm ON event_logs USING GIN (accessory_name gin_trgm_ops);
CREATE INDEX IF NOT EXISTS idx_event_logs_room           ON event_logs (room_name);
CREATE INDEX IF NOT EXISTS idx_event_logs_room_ts        ON event_logs (room_name, timestamp DESC, id DESC);
CREATE INDEX IF NOT EXISTS idx_event_logs_char           ON event_logs (characteristic);
CREATE INDEX IF NOT EXISTS idx_event_logs_char_ts        ON event_logs (characteristic, timestamp DESC, id DESC);

-- Stats queries group by hour/day in UTC.
-- date_trunc(timestamptz) is not immutable; convert to UTC timestamp first.
CREATE INDEX IF NOT EXISTS idx_event_logs_timestamp_trunc ON event_logs (date_trunc('hour', timestamp AT TIME ZONE 'UTC'));
