function toNumber(value, fallback = 0) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function toInt(value, fallback = 0) {
  const parsed = Number.parseInt(String(value), 10);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function severityFromScore(absScore) {
  if (absScore >= 5) return 'critical';
  if (absScore >= 4) return 'high';
  return 'medium';
}

function hourLabel(hour) {
  if (hour === 0) return '12am';
  if (hour === 12) return '12pm';
  return hour < 12 ? `${hour}am` : `${hour - 12}pm`;
}

function buildOutlier(scopeType, row) {
  const scopeName = String(row.scope_name ?? '').trim();
  const hour = toInt(row.hour, -1);
  const eventCount = toInt(row.event_count, 0);
  const baselineAvg = toNumber(row.baseline_avg, 0);
  const baselineStd = toNumber(row.baseline_std, 0);
  const baselineDays = toInt(row.baseline_days, 0);

  if (!scopeName || hour < 0 || hour > 23) return null;
  if (baselineDays < 7) return null;

  const spread = Math.max(baselineStd, Math.sqrt(Math.max(baselineAvg, 0)), 1);
  const zScore = (eventCount - baselineAvg) / spread;

  const isSpike = zScore >= 3 && eventCount >= Math.ceil(baselineAvg + 3);
  const isDrop = baselineAvg >= 2 && eventCount === 0;
  if (!isSpike && !isDrop) return null;

  const kind = isSpike ? 'spike' : 'dropoff';
  const score = isSpike ? zScore : Math.max(3, baselineAvg / Math.max(spread, 1));
  const severity = severityFromScore(Math.abs(score));

  const message = isSpike
    ? `${scopeType} activity spike at ${hourLabel(hour)} UTC`
    : `${scopeType} activity drop-off at ${hourLabel(hour)} UTC`;

  return {
    scopeType,
    scopeName,
    hour,
    kind,
    severity,
    score: Number(score.toFixed(2)),
    eventCount,
    baselineAvg: Number(baselineAvg.toFixed(2)),
    baselineStd: Number(baselineStd.toFixed(2)),
    baselineDays,
    message,
  };
}

export function detectOutliers(rows, scopeType) {
  const outliers = [];
  for (const row of rows ?? []) {
    const outlier = buildOutlier(scopeType, row);
    if (outlier) outliers.push(outlier);
  }

  outliers.sort((a, b) => {
    const severityWeight = { critical: 3, high: 2, medium: 1 };
    const severityDiff = severityWeight[b.severity] - severityWeight[a.severity];
    if (severityDiff !== 0) return severityDiff;
    return Math.abs(b.score) - Math.abs(a.score);
  });

  return outliers;
}
