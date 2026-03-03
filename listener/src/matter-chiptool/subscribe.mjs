import { mkdirSync } from 'node:fs';
import { resolve } from 'node:path';
import { spawn } from 'node:child_process';

const storageDir = resolve(process.env.MATTER_CHIP_TOOL_STATE_DIR?.trim() || '/app/data/chip-tool-state');
const commandTimeoutSeconds = Number.parseInt(
  process.env.MATTER_CHIP_TOOL_SUBSCRIBE_TIMEOUT_SEC
    ?? process.env.MATTER_CHIP_TOOL_TIMEOUT_SEC
    ?? '300',
  10
);
const minIntervalSeconds = Number.parseInt(process.env.MATTER_SUBSCRIBE_MIN_INTERVAL_SEC ?? '0', 10);
const maxIntervalSeconds = Number.parseInt(process.env.MATTER_SUBSCRIBE_MAX_INTERVAL_SEC ?? '30', 10);
const endpointCandidates = String(process.env.MATTER_SUBSCRIBE_ENDPOINT_IDS ?? '0xFFFF,1,0')
  .split(',')
  .map((value) => value.trim())
  .filter(Boolean);

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

function shouldTryNextEndpoint(reason) {
  return /Error 0x0000002F|CHIP_ERROR_INVALID_ARGUMENT|Invalid argument|Missing command|Usage:/i.test(reason);
}

function summarizeFailure(lines, code, signal) {
  const useful = lines.filter((line) => /CHIP Error|No endpoint|Run command failure|error|fail|timeout/i.test(line));
  return (useful.slice(-10).join('\n') || lines.slice(-10).join('\n') || `code=${code} signal=${signal}`).trim();
}

function buildArgs(nodeIdDecimal, endpointId) {
  return [
    'any', 'subscribe-by-id',
    clusterIds,
    attributeIds,
    String(Number.isFinite(minIntervalSeconds) && minIntervalSeconds >= 0 ? minIntervalSeconds : 0),
    String(Number.isFinite(maxIntervalSeconds) && maxIntervalSeconds >= 1 ? maxIntervalSeconds : 30),
    nodeIdDecimal,
    endpointId,
    '--keepSubscriptions', 'true',
    '--auto-resubscribe', 'true',
    '--storage-directory', storageDir,
    '--timeout', String(Number.isFinite(commandTimeoutSeconds) ? commandTimeoutSeconds : 300),
  ];
}

async function runSubscribe(nodeIdDecimal, nodeIdHex, endpointId) {
  return new Promise((resolvePromise) => {
    const child = spawn('chip-tool', buildArgs(nodeIdDecimal, endpointId), {
      stdio: ['ignore', 'pipe', 'pipe'],
      env: process.env,
    });

    // chip-tool can emit the same log format on stdout and/or stderr depending on build.
    let stdoutBuffer = '';
    let stderrBuffer = '';
    let current = null;
    const collectedLines = [];
    let emittedCount = 0;

    const headerPattern = /CHIP:TOO:\s*Endpoint:\s*(\d+)\s+Cluster:\s*0x([0-9A-Fa-f_]+)\s+Attribute:?\s*0x([0-9A-Fa-f_]+)/;
    const valuePattern = /CHIP:TOO:\s*([A-Za-z][A-Za-z0-9_-]*)\s*:\s*(.+)$/;

    const pushLine = (line) => {
      const trimmed = line.trim();
      if (!trimmed) return;
      collectedLines.push(trimmed);
      if (collectedLines.length > 300) collectedLines.splice(0, collectedLines.length - 300);

      const headerMatch = trimmed.match(headerPattern);
      if (headerMatch) {
        current = {
          endpointId: Number.parseInt(headerMatch[1], 10),
          clusterId: decodeHex(headerMatch[2]),
          attributeId: decodeHex(headerMatch[3]),
        };
        return;
      }

      if (!current) return;
      const valueMatch = trimmed.match(valuePattern);
      if (!valueMatch) return;

      const key = valueMatch[1];
      const rawValue = valueMatch[2].trim();
      if (!key || key === 'DataVersion') return;
      if (!rawValue || rawValue === '{' || rawValue === '}' || rawValue === '[]') return;

      const labels = clusterLabels[current.clusterId] ?? null;
      const event = {
        nodeId: nodeIdHex,
        endpointId: current.endpointId,
        clusterId: current.clusterId,
        attributeId: current.attributeId,
        serviceType: labels?.serviceType ?? null,
        characteristic: labels?.characteristic ?? key,
        newValue: normalizeValue(rawValue),
      };
      process.stdout.write(`${JSON.stringify(event)}\n`);
      emittedCount += 1;
      current = null;
    };

    const consumeChunk = (chunkText, isStdout) => {
      if (isStdout) stdoutBuffer += chunkText;
      else stderrBuffer += chunkText;

      let buffer = isStdout ? stdoutBuffer : stderrBuffer;
      let newlineIndex = buffer.indexOf('\n');
      while (newlineIndex >= 0) {
        const line = buffer.slice(0, newlineIndex);
        buffer = buffer.slice(newlineIndex + 1);
        pushLine(line);
        newlineIndex = buffer.indexOf('\n');
      }

      if (isStdout) stdoutBuffer = buffer;
      else stderrBuffer = buffer;
    };

    child.stdout.on('data', (chunk) => {
      consumeChunk(chunk.toString(), true);
    });
    child.stderr.on('data', (chunk) => {
      consumeChunk(chunk.toString(), false);
    });

    child.on('error', (err) => {
      collectedLines.push(String(err?.message ?? err));
      resolvePromise({
        code: 1,
        signal: null,
        emittedCount,
        reason: summarizeFailure(collectedLines, 1, null),
      });
    });

    child.on('exit', (code, signal) => {
      if (stdoutBuffer.trim()) pushLine(stdoutBuffer);
      if (stderrBuffer.trim()) pushLine(stderrBuffer);
      resolvePromise({
        code: code ?? 1,
        signal: signal ?? null,
        emittedCount,
        reason: summarizeFailure(collectedLines, code ?? 1, signal ?? null),
      });
    });
  });
}

async function main() {
  const [nodeIdRaw] = process.argv.slice(2);
  const nodeIdDecimal = normalizeNodeId(nodeIdRaw);
  const nodeIdHex = `0X${BigInt(nodeIdDecimal).toString(16).toUpperCase()}`;

  mkdirSync(storageDir, { recursive: true });

  const failures = [];
  for (const endpointId of endpointCandidates.length ? endpointCandidates : ['0xFFFF']) {
    // eslint-disable-next-line no-await-in-loop
    const result = await runSubscribe(nodeIdDecimal, nodeIdHex, endpointId);
    if (result.code === 0) return;
    if (result.emittedCount > 0) {
      // We produced events but the process still exited non-zero (often due transport timeout).
      // Let runtime restart this worker; don't mask the failure reason.
      throw new Error(`subscription exited with events on endpoint ${endpointId}: ${result.reason}`);
    }
    failures.push(`endpoint ${endpointId}: ${result.reason}`);
    if (!shouldTryNextEndpoint(result.reason)) break;
  }

  throw new Error(`subscription failed for ${nodeIdHex}: ${failures.join('\n\n') || 'unknown failure'}`);
}

main().catch((err) => {
  console.error(`[matter-chiptool] subscribe failed: ${err.message ?? err}`);
  process.exit(1);
});
