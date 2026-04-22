/**
 * useSampleWalker — shared per-type sampling orchestration for Quality metrics.
 *
 * Extracts the worker-pool + seeding + recursion loop from `useCompletenessReport`
 * and `useCodingCoverage`. Generic over `T` (the per-type report payload).
 *
 * Design position (Phase 25 CONTEXT D-12 re-interpretation, per RESEARCH.md
 * Focus Area 3 + Open Question 1):
 *   This hook is a SIBLING primitive to the single-run async hook introduced
 *   in Phase 24 FOUND-04, NOT a wrapper over it. The single-run primitive
 *   manages one lifecycle; this walker manages N concurrent runs
 *   (CONCURRENCY=4 worker pool per resource type). Literal wrapping would
 *   either (a) force a single-run model onto N-run orchestration, or
 *   (b) call the single-run hook inside a `.map(type => ...)` loop, which
 *   would violate the Rules of Hooks. Per the re-interpretation recorded in
 *   the plan's <interfaces> block, D-12's "wraps" is read as "reuses the
 *   cancellation invariant" only.
 *
 * Cancellation invariant (load-bearing):
 *   Each effect invocation owns a fresh `let cancelled = false;` in its own
 *   closure. Cleanup flips it to true. NO `cancelledRef`. Stale promise
 *   resolutions from a prior effect run short-circuit against their own
 *   (now-stale) closure's flag, never against a shared ref. See the Phase 24
 *   FOUND-04 SUMMARY for the pattern's rationale.
 *
 * Cache integration:
 *   Uses `getQualityMetricsCache(serverUrl)` (Phase 24 Plan 03) for per-server
 *   LRU persistence. Keys follow `buildMetricsKey(serverUrl, type, size, ns)`
 *   with an optional `|pid:<sorted-joined-ids>` suffix when `patientIds` is
 *   non-empty (per Phase 23 Plan 05 Bug B pattern).
 */
import { useEffect, useMemo, useState } from 'react';
import { useDebouncedValue } from '@mantine/hooks';
import type { MedplumClient } from '@medplum/core';

import { getQualityMetricsCache } from '../quality/metricsCache';
import { buildMetricsKey, type QualityMetricKind } from '../quality/keys';
import type { PerTypeReport } from '../quality/types';

const CONCURRENCY = 4;
const DEBOUNCE_MS = 500;

export interface UseSampleWalkerArgs<T> {
  client: MedplumClient | null;
  types: string[];
  sampleSize: number;
  patientIds?: string[];
  compute: (
    client: MedplumClient,
    resourceType: string,
    sampleSize: number,
    patientIds?: string[],
  ) => Promise<T>;
  /** Cache namespace — routed to `buildMetricsKey`'s `metric` parameter. */
  metricNamespace: Extract<QualityMetricKind, 'completeness' | 'coverage'>;
}

export interface UseSampleWalkerResult<T> {
  reports: Record<string, PerTypeReport<T>>;
}

export function useSampleWalker<T>(
  args: UseSampleWalkerArgs<T>,
): UseSampleWalkerResult<T> {
  const { client, types, sampleSize, patientIds, compute, metricNamespace } = args;

  const [debouncedSize] = useDebouncedValue(sampleSize, DEBOUNCE_MS);
  const [reports, setReports] = useState<Record<string, PerTypeReport<T>>>({});

  // Memoize primitive keys so the deps array is stable when callers pass
  // fresh array references each render (Phase 23-05 Bug B pattern).
  const typesKey = useMemo(() => types.join(','), [types]);
  const patientIdsKey = useMemo(
    () => (patientIds ? patientIds.slice().sort().join(',') : ''),
    [patientIds],
  );

  useEffect(() => {
    // Closure-scoped cancellation — NOT cancelledRef (see file header).
    let cancelled = false;
    if (!client || types.length === 0) {
      setReports({});
      return;
    }
    const serverUrl = client.getBaseUrl();
    const cache = getQualityMetricsCache(serverUrl);

    const keyFor = (t: string): string =>
      buildMetricsKey(serverUrl, t, debouncedSize, metricNamespace) +
      (patientIdsKey ? `|pid:${patientIdsKey}` : '');

    // Seed: hydrate cache hits synchronously, mark the rest as 'loading'.
    const initial: Record<string, PerTypeReport<T>> = {};
    for (const t of types) {
      const hit = cache.get<T>(keyFor(t));
      initial[t] = hit ? hit.value : 'loading';
    }
    setReports(initial);

    const queue = types.filter((t) => initial[t] === 'loading');
    let active = 0;

    function next(): void {
      if (cancelled) return;
      while (active < CONCURRENCY && queue.length > 0) {
        const t = queue.shift()!;
        active++;
        compute(client!, t, debouncedSize, patientIds)
          .then((report) => {
            if (cancelled) return;
            // Cache write happens BEFORE dispatch so a parallel consumer
            // reading via the cache sees the value no later than the React
            // state update observes it.
            cache.set<T>(keyFor(t), {
              value: report,
              computedAt: Date.now(),
              serverUrl,
              resourceType: t,
              sampleSize: debouncedSize,
            });
            setReports((p) => ({ ...p, [t]: report }));
          })
          .catch(() => {
            if (cancelled) return;
            setReports((p) => ({ ...p, [t]: 'error' }));
          })
          .finally(() => {
            active--;
            next();
          });
      }
    }
    next();

    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [client, typesKey, debouncedSize, patientIdsKey, metricNamespace]);

  return { reports };
}
