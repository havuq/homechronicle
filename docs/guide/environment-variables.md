# Environment Variables

This documents all supported environment variables for homechronicle.

Use `.env.example` for a minimal setup, then add only what you need from this reference.

## Compose / Deployment

| Variable | Default | Used by | Description |
|---|---|---|---|
| `TZ` | `UTC` | all | Container timezone |
| `POSTGRES_IMAGE` | `postgres:16-alpine` | compose | Override Postgres image tag |
| `LISTENER_IMAGE` | `ghcr.io/havuq/homechronicle/listener:latest` | compose | Override listener image tag |
| `WEB_IMAGE` | `ghcr.io/havuq/homechronicle/web:latest` | compose | Override web image tag |
| `WEB_PORT` | `3000` | compose | Host port for web container |
| `POSTGRES_PORT` | `5432` | compose | Host port for PostgreSQL |
| `POSTGRES_DATA_SOURCE` | `postgres-data` | compose | Source for PostgreSQL data mount (named volume or host path) |
| `LISTENER_DATA_SOURCE` | `./listener/data` | compose | Source for listener `/app/data` mount |
| `LISTENER_NETWORK_MODE` | `host` | compose | Listener network mode (`host` recommended for mDNS) |
| `HOST_DBUS_SOCKET` | `/run/dbus/system_bus_socket` | compose | Host D-Bus socket for avahi-daemon |
| `LISTENER_HOST` | `host.docker.internal` | web proxy | Host/IP web uses to proxy `/api` to listener |
| `LISTENER_PORT` | Same as `API_PORT` | web proxy | Listener port used by web proxy |
| `DATABASE_URL` | auto-built from PG vars | listener | Explicit PostgreSQL connection string |

### Web-to-Listener Routing Presets

**Host-network listener (default):**

```
LISTENER_NETWORK_MODE=host
LISTENER_HOST=host.docker.internal
```

**Bridge-network listener:**

```
LISTENER_NETWORK_MODE=bridge
LISTENER_HOST=listener
```

Keep `API_PORT` and `LISTENER_PORT` aligned (default `3001`) or `/api` requests will fail with `502`.

## PostgreSQL

| Variable | Default | Description |
|---|---|---|
| `POSTGRES_USER` | `homekit` | Database user |
| `POSTGRES_PASSWORD` | — | Database password (required) |
| `POSTGRES_DB` | `homekit_events` | Database name |

## Listener Core / API

| Variable | Default | Description |
|---|---|---|
| `API_PORT` | `3001` | Listener API listen port |
| `NODE_ENV` | `production` | Runtime mode |
| `API_TOKEN` | — | Write-route auth token (required in production) |
| `API_TOKEN_READS_ENABLED` | `false` | Require auth for GET/HEAD routes |
| `API_JSON_LIMIT` | `256kb` | Max JSON body size |
| `CORS_ALLOWED_ORIGINS` | — | Comma-separated origin allow-list |
| `CORS_ALLOW_LOCALHOST` | `true` | Allow localhost/loopback origins |
| `DISCOVER_IFACE` | auto | Network interface for mDNS (e.g., `en0`, `eth0`) |
| `DISCOVERY_SCAN_ENABLED` | `true` | Enable periodic background discovery |
| `STORE_REFRESH_INTERVAL_MS` | `30000` | JSON store refresh interval |

## Rate Limits

| Variable | Default | Description |
|---|---|---|
| `API_WRITE_RATE_LIMIT_WINDOW_MS` | `60000` | Write route rate limit window |
| `API_WRITE_RATE_LIMIT_MAX` | `60` | Max write requests per window |
| `API_STATS_RATE_LIMIT_WINDOW_MS` | `60000` | Stats/accessories rate limit window |
| `API_STATS_RATE_LIMIT_MAX` | `120` | Max stats requests per window |
| `EVENTS_RATE_LIMIT_WINDOW_MS` | `60000` | Events rate limit window |
| `EVENTS_RATE_LIMIT_MAX` | `300` | Max events requests per window |
| `ALERTS_READ_RATE_LIMIT_WINDOW_MS` | `60000` | Alerts read rate limit window |
| `ALERTS_READ_RATE_LIMIT_MAX` | `180` | Max alerts read requests per window |
| `ALERTS_WRITE_RATE_LIMIT_WINDOW_MS` | `60000` | Alerts write rate limit window |
| `ALERTS_WRITE_RATE_LIMIT_MAX` | `60` | Max alerts write requests per window |

## Performance / Cache

| Variable | Default | Description |
|---|---|---|
| `READ_CACHE_ENABLED` | `true` | Enable in-memory response cache |
| `READ_CACHE_TTL_MS` | `15000` | Cache TTL |
| `READ_CACHE_MAX_ENTRIES` | `200` | Max cached responses (LRU eviction) |
| `READ_CACHE_MAX_PAYLOAD_BYTES` | `2097152` | Skip caching payloads larger than this |

## Retention / Health

| Variable | Default | Description |
|---|---|---|
| `RETENTION_DAYS` | `365` | Event retention window in days |
| `RETENTION_SWEEP_MS` | `86400000` | Sweep interval (default 24h) |
| `RETENTION_ARCHIVE` | `true` | Archive events before deletion |
| `STALE_THRESHOLD_HOURS` | `12` | Hours without event before device is flagged stale |

## Alerts / Subscriber

| Variable | Default | Description |
|---|---|---|
| `ALERTS_ENABLED` | `false` | Enable alert rule processing |
| `ALERTS_WEBHOOK_TIMEOUT_MS` | `5000` | Webhook delivery timeout |
| `ALERTS_ALLOW_PRIVATE_TARGETS` | `true` | Allow RFC1918 webhook targets |
| `RECONNECT_BASE_MS` | `5000` | Initial reconnect delay |
| `RECONNECT_MAX_MS` | `60000` | Max reconnect delay |

## Matter

| Variable | Default | Description |
|---|---|---|
| `MATTER_POLL_INTERVAL_MS` | `5000` | Polling interval |
| `MATTER_SUBSCRIBE_ENABLED` | `false` | Enable long-lived Matter subscriptions |
| `MATTER_SUBSCRIBE_RESTART_DELAY_MS` | `2000` | Delay before restarting failed subscriptions |
| `MATTER_SUBSCRIBE_MIN_INTERVAL_SEC` | `1` | Min subscription report interval |
| `MATTER_SUBSCRIBE_MAX_INTERVAL_SEC` | `30` | Max subscription report interval |
| `MATTER_STORAGE_PATH` | `/app/data/matter-storage` | Matter.js controller state directory |
| `MATTER_SCAN_TIMEOUT_MS` | `15000` | Discovery scan timeout |

## API Authentication

- If `NODE_ENV=production` and `API_TOKEN` is empty, the listener refuses to start
- If `API_TOKEN` is set, write routes require `X-API-Token` or `Authorization: Bearer` header
- GET/HEAD routes are open unless `API_TOKEN_READS_ENABLED=true`

Generate a token:

```bash
openssl rand -hex 32
```
