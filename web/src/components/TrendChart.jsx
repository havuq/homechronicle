import { useState } from 'react';
import {
  AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid,
} from 'recharts';
import { format, subDays } from 'date-fns';
import { useDailyStats } from '../hooks/useEvents.js';
import clsx from 'clsx';

const WINDOWS = [
  { label: '7d',  days: 7  },
  { label: '30d', days: 30 },
  { label: '90d', days: 90 },
];

const TOOLTIP_STYLE = { fontSize: 12, borderRadius: 8, border: '1px solid #e5e7eb' };

export default function TrendChart() {
  const [days, setDays] = useState(30);
  const { data, isLoading } = useDailyStats(days);

  const chartData = Array.from({ length: days }, (_, i) => {
    const day  = subDays(new Date(), days - 1 - i);
    const key  = format(day, 'yyyy-MM-dd');
    const found = data?.find((d) => d.day?.startsWith(key));
    return {
      day:   days <= 14 ? format(day, 'MMM d') : i % 7 === 0 ? format(day, 'MMM d') : format(day, 'd'),
      count: found ? parseInt(found.count, 10) : 0,
    };
  });

  if (isLoading) {
    return <div className="h-48 flex items-center justify-center text-gray-400 text-sm">Loading…</div>;
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-sm font-semibold text-gray-700">Daily Activity</h3>
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
      <ResponsiveContainer width="100%" height={180}>
        <AreaChart data={chartData} margin={{ top: 4, right: 4, left: -24, bottom: 0 }}>
          <defs>
            <linearGradient id="trendGradient" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%"  stopColor="#3b82f6" stopOpacity={0.15} />
              <stop offset="95%" stopColor="#3b82f6" stopOpacity={0}    />
            </linearGradient>
          </defs>
          <CartesianGrid strokeDasharray="3 3" stroke="#f3f4f6" vertical={false} />
          <XAxis
            dataKey="day"
            tick={{ fontSize: 10, fill: '#9ca3af' }}
            interval={days <= 14 ? 0 : days <= 30 ? 6 : 13}
            tickLine={false}
            axisLine={false}
          />
          <YAxis tick={{ fontSize: 10, fill: '#9ca3af' }} tickLine={false} axisLine={false} />
          <Tooltip
            contentStyle={TOOLTIP_STYLE}
            formatter={(val) => [val, 'events']}
            labelStyle={{ fontWeight: 600, marginBottom: 2 }}
          />
          <Area
            type="monotone"
            dataKey="count"
            stroke="#3b82f6"
            strokeWidth={2}
            fill="url(#trendGradient)"
            dot={false}
            activeDot={{ r: 4, strokeWidth: 0 }}
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}
