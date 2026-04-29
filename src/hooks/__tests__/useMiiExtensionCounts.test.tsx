/**
 * useMiiExtensionCounts — Phase 42 Plan 01 tests (MII-EXT-15).
 *
 * Locks the data-fetching primitive contract for pre-probing extension-module
 * counts on patient mount. Eight tests covering:
 *
 *   1. Multi-type sum (MII-EXT-15-B) — Onkologie has 4 types; per-module total =
 *      sum of per-type bundle.totals.
 *   2. Per-type catch fallback (MII-EXT-15-B/-C partial) — single rejected
 *      per-type fetch resolves to 0; module total stays defined.
 *   3. Undefined while fetching (MII-EXT-15-C) — record values are `undefined`
 *      synchronously (initial state) before any fetch resolves.
 *   4. Extension-only (MII-EXT-15-D) — record contains EXACTLY the keys of
 *      MII_MODULES.filter(m => m.category === 'extension'). No base keys.
 *   5. URL pattern (MII-EXT-15-A grounding) — every captured client.get URL
 *      matches `/_summary=count&_count=0/` AND `/=Patient\//`.
 *   6. Cancelled-flag (MII-EXT-15-H) — after rerender, the new patientId's
 *      counts are NOT polluted by the previous patient's late-resolving fetch.
 *   7. Cache short-circuit — re-render WITHOUT unmount with same patientId
 *      hits the hook-internal cache; no extra client.get calls.
 *   8. Reports emptiness (D-05) — with all-zero mock, the hook calls
 *      reportEmptiness(moduleKey, true) for every extension module.
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, act, waitFor } from '@testing-library/react';

// Polyfill ResizeObserver for jsdom (defensive — pulled in transitively via
// any Mantine import; cheap to set up unconditionally).
class MockResizeObserver {
  observe = vi.fn();
  unobserve = vi.fn();
  disconnect = vi.fn();
}
(globalThis as unknown as { ResizeObserver: typeof ResizeObserver }).ResizeObserver =
  MockResizeObserver as unknown as typeof ResizeObserver;

// Polyfill matchMedia for jsdom.
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

// --- Mocks --------------------------------------------------------------

const mocks = vi.hoisted(() => ({
  client: null as null | {
    get: ReturnType<typeof vi.fn>;
    fhirUrl: (s: string) => { toString: () => string };
  },
}));

vi.mock('@medplum/react-hooks', () => ({
  useMedplum: () => mocks.client,
}));

import { useMiiExtensionCounts } from '../useMiiExtensionCounts';
import {
  EmptyExtensionsProvider,
  useEmptyExtensionsCoordinator,
} from '../useEmptyExtensionsCoordinator';
import { MII_MODULES, fhirResourceTypesOf } from '../../utils/mii-modules';
import { type ReactNode } from 'react';

// --- Helpers ------------------------------------------------------------

/**
 * Build a mock MedplumClient.get whose response depends on a Record<typeName, number>.
 * The URL passed to client.get looks like `${type}?...&_summary=count&_count=0[&extra]`.
 * We parse the type prefix off the URL and return a Bundle whose `total` is the
 * configured count for that type (defaulting to 0).
 */
function makeCountClient(perTypeCount: Record<string, number>) {
  const get = vi.fn((url: string) => {
    const type = url.split('?')[0];
    const total = perTypeCount[type] ?? 0;
    return Promise.resolve({ resourceType: 'Bundle', total, entry: [] });
  });
  return {
    get,
    fhirUrl: (s: string) => ({ toString: () => s }),
  };
}

beforeEach(() => {
  mocks.client = makeCountClient({}) as unknown as typeof mocks.client;
});

afterEach(() => {
  mocks.client = null;
  vi.restoreAllMocks();
});

// --- Tests --------------------------------------------------------------

describe('useMiiExtensionCounts', () => {
  // Compute the canonical extension-key list from the source of truth so the
  // tests stay future-proof (MII_MODULES additions don't break asserts).
  const extensionModules = MII_MODULES.filter((m) => m.category === 'extension');
  const extensionKeys = extensionModules.map((m) => m.key);

  // -------------------------------------------------------------------------
  // Test 1 — multi-type sum (MII-EXT-15-B): Onkologie has 4 types
  // (Condition, Observation, Procedure, MedicationStatement). Configure
  // counts of 3, 2, 5, 1 → expect counts['onkologie'] === 11.
  // -------------------------------------------------------------------------
  it('sums per-type bundle.total values into a per-module total (MII-EXT-15-B)', async () => {
    mocks.client = makeCountClient({
      Condition: 3,
      Observation: 2,
      Procedure: 5,
      MedicationStatement: 1,
    }) as unknown as typeof mocks.client;

    const { result, unmount } = renderHook(() => useMiiExtensionCounts('p-1'));

    await waitFor(() => {
      expect(result.current.onkologie).toBe(11);
    });
    unmount();
  });

  // -------------------------------------------------------------------------
  // Test 2 — per-type catch fallback: one rejected fetch resolves to 0;
  // surviving types still contribute. Pathologie has 3 types
  // (Observation, DiagnosticReport, Specimen). Reject Specimen → expect
  // total = Observation + DiagnosticReport.
  // -------------------------------------------------------------------------
  it('falls back to 0 for a per-type rejection without blanking the module total', async () => {
    const get = vi.fn((url: string) => {
      const type = url.split('?')[0];
      if (type === 'Specimen') {
        return Promise.reject(new Error('boom'));
      }
      const counts: Record<string, number> = {
        Observation: 4,
        DiagnosticReport: 2,
      };
      return Promise.resolve({
        resourceType: 'Bundle',
        total: counts[type] ?? 0,
        entry: [],
      });
    });
    mocks.client = {
      get,
      fhirUrl: (s: string) => ({ toString: () => s }),
    } as unknown as typeof mocks.client;

    const { result, unmount } = renderHook(() => useMiiExtensionCounts('p-2'));

    // Pathologie = Observation + DiagnosticReport + Specimen
    // total = 4 + 2 + 0 (Specimen rejection → 0) = 6
    await waitFor(() => {
      expect(result.current.pathologie).toBe(6);
    });
    unmount();
  });

  // -------------------------------------------------------------------------
  // Test 3 — undefined while fetching (MII-EXT-15-C): the hook seeds initial
  // state to undefined for every extension module synchronously on mount.
  // We assert the initial state via a "noop client" (returns Promise that is
  // attached to a resolver we control + immediately unmount before resolving).
  // -------------------------------------------------------------------------
  it('returns undefined for every extension module synchronously on first render (MII-EXT-15-C)', async () => {
    // Use an immediately-resolved client so the worker doesn't hang, but
    // capture the FIRST RENDER state before microtasks flush.
    const get = vi.fn(() =>
      Promise.resolve({ resourceType: 'Bundle', total: 0, entry: [] }),
    );
    mocks.client = {
      get,
      fhirUrl: (s: string) => ({ toString: () => s }),
    } as unknown as typeof mocks.client;

    const { result, unmount } = renderHook(() => useMiiExtensionCounts('p-3'));

    // First render: initial state is `undefined` for every extension key.
    // (The useEffect hasn't run yet — but with React 18, useState's
    // initializer fires synchronously on mount, so we read the seed.)
    for (const key of extensionKeys) {
      expect(result.current[key]).toBeUndefined();
    }

    // Drain pending microtasks to avoid leaking promises into the next test.
    await act(async () => {
      await Promise.resolve();
    });
    unmount();
  });

  // -------------------------------------------------------------------------
  // Test 4 — extension-only (MII-EXT-15-D): record key set is EXACTLY the
  // extension key list. No 'person' / 'fall' / 'diagnose' / etc.
  // -------------------------------------------------------------------------
  it('returns a record keyed only by extension modules (no base modules) (MII-EXT-15-D)', async () => {
    const get = vi.fn(() =>
      Promise.resolve({ resourceType: 'Bundle', total: 0, entry: [] }),
    );
    mocks.client = {
      get,
      fhirUrl: (s: string) => ({ toString: () => s }),
    } as unknown as typeof mocks.client;

    const { result, unmount } = renderHook(() => useMiiExtensionCounts('p-4'));

    // Wait for resolution so the cache + counts are populated.
    await waitFor(() => {
      // At least one module should have resolved to a number.
      const anyResolved = extensionKeys.some(
        (k) => typeof result.current[k] === 'number',
      );
      expect(anyResolved).toBe(true);
    });

    const keys = Object.keys(result.current).sort();
    const expected = [...extensionKeys].sort();
    expect(keys).toEqual(expected);

    // Extra paranoia: explicitly assert known base keys are absent.
    expect(result.current).not.toHaveProperty('person');
    expect(result.current).not.toHaveProperty('fall');
    expect(result.current).not.toHaveProperty('diagnose');
    expect(result.current).not.toHaveProperty('prozedur');
    expect(result.current).not.toHaveProperty('consent');
    expect(result.current).not.toHaveProperty('laborbefund');
    expect(result.current).not.toHaveProperty('medikation');
    unmount();
  });

  // -------------------------------------------------------------------------
  // Test 5 — URL pattern (MII-EXT-15-A grounding): every captured URL contains
  // `_summary=count&_count=0` AND `=Patient/`.
  // -------------------------------------------------------------------------
  it('builds URLs with _summary=count&_count=0 and =Patient/ for every fan-out (MII-EXT-15-A)', async () => {
    const client = makeCountClient({});
    mocks.client = client as unknown as typeof mocks.client;

    const { unmount } = renderHook(() => useMiiExtensionCounts('p-5'));

    // Wait for at least one call to land — fan-out is synchronous to render.
    await waitFor(() => {
      expect(client.get).toHaveBeenCalled();
    });

    // Assert every captured URL has the required tokens.
    for (const call of client.get.mock.calls) {
      const url = call[0] as string;
      expect(url).toMatch(/_summary=count&_count=0/);
      expect(url).toMatch(/=Patient\//);
    }

    // Also assert call-count >= total (module, type) pairs across extensions.
    const expectedCalls = extensionModules.reduce(
      (n, mod) => n + fhirResourceTypesOf(mod).length,
      0,
    );
    expect(client.get).toHaveBeenCalledTimes(expectedCalls);
    unmount();
  });

  // -------------------------------------------------------------------------
  // Test 6 — cancelled-flag (MII-EXT-15-H): rapid patientId rerender + late
  // promise resolution must NOT pollute the new patient's counts. We use a
  // controllable resolver pattern but cap the pending list to keep memory
  // bounded.
  // -------------------------------------------------------------------------
  it('cancelled-flag prevents stale setState after patientId change (MII-EXT-15-H)', async () => {
    type Resolver = (b: unknown) => void;
    const pending: Resolver[] = [];

    const slowGet = vi.fn(() => {
      return new Promise<unknown>((resolve) => {
        pending.push(resolve);
      });
    });
    mocks.client = {
      get: slowGet,
      fhirUrl: (s: string) => ({ toString: () => s }),
    } as unknown as typeof mocks.client;

    const { result, rerender, unmount } = renderHook(
      ({ id }: { id: string }) => useMiiExtensionCounts(id),
      { initialProps: { id: 'p-old' } },
    );

    // Initial state — no fetches resolved yet.
    expect(pending.length).toBeGreaterThan(0);
    const oldPendingResolvers = [...pending];

    // Switch patient mid-flight. Cleanup sets cancelled=true for old effect.
    rerender({ id: 'p-new' });

    // Resolve the OLD patient's pending fetches with a sentinel total that
    // would clearly poison the new patient if cancelled-flag is broken.
    await act(async () => {
      for (const resolve of oldPendingResolvers) {
        resolve({ resourceType: 'Bundle', total: 999, entry: [] });
      }
      // Yield microtasks so the OLD .then() runs (and is gated by cancelled).
      await Promise.resolve();
      await Promise.resolve();
    });

    // No extension module's count should be a multiple of 999 (which would
    // happen if the cancelled old setState leaked through). The new patient's
    // own fetches are still pending — its values may be undefined OR small
    // numbers from the cache (none — first mount), but never 999.
    for (const key of extensionKeys) {
      const v = result.current[key];
      // The hook seeds undefined initially; new patient's promises haven't
      // resolved either. So we expect EVERY value to still be undefined,
      // because cancelled-flag short-circuits the OLD .then() before its
      // setCounts and the NEW .then() hasn't fired yet (still pending).
      expect(v).toBeUndefined();
    }

    // Now resolve the NEW patient's pending (those pushed AFTER rerender).
    const newPendingResolvers = pending.slice(oldPendingResolvers.length);
    expect(newPendingResolvers.length).toBeGreaterThan(0);
    await act(async () => {
      for (const resolve of newPendingResolvers) {
        resolve({ resourceType: 'Bundle', total: 7, entry: [] });
      }
      await Promise.resolve();
      await Promise.resolve();
    });

    // Now the new patient's totals should be defined and a multiple of 7
    // (= sum of per-type 7s, NEVER 999).
    await waitFor(() => {
      const onkologyVal = result.current.onkologie;
      expect(typeof onkologyVal).toBe('number');
      // Onkologie has 4 types → sum = 28, not 999*4.
      expect(onkologyVal).not.toBe(999);
      expect(onkologyVal).not.toBe(999 * 4);
    });

    unmount();
  });

  // -------------------------------------------------------------------------
  // Test 7 — cache short-circuit: re-render WITHOUT unmount with the same
  // patientId hits the hook-internal useRef<Map> cache. After the first
  // resolution, a re-render must NOT issue any extra client.get calls.
  // -------------------------------------------------------------------------
  it('cache short-circuits repeat resolution within the same hook lifetime', async () => {
    const client = makeCountClient({
      // Give every type a defined count so totals settle cleanly.
      Condition: 1,
      Observation: 1,
      Procedure: 1,
      MedicationStatement: 1,
      Encounter: 1,
      DiagnosticReport: 1,
      ImagingStudy: 1,
      Specimen: 1,
      DocumentReference: 1,
      ResearchStudy: 1,
    });
    mocks.client = client as unknown as typeof mocks.client;

    const { result, rerender, unmount } = renderHook(
      ({ id }: { id: string }) => useMiiExtensionCounts(id),
      { initialProps: { id: 'p-cache' } },
    );

    // Wait for all extension modules to resolve.
    await waitFor(() => {
      for (const key of extensionKeys) {
        expect(typeof result.current[key]).toBe('number');
      }
    });

    const firstCallCount = client.get.mock.calls.length;
    expect(firstCallCount).toBeGreaterThan(0);

    // Re-render with same patientId → cache hit, no extra fetches.
    rerender({ id: 'p-cache' });

    // Yield microtasks for any (cancelled / new) effects.
    await act(async () => {
      await Promise.resolve();
      await Promise.resolve();
    });

    expect(client.get.mock.calls.length).toBe(firstCallCount);
    unmount();
  });

  // -------------------------------------------------------------------------
  // Test 8 — reports emptiness (D-05 contract at hook level): with all-zero
  // mock, the hook calls reportEmptiness(moduleKey, true) for every
  // extension module. We mount the hook inside the real
  // EmptyExtensionsProvider and observe `emptyModuleKeys` via a sibling
  // hook reading the coordinator. After the fan-out resolves, every
  // extension key should appear in `emptyModuleKeys`.
  // -------------------------------------------------------------------------
  it('publishes emptiness for every extension module when all counts resolve to 0 (D-05)', async () => {
    // All types resolve to 0 → every module is empty.
    mocks.client = makeCountClient({}) as unknown as typeof mocks.client;

    // Combined hook: drive the fan-out + read the coordinator state.
    function useFixture(patientId: string) {
      const counts = useMiiExtensionCounts(patientId);
      const coord = useEmptyExtensionsCoordinator();
      return { counts, emptyModuleKeys: coord.emptyModuleKeys };
    }

    function Wrapper({ children }: { children: ReactNode }) {
      return (
        <EmptyExtensionsProvider patientId="p-empty">
          {children}
        </EmptyExtensionsProvider>
      );
    }

    const { result, unmount } = renderHook(() => useFixture('p-empty'), {
      wrapper: Wrapper,
    });

    await waitFor(() => {
      // Every extension key should be in emptyModuleKeys (= reported empty).
      const reported = new Set(result.current.emptyModuleKeys);
      for (const key of extensionKeys) {
        expect(reported.has(key)).toBe(true);
      }
    });

    unmount();
  });
});
