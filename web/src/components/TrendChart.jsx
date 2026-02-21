import {
  LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid,
} from 'recharts';
import { format, subDays } from 'date-fns';
import { useDailyStats } from '../hooks/useEvents.js';

export default function TrendChart() {
  const { data, isLoading } = useDailyStats();

  // Show last 30 days, fill missing with 0
  const last30 = Array.from({ length: 30 }, (_, i) => {
    const day = subDays(new Date(), 29 - i);
    const key = format(day, 'yyyy-MM-dd');
    const found = data?.find((d) => d.day?.startsWith(key));
    return {
      day: format(day, 'MMM d'),
      count: found ? parseInt(found.count, 10) : 0,
    };
  });

  if (isLoading) {
    return <div className="h-48 flex items-center justify-center text-gray-400 text-sm">Loading…</div>;
  }

  return (
    <div>
      <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wider mb-3">
        Daily Activity (last 30 days)
      </h3>
      <ResponsiveContainer width="100%" height={200}>
        <LineChart data={last30} margin={{ top: 0, right: 0, left: -20, bottom: 0 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
          <XAxis dataKey="day" tick={{ fontSize: 11 }} interval={6} />
          <YAxis tick={{ fontSize: 11 }} />
          <Tooltip
            contentStyle={{ fontSize: 13 }}
            formatter={(val) => [val, 'Events']}
          />
          <Line
            type="monotone"
            dataKey="count"
            stroke="#3b82f6"
            strokeWidth={2}
            dot={false}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
