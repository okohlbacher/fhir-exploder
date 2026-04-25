/**
 * useCodingCoverage — wrapper around `useSampleWalker<PerTypeCoverageReport>`
 * that supplies the coverage-specific `compute` callback and pushes the
 * arithmetic-mean rollup into QualityMetricsContext (Plan 05-01 locked rule).
 * Worker-pool orchestration lives in `useSampleWalker<T>` (QDDEP-03 / Plan 25-02).
 */
import { useEffect } from 'react';
import type { MedplumClient } from '@medplum/core';

import { sampleResources } from '../quality/sampling';
import { aggregateCoverage } from '../quality/codingCoverageWalker';
import { useCoverageRollup } from '../quality/metrics';
import type { PerTypeCoverageReport, PerTypeReport } from '../quality/types';

import { useSampleWalker } from './useSampleWalker';

async function computeForCoverage(
  client: MedplumClient,
  resourceType: string,
  sampleSize: number,
  patientIds?: string[],
): Promise<PerTypeCoverageReport> {
  const sample = await sampleResources(client, resourceType, sampleSize, patientIds);
  return aggregateCoverage(sample);
}

export function useCodingCoverage(
  client: MedplumClient | null,
  types: string[],
  sampleSize: number,
  patientIds?: string[],
): Record<string, PerTypeReport<PerTypeCoverageReport>> {
  const { reports } = useSampleWalker<PerTypeCoverageReport>({
    client, types, sampleSize, patientIds,
    compute: computeForCoverage,
    metricNamespace: 'coverage',
  });

  // Rollup (05-01-SUMMARY): arithmetic mean of per-type systemCode/totalCodedFields
  // percentages, suppressed while any type is still loading.
  // Plan 35-04 (UAT-FU-05): also publishes a per-type byType map for the
  // QualityByTypeMatrix card. Already-mapped pattern (RESEARCH §Pattern 2).
  const { set: setCoverage, setByType: setCoverageByType } = useCoverageRollup();
  useEffect(() => {
    const values = Object.values(reports);
    const stillWaiting = values.length > 0 && values.some((r) => r === 'loading');
    const pcts: number[] = [];
    const byType: Record<string, number> = {};
    for (const [type, r] of Object.entries(reports)) {
      if (r === 'loading' || r === 'error' || !r || typeof r !== 'object') continue;
      if (r.totalCodedFields > 0) {
        const pct = (r.systemCode / r.totalCodedFields) * 100;
        pcts.push(pct);
        byType[type] = Math.round(pct);
      }
    }
    setCoverageByType(byType);
    if (pcts.length === 0) {
      if (!stillWaiting) setCoverage(undefined);
      return;
    }
    setCoverage(Math.round(pcts.reduce((a, b) => a + b, 0) / pcts.length));
  }, [reports, setCoverage, setCoverageByType]);

  return reports;
}
