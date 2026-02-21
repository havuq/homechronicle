import { formatDistanceToNow } from 'date-fns';
import { useAccessories } from '../hooks/useEvents.js';
import { getServiceIcon } from '../lib/icons.js';
import { Network } from 'lucide-react';

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
  if (!lastSeen) return 'bg-gray-200';
  const age = Date.now() - new Date(lastSeen).getTime();
  if (age < 3_600_000)  return 'bg-green-400';   // < 1 hour
  if (age < 86_400_000) return 'bg-yellow-400';  // < 24 hours
  return 'bg-gray-300';
}

// ---------------------------------------------------------------------------
export default function AccessoryList() {
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

  // Build a map of bridgeId → bridge name for "via …" labels on child accessories
  const bridgeMap = accessories.reduce((m, a) => {
    if (a.accessory_id.split(':').length === 6) m[a.accessory_id] = a.accessory_name;
    return m;
  }, {});

  // Group by room, sort within each room by last_seen desc (never-seen at bottom)
  const byRoom = accessories.reduce((acc, a) => {
    const room = a.room_name ?? 'No room';
    if (!acc[room]) acc[room] = [];
    acc[room].push(a);
    return acc;
  }, {});

  for (const items of Object.values(byRoom)) {
    items.sort((a, b) => {
      if (!a.last_seen && !b.last_seen) return 0;
      if (!a.last_seen) return 1;
      if (!b.last_seen) return -1;
      return new Date(b.last_seen) - new Date(a.last_seen);
    });
  }

  return (
    <div className="max-w-2xl mx-auto py-6 px-4 space-y-6">
      {Object.entries(byRoom).sort().map(([room, items]) => (
        <div key={room}>
          <h2 className="text-xs font-semibold uppercase tracking-wider text-gray-400 mb-2">
            {room}
          </h2>
          <div className="bg-white rounded-xl shadow-sm divide-y divide-gray-100">
            {items.map((accessory) => {
              const parts      = accessory.accessory_id.split(':');
              const isBridge   = parts.length === 6 && (accessory.category === 2 || !accessory.last_seen);
              const childOf    = parentId(accessory.accessory_id);
              const bridgeName = childOf ? bridgeMap[childOf] : null;
              const Icon       = isBridge ? Network : getServiceIcon(accessory.service_type);
              const dot        = activityDot(accessory.last_seen);

              return (
                <div key={accessory.accessory_id} className="flex items-center gap-3 px-4 py-3">
                  {/* Activity dot */}
                  <div className={`w-2 h-2 rounded-full flex-shrink-0 ${dot}`} />

                  {/* Icon */}
                  <div className={`w-9 h-9 rounded-full flex items-center justify-center flex-shrink-0 ${isBridge ? 'bg-purple-50' : 'bg-blue-50'}`}>
                    <Icon size={18} className={isBridge ? 'text-purple-500' : 'text-blue-600'} />
                  </div>

                  {/* Text */}
                  <div className="flex-1 min-w-0">
                    <div className="font-medium text-gray-900 truncate">{accessory.accessory_name}</div>
                    <div className="text-xs text-gray-400 mt-0.5 flex flex-wrap gap-x-1.5">
                      {isBridge ? (
                        // Bridge row: show IP + paired time
                        <>
                          <span>Bridge</span>
                          {accessory.address && (
                            <><span className="text-gray-300">·</span><span>{accessory.address}</span></>
                          )}
                          {accessory.paired_at && (
                            <><span className="text-gray-300">·</span>
                            <span>paired {formatDistanceToNow(new Date(accessory.paired_at), { addSuffix: true })}</span></>
                          )}
                        </>
                      ) : (
                        // Child / standalone row
                        <>
                          {accessory.service_type
                            ? <span>{accessory.service_type}</span>
                            : <span className="italic">waiting for first event</span>
                          }
                          {bridgeName && (
                            <><span className="text-gray-300">·</span>
                            <span>via {bridgeName}</span></>
                          )}
                          {accessory.last_seen && (
                            <><span className="text-gray-300">·</span>
                            <span>last seen {formatDistanceToNow(new Date(accessory.last_seen), { addSuffix: true })}</span></>
                          )}
                        </>
                      )}
                    </div>
                  </div>

                  {/* Event count badge */}
                  {accessory.event_count > 0 && (
                    <div className="flex-shrink-0 text-xs text-gray-400 bg-gray-50 border border-gray-100 rounded-full px-2 py-0.5 whitespace-nowrap">
                      {accessory.event_count.toLocaleString()} {accessory.event_count === 1 ? 'event' : 'events'}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      ))}
    </div>
  );
}
