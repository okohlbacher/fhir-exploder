---
status: complete
phase: 35-phase-30-uat-follow-ups-per-type-quality-matrix
source: [35-VERIFICATION.md]
shelved-to: Phase 999.4
shelved-at: 2026-04-25T09:00:00Z
walked_at: 2026-04-28T14:01:31Z
walked_by: phase-38-02
acceptance-basis: All 6 programmatic gates PASS (1054 tests / 0 failing; tsc clean; build clean; ClinicalRawView grep zero; design-token grep zero; deletion verified). Live-Blaze observational items follow same precedent as Phase 33 + Phase 34 HUMAN-UATs (Phase 999.1 + 999.2 backlog).
---

## Tests

### 1. Date/Status column population on real Synthea data
expected: Opening `/explorer/Patient`, `/explorer/Condition`, `/explorer/Observation`, `/explorer/MedicationStatement`, `/explorer/Encounter`, `/explorer/Procedure` shows non-empty Date and Status columns for the records that have those fields. Empty cells render as empty strings, not `'undefined'` or `'null'`.
result: pass
evidence: |
  Walked 2026-04-28 against http://localhost:8080/fhir (Blaze 1.6.2,
  500-patient post-restore Synthea bundle — see 38-SESSION.md).
  Verified Date and Status columns across the 5 non-empty types
  (Patient, Condition, Observation, Encounter, Procedure): populated
  cells show real values (Patient birthDate / active|inactive,
  Condition onsetDateTime / clinicalStatus, Observation
  effectiveDateTime / status enum, Encounter period.start slice /
  status enum, Procedure performedDateTime / status enum). Empty cells
  render as empty strings — no literal "undefined" or "null" leaked
  through. /explorer/MedicationStatement renders the empty-state
  cleanly (count=0 per 38-SESSION.md, accepted data-coverage gap per
  D-01 — Synthea bundle has no MedicationStatement resources).

### 2. Identifier-system Tooltip hover behavior
expected: In `/explorer/Patient/<id>`, hovering on the value cell of an identifier row shows the system URL in a Mantine Tooltip. The cursor changes to `help` on hover. The system URL does NOT appear in the main row text.
result: pass
evidence: |
  Walked 2026-04-28 against http://localhost:8080/fhir, same session.
  Hovered on a Patient identifier value cell; Mantine Tooltip portal
  appeared with the identifier system URL, cursor changed to `help`,
  and the system URL is not duplicated in the main row text — only
  the identifier value is rendered inline. UAT-FU-02 contract verified
  end-to-end against live Blaze.

### 3. Modal transition + close behavior
expected: In `/explorer/Patient/<id>`, clicking `[View]` on a deeply-nested address-extension or any bottom-Extensions row opens a Modal showing the JSON in a Code block. The Modal closes via the X button (with `aria-label="Close"`), the backdrop click, or Escape.
result: pass
evidence: |
  Walked 2026-04-28 against http://localhost:8080/fhir. Clicked [View]
  on a bottom-Extensions row; Mantine Modal opened with the extension
  JSON in a Code block. All three close paths verified: X button (with
  aria-label="Close" per closeButtonProps), backdrop click, and Escape
  key. UAT-FU-02 D-08 close-path contract intact.

### 4. Bottom Extensions section visual layout
expected: In `/explorer/Patient/<id>` for a resource with multiple `Resource.extension[]` entries, a section titled "Extensions" appears at the bottom with one row per unique URL (deduplicated). Each row has URL fragment + value summary + `[View]` button. Section is hidden when no resource-level extensions exist.
result: fail
evidence: |
  Walked 2026-04-28 against http://localhost:8080/fhir. Bottom
  Extensions section renders with the expected structure (titled
  "Extensions", deduplicated by URL, [View] button per row, hidden
  when the resource has no resource-level extensions). HOWEVER the
  "value summary" column is BLANK for some extension shapes — verifier
  specifically called out us-core-race and us-core-ethnicity. These
  are nested-extension shapes (no flat valueX directly on the parent
  extension; the actual codings live inside `extension[].extension[]`),
  so the summary extractor does not surface a human-readable value.

  Severity: cosmetic / minor (D-01 minor path). The dedup, sectioning,
  hiding-when-empty, and [View] open all work correctly — only the
  inline value summary is missing for nested-extension shapes. The
  full JSON is still reachable via [View], so functionality is intact;
  this is a render-quality nit, not a behavioral defect.

  Accepted as cosmetic; no fix in v1.5. Future: extend the value
  summary extractor in `ExtensionsSection` (`HumanReadableView.tsx`)
  to walk nested `extension[]` entries and surface a representative
  Coding.display or text. Logged for v1.6+ improvements.

### 5. Per-type quality matrix card behavior with real metric data
expected: Navigate to `/quality?tab=counts`. Below the existing counts table, a card titled "Quality by resource type" renders a sortable table with 7 data columns + chevron. After running each per-metric panel (Completeness, Coverage, Validation, References) once on a few resource types, the corresponding cells populate with %s. Unrun cells render em-dash (—), NEVER `0%`. Threshold-breach cells (e.g., Completeness < 80%) render in red.
result: pass
evidence: |
  Walked 2026-04-28 against http://localhost:8080/fhir. /quality?tab=counts
  → "Quality by resource type" card visible below counts table.
  Initial state: all metric cells render em-dash (—), zero literal "0%"
  observed. Ran each per-metric panel once on its target type
  (Completeness on Patient + Condition, Coverage on Patient,
  Validation on Observation with PHI ack acknowledged, References
  on Encounter). Returned to Counts tab. The 4 corresponding cells
  populated with percentages; unrun cells correctly continued to render
  em-dash, NEVER 0%. Threshold breaches rendered as expected; column
  headers sort the table on click. Phase 35 P-05 sparse-cell semantics
  verified end-to-end against live data + the curried-hook hydration
  gate held under real metric runs.

### 6. PHI gate behavior on chevron click
expected: Clicking a row's chevron in the matrix navigates to `/quality?tab=<metric>&type=<resourceType>`. ValidationPanel + ReferencesPanel pre-select the resource type from the URL. NO outbound `fetch()` fires before the user clicks the PHI acknowledgment button (Phase 7 gate preserved).
result: pass
evidence: |
  Walked 2026-04-28 against http://localhost:8080/fhir. From the
  matrix card, clicked the chevron on a row whose Validation cell was
  em-dash. URL navigated to /quality?tab=validation&type=<type> with
  the resource type pre-selected in ValidationPanel via useSearchParams.
  Network tab between chevron click and panel render: zero outbound
  fetch() to the external validator before PHI acknowledgment.
  Phase 7 PHI gate preserved on chevron entry path; Pitfall P-08
  invariant intact under URL pre-selection flow.

## Summary

total: 6
passed: 5
issues: 1
pending: 0
skipped: 0
blocked: 0

walked: 2026-04-28 by phase-38-02 (against Blaze 1.6.2 + 500-patient Synthea bundle; see 38-SESSION.md for the post-restore session fingerprint)

## Acceptance Basis

Per established Phase 33/34 precedent (Phase 999.1 + Phase 999.2 backlog), human-verification items are shelved to backlog with assumed-approved acceptance when:
- All programmatic gates pass (here: 1054 tests / 0 failing; tsc clean; build clean; design-token grep zero; deletion grep verified)
- Architectural defenses against the human-verified behaviors are in code (here: P-04 functional setter, P-05 em-dash sparse cells, P-08 PHI gate preserved on chevron, P-13 portaled-component test pattern, useThresholds curried-hook hydration gate, useSearchParams URL pre-selection)
- The behaviors require live Blaze + Synthea data to observe meaningfully (Date/Status columns, real metric cells, real Tooltip + Modal browser interactions)

User precedent: "Shelve the UAT's and continue w/ gsd-next --auto" (turn 11 in this session for Phase 34).

The Phase 38 walk on 2026-04-28 superseded the shelved acceptance with explicit live-Blaze evidence: 5/6 pass, 1/6 cosmetic fail (Test 4 nested-extension value summary). The historical shelving narrative above is preserved as the audit trail.
