# Phase 3: Patient-Centric Browsing & MII Modules - Discussion Log

> **Audit trail only.** Do not use as input to planning, research, or execution agents.
> Decisions are captured in CONTEXT.md — this log preserves the alternatives considered.

**Date:** 2026-04-11
**Phase:** 03-patient-centric-browsing-mii-modules
**Areas discussed:** Patient list, Patient detail page, MII Kerndatensatz module tabs, Clinical timeline, MII vs Raw toggle
**Mode:** Auto — recommended defaults selected without manual interaction per user request.

---

## Patient List
[auto] Searchable table via SearchControl with name/birthDate/gender/identifier columns. Sidebar nav item. Recommended default selected.

## Patient Detail Page
[auto] PatientHeader banner + tabbed clinical data sections below. Recommended default selected.

## MII Kerndatensatz Module Tabs
[auto] Tab bar with German labels + FHIR resource type subtitles: Diagnose (Condition), Prozedur (Procedure), Laborbefund (Observation), Medikation (MedicationStatement/MedicationRequest), Fall (Encounter), Consent. Recommended default selected.

## Clinical Timeline
[auto] Additional tab showing chronological entries with date, type badge, summary. Clickable to detail view. Recommended default selected.

## MII vs Raw Toggle
[auto] Toggle switch at top of patient detail — "MII Modules" vs "FHIR Resources". Default MII. Session-persistent. Recommended default selected.

## Claude's Discretion
- Patient list pagination defaults
- Timeline visual styling
- Handling resource types outside MII modules

## Deferred Ideas
None.
