/**
 * index.js — entry point.
 *
 * 1. Reads pairings.json and starts HomeKit subscribers.
 * 2. Starts an Express REST API for the web frontend.
 */

import { readFileSync, writeFileSync, existsSync } from 'fs';
import express from 'express';
import cors from 'cors';
import { IPDiscovery, HttpClient } from 'hap-controller';
import { pool } from './db.js';
import { startSubscribers } from './subscriber.js';

const PAIRINGS_FILE = process.env.PAIRINGS_FILE
  || (process.env.NODE_ENV === 'production' ? '/app/data/pairings.json' : './data/pairings.json');

const PORT = Number(process.env.API_PORT ?? 3001);
const DISCOVER_IFACE = process.env.DISCOVER_IFACE || null;
const RESCAN_INTERVAL_MS = 60 * 60 * 1000; // 1 hour

// ---------------------------------------------------------------------------
// Pairing store helpers
// ---------------------------------------------------------------------------

function loadPairings() {
  if (existsSync(PAIRINGS_FILE)) {
    try {
      return JSON.parse(readFileSync(PAIRINGS_FILE, 'utf8'));
    } catch {
      return {};
    }
  }
  return {};
}

function savePairings(p) {
  writeFileSync(PAIRINGS_FILE, JSON.stringify(p, null, 2));
}

// ---------------------------------------------------------------------------
// 1. Start HomeKit subscribers
// ---------------------------------------------------------------------------

let pairings = loadPairings();
const pairedCount = Object.keys(pairings).length;

if (pairedCount > 0) {
  console.log(`[init] Loaded ${pairedCount} pairing(s) from ${PAIRINGS_FILE}`);
  startSubscribers(pairings);
} else {
  console.warn(`[init] No pairings found — use the Setup tab in the web UI to discover and pair accessories.`);
}

// ---------------------------------------------------------------------------
// 2. Background discovery scan (refreshes every hour, populates cache)
// ---------------------------------------------------------------------------

let discoveryCache = []; // last scan results

function runDiscoveryScan() {
  return new Promise((resolve) => {
    const found = new Map();
    const discovery = new IPDiscovery(DISCOVER_IFACE);

    discovery.on('serviceUp', (service) => {
      if (!found.has(service.id)) found.set(service.id, service);
    });

    discovery.start();

    setTimeout(() => {
      discovery.stop();
      const currentPairings = loadPairings();
      discoveryCache = [...found.values()].map((s) => ({
        id:       s.id,
        name:     s.name,
        address:  s.address,
        port:     s.port,
        category: s.ci ?? null,
        paired:   s.sf === 0 || !!currentPairings[s.id],
        alreadyPaired: !!currentPairings[s.id],
      }));
      console.log(`[discovery] Scan complete — found ${discoveryCache.length} accessory/accessories`);
      resolve(discoveryCache);
    }, 10_000);
  });
}

// Run initial scan in background, then repeat hourly
runDiscoveryScan();
setInterval(runDiscoveryScan, RESCAN_INTERVAL_MS);

// ---------------------------------------------------------------------------
// 3. REST API
// ---------------------------------------------------------------------------

const app = express();
app.use(cors());
app.use(express.json());

// ---------------------------------------------------------------------------
// Setup endpoints
// ---------------------------------------------------------------------------

// GET /api/setup/discovered — return cached discovery results immediately
// POST /api/setup/scan — trigger a fresh scan (takes ~10s, waits for result)
app.get('/api/setup/discovered', (_req, res) => {
  const currentPairings = loadPairings();
  const results = discoveryCache.map((s) => ({
    ...s,
    paired:        s.alreadyPaired || !!currentPairings[s.id],
    alreadyPaired: !!currentPairings[s.id],
  }));
  res.json({ accessories: results, cachedAt: new Date().toISOString() });
});

app.post('/api/setup/scan', async (_req, res) => {
  try {
    console.log('[setup] Manual scan triggered from UI');
    const results = await runDiscoveryScan();
    res.json({ accessories: results, cachedAt: new Date().toISOString() });
  } catch (err) {
    console.error('[setup] Scan error:', err.message);
    res.status(500).json({ error: 'Scan failed: ' + err.message });
  }
});

// POST /api/setup/pair  { deviceId, pin }
app.post('/api/setup/pair', async (req, res) => {
  const { deviceId, pin } = req.body ?? {};

  if (!deviceId || !pin) {
    return res.status(400).json({ error: 'deviceId and pin are required' });
  }

  // Find in cache
  const cached = discoveryCache.find((s) => s.id === deviceId);
  if (!cached) {
    return res.status(404).json({
      error: 'Accessory not found in last scan. Run a new scan first.',
    });
  }

  console.log(`[setup] Pairing ${cached.name} (${deviceId})`);

  try {
    const client = new HttpClient(deviceId, cached.address, cached.port);
    await client.pairSetup(pin);
    const longTermData = client.getLongTermData();

    const updatedPairings = loadPairings();
    updatedPairings[deviceId] = {
      name:         cached.name,
      address:      cached.address,
      port:         cached.port,
      category:     cached.category,
      pairedAt:     new Date().toISOString(),
      longTermData,
    };
    savePairings(updatedPairings);

    // Update cache to reflect new pairing
    const item = discoveryCache.find((s) => s.id === deviceId);
    if (item) { item.paired = true; item.alreadyPaired = true; }

    // Start subscriber for the newly paired device
    startSubscribers({ [deviceId]: updatedPairings[deviceId] });

    console.log(`[setup] Paired successfully: ${cached.name}`);
    res.json({ success: true, name: cached.name });
  } catch (err) {
    console.error(`[setup] Pairing failed for ${deviceId}:`, err.message);
    res.status(500).json({ error: 'Pairing failed: ' + err.message });
  }
});

// GET /api/setup/pairings — list currently paired devices
app.get('/api/setup/pairings', (_req, res) => {
  const currentPairings = loadPairings();
  const list = Object.entries(currentPairings).map(([id, p]) => ({
    id,
    name:      p.name,
    address:   p.address,
    port:      p.port,
    category:  p.category,
    pairedAt:  p.pairedAt,
  }));
  res.json(list);
});

// ---------------------------------------------------------------------------
// Event / stats endpoints (unchanged)
// ---------------------------------------------------------------------------

app.get('/api/events', async (req, res) => {
  try {
    const page   = Math.max(1, parseInt(req.query.page  ?? '1', 10));
    const limit  = Math.min(200, Math.max(1, parseInt(req.query.limit ?? '50', 10)));
    const offset = (page - 1) * limit;

    const conditions = [];
    const params = [];

    if (req.query.room)           { params.push(req.query.room);                  conditions.push(`room_name = $${params.length}`); }
    if (req.query.accessory)      { params.push(`%${req.query.accessory}%`);       conditions.push(`accessory_name ILIKE $${params.length}`); }
    if (req.query.characteristic) { params.push(req.query.characteristic);         conditions.push(`characteristic = $${params.length}`); }
    if (req.query.from)           { params.push(req.query.from);                   conditions.push(`timestamp >= $${params.length}`); }
    if (req.query.to)             { params.push(req.query.to);                     conditions.push(`timestamp <= $${params.length}`); }

    const where = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';

    const countResult = await pool.query(`SELECT COUNT(*) AS total FROM event_logs ${where}`, params);
    const total = parseInt(countResult.rows[0].total, 10);

    params.push(limit, offset);
    const dataResult = await pool.query(
      `SELECT id, timestamp, accessory_id, accessory_name, room_name,
              service_type, characteristic, old_value, new_value, raw_iid
       FROM event_logs ${where}
       ORDER BY timestamp DESC
       LIMIT $${params.length - 1} OFFSET $${params.length}`,
      params
    );

    res.json({ total, page, limit, pages: Math.ceil(total / limit), events: dataResult.rows });
  } catch (err) {
    console.error('[api] /api/events error:', err.message);
    res.status(500).json({ error: 'Internal server error' });
  }
});

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

app.get('/api/stats/hourly', async (_req, res) => {
  try {
    const result = await pool.query(`
      SELECT EXTRACT(HOUR FROM timestamp AT TIME ZONE 'UTC') AS hour, COUNT(*) AS count
      FROM event_logs WHERE timestamp >= NOW() - INTERVAL '30 days'
      GROUP BY hour ORDER BY hour
    `);
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: 'Internal server error' });
  }
});

app.get('/api/stats/daily', async (_req, res) => {
  try {
    const result = await pool.query(`
      SELECT DATE(timestamp AT TIME ZONE 'UTC') AS day, COUNT(*) AS count
      FROM event_logs WHERE timestamp >= NOW() - INTERVAL '90 days'
      GROUP BY day ORDER BY day
    `);
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: 'Internal server error' });
  }
});

app.get('/api/stats/top-devices', async (_req, res) => {
  try {
    const result = await pool.query(`
      SELECT accessory_name, room_name, COUNT(*) AS event_count
      FROM event_logs WHERE timestamp >= NOW() - INTERVAL '7 days'
      GROUP BY accessory_name, room_name
      ORDER BY event_count DESC LIMIT 10
    `);
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: 'Internal server error' });
  }
});

app.get('/api/health', (_req, res) => {
  res.json({ status: 'ok', paired: Object.keys(loadPairings()).length });
});

app.listen(PORT, () => {
  console.log(`[api] Listening on port ${PORT}`);
});
