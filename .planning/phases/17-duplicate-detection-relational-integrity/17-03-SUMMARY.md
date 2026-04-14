---
phase: 17-duplicate-detection-relational-integrity
plan: 03
subsystem: ui
tags: [react, vitest, mantine, duplicate-detection, regression-test, gap-closure]

# Dependency graph
requires:
  - phase: 17-duplicate-detection-relational-integrity
    provides: "DuplicatesPanel UI wiring (17-02) and PatientDuplicateCluster / ContentHashCluster engine types (17-01)"
provides:
  - "DuplicatesPanel cluster summary memos correctly reference the real PatientDuplicateCluster.patients and ContentHashCluster.resources fields (no more c.members crash)"
  - "Component-level regression test that exercises the non-empty cluster rendering path so the field-name mismatch cannot recur silently"
  - "SC-1 (DQ-07) and SC-2 (DQ-08) verification gap closed"
affects: [duplicate-detection, quality-dashboard, future-phase-17-followups]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Component regression test mocks the data-fetching hook (vi.mock of useDuplicateReport) and renders under MantineProvider + MemoryRouter, mirroring coding-coverage-panel.test.tsx and completeness-drilldown.test.tsx"
    - "Bug-falsification proof: revert the fix, re-run the test, confirm failure, then restore — proves the test actually exercises the crash path"

key-files:
  created:
    - src/__tests__/duplicates-panel.test.tsx
  modified:
    - src/components/quality/DuplicatesPanel.tsx

key-decisions:
  - "Two one-word edits only (members -> patients on line 73, members -> resources on line 82). No reformat, no refactor, no tsconfig changes."
  - "Regression test scope deliberately tight: summary memos + empty path. Drill-down navigation stays in 17-VERIFICATION.md human-UAT."
  - "Pre-existing test-suite failures (terminology-health, patient-list, etc., 21 total) verified as unrelated to 17-03 via git-stash check; deferred to a future quality-pass phase via deferred-items.md."

patterns-established:
  - "Gap-closure plan pattern: minimal targeted fix + regression test that fails on the broken code, in two atomic commits"

requirements-completed: [DQ-07, DQ-08]

# Metrics
duration: 3min
completed: 2026-04-14
---

# Phase 17 Plan 03: DuplicatesPanel Field-Name Bug Closure Summary

**Two-line fix to DuplicatesPanel cluster summary memos (members -> patients / resources) plus a 3-test regression suite that fails on the broken code, closing the SC-1/SC-2 verification gap for DQ-07 and DQ-08.**

## Performance

- **Duration:** ~3 min
- **Started:** 2026-04-14T09:01:01Z
- **Completed:** 2026-04-14T09:04:14Z
- **Tasks:** 2 / 2
- **Files modified:** 2 (1 src fix, 1 new test file)

## Accomplishments

- Fixed `c.members.length` -> `c.patients.length` on line 73 (PatientDuplicateCluster summary memo)
- Fixed `c.members.length` -> `c.resources.length` on line 82 (ContentHashCluster summary memo)
- Added `src/__tests__/duplicates-panel.test.tsx` (172 lines, 3 tests) exercising non-empty cluster rendering, NaN-vs-finite invariant, and the empty-state path
- Bug-falsification proof: with the fix reverted, 2 of 3 new tests fail with `TypeError: Cannot read properties of undefined (reading 'length')` on `c.members.length` — proves the regression guard works
- SC-1 (DQ-07) and SC-2 (DQ-08) verification gap closed: Duplicates tab no longer throws when the engine returns non-empty clusters

## Task Commits

Each task committed atomically:

1. **Task 1: Fix cluster field references in DuplicatesPanel.tsx** — `0ed47d4` (fix)
2. **Task 2: Add regression test covering non-empty cluster rendering** — `e9d3ef2` (test)

_Plan metadata commit follows this SUMMARY._

## Files Created/Modified

- `src/components/quality/DuplicatesPanel.tsx` — corrected two cluster-field dereferences (lines 73, 82)
- `src/__tests__/duplicates-panel.test.tsx` — new regression test guarding against re-introduction of the field-name mismatch
- `.planning/phases/17-duplicate-detection-relational-integrity/deferred-items.md` — logged pre-existing out-of-scope test failures and advisory review findings

## Decisions Made

- Followed the plan exactly: two one-word edits with no reformat or refactor; no tsconfig flag changes; comments left as-is.
- Did NOT address advisory findings WR-01 / IN-01..IN-05 from 17-REVIEW.md — explicitly out of scope for this gap-closure plan, deferred to a future quality-pass phase.
- Did NOT attempt to fix the 21 pre-existing test failures in unrelated files (terminology-health, patient-list, patient-detail, sidebar-terminology-row, human-readable-view-terminology, patient-view-toggle, quality-overview, resource-type-landing-counts) — confirmed via `git stash` that they reproduce on the prior commit, so they are not caused by this plan. Deferred per the scope-boundary rule.

## Deviations from Plan

None — plan executed exactly as written.

## Issues Encountered

- `npx vitest run` (full suite) reports 21 failing tests across 8 unrelated files. Verified pre-existing on `main` before plan 17-03 by stashing the worktree and re-running the failing files — same failures reproduce. These are documented in `.planning/phases/17-duplicate-detection-relational-integrity/deferred-items.md` and remain out of scope per scope guardrails. The new `duplicates-panel.test.tsx` and the targeted `npx vitest run src/__tests__/duplicates-panel.test.tsx` both pass cleanly (3/3).

## Verification Results

| Check | Result |
| --- | --- |
| `grep -c "c\.members" src/components/quality/DuplicatesPanel.tsx` | `0` |
| `grep -c "c\.patients\.length" src/components/quality/DuplicatesPanel.tsx` | `1` |
| `grep -c "c\.resources\.length" src/components/quality/DuplicatesPanel.tsx` | `1` |
| `npx tsc --noEmit` | exit 0 |
| `npx vitest run src/__tests__/duplicates-panel.test.tsx` | exit 0, 3/3 tests pass |
| `git diff` for DuplicatesPanel.tsx (Task 1 only) | exactly 2 insertions, 2 deletions on lines 73 and 82 |
| Bug-falsification (revert -> test -> restore) | 2/3 tests fail on broken code, all 3 pass on fixed code |
| `npx vitest run` (full suite) | 8 files / 21 tests fail — all pre-existing, unrelated to 17-03 (verified via git-stash). New test file passes. |

## User Setup Required

None — no external service configuration required.

## Next Phase Readiness

- DQ-07 and DQ-08 ready to move from FAILED to VERIFIED in 17-VERIFICATION.md.
- Phase 17 functional gap closed; remaining items (advisory review findings WR-01..IN-05, pre-existing test-suite failures in unrelated files) are queued in `deferred-items.md` for a future quality-pass phase.
- No new dependencies, no schema changes, no API surface changes.

## Self-Check: PASSED

- src/components/quality/DuplicatesPanel.tsx: FOUND (modified, 2 lines changed)
- src/__tests__/duplicates-panel.test.tsx: FOUND (new file, 172 lines, 3 tests passing)
- Commit 0ed47d4 (fix Task 1): FOUND in `git log`
- Commit e9d3ef2 (test Task 2): FOUND in `git log`

---
*Phase: 17-duplicate-detection-relational-integrity*
*Completed: 2026-04-14*
