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

  // --- Plan 21-04 legacy-migration stubs — stay skipped; owned by Plan 21-04 ---

  it.skip('legacy migration copies quality.cohort.v1 to quality.resourceTypes.v1 (pending Plan 21-04)', () => {
    // TODO(Plan 21-04): seed localStorage with LEGACY_COHORT_KEY set to
    // JSON.stringify(['Patient','Observation']); renderHook(() => useCohorts());
    // after the mount effect, assert localStorage.getItem(RESOURCE_TYPES_STORAGE_KEY)
    // equals the seeded payload AND localStorage.getItem(LEGACY_COHORT_KEY) === null.
    expect(LEGACY_COHORT_KEY).toBe('quality.cohort.v1');
    expect(RESOURCE_TYPES_STORAGE_KEY).toBe('quality.resourceTypes.v1');
  });

  it.skip('migration idempotent — does not clobber existing (pending Plan 21-04)', () => {
    // TODO(Plan 21-04): seed BOTH keys with different payloads; renderHook;
    // assert RESOURCE_TYPES_STORAGE_KEY still holds its ORIGINAL (new) value,
    // not the legacy payload. Guards against overwriting user's post-rename state.
    expect(true).toBe(true);
  });
});
