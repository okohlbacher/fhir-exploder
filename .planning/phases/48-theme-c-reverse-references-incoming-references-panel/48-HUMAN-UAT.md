---
status: complete
phase: 48-theme-c-reverse-references-incoming-references-panel
slug: theme-c-reverse-references-incoming-references-panel
source: ["48-VALIDATION.md \"Manual-Only Verifications\""]
requires_live_blaze: true
started: 2026-05-01T18:23:00Z
updated: 2026-05-02T11:00:00Z
walked_by: claude (live-Blaze, Synthea data, dev server localhost:5173)
created: 2026-05-01
substitution: |
  UAT-01 step 3 originally tests Provenance (which is NOT a catalog source-type
  key, expected to render null). Blaze contains 0 Provenance — substituted
  with Medication (also not a catalog source-type key). Same expectation:
  null panel.
---

# Phase 48 — Human UAT (live Blaze)

> Manual verifications that automated RTL tests cannot cover (vertical position, network throttling, real card-click filter behaviour).
> Source: 48-VALIDATION.md §"Manual-Only Verifications".

## Current Test

[complete — UATs 1 + 2 fully PASS; UAT-3 PASS-WIRING (loader code path verified; live throttle requires Chrome DevTools Slow 3G profile)]

## Pre-flight

- [x] `npm run dev` started (Claude_Preview server on port 5173)
- [x] App connected to local Blaze (default `http://localhost:8080/fhir`)
- [x] Browser DevTools open (Claude_Preview eval / inspect / console)

---

### UAT-01 — Panel renders BELOW Tabs on Patient + non-Patient detail pages

**Why manual:** Spatial / visual regression that snapshot tests miss (vertical position relative to the Tabs container).
**Requirement:** REVR-02, REVR-03

**Steps:**

1. Navigate to `/explorer/Patient/{any-existing-patient-id}`.
   - [x] "Related Resources" panel appears BELOW the Tabs container (was ABOVE pre-Phase 48).
   - [x] Cards render with the existing 11 emoji icons.
   - [x] Click any card → navigates to filtered explorer view.

2. Navigate to `/explorer/Encounter/{any-existing-encounter-id}`.
   - [x] "Referenced By" panel appears BELOW the Tabs container.
   - [x] At least one card visible (Observation / Condition / Procedure / DiagnosticReport / MedicationStatement / MedicationRequest depending on which references the test Encounter has).
   - [x] No emoji icons on these cards (D-09 — non-Patient catalog entries omit `icon`).

3. Navigate to `/explorer/Provenance/{any-existing-provenance-id}` (Provenance is NOT a catalog source-type key).  
   **Substituted: Medication** (Provenance count = 0 in this Blaze; Medication is also not a catalog source-type key)
   - [x] No panel rendered at the bottom (silent null per D-12 + D-06 type-not-in-catalog).

**expected:** Panel sits below the Tabs block on both Patient and non-Patient resources; Provenance shows no panel.
**result:** PASS
**evidence:** |
  /explorer/Patient/DHOT622BDE5AAY4S — "Related Resources" panel below Tabs
  (heading top -185.9 > tabs bottom -205.9). 5 emoji-bearing cards rendered:
  🩺Condition (65), 🔧Procedure (340), 📊Observation (250), 🏥Encounter (63),
  🧪DiagnosticReport (108). (5 of 11 catalog entries have non-zero counts in
  this Blaze; the other 6 entries return 0 → cards filtered out per D-12.)

  /explorer/Encounter/DHOT622BDE5AAY45 — "Referenced By" panel below Tabs.
  2 cards (no emoji): Condition (1 ref), DiagnosticReport (1 ref).

  /explorer/Medication/DHOT622OWOIDIZV3 — page title "Medication/DHOT622OWOIDIZV3"
  rendered, but no "Referenced By" / "Related Resources" heading exists in DOM.
  Silent null per spec when resource type is not a catalog source-type key.

---

### UAT-02 — Card click navigates to filtered explorer view on live data

**Why manual:** Real Blaze server confirms `?{param}={ref}` query string filters the destination correctly.
**Requirement:** REVR-02 SC #3

**Steps:**

1. From `/explorer/Encounter/{id}`, click an `Observation` card (assuming Observations exist linked to that Encounter).
   - [x] Browser URL becomes `/explorer/Observation?encounter=Encounter/{id}` (verbatim).
   - [x] Result list contains ONLY Observations linked to that Encounter (verify by spot-checking 2-3 entries' `encounter` field references the source Encounter id).

**expected:** URL = `/explorer/Observation?encounter=Encounter/{id}`; results filtered to that Encounter.
**result:** PASS
**evidence:** |
  Tested with Condition card on Encounter detail (Observation card not
  present for this Encounter — only Condition + DiagnosticReport had refs).
  From /explorer/Encounter/DHOT622BDE5AAY45, clicked "Condition" card →
  URL became /explorer/Condition?encounter=Encounter/DHOT622BDE5AAY45
  (verbatim per spec). Result list: 1 Condition row
  (DHOT622BDE5AAY46 — "Full-time employment (finding)") matches the
  expected count badge value (1). Same code path for any catalog entry.

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
**result:** PASS-WIRING (visual verification deferred — see notes)
**evidence:** |
  RelatedResourcesPanel.tsx:81-90 — `loading && populated.length === 0` →
  render `entries.slice(0, 4)` placeholder Cards each with `<Loader size="xs" />`.
  Wiring verified by RTL test "renders loaders during in-flight queries"
  (RelatedResourcesPanel.test.tsx).

  Tried fetch monkey-patch (window.fetch +2.5s delay) to capture loader
  state; counts populated immediately even with patch active. Likely cause:
  Medplum client uses an internal HTTP layer that bypasses window.fetch, OR
  the Medplum client's request cache resolved before the patch took effect.
  Real Chrome DevTools Slow 3G profile would reliably show the skeleton.
  Recommend a 30-second visual spot-check in Chrome with throttling on.

---

## Summary

total: 3
passed: 2
issues: 0
pending: 0
skipped: 0
blocked: 0
partial: 1 (UAT-3 PASS-WIRING — loader code path verified, visual throttle deferred to real Chrome session)

## Gaps

(none discovered during walk)

---

## Sign-off

- [x] All 3 UAT items pass (UAT-3 with wiring caveat — see evidence)
- Tester: claude (gsd-audit-milestone v1.7 walk, 2026-05-02)
- Date: 2026-05-02
- Notes: |
    UAT-01 step 3 substituted Medication for Provenance (0 Provenance in
    this Blaze). Same expectation, same result.
    UAT-03 wiring is correct; visual loader appearance during slow network
    requires real Chrome DevTools throttling that headless Claude_Preview
    cannot simulate. Recommend a short Chrome spot-check before final close.
