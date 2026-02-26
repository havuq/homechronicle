import test from 'node:test';
import assert from 'node:assert/strict';
import { detectOutliers } from '../src/anomaly-detection.js';

test('detectOutliers flags spike anomalies', () => {
  const rows = [{
    scope_name: 'Kitchen Light',
    hour: 22,
    event_count: 19,
    baseline_avg: 3.2,
    baseline_std: 1.1,
    baseline_days: 30,
  }];

  const outliers = detectOutliers(rows, 'device');
  assert.equal(outliers.length, 1);
  assert.equal(outliers[0].kind, 'spike');
  assert.equal(outliers[0].scopeName, 'Kitchen Light');
  assert.equal(outliers[0].scopeType, 'device');
});

test('detectOutliers flags drop-offs for active baselines', () => {
  const rows = [{
    scope_name: 'Living Room',
    hour: 8,
    event_count: 0,
    baseline_avg: 5,
    baseline_std: 1,
    baseline_days: 28,
  }];

  const outliers = detectOutliers(rows, 'room');
  assert.equal(outliers.length, 1);
  assert.equal(outliers[0].kind, 'dropoff');
  assert.equal(outliers[0].scopeType, 'room');
});

test('detectOutliers ignores weak baselines', () => {
  const rows = [{
    scope_name: 'Porch Sensor',
    hour: 2,
    event_count: 5,
    baseline_avg: 1,
    baseline_std: 2,
    baseline_days: 4,
  }];

  const outliers = detectOutliers(rows, 'device');
  assert.equal(outliers.length, 0);
});
