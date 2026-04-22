/**
 * useLabRangesReport -- batch lab range validation runner for Phase 16.
 *
 * Phase 24 (FOUND-03): wraps the shared `useAsyncRun<NormalizedIssue>`
 * primitive. Cancellation, status, progress, and issue accumulation all
 * delegate to the central reducer in `internal/asyncRunReducer.ts`. The
 * pre-refactor cancellation-flag-in-ref anti-pattern has been removed
 * (PITFALLS §Pitfall 2). The `summary` accessory state stays in a local `useState`
 * per D-09 (CONTEXT.md) — fixed reducer shape would otherwise force `as`
 * casts in consumer panels (PITFALLS §Pitfall 1).
 *
 * Phase 23 gap-closure (CLOSE-06 Bug B): autoStart: true + memoized
 * patientIdsKey so a cohort change re-fires the runner. Previously the
 * runner only fired on imperative start() — stale unscoped results persisted
 * when patientIds changed. See 23-HUMAN-UAT.md root_cause.
 */
import { useMemo, useState } from 'react';
import type { MedplumClient } from '@medplum/core';
import type { AppSettings } from '../config/types';
import type { NormalizedIssue } from '../quality/types';
import { sampleResources } from '../quality/sampling';
import {
  checkLabRanges,
  normalizeLabRangeIssues,
  type LabRangeSummary,
} from '../quality/labRangeChecker';
import { useAsyncRun, type UseAsyncRunResult } from './useAsyncRun';
import type { AsyncRunStatus } from './internal/asyncRunReducer';

export type LabRangesRunStatus = AsyncRunStatus;
export interface LabRangesRunState extends UseAsyncRunResult<NormalizedIssue> {
  summary: LabRangeSummary | null;
}

interface UseLabRangesReportArgs {
  client: MedplumClient | null;
  sampleSize: number;
  settings: AppSettings | null;
  patientIds?: string[];
}

export function useLabRangesReport({
  client,
  sampleSize,
  settings,
  patientIds,
}: UseLabRangesReportArgs): LabRangesRunState {
  const [summary, setSummary] = useState<LabRangeSummary | null>(null);

  // Phase 23 gap-closure (CLOSE-06 Bug B): memoize patientIds into a stable
  // sorted-join key (PITFALLS §Pitfall 7 / threat T-23-05-05).
  const patientIdsKey = useMemo(
    () =>
      patientIds && patientIds.length > 0 ? patientIds.slice().sort().join(',') : '',
    [patientIds],
  );

  const run = useAsyncRun<NormalizedIssue>({
    runner: async ({ isCancelled, setProgress, appendIssues }) => {
      // D-09 / Open Question 2: reset accessory state at the top of each run.
      setSummary(null);
      if (!client) return;
      setProgress(0, 1);
      const observations = await sampleResources(client, 'Observation', sampleSize, patientIds);
      if (isCancelled()) return;
      setProgress(0, observations.length);
      const configRanges = settings?.referenceRanges ?? {};
      const result = checkLabRanges(observations, configRanges);
      if (isCancelled()) return;
      const normalized = normalizeLabRangeIssues(result.issues);
      appendIssues(normalized);
      setSummary(result.summary);
      setProgress(observations.length, observations.length);
    },
    deps: [client, sampleSize, settings, patientIdsKey],
    autoStart: true,
  });

  return { ...run, summary };
}
