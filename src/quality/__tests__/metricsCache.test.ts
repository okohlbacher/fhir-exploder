/**
 * Tests for the per-serverUrl QualityMetricsCache registry — FOUND-02.
 *
 * The registry replaces the two rotating `cacheInstance` singletons in
 * useCompletenessReport + useCodingCoverage with a single 2-entry LRU
 * `Map<serverUrl, QualityMetricsCache>` so an A/B server toggle stays
 * cache-warm. PITFALLS Pitfall 3: the LRU bound prevents unbounded
 * accumulation across many distinct serverUrls.
 *
 * MRU touch on `get` keeps the most-recently-touched entry alive when
 * a third unique serverUrl is requested.
 */
import { describe, it, expect, beforeEach } from 'vitest';

import {
  QualityMetricsCache,
  getQualityMetricsCache,
  clearQualityMetricsCache,
  clearAllQualityMetrics,
} from '../metricsCache';
import { LOCAL_STORAGE_PREFIX } from '../keys';

const URL_A = 'http://a.example/fhir';
const URL_B = 'http://b.example/fhir';
const URL_C = 'http://c.example/fhir';

beforeEach(() => {
  // Pitfall 8 / W-24-03-03 — wipe registry AND localStorage between tests.
  clearAllQualityMetrics();
  if (typeof localStorage !== 'undefined') localStorage.clear();
});

describe('QualityMetricsCache registry — FOUND-02', () => {
  it('returns the SAME instance on repeat calls for the same serverUrl', () => {
    const first = getQualityMetricsCache(URL_A);
    const second = getQualityMetricsCache(URL_A);
    expect(first).toBeInstanceOf(QualityMetricsCache);
    expect(second).toBe(first);
  });

  it('evicts the oldest entry when a third distinct serverUrl is added (2-entry LRU)', () => {
    const a1 = getQualityMetricsCache(URL_A);
    getQualityMetricsCache(URL_B);
    getQualityMetricsCache(URL_C);
    // a was inserted first and never touched -> evicted
    const a2 = getQualityMetricsCache(URL_A);
    expect(a2).not.toBe(a1);
  });

  it('MRU touch on get keeps the touched entry alive', () => {
    const a1 = getQualityMetricsCache(URL_A);
    const b1 = getQualityMetricsCache(URL_B);
    // Touch A so it becomes MRU; B is now the oldest.
    const aTouched = getQualityMetricsCache(URL_A);
    expect(aTouched).toBe(a1);
    // Insert C — B should be evicted, A retained.
    getQualityMetricsCache(URL_C);
    const a2 = getQualityMetricsCache(URL_A);
    const b2 = getQualityMetricsCache(URL_B);
    expect(a2).toBe(a1);
    expect(b2).not.toBe(b1);
  });

  it('clearQualityMetricsCache removes the entry from the registry', () => {
    const a1 = getQualityMetricsCache(URL_A);
    a1.set('k1', {
      value: 'v1',
      computedAt: Date.now(),
      serverUrl: URL_A,
      resourceType: 'Patient',
      sampleSize: 100,
    });
    expect(a1.size()).toBe(1);
    clearQualityMetricsCache(URL_A);
    const a2 = getQualityMetricsCache(URL_A);
    expect(a2).not.toBe(a1);
    expect(a2.size()).toBe(0);
  });

  it('clearQualityMetricsCache wipes the localStorage namespace for that server', () => {
    const a = getQualityMetricsCache(URL_A);
    a.set('k1', {
      value: 'v1',
      computedAt: Date.now(),
      serverUrl: URL_A,
      resourceType: 'Patient',
      sampleSize: 100,
    });
    // Confirm something landed in localStorage with the server namespace.
    const prefix = `${LOCAL_STORAGE_PREFIX}${URL_A}|`;
    let preCount = 0;
    for (let i = 0; i < localStorage.length; i++) {
      const k = localStorage.key(i);
      if (k && k.startsWith(prefix)) preCount++;
    }
    expect(preCount).toBeGreaterThan(0);

    clearQualityMetricsCache(URL_A);

    let postCount = 0;
    for (let i = 0; i < localStorage.length; i++) {
      const k = localStorage.key(i);
      if (k && k.startsWith(prefix)) postCount++;
    }
    expect(postCount).toBe(0);
  });

  it('clearAllQualityMetrics drops every registry entry as well', () => {
    const a1 = getQualityMetricsCache(URL_A);
    const b1 = getQualityMetricsCache(URL_B);
    clearAllQualityMetrics();
    const a2 = getQualityMetricsCache(URL_A);
    const b2 = getQualityMetricsCache(URL_B);
    expect(a2).not.toBe(a1);
    expect(b2).not.toBe(b1);
  });

  it('beforeEach isolates the registry between tests', () => {
    // If the prior test had leaked, calling get here would either return a
    // pre-existing instance OR find pre-populated entries. Assert clean.
    const a = getQualityMetricsCache(URL_A);
    expect(a.size()).toBe(0);
  });
});
