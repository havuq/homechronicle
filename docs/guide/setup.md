# Setup Guide

## Prerequisites

- **Docker Engine** and **Docker Compose** plugin installed
- A machine on the same local network as your HomeKit/Matter accessories
- HomeKit accessory PIN codes (8-digit, format `111-22-333`)

Verify Docker is installed:

```bash
docker --version
docker compose version
```

## Quick Start

```bash
# Clone the repository
git clone https://github.com/havuq/homechronicle.git
cd homechronicle

# Create the persistent data directory
mkdir -p listener/data

# Copy the example environment file
cp .env.example .env

# Generate an API token and add it to .env
openssl rand -hex 32
# Edit .env and paste the token as API_TOKEN=<token>

# Start all services
docker compose up -d
```

Open `http://localhost:3000` in your browser.

## Configuration

### Required Environment Variables

Edit `.env` with at minimum:

| Variable | Description |
|----------|-------------|
| `POSTGRES_PASSWORD` | Database password (change from default) |
| `API_TOKEN` | Auth token for write endpoints (generate with `openssl rand -hex 32`) |

### Common Configuration

| Variable | Default | Description |
|----------|---------|-------------|
| `TZ` | `UTC` | Container timezone |
| `WEB_PORT` | `3000` | Port for the web dashboard |
| `API_PORT` | `3001` | Port for the listener API |
| `RETENTION_DAYS` | `365` | How long to keep events |
| `STALE_THRESHOLD_HOURS` | `12` | Hours without an event before a device is flagged stale |
| `ALERTS_ENABLED` | `false` | Enable webhook alert rules |

For the full list, see [Environment Variables](environment-variables.md).

### Event Retention & Archiving

By default, events older than `RETENTION_DAYS` (365) are swept daily. Before deletion, expired events are copied to the `event_logs_archive` table so historical data is preserved.

You can toggle archiving from **Manage** > **Settings** > **Archive before delete**, or via the API:

```bash
curl -X PATCH http://localhost:3001/api/setup/retention \
  -H "Content-Type: application/json" \
  -H "X-API-Token: <token>" \
  -d '{"archiveBeforeDelete": false}'
```

When disabled, expired events are permanently deleted — this saves disk space but the data cannot be recovered.

### Quiet Hours

Quiet hours flag unexpected device activity during a time window you define (e.g., 11 PM – 6 AM). Events that fire during quiet hours are highlighted on the dashboard and timeline.

Enable from **Manage** > **Settings**, or via the API:

```bash
curl -X PATCH http://localhost:3001/api/setup/retention \
  -H "Content-Type: application/json" \
  -H "X-API-Token: <token>" \
  -d '{"quietHoursEnabled": true, "quietHoursStart": 23, "quietHoursEnd": 6}'
```

- `quietHoursStart` and `quietHoursEnd` are hours in UTC (0–23)
- The dashboard shows a **Quiet Hours** panel when enabled, listing any activity during the window

## Networking

### Host Mode (Recommended)

The listener needs to be on the host network for mDNS discovery and Matter IPv6 link-local communication. This is the default:

```
LISTENER_NETWORK_MODE=host
```

The web container runs in bridge mode and proxies `/api/*` to the listener.

### Bridge Mode Alternative

If you cannot use host networking:

```
LISTENER_NETWORK_MODE=bridge
LISTENER_HOST=listener
```

Note: HomeKit/Matter device discovery may be unreliable in bridge mode.

### Web-to-Listener Routing

The web container proxies API requests to the listener. Key variables:

| Variable | Default | Description |
|----------|---------|-------------|
| `LISTENER_HOST` | `host.docker.internal` | How the web container reaches the listener |
| `LISTENER_PORT` | Same as `API_PORT` | Listener port for the proxy |

If `host.docker.internal` doesn't resolve (some Linux Docker setups), use your server's LAN IP instead.

## Security

### API Token

In production (`NODE_ENV=production`), the listener requires `API_TOKEN` to be set. Without it, the listener will refuse to start.

- **Write routes** (`POST`, `PATCH`, `DELETE`) always require the token
- **Read routes** (`GET`, `HEAD`) are open by default; set `API_TOKEN_READS_ENABLED=true` to require auth for reads too

Send the token as a header:

```
X-API-Token: <your-token>
```

or:

```
Authorization: Bearer <your-token>
```

### CORS

By default, only localhost origins are allowed. To allow other origins:

```
CORS_ALLOWED_ORIGINS=https://home.example.com,https://other.example.com
```

## Updating

```bash
docker compose pull
docker compose up -d
```

The database schema is migrated automatically on startup.

## Data Persistence

| Path | Contents | Notes |
|------|----------|-------|
| `listener/data/pairings.json` | Device pairing keys | Never commit this file |
| `listener/data/rooms.json` | Room assignments | Created via API/UI |
| `listener/data/notes.json` | Device notes | Created via API/UI |
| `listener/data/retention.json` | Retention settings | Created via API/UI |
| PostgreSQL volume | All event data | Named volume `postgres-data` by default |

## Local Development

For development without Docker (listener and web run natively):

```bash
./scripts/dev-local.sh
```

This starts PostgreSQL in Docker, then runs the listener (port 3001) and Vite dev server (port 5173) locally.

### Running Tests

```bash
# Listener tests
cd listener && npm test

# Web tests
cd web && npm test
```
