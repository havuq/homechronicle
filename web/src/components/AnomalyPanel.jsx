import { AlertTriangle } from 'lucide-react';
import { useAnomalies } from '../hooks/useEvents.js';

function labelFor(scopeType) {
  return scopeType === 'room' ? 'Room' : 'Device';
}

export default function AnomalyPanel() {
  const { data, isLoading } = useAnomalies();

  if (isLoading) {
    return <div className="text-sm text-gray-400">Analyzing baselines…</div>;
  }

  const rows = [
    ...(data?.devices ?? []).map((row) => ({ ...row, scopeType: 'device' })),
    ...(data?.rooms ?? []).map((row) => ({ ...row, scopeType: 'room' })),
  ].slice(0, 8);

  if (!rows.length) {
    return <p className="text-sm text-gray-400">No active outliers versus baseline in the last 24 hours.</p>;
  }

  return (
    <div>
      <div className="flex items-baseline justify-between mb-3">
        <h3 className="text-sm font-semibold text-gray-700">Anomaly Detection</h3>
        <span className="text-xs text-gray-400">devices + rooms</span>
      </div>
      <div className="space-y-2">
        {rows.map((row) => (
          <div key={`${row.scopeType}:${row.scopeName}:${row.hour}:${row.kind}`} className="rounded-lg border border-amber-100 bg-amber-50/70 px-3 py-2">
            <div className="flex items-center gap-2 text-xs text-amber-700">
              <AlertTriangle size={12} />
              <span className="uppercase tracking-wide font-semibold">{labelFor(row.scopeType)}</span>
              <span className="text-amber-500">{row.kind}</span>
              <span className="ml-auto">score {row.score}</span>
            </div>
            <div className="text-sm text-amber-900 mt-1">
              {row.scopeName}
            </div>
            <div className="text-xs text-amber-700 mt-0.5">
              {row.message} · observed {row.eventCount}, baseline {row.baselineAvg}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
