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
