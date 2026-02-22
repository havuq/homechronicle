import { useState, useMemo, useRef, useEffect } from 'react';
import { format, startOfDay } from 'date-fns';
import { ChevronLeft, ChevronRight, VolumeX, X, Loader2 } from 'lucide-react';

const API_BASE = import.meta.env.DEV ? 'http://localhost:3001/api' : '/api';
import { useEvents, useDevicePatterns } from '../hooks/useEvents.js';
import { useMutedDevices } from '../hooks/useMutedDevices.js';
import { formatGap } from '../lib/icons.js';
import SceneGroup from './SceneGroup.jsx';
import FilterBar from './FilterBar.jsx';
import TimelineHeatmap from './TimelineHeatmap.jsx';

// ── Pure helpers (defined outside component for stable references in useMemo) ──

const SCENE_WINDOW_MS = 5_000;

function groupIntoScenes(events) {
  if (!events.length) return [];
  const groups = [];
  let current = [events[0]];
  for (let i = 1; i < events.length; i++) {
    const diff = new Date(events[i - 1].timestamp) - new Date(events[i].timestamp);
    if (diff <= SCENE_WINDOW_MS) {
      current.push(events[i]);
    } else {
      groups.push(current);
      current = [events[i]];
    }
  }
  groups.push(current);
  return groups;
}

/** Groups an event array (any order) into a Map keyed by ISO start-of-day string. */
function groupByDay(events) {
  const groups = new Map();
  for (const event of events) {
    const day = startOfDay(new Date(event.timestamp)).toISOString();
    if (!groups.has(day)) groups.set(day, []);
    groups.get(day).push(event);
  }
  return groups;
}

function buildAnomalyMap(patternData) {
  const map = {};
  if (!patternData?.length) return map;
  for (const row of patternData) {
    if (!map[row.accessory_name]) map[row.accessory_name] = { hours: {} };
    map[row.accessory_name].hours[row.hour] = row.total_count / 30;
  }
  for (const device of Object.values(map)) {
    for (let h = 0; h < 24; h++) device.hours[h] ??= 0;
    device.peakAvg = Math.max(...Object.values(device.hours));
  }
  return map;
}

function hourLabel(h) {
  if (h === 0)  return 'midnight';
  if (h === 12) return 'noon';
  return h < 12 ? `${h}am` : `${h - 12}pm`;
}

// ── Component ──────────────────────────────────────────────────────────────

export default function Timeline() {
  const [filters, setFilters]         = useState({});
  const [page, setPage]               = useState(1);
  const [heatmapOpen, setHeatmapOpen] = useState(false);
  const [hoveredCell, setHoveredCell] = useState(null); // transient: cleared on mouse-leave
  const [lockedCell,  setLockedCell]  = useState(null); // persistent: set by click, cleared by re-click
  const [isJumping,   setIsJumping]   = useState(false);
  const scrollRef                     = useRef(null);
  const pendingJumpId                 = useRef(null);   // event id to scroll to after page loads

  // The cell used for dim/highlight logic — prefer locked over hovered
  const activeCell = lockedCell ?? hoveredCell;

  const { data, isLoading, isError } = useEvents(filters, page);
  const { data: patternData }        = useDevicePatterns();
  const { muted, mute, unmute }      = useMutedDevices();

  const anomalyMap = useMemo(() => buildAnomalyMap(patternData), [patternData]);

  // Filter out muted devices before any further processing
  const visibleEvents = useMemo(
    () => (data?.events ?? []).filter((e) => !muted.has(e.accessory_name)),
    [data?.events, muted]
  );

  /**
   * eventMetaMap — per-event metadata keyed by event id.
   * Computed once per visibleEvents + anomalyMap change.
   *
   * Each value: { gap, marker, rank, dayTotal, anomalyLabel }
   *   gap          — human string ("4h 12m") or undefined
   *   marker       — 'first' | 'last' | 'only' | undefined
   *   rank         — 1-based count of this event for this device today
   *   dayTotal     — total events for this device today
   *   anomalyLabel — string describing why it's unusual, or undefined
   */
  const eventMetaMap = useMemo(() => {
    if (!visibleEvents.length) return {};
    const map = {};

    for (const [, dayEvents] of groupByDay(visibleEvents)) {
      // Bucket by device
      const byDevice = new Map();
      for (const e of dayEvents) {
        if (!byDevice.has(e.accessory_name)) byDevice.set(e.accessory_name, []);
        byDevice.get(e.accessory_name).push(e);
      }

      for (const [, devEvents] of byDevice) {
        const dayTotal = devEvents.length;

        // Sort oldest → newest so rank/gap/marker are computed chronologically
        const sorted = [...devEvents].sort(
          (a, b) => new Date(a.timestamp) - new Date(b.timestamp)
        );

        sorted.forEach((e, i) => {
          const meta = { dayTotal, rank: i + 1 };

          // ── First / last / only marker ──────────────────────────────────
          if (dayTotal === 1) {
            meta.marker = 'only';
          } else if (i === 0) {
            meta.marker = 'first';
          } else if (i === dayTotal - 1) {
            meta.marker = 'last';
          }

          // ── Gap since previous event of this device today ────────────────
          if (i > 0) {
            const gapMs = new Date(e.timestamp) - new Date(sorted[i - 1].timestamp);
            meta.gap = formatGap(gapMs);   // undefined when < 2 min
          }

          // ── Unusual time detection ───────────────────────────────────────
          const dp = anomalyMap[e.accessory_name];
          if (dp && dp.peakAvg >= 2) {
            const hour = new Date(e.timestamp).getHours();
            if ((dp.hours[hour] ?? 0) < 0.1) {
              meta.anomalyLabel = `unusual at ${hourLabel(hour)}`;
            }
          }

          map[e.id] = meta;
        });
      }
    }

    return map;
  }, [visibleEvents, anomalyMap]);

  // ── Scroll-after-page-change ───────────────────────────────────────────────
  // When handleClickCell navigates to a different page, it stores the target
  // event id in pendingJumpId. This effect fires whenever the loaded data
  // changes and scrolls as soon as the element appears in the DOM.
  useEffect(() => {
    if (!pendingJumpId.current || !scrollRef.current || isLoading) return;
    const el = scrollRef.current.querySelector(`[data-scene-id="${pendingJumpId.current}"]`);
    if (el) {
      pendingJumpId.current = null;
      el.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  }, [data, isLoading]);

  // ── Handlers ──────────────────────────────────────────────────────────────

  function handleFilterChange(newFilters) {
    setFilters(newFilters);
    setPage(1);
  }

  /** Hover: highlight visible events only. No scroll — avoids mouse-leave side effects. */
  function handleHoverCell(name, hour) {
    setHoveredCell({ accessoryName: name, hour });
  }

  /**
   * Click: lock the highlight, collapse the heatmap, ask the server which
   * page the most recent match lives on, navigate there, then scroll to it.
   * The useEffect above handles the scroll once the page data loads.
   * Clicking the same cell a second time unlocks it.
   */
  async function handleClickCell(name, hour) {
    const isAlreadyLocked = lockedCell?.accessoryName === name && lockedCell?.hour === hour;

    if (isAlreadyLocked) {
      setLockedCell(null);
      return;
    }

    setLockedCell({ accessoryName: name, hour });
    setHeatmapOpen(false);
    setIsJumping(true);

    try {
      const qs = new URLSearchParams({ accessory: name, hour, limit: 50 });
      if (filters.room) qs.set('room', filters.room);
      if (filters.from) qs.set('from', filters.from);
      if (filters.to)   qs.set('to',   filters.to);

      const res   = await fetch(`${API_BASE}/events/jump?${qs}`);
      const { page: targetPage, eventId } = await res.json();

      if (!eventId) return; // no match in DB

      pendingJumpId.current = eventId;

      if (targetPage && targetPage !== page) {
        // Navigate to the right page — useEffect scrolls after data loads
        setPage(targetPage);
      } else {
        // Already on the correct page — scroll immediately after heatmap collapses
        setTimeout(() => {
          const el = scrollRef.current?.querySelector(`[data-scene-id="${eventId}"]`);
          if (el) {
            pendingJumpId.current = null;
            el.scrollIntoView({ behavior: 'smooth', block: 'start' });
          }
        }, 120);
      }
    } catch (err) {
      console.error('[timeline] jump failed:', err);
    } finally {
      setIsJumping(false);
    }
  }

  // ── Render ─────────────────────────────────────────────────────────────────

  return (
    <div className="flex flex-col h-full">
      <FilterBar filters={filters} onChange={handleFilterChange} />

      <TimelineHeatmap
        open={heatmapOpen}
        onToggle={() => { setHeatmapOpen((o) => !o); setLockedCell(null); }}
        onHoverCell={handleHoverCell}
        onHoverEnd={() => setHoveredCell(null)}
        onClickCell={handleClickCell}
        lockedCell={lockedCell}
      />

      {/* Locked-cell banner — shows when a heatmap cell has been clicked */}
      {lockedCell && (
        <div className="max-w-2xl mx-auto w-full px-4 py-1.5 flex items-center gap-2">
          {isJumping
            ? <Loader2 size={11} className="text-orange-400 animate-spin flex-shrink-0" />
            : <span className="w-2 h-2 rounded-full bg-orange-400 flex-shrink-0" />
          }
          <span className="text-xs text-orange-500 font-medium truncate">
            {isJumping
              ? `Finding ${lockedCell.accessoryName} at ${lockedCell.hour}:00…`
              : `${lockedCell.accessoryName} · ${lockedCell.hour}:00`
            }
          </span>
          {!isJumping && (
            <button
              onClick={() => setLockedCell(null)}
              className="text-[10px] text-gray-400 hover:text-gray-600 underline ml-auto flex-shrink-0"
            >
              clear
            </button>
          )}
        </div>
      )}

      {/* Muted devices banner */}
      {muted.size > 0 && (
        <div className="max-w-2xl mx-auto w-full px-4 py-2 flex items-center gap-2 flex-wrap">
          <VolumeX size={12} className="text-gray-400 flex-shrink-0" />
          <span className="text-xs text-gray-400">Muted:</span>
          {[...muted].map((name) => (
            <span
              key={name}
              className="inline-flex items-center gap-1 text-xs bg-gray-100 text-gray-500 px-2 py-0.5 rounded-full"
            >
              {name}
              <button
                onClick={() => unmute(name)}
                className="hover:text-gray-800 ml-0.5"
                title={`Unmute ${name}`}
              >
                <X size={10} />
              </button>
            </span>
          ))}
        </div>
      )}

      <div ref={scrollRef} className="flex-1 overflow-y-auto">
        {isLoading && (
          <div className="flex justify-center py-12 text-gray-400">Loading…</div>
        )}

        {isError && (
          <div className="flex justify-center py-12 text-red-500">
            Failed to load events. Is the listener container running?
          </div>
        )}

        {data && data.events.length === 0 && (
          <div className="flex flex-col items-center justify-center py-16 text-gray-400">
            <p className="text-lg font-medium">No events yet</p>
            <p className="text-sm mt-1">
              Events will appear here as your HomeKit accessories change state.
            </p>
          </div>
        )}

        {visibleEvents.length > 0 && (
          <div className="max-w-2xl mx-auto py-4">
            {[...groupByDay(visibleEvents)].map(([day, events]) => (
              <div key={day} className="mb-6">
                <h2 className="text-xs font-semibold uppercase tracking-wider text-gray-400 px-4 mb-2">
                  {format(new Date(day), 'EEEE, MMMM d')}
                </h2>
                <div className="bg-white rounded-xl shadow-sm divide-y divide-gray-100">
                  {groupIntoScenes(events).map((group) => (
                    <SceneGroup
                      key={group[0].id}
                      events={group}
                      eventMetaMap={eventMetaMap}
                      hoveredCell={activeCell}
                      onMute={mute}
                    />
                  ))}
                </div>
              </div>
            ))}

            {data.pages > 1 && (
              <div className="flex items-center justify-between px-4 py-3 text-sm text-gray-600">
                <button
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  disabled={page === 1}
                  className="flex items-center gap-1 disabled:opacity-40"
                >
                  <ChevronLeft size={16} /> Previous
                </button>
                <span>Page {page} of {data.pages}</span>
                <button
                  onClick={() => setPage((p) => Math.min(data.pages, p + 1))}
                  disabled={page === data.pages}
                  className="flex items-center gap-1 disabled:opacity-40"
                >
                  Next <ChevronRight size={16} />
                </button>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
