---
status: partial
phase: 01-foundation-blaze-connectivity
source: [01-VERIFICATION.md]
started: 2026-04-11T18:10:00Z
updated: 2026-04-11T18:10:00Z
---

## Current Test

[awaiting human testing]

## Tests

### 1. End-to-end connection flow
expected: Click "Connect to Server", sidebar turns green, resource types accordion appears with lazy-loaded counts
result: [pending]

### 2. Medplum compatibility gate (Roadmap SC 5)
expected: Green "Medplum compatibility verified" alert appears below resource list with ResourceTable rendering actual Blaze data
result: [pending]

### 3. Error state flow
expected: Click Connect with Blaze NOT running, red "Cannot reach FHIR server" alert with fix suggestion, sidebar shows "Disconnected"
result: [pending]

### 4. Default settings fallback
expected: Remove public/settings.yaml, refresh app, orange "Using default settings" banner appears
result: [pending]

## Summary

total: 4
passed: 0
issues: 0
pending: 4
skipped: 0
blocked: 0

## Gaps
