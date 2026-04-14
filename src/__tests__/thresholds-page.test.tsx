/**
 * ThresholdsPage — Wave 0 stub.
 *
 * Replaced in Task 5 with real assertions. Covers the 11 test IDs from
 * 18-VALIDATION.md for the /quality/thresholds page added in Plan 18-03.
 */
import { describe, it, beforeEach } from 'vitest';

beforeEach(() => {
  window.localStorage.clear();
});

describe('ThresholdsPage', () => {
  it.todo('renders 7 rows (one per MetricKey)');
  it.todo('shows default value for each row when stored is empty');
  it.todo('NumberInput blur with a valid number commits to localStorage under STORAGE_KEY');
  it.todo('Clear ActionIcon sets stored[key] to null (distinct from absent)');
  it.todo('Active badge shows "default" when key absent');
  it.todo('Active badge shows "custom" when stored[key] is a number');
  it.todo('Active badge shows "disabled" when stored[key] is null');
  it.todo('Reset button opens modal');
  it.todo('Reset modal "Keep current thresholds" dismisses without changes');
  it.todo('Reset modal "Reset to defaults" clears entire stored object');
  it.todo('Configuration persists across remount (localStorage round-trip)');
});
