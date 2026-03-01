import express from 'express';

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
  loadPairings,
  savePairings,
  loadRooms,
  saveRooms,
  matterRuntime = null,
}) {
  const router = express.Router();

  router.get('/setup/matter/runtime', (_req, res) => {
    if (!matterRuntime) {
      return res.status(503).json({ error: 'Matter runtime unavailable' });
    }
    return res.json(matterRuntime.getStatus());
  });

  router.post('/setup/matter/commission', async (req, res) => {
    if (!matterRuntime) {
      return res.status(503).json({ error: 'Matter runtime unavailable' });
    }
    try {
      const nodeId = normalizeNodeId(req.body?.nodeId);
      const setupCode = toOptionalText(req.body?.setupCode);
      if (!nodeId || !setupCode) {
        return res.status(400).json({ error: 'nodeId and setupCode are required' });
      }
      const result = await matterRuntime.commission({
        nodeId,
        setupCode,
        address: req.body?.address,
        port: req.body?.port,
        transport: req.body?.transport,
        commissioningMethod: req.body?.commissioningMethod,
      });
      return res.json({
        success: true,
        nodeId,
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
    const nodeId = normalizeNodeId(req.body?.nodeId);
    const name = toOptionalText(req.body?.name);
    if (!nodeId || !name) {
      return res.status(400).json({ error: 'nodeId and name are required' });
    }

    const setupCode = toOptionalText(req.body?.setupCode);
    if (setupCode && matterRuntime) {
      try {
        await matterRuntime.commission({
          nodeId,
          setupCode,
          address: req.body?.address,
          port: req.body?.port,
          transport: req.body?.transport,
          commissioningMethod: req.body?.commissioningMethod,
        });
      } catch (err) {
        return res.status(400).json({ error: err.message ?? String(err) });
      }
    } else if (setupCode && !matterRuntime) {
      return res.status(503).json({ error: 'Matter runtime unavailable for commissioning' });
    }

    const pairings = loadPairings();
    const nowIso = new Date().toISOString();
    const existing = pairings[nodeId] ?? null;

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

    return res.json({ success: true });
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
