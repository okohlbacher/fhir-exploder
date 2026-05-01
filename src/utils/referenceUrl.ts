/**
 * referenceUrl.ts — FHIR Reference string utilities.
 *
 * Phase 47 / READ-01 D-04 — extracted from src/quality/referenceWalker.ts so
 * useReferenceResolver, ReferenceLink, and the future JSON peek drawer can all
 * share the same normalization. Re-exported from referenceWalker.ts for
 * back-compat (Q1 resolution).
 *
 * Pure: no I/O, no clock, no RNG. Safe for module-top-level evaluation.
 */

/** Match a FHIR resourceType: uppercase first letter then alphanumerics only. */
export const FHIR_REFERENCE_PATTERN = /^[A-Z][a-zA-Z]+$/;

/** Match a FHIR id: 1-64 chars [A-Za-z0-9-.] starting with alphanumeric (per R4 spec). */
export const FHIR_ID_PATTERN = /^[A-Za-z0-9][A-Za-z0-9\-.]{0,63}$/;

/**
 * Validate a (resourceType, id) tuple against the FHIR R4 patterns.
 * Mirrors the existing T-02-08 mitigation in ResourceDetailPage.tsx:19-24.
 * Used as a defense-in-depth gate before issuing client.readResource calls.
 */
export function isValidFhirReference(resourceType: string, id: string): boolean {
  return FHIR_REFERENCE_PATTERN.test(resourceType) && FHIR_ID_PATTERN.test(id);
}

/**
 * Normalize a `Reference.reference` string to canonical `Type/id` form.
 *
 * Returns null for:
 *   - contained-resource fragment refs ('#sub')   — caller resolves from parent.contained[]
 *   - bundle-internal placeholders ('urn:...')    — never addressable
 *   - malformed absolute URLs                      — defensive, T-17-03 mitigation
 *   - relative strings that aren't `Type/id`       — junk under a `reference` key
 *
 * Absolute URLs are reduced to their last two path segments (Type, id). This
 * matches whatever FHIR base URL the server happens to return — the cache key
 * is server-agnostic per A4 in RESEARCH.md (single-FHIR-server tool).
 */
export function normalizeReference(value: string): string | null {
  if (value.startsWith('#')) return null;
  if (value.startsWith('urn:')) return null;
  if (value.startsWith('http://') || value.startsWith('https://')) {
    const schemeIdx = value.indexOf('://');
    const afterScheme = schemeIdx >= 0 ? value.slice(schemeIdx + 3) : value;
    const firstSlash = afterScheme.indexOf('/');
    if (firstSlash < 0) return null;
    const pathOnly = afterScheme.slice(firstSlash + 1);
    const parts = pathOnly.split('/').filter(Boolean);
    if (parts.length < 2) return null;
    const type = parts[parts.length - 2];
    const id = parts[parts.length - 1];
    if (!type || !id) return null;
    return `${type}/${id}`;
  }
  const segs = value.split('/');
  if (segs.length !== 2 || !segs[0] || !segs[1]) return null;
  return value;
}

/** Build a router href for the explorer. Pure formatting helper. */
export function buildExplorerHref(resourceType: string, id: string): string {
  return `/explorer/${resourceType}/${id}`;
}
