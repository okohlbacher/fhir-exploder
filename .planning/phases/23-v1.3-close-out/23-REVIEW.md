---
phase: 23-v1.3-close-out
reviewed: 2026-04-17T00:00:00Z
depth: standard
files_reviewed: 10
files_reviewed_list:
  - src/components/quality/CohortBuilderForm.tsx
  - src/components/quality/CohortsPage.test.tsx
  - src/components/quality/EditCohortModal.test.tsx
  - src/components/quality/EditCohortModal.tsx
  - src/components/quality/FhirpathCriterionCard.test.tsx
  - src/hooks/useCohorts.test.tsx
  - src/hooks/useCohorts.ts
  - src/quality/cohorts.test.ts
  - src/quality/cohorts.ts
  - src/quality/fdpgCodec.ts
findings:
  critical: 0
  warning: 3
  info: 3
  total: 6
status: issues_found
---

# Phase 23: Code Review Report

**Reviewed:** 2026-04-17T00:00:00Z
**Depth:** standard
**Files Reviewed:** 10
**Status:** issues_found

## Summary

Ten files reviewed spanning the cohort builder's domain layer (`cohorts.ts`, `fdpgCodec.ts`), persistence hook (`useCohorts.ts`), two UI components (`CohortBuilderForm.tsx`, `EditCohortModal.tsx`), and the full test suite. The CLOSE-03 fix for the truncation false-positive is correct and well-tested. The CLOSE-05 fix (toast reads `updated.name`) is correct. The `persist` helper refactor in `useCohorts.ts` is sound. No critical issues found.

Three warnings were identified: a stale-closure bug in `addCohort` and `activateCohort` (they capture `stored` at callback creation time, which races against rapid successive mutations), a misleading truncation copy in `CohortBuilderForm.tsx` that still refers to "Phase 22" as "coming in Phase 22" even though that phase has shipped, and a logic gap where `handleEditSave` allows saving an empty criteria list in edit mode. Three info items cover minor dead/redundant code patterns.

## Warnings

### WR-01: Stale-closure race in `addCohort` and `activateCohort` callbacks

**File:** `src/hooks/useCohorts.ts:113-174`
**Issue:** `addCohort` and `activateCohort` are both wrapped in `useCallback` with `[stored, setStored]` as deps. The `persist` helper (line 186) only includes `[setStored]`, which is correct because it never reads `stored`. However, `addCohort` (line 151) and `activateCohort` (line 173) still close over `stored` directly. If two mutations are dispatched in the same React render cycle before `setStored` has flushed (e.g. `addCohort` followed immediately by `activateCohort` in an event handler), both will read the same stale snapshot of `stored`, and the second write will overwrite the first cohort addition. This is the same class of stale-closure bug guarded against in `useTrendsHistory`. The `persist` helper was introduced in Plan 22-02 for the new CRUD surface but `addCohort`/`activateCohort` were not migrated to use it.

The underlying cause: `addCohort` builds `next` from `stored.cohorts` (line 123) and `activateCohort` builds `next` from `stored.activeCohortId` (line 156). If the React state hasn't flushed between calls, both see pre-mutation `stored`.

**Fix:** Use the functional-update form of `setStored` so each mutation receives the latest state rather than the closed-over snapshot:

```typescript
// addCohort — replace the probe + setStored block:
setStored((prev) => {
  const next: CohortsStorage = {
    ...prev,
    cohorts: [...prev.cohorts, cohort],
  };
  window.localStorage.setItem(COHORTS_STORAGE_KEY, JSON.stringify(next));
  return next;
});

// activateCohort — replace the probe + setStored block:
setStored((prev) => {
  const next: CohortsStorage = { ...prev, activeCohortId: id };
  window.localStorage.setItem(COHORTS_STORAGE_KEY, JSON.stringify(next));
  return next;
});
```

Note: the `setItem` call must move inside the functional updater so it sees the same state version. The QuotaExceededError catch/rethrow logic transfers unchanged into the updater body. Also remove `stored` from both `useCallback` dependency arrays accordingly.

---

### WR-02: `handleEditSave` allows saving a cohort with zero criteria in edit mode

**File:** `src/components/quality/CohortBuilderForm.tsx:292-312`
**Issue:** The Save button in edit mode is guarded by `saveDisabled` (line 213), which checks `hasAtLeastOneCriterion`. This correctly disables the button when no criteria are present. However, `handleEditSave` does not re-check `hasAtLeastOneCriterion` before calling `props.onSave` (line 311). If the Save button is somehow triggered programmatically (e.g. via Enter key, form submit, or a test that fires `click` directly on a non-disabled button), `props.onSave` will be called with an empty `criteria` array. In Create mode, `handleConfirmSave` is protected by the modal flow which also has `saveDisabled` on its trigger, but in Edit mode the guard is only a UI attribute, not a code-level invariant.

An empty criteria list is semantically documented as "no-op cohort (returns all patients)" in `cohorts.ts` line 93, so it is not a crash, but it is almost certainly not the user's intent and represents an inconsistency between the UI's stated invariant and the code path.

**Fix:** Add a guard at the top of `handleEditSave`:

```typescript
const handleEditSave = (): void => {
  if (!isEdit || !initialCohort || !props.onSave) return;
  if (!hasAtLeastOneCriterion) return; // mirror saveDisabled guard
  // ... rest of the function
};
```

---

### WR-03: Stale UI copy in truncation Alert references "Phase 22" as future work

**File:** `src/components/quality/CohortBuilderForm.tsx:408-412`
**Issue:** The truncation Alert body reads: "Add more criteria to narrow the cohort, or use FHIRPath (coming in Phase 22) for larger cohorts." FHIRPath was delivered in Phase 22 and the FhirpathCriterionCard is rendered in the same form below this Alert (line 415). The parenthetical "(coming in Phase 22)" is now factually incorrect and will mislead users who encounter the truncation warning into thinking FHIRPath is unavailable.

**Fix:**
```tsx
{/* Old text */}
or use FHIRPath (coming in Phase 22) for larger cohorts.

{/* Replace with */}
or use the FHIRPath criterion below to filter more precisely.
```

---

## Info

### IN-01: Redundant `const c = raw` assignment in `fdpgCodec.ts`

**File:** `src/quality/fdpgCodec.ts:59`
**Issue:** `const c = raw;` is a no-op alias — `raw` is already the loop variable with the `CohortCriterion` type. `c` is used on lines 61, 66, 72, 85 but is identical to `raw`. This adds a line and a variable name without any semantic change.

**Fix:** Remove the alias and use `raw` directly in the switch branches, or rename the loop variable to `c` at the `for` declaration:

```typescript
for (const c of cohort.criteria) {
  if (c.type === 'fhirpath') { ... }
  // etc.
}
```

---

### IN-02: `mockActiveCohortId` in `EditCohortModal.test.tsx` is module-level mutable state

**File:** `src/components/quality/EditCohortModal.test.tsx:24`
**Issue:** `let mockActiveCohortId: string | null = null;` is declared at module scope and reassigned in individual tests (e.g. line 155). The `beforeEach` on line 71 resets it to `null`. This pattern works, but it is the only mutable module-level variable in this test file — `mockCohorts` uses `mockCohorts.length = 0` to clear in-place. The inconsistency is harmless but makes the reset logic slightly harder to audit at a glance.

**Fix:** Either replace with the `vi.hoisted` pattern used in `CohortsPage.test.tsx` for consistency, or document the reset explicitly with a comment. No functional change required.

---

### IN-03: `flush` helper is duplicated across four test files with different default delays

**File:** `src/components/quality/CohortsPage.test.tsx:145`, `src/components/quality/EditCohortModal.test.tsx:87`, `src/components/quality/FhirpathCriterionCard.test.tsx:63`, `src/hooks/useCohorts.test.tsx:72`
**Issue:** All four test files define a local `async function flush(ms = N)` wrapping `act` + `setTimeout`. Default `ms` values differ: 50, 100, 50, 50. This duplication means any change to the flush pattern (e.g. to handle React 19's scheduler changes) must be applied in four places.

**Fix:** Extract to a shared test utility, e.g. `src/test-utils/flush.ts`:

```typescript
import { act } from '@testing-library/react';
export async function flush(ms = 50): Promise<void> {
  await act(async () => {
    await new Promise((r) => setTimeout(r, ms));
  });
}
```

Then import in each test file. No logic changes required.

---

_Reviewed: 2026-04-17T00:00:00Z_
_Reviewer: Claude (gsd-code-reviewer)_
_Depth: standard_
