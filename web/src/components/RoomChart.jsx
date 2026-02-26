import { useState } from 'react';
import clsx from 'clsx';
import { useRoomStats } from '../hooks/useEvents.js';
import { getRoomColor } from '../lib/roomColors.js';

const WINDOWS = [
  { label: '7d',  days: 7  },
  { label: '30d', days: 30 },
];

function toCount(value) {
  const n = Number(value);
  return Number.isFinite(n) ? n : 0;
}

export default function RoomChart() {
  const [days, setDays] = useState(7);
  const { data, isLoading } = useRoomStats(days);

  if (isLoading) {
    return <div className="h-32 flex items-center justify-center text-gray-400 text-sm">Loading…</div>;
  }
  if (!data?.length) {
    return <p className="text-sm text-gray-400">No room data yet.</p>;
  }

  const max = Math.max(...data.map((d) => toCount(d.count ?? d.event_count)), 1);

  return (
    <div>
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-sm font-semibold text-gray-700">Events by Room</h3>
        <div className="flex gap-1">
          {WINDOWS.map(({ label, days: d }) => (
            <button
              key={d}
              onClick={() => setDays(d)}
              className={clsx(
                'text-xs px-2 py-0.5 rounded-md transition-colors',
                days === d
                  ? 'bg-blue-100 text-blue-700 font-medium'
                  : 'text-gray-400 hover:text-gray-600 hover:bg-gray-100'
              )}
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      <div className="space-y-2.5">
        {data.map((row) => {
          const count     = toCount(row.count ?? row.event_count);
          const pct       = Math.round((count / max) * 100);
          const roomColor = getRoomColor(row.room_name);

          return (
            <div key={row.room_name ?? '__unknown__'} className="flex items-center gap-2.5">
              {/* Room badge */}
              <div className="w-28 flex-shrink-0 flex justify-end">
                <span
                  className="text-[11px] px-1.5 py-0.5 rounded-full font-medium max-w-full truncate"
                  style={
                    roomColor
                      ? { backgroundColor: roomColor.bg, color: roomColor.text }
                      : { color: '#9ca3af' }
                  }
                >
                  {row.room_name || 'Unknown'}
                </span>
              </div>

              {/* Bar */}
              <div className="flex-1 bg-gray-100 rounded-full h-2">
                <div
                  className="h-2 rounded-full transition-all"
                  style={{
                    width: `${pct}%`,
                    backgroundColor: roomColor?.dot ?? '#60a5fa',
                  }}
                />
              </div>

              {/* Count */}
              <div className="text-xs text-gray-400 w-10 text-right tabular-nums flex-shrink-0">
                {count.toLocaleString()}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
