import { useEffect, useState } from 'react';

const DEFAULT_ACCENT = [37, 99, 235]; // blue-600 fallback

function readAccent() {
  if (typeof document === 'undefined') return DEFAULT_ACCENT;
  const raw = getComputedStyle(document.documentElement)
    .getPropertyValue('--hc-accent-rgb')
    .trim();
  if (!raw) return DEFAULT_ACCENT;
  const parts = raw.split(',').map((s) => Number.parseInt(s.trim(), 10));
  return parts.length === 3 && parts.every(Number.isFinite) ? parts : DEFAULT_ACCENT;
}

export function useAccentRgb() {
  const [rgb, setRgb] = useState(readAccent);

  useEffect(() => {
    const el = document.documentElement;
    const observer = new MutationObserver(() => {
      setRgb(readAccent());
    });
    observer.observe(el, { attributes: true, attributeFilter: ['data-skin', 'class'] });
    // Read once on mount in case the skin changed before the observer attached.
    setRgb(readAccent());
    return () => observer.disconnect();
  }, []);

  return rgb;
}
