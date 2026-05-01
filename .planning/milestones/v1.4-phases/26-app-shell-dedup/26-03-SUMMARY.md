---
phase: 26-app-shell-dedup
plan: 03
subsystem: ui
tags: [react, react-router, mantine, sidebar, nested-route-activation, useMatch]

# Dependency graph
requires:
  - phase: 26-app-shell-dedup
    provides: 26-01 ConnectionGatedOutlet (no direct use — listed because ROADMAP depends_on chain is 26-03 → 26-01)
provides:
  - Sidebar row activation via React Router useMatch (nested-route aware)
  - NavItem.exact flag pattern for per-row end:true vs end:false control
  - Most-specific-wins rule for overlapping section roots (Option B)
affects: [phase-27, phase-28]  # any phase adding new sidebar rows or sub-routes

# Tech tracking
tech-stack:
  added: []  # no new deps; pure refactor using already-installed react-router-dom
  patterns:
    - "useMatch-per-row activation for Mantine NavLink + RouterNavLink compositions (workaround for Mantine not forwarding react-router render-prop isActive)"
    - "NavItem.exact?: boolean field for per-item end-semantics control"
    - "Most-specific-wins route activation via descendant-match subtraction (cohortsMatch suppresses qualityMatch)"

key-files:
  created:
    - src/components/layout/__tests__/Sidebar.test.tsx
  modified:
    - src/components/layout/Sidebar.tsx

key-decisions:
  - "Option B committed (Cohorts-only activation on /quality/cohorts): Quality row suppresses when a Cohorts descendant is active. ROADMAP success criterion #3 says 'section root' (singular)."
  - "useMatch-per-row instead of Mantine NavLink isActive render-prop (per RESEARCH.md §Focus 3 — Mantine NavLink does not forward react-router's render-prop isActive)."
  - "Dashboard (/) and Cohorts (/quality/cohorts) are exact:true; Explorer/Patients/Quality are section roots (end:false)."
  - "Settings row migrated in the same commit (second exact-match site at line 115 was not structurally different from the NAV_ITEMS loop's line 104 bug — keeping both migrations together avoids a mixed state)."

patterns-established:
  - "SidebarRow row component: each row computes its own active via useMatch; Mantine NavLink receives the resolved boolean."
  - "Most-specific-wins via descendant subtraction: active = !!match && !moreSpecificMatch for section roots that overlap sub-route rows."

requirements-completed: [SHELL-03]

# Metrics
duration: ~10min
completed: 2026-04-22
---

# Phase 26 Plan 03: Sidebar useMatch Migration (Option B) Summary

**Sidebar nested-route activation migrated from exact-match to useMatch with per-row exact flag and most-specific-wins Quality/Cohorts rule — /patients/123, /explorer/Patient/1, /quality/plausibility/Observation now highlight their section roots; /quality/cohorts highlights ONLY Cohorts.**

## Performance

- **Duration:** ~10 min
- **Started:** 2026-04-22T20:10:00Z (approx)
- **Completed:** 2026-04-22T20:20:42Z
- **Tasks:** 2 (RED test, GREEN refactor)
- **Files modified:** 2 (1 created, 1 modified)

## Accomplishments

- **Exact-match bug fixed** at `Sidebar.tsx:104,115`. Nested routes now correctly highlight their section root (prior behaviour: no row was highlighted because `location.pathname === item.to` never matched nested paths).
- **Option B implemented unconditionally** with the most-specific-wins Quality suppression rule. Formula in `SidebarRow`: `active = item.to === '/quality' ? !!match && !cohortsMatch : !!match`. ROADMAP Phase 26 success criterion #3 "section root" (singular) is satisfied.
- **7 Sidebar tests added** (pre-refactor: 3 RED; post-refactor: 7/7 GREEN) covering all four section-root scenarios, the Option B Cohorts-only case, the Dashboard exact-match regression guard, and the Settings row exact-match regression guard.
- **`useLocation` fully removed** from `Sidebar.tsx` — both the import and the call. Only `useMatch` drives active state now.

## Task Commits

1. **Task 1: Create Sidebar.test.tsx with nested-route activation assertions (Option B)** — `314f0e1` (test)
2. **Task 2: Refactor Sidebar.tsx to useMatch with Option B** — `92d4468` (refactor)

Both commits authored with `--no-verify` per parallel-execution mandate (running in Wave 2 parallel with plan 26-02 — disjoint file sets).

## Files Created/Modified

- `src/components/layout/__tests__/Sidebar.test.tsx` *(created, 204 LOC)* — 7 vitest cases using `MemoryRouter` + `MantineProvider` + `AppShell` harness. Mocks `useTerminologyHealth`, `useSettings`, `useConnectionContext`. Active state detected via `data-active="true"` attribute on the rendered anchor (Mantine 8 NavLink emits this when `active` prop is truthy).
- `src/components/layout/Sidebar.tsx` *(modified, 123 → 171 LOC, **+48 LOC**)* — LOC increase is from (a) new `NavItem` type declaration (~6 LOC), (b) new `SidebarRow` component with JSDoc explaining Option B (~30 LOC), and (c) documentation comments on the most-specific-wins rule and Settings migration (~12 LOC). Runtime logic added is ~10 LOC; the rest is inline documentation.

## Decisions Made

- **Option B committed in plan, implemented unconditionally.** No branching on "current behaviour" — the test file asserts Option B as the behavioural contract. `/quality/cohorts` highlights ONLY Cohorts.
- **`useMatch` at row level instead of Mantine NavLink isActive render-prop** — per RESEARCH.md §Focus 3, `@mantine/core` NavLink with `component={RouterNavLink}` does not forward react-router's render-prop `isActive`. `useMatch` is the cleanest available primitive.
- **Settings row migrated in Task 2 (not deferred)** — the plan's done criteria call for `useLocation` count == 0, which required migrating the second exact-match site simultaneously. `useMatch({ path: '/settings', end: true })` is behaviourally identical to the prior `location.pathname === '/settings'` check.
- **`SidebarRow` extracted as its own component** rather than inlining the `useMatch` calls in the map body — hooks can't be called inside a `.map()` callback without wrapping, and the component boundary also isolates the most-specific-wins rule to a single audited surface.

## Deviations from Plan

None of consequence — plan executed as written. One micro-adjustment:

### Auto-fixed Issues

**1. [Rule 3 - Blocking] Added `AppShell` wrapper to Sidebar test harness**
- **Found during:** Task 1 (initial `npm test` run)
- **Issue:** First run of Sidebar tests crashed with "AppShell was not found in tree" because `Sidebar` uses `AppShell.Section` internally, which requires an ancestor `AppShell` context.
- **Fix:** Wrapped the `Sidebar` render in `<AppShell navbar={{width:240, breakpoint:0}}><AppShell.Navbar>…</AppShell.Navbar><AppShell.Main/></AppShell>`, mirroring `AppLayout.tsx:12-23`.
- **Files modified:** `src/components/layout/__tests__/Sidebar.test.tsx` (only; pre-commit).
- **Verification:** 7/7 tests resolve to actual assertion results (3 RED as predicted, 4 PASS by exact-match coincidence).
- **Committed in:** `314f0e1` (single Task-1 commit — fix was applied before the RED-state commit).

**2. [Rule 1 - Literal grep-gate comment]** Initial refactor included the literal string `location.pathname === '/settings'` in a JSDoc comment explaining the migration site. The plan's grep gate (`grep -c "location.pathname === " src/components/layout/Sidebar.tsx` must return 0) would fail on this literal even though no code used it.
- **Fix:** Rephrased the comment to say "the old exact pathname comparison against '/settings'" (no triple-equal literal).
- **Files modified:** `src/components/layout/Sidebar.tsx` (pre-commit).
- **Verification:** Grep gate now returns 0 cleanly.
- **Committed in:** `92d4468` (single Task-2 commit — fix applied before GREEN commit).

---

**Total deviations:** 2 micro-fixes, both pre-commit (no after-the-fact commits needed).
**Impact on plan:** None. Both were boilerplate/literal-matching hiccups, not behavioural changes. Plan intent fully preserved.

## Issues Encountered

- **Grep-gate literal ambiguity** — see deviation #2. Plan grep gates check for the literal string, not semantic usage. In future, gates could be specified with `grep -v '^\s*[*/]'` or similar to skip comments, but for now the author-side fix (rephrase the comment) is the simplest resolution.

## Verification Results

### Grep gates (post-refactor)

| Gate | Required | Actual | Pass |
|------|----------|--------|------|
| `useMatch` count | >= 3 | **10** | ✓ (3 hook calls + 7 doc/comment references) |
| `location.pathname === ` count | == 0 | **0** | ✓ |
| `useLocation` count | == 0 | **0** | ✓ |
| `exact: true` count | >= 2 | **3** | ✓ (Dashboard + Cohorts + 1 JSDoc reference) |
| Cohorts-suppression markers (`cohortsMatch\|!cohortsMatch\|quality/cohorts`) | >= 2 | **6** | ✓ |

### Tests

| State | Passing | Failing | Notes |
|-------|---------|---------|-------|
| RED (pre-Task-2, after test file only) | 4/7 | 3/7 | Tests 2 (patients/123), 3 (explorer/Patient/1), 4 (quality/plausibility/Observation) fail against the pre-refactor exact-match Sidebar. Tests 1/5/6/7 pass by exact-match coincidence. |
| GREEN (post-Task-2) | **7/7** | 0/7 | All seven cases pass, including Test 5 (Option B Cohorts-only). |

### Typecheck

`npx tsc -b --noEmit` — **0 errors**.

### Full suite regression

`npm test` — **22 failed / 806 passed / 22 todo / 3 skipped**. Matches the documented 22-failing baseline exactly — **0 new regressions**.

## LOC Delta

- `src/components/layout/Sidebar.tsx`: 123 → **171 LOC** (slightly increased, +48). Net runtime-logic growth is ~10 LOC (the `SidebarRow` component + `useMatch` calls). The remainder is JSDoc explaining the Option B rule and the useMatch-per-row pattern for future maintainers — intentional documentation density at the bug site.
- `src/components/layout/__tests__/Sidebar.test.tsx`: 0 → **204 LOC** (new file).

## Next Phase Readiness

- SHELL-03 requirement satisfied; ready for `/gsd-verify-work` once plan 26-02 also lands.
- No blockers. No API changes. No new dependencies.
- **Affects Phase 27/28** only in the sense that any new sidebar row should follow the `NavItem { to, exact?: boolean }` pattern; no migration burden for unrelated phases.

## Self-Check: PASSED

- [x] `src/components/layout/__tests__/Sidebar.test.tsx` exists (204 LOC)
- [x] `src/components/layout/Sidebar.tsx` modified (171 LOC)
- [x] Commit `314f0e1` present: `git log --oneline | grep 314f0e1` → "test(26): add Sidebar nested-route activation tests (SHELL-03 RED, Option B)"
- [x] Commit `92d4468` present: `git log --oneline | grep 92d4468` → "refactor(26): replace Sidebar exact-match with useMatch + Option B Cohorts activation (SHELL-03 GREEN)"
- [x] 7/7 tests passing
- [x] tsc clean
- [x] 22-failing baseline preserved (no new regressions)
- [x] All grep gates pass
- [x] Option B implemented unconditionally (most-specific-wins Quality suppression via `!cohortsMatch`)

---

*Phase: 26-app-shell-dedup*
*Completed: 2026-04-22*
