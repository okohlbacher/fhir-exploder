# Phase 25: Quality Module Dedup - Context

**Gathered:** 2026-04-22
**Status:** Ready for planning
**Source:** Auto-captured via `/gsd-discuss-phase 25 --auto` (recommended defaults selected)

<domain>
## Phase Boundary

Collapse parallel-development duplication in the Quality module before the next Quality feature lands. **No net-new user-facing behavior** — this is a refactor phase measured by:

- Coding drill-down server calls **halved** (QDDEP-01 removes `useExamplesByPath` double-fetch)
- **≥400 duplicated lines removed** across the 5 drill-down files (QDDEP-02)
- `useCompletenessReport` + `useCodingCoverage` each **≤30 lines** (QDDEP-03)
- `/quality?tab=counts` **stops firing background sampling** (QDDEP-04)
- Single `SortableTh` definition + 9 inline `pct` sites collapse to `<RunProgress>` (QDDEP-05/06)

**Requirements covered:** QDDEP-01, QDDEP-02, QDDEP-03, QDDEP-04, QDDEP-05, QDDEP-06

**Explicitly NOT in this phase:**
- `QualityMetricsContext` re-render split (R14 / EFF-R14) — deferred to v1.5+
- `<ConnectionGatedOutlet>` (SHELL-01) — Phase 26
- Any behavior change to scoring logic, drill-down content, or panel metrics
- External FHIR validator integration (T1) — Phase 29

**Intra-phase order (LOCKED per ROADMAP.md):** QDDEP-01 (`perPathExamples`) MUST ship BEFORE QDDEP-02 (`<DrillDownShell>`), because the shell can only be designed once the coding drill-down stops issuing a second sample fetch. Other QDDEP items can interleave.

**Dependencies:** Phase 24 complete (`useAsyncRun`, `Map<serverUrl>` registry, `let cancelled` pattern all available).

</domain>

<decisions>
## Implementation Decisions

### QDDEP-01: perPathExamples population (R5, must land first)

- **D-01:** Populate `perPathExamples: Record<string, CodeableConcept>` inside the existing `codingCoverageWalker` (in `src/quality/coding.ts` or wherever the walker lives today — planner to confirm). Do NOT add a second traversal pass; the walker already visits every coding path.
- **D-02:** Key format: the dotted FHIRPath string already used for the rollup (e.g., `"Observation.code.coding"`) — no new key derivation. One representative example per path; deterministic selection (first non-null encounter, not random).
- **D-03:** `useExamplesByPath` hook is **deleted wholesale** after `CodingDrillDown` switches to reading `report.perPathExamples[path]`. Do NOT stub it with a deprecation warning — grep-remove across the codebase.
- **D-04:** Storage on the existing `PerTypeCoverageReport` interface, not a separate sibling type. Keeps the `QualityMetricsCache` (Phase 24) unchanged — the per-report object shape is already serialized there.

### QDDEP-02: DrillDownShell shape (R3, after QDDEP-01)

- **D-05:** Props interface (≤6 fields per roadmap): `{ title: string; backHref: string; status: AsyncRunStatus; progress: number; issues: NormalizedIssue[]; errorMessage?: string }`. No render-prop or `children` escape hatch — if a drill-down needs bespoke content above the issues table, it wraps `<DrillDownShell>` instead of extending it.
- **D-06:** File location: `src/components/quality/DrillDownShell.tsx`. Co-located with the panels/drill-downs it replaces.
- **D-07:** Migration: convert the 5 simple drill-downs first (Plausibility, LabRanges, Duplicates, References, Completeness — ~95 LOC each → shell invocation ~15 LOC). `CodingDrillDown` (270 LOC) is PARTIAL migration — its unique "coding coverage by path" body cannot fold into the shell; wrap it so header/back/status/progress reuse the shell while the body stays bespoke.
- **D-08:** Target LOC reduction: ~80 LOC × 5 simple drill-downs ≈ 400 LOC saved. `CodingDrillDown` partial migration adds ~20 more. Matches ROADMAP success criterion #2 (≥400).

### QDDEP-03: useSampleWalker<T> extraction

- **D-09:** New hook at `src/hooks/useSampleWalker.ts`. Generic over `T` (the issue or report-row type) so both completeness and coding can consume it.
- **D-10:** Walker owns: worker-pool lifecycle, seeding loop, recursion, cancellation (reuse Phase 24's `let cancelled` pattern — NO `cancelledRef`). Wrapper hooks own: rollup aggregation, metric-specific post-processing, exposing the `UseAsyncRunResult<T>` shape to consumers.
- **D-11:** `useCompletenessReport` and `useCodingCoverage` target: **≤30 meaningful LOC each** (down from 167 + 143 respectively — 310 total). Per-metric rollup stays in the wrapper — NOT lifted into `useSampleWalker` (roadmap success criterion #3 says so explicitly).
- **D-12:** `useSampleWalker<T>` wraps `useAsyncRun<T>` internally. This keeps the cancellation primitive single-source (Phase 24). Do NOT re-implement start/cancel in `useSampleWalker`.

### QDDEP-04: keepMounted handling

- **D-13:** **Drop `keepMounted` entirely** on Completeness + Coding tabs in `QualityOverviewPage.tsx:382`. Do NOT gate hooks on `isActive` as an alternative — the simpler fix (remove the prop) is preferred; tab remount on re-entry is acceptable UX given Phase 24's `QualityMetricsCache` already handles the per-server cache hit.
- **D-14:** Verify via Network-tab smoke test: open `/quality?tab=counts` cold → observe zero `/Observation?_summary=count` or `/Observation?_getpages` requests for Completeness/Coding. Only Counts tab's own fetches fire.

### QDDEP-05: SortableTh extraction

- **D-15:** New file `src/components/quality/SortableTh.tsx`. Exports default `SortableTh` component with the exact prop shape currently duplicated in `CompletenessPanel.tsx:76` and `CodingCoveragePanel.tsx:91`. Both panels import from the new file; inline definitions deleted.
- **D-16:** No behavior change — this is a pure move. Visual regression risk is near-zero (Mantine Table.Th with sort icon).

### QDDEP-06: RunProgress component

- **D-17:** New file `src/components/quality/RunProgress.tsx`. Props: `{ run: { total: number; processed: number }; label: string }` (2 fields). Renders the `pct = total > 0 ? Math.round((processed / total) * 100) : 0` math plus the Mantine Progress/Text combination currently duplicated at the 9 inline sites.
- **D-18:** The 9 sites are in the 5 drill-downs + 3 panels + QualityOverviewPage (planner to confirm the exact locations via `grep -n "pct = total > 0"`). All collapse to `<RunProgress run={run} label="..." />`.
- **D-19:** Do NOT fold into `<DrillDownShell>` — RunProgress is used in places that don't have shells (panels, overview page). Separate component, imported where needed.

### Claude's Discretion

- Plan batching strategy — planner decides whether QDDEP-01/03 bundle (both touch coverage walkers) or split. QDDEP-02 must be its own plan (or at least its own wave) because of the locked ordering.
- Test strategy — assume TDD for QDDEP-01 (the perPathExamples population has a clean input-output contract), snapshot / render-hash for QDDEP-02 (5 drill-downs swap to shell — pre/post render parity), and standard unit tests for QDDEP-03/05/06.
- Commit granularity — one commit per QDDEP requirement preferred; atomic commits per GSD workflow.
- Whether to tidy adjacent code (e.g., `useReferenceReport.ts:79` stale `as unknown as Record` cast) — **no**. Scope stays on QDDEP-01..06; R11 (13+ cast sites) is Phase 28.

### Folded Todos

None — the 6 pending todos (MII Synthea, auto-connect on startup, date-range UX, pin resource types, external validator, OverviewStrip reduction) all belong in other phases (25-data-seed out-of-band, 26+ phases, 29-backlog UX).

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Phase-level spec
- `.planning/ROADMAP.md` §"Phase 25: Quality Module Dedup" — goal, success criteria, intra-phase order lock
- `.planning/REQUIREMENTS.md` §"Phase 25 — Quality Module Dedup" — QDDEP-01 through QDDEP-06 acceptance text (authoritative)

### Phase 24 primitives (hard dependency)
- `.planning/phases/24-data-fetching-foundation/24-SUMMARY.md` equivalents: `24-01-SUMMARY.md` (asyncRunReducer + useAsyncRun), `24-02-SUMMARY.md` (useResourceCounts cache), `24-03-SUMMARY.md` (metricsCache LRU registry), `24-04-SUMMARY.md` (4 report hooks migrated)
- `src/hooks/useAsyncRun.ts` — primitive that `useSampleWalker` wraps (QDDEP-03)
- `src/quality/metricsCache.ts` — `getQualityMetricsCache` registry that backs the completeness/coding caches (Phase 24 unchanged by this phase)

### Existing Quality module code (reference patterns)
- `src/components/quality/CodingDrillDown.tsx` (270 LOC) — largest drill-down; PARTIAL migration target
- `src/components/quality/{Plausibility,LabRanges,Duplicates,References,Completeness}DrillDown.tsx` (95-187 LOC each) — full migration targets
- `src/hooks/useCompletenessReport.ts` (167 LOC) + `src/hooks/useCodingCoverage.ts` (143 LOC) — `useSampleWalker` extraction source
- `src/components/quality/{Completeness,CodingCoverage}Panel.tsx` — `SortableTh` duplication site
- `src/components/quality/QualityOverviewPage.tsx:382` — `keepMounted` drop site

### Phase 23 gap-closure context (recent patterns to follow)
- `.planning/phases/23-v1.3-close-out/23-05-SUMMARY.md` — `autoStart:true` + memoized `patientIdsKey` pattern (applies if `useSampleWalker` takes a `patientIds` input)

### Pitfalls
- `.planning/research/PITFALLS.md` §6 (test audit for lazy routes) — Phase 27 concern, not 25 directly
- `.planning/research/PITFALLS.md` §7 (autoStart + unmemoized deps = render loop) — relevant if `useSampleWalker` accepts non-primitive inputs

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- **`useAsyncRun<T>`** (Phase 24) — `useSampleWalker<T>` wraps this; do not duplicate start/cancel/reducer logic
- **`getQualityMetricsCache(serverUrl)`** (Phase 24) — per-server LRU registry; cache invalidation is already wired via `SettingsContext.setSettings`
- **`UseAsyncRunResult<T>`** type — the shape `useSampleWalker` should expose to consumers
- **Mantine Table.Th + sort icons** — `SortableTh` is a thin wrapper; no new design needed
- **Mantine Progress + Text** — `<RunProgress>` composes these; ~10 LOC total

### Established Patterns
- **Closure-scoped `let cancelled`** (Phase 24 FOUND-04 lesson) — NOT `cancelledRef`. `useSampleWalker` must follow this.
- **Memoized key pattern** (Phase 23 Bug B fix) — if `useSampleWalker` takes array inputs (types, patientIds), memoize a `joinedKey` and put that in deps, not the raw array.
- **Cache key format** `${serverUrl}::${type}` (Phase 24) — the existing metricsCache registry key shape; extend (don't break) if `useSampleWalker` needs per-input cache keys.
- **Test file colocation** — `src/hooks/__tests__/{name}.test.tsx` for hooks, `src/components/quality/{Name}.test.tsx` for components.
- **TDD for behavioral changes** (Phase 23 D-01) — write regression tests first for any hook that changes shape.

### Integration Points
- **`QualityOverviewPage.tsx:382`** — `keepMounted` drop site (QDDEP-04)
- **`CodingDrillDown.tsx`** — switches from `useExamplesByPath` to reading `report.perPathExamples[path]` (QDDEP-01)
- **All 5 simple drill-downs** — `return <DrillDownShell ... />` replaces their current bespoke JSX (QDDEP-02)
- **`{Completeness,CodingCoverage}Panel.tsx`** — import `SortableTh` from new location (QDDEP-05)
- **9 inline `pct` sites** — replace with `<RunProgress>` (QDDEP-06)

### Test Baseline (post-Phase 23 gap closure)
- 22 pre-existing failing tests, 758 passing — any new regression from Phase 25 work must be caught in vitest before merge.
- 5 new hook test files from Phase 23 (`usePlausibilityReport.test.tsx` etc.) are the reference for deltas-based `callsBefore/callsAfter` assertion pattern if `useSampleWalker` needs similar coverage.

</code_context>

<specifics>
## Specific Ideas

- **Coding drill-down single-fetch claim** — roadmap says "single sample fetch". Concretely: after QDDEP-01, `CodingDrillDown` reads `perPathExamples` from the already-loaded `PerTypeCoverageReport` and issues ZERO additional `sampleResources` calls. The existing `useExamplesByPath` hook issued one extra call per path-open; deleting it is the halving mechanism.
- **`CodingDrillDown` body preservation** — the drill-down's per-path coding tree (CodeableConcept display) is UNIQUE to coding coverage and MUST be preserved. Only the shell chrome (title, back, status strip, progress, error) folds into `<DrillDownShell>`.
- **`keepMounted` drop — no conditional** — the straight-delete path (not the `isActive` gate) is chosen because it produces a smaller diff and matches the "no background fetching" goal exactly. Tab remount cost on re-entry is <50ms on a warm cache.

</specifics>

<deferred>
## Deferred Ideas

- **`useSampleWalker` reused outside Quality module** — no. Keep `T` generic but don't try to use it in patient-centric or explorer flows. If a future phase needs similar semantics there, lift the hook then.
- **`<DrillDownShell>` render-prop escape hatch** — no. If a future drill-down needs unique body content, it wraps the shell (like `CodingDrillDown` will) rather than extending it.
- **Cross-phase cast cleanup (R11 `as unknown as Record`)** — Phase 28. Tempting to fix adjacent sites while touching quality files, but scope creep risk + commit-per-QDDEP discipline says no.
- **`QualityMetricsContext` re-render split (R14)** — v1.5 (EFF-R14 in REQUIREMENTS.md Future Requirements).

### Reviewed Todos (not folded)

None — no pending todo triggered a match against Phase 25 scope.

</deferred>

---

*Phase: 25-quality-module-dedup*
*Context gathered: 2026-04-22 via --auto (recommended defaults locked; user can edit this file before running `/gsd-plan-phase 25`)*
