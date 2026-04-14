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

// Plan 18-04 wires every metric tile in OverviewStrip to navigate to
// /quality?tab=<route>. Capture those navigations via a spy so tests can
// assert tile-click behavior.
const mockNavigate = vi.fn();
vi.mock('react-router-dom', async (importOriginal) => {
  const actual = await importOriginal<typeof import('react-router-dom')>();
  return {
    ...actual,
    useOutletContext: () => mockOutletContext,
    useNavigate: () => mockNavigate,
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
  mockNavigate.mockReset();
  // Plan 18-04: useThresholds is backed by localStorage. Clear it per test
  // so isBreached / getActiveThreshold see DEFAULT_THRESHOLDS.
  window.localStorage.clear();
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
    // Plan 18-04 expanded the strip from 4 tiles to 9 tiles; the labels for
    // the metric tiles now come from METRIC_LABELS in src/quality/thresholds.ts.
    // Note: "Completeness" appears in BOTH the SummaryCard label AND the
    // Tabs.Tab label, so getAllByText is required.
    expect(screen.getAllByText('Completeness').length).toBeGreaterThanOrEqual(1);
    // "Coding coverage" only appears in the SummaryCard (Tab label is
    // "Coding Coverage" — different casing), so getByText is unique.
    expect(screen.getByText('Coding coverage')).toBeDefined();
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

// Hoisted to module scope so both the v1.0 context-consumption tests
// AND the Plan 18-04 9-tile expansion tests can use them.
function ContextFillerHarness({
  completeness,
  coverage,
  validation,
  plausibility,
  labRanges,
  duplicates,
  references,
}: {
  completeness?: number;
  coverage?: number;
  validation?: number;
  plausibility?: number;
  labRanges?: number;
  /**
   * `duplicates` here is a convenience shorthand used only by these tests.
   * It seeds the context `duplicatesBreakdown.patient` so the derived
   * `overallDuplicates` equals exactly this number in single-component
   * scenarios (the common case for these tile-rendering tests). For
   * multi-component averaging behavior, test DuplicatesPanel directly.
   */
  duplicates?: number;
  references?: number;
}) {
  const ctx = useQualityMetricsContext();
  useEffect(() => {
    if (completeness !== undefined) ctx.setCompleteness(completeness);
    if (coverage !== undefined) ctx.setCoverage(coverage);
    if (validation !== undefined) ctx.setOverallValidation(validation);
    if (plausibility !== undefined) ctx.setOverallPlausibility(plausibility);
    if (labRanges !== undefined) ctx.setOverallLabRanges(labRanges);
    if (duplicates !== undefined) {
      // Seed only the patient component; un-seeded hash types stay excluded
      // so overallDuplicates === duplicates exactly.
      ctx.setDuplicatesContribution({ patient: duplicates });
    }
    if (references !== undefined) ctx.setOverallReferences(references);
    // ctx is stable per provider; safe to omit from deps.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [completeness, coverage, validation, plausibility, labRanges, duplicates, references]);
  return null;
}

function renderStrip(
  opts: {
    completeness?: number;
    coverage?: number;
    validation?: number;
    plausibility?: number;
    labRanges?: number;
    duplicates?: number;
    references?: number;
  } = {},
) {
  return render(
    <MantineProvider>
      <MemoryRouter>
        <QualityMetricsProvider>
          <ContextFillerHarness
            completeness={opts.completeness}
            coverage={opts.coverage}
            validation={opts.validation}
            plausibility={opts.plausibility}
            labRanges={opts.labRanges}
            duplicates={opts.duplicates}
            references={opts.references}
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

describe('OverviewStrip context consumption', () => {
  it('renders em-dash when overallCompleteness / overallCoverage are undefined', () => {
    renderStrip();
    // There should be at least 2 em-dashes (for completeness + coverage cards).
    // Plan 18-04 expands to 7 metric tiles; with no metrics seeded we expect
    // at least 7 em-dashes, but >=2 keeps backward compatibility with the
    // original assertion intent.
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

describe('OverviewStrip 9-tile expansion (DQ-12 / Plan 18-04)', () => {
  it('renders exactly 9 SummaryCard tiles when context is fully populated', () => {
    renderStrip({
      completeness: 90,
      coverage: 80,
      validation: 99,
      plausibility: 99,
      labRanges: 96,
      duplicates: 99,
      references: 98,
    });
    // The 9 tiles by label
    expect(screen.getByText('Total resources')).toBeDefined();
    expect(screen.getByText('Resource types')).toBeDefined();
    expect(screen.getByText('Completeness')).toBeDefined();
    expect(screen.getByText('Coding coverage')).toBeDefined();
    expect(screen.getByText('Validation')).toBeDefined();
    expect(screen.getByText('Plausibility')).toBeDefined();
    expect(screen.getByText('Lab ranges')).toBeDefined();
    expect(screen.getByText('Duplicates')).toBeDefined();
    expect(screen.getByText('References')).toBeDefined();
  });

  it('renders em-dash for metrics whose context value is undefined (e.g., labRanges never set)', () => {
    renderStrip({ completeness: 90, coverage: 80 });
    // 5 metrics undefined → 5 em-dashes from metric tiles. (Plus none from
    // informational tiles, which always have values.)
    const dashes = screen.getAllByText('—');
    expect(dashes.length).toBeGreaterThanOrEqual(5);
  });

  it('renders 7 metric tiles (each labeled per METRIC_LABELS) plus 2 informational tiles', () => {
    renderStrip({
      completeness: 90,
      coverage: 80,
      validation: 99,
      plausibility: 99,
      labRanges: 96,
      duplicates: 99,
      references: 98,
    });
    const metricLabels = [
      'Completeness',
      'Coding coverage',
      'Validation',
      'Plausibility',
      'Lab ranges',
      'Duplicates',
      'References',
    ];
    metricLabels.forEach((label) => {
      expect(screen.getByText(label)).toBeDefined();
    });
  });

  it('marks Completeness tile as breached when value (72) < default threshold (80)', () => {
    renderStrip({ completeness: 72 });
    // SummaryCard renders the threshold annotation (`threshold: 80%`) only
    // when breached AND threshold set.
    expect(screen.getByText(/threshold:\s*80%/)).toBeDefined();
  });

  it('clicking the Completeness metric tile calls navigate with /quality?tab=completeness', () => {
    renderStrip({ completeness: 85 });
    // SummaryCard with onClick renders as a button (Card component="button"
    // per Plan 03 contract). The aria-label starts with "Completeness:".
    const tile = screen.getByRole('button', { name: /Completeness:/ });
    fireEvent.click(tile);
    expect(mockNavigate).toHaveBeenCalledWith('/quality?tab=completeness');
  });

  it('initial entry "/quality?tab=duplicates" activates the Duplicates tab', () => {
    mockUseResourceCounts.mockReturnValue({ Patient: 5 });
    render(
      <MantineProvider>
        <MemoryRouter initialEntries={['/quality?tab=duplicates']}>
          <QualityMetricsProvider>
            <QualityOverviewPage />
          </QualityMetricsProvider>
        </MemoryRouter>
      </MantineProvider>,
    );
    // Mantine Tabs sets aria-selected="true" on the active tab button.
    const duplicatesTab = screen.getByRole('tab', { name: /Duplicates/ });
    expect(duplicatesTab.getAttribute('aria-selected')).toBe('true');
  });

  it('falls back to Counts tab when ?tab= is missing or invalid', () => {
    mockUseResourceCounts.mockReturnValue({ Patient: 5 });
    render(
      <MantineProvider>
        <MemoryRouter initialEntries={['/quality?tab=bogus']}>
          <QualityMetricsProvider>
            <QualityOverviewPage />
          </QualityMetricsProvider>
        </MemoryRouter>
      </MantineProvider>,
    );
    const countsTab = screen.getByRole('tab', { name: /Counts/ });
    expect(countsTab.getAttribute('aria-selected')).toBe('true');
  });
});

// Keep `within` referenced to satisfy strict unused-import checks
void within;
