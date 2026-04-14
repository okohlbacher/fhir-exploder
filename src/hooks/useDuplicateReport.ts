/**
 * useDuplicateReport -- DQ-07 + DQ-08 orchestrating hook for Phase 17.
 *
 * Runs two duplicate-detection checks against a cohort of resource types:
 *   1. Patient duplicate detection (exact name+DOB match, fast, sync)
 *   2. Content hash dedup per resource type (async, batched SHA-256)
 *
 * State machine (mirrors usePlausibilityReport):
 *   idle -> running -> complete | cancelled | error
 *
 * Per-batch progress is summed across Patient detection (counted as one
 * unit) plus the per-type sample sizes. Cancellation is cooperative via
 * cancelledRef, checked between every batch to keep the UI responsive.
 */
import { useCallback, useEffect, useRef, useState } from 'react';
import type { MedplumClient } from '@medplum/core';
import type { Resource } from '@medplum/fhirtypes';
import type { NormalizedIssue } from '../quality/types';
import { sampleResources } from '../quality/sampling';
import {
  findPatientDuplicates,
  normalizePatientDuplicateIssues,
  type PatientDuplicateCluster,
} from '../quality/patientDuplicateDetector';
import {
  findContentHashDuplicates,
  normalizeContentHashIssues,
  type ContentHashCluster,
} from '../quality/contentHasher';

export type DuplicateRunStatus =
  | 'idle'
  | 'running'
  | 'complete'
  | 'cancelled'
  | 'error';

export interface DuplicateRunState {
  status: DuplicateRunStatus;
  progress: { current: number; total: number };
  issues: NormalizedIssue[];
  duplicateClusters: PatientDuplicateCluster[];
  contentHashClusters: ContentHashCluster[];
  skippedPatients: number;
  errorMessage?: string;
  start: () => void;
  cancel: () => void;
}

interface UseDuplicateReportArgs {
  client: MedplumClient | null;
  types: string[];
  sampleSize: number;
}

export function useDuplicateReport({
  client,
  types,
  sampleSize,
}: UseDuplicateReportArgs): DuplicateRunState {
  const [status, setStatus] = useState<DuplicateRunStatus>('idle');
  const [progress, setProgress] = useState<{ current: number; total: number }>({
    current: 0,
    total: 0,
  });
  const [issues, setIssues] = useState<NormalizedIssue[]>([]);
  const [duplicateClusters, setDuplicateClusters] = useState<PatientDuplicateCluster[]>([]);
  const [contentHashClusters, setContentHashClusters] = useState<ContentHashCluster[]>([]);
  const [skippedPatients, setSkippedPatients] = useState(0);
  const [errorMessage, setErrorMessage] = useState<string | undefined>(undefined);
  const cancelledRef = useRef(false);

  const start = useCallback(() => {
    if (!client) return;

    cancelledRef.current = false;
    setStatus('running');
    setIssues([]);
    setDuplicateClusters([]);
    setContentHashClusters([]);
    setSkippedPatients(0);
    setProgress({ current: 0, total: 0 });
    setErrorMessage(undefined);

    void (async () => {
      try {
        // Step 1: Patient duplicate detection. We sample Patient regardless
        // of whether it was in `types` because patient matching is the
        // headline DQ-07 check and has its own fixed key (family|given|DOB).
        let patientSample: Resource[] = [];
        try {
          patientSample = await sampleResources(client, 'Patient', sampleSize);
        } catch {
          // Server may not have Patient resources -- proceed with empty sample.
          patientSample = [];
        }
        if (cancelledRef.current) {
          setStatus('cancelled');
          return;
        }

        // Pre-plan totals. Patient pass counts as patientSample.length units;
        // per-type content hash runs each count sampleSize units (estimated;
        // actual sample length may be smaller if the server has fewer rows).
        const perTypeSamples: Record<string, Resource[]> = {};
        for (const t of types) {
          if (cancelledRef.current) {
            setStatus('cancelled');
            return;
          }
          try {
            perTypeSamples[t] = await sampleResources(client, t, sampleSize);
          } catch {
            perTypeSamples[t] = [];
          }
        }
        if (cancelledRef.current) {
          setStatus('cancelled');
          return;
        }

        const totalUnits =
          patientSample.length +
          Object.values(perTypeSamples).reduce((sum, arr) => sum + arr.length, 0);
        setProgress({ current: 0, total: totalUnits });

        // Step 2: Patient duplicate detection (synchronous).
        const patResult = findPatientDuplicates(patientSample);
        const patIssues = normalizePatientDuplicateIssues(patResult.clusters);
        setDuplicateClusters(patResult.clusters);
        setSkippedPatients(patResult.skippedCount);
        setIssues((prev) => [...prev, ...patIssues]);

        let completedUnits = patientSample.length;
        setProgress({ current: completedUnits, total: totalUnits });

        if (cancelledRef.current) {
          setStatus('cancelled');
          return;
        }

        // Step 3: Content hash dedup per resource type.
        const allContentClusters: ContentHashCluster[] = [];
        for (const t of types) {
          if (cancelledRef.current) {
            setStatus('cancelled');
            return;
          }
          const sample = perTypeSamples[t] ?? [];
          const base = completedUnits;
          const clusters = await findContentHashDuplicates(sample, t, (current) => {
            setProgress({ current: base + current, total: totalUnits });
          });
          if (cancelledRef.current) {
            setStatus('cancelled');
            return;
          }
          allContentClusters.push(...clusters);
          setContentHashClusters((prev) => [...prev, ...clusters]);
          const batchIssues = normalizeContentHashIssues(clusters);
          if (batchIssues.length > 0) {
            setIssues((prev) => [...prev, ...batchIssues]);
          }
          completedUnits += sample.length;
          setProgress({ current: completedUnits, total: totalUnits });
        }

        if (cancelledRef.current) {
          setStatus('cancelled');
          return;
        }
        setStatus('complete');
      } catch (err) {
        setStatus('error');
        setErrorMessage(err instanceof Error ? err.message : String(err));
      }
    })();
  }, [client, types, sampleSize]);

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
    duplicateClusters,
    contentHashClusters,
    skippedPatients,
    errorMessage,
    start,
    cancel,
  };
}
