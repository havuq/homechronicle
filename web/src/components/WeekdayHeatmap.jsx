import { useWeekdayStats } from '../hooks/useEvents.js';
import { useState } from 'react';

const CELL = 18; // px
const GAP  = 2;  // px
const LABEL_W = 30; // px for day name

// DOW from PostgreSQL: 0 = Sunday
const DAY_LABELS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

// Teal/emerald gradient so it's visually distinct from the blue ActivityChart heatmap
function cellColor(intensity) {
  if (intensity === 0) return 'rgba(226, 232, 240, 0.4)';
  // low → #a7f3d0 (emerald-200), high → #065f46 (emerald-900)
  const r = Math.round(167 - intensity * 143);
  const g = Math.round(243 - intensity * 114);
  const b = Math.round(208 - intensity * 138);
  return `rgb(${r},${g},${b})`;
}

// Map a UTC hour to the user's local hour
function utcToLocalH(utcH) {
  const offsetHours = -new Date().getTimezoneOffset() / 60;
  return ((utcH + offsetHours) % 24 + 24) % 24;
}

const AXIS_LABELS = ['midnight', '6 am', 'noon', '6 pm', ''];

export default function WeekdayHeatmap() {
  const { data = [], isLoading } = useWeekdayStats();
  const [hoveredCell, setHoveredCell] = useState(null);

  if (isLoading) {
    return <div className="h-32 flex items-center justify-center text-gray-400 text-sm">Loading…</div>;
  }
  if (!data.length) {
    return <p className="text-sm text-gray-400">No data yet.</p>;
  }

  // Build grid[dow 0-6][localHour 0-23]
  const grid = Array.from({ length: 7 }, () => new Array(24).fill(0));
  for (const row of data) {
    const dow    = parseInt(row.day_of_week, 10);
    const localH = Math.round(utcToLocalH(parseInt(row.hour, 10)));
    const lh     = ((localH % 24) + 24) % 24;
    grid[dow][lh] += parseInt(row.count, 10);
  }

  const maxCount = Math.max(...grid.flat(), 1);
  const totalWidth = LABEL_W + 24 * (CELL + GAP);

  return (
    <div>
      <div className="flex items-baseline justify-between mb-3">
        <h3 className="text-sm font-semibold text-gray-700">Weekday Heatmap</h3>
        <span className="text-xs text-gray-400">last 90 days · local time</span>
      </div>
      <p className="text-xs text-gray-500 mb-3 min-h-4">
        {hoveredCell
          ? `${hoveredCell.day} · ${hoveredCell.hourLabel} · ${hoveredCell.count} event${hoveredCell.count !== 1 ? 's' : ''}`
          : 'Hover a cell for details'}
      </p>

      <div style={{ overflowX: 'auto', WebkitOverflowScrolling: 'touch' }}>
        <div style={{ minWidth: totalWidth }}>

          {/* Day rows */}
          {DAY_LABELS.map((day, dow) => (
            <div key={day} style={{ display: 'flex', alignItems: 'center', marginBottom: GAP }}>
              {/* Day label */}
              <div
                style={{
                  width:      LABEL_W,
                  flexShrink: 0,
                  fontSize:   10,
                  color:      '#6b7280',
                  textAlign:  'right',
                  paddingRight: 6,
                  lineHeight: `${CELL}px`,
                }}
              >
                {day}
              </div>

              {/* Hour cells */}
              {grid[dow].map((count, h) => {
                const intensity = count / maxCount;
                const hLabel =
                  h === 0    ? 'midnight'
                  : h < 12   ? `${h}am`
                  : h === 12 ? 'noon'
                  : `${h - 12}pm`;
                return (
                  <div
                    key={h}
                    title={`${day} ${hLabel} — ${count} event${count !== 1 ? 's' : ''}`}
                    style={{
                      width:           CELL,
                      height:          CELL,
                      marginRight:     GAP,
                      flexShrink:      0,
                      borderRadius:    3,
                      backgroundColor: cellColor(intensity),
                      transition:      'background-color 0.15s, transform 0.12s',
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.transform = 'scale(1.08)';
                      setHoveredCell({ day, hourLabel: hLabel, count });
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.transform = '';
                      setHoveredCell(null);
                    }}
                  />
                );
              })}
            </div>
          ))}

          {/* Bottom axis */}
          <div style={{ display: 'flex', marginLeft: LABEL_W, marginTop: 4 }}>
            {AXIS_LABELS.map((label, i) => (
              <div
                key={i}
                style={{
                  width:      6 * (CELL + GAP),
                  flexShrink: 0,
                  fontSize:   10,
                  color:      '#94a3b8',
                }}
              >
                {label}
              </div>
            ))}
          </div>

        </div>
      </div>
    </div>
  );
}
