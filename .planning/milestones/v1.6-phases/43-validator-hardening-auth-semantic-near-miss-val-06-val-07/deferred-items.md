# Deferred Items — Phase 43 Plan 01 Execution

> Items discovered during plan execution that are OUT OF SCOPE for this plan
> per the GSD scope-boundary rule (only auto-fix issues directly caused by the
> current task's changes).

## Pre-existing test failure (verified on base commit before any 43-01 changes)

- **File:** `src/__tests__/visual/deuteranopia.test.tsx`
- **Test:** Phase 40 / DEUT-01 — `pair #13 ('kardiologie ↔ mikrobiologie')` discriminable under deuteranopia
- **Status on base commit `078d220`:** ALSO FAILING (verified via `git stash` + targeted run)
- **Root cause:** Color-vision ΔE2000 threshold for the kardiologie / mikrobiologie palette pair under deuteranopia. Belongs to Phase 40 deferred work.
- **Action:** Reported here for Phase 40 owner to triage; NOT addressed in 43-01.
