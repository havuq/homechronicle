/**
 * discover.mjs — scan the network for commissionable Matter devices via chip-tool.
 *
 * Outputs a JSON array of discovered devices to stdout.
 * Used by matter-runtime.js scan() — same pattern as poll.mjs / commission.mjs.
 */

import { spawn } from 'node:child_process';
import { resolve } from 'node:path';
import { mkdirSync } from 'node:fs';

const SCAN_TIMEOUT_SEC = Number.parseInt(process.env.MATTER_SCAN_TIMEOUT_SEC ?? '10', 10);
const storageDir = resolve(process.env.MATTER_CHIP_TOOL_STATE_DIR?.trim() || '/app/data/chip-tool-state');

mkdirSync(storageDir, { recursive: true });

/**
 * Parse chip-tool discover commissionables output.
 *
 * chip-tool prints blocks like:
 *
 *   CHIP:DIS: Commissionable Node:
 *   CHIP:DIS:   Instance Name: ABC123
 *   CHIP:DIS:   Hostname: device-abc
 *   CHIP:DIS:   Long Discriminator: 3840
 *   CHIP:DIS:   Vendor ID: 4996
 *   CHIP:DIS:   Product ID: 32773
 *   CHIP:DIS:   Device Type: 256
 *   CHIP:DIS:   Device Name: My Device
 *   CHIP:DIS:   Pairing Hint: 33
 *   CHIP:DIS:   IP Address: fd53::1234
 *   CHIP:DIS:   Port: 5540
 */
function parseDiscoverOutput(text) {
  const devices = new Map();
  const blocks = text.split(/Commissionable Node:/i).slice(1);

  for (const block of blocks) {
    const field = (key) => {
      const re = new RegExp(`${key}\\s*:\\s*(.+)`, 'i');
      const m = block.match(re);
      return m?.[1]?.trim() ?? null;
    };

    const instanceName = field('Instance Name');
    if (!instanceName) continue;

    // Deduplicate by instance name (chip-tool may report the same device multiple times)
    if (devices.has(instanceName)) {
      // Merge additional IP addresses
      const existing = devices.get(instanceName);
      const newAddr = field('IP Address');
      if (newAddr && !existing.addresses.includes(newAddr)) {
        existing.addresses.push(newAddr);
      }
      continue;
    }

    // Collect all IP addresses from this block
    const ipMatches = [...block.matchAll(/IP Address.*?:\s*(.+)/gi)];
    const addresses = ipMatches.map((m) => m[1].trim()).filter(Boolean);

    // Prefer an IPv4 address for display, fall back to first IPv6
    const ipv4 = addresses.find((a) => /^\d+\.\d+\.\d+\.\d+$/.test(a));
    const primaryAddress = ipv4 ?? addresses[0] ?? null;

    const portRaw = field('Port');
    const port = portRaw ? Number.parseInt(portRaw, 10) : null;
    const discriminator = field('Long Discriminator');
    const vendorId = field('Vendor ID');
    const productId = field('Product ID');
    const deviceType = field('Device Type');
    const deviceName = field('Device Name');
    const hostname = field('Hostname');

    devices.set(instanceName, {
      instanceName,
      hostname: hostname ?? null,
      deviceName: deviceName ?? null,
      discriminator: discriminator ? Number.parseInt(discriminator, 10) : null,
      vendorId: vendorId ? Number.parseInt(vendorId, 10) : null,
      productId: productId ? Number.parseInt(productId, 10) : null,
      deviceType: deviceType ? Number.parseInt(deviceType, 10) : null,
      address: primaryAddress,
      addresses,
      port: Number.isFinite(port) ? port : null,
      commissionable: true,
    });
  }

  return [...devices.values()];
}

async function main() {
  const args = [
    'discover', 'commissionables',
    '--storage-directory', storageDir,
  ];

  return new Promise((resolvePromise) => {
    const child = spawn('chip-tool', args, {
      stdio: ['ignore', 'pipe', 'pipe'],
      env: process.env,
    });

    let stdout = '';
    let stderr = '';

    child.stdout.on('data', (chunk) => { stdout += chunk.toString(); });
    child.stderr.on('data', (chunk) => { stderr += chunk.toString(); });

    // chip-tool discover runs indefinitely; kill after scan timeout.
    const timer = setTimeout(() => {
      child.kill('SIGTERM');
    }, (SCAN_TIMEOUT_SEC + 1) * 1000);

    child.on('exit', () => {
      clearTimeout(timer);
      const combined = `${stdout}\n${stderr}`;
      const devices = parseDiscoverOutput(combined);
      console.log(JSON.stringify(devices));
    });

    child.on('error', (err) => {
      clearTimeout(timer);
      process.stderr.write(`[matter-discover] Error: ${err.message}\n`);
      console.log(JSON.stringify([]));
    });
  });
}

main().catch((err) => {
  process.stderr.write(`[matter-discover] Failed: ${err.message ?? err}\n`);
  console.log(JSON.stringify([]));
  process.exit(1);
});
