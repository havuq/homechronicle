import test from 'node:test';
import assert from 'node:assert/strict';
import { processAlertsForEvent } from '../src/alerts.js';

function makeRule(overrides = {}) {
  return {
    id: 1,
    name: 'Motion detected',
    enabled: true,
    scope_type: 'characteristic',
    scope_value: 'MotionDetected',
    characteristic: null,
    operator: 'equals',
    match_value: 'true',
    target_url: 'https://example.test/hook',
    quiet_minutes: 0,
    ...overrides,
  };
}

function makeEvent(overrides = {}) {
  return {
    eventId: 100,
    timestamp: '2026-02-26T12:00:00.000Z',
    accessoryId: 'dev-1',
    accessoryName: 'Hallway Motion',
    roomName: 'Hallway',
    serviceType: 'MotionSensor',
    characteristic: 'MotionDetected',
    oldValue: 'false',
    newValue: 'true',
    rawIid: 12,
    ...overrides,
  };
}

test('processAlertsForEvent records sent delivery for matching rule', async () => {
  const deliveries = [];
  const pool = {
    async query(sql, params = []) {
      if (sql.includes('FROM alert_rules')) return { rows: [makeRule()] };
      if (sql.includes('status = \'sent\'')) return { rows: [] };
      if (sql.startsWith('INSERT INTO alert_deliveries')) {
        deliveries.push({ ruleId: params[0], eventId: params[1], status: params[2], responseCode: params[4] });
        return { rowCount: 1 };
      }
      throw new Error(`Unexpected SQL: ${sql}`);
    },
  };

  const originalFetch = global.fetch;
  global.fetch = async () => ({ ok: true, status: 200 });
  try {
    await processAlertsForEvent(pool, makeEvent());
    assert.equal(deliveries.length, 1);
    assert.equal(deliveries[0].status, 'sent');
    assert.equal(deliveries[0].responseCode, 200);
  } finally {
    global.fetch = originalFetch;
  }
});

test('processAlertsForEvent records suppressed delivery when within quiet period', async () => {
  const deliveries = [];
  const pool = {
    async query(sql, params = []) {
      if (sql.includes('FROM alert_rules')) return { rows: [makeRule({ quiet_minutes: 10 })] };
      if (sql.includes('status = \'sent\'')) {
        return { rows: [{ sent_at: new Date().toISOString() }] };
      }
      if (sql.startsWith('INSERT INTO alert_deliveries')) {
        deliveries.push({ status: params[2], error: params[5] });
        return { rowCount: 1 };
      }
      throw new Error(`Unexpected SQL: ${sql}`);
    },
  };

  const originalFetch = global.fetch;
  let fetchCalls = 0;
  global.fetch = async () => {
    fetchCalls += 1;
    return { ok: true, status: 200 };
  };
  try {
    await processAlertsForEvent(pool, makeEvent());
    assert.equal(fetchCalls, 0);
    assert.equal(deliveries.length, 1);
    assert.equal(deliveries[0].status, 'suppressed');
  } finally {
    global.fetch = originalFetch;
  }
});

test('processAlertsForEvent records failed delivery for non-2xx response', async () => {
  const deliveries = [];
  const pool = {
    async query(sql, params = []) {
      if (sql.includes('FROM alert_rules')) return { rows: [makeRule()] };
      if (sql.includes('status = \'sent\'')) return { rows: [] };
      if (sql.startsWith('INSERT INTO alert_deliveries')) {
        deliveries.push({ status: params[2], responseCode: params[4], error: params[5] });
        return { rowCount: 1 };
      }
      throw new Error(`Unexpected SQL: ${sql}`);
    },
  };

  const originalFetch = global.fetch;
  global.fetch = async () => ({
    ok: false,
    status: 500,
    text: async () => 'upstream failed',
  });
  try {
    await processAlertsForEvent(pool, makeEvent());
    assert.equal(deliveries.length, 1);
    assert.equal(deliveries[0].status, 'failed');
    assert.equal(deliveries[0].responseCode, 500);
  } finally {
    global.fetch = originalFetch;
  }
});

