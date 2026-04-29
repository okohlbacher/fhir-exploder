# Phase 35: Phase-30 UAT Follow-ups + Per-Type Quality Matrix - Context

**Gathered:** 2026-04-25
**Status:** Ready for planning
**Mode:** `--auto` (all decisions auto-selected from ROADMAP + Phase 30 UAT spec + Phase 32 EFF-R14 architecture)

<domain>
## Phase Boundary

Close the four remaining Phase-30 UAT gaps and ship the per-type quality matrix card under the Counts tab. The four gaps are mostly mechanical and independent (parallel-safe). Per-type matrix is the largest and depends on extending Phase 32's per-metric contexts with a `byType` slot.

**In scope:**
- UAT-FU-01: `SearchResultsPage.tsx` per-resource-type Date/Status field extractors (TDD).
- UAT-FU-02: `HumanReadableView.tsx` + `ResourcePropertyTable.tsx` extension cleanup (Tooltip + Modal patterns).
- UAT-FU-03: `ResourceDetailPage.tsx` SegmentedControl 4→3 (drop "Clinical + raw"; rename "Developer" → "JSON"); delete `ClinicalRawView.tsx`.
- UAT-FU-05: Per-type quality matrix card under `/quality?tab=counts`. Requires extending each per-metric context (Phase 32) with a `byType: Record<string, number>` slot + producer migration.

**Subsumed-by-traceability (closed in earlier phases — DO NOT re-implement):**
- UAT-FU-04 → Phase 33 MII-EXT-06 (Dashboard heading + Drawer)
- UAT-FU-06 → Phase 33 MII-EXT-07 (`extraQuery` URL fix + per-module patientSearchParam contract)

**Out of scope (deferred):**
- New quality metrics or rollup math changes (locked Phase 18).
- Heat-column gradient on the matrix (v1.6+ candidate per ROADMAP §Deferred Items).
- CSV export of the matrix (v1.6+ candidate per ROADMAP §Deferred Items).

</domain>

<decisions>
## Implementation Decisions

### Plan Decomposition + Ordering

- **D-01:** Ship as **4 plans, mostly parallel-safe**:
  - **Plan 35-01** — UAT-FU-03 SegmentedControl mode cleanup. Smallest + most mechanical; goes first to clear the deck and free `ResourceDetailPage.tsx` review surface for plans 35-02/35-03 if either touches it.
  - **Plan 35-02** — UAT-FU-01 Explorer Date/Status per-type extractors (TDD). Independent of 35-01/35-03/35-04.
  - **Plan 35-03** — UAT-FU-02 HumanReadableView extension cleanup. Independent of others. Parallel-safe with 35-02 (different files).
  - **Plan 35-04** — UAT-FU-05 per-type quality matrix card + per-metric context `byType` slot extension + producer migration. Largest; runs last because (a) it's the riskiest and benefits from clean tests, (b) producers may need rebuild after 35-02's TDD baseline shifts.
- **D-02:** Wave structure: Plans 35-01, 35-02, 35-03 share Wave 1 (parallel). Plan 35-04 takes Wave 2 (depends_on Wave 1 only as a soft fence — if 35-04 lands cleanly first it doesn't break 01/02/03; the fence is for review-load smoothing).

### UAT-FU-01: Explorer Date/Status Per-Type Extractor

- **D-03:** **TDD baseline-drift pattern** is non-negotiable per ROADMAP success criterion #1: write assertion tests FIRST capturing current "empty = empty" behavior for the 6 target resource types (Patient, Condition, Observation, MedicationStatement, Encounter, Procedure), THEN add the extractor + flip the assertions in **a single reviewable commit** so baseline drift is deliberate. Two commits: (a) RED tests, (b) GREEN extractor + flipped assertions + baseline updates together.
- **D-04:** **Per-type extractor map** lives in `src/components/explorer/SearchResultsPage.tsx` (or a sibling utility if the file outgrows ~400 lines):
  - `Patient` → date: `birthDate`, status: `active`
  - `Condition` → date: `onsetDateTime`, status: `clinicalStatus`
  - `Observation` → date: `effectiveDateTime`, status: `status`
  - `MedicationStatement` → date: `effectiveDateTime`, status: `status`
  - `Encounter` → date: `period.start`, status: `status`
  - `Procedure` → date: `performedDateTime`, status: `status`
  - Default fallback (other types): keep current `getResourceDate()` logic; status falls to empty string.
- **D-05:** **Status normalization**: FHIR `code` and `boolean` types render directly (no enum prettification). `Patient.active === false` → `"inactive"`; `true` → `"active"`. Keep raw `code` strings for the others. Localization is out of scope (German labels stay deferred to v1.6+).

### UAT-FU-02: HumanReadableView Extension Cleanup

- **D-06:** **Identifier-system → Mantine Tooltip**. The system URL (e.g., `https://www.medizininformatik-initiative.de/fhir/core/modul-person/CodeSystem/...`) moves OFF the main row visual into a hover Tooltip on the value cell. The value text stays clickable; cursor changes to `help` on hover. Use `@mantine/core`'s existing Tooltip primitive. No new component file.
- **D-07:** **Address-extension JSON → Mantine Modal**. The current inline JSON dump for address extensions (e.g., HL7 standardpostalcode) is replaced with a `[View]` button that opens a Modal showing the formatted JSON in a `<Code block>`. Modal title: extension display name (or URL fragment if no display).
- **D-08:** **Bottom "Extensions" section** in `HumanReadableView.tsx` collects ALL resource extensions (the FHIR `Resource.extension[]` array, NOT property-level extensions which stay inline). One row per unique `url`, columns: `URL fragment | Value summary | [View]`. The `[View]` button opens the same Modal as D-07 with the full extension JSON. Uses `<Group justify="space-between">` row layout consistent with the existing `MetricTile` pattern.
- **D-09:** **`ResourcePropertyTable.tsx` parallel updates** — same Tooltip + Modal idioms applied wherever an inline JSON dump or raw-URL system reference currently renders. No new components beyond the two patterns from D-06/D-07.

### UAT-FU-03: ResourceDetailPage Mode Cleanup

- **D-10:** **SegmentedControl reduction 4 → 3 options**. Current options (per ROADMAP) are: `Clinical | Clinical + raw | Developer | Raw JSON`. After:
  - `Clinical`
  - `Raw JSON`
  - `JSON` (renamed from `Developer`)
  - **REMOVED:** `Clinical + raw`
- **D-11:** **`ClinicalRawView.tsx` deletion is mandatory** per ROADMAP success criterion #3. Grep-clean check: `grep -rn "ClinicalRawView" src/ --include="*.ts" --include="*.tsx"` returns 0 hits in the final commit. Test imports + storybook entries (if any) also removed.
- **D-12:** **Active-mode default preserved** — whatever today's default mode is (`Clinical` per code scout) stays default; the SegmentedControl `value` prop just stops accepting `"clinical-raw"`.
- **D-13:** **Settings-key cleanup**: if any `localStorage` key persists the active mode (check `src/hooks/useLocalStorage*` and `src/stores/`), the `"clinical-raw"` value is migrated to `"clinical"` on read. Stored old values silently coerce; no user-facing notice.

### UAT-FU-05: Per-Type Quality Matrix Card

- **D-14:** **Per-metric context `byType` slot extension** is the architectural prerequisite. Each of the 7 per-metric contexts in `src/quality/metrics/*.tsx` (Phase 32) gains:
  - `byType: Record<string, number>` field
  - `setByType: (map: Record<string, number>) => void` setter
  - `useMemo` value extended to `{ value, byType, set, setByType }` (no breaking change — facade `useQualityMetrics()` consumers unaware)
  - For `DuplicatesContext` the existing `breakdown.hashByType` is the per-type source — no new field needed; expose as `byType` derived getter for matrix consumption.
- **D-15:** **Producers populate `setByType`** in addition to existing `set`. Sites: `useCompletenessReport.ts`, `useCodingCoverage.ts`, `ValidationPanel.tsx`, `ReferencesPanel.tsx`. Plausibility + LabRanges producers are NOT migrated this phase (their metrics aren't in the matrix per ROADMAP column list). DuplicatesPanel keeps current contribute() — `byType` derives from breakdown.
- **D-16:** **Matrix card placement** — renders inside `ResourceCountsPanel.tsx` (or as a sibling card in the same `tab=counts` route), **below** the existing counts table. Uses `<Card withBorder radius="lg" padding="lg">` matching the project default. Card title: `Quality by resource type`.
- **D-17:** **Columns (7) per ROADMAP success criterion #4, in order**:
  - `Resource type` (left-aligned, `<Text>` with monospace type name)
  - `Complete %` (numeric + inline horizontal `<Progress size="xs">` fill bar)
  - `Coverage %` (same render)
  - `Validation %` (same render)
  - `References %` (same render)
  - `Dup` (numeric % only, no fill bar — derived from `DuplicatesBreakdown.hashByType`)
  - `Issues` (integer count from validation issues per type — sourced from existing `ValidationPanel` per-type aggregate)
  - `chevron` (right-aligned `IconChevronRight`, click navigates per D-19)
  - **Plausibility + LabRanges columns are EXCLUDED** per ROADMAP — they live in their own panels and the per-type matrix omits them by design.
- **D-18:** **Threshold breach coloring** uses `isBreached(metricKey, value)` from existing `src/quality/thresholds.ts` (or wherever the OverviewStrip imports it). Cell `<Text c={isBreached(...) ? 'red.6' : undefined}>` for the numeric value; the fill bar gets `color="red"` instead of default `color="indigo"`. Consistent with `OverviewStrip` per Phase 30 layout.
- **D-19:** **Row click → navigation**. Click anywhere on the row (or specifically the chevron) navigates to `/quality?tab=<metric>&type=<resourceType>` deep-link. The target metric is the **first non-empty** metric column for that row (heuristic: most-actionable signal). If all metrics empty, click navigates to `/explorer/<resourceType>` instead. Reuses existing per-metric panels' query-string filter handling — no new panel.
- **D-20:** **Sorting**: every column sortable via the existing `<SortableTh>` primitive at `src/components/quality/SortableTh.tsx`. Default sort: `Issues DESC, Resource type ASC` (most problematic types surface first).
- **D-21:** **Row inclusion**: ONE row per resource type that has a count > 0 in the existing counts table. Empty types omitted. If the matrix is computed before the counts table loads, render skeleton rows matching counts-table count.
- **D-22:** **No new FHIR fetches**. The matrix is a read-projection over already-fetched per-metric `byType` maps + the existing `useResourceCounts` hook output. Phase 32 D-09 invariant preserved (the matrix is a consumer, not a producer).

### Test Strategy

- **D-23:** **Test-count gate**: `npm test` ≥ 998 passing / 0 failing (Phase 34 baseline). Phase 35 adds:
  - Plan 35-01: 1 test for SegmentedControl options length === 3 + Developer→JSON label rename + grep test for `ClinicalRawView` zero hits.
  - Plan 35-02: 6 RED-then-GREEN extractor tests (one per resource type) + 6 baseline assertions flipped from "empty = empty" to "extracted value present".
  - Plan 35-03: Tooltip render test, Modal open/close test, bottom-Extensions section per-row render test.
  - Plan 35-04: per-metric `byType` setter contract test, matrix-card row-count-matches-types test, threshold-breach coloring test, chevron click navigation test, default sort assertion.
  - Conservative target: ≥ 1015 passing post-Phase-35.
- **D-24:** **`npx tsc -b --noEmit` clean** + **`npm run build` clean** at the end of every plan. No "broken but fixed in next plan" intermediate states.

### Commit Cadence

- **D-25:** Each plan ends with a green test suite + clean tsc. Plans 35-01 through 35-03 are independent; if conflicts arise (e.g., 35-02 + 35-03 both touch `SearchResultsPage.tsx` — they don't, but check), serialize in the executor.
- **D-26:** Plan 35-02 must commit RED tests in a separate commit from the GREEN extractor + flipped assertions per D-03 — the baseline drift commit (#2) carries the test diffs + extractor + assertion flips together so reviewers see the deliberate baseline shift in a single reviewable diff.

### Claude's Discretion
- Final URL fragment trimming heuristic for the bottom-Extensions section header (D-08).
- Whether the matrix sort default is `Issues DESC, Resource type ASC` or `Resource type ASC` only — D-20 picks the most-actionable; planner may swap if user feedback emerges.
- Whether plan 35-04 ships the matrix card and `byType` extension as one plan or splits them — currently D-01 keeps them together because the matrix is the only `byType` consumer.

### Folded Todos
(None — no pending todos matched Phase 35 scope at context-gathering time.)

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### ROADMAP + REQUIREMENTS
- `.planning/ROADMAP.md` §Phase 35 — goal, dependencies, 6 success criteria
- `.planning/REQUIREMENTS.md` §UAT-FU-01..06 — acceptance criteria (UAT-FU-04/06 already closed in Phase 33)

### Phase 30 UAT Source
- `.planning/milestones/v1.4-phases/30-layout-redesign/30-UAT.md` — original 6 follow-up items + Gaps section that this phase closes

### Phase 32 Per-Metric Context Architecture (UAT-FU-05 dep)
- `.planning/phases/32-eff-r14-qualitymetricscontext-split/32-CONTEXT.md` — D-02..D-12 lock the 7-context shape that Phase 35 extends with `byType`
- `.planning/phases/32-eff-r14-qualitymetricscontext-split/32-04-SUMMARY.md` (or whichever final plan summary) — final producer/consumer migration list

### Phase 33 + 34 Subsumed Items (traceability only — do NOT re-implement)
- `.planning/phases/33-mii-schema-foundation-extension-modules-collapse-ui/33-06-SUMMARY.md` — UAT-FU-04 closure (Dashboard heading + Drawer)
- `.planning/phases/33-mii-schema-foundation-extension-modules-collapse-ui/33-01-INVESTIGATION.md` — UAT-FU-06 root cause + fix

### Code Anchors
- `src/components/explorer/SearchResultsPage.tsx:362-403` — Date/Status column rendering site (UAT-FU-01)
- `src/components/explorer/HumanReadableView.tsx` — extension rendering host (UAT-FU-02)
- `src/components/explorer/ResourcePropertyTable.tsx` — parallel UAT-FU-02 site
- `src/components/explorer/ResourceDetailPage.tsx` — SegmentedControl host (UAT-FU-03)
- `src/components/explorer/ClinicalRawView.tsx` — file to DELETE (UAT-FU-03)
- `src/components/quality/ResourceCountsPanel.tsx` — matrix-card sibling host (UAT-FU-05)
- `src/components/quality/SortableTh.tsx` — sortable column primitive
- `src/components/quality/OverviewStrip.tsx` — `isBreached()` consumer pattern
- `src/quality/metrics/CompletenessContext.tsx` (and 6 siblings) — `byType` slot extension target
- `src/quality/thresholds.ts` (or actual `isBreached` location) — breach colorer
- `src/hooks/useResourceCounts.ts` (or actual counts hook) — matrix row inclusion source

### External Specs
- FHIR R4 search params: https://www.hl7.org/fhir/R4/searchparameter-registry.html — for D-04 per-type field paths

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- **`<SortableTh>`** at `src/components/quality/SortableTh.tsx` — D-20 sort target
- **`isBreached()`** function — D-18 cell coloring
- **`<Card withBorder radius="lg" padding="lg">`** — Mantine theme default (Phase 30 design tokens) for D-16
- **`<Tooltip>` + `<Modal>`** from `@mantine/core` — D-06/D-07/D-08 patterns
- **`<Progress size="xs">`** — Phase 30 OverviewStrip fill-bar idiom for D-17 numeric cells
- **Phase 32 7-context architecture** — D-14 extends with one new field per context, no breaking changes
- **`useResourceCounts`** hook — D-21 row source

### Established Patterns
- **TDD baseline-drift commit pattern** (D-03) — RED commit, then GREEN + flipped-baseline single commit
- **Per-metric context isolation** (Phase 32) — adding `byType` keeps matrix re-renders confined
- **No new FHIR fetches** invariant (D-22) — matrix is a read-projection
- **Mantine 8 stack** (CLAUDE.md) — Tooltip, Modal, Progress, Card, SegmentedControl all already imported

### Integration Points
- **`ResourceCountsPanel.tsx`** — matrix card mounts as sibling under `<Stack>` (D-16)
- **`/quality?tab=counts`** route — Phase 30 already wired; matrix joins existing layout
- **`/quality?tab=<metric>&type=<resourceType>`** — chevron click target (D-19); reuses existing query-string filter parsing
- **localStorage `quality.*.v1` keys** — D-13 may add a one-shot `clinical-raw → clinical` migration on read

</code_context>

<specifics>
## Specific Ideas

- **6 target resource types for UAT-FU-01** locked: Patient, Condition, Observation, MedicationStatement, Encounter, Procedure — no expansion to Diagnostic Report or Specimen this phase
- **5 metric columns in the matrix** (Complete/Coverage/Validation/References/Dup) — Plausibility + LabRanges intentionally excluded per ROADMAP
- **`Issues` column** sources from existing `ValidationPanel` per-type issue count aggregate — no new validator runs
- **TDD pattern from Phase 32 + 33** — RED-GREEN ordering with grep-verified assertions
- **No new dependencies** — phase ships entirely on Mantine 8 + existing project hooks

</specifics>

<deferred>
## Deferred Ideas

- **CSV export of the per-type matrix** — v1.6+ candidate per ROADMAP §Deferred Items
- **Heat-column gradient on the matrix** — v1.6+ candidate per ROADMAP §Deferred Items
- **German localization** of Date/Status status enum values — out of scope; v1.6+ if requested
- **Plausibility + LabRanges in the matrix** — out of ROADMAP scope; revisit after user feedback
- **Per-type drill-down INSIDE the matrix card** (expandable rows showing per-metric detail) — chevron-to-existing-panel is simpler; revisit if users want it inline
- **Pre-probe extension-module counts on Patient detail** — separate v1.6+ candidate per ROADMAP

### Reviewed Todos (not folded)
(None reviewed — no matching todos in the backlog at context-gathering time.)

</deferred>

---

*Phase: 35-phase-30-uat-follow-ups-per-type-quality-matrix*
*Context gathered: 2026-04-25*
