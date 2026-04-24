# 33-01 Investigation: UAT-FU-06 Empty MII/FHIR Panel Root Cause

**Date:** 2026-04-24
**Plan:** 33-01 (MII-EXT-07)
**Approach:** Live Blaze probe + fix forward (per D-16 in 33-CONTEXT.md)

## Setup

- **Blaze server:** `http://localhost:8080/fhir` (reachable — `metadata` endpoint returns HTTP 200)
- **Patient universe:** 975 patients total on server (mix of Synthea + seeded non-Synthea `pat-uka-*` bundles)
- **Probe patient ID (primary):** `DHNTXK2BX5F3N4U6` (first page of Synthea-style IDs)
- **Probe patient ID (secondary, for Medikation):** `pat-uka-001` (owns one `MedicationStatement` — establishes that the server DOES index `MedicationStatement.subject` under both `patient` and `subject` when data exists)
- **Probe method:** `curl` against the configured Blaze endpoint, `_summary=count` where exact totals are needed, `_count=50` where a first-page smoke test is enough.

## Per-module results table

All probes against patient `DHNTXK2BX5F3N4U6` unless noted.

| # | Module       | FHIR Type              | Param tried                        | Count | Decision |
|---|--------------|------------------------|------------------------------------|-------|----------|
| 1 | person       | Patient                | `_id=DHNTXK2BX5F3N4U6`             | 1     | Keep `_id` — correct |
| 2 | fall         | Encounter              | `patient=Patient/DHNTXK2BX5F3N4U6` | 578 (total) / 50 (page) | Keep `patient` — correct |
| 3 | diagnose     | Condition              | `patient=Patient/DHNTXK2BX5F3N4U6` | 452 (total) / 50 (page) | Keep `patient` — correct |
| 4 | prozedur     | Procedure              | `patient=Patient/DHNTXK2BX5F3N4U6` | 517 (total) / 50 (page) | Keep `patient` — correct |
| 5 | consent      | Consent                | `patient=Patient/DHNTXK2BX5F3N4U6` | 0     | Keep `patient` — **Consent genuinely empty server-wide (0 total)**; not a param issue, Synthea simply does not emit Consent resources |
| 5a | consent     | Consent                | `subject=Patient/DHNTXK2BX5F3N4U6` | 0     | Confirms: not a `patient`/`subject` mismatch — zero resources either way |
| 5b | consent     | Consent                | `patient=DHNTXK2BX5F3N4U6` (no prefix) | 0 | Same — zero |
| 5c | consent     | Consent                | server-wide (`_count=0`)           | 0     | **Confirms**: no Consent resources exist on this server |
| 6 | laborbefund (WITH `extraQuery=category=laboratory`) | Observation | `patient=Patient/DHNTXK2BX5F3N4U6&category=laboratory` | 3289 (total) | Keep `patient` — correct |
| 6a | laborbefund (WITHOUT `extraQuery` — simulates current bug) | Observation | `patient=Patient/DHNTXK2BX5F3N4U6` | 4410 (total) | **Bug**: 1121 non-lab Observations leak in (vital-signs + survey + social-history) — confirms MiiModuleTab.tsx:63 drops `extraQuery` |
| 7 | medikation   | MedicationStatement    | `patient=Patient/DHNTXK2BX5F3N4U6` | 0     | Keep `patient` — **this patient has no MedicationStatements; other patients (e.g. `pat-uka-001`) return 1 via both `patient=` and `subject=`**, so the param is correct |
| 7a | medikation  | MedicationStatement    | `subject=Patient/DHNTXK2BX5F3N4U6` | 0     | Confirms no data for this patient on either param |
| 7b | medikation  | MedicationStatement    | server-wide (`_count=0`)           | 299   | **Confirms**: data exists but is concentrated on `pat-uka-*` patients, not Synthea |
| 7c | medikation (control) | MedicationStatement | `patient=Patient/pat-uka-001` | 1   | Baseline: `patient=` works when data exists |
| 7d | medikation (control) | MedicationStatement | `subject=Patient/pat-uka-001` | 1   | Baseline: Blaze indexes both `patient` and `subject` for this type |

### Observation category breakdown for patient `DHNTXK2BX5F3N4U6`

Sample of 100 observations (first page):

| Category        | Count (of 100) |
|-----------------|----------------|
| laboratory      | 72             |
| vital-signs     | 14             |
| survey          | 12             |
| social-history  | 2              |

Server-wide totals for this patient:
- Observation (any category): **4410**
- Observation (`category=laboratory` only): **3289**
- **Delta: 1121 non-lab observations leaking into the Laborbefund tab today** (~25% of what users see is noise: vital-signs, survey, social-history).

## Root cause

UAT-FU-06 ("empty per-patient MII/FHIR panels for Synthea") is a **compound symptom** with **three distinct roots**, all unrelated to a `patient=` vs `subject=` parameter mismatch:

1. **Consent tab is empty because there are zero Consent resources on the server** — Synthea does not emit Consent; the current `patient` param is correct but the module has no data to render. This is a data-shape reality, not a bug. UX improvement (empty-state copy) belongs to Phase 34 — out of scope for 33-01.

2. **Medikation tab is empty for Synthea patients because `MedicationStatement` data exists only on the seeded `pat-uka-*` patients (299 server-wide, concentrated on non-Synthea IDs).** The `patient=` param is correct — both `patient=` and `subject=` return 1 for a patient that DOES own data (`pat-uka-001`). Synthea simply emits `MedicationRequest`/`Medication` (0 on this server) instead of `MedicationStatement`; the MII Kerndatensatz maps `Medikation` → `MedicationStatement`, so Synthea patients legitimately have zero. Also out of scope for 33-01 — addressing this requires a downstream policy call (does Medikation also need to query `MedicationRequest`? — belongs to Phase 34 or a future plan).

3. **Laborbefund tab contaminated with non-lab observations** — the `extraQuery: 'category=laboratory'` field is declared on the module entry but `MiiModuleTab.tsx:63` NEVER appends it to the URL. The `useEffect` at lines 59-81 constructs:
   ```
   `${module.fhirResourceType}?${module.patientSearchParam}=Patient/${patientId}&_count=50&_sort=-date`
   ```
   with no `extraQuery` append. Verified live: 4410 vs 3289 Observation count for the probe patient — 25% of entries the user sees today in Laborbefund are NOT lab results (vital-signs, survey, social-history). This is **the correctness bug that IS in scope for 33-01 (MII-EXT-07)**.

### Why UAT-FU-06 read as "empty MII/FHIR panels"

Items 1 and 2 above: Consent and Medikation tabs render the `"No {germanLabel} data found for this patient."` empty-state (`MiiModuleTab.tsx:93-99`) for every Synthea patient, because the underlying FHIR data genuinely doesn't exist. The UAT observer likely assumed this was a param mismatch (the most common cause in other deployments) but the live probe rules that out — both `patient=` and `subject=` yield 0, and the total count across the server is 0 (Consent) or 0-on-Synthea (Medikation).

## Bug note — `MiiModuleTab.tsx:63` extraQuery drop

**File:** `src/components/patients/MiiModuleTab.tsx`
**Line:** 63 (URL template), 81 (useEffect dep array)

**Current (buggy) code:**
```typescript
const url = `${module.fhirResourceType}?${module.patientSearchParam}=Patient/${patientId}&_count=50&_sort=-date`;
// module.extraQuery is declared in MiiModule but NEVER read here — silently dropped.
```
useEffect dep array:
```typescript
}, [client, module.fhirResourceType, module.patientSearchParam, patientId]);
```

**Evidence of bug's impact (live):**
- `Observation?patient=Patient/DHNTXK2BX5F3N4U6` → 4410
- `Observation?patient=Patient/DHNTXK2BX5F3N4U6&category=laboratory` → 3289
- Delta: **1121 non-lab entries the user currently sees in the Laborbefund tab that shouldn't be there.**

**Expected code (fix in Task 2):**
```typescript
let url = `${module.fhirResourceType}?${module.patientSearchParam}=Patient/${patientId}&_count=50&_sort=-date`;
if (module.extraQuery) {
  url += `&${module.extraQuery}`;
}
```
useEffect dep array:
```typescript
}, [client, module.fhirResourceType, module.patientSearchParam, module.extraQuery, patientId]);
```

## Fix list

Concrete, mechanical — Tasks 2 and 3 execute these with no further decisions needed.

### Task 2 — code changes

**File: `src/components/patients/MiiModuleTab.tsx`**

1. Replace line 63 `const url = ...` with the `let url = ...; if (module.extraQuery) url += '&' + module.extraQuery;` form shown in "Expected code" above.
2. Add `module.extraQuery` to the `useEffect` dep array at line 81 (between `module.patientSearchParam` and `patientId`).

**File: `src/utils/mii-modules.ts`**

All 7 existing `patientSearchParam` values are **correct** against the live Blaze + Synthea data. No data changes needed. Add a single top-of-array verification comment:

```typescript
// Per-module patientSearchParam values verified against live Blaze + Synthea
// on 2026-04-24 (UAT-FU-06 investigation — see 33-01-INVESTIGATION.md).
// All 7 base modules use `_id` (person) or `patient` (everything else);
// `subject=` was probed as an alternative and produced identical results
// where data exists (MedicationStatement on `pat-uka-001`) — no module-wide
// param change required. Consent/Medikation empty-panel UAT observation
// was a data-coverage reality on Synthea, not a param mismatch.
```

### Task 3 — test contract (D-17)

Add a new `describe('per-module patientSearchParam contract (D-17)', ...)` block to `src/__tests__/mii-modules.test.ts` with the EXPECTED table:

```typescript
const EXPECTED = [
  { moduleKey: 'person',      fhirResourceType: 'Patient',             expectedParam: '_id' },
  { moduleKey: 'fall',        fhirResourceType: 'Encounter',           expectedParam: 'patient' },
  { moduleKey: 'diagnose',    fhirResourceType: 'Condition',           expectedParam: 'patient' },
  { moduleKey: 'prozedur',    fhirResourceType: 'Procedure',           expectedParam: 'patient' },
  { moduleKey: 'consent',     fhirResourceType: 'Consent',             expectedParam: 'patient' },
  { moduleKey: 'laborbefund', fhirResourceType: 'Observation',         expectedParam: 'patient' },
  { moduleKey: 'medikation',  fhirResourceType: 'MedicationStatement', expectedParam: 'patient' },
];
```

All `expectedParam` values match the probe-verified current state — no adjustments needed vs. the plan's draft EXPECTED table.

## Out-of-scope follow-ups (logged for later plans)

These surfaced during the investigation and are logged here so they are not forgotten. They are **not** touched by Tasks 2 / 3.

- **Medikation module coverage**: Consider extending to `MedicationStatement | MedicationRequest` once MII-EXT-02 schema widen lands (Phase 33-03). Synthea emits neither; other Blaze deployments commonly emit `MedicationRequest`. Belongs to Phase 34 data payload OR a future Medikation-coverage plan.
- **Consent empty-state UX**: When a module has zero server-wide data, the current `"No {germanLabel} data found for this patient."` message is technically correct but could be more informative (e.g. "No Consent resources on this server — Synthea does not emit these"). Belongs to Phase 34 empty-state UX work.
- **Dashboard MII tile scoping (UAT-FU-04)**: Already tracked in Phase 33-06 plan. No new data here.
