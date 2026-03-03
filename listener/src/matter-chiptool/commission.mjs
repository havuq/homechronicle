import { mkdirSync } from 'node:fs';
import { resolve } from 'node:path';
import { spawn } from 'node:child_process';
import { lookup } from 'node:dns/promises';
import { isIP } from 'node:net';

const storageDir = resolve(process.env.MATTER_CHIP_TOOL_STATE_DIR?.trim() || '/app/data/chip-tool-state');
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
    throw new Error('Direct commissioning requires IPv6; IPv4 is not supported');
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
    throw new Error(`Resolved "${text}" but no IPv6 address was found; chip-tool requires IPv6 for direct commissioning`);
  }
  return ipv6;
}

function runCapture(args) {
  return new Promise((resolvePromise, rejectPromise) => {
    const child = spawn('chip-tool', args, {
      stdio: ['ignore', 'pipe', 'pipe'],
      env: process.env,
    });

    let stdout = '';
    let stderr = '';
    child.stdout.on('data', (chunk) => {
      const text = chunk.toString();
      stdout += text;
      process.stderr.write(text); // stream to logs in real time
    });
    child.stderr.on('data', (chunk) => {
      const text = chunk.toString();
      stderr += text;
      process.stderr.write(text);
    });
    child.on('error', rejectPromise);
    child.on('exit', (code, signal) => {
      if (code === 0) return resolvePromise({ stdout, stderr });
      // Extract the most useful error line(s) from chip-tool's verbose output.
      const combined = `${stderr}\n${stdout}`;
      const errorLines = combined.split('\n').filter((l) => /error|fail|timeout/i.test(l));
      const summary = errorLines.slice(-5).join('\n').trim() || combined.slice(-500).trim();
      rejectPromise(new Error(`chip-tool exited code=${code ?? 'null'} signal=${signal ?? 'null'}:\n${summary}`));
    });
  });
}

async function extractPasscodeFromSetupCode(setupCode) {
  const { stdout, stderr } = await runCapture(['payload', 'parse-setup-payload', setupCode]);
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

  mkdirSync(storageDir, { recursive: true });

  // Detect whether setupCode is a QR payload (MT:...) or a numeric Manual Pairing Code.
  const isQrPayload = /^MT:/i.test(setupCode);

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
      if (isQrPayload) {
        chipToolArgs.push('pairing', 'code', nodeId, setupCode, '--use-only-onnetwork-discovery', 'true');
      } else {
        const passcode = await extractPasscodeFromSetupCode(setupCode);
        chipToolArgs.push('pairing', 'onnetwork', nodeId, passcode);
      }
    }
  } else if (isQrPayload) {
    chipToolArgs.push('pairing', 'code', nodeId, setupCode, '--use-only-onnetwork-discovery', 'true');
  } else {
    // Numeric manual pairing code — extract passcode and use onnetwork discovery.
    const passcode = await extractPasscodeFromSetupCode(setupCode);
    chipToolArgs.push('pairing', 'onnetwork', nodeId, passcode);
  }
  chipToolArgs.push('--storage-directory', storageDir);
  chipToolArgs.push('--timeout', String(Number.isFinite(commandTimeoutSeconds) ? commandTimeoutSeconds : 90));
  chipToolArgs.push('--bypass-attestation-verifier', 'true');

  await runCapture(chipToolArgs);
}

main().catch((err) => {
  console.error(`[matter-chiptool] commission failed: ${err.message ?? err}`);
  process.exit(1);
});
