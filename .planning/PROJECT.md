# FHIR Exploder

## What This Is

A local-first React application for exploring, browsing, and auditing data on a FHIR server (Blaze). Built with Medplum React components, it provides three entry points — patient-centric browsing, generic resource exploration, and data quality auditing — with the MII Kerndatensatz as an optional navigation lens. Resolves terminology display values via the MII Terminology Server.

## Core Value

Connect to a Blaze FHIR server and make its contents human-readable and navigable — from patient-level clinical views down to raw FHIR JSON — without requiring deep FHIR expertise to understand what's in there.

## Requirements

### Validated (v1.0 — shipped 2026-04-12)

- [x] Blaze connectivity with configurable URL + auth (open/basic/bearer) via settings.yaml — Phase 1
- [x] Generic resource explorer: browse, search, paginate, inspect any FHIR resource type — Phase 2
- [x] Three display modes per resource (human-readable/clinical+raw/developer) — Phase 2
- [x] Reference field click-through with patient-context preservation — Phase 2 + Phase 6 (gap closure)
- [x] `_include` / `_revinclude` for related resources — Phase 2
- [x] Patient-centric browsing with MII Kerndatensatz module tabs + clinical timeline — Phase 3
- [x] MII Kerndatensatz as optional navigation lens alongside raw FHIR — Phase 3
- [x] CodeableConcept resolution via MII Terminology Server (Ontoserver) with LRU cache + graceful fallback — Phase 4
- [x] Data quality dashboard: counts, field completeness, coding coverage, profile validation — Phase 5
- [x] Sampling-based quality analysis (10..1000 clamp) to handle 50K+ resource sets — Phase 5
- [x] Settings management via settings.yaml (server URL, auth, terminology, validation) — Phase 1 + Phase 4 + Phase 5

## Current State

**v1.0 shipped 2026-04-12** — see `.planning/milestones/v1.0-ROADMAP.md`. All 25 v1 requirements delivered across 8 phases (5 feature + 3 gap-closure). 286 tests green, 5/5 Nyquist compliant, full milestone audit passed.

**v1.1-dev** tagged with Blaze compatibility fixes, dev feedback system, and 8 user-feedback-driven UI improvements (custom search table, ResourcePropertyTable, collapsible JSON tree, dashboard tiles, wildcard search, patient related resources).

**Phase 14 complete (2026-04-13)** — All 17 info-level code review findings resolved, zero TypeScript build errors. New `fhir-helpers.ts` utility with `toRecord()` and `getCodeDisplay()` helpers.

**Phase 16 complete (2026-04-14)** — Conformance & plausibility checks: profile conformance checker (cardinality, types, value set bindings), temporal plausibility walker (future dates, period consistency, age/duration limits), lab reference range checker. All wired into 6-tab quality dashboard with drill-downs and cohort selector. 43 new tests, build clean.

**Phase 19 complete (2026-04-14)** — Quality trends & PDF reports (QUAL-05, QUAL-06): `quality.trends.v1` localStorage-persisted snapshot history with server filter, 9th "Trends" tab on `/quality` with 7 per-metric mini-charts + overlay mode + breach-colored points (historical thresholds preserved per D-11), and `Capture snapshot` + `Export PDF` toolbar buttons. PDF pipeline (`html-to-image → jsPDF`) produces a deterministic 816×1056 multi-page report with font-readiness gate. 77 new tests, human UAT approved, 4/4 must-haves verified.

## Current Milestone: v1.2 — Tech Debt & Quality Monitoring

**Goal:** Resolve all accumulated tech debt, then build comprehensive data quality monitoring inspired by Kahn et al. framework (conformance, completeness, plausibility) as applied in Spengler (2021).

**Target features:**
- DEBT-01/02: 17 info-level code review fixes + zero TypeScript build errors
- DQ-01/02: Quality issue drill-down (click metric to see specific resources/fields, link to detail view)
- DQ-03/04: Conformance checks (value set validation, cardinality rules)
- DQ-05/06: Plausibility checks (temporal plausibility, lab reference ranges)
- DQ-07/08: Duplicate detection (patient matching, content hash deduplication)
- DQ-09/10: Relational integrity (broken references, orphan resources)
- DQ-11/12: Quality alerting (configurable thresholds, visual breach indicators)
- QUAL-05: Quality metric trends over time
- QUAL-06: PDF quality report generation

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
| MII Kerndatensatz as optional lens | Users may want MII-structured OR raw FHIR views depending on task | ✓ Validated Phase 3 |
| Three auth modes (open/basic/token) | Covers common Blaze deployment configurations | ✓ Validated Phase 1 |
| Mantine-only visuals for v1 (no charts library) | Bundle budget (~150KB savings); Progress/RingProgress satisfy visual indicator needs | ✓ Validated Phase 5 |
| Dual-source profile validation (structural + optional remote) | Blaze does not implement $validate; structural walker always available, remote via user-configured validatorUrl | ✓ Validated Phase 5 |
| Sampling over full scans | 50K+ resources can OOM browser; first N per type with client-side 10..1000 clamp | ✓ Validated Phase 5 |
| PHI acknowledgment gate for remote validation | Explicit user consent before POSTing full resources to external validator | ✓ Validated Phase 7 |

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
*Last updated: 2026-04-14 — Phase 17 duplicate detection & relational integrity complete (DQ-07, DQ-08, DQ-09, DQ-10 validated)*
