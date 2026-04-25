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
import { useCompletenessRollup } from '../quality/metrics';
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
  // Plan 35-04 (UAT-FU-05): also publishes a per-type byType map for the
  // QualityByTypeMatrix card. byType keys are FHIR resource types; values are
  // rounded populated/total*100. Already-mapped pattern (RESEARCH §Pattern 2).
  const { set: setCompleteness, setByType: setCompletenessByType } = useCompletenessRollup();
  useEffect(() => {
    const values = Object.values(reports);
    const stillWaiting = values.length > 0 && values.some((r) => r === 'loading');
    const pcts: number[] = [];
    const byType: Record<string, number> = {};
    for (const [type, r] of Object.entries(reports)) {
      if (r === 'loading' || r === 'error' || !r || typeof r !== 'object') continue;
      if (r.total > 0) {
        const pct = (r.populated / r.total) * 100;
        pcts.push(pct);
        byType[type] = Math.round(pct);
      }
    }
    setCompletenessByType(byType);
    if (pcts.length === 0) { if (!stillWaiting) setCompleteness(undefined); return; }
    setCompleteness(Math.round(pcts.reduce((a, b) => a + b, 0) / pcts.length));
  }, [reports, setCompleteness, setCompletenessByType]);
  return reports;
}
