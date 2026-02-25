import { useEffect, useMemo, useState } from 'react';

const STORAGE_KEY = 'hc_theme_preference';

function getStorage() {
  if (typeof window === 'undefined') return null;
  const storage = window.localStorage;
  if (!storage || typeof storage.getItem !== 'function' || typeof storage.setItem !== 'function') {
    return null;
  }
  return storage;
}

function getStoredPreference() {
  const storage = getStorage();
  if (!storage) return 'system';
  let value = null;
  try {
    value = storage.getItem(STORAGE_KEY);
  } catch {
    return 'system';
  }
  return value === 'light' || value === 'dark' || value === 'system' ? value : 'system';
}

function getResolvedTheme(preference) {
  if (preference !== 'system') return preference;
  if (typeof window === 'undefined') return 'light';
  if (typeof window.matchMedia !== 'function') return 'light';
  return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
}

function applyTheme(theme) {
  const root = document.documentElement;
  root.dataset.theme = theme;
  root.classList.toggle('theme-dark', theme === 'dark');
  root.classList.toggle('theme-light', theme === 'light');
  root.style.colorScheme = theme;
}

export function useTheme() {
  const [preference, setPreference] = useState(getStoredPreference);

  const resolvedTheme = useMemo(
    () => getResolvedTheme(preference),
    [preference]
  );

  useEffect(() => {
    applyTheme(resolvedTheme);
  }, [resolvedTheme]);

  useEffect(() => {
    const storage = getStorage();
    if (!storage) return;
    try {
      storage.setItem(STORAGE_KEY, preference);
    } catch {
      // Ignore write failures (private mode, blocked storage, test env stubs).
    }
  }, [preference]);

  useEffect(() => {
    if (typeof window === 'undefined' || preference !== 'system') return;
    if (typeof window.matchMedia !== 'function') return;
    const media = window.matchMedia('(prefers-color-scheme: dark)');
    const listener = () => applyTheme(media.matches ? 'dark' : 'light');
    media.addEventListener('change', listener);
    return () => media.removeEventListener('change', listener);
  }, [preference]);

  return { preference, setPreference };
}
