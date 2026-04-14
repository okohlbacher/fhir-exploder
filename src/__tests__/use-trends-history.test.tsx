/**
 * useTrendsHistory — Plan 19-02 Task 1.
 *
 * Verifies:
 * - Hydration gate (hydrated flips true after mount effect)
 * - append adds to snapshots in chronological order
 * - clearAll empties storage
 * - Corrupt payload (non-array) → console.warn + silent fallback to []
 * - QuotaExceededError on setItem surfaces a red notification
 */
import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { act, renderHook } from '@testing-library/react';
import { MantineProvider } from '@mantine/core';
import { Notifications, notifications } from '@mantine/notifications';
import type { ReactNode } from 'react';
import { useTrendsHistory } from '../hooks/useTrendsHistory';
import {
  TRENDS_STORAGE_KEY,
  type QualitySnapshot,
} from '../quality/trendsHistory';

// ----- jsdom polyfills required by Mantine 8 -----

class MockResizeObserver {
  observe = vi.fn();
  unobserve = vi.fn();
  disconnect = vi.fn();
}
(globalThis as unknown as { ResizeObserver: typeof ResizeObserver }).ResizeObserver =
  MockResizeObserver as unknown as typeof ResizeObserver;

Object.defineProperty(window, 'matchMedia', {
  writable: true,
  value: vi.fn().mockImplementation((query: string) => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: vi.fn(),
    removeListener: vi.fn(),
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    dispatchEvent: vi.fn(),
  })),
});

beforeEach(() => {
  window.localStorage.clear();
});

afterEach(() => {
  vi.restoreAllMocks();
});

function wrapper({ children }: { children: ReactNode }) {
  return (
    <MantineProvider>
      <Notifications />
      {children}
    </MantineProvider>
  );
}

async function flush(ms = 50) {
  await act(async () => {
    await new Promise((r) => setTimeout(r, ms));
  });
}

function mkSnap(id: string, serverUrl = 'http://a/fhir'): QualitySnapshot {
  return {
    id,
    capturedAt: new Date().toISOString(),
    serverUrl,
    sampleSize: 100,
    cohort: [],
    scores: {
      completeness: 80,
      coverage: 70,
      validation: 95,
      plausibility: 99,
      labRanges: 95,
      duplicates: 99,
      references: 98,
    },
    thresholds: {
      completeness: 80,
      coverage: 70,
      validation: 95,
      plausibility: 99,
      labRanges: 95,
      duplicates: 99,
      references: 98,
    },
  };
}

describe('useTrendsHistory', () => {
  it('hydrates after mount (hydrated flips true after first effect)', async () => {
    const { result } = renderHook(() => useTrendsHistory(), { wrapper });
    // Initial render: hydrated === false
    expect(result.current.hydrated).toBe(false);
    await flush();
    expect(result.current.hydrated).toBe(true);
  });

  it('append adds to snapshots in chronological order', async () => {
    window.localStorage.setItem(TRENDS_STORAGE_KEY, '[]');
    const { result } = renderHook(() => useTrendsHistory(), { wrapper });
    await flush();
    const snapA = mkSnap('a');
    const snapB = mkSnap('b');
    await act(async () => {
      result.current.append(snapA);
    });
    await flush();
    await act(async () => {
      result.current.append(snapB);
    });
    await flush();
    expect(result.current.snapshots.length).toBe(2);
    expect(result.current.snapshots[0]!.id).toBe('a');
    expect(result.current.snapshots[1]!.id).toBe('b');
  });

  it('clearAll empties snapshots and localStorage', async () => {
    window.localStorage.setItem(
      TRENDS_STORAGE_KEY,
      JSON.stringify([mkSnap('a'), mkSnap('b'), mkSnap('c')]),
    );
    const { result } = renderHook(() => useTrendsHistory(), { wrapper });
    await flush();
    expect(result.current.snapshots.length).toBe(3);
    await act(async () => {
      result.current.clearAll();
    });
    await flush();
    expect(result.current.snapshots.length).toBe(0);
    const raw = window.localStorage.getItem(TRENDS_STORAGE_KEY);
    expect(raw).not.toBeNull();
    expect(JSON.parse(raw as string)).toEqual([]);
  });

  it('corrupt payload (non-array) triggers console.warn and returns []', async () => {
    const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
    // Seed with a non-array JSON — Mantine's useLocalStorage will hydrate this
    window.localStorage.setItem(TRENDS_STORAGE_KEY, '"not-an-array"');
    const { result } = renderHook(() => useTrendsHistory(), { wrapper });
    await flush();
    expect(result.current.snapshots).toEqual([]);
    expect(
      warnSpy.mock.calls.some((args) =>
        String(args[0] ?? '').includes('quality.trends.v1 corrupted'),
      ),
    ).toBe(true);
  });

  it('QuotaExceededError on append surfaces a red notification', async () => {
    const showSpy = vi.spyOn(notifications, 'show');
    const originalSetItem = Storage.prototype.setItem;
    // Mock setItem to throw a QuotaExceededError on next call
    Storage.prototype.setItem = vi.fn(() => {
      throw new DOMException('quota', 'QuotaExceededError');
    }) as unknown as typeof Storage.prototype.setItem;

    try {
      window.localStorage.setItem = Storage.prototype.setItem;
      const { result } = renderHook(() => useTrendsHistory(), { wrapper });
      await flush();
      await act(async () => {
        result.current.append(mkSnap('quota-test'));
      });
      await flush();
      expect(
        showSpy.mock.calls.some((call) => {
          const arg = call[0] as { color?: string; title?: string } | undefined;
          return arg?.color === 'red' && arg?.title === 'Snapshot not saved';
        }),
      ).toBe(true);
    } finally {
      Storage.prototype.setItem = originalSetItem;
    }
  });
});
