/**
 * contentHasher -- DQ-08 content hash deduplication.
 *
 * Canonicalizes a resource (strips id/meta/text, deep-sorts keys) then
 * SHA-256 hashes the JSON string (D-04, D-05). Grouping happens by
 * (resourceType, hash); only clusters with >=2 members are returned.
 *
 * Hashing is batched (BATCH_SIZE=25) with an optional progress callback
 * so the hook layer can drive the progress bar and stay responsive on
 * large samples (T-17-02 mitigation: yield microtasks between batches).
 */
import type { Resource } from '@medplum/fhirtypes';
import type { NormalizedIssue } from './types';

const BATCH_SIZE = 25;

export interface ContentHashCluster {
  /** Hex-encoded SHA-256 hash of the canonicalized resource. */
  hash: string;
  /** Resource type shared by every member of the cluster. */
  resourceType: string;
  /** Resources whose canonicalized form produced this hash. */
  resources: Array<{ id: string; resourceType: string }>;
}

/**
 * Recursively sort object keys alphabetically. Arrays keep their index
 * order (element-by-element), but every nested object gets its keys
 * sorted so `JSON.stringify` yields a canonical string regardless of
 * the source property-insertion order.
 */
export function sortKeys(obj: unknown): unknown {
  if (Array.isArray(obj)) {
    return obj.map(sortKeys);
  }
  if (obj !== null && typeof obj === 'object') {
    const sorted: Record<string, unknown> = {};
    const keys = Object.keys(obj as Record<string, unknown>).sort();
    for (const k of keys) {
      sorted[k] = sortKeys((obj as Record<string, unknown>)[k]);
    }
    return sorted;
  }
  return obj;
}

/**
 * Strip transient/provenance fields (id, meta, text) and JSON-stringify
 * the deep-sorted remainder. Two resources that differ only in those
 * stripped fields or in key order produce the same canonical string.
 */
export function canonicalize(resource: Resource): string {
  const clone: Record<string, unknown> = {
    ...(resource as unknown as Record<string, unknown>),
  };
  delete clone.id;
  delete clone.meta;
  delete clone.text;
  return JSON.stringify(sortKeys(clone));
}

function bufferToHex(buf: ArrayBuffer): string {
  const bytes = new Uint8Array(buf);
  let hex = '';
  for (let i = 0; i < bytes.length; i++) {
    hex += bytes[i].toString(16).padStart(2, '0');
  }
  return hex;
}

/**
 * SHA-256 hash of the canonicalized resource. Returns a 64-char hex
 * string. Uses Web Crypto (`crypto.subtle.digest`) so it works in
 * browsers and modern Node (jsdom test env).
 */
export async function hashResource(resource: Resource): Promise<string> {
  const canonical = canonicalize(resource);
  const encoded = new TextEncoder().encode(canonical);
  const buffer = await crypto.subtle.digest('SHA-256', encoded);
  return bufferToHex(buffer);
}

/**
 * Hash every resource in the sample and group by (resourceType, hash).
 * Processing happens in batches of 25 with an optional progress
 * callback, mirroring the batch cadence of usePlausibilityReport.
 *
 * Only clusters with >=2 members are returned. Singletons are ignored.
 */
export async function findContentHashDuplicates(
  resources: Resource[],
  resourceType: string,
  onProgress?: (current: number, total: number) => void,
): Promise<ContentHashCluster[]> {
  const total = resources.length;
  if (total === 0) return [];

  const groups = new Map<string, Array<{ id: string; resourceType: string }>>();

  for (let i = 0; i < total; i += BATCH_SIZE) {
    const batch = resources.slice(i, i + BATCH_SIZE);
    const hashes = await Promise.all(batch.map((r) => hashResource(r)));
    for (let j = 0; j < batch.length; j++) {
      const hash = hashes[j];
      const member = {
        id: `${resourceType}/${(batch[j] as unknown as Record<string, unknown>).id ?? 'unknown'}`,
        resourceType,
      };
      const bucket = groups.get(hash);
      if (bucket) {
        bucket.push(member);
      } else {
        groups.set(hash, [member]);
      }
    }
    onProgress?.(Math.min(i + batch.length, total), total);
  }

  const clusters: ContentHashCluster[] = [];
  for (const [hash, members] of groups.entries()) {
    if (members.length >= 2) {
      clusters.push({ hash, resourceType, resources: members });
    }
  }
  return clusters;
}

/**
 * Convert ContentHashCluster[] to NormalizedIssue[]. Description embeds
 * the first 8 hex characters of the hash for at-a-glance grouping in
 * the issue table.
 */
export function normalizeContentHashIssues(
  clusters: ContentHashCluster[],
): NormalizedIssue[] {
  const issues: NormalizedIssue[] = [];
  for (const cluster of clusters) {
    const others = cluster.resources.length - 1;
    const short = cluster.hash.slice(0, 8);
    for (const member of cluster.resources) {
      issues.push({
        resourceId: member.id,
        resourceType: member.resourceType,
        field: 'content hash',
        description: `[content-hash] Identical content with ${others} other ${cluster.resourceType} resources (hash: ${short})`,
        severity: 'warning',
      });
    }
  }
  return issues;
}
