---
created: 2026-04-14T17:30:00.000Z
title: CohortSelector UI mismatch — it filters resource types, not a patient/encounter cohort
area: ui
files:
  - src/components/quality/CohortSelector.tsx
  - src/components/quality/QualityOverviewPage.tsx
source: feedback/feedback-2026-04-14T16-58-05-089Z_b771275a.json
related: 2026-04-13-add-cohort-selection-for-scoped-data-quality-analysis.md
status: roadmapped
roadmapped: 2026-04-14
milestone: v1.3
phase: 20
requirements: [CHRT-04]
---

> **Roadmapped 2026-04-14:** Short-term rename ("Cohort" → "Resource types") is now
> captured as requirement CHRT-04 under Phase 20 "Interactive Cohort Builder + Rename".
> The long-term "real cohort" half of this todo is absorbed by the rest of v1.3
> (CHRT-01..03 in Phase 20, CHRT-05..07 in Phase 21). See
> `.planning/milestones/v1.3-REQUIREMENTS.md` and `.planning/ROADMAP.md` §Phase 20.


## Problem

The control labeled "Cohort" in `/quality` is a multi-select listing ALL available FHIR resource types (Patient, Condition, Observation, CapabilityStatement, CarePlan, …). It filters which resource TYPES the quality panels analyze — it does NOT define a cohort in the clinical sense (a subset of patients or encounters). Users encountering the label "Cohort" expect the latter and report the mismatch as broken.

Logged from user feedback on `/quality?tab=references` (2026-04-14): "The cohort selector does not select a cohort, but just a list of resources."

## Solution

Two-phase:

1. **Short term (UI relabel, zero behavior change):** Rename the control in `CohortSelector.tsx` from "Cohort" to "Resource types" (or "Types filter"). Update any dependent copy in UI-SPEC docs. This closes the mismatch immediately and stops the UX complaint.

2. **Long term (actual cohort feature):** Implement a proper cohort definition mechanism alongside the types filter. This is already captured in the pending todo `2026-04-13-add-cohort-selection-for-scoped-data-quality-analysis.md` (patient/encounter subset via date range, condition, FHIRPath, or list of references). The types filter ("scope analysis to these resource kinds") and the cohort ("analyze only these patients/encounters") are both legitimate — they compose orthogonally. Keep them as two distinct controls.

Execute (1) independently; (2) remains on the backlog as its own larger piece of work.
