/**
 * PdfReportLayout — Plan 19-03 Task 1.
 *
 * Verifies the off-screen PDF layout component:
 * - Renders 2 pages when snapshots.length < 2 (cover + overview, no trends)
 * - Renders 3 pages when snapshots.length >= 2 (cover + overview + trends)
 * - Cover page text: title, captured timestamp, server URL, sample size, cohort, Local checks badge
 * - Overview page text: Overview heading, total resources, distinct types
 * - No-trends fallback italic line on overview page when snapshots < 2
 * - Cohort summary copy variants: 0, 1, <4, >=4 cohort sizes
 */
import { describe, it, expect, vi } from 'vitest';
import { createRef } from 'react';
import { render, screen } from '@testing-library/react';
import { MantineProvider } from '@mantine/core';
import { PdfReportLayout } from '../components/quality/PdfReportLayout';
import type { CountSummary as PdfCountSummary } from '../components/quality/PdfReportLayout';
import type { QualitySnapshot } from '../quality/trendsHistory';
import type { MetricKey } from '../quality/thresholds';

// ----- jsdom polyfills required by Mantine 8 + recharts -----
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

const BASE_SUMMARY: PdfCountSummary = {
  totalResources: 1234,
  distinctTypes: 15,
  totals: {
    completeness: 80,
    coverage: 70,
    validation: 95,
    plausibility: 99,
    labRanges: 95,
    duplicates: 99,
    references: 98,
  },
};

const BASE_THRESHOLDS: Record<MetricKey, number | null> = {
  completeness: 80,
  coverage: 70,
  validation: 95,
  plausibility: 99,
  labRanges: 95,
  duplicates: 99,
  references: 98,
};

function mkSnapshot(id: string): QualitySnapshot {
  return {
    id,
    capturedAt: new Date('2026-04-14T18:30:42Z').toISOString(),
    serverUrl: 'http://localhost:8080/fhir',
    sampleSize: 100,
    resourceTypes: [],
    cohortId: null,
    scores: {
      completeness: 80,
      coverage: 70,
      validation: 95,
      plausibility: 99,
      labRanges: 95,
      duplicates: 99,
      references: 98,
    },
    thresholds: { ...BASE_THRESHOLDS },
  };
}

function renderLayout(
  snapshots: QualitySnapshot[],
  overrides: Partial<{
    summary: PdfCountSummary;
    resourceTypes: string[];
    cohort: { id: string; name: string; patientCount: number } | null;
    sampleSize: number;
    serverUrl: string;
  }> = {},
) {
  const coverRef = createRef<HTMLDivElement>();
  const overviewRef = createRef<HTMLDivElement>();
  const trendsRef = createRef<HTMLDivElement>();
  return render(
    <MantineProvider>
      <PdfReportLayout
        snapshots={snapshots}
        summary={overrides.summary ?? BASE_SUMMARY}
        sampleSize={overrides.sampleSize ?? 100}
        resourceTypes={overrides.resourceTypes ?? []}
        cohort={overrides.cohort ?? null}
        thresholds={BASE_THRESHOLDS}
        serverUrl={overrides.serverUrl ?? 'http://localhost:8080/fhir'}
        capturedAt={new Date('2026-04-14T18:30:42Z')}
        appVersion="1.2.3"
        coverPageRef={coverRef}
        overviewPageRef={overviewRef}
        trendsPageRef={trendsRef}
      />
    </MantineProvider>,
  );
}

describe('PdfReportLayout', () => {
  it('renders 2 pages when snapshots < 2 (no Trends heading)', () => {
    renderLayout([]);
    expect(screen.getByText(/Page 1 of 2/)).toBeTruthy();
    expect(screen.getByText(/Page 2 of 2/)).toBeTruthy();
    expect(screen.queryByText(/Page 3 of/)).toBeNull();
    expect(screen.queryByRole('heading', { name: /^Trends$/ })).toBeNull();
  });

  it('renders 3 pages when snapshots >= 2 (includes Trends heading)', () => {
    renderLayout([mkSnapshot('a'), mkSnapshot('b')]);
    expect(screen.getByText(/Page 1 of 3/)).toBeTruthy();
    expect(screen.getByText(/Page 2 of 3/)).toBeTruthy();
    expect(screen.getByText(/Page 3 of 3/)).toBeTruthy();
    expect(screen.getByRole('heading', { name: /^Trends$/ })).toBeTruthy();
  });

  it('cover page contains locked text (title, captured, server, sample size, Local checks badge)', () => {
    renderLayout([]);
    expect(screen.getByText(/FHIR Exploder — Quality Report/)).toBeTruthy();
    expect(screen.getByText(/Captured:/)).toBeTruthy();
    expect(screen.getByText(/Server:\s*http:\/\/localhost:8080\/fhir/)).toBeTruthy();
    expect(screen.getByText(/Sample size:\s*100 resources per type/)).toBeTruthy();
    expect(screen.getByText(/Local checks/)).toBeTruthy();
  });

  it('overview page contains Overview heading and count totals', () => {
    renderLayout([]);
    expect(screen.getByRole('heading', { name: /^Overview$/ })).toBeTruthy();
    expect(screen.getByText(/Total resources on server:\s*1234/)).toBeTruthy();
    expect(screen.getByText(/Distinct resource types:\s*15/)).toBeTruthy();
  });

  it('shows italic no-trend-history fallback line when snapshots < 2', () => {
    renderLayout([]);
    // The literal asterisks are NOT expected in the DOM — we render as italic text.
    expect(
      screen.getByText(
        /No trend history — capture snapshots on the Trends tab to include them in future reports\./,
      ),
    ).toBeTruthy();
    // And does NOT render it when >= 2 snapshots.
  });

  it('hides the no-trend-history fallback line when snapshots >= 2', () => {
    renderLayout([mkSnapshot('a'), mkSnapshot('b')]);
    expect(
      screen.queryByText(/No trend history — capture snapshots on the Trends tab/),
    ).toBeNull();
  });

  it('resource-types summary formats: 0 → "All N resource types"', () => {
    renderLayout([], { resourceTypes: [] });
    expect(
      screen.getByText(/Resource types:\s*All 15 resource types/),
    ).toBeTruthy();
  });

  it('resource-types summary formats: 1 → "1 resource type: <name>"', () => {
    renderLayout([], { resourceTypes: ['Patient'] });
    expect(
      screen.getByText(/Resource types:\s*1 resource type:\s*Patient/),
    ).toBeTruthy();
  });

  it('resource-types summary formats: 3 → "N of total: a, b, c"', () => {
    renderLayout([], { resourceTypes: ['Patient', 'Observation', 'Condition'] });
    expect(
      screen.getByText(
        /Resource types:\s*3 of 15:\s*Patient,\s*Observation,\s*Condition/,
      ),
    ).toBeTruthy();
  });

  it('resource-types summary formats: 5 → "N of total: a, b, c, and K more"', () => {
    renderLayout([], {
      resourceTypes: [
        'Patient',
        'Observation',
        'Condition',
        'Encounter',
        'MedicationRequest',
      ],
    });
    expect(
      screen.getByText(
        /Resource types:\s*5 of 15:\s*Patient,\s*Observation,\s*Condition,\s*and 2 more/,
      ),
    ).toBeTruthy();
  });

  it('omits the Cohort line when no active cohort is provided', () => {
    renderLayout([], { cohort: null });
    expect(screen.queryByText(/^Cohort:/)).toBeNull();
  });

  it('renders the Cohort line with name + patient count when cohort is provided', () => {
    renderLayout([], {
      cohort: { id: 'c-123', name: 'Diabetic 2024', patientCount: 1234 },
    });
    expect(
      screen.getByText(/Cohort:.*Diabetic 2024.*1,234 patients/),
    ).toBeTruthy();
  });
});
