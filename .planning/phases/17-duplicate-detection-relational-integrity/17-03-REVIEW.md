---
phase: 17-duplicate-detection-relational-integrity
reviewed: 2026-04-14T00:00:00Z
depth: standard
files_reviewed: 2
files_reviewed_list:
  - src/components/quality/DuplicatesPanel.tsx
  - src/__tests__/duplicates-panel.test.tsx
findings:
  critical: 0
  warning: 0
  info: 3
  total: 3
status: issues_found
---

# Phase 17, Plan 03: Gap-Closure Code Review Report

**Reviewed:** 2026-04-14T00:00:00Z
**Depth:** standard
**Files Reviewed:** 2
**Status:** issues_found (info only)

## Summary

This gap closure addresses parent-review finding **CR-01** (wrong field name on cluster objects producing `NaN` / runtime throw in `DuplicatesPanel`). The two-line rename (`c.members` → `c.patients` on line 73; `c.members` → `c.resources` on line 82) is correct: the replacement field names match the actual shapes of `PatientDuplicateCluster.patients` and `ContentHashCluster.resources` as defined in `src/quality/patientDuplicateDetector.ts` and `src/quality/contentHasher.ts`. No new bugs are introduced by the source change.

The new regression test file `src/__tests__/duplicates-panel.test.tsx` is well-structured: it mocks `useDuplicateReport` to inject realistic cluster shapes, uses the same Mantine + jsdom polyfill pattern established by the existing `coding-coverage-panel.test.tsx`, and pins both the positive integer count (`2 patients involved`, `3 resources involved`) and the negative `NaN` case. The non-throwing `expect(() => render(...)).not.toThrow()` at the top of the suite is the precise guard for the original crash path.

The CR-01 fix is complete and verified. Three info-level items below are documentation or ergonomic improvements to the new test file; none block acceptance.

**Not re-flagged** (captured in `17-REVIEW.md` against the pre-fix file, out of scope for this gap-closure review): WR-02 (progress heuristic in the same file at lines 99–110) and the broader observations about `useDuplicateReport` state shape. Those remain open against the parent phase.

## Info

### IN-01: Misleading "Import AFTER vi.mock" comment

**File:** `src/__tests__/duplicates-panel.test.tsx:115`
**Issue:** The comment above the static import says:

```ts
// Import AFTER vi.mock so the panel picks up the mocked hook.
import { DuplicatesPanel } from '../components/quality/DuplicatesPanel';
```

Vitest hoists `vi.mock` calls to the top of the file regardless of their textual position, so physical import order does not affect whether the mock is applied — the mock is always installed before any `import` runs. The comment could confuse a future maintainer who moves the import back up and expects the test to break. It will not.

**Fix:** Either delete the comment, or restate it as an explanation of the `currentRun` let-binding pattern, which *is* load-bearing:

```ts
// vi.mock is hoisted above all imports by Vitest. The factory closes over
// `currentRun` (a let binding), so tests can swap the return value between
// cases by reassigning `currentRun` before each render.
import { DuplicatesPanel } from '../components/quality/DuplicatesPanel';
```

### IN-02: `mockRun` and `emptyRun` lack explicit typing against the real hook return type

**File:** `src/__tests__/duplicates-panel.test.tsx:52-108`
**Issue:** Both fixtures are ad-hoc object literals with no type annotation. If `useDuplicateReport`'s return shape grows a new required field (e.g., a `phase` field as suggested by parent-review WR-02, or a `reset()` method), the fixtures will silently continue compiling, the mock will return an incomplete shape, and the panel will either render stale state or throw at runtime on the missing property. The regression suite will then pass even though the panel is broken in production.

**Fix:** Pin the mock to the real return type so TypeScript flags drift:

```ts
import type { useDuplicateReport } from '../hooks/useDuplicateReport';
type DuplicateRun = ReturnType<typeof useDuplicateReport>;

const mockRun: DuplicateRun = {
  status: 'complete',
  // ...
};
```

If the hook's return type is non-trivially public (currently it is inferred from the implementation), consider extracting a named `DuplicateRunState` export to make this import stable.

### IN-03: Header comment slightly mis-describes the original bug as a `NaN` render

**File:** `src/__tests__/duplicates-panel.test.tsx:1-17`
**Issue:** The file-level JSDoc says the previous implementation "dereferenced a non-existent `.members` field ... crashing the Duplicates tab" (correct), but then the assertion strategy hinges on `NaN` not matching `/\d+/`. In reality, `undefined.length` throws a `TypeError` before any `NaN` is ever produced — so the primary regression guard is the `expect(() => render(...)).not.toThrow()` on line 133, not the `NaN` assertions on lines 156–157. The `NaN` assertions are useful defense-in-depth (they would catch a half-fix like `c.members?.length ?? NaN`), but the comment suggests they are the main guard.

**Fix:** Clarify the guard hierarchy in the header comment:

```ts
/**
 * Primary guard: .not.toThrow() — the original bug was `c.members.length`
 * where `c.members` is undefined, throwing TypeError at render.
 *
 * Secondary guard: /NaN (patients|resources) involved/ must not appear —
 * catches a half-fix that swaps the throw for nullish-coalesced NaN.
 */
```

---

_Reviewed: 2026-04-14T00:00:00Z_
_Reviewer: Claude (gsd-code-reviewer)_
_Depth: standard_
