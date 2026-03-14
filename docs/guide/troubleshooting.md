# Troubleshooting

## Device Discovery

### No devices found during scan

- Verify the listener is running: `docker compose ps`
- Check if `network_mode: host` is set for the listener in your compose file
- On Linux, ensure `avahi-daemon` is running on the host: `systemctl status avahi-daemon`
- Try specifying the network interface: set `DISCOVER_IFACE=eth0` (or your interface name) in `.env`
- Check listener logs for mDNS errors: `docker compose logs listener | grep -i discover`

### Devices show up but pairing fails

- Double-check the PIN code (format: `111-22-333`)
- Ensure the device is on the same network/VLAN as the listener
- Some devices need to be in pairing mode — check the manufacturer's instructions
- If the device was previously paired with homechronicle and uncleanly removed, it may need a factory reset

### Devices discovered but IP addresses are wrong

- The listener runs a background discovery scan every hour to update addresses
- Force an immediate scan from the **Manage** tab or via `POST /api/setup/scan`
- Check if your router's DHCP is assigning new IPs — consider using static IPs or DHCP reservations

## Connectivity

### Events stop arriving

1. Check device health in the **Accessories** tab — look for `stale` or `unreachable` status
2. Check listener logs: `docker compose logs -f listener`
3. Look for reconnection messages — the subscriber auto-reconnects with backoff
4. Verify the device is still powered on and reachable on the network
5. Try restarting the listener: `docker compose restart listener`

### 502 Bad Gateway from the web UI

The web container can't reach the listener API.

- Verify `LISTENER_HOST` and `LISTENER_PORT` are correct in `.env`
- If using `host.docker.internal`, check that it resolves: `docker compose exec web ping host.docker.internal`
- On Linux Docker without Docker Desktop, `host.docker.internal` may not work — use your server's LAN IP instead
- Check that `API_PORT` and `LISTENER_PORT` match (default: `3001`)

### Web UI loads but shows no data

- Check if the listener is healthy: `curl http://localhost:3001/api/health`
- If using `API_TOKEN_READS_ENABLED=true`, make sure the web container has the same `API_TOKEN`
- Check browser console for CORS errors — you may need to set `CORS_ALLOWED_ORIGINS`

## Database

### Listener fails to start with database errors

- Check PostgreSQL is running: `docker compose ps postgres`
- Wait for the health check to pass — the listener depends on `service_healthy`
- Verify `DATABASE_URL` matches your PostgreSQL credentials
- Check PostgreSQL logs: `docker compose logs postgres`

### Database is growing too large

- Check current retention settings: `GET /api/setup/retention`
- Lower `RETENTION_DAYS` (default 365) to keep fewer days of history
- Set `RETENTION_ARCHIVE=false` if you don't need the archive table
- The retention sweep runs every 24 hours by default (`RETENTION_SWEEP_MS`)
- Check archive table size: `docker compose exec postgres psql -U homekit homekit_events -c "SELECT count(*) FROM event_logs_archive;"`

## Docker

### Listener container keeps restarting

- Check logs: `docker compose logs listener`
- In production mode (`NODE_ENV=production`), `API_TOKEN` must be set or the listener exits immediately
- Verify `DATABASE_URL` is correct and PostgreSQL is reachable

### D-Bus / avahi errors

The listener mounts the host's D-Bus socket for mDNS. If you see D-Bus errors:

- Check the socket exists on the host: `ls -la /run/dbus/system_bus_socket`
- Verify `HOST_DBUS_SOCKET` in `.env` points to the correct path
- Install and start avahi-daemon on the host: `sudo apt install avahi-daemon && sudo systemctl enable --now avahi-daemon`

### Cannot pull images

If `docker compose pull` fails:

- Check your internet connection
- The images are hosted on GitHub Container Registry (`ghcr.io`)
- No authentication is required for public images
- Try pulling manually: `docker pull ghcr.io/havuq/homechronicle/listener:latest`

## Matter

### Matter devices not discovered

- Matter discovery uses BLE/WiFi — the host machine needs BLE or WiFi capability
- Check Matter runtime status: `GET /api/setup/matter/runtime`
- Increase scan timeout: `MATTER_SCAN_TIMEOUT_MS=30000`

### Matter commissioning times out

- Commissioning can take up to 5 minutes (the Nginx proxy timeout is 300s)
- Ensure the device is in commissioning mode
- Check listener logs for Matter-specific errors

### Matter polling stops

- After 10 consecutive errors, polling stops for that node
- Restart the listener to retry: `docker compose restart listener`
- Check if the device is still powered and reachable

## Alerts

### Webhooks not firing

- Verify `ALERTS_ENABLED=true` in `.env`
- Check that your rule is enabled: `GET /api/alerts/rules`
- Check the delivery log: `GET /api/alerts/deliveries` — look for `failed` or `suppressed` status
- If status is `suppressed`, the quiet period hasn't elapsed yet
- Test your webhook URL independently with curl

### Webhook delivery fails

- Check the `error` field in the delivery log
- By default, private IP targets are allowed (`ALERTS_ALLOW_PRIVATE_TARGETS=true`), but loopback and link-local are always blocked
- Timeout defaults to 5 seconds (`ALERTS_WEBHOOK_TIMEOUT_MS`)

## Performance

### Web UI is slow

- The read cache is enabled by default (`READ_CACHE_ENABLED=true`)
- Reduce the dashboard date range if the dataset is very large
- Check database query performance: long queries may indicate missing indexes (should auto-create on first run)

### High memory usage on listener

- Reduce `READ_CACHE_MAX_ENTRIES` (default 200)
- Reduce `READ_CACHE_MAX_PAYLOAD_BYTES` (default 2MB)
- If you have many paired devices, memory usage scales with the number of active HAP connections

## Logs

### Changing log verbosity

Change the log level at runtime without restarting:

```bash
curl -X PATCH http://localhost:3001/api/setup/log-level \
  -H "Content-Type: application/json" \
  -H "X-API-Token: <token>" \
  -d '{"level": "debug"}'
```

Available levels: `error`, `warn`, `info`, `debug`.

### Viewing logs

```bash
# All services
docker compose logs -f

# Just the listener
docker compose logs -f listener

# Last 100 lines
docker compose logs --tail=100 listener
```
