---
gsd_state_version: 1.0
milestone: v1.3
milestone_name: -- Cohort Definition & Storage
status: Awaiting human UAT
stopped_at: Plan 21-06 code complete; T-6.3 human UAT PENDING (live Blaze server required)
last_updated: "2026-04-16T04:10:21.366Z"
last_activity: "2026-04-16 -- Plan 21-06 executed: ActiveCohortSelect + toolbar + thread patientIds through 8 hooks + cohort in captureSnapshot/PDF"
progress:
  total_phases: 10
  completed_phases: 7
  total_plans: 31
  completed_plans: 31
  percent: 100
---

# Project State

## Project Reference

See: .planning/PROJECT.md (updated 2026-04-15)

**Core value:** Connect to a Blaze FHIR server and make its contents human-readable and navigable without requiring deep FHIR expertise.
**Current focus:** Planning v1.3 — Cohort Definition & Storage (Phases 21-22)

## Current Position

Phase: 21 (Wave 3 — final — code complete; human UAT pending on 21-06)
Plan: 21-06 code complete (ActiveCohortSelect + patientIds threaded end-to-end + cohort metadata in snapshots/PDF). T-6.3 is a blocking `checkpoint:human-verify` gate awaiting UAT A/B/C/D against a live Blaze server.
Status: Awaiting human UAT
Last activity: 2026-04-16 -- Plan 21-06 executed: ActiveCohortSelect + toolbar + thread patientIds through 8 hooks + cohort in captureSnapshot/PDF

Progress: [██████████] 100%

## Performance Metrics

**Velocity:**

- Total plans completed (v1.2): 22
- Total phases shipped (v1.2): 7 (14-20)

## Accumulated Context

### Decisions

- v1.3 scope: cohort definition + storage (7 requirements, CHRT-01..07 across Phases 21 + 22)
- Phase 21 before Phase 22: interactive builder establishes the storage/scoping contract that FHIRPath + FDPG reuse
- Rename "Cohort" control → "Resource types" in Phase 21 to fix the long-standing UX mismatch
- Plan 21-04 D-11: one-shot localStorage migration runs at QualityLayout mount (parent effect before child useLocalStorage reads); never-clobber + unconditional legacy removeItem; migrateSnapshot normalizes persisted trend rows on read and returns null for corrupt payloads (T-21-13)
- Plan 21-06 D-6.1: threaded optional `patientIds?: string[]` through each of 7 panel components rather than hoisting hook calls into QualityOverviewPage — minimal surface change, backward-compatible (undefined = unscoped)
- Plan 21-06 D-6.2: bundled T-6.3 handleCapture/handleExport cohort threading into the T-6.1 QualityOverviewPage rewrite (atomic diff) instead of a separate commit
- Plan 21-06 D-6.3: use literal Unicode chars (—, …, ·) in JSX strings rather than \u escapes — JSX attribute values don't interpret \u sequences and would render them literally
- [Phase 21]: Plan 21-06: threaded patientIds through panel-component props rather than hoisting hook calls — minimal surface change, backward-compatible

### Pending Todos

None tracked in STATE; v1.3 planning kick-off via `/gsd-new-milestone` or `/gsd-plan-phase 21`.

### Completed Todos

Cohort-related todos consumed by v1.3 REQUIREMENTS:

- ~~Add cohort selection for scoped data quality analysis~~ — absorbed by CHRT-01/02/03 (Phase 21)
- ~~Define cohorts via FHIRPath query or MII FDPG format~~ — absorbed by CHRT-05/06/07 (Phase 22)
- ~~Cohort selector UI mismatch (rename or replace)~~ — rename handled by CHRT-04 (Phase 21)

### Blockers/Concerns

None.

## Session Continuity

Last session: 2026-04-16T04:10:21.364Z
Stopped at: Plan 21-06 code complete; T-6.3 human UAT PENDING (live Blaze server required)
Resume file: None
