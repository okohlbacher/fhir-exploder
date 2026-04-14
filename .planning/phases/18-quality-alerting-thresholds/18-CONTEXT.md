# Phase 18: Quality Alerting & Thresholds - Context

**Gathered:** 2026-04-14
**Status:** Ready for planning

<domain>
## Phase Boundary

Let users configure per-metric quality thresholds (stored in browser `localStorage`) and visually flag any metric that breaches its threshold on the quality dashboard. Covers all 7 quality metrics currently surfaced by Phases 5, 16, and 17: completeness, coding coverage, validation/conformance, plausibility, lab ranges, duplicates, references. No external alerts (no toasts, sounds, emails) — purely visual indicators on the dashboard.

</domain>

<decisions>
## Implementation Decisions

### Score Model (foundational — shapes everything else)
- **D-01:** All 7 metrics are normalized to a uniform **0-100 "% clean" score** so every threshold is expressed the same way (`alert if < X%`). Higher is always better; breach direction is always "below threshold."
- **D-02:** For the 2 existing aggregate metrics, use the current computation:
  - Completeness: `populated / total × 100` (already aggregated in `QualityMetricsContext.overallCompleteness`)
  - Coding coverage: `systemCode / totalCodedFields × 100` (already `overallCoverage`)
- **D-03:** For the 5 issue-count metrics, derive "% clean" as `(sampledResources - affectedResources) / sampledResources × 100`:
  - **Validation/conformance:** `1 − (resources with any OperationOutcomeIssue / sampled)` × 100
  - **Plausibility:** `1 − (resources with any temporal plausibility issue / sampled)` × 100
  - **Lab ranges:** `1 − (Observations outside reference range / sampled lab Observations)` × 100
  - **Duplicates:** `1 − (resources in any duplicate cluster / sampled)` × 100 — applied per resource type then averaged
  - **References:** `1 − (resources with broken or orphan reference / sampled)` × 100

### Threshold Configuration UI (DQ-11)
- **D-04:** Dedicated route: `/quality/thresholds`. New page reachable from a toolbar button on `/quality` ("Configure thresholds").
- **D-05:** Page shows a table: one row per metric × threshold value input (number, 0-100) × default indicator × clear button.
- **D-06:** Leaving a threshold input empty / clicking clear = **unset = no alerting for that metric**. Single-field-per-row UI; no separate enable toggle.
- **D-07:** Page provides a "Reset to defaults" action that restores all metrics to their shipped defaults.

### Defaults & Persistence
- **D-08:** Ship sensible defaults per metric so breaches appear on first load without user setup. Recommended defaults (Claude's discretion to fine-tune during planning, but these are the starting values):
  - Completeness: `< 80%`
  - Coding coverage: `< 70%`
  - Validation/conformance: `< 95%` clean
  - Plausibility: `< 99%` clean
  - Lab ranges: `< 95%` clean
  - Duplicates: `< 99%` clean
  - References: `< 98%` clean
- **D-09:** Persistence: single `localStorage` key (e.g., `quality.thresholds.v1`) holding a JSON object `{ metricKey: number | null }`. **Global scope** — not keyed by server URL. Thresholds are a user preference; they carry across Blaze connections.
- **D-10:** Defaults live in code (a `DEFAULT_THRESHOLDS` constant). The stored object holds only user overrides; unset metrics fall back to defaults. Clearing a metric in the UI removes it from the stored object (falls back to default). "Reset to defaults" clears the entire object.

### Breach Visual Treatment (DQ-12)
- **D-11:** Primary signal: **RingProgress arc / numeric value turns red** when the metric is below its active threshold. Reuses the existing `SummaryCard.ringValue` + Mantine color props — no new primitive needed.
- **D-12:** Applied consistently in both places the metric appears:
  - Dashboard `OverviewStrip` summary tile
  - Each panel's internal summary (per-type rows in CompletenessPanel/CodingCoveragePanel retain their current per-type semantics; only the panel-level aggregate turns red when the aggregate breaches)
- **D-13:** No toast notifications, tab-header badges, or breach-summary banners in this phase. Visual-only per DQ-12 wording.

### Dashboard Layout
- **D-14:** Expand `OverviewStrip` from 4 cards to **7 metric tiles** (one per quality metric) plus the existing "Total resources" and "Resource types" informational cards — 9 tiles total. Responsive grid handles wrapping on narrower viewports.
- **D-15:** Each metric tile shows: label, % clean value, RingProgress arc, and (when breached) the threshold value annotated below the score (e.g., "threshold: 80%").
- **D-16:** Clicking a metric tile navigates to its corresponding quality tab (not a new drill-down — the tile is a quick-view, drill-down still happens from inside each panel as today).

### Threshold Derivation for Issue-Based Metrics — Edge Cases
- **D-17:** When `sampledResources` is 0 for a metric (no data of that type was sampled), the metric displays "—" and is treated as **not breached** (insufficient data is not an alerting condition).
- **D-18:** Metrics that have not yet been run (quality check not executed this session) display "—" and are **not breached**. Running the quality checks populates the tiles. No stale-cache breach flags.

### Scope Exclusions (not in this phase)
- **D-19:** No toast/sound/email notification layer — DQ-12 requires visual-only.
- **D-20:** No historical trending of threshold breaches — Phase 19 (Quality Trends & PDF Reports) owns that.
- **D-21:** No exporting of threshold configs to a file or sharing across users — local-tool scope.

### Claude's Discretion
- Exact column layout and Mantine components on the `/quality/thresholds` page.
- Whether the `DEFAULT_THRESHOLDS` map lives in `src/quality/thresholds.ts` (new file) or in an existing types module.
- Whether to extract a `useThresholds()` hook or layer the logic into `QualityMetricsContext`.
- Exact shade of red (Mantine `red.6` vs severity-graded orange→red gradient) and whether to use a ThemeIcon accent next to the ring.
- Whether to compute "% clean" lazily from existing hook results or add a new reducer to `QualityMetricsContext`.
- Whether the summary-tile click navigates to the tab (D-16) or also pre-filters its drill-down.

### Folded Todos
None — no pending todos were folded into this phase. The two matched todos (cohort selection) are unrelated to thresholds/alerting.

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Quality Infrastructure (extend/read)
- `src/quality/QualityMetricsContext.tsx` — Current overall % state (completeness, coverage). Extension point for "% clean" aggregates for the other 5 metrics.
- `src/quality/types.ts` — `NormalizedIssue`, `IssueSeverity`. Source for counting affected resources per metric.
- `src/quality/sampling.ts` — Provides `sampledResources` denominator for "% clean" derivation.
- `src/quality/metricsCache.ts` — LocalStorage cache pattern to mirror. Useful reference for how Phase 18's threshold persistence should interact with existing cache entries (if at all — thresholds are separate data).

### Panel Hooks (read to derive % clean)
- `src/hooks/useCompletenessReport.ts` — aggregate already exists
- `src/hooks/useCodingCoverage.ts` — aggregate already exists
- `src/hooks/useConformanceRun.ts` — derive `affectedResources` from per-resource issue lists
- `src/hooks/usePlausibilityReport.ts` — derive from check-type issue lists
- `src/hooks/useLabRangesReport.ts` — derive from per-Observation issue lists
- `src/hooks/useDuplicateReport.ts` — count resources in any cluster
- `src/hooks/useReferenceReport.ts` — count resources with any broken/orphan ref

### Dashboard UI (modify)
- `src/components/quality/QualityOverviewPage.tsx` — Add toolbar "Configure thresholds" button.
- `src/components/quality/OverviewStrip.tsx` — Expand from 4 tiles → 9 tiles (7 metrics + Total + Types).
- `src/components/quality/SummaryCard.tsx` — Extend with `breached?: boolean` prop (or equivalent) so ring/value turn red.
- `src/App.tsx` (or the router module) — Add `/quality/thresholds` route.

### New Files (expected, but planner decides)
- `src/quality/thresholds.ts` — `DEFAULT_THRESHOLDS`, storage key, load/save helpers
- `src/hooks/useThresholds.ts` (optional) — read/write thresholds hook using Mantine `useLocalStorage` or raw
- `src/components/quality/ThresholdsPage.tsx` — `/quality/thresholds` route

### Prior Phase Context
- `.planning/phases/15-quality-check-engine-drill-down/15-CONTEXT.md` — Drill-down infrastructure, `NormalizedIssue` contract.
- `.planning/phases/16-conformance-plausibility-checks/16-CONTEXT.md` — Tab expansion (D-14), settings.yaml for plausibility/reference-range thresholds (NOT where Phase 18 thresholds go — browser storage per DQ-11).
- `.planning/phases/17-duplicate-detection-relational-integrity/17-CONTEXT.md` — Tabs 7+8, duplicate/reference metric shape.

### Requirements
- `.planning/REQUIREMENTS.md` — DQ-11 (user can configure per-metric threshold), DQ-12 (dashboard visually highlights breaches).
- `.planning/ROADMAP.md` §Phase 18 — success criteria (including "Threshold configuration persists across page reloads (browser storage)").

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- `QualityMetricsContext` — already aggregates completeness + coding. Natural home for the 7 % clean scores + breach flags.
- `SummaryCard` component — already accepts `ringValue` (0-100) and renders RingProgress. Needs a `breached` prop (or `color` override).
- `OverviewStrip` — already lays out multiple SummaryCards in a responsive SimpleGrid.
- Mantine `useLocalStorage` — already used for `quality.cohort.v1`, `quality.sample.size.v1`. Same pattern works for `quality.thresholds.v1`.
- Mantine `NumberInput`, `Table`, `Button`, `ActionIcon` — available for the `/quality/thresholds` page UI.

### Established Patterns
- `localStorage` for UI preferences and cached computed data — matches the browser-storage requirement for thresholds.
- Dashboard tabs use `keepMounted` — state survives tab switches, so breach flags stay current.
- Context + hook separation — panels read from `useMedplumContext()`/`useQualityMetricsContext()` rather than props drilling.
- Per-severity coloring (plausibility's `CHECK_TYPE_COLORS`) — reference point for red/orange conventions if a severity gradient is later added.

### Integration Points
- `OverviewStrip` — the one place where expansion to 7 metric tiles happens.
- `QualityMetricsContext` — extension to compute and expose per-metric `% clean` + breach flags.
- Router (App.tsx) — new `/quality/thresholds` route, child of the quality layout or a sibling.
- Each panel component — no required changes for Phase 18 unless we choose to surface breach styling inside panels too (D-12 defers this to aggregate-level).

</code_context>

<specifics>
## Specific Ideas

- The uniform "% clean" score model (D-01) is the key design move — it lets a single threshold input + breach check work for every metric, instead of bespoke per-metric alerting logic.
- Defaults (D-08) should be calibrated to be **informative, not noisy** on a reasonable dataset: completeness and coding can legitimately sit below 90% on real MII data, so 80% / 70% give the user headroom. The %-clean metrics are tighter (95-99%) because they count concrete data-quality defects, not coverage.
- The `/quality/thresholds` page (D-04) keeps per-metric configuration centralized — downstream Phase 19 (trends) may want to surface "when did this metric start breaching?" and having a canonical config page helps.
- Storing thresholds globally (D-09) matches the "local tool for one developer/analyst" mental model. If a user ever needs per-server thresholds, they can swap localStorage keys manually — not worth the UX complexity now.

</specifics>

<deferred>
## Deferred Ideas

### Reviewed Todos (not folded)
- **Add cohort selection for scoped data quality analysis** — Already shipped in Phase 16 (CohortSelector). Stale todo; should be removed from the todo list.
- **Define cohorts via FHIRPath query or MII FDPG format** — Advanced cohort definition. Unrelated to thresholds/alerting; candidate for its own future phase.

### Out of Scope for Phase 18 (candidates for later)
- Toast / sound / email notifications when a metric breaches (D-19).
- Historical trending of breach state — Phase 19 owns quality trends.
- Per-cohort / per-resource-type thresholds — current design is global per metric.
- Severity-graded color (orange → red gradient based on how far below threshold) — binary breached/not-breached ships first.

</deferred>

---

*Phase: 18-quality-alerting-thresholds*
*Context gathered: 2026-04-14*
