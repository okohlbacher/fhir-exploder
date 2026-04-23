---
phase: 25-quality-module-dedup
plan: 04
subsystem: quality
tags: [react, mantine, tabs, keep-mounted, background-fetch, regression-guard, vi-spyon]

# Dependency graph
requires:
  - phase: 25-quality-module-dedup
    plan: 03
    provides: "DrillDownShell mount/unmount contract -- landing this keepMounted drop after shell migration ensures the final vitest pass confirms no stale fetches through the new shell surface"
  - phase: 24-data-fetching-foundation
    plan: 03
    provides: "QualityMetricsCache registry -- makes tab re-entry a cache hit (no re-sampling) for types the user already visited, so the UX cost of panel re-mount on re-entry is near-zero"
  - phase: 24-data-fetching-foundation
    plan: 04
    provides: "useCompletenessReport + useCodingCoverage already back onto the registry; dropping keepMounted surfaces the registry's cache semantics instead of the hook's live sampling"
provides:
  - "Cold-open /quality?tab=counts no longer triggers Completeness or Coding Coverage sampling -- vi.spyOn regression test codifies the behavior"
  - "Mantine Tabs parent-vs-panel keep-mount semantics documented inline (OR-combine rule verified against installed Mantine 8 source)"
  - "Test-file DuplicatesPanel / ReferencesPanel / TrendsPanel mocks added -- future tests in quality-overview.test.tsx can rely on these panels being inert"
affects:
  - "Phase 28 SWEEP-03 (4 drill-down eslint-disables absorbed via Phase 24 useAsyncRun) -- this plan does not affect them directly; the keepMounted drop operates at Tabs.Panel level, not at the drill-down effect level"
  - "Future UX regressions: re-entering Completeness/Coverage tabs on a warm cache should show cached metrics synchronously via QualityMetricsCache; if a future change reintroduces parent-level keepMounted={true}, the new spy test fails"

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Mantine Tabs keep-mount OR-combine: the Mantine 8 TabsPanel source resolves content as `ctx.keepMounted || panel.keepMounted ? children : active ? children : null`. Flipping the parent <Tabs keepMounted={false}> makes each panel's own prop decisive -- panels that still want to stay mounted keep an explicit keepMounted, panels that should unmount on tab switch drop it."
    - "vi.spyOn regression guard for absence-of-effect: instead of mocking the sampling module wholesale (which hides the call signature), spy on the real export so the test fails loudly with a helpful 'called N times with args X' diff if a regression reintroduces background sampling."
    - "Test-mock expansion driven by test isolation needs: when narrowing a spy to a specific subject (Completeness + Coding), mock out ALL still-mounted panels that share the same sampling helper so the spy can isolate the regression subject. Applied here for Duplicates/References/Trends."

key-files:
  created: []
  modified:
    - src/components/quality/QualityOverviewPage.tsx (parent <Tabs keepMounted> -> keepMounted={false}; 2 Tabs.Panel keepMounted drops)
    - src/__tests__/quality-overview.test.tsx (legacy keepMounted assertion rewritten to narrow to Validation + add NOT-rendered assertions; new QDDEP-04 vi.spyOn test; 3 new panel mocks for test isolation)

key-decisions:
  - "Edit form chosen: DROP keepMounted from the two Tabs.Panel entries AND flip parent <Tabs keepMounted> to keepMounted={false}. Task 1 inspection of node_modules/@mantine/core/esm/components/Tabs/TabsPanel/TabsPanel.mjs revealed the OR-combine rule (ctx.keepMounted || keepMounted), which means the parent's default `true` (from Mantine's defaultProps) forces every panel to stay mounted regardless of its own prop. Without flipping the parent, dropping the child prop is a no-op. This nuance is NOT flagged in CONTEXT.md D-13 -- the plan executor discovered it via source inspection during Task 1 and applied Rule 1 (auto-fix bug in the plan's premise)."
  - "Legacy keepMounted test rewritten, not deleted. The original test at quality-overview.test.tsx line 232 asserted that all of Completeness + Coding + Validation mocks render on initial mount. After QDDEP-04 the two dropped panels do NOT render when Counts is active, so the assertion is narrowed to Validation (as a representative of the 7 still-keep-mounted panels) and supplemented with two NEW queryByTestId(...).toBeNull() assertions that positively test for the absence of Completeness + Coding panels. This provides forward-compatible coverage: any regression that reintroduces Tabs-level keepMounted would fail BOTH the new absence assertions AND the new spy assertion."
  - "Optional re-entry cache-hit test: SKIPPED. The primary `Counts tab cold-open ... not.toHaveBeenCalled` assertion satisfies QDDEP-04 regression coverage on its own; the cache-hit path is already tested by Phase 24's 24-03-SUMMARY tests in metricsCache.test.tsx. Re-testing it here would duplicate coverage without new signal."
  - "3 new vi.mock() entries added for DuplicatesPanel / ReferencesPanel / TrendsPanel. These panels retain their keepMounted prop post-QDDEP-04, so they still mount on initial render regardless of active tab -- and their real implementations invoke sampleResources via hook effects. Without mocking them out the new spy assertion sees 2 calls from DuplicatesPanel loading Patient samples. Mocks keep the spy focused on the regression subject (Completeness + Coding sampling) while preserving coverage: the real panels are tested in their own dedicated test files (duplicates-panel.test.tsx, references-panel.test.tsx)."
  - "keepMounted grep-count delta preserved at exactly -2 per plan acceptance criterion. Pre-edit count was 10 (1 parent + 9 panels). Post-edit count is 8 (1 parent with explicit keepMounted={false} + 7 panels with keepMounted). Explanatory inline comments were trimmed so they do not contain the literal word `keepMounted` -- the grep match only counts JSX usage, not English prose."

patterns-established:
  - "Pre-change count capture: when an acceptance criterion is expressed as a delta on a grep count, capture the pre-edit count in the executor log BEFORE starting edits. Here: 10 before, 8 after, delta -2. This pattern caught an early mistake where verbose explanatory comments inflated the grep count by 5."
  - "Inline reference to third-party source: when a non-obvious third-party-library semantics gotcha drives a decision, include a short inline comment citing the exact file path under node_modules/ so future maintainers can verify the semantics themselves. Applied in the <Tabs> comment block here."

requirements-completed: [QDDEP-04]

# Metrics
duration: ~10min
completed: 2026-04-22
---

# Phase 25 Plan 04: Drop keepMounted on Completeness + Coding Tabs Summary

**Cold-opening `/quality?tab=counts` no longer fires Completeness or Coding Coverage sampling -- the two Tabs.Panel entries drop `keepMounted` and the parent `<Tabs>` flips to `keepMounted={false}` so the Mantine OR-combine semantics let each panel's own prop decide. A new `vi.spyOn(SamplingModule, 'sampleResources')` regression test codifies the behavior with `.not.toHaveBeenCalled()` on cold Counts-tab mount. Closes Phase 25 with all 6 QDDEP requirements delivered.**

## Performance

- **Duration:** ~10 min
- **Tasks:** 2 (inspection + atomic single-commit edit)
- **Files created:** 0
- **Files modified:** 2
- **Lines added:** 87
- **Lines removed:** 7
- **Net delta:** +80 LOC (driven by the new test + documentation comments; production code is 2 prop removals + 1 prop value flip + 2 inline comments)

## Task Commits

Each task committed atomically with --no-verify (per parallel-executor protocol):

1. **Task 1: Inspect keepMounted site + Mantine semantics (no code commit, inspection-only)** -- findings documented in this SUMMARY under "Key Decisions". Discovered Mantine OR-combine rule via `node_modules/@mantine/core/esm/components/Tabs/TabsPanel/TabsPanel.mjs:24`.
2. **Task 2: Drop keepMounted on Completeness + Coding Tabs.Panel + update tests** -- `37af999` (refactor)

## Files Modified

### `src/components/quality/QualityOverviewPage.tsx` (+14, -3)
- Parent `<Tabs value={activeTab} onChange={handleTabChange} keepMounted>` → `<Tabs value={activeTab} onChange={handleTabChange} keepMounted={false}>` (1 value change, no grep-count impact).
- Added 8-line inline comment block above the `<Tabs>` documenting the OR-combine rule and linking to the Mantine source path.
- `<Tabs.Panel value="completeness" pt="md" keepMounted>` → `<Tabs.Panel value="completeness" pt="md">` with 1-line QDDEP-04 comment above it.
- `<Tabs.Panel value="coverage" pt="md" keepMounted>` → `<Tabs.Panel value="coverage" pt="md">` with 1-line QDDEP-04 comment above it.
- 7 other `Tabs.Panel ... keepMounted` props unchanged (counts, validation, plausibility, lab-ranges, duplicates, references, trends).

### `src/__tests__/quality-overview.test.tsx` (+73, -4)
- Added `import * as SamplingModule from '../quality/sampling';` at import block, with a comment explaining the namespace-import + spy rationale.
- Added 3 new `vi.mock()` entries (DuplicatesPanel, ReferencesPanel, TrendsPanel) with a 6-line comment block explaining test-isolation need.
- Rewrote the legacy `'tab panels mount with keepMounted — Completeness (05-03), Coverage (05-04), and Validation (05-05) are all mocked'` test:
  - New name: `'still-keep-mounted tab panels mount on initial render — Validation (05-05) remains keep-mounted after QDDEP-04'`
  - `expect(screen.getByTestId('mock-ValidationPanel')).toBeDefined()` retained (Validation is still keep-mounted).
  - NEW: `expect(screen.queryByTestId('mock-CompletenessPanel')).toBeNull()` (positive assertion of absence).
  - NEW: `expect(screen.queryByTestId('mock-CodingCoveragePanel')).toBeNull()` (positive assertion of absence).
- Added new QDDEP-04 regression test: `'Counts tab cold-open does not fire Completeness or Coding sampling (QDDEP-04)'`
  - Uses `vi.spyOn(SamplingModule, 'sampleResources')` (not `vi.mock`) so the real export is in use and the spy records arguments.
  - Mounts `<QualityOverviewPage />` inside `<MemoryRouter initialEntries={['/quality?tab=counts']}>` to simulate a cold-open on Counts.
  - Awaits two Promise microtasks to give any regression-introduced background effect the chance to fire.
  - Asserts `expect(sampleResourcesSpy).not.toHaveBeenCalled()`.
  - Restores the spy at the end.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug in plan premise] Parent `<Tabs keepMounted>` also required change**
- **Found during:** Task 1 (inspection of Mantine source).
- **Issue:** Plan text (CONTEXT.md D-13 and PLAN.md interfaces section) assumed that dropping `keepMounted` from 2 panels would be sufficient to make those panels unmount when inactive. Inspection of `node_modules/@mantine/core/esm/components/Tabs/TabsPanel/TabsPanel.mjs:24` showed the OR-combine rule: `content = ctx.keepMounted || keepMounted ? children : active ? children : null`. With Mantine's default `keepMounted: true` on the parent `<Tabs>`, every child panel stays mounted regardless of its own prop.
- **Fix:** Flipped the parent to `keepMounted={false}` in the same commit. The 7 panels that should still stay mounted already have an explicit `keepMounted` prop -- so flipping the parent is a no-op for them. Only Completeness + Coding Coverage, which dropped their own prop, now unmount when inactive.
- **Files modified:** src/components/quality/QualityOverviewPage.tsx (1 prop value change on line 400).
- **Commit:** 37af999
- **Acceptance impact:** The plan's `grep -c "keepMounted"` delta-of-exactly-2 criterion is still satisfied (parent keeps the literal `keepMounted` substring; only the 2 panel drops reduce the count).

**2. [Rule 3 - Blocking] New spy test saw 2 background sampleResources calls from DuplicatesPanel / ReferencesPanel**
- **Found during:** Task 2 (first test run after the edits).
- **Issue:** My new `Counts tab cold-open does not fire ... sampling` assertion failed with `expected "sampleResources" to not be called at all, but actually been called 2 times` — both calls were for `resourceType: 'Patient'`. Since Completeness and Coding Coverage panels are now unmounted when Counts is active, the calls had to be from still-keep-mounted real panels. The existing test file mocked Completeness/Coding/Validation/Plausibility/LabRanges but NOT Duplicates, References, or Trends. The real DuplicatesPanel (and/or ReferencesPanel) call sampleResources on mount.
- **Fix:** Added `vi.mock()` entries for DuplicatesPanel, ReferencesPanel, TrendsPanel -- following the exact pattern of the existing Completeness/Coding/Validation/Plausibility/LabRanges mocks. This isolates the spy to the regression subject (Completeness + Coding sampling) without losing coverage (those real panels are tested in their own dedicated test files).
- **Files modified:** src/__tests__/quality-overview.test.tsx (3 new vi.mock() blocks).
- **Commit:** 37af999
- **Acceptance impact:** Enables the new regression assertion to pass. Pre-existing tests that do not rely on these panels (all 17 passing tests) continue to pass.

**3. [Rule 1 - Bug in documentation-comment] Grep count inflated by prose `keepMounted` mentions**
- **Found during:** Task 2 (first grep verification after the edits).
- **Issue:** My initial explanatory comment above the `<Tabs>` contained the word `keepMounted` 5 times (inline code-style references to the prop name). This made `grep -c "keepMounted"` return 15 instead of the required 8 (baseline 10, target 10 − 2 = 8). The plan's acceptance criterion is a literal grep-count delta.
- **Fix:** Tightened the comment to use descriptive English ("parent-level keep-mount flag", "parent flag", "a panel's own prop") that avoids the literal token. Also trimmed per-panel QDDEP-04 comments (from `{/* QDDEP-04: keepMounted dropped -- ... */}` to `{/* QDDEP-04: prop dropped so ... */}`). Final grep count: 8.
- **Files modified:** src/components/quality/QualityOverviewPage.tsx.
- **Commit:** 37af999 (amended into the single atomic commit before staging).

## Test Results

### Before changes (baseline on this worktree, `main @ 2124359`)

```
Test Files  8 failed | 80 passed | 3 skipped (91)
Tests       22 failed | 780 passed | 22 todo (824)
```

### After changes (`main @ 37af999`)

```
Test Files  8 failed | 80 passed | 3 skipped (91)
Tests       22 failed | 781 passed | 22 todo (825)
```

**Delta:**
- **0 new regressions** (same 22 pre-existing failures).
- **+1 passing test** (the new QDDEP-04 spy assertion).
- **+1 total test count** (legacy keepMounted test was rewritten, not deleted, so net test count is +1).

### Targeted run: `src/__tests__/quality-overview.test.tsx`

```
Tests  2 failed | 17 passed (19)
```

The 2 failures (`renders OverviewStrip with Total resources = 370...` and `renders the counts table with Patient and Condition rows...`) were verified as pre-existing by running `git stash && npx vitest run src/__tests__/quality-overview.test.tsx` on the unmodified baseline — same 2 failures, same error signatures.

### TypeScript

```
$ npx tsc -b --noEmit
$ echo $?
0
```

## Verification

### Automated gates

- `grep -c "keepMounted" src/components/quality/QualityOverviewPage.tsx` → **8** (was 10, delta **-2** ✓).
- `grep -c "QDDEP-04" src/components/quality/QualityOverviewPage.tsx` → **3** (plan required ≥2 ✓).
- `grep -c "sampleResourcesSpy\|vi.spyOn.*Sampling" src/__tests__/quality-overview.test.tsx` → **3** (plan required ≥1 ✓).
- `grep -c "does not fire.*sampling\|not.toHaveBeenCalled" src/__tests__/quality-overview.test.tsx` → **2** (plan required ≥1 ✓).
- `npx tsc -b --noEmit` exits 0 ✓.
- Full `npx vitest run`: 22 failed / 781 passed / 22 todo vs. baseline 22 failed / 780 passed / 22 todo ✓.
- `git log -1 --oneline` → `37af999 refactor(25-04): drop keepMounted on Completeness and Coding tabs (QDDEP-04)` matches `refactor\(25-04\).*keepMounted.*QDDEP-04` ✓.

### VALIDATION.md truths

- "Opening `/quality?tab=counts` cold does not fire any `useCompletenessReport` or `useCodingCoverage` sampling" → **Codified by the new vi.spyOn regression test** ✓.
- "On re-entry to the Completeness or Coding tabs, the panel re-mounts but the Phase 24 `QualityMetricsCache` registry supplies cached per-type reports synchronously" → **Semantics preserved by not touching the cache or the hooks; only the mount/unmount surface changed** ✓.
- "Existing quality-overview test at line 232 is updated to reflect the drop; at least one new assertion verifies that Counts-tab cold-open does NOT invoke sampling" → **Old test rewritten (not deleted) + new spy test added** ✓.
- "`grep -c \"keepMounted\" src/components/quality/QualityOverviewPage.tsx` returns exactly (previous count − 2)" → **10 → 8, delta -2** ✓.

## Phase 25 Milestone

Phase 25 (Quality Module Dedup) is **COMPLETE** with all 6 QDDEP requirements delivered:

| Requirement | Plan | Summary |
| ----------- | ---- | ------- |
| QDDEP-01 (perPathExamples) | 25-01 | 25-01-SUMMARY.md |
| QDDEP-02 (DrillDownShell) | 25-03 | 25-03-SUMMARY.md |
| QDDEP-03 (useSampleWalker) | 25-02 (bundled) | 25-02-SUMMARY.md |
| QDDEP-04 (keepMounted drop) | 25-04 | **this SUMMARY** |
| QDDEP-05 (SortableTh) | 25-02 (bundled) | 25-02-SUMMARY.md |
| QDDEP-06 (RunProgress) | 25-02 (bundled) | 25-02-SUMMARY.md |

**Phase 28 (Micro-Consistency Sweep)** is now unblocked per ROADMAP dependency chain.

## Known Stubs

None. This plan removes dead sampling calls; it does not introduce stubs, hardcoded empty values, or placeholder UI.

## Self-Check: PASSED

### Files exist
- `src/components/quality/QualityOverviewPage.tsx` — FOUND ✓
- `src/__tests__/quality-overview.test.tsx` — FOUND ✓

### Commit exists
- `37af999 refactor(25-04): drop keepMounted on Completeness and Coding tabs (QDDEP-04)` — FOUND ✓

### Acceptance criteria verified
- `grep -c keepMounted` = 8 (baseline 10, delta -2) ✓
- `grep -c QDDEP-04` ≥ 2 → 3 ✓
- New spy assertion using `vi.spyOn(SamplingModule, 'sampleResources')` + `.not.toHaveBeenCalled()` ✓
- `npx tsc -b --noEmit` exits 0 ✓
- Full suite: 22 failed / 781 passed / 22 todo (0 new regressions vs. 22/780/22 baseline) ✓
