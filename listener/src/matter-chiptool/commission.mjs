import { mkdirSync } from 'node:fs';
import { resolve } from 'node:path';
import { spawn } from 'node:child_process';
import { lookup } from 'node:dns/promises';
import { isIP } from 'node:net';

const explicitStateDir = process.env.MATTER_CHIP_TOOL_STATE_DIR?.trim() || null;
const volumeName = process.env.MATTER_CHIP_TOOL_VOLUME || 'hc-chiptool-state';
const chipToolImage = process.env.MATTER_CHIP_TOOL_IMAGE || 'atios/chip-tool:latest';
const commandTimeoutSeconds = Number.parseInt(process.env.MATTER_CHIP_TOOL_TIMEOUT_SEC ?? '90', 10);

function normalizeNodeId(raw) {
  const text = String(raw ?? '').trim();
  if (!text) throw new Error('nodeId is required');
  let value;
  if (/^0x/i.test(text)) value = BigInt(text);
  else value = BigInt(text);
  if (value <= 0n) throw new Error('nodeId must be > 0');
  return value.toString(10);
}

function toOptionalText(raw) {
  const text = String(raw ?? '').trim();
  return text || null;
}

function toPort(raw) {
  const text = String(raw ?? '').trim();
  if (!text) throw new Error('port is required when address is provided');
  const value = Number.parseInt(text, 10);
  if (!Number.isFinite(value) || value < 1 || value > 65535) {
    throw new Error('port must be an integer between 1 and 65535');
  }
  return value;
}

async function resolveAddress(raw) {
  const text = String(raw ?? '').trim();
  if (!text) throw new Error('address is required');
  const debracketed = text.replace(/^\[([^\]]+)\]$/, '$1').replace(/\.$/, '');
  if (isIP(debracketed) === 6) return debracketed;
  if (isIP(debracketed) === 4) {
    throw new Error('Direct commissioning requires IPv6 for this chip-tool image; IPv4 is not supported');
  }

  let records;
  try {
    records = await lookup(debracketed, { all: true, verbatim: true });
  } catch {
    throw new Error(
      `Could not resolve "${text}" to an IP. If this is a Matter .local host, run "dns-sd -G v6 ${debracketed}" and use that IPv6 address.`
    );
  }

  const ipv6 = records.find((row) => row.family === 6)?.address ?? null;
  if (!ipv6) {
    throw new Error(`Resolved "${text}" but no IPv6 address was found; this chip-tool image requires IPv6 for direct commissioning`);
  }
  return ipv6;
}

function run(command, args) {
  return new Promise((resolvePromise, rejectPromise) => {
    const child = spawn(command, args, {
      stdio: 'inherit',
      env: process.env,
    });
    child.on('error', rejectPromise);
    child.on('exit', (code, signal) => {
      if (code === 0) return resolvePromise();
      rejectPromise(new Error(`chip-tool exited code=${code ?? 'null'} signal=${signal ?? 'null'}`));
    });
  });
}

function runCapture(command, args) {
  return new Promise((resolvePromise, rejectPromise) => {
    const child = spawn(command, args, {
      stdio: ['ignore', 'pipe', 'pipe'],
      env: process.env,
    });

    let stdout = '';
    let stderr = '';
    child.stdout.on('data', (chunk) => { stdout += chunk.toString(); });
    child.stderr.on('data', (chunk) => { stderr += chunk.toString(); });
    child.on('error', rejectPromise);
    child.on('exit', (code, signal) => {
      if (code === 0) return resolvePromise({ stdout, stderr });
      rejectPromise(new Error(`chip-tool exited code=${code ?? 'null'} signal=${signal ?? 'null'}: ${stderr || stdout}`));
    });
  });
}

async function extractPasscodeFromSetupCode(setupCode) {
  const args = [
    'run', '--rm',
    '--platform', 'linux/amd64',
    chipToolImage,
    'payload', 'parse-setup-payload',
    setupCode,
  ];

  const { stdout, stderr } = await runCapture('docker', args);
  const combined = `${stdout}\n${stderr}`;
  const match = combined.match(/Passcode:\s+([0-9]+)/i);
  if (!match) {
    throw new Error('Could not extract setup pin code from setupCode');
  }
  return match[1];
}

async function main() {
  const [nodeIdRaw, setupCodeRaw, addressRaw, portRaw] = process.argv.slice(2);
  const nodeId = normalizeNodeId(nodeIdRaw);
  const setupCode = String(setupCodeRaw ?? '').trim();
  const address = toOptionalText(addressRaw);
  const port = toOptionalText(portRaw);

  if (!setupCode) {
    throw new Error('setupCode is required');
  }

  if (explicitStateDir) mkdirSync(explicitStateDir, { recursive: true });

  const chipToolArgs = [];
  if (address || port) {
    if (!address || !port) {
      throw new Error('address and port must both be provided for direct commissioning');
    }
    try {
      const setupPinCode = await extractPasscodeFromSetupCode(setupCode);
      const resolvedAddress = await resolveAddress(address);
      chipToolArgs.push('pairing', 'already-discovered', nodeId, setupPinCode, resolvedAddress, String(toPort(port)));
    } catch (err) {
      console.warn(`[matter-chiptool] direct commissioning unavailable (${err.message ?? err}); falling back to on-network discovery`);
      chipToolArgs.push('pairing', 'code', nodeId, setupCode, '--use-only-onnetwork-discovery', 'true');
    }
  } else {
    chipToolArgs.push('pairing', 'code', nodeId, setupCode, '--use-only-onnetwork-discovery', 'true');
  }
  chipToolArgs.push('--storage-directory', '/chipdata');
  chipToolArgs.push('--timeout', String(Number.isFinite(commandTimeoutSeconds) ? commandTimeoutSeconds : 90));

  const volumeArg = explicitStateDir
    ? `${resolve(explicitStateDir)}:/chipdata`
    : `${volumeName}:/chipdata`;

  const args = [
    'run', '--rm',
    '--network', 'host',
    '--platform', 'linux/amd64',
    '-v', volumeArg,
    chipToolImage,
    ...chipToolArgs,
  ];

  await run('docker', args);
}

main().catch((err) => {
  console.error(`[matter-chiptool] commission failed: ${err.message ?? err}`);
  process.exit(1);
});
