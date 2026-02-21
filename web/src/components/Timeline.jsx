import { useState } from 'react';
import { format, startOfDay } from 'date-fns';
import { useEvents } from '../hooks/useEvents.js';
import EventRow from './EventRow.jsx';
import FilterBar from './FilterBar.jsx';
import { ChevronLeft, ChevronRight } from 'lucide-react';

export default function Timeline() {
  const [filters, setFilters] = useState({});
  const [page, setPage] = useState(1);

  const { data, isLoading, isError } = useEvents(filters, page);

  // Reset to page 1 when filters change
  function handleFilterChange(newFilters) {
    setFilters(newFilters);
    setPage(1);
  }

  // Group events by calendar day
  function groupByDay(events) {
    const groups = new Map();
    for (const event of events) {
      const day = startOfDay(new Date(event.timestamp)).toISOString();
      if (!groups.has(day)) groups.set(day, []);
      groups.get(day).push(event);
    }
    return groups;
  }

  return (
    <div className="flex flex-col h-full">
      <FilterBar filters={filters} onChange={handleFilterChange} />

      <div className="flex-1 overflow-y-auto">
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
            <p className="text-sm mt-1">Events will appear here as your HomeKit accessories change state.</p>
          </div>
        )}

        {data && data.events.length > 0 && (
          <div className="max-w-2xl mx-auto py-4">
            {[...groupByDay(data.events)].map(([day, events]) => (
              <div key={day} className="mb-6">
                <h2 className="text-xs font-semibold uppercase tracking-wider text-gray-400 px-4 mb-2">
                  {format(new Date(day), 'EEEE, MMMM d')}
                </h2>
                <div className="bg-white rounded-xl shadow-sm divide-y divide-gray-100">
                  {events.map((event) => (
                    <EventRow key={event.id} event={event} />
                  ))}
                </div>
              </div>
            ))}

            {/* Pagination */}
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
