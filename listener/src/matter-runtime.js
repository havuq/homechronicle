import { spawn } from 'child_process';

const POLL_INTERVAL_MS = Number.parseInt(process.env.MATTER_POLL_INTERVAL_MS ?? '5000', 10);
const COMMAND_TIMEOUT_MS = Number.parseInt(process.env.MATTER_COMMAND_TIMEOUT_MS ?? '20000', 10);
const COMMISSION_TIMEOUT_MS = Number.parseInt(process.env.MATTER_COMMISSION_TIMEOUT_MS ?? '180000', 10);
const SUBSCRIBE_ENABLED = !/^(0|false|no|off)$/i.test(process.env.MATTER_SUBSCRIBE_ENABLED ?? 'false');
const SUBSCRIBE_RESTART_DELAY_MS = Number.parseInt(process.env.MATTER_SUBSCRIBE_RESTART_DELAY_MS ?? '2000', 10);
const COMMISSION_CMD_TEMPLATE = 'node src/matter-chiptool/commission.mjs {nodeId} {setupCode} {address} {port}';
const POLL_CMD_TEMPLATE = 'node src/matter-chiptool/poll.mjs {nodeId}';
const SUBSCRIBE_CMD_TEMPLATE = 'node src/matter-chiptool/subscribe.mjs {nodeId}';
const DISCOVER_CMD_TEMPLATE = 'node src/matter-chiptool/discover.mjs';
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

function applyTemplate(template, vars) {
  return template.replace(/\{([a-zA-Z0-9_]+)\}/g, (_full, key) => {
    const value = vars[key];
    return value === undefined || value === null ? '' : String(value);
  });
}

function runShellCommand(command, timeoutMs) {
  return new Promise((resolve, reject) => {
    const child = spawn('/bin/sh', ['-c', command], {
      stdio: ['ignore', 'pipe', 'pipe'],
      env: process.env,
    });

    let stdout = '';
    let stderr = '';
    let finished = false;

    const timeoutId = setTimeout(() => {
      if (finished) return;
      finished = true;
      child.kill('SIGTERM');
      reject(new Error(`Matter command timed out after ${timeoutMs}ms`));
    }, timeoutMs);

    child.stdout.on('data', (chunk) => { stdout += chunk.toString(); });
    child.stderr.on('data', (chunk) => { stderr += chunk.toString(); });
    child.on('error', (err) => {
      if (finished) return;
      finished = true;
      clearTimeout(timeoutId);
      reject(err);
    });
    child.on('exit', (code, signal) => {
      if (finished) return;
      finished = true;
      clearTimeout(timeoutId);
      if (code === 0) {
        resolve({ stdout, stderr });
      } else {
        reject(new Error(`Matter command failed (code=${code ?? 'null'} signal=${signal ?? 'null'}): ${stderr || stdout}`));
      }
    });
  });
}

function normalizePolledEvents(raw) {
  if (Array.isArray(raw)) return raw;
  if (raw && Array.isArray(raw.events)) return raw.events;
  if (raw && typeof raw === 'object') return [raw];
  return [];
}

function parsePollOutput(stdout) {
  const text = String(stdout ?? '').trim();
  if (!text) return [];

  try {
    return normalizePolledEvents(JSON.parse(text));
  } catch {
    const rows = [];
    for (const line of text.split('\n')) {
      const trimmed = line.trim();
      if (!trimmed) continue;
      try {
        rows.push(JSON.parse(trimmed));
      } catch {
        // Ignore non-JSON log lines from external tools.
      }
    }
    return rows;
  }
}

export function createMatterRuntime({
  insertEvent,
  loadRooms,
}) {
  const sessions = new Map();
  const valueCache = new Map();

  function getStatus() {
    const nodes = [];
    for (const [nodeId, session] of sessions.entries()) {
      nodes.push({
        nodeId,
        active: !session.stopped,
        pollingEnabled: session.pollingEnabled,
        subscriptionActive: Boolean(session.subscriptionProcess),
        lastPolledAt: session.lastPolledAt,
        lastError: session.lastError,
        lastErrorAt: session.lastErrorAt,
        lastEventAt: session.lastEventAt,
      });
    }
    return {
      pollingConfigured: true,
      commissionConfigured: true,
      missingConfig: [],
      pollIntervalMs: POLL_INTERVAL_MS,
      commandTimeoutMs: COMMAND_TIMEOUT_MS,
      commissionTimeoutMs: COMMISSION_TIMEOUT_MS,
      subscriptionEnabled: SUBSCRIBE_ENABLED,
      nodes,
    };
  }

  async function commission(payload = {}) {
    const nodeId = toOptionalText(payload.nodeId);
    if (!nodeId) throw new Error('nodeId is required');
    const setupCode = toOptionalText(payload.setupCode);
    if (!setupCode) throw new Error('setupCode is required');

    const command = applyTemplate(COMMISSION_CMD_TEMPLATE, {
      nodeId,
      setupCode,
      address: toOptionalText(payload.address) ?? '',
      port: toOptionalInt(payload.port) ?? '',
      transport: toOptionalText(payload.transport) ?? '',
      method: toOptionalText(payload.commissioningMethod) ?? 'code',
    });

    if (!command.trim()) throw new Error('Rendered commissioning command is empty');
    return runShellCommand(command, COMMISSION_TIMEOUT_MS);
  }

  function setSessionError(session, nodeId, err, mode = 'poll') {
    session.lastError = err?.message ?? String(err);
    session.lastErrorAt = nowIso();
    console.warn(`[matter] ${mode} failed for ${nodeId}: ${session.lastError}`);
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
    if (session.subscriptionProcess) {
      try { session.subscriptionProcess.kill('SIGTERM'); } catch { /* ignore */ }
      session.subscriptionProcess = null;
    }
    sessions.delete(nodeId);

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
      startSubscription(session);
    }, delayMs);
  }

  async function runPollCycle(session) {
    if (session.stopped || !session.pollingEnabled) return;

    const { pairing, nodeId } = session;
    try {
      const command = applyTemplate(POLL_CMD_TEMPLATE, {
        nodeId,
        name: toOptionalText(pairing?.name) ?? nodeId,
        address: toOptionalText(pairing?.address) ?? '',
        port: toOptionalInt(pairing?.port) ?? '',
        transport: toOptionalText(pairing?.transport) ?? '',
      });
      if (!command.trim()) throw new Error('Rendered polling command is empty');

      const { stdout } = await runShellCommand(command, COMMAND_TIMEOUT_MS);
      const polledEvents = parsePollOutput(stdout);
      await ingestRows(session, polledEvents);
    } catch (err) {
      setSessionError(session, nodeId, err, 'poll');
    } finally {
      schedulePoll(session);
    }
  }

  function startSubscription(session) {
    if (session.stopped || !session.pollingEnabled) return;
    const { pairing, nodeId } = session;

    const command = applyTemplate(SUBSCRIBE_CMD_TEMPLATE, {
      nodeId,
      name: toOptionalText(pairing?.name) ?? nodeId,
      address: toOptionalText(pairing?.address) ?? '',
      port: toOptionalInt(pairing?.port) ?? '',
      transport: toOptionalText(pairing?.transport) ?? '',
    });

    if (!command.trim()) {
      setSessionError(session, nodeId, new Error('Rendered subscription command is empty'), 'subscribe');
      scheduleSubscriptionRestart(session);
      return;
    }

    const child = spawn('/bin/sh', ['-c', command], {
      stdio: ['ignore', 'pipe', 'pipe'],
      env: process.env,
    });
    session.subscriptionProcess = child;
    session.subscriptionStdoutBuffer = '';
    session.subscriptionStderr = '';

    let finished = false;

    const appendStderr = (text) => {
      session.subscriptionStderr += text;
      if (session.subscriptionStderr.length > 12000) {
        session.subscriptionStderr = session.subscriptionStderr.slice(-12000);
      }
    };

    const processLine = (line) => {
      const trimmed = line.trim();
      if (!trimmed) return;
      try {
        const rows = normalizePolledEvents(JSON.parse(trimmed));
        if (!rows.length) return;
        void ingestRows(session, rows).catch((err) => {
          setSessionError(session, nodeId, err, 'subscribe');
        });
      } catch {
        // Ignore non-JSON stdout lines.
      }
    };

    const drainStdoutBuffer = (flush = false) => {
      let newlineIndex = session.subscriptionStdoutBuffer.indexOf('\n');
      while (newlineIndex >= 0) {
        const line = session.subscriptionStdoutBuffer.slice(0, newlineIndex);
        session.subscriptionStdoutBuffer = session.subscriptionStdoutBuffer.slice(newlineIndex + 1);
        processLine(line);
        newlineIndex = session.subscriptionStdoutBuffer.indexOf('\n');
      }
      if (flush && session.subscriptionStdoutBuffer.trim()) {
        processLine(session.subscriptionStdoutBuffer);
        session.subscriptionStdoutBuffer = '';
      }
    };

    child.stdout.on('data', (chunk) => {
      session.subscriptionStdoutBuffer += chunk.toString();
      drainStdoutBuffer(false);
    });

    child.stderr.on('data', (chunk) => {
      appendStderr(chunk.toString());
    });

    child.on('error', (err) => {
      if (finished) return;
      finished = true;
      if (session.subscriptionProcess === child) session.subscriptionProcess = null;
      setSessionError(session, nodeId, err, 'subscribe');
      scheduleSubscriptionRestart(session);
    });

    child.on('exit', (code, signal) => {
      if (finished) return;
      finished = true;
      if (session.subscriptionProcess === child) session.subscriptionProcess = null;
      drainStdoutBuffer(true);

      if (code !== 0) {
        const details = session.subscriptionStderr.trim();
        const errorText = details
          ? `Matter subscription failed (code=${code ?? 'null'} signal=${signal ?? 'null'}): ${details}`
          : `Matter subscription failed (code=${code ?? 'null'} signal=${signal ?? 'null'})`;
        setSessionError(session, nodeId, new Error(errorText), 'subscribe');
      }

      scheduleSubscriptionRestart(session);
    });
  }

  function startNode(pairing, nodeId) {
    stopNode(nodeId);
    const session = {
      nodeId,
      pairing,
      pollingEnabled: true,
      stopped: false,
      timer: null,
      subscriptionProcess: null,
      subscriptionRestartTimer: null,
      subscriptionStdoutBuffer: '',
      subscriptionStderr: '',
      lastPolledAt: null,
      lastError: null,
      lastErrorAt: null,
      lastEventAt: null,
    };
    sessions.set(nodeId, session);

    if (session.pollingEnabled) {
      if (SUBSCRIBE_ENABLED) {
        startSubscription(session);
      } else {
        void runPollCycle(session);
      }
    }
  }

  function syncPairings(pairings) {
    const nextMatter = new Map();
    for (const [id, pairing] of Object.entries(pairings ?? {})) {
      if (!isMatterPairing(pairing)) continue;
      const nodeId = toOptionalText(pairing?.nodeId) ?? id;
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
    const command = DISCOVER_CMD_TEMPLATE;
    if (!command.trim()) throw new Error('Rendered discover command is empty');
    const { stdout } = await runShellCommand(command, DISCOVER_TIMEOUT_MS);
    const text = String(stdout ?? '').trim();
    if (!text) return [];
    try {
      const parsed = JSON.parse(text);
      return Array.isArray(parsed) ? parsed : [];
    } catch {
      return [];
    }
  }

  return {
    commission,
    scan,
    syncPairings,
    stopNode,
    getStatus,
  };
}
