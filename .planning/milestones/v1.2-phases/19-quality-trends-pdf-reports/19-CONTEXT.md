# Phase 19: Quality Trends & PDF Reports - Context

**Gathered:** 2026-04-14
**Status:** Ready for planning

<domain>
## Phase Boundary

Let users snapshot the quality dashboard over time, visualize how the 7 metrics drift across those snapshots, and export the current dashboard state as a shareable PDF. Covers QUAL-05 (trend chart across multiple measurement points) and QUAL-06 (PDF report of current dashboard state). No server-side history, no scheduled/automatic snapshots, no PDF email/sharing workflow — everything stays local and user-initiated.

</domain>

<decisions>
## Implementation Decisions

### Snapshot capture trigger & retention (QUAL-05 foundation)

- **D-01:** Capture is **explicit** — a "Capture snapshot" button on the `/quality` toolbar (alongside existing "Recompute metrics" and "Configure thresholds"). No auto-capture on metric recompute; explicit intent avoids accidental history noise and keeps the button a deliberate act.
- **D-02:** One snapshot payload records **everything needed to reinterpret the chart later** — not just the scores:
  ```ts
  interface QualitySnapshot {
    id: string;              // crypto.randomUUID()
    capturedAt: string;      // ISO timestamp
    serverUrl: string;       // e.g. Blaze base URL at capture time
    sampleSize: number;      // SampleSizeControl value in effect
    cohort: string[];        // CohortSelector resource types at capture
    scores: Record<MetricKey, number | null>;      // the 7 % clean values (null = "—")
    thresholds: Record<MetricKey, number | null>;  // active threshold at capture (null = disabled)
  }
  ```
- **D-03:** Storage is `localStorage` under key `quality.trends.v1`, value is a JSON array ordered chronologically (newest last). Mirrors Phase 18's `quality.thresholds.v1` pattern.
- **D-04:** Retention is **unlimited** (per-snapshot payload is small — a few hundred bytes); explicit "Clear history" action on the Trends tab provides manual pruning. A soft warning appears when the array exceeds ~500 snapshots (safety net, not a hard cap).
- **D-05:** `serverUrl` is recorded so the chart can disambiguate snapshots from different Blaze instances if the user switches. Default chart view shows snapshots from the currently-connected server only; an "Include other servers" toggle reveals all snapshots (color/shape-distinguished per server).

### Trends tab layout (QUAL-05 visualization)

- **D-06:** Add a new 9th tab labeled "Trends" to `QualityOverviewPage.tsx` Tabs strip, positioned after "References". Route suffix: `?tab=trends` (consistent with Phase 18's deep-link routing contract).
- **D-07:** Default view is a **small-multiples grid of 7 mini line charts**, one per metric. Uses Mantine `LineChart` from `@mantine/charts` (already installed — no new charting dependency). X-axis = capture timestamp, Y-axis = 0–100 (fixed for visual comparability across metrics). Each mini chart is card-sized (~280×160) in a responsive SimpleGrid (xl: 4 cols, md: 3, sm: 2, xs: 1).
- **D-08:** Tab toolbar: `[Capture snapshot]` `[Clear history…]` `[Overlay all] (toggle)` `[Include other servers] (toggle)`. "Clear history" opens a Mantine confirmation modal (matches Phase 18 "Reset to defaults" UX).
- **D-09:** "Overlay all metrics" toggle collapses the 7-mini-chart grid into one larger overlaid `LineChart` with 7 color-coded series (one color per metric, using Mantine's default palette to stay consistent with panel accents). Single legend at the top.
- **D-10:** Empty state (0 snapshots): centered Mantine `Center` block with `IconChartLine`, heading "No snapshots yet", body "Click Capture snapshot to record the current metrics", and a primary Capture button. Single-snapshot state (1 snapshot, charts can't render a line): "1 snapshot captured. Capture at least one more to see trends." plus the capture button.

### Threshold overlay on trend charts (Phase 18 breach history)

- **D-11:** Each per-metric mini-chart renders the threshold as a **dashed horizontal reference line** drawn at the threshold value active **at each snapshot time**. This is per-snapshot threshold, not current threshold — preserves truthful breach history when the user later tweaks thresholds.
- **D-12:** Data points render **red** when the score was below the active threshold at capture time, **blue** otherwise (same color palette as Phase 18 OverviewStrip breach visual). Points where threshold was `null` (disabled at capture) render **gray** with no reference line visible for that segment.
- **D-13:** Hovering a data point shows a Mantine tooltip: timestamp, metric value (`XX%`), threshold at capture (`threshold: YY%` or `disabled`), breach state. Tooltip uses Mantine `ChartTooltip` (built into `@mantine/charts`).

### PDF generation (QUAL-06)

- **D-14:** PDF structure (portrait, letter-size, multi-page as needed):
  - **Header page:** App title "FHIR Exploder — Quality Report" / capture timestamp / server URL / sample size / cohort summary ("N of M resource types scoped" or "all types") / active quality-check backend badge (local vs $validate vs external validator)
  - **Section 1 — Overview:** Snapshot of the current OverviewStrip (7 metric tiles with rings + threshold annotations, plus the "Total resources" + "Resource types" status line from the todo'd revamp).
  - **Section 2 — Trends** (included only when ≥2 snapshots exist in `quality.trends.v1`): the Trends tab's 7-mini-chart grid. If history is empty, a one-line note replaces the section: *"No trend history — capture snapshots on the Trends tab to include them in future reports."*
  - **Footer:** "Generated [timestamp] · FHIR Exploder [version]" on every page.
- **D-15:** Generation strategy is **off-screen DOM composition → `html-to-image` → `jsPDF`**:
  - Render the PDF layout into an off-screen React portal at fixed pixel dimensions (matches letter-size at 96 DPI: 816×1056px per page). This guarantees consistent output regardless of the user's viewport width.
  - `html-to-image`'s `toPng()` captures each section to a PNG data URL.
  - `jsPDF` stitches the PNGs into pages, preserving per-section page breaks.
  - Download triggered via blob URL. Filename pattern: `fhir-exploder-quality-report_[serverUrlSlug]_[YYYY-MM-DD_HHMMSS].pdf`.
- **D-16:** Add **`jspdf`** (~50KB gzipped) as a dependency. Decision: client-side PDF lib beats browser-native `window.print()` because (a) deterministic output independent of the user's browser print dialog, (b) stays inside the app UI (no dialog interruption), (c) consistent with the local-first audit-tool positioning, (d) enables future extensions (programmatic batch exports, embedded PDF in the UI).
- **D-17:** "Export PDF" button on the `/quality` toolbar (right of "Capture snapshot"). Uses Mantine `Button` with `IconFileDownload` + `loading` state while generation runs. Notification on completion (success: "Report downloaded", error: "Export failed — see console"). Non-goal: custom title/notes in the PDF (future enhancement).

### Claude's Discretion

- Exact Mantine `LineChart` vs `AreaChart` / curve style (monotone vs linear) for the mini charts.
- Whether per-metric series colors in Overlay mode match each metric's icon color on the OverviewStrip or use a fresh `@mantine/charts`-friendly palette.
- Off-screen PDF portal implementation — `createPortal` to a fixed-position hidden `div` vs an in-memory render via `ReactDOMServer` (planner picks based on dep-weight).
- Whether to extract a `useTrendsHistory()` hook (analogous to `useThresholds()`) or layer snapshot CRUD into `QualityMetricsContext`.
- Multi-line tooltip vs compact single-line on chart hover.
- PDF image compression quality (PNG default vs JPEG with quality setting) — trade-off between file size and ring-visualization fidelity.
- Whether "Clear history" prunes individual snapshots too (select+delete) or only bulk-clears; recommendation: bulk-clear only for v1, per-snapshot selection is a polish item.

### Folded Todos

None — no pending todos are in-scope for this phase. The 5 matched todos were all false-positive keyword hits (cohort selection, external validator, cohort-selector rename, overview-strip tile count, FHIRPath cohorts). They are recorded in the Deferred section below.

</decisions>

<specifics>
## Specific Ideas

- **Per-snapshot threshold provenance is the key design move.** Phase 18's thresholds are user-editable (D-10 there), so a chart that renders the *current* threshold on historical points would quietly lie about breach state as the user tunes thresholds. Recording the threshold-at-capture in each snapshot makes the trend page a faithful audit trail.
- **The snapshot payload is intentionally complete.** Recording `serverUrl`, `sampleSize`, `cohort`, and `thresholds` (not just `scores`) means every data point on the chart can be interpreted in isolation — no reliance on remembering what the dashboard was configured to analyze at the time.
- **Small-multiples over overlaid-by-default** matches the OverviewStrip visual rhythm (7 rings in a grid) and keeps each metric readable at a glance. Overlay is for when the user wants to compare metrics directly (e.g., "are all metrics getting worse together, or just completeness?").
- **PDF generation via `html-to-image` + `jsPDF`** is the same stack commonly used for dashboard exports; `html-to-image` is already installed. Adding `jspdf` is a one-line `package.json` change with no transitive-dep surprises.
- **Off-screen render for PDF layout** (not capturing the live viewport) means the PDF always looks the same regardless of whether the user has the sidebar collapsed, is on a 4K monitor, or has the dev tools open. Predictability matters for audit exports.

</specifics>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Requirements & Roadmap
- `.planning/REQUIREMENTS.md` §Quality Trends — QUAL-05 (trend chart), QUAL-06 (PDF report).
- `.planning/ROADMAP.md` §Phase 19 — goal, 4 success criteria, milestone v1.2 context.

### Phase 18 Artifacts (required reading — Phase 19 extends this contract)
- `.planning/phases/18-quality-alerting-thresholds/18-CONTEXT.md` — D-01..D-03 (% clean score model), D-08 (default thresholds), D-09..D-10 (localStorage pattern + three-state threshold semantics), D-20 (historical trending explicitly deferred to Phase 19).
- `src/quality/QualityMetricsContext.tsx` — the 7 `overall*` values Phase 19 snapshots. Read the file-level docblock for rollup rules and "push undefined, not 0" contract.
- `src/quality/thresholds.ts` — `MetricKey` union, `METRIC_LABELS`, `METRIC_ROUTES`, `DEFAULT_THRESHOLDS`, `STORAGE_KEY`, `resolveThreshold()`. Phase 19 reuses `MetricKey` and `METRIC_LABELS`. Phase 19's storage key `quality.trends.v1` mirrors Phase 18's `quality.thresholds.v1` pattern.
- `src/components/quality/OverviewStrip.tsx` — breach visual contract, tile structure, METRIC_ORDER.
- `src/components/quality/SummaryCard.tsx` — vertical layout (icon/label, ring, subtitle, threshold); the PDF overview section replicates this rendering.
- `src/components/quality/QualityOverviewPage.tsx` — Tabs structure, `useSearchParams()` tab routing contract (add `trends` to the valid tab-value list).
- `src/components/quality/ThresholdsPage.tsx` — reference for "configuration-adjacent" page UX (Back to overview link, Reset confirmation modal pattern).

### Phase 5 Artifacts (sampling infrastructure)
- `src/quality/sampling.ts` — sampling contract (10..1000 clamp); snapshot records the value used.
- `src/components/quality/SampleSizeControl.tsx` — where the sample size lives in the UI; read-only for Phase 19 (snapshot captures current value).

### Stack References
- `@mantine/charts` — `LineChart`, `ChartTooltip`, `Legend` documented at <https://mantine.dev/charts/line-chart/>. Already installed at v9.0.1 (peer-compatible with `@mantine/core ^8.3.18` via Recharts 3.x).
- `html-to-image` — already installed (v1.11.13). Use `toPng()` for PDF sections.
- `jspdf` — **new dependency**, target current stable on npm (check `npm view jspdf version` during planning). API: `new jsPDF({ orientation: 'portrait', unit: 'px', format: [816, 1056] })`, then `doc.addImage(png, 'PNG', x, y, w, h)`, `doc.addPage()`, `doc.save(filename)`.

### Theoretical Foundation
- PROJECT.md §Theoretical foundation — Kahn et al. / Spengler (2021) data quality framework. Trends are the longitudinal view that framework is eventually consumed through; QUAL-05 is the instrumentation to support that.

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- `MetricKey` / `METRIC_LABELS` / `METRIC_ROUTES` / `DEFAULT_THRESHOLDS` (src/quality/thresholds.ts) — Phase 19 reuses the same metric taxonomy. No new keys, no renames.
- `QualityMetricsContext.overallCompleteness` / `overallCoverage` / `overallValidation` / `overallPlausibility` / `overallLabRanges` / `overallDuplicates` / `overallReferences` — the 7 "% clean" values. The snapshot button reads these directly.
- `CohortSelector` state / `SampleSizeControl` state — both accessible from `QualityOverviewPage`; snapshot reads these at capture.
- `MedplumContext` — `medplum.getBaseUrl()` yields the Blaze server URL for the snapshot's `serverUrl` field.
- Mantine `useLocalStorage` — used already for cohort, sample size, thresholds, metrics cache. Same pattern for `quality.trends.v1`.
- `html-to-image` — already installed; `toPng(element, { pixelRatio: 2 })` gives retina-quality PNGs for PDF.
- `@mantine/charts` `LineChart` — already installed; supports `referenceLines` prop for the threshold dashed line, `dotProps` for per-point color overrides, `withLegend`, `withTooltip`.

### Established Patterns
- **localStorage for UI preferences and cached data** — `quality.thresholds.v1`, `quality.sample.size.v1`, `quality.cohort.v1`, `quality.metricsCache.v1`. `quality.trends.v1` fits the naming scheme.
- **Tab navigation via `?tab=<route>`** (Phase 18 D-14/D-15, `useSearchParams` in QualityOverviewPage) — `?tab=trends` is the 9th value.
- **Confirmation modals for destructive actions** — Phase 18 "Reset to defaults" uses a Mantine modal. "Clear history" mirrors that.
- **Push-undefined-not-zero for absent metrics** — Phase 18 locked this for OverviewStrip; snapshot serializer respects it (`scores[key] = value ?? null` when serializing to localStorage, since JSON has no `undefined`).
- **Toolbar button grouping on `/quality`** — Recompute, Configure thresholds, and now Capture + Export PDF. Planner decides exact ordering; the "action group" pattern is established.
- **Notification pattern** — `@mantine/notifications` used for "Thresholds reset" feedback; reuse for "Report downloaded" / "Snapshot captured".

### Integration Points
- `QualityOverviewPage.tsx` — toolbar additions (Capture snapshot, Export PDF), new Trends tab, `?tab=trends` added to valid tab values.
- `App.tsx` router — Trends tab is a tab-within-page, not a new route. **No routing change required**.
- `QualityMetricsContext.tsx` — consumed read-only by snapshot serializer. No schema change.
- New file `src/quality/trendsHistory.ts` (planner can rename) — load/save helpers, `STORAGE_KEY`, snapshot type. Mirrors `thresholds.ts`.
- New hook `src/hooks/useTrendsHistory.ts` — read/write snapshots (analogous to `useThresholds`).
- New component `src/components/quality/TrendsPanel.tsx` — the Trends tab content.
- New module `src/quality/pdfExport.ts` — off-screen composition + `html-to-image` + `jsPDF` orchestration.
- New component `src/components/quality/PdfReportLayout.tsx` — the off-screen rendered layout; mounts via portal, sized at 816×1056, rendered once per export then discarded.

</code_context>

<deferred>
## Deferred Ideas

### Reviewed Todos (not folded — unrelated to trends/PDF)

The todo-matcher scored these 0.5–0.9 on keyword match, but all are false positives for Phase 19's scope. Logged here to prevent re-surfacing in future phases.

- **`2026-04-13-add-cohort-selection-for-scoped-data-quality-analysis.md`** — Cohort selection already shipped (CohortSelector, Phase 16). Todo is stale; candidate for removal.
- **`2026-04-13-define-cohorts-via-fhirpath-query-or-mii-fdpg-format.md`** — Advanced cohort definition (FHIRPath / MII FDPG format). Unrelated to trends/PDF; candidate for its own future phase (already flagged in Phase 17/18 deferred sections).
- **`2026-04-14-add-external-validator-integration-for-full-fhir-validate.md`** — Extend `ValidationPanel` with external validator endpoint config. Separate capability, own future phase.
- **`2026-04-14-cohort-selector-ui-mismatch-rename-or-replace.md`** — Rename "Cohort" label to "Resource types". Quick UI relabel, unrelated to trends/PDF. Eligible for `/gsd-quick` at any time.
- **`2026-04-14-reduce-overview-strip-tile-count-move-totals-to-header.md`** — Shrink OverviewStrip from 9 to 7 tiles; move Total/Types to a status line. Independent UI polish; eligible for `/gsd-quick`. **Note for Phase 19 PDF output:** if this ships before Phase 19 executes, the Overview section in the PDF should reflect the 7-tile + status-line layout; downstream planner should check the current `OverviewStrip.tsx` state at execution time.

### Out of Scope for Phase 19 (candidates for later)
- **Scheduled snapshots** (e.g., daily auto-capture) — out of scope per "local-only tool" positioning; could revisit if a hosted variant is ever built.
- **Cross-device sync of trend history** — localStorage is per-browser by design.
- **Per-snapshot editable notes / titles** — polish item; snapshot metadata is auto-only in v1.
- **PDF email/share workflow** — local download only; user can attach manually.
- **PDF with embedded drill-down tables** — current PDF is a summary, not a full audit. A "comprehensive audit export" that included ResourceIssueTable contents per tab would be its own large phase.
- **Import / export trend history as JSON** — could enable sharing between machines; add to backlog if ever requested.
- **Chart annotations** (user-added markers like "v1.2 data load completed here") — polish item; deferred until user demand surfaces.
- **Compare two snapshots side-by-side (diff view)** — distinct capability from trend chart; Phase 19 ships the trend visualization only.
- **Non-time X-axis options** (e.g., X-axis by cohort or by sample size) — current design is time-series only; alternative pivots are unrequested.
- **Breach event log** (textual "Completeness dropped below threshold on 2026-04-14 at 17:30") — the trend chart already encodes this visually via red dots; a textual log is a separate UX.

</deferred>

---

*Phase: 19-quality-trends-pdf-reports*
*Context gathered: 2026-04-14*
