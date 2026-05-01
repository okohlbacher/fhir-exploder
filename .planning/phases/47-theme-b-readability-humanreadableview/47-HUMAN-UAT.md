---
status: partial
phase: 47-theme-b-readability-humanreadableview
source: [47-VERIFICATION.md]
started: 2026-05-01T17:55:00Z
updated: 2026-05-01T17:55:00Z
---

## Current Test

[awaiting human testing — postponed by user during phase execution]

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
result: [pending]

### 2. Accordion expand animation
expected: Clicking an Accordion.Control in ContainedResourcesAccordion smoothly expands the panel. A full ResourcePropertyTable for the contained resource renders in-place without layout shift.
why_human: JSDOM does not execute CSS transitions/animations; smooth animation requires live Blaze data in a real browser.
test_path:
- Open a resource with `Resource.contained[]` (e.g. a Bundle or DiagnosticReport with contained Observations)
- Scroll below the property table to "Contained Resources" section
- Click each accordion entry; confirm smooth expand transition
- Confirm full ResourcePropertyTable renders in-place
result: [pending]

### 3. ExtensionChip inline layout with long property values
expected: The `[+N extensions]` chip renders inline next to the property value without overflowing or wrapping in a way that breaks the table row layout.
why_human: Layout/overflow behavior requires a real browser rendering engine.
test_path:
- Open a resource with property-level extensions on long string fields (e.g. Patient with `_birthDate.extension`)
- Confirm chip appears inline with the value, no row wrap that obscures the value
- Click chip — confirm expansion does not shift other rows abruptly
result: [pending]

### 4. Terminology displays inside contained-resource panels
expected: After expanding a contained-resource accordion panel, CodeableConcept coding.display values resolved by the terminology server appear correctly.
why_human: Requires live Blaze server with terminology server connected.
test_path:
- Open a resource with contained CodeableConcepts referencing terminology codes
- Expand the contained-resource accordion panel
- Confirm coded values render with display text (not just raw codes)
result: [pending]

### 5. Indexed-primitive _given extension chip on live seed Patient
expected: A FHIR Patient resource with `_given: [null, {extension:[...]}]` shows the `[+N extensions]` chip on the given row; expanding reveals entries with `[0]`, `[1]` prefixes correctly.
why_human: Requires live Blaze seed data with indexed primitive extensions.
test_path:
- Find a Patient in Blaze with indexed `_given` extensions
- Open the patient detail page; navigate to HumanReadableView
- Confirm chip appears on the `given` row
- Click chip — confirm `[i]` prefixes label which array slot each extension applies to
result: [pending]

## Summary

total: 5
passed: 0
issues: 0
pending: 5
skipped: 0
blocked: 0

## Gaps
