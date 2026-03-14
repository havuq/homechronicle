import { formatDistanceToNow } from 'date-fns';
import { useAccessories } from '../hooks/useEvents.js';
import { getServiceIcon } from '../lib/icons.js';
import { getRoomColor } from '../lib/roomColors.js';
import { AlertTriangle, ChevronDown, ChevronRight, Network } from 'lucide-react';
import clsx from 'clsx';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

// "AA:BB:CC:DD:EE:FF:3" → "AA:BB:CC:DD:EE:FF"  |  6-part ID → unchanged
function parentId(id) {
  const parts = id.split(':');
  return parts.length > 6 ? parts.slice(0, 6).join(':') : null;
}

// Activity dot color based on last_seen recency
function activityDot(lastSeen) {
  if (!lastSeen) return 'bg-sky-300';
  const age = Date.now() - new Date(lastSeen).getTime();
  if (age < 3_600_000)  return 'bg-green-400';   // < 1 hour
  if (age < 86_400_000) return 'bg-yellow-400';  // < 24 hours
  return 'bg-gray-300';
}

function formatSeconds(seconds) {
  if (!Number.isFinite(seconds) || seconds < 0) return null;
  const days = Math.floor(seconds / 86_400);
  const hours = Math.floor((seconds % 86_400) / 3_600);
  const mins = Math.floor((seconds % 3_600) / 60);
  if (days > 0) return `${days}d ${hours}h`;
  if (hours > 0) return `${hours}h ${mins}m`;
  return `${mins}m`;
}

function metadataSummary(accessory) {
  const parts = [];
  if (accessory.manufacturer) parts.push(accessory.manufacturer);
  if (accessory.model) parts.push(accessory.model);
  if (accessory.firmware_revision) parts.push(`FW ${accessory.firmware_revision}`);
  return parts.join(' · ');
}

function reliabilitySummary(accessory) {
  const stats = accessory.reliability ?? null;
  if (!stats) return null;

  const parts = [];
  if (Number.isFinite(stats.disconnects) && stats.disconnects > 0) {
    parts.push(`${stats.disconnects} disconnect${stats.disconnects === 1 ? '' : 's'}`);
  }
  if (Number.isFinite(stats.reconnect_attempts) && stats.reconnect_attempts > 0) {
    parts.push(`${stats.reconnect_attempts} reconnect${stats.reconnect_attempts === 1 ? '' : 's'}`);
  }
  if (Number.isFinite(stats.resubscribe_failures) && stats.resubscribe_failures > 0) {
    parts.push(`${stats.resubscribe_failures} resubscribe fail${stats.resubscribe_failures === 1 ? '' : 's'}`);
  }
  return parts.length ? parts.join(' · ') : null;
}

// ---------------------------------------------------------------------------
export default function AccessoryList({ onSelectAccessory }) {
  const { data: accessories, isLoading } = useAccessories();

  if (isLoading) {
    return <div className="flex justify-center py-12 text-gray-400">Loading…</div>;
  }

  if (!accessories?.length) {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-gray-400">
        <p className="text-lg font-medium">No accessories seen yet</p>
        <p className="text-sm mt-1">Pair your accessories and wait for the first event.</p>
      </div>
    );
  }

  // Build a map of bridgeId → bridge accessory for bridge banners
  const bridgeMap = {};
  const nonBridgeAccessories = [];
  for (const a of accessories) {
    const parts = a.accessory_id.split(':');
    const isBridge = parts.length === 6 && (a.category === 2 || !a.last_seen);
    if (isBridge) {
      bridgeMap[a.accessory_id] = a;
    } else {
      nonBridgeAccessories.push(a);
    }
  }

  // Group non-bridge accessories by room
  const byRoom = nonBridgeAccessories.reduce((acc, a) => {
    const room = a.room_name ?? 'No room';
    if (!acc[room]) acc[room] = [];
    acc[room].push(a);
    return acc;
  }, {});

  // Within each room, sort: group children by bridge first, then standalone,
  // and within each group sort by last_seen desc
  for (const items of Object.values(byRoom)) {
    items.sort((a, b) => {
      const aBridge = parentId(a.accessory_id) ?? '';
      const bBridge = parentId(b.accessory_id) ?? '';
      // Bridge children before standalone devices
      if (aBridge && !bBridge) return -1;
      if (!aBridge && bBridge) return 1;
      // Group by same bridge
      if (aBridge !== bBridge) return aBridge.localeCompare(bBridge);
      // Within same group, sort by last_seen desc
      if (!a.last_seen && !b.last_seen) return 0;
      if (!a.last_seen) return 1;
      if (!b.last_seen) return -1;
      return new Date(b.last_seen) - new Date(a.last_seen);
    });
  }

  return (
    <div className="max-w-2xl mx-auto py-6 px-4 space-y-6">
      <details className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden group">
        <summary className="list-none cursor-pointer px-4 py-3 flex items-center justify-between select-none">
          <div>
            <p className="text-sm font-semibold text-gray-900">Legend</p>
            <p className="text-xs text-gray-500">Icon and activity dot meanings</p>
          </div>
          <ChevronDown
            size={16}
            className="text-gray-400 transition-transform duration-200 group-open:rotate-180"
          />
        </summary>
        <div className="px-4 pb-4 border-t border-gray-100 space-y-3">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wide text-gray-400 mb-2">Icons</p>
            <div className="space-y-2">
              <div className="flex items-center gap-2 text-xs text-gray-600">
                <span className="w-7 h-7 rounded-full flex items-center justify-center bg-blue-50">
                  <span className="w-3.5 h-3.5 rounded-full bg-blue-200" />
                </span>
                <span>Service icon: accessory type (light, switch, sensor, lock, and others)</span>
              </div>
            </div>
          </div>
          <div>
            <p className="text-xs font-semibold uppercase tracking-wide text-gray-400 mb-2">Activity Dots</p>
            <div className="flex flex-wrap gap-x-4 gap-y-2 text-xs text-gray-600">
              <div className="flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-green-400" />
                <span>Green: active within 1 hour</span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-yellow-400" />
                <span>Yellow: active within 24 hours</span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-gray-300" />
                <span>Gray: older than 24 hours</span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-sky-300" />
                <span>Sky blue: no activity yet</span>
              </div>
            </div>
          </div>
        </div>
      </details>

      {Object.entries(byRoom)
        .sort(([a], [b]) => {
          if (a === 'No room') return 1;
          if (b === 'No room') return -1;
          return a.localeCompare(b);
        })
        .map(([room, items]) => {
        const roomColor = getRoomColor(room === 'No room' ? null : room);

        // Build ordered list of rows with bridge banners inserted
        const rows = [];
        let lastBridgeId = null;
        for (const accessory of items) {
          const bridgeId = parentId(accessory.accessory_id);
          if (bridgeId && bridgeId !== lastBridgeId) {
            const bridge = bridgeMap[bridgeId];
            rows.push({ type: 'bridge-banner', bridgeId, bridgeName: bridge?.accessory_name ?? bridgeId });
          }
          lastBridgeId = bridgeId;
          rows.push({ type: 'accessory', accessory });
        }

        return (
        <div key={room}>
          <div className="flex items-center gap-2 mb-2">
            {roomColor && (
              <span
                className="w-2.5 h-2.5 rounded-full flex-shrink-0"
                style={{ backgroundColor: roomColor.dot }}
              />
            )}
            <h2 className="text-xs font-semibold uppercase tracking-wider text-gray-400">
              {room}
            </h2>
          </div>
          <div
            className="bg-white rounded-xl shadow-sm divide-y divide-gray-100 overflow-hidden"
            style={roomColor ? { borderLeft: `3px solid ${roomColor.dot}` } : {}}
          >
            {rows.map((row) => {
              if (row.type === 'bridge-banner') {
                return (
                  <div
                    key={`bridge:${row.bridgeId}`}
                    className="flex items-center gap-2 px-4 py-1.5 bg-gray-50/80"
                  >
                    <Network size={12} className="text-gray-400" />
                    <span className="text-[11px] font-medium text-gray-400 tracking-wide">{row.bridgeName}</span>
                  </div>
                );
              }

              const accessory = row.accessory;
              const Icon       = getServiceIcon(accessory.service_type);
              const dot        = activityDot(accessory.last_seen);
              const health     = accessory.health ?? {};
              const offlineFor = formatSeconds(health.offlineDurationSeconds);
              const heartbeatFor = formatSeconds(health.heartbeatSeconds);
              const showStale = Boolean(health.isStale);
              const metadata = metadataSummary(accessory);
              const reliability = reliabilitySummary(accessory);
              const bridgeId = parentId(accessory.accessory_id);
              const isChild = Boolean(bridgeId);

              return (
                <button
                  key={accessory.accessory_id}
                  type="button"
                  onClick={() => onSelectAccessory?.(accessory.accessory_id)}
                  className={clsx(
                    'w-full flex items-center gap-3 py-3 text-left hover:bg-gray-50 transition-colors',
                    isChild ? 'pl-6 pr-4' : 'px-4',
                  )}
                >
                  {/* Activity dot */}
                  <div className={`w-2 h-2 rounded-full flex-shrink-0 ${dot}`} />

                  {/* Icon */}
                  <div className="w-9 h-9 rounded-full flex items-center justify-center flex-shrink-0 bg-blue-50">
                    <Icon size={18} className="text-blue-600" />
                  </div>

                  {/* Text */}
                  <div className="flex-1 min-w-0">
                    <div className="font-medium text-gray-900 truncate">{accessory.accessory_name}</div>
                    <div className="text-xs text-gray-400 mt-0.5 flex flex-wrap gap-x-1.5">
                      {accessory.service_type
                        ? <span>{accessory.service_type}</span>
                        : <span className="italic">waiting for first event</span>
                      }
                      {accessory.last_seen && (
                        <><span className="text-gray-300">·</span>
                        <span>last seen {formatDistanceToNow(new Date(accessory.last_seen), { addSuffix: true })}</span></>
                      )}
                      {health.status && health.status !== 'online' && (
                        <><span className="text-gray-300">·</span>
                        <span>{health.status}</span></>
                      )}
                    </div>
                    <div className="text-[11px] text-gray-400 mt-0.5 flex flex-wrap gap-x-1.5">
                      {metadata && (
                        <span>{metadata}</span>
                      )}
                      {offlineFor && health.status !== 'online' && (
                        <>
                          {metadata && <span className="text-gray-300">·</span>}
                          <span>offline for {offlineFor}</span>
                        </>
                      )}
                      {Number.isFinite(health.missedHeartbeats) && health.missedHeartbeats > 0 && (
                        <>
                          <span className="text-gray-300">·</span>
                          <span>
                            missed {health.missedHeartbeats} heartbeat{health.missedHeartbeats === 1 ? '' : 's'}
                          </span>
                        </>
                      )}
                      {heartbeatFor && (
                        <>
                          <span className="text-gray-300">·</span>
                          <span>heartbeat ~{heartbeatFor}</span>
                        </>
                      )}
                      {reliability && (
                        <>
                          <span className="text-gray-300">·</span>
                          <span>{reliability}</span>
                        </>
                      )}
                    </div>
                  </div>

                  {/* Event count badge */}
                  {(accessory.event_count > 0 || showStale) && (
                    <div className="flex flex-col items-end gap-1">
                      {showStale && (
                        <div className="inline-flex items-center gap-1 text-[11px] text-amber-700 bg-amber-50 border border-amber-200 rounded-full px-2 py-0.5 whitespace-nowrap">
                          <AlertTriangle size={11} />
                          stale device
                        </div>
                      )}
                      {accessory.event_count > 0 && (
                        <div className="flex-shrink-0 text-xs text-gray-400 bg-gray-50 border border-gray-100 rounded-full px-2 py-0.5 whitespace-nowrap">
                          {accessory.event_count.toLocaleString()} {accessory.event_count === 1 ? 'event' : 'events'}
                        </div>
                      )}
                    </div>
                  )}
                  <ChevronRight size={14} className="text-gray-300 flex-shrink-0" />
                </button>
              );
            })}
          </div>
        </div>
        );
      })}
    </div>
  );
}
