/**
 * Bounded LRU cache with localStorage mirror for computed quality metrics.
 *
 * Mirrors the proven src/terminology/TerminologyCache.ts pattern exactly:
 * - In-memory Map with LRU semantics (get() re-inserts to move to MRU end)
 * - localStorage mirror namespaced by server URL
 * - Oldest-computedAt trim on overflow
 * - Corrupt JSON rows skipped silently during hydration
 *
 * Bounds are tighter than TerminologyCache because metrics entries are
 * heavier payloads (reports with perPath maps) than terminology display
 * strings: MEMORY_LIMIT=500, LOCAL_STORAGE_LIMIT=200.
 */
import type { QualityMetricsCacheEntry } from './types';
import { LOCAL_STORAGE_PREFIX } from './keys';

const MEMORY_LIMIT = 500;
const LOCAL_STORAGE_LIMIT = 200;

export interface QualityMetricsCacheOptions {
  serverUrl: string;
  /** Default true. Set false to skip the localStorage mirror (tests, SSR). */
  persistToLocalStorage?: boolean;
}

export class QualityMetricsCache {
  private memory = new Map<string, QualityMetricsCacheEntry>();
  private readonly serverUrl: string;
  private readonly persist: boolean;

  constructor(opts: QualityMetricsCacheOptions) {
    this.serverUrl = opts.serverUrl;
    this.persist = opts.persistToLocalStorage !== false;
    this.hydrateFromLocalStorage();
  }

  /**
   * Returns the entry if present, and re-inserts it at the MRU end of the
   * Map so LRU eviction targets truly cold entries.
   */
  get<T = unknown>(key: string): QualityMetricsCacheEntry<T> | undefined {
    const entry = this.memory.get(key);
    if (!entry) return undefined;
    this.memory.delete(key);
    this.memory.set(key, entry);
    return entry as QualityMetricsCacheEntry<T>;
  }

  /**
   * Stores entry in memory and mirrors to localStorage. Evicts the oldest
   * memory entry when MEMORY_LIMIT is exceeded. localStorage mirror is
   * trimmed by oldest computedAt when LOCAL_STORAGE_LIMIT is exceeded.
   */
  set<T = unknown>(key: string, entry: QualityMetricsCacheEntry<T>): void {
    if (this.memory.has(key)) this.memory.delete(key);
    this.memory.set(key, entry as QualityMetricsCacheEntry);
    if (this.memory.size > MEMORY_LIMIT) {
      const oldestKey = this.memory.keys().next().value;
      if (oldestKey !== undefined) this.memory.delete(oldestKey);
    }
    this.writeLocalStorage(key, entry as QualityMetricsCacheEntry);
  }

  /**
   * Wipes in-memory Map AND removes every localStorage key belonging to
   * THIS instance's server namespace. Other servers' cached metrics are
   * untouched — use `clearAllQualityMetrics()` for the cross-server wipe
   * that the Settings "Clear metrics cache" button performs.
   */
  clear(): void {
    this.memory.clear();
    if (!this.persist || typeof localStorage === 'undefined') return;
    const prefixForServer = `${LOCAL_STORAGE_PREFIX}${this.serverUrl}|`;
    const toRemove: string[] = [];
    for (let i = 0; i < localStorage.length; i++) {
      const k = localStorage.key(i);
      if (k && k.startsWith(prefixForServer)) toRemove.push(k);
    }
    for (const k of toRemove) {
      try {
        localStorage.removeItem(k);
      } catch {
        /* quota / private mode — swallow */
      }
    }
  }

  size(): number {
    return this.memory.size;
  }

  /**
   * Hydrates only entries matching the current server namespace. Corrupt
   * JSON rows are silently skipped rather than crashing instantiation.
   */
  private hydrateFromLocalStorage(): void {
    if (!this.persist || typeof localStorage === 'undefined') return;
    const prefixForServer = `${LOCAL_STORAGE_PREFIX}${this.serverUrl}|`;
    for (let i = 0; i < localStorage.length; i++) {
      const storageKey = localStorage.key(i);
      if (!storageKey || !storageKey.startsWith(prefixForServer)) continue;
      const cacheKey = storageKey.slice(LOCAL_STORAGE_PREFIX.length);
      try {
        const raw = localStorage.getItem(storageKey);
        if (!raw) continue;
        const entry = JSON.parse(raw) as QualityMetricsCacheEntry;
        this.memory.set(cacheKey, entry);
      } catch {
        /* corrupt entry — ignore */
      }
    }
  }

  private writeLocalStorage(key: string, entry: QualityMetricsCacheEntry): void {
    if (!this.persist || typeof localStorage === 'undefined') return;
    try {
      localStorage.setItem(`${LOCAL_STORAGE_PREFIX}${key}`, JSON.stringify(entry));
      this.enforceLocalStorageLimit();
    } catch {
      /* quota exceeded / private mode — swallow */
    }
  }

  private enforceLocalStorageLimit(): void {
    if (typeof localStorage === 'undefined') return;
    const keys: string[] = [];
    for (let i = 0; i < localStorage.length; i++) {
      const k = localStorage.key(i);
      if (k && k.startsWith(LOCAL_STORAGE_PREFIX)) keys.push(k);
    }
    if (keys.length <= LOCAL_STORAGE_LIMIT) return;
    const ranked = keys.map((k) => {
      try {
        const raw = localStorage.getItem(k);
        const entry = raw ? (JSON.parse(raw) as QualityMetricsCacheEntry) : null;
        return { k, ts: entry?.computedAt ?? 0 };
      } catch {
        return { k, ts: 0 };
      }
    });
    ranked.sort((a, b) => a.ts - b.ts);
    const toDrop = ranked.slice(0, ranked.length - LOCAL_STORAGE_LIMIT);
    for (const { k } of toDrop) {
      try {
        localStorage.removeItem(k);
      } catch {
        /* ignore */
      }
    }
  }
}

/**
 * Top-level helper wired to the Settings "Clear metrics cache" button.
 * Iterates localStorage, removes every key starting with
 * LOCAL_STORAGE_PREFIX, and returns the number removed.
 *
 * Unlike QualityMetricsCache#clear() which scopes its wipe to a single
 * server namespace, this is a cross-server localStorage wipe that works
 * even when no cache instance exists (e.g., called from Settings where no
 * metrics have been requested yet this session).
 */
export function clearAllQualityMetrics(): number {
  if (typeof localStorage === 'undefined') return 0;
  const toRemove: string[] = [];
  for (let i = 0; i < localStorage.length; i++) {
    const k = localStorage.key(i);
    if (k && k.startsWith(LOCAL_STORAGE_PREFIX)) toRemove.push(k);
  }
  let removed = 0;
  for (const k of toRemove) {
    try {
      localStorage.removeItem(k);
      removed++;
    } catch {
      /* ignore */
    }
  }
  return removed;
}
