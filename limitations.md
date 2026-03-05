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

## Setup flow scope is Phase 1 for Matter import/commission

The current Setup flow supports:
- importing/registering Matter pairings,
- commissioning from setup code,
- polling for events.

It does not yet implement richer commissioning orchestration paths (for example full BLE/thread-dataset-driven flows) in HomeChronicle itself.

Reference:
- Router notes: [listener/src/matter-router.js](listener/src/matter-router.js)

## Troubleshooting these limitations

1. Matter device is added but polling shows errors
- Check listener logs: `docker compose logs -f listener`.
- Confirm host networking in `.env`: `LISTENER_NETWORK_MODE=host`, then restart: `docker compose up -d`.
- Confirm IPv6/mDNS availability on the host network.
- Remove duplicate Matter pairings in Setup if the same node appears more than once.

2. Matter device is paired but no events appear
- Verify the device exposes supported clusters currently polled (`0x0006`, `0x0008`, `0x0045`, `0x0402`, `0x0405`, `0x0406`).
- If it uses other clusters, pairing can succeed but timeline events may remain empty until support is added.

3. Commissioning fails when using manual address/port
- Direct commissioning requires IPv6; use an IPv6 literal or a hostname that resolves to IPv6.
- If address-based commissioning fails, retry with on-network discovery from a fresh setup code.

4. Commissioning discovers device but times out during pairing (PASE timeout)
- This usually means the device is on a different VLAN from the Docker host.
- IPv6 link-local addresses (`fe80::`) do not route across VLANs.
- See the "VLAN / segregated IoT networks" section above for the fix.
