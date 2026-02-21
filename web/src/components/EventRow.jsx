import { formatDistanceToNow, format } from 'date-fns';
import { getServiceIcon, describeChange } from '../lib/icons.js';

export default function EventRow({ event }) {
  const Icon = getServiceIcon(event.service_type);
  const ts = new Date(event.timestamp);
  const description = describeChange(event.characteristic, event.new_value);

  return (
    <div className="flex items-start gap-3 py-3 px-4 hover:bg-gray-50 rounded-lg transition-colors">
      <div className="flex-shrink-0 w-9 h-9 rounded-full bg-blue-50 flex items-center justify-center mt-0.5">
        <Icon size={18} className="text-blue-600" />
      </div>

      <div className="flex-1 min-w-0">
        <div className="flex items-baseline justify-between gap-2">
          <span className="font-medium text-gray-900 truncate">{event.accessory_name}</span>
          <span
            className="flex-shrink-0 text-xs text-gray-400"
            title={format(ts, 'PPpp')}
          >
            {formatDistanceToNow(ts, { addSuffix: true })}
          </span>
        </div>

        <div className="text-sm text-gray-600 mt-0.5">
          {description}
          {event.room_name && (
            <span className="ml-2 text-xs text-gray-400">· {event.room_name}</span>
          )}
        </div>
      </div>
    </div>
  );
}
