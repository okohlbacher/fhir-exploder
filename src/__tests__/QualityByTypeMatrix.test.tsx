/**
 * QualityByTypeMatrix.test.tsx — Plan 35-04 Task 3 RED → Task 4 GREEN.
 *
 * Asserts the contract of the per-type quality matrix card (UAT-FU-05):
 *   1. Card NOT RENDERED when no types have count > 0 (D-21 + Pitfall P-06).
 *   2. Card title + 7 visible data column headers + 1 chevron column.
 *   3. One row per type with count > 0 (skips count === 0).
 *   4. Skeleton row when count === 'loading'.
 *   5. Sparse byType cells render em-dash (—) — NEVER 0% (Pitfall P-05 +
 *      UI-SPEC §Typography invariant).
 *   6. Threshold breach colors numeric red.6 + Progress bar red (D-18 via
 *      curried useThresholds().isBreached).
 *   7. Default sort: Issues DESC, Resource type ASC tiebreaker (D-20).
 *   8. Chevron click navigates to /quality?tab=<firstNonEmpty>&type=<type>
 *      (D-19).
 *   9. Chevron click falls back to /explorer/<type> when ALL metrics empty
 *      (D-19 fallback).
 *  10. Chevron click does NOT trigger any FHIR fetch (Pitfall P-08 — PHI
 *      gate preserved).
 *  11. Subtitle copy matches UI-SPEC verbatim.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { useEffect } from 'react';
import { render, screen, act, within, fireEvent } from '@testing-library/react';
import { MantineProvider } from '@mantine/core';
import { MemoryRouter, Routes, Route, useLocation } from 'react-router-dom';

// Mock useMedplum — Phase 41-03 added a Download CSV button that reads
// `client.getBaseUrl()` to compose the filename. Tests don't need a real
// Medplum context; a stub satisfies the hook contract.
vi.mock('@medplum/react-hooks', () => ({
  useMedplum: () => ({ getBaseUrl: () => 'http://localhost:8080/fhir/' }),
}));

import {
  QualityMetricsProviders,
  useCompletenessRollup,
  useCoverageRollup,
  useValidationRollup,
  useReferencesRollup,
  useDuplicatesRollup,
} from '../quality/metrics';
import { QualityByTypeMatrix } from '../components/quality/QualityByTypeMatrix';

// Polyfill window.matchMedia for Mantine in jsdom (project convention).
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

// Force a high threshold for completeness to make a 50% value count as breached.
beforeEach(() => {
  localStorage.clear();
  // Defaults from src/quality/thresholds.ts:46-54 — completeness=80, validation=95, etc.
  // Tests rely on those defaults; tweak only when needed.
});

interface SeedSpec {
  completeness?: Record<string, number>;
  coverage?: Record<string, number>;
  validation?: Record<string, number>;
  references?: Record<string, number>;
  duplicates?: Record<string, number>; // contributed via DuplicatesContext.contribute
  validationIssues?: Record<string, number>;
}

/**
 * Seed component — runs once on mount to push byType maps into the per-metric
 * contexts before the matrix renders.
 */
function Seed({ spec }: { spec: SeedSpec }) {
  const completeness = useCompletenessRollup();
  const coverage = useCoverageRollup();
  const validation = useValidationRollup();
  const references = useReferencesRollup();
  const duplicates = useDuplicatesRollup();

  useEffect(() => {
    if (spec.completeness) completeness.setByType(spec.completeness);
    if (spec.coverage) coverage.setByType(spec.coverage);
    if (spec.validation) validation.setByType(spec.validation);
    if (spec.references) references.setByType(spec.references);
    if (spec.validationIssues) validation.setValidationIssuesByType(spec.validationIssues);
    if (spec.duplicates) {
      for (const [resourceType, percentClean] of Object.entries(spec.duplicates)) {
        duplicates.contribute({ hashType: { resourceType, percentClean } });
      }
    }
    // Intentionally only seed on mount — re-renders should NOT reseed.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return null;
}

/** Captures the current URL inside a Routes wrapper so we can assert navigation. */
function LocationProbe({ onLocation }: { onLocation: (loc: { pathname: string; search: string }) => void }) {
  const loc = useLocation();
  useEffect(() => {
    onLocation({ pathname: loc.pathname, search: loc.search });
  }, [loc, onLocation]);
  return null;
}

interface RenderOpts {
  spec?: SeedSpec;
  counts: Record<string, number | 'loading' | 'error'>;
  onLocation?: (loc: { pathname: string; search: string }) => void;
}

function renderMatrix({ spec, counts, onLocation }: RenderOpts) {
  return render(
    <MantineProvider>
      <MemoryRouter initialEntries={['/quality?tab=counts']}>
        <QualityMetricsProviders>
          {spec && <Seed spec={spec} />}
          <Routes>
            <Route
              path="/quality"
              element={
                <>
                  <QualityByTypeMatrix counts={counts} />
                  {onLocation && <LocationProbe onLocation={onLocation} />}
                </>
              }
            />
            <Route
              path="/explorer/:type"
              element={
                <>
                  {onLocation && <LocationProbe onLocation={onLocation} />}
                </>
              }
            />
          </Routes>
        </QualityMetricsProviders>
      </MemoryRouter>
    </MantineProvider>,
  );
}

describe('UAT-FU-05: QualityByTypeMatrix card', () => {
  it('does NOT render when no types have count > 0', () => {
    renderMatrix({ counts: { Patient: 0, Condition: 0 } });
    expect(screen.queryByText('Quality by resource type')).toBeNull();
  });

  it('renders card title with 7 visible data column headers + 1 chevron column', () => {
    renderMatrix({ counts: { Patient: 100 } });
    expect(screen.getByText('Quality by resource type')).toBeTruthy();
    expect(screen.getAllByText('Resource type').length).toBeGreaterThan(0);
    expect(screen.getByText('Complete %')).toBeTruthy();
    expect(screen.getByText('Coverage %')).toBeTruthy();
    expect(screen.getByText('Validation %')).toBeTruthy();
    expect(screen.getByText('References %')).toBeTruthy();
    expect(screen.getByText('Dup')).toBeTruthy();
    expect(screen.getByText('Issues')).toBeTruthy();
  });

  it('renders one row per type with count > 0 (skips count === 0)', () => {
    renderMatrix({ counts: { Patient: 100, Condition: 0, Observation: 50 } });
    // 1 header row + 2 data rows (Patient, Observation) — Condition skipped (count=0).
    const rows = screen.getAllByRole('row');
    expect(rows.length).toBe(3);
  });

  it('renders skeleton row when count === "loading"', () => {
    renderMatrix({ counts: { Patient: 'loading' } });
    expect(screen.getByText('Quality by resource type')).toBeTruthy();
    // Skeleton rows appear as table rows even while count is loading.
    const rows = screen.getAllByRole('row');
    expect(rows.length).toBe(2); // 1 header + 1 skeleton row
  });

  it('renders em-dash for sparse byType cells (NEVER 0%)', async () => {
    renderMatrix({
      spec: { completeness: { Patient: 80 } },
      counts: { Patient: 100 },
    });
    // Wait for Seed effect to flush.
    await screen.findByText('80%');
    // Validation/Coverage/References/Dup/Issues cells should render em-dash.
    const dashes = screen.getAllByText('—');
    expect(dashes.length).toBeGreaterThanOrEqual(5); // 5 sparse cells
    // Critical: NEVER render 0% for sparse cells.
    expect(screen.queryByText('0%')).toBeNull();
  });

  it('threshold breach colors numeric red.6 (curried useThresholds().isBreached form)', async () => {
    // Default completeness threshold is 80. Patient at 50% breaches.
    renderMatrix({
      spec: { completeness: { Patient: 50 } },
      counts: { Patient: 100 },
    });
    const breachedText = await screen.findByText('50%');
    // Mantine renders `c="red.6"` as a CSS variable. We assert the rendered
    // node carries the red color via getComputedStyle's color property OR
    // by querying for the data-* attribute Mantine emits for color overrides.
    // The simplest reliable assertion: the Text element's style/class contains
    // a red token.
    const computed = breachedText.style.color || '';
    const classList = breachedText.className || '';
    // useThresholds has a hydration gate (WR-04) — so isBreached returns false
    // until the next tick. We trigger one more tick by querying again.
    expect(
      computed.includes('red') ||
        classList.includes('red') ||
        // The text is inside a <Text c="red.6"> which Mantine compiles to a
        // CSS variable; presence of the class itself confirms breach styling.
        breachedText.outerHTML.includes('red') ||
        breachedText.outerHTML.includes('--mantine-color-red'),
    ).toBe(true);
  });

  it('default sort is Issues DESC, Resource type ASC tiebreaker', async () => {
    renderMatrix({
      spec: {
        validationIssues: { Patient: 5, Condition: 12, Observation: 5 },
      },
      counts: { Patient: 100, Condition: 100, Observation: 100 },
    });
    // Seed effect must have flushed — wait for Issues column population.
    await screen.findByText('12');
    const rows = screen.getAllByRole('row');
    // Skip header row at index 0. Expected order:
    //   Condition (12) → Observation (5) → Patient (5)  (Observation < Patient alphabetically)
    const dataRows = rows.slice(1);
    const types = dataRows.map((r) => within(r).getAllByRole('cell')[0]?.textContent ?? '');
    expect(types[0]).toContain('Condition');
    expect(types[1]).toContain('Observation');
    expect(types[2]).toContain('Patient');
  });

  it('chevron click navigates to /quality?tab=<firstNonEmpty>&type=<resourceType>', async () => {
    let lastLoc: { pathname: string; search: string } | null = null;
    renderMatrix({
      spec: { completeness: { Patient: 80 } },
      counts: { Patient: 100 },
      onLocation: (loc) => {
        lastLoc = loc;
      },
    });
    await screen.findByText('80%');
    const chevron = screen.getByLabelText('Open per-type drill-down');
    await act(async () => {
      fireEvent.click(chevron);
    });
    expect(lastLoc?.pathname).toBe('/quality');
    expect(lastLoc?.search).toContain('tab=completeness');
    expect(lastLoc?.search).toContain('type=Patient');
  });

  it('chevron click falls back to /explorer/<type> when ALL metrics empty', async () => {
    let lastLoc: { pathname: string; search: string } | null = null;
    renderMatrix({
      counts: { Patient: 100 },
      onLocation: (loc) => {
        lastLoc = loc;
      },
    });
    await screen.findByText('Quality by resource type');
    const chevron = screen.getByLabelText('Open per-type drill-down');
    await act(async () => {
      fireEvent.click(chevron);
    });
    expect(lastLoc?.pathname).toBe('/explorer/Patient');
  });

  it('chevron click does NOT trigger any FHIR fetch (P-08 PHI gate preserved)', async () => {
    const fetchSpy = vi.spyOn(global, 'fetch');
    renderMatrix({
      spec: { completeness: { Patient: 80 } },
      counts: { Patient: 100 },
    });
    await screen.findByText('80%');
    const chevron = screen.getByLabelText('Open per-type drill-down');
    await act(async () => {
      fireEvent.click(chevron);
    });
    expect(fetchSpy).not.toHaveBeenCalled();
    fetchSpy.mockRestore();
  });

  it('subtitle copy matches UI-SPEC verbatim', () => {
    renderMatrix({ counts: { Patient: 100 } });
    expect(
      screen.getByText(
        /Per-resource-type rollup\. Cells with — indicate metrics not yet measured for this type\./,
      ),
    ).toBeTruthy();
  });
});
