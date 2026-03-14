# homechronicle documentation

homechronicle is a self-hosted event log for Apple HomeKit and Matter devices. It captures every state change from your accessories and presents them in a searchable timeline with activity analytics.

## What It Does

- **Records every event** — lights turning on, motion detected, temperature changes, door locks, and more
- **Searchable timeline** — filter by room, accessory, characteristic, or date range
- **Activity analytics** — daily trends, hourly distributions, heatmaps, device rankings
- **Device management** — discover, pair, and monitor accessories from the web UI
- **Webhook alerts** — get notified when specific events occur (enable with `ALERTS_ENABLED=true`)

## Architecture at a Glance

Three Docker services work together:

| Service | Role |
|---------|------|
| **PostgreSQL 16** | Stores events, alert rules, and delivery logs |
| **Listener** (Node.js) | Subscribes to HomeKit/Matter devices, serves the REST API |
| **Web** (React + Nginx) | Dashboard UI, proxies API requests to the listener |

## Quick Links

- [Setup Guide](setup.md) — install and run homechronicle
- [Device Setup](devices.md) — discover, pair, and configure accessories
- [API Reference](api-reference.md) — all REST endpoints
- [Architecture](architecture.md) — how the system works under the hood
- [Troubleshooting](troubleshooting.md) — common issues and fixes

## Requirements

- Docker Engine and Docker Compose plugin
- A machine on the same network as your HomeKit accessories (NAS, Raspberry Pi, desktop, etc.)
- HomeKit accessory PINs (the 8-digit code from the device label or Apple Home)
