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
 *      before any fetch resolves, NOT 0 / 'loading'.
 *   4. Extension-only (MII-EXT-15-D) — record contains EXACTLY the keys of
 *      MII_MODULES.filter(m => m.category === 'extension'). No base keys.
 *   5. URL pattern (MII-EXT-15-A grounding) — every captured client.get URL
 *      matches `/_summary=count&_count=0/` AND `/=Patient\//`.
 *   6. Cancelled-flag (MII-EXT-15-H) — a delayed-resolve fetch is gated on the
 *      cleanup flag; rerendering with a different patientId then resolving the
 *      stale promise does NOT pollute the new patient's counts.
 *   7. Cache short-circuit — re-render WITHOUT unmount with same patientId
 *      hits the hook-internal cache; no extra client.get calls.
 *   8. Reports emptiness (D-05) — with all-zero mock, the hook calls
 *      reportEmptiness(moduleKey, true) for every extension module.
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, act, waitFor } from '@testing-library/react';

// Polyfill ResizeObserver for jsdom (required by some Mantine deps pulled in
// transitively via @medplum/react-hooks).
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
import { MII_MODULES, fhirResourceTypesOf } from '../../utils/mii-modules';

// --- Helpers ------------------------------------------------------------

/**
 * Build a mock MedplumClient.get whose response depends on a Record<typeName, number>.
 * The URL passed to client.get looks like `${type}?...&_summary=count&_count=0[&extra]`.
 * We parse the type prefix off the URL and return a Bundle whose `total` is the
 * configured count for that type (defaulting to 0).
 *
 * Returns:
 *   - get : the vi.fn() spy
 *   - fhirUrl : identity (returns the input string wrapped in `{ toString }`)
 */
function makeCountClient(perTypeCount: Record<string, number>) {
  const get = vi.fn((url: string) => {
    // url shape: `${type}?${param}=Patient/${patientId}&_summary=count&_count=0[&extra]`
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

    const { result } = renderHook(() => useMiiExtensionCounts('p-1'));

    await waitFor(() => {
      expect(result.current.onkologie).toBe(11);
    });
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

    const { result } = renderHook(() => useMiiExtensionCounts('p-2'));

    // Pathologie = Observation + DiagnosticReport + Specimen
    // total = 4 + 2 + 0 (Specimen rejection → 0) = 6
    await waitFor(() => {
      expect(result.current.pathologie).toBe(6);
    });
  });

  // -------------------------------------------------------------------------
  // Test 3 — undefined while fetching (MII-EXT-15-C): a never-resolving fetch
  // means every extension module's record value stays `undefined` (NOT 0,
  // NOT 'loading').
  // -------------------------------------------------------------------------
  it('returns undefined for every extension module while fetching is in flight (MII-EXT-15-C)', () => {
    // Never-resolving promise — counts will sit on initial undefined state.
    const get = vi.fn(() => new Promise(() => {}) as Promise<unknown>);
    mocks.client = {
      get,
      fhirUrl: (s: string) => ({ toString: () => s }),
    } as unknown as typeof mocks.client;

    const { result } = renderHook(() => useMiiExtensionCounts('p-3'));

    for (const key of extensionKeys) {
      expect(result.current[key]).toBeUndefined();
    }
  });

  // -------------------------------------------------------------------------
  // Test 4 — extension-only (MII-EXT-15-D): record key set is EXACTLY the
  // extension key list. No 'person' / 'fall' / 'diagnose' / etc.
  // -------------------------------------------------------------------------
  it('returns a record keyed only by extension modules (no base modules) (MII-EXT-15-D)', () => {
    const get = vi.fn(() => new Promise(() => {}) as Promise<unknown>);
    mocks.client = {
      get,
      fhirUrl: (s: string) => ({ toString: () => s }),
    } as unknown as typeof mocks.client;

    const { result } = renderHook(() => useMiiExtensionCounts('p-4'));

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
  });

  // -------------------------------------------------------------------------
  // Test 5 — URL pattern (MII-EXT-15-A grounding): every captured URL contains
  // `_summary=count&_count=0` AND `=Patient/`.
  // -------------------------------------------------------------------------
  it('builds URLs with _summary=count&_count=0 and =Patient/ for every fan-out (MII-EXT-15-A)', async () => {
    const client = makeCountClient({});
    mocks.client = client as unknown as typeof mocks.client;

    renderHook(() => useMiiExtensionCounts('p-5'));

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
  });

  // -------------------------------------------------------------------------
  // Test 6 — cancelled-flag (MII-EXT-15-H): a delayed-resolve mock simulates
  // a stale fetch from the previous patientId. After rerender + cleanup,
  // resolving the stale promise must NOT overwrite the new patient's counts.
  // -------------------------------------------------------------------------
  it('cancelled-flag prevents stale setState after patientId change (MII-EXT-15-H)', async () => {
    type Resolver = (b: unknown) => void;
    const pending: Resolver[] = [];

    const slowGet = vi.fn((_url: string) => {
      return new Promise((resolve) => {
        pending.push(resolve as Resolver);
      });
    });
    mocks.client = {
      get: slowGet,
      fhirUrl: (s: string) => ({ toString: () => s }),
    } as unknown as typeof mocks.client;

    const { result, rerender } = renderHook(
      ({ id }: { id: string }) => useMiiExtensionCounts(id),
      { initialProps: { id: 'p-old' } },
    );

    // No counts yet — promises haven't resolved.
    for (const key of extensionKeys) {
      expect(result.current[key]).toBeUndefined();
    }

    // Capture the in-flight pending list size BEFORE rerender so we know
    // which pending resolvers belong to p-old. The cleanup runs synchronously
    // on rerender; the new effect for p-new fires after.
    const oldPendingCount = pending.length;
    expect(oldPendingCount).toBeGreaterThan(0);

    // Switch patient mid-flight. Cleanup sets cancelled=true for old effect.
    rerender({ id: 'p-new' });

    // Now resolve the OLD patient's pending fetches with a high count. If
    // cancelled-flag works, the new patient's counts must NOT be set to this.
    await act(async () => {
      for (let i = 0; i < oldPendingCount; i += 1) {
        pending[i]({ resourceType: 'Bundle', total: 999, entry: [] });
      }
      // Yield microtasks so the old .then() runs (and is gated by cancelled).
      await Promise.resolve();
      await Promise.resolve();
    });

    // The new patient's counts should still be undefined (its fetches haven't
    // resolved). Critically, NONE of the extension-module values should be 999
    // (which would indicate the cancelled old setState leaked through).
    for (const key of extensionKeys) {
      const v = result.current[key];
      // Accept undefined (still loading) or a number that is NOT 999*types.
      expect(v === undefined || (typeof v === 'number' && v !== 999)).toBe(true);
    }
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

    const { result, rerender } = renderHook(
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
  });

  // -------------------------------------------------------------------------
  // Test 8 — reports emptiness (D-05 contract at hook level): with all-zero
  // mock, the hook calls reportEmptiness(moduleKey, true) for every
  // extension module. We override the no-op fallback by mocking the
  // useEmptyExtensionsCoordinator import so we can spy on the function.
  // -------------------------------------------------------------------------
  it('calls reportEmptiness(moduleKey, total === 0) for every extension module (D-05)', async () => {
    // All types resolve to 0 → every module is empty.
    mocks.client = makeCountClient({}) as unknown as typeof mocks.client;

    // Spy on reportEmptiness via a module-level mock for this test only.
    // We re-import the coordinator with a vi.doMock for isolation.
    const reportEmptiness = vi.fn();
    vi.doMock('../useEmptyExtensionsCoordinator', () => ({
      useEmptyExtensionsCoordinator: () => ({
        hideEmpty: false,
        setHideEmpty: () => {},
        reportEmptiness,
        emptyCount: 0,
        emptyModuleKeys: [],
        patientId: '',
      }),
    }));

    // Re-import the hook so it picks up the doMock.
    const { useMiiExtensionCounts: hookFresh } = await import(
      '../useMiiExtensionCounts'
    );

    renderHook(() => hookFresh('p-empty'));

    await waitFor(() => {
      expect(reportEmptiness.mock.calls.length).toBeGreaterThanOrEqual(
        extensionKeys.length,
      );
    });

    // Every extension module must have been reported as empty=true.
    for (const key of extensionKeys) {
      const calledWithKey = reportEmptiness.mock.calls.filter(
        (c) => c[0] === key,
      );
      expect(calledWithKey.length).toBeGreaterThan(0);
      // At least one call must be (key, true) for an all-zero mock.
      expect(calledWithKey.some((c) => c[1] === true)).toBe(true);
    }

    vi.doUnmock('../useEmptyExtensionsCoordinator');
  });
});
