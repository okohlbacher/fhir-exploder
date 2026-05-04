---
status: partial
phase: 53-peek-call-site-expansion
source: [53-VERIFICATION.md]
started: 2026-05-04T18:00:00.000Z
updated: 2026-05-04T18:00:00.000Z
---

## Current Test

[awaiting human testing]

## Tests

### 1. Cmd+click on resolved reference chip (live Blaze)
expected: Drawer opens with the referenced resource JSON; no page navigation; URL unchanged
result: [pending]

### 2. Failed Cmd+click error state visual
expected: Drawer opens with dimmed "Reference unresolvable" text in body; reference string shown as monospace title; [Open full →] button absent
result: [pending]

### 3. PatientListPage indigo focus ring
expected: Keyboard-tab to PatientListPage table row; 2px indigo outline (var(--accent-ring)) visible around focused row; pressing J opens peek drawer
result: [pending]

### 4. RelatedResourcesPanel Cmd+click async fetch against live Blaze
expected: Cmd+click on an IncomingReferencesPanel or PatientRelatedResources card fetches and opens the first matching resource in the drawer
result: [pending]

## Summary

total: 4
passed: 0
issues: 0
pending: 4
skipped: 0
blocked: 0

## Gaps
