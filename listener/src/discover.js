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

console.log(`Scanning for HomeKit accessories for ${SCAN_DURATION_MS / 1000}s...\n`);

const discovery = new IPDiscovery();
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
