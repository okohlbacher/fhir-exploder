/**
 * useReferenceReport -- DQ-09 + DQ-10 orchestrating hook for Phase 17.
 *
 * Runs two relational-integrity checks against a single resource type:
 *   1. Broken reference detection (async, batched server search)
 *   2. Orphan detection (synchronous, profile-driven required fields)
 *
 * State machine (mirrors usePlausibilityReport):
 *   idle -> running -> complete | cancelled | error
 *
 * Progress tracks the batch count of the reference existence check.
 * Orphan detection is synchronous and runs after the async step, so it
 * does not add units to the progress counter.
 */
import { useCallback, useEffect, useRef, useState } from 'react';
import type { MedplumClient } from '@medplum/core';
import type { Resource } from '@medplum/fhirtypes';
import type { NormalizedIssue } from '../quality/types';
import { sampleResources } from '../quality/sampling';
import { extractReferences } from '../quality/referenceWalker';
import {
  checkReferencesExist,
  normalizeBrokenRefIssues,
} from '../quality/referenceChecker';
import { detectOrphans } from '../quality/orphanDetector';

export type ReferenceRunStatus =
  | 'idle'
  | 'running'
  | 'complete'
  | 'cancelled'
  | 'error';

export interface ReferenceRunState {
  status: ReferenceRunStatus;
  progress: { current: number; total: number };
  issues: NormalizedIssue[];
  brokenCount: number;
  orphanCount: number;
  errorMessage?: string;
  start: () => void;
  cancel: () => void;
}

interface UseReferenceReportArgs {
  client: MedplumClient | null;
  resourceType: string;
  sampleSize: number;
}

export function useReferenceReport({
  client,
  resourceType,
  sampleSize,
}: UseReferenceReportArgs): ReferenceRunState {
  const [status, setStatus] = useState<ReferenceRunStatus>('idle');
  const [progress, setProgress] = useState<{ current: number; total: number }>({
    current: 0,
    total: 0,
  });
  const [issues, setIssues] = useState<NormalizedIssue[]>([]);
  const [brokenCount, setBrokenCount] = useState(0);
  const [orphanCount, setOrphanCount] = useState(0);
  const [errorMessage, setErrorMessage] = useState<string | undefined>(undefined);
  const cancelledRef = useRef(false);

  const start = useCallback(() => {
    if (!client || !resourceType) return;

    cancelledRef.current = false;
    setStatus('running');
    setIssues([]);
    setBrokenCount(0);
    setOrphanCount(0);
    setProgress({ current: 0, total: 0 });
    setErrorMessage(undefined);

    void (async () => {
      try {
        const sample: Resource[] = await sampleResources(
          client,
          resourceType,
          sampleSize,
        );
        if (cancelledRef.current) {
          setStatus('cancelled');
          return;
        }

        // Build the ref list and the source-mapping for normalization.
        const allRefs = [];
        const refMap = new Map<
          string,
          Array<{ sourceId: string; sourceType: string; path: string }>
        >();
        for (const r of sample) {
          const sourceId =
            (r as unknown as Record<string, unknown>).id as string | undefined;
          const sourceType = r.resourceType;
          if (!sourceId) continue;
          const extracted = extractReferences(r);
          for (const ex of extracted) {
            allRefs.push(ex);
            const existing = refMap.get(ex.reference);
            const entry = { sourceId, sourceType, path: ex.path };
            if (existing) {
              existing.push(entry);
            } else {
              refMap.set(ex.reference, [entry]);
            }
          }
        }

        const broken = await checkReferencesExist(client, allRefs, {
          batchSize: 50,
          concurrency: 5,
          onProgress: (current, total) => {
            if (cancelledRef.current) return;
            setProgress({ current, total });
          },
        });
        if (cancelledRef.current) {
          setStatus('cancelled');
          return;
        }

        const brokenIssues = normalizeBrokenRefIssues(broken, refMap);
        const orphanIssues = detectOrphans(sample);

        setBrokenCount(brokenIssues.length);
        setOrphanCount(orphanIssues.length);
        setIssues([...brokenIssues, ...orphanIssues]);

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
  }, [client, resourceType, sampleSize]);

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
    brokenCount,
    orphanCount,
    errorMessage,
    start,
    cancel,
  };
}
