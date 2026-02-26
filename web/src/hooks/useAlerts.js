import { useQuery } from '@tanstack/react-query';
import { fetchJson } from '../lib/api.js';

const BASE = '/api/alerts';

export function useAlertRules() {
  return useQuery({
    queryKey: ['alerts', 'rules'],
    queryFn: () => fetchJson(`${BASE}/rules`),
    refetchInterval: 15_000,
    refetchIntervalInBackground: false,
  });
}

export function useAlertDeliveries(page = 1, limit = 25) {
  return useQuery({
    queryKey: ['alerts', 'deliveries', page, limit],
    queryFn: () => fetchJson(`${BASE}/deliveries?page=${page}&limit=${limit}`),
    refetchInterval: 15_000,
    refetchIntervalInBackground: false,
  });
}

