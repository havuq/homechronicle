import { formatDistanceToNow } from 'date-fns';
import { useAccessories } from '../hooks/useEvents.js';
import { getServiceIcon } from '../lib/icons.js';

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

  // Group by room
  const byRoom = accessories.reduce((acc, a) => {
    const room = a.room_name ?? 'No room';
    if (!acc[room]) acc[room] = [];
    acc[room].push(a);
    return acc;
  }, {});

  return (
    <div className="max-w-2xl mx-auto py-6 px-4 space-y-6">
      {Object.entries(byRoom).sort().map(([room, items]) => (
        <div key={room}>
          <h2 className="text-xs font-semibold uppercase tracking-wider text-gray-400 mb-2">{room}</h2>
          <div className="bg-white rounded-xl shadow-sm divide-y divide-gray-100">
            {items.map((accessory) => {
              const Icon = getServiceIcon(accessory.service_type);
              return (
                <div key={accessory.accessory_id} className="flex items-center gap-3 px-4 py-3">
                  <div className="w-9 h-9 rounded-full bg-blue-50 flex items-center justify-center flex-shrink-0">
                    <Icon size={18} className="text-blue-600" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="font-medium text-gray-900 truncate">{accessory.accessory_name}</div>
                    <div className="text-xs text-gray-400 mt-0.5">
                      {accessory.service_type ?? 'Unknown type'}
                      {accessory.last_seen && (
                        <span className="ml-2">
                          · last seen {formatDistanceToNow(new Date(accessory.last_seen), { addSuffix: true })}
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      ))}
    </div>
  );
}
