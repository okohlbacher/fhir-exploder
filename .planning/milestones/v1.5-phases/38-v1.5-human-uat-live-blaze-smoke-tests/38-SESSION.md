---
phase: 38-v1.5-human-uat-live-blaze-smoke-tests
captured_by: plan-38-01
captured_at: 2026-04-28T12:02:13Z
status: pre_flight_passed
restart_note: "Blaze container restart mid-session; original eyematics-blaze container killed (SIGKILL) before walks began. Re-bootstrapped via ~/mii-testdata/blaze/blaze.yml + reloaded 500 Synthea bundles from ~/mii-testdata/synthea/generated-testdata/fhir-mii/. Counts below are the AUTHORITATIVE post-restore fingerprint that Plans 38-01 + 38-02 walks will reference."
---

# Phase 38 Session Fingerprint

**Source-of-truth for Blaze + Synthea identity across Plans 38-01, 38-02, 38-03.**

Captured ONCE at the start of Plan 38-01 task 0 per CONTEXT D-13 (single-source-of-truth) and D-14 (counts-table format). Plans 38-02 and 38-03 read this file rather than re-querying Blaze.

## Blaze instance

- **URL:** `http://localhost:8080/fhir` (from `public/settings.yaml` `fhir.serverUrl`)
- **metadata.software:** `Blaze 1.6.2`
- **fhirVersion:** `4.0.1`
- **metadata HTTP status:** `200`
- **Container:** `blaze-blaze-1` (compose: `~/mii-testdata/blaze/blaze.yml`, image `samply/blaze:latest`, host port 8080→8080, ENFORCE_REFERENTIAL_INTEGRITY=true)
- **Capture timestamp (UTC):** `2026-04-28T12:02:13Z`

## Pre-flight checklist (D-15)

| # | Check | Status |
| - | ----- | ------ |
| 1 | `http://localhost:8080/fhir/metadata` returns 200 | PASS |
| 2 | `Patient?_summary=count` ≥ 1 (actual: `500`) | PASS |
| 3 | `Observation?_summary=count` ≥ 1 (actual: `349715`) | PASS |
| 4 | Dev server reachable on `http://localhost:5173/` | PASS |
| 5 | `public/settings.yaml` `fhir.serverUrl` confirmed by verifier | PASS |

## Synthea bundle fingerprint (per-resource-type counts)

Source: `GET http://localhost:8080/fhir/<Type>?_summary=count → Bundle.total`

| Resource type        | Count  |
| -------------------- | ------ |
| Patient              | 500    |
| Condition            | 30022  |
| Observation          | 349715 |
| Encounter            | 51139  |
| Procedure            | 82400  |
| MedicationStatement  | 0      |
| AllergyIntolerance   | 0      |
| Consent              | 0      |
| Immunization         | 0      |
| DiagnosticReport     | 93193  |
| ServiceRequest       | 0      |

## Notes

Counts captured ONCE at session start per D-13. Plans 38-02 and 38-03 reuse this fingerprint without re-capture; do not re-import Synthea or restart Blaze between plan executions or this fingerprint becomes invalid (D-09 single-session invariant).

Bundle source: 500 Synthea-generated transaction Bundles (UUID-named) from `/Users/kohlbach/mii-testdata/synthea/generated-testdata/fhir-mii/`. Loaded serially via inline POST loop (load took 69s, 0 errors) because the shipped `~/mii-testdata/blaze/load-bundles.sh` only matches `Bundle-*.json` and the actual files are UUID-named.

**Zero-count types** (legitimate data-coverage gaps in this Synthea bundle, per D-01 data-coverage override path):
- `MedicationStatement` — Synthea bundle does not include MedicationStatement resources. The `Medikation` MII module tab will be legitimately empty for every patient. Tests touching medications must use the data-coverage override.
- `AllergyIntolerance`, `Consent`, `Immunization`, `ServiceRequest` — same shape; matches `33-01-INVESTIGATION.md` pattern (Synthea legitimately omits these).

The pre-restore session fingerprint (Patient=975, MedicationStatement=299, etc.) was captured against `eyematics-blaze` — a DIFFERENT bundle that was killed by the user before any walk happened. Those numbers are NOT applicable to the walks recorded against this fingerprint.
