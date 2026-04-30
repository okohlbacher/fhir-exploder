# Roadmap: FHIR Exploder

## Milestones

- ✅ **v1.0 -- MVP (shipped 2026-04-12)** -- [Archive](milestones/v1.0-ROADMAP.md) . [Requirements](milestones/v1.0-REQUIREMENTS.md)
- ✅ **v1.1 -- UX Polish & Data Export (shipped 2026-04-12)** -- [Archive](milestones/v1.1-ROADMAP.md) . [Requirements](milestones/v1.1-REQUIREMENTS.md)
- ✅ **v1.2 -- Tech Debt & Quality Monitoring (shipped 2026-04-15)** -- [Archive](milestones/v1.2-ROADMAP.md) . [Requirements](milestones/v1.2-REQUIREMENTS.md)
- ✅ **v1.3 -- Cohort Definition & Storage (shipped 2026-04-16)** -- [Archive](milestones/v1.3-ROADMAP.md) . [Requirements](milestones/v1.3-REQUIREMENTS.md) . [Audit](milestones/v1.3-MILESTONE-AUDIT.md)
- ✅ **v1.4 -- Hardening & Tech-Debt Sweep (shipped 2026-04-23)** -- [Archive](milestones/v1.4-ROADMAP.md) . [Requirements](milestones/v1.4-REQUIREMENTS.md) . [Audit](milestones/v1.4-MILESTONE-AUDIT.md)
- ✅ **v1.5 -- Validation, Performance & MII Extensions (shipped 2026-04-29)** -- [Archive](milestones/v1.5-ROADMAP.md) . [Requirements](milestones/v1.5-REQUIREMENTS.md) . [Audit](milestones/v1.5-MILESTONE-AUDIT.md)
- ✅ **v1.6 -- Hardening, UX Polish & Carry-Overs (shipped 2026-04-30)** -- [Archive](milestones/v1.6-ROADMAP.md) . [Requirements](milestones/v1.6-REQUIREMENTS.md)

## Deferred Items

Carried beyond v1.6 (re-evaluate at v1.7 milestone-new):

- **STACK-01 (Mantine 9 / React 19 upgrade):** Phase 45 peer-dep gate fired `WAIVE-AND-DEFER` on 2026-04-30 — `@medplum/react@5.1.9` peers Mantine `^8.0.0` only. Re-run `npm view @medplum/react peerDependencies` at v1.7 milestone start; if range now includes `^9.x`, reactivate Phase 45 from `.planning/milestones/v1.6-phases/45-*/45-CONTEXT.md` and replan.
- Federated cohort queries (server-side CQL) — v1.3 deferred, no demand surfaced
- Cohort versioning / audit history — v1.3 deferred
- Phenotype-style multi-criteria builder — v1.3 deferred

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

<details>
<summary>✅ v1.6 Hardening, UX Polish & Carry-Overs (Phases 39-45) — SHIPPED 2026-04-30</summary>

- [x] Phase 39: v1.5 audit-trail backfill (NYQ + AUDIT) (3/3 plans) — completed 2026-04-29
- [x] Phase 40: Headless deuteranopia simulation in Vitest (DEUT) (1/1 plan) — completed 2026-04-29
- [x] Phase 41: Explorer + Quality UX polish (EXPL + QUAL-01/02/03) (3/3 plans) — completed 2026-04-29
- [x] Phase 42: Pre-probe extension-module counts (MII-EXT-15) (2/2 plans) — completed 2026-04-29
- [x] Phase 43: Validator hardening — auth + semantic near-miss (VAL-06 + VAL-07) (2/2 plans) — completed 2026-04-30
- [x] Phase 44: IPS Compositions support (IPS-01) (2/2 plans) — completed 2026-04-30
- [~] Phase 45: Mantine 9 upgrade (STACK-01) — DEFERRED to v1.7 (peer-dep gate failed: `@medplum/react@5.1.9` peers Mantine `^8.0.0` only; re-evaluate at v1.7 milestone start)

Full details: [milestones/v1.6-ROADMAP.md](milestones/v1.6-ROADMAP.md)

</details>

## Progress

| Phase | Milestone | Plans Complete | Status | Completed |
|-------|-----------|----------------|--------|-----------|
| 14-20 (v1.2) | v1.2 | 22/22 | ✅ Shipped | 2026-04-15 |
| 21-22 (v1.3) | v1.3 | 9/9 | ✅ Shipped | 2026-04-16 |
| 23-30 (v1.4) | v1.4 | 35/35 | ✅ Shipped | 2026-04-23 |
| 31-38.2 (v1.5) | v1.5 | 32/32 | ✅ Shipped | 2026-04-29 |
| 39-45 (v1.6) | v1.6 | 14/14 (45 deferred) | ✅ Shipped | 2026-04-30 |

## Backlog

*No active backlog items — milestone v1.6 ships with all surfaced ideas accounted for.*

## Resolved Backlog (archived 2026-04-30)

Both items below were carried into v1.6 Phase 41 (Explorer + Quality UX polish) and shipped on 2026-04-29. Kept here for audit trail; CLI no longer treats them as pending phases.

- [x] **Former 999.1: Explorer hide-empty toggle** — promoted to **Phase 41 (EXPL-01)** on 2026-04-29; shipped via Mantine `Switch` on `/explorer` resource-type landing with localStorage persistence. Source: Phase 38 HUMAN-UAT verifier observation.
- [x] **Former 999.2: Quality completeness non-empty-sort** — promoted to **Phase 41 (QUAL-01)** on 2026-04-29; shipped via `compareRows` N/A-to-bottom fix in `CompletenessPanel.tsx`. Source: Phase 38 HUMAN-UAT verifier observation.
