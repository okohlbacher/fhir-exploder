/**
 * DuplicatesPanel regression tests -- Phase 17, Plan 03 (gap closure).
 *
 * Closes the verification gap for SC-1 (DQ-07) and SC-2 (DQ-08): the
 * previous panel implementation dereferenced a non-existent `.members`
 * field on PatientDuplicateCluster and ContentHashCluster, crashing the
 * Duplicates tab whenever the engine actually found duplicates.
 *
 * This suite exercises the summary-count useMemo path with non-empty
 * clusters using the REAL field names (.patients on PatientDuplicateCluster,
 * .resources on ContentHashCluster). If anyone re-introduces the
 * `c.members.length` bug, the integer-count assertions will fail because
 * `NaN` does not match `/\d+/`.
 *
 * Scope: summary memos + empty path. Drill-down navigation is covered by
 * 17-VERIFICATION.md human-UAT and is out of scope here.
 */
import { describe, it, expect, vi, beforeAll } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MantineProvider } from '@mantine/core';
import { MemoryRouter } from 'react-router-dom';
import type { ReactNode } from 'react';
import type { MedplumClient } from '@medplum/core';

// ----- jsdom polyfills required by Mantine 8 (copied from coding-coverage-panel.test.tsx) -----
class MockResizeObserver {
  observe = vi.fn();
  unobserve = vi.fn();
  disconnect = vi.fn();
}
beforeAll(() => {
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
});

// ----- Mock the hook so we control the cluster shapes injected into the panel. -----
// This is the EXACT regression surface: the panel must tolerate
// PatientDuplicateCluster (.patients) and ContentHashCluster (.resources).
const mockRun = {
  status: 'complete' as const,
  progress: { current: 0, total: 0 },
  issues: [
    {
      resourceId: 'Patient/p1',
      resourceType: 'Patient',
      field: 'name + birthDate',
      description: '[patient-duplicate] match',
      severity: 'warning' as const,
    },
    {
      resourceId: 'Patient/p2',
      resourceType: 'Patient',
      field: 'name + birthDate',
      description: '[patient-duplicate] match',
      severity: 'warning' as const,
    },
    {
      resourceId: 'Patient/p3',
      resourceType: 'Patient',
      field: 'content hash',
      description: '[content-hash] dup',
      severity: 'warning' as const,
    },
  ],
  duplicateClusters: [
    {
      key: 'doe|jane|1990-01-01',
      patients: [
        { id: 'Patient/p1', resourceType: 'Patient' },
        { id: 'Patient/p2', resourceType: 'Patient' },
      ],
    },
  ],
  contentHashClusters: [
    {
      hash: 'abcdef0123456789'.padEnd(64, '0'),
      resourceType: 'Patient',
      resources: [
        { id: 'Patient/p3', resourceType: 'Patient' },
        { id: 'Patient/p4', resourceType: 'Patient' },
        { id: 'Patient/p5', resourceType: 'Patient' },
      ],
    },
  ],
  skippedPatients: 0,
  errorMessage: undefined,
  start: vi.fn(),
  cancel: vi.fn(),
};
const emptyRun = {
  ...mockRun,
  issues: [],
  duplicateClusters: [],
  contentHashClusters: [],
};

let currentRun: typeof mockRun = mockRun;
vi.mock('../hooks/useDuplicateReport', () => ({
  useDuplicateReport: () => currentRun,
}));

// Import AFTER vi.mock so the panel picks up the mocked hook.
import { DuplicatesPanel } from '../components/quality/DuplicatesPanel';

function Wrapper({ children }: { children: ReactNode }) {
  return (
    <MantineProvider>
      <MemoryRouter>{children}</MemoryRouter>
    </MantineProvider>
  );
}

const fakeClient = {
  getBaseUrl: () => 'http://localhost:8080/',
} as unknown as MedplumClient;

describe('DuplicatesPanel (gap-closure regression for CR-01 / SC-1 / SC-2)', () => {
  it('renders non-empty cluster summaries without throwing (regression for c.members bug)', () => {
    currentRun = mockRun;
    expect(() =>
      render(
        <Wrapper>
          <DuplicatesPanel types={['Patient']} client={fakeClient} sampleSize={100} />
        </Wrapper>,
      ),
    ).not.toThrow();
    // Patient duplicate cluster summary line: "1 patient duplicate clusters (2 patients involved)"
    expect(screen.getByText(/1 patient duplicate clusters/)).toBeDefined();
    expect(screen.getByText(/2 patients involved/)).toBeDefined();
    // Content hash cluster summary line: "1 content hash clusters in Patient (3 resources involved)"
    expect(screen.getByText(/1 content hash clusters in Patient/)).toBeDefined();
    expect(screen.getByText(/3 resources involved/)).toBeDefined();
  });

  it('summary counts are finite integers, not NaN', () => {
    currentRun = mockRun;
    render(
      <Wrapper>
        <DuplicatesPanel types={['Patient']} client={fakeClient} sampleSize={100} />
      </Wrapper>,
    );
    // If the old c.members bug regresses, these would be "NaN patients involved".
    expect(screen.queryByText(/NaN patients involved/)).toBeNull();
    expect(screen.queryByText(/NaN resources involved/)).toBeNull();
    // And the positive assertion: explicit integer matches.
    expect(screen.getByText(/\(2 patients involved\)/)).toBeDefined();
    expect(screen.getByText(/\(3 resources involved\)/)).toBeDefined();
  });

  it('renders "No duplicates detected" when clusters are empty', () => {
    currentRun = emptyRun;
    render(
      <Wrapper>
        <DuplicatesPanel types={['Patient']} client={fakeClient} sampleSize={100} />
      </Wrapper>,
    );
    expect(screen.getByText(/No duplicates detected/)).toBeDefined();
  });
});

// =========================================================================
// Phase 18, Plan 18-02 — DuplicatesPanel per-type averaging contribution.
// =========================================================================
//
// Validates the RESOLVED 2026-04-14 RESEARCH Q1 behavior:
//   - DuplicatesPanel pushes setDuplicatesContribution({ patient, hashType })
//     on every terminal-status run with sampleSize > 0.
//   - QualityMetricsContext accumulates contributions in duplicatesBreakdown
//     and derives overallDuplicates as round(mean(definedComponents)).
//   - Switching the type and re-running ADDS a new entry to hashByType
//     (organic widening; prior types are NOT overwritten).
//   - sampleSize === 0 → no contribution → overallDuplicates stays undefined.
//   - mid-run → no contribution.
import { waitFor as waitForRollup } from '@testing-library/react';
import { QualityMetricsProviders } from '../quality/metrics';
import { useQualityMetrics } from '../quality/QualityMetricsContext';

function ProviderWrapper({ children }: { children: ReactNode }) {
  return (
    <MantineProvider>
      <MemoryRouter>
        <QualityMetricsProviders>{children}</QualityMetricsProviders>
      </MemoryRouter>
    </MantineProvider>
  );
}

function RollupConsumer() {
  const { overallDuplicates, duplicatesBreakdown } = useQualityMetrics();
  return (
    <>
      <div data-testid="overallDuplicates">
        {overallDuplicates === undefined ? '—' : overallDuplicates}
      </div>
      <div data-testid="patientPart">
        {duplicatesBreakdown.patient === undefined ? '—' : duplicatesBreakdown.patient}
      </div>
      <div data-testid="hashTypes">
        {Object.keys(duplicatesBreakdown.hashByType).join(',')}
      </div>
    </>
  );
}

describe('DuplicatesPanel per-type averaging contribution (DQ-12 / Plan 18-02 RESOLVED Q1)', () => {
  it('with patient-only run (no content-hash duplicates), overallDuplicates = mean(patient, hashType=100)', async () => {
    // 5 patients in a single duplicate cluster, no content-hash clusters.
    // Expected per-type contributions:
    //   patient = round((1 - 5/100) * 100) = 95
    //   hashType[Patient] = round((1 - 0/100) * 100) = 100
    //   overallDuplicates = round((95 + 100) / 2) = 98 (97.5 → V8 rounds to 98)
    currentRun = {
      ...emptyRun,
      duplicateClusters: [
        {
          key: 'doe|jane|1990-01-01',
          patients: [
            { id: 'Patient/p1', resourceType: 'Patient' },
            { id: 'Patient/p2', resourceType: 'Patient' },
            { id: 'Patient/p3', resourceType: 'Patient' },
            { id: 'Patient/p4', resourceType: 'Patient' },
            { id: 'Patient/p5', resourceType: 'Patient' },
          ],
        },
      ],
      contentHashClusters: [],
    };
    render(
      <ProviderWrapper>
        <DuplicatesPanel types={['Patient']} client={fakeClient} sampleSize={100} />
        <RollupConsumer />
      </ProviderWrapper>,
    );
    await waitForRollup(() => {
      expect(screen.getByTestId('patientPart').textContent).toBe('95');
      expect(screen.getByTestId('hashTypes').textContent).toBe('Patient');
      expect(screen.getByTestId('overallDuplicates').textContent).toBe('98');
    });
  });

  it('after running a different resourceType, overallDuplicates is the mean of all defined components', async () => {
    // The panel's internal `resourceType` useState defaults to types[0] and is
    // not re-initialized on prop change. To exercise the per-type widening
    // (Observation contribution + Encounter contribution accumulated in the
    // SAME provider), we render TWO sibling panels inside one provider with
    // different types[0] and let each push its own contribution.
    //
    // First panel (Observation): 5 patient duplicates + 2 obs in content-hash cluster.
    //   patient = 95, hashType[Observation] = round((1 - 2/100) * 100) = 98
    // Second panel (Encounter): SAME patient duplicates (mock provides the same
    //   `currentRun` to both panels, since the hook is mocked at module level —
    //   both will see Encounter cluster though). To get DIFFERENT contributions,
    //   we use the dynamic `currentRun` factory pattern: keep the patient set
    //   constant but include BOTH Observation AND Encounter content-hash clusters
    //   in the mock; each panel filters by its own selected resourceType.
    //
    //   patient = 95 (overwritten with same value),
    //   hashByType = { Observation: 98 (from panel 1), Encounter: round((1 - 1/100) * 100) = 99 (from panel 2) }
    //   overallDuplicates = round((95 + 98 + 99) / 3) = round(97.333) = 97
    currentRun = {
      ...emptyRun,
      duplicateClusters: [
        {
          key: 'patientPass',
          patients: [
            { id: 'Patient/q1', resourceType: 'Patient' },
            { id: 'Patient/q2', resourceType: 'Patient' },
            { id: 'Patient/q3', resourceType: 'Patient' },
            { id: 'Patient/q4', resourceType: 'Patient' },
            { id: 'Patient/q5', resourceType: 'Patient' },
          ],
        },
      ],
      contentHashClusters: [
        {
          hash: 'a'.repeat(64),
          resourceType: 'Observation',
          resources: [
            { id: 'Observation/o1', resourceType: 'Observation' },
            { id: 'Observation/o2', resourceType: 'Observation' },
          ],
        },
        {
          hash: 'b'.repeat(64),
          resourceType: 'Encounter',
          resources: [{ id: 'Encounter/e1', resourceType: 'Encounter' }],
        },
      ],
    };
    render(
      <ProviderWrapper>
        <DuplicatesPanel types={['Observation']} client={fakeClient} sampleSize={100} />
        <DuplicatesPanel types={['Encounter']} client={fakeClient} sampleSize={100} />
        <RollupConsumer />
      </ProviderWrapper>,
    );
    await waitForRollup(() => {
      // Both Observation AND Encounter should be in hashByType (organic widening).
      const hashTypes = screen.getByTestId('hashTypes').textContent ?? '';
      expect(hashTypes.split(',').sort().join(',')).toBe('Encounter,Observation');
      expect(screen.getByTestId('patientPart').textContent).toBe('95');
      // (95 + 98 + 99) / 3 = 97.333 → 97
      expect(screen.getByTestId('overallDuplicates').textContent).toBe('97');
    });
  });

  it('with sampleSize === 0, no contribution is pushed (overallDuplicates stays undefined)', async () => {
    currentRun = {
      ...emptyRun,
      duplicateClusters: [
        {
          key: 'foo',
          patients: [{ id: 'Patient/x', resourceType: 'Patient' }],
        },
      ],
    };
    render(
      <ProviderWrapper>
        <DuplicatesPanel types={['Patient']} client={fakeClient} sampleSize={0} />
        <RollupConsumer />
      </ProviderWrapper>,
    );
    await new Promise((r) => setTimeout(r, 50));
    expect(screen.getByTestId('overallDuplicates').textContent).toBe('—');
    expect(screen.getByTestId('patientPart').textContent).toBe('—');
    expect(screen.getByTestId('hashTypes').textContent).toBe('');
  });

  it('mid-run (status === "running") does NOT push a contribution', async () => {
    currentRun = {
      ...emptyRun,
      status: 'running' as unknown as typeof emptyRun.status,
      progress: { current: 30, total: 100 },
      duplicateClusters: [
        {
          key: 'inflight',
          patients: [
            { id: 'Patient/r1', resourceType: 'Patient' },
            { id: 'Patient/r2', resourceType: 'Patient' },
          ],
        },
      ],
    };
    render(
      <ProviderWrapper>
        <DuplicatesPanel types={['Patient']} client={fakeClient} sampleSize={100} />
        <RollupConsumer />
      </ProviderWrapper>,
    );
    await new Promise((r) => setTimeout(r, 50));
    expect(screen.getByTestId('overallDuplicates').textContent).toBe('—');
    expect(screen.getByTestId('patientPart').textContent).toBe('—');
    expect(screen.getByTestId('hashTypes').textContent).toBe('');
  });
});
