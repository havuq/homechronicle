# HomeChronicle

HomeChronicle is a self-hosted event log for Apple HomeKit.
It shows what happened in your home over time, not just the current state.

## What You Get

- Timeline of HomeKit activity (what changed and when)
- Easy setup from the web app (no terminal pairing flow)
- Filter by room, device, and date
- Accessory activity dashboard and trends
- Works with Homebridge bridges and child devices
- Runs 24/7 with Docker

## Quick Start (Docker Compose)

### 1. Install requirements

- Docker
- Docker Compose

### 2. Download and configure

```bash
git clone https://github.com/havuq/homechronicle.git
cd homechronicle
cp .env.example .env
```

Open `.env` and set a strong `POSTGRES_PASSWORD`.

### 3. Start HomeChronicle

```bash
docker compose up -d
```

Then open:

- `http://localhost:3000` (same machine), or
- `http://<your-server-ip>:3000` (another device on your network)

### 4. Pair your HomeKit devices

1. Open **Setup** in the app.
2. Click **Rescan Network**.
3. Enter your device PIN(s) (`111-22-333` format).
4. Click **Pair Selected**.

Events will begin showing in the Timeline once pairing succeeds.

## Daily Use

- `docker compose ps` to check containers
- `docker compose logs -f listener web postgres` to view logs
- `docker compose restart listener` if you need to reconnect device subscriptions

## Update HomeChronicle

```bash
git pull
docker compose pull
docker compose up -d
```

## GitHub Wiki

Detailed guides have been moved to the GitHub Wiki:

- Troubleshooting: [Troubleshooting Wiki](https://github.com/havuq/homechronicle/wiki/Troubleshooting)
- Install as Phone App (PWA): [PWA Install Wiki](https://github.com/havuq/homechronicle/wiki/Install-as-a-Phone-App-(PWA))
- Project Structure: [Project Structure Wiki](https://github.com/havuq/homechronicle/wiki/Project-Structure)

You can also browse all docs here: [HomeChronicle Wiki](https://github.com/havuq/homechronicle/wiki)

## License

MIT
