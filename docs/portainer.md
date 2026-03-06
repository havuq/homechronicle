# Portainer Stack Example

HomeChronicle on Portainer is mostly the same as Docker Compose.
Use the same `docker-compose.yml` from this repo and set environment variables in Portainer.

## Recommended Deployment (Portainer Stack from Git)

1. In Portainer, go to **Stacks** -> **Add stack**.
2. Choose **Repository**.
3. Set:
   - Repository URL: `https://github.com/havuq/homechronicle.git`
   - Reference: `refs/heads/main` (or your release branch/tag)
   - Compose path: `docker-compose.yml`
4. In the stack environment variables section, set at least:
   - `POSTGRES_PASSWORD` (required)
   - `API_TOKEN` (required in production; generate with `openssl rand -hex 32`)
5. Deploy the stack.

## Network Preset (Most Users)

Use:

- `LISTENER_NETWORK_MODE=host`
- `LISTENER_HOST=host.docker.internal`
- `API_PORT=3001`

If `host.docker.internal` does not resolve on your Docker engine, set:

- `LISTENER_HOST=<your-server-lan-ip>` (example: `192.168.1.20`)

Do not use `localhost` or `127.0.0.1` for `LISTENER_HOST` in this setup.

## Bridge-Mode Alternative

If you cannot use host networking:

- `LISTENER_NETWORK_MODE=bridge`
- `LISTENER_HOST=listener`
- Keep `LISTENER_PORT` aligned with `API_PORT` (default `3001`)

Note: host networking is still the recommended mode for HomeKit/Matter discovery reliability on Linux hosts.

## Quick Health Checks

From the Portainer container console (or host shell):

```bash
docker compose ps
docker compose logs -f listener web postgres
docker compose exec web sh -lc 'wget -qO- "http://$LISTENER_HOST:$LISTENER_PORT/api/health" || echo health-failed'
```

If `/api/health` fails from `web`, update `LISTENER_HOST` first.
