import { useState } from 'react';
import { ChevronDown, ChevronRight, Zap, AlertTriangle } from 'lucide-react';
import EventRow from './EventRow.jsx';

/**
 * SceneGroup renders a single event or a collapsed/expandable cluster of
 * events that happened within a few seconds of each other ("scene").
 *
 * Props:
 *   events        — array of event objects (newest first)
 *   eventMetaMap  — { [id]: { gap, marker, rank, dayTotal, anomalyLabel } }
 *   hoveredCell   — { accessoryName, hour } | null from TimelineHeatmap hover
 *   onMute        — fn(accessoryName) — mute a device from the timeline
 */
export default function SceneGroup({ events, eventMetaMap = {}, hoveredCell, onMute }) {
  const [expanded, setExpanded] = useState(false);

  // ── Single event — render a plain EventRow ──────────────────────────────
  if (events.length === 1) {
    return (
      <div data-scene-id={events[0].id}>
        <EventRow
          event={events[0]}
          hoveredCell={hoveredCell}
          meta={eventMetaMap[events[0].id] ?? {}}
          onMute={onMute}
        />
      </div>
    );
  }

  // ── Multi-event scene ────────────────────────────────────────────────────
  const names      = [...new Set(events.map((e) => e.accessory_name))];
  const rooms      = [...new Set(events.map((e) => e.room_name).filter(Boolean))];
  const anyAnomaly = events.some((e) => eventMetaMap[e.id]?.anomalyLabel);
  const ts         = new Date(events[0].timestamp);

  // Heatmap highlight: does any event in this scene match the hovered cell?
  const anyMatch = hoveredCell && events.some(
    (e) => e.accessory_name === hoveredCell.accessoryName &&
           new Date(e.timestamp).getUTCHours() === hoveredCell.hour
  );
  const highlight = hoveredCell ? (anyMatch ? 'highlighted' : 'dimmed') : 'normal';

  return (
    <div
      data-scene-id={events[0].id}
      className={
        highlight === 'highlighted' ? 'transition-all'
        : highlight === 'dimmed'    ? 'opacity-40 transition-all'
        : ''
      }
      style={
        highlight === 'highlighted'
          ? { boxShadow: 'inset 3px 0 0 0 #60a5fa', backgroundColor: 'rgb(239 246 255 / 0.6)' }
          : undefined
      }
    >
      {/* Scene header row */}
      <button
        onClick={() => setExpanded((x) => !x)}
        className="flex items-center gap-3 py-2.5 px-4 w-full text-left hover:bg-blue-50/60 transition-colors"
      >
        <div
          className="flex-shrink-0 w-9 h-9 rounded-full bg-blue-100 flex items-center justify-center"
          title="Scene: multiple events happened together"
          aria-label="Scene: multiple events happened together"
        >
          <Zap size={16} className="text-blue-500" />
        </div>

        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <span className="font-medium text-gray-800 text-sm truncate">
              {names.length <= 2
                ? names.join(' & ')
                : `${names[0]} +${names.length - 1} others`}
            </span>
            {anyAnomaly && (
              <AlertTriangle
                size={12}
                className="text-amber-500 flex-shrink-0"
                title="Unusual time for one or more devices"
              />
            )}
          </div>
          <div className="text-xs text-gray-400 mt-0.5">
            {events.length} events at the same time
            {rooms.length > 0 && ` · ${rooms.join(', ')}`}
          </div>
        </div>

        <div className="flex items-center gap-2 flex-shrink-0">
          <span className="text-xs text-gray-400">
            {ts.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
          </span>
          {expanded
            ? <ChevronDown size={14} className="text-gray-400" />
            : <ChevronRight size={14} className="text-gray-400" />}
        </div>
      </button>

      {/* Expanded individual events — indented with blue accent border */}
      {expanded && (
        <div className="border-t border-gray-100">
          <div className="ml-4 border-l-2 border-blue-200 bg-blue-50/20">
            <div className="divide-y divide-gray-100/80">
              {events.map((event) => (
                <EventRow
                  key={event.id}
                  event={event}
                  hoveredCell={hoveredCell}
                  meta={eventMetaMap[event.id] ?? {}}
                  onMute={onMute}
                />
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
