---
phase: 23
plan: 2
plan_name: "Cosmetic integration notes I1 + I2"
subsystem: quality-codec-modal
tags: [cleanup, type-alias, toast-fix, tdd, close-out]
dependency_graph:
  requires: []
  provides: [CLOSE-04, CLOSE-05]
  affects: [src/quality/fdpgCodec.ts, src/components/quality/EditCohortModal.tsx]
tech_stack:
  added: []
  patterns: [TDD-red-green]
key_files:
  modified:
    - src/quality/fdpgCodec.ts
    - src/components/quality/EditCohortModal.tsx
    - src/components/quality/EditCohortModal.test.tsx
decisions:
  - "Dropped CodecCriterion bridge type entirely — CohortCriterion already includes fhirpath after Phase 22 merge; no partial inline needed"
  - "Toast fix is purely on the modal side (capture updateCohort return value); CohortBuilderForm.handleEditSave still sends initialCohort.name but modal now reads from the persisted record"
  - "CLOSE-05 regression test uses mockUpdateCohort returning a different name than the prop to prove updated.name is used"
metrics:
  duration: "~3 minutes"
  completed: "2026-04-17"
  tasks_completed: 3
  tasks_total: 3
  files_modified: 3
requirements:
  - CLOSE-04
  - CLOSE-05
---

# Phase 23 Plan 2: Cosmetic Integration Notes I1 + I2 Summary

**One-liner:** Removed inert `FhirpathLike`/`CodecCriterion` bridge types from fdpgCodec.ts and fixed EditCohortModal toast to read the persisted cohort name from `updateCohort`'s return value.

## What Was Done

Two Phase 22 cosmetic integration notes closed in a single small plan:

### CLOSE-04 (I1): FhirpathLike alias removal

**Exact lines removed from fdpgCodec.ts:**

```diff
-/**
- * Forward-compatibility helper: Plan 22-01 (parallel Wave 1) extends the
- * canonical `CohortCriterion` union in `src/quality/cohorts.ts` with
- * `FhirpathCriterion = { type: 'fhirpath'; expression: string }`. This
- * codec must reject that variant on export, so we widen the iterator
- * element to include the fhirpath shape locally. When both branches merge,
- * the local type becomes a structural subtype of the canonical union.
- */
-type FhirpathLike = { type: 'fhirpath'; expression: string; translatedQuery?: string };
-type CodecCriterion = CohortCriterion | FhirpathLike;
+// `CohortCriterion` already includes the `fhirpath` variant (see ./cohorts);
+// this codec rejects it on export (T-22-08 version confusion) — see handling below.
```

```diff
-  for (const raw of cohort.criteria as CodecCriterion[]) {
+  for (const raw of cohort.criteria) {
```

The `CohortCriterion` union (from `./cohorts`) already includes `FhirpathCriterion` after the Phase 22 Wave-1 merge. Both `FhirpathLike` and `CodecCriterion` were bridge types for parallel-wave development and became inert post-merge. The cast `as CodecCriterion[]` was also dropped since `cohort.criteria` is already typed `CohortCriterion[]`.

### CLOSE-05 (I2): EditCohortModal stale-toast fix

**Before/after of `handleSave` message line:**

```diff
-    updateCohort(cohort.id, input);
+    const updated = updateCohort(cohort.id, input);
     notifications.show({
       color: 'blue',
       title: 'Cohort updated',
-      message: `"${cohort.name}" updated. Dashboard scope refreshed.`,
+      message: `"${updated.name}" updated. Dashboard scope refreshed.`,
       autoClose: 2500,
     });
```

The `useCohorts.updateCohort` contract returns the updated `CohortDefinition` — the modal now captures this return value and reads `.name` from it at toast-dispatch time, not from the pre-save closure.

**Regression test added:**

`'Cohort updated toast reflects the renamed cohort name (CLOSE-05)'` in `src/components/quality/EditCohortModal.test.tsx` (new `describe('Cohort updated toast (CLOSE-05)')` block). The test:
- Seeds `mockUpdateCohort` to return `{ name: 'New Name', ... }` when called with a cohort initially named `'Old Name'`
- Clicks Save changes
- Asserts the toast shows `"New Name" updated. Dashboard scope refreshed.` (not `"Old Name"`)

## Commits

| Task | Commit | Description |
|------|--------|-------------|
| Task 1: CLOSE-04 | 8dbd76c | fix(23-02): close CLOSE-04 — remove inert FhirpathLike alias (I1) |
| Task 2: CLOSE-05 | b3a8860 | fix(23-02): close CLOSE-05 — EditCohortModal toast reads updated.name (I2) |
| Task 3: Verification | (no new commit — verification only) | Full suite: 22 failures, all pre-existing |

## Verification Results

- `grep FhirpathLike src/` → 0 results
- `grep CodecCriterion src/` → 0 results
- `grep "for (const raw of cohort.criteria)" src/quality/fdpgCodec.ts` → line 59
- `grep "const updated = updateCohort" src/components/quality/EditCohortModal.tsx` → line 57
- `grep 'updated.name' src/components/quality/EditCohortModal.tsx` → line 61
- `npx vitest run src/quality/fdpgCodec.test.ts` → 29/29 passed
- `npx vitest run src/components/quality/EditCohortModal.test.tsx` → 11/11 passed (10 existing + 1 new)
- `npm test` → 22 failures, 708 passed — exact same pre-existing failure set; zero new failures in touched files
- `npx tsc -b --noEmit` → 2 pre-existing errors in untouched files (`CohortsPage.test.tsx`, `FhirpathCriterionCard.test.tsx`); no new errors from this plan

## Deviations from Plan

### Auto-adapted approaches

**1. [Rule 1 - Adaptation] CLOSE-05 test uses mockReturnValue pattern instead of fireEvent.change on name input**

- **Found during:** Task 2 RED phase
- **Issue:** In Edit mode, `CohortBuilderForm.handleEditSave` always passes `initialCohort.name` to `onSave` — there is no editable name input in the form's Edit mode (the Name input only appears in the Create-mode Save modal). `fireEvent.change` on a name field would not work.
- **Fix:** The test instead configures `mockUpdateCohort` to return a different name object (`{ name: 'New Name' }`) than the prop's cohort name (`'Old Name'`). This directly tests the modal's use of `updated.name` vs `cohort.name` at the point of greatest behavioral difference.
- **Impact:** Test still correctly proves the bug fix — the toast reads from `updateCohort`'s return value at dispatch time, not from the closure.
- **Files modified:** `src/components/quality/EditCohortModal.test.tsx`

**2. [Rule 1 - Adaptation] Used `getAllByText` instead of `getByText` for toast title assertion**

- **Found during:** Task 2 GREEN run
- **Issue:** Mantine 8 `Notifications` renders toast nodes in a way that caused "multiple elements found" for `getByText('Cohort updated')`.
- **Fix:** Changed to `getAllByText('Cohort updated')` + `toBeGreaterThanOrEqual(1)` assertion, consistent with the library's portal rendering behavior.
- **Files modified:** `src/components/quality/EditCohortModal.test.tsx`

## Known Stubs

None. Both changes are complete with no placeholders.

## Threat Flags

None. No new trust boundaries introduced. I1 is a type-level refactor with zero runtime behavior change; I2 is a string-binding fix reading from an already-trusted return value.

## Self-Check: PASSED

- [x] `src/quality/fdpgCodec.ts` exists and contains no `FhirpathLike` or `CodecCriterion`
- [x] `src/components/quality/EditCohortModal.tsx` contains `const updated = updateCohort` and `updated.name`
- [x] `src/components/quality/EditCohortModal.test.tsx` contains `renamed cohort name (CLOSE-05)`
- [x] Commit 8dbd76c exists in git log
- [x] Commit b3a8860 exists in git log
