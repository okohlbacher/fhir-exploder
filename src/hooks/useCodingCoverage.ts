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
import { useQualityMetrics as useQualityMetricsContext } from '../quality/QualityMetricsContext';
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
  const { setCoverage } = useQualityMetricsContext();
  useEffect(() => {
    const values = Object.values(reports);
    const stillWaiting = values.length > 0 && values.some((r) => r === 'loading');
    const pcts: number[] = [];
    for (const r of values) {
      if (r === 'loading' || r === 'error' || !r || typeof r !== 'object') continue;
      if (r.totalCodedFields > 0) pcts.push((r.systemCode / r.totalCodedFields) * 100);
    }
    if (pcts.length === 0) {
      if (!stillWaiting) setCoverage(undefined);
      return;
    }
    setCoverage(Math.round(pcts.reduce((a, b) => a + b, 0) / pcts.length));
  }, [reports, setCoverage]);

  return reports;
}
