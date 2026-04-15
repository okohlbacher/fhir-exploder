---
gsd_state_version: 1.0
milestone: v1.3
milestone_name: -- Cohort Definition & Storage
status: executing
stopped_at: Completed Plan 21-04 (CHRT-04 rename + legacy migration)
last_updated: "2026-04-15T18:55:00.000Z"
last_activity: 2026-04-15 -- Phase 21 Plan 04 executed (6 commits, zero regression)
progress:
  total_phases: 10
  completed_phases: 6
  total_plans: 31
  completed_plans: 29
  percent: 94
---

# Project State

## Project Reference

See: .planning/PROJECT.md (updated 2026-04-15)

**Core value:** Connect to a Blaze FHIR server and make its contents human-readable and navigable without requiring deep FHIR expertise.
**Current focus:** Planning v1.3 — Cohort Definition & Storage (Phases 21-22)

## Current Position

Phase: 21 (Wave 1 executing)
Plan: 21-04 complete — next up is 21-05 (if any remain) then 21-06 (dashboard wiring)
Status: Executing
Last activity: 2026-04-15 -- Plan 21-04 executed: CohortSelector → ResourceTypeSelector + localStorage migration + snapshot legacy reader

Progress: [░░░░░░░░░░] 0%

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

Last session: 2026-04-15T18:55:00.000Z
Stopped at: Completed Plan 21-04 (CHRT-04 rename + legacy migration); Plans 21-02/21-03/21-04 all Wave 1 complete
Resume file: .planning/phases/21-interactive-cohort-builder-rename/21-06-PLAN.md
