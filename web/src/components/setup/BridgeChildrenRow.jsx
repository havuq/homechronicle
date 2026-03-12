import { useQuery } from '@tanstack/react-query';
import { MapPin, Loader } from 'lucide-react';
import clsx from 'clsx';
import { fetchJson } from '../../lib/api.js';

export default function BridgeChildrenRow({ bridgeId, isExpanded, roomInputs, savedRooms = {}, bridgeRoom = '', onRoomChange, onRoomBlur, onApplyBridgeRoom }) {
  const { data: children = [], isLoading, isError } = useQuery({
    queryKey: ['bridge-children', bridgeId],
    queryFn: () => fetchJson(`/api/setup/bridge-children/${encodeURIComponent(bridgeId)}`),
    enabled: isExpanded,
    staleTime: 5 * 60 * 1000,
  });

  if (!isExpanded) return null;

  if (isLoading) {
    return (
      <div className="ml-9 mt-2 pb-2 flex items-center gap-1.5 text-xs text-gray-400">
        <Loader size={11} className="animate-spin" /> Querying bridge…
      </div>
    );
  }
  if (isError) {
    return (
      <div className="ml-9 mt-2 pb-2 text-xs text-red-400">
        Could not load child devices — is the bridge reachable?
      </div>
    );
  }
  if (children.length === 0) {
    return (
      <div className="ml-9 mt-2 pb-2 text-xs text-gray-400 italic">
        No child devices found on this bridge.
      </div>
    );
  }

  const childIdsWithoutRoom = children
    .filter((c) => !(savedRooms[c.childId]?.trim()) && !(roomInputs[c.childId]?.trim()))
    .map((c) => c.childId);
  const canApplyAll = bridgeRoom && childIdsWithoutRoom.length > 0;

  return (
    <div className="ml-9 mt-2 pb-2 border-l-2 border-gray-100 pl-3 space-y-1.5">
      {canApplyAll && (
        <div className="flex items-center gap-1.5 pb-1">
          <span className="text-xs text-gray-400 italic">
            {childIdsWithoutRoom.length === children.length
              ? 'No children have a room yet.'
              : `${childIdsWithoutRoom.length} child${childIdsWithoutRoom.length !== 1 ? 'ren' : ''} without a room.`}
          </span>
          <button
            onClick={() => onApplyBridgeRoom(bridgeId, childIdsWithoutRoom)}
            className="text-xs text-blue-600 hover:text-blue-800 underline underline-offset-2 transition-colors"
          >
            Apply "{bridgeRoom}" to all
          </button>
        </div>
      )}

      {children.map((child) => {
        const childRoom = roomInputs[child.childId] ?? savedRooms[child.childId] ?? '';
        const isInheriting = !childRoom && !!bridgeRoom;
        return (
          <div key={child.childId} className="flex items-center gap-2">
            <div className="w-1.5 h-1.5 rounded-full bg-green-400 flex-shrink-0" />
            <span className="text-xs text-gray-700 flex-1 truncate min-w-0">{child.name}</span>
            <div className="flex items-center gap-1 flex-shrink-0">
              <MapPin size={9} className={isInheriting ? 'text-blue-300' : 'text-gray-300'} />
              <input
                type="text"
                placeholder={bridgeRoom ? `Inherits: ${bridgeRoom}` : 'Room…'}
                value={childRoom}
                onChange={(e) => onRoomChange(child.childId, e.target.value)}
                onBlur={() => onRoomBlur(child.childId)}
                onKeyDown={(e) => e.key === 'Enter' && onRoomBlur(child.childId)}
                className={clsx(
                  'text-xs border rounded px-2 py-0.5 w-32 focus:outline-none focus:ring-1 focus:ring-blue-400 placeholder-gray-300',
                  isInheriting ? 'border-blue-200 bg-blue-50/40 placeholder-blue-300' : 'border-gray-200',
                )}
              />
            </div>
          </div>
        );
      })}

      {bridgeRoom && (
        <p className="text-[10px] text-gray-400 pt-0.5">
          Children with no room set inherit the bridge room automatically.
        </p>
      )}
    </div>
  );
}
