import type { Coding } from '@medplum/fhirtypes';

/**
 * Depth-first traversal that yields every Coding-shaped object (has both
 * `system: string` and `code: string`) contained within `value`. A shallow
 * Coding match still walks its OTHER fields so that a wrapper object
 * carrying both Coding shape AND nested codings under unrelated keys
 * contributes itself plus each nested Coding exactly once.
 *
 * Non-object inputs (`undefined`, `null`, primitives) yield `[]`.
 *
 * We don't pre-skip keys by name (e.g. `code`, `system`) because those keys
 * commonly appear on non-Coding FHIR shapes — `Condition.code` is a
 * CodeableConcept, `Identifier.system` is a URL — and skipping them would
 * miss real Codings nested underneath. Instead, we lean on the
 * `typeof !== 'object'` early return to cheaply skip the string primitives
 * that live directly on Codings.
 */
export function collectCodings(value: unknown, out: Coding[] = []): Coding[] {
  if (!value || typeof value !== 'object') return out;
  if (Array.isArray(value)) {
    for (const v of value) collectCodings(v, out);
    return out;
  }
  const v = value as Record<string, unknown>;
  if (typeof v.system === 'string' && typeof v.code === 'string') {
    out.push(v as Coding);
  }
  for (const key of Object.keys(v)) {
    collectCodings(v[key], out);
  }
  return out;
}
