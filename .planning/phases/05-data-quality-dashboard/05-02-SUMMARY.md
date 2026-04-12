---
phase: 05-data-quality-dashboard
plan: 02
subsystem: quality-dashboard-ui
tags: [quality, counts, overview, dashboard-ui, tdd]

requires:
  - phase: 05-data-quality-dashboard
    plan: 01
    provides: QualityOutletContext, QualityMetricsContext (setCompleteness/setCoverage), SampleSizeControl, CountValue type, three stub components
  - phase: 02-resource-explorer
    provides: useResourceCounts hook (reused verbatim, no re-implementation)
  - phase: 01-foundation-blaze-connectivity
    provides: parseResourceTypes, CapabilityStatement structure, worker-pool counts pattern

provides:
  - src/quality/counts.ts — summarizeCounts + sortCounts pure helpers
  - src/hooks/useQualityMetrics.ts — orchestration hook with recompute() + lastComputed
  - src/components/quality/SummaryCard.tsx — tile primitive with optional RingProgress
  - src/components/quality/OverviewStrip.tsx — 4-card SimpleGrid, cards 3-4 consume QualityMetricsContext
  - src/components/quality/ResourceCountsPanel.tsx — sortable Table with inline Progress bars
  - src/components/quality/QualityOverviewPage.tsx — real page (overwrites Plan 01 stub)
  - src/components/quality/CompletenessPanel.tsx (stub for Plan 05-03)
  - src/components/quality/CodingCoveragePanel.tsx (stub for Plan 05-04)
  - src/components/quality/ValidationPanel.tsx (stub for Plan 05-05)

affects: [05-03-completeness, 05-04-coverage, 05-05-validation]

tech-stack:
  added: []
  patterns:
    - "Version-key sort trick: recompute() toggles a version counter; `types.join(',')` changes on odd versions via array reversal so the underlying useResourceCounts effect refires without structural changes"
    - "Context-fed summary cards: OverviewStripProps has EXACTLY two members (summary, isLoading); cards 3-4 pull overallCompleteness/overallCoverage from QualityMetricsContext — em-dash is the empty state, not the permanent state"
    - "keepMounted tab pattern (reused from Phase 3 MiiModuleTabs): root Tabs + every Tabs.Panel carry keepMounted so switching tabs doesn't remount panels or refetch data"
    - "Sortable table headers: plain column headers wrap an UnstyledButton + icon; aria-sort attribute on each Th reflects current sort state (ascending/descending/none)"
    - "Non-numeric counts always sort to end: sortCounts enforces typeof === 'number' gate so a tampered Bundle.total cannot distort numeric ordering"

key-files:
  created:
    - src/quality/counts.ts
    - src/hooks/useQualityMetrics.ts
    - src/components/quality/SummaryCard.tsx
    - src/components/quality/OverviewStrip.tsx
    - src/components/quality/ResourceCountsPanel.tsx
    - src/components/quality/CompletenessPanel.tsx (stub)
    - src/components/quality/CodingCoveragePanel.tsx (stub)
    - src/components/quality/ValidationPanel.tsx (stub)
    - .planning/phases/05-data-quality-dashboard/deferred-items.md
  modified:
    - src/components/quality/QualityOverviewPage.tsx (replaced Plan 01 stub with real implementation)
    - src/__tests__/quality-counts.test.ts (stub → 14 real tests)
    - src/__tests__/quality-overview.test.tsx (stub → 11 real tests + context regression guard)
    - src/__tests__/coding-coverage-panel.test.tsx (removed unused @ts-expect-error)
    - src/__tests__/validation-panel.test.tsx (removed unused @ts-expect-error)

key-decisions:
  - "useQualityMetrics.recompute() uses an array-reversal trick to force useResourceCounts to refire. Rationale: useResourceCounts keys its useEffect on `resourceTypes.join(',')` (content, not identity). Reversing the array on odd versions changes the join string deterministically, and since useResourceCounts indexes results by type name (not order), counts remain correct."
  - "OverviewStripProps intentionally exposes only { summary, isLoading }. Cards 3-4 pull overallCompleteness/overallCoverage from QualityMetricsContext — NOT from props. This locks the Plan 03/04 plumbing: as long as their hooks call setCompleteness/setCoverage, cards 3-4 flip from em-dash to live percentages automatically."
  - "Non-numeric CountValue entries ('loading'/'error') always sort to the END of the counts table regardless of direction. Rationale: settled rows are what users want to see — stale/errored rows pushed to the bottom improve at-a-glance scanability."
  - "includeEmpty defaults to FALSE in ResourceCountsPanel. Matches Phase 3 D-09 'hide zero-count rows by default' principle — opt-in reveal via the 'Show empty types' Switch."
  - "Three Wave 2 placeholder panels (CompletenessPanel / CodingCoveragePanel / ValidationPanel) carry stable prop signatures with `// STUB: replaced in Wave 2 Plan 05-0X` headers, letting Plans 03/04/05 overwrite them without touching QualityOverviewPage."

patterns-established:
  - "Stateful sort for Mantine Table: useState for sortKey + sortDir, useMemo-derived rows, aria-sort on Th, UnstyledButton-wrapped header labels with directional arrows."
  - "Context rendezvous: producer hooks (Plans 03/04) setX; consumer component (OverviewStrip) readsX via useQualityMetrics() from the context file. No prop-drilling across nested routes."

requirements-completed: [QUAL-01]

duration: 6min
completed: 2026-04-12
---

# Phase 05 Plan 02: Resource Counts + Overview Strip Summary

**/quality now renders a real dashboard — Title, toolbar with sample-size + Last-computed + Recompute, 4-card OverviewStrip (live totals + em-dash placeholders for Plans 03/04), and a sortable Counts tab with per-row Progress bars and "Show empty types" toggle. Tabs shell ready for Plans 03/04/05 to drop in their panels without editing this file again.**

## Performance

- **Duration:** ~6 min
- **Started:** 2026-04-12T09:16:01Z
- **Completed:** 2026-04-12T09:22:46Z
- **Tasks:** 2 (both auto, both TDD-style)
- **Files modified:** 14 (8 created + 5 modified + 1 deferred-items)

## Accomplishments

- `/quality` renders a real data-quality dashboard, no longer a stub. Users see real totals (sum of per-type counts) and real type counts (count of types with count > 0) flowing from useResourceCounts through summarizeCounts into OverviewStrip.
- Counts tab shows a sortable table of every CapabilityStatement-declared resource type with its count and an inline `<Progress>` bar scaled to the largest count. Clicking headers toggles sort; "Show empty types" Switch reveals zero-count rows.
- Recompute metrics button forces useResourceCounts to re-run (via the version-keyed array-reversal trick) and fires an immediate Mantine notification.
- OverviewStrip cards 3-4 consume `overallCompleteness` / `overallCoverage` from QualityMetricsContext. Plans 03/04 only need to call `setCompleteness(n)` / `setCoverage(n)` in their hooks — cards flip from em-dash to live percentages automatically.
- Tabs shell is ready: Completeness, Coding Coverage, and Validation panels render stub placeholders with stable prop signatures (`{ types, client, sampleSize }` for the first two; `{ client, sampleSize }` for validation). Plans 03/04/05 overwrite those files without touching QualityOverviewPage.
- 25 new tests (14 counts + 11 overview/strip) all passing.

## Task Commits

Each task was committed atomically:

1. **Task 1: counts aggregator + useQualityMetrics orchestrator** — `68d98b3` (feat)
2. **Task 2: QualityOverviewPage + OverviewStrip + Counts tab** — `139ad8d` (feat)

## Contracts Exported (for Plans 03/04/05 consumption)

From `src/quality/counts.ts`:
- `summarizeCounts(counts: Record<string, CountValue>) → CountSummary` — `{ total, typeCount, loadingCount, errorCount }`. Numeric 0 excluded from typeCount. Loading/error excluded from total.
- `sortCounts(counts, by: 'count'|'name', direction: 'asc'|'desc', includeEmpty=false) → CountRow[]` — non-numeric values always sort to the end.
- Types: `CountSummary`, `CountRow`

From `src/hooks/useQualityMetrics.ts`:
- `useQualityMetrics(client, types) → { counts, summary, lastComputed, recompute, version }`
- `counts` === `useResourceCounts` output verbatim
- `summary` === `summarizeCounts(counts)`
- `lastComputed` transitions to `new Date()` on the first render where all counts have settled (no 'loading')
- `recompute()` clears `lastComputed` to null and bumps `version` to re-fire useResourceCounts

From `src/components/quality/OverviewStrip.tsx`:
- `OverviewStripProps = { summary: CountSummary; isLoading: boolean }` — EXACTLY two members. Cards 3-4 are NOT props; they come from QualityMetricsContext.

From `src/components/quality/SummaryCard.tsx`:
- `SummaryCardProps = { label, value, icon, ringValue?, subtitle? }`

## Stubs Awaiting Replacement (Plans 03/04/05)

| Stub path | Replaced by | Prop signature |
|-----------|-------------|----------------|
| `src/components/quality/CompletenessPanel.tsx` | Plan 05-03 | `{ types: string[]; client: MedplumClient; sampleSize: number }` |
| `src/components/quality/CodingCoveragePanel.tsx` | Plan 05-04 | `{ types: string[]; client: MedplumClient; sampleSize: number }` |
| `src/components/quality/ValidationPanel.tsx` | Plan 05-05 | `{ client: MedplumClient; sampleSize: number }` |

Each stub carries a `// STUB: replaced in Wave 2 Plan 05-0X` header comment and a `data-testid="stub-{Name}"` on the rendered Text so Wave 2 tests can distinguish stub-present vs Wave 2-landed state. Plans 03/04/05 MUST preserve these exact prop signatures — QualityOverviewPage uses them directly and must NOT need to be edited again.

## OverviewStrip Context Wiring (for Plans 03/04)

OverviewStrip cards 3-4 consume QualityMetricsContext:

```typescript
const { overallCompleteness, overallCoverage } = useQualityMetrics();
```

When both are `undefined` (initial state), cards render an em-dash `—`. When Plans 03/04 hooks complete their per-type aggregation, they MUST call:

```typescript
const { setCompleteness } = useQualityMetrics(); // from '../quality/QualityMetricsContext'
setCompleteness(Math.round(arithmetic_mean_of_populated_over_total_across_settled_types));
```

Same shape for `setCoverage`. Rollup rule is the arithmetic mean locked in 05-01-SUMMARY (equal-weight per type, excluding loading/errored/`total===0` types). A regression test in `quality-overview.test.tsx` proves that calling the setters flips the cards from em-dash to "72%" / "84%".

## Decisions Made

- **Recompute trick via array reversal:** `useResourceCounts` keys its effect on `resourceTypes.join(',')`. To force a re-run without changing the type set, `useQualityMetrics` reverses the array on odd versions — the join string changes, effect refires, counts indexed by name remain correct. Documented inline in the hook.
- **OverviewStripProps minimal surface (2 members only):** Locking the two-member contract prevents future plans from drilling completeness/coverage through props. All rollup values flow through QualityMetricsContext. Regression-guarded by a test that renders OverviewStrip both with and without provider state.
- **Non-numeric counts always sort to end:** In `sortCounts`, a `typeof === 'number'` gate ensures 'loading'/'error' rows appear at the bottom regardless of sort direction. Matches the Phase 1 Dashboard count-list ethos (settled rows first).
- **includeEmpty defaults false:** Mirrors Phase 3 D-09 hide-zero-rows default; opt-in via Switch.
- **Stubs carry exact future prop signatures:** Plans 03/04/05 can land without editing QualityOverviewPage.

## Deviations from Plan

**[Rule 3 - blocking issue] Removed now-unused `@ts-expect-error` pragmas from `coding-coverage-panel.test.tsx` and `validation-panel.test.tsx`.**
- **Found during:** Task 2
- **Issue:** After creating the stubs at `CodingCoveragePanel.tsx` and `ValidationPanel.tsx`, the existing Wave 0 test scaffolds that had `@ts-expect-error` on their imports started failing `tsc -p tsconfig.app.json` with TS2578 "Unused '@ts-expect-error' directive".
- **Fix:** Replaced the two `@ts-expect-error` pragmas with comments explaining that the stub now exists and Plans 04/05 will overwrite it with the real component. The `it.todo` cases remain untouched for Plans 04/05 to expand.
- **Files modified:** `src/__tests__/coding-coverage-panel.test.tsx`, `src/__tests__/validation-panel.test.tsx`
- **Commit:** `139ad8d`

## Issues Encountered / Deferred

- `npm run build` (which invokes `tsc -b`) fails on several PRE-EXISTING errors unrelated to Plan 05-02 (`SearchResultsPage.tsx`, `ResourceDetailPage.tsx`, `FhirResourcesView.tsx`, and three older test files). Verified by `git stash` + `npm run build` reproducing the same errors at the previous commit. Documented in `.planning/phases/05-data-quality-dashboard/deferred-items.md` for a future cleanup pass. The plan's stated acceptance criterion `npx tsc --noEmit -p .` (root tsconfig with project references but no `-b`) exits 0 — Plan 05-02's own code is clean.

## User Setup Required

None. Code-only changes; /quality is already mounted via Plan 01's routing. Connect to a FHIR server via the Dashboard, then navigate to "Quality" in the sidebar.

## Verification

- `npm test -- src/__tests__/quality-counts.test.ts` → 14 passing, 0 todo, exit 0
- `npm test -- src/__tests__/quality-overview.test.tsx` → 11 passing, 0 todo, exit 0
- `npm test` (full suite) → 197 passed, 31 todo, 5 files failing — all 5 failures are Wave 0 failing-test harness tests pointing at Plans 03/04/05 target modules (completenessWalker, useCompletenessReport, codingCoverageWalker, structuralValidator, remoteValidator). Zero regressions in Phase 1-4 tests or in Plan 01 tests.
- `npx tsc --noEmit -p .` → exit 0
- `grep "it.todo" src/__tests__/quality-counts.test.ts src/__tests__/quality-overview.test.tsx` → 0 matches
- `grep -c "keepMounted" src/components/quality/QualityOverviewPage.tsx` → 6 (Tabs root + 4 Panels + default)
- `grep "IconDatabase|IconListDetails|IconCircleCheck|IconLanguage" src/components/quality/OverviewStrip.tsx` → all 4 icons per UI-SPEC
- `grep "aria-sort" src/components/quality/ResourceCountsPanel.tsx` → 2 matches (one per sortable column)
- UI-SPEC copy strings present verbatim: "Data Quality", "Total resources", "Resource types", "Overall completeness", "Overall coding coverage", "Last computed", "Recompute metrics", "Show empty types"

## Self-Check: PASSED

Files verified present:
- src/quality/counts.ts — FOUND
- src/hooks/useQualityMetrics.ts — FOUND
- src/components/quality/SummaryCard.tsx — FOUND
- src/components/quality/OverviewStrip.tsx — FOUND
- src/components/quality/ResourceCountsPanel.tsx — FOUND
- src/components/quality/QualityOverviewPage.tsx — FOUND (stub replaced)
- src/components/quality/CompletenessPanel.tsx — FOUND (stub)
- src/components/quality/CodingCoveragePanel.tsx — FOUND (stub)
- src/components/quality/ValidationPanel.tsx — FOUND (stub)

Commits verified on branch main:
- 68d98b3 — Task 1 (counts + useQualityMetrics)
- 139ad8d — Task 2 (UI components + overview page + tests)
