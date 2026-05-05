/**
 * extractOutgoingReferences.ts — Phase 57 / LENS-02 walker.
 *
 * Pure function that enumerates every outgoing FHIR Reference inside an R4 resource.
 * Used by `OutgoingReferencesPanel` (Phase 57) to render a labeled list of refs in
 * Summary mode. Produces one entry per JSON path occurrence — see D-03 (no dedup).
 *
 * Skips structural top-level fields (`resourceType`, `id`, `meta`, `text`) and
 * `contained[]` (local fragments, not outgoing refs per CONTEXT D-01).
 *
 * Pure: no I/O, no clock, no RNG. Safe for module-top-level evaluation.
 */

import type { Resource } from '@medplum/fhirtypes';
import { isValidFhirReference, normalizeReference } from './referenceUrl';

/**
 * A single outgoing FHIR Reference found inside a resource.
 *
 * Contract per CONTEXT D-01:
 *  - `path`      JSON path of the Reference object, e.g. "subject" or "participant[0].individual"
 *  - `reference` Raw Reference.reference string from the source JSON (NOT normalized)
 *  - `display`   Reference.display, when present in source
 */
export interface OutgoingRef {
  /** JSON path of the Reference object, e.g. "subject" or "participant[0].individual". */
  path: string;
  /** Raw Reference.reference string from the source JSON (NOT normalized). */
  reference: string;
  /** Reference.display, when present in source. */
  display?: string;
}

/** Top-level fields that are structural metadata, not outgoing references. Per D-01. */
const SKIP_TOP_LEVEL = new Set(['resourceType', 'id', 'meta', 'text', 'contained']);

/**
 * Enumerate every outgoing FHIR Reference inside an R4 resource.
 *
 * Per CONTEXT D-01:
 *  - Skips top-level `resourceType`, `id`, `meta`, `text`, `contained`
 *  - Validates references via `normalizeReference` + `isValidFhirReference` (T-57-01 mitigation)
 *  - Emits one row per field path occurrence — no dedup (D-03)
 *  - Does not mutate the input resource
 *  - No async work; resource is a finite POJO already in memory (T-57-03 mitigation)
 *
 * Phase 57 / LENS-02
 */
export function extractOutgoingReferences(resource: Resource): OutgoingRef[] {
  const out: OutgoingRef[] = [];
  walk(resource as unknown as Record<string, unknown>, '', out, /* topLevel */ true);
  return out;
}

/**
 * Recursive walker. Descends into the resource object tree looking for Reference-shaped
 * objects (`{ reference: string, display?: string }`). Validates each found reference
 * before emitting, then returns without descending further into that Reference object.
 */
function walk(
  node: Record<string, unknown>,
  path: string,
  out: OutgoingRef[],
  topLevel: boolean,
): void {
  if (node === null || node === undefined || typeof node !== 'object') return;

  // Detect Reference shape: object with a `reference` string field (not an array).
  if (!Array.isArray(node) && typeof node.reference === 'string') {
    const normalized = normalizeReference(node.reference);
    if (normalized !== null) {
      const segs = normalized.split('/');
      if (segs.length === 2) {
        const [type, id] = segs;
        if (isValidFhirReference(type, id)) {
          out.push({
            path,
            reference: node.reference,
            display: typeof node.display === 'string' ? node.display : undefined,
          });
        }
      }
    }
    // RETURN — do not descend into Reference object's other fields.
    return;
  }

  // Otherwise iterate own enumerable string keys.
  for (const key of Object.keys(node)) {
    // At top level, skip structural metadata fields.
    if (topLevel && SKIP_TOP_LEVEL.has(key)) continue;

    const childValue = node[key];
    if (childValue === null || childValue === undefined) continue;

    const childKeyPath = path === '' ? key : `${path}.${key}`;

    if (Array.isArray(childValue)) {
      // Recurse into array elements with index-suffixed path.
      for (let i = 0; i < childValue.length; i++) {
        const elem = childValue[i];
        if (elem !== null && elem !== undefined && typeof elem === 'object') {
          walk(
            elem as Record<string, unknown>,
            `${childKeyPath}[${i}]`,
            out,
            false,
          );
        }
      }
    } else if (typeof childValue === 'object') {
      walk(
        childValue as Record<string, unknown>,
        childKeyPath,
        out,
        false,
      );
    }
    // Primitives: skip.
  }
}
