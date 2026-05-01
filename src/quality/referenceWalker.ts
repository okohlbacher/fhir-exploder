/**
 * referenceWalker -- DQ-09 reference extraction.
 *
 * Recursively walks a FHIR resource JSON tree and emits every
 * `reference` string it finds, tagged with its JSON-path location.
 * Skips two classes of references that do not correspond to server
 * resources (D-06, pitfalls 2/3 in RESEARCH.md):
 *
 *   - "#localId"     -- contained resources, resolved inside the parent
 *   - "urn:..."      -- bundle-internal placeholders
 *
 * Absolute URLs ("http://.../Patient/123") are normalized to relative
 * form ("Patient/123") by taking the last two path segments. Malformed
 * absolute URLs are skipped rather than thrown (T-17-03 mitigation).
 */
import type { Resource } from '@medplum/fhirtypes';
import { normalizeReference } from '../utils/referenceUrl';

// Phase 47 / READ-01 (Q1 resolution): normalizeReference moved to
// src/utils/referenceUrl.ts so useReferenceResolver, ReferenceLink, and the
// future JSON peek drawer can share the same normalizer. Re-exported here
// for back-compat with any external import (none in current codebase).
export { normalizeReference } from '../utils/referenceUrl';

export interface ExtractedReference {
  /** Path of the `reference` field, e.g. "Encounter.subject.reference". */
  path: string;
  /** Normalized reference in "Type/id" form. */
  reference: string;
}

function walk(
  node: unknown,
  path: string,
  results: ExtractedReference[],
): void {
  if (node == null) return;
  if (Array.isArray(node)) {
    for (let i = 0; i < node.length; i++) {
      walk(node[i], `${path}[${i}]`, results);
    }
    return;
  }
  if (typeof node !== 'object') return;

  const obj = node as Record<string, unknown>;
  const refVal = obj.reference;
  if (typeof refVal === 'string') {
    const normalized = normalizeReference(refVal);
    if (normalized !== null) {
      results.push({ path: `${path}.reference`, reference: normalized });
    }
  }

  for (const [key, value] of Object.entries(obj)) {
    if (key === 'reference') continue; // already handled above
    walk(value, path ? `${path}.${key}` : key, results);
  }
}

/**
 * Extract every Reference embedded in the resource. The root path starts
 * from `resource.resourceType` so the first segment matches FHIRPath
 * conventions used elsewhere in the quality module (e.g., "Encounter.").
 */
export function extractReferences(resource: Resource): ExtractedReference[] {
  const results: ExtractedReference[] = [];
  const rootPath = typeof resource?.resourceType === 'string' ? resource.resourceType : '';
  walk(resource, rootPath, results);
  return results;
}
