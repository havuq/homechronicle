# API Reference

Base URL: `http://<listener-host>:<API_PORT>` (default port 3001), or through the web proxy at `http://<web-host>:<WEB_PORT>/api`.

## Authentication

Write routes (`POST`, `PATCH`, `DELETE`) require an API token. Send it as a header:

```
X-API-Token: <token>
```

or:

```
Authorization: Bearer <token>
```

Read routes are open by default. Set `API_TOKEN_READS_ENABLED=true` to require auth for all routes.

---

## Health

### `GET /api/health`

No authentication required.

**Response:**
```json
{
  "status": "ok",
  "paired": 12,
  "alertsEnabled": false,
  "matter": {
    "commissionConfigured": true,
    "pollingConfigured": true,
    "activeNodes": 2
  }
}
```

---

## Events

### `GET /api/events`

Fetch events with pagination and filtering.

**Query Parameters:**

| Parameter | Type | Default | Description |
|-----------|------|---------|-------------|
| `page` | integer | `1` | Page number |
| `limit` | integer | `50` | Results per page (1-200) |
| `room` | string | — | Filter by room (exact match) |
| `accessory` | string | — | Filter by accessory name (partial, case-insensitive) |
| `characteristic` | string | — | Filter by characteristic (exact match) |
| `from` | ISO 8601 | — | Start of date range |
| `to` | ISO 8601 | — | End of date range |

**Response:**
```json
{
  "total": 5432,
  "page": 1,
  "limit": 50,
  "pages": 109,
  "events": [
    {
      "id": 5432,
      "timestamp": "2025-01-15T14:30:00.000Z",
      "accessory_id": "AA:BB:CC:DD:EE:FF",
      "accessory_name": "Living Room Light",
      "room_name": "Living Room",
      "service_type": "Lightbulb",
      "characteristic": "On",
      "old_value": "false",
      "new_value": "true",
      "protocol": "homekit",
      "transport": "ip",
      "raw_iid": 10
    }
  ]
}
```

### `GET /api/events/jump`

Find the page containing a specific hour's events. Useful for timeline navigation.

**Query Parameters:**

| Parameter | Type | Description |
|-----------|------|-------------|
| `accessory` | string | Accessory name filter |
| `hour` | integer | Hour of day (0-23) |
| `limit` | integer | Page size (must match your events query) |
| `room` | string | Room filter |
| `from` | ISO 8601 | Start of date range |
| `to` | ISO 8601 | End of date range |

**Response:**
```json
{
  "page": 3,
  "eventId": "1234"
}
```

---

## Accessories

### `GET /api/accessories`

List all accessories with metadata and health status.

**Response:**
```json
[
  {
    "accessory_id": "AA:BB:CC:DD:EE:FF",
    "accessory_name": "Living Room Light",
    "room_name": "Living Room",
    "service_type": "Lightbulb",
    "protocol": "homekit",
    "last_seen": "2025-01-15T14:30:00.000Z",
    "event_count": 1234,
    "address": "192.168.1.50",
    "paired_at": "2025-01-01T00:00:00.000Z",
    "manufacturer": "Philips",
    "model": "Hue",
    "reliability": {
      "connect_attempts": 5,
      "disconnects": 1,
      "last_connected_at": "2025-01-15T14:00:00.000Z"
    },
    "health": {
      "status": "ok",
      "lastSeen": "2025-01-15T14:30:00.000Z",
      "heartbeatSeconds": 300,
      "heartbeatHealthy": true
    }
  }
]
```

Health status values: `ok`, `unknown`, `stale`, `unreachable`.

### `GET /api/accessories/:accessoryId/detail`

Detailed view for a single accessory including activity history.

**Query Parameters:**

| Parameter | Type | Default | Description |
|-----------|------|---------|-------------|
| `days` | integer | `30` | Activity window (7-365) |
| `page` | integer | `1` | Event history page |
| `limit` | integer | `100` | Events per page (1-500) |

**Response includes:** accessory metadata, uptime stats, current state per characteristic, daily activity counts, and paginated event history.

### `GET /api/accessories/:accessoryId/capabilities`

Query the device for its services and characteristics (HomeKit only).

---

## Statistics

### `GET /api/stats/hourly`

Event counts by hour of day (last 30 days).

**Response:** `[{ "hour": 0, "count": 45 }, ...]`

### `GET /api/stats/daily`

Event counts by day.

| Parameter | Type | Default | Description |
|-----------|------|---------|-------------|
| `days` | integer | `30` | Number of days |

**Response:** `[{ "day": "2025-01-15", "count": 234 }, ...]`

### `GET /api/stats/top-devices`

Top 10 most active accessories.

| Parameter | Type | Default | Description |
|-----------|------|---------|-------------|
| `days` | integer | `7` | Lookback window |

**Response:** `[{ "accessory_name": "Motion Sensor", "event_count": 567, "room_name": "Hallway" }, ...]`

### `GET /api/stats/rooms`

Event counts by room.

| Parameter | Type | Default | Description |
|-----------|------|---------|-------------|
| `days` | integer | `7` | Lookback window |

### `GET /api/stats/weekday`

Heatmap data: events by day-of-week and hour.

| Parameter | Type | Default | Description |
|-----------|------|---------|-------------|
| `days` | integer | `90` | Lookback window |

**Response:** `[{ "day_of_week": 1, "hour": 8, "count": 34 }, ...]`

### `GET /api/stats/heatmap`

Accessory-by-hour heatmap (last 7 days).

**Response:** `[{ "accessory_name": "Light", "hour": 14, "count": 12 }, ...]`

### `GET /api/stats/device-patterns`

Device activity patterns over 30 days.

### `GET /api/stats/anomalies`

Outlier detection using z-score analysis.

**Response:**
```json
{
  "generatedAt": "2025-01-15T14:30:00.000Z",
  "outlierCount": 3,
  "devices": [
    {
      "scope_name": "Motion Sensor",
      "hour": 3,
      "baseline_avg": 2.5,
      "baseline_std": 1.2,
      "event_count": 15,
      "zscore": 10.4
    }
  ],
  "rooms": []
}
```

---

## Setup / Discovery

### `GET /api/setup/discovered`

Returns cached mDNS discovery results.

### `POST /api/setup/scan`

Trigger a new network scan (~10s). Returns discovered accessories.

### `POST /api/setup/pair`

Pair a HomeKit accessory.

**Body:**
```json
{
  "deviceId": "AA:BB:CC:DD:EE:FF",
  "pin": "111-22-333",
  "protocol": "homekit"
}
```

### `GET /api/setup/bridge-children/:deviceId`

List child accessories behind a bridge.

### `DELETE /api/setup/pairing/:deviceId`

Remove a pairing and stop its subscriber.

### `PATCH /api/setup/room`

Assign a room to an accessory.

**Body:**
```json
{
  "accessoryId": "AA:BB:CC:DD:EE:FF",
  "roomName": "Living Room"
}
```

### `GET /api/setup/rooms`

Get all room assignments as `{ accessoryId: roomName }`.

### `PATCH /api/setup/note`

Set or clear a note for an accessory.

**Body:**
```json
{
  "accessoryId": "AA:BB:CC:DD:EE:FF",
  "note": "Firmware updated 2025-01"
}
```

Send an empty or missing `note` to clear.

### `GET /api/setup/notes`

Get all device notes as `{ accessoryId: note }`.

### `GET /api/setup/pairings`

List all pairings (HomeKit and Matter).

### `GET /api/setup/retention`

Get retention and health settings.

### `PATCH /api/setup/retention`

Update retention settings.

**Body (all fields optional):**
```json
{
  "retentionDays": 365,
  "staleThresholdHours": 12,
  "archiveBeforeDelete": true,
  "autoScanHomeKit": true
}
```

### `GET /api/setup/log-level`

Get the current log level.

### `PATCH /api/setup/log-level`

Change log level at runtime (no restart needed).

**Body:**
```json
{
  "level": "debug"
}
```

---

## Alerts

Requires `ALERTS_ENABLED=true`.

### `GET /api/alerts/rules`

List all alert rules.

### `POST /api/alerts/rules`

Create an alert rule.

**Body:**
```json
{
  "name": "Front door opened",
  "scopeType": "accessory",
  "scopeValue": "Front Door Lock",
  "characteristic": "LockCurrentState",
  "operator": "equals",
  "matchValue": "0",
  "targetUrl": "https://hooks.example.com/webhook",
  "quietMinutes": 5,
  "enabled": true
}
```

| Field | Type | Description |
|-------|------|-------------|
| `name` | string | Rule name |
| `scopeType` | enum | `all`, `room`, `accessory`, or `characteristic` |
| `scopeValue` | string | Value to match against (not needed for `all`) |
| `characteristic` | string | Optional characteristic filter |
| `operator` | enum | `equals`, `not_equals`, `contains` |
| `matchValue` | string | Value to match in `new_value` |
| `targetUrl` | string | Webhook URL |
| `quietMinutes` | integer | Suppress re-firing for this many minutes (0-10080) |
| `enabled` | boolean | Whether the rule is active |

### `PATCH /api/alerts/rules/:id`

Update a rule (partial update, any fields from create).

### `DELETE /api/alerts/rules/:id`

Delete a rule. Associated deliveries are also deleted.

### `GET /api/alerts/deliveries`

Webhook delivery log.

**Query Parameters:**

| Parameter | Type | Default | Description |
|-----------|------|---------|-------------|
| `page` | integer | `1` | Page number |
| `limit` | integer | `50` | Results per page |

**Response:**
```json
{
  "total": 100,
  "page": 1,
  "limit": 50,
  "pages": 2,
  "deliveries": [
    {
      "id": 1,
      "ruleId": 5,
      "ruleName": "Front door opened",
      "eventId": 1234,
      "status": "sent",
      "targetUrl": "https://hooks.example.com/webhook",
      "responseCode": 200,
      "error": null,
      "sentAt": "2025-01-15T14:30:00.000Z"
    }
  ]
}
```

Delivery status values: `sent`, `failed`, `suppressed`.

---

## Data Management

### `DELETE /api/data/accessory`

Delete all events for a specific accessory.

**Body:**
```json
{
  "accessoryId": "AA:BB:CC:DD:EE:FF"
}
```

### `DELETE /api/data/all`

Delete all events and room assignments.

---

## Matter

### `GET /api/setup/matter/runtime`

Matter runtime status and active nodes.

### `GET /api/setup/matter/discovered`

Cached Matter device scan results.

### `POST /api/setup/matter/scan`

Trigger Matter device discovery.

### `POST /api/setup/matter/pair`

Commission and pair a Matter device.

**Body:**
```json
{
  "name": "My Device",
  "setupCode": "<setup-code>",
  "nodeId": null
}
```

If `setupCode` is provided, the device is commissioned first. `name` is required.

### `DELETE /api/setup/matter/pairing/:nodeId`

Remove a Matter device pairing.

### `GET /api/setup/matter/pairings`

List all Matter pairings.

---

## Rate Limits

All limits are per-IP and configurable via environment variables.

| Endpoint Group | Default Limit |
|---------------|---------------|
| Events (`/api/events*`) | 300 req / 60s |
| Stats & Accessories | 120 req / 60s |
| Alerts read | 180 req / 60s |
| Write routes (POST/PATCH/DELETE) | 60 req / 60s |
