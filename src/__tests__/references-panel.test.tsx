/**
 * ReferencesPanel rollup tests — Phase 18, Plan 02, Task 1 (Wave 0 stub).
 *
 * Placeholders for the rollup-push tests enumerated in
 * .planning/phases/18-quality-alerting-thresholds/18-VALIDATION.md lines 44-58.
 * Task 6 fills in the real assertions. The rollup uses the `sampleSize` prop
 * as the denominator (NOT `run.progress.total`, which is the batch count).
 */
import { describe, it, beforeEach } from 'vitest';

beforeEach(() => { window.localStorage.clear(); });

describe('ReferencesPanel rollup (overallReferences)', () => {
  it.todo('pushes overallReferences = round((1 - unique_affected/sampleSize) * 100)');
  it.todo('uses unique resourceId count (NOT brokenCount, NOT progress.total)');
  it.todo('pushes undefined when sampleSize === 0');
});
