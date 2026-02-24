import { useTopDevices } from '../hooks/useEvents.js';
import { getServiceIcon } from '../lib/icons.js';
import { getRoomColor } from '../lib/roomColors.js';

export default function TopDevices() {
  const { data, isLoading } = useTopDevices();

  if (isLoading) {
    return <div className="h-24 flex items-center justify-center text-gray-400 text-sm">Loading…</div>;
  }
  if (!data?.length) {
    return <p className="text-sm text-gray-400">No activity in the last 7 days.</p>;
  }

  const max = parseInt(data[0].event_count, 10);

  return (
    <div>
      <div className="flex items-baseline justify-between mb-3">
        <h3 className="text-sm font-semibold text-gray-700">Most Active Devices</h3>
        <span className="text-xs text-gray-400">last 7 days</span>
      </div>
      <div className="space-y-2.5">
        {data.map((device) => {
          const count     = parseInt(device.event_count, 10);
          const pct       = Math.round((count / max) * 100);
          const Icon      = getServiceIcon(device.service_type);
          const roomColor = getRoomColor(device.room_name);

          return (
            <div key={device.accessory_name} className="flex items-center gap-2.5">
              {/* Service icon */}
              <div className="flex-shrink-0 w-6 h-6 rounded-md bg-blue-50 flex items-center justify-center">
                <Icon size={13} className="text-blue-500" />
              </div>

              {/* Name + room */}
              <div className="w-32 flex-shrink-0 min-w-0">
                <div className="text-sm text-gray-700 truncate leading-tight">{device.accessory_name}</div>
                {device.room_name && (
                  <span
                    className="text-[10px] px-1 py-px rounded-full font-medium"
                    style={roomColor
                      ? { backgroundColor: roomColor.bg, color: roomColor.text }
                      : { color: '#9ca3af' }}
                  >
                    {device.room_name}
                  </span>
                )}
              </div>

              {/* Bar */}
              <div className="flex-1 bg-gray-100 rounded-full h-1.5">
                <div
                  className="bg-blue-500 h-1.5 rounded-full transition-all"
                  style={{ width: `${pct}%` }}
                />
              </div>

              {/* Count */}
              <div className="text-xs text-gray-400 w-8 text-right tabular-nums flex-shrink-0">
                {count}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
