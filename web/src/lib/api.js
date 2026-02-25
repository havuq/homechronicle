const API_TOKEN = (import.meta.env.VITE_API_TOKEN ?? '').trim();

export function withApiAuthHeaders(headers = {}) {
  if (!API_TOKEN) return headers;
  return {
    ...headers,
    'x-api-token': API_TOKEN,
  };
}

export async function fetchJson(url, options = {}) {
  const response = await fetch(url, {
    ...options,
    headers: withApiAuthHeaders(options.headers ?? {}),
  });

  const data = await response.json().catch(() => null);
  if (!response.ok) throw new Error(data?.error ?? `HTTP ${response.status}`);
  return data;
}
