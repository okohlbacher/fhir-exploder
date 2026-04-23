---
phase: 28-micro-consistency-sweep
plan: 02
subsystem: quality + patients
tags:
  - sweep
  - lint-hygiene
  - refactor
  - tdd-not-applicable
requires:
  - 28-01
  - 24-04 (useAsyncRun autoStart absorbed drill-down auto-start concern)
  - 23 (CLOSE-06 Bug B added autoStart:true to all 4 report hooks)
  - 25-03 (DrillDownShell extraction; back-button ref moved to shared shell)
  - 26-01 (QualityLayout SHELL-01; left ≤30 LOC soft-miss to close here)
provides:
  - SWEEP-03 closed (4 drill-down eslint-disables removed; effect was dead code, not a deps gap)
  - SWEEP-04 partially closed (essay extraction + PatientListPage initializer; ref-type sub-task documented as already correct)
  - QualityLayout dropped from 58 LOC to 35 LOC (Phase 26 soft-miss closed at upper bound)
affects:
  - src/components/quality/PlausibilityDrillDown.tsx
  - src/components/quality/LabRangesDrillDown.tsx
  - src/components/quality/DuplicatesDrillDown.tsx
  - src/components/quality/ReferencesDrillDown.tsx
  - src/components/quality/QualityLayout.tsx
  - src/components/quality/__tests__/quality-layout.test.tsx
  - src/quality/cohorts.ts
  - src/components/patients/PatientListPage.tsx
tech-stack:
  added: []
  patterns:
    - "useAsyncRun({ autoStart: true, deps: [...] }) is the single source of mount/dep-change runner firing — drill-down components do NOT need their own auto-start useEffect (was dead code hidden by eslint-disable)"
    - "Mount-time snapshot from URL/storage: prefer `useState(() => compute())` over `useMemo(() => compute(), [])` — canonical React idiom, no lint suppression needed"
    - "Belt-and-suspenders retry around an idempotent helper is a no-op (same try/catch swallows the same errors); fold into the helper, don't duplicate at call sites"
key-files:
  created: []
  modified:
    - src/components/quality/PlausibilityDrillDown.tsx (deleted redundant auto-start useEffect)
    - src/components/quality/LabRangesDrillDown.tsx (deleted redundant auto-start useEffect)
    - src/components/quality/DuplicatesDrillDown.tsx (deleted redundant auto-start useEffect)
    - src/components/quality/ReferencesDrillDown.tsx (deleted redundant auto-start useEffect)
    - src/components/quality/QualityLayout.tsx (58 → 35 LOC; essay extracted, unused imports removed)
    - src/components/quality/__tests__/quality-layout.test.tsx (test 1 narrowed to "helper invoked on mount")
    - src/quality/cohorts.ts (docstring updated to record SWEEP-04 consolidation)
    - src/components/patients/PatientListPage.tsx (useMemo → useState lazy initializer)
decisions:
  - SWEEP-03 was an absorption gap, not a deps gap. The disable-comments were masking a real lint warning (`run is missing from deps`). Adding `run` to deps would restart the effect every render (useAsyncRun returns a fresh object each call). Investigation revealed all 4 hooks use `useAsyncRun({ autoStart: true })` already — so the drill-down auto-start effect was dead code. Removed the effect entirely.
  - DrillDownShell ref type left as `HTMLAnchorElement` — Rule 4 deviation. The plan assumed the ref attaches to a `<button>` (since the JSX uses Mantine `<Button>`), but `<Button component={Link}>` polymorphs to a react-router `<Link>` which renders `<a>`. TypeScript correctly rejects `useRef<HTMLButtonElement>`. The original `HTMLAnchorElement` type is correct.
  - PatientListPage fix used a named helper (`computeInitialFromUrl`) rather than inline anonymous functions at each useState site, because the function body is 7 lines and is consumed twice (once for `searchParams`, once for `activeSearch`). Named helper avoids duplication; inline arrows would have duplicated the body verbatim.
  - QualityLayout regression-fence test (test 1) was updated rather than deleted: it still verifies "helper called once on mount" (the wiring contract), but no longer asserts the localStorage side effects (those are pinned by 3 direct unit tests in `src/hooks/useCohorts.test.tsx`).
metrics:
  duration: 25 minutes
  completed: 2026-04-23
  tasks_completed: 3 of 4 planned (Task 2 documented as Rule 4 deviation, no edit applied)
  commits: 3
---

# Phase 28 Plan 02: SWEEP-03 + SWEEP-04 Summary

Eliminated 4 drill-down eslint-disable pragmas (SWEEP-03), extracted the QualityLayout legacy-migration belt-and-suspenders essay into `migrateLegacyResourceTypeKey` (SWEEP-04 part B; closed Phase 26 ≤35 LOC soft-miss), and replaced PatientListPage's `useMemo` + lint-disable with the canonical `useState` lazy initializer pattern (SWEEP-04 part C). The DrillDownShell ref-type sub-task (SWEEP-04 part A) was found to already be correct — the plan's assumption rested on a misread of Mantine's polymorphic `<Button component={Link}>`.

## What Shipped

### SWEEP-03 — Drill-down eslint-disable removal (commit 2b2e9a9)

All 4 drill-down components (`PlausibilityDrillDown`, `LabRangesDrillDown`, `DuplicatesDrillDown`, `ReferencesDrillDown`) had a `useEffect(() => { if (run.status === 'idle') run.start(); }, [type | ])` block guarded by `// eslint-disable-next-line react-hooks/exhaustive-deps`. The disable was masking a legitimate lint warning: `run` was missing from the deps array.

Investigation:
1. Removing the disable surfaced the warning on all 4 files: `useEffect has a missing dependency: 'run'`.
2. Adding `run` to deps would restart the effect on every render — `useAsyncRun` returns `{ ...state, start, cancel }` (a fresh object) each call, so identity changes constantly.
3. Reading `useAsyncRun` revealed an `autoStart: true` opt-in that fires `start()` on mount and on every change to caller-supplied `deps` (via the hook's own internal effect).
4. Reading the 4 report hooks (`usePlausibilityReport`, `useLabRangesReport`, `useDuplicateReport`, `useReferenceReport`) confirmed all 4 ALREADY use `useAsyncRun({ autoStart: true, deps: [...] })` — added in Phase 23 CLOSE-06 Bug B.

Conclusion: the drill-down's `if (status === 'idle') start()` effect was dead redundant code. The hook's internal autoStart already covered the same concern via stable internal deps. Resolution: deleted the redundant effects (and the `useEffect` import) from all 4 files. Net: -36 LOC, +12 LOC of explanatory comments. Lint clean with `--max-warnings=0`.

### SWEEP-04 part A — DrillDownShell ref type (NOT EDITED — see Deviations)

Plan said: `useRef<HTMLAnchorElement | null>` at `DrillDownShell.tsx:73` should change to `useRef<HTMLButtonElement | null>` because the ref attaches to a Mantine `<Button>`. **Plan was wrong.** The JSX is `<Button ... component={Link} to={backHref} ref={backRef}>` — Mantine's polymorphic Button + react-router's `<Link>` (which renders `<a>`) means the actual DOM element is `HTMLAnchorElement`. TypeScript confirmed: changing to `HTMLButtonElement` produced TS2322 "Type 'MutableRefObject<HTMLButtonElement>' is not assignable to type 'Ref<HTMLAnchorElement>'". Original code is correct; documented as Rule 4 deviation.

### SWEEP-04 part B — QualityLayout essay extraction (commit fe49871)

`QualityLayout.tsx` previously contained a `useEffect` that called `migrateLegacyResourceTypeKey()` followed by an inline belt-and-suspenders try/catch block that re-checked LEGACY_COHORT_KEY, re-copied to RESOURCE_TYPES_STORAGE_KEY, and re-removed LEGACY_COHORT_KEY. Side-by-side comparison showed the BAS block was a no-op in every scenario (the helper's try/catch swallows the same errors the BAS try/catch would). 

Resolution:
- Deleted the entire BAS block; useEffect body is now `migrateLegacyResourceTypeKey();`.
- Removed the now-unused `LEGACY_COHORT_KEY` and `RESOURCE_TYPES_STORAGE_KEY` imports.
- Compacted the JSX (removed multi-line `context={...}` formatting).
- Updated the file header comment to drop the Phase 26 soft-miss reference.
- Updated `migrateLegacyResourceTypeKey`'s docstring in `cohorts.ts` to record the Phase 28 SWEEP-04 consolidation.

Result: QualityLayout went from 58 LOC to **35 LOC** — exactly at the plan's ≤35 target. Phase 26 originally aimed for ≤30; the remaining 5 LOC over that goal are the JSX outlet block, which is structural and can't compress further without losing the `state.status === 'connected'` guard.

The QualityLayout regression-fence test (`quality-layout.test.tsx`) had a test 1 that asserted the inline BAS block cleared LEGACY_COHORT_KEY even when the helper was stubbed — an implementation-detail assertion that broke when the BAS block was removed. Updated test 1 to assert only the wiring contract ("helper invoked exactly once on mount"). The localStorage side-effect contract (legacy key cleared, new key seeded, idempotency, no-op on absent) remains pinned by 3 direct unit tests in `src/hooks/useCohorts.test.tsx`. All 4 quality-layout tests pass; all 45 cohorts/useCohorts tests pass.

### SWEEP-04 part C — PatientListPage useMemo → useState lazy initializer (commit e8e6279)

Lines 285-291 of `PatientListPage.tsx` had:
```typescript
const initialFromUrl = useMemo<PatientSearchParams>(() => ({
  name: urlParams.get('name') ?? '',
  // ...
}), []); // eslint-disable-line react-hooks/exhaustive-deps
```

The result was consumed only as a seed for two `useState(initialFromUrl)` calls (lines 294 + 303). Classic mount-time snapshot pattern dressed as memoization.

Resolution: replaced `useMemo` with a render-scope helper `computeInitialFromUrl` passed to both `useState` calls as a lazy initializer. React invokes the function exactly once per `useState` on first render, ignoring identity changes on subsequent re-renders — no memoization, no deps array, no lint suppression needed.

The named helper (over inline anonymous functions) was chosen because the function body is 7 lines and is consumed twice; inline arrows would have duplicated the body verbatim.

Result: `grep -c eslint-disable PatientListPage.tsx` returns **0**, `grep -c initialFromUrl` returns **0**, tsc clean.

## Verification

| Check | Result |
|-------|--------|
| Drill-down disables (4 files summed) | 0 |
| `HTMLAnchorElement` in DrillDownShell.tsx | 1 (kept — see deviation) |
| QualityLayout.tsx LOC | 35 (target ≤35) |
| `eslint-disable-line react-hooks/exhaustive-deps` in PatientListPage.tsx | 0 |
| `eslint-disable` (any kind) in PatientListPage.tsx | 0 |
| `initialFromUrl` references | 0 |
| `npx tsc -b --noEmit` | clean |
| `npx eslint` on 4 drill-down files `--max-warnings=0` | clean |
| `npx vitest run quality-layout.test.tsx` | 4/4 pass |
| `npx vitest run cohorts.test.ts useCohorts.test.tsx` | 45/45 pass |
| Full test suite | 22 failed \| 814 passed (exact post-Phase-27 baseline; zero new regressions) |

## Deviations from Plan

### Auto-handled

**1. [Rule 4 - Architectural assumption mismatch] DrillDownShell ref type — already correct, no edit applied**

- **Found during:** Task 2 (SWEEP-04 part A)
- **Issue:** Plan must_have asserted `useRef<HTMLAnchorElement | null>` should change to `useRef<HTMLButtonElement | null>` "because the ref targets a button element, not an anchor." This claim is factually wrong: the JSX is `<Button ... component={Link} to={backHref} ref={backRef}>`. Mantine's polymorphic `<Button>` + react-router's `<Link>` renders an `<a>` element, so the ref factually attaches to `HTMLAnchorElement`. TypeScript confirmed: changing to `HTMLButtonElement` produced compile error TS2322 "Type 'MutableRefObject<HTMLButtonElement>' is not assignable to type 'Ref<HTMLAnchorElement>'".
- **Investigation path:** Plan Task 2 step 2 explicitly provided this escape hatch: "If it attaches to an `<a>` / `<Anchor>` / `<Link>` / Mantine `<Anchor>`: type is `HTMLAnchorElement`. STOP — the current code is correct; file a note and do not edit."
- **Resolution:** Reverted my exploratory `HTMLButtonElement` edit. No commit produced for this task. The original `HTMLAnchorElement` type is correct and is preserved in the working tree.
- **Architectural alternative considered:** Switching `<Button component={Link}>` to a plain `<button>` with `useNavigate()` would let the ref legitimately become `HTMLButtonElement`. Rejected because it would break `<a>`-element navigation semantics: middle-click-new-tab, cmd+click, right-click "Copy link address", and screen-reader link enumeration. Functional regression unacceptable for a typing tweak.
- **Files modified:** none
- **Commit:** none

### Plan instruction adjustments

**2. [Rule 1 - Effect was dead code, not a deps gap] SWEEP-03 fix shape**

- **Found during:** Task 1
- **Issue:** Plan suggested fix path was "remove the disable; if lint warns, find the missing dep." But adding `run` to deps would restart on every render (useAsyncRun returns a fresh object each call). The actual root cause: each report hook already uses `useAsyncRun({ autoStart: true })`, so the drill-down's auto-start effect is redundant.
- **Fix:** Deleted the redundant `useEffect` (and its `useEffect` import) from all 4 drill-down files instead of trying to "correct the deps."
- **Files modified:** PlausibilityDrillDown.tsx, LabRangesDrillDown.tsx, DuplicatesDrillDown.tsx, ReferencesDrillDown.tsx
- **Commit:** 2b2e9a9
- **Note:** This matches the plan's spirit ("the effect deps are now clean" per D-08) — the cleanest way to make deps clean is to delete the redundant effect. The plan's wording "deps are clean" was aspirational; the reality is the effect is unnecessary, which is a stronger cleanup.

**3. [Rule 2 - Test was asserting implementation detail] quality-layout.test.tsx update**

- **Found during:** Task 3 (SWEEP-04 part B)
- **Issue:** Test 1 stubbed `migrateLegacyResourceTypeKey` to a no-op `vi.fn()` and asserted that the inline BAS block in QualityLayout cleared LEGACY_COHORT_KEY anyway. With the BAS block removed, the test would fail because nothing else clears the key when the helper is stubbed.
- **Fix:** Narrowed test 1 to assert only "helper invoked exactly once on mount" — the wiring contract that the regression fence is supposed to protect. The localStorage side-effect contract is already pinned by 3 direct unit tests in `useCohorts.test.tsx` (copy-on-mount, idempotent-no-clobber, no-op-when-absent).
- **Files modified:** src/components/quality/__tests__/quality-layout.test.tsx
- **Commit:** fe49871 (bundled with QualityLayout edit)

## Authentication Gates

None.

## Deferred Issues

The following pre-existing lint findings in `PatientListPage.tsx` are **out of scope** for SWEEP-04 (per plan's SCOPE BOUNDARY rule):
- `react-hooks/set-state-in-effect` at line 314 (calling setState synchronously in useEffect — pre-existing pattern in the search-execute effect)
- `prefer-const` at line 325 (`idValue` is never reassigned)

Recorded for future hygiene phase if not already in `.planning/phases/28-micro-consistency-sweep/deferred-items.md`.

## Threat Flags

None. This plan is a pure refactor — no new network endpoints, no auth paths, no schema changes, no PHI flow modifications. ASVS L1 surface unchanged. Pre-existing threat dispositions in 28-02-PLAN.md `<threat_model>` (T-28-02-01..04) all `accept`; mitigations remain in place (helper try/catch, useState lazy init, deleted dead code, ref-type kept correct).

## Self-Check: PASSED

Created files:
- FOUND: .planning/phases/28-micro-consistency-sweep/28-02-SUMMARY.md

Commits:
- FOUND: 2b2e9a9 (SWEEP-03 drill-down disable removal)
- FOUND: fe49871 (SWEEP-04 part B QualityLayout essay extraction)
- FOUND: e8e6279 (SWEEP-04 part C PatientListPage initializer)
- N/A: SWEEP-04 part A (no commit — Rule 4 deviation, no edit applied; original code correct)
