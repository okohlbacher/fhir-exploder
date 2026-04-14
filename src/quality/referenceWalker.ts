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

export interface ExtractedReference {
  /** Path of the `reference` field, e.g. "Encounter.subject.reference". */
  path: string;
  /** Normalized reference in "Type/id" form. */
  reference: string;
}

function normalizeReference(value: string): string | null {
  if (value.startsWith('#')) return null;
  if (value.startsWith('urn:')) return null;
  if (value.startsWith('http://') || value.startsWith('https://')) {
    // Take the last two path segments from the URL *path* (after host).
    // Strip "scheme://host/" prefix so the parts we use are real path segments.
    const schemeIdx = value.indexOf('://');
    const afterScheme = schemeIdx >= 0 ? value.slice(schemeIdx + 3) : value;
    const firstSlash = afterScheme.indexOf('/');
    if (firstSlash < 0) return null; // no path -> malformed for our purposes
    const pathOnly = afterScheme.slice(firstSlash + 1);
    const parts = pathOnly.split('/').filter(Boolean);
    if (parts.length < 2) return null;
    const type = parts[parts.length - 2];
    const id = parts[parts.length - 1];
    if (!type || !id) return null;
    return `${type}/${id}`;
  }
  // Must look like "Type/id" -- split check keeps us from recording
  // junk strings that happen to appear under a `reference` key.
  const segs = value.split('/');
  if (segs.length !== 2 || !segs[0] || !segs[1]) return null;
  return value;
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
