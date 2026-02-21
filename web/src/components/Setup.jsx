import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { RefreshCw, CheckCircle, Circle, Loader, Wifi, Lock } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import clsx from 'clsx';

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

export default function Setup() {
  const queryClient = useQueryClient();
  const [pinInputs, setPinInputs] = useState({});   // deviceId → pin string
  const [pairingStatus, setPairingStatus] = useState({}); // deviceId → {state, message}

  // Load cached discovery results on mount
  const { data, isLoading, dataUpdatedAt } = useQuery({
    queryKey: ['setup', 'discovered'],
    queryFn: () => fetchJson('/api/setup/discovered'),
    refetchInterval: false,
    staleTime: Infinity,
  });

  // Load already-paired devices
  const { data: pairedList = [] } = useQuery({
    queryKey: ['setup', 'pairings'],
    queryFn: () => fetchJson('/api/setup/pairings'),
    refetchInterval: 30_000,
  });

  // Trigger a fresh scan
  const scanMutation = useMutation({
    mutationFn: () => fetchJson('/api/setup/scan', { method: 'POST' }),
    onSuccess: (data) => {
      queryClient.setQueryData(['setup', 'discovered'], data);
    },
  });

  // Pair a single device
  async function handlePair(deviceId) {
    const pin = pinInputs[deviceId]?.trim();
    if (!pin) return;

    setPairingStatus((s) => ({ ...s, [deviceId]: { state: 'loading', message: 'Pairing…' } }));

    try {
      const result = await fetchJson('/api/setup/pair', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ deviceId, pin }),
      });
      setPairingStatus((s) => ({
        ...s, [deviceId]: { state: 'success', message: `Paired! Now logging events from ${result.name}.` }
      }));
      queryClient.invalidateQueries({ queryKey: ['setup', 'pairings'] });
      queryClient.invalidateQueries({ queryKey: ['setup', 'discovered'] });
    } catch (err) {
      setPairingStatus((s) => ({
        ...s, [deviceId]: { state: 'error', message: err.message }
      }));
    }
  }

  const accessories = data?.accessories ?? [];
  const paired = accessories.filter((a) => a.alreadyPaired);
  const unpaired = accessories.filter((a) => !a.alreadyPaired);
  const scanning = scanMutation.isPending;

  return (
    <div className="max-w-2xl mx-auto py-6 px-4 space-y-6">

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
          disabled={scanning}
          className={clsx(
            'flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors',
            scanning
              ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
              : 'bg-blue-600 text-white hover:bg-blue-700'
          )}
        >
          <RefreshCw size={15} className={scanning ? 'animate-spin' : ''} />
          {scanning ? 'Scanning (10s)…' : 'Rescan Network'}
        </button>
      </div>

      {/* Scan status */}
      {data?.cachedAt && (
        <p className="text-xs text-gray-400">
          Last scan: {formatDistanceToNow(new Date(data.cachedAt), { addSuffix: true })}
          {' '}· auto-rescans every hour
        </p>
      )}

      {scanMutation.isError && (
        <div className="bg-red-50 border border-red-200 text-red-700 rounded-lg px-4 py-3 text-sm">
          Scan failed: {scanMutation.error?.message}. Make sure the listener is running with the correct network interface.
        </div>
      )}

      {/* Loading state */}
      {isLoading && (
        <div className="flex justify-center py-12 text-gray-400 gap-2">
          <Loader size={18} className="animate-spin" /> Loading…
        </div>
      )}

      {/* Already paired */}
      {paired.length > 0 && (
        <section>
          <h3 className="text-xs font-semibold uppercase tracking-wider text-gray-400 mb-2">
            Paired ({paired.length})
          </h3>
          <div className="bg-white rounded-xl shadow-sm divide-y divide-gray-100">
            {paired.map((acc) => (
              <div key={acc.id} className="flex items-center gap-3 px-4 py-3">
                <CheckCircle size={18} className="text-green-500 flex-shrink-0" />
                <div className="flex-1 min-w-0">
                  <div className="font-medium text-gray-900 truncate">{acc.name}</div>
                  <div className="text-xs text-gray-400">
                    {CATEGORY_LABELS[acc.category] ?? 'Unknown'} · {acc.address}
                  </div>
                </div>
                <span className="text-xs bg-green-50 text-green-700 px-2 py-0.5 rounded-full">
                  Logging
                </span>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Available to pair */}
      {unpaired.length > 0 && (
        <section>
          <h3 className="text-xs font-semibold uppercase tracking-wider text-gray-400 mb-2">
            Available to pair ({unpaired.length})
          </h3>
          <div className="bg-white rounded-xl shadow-sm divide-y divide-gray-100">
            {unpaired.map((acc) => {
              const status = pairingStatus[acc.id];
              const isPairing = status?.state === 'loading';
              const isSuccess = status?.state === 'success';
              const isError = status?.state === 'error';

              return (
                <div key={acc.id} className="px-4 py-4">
                  <div className="flex items-center gap-3 mb-3">
                    <Circle size={18} className="text-gray-300 flex-shrink-0" />
                    <div className="flex-1 min-w-0">
                      <div className="font-medium text-gray-900 truncate">{acc.name}</div>
                      <div className="text-xs text-gray-400">
                        {CATEGORY_LABELS[acc.category] ?? 'Unknown'} · {acc.address}:{acc.port}
                      </div>
                    </div>
                  </div>

                  {isSuccess ? (
                    <div className="flex items-center gap-2 text-sm text-green-600">
                      <CheckCircle size={15} /> {status.message}
                    </div>
                  ) : (
                    <div className="flex gap-2">
                      <div className="relative flex-1">
                        <Lock size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                        <input
                          type="text"
                          placeholder="PIN (e.g. 111-22-333)"
                          value={pinInputs[acc.id] ?? ''}
                          onChange={(e) => setPinInputs((p) => ({ ...p, [acc.id]: e.target.value }))}
                          onKeyDown={(e) => e.key === 'Enter' && handlePair(acc.id)}
                          disabled={isPairing}
                          className="w-full pl-8 pr-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50"
                        />
                      </div>
                      <button
                        onClick={() => handlePair(acc.id)}
                        disabled={isPairing || !pinInputs[acc.id]?.trim()}
                        className="flex items-center gap-1.5 px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                      >
                        {isPairing
                          ? <><Loader size={14} className="animate-spin" /> Pairing…</>
                          : <><Wifi size={14} /> Pair</>
                        }
                      </button>
                    </div>
                  )}

                  {isError && (
                    <p className="mt-2 text-xs text-red-600">{status.message}</p>
                  )}
                </div>
              );
            })}
          </div>
        </section>
      )}

      {/* Empty state — no scan results yet */}
      {!isLoading && accessories.length === 0 && (
        <div className="flex flex-col items-center justify-center py-16 text-gray-400 text-center">
          <Wifi size={32} className="mb-3 opacity-40" />
          <p className="font-medium">No accessories found</p>
          <p className="text-sm mt-1 max-w-xs">
            Click "Rescan Network" to search for HomeKit accessories on your local network.
            Make sure the listener is running with the correct network interface.
          </p>
        </div>
      )}

      {/* PIN help */}
      <div className="bg-blue-50 border border-blue-100 rounded-lg px-4 py-3 text-sm text-blue-800">
        <strong>Where to find the PIN:</strong> Check the label on the device itself, or open the
        Apple Home app → tap the accessory → scroll to "Accessory Information" → HomeKit setup code.
        Format: <code className="bg-blue-100 px-1 rounded">111-22-333</code>
      </div>
    </div>
  );
}
