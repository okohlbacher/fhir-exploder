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
import { useEffect, useMemo, useRef, useState } from 'react';
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
): Record<string, PerTypeReport<PerTypeCoverageReport>> {
  const [debouncedSize] = useDebouncedValue(sampleSize, DEBOUNCE_MS);
  const [reports, setReports] = useState<
    Record<string, PerTypeReport<PerTypeCoverageReport>>
  >({});
  const cancelledRef = useRef(false);
  const typesKey = useMemo(() => types.join(','), [types]);

  useEffect(() => {
    cancelledRef.current = false;
    if (!client || types.length === 0) {
      setReports({});
      return;
    }
    const serverUrl = client.getBaseUrl();
    const cache = getCache(serverUrl);

    // Seed: hydrate cache hits synchronously, mark the rest as 'loading'.
    const initial: Record<string, PerTypeReport<PerTypeCoverageReport>> = {};
    for (const t of types) {
      const hit = cache.get<PerTypeCoverageReport>(
        buildMetricsKey(serverUrl, t, debouncedSize, 'coverage'),
      );
      initial[t] = hit ? hit.value : 'loading';
    }
    setReports(initial);

    const queue = types.filter((t) => initial[t] === 'loading');
    let active = 0;

    function next() {
      if (cancelledRef.current) return;
      while (active < CONCURRENCY && queue.length > 0) {
        const t = queue.shift()!;
        active++;
        sampleResources(client!, t, debouncedSize)
          .then((sample) => {
            if (cancelledRef.current) return;
            const report = aggregateCoverage(sample);
            cache.set(
              buildMetricsKey(serverUrl, t, debouncedSize, 'coverage'),
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
            if (cancelledRef.current) return;
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
      cancelledRef.current = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [client, typesKey, debouncedSize]);

  // Rollup side-effect: arithmetic mean of per-type coverage percentages
  // (systemCode/totalCodedFields*100), excluding loading, errored, and
  // totalCodedFields===0 types. Rule locked in 05-01-SUMMARY; mirrors
  // setCompleteness shape from Plan 05-03.
  const { setCoverage } = useQualityMetricsContext();
  useEffect(() => {
    const pcts: number[] = [];
    for (const r of Object.values(reports)) {
      if (r === 'loading' || r === 'error') continue;
      if (!r || typeof r !== 'object') continue;
      if (r.totalCodedFields > 0) {
        pcts.push((r.systemCode / r.totalCodedFields) * 100);
      }
    }
    if (pcts.length === 0) {
      setCoverage(undefined);
      return;
    }
    const avg = pcts.reduce((a, b) => a + b, 0) / pcts.length;
    setCoverage(Math.round(avg));
  }, [reports, setCoverage]);

  return reports;
}
