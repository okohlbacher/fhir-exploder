/**
 * Pure functions for MII completeness auditing (Plan 05-03).
 *
 * Three independently-testable helpers that together answer
 * "how populated are the MII-required fields across this sample?":
 *
 *  - `requiredElementPaths(sd)` — extracts the path list where the
 *    StructureDefinition declares `mustSupport === true` OR `min >= 1`.
 *    Prefers `snapshot.element`; falls back to `differential.element`.
 *
 *  - `isPathPopulated(resource, path)` — walks a dotted FHIR path into
 *    a resource and returns true when the leaf is non-empty.
 *    Choice-type handling (Pitfall 3): a segment ending in `[x]` matches
 *    any key starting with the prefix (`value[x]` → valueQuantity,
 *    valueString, valueCodeableConcept, …).
 *    Sliced paths (Pitfall 4) are treated as base-cardinality for v1 —
 *    see README note. Slice-level gaps are inspected in the Coverage tab.
 *
 *  - `computeCompleteness(sample, requiredPaths)` — aggregate populated
 *    counts across a sample. `populated / total` gives the percentage;
 *    `perPath` exposes the diagnostic drill-down map.
 */
import type { Resource, StructureDefinition } from '@medplum/fhirtypes';

export function requiredElementPaths(sd: StructureDefinition): string[] {
  const elements = sd.snapshot?.element ?? sd.differential?.element ?? [];
  const paths = elements
    .filter((el) => el.mustSupport === true || (el.min ?? 0) >= 1)
    .map((el) => el.path)
    .filter((p): p is string => typeof p === 'string' && p.length > 0);
  return Array.from(new Set(paths));
}

export function isPathPopulated(resource: unknown, path: string): boolean {
  if (typeof path !== 'string' || path.length === 0) return false;
  const segments = path.split('.').slice(1); // drop ResourceType prefix
  if (segments.length === 0) return isNonEmpty(resource);

  let node: unknown = resource;
  for (let i = 0; i < segments.length; i++) {
    const seg = segments[i];
    if (node == null || typeof node !== 'object') return false;

    // Choice-type segment (Pitfall 3): strip `[x]` and probe every key
    // on the current object starting with the prefix.
    if (seg.endsWith('[x]')) {
      const prefix = seg.slice(0, -3);
      const parent = node as Record<string, unknown>;
      for (const k of Object.keys(parent)) {
        if (k.startsWith(prefix) && isNonEmpty(parent[k])) {
          return true;
        }
      }
      return false;
    }

    node = (node as Record<string, unknown>)[seg];
    if (Array.isArray(node)) {
      if (node.length === 0) return false;
      // For v1 we inspect the first element — Pitfall 4 (slice-aware)
      // is documented as out-of-scope and delegated to the Coverage tab.
      node = node[0];
    }
  }
  return isNonEmpty(node);
}

function isNonEmpty(v: unknown): boolean {
  if (v == null) return false;
  if (typeof v === 'string' && v === '') return false;
  if (Array.isArray(v) && v.length === 0) return false;
  if (typeof v === 'object' && v !== null && !Array.isArray(v)) {
    // An object is "populated" if it has at least one own key.
    // This preserves existing behaviour for resource graph nodes where
    // a nested reference/object counts as present.
    for (const _ in v as Record<string, unknown>) {
      return true;
    }
    return false;
  }
  return true;
}

export function computeCompleteness(
  sample: Resource[],
  requiredPaths: string[],
): { populated: number; total: number; perPath: Record<string, number> } {
  if (sample.length === 0 || requiredPaths.length === 0) {
    return { populated: 0, total: 0, perPath: {} };
  }
  const perPath: Record<string, number> = {};
  for (const p of requiredPaths) perPath[p] = 0;
  for (const r of sample) {
    for (const p of requiredPaths) {
      if (isPathPopulated(r, p)) perPath[p]++;
    }
  }
  const populated = Object.values(perPath).reduce((a, b) => a + b, 0);
  const total = sample.length * requiredPaths.length;
  return { populated, total, perPath };
}
