/**
 * QUAL-02 — useCompletenessReport hook tests.
 *
 * Plan 05-03 delivers `src/hooks/useCompletenessReport.ts` exporting
 *   useCompletenessReport(client, types, sampleSize):
 *     Record<string, PerTypeReport<PerTypeCompletenessReport>>
 *
 * The hook MUST:
 *   - use a 4-concurrent worker pool (mirror useResourceCounts)
 *   - progressively populate the result map as each type resolves
 *   - debounce sample-size changes (500ms) to avoid recompute storms
 *   - cancel in-flight requests on unmount / dep-change
 *   - hit QualityMetricsCache on repeat invocations and skip sampling
 *   - push arithmetic-mean rollup into QualityMetricsContext via setCompleteness
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, act, renderHook, waitFor } from '@testing-library/react';
import type { ReactNode } from 'react';
import type { MedplumClient } from '@medplum/core';
import type { Resource } from '@medplum/fhirtypes';

import { useCompletenessReport } from '../hooks/useCompletenessReport';
import {
  QualityMetricsProvider,
  useQualityMetrics,
} from '../quality/QualityMetricsContext';

// Each test gets a unique server URL so the module-scoped
// QualityMetricsCache instance rebuilds from scratch (keyed by serverUrl)
// rather than bleeding cached reports from a previous test.
let serverCounter = 0;
function nextServerUrl(): string {
  serverCounter++;
  return `http://localhost:8080/fhir-${serverCounter}`;
}

// Build a minimal MedplumClient-like stub. The hook only calls
// `getBaseUrl()` + `searchResources(type, { _count })` via sampleResources.
function makeClient(options: {
  samplesByType: Record<string, Resource[]>;
  errorTypes?: string[];
  onSearchStart?: (type: string) => void;
  onSearchEnd?: (type: string) => void;
  delayMs?: number;
  serverUrl?: string;
}): MedplumClient {
  const {
    samplesByType,
    errorTypes = [],
    onSearchStart,
    onSearchEnd,
    delayMs = 0,
    serverUrl = nextServerUrl(),
  } = options;
  const searchResources = vi.fn(async (type: string) => {
    onSearchStart?.(type);
    if (delayMs > 0) {
      await new Promise((r) => setTimeout(r, delayMs));
    }
    try {
      if (errorTypes.includes(type)) {
        throw new Error(`search failed for ${type}`);
      }
      return samplesByType[type] ?? [];
    } finally {
      onSearchEnd?.(type);
    }
  });
  return {
    getBaseUrl: () => serverUrl,
    searchResources,
  } as unknown as MedplumClient;
}

function wrapper({ children }: { children: ReactNode }) {
  return <QualityMetricsProvider>{children}</QualityMetricsProvider>;
}

function flush() {
  return act(async () => {
    await Promise.resolve();
    await Promise.resolve();
    await Promise.resolve();
  });
}

beforeEach(() => {
  // Clean quality-metrics cache between tests so the in-memory module
  // singleton does not bleed state.
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

describe('useCompletenessReport (QUAL-02)', () => {
  it('is exported from src/hooks/useCompletenessReport', () => {
    expect(typeof useCompletenessReport).toBe('function');
  });

  it('starts every type as "loading"', () => {
    const client = makeClient({ samplesByType: { Condition: [], Observation: [] } });
    const { result } = renderHook(
      () => useCompletenessReport(client, ['Condition', 'Observation'], 100),
      { wrapper },
    );
    expect(result.current.Condition).toBe('loading');
    expect(result.current.Observation).toBe('loading');
  });

  it('settles each type independently; errors do not poison siblings', async () => {
    const condition = {
      resourceType: 'Condition',
      code: { coding: [{ system: 'x', code: 'y' }] },
      subject: { reference: 'Patient/1' },
      onsetDateTime: '2024-01-01',
    } as Resource;

    const client = makeClient({
      samplesByType: { Condition: [condition] },
      errorTypes: ['Observation'],
    });

    const { result } = renderHook(
      () => useCompletenessReport(client, ['Condition', 'Observation'], 100),
      { wrapper },
    );

    await waitFor(() => {
      expect(result.current.Condition).not.toBe('loading');
    });
    expect(result.current.Observation).toBe('error');
    expect(typeof result.current.Condition).toBe('object');
  });

  it('respects a 4-concurrent limit on sampling requests', async () => {
    let concurrent = 0;
    let peak = 0;
    const manyTypes = [
      'Condition',
      'Observation',
      'Patient',
      'Procedure',
      'MedicationStatement',
      'Encounter',
      'Consent',
    ];
    const samplesByType: Record<string, Resource[]> = {};
    for (const t of manyTypes) {
      samplesByType[t] = [{ resourceType: t } as Resource];
    }

    const client = makeClient({
      samplesByType,
      delayMs: 10,
      onSearchStart: () => {
        concurrent++;
        if (concurrent > peak) peak = concurrent;
      },
      onSearchEnd: () => {
        concurrent--;
      },
    });

    const { result } = renderHook(
      () => useCompletenessReport(client, manyTypes, 100),
      { wrapper },
    );

    await waitFor(() => {
      for (const t of manyTypes) {
        expect(result.current[t]).not.toBe('loading');
      }
    });
    expect(peak).toBeLessThanOrEqual(4);
    expect(peak).toBeGreaterThan(0);
  });

  it('debounces sampleSize changes — no new fetch before 500ms elapses', async () => {
    vi.useFakeTimers();
    const client = makeClient({
      samplesByType: { Condition: [{ resourceType: 'Condition' } as Resource] },
    });

    const { rerender } = renderHook(
      ({ size }: { size: number }) => useCompletenessReport(client, ['Condition'], size),
      {
        wrapper,
        initialProps: { size: 100 },
      },
    );

    // Let initial debounce expire + initial fetch complete.
    await act(async () => {
      vi.advanceTimersByTime(600);
    });
    await act(async () => {
      await Promise.resolve();
    });

    const callCountAfterInitial = (
      client.searchResources as unknown as { mock: { calls: unknown[] } }
    ).mock.calls.length;

    // Rapid changes — before the 500ms debounce elapses, no new fetch.
    rerender({ size: 120 });
    await act(async () => {
      vi.advanceTimersByTime(100);
    });
    rerender({ size: 140 });
    await act(async () => {
      vi.advanceTimersByTime(100);
    });

    const callCountMidstream = (
      client.searchResources as unknown as { mock: { calls: unknown[] } }
    ).mock.calls.length;
    expect(callCountMidstream).toBe(callCountAfterInitial);

    // After debounce elapses fully, the new size triggers a fetch.
    await act(async () => {
      vi.advanceTimersByTime(500);
    });
    await act(async () => {
      await Promise.resolve();
    });

    const callCountAfterDebounce = (
      client.searchResources as unknown as { mock: { calls: unknown[] } }
    ).mock.calls.length;
    expect(callCountAfterDebounce).toBeGreaterThan(callCountAfterInitial);
  });

  it('cache hit path — second render with same params does not re-fetch', async () => {
    const sharedUrl = nextServerUrl();
    const client = makeClient({
      samplesByType: { Condition: [{ resourceType: 'Condition' } as Resource] },
      serverUrl: sharedUrl,
    });

    const { result: r1, unmount } = renderHook(
      () => useCompletenessReport(client, ['Condition'], 100),
      { wrapper },
    );
    await waitFor(() => {
      expect(r1.current.Condition).not.toBe('loading');
    });
    const initialCalls = (
      client.searchResources as unknown as { mock: { calls: unknown[] } }
    ).mock.calls.length;
    unmount();

    // Same serverUrl so the cache singleton hits for this second render.
    const client2 = makeClient({
      samplesByType: { Condition: [{ resourceType: 'Condition' } as Resource] },
      serverUrl: sharedUrl,
    });
    const { result: r2 } = renderHook(
      () => useCompletenessReport(client2, ['Condition'], 100),
      { wrapper },
    );
    await flush();
    expect(r2.current.Condition).not.toBe('loading');
    const afterCalls = (
      client2.searchResources as unknown as { mock: { calls: unknown[] } }
    ).mock.calls.length;
    // client2 must not have been called at all — the cache hit on the
    // shared server URL means the second instance never fetches.
    expect(afterCalls).toBe(0);
    expect(initialCalls).toBeGreaterThan(0);
  });

  it('cancels pending state on unmount without console errors', async () => {
    const warn = vi.spyOn(console, 'error').mockImplementation(() => {});
    const client = makeClient({
      samplesByType: { Condition: [{ resourceType: 'Condition' } as Resource] },
      delayMs: 50,
    });
    const { unmount } = renderHook(
      () => useCompletenessReport(client, ['Condition'], 100),
      { wrapper },
    );
    // Unmount immediately; resolution happens after unmount.
    unmount();
    await new Promise((r) => setTimeout(r, 120));
    const stateErrors = warn.mock.calls.filter((c) =>
      String(c[0] ?? '').includes("can't perform a React state"),
    );
    expect(stateErrors.length).toBe(0);
  });

  it('rollup — pushes Math.rounded arithmetic mean into setCompleteness', async () => {
    // Craft samples where Condition reports 90% and Observation 30% —
    // arithmetic mean = 60% (not count-weighted).
    const completeCondition = (id: string): Resource => ({
      resourceType: 'Condition',
      id,
      code: { coding: [{ system: 's', code: 'c' }] },
      subject: { reference: 'Patient/1' },
      onsetDateTime: '2024-01-01',
    } as Resource);
    const partialCondition = (id: string): Resource => ({
      resourceType: 'Condition',
      id,
    } as Resource);
    const completeObservation = (id: string): Resource => ({
      resourceType: 'Observation',
      id,
      status: 'final',
      code: { coding: [{ system: 'l', code: 'loinc' }] },
      subject: { reference: 'Patient/1' },
      valueQuantity: { value: 1 },
      effectiveDateTime: '2024-01-01',
    } as Resource);
    const emptyObservation = (id: string): Resource => ({
      resourceType: 'Observation',
      id,
    } as Resource);

    // Condition profile has 4 required paths; with 5 resources of which
    // 5 are complete and 0 partial across 4 paths = 20/20 = 100%, too
    // clean. We want 90% overall for Condition: use 5 resources, 18/20.
    // Easiest: 4 complete + 1 "missing onset" resource → 4*4 + 1*3 = 19/20 = 95%.
    // To exactly hit 90%, use 10 resources: 9 complete (36) + 1 with 0 (0) → 36/40 = 90%.
    const conditionSample: Resource[] = [];
    for (let i = 0; i < 9; i++) conditionSample.push(completeCondition(`c-${i}`));
    conditionSample.push(partialCondition('c-bad'));

    // Observation profile has 5 required paths.
    // To hit 30%: 10 resources, 3 complete * 5 + 7 empty * 0 = 15/50 = 30%.
    const observationSample: Resource[] = [];
    for (let i = 0; i < 3; i++) observationSample.push(completeObservation(`o-${i}`));
    for (let i = 0; i < 7; i++) observationSample.push(emptyObservation(`o-bad-${i}`));

    const client = makeClient({
      samplesByType: {
        Condition: conditionSample,
        Observation: observationSample,
      },
    });

    const spy = vi.fn();
    function SetterSpy() {
      const { overallCompleteness } = useQualityMetrics();
      spy(overallCompleteness);
      return null;
    }
    function Harness() {
      useCompletenessReport(client, ['Condition', 'Observation'], 100);
      return <SetterSpy />;
    }

    render(
      <QualityMetricsProvider>
        <Harness />
      </QualityMetricsProvider>,
    );

    await waitFor(() => {
      // 90% + 30% → mean 60%
      expect(spy).toHaveBeenCalledWith(60);
    });
  });

  it('rollup — excludes no-profile (total===0) types from the average', async () => {
    const goodCondition: Resource = {
      resourceType: 'Condition',
      code: { coding: [{ system: 's', code: 'c' }] },
      subject: { reference: 'Patient/1' },
      onsetDateTime: '2024-01-01',
    } as Resource;

    const client = makeClient({
      samplesByType: {
        Condition: [goodCondition],
        // "ImagingStudy" is not in BUNDLED_PROFILE_TYPES — total will be 0
        // and the rollup must EXCLUDE it.
        ImagingStudy: [{ resourceType: 'ImagingStudy' } as Resource],
      },
    });

    const spy = vi.fn();
    function SetterSpy() {
      const { overallCompleteness } = useQualityMetrics();
      spy(overallCompleteness);
      return null;
    }
    function Harness() {
      useCompletenessReport(client, ['Condition', 'ImagingStudy'], 100);
      return <SetterSpy />;
    }
    render(
      <QualityMetricsProvider>
        <Harness />
      </QualityMetricsProvider>,
    );

    await waitFor(() => {
      // 100% for Condition alone; ImagingStudy excluded.
      expect(spy).toHaveBeenCalledWith(100);
    });
  });

  it('rollup — setCompleteness(undefined) when nothing has settled yet', async () => {
    const client = makeClient({
      samplesByType: { Condition: [{ resourceType: 'Condition' } as Resource] },
      delayMs: 5000, // hold forever within the assertion window
    });

    const spy = vi.fn();
    function SetterSpy() {
      const { overallCompleteness } = useQualityMetrics();
      spy(overallCompleteness);
      return null;
    }
    function Harness() {
      useCompletenessReport(client, ['Condition'], 100);
      return <SetterSpy />;
    }
    render(
      <QualityMetricsProvider>
        <Harness />
      </QualityMetricsProvider>,
    );

    // Still loading; rollup must have already been called with undefined.
    expect(spy).toHaveBeenCalledWith(undefined);
  });
});
