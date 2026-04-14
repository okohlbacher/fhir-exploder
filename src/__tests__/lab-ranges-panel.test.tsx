/**
 * LabRangesPanel rollup tests — Phase 18, Plan 02, Task 1 (Wave 0 stub).
 *
 * Stub placeholders for the rollup-push tests enumerated in
 * .planning/phases/18-quality-alerting-thresholds/18-VALIDATION.md lines 44-58.
 * Task 6 fills in the real assertions. Keeping this as `it.todo` ensures the
 * Wave 2 executor does not proceed until the real assertions exist.
 */
import { describe, it, beforeEach } from 'vitest';

beforeEach(() => { window.localStorage.clear(); });

describe('LabRangesPanel rollup (overallLabRanges)', () => {
  it.todo('pushes overallLabRanges = round((1 - outOfRange/checked) * 100) on complete');
  it.todo('pushes undefined when summary.noRange === summary.checked (no ranges configured)');
  it.todo('pushes undefined when summary.checked === 0');
  it.todo('does NOT push during running status (pitfall 2)');
});
