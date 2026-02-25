import test from 'node:test';
import assert from 'node:assert/strict';
import { createEventsRouter } from '../src/events-router.js';

function getRouteHandler(router, method, path) {
  for (const layer of router.stack) {
    if (!layer.route) continue;
    if (layer.route.path !== path) continue;
    if (!layer.route.methods[method.toLowerCase()]) continue;
    return layer.route.stack[0].handle;
  }
  throw new Error(`Route not found: ${method} ${path}`);
}

async function invoke(handler, query = {}) {
  let statusCode = 200;
  let jsonBody = null;
  const req = { query };
  const res = {
    status(code) {
      statusCode = code;
      return this;
    },
    json(body) {
      jsonBody = body;
      return this;
    },
  };
  await handler(req, res);
  return { statusCode, jsonBody };
}

test('/api/events orders by timestamp and id descending', async () => {
  const sqlSeen = [];
  const pool = {
    async query(sql) {
      sqlSeen.push(sql);
      if (sql.includes('COUNT(*) AS total')) return { rows: [{ total: '1' }] };
      return { rows: [{ id: 42, timestamp: '2026-02-20T12:00:00.000Z', accessory_id: 'a1', accessory_name: 'Lamp', room_name: null, service_type: 'Lightbulb', characteristic: 'On', old_value: 'false', new_value: 'true', raw_iid: 1 }] };
    },
  };

  const router = createEventsRouter({ pool, getRooms: () => ({}) });
  const handler = getRouteHandler(router, 'GET', '/events');
  const response = await invoke(handler, { page: '1', limit: '50' });
  assert.equal(response.statusCode, 200);
  assert.equal(response.jsonBody.events.length, 1);

  const selectSql = sqlSeen.find((sql) => sql.includes('LIMIT'));
  assert.ok(selectSql.includes('ORDER BY timestamp DESC, id DESC'));
});

test('/api/events/jump uses deterministic tie-breaker for timestamp ties', async () => {
  const calls = [];
  const pool = {
    async query(sql, params) {
      calls.push({ sql, params });
      if (sql.includes('SELECT id, timestamp')) {
        return { rows: [{ id: 19, timestamp: '2026-02-20T12:00:00.000Z' }] };
      }
      if (sql.includes('COUNT(*) AS newer')) {
        return { rows: [{ newer: '4' }] };
      }
      throw new Error('Unexpected SQL');
    },
  };

  const router = createEventsRouter({ pool, getRooms: () => ({}) });
  const handler = getRouteHandler(router, 'GET', '/events/jump');
  const response = await invoke(handler, { accessory: 'Lamp', hour: '12', limit: '2' });
  assert.equal(response.statusCode, 200);
  assert.equal(response.jsonBody.page, 3);
  assert.equal(response.jsonBody.eventId, '19');

  const countCall = calls.find((entry) => entry.sql.includes('COUNT(*) AS newer'));
  assert.ok(countCall.sql.includes('(timestamp > $1 OR (timestamp = $1 AND id > $2))'));
  assert.equal(countCall.params[1], 19);
});
