import test from 'node:test';
import assert from 'node:assert/strict';
import { createAlertsRouter } from '../src/alerts-router.js';

function getRouteHandler(router, method, path) {
  for (const layer of router.stack) {
    if (!layer.route) continue;
    if (layer.route.path !== path) continue;
    if (!layer.route.methods[method.toLowerCase()]) continue;
    return layer.route.stack[0].handle;
  }
  throw new Error(`Route not found: ${method} ${path}`);
}

async function invoke(handler, { query = {}, params = {}, body = {} } = {}) {
  let statusCode = 200;
  let jsonBody = null;
  const req = { query, params, body };
  const res = {
    status(code) {
      statusCode = code;
      return this;
    },
    json(payload) {
      jsonBody = payload;
      return this;
    },
  };
  await handler(req, res);
  return { statusCode, jsonBody };
}

function createMockPool() {
  const rules = [];
  const deliveries = [{
    id: 1,
    rule_id: 1,
    event_id: 90,
    status: 'sent',
    target_url: 'https://example.test/hook',
    response_code: 200,
    error: null,
    sent_at: '2026-02-26T10:00:00.000Z',
    rule_name: 'Door Opened',
  }];
  let nextRuleId = 1;

  return {
    async query(sql, params = []) {
      if (sql.includes('FROM alert_rules') && sql.includes('ORDER BY updated_at DESC')) {
        return { rows: [...rules].sort((a, b) => b.id - a.id) };
      }
      if (sql.startsWith('INSERT INTO alert_rules')) {
        const row = {
          id: nextRuleId++,
          name: params[0],
          enabled: params[1],
          scope_type: params[2],
          scope_value: params[3],
          characteristic: params[4],
          operator: params[5],
          match_value: params[6],
          target_url: params[7],
          quiet_minutes: params[8],
          created_at: '2026-02-26T10:00:00.000Z',
          updated_at: '2026-02-26T10:00:00.000Z',
        };
        rules.push(row);
        return { rows: [row] };
      }
      if (sql.startsWith('UPDATE alert_rules')) {
        const id = params.at(-1);
        const existing = rules.find((r) => r.id === id);
        if (!existing) return { rows: [] };
        if (sql.includes('enabled = $1')) {
          existing.enabled = params[0];
        }
        existing.updated_at = '2026-02-26T11:00:00.000Z';
        return { rows: [existing] };
      }
      if (sql.startsWith('DELETE FROM alert_rules')) {
        const before = rules.length;
        const next = rules.filter((r) => r.id !== params[0]);
        rules.length = 0;
        rules.push(...next);
        return { rowCount: before - next.length };
      }
      if (sql.includes('COUNT(*)::int AS total FROM alert_deliveries')) {
        return { rows: [{ total: deliveries.length }] };
      }
      if (sql.includes('FROM alert_deliveries d')) {
        return { rows: deliveries };
      }
      throw new Error(`Unexpected SQL: ${sql}`);
    },
  };
}

test('/api/alerts/rules supports create/list/patch/delete', async () => {
  const router = createAlertsRouter({ pool: createMockPool() });
  const post = getRouteHandler(router, 'POST', '/rules');
  const list = getRouteHandler(router, 'GET', '/rules');
  const patch = getRouteHandler(router, 'PATCH', '/rules/:id');
  const del = getRouteHandler(router, 'DELETE', '/rules/:id');

  const created = await invoke(post, {
    body: {
      name: 'Door opened',
      scopeType: 'characteristic',
      scopeValue: 'ContactSensorState',
      operator: 'equals',
      matchValue: 'true',
      targetUrl: 'https://example.test/hook',
      quietMinutes: 5,
    },
  });
  assert.equal(created.statusCode, 201);
  assert.equal(created.jsonBody.name, 'Door opened');

  const listed = await invoke(list);
  assert.equal(listed.statusCode, 200);
  assert.equal(listed.jsonBody.length, 1);

  const updated = await invoke(patch, {
    params: { id: String(created.jsonBody.id) },
    body: { enabled: false },
  });
  assert.equal(updated.statusCode, 200);
  assert.equal(updated.jsonBody.enabled, false);

  const deleted = await invoke(del, {
    params: { id: String(created.jsonBody.id) },
  });
  assert.equal(deleted.statusCode, 200);
  assert.equal(deleted.jsonBody.success, true);
});

test('/api/alerts/rules validates bad payloads', async () => {
  const router = createAlertsRouter({ pool: createMockPool() });
  const post = getRouteHandler(router, 'POST', '/rules');

  const invalid = await invoke(post, {
    body: {
      name: 'Bad rule',
      scopeType: 'all',
      operator: 'bogus',
      matchValue: 'true',
      targetUrl: 'https://example.test/hook',
    },
  });
  assert.equal(invalid.statusCode, 400);
  assert.match(invalid.jsonBody.error, /operator/i);
});

test('/api/alerts/deliveries returns paginated response', async () => {
  const router = createAlertsRouter({ pool: createMockPool() });
  const handler = getRouteHandler(router, 'GET', '/deliveries');

  const response = await invoke(handler, { query: { page: '1', limit: '50' } });
  assert.equal(response.statusCode, 200);
  assert.equal(response.jsonBody.total, 1);
  assert.equal(response.jsonBody.deliveries.length, 1);
  assert.equal(response.jsonBody.deliveries[0].status, 'sent');
});

