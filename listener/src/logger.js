/**
 * logger.js — thin level-aware wrapper around console.
 *
 * Levels (from quietest to noisiest):
 *   error  → only errors
 *   warn   → errors + warnings
 *   info   → errors + warnings + operational info  (default)
 *   debug  → everything, including [event-skip] noise
 *
 * The level can be changed at runtime via setLevel() — no restart needed.
 */

const LEVELS = { error: 0, warn: 1, info: 2, debug: 3 };

let current = LEVELS[
  (process.env.LOG_LEVEL ?? 'info').toLowerCase()
] ?? LEVELS.info;

export function getLevel() {
  return Object.keys(LEVELS).find((k) => LEVELS[k] === current) ?? 'info';
}

export function setLevel(name) {
  const lvl = LEVELS[String(name).toLowerCase()];
  if (lvl === undefined) throw new Error(`Invalid log level: ${name}`);
  current = lvl;
}

export const log = {
  error(...args) { if (current >= LEVELS.error) console.error(...args); },
  warn(...args)  { if (current >= LEVELS.warn)  console.warn(...args); },
  info(...args)  { if (current >= LEVELS.info)   console.log(...args); },
  debug(...args) { if (current >= LEVELS.debug)  console.log(...args); },
};
