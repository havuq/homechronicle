import { useHeatmap } from '../hooks/useEvents.js';
import { BarChart2, ChevronDown, ChevronUp } from 'lucide-react';

const CELL  = 16; // px
const GAP   = 2;  // px
const LABEL = 128;
const HOURS = Array.from({ length: 24 }, (_, i) => i);

function cellBg(intensity) {
  if (intensity === 0) return 'rgba(226,232,240,0.5)';
  const r = Math.round(191 - intensity * 162);
  const g = Math.round(219 - intensity * 90);
  const b = Math.round(254 - intensity * 82);
  return `rgb(${r},${g},${b})`;
}

/**
 * Compact heatmap panel for the Timeline page.
 * Sits between the filter bar and the event list.
 * Calls onHoverCell(accessoryName, hour) / onHoverEnd() so the parent
 * can highlight matching timeline rows.
 */
export default function TimelineHeatmap({ open, onToggle, onHoverCell, onHoverEnd }) {
  const { data = [], isLoading } = useHeatmap();
  const hasData = !isLoading && data.length > 0;

  return (
    <div className="bg-white border-b border-gray-200">
      {/* Collapse / expand toggle — full-width button, content centered to match timeline */}
      <button
        onClick={onToggle}
        disabled={!hasData && !isLoading}
        className="w-full py-2 text-left hover:bg-gray-50 transition-colors disabled:cursor-default"
      >
        <div className="max-w-2xl mx-auto px-4 flex items-center gap-2">
          <BarChart2 size={13} className={hasData ? 'text-blue-500' : 'text-gray-300'} />
          <span className={`text-xs font-medium ${hasData ? 'text-gray-600' : 'text-gray-300'}`}>
            Activity heatmap
          </span>
          {isLoading && <span className="text-[10px] text-gray-300 ml-auto">Loading…</span>}
          {!isLoading && !hasData && <span className="text-[10px] text-gray-300 ml-auto">No data yet</span>}
          {hasData && (
            open
              ? <ChevronUp size={12} className="text-gray-400 ml-auto" />
              : <ChevronDown size={12} className="text-gray-400 ml-auto" />
          )}
        </div>
      </button>

      {/* Grid — only mounted when open and has data */}
      {open && hasData && <HeatmapGrid data={data} onHoverCell={onHoverCell} onHoverEnd={onHoverEnd} />}
    </div>
  );
}

function HeatmapGrid({ data, onHoverCell, onHoverEnd }) {
  const deviceMap = {};
  for (const row of data) {
    if (!deviceMap[row.accessory_name]) deviceMap[row.accessory_name] = new Array(24).fill(0);
    deviceMap[row.accessory_name][row.hour] = row.count;
  }

  const devices = Object.entries(deviceMap).sort(
    ([, a], [, b]) => b.reduce((s, v) => s + v, 0) - a.reduce((s, v) => s + v, 0)
  );
  const maxCount = Math.max(...devices.flatMap(([, h]) => h), 1);

  return (
    <div className="max-w-2xl mx-auto px-4 pb-3">
      <p className="text-[10px] text-gray-400 mb-2">
        Hover a cell to highlight matching events below · last 7 days
      </p>
      <div style={{ overflowX: 'auto', WebkitOverflowScrolling: 'touch' }}>
        <div style={{ minWidth: LABEL + 24 * (CELL + GAP) }}>

          {/* Hour labels */}
          <div style={{ display: 'flex', marginLeft: LABEL, marginBottom: 3 }}>
            {HOURS.map((h) => (
              <div
                key={h}
                style={{ width: CELL, marginRight: GAP, flexShrink: 0, textAlign: 'center', fontSize: 9, color: '#94a3b8' }}
              >
                {h % 6 === 0 ? `${h}h` : ''}
              </div>
            ))}
          </div>

          {/* Device rows */}
          {devices.map(([name, hours]) => (
            <div key={name} style={{ display: 'flex', alignItems: 'center', marginBottom: 2 }}>
              <div
                style={{ width: LABEL, flexShrink: 0, paddingRight: 8, textAlign: 'right', fontSize: 10, color: '#6b7280', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', lineHeight: `${CELL}px` }}
                title={name}
              >
                {name}
              </div>
              {hours.map((count, h) => (
                <div
                  key={h}
                  title={count > 0 ? `${name} — ${h}:00 — ${count} event${count !== 1 ? 's' : ''}` : undefined}
                  style={{
                    width: CELL,
                    height: CELL,
                    marginRight: GAP,
                    flexShrink: 0,
                    borderRadius: 2,
                    backgroundColor: cellBg(count / maxCount),
                    cursor: count > 0 ? 'pointer' : 'default',
                    transition: 'transform 0.1s, box-shadow 0.1s',
                  }}
                  onMouseEnter={(e) => {
                    if (count > 0) {
                      e.currentTarget.style.transform = 'scale(1.35)';
                      e.currentTarget.style.boxShadow = '0 0 0 1.5px #3b82f6';
                      onHoverCell(name, h);
                    }
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.transform = '';
                    e.currentTarget.style.boxShadow = '';
                    onHoverEnd();
                  }}
                />
              ))}
            </div>
          ))}

          {/* Time-of-day axis */}
          <div style={{ display: 'flex', marginLeft: LABEL, marginTop: 3 }}>
            {['12am', '6am', '12pm', '6pm', ''].map((label, i) => (
              <div key={i} style={{ width: 6 * (CELL + GAP), flexShrink: 0, fontSize: 9, color: '#94a3b8' }}>
                {label}
              </div>
            ))}
          </div>

        </div>
      </div>
    </div>
  );
}
