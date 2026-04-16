/**
 * useCodingCoverage — progressive, concurrency-limited, cache-backed
 * per-type coding coverage sampler for Plan 05-04.
 *
 * Mirrors `useCompletenessReport` (Plan 05-03) exactly — same worker-pool
 * shape, same debounce semantics, same cache singleton pattern, same
 * rollup wire-up via QualityMetricsContext. The only differences are the
 * walker (aggregateCoverage from codingCoverageWalker) and the metric
 * key (`'coverage'` instead of `'completeness'`).
 *
 * Why a separate singleton from the completeness hook: each cache's LRU
 * eviction budget is bounded (MEMORY_LIMIT=500). `buildMetricsKey`
 * namespaces by metric so 'completeness' and 'coverage' entries never
 * collide — two instances give each hook its own budget, important when
 * a server has many resource types.
 */
import { useEffect, useMemo, useState } from 'react';
import { useDebouncedValue } from '@mantine/hooks';
import type { MedplumClient } from '@medplum/core';

import { sampleResources } from '../quality/sampling';
import { aggregateCoverage } from '../quality/codingCoverageWalker';
import { QualityMetricsCache } from '../quality/metricsCache';
import { buildMetricsKey } from '../quality/keys';
import { useQualityMetrics as useQualityMetricsContext } from '../quality/QualityMetricsContext';
import type { PerTypeCoverageReport, PerTypeReport } from '../quality/types';

const CONCURRENCY = 4;
const DEBOUNCE_MS = 500;

// Module-scoped cache, one per server URL. See 05-03-SUMMARY for the
// blessed pattern — separate instance from useCompletenessReport because
// the cache keys are already metric-namespaced, and separate instances
// give each hook its own LRU eviction budget.
let cacheInstance: QualityMetricsCache | null = null;
let cacheServerUrl: string | null = null;
function getCache(serverUrl: string): QualityMetricsCache {
  if (!cacheInstance || cacheServerUrl !== serverUrl) {
    cacheInstance = new QualityMetricsCache({ serverUrl });
    cacheServerUrl = serverUrl;
  }
  return cacheInstance;
}

export function useCodingCoverage(
  client: MedplumClient | null,
  types: string[],
  sampleSize: number,
  patientIds?: string[],
): Record<string, PerTypeReport<PerTypeCoverageReport>> {
  const [debouncedSize] = useDebouncedValue(sampleSize, DEBOUNCE_MS);
  const [reports, setReports] = useState<
    Record<string, PerTypeReport<PerTypeCoverageReport>>
  >({});
  const typesKey = useMemo(() => types.join(','), [types]);
  const patientIdsKey = useMemo(
    () => (patientIds ? patientIds.slice().sort().join(',') : ''),
    [patientIds],
  );

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
    // Include patientIdsKey in cache key so cohort changes invalidate.
    const initial: Record<string, PerTypeReport<PerTypeCoverageReport>> = {};
    for (const t of types) {
      const cacheKey = buildMetricsKey(serverUrl, t, debouncedSize, 'coverage') +
        (patientIdsKey ? `|pid:${patientIdsKey}` : '');
      const hit = cache.get<PerTypeCoverageReport>(cacheKey);
      initial[t] = hit ? hit.value : 'loading';
    }
    setReports(initial);

    const queue = types.filter((t) => initial[t] === 'loading');
    let active = 0;

    function next() {
      if (cancelled) return;
      while (active < CONCURRENCY && queue.length > 0) {
        const t = queue.shift()!;
        active++;
        sampleResources(client!, t, debouncedSize, patientIds)
          .then((sample) => {
            if (cancelled) return;
            const report = aggregateCoverage(sample);
            const cacheKey = buildMetricsKey(serverUrl, t, debouncedSize, 'coverage') +
              (patientIdsKey ? `|pid:${patientIdsKey}` : '');
            cache.set(
              cacheKey,
              {
                value: report,
                computedAt: Date.now(),
                serverUrl,
                resourceType: t,
                sampleSize: debouncedSize,
              },
            );
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
  }, [client, typesKey, debouncedSize, patientIdsKey]);

  // Rollup side-effect: arithmetic mean of per-type coverage percentages
  // (systemCode/totalCodedFields*100), excluding loading, errored, and
  // totalCodedFields===0 types. Rule locked in 05-01-SUMMARY; mirrors
  // setCompleteness shape from Plan 05-03.
  const { setCoverage } = useQualityMetricsContext();
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
      if (r.totalCodedFields > 0) {
        pcts.push((r.systemCode / r.totalCodedFields) * 100);
      }
    }
    if (pcts.length === 0) {
      if (!stillWaiting) setCoverage(undefined);
      return;
    }
    const avg = pcts.reduce((a, b) => a + b, 0) / pcts.length;
    setCoverage(Math.round(avg));
  }, [reports, setCoverage]);

  return reports;
}
