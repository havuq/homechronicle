import { useQuery } from '@tanstack/react-query';

const BASE = '/api';

async function fetchJson(url) {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`API error ${res.status}`);
  return res.json();
}

function buildQueryString(params) {
  const qs = new URLSearchParams();
  for (const [key, val] of Object.entries(params)) {
    if (val !== undefined && val !== null && val !== '') {
      qs.set(key, String(val));
    }
  }
  return qs.toString();
}

export function useEvents(filters = {}, page = 1) {
  const qs = buildQueryString({ ...filters, page, limit: 50 });
  return useQuery({
    queryKey: ['events', filters, page],
    queryFn: () => fetchJson(`${BASE}/events?${qs}`),
    refetchInterval: page === 1 ? 10_000 : false,
    refetchIntervalInBackground: false,
  });
}

export function useAccessories() {
  return useQuery({
    queryKey: ['accessories'],
    queryFn: () => fetchJson(`${BASE}/accessories`),
    refetchInterval: 15_000,
    refetchIntervalInBackground: false,
  });
}

export function useHourlyStats() {
  return useQuery({
    queryKey: ['stats', 'hourly'],
    queryFn: () => fetchJson(`${BASE}/stats/hourly`),
    staleTime: 60_000,
    refetchInterval: 60_000,
  });
}

export function useDailyStats(days = 30) {
  return useQuery({
    queryKey: ['stats', 'daily', days],
    queryFn: () => fetchJson(`${BASE}/stats/daily?days=${days}`),
    staleTime: 60_000,
    refetchInterval: 60_000,
  });
}

export function useTopDevices() {
  return useQuery({
    queryKey: ['stats', 'top-devices'],
    queryFn: () => fetchJson(`${BASE}/stats/top-devices`),
    staleTime: 60_000,
    refetchInterval: 60_000,
  });
}

export function useRoomStats(days = 7) {
  return useQuery({
    queryKey: ['stats', 'rooms', days],
    queryFn: () => fetchJson(`${BASE}/stats/rooms?days=${days}`),
    staleTime: 60_000,
    refetchInterval: 60_000,
  });
}

export function useWeekdayStats() {
  return useQuery({
    queryKey: ['stats', 'weekday'],
    queryFn: () => fetchJson(`${BASE}/stats/weekday`),
    staleTime: 300_000,
    refetchInterval: 300_000,
  });
}

export function useHeatmap() {
  return useQuery({
    queryKey: ['stats', 'heatmap'],
    queryFn: () => fetchJson(`${BASE}/stats/heatmap`),
    staleTime: 60_000,
    refetchInterval: 60_000,
  });
}

export function useDevicePatterns() {
  return useQuery({
    queryKey: ['stats', 'device-patterns'],
    queryFn: () => fetchJson(`${BASE}/stats/device-patterns`),
    staleTime: 300_000,
    refetchInterval: 300_000,
  });
}
