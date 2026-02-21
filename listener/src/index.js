/**
 * index.js — entry point.
 *
 * 1. Reads pairings.json and starts HomeKit subscribers.
 * 2. Starts an Express REST API for the web frontend.
 */

import { readFileSync, existsSync } from 'fs';
import express from 'express';
import cors from 'cors';
import { pool } from './db.js';
import { startSubscribers } from './subscriber.js';

const PAIRINGS_FILE = '/app/data/pairings.json';
const PORT = Number(process.env.API_PORT ?? 3001);

// ---------------------------------------------------------------------------
// 1. Start HomeKit subscribers
// ---------------------------------------------------------------------------

let pairings = {};
if (existsSync(PAIRINGS_FILE)) {
  try {
    pairings = JSON.parse(readFileSync(PAIRINGS_FILE, 'utf8'));
    const count = Object.keys(pairings).length;
    console.log(`[init] Loaded ${count} pairing(s) from ${PAIRINGS_FILE}`);
  } catch (err) {
    console.error('[init] Failed to parse pairings.json:', err.message);
  }
} else {
  console.warn(`[init] No pairings file found at ${PAIRINGS_FILE}`);
  console.warn('[init] Run "docker compose run --rm listener node src/discover.js" to find accessories.');
  console.warn('[init] Then run "docker compose run --rm listener node src/pairing.js <id> <pin>" to pair.');
}

if (Object.keys(pairings).length > 0) {
  startSubscribers(pairings);
}

// ---------------------------------------------------------------------------
// 2. REST API
// ---------------------------------------------------------------------------

const app = express();
app.use(cors());
app.use(express.json());

// GET /api/events
// Query params: page (default 1), limit (default 50, max 200),
//               room, accessory, characteristic, from (ISO), to (ISO)
app.get('/api/events', async (req, res) => {
  try {
    const page  = Math.max(1, parseInt(req.query.page  ?? '1', 10));
    const limit = Math.min(200, Math.max(1, parseInt(req.query.limit ?? '50', 10)));
    const offset = (page - 1) * limit;

    const conditions = [];
    const params = [];

    if (req.query.room) {
      params.push(req.query.room);
      conditions.push(`room_name = $${params.length}`);
    }
    if (req.query.accessory) {
      params.push(`%${req.query.accessory}%`);
      conditions.push(`accessory_name ILIKE $${params.length}`);
    }
    if (req.query.characteristic) {
      params.push(req.query.characteristic);
      conditions.push(`characteristic = $${params.length}`);
    }
    if (req.query.from) {
      params.push(req.query.from);
      conditions.push(`timestamp >= $${params.length}`);
    }
    if (req.query.to) {
      params.push(req.query.to);
      conditions.push(`timestamp <= $${params.length}`);
    }

    const where = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';

    // Count total for pagination
    const countResult = await pool.query(
      `SELECT COUNT(*) AS total FROM event_logs ${where}`,
      params
    );
    const total = parseInt(countResult.rows[0].total, 10);

    params.push(limit, offset);
    const dataResult = await pool.query(
      `SELECT id, timestamp, accessory_id, accessory_name, room_name,
              service_type, characteristic, old_value, new_value, raw_iid
       FROM event_logs
       ${where}
       ORDER BY timestamp DESC
       LIMIT $${params.length - 1} OFFSET $${params.length}`,
      params
    );

    res.json({
      total,
      page,
      limit,
      pages: Math.ceil(total / limit),
      events: dataResult.rows,
    });
  } catch (err) {
    console.error('[api] /api/events error:', err.message);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// GET /api/accessories — distinct accessories seen in the log
app.get('/api/accessories', async (_req, res) => {
  try {
    const result = await pool.query(`
      SELECT DISTINCT ON (accessory_id)
        accessory_id, accessory_name, room_name, service_type,
        MAX(timestamp) OVER (PARTITION BY accessory_id) AS last_seen
      FROM event_logs
      ORDER BY accessory_id, last_seen DESC
    `);
    res.json(result.rows);
  } catch (err) {
    console.error('[api] /api/accessories error:', err.message);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// GET /api/stats/hourly — events per hour of day (last 30 days)
app.get('/api/stats/hourly', async (_req, res) => {
  try {
    const result = await pool.query(`
      SELECT EXTRACT(HOUR FROM timestamp AT TIME ZONE 'UTC') AS hour,
             COUNT(*) AS count
      FROM event_logs
      WHERE timestamp >= NOW() - INTERVAL '30 days'
      GROUP BY hour
      ORDER BY hour
    `);
    res.json(result.rows);
  } catch (err) {
    console.error('[api] /api/stats/hourly error:', err.message);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// GET /api/stats/daily — events per day (last 90 days)
app.get('/api/stats/daily', async (_req, res) => {
  try {
    const result = await pool.query(`
      SELECT DATE(timestamp AT TIME ZONE 'UTC') AS day,
             COUNT(*) AS count
      FROM event_logs
      WHERE timestamp >= NOW() - INTERVAL '90 days'
      GROUP BY day
      ORDER BY day
    `);
    res.json(result.rows);
  } catch (err) {
    console.error('[api] /api/stats/daily error:', err.message);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// GET /api/stats/top-devices — most active devices in the last 7 days
app.get('/api/stats/top-devices', async (_req, res) => {
  try {
    const result = await pool.query(`
      SELECT accessory_name, room_name, COUNT(*) AS event_count
      FROM event_logs
      WHERE timestamp >= NOW() - INTERVAL '7 days'
      GROUP BY accessory_name, room_name
      ORDER BY event_count DESC
      LIMIT 10
    `);
    res.json(result.rows);
  } catch (err) {
    console.error('[api] /api/stats/top-devices error:', err.message);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Health check
app.get('/api/health', (_req, res) => {
  res.json({ status: 'ok', paired: Object.keys(pairings).length });
});

app.listen(PORT, () => {
  console.log(`[api] Listening on port ${PORT}`);
});
