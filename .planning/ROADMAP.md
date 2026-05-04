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
- 🚧 **v1.8 -- Navigation Redesign (in progress, started 2026-05-04)** -- 7 phases (52-58), 20 requirements

## Deferred Items

Carried to v1.9+ (re-evaluate at next milestone-new):

- **STACK-01 (Mantine 9 / React 19 upgrade)** — DEFERRED INDEFINITELY per user decision 2026-05-04. Bottleneck remains `@medplum/react`'s `@mantine/core: ^8.0.0` peer pin. Removed from Active requirements; will resurface only if user-requested or if `@medplum/react` peer-dep range opens to `^9.x`.
- **Reverse-reference CapabilityStatement-driven discovery** — curated catalog ships v1.7 (REVR-01); defer CapabilityStatement-driven until real-world gaps surface.
- **Graph view G2 — schema graph** — interactive FHIR resource type graph (static, server-independent). Defer until G1 validated.
- **Graph view depth > 3** — React Flow handles it but UX needs design.
- **Reference resolution prefetch** — lazy is sufficient until observed otherwise.
- **Hover-peek 4-line JSON preview tooltip on reference chips** — polish item; deferrable beyond v1.8.
- **Collapsible sidebar (icon-only mode)** — not in v1.8 design handoff; defer.
- **Global navigation shortcuts (`g d` / `g e` / `g p`)** — polish item; defer.
- Federated cohort queries (server-side CQL), cohort versioning, multi-criteria phenotype builder — no demand surfaced.

---

## Phases

### v1.8 Navigation Redesign (Phases 52-58) — IN PROGRESS

- [ ] **Phase 52: JSON Peek Drawer Foundation** — Extract `JsonViewer`, mount `PeekProvider` + `JsonPeekDrawer` at `AppLayout`, wire `J` on Explorer rows (PEEK-01, PEEK-02, PEEK-03, PEEK-06)
- [ ] **Phase 53: Peek Call-Site Expansion** — Wire `J` on Patients list, `Cmd+click` on reference chips, IncomingReferencesPanel cards, Human-mode reference rows (PEEK-04, PEEK-05)
- [ ] **Phase 54: 4-Mode Resource Shell** — Replace `ResourceDetailPage` tabs with `Summary | Human | Graph | JSON` switcher; key-fields registry; JSON-mode improvements (SHELL-01, SHELL-02, SHELL-03, SHELL-04)
- [ ] **Phase 55: Explorer Improvements** — Summary column, density modes (Cards / Table / Compact), JSON peek wiring on Explorer rows (EXPL-01, EXPL-02, EXPL-03)
- [ ] **Phase 56: Sidebar v2 + Expert Toggle + ⌘K** — IA restructure (Browse / Audit), Expert toggle, Mantine Spotlight palette, Cohorts under Audit (SIDE-01, SIDE-02, SIDE-03, SIDE-04)
- [ ] **Phase 57: Patients-as-Lens** — Chrome rewrap, breadcrumb, `PatientHeaderCard` modal removal, Patient Summary mode with MII tabs (LENS-01, LENS-02)
- [ ] **Phase 58: UAT Backlog Closure** — Verify all deferred `HUMAN-UAT.md` items from Phases 42–49 against live Blaze (UAT-01)

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

### Phase 52: JSON Peek Drawer Foundation
**Goal**: Users can press `J` on any focused Explorer row to instantly inspect raw FHIR JSON in a 420px right-side drawer without leaving the list.
**Depends on**: Nothing (first v1.8 phase; v1.7 baseline shipped)
**Requirements**: PEEK-01, PEEK-02, PEEK-03, PEEK-06
**Success Criteria** (what must be TRUE):
  1. Pressing `J` on a focused row in `/explorer/:type` opens a 420px right-side drawer showing the row's full FHIR JSON without changing the URL.
  2. `Esc` closes the drawer and returns focus to the originating row; pressing `J` on a different row swaps drawer content without unmounting (no slide-in/out flicker).
  3. `Enter` while drawer is open (or clicking `[Open full →]`) navigates to `/explorer/:type/:id?mode=json`.
  4. `git grep -rn "react-syntax-highlighter\|JsonTreeView" src/` returns exactly one source-of-truth implementation (the new `components/json/JsonViewer.tsx`); zero duplicate syntax-highlighter implementations.
**Plans**: TBD
**UI hint**: yes

### Phase 53: Peek Call-Site Expansion
**Goal**: The JSON peek drawer is reachable from every list/reference surface a user encounters in normal navigation.
**Depends on**: Phase 52
**Requirements**: PEEK-04, PEEK-05
**Success Criteria** (what must be TRUE):
  1. `Cmd/Ctrl+click` on any reference chip (Human-mode reference rows, IncomingReferencesPanel cards, Summary-mode reference chips) opens the drawer with the referenced resource resolved via the Phase 47 cache.
  2. Failed reference resolution renders an inline "Reference unresolvable" state inside the drawer body — no toast notification.
  3. Drawer is reachable from at least 4 distinct surfaces (Explorer table, Patients list, IncomingReferencesPanel cards, Human-mode reference rows) — each surface verified by a vitest test that opens the drawer from that surface.
**Plans**: TBD
**UI hint**: yes

### Phase 54: 4-Mode Resource Shell
**Goal**: Every resource detail view (non-Patient) renders through a unified 4-mode shell, replacing the current 2-tab `ResourceDetailPage` layout.
**Depends on**: Phase 52 (drawer "Open full →" lands on mode 4 / JSON)
**Requirements**: SHELL-01, SHELL-02, SHELL-03, SHELL-04
**Success Criteria** (what must be TRUE):
  1. `/explorer/:type/:id` renders a `Summary | Human | Graph | JSON` mode switcher; keyboard shortcuts `1`/`2`/`3`/`4` (with input-focus guard) swap modes; selected mode persists in the URL `?mode=` param.
  2. Summary mode (default for non-Expert users) renders `summarizeResource(r).primary` as heading plus a key-fields property table for 8 typed R4 resource types (Patient, Observation, Condition, Encounter, MedicationStatement, Procedure, DiagnosticReport, AllergyIntolerance) with a generic fallback walker for the long tail.
  3. Graph mode lazy-loads the existing Phase 49 `ResourceGraphView`; the legacy `/explorer/:type/:id/graph` route redirects to `?mode=graph`.
  4. JSON mode renders a top-right validation chip, line-numbered JSON body, and toolbar actions (Copy / Download / Open in fhir-validator).
**Plans**: TBD
**UI hint**: yes

### Phase 55: Explorer Improvements
**Goal**: Explorer list scanning is faster and more legible — primary/secondary summaries inline, density configurable, JSON peek one keystroke away.
**Depends on**: Phase 52 (JSON peek wiring); independent of Phase 54
**Requirements**: EXPL-01, EXPL-02, EXPL-03
**Success Criteria** (what must be TRUE):
  1. Explorer list table shows a Summary column (leftmost data column) with primary line bold and secondary line dim/mono via `summarizeResource()`.
  2. A density `SegmentedControl` (Cards / Table / Compact) is visible at the top of `/explorer/:type`; the user's selection persists across reloads via `localStorage['explorer.density.v1']`.
  3. `J` on any focused Explorer row opens the JSON peek drawer (full integration of PEEK-01..06 across all Explorer rows).
**Plans**: TBD
**UI hint**: yes

### Phase 56: Sidebar v2 + Expert Toggle + ⌘K
**Goal**: Navigation IA reflects the Browse/Audit split; users have a global command palette and an Expert mode that biases defaults toward raw FHIR JSON.
**Depends on**: Phase 54 (Expert toggle drives default mode in `ResourceShell`)
**Requirements**: SIDE-01, SIDE-02, SIDE-03, SIDE-04
**Success Criteria** (what must be TRUE):
  1. Sidebar renders two sections — **Browse** (Dashboard, Explorer with Lenses sub-list: Patients, Practitioners, MII modules) and **Audit** (Quality with Cohorts/Thresholds/IPS Validator children); v1.4 active-row 2-px indigo left rail + white background styling preserved.
  2. ⌘K (Mac) / Ctrl+K (Windows/Linux) opens a Mantine Spotlight palette with registered commands for resource types, saved cohorts, and settings shortcuts; the sidebar shows a fake-search-input trigger above the sections.
  3. Footer Expert `Switch` persists to `localStorage['sidebar.expertView.v1']`; when ON, JSON becomes the default mode for new resource opens (verified via `ResourceShell` initial state) and raw search params become visible in Explorer.
  4. The Cohorts entry appears under the Audit section while the underlying route `/quality/cohorts` is unchanged.
**Plans**: TBD
**UI hint**: yes

### Phase 57: Patients-as-Lens
**Goal**: Patients is no longer a top-level concept but a lens onto Explorer — same chrome, same shell, no bespoke Raw JSON modal.
**Depends on**: Phase 54 (Patient detail uses unified `ResourceShell`), Phase 56 (sidebar lens highlighting + breadcrumb shape)
**Requirements**: LENS-01, LENS-02
**Success Criteria** (what must be TRUE):
  1. `/patients` renders inside Explorer chrome; breadcrumb reads `Explorer › Patients lens` (and `Explorer › Patients lens › <name>` on detail); sidebar highlights the "Patients" lens entry under Browse > Explorer > Lenses with the parent Explorer row dimmed (most-specific-wins).
  2. Patient detail renders through the unified `ResourceDetailPage` shell; the bespoke `PatientHeaderCard` "Raw JSON" modal is removed (mode 4 covers it); MII Kerndatensatz module tabs continue to render within Summary mode for Patient resources.
**Plans**: TBD
**UI hint**: yes

### Phase 58: UAT Backlog Closure
**Goal**: Every deferred browser-only verification item from Phases 42–49 is walked against live Blaze; the audit trail closes.
**Depends on**: Phases 52..57 (UAT covers v1.8 surface plus v1.6 + v1.7 backlog)
**Requirements**: UAT-01
**Success Criteria** (what must be TRUE):
  1. Every `HUMAN-UAT.md` item across Phases 42, 43, 44, 46, 47, 48, 49 carries a final disposition: pass / fail / known-issue-deferred / test-environment-blocked.
  2. `nyquist_compliant` flags on the originating phases are flipped where verification supports it; remaining `false` flags carry an explicit rationale.
  3. A consolidated UAT report is appended to the v1.8 milestone audit document; any defects discovered surface as separate phase candidates rather than silent failures.
**Plans**: TBD

---

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
**Status**: closed `deferred` (gate FAILED — Mantine 9 still pinned `^8.0.0` by `@medplum/react@5.1.10`); STACK-01 removed from Active per user decision 2026-05-04.

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

## Cross-Phase Notes (v1.8)

- **Keyboard shortcut ownership** — Phase 52 ships a single shared `useShortcuts` / `useHotkeys` module that all later phases (54 mode-switch keys, 56 ⌘K) extend. Avoids the Pitfall 2 (Spotlight ⌘K vs `1`/`2`/`3`/`4` collision) and Pitfall 9 (drawer-local vs document-level handler conflict).
- **Drawer config** — Phase 52 ships with `trapFocus={true}` + `withOverlay={false}` per RESEARCH recommendation (a11y-safe, lightweight visual). Decision logged in REQUIREMENTS.md "Design Decisions (pending)" section.
- **Mode switcher widget** — Phase 54 ships `<Tabs variant="pills">` styled to look like SegmentedControl (preserves `keepMounted` semantics + ARIA tablist roles per Pitfall 4). Visual parity with handoff via Phase 30 design tokens.
- **Spotlight resource-type list** — Phase 56 lazy-populates resource types via CapabilityStatement when the user types ≥ 2 characters (avoids upfront 94-action cost).
- **PatientHeaderCard removal** — Phase 57 stages the Raw JSON modal removal in two parts: Stage 1 keeps the button as a link to mode 4 (snapshot-stable); Stage 2 removes the button with a single audit-trailed snapshot re-baseline (per Pitfall 6).

## Dependency Graph (v1.8)

```
Phase 52 (PEEK foundation) ──┬──> Phase 53 (PEEK call-site expansion)
                             ├──> Phase 54 (SHELL — drawer "Open full →" lands on mode 4)
                             └──> Phase 55 (EXPL-03 JSON peek wiring)

Phase 54 (SHELL) ──┬──> Phase 56 (SIDE-03 Expert toggle drives default mode)
                   └──> Phase 57 (LENS — Patient detail uses ResourceShell)

Phase 56 (SIDE) ──> Phase 57 (LENS — sidebar lens highlighting + breadcrumb shape)

Phase 58 (UAT) ──> runs LAST, after all v1.8 features ship
```

## v1.8 Traceability

| Requirement | Phase |
|-------------|-------|
| PEEK-01 | Phase 52 |
| PEEK-02 | Phase 52 |
| PEEK-03 | Phase 52 |
| PEEK-04 | Phase 53 |
| PEEK-05 | Phase 53 |
| PEEK-06 | Phase 52 |
| SHELL-01 | Phase 54 |
| SHELL-02 | Phase 54 |
| SHELL-03 | Phase 54 |
| SHELL-04 | Phase 54 |
| EXPL-01 | Phase 55 |
| EXPL-02 | Phase 55 |
| EXPL-03 | Phase 55 |
| SIDE-01 | Phase 56 |
| SIDE-02 | Phase 56 |
| SIDE-03 | Phase 56 |
| SIDE-04 | Phase 56 |
| LENS-01 | Phase 57 |
| LENS-02 | Phase 57 |
| UAT-01 | Phase 58 |

**Coverage:** 20/20 v1.8 requirements mapped — no orphans, no duplicates.

## Progress

| Phase | Milestone | Plans Complete | Status | Completed |
|-------|-----------|----------------|--------|-----------|
| 14-20 (v1.2) | v1.2 | 22/22 | ✅ Shipped | 2026-04-15 |
| 21-22 (v1.3) | v1.3 | 9/9 | ✅ Shipped | 2026-04-16 |
| 23-30 (v1.4) | v1.4 | 35/35 | ✅ Shipped | 2026-04-23 |
| 31-38.2 (v1.5) | v1.5 | 32/32 | ✅ Shipped | 2026-04-29 |
| 39-45 (v1.6) | v1.6 | 14/14 (45 deferred) | ✅ Shipped | 2026-04-30 |
| 46-51 (v1.7) | v1.7 | 14/14 (50 deferred) | ✅ Shipped | 2026-05-04 |
| 52. JSON Peek Drawer Foundation | v1.8 | 0/0 | Not started | - |
| 53. Peek Call-Site Expansion | v1.8 | 0/0 | Not started | - |
| 54. 4-Mode Resource Shell | v1.8 | 0/0 | Not started | - |
| 55. Explorer Improvements | v1.8 | 0/0 | Not started | - |
| 56. Sidebar v2 + Expert Toggle + ⌘K | v1.8 | 0/0 | Not started | - |
| 57. Patients-as-Lens | v1.8 | 0/0 | Not started | - |
| 58. UAT Backlog Closure | v1.8 | 0/0 | Not started | - |

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

---
*v1.8 milestone roadmap added: 2026-05-04*
