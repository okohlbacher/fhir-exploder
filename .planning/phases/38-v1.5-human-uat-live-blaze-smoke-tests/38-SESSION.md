---
phase: 38-v1.5-human-uat-live-blaze-smoke-tests
captured_by: plan-38-01
captured_at: 2026-04-28T07:36:25Z
status: pre_flight_passed
---

# Phase 38 Session Fingerprint

**Source-of-truth for Blaze + Synthea identity across Plans 38-01, 38-02, 38-03.**

Captured ONCE at the start of Plan 38-01 task 0 per CONTEXT D-13 (single-source-of-truth) and D-14 (counts-table format). Plans 38-02 and 38-03 read this file rather than re-querying Blaze.

## Blaze instance

- **URL:** `http://localhost:8080/fhir` (from `public/settings.yaml` `fhir.serverUrl`)
- **metadata.software:** `Blaze 1.6.2`
- **metadata HTTP status:** `200`
- **Capture timestamp (UTC):** `2026-04-28T07:36:25Z`

## Pre-flight checklist (D-15)

| # | Check | Status |
| - | ----- | ------ |
| 1 | `http://localhost:8080/fhir/metadata` returns 200 | PASS |
| 2 | `Patient?_summary=count` ≥ 1 (actual: `975`) | PASS |
| 3 | `Observation?_summary=count` ≥ 1 (actual: `437889`) | PASS |
| 4 | Dev server reachable on `http://localhost:5173/` | PASS |
| 5 | `public/settings.yaml` `fhir.serverUrl` confirmed by verifier | PASS |

## Synthea bundle fingerprint (per-resource-type counts)

Source: `GET http://localhost:8080/fhir/<Type>?_summary=count → Bundle.total`

| Resource type        | Count |
| -------------------- | ----- |
| Patient              | 975   |
| Condition            | 36849 |
| Observation          | 437889 |
| Encounter            | 64464 |
| Procedure            | 104668 |
| MedicationStatement  | 299   |
| AllergyIntolerance   | 0     |
| Consent              | 0     |
| Immunization         | 0     |
| DiagnosticReport     | 114417 |
| ServiceRequest       | 0     |

## Notes

Counts captured ONCE at session start per D-13. Plans 38-02 and 38-03 reuse this fingerprint without re-capture; do not re-import Synthea or restart Blaze between plan executions or this fingerprint becomes invalid (D-09 single-session invariant).

Zero-count types (`AllergyIntolerance`, `Consent`, `Immunization`, `ServiceRequest`) are legitimate data-coverage gaps in this Synthea bundle (per `33-01-INVESTIGATION.md`). Tests that require records for these types will exercise the data-coverage override path (D-01).
