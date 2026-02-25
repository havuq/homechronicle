import { mkdir, readFile, rename, stat, writeFile } from 'fs/promises';
import { dirname } from 'path';

function clone(value) {
  return JSON.parse(JSON.stringify(value));
}

export class JsonObjectStore {
  constructor(filePath, defaultValue = {}) {
    this.filePath = filePath;
    this.defaultValue = clone(defaultValue);
    this.cache = clone(defaultValue);
    this.lastMtimeMs = 0;
  }

  async init() {
    await this.refresh();
  }

  getSnapshot() {
    return clone(this.cache);
  }

  getByKey(key) {
    return this.cache[key];
  }

  async refresh() {
    try {
      const meta = await stat(this.filePath);
      if (meta.mtimeMs <= this.lastMtimeMs) return this.getSnapshot();

      const raw = await readFile(this.filePath, 'utf8');
      const parsed = JSON.parse(raw);
      if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) {
        this.cache = parsed;
      } else {
        this.cache = clone(this.defaultValue);
      }
      this.lastMtimeMs = meta.mtimeMs;
      return this.getSnapshot();
    } catch {
      this.cache = clone(this.defaultValue);
      this.lastMtimeMs = 0;
      return this.getSnapshot();
    }
  }

  async write(nextValue) {
    const normalized = (nextValue && typeof nextValue === 'object' && !Array.isArray(nextValue))
      ? nextValue
      : clone(this.defaultValue);

    await mkdir(dirname(this.filePath), { recursive: true });
    const tempPath = `${this.filePath}.tmp-${process.pid}-${Date.now()}`;
    const serialized = JSON.stringify(normalized, null, 2);

    await writeFile(tempPath, serialized, 'utf8');
    await rename(tempPath, this.filePath);

    try {
      const meta = await stat(this.filePath);
      this.lastMtimeMs = meta.mtimeMs;
    } catch {
      this.lastMtimeMs = Date.now();
    }

    this.cache = clone(normalized);
    return this.getSnapshot();
  }
}
