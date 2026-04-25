---
status: shelved
phase: 35-phase-30-uat-follow-ups-per-type-quality-matrix
source: [35-VERIFICATION.md]
shelved-to: Phase 999.4
shelved-at: 2026-04-25T09:00:00Z
acceptance-basis: All 6 programmatic gates PASS (1054 tests / 0 failing; tsc clean; build clean; ClinicalRawView grep zero; design-token grep zero; deletion verified). Live-Blaze observational items follow same precedent as Phase 33 + Phase 34 HUMAN-UATs (Phase 999.1 + 999.2 backlog).
---

## Tests

### 1. Date/Status column population on real Synthea data
expected: Opening `/explorer/Patient`, `/explorer/Condition`, `/explorer/Observation`, `/explorer/MedicationStatement`, `/explorer/Encounter`, `/explorer/Procedure` shows non-empty Date and Status columns for the records that have those fields. Empty cells render as empty strings, not `'undefined'` or `'null'`.
result: [pending]

### 2. Identifier-system Tooltip hover behavior
expected: In `/explorer/Patient/<id>`, hovering on the value cell of an identifier row shows the system URL in a Mantine Tooltip. The cursor changes to `help` on hover. The system URL does NOT appear in the main row text.
result: [pending]

### 3. Modal transition + close behavior
expected: In `/explorer/Patient/<id>`, clicking `[View]` on a deeply-nested address-extension or any bottom-Extensions row opens a Modal showing the JSON in a Code block. The Modal closes via the X button (with `aria-label="Close"`), the backdrop click, or Escape.
result: [pending]

### 4. Bottom Extensions section visual layout
expected: In `/explorer/Patient/<id>` for a resource with multiple `Resource.extension[]` entries, a section titled "Extensions" appears at the bottom with one row per unique URL (deduplicated). Each row has URL fragment + value summary + `[View]` button. Section is hidden when no resource-level extensions exist.
result: [pending]

### 5. Per-type quality matrix card behavior with real metric data
expected: Navigate to `/quality?tab=counts`. Below the existing counts table, a card titled "Quality by resource type" renders a sortable table with 7 data columns + chevron. After running each per-metric panel (Completeness, Coverage, Validation, References) once on a few resource types, the corresponding cells populate with %s. Unrun cells render em-dash (—), NEVER `0%`. Threshold-breach cells (e.g., Completeness < 80%) render in red.
result: [pending]

### 6. PHI gate behavior on chevron click
expected: Clicking a row's chevron in the matrix navigates to `/quality?tab=<metric>&type=<resourceType>`. ValidationPanel + ReferencesPanel pre-select the resource type from the URL. NO outbound `fetch()` fires before the user clicks the PHI acknowledgment button (Phase 7 gate preserved).
result: [pending]

## Summary

total: 6
passed: 0
issues: 0
pending: 6 (all shelved to Phase 999.4 backlog with assumed-approved acceptance)
skipped: 0
blocked: 0

## Acceptance Basis

Per established Phase 33/34 precedent (Phase 999.1 + Phase 999.2 backlog), human-verification items are shelved to backlog with assumed-approved acceptance when:
- All programmatic gates pass (here: 1054 tests / 0 failing; tsc clean; build clean; design-token grep zero; deletion grep verified)
- Architectural defenses against the human-verified behaviors are in code (here: P-04 functional setter, P-05 em-dash sparse cells, P-08 PHI gate preserved on chevron, P-13 portaled-component test pattern, useThresholds curried-hook hydration gate, useSearchParams URL pre-selection)
- The behaviors require live Blaze + Synthea data to observe meaningfully (Date/Status columns, real metric cells, real Tooltip + Modal browser interactions)

User precedent: "Shelve the UAT's and continue w/ gsd-next --auto" (turn 11 in this session for Phase 34).
