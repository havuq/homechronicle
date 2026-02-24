import { format } from 'date-fns';
import { Zap, Calendar, Activity, MapPin } from 'lucide-react';
import { useDailyStats, useTopDevices, useRoomStats } from '../hooks/useEvents.js';

function Card({ icon: Icon, label, value, sub, bgClass, iconClass }) {
  return (
    <div className="bg-white rounded-xl shadow-sm p-4 flex items-start gap-3">
      <div className={`flex-shrink-0 w-9 h-9 rounded-xl flex items-center justify-center ${bgClass}`}>
        <Icon size={16} className={iconClass} />
      </div>
      <div className="min-w-0 flex-1">
        <div className="text-[10px] font-semibold uppercase tracking-wider text-gray-400 mb-0.5">
          {label}
        </div>
        <div className="text-2xl font-bold text-gray-800 leading-tight truncate">
          {value ?? '—'}
        </div>
        {sub != null && (
          <div className="text-xs text-gray-400 mt-0.5 truncate">{sub}</div>
        )}
      </div>
    </div>
  );
}

export default function StatsCards() {
  const { data: daily }      = useDailyStats(7);
  const { data: topDevices } = useTopDevices();
  const { data: rooms }      = useRoomStats(7);

  const todayKey   = format(new Date(), 'yyyy-MM-dd');
  const todayRow   = daily?.find((d) => d.day?.startsWith(todayKey));
  const eventsToday = todayRow ? parseInt(todayRow.count, 10) : 0;
  const eventsWeek  = daily?.reduce((sum, d) => sum + parseInt(d.count, 10), 0) ?? null;

  const topDevice = topDevices?.[0];
  // filter out null/empty room names for the top-room card
  const topRoom   = rooms?.find((r) => r.room_name);

  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
      <Card
        icon={Zap}
        label="Today"
        value={daily ? eventsToday.toLocaleString() : '…'}
        sub={eventsToday === 1 ? '1 event' : null}
        bgClass="bg-blue-50"
        iconClass="text-blue-500"
      />
      <Card
        icon={Calendar}
        label="This Week"
        value={eventsWeek != null ? eventsWeek.toLocaleString() : '…'}
        sub="last 7 days"
        bgClass="bg-indigo-50"
        iconClass="text-indigo-500"
      />
      <Card
        icon={Activity}
        label="Top Device"
        value={topDevices ? (topDevice?.accessory_name ?? 'None') : '…'}
        sub={topDevice ? `${parseInt(topDevice.event_count, 10).toLocaleString()} events` : null}
        bgClass="bg-violet-50"
        iconClass="text-violet-500"
      />
      <Card
        icon={MapPin}
        label="Top Room"
        value={rooms ? (topRoom?.room_name ?? 'Unknown') : '…'}
        sub={topRoom ? `${parseInt(topRoom.event_count, 10).toLocaleString()} events` : null}
        bgClass="bg-emerald-50"
        iconClass="text-emerald-500"
      />
    </div>
  );
}
