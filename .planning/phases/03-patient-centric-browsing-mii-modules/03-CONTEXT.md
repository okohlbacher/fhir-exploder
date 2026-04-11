# Phase 3: Patient-Centric Browsing & MII Modules - Context

**Gathered:** 2026-04-11
**Status:** Ready for planning

<domain>
## Phase Boundary

Deliver patient-centric browsing — a patient list with search, patient detail pages with clinical data organized by category, MII Kerndatensatz module tabs (Diagnose, Prozedur, Laborbefund, Medikation, Fall, Consent), a chronological clinical timeline, and a toggle between MII module navigation and raw FHIR resource type browsing.

</domain>

<decisions>
## Implementation Decisions

### Patient List
- **D-01:** [auto] Patient list as a searchable table using Medplum SearchControl — columns for name, birthDate, gender, identifier. Search fields for name, identifier, and birthDate.
- **D-02:** [auto] Patient list accessible from the sidebar "Patients" nav item. Separate from the generic Resource Explorer.

### Patient Detail Page
- **D-03:** [auto] Patient header banner using Medplum's PatientHeader component — shows name, DOB, gender, identifiers, photo if available.
- **D-04:** [auto] Clinical data below the header organized into tabbed sections. Default view shows MII Kerndatensatz module tabs.

### MII Kerndatensatz Module Tabs
- **D-05:** [auto] Tab bar with German module names as primary labels and FHIR resource type as subtitle:
  - Diagnose (Condition)
  - Prozedur (Procedure)
  - Laborbefund (Observation)
  - Medikation (MedicationStatement/MedicationRequest)
  - Fall (Encounter)
  - Consent (Consent)
- **D-06:** [auto] Each tab shows a table of resources of that type for the patient, using FHIR search with patient reference parameter. Clicking a row opens the resource detail view (reusing Phase 2 display modes).

### Clinical Timeline
- **D-07:** [auto] Chronological timeline view as an additional tab or toggle — shows encounters, conditions, procedures, and observations in date order. Each entry shows date, type badge, and summary.
- **D-08:** [auto] Timeline entries are clickable, opening the full resource detail view.

### MII vs Raw Toggle
- **D-09:** [auto] Toggle switch at the top of the patient detail page — "MII Modules" vs "FHIR Resources". MII view shows the Kerndatensatz tabs. FHIR view shows all resource types linked to this patient (similar to Explorer but patient-scoped).
- **D-10:** [auto] Default to MII Modules view. User preference remembered in component state for the session.

### Claude's Discretion
- Patient list pagination defaults and behavior
- Timeline visual styling (vertical line vs cards vs list)
- How to handle resource types not covered by MII modules in the MII view

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Project Documentation
- `.planning/PROJECT.md` — Project vision, MII Kerndatensatz module mapping
- `.planning/REQUIREMENTS.md` — PTNT-01 through PTNT-05 requirements for this phase
- `.planning/ROADMAP.md` — Phase 3 success criteria and dependencies
- `CLAUDE.md` — Medplum components (PatientHeader, PatientSummary, ObservationTable, DiagnosticReportDisplay), MII module-to-FHIR mapping

### Prior Phase Context
- `.planning/phases/01-foundation-blaze-connectivity/01-CONTEXT.md` — App shell, sidebar, light theme
- `.planning/phases/02-resource-explorer/02-CONTEXT.md` — Display modes, reference navigation, search patterns

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- Phase 2 establishes: resource detail views with three display modes, reference navigation, search interface patterns
- Medplum's PatientHeader, PatientSummary, ObservationTable for patient-specific rendering

### Established Patterns
- SearchControl for resource listing and search (from Phase 2)
- Three display modes for resource detail (from Phase 2)
- Sidebar + react-router navigation (from Phase 1)

### Integration Points
- Patient list as a new sidebar route
- Patient detail page links into Phase 2 resource detail views
- MII module tabs use same FHIR search patterns as Explorer but scoped to patient

</code_context>

<specifics>
## Specific Ideas

- MII Kerndatensatz modules use German labels (Diagnose, Prozedur, Laborbefund, Medikation, Fall, Consent) with FHIR resource type subtitles — this mirrors how MII documentation presents these modules.

</specifics>

<deferred>
## Deferred Ideas

None — discussion stayed within phase scope.

</deferred>

---

*Phase: 03-patient-centric-browsing-mii-modules*
*Context gathered: 2026-04-11*
