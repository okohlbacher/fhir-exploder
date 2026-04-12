/**
 * QUAL-02 — useCompletenessReport concurrency test.
 *
 * Wave 2 Plan 03 creates `src/quality/useCompletenessReport.ts` exporting
 *   useCompletenessReport(client, resourceTypes, sampleSize):
 *     Record<string, PerTypeReport<PerTypeCompletenessReport>>
 *
 * The hook MUST:
 *   - use a 4-concurrent worker pool (mirror useResourceCounts)
 *   - progressively populate the result map as each type resolves
 *   - debounce sample-size changes to avoid recompute storms
 */
import { describe, it, expect } from 'vitest';
// @ts-expect-error — Wave 2 Plan 03 creates this module.
import { useCompletenessReport } from '../quality/useCompletenessReport';

describe('useCompletenessReport (QUAL-02)', () => {
  it.todo('starts every type as "loading"');
  it.todo('settles each type independently (errors do not poison siblings)');
  it.todo('respects a 4-concurrent limit on sampling requests');
  it.todo('debounces recomputation when sampleSize changes rapidly');
  it.todo('clears pending state on unmount');

  it('is exported from src/quality/useCompletenessReport', () => {
    expect(typeof useCompletenessReport).toBe('function');
  });
});
