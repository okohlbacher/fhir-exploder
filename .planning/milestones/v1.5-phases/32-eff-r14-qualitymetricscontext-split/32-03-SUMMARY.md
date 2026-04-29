---
phase: 32-eff-r14-qualitymetricscontext-split
plan: 03
subsystem: ui
tags: react, context, migration, refactor, performance, quality-metrics

# Dependency graph
requires:
  - phase: 32-eff-r14-qualitymetricscontext-split
    provides: 7 per-metric contexts (CompletenessContext..DuplicatesContext) + facade composition (Plans 32-01 + 32-02)
provides:
  - All 7 producer sites push through their specific use<Metric>Rollup() hook (EFF-R14-05 closed)
  - OverviewStrip decomposed into 7 <MetricTile metricKey={k} /> children, each subscribing to exactly ONE per-metric context
  - QualityOverviewPage tab labels (lines 444-462) subscribe per-metric; facade preserved at :204 for capture/export bulk reads
  - MetricTile.tsx leaf components ready for Plan 32-04 per-tile <Profiler> isolation assertion (EFF-R14-04 consumer split landed)
affects:
  - 32-04 (Profiler-based per-tile render-isolation test)
  - Future per-metric features that need single-context subscription

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Per-tile component boundary for render isolation (one hook per leaf component, dispatcher routes by stable prop)"
    - "Local destructure-rename ({ set: setX } = useXRollup()) preserves identifier names so producer migrations stay one-line"
    - "Facade + per-metric hooks coexist in QualityOverviewPage — facade for bulk-read handlers, per-metric for tab labels"

key-files:
  created:
    - "src/components/quality/MetricTile.tsx"
  modified:
    - "src/hooks/useCompletenessReport.ts"
    - "src/hooks/useCodingCoverage.ts"
    - "src/components/quality/ValidationPanel.tsx"
    - "src/components/quality/PlausibilityPanel.tsx"
    - "src/components/quality/LabRangesPanel.tsx"
    - "src/components/quality/ReferencesPanel.tsx"
    - "src/components/quality/DuplicatesPanel.tsx"
    - "src/components/quality/OverviewStrip.tsx"
    - "src/components/quality/QualityOverviewPage.tsx"

key-decisions:
  - "Per-tile components (CompletenessTile..DuplicatesTile) each call ONE hook — dispatcher MetricTile routes by stable metricKey prop. Single-dispatcher-with-switch rejected because it would subscribe each tile to all 7 contexts and defeat EFF-R14-04."
  - "Local destructure-rename pattern: const { set: setCompleteness } = useCompletenessRollup() preserves the existing identifier so no other lines in the producer file change. Cuts migration churn to one import + one destructure per file."
  - "QualityOverviewPage holds BOTH facade and per-metric hooks. The facade call at :204 stays because capture/export handlers (:220-245, :247-328) read all 7 metrics via metrics.overall* — bulk reads don't benefit from per-metric splitting and the facade memoizes the bulk shape (D-09 honored)."
  - "DuplicatesTile reads .overall (NOT .value) from useDuplicatesRollup() — special {overall, breakdown, contribute} shape. Matches the pre-split contract where the consumer read metrics.overallDuplicates."

patterns-established:
  - "Producer migration: one-line import swap + one-line destructure-rename, no behavioral change"
  - "Consumer split: per-metric subscription requires per-component boundary (each component calls exactly ONE use<Metric>Rollup hook)"
  - "Facade coexistence: bulk-read handlers stay on the facade, per-metric consumers move to specific hooks — both import paths legitimate"

requirements-completed: [EFF-R14-05, EFF-R14-04]

# Metrics
duration: 14min
completed: 2026-04-24
---

# Phase 32 Plan 03: Producer + Consumer Migration to Per-Metric Hooks Summary

**Migrated 7 producer sites to per-metric rollup hooks, decomposed OverviewStrip into 7 MetricTile leaf components, and split QualityOverviewPage tab labels to per-metric subscriptions while preserving the facade for capture/export bulk reads.**

## Performance

- **Duration:** ~14 min
- **Started:** 2026-04-24T07:16:51Z
- **Completed:** 2026-04-24T07:30:46Z
- **Tasks:** 3 (all auto-completed)
- **Files modified:** 9 (1 created, 8 edited)

## Accomplishments

- All 7 producer sites (`useCompletenessReport`, `useCodingCoverage`, `ValidationPanel`, `PlausibilityPanel`, `LabRangesPanel`, `ReferencesPanel`, `DuplicatesPanel`) now write through their specific per-metric rollup hook instead of the facade — EFF-R14-05 closed.
- New `MetricTile.tsx` (115 LOC) hosts 7 leaf tile components (`CompletenessTile`..`DuplicatesTile`), each calling EXACTLY ONE `use<Metric>Rollup()` for render isolation. Shared `TileShell` handles the uniform render path (breach coloring, aria label, navigate) without subscribing to any per-metric context.
- `OverviewStrip.tsx` dropped its `useQualityMetrics()` facade call and the `metricValueOf` switch; informational tiles 1-2 stay inline, metric tiles 3-9 are now `<MetricTile metricKey={k} />` children.
- `QualityOverviewPage.tsx` tab labels (lines 444-462) read per-metric values (`completeness.value`, `duplicates.overall`, ...) while the existing `useQualityMetrics()` call at :204 stays untouched for the capture handler (:220-245) and export handler (:247-328) bulk reads — consumer-side prep for EFF-R14-04 complete.
- Full test suite green: **870 passed / 22 todo / 3 skipped / 0 failed** (target: ≥869). `npx tsc -b --noEmit` clean per D-12.

## Task Commits

Each task was committed atomically:

1. **Task 1: Migrate 7 producer sites to per-metric hooks** — `58e3370` (refactor)
2. **Task 2: Decompose OverviewStrip into 7 MetricTile children** — `ed85f3e` (refactor)
3. **Task 3: Migrate QualityOverviewPage tab labels (facade preserved for capture/export)** — `03e6dd0` (refactor)

_Note: Plan was nominally tdd="true" but the existing producer + consumer regression tests already cover the migrated paths — no new tests authored in this plan; Plan 32-04 will add the Profiler-based render-isolation assertion._

## Files Created/Modified

**Created:**
- `src/components/quality/MetricTile.tsx` — 7 leaf tile components + dispatcher; each leaf subscribes to ONE per-metric hook for EFF-R14-04 render isolation.

**Modified:**
- `src/hooks/useCompletenessReport.ts` — `useQualityMetricsContext` import → `useCompletenessRollup`; `setCompleteness` via `{ set: setCompleteness } = useCompletenessRollup()`.
- `src/hooks/useCodingCoverage.ts` — `useQualityMetricsContext` import → `useCoverageRollup`; same destructure-rename pattern.
- `src/components/quality/ValidationPanel.tsx` — facade import → `useValidationRollup`; line 229 destructure renamed (RESEARCH correction #1: D-08 said :200, actual was :229).
- `src/components/quality/PlausibilityPanel.tsx` — facade import → `usePlausibilityRollup`; line 109 destructure renamed.
- `src/components/quality/LabRangesPanel.tsx` — facade import → `useLabRangesRollup`; line 51 destructure renamed.
- `src/components/quality/ReferencesPanel.tsx` — facade import → `useReferencesRollup`; line 69 destructure renamed.
- `src/components/quality/DuplicatesPanel.tsx` — facade import → `useDuplicatesRollup`; line 102 destructure uses `.contribute` (special shape — RESEARCH Pattern 2).
- `src/components/quality/OverviewStrip.tsx` — dropped `useQualityMetrics()` + `metricValueOf` switch; metric tiles 3-9 now `<MetricTile />` children. Informational tiles 1-2 unchanged.
- `src/components/quality/QualityOverviewPage.tsx` — added 7 hoisted `use<Metric>Rollup()` calls below the existing facade call; updated 7 tab labels to read per-metric values (6 simple metrics use `.value`, Duplicates uses `.overall`); capture/export handlers UNTOUCHED.

## Decisions Made

- **Per-tile leaf components, dispatcher routes by stable prop.** A single dispatcher pattern that called all 7 hooks inside a switch would subscribe each tile to all 7 contexts and re-render on every metric update — defeating the EFF-R14-04 isolation goal. Per-tile components give React the boundary it needs to render only the affected leaf.
- **Local destructure-rename for producers.** `{ set: setCompleteness }` from `useCompletenessRollup()` preserves the local variable name so the existing `useEffect` dependency array and call sites need no edits. Cuts churn to one-import-plus-one-line per producer.
- **Facade + per-metric hooks coexist in QualityOverviewPage.** The facade at line 204 stays because capture/export handlers read all 7 metrics together — bulk reads don't benefit from per-metric splitting (D-09). Adding the 7 per-metric hooks alongside is additive, not a replacement.

## Deviations from Plan

None — plan executed exactly as written.

The RESEARCH corrections noted in the plan frontmatter were applied as specified:
- ValidationPanel migration targeted line 229 (NOT the stale D-08 :200).
- DuplicatesPanel destructure used `.contribute` (NOT `.set`, matching the special `{overall, breakdown, contribute}` shape).

## Issues Encountered

None. All grep verifications, `npx tsc -b --noEmit`, the 7 producer regression tests (56/56), the quality-overview test (19/19), and the full suite (`npm test`: 870 passed) ran clean on first attempt.

## User Setup Required

None — no external service configuration required.

## Self-Check: PASSED

**Files verified to exist:**
- `src/components/quality/MetricTile.tsx` — FOUND
- `src/components/quality/OverviewStrip.tsx` — FOUND (modified)
- `src/components/quality/QualityOverviewPage.tsx` — FOUND (modified)
- `src/hooks/useCompletenessReport.ts` — FOUND (modified)
- `src/hooks/useCodingCoverage.ts` — FOUND (modified)
- `src/components/quality/ValidationPanel.tsx` — FOUND (modified)
- `src/components/quality/PlausibilityPanel.tsx` — FOUND (modified)
- `src/components/quality/LabRangesPanel.tsx` — FOUND (modified)
- `src/components/quality/ReferencesPanel.tsx` — FOUND (modified)
- `src/components/quality/DuplicatesPanel.tsx` — FOUND (modified)

**Commits verified to exist:**
- `58e3370` (Task 1) — FOUND
- `ed85f3e` (Task 2) — FOUND
- `03e6dd0` (Task 3) — FOUND

## Next Phase Readiness

Plan 32-04 (Wave 4) can now author the per-tile `<Profiler>` render-isolation assertion. Each leaf tile component (`CompletenessTile`, ..., `DuplicatesTile`) is a stable subscription target — calling `setCompleteness(42)` should trigger a render of `CompletenessTile` only, with the other 6 tiles unaffected. The facade-vs-per-metric coexistence in `QualityOverviewPage` is the canonical pattern for any future bulk-read consumer that doesn't need fine-grained subscriptions.

---
*Phase: 32-eff-r14-qualitymetricscontext-split*
*Completed: 2026-04-24*
