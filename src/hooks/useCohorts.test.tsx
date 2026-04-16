/**
 * useCohorts — Plan 21-02 / 21-04 hook tests.
 *
 * Every `it()` name below matches a VALIDATION.md `-t "…"` filter so plan
 * automation commands resolve to a concrete spec:
 *   - `-t "persists"`             (CHRT-02, Plan 21-02)
 *   - `-t "hydration"`            (CHRT-02, Plan 21-02)
 *   - `-t "uuid"`                 (CHRT-02, Plan 21-02)
 *   - `-t "legacy migration"`     (CHRT-04, Plan 21-04 — still skipped here)
 *   - `-t "migration idempotent"` (CHRT-04, Plan 21-04 — still skipped here)
 *
 * The hook is a Mantine `useLocalStorage` + hydration-gate binding — see
 * 21-RESEARCH.md Pattern 1 + Pattern 2, mirrors src/hooks/useThresholds.ts.
 *
 * Threat T-21-03: all fixture IDs are synthetic (`p-001`, etc.).
 */
import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { act, renderHook } from '@testing-library/react';
import { MantineProvider } from '@mantine/core';
import { Notifications } from '@mantine/notifications';
import type { ReactNode } from 'react';
import {
  COHORTS_STORAGE_KEY,
  LEGACY_COHORT_KEY,
  RESOURCE_TYPES_STORAGE_KEY,
  type CohortsStorage,
} from '../quality/cohorts';
import { useCohorts } from './useCohorts';

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
  // Reset localStorage between tests so state does not leak.
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

const UUID_V4_SHAPE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

describe('useCohorts', () => {
  it('persists storage to quality.cohorts.v1', async () => {
    const { result } = renderHook(() => useCohorts(), { wrapper });
    await flush();
    let created: { id: string } | undefined;
    await act(async () => {
      created = result.current.addCohort({
        name: 'Diabetic 2024',
        criteria: [{ type: 'reference-list', patientIds: ['p-001', 'p-002'] }],
      });
    });
    await flush();
    const raw = window.localStorage.getItem(COHORTS_STORAGE_KEY);
    expect(raw).not.toBeNull();
    const parsed = JSON.parse(raw as string) as CohortsStorage;
    expect(parsed.cohorts).toHaveLength(1);
    expect(parsed.cohorts[0]?.name).toBe('Diabetic 2024');
    expect(parsed.cohorts[0]?.id).toBe(created?.id);
  });

  it('hydration gate returns defaults on first render', async () => {
    // Seed localStorage with a non-default payload so we can observe the
    // hydration transition — pre-effect render should still show defaults.
    const seeded: CohortsStorage = {
      cohorts: [
        {
          id: 'preexisting-id',
          name: 'Seeded',
          criteria: [],
          createdAt: '2026-01-01T00:00:00.000Z',
          updatedAt: '2026-01-01T00:00:00.000Z',
        },
      ],
      activeCohortId: 'preexisting-id',
    };
    window.localStorage.setItem(COHORTS_STORAGE_KEY, JSON.stringify(seeded));

    // Capture the first-observed `hydrated` value inside the render phase,
    // before useEffect commits (mirrors the use-trends-history.test.tsx
    // probe pattern).
    let observedFirst: boolean | null = null;
    let observedFirstCohorts: number | null = null;
    function Probe() {
      const api = useCohorts();
      if (observedFirst === null) {
        observedFirst = api.hydrated;
        observedFirstCohorts = api.cohorts.length;
      }
      return null;
    }
    const { render: rtlRender } = await import('@testing-library/react');
    rtlRender(
      <MantineProvider>
        <Notifications />
        <Probe />
      </MantineProvider>,
    );
    await flush();
    expect(observedFirst).toBe(false);
    expect(observedFirstCohorts).toBe(0);

    // And after the effect tick, the hook reports true and exposes the seeded
    // cohort.
    const { result } = renderHook(() => useCohorts(), { wrapper });
    await flush();
    expect(result.current.hydrated).toBe(true);
    expect(result.current.cohorts).toHaveLength(1);
    expect(result.current.activeCohortId).toBe('preexisting-id');
    expect(result.current.activeCohort?.name).toBe('Seeded');
  });

  it('new cohort id is uuid shaped', async () => {
    const { result } = renderHook(() => useCohorts(), { wrapper });
    await flush();
    let created: { id: string } | undefined;
    await act(async () => {
      created = result.current.addCohort({ name: 'n', criteria: [] });
    });
    await flush();
    expect(created?.id).toMatch(UUID_V4_SHAPE);
  });

  it('activateCohort sets and clears activeCohortId', async () => {
    const { result } = renderHook(() => useCohorts(), { wrapper });
    await flush();
    let created: { id: string } | undefined;
    await act(async () => {
      created = result.current.addCohort({ name: 'A', criteria: [] });
    });
    await flush();
    await act(async () => {
      result.current.activateCohort(created!.id);
    });
    await flush();
    expect(result.current.activeCohortId).toBe(created!.id);
    expect(result.current.activeCohort?.id).toBe(created!.id);

    await act(async () => {
      result.current.activateCohort(null);
    });
    await flush();
    expect(result.current.activeCohortId).toBeNull();
    expect(result.current.activeCohort).toBeNull();
  });

  // --- Plan 21-04 legacy-migration tests ---
  //
  // The migration is owned by `migrateLegacyResourceTypeKey` in
  // src/quality/cohorts.ts and invoked from a mount-time useEffect in
  // QualityLayout.tsx (21-RESEARCH.md §"CRITICAL ordering / Option A").
  // Testing the helper directly (not QualityLayout) keeps these tests
  // lightweight and independent of the connection-gated route.

  it('legacy migration copies quality.cohort.v1 to quality.resourceTypes.v1', async () => {
    const { migrateLegacyResourceTypeKey } = await import('../quality/cohorts');
    window.localStorage.setItem(
      LEGACY_COHORT_KEY,
      JSON.stringify(['Patient', 'Observation']),
    );
    expect(window.localStorage.getItem(RESOURCE_TYPES_STORAGE_KEY)).toBeNull();

    migrateLegacyResourceTypeKey();

    expect(window.localStorage.getItem(RESOURCE_TYPES_STORAGE_KEY)).toBe(
      JSON.stringify(['Patient', 'Observation']),
    );
    expect(window.localStorage.getItem(LEGACY_COHORT_KEY)).toBeNull();
  });

  it('migration idempotent — does not clobber existing', async () => {
    const { migrateLegacyResourceTypeKey } = await import('../quality/cohorts');
    window.localStorage.setItem(
      LEGACY_COHORT_KEY,
      JSON.stringify(['Old']),
    );
    window.localStorage.setItem(
      RESOURCE_TYPES_STORAGE_KEY,
      JSON.stringify(['New']),
    );

    migrateLegacyResourceTypeKey();

    // New key must survive unchanged.
    expect(window.localStorage.getItem(RESOURCE_TYPES_STORAGE_KEY)).toBe(
      JSON.stringify(['New']),
    );
    // Legacy key must still be cleaned up to prevent future mounts
    // re-running the migration.
    expect(window.localStorage.getItem(LEGACY_COHORT_KEY)).toBeNull();
  });

  it('legacy migration no-op when legacy key absent', async () => {
    const { migrateLegacyResourceTypeKey } = await import('../quality/cohorts');
    // Neither key present.
    migrateLegacyResourceTypeKey();
    expect(window.localStorage.getItem(RESOURCE_TYPES_STORAGE_KEY)).toBeNull();
    expect(window.localStorage.getItem(LEGACY_COHORT_KEY)).toBeNull();
  });
});

// -----------------------------------------------------------------------------
// Plan 22-02 — CRUD surface extensions (updateCohort, deleteCohort,
// duplicateCohort). Each block reuses the renderHook + MantineProvider +
// Notifications wrapper above so the quota-failure path exercises the same
// notifications.show contract as `addCohort`.
//
// Test names match the 22-VALIDATION.md `-t "…"` filters:
//   - `-t "updateCohort bumps updatedAt"`
//   - `-t "deleteCohort clears active"`
//   - `-t "duplicateCohort"`
// -----------------------------------------------------------------------------

describe('updateCohort', () => {
  it('updateCohort bumps updatedAt', async () => {
    const { result } = renderHook(() => useCohorts(), { wrapper });
    await flush();
    let created: { id: string; createdAt: string } | undefined;
    await act(async () => {
      created = result.current.addCohort({ name: 'Before', criteria: [] });
    });
    await flush();
    const before = Date.now();
    let updated: { updatedAt: string; name: string; id: string } | undefined;
    await act(async () => {
      updated = result.current.updateCohort(created!.id, { name: 'After' });
    });
    await flush();
    expect(updated?.name).toBe('After');
    const updatedMs = Date.parse(updated!.updatedAt);
    expect(updatedMs).toBeGreaterThanOrEqual(before);
    expect(updatedMs).toBeLessThanOrEqual(Date.now() + 100);
    expect(updated?.id).toBe(created!.id);
  });

  it('preserves id, createdAt, and untouched fields', async () => {
    const { result } = renderHook(() => useCohorts(), { wrapper });
    await flush();
    let created: ReturnType<typeof result.current.addCohort> | undefined;
    await act(async () => {
      created = result.current.addCohort({
        name: 'Original',
        criteria: [{ type: 'reference-list', patientIds: ['p-001'] }],
      });
    });
    await flush();
    const originalCreatedAt = created!.createdAt;
    let updated: ReturnType<typeof result.current.updateCohort> | undefined;
    await act(async () => {
      updated = result.current.updateCohort(created!.id, { name: 'Renamed' });
    });
    await flush();
    expect(updated?.id).toBe(created!.id);
    expect(updated?.createdAt).toBe(originalCreatedAt);
    expect(updated?.criteria).toEqual(created!.criteria);
  });

  it('throws on unknown id and does not modify storage', async () => {
    const { result } = renderHook(() => useCohorts(), { wrapper });
    await flush();
    await act(async () => {
      result.current.addCohort({ name: 'A', criteria: [] });
    });
    await flush();
    const rawBefore = window.localStorage.getItem(COHORTS_STORAGE_KEY);
    expect(() =>
      result.current.updateCohort('unknown-id', { name: 'x' }),
    ).toThrow('Cohort not found: unknown-id');
    const rawAfter = window.localStorage.getItem(COHORTS_STORAGE_KEY);
    expect(rawAfter).toBe(rawBefore);
  });

  it('surfaces a red "Update failed" notification on QuotaExceededError', async () => {
    const { notifications } = await import('@mantine/notifications');
    const showSpy = vi.spyOn(notifications, 'show').mockImplementation(() => '');
    const { result } = renderHook(() => useCohorts(), { wrapper });
    await flush();
    let created: { id: string } | undefined;
    await act(async () => {
      created = result.current.addCohort({ name: 'A', criteria: [] });
    });
    await flush();
    // Swap setItem for the quota-throwing stub AFTER the initial setItem that
    // persists the just-created cohort has already run.
    vi.spyOn(window.localStorage, 'setItem').mockImplementation(() => {
      throw new DOMException('quota exceeded', 'QuotaExceededError');
    });
    expect(() =>
      result.current.updateCohort(created!.id, { name: 'x' }),
    ).toThrow();
    expect(showSpy).toHaveBeenCalledWith(
      expect.objectContaining({
        color: 'red',
        title: 'Update failed',
      }),
    );
  });
});

describe('deleteCohort', () => {
  it('deleteCohort clears active', async () => {
    const { result } = renderHook(() => useCohorts(), { wrapper });
    await flush();
    let created: { id: string } | undefined;
    await act(async () => {
      created = result.current.addCohort({ name: 'A', criteria: [] });
    });
    await flush();
    await act(async () => {
      result.current.activateCohort(created!.id);
    });
    await flush();
    expect(result.current.activeCohortId).toBe(created!.id);
    await act(async () => {
      result.current.deleteCohort(created!.id);
    });
    await flush();
    expect(result.current.activeCohortId).toBeNull();
    expect(result.current.cohorts.some((c) => c.id === created!.id)).toBe(false);
  });

  it('removes a non-active cohort without touching activeCohortId', async () => {
    const { result } = renderHook(() => useCohorts(), { wrapper });
    await flush();
    let active: { id: string } | undefined;
    let other: { id: string } | undefined;
    await act(async () => {
      active = result.current.addCohort({ name: 'Active', criteria: [] });
    });
    await flush();
    await act(async () => {
      other = result.current.addCohort({ name: 'Other', criteria: [] });
    });
    await flush();
    await act(async () => {
      result.current.activateCohort(active!.id);
    });
    await flush();
    await act(async () => {
      result.current.deleteCohort(other!.id);
    });
    await flush();
    expect(result.current.activeCohortId).toBe(active!.id);
    expect(result.current.cohorts).toHaveLength(1);
  });

  it('is a no-op on unknown id', async () => {
    const { result } = renderHook(() => useCohorts(), { wrapper });
    await flush();
    await act(async () => {
      result.current.addCohort({ name: 'A', criteria: [] });
    });
    await flush();
    const rawBefore = window.localStorage.getItem(COHORTS_STORAGE_KEY);
    // Must NOT throw.
    await act(async () => {
      result.current.deleteCohort('nonexistent');
    });
    await flush();
    const rawAfter = window.localStorage.getItem(COHORTS_STORAGE_KEY);
    expect(rawAfter).toBe(rawBefore);
  });

  it('surfaces a red "Delete failed" notification on QuotaExceededError', async () => {
    const { notifications } = await import('@mantine/notifications');
    const showSpy = vi.spyOn(notifications, 'show').mockImplementation(() => '');
    const { result } = renderHook(() => useCohorts(), { wrapper });
    await flush();
    let created: { id: string } | undefined;
    await act(async () => {
      created = result.current.addCohort({ name: 'A', criteria: [] });
    });
    await flush();
    vi.spyOn(window.localStorage, 'setItem').mockImplementation(() => {
      throw new DOMException('quota exceeded', 'QuotaExceededError');
    });
    expect(() => result.current.deleteCohort(created!.id)).toThrow();
    expect(showSpy).toHaveBeenCalledWith(
      expect.objectContaining({
        color: 'red',
        title: 'Delete failed',
      }),
    );
  });
});

describe('duplicateCohort', () => {
  it('duplicateCohort creates a fresh-UUID copy with "(copy)" suffix', async () => {
    const { result } = renderHook(() => useCohorts(), { wrapper });
    await flush();
    let created: ReturnType<typeof result.current.addCohort> | undefined;
    await act(async () => {
      created = result.current.addCohort({
        name: 'Diabetic',
        criteria: [{ type: 'reference-list', patientIds: ['p-001'] }],
      });
    });
    await flush();
    let copy: ReturnType<typeof result.current.duplicateCohort> | undefined;
    await act(async () => {
      copy = result.current.duplicateCohort(created!.id);
    });
    await flush();
    expect(copy?.id).toMatch(UUID_V4_SHAPE);
    expect(copy?.id).not.toBe(created!.id);
    expect(copy?.name).toBe('Diabetic (copy)');
    expect(copy?.criteria).toEqual(created!.criteria);
    expect(result.current.cohorts).toHaveLength(2);
  });

  it('duplicateCohort repeated produces stacked "(copy)" suffixes', async () => {
    const { result } = renderHook(() => useCohorts(), { wrapper });
    await flush();
    let created: { id: string } | undefined;
    await act(async () => {
      created = result.current.addCohort({ name: 'Base', criteria: [] });
    });
    await flush();
    let c1: { id: string; name: string } | undefined;
    await act(async () => {
      c1 = result.current.duplicateCohort(created!.id);
    });
    await flush();
    let c2: { name: string } | undefined;
    await act(async () => {
      c2 = result.current.duplicateCohort(c1!.id);
    });
    await flush();
    expect(c1?.name).toBe('Base (copy)');
    expect(c2?.name).toBe('Base (copy) (copy)');
  });

  it('duplicateCohort throws on unknown id', async () => {
    const { result } = renderHook(() => useCohorts(), { wrapper });
    await flush();
    expect(() => result.current.duplicateCohort('unknown-id')).toThrow(
      'Cohort not found: unknown-id',
    );
  });

  it('surfaces a red "Duplicate failed" notification on QuotaExceededError', async () => {
    const { notifications } = await import('@mantine/notifications');
    const showSpy = vi.spyOn(notifications, 'show').mockImplementation(() => '');
    const { result } = renderHook(() => useCohorts(), { wrapper });
    await flush();
    let created: { id: string } | undefined;
    await act(async () => {
      created = result.current.addCohort({ name: 'A', criteria: [] });
    });
    await flush();
    vi.spyOn(window.localStorage, 'setItem').mockImplementation(() => {
      throw new DOMException('quota exceeded', 'QuotaExceededError');
    });
    expect(() => result.current.duplicateCohort(created!.id)).toThrow();
    expect(showSpy).toHaveBeenCalledWith(
      expect.objectContaining({
        color: 'red',
        title: 'Duplicate failed',
      }),
    );
  });
});
