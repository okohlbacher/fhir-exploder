/**
 * QUAL-03 — CodingCoveragePanel UI test.
 *
 * Wave 2 Plan 04 creates `src/components/quality/CodingCoveragePanel.tsx`
 * rendering a 3-bucket breakdown (systemCode / textOnly / empty) of the
 * PerTypeCoverageReport shape.
 */
import { describe, it, expect } from 'vitest';
// Plan 05-02 landed a stub at this path; Plan 05-04 will overwrite it
// with the real component. The stub is already a function, so the
// export assertion below passes. The it.todo cases remain for Plan 05-04.
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
