# Roadmap: FHIR Exploder

## Milestones

- ✅ **v1.0 -- MVP (shipped 2026-04-12)** -- [Archive](milestones/v1.0-ROADMAP.md) . [Requirements](milestones/v1.0-REQUIREMENTS.md)
- ✅ **v1.1 -- UX Polish & Data Export (shipped 2026-04-12)** -- [Archive](milestones/v1.1-ROADMAP.md) . [Requirements](milestones/v1.1-REQUIREMENTS.md)
- ✅ **v1.2 -- Tech Debt & Quality Monitoring (shipped 2026-04-15)** -- [Archive](milestones/v1.2-ROADMAP.md) . [Requirements](milestones/v1.2-REQUIREMENTS.md)
- ✅ **v1.3 -- Cohort Definition & Storage (shipped 2026-04-16)** -- [Archive](milestones/v1.3-ROADMAP.md) . [Requirements](milestones/v1.3-REQUIREMENTS.md) . [Audit](milestones/v1.3-MILESTONE-AUDIT.md)
- 🚧 **v1.4 -- Hardening & Tech-Debt Sweep (in progress, started 2026-04-16)** -- phases 23-29, 31 requirements

## Deferred Items

- **EFF-R14** (deferred from v1.4 Phase 27 to v1.5+): Split `QualityMetricsContext` so any single metric update re-renders only its own tile. Recommended approach: per-metric context providers (Option A), NOT `useSyncExternalStore`. Deferred because actual user-visible re-render cost is low (≤8 panels) while refactor blast radius touches ~20 files.

---

## Phases

<details>
<summary>✅ v1.2 Tech Debt & Quality Monitoring (Phases 14-20) — SHIPPED 2026-04-15</summary>

- [x] Phase 14: Tech Debt Cleanup (2/2 plans) — completed 2026-04-13
- [x] Phase 15: Quality Check Engine & Drill-Down (3/3 plans) — completed 2026-04-13
- [x] Phase 16: Conformance & Plausibility Checks (4/4 plans) — completed 2026-04-14
- [x] Phase 17: Duplicate Detection & Relational Integrity (3/3 plans) — completed 2026-04-14
- [x] Phase 18: Quality Alerting & Thresholds (4/4 plans) — completed 2026-04-14
- [x] Phase 19: Quality Trends & PDF Reports (3/3 plans) — completed 2026-04-14
- [x] Phase 20: v1.2 Milestone Gap Closure (3/3 plans) — completed 2026-04-14

Full details: [milestones/v1.2-ROADMAP.md](milestones/v1.2-ROADMAP.md)

</details>

<details>
<summary>✅ v1.3 Cohort Definition & Storage (Phases 21-22) — SHIPPED 2026-04-16</summary>

- [x] Phase 21: Interactive Cohort Builder + Rename (6/6 plans) — completed 2026-04-16
- [x] Phase 22: Programmatic Cohort Definition (FHIRPath + FDPG) (3/3 plans) — completed 2026-04-16

Full details: [milestones/v1.3-ROADMAP.md](milestones/v1.3-ROADMAP.md)

</details>

### 🚧 v1.4 Hardening & Tech-Debt Sweep (Phases 23-29)

- [x] **Phase 23: v1.3 Close-Out** — Close v1.3 warnings, UAT, and audit sign-off (must ship first) (completed 2026-04-17)
- [x] **Phase 24: Data-Fetching Foundation** — Cross-mount count cache, LRU quality-metrics registry, shared `useAsyncRun` state machine (completed 2026-04-17)
- [x] **Phase 25: Quality Module Dedup** — `useSampleWalker`, `<DrillDownShell>`, `perPathExamples`, drop `keepMounted`, shared `SortableTh` / `<RunProgress>` (completed 2026-04-22)
- [ ] **Phase 26: App-Shell Dedup** — `<ConnectionGatedOutlet>`, `searchByIdentifierPrefix`, sidebar nested-route activation, `Anchor component={Link}` standardization
- [ ] **Phase 27: Efficiency Polish** — `ResourceIssueTable` pagination memo, `React.lazy()` drill-down routes, bundle analyzer
- [ ] **Phase 28: Micro-Consistency Sweep** — `toRecord` helper replacement, en/em-dash unification, drop stale `eslint-disable`s, ref-type fixes
- [ ] **Phase 29: Backlog UX** — External FHIR validator (T1), OverviewStrip 9→7 + status-line header (T2)

### 📋 Backlog (unscheduled — 999.x)

- [ ] **Phase 999.1: MII extension modules + UI redesign** — Add the 14 MII Kerndatensatz extension modules (Onkologie, Kardiologie, Intensivmedizin, Bildgebung, Pathologie, Mikrobiologie, Molekulargenetik, Seltene Erkrankungen, Symptom, Biobank, Studie, Dokument, MTB, PRO). Requires schema change (multi-resource-type per module), UI grouping (base vs extension, 21 tabs don't fit flat), empty-state handling for zero-resource modules, patient search param per module (some use `subject=` not `patient=`), and Mantine color strategy for 21 distinct modules. Promote to active phase during v1.5 planning.

## Phase Details

### Phase 23: v1.3 Close-Out
**Goal**: Flip v1.3 milestone status from `tech_debt` to `shipped-clean` by closing three documented code review warnings, two cosmetic integration notes, eight human UAT items, and the outstanding nyquist audit gate.
**Depends on**: Nothing (must ship first; v1.3 correctness-fix bucket)
**Requirements**: CLOSE-01, CLOSE-02, CLOSE-03, CLOSE-04, CLOSE-05, CLOSE-06, CLOSE-07
**Success Criteria** (what must be TRUE):
  1. All 3 v1.3 code review warnings (W1 closure-capture, W2 quota probe, W3 truncation false-positive) are closed in code with matching regression tests (W3 has a 5-case test matrix covering dedupe-vs-input-count).
  2. Both v1.3 cosmetic integration notes (I1 `FhirpathLike` alias, I2 stale toast name) are closed in code.
  3. 8 human UAT items (U1-U8) are executed against a live Blaze server and recorded in `21-UAT.md` / `22-HUMAN-UAT.md`; any blockers are escalated as explicit follow-up warnings.
  4. `nyquist_compliant: true` is flipped in both Phase 21 and Phase 22 VALIDATION.md once UAT is green.
  5. `/gsd-audit-milestone v1.3` verdict flips to `shipped-clean`.
**Plans**: TBD
**Effort**: ~1 day + UAT time with live Blaze

### Phase 24: Data-Fetching Foundation
**Goal**: Make the FHIR fetch layer cache-aware and cancellation-safe so later phases can build on it without re-litigating these questions. Absorbs the line-75 `useResourceCounts` memoization and the `useResourceCounts.ts:29` `cancelledRef` latent-bug pre-fix while the file is already being touched.
**Depends on**: Phase 23
**Requirements**: FOUND-01, FOUND-02, FOUND-03, FOUND-04
**Success Criteria** (what must be TRUE):
  1. Switching between `/` (dashboard), `/explorer`, and `/quality` does not re-issue per-type `_summary=count` requests for resource types already fetched in the same server session.
  2. `metricsCache.ts` exposes a `Map<serverUrl, QualityMetricsCache>` registry with 2-entry LRU eviction on insert; a settings change clears the current-server entry even when `serverUrl` is unchanged.
  3. `useAsyncRun` hook owns `{status, progress, errorMessage, cancel, run}` orchestration using the closure-scoped `let cancelled` pattern (NOT `cancelledRef`); the 4 report hooks (`usePlausibilityReport`, `useLabRangesReport`, `useDuplicateReport`, `useReferenceReport`) each shrink to ≤ 40 lines without introducing new `as` casts in consumer panels.
  4. `useResourceCounts.ts:29` latent cancellation bug is fixed in the same PR.
**Plans**: 4 plans
- [x] 24-01-PLAN.md — Introduce `useAsyncRun` primitive (reducer + hook + tests)
- [x] 24-02-PLAN.md — Refactor `useResourceCounts` with session cache, closure-scoped cancellation, typesKey memo
- [x] 24-03-PLAN.md — Add `Map<serverUrl, QualityMetricsCache>` registry, migrate completeness/coding, wire `setSettings` + SettingsPage to clear both caches
- [x] 24-04-PLAN.md — Migrate plausibility / labRanges / duplicate / reference report hooks to `useAsyncRun`
**Effort**: ~1.5 days

### Phase 25: Quality Module Dedup
**Goal**: Collapse the parallel-development duplication in the Quality module before the next Quality feature lands. Coding drill-down server calls halved; ≥ 400 duplicated lines removed.
**Depends on**: Phase 24 (`useAsyncRun`, `Map<serverUrl>` registry are prerequisites); strict intra-phase ordering: R5 (QDDEP-01 `perPathExamples`) BEFORE R3 (QDDEP-02 `<DrillDownShell>`) so the shell can be designed for truly-symmetric drill-downs.
**Requirements**: QDDEP-01, QDDEP-02, QDDEP-03, QDDEP-04, QDDEP-05, QDDEP-06
**Success Criteria** (what must be TRUE):
  1. `useExamplesByPath` is deleted; `PerTypeCoverageReport` carries `perPathExamples: Record<string, CodeableConcept>` populated inside `codingCoverageWalker`; coding drill-down issues a single sample fetch.
  2. `<DrillDownShell>` (props interface ≤ 6 fields) renders all 5-6 drill-downs; repo-wide LOC delta shows ≥ 400 lines removed across the 5 drill-down files.
  3. `useCompletenessReport` and `useCodingCoverage` each ≤ 30 lines and both delegate their worker-pool + seeding + recursion to `useSampleWalker<T>`; per-metric rollup stays in the wrapper hooks (not lifted into the shared walker).
  4. Opening `/quality?tab=counts` no longer fires background Completeness / Coding sampling (`keepMounted` dropped or hooks gated on `isActive`).
  5. Repo-wide grep shows a single `SortableTh` definition at `src/components/quality/SortableTh.tsx`; the 9 inline `pct = total > 0 ? Math.round(...) : 0` sites collapse to `<RunProgress run={run} label="..."/>`.
**Plans**: 4 plans
- [x] 25-01-PLAN.md — QDDEP-01: perPathExamples populated in codingCoverageWalker; delete useExamplesByPath; CodingDrillDown reads from report (TDD)
- [x] 25-02-PLAN.md — QDDEP-03 + QDDEP-05 + QDDEP-06 bundled: useSampleWalker<T> extraction + SortableTh extraction + RunProgress extraction (3 atomic commits)
- [x] 25-03-PLAN.md — QDDEP-02: DrillDownShell component + migrate 5 simple drill-downs + PARTIAL CodingDrillDown wrap
- [x] 25-04-PLAN.md — QDDEP-04: drop keepMounted on Completeness + Coding Tabs.Panel; add cold-open sampling-idle regression test
**Effort**: ~2 days
**UI hint**: yes

### Phase 26: App-Shell Dedup
**Goal**: Dedupe the route-layer and search-layer duplication across the three layouts and two list pages.
**Depends on**: Phase 23 (independent of Phase 24 per ARCHITECTURE research correction — parallel-safe)
**Requirements**: SHELL-01, SHELL-02, SHELL-03, SHELL-04, SHELL-05
**Success Criteria** (what must be TRUE):
  1. `ExplorerLayout`, `PatientsLayout`, and `QualityLayout` each ≤ 30 lines and share a single `<ConnectionGatedOutlet>` render-prop primitive that owns only the "Not connected" alert (NOT the `MedplumProvider` wrapping); the existing `quality-layout.test.tsx` legacy-migration test passes unchanged.
  2. Wildcard identifier-search logic lives in a single `searchByIdentifierPrefix(client, type, prefix, { limit, pageSize })` helper consumed by both `SearchResultsPage` and `PatientListPage`.
  3. Navigating to `/patients/123`, `/explorer/Patient/1`, or `/quality/plausibility/Observation` highlights the corresponding sidebar section root via `RouterNavLink`'s native `isActive`.
  4. Internal links across `CompletenessPanel`, `SearchResultsPage`, `PatientListPage`, `ResourceCountsPanel`, `CodingCoveragePanel` use `Anchor component={Link}` with Mantine theme colors; no inline `style={{ color: 'var(--mantine-color-blue-6)' }}`.
  5. `SettingsContext.tsx:32` has no `eslint-disable-next-line react-hooks/exhaustive-deps`; `setSettings` is `useCallback`-wrapped.
**Plans**: 3 plans
- [ ] 26-01-PLAN.md — SHELL-01: ConnectionGatedOutlet render-prop primitive + migrate 3 layouts + Wave 0 legacy-migration test
- [ ] 26-02-PLAN.md — SHELL-02 + SHELL-04 + SHELL-05 bundle: searchByIdentifierPrefix helper + CompletenessPanel Anchor+Link migration + SettingsContext useCallback
- [ ] 26-03-PLAN.md — SHELL-03: Sidebar useMatch for nested-route activation
**Effort**: ~1 day
**UI hint**: yes

### Phase 27: Efficiency Polish
**Goal**: Cut render-time and bundle-size waste that won't surface in the profiler until it hurts users. R14 (`QualityMetricsContext` re-render split) is deferred to v1.5; the v1.4 scope is pagination memoization + lazy routes + bundle visibility.
**Depends on**: Phase 23 (R15 lazy routes independent of Phase 24; the `useResourceCounts` line-75 memoization is absorbed into Phase 24 per dependency analysis)
**Requirements**: EFF-01, EFF-02, EFF-03
**Success Criteria** (what must be TRUE):
  1. `ResourceIssueTable` pagination slice (`filtered.slice(...)`) is computed inside the existing `useMemo`, not on every render of the table component.
  2. The 6 drill-down routes (`completeness/:type`, `coding/:type`, `plausibility/:type`, `lab-ranges/:type`, `duplicates/:type`, `references/:type`) plus `/quality/thresholds` load via `React.lazy()` with a global Suspense fallback (`data-testid="route-loading"`) and chunk-load retry (`retry(() => import(...), 3)`); all `render(<App />)` tests that assert lazy-loaded content use `findBy*`.
  3. `npm run analyze` (guarded by `ANALYZE=1`) emits a `bundle-stats.html` treemap via `rollup-plugin-visualizer@^7.0.1` showing the quality drill-downs as separate chunks.
**Plans**: TBD
**Effort**: ~1.5 days

### Phase 28: Micro-Consistency Sweep
**Goal**: Mechanical, low-risk cleanup of the casts, dashes, and stale disable-pragmas accumulated across v1.0–v1.3. Absorbs the four `eslint-disable-next-line react-hooks/exhaustive-deps` on drill-down auto-start effects (made obsolete by Phase 24's `useAsyncRun`).
**Depends on**: Phase 25 (must run after Quality Module Dedup so the drill-down file bodies are stable) AND Phase 24 (for the `useAsyncRun`-absorbed `eslint-disable`s)
**Requirements**: SWEEP-01, SWEEP-02, SWEEP-03, SWEEP-04
**Success Criteria** (what must be TRUE):
  1. Repo-wide grep for `as unknown as Record<string, unknown>` returns 0 results; all 13+ sites use the existing `toRecord` helper from `src/utils/fhir-helpers.ts`.
  2. En-dash (`–`) and em-dash (`—`) usage unified across `PlausibilityDrillDown.tsx:68`, `ResourceIssueTable.tsx:158`, and siblings: `—` for separators, `–` for numeric ranges.
  3. The 4 drill-down `eslint-disable-next-line react-hooks/exhaustive-deps` lines on auto-start effects (`PlausibilityDrillDown.tsx:52`, `LabRangesDrillDown.tsx:50`, `DuplicatesDrillDown.tsx:49`, `ReferencesDrillDown.tsx:49`) are removed; no new disables introduced.
  4. `useRef` types on Back-button refs in `CompletenessDrillDown.tsx:44` and `CodingDrillDown.tsx:101` use `HTMLButtonElement` (or `HTMLElement`); `QualityLayout` legacy-migration essay moved into `migrateLegacyResourceTypeKey` body; `useState(() => …)` replaces the inline `eslint-disable-line` for `initialFromUrl` snapshot in `PatientListPage.tsx:70`.
**Plans**: TBD
**Effort**: ~0.5 day

### Phase 29: Backlog UX
**Goal**: Two pending-todo UX items logged from prior user feedback. Intra-phase ordering: T2 (UX-02 OverviewStrip) BEFORE T1 (UX-01 External validator) — the smaller UI task warms up before the L-effort validator cascade.
**Depends on**: Phase 23 (independent of refactor thread — parallel-safe with 25/26/27)
**Requirements**: UX-01, UX-02
**Success Criteria** (what must be TRUE):
  1. `settings.yaml` accepts a `validation.externalValidator: { url, enabled, timeoutMs }` block; `ValidationPanel` cascades external → server `$validate` → local checker, predicated on a capability probe cached per `serverUrl`.
  2. Every external-validator `fetch` is wrapped in `AbortController` with a configurable timeout (default 15s) AND routed through the existing Phase 7 PHI acknowledgment gate (regression-tested: no fetch fires before user consent); on timeout the cascade falls back to local checker with a visible toast.
  3. `ValidationPanel` renders an "Active strategy: external / server / local" status line per resource type; OperationOutcome issues are normalized via a unit-tested `normalizeOperationOutcomeIssue` mapper into the existing `NormalizedIssue` type.
  4. `OverviewStrip` shows 7 ring tiles (Total resources + Resource types dropped) and a status line above reads `N resources · M types · Last computed {relative-time}`; `18-UI-SPEC.md` updated and PDF export reflects the new tile layout. Cardinality entries remain non-clickable.
  5. Both pending-todos move from `.planning/todos/pending/` to `.planning/todos/completed/`.
**Plans**: TBD
**Effort**: ~2 days
**UI hint**: yes

## Dependencies & Ordering

```
Phase 23 (close v1.3) ─┬─▶ Phase 24 (fetch foundation, incl. line-75 useResourceCounts memo)
                       │      │
                       │      ├─▶ Phase 25 (quality dedup — uses useSampleWalker, useAsyncRun)
                       │      │      │
                       │      │      └─▶ Phase 28 (micro-sweep; absorbs eslint-disables)
                       │
                       ├─▶ Phase 26 (app-shell dedup — independent of 24, parallel-safe)
                       │
                       ├─▶ Phase 27 (efficiency polish — R15 independent of 24)
                       │
                       └─▶ Phase 29 (UX backlog — independent; T2 before T1 intra-phase)
```

**Key ordering constraints:**
- Phase 23 ships first (correctness bugs).
- Phase 24 unblocks Phase 25 (`useAsyncRun` + `Map<serverUrl>` registry are prerequisites for QDDEP-03 `useSampleWalker`).
- Phase 26 is INDEPENDENT of Phase 24 — parallel-safe after Phase 23.
- Phase 25 intra-phase: R5 (QDDEP-01 `perPathExamples`) BEFORE R3 (QDDEP-02 `<DrillDownShell>`) so the shell is designed for truly-symmetric drill-downs.
- Phase 28 runs AFTER Phase 25 (to absorb drill-down file churn) AND AFTER Phase 24 (for the `useAsyncRun`-absorbed disables).
- Phase 27 + 29 parallel-safe with 25/26.
- Phase 29 intra-phase: T2 (UX-02) before T1 (UX-01) — warm-up then L-task.

## Progress

| Phase | Milestone | Plans Complete | Status | Completed |
|-------|-----------|----------------|--------|-----------|
| 14-20 (v1.2) | v1.2 | 22/22 | ✅ Shipped | 2026-04-15 |
| 21-22 (v1.3) | v1.3 | 9/9 | ✅ Shipped | 2026-04-16 |
| 23. v1.3 Close-Out | v1.4 | 7/7 | Complete    | 2026-04-22 |
| 24. Data-Fetching Foundation | v1.4 | 4/4 | Complete    | 2026-04-17 |
| 25. Quality Module Dedup | v1.4 | 4/4 | Complete    | 2026-04-22 |
| 26. App-Shell Dedup | v1.4 | 0/3 | 📋 Planned | — |
| 27. Efficiency Polish | v1.4 | 0/? | 📋 Not started | — |
| 28. Micro-Consistency Sweep | v1.4 | 0/? | 📋 Not started | — |
| 29. Backlog UX | v1.4 | 0/? | 📋 Not started | — |

### Phase 999.1: MII extension modules + UI redesign (BACKLOG)
**Goal**: Extend MII Kerndatensatz module coverage from the current 7 base modules to all 21 modules (7 base + 14 extension) per the official MII Basismodule page and SIMPLIFIER.net catalog. Requires UI design for 21-module presentation (grouped tabs, collapsible extension section, or search/filter).
**Depends on**: Promotion to active phase during v1.5 planning. Not scheduled in v1.4.
**Scope**:
  - **Base modules complete** (added in v1.4, Phase 26 sideband): Person, Fall, Consent, Diagnose, Prozedur, Laborbefund, Medikation
  - **Extension modules to add** (14): Onkologie (Condition, Procedure), Kardiologie (Observation), Intensivmedizin/ICU (Observation), Bildgebung (DiagnosticReport, ImagingStudy), Pathologie (DiagnosticReport, Specimen), Mikrobiologie (DiagnosticReport, Observation), Molekulargenetik (DiagnosticReport, Observation), Seltene Erkrankungen (Condition), Symptom/Phänotyp (Observation), Biobank (Specimen), Studie (ResearchStudy), Dokument (DocumentReference), Molekulares Tumorboard/MTB (ServiceRequest), PRO/Patient-Reported Outcomes (Observation)
**Design requirements** (v1.5 design phase):
  1. Schema change: `fhirResourceType: string` → `fhirResourceType: string | string[]` (several modules span multiple types)
  2. Module category field: `category: 'base' | 'extension'` for UI grouping
  3. Patient search param per module: some extension modules (Specimen, DocumentReference, ResearchStudy) use `subject=` not `patient=`
  4. UI: 21 tabs don't fit flat — options include (a) base-tabs-strip + dropdown for extension, (b) collapsible "Extension Modules" section, (c) search/filter across all 21
  5. Empty-state UX: extension modules typically have 0 resources on stock Blaze — display prominently
  6. Color strategy: Mantine 8's 14 colors can't accommodate 21 distinct modules — consider per-category color palette or shape/icon differentiation
  7. Relevance filtering: optionally hide extension modules for a patient with no matching resources (e.g., no Onkologie tab if no Condition with oncology ICD)
**Sources**:
  - https://www.medizininformatik-initiative.de/de/basismodule-des-kerndatensatzes-der-mii
  - https://simplifier.net/organization/koordinationsstellemii (all 21 packages published by MII Koordinationsstelle)
  - https://simplifier.net/medizininformatikinitiative-kerndatensatz (Manteldokument — authoritative cross-module spec)
**Requirements**: MII-EXT-01..14 (to be created when promoted)
**Effort estimate**: ~3-4 engineering days + design review (UX for 21-module presentation). Split candidate: split into MII-EXT-A (schema change + base-module-only UI refactor) and MII-EXT-B (14 extension modules added incrementally).

## Effort Totals (v1.4)

| Phase | Theme | Estimated Effort |
|-------|-------|------------------|
| 23 | v1.3 Close-Out | ~1 day + UAT time with live Blaze |
| 24 | Data-Fetching Foundation | ~1.5 days |
| 25 | Quality Module Dedup | ~2 days |
| 26 | App-Shell Dedup | ~1 day |
| 27 | Efficiency Polish | ~1.5 days |
| 28 | Micro-Consistency Sweep | ~0.5 day |
| 29 | Backlog UX | ~2 days |
| **Total** | — | **~9-10 focused engineering days** |

## Research References (v1.4)

- `.planning/research/SUMMARY.md` — synthesis (3 safety invariants: closure-scoped `let cancelled`, 2-entry LRU on `Map<serverUrl>`, PHI gate routing through existing Phase 7 gate; R14 deferred to v1.5)
- `.planning/research/STACK.md` — 1 devDep (`rollup-plugin-visualizer@^7.0.1`), 0 runtime deps
- `.planning/research/ARCHITECTURE.md` — 6 integration questions answered with file:line evidence; build-order correction (Phase 26 parallel with Phase 24)
- `.planning/research/FEATURES.md` — T1/T2 table-stakes / differentiators / anti-features
- `.planning/research/PITFALLS.md` — 11 critical pitfalls with Warning Signs / Prevention Strategy / Phase mapping
- `.planning/v1.4-PLAN-DRAFT.md` — original phase decomposition (used as input)
- `.planning/CODE-REVIEW-2026-04-16.md` — 15 findings (R1-R15) driving the refactor thread
