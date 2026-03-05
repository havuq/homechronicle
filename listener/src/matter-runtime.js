import * as matterController from './matter-controller.js';

const POLL_INTERVAL_MS = Number.parseInt(process.env.MATTER_POLL_INTERVAL_MS ?? '5000', 10);
const SUBSCRIBE_ENABLED = !/^(0|false|no|off)$/i.test(process.env.MATTER_SUBSCRIBE_ENABLED ?? 'false');
const SUBSCRIBE_RESTART_DELAY_MS = Number.parseInt(process.env.MATTER_SUBSCRIBE_RESTART_DELAY_MS ?? '2000', 10);
const DISCOVER_TIMEOUT_MS = Number.parseInt(process.env.MATTER_SCAN_TIMEOUT_MS ?? '15000', 10);

function nowIso() {
  return new Date().toISOString();
}

function isMatterPairing(pairing) {
  return String(pairing?.protocol ?? 'homekit').toLowerCase() === 'matter';
}

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
  try {
    return BigInt(text).toString();
  } catch {
    return text.toUpperCase();
  }
}

function normalizePolledEvents(raw) {
  if (Array.isArray(raw)) return raw;
  if (raw && Array.isArray(raw.events)) return raw.events;
  if (raw && typeof raw === 'object') return [raw];
  return [];
}

export function createMatterRuntime({
  insertEvent,
  loadRooms,
}) {
  const sessions = new Map();
  const valueCache = new Map();

  function getStatus() {
    const controllerStatus = matterController.getStatus();
    const nodes = [];
    for (const [nodeId, session] of sessions.entries()) {
      nodes.push({
        nodeId,
        active: !session.stopped,
        pollingEnabled: session.pollingEnabled,
        subscriptionActive: Boolean(session.subscription),
        lastPolledAt: session.lastPolledAt,
        lastError: session.lastError,
        lastErrorAt: session.lastErrorAt,
        lastEventAt: session.lastEventAt,
      });
    }
    return {
      pollingConfigured: true,
      commissionConfigured: true,
      controllerReady: controllerStatus.ready,
      missingConfig: [],
      pollIntervalMs: POLL_INTERVAL_MS,
      subscriptionEnabled: SUBSCRIBE_ENABLED,
      nodes,
    };
  }

  async function commission(payload = {}) {
    const setupCode = toOptionalText(payload.setupCode);
    if (!setupCode) throw new Error('setupCode is required');

    return matterController.commission(setupCode, {
      address: toOptionalText(payload.address),
      port: toOptionalInt(payload.port),
    });
  }

  const MAX_CONSECUTIVE_ERRORS = 10;

  function setSessionError(session, nodeId, err, mode = 'poll') {
    session.lastError = err?.message ?? String(err);
    session.lastErrorAt = nowIso();
    session.consecutiveErrors = (session.consecutiveErrors ?? 0) + 1;
    console.warn(`[matter] ${mode} failed for ${nodeId}: ${session.lastError}`);
    if (session.consecutiveErrors >= MAX_CONSECUTIVE_ERRORS && !session.stopped) {
      console.warn(`[matter] Stopping polling for ${nodeId} after ${session.consecutiveErrors} consecutive errors`);
      session.pollingEnabled = false;
    }
  }

  async function ingestRows(session, rows) {
    const { nodeId, pairing } = session;
    const polledEvents = normalizePolledEvents(rows);
    if (!polledEvents.length) return;

    const rooms = loadRooms();
    session.lastPolledAt = nowIso();

    for (const row of polledEvents) {
      const endpointId = toOptionalInt(row.endpointId);
      const clusterId = toOptionalInt(row.clusterId);
      const attributeId = toOptionalInt(row.attributeId);
      const characteristic = toOptionalText(row.characteristic)
        ?? ((clusterId != null && attributeId != null)
          ? `cluster:${clusterId}/attribute:${attributeId}`
          : null);
      if (!characteristic) continue;

      const accessoryId = toOptionalText(row.accessoryId)
        ?? (endpointId == null ? nodeId : `${nodeId}:${endpointId}`);
      const cacheKey = `${nodeId}:${endpointId ?? 0}:${clusterId ?? 0}:${attributeId ?? 0}:${characteristic}`;
      const newValue = row.newValue === undefined ? row.value : row.newValue;
      if (newValue === undefined) continue;
      const oldValue = valueCache.get(cacheKey) ?? null;
      const nextValue = String(newValue);
      valueCache.set(cacheKey, nextValue);
      if (oldValue !== null && oldValue === nextValue) continue;

      const eventPayload = {
        accessoryId,
        accessoryName: toOptionalText(row.accessoryName) ?? pairing?.name ?? nodeId,
        roomName: rooms[accessoryId] ?? rooms[nodeId] ?? toOptionalText(row.roomName) ?? null,
        serviceType: toOptionalText(row.serviceType) ?? toOptionalText(pairing?.deviceType) ?? null,
        characteristic,
        oldValue,
        newValue: nextValue,
        protocol: 'matter',
        transport: toOptionalText(row.transport) ?? pairing?.transport ?? null,
        endpointId,
        clusterId,
        attributeId,
        rawIid: null,
      };

      // eslint-disable-next-line no-await-in-loop
      await insertEvent(eventPayload);
      session.lastEventAt = nowIso();
    }
  }

  function stopNode(nodeId) {
    const session = sessions.get(nodeId);
    if (!session) return;
    session.stopped = true;
    if (session.timer) {
      clearTimeout(session.timer);
      session.timer = null;
    }
    if (session.subscriptionRestartTimer) {
      clearTimeout(session.subscriptionRestartTimer);
      session.subscriptionRestartTimer = null;
    }
    if (session.subscription) {
      try { session.subscription.stop(); } catch { /* ignore */ }
      session.subscription = null;
    }
    sessions.delete(nodeId);

    void matterController.stopNode(nodeId).catch(() => { /* ignore */ });

    for (const key of valueCache.keys()) {
      if (key.startsWith(`${nodeId}:`)) valueCache.delete(key);
    }
  }

  function schedulePoll(session) {
    if (session.stopped) return;
    const delayMs = Number.isFinite(POLL_INTERVAL_MS) && POLL_INTERVAL_MS >= 1000 ? POLL_INTERVAL_MS : 30_000;
    session.timer = setTimeout(() => {
      void runPollCycle(session);
    }, delayMs);
  }

  function scheduleSubscriptionRestart(session) {
    if (session.stopped || !session.pollingEnabled) return;
    if (session.subscriptionRestartTimer) {
      clearTimeout(session.subscriptionRestartTimer);
    }
    const delayMs = Number.isFinite(SUBSCRIBE_RESTART_DELAY_MS) && SUBSCRIBE_RESTART_DELAY_MS >= 250
      ? SUBSCRIBE_RESTART_DELAY_MS
      : 2_000;
    session.subscriptionRestartTimer = setTimeout(() => {
      session.subscriptionRestartTimer = null;
      void startSubscription(session);
    }, delayMs);
  }

  async function runPollCycle(session) {
    if (session.stopped || !session.pollingEnabled) return;

    const { nodeId } = session;
    try {
      const events = await matterController.poll(nodeId);
      session.consecutiveErrors = 0;
      await ingestRows(session, events);
    } catch (err) {
      setSessionError(session, nodeId, err, 'poll');
    } finally {
      schedulePoll(session);
    }
  }

  async function startSubscription(session) {
    if (session.stopped || !session.pollingEnabled) return;
    const { nodeId } = session;

    try {
      const sub = await matterController.subscribe(nodeId, (events) => {
        void ingestRows(session, events).catch((err) => {
          setSessionError(session, nodeId, err, 'subscribe');
        });
      });
      session.subscription = sub;
    } catch (err) {
      setSessionError(session, nodeId, err, 'subscribe');
      scheduleSubscriptionRestart(session);
    }
  }

  function startNode(pairing, nodeId) {
    stopNode(nodeId);
    const session = {
      nodeId,
      pairing,
      pollingEnabled: true,
      stopped: false,
      timer: null,
      subscription: null,
      subscriptionRestartTimer: null,
      lastPolledAt: null,
      lastError: null,
      lastErrorAt: null,
      lastEventAt: null,
    };
    sessions.set(nodeId, session);

    if (session.pollingEnabled) {
      if (SUBSCRIBE_ENABLED) {
        void startSubscription(session);
      } else {
        void runPollCycle(session);
      }
    }
  }

  function syncPairings(pairings) {
    const nextMatter = new Map();
    const controllerStatus = matterController.getStatus();
    const commissionedNodes = new Set(
      (controllerStatus.commissionedNodes ?? [])
        .map((id) => normalizeNodeId(id))
        .filter(Boolean)
    );

    for (const [id, pairing] of Object.entries(pairings ?? {})) {
      if (!isMatterPairing(pairing)) continue;
      const nodeId = normalizeNodeId(pairing?.nodeId ?? id);
      if (!nodeId) continue;
      if (commissionedNodes.size > 0 && !commissionedNodes.has(nodeId)) {
        continue;
      }
      nextMatter.set(nodeId, { ...pairing, nodeId });
    }

    for (const nodeId of sessions.keys()) {
      if (!nextMatter.has(nodeId)) stopNode(nodeId);
    }

    for (const [nodeId, pairing] of nextMatter.entries()) {
      const existing = sessions.get(nodeId);
      if (!existing) {
        startNode(pairing, nodeId);
        continue;
      }
      existing.pairing = pairing;
    }
  }

  async function scan() {
    return matterController.discover(DISCOVER_TIMEOUT_MS);
  }

  return {
    commission,
    scan,
    syncPairings,
    stopNode,
    getStatus,
  };
}
