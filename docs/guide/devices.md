# Device Setup

homechronicle supports two protocols for device communication: **HomeKit** (HAP) and **Matter** (alpha).

## HomeKit Devices

### Discovery

Before pairing, you need to discover accessories on your network.

**From the Web UI:**

1. Go to the **Manage** tab
2. Click **Scan Network**
3. Wait ~10 seconds for mDNS discovery to complete
4. Available accessories appear in the list

**From the CLI:**

```bash
docker compose run --rm listener node src/discover.js
```

Set a specific network interface if needed:

```bash
DISCOVER_IFACE=en0 docker compose run --rm listener node src/discover.js
```

The scan output shows each accessory's name, device ID (e.g., `AA:BB:CC:DD:EE:FF`), address, port, and pairing status.

### Pairing

Devices already paired with Apple Home can also be paired with homechronicle simultaneously. You use the same PIN.

**From the Web UI:**

1. After scanning, click **Pair** next to an accessory
2. Enter the 8-digit PIN (format: `111-22-333`)
3. The listener starts subscribing to events immediately

**From the CLI:**

```bash
docker compose run --rm listener node src/pairing.js <device-id> <pin>

# Example:
docker compose run --rm listener node src/pairing.js AA:BB:CC:DD:EE:FF 111-22-333
```

After CLI pairing, restart the listener to start subscribing:

```bash
docker compose restart listener
```

### Bridges (Homebridge, etc.)

When you pair a bridge device, homechronicle automatically discovers and subscribes to all child accessories behind it. You can view bridge children in the **Manage** tab or via:

```
GET /api/setup/bridge-children/:deviceId
```

### Room Assignment

HomeKit does not expose room names over the protocol. You assign rooms manually:

**From the Web UI:**
- Go to **Manage** > click a device > set the room name

**From the API:**
```bash
curl -X PATCH http://localhost:3001/api/setup/room \
  -H "Content-Type: application/json" \
  -H "X-API-Token: <token>" \
  -d '{"accessoryId": "<id>", "roomName": "Living Room"}'
```

Room assignments are stored in `listener/data/rooms.json`.

## Matter Devices (Alpha)

Matter support is built into the listener image.

### Commissioning

**From the Web UI:**

1. Go to **Manage** > **Matter** section
2. Click **Scan** to discover Matter devices
3. Enter the setup code to commission a device

**From the API:**

```bash
curl -X POST http://localhost:3001/api/setup/matter/pair \
  -H "Content-Type: application/json" \
  -H "X-API-Token: <token>" \
  -d '{"name": "My Device", "setupCode": "<code>"}'
```

### Polling vs Subscriptions

Matter devices are monitored in two ways:

| Mode | Default | Description |
|------|---------|-------------|
| **Polling** | Enabled, every 5s | Periodically reads device state |
| **Subscriptions** | Disabled | Long-lived connections for real-time updates |

Configure via environment variables:

```
MATTER_POLL_INTERVAL_MS=5000
MATTER_SUBSCRIBE_ENABLED=false
```

### Supported Matter Clusters

- On/Off
- Level Control
- Temperature Measurement
- Relative Humidity Measurement
- Occupancy Sensing

## Event Subscriptions

Once paired, the listener maintains persistent connections to all HomeKit accessories. For each state change (light on/off, temperature reading, motion detected, etc.), the listener:

1. Receives the HAP event
2. Records `old_value` from its in-memory cache
3. Inserts a row into the `event_logs` table
4. Evaluates alert rules (if enabled)
5. Updates the value cache

### Reconnection

If a device becomes unreachable, the listener automatically reconnects with exponential backoff:

- Initial delay: 5 seconds (`RECONNECT_BASE_MS`)
- Maximum delay: 60 seconds (`RECONNECT_MAX_MS`)

### Background Discovery

By default, the listener runs a background mDNS scan every hour to detect new devices and update IP addresses for existing pairings. Disable with:

```
DISCOVERY_SCAN_ENABLED=false
```

## Unpairing

**From the Web UI:**
- Go to **Manage** > click a device > **Remove Pairing**

**From the API:**
```bash
curl -X DELETE http://localhost:3001/api/setup/pairing/<deviceId> \
  -H "X-API-Token: <token>"
```

This removes the pairing keys and stops the subscriber. Event history for the device is preserved.
