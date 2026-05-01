# Roadmap: FHIR Exploder

## Milestones

- ✅ **v1.0 -- MVP (shipped 2026-04-12)** -- [Archive](milestones/v1.0-ROADMAP.md) . [Requirements](milestones/v1.0-REQUIREMENTS.md)
- ✅ **v1.1 -- UX Polish & Data Export (shipped 2026-04-12)** -- [Archive](milestones/v1.1-ROADMAP.md) . [Requirements](milestones/v1.1-REQUIREMENTS.md)
- ✅ **v1.2 -- Tech Debt & Quality Monitoring (shipped 2026-04-15)** -- [Archive](milestones/v1.2-ROADMAP.md) . [Requirements](milestones/v1.2-REQUIREMENTS.md)
- ✅ **v1.3 -- Cohort Definition & Storage (shipped 2026-04-16)** -- [Archive](milestones/v1.3-ROADMAP.md) . [Requirements](milestones/v1.3-REQUIREMENTS.md) . [Audit](milestones/v1.3-MILESTONE-AUDIT.md)
- ✅ **v1.4 -- Hardening & Tech-Debt Sweep (shipped 2026-04-23)** -- [Archive](milestones/v1.4-ROADMAP.md) . [Requirements](milestones/v1.4-REQUIREMENTS.md) . [Audit](milestones/v1.4-MILESTONE-AUDIT.md)
- ✅ **v1.5 -- Validation, Performance & MII Extensions (shipped 2026-04-29)** -- [Archive](milestones/v1.5-ROADMAP.md) . [Requirements](milestones/v1.5-REQUIREMENTS.md) . [Audit](milestones/v1.5-MILESTONE-AUDIT.md)
- ✅ **v1.6 -- Hardening, UX Polish & Carry-Overs (shipped 2026-04-30)** -- [Archive](milestones/v1.6-ROADMAP.md) . [Requirements](milestones/v1.6-REQUIREMENTS.md)
- 🚧 **v1.7 -- Resource Navigation (in progress, started 2026-05-01)** -- 5 phases (46-50), 13 REQ-IDs across 5 themes

## Deferred Items

Carried beyond v1.6 (re-evaluate at milestone boundaries):

**Now scheduled in v1.7 (Phase 50 — conditional gate):**

- **STACK-01 (Mantine 9 / React 19 upgrade):** v1.6 Phase 45 peer-dep gate fired `WAIVE-AND-DEFER` on 2026-04-30 — `@medplum/react@5.1.9` peers Mantine `^8.0.0` only. **Now scheduled as v1.7 Phase 50.** At phase start, re-run `npm view @medplum/react peerDependencies`; if range now includes `^9.x`, reactivate from `.planning/milestones/v1.6-phases/45-*/45-CONTEXT.md` and replan. If gate still fails, close Phase 50 as `deferred` (no source diff) and push to v1.8 — both closures acceptable.

**Deferred beyond v1.7 (re-evaluate at v1.8 milestone-new):**

- **Reverse-reference CapabilityStatement-driven discovery** — runtime-discovered catalog from server's `CapabilityStatement.rest.resource[].searchParam`. v1.7 ships curated catalog (REVR-01); defer until curated approach reveals real-world gaps.
- **Graph view G2 — schema graph** — interactive visualization of the FHIR resource type graph (which types reference which; static, server-independent). Onboarding tool. Defer until G1 (Phase 49) is validated.
- **Graph view depth > 3** — full `$everything`-driven graph for a Patient (could be 100s of nodes). React Flow handles it but UX needs design.
- **Reference resolution prefetch** — eager-fetch all references on resource detail mount instead of lazy. Defer until lazy is observed insufficient.
- Federated cohort queries (server-side CQL) — v1.3 deferred, no demand surfaced
- Cohort versioning / audit history — v1.3 deferred
- Phenotype-style multi-criteria builder — v1.3 deferred

---

## Phases

### 🚧 v1.7 Resource Navigation (Phases 46-50)

**Goal:** Make resources navigable. Improve the human-readable view, add a compact summary util used everywhere a resource appears in a list, surface incoming references at the bottom of resource details, and ship a graphical reference graph for the resource at hand.

- [ ] Phase 46: Theme A — Foundation: `summarizeResource` util + registry (NAV-01, NAV-02)
- [ ] Phase 47: Theme B — Readability: HumanReadableView reference resolution + extensions + contained resources (READ-01, READ-02, READ-03)
- [ ] Phase 48: Theme C — Reverse references: incoming-references panel + curated catalog (REVR-01, REVR-02, REVR-03)
- [ ] Phase 49: Theme D — Graph view: lazy `/explorer/:type/:id/graph` route with React Flow + dagre (GRPH-01, GRPH-02, GRPH-03, GRPH-04)
- [ ] Phase 50: Theme E — STACK-01 carry-over: Mantine 9 / React 19 upgrade gate (STACK-01)

Full requirements: [REQUIREMENTS.md](REQUIREMENTS.md)

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
  - [ ] 49-01-PLAN.md — Foundation: deps + lazy route + Graph button + Wave 0 scaffold (GRPH-01)
  - [ ] 49-02-PLAN.md — useGraphBfs + ResourceGraphNode + applyDagreLayout + BFS unit tests + node RTL tests (GRPH-02 + GRPH-03)
  - [ ] 49-03-PLAN.md — Theme bridge + ResourceGraphView wiring + final D-20 tests + bundle gate + HUMAN-UAT (GRPH-01 + GRPH-04)
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

**Plans**: TBD
**Effort**: large (3+ days if gate passes; small if gate fails — pure-doc closure)
**Execution**: Mixed if gate passes (codemod + tsc sweep automatable; visual UAT requires human walkthrough across all views) / Fully automatable if gate fails (pure-doc `WAIVE-AND-DEFER`)
**UI hint**: yes (only relevant if gate passes — visual regression UAT touches every view)

## Progress

| Phase | Milestone | Plans Complete | Status | Completed |
|-------|-----------|----------------|--------|-----------|
| 14-20 (v1.2) | v1.2 | 22/22 | ✅ Shipped | 2026-04-15 |
| 21-22 (v1.3) | v1.3 | 9/9 | ✅ Shipped | 2026-04-16 |
| 23-30 (v1.4) | v1.4 | 35/35 | ✅ Shipped | 2026-04-23 |
| 31-38.2 (v1.5) | v1.5 | 32/32 | ✅ Shipped | 2026-04-29 |
| 39-45 (v1.6) | v1.6 | 14/14 (45 deferred) | ✅ Shipped | 2026-04-30 |
| 46. Foundation summary util | v1.7 | 2/2 | Complete    | 2026-05-01 |
| 47. HumanReadableView readability | v1.7 | 2/2 | Complete    | 2026-05-01 |
| 48. Incoming-references panel | v1.7 | 4/4 | Complete    | 2026-05-01 |
| 49. Reference graph view | v1.7 | 0/3 | In progress | - |
| 50. STACK-01 gate | v1.7 | TBD | Not started | - |

## Backlog

*No active backlog items — milestone v1.7 ships with all surfaced ideas accounted for.*

## Resolved Backlog (archived 2026-04-30)

Both items below were carried into v1.6 Phase 41 (Explorer + Quality UX polish) and shipped on 2026-04-29. Kept here for audit trail; CLI no longer treats them as pending phases.

- [x] **Former 999.1: Explorer hide-empty toggle** — promoted to **Phase 41 (EXPL-01)** on 2026-04-29; shipped via Mantine `Switch` on `/explorer` resource-type landing with localStorage persistence. Source: Phase 38 HUMAN-UAT verifier observation.
- [x] **Former 999.2: Quality completeness non-empty-sort** — promoted to **Phase 41 (QUAL-01)** on 2026-04-29; shipped via `compareRows` N/A-to-bottom fix in `CompletenessPanel.tsx`. Source: Phase 38 HUMAN-UAT verifier observation.
