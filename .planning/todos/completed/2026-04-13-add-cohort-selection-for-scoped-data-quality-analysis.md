---
created: 2026-04-13T20:00:00.000Z
title: Add cohort selection for scoped data quality analysis
area: ui
files: []
status: roadmapped
roadmapped: 2026-04-14
milestone: v1.3
phase: 20
requirements: [CHRT-01, CHRT-02, CHRT-03]
---

> **Roadmapped 2026-04-14:** Promoted into milestone v1.3 "Cohort Definition & Storage",
> Phase 20 "Interactive Cohort Builder + Rename". Satisfied by requirements CHRT-01
> (interactive builder), CHRT-02 (localStorage persistence), CHRT-03 (dashboard scoping).
> See `.planning/milestones/v1.3-REQUIREMENTS.md` and `.planning/ROADMAP.md` §Phase 20.


## Problem

Data quality analysis currently runs against all resources of each type on the server. Users need the ability to select a subset of encounters or patients (a "cohort") and scope all quality dashboard analyses to that cohort. Without this, quality metrics are always server-wide, making it impossible to compare quality across departments, time periods, or patient populations.

## Solution

Add a cohort selection mechanism that lets users define a subset of patients or encounters (e.g., by date range, department, condition, or manual selection). The quality dashboard panels (completeness, coding coverage, validation) should accept an optional cohort filter. When no cohort is selected, analysis applies to the totality of cases on the server (current behavior). When a cohort is active, all quality walkers scope their sampling to cohort members only.
