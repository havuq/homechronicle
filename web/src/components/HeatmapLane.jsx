import { useHeatmap } from '../hooks/useEvents.js';

const CELL  = 22; // px — width & height of each hour cell
const GAP   = 2;  // px — gap between cells
const LABEL = 148; // px — device name column width

function cellColor(intensity) {
  if (intensity === 0) return 'rgba(226, 232, 240, 0.5)'; // empty — light gray
  // Blue gradient: low → #bfdbfe, high → #1d4ed8
  const r = Math.round(191 - intensity * 162);
  const g = Math.round(219 - intensity * 90);
  const b = Math.round(254 - intensity * 82);
  return `rgb(${r},${g},${b})`;
}

// Rotate a 24-slot UTC hour array to local time
function rotateToLocal(utcArr) {
  const offsetHours = -new Date().getTimezoneOffset() / 60; // e.g. +10 for AEST, -5 for EST
  return Array.from({ length: 24 }, (_, localH) => {
    const utcH = ((localH - offsetHours) % 24 + 24) % 24;
    return utcArr[Math.round(utcH)];
  });
}

const AXIS_LABELS = ['midnight', '6 am', 'noon', '6 pm', ''];

export default function HeatmapLane() {
  const { data = [], isLoading } = useHeatmap();

  if (isLoading) {
    return <p className="text-sm text-gray-400 py-2">Loading…</p>;
  }
  if (!data.length) {
    return <p className="text-sm text-gray-400 py-2">No data yet — events from the last 7 days will appear here.</p>;
  }

  // Build per-device 24-hour arrays (UTC from DB)
  const deviceMap = {};
  for (const row of data) {
    if (!deviceMap[row.accessory_name]) {
      deviceMap[row.accessory_name] = new Array(24).fill(0);
    }
    deviceMap[row.accessory_name][parseInt(row.hour, 10)] = parseInt(row.count, 10);
  }

  // Sort by total event count descending, then rotate each to local time
  const devices = Object.entries(deviceMap)
    .sort(([, a], [, b]) => b.reduce((s, v) => s + v, 0) - a.reduce((s, v) => s + v, 0))
    .map(([name, utcHours]) => [name, rotateToLocal(utcHours)]);

  const maxCount = Math.max(...devices.flatMap(([, hours]) => hours), 1);

  const totalWidth = LABEL + 24 * (CELL + GAP);

  return (
    <div>
      <div className="flex items-baseline justify-between mb-1">
        <h3 className="text-sm font-semibold text-gray-700">Activity Heatmap</h3>
        <span className="text-xs text-gray-400">last 7 days · local time</span>
      </div>
      <p className="text-xs text-gray-400 mb-4">Events per device per hour</p>

      <div style={{ overflowX: 'auto', WebkitOverflowScrolling: 'touch' }}>
        <div style={{ minWidth: totalWidth }}>

          {/* Device rows — no top hour label row */}
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
                    title={`${name} — ${h === 0 ? 'midnight' : h < 12 ? `${h}am` : h === 12 ? 'noon' : `${h - 12}pm`} — ${count} event${count !== 1 ? 's' : ''}`}
                    style={{
                      width:        CELL,
                      height:       CELL,
                      marginRight:  GAP,
                      flexShrink:   0,
                      borderRadius: 3,
                      backgroundColor: cellColor(intensity),
                      transition:   'background-color 0.15s',
                    }}
                  />
                );
              })}
            </div>
          ))}

          {/* Bottom axis: midnight / 6 am / noon / 6 pm */}
          <div style={{ display: 'flex', marginLeft: LABEL, marginTop: 4 }}>
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
