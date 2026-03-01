import { spawn } from 'child_process';

const POLL_INTERVAL_MS = Number.parseInt(process.env.MATTER_POLL_INTERVAL_MS ?? '30000', 10);
const COMMAND_TIMEOUT_MS = Number.parseInt(process.env.MATTER_COMMAND_TIMEOUT_MS ?? '20000', 10);
const COMMISSION_CMD_TEMPLATE = (process.env.MATTER_COMMISSION_CMD ?? '').trim();
const POLL_CMD_TEMPLATE = (process.env.MATTER_POLL_CMD ?? '').trim();

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
    const child = spawn('/bin/zsh', ['-lc', command], {
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
        lastPolledAt: session.lastPolledAt,
        lastError: session.lastError,
        lastErrorAt: session.lastErrorAt,
        lastEventAt: session.lastEventAt,
      });
    }
    return {
      pollingConfigured: Boolean(POLL_CMD_TEMPLATE),
      commissionConfigured: Boolean(COMMISSION_CMD_TEMPLATE),
      pollIntervalMs: POLL_INTERVAL_MS,
      commandTimeoutMs: COMMAND_TIMEOUT_MS,
      nodes,
    };
  }

  async function commission(payload = {}) {
    if (!COMMISSION_CMD_TEMPLATE) {
      throw new Error('Matter commissioning command is not configured (set MATTER_COMMISSION_CMD)');
    }

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

    if (!command.trim()) throw new Error('Rendered MATTER_COMMISSION_CMD is empty');
    return runShellCommand(command, COMMAND_TIMEOUT_MS);
  }

  function stopNode(nodeId) {
    const session = sessions.get(nodeId);
    if (!session) return;
    session.stopped = true;
    if (session.timer) {
      clearTimeout(session.timer);
      session.timer = null;
    }
    sessions.delete(nodeId);

    for (const key of valueCache.keys()) {
      if (key.startsWith(`${nodeId}:`)) valueCache.delete(key);
    }
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
      if (!command.trim()) throw new Error('Rendered MATTER_POLL_CMD is empty');

      const { stdout } = await runShellCommand(command, COMMAND_TIMEOUT_MS);
      const polledEvents = parsePollOutput(stdout);
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
    } catch (err) {
      session.lastError = err.message ?? String(err);
      session.lastErrorAt = nowIso();
      console.warn(`[matter] poll failed for ${nodeId}: ${session.lastError}`);
    } finally {
      if (!session.stopped) {
        session.timer = setTimeout(() => {
          void runPollCycle(session);
        }, Number.isFinite(POLL_INTERVAL_MS) && POLL_INTERVAL_MS >= 1000 ? POLL_INTERVAL_MS : 30_000);
      }
    }
  }

  function startNode(pairing, nodeId) {
    stopNode(nodeId);
    const session = {
      nodeId,
      pairing,
      pollingEnabled: Boolean(POLL_CMD_TEMPLATE),
      stopped: false,
      timer: null,
      lastPolledAt: null,
      lastError: null,
      lastErrorAt: null,
      lastEventAt: null,
    };
    sessions.set(nodeId, session);

    if (session.pollingEnabled) {
      void runPollCycle(session);
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

  return {
    commission,
    syncPairings,
    stopNode,
    getStatus,
  };
}

