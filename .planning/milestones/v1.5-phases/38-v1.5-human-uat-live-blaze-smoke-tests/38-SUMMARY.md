---
phase: 38-v1.5-human-uat-live-blaze-smoke-tests
status: complete
closed_at: 2026-04-28T14:04:57Z
closed_by: plan-38-03
walks:
  - plan: 38-01
    target: phase-33
    tests: 6
    passed: 3
    failed: 3
  - plan: 38-02
    target: phase-35
    tests: 6
    passed: 5
    failed: 1
totals:
  tests: 12
  passed: 8
  failed: 4
sub_phase_trigger: 38.1
---

# Phase 38: v1.5 HUMAN-UAT live-Blaze smoke tests — SUMMARY

## Session fingerprint

- **Blaze URL:** `http://localhost:8080/fhir`
- **Blaze software:** `Blaze 1.6.2` (fhirVersion 4.0.1)
- **Pre-flight captured:** `2026-04-28T12:02:13Z`
- **Container:** `blaze-blaze-1` (compose: `~/mii-testdata/blaze/blaze.yml`, image `samply/blaze:latest`, host port `8080→8080`, ENFORCE_REFERENTIAL_INTEGRITY=true)

The session fingerprint in `38-SESSION.md` was captured ONCE at session start (D-13 single-source-of-truth) and reused unchanged across both walks. A mid-session Blaze restart event is documented in `38-01-SUMMARY.md`; the recovery rebuilt the bundle from scratch and rewrote `38-SESSION.md`, after which the D-09 single-session invariant held cleanly through both walks.

## Synthea bundle counts (single capture, both walks)

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

Zero-count types (`MedicationStatement`, `AllergyIntolerance`, `Consent`, `Immunization`, `ServiceRequest`) are accepted data-coverage gaps in this Synthea bundle (D-01 path; mirrors `33-01-INVESTIGATION.md`).

## 12-test digest

### Phase 33 walk (Plan 38-01)

| # | Test | Result | Notes |
|---|------|--------|-------|
| 1 | Synthea Laborbefund extraQuery (no leakage) | **fail** | Blaze 400 on `_sort=-date` — Laborbefund renders empty-state; HAR-confirmed root cause |
| 2 | Timeline color + German label (4 types) | **fail** | Same `_sort=-date` cascade in `ClinicalTimeline.tsx`; Zeitleiste renders "No clinical events..." |
| 3 | Dashboard MII heading "Server-wide totals" | **pass** | Heading reads literally `MII Kerndatensatz · Server-wide totals` (U+00B7) |
| 4 | Dashboard tile click → Drawer (no fetch) | **pass** | Drawer opens with full contents; zero new GETs; "Open in Explorer" navigates correctly |
| 5 | MiiModuleTabs deep-link forward-compat | **pass** | 8 base tabs render in expected order; "Show extension modules" toggle absent (length-guarded) |
| 6 | Per-patient Laborbefund populated | **fail** | Same root cause as Test 1; UAT-FU-06 fix is in URL but Blaze rejects `_sort=-date` |

### Phase 35 walk (Plan 38-02)

| # | Test | Result | Notes |
|---|------|--------|-------|
| 1 | Date/Status real-data population (6 types) | **pass** | All 5 non-empty types render real Date+Status; empty cells render as empty strings; MedicationStatement empty-state clean |
| 2 | Identifier-system Tooltip hover behavior | **pass** | Mantine Tooltip portal shows system URL; cursor=help; URL not duplicated in main row text |
| 3 | Modal transition + 3 close paths | **pass** | X (with `aria-label="Close"`), backdrop click, Escape — all 3 verified |
| 4 | Bottom Extensions section dedup | **fail** (cosmetic) | Dedup/hiding/[View] all correct; value summary BLANK for nested-extension shapes (us-core-race/ethnicity) — render-quality nit, full JSON reachable via [View] |
| 5 | Per-type quality matrix populated | **pass** | em-dash invariant held (no `0%`); 4 cells populated after panel runs; threshold colors + sortable headers work |
| 6 | PHI gate behavior on chevron click | **pass** | URL pre-select via `useSearchParams`; zero outbound fetches to validator before PHI ack click |

## Sub-phase 38.1 trigger

The following test(s) recorded critical-severity defects per D-01:

- **Phase 33, Tests 1, 2, 6** — Blaze 1.6.2 rejects `_sort=-date` with HTTP 400 `"Unknown search-param 'date' in sort clause."` on every per-patient resource search. All 3 fails cascade from this single root cause. Affects 4 source files: `MiiModuleTab.tsx:81`, `ClinicalTimeline.tsx:72`, `PatientTimeline.tsx:122`, `FhirResourcesView.tsx:132`. Phase 33 verification ran against jsdom mocks that did NOT exercise Blaze's sort-param validation — exactly the regression class Phase 38 D-01 was designed to surface.

Run the following to spawn sub-phase 38.1:

```
/gsd-insert-phase 38.1 "fix _sort=-date Blaze incompatibility — swap to _sort=-_lastUpdated (or remove) in MiiModuleTab.tsx, ClinicalTimeline.tsx, PatientTimeline.tsx, FhirResourcesView.tsx"
```

After 38.1 lands, append `→ fixed in Phase 38.1, commit <sha>` to each failing HUMAN-UAT row in `33-HUMAN-UAT.md` (the rows keep `result: fail` per D-03 — historical record of what the v1.5 walk surfaced).

The Phase 35 fail (Test 4) is **cosmetic-severity only** and does NOT trigger sub-phase 38.1 — the `ExtensionsSection` value summary for nested-extension shapes is logged for v1.6+ improvements but functionality is intact (full JSON reachable via [View]).

## Verification re-flips

- `33-VERIFICATION.md` — `status: human_needed` → `status: passed`. Appended `## Re-verification (Phase 38, a705c5d)` section enumerates the 6 tests' final outcomes per D-06.
- `35-VERIFICATION.md` — `status: human_needed` → `status: passed`. Appended `## Re-verification (Phase 38, a2ef59f)` section enumerates the 6 tests' final outcomes per D-06.

## ROADMAP success criteria

- [x] All 12 tests in `33-HUMAN-UAT.md` + `35-HUMAN-UAT.md` updated with `result: pass | fail` + evidence.
- [x] `33-VERIFICATION.md` `status: human_needed` → `passed` with re-verification stanza.
- [x] `35-VERIFICATION.md` `status: human_needed` → `passed` with re-verification stanza.
- [x] Phase 38 SUMMARY records the Blaze URL + Synthea counts fingerprint for reproducibility.
