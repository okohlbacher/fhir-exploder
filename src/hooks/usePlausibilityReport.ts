/**
 * usePlausibilityReport -- batch temporal plausibility runner for Phase 16.
 *
 * State machine: idle -> running -> complete | cancelled | error
 *
 * Samples resources, gets profile for temporal field discovery, then runs
 * checkTemporalPlausibility on each resource with batch iteration and
 * cancellation support (T-16-09 mitigation).
 */
import { useCallback, useEffect, useRef, useState } from 'react';
import type { MedplumClient } from '@medplum/core';
import type { Resource } from '@medplum/fhirtypes';
import type { AppSettings } from '../config/types';
import type { NormalizedIssue } from '../quality/types';
import { sampleResources } from '../quality/sampling';
import { getProfileForType } from '../quality/profiles';
import {
  checkTemporalPlausibility,
  normalizeTemporalIssues,
} from '../quality/temporalPlausibilityWalker';

export type PlausibilityRunStatus =
  | 'idle'
  | 'running'
  | 'complete'
  | 'cancelled'
  | 'error';

export interface PlausibilityRunState {
  status: PlausibilityRunStatus;
  progress: { current: number; total: number };
  issues: NormalizedIssue[];
  errorMessage?: string;
  start: () => void;
  cancel: () => void;
}

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
  const [status, setStatus] = useState<PlausibilityRunStatus>('idle');
  const [progress, setProgress] = useState<{ current: number; total: number }>({
    current: 0,
    total: 0,
  });
  const [issues, setIssues] = useState<NormalizedIssue[]>([]);
  const [errorMessage, setErrorMessage] = useState<string | undefined>(undefined);
  const cancelledRef = useRef(false);

  const start = useCallback(() => {
    if (!client || !resourceType) return;

    cancelledRef.current = false;
    setStatus('running');
    setIssues([]);
    setProgress({ current: 0, total: 0 });
    setErrorMessage(undefined);

    void (async () => {
      try {
        const sample: Resource[] = await sampleResources(client, resourceType, sampleSize, patientIds);
        if (cancelledRef.current) {
          setStatus('cancelled');
          return;
        }
        setProgress({ current: 0, total: sample.length });

        const profile = getProfileForType(resourceType);
        const thresholds = settings?.plausibility;

        for (let i = 0; i < sample.length; i += BATCH_SIZE) {
          if (cancelledRef.current) {
            setStatus('cancelled');
            return;
          }
          const batch = sample.slice(i, i + BATCH_SIZE);
          const batchIssues: NormalizedIssue[] = [];

          for (const r of batch) {
            const temporalIssues = checkTemporalPlausibility(r, profile, thresholds);
            const normalized = normalizeTemporalIssues(temporalIssues, r);
            batchIssues.push(...normalized);
          }

          setIssues((prev) => [...prev, ...batchIssues]);
          setProgress({
            current: Math.min(i + batch.length, sample.length),
            total: sample.length,
          });

          if (cancelledRef.current) {
            setStatus('cancelled');
            return;
          }
        }

        if (!cancelledRef.current) {
          setStatus('complete');
        }
      } catch (err) {
        setStatus('error');
        setErrorMessage(err instanceof Error ? err.message : String(err));
      }
    })();
  }, [client, resourceType, sampleSize, settings, patientIds]);

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
    errorMessage,
    start,
    cancel,
  };
}
