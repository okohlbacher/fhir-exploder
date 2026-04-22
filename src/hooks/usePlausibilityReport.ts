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
 *
 * Phase 23 gap-closure (CLOSE-06 Bug B): autoStart: true + memoized
 * patientIdsKey so a cohort change re-fires the runner. Previously the
 * runner only fired on imperative start() — stale unscoped results persisted
 * when patientIds changed. See 23-HUMAN-UAT.md root_cause.
 */
import { useMemo } from 'react';
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
  // Phase 23 gap-closure (CLOSE-06 Bug B): memoize patientIds into a stable
  // sorted-join key so autoStart:true does not thrash on render-identity
  // changes (PITFALLS §Pitfall 7 / threat T-23-05-05).
  const patientIdsKey = useMemo(
    () =>
      patientIds && patientIds.length > 0 ? patientIds.slice().sort().join(',') : '',
    [patientIds],
  );

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
    deps: [client, resourceType, sampleSize, settings, patientIdsKey],
    autoStart: true,
  });
}
