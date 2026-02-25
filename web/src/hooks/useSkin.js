import { useEffect, useState } from 'react';

const STORAGE_KEY = 'hc_ui_skin';
const VALID_SKINS = new Set(['ocean', 'graphite', 'sunrise']);

function getStorage() {
  if (typeof window === 'undefined') return null;
  const storage = window.localStorage;
  if (!storage || typeof storage.getItem !== 'function' || typeof storage.setItem !== 'function') {
    return null;
  }
  return storage;
}

function getStoredSkin() {
  const storage = getStorage();
  if (!storage) return 'ocean';
  let value = null;
  try {
    value = storage.getItem(STORAGE_KEY);
  } catch {
    return 'ocean';
  }
  return VALID_SKINS.has(value) ? value : 'ocean';
}

function applySkin(skin) {
  document.documentElement.dataset.skin = skin;
}

export function useSkin() {
  const [skin, setSkin] = useState(getStoredSkin);

  useEffect(() => {
    applySkin(skin);
  }, [skin]);

  useEffect(() => {
    const storage = getStorage();
    if (!storage) return;
    try {
      storage.setItem(STORAGE_KEY, skin);
    } catch {
      // Ignore write failures (private mode, blocked storage, test env stubs).
    }
  }, [skin]);

  return { skin, setSkin };
}
