/**
 * Wave 0 stub test file for Plan 21-02 / 21-04 (`src/hooks/useCohorts.ts`).
 *
 * Every `it()` name below MUST match a VALIDATION.md `-t "…"` filter so the
 * downstream plans' automation commands resolve to a concrete spec:
 *   - `-t "persists"`             (CHRT-02)
 *   - `-t "hydration"`            (CHRT-02)
 *   - `-t "uuid"`                 (CHRT-02)
 *   - `-t "legacy migration"`     (CHRT-04)
 *   - `-t "migration idempotent"` (CHRT-04)
 *
 * All tests are `it.skip` until Plan 21-02 / 21-04 un-skip them. The hook
 * is a Mantine `useLocalStorage` + hydration-gate binding — see
 * 21-RESEARCH.md Pattern 1 + Pattern 2, mirror src/hooks/useThresholds.ts.
 *
 * Threat T-21-03: all fixture IDs are synthetic (`p-001`, `test-uuid`).
 */
import { describe, it, expect, beforeEach } from 'vitest';
import {
  COHORTS_STORAGE_KEY,
  LEGACY_COHORT_KEY,
  RESOURCE_TYPES_STORAGE_KEY,
} from '../quality/cohorts';

beforeEach(() => {
  // Reset localStorage between tests so no stub accidentally leaks state.
  // (Stubs don't mutate state yet; present here for downstream plans.)
  window.localStorage.clear();
});

describe('useCohorts', () => {
  it.skip('persists storage to quality.cohorts.v1 (pending Plan 21-02)', () => {
    // TODO(Plan 21-02): renderHook(() => useCohorts()), invoke addCohort(...),
    // then assert JSON.parse(localStorage.getItem(COHORTS_STORAGE_KEY))
    // contains the new cohort.
    expect(COHORTS_STORAGE_KEY).toBe('quality.cohorts.v1');
  });

  it.skip('hydration gate returns defaults on first render (pending Plan 21-02)', () => {
    // TODO(Plan 21-02): seed localStorage, renderHook, assert the first-render
    // return is DEFAULT_COHORTS_STORAGE and the effect-flipped second render
    // returns the stored value. Guards REVIEW-FIX WR-04 class of flicker.
    expect(true).toBe(true);
  });

  it.skip('new cohort id is uuid shaped (pending Plan 21-02)', () => {
    // TODO(Plan 21-02): invoke addCohort('n', []) and assert the returned id
    // matches /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/
    // (i.e. crypto.randomUUID() output).
    expect(true).toBe(true);
  });

  it.skip('legacy migration copies quality.cohort.v1 to quality.resourceTypes.v1 (pending Plan 21-04)', () => {
    // TODO(Plan 21-04): seed localStorage with LEGACY_COHORT_KEY set to
    // JSON.stringify(['Patient','Observation']); renderHook(() => useCohorts());
    // after the mount effect, assert localStorage.getItem(RESOURCE_TYPES_STORAGE_KEY)
    // equals the seeded payload AND localStorage.getItem(LEGACY_COHORT_KEY) === null.
    expect(LEGACY_COHORT_KEY).toBe('quality.cohort.v1');
    expect(RESOURCE_TYPES_STORAGE_KEY).toBe('quality.resourceTypes.v1');
  });

  it.skip('migration idempotent — does not clobber existing (pending Plan 21-04)', () => {
    // TODO(Plan 21-04): seed BOTH keys with different payloads; renderHook;
    // assert RESOURCE_TYPES_STORAGE_KEY still holds its ORIGINAL (new) value,
    // not the legacy payload. Guards against overwriting user's post-rename state.
    expect(true).toBe(true);
  });
});
