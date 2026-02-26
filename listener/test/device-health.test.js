import test from 'node:test';
import assert from 'node:assert/strict';
import { deriveDeviceHealth } from '../src/device-health.js';

test('deriveDeviceHealth marks active device as online', () => {
  const now = new Date('2026-02-26T18:00:00.000Z').getTime();
  const health = deriveDeviceHealth({
    lastSeen: '2026-02-26T17:55:00.000Z',
    heartbeatSeconds: 300,
    heartbeatSamples: 10,
    now,
  });

  assert.equal(health.status, 'online');
  assert.equal(health.missedHeartbeats, 0);
  assert.equal(health.isStale, false);
});

test('deriveDeviceHealth reports offline and missed heartbeats', () => {
  const now = new Date('2026-02-26T18:00:00.000Z').getTime();
  const health = deriveDeviceHealth({
    lastSeen: '2026-02-26T16:00:00.000Z',
    heartbeatSeconds: 600,
    heartbeatSamples: 12,
    now,
  });

  assert.equal(health.status, 'offline');
  assert.equal(health.offlineDurationSeconds, 7200);
  assert.equal(health.missedHeartbeats, 11);
  assert.equal(health.isStale, false);
});

test('deriveDeviceHealth marks stale when paired device never emits', () => {
  const now = new Date('2026-02-26T18:00:00.000Z').getTime();
  const health = deriveDeviceHealth({
    pairedAt: '2026-02-25T00:00:00.000Z',
    now,
  });

  assert.equal(health.status, 'stale');
  assert.equal(health.isStale, true);
  assert.match(health.staleReason, /never produced events/i);
});
