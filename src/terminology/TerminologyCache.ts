import type { TerminologyCacheEntry } from './types';
import { LOCAL_STORAGE_PREFIX } from './terminologyKey';

/**
 * Bounded in-memory cap. Tuned to 10K per D-11 in 04-CONTEXT.md:
 * large enough to hold a realistic patient's distinct codes, small
 * enough to keep memory in a browser SPA well under 10 MB.
 */
const MEMORY_LIMIT = 10_000;

/**
 * Bounded localStorage mirror cap. Tuned to 2K per D-11: localStorage
 * serialization is synchronous and typically capped at 5-10 MB per
 * origin, so we keep the mirror well under that ceiling.
 */
const LOCAL_STORAGE_LIMIT = 2_000;

export interface TerminologyCacheOptions {
  serverUrl: string;
  /** Default true. Set false to skip the localStorage mirror (tests, SSR). */
  persistToLocalStorage?: boolean;
}

/**
 * Bounded LRU cache with localStorage mirror for resolved terminology
 * display values. Keys are server-URL namespaced (see terminologyKey.ts)
 * so a settings.yaml URL swap hydrates only the current server's entries.
 *
 * Public API: get, set, clear, size.
 */
export class TerminologyCache {
  private memory = new Map<string, TerminologyCacheEntry>();
  private readonly serverUrl: string;
  private readonly persist: boolean;

  constructor(opts: TerminologyCacheOptions) {
    this.serverUrl = opts.serverUrl;
    this.persist = opts.persistToLocalStorage !== false;
    this.hydrateFromLocalStorage();
  }

  /**
   * Returns the entry if present, and re-inserts it at the "most recently
   * used" end of the Map so LRU eviction targets truly cold entries.
   */
  get(key: string): TerminologyCacheEntry | undefined {
    const entry = this.memory.get(key);
    if (!entry) return undefined;
    this.memory.delete(key);
    this.memory.set(key, entry);
    return entry;
  }

  /**
   * Stores entry in memory and mirrors to localStorage. Evicts the
   * oldest memory entry when MEMORY_LIMIT is exceeded. localStorage
   * mirror is trimmed by oldest resolvedAt when LOCAL_STORAGE_LIMIT
   * is exceeded.
   */
  set(key: string, entry: TerminologyCacheEntry): void {
    if (this.memory.has(key)) this.memory.delete(key);
    this.memory.set(key, entry);
    if (this.memory.size > MEMORY_LIMIT) {
      const oldestKey = this.memory.keys().next().value;
      if (oldestKey !== undefined) this.memory.delete(oldestKey);
    }
    this.writeLocalStorage(key, entry);
  }

  /**
   * Atomic wipe used by the Settings "Clear" button (Plan 05): empties
   * the in-memory Map AND removes every localStorage key beginning with
   * LOCAL_STORAGE_PREFIX, across all server namespaces. Matches D-06.
   */
  clear(): void {
    this.memory.clear();
    if (!this.persist || typeof localStorage === 'undefined') return;
    const toRemove: string[] = [];
    for (let i = 0; i < localStorage.length; i++) {
      const k = localStorage.key(i);
      if (k && k.startsWith(LOCAL_STORAGE_PREFIX)) toRemove.push(k);
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
   * On construction, rehydrates only entries matching the current server
   * namespace (`tx-cache:v1:{serverUrl}|...`). Corrupt JSON rows are
   * skipped silently rather than crashing instantiation.
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
        const entry = JSON.parse(raw) as TerminologyCacheEntry;
        this.memory.set(cacheKey, entry);
      } catch {
        /* corrupt entry — ignore */
      }
    }
  }

  private writeLocalStorage(key: string, entry: TerminologyCacheEntry): void {
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
        const entry = raw ? (JSON.parse(raw) as TerminologyCacheEntry) : null;
        return { k, ts: entry?.resolvedAt ?? 0 };
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
