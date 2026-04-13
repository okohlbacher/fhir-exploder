/**
 * useCompletenessReport — progressive, concurrency-limited, cache-backed
 * per-type completeness sampler for Plan 05-03.
 *
 * Mirrors the `useResourceCounts` worker-pool shape:
 *   - CONCURRENCY = 4 simultaneous sampling operations
 *   - cancelledRef pattern for unmount / dep-change abort
 *   - Promise-chained with .finally → next() recursion for throughput
 *
 * Additions layered on top:
 *   - Sample-size debounce at the HOOK level (500ms) so rapid slider
 *     changes do not trigger N samples per keystroke (T-05-03-02).
 *   - QualityMetricsCache hit path per (serverUrl, type, sampleSize)
 *     so tab-switching or drill-down navigation does not re-sample.
 *   - Rollup wire-up: whenever `reports` settles, compute the arithmetic
 *     mean of per-type percentages (excluding loading/errored/total===0)
 *     and push it into QualityMetricsContext via setCompleteness — this
 *     is how OverviewStrip Card 3 flips from em-dash to a real value.
 *     Rule locked in 05-01-SUMMARY.
 */
import { useEffect, useMemo, useState } from 'react';
import { useDebouncedValue } from '@mantine/hooks';
import type { MedplumClient } from '@medplum/core';

import { sampleResources } from '../quality/sampling';
import { computeCompleteness, requiredElementPaths } from '../quality/completenessWalker';
import { getProfileForType } from '../quality/profiles';
import { QualityMetricsCache } from '../quality/metricsCache';
import { buildMetricsKey } from '../quality/keys';
import { useQualityMetrics as useQualityMetricsContext } from '../quality/QualityMetricsContext';
import type { PerTypeCompletenessReport, PerTypeReport } from '../quality/types';

const CONCURRENCY = 4;
const DEBOUNCE_MS = 500;

// Module-scoped cache, one per server URL. Plan 04's coverage hook should
// follow the same pattern (separate cache instance) — keyed by metric in
// buildMetricsKey so 'completeness' and 'coverage' entries never collide.
//
// Known limitation: switching server URLs discards the previous server's cache.
// A Map<string, QualityMetricsCache> would preserve both, but adds memory pressure
// for a use case (multi-server switching) that is rare in local-first usage.
let cacheInstance: QualityMetricsCache | null = null;
let cacheServerUrl: string | null = null;
function getCache(serverUrl: string): QualityMetricsCache {
  if (!cacheInstance || cacheServerUrl !== serverUrl) {
    cacheInstance = new QualityMetricsCache({ serverUrl });
    cacheServerUrl = serverUrl;
  }
  return cacheInstance;
}

export function useCompletenessReport(
  client: MedplumClient | null,
  types: string[],
  sampleSize: number,
): Record<string, PerTypeReport<PerTypeCompletenessReport>> {
  const [debouncedSize] = useDebouncedValue(sampleSize, DEBOUNCE_MS);
  const [reports, setReports] = useState<
    Record<string, PerTypeReport<PerTypeCompletenessReport>>
  >({});
  const typesKey = useMemo(() => types.join(','), [types]);

  useEffect(() => {
    // Per-effect local cancellation flag. A shared ref would allow a
    // stale in-flight promise from a prior effect run to commit after
    // this effect re-sets the ref to false. Closure-scoped `cancelled`
    // isolates cancellation to the in-flight work of THIS effect.
    let cancelled = false;
    if (!client || types.length === 0) {
      setReports({});
      return;
    }
    const serverUrl = client.getBaseUrl();
    const cache = getCache(serverUrl);

    // Seed: hydrate cache hits synchronously, mark the rest as 'loading'.
    const initial: Record<string, PerTypeReport<PerTypeCompletenessReport>> = {};
    for (const t of types) {
      const hit = cache.get<PerTypeCompletenessReport>(
        buildMetricsKey(serverUrl, t, debouncedSize, 'completeness'),
      );
      initial[t] = hit ? hit.value : 'loading';
    }
    setReports(initial);

    const queue = types.filter((t) => initial[t] === 'loading');
    let active = 0;

    function next() {
      // Early return: effect cleanup set cancelled=true, abort remaining pages
      if (cancelled) return;
      while (active < CONCURRENCY && queue.length > 0) {
        const t = queue.shift()!;
        active++;
        computeForType(client!, t, debouncedSize)
          .then((report) => {
            if (cancelled) return;
            cache.set(buildMetricsKey(serverUrl, t, debouncedSize, 'completeness'), {
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
  }, [client, typesKey, debouncedSize]);

  // Rollup side-effect: arithmetic mean of settled per-type percentages.
  // See 05-01-SUMMARY for the locked rule. Undefined if nothing settled.
  const { setCompleteness } = useQualityMetricsContext();
  useEffect(() => {
    const values = Object.values(reports);
    // Suppress rollup updates while we are still waiting for the first
    // settlement of at least one type — otherwise the OverviewStrip card
    // flickers em-dash → value → em-dash on rapid dep changes.
    const stillWaiting =
      values.length > 0 && values.some((r) => r === 'loading');
    const pcts: number[] = [];
    for (const r of values) {
      if (r === 'loading' || r === 'error') continue;
      if (!r || typeof r !== 'object') continue;
      if (r.total > 0) pcts.push((r.populated / r.total) * 100);
    }
    if (pcts.length === 0) {
      if (!stillWaiting) setCompleteness(undefined);
      return;
    }
    const avg = pcts.reduce((a, b) => a + b, 0) / pcts.length;
    setCompleteness(Math.round(avg));
  }, [reports, setCompleteness]);

  return reports;
}

async function computeForType(
  client: MedplumClient,
  resourceType: string,
  sampleSize: number,
): Promise<PerTypeCompletenessReport> {
  const profile = getProfileForType(resourceType);
  const requiredPaths = profile ? requiredElementPaths(profile) : [];
  const sample = await sampleResources(client, resourceType, sampleSize);
  const { populated, total, perPath, perResource } = computeCompleteness(sample, requiredPaths);
  return {
    populated,
    total,
    perPath,
    perResource,
    sampleSize: sample.length,
    totalForType: null, // joined by useResourceCounts elsewhere; left unjoined here
    profileUrl: profile?.url ?? null,
  };
}
