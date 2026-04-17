/**
 * useReferenceReport -- DQ-09 + DQ-10 orchestrating hook (Phase 17 / 24).
 *
 * Wraps `useAsyncRun<NormalizedIssue>` (FOUND-03). Accessory state
 * (brokenCount, orphanCount) lives in local `useState` per D-09. Progress
 * tracks the broken-ref batch counter; orphan detection runs after.
 */
import { useState } from 'react';
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
import { useAsyncRun, type UseAsyncRunResult } from './useAsyncRun';
import type { AsyncRunStatus } from './internal/asyncRunReducer';

export type ReferenceRunStatus = AsyncRunStatus;
export interface ReferenceRunState extends UseAsyncRunResult<NormalizedIssue> {
  brokenCount: number;
  orphanCount: number;
}

interface UseReferenceReportArgs {
  client: MedplumClient | null;
  resourceType: string;
  sampleSize: number;
  patientIds?: string[];
}

export function useReferenceReport({
  client,
  resourceType,
  sampleSize,
  patientIds,
}: UseReferenceReportArgs): ReferenceRunState {
  const [brokenCount, setBrokenCount] = useState(0);
  const [orphanCount, setOrphanCount] = useState(0);
  const run = useAsyncRun<NormalizedIssue>({
    runner: async ({ isCancelled, setProgress, appendIssues }) => {
      // Reset accessory state at the start of each run (D-09).
      setBrokenCount(0);
      setOrphanCount(0);
      if (!client || !resourceType) return;
      const sample: Resource[] = await sampleResources(
        client,
        resourceType,
        sampleSize,
        patientIds,
      );
      if (isCancelled()) return;
      const allRefs = [];
      const refMap = new Map<
        string,
        Array<{ sourceId: string; sourceType: string; path: string }>
      >();
      for (const r of sample) {
        // Cast preserved verbatim from pre-refactor; Phase 28 SWEEP-01 will
        // migrate to `toRecord` helper.
        const sourceId =
          (r as unknown as Record<string, unknown>).id as string | undefined;
        const sourceType = r.resourceType;
        if (!sourceId) continue;
        const extracted = extractReferences(r);
        for (const ex of extracted) {
          allRefs.push(ex);
          const existing = refMap.get(ex.reference);
          const entry = { sourceId, sourceType, path: ex.path };
          if (existing) existing.push(entry);
          else refMap.set(ex.reference, [entry]);
        }
      }
      const broken = await checkReferencesExist(client, allRefs, {
        batchSize: 50,
        concurrency: 5,
        onProgress: (current, total) => {
          if (isCancelled()) return;
          setProgress(current, total);
        },
      });
      if (isCancelled()) return;
      const brokenIssues = normalizeBrokenRefIssues(broken, refMap);
      const orphanIssues = detectOrphans(sample);
      setBrokenCount(brokenIssues.length);
      setOrphanCount(orphanIssues.length);
      appendIssues([...brokenIssues, ...orphanIssues]);
    },
    deps: [client, resourceType, sampleSize, patientIds],
  });
  return { ...run, brokenCount, orphanCount };
}
