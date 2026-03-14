# Architecture Overview

homechronicle runs as three Docker services on your local network. No cloud services are involved — everything stays on your machine.

## System Diagram

```
HomeKit / Matter Devices
        │
        │  HAP events / Matter polling
        ▼
┌─────────────────────┐     ┌──────────────────┐
│     Listener         │────▶│   PostgreSQL 16   │
│  (Node.js / Express) │     │                  │
│                      │     │  event_logs      │
│  - HAP subscriber    │     │  alert_rules     │
│  - Matter runtime    │     │  alert_deliveries│
│  - REST API          │     │  event_logs_     │
│  - Alert engine      │     │   archive        │
└──────────┬───────────┘     └──────────────────┘
           │
           │  /api/* proxy
           ▼
┌─────────────────────┐
│        Web           │
│  (React + Nginx)     │
│                      │
│  - Dashboard         │
│  - Timeline          │
│  - Accessories       │
│  - Manage/Setup      │
└─────────────────────┘
```

## Listener

The listener is the core service. It runs on Node.js with ES modules and serves two roles: device communication and the REST API.

### Key Modules

| File | Purpose |
|------|---------|
| `index.js` | Express server entry point; boots API routes, subscribers, and background tasks |
| `subscriber.js` | Maintains persistent HAP event subscriptions via `hap-controller` |
| `matter-runtime.js` | Matter.js polling loop and subscription management |
| `matter-controller.js` | Matter commissioning and controller lifecycle |
| `db.js` | PostgreSQL pool, `insertEvent()`, schema migrations, retention sweep |
| `store.js` | `JsonObjectStore` for persistent JSON files (pairings, rooms, retention) |
| `events-router.js` | GET endpoints for events with filtering and pagination |
| `alerts-router.js` | CRUD for alert rules and delivery log |
| `alerts.js` | Rule matching and webhook dispatch with quiet-period suppression |
| `discover.js` | CLI tool for mDNS network scanning |
| `pairing.js` | CLI tool for HAP pair-setup |
| `accessory-metadata.js` | Caches device identity (manufacturer, model, serial, firmware) |
| `device-health.js` | Derives health status from event timestamps and heartbeat intervals |
| `anomaly-detection.js` | Z-score outlier detection on event patterns |
| `logger.js` | Structured logging with runtime-configurable levels |
| `security.js` | Constant-time token comparison, webhook URL validation |

### Event Flow

1. A HomeKit accessory changes state (e.g., light turns on)
2. The HAP subscriber receives the characteristic change event
3. `old_value` is read from the in-memory value cache
4. A row is inserted into `event_logs` with all metadata
5. Alert rules are evaluated against the new event
6. Matching rules trigger webhook delivery (with quiet-period checks)
7. The value cache is updated

### Background Tasks

- **Discovery scan**: Runs every hour, updates accessory addresses in pairings
- **Retention sweep**: Runs every 24 hours, archives and/or deletes old events
- **Store refresh**: Re-reads JSON stores from disk every 30 seconds

### Reconnection Strategy

When a HomeKit device becomes unreachable, the subscriber uses exponential backoff:

- Base delay: 5 seconds
- Maximum delay: 60 seconds
- Multiplied by 2 on each failure, with jitter

For Matter, polling stops after 10 consecutive errors per node.

## Web

The web frontend is a React single-page application built with Vite and styled with Tailwind CSS v4.

### Tabs

| Tab | Description |
|-----|-------------|
| **Dashboard** | KPI cards, trend charts, hourly distribution, room breakdown, device rankings, heatmaps, anomaly detection, stale device alerts |
| **Timeline** | Chronological event feed grouped by day, with episode grouping for events within 30s of each other |
| **Accessories** | Device inventory with room grouping, health indicators, and drill-down detail view |
| **Manage** | Discovery, pairing, room assignment, retention settings, log level |
| **Alerts** | Rule management and delivery log (visible when `ALERTS_ENABLED=true`) |

### Appearance

The UI supports light and dark modes (or follows system preference) and six color themes: Ocean, Graphite, Sunrise, Red, Yellow, and Purple. Preferences are stored in the browser's localStorage.

### Key Libraries

- **React 19** with hooks
- **TanStack Query** for data fetching and caching
- **Recharts** for charts and visualizations
- **Lucide** for icons
- **Tailwind CSS v4** for styling

### Build and Serving

The web app is built at Docker image build time using Vite. The resulting static files are served by Nginx, which also proxies `/api/*` requests to the listener with a 300-second timeout (to accommodate long-running Matter commissioning requests).

## Database

PostgreSQL 16 with the `pg_trgm` extension for fast accessory name search.

### Tables

**`event_logs`** (main, append-only):

| Column | Type | Notes |
|--------|------|-------|
| `id` | BIGSERIAL | Primary key |
| `timestamp` | TIMESTAMPTZ | Event time |
| `accessory_id` | TEXT | Protocol-specific device ID |
| `accessory_name` | TEXT | Human-readable name |
| `room_name` | TEXT | Nullable (manually assigned) |
| `service_type` | TEXT | e.g., "Lightbulb", "MotionSensor" |
| `characteristic` | TEXT | e.g., "On", "MotionDetected" |
| `old_value` | TEXT | Previous value (nullable) |
| `new_value` | TEXT | New value |
| `protocol` | TEXT | `homekit` or `matter` |
| `transport` | TEXT | `ip`, `thread`, etc. |
| `endpoint_id` | INT | Matter endpoint |
| `cluster_id` | BIGINT | Matter cluster |
| `attribute_id` | BIGINT | Matter attribute |
| `raw_iid` | INT | HAP instance ID |

**`event_logs_archive`**: Same schema, receives records before retention deletion.

**`alert_rules`**: Stores webhook alert rule definitions.

**`alert_deliveries`**: Log of webhook sends with status (`sent`, `failed`, `suppressed`).

### Indexes

Indexes are optimized for the primary query pattern (timestamp descending):

- `(timestamp DESC, id DESC)` — main event queries
- `(accessory_name, timestamp DESC)` — accessory filtering
- `(room_name, timestamp DESC)` — room filtering
- `(characteristic, timestamp DESC)` — characteristic filtering
- `date_trunc('hour', timestamp AT TIME ZONE 'UTC')` — stats aggregation
- GIN trigram index on `accessory_name` — ILIKE search

### Schema Initialization

The schema is defined in `db/init.sql` and auto-runs on the first `docker compose up` via PostgreSQL's `docker-entrypoint-initdb.d` mechanism. Subsequent migrations are handled by `db.js` at listener startup.

## Networking

- **Listener**: Uses `network_mode: host` on Linux for mDNS discovery (Bonjour) and Matter IPv6 link-local. On Docker Desktop (macOS/Windows), host mode works differently — see [Troubleshooting](troubleshooting.md).
- **Web**: Runs in bridge network. Nginx proxies `/api/*` to the listener. The `LISTENER_HOST` variable controls routing.
- **PostgreSQL**: Bridge network, port bound to `127.0.0.1` by default.
- **D-Bus**: The listener container mounts the host's D-Bus socket for avahi-daemon integration.
