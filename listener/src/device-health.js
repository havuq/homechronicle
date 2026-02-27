function clamp(value, min, max) {
  if (!Number.isFinite(value)) return null;
  return Math.min(max, Math.max(min, value));
}

export function normalizeHeartbeatSeconds(rawSeconds) {
  return clamp(Number(rawSeconds), 60, 7 * 24 * 60 * 60);
}

function safeSecondsBetween(nowMs, isoTs) {
  if (!isoTs) return null;
  const thenMs = new Date(isoTs).getTime();
  if (!Number.isFinite(thenMs)) return null;
  return Math.max(0, Math.floor((nowMs - thenMs) / 1000));
}

export function deriveDeviceHealth({
  lastSeen = null,
  pairedAt = null,
  heartbeatSeconds = null,
  heartbeatSamples = 0,
  staleThresholdSeconds = 12 * 60 * 60,
  now = Date.now(),
} = {}) {
  const nowMs = Number.isFinite(now) ? now : Date.now();
  const normalizedHeartbeat = normalizeHeartbeatSeconds(heartbeatSeconds);
  const offlineDurationSeconds = safeSecondsBetween(nowMs, lastSeen);
  const configuredStaleThresholdSeconds = clamp(Number(staleThresholdSeconds), 60, 30 * 24 * 60 * 60)
    ?? 12 * 60 * 60;

  const hasReliableHeartbeat = Number.isFinite(normalizedHeartbeat) && Number(heartbeatSamples) >= 3;
  const baselineSeconds = hasReliableHeartbeat ? normalizedHeartbeat : null;

  const onlineThresholdSeconds = baselineSeconds
    ? Math.max(Math.floor(baselineSeconds * 2), 5 * 60)
    : 15 * 60;

  const staleThreshold = baselineSeconds
    ? Math.max(Math.floor(baselineSeconds * 6), configuredStaleThresholdSeconds)
    : configuredStaleThresholdSeconds;

  let status = 'unknown';
  let missedHeartbeats = 0;
  let staleReason = null;

  if (offlineDurationSeconds == null) {
    const pairedAgeSeconds = safeSecondsBetween(nowMs, pairedAt);
    if (pairedAgeSeconds != null && pairedAgeSeconds >= staleThreshold) {
      status = 'stale';
      staleReason = 'paired but never produced events';
    }
  } else {
    if (baselineSeconds) {
      missedHeartbeats = Math.max(0, Math.floor(offlineDurationSeconds / baselineSeconds) - 1);
    }

    if (offlineDurationSeconds <= onlineThresholdSeconds) {
      status = 'online';
    } else if (offlineDurationSeconds >= staleThreshold) {
      status = 'stale';
      staleReason = baselineSeconds
        ? `no events for ${missedHeartbeats} expected heartbeat interval(s)`
        : 'no recent events';
    } else {
      status = 'offline';
    }
  }

  return {
    status,
    heartbeatSeconds: baselineSeconds,
    heartbeatSamples: Number.isFinite(Number(heartbeatSamples)) ? Number(heartbeatSamples) : 0,
    onlineThresholdSeconds,
    staleThresholdSeconds: staleThreshold,
    offlineDurationSeconds,
    missedHeartbeats,
    isStale: status === 'stale',
    staleReason,
  };
}
