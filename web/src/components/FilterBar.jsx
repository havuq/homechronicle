import { useAccessories } from '../hooks/useEvents.js';
import { getRoomColor } from '../lib/roomColors.js';

export default function FilterBar({ filters, onChange }) {
  const { data: accessories = [] } = useAccessories();

  const rooms = [...new Set(accessories.map((a) => a.room_name).filter(Boolean))].sort();

  function update(key, value) {
    onChange({ ...filters, [key]: value });
  }

  const activeRoomColor = filters.room ? getRoomColor(filters.room) : null;

  return (
    <div className="flex flex-wrap gap-3 p-4 bg-white border-b border-gray-200">
      {/* Search by name */}
      <input
        type="search"
        placeholder="Search accessory…"
        value={filters.accessory ?? ''}
        onChange={(e) => update('accessory', e.target.value)}
        className="border border-gray-300 rounded-lg px-3 py-1.5 text-sm w-48 focus:outline-none focus:ring-2 focus:ring-blue-500"
      />

      {/* Room filter with color swatch when active */}
      <div className="relative flex items-center">
        {activeRoomColor && (
          <span
            className="absolute left-2.5 w-2 h-2 rounded-full pointer-events-none"
            style={{ backgroundColor: activeRoomColor.dot }}
          />
        )}
        <select
          value={filters.room ?? ''}
          onChange={(e) => update('room', e.target.value)}
          className={`border border-gray-300 rounded-lg py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 ${activeRoomColor ? 'pl-7 pr-3' : 'px-3'}`}
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
        className="border border-gray-300 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
      />

      {/* Date to */}
      <input
        type="datetime-local"
        value={filters.to ?? ''}
        onChange={(e) => update('to', e.target.value)}
        className="border border-gray-300 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
      />

      {/* Clear */}
      {Object.values(filters).some(Boolean) && (
        <button
          onClick={() => onChange({})}
          className="text-sm text-blue-600 hover:underline"
        >
          Clear filters
        </button>
      )}
    </div>
  );
}
