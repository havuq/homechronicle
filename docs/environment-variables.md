# Environment Variables

This file documents all supported environment variables for HomeChronicle.

Use `.env.example` for a minimal setup, then add only what you need from this reference.

## Compose/Deployment

| Variable | Default | Used by | Description |
|---|---|---|---|
| `TZ` | `UTC` | postgres, listener, web | Container timezone. |
| `POSTGRES_IMAGE` | `postgres:16-alpine` | compose | Override Postgres image tag. |
| `LISTENER_IMAGE` | `ghcr.io/havuq/homechronicle/listener:latest` | compose | Override listener image tag. |
| `WEB_IMAGE` | `ghcr.io/havuq/homechronicle/web:latest` | compose | Override web image tag. |
| `WEB_PORT` | `3000` | compose | Host port mapped to web container port 80. |
| `POSTGRES_PORT` | `5432` | compose | Host port mapped to Postgres port 5432. |
| `LISTENER_NETWORK_MODE` | `host` | compose | Listener network mode (`host` recommended for mDNS/HomeKit). |
| `LISTENER_HOST` | `host.docker.internal` | web proxy | Host/IP web uses to proxy `/api` to listener. |
| `LISTENER_PORT` | `3001` | web proxy | Listener API port used by web proxy. |
| `DATABASE_URL` | auto-built from PG vars | listener | Explicit PostgreSQL connection string. |

## PostgreSQL

| Variable | Default | Used by | Description |
|---|---|---|---|
| `POSTGRES_USER` | `homekit` | postgres, listener URL interpolation | Database user. |
| `POSTGRES_PASSWORD` | none | postgres, listener URL interpolation | Database password (set this). |
| `POSTGRES_DB` | `homekit_events` | postgres, listener URL interpolation | Database name. |

## Listener Core/API

| Variable | Default | Used by | Description |
|---|---|---|---|
| `API_PORT` | `3001` | listener, web proxy | Listener API listen port. |
| `NODE_ENV` | `production` | listener | Runtime mode. |
| `API_TOKEN` | empty | listener + web proxy | Write-route auth token. When set, write routes require token. |
| `PAIRINGS_FILE` | `/app/data/pairings.json` in prod | listener | Pairings JSON storage path. |
| `ROOMS_FILE` | `/app/data/rooms.json` in prod | listener | Rooms JSON storage path. |
| `RETENTION_FILE` | `/app/data/retention.json` in prod | listener | Retention settings JSON storage path. |
| `STORE_REFRESH_INTERVAL_MS` | `30000` | listener | Refresh interval for JSON stores. |
| `DISCOVERY_SCAN_ENABLED` | `true` | listener | Enable periodic HomeKit discovery scans. |
| `DISCOVER_IFACE` | auto | listener | Interface for mDNS discovery (example: `en0`). |

## Listener Performance/Memory

| Variable | Default | Used by | Description |
|---|---|---|---|
| `READ_CACHE_ENABLED` | `true` | listener | Enable in-memory cache for expensive GET routes. |
| `READ_CACHE_TTL_MS` | `15000` | listener | Cache TTL in milliseconds. |
| `READ_CACHE_MAX_ENTRIES` | `200` | listener | Max number of cached responses (LRU-like eviction). |
| `READ_CACHE_MAX_PAYLOAD_BYTES` | `2097152` | listener | Skip caching payloads larger than this size. |

## Listener Retention/Health

| Variable | Default | Used by | Description |
|---|---|---|---|
| `RETENTION_DAYS` | `365` | listener | Event retention window in days. |
| `RETENTION_SWEEP_MS` | `86400000` | listener | Retention sweep interval. |
| `RETENTION_ARCHIVE` | `true` | listener | Archive old events before delete. |
| `STALE_THRESHOLD_HOURS` | `12` | listener | Device stale threshold for health. |

## Alerts / Subscriber

| Variable | Default | Used by | Description |
|---|---|---|---|
| `ALERTS_ENABLED` | `false` | listener | Enable alert rule processing. |
| `ALERTS_WEBHOOK_TIMEOUT_MS` | `5000` | listener | Timeout for alert webhook delivery. |
| `RUN_CYCLE_OFF_DELAY_MS` | `900000` | listener | Delay synthetic OFF for run-cycle switches. |
| `RECONNECT_BASE_MS` | `5000` | listener | Initial reconnect delay for HomeKit subscribers. |
| `RECONNECT_MAX_MS` | `60000` | listener | Max reconnect delay for HomeKit subscribers. |

## Matter

| Variable | Default | Used by | Description |
|---|---|---|---|
| `MATTER_POLL_INTERVAL_MS` | `5000` | listener | Poll interval for Matter runtime. |
| `MATTER_COMMAND_TIMEOUT_MS` | `20000` | listener | Timeout for Matter poll commands. |
| `MATTER_COMMISSION_TIMEOUT_MS` | `180000` | listener | Timeout for Matter commission command. |
| `MATTER_SUBSCRIBE_ENABLED` | `false` | listener | Enable long-lived Matter subscriptions. |
| `MATTER_SUBSCRIBE_RESTART_DELAY_MS` | `2000` | listener | Delay before restarting Matter subscribe worker. |
| `MATTER_SUBSCRIBE_HEALTHY_AFTER_MS` | `5000` | listener | Time before clearing stale subscription errors. |
| `MATTER_SUBSCRIBE_MIN_INTERVAL_SEC` | `0` | chip-tool subscribe | Requested min report interval. |
| `MATTER_SUBSCRIBE_MAX_INTERVAL_SEC` | `30` | chip-tool subscribe | Requested max report interval. |
| `MATTER_SUBSCRIBE_ENDPOINT_IDS` | `0xFFFF,1,0` | chip-tool subscribe | Endpoint IDs to subscribe. |
| `MATTER_CHIP_TOOL_STATE_DIR` | `/app/data/chip-tool-state` | chip-tool scripts | State directory for chip-tool. |
| `MATTER_CHIP_TOOL_TIMEOUT_SEC` | poll:`20`, commission:`90` | chip-tool scripts | Generic chip-tool timeout in seconds. |
| `MATTER_CHIP_TOOL_SUBSCRIBE_TIMEOUT_SEC` | fallback to `MATTER_CHIP_TOOL_TIMEOUT_SEC` | chip-tool subscribe | Subscribe command timeout. |

## Web Build/Dev (usually not needed in Docker runtime)

| Variable | Default | Used by | Description |
|---|---|---|---|
| `VITE_API_BASE_URL` | `http://localhost:3001` | web build/dev | Vite dev proxy target / build-time API base. |
| `VITE_API_TOKEN` | empty | web build/dev | Adds `x-api-token` from frontend fetch layer. |

## API Authentication (important)

- If `API_TOKEN` is empty: all routes are open.
- If `API_TOKEN` is set:
  - `GET/HEAD/OPTIONS` remain open.
  - Write routes (`POST`, `PATCH`, `DELETE`) require one of:
    - Header `X-API-Token: <token>`
    - Header `Authorization: Bearer <token>`

## API Essentials

- Base URL:
  - Direct listener: `http://<listener-host>:${API_PORT}`
  - Through web container proxy: `http://<web-host>:${WEB_PORT}/api`
- Health check endpoint: `GET /api/health`
- Setup/discovery endpoints used by UI:
  - `GET /api/setup/discovered`
  - `POST /api/setup/scan`
  - `POST /api/setup/pair`
- If `API_TOKEN` is configured, include one of these headers on write calls:
  - `X-API-Token: <token>`
  - `Authorization: Bearer <token>`
