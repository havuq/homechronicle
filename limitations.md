# HomeChronicle Limitations

This file tracks current product limitations so users know what behavior is expected.

## Matter polling covers a limited cluster set

Current Matter polling reads a fixed cluster list only:
- On/Off (`0x0006`)
- Level Control (`0x0008`)
- Boolean State (`0x0045`)
- Temperature (`0x0402`)
- Relative Humidity (`0x0405`)
- Occupancy (`0x0406`)

Other cluster types may be paired but not produce timeline events until support is added.

References:
- Implementation: [listener/src/matter-controller.js](listener/src/matter-controller.js)

## Matter depends on local network reachability (mDNS/IPv6)

Matter polling/commissioning reliability depends on endpoint reachability over local network transports. In containerized installs, host networking is strongly recommended and is the default in compose.

What this means:
- Non-host/container-isolated networking setups may fail with transport errors (for example, endpoint unavailable).
- Direct commissioning requires IPv6 when an explicit address is provided.

References:
- Compose default host networking: [docker-compose.yml](docker-compose.yml)
- Env guidance: [.env.example](.env.example)

### Platform note: VLAN / segregated IoT networks

If your Matter devices are on a separate VLAN (e.g. an IoT VLAN on `172.16.2.x`) from the Docker host (e.g. `172.16.1.x`), Matter commissioning will **discover** the device via mDNS but **fail during pairing** with a PASE timeout.

Why:
- mDNS discovery uses multicast, which your router can relay across VLANs.
- Matter commissioning uses unicast IPv6 link-local (`fe80::`) addresses, which are confined to a single Layer 2 segment and cannot cross VLAN boundaries.

Fix — add a VLAN interface on the Docker host so it has Layer 2 presence on the IoT VLAN:

1. Create a VLAN sub-interface on the host (e.g. via TrueNAS UI → Network → Interfaces → Add VLAN, or manually):
   ```bash
   # Example: bond0 parent, VLAN tag 20, static IP on the IoT subnet
   ip link add link bond0 name bond0.20 type vlan id 20
   ip addr add 172.16.2.50/24 dev bond0.20
   ip link set bond0.20 up
   ```
2. Confirm IPv6 link-local is present:
   ```bash
   ip -6 addr show dev bond0.20 scope link
   ```
3. Confirm the Matter device is reachable:
   ```bash
   ping6 -c 3 fe80::<device-link-local>%bond0.20
   ```
4. Set `DISCOVER_IFACE` in `.env` to the VLAN interface name:
   ```
   DISCOVER_IFACE=bond0.20
   ```
   matter.js natively binds mDNS to this interface — no ip6tables workaround is needed.

5. Restart the listener: `docker compose up -d listener`.

Symptoms if this is not configured:
- Matter discovery finds the device but commissioning times out with PASE errors.
- `ping6 fe80::<device>%<host-interface>` returns `Destination unreachable: Address unreachable`.

### Platform note: macOS

matter.js is pure TypeScript and runs natively on macOS — no Docker required for the listener. To run Matter on macOS:

1. Run the listener directly with Node.js (`npm run dev` in `listener/`).
2. Set `DISCOVER_IFACE=en0` (or your active network interface) so matter.js binds mDNS to the correct interface.
3. Matter devices on the same LAN are reachable directly via the Mac's network stack.

Docker Desktop on macOS is **not recommended** for Matter: it runs containers in a Linux VM where `network_mode: host` maps to the VM's network, not the Mac's. This prevents mDNS/IPv6 link-local from reaching devices on your LAN. For containerized deployments, use a Linux host (NAS, Raspberry Pi, etc.).

## Matter commissioning uses IP transport only

The Setup flow supports commissioning via IP (on-network) and manual node import. BLE and Thread dataset commissioning are not supported — devices must be reachable over the local network.

## Troubleshooting

### General

| Symptom | Fix |
|---------|-----|
| Setup shows `Scan failed: HTTP 502` | Verify `LISTENER_HOST` is reachable from the web container and `API_PORT` matches (default `3001`). |
| No events after pairing a HomeKit device | Check `docker compose logs -f listener` for subscription errors. Restart: `docker compose restart listener`. |
| Listener keeps reconnecting | The device may be unreachable. Confirm mDNS/Bonjour works on the host (`dns-sd -B _hap._tcp` on macOS, `avahi-browse -rt _hap._tcp` on Linux). |

### Matter

| Symptom | Fix |
|---------|-----|
| Polling errors after adding a device | Confirm host networking (`LISTENER_NETWORK_MODE=host`) and IPv6/mDNS on the host. Check `docker compose logs -f listener`. |
| Paired but no events appear | The device likely uses clusters outside the supported set (see above). Pairing succeeds but no timeline events are produced. |
| Commissioning fails with manual address/port | Direct commissioning requires IPv6. Use an IPv6 literal or retry with on-network discovery. |
| Discovery works but commissioning times out (PASE) | Device is on a different VLAN. IPv6 link-local does not route across VLANs — see the VLAN section above. |
| Duplicate nodes in Setup | Remove the extra pairing in Setup and restart the listener. |
