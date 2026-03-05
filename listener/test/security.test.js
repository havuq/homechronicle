import test from 'node:test';
import assert from 'node:assert/strict';
import {
  resolveAndValidateWebhookTarget,
  secureTokenEquals,
  validateWebhookTargetUrl,
} from '../src/security.js';

test('secureTokenEquals uses exact token match semantics', () => {
  assert.equal(secureTokenEquals('abc123', 'abc123'), true);
  assert.equal(secureTokenEquals('abc123', 'ABC123'), false);
  assert.equal(secureTokenEquals('abc123', 'abc1234'), false);
  assert.equal(secureTokenEquals('', 'abc123'), false);
});

test('validateWebhookTargetUrl blocks localhost and loopback IP targets', () => {
  const localhost = validateWebhookTargetUrl('http://localhost:8080/hook');
  const loopback = validateWebhookTargetUrl('http://127.0.0.1:8080/hook');
  const loopbackV6 = validateWebhookTargetUrl('http://[::1]/hook');

  assert.equal(localhost.ok, false);
  assert.match(localhost.error, /localhost/i);
  assert.equal(loopback.ok, false);
  assert.match(loopback.error, /loopback/i);
  assert.equal(loopbackV6.ok, false);
  assert.match(loopbackV6.error, /loopback/i);
});

test('validateWebhookTargetUrl can block private ranges when policy disabled', () => {
  const blocked = validateWebhookTargetUrl('http://192.168.1.50/hook', { allowPrivateTargets: false });
  const allowed = validateWebhookTargetUrl('http://192.168.1.50/hook', { allowPrivateTargets: true });

  assert.equal(blocked.ok, false);
  assert.match(blocked.error, /private/i);
  assert.equal(allowed.ok, true);
});

test('resolveAndValidateWebhookTarget blocks DNS targets resolving to loopback/private IPs', async () => {
  const resolvedLoopback = await resolveAndValidateWebhookTarget('https://alerts.example/hook', {
    allowPrivateTargets: false,
    lookup: async () => [{ address: '127.0.0.1' }],
  });
  assert.equal(resolvedLoopback.ok, false);
  assert.match(resolvedLoopback.error, /loopback/i);

  const resolvedPrivate = await resolveAndValidateWebhookTarget('https://alerts.example/hook', {
    allowPrivateTargets: false,
    lookup: async () => [{ address: '10.0.0.7' }],
  });
  assert.equal(resolvedPrivate.ok, false);
  assert.match(resolvedPrivate.error, /private/i);

  const resolvedPublic = await resolveAndValidateWebhookTarget('https://alerts.example/hook', {
    allowPrivateTargets: false,
    lookup: async () => [{ address: '93.184.216.34' }],
  });
  assert.equal(resolvedPublic.ok, true);
});
