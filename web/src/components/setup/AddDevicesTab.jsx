import { useState } from 'react';
import {
  RefreshCw, CheckCircle, Circle, Loader, Lock, ChevronsRight,
  HelpCircle, Wifi,
} from 'lucide-react';
import clsx from 'clsx';
import { formatDistanceToNow } from 'date-fns';
import PinHelpModal from '../PinHelpModal.jsx';
import { CATEGORY_LABELS } from './constants.js';

export default function AddDevicesTab({ setup }) {
  const {
    discoveredData,
    discoveredLoading,
    accessories,
    scanMutation,
    savedPins,
    savePin,
    resolvePin,
    pairOne,
    pairSelectedIds,
    commissionConfigured,
    pollingConfigured,
    pairMatterMutation,
    matterRuntime,
    matterDiscoveredData,
    matterDiscoveredLoading,
    matterScanMutation,
  } = setup;

  // HomeKit local state
  const [bulkPin, setBulkPin] = useState('');
  const [selected, setSelected] = useState(new Set());
  const [bulkProgress, setBulkProgress] = useState(null);
  const [pinOverrides, setPinOverrides] = useState({});
  const [pairingStatus, setPairingStatus] = useState({});
  const [helpDevice, setHelpDevice] = useState(null);

  // Matter local state
  const [matterForm, setMatterForm] = useState({
    nodeId: '',
    name: '',
    setupCode: '',
    transport: 'ip',
    address: '',
    port: '',
  });
  const [matterFeedback, setMatterFeedback] = useState(null);
  const [matterMode, setMatterMode] = useState('commission');
  const [matterAdvancedOpen, setMatterAdvancedOpen] = useState(false);

  // Derived
  const unpaired = accessories.filter((a) => !a.alreadyPaired && pairingStatus[a.id]?.state !== 'success');
  const scanning = scanMutation.isPending;
  const isBulkPairing = bulkProgress !== null && bulkProgress.done < bulkProgress.total;
  const allSelected = unpaired.length > 0 && selected.size === unpaired.length;

  function localResolvePin(id) {
    return pinOverrides[id]?.trim() || resolvePin(id) || bulkPin.trim();
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

  async function handleBulkPair() {
    await pairSelectedIds([...selected], localResolvePin, setPairingStatus, setBulkProgress);
    setSelected(new Set());
  }

  async function handlePairOne(id) {
    const pin = localResolvePin(id);
    if (!pin) {
      setPairingStatus((s) => ({
        ...s, [id]: { state: 'error', message: 'No PIN \u2014 enter a PIN above or set one for this device' },
      }));
      return;
    }
    await pairOne(id, pin, setPairingStatus);
  }

  function handleMatterSubmit(event) {
    event.preventDefault();
    const name = matterForm.name.trim();
    if (!name) {
      setMatterFeedback({ type: 'error', message: 'Device label is required.' });
      return;
    }
    const setupCode = matterForm.setupCode.trim();
    const nodeId = matterForm.nodeId.trim();
    if (matterMode === 'commission') {
      if (!setupCode) {
        setMatterFeedback({ type: 'error', message: 'Paste the Matter setup code from Apple Home.' });
        return;
      }
      if (!commissionConfigured) {
        setMatterFeedback({
          type: 'error',
          message: 'Matter commissioning is not available. Check listener logs for details.',
        });
        return;
      }
    }
    if (matterMode === 'import' && !nodeId) {
      setMatterFeedback({ type: 'error', message: 'Node ID is required for import mode.' });
      return;
    }

    const payload = { name, transport: matterForm.transport || 'ip' };
    if (matterMode === 'import') payload.nodeId = nodeId;
    if (matterMode === 'commission') payload.setupCode = setupCode;
    if (matterForm.address.trim()) payload.address = matterForm.address.trim();
    if (matterForm.port.trim()) {
      const parsedPort = Number.parseInt(matterForm.port, 10);
      if (!Number.isFinite(parsedPort)) {
        setMatterFeedback({ type: 'error', message: 'Port must be a number.' });
        return;
      }
      payload.port = parsedPort;
    }

    setMatterFeedback(null);
    pairMatterMutation.mutate(payload, {
      onSuccess: (result) => {
        const id = result?.pairing?.nodeId ?? result?.pairing?.id ?? 'device';
        const pollHint = '';
        setMatterFeedback({ type: 'success', message: `Matter device "${name}" added (${id}).${pollHint}` });
        setMatterForm((prev) => ({ ...prev, nodeId: '', name: '', setupCode: '', address: '', port: '' }));
      },
      onError: (err) => {
        setMatterFeedback({ type: 'error', message: err.message ?? 'Could not add Matter device.' });
      },
    });
  }

  return (
    <div className="space-y-4">

      {/* Help modal */}
      {helpDevice && (
        <PinHelpModal
          deviceName={helpDevice.name}
          category={helpDevice.category}
          onClose={() => setHelpDevice(null)}
        />
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">

        {/* ── HomeKit Card ──────────────────────────────────────────────── */}
        <div className="bg-white rounded-xl shadow-sm p-4 space-y-3 border border-gray-100">
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-sm font-semibold text-gray-900">HomeKit</h3>
              <span className="text-[10px] font-medium text-gray-500 bg-gray-100 border border-gray-200 rounded-full px-1.5 py-0.5">HAP</span>
            </div>
            <p className="text-xs text-gray-500 mt-0.5">
              Scan your network to find devices and start logging their events.
            </p>
            <button
              onClick={() => setHelpDevice({ name: null, category: null })}
              className="flex items-center gap-1 mt-1.5 text-xs text-blue-600 hover:text-blue-800 transition-colors"
            >
              <HelpCircle size={12} />
              How do I find my PIN?
            </button>
          </div>

          <button
            onClick={() => { scanMutation.mutate(); setSelected(new Set()); setBulkProgress(null); }}
            disabled={scanning || isBulkPairing}
            className={clsx(
              'w-full flex items-center justify-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors',
              scanning ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
                       : 'bg-blue-600 text-white hover:bg-blue-700',
            )}
          >
            <RefreshCw size={15} className={scanning ? 'animate-spin' : ''} />
            {scanning ? 'Scanning (10s)\u2026' : 'Scan Network'}
          </button>

          {discoveredData?.cachedAt && (
            <p className="text-xs text-gray-400">
              Last scan: {formatDistanceToNow(new Date(discoveredData.cachedAt), { addSuffix: true })}
            </p>
          )}

          {scanMutation.isError && (
            <div className="bg-red-50 border border-red-200 text-red-700 rounded-lg px-3 py-2 text-xs">
              Scan failed: {scanMutation.error?.message}
            </div>
          )}

          {discoveredLoading && (
            <div className="flex justify-center py-8 text-gray-400 gap-2 text-sm">
              <Loader size={16} className="animate-spin" /> Loading...
            </div>
          )}

          {/* Bulk pair panel */}
          {unpaired.length > 0 && (
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 space-y-2">
              <p className="text-xs text-blue-700">
                Select devices and enter a shared PIN, or set PINs individually.
              </p>
              <div className="flex gap-2">
                <div className="relative flex-1">
                  <Lock size={14} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-blue-400" />
                  <input
                    type="text"
                    placeholder="Shared PIN (e.g. 111-22-333)"
                    value={bulkPin}
                    onChange={(e) => setBulkPin(e.target.value)}
                    disabled={isBulkPairing}
                    className="w-full pl-8 pr-3 py-1.5 border border-blue-300 bg-white rounded-lg text-xs focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50"
                  />
                </div>
                <button
                  onClick={handleBulkPair}
                  disabled={isBulkPairing || selected.size === 0}
                  className="flex items-center gap-1 px-3 py-1.5 bg-blue-600 text-white text-xs font-medium rounded-lg hover:bg-blue-700 disabled:opacity-40 disabled:cursor-not-allowed transition-colors whitespace-nowrap"
                >
                  {isBulkPairing
                    ? <><Loader size={12} className="animate-spin" /> {bulkProgress.done}/{bulkProgress.total}</>
                    : <><ChevronsRight size={12} /> Pair ({selected.size})</>}
                </button>
              </div>
              {bulkProgress && (
                <div>
                  <div className="flex justify-between text-xs text-blue-700 mb-1">
                    <span>{isBulkPairing ? 'Pairing\u2026' : 'Done'}</span>
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

          {/* Unpaired device list */}
          {unpaired.length > 0 && (
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <span className="text-xs text-gray-400">{unpaired.length} available</span>
                <button onClick={toggleAll} className="text-xs text-blue-600 hover:underline">
                  {allSelected ? 'Deselect all' : 'Select all'}
                </button>
              </div>
              <div className="divide-y divide-gray-100 border border-gray-100 rounded-lg">
                {unpaired.map((acc) => {
                  const status = pairingStatus[acc.id];
                  const isPairing = status?.state === 'loading';
                  const isSuccess = status?.state === 'success';
                  const isError = status?.state === 'error';
                  const isChecked = selected.has(acc.id);
                  const hasSavedPin = !!savedPins[acc.id] && !pinOverrides[acc.id];
                  return (
                    <div key={acc.id} className={clsx('px-3 py-2', isChecked && 'bg-blue-50/50')}>
                      <div className="flex items-center gap-2">
                        <input
                          type="checkbox"
                          checked={isChecked}
                          onChange={() => toggleSelect(acc.id)}
                          disabled={isPairing || isSuccess}
                          className="w-3.5 h-3.5 rounded border-gray-300 text-blue-600 focus:ring-blue-500 cursor-pointer"
                        />
                        {isPairing
                          ? <Loader size={14} className="text-blue-400 animate-spin flex-shrink-0" />
                          : isSuccess
                            ? <CheckCircle size={14} className="text-green-500 flex-shrink-0" />
                            : <Circle size={14} className="text-gray-300 flex-shrink-0" />}
                        <div className="flex-1 min-w-0">
                          <div className="font-medium text-gray-900 text-xs truncate">{acc.name}</div>
                          <div className="text-[11px] text-gray-400">
                            {CATEGORY_LABELS[acc.category] ?? 'Unknown'}
                            {acc.category === 2 && (
                              <span className="text-blue-600 ml-1 font-medium">Bridge</span>
                            )}
                          </div>
                        </div>
                        {!isSuccess && (
                          <div className="flex flex-col items-end gap-1">
                            <input
                              type="text"
                              placeholder={hasSavedPin ? '(saved)' : 'PIN'}
                              value={pinOverrides[acc.id] ?? ''}
                              onChange={(e) => {
                                const val = e.target.value;
                                setPinOverrides((p) => ({ ...p, [acc.id]: val }));
                                if (val.trim()) savePin(acc.id, val.trim());
                              }}
                              disabled={isPairing}
                              className={clsx(
                                'w-28 px-2 py-0.5 border rounded text-xs focus:outline-none focus:ring-1 focus:ring-blue-400 disabled:opacity-50 placeholder-gray-300',
                                hasSavedPin ? 'border-green-300 bg-green-50 placeholder-green-400' : 'border-gray-200',
                              )}
                            />
                            <div className="flex items-center gap-2">
                              <button
                                onClick={() => setHelpDevice({ name: acc.name, category: acc.category })}
                                className="flex items-center gap-0.5 text-[10px] text-gray-400 hover:text-blue-500 transition-colors"
                              >
                                <HelpCircle size={9} />
                                PIN help
                              </button>
                              <button
                                onClick={() => handlePairOne(acc.id)}
                                disabled={isPairing || isBulkPairing}
                                className="text-[10px] px-2 py-0.5 rounded bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                              >
                                Pair
                              </button>
                            </div>
                          </div>
                        )}
                      </div>
                      {isSuccess && (
                        <p className="mt-1 ml-6 text-xs text-green-600">{status.message}</p>
                      )}
                      {isError && (
                        <div className="mt-1 ml-6 bg-red-50 border border-red-100 rounded px-2 py-1">
                          <p className="text-xs text-red-700">{status.message}</p>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Empty state */}
          {!discoveredLoading && accessories.length === 0 && (
            <div className="flex flex-col items-center justify-center py-8 text-gray-400 text-center">
              <Wifi size={24} className="mb-2 opacity-40" />
              <p className="text-xs font-medium">No accessories found</p>
              <p className="text-[11px] mt-0.5">Click Scan Network to search.</p>
            </div>
          )}

        </div>

        {/* ── Matter Card ───────────────────────────────────────────────── */}
        <MatterCard
          setup={setup}
          matterForm={matterForm}
          setMatterForm={setMatterForm}
          matterFeedback={matterFeedback}
          setMatterFeedback={setMatterFeedback}
          matterMode={matterMode}
          setMatterMode={setMatterMode}
          matterAdvancedOpen={matterAdvancedOpen}
          setMatterAdvancedOpen={setMatterAdvancedOpen}
          handleMatterSubmit={handleMatterSubmit}
        />
      </div>

    </div>
  );
}

/* ── Matter Card ────────────────────────────────────────────────────────── */

function MatterCard({
  setup,
  matterForm,
  setMatterForm,
  matterFeedback,
  setMatterFeedback,
  matterMode,
  setMatterMode,
  matterAdvancedOpen,
  setMatterAdvancedOpen,
  handleMatterSubmit,
}) {
  const {
    commissionConfigured,
    pairMatterMutation,
    matterDiscoveredData,
    matterDiscoveredLoading,
    matterScanMutation,
  } = setup;

  const [matterPairingStatus, setMatterPairingStatus] = useState({});
  const matterScanning = matterScanMutation.isPending;
  const matterDevices = matterDiscoveredData?.devices ?? [];
  const unpaired = matterDevices.filter((d) => !d.alreadyPaired && matterPairingStatus[d.id]?.state !== 'success');

  function handleMatterPairOne(device) {
    const name = matterForm[`name_${device.id}`]?.trim();
    const setupCode = matterForm[`code_${device.id}`]?.trim();
    if (!name) {
      setMatterPairingStatus((s) => ({
        ...s, [device.id]: { state: 'error', message: 'Enter a device name.' },
      }));
      return;
    }
    if (!setupCode) {
      setMatterPairingStatus((s) => ({
        ...s, [device.id]: { state: 'error', message: 'Enter the setup code from Apple Home.' },
      }));
      return;
    }

    setMatterPairingStatus((s) => ({
      ...s, [device.id]: { state: 'loading', message: 'Commissioning\u2026' },
    }));

    const payload = {
      name,
      setupCode,
      transport: 'ip',
      address: device.address ?? undefined,
      port: device.port ?? undefined,
    };

    pairMatterMutation.mutate(payload, {
      onSuccess: (result) => {
        const id = result?.pairing?.nodeId ?? result?.pairing?.id ?? 'device';
        setMatterPairingStatus((s) => ({
          ...s, [device.id]: { state: 'success', message: `Paired \u2014 now logging ${name} (${id})` },
        }));
      },
      onError: (err) => {
        setMatterPairingStatus((s) => ({
          ...s, [device.id]: { state: 'error', message: err.message ?? 'Commissioning failed.' },
        }));
      },
    });
  }

  return (
    <div className="bg-white rounded-xl shadow-sm p-4 space-y-3 border border-gray-100">
      <div>
        <div className="flex items-center gap-2">
          <h3 className="text-sm font-semibold text-gray-900">Matter</h3>
          <span className="text-[10px] font-medium text-amber-700 bg-amber-50 border border-amber-200 rounded-full px-1.5 py-0.5">Alpha</span>
        </div>
        <p className="text-xs text-gray-500 mt-0.5">
          Scan for Matter devices in commissioning mode, then enter a setup code to start logging.
        </p>
      </div>

      {/* Scan button */}
      <button
        onClick={() => { matterScanMutation.mutate(); setMatterPairingStatus({}); }}
        disabled={matterScanning || !commissionConfigured}
        className={clsx(
          'w-full flex items-center justify-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors',
          matterScanning ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
                         : !commissionConfigured ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
                         : 'bg-blue-600 text-white hover:bg-blue-700',
        )}
      >
        <RefreshCw size={15} className={matterScanning ? 'animate-spin' : ''} />
        {matterScanning ? 'Scanning\u2026' : 'Scan Network'}
      </button>

      {!commissionConfigured && (
        <p className="text-xs text-amber-700 bg-amber-50 border border-amber-100 rounded-lg px-3 py-2">
          Matter commissioning is not available. Check listener logs for details.
        </p>
      )}

      {matterDiscoveredData?.cachedAt && (
        <p className="text-xs text-gray-400">
          Last scan: {formatDistanceToNow(new Date(matterDiscoveredData.cachedAt), { addSuffix: true })}
        </p>
      )}

      {matterScanMutation.isError && (
        <div className="bg-red-50 border border-red-200 text-red-700 rounded-lg px-3 py-2 text-xs">
          Scan failed: {matterScanMutation.error?.message}
        </div>
      )}

      {matterDiscoveredData?.warning && (
        <div className="bg-amber-50 border border-amber-200 text-amber-700 rounded-lg px-3 py-2 text-xs">
          {matterDiscoveredData.warning}
        </div>
      )}

      {matterDiscoveredLoading && (
        <div className="flex justify-center py-8 text-gray-400 gap-2 text-sm">
          <Loader size={16} className="animate-spin" /> Loading...
        </div>
      )}

      {/* Discovered device list */}
      {unpaired.length > 0 && (
        <div>
          <div className="flex items-center justify-between mb-1.5">
            <span className="text-xs text-gray-400">{unpaired.length} commissionable</span>
          </div>
          <div className="divide-y divide-gray-100 border border-gray-100 rounded-lg">
            {unpaired.map((device) => {
              const status = matterPairingStatus[device.id];
              const isPairing = status?.state === 'loading';
              const isSuccess = status?.state === 'success';
              const isError = status?.state === 'error';
              return (
                <div key={device.id} className="px-3 py-2.5 space-y-1.5">
                  <div className="flex items-center gap-2">
                    {isPairing
                      ? <Loader size={14} className="text-blue-400 animate-spin flex-shrink-0" />
                      : isSuccess
                        ? <CheckCircle size={14} className="text-green-500 flex-shrink-0" />
                        : <Circle size={14} className="text-gray-300 flex-shrink-0" />}
                    <div className="flex-1 min-w-0">
                      <div className="font-medium text-gray-900 text-xs truncate">
                        {device.deviceName ?? device.name}
                      </div>
                      <div className="text-[11px] text-gray-400 space-x-2">
                        {device.address && <span>{device.address}{device.port ? `:${device.port}` : ''}</span>}
                        {device.discriminator != null && <span>Disc: {device.discriminator}</span>}
                        {device.vendorId != null && <span>VID: {device.vendorId}</span>}
                      </div>
                    </div>
                  </div>
                  {!isSuccess && (
                    <div className="ml-6 space-y-1.5">
                      <input
                        type="text"
                        placeholder="Device name (e.g. Office Plug)"
                        value={matterForm[`name_${device.id}`] ?? ''}
                        onChange={(e) => setMatterForm((f) => ({ ...f, [`name_${device.id}`]: e.target.value }))}
                        disabled={isPairing}
                        className="w-full px-2 py-1 border border-gray-200 rounded text-xs focus:outline-none focus:ring-1 focus:ring-blue-400 disabled:opacity-50"
                      />
                      <div className="flex gap-1.5">
                        <input
                          type="text"
                          placeholder="Setup code from Apple Home"
                          value={matterForm[`code_${device.id}`] ?? ''}
                          onChange={(e) => setMatterForm((f) => ({ ...f, [`code_${device.id}`]: e.target.value }))}
                          disabled={isPairing}
                          className="flex-1 px-2 py-1 border border-gray-200 rounded text-xs focus:outline-none focus:ring-1 focus:ring-blue-400 disabled:opacity-50"
                        />
                        <button
                          onClick={() => handleMatterPairOne(device)}
                          disabled={isPairing}
                          className="text-[10px] px-2.5 py-1 rounded bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-40 disabled:cursor-not-allowed transition-colors whitespace-nowrap"
                        >
                          {isPairing ? 'Pairing\u2026' : 'Pair'}
                        </button>
                      </div>
                    </div>
                  )}
                  {isSuccess && (
                    <p className="ml-6 text-xs text-green-600">{status.message}</p>
                  )}
                  {isError && (
                    <div className="ml-6 bg-red-50 border border-red-100 rounded px-2 py-1">
                      <p className="text-xs text-red-700">{status.message}</p>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Empty state after scan */}
      {!matterDiscoveredLoading && matterDiscoveredData && matterDevices.length === 0 && (
        <div className="flex flex-col items-center justify-center py-4 text-gray-400 text-center">
          <Wifi size={20} className="mb-1.5 opacity-40" />
          <p className="text-xs font-medium">No commissionable devices found</p>
          <p className="text-[11px] mt-0.5">Put a device in pairing mode from Apple Home, then scan again.</p>
        </div>
      )}

      {/* Manual add fallback */}
      {matterFeedback && (
        <div
          className={clsx(
            'rounded-lg px-3 py-2 text-xs border',
            matterFeedback.type === 'success'
              ? 'bg-green-50 border-green-200 text-green-700'
              : 'bg-red-50 border-red-200 text-red-700',
          )}
        >
          {matterFeedback.message}
        </div>
      )}

      <button
        type="button"
        onClick={() => setMatterAdvancedOpen((open) => !open)}
        className="text-xs text-gray-500 hover:text-gray-700 underline underline-offset-2"
      >
        {matterAdvancedOpen ? 'Hide manual setup' : 'Add manually\u2026'}
      </button>

      {matterAdvancedOpen && (
        <form onSubmit={handleMatterSubmit} className="space-y-2 bg-gray-50 rounded-lg p-2.5">
          <p className="text-[11px] text-gray-400">
            Add a device without scanning. Use this if the scan doesn't find your device.
          </p>
          <input
            type="text"
            value={matterForm.name}
            onChange={(e) => setMatterForm((f) => ({ ...f, name: e.target.value }))}
            placeholder="Device name (e.g. Office Plug)"
            className="w-full text-xs border border-gray-200 rounded-lg px-2.5 py-1.5 focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
          <div className="inline-flex items-center gap-1 rounded-lg bg-white p-1 border border-gray-200">
            <button
              type="button"
              onClick={() => { setMatterMode('commission'); setMatterFeedback(null); }}
              className={clsx(
                'px-2.5 py-1 text-xs rounded transition-colors',
                matterMode === 'commission' ? 'bg-blue-50 text-blue-700 shadow-sm' : 'text-gray-500 hover:text-gray-700',
              )}
            >
              Setup code
            </button>
            <button
              type="button"
              onClick={() => { setMatterMode('import'); setMatterFeedback(null); }}
              className={clsx(
                'px-2.5 py-1 text-xs rounded transition-colors',
                matterMode === 'import' ? 'bg-blue-50 text-blue-700 shadow-sm' : 'text-gray-500 hover:text-gray-700',
              )}
            >
              Import by Node ID
            </button>
          </div>
          {matterMode === 'commission' ? (
            <input
              type="text"
              value={matterForm.setupCode}
              onChange={(e) => setMatterForm((f) => ({ ...f, setupCode: e.target.value }))}
              placeholder="Setup code from Apple Home"
              className="w-full text-xs border border-gray-200 rounded-lg px-2.5 py-1.5 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          ) : (
            <input
              type="text"
              value={matterForm.nodeId}
              onChange={(e) => setMatterForm((f) => ({ ...f, nodeId: e.target.value }))}
              placeholder="Node ID"
              className="w-full text-xs border border-gray-200 rounded-lg px-2.5 py-1.5 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          )}
          <div className="grid grid-cols-1 gap-2">
            <select
              value={matterForm.transport}
              onChange={(e) => setMatterForm((f) => ({ ...f, transport: e.target.value }))}
              className="text-xs border border-gray-200 rounded-lg px-2.5 py-1.5 focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
            >
              <option value="ip">Transport: IP</option>
              <option value="thread">Transport: Thread</option>
            </select>
            <input
              type="text"
              value={matterForm.address}
              onChange={(e) => setMatterForm((f) => ({ ...f, address: e.target.value }))}
              placeholder="Address (optional)"
              className="text-xs border border-gray-200 rounded-lg px-2.5 py-1.5 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            <input
              type="text"
              value={matterForm.port}
              onChange={(e) => setMatterForm((f) => ({ ...f, port: e.target.value }))}
              placeholder="Port (optional)"
              className="text-xs border border-gray-200 rounded-lg px-2.5 py-1.5 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <button
            type="submit"
            disabled={pairMatterMutation.isPending || (matterMode === 'commission' && !commissionConfigured)}
            className="w-full flex items-center justify-center gap-1.5 px-3 py-1.5 bg-blue-600 text-white text-xs font-medium rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {pairMatterMutation.isPending && <Loader size={12} className="animate-spin" />}
            {pairMatterMutation.isPending ? 'Adding\u2026' : 'Add Device'}
          </button>
        </form>
      )}

      <p className="text-[11px] text-gray-400 italic">
        Matter support is in early testing. Some devices or setups may not work as expected.
      </p>
    </div>
  );
}
