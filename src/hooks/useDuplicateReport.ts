/**
 * useDuplicateReport -- DQ-07 + DQ-08 orchestrating hook (Phase 17 / 24).
 *
 * Wraps `useAsyncRun<NormalizedIssue>` (FOUND-03). Three accessory states
 * (duplicateClusters, contentHashClusters, skippedPatients) stay in local
 * `useState` per D-09 (fixed reducer shape; PITFALLS §Pitfall 1).
 * Progress math (totalUnits / completedUnits) preserved verbatim from
 * pre-refactor (Pitfall 6).
 *
 * Phase 23 gap-closure (CLOSE-06 Bug B): autoStart: true + memoized
 * patientIdsKey + typesKey so a cohort change re-fires the runner without
 * thrashing on render-identity-different-but-equal array references
 * (PITFALLS §Pitfall 7 / threat T-23-05-05). See 23-HUMAN-UAT.md root_cause.
 */
import { useMemo, useState } from 'react';
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
import { useAsyncRun, type UseAsyncRunResult } from './useAsyncRun';
import type { AsyncRunStatus } from './internal/asyncRunReducer';

export type DuplicateRunStatus = AsyncRunStatus;
export interface DuplicateRunState extends UseAsyncRunResult<NormalizedIssue> {
  duplicateClusters: PatientDuplicateCluster[];
  contentHashClusters: ContentHashCluster[];
  skippedPatients: number;
}

interface UseDuplicateReportArgs {
  client: MedplumClient | null;
  types: string[];
  sampleSize: number;
  patientIds?: string[];
}

export function useDuplicateReport({
  client,
  types,
  sampleSize,
  patientIds,
}: UseDuplicateReportArgs): DuplicateRunState {
  const [duplicateClusters, setDuplicateClusters] = useState<PatientDuplicateCluster[]>([]);
  const [contentHashClusters, setContentHashClusters] = useState<ContentHashCluster[]>([]);
  const [skippedPatients, setSkippedPatients] = useState(0);

  // Phase 23 gap-closure (CLOSE-06 Bug B): memoize `types` AND `patientIds`
  // into stable keys. `types` is an array passed from the parent; without
  // `typesKey` memoization, autoStart:true would thrash whenever the parent
  // re-renders with a new array identity (PITFALLS §Pitfall 7).
  const typesKey = useMemo(() => types.join(','), [types]);
  const patientIdsKey = useMemo(
    () =>
      patientIds && patientIds.length > 0 ? patientIds.slice().sort().join(',') : '',
    [patientIds],
  );

  const run = useAsyncRun<NormalizedIssue>({
    runner: async ({ isCancelled, setProgress, appendIssues }) => {
      // Reset accessory state at the start of each run (D-09).
      setDuplicateClusters([]);
      setContentHashClusters([]);
      setSkippedPatients(0);
      if (!client) return;
      // Phase 1: Patient sample (best-effort; server may not have Patient).
      let patientSample: Resource[] = [];
      try {
        patientSample = await sampleResources(client, 'Patient', sampleSize, patientIds);
      } catch {
        patientSample = [];
      }
      if (isCancelled()) return;
      // Per-type samples; pre-plan totalUnits (Pitfall 6: preserved verbatim).
      const perTypeSamples: Record<string, Resource[]> = {};
      for (const t of types) {
        if (isCancelled()) return;
        try {
          perTypeSamples[t] = await sampleResources(client, t, sampleSize, patientIds);
        } catch {
          perTypeSamples[t] = [];
        }
      }
      if (isCancelled()) return;
      const totalUnits =
        patientSample.length +
        Object.values(perTypeSamples).reduce((sum, arr) => sum + arr.length, 0);
      setProgress(0, totalUnits);
      // Phase 2: synchronous patient duplicate detection.
      const patResult = findPatientDuplicates(patientSample);
      setDuplicateClusters(patResult.clusters);
      setSkippedPatients(patResult.skippedCount);
      appendIssues(normalizePatientDuplicateIssues(patResult.clusters));
      let completedUnits = patientSample.length;
      setProgress(completedUnits, totalUnits);
      if (isCancelled()) return;
      // Phase 3: per-type content hash dedup.
      for (const t of types) {
        if (isCancelled()) return;
        const sample = perTypeSamples[t] ?? [];
        const base = completedUnits;
        const clusters = await findContentHashDuplicates(sample, t, (current) => {
          setProgress(base + current, totalUnits);
        });
        if (isCancelled()) return;
        setContentHashClusters((prev) => [...prev, ...clusters]);
        const batchIssues = normalizeContentHashIssues(clusters);
        if (batchIssues.length > 0) appendIssues(batchIssues);
        completedUnits += sample.length;
        setProgress(completedUnits, totalUnits);
      }
    },
    deps: [client, typesKey, sampleSize, patientIdsKey],
    autoStart: true,
  });

  return { ...run, duplicateClusters, contentHashClusters, skippedPatients };
}
