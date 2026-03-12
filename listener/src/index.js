/**
 * index.js — entry point.
 *
 * 1. Loads cached pairing/room metadata and starts HomeKit subscribers.
 * 2. Starts an Express REST API for the web frontend.
 */

import { networkInterfaces } from 'os';
import express from 'express';
import cors from 'cors';
import rateLimit from 'express-rate-limit';
import { IPDiscovery, HttpClient } from 'hap-controller';
import { insertEvent, pool, migrateDb, runRetentionSweep } from './db.js';
import { startSubscribers, stopSubscriber, getSubscriberStats } from './subscriber.js';
import { JsonObjectStore } from './store.js';
import { createEventsRouter, parentBridgeId, parseIntInRange } from './events-router.js';
import { createAlertsRouter } from './alerts-router.js';
import { createMatterRouter } from './matter-router.js';
import { createMatterRuntime } from './matter-runtime.js';
import { initController as initMatterController } from './matter-controller.js';
import { deriveDeviceHealth } from './device-health.js';
import { detectOutliers } from './anomaly-detection.js';
import { log, getLevel, setLevel } from './logger.js';
import { secureTokenEquals } from './security.js';
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
const API_TOKEN_READS_ENABLED = /^(1|true|yes|on)$/i.test(process.env.API_TOKEN_READS_ENABLED ?? 'false');
const API_JSON_LIMIT = (process.env.API_JSON_LIMIT ?? '256kb').trim() || '256kb';
const CORS_ALLOWED_ORIGINS = (process.env.CORS_ALLOWED_ORIGINS ?? '')
  .split(',')
  .map((origin) => origin.trim())
  .filter(Boolean);
const CORS_ALLOW_LOCALHOST = /^(1|true|yes|on)$/i.test(process.env.CORS_ALLOW_LOCALHOST ?? 'true');
const ALERTS_ENABLED = !/^(0|false|no|off)$/i.test(process.env.ALERTS_ENABLED ?? 'false');
const DISCOVERY_SCAN_ENABLED = !/^(0|false|no|off)$/i.test(process.env.DISCOVERY_SCAN_ENABLED ?? 'true');
const IS_PRODUCTION = String(process.env.NODE_ENV ?? 'production').trim().toLowerCase() === 'production';

const RETENTION_SWEEP_MS = Number.parseInt(process.env.RETENTION_SWEEP_MS ?? `${24 * 60 * 60 * 1000}`, 10);
const RETENTION_DAYS_DEFAULT = Number.parseInt(process.env.RETENTION_DAYS ?? '365', 10);
const RETENTION_ARCHIVE_DEFAULT = /^(1|true|yes|on)$/i.test(process.env.RETENTION_ARCHIVE ?? 'true');
const STALE_THRESHOLD_HOURS_DEFAULT = Number.parseInt(process.env.STALE_THRESHOLD_HOURS ?? '12', 10);
const API_WRITE_RATE_LIMIT_WINDOW_MS = Number.parseInt(process.env.API_WRITE_RATE_LIMIT_WINDOW_MS ?? '60000', 10);
const API_WRITE_RATE_LIMIT_MAX = Number.parseInt(process.env.API_WRITE_RATE_LIMIT_MAX ?? '60', 10);
const API_STATS_RATE_LIMIT_WINDOW_MS = Number.parseInt(process.env.API_STATS_RATE_LIMIT_WINDOW_MS ?? '60000', 10);
const API_STATS_RATE_LIMIT_MAX = Number.parseInt(process.env.API_STATS_RATE_LIMIT_MAX ?? '120', 10);

if (IS_PRODUCTION && !API_TOKEN) {
  log.error('[api] API_TOKEN is required when NODE_ENV=production');
  process.exit(1);
}

const pairingsStore = new JsonObjectStore(PAIRINGS_FILE, {});
const roomsStore = new JsonObjectStore(ROOMS_FILE, {});
const retentionStore = new JsonObjectStore(RETENTION_FILE, {
  retentionDays: RETENTION_DAYS_DEFAULT,
  archiveBeforeDelete: RETENTION_ARCHIVE_DEFAULT,
  staleThresholdHours: STALE_THRESHOLD_HOURS_DEFAULT,
  autoScanHomeKit: DISCOVERY_SCAN_ENABLED,
});
let matterRuntime = null;

function normalizeMatterNodeId(value) {
  if (value === undefined || value === null) return null;
  const text = String(value).trim();
  if (!text) return null;
  try {
    return BigInt(text).toString();
  } catch {
    return text.toUpperCase();
  }
}

function normalizePairingRecord(id, pairing = {}) {
  const protocol = String(pairing?.protocol ?? 'homekit').toLowerCase() === 'matter'
    ? 'matter'
    : 'homekit';
  if (protocol === 'matter') {
    const nodeId = normalizeMatterNodeId(pairing?.nodeId ?? id) ?? String(id);
    return {
      ...pairing,
      protocol: 'matter',
      nodeId,
      name: pairing?.name ?? nodeId,
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
    const normalized = normalizePairingRecord(id, pairing);
    const key = normalized.protocol === 'matter' ? normalized.nodeId : id;
    output[key] = normalized;
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
  const autoScanHomeKit = input.autoScanHomeKit === undefined
    ? DISCOVERY_SCAN_ENABLED
    : Boolean(input.autoScanHomeKit);
  return { retentionDays, archiveBeforeDelete, staleThresholdHours, autoScanHomeKit };
}

function isLoopbackHostname(hostname) {
  const normalized = String(hostname ?? '').toLowerCase();
  return normalized === 'localhost'
    || normalized === '127.0.0.1'
    || normalized === '::1'
    || normalized.endsWith('.localhost');
}

function isAllowedCorsOrigin(origin) {
  if (!origin) return true;
  if (CORS_ALLOWED_ORIGINS.length > 0) return CORS_ALLOWED_ORIGINS.includes(origin);
  if (!CORS_ALLOW_LOCALHOST) return false;
  try {
    const parsed = new URL(origin);
    return isLoopbackHostname(parsed.hostname);
  } catch {
    return false;
  }
}

function normalizeRateLimitValue(value, fallback, min, max) {
  if (!Number.isFinite(value)) return fallback;
  return Math.min(max, Math.max(min, Math.trunc(value)));
}

function extractBearerToken(headerValue) {
  const auth = String(headerValue ?? '').trim();
  if (!auth) return '';
  const spaceIndex = auth.indexOf(' ');
  if (spaceIndex <= 0) return '';
  const scheme = auth.slice(0, spaceIndex).toLowerCase();
  if (scheme !== 'bearer') return '';
  return auth.slice(spaceIndex + 1).trim();
}

function rateLimitKeyGenerator(req) {
  const forwardedFor = req?.headers?.['x-forwarded-for'];
  if (typeof forwardedFor === 'string' && forwardedFor.trim()) {
    return forwardedFor.split(',')[0].trim();
  }
  return req?.ip ?? req?.socket?.remoteAddress ?? 'unknown';
}

function mapReliabilityStats(reliability) {
  if (!reliability) return null;
  return {
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
  };
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
  log.warn(
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
await initMatterController();
matterRuntime = createMatterRuntime({
  insertEvent,
  loadRooms,
});

let retentionSettings = loadRetentionSettings();

if (Number.isFinite(STORE_REFRESH_INTERVAL_MS) && STORE_REFRESH_INTERVAL_MS >= 5_000) {
  setInterval(() => {
    void pairingsStore.refresh().catch((err) => {
      log.warn('[store] pairings refresh failed:', err.message ?? err.stack ?? err);
    });
    if (matterRuntime) {
      try {
        matterRuntime.syncPairings(loadPairings());
      } catch (err) {
        log.warn('[matter] pairing sync failed:', err.message ?? err.stack ?? err);
      }
    }
    void roomsStore.refresh().catch((err) => {
      log.warn('[store] rooms refresh failed:', err.message ?? err.stack ?? err);
    });
    void retentionStore.refresh()
      .then(() => { retentionSettings = loadRetentionSettings(); })
      .catch((err) => {
        log.warn('[store] retention refresh failed:', err.message ?? err.stack ?? err);
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
  log.info(`[init] Loaded ${pairedCount} pairing(s) from ${PAIRINGS_FILE}`);
  startSubscribers(homeKitPairings, loadRooms(), (id) => {
    const pairing = pairingsStore.getByKey(id);
    if (!pairing || !isHomeKitPairing(pairing)) return null;
    return normalizePairingRecord(id, pairing);
  });
} else {
  log.warn('[init] No pairings found — use the Setup tab in the web UI to discover and pair accessories.');
}

// ---------------------------------------------------------------------------
// 2. Background discovery scan (refreshes every hour, populates cache)
// ---------------------------------------------------------------------------

let discoveryCache = []; // last scan results

function runDiscoveryScan() {
  if (!DISCOVERY_SCAN_ENABLED) {
    return Promise.resolve(discoveryCache);
  }

  return new Promise((resolve, reject) => {
    const found = new Map();
    let discovery;
    let settled = false;

    function fail(err) {
      if (settled) return;
      settled = true;
      try { discovery?.stop?.(); } catch { /* ignore */ }
      reject(err instanceof Error ? err : new Error(String(err)));
    }

    function succeed(value) {
      if (settled) return;
      settled = true;
      resolve(value);
    }

    try {
      discovery = new IPDiscovery(DISCOVER_IFACE);
    } catch (err) {
      return reject(err);
    }

    discovery.on('serviceUp', (service) => {
      if (!found.has(service.id)) found.set(service.id, service);
    });
    discovery.on('error', (err) => {
      fail(err);
    });

    try {
      discovery.start();
    } catch (err) {
      return fail(err);
    }

    setTimeout(() => {
      void (async () => {
        if (settled) return;
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
          log.info(`[discovery] Scan complete — found ${discoveryCache.length} accessory/accessories`);

          let pairingsUpdated = false;
          for (const [id, pairing] of Object.entries(currentPairings)) {
            const seen = found.get(id);
            if (!seen) continue;
            if (seen.address !== pairing.address || seen.port !== pairing.port) {
              log.debug(
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

          succeed(discoveryCache);
        } catch (err) {
          fail(err);
        }
      })();
    }, 10_000);
  });
}

function safeDiscoveryScan() {
  return runDiscoveryScan().catch((err) => {
    log.warn(`[discovery] Scan skipped: ${err.message}`);
    return [];
  });
}

function isAutoDiscoveryEnabled() {
  return DISCOVERY_SCAN_ENABLED && retentionSettings.autoScanHomeKit;
}

function runScheduledDiscoveryScan() {
  if (!isAutoDiscoveryEnabled()) return Promise.resolve(discoveryCache);
  return safeDiscoveryScan();
}

if (DISCOVERY_SCAN_ENABLED) {
  void runScheduledDiscoveryScan();
  setInterval(() => {
    void runScheduledDiscoveryScan();
  }, RESCAN_INTERVAL_MS);
} else {
  log.info('[discovery] Disabled via DISCOVERY_SCAN_ENABLED=false');
}

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
      log.info(
        `[retention] cutoff=${result.cutoffDays}d archived=${result.archived} deleted=${result.deleted}`
      );
    }
  } catch (err) {
    log.error('[retention] sweep failed:', err.message ?? err.stack ?? err);
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
app.disable('x-powered-by');
const apiWriteLimiter = rateLimit({
  windowMs: normalizeRateLimitValue(API_WRITE_RATE_LIMIT_WINDOW_MS, 60_000, 1_000, 24 * 60 * 60 * 1000),
  max: normalizeRateLimitValue(API_WRITE_RATE_LIMIT_MAX, 60, 1, 100_000),
  standardHeaders: true,
  legacyHeaders: false,
  validate: false,
  keyGenerator: rateLimitKeyGenerator,
  message: { error: 'Too many requests' },
});
const apiStatsReadLimiter = rateLimit({
  windowMs: normalizeRateLimitValue(API_STATS_RATE_LIMIT_WINDOW_MS, 60_000, 1_000, 24 * 60 * 60 * 1000),
  max: normalizeRateLimitValue(API_STATS_RATE_LIMIT_MAX, 120, 1, 100_000),
  standardHeaders: true,
  legacyHeaders: false,
  validate: false,
  keyGenerator: rateLimitKeyGenerator,
  message: { error: 'Too many requests' },
});
app.use(cors({
  origin(origin, callback) {
    callback(null, isAllowedCorsOrigin(origin));
  },
  methods: ['GET', 'HEAD', 'OPTIONS', 'POST', 'PATCH', 'DELETE'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-API-Token'],
  maxAge: 600,
}));
app.use(express.json({ limit: API_JSON_LIMIT }));
app.use((req, res, next) => {
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'DENY');
  res.setHeader('Referrer-Policy', 'no-referrer');
  next();
});
app.use((req, res, next) => {
  if (!API_TOKEN) return next();
  if (req.method === 'OPTIONS') return next();

  const isReadMethod = req.method === 'GET' || req.method === 'HEAD';
  if (isReadMethod && !API_TOKEN_READS_ENABLED) return next();

  const providedToken = String(
    req.get('x-api-token') ?? extractBearerToken(req.get('authorization'))
  ).trim();

  if (secureTokenEquals(API_TOKEN, providedToken)) return next();
  res.setHeader('WWW-Authenticate', 'Bearer realm="homechronicle-api"');
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
    log.info('[setup] Manual scan triggered from UI');
    const results = await runDiscoveryScan();
    res.json({ accessories: results, cachedAt: new Date().toISOString() });
  } catch (err) {
    log.error('[setup] Scan error:', err.message ?? err.stack ?? err);
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

  log.info(`[setup] Pairing ${cached.name} (${deviceId})`);

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

    log.info(`[setup] Paired successfully: ${cached.name}`);
    res.json({ success: true, name: cached.name });
  } catch (err) {
    log.error(`[setup] Pairing failed for ${deviceId}:`, err.message ?? err.stack ?? err);
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
    log.debug(`[setup] bridge-children: ${pairing.name} -> ${children.length} child(ren)`);
    res.json(children);
  } catch (err) {
    log.error(`[setup] bridge-children error for ${deviceId}:`, err.message ?? err.stack ?? err);
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
    log.error('[api] /api/accessories/:accessoryId/capabilities error:', err.message ?? err.stack ?? err);
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

  log.info(`[setup] Removed pairing for ${name} (${deviceId})`);
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
  log.info(`[setup] Room for ${accessoryId} set to ${roomName?.trim() || '(cleared)'}`);
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
    autoScanHomeKit: retentionSettings.autoScanHomeKit,
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

  if (body.autoScanHomeKit !== undefined) {
    if (typeof body.autoScanHomeKit !== 'boolean') {
      return res.status(400).json({ error: 'autoScanHomeKit must be a boolean.' });
    }
    updates.autoScanHomeKit = body.autoScanHomeKit;
  }

  if (body.archiveBeforeDelete !== undefined) {
    if (typeof body.archiveBeforeDelete !== 'boolean') {
      return res.status(400).json({ error: 'archiveBeforeDelete must be a boolean.' });
    }
    updates.archiveBeforeDelete = body.archiveBeforeDelete;
  }

  if (!Object.keys(updates).length) {
    return res.status(400).json({ error: 'No supported settings provided.' });
  }

  const nextSettings = { ...retentionSettings, ...updates };
  await saveRetentionSettings(nextSettings);
  retentionSettings = loadRetentionSettings();
  log.info(
    `[setup] Settings updated: retention=${retentionSettings.retentionDays}d stale=${retentionSettings.staleThresholdHours}h autoScanHomeKit=${retentionSettings.autoScanHomeKit}`
  );

  res.json({
    retentionDays: retentionSettings.retentionDays,
    archiveBeforeDelete: retentionSettings.archiveBeforeDelete,
    staleThresholdHours: retentionSettings.staleThresholdHours,
    autoScanHomeKit: retentionSettings.autoScanHomeKit,
    sweepMs: RETENTION_SWEEP_MS,
  });
});

// Log level (runtime, no restart needed)
app.get('/api/setup/log-level', (_req, res) => {
  res.json({ level: getLevel() });
});

app.patch('/api/setup/log-level', (req, res) => {
  const { level } = req.body ?? {};
  try {
    setLevel(level);
    log.info(`[setup] Log level set to: ${getLevel()}`);
    res.json({ level: getLevel() });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// Data management
app.delete('/api/data/accessory', apiWriteLimiter, async (req, res) => {
  const { accessoryId } = req.body ?? {};
  if (!accessoryId) return res.status(400).json({ error: 'accessoryId is required' });
  try {
    const result = await pool.query(
      'DELETE FROM event_logs WHERE accessory_id = $1', [accessoryId]
    );
    const rooms = loadRooms();
    delete rooms[accessoryId];
    await saveRooms(rooms);
    log.info(`[data] Deleted ${result.rowCount} event(s) for accessory ${accessoryId}`);
    res.json({ success: true, deleted: result.rowCount });
  } catch (err) {
    log.error('[data] /api/data/accessory error:', err.message ?? err.stack ?? err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

app.delete('/api/data/all', apiWriteLimiter, async (_req, res) => {
  try {
    const result = await pool.query('DELETE FROM event_logs');
    await saveRooms({});
    log.info(`[data] Wiped all data — ${result.rowCount} event(s) deleted`);
    res.json({ success: true, deleted: result.rowCount });
  } catch (err) {
    log.error('[data] /api/data/all error:', err.message ?? err.stack ?? err);
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
let matterDiscoveryCache = [];
app.use('/api', createMatterRouter({
  insertEvent,
  loadPairings,
  savePairings,
  loadRooms,
  saveRooms,
  matterRuntime,
  getMatterDiscoveryCache: () => matterDiscoveryCache,
  setMatterDiscoveryCache: (cache) => { matterDiscoveryCache = cache; },
}));

// Stats routes
app.get('/api/accessories', apiStatsReadLimiter, async (_req, res) => {
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
        reliability: mapReliabilityStats(reliability),
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
          reliability: mapReliabilityStats(reliability),
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
    log.error('[api] /api/accessories error:', err.message ?? err.stack ?? err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

app.get('/api/accessories/:accessoryId/detail', apiStatsReadLimiter, async (req, res) => {
  const accessoryId = String(req.params.accessoryId ?? '').trim();
  if (!accessoryId) return res.status(400).json({ error: 'accessoryId is required' });

  const days = parseIntInRange(req.query.days, 30, 7, 365);
  const page = parseIntInRange(req.query.page, 1, 1, Number.MAX_SAFE_INTEGER);
  const limit = parseIntInRange(req.query.limit, 100, 1, 500);
  const offset = (page - 1) * limit;

  try {
    const rooms = loadRooms();
    const currentPairings = loadPairings();
    const now = Date.now();

    const summaryResult = await pool.query(
      `SELECT
         COUNT(*)::int AS event_count,
         MIN(timestamp) AS first_seen,
         MAX(timestamp) AS last_seen
       FROM event_logs
       WHERE accessory_id = $1`,
      [accessoryId]
    );
    const summary = summaryResult.rows[0] ?? {};
    const eventCount = Number.parseInt(summary.event_count ?? '0', 10);

    const latestResult = await pool.query(
      `SELECT accessory_name, room_name, service_type, protocol, transport
       FROM event_logs
       WHERE accessory_id = $1
       ORDER BY timestamp DESC, id DESC
       LIMIT 1`,
      [accessoryId]
    );
    const latest = latestResult.rows[0] ?? {};

    const pairingProtocol = String(currentPairings[accessoryId]?.protocol ?? '').toLowerCase();
    const protocol = String((latest.protocol ?? pairingProtocol) || 'homekit').toLowerCase();
    const bridgeId = protocol === 'homekit' ? parentBridgeId(accessoryId) : accessoryId;
    const matterNodeId = protocol === 'matter'
      ? String(accessoryId).split(':')[0]
      : null;
    const bridgePairing = currentPairings[bridgeId]
      ?? currentPairings[accessoryId]
      ?? (matterNodeId ? currentPairings[matterNodeId] : null);
    const identity = getAccessoryIdentity(accessoryId) ?? getAccessoryIdentity(bridgeId);
    const reliability = getSubscriberStats(bridgeId);

    const heartbeatResult = await pool.query(
      `WITH recent AS (
         SELECT timestamp
         FROM event_logs
         WHERE accessory_id = $1
         ORDER BY timestamp DESC, id DESC
         LIMIT 200
       ),
       deltas AS (
         SELECT EXTRACT(EPOCH FROM (
           timestamp - LAG(timestamp) OVER (ORDER BY timestamp ASC)
         ))::float AS gap_seconds
         FROM recent
       )
       SELECT
         PERCENTILE_CONT(0.5) WITHIN GROUP (ORDER BY gap_seconds) AS heartbeat_seconds,
         COUNT(*) FILTER (WHERE gap_seconds IS NOT NULL)::int AS heartbeat_samples
       FROM deltas
       WHERE gap_seconds IS NOT NULL AND gap_seconds > 0`,
      [accessoryId]
    );
    const heartbeat = heartbeatResult.rows[0] ?? {};

    const health = deriveDeviceHealth({
      lastSeen: summary.last_seen ?? null,
      pairedAt: bridgePairing?.pairedAt ?? null,
      heartbeatSeconds: heartbeat.heartbeat_seconds ?? null,
      heartbeatSamples: heartbeat.heartbeat_samples ?? 0,
      staleThresholdSeconds: retentionSettings.staleThresholdHours * 60 * 60,
      now,
    });

    const stateResult = await pool.query(
      `SELECT DISTINCT ON (characteristic)
         characteristic,
         new_value,
         old_value,
         service_type,
         timestamp,
         protocol,
         endpoint_id,
         cluster_id,
         attribute_id,
         raw_iid
       FROM event_logs
       WHERE accessory_id = $1
       ORDER BY characteristic, timestamp DESC, id DESC`,
      [accessoryId]
    );

    const historyResult = await pool.query(
      `SELECT
         id, timestamp, accessory_id, accessory_name, room_name, service_type,
         characteristic, old_value, new_value, protocol, transport,
         endpoint_id, cluster_id, attribute_id, raw_iid
       FROM event_logs
       WHERE accessory_id = $1
       ORDER BY timestamp DESC, id DESC
       LIMIT $2 OFFSET $3`,
      [accessoryId, limit, offset]
    );

    const activityResult = await pool.query(
      `SELECT DATE(timestamp AT TIME ZONE 'UTC') AS day, COUNT(*)::int AS count
       FROM event_logs
       WHERE accessory_id = $1
         AND timestamp >= NOW() - ($2::int * INTERVAL '1 day')
       GROUP BY day
       ORDER BY day`,
      [accessoryId, days]
    );

    const distinctActiveDaysResult = await pool.query(
      `SELECT COUNT(DISTINCT DATE(timestamp AT TIME ZONE 'UTC'))::int AS active_days
       FROM event_logs
       WHERE accessory_id = $1`,
      [accessoryId]
    );
    const activeDays = Number.parseInt(distinctActiveDaysResult.rows[0]?.active_days ?? '0', 10);
    const firstSeenTs = summary.first_seen ? new Date(summary.first_seen).getTime() : null;
    const observedDays = firstSeenTs
      ? Math.max(1, Math.ceil((now - firstSeenTs) / (24 * 60 * 60 * 1000)))
      : 0;

    const accessory = {
      accessory_id: accessoryId,
      accessory_name: latest.accessory_name ?? bridgePairing?.name ?? accessoryId,
      room_name: rooms[accessoryId] ?? latest.room_name ?? null,
      service_type: latest.service_type ?? null,
      protocol,
      transport: latest.transport ?? null,
      first_seen: summary.first_seen ?? null,
      last_seen: summary.last_seen ?? null,
      event_count: eventCount,
      address: bridgePairing?.address ?? null,
      paired_at: bridgePairing?.pairedAt ?? null,
      manufacturer: identity?.manufacturer ?? null,
      model: identity?.model ?? null,
      serial_number: identity?.serial_number ?? null,
      firmware_revision: identity?.firmware_revision ?? null,
      hardware_revision: identity?.hardware_revision ?? null,
      metadata_updated_at: identity?.metadata_updated_at ?? null,
      reliability: mapReliabilityStats(reliability),
      health,
    };

    res.json({
      accessory,
      uptime: {
        active_days: activeDays,
        observed_days: observedDays,
        active_day_ratio: observedDays > 0 ? activeDays / observedDays : null,
        events_per_active_day: activeDays > 0 ? eventCount / activeDays : null,
      },
      current_state: stateResult.rows,
      activity: {
        days,
        daily: activityResult.rows,
      },
      history: {
        total: eventCount,
        page,
        limit,
        pages: Math.ceil(eventCount / limit),
        events: historyResult.rows.map((row) => ({
          ...row,
          room_name: rooms[row.accessory_id] ?? row.room_name,
        })),
      },
    });
  } catch (err) {
    log.error('[api] /api/accessories/:accessoryId/detail error:', err.message ?? err.stack ?? err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

app.get('/api/accessories/:accessoryId/anomalies', apiStatsReadLimiter, async (req, res) => {
  const accessoryId = String(req.params.accessoryId ?? '').trim();
  if (!accessoryId) return res.status(400).json({ error: 'accessoryId is required' });

  try {
    const nameResult = await pool.query(
      `SELECT accessory_name FROM event_logs
       WHERE accessory_id = $1
       ORDER BY timestamp DESC, id DESC LIMIT 1`,
      [accessoryId]
    );
    const accessoryName = nameResult.rows[0]?.accessory_name;
    if (!accessoryName) return res.json({ outliers: [] });

    const result = await pool.query(`
      WITH hours AS (SELECT generate_series(0, 23)::int AS hour),
      history AS (
        SELECT
          EXTRACT(HOUR FROM timestamp AT TIME ZONE 'UTC')::int AS hour,
          DATE(timestamp AT TIME ZONE 'UTC') AS day_key,
          COUNT(*)::int AS count
        FROM event_logs
        WHERE timestamp >= NOW() - INTERVAL '31 days'
          AND timestamp < NOW() - INTERVAL '1 day'
          AND accessory_name = $1
        GROUP BY 1, 2
      ),
      baseline AS (
        SELECT
          $1::text AS scope_name,
          hours.hour,
          COALESCE(AVG(history.count), 0)::float8 AS baseline_avg,
          COALESCE(STDDEV_SAMP(history.count), 0)::float8 AS baseline_std,
          COUNT(history.day_key)::int AS baseline_days
        FROM hours
        LEFT JOIN history ON history.hour = hours.hour
        GROUP BY hours.hour
      ),
      current_window AS (
        SELECT
          EXTRACT(HOUR FROM timestamp AT TIME ZONE 'UTC')::int AS hour,
          COUNT(*)::int AS event_count
        FROM event_logs
        WHERE timestamp >= NOW() - INTERVAL '1 day'
          AND accessory_name = $1
        GROUP BY 1
      )
      SELECT
        baseline.scope_name,
        baseline.hour,
        baseline.baseline_avg,
        baseline.baseline_std,
        baseline.baseline_days,
        COALESCE(current_window.event_count, 0)::int AS event_count
      FROM baseline
      LEFT JOIN current_window ON current_window.hour = baseline.hour
      WHERE baseline.baseline_days > 0
    `, [accessoryName]);

    const outliers = detectOutliers(result.rows, 'device');
    res.json({ outliers });
  } catch (err) {
    log.error('[api] /api/accessories/:accessoryId/anomalies error:', err.message ?? err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

app.get('/api/accessories/:accessoryId/characteristics/:characteristic/trend', apiStatsReadLimiter, async (req, res) => {
  const accessoryId = String(req.params.accessoryId ?? '').trim();
  const characteristic = String(req.params.characteristic ?? '').trim();
  if (!accessoryId || !characteristic) {
    return res.status(400).json({ error: 'accessoryId and characteristic are required' });
  }
  const days = parseIntInRange(req.query.days, 30, 1, 365);

  try {
    const result = await pool.query(
      `SELECT timestamp, old_value, new_value
       FROM event_logs
       WHERE accessory_id = $1
         AND characteristic = $2
         AND timestamp >= NOW() - ($3::int * INTERVAL '1 day')
       ORDER BY timestamp ASC
       LIMIT 2000`,
      [accessoryId, characteristic, days]
    );
    res.json({ characteristic, days, points: result.rows });
  } catch (err) {
    log.error('[api] characteristic trend error:', err.message ?? err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

app.get('/api/stats/hourly', apiStatsReadLimiter, async (_req, res) => {
  try {
    const result = await pool.query(`
      SELECT EXTRACT(HOUR FROM timestamp AT TIME ZONE 'UTC') AS hour, COUNT(*) AS count
      FROM event_logs WHERE timestamp >= NOW() - INTERVAL '30 days'
      GROUP BY hour ORDER BY hour
    `);
    res.json(result.rows);
  } catch (err) {
    log.error('[api] /api/stats/hourly error:', err.message ?? err.stack ?? err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

app.get('/api/stats/daily', apiStatsReadLimiter, async (req, res) => {
  const days = parseIntInRange(req.query.days, 30, 7, 365);
  try {
    const result = await pool.query(`
      SELECT DATE(timestamp AT TIME ZONE 'UTC') AS day, COUNT(*) AS count
      FROM event_logs WHERE timestamp >= NOW() - ($1::int * INTERVAL '1 day')
      GROUP BY day ORDER BY day
    `, [days]);
    res.json(result.rows);
  } catch (err) {
    log.error('[api] /api/stats/daily error:', err.message ?? err.stack ?? err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

app.get('/api/stats/top-devices', apiStatsReadLimiter, async (req, res) => {
  const days = parseIntInRange(req.query.days, 7, 1, 90);
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
        WHERE timestamp >= NOW() - ($1::int * INTERVAL '1 day')
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
    `, [days]);
    const rooms = loadRooms();
    const rows = result.rows.map((r) => ({
      ...r,
      room_name: rooms[r.accessory_id] ?? rooms[parentBridgeId(r.accessory_id)] ?? r.room_name,
    }));
    res.json(rows);
  } catch (err) {
    log.error('[api] /api/stats/top-devices error:', err.message ?? err.stack ?? err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

app.get('/api/stats/rooms', apiStatsReadLimiter, async (req, res) => {
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
    log.error('[api] /api/stats/rooms error:', err.message ?? err.stack ?? err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

app.get('/api/stats/weekday', apiStatsReadLimiter, async (req, res) => {
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
    log.error('[api] /api/stats/weekday error:', err.message ?? err.stack ?? err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

app.get('/api/stats/heatmap', apiStatsReadLimiter, async (_req, res) => {
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
    log.error('[api] /api/stats/heatmap error:', err.message ?? err.stack ?? err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

app.get('/api/stats/device-patterns', apiStatsReadLimiter, async (_req, res) => {
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
    log.error('[api] /api/stats/device-patterns error:', err.message ?? err.stack ?? err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

app.get('/api/stats/anomalies', apiStatsReadLimiter, async (_req, res) => {
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
    log.error('[api] /api/stats/anomalies error:', err.message ?? err.stack ?? err);
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
  log.info(`[api] Listening on port ${PORT}`);
  if (API_TOKEN) {
    log.info('[api] Write auth enabled for POST/PATCH/DELETE routes');
    if (API_TOKEN_READS_ENABLED) {
      log.info('[api] Read auth enabled for GET/HEAD routes');
    }
  }
  if (CORS_ALLOWED_ORIGINS.length > 0) {
    log.info(`[api] CORS allow-list enabled for ${CORS_ALLOWED_ORIGINS.length} origin(s)`);
  } else if (CORS_ALLOW_LOCALHOST) {
    log.info('[api] CORS restricted to localhost origins');
  } else {
    log.warn('[api] CORS denies all browser origins (CORS_ALLOW_LOCALHOST=false and no allow-list)');
  }
  if (!ALERTS_ENABLED) {
    log.info('[api] Alerts feature disabled (ALERTS_ENABLED=false)');
  }
});
