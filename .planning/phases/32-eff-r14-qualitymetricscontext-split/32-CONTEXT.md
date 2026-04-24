# Phase 32: EFF-R14 QualityMetricsContext Split - Context

**Gathered:** 2026-04-24
**Status:** Ready for planning
**Mode:** `--auto` (discuss skipped interactive Q&A; all decisions use recommended defaults)

<domain>
## Phase Boundary

Split the monolithic `QualityMetricsContext` (8 fields in one provider → every tile re-renders on any metric update) into 7 per-metric `React.createContext` symbols + a facade composer. API-preserving: `useQualityMetrics()` facade continues to return the pre-split shape so bulk consumers (`QualityOverviewPage.tsx` capture-snapshot + PDF export, `PdfReportLayout.tsx`) work without modification. Per-metric hooks (`useCompletenessRollup`, `useCoverageRollup`, `useValidationRollup`, `usePlausibilityRollup`, `useLabRangesRollup`, `useReferencesRollup`, `useDuplicatesRollup`) serve the 7 producer sites + `OverviewStrip` tiles + `QualityOverviewPage` tab labels.

**Unblocks:** Phase 35 UAT-FU-05 (per-type quality matrix) — requires per-metric context isolation so matrix cells don't force re-render of unrelated tiles.

**NOT in scope:** Any change to rollup math (rules locked in Phase 18 — `18-RESEARCH.md §% Clean Derivation`); any new metric; any UI redesign; anything under `/quality?tab=counts` matrix (that's Phase 35).

</domain>

<decisions>
## Implementation Decisions

### Approach (pre-locked in ROADMAP + REQUIREMENTS)
- **D-01:** **Option A** — 7 per-metric `React.createContext` symbols + `<QualityMetricsProviders>` composer. (REQUIREMENTS.md line 19; `research/SUMMARY.md` Decision lock.) Option B (Zustand / Jotai / other state libs) was researched and REJECTED during v1.5 requirements derivation — NOT revisitable in this phase.
- **D-02:** **7 per-metric context modules** live under `src/quality/metrics/` with exact filenames:
  - `CompletenessContext.tsx` → `useCompletenessRollup()` → `{value: number | undefined, set: (v) => void}`
  - `CoverageContext.tsx` → `useCoverageRollup()` → `{value, set}`
  - `ValidationContext.tsx` → `useValidationRollup()` → `{value, set}`
  - `PlausibilityContext.tsx` → `usePlausibilityRollup()` → `{value, set}`
  - `LabRangesContext.tsx` → `useLabRangesRollup()` → `{value, set}`
  - `ReferencesContext.tsx` → `useReferencesRollup()` → `{value, set}`
  - `DuplicatesContext.tsx` → `useDuplicatesRollup()` → `{overall: number | undefined, breakdown: DuplicatesBreakdown, contribute: (c: DuplicatesContribution | 'reset') => void}` (special shape per ROADMAP line 107)

### Composer + Facade Layout
- **D-03:** **Composite component** `<QualityMetricsProviders>` at `src/quality/metrics/index.tsx`. Wraps all 7 providers in explicit spec order: Completeness → Coverage → Validation → Plausibility → LabRanges → References → Duplicates. Mounted once in `QualityLayout.tsx` (replaces the existing `<QualityMetricsProvider>`).
- **D-04:** **Facade `useQualityMetrics()` stays at `src/quality/QualityMetricsContext.tsx`.** File path preserved to minimize import churn across the ~17 consumer sites that don't need per-metric subscription. Internals reimplemented as composition of the 7 per-metric hooks — no longer owns any `useState`. The old `QualityMetricsProvider` component is DELETED from this file; the default export surface is only `useQualityMetrics()` + type re-exports (`DuplicatesBreakdown`, `DuplicatesContribution`, `QualityMetricsContextValue`).

### Test Strategy
- **D-05:** **Per-tile isolation verified via React Profiler snapshot** — new test mounts `OverviewStrip` inside `<QualityMetricsProviders>`, triggers one `setCompleteness(42)` from a harness, then inspects `onRender` profiler callbacks to assert the Completeness tile re-rendered but the other 6 tiles did NOT. Acceptance: `actualDuration` delta for non-Completeness tiles ≤ 0 or all render counts equal 1 post-mount. (ROADMAP success criterion #3, REQUIREMENTS.md EFF-R14-04.)
- **D-06:** **7-provider smoke test** — new test mounts `<QualityMetricsProviders>`, asserts each `use<Metric>Rollup()` returns a non-null context (not the no-op fallback). Guards against accidentally sharing a single `Ctx` symbol across providers (silent 7/8 data loss risk called out in REQUIREMENTS.md EFF-R14-02).
- **D-07:** **Every provider value wrapped in `useMemo`** — reproduces the existing `QualityMetricsContext.tsx:142-171` pattern across all 7 new providers. ROADMAP success criterion #6 explicitly warns: *"no 'Maximum update depth exceeded' from missing useMemo on provider values."*

### Migration Sweep
- **D-08:** **7 producer sites migrate to per-metric hooks**, exact locations from REQUIREMENTS.md EFF-R14-05:
  - `src/hooks/useCompletenessReport.ts:42` — `useQualityMetrics().setCompleteness` → `useCompletenessRollup().set`
  - `src/hooks/useCodingCoverage.ts:41` — `setCoverage` → `useCoverageRollup().set`
  - `src/components/quality/ValidationPanel.tsx:200` — `setOverallValidation` → `useValidationRollup().set`
  - `src/components/quality/PlausibilityPanel.tsx:109` — `setOverallPlausibility` → `usePlausibilityRollup().set`
  - `src/components/quality/LabRangesPanel.tsx:51` — `setOverallLabRanges` → `useLabRangesRollup().set`
  - `src/components/quality/ReferencesPanel.tsx:69` — `setOverallReferences` → `useReferencesRollup().set`
  - `src/components/quality/DuplicatesPanel.tsx:102` — `setDuplicatesContribution` → `useDuplicatesRollup().contribute`
- **D-09:** **Per-metric consumer migrations** (REQUIREMENTS.md EFF-R14-04):
  - `src/components/quality/OverviewStrip.tsx:67-98` — 7 tiles each call their specific `use<Metric>Rollup()` instead of destructuring `useQualityMetrics()`.
  - `src/components/quality/QualityOverviewPage.tsx:444-462` — tab labels subscribe per-metric.
  - Bulk consumers (`QualityOverviewPage.tsx:220-245` capture-snapshot, `QualityOverviewPage.tsx:247-328` PDF export, `PdfReportLayout.tsx`) keep calling `useQualityMetrics()` — the facade preserves their reads.
- **D-10:** **Test wrapper migration — single drop-in replace.** All 8 test files currently wrapping with `<QualityMetricsProvider>` swap to `<QualityMetricsProviders>`. ROADMAP success criterion #6 mandates *"zero new test-setup boilerplate per wrapper."* Find via `grep -rln "QualityMetricsProvider" src/ --include="*.test.*" --include="*.tsx"`.

### Commit Cadence
- **D-11:** **Incremental per-metric plan landings** (ROADMAP line 111: *"~20 files modified; incremental per-metric landings preferred to one big-bang commit"*). Proposed plan decomposition (for the planner to finalize):
  - **Plan 32-01:** Scaffold — create 7 `metrics/*.tsx` files + `metrics/index.tsx` composer, no consumer migration yet. Mount the composer alongside the legacy provider temporarily so nothing breaks.
  - **Plan 32-02:** Facade rewrite — `QualityMetricsContext.tsx` reimplemented as facade over the 7 new hooks. Legacy `QualityMetricsProvider` removed; composer replaces it in `QualityLayout.tsx`. Bulk test wrappers migrate.
  - **Plan 32-03:** Producer + consumer migration — 7 producer sites + `OverviewStrip` + `QualityOverviewPage` tab labels switch to per-metric hooks.
  - **Plan 32-04:** Tests — React Profiler per-tile isolation test + 7-provider smoke test + full regression pass (≥ 868 passing — Phase 31 baseline).
- **D-12:** **Each plan ends with a green `npm test` + `npx tsc -b --noEmit`.** No "broken but fixed in next plan" intermediate states — the facade preservation invariant makes this possible (old API keeps working through every step).

### Coordination with Phase 31
- **D-13:** **Merge-conflict surface — already resolved.** ROADMAP called out `ValidationPanel.tsx` as the rebase hot-spot. Phase 31 shipped 2026-04-23 and added the Active-strategy status line + `phiGateUrl` derivation. Phase 32 only touches `ValidationPanel.tsx:200` (the `setOverallValidation` call) — Phase 31's SUMMARY explicitly confirms this site was *"UNCHANGED by Phase 31"* (`31-01-SUMMARY.md:246`). **No rebase needed; no merge conflict.**

### Claude's Discretion
- Internal file organization within each `metrics/*.tsx` (one-file-per-context chosen for D-02 consistency, but co-located tests vs `__tests__/` is planner's call).
- Whether `useMemo` dependency arrays are per-value or use the React DevTools-recommended pattern — planner picks.
- Exact naming of the React Profiler test file (e.g., `OverviewStrip.isolation.test.tsx` vs `metrics-isolation.test.tsx`).
- Whether to co-locate the 7-provider smoke test with the composer (`metrics/index.test.tsx`) or in `__tests__/`.

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### ROADMAP + Requirements
- `.planning/ROADMAP.md` lines 101-112 — Phase 32 goal, success criteria (6 items), effort estimate.
- `.planning/REQUIREMENTS.md` lines 38-47 — EFF-R14-01..EFF-R14-06 acceptance criteria (the binding contract).
- `.planning/REQUIREMENTS.md` line 19 — locks Option A; Option B (state lib) is rejected.

### Prior phase context
- `.planning/phases/27-efficiency-polish/27-CONTEXT.md:143` — documents the original v1.4 EFF-R14 risk-deferral and forward pointer to v1.5.
- `.planning/phases/31-ux-01-external-validator-cascade/31-01-SUMMARY.md:243-247` — confirms `ValidationPanel.tsx:200` (Phase 32 producer site) is UNTOUCHED by Phase 31.

### Locked rollup math (non-negotiable)
- `.planning/phases/18-quality-alerting-and-thresholds/*-RESEARCH.md §% Clean Derivation` — per-metric rollup formulas. Phase 32 preserves the math; do NOT re-derive.
- `src/quality/QualityMetricsContext.tsx:1-30` — JSDoc on the existing context documents each rollup rule and the RESOLVED 2026-04-14 per-type averaging decision for Duplicates. **Port this JSDoc to the new per-metric modules verbatim** (or split per-metric).

### Existing code to port
- `src/quality/QualityMetricsContext.tsx` (201 lines) — current monolithic source. Contains `deriveOverallDuplicates`, `DuplicatesBreakdown`, `DuplicatesContribution` which must move to `DuplicatesContext.tsx` intact.

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- **`deriveOverallDuplicates(b: DuplicatesBreakdown)`** at `src/quality/QualityMetricsContext.tsx:96-105` — pure function, moves to `DuplicatesContext.tsx` verbatim.
- **`EMPTY_DUPLICATES_BREAKDOWN`** constant at `src/quality/QualityMetricsContext.tsx:94` — moves to `DuplicatesContext.tsx`.
- **`DuplicatesBreakdown` + `DuplicatesContribution` types** at `src/quality/QualityMetricsContext.tsx:46-59` — re-exported from `DuplicatesContext.tsx`, then re-re-exported from the facade for consumer-path preservation.

### Established Patterns
- **`useMemo` on provider `value`** — all 7 new providers follow `src/quality/QualityMetricsContext.tsx:142-171`. Dep arrays include the state tuple + stable setters.
- **No-op fallback outside provider** — `useQualityMetrics():179-200` returns a complete no-op object when `ctx` is null. Replicate per-metric: `use<Metric>Rollup()` outside its provider returns `{value: undefined, set: () => {}}`. This is load-bearing for isolated unit tests.
- **`useCallback` on setters with empty deps** — `setDuplicatesContribution` at `:117-135` uses functional `setState` updater + `useCallback([], [])`. Per-metric setters follow the same idiom (they're just `useState` setters, which are already stable — but wrap for clarity).

### Integration Points
- **`QualityLayout.tsx`** — currently wraps the quality routes in `<QualityMetricsProvider>`. Replace with `<QualityMetricsProviders>`. Single-line change.
- **7 producer files** — enumerated in D-08.
- **2 consumer files** needing per-metric subscriptions — `OverviewStrip.tsx:67-98`, `QualityOverviewPage.tsx:444-462`.
- **2-3 bulk-read consumer files** staying on facade — `QualityOverviewPage.tsx:220-245` (capture), `QualityOverviewPage.tsx:247-328` (PDF export), `src/components/quality/PdfReportLayout.tsx`.
- **8 test files** wrapping with `<QualityMetricsProvider>` — single-line rename to `<QualityMetricsProviders>` each.

</code_context>

<specifics>
## Specific Ideas

- **Facade JSDoc carryover:** The current `src/quality/QualityMetricsContext.tsx:1-30` JSDoc documenting rollup rules is load-bearing — downstream readers rely on it. Split the JSDoc per-metric into each new `metrics/<Name>Context.tsx` (e.g., `CompletenessContext.tsx` gets lines 8-9 about arithmetic mean of populated/total; `DuplicatesContext.tsx` gets lines 17-23 about the RESOLVED 2026-04-14 decision).
- **Naming consistency with hooks layer:** `useCompletenessRollup` matches the existing `useCompletenessReport` naming — both are "per-metric hooks" at slightly different layers (rollup = context subscription; Report = producer). Keep the naming symmetry.
- **Profiler test brittleness:** Per-tile isolation tests relying on React Profiler can flake with React 18's batching. Use `React.Profiler` directly, not `jest.spyOn(React, 'createElement')` — safer and already used elsewhere in the tree if present. If flaky, the planner may fall back to render-count assertion via `Component.render` spies.

</specifics>

<deferred>
## Deferred Ideas

- **Zustand / Jotai migration** — locked REJECTED during v1.5 requirements phase. Re-raise only if Option A materially underperforms in profiler measurements (it won't — this is a read-only split).
- **Per-metric type-level isolation in the matrix tab (Phase 35 UAT-FU-05)** — belongs in Phase 35, not this phase. Phase 32 only delivers per-metric context symbols; the per-TYPE slot fields inside those contexts are Phase 35's concern.
- **Selector-level memoization (e.g., `use<Metric>RollupSelector(sel)`)** — not required by REQUIREMENTS. If a consumer later only needs `overall` without `breakdown`, add in a future phase. Not speculative-abstraction-bait for now.
- **Context -> Store migration for server-push-style updates** — speculative; nothing in v1.5 requires it.

### Reviewed Todos (not folded)
None — no pending todos matched Phase 32 scope at this time.

</deferred>

---

*Phase: 32-eff-r14-qualitymetricscontext-split*
*Context gathered: 2026-04-24*
*Mode: --auto (6 gray areas resolved with recommended defaults)*
