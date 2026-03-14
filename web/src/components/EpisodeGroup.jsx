import { useState } from 'react';
import { ChevronDown, ChevronRight, Home, Moon, LogIn, LogOut } from 'lucide-react';
import SceneGroup from './SceneGroup.jsx';

function getEpisodeIcon(kind) {
  switch (kind) {
    case 'arrival':
      return LogIn;
    case 'departure':
      return LogOut;
    case 'bedtime':
      return Moon;
    default:
      return Home;
  }
}

export default function EpisodeGroup({ episode, scenes, eventMetaMap, hoveredCell, onMute }) {
  const [expanded, setExpanded] = useState(false);
  const events = scenes.flat();
  const Icon = getEpisodeIcon(episode.kind);
  const ts = new Date(events[0].timestamp);
  const rooms = [...new Set(events.map((event) => event.room_name).filter(Boolean))];

  return (
    <div data-scene-id={events[0].id} className="border-b border-gray-100 last:border-b-0">
      <button
        onClick={() => setExpanded((value) => !value)}
        className="hc-episode w-full text-left px-4 py-3.5 bg-amber-50/70 hover:bg-amber-50 transition-colors"
      >
        <div className="flex items-start gap-3">
          <div className="flex-shrink-0 w-10 h-10 rounded-full bg-amber-100 hc-episode-icon flex items-center justify-center mt-0.5">
            <Icon size={17} className="text-amber-700" />
          </div>

          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-sm font-semibold text-gray-900">{episode.title}</span>
              <span className="text-[11px] uppercase tracking-[0.18em] text-amber-700 hc-episode-label font-semibold">
                Episode
              </span>
            </div>
            <p className="text-sm text-gray-600 mt-0.5">{episode.summary}</p>
            <div className="text-xs text-gray-500 mt-1.5">
              {events.length} events across {scenes.length} burst{scenes.length === 1 ? '' : 's'}
              {rooms.length > 0 ? ` · ${rooms.join(', ')}` : ''}
            </div>
          </div>

          <div className="flex items-center gap-2 flex-shrink-0 ml-2">
            <span className="text-xs text-gray-400">
              {ts.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
            </span>
            {expanded
              ? <ChevronDown size={14} className="text-gray-400" />
              : <ChevronRight size={14} className="text-gray-400" />}
          </div>
        </div>
      </button>

      {expanded && (
        <div className="border-t border-amber-100 hc-episode-expanded bg-amber-50/20">
          {scenes.map((scene) => (
            <SceneGroup
              key={scene[0].id}
              events={scene}
              eventMetaMap={eventMetaMap}
              hoveredCell={hoveredCell}
              onMute={onMute}
            />
          ))}
        </div>
      )}
    </div>
  );
}
