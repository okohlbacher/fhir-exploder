/**
 * usePlausibilityReport -- batch temporal plausibility runner for Phase 16.
 *
 * Phase 24 (FOUND-03): wraps the shared `useAsyncRun<NormalizedIssue>`
 * primitive. Cancellation, status, progress, and issue accumulation all
 * delegate to the central reducer in `internal/asyncRunReducer.ts`. The
 * pre-refactor cancellation-flag-in-ref anti-pattern has been removed
 * (PITFALLS §Pitfall 2).
 *
 * Backward compatibility: the named exports (`PlausibilityRunStatus`,
 * `PlausibilityRunState`, `usePlausibilityReport`) and return-object shape
 * are byte-identical to the pre-refactor version, so consumer panels
 * (`PlausibilityPanel`) and existing tests require no edits.
 */
import type { MedplumClient } from '@medplum/core';
import type { AppSettings } from '../config/types';
import type { NormalizedIssue } from '../quality/types';
import { sampleResources } from '../quality/sampling';
import { getProfileForType } from '../quality/profiles';
import {
  checkTemporalPlausibility,
  normalizeTemporalIssues,
} from '../quality/temporalPlausibilityWalker';
import { useAsyncRun, type UseAsyncRunResult } from './useAsyncRun';
import type { AsyncRunStatus } from './internal/asyncRunReducer';

export type PlausibilityRunStatus = AsyncRunStatus;
export type PlausibilityRunState = UseAsyncRunResult<NormalizedIssue>;

interface UsePlausibilityReportArgs {
  client: MedplumClient | null;
  resourceType: string;
  sampleSize: number;
  settings: AppSettings | null;
  patientIds?: string[];
}

const BATCH_SIZE = 25;

export function usePlausibilityReport({
  client,
  resourceType,
  sampleSize,
  settings,
  patientIds,
}: UsePlausibilityReportArgs): PlausibilityRunState {
  return useAsyncRun<NormalizedIssue>({
    runner: async ({ isCancelled, setProgress, appendIssues }) => {
      if (!client || !resourceType) return;
      const sample = await sampleResources(client, resourceType, sampleSize, patientIds);
      if (isCancelled()) return;
      setProgress(0, sample.length);
      const profile = getProfileForType(resourceType);
      const thresholds = settings?.plausibility;
      for (let i = 0; i < sample.length; i += BATCH_SIZE) {
        if (isCancelled()) return;
        const batch = sample.slice(i, i + BATCH_SIZE);
        const issues: NormalizedIssue[] = [];
        for (const r of batch) {
          const temporal = checkTemporalPlausibility(r, profile, thresholds);
          issues.push(...normalizeTemporalIssues(temporal, r));
        }
        appendIssues(issues);
        setProgress(Math.min(i + batch.length, sample.length), sample.length);
      }
    },
    deps: [client, resourceType, sampleSize, settings, patientIds],
  });
}
