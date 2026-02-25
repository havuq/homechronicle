import test from 'node:test';
import assert from 'node:assert/strict';
import { __testHooks } from '../src/subscriber.js';

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

test('scheduleReconnect refreshes pairing before reconnecting', async () => {
  __testHooks.resetState();
  __testHooks.setReconnectWindow(5, 20);

  let reconnectedWith = null;
  __testHooks.setConnectAccessoryImpl((_session, pairing) => {
    reconnectedWith = pairing;
  });

  const session = {
    stopped: false,
    deviceId: 'dev-1',
    retryDelayMs: 5,
    reconnectTimeout: null,
    getPairing: () => ({ name: 'Device', address: '10.0.0.2', port: 5678 }),
  };
  const initialPairing = { name: 'Device', address: '10.0.0.1', port: 1234 };

  __testHooks.scheduleReconnect(session, initialPairing);
  await sleep(30);

  assert.equal(session.retryDelayMs, 10);
  assert.equal(reconnectedWith.address, '10.0.0.2');
  assert.equal(reconnectedWith.port, 5678);

  __testHooks.resetState();
});

test('scheduleReconnect stops growth at max reconnect delay', () => {
  __testHooks.resetState();
  __testHooks.setReconnectWindow(5, 20);
  __testHooks.setConnectAccessoryImpl(() => {});

  const session = {
    stopped: false,
    deviceId: 'dev-2',
    retryDelayMs: 20,
    reconnectTimeout: null,
  };

  __testHooks.scheduleReconnect(session, { name: 'Device', address: 'x', port: 1 });
  assert.equal(session.retryDelayMs, 20);
  clearTimeout(session.reconnectTimeout);
  session.stopped = true;

  __testHooks.resetState();
});
