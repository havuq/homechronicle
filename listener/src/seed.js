/**
 * seed.js — insert fake HomeKit events for local UI development.
 *
 * Run once after `docker compose up postgres`:
 *   docker compose run --rm listener node src/seed.js
 *
 * This is only useful locally where mDNS doesn't reach real accessories.
 */

import pg from 'pg';

const { Pool } = pg;

const pool = new Pool({ connectionString: process.env.DATABASE_URL });

const ACCESSORIES = [
  { id: 'AA:11:22:33:44:01', name: 'Living Room Light',   room: 'Living Room', service: 'Lightbulb' },
  { id: 'AA:11:22:33:44:02', name: 'Kitchen Light',       room: 'Kitchen',     service: 'Lightbulb' },
  { id: 'AA:11:22:33:44:03', name: 'Front Door Lock',     room: 'Entryway',    service: 'LockMechanism' },
  { id: 'AA:11:22:33:44:04', name: 'Motion Sensor',       room: 'Hallway',     service: 'MotionSensor' },
  { id: 'AA:11:22:33:44:05', name: 'Thermostat',          room: 'Living Room', service: 'Thermostat' },
  { id: 'AA:11:22:33:44:06', name: 'Garage Door',         room: 'Garage',      service: 'GarageDoorOpener' },
  { id: 'AA:11:22:33:44:07', name: 'Bedroom Light',       room: 'Bedroom',     service: 'Lightbulb' },
  { id: 'AA:11:22:33:44:08', name: 'Contact Sensor',      room: 'Back Door',   service: 'ContactSensor' },
];

const EVENTS = [
  { characteristic: 'On',                 values: ['true', 'false'] },
  { characteristic: 'MotionDetected',     values: ['true', 'false'] },
  { characteristic: 'LockCurrentState',   values: ['0', '1'] },
  { characteristic: 'CurrentDoorState',   values: ['0', '1', '2', '3'] },
  { characteristic: 'CurrentTemperature', values: ['19.5', '20.0', '21.3', '22.1', '23.0'] },
  { characteristic: 'ContactSensorState', values: ['0', '1'] },
];

function randomElement(arr) {
  return arr[Math.floor(Math.random() * arr.length)];
}

function randomDate(daysAgo) {
  const now = Date.now();
  const start = now - daysAgo * 24 * 60 * 60 * 1000;
  return new Date(start + Math.random() * (now - start));
}

async function seed() {
  console.log('Seeding fake events...');

  // Check if already seeded
  const existing = await pool.query('SELECT COUNT(*) AS n FROM event_logs');
  if (parseInt(existing.rows[0].n, 10) > 0) {
    console.log(`DB already has ${existing.rows[0].n} rows — skipping seed.`);
    console.log('To re-seed: TRUNCATE event_logs; then run this script again.');
    await pool.end();
    return;
  }

  const rows = [];
  for (let i = 0; i < 500; i++) {
    const acc = randomElement(ACCESSORIES);
    const evt = randomElement(EVENTS);
    rows.push({
      accessory_id:   acc.id,
      accessory_name: acc.name,
      room_name:      acc.room,
      service_type:   acc.service,
      characteristic: evt.characteristic,
      new_value:      randomElement(evt.values),
      timestamp:      randomDate(30),
    });
  }

  // Sort by timestamp so they're inserted in order
  rows.sort((a, b) => a.timestamp - b.timestamp);

  for (const row of rows) {
    await pool.query(
      `INSERT INTO event_logs
         (timestamp, accessory_id, accessory_name, room_name, service_type, characteristic, new_value)
       VALUES ($1, $2, $3, $4, $5, $6, $7)`,
      [row.timestamp, row.accessory_id, row.accessory_name, row.room_name,
       row.service_type, row.characteristic, row.new_value]
    );
  }

  console.log(`Inserted ${rows.length} fake events across the last 30 days.`);
  await pool.end();
}

seed().catch((err) => {
  console.error('Seed failed:', err.message);
  process.exit(1);
});
