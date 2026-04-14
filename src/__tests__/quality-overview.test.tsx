/**
 * QUAL-01 — QualityOverviewPage + OverviewStrip + ResourceCountsPanel.
 *
 * Wave 2 Plan 02 replaces the stub at
 * `src/components/quality/QualityOverviewPage.tsx` and introduces
 * OverviewStrip + ResourceCountsPanel + SummaryCard. This suite asserts
 * the page renders real content with title, toolbar, overview strip,
 * and a sortable counts table.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, within } from '@testing-library/react';
import { MantineProvider } from '@mantine/core';
import type { CapabilityStatement } from '@medplum/fhirtypes';
import type { MedplumClient } from '@medplum/core';
import type { CountValue } from '../quality/types';

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

// ----- useResourceCounts mock (per test via mockImplementation) -----
const mockUseResourceCounts = vi.fn<
  (client: MedplumClient | null, types: string[]) => Record<string, CountValue>
>();

vi.mock('../hooks/useResourceCounts', () => ({
  useResourceCounts: (client: MedplumClient | null, types: string[]) =>
    mockUseResourceCounts(client, types),
}));

// ----- react-router-dom mock (outlet context only; Link still needed) -----
const mockCapability: CapabilityStatement = {
  resourceType: 'CapabilityStatement',
  status: 'active',
  date: '2026-04-12',
  kind: 'instance',
  fhirVersion: '4.0.1',
  format: ['json'],
  rest: [
    {
      mode: 'server',
      resource: [
        { type: 'Patient' },
        { type: 'Condition' },
        { type: 'Observation' },
      ],
    },
  ],
};
const mockClient = {
  search: vi.fn(),
  // Plan 05-03 replaced the CompletenessPanel stub with a real implementation
  // that consumes useCompletenessReport, which calls client.getBaseUrl().
  getBaseUrl: () => 'http://localhost:8080/fhir',
  searchResources: vi.fn(async () => []),
} as unknown as MedplumClient;
const mockOutletContext = { capability: mockCapability, client: mockClient };

vi.mock('react-router-dom', async (importOriginal) => {
  const actual = await importOriginal<typeof import('react-router-dom')>();
  return {
    ...actual,
    useOutletContext: () => mockOutletContext,
  };
});

// ----- notifications spy -----
const mockNotificationsShow = vi.fn();
vi.mock('@mantine/notifications', () => ({
  notifications: { show: (...args: unknown[]) => mockNotificationsShow(...args) },
}));

// ----- CompletenessPanel mock -----
// Plan 05-03 replaces the stub with a real sampling panel. For the
// QualityOverviewPage shell tests we only care that the panel mounts
// inside the Tabs; sampling behavior is verified in completeness-hook.
vi.mock('../components/quality/CompletenessPanel', () => ({
  CompletenessPanel: () => (
    <div data-testid="mock-CompletenessPanel">Mock Completeness Panel</div>
  ),
}));

// ----- CodingCoveragePanel mock -----
// Plan 05-04 replaces the stub with a real sampling panel. Same rationale
// as the Completeness mock above — coverage behavior is verified in
// coding-coverage-panel.test.tsx.
vi.mock('../components/quality/CodingCoveragePanel', () => ({
  CodingCoveragePanel: () => (
    <div data-testid="mock-CodingCoveragePanel">Mock Coding Coverage Panel</div>
  ),
}));

// ----- ValidationPanel mock -----
// Plan 05-05 replaces the stub with a real batch validator panel.
// Same rationale as the Completeness/Coding mocks above — validation
// behavior is verified in validation-panel.test.tsx.
vi.mock('../components/quality/ValidationPanel', () => ({
  ValidationPanel: () => (
    <div data-testid="mock-ValidationPanel">Mock Validation Panel</div>
  ),
}));

// ----- PlausibilityPanel mock -----
// Phase 16 Plan 04 adds Plausibility and Lab Ranges tabs. Same rationale
// as above — behavior is verified in dedicated panel tests.
vi.mock('../components/quality/PlausibilityPanel', () => ({
  PlausibilityPanel: () => (
    <div data-testid="mock-PlausibilityPanel">Mock Plausibility Panel</div>
  ),
}));

// ----- LabRangesPanel mock -----
vi.mock('../components/quality/LabRangesPanel', () => ({
  LabRangesPanel: () => (
    <div data-testid="mock-LabRangesPanel">Mock Lab Ranges Panel</div>
  ),
}));

// ----- Imports AFTER mocks are configured -----
import { MemoryRouter } from 'react-router-dom';
import { QualityOverviewPage } from '../components/quality/QualityOverviewPage';
import { OverviewStrip } from '../components/quality/OverviewStrip';
import {
  QualityMetricsProvider,
  useQualityMetrics as useQualityMetricsContext,
} from '../quality/QualityMetricsContext';
import { useEffect } from 'react';

function renderPage() {
  return render(
    <MantineProvider>
      <MemoryRouter>
        <QualityMetricsProvider>
          <QualityOverviewPage />
        </QualityMetricsProvider>
      </MemoryRouter>
    </MantineProvider>,
  );
}

beforeEach(() => {
  mockUseResourceCounts.mockReset();
  mockNotificationsShow.mockReset();
});

describe('QualityOverviewPage (QUAL-01)', () => {
  it('renders the "Data Quality" title and toolbar copy', () => {
    mockUseResourceCounts.mockReturnValue({ Patient: 120, Condition: 250, Observation: 'loading' });
    renderPage();
    expect(screen.getByText('Data Quality')).toBeDefined();
    expect(screen.getByText(/Last computed/)).toBeDefined();
    expect(screen.getByRole('button', { name: /Recompute metrics/ })).toBeDefined();
  });

  it('renders OverviewStrip with Total resources = 370 and Resource types = 2', () => {
    mockUseResourceCounts.mockReturnValue({ Patient: 120, Condition: 250, Observation: 'loading' });
    renderPage();
    expect(screen.getByText('Total resources')).toBeDefined();
    expect(screen.getByText('Resource types')).toBeDefined();
    expect(screen.getByText('Overall completeness')).toBeDefined();
    expect(screen.getByText('Overall coding coverage')).toBeDefined();
    // 120 + 250 = 370, formatted with toLocaleString. Locale in test is typically 'en-US' → "370".
    expect(screen.getByText('370')).toBeDefined();
    // typeCount: Patient + Condition = 2 (Observation is loading → excluded)
    expect(screen.getByText('2')).toBeDefined();
  });

  it('renders the counts table with Patient and Condition rows, and a loading spinner for Observation', () => {
    mockUseResourceCounts.mockReturnValue({ Patient: 120, Condition: 250, Observation: 'loading' });
    renderPage();
    // Resource-type link cells are anchors
    expect(screen.getByRole('link', { name: 'Patient' })).toBeDefined();
    expect(screen.getByRole('link', { name: 'Condition' })).toBeDefined();
    expect(screen.getByRole('link', { name: 'Observation' })).toBeDefined();
    // Counts text
    expect(screen.getByText('120')).toBeDefined();
    expect(screen.getByText('250')).toBeDefined();
  });

  it('clicking Recompute metrics calls notifications.show', () => {
    mockUseResourceCounts.mockReturnValue({ Patient: 120 });
    renderPage();
    const btn = screen.getByRole('button', { name: /Recompute metrics/ });
    fireEvent.click(btn);
    expect(mockNotificationsShow).toHaveBeenCalledTimes(1);
  });

  it('each sortable column header exposes aria-sort', () => {
    mockUseResourceCounts.mockReturnValue({ Patient: 120, Condition: 250 });
    renderPage();
    const headers = screen.getAllByRole('columnheader');
    // Resource type + Count headers both carry aria-sort. Distribution has none.
    const sortableHeaders = headers.filter(h => h.hasAttribute('aria-sort'));
    expect(sortableHeaders.length).toBeGreaterThanOrEqual(2);
  });

  it('tab panels mount with keepMounted — Completeness (05-03), Coverage (05-04), and Validation (05-05) are all mocked', () => {
    mockUseResourceCounts.mockReturnValue({ Patient: 120 });
    renderPage();
    // Plans 05-03, 05-04, and 05-05 replaced their respective stubs; tests mock them.
    expect(screen.getByTestId('mock-CompletenessPanel')).toBeDefined();
    expect(screen.getByTestId('mock-CodingCoveragePanel')).toBeDefined();
    expect(screen.getByTestId('mock-ValidationPanel')).toBeDefined();
  });

  it('Show empty types toggle reveals zero-count rows', () => {
    mockUseResourceCounts.mockReturnValue({ Patient: 120, EmptyType: 0 });
    renderPage();
    // By default, EmptyType row hidden
    expect(screen.queryByRole('link', { name: 'EmptyType' })).toBeNull();
    const toggle = screen.getByRole('switch', { name: /Show empty types/ });
    fireEvent.click(toggle);
    expect(screen.getByRole('link', { name: 'EmptyType' })).toBeDefined();
  });
});

describe('OverviewStrip context consumption', () => {
  function ContextFillerHarness({
    completeness,
    coverage,
  }: {
    completeness?: number;
    coverage?: number;
  }) {
    const { setCompleteness, setCoverage } = useQualityMetricsContext();
    useEffect(() => {
      if (completeness !== undefined) setCompleteness(completeness);
      if (coverage !== undefined) setCoverage(coverage);
    }, [completeness, coverage, setCompleteness, setCoverage]);
    return null;
  }

  function renderStrip(opts: { completeness?: number; coverage?: number } = {}) {
    return render(
      <MantineProvider>
        <MemoryRouter>
          <QualityMetricsProvider>
            <ContextFillerHarness
              completeness={opts.completeness}
              coverage={opts.coverage}
            />
            <OverviewStrip
              summary={{ total: 1000, typeCount: 10, loadingCount: 0, errorCount: 0 }}
              isLoading={false}
            />
          </QualityMetricsProvider>
        </MemoryRouter>
      </MantineProvider>,
    );
  }

  it('renders em-dash when overallCompleteness / overallCoverage are undefined', () => {
    renderStrip();
    // There should be at least 2 em-dashes (for completeness + coverage cards)
    const dashes = screen.getAllByText('—');
    expect(dashes.length).toBeGreaterThanOrEqual(2);
  });

  it('renders "72%" when setCompleteness(72) is called via provider', () => {
    renderStrip({ completeness: 72 });
    expect(screen.getByText('72%')).toBeDefined();
  });

  it('renders "84%" when setCoverage(84) is called via provider', () => {
    renderStrip({ coverage: 84 });
    expect(screen.getByText('84%')).toBeDefined();
  });
});

describe('OverviewStrip props shape (regression guard)', () => {
  it('renders even when context is the no-op fallback (outside provider)', () => {
    render(
      <MantineProvider>
        <MemoryRouter>
          <OverviewStrip
            summary={{ total: 42, typeCount: 3, loadingCount: 0, errorCount: 0 }}
            isLoading={false}
          />
        </MemoryRouter>
      </MantineProvider>,
    );
    // Total resources card shows "42" (locale-formatted)
    expect(screen.getByText('42')).toBeDefined();
    // 3 types
    expect(screen.getByText('3')).toBeDefined();
    // Em-dash for both overall cards (undefined from fallback)
    const dashes = screen.getAllByText('—');
    expect(dashes.length).toBeGreaterThanOrEqual(2);
  });
});

// Keep `within` referenced to satisfy strict unused-import checks
void within;
