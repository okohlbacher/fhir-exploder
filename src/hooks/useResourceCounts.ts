/**
 * useResourceCounts — lazy-load per-type resource counts with a transparent
 * module-scope cross-mount cache.
 *
 * FOUND-01 (Phase 24): Cache read-through via `countCache` keyed on
 *   `${serverUrl}::${resourceType}` (double-colon separator per
 *   CONTEXT.md §specifics line 111). First mount on a given (serverUrl, type)
 *   pair issues a `_summary=count` request; subsequent mounts on the same
 *   pair within the tab's lifetime hit the cache and resolve synchronously.
 *   Cache is session-scoped with no TTL (D-01); cleared only by
 *   `clearQualityCountCache(serverUrl)` (per-server wipe) or
 *   `clearAllQualityCountCache()` (cross-server wipe), wired by Plan 24-03
 *   into `SettingsContext.setSettings()` and the Settings "Clear cache" button.
 *
 * FOUND-04 (Phase 24): Cancellation is closure-scoped `let cancelled = false`
 *   (NOT `useRef`). Each effect run gets its own flag; a stale in-flight
 *   promise from a prior effect cannot commit state or cache writes because
 *   its closure captured its own prior `cancelled` variable which the prior
 *   cleanup flipped to `true`. See `useCompletenessReport.ts:71-74` for the
 *   validated precedent and rationale.
 *
 * R12 (absorbed from Phase 27 scope while the file is already being touched):
 *   `resourceTypes.join(',')` is memoized into `typesKey` so effect deps are
 *   stable per deps-change rather than per render.
 *
 * Pitfall 4 (write-through guard): `if (cancelled) return` is placed BEFORE
 *   `countCache.set(...)` in the fetchCount success path so cancellation
 *   invalidates BOTH the state write AND the cache write. Error paths do
 *   NOT write to the cache.
 *
 * Pitfall 5 (settings-change race): a cache-clear coincident with an in-flight
 *   fetch may surface stale values for one refresh cycle. This is acceptable
 *   per D-02 staleness tolerance for a local tool; a future milestone may add
 *   per-fetch invalidation tokens if profiling shows it matters.
 */
import { useState, useEffect, useMemo } from 'react';
import type { MedplumClient } from '@medplum/core';
import type { ResourceType } from '@medplum/fhirtypes';

/** Maximum number of concurrent count requests to avoid overloading the server */
const CONCURRENCY = 4;

type CountValue = number | 'loading' | 'error';

// Module-scope — lives for the tab's lifetime per D-01 (session-scoped, no TTL).
// Key format `${serverUrl}::${resourceType}` per CONTEXT.md §specifics line 111.
// Never automatically refreshed; cleared only by clearQualityCountCache /
// clearAllQualityCountCache (wired in Plan 24-03 to SettingsPage + setSettings).
const countCache = new Map<string, number>();

function cacheKey(serverUrl: string, type: string): string {
  return `${serverUrl}::${type}`;
}

/**
 * Per-server wipe. Removes only entries keyed `${serverUrl}::*`; leaves
 * entries for other serverUrls intact. Used by `SettingsContext.setSettings`
 * (Plan 24-03) to invalidate only the current server's counts.
 */
export function clearQualityCountCache(serverUrl: string): void {
  const prefix = `${serverUrl}::`;
  for (const k of Array.from(countCache.keys())) {
    if (k.startsWith(prefix)) countCache.delete(k);
  }
}

/**
 * Cross-server wipe. Used by the Settings "Clear cache" button (Plan 24-03)
 * for parity with `clearAllQualityMetrics`.
 */
export function clearAllQualityCountCache(): void {
  countCache.clear();
}

/**
 * Lazy-load resource counts for a list of resource types.
 * Uses a concurrency limiter (max 4 simultaneous requests) and
 * Promise.allSettled semantics so one failure doesn't block others.
 *
 * Cache is transparent — consumer signature and return shape are unchanged.
 */
export function useResourceCounts(
  client: MedplumClient | null,
  resourceTypes: string[],
  /**
   * Optional token used to force re-fetch even when `resourceTypes` is
   * unchanged. Any caller can bump this to trigger the effect re-run
   * without relying on array-ordering tricks. Note: a refetchKey bump
   * re-runs the effect but does NOT clear the cache — users pressing
   * "Recompute" will see fresh counts on the current mount, but other
   * consumers reading the same (serverUrl, type) pair still hit cache.
   * To invalidate globally, call `clearQualityCountCache(serverUrl)`.
   */
  refetchKey: number = 0,
): Record<string, CountValue> {
  const [counts, setCounts] = useState<Record<string, CountValue>>({});

  // R12 absorption: stabilize the join key so effect deps don't thrash on
  // render-identity-different-but-equal `resourceTypes` arrays.
  const typesKey = useMemo(() => resourceTypes.join(','), [resourceTypes]);

  useEffect(() => {
    // FOUND-04: closure-scoped cancellation. Each effect run gets its own
    // `cancelled` variable. Stale in-flight promises from a prior effect run
    // captured their own prior `cancelled`, which the prior cleanup flipped
    // to true — they cannot write state or cache here.
    let cancelled = false;

    if (!client || resourceTypes.length === 0) {
      setCounts({});
      return;
    }

    const serverUrl = client.getBaseUrl();

    // Seed: cache hits resolve synchronously (no 'loading' flash); misses
    // start as 'loading' and are queued for fetch.
    const initial: Record<string, CountValue> = {};
    for (const t of resourceTypes) {
      const hit = countCache.get(cacheKey(serverUrl, t));
      initial[t] = hit !== undefined ? hit : 'loading';
    }
    setCounts(initial);

    // Only queue the cache misses.
    const queue = resourceTypes.filter((t) => initial[t] === 'loading');
    let activeCount = 0;

    function processNext() {
      if (cancelled) return;

      while (activeCount < CONCURRENCY && queue.length > 0) {
        const type = queue.shift()!;
        activeCount++;

        fetchCount(client!, type)
          .then((count) => {
            // Pitfall 4 write-through guard: cancellation invalidates BOTH
            // the state write AND the cache write. The guard MUST come
            // before `countCache.set` — otherwise a cancelled fetch could
            // pollute the cache with a value the current effect has aborted.
            if (cancelled) return;
            countCache.set(cacheKey(serverUrl, type), count);
            setCounts((prev) => ({ ...prev, [type]: count }));
          })
          .catch(() => {
            // Error path: do NOT write to cache. Only the state updates,
            // so remounts after a failure get a fresh fetch attempt.
            if (cancelled) return;
            setCounts((prev) => ({ ...prev, [type]: 'error' }));
          })
          .finally(() => {
            activeCount--;
            processNext();
          });
      }
    }

    processNext();

    return () => {
      cancelled = true;
    };
  }, [client, typesKey, refetchKey]);

  return counts;
}

async function fetchCount(client: MedplumClient, resourceType: string): Promise<number> {
  const bundle = await client.search(resourceType as ResourceType, '_summary=count');
  return bundle.total ?? 0;
}
