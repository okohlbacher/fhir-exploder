/**
 * Plan 44-01 Task 7: real assertions for IPS_REGISTRY lazy-load semantics.
 *
 * Verifies the cache + in-flight Promise share invariants that Plan 44-02
 * IPSPanel relies on. Cache is module-scoped, so each test resets it via
 * __resetIpsProfileCacheForTests before exercising first-call paths.
 */
import { describe, it, expect, beforeEach } from 'vitest';
import {
  getIpsProfileForUrl,
  IPS_COMPOSITION_PROFILE_URL,
  __resetIpsProfileCacheForTests,
} from '../getIpsProfileForUrl';

describe('IPS_REGISTRY lazy-load', () => {
  beforeEach(() => {
    __resetIpsProfileCacheForTests();
  });

  it('first call triggers dynamic import and returns the IPS Composition profile', async () => {
    const sd = await getIpsProfileForUrl(IPS_COMPOSITION_PROFILE_URL);
    expect(sd).not.toBeNull();
    expect(sd?.url).toBe(IPS_COMPOSITION_PROFILE_URL);
    expect(sd?.type).toBe('Composition');
    expect(Array.isArray(sd?.snapshot?.element)).toBe(true);
    // Sanity: the snapshot SHOULD have at least 1 section slice element.
    const sectionElements = (sd?.snapshot?.element ?? []).filter((e) =>
      e.path?.startsWith('Composition.section'),
    );
    expect(sectionElements.length).toBeGreaterThan(0);
  });

  it('second call hits cache (same object reference)', async () => {
    const first = await getIpsProfileForUrl(IPS_COMPOSITION_PROFILE_URL);
    const second = await getIpsProfileForUrl(IPS_COMPOSITION_PROFILE_URL);
    expect(second).toBe(first); // strict reference equality
  });

  it('concurrent calls share in-flight Promise', async () => {
    const [a, b] = await Promise.all([
      getIpsProfileForUrl(IPS_COMPOSITION_PROFILE_URL),
      getIpsProfileForUrl(IPS_COMPOSITION_PROFILE_URL),
    ]);
    // Both calls land on the same in-flight Promise (StrictMode-safe).
    expect(a).toBe(b);
  });

  it('returns null for an unknown canonical URL (no thunk in registry)', async () => {
    const sd = await getIpsProfileForUrl(
      'http://nonsense/url-that-is-not-in-IPS_REGISTRY',
    );
    expect(sd).toBeNull();
  });
});
