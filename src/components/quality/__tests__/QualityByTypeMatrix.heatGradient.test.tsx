/**
 * QualityByTypeMatrix.heatGradient.test.tsx — Plan 41-03 Task 3.
 *
 * Locks the QUAL-02 3-stop heat gradient on PercentTd cells:
 *   - green at value ≥ 100   (var(--mantine-color-green-1) bg + green-9 text)
 *   - yellow at threshold..<100  (yellow-1 + yellow-9)
 *   - red below threshold        (red-1 + red-9)
 *   - no color when value === undefined or threshold === null && value < 100
 *
 * D-12/D-13/D-14 from .planning/phases/41-explorer-quality-ux-polish/41-CONTEXT.md.
 *
 * The matrix's per-metric rollups + useThresholds hook are mocked so each
 * test drives a single byType value at a single threshold. Pure rendering
 * assertions on the inline `style` properties of the rendered <td> + <p>.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MantineProvider } from '@mantine/core';
import { MemoryRouter } from 'react-router-dom';

// jsdom polyfills for Mantine.
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

// Mock per-metric rollup hooks so a single byType value drives the matrix
// without needing the full QualityMetricsProviders tree.
const completenessMock = { byType: {} as Record<string, number> };
const coverageMock = { byType: {} as Record<string, number> };
const validationMock = {
  byType: {} as Record<string, number>,
  validationIssuesByType: {} as Record<string, number>,
};
const referencesMock = { byType: {} as Record<string, number> };
const duplicatesMock = { byType: {} as Record<string, number> };

vi.mock('../../../quality/metrics', () => ({
  useCompletenessRollup: () => completenessMock,
  useCoverageRollup: () => coverageMock,
  useValidationRollup: () => validationMock,
  useReferencesRollup: () => referencesMock,
  useDuplicatesRollup: () => duplicatesMock,
}));

// Mock useThresholds so we can drive getActiveThreshold per-test.
const thresholdsMock: {
  isBreached: () => boolean;
  getActiveThreshold: (key: string) => number | null;
} = {
  isBreached: () => false,
  getActiveThreshold: (_key: string) => 80,
};
vi.mock('../../../hooks/useThresholds', () => ({
  useThresholds: () => thresholdsMock,
}));

// Mock useMedplum — Download CSV button reads getBaseUrl() but the button
// click is not exercised by the heat-gradient tests.
vi.mock('@medplum/react-hooks', () => ({
  useMedplum: () => ({ getBaseUrl: () => 'http://localhost:8080/fhir/' }),
}));

import { QualityByTypeMatrix } from '../QualityByTypeMatrix';

function renderMatrix(counts: Record<string, number | 'loading' | 'error'>) {
  return render(
    <MantineProvider>
      <MemoryRouter>
        <QualityByTypeMatrix counts={counts} />
      </MemoryRouter>
    </MantineProvider>,
  );
}

beforeEach(() => {
  // Reset mocks to a known-clean baseline before every test.
  completenessMock.byType = {};
  coverageMock.byType = {};
  validationMock.byType = {};
  validationMock.validationIssuesByType = {};
  referencesMock.byType = {};
  duplicatesMock.byType = {};
  thresholdsMock.getActiveThreshold = () => 80;
});

describe('QualityByTypeMatrix — QUAL-02 heat gradient', () => {
  it('Test 1 — value=100 paints green-1 bg + green-9 text', () => {
    completenessMock.byType = { Patient: 100 };
    renderMatrix({ Patient: 50 });

    const valueText = screen.getByText('100%');
    const cell = valueText.closest('td');

    expect(cell).not.toBeNull();
    // Inline style on the <td> — Task 1 sets backgroundColor via style prop.
    expect(cell?.getAttribute('style') || '').toContain('var(--mantine-color-green-1)');
    expect(valueText.getAttribute('style') || '').toContain('var(--mantine-color-green-9)');
  });

  it('Test 2 — value=85 with threshold=80 paints yellow', () => {
    completenessMock.byType = { Patient: 85 };
    thresholdsMock.getActiveThreshold = () => 80;
    renderMatrix({ Patient: 50 });

    const valueText = screen.getByText('85%');
    const cell = valueText.closest('td');

    expect(cell?.getAttribute('style') || '').toContain('var(--mantine-color-yellow-1)');
    expect(valueText.getAttribute('style') || '').toContain('var(--mantine-color-yellow-9)');
  });

  it('Test 3 — value=50 with threshold=80 paints red', () => {
    completenessMock.byType = { Patient: 50 };
    thresholdsMock.getActiveThreshold = () => 80;
    renderMatrix({ Patient: 50 });

    const valueText = screen.getByText('50%');
    const cell = valueText.closest('td');

    expect(cell?.getAttribute('style') || '').toContain('var(--mantine-color-red-1)');
    expect(valueText.getAttribute('style') || '').toContain('var(--mantine-color-red-9)');
  });

  it('Test 4 — undefined value renders em-dash with no background', () => {
    // No byType seeding — completeness for Patient is undefined.
    renderMatrix({ Patient: 50 });

    // Sparse cells render em-dash. Multiple sparse cells expected (5 metric cols).
    const dashes = screen.getAllByText('—');
    expect(dashes.length).toBeGreaterThan(0);

    // Sanity: the em-dash cells carry no green/yellow/red gradient.
    for (const dash of dashes) {
      const cell = dash.closest('td');
      const styleAttr = cell?.getAttribute('style') || '';
      expect(styleAttr).not.toContain('var(--mantine-color-green-1)');
      expect(styleAttr).not.toContain('var(--mantine-color-yellow-1)');
      expect(styleAttr).not.toContain('var(--mantine-color-red-1)');
    }
  });

  it('Test 5 — threshold=null leaves below-100 cells uncolored', () => {
    completenessMock.byType = { Patient: 85 };
    thresholdsMock.getActiveThreshold = () => null;
    renderMatrix({ Patient: 50 });

    const valueText = screen.getByText('85%');
    const cell = valueText.closest('td');
    const styleAttr = cell?.getAttribute('style') || '';

    // Neither yellow nor red — gradient suppressed when threshold is disabled.
    expect(styleAttr).not.toContain('var(--mantine-color-yellow-1)');
    expect(styleAttr).not.toContain('var(--mantine-color-red-1)');
    expect(styleAttr).not.toContain('var(--mantine-color-green-1)');
  });

  it('Test 5b — threshold=null with value=100 still paints green', () => {
    completenessMock.byType = { Patient: 100 };
    thresholdsMock.getActiveThreshold = () => null;
    renderMatrix({ Patient: 50 });

    const valueText = screen.getByText('100%');
    const cell = valueText.closest('td');
    expect(cell?.getAttribute('style') || '').toContain('var(--mantine-color-green-1)');
  });
});
