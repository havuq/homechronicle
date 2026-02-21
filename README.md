# HomeKit Event Log

A self-hosted dashboard that captures every state change from your HomeKit accessories and displays them in a searchable, filterable timeline with activity charts.

Apple's Home app shows you the current state of your accessories — this shows you everything that *happened* and when.

## Features

- **Timeline** — scrollable event feed grouped by day, with filters for room, accessory name, and date range
- **Dashboard** — bar chart of activity by hour, 7-day trend line, top active devices
- **Accessories** — list of all paired devices with last-seen timestamps
- **Always-on** — runs 24/7 in Docker; no phone required
- **Non-destructive** — pairs alongside Apple Home without disrupting it

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
- HomeKit accessories on the same local network
- The 8-digit PIN for each accessory you want to pair

## Quick Start

### 1. Clone and configure

```bash
git clone https://github.com/havuq/homekit-eventlog.git
cd homekit-eventlog
cp .env.example .env
# Edit .env — change POSTGRES_PASSWORD at minimum
```

### 2. Start Postgres

```bash
docker compose up postgres -d
```

### 3. Discover accessories on your network

```bash
docker compose run --rm listener node src/discover.js
```

This scans for 10 seconds and prints all HomeKit accessories it finds. Note the **Device ID** for each one you want to pair.

### 4. Pair each accessory

```bash
docker compose run --rm listener node src/pairing.js "<device-id>" "<pin>"
# Example:
docker compose run --rm listener node src/pairing.js "AA:BB:CC:DD:EE:FF" "111-22-333"
```

Devices already paired with Apple Home can be paired here simultaneously — HomeKit allows multiple controllers. The PIN is the same code used when you first added the device to Apple Home (also visible in the Home app under accessory settings).

Repeat for each accessory. Keys are saved to `listener/data/pairings.json`.

### 5. Start everything

```bash
docker compose up -d
```

Open **http://localhost:3000** (or replace `localhost` with your server's IP).

### 6. Restart listener after pairing new devices

```bash
docker compose restart listener
```

## Local Development (macOS)

`network_mode: host` doesn't work on Docker Desktop for Mac, so a `docker-compose.override.yml` is included that switches to bridge networking for local testing.

To seed the database with fake events for UI development:

```bash
docker compose run --rm listener node src/seed.js
```

Then bring up the full stack:

```bash
docker compose up -d
```

## NAS Deployment (Synology / QNAP)

Copy the project to your NAS (do **not** copy `docker-compose.override.yml` — that's for local dev only). The base `docker-compose.yml` uses `network_mode: host` on the listener container, which is required for mDNS to work on Linux.

```bash
# On the NAS:
cp .env.example .env   # edit passwords
docker compose up -d
docker compose run --rm listener node src/discover.js
```

If mDNS discovery fails, check that `avahi-daemon` is running on the NAS host, or add an mDNS repeater container to your stack.

## API

The listener exposes a REST API on port 3001 (proxied through the web container at `/api`):

| Endpoint | Description |
|----------|-------------|
| `GET /api/events` | Paginated events. Params: `page`, `limit`, `room`, `accessory`, `characteristic`, `from`, `to` |
| `GET /api/accessories` | All known accessories with last-seen time |
| `GET /api/stats/hourly` | Event count by hour of day (last 30 days) |
| `GET /api/stats/daily` | Event count by day (last 90 days) |
| `GET /api/stats/top-devices` | Most active accessories (last 7 days) |
| `GET /api/health` | Health check + paired device count |

## Project Structure

```
homekit-eventlog/
├── docker-compose.yml           # Production stack
├── docker-compose.override.yml  # Local dev overrides (macOS)
├── .env.example                 # Environment variable template
├── db/
│   └── init.sql                 # PostgreSQL schema
├── listener/                    # Node.js HomeKit bridge + API
│   ├── Dockerfile
│   ├── package.json
│   └── src/
│       ├── index.js             # Entry point + Express API
│       ├── discover.js          # mDNS scanner CLI
│       ├── pairing.js           # Pairing CLI
│       ├── subscriber.js        # HAP event subscriptions
│       ├── db.js                # PostgreSQL client
│       └── seed.js              # Fake data for local dev
└── web/                         # React + Vite frontend
    ├── Dockerfile
    ├── nginx.conf.template
    └── src/
        ├── App.jsx
        ├── components/
        ├── hooks/
        └── lib/
```

## Security Notes

- `listener/data/pairings.json` contains your HomeKit pairing keys — this file is gitignored and should never be committed or shared
- `.env` is gitignored; only `.env.example` is in the repo
- The web UI and API are not authenticated — run behind a VPN or firewall, not exposed to the public internet

## License

MIT
