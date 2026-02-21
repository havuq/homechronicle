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
  });
}

export function useAccessories() {
  return useQuery({
    queryKey: ['accessories'],
    queryFn: () => fetchJson(`${BASE}/accessories`),
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

export function useDailyStats() {
  return useQuery({
    queryKey: ['stats', 'daily'],
    queryFn: () => fetchJson(`${BASE}/stats/daily`),
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
