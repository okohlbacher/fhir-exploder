---
phase: 38-v1.5-human-uat-live-blaze-smoke-tests
plan: 01
status: complete
closed_at: 2026-04-28T13:47:28Z
walks:
  - target: phase-33
    tests: 6
    passed: 3
    failed: 3
critical_severity_hits: 3
sub_phase_38_1_trigger: yes
---

# Plan 38-01 SUMMARY — Pre-flight + Phase 33 HUMAN-UAT walk

## Pre-flight verdict

**Passed** (re-passed after mid-session Blaze restart — see Notes).

| # | Check | Status |
| - | ----- | ------ |
| 1 | `http://localhost:8080/fhir/metadata` returns 200 | PASS |
| 2 | `Patient?_summary=count` ≥ 1 (actual: `500`) | PASS |
| 3 | `Observation?_summary=count` ≥ 1 (actual: `349715`) | PASS |
| 4 | Dev server reachable on `http://localhost:5173/` | PASS |
| 5 | `public/settings.yaml` `fhir.serverUrl` confirmed by verifier | PASS |

## Blaze + Synthea fingerprint (from 38-SESSION.md)

- **Blaze URL:** `http://localhost:8080/fhir`
- **Software:** `Blaze 1.6.2` (fhirVersion 4.0.1)
- **Capture timestamp:** `2026-04-28T12:02:13Z`
- **Container:** `blaze-blaze-1` (compose: `~/mii-testdata/blaze/blaze.yml`, `samply/blaze:latest`, `0.0.0.0:8080->8080/tcp`, ENFORCE_REFERENTIAL_INTEGRITY=true)

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

Zero-count types (`MedicationStatement`, `AllergyIntolerance`, `Consent`, `Immunization`, `ServiceRequest`) are legitimate data-coverage gaps in this Synthea bundle (D-01 data-coverage path, mirrors `33-01-INVESTIGATION.md`).

## Phase 33 walk — per-test tally (3 pass, 3 fail)

| # | Test | Result | One-line evidence |
|---|------|--------|-------------------|
| 1 | Laborbefund extraQuery (no leakage) | **fail** | "No Laborbefund data found" — Blaze 400 on `_sort=-date` (HAR-confirmed) |
| 2 | Timeline color + German label (4 types) | **fail** | "No clinical events..." — same `_sort=-date` 400 cascade on ClinicalTimeline |
| 3 | Dashboard MII heading "Server-wide totals" | **pass** | Heading reads literally `MII Kerndatensatz · Server-wide totals` (U+00B7) |
| 4 | Dashboard tile click → Drawer (no fetch) | **pass** | Drawer opens with full contents; zero new GETs; "Open in Explorer" navigates correctly |
| 5 | MiiModuleTabs deep-link forward-compat | **pass** | 8 base tabs render in expected order; "Show extension modules" toggle absent (length-guarded) |
| 6 | Per-patient Laborbefund populated | **fail** | Same root cause as Test 1; UAT-FU-06 fix is in URL but Blaze rejects `_sort=-date` |

## Critical-severity hits (3) — sub-phase 38.1 trigger

All 3 fails cascade from a SINGLE critical regression discovered by the live-Blaze walk:

**Bug:** Blaze 1.6.2 rejects `_sort=-date` with `HTTP 400 OperationOutcome "Unknown search-param \`date\` in sort clause."` on every per-patient resource search (`Encounter`, `Observation`, `Condition`, `Procedure`, `MedicationStatement`, `DiagnosticReport`, `AllergyIntolerance`, `ImagingStudy` — confirmed via curl + HAR). Direct curl confirms `_sort=-_lastUpdated` works.

**Affected source sites (4):**

| File | Line | Used by |
|------|------|---------|
| `src/components/patients/MiiModuleTab.tsx` | 81 | Every MII tab panel (Tests 1, 6) |
| `src/components/patients/ClinicalTimeline.tsx` | 72 | Zeitleiste timeline (Test 2) |
| `src/components/patients/PatientTimeline.tsx` | 122 | Patient $everything timeline view |
| `src/components/patients/FhirResourcesView.tsx` | 132 | Cross-resource patient view |

**Why this slipped past Phase 33 verification:** Phase 33 verification (`33-VERIFICATION.md` `status: human_needed`) was programmatic against jsdom mocks that did NOT exercise Blaze's sort-param validation. This is exactly the case Phase 38 D-01 was designed to surface — live-Blaze walks catching what jsdom can't.

**Suggested fix for sub-phase 38.1:** Replace `_sort=-date` with `_sort=-_lastUpdated` (or remove sort) in all 4 sites. Plan 38-03 closure will surface the literal `/gsd-insert-phase 38.1 "..."` invocation.

## Notes

### Mid-session Blaze restart (recovered)

The original `eyematics-blaze` container that was up during initial pre-flight was killed (SIGKILL, exit 137) before any walk happened. A replacement `blaze` container came up on the host without a port mapping — frontend got `Connection refused`. Recovery sequence:

1. Stopped + removed the broken `blaze` container.
2. Brought up a fresh container via `~/mii-testdata/blaze/blaze.yml` compose (host port 8080→8080, ENFORCE_REFERENTIAL_INTEGRITY=true).
3. Reloaded all 500 Synthea Bundle transactions from `~/mii-testdata/synthea/generated-testdata/fhir-mii/` via an inline POST loop (load took 69s, zero errors). The shipped `~/mii-testdata/blaze/load-bundles.sh` only matches `Bundle-*.json`; the real files are UUID-named.
4. Re-ran pre-flight against the rebuilt instance and rewrote `38-SESSION.md` with the new fingerprint (Patient 975→500, Observation 437889→349715, MedicationStatement 299→0, etc.) — the new counts are the AUTHORITATIVE fingerprint Plans 38-02 + 38-03 will reference.

The pre-restore numbers from the dead `eyematics-blaze` were against a different bundle and are NOT applicable to any of the walks recorded here.

### Single-session invariant (D-09) preserved for Plan 38-02

After the restart + reload, the browser session, dev server (`localhost:5173`), Blaze container (`blaze-blaze-1`), and Synthea bundle were left untouched. Plan 38-02 inherits this exact state. Do not close the browser, restart Blaze, or re-import Synthea between this plan close and Plan 38-02 open.

## Files committed in this plan

- `.planning/phases/38-v1.5-human-uat-live-blaze-smoke-tests/38-SESSION.md` (e10e97f, then rewritten as bbf0d6b post-restore)
- `.planning/phases/33-mii-schema-foundation-extension-modules-collapse-ui/33-HUMAN-UAT.md` (a705c5d)
- This summary file (next commit)
