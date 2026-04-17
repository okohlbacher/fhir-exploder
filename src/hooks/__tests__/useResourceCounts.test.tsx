/**
 * useResourceCounts — Phase 24 Plan 02 tests
 *
 * Covers FOUND-01 (module-scope cache read-through), FOUND-04 (StrictMode
 * cancellation regression), Pitfall 4 (write-through guard on cancelled
 * fetches), Pitfall 8 (test isolation via beforeEach cache wipe).
 *
 * Test list (8):
 *   1. Cache hit on second mount with same (serverUrl, types)
 *   2. Cache miss after clearQualityCountCache(serverUrl)
 *   3. Server isolation — clearQualityCountCache for server A leaves B intact
 *   4. typesKey stability — re-renders with identity-different-but-equal
 *      arrays do NOT re-fire the effect
 *   5. StrictMode + rapid deps change — no late setCounts writes (FOUND-04)
 *   6. Pitfall 4 — write-through guard prevents cancelled fetches from
 *      polluting the module-scope cache
 *   7. Error state is NOT cached — remount re-fetches the errored type
 *   8. clearAllQualityCountCache wipes across servers
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, act, waitFor } from '@testing-library/react';
import { StrictMode, type ReactNode } from 'react';
import type { MedplumClient } from '@medplum/core';

import {
  useResourceCounts,
  clearQualityCountCache,
  clearAllQualityCountCache,
} from '../useResourceCounts';

interface MakeClientOptions {
  delayMs?: number;
  errorTypes?: string[];
}

/**
 * Build a minimal MedplumClient stub. The hook only calls
 * `getBaseUrl()` and `search(type, '_summary=count')`.
 *
 * `as unknown as MedplumClient` is a test-fixture cast (Pitfall 1 concerns
 * consumer panel code, not test fixtures — this is a sanctioned site).
 */
function makeClient(
  baseUrl: string,
  counts: Record<string, number>,
  options: MakeClientOptions = {},
): MedplumClient {
  const { delayMs = 0, errorTypes = [] } = options;
  const search = vi.fn(async (type: string) => {
    if (delayMs > 0) {
      await new Promise((r) => setTimeout(r, delayMs));
    }
    if (errorTypes.includes(type)) {
      throw new Error(`search failed for ${type}`);
    }
    return { resourceType: 'Bundle', total: counts[type] ?? 0 };
  });
  return {
    getBaseUrl: () => baseUrl,
    search,
  } as unknown as MedplumClient;
}

// Per Pitfall 8 — module-scope caches persist across tests by default.
beforeEach(() => {
  clearAllQualityCountCache();
});

afterEach(() => {
  vi.restoreAllMocks();
});

describe('useResourceCounts cache (FOUND-01 + FOUND-04)', () => {
  // -------------------------------------------------------------------------
  // Test 1 — Cache hit: second mount with same (serverUrl, types) does not
  // issue additional client.search calls.
  // -------------------------------------------------------------------------
  it('hits the cache on second mount with same serverUrl + types', async () => {
    const client = makeClient('http://test.example/fhir', { Patient: 42 });

    const { result: r1, unmount } = renderHook(() =>
      useResourceCounts(client, ['Patient']),
    );
    await waitFor(() => expect(r1.current.Patient).toBe(42));
    expect(client.search).toHaveBeenCalledTimes(1);
    unmount();

    const { result: r2 } = renderHook(() =>
      useResourceCounts(client, ['Patient']),
    );
    // Cache hit — synchronously seeded from the module-scope cache, no
    // 'loading' flash and no additional fetch.
    expect(r2.current.Patient).toBe(42);
    expect(client.search).toHaveBeenCalledTimes(1);
  });

  // -------------------------------------------------------------------------
  // Test 2 — Cache miss after clearQualityCountCache triggers a refetch.
  // -------------------------------------------------------------------------
  it('misses cache after clearQualityCountCache and re-fetches', async () => {
    const client = makeClient('http://test.example/fhir', { Patient: 42 });

    const { result: r1, unmount } = renderHook(() =>
      useResourceCounts(client, ['Patient']),
    );
    await waitFor(() => expect(r1.current.Patient).toBe(42));
    expect(client.search).toHaveBeenCalledTimes(1);
    unmount();

    clearQualityCountCache('http://test.example/fhir');

    const { result: r2 } = renderHook(() =>
      useResourceCounts(client, ['Patient']),
    );
    await waitFor(() => expect(r2.current.Patient).toBe(42));
    // Second fetch fired because the cache was cleared.
    expect(client.search).toHaveBeenCalledTimes(2);
  });

  // -------------------------------------------------------------------------
  // Test 3 — Server isolation: clearing server A does not remove server B.
  // -------------------------------------------------------------------------
  it('server isolation — clearQualityCountCache for A leaves B intact', async () => {
    const clientA = makeClient('http://a.example/fhir', { Patient: 10 });
    const clientB = makeClient('http://b.example/fhir', { Patient: 20 });

    // Populate both caches.
    const { result: ra, unmount: unmountA } = renderHook(() =>
      useResourceCounts(clientA, ['Patient']),
    );
    await waitFor(() => expect(ra.current.Patient).toBe(10));
    unmountA();

    const { result: rb, unmount: unmountB } = renderHook(() =>
      useResourceCounts(clientB, ['Patient']),
    );
    await waitFor(() => expect(rb.current.Patient).toBe(20));
    unmountB();

    const initialCallsA = (clientA.search as unknown as { mock: { calls: unknown[] } })
      .mock.calls.length;
    const initialCallsB = (clientB.search as unknown as { mock: { calls: unknown[] } })
      .mock.calls.length;
    expect(initialCallsA).toBe(1);
    expect(initialCallsB).toBe(1);

    // Clear only A.
    clearQualityCountCache('http://a.example/fhir');

    // A now misses → re-fetch.
    const { result: ra2, unmount: unmountA2 } = renderHook(() =>
      useResourceCounts(clientA, ['Patient']),
    );
    await waitFor(() => expect(ra2.current.Patient).toBe(10));
    expect(
      (clientA.search as unknown as { mock: { calls: unknown[] } }).mock.calls.length,
    ).toBe(2);
    unmountA2();

    // B still has cached entry — no additional fetch.
    const { result: rb2 } = renderHook(() =>
      useResourceCounts(clientB, ['Patient']),
    );
    expect(rb2.current.Patient).toBe(20);
    expect(
      (clientB.search as unknown as { mock: { calls: unknown[] } }).mock.calls.length,
    ).toBe(1);
  });

  // -------------------------------------------------------------------------
  // Test 4 — typesKey stability: re-renders with an identity-different-but-
  // equal resourceTypes array don't re-fire the effect.
  // -------------------------------------------------------------------------
  it('typesKey stability — identity-different-but-equal arrays do not refire', async () => {
    const client = makeClient('http://test.example/fhir', { Patient: 7 });

    const { result, rerender } = renderHook(
      ({ types }: { types: string[] }) => useResourceCounts(client, types),
      { initialProps: { types: ['Patient'] } },
    );
    await waitFor(() => expect(result.current.Patient).toBe(7));
    expect(client.search).toHaveBeenCalledTimes(1);

    // Three re-renders with a FRESH array of the same contents. typesKey memo
    // compares the joined string, which is stable; effect must NOT refire.
    rerender({ types: ['Patient'] });
    rerender({ types: ['Patient'] });
    rerender({ types: ['Patient'] });

    // Allow any stray microtasks to settle before asserting call count.
    await act(async () => {
      await Promise.resolve();
    });

    expect(client.search).toHaveBeenCalledTimes(1);
  });

  // -------------------------------------------------------------------------
  // Test 5 — FOUND-04 StrictMode cancellation: rapid deps change while a
  // fetch is in flight must not leak a late setCounts write from the prior
  // effect.
  // -------------------------------------------------------------------------
  it('StrictMode + rapid deps change — no late setCounts from prior effect', async () => {
    const client = makeClient(
      'http://test.example/fhir',
      { Patient: 100, Observation: 200 },
      { delayMs: 50 },
    );

    const wrapper = ({ children }: { children: ReactNode }) => (
      <StrictMode>{children}</StrictMode>
    );

    const { result, rerender } = renderHook(
      ({ types }: { types: string[] }) => useResourceCounts(client, types),
      { wrapper, initialProps: { types: ['Patient'] } },
    );

    // Immediately switch to Observation while Patient fetches are in flight
    // (delayMs=50, rerender fires synchronously).
    rerender({ types: ['Observation'] });

    // Wait past the mock's delay so ALL in-flight fetches settle.
    await new Promise((r) => setTimeout(r, 150));

    await waitFor(() => expect(result.current.Observation).toBe(200));

    // The prior effect's cancelled closure variable was flipped to true
    // during cleanup. Its in-flight Patient promise resolves AFTER the
    // swap, but the `if (cancelled) return` guard prevents both state and
    // cache writes. Therefore Patient must NOT appear in the final state.
    expect(result.current.Patient).toBeUndefined();
  });

  // -------------------------------------------------------------------------
  // Test 6 — Pitfall 4 write-through guard: a fetch cancelled in-flight
  // must NOT pollute the module-scope cache with its resolved value.
  // Verified by unmounting during a delayed fetch, waiting past the delay,
  // then remounting and observing that a fresh fetch occurs (proving the
  // cancelled fetch's value was NOT written to the cache).
  // -------------------------------------------------------------------------
  it('Pitfall 4 — cancelled fetch does not write to the module-scope cache', async () => {
    const client = makeClient(
      'http://test.example/fhir',
      { Patient: 999 },
      { delayMs: 80 },
    );

    const { unmount } = renderHook(() =>
      useResourceCounts(client, ['Patient']),
    );
    // Unmount before the delayed fetch resolves.
    unmount();

    // Let the cancelled fetch resolve past the delay. Its .then handler
    // runs, sees cancelled === true, and returns BEFORE countCache.set.
    await new Promise((r) => setTimeout(r, 150));

    expect(client.search).toHaveBeenCalledTimes(1);

    // Fresh mount — cache must be empty for this type, so a second fetch fires.
    const { result: r2 } = renderHook(() =>
      useResourceCounts(client, ['Patient']),
    );
    await waitFor(() => expect(r2.current.Patient).toBe(999));
    expect(client.search).toHaveBeenCalledTimes(2);
  });

  // -------------------------------------------------------------------------
  // Test 7 — Error state is NOT cached. A failing fetch returns 'error'
  // to consumers but leaves the cache untouched, so a remount retries.
  // -------------------------------------------------------------------------
  it('error state is not cached — remount re-fetches', async () => {
    const client = makeClient(
      'http://test.example/fhir',
      { Patient: 42 },
      { errorTypes: ['Patient'] },
    );

    const { result: r1, unmount } = renderHook(() =>
      useResourceCounts(client, ['Patient']),
    );
    await waitFor(() => expect(r1.current.Patient).toBe('error'));
    expect(client.search).toHaveBeenCalledTimes(1);
    unmount();

    // Second mount: cache is empty for Patient (error was not cached),
    // so another fetch fires.
    const { result: r2 } = renderHook(() =>
      useResourceCounts(client, ['Patient']),
    );
    await waitFor(() => expect(r2.current.Patient).toBe('error'));
    expect(client.search).toHaveBeenCalledTimes(2);
  });

  // -------------------------------------------------------------------------
  // Test 8 — clearAllQualityCountCache wipes across all servers.
  // -------------------------------------------------------------------------
  it('clearAllQualityCountCache wipes entries across all serverUrls', async () => {
    const clientA = makeClient('http://a.example/fhir', { Patient: 10 });
    const clientB = makeClient('http://b.example/fhir', { Patient: 20 });

    // Populate both caches.
    const { result: ra, unmount: uA } = renderHook(() =>
      useResourceCounts(clientA, ['Patient']),
    );
    await waitFor(() => expect(ra.current.Patient).toBe(10));
    uA();

    const { result: rb, unmount: uB } = renderHook(() =>
      useResourceCounts(clientB, ['Patient']),
    );
    await waitFor(() => expect(rb.current.Patient).toBe(20));
    uB();

    expect(client_a_calls(clientA)).toBe(1);
    expect(client_a_calls(clientB)).toBe(1);

    // Nuke all caches.
    clearAllQualityCountCache();

    // Remounting both now triggers fresh fetches.
    const { result: ra2, unmount: uA2 } = renderHook(() =>
      useResourceCounts(clientA, ['Patient']),
    );
    await waitFor(() => expect(ra2.current.Patient).toBe(10));
    uA2();

    const { result: rb2 } = renderHook(() =>
      useResourceCounts(clientB, ['Patient']),
    );
    await waitFor(() => expect(rb2.current.Patient).toBe(20));

    expect(client_a_calls(clientA)).toBe(2);
    expect(client_a_calls(clientB)).toBe(2);
  });
});

// Small helper to read the vi.fn mock-calls length without scattering casts.
function client_a_calls(client: MedplumClient): number {
  return (client.search as unknown as { mock: { calls: unknown[] } }).mock.calls.length;
}
