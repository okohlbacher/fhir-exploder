---
phase: 20-v12-gap-closure
plan: 01
subsystem: tech-debt
tags: [tech-debt, typescript, strict-mode, cast-widening, TS2352, build]

requires:
  - phase: 15-quality-check-engine-drill-down
    provides: established the double-cast-via-unknown pattern for FHIR union types
  - phase: 16-conformance-plausibility-checks
    provides: profileConformanceChecker + temporalPlausibilityWalker implementations whose casts this plan widens
provides:
  - Zero TS2352 errors repo-wide
  - Clean `npx tsc -b --noEmit` and `npm run build` (Flow D Clean Build unblocked)
  - Uniform double-cast-via-unknown pattern across all FHIR-union-to-Record casts in src/quality/
affects: [20-v12-gap-closure, v1.2-milestone-audit, DEBT-02]

tech-stack:
  added: []
  patterns:
    - "Double-cast via unknown for FHIR union types: `(x as unknown as Record<string, unknown>).prop`"

key-files:
  created:
    - .planning/phases/20-v12-gap-closure/deferred-items.md
  modified:
    - src/quality/profileConformanceChecker.ts
    - src/quality/temporalPlausibilityWalker.ts

key-decisions:
  - "Apply the proven Phase 15 fix pattern mechanically (single-cast → double-cast via unknown) to 7 sites without changing any surrounding code or runtime semantics"
  - "Log 21 pre-existing test failures to deferred-items.md instead of fixing them — SCOPE BOUNDARY (compile-time cast widening cannot affect runtime test behaviour)"

patterns-established:
  - "When widening casts for TS strict mode: prefer `as unknown as T` over introducing helper types or restructuring code. Matches the convention set in Phase 15."

requirements-completed: [DEBT-02]

duration: ~3min
completed: 2026-04-14
---

# Phase 20 Plan 01: TS2352 Cast Widening Summary

**Widened 7 FHIR-union-to-Record casts across 2 files using the double-cast-via-unknown pattern, restoring zero-error `tsc` and `vite build` contracts and unblocking DEBT-02 / Flow D (Clean Build) from the v1.2 audit.**

## Performance

- **Duration:** ~3 min
- **Started:** 2026-04-14T21:31:00Z (approx)
- **Completed:** 2026-04-14T21:34:38Z
- **Tasks:** 3
- **Files modified:** 2 source, 1 planning (deferred-items.md)

## Accomplishments

- 6 cast sites in `src/quality/profileConformanceChecker.ts` widened (lines 139, 142, 143, 144, 147, 296) — eliminates 6 TS2352 errors
- 1 cast site in `src/quality/temporalPlausibilityWalker.ts` widened (line 439) — eliminates the 7th TS2352 error
- `npx tsc -b --noEmit` exits 0 repo-wide (zero TS2352 errors)
- `npm run build` exits 0 (Vite production build succeeds, built in ~624ms)
- Target-file unit tests remain green: `profileConformanceChecker.test.ts` 9/9, `temporalPlausibilityWalker.test.ts` 15/15

## Task Commits

Each task was committed atomically:

1. **Task 1: Widen 6 casts in profileConformanceChecker.ts** — `00e3337` (fix)
2. **Task 2: Widen 1 cast in temporalPlausibilityWalker.ts** — `65a02c2` (fix)
3. **Task 3: Verify clean build end-to-end** — `850f6a6` (chore; also creates `deferred-items.md` for pre-existing unrelated test failures)

_Plan metadata commit is deferred to the orchestrator per parallel-execution protocol (orchestrator owns STATE.md / ROADMAP.md writes)._

## Files Created/Modified

- `src/quality/profileConformanceChecker.ts` — widened 5 `(el as Record<string, unknown>)` and 1 `(resource as Record<string, unknown>)` casts to their `as unknown as Record<string, unknown>` form (6 edits total)
- `src/quality/temporalPlausibilityWalker.ts` — widened 1 `(resource as Record<string, unknown>)` cast on line 439 inside `normalizeTemporalIssues`
- `.planning/phases/20-v12-gap-closure/deferred-items.md` — NEW; catalogues 21 pre-existing test failures discovered during Task 3 full-suite verification (confirmed unrelated to this plan via baseline check)

## Decisions Made

- **Mechanical-only edits.** The plan was explicit that the 7 sites are all identical in form and the pattern was already proven in Phase 15. No deliberation was needed beyond confirming each byte-identical edit.
- **Deferred unrelated test failures rather than chase them.** Task 3 revealed 21 failing tests in 8 unrelated files (patient-list, patient-detail, terminology-health, sidebar-terminology, etc.). I temporarily reverted my edits, reran the suspect tests, and confirmed the same failures occur on the pre-fix baseline. Cast widening is compile-time only and cannot cause runtime regressions, so these failures predate Plan 20-01. Per `deviation_rules` SCOPE BOUNDARY, they were logged to `deferred-items.md` (follow-up candidate for Plan 20-03 or a new plan) rather than fixed here.

## Deviations from Plan

None — plan executed exactly as written for all 7 target sites. No Rule 1/2/3 auto-fixes were needed.

One observational note: the plan's Task 2 acceptance criterion stated `grep -c "as unknown as Record<string, unknown>" src/quality/temporalPlausibilityWalker.ts` should return `1`. The actual count post-fix is `2` because line 373 (inside a helper call arg) was already using the double-cast pattern before this plan started — it wasn't one of the 7 plan sites. The substantive criteria (zero `(resource as Record<string, unknown>)` single-casts, zero TS2352 errors in this file, test suite green for this file) all pass. Not a deviation; a baseline detail the plan's acceptance-criterion count didn't anticipate.

## Issues Encountered

**Full-suite regression check (Task 3) surfaced 21 pre-existing failures unrelated to this plan.** Resolved by baseline-testing against the pre-fix files (same failures reproduce) and logging to `deferred-items.md`. Build contract (tsc 0, vite 0) — the declared Phase 20 success criterion — is satisfied; target-file unit tests pass.

## User Setup Required

None — compile-time-only change, no external services or configuration touched.

## Next Phase Readiness

- DEBT-02 requirement is satisfiable (checkbox flip explicitly deferred to Plan 20-03 per plan objective).
- Flow D (Clean Build) in the v1.2 milestone audit will flip from broken → complete on next re-audit.
- No blockers introduced for Plan 20-02 or 20-03.
- Pre-existing test-suite failures documented in `deferred-items.md` are a recommended follow-up (Plan 20-03 candidate or standalone).

## Self-Check: PASSED

Verified claims:

- `src/quality/profileConformanceChecker.ts` exists and contains 6 occurrences of `as unknown as Record<string, unknown>` (grep confirmed)
- `src/quality/temporalPlausibilityWalker.ts` exists and line 439 uses `(resource as unknown as Record<string, unknown>).id` (grep/read confirmed)
- `.planning/phases/20-v12-gap-closure/deferred-items.md` exists (`Write` tool returned success)
- Commit `00e3337` present in `git log` (`git log --oneline` confirmed)
- Commit `65a02c2` present in `git log` (confirmed)
- Commit `850f6a6` present in `git log` (confirmed)
- `npx tsc -b --noEmit` exits 0 (captured during Task 3)
- `npm run build` exits 0 (captured during Task 3, `built in 624ms`)
- Zero TS2352 errors repo-wide (`grep -c "TS2352"` on tsc output returned 0)

---
*Phase: 20-v12-gap-closure*
*Completed: 2026-04-14*
