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
- ✅ **v1.8 -- Navigation Redesign (shipped 2026-05-05)** -- [Archive](milestones/v1.8-ROADMAP.md)
- 🚧 **v1.9 -- Polish, Discovery & UAT Closure (active)** -- [Requirements](REQUIREMENTS.md)

## Deferred Items

Carried to v2.0 (re-evaluate at next milestone-new):

- **STACK-01 (Mantine 9 / React 19 upgrade — deferred indefinitely 2026-05-04):** Three consecutive gate failures (v1.6 Phase 45, v1.7 Phase 50, v1.8 skip). Mantine 9 still closed (`^8.0.0`) by `@medplum/react@5.1.10`. **Re-attempt trigger:** `npm view @medplum/react peerDependencies` — if `@mantine/core` peer range now includes `^9.x`, open new phase. Reactivation: `.planning/milestones/v1.7-phases/50-*/50-CONTEXT.md` + `50-SUMMARY.md`.
- **GRPH-G2 — schema graph** — interactive FHIR resource type graph (static, server-independent). Defer until G1 validated.
- **GRPH-DEPTH — graph depth > 3** — React Flow handles it but UX needs design.
- **REVR-DYN-EXT** — Deep CapabilityStatement SearchParameter `$describe` resolution for params without inline `target` list.
- **FEDCQL-01** — Federated cohort queries / server-side CQL execution.
- **COHORT-VERSION-01** — Cohort versioning / audit history.
- Multi-criteria phenotype builder — no demand surfaced.

---

## Phases

- [ ] **Phase 59: Code Quality Sweep** — 8 backlog fixes (FIX-01..08): patient-context for middle-click refs, typed extension cast, breadcrumb edge cases, FHIR-id validation, AbortSignal honoring, Error-instance throws, regression test, semantic icon swap.
- [ ] **Phase 60: CapabilityStatement-Driven Reverse-Reference Discovery** — Replace hand-curated `reverseReferenceCatalog.ts` with a dynamic catalog parsed from the server's `CapabilityStatement` SearchParameters, with transparent fallback when the CapabilityStatement is unavailable (REVR-04).
- [ ] **Phase 61: UAT Backlog Closure** — Walk the deferred Phase 58 UAT inventory (Groups A, C–G) against a live Blaze server running Synthea data; WAIVE Group B with documented rationale (UAT-01). Human-only, no plans.

<details>
<summary>✅ v1.8 Navigation Redesign (Phases 52-58) — SHIPPED 2026-05-05</summary>

- [x] Phase 52: JSON Peek Drawer Foundation (PEEK-01, PEEK-02, PEEK-03, PEEK-06) (2/2 plans) — completed 2026-05-04
- [x] Phase 53: Peek Call-Site Expansion (PEEK-04, PEEK-05) (2/2 plans) — completed 2026-05-04
- [x] Phase 54: 4-Mode Resource Shell (SHELL-01, SHELL-02, SHELL-03, SHELL-04) (2/2 plans) — completed 2026-05-04
- [x] Phase 55: Explorer Improvements (EXPL-01, EXPL-02, EXPL-03) (2/2 plans) — completed 2026-05-04
- [x] Phase 56: Sidebar v2 + Expert Toggle + ⌘K (SIDE-01, SIDE-02, SIDE-03, SIDE-04) (2/2 plans) — completed 2026-05-04
- [x] Phase 57: References-Out Card (LENS-02) (2/2 plans) — completed 2026-05-05
- [~] Phase 58: UAT Backlog Closure (human-only) — context documented 2026-05-05; walkthrough re-scoped into v1.9 Phase 61

Full details: [milestones/v1.8-ROADMAP.md](milestones/v1.8-ROADMAP.md)

</details>

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

### Phase 59: Code Quality Sweep
**Goal**: Resolve 8 LOW-severity items surfaced by the v1.7 code review backlog in a single batched sweep — patient-context preservation for middle-click reference clicks, type-safety cleanup, navigation breadcrumb edge cases, defensive validation in FHIR-id parsing, AbortSignal honoring, Error-instance throws, a missing regression test, and a semantic icon swap.
**Depends on**: Nothing (independent of other v1.9 phases; touches 8 separate small surfaces)
**Requirements**: FIX-01, FIX-02, FIX-03, FIX-04, FIX-05, FIX-06, FIX-07, FIX-08
**Success Criteria** (what must be TRUE):
  1. Middle-clicking a `ReferenceLink` opens the target resource in a new tab with patient context preserved when present — when the link is rendered inside a patient-scoped route (`/patients/:patientId/...`), the resulting URL is `/patients/:patientId/:type/:id`; outside a patient scope it falls back to `/explorer/:type/:id`. Verified via RTL test that opens a new tab via `auxclick` (button=1) and asserts the hrefs.
  2. `HumanReadableView` no longer contains the `(resource as unknown as Record<string, unknown>).extension as ExtensionShape[]` double-cast — grep shows zero occurrences of that pattern in the file. The replacement uses `DomainResource.extension` typing directly. `tsc -b --noEmit` exit 0.
  3. The bare `/patients` path (no trailing segment) activates the Patients breadcrumb in `NavigationBreadcrumbs`. RTL test renders the component at `/patients` and asserts the breadcrumb is marked active.
  4. `referenceChecker` rejects malformed FHIR ids (trailing slash, empty, illegal chars) before adding them to the `_id` query bucket — validated against `FHIR_ID_PATTERN`. Unit test feeds `Patient/123/` and asserts the id is NOT added.
  5. `structuralValidator` returns `[]` immediately when called with an already-aborted `AbortSignal`. Unit test calls `controller.abort()` before invocation and asserts an empty result with no walker work performed.
  6. `ConnectionContext` throws `new Error(message)` on connection failure (instanceof Error). Existing test that catches the throw is updated to assert `instanceof Error` and `.message` shape.
  7. A regression test pins the `completenessWalker` sliced-array v1-behaviour invariant (Pitfall 4 documented in code) so future refactors can't silently break it.
  8. The `$everything` button on `ResourceDetailPage` renders `IconExternalLink` (replacing `IconShareplay`). RTL test asserts the icon's `data-testid` or test-locator. `npm run build` clean.
**Plans**: 1 plan
- [x] 59-01-PLAN.md — Batched code-quality sweep: 8 atomic per-fix tasks covering FIX-01..08 (BasePathContext + ReferenceLink, HumanReadableView typing, NavigationBreadcrumbs bare /patients, referenceChecker FHIR_ID_PATTERN, structuralValidator AbortSignal, ConnectionContext Error throw, completenessWalker Pitfall 4 regression test, IconExternalLink icon swap)
**Effort**: small (< 1 day — 8 focused file edits + 8 small tests)
**Execution**: Fully automatable (no UI surface changes; visual regression nil)

### Phase 60: CapabilityStatement-Driven Reverse-Reference Discovery
**Goal**: Upgrade the reverse-reference catalog from a hand-curated module to a dynamic catalog derived from the connected server's CapabilityStatement, while preserving the curated catalog as a transparent fallback. The `IncomingReferencesPanel` should populate with the union of (a) what the server actually advertises as referenceable and (b) what the curated catalog covers, with no UX regression on servers whose CapabilityStatement is missing or sparse.
**Depends on**: Phase 48 (existing `reverseReferenceCatalog.ts`, `RelatedResourcesPanel`, `IncomingReferencesPanel`)
**Requirements**: REVR-04
**Success Criteria** (what must be TRUE):
  1. On first navigation to any non-Patient resource detail page after a fresh load (or server switch), the app fetches `/metadata` once, parses `CapabilityStatement.rest[0].resource[*].searchParam`, filters to `type: 'reference'` entries, and builds a dynamic reverse-reference catalog keyed by target resource type. The fetched CapabilityStatement is cached per server URL for the session (cleared on server switch).
  2. The `IncomingReferencesPanel` populates from the dynamic catalog when available — verified by navigating to an `Encounter` detail page on a server whose CapabilityStatement advertises additional reference search params beyond the curated 9 entries; the panel shows cards for the additional types.
  3. When the CapabilityStatement is unavailable (404, network error, malformed) OR when a specific resource type has no entries in the dynamic catalog, the panel falls back to the hand-curated `reverseReferenceCatalog.ts` transparently. No error toast or banner is shown to the user.
  4. Unit tests cover: (a) CapabilityStatement parser produces the expected dynamic catalog shape from a fixture CapabilityStatement, (b) panel renders the dynamic-catalog entries when available, (c) panel renders the curated-catalog entries when the dynamic fetch fails, (d) per-server cache invalidates on server-URL change.
  5. `tsc -b --noEmit` exit 0; `npm run build` clean; full test suite passes; bundle gz delta within ±5 KB.
**Plans**: TBD (2 plans)
  - 60-01: CapabilityStatement fetch + parse + per-server cache + dynamic catalog builder (REVR-04 parser half)
  - 60-02: `IncomingReferencesPanel` integration + curated fallback + tests (REVR-04 integration half)
**Effort**: medium (2-3 days — parser + cache + panel integration + fallback path + 4-5 tests)
**Execution**: Mixed (parser + cache + integration code is fully automatable; a brief live-Blaze smoke check confirms the dynamic catalog produces a non-empty result on a real CapabilityStatement)
**UI hint**: yes

### Phase 61: UAT Backlog Closure
**Goal**: Walk the deferred Phase 58 UAT inventory against a live Blaze server running Synthea data, marking every item as PASS or WAIVED with documented rationale. Close Groups A, C, D, E, F, and G; explicitly WAIVE Group B (data-blocked — Synthea lacks fixtures for those scenarios) with a revisit note.
**Depends on**: All v1.6, v1.7, v1.8 phases (the UAT items being walked belong to Phases 42–54)
**Requirements**: UAT-01
**Success Criteria** (what must be TRUE):
  1. A consolidated `61-UAT-LOG.md` (or equivalent) records the outcome (PASS / WAIVE) for every Phase 58-deferred UAT item across Groups A, C, D, E, F, G. Each WAIVE entry carries an explicit rationale.
  2. Group B items are WAIVED en bloc with a single shared rationale (no Synthea fixture availability) and a revisit-trigger note (re-run when a non-Synthea seed dataset is available).
  3. Items that FAIL during the walkthrough are filed as discrete bugs in `.planning/backlog/` (or as new requirements for a follow-up phase) — they do NOT block phase closure, but they DO block UAT-01 from being marked validated. Phase 61 closes only when every Group-A/C/D/E/F/G item is either PASS or WAIVE.
  4. UAT-01 traceability flips to `validated` in REQUIREMENTS.md with a phase-completion-date timestamp.
**Plans**: — (human-only; no plans required, mirrors Phase 58 structure)
**Effort**: medium (1 day of focused human walkthrough on live Blaze + Synthea)
**Execution**: Human-only (no automatable surface; every item requires a real browser session against live Blaze data)

## Progress

| Phase | Milestone | Plans Complete | Status | Completed |
|-------|-----------|----------------|--------|-----------|
| 14-20 (v1.2) | v1.2 | 22/22 | ✅ Shipped | 2026-04-15 |
| 21-22 (v1.3) | v1.3 | 9/9 | ✅ Shipped | 2026-04-16 |
| 23-30 (v1.4) | v1.4 | 35/35 | ✅ Shipped | 2026-04-23 |
| 31-38.2 (v1.5) | v1.5 | 32/32 | ✅ Shipped | 2026-04-29 |
| 39-45 (v1.6) | v1.6 | 14/14 (45 deferred) | ✅ Shipped | 2026-04-30 |
| 46-51 (v1.7) | v1.7 | 14/14 (50 deferred) | ✅ Shipped | 2026-05-04 |
| 52-57 (v1.8) | v1.8 | 12/12 | ✅ Shipped | 2026-05-05 |
| 59 (v1.9) | v1.9 | 1/1 | Complete   | 2026-05-24 |
| 60 (v1.9) | v1.9 | 0/2 | ⏳ Not started | — |
| 61 (v1.9) | v1.9 | 0/0 (human-only) | ⏳ Not started | — |

## Backlog

*Resolved into v1.9 Phase 59 (FIX-01..08). Below are the v1.7 code-review items now under active phase scope.*

### Resolved into v1.9 Phase 59 (2026-05-11)

- [x] **NAV-01 → FIX-01**: Middle-click on ReferenceLink loses patient context (now FIX-01)
- [x] **TYPE-01 → FIX-02**: HumanReadableView double-cast for `extension` (now FIX-02)
- [x] **EDGE-01 → FIX-03**: NavigationBreadcrumbs startsWith('/patients/') misses bare '/patients' (now FIX-03)
- [x] **EDGE-02 → FIX-04**: referenceChecker id slice skips FHIR-id validation (now FIX-04)
- [x] **EDGE-03 → FIX-05**: structuralValidator ignores AbortSignal (now FIX-05)
- [x] **ERR-01 → FIX-06**: ConnectionContext throws plain object instead of Error (now FIX-06)
- [x] **TEST-01 → FIX-07**: completenessWalker sliced-array limitation lacks regression test (now FIX-07)
- [x] **ICON-01 → FIX-08**: IconShareplay on $everything button is semantically wrong (now FIX-08)

## Resolved Backlog (archived 2026-04-30)

Both items below were carried into v1.6 Phase 41 (Explorer + Quality UX polish) and shipped on 2026-04-29. Kept here for audit trail; CLI no longer treats them as pending phases.

- [x] **Former 999.1: Explorer hide-empty toggle** — promoted to **Phase 41 (EXPL-01)** on 2026-04-29; shipped via Mantine `Switch` on `/explorer` resource-type landing with localStorage persistence. Source: Phase 38 HUMAN-UAT verifier observation.
- [x] **Former 999.2: Quality completeness non-empty-sort** — promoted to **Phase 41 (QUAL-01)** on 2026-04-29; shipped via `compareRows` N/A-to-bottom fix in `CompletenessPanel.tsx`. Source: Phase 38 HUMAN-UAT verifier observation.
