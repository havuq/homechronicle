/**
 * discover.js — scan the local network for HomeKit accessories via mDNS.
 *
 * Run manually before pairing:
 *   docker compose run --rm listener node src/discover.js
 *
 * Prints a table of found accessories: name, device ID, address, port, pairing status.
 * Use the device ID when running pairing.js.
 */

import { IPDiscovery } from 'hap-controller';

const SCAN_DURATION_MS = 10_000;

// Allow overriding the network interface via env var or CLI arg.
// On macOS with a VPN active, dnssd may bind to the wrong interface.
// Usage: DISCOVER_IFACE=en0 node src/discover.js
const iface = process.env.DISCOVER_IFACE || null;

console.log(`Scanning for HomeKit accessories for ${SCAN_DURATION_MS / 1000}s...`);
if (iface) console.log(`Using interface: ${iface}`);
console.log('');

const discovery = new IPDiscovery(iface);
const found = new Map();

discovery.on('serviceUp', (service) => {
  if (found.has(service.id)) return;
  found.set(service.id, service);

  console.log('Found accessory:');
  console.log(`  Name:       ${service.name}`);
  console.log(`  Device ID:  ${service.id}`);
  console.log(`  Address:    ${service.address}:${service.port}`);
  console.log(`  Category:   ${service.ci ?? 'unknown'}`);
  console.log(`  Paired:     ${service.sf === 0 ? 'yes (already paired)' : 'no (available to pair)'}`);
  console.log('');
});

discovery.start();

setTimeout(() => {
  discovery.stop();
  console.log(`\nScan complete. Found ${found.size} accessory/accessories.`);
  if (found.size > 0) {
    console.log('\nTo pair a device, run:');
    console.log('  docker compose run --rm listener node src/pairing.js <device-id> <pin>');
    console.log('\nExample (PIN format: 111-22-333):');
    const first = found.values().next().value;
    if (first) {
      console.log(`  docker compose run --rm listener node src/pairing.js "${first.id}" "111-22-333"`);
    }
  }
  process.exit(0);
}, SCAN_DURATION_MS);
