/**
 * DQ-09 -- reference walker + checker unit tests.
 *
 * Plan 17-01 delivers:
 *   - src/quality/referenceWalker.ts
 *       extractReferences(resource): ExtractedReference[]
 *   - src/quality/referenceChecker.ts
 *       checkReferencesExist(client, refs, options): Promise<Set<string>>
 *       normalizeBrokenRefIssues(brokenRefs, refMap): NormalizedIssue[]
 *
 * Critical behaviors tested here:
 * - D-06: reference extraction handles relative, absolute, skips contained/URN
 * - Batched existence check via _id search with concurrency limit
 * - Fallback when _elements query param is unsupported
 */
import { describe, it, expect, vi } from 'vitest';
import type { MedplumClient } from '@medplum/core';
import type { Resource } from '@medplum/fhirtypes';
import { extractReferences } from '../quality/referenceWalker';
import {
  checkReferencesExist,
  normalizeBrokenRefIssues,
} from '../quality/referenceChecker';

describe('extractReferences (DQ-09)', () => {
  it('extracts a top-level Reference with its JSON path', () => {
    const enc = {
      resourceType: 'Encounter',
      id: 'e1',
      subject: { reference: 'Patient/123' },
    } as unknown as Resource;
    const refs = extractReferences(enc);
    expect(refs).toHaveLength(1);
    expect(refs[0].reference).toBe('Patient/123');
    expect(refs[0].path).toBe('Encounter.subject.reference');
  });

  it('skips references starting with # (contained resources)', () => {
    const res = {
      resourceType: 'Observation',
      id: 'o1',
      subject: { reference: '#contained1' },
    } as unknown as Resource;
    expect(extractReferences(res)).toHaveLength(0);
  });

  it('skips URN references (urn:uuid:...)', () => {
    const res = {
      resourceType: 'Observation',
      id: 'o1',
      subject: { reference: 'urn:uuid:12345' },
    } as unknown as Resource;
    expect(extractReferences(res)).toHaveLength(0);
  });

  it('normalizes absolute URLs to relative Type/id', () => {
    const res = {
      resourceType: 'Observation',
      id: 'o1',
      subject: { reference: 'http://server.example/fhir/Patient/123' },
    } as unknown as Resource;
    const refs = extractReferences(res);
    expect(refs).toHaveLength(1);
    expect(refs[0].reference).toBe('Patient/123');
  });

  it('handles https absolute URLs', () => {
    const res = {
      resourceType: 'Observation',
      id: 'o1',
      subject: { reference: 'https://fhir.example.org/R4/Patient/abc-def' },
    } as unknown as Resource;
    const refs = extractReferences(res);
    expect(refs).toHaveLength(1);
    expect(refs[0].reference).toBe('Patient/abc-def');
  });

  it('handles references nested inside arrays', () => {
    const res = {
      resourceType: 'Encounter',
      id: 'e1',
      participant: [
        { actor: { reference: 'Practitioner/555' } },
        { actor: { reference: 'Practitioner/666' } },
      ],
    } as unknown as Resource;
    const refs = extractReferences(res);
    expect(refs).toHaveLength(2);
    expect(refs.map((r) => r.reference).sort()).toEqual([
      'Practitioner/555',
      'Practitioner/666',
    ]);
    // Path should reflect array index
    expect(refs[0].path).toContain('participant[0]');
    expect(refs[1].path).toContain('participant[1]');
  });

  it('returns empty array for a resource with no references', () => {
    const res = {
      resourceType: 'Patient',
      id: 'p1',
      gender: 'male',
    } as unknown as Resource;
    expect(extractReferences(res)).toEqual([]);
  });

  it('skips malformed absolute URLs that have no Type/id tail', () => {
    const res = {
      resourceType: 'Observation',
      id: 'o1',
      subject: { reference: 'http://server' },
    } as unknown as Resource;
    expect(extractReferences(res)).toHaveLength(0);
  });
});

describe('checkReferencesExist (DQ-09)', () => {
  function makeClient(options: {
    existing: Record<string, string[]>;
    failOnElements?: boolean;
    onSearch?: (type: string, params: Record<string, string>) => void;
  }): MedplumClient {
    const { existing, failOnElements = false, onSearch } = options;
    const searchResources = vi.fn(
      async (type: string, params: Record<string, string>) => {
        onSearch?.(type, params);
        if (failOnElements && params._elements !== undefined) {
          throw new Error('_elements not supported');
        }
        const requestedIds = (params._id ?? '').split(',').filter(Boolean);
        const foundIds = requestedIds.filter((id) =>
          (existing[type] ?? []).includes(id),
        );
        return foundIds.map((id) => ({ resourceType: type, id }));
      },
    );
    return {
      searchResources,
    } as unknown as MedplumClient;
  }

  it('returns empty set when all references exist', async () => {
    const client = makeClient({ existing: { Patient: ['1', '2'] } });
    const broken = await checkReferencesExist(client, [
      { path: 'Obs.subject.reference', reference: 'Patient/1' },
      { path: 'Obs.subject.reference', reference: 'Patient/2' },
    ]);
    expect(broken.size).toBe(0);
  });

  it('returns set of broken references', async () => {
    const client = makeClient({ existing: { Patient: ['1'] } });
    const broken = await checkReferencesExist(client, [
      { path: 'Obs.subject.reference', reference: 'Patient/1' },
      { path: 'Obs.subject.reference', reference: 'Patient/999' },
    ]);
    expect(broken.size).toBe(1);
    expect(broken.has('Patient/999')).toBe(true);
  });

  it('batches by type via _id parameter', async () => {
    const calls: Array<{ type: string; params: Record<string, string> }> = [];
    const client = makeClient({
      existing: { Patient: ['1', '2', '3'] },
      onSearch: (type, params) => calls.push({ type, params }),
    });
    await checkReferencesExist(
      client,
      [
        { path: 'x', reference: 'Patient/1' },
        { path: 'x', reference: 'Patient/2' },
        { path: 'x', reference: 'Patient/3' },
      ],
      { batchSize: 50, concurrency: 5 },
    );
    expect(calls.length).toBeGreaterThanOrEqual(1);
    expect(calls[0].type).toBe('Patient');
    expect(calls[0].params._id).toContain(',');
  });

  it('respects batchSize parameter', async () => {
    const calls: Array<{ type: string; params: Record<string, string> }> = [];
    const ids = Array.from({ length: 10 }, (_, i) => String(i + 1));
    const client = makeClient({
      existing: { Patient: ids },
      onSearch: (type, params) => calls.push({ type, params }),
    });
    await checkReferencesExist(
      client,
      ids.map((id) => ({ path: 'x', reference: `Patient/${id}` })),
      { batchSize: 3, concurrency: 5 },
    );
    // 10 ids / batchSize 3 = 4 batches
    expect(calls.length).toBe(4);
  });

  it('falls back to search without _elements when that fails', async () => {
    const client = makeClient({
      existing: { Patient: ['1'] },
      failOnElements: true,
    });
    const broken = await checkReferencesExist(client, [
      { path: 'x', reference: 'Patient/1' },
    ]);
    expect(broken.size).toBe(0);
  });

  it('respects concurrency limit (max N in flight at once)', async () => {
    let inFlight = 0;
    let maxInFlight = 0;
    const client = {
      searchResources: vi.fn(async (type: string, params: Record<string, string>) => {
        inFlight++;
        maxInFlight = Math.max(maxInFlight, inFlight);
        await new Promise((r) => setTimeout(r, 5));
        inFlight--;
        const ids = (params._id ?? '').split(',').filter(Boolean);
        return ids.map((id) => ({ resourceType: type, id }));
      }),
    } as unknown as MedplumClient;
    // 30 refs, batchSize 3 => 10 batches. Concurrency=2.
    const refs = Array.from({ length: 30 }, (_, i) => ({
      path: 'x',
      reference: `Patient/${i}`,
    }));
    await checkReferencesExist(client, refs, { batchSize: 3, concurrency: 2 });
    expect(maxInFlight).toBeLessThanOrEqual(2);
  });
});

describe('checkReferencesExist — FIX-04 FHIR_ID_PATTERN validation', () => {
  it('skips references with trailing-slash ids (does not add to _id batch)', async () => {
    const searchResourcesMock = vi.fn().mockResolvedValue([]);
    const client = { searchResources: searchResourcesMock } as unknown as MedplumClient;
    const refs = [
      { reference: 'Patient/123/', path: 'Encounter.subject.reference' },
    ] as Parameters<typeof checkReferencesExist>[1];
    const result = await checkReferencesExist(client, refs);
    expect(searchResourcesMock).not.toHaveBeenCalled();
    expect(result.size).toBe(0);
  });

  it('processes valid ids and skips invalid ones in a mixed batch', async () => {
    const searchResourcesMock = vi.fn().mockResolvedValue([{ id: 'valid-id' }]);
    const client = { searchResources: searchResourcesMock } as unknown as MedplumClient;
    const refs = [
      { reference: 'Patient/valid-id', path: 'a.b' },
      { reference: 'Patient/bad/', path: 'a.c' },
      { reference: 'Patient/also bad space', path: 'a.d' },
    ] as Parameters<typeof checkReferencesExist>[1];
    await checkReferencesExist(client, refs);
    expect(searchResourcesMock).toHaveBeenCalledTimes(1);
    const callArgs = searchResourcesMock.mock.calls[0];
    // callArgs: [resourceType, searchParams]
    expect(callArgs[1]._id).toBe('valid-id');
    expect(callArgs[1]._id).not.toContain('bad');
  });

  it('regression: existing valid references still flow through unchanged', async () => {
    const searchResourcesMock = vi
      .fn()
      .mockResolvedValue([{ id: '1' }, { id: '2' }]);
    const client = { searchResources: searchResourcesMock } as unknown as MedplumClient;
    const refs = [
      { reference: 'Patient/1', path: 'a.b' },
      { reference: 'Patient/2', path: 'a.c' },
    ] as Parameters<typeof checkReferencesExist>[1];
    const result = await checkReferencesExist(client, refs);
    expect(searchResourcesMock).toHaveBeenCalledTimes(1);
    expect(result.size).toBe(0);
  });
});

describe('normalizeBrokenRefIssues (DQ-09)', () => {
  it('emits one issue per source reference to the broken target', () => {
    const brokenRefs = new Set<string>(['Patient/999']);
    const refMap = new Map<
      string,
      Array<{ sourceId: string; sourceType: string; path: string }>
    >([
      [
        'Patient/999',
        [
          {
            sourceId: 'e1',
            sourceType: 'Encounter',
            path: 'Encounter.subject.reference',
          },
        ],
      ],
    ]);
    const issues = normalizeBrokenRefIssues(brokenRefs, refMap);
    expect(issues).toHaveLength(1);
    expect(issues[0].description).toContain('[broken-ref]');
    expect(issues[0].description).toContain('Patient/999');
    expect(issues[0].severity).toBe('warning');
    expect(issues[0].resourceId).toBe('Encounter/e1');
    expect(issues[0].resourceType).toBe('Encounter');
    expect(issues[0].field).toBe('Encounter.subject.reference');
  });

  it('emits multiple issues when the same broken ref has multiple sources', () => {
    const brokenRefs = new Set<string>(['Patient/999']);
    const refMap = new Map<
      string,
      Array<{ sourceId: string; sourceType: string; path: string }>
    >([
      [
        'Patient/999',
        [
          { sourceId: 'e1', sourceType: 'Encounter', path: 'Encounter.subject.reference' },
          { sourceId: 'o1', sourceType: 'Observation', path: 'Observation.subject.reference' },
        ],
      ],
    ]);
    const issues = normalizeBrokenRefIssues(brokenRefs, refMap);
    expect(issues).toHaveLength(2);
  });

  it('returns empty array for empty broken set', () => {
    expect(normalizeBrokenRefIssues(new Set(), new Map())).toEqual([]);
  });
});
