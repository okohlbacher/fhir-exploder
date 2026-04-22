/**
 * useCompletenessReport — wraps useSampleWalker<PerTypeCompletenessReport>,
 * supplies the completeness compute callback, pushes arithmetic-mean rollup
 * to QualityMetricsContext (Plan 05-01 locked rule). Worker-pool lives in
 * useSampleWalker<T> (QDDEP-03 / Plan 25-02).
 */
import { useEffect } from 'react';
import type { MedplumClient } from '@medplum/core';

import { sampleResources } from '../quality/sampling';
import { computeCompleteness, requiredElementPaths } from '../quality/completenessWalker';
import { getProfileForType } from '../quality/profiles';
import { useQualityMetrics as useQualityMetricsContext } from '../quality/QualityMetricsContext';
import type { PerTypeCompletenessReport, PerTypeReport } from '../quality/types';
import { useSampleWalker } from './useSampleWalker';

async function computeForCompleteness(
  client: MedplumClient,
  resourceType: string,
  sampleSize: number,
  patientIds?: string[],
): Promise<PerTypeCompletenessReport> {
  const profile = getProfileForType(resourceType);
  const requiredPaths = profile ? requiredElementPaths(profile) : [];
  const sample = await sampleResources(client, resourceType, sampleSize, patientIds);
  const { populated, total, perPath, perResource } = computeCompleteness(sample, requiredPaths);
  return { populated, total, perPath, perResource, sampleSize: sample.length, totalForType: null, profileUrl: profile?.url ?? null };
}

export function useCompletenessReport(
  client: MedplumClient | null,
  types: string[],
  sampleSize: number,
  patientIds?: string[],
): Record<string, PerTypeReport<PerTypeCompletenessReport>> {
  const { reports } = useSampleWalker<PerTypeCompletenessReport>({
    client, types, sampleSize, patientIds,
    compute: computeForCompleteness,
    metricNamespace: 'completeness',
  });
  // Rollup (05-01-SUMMARY): mean of per-type populated/total, suppressed while loading.
  const { setCompleteness } = useQualityMetricsContext();
  useEffect(() => {
    const values = Object.values(reports);
    const stillWaiting = values.length > 0 && values.some((r) => r === 'loading');
    const pcts: number[] = [];
    for (const r of values) {
      if (r === 'loading' || r === 'error' || !r || typeof r !== 'object') continue;
      if (r.total > 0) pcts.push((r.populated / r.total) * 100);
    }
    if (pcts.length === 0) { if (!stillWaiting) setCompleteness(undefined); return; }
    setCompleteness(Math.round(pcts.reduce((a, b) => a + b, 0) / pcts.length));
  }, [reports, setCompleteness]);
  return reports;
}
