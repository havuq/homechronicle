export const API_BASE = import.meta.env.DEV ? 'http://localhost:3001/api' : '/api';

const API_TOKEN = import.meta.env.DEV
  ? (import.meta.env.VITE_API_TOKEN ?? '').trim()
  : '';

export class ApiError extends Error {
  constructor(message, { status = null, statusText = '', url = '' } = {}) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.statusText = statusText;
    this.url = url;
  }
}

export function withApiAuthHeaders(headers = {}) {
  if (!API_TOKEN) return headers;
  return {
    ...headers,
    'x-api-token': API_TOKEN,
  };
}

function getGatewayHint(status) {
  if (status === 502) {
    return 'Bad Gateway: the web container could not get a valid response from the listener API. This usually means the listener is down, restarting, or LISTENER_HOST/LISTENER_PORT is incorrect.';
  }
  if (status === 503) {
    return 'Service Unavailable: the listener API is reachable but not ready yet.';
  }
  if (status === 504) {
    return 'Gateway Timeout: the listener API did not respond in time.';
  }
  return null;
}

export async function fetchJson(url, options = {}) {
  const response = await fetch(url, {
    ...options,
    headers: withApiAuthHeaders(options.headers ?? {}),
  });

  const raw = await response.text();
  let data = null;
  if (raw) {
    try {
      data = JSON.parse(raw);
    } catch {
      data = null;
    }
  }

  if (!response.ok) {
    const apiMessage = data?.error ?? data?.message ?? null;
    const statusLabel = response.statusText?.trim() || 'Request failed';
    const fallback = `HTTP ${response.status} (${statusLabel})`;
    const hint = getGatewayHint(response.status);
    const message = [apiMessage ?? fallback, hint].filter(Boolean).join(' ');
    throw new ApiError(message, {
      status: response.status,
      statusText: response.statusText ?? '',
      url,
    });
  }

  return data;
}
