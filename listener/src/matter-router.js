import express from 'express';
import { randomBytes } from 'crypto';
import { log } from './logger.js';

function toOptionalText(value) {
  if (value === undefined || value === null) return null;
  const text = String(value).trim();
  return text || null;
}

function toOptionalInt(value) {
  if (value === undefined || value === null || value === '') return null;
  const parsed = Number.parseInt(String(value), 10);
  return Number.isFinite(parsed) ? parsed : null;
}

function normalizeNodeId(value) {
  const text = toOptionalText(value);
  if (!text) return null;
  // Allow decimal or hex Matter node ids; store uppercase for stable keys.
  return text.toUpperCase();
}

function generateNodeId(pairings) {
  for (let i = 0; i < 8; i += 1) {
    const candidate = `0X${randomBytes(8).toString('hex').toUpperCase()}`;
    if (!pairings[candidate]) return candidate;
  }
  throw new Error('Could not allocate unique Matter nodeId');
}

function buildMatterAccessoryId(nodeId, endpointId) {
  return endpointId == null ? nodeId : `${nodeId}:${endpointId}`;
}

function isMatterPairing(pairing) {
  return String(pairing?.protocol ?? 'homekit').toLowerCase() === 'matter';
}

function getMatterPairings(pairings) {
  return Object.entries(pairings).filter(([, pairing]) => isMatterPairing(pairing));
}

export function createMatterRouter({
  insertEvent,
  pool = null,
  loadPairings,
  savePairings,
  loadRooms,
  saveRooms,
  matterRuntime = null,
  getMatterDiscoveryCache = () => [],
  setMatterDiscoveryCache = () => {},
}) {
  const router = express.Router();

  router.get('/setup/matter/runtime', (_req, res) => {
    if (!matterRuntime) {
      return res.status(503).json({ error: 'Matter runtime unavailable' });
    }
    return res.json(matterRuntime.getStatus());
  });

  router.get('/setup/matter/discovered', (_req, res) => {
    const pairings = loadPairings();
    const matterPairings = getMatterPairings(pairings);
    const pairedNodeIds = new Set(matterPairings.map(([, p]) => p.nodeId ?? ''));
    const cache = getMatterDiscoveryCache();
    const devices = cache.map((d) => ({
      ...d,
      alreadyPaired: pairedNodeIds.has(d.id) || pairedNodeIds.has(d.instanceName),
    }));
    res.json({ devices, cachedAt: new Date().toISOString() });
  });

  router.post('/setup/matter/scan', async (_req, res) => {
    if (!matterRuntime) {
      return res.status(503).json({ error: 'Matter runtime unavailable' });
    }
    try {
      log.info('[matter] Manual scan triggered from UI');
      const raw = await matterRuntime.scan();
      const pairings = loadPairings();
      const matterPairings = getMatterPairings(pairings);
      const pairedNodeIds = new Set(matterPairings.map(([, p]) => p.nodeId ?? ''));

      const devices = raw.map((d) => ({
        id: d.instanceName ?? `${d.address}:${d.port}`,
        name: d.deviceName ?? d.instanceName ?? `Matter ${d.discriminator ?? 'Device'}`,
        instanceName: d.instanceName ?? null,
        hostname: d.hostname ?? null,
        discriminator: d.discriminator ?? null,
        vendorId: d.vendorId ?? null,
        productId: d.productId ?? null,
        deviceType: d.deviceType ?? null,
        address: d.address ?? null,
        addresses: d.addresses ?? [],
        port: d.port ?? null,
        commissionable: d.commissionable ?? true,
        alreadyPaired: pairedNodeIds.has(d.instanceName),
      }));

      setMatterDiscoveryCache(devices);
      log.info(`[matter] Scan complete — found ${devices.length} commissionable device(s)`);
      res.json({ devices, cachedAt: new Date().toISOString() });
    } catch (err) {
      log.error('[matter] Scan error:', err.message ?? err.stack ?? err);
      const cache = getMatterDiscoveryCache();
      res.status(200).json({
        devices: cache,
        cachedAt: new Date().toISOString(),
        warning: `Matter scan failed: ${err.message}. Is the matter.js controller initialized?`,
      });
    }
  });

  router.post('/setup/matter/commission', async (req, res) => {
    if (!matterRuntime) {
      return res.status(503).json({ error: 'Matter runtime unavailable' });
    }
    try {
      const setupCode = toOptionalText(req.body?.setupCode);
      const nodeId = normalizeNodeId(req.body?.nodeId);
      if (!setupCode) {
        return res.status(400).json({ error: 'setupCode is required' });
      }
      const result = await matterRuntime.commission({
        ...(nodeId ? { nodeId } : {}),
        setupCode,
        address: req.body?.address,
        port: req.body?.port,
        transport: req.body?.transport,
        commissioningMethod: req.body?.commissioningMethod,
      });
      return res.json({
        success: true,
        nodeId: result?.nodeId ?? nodeId ?? null,
        stdout: result.stdout,
        stderr: result.stderr,
      });
    } catch (err) {
      return res.status(400).json({ error: err.message ?? String(err) });
    }
  });

  router.get('/setup/matter/pairings', (_req, res) => {
    const pairings = loadPairings();
    const list = getMatterPairings(pairings).map(([id, pairing]) => ({
      id,
      protocol: 'matter',
      nodeId: pairing.nodeId ?? id,
      name: pairing.name ?? id,
      transport: pairing.transport ?? null,
      address: pairing.address ?? null,
      port: pairing.port ?? null,
      pairedAt: pairing.pairedAt ?? null,
      commissionedAt: pairing.commissionedAt ?? null,
    }));
    res.json(list);
  });

  // Phase 1 import path: register a pre-commissioned Matter node.
  // Commissioning workflows (BLE/thread dataset orchestration) are handled later.
  router.post('/setup/matter/pair', async (req, res) => {
    const requestedNodeId = normalizeNodeId(req.body?.nodeId);
    const name = toOptionalText(req.body?.name);
    if (!name) {
      return res.status(400).json({ error: 'name is required' });
    }
    const setupCode = toOptionalText(req.body?.setupCode);
    if (!requestedNodeId && !setupCode) {
      return res.status(400).json({ error: 'nodeId is required when setupCode is not provided' });
    }

    const pairings = loadPairings();
    let nodeId = requestedNodeId ?? generateNodeId(pairings);
    if (setupCode && matterRuntime) {
      try {
        const result = await matterRuntime.commission({
          nodeId,
          setupCode,
          address: req.body?.address,
          port: req.body?.port,
          transport: req.body?.transport,
          commissioningMethod: req.body?.commissioningMethod,
        });
        // Use the actual node ID assigned by the Matter controller, which may
        // differ from the client-generated one.
        if (result?.nodeId) {
          const actualNodeId = normalizeNodeId(result.nodeId);
          if (actualNodeId && actualNodeId !== nodeId) {
            log.debug(`[matter] Commissioned node ID ${actualNodeId} differs from requested ${nodeId}, using actual`);
            nodeId = actualNodeId;
          }
        }
      } catch (err) {
        return res.status(400).json({ error: err.message ?? String(err) });
      }
    } else if (setupCode && !matterRuntime) {
      return res.status(503).json({
        error: 'Matter commissioning is not available. Check listener logs for details.',
      });
    }

    const nowIso = new Date().toISOString();
    const existing = pairings[nodeId] ?? null;

    const manualImport = !setupCode && !!requestedNodeId;

    pairings[nodeId] = {
      protocol: 'matter',
      nodeId,
      name,
      transport: toOptionalText(req.body?.transport) ?? existing?.transport ?? 'ip',
      address: toOptionalText(req.body?.address) ?? existing?.address ?? null,
      port: toOptionalInt(req.body?.port) ?? existing?.port ?? null,
      deviceType: toOptionalText(req.body?.deviceType) ?? existing?.deviceType ?? null,
      pairedAt: existing?.pairedAt ?? nowIso,
      commissionedAt: nowIso,
      credentials: req.body?.credentials ?? existing?.credentials ?? null,
      ...(manualImport ? { manualImport: true } : {}),
    };

    await savePairings(pairings);
    return res.json({
      success: true,
      pairing: {
        id: nodeId,
        protocol: 'matter',
        nodeId,
        name,
        transport: pairings[nodeId].transport,
      },
    });
  });

  router.delete('/setup/matter/pairing/:nodeId', async (req, res) => {
    const nodeId = normalizeNodeId(req.params.nodeId);
    if (!nodeId) return res.status(400).json({ error: 'nodeId is required' });

    const pairings = loadPairings();
    if (!pairings[nodeId] || !isMatterPairing(pairings[nodeId])) {
      return res.status(404).json({ error: 'Matter pairing not found' });
    }

    delete pairings[nodeId];
    await savePairings(pairings);

    const rooms = loadRooms();
    for (const key of Object.keys(rooms)) {
      if (key === nodeId || key.startsWith(`${nodeId}:`)) delete rooms[key];
    }
    await saveRooms(rooms);

    // Purge all event history for this node and its endpoints.
    let deletedEvents = 0;
    if (pool) {
      try {
        const result = await pool.query(
          'DELETE FROM event_logs WHERE accessory_id = $1 OR accessory_id LIKE $2',
          [nodeId, `${nodeId}:%`],
        );
        deletedEvents = result.rowCount;
        log.info(`[matter] Purged ${deletedEvents} event(s) for node ${nodeId}`);
      } catch (err) {
        log.error(`[matter] Failed to purge events for node ${nodeId}:`, err.message ?? err);
      }
    }

    return res.json({ success: true, deletedEvents });
  });

  router.post('/matter/events', async (req, res) => {
    const rawEvents = Array.isArray(req.body?.events)
      ? req.body.events
      : (req.body?.event ? [req.body.event] : []);

    if (!rawEvents.length) {
      return res.status(400).json({ error: 'events array is required' });
    }

    const pairings = loadPairings();
    const rooms = loadRooms();

    const normalized = [];
    for (let i = 0; i < rawEvents.length; i += 1) {
      const row = rawEvents[i] ?? {};
      const nodeId = normalizeNodeId(row.nodeId ?? row.deviceId ?? row.pairingId);
      if (!nodeId) return res.status(400).json({ error: `events[${i}].nodeId is required` });

      const endpointId = toOptionalInt(row.endpointId);
      const clusterId = toOptionalInt(row.clusterId);
      const attributeId = toOptionalInt(row.attributeId);
      const characteristic = toOptionalText(row.characteristic)
        ?? ((clusterId != null && attributeId != null)
          ? `cluster:${clusterId}/attribute:${attributeId}`
          : null);
      if (!characteristic) {
        return res.status(400).json({
          error: `events[${i}] requires characteristic or both clusterId and attributeId`,
        });
      }
      if (row.newValue === undefined) {
        return res.status(400).json({ error: `events[${i}].newValue is required` });
      }

      const accessoryId = toOptionalText(row.accessoryId) ?? buildMatterAccessoryId(nodeId, endpointId);
      const pairing = pairings[nodeId] ?? null;
      const eventRoom = toOptionalText(row.roomName);

      normalized.push({
        accessoryId,
        accessoryName: toOptionalText(row.accessoryName) ?? pairing?.name ?? nodeId,
        roomName: rooms[accessoryId] ?? rooms[nodeId] ?? eventRoom ?? null,
        serviceType: toOptionalText(row.serviceType) ?? toOptionalText(row.deviceType) ?? pairing?.deviceType ?? null,
        characteristic,
        oldValue: row.oldValue === undefined || row.oldValue === null ? null : String(row.oldValue),
        newValue: row.newValue,
        protocol: 'matter',
        transport: toOptionalText(row.transport) ?? pairing?.transport ?? null,
        endpointId,
        clusterId,
        attributeId,
        rawIid: null,
      });
    }

    for (const event of normalized) {
      // eslint-disable-next-line no-await-in-loop
      await insertEvent(event);
    }

    return res.json({ success: true, inserted: normalized.length });
  });

  return router;
}
