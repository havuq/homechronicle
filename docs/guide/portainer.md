# Portainer Deployment

homechronicle includes a Portainer-specific compose file that works with Portainer Stack environment variables directly (no `.env` file needed).

## Setup

1. In Portainer, go to **Stacks** > **Add stack**
2. Choose **Repository**
3. Configure:
   - **Repository URL**: `https://github.com/havuq/homechronicle.git`
   - **Reference**: select `main` (or a release tag like `refs/tags/v1.2.3`)
   - **Compose path**: `docker-compose.portainer.yml`
4. Add **Environment variables**:
   - `POSTGRES_PASSWORD` (required)
   - `API_TOKEN` (required — generate with `openssl rand -hex 32`)
5. Optional but recommended:
   - `POSTGRES_USER=homekit`
   - `POSTGRES_DB=homekit_events`
   - `TZ=UTC`
6. Deploy the stack

## Network Configuration

**Most users (Linux/NAS):**

```
LISTENER_NETWORK_MODE=host
LISTENER_HOST=host.docker.internal
API_PORT=3001
```

If `host.docker.internal` doesn't resolve, use your server's LAN IP (e.g., `192.168.1.20`). Do not use `localhost` or `127.0.0.1`.

**Bridge mode alternative:**

```
LISTENER_NETWORK_MODE=bridge
LISTENER_HOST=listener
```

Host networking is recommended for HomeKit/Matter discovery reliability.

## Common Issues

**"could not find ref main":**
- Confirm URL is exactly `https://github.com/havuq/homechronicle.git`
- Try `refs/heads/main` in the reference field
- If Portainer auto-populates refs, pick `main` from the dropdown

**".env not found":**
- Confirm compose path is `docker-compose.portainer.yml` (not `docker-compose.yml`)

## Health Checks

```bash
docker compose ps
docker compose logs -f listener web postgres
docker compose exec web sh -lc 'wget -qO- "http://$LISTENER_HOST:$LISTENER_PORT/api/health" || echo health-failed'
```

If `/api/health` fails from the web container, update `LISTENER_HOST` first.
