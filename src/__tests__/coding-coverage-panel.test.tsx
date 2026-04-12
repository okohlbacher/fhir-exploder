/**
 * QUAL-03 — CodingCoveragePanel UI test.
 *
 * Wave 2 Plan 04 creates `src/components/quality/CodingCoveragePanel.tsx`
 * rendering a 3-bucket breakdown (systemCode / textOnly / empty) of the
 * PerTypeCoverageReport shape.
 */
import { describe, it, expect } from 'vitest';
// @ts-expect-error — Wave 2 Plan 04 creates this component.
import { CodingCoveragePanel } from '../components/quality/CodingCoveragePanel';

describe('CodingCoveragePanel (QUAL-03)', () => {
  it.todo('renders three buckets with absolute counts and percentages');
  it.todo('shows per-path drill-down when a row is expanded');
  it.todo('shows a "no coded fields" placeholder when totalCodedFields is 0');
  it.todo('respects sampleSize disclaimer text ("based on N resources")');

  it('is exported from src/components/quality/CodingCoveragePanel', () => {
    expect(typeof CodingCoveragePanel).toBe('function');
  });
});
