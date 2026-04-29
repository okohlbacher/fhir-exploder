# Roadmap: FHIR Exploder

## Milestones

- ✅ **v1.0 -- MVP (shipped 2026-04-12)** -- [Archive](milestones/v1.0-ROADMAP.md) . [Requirements](milestones/v1.0-REQUIREMENTS.md)
- ✅ **v1.1 -- UX Polish & Data Export (shipped 2026-04-12)** -- [Archive](milestones/v1.1-ROADMAP.md) . [Requirements](milestones/v1.1-REQUIREMENTS.md)
- ✅ **v1.2 -- Tech Debt & Quality Monitoring (shipped 2026-04-15)** -- [Archive](milestones/v1.2-ROADMAP.md) . [Requirements](milestones/v1.2-REQUIREMENTS.md)
- ✅ **v1.3 -- Cohort Definition & Storage (shipped 2026-04-16)** -- [Archive](milestones/v1.3-ROADMAP.md) . [Requirements](milestones/v1.3-REQUIREMENTS.md) . [Audit](milestones/v1.3-MILESTONE-AUDIT.md)
- ✅ **v1.4 -- Hardening & Tech-Debt Sweep (shipped 2026-04-23)** -- [Archive](milestones/v1.4-ROADMAP.md) . [Requirements](milestones/v1.4-REQUIREMENTS.md) . [Audit](milestones/v1.4-MILESTONE-AUDIT.md)
- ✅ **v1.5 -- Validation, Performance & MII Extensions (shipped 2026-04-29)** -- [Archive](milestones/v1.5-ROADMAP.md) . [Requirements](milestones/v1.5-REQUIREMENTS.md) . [Audit](milestones/v1.5-MILESTONE-AUDIT.md)

## Deferred Items

v1.6+ candidates carried over from v1.5:

- **Headless deuteranopia simulation in Vitest (closes Phase 37 deferral).** Apply Brettel/Machado JS simulation matrix to rendered RGBA from the Dashboard tile grid + tab row, then assert pairwise icon+color discriminability for the 21 MII module adjacent pairs. Borderline pairs #7 (mikrobiologie ↔ molekulargenetik HIGH) and #12 (pro ↔ seltene MEDIUM-HIGH) remain qualitative paper predictions only — empirical capture deferred 2026-04-28 by user. See `.planning/milestones/v1.5-phases/37-phase-34-uat-empirical-capture-deuteranopia-tti/37-VERIFICATION.md` and `37-EMPIRICAL.md` §7(a).
- **Nyquist validation backfill** for v1.5 phases (5 phases marked `nyquist_compliant: false`; 3 missing VALIDATION.md). See v1.5 audit `tech_debt`.
- IPS Compositions (Empty-Sections-and-Missing-Data) support
- CSV export of per-type quality matrix
- Semantic near-miss detection for UX-01 (SNOMED CT + ICD-10 graph walking)
- Validator authentication (Basic/Bearer)
- Mantine 9 upgrade (coupled to React 19; wait for Medplum 5.x peer-dep refresh)
- Heat-column gradient on per-type quality matrix
- Pre-probe extension-module counts on Patient detail

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

### 📋 v1.6 (Planned)

_Next milestone scope to be defined via `/gsd-new-milestone`._

## Progress

| Phase | Milestone | Plans Complete | Status | Completed |
|-------|-----------|----------------|--------|-----------|
| 14-20 (v1.2) | v1.2 | 22/22 | ✅ Shipped | 2026-04-15 |
| 21-22 (v1.3) | v1.3 | 9/9 | ✅ Shipped | 2026-04-16 |
| 23-30 (v1.4) | v1.4 | 35/35 | ✅ Shipped | 2026-04-23 |
| 31-38.2 (v1.5) | v1.5 | 32/32 | ✅ Shipped | 2026-04-29 |

## Backlog

### Phase 999.1: Explorer — toggle to hide zero-count resource types (BACKLOG)

**Goal:** Add a Mantine `Switch` near the top of the Explorer resource-type landing (`/explorer`) labeled "Hide empty resource types" (default off, persisted to localStorage). When on, types with `counts[type] === 0` collapse out of the list. When off, the existing full list is shown.

**Why:** Today `/explorer` lists every supported FHIR resource type. Many show 0 against typical Synthea bundles (e.g. on the Phase 38 walk: `MedicationStatement`, `AllergyIntolerance`, `Consent`, `Immunization`, `ServiceRequest` were all zero). The list is noisy when most types are empty.

**Likely files:**
- `src/components/explorer/ResourceTypeLanding.tsx` — landing component
- Counts source: same map the Dashboard uses (`src/components/dashboard/DashboardPage.tsx`)

**Source:** Verifier observation surfaced during Phase 38 HUMAN-UAT walk (2026-04-28), Plan 38-02 Test 1 (Explorer Date/Status columns across 6 types). The MedicationStatement empty-state navigation made the noise pattern obvious.

**Requirements:** TBD
**Plans:** TBD

Plans:
- [ ] TBD (promote with /gsd-review-backlog when ready)

### Phase 999.2: Quality completeness — sort non-empty resource types to the top (BACKLOG)

**Goal:** Change the default sort behavior in `/quality?tab=completeness` so resource types with actual data (non-empty `total`) appear at the top of the per-type table; types with no records (`total === 0`, pct=null) sink to the bottom.

**Why:** Today the panel's default sort is `completeness ASC / worst-first` (`CompletenessPanel.tsx`). Zero-count types map their pct to `null → -1` in `compareRows`, which under ascending sort puts them BEFORE every populated type. Result: against a Synthea bundle the user opens the page and sees five empty types stacked at the top (`AllergyIntolerance`, `Consent`, `Immunization`, `ServiceRequest`, `MedicationStatement` — all 0 records) before any meaningful row. Verifier observation: "non-empty Resources in `/quality?tab=completeness` are at the end rather than at the top of the list."

**Suggested fix:** Treat `pct === null` as "not-applicable" rather than "worst possible" in `compareRows`. Push N/A rows to the end regardless of sort direction (mirror the existing `aSettled !== bSettled` pattern that already pushes loading/error rows to the end). Possibly add a small "—" badge or muted styling for the empty rows so it's obvious why they're sorted to the bottom.

**Likely files:**
- `src/components/quality/CompletenessPanel.tsx` — `compareRows` (line ~59) and `toRow` (line ~50ish)
- Same pattern likely applies to `CoveragePanel`, `ValidationPanel`, `ReferencesPanel` if they sort similarly — audit before fixing.

**Source:** Verifier observation during Phase 38 HUMAN-UAT walk (2026-04-28).

**Requirements:** TBD
**Plans:** 0 plans

Plans:
- [ ] TBD (promote with /gsd-review-backlog when ready)
