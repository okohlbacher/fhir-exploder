# FHIR Exploder

## What This Is

A local-first React application for exploring, browsing, and auditing data on a FHIR server (Blaze). Built with Medplum React components, it provides three entry points — patient-centric browsing, generic resource exploration, and data quality auditing — with the MII Kerndatensatz as an optional navigation lens. Resolves terminology display values via the MII Terminology Server.

## Core Value

Connect to a Blaze FHIR server and make its contents human-readable and navigable — from patient-level clinical views down to raw FHIR JSON — without requiring deep FHIR expertise to understand what's in there.

## Requirements

### Validated

- [x] Connect to a Blaze FHIR server with configurable URL and auth (open, basic auth, or bearer token) via settings.yaml — Validated in Phase 1: Foundation & Blaze Connectivity
- [x] Generic resource explorer: browse any FHIR resource type, search/filter, paginate through large result sets, inspect individual resources — Validated in Phase 2: Resource Explorer
- [x] Three display modes per resource: human-readable (default), clinical+raw toggle, developer/FHIR-structure view — Validated in Phase 2: Resource Explorer
- [x] Patient-centric browsing: list patients, drill into their clinical data organized by MII Kerndatensatz modules (Diagnose, Prozedur, Laborbefund, Medikation, Fall, Consent) — Validated in Phase 3: Patient-Centric Browsing & MII Modules

### Active
- [ ] Data quality dashboard: resource counts per type, field completeness stats, coding coverage metrics
- [ ] Profile validation: validate resources against MII Kerndatensatz profiles and display conformance issues
- [ ] MII Kerndatensatz as optional navigation lens alongside raw FHIR resource type browsing
- [ ] Resolve CodeableConcept display values via MII Terminology Server (https://terminology.medizininformatik-initiative.de/fhir)
- [ ] Handle large datasets (50K+ resources) with proper pagination, lazy loading, and performant queries
- [ ] Settings management via settings.yaml for server URL, auth credentials, terminology server URL

### Out of Scope

- Write operations (creating/updating/deleting FHIR resources) — this is a read-only explorer
- User authentication/authorization for the app itself — local-only tool, no login
- SMART on FHIR launch context — not needed for direct Blaze access
- Multi-server simultaneous browsing — one server connection at a time
- Data export/ETL — focus is exploration, not extraction

## Context

- **FHIR Server:** Blaze (https://github.com/samply/blaze), running locally in a container at localhost:8080
- **UI Components:** Medplum React (`@medplum/react`) provides ResourceTable, BundleDisplay, and resource-specific rendering components
- **Type System:** `@medplum/fhirtypes` for TypeScript FHIR R4 type definitions
- **Terminology:** MII Terminology Server is publicly accessible, used for $lookup and $translate operations on CodeableConcepts
- **MII Kerndatensatz modules:** Person (Patient), Fall (Encounter), Diagnose (Condition), Prozedur (Procedure), Laborbefund (Observation), Medikation (MedicationStatement/MedicationRequest), Consent — these map to FHIR resource types with MII-specific profiles
- **Data scale:** Production-scale datasets (50K+ resources), so efficient FHIR search with _count, _sort, and pagination links is critical
- **Stack:** TypeScript + React + Vite

## Constraints

- **Tech stack**: React + Vite + TypeScript with Medplum React components — chosen for FHIR-native rendering
- **Runtime**: Local-only, runs in browser against localhost or reachable FHIR server
- **FHIR version**: R4 (Blaze default, MII profiles are R4)
- **Terminology**: Must handle terminology server being unavailable gracefully (fall back to raw codes)
- **License**: MIT (see `LICENSE` at the repo root)

## Key Decisions

| Decision | Rationale | Outcome |
|----------|-----------|---------|
| Medplum React for FHIR rendering | TypeScript-first, comprehensive resource components, maintained | ✓ Validated Phase 1 |
| settings.yaml for configuration | Simple file-based config, no database needed for a local tool | ✓ Validated Phase 1 |
| MII Kerndatensatz as optional lens | Users may want MII-structured OR raw FHIR views depending on task | — Pending |
| Three auth modes (open/basic/token) | Covers common Blaze deployment configurations | — Pending |

## Evolution

This document evolves at phase transitions and milestone boundaries.

**After each phase transition** (via `/gsd-transition`):
1. Requirements invalidated? → Move to Out of Scope with reason
2. Requirements validated? → Move to Validated with phase reference
3. New requirements emerged? → Add to Active
4. Decisions to log? → Add to Key Decisions
5. "What This Is" still accurate? → Update if drifted

**After each milestone** (via `/gsd-complete-milestone`):
1. Full review of all sections
2. Core Value check — still the right priority?
3. Audit Out of Scope — reasons still valid?
4. Update Context with current state

---
*Last updated: 2026-04-12 after Phase 3 completion*
