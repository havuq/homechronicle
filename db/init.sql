-- HomeChronicle — database schema
-- This file runs automatically when the postgres container first starts.

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

-- Primary query pattern: latest events, optionally filtered
CREATE INDEX idx_event_logs_timestamp   ON event_logs (timestamp DESC);
CREATE INDEX idx_event_logs_accessory   ON event_logs (accessory_name);
CREATE INDEX idx_event_logs_room        ON event_logs (room_name);
CREATE INDEX idx_event_logs_char        ON event_logs (characteristic);

-- Stats queries group by hour/day
CREATE INDEX idx_event_logs_timestamp_trunc ON event_logs (date_trunc('hour', timestamp));
