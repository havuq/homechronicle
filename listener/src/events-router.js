import express from 'express';
import rateLimit from 'express-rate-limit';
import { log } from './logger.js';

function parseIntInRange(value, fallback, min, max) {
  const parsed = Number.parseInt(String(value ?? ''), 10);
  if (!Number.isFinite(parsed)) return fallback;
  return Math.min(max, Math.max(min, parsed));
}

function parentBridgeId(id) {
  const parts = String(id ?? '').split(':');
  return parts.length > 6 ? parts.slice(0, 6).join(':') : String(id ?? '');
}

function rateLimitKeyGenerator(req) {
  const forwardedFor = req?.headers?.['x-forwarded-for'];
  if (typeof forwardedFor === 'string' && forwardedFor.trim()) {
    return forwardedFor.split(',')[0].trim();
  }
  return req?.ip ?? req?.socket?.remoteAddress ?? 'unknown';
}

const EVENTS_RATE_LIMIT_WINDOW_MS = parseIntInRange(
  process.env.EVENTS_RATE_LIMIT_WINDOW_MS,
  60_000,
  1_000,
  24 * 60 * 60 * 1000
);
const EVENTS_RATE_LIMIT_MAX = parseIntInRange(
  process.env.EVENTS_RATE_LIMIT_MAX,
  300,
  1,
  100_000
);

export function createEventsRouter({ pool, getRooms }) {
  const router = express.Router();
  const eventsReadLimiter = rateLimit({
    windowMs: EVENTS_RATE_LIMIT_WINDOW_MS,
    max: EVENTS_RATE_LIMIT_MAX,
    standardHeaders: true,
    legacyHeaders: false,
    validate: false,
    keyGenerator: rateLimitKeyGenerator,
    message: { error: 'Too many requests' },
  });

  router.get('/events', eventsReadLimiter, async (req, res) => {
    try {
      const page = parseIntInRange(req.query.page, 1, 1, Number.MAX_SAFE_INTEGER);
      const limit = parseIntInRange(req.query.limit, 50, 1, 200);
      const offset = (page - 1) * limit;

      const conditions = [];
      const params = [];

      if (req.query.room) { params.push(req.query.room); conditions.push(`room_name = $${params.length}`); }
      if (req.query.accessory) { params.push(`%${req.query.accessory}%`); conditions.push(`accessory_name ILIKE $${params.length}`); }
      if (req.query.characteristic) { params.push(req.query.characteristic); conditions.push(`characteristic = $${params.length}`); }
      if (req.query.from) { params.push(req.query.from); conditions.push(`timestamp >= $${params.length}`); }
      if (req.query.to) { params.push(req.query.to); conditions.push(`timestamp <= $${params.length}`); }

      const where = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';

      const countResult = await pool.query(`SELECT COUNT(*) AS total FROM event_logs ${where}`, params);
      const total = Number.parseInt(countResult.rows[0].total, 10);

      params.push(limit, offset);
      const dataResult = await pool.query(
        `SELECT id, timestamp, accessory_id, accessory_name, room_name,
                service_type, characteristic, old_value, new_value, protocol,
                transport, endpoint_id, cluster_id, attribute_id, raw_iid
         FROM event_logs ${where}
         ORDER BY timestamp DESC, id DESC
         LIMIT $${params.length - 1} OFFSET $${params.length}`,
        params
      );

      const rooms = getRooms();
      const events = dataResult.rows.map((row) => ({
        ...row,
        room_name: rooms[row.accessory_id]
          ?? rooms[parentBridgeId(row.accessory_id)]
          ?? row.room_name,
      }));

      res.json({ total, page, limit, pages: Math.ceil(total / limit), events });
    } catch (err) {
      log.error('[api] /api/events error:', err.message ?? err.stack ?? err);
      res.status(500).json({ error: 'Internal server error' });
    }
  });

  router.get('/events/jump', eventsReadLimiter, async (req, res) => {
    const { accessory, hour, limit = '50', room, from, to } = req.query;
    if (!accessory || hour === undefined) {
      return res.status(400).json({ error: 'accessory and hour are required' });
    }

    const pageSize = parseIntInRange(limit, 50, 1, 200);
    const hourInt = Number.parseInt(String(hour), 10);

    try {
      const matchParams = [accessory, hourInt];
      const matchConditions = [
        'accessory_name = $1',
        `EXTRACT(HOUR FROM timestamp AT TIME ZONE 'UTC') = $2`,
      ];
      if (room) { matchParams.push(room); matchConditions.push(`room_name = $${matchParams.length}`); }
      if (from) { matchParams.push(from); matchConditions.push(`timestamp >= $${matchParams.length}`); }
      if (to) { matchParams.push(to); matchConditions.push(`timestamp <= $${matchParams.length}`); }

      const matchResult = await pool.query(
        `SELECT id, timestamp
         FROM event_logs
         WHERE ${matchConditions.join(' AND ')}
         ORDER BY timestamp DESC, id DESC
         LIMIT 1`,
        matchParams
      );

      if (!matchResult.rows.length) return res.json({ page: null, eventId: null });

      const { id: eventId, timestamp } = matchResult.rows[0];
      const countParams = [timestamp, eventId];
      const countConditions = [
        '(timestamp > $1 OR (timestamp = $1 AND id > $2))',
      ];
      if (room) { countParams.push(room); countConditions.push(`room_name = $${countParams.length}`); }
      if (from) { countParams.push(from); countConditions.push(`timestamp >= $${countParams.length}`); }
      if (to) { countParams.push(to); countConditions.push(`timestamp <= $${countParams.length}`); }

      const countResult = await pool.query(
        `SELECT COUNT(*) AS newer FROM event_logs WHERE ${countConditions.join(' AND ')}`,
        countParams
      );

      const newer = Number.parseInt(countResult.rows[0].newer, 10);
      const page = Math.floor(newer / pageSize) + 1;
      res.json({ page, eventId: String(eventId) });
    } catch (err) {
      log.error('[api] /api/events/jump error:', err.message ?? err.stack ?? err);
      res.status(500).json({ error: 'Internal server error' });
    }
  });

  return router;
}

export { parentBridgeId, parseIntInRange };
