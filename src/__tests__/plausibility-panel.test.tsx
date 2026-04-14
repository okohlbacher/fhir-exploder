/**
 * PlausibilityPanel rollup tests — Phase 18, Plan 02, Task 6.
 *
 * Verifies PlausibilityPanel pushes overallPlausibility = round((1 - unique_affected/progress.total) * 100)
 * on terminal status; pushes undefined when progress.total === 0.
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

// ----- Mock useSettings -----
vi.mock('../hooks/useSettings', () => ({
  useSettings: () => ({
    settings: { fhir: { serverUrl: 'http://localhost:8080/fhir', auth: { mode: 'open' } } },
    usingDefaults: false,
    loading: false,
  }),
}));

// ----- Mock usePlausibilityReport -----
vi.mock('../hooks/usePlausibilityReport', () => ({
  usePlausibilityReport: vi.fn(),
}));
import { usePlausibilityReport } from '../hooks/usePlausibilityReport';

beforeEach(() => {
  window.localStorage.clear();
  vi.clearAllMocks();
});

import { QualityMetricsProvider, useQualityMetrics } from '../quality/QualityMetricsContext';
import { PlausibilityPanel } from '../components/quality/PlausibilityPanel';

function TestConsumer() {
  const { overallPlausibility } = useQualityMetrics();
  return (
    <div data-testid="overallPlausibility">
      {overallPlausibility === undefined ? '—' : overallPlausibility}
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

function makeIssue(resourceId: string): NormalizedIssue {
  return {
    resourceId,
    resourceType: resourceId.split('/')[0],
    field: 'birthDate',
    description: '[future-date] birthDate is in the future',
    severity: 'warning',
  };
}

function renderWithRun(mockRun: ReturnType<typeof usePlausibilityReport>) {
  (usePlausibilityReport as unknown as ReturnType<typeof vi.fn>).mockReturnValue(mockRun);
  return render(
    <Wrapper>
      <PlausibilityPanel types={['Patient']} client={fakeClient} sampleSize={100} />
      <TestConsumer />
    </Wrapper>,
  );
}

describe('PlausibilityPanel rollup (overallPlausibility)', () => {
  it('pushes overallPlausibility = round((1 - unique_affected/progress.total) * 100)', async () => {
    // 10 issues on 10 unique resourceIds + total 100 → round((1 - 10/100) * 100) = 90
    const issues: NormalizedIssue[] = [];
    for (let i = 0; i < 10; i++) issues.push(makeIssue(`Patient/p${i}`));
    renderWithRun({
      status: 'complete',
      progress: { current: 100, total: 100 },
      issues,
      start: vi.fn(),
      cancel: vi.fn(),
    } as unknown as ReturnType<typeof usePlausibilityReport>);
    await waitFor(() => {
      expect(screen.getByTestId('overallPlausibility').textContent).toBe('90');
    });
  });

  it('pushes undefined when progress.total === 0', async () => {
    renderWithRun({
      status: 'complete',
      progress: { current: 0, total: 0 },
      issues: [],
      start: vi.fn(),
      cancel: vi.fn(),
    } as unknown as ReturnType<typeof usePlausibilityReport>);
    await waitFor(() => {
      expect(screen.getByTestId('overallPlausibility').textContent).toBe('—');
    });
  });

  it('dedupes issues by resourceId (multiple issues per resource count as 1)', async () => {
    // 6 issues but only 2 unique resourceIds + total 100 → round((1 - 2/100) * 100) = 98
    const issues = [
      makeIssue('Patient/a'),
      makeIssue('Patient/a'),
      makeIssue('Patient/a'),
      makeIssue('Patient/b'),
      makeIssue('Patient/b'),
      makeIssue('Patient/b'),
    ];
    renderWithRun({
      status: 'complete',
      progress: { current: 100, total: 100 },
      issues,
      start: vi.fn(),
      cancel: vi.fn(),
    } as unknown as ReturnType<typeof usePlausibilityReport>);
    await waitFor(() => {
      expect(screen.getByTestId('overallPlausibility').textContent).toBe('98');
    });
  });
});
