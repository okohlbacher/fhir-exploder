/**
 * Plan 21-03 — active tests for `sampleResources` patient-scoping extension.
 *
 * Every `it()` name matches a VALIDATION.md `-t "…"` filter so Plan 21-03's
 * automation commands resolve to concrete specs:
 *   - `-t "short GET"`              (CHRT-03 — ≤40 IDs → GET ?patient=…)
 *   - `-t "long POST"`              (CHRT-03 — >40 IDs → POST /_search body)
 *   - `-t "Patient uses _id"`       (CHRT-03 — Patient resource scopes via _id=)
 *   - `-t "empty array"`            (CHRT-03 — empty patientIds === no scoping)
 *   - `-t "backward-compatible"`    (CHRT-03 — existing 3-arg form unchanged)
 *
 * Mock shape mirrors src/quality/__tests__/pdfExport.test.ts.
 *
 * Threat T-21-03: every test ID is synthetic (`p-001`, `p1` etc.).
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import type { MedplumClient } from '@medplum/core';
import type { Bundle, Resource } from '@medplum/fhirtypes';
import { sampleResources, SHORT_QUERY_THRESHOLD } from './sampling';

function makeMockClient() {
  const searchResources = vi.fn().mockResolvedValue([]);
  const post = vi
    .fn()
    .mockResolvedValue({ entry: [] } satisfies Bundle<Resource>);
  const fhirUrl = vi.fn(
    (type: string, op: string) => new URL(`http://fake/fhir/${type}/${op}`),
  );
  return {
    client: {
      searchResources,
      post,
      fhirUrl,
    } as unknown as MedplumClient,
    searchResources,
    post,
    fhirUrl,
  };
}

describe('sampleResources with patient scoping', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('short GET: ≤40 patient IDs uses ?patient= query param', async () => {
    const { client, searchResources, post } = makeMockClient();
    await sampleResources(client, 'Observation', 50, ['p1', 'p2', 'p3']);

    expect(post).not.toHaveBeenCalled();
    expect(searchResources).toHaveBeenCalledTimes(1);
    expect(searchResources).toHaveBeenCalledWith(
      'Observation',
      expect.objectContaining({
        _count: '50',
        patient: 'Patient/p1,Patient/p2,Patient/p3',
      }),
    );
  });

  it('short GET: exactly 40 patient IDs still uses GET (threshold boundary)', async () => {
    const { client, searchResources, post } = makeMockClient();
    const ids = Array.from({ length: SHORT_QUERY_THRESHOLD }, (_, i) => `p${i}`);
    await sampleResources(client, 'Observation', 100, ids);

    expect(post).not.toHaveBeenCalled();
    expect(searchResources).toHaveBeenCalledTimes(1);
    const call = searchResources.mock.calls[0];
    expect(call[0]).toBe('Observation');
    expect(call[1]).toMatchObject({ _count: '100' });
    expect((call[1] as Record<string, string>).patient).toContain('Patient/p0');
    expect((call[1] as Record<string, string>).patient).toContain('Patient/p39');
  });

  it('long POST: >40 patient IDs uses POST /_search form body', async () => {
    const { client, searchResources, post, fhirUrl } = makeMockClient();
    const ids = Array.from(
      { length: SHORT_QUERY_THRESHOLD + 1 },
      (_, i) => `p${i}`,
    );
    await sampleResources(client, 'Observation', 1000, ids);

    expect(searchResources).not.toHaveBeenCalled();
    expect(fhirUrl).toHaveBeenCalledWith('Observation', '_search');
    expect(post).toHaveBeenCalledTimes(1);

    const [url, body, contentType] = post.mock.calls[0];
    expect(url).toBe('http://fake/fhir/Observation/_search');
    expect(typeof body).toBe('string');
    // URL-encoded form body — Patient%2F is 'Patient/' encoded, %2C is ','
    // First ID (p0) appears right after `patient=`; subsequent IDs after %2C.
    expect(body).toContain('patient=Patient%2Fp0');
    expect(body).toContain('%2CPatient%2Fp1');
    expect(body).toContain('%2CPatient%2Fp40');
    expect(body).toContain('_count=1000');
    expect(contentType).toBe('application/x-www-form-urlencoded');
  });

  it('Patient uses _id not patient param', async () => {
    const { client, searchResources } = makeMockClient();
    await sampleResources(client, 'Patient', 50, ['p1', 'p2']);

    expect(searchResources).toHaveBeenCalledTimes(1);
    const call = searchResources.mock.calls[0];
    expect(call[0]).toBe('Patient');
    const params = call[1] as Record<string, string>;
    // _id = bare IDs, no Patient/ prefix
    expect(params._id).toBe('p1,p2');
    expect(params.patient).toBeUndefined();
  });

  it('Patient long POST uses _id in form body', async () => {
    const { client, post } = makeMockClient();
    const ids = Array.from(
      { length: SHORT_QUERY_THRESHOLD + 1 },
      (_, i) => `pat${i}`,
    );
    await sampleResources(client, 'Patient', 200, ids);

    expect(post).toHaveBeenCalledTimes(1);
    const [, body] = post.mock.calls[0];
    expect(body).toContain('_id=pat0');
    // Must NOT contain `patient=` (wrong param for Patient type)
    expect(body).not.toMatch(/(^|&)patient=/);
  });

  it('empty array equivalent to no scoping', async () => {
    const { client, searchResources, post } = makeMockClient();
    await sampleResources(client, 'Observation', 50, []);

    expect(post).not.toHaveBeenCalled();
    expect(searchResources).toHaveBeenCalledTimes(1);
    const params = searchResources.mock.calls[0][1] as Record<string, string>;
    expect(params).toEqual({ _count: '50' });
    expect(params.patient).toBeUndefined();
    expect(params._id).toBeUndefined();
  });

  it('backward-compatible: 3-arg form unchanged', async () => {
    const { client, searchResources, post } = makeMockClient();
    await sampleResources(client, 'Observation', 50);

    expect(post).not.toHaveBeenCalled();
    expect(searchResources).toHaveBeenCalledTimes(1);
    expect(searchResources).toHaveBeenCalledWith('Observation', {
      _count: '50',
    });
  });

  it('long POST returns bundle.entry resources (matches GET shape)', async () => {
    const { client, post } = makeMockClient();
    const fakeResources: Resource[] = [
      { resourceType: 'Observation', id: 'o1' },
      { resourceType: 'Observation', id: 'o2' },
    ];
    post.mockResolvedValueOnce({
      entry: fakeResources.map((r) => ({ resource: r })),
    } satisfies Bundle<Resource>);

    const ids = Array.from(
      { length: SHORT_QUERY_THRESHOLD + 1 },
      (_, i) => `p${i}`,
    );
    const result = await sampleResources(client, 'Observation', 100, ids);

    expect(result).toEqual(fakeResources);
  });
});
