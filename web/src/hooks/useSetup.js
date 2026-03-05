import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useAccessories } from './useEvents.js';
import { fetchJson } from '../lib/api.js';

// ---------------------------------------------------------------------------
// PIN vault — persists entered PINs in localStorage so they survive refresh
// ---------------------------------------------------------------------------
function loadSavedPins() {
  try { return JSON.parse(localStorage.getItem('hc_pins') ?? '{}'); }
  catch { return {}; }
}

export function useSetup() {
  const queryClient = useQueryClient();

  // PIN vault (localStorage-backed)
  const [savedPins, setSavedPins] = useState(loadSavedPins);

  // Room inputs (shared between MyDevicesTab + BridgeChildrenRow)
  const [roomInputs, setRoomInputs] = useState({});

  // ── Queries ──────────────────────────────────────────────────────────────

  const { data: discoveredData, isLoading: discoveredLoading } = useQuery({
    queryKey: ['setup', 'discovered'],
    queryFn: () => fetchJson('/api/setup/discovered'),
    refetchInterval: false,
    staleTime: Infinity,
  });

  const { data: savedRooms = {} } = useQuery({
    queryKey: ['setup', 'rooms'],
    queryFn: () => fetchJson('/api/setup/rooms'),
  });

  const { data: retentionConfig } = useQuery({
    queryKey: ['setup', 'retention'],
    queryFn: () => fetchJson('/api/setup/retention'),
  });

  const { data: logLevelConfig } = useQuery({
    queryKey: ['setup', 'log-level'],
    queryFn: () => fetchJson('/api/setup/log-level'),
  });

  const {
    data: matterRuntime = null,
    isError: matterRuntimeError,
    error: matterRuntimeErrorValue,
    refetch: refetchMatterRuntime,
  } = useQuery({
    queryKey: ['setup', 'matter', 'runtime'],
    queryFn: () => fetchJson('/api/setup/matter/runtime'),
    retry: false,
    refetchInterval: 30_000,
  });

  const { data: matterDiscoveredData, isLoading: matterDiscoveredLoading } = useQuery({
    queryKey: ['setup', 'matter', 'discovered'],
    queryFn: () => fetchJson('/api/setup/matter/discovered'),
    refetchInterval: false,
    staleTime: Infinity,
  });

  const {
    data: matterPairings = [],
    isError: matterPairingsError,
    error: matterPairingsErrorValue,
    refetch: refetchMatterPairings,
  } = useQuery({
    queryKey: ['setup', 'matter', 'pairings'],
    queryFn: () => fetchJson('/api/setup/matter/pairings'),
    retry: false,
    refetchInterval: 15_000,
  });

  const { data: dbAccessories = [] } = useAccessories();

  // ── Derived state ────────────────────────────────────────────────────────

  const accessories = discoveredData?.accessories ?? [];
  const paired = accessories.filter((a) => a.alreadyPaired);
  const commissionConfigured = Boolean(matterRuntime?.commissionConfigured);
  const pollingConfigured = Boolean(matterRuntime?.pollingConfigured);
  const missingMatterConfig = Array.isArray(matterRuntime?.missingConfig)
    ? matterRuntime.missingConfig
    : [];

  // ── Mutations ────────────────────────────────────────────────────────────

  const scanMutation = useMutation({
    mutationFn: () => fetchJson('/api/setup/scan', { method: 'POST' }),
    onSuccess: (data) => {
      queryClient.setQueryData(['setup', 'discovered'], data);
    },
  });

  const deletePairingMutation = useMutation({
    mutationFn: (deviceId) =>
      fetchJson(`/api/setup/pairing/${encodeURIComponent(deviceId)}`, { method: 'DELETE' }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['setup', 'discovered'] });
      queryClient.invalidateQueries({ queryKey: ['accessories'] });
      scanMutation.mutate();
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

  const saveRetentionMutation = useMutation({
    mutationFn: (settingsPatch) =>
      fetchJson('/api/setup/retention', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(settingsPatch),
      }),
    onSuccess: (next) => {
      queryClient.setQueryData(['setup', 'retention'], next);
    },
  });

  const saveLogLevelMutation = useMutation({
    mutationFn: (level) =>
      fetchJson('/api/setup/log-level', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ level }),
      }),
    onSuccess: (next) => {
      queryClient.setQueryData(['setup', 'log-level'], next);
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
      queryClient.invalidateQueries({ queryKey: ['accessories'] });
      queryClient.invalidateQueries({ queryKey: ['events'] });
    },
  });

  const matterScanMutation = useMutation({
    mutationFn: () => fetchJson('/api/setup/matter/scan', { method: 'POST' }),
    onSuccess: (data) => {
      queryClient.setQueryData(['setup', 'matter', 'discovered'], data);
    },
  });

  const pairMatterMutation = useMutation({
    mutationFn: (payload) => fetchJson('/api/setup/matter/pair', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['setup', 'matter', 'pairings'] });
      queryClient.invalidateQueries({ queryKey: ['setup', 'matter', 'runtime'] });
      queryClient.invalidateQueries({ queryKey: ['setup', 'matter', 'discovered'] });
      queryClient.invalidateQueries({ queryKey: ['accessories'] });
    },
  });

  const deleteMatterPairingMutation = useMutation({
    mutationFn: (nodeId) => fetchJson(`/api/setup/matter/pairing/${encodeURIComponent(nodeId)}`, {
      method: 'DELETE',
    }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['setup', 'matter', 'pairings'] });
      queryClient.invalidateQueries({ queryKey: ['setup', 'matter', 'runtime'] });
      queryClient.invalidateQueries({ queryKey: ['accessories'] });
    },
  });

  // ── PIN helpers ──────────────────────────────────────────────────────────

  function savePin(id, pin) {
    const next = { ...savedPins, [id]: pin };
    setSavedPins(next);
    localStorage.setItem('hc_pins', JSON.stringify(next));
  }

  function resolvePin(id) {
    return savedPins[id]?.trim() || '';
  }

  // ── Room helpers ─────────────────────────────────────────────────────────

  function handleRoomBlur(deviceId) {
    const roomName = roomInputs[deviceId] ?? '';
    saveRoomMutation.mutate({ accessoryId: deviceId, roomName });
  }

  function handleApplyBridgeRoom(bridgeId, childIds) {
    const bridgeRoom = roomInputs[bridgeId]?.trim() ?? savedRooms[bridgeId]?.trim() ?? '';
    if (!bridgeRoom || !childIds.length) return;
    setRoomInputs((prev) => {
      const next = { ...prev };
      childIds.forEach((id) => { next[id] = bridgeRoom; });
      return next;
    });
    childIds.forEach((id) => saveRoomMutation.mutate({ accessoryId: id, roomName: bridgeRoom }));
  }

  // ── Pairing helpers ──────────────────────────────────────────────────────

  async function pairOne(deviceId, pin, setPairingStatus) {
    setPairingStatus((s) => ({ ...s, [deviceId]: { state: 'loading', message: 'Pairing\u2026' } }));
    try {
      const result = await fetchJson('/api/setup/pair', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ deviceId, pin }),
      });
      savePin(deviceId, pin);
      setPairingStatus((s) => ({
        ...s, [deviceId]: { state: 'success', message: `Paired \u2014 now logging ${result.name}` },
      }));
      return { ok: true, name: result.name };
    } catch (err) {
      setPairingStatus((s) => ({
        ...s, [deviceId]: { state: 'error', message: err.message },
      }));
      return { ok: false, error: err.message };
    }
  }

  async function pairSelectedIds(ids, resolvedPinFn, setPairingStatus, setBulkProgress) {
    if (!ids.length) return;
    setBulkProgress({ total: ids.length, done: 0, results: [] });
    for (let i = 0; i < ids.length; i++) {
      const id = ids[i];
      const pin = resolvedPinFn(id);
      if (!pin) {
        setPairingStatus((s) => ({
          ...s, [id]: { state: 'error', message: 'No PIN \u2014 enter a PIN above or set one for this device' },
        }));
        setBulkProgress((p) => ({ ...p, done: i + 1, results: [...p.results, { id, ok: false }] }));
        continue;
      }
      const result = await pairOne(id, pin, setPairingStatus);
      setBulkProgress((p) => ({ ...p, done: i + 1, results: [...p.results, { id, ...result }] }));
    }
    queryClient.invalidateQueries({ queryKey: ['setup', 'pairings'] });
    queryClient.invalidateQueries({ queryKey: ['setup', 'discovered'] });
  }

  return {
    // Queries
    discoveredData,
    discoveredLoading,
    savedRooms,
    retentionConfig,
    logLevelConfig,
    matterRuntime,
    matterRuntimeError,
    matterRuntimeErrorValue,
    refetchMatterRuntime,
    matterDiscoveredData,
    matterDiscoveredLoading,
    matterPairings,
    matterPairingsError,
    matterPairingsErrorValue,
    refetchMatterPairings,
    dbAccessories,

    // Derived
    accessories,
    paired,
    commissionConfigured,
    pollingConfigured,
    missingMatterConfig,

    // Mutations
    scanMutation,
    matterScanMutation,
    deletePairingMutation,
    saveRoomMutation,
    saveRetentionMutation,
    saveLogLevelMutation,
    deleteAccessoryMutation,
    pairMatterMutation,
    deleteMatterPairingMutation,

    // PIN vault
    savedPins,
    savePin,
    resolvePin,

    // Room editing
    roomInputs,
    setRoomInputs,
    handleRoomBlur,
    handleApplyBridgeRoom,

    // Pairing
    pairOne,
    pairSelectedIds,
  };
}
