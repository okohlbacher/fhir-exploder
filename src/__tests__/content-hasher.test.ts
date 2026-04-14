/**
 * DQ-08 — contentHasher unit tests.
 *
 * Plan 17-01 delivers `src/quality/contentHasher.ts` exporting:
 *   - sortKeys(obj): unknown — deep-sort object keys, preserve arrays
 *   - canonicalize(resource): string — strips id/meta/text, JSON-stringify sorted
 *   - hashResource(resource): Promise<string> — 64-char SHA-256 hex
 *   - findContentHashDuplicates(resources, type, onProgress): Promise<ContentHashCluster[]>
 *   - normalizeContentHashIssues(clusters): NormalizedIssue[]
 *
 * Critical behaviors tested here:
 * - D-04: canonicalization strips id/meta/text, deep-sorts keys
 * - D-05: SHA-256 hash is deterministic across key ordering
 * - Clustering: only groups of >= 2 returned, keyed by (type, hash)
 * - Progress callback fired after each batch
 */
import { describe, it, expect, vi } from 'vitest';
import type { Resource } from '@medplum/fhirtypes';
import {
  sortKeys,
  canonicalize,
  hashResource,
  findContentHashDuplicates,
  normalizeContentHashIssues,
} from '../quality/contentHasher';

describe('sortKeys (DQ-08)', () => {
  it('sorts top-level object keys alphabetically', () => {
    const sorted = sortKeys({ b: 1, a: 2 });
    expect(JSON.stringify(sorted)).toBe('{"a":2,"b":1}');
  });

  it('deep-sorts nested object keys', () => {
    const sorted = sortKeys({ b: { d: 4, c: 3 }, a: 1 });
    expect(JSON.stringify(sorted)).toBe('{"a":1,"b":{"c":3,"d":4}}');
  });

  it('preserves array element order and sorts elements that are objects', () => {
    const sorted = sortKeys([{ b: 1, a: 2 }]);
    expect(JSON.stringify(sorted)).toBe('[{"a":2,"b":1}]');
  });

  it('leaves primitives unchanged', () => {
    expect(sortKeys('x')).toBe('x');
    expect(sortKeys(42)).toBe(42);
    expect(sortKeys(null)).toBeNull();
    expect(sortKeys(undefined)).toBeUndefined();
    expect(sortKeys(true)).toBe(true);
  });

  it('handles deeply nested mixtures', () => {
    const input = { z: [{ y: 1, a: { n: 9, m: 8 } }], a: 'leaf' };
    const sorted = sortKeys(input);
    expect(JSON.stringify(sorted)).toBe('{"a":"leaf","z":[{"a":{"m":8,"n":9},"y":1}]}');
  });
});

describe('canonicalize (DQ-08)', () => {
  it('strips id, meta, and text fields', () => {
    const r = {
      resourceType: 'Patient',
      id: 'abc',
      meta: { versionId: '1', lastUpdated: '2024-01-01' },
      text: { status: 'generated', div: '<div/>' },
      gender: 'male',
    } as unknown as Resource;
    const canonical = canonicalize(r);
    expect(canonical).not.toContain('"id"');
    expect(canonical).not.toContain('"meta"');
    expect(canonical).not.toContain('"text"');
    expect(canonical).toContain('"gender":"male"');
    expect(canonical).toContain('"resourceType":"Patient"');
  });

  it('produces the same string for two resources that differ only in key order', () => {
    const a: Resource = {
      resourceType: 'Observation',
      status: 'final',
      code: { text: 'glucose' },
    } as Resource;
    const b: Resource = {
      resourceType: 'Observation',
      code: { text: 'glucose' },
      status: 'final',
    } as Resource;
    expect(canonicalize(a)).toBe(canonicalize(b));
  });

  it('produces the same string for resources differing only in id/meta/text', () => {
    const a = {
      resourceType: 'Observation',
      id: 'r1',
      meta: { versionId: '1' },
      text: { status: 'generated', div: '<div/>' },
      status: 'final',
    } as unknown as Resource;
    const b = {
      resourceType: 'Observation',
      id: 'r2',
      meta: { versionId: '2' },
      text: { status: 'generated', div: '<p/>' },
      status: 'final',
    } as unknown as Resource;
    expect(canonicalize(a)).toBe(canonicalize(b));
  });
});

describe('hashResource (DQ-08)', () => {
  it('returns a 64-char hex string (SHA-256)', async () => {
    const hash = await hashResource({
      resourceType: 'Patient',
      gender: 'male',
    } as Resource);
    expect(hash).toMatch(/^[0-9a-f]{64}$/);
  });

  it('produces the same hash for two resources that differ only in id/meta', async () => {
    const a = {
      resourceType: 'Observation',
      id: 'r1',
      meta: { versionId: '1' },
      status: 'final',
      code: { text: 'x' },
    } as unknown as Resource;
    const b = {
      resourceType: 'Observation',
      id: 'r2',
      meta: { versionId: '9' },
      status: 'final',
      code: { text: 'x' },
    } as unknown as Resource;
    const ha = await hashResource(a);
    const hb = await hashResource(b);
    expect(ha).toBe(hb);
  });

  it('produces different hashes for resources with different content', async () => {
    const a: Resource = {
      resourceType: 'Observation',
      status: 'final',
      code: { text: 'glucose' },
    } as Resource;
    const b: Resource = {
      resourceType: 'Observation',
      status: 'final',
      code: { text: 'creatinine' },
    } as Resource;
    const ha = await hashResource(a);
    const hb = await hashResource(b);
    expect(ha).not.toBe(hb);
  });
});

describe('findContentHashDuplicates (DQ-08)', () => {
  it('groups resources with identical content into one cluster', async () => {
    const resources = [
      { resourceType: 'Observation', id: '1', status: 'final', code: { text: 'x' } },
      { resourceType: 'Observation', id: '2', status: 'final', code: { text: 'x' } },
      { resourceType: 'Observation', id: '3', status: 'final', code: { text: 'y' } },
    ] as Resource[];
    const clusters = await findContentHashDuplicates(resources, 'Observation');
    expect(clusters).toHaveLength(1);
    expect(clusters[0].resources).toHaveLength(2);
    expect(clusters[0].resourceType).toBe('Observation');
  });

  it('does not include singleton resources in clusters', async () => {
    const resources = [
      { resourceType: 'Observation', id: '1', status: 'final', code: { text: 'a' } },
      { resourceType: 'Observation', id: '2', status: 'final', code: { text: 'b' } },
    ] as Resource[];
    const clusters = await findContentHashDuplicates(resources, 'Observation');
    expect(clusters).toHaveLength(0);
  });

  it('returns empty array for empty input', async () => {
    const clusters = await findContentHashDuplicates([], 'Observation');
    expect(clusters).toHaveLength(0);
  });

  it('calls onProgress after each batch', async () => {
    // 60 resources > batch size 25, so expect at least 3 progress calls
    const resources = Array.from({ length: 60 }, (_, i) => ({
      resourceType: 'Observation',
      id: String(i),
      status: 'final',
      code: { text: `t${i}` },
    })) as Resource[];
    const onProgress = vi.fn();
    await findContentHashDuplicates(resources, 'Observation', onProgress);
    expect(onProgress).toHaveBeenCalled();
    // Last call should report 60 of 60
    const lastCall = onProgress.mock.calls[onProgress.mock.calls.length - 1];
    expect(lastCall[0]).toBe(60);
    expect(lastCall[1]).toBe(60);
  });

  it('cluster member ids are prefixed with the resourceType', async () => {
    const resources = [
      { resourceType: 'Observation', id: 'aaa', status: 'final', code: { text: 'x' } },
      { resourceType: 'Observation', id: 'bbb', status: 'final', code: { text: 'x' } },
    ] as Resource[];
    const clusters = await findContentHashDuplicates(resources, 'Observation');
    expect(clusters[0].resources.map((r) => r.id).sort()).toEqual([
      'Observation/aaa',
      'Observation/bbb',
    ]);
  });
});

describe('normalizeContentHashIssues (DQ-08)', () => {
  it('emits one issue per cluster member', () => {
    const clusters = [
      {
        hash: 'a'.repeat(64),
        resourceType: 'Observation',
        resources: [
          { id: 'Observation/1', resourceType: 'Observation' },
          { id: 'Observation/2', resourceType: 'Observation' },
        ],
      },
    ];
    const issues = normalizeContentHashIssues(clusters);
    expect(issues).toHaveLength(2);
    expect(issues[0].description).toContain('[content-hash]');
    expect(issues[0].description).toContain('aaaaaaaa');
    expect(issues[0].severity).toBe('warning');
    expect(issues[0].field).toBe('content hash');
    expect(issues[0].resourceType).toBe('Observation');
  });

  it('description mentions the count of other members', () => {
    const clusters = [
      {
        hash: 'b'.repeat(64),
        resourceType: 'Observation',
        resources: [
          { id: 'Observation/1', resourceType: 'Observation' },
          { id: 'Observation/2', resourceType: 'Observation' },
          { id: 'Observation/3', resourceType: 'Observation' },
        ],
      },
    ];
    const issues = normalizeContentHashIssues(clusters);
    for (const issue of issues) {
      expect(issue.description).toContain('2 other Observation');
    }
  });

  it('returns empty array for empty cluster list', () => {
    expect(normalizeContentHashIssues([])).toEqual([]);
  });
});
