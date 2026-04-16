/**
 * useLabRangesReport -- batch lab range validation runner for Phase 16.
 *
 * State machine: idle -> running -> complete | cancelled | error
 *
 * Samples Observation resources, runs checkLabRanges, and normalizes issues
 * (T-16-10 mitigation: bounded by sampleSize + cancellation support).
 */
import { useCallback, useEffect, useRef, useState } from 'react';
import type { MedplumClient } from '@medplum/core';
import type { AppSettings } from '../config/types';
import type { NormalizedIssue } from '../quality/types';
import { sampleResources } from '../quality/sampling';
import {
  checkLabRanges,
  normalizeLabRangeIssues,
  type LabRangeSummary,
} from '../quality/labRangeChecker';

export type LabRangesRunStatus =
  | 'idle'
  | 'running'
  | 'complete'
  | 'cancelled'
  | 'error';

export interface LabRangesRunState {
  status: LabRangesRunStatus;
  progress: { current: number; total: number };
  issues: NormalizedIssue[];
  summary: LabRangeSummary | null;
  errorMessage?: string;
  start: () => void;
  cancel: () => void;
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
  const [status, setStatus] = useState<LabRangesRunStatus>('idle');
  const [progress, setProgress] = useState<{ current: number; total: number }>({
    current: 0,
    total: 0,
  });
  const [issues, setIssues] = useState<NormalizedIssue[]>([]);
  const [summary, setSummary] = useState<LabRangeSummary | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | undefined>(undefined);
  const cancelledRef = useRef(false);

  const start = useCallback(() => {
    if (!client) return;

    cancelledRef.current = false;
    setStatus('running');
    setIssues([]);
    setSummary(null);
    setProgress({ current: 0, total: 0 });
    setErrorMessage(undefined);

    void (async () => {
      try {
        setProgress({ current: 0, total: 1 });

        const observations = await sampleResources(client, 'Observation', sampleSize, patientIds);
        if (cancelledRef.current) {
          setStatus('cancelled');
          return;
        }

        setProgress({ current: 0, total: observations.length });

        const configRanges = settings?.referenceRanges ?? {};
        const result = checkLabRanges(observations, configRanges);

        if (cancelledRef.current) {
          setStatus('cancelled');
          return;
        }

        const normalized = normalizeLabRangeIssues(result.issues);
        setIssues(normalized);
        setSummary(result.summary);
        setProgress({ current: observations.length, total: observations.length });

        if (!cancelledRef.current) {
          setStatus('complete');
        }
      } catch (err) {
        setStatus('error');
        setErrorMessage(err instanceof Error ? err.message : String(err));
      }
    })();
  }, [client, sampleSize, settings, patientIds]);

  const cancel = useCallback(() => {
    cancelledRef.current = true;
  }, []);

  useEffect(() => {
    return () => {
      cancelledRef.current = true;
    };
  }, []);

  return {
    status,
    progress,
    issues,
    summary,
    errorMessage,
    start,
    cancel,
  };
}
