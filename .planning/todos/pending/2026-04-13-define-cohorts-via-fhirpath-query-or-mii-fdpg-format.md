---
created: 2026-04-13T19:56:14.862Z
title: Define cohorts via FHIRPath query or MII FDPG format
area: ui
files: []
---

## Problem

The UI-based cohort selection (see sibling todo) covers interactive filtering, but power users and interoperability workflows need programmatic cohort definition. Specifically:

1. **FHIRPath queries:** Users should be able to define a cohort by writing a FHIRPath expression that selects matching patients or encounters.
2. **MII FDPG cohort format:** The MII Forschungsdatenportal für Gesundheit (FDPG) generates cohort definitions in a JSON format. Users should be able to import these definitions to scope quality analysis.
3. **Exportable cohort definitions:** The resulting cohort (however defined) should produce a cohort definition that can be reused for data quality reports.
4. **Cohort deletion:** Users need a way to delete previously created/saved cohort definitions.

Without this, cohort definitions are limited to manual UI filtering and cannot integrate with existing MII FDPG tooling or be shared/reused programmatically.

## Solution

- Add a "Define Cohort" dialog with tabs for FHIRPath expression input and FDPG JSON import
- Parse and validate FHIRPath expressions against the connected server's resources
- Parse MII FDPG cohort JSON format into an internal cohort representation
- Store cohort definitions (localStorage or settings.yaml) with name, creation date, and definition source
- Provide a cohort management view: list saved cohorts, delete individual cohorts
- Integrate with the quality dashboard's cohort filter (from the sibling UI-based cohort todo)
- Research the exact MII FDPG JSON schema before implementation (user indicated uncertainty about format details)
