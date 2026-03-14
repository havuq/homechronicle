# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

HomeChronicle — a self-hosted event log for Apple HomeKit and Matter devices. Three Docker services: PostgreSQL 16, a Node.js listener (Express API + HAP/Matter subscriptions), and a React/Vite web UI served by Nginx.

## Development Commands

### Local development (starts postgres, listener, and web dev server):
```bash
./scripts/dev-local.sh
```
Web UI at http://localhost:5173, API at http://localhost:3001.

### Listener (from `listener/`):
```bash
npm run start          # production (reads ../.env)
npm run dev            # dev mode (DISCOVER_IFACE=en0, local DB)
npm test               # node --test (runs test/*.test.js)
npm run seed           # populate test data
```

### Web (from `web/`):
```bash
npm run dev            # Vite dev server with proxy to :3001
npm run build          # production build to dist/
npm test               # vitest run (jsdom)
```

### Docker:
```bash
docker compose up -d                    # start all services
docker compose up -d --build            # rebuild and start
docker compose logs -f listener         # tail listener logs
```

## Architecture

### Listener (Node.js, ES modules)
- **index.js** — Express server entry point; boots API routes, HAP subscribers, and Matter runtime
- **subscriber.js** — maintains persistent HAP event subscriptions via `hap-controller`; inserts events into PostgreSQL
- **matter-runtime.js / matter-controller.js** — Matter.js lifecycle and polling (On/Off, Level, Temp, Humidity, Occupancy)
- **db.js** — pg pool, `insertEvent()`, schema migrations, retention sweep
- **store.js** — `JsonObjectStore` for persistent JSON files (pairings, rooms, retention config) in `/app/data/`
- **events-router.js** — GET endpoints for events, accessories, stats
- **alerts-router.js + alerts.js** — webhook alert rules with quiet-period suppression

### Web (React 19, Vite, Tailwind v4)
- **App.jsx** — four tabs: Dashboard, Timeline, Accessories, Manage
- **hooks/** — custom hooks wrapping TanStack Query for all API calls
- **lib/api.js** — fetch wrapper; base URL from `VITE_API_BASE_URL` or Vite proxy
- **lib/episodes.js** — groups events into timeline episodes
- Charts use Recharts; icons use Lucide

### Database
- Schema in `db/init.sql` — auto-runs on first `docker compose up`
- Main table: `event_logs` (append-only); archive table: `event_logs_archive`
- `pg_trgm` extension for accessory name search
- Indexes optimized for timestamp-descending queries and stats aggregation

### Networking
- Listener uses `network_mode: host` for mDNS discovery and Matter IPv6 link-local
- Web container proxies `/api/*` to the listener via Nginx (300s timeout for Matter commissioning)
- Vite dev server proxies `/api` to localhost:3001

## Environment Variables

Copy `.env.example` to `.env`. Key variables:
- `API_TOKEN` — required in production; secures write endpoints (generate with `openssl rand -hex 32`)
- `LISTENER_NETWORK_MODE` — set to `host` on Linux for mDNS/Matter
- `RETENTION_DAYS` — event retention (default 365)

## CI

PR checks (`.github/workflows/ci.yml`): runs `npm ci` + `npm test` for both listener and web on Node 20.

## Conventions

- Do NOT add Co-Authored-By trailers to commits
- Pairing keys live in `listener/data/pairings.json` — gitignored, never commit
- Room names are assigned manually via the API (not available from HAP)
- ES module syntax throughout (`import`/`export`, `"type": "module"`)
