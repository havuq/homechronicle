import { useAccessories } from '../hooks/useEvents.js';
import { getRoomColor } from '../lib/roomColors.js';
import { Search, SlidersHorizontal, ChevronDown, ChevronUp } from 'lucide-react';

export default function FilterBar({ filters, onChange, open, onToggle }) {
  const { data: accessories = [] } = useAccessories();

  const rooms = [...new Set(accessories.map((a) => a.room_name).filter(Boolean))].sort();

  function update(key, value) {
    onChange({ ...filters, [key]: value });
  }

  const activeRoomColor = filters.room ? getRoomColor(filters.room) : null;
  const activeCount = Object.values(filters).filter(Boolean).length;

  return (
    <div className="bg-white border-b border-gray-200">
      <button
        onClick={onToggle}
        aria-expanded={open}
        className="w-full py-2.5 text-left hover:bg-blue-50/60 transition-colors"
      >
        <div className="max-w-2xl mx-auto px-4 flex items-center gap-2">
          <Search size={13} className="text-blue-600" />
          <span className="text-xs font-semibold text-blue-800">Search & filters</span>
          {activeCount > 0 && (
            <span className="text-[10px] font-medium text-blue-700 bg-blue-100 px-1.5 py-0.5 rounded-full">
              {activeCount} active
            </span>
          )}
          {open ? (
            <ChevronUp size={13} className="text-blue-700 ml-auto" />
          ) : (
            <ChevronDown size={13} className="text-blue-700 ml-auto" />
          )}
        </div>
      </button>

      {open && (
        <div className="max-w-2xl mx-auto px-4 pb-3">
          <div className="flex flex-wrap gap-2 sm:gap-3">
            {/* Search by name */}
            <div className="relative w-full sm:w-56">
              <Search size={13} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
              <input
                type="search"
                placeholder="Search accessory…"
                value={filters.accessory ?? ''}
                onChange={(e) => update('accessory', e.target.value)}
                className="border border-gray-300 rounded-lg pl-8 pr-3 py-2 sm:py-1.5 text-sm w-full focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            {/* Room filter with color swatch when active */}
            <div className="relative flex items-center w-full sm:w-auto">
              {activeRoomColor && (
                <span
                  className="absolute left-2.5 w-2 h-2 rounded-full pointer-events-none"
                  style={{ backgroundColor: activeRoomColor.dot }}
                />
              )}
              <select
                value={filters.room ?? ''}
                onChange={(e) => update('room', e.target.value)}
                className={`border border-gray-300 rounded-lg py-2 sm:py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 w-full sm:w-auto ${activeRoomColor ? 'pl-7 pr-3' : 'px-3'}`}
              >
                <option value="">All rooms</option>
                {rooms.map((r) => (
                  <option key={r} value={r}>{r}</option>
                ))}
              </select>
            </div>

            {/* Date from */}
            <input
              type="datetime-local"
              value={filters.from ?? ''}
              onChange={(e) => update('from', e.target.value)}
              className="border border-gray-300 rounded-lg px-3 py-2 sm:py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 w-full sm:w-auto"
            />

            {/* Date to */}
            <input
              type="datetime-local"
              value={filters.to ?? ''}
              onChange={(e) => update('to', e.target.value)}
              className="border border-gray-300 rounded-lg px-3 py-2 sm:py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 w-full sm:w-auto"
            />

            {/* Clear */}
            {activeCount > 0 && (
              <button
                onClick={() => onChange({})}
                className="inline-flex items-center gap-1 text-sm text-blue-700 bg-blue-50 border border-blue-200 px-2.5 rounded-lg hover:bg-blue-100 sm:ml-auto"
              >
                <SlidersHorizontal size={12} />
                Clear filters
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
