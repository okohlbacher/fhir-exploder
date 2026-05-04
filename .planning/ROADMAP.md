# Roadmap: FHIR Exploder

## Milestones

- ✅ **v1.0 -- MVP (shipped 2026-04-12)** -- [Archive](milestones/v1.0-ROADMAP.md) . [Requirements](milestones/v1.0-REQUIREMENTS.md)
- ✅ **v1.1 -- UX Polish & Data Export (shipped 2026-04-12)** -- [Archive](milestones/v1.1-ROADMAP.md) . [Requirements](milestones/v1.1-REQUIREMENTS.md)
- ✅ **v1.2 -- Tech Debt & Quality Monitoring (shipped 2026-04-15)** -- [Archive](milestones/v1.2-ROADMAP.md) . [Requirements](milestones/v1.2-REQUIREMENTS.md)
- ✅ **v1.3 -- Cohort Definition & Storage (shipped 2026-04-16)** -- [Archive](milestones/v1.3-ROADMAP.md) . [Requirements](milestones/v1.3-REQUIREMENTS.md) . [Audit](milestones/v1.3-MILESTONE-AUDIT.md)
- ✅ **v1.4 -- Hardening & Tech-Debt Sweep (shipped 2026-04-23)** -- [Archive](milestones/v1.4-ROADMAP.md) . [Requirements](milestones/v1.4-REQUIREMENTS.md) . [Audit](milestones/v1.4-MILESTONE-AUDIT.md)
- ✅ **v1.5 -- Validation, Performance & MII Extensions (shipped 2026-04-29)** -- [Archive](milestones/v1.5-ROADMAP.md) . [Requirements](milestones/v1.5-REQUIREMENTS.md) . [Audit](milestones/v1.5-MILESTONE-AUDIT.md)
- ✅ **v1.6 -- Hardening, UX Polish & Carry-Overs (shipped 2026-04-30)** -- [Archive](milestones/v1.6-ROADMAP.md) . [Requirements](milestones/v1.6-REQUIREMENTS.md)
- ✅ **v1.7 -- Resource Navigation (shipped 2026-05-04)** -- [Archive](milestones/v1.7-ROADMAP.md) . [Requirements](milestones/v1.7-REQUIREMENTS.md) . [Audit](milestones/v1.7-MILESTONE-AUDIT.md)

## Deferred Items

Carried to v1.8 (re-evaluate at milestone-new):

- **STACK-01 (Mantine 9 / React 19 upgrade — second WAIVE-AND-DEFER 2026-05-02):** Two consecutive gate failures (v1.6 Phase 45 + v1.7 Phase 50). Gate now MIXED — React 19 open (`^18.0.0 || ^19.0.0`), Mantine 9 still closed (`^8.0.0`) by `@medplum/react@5.1.10`. User decision D-02 keeps React/Mantine coupled until both gates open. **Re-attempt trigger:** `npm view @medplum/react peerDependencies`. Reactivation: `milestones/v1.7-phases/50-*/50-CONTEXT.md` + `50-SUMMARY.md`.
- **Reverse-reference CapabilityStatement-driven discovery** — curated catalog ships v1.7 (REVR-01); defer CapabilityStatement-driven until real-world gaps surface.
- **Graph view G2 — schema graph** — interactive FHIR resource type graph (static, server-independent). Defer until G1 validated.
- **Graph view depth > 3** — React Flow handles it but UX needs design.
- **Reference resolution prefetch** — lazy is sufficient until observed otherwise.
- Federated cohort queries (server-side CQL), cohort versioning, multi-criteria phenotype builder — no demand surfaced.

---

## Phases

<details>
<summary>✅ v1.7 Resource Navigation (Phases 46-51) — SHIPPED 2026-05-04</summary>

- [x] Phase 46: Theme A — Foundation: `summarizeResource` util + registry (2/2 plans) — completed 2026-05-01
- [x] Phase 47: Theme B — Readability: HumanReadableView reference resolution + extensions + contained resources (2/2 plans) — completed 2026-05-01
- [x] Phase 48: Theme C — Reverse references: incoming-references panel + curated catalog (4/4 plans) — completed 2026-05-01
- [x] Phase 49: Theme D — Graph view: lazy `/explorer/:type/:id/graph` route with React Flow + dagre (3/3 plans) — completed 2026-05-01
- [~] Phase 50: Theme E — STACK-01 carry-over: Mantine 9 / React 19 upgrade gate — DEFERRED to v1.8 via WAIVE-AND-DEFER on 2026-05-02
- [x] Phase 51: v1.7 Gap Closure — summary util coverage + graph patient-context (2/2 plans) — completed 2026-05-04

Full details: [milestones/v1.7-ROADMAP.md](milestones/v1.7-ROADMAP.md) . [Audit](milestones/v1.7-MILESTONE-AUDIT.md)

</details>

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

<details>
<summary>✅ v1.4 Hardening & Tech-Debt Sweep (Phases 23-30) — SHIPPED 2026-04-23</summary>

- [x] Phase 23: v1.3 Close-Out (7/7 plans) — completed 2026-04-17
- [x] Phase 24: Data-Fetching Foundation (4/4 plans) — completed 2026-04-17
- [x] Phase 25: Quality Module Dedup (4/4 plans) — completed 2026-04-22
- [x] Phase 26: App-Shell Dedup (3/3 plans) — completed 2026-04-22
- [x] Phase 27: Efficiency Polish (2/2 plans) — completed 2026-04-23
- [x] Phase 28: Micro-Consistency Sweep (2/2 plans) — completed 2026-04-23
- [~] Phase 29: Backlog UX — SUPERSEDED by Phase 30 (UX-02 covered; UX-01 deferred to v1.5 Phase 31)
- [x] Phase 29.5: Test Baseline Repair (1/1 plan) — completed 2026-04-23
- [x] Phase 30: Layout Redesign (1/1 plan, 8 steps) — completed 2026-04-23

Full details: [milestones/v1.4-ROADMAP.md](milestones/v1.4-ROADMAP.md)

</details>

<details>
<summary>✅ v1.5 Validation, Performance & MII Extensions (Phases 31-38.2) — SHIPPED 2026-04-29</summary>

- [x] Phase 31: UX-01 External Validator Cascade (2/2 plans) — completed 2026-04-25
- [x] Phase 32: EFF-R14 QualityMetricsContext Split (4/4 plans) — completed 2026-04-24
- [x] Phase 33: MII Schema Foundation + Extension-Modules Collapse UI (7/7 plans) — completed 2026-04-24
- [x] Phase 34: 14 MII Extension Modules + Palette + Bundled Profiles (6/6 plans) — completed 2026-04-25
- [x] Phase 35: Phase-30 UAT Follow-ups + Per-Type Quality Matrix (4/4 plans) — completed 2026-04-25
- [x] Phase 36: Phase 34 profile lazy-load (4/4 plans) — completed 2026-04-26
- [x] Phase 37: Phase 34 empirical UAT capture (deuteranopia + TTI) (3/3 plans) — completed 2026-04-28 (deuteranopia leg deferred to v1.6)
- [x] Phase 38: v1.5 HUMAN-UAT live-Blaze smoke tests (4/3 plans) — completed 2026-04-28
- [x] Phase 38.1: Fix `_sort=-date` Blaze incompatibility (INSERTED, 1/1 plan) — completed 2026-04-28
- [x] Phase 38.2: Fix ValueQuantity render on Observation rows (INSERTED, 1/1 plan) — completed 2026-04-29

Full details: [milestones/v1.5-ROADMAP.md](milestones/v1.5-ROADMAP.md) . [Audit](milestones/v1.5-MILESTONE-AUDIT.md)

</details>

<details>
<summary>✅ v1.6 Hardening, UX Polish & Carry-Overs (Phases 39-45) — SHIPPED 2026-04-30</summary>

- [x] Phase 39: v1.5 audit-trail backfill (NYQ + AUDIT) (3/3 plans) — completed 2026-04-29
- [x] Phase 40: Headless deuteranopia simulation in Vitest (DEUT) (1/1 plan) — completed 2026-04-29
- [x] Phase 41: Explorer + Quality UX polish (EXPL + QUAL-01/02/03) (3/3 plans) — completed 2026-04-29
- [x] Phase 42: Pre-probe extension-module counts (MII-EXT-15) (2/2 plans) — completed 2026-04-29
- [x] Phase 43: Validator hardening — auth + semantic near-miss (VAL-06 + VAL-07) (2/2 plans) — completed 2026-04-30
- [x] Phase 44: IPS Compositions support (IPS-01) (2/2 plans) — completed 2026-04-30
- [~] Phase 45: Mantine 9 upgrade (STACK-01) — DEFERRED to v1.7 Phase 50 (peer-dep gate failed: `@medplum/react@5.1.9` peers Mantine `^8.0.0` only; re-run gate at Phase 50 start)

Full details: [milestones/v1.6-ROADMAP.md](milestones/v1.6-ROADMAP.md)

</details>

## Phase Details

### Phase 46: Theme A — Foundation: Summary Util
**Goal**: Establish a single pure-function summary primitive (`summarizeResource`) used by every list/card surface in the app, dedup three current inline implementations, and provide the foundational dependency for Phases 47–49.
**Depends on**: Nothing (foundation phase)
**Requirements**: NAV-01, NAV-02
**Success Criteria** (what must be TRUE):
  1. A pure-function `summarizeResource(r: Resource) → { primary: string; secondary?: string }` exists, exported from a single module, and returns deterministic output for every R4 resource type (8 typed entries + generic fallback).
  2. The three legacy call sites (`SearchResultsPage.getResourceSummary`, `FhirResourcesView.getSummary`, `MiiModuleTab.getSummary`) all import and call the new utility — grep shows zero remaining inline summary computations at those sites.
  3. Unit tests cover all 8 typed registry entries plus the generic fallback (Patient, Observation, Condition, Encounter, MedicationStatement, Procedure, DiagnosticReport, AllergyIntolerance, generic) — at least one test per entry asserting both `primary` and (where applicable) `secondary` shape.
  4. Visual output at the three migrated call sites matches or improves on the prior inline output — explorer table cells and MII tab labels render summaries identical to or richer than v1.6.
  5. `npm run build` clean; `tsc -b --noEmit` exit 0; full test suite passes (no regressions vs. 1240 baseline).
**Plans**: TBD
**Effort**: medium (2-3 days)
**Execution**: Fully automatable (pure function + registry + 3 call-site migrations; no human UAT needed beyond test gate)
**UI hint**: yes

### Phase 47: Theme B — Readability: HumanReadableView
**Goal**: Make `HumanReadableView` self-sufficient — references resolve to human-readable summaries inline, property-level extensions are reachable without dropping into raw JSON, and contained resources render in-place.
**Depends on**: Phase 46 (consumes `summarizeResource` for both reference rendering and contained-resource rendering)
**Requirements**: READ-01, READ-02, READ-03
**Success Criteria** (what must be TRUE):
  1. A reference field rendered in `HumanReadableView` displays the target resource's `summarizeResource(target).primary` as inline text (not the raw `Type/id` href), with the full reference URL accessible on hover (Mantine Tooltip), and the rendered text remains a clickable router link to `/explorer/{type}/{id}`.
  2. Reference resolution uses a session-level `Map<\`${type}/${id}\`, Resource | null>` cache (cleared on full reload) — repeat references hit cache; failed lookups (404, network error) silently fall back to the raw href display with NO error toast.
  3. Property-level extensions (currently filtered by the `_`-prefix check in HumanReadableView) are reachable from the human-readable surface — at least one user-visible affordance (inline reveal, dedicated subsection, or `[View]` modal trigger) surfaces the extension data without requiring a switch to the JSON tab.
  4. Contained resources (`Resource.contained[]`) render inline within the human-readable view, each displaying its own `summarizeResource()` output and expandable to a full ResourcePropertyTable view — no fall-through to the JSON modal.
  5. Tests cover the cache hit/miss/fallback paths for READ-01, the extension-surface presence for READ-02, and the contained-resource render path for READ-03; full suite passes; `npm run build` clean.
**Plans**: 2 plans
  - [x] 47-01-PLAN.md — useReferenceResolver hook + ReferenceLink (READ-01)
  - [x] 47-02-PLAN.md — ExtensionChip + ContainedResourcesAccordion + HumanReadableView integration (READ-02 + READ-03)
**Effort**: large (3+ days)
**Execution**: Mixed (component + hook code is fully automatable; visual / interaction UAT — tooltip hover, modal transitions, contained-resource expand — needs a brief human walkthrough on live Blaze data)
**UI hint**: yes

### Phase 48: Theme C — Reverse References: Incoming-References Panel
**Goal**: Surface incoming references at the bottom of every non-Patient resource detail, generalize the existing PatientRelatedResources idiom into a single component, and ship the curated reverse-reference catalog that drives both this panel and the Phase 49 graph.
**Depends on**: Phase 46 (incoming-reference cards display target summaries via `summarizeResource`)
**Requirements**: REVR-01, REVR-02, REVR-03
**Success Criteria** (what must be TRUE):
  1. A curated catalog file (`src/utils/reverseReferenceCatalog.ts` or similar) exports a TypeScript const mapping each of the 8–12 covered source resource types to their reverse-reference search params (e.g. `Patient → [{ type: 'Observation', param: 'subject' }, ...]`). Coverage matches or exceeds the scope of `PatientRelatedResources.tsx`.
  2. Navigating to a non-Patient resource detail page (e.g. `/explorer/Encounter/abc`) renders an `<IncomingReferencesPanel>` at the bottom showing the resource types referencing it, with counts fetched via parallel `?{param}={ref}&_summary=count` queries against the catalog. Card grid UI mirrors `PatientRelatedResources`.
  3. Clicking a card navigates to a filtered explorer view (same click-through pattern as `PatientRelatedResources` today).
  4. `PatientRelatedResources.tsx` and `IncomingReferencesPanel` share a single render component (two props paths: forward-reference for Patient, reverse-reference for everything else) — no two-component duplication; existing Patient detail UX shows zero regression.
  5. Tests cover catalog shape (REVR-01), parallel count fetch + card render (REVR-02), and shared-component invariant (REVR-03); full suite passes; `npm run build` clean.
**Plans**: 4 plans
  - [x] 48-01-PLAN.md — reverseReferenceCatalog (REVR-01)
  - [x] 48-02-PLAN.md — RelatedResourcesPanel + IncomingReferencesPanel (REVR-02 + REVR-03 cross-wrapper invariant)
  - [x] 48-03-PLAN.md — PatientRelatedResources refactor + ResourceDetailPage mount relocation + HUMAN-UAT (REVR-03)
  - [x] 48-04-PLAN.md — gap-closure: WR-01 state-key collision in RelatedResourcesPanel (REVR-02 + REVR-03)
**Effort**: medium (2-3 days)
**Execution**: Mixed (catalog + panel + generalization is fully automatable; click-through navigation UAT on live Blaze data needs a brief human walkthrough)
**UI hint**: yes

### Phase 49: Theme D — Graph View: Reference Graph
**Goal**: Ship the G1 reference graph for any FHIR resource — outgoing + incoming refs at depth 1+ with click-to-navigate, hierarchical layout via React Flow + dagre, dark-mode-themed, lazy-loaded.
**Depends on**: Phase 46 (node labels render `summarizeResource(target).primary`) AND Phase 47 (reference resolution + cache reused for outgoing edges)
**Requirements**: GRPH-01, GRPH-02, GRPH-03, GRPH-04
**Success Criteria** (what must be TRUE):
  1. A new lazy route `/explorer/:type/:id/graph` is reachable from a "Graph" button on `ResourceDetailPage` (positioned next to existing "Raw JSON" / "$everything" actions). Initial-load bundle gz delta ≤ +5 KB; the graph route's chunk is code-split (Vite analyzer confirms a separate async chunk).
  2. The graph centers the current resource as the root node, renders outgoing references at depth ≥ 1 AND incoming references at depth 1 (sourced from the Phase 48 `reverseReferenceCatalog`), defaults to depth = 1 in both directions, and hard-caps at depth 3.
  3. Each node is clickable and navigates to `/explorer/{type}/{id}` for the target. Node labels render `summarizeResource(target).primary` as a Mantine-themed React component. Edge labels show the FHIR reference field name (e.g. `subject`, `encounter`). Hover on a node shows a Mantine Tooltip with `summarizeResource(target).secondary`.
  4. Layout is hierarchical (DAG) via `@dagrejs/dagre` ≥ 3.x rendered through `@xyflow/react` (React Flow 12). Switching the app theme (Mantine 8 light ↔ dark) re-themes the graph via CSS variables WITHOUT remounting the graph component. Zoom / pan / minimap controls are visible and functional.
  5. Pinned dependency versions for `@xyflow/react` and `@dagrejs/dagre` are recorded in `49-CONTEXT.md`; tests cover graph BFS bounds (depth cap), node-click navigation, and theme-switch invariant; `npm run build` clean.
**Plans**: 3 plans
  - [x] 49-01-PLAN.md — Foundation: deps + lazy route + Graph button + Wave 0 scaffold (GRPH-01)
  - [x] 49-02-PLAN.md — useGraphBfs + ResourceGraphNode + applyDagreLayout + BFS unit tests + node RTL tests (GRPH-02 + GRPH-03)
  - [x] 49-03-PLAN.md — Theme bridge + ResourceGraphView wiring + final D-20 tests + bundle gate + HUMAN-UAT (GRPH-01 + GRPH-04)
**Effort**: large (3+ days)
**Execution**: Mixed (graph component + BFS + theme wiring is automatable; visual UAT — pan/zoom feel, minimap, dark-mode re-theme without flicker, click-navigate flow — needs a human walkthrough on live Blaze data)
**UI hint**: yes

### Phase 50: Theme E — STACK-01 Carry-Over: Mantine 9 / React 19 Gate
**Goal**: Re-attempt the Mantine 9 / React 19 upgrade carried over from v1.6 Phase 45. Conditional execution: peer-dep gate decides whether the phase ships an upgrade or closes as `deferred`.
**Depends on**: Nothing (independent of Phases 46–49; gate-driven)
**Requirements**: STACK-01
**Success Criteria** (what must be TRUE — closure path depends on gate):

  **If gate PASSES (`@medplum/react` peer range now includes Mantine `^9.x`):**
  1. Mantine 8 → 9 codemod applied; React 18 → 19 upgrade applied; all peer-dep ranges in `package.json` align with new versions.
  2. Breaking-change sweep complete — every Mantine 9 deprecation and React 19 incompatibility surfaced by the test suite or `tsc` is fixed in source.
  3. Visual regression UAT (per v1.6 Phase 45 SCs) walked on live Blaze data — Sidebar, Dashboard, Patients, Quality, Explorer, Patient detail, Cohorts, IPS, Graph (new in Phase 49) all render with no visible regression.
  4. Full test suite passes; `npm run build` clean; bundle gz delta documented (target: within ±50 KB of pre-upgrade baseline).
  5. Phase closes `validated`; STACK-01 marked `validated` in REQUIREMENTS.md traceability.

  **If gate FAILS (peer range still pins Mantine `^8.0.0`):**
  1. `npm view @medplum/react peerDependencies` output captured verbatim in 50-CONTEXT.md as evidence of gate state.
  2. SUMMARY.md documents the `WAIVE-AND-DEFER` decision matching v1.6 Phase 45 precedent — no source diff applied.
  3. STACK-01 carried forward to v1.8 deferred-items list; phase closes `deferred`.

**Plans**: 2 plans (closure path: gate FAILED for Mantine 9 → pure-doc WAIVE-AND-DEFER)
  - [ ] 50-01-PLAN.md — 50-SUMMARY.md (WAIVE-AND-DEFER record + frozen 2026-05-01 gate output) + 50-VERIFICATION.md (status `passed`)
  - [ ] 50-02-PLAN.md — REQUIREMENTS.md / PROJECT.md / ROADMAP.md traceability rollover (STACK-01 → `deferred → v1.8`)
**Effort**: large (3+ days if gate passes; small if gate fails — pure-doc closure)
**Execution**: Mixed if gate passes (codemod + tsc sweep automatable; visual UAT requires human walkthrough across all views) / Fully automatable if gate fails (pure-doc `WAIVE-AND-DEFER`)
**UI hint**: yes (only relevant if gate passes — visual regression UAT touches every view)

### Phase 51: v1.7 Gap Closure — Summary Util Coverage + Graph Patient-Context
**Goal**: Close two `tech_debt` integration gaps surfaced by the v1.7 milestone audit — extend `summarizeResource` adoption to the two timeline call sites that diverge from it (GAP-1), and preserve patient context on graph node click when the graph is reached via the patient-scoped route (GAP-2).
**Depends on**: Phase 46 (`summarizeResource`), Phase 49 (`ResourceGraphNode`, `ResourceGraphView`)
**Requirements**: NAV-02 (full closure of summary-util divergence), GRPH-03 (patient-context gap)
**Gap Closure**: Closes GAP-1 and GAP-2 from `.planning/v1.7-MILESTONE-AUDIT.md`
**Success Criteria** (what must be TRUE):
  1. `PatientTimeline.tsx` no longer contains an inline `extractSummary` switch — the function is removed and replaced by calls to `summarizeResource(r).primary`. Field-priority order aligns with the canonical `summarizeResource` Encounter handler (`type[0].text → class.display`).
  2. `timeline-utils.ts` exported `extractSummary` is removed (or replaced by a thin re-export of `summarizeResource`) — `ClinicalTimeline.tsx` imports from `summarizeResource` directly or via the updated util. Grep shows zero divergent inline summary computations at these two timeline sites.
  3. `ResourceGraphNode.tsx:43` navigation reads `patientId` from route params (same source as `ResourceGraphView.tsx:120` `backHref`) and navigates to `/patients/:patientId/:type/:id` when `patientId` is present, falling back to `/explorer/:type/:id` otherwise. GAP-2 patient-context drop is eliminated.
  4. Full test suite passes; `npm run build` clean; `tsc -b --noEmit` exit 0; no regressions vs. post-Phase-49 baseline.
**Plans**: 2 plans
  - [x] 51-01-PLAN.md — GAP-1 closure: PatientTimeline + timeline-utils + ClinicalTimeline migrate to summarizeResource (NAV-02)
  - [x] 51-02-PLAN.md — GAP-2 closure: ResourceGraphNode patientId-aware navigation + RTL tests (GRPH-03)
**Effort**: small (< 1 day — 3 focused file edits)
**Execution**: Fully automatable (pure call-site migrations + 1 conditional navigation fix; no new UI surfaces)

## Progress

| Phase | Milestone | Plans Complete | Status | Completed |
|-------|-----------|----------------|--------|-----------|
| 14-20 (v1.2) | v1.2 | 22/22 | ✅ Shipped | 2026-04-15 |
| 21-22 (v1.3) | v1.3 | 9/9 | ✅ Shipped | 2026-04-16 |
| 23-30 (v1.4) | v1.4 | 35/35 | ✅ Shipped | 2026-04-23 |
| 31-38.2 (v1.5) | v1.5 | 32/32 | ✅ Shipped | 2026-04-29 |
| 39-45 (v1.6) | v1.6 | 14/14 (45 deferred) | ✅ Shipped | 2026-04-30 |
| 46-51 (v1.7) | v1.7 | 14/14 (50 deferred) | ✅ Shipped | 2026-05-04 |

## Backlog

*Surfaced by v1.7 code review (2026-05-02). HIGH + MEDIUM items promoted to Phase 51.*

### LOW — minor correctness / polish

- **NAV-01: Middle-click on ReferenceLink loses patient context** — middle-click bypasses the `handleReferenceClick` interceptor; raw href is always `/explorer/…`. Fix: build patient-aware hrefs in `ReferenceLink` using a `BasePathContext`. (F-G3-05)
- **TYPE-01: HumanReadableView double-cast for `extension`** — `(resource as unknown as Record<string, unknown>).extension as ExtensionShape[]` bypasses `DomainResource.extension?: Extension[]`. Use typed cast directly. (F-G3-09)
- **EDGE-01: NavigationBreadcrumbs startsWith('/patients/') misses bare '/patients'** — add `|| basePath === '/patients'` guard. (F-G3-11)
- **EDGE-02: referenceChecker id slice skips FHIR-id validation** — `Patient/123/` yields `id = '123/'`; validate against `FHIR_ID_PATTERN` before adding to `_id` bucket. (F-G4-04)
- **EDGE-03: structuralValidator ignores AbortSignal** — `_options?.signal` accepted but never checked; add `if (_options?.signal?.aborted) return []` guard. (F-G4-06)
- **ERR-01: ConnectionContext throws plain object instead of Error** — `throw { status: 0, message: '...' }` not instanceof Error; change to `throw new Error(...)`. (F-G5-03)
- **TEST-01: completenessWalker sliced-array limitation lacks regression test** — Pitfall 4 is documented but not asserted; add a test for the v1-behaviour invariant. (F-G4-05)
- **ICON-01: IconShareplay on $everything button is semantically wrong** — replace with `IconExternalLink`. (F-G2-07)

## Resolved Backlog (archived 2026-04-30)

Both items below were carried into v1.6 Phase 41 (Explorer + Quality UX polish) and shipped on 2026-04-29. Kept here for audit trail; CLI no longer treats them as pending phases.

- [x] **Former 999.1: Explorer hide-empty toggle** — promoted to **Phase 41 (EXPL-01)** on 2026-04-29; shipped via Mantine `Switch` on `/explorer` resource-type landing with localStorage persistence. Source: Phase 38 HUMAN-UAT verifier observation.
- [x] **Former 999.2: Quality completeness non-empty-sort** — promoted to **Phase 41 (QUAL-01)** on 2026-04-29; shipped via `compareRows` N/A-to-bottom fix in `CompletenessPanel.tsx`. Source: Phase 38 HUMAN-UAT verifier observation.
