import { describe, it, expect, vi } from 'vitest';
import type { MedplumClient } from '@medplum/core';
import type { Bundle } from '@medplum/fhirtypes';
import { searchByIdentifierPrefix } from '../searchByIdentifierPrefix';

/**
 * Build a minimal MedplumClient stub that records `get()` calls and returns
 * pre-configured Bundles by call index. `fhirUrl(path)` is a passthrough
 * returning `{ toString: () => path }` — preserves the exact URL the helper
 * builds so assertions can inspect it.
 */
function makeClient(responses: unknown[]): { client: MedplumClient; get: ReturnType<typeof vi.fn> } {
  const queue = [...responses];
  const get = vi.fn(async () => {
    if (queue.length === 0) throw new Error('unexpected extra client.get call');
    return queue.shift();
  });
  const fhirUrl = (path: string) => ({ toString: () => path });
  const client = { get, fhirUrl } as unknown as MedplumClient;
  return { client, get };
}

function idBundle(ids: string[]): Bundle {
  return {
    resourceType: 'Bundle',
    type: 'searchset',
    entry: ids.map((id) => ({ resource: { resourceType: 'Patient', id } })),
  };
}

function fullBundle(ids: string[]): Bundle {
  return {
    resourceType: 'Bundle',
    type: 'searchset',
    total: ids.length, // server's total for THIS page; helper should override with full match count
    entry: ids.map((id) => ({
      resource: { resourceType: 'Patient', id, gender: 'male' },
    })),
  };
}

describe('searchByIdentifierPrefix', () => {
  it('matches prefix and returns bundle with total = full match count (test 1)', async () => {
    const { client, get } = makeClient([
      idBundle(['abc1', 'abc2', 'xyz']),
      fullBundle(['abc1', 'abc2']),
    ]);

    const result = await searchByIdentifierPrefix(client, 'Patient', 'abc');

    expect(get).toHaveBeenCalledTimes(2);
    const secondUrl = get.mock.calls[1][0] as string;
    expect(secondUrl).toBe('Patient?_id=abc1,abc2&_count=20');
    expect(result.total).toBe(2);
    expect(result.entry?.length).toBe(2);
  });

  it('returns empty searchset when no IDs match the prefix (test 2)', async () => {
    const { client, get } = makeClient([
      idBundle(['abc1', 'abc2', 'xyz']),
    ]);

    const result = await searchByIdentifierPrefix(client, 'Patient', 'zzz');

    expect(get).toHaveBeenCalledTimes(1); // no second fetch
    expect(result).toEqual({
      resourceType: 'Bundle',
      type: 'searchset',
      total: 0,
      entry: [],
    });
  });

  it('truncates pageIds to pageSize and preserves full match count in total (test 3)', async () => {
    const matchingIds = Array.from({ length: 50 }, (_, i) => `abc${i}`);
    const pageIds = matchingIds.slice(0, 10);
    const { client, get } = makeClient([
      idBundle(matchingIds),
      fullBundle(pageIds),
    ]);

    const result = await searchByIdentifierPrefix(client, 'Patient', 'abc', { pageSize: 10 });

    const secondUrl = get.mock.calls[1][0] as string;
    expect(secondUrl).toBe(`Patient?_id=${pageIds.join(',')}&_count=10`);
    // Total should be ALL matches (50), not just the page (10)
    expect(result.total).toBe(50);
    expect(result.entry?.length).toBe(10);
  });

  it('honors custom limit for the initial ID fetch (test 4)', async () => {
    const { client, get } = makeClient([
      idBundle([]),
    ]);

    await searchByIdentifierPrefix(client, 'Patient', 'abc', { limit: 100 });

    const firstUrl = get.mock.calls[0][0] as string;
    expect(firstUrl).toBe('Patient?_elements=id&_count=100');
  });

  it('uses default limit=5000 and pageSize=20 when no options supplied (test 5)', async () => {
    const { client, get } = makeClient([
      idBundle(['abc1']),
      fullBundle(['abc1']),
    ]);

    await searchByIdentifierPrefix(client, 'Patient', 'abc');

    const firstUrl = get.mock.calls[0][0] as string;
    const secondUrl = get.mock.calls[1][0] as string;
    expect(firstUrl).toBe('Patient?_elements=id&_count=5000');
    expect(secondUrl).toBe('Patient?_id=abc1&_count=20');
  });

  it('parameterizes the resource type (test 6)', async () => {
    const { client, get } = makeClient([
      idBundle([]),
    ]);

    await searchByIdentifierPrefix(client, 'Observation', 'obs');

    const firstUrl = get.mock.calls[0][0] as string;
    expect(firstUrl.startsWith('Observation?_elements=id')).toBe(true);
  });
});
