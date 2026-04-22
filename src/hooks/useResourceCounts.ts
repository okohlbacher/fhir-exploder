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
 *
 * Phase 23 Plan 05 (CLOSE-06 Bug A): Optional `patientIds` parameter scopes
 *   the per-type count via `patient=Patient/{id}` (non-Patient types) or
 *   `_id={id}` (Patient type) mirroring `src/quality/sampling.ts:26-66`. For
 *   cohorts larger than SHORT_QUERY_THRESHOLD (40) the request is sent as a
 *   POST `<Type>/_search` with a form-urlencoded body so the URL cannot
 *   exceed the server's URL-length ceiling (~8KB Jetty/Blaze; threat
 *   T-23-05-02). The cache key includes a sorted `patientIdsKey` fingerprint
 *   so scoped counts never collide with unscoped entries (threat T-23-05-03).
 */
import { useState, useEffect, useMemo } from 'react';
import type { MedplumClient } from '@medplum/core';
import type { Bundle, Resource, ResourceType } from '@medplum/fhirtypes';

/** Maximum number of concurrent count requests to avoid overloading the server */
const CONCURRENCY = 4;

/**
 * URL-length safety threshold mirroring `src/quality/sampling.ts` (Pitfall 2
 * / threat T-23-05-02). >40 patient IDs are sent via POST _search instead
 * of a GET query string.
 */
const SHORT_QUERY_THRESHOLD = 40;

type CountValue = number | 'loading' | 'error';

// Module-scope — lives for the tab's lifetime per D-01 (session-scoped, no TTL).
// Key format `${serverUrl}::${resourceType}[::pid:${patientIdsKey}]` — the
// optional `::pid:` suffix is the sorted-join of patientIds (threat T-23-05-03).
// Never automatically refreshed; cleared only by clearQualityCountCache /
// clearAllQualityCountCache (wired in Plan 24-03 to SettingsPage + setSettings).
const countCache = new Map<string, number>();

function cacheKey(serverUrl: string, type: string, patientIdsKey: string): string {
  return `${serverUrl}::${type}${patientIdsKey ? `::pid:${patientIdsKey}` : ''}`;
}

/**
 * Per-server wipe. Removes only entries keyed `${serverUrl}::*`; leaves
 * entries for other serverUrls intact. Used by `SettingsContext.setSettings`
 * (Plan 24-03) to invalidate only the current server's counts. The
 * `${serverUrl}::` prefix matches BOTH scoped (`::pid:...`) and unscoped
 * entries for the given server.
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
  /**
   * Phase 23 Plan 05 (CLOSE-06 Bug A): optional patient-id scope. When
   * non-empty, per-type counts issue a scoped FHIR search
   * (`patient=Patient/{id}` or `_id={id}` for the Patient type) so
   * OverviewStrip tiles reflect the active cohort. Cache is keyed on the
   * sorted join so scoped counts do not pollute unscoped cache entries.
   * An empty array is treated as "no scope" (Pitfall 8 defensive handling
   * — same shape as `sampleResources` in `src/quality/sampling.ts`).
   */
  patientIds?: string[],
): Record<string, CountValue> {
  const [counts, setCounts] = useState<Record<string, CountValue>>({});

  // R12 absorption: stabilize the join key so effect deps don't thrash on
  // render-identity-different-but-equal `resourceTypes` arrays.
  const typesKey = useMemo(() => resourceTypes.join(','), [resourceTypes]);

  // Stable, sorted patientIds fingerprint for cache-key + effect-dep use.
  // Mirrors `useCompletenessReport.ts:50-54`.
  const patientIdsKey = useMemo(
    () =>
      patientIds && patientIds.length > 0 ? patientIds.slice().sort().join(',') : '',
    [patientIds],
  );

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
      const hit = countCache.get(cacheKey(serverUrl, t, patientIdsKey));
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

        fetchCount(client!, type, patientIds)
          .then((count) => {
            // Pitfall 4 write-through guard: cancellation invalidates BOTH
            // the state write AND the cache write. The guard MUST come
            // before `countCache.set` — otherwise a cancelled fetch could
            // pollute the cache with a value the current effect has aborted.
            if (cancelled) return;
            countCache.set(cacheKey(serverUrl, type, patientIdsKey), count);
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
  }, [client, typesKey, refetchKey, patientIdsKey]);

  return counts;
}

async function fetchCount(
  client: MedplumClient,
  resourceType: string,
  patientIds?: string[],
): Promise<number> {
  const hasCohort = patientIds && patientIds.length > 0;
  if (!hasCohort) {
    const bundle = await client.search(resourceType as ResourceType, '_summary=count');
    return bundle.total ?? 0;
  }

  // Scoped count — mirror `sampleResources` shape (sampling.ts:39-50) so
  // the Patient type uses `_id=` (Pitfall 4 — `patient=` is not a valid
  // search parameter on Patient) and non-Patient types use `patient=`.
  const isPatientType = resourceType === 'Patient';
  const scopeParam = isPatientType ? '_id' : 'patient';
  const scopeValue = isPatientType
    ? patientIds!.join(',')
    : patientIds!.map((id) => `Patient/${id}`).join(',');

  if (patientIds!.length <= SHORT_QUERY_THRESHOLD) {
    const bundle = await client.search(resourceType as ResourceType, {
      _summary: 'count',
      [scopeParam]: scopeValue,
    });
    return bundle.total ?? 0;
  }

  // Large cohort: POST _search with form-urlencoded body (threat T-23-05-02).
  const body = new URLSearchParams({
    _summary: 'count',
    [scopeParam]: scopeValue,
  }).toString();
  const bundle = (await client.post(
    client.fhirUrl(resourceType, '_search').toString(),
    body,
    'application/x-www-form-urlencoded',
  )) as Bundle<Resource>;
  return bundle.total ?? 0;
}
