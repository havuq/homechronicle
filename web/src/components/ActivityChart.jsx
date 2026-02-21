import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid,
} from 'recharts';
import { useHourlyStats } from '../hooks/useEvents.js';

export default function ActivityChart() {
  const { data, isLoading } = useHourlyStats();

  // Fill in missing hours with 0
  const chartData = Array.from({ length: 24 }, (_, hour) => {
    const found = data?.find((d) => parseInt(d.hour, 10) === hour);
    return {
      hour: hour === 0 ? '12am' : hour < 12 ? `${hour}am` : hour === 12 ? '12pm' : `${hour - 12}pm`,
      count: found ? parseInt(found.count, 10) : 0,
    };
  });

  if (isLoading) {
    return <div className="h-48 flex items-center justify-center text-gray-400 text-sm">Loading…</div>;
  }

  return (
    <div>
      <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wider mb-3">
        Events by Hour (last 30 days)
      </h3>
      <ResponsiveContainer width="100%" height={200}>
        <BarChart data={chartData} margin={{ top: 0, right: 0, left: -20, bottom: 0 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
          <XAxis
            dataKey="hour"
            tick={{ fontSize: 11 }}
            interval={2}
          />
          <YAxis tick={{ fontSize: 11 }} />
          <Tooltip
            contentStyle={{ fontSize: 13 }}
            formatter={(val) => [val, 'Events']}
          />
          <Bar dataKey="count" fill="#3b82f6" radius={[3, 3, 0, 0]} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
