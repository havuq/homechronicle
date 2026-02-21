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

const ROOMS_FILE = process.env.ROOMS_FILE
  || (process.env.NODE_ENV === 'production' ? '/app/data/rooms.json' : './data/rooms.json');

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
// Room store helpers  (accessoryId → roomName)
// ---------------------------------------------------------------------------

function loadRooms() {
  if (existsSync(ROOMS_FILE)) {
    try {
      return JSON.parse(readFileSync(ROOMS_FILE, 'utf8'));
    } catch {
      return {};
    }
  }
  return {};
}

function saveRooms(r) {
  writeFileSync(ROOMS_FILE, JSON.stringify(r, null, 2));
}

// ---------------------------------------------------------------------------
// 1. Start HomeKit subscribers
// ---------------------------------------------------------------------------

let pairings = loadPairings();
const pairedCount = Object.keys(pairings).length;

if (pairedCount > 0) {
  console.log(`[init] Loaded ${pairedCount} pairing(s) from ${PAIRINGS_FILE}`);
  startSubscribers(pairings, loadRooms());
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
    startSubscribers({ [deviceId]: updatedPairings[deviceId] }, loadRooms());

    console.log(`[setup] Paired successfully: ${cached.name}`);
    res.json({ success: true, name: cached.name });
  } catch (err) {
    console.error(`[setup] Pairing failed for ${deviceId}:`, err.message);
    const msg = err.message ?? '';
    let friendly = 'Pairing failed: ' + err.message;
    if (msg.includes('0x02') || /authentication/i.test(msg))
      friendly = 'Wrong PIN — double-check the code on the device label and try again.';
    else if (msg.includes('0x04') || /maxpeers/i.test(msg))
      friendly = 'This device has reached its pairing limit. In Apple Home, long-press the accessory → remove it, then re-add it to free a slot, then try pairing here again.';
    else if (msg.includes('0x05') || /maxtries/i.test(msg))
      friendly = 'Too many failed attempts — wait a few minutes before trying again.';
    else if (msg.includes('0x06') || /unavailable/i.test(msg))
      friendly = 'Device is unavailable. Make sure it\'s powered on and on the same network, then try again.';
    else if (msg.includes('0x07') || /busy/i.test(msg))
      friendly = 'Device is busy — wait a moment and try again.';
    else if (/ECONNREFUSED|ETIMEDOUT|ENOTFOUND/i.test(msg))
      friendly = 'Could not reach the device. Run a new scan to refresh its address, then try again.';
    res.status(400).json({ error: friendly });
  }
});

// ---------------------------------------------------------------------------
// UUID helper (mirrors shortUuid in subscriber.js)
// ---------------------------------------------------------------------------

function shortUuid(uuid = '') {
  const match = uuid.match(/^0*([0-9A-Fa-f]+)-/);
  return match ? match[1].toUpperCase() : uuid.toUpperCase();
}

// GET /api/setup/bridge-children/:deviceId
// Returns all child accessories exposed by a paired bridge.
// Each entry: { childId: "bridgeId:aid", name, aid }
app.get('/api/setup/bridge-children/:deviceId', async (req, res) => {
  const { deviceId } = req.params;
  const currentPairings = loadPairings();
  const pairing = currentPairings[deviceId];
  if (!pairing) return res.status(404).json({ error: 'Pairing not found' });

  try {
    const client = new HttpClient(deviceId, pairing.address, pairing.port, pairing.longTermData);
    const result = await client.getAccessories();
    const children = [];
    for (const acc of result?.accessories ?? []) {
      if (acc.aid === 1) continue; // skip the bridge root itself
      const infoService = acc.services?.find((s) => shortUuid(s.type) === '3E');
      const nameProp    = infoService?.characteristics?.find((c) => shortUuid(c.type) === '23');
      const name        = nameProp?.value ?? `Device ${acc.aid}`;
      children.push({ childId: `${deviceId}:${acc.aid}`, name, aid: acc.aid });
    }
    console.log(`[setup] bridge-children: ${pairing.name} → ${children.length} child(ren)`);
    res.json(children);
  } catch (err) {
    console.error(`[setup] bridge-children error for ${deviceId}:`, err.message);
    res.status(500).json({ error: 'Could not query bridge: ' + err.message });
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

// DELETE /api/setup/pairing/:deviceId — remove a pairing
app.delete('/api/setup/pairing/:deviceId', (req, res) => {
  const { deviceId } = req.params;
  const currentPairings = loadPairings();

  if (!currentPairings[deviceId]) {
    return res.status(404).json({ error: 'Pairing not found' });
  }

  const name = currentPairings[deviceId].name;
  delete currentPairings[deviceId];
  savePairings(currentPairings);

  // Also update the discovery cache so the device shows as unpaired
  const cached = discoveryCache.find((s) => s.id === deviceId);
  if (cached) { cached.paired = false; cached.alreadyPaired = false; }

  console.log(`[setup] Removed pairing for ${name} (${deviceId})`);
  res.json({ success: true, name });
});

// PATCH /api/setup/room  { accessoryId, roomName }
// Sets or clears the room assignment for an accessory in rooms.json.
app.patch('/api/setup/room', (req, res) => {
  const { accessoryId, roomName } = req.body ?? {};
  if (!accessoryId) return res.status(400).json({ error: 'accessoryId is required' });

  const rooms = loadRooms();
  if (roomName && roomName.trim()) {
    rooms[accessoryId] = roomName.trim();
  } else {
    delete rooms[accessoryId];
  }
  saveRooms(rooms);
  console.log(`[setup] Room for ${accessoryId} set to ${roomName?.trim() || '(cleared)'}`);
  res.json({ success: true });
});

// GET /api/setup/rooms — return all room assignments
app.get('/api/setup/rooms', (_req, res) => {
  res.json(loadRooms());
});

// ---------------------------------------------------------------------------
// Data management endpoints (delete history)
// ---------------------------------------------------------------------------

// DELETE /api/data/accessory  { accessoryId }
// Removes all event_logs rows for one accessory and its room assignment.
// accessoryId can contain colons (e.g. "AA:BB:CC:DD:EE:FF:2") so we use
// the request body rather than a URL param to avoid encoding issues.
app.delete('/api/data/accessory', async (req, res) => {
  const { accessoryId } = req.body ?? {};
  if (!accessoryId) return res.status(400).json({ error: 'accessoryId is required' });
  try {
    const result = await pool.query(
      'DELETE FROM event_logs WHERE accessory_id = $1', [accessoryId]
    );
    const rooms = loadRooms();
    delete rooms[accessoryId];
    saveRooms(rooms);
    console.log(`[data] Deleted ${result.rowCount} event(s) for accessory ${accessoryId}`);
    res.json({ success: true, deleted: result.rowCount });
  } catch (err) {
    console.error('[data] /api/data/accessory error:', err.message);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// DELETE /api/data/all — truncate event_logs and clear rooms.json
app.delete('/api/data/all', async (_req, res) => {
  try {
    const result = await pool.query('DELETE FROM event_logs');
    saveRooms({});
    console.log(`[data] Wiped all data — ${result.rowCount} event(s) deleted`);
    res.json({ success: true, deleted: result.rowCount });
  } catch (err) {
    console.error('[data] /api/data/all error:', err.message);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// ---------------------------------------------------------------------------
// Event / stats endpoints
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

// Helper: extract the top-level bridge MAC from an accessory_id.
// "AA:BB:CC:DD:EE:FF:3" → "AA:BB:CC:DD:EE:FF"   (bridge child)
// "AA:BB:CC:DD:EE:FF"   → "AA:BB:CC:DD:EE:FF"   (bridge or standalone)
function parentBridgeId(id) {
  const parts = id.split(':');
  return parts.length > 6 ? parts.slice(0, 6).join(':') : id;
}

app.get('/api/accessories', async (_req, res) => {
  try {
    // One row per accessory: latest name/room/service_type + last_seen + event count.
    // GROUP BY instead of DISTINCT ON so we can add COUNT(*) cheaply.
    const result = await pool.query(`
      SELECT
        accessory_id,
        accessory_name,
        room_name,
        service_type,
        MAX(timestamp)  AS last_seen,
        COUNT(*)::int   AS event_count
      FROM event_logs
      GROUP BY accessory_id, accessory_name, room_name, service_type
      ORDER BY last_seen DESC
    `);

    const rooms           = loadRooms();
    const currentPairings = loadPairings();

    // Overlay rooms.json + bridge metadata (address, pairedAt) onto DB rows
    const dbRows = result.rows.map((r) => {
      const bridgePairing = currentPairings[parentBridgeId(r.accessory_id)];
      return {
        ...r,
        room_name:   rooms[r.accessory_id]     ?? r.room_name,
        address:     bridgePairing?.address     ?? null,
        paired_at:   bridgePairing?.pairedAt    ?? null,
      };
    });

    // Build a set of known accessory_ids from the DB
    const seenIds = new Set(dbRows.map((r) => r.accessory_id));

    // Merge in paired bridges that haven't fired any event yet
    const neverSeen = Object.entries(currentPairings)
      .filter(([id]) => !seenIds.has(id))
      .map(([id, p]) => ({
        accessory_id:   id,
        accessory_name: p.name,
        room_name:      rooms[id] ?? null,
        service_type:   null,
        category:       p.category ?? null,
        last_seen:      null,
        event_count:    0,
        address:        p.address  ?? null,
        paired_at:      p.pairedAt ?? null,
      }));

    res.json([...dbRows, ...neverSeen]);
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
