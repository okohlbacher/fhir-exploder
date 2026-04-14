import { describe, it, expect, vi } from 'vitest';
import { ValueSetCache } from './valueSetCache';

function mockClient(response: unknown, shouldThrow = false) {
  const get = shouldThrow
    ? vi.fn().mockRejectedValue(new Error('Network error'))
    : vi.fn().mockResolvedValue(response);
  return { get } as unknown as import('@medplum/core').MedplumClient;
}

describe('ValueSetCache', () => {
  it('expand() returns a Set of "system|code" strings for a successful $expand', async () => {
    const client = mockClient({
      expansion: {
        contains: [
          { system: 'http://loinc.org', code: '12345-6' },
          { system: 'http://loinc.org', code: '78910-1' },
        ],
      },
    });
    const cache = new ValueSetCache();
    const result = await cache.expand(client, 'http://example.com/vs');
    expect(result).toBeInstanceOf(Set);
    expect(result!.size).toBe(2);
    expect(result!.has('http://loinc.org|12345-6')).toBe(true);
    expect(result!.has('http://loinc.org|78910-1')).toBe(true);
  });

  it('expand() returns the same cached Set on second call (no duplicate HTTP request)', async () => {
    const client = mockClient({
      expansion: {
        contains: [{ system: 'http://loinc.org', code: '12345-6' }],
      },
    });
    const cache = new ValueSetCache();
    const first = await cache.expand(client, 'http://example.com/vs');
    const second = await cache.expand(client, 'http://example.com/vs');
    expect(first).toBe(second); // same object reference
    expect((client as any).get).toHaveBeenCalledTimes(1);
  });

  it('expand() coalesces concurrent requests for the same valueSet URL into one HTTP call', async () => {
    let resolveGet: (v: unknown) => void;
    const getPromise = new Promise((r) => {
      resolveGet = r;
    });
    const get = vi.fn().mockReturnValue(getPromise);
    const client = { get } as unknown as import('@medplum/core').MedplumClient;

    const cache = new ValueSetCache();
    const p1 = cache.expand(client, 'http://example.com/vs');
    const p2 = cache.expand(client, 'http://example.com/vs');

    resolveGet!({
      expansion: {
        contains: [{ system: 'http://snomed.info/sct', code: '123' }],
      },
    });

    const [r1, r2] = await Promise.all([p1, p2]);
    expect(r1).toBe(r2);
    expect(get).toHaveBeenCalledTimes(1);
  });

  it('expand() returns null when the terminology server returns an error', async () => {
    const client = mockClient(null, true);
    const cache = new ValueSetCache();
    const result = await cache.expand(client, 'http://example.com/vs');
    expect(result).toBeNull();
    expect(cache.isAvailable()).toBe(false);
  });

  it('expand() caps cached sets at 50000 entries to prevent memory exhaustion', async () => {
    const contains = Array.from({ length: 60000 }, (_, i) => ({
      system: 'http://example.com',
      code: `code-${i}`,
    }));
    const client = mockClient({ expansion: { contains } });
    const cache = new ValueSetCache();
    const result = await cache.expand(client, 'http://example.com/vs');
    expect(result).not.toBeNull();
    expect(result!.size).toBe(50000);
  });

  it('expand() validates that expansion.contains entries have system and code before adding', async () => {
    const client = mockClient({
      expansion: {
        contains: [
          { system: 'http://loinc.org', code: '12345-6' },
          { system: null, code: '99999-9' },
          { code: '11111-1' },
          { system: 'http://loinc.org' },
          {},
          { system: 'http://loinc.org', code: '78910-1' },
        ],
      },
    });
    const cache = new ValueSetCache();
    const result = await cache.expand(client, 'http://example.com/vs');
    expect(result).not.toBeNull();
    expect(result!.size).toBe(2);
    expect(result!.has('http://loinc.org|12345-6')).toBe(true);
    expect(result!.has('http://loinc.org|78910-1')).toBe(true);
  });
});
