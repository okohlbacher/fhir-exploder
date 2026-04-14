/**
 * In-memory cache for $expand results from a terminology server.
 *
 * Caches value set expansions as Sets of "system|code" strings for fast
 * membership checks during conformance validation. Coalesces concurrent
 * requests for the same valueSet URL to avoid duplicate HTTP calls.
 *
 * Threat mitigations:
 * - T-16-01: Validates expansion.contains structure before caching
 * - T-16-02: Caps cached sets at MAX_CACHE_ENTRIES to prevent memory exhaustion
 */
import type { MedplumClient } from '@medplum/core';

const MAX_CACHE_ENTRIES = 50000; // T-16-02: cap to prevent memory exhaustion

export class ValueSetCache {
  private cache = new Map<string, Set<string>>(); // valueSetUrl -> Set<"system|code">
  private inflight = new Map<string, Promise<Set<string> | null>>();
  private available = true; // flips to false on first $expand failure

  isAvailable(): boolean {
    return this.available;
  }

  async expand(
    client: MedplumClient,
    valueSetUrl: string,
  ): Promise<Set<string> | null> {
    // Return cached result
    const cached = this.cache.get(valueSetUrl);
    if (cached) return cached;
    // Coalesce concurrent requests
    const running = this.inflight.get(valueSetUrl);
    if (running) return running;
    // Don't retry after a failure in this session
    if (!this.available) return null;

    const p = this._fetchExpand(client, valueSetUrl);
    this.inflight.set(valueSetUrl, p);
    try {
      return await p;
    } finally {
      this.inflight.delete(valueSetUrl);
    }
  }

  private async _fetchExpand(
    client: MedplumClient,
    valueSetUrl: string,
  ): Promise<Set<string> | null> {
    try {
      const result = await client.get(
        `ValueSet/$expand?url=${encodeURIComponent(valueSetUrl)}&count=10000`,
      );
      // T-16-01: Validate $expand payload structure before caching
      const contains = result?.expansion?.contains;
      if (!Array.isArray(contains)) return null;
      const codes = new Set<string>();
      for (const c of contains) {
        if (typeof c?.system === 'string' && typeof c?.code === 'string') {
          if (codes.size >= MAX_CACHE_ENTRIES) break; // T-16-02 cap
          codes.add(`${c.system}|${c.code}`);
        }
      }
      this.cache.set(valueSetUrl, codes);
      return codes;
    } catch {
      this.available = false; // terminology server unavailable
      return null;
    }
  }
}
