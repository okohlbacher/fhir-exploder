---
status: partial
phase: 04-terminology-resolution
source: [04-VERIFICATION.md]
started: 2026-04-12T09:48:00Z
updated: 2026-04-12T09:48:00Z
---

## Current Test

[awaiting human testing]

## Tests

### 1. End-to-end terminology resolution against Ontoserver
expected: Open a Condition detail page in HumanReadableView with an ICD-10/SNOMED CT coding lacking a display. Table first shows the raw code, then within ~1-3s re-renders with the German display resolved via Ontoserver `$lookup`. No loader/skeleton, no layout shift.
result: [pending]

### 2. Sidebar terminology health indicator with real network
expected: Toggle `settings.yaml` between reachable, unreachable, and empty terminology URLs. Sidebar dot + label match: reachable → green "Terminology: Reachable"; unreachable → red "Terminology: Unreachable" within ~3s; empty → gray "Terminology: Not configured"; while probing → gray pulsing "Terminology: Checking…".
result: [pending]

### 3. Clear terminology cache UX
expected: Populate cache by visiting detail pages, verify `tx-cache:v1:` keys in DevTools localStorage. Click "Clear terminology cache" in Settings. Mantine green toast appears ("Cache cleared" + "N cached terms removed from memory and local storage."). localStorage shows zero `tx-cache:v1:` keys. Revisiting a previously resolved page triggers fresh `$lookup` calls.
result: [pending]

## Summary

total: 3
passed: 0
issues: 0
pending: 3
skipped: 0
blocked: 0

## Gaps
