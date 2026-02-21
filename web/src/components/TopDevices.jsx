import { useTopDevices } from '../hooks/useEvents.js';
import { getServiceIcon } from '../lib/icons.js';

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
      <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wider mb-3">
        Most Active Devices (last 7 days)
      </h3>
      <div className="space-y-2">
        {data.map((device) => {
          const count = parseInt(device.event_count, 10);
          const pct = Math.round((count / max) * 100);
          const Icon = getServiceIcon(null);

          return (
            <div key={device.accessory_name} className="flex items-center gap-3">
              <div className="w-36 truncate text-sm text-gray-700">{device.accessory_name}</div>
              <div className="flex-1 bg-gray-100 rounded-full h-2">
                <div
                  className="bg-blue-500 h-2 rounded-full"
                  style={{ width: `${pct}%` }}
                />
              </div>
              <div className="text-xs text-gray-400 w-12 text-right">{count}</div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
