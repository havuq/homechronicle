import { useHeatmap } from '../hooks/useEvents.js';

const CELL  = 22; // px — width & height of each hour cell
const GAP   = 2;  // px — gap between cells
const LABEL = 148; // px — device name column width
const HOURS = Array.from({ length: 24 }, (_, i) => i);

function cellColor(intensity) {
  if (intensity === 0) return 'rgba(226, 232, 240, 0.5)'; // empty — light gray
  // Blue gradient: low → #bfdbfe, high → #1d4ed8
  const r = Math.round(191 - intensity * 162);
  const g = Math.round(219 - intensity * 90);
  const b = Math.round(254 - intensity * 82);
  return `rgb(${r},${g},${b})`;
}

export default function HeatmapLane() {
  const { data = [], isLoading } = useHeatmap();

  if (isLoading) {
    return <p className="text-sm text-gray-400 py-2">Loading…</p>;
  }
  if (!data.length) {
    return <p className="text-sm text-gray-400 py-2">No data yet — events from the last 7 days will appear here.</p>;
  }

  // Build per-device 24-hour arrays
  const deviceMap = {};
  for (const row of data) {
    if (!deviceMap[row.accessory_name]) {
      deviceMap[row.accessory_name] = new Array(24).fill(0);
    }
    deviceMap[row.accessory_name][row.hour] = row.count;
  }

  // Sort devices by total event count descending
  const devices = Object.entries(deviceMap).sort(
    ([, a], [, b]) => b.reduce((s, v) => s + v, 0) - a.reduce((s, v) => s + v, 0)
  );

  const maxCount = Math.max(...devices.flatMap(([, hours]) => hours), 1);

  const totalWidth  = LABEL + 24 * (CELL + GAP);
  const rowHeight   = CELL + GAP;

  return (
    <div>
      <h3 className="text-sm font-semibold text-gray-700 mb-1">Activity Heatmap</h3>
      <p className="text-xs text-gray-400 mb-4">Events per device per hour · last 7 days</p>

      <div style={{ overflowX: 'auto', WebkitOverflowScrolling: 'touch' }}>
        <div style={{ minWidth: totalWidth }}>

          {/* Hour labels */}
          <div style={{ display: 'flex', marginLeft: LABEL, marginBottom: 6 }}>
            {HOURS.map((h) => (
              <div
                key={h}
                style={{
                  width:     CELL,
                  marginRight: GAP,
                  flexShrink: 0,
                  textAlign: 'center',
                  fontSize:  10,
                  color:     '#94a3b8',
                  lineHeight: 1,
                }}
              >
                {h % 6 === 0 ? `${h}h` : ''}
              </div>
            ))}
          </div>

          {/* Device rows */}
          {devices.map(([name, hours]) => (
            <div key={name} style={{ display: 'flex', alignItems: 'center', marginBottom: GAP }}>
              {/* Device name */}
              <div
                style={{
                  width:        LABEL,
                  flexShrink:   0,
                  paddingRight: 10,
                  textAlign:    'right',
                  fontSize:     11,
                  color:        '#4b5563',
                  overflow:     'hidden',
                  textOverflow: 'ellipsis',
                  whiteSpace:   'nowrap',
                  lineHeight:   `${CELL}px`,
                }}
                title={name}
              >
                {name}
              </div>

              {/* Hour cells */}
              {hours.map((count, h) => {
                const intensity = count / maxCount;
                return (
                  <div
                    key={h}
                    title={`${name} — ${h}:00 — ${count} event${count !== 1 ? 's' : ''}`}
                    style={{
                      width:        CELL,
                      height:       CELL,
                      marginRight:  GAP,
                      flexShrink:   0,
                      borderRadius: 3,
                      backgroundColor: cellColor(intensity),
                      cursor:       count > 0 ? 'default' : undefined,
                      transition:   'background-color 0.15s',
                    }}
                  />
                );
              })}
            </div>
          ))}

          {/* AM / PM axis label */}
          <div style={{ display: 'flex', marginLeft: LABEL, marginTop: 4 }}>
            {['12am', '6am', '12pm', '6pm', ''].map((label, i) => (
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
