# Portainer Stack Example

Use the Portainer-specific compose file in this repo:

- `docker-compose.portainer.yml`

This file does not use `env_file`, so it works with Portainer Stack environment variables directly.

## Recommended Deployment (Portainer Stack from Git)

1. In Portainer, go to **Stacks** -> **Add stack**.
2. Choose **Repository**.
3. Set:
   - Repository URL: `https://github.com/havuq/homechronicle.git` (repo root only; no `/tree/...` or `/blob/...`)
   - Reference:
     - Newer Portainer (dropdown): select `main`
     - Some versions (text field): use `refs/heads/main`
     - Release tag example: `refs/tags/v1.2.3`
   - Compose path: `docker-compose.portainer.yml`
4. In the stack **Environment variables** section, add at least:
   - `POSTGRES_PASSWORD` (required)
   - `API_TOKEN` (required; generate with `openssl rand -hex 32`)
5. Optional but recommended:
   - `POSTGRES_USER=homekit`
   - `POSTGRES_DB=homekit_events`
   - `TZ=UTC`
   - Full variable reference: [Environment Variables](./environment-variables.md)
6. Deploy the stack.

If you get `could not find ref "main"`:

1. Confirm URL is exactly `https://github.com/havuq/homechronicle.git`.
2. Switch reference to `refs/heads/main`.
3. If your Portainer auto-populates refs from the repo, pick `main` from that list instead of typing manually.

If you get `.env not found`, confirm the compose path is `docker-compose.portainer.yml`.

## Network Preset (Most Users on Linux/NAS)

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

From the host shell:

```bash
docker compose ps
docker compose logs -f listener web postgres
docker compose exec web sh -lc 'wget -qO- "http://$LISTENER_HOST:$LISTENER_PORT/api/health" || echo health-failed'
```

If `/api/health` fails from `web`, update `LISTENER_HOST` first.
