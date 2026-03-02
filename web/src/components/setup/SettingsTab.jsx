import { useState, useEffect } from 'react';
import { AlertTriangle, ChevronDown, Loader } from 'lucide-react';
import clsx from 'clsx';

export default function SettingsTab({ setup }) {
  const {
    retentionConfig,
    saveRetentionMutation,
    matterRuntime,
    matterRuntimeError,
    matterRuntimeErrorValue,
    matterPairings,
    pollingConfigured,
    missingMatterConfig,
    dbAccessories,
    deleteAccessoryMutation,
  } = setup;

  const [retentionDaysInput, setRetentionDaysInput] = useState('');
  const [staleThresholdHoursInput, setStaleThresholdHoursInput] = useState('');
  const [dangerOpen, setDangerOpen] = useState(false);
  const [dangerPairFilter, setDangerPairFilter] = useState('all');
  const [confirmDeleteAccessory, setConfirmDeleteAccessory] = useState(null);
  const [wipeConfirmText, setWipeConfirmText] = useState('');
  const [wipePending, setWipePending] = useState(false);

  const retentionDaysCurrent = retentionConfig?.retentionDays ?? null;
  const staleThresholdHoursCurrent = retentionConfig?.staleThresholdHours ?? null;
  const dangerPairedCount = dbAccessories.filter((a) => Boolean(a.paired_at)).length;
  const dangerUnpairedCount = dbAccessories.length - dangerPairedCount;
  const visibleDangerAccessories = dbAccessories.filter((a) => {
    if (dangerPairFilter === 'paired') return Boolean(a.paired_at);
    if (dangerPairFilter === 'unpaired') return !a.paired_at;
    return true;
  });

  useEffect(() => {
    if (retentionDaysCurrent === null) return;
    setRetentionDaysInput((prev) => (prev.trim() ? prev : String(retentionDaysCurrent)));
  }, [retentionDaysCurrent]);

  useEffect(() => {
    if (staleThresholdHoursCurrent === null) return;
    setStaleThresholdHoursInput((prev) => (prev.trim() ? prev : String(staleThresholdHoursCurrent)));
  }, [staleThresholdHoursCurrent]);

  function handleSaveRetention() {
    const parsed = Number.parseInt(retentionDaysInput, 10);
    if (!Number.isFinite(parsed)) return;
    saveRetentionMutation.mutate({ retentionDays: parsed }, {
      onSuccess: (next) => setRetentionDaysInput(String(next.retentionDays)),
    });
  }

  function handleSaveStaleThreshold() {
    const parsed = Number.parseInt(staleThresholdHoursInput, 10);
    if (!Number.isFinite(parsed)) return;
    saveRetentionMutation.mutate({ staleThresholdHours: parsed }, {
      onSuccess: (next) => setStaleThresholdHoursInput(String(next.staleThresholdHours)),
    });
  }

  async function handleWipeAll() {
    if (wipeConfirmText !== 'DELETE') return;
    setWipePending(true);
    try {
      const { fetchJson } = await import('../../lib/api.js');
      await fetchJson('/api/data/all', { method: 'DELETE' });
      const { useQueryClient } = await import('@tanstack/react-query');
      // invalidation already happens via mutation callbacks; force refetch
      window.location.reload();
    } finally {
      setWipePending(false);
    }
  }

  return (
    <div className="space-y-4">

      {/* Retention cutoff */}
      <div className="bg-white border border-gray-200 rounded-lg px-4 py-3">
        <div className="flex items-center justify-between gap-3 flex-wrap">
          <div>
            <p className="text-sm font-medium text-gray-800">Retention cutoff</p>
            <p className="text-xs text-gray-500 mt-0.5">
              Keep timeline data in the main table for this many days.
            </p>
          </div>
          <div className="flex items-center gap-2">
            <input
              type="number"
              min="1"
              max="3650"
              step="1"
              value={retentionDaysInput}
              onChange={(e) => setRetentionDaysInput(e.target.value)}
              className="w-24 text-sm border border-gray-300 rounded-lg px-2.5 py-1.5 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            <span className="text-xs text-gray-500">days</span>
            <button
              onClick={handleSaveRetention}
              disabled={saveRetentionMutation.isPending || !retentionDaysInput.trim()}
              className="px-3 py-1.5 text-xs font-medium rounded-lg bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
            >
              {saveRetentionMutation.isPending ? 'Saving\u2026' : 'Save'}
            </button>
          </div>
        </div>
        <p className="text-[11px] text-gray-400 mt-2">
          Changes apply without restart. Sweep interval is every 24 hours by default.
        </p>
      </div>

      {/* Stale device threshold */}
      <div className="bg-white border border-gray-200 rounded-lg px-4 py-3">
        <div className="flex items-center justify-between gap-3 flex-wrap">
          <div>
            <p className="text-sm font-medium text-gray-800">Stale device threshold</p>
            <p className="text-xs text-gray-500 mt-0.5">
              A device is marked stale after this many hours with no events.
            </p>
          </div>
          <div className="flex items-center gap-2">
            <input
              type="number"
              min="1"
              max="720"
              step="1"
              value={staleThresholdHoursInput}
              onChange={(e) => setStaleThresholdHoursInput(e.target.value)}
              className="w-24 text-sm border border-gray-300 rounded-lg px-2.5 py-1.5 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            <span className="text-xs text-gray-500">hours</span>
            <button
              onClick={handleSaveStaleThreshold}
              disabled={saveRetentionMutation.isPending || !staleThresholdHoursInput.trim()}
              className="px-3 py-1.5 text-xs font-medium rounded-lg bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
            >
              {saveRetentionMutation.isPending ? 'Saving\u2026' : 'Save'}
            </button>
          </div>
        </div>
      </div>

      {saveRetentionMutation.isError && (
        <p className="text-xs text-red-600">
          Could not save settings: {saveRetentionMutation.error?.message}
        </p>
      )}

      {/* Matter runtime status */}
      <div className="bg-white border border-gray-200 rounded-lg px-4 py-3 space-y-3">
        <p className="text-sm font-medium text-gray-800">Matter Runtime</p>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 text-xs">
          <div className="bg-gray-50 border border-gray-100 rounded-lg px-3 py-2">
            <p className="text-gray-600 font-medium">Commission Command</p>
            <p className={clsx('mt-0.5', matterRuntime?.commissionConfigured ? 'text-green-600' : 'text-gray-400')}>
              {matterRuntime?.commissionConfigured ? 'Configured' : 'Not configured'}
            </p>
          </div>
          <div className="bg-gray-50 border border-gray-100 rounded-lg px-3 py-2">
            <p className="text-gray-600 font-medium">Polling Command</p>
            <p className={clsx('mt-0.5', pollingConfigured ? 'text-green-600' : 'text-gray-400')}>
              {pollingConfigured ? 'Configured' : 'Not configured'}
            </p>
          </div>
          <div className="bg-gray-50 border border-gray-100 rounded-lg px-3 py-2">
            <p className="text-gray-600 font-medium">Tracked Nodes</p>
            <p className="text-gray-700 mt-0.5">
              {Array.isArray(matterRuntime?.nodes) ? matterRuntime.nodes.length : 0}
            </p>
          </div>
        </div>
        {matterRuntimeError && (
          <p className="text-xs text-red-600">
            {matterRuntimeErrorValue?.message ?? 'Matter runtime unavailable.'}
          </p>
        )}
        {missingMatterConfig.length > 0 && (
          <p className="text-xs text-amber-700">
            Missing: {missingMatterConfig.join(', ')}. Set these in <code className="bg-gray-100 px-1 rounded">.env</code> and restart the listener.
          </p>
        )}
        {matterPairings.length > 0 && !pollingConfigured && (
          <p className="text-xs text-amber-700">
            Matter nodes are saved, but event logging is off until{' '}
            <code className="bg-gray-100 px-1 rounded">MATTER_POLL_CMD</code> is configured.
          </p>
        )}
      </div>

      {/* Danger Zone */}
      <section className="border border-red-200 rounded-xl overflow-hidden">
        <button
          onClick={() => setDangerOpen((o) => !o)}
          className="w-full flex items-center justify-between px-4 py-3 bg-red-50 text-sm font-medium text-red-700 hover:bg-red-100 transition-colors"
        >
          <span className="flex items-center gap-2">
            <AlertTriangle size={14} />
            Danger Zone — delete accessory data
          </span>
          <ChevronDown
            size={14}
            className={clsx('transition-transform duration-200', dangerOpen && 'rotate-180')}
          />
        </button>

        {dangerOpen && (
          <div className="bg-white">
            <p className="px-4 py-3 text-xs text-gray-500 border-b border-gray-100">
              Delete stored event history for individual accessories, or wipe everything.
              This only removes logged data — it does not unpair devices.
            </p>

            {dbAccessories.length > 0 && (
              <div className="px-4 py-2 border-b border-gray-100">
                <div className="inline-flex items-center gap-1 rounded-lg bg-gray-50 p-1">
                  {[
                    { key: 'all', label: `All (${dbAccessories.length})`, color: 'text-gray-700' },
                    { key: 'paired', label: `Paired (${dangerPairedCount})`, color: 'text-emerald-700' },
                    { key: 'unpaired', label: `No longer paired (${dangerUnpairedCount})`, color: 'text-red-700' },
                  ].map(({ key, label, color }) => (
                    <button
                      key={key}
                      onClick={() => { setDangerPairFilter(key); setConfirmDeleteAccessory(null); }}
                      className={clsx(
                        'px-2 py-1 text-xs rounded transition-colors',
                        dangerPairFilter === key
                          ? `bg-white ${color} shadow-sm`
                          : 'text-gray-500 hover:text-gray-700',
                      )}
                    >
                      {label}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {dbAccessories.length === 0 ? (
              <p className="px-4 py-4 text-xs text-gray-400 italic">No accessory data in the database.</p>
            ) : visibleDangerAccessories.length === 0 ? (
              <p className="px-4 py-4 text-xs text-gray-400 italic">No accessories match this filter.</p>
            ) : (
              <div className="divide-y divide-gray-100">
                {visibleDangerAccessories.map((acc) => {
                  const isConfirming = confirmDeleteAccessory === acc.accessory_id;
                  const isDeleting = deleteAccessoryMutation.isPending && isConfirming;
                  const isCurrentlyPaired = Boolean(acc.paired_at);
                  return (
                    <div key={acc.accessory_id} className="flex items-center gap-3 px-4 py-2.5">
                      <div className="flex-1 min-w-0">
                        <div className="text-sm font-medium text-gray-800 truncate">{acc.accessory_name}</div>
                        <div className="text-xs text-gray-400 flex items-center gap-1.5 flex-wrap">
                          {acc.service_type ?? 'No events yet'}
                          {acc.room_name && <span className="ml-1">&middot; {acc.room_name}</span>}
                          <span
                            className={clsx(
                              'ml-1 inline-flex items-center rounded-full px-1.5 py-0.5 text-[10px] font-medium border',
                              isCurrentlyPaired
                                ? 'text-emerald-700 bg-emerald-50 border-emerald-100'
                                : 'text-red-700 bg-red-50 border-red-100',
                            )}
                          >
                            {isCurrentlyPaired ? 'Currently paired' : 'No longer paired'}
                          </span>
                        </div>
                      </div>
                      {isConfirming ? (
                        <div className="flex items-center gap-2 flex-shrink-0">
                          <span className="text-xs text-gray-500">Delete history? This cannot be undone.</span>
                          <button
                            onClick={() => deleteAccessoryMutation.mutate(acc.accessory_id, {
                              onSuccess: () => setConfirmDeleteAccessory(null),
                            })}
                            disabled={isDeleting}
                            className="text-xs px-2 py-1 bg-red-600 text-white rounded hover:bg-red-700 disabled:opacity-50 transition-colors"
                          >
                            {isDeleting ? 'Deleting\u2026' : 'Yes, delete'}
                          </button>
                          <button
                            onClick={() => setConfirmDeleteAccessory(null)}
                            disabled={isDeleting}
                            className="text-xs px-2 py-1 bg-gray-100 text-gray-600 rounded hover:bg-gray-200 transition-colors"
                          >
                            Cancel
                          </button>
                        </div>
                      ) : (
                        <button
                          onClick={() => setConfirmDeleteAccessory(acc.accessory_id)}
                          className="flex-shrink-0 text-xs text-red-400 hover:text-red-600 hover:bg-red-50 px-2 py-1 rounded transition-colors"
                        >
                          Delete history
                        </button>
                      )}
                    </div>
                  );
                })}
              </div>
            )}

            {/* Wipe all */}
            <div className="border-t border-red-100 bg-red-50/50 px-4 py-4">
              <p className="text-xs font-medium text-red-700 mb-2">
                Wipe all event data — type <code className="bg-red-100 px-1 rounded">DELETE</code> to confirm
              </p>
              <div className="flex gap-2">
                <input
                  type="text"
                  placeholder="Type DELETE to confirm"
                  value={wipeConfirmText}
                  onChange={(e) => setWipeConfirmText(e.target.value)}
                  className="flex-1 text-xs border border-red-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-1 focus:ring-red-400 bg-white placeholder-red-200"
                />
                <button
                  onClick={handleWipeAll}
                  disabled={wipeConfirmText !== 'DELETE' || wipePending}
                  className="flex items-center gap-1.5 px-3 py-2 bg-red-600 text-white text-xs font-medium rounded-lg hover:bg-red-700 disabled:opacity-40 disabled:cursor-not-allowed transition-colors whitespace-nowrap"
                >
                  {wipePending ? <><Loader size={12} className="animate-spin" /> Wiping&hellip;</> : 'Wipe all data'}
                </button>
              </div>
            </div>
          </div>
        )}
      </section>
    </div>
  );
}
