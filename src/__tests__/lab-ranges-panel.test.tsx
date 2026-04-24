/**
 * LabRangesPanel rollup tests — Phase 18, Plan 02, Task 6.
 *
 * Verifies LabRangesPanel pushes overallLabRanges to QualityMetricsContext
 * with the correct semantics:
 *   - terminal status (complete|cancelled) → push round((1 - outOfRange/checked) * 100)
 *   - summary.checked === 0 → push undefined (em-dash, NOT 100%)
 *   - summary.noRange === summary.checked → push undefined (no ranges configured; pitfall 7)
 *   - mid-run (status === 'running') → no push (pitfall 2: avoid flicker)
 *
 * Strategy: mock useLabRangesReport for controlled inputs; render the panel
 * inside QualityMetricsProviders together with a TestConsumer that reads
 * overallLabRanges from context; assert the rendered observed value.
 */
import { describe, it, expect, vi, beforeEach, beforeAll } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import { MantineProvider } from '@mantine/core';
import { MemoryRouter } from 'react-router-dom';
import type { ReactNode } from 'react';
import type { MedplumClient } from '@medplum/core';

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

// ----- Mock useLabRangesReport -----
vi.mock('../hooks/useLabRangesReport', () => ({
  useLabRangesReport: vi.fn(),
}));
import { useLabRangesReport } from '../hooks/useLabRangesReport';

beforeEach(() => {
  window.localStorage.clear();
  vi.clearAllMocks();
});

import { QualityMetricsProviders } from '../quality/metrics';
import { useQualityMetrics } from '../quality/QualityMetricsContext';
import { LabRangesPanel } from '../components/quality/LabRangesPanel';

function TestConsumer() {
  const { overallLabRanges } = useQualityMetrics();
  return (
    <div data-testid="overallLabRanges">
      {overallLabRanges === undefined ? '—' : overallLabRanges}
    </div>
  );
}

function Wrapper({ children }: { children: ReactNode }) {
  return (
    <MantineProvider>
      <MemoryRouter>
        <QualityMetricsProviders>{children}</QualityMetricsProviders>
      </MemoryRouter>
    </MantineProvider>
  );
}

const fakeClient = {
  getBaseUrl: () => 'http://localhost:8080/fhir',
} as unknown as MedplumClient;

function renderWithRun(mockRun: ReturnType<typeof useLabRangesReport>) {
  (useLabRangesReport as unknown as ReturnType<typeof vi.fn>).mockReturnValue(mockRun);
  return render(
    <Wrapper>
      <LabRangesPanel client={fakeClient} sampleSize={100} />
      <TestConsumer />
    </Wrapper>,
  );
}

describe('LabRangesPanel rollup (overallLabRanges)', () => {
  it('pushes overallLabRanges = round((1 - outOfRange/checked) * 100) on complete', async () => {
    renderWithRun({
      status: 'complete',
      progress: { current: 100, total: 100 },
      issues: [],
      summary: { checked: 100, outOfRange: 5, inRange: 85, noRange: 10, perLoincCode: {} },
      start: vi.fn(),
      cancel: vi.fn(),
    } as unknown as ReturnType<typeof useLabRangesReport>);
    await waitFor(() => {
      expect(screen.getByTestId('overallLabRanges').textContent).toBe('95');
    });
  });

  it('pushes undefined when summary.noRange === summary.checked (no ranges configured)', async () => {
    renderWithRun({
      status: 'complete',
      progress: { current: 100, total: 100 },
      issues: [],
      summary: { checked: 100, outOfRange: 0, inRange: 0, noRange: 100, perLoincCode: {} },
      start: vi.fn(),
      cancel: vi.fn(),
    } as unknown as ReturnType<typeof useLabRangesReport>);
    await waitFor(() => {
      expect(screen.getByTestId('overallLabRanges').textContent).toBe('—');
    });
  });

  it('pushes undefined when summary.checked === 0', async () => {
    renderWithRun({
      status: 'complete',
      progress: { current: 0, total: 0 },
      issues: [],
      summary: { checked: 0, outOfRange: 0, inRange: 0, noRange: 0, perLoincCode: {} },
      start: vi.fn(),
      cancel: vi.fn(),
    } as unknown as ReturnType<typeof useLabRangesReport>);
    await waitFor(() => {
      expect(screen.getByTestId('overallLabRanges').textContent).toBe('—');
    });
  });

  it('does NOT push during running status (pitfall 2)', async () => {
    renderWithRun({
      status: 'running',
      progress: { current: 50, total: 100 },
      issues: [],
      summary: null,
      start: vi.fn(),
      cancel: vi.fn(),
    } as unknown as ReturnType<typeof useLabRangesReport>);
    // Allow microtask flush; the rollup useEffect must NOT fire under running status.
    await new Promise((r) => setTimeout(r, 50));
    expect(screen.getByTestId('overallLabRanges').textContent).toBe('—');
  });
});
