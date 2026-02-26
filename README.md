# HomeChronicle

Event Logging for Apple HomeKit — a self-hosted dashboard that captures every state change from your HomeKit accessories and displays them in a searchable, filterable timeline with activity charts.

Apple's Home app shows you the current state of your accessories — HomeChronicle shows you everything that *happened* and when.

## Features

### Setup & Pairing
- **In-app Setup** — discover accessories on your network, enter PINs, and pair directly from the browser — no CLI required
- **Bulk pairing** — select multiple accessories, enter a shared PIN, and pair them all at once with a progress bar
- **Homebridge / bridge support** — pair a Homebridge instance once to log all its child accessories automatically; expand any bridge in Setup to see and configure each child device
- **PIN vault** — PINs saved in the browser after first use; green indicator when a saved PIN is already on file
- **PIN help guide** — per-device step-by-step modal covering physical label, packaging, QR code, manufacturer app, and support contact
- **Room assignment** — assign room names to each accessory (and individual bridge children) directly in Setup; rooms persist and appear across all views

### Timeline
- **Live event feed** — scrollable timeline grouped by day, auto-refreshes every 10 seconds
- **Filters** — filter by room, accessory name, characteristic type, and date range
- **Deterministic jump navigation** — heatmap jump resolves ties with `timestamp,id` ordering so page targeting is stable
- **Service type labels** — events show human-readable type labels (Lightbulb, MotionSensor, Lock, etc.) instead of raw HAP UUIDs
- **Component-level names** — accessories with multiple functions are split by service label (example: `Neakasa · Switch` vs `Neakasa · MotionSensor`)
- **Run-cycle OFF delay** — switches named like "run leveling" / "run clean cycle" can delay OFF logging so completion is clearer

### Accessories
- **Live list** — all paired devices with room grouping, auto-refreshes every 15 seconds
- **Activity dots** — green (active < 1h), yellow (active < 24h), grey (older/never)
- **Bridge info** — bridge rows show IP address and time since pairing
- **Child device attribution** — each child shows "via Homebridge XYZ" so you know which bridge it came from
- **Event counts** — total logged events shown per accessory

### Dashboard
- **Hourly activity chart** — bar chart of events by hour of day (last 30 days)
- **7-day trend** — daily event count trend line
- **Top devices** — most active accessories in the last 7 days

### Data Management
- **Danger Zone** — collapsible section in Setup to delete history for individual accessories or wipe all event data
- **Retention + archiving** — automatic pruning of old `event_logs` rows with optional archival to `event_logs_archive`
- **Always-on** — runs 24/7 in Docker; no phone required
- **Non-destructive** — pairs alongside Apple Home without disrupting it

### Alerts
- **Rule-based webhook alerts** — create alert rules in the Alerts tab and send matching events to your webhook endpoint
- **Flexible matching** — scope rules by all events, room, accessory, or characteristic with operators (`equals`, `not_equals`, `contains`)
- **Quiet period suppression** — avoid duplicate alerts with per-rule cooldown windows in minutes
- **Delivery history** — view sent, failed, and suppressed deliveries in the UI

## Architecture

```
[HomeKit accessories]
        ↕  HAP protocol (local network)
[Docker: listener — Node.js + hap-controller]
        ↕  stores events
[Docker: PostgreSQL 16]
        ↕  REST API (Express)
[Docker: web — React + Vite + Nginx]
```

## Requirements

- Docker + Docker Compose
- HomeKit accessories on the same local network (or a Homebridge instance)
- The 8-digit setup PIN for each accessory or bridge you want to pair

## Installation

### 1. Clone and configure

```bash
git clone https://github.com/havuq/homechronicle.git
cd homechronicle
cp .env.example .env
```

Open `.env` and change `POSTGRES_PASSWORD` to something secure. The other defaults are fine to leave as-is.
If you use run-cycle switches that auto-reset immediately, tune `RUN_CYCLE_OFF_DELAY_MS` (default `900000`, i.e. 15 minutes).
Webhook alert delivery timeout is configurable with `ALERTS_WEBHOOK_TIMEOUT_MS` (default `5000`).
Set `ALERTS_ENABLED=false` to hide Alerts in the UI and disable alert processing/routes without removing code.
Optional: set `API_TOKEN` to require authentication on all `POST`/`PATCH`/`DELETE` API routes.
Retention defaults to 365 days with archive-before-delete enabled (`RETENTION_DAYS`, `RETENTION_SWEEP_MS`, `RETENTION_ARCHIVE`).

### 2. Start the stack

```bash
docker compose up -d
```

Open **http://localhost:3000** (or replace `localhost` with your server's IP).

## Production Install (Recommended)

Use this when deploying on a server/NAS for 24/7 use.

1. Keep only `docker-compose.yml` in use for production.
2. Set a strong `POSTGRES_PASSWORD` in `.env`.
3. Set `API_TOKEN` in `.env` to protect all write API routes.
4. Restrict network access at your firewall/router:
   - allow inbound `3000/tcp` only from trusted clients
   - block public access to `5432/tcp` (Postgres)
5. Start and verify:

```bash
docker compose up -d
docker compose ps
docker compose logs -f --tail=100 listener web postgres
```

The app should be reachable at `http://<server-ip>:3000`.

### 3. Pair your accessories

1. Open the app and go to the **Setup** tab
2. Click **Rescan Network** — the app scans for 10 seconds and lists every HomeKit accessory it finds
3. Enter the 8-digit PIN for each accessory you want to pair (format: `111-22-333`)
   - Can't find a PIN? Click **Can't find PIN?** next to any device for step-by-step help
   - For Homebridge: the PIN is in the Homebridge UI under the QR code
4. Select one or more accessories and click **Pair Selected**
5. Once paired, events start flowing immediately — check the **Timeline** tab

> **Tip:** Devices already paired with Apple Home can be paired here simultaneously. HomeKit allows multiple controllers and the same PIN works.

### 4. Assign room names (optional)

In Setup → Paired Devices, type a room name next to each device and press Enter. For Homebridge bridges, click **Show child devices** to assign rooms to individual accessories under the bridge.

## NAS Deployment (Synology / QNAP)

The base `docker-compose.yml` uses `network_mode: host` on the listener container, which is required for mDNS HomeKit discovery to work on Linux hosts.

```bash
# Copy the project to your NAS (do NOT copy docker-compose.override.yml)
cp .env.example .env    # edit POSTGRES_PASSWORD
docker compose up -d
```

If mDNS discovery fails (Setup shows "No accessories found" after scanning):
- Check that `avahi-daemon` is running on the NAS host
- Or add an mDNS repeater container to your Compose stack

## Production Upgrade

```bash
git pull
docker compose pull
docker compose up -d
```

Optional quick backup before upgrade:

```bash
docker compose exec -T postgres pg_dump -U "$POSTGRES_USER" "$POSTGRES_DB" > backup.sql
```

## Troubleshooting

**Setup shows "No accessories found" after scanning**
- Make sure the listener container is on the same network segment as your accessories
- On NAS: confirm `network_mode: host` is active (the override file must not be present)
- The scan only lasts 10 seconds — some accessories respond slowly; try scanning again

**Accessories paired but no events showing up**
- Restart the listener: `docker compose restart listener`
- Check logs for errors: `docker compose logs -f listener`
- Verify the accessory is reachable: check the IP in Setup matches what your router shows
- Some characteristics require explicit subscription — check the logs for `[event-skip]` lines showing unrecognised UUIDs

**"Could not load child devices" on a bridge in Setup**
- The bridge must be online and reachable when you expand it
- Check the bridge IP in Setup matches your router's DHCP lease for that device
- Homebridge may need a restart if it has crashed

**Room names not appearing on the Accessories tab**
- The Accessories tab auto-refreshes every 15 seconds — wait a moment after saving a room in Setup
- If rooms never appear, restart the listener so it picks up the updated `rooms.json`

**Events stopped flowing after the listener was restarted**
- The listener re-subscribes to all paired accessories on startup — this is normal
- If events still don't flow after a minute, check `docker compose logs listener` for connection errors

**Pairing fails with "wrong PIN" error**
- Double-check the PIN format: `111-22-333` (with dashes, not spaces)
- For Homebridge, the PIN is shown in the Homebridge dashboard under the QR code — it may differ from individual accessory PINs
- Try factory-resetting the accessory as a last resort (this will require re-adding to Apple Home too)

## API Reference

The listener exposes a REST API on port 3001, proxied through the web container at `/api`:

| Endpoint | Description |
|---|---|
| `GET /api/events` | Paginated events. Params: `page`, `limit`, `room`, `accessory`, `characteristic`, `from`, `to` |
| `GET /api/events/jump` | Resolve the page + event ID for heatmap jump navigation. Params: `accessory`, `hour`, `limit`, `room`, `from`, `to` |
| `GET /api/accessories` | All accessories with last-seen time, event count, room, and bridge info |
| `GET /api/stats/hourly` | Event count by hour of day (last 30 days) |
| `GET /api/stats/daily` | Event count by day (last 90 days) |
| `GET /api/stats/top-devices` | Most active accessories (last 7 days) |
| `GET /api/health` | Health check + paired device count |
| `GET /api/setup/discovered` | Cached mDNS scan results with pairing status |
| `POST /api/setup/scan` | Trigger a new mDNS scan |
| `POST /api/setup/pair` | Pair a device by ID and PIN |
| `DELETE /api/setup/pairing/:deviceId` | Remove a pairing |
| `GET /api/setup/bridge-children/:deviceId` | List child accessories of a paired bridge |
| `PATCH /api/setup/room` | Set or clear a room assignment |
| `GET /api/setup/rooms` | Get all saved room assignments |
| `DELETE /api/data/accessory` | Delete all event history for one accessory |
| `DELETE /api/data/all` | Wipe all event data |
| `GET /api/alerts/rules` | List all alert rules |
| `POST /api/alerts/rules` | Create an alert rule |
| `PATCH /api/alerts/rules/:id` | Update an alert rule |
| `DELETE /api/alerts/rules/:id` | Delete an alert rule |
| `GET /api/alerts/deliveries` | Paginated alert delivery history. Params: `page`, `limit` |

When `ALERTS_ENABLED=false`, Alerts UI and `/api/alerts/*` endpoints are disabled.

If `API_TOKEN` is set, all `POST`/`PATCH`/`DELETE` routes require `X-API-Token: <token>` (or `Authorization: Bearer <token>`).

### Alert Webhook Payload

`POST` alerts use `Content-Type: application/json` with a payload shaped like:

```json
{
  "type": "homechronicle.alert",
  "firedAt": "2026-02-26T13:00:00.000Z",
  "rule": {
    "id": 12,
    "name": "Door opened",
    "scopeType": "characteristic",
    "scopeValue": "ContactSensorState",
    "characteristic": null,
    "operator": "equals",
    "matchValue": "true",
    "quietMinutes": 5,
    "targetUrl": "https://example.com/hook"
  },
  "event": {
    "id": 8912,
    "timestamp": "2026-02-26T13:00:00.000Z",
    "accessoryId": "AA:BB:CC:DD:EE:FF",
    "accessoryName": "Front Door Sensor",
    "roomName": "Entry",
    "serviceType": "ContactSensor",
    "characteristic": "ContactSensorState",
    "oldValue": "false",
    "newValue": "true",
    "rawIid": 42
  }
}
```

## Testing

```bash
# listener integration/unit tests
cd listener && npm test

# frontend smoke tests
cd ../web && npm test
```

## Project Structure

```
homechronicle/
├── docker-compose.yml           # Production stack
├── docker-compose.override.yml  # Local dev overrides (macOS)
├── .env.example                 # Environment variable template
├── db/
│   └── init.sql                 # PostgreSQL schema
├── listener/                    # Node.js HomeKit bridge + API
│   ├── Dockerfile
│   ├── package.json
│   └── src/
│       ├── index.js             # Entry point + Express REST API
│       ├── events-router.js     # /api/events and /api/events/jump routes
│       ├── alerts-router.js     # /api/alerts/rules and /api/alerts/deliveries routes
│       ├── alerts.js            # Rule evaluation + webhook delivery
│       ├── discover.js          # mDNS scanner CLI
│       ├── pairing.js           # Pairing CLI
│       ├── subscriber.js        # HAP event subscriptions + DB inserts
│       ├── db.js                # PostgreSQL client
│       ├── store.js             # Async cached atomic JSON stores
│       └── seed.js              # Fake data generator
│   └── test/
│       ├── alerts-router.integration.test.js
│       ├── alerts.processor.test.js
│       ├── events-router.integration.test.js
│       └── subscriber.reconnect.test.js
└── web/                         # React + Vite frontend
    ├── Dockerfile
    ├── nginx.conf.template
    └── src/
        ├── App.jsx
        ├── App.smoke.test.jsx
        ├── components/          # Timeline, AccessoryList, Dashboard, Setup
        ├── hooks/               # useEvents, useAccessories, useStats
        └── lib/                 # icons.js (SF Symbol → Lucide mappings)
```

## Security Notes

- `listener/data/pairings.json` contains your HomeKit pairing keys — gitignored, never commit or share this file
- `.env` is gitignored; only `.env.example` is in the repo
- Optional hardening: set `API_TOKEN` to protect all write endpoints (`POST`/`PATCH`/`DELETE`)
- Read-only endpoints (`GET`) are still unauthenticated — run behind a VPN or firewall, never expose to the public internet

## License

MIT
