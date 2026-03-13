import { useMemo, useState } from 'react';
import { format, formatDistanceToNow, subDays } from 'date-fns';
import {
  ResponsiveContainer, AreaChart, Area, CartesianGrid, XAxis, YAxis, Tooltip,
  LineChart, Line,
} from 'recharts';
import {
  ArrowLeft, Activity, Clock3, ShieldCheck, AlertTriangle,
  Info, Wifi, WifiOff, ChevronDown, ChevronUp,
} from 'lucide-react';
import clsx from 'clsx';
import { useAccessoryDetail, useAccessoryAnomalies, useCharacteristicTrend } from '../hooks/useEvents.js';
import { describeChange, getServiceIcon } from '../lib/icons.js';

const WINDOWS = [
  { label: '7d', days: 7 },
  { label: '30d', days: 30 },
  { label: '90d', days: 90 },
];
const TOOLTIP_STYLE = { fontSize: 12, borderRadius: 8, border: '1px solid #e5e7eb' };

function formatSeconds(seconds) {
  if (!Number.isFinite(seconds) || seconds < 0) return 'n/a';
  const d = Math.floor(seconds / 86_400);
  const h = Math.floor((seconds % 86_400) / 3_600);
  const m = Math.floor((seconds % 3_600) / 60);
  if (d > 0) return `${d}d ${h}h`;
  if (h > 0) return `${h}h ${m}m`;
  return `${m}m`;
}

function formatRatio(value) {
  if (!Number.isFinite(value)) return 'n/a';
  return `${Math.round(value * 100)}%`;
}

function formatNumber(value, digits = 1) {
  if (!Number.isFinite(value)) return 'n/a';
  return Number(value).toLocaleString(undefined, { maximumFractionDigits: digits });
}

// ---------------------------------------------------------------------------
// Characteristic Trend sub-component
// ---------------------------------------------------------------------------
function CharacteristicTrend({ accessoryId, characteristic, days }) {
  const { data, isLoading } = useCharacteristicTrend(accessoryId, characteristic, days);

  const chartData = useMemo(() => {
    const points = data?.points ?? [];
    if (!points.length) return { values: [], isNumeric: false };

    const numericCount = points.filter((p) => {
      const n = Number(p.new_value);
      return Number.isFinite(n);
    }).length;
    const isNumeric = numericCount / points.length > 0.8;

    const values = points.map((p) => ({
      time: format(new Date(p.timestamp), 'MMM d HH:mm'),
      ts: new Date(p.timestamp).getTime(),
      value: isNumeric ? Number(p.new_value) : (p.new_value === 'true' || p.new_value === '1' ? 1 : 0),
      raw: p.new_value,
    }));

    return { values, isNumeric };
  }, [data?.points]);

  if (isLoading) {
    return <div className="text-xs text-gray-400 py-3">Loading trend…</div>;
  }
  if (!chartData.values.length) {
    return <div className="text-xs text-gray-400 py-3">No trend data available.</div>;
  }

  return (
    <div className="mt-3">
      <ResponsiveContainer width="100%" height={130}>
        <LineChart data={chartData.values} margin={{ top: 4, right: 4, left: -24, bottom: 0 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#f3f4f6" vertical={false} />
          <XAxis
            dataKey="time"
            tick={{ fontSize: 9, fill: '#9ca3af' }}
            interval="preserveStartEnd"
            tickLine={false}
            axisLine={false}
          />
          <YAxis
            tick={{ fontSize: 9, fill: '#9ca3af' }}
            tickLine={false}
            axisLine={false}
            domain={chartData.isNumeric ? ['auto', 'auto'] : [0, 1]}
          />
          <Tooltip
            contentStyle={TOOLTIP_STYLE}
            formatter={(value, _name, props) => [props.payload.raw, characteristic]}
            labelStyle={{ fontWeight: 600, marginBottom: 2 }}
          />
          <Line
            type={chartData.isNumeric ? 'monotone' : 'stepAfter'}
            dataKey="value"
            stroke="#8b5cf6"
            strokeWidth={1.5}
            dot={false}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Main component
// ---------------------------------------------------------------------------
export default function AccessoryDetail({ accessoryId, onBack }) {
  const [days, setDays] = useState(30);
  const [page, setPage] = useState(1);
  const [selectedChar, setSelectedChar] = useState(null);
  const { data, isLoading, isError } = useAccessoryDetail(accessoryId, { days, page, limit: 100 });
  const { data: anomalyData } = useAccessoryAnomalies(accessoryId);

  const accessory = data?.accessory ?? null;
  const history = data?.history ?? null;
  const uptime = data?.uptime ?? null;
  const currentState = data?.current_state ?? [];
  const Icon = getServiceIcon(accessory?.service_type);
  const health = accessory?.health ?? {};
  const reliability = accessory?.reliability ?? null;
  const outliers = anomalyData?.outliers ?? [];

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

  // Metadata fields to display
  const metadataFields = accessory ? [
    { label: 'Manufacturer', value: accessory.manufacturer },
    { label: 'Model', value: accessory.model },
    { label: 'Serial Number', value: accessory.serial_number },
    { label: 'Firmware', value: accessory.firmware_revision },
    { label: 'Hardware Rev', value: accessory.hardware_revision },
    { label: 'Protocol', value: accessory.protocol },
    { label: 'Transport', value: accessory.transport },
  ].filter((f) => f.value != null && f.value !== '') : [];

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
          {/* Header */}
          <section className="bg-white rounded-xl shadow-sm p-4 sm:p-5">
            <div className="flex items-start gap-3">
              <div className="w-10 h-10 rounded-full bg-blue-50 flex items-center justify-center">
                <Icon size={20} className="text-blue-600" />
              </div>
              <div className="min-w-0">
                <h2 className="text-lg font-semibold text-gray-900 truncate">{accessory.accessory_name}</h2>
                <p className="text-xs text-gray-500 mt-0.5 break-all">{accessory.accessory_id}</p>
                {accessory.device_note && (
                  <p className="text-xs text-gray-500 mt-1 italic">{accessory.device_note}</p>
                )}
                <p className="text-xs text-gray-400 mt-1">
                  {accessory.room_name ?? 'No room'} · {accessory.model ?? 'Unknown model'}
                  {accessory.last_seen && ` · last seen ${formatDistanceToNow(new Date(accessory.last_seen), { addSuffix: true })}`}
                </p>
              </div>
            </div>
          </section>

          {/* Feature 3: Stale reason banner */}
          {health.isStale && health.staleReason && (
            <section className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 flex items-start gap-2.5">
              <AlertTriangle size={16} className="text-amber-600 shrink-0 mt-0.5" />
              <div>
                <p className="text-sm font-medium text-amber-800">Device is stale</p>
                <p className="text-xs text-amber-600 mt-0.5">{health.staleReason}</p>
              </div>
            </section>
          )}

          {/* Stats grid */}
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
                ~{formatSeconds(health.heartbeatSeconds)}
              </div>
              <div className="text-xs text-gray-400 mt-0.5">
                {health.status ?? 'unknown'} · {formatNumber(uptime?.events_per_active_day)} events/day
              </div>
            </div>
          </section>

          {/* Feature 2: Device Metadata */}
          {metadataFields.length > 0 && (
            <section className="bg-white rounded-xl shadow-sm p-4 sm:p-5">
              <h3 className="text-sm font-semibold text-gray-700 mb-3 flex items-center gap-2">
                <Info size={14} className="text-gray-400" />
                Device Info
              </h3>
              <dl className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-x-4 gap-y-2">
                {metadataFields.map((field) => (
                  <div key={field.label}>
                    <dt className="text-[11px] text-gray-400">{field.label}</dt>
                    <dd className="text-sm text-gray-700 mt-0.5 break-all">{field.value}</dd>
                  </div>
                ))}
              </dl>
              {accessory.metadata_updated_at && (
                <p className="text-[10px] text-gray-300 mt-3">
                  Metadata updated {formatDistanceToNow(new Date(accessory.metadata_updated_at), { addSuffix: true })}
                </p>
              )}
            </section>
          )}

          {/* Feature 1: Reliability */}
          {reliability && (
            <section className={clsx(
              'bg-white rounded-xl shadow-sm p-4 sm:p-5',
              (reliability.disconnects > 0 || reliability.resubscribe_failures > 0) && 'border border-amber-100'
            )}>
              <h3 className="text-sm font-semibold text-gray-700 mb-3 flex items-center gap-2">
                {reliability.disconnects > 0 || reliability.resubscribe_failures > 0
                  ? <WifiOff size={14} className="text-amber-500" />
                  : <Wifi size={14} className="text-green-500" />
                }
                Connection Reliability
              </h3>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                <div>
                  <p className="text-[11px] text-gray-400">Disconnects</p>
                  <p className={clsx('text-lg font-semibold mt-0.5', reliability.disconnects > 0 ? 'text-amber-600' : 'text-gray-900')}>
                    {reliability.disconnects ?? 0}
                  </p>
                </div>
                <div>
                  <p className="text-[11px] text-gray-400">Reconnect Attempts</p>
                  <p className="text-lg font-semibold text-gray-900 mt-0.5">{reliability.reconnect_attempts ?? 0}</p>
                </div>
                <div>
                  <p className="text-[11px] text-gray-400">Resubscribe Failures</p>
                  <p className={clsx('text-lg font-semibold mt-0.5', reliability.resubscribe_failures > 0 ? 'text-red-600' : 'text-gray-900')}>
                    {reliability.resubscribe_failures ?? 0}
                  </p>
                </div>
                {reliability.last_connected_at && (
                  <div>
                    <p className="text-[11px] text-gray-400">Last Connected</p>
                    <p className="text-sm text-gray-700 mt-0.5">
                      {formatDistanceToNow(new Date(reliability.last_connected_at), { addSuffix: true })}
                    </p>
                  </div>
                )}
                {reliability.last_subscribed_at && (
                  <div>
                    <p className="text-[11px] text-gray-400">Last Subscribed</p>
                    <p className="text-sm text-gray-700 mt-0.5">
                      {formatDistanceToNow(new Date(reliability.last_subscribed_at), { addSuffix: true })}
                    </p>
                  </div>
                )}
                {Number.isFinite(reliability.subscribe_failures) && reliability.subscribe_failures > 0 && (
                  <div>
                    <p className="text-[11px] text-gray-400">Subscribe Failures</p>
                    <p className="text-lg font-semibold text-red-600 mt-0.5">{reliability.subscribe_failures}</p>
                  </div>
                )}
              </div>
              {reliability.last_error && (
                <div className="mt-3 rounded-lg bg-red-50 border border-red-100 px-3 py-2">
                  <p className="text-[11px] text-red-400">Last Error</p>
                  <p className="text-xs text-red-700 mt-0.5 break-all">{reliability.last_error}</p>
                  {reliability.last_error_at && (
                    <p className="text-[10px] text-red-400 mt-1">
                      {formatDistanceToNow(new Date(reliability.last_error_at), { addSuffix: true })}
                    </p>
                  )}
                </div>
              )}
            </section>
          )}

          {/* Feature 4: Anomaly Indicators */}
          {outliers.length > 0 && (
            <section className="bg-white rounded-xl shadow-sm p-4 sm:p-5">
              <h3 className="text-sm font-semibold text-gray-700 mb-3 flex items-center gap-2">
                <AlertTriangle size={14} className="text-amber-500" />
                Anomalies (last 24h)
              </h3>
              <div className="space-y-2">
                {outliers.slice(0, 5).map((o) => (
                  <div
                    key={`${o.hour}:${o.kind}`}
                    className={clsx(
                      'rounded-lg border px-3 py-2',
                      o.severity === 'critical' ? 'border-red-200 bg-red-50/70' :
                      o.severity === 'high' ? 'border-amber-200 bg-amber-50/70' :
                      'border-yellow-100 bg-yellow-50/50'
                    )}
                  >
                    <div className="flex items-center gap-2 text-xs">
                      <span className={clsx(
                        'uppercase tracking-wide font-semibold',
                        o.severity === 'critical' ? 'text-red-700' : 'text-amber-700'
                      )}>
                        {o.severity}
                      </span>
                      <span className={o.severity === 'critical' ? 'text-red-500' : 'text-amber-500'}>
                        {o.kind}
                      </span>
                      <span className="ml-auto text-gray-400">score {o.score}</span>
                    </div>
                    <p className={clsx(
                      'text-sm mt-1',
                      o.severity === 'critical' ? 'text-red-900' : 'text-amber-900'
                    )}>
                      {o.message}
                    </p>
                    <p className="text-xs text-gray-500 mt-0.5">
                      observed {o.eventCount} events, baseline {o.baselineAvg} avg
                    </p>
                  </div>
                ))}
              </div>
            </section>
          )}

          {/* Activity Over Time chart */}
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

          {/* Current State with Features 6 (protocol details) and 5 (characteristic trends) */}
          <section className="bg-white rounded-xl shadow-sm p-4 sm:p-5">
            <h3 className="text-sm font-semibold text-gray-700 mb-3">Current State</h3>
            {!currentState.length && <p className="text-sm text-gray-400">No current state yet.</p>}
            {currentState.length > 0 && (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
                {currentState.map((state) => {
                  const isSelected = selectedChar === state.characteristic;
                  const hasMatterIds = state.endpoint_id != null || state.cluster_id != null || state.attribute_id != null;
                  const hasHomeKitId = state.raw_iid != null;
                  const isMatter = String(state.protocol ?? '').toLowerCase() === 'matter';

                  return (
                    <div key={state.characteristic} className="flex flex-col">
                      <button
                        type="button"
                        onClick={() => setSelectedChar(isSelected ? null : state.characteristic)}
                        className={clsx(
                          'rounded-lg border px-3 py-2 text-left transition-colors',
                          isSelected
                            ? 'border-violet-200 bg-violet-50'
                            : 'border-gray-100 bg-gray-50 hover:border-gray-200'
                        )}
                      >
                        <div className="flex items-center justify-between">
                          <p className="text-[11px] text-gray-400">{state.characteristic}</p>
                          {isSelected ? <ChevronUp size={11} className="text-violet-400" /> : <ChevronDown size={11} className="text-gray-300" />}
                        </div>
                        <p className="text-sm text-gray-700 mt-0.5">{describeChange(state.characteristic, state.new_value)}</p>
                        <p className="text-[11px] text-gray-400 mt-1">
                          {formatDistanceToNow(new Date(state.timestamp), { addSuffix: true })}
                        </p>
                        {/* Feature 9: Protocol details */}
                        {isMatter && hasMatterIds && (
                          <p className="text-[10px] text-gray-300 font-mono mt-0.5">
                            EP {state.endpoint_id} · Cluster {state.cluster_id} · Attr {state.attribute_id}
                          </p>
                        )}
                        {!isMatter && hasHomeKitId && (
                          <p className="text-[10px] text-gray-300 font-mono mt-0.5">
                            IID {state.raw_iid}
                          </p>
                        )}
                      </button>
                      {/* Feature 6: Characteristic trend chart */}
                      {isSelected && (
                        <div className="border border-t-0 border-gray-100 rounded-b-lg px-3 py-2 bg-white -mt-px">
                          <CharacteristicTrend
                            accessoryId={accessoryId}
                            characteristic={state.characteristic}
                            days={days}
                          />
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </section>

          {/* Full History */}
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
