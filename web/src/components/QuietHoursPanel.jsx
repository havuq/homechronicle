import { Moon, CheckCircle2 } from 'lucide-react';
import { useQuietHours } from '../hooks/useEvents.js';

function utcHourToLocal(utcHour) {
  return ((utcHour + new Date().getTimezoneOffset() / -60) % 24 + 24) % 24;
}

function formatHour12(h) {
  const period = h < 12 ? 'AM' : 'PM';
  const display = h % 12 === 0 ? 12 : h % 12;
  return `${display} ${period}`;
}

function formatLastSeen(ts) {
  if (!ts) return null;
  const d = new Date(ts);
  return d.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' });
}

export default function QuietHoursPanel() {
  const { data, isLoading, isError } = useQuietHours();

  const header = (
    <div className="flex items-center gap-2 mb-3">
      <Moon size={14} className="text-indigo-400" />
      <h3 className="text-sm font-semibold text-gray-700">Quiet Hours</h3>
    </div>
  );

  if (isLoading) {
    return <div>{header}<p className="text-sm text-gray-400">Checking quiet hours…</p></div>;
  }
  if (isError) {
    return <div>{header}<p className="text-sm text-gray-400">Unable to load quiet hours data.</p></div>;
  }

  if (data?.enabled === false) {
    return (
      <div>
        {header}
        <p className="text-sm text-gray-400">
          Configure quiet hours in Settings to flag unexpected nighttime activity.
        </p>
      </div>
    );
  }

  const startLocal = formatHour12(utcHourToLocal(data?.quietHoursStart ?? 23));
  const endLocal = formatHour12(utcHourToLocal(data?.quietHoursEnd ?? 6));
  const events = data?.events ?? [];

  if (!events.length) {
    return (
      <div>
        {header}
        <div className="flex items-center gap-2 text-sm text-gray-500">
          <CheckCircle2 size={14} className="text-emerald-500 flex-shrink-0" />
          <span>No unexpected activity during quiet hours ({startLocal} – {endLocal})</span>
        </div>
      </div>
    );
  }

  return (
    <div>
      <div className="flex items-baseline justify-between mb-3">
        <div className="flex items-center gap-2">
          <Moon size={14} className="text-indigo-400" />
          <h3 className="text-sm font-semibold text-gray-700">Quiet Hours Activity</h3>
        </div>
        <span className="text-xs text-gray-400">{startLocal} – {endLocal}</span>
      </div>
      <div className="space-y-2">
        {events.map((row) => (
          <div key={`${row.accessoryId ?? row.accessoryName}:${row.lastSeenAt}`} className="rounded-lg border border-indigo-100 bg-indigo-50/70 px-3 py-2">
            <div className="flex items-center gap-2 text-xs text-indigo-700">
              <Moon size={12} />
              <span className="font-semibold truncate">{row.accessoryName}</span>
              {row.room && <span className="text-indigo-400 truncate">{row.room}</span>}
              <span className="ml-auto whitespace-nowrap">{row.count} event{row.count !== 1 ? 's' : ''}</span>
            </div>
            {row.lastSeenAt && (
              <div className="text-xs text-indigo-600 mt-0.5">
                Last seen {formatLastSeen(row.lastSeenAt)}
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
