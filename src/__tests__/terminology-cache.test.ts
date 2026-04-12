import { describe, it, expect, beforeEach } from 'vitest';
import { TerminologyCache } from '../terminology/TerminologyCache';
import {
  LOCAL_STORAGE_PREFIX,
  makeTerminologyKey,
  parseTerminologyKey,
} from '../terminology/terminologyKey';
import type { TerminologyCacheEntry } from '../terminology/types';

const SERVER_X = 'https://r4.ontoserver.csiro.au/fhir';
const SERVER_Y = 'https://terminology.medizininformatik-initiative.de/fhir';
const SNOMED = 'http://snomed.info/sct';

function makeEntry(display: string | null, resolvedAt = Date.now()): TerminologyCacheEntry {
  return { display, resolvedAt, ttlMs: 24 * 60 * 60 * 1000 };
}

describe('terminologyKey', () => {
  it('LOCAL_STORAGE_PREFIX is exactly "tx-cache:v1:"', () => {
    expect(LOCAL_STORAGE_PREFIX).toBe('tx-cache:v1:');
  });

  it('makeTerminologyKey joins server|system|code with pipes', () => {
    expect(makeTerminologyKey(SERVER_X, SNOMED, '73211009')).toBe(
      `${SERVER_X}|${SNOMED}|73211009`,
    );
  });

  it('parseTerminologyKey is the inverse of makeTerminologyKey', () => {
    const key = makeTerminologyKey(SERVER_X, SNOMED, '73211009');
    const parsed = parseTerminologyKey(key);
    expect(parsed).toEqual({ serverUrl: SERVER_X, system: SNOMED, code: '73211009' });
  });

  it('parseTerminologyKey returns null for malformed keys', () => {
    expect(parseTerminologyKey('bad-key')).toBeNull();
  });
});

describe('TerminologyCache', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it('cache hit dedup', () => {
    const cache = new TerminologyCache({ serverUrl: SERVER_X });
    const key = makeTerminologyKey(SERVER_X, SNOMED, '73211009');
    const entry = makeEntry('Diabetes mellitus');

    expect(cache.get(key)).toBeUndefined();
    cache.set(key, entry);
    expect(cache.get(key)).toEqual(entry);
  });

  it('localStorage roundtrip', () => {
    const writer = new TerminologyCache({ serverUrl: SERVER_X });
    const key = makeTerminologyKey(SERVER_X, SNOMED, '73211009');
    const entry = makeEntry('Diabetes mellitus');
    writer.set(key, entry);

    const reader = new TerminologyCache({ serverUrl: SERVER_X });
    expect(reader.get(key)).toEqual(entry);
  });

  it('server url namespace', () => {
    const a = new TerminologyCache({ serverUrl: SERVER_X });
    const keyX = makeTerminologyKey(SERVER_X, SNOMED, '73211009');
    a.set(keyX, makeEntry('Diabetes mellitus'));

    const b = new TerminologyCache({ serverUrl: SERVER_Y });
    expect(b.get(keyX)).toBeUndefined();
    expect(b.size()).toBe(0);
  });

  it('LRU eviction above MEMORY_LIMIT', () => {
    const cache = new TerminologyCache({
      serverUrl: SERVER_X,
      persistToLocalStorage: false,
    });
    const firstKey = `${SERVER_X}|${SNOMED}|0`;
    for (let i = 0; i <= 10_000; i++) {
      cache.set(`${SERVER_X}|${SNOMED}|${i}`, makeEntry(`entry-${i}`, i));
    }
    expect(cache.size()).toBe(10_000);
    expect(cache.get(firstKey)).toBeUndefined();
    // Newest entry still present
    expect(cache.get(`${SERVER_X}|${SNOMED}|10000`)).toBeDefined();
  });

  it('clear removes memory and localStorage', () => {
    const cache = new TerminologyCache({ serverUrl: SERVER_X });
    const key = makeTerminologyKey(SERVER_X, SNOMED, '73211009');
    cache.set(key, makeEntry('Diabetes mellitus'));

    expect(cache.size()).toBe(1);
    cache.clear();
    expect(cache.size()).toBe(0);

    let foundPrefixKey = false;
    for (let i = 0; i < localStorage.length; i++) {
      const k = localStorage.key(i);
      if (k && k.startsWith(LOCAL_STORAGE_PREFIX)) {
        foundPrefixKey = true;
        break;
      }
    }
    expect(foundPrefixKey).toBe(false);
  });
});
