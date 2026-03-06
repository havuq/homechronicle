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
| `HOST_DBUS_SOCKET` | `/run/dbus/system_bus_socket` | compose listener volume | Host D-Bus socket mounted into listener so libdns_sd can use host `avahi-daemon`. |
| `LISTENER_HOST` | `host.docker.internal` | web proxy | Host/IP web uses to proxy `/api` to listener. |
| `LISTENER_PORT` | `API_PORT` (fallback `3001`) | web proxy | Listener API port used by web proxy. If unset, compose reuses `API_PORT`. |
| `DATABASE_URL` | auto-built from PG vars | listener | Explicit PostgreSQL connection string. |

### Web/listener routing presets

- Host-network listener (default):
  - `LISTENER_NETWORK_MODE=host`
  - `LISTENER_HOST=host.docker.internal` (or your Docker host LAN IP if needed)
- Bridge-network listener:
  - `LISTENER_NETWORK_MODE=bridge`
  - `LISTENER_HOST=listener`
- Keep `API_PORT` and web `LISTENER_PORT` aligned (default `3001`) or `/api` requests can fail with `502`.

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
| `API_TOKEN` | empty | listener + web proxy | Write-route auth token. Required when `NODE_ENV=production` (listener exits if empty). |
| `API_TOKEN_READS_ENABLED` | `false` | listener | When `true`, `GET`/`HEAD` API routes also require `API_TOKEN`. |
| `API_JSON_LIMIT` | `256kb` | listener | Maximum JSON body size accepted by `express.json()`. |
| `API_WRITE_RATE_LIMIT_WINDOW_MS` | `60000` | listener | Window size for write-route rate limiting (milliseconds). |
| `API_WRITE_RATE_LIMIT_MAX` | `60` | listener | Max write requests per window per client key. |
| `API_STATS_RATE_LIMIT_WINDOW_MS` | `60000` | listener | Window size for stats/accessories read-route rate limiting (milliseconds). |
| `API_STATS_RATE_LIMIT_MAX` | `120` | listener | Max stats/accessories requests per window per client key. |
| `EVENTS_RATE_LIMIT_WINDOW_MS` | `60000` | listener | Window size for `/api/events*` read-route rate limiting (milliseconds). |
| `EVENTS_RATE_LIMIT_MAX` | `300` | listener | Max `/api/events*` requests per window per client key. |
| `ALERTS_READ_RATE_LIMIT_WINDOW_MS` | `60000` | listener | Window size for `/api/alerts` GET rate limiting (milliseconds). |
| `ALERTS_READ_RATE_LIMIT_MAX` | `180` | listener | Max `/api/alerts` GET requests per window per client key. |
| `ALERTS_WRITE_RATE_LIMIT_WINDOW_MS` | `60000` | listener | Window size for `/api/alerts` write-route rate limiting (milliseconds). |
| `ALERTS_WRITE_RATE_LIMIT_MAX` | `60` | listener | Max `/api/alerts` write requests per window per client key. |
| `CORS_ALLOWED_ORIGINS` | empty | listener | Comma-separated browser origin allow-list for CORS. |
| `CORS_ALLOW_LOCALHOST` | `true` | listener | If allow-list is empty, allow localhost/loopback browser origins. |
| `PAIRINGS_FILE` | `/app/data/pairings.json` in prod | listener | Pairings JSON storage path. |
| `ROOMS_FILE` | `/app/data/rooms.json` in prod | listener | Rooms JSON storage path. |
| `RETENTION_FILE` | `/app/data/retention.json` in prod | listener | Retention settings JSON storage path. |
| `STORE_REFRESH_INTERVAL_MS` | `30000` | listener | Refresh interval for JSON stores. |
| `DISCOVERY_SCAN_ENABLED` | `true` | listener | Enable periodic HomeKit discovery scans. |
| `DISCOVER_IFACE` | auto | listener | Interface for mDNS discovery (example: `en0`). If Matter devices are on a separate VLAN, set this to the VLAN sub-interface (e.g. `bond0.20`). See [limitations.md](../limitations.md#platform-note-vlan--segregated-iot-networks). |

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
| `ALERTS_ALLOW_PRIVATE_TARGETS` | `true` | listener | Allow webhook targets on RFC1918/private ranges. Loopback/link-local targets are always blocked. |
| `RUN_CYCLE_OFF_DELAY_MS` | `900000` | listener | Delay synthetic OFF for run-cycle switches. |
| `RECONNECT_BASE_MS` | `5000` | listener | Initial reconnect delay for HomeKit subscribers. |
| `RECONNECT_MAX_MS` | `60000` | listener | Max reconnect delay for HomeKit subscribers. |

## Matter

| Variable | Default | Used by | Description |
|---|---|---|---|
| `MATTER_POLL_INTERVAL_MS` | `5000` | listener | Poll interval for Matter runtime. |
| `MATTER_SUBSCRIBE_ENABLED` | `false` | listener | Enable long-lived Matter subscriptions (via matter.js in-process). |
| `MATTER_SUBSCRIBE_RESTART_DELAY_MS` | `2000` | listener | Delay before restarting a failed Matter subscription. |
| `MATTER_SUBSCRIBE_MIN_INTERVAL_SEC` | `1` | listener | Requested min subscription report interval. |
| `MATTER_SUBSCRIBE_MAX_INTERVAL_SEC` | `30` | listener | Requested max subscription report interval. |
| `MATTER_STORAGE_PATH` | `/app/data/matter-storage` (prod) | listener | Persistent storage directory for matter.js controller state. |
| `MATTER_SCAN_TIMEOUT_MS` | `15000` | listener | Timeout for Matter device discovery scan. |

## Web Build/Dev (usually not needed in Docker runtime)

| Variable | Default | Used by | Description |
|---|---|---|---|
| `VITE_API_BASE_URL` | `http://localhost:3001` | web build/dev | Vite dev proxy target / build-time API base. |
| `VITE_API_TOKEN` | empty | web dev | Adds `x-api-token` from frontend fetch/proxy only in local dev mode. |

## API Authentication (important)

- If `NODE_ENV=production` and `API_TOKEN` is empty: listener startup fails.
- If `API_TOKEN` is empty in non-production: all routes are open.
- If `API_TOKEN` is set:
  - Write routes (`POST`, `PATCH`, `DELETE`) require one of:
    - Header `X-API-Token: <token>`
    - Header `Authorization: Bearer <token>`
  - `GET/HEAD` remain open unless `API_TOKEN_READS_ENABLED=true`.

### Setting `API_TOKEN`

Generate a strong random token:

```bash
openssl rand -hex 32
```

Set it in `.env`:

```bash
API_TOKEN=<paste-generated-token>
```

Do not use a generic token value (for example `changeme` or `token123`).

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
