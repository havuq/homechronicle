const ALERTS_WEBHOOK_TIMEOUT_MS = (() => {
  const parsed = Number.parseInt(process.env.ALERTS_WEBHOOK_TIMEOUT_MS ?? '5000', 10);
  if (!Number.isFinite(parsed) || parsed < 500) return 5000;
  return parsed;
})();

function normalizeString(value) {
  return String(value ?? '').trim();
}

function normalizeLower(value) {
  return normalizeString(value).toLowerCase();
}

function eventMatchesScope(rule, event) {
  const scopeType = normalizeLower(rule.scope_type || 'all');
  const scopeValue = normalizeString(rule.scope_value);

  if (scopeType === 'all') return true;

  if (scopeType === 'room') {
    return normalizeLower(event.roomName) === normalizeLower(scopeValue);
  }
  if (scopeType === 'accessory') {
    const target = normalizeLower(scopeValue);
    return normalizeLower(event.accessoryName) === target || normalizeLower(event.accessoryId) === target;
  }
  if (scopeType === 'characteristic') {
    return normalizeLower(event.characteristic) === normalizeLower(scopeValue);
  }
  return false;
}

function eventMatchesCharacteristic(rule, event) {
  const expected = normalizeString(rule.characteristic);
  if (!expected) return true;
  return normalizeLower(event.characteristic) === normalizeLower(expected);
}

function eventMatchesOperator(rule, event) {
  const op = normalizeLower(rule.operator || 'equals');
  const actual = normalizeString(event.newValue);
  const expected = normalizeString(rule.match_value);

  if (op === 'equals') return actual === expected;
  if (op === 'not_equals') return actual !== expected;
  if (op === 'contains') return normalizeLower(actual).includes(normalizeLower(expected));
  return false;
}

function buildPayload(rule, event, firedAt) {
  return {
    type: 'homechronicle.alert',
    firedAt,
    rule: {
      id: rule.id,
      name: rule.name,
      scopeType: rule.scope_type,
      scopeValue: rule.scope_value,
      characteristic: rule.characteristic,
      operator: rule.operator,
      matchValue: rule.match_value,
      quietMinutes: rule.quiet_minutes,
      targetUrl: rule.target_url,
    },
    event: {
      id: event.eventId,
      timestamp: event.timestamp,
      accessoryId: event.accessoryId,
      accessoryName: event.accessoryName,
      roomName: event.roomName,
      serviceType: event.serviceType,
      characteristic: event.characteristic,
      oldValue: event.oldValue,
      newValue: event.newValue,
      rawIid: event.rawIid,
    },
  };
}

async function createDelivery(pool, data) {
  await pool.query(
    `INSERT INTO alert_deliveries
       (rule_id, event_id, status, target_url, response_code, error)
     VALUES ($1, $2, $3, $4, $5, $6)`,
    [
      data.ruleId,
      data.eventId ?? null,
      data.status,
      data.targetUrl,
      data.responseCode ?? null,
      data.error ?? null,
    ]
  );
}

async function isSuppressed(pool, ruleId, quietMinutes) {
  const minutes = Number.parseInt(String(quietMinutes ?? 0), 10);
  if (!Number.isFinite(minutes) || minutes <= 0) return false;

  const result = await pool.query(
    `SELECT sent_at
     FROM alert_deliveries
     WHERE rule_id = $1
       AND status = 'sent'
     ORDER BY sent_at DESC
     LIMIT 1`,
    [ruleId]
  );
  if (!result.rows.length) return false;

  const lastSentAt = new Date(result.rows[0].sent_at).getTime();
  if (!Number.isFinite(lastSentAt)) return false;
  return Date.now() - lastSentAt < minutes * 60_000;
}

async function sendWebhook(rule, event) {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), ALERTS_WEBHOOK_TIMEOUT_MS);

  try {
    const firedAt = new Date().toISOString();
    const payload = buildPayload(rule, event, firedAt);
    const response = await fetch(rule.target_url, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify(payload),
      signal: controller.signal,
    });

    if (!response.ok) {
      const text = (await response.text().catch(() => '')).slice(0, 300);
      return {
        status: 'failed',
        responseCode: response.status,
        error: text || `HTTP ${response.status}`,
      };
    }

    return { status: 'sent', responseCode: response.status };
  } catch (err) {
    return {
      status: 'failed',
      error: err?.name === 'AbortError'
        ? `Webhook timeout after ${ALERTS_WEBHOOK_TIMEOUT_MS}ms`
        : (err?.message ?? 'Webhook request failed'),
    };
  } finally {
    clearTimeout(timeoutId);
  }
}

export async function processAlertsForEvent(pool, event) {
  if (!event?.eventId) return;

  const rulesResult = await pool.query(
    `SELECT id, name, enabled, scope_type, scope_value, characteristic,
            operator, match_value, target_url, quiet_minutes
     FROM alert_rules
     WHERE enabled = TRUE
     ORDER BY id ASC`
  );
  if (!rulesResult.rows.length) return;

  for (const rule of rulesResult.rows) {
    if (!eventMatchesScope(rule, event)) continue;
    if (!eventMatchesCharacteristic(rule, event)) continue;
    if (!eventMatchesOperator(rule, event)) continue;

    const suppressed = await isSuppressed(pool, rule.id, rule.quiet_minutes);
    if (suppressed) {
      await createDelivery(pool, {
        ruleId: rule.id,
        eventId: event.eventId,
        status: 'suppressed',
        targetUrl: rule.target_url,
        error: `Suppressed by quiet period (${rule.quiet_minutes} minute(s))`,
      });
      continue;
    }

    const delivery = await sendWebhook(rule, event);
    await createDelivery(pool, {
      ruleId: rule.id,
      eventId: event.eventId,
      status: delivery.status,
      targetUrl: rule.target_url,
      responseCode: delivery.responseCode,
      error: delivery.error,
    });
  }
}
