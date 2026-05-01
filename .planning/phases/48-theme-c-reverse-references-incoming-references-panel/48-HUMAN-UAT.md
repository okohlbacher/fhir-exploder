---
status: pending
phase: 48-theme-c-reverse-references-incoming-references-panel
slug: theme-c-reverse-references-incoming-references-panel
source: ["48-VALIDATION.md \"Manual-Only Verifications\""]
requires_live_blaze: true
started: 2026-05-01T18:23:00Z
updated: 2026-05-01T18:23:00Z
created: 2026-05-01
---

# Phase 48 — Human UAT (live Blaze)

> Manual verifications that automated RTL tests cannot cover (vertical position, network throttling, real card-click filter behaviour).
> Source: 48-VALIDATION.md §"Manual-Only Verifications".

## Current Test

[awaiting human testing]

## Pre-flight

- [ ] `npm run dev` started
- [ ] App connected to local Blaze (default `http://localhost:8080/fhir`)
- [ ] Browser DevTools open

---

## Tests

### UAT-01 — Panel renders BELOW Tabs on Patient + non-Patient detail pages

**Why manual:** Spatial / visual regression that snapshot tests miss (vertical position relative to the Tabs container).
**Requirement:** REVR-02, REVR-03

**Steps:**

1. Navigate to `/explorer/Patient/{any-existing-patient-id}`.
   - [ ] "Related Resources" panel appears BELOW the Tabs container (was ABOVE pre-Phase 48).
   - [ ] Cards render with the existing 11 emoji icons.
   - [ ] Click any card → navigates to filtered explorer view.

2. Navigate to `/explorer/Encounter/{any-existing-encounter-id}`.
   - [ ] "Referenced By" panel appears BELOW the Tabs container.
   - [ ] At least one card visible (Observation / Condition / Procedure / DiagnosticReport / MedicationStatement / MedicationRequest depending on which references the test Encounter has).
   - [ ] No emoji icons on these cards (D-09 — non-Patient catalog entries omit `icon`).

3. Navigate to `/explorer/Provenance/{any-existing-provenance-id}` (Provenance is NOT a catalog source-type key).
   - [ ] No panel rendered at the bottom (silent null per D-12 + D-06 type-not-in-catalog).

**expected:** Panel sits below the Tabs block on both Patient and non-Patient resources; Provenance shows no panel.
**result:** [pending]

---

### UAT-02 — Card click navigates to filtered explorer view on live data

**Why manual:** Real Blaze server confirms `?{param}={ref}` query string filters the destination correctly.
**Requirement:** REVR-02 SC #3

**Steps:**

1. From `/explorer/Encounter/{id}`, click an `Observation` card (assuming Observations exist linked to that Encounter).
   - [ ] Browser URL becomes `/explorer/Observation?encounter=Encounter/{id}` (verbatim).
   - [ ] Result list contains ONLY Observations linked to that Encounter (verify by spot-checking 2-3 entries' `encounter` field references the source Encounter id).

**expected:** URL = `/explorer/Observation?encounter=Encounter/{id}`; results filtered to that Encounter.
**result:** [pending]

---

### UAT-03 — Loading skeletons appear on slow network

**Why manual:** Network-throttling visualization not exercised by RTL fast mocks.
**Requirement:** REVR-02 (D-10 loading state)

**Steps:**

1. Chrome DevTools → Network → Slow 3G.
2. Open any non-Patient resource detail page (e.g. `/explorer/Observation/{id}`).
   - [ ] Up to 4 placeholder cards render with `<Loader>` spinners visible during the in-flight queries.
   - [ ] As individual counts resolve, populated cards replace loaders.
   - [ ] Once all settle, only count > 0 cards remain (or panel returns null if all 0).

**expected:** 4 skeleton cards visible during in-flight; populated cards replace as counts resolve.
**result:** [pending]

---

## Summary

total: 3
passed: 0
issues: 0
pending: 3
skipped: 0
blocked: 0

## Gaps

(none recorded yet — fill in after UAT walk if any verification surfaces unexpected behaviour)

---

## Sign-off

- [ ] All 3 UAT items pass
- [ ] Tester: ____________________
- [ ] Date: ____________________
- [ ] Notes: ____________________

*(If any UAT fails, file as Phase-48.1 follow-up — the trade-off documented in CONTEXT D-07 anticipates rollback as trivial single-ternary revert.)*
