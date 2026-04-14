/**
 * ReferencesPanel rollup tests — Phase 18, Plan 02, Task 6.
 *
 * Verifies ReferencesPanel pushes overallReferences using:
 *   - sampleSize PROP as denominator (NOT run.progress.total which is batch count)
 *   - new Set(run.issues.map(i => i.resourceId)).size as numerator (unique dedup)
 *   - undefined when sampleSize === 0
 */
import { describe, it, expect, vi, beforeEach, beforeAll } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import { MantineProvider } from '@mantine/core';
import { MemoryRouter } from 'react-router-dom';
import type { ReactNode } from 'react';
import type { MedplumClient } from '@medplum/core';
import type { NormalizedIssue } from '../quality/types';

// ----- jsdom polyfills for Mantine 8 -----
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

// ----- Mock useReferenceReport -----
vi.mock('../hooks/useReferenceReport', () => ({
  useReferenceReport: vi.fn(),
}));
import { useReferenceReport } from '../hooks/useReferenceReport';

beforeEach(() => {
  window.localStorage.clear();
  vi.clearAllMocks();
});

import { QualityMetricsProvider, useQualityMetrics } from '../quality/QualityMetricsContext';
import { ReferencesPanel } from '../components/quality/ReferencesPanel';

function TestConsumer() {
  const { overallReferences } = useQualityMetrics();
  return (
    <div data-testid="overallReferences">
      {overallReferences === undefined ? '—' : overallReferences}
    </div>
  );
}

function Wrapper({ children }: { children: ReactNode }) {
  return (
    <MantineProvider>
      <MemoryRouter>
        <QualityMetricsProvider>{children}</QualityMetricsProvider>
      </MemoryRouter>
    </MantineProvider>
  );
}

const fakeClient = {
  getBaseUrl: () => 'http://localhost:8080/fhir',
} as unknown as MedplumClient;

function makeIssue(resourceId: string, kind: 'broken-ref' | 'orphan' = 'broken-ref'): NormalizedIssue {
  return {
    resourceId,
    resourceType: resourceId.split('/')[0],
    field: 'subject',
    description: `[${kind}] missing target`,
    severity: 'error',
  };
}

function renderWithRun(
  mockRun: ReturnType<typeof useReferenceReport>,
  sampleSize = 100,
) {
  (useReferenceReport as unknown as ReturnType<typeof vi.fn>).mockReturnValue(mockRun);
  return render(
    <Wrapper>
      <ReferencesPanel types={['Encounter']} client={fakeClient} sampleSize={sampleSize} />
      <TestConsumer />
    </Wrapper>,
  );
}

describe('ReferencesPanel rollup (overallReferences)', () => {
  it('pushes overallReferences = round((1 - unique_affected/sampleSize) * 100)', async () => {
    renderWithRun({
      status: 'complete',
      // progress.total here is BATCH count (not resource count) — test must not
      // rely on it for the rollup denominator.
      progress: { current: 4, total: 4 },
      issues: [
        makeIssue('Encounter/e1'),
        makeIssue('Encounter/e2'),
        makeIssue('Encounter/e3'),
      ],
      brokenCount: 3,
      orphanCount: 0,
      start: vi.fn(),
      cancel: vi.fn(),
    } as unknown as ReturnType<typeof useReferenceReport>);
    await waitFor(() => {
      // 3 unique resourceIds / 100 sampleSize → round((1 - 0.03) * 100) = 97
      expect(screen.getByTestId('overallReferences').textContent).toBe('97');
    });
  });

  it('uses unique resourceId count (NOT brokenCount, NOT progress.total)', async () => {
    renderWithRun({
      status: 'complete',
      progress: { current: 50, total: 50 }, // batch count: irrelevant
      issues: [
        // 5 issues, all on the SAME resourceId — dedup should count 1
        makeIssue('Encounter/e1', 'broken-ref'),
        makeIssue('Encounter/e1', 'broken-ref'),
        makeIssue('Encounter/e1', 'broken-ref'),
        makeIssue('Encounter/e1', 'orphan'),
        makeIssue('Encounter/e1', 'broken-ref'),
      ],
      brokenCount: 4, // would mislead if used
      orphanCount: 1,
      start: vi.fn(),
      cancel: vi.fn(),
    } as unknown as ReturnType<typeof useReferenceReport>);
    await waitFor(() => {
      // 1 unique resourceId / 100 → round((1 - 0.01) * 100) = 99
      expect(screen.getByTestId('overallReferences').textContent).toBe('99');
    });
  });

  it('pushes undefined when sampleSize === 0', async () => {
    renderWithRun(
      {
        status: 'complete',
        progress: { current: 0, total: 0 },
        issues: [],
        brokenCount: 0,
        orphanCount: 0,
        start: vi.fn(),
        cancel: vi.fn(),
      } as unknown as ReturnType<typeof useReferenceReport>,
      0, // sampleSize === 0
    );
    await waitFor(() => {
      expect(screen.getByTestId('overallReferences').textContent).toBe('—');
    });
  });
});
