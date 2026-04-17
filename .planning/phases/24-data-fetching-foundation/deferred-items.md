# Phase 24 — Deferred Items

Pre-existing issues found during Phase 24 execution that are OUT OF SCOPE for this phase per SCOPE BOUNDARY rule.

## Plan 24-02

### Pre-existing test failure: `src/__tests__/resource-type-landing-counts.test.tsx` "displays error badges when counts fail"

- **Found during:** Plan 24-02 Task 1 verification
- **Status:** Pre-existing on `main` (7cb1532); NOT caused by the `useResourceCounts` refactor
- **Verification:** `git stash && npm test -- src/__tests__/resource-type-landing-counts.test.tsx --run` on unmodified `main` also fails identically (3 passed, 1 failed)
- **Scope:** Test assertion relies on `ResourceTypeLanding` rendering an "Error" badge when `useResourceCounts` returns `'error'` for all types — the component appears to render Mantine Select filters instead of the expected badge text
- **Action:** Do NOT fix here. The 3 passing tests exercise the consumer contract that matters for Plan 24-02 (hook called with correct args, count/loading rendering). Log as a candidate for a later polish pass.
