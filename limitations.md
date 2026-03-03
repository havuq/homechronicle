# HomeChronicle Limitations

This file tracks current product limitations so users know what behavior is expected.

## Matter connected-service name in Apple Home shows "Matter Test"

When HomeChronicle commissions via `chip-tool`, Apple Home may label the connected service as **Matter Test** instead of **HomeChronicle**.

Why:
- HomeChronicle currently uses `chip-tool` test-controller style commissioning.
- The stack logs show test vendor identity (`0xFFF1`), and Apple Home uses controller identity metadata for the Connected Services label.

What this means:
- This label is not currently configurable from HomeChronicle UI/settings.
- Existing commissioned entries will keep their original label.

References:
- `chip-tool` commissioner workflow: <https://project-chip.github.io/connectedhomeip-doc/development_controllers/chip-tool/chip_tool_guide.html>
- Test vendor IDs (including `0xFFF1`) are reserved for testing: <https://developers.home.google.com/matter/integration/create>

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
- Implementation: [listener/src/matter-chiptool/poll.mjs](listener/src/matter-chiptool/poll.mjs)

## Matter depends on local network reachability (mDNS/IPv6)

Matter polling/commissioning reliability depends on endpoint reachability over local network transports. In containerized installs, host networking is strongly recommended and is the default in compose.

What this means:
- Non-host/container-isolated networking setups may fail with transport errors (for example, endpoint unavailable).
- Direct commissioning requires IPv6 when an explicit address is provided.

References:
- Compose default host networking: [docker-compose.yml](docker-compose.yml)
- Env guidance: [.env.example](.env.example)
- IPv6 requirement in direct commissioning: [listener/src/matter-chiptool/commission.mjs](listener/src/matter-chiptool/commission.mjs)

### Platform note: macOS + Docker Desktop

HomeChronicle Matter polling/commissioning is currently designed around host-network behavior from the listener runtime. Docker Desktop on macOS runs containers inside a Linux VM, so container networking is not the same as native host networking on Linux.

What this means:
- macOS Docker Desktop is not a supported host for reliable Matter operation in this deployment model.
- For dependable Matter behavior, run HomeChronicle on a Linux host (including Linux NAS/Raspberry Pi) where listener host networking and local mDNS/IPv6 reachability are available.

## Matter commissioning currently bypasses attestation verification

Current commissioning passes `--bypass-attestation-verifier true` to `chip-tool`.

What this means:
- This improves practical interoperability for user setups.
- It relaxes identity verification compared with strict attestation checks.

Reference:
- [listener/src/matter-chiptool/commission.mjs](listener/src/matter-chiptool/commission.mjs)

## Setup flow scope is Phase 1 for Matter import/commission

The current Setup flow supports:
- importing/registering Matter pairings,
- commissioning from setup code,
- polling for events.

It does not yet implement richer commissioning orchestration paths (for example full BLE/thread-dataset-driven flows) in HomeChronicle itself.

Reference:
- Router notes: [listener/src/matter-router.js](listener/src/matter-router.js)

## Troubleshooting these limitations

1. Connected service shows "Matter Test" in Apple Home
- This is expected with current `chip-tool` controller identity.
- Re-adding the same flow will not rename it to "HomeChronicle".
- If the label is a blocker, use HomeChronicle with this known behavior until production commissioner credentials are implemented.

2. Matter device is added but polling shows errors
- Check listener logs: `docker compose logs -f listener`.
- Confirm host networking in `.env`: `LISTENER_NETWORK_MODE=host`, then restart: `docker compose up -d`.
- Confirm IPv6/mDNS availability on the host network.
- Remove duplicate Matter pairings in Setup if the same node appears more than once.

3. Matter device is paired but no events appear
- Verify the device exposes supported clusters currently polled (`0x0006`, `0x0008`, `0x0045`, `0x0402`, `0x0405`, `0x0406`).
- If it uses other clusters, pairing can succeed but timeline events may remain empty until support is added.

4. Commissioning fails when using manual address/port
- Direct commissioning requires IPv6; use an IPv6 literal or a hostname that resolves to IPv6.
- If address-based commissioning fails, retry with on-network discovery from a fresh setup code.

5. Advanced: override Matter command templates only when needed
- Default compose setup does not need `MATTER_COMMISSION_CMD` or `MATTER_POLL_CMD`; built-in defaults are used.
- Override these only for advanced deployments (for example running `chip-tool` through a custom wrapper/host-network helper container).
- Example overrides in `.env`:
  - `MATTER_COMMISSION_CMD=node src/matter-chiptool/commission.mjs {nodeId} {setupCode} {address} {port}`
  - `MATTER_POLL_CMD=node src/matter-chiptool/poll.mjs {nodeId}`
- After changing command templates, restart listener: `docker compose up -d listener`.
