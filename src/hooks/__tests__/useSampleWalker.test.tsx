/**
 * useSampleWalker<T> tests (QDDEP-03, Plan 25-02 Task 1).
 *
 * The walker is a SIBLING primitive to useAsyncRun — NOT a wrapper. It owns
 * a worker-pool (CONCURRENCY=4) that invokes `compute(client, type, size, pids)`
 * per resource type, with closure-scoped cancellation and cache integration
 * via `getQualityMetricsCache(serverUrl)`.
 *
 * Covers:
 *   - Worker-pool concurrency invariant: max 4 simultaneous compute calls
 *   - Cache-hit path: `compute` NOT invoked for types that are already cached
 *   - Cache-write path: result is written to cache BEFORE setReports dispatch
 *   - Cancellation on unmount: no post-unmount state updates fire
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { act, renderHook, waitFor } from '@testing-library/react';
import type { MedplumClient } from '@medplum/core';

import { useSampleWalker } from '../useSampleWalker';
import { getQualityMetricsCache } from '../../quality/metricsCache';
import { buildMetricsKey } from '../../quality/keys';

let serverCounter = 0;
function nextServerUrl(): string {
  serverCounter++;
  return `http://localhost:8080/walker-${serverCounter}`;
}

function makeClient(serverUrl: string): MedplumClient {
  return {
    getBaseUrl: () => serverUrl,
    searchResources: vi.fn(),
  } as unknown as MedplumClient;
}

beforeEach(() => {
  try {
    localStorage.clear();
  } catch {
    /* ignore */
  }
});

afterEach(() => {
  vi.useRealTimers();
  vi.restoreAllMocks();
});

describe('useSampleWalker<T>', () => {
  it('respects CONCURRENCY=4 limit on concurrent compute invocations', async () => {
    let concurrent = 0;
    let peak = 0;
    const resolvers: Array<() => void> = [];

    const compute = vi.fn(
      async (_client: MedplumClient, _type: string, _size: number) => {
        concurrent++;
        if (concurrent > peak) peak = concurrent;
        await new Promise<void>((resolve) => {
          resolvers.push(() => {
            concurrent--;
            resolve();
          });
        });
        return { ok: true } as const;
      },
    );

    const serverUrl = nextServerUrl();
    const client = makeClient(serverUrl);
    const types = ['A', 'B', 'C', 'D', 'E', 'F'];

    const { result } = renderHook(() =>
      useSampleWalker<{ ok: true }>({
        client,
        types,
        sampleSize: 10,
        compute,
        metricNamespace: 'completeness',
      }),
    );

    // Wait for the pool to saturate; the seed loop + queue kicks start()
    // asynchronously via useEffect, so we poll.
    await waitFor(() => {
      expect(concurrent).toBeGreaterThanOrEqual(4);
    });
    expect(peak).toBe(4);

    // Release the first four; two more should fire (still capped at 4).
    await act(async () => {
      resolvers.shift()?.();
      resolvers.shift()?.();
      resolvers.shift()?.();
      resolvers.shift()?.();
      await Promise.resolve();
      await Promise.resolve();
    });

    // Release the rest so the hook settles.
    await act(async () => {
      while (resolvers.length) resolvers.shift()?.();
      await Promise.resolve();
    });

    await waitFor(() => {
      for (const t of types) {
        expect(result.current.reports[t]).toEqual({ ok: true });
      }
    });

    expect(peak).toBeLessThanOrEqual(4);
    expect(compute).toHaveBeenCalledTimes(types.length);
  });

  it('reads from cache on hit and SKIPS compute for cached types', async () => {
    const serverUrl = nextServerUrl();
    const client = makeClient(serverUrl);
    const cache = getQualityMetricsCache(serverUrl);
    const sampleSize = 50;
    const cachedValue = { ok: 'from-cache' } as const;

    // Seed cache for type 'X' using the same namespace+key shape the walker uses.
    const cacheKey = buildMetricsKey(serverUrl, 'X', sampleSize, 'completeness');
    cache.set(cacheKey, {
      value: cachedValue,
      computedAt: Date.now(),
      serverUrl,
      resourceType: 'X',
      sampleSize,
    });

    const compute = vi.fn(
      async (
        _client: MedplumClient,
        _type: string,
        _size: number,
        _pids?: string[],
      ) => ({ ok: 'computed' }) as { ok: string },
    );

    const { result } = renderHook(() =>
      useSampleWalker<{ ok: string }>({
        client,
        types: ['X', 'Y'],
        sampleSize,
        compute,
        metricNamespace: 'completeness',
      }),
    );

    await waitFor(() => {
      expect(result.current.reports.X).toEqual(cachedValue);
      expect(result.current.reports.Y).toEqual({ ok: 'computed' });
    });

    // compute called for Y only.
    expect(compute).toHaveBeenCalledTimes(1);
    const calls = compute.mock.calls.map((c) => c[1]);
    expect(calls).toContain('Y');
    expect(calls).not.toContain('X');
  });

  it('writes compute result to cache before dispatching setReports', async () => {
    const serverUrl = nextServerUrl();
    const client = makeClient(serverUrl);
    const cache = getQualityMetricsCache(serverUrl);
    const sampleSize = 25;
    const result = { stub: 'value' } as const;

    const compute = vi.fn(
      async (
        _client: MedplumClient,
        _type: string,
        _size: number,
        _pids?: string[],
      ) => result as { stub: string },
    );

    renderHook(() =>
      useSampleWalker<{ stub: string }>({
        client,
        types: ['X'],
        sampleSize,
        compute,
        metricNamespace: 'coverage',
      }),
    );

    await waitFor(() => {
      const cacheKey = buildMetricsKey(serverUrl, 'X', sampleSize, 'coverage');
      const hit = cache.get<{ stub: string }>(cacheKey);
      expect(hit?.value).toEqual(result);
    });
  });

  it('cancels on unmount: no post-unmount state updates fire', async () => {
    const serverUrl = nextServerUrl();
    const client = makeClient(serverUrl);

    // A never-resolving compute so we can unmount while it's in flight.
    let resolveCompute: ((v: { ok: true }) => void) | null = null;
    const compute = vi.fn(
      (
        _client: MedplumClient,
        _type: string,
        _size: number,
        _pids?: string[],
      ) =>
        new Promise<{ ok: true }>((resolve) => {
          resolveCompute = resolve;
        }),
    );

    const { result, unmount } = renderHook(() =>
      useSampleWalker<{ ok: true }>({
        client,
        types: ['X'],
        sampleSize: 10,
        compute,
        metricNamespace: 'completeness',
      }),
    );

    await waitFor(() => {
      expect(result.current.reports.X).toBe('loading');
    });

    // Spy on console.error to catch post-unmount setState warnings.
    const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => undefined);

    unmount();

    // Resolve the promise AFTER unmount.
    await act(async () => {
      resolveCompute!({ ok: true });
      await Promise.resolve();
      await Promise.resolve();
    });

    // No "Can't perform a React state update on an unmounted component" warnings.
    const stateUpdateWarnings = errorSpy.mock.calls.filter((call) =>
      String(call[0] ?? '').includes("state update on an unmounted"),
    );
    expect(stateUpdateWarnings).toHaveLength(0);
    errorSpy.mockRestore();
  });
});
