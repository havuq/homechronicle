import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  RefreshCw, CheckCircle, Circle, Loader, Wifi, Lock, ChevronsRight,
  HelpCircle, Trash2, AlertTriangle, ChevronDown, MapPin,
} from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import clsx from 'clsx';
import PinHelpModal from './PinHelpModal.jsx';
import { useAccessories } from '../hooks/useEvents.js';

const CATEGORY_LABELS = {
  1: 'Other', 2: 'Bridge', 3: 'Fan', 4: 'Garage', 5: 'Lightbulb',
  6: 'Door Lock', 7: 'Outlet', 8: 'Switch', 9: 'Thermostat', 10: 'Sensor',
  11: 'Security System', 12: 'Door', 13: 'Window', 14: 'Window Covering',
  15: 'Programmable Switch', 16: 'Range Extender', 17: 'IP Camera',
  18: 'Video Doorbell', 19: 'Air Purifier', 26: 'Speaker', 32: 'TV',
};

async function fetchJson(url, options) {
  const res = await fetch(url, options);
  const data = await res.json();
  if (!res.ok) throw new Error(data.error ?? `HTTP ${res.status}`);
  return data;
}

// ---------------------------------------------------------------------------
// PIN vault — persists entered PINs in localStorage so they survive refresh
// ---------------------------------------------------------------------------
function loadSavedPins() {
  try { return JSON.parse(localStorage.getItem('hc_pins') ?? '{}'); }
  catch { return {}; }
}

export default function Setup() {
  const queryClient = useQueryClient();

  // Bulk pairing state
  const [bulkPin, setBulkPin]           = useState('');
  const [selected, setSelected]         = useState(new Set());
  const [bulkProgress, setBulkProgress] = useState(null);

  // Per-device override PINs + persistent vault
  const [pinOverrides, setPinOverrides] = useState({});
  const [savedPins, setSavedPins]       = useState(loadSavedPins);
  const [pairingStatus, setPairingStatus] = useState({});

  // Room inputs (deviceId → room string)
  const [roomInputs, setRoomInputs] = useState({});

  // Help modal
  const [helpDevice, setHelpDevice] = useState(null);

  // Delete pairing confirmation
  const [confirmDelete, setConfirmDelete] = useState(null);

  // Danger Zone
  const [dangerOpen, setDangerOpen]           = useState(false);
  const [confirmDeleteAccessory, setConfirmDeleteAccessory] = useState(null);
  const [wipeConfirmText, setWipeConfirmText] = useState('');
  const [wipePending, setWipePending]         = useState(false);

  // ── Queries ──────────────────────────────────────────────────────────────

  const { data, isLoading } = useQuery({
    queryKey: ['setup', 'discovered'],
    queryFn: () => fetchJson('/api/setup/discovered'),
    refetchInterval: false,
    staleTime: Infinity,
  });

  // Rooms saved on the server
  const { data: savedRooms = {} } = useQuery({
    queryKey: ['setup', 'rooms'],
    queryFn: () => fetchJson('/api/setup/rooms'),
    onSuccess: (rooms) => setRoomInputs(rooms),
  });

  // All accessories known to the DB (for Danger Zone list)
  const { data: dbAccessories = [] } = useAccessories();

  // ── Mutations ─────────────────────────────────────────────────────────────

  const scanMutation = useMutation({
    mutationFn: () => fetchJson('/api/setup/scan', { method: 'POST' }),
    onSuccess: (data) => {
      queryClient.setQueryData(['setup', 'discovered'], data);
      setSelected(new Set());
      setBulkProgress(null);
    },
  });

  const deletePairingMutation = useMutation({
    mutationFn: (deviceId) =>
      fetchJson(`/api/setup/pairing/${encodeURIComponent(deviceId)}`, { method: 'DELETE' }),
    onSuccess: () => {
      setConfirmDelete(null);
      queryClient.invalidateQueries({ queryKey: ['setup', 'discovered'] });
      queryClient.invalidateQueries({ queryKey: ['accessories'] });
      scanMutation.mutate();
    },
    onError: (err) => {
      setConfirmDelete(null);
      console.error('Delete pairing failed:', err.message);
    },
  });

  const saveRoomMutation = useMutation({
    mutationFn: ({ accessoryId, roomName }) =>
      fetchJson('/api/setup/room', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ accessoryId, roomName }),
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['accessories'] });
      queryClient.invalidateQueries({ queryKey: ['setup', 'rooms'] });
    },
  });

  const deleteAccessoryMutation = useMutation({
    mutationFn: (accessoryId) =>
      fetchJson('/api/data/accessory', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ accessoryId }),
      }),
    onSuccess: () => {
      setConfirmDeleteAccessory(null);
      queryClient.invalidateQueries({ queryKey: ['accessories'] });
      queryClient.invalidateQueries({ queryKey: ['events'] });
    },
  });

  // ── Derived state ─────────────────────────────────────────────────────────

  const accessories  = data?.accessories ?? [];
  const paired       = accessories.filter((a) => a.alreadyPaired);
  const unpaired     = accessories.filter((a) => !a.alreadyPaired && pairingStatus[a.id]?.state !== 'success');
  const scanning     = scanMutation.isPending;
  const isBulkPairing = bulkProgress !== null && bulkProgress.done < bulkProgress.total;
  const allSelected   = unpaired.length > 0 && selected.size === unpaired.length;

  // ── Helpers ───────────────────────────────────────────────────────────────

  function savePin(id, pin) {
    const next = { ...savedPins, [id]: pin };
    setSavedPins(next);
    localStorage.setItem('hc_pins', JSON.stringify(next));
  }

  function resolvePin(id) {
    return pinOverrides[id]?.trim() || savedPins[id]?.trim() || bulkPin.trim();
  }

  function toggleSelect(id) {
    setSelected((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  }

  function toggleAll() {
    if (selected.size === unpaired.length) setSelected(new Set());
    else setSelected(new Set(unpaired.map((a) => a.id)));
  }

  function handleRoomBlur(deviceId) {
    const roomName = roomInputs[deviceId] ?? '';
    saveRoomMutation.mutate({ accessoryId: deviceId, roomName });
  }

  async function pairOne(deviceId, pin) {
    setPairingStatus((s) => ({ ...s, [deviceId]: { state: 'loading', message: 'Pairing…' } }));
    try {
      const result = await fetchJson('/api/setup/pair', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ deviceId, pin }),
      });
      savePin(deviceId, pin);
      setPairingStatus((s) => ({
        ...s, [deviceId]: { state: 'success', message: `Paired — now logging ${result.name}` }
      }));
      return { ok: true, name: result.name };
    } catch (err) {
      setPairingStatus((s) => ({
        ...s, [deviceId]: { state: 'error', message: err.message }
      }));
      return { ok: false, error: err.message };
    }
  }

  async function handleBulkPair() {
    const ids = [...selected];
    if (!ids.length) return;
    setBulkProgress({ total: ids.length, done: 0, results: [] });
    for (let i = 0; i < ids.length; i++) {
      const id  = ids[i];
      const pin = resolvePin(id);
      if (!pin) {
        setPairingStatus((s) => ({
          ...s, [id]: { state: 'error', message: 'No PIN — enter a PIN above or set one for this device' }
        }));
        setBulkProgress((p) => ({ ...p, done: i + 1, results: [...p.results, { id, ok: false }] }));
        continue;
      }
      const result = await pairOne(id, pin);
      setBulkProgress((p) => ({ ...p, done: i + 1, results: [...p.results, { id, ...result }] }));
    }
    queryClient.invalidateQueries({ queryKey: ['setup', 'pairings'] });
    queryClient.invalidateQueries({ queryKey: ['setup', 'discovered'] });
    setSelected(new Set());
  }

  async function handleWipeAll() {
    if (wipeConfirmText !== 'DELETE') return;
    setWipePending(true);
    try {
      await fetchJson('/api/data/all', { method: 'DELETE' });
      queryClient.invalidateQueries({ queryKey: ['accessories'] });
      queryClient.invalidateQueries({ queryKey: ['events'] });
      setWipeConfirmText('');
    } finally {
      setWipePending(false);
    }
  }

  // ── Render ────────────────────────────────────────────────────────────────

  return (
    <div className="max-w-2xl mx-auto py-6 px-4 space-y-6">

      {/* Help modal */}
      {helpDevice && (
        <PinHelpModal
          deviceName={helpDevice.name}
          category={helpDevice.category}
          onClose={() => setHelpDevice(null)}
        />
      )}

      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold text-gray-900">Accessory Setup</h2>
          <p className="text-sm text-gray-500 mt-0.5">
            Discover and pair HomeKit accessories to start logging their events.
          </p>
        </div>
        <button
          onClick={() => scanMutation.mutate()}
          disabled={scanning || isBulkPairing}
          className={clsx(
            'flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors',
            scanning ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
                     : 'bg-blue-600 text-white hover:bg-blue-700'
          )}
        >
          <RefreshCw size={15} className={scanning ? 'animate-spin' : ''} />
          {scanning ? 'Scanning (10s)…' : 'Rescan Network'}
        </button>
      </div>

      {/* PIN info */}
      <div className="bg-gray-50 border border-gray-200 rounded-lg px-4 py-3 text-sm text-gray-600 space-y-1">
        <p>
          <strong>About setup PINs:</strong> Each accessory needs its 8-digit code (format:{' '}
          <code className="bg-gray-100 px-1 rounded text-xs">111-22-333</code>) to pair for the first time.
          PINs are saved automatically after a successful pairing.
        </p>
        <p className="text-xs text-gray-400">
          Can't find a PIN? Click the "Can't find PIN?" link next to any device for step-by-step help.
        </p>
      </div>

      {data?.cachedAt && (
        <p className="text-xs text-gray-400">
          Last scan: {formatDistanceToNow(new Date(data.cachedAt), { addSuffix: true })} · auto-rescans every hour
        </p>
      )}

      {scanMutation.isError && (
        <div className="bg-red-50 border border-red-200 text-red-700 rounded-lg px-4 py-3 text-sm">
          Scan failed: {scanMutation.error?.message}
        </div>
      )}

      {isLoading && (
        <div className="flex justify-center py-12 text-gray-400 gap-2">
          <Loader size={18} className="animate-spin" /> Loading…
        </div>
      )}

      {/* ── Bulk pair panel ──────────────────────────────────────────────── */}
      {unpaired.length > 0 && (
        <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 space-y-3">
          <div>
            <p className="text-sm font-medium text-blue-900">Pair multiple at once</p>
            <p className="text-xs text-blue-700 mt-0.5">
              Enter a shared PIN for accessories that use the same code, then select them and click Pair Selected.
              Devices with a different PIN can be set individually below.
            </p>
          </div>
          <div className="flex gap-2">
            <div className="relative flex-1">
              <Lock size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-blue-400" />
              <input
                type="text"
                placeholder="Shared PIN  (e.g. 111-22-333)"
                value={bulkPin}
                onChange={(e) => setBulkPin(e.target.value)}
                disabled={isBulkPairing}
                className="w-full pl-8 pr-3 py-2 border border-blue-300 bg-white rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50"
              />
            </div>
            <button
              onClick={handleBulkPair}
              disabled={isBulkPairing || selected.size === 0}
              className="flex items-center gap-1.5 px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 disabled:opacity-40 disabled:cursor-not-allowed transition-colors whitespace-nowrap"
            >
              {isBulkPairing
                ? <><Loader size={14} className="animate-spin" /> {bulkProgress.done}/{bulkProgress.total}</>
                : <><ChevronsRight size={14} /> Pair Selected ({selected.size})</>
              }
            </button>
          </div>
          {bulkProgress && (
            <div>
              <div className="flex justify-between text-xs text-blue-700 mb-1">
                <span>{isBulkPairing ? 'Pairing…' : 'Done'}</span>
                <span>{bulkProgress.done} / {bulkProgress.total}</span>
              </div>
              <div className="bg-blue-200 rounded-full h-1.5">
                <div
                  className="bg-blue-600 h-1.5 rounded-full transition-all"
                  style={{ width: `${(bulkProgress.done / bulkProgress.total) * 100}%` }}
                />
              </div>
            </div>
          )}
        </div>
      )}

      {/* ── Already paired ───────────────────────────────────────────────── */}
      {paired.length > 0 && (
        <section>
          <h3 className="text-xs font-semibold uppercase tracking-wider text-gray-400 mb-2">
            Paired ({paired.length})
          </h3>
          <div className="bg-white rounded-xl shadow-sm divide-y divide-gray-100">
            {paired.map((acc) => {
              const isConfirming = confirmDelete === acc.id;
              const isDeleting   = deletePairingMutation.isPending && confirmDelete === acc.id;
              const roomVal      = roomInputs[acc.id] ?? savedRooms[acc.id] ?? '';
              return (
                <div key={acc.id} className="px-4 py-3">
                  <div className="flex items-center gap-3">
                    <CheckCircle size={18} className="text-green-500 flex-shrink-0" />
                    <div className="flex-1 min-w-0">
                      <div className="font-medium text-gray-900 truncate">{acc.name}</div>
                      <div className="text-xs text-gray-400">
                        {CATEGORY_LABELS[acc.category] ?? 'Unknown'} · {acc.address}
                      </div>
                      {/* Room input */}
                      <div className="flex items-center gap-1 mt-1.5">
                        <MapPin size={10} className="text-gray-300 flex-shrink-0" />
                        <input
                          type="text"
                          placeholder="Add room name…"
                          value={roomVal}
                          onChange={(e) => setRoomInputs((r) => ({ ...r, [acc.id]: e.target.value }))}
                          onBlur={() => handleRoomBlur(acc.id)}
                          onKeyDown={(e) => e.key === 'Enter' && handleRoomBlur(acc.id)}
                          className="text-xs border border-gray-200 rounded px-2 py-0.5 w-36 focus:outline-none focus:ring-1 focus:ring-blue-400 placeholder-gray-300"
                        />
                      </div>
                    </div>

                    {isConfirming ? (
                      <div className="flex items-center gap-2 flex-shrink-0">
                        <span className="text-xs text-gray-500">Remove pairing?</span>
                        <button
                          onClick={() => deletePairingMutation.mutate(acc.id)}
                          disabled={isDeleting}
                          className="text-xs px-2 py-1 bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:opacity-50 transition-colors"
                        >
                          {isDeleting ? 'Removing…' : 'Yes, remove'}
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
                </div>
              );
            })}
          </div>
        </section>
      )}

      {/* ── Available to pair ────────────────────────────────────────────── */}
      {unpaired.length > 0 && (
        <section>
          <div className="flex items-center justify-between mb-2">
            <h3 className="text-xs font-semibold uppercase tracking-wider text-gray-400">
              Available to pair ({unpaired.length})
            </h3>
            <button onClick={toggleAll} className="text-xs text-blue-600 hover:underline">
              {allSelected ? 'Deselect all' : 'Select all'}
            </button>
          </div>

          <div className="bg-white rounded-xl shadow-sm divide-y divide-gray-100">
            {unpaired.map((acc) => {
              const status    = pairingStatus[acc.id];
              const isPairing = status?.state === 'loading';
              const isSuccess = status?.state === 'success';
              const isError   = status?.state === 'error';
              const isChecked = selected.has(acc.id);
              const hasSavedPin = !!savedPins[acc.id] && !pinOverrides[acc.id];

              return (
                <div key={acc.id} className={clsx('px-4 py-3', isChecked && 'bg-blue-50/50')}>
                  <div className="flex items-center gap-3">
                    <input
                      type="checkbox"
                      checked={isChecked}
                      onChange={() => toggleSelect(acc.id)}
                      disabled={isPairing || isSuccess}
                      className="w-4 h-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500 cursor-pointer"
                    />
                    {isPairing
                      ? <Loader size={16} className="text-blue-400 animate-spin flex-shrink-0" />
                      : isSuccess
                        ? <CheckCircle size={16} className="text-green-500 flex-shrink-0" />
                        : <Circle size={16} className="text-gray-300 flex-shrink-0" />
                    }
                    <div className="flex-1 min-w-0">
                      <div className="font-medium text-gray-900 text-sm truncate">{acc.name}</div>
                      <div className="text-xs text-gray-400">
                        {CATEGORY_LABELS[acc.category] ?? 'Unknown'} · {acc.address}
                      </div>
                      {acc.category === 2 && (
                        <div className="text-xs text-blue-600 mt-0.5 font-medium">
                          Bridge — one PIN logs all connected accessories
                        </div>
                      )}
                    </div>
                    {!isSuccess && (
                      <div className="flex flex-col items-end gap-0.5">
                        <input
                          type="text"
                          placeholder={hasSavedPin ? '(saved)' : acc.category === 2 ? 'Bridge PIN' : 'Device PIN'}
                          value={pinOverrides[acc.id] ?? ''}
                          onChange={(e) => {
                            const val = e.target.value;
                            setPinOverrides((p) => ({ ...p, [acc.id]: val }));
                            if (val.trim()) savePin(acc.id, val.trim());
                          }}
                          disabled={isPairing}
                          className={clsx(
                            'w-32 px-2 py-1 border rounded text-xs focus:outline-none focus:ring-1 focus:ring-blue-400 disabled:opacity-50 placeholder-gray-300',
                            hasSavedPin
                              ? 'border-green-300 bg-green-50 placeholder-green-400'
                              : 'border-gray-200'
                          )}
                        />
                        <button
                          onClick={() => setHelpDevice({ name: acc.name, category: acc.category })}
                          className="flex items-center gap-0.5 text-xs text-gray-400 hover:text-blue-500 transition-colors"
                        >
                          <HelpCircle size={10} />
                          Can't find PIN?
                        </button>
                      </div>
                    )}
                  </div>
                  {isSuccess && (
                    <p className="mt-1.5 ml-10 text-xs text-green-600">{status.message}</p>
                  )}
                  {isError && (
                    <div className="mt-2 ml-10 bg-red-50 border border-red-100 rounded-lg px-3 py-2">
                      <p className="text-xs text-red-700">{status.message}</p>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </section>
      )}

      {/* Empty state */}
      {!isLoading && accessories.length === 0 && (
        <div className="flex flex-col items-center justify-center py-16 text-gray-400 text-center">
          <Wifi size={32} className="mb-3 opacity-40" />
          <p className="font-medium">No accessories found</p>
          <p className="text-sm mt-1 max-w-xs">
            Click "Rescan Network" to search for HomeKit accessories on your local network.
          </p>
        </div>
      )}

      {/* ── Danger Zone ──────────────────────────────────────────────────── */}
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

            {dbAccessories.length === 0 ? (
              <p className="px-4 py-4 text-xs text-gray-400 italic">No accessory data in the database.</p>
            ) : (
              <div className="divide-y divide-gray-100">
                {dbAccessories.map((acc) => {
                  const isConfirming = confirmDeleteAccessory === acc.accessory_id;
                  const isDeleting   = deleteAccessoryMutation.isPending && confirmDeleteAccessory === acc.accessory_id;
                  return (
                    <div key={acc.accessory_id} className="flex items-center gap-3 px-4 py-2.5">
                      <div className="flex-1 min-w-0">
                        <div className="text-sm font-medium text-gray-800 truncate">{acc.accessory_name}</div>
                        <div className="text-xs text-gray-400">
                          {acc.service_type ?? 'No events yet'}
                          {acc.room_name && <span className="ml-1">· {acc.room_name}</span>}
                        </div>
                      </div>
                      {isConfirming ? (
                        <div className="flex items-center gap-2 flex-shrink-0">
                          <span className="text-xs text-gray-500">Delete history?</span>
                          <button
                            onClick={() => deleteAccessoryMutation.mutate(acc.accessory_id)}
                            disabled={isDeleting}
                            className="text-xs px-2 py-1 bg-red-600 text-white rounded hover:bg-red-700 disabled:opacity-50 transition-colors"
                          >
                            {isDeleting ? 'Deleting…' : 'Yes, delete'}
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
                  {wipePending ? <><Loader size={12} className="animate-spin" /> Wiping…</> : 'Wipe all data'}
                </button>
              </div>
            </div>
          </div>
        )}
      </section>

    </div>
  );
}
