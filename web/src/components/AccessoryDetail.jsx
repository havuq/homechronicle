import { useMemo, useState } from 'react';
import { format, formatDistanceToNow, subDays } from 'date-fns';
import {
  ResponsiveContainer, AreaChart, Area, CartesianGrid, XAxis, YAxis, Tooltip,
} from 'recharts';
import { ArrowLeft, Activity, Clock3, ShieldCheck } from 'lucide-react';
import clsx from 'clsx';
import { useAccessoryDetail } from '../hooks/useEvents.js';
import { describeChange, getServiceIcon } from '../lib/icons.js';

const WINDOWS = [
  { label: '7d', days: 7 },
  { label: '30d', days: 30 },
  { label: '90d', days: 90 },
];
const TOOLTIP_STYLE = { fontSize: 12, borderRadius: 8, border: '1px solid #e5e7eb' };

function formatSeconds(seconds) {
  if (!Number.isFinite(seconds) || seconds < 0) return 'n/a';
  const days = Math.floor(seconds / 86_400);
  const hours = Math.floor((seconds % 86_400) / 3_600);
  const mins = Math.floor((seconds % 3_600) / 60);
  if (days > 0) return `${days}d ${hours}h`;
  if (hours > 0) return `${hours}h ${mins}m`;
  return `${mins}m`;
}

function formatRatio(value) {
  if (!Number.isFinite(value)) return 'n/a';
  return `${Math.round(value * 100)}%`;
}

function formatNumber(value, digits = 1) {
  if (!Number.isFinite(value)) return 'n/a';
  return Number(value).toLocaleString(undefined, { maximumFractionDigits: digits });
}

export default function AccessoryDetail({ accessoryId, onBack }) {
  const [days, setDays] = useState(30);
  const [page, setPage] = useState(1);
  const { data, isLoading, isError } = useAccessoryDetail(accessoryId, { days, page, limit: 100 });

  const accessory = data?.accessory ?? null;
  const history = data?.history ?? null;
  const uptime = data?.uptime ?? null;
  const currentState = data?.current_state ?? [];
  const Icon = getServiceIcon(accessory?.service_type);

  const chartData = useMemo(() => {
    const dailyMap = new Map((data?.activity?.daily ?? []).map((d) => [String(d.day).slice(0, 10), Number.parseInt(d.count, 10)]));
    return Array.from({ length: days }, (_, i) => {
      const day = subDays(new Date(), days - i - 1);
      const key = format(day, 'yyyy-MM-dd');
      return {
        day: days <= 14 ? format(day, 'MMM d') : i % 7 === 0 ? format(day, 'MMM d') : format(day, 'd'),
        count: dailyMap.get(key) ?? 0,
      };
    });
  }, [data?.activity?.daily, days]);

  function handleSetDays(nextDays) {
    setDays(nextDays);
    setPage(1);
  }

  return (
    <div className="max-w-5xl mx-auto py-4 sm:py-6 px-3 sm:px-4 space-y-4">
      <div className="flex items-center gap-2">
        <button
          onClick={onBack}
          className="inline-flex items-center gap-1 text-xs px-2.5 py-1.5 rounded-lg border border-gray-200 text-gray-500 hover:text-gray-700 hover:bg-gray-50"
        >
          <ArrowLeft size={13} />
          Back
        </button>
      </div>

      {isLoading && (
        <div className="bg-white rounded-xl shadow-sm p-5 text-sm text-gray-400">Loading accessory details…</div>
      )}
      {isError && (
        <div className="bg-white rounded-xl shadow-sm p-5 text-sm text-red-500">Failed to load accessory details.</div>
      )}

      {!isLoading && !isError && accessory && (
        <>
          <section className="bg-white rounded-xl shadow-sm p-4 sm:p-5">
            <div className="flex items-start gap-3">
              <div className="w-10 h-10 rounded-full bg-blue-50 flex items-center justify-center">
                <Icon size={20} className="text-blue-600" />
              </div>
              <div className="min-w-0">
                <h2 className="text-lg font-semibold text-gray-900 truncate">{accessory.accessory_name}</h2>
                <p className="text-xs text-gray-500 mt-0.5 break-all">{accessory.accessory_id}</p>
                <p className="text-xs text-gray-400 mt-1">
                  {accessory.room_name ?? 'No room'} · {accessory.model ?? 'Unknown model'}
                  {accessory.last_seen && ` · last seen ${formatDistanceToNow(new Date(accessory.last_seen), { addSuffix: true })}`}
                </p>
              </div>
            </div>
          </section>

          <section className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div className="bg-white rounded-xl shadow-sm p-4">
              <div className="flex items-center gap-2 text-gray-400 text-xs">
                <Activity size={13} />
                Event history
              </div>
              <div className="text-xl font-semibold text-gray-900 mt-1">{(history?.total ?? 0).toLocaleString()}</div>
              <div className="text-xs text-gray-400 mt-0.5">
                {accessory.first_seen ? `since ${format(new Date(accessory.first_seen), 'PP')}` : 'No events yet'}
              </div>
            </div>
            <div className="bg-white rounded-xl shadow-sm p-4">
              <div className="flex items-center gap-2 text-gray-400 text-xs">
                <ShieldCheck size={13} />
                Uptime
              </div>
              <div className="text-xl font-semibold text-gray-900 mt-1">{formatRatio(uptime?.active_day_ratio)}</div>
              <div className="text-xs text-gray-400 mt-0.5">
                {uptime?.active_days ?? 0}/{uptime?.observed_days ?? 0} active days
              </div>
            </div>
            <div className="bg-white rounded-xl shadow-sm p-4">
              <div className="flex items-center gap-2 text-gray-400 text-xs">
                <Clock3 size={13} />
                Heartbeat
              </div>
              <div className="text-xl font-semibold text-gray-900 mt-1">
                ~{formatSeconds(accessory.health?.heartbeatSeconds)}
              </div>
              <div className="text-xs text-gray-400 mt-0.5">
                {accessory.health?.status ?? 'unknown'} · {formatNumber(uptime?.events_per_active_day)} events/day
              </div>
            </div>
          </section>

          <section className="bg-white rounded-xl shadow-sm p-4 sm:p-5">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-sm font-semibold text-gray-700">Activity Over Time</h3>
              <div className="flex gap-1">
                {WINDOWS.map((window) => (
                  <button
                    key={window.days}
                    onClick={() => handleSetDays(window.days)}
                    className={clsx(
                      'text-xs px-2 py-0.5 rounded-md transition-colors',
                      days === window.days
                        ? 'bg-blue-100 text-blue-700 font-medium'
                        : 'text-gray-400 hover:text-gray-600 hover:bg-gray-100'
                    )}
                  >
                    {window.label}
                  </button>
                ))}
              </div>
            </div>
            <ResponsiveContainer width="100%" height={170}>
              <AreaChart data={chartData} margin={{ top: 4, right: 4, left: -24, bottom: 0 }}>
                <defs>
                  <linearGradient id="accessoryActivityGradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.2} />
                    <stop offset="95%" stopColor="#3b82f6" stopOpacity={0.01} />
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
                  formatter={(value) => [value, 'events']}
                  labelStyle={{ fontWeight: 600, marginBottom: 2 }}
                />
                <Area
                  type="monotone"
                  dataKey="count"
                  stroke="#3b82f6"
                  strokeWidth={2}
                  fill="url(#accessoryActivityGradient)"
                  dot={false}
                />
              </AreaChart>
            </ResponsiveContainer>
          </section>

          <section className="bg-white rounded-xl shadow-sm p-4 sm:p-5">
            <h3 className="text-sm font-semibold text-gray-700 mb-3">Current State</h3>
            {!currentState.length && <p className="text-sm text-gray-400">No current state yet.</p>}
            {currentState.length > 0 && (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
                {currentState.map((state) => (
                  <div key={state.characteristic} className="rounded-lg border border-gray-100 bg-gray-50 px-3 py-2">
                    <p className="text-[11px] text-gray-400">{state.characteristic}</p>
                    <p className="text-sm text-gray-700 mt-0.5">{describeChange(state.characteristic, state.new_value)}</p>
                    <p className="text-[11px] text-gray-400 mt-1">
                      {formatDistanceToNow(new Date(state.timestamp), { addSuffix: true })}
                    </p>
                  </div>
                ))}
              </div>
            )}
          </section>

          <section className="bg-white rounded-xl shadow-sm p-4 sm:p-5">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-sm font-semibold text-gray-700">Full History</h3>
              <p className="text-xs text-gray-400">
                Page {history?.page ?? 1} of {Math.max(history?.pages ?? 1, 1)}
              </p>
            </div>
            {!history?.events?.length && <p className="text-sm text-gray-400">No events recorded.</p>}
            {!!history?.events?.length && (
              <div className="divide-y divide-gray-100 border border-gray-100 rounded-lg overflow-hidden">
                {history.events.map((event) => (
                  <div key={event.id} className="px-3 py-2.5">
                    <div className="flex items-center justify-between gap-2">
                      <p className="text-sm text-gray-700">{describeChange(event.characteristic, event.new_value)}</p>
                      <p className="text-xs text-gray-400 whitespace-nowrap" title={format(new Date(event.timestamp), 'PPpp')}>
                        {formatDistanceToNow(new Date(event.timestamp), { addSuffix: true })}
                      </p>
                    </div>
                    <p className="text-xs text-gray-400 mt-1">
                      {event.characteristic}
                      {event.old_value != null && (
                        <span>
                          {' '}· {event.old_value} → {event.new_value}
                        </span>
                      )}
                    </p>
                  </div>
                ))}
              </div>
            )}
            <div className="flex items-center justify-end gap-2 mt-3">
              <button
                onClick={() => setPage((current) => Math.max(1, current - 1))}
                disabled={(history?.page ?? 1) <= 1}
                className="text-xs px-2.5 py-1 rounded-md border border-gray-200 text-gray-500 disabled:opacity-40"
              >
                Previous
              </button>
              <button
                onClick={() => setPage((current) => current + 1)}
                disabled={(history?.page ?? 1) >= (history?.pages ?? 1)}
                className="text-xs px-2.5 py-1 rounded-md border border-gray-200 text-gray-500 disabled:opacity-40"
              >
                Next
              </button>
            </div>
          </section>
        </>
      )}
    </div>
  );
}
