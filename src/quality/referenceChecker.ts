/**
 * referenceChecker -- DQ-09 broken reference detection.
 *
 * Given a list of ExtractedReferences, groups by target type, batches
 * the ids into chunked `_id` search queries, and records the targets
 * the server does NOT return as broken references (D-06, D-13).
 *
 * T-17-01 mitigation: concurrency limit (default 5) caps the number of
 * simultaneous in-flight requests so a large sample does not flood the
 * server. Batch size (default 50) caps the length of the `_id` comma
 * list so URLs do not balloon past server header limits.
 *
 * Blaze tolerates `_elements=id` but defensively we fall back to a
 * plain `_id` query if the first form errors.
 */
import type { MedplumClient } from '@medplum/core';
import type { ResourceType } from '@medplum/fhirtypes';
import type { NormalizedIssue } from './types';
import type { ExtractedReference } from './referenceWalker';
import { FHIR_ID_PATTERN } from '../utils/referenceUrl';

interface CheckReferencesOptions {
  batchSize?: number;
  concurrency?: number;
  onProgress?: (current: number, total: number) => void;
}

interface Batch {
  type: string;
  ids: string[];
}

/**
 * Run batches through a bounded worker pool. Starts up to `concurrency`
 * promises at a time; each completed promise triggers the next batch.
 */
async function runWithConcurrency<T>(
  batches: Batch[],
  concurrency: number,
  worker: (batch: Batch) => Promise<T>,
): Promise<T[]> {
  const results: T[] = [];
  let cursor = 0;

  async function next(): Promise<void> {
    while (cursor < batches.length) {
      const idx = cursor++;
      const result = await worker(batches[idx]);
      results[idx] = result;
    }
  }

  const workers: Promise<void>[] = [];
  const lanes = Math.min(concurrency, batches.length);
  for (let i = 0; i < lanes; i++) {
    workers.push(next());
  }
  await Promise.all(workers);
  return results;
}

/**
 * Batch-check which references resolve on the server. Returns the set
 * of reference strings that did NOT resolve.
 */
export async function checkReferencesExist(
  client: MedplumClient,
  refs: ExtractedReference[],
  options: CheckReferencesOptions = {},
): Promise<Set<string>> {
  const batchSize = options.batchSize ?? 50;
  const concurrency = options.concurrency ?? 5;

  // Group unique ids by type. Using a Set avoids checking the same
  // target twice when multiple source resources point to the same id.
  const byType = new Map<string, Set<string>>();
  for (const r of refs) {
    const slash = r.reference.indexOf('/');
    if (slash <= 0) continue;
    const type = r.reference.slice(0, slash);
    const id = r.reference.slice(slash + 1);
    if (!id) continue;
    // FIX-04 (D-07): defensively validate against FHIR_ID_PATTERN so malformed
    // ids (trailing slash, illegal chars) never reach the _id search param.
    // Silently skip (log-only) — these are upstream extractor edge cases, not
    // user-facing errors.
    if (!FHIR_ID_PATTERN.test(id)) continue;
    let bucket = byType.get(type);
    if (!bucket) {
      bucket = new Set<string>();
      byType.set(type, bucket);
    }
    bucket.add(id);
  }

  // Chunk each type's id set into batches.
  const batches: Batch[] = [];
  for (const [type, idSet] of byType.entries()) {
    const ids = Array.from(idSet);
    for (let i = 0; i < ids.length; i += batchSize) {
      batches.push({ type, ids: ids.slice(i, i + batchSize) });
    }
  }

  const broken = new Set<string>();
  if (batches.length === 0) return broken;

  let completed = 0;

  await runWithConcurrency(batches, concurrency, async ({ type, ids }) => {
    let found: Array<{ id?: string }> = [];
    const idParam = ids.join(',');
    try {
      found = (await client.searchResources(type as ResourceType, {
        _id: idParam,
        _elements: 'id',
      })) as Array<{ id?: string }>;
    } catch {
      try {
        found = (await client.searchResources(type as ResourceType, {
          _id: idParam,
        })) as Array<{ id?: string }>;
      } catch {
        // If both queries fail, treat every id in this batch as broken.
        for (const id of ids) {
          broken.add(`${type}/${id}`);
        }
        completed++;
        options.onProgress?.(completed, batches.length);
        return;
      }
    }
    const foundIds = new Set<string>();
    for (const r of found) {
      if (typeof r?.id === 'string') foundIds.add(r.id);
    }
    for (const id of ids) {
      if (!foundIds.has(id)) {
        broken.add(`${type}/${id}`);
      }
    }
    completed++;
    options.onProgress?.(completed, batches.length);
  });

  return broken;
}

/**
 * Map each broken reference target back to every source resource that
 * pointed at it, emitting a NormalizedIssue per source.
 */
export function normalizeBrokenRefIssues(
  brokenRefs: Set<string>,
  refMap: Map<string, Array<{ sourceId: string; sourceType: string; path: string }>>,
): NormalizedIssue[] {
  const issues: NormalizedIssue[] = [];
  for (const target of brokenRefs) {
    const sources = refMap.get(target) ?? [];
    for (const s of sources) {
      issues.push({
        resourceId: `${s.sourceType}/${s.sourceId}`,
        resourceType: s.sourceType,
        field: s.path,
        description: `[broken-ref] Reference ${target} does not resolve on this server`,
        severity: 'warning',
      });
    }
  }
  return issues;
}
