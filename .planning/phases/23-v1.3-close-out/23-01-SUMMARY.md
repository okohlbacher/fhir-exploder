---
phase: 23
plan: 1
plan_name: "Code review warnings W1 + W2 + W3"
subsystem: quality/cohorts
tags: [bug-fix, regression-guard, tdd, close-out, cohorts, localStorage]
status: complete
completed: 2026-04-17

dependency_graph:
  requires: []
  provides:
    - CLOSE-01: W1 regression guard (CohortsPage handleExport closure capture)
    - CLOSE-02: W2 activateCohort quota probe (red toast on QuotaExceededError)
    - CLOSE-03: W3 parsePatientRefs truncation false-positive fix + 5-case matrix
  affects:
    - src/quality/cohorts.ts (breaking API change: ParsedPatientRefs return type)
    - src/components/quality/CohortBuilderForm.tsx (caller updated)
    - src/hooks/useCohorts.ts (activateCohort rewrite)

tech_stack:
  added: []
  patterns:
    - persist-helper pattern extended to activateCohort (mirrors addCohort/updateCohort/deleteCohort)
    - ParsedPatientRefs discriminated return shape (Option A: post-dedupe originalCount)

key_files:
  created: []
  modified:
    - src/components/quality/CohortsPage.test.tsx
    - src/hooks/useCohorts.ts
    - src/hooks/useCohorts.test.tsx
    - src/quality/cohorts.ts
    - src/quality/cohorts.test.ts
    - src/components/quality/CohortBuilderForm.tsx
    - src/components/quality/FhirpathCriterionCard.test.tsx

decisions:
  - "CLOSE-01 resolved as already-closed: Phase 22 SavedCohortRow extraction already isolates closure; regression test added as guard"
  - "CLOSE-03 Option A selected: originalCount = POST-dedupe count (matches 22-REVIEW.md §WR-03 verbatim)"
  - "PATIENT_REF_CAP constant removed from CohortBuilderForm.tsx (now unused after truncation moved to parsed.truncated)"
  - "activateCohort uses inline try/catch (not persist helper) to match verbatim code from 22-REVIEW.md §WR-02"

metrics:
  duration_seconds: 383
  tasks_completed: 5
  files_modified: 7
  commits: 3
  new_tests: 8
---

# Phase 23 Plan 1: Code review warnings W1 + W2 + W3 Summary

**One-liner:** Three cohort-subsystem correctness bugs (handleExport closure, activateCohort quota probe, parsePatientRefs truncation false-positive) fixed with TDD; 8 new tests, tsc clean.

## Objective

Close the three Phase 22 code review warnings gating the v1.3 milestone sign-off: W1 (CLOSE-01 handleExport closure capture), W2 (CLOSE-02 activateCohort quota probe), W3 (CLOSE-03 parsePatientRefs truncation false-positive). Implements CLOSE-01, CLOSE-02, CLOSE-03.

## Tasks

| # | Name | Status | Commit |
|---|------|--------|--------|
| 1 | Write failing regression test for W1 (CLOSE-01) | Complete (passed immediately — D-01) | 5a7303b |
| 2 | Close CLOSE-01 — no-op if Task 1 passed | No-op (Task 1 passed) | — |
| 3 | Close CLOSE-02 (W2 activateCohort quota probe) | Complete | 518f3e9 |
| 4 | Close CLOSE-03 (W3 parsePatientRefs truncation matrix) | Complete | f8b9c26 |
| 5 | Full-suite green check | Complete | — (verification only) |

## CLOSE-01 Resolution (W1)

**Outcome: already-resolved by Phase 22 `SavedCohortRow` refactor.**

Phase 22 extracted `SavedCohortRow` as a named component (CohortsPage.tsx lines 116-219) with an explicit `cohort: CohortDefinition` prop. The Export menu item is wired as `onClick={() => onExport(cohort)}` (line 200-204), and the parent `handleExport` accepts `cohort: CohortDefinition` as an argument (line 304). No closure over the loop variable remains.

Task 1's regression test `'serializes the correct cohort when Export is clicked on a non-current row'` **passed immediately on first run** (D-01 verify-first outcome). The test seeds `hoisted.state.cohorts` with two cohorts, clicks Export on the second row (Cohort Two), and asserts:
- `mockDownloadString` called with filename `'cohort-two-fdpg.json'`
- Content encodes the condition-code criterion from c2, NOT the date-range from c1

Task 2 was a no-op (no code change to CohortsPage.tsx).

## CLOSE-02 Resolution (W2)

**File modified:** `src/hooks/useCohorts.ts` (lines 154-172)

**Issue:** `activateCohort` used only `setStored({ ...stored, activeCohortId: id })`, which delegates to Mantine's `useLocalStorage`. Mantine's hook catches `QuotaExceededError` internally and silently logs to console — the user would see the "Active" badge update but the activation would be invisible on reload (ghost-state bug).

**Fix:** Rewrote `activateCohort` to probe `window.localStorage.setItem` directly before calling `setStored`, mirroring the `persist` helper pattern used by all sibling mutators (`addCohort`, `updateCohort`, `deleteCohort`, `duplicateCohort`). Verbatim from 22-REVIEW.md §WR-02:

```ts
const activateCohort = useCallback(
  (id: string | null) => {
    const next: CohortsStorage = { ...stored, activeCohortId: id };
    try {
      window.localStorage.setItem(COHORTS_STORAGE_KEY, JSON.stringify(next));
    } catch (err) {
      if (err instanceof DOMException && err.name === 'QuotaExceededError') {
        notifications.show({
          color: 'red',
          title: 'Activation failed',
          message: 'Browser storage is full. Delete unused cohorts to make room.',
          autoClose: 6000,
        });
      }
      throw err;
    }
    setStored(next);
  },
  [stored, setStored],
);
```

**Test:** `'activateCohort surfaces red toast on QuotaExceededError'` — RED then GREEN:
- RED: current `activateCohort` does not throw; `caughtError` is `undefined`
- GREEN after fix: DOMException re-thrown, red toast shown with exact WR-02 message
- Full `useCohorts.test.tsx` suite: 20/20 passing

## CLOSE-03 Resolution (W3)

**Files modified:** `src/quality/cohorts.ts`, `src/quality/cohorts.test.ts`, `src/components/quality/CohortBuilderForm.tsx`

**Issue:** `CohortBuilderForm.tsx` computed `truncated = parsedRefs.length === PATIENT_REF_CAP`. Since `parsePatientRefs` returns `.slice(0, 10_000)`, the length is capped at exactly 10,000 regardless of whether more items exist. A user providing exactly 10,000 unique IDs would see the "Cohort truncated" warning even though nothing was discarded.

**Fix:** New exported interface `ParsedPatientRefs`:

```ts
export interface ParsedPatientRefs {
  refs: string[];
  truncated: boolean;    // true iff deduped.length > 10_000
  originalCount: number; // POST-dedupe count (Option A per 22-REVIEW.md §WR-03)
}
```

`originalCount` semantics: **POST-dedupe count** (Option A) — matches the authoritative fix shape in 22-REVIEW.md §WR-03 verbatim.

**Threat-model comment updated** (Task 4 Step E):
- Before: `T-21-01 (Tampering/XSS): parsePatientRefs produces plain string[]`
- After: `T-21-01 (Tampering/XSS): parsePatientRefs produces plain string[] inside 'refs'`

Final `parsePatientRefs` implementation (cohorts.ts lines ~220-232):
```ts
return {
  refs: deduped.slice(0, 10_000),
  truncated: deduped.length > 10_000,
  originalCount: deduped.length,
};
```

**5-case truncation matrix** added to `cohorts.test.ts`:

| Case | Input | truncated | originalCount |
|------|-------|-----------|---------------|
| 1 | empty | false | 0 |
| 2 | 100 unique, no dups | false | 100 |
| 3 | 150 tokens, 50 dups → 100 unique | false | 100 |
| 4 | 15k tokens, 5k dups → exactly 10k unique | false (boundary fix!) | 10,000 |
| 5 | 15k tokens, 4k dups → 11k unique | true | 11,000 |

Case 4 is the critical boundary: the old `parsedRefs.length === PATIENT_REF_CAP` check would have returned `true` here (false positive). The new `deduped.length > 10_000` check correctly returns `false`.

**Caller updated** (CohortBuilderForm.tsx):
- `parsedRefs = useMemo(...)` → `parsed = useMemo(...); parsedRefs = parsed.refs; truncated = parsed.truncated`
- `PATIENT_REF_CAP` constant removed (now unused — truncation detection moved to domain layer)
- Existing cardinality checks (`parsedRefs.length >= 1`, `> 0`, `=== 0`, `=== 1`) unchanged

**Existing 8 `parsePatientRefs` tests** updated to access `.refs` (e.g. `parsePatientRefs('').refs`). All 8 still pass.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Removed unused `within` import in CohortsPage.test.tsx**
- **Found during:** Task 4 (tsc check)
- **Issue:** `within` from `@testing-library/react` was imported but never used — pre-existing TS6133 error
- **Fix:** Removed from import statement
- **Files modified:** `src/components/quality/CohortsPage.test.tsx`
- **Commit:** f8b9c26

**2. [Rule 1 - Bug] Fixed FhirpathCriterionCard.test.tsx renderCard return type**
- **Found during:** Task 4 (tsc check)
- **Issue:** `onValidated` type narrowed to union `((tq: string) => void) | Mock<Procedure>` — TS2339 blocked `.mock.calls` access at line 210 — pre-existing error
- **Fix:** Wrapped callbacks in `vi.fn(...)` in `renderCard` so return type is always `Mock<Procedure>`
- **Files modified:** `src/components/quality/FhirpathCriterionCard.test.tsx`
- **Commit:** f8b9c26

**3. [Rule 1 - Cleanup] Removed PATIENT_REF_CAP constant from CohortBuilderForm.tsx**
- **Found during:** Task 4 (tsc check)
- **Issue:** After moving truncation detection to `parsed.truncated`, `PATIENT_REF_CAP` was declared but its value was never read (TS6133). The constant was the ONLY site computing `parsedRefs.length === PATIENT_REF_CAP`.
- **Fix:** Removed the constant; the plan's note "The `CohortBuilderForm`'s `PATIENT_REF_CAP` stays as-is" was written assuming it would still be used — TypeScript strict mode requires this correction.
- **Files modified:** `src/components/quality/CohortBuilderForm.tsx`
- **Commit:** f8b9c26

## Known Stubs

None. All three fixes are wired end-to-end with no placeholder values.

## Threat Flags

None. The signature change from `string[]` to `ParsedPatientRefs` preserves all security properties:
- T-21-01: `refs` still contains plain strings, no HTML
- T-21-02: `.slice(0, 10_000)` cap remains in place (test case 5 proves it)
- T-23-01: threat-model comment updated to remain accurate

## Verification

- `npx vitest run src/components/quality/CohortsPage.test.tsx -t "serializes the correct cohort"` → PASS (Task 1, regression guard)
- `npx vitest run src/hooks/useCohorts.test.tsx` → 20/20 PASS (Task 3)
- `npx vitest run src/quality/cohorts.test.ts` → 25/25 PASS (Task 4)
- `npx vitest run src/components/quality/CohortBuilderForm.test.tsx` → 10/10 PASS (Task 4)
- `npm test` → 22 failed | 714 passed | 22 todo — identical failure count to pre-plan baseline (pre-existing failures in patient/terminology tests unrelated to cohort subsystem)
- `npx tsc -b --noEmit` → exits 0

## Self-Check: PASSED

All key files exist:
- FOUND: src/components/quality/CohortsPage.test.tsx
- FOUND: src/hooks/useCohorts.ts
- FOUND: src/quality/cohorts.ts
- FOUND: src/components/quality/CohortBuilderForm.tsx

All commits exist:
- FOUND: 5a7303b — test(23-01): add W1/CLOSE-01 regression guard
- FOUND: 518f3e9 — fix(23-01): close W2/CLOSE-02 activateCohort quota probe
- FOUND: f8b9c26 — fix(23-01): close W3/CLOSE-03 parsePatientRefs truncation false-positive
