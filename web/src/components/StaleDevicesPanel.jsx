import { AlertTriangle } from 'lucide-react';
import { useAccessories } from '../hooks/useEvents.js';

function staleScore(device) {
  const offline = Number(device?.health?.offlineDurationSeconds) || 0;
  const missed = Number(device?.health?.missedHeartbeats) || 0;
  return offline * 100 + missed;
}

function isBridgeParent(device) {
  const idParts = String(device?.accessory_id ?? '').split(':');
  return idParts.length === 6 && Number(device?.category) === 2;
}

export default function StaleDevicesPanel() {
  const { data: accessories, isLoading } = useAccessories();

  if (isLoading) {
    return <div className="text-sm text-gray-400">Checking device heartbeat…</div>;
  }

  const staleRows = (accessories ?? [])
    .filter((device) => device?.health?.isStale && !isBridgeParent(device))
    .sort((a, b) => staleScore(b) - staleScore(a))
    .slice(0, 8);

  if (!staleRows.length) {
    return <p className="text-sm text-gray-400">No stale devices right now.</p>;
  }

  return (
    <div>
      <div className="flex items-baseline justify-between mb-3">
        <h3 className="text-sm font-semibold text-gray-700">Stale Devices</h3>
        <span className="text-xs text-gray-400">heartbeat lagging</span>
      </div>
      <div className="space-y-2">
        {staleRows.map((device) => (
          <div key={device.accessory_id} className="rounded-lg border border-amber-100 bg-amber-50/70 px-3 py-2">
            <div className="flex items-center gap-2 text-xs text-amber-700">
              <AlertTriangle size={12} />
              <span className="uppercase tracking-wide font-semibold">Device</span>
              {device.health?.status && (
                <span className="text-amber-500">{device.health.status}</span>
              )}
            </div>
            <div className="text-sm text-amber-900 mt-1">
              {device.accessory_name}
            </div>
            <div className="text-xs text-amber-700 mt-0.5">
              {Number.isFinite(device?.health?.missedHeartbeats) ? `${device.health.missedHeartbeats} missed heartbeat${device.health.missedHeartbeats === 1 ? '' : 's'}` : 'heartbeat missing'}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
