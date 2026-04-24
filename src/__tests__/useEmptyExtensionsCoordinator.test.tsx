/**
 * useEmptyExtensionsCoordinator tests — Plan 34-05 Task 1 (MII-EXT-14).
 *
 * Locks the contract for the per-patient empty-extensions coordinator:
 *   1. Default `hideEmpty` = false for unknown patient.
 *   2. Hydrates `hideEmpty` from localStorage[STORAGE_KEY][patientId].
 *   3. `setHideEmpty(true)` writes the per-patient boolean back.
 *   4. Malformed localStorage value → defensive {} fallback (= hideEmpty false).
 *   5. `useEmptyExtensionsPublisher({moduleKey, isEmpty})` registers; coordinator
 *      surfaces emptyCount + emptyModuleKeys.
 *   6. Multiple publishers accumulate; same moduleKey re-publishing overwrites.
 */
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import type { ReactNode } from 'react';
import {
  EmptyExtensionsProvider,
  useEmptyExtensionsCoordinator,
  useEmptyExtensionsPublisher,
} from '../hooks/useEmptyExtensionsCoordinator';

const STORAGE_KEY = 'patients.hideEmptyExtensions.v1';

function wrap(patientId: string) {
  return ({ children }: { children: ReactNode }) => (
    <EmptyExtensionsProvider patientId={patientId}>{children}</EmptyExtensionsProvider>
  );
}

describe('useEmptyExtensionsCoordinator (MII-EXT-14)', () => {
  beforeEach(() => {
    localStorage.clear();
  });
  afterEach(() => {
    localStorage.clear();
  });

  it('exposes hideEmpty: false by default for unknown patient', () => {
    const { result } = renderHook(() => useEmptyExtensionsCoordinator(), {
      wrapper: wrap('p-unknown'),
    });
    expect(result.current.hideEmpty).toBe(false);
    expect(typeof result.current.setHideEmpty).toBe('function');
  });

  it('hydrates hideEmpty from localStorage[patientId]', async () => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ 'p-1': true }));
    const { result } = renderHook(() => useEmptyExtensionsCoordinator(), {
      wrapper: wrap('p-1'),
    });
    // Mantine useLocalStorage hydrates in useEffect — wait a tick.
    await act(async () => {
      await new Promise((r) => setTimeout(r, 0));
    });
    expect(result.current.hideEmpty).toBe(true);
  });

  it('setHideEmpty(true) writes { [patientId]: true } to localStorage', async () => {
    const { result } = renderHook(() => useEmptyExtensionsCoordinator(), {
      wrapper: wrap('p-2'),
    });
    await act(async () => {
      await new Promise((r) => setTimeout(r, 0));
    });
    act(() => {
      result.current.setHideEmpty(true);
    });
    await act(async () => {
      await new Promise((r) => setTimeout(r, 0));
    });
    const stored = JSON.parse(localStorage.getItem(STORAGE_KEY) ?? '{}');
    expect(stored['p-2']).toBe(true);
  });

  it('malformed localStorage value falls back to empty object (hideEmpty=false)', async () => {
    localStorage.setItem(STORAGE_KEY, 'NOT-JSON-AT-ALL');
    const { result } = renderHook(() => useEmptyExtensionsCoordinator(), {
      wrapper: wrap('p-3'),
    });
    await act(async () => {
      await new Promise((r) => setTimeout(r, 0));
    });
    expect(result.current.hideEmpty).toBe(false);
  });

  it('publisher accumulates emptyCount; same moduleKey re-publish overwrites', async () => {
    const { result } = renderHook(
      () => {
        useEmptyExtensionsPublisher({ moduleKey: 'onkologie', isEmpty: true });
        useEmptyExtensionsPublisher({ moduleKey: 'kardiologie', isEmpty: true });
        useEmptyExtensionsPublisher({ moduleKey: 'bildgebung', isEmpty: false });
        return useEmptyExtensionsCoordinator();
      },
      { wrapper: wrap('p-4') },
    );
    await act(async () => {
      await new Promise((r) => setTimeout(r, 0));
    });
    expect(result.current.emptyCount).toBe(2); // onkologie + kardiologie
    expect(result.current.emptyModuleKeys).toEqual(
      expect.arrayContaining(['onkologie', 'kardiologie']),
    );
    expect(result.current.emptyModuleKeys).not.toContain('bildgebung');
  });
});
