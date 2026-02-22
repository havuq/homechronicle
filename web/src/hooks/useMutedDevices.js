import { useState, useCallback } from 'react';

const STORAGE_KEY = 'hc_muted';

function loadMuted() {
  try {
    return new Set(JSON.parse(localStorage.getItem(STORAGE_KEY) ?? '[]'));
  } catch {
    return new Set();
  }
}

export function useMutedDevices() {
  const [muted, setMuted] = useState(loadMuted);

  const mute = useCallback((name) => {
    setMuted((prev) => {
      const next = new Set(prev);
      next.add(name);
      localStorage.setItem(STORAGE_KEY, JSON.stringify([...next]));
      return next;
    });
  }, []);

  const unmute = useCallback((name) => {
    setMuted((prev) => {
      const next = new Set(prev);
      next.delete(name);
      localStorage.setItem(STORAGE_KEY, JSON.stringify([...next]));
      return next;
    });
  }, []);

  const unmuteAll = useCallback(() => {
    setMuted(new Set());
    localStorage.removeItem(STORAGE_KEY);
  }, []);

  return { muted, mute, unmute, unmuteAll };
}
