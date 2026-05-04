---
status: partial
phase: 47-theme-b-readability-humanreadableview
source: [47-VERIFICATION.md]
started: 2026-05-01T17:55:00Z
updated: 2026-05-02T11:00:00Z
walked_by: claude (live-Blaze, Synthea data, dev server localhost:5173)
data_caveat: |
  Synthea data set in this Blaze instance has zero resources with `contained[]`
  (sampled 50 of each: Patient/Encounter/Observation/Condition/Procedure/
  DiagnosticReport/MedicationStatement) and zero Patients with property-level
  primitive extensions (`_birthDate`, `_given[i].extension`). UATs 2/3/4/5
  cannot be exercised against this dataset. Wiring is verified by RTL tests
  in 47-VERIFICATION.md (`HumanReadableView.read-phase.test.tsx`,
  `ContainedResourcesAccordion.test.tsx`, `ExtensionChip.test.tsx`).
---

## Current Test

[partial — UAT-1 PASS via wiring + aria; UATs 2/3/4/5 BLOCKED-NO-DATA against Synthea Blaze]

## Tests

### 1. Tooltip hover on resolved reference link
expected: Hovering over a resolved reference link reveals the full Reference.reference URL string (e.g. `Patient/abc123`) in a Mantine Tooltip. Moving the mouse away dismisses the tooltip.
why_human: Cannot verify Mantine Tooltip hover behavior (openDelay=400ms, CSS pointer interaction) in jsdom tests.
test_path:
- Start `npm run dev`
- Open any resource detail page with reference fields (e.g. `/explorer/Encounter/<id>` showing `subject` reference)
- Hover the resolved reference link, wait ~400ms
- Confirm tooltip appears with full `Type/id` URL
- Move mouse away — tooltip dismisses
result: PASS (wiring + aria; visual hover not testable in headless preview)
evidence: |
  /explorer/Encounter/DHOT622BDE5AAY45 — Encounter.subject reference renders as
  Anchor with text "Parisian, Latoya, Filomena (70/F)" and href
  "/explorer/Patient/DHOT622BDE5AAY4S". The full FHIR ref + resolved summary
  is exposed via aria-label: "Patient/DHOT622BDE5AAY4S (Parisian, Latoya,
  Filomena (70/F))" and aria-describedby points to a tooltip portal id (:rrho:).
  Mantine Tooltip wrapper confirmed in source (ReferenceLink.tsx:71-79).
  Visual hover tooltip overlay cannot be triggered in Claude_Preview's headless
  browser (window.innerWidth/Height = 0; Floating UI ignores synthetic events
  on a 0×0 viewport). Recommend a quick visual spot-check in a real browser.

### 2. Accordion expand animation
expected: Clicking an Accordion.Control in ContainedResourcesAccordion smoothly expands the panel. A full ResourcePropertyTable for the contained resource renders in-place without layout shift.
why_human: JSDOM does not execute CSS transitions/animations; smooth animation requires live Blaze data in a real browser.
test_path:
- Open a resource with `Resource.contained[]` (e.g. a Bundle or DiagnosticReport with contained Observations)
- Scroll below the property table to "Contained Resources" section
- Click each accordion entry; confirm smooth expand transition
- Confirm full ResourcePropertyTable renders in-place
result: BLOCKED-NO-DATA
evidence: |
  Sampled 50 of each Patient/Encounter/Observation/Condition/Procedure/
  DiagnosticReport/MedicationStatement against http://localhost:8080/fhir —
  zero resources have `contained[]`. Synthea does not generate contained
  resources. Wiring covered by RTL: ContainedResourcesAccordion.test.tsx
  (7 tests) + HumanReadableView.read-phase.test.tsx (3 tests).
  To unblock: seed a DiagnosticReport with contained Observations into Blaze
  (deferred — re-test when fixture available).

### 3. ExtensionChip inline layout with long property values
expected: The `[+N extensions]` chip renders inline next to the property value without overflowing or wrapping in a way that breaks the table row layout.
why_human: Layout/overflow behavior requires a real browser rendering engine.
test_path:
- Open a resource with property-level extensions on long string fields (e.g. Patient with `_birthDate.extension`)
- Confirm chip appears inline with the value, no row wrap that obscures the value
- Click chip — confirm expansion does not shift other rows abruptly
result: BLOCKED-NO-DATA
evidence: |
  Sampled 50 Patients in Blaze — zero have property-level primitive extensions
  (`_birthDate`, `_given[i].extension`, etc.). Synthea generates only
  resource-level extensions (us-core-race, us-core-ethnicity, etc.) which are
  rendered by the separate ExtensionsSection, not by ExtensionChip.
  Wiring covered by RTL: ExtensionChip.test.tsx (8 tests) +
  HumanReadableView.read-phase.test.tsx integration test.
  To unblock: seed a Patient with `_birthDate: {extension: [...]}` into Blaze.

### 4. Terminology displays inside contained-resource panels
expected: After expanding a contained-resource accordion panel, CodeableConcept coding.display values resolved by the terminology server appear correctly.
why_human: Requires live Blaze server with terminology server connected.
test_path:
- Open a resource with contained CodeableConcepts referencing terminology codes
- Expand the contained-resource accordion panel
- Confirm coded values render with display text (not just raw codes)
result: BLOCKED-NO-DATA
evidence: |
  Same as UAT-2 — zero contained resources in Blaze. Wiring covered by Q2
  resolution in 47-02-SUMMARY.md (terminology walker `collectCodings` is
  recursive; parent's `useResolvedResource` covers contained codings
  transparently). To unblock: see UAT-2.

### 5. Indexed-primitive _given extension chip on live seed Patient
expected: A FHIR Patient resource with `_given: [null, {extension:[...]}]` shows the `[+N extensions]` chip on the given row; expanding reveals entries with `[0]`, `[1]` prefixes correctly.
why_human: Requires live Blaze seed data with indexed primitive extensions.
test_path:
- Find a Patient in Blaze with indexed `_given` extensions
- Open the patient detail page; navigate to HumanReadableView
- Confirm chip appears on the `given` row
- Click chip — confirm `[i]` prefixes label which array slot each extension applies to
result: BLOCKED-NO-DATA
evidence: |
  Sampled 50 Patients — zero have `_given` indexed primitive extensions.
  Wiring covered by RTL: ExtensionChip.test.tsx case
  "indexed-primitive `_given` aggregates with [i] prefix" (Q4 resolution).
  To unblock: seed a Patient with `_given: [null, {extension: [{url:"...",
  valueCode:"..."}]}]` into Blaze.

## Summary

total: 5
passed: 1 (wiring + aria — visual hover deferred to real-browser spot-check)
issues: 0
pending: 0
skipped: 0
blocked: 4 (no contained[] / no property-level primitive extensions in Synthea Blaze)

## Gaps

- 4 UATs blocked by missing Synthea fixtures. Wiring is verified by RTL tests
  per 47-VERIFICATION.md. To unblock for visual UAT, seed Blaze with:
  - DiagnosticReport with contained Observations (UATs 2 + 4)
  - Patient with property-level `_birthDate.extension` (UAT 3)
  - Patient with indexed `_given[i].extension` (UAT 5)
