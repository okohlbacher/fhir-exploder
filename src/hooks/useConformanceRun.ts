/**
 * useConformanceRun -- batch conformance validation runner for Phase 16.
 *
 * State machine:
 *   idle -> (start) -> running -> (complete | cancelled | error)
 *
 * Execution:
 *   1. Sample resources via sampleResources(client, resourceType, sampleSize)
 *   2. Get profile via getProfileForType(resourceType)
 *   3. Expand all needed value sets from profile bindings via ValueSetCache
 *   4. Batch-iterate: validateConformance + normalizeConformanceIssues per resource
 *   5. Also run legacy backends (structural + remote) via resolveBackends for compatibility
 *   6. Track terminologyAvailable from ValueSetCache
 */
import { useCallback, useEffect, useRef, useState } from 'react';
import type { MedplumClient } from '@medplum/core';
import type { OperationOutcomeIssue, Resource, StructureDefinition } from '@medplum/fhirtypes';
import type { AppSettings } from '../config/types';
import type { NormalizedIssue } from '../quality/types';
import { sampleResources } from '../quality/sampling';
import { getProfileForType } from '../quality/profiles';
import { ValueSetCache } from '../quality/valueSetCache';
import {
  validateConformance,
  normalizeConformanceIssues,
} from '../quality/profileConformanceChecker';
import { dedupeIssues, resolveBackends } from '../quality/validationBackends';

export type ConformanceRunStatus =
  | 'idle'
  | 'running'
  | 'complete'
  | 'cancelled'
  | 'error';

/** Issue with attached resource id for UI rendering. */
export type AttributedIssue = OperationOutcomeIssue & {
  _resourceId?: string;
};

export interface ConformanceRunState {
  status: ConformanceRunStatus;
  progress: { current: number; total: number };
  issues: NormalizedIssue[];
  legacyIssues: AttributedIssue[];
  byResource: Record<string, { resourceId: string; issues: OperationOutcomeIssue[] }>;
  terminologyAvailable: boolean;
  errorMessage?: string;
  start: () => void;
  cancel: () => void;
}

interface UseConformanceRunArgs {
  client: MedplumClient | null;
  terminologyClient: MedplumClient | null;
  resourceType: string;
  sampleSize: number;
  batchSize: number;
  settings: AppSettings | null;
  patientIds?: string[];
}

/**
 * Collect all unique valueSet URLs from binding elements in a profile.
 */
function collectBindingUrls(profile: StructureDefinition | null): string[] {
  if (!profile) return [];
  const elements = profile.snapshot?.element ?? [];
  const urls = new Set<string>();
  for (const el of elements) {
    const binding = (el as unknown as Record<string, unknown>).binding as
      | { strength: string; valueSet: string }
      | undefined;
    if (binding?.valueSet && binding.strength !== 'example') {
      urls.add(binding.valueSet);
    }
  }
  return Array.from(urls);
}

export function useConformanceRun({
  client,
  terminologyClient,
  resourceType,
  sampleSize,
  batchSize,
  settings,
  patientIds,
}: UseConformanceRunArgs): ConformanceRunState {
  const [status, setStatus] = useState<ConformanceRunStatus>('idle');
  const [progress, setProgress] = useState<{ current: number; total: number }>({
    current: 0,
    total: 0,
  });
  const [issues, setIssues] = useState<NormalizedIssue[]>([]);
  const [legacyIssues, setLegacyIssues] = useState<AttributedIssue[]>([]);
  const [byResource, setByResource] = useState<
    Record<string, { resourceId: string; issues: OperationOutcomeIssue[] }>
  >({});
  const [terminologyAvailable, setTerminologyAvailable] = useState<boolean>(true);
  const [errorMessage, setErrorMessage] = useState<string | undefined>(undefined);
  const cancelledRef = useRef(false);
  const valueSetCacheRef = useRef(new ValueSetCache());

  const start = useCallback(() => {
    if (!client || !resourceType || !settings) return;

    cancelledRef.current = false;
    setStatus('running');
    setIssues([]);
    setLegacyIssues([]);
    setByResource({});
    setProgress({ current: 0, total: 0 });
    setErrorMessage(undefined);

    void (async () => {
      try {
        // Step 1: Sample resources
        const sample: Resource[] = await sampleResources(client, resourceType, sampleSize, patientIds);
        if (cancelledRef.current) {
          setStatus('cancelled');
          return;
        }
        setProgress({ current: 0, total: sample.length });

        // Step 2: Get profile
        const profile = getProfileForType(resourceType);

        // Step 3: Expand value sets from profile bindings
        const vsCache = valueSetCacheRef.current;
        const expandedValueSets = new Map<string, Set<string>>();

        if (profile && terminologyClient) {
          const bindingUrls = collectBindingUrls(profile);
          if (bindingUrls.length > 0) {
            const results = await Promise.all(
              bindingUrls.map(async (url) => {
                const codes = await vsCache.expand(terminologyClient, url);
                return { url, codes };
              }),
            );
            for (const { url, codes } of results) {
              if (codes) {
                expandedValueSets.set(url, codes);
              }
            }
          }
        }

        setTerminologyAvailable(vsCache.isAvailable());

        if (cancelledRef.current) {
          setStatus('cancelled');
          return;
        }

        // Step 4: Resolve legacy backends for backwards compat
        const { backends } = resolveBackends(settings, resourceType);
        const effectiveBatchSize = Math.max(1, batchSize);

        // Step 5: Batch-iterate resources
        for (let i = 0; i < sample.length; i += effectiveBatchSize) {
          if (cancelledRef.current) {
            setStatus('cancelled');
            return;
          }
          const batch = sample.slice(i, i + effectiveBatchSize);

          const batchConformanceIssues: NormalizedIssue[] = [];
          const batchLegacyIssues: AttributedIssue[] = [];
          const batchByResource: Record<string, { resourceId: string; issues: OperationOutcomeIssue[] }> = {};

          await Promise.all(
            batch.map(async (r) => {
              const resourceId = `${r.resourceType}/${(r as unknown as Record<string, unknown>).id ?? 'unknown'}`;

              // Conformance checker (new)
              const conformanceIssues = validateConformance(r, profile, expandedValueSets);
              const normalized = normalizeConformanceIssues(conformanceIssues, r);
              batchConformanceIssues.push(...normalized);

              // Legacy backends (structural + remote)
              const perBackend = await Promise.all(
                backends.map((b) => b.validate(r)),
              );
              const flat = perBackend.flat();
              const deduped = dedupeIssues(flat);
              const attributed = deduped.map((issue) => ({
                ...issue,
                _resourceId: resourceId,
              }));
              batchLegacyIssues.push(...attributed);
              batchByResource[resourceId] = {
                resourceId: ((r as unknown as Record<string, unknown>).id as string) ?? 'unknown',
                issues: deduped,
              };
            }),
          );

          // Commit batch results
          setIssues((prev) => [...prev, ...batchConformanceIssues]);
          setLegacyIssues((prev) => [...prev, ...batchLegacyIssues]);
          setByResource((prev) => ({ ...prev, ...batchByResource }));
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
  }, [client, terminologyClient, resourceType, sampleSize, batchSize, settings, patientIds]);

  const cancel = useCallback(() => {
    cancelledRef.current = true;
  }, []);

  // Unmount-safety
  useEffect(() => {
    return () => {
      cancelledRef.current = true;
    };
  }, []);

  return {
    status,
    progress,
    issues,
    legacyIssues,
    byResource,
    terminologyAvailable,
    errorMessage,
    start,
    cancel,
  };
}
