import { useMemo, useState } from 'react';
import { useDailyStats } from '../hooks/useEvents.js';

const CELL = 11;
const GAP = 2;
const LABEL_W = 40;
const AXIS_DAYS = [1, 8, 15, 22, 29];

function cellColor(intensity) {
  if (intensity <= 0) return 'rgba(226, 232, 240, 0.4)';
  const r = Math.round(219 - intensity * 116); // down to ~103
  const g = Math.round(234 - intensity * 64);  // down to ~170
  const b = Math.round(254 - intensity * 40);  // down to ~214
  return `rgb(${r},${g},${b})`;
}

function monthLabel(date) {
  return date.toLocaleString(undefined, { month: 'short' });
}

function toYmd(date) {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

export default function MonthlyHeatmap() {
  const { data = [], isLoading } = useDailyStats(365);
  const [hovered, setHovered] = useState(null);

  const rows = useMemo(() => {
    const countByDay = new Map();
    for (const row of data) {
      const key = String(row.day ?? '').slice(0, 10);
      const count = Number.parseInt(String(row.count ?? '0'), 10);
      countByDay.set(key, Number.isFinite(count) ? count : 0);
    }

    const now = new Date();
    const months = [];
    for (let back = 11; back >= 0; back--) {
      months.push(new Date(now.getFullYear(), now.getMonth() - back, 1));
    }

    return months.map((monthStart) => {
      const year = monthStart.getFullYear();
      const month = monthStart.getMonth();
      const daysInMonth = new Date(year, month + 1, 0).getDate();
      const cells = Array.from({ length: 31 }, (_, i) => {
        const day = i + 1;
        if (day > daysInMonth) return null;
        const date = new Date(year, month, day);
        const key = toYmd(date);
        return {
          day,
          key,
          count: countByDay.get(key) ?? 0,
          label: date.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' }),
        };
      });
      return {
        id: `${year}-${month}`,
        label: monthLabel(monthStart),
        cells,
      };
    });
  }, [data]);

  if (isLoading) {
    return <div className="h-24 flex items-center justify-center text-gray-400 text-sm">Loading…</div>;
  }

  const maxCount = Math.max(1, ...rows.flatMap((r) => r.cells.map((c) => c?.count ?? 0)));
  const totalWidth = LABEL_W + 31 * (CELL + GAP);

  return (
    <div>
      <div className="flex items-baseline justify-between mb-2">
        <h3 className="text-sm font-semibold text-gray-700">Monthly Heatmap</h3>
        <span className="text-xs text-gray-400">last 12 months</span>
      </div>
      <p className="text-xs text-gray-500 mb-2 min-h-4">
        {hovered ? `${hovered.label} · ${hovered.count} event${hovered.count !== 1 ? 's' : ''}` : 'Hover a day for details'}
      </p>

      <div style={{ overflowX: 'auto', WebkitOverflowScrolling: 'touch' }}>
        <div style={{ minWidth: totalWidth }}>
          {rows.map((row) => (
            <div key={row.id} style={{ display: 'flex', alignItems: 'center', marginBottom: GAP }}>
              <div
                style={{
                  width: LABEL_W,
                  flexShrink: 0,
                  fontSize: 10,
                  color: '#6b7280',
                  textAlign: 'right',
                  paddingRight: 6,
                  lineHeight: `${CELL}px`,
                }}
              >
                {row.label}
              </div>
              {row.cells.map((cell, idx) => (
                <div
                  key={idx}
                  title={cell ? `${cell.label} — ${cell.count} event${cell.count !== 1 ? 's' : ''}` : ''}
                  style={{
                    width: CELL,
                    height: CELL,
                    marginRight: GAP,
                    flexShrink: 0,
                    borderRadius: 2,
                    backgroundColor: cell ? cellColor(cell.count / maxCount) : 'transparent',
                    border: cell ? 'none' : '1px solid transparent',
                    transition: 'transform 0.12s, background-color 0.15s',
                    cursor: cell ? 'default' : 'inherit',
                  }}
                  onMouseEnter={(e) => {
                    if (!cell) return;
                    e.currentTarget.style.transform = 'scale(1.1)';
                    setHovered(cell);
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.transform = '';
                    setHovered(null);
                  }}
                />
              ))}
            </div>
          ))}

          <div style={{ display: 'flex', marginLeft: LABEL_W, marginTop: 3 }}>
            {Array.from({ length: 31 }, (_, i) => i + 1).map((d) => (
              <div
                key={d}
                style={{
                  width: CELL + GAP,
                  flexShrink: 0,
                  fontSize: 9,
                  color: '#94a3b8',
                  textAlign: 'left',
                }}
              >
                {AXIS_DAYS.includes(d) ? d : ''}
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
