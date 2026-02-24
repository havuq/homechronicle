import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, Cell,
} from 'recharts';
import { useHourlyStats } from '../hooks/useEvents.js';

// Convert the UTC-hour data from the API to local-time hours so the
// peak bar lines up with the user's actual clock, not UTC.
function utcHoursToLocal(apiRows = []) {
  const offsetHours = -new Date().getTimezoneOffset() / 60; // e.g. +10 for AEST, -5 for EST
  const utc = Array.from({ length: 24 }, (_, h) => {
    const found = apiRows.find((d) => parseInt(d.hour, 10) === h);
    return found ? parseInt(found.count, 10) : 0;
  });
  return Array.from({ length: 24 }, (_, localH) => {
    const utcH = ((localH - offsetHours) % 24 + 24) % 24;
    const label =
      localH === 0  ? 'midnight'
      : localH < 12 ? `${localH}am`
      : localH === 12 ? 'noon'
      : `${localH - 12}pm`;
    return { hour: label, localH, count: utc[Math.round(utcH)] };
  });
}

const TOOLTIP_STYLE = { fontSize: 12, borderRadius: 8, border: '1px solid #e5e7eb' };

export default function ActivityChart() {
  const { data, isLoading } = useHourlyStats();

  const chartData = utcHoursToLocal(data ?? []);
  const maxCount  = Math.max(...chartData.map((d) => d.count), 1);

  if (isLoading) {
    return <div className="h-48 flex items-center justify-center text-gray-400 text-sm">Loading…</div>;
  }

  return (
    <div>
      <div className="flex items-baseline justify-between mb-3">
        <h3 className="text-sm font-semibold text-gray-700">Events by Hour</h3>
        <span className="text-xs text-gray-400">last 30 days · local time</span>
      </div>
      <ResponsiveContainer width="100%" height={180}>
        <BarChart data={chartData} margin={{ top: 4, right: 4, left: -24, bottom: 0 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#f3f4f6" vertical={false} />
          <XAxis
            dataKey="hour"
            tick={{ fontSize: 10, fill: '#9ca3af' }}
            interval={5}
            tickLine={false}
            axisLine={false}
          />
          <YAxis tick={{ fontSize: 10, fill: '#9ca3af' }} tickLine={false} axisLine={false} />
          <Tooltip
            contentStyle={TOOLTIP_STYLE}
            formatter={(val) => [val, 'events']}
            labelStyle={{ fontWeight: 600, marginBottom: 2 }}
          />
          <Bar dataKey="count" radius={[3, 3, 0, 0]} maxBarSize={20}>
            {chartData.map((entry) => (
              <Cell
                key={entry.localH}
                fill={entry.count === maxCount ? '#2563eb' : entry.count > maxCount * 0.5 ? '#60a5fa' : '#bfdbfe'}
              />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
