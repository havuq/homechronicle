import { mkdirSync } from 'node:fs';
import { resolve } from 'node:path';
import { spawn } from 'node:child_process';

const storageDir = resolve(process.env.MATTER_CHIP_TOOL_STATE_DIR?.trim() || '/app/data/chip-tool-state');
const commandTimeoutSeconds = Number.parseInt(process.env.MATTER_CHIP_TOOL_TIMEOUT_SEC ?? '20', 10);

const clusterIds = '0x0006,0x0008,0x0045,0x0402,0x0405,0x0406';
const attributeIds = '0x0000';

const clusterLabels = {
  0x0006: { serviceType: 'OnOff', characteristic: 'OnOff' },
  0x0008: { serviceType: 'LevelControl', characteristic: 'CurrentLevel' },
  0x0045: { serviceType: 'BooleanState', characteristic: 'StateValue' },
  0x0402: { serviceType: 'TemperatureMeasurement', characteristic: 'MeasuredValue' },
  0x0405: { serviceType: 'RelativeHumidityMeasurement', characteristic: 'MeasuredValue' },
  0x0406: { serviceType: 'OccupancySensing', characteristic: 'Occupancy' },
};

function normalizeNodeId(raw) {
  const text = String(raw ?? '').trim();
  if (!text) throw new Error('nodeId is required');
  const value = /^0x/i.test(text) ? BigInt(text) : BigInt(text);
  if (value <= 0n) throw new Error('nodeId must be > 0');
  return value.toString(10);
}

function decodeHex(raw) {
  return Number.parseInt(String(raw).replaceAll('_', ''), 16);
}

function normalizeValue(raw) {
  const value = String(raw ?? '').trim();
  if (/^(true|false)$/i.test(value)) return /^true$/i.test(value);
  if (/^-?\d+$/.test(value)) {
    const parsed = Number.parseInt(value, 10);
    if (Number.isFinite(parsed)) return parsed;
  }
  if (/^0x[0-9a-f]+$/i.test(value)) return value.toUpperCase();
  if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) {
    return value.slice(1, -1);
  }
  return value;
}

function parseEvents(output, nodeIdHex) {
  const events = [];
  const lines = String(output ?? '').split(/\r?\n/);
  const headerPattern = /CHIP:TOO:\s*Endpoint:\s*(\d+)\s+Cluster:\s*0x([0-9A-Fa-f_]+)\s+Attribute:\s*0x([0-9A-Fa-f_]+)/;
  const valuePattern = /CHIP:TOO:\s*([A-Za-z][A-Za-z0-9_-]*)\s*:\s*(.+)$/;

  let current = null;

  for (const line of lines) {
    const headerMatch = line.match(headerPattern);
    if (headerMatch) {
      const endpointId = Number.parseInt(headerMatch[1], 10);
      const clusterId = decodeHex(headerMatch[2]);
      const attributeId = decodeHex(headerMatch[3]);
      current = { endpointId, clusterId, attributeId };
      continue;
    }

    if (!current) continue;

    const valueMatch = line.match(valuePattern);
    if (!valueMatch) continue;

    const key = valueMatch[1];
    const rawValue = valueMatch[2].trim();

    if (!key || key === 'DataVersion') continue;
    if (!rawValue || rawValue === '{' || rawValue === '}' || rawValue === '[]') continue;

    const labels = clusterLabels[current.clusterId] ?? null;
    const characteristic = labels?.characteristic ?? key;

    events.push({
      nodeId: nodeIdHex,
      endpointId: current.endpointId,
      clusterId: current.clusterId,
      attributeId: current.attributeId,
      serviceType: labels?.serviceType ?? null,
      characteristic,
      newValue: normalizeValue(rawValue),
    });

    current = null;
  }

  return events;
}

function run(args) {
  return new Promise((resolvePromise) => {
    const child = spawn('chip-tool', args, {
      stdio: ['ignore', 'pipe', 'pipe'],
      env: process.env,
    });

    let stdout = '';
    let stderr = '';

    child.stdout.on('data', (chunk) => {
      stdout += chunk.toString();
    });
    child.stderr.on('data', (chunk) => {
      stderr += chunk.toString();
    });

    child.on('error', (err) => {
      resolvePromise({ code: 1, signal: null, stdout, stderr: `${stderr}\n${err.message}`.trim() });
    });

    child.on('exit', (code, signal) => {
      resolvePromise({ code: code ?? 1, signal: signal ?? null, stdout, stderr });
    });
  });
}

function summarizeFailure(result) {
  const combined = `${result.stderr ?? ''}\n${result.stdout ?? ''}`;
  const lines = combined
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean);

  const useful = lines.filter((line) => /CHIP Error|No endpoint|Run command failure|error|fail/i.test(line));
  return (useful.slice(-8).join('\n') || lines.slice(-8).join('\n') || `code=${result.code} signal=${result.signal}`).trim();
}

async function main() {
  const [nodeIdRaw] = process.argv.slice(2);
  const nodeIdDecimal = normalizeNodeId(nodeIdRaw);
  const nodeIdHex = `0X${BigInt(nodeIdDecimal).toString(16).toUpperCase()}`;

  mkdirSync(storageDir, { recursive: true });

  const args = [
    '--storage-directory', storageDir,
    '--timeout', String(Number.isFinite(commandTimeoutSeconds) ? commandTimeoutSeconds : 20),
    'any', 'read-by-id',
    clusterIds,
    attributeIds,
    nodeIdDecimal,
    '0xFFFF',
  ];

  const result = await run(args);
  if (result.code !== 0) {
    let reason = summarizeFailure(result);
    if (/CHIP Error 0x00000046|No endpoint was available to send the message/i.test(reason)) {
      reason = `${reason}\nHint: Matter transport endpoint unavailable. Ensure listener is using host networking and IPv6/mDNS is reachable (LISTENER_NETWORK_MODE=host).`;
    }
    throw new Error(`poll read failed for ${nodeIdHex}: ${reason}`);
  }

  const events = parseEvents(`${result.stdout}\n${result.stderr}`, nodeIdHex);
  process.stdout.write(`${JSON.stringify(events)}\n`);
}

main().catch((err) => {
  console.error(`[matter-chiptool] poll failed: ${err.message ?? err}`);
  process.exit(1);
});
