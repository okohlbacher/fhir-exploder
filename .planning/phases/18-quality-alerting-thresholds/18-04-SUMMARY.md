---
phase: 18-quality-alerting-thresholds
plan: 04
subsystem: quality-alerting
tags: [ui, mantine, dashboard, OverviewStrip, tabs, react-router, useSearchParams, useThresholds]

# Dependency graph
requires:
  - phase: 18-01 (thresholds foundation — MetricKey, METRIC_LABELS, METRIC_ROUTES, useThresholds)
  - phase: 18-02 (extended QualityMetricsContext — 7 overall* values)
  - phase: 18-03 (extended SummaryCard — breached/threshold/onClick/ariaLabel props)
provides:
  - 9-tile OverviewStrip wired to context + threshold breach detection + click-to-tab navigation
  - Controlled `<Tabs>` reading/writing the `?tab=` search param so OverviewStrip clicks land on the correct panel
  - 7 new tests under "OverviewStrip 9-tile expansion (DQ-12 / Plan 18-04)" describe block
affects: [Phase 18 closes here — no downstream Plan 05 in this phase]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Controlled Mantine Tabs bound to react-router-dom useSearchParams (replaceState pattern)"
    - "Defensive query-param validation against a static Set<string> with fall-through to a documented default"
    - "Hoisted test harness pattern: ContextFillerHarness + renderStrip moved from one describe to module scope so multiple describes can share them"
    - "Switch-statement metric-value resolver inside OverviewStrip (typed exhaustively against MetricKey union — TS narrows the return correctly)"

key-files:
  created: []
  modified:
    - src/components/quality/OverviewStrip.tsx
    - src/components/quality/QualityOverviewPage.tsx
    - src/__tests__/quality-overview.test.tsx

key-decisions:
  - "OverviewStrip stays propless for metrics — value/threshold/breach are pulled from context and useThresholds hook, NOT threaded through OverviewStripProps. OverviewStripProps remains the original 2-member shape (summary + isLoading)."
  - "The threshold prop passed to SummaryCard is gated on `breached === true` AND `threshold !== null` — when the user explicitly disables a metric (storedThreshold === null), no threshold annotation is rendered even if value would otherwise be below the (now-disabled) limit."
  - "Test file extends the existing `vi.mock('react-router-dom')` — does NOT add a duplicate mock call (Vitest forbids double-mocking a single module)."
  - "QUAL-01 'renders OverviewStrip with Total resources = 370' test updated: getByText('Overall completeness') replaced with getAllByText('Completeness') because the new label collides with the Tabs.Tab label."
  - "useNavigate path uses raw template string `/quality?tab=${tabRoute}`. METRIC_ROUTES.labRanges = 'lab-ranges' (hyphenated) so the URL stays kebab-case for the lab-ranges tab."

patterns-established:
  - "9-tile responsive grid: SimpleGrid cols={{ base: 1, xs: 2, sm: 3, md: 4, lg: 5, xl: 9 }} spacing='sm' — collapses gracefully on narrow viewports without tile clipping"
  - "Controlled Tabs via useSearchParams: tabParam validated against a Set; setSearchParams(next, { replace: true }) so tile-click chains don't pollute browser history"
  - "Hoisted ContextFillerHarness pattern lets multiple describes seed QualityMetricsContext through the same setter API used by real panels"

requirements-completed:
  - DQ-12

# Metrics
duration: ~6 min
completed: 2026-04-14
---

# Phase 18 Plan 04: OverviewStrip 9-Tile Expansion + Controlled Tabs Summary

**Closes DQ-12. The /quality landing page now visually flags every metric whose overall score breaches its configured threshold (red ring + red value + `threshold: N%` annotation) and lets the user jump straight from a breached tile into the panel showing the underlying data via deep-linked `?tab=<route>` URLs.**

## Performance

- **Duration:** ~6 min
- **Started:** 2026-04-14T11:21:20Z
- **Completed:** 2026-04-14T11:27:24Z
- **Tasks:** 3/3
- **Files modified:** 3
- **Files created:** 0
- **Tests:** 7 new (all under "OverviewStrip 9-tile expansion (DQ-12 / Plan 18-04)") + 1 QUAL-01 test updated

## Accomplishments

### OverviewStrip — 4 tiles to 9 tiles

Replaced the v1.0 4-tile strip with a 9-tile breach-aware strip per UI-SPEC Layout Contract:

```
[Total resources] [Resource types] [Completeness] [Coding coverage] [Validation]
[Plausibility]    [Lab ranges]     [Duplicates]   [References]
```

- **Tiles 1-2 (Total resources, Resource types):** informational, fed by the existing `summary` prop, NOT clickable (no `onClick` passed → SummaryCard renders a plain Card, not a button).
- **Tiles 3-9 (the 7 metric tiles):** each pulls its value from `useQualityMetrics()` via a `metricValueOf(key)` switch, its threshold from `useThresholds().getActiveThreshold(key)`, computes breach via `useThresholds().isBreached(key, value)`, and routes click via `useNavigate()` to `/quality?tab=${METRIC_ROUTES[key]}`.
- Loading state renders 9 Skeletons instead of 4.
- Responsive grid: `cols={{ base: 1, xs: 2, sm: 3, md: 4, lg: 5, xl: 9 }} spacing="sm"` — single column on mobile, full row on xl viewports.

### QualityOverviewPage — uncontrolled to controlled Tabs

Per Pitfall 5 in 18-RESEARCH.md: an uncontrolled `<Tabs defaultValue="counts">` ignores URL changes after mount. Converted to a fully controlled component bound to `useSearchParams()`:

- New `VALID_TABS = new Set([...])` with the 8 known tab values; `DEFAULT_TAB = 'counts'`.
- `activeTab = tabParam && VALID_TABS.has(tabParam as never) ? tabParam : DEFAULT_TAB` — defensive fall-through to Counts for missing or invalid `?tab=` values (no Mantine orphan-value warning, no crash).
- `handleTabChange(value)` writes back via `setSearchParams(next, { replace: true })` — tile-click chains don't pollute browser history (per T-18-04-03 mitigation).
- All 8 `<Tabs.Tab>` + `<Tabs.Panel>` pairs unchanged — only the parent `<Tabs>` element gained `value` + `onChange` and lost `defaultValue`.

### Test coverage — 7 new assertions for DQ-12 truths

Appended a new describe block "OverviewStrip 9-tile expansion (DQ-12 / Plan 18-04)" covering all 4 VALIDATION matrix rows for OverviewStrip:

1. **Renders exactly 9 SummaryCard tiles** when context is fully populated.
2. **Renders em-dash for undefined metrics** (>=5 dashes when 5 of 7 metrics unset).
3. **Renders 7 metric labels** per METRIC_LABELS plus 2 informational tiles.
4. **Marks Completeness tile as breached** when value (72) < default threshold (80) — asserts the `threshold: 80%` annotation appears.
5. **Clicking a metric tile** calls `navigate('/quality?tab=completeness')` via the `mockNavigate` spy.
6. **Initial entry `/quality?tab=duplicates`** activates Duplicates tab on first paint via `aria-selected="true"`.
7. **Invalid `?tab=bogus`** falls back to Counts tab (defensive validation).

## Task Commits

Each task committed atomically with `--no-verify` per parallel-executor convention:

1. **Task 1 — `15c0403`** — `feat(18-04): expand OverviewStrip to 9 breach-aware metric tiles`
2. **Task 2 — `7b07c20`** — `feat(18-04): convert QualityOverviewPage Tabs to controlled ?tab= search param`
3. **Task 3 — `7d734bb`** — `test(18-04): extend quality-overview.test.tsx with 9-tile + breach + tab-from-URL coverage`

## Files Modified

### `src/components/quality/OverviewStrip.tsx` — full rewrite
- **Before:** 70 lines, 4 tiles, only completeness + coverage from context.
- **After:** 146 lines, 9 tiles, all 7 metrics from extended context + useThresholds hook.
- New imports: `IconClipboardCheck`, `IconCopy`, `IconLink`, `IconMicroscope`, `IconShieldCheck` from `@tabler/icons-react`; `useNavigate` from `react-router-dom`; `useThresholds` from `../../hooks/useThresholds`; `METRIC_LABELS`, `METRIC_ROUTES`, `MetricKey` type from `../../quality/thresholds`.
- Loading skeleton expanded from 4 → 9 Skeletons.
- Grid spacing changed `md` → `sm` per UI-SPEC line 47 (8px tile gap).

### `src/components/quality/QualityOverviewPage.tsx` — minimal additive edits (172 lines, +28 lines)
- Added `useSearchParams` to existing `react-router-dom` import.
- Added `VALID_TABS` Set + `DEFAULT_TAB` constant near top of file.
- Inside the component: added `const [searchParams, setSearchParams] = useSearchParams();`, `tabParam`, `activeTab`, `handleTabChange` (8 lines).
- Replaced `<Tabs defaultValue="counts" keepMounted>` with `<Tabs value={activeTab} onChange={handleTabChange} keepMounted>`.

### `src/__tests__/quality-overview.test.tsx` — additive extension (479 lines, +201 lines)
- Extended existing `vi.mock('react-router-dom', ...)` to also expose `useNavigate: () => mockNavigate` (no duplicate mock — added inside the existing factory).
- Added `mockNavigate.mockReset()` + `window.localStorage.clear()` to the existing `beforeEach`.
- Updated QUAL-01 "renders OverviewStrip with Total resources = 370" test: replaced `getByText('Overall completeness')` with `getAllByText('Completeness').length >= 1` because the SummaryCard label now collides with the Tabs.Tab label.
- Hoisted `ContextFillerHarness` and `renderStrip` from the "context consumption" describe to module scope; both extended to accept all 7 optional metric props.
- `ContextFillerHarness` `duplicates` prop is documented as a convenience shorthand — it seeds `duplicatesBreakdown.patient` via `setDuplicatesContribution({ patient: duplicates })` so single-component scenarios get `overallDuplicates === duplicates` exactly.
- Appended new describe block "OverviewStrip 9-tile expansion (DQ-12 / Plan 18-04)" with 7 tests (see Test coverage above).

## Decisions Made

- **Kept OverviewStripProps at 2 members (summary + isLoading).** Plan 03's pattern note suggested this: metric values flow through context, not props — so adding metric tiles doesn't require threading values through every parent. Future tile additions stay O(1) in props, O(n) in context wiring.
- **Defensive validation against `Set<string>` cast as never.** `VALID_TABS.has(tabParam as never)` is the TypeScript-idiomatic way to use a const-asserted set as a runtime guard while preserving compile-time exhaustiveness checks. Tried `as typeof DEFAULT_TAB` first — got worse error messages.
- **Tile click uses raw template string `/quality?tab=${tabRoute}`.** Considered `useSearchParams().setSearchParams({ tab })` from within OverviewStrip (no navigate needed since we're already on /quality), but that creates a tighter coupling between OverviewStrip and the route shape. Using `navigate()` keeps OverviewStrip route-agnostic and lets the deep-link pattern work even from other pages in the future.
- **Hoisted test harness rather than nested helper.** The new "9-tile expansion" describe needed `renderStrip` AND the extended `ContextFillerHarness`. Keeping them inside the "context consumption" describe would have forced either duplication or weird nesting. Module-scope helpers are the cleanest pattern.
- **threshold prop only passed when breached AND threshold !== null.** Reading carefully: `getActiveThreshold(key)` returns `number | null` (null = explicitly disabled). When disabled, `isBreached` returns false (correctly), so `breached === false` and the threshold annotation never renders. But to be safe (defense in depth) the OverviewStrip explicitly gates the prop on both conditions before passing it to SummaryCard.
- **Updated QUAL-01 test rather than reverting label change.** UI-SPEC mandates "Completeness" / "Coding coverage" / etc. as the SummaryCard labels (removing the redundant "Overall " prefix). The original "Overall completeness" was a v1.0 label tied to a 4-tile world. Reverting would violate UI-SPEC and force ugly compromises. Updating the test to use `getAllByText` (which honors that the same label appears in both the tile AND the tab) is the principled fix.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] QUAL-01 "renders OverviewStrip with Total resources" test would fail with new labels**
- **Found during:** Task 3 verification (`npx vitest run src/__tests__/quality-overview.test.tsx`)
- **Issue:** The QUAL-01 test asserted `screen.getByText('Overall completeness')` and `screen.getByText('Overall coding coverage')`. Both labels were removed by Task 1's OverviewStrip rewrite (per UI-SPEC); replaced with `Completeness` and `Coding coverage`. Additionally, "Completeness" now appears in BOTH the SummaryCard label AND the Tabs.Tab label, so a naive `getByText('Completeness')` throws "Found multiple elements".
- **Fix:** Updated the test to use `getAllByText('Completeness').length >= 1` (acknowledging both occurrences are valid) and kept `getByText('Coding coverage')` since the Tab uses different casing ("Coding Coverage" with capital W).
- **Files modified:** `src/__tests__/quality-overview.test.tsx`
- **Commit:** `7d734bb` (batched with Task 3 test extension)
- **Verification:** `npx vitest run src/__tests__/quality-overview.test.tsx` — 17/18 pass after fix (vs. 16/18 before).

### Out-of-scope discoveries (logged, NOT fixed)

**1. [Scope Boundary] Pre-existing `quality-overview.test.tsx > QualityOverviewPage (QUAL-01) > renders the counts table with Patient and Condition rows, and a loading spinner for Observation` flake**
- **Found during:** Task 3 verification.
- **Issue:** `screen.getByRole('link', { name: 'Observation' })` cannot find a link with that accessible name. 1 of 18 quality-overview tests fails.
- **Verification that it's pre-existing:** Already documented in `.planning/phases/18-quality-alerting-thresholds/deferred-items.md` under "Pre-existing quality-overview test failure (discovered during 18-03)" — confirmed via `git stash` roundtrip on base commit `7b6d681` BEFORE any Plan 18 changes.
- **Not fixed** per Scope Boundary rule — unrelated to OverviewStrip / Tabs / SummaryCard.
- **Logged to:** `.planning/phases/18-quality-alerting-thresholds/deferred-items.md` (already there — no new entry needed).

**2. [Scope Boundary] Pre-existing TS2352 errors in `profileConformanceChecker.ts` and `temporalPlausibilityWalker.ts`**
- **Found during:** Task 1 verification (`npx tsc --noEmit -p tsconfig.app.json`).
- **Issue:** 7 TS2352 errors (Resource → Record<string, unknown> unsafe casts) in unrelated quality walker files.
- **Verification that they're pre-existing:** Already documented in `deferred-items.md` as DEBT-03 from Plan 18-01. Same errors observed before any Plan 18-04 changes.
- **Not fixed** per Scope Boundary rule.

---

**Total deviations:** 1 auto-fix (Rule 3 — test labels updated to match new UI); 2 out-of-scope logged (not fixed, both already documented).
**Impact on plan:** Zero — all DQ-12 acceptance criteria met, 7/7 new tests pass, all 28 Plan 18-02 panel tests + all 19 Plan 18-03 SummaryCard/ThresholdsPage tests still pass.

## Issues Encountered

- **`Found multiple elements with text: "Completeness"`** when running the existing QUAL-01 test against the new OverviewStrip. Cause: the SummaryCard label "Completeness" now matches the Tabs.Tab label "Completeness" exactly. Fix: switched to `getAllByText` for "Completeness" specifically; left `getByText('Coding coverage')` alone because the Tab uses different casing.
- **No new infrastructure issues.** No Mantine portal weirdness this time (the click-navigation test uses a mocked `useNavigate` spy rather than asserting on real router state, which sidesteps the portal/transition edge cases that bit Plan 18-03).

## Known Stubs

None. `grep -E "(TODO|FIXME|placeholder|coming soon|not available)"` on all 3 modified files returns zero matches.

## Threat Flags

None. All 7 STRIDE threats from the plan's `<threat_model>` are mitigated as planned:

- **T-18-04-01 (Tampering, ?tab= search param):** mitigated via `VALID_TABS` Set check in QualityOverviewPage. Invalid values fall through to `DEFAULT_TAB = 'counts'`. No raw param flows into render or navigation.
- **T-18-04-03 (DoS, history flooding):** mitigated via `setSearchParams(next, { replace: true })` — tab clicks use replaceState.
- **T-18-04-05 (XSS via labels):** mitigated — METRIC_LABELS is a static const, React auto-escapes all string interpolation in JSX, no `dangerouslySetInnerHTML` introduced.
- **T-18-04-02, -04, -06, -07:** accepted per plan rationale (local-first tool, no PHI in thresholds, read-only route, no auth boundary in /quality).

No new attack surface introduced. ASVS L1 baseline maintained.

## User Setup Required

None. All changes are client-only; no env vars, no external services, no migrations. Users navigating to `/quality?tab=duplicates` see the Duplicates tab activated immediately. Users clicking a tile see both the URL change and the tab switch atomically (single React commit).

## Next Phase Readiness

Phase 18 closes here. No Plan 05 in this phase. Downstream work:

- **18-VERIFICATION** can run end-to-end against the full feature: visit `/quality/thresholds` (Plan 03), set Completeness threshold to 99, return to `/quality` (Plan 04), verify the Completeness tile turns red with `threshold: 99%` annotation, click the tile, verify the Completeness tab is selected. All four UAT scenarios in 18-HUMAN-UAT.md are now executable.
- **Phase 19 (future)** can add per-type drill-down (e.g., showing the Duplicates breakdown table), trend graphs, or PDF export. The OverviewStrip 9-tile shape + controlled Tabs pattern + isBreached/getActiveThreshold contract are stable foundations to build on.

## Self-Check: PASSED

- `src/components/quality/OverviewStrip.tsx` — MODIFIED (146 lines, was 70). Contains: `useThresholds` (1), `useNavigate` (1), `METRIC_ORDER` (1), `length: 9` Skeletons (1), `navigate(`/quality?tab=` (1), `breached={breached}` (1).
- `src/components/quality/QualityOverviewPage.tsx` — MODIFIED (172 lines, +28 from base). Contains: `useSearchParams` (1 import + 1 use), `VALID_TABS` (1), `DEFAULT_TAB` (1), `value={activeTab}` (1), `replace: true` (1), no `defaultValue=` (0).
- `src/__tests__/quality-overview.test.tsx` — MODIFIED (479 lines, +201 from base). Contains: `mockNavigate` defined (1), `vi.mock('react-router-dom'` (1 — single occurrence per Vitest constraint), 7 new `it(` blocks under "OverviewStrip 9-tile expansion (DQ-12 / Plan 18-04)".
- Commit `15c0403` (Task 1) — FOUND
- Commit `7b07c20` (Task 2) — FOUND
- Commit `7d734bb` (Task 3) — FOUND
- `npx vitest run src/__tests__/quality-overview.test.tsx` — 17/18 pass (1 pre-existing flake — DEBT-04 in deferred-items.md)
- `npx vitest run src/__tests__/thresholds.test.ts src/__tests__/summary-card.test.tsx src/__tests__/thresholds-page.test.tsx src/__tests__/quality-overview.test.tsx` — 48/49 pass (same pre-existing flake)
- `npx vitest run src/__tests__/lab-ranges-panel.test.tsx src/__tests__/references-panel.test.tsx src/__tests__/plausibility-panel.test.tsx src/__tests__/duplicates-panel.test.tsx src/__tests__/validation-panel.test.tsx` — 28/28 pass (no Plan 18-02 regressions)
- `npx tsc -b` — zero new errors in 18-04 files (pre-existing errors in unrelated profileConformanceChecker / temporalPlausibilityWalker files logged to deferred-items.md as DEBT-03)
- `grep -cE "vi.mock\\('react-router-dom'" src/__tests__/quality-overview.test.tsx` — 1 (no duplicate mock)
- `grep -cE "^\s*it\('|^\s*it\(\"" src/__tests__/quality-overview.test.tsx` — 18 total `it(...)` blocks (was 11; +7 new from Plan 18-04)
- `grep -E "(TODO|FIXME|placeholder|coming soon|not available)" src/components/quality/OverviewStrip.tsx src/components/quality/QualityOverviewPage.tsx src/__tests__/quality-overview.test.tsx` — 0 matches

---
*Phase: 18-quality-alerting-thresholds*
*Plan: 04*
*Completed: 2026-04-14*
