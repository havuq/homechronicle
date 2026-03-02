import { useState } from 'react';
import { CheckCircle, Trash2, ChevronDown, MapPin } from 'lucide-react';
import clsx from 'clsx';
import { CATEGORY_LABELS } from './constants.js';
import BridgeChildrenRow from './BridgeChildrenRow.jsx';

export default function MyDevicesTab({ setup }) {
  const {
    paired,
    matterPairings,
    savedRooms,
    roomInputs,
    setRoomInputs,
    handleRoomBlur,
    handleApplyBridgeRoom,
    deletePairingMutation,
    deleteMatterPairingMutation,
    matterRuntime,
  } = setup;

  const [confirmDelete, setConfirmDelete] = useState(null);
  const [confirmDeleteMatter, setConfirmDeleteMatter] = useState(null);
  const [expandedBridges, setExpandedBridges] = useState(new Set());

  const totalCount = paired.length + matterPairings.length;
  const matterNodes = Array.isArray(matterRuntime?.nodes) ? matterRuntime.nodes : [];

  if (totalCount === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-gray-400 text-center">
        <CheckCircle size={32} className="mb-3 opacity-40" />
        <p className="font-medium">No devices yet</p>
        <p className="text-sm mt-1 max-w-xs">
          Go to the Add Devices tab to scan for HomeKit accessories or add a Matter device.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <p className="text-xs font-semibold uppercase tracking-wider text-gray-400">
        {totalCount} device{totalCount !== 1 ? 's' : ''}
      </p>

      <div className="bg-white rounded-xl shadow-sm divide-y divide-gray-100">

        {/* HomeKit paired devices */}
        {paired.map((acc) => {
          const isConfirming = confirmDelete === acc.id;
          const isDeleting = deletePairingMutation.isPending && confirmDelete === acc.id;
          const roomVal = roomInputs[acc.id] ?? savedRooms[acc.id] ?? '';
          return (
            <div key={acc.id} className="px-4 py-3">
              <div className="flex items-center gap-3">
                <CheckCircle size={18} className="text-green-500 flex-shrink-0" />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="font-medium text-gray-900 truncate">{acc.name}</span>
                    <span className="text-[10px] font-medium px-1.5 py-0.5 rounded-full bg-blue-50 text-blue-600 border border-blue-100 flex-shrink-0">
                      HomeKit
                    </span>
                  </div>
                  <div className="text-xs text-gray-400">
                    {CATEGORY_LABELS[acc.category] ?? 'Unknown'} &middot; {acc.address}
                  </div>
                  <div className="flex items-center gap-1 mt-1.5">
                    <MapPin size={10} className="text-gray-300 flex-shrink-0" />
                    <input
                      type="text"
                      placeholder="Add room name\u2026"
                      value={roomVal}
                      onChange={(e) => setRoomInputs((r) => ({ ...r, [acc.id]: e.target.value }))}
                      onBlur={() => handleRoomBlur(acc.id)}
                      onKeyDown={(e) => e.key === 'Enter' && handleRoomBlur(acc.id)}
                      className="text-xs border border-gray-200 rounded px-2 py-0.5 w-36 focus:outline-none focus:ring-1 focus:ring-blue-400 placeholder-gray-300"
                    />
                  </div>
                  {acc.category === 2 && roomVal && (
                    <p className="text-[10px] text-gray-400 mt-0.5 ml-3.5">
                      Children without their own room inherit this.
                    </p>
                  )}
                  {acc.category === 2 && (
                    <button
                      onClick={() => setExpandedBridges((s) => {
                        const next = new Set(s);
                        next.has(acc.id) ? next.delete(acc.id) : next.add(acc.id);
                        return next;
                      })}
                      className="mt-1.5 flex items-center gap-1 text-xs text-blue-600 hover:text-blue-800 transition-colors"
                    >
                      <ChevronDown
                        size={11}
                        className={clsx('transition-transform duration-200', expandedBridges.has(acc.id) && 'rotate-180')}
                      />
                      {expandedBridges.has(acc.id) ? 'Hide' : 'Show'} child devices
                    </button>
                  )}
                </div>

                {isConfirming ? (
                  <div className="flex items-center gap-2 flex-shrink-0">
                    <span className="text-xs text-gray-500">Remove pairing?</span>
                    <button
                      onClick={() => deletePairingMutation.mutate(acc.id, {
                        onSuccess: () => setConfirmDelete(null),
                        onError: () => setConfirmDelete(null),
                      })}
                      disabled={isDeleting}
                      className="text-xs px-2 py-1 bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:opacity-50 transition-colors"
                    >
                      {isDeleting ? 'Removing\u2026' : 'Yes, remove'}
                    </button>
                    <button
                      onClick={() => setConfirmDelete(null)}
                      disabled={isDeleting}
                      className="text-xs px-2 py-1 bg-gray-100 text-gray-600 rounded-lg hover:bg-gray-200 disabled:opacity-50 transition-colors"
                    >
                      Cancel
                    </button>
                  </div>
                ) : (
                  <div className="flex items-center gap-2 flex-shrink-0">
                    <span className="text-xs bg-green-50 text-green-700 px-2 py-0.5 rounded-full">Logging</span>
                    <button
                      onClick={() => setConfirmDelete(acc.id)}
                      title="Remove pairing"
                      className="p-1.5 rounded-lg text-gray-300 hover:text-red-500 hover:bg-red-50 transition-colors"
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                )}
              </div>
              {acc.category === 2 && (
                <BridgeChildrenRow
                  bridgeId={acc.id}
                  isExpanded={expandedBridges.has(acc.id)}
                  roomInputs={roomInputs}
                  savedRooms={savedRooms}
                  bridgeRoom={roomInputs[acc.id]?.trim() ?? savedRooms[acc.id]?.trim() ?? ''}
                  onRoomChange={(id, val) => setRoomInputs((r) => ({ ...r, [id]: val }))}
                  onRoomBlur={handleRoomBlur}
                  onApplyBridgeRoom={handleApplyBridgeRoom}
                />
              )}
            </div>
          );
        })}

        {/* Matter paired devices */}
        {matterPairings.map((pairing) => {
          const nodeId = pairing.nodeId ?? pairing.id;
          const isConfirming = confirmDeleteMatter === nodeId;
          const isDeleting = deleteMatterPairingMutation.isPending && isConfirming;
          const nodeStatus = matterNodes.find((n) => n.nodeId === nodeId);
          return (
            <div key={`matter-${nodeId}`} className="px-4 py-3">
              <div className="flex items-center gap-3">
                <CheckCircle size={18} className="text-green-500 flex-shrink-0" />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="font-medium text-gray-900 truncate">{pairing.name ?? nodeId}</span>
                    <span className="text-[10px] font-medium px-1.5 py-0.5 rounded-full bg-amber-50 text-amber-700 border border-amber-100 flex-shrink-0">
                      Matter
                    </span>
                  </div>
                  <div className="text-xs text-gray-400">
                    {nodeId}
                    {pairing.address ? ` \u00b7 ${pairing.address}` : ''}
                    {pairing.port ? `:${pairing.port}` : ''}
                  </div>
                  {nodeStatus && (
                    <div className="text-xs text-gray-400 mt-0.5">
                      {nodeStatus.active
                        ? <span className="text-green-600">Polling active</span>
                        : <span className="text-gray-400">Polling inactive</span>}
                      {nodeStatus.lastError && (
                        <span className="text-red-500 ml-2">Last error: {nodeStatus.lastError}</span>
                      )}
                    </div>
                  )}
                </div>

                {isConfirming ? (
                  <div className="flex items-center gap-2 flex-shrink-0">
                    <button
                      onClick={() => deleteMatterPairingMutation.mutate(nodeId, {
                        onSuccess: () => setConfirmDeleteMatter(null),
                        onError: () => setConfirmDeleteMatter(null),
                      })}
                      disabled={isDeleting}
                      className="text-xs px-2 py-1 bg-red-600 text-white rounded hover:bg-red-700 disabled:opacity-50 transition-colors"
                    >
                      {isDeleting ? 'Removing\u2026' : 'Confirm'}
                    </button>
                    <button
                      onClick={() => setConfirmDeleteMatter(null)}
                      disabled={isDeleting}
                      className="text-xs px-2 py-1 bg-gray-100 text-gray-600 rounded hover:bg-gray-200 transition-colors"
                    >
                      Cancel
                    </button>
                  </div>
                ) : (
                  <div className="flex items-center gap-2 flex-shrink-0">
                    <span className="text-xs bg-green-50 text-green-700 px-2 py-0.5 rounded-full">Logging</span>
                    <button
                      onClick={() => setConfirmDeleteMatter(nodeId)}
                      title="Remove pairing"
                      className="p-1.5 rounded-lg text-gray-300 hover:text-red-500 hover:bg-red-50 transition-colors"
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
