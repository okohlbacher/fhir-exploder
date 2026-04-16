/**
 * useValidationRun — batch validation runner for Plan 05-05.
 *
 * State machine:
 *   idle → (start) → running → (complete | cancelled | error)
 *   cancelled retains partial results (non-destructive per D-11).
 *
 * Execution:
 *   1. sampleResources(client, resourceType, sampleSize)
 *   2. for each batch of size batchSize:
 *      - Promise.all(backends.validate(r)) for each resource in the batch
 *      - dedupeIssues on the flattened per-resource issues
 *      - accumulate into `issues` (flat, ordered by batch) and
 *        `byResource` (keyed by `${type}/${id}`)
 *      - advance `progress.current`
 *   3. If cancelledRef flips during a batch, stop at the next boundary.
 *
 * `_resourceId` is attached to each issue as a non-standard field so the
 * UI can render "Resource → /explorer/{type}/{id}" links without having
 * to cross-reference byResource.
 */
import { useCallback, useEffect, useRef, useState } from 'react';
import type { MedplumClient } from '@medplum/core';
import type { OperationOutcomeIssue, Resource } from '@medplum/fhirtypes';
import type { AppSettings } from '../config/types';
import { sampleResources } from '../quality/sampling';
import {
  dedupeIssues,
  resolveBackends,
} from '../quality/validationBackends';

export type ValidationRunStatus =
  | 'idle'
  | 'running'
  | 'complete'
  | 'cancelled'
  | 'error';

/** Issue with attached resource id for UI rendering. */
export type AttributedIssue = OperationOutcomeIssue & {
  _resourceId?: string;
};

export interface ValidationRunState {
  status: ValidationRunStatus;
  progress: { current: number; total: number };
  issues: AttributedIssue[];
  byResource: Record<string, { resourceId: string; issues: OperationOutcomeIssue[] }>;
  errorMessage?: string;
  start: () => void;
  cancel: () => void;
}

interface UseValidationRunArgs {
  client: MedplumClient | null;
  resourceType: string;
  sampleSize: number;
  batchSize: number;
  settings: AppSettings | null;
  patientIds?: string[];
}

export function useValidationRun({
  client,
  resourceType,
  sampleSize,
  batchSize,
  settings,
  patientIds,
}: UseValidationRunArgs): ValidationRunState {
  const [status, setStatus] = useState<ValidationRunStatus>('idle');
  const [progress, setProgress] = useState<{ current: number; total: number }>({
    current: 0,
    total: 0,
  });
  const [issues, setIssues] = useState<AttributedIssue[]>([]);
  const [byResource, setByResource] = useState<
    Record<string, { resourceId: string; issues: OperationOutcomeIssue[] }>
  >({});
  const [errorMessage, setErrorMessage] = useState<string | undefined>(undefined);
  const cancelledRef = useRef(false);

  const start = useCallback(() => {
    if (!client || !resourceType || !settings) return;

    cancelledRef.current = false;
    setStatus('running');
    setIssues([]);
    setByResource({});
    setProgress({ current: 0, total: 0 });
    // Clear previous error on new run start — user sees fresh state
    setErrorMessage(undefined);

    void (async () => {
      try {
        const sample: Resource[] = await sampleResources(
          client,
          resourceType,
          sampleSize,
          patientIds,
        );
        if (cancelledRef.current) {
          setStatus('cancelled');
          return;
        }
        setProgress({ current: 0, total: sample.length });

        const { backends } = resolveBackends(settings, resourceType);
        const effectiveBatchSize = Math.max(1, batchSize);

        /** Accumulate batch results into state (issues, byResource, progress). */
        function commitBatchResults(
          results: { resource: Resource; issues: OperationOutcomeIssue[] }[],
          batchEnd: number,
          total: number,
        ) {
          setIssues((prev) => [
            ...prev,
            ...results.flatMap((r) =>
              r.issues.map((issue) => ({
                ...issue,
                _resourceId: `${r.resource.resourceType}/${r.resource.id ?? 'unknown'}`,
              })),
            ),
          ]);
          setByResource((prev) => {
            const next = { ...prev };
            for (const r of results) {
              const key = `${r.resource.resourceType}/${r.resource.id ?? 'unknown'}`;
              next[key] = { resourceId: r.resource.id ?? 'unknown', issues: r.issues };
            }
            return next;
          });
          setProgress({
            current: Math.min(batchEnd, total),
            total,
          });
        }

        for (let i = 0; i < sample.length; i += effectiveBatchSize) {
          if (cancelledRef.current) {
            setStatus('cancelled');
            return;
          }
          const batch = sample.slice(i, i + effectiveBatchSize);
          const results = await Promise.all(
            batch.map(async (r) => {
              const perBackend = await Promise.all(
                backends.map((b) => b.validate(r)),
              );
              const flat = perBackend.flat();
              const deduped = dedupeIssues(flat);
              return { resource: r, issues: deduped };
            }),
          );
          // Surface already-computed results even on cancellation
          commitBatchResults(results, i + batch.length, sample.length);
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
  }, [client, resourceType, sampleSize, batchSize, settings, patientIds]);

  const cancel = useCallback(() => {
    cancelledRef.current = true;
  }, []);

  // Unmount-safety: flip cancelledRef so the async batch loop bails at
  // the next `if (cancelledRef.current) return;` check and no setState
  // fires against an unmounted tree.
  useEffect(() => {
    return () => {
      cancelledRef.current = true;
    };
  }, []);

  return {
    status,
    progress,
    issues,
    byResource,
    errorMessage,
    start,
    cancel,
  };
}
