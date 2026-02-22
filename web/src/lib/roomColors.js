/**
 * roomColors.js — deterministic, stable color assignments for room names.
 * The same room name always maps to the same color across all components.
 */

const PALETTE = [
  { bg: '#fce7f3', text: '#9d174d', dot: '#f472b6' }, // pink
  { bg: '#fef3c7', text: '#92400e', dot: '#f59e0b' }, // amber
  { bg: '#d1fae5', text: '#065f46', dot: '#34d399' }, // emerald
  { bg: '#dbeafe', text: '#1e40af', dot: '#60a5fa' }, // blue
  { bg: '#ede9fe', text: '#5b21b6', dot: '#a78bfa' }, // violet
  { bg: '#fee2e2', text: '#991b1b', dot: '#f87171' }, // red
  { bg: '#e0f2fe', text: '#075985', dot: '#38bdf8' }, // sky
  { bg: '#ecfdf5', text: '#064e3b', dot: '#6ee7b7' }, // teal
  { bg: '#fdf4ff', text: '#701a75', dot: '#e879f9' }, // fuchsia
  { bg: '#fff7ed', text: '#7c2d12', dot: '#fb923c' }, // orange
  { bg: '#f0fdf4', text: '#14532d', dot: '#86efac' }, // green
  { bg: '#f5f3ff', text: '#4c1d95', dot: '#8b5cf6' }, // purple
];

export function getRoomColor(roomName) {
  if (!roomName) return null;
  let hash = 0;
  for (let i = 0; i < roomName.length; i++) {
    hash = (hash * 31 + roomName.charCodeAt(i)) >>> 0;
  }
  return PALETTE[hash % PALETTE.length];
}
