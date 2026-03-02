/**
 * index.js — entry point.
 *
 * 1. Loads cached pairing/room metadata and starts HomeKit subscribers.
 * 2. Starts an Express REST API for the web frontend.
 */

import { networkInterfaces } from 'os';
import express from 'express';
import cors from 'cors';
import { IPDiscovery, HttpClient } from 'hap-controller';
import { insertEvent, pool, migrateDb, runRetentionSweep } from './db.js';
import { startSubscribers, stopSubscriber, getSubscriberStats } from './subscriber.js';
import { JsonObjectStore } from './store.js';
import { createEventsRouter, parentBridgeId, parseIntInRange } from './events-router.js';
import { createAlertsRouter } from './alerts-router.js';
import { createMatterRouter } from './matter-router.js';
import { createMatterRuntime } from './matter-runtime.js';
import { deriveDeviceHealth } from './device-health.js';
import { detectOutliers } from './anomaly-detection.js';
import {
  cacheAccessoryMetadata,
  getAccessoryCapabilities,
  getAccessoryIdentity,
  shortUuid,
} from './accessory-metadata.js';

const PAIRINGS_FILE = process.env.PAIRINGS_FILE
  || (process.env.NODE_ENV === 'production' ? '/app/data/pairings.json' : './data/pairings.json');

const ROOMS_FILE = process.env.ROOMS_FILE
  || (process.env.NODE_ENV === 'production' ? '/app/data/rooms.json' : './data/rooms.json');
const RETENTION_FILE = process.env.RETENTION_FILE
  || (process.env.NODE_ENV === 'production' ? '/app/data/retention.json' : './data/retention.json');

const PORT = Number(process.env.API_PORT ?? 3001);
const RESCAN_INTERVAL_MS = 60 * 60 * 1000; // 1 hour
const STORE_REFRESH_INTERVAL_MS = Number.parseInt(process.env.STORE_REFRESH_INTERVAL_MS ?? '30000', 10);
const API_TOKEN = (process.env.API_TOKEN ?? '').trim();
const ALERTS_ENABLED = !/^(0|false|no|off)$/i.test(process.env.ALERTS_ENABLED ?? 'false');

const RETENTION_SWEEP_MS = Number.parseInt(process.env.RETENTION_SWEEP_MS ?? `${24 * 60 * 60 * 1000}`, 10);
const RETENTION_DAYS_DEFAULT = Number.parseInt(process.env.RETENTION_DAYS ?? '365', 10);
const RETENTION_ARCHIVE_DEFAULT = /^(1|true|yes|on)$/i.test(process.env.RETENTION_ARCHIVE ?? 'true');
const STALE_THRESHOLD_HOURS_DEFAULT = Number.parseInt(process.env.STALE_THRESHOLD_HOURS ?? '12', 10);

const pairingsStore = new JsonObjectStore(PAIRINGS_FILE, {});
const roomsStore = new JsonObjectStore(ROOMS_FILE, {});
const retentionStore = new JsonObjectStore(RETENTION_FILE, {
  retentionDays: RETENTION_DAYS_DEFAULT,
  archiveBeforeDelete: RETENTION_ARCHIVE_DEFAULT,
  staleThresholdHours: STALE_THRESHOLD_HOURS_DEFAULT,
});
let matterRuntime = null;

function normalizePairingRecord(id, pairing = {}) {
  const protocol = String(pairing?.protocol ?? 'homekit').toLowerCase() === 'matter'
    ? 'matter'
    : 'homekit';
  if (protocol === 'matter') {
    return {
      ...pairing,
      protocol: 'matter',
      nodeId: pairing?.nodeId ?? id,
      name: pairing?.name ?? pairing?.nodeId ?? id,
    };
  }
  return {
    ...pairing,
    protocol: 'homekit',
  };
}

function normalizePairingsMap(input = {}) {
  const output = {};
  for (const [id, pairing] of Object.entries(input ?? {})) {
    output[id] = normalizePairingRecord(id, pairing);
  }
  return output;
}

function isHomeKitPairing(pairing) {
  return String(pairing?.protocol ?? 'homekit').toLowerCase() === 'homekit';
}

function getHomeKitPairings(pairings = {}) {
  return Object.fromEntries(
    Object.entries(pairings).filter(([, pairing]) => isHomeKitPairing(pairing))
  );
}

function normalizeRetentionSettings(input = {}) {
  const days = Number.parseInt(String(input.retentionDays ?? ''), 10);
  const retentionDays = Number.isFinite(days) && days >= 1 && days <= 3650
    ? days
    : RETENTION_DAYS_DEFAULT;
  const staleHours = Number.parseInt(String(input.staleThresholdHours ?? ''), 10);
  const staleThresholdHours = Number.isFinite(staleHours) && staleHours >= 1 && staleHours <= 720
    ? staleHours
    : STALE_THRESHOLD_HOURS_DEFAULT;
  const archiveBeforeDelete = input.archiveBeforeDelete === undefined
    ? RETENTION_ARCHIVE_DEFAULT
    : Boolean(input.archiveBeforeDelete);
  return { retentionDays, archiveBeforeDelete, staleThresholdHours };
}

function loadPairings() {
  return normalizePairingsMap(pairingsStore.getSnapshot());
}

async function savePairings(pairings) {
  const normalized = normalizePairingsMap(pairings);
  await pairingsStore.write(normalized);
  if (matterRuntime) matterRuntime.syncPairings(normalized);
}

function loadRooms() {
  return roomsStore.getSnapshot();
}

async function saveRooms(rooms) {
  await roomsStore.write(rooms);
}

function loadRetentionSettings() {
  return normalizeRetentionSettings(retentionStore.getSnapshot());
}

async function saveRetentionSettings(settings) {
  await retentionStore.write(normalizeRetentionSettings(settings));
}

// Resolve the mDNS network interface.
// If DISCOVER_IFACE is set but doesn't exist on this machine, log the
// available interfaces and fall back to null (= let the OS choose).
const DISCOVER_IFACE = (() => {
  const requested = process.env.DISCOVER_IFACE || null;
  if (!requested) return null;
  const available = Object.keys(networkInterfaces());
  if (available.includes(requested)) return requested;
  console.warn(
    `[discovery] Interface '${requested}' not found on this machine.\n` +
    `            Available: ${available.join(', ')}\n` +
    `            Set DISCOVER_IFACE to one of the above, or unset it to auto-select.`
  );
  return null; // fall back — dnssd will pick the default interface
})();

// ---------------------------------------------------------------------------
// 0. Ensure runtime state exists
// ---------------------------------------------------------------------------

await migrateDb();
await pairingsStore.init();
await roomsStore.init();
await retentionStore.init();
matterRuntime = createMatterRuntime({
  insertEvent,
  loadRooms,
});

let retentionSettings = loadRetentionSettings();

if (Number.isFinite(STORE_REFRESH_INTERVAL_MS) && STORE_REFRESH_INTERVAL_MS >= 5_000) {
  setInterval(() => {
    void pairingsStore.refresh().catch((err) => {
      console.warn('[store] pairings refresh failed:', err.message ?? err.stack ?? err);
    });
    if (matterRuntime) {
      try {
        matterRuntime.syncPairings(loadPairings());
      } catch (err) {
        console.warn('[matter] pairing sync failed:', err.message ?? err.stack ?? err);
      }
    }
    void roomsStore.refresh().catch((err) => {
      console.warn('[store] rooms refresh failed:', err.message ?? err.stack ?? err);
    });
    void retentionStore.refresh()
      .then(() => { retentionSettings = loadRetentionSettings(); })
      .catch((err) => {
        console.warn('[store] retention refresh failed:', err.message ?? err.stack ?? err);
      });
  }, STORE_REFRESH_INTERVAL_MS);
}

// ---------------------------------------------------------------------------
// 1. Start HomeKit subscribers
// ---------------------------------------------------------------------------

const pairings = loadPairings();
const homeKitPairings = getHomeKitPairings(pairings);
const pairedCount = Object.keys(homeKitPairings).length;
matterRuntime.syncPairings(pairings);

if (pairedCount > 0) {
  console.log(`[init] Loaded ${pairedCount} pairing(s) from ${PAIRINGS_FILE}`);
  startSubscribers(homeKitPairings, loadRooms(), (id) => {
    const pairing = pairingsStore.getByKey(id);
    if (!pairing || !isHomeKitPairing(pairing)) return null;
    return normalizePairingRecord(id, pairing);
  });
} else {
  console.warn('[init] No pairings found — use the Setup tab in the web UI to discover and pair accessories.');
}

// ---------------------------------------------------------------------------
// 2. Background discovery scan (refreshes every hour, populates cache)
// ---------------------------------------------------------------------------

let discoveryCache = []; // last scan results

function runDiscoveryScan() {
  return new Promise((resolve, reject) => {
    const found = new Map();
    let discovery;

    try {
      discovery = new IPDiscovery(DISCOVER_IFACE);
    } catch (err) {
      return reject(err);
    }

    discovery.on('serviceUp', (service) => {
      if (!found.has(service.id)) found.set(service.id, service);
    });

    try {
      discovery.start();
    } catch (err) {
      return reject(err);
    }

    setTimeout(() => {
      void (async () => {
        try {
          try { discovery.stop(); } catch { /* ignore stop errors */ }
          await pairingsStore.refresh();
          const allPairings = loadPairings();
          const currentPairings = getHomeKitPairings(allPairings);
          discoveryCache = [...found.values()].map((s) => ({
            id: s.id,
            protocol: 'homekit',
            name: s.name,
            address: s.address,
            port: s.port,
            category: s.ci ?? null,
            paired: s.sf === 0 || !!currentPairings[s.id],
            alreadyPaired: !!currentPairings[s.id],
          }));
          console.log(`[discovery] Scan complete — found ${discoveryCache.length} accessory/accessories`);

          let pairingsUpdated = false;
          for (const [id, pairing] of Object.entries(currentPairings)) {
            const seen = found.get(id);
            if (!seen) continue;
            if (seen.address !== pairing.address || seen.port !== pairing.port) {
              console.log(
                `[discovery] ${pairing.name}: address updated ` +
                `${pairing.address}:${pairing.port} -> ${seen.address}:${seen.port} — pairing refreshed`
              );
              currentPairings[id] = { ...pairing, address: seen.address, port: seen.port };
              pairingsUpdated = true;
            }
          }
          if (pairingsUpdated) {
            await savePairings({
              ...allPairings,
              ...currentPairings,
            });
          }

          resolve(discoveryCache);
        } catch (err) {
          reject(err);
        }
      })();
    }, 10_000);
  });
}

function safeDiscoveryScan() {
  return runDiscoveryScan().catch((err) => {
    console.warn(`[discovery] Scan skipped: ${err.message}`);
    return [];
  });
}

safeDiscoveryScan();
setInterval(safeDiscoveryScan, RESCAN_INTERVAL_MS);

// ---------------------------------------------------------------------------
// 2b. Retention / archival sweep
// ---------------------------------------------------------------------------

async function runRetentionSweepSafe() {
  if (!Number.isFinite(retentionSettings.retentionDays) || retentionSettings.retentionDays <= 0) {
    return;
  }
  try {
    const result = await runRetentionSweep({
      retentionDays: retentionSettings.retentionDays,
      archiveBeforeDelete: retentionSettings.archiveBeforeDelete,
    });
    if (result.deleted > 0 || result.archived > 0) {
      console.log(
        `[retention] cutoff=${result.cutoffDays}d archived=${result.archived} deleted=${result.deleted}`
      );
    }
  } catch (err) {
    console.error('[retention] sweep failed:', err.message ?? err.stack ?? err);
  }
}

void runRetentionSweepSafe();
if (Number.isFinite(RETENTION_SWEEP_MS) && RETENTION_SWEEP_MS >= 60_000) {
  setInterval(() => {
    void runRetentionSweepSafe();
  }, RETENTION_SWEEP_MS);
}

// ---------------------------------------------------------------------------
// 3. REST API
// ---------------------------------------------------------------------------

const app = express();
app.use(cors());
app.use(express.json());
app.use((req, res, next) => {
  if (!API_TOKEN) return next();
  if (req.method === 'GET' || req.method === 'HEAD' || req.method === 'OPTIONS') return next();

  const authHeader = req.get('authorization') ?? '';
  const bearerMatch = authHeader.match(/^Bearer\s+(.+)$/i);
  const providedToken = (req.get('x-api-token') ?? bearerMatch?.[1] ?? '').trim();

  if (providedToken === API_TOKEN) return next();
  return res.status(401).json({ error: 'Unauthorized' });
});

// Setup endpoints
app.get('/api/setup/discovered', (_req, res) => {
  const currentPairings = getHomeKitPairings(loadPairings());
  const results = discoveryCache.map((s) => ({
    ...s,
    paired: s.alreadyPaired || !!currentPairings[s.id],
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
    console.error('[setup] Scan error:', err.message ?? err.stack ?? err);
    res.status(200).json({
      accessories: discoveryCache,
      cachedAt: new Date().toISOString(),
      warning: `mDNS scan failed: ${err.message}. Check DISCOVER_IFACE setting.`,
    });
  }
});

app.post('/api/setup/pair', async (req, res) => {
  const { deviceId, pin, protocol = 'homekit' } = req.body ?? {};
  if (String(protocol).toLowerCase() !== 'homekit') {
    return res.status(400).json({ error: 'Unsupported protocol for this endpoint. Use /api/setup/matter/pair.' });
  }
  if (!deviceId || !pin) {
    return res.status(400).json({ error: 'deviceId and pin are required' });
  }

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
      protocol: 'homekit',
      name: cached.name,
      address: cached.address,
      port: cached.port,
      category: cached.category,
      pairedAt: new Date().toISOString(),
      longTermData,
    };
    await savePairings(updatedPairings);

    const item = discoveryCache.find((s) => s.id === deviceId);
    if (item) { item.paired = true; item.alreadyPaired = true; }

    startSubscribers({ [deviceId]: updatedPairings[deviceId] }, loadRooms(), (id) => pairingsStore.getByKey(id));

    console.log(`[setup] Paired successfully: ${cached.name}`);
    res.json({ success: true, name: cached.name });
  } catch (err) {
    console.error(`[setup] Pairing failed for ${deviceId}:`, err.message ?? err.stack ?? err);
    const msg = err.message ?? '';
    let friendly = 'Pairing failed: ' + err.message;
    if (msg.includes('0x02') || /authentication/i.test(msg))
      friendly = 'Wrong PIN — double-check the code on the device label and try again.';
    else if (msg.includes('0x04') || /maxpeers/i.test(msg))
      friendly = 'This device has reached its pairing limit. In Apple Home, long-press the accessory -> remove it, then re-add it to free a slot, then try pairing here again.';
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

app.get('/api/setup/bridge-children/:deviceId', async (req, res) => {
  const { deviceId } = req.params;
  const currentPairings = loadPairings();
  const pairing = currentPairings[deviceId];
  if (!pairing) return res.status(404).json({ error: 'Pairing not found' });
  if (!isHomeKitPairing(pairing)) {
    return res.status(400).json({ error: 'Bridge children are only available for HomeKit pairings' });
  }

  try {
    const client = new HttpClient(deviceId, pairing.address, pairing.port, pairing.longTermData);
    const result = await client.getAccessories();
    const children = [];
    for (const acc of result?.accessories ?? []) {
      if (acc.aid === 1) continue;
      const infoService = acc.services?.find((s) => shortUuid(s.type) === '3E');
      const nameProp = infoService?.characteristics?.find((c) => shortUuid(c.type) === '23');
      const name = nameProp?.value ?? `Device ${acc.aid}`;
      children.push({ childId: `${deviceId}:${acc.aid}`, name, aid: acc.aid });
    }
    console.log(`[setup] bridge-children: ${pairing.name} -> ${children.length} child(ren)`);
    res.json(children);
  } catch (err) {
    console.error(`[setup] bridge-children error for ${deviceId}:`, err.message ?? err.stack ?? err);
    res.status(500).json({ error: 'Could not query bridge: ' + err.message });
  }
});

app.get('/api/accessories/:accessoryId/capabilities', async (req, res) => {
  const accessoryId = String(req.params.accessoryId ?? '');
  const bridgeId = parentBridgeId(accessoryId);

  const capability = getAccessoryCapabilities(accessoryId);
  if (capability) return res.json(capability);

  const currentPairings = loadPairings();
  const pairing = currentPairings[bridgeId];
  if (!pairing) return res.status(404).json({ error: 'Accessory not found' });
  if (!isHomeKitPairing(pairing)) {
    return res.status(400).json({ error: 'Capabilities query currently supports HomeKit pairings only' });
  }

  try {
    const client = new HttpClient(bridgeId, pairing.address, pairing.port, pairing.longTermData);
    const accessories = await client.getAccessories();
    cacheAccessoryMetadata({
      deviceId: bridgeId,
      pairingName: pairing.name,
      accessories,
    });

    const refreshed = getAccessoryCapabilities(accessoryId);
    if (!refreshed) return res.status(404).json({ error: 'Accessory metadata unavailable' });
    return res.json(refreshed);
  } catch (err) {
    console.error('[api] /api/accessories/:accessoryId/capabilities error:', err.message ?? err.stack ?? err);
    return res.status(500).json({ error: 'Could not query accessory capabilities' });
  }
});

app.get('/api/setup/pairings', (_req, res) => {
  const currentPairings = loadPairings();
  const list = Object.entries(currentPairings).map(([id, p]) => ({
    id,
    protocol: p.protocol ?? 'homekit',
    name: p.name,
    address: p.address,
    port: p.port,
    category: p.category,
    pairedAt: p.pairedAt,
  }));
  res.json(list);
});

app.delete('/api/setup/pairing/:deviceId', async (req, res) => {
  const { deviceId } = req.params;
  const currentPairings = loadPairings();

  if (!currentPairings[deviceId]) {
    return res.status(404).json({ error: 'Pairing not found' });
  }
  if (!isHomeKitPairing(currentPairings[deviceId])) {
    return res.status(400).json({ error: 'Use /api/setup/matter/pairing/:nodeId for Matter pairings' });
  }

  const name = currentPairings[deviceId].name;
  stopSubscriber(deviceId);
  delete currentPairings[deviceId];
  await savePairings(currentPairings);

  const cached = discoveryCache.find((s) => s.id === deviceId);
  if (cached) { cached.paired = false; cached.alreadyPaired = false; }

  console.log(`[setup] Removed pairing for ${name} (${deviceId})`);
  res.json({ success: true, name });
});

app.patch('/api/setup/room', async (req, res) => {
  const { accessoryId, roomName } = req.body ?? {};
  if (!accessoryId) return res.status(400).json({ error: 'accessoryId is required' });

  const rooms = loadRooms();
  if (roomName && roomName.trim()) {
    rooms[accessoryId] = roomName.trim();
  } else {
    delete rooms[accessoryId];
  }
  await saveRooms(rooms);
  console.log(`[setup] Room for ${accessoryId} set to ${roomName?.trim() || '(cleared)'}`);
  res.json({ success: true });
});

app.get('/api/setup/rooms', (_req, res) => {
  res.json(loadRooms());
});

app.get('/api/setup/retention', (_req, res) => {
  res.json({
    retentionDays: retentionSettings.retentionDays,
    archiveBeforeDelete: retentionSettings.archiveBeforeDelete,
    staleThresholdHours: retentionSettings.staleThresholdHours,
    sweepMs: RETENTION_SWEEP_MS,
  });
});

app.patch('/api/setup/retention', async (req, res) => {
  const body = req.body ?? {};
  const updates = {};

  if (body.retentionDays !== undefined) {
    const nextDays = Number.parseInt(String(body.retentionDays ?? ''), 10);
    if (!Number.isFinite(nextDays) || nextDays < 1 || nextDays > 3650) {
      return res.status(400).json({ error: 'retentionDays must be an integer between 1 and 3650.' });
    }
    updates.retentionDays = nextDays;
  }

  if (body.staleThresholdHours !== undefined) {
    const nextHours = Number.parseInt(String(body.staleThresholdHours ?? ''), 10);
    if (!Number.isFinite(nextHours) || nextHours < 1 || nextHours > 720) {
      return res.status(400).json({ error: 'staleThresholdHours must be an integer between 1 and 720.' });
    }
    updates.staleThresholdHours = nextHours;
  }

  if (!Object.keys(updates).length) {
    return res.status(400).json({ error: 'No supported settings provided.' });
  }

  const nextSettings = { ...retentionSettings, ...updates };
  await saveRetentionSettings(nextSettings);
  retentionSettings = loadRetentionSettings();
  console.log(
    `[setup] Settings updated: retention=${retentionSettings.retentionDays}d stale=${retentionSettings.staleThresholdHours}h`
  );

  res.json({
    retentionDays: retentionSettings.retentionDays,
    archiveBeforeDelete: retentionSettings.archiveBeforeDelete,
    staleThresholdHours: retentionSettings.staleThresholdHours,
    sweepMs: RETENTION_SWEEP_MS,
  });
});

// Data management
app.delete('/api/data/accessory', async (req, res) => {
  const { accessoryId } = req.body ?? {};
  if (!accessoryId) return res.status(400).json({ error: 'accessoryId is required' });
  try {
    const result = await pool.query(
      'DELETE FROM event_logs WHERE accessory_id = $1', [accessoryId]
    );
    const rooms = loadRooms();
    delete rooms[accessoryId];
    await saveRooms(rooms);
    console.log(`[data] Deleted ${result.rowCount} event(s) for accessory ${accessoryId}`);
    res.json({ success: true, deleted: result.rowCount });
  } catch (err) {
    console.error('[data] /api/data/accessory error:', err.message ?? err.stack ?? err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

app.delete('/api/data/all', async (_req, res) => {
  try {
    const result = await pool.query('DELETE FROM event_logs');
    await saveRooms({});
    console.log(`[data] Wiped all data — ${result.rowCount} event(s) deleted`);
    res.json({ success: true, deleted: result.rowCount });
  } catch (err) {
    console.error('[data] /api/data/all error:', err.message ?? err.stack ?? err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Event API routes
app.use('/api', createEventsRouter({
  pool,
  getRooms: loadRooms,
}));
if (ALERTS_ENABLED) {
  app.use('/api/alerts', createAlertsRouter({ pool }));
}
app.use('/api', createMatterRouter({
  insertEvent,
  loadPairings,
  savePairings,
  loadRooms,
  saveRooms,
  matterRuntime,
}));

// Stats routes
app.get('/api/accessories', async (_req, res) => {
  try {
    const result = await pool.query(`
      WITH latest AS (
        SELECT DISTINCT ON (accessory_id)
          accessory_id,
          accessory_name,
          room_name,
          service_type,
          protocol,
          timestamp AS last_seen
        FROM event_logs
        ORDER BY accessory_id, timestamp DESC, id DESC
      ),
      counts AS (
        SELECT accessory_id, COUNT(*)::int AS event_count
        FROM event_logs
        GROUP BY accessory_id
      )
      SELECT
        latest.accessory_id,
        latest.accessory_name,
        latest.room_name,
        latest.service_type,
        latest.protocol,
        latest.last_seen,
        counts.event_count
      FROM latest
      JOIN counts USING (accessory_id)
      ORDER BY latest.last_seen DESC
    `);
    const heartbeatResult = await pool.query(`
      WITH recent AS (
        SELECT accessory_id, timestamp
        FROM (
          SELECT
            accessory_id,
            timestamp,
            ROW_NUMBER() OVER (
              PARTITION BY accessory_id
              ORDER BY timestamp DESC, id DESC
            ) AS row_num
          FROM event_logs
          WHERE timestamp >= NOW() - INTERVAL '30 days'
        ) ranked
        WHERE row_num <= 200
      ),
      deltas AS (
        SELECT
          accessory_id,
          EXTRACT(EPOCH FROM (
            timestamp - LAG(timestamp) OVER (
              PARTITION BY accessory_id
              ORDER BY timestamp ASC
            )
          ))::float AS gap_seconds
        FROM recent
      )
      SELECT
        accessory_id,
        PERCENTILE_CONT(0.5) WITHIN GROUP (ORDER BY gap_seconds) AS heartbeat_seconds,
        COUNT(*) FILTER (WHERE gap_seconds IS NOT NULL)::int AS heartbeat_samples
      FROM deltas
      WHERE gap_seconds IS NOT NULL AND gap_seconds > 0
      GROUP BY accessory_id
    `);

    const rooms = loadRooms();
    const currentPairings = loadPairings();
    const now = Date.now();
    const heartbeatById = Object.fromEntries(
      heartbeatResult.rows.map((row) => [row.accessory_id, row])
    );

    const dbRows = result.rows.map((r) => {
      const protocol = String(r.protocol ?? 'homekit').toLowerCase();
      const bridgeId = protocol === 'homekit' ? parentBridgeId(r.accessory_id) : r.accessory_id;
      const matterNodeId = protocol === 'matter'
        ? String(r.accessory_id).split(':')[0]
        : null;
      const bridgePairing = currentPairings[bridgeId]
        ?? currentPairings[r.accessory_id]
        ?? (matterNodeId ? currentPairings[matterNodeId] : null);
      const heartbeat = heartbeatById[r.accessory_id] ?? {};
      const identity = getAccessoryIdentity(r.accessory_id)
        ?? getAccessoryIdentity(bridgeId);
      const reliability = getSubscriberStats(bridgeId);
      const health = deriveDeviceHealth({
        lastSeen: r.last_seen,
        pairedAt: bridgePairing?.pairedAt ?? null,
        heartbeatSeconds: heartbeat.heartbeat_seconds ?? null,
        heartbeatSamples: heartbeat.heartbeat_samples ?? 0,
        staleThresholdSeconds: retentionSettings.staleThresholdHours * 60 * 60,
        now,
      });
      return {
        ...r,
        protocol,
        room_name: rooms[r.accessory_id] ?? r.room_name,
        address: bridgePairing?.address ?? null,
        paired_at: bridgePairing?.pairedAt ?? null,
        manufacturer: identity?.manufacturer ?? null,
        model: identity?.model ?? null,
        serial_number: identity?.serial_number ?? null,
        firmware_revision: identity?.firmware_revision ?? null,
        hardware_revision: identity?.hardware_revision ?? null,
        metadata_updated_at: identity?.metadata_updated_at ?? null,
        reliability: reliability ? {
          connect_attempts: reliability.connectAttempts,
          reconnect_attempts: reliability.reconnectAttempts,
          reconnect_schedules: reliability.reconnectSchedules,
          disconnects: reliability.disconnects,
          resubscribe_successes: reliability.resubscribeSuccesses,
          resubscribe_failures: reliability.resubscribeFailures,
          subscribe_failures: reliability.subscribeFailures,
          accessories_query_failures: reliability.accessoriesQueryFailures,
          last_connected_at: reliability.lastConnectedAt,
          last_subscribed_at: reliability.lastSubscribedAt,
          last_error: reliability.lastError,
          last_error_at: reliability.lastErrorAt,
        } : null,
        health,
      };
    });

    const seenIds = new Set(dbRows.map((r) => r.accessory_id));

    const neverSeen = Object.entries(currentPairings)
      .filter(([id]) => !seenIds.has(id))
      .map(([id, p]) => {
        const identity = getAccessoryIdentity(id);
        const reliability = getSubscriberStats(id);
        return {
          accessory_id: id,
          accessory_name: p.name,
          protocol: p.protocol ?? 'homekit',
          room_name: rooms[id] ?? null,
          service_type: null,
          category: p.category ?? null,
          last_seen: null,
          event_count: 0,
          address: p.address ?? null,
          paired_at: p.pairedAt ?? null,
          manufacturer: identity?.manufacturer ?? null,
          model: identity?.model ?? null,
          serial_number: identity?.serial_number ?? null,
          firmware_revision: identity?.firmware_revision ?? null,
          hardware_revision: identity?.hardware_revision ?? null,
          metadata_updated_at: identity?.metadata_updated_at ?? null,
          reliability: reliability ? {
            connect_attempts: reliability.connectAttempts,
            reconnect_attempts: reliability.reconnectAttempts,
            reconnect_schedules: reliability.reconnectSchedules,
            disconnects: reliability.disconnects,
            resubscribe_successes: reliability.resubscribeSuccesses,
            resubscribe_failures: reliability.resubscribeFailures,
            subscribe_failures: reliability.subscribeFailures,
            accessories_query_failures: reliability.accessoriesQueryFailures,
            last_connected_at: reliability.lastConnectedAt,
            last_subscribed_at: reliability.lastSubscribedAt,
            last_error: reliability.lastError,
            last_error_at: reliability.lastErrorAt,
          } : null,
          health: deriveDeviceHealth({
            lastSeen: null,
            pairedAt: p.pairedAt ?? null,
            staleThresholdSeconds: retentionSettings.staleThresholdHours * 60 * 60,
            now,
          }),
        };
      });

    res.json([...dbRows, ...neverSeen]);
  } catch (err) {
    console.error('[api] /api/accessories error:', err.message ?? err.stack ?? err);
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
  } catch {
    res.status(500).json({ error: 'Internal server error' });
  }
});

app.get('/api/stats/daily', async (req, res) => {
  const days = parseIntInRange(req.query.days, 30, 7, 365);
  try {
    const result = await pool.query(`
      SELECT DATE(timestamp AT TIME ZONE 'UTC') AS day, COUNT(*) AS count
      FROM event_logs WHERE timestamp >= NOW() - ($1::int * INTERVAL '1 day')
      GROUP BY day ORDER BY day
    `, [days]);
    res.json(result.rows);
  } catch (err) {
    console.error('[api] /api/stats/daily error:', err.message ?? err.stack ?? err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

app.get('/api/stats/top-devices', async (_req, res) => {
  try {
    const result = await pool.query(`
      SELECT
        counts.accessory_name,
        counts.event_count,
        latest.accessory_id,
        latest.room_name,
        latest.service_type
      FROM (
        SELECT accessory_name, COUNT(*)::int AS event_count
        FROM event_logs
        WHERE timestamp >= NOW() - INTERVAL '7 days'
        GROUP BY accessory_name
        ORDER BY event_count DESC
        LIMIT 10
      ) counts
      JOIN LATERAL (
        SELECT accessory_id, room_name, service_type
        FROM event_logs
        WHERE accessory_name = counts.accessory_name
        ORDER BY timestamp DESC, id DESC
        LIMIT 1
      ) latest ON true
      ORDER BY counts.event_count DESC
    `);
    const rooms = loadRooms();
    const rows = result.rows.map((r) => ({
      ...r,
      room_name: rooms[r.accessory_id] ?? rooms[parentBridgeId(r.accessory_id)] ?? r.room_name,
    }));
    res.json(rows);
  } catch (err) {
    console.error('[api] /api/stats/top-devices error:', err.message ?? err.stack ?? err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

app.get('/api/stats/rooms', async (req, res) => {
  const days = parseIntInRange(req.query.days, 7, 1, 90);
  try {
    const result = await pool.query(`
      SELECT accessory_id, room_name, COUNT(*)::int AS count
      FROM event_logs
      WHERE timestamp >= NOW() - ($1::int * INTERVAL '1 day')
      GROUP BY accessory_id, room_name
    `, [days]);
    const rooms = loadRooms();
    const totals = {};
    for (const row of result.rows) {
      const name = rooms[row.accessory_id]
        ?? rooms[parentBridgeId(row.accessory_id)]
        ?? row.room_name;
      if (!name) continue;
      totals[name] = (totals[name] ?? 0) + row.count;
    }
    const sorted = Object.entries(totals)
      .map(([room_name, count]) => ({ room_name, count }))
      .sort((a, b) => b.count - a.count);
    res.json(sorted);
  } catch (err) {
    console.error('[api] /api/stats/rooms error:', err.message ?? err.stack ?? err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

app.get('/api/stats/weekday', async (req, res) => {
  const days = parseIntInRange(req.query.days, 90, 7, 365);
  try {
    const result = await pool.query(`
      SELECT
        EXTRACT(DOW  FROM timestamp AT TIME ZONE 'UTC')::int AS day_of_week,
        EXTRACT(HOUR FROM timestamp AT TIME ZONE 'UTC')::int AS hour,
        COUNT(*)::int AS count
      FROM event_logs
      WHERE timestamp >= NOW() - ($1::int * INTERVAL '1 day')
      GROUP BY day_of_week, hour
      ORDER BY day_of_week, hour
    `, [days]);
    res.json(result.rows);
  } catch (err) {
    console.error('[api] /api/stats/weekday error:', err.message ?? err.stack ?? err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

app.get('/api/stats/heatmap', async (_req, res) => {
  try {
    const result = await pool.query(`
      SELECT accessory_name,
             EXTRACT(HOUR FROM timestamp AT TIME ZONE 'UTC')::int AS hour,
             COUNT(*)::int AS count
      FROM event_logs
      WHERE timestamp >= NOW() - INTERVAL '7 days'
      GROUP BY accessory_name, hour
      ORDER BY accessory_name, hour
    `);
    res.json(result.rows);
  } catch (err) {
    console.error('[api] /api/stats/heatmap error:', err.message ?? err.stack ?? err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

app.get('/api/stats/device-patterns', async (_req, res) => {
  try {
    const result = await pool.query(`
      SELECT accessory_name,
             EXTRACT(HOUR FROM timestamp AT TIME ZONE 'UTC')::int AS hour,
             COUNT(*)::int AS total_count
      FROM event_logs
      WHERE timestamp >= NOW() - INTERVAL '30 days'
      GROUP BY accessory_name, hour
      ORDER BY accessory_name, hour
    `);
    res.json(result.rows);
  } catch (err) {
    console.error('[api] /api/stats/device-patterns error:', err.message ?? err.stack ?? err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

app.get('/api/stats/anomalies', async (_req, res) => {
  try {
    const [deviceRows, roomRows] = await Promise.all([
      pool.query(`
        WITH scope_set AS (
          SELECT DISTINCT accessory_name AS scope_name
          FROM event_logs
          WHERE timestamp >= NOW() - INTERVAL '31 days'
            AND accessory_name IS NOT NULL
            AND accessory_name <> ''
        ),
        hours AS (
          SELECT generate_series(0, 23)::int AS hour
        ),
        history AS (
          SELECT
            accessory_name AS scope_name,
            EXTRACT(HOUR FROM timestamp AT TIME ZONE 'UTC')::int AS hour,
            DATE(timestamp AT TIME ZONE 'UTC') AS day_key,
            COUNT(*)::int AS count
          FROM event_logs
          WHERE timestamp >= NOW() - INTERVAL '31 days'
            AND timestamp < NOW() - INTERVAL '1 day'
            AND accessory_name IS NOT NULL
            AND accessory_name <> ''
          GROUP BY 1, 2, 3
        ),
        baseline AS (
          SELECT
            scopes.scope_name,
            hours.hour,
            COALESCE(AVG(history.count), 0)::float8 AS baseline_avg,
            COALESCE(STDDEV_SAMP(history.count), 0)::float8 AS baseline_std,
            COUNT(history.day_key)::int AS baseline_days
          FROM scope_set scopes
          CROSS JOIN hours
          LEFT JOIN history
            ON history.scope_name = scopes.scope_name
           AND history.hour = hours.hour
          GROUP BY scopes.scope_name, hours.hour
        ),
        current_window AS (
          SELECT
            accessory_name AS scope_name,
            EXTRACT(HOUR FROM timestamp AT TIME ZONE 'UTC')::int AS hour,
            COUNT(*)::int AS event_count
          FROM event_logs
          WHERE timestamp >= NOW() - INTERVAL '1 day'
            AND accessory_name IS NOT NULL
            AND accessory_name <> ''
          GROUP BY 1, 2
        )
        SELECT
          baseline.scope_name,
          baseline.hour,
          baseline.baseline_avg,
          baseline.baseline_std,
          baseline.baseline_days,
          COALESCE(current_window.event_count, 0)::int AS event_count
        FROM baseline
        LEFT JOIN current_window
          ON current_window.scope_name = baseline.scope_name
         AND current_window.hour = baseline.hour
        WHERE baseline.baseline_days > 0
      `),
      pool.query(`
        WITH scope_set AS (
          SELECT DISTINCT COALESCE(room_name, 'Unassigned') AS scope_name
          FROM event_logs
          WHERE timestamp >= NOW() - INTERVAL '31 days'
        ),
        hours AS (
          SELECT generate_series(0, 23)::int AS hour
        ),
        history AS (
          SELECT
            COALESCE(room_name, 'Unassigned') AS scope_name,
            EXTRACT(HOUR FROM timestamp AT TIME ZONE 'UTC')::int AS hour,
            DATE(timestamp AT TIME ZONE 'UTC') AS day_key,
            COUNT(*)::int AS count
          FROM event_logs
          WHERE timestamp >= NOW() - INTERVAL '31 days'
            AND timestamp < NOW() - INTERVAL '1 day'
          GROUP BY 1, 2, 3
        ),
        baseline AS (
          SELECT
            scopes.scope_name,
            hours.hour,
            COALESCE(AVG(history.count), 0)::float8 AS baseline_avg,
            COALESCE(STDDEV_SAMP(history.count), 0)::float8 AS baseline_std,
            COUNT(history.day_key)::int AS baseline_days
          FROM scope_set scopes
          CROSS JOIN hours
          LEFT JOIN history
            ON history.scope_name = scopes.scope_name
           AND history.hour = hours.hour
          GROUP BY scopes.scope_name, hours.hour
        ),
        current_window AS (
          SELECT
            COALESCE(room_name, 'Unassigned') AS scope_name,
            EXTRACT(HOUR FROM timestamp AT TIME ZONE 'UTC')::int AS hour,
            COUNT(*)::int AS event_count
          FROM event_logs
          WHERE timestamp >= NOW() - INTERVAL '1 day'
          GROUP BY 1, 2
        )
        SELECT
          baseline.scope_name,
          baseline.hour,
          baseline.baseline_avg,
          baseline.baseline_std,
          baseline.baseline_days,
          COALESCE(current_window.event_count, 0)::int AS event_count
        FROM baseline
        LEFT JOIN current_window
          ON current_window.scope_name = baseline.scope_name
         AND current_window.hour = baseline.hour
        WHERE baseline.baseline_days > 0
      `),
    ]);

    const deviceOutliers = detectOutliers(deviceRows.rows, 'device').slice(0, 50);
    const roomOutliers = detectOutliers(roomRows.rows, 'room').slice(0, 50);

    res.json({
      generatedAt: new Date().toISOString(),
      outlierCount: deviceOutliers.length + roomOutliers.length,
      devices: deviceOutliers,
      rooms: roomOutliers,
    });
  } catch (err) {
    console.error('[api] /api/stats/anomalies error:', err.message ?? err.stack ?? err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

app.get('/api/health', (_req, res) => {
  const runtimeStatus = matterRuntime?.getStatus?.() ?? null;
  res.json({
    status: 'ok',
    paired: Object.keys(loadPairings()).length,
    alertsEnabled: ALERTS_ENABLED,
    matter: runtimeStatus ? {
      commissionConfigured: runtimeStatus.commissionConfigured,
      pollingConfigured: runtimeStatus.pollingConfigured,
      activeNodes: runtimeStatus.nodes?.length ?? 0,
    } : null,
  });
});

app.listen(PORT, () => {
  console.log(`[api] Listening on port ${PORT}`);
  if (API_TOKEN) {
    console.log('[api] Write auth enabled for POST/PATCH/DELETE routes');
  }
  if (!ALERTS_ENABLED) {
    console.log('[api] Alerts feature disabled (ALERTS_ENABLED=false)');
  }
});
