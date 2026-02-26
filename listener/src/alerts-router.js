import express from 'express';
import { parseIntInRange } from './events-router.js';

const VALID_SCOPE_TYPES = new Set(['all', 'room', 'accessory', 'characteristic']);
const VALID_OPERATORS = new Set(['equals', 'not_equals', 'contains']);

function parseScopeType(value) {
  const scopeType = String(value ?? 'all').trim().toLowerCase();
  return VALID_SCOPE_TYPES.has(scopeType) ? scopeType : null;
}

function parseOperator(value) {
  const operator = String(value ?? 'equals').trim().toLowerCase();
  return VALID_OPERATORS.has(operator) ? operator : null;
}

function parseQuietMinutes(value, fallback = 0) {
  const parsed = Number.parseInt(String(value ?? ''), 10);
  if (!Number.isFinite(parsed)) return fallback;
  if (parsed < 0 || parsed > 10080) return null;
  return parsed;
}

function parseUrl(value) {
  const url = String(value ?? '').trim();
  if (!url) return null;
  try {
    const parsed = new URL(url);
    if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') return null;
    return parsed.toString();
  } catch {
    return null;
  }
}

function validateCreate(body = {}) {
  const name = String(body.name ?? '').trim();
  if (!name) return { error: 'name is required' };

  const scopeType = parseScopeType(body.scopeType);
  if (!scopeType) return { error: 'scopeType must be one of: all, room, accessory, characteristic' };

  const scopeValue = String(body.scopeValue ?? '').trim();
  if (scopeType !== 'all' && !scopeValue) return { error: 'scopeValue is required for this scopeType' };

  const characteristic = String(body.characteristic ?? '').trim() || null;
  const operator = parseOperator(body.operator);
  if (!operator) return { error: 'operator must be one of: equals, not_equals, contains' };

  const matchValue = String(body.matchValue ?? '').trim();
  if (!matchValue) return { error: 'matchValue is required' };

  const targetUrl = parseUrl(body.targetUrl);
  if (!targetUrl) return { error: 'targetUrl must be a valid http/https URL' };

  const quietMinutes = parseQuietMinutes(body.quietMinutes, 0);
  if (quietMinutes === null) return { error: 'quietMinutes must be an integer between 0 and 10080' };

  const enabled = body.enabled === undefined ? true : Boolean(body.enabled);
  return {
    value: {
      name,
      enabled,
      scopeType,
      scopeValue: scopeType === 'all' ? null : scopeValue,
      characteristic,
      operator,
      matchValue,
      targetUrl,
      quietMinutes,
    },
  };
}

function validatePatch(body = {}) {
  const updates = {};
  if ('name' in body) {
    const name = String(body.name ?? '').trim();
    if (!name) return { error: 'name cannot be empty' };
    updates.name = name;
  }
  if ('enabled' in body) {
    updates.enabled = Boolean(body.enabled);
  }
  if ('scopeType' in body) {
    const scopeType = parseScopeType(body.scopeType);
    if (!scopeType) return { error: 'scopeType must be one of: all, room, accessory, characteristic' };
    updates.scopeType = scopeType;
  }
  if ('scopeValue' in body) {
    updates.scopeValue = String(body.scopeValue ?? '').trim();
  }
  if ('characteristic' in body) {
    updates.characteristic = String(body.characteristic ?? '').trim() || null;
  }
  if ('operator' in body) {
    const operator = parseOperator(body.operator);
    if (!operator) return { error: 'operator must be one of: equals, not_equals, contains' };
    updates.operator = operator;
  }
  if ('matchValue' in body) {
    const matchValue = String(body.matchValue ?? '').trim();
    if (!matchValue) return { error: 'matchValue cannot be empty' };
    updates.matchValue = matchValue;
  }
  if ('targetUrl' in body) {
    const targetUrl = parseUrl(body.targetUrl);
    if (!targetUrl) return { error: 'targetUrl must be a valid http/https URL' };
    updates.targetUrl = targetUrl;
  }
  if ('quietMinutes' in body) {
    const quietMinutes = parseQuietMinutes(body.quietMinutes, 0);
    if (quietMinutes === null) return { error: 'quietMinutes must be an integer between 0 and 10080' };
    updates.quietMinutes = quietMinutes;
  }

  const nextScopeType = updates.scopeType;
  const nextScopeValue = updates.scopeValue;
  if (nextScopeType && nextScopeType !== 'all' && nextScopeValue !== undefined && !nextScopeValue.trim()) {
    return { error: 'scopeValue is required for this scopeType' };
  }
  if (nextScopeType === 'all') {
    updates.scopeValue = null;
  }

  if (!Object.keys(updates).length) return { error: 'No valid fields provided to update' };
  return { value: updates };
}

function toApiRule(row) {
  return {
    id: row.id,
    name: row.name,
    enabled: row.enabled,
    scopeType: row.scope_type,
    scopeValue: row.scope_value,
    characteristic: row.characteristic,
    operator: row.operator,
    matchValue: row.match_value,
    targetUrl: row.target_url,
    quietMinutes: row.quiet_minutes,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export function createAlertsRouter({ pool }) {
  const router = express.Router();

  router.get('/rules', async (_req, res) => {
    try {
      const result = await pool.query(
        `SELECT id, name, enabled, scope_type, scope_value, characteristic,
                operator, match_value, target_url, quiet_minutes, created_at, updated_at
         FROM alert_rules
         ORDER BY updated_at DESC, id DESC`
      );
      res.json(result.rows.map(toApiRule));
    } catch (err) {
      console.error('[api] /api/alerts/rules error:', err.message ?? err.stack ?? err);
      res.status(500).json({ error: 'Internal server error' });
    }
  });

  router.post('/rules', async (req, res) => {
    const parsed = validateCreate(req.body);
    if (parsed.error) return res.status(400).json({ error: parsed.error });

    try {
      const result = await pool.query(
        `INSERT INTO alert_rules
           (name, enabled, scope_type, scope_value, characteristic, operator, match_value, target_url, quiet_minutes)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9)
         RETURNING id, name, enabled, scope_type, scope_value, characteristic,
                   operator, match_value, target_url, quiet_minutes, created_at, updated_at`,
        [
          parsed.value.name,
          parsed.value.enabled,
          parsed.value.scopeType,
          parsed.value.scopeValue,
          parsed.value.characteristic,
          parsed.value.operator,
          parsed.value.matchValue,
          parsed.value.targetUrl,
          parsed.value.quietMinutes,
        ]
      );
      res.status(201).json(toApiRule(result.rows[0]));
    } catch (err) {
      console.error('[api] /api/alerts/rules create error:', err.message ?? err.stack ?? err);
      res.status(500).json({ error: 'Internal server error' });
    }
  });

  router.patch('/rules/:id', async (req, res) => {
    const ruleId = Number.parseInt(String(req.params.id ?? ''), 10);
    if (!Number.isFinite(ruleId) || ruleId < 1) {
      return res.status(400).json({ error: 'Invalid rule id' });
    }

    const parsed = validatePatch(req.body);
    if (parsed.error) return res.status(400).json({ error: parsed.error });

    const fields = [];
    const params = [];
    const map = {
      name: 'name',
      enabled: 'enabled',
      scopeType: 'scope_type',
      scopeValue: 'scope_value',
      characteristic: 'characteristic',
      operator: 'operator',
      matchValue: 'match_value',
      targetUrl: 'target_url',
      quietMinutes: 'quiet_minutes',
    };
    for (const [key, value] of Object.entries(parsed.value)) {
      params.push(value);
      fields.push(`${map[key]} = $${params.length}`);
    }
    params.push(ruleId);

    try {
      const result = await pool.query(
        `UPDATE alert_rules
         SET ${fields.join(', ')}, updated_at = NOW()
         WHERE id = $${params.length}
         RETURNING id, name, enabled, scope_type, scope_value, characteristic,
                   operator, match_value, target_url, quiet_minutes, created_at, updated_at`,
        params
      );
      if (!result.rows.length) return res.status(404).json({ error: 'Rule not found' });
      res.json(toApiRule(result.rows[0]));
    } catch (err) {
      console.error('[api] /api/alerts/rules patch error:', err.message ?? err.stack ?? err);
      res.status(500).json({ error: 'Internal server error' });
    }
  });

  router.delete('/rules/:id', async (req, res) => {
    const ruleId = Number.parseInt(String(req.params.id ?? ''), 10);
    if (!Number.isFinite(ruleId) || ruleId < 1) {
      return res.status(400).json({ error: 'Invalid rule id' });
    }
    try {
      const result = await pool.query('DELETE FROM alert_rules WHERE id = $1', [ruleId]);
      if (!result.rowCount) return res.status(404).json({ error: 'Rule not found' });
      res.json({ success: true });
    } catch (err) {
      console.error('[api] /api/alerts/rules delete error:', err.message ?? err.stack ?? err);
      res.status(500).json({ error: 'Internal server error' });
    }
  });

  router.get('/deliveries', async (req, res) => {
    const page = parseIntInRange(req.query.page, 1, 1, Number.MAX_SAFE_INTEGER);
    const limit = parseIntInRange(req.query.limit, 50, 1, 200);
    const offset = (page - 1) * limit;

    try {
      const countResult = await pool.query('SELECT COUNT(*)::int AS total FROM alert_deliveries');
      const total = countResult.rows[0]?.total ?? 0;
      const result = await pool.query(
        `SELECT d.id, d.rule_id, d.event_id, d.status, d.target_url, d.response_code, d.error, d.sent_at,
                r.name AS rule_name
         FROM alert_deliveries d
         LEFT JOIN alert_rules r ON r.id = d.rule_id
         ORDER BY d.sent_at DESC, d.id DESC
         LIMIT $1 OFFSET $2`,
        [limit, offset]
      );
      res.json({
        total,
        page,
        limit,
        pages: Math.ceil(total / limit),
        deliveries: result.rows.map((row) => ({
          id: row.id,
          ruleId: row.rule_id,
          ruleName: row.rule_name,
          eventId: row.event_id,
          status: row.status,
          targetUrl: row.target_url,
          responseCode: row.response_code,
          error: row.error,
          sentAt: row.sent_at,
        })),
      });
    } catch (err) {
      console.error('[api] /api/alerts/deliveries error:', err.message ?? err.stack ?? err);
      res.status(500).json({ error: 'Internal server error' });
    }
  });

  return router;
}

