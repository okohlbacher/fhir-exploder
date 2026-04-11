---
status: partial
phase: 02-resource-explorer
source: [02-01-SUMMARY.md, 02-02-SUMMARY.md, 02-03-SUMMARY.md]
started: 2026-04-11T19:38:00Z
updated: 2026-04-11T20:15:00Z
---

## Current Test

[testing complete]

## Tests

### 1. Resource type landing and search navigation
expected: User can see grouped resource types from CapabilityStatement, click one, navigate to /explorer/{type} with search UI
result: issue
reported: "Does not connect to server"
severity: blocker

### 2. Search execution with real FHIR data
expected: User fills search params, clicks Search, sees results from Blaze rendered in SearchControl table
result: blocked
blocked_by: prior-phase
reason: "Blocked by Test 1 blocker — ExplorerLayout never reaches connected state"

### 3. Pagination with real Bundle links
expected: User clicks Next/Previous, page changes, position indicator updates, page size dropdown changes _count
result: blocked
blocked_by: prior-phase
reason: "Blocked by Test 1 blocker — ExplorerLayout never reaches connected state"

### 4. Three display modes with real resource data
expected: User clicks a resource, sees Human-readable tab (ResourceTable), can switch to Clinical+Raw (split view), and Developer (JSON with syntax highlighting)
result: blocked
blocked_by: prior-phase
reason: "Blocked by Test 1 blocker — ExplorerLayout never reaches connected state"

### 5. Reference click navigation and breadcrumb trail
expected: User clicks a Reference field in Human-readable view, navigates to referenced resource, breadcrumb trail shows navigation path
result: blocked
blocked_by: prior-phase
reason: "Blocked by Test 1 blocker — ExplorerLayout never reaches connected state"

## Summary

total: 5
passed: 0
issues: 1
pending: 0
skipped: 0
blocked: 4

## Gaps

- truth: "User can see grouped resource types from CapabilityStatement, click one, navigate to /explorer/{type} with search UI"
  status: failed
  reason: "User reported: Does not connect to server"
  severity: blocker
  test: 1
  root_cause: "ExplorerLayout calls useConnection() which creates a new independent useState — gets its own 'idle' state instead of the connected state from App.tsx. Connection state is not shared between dashboard and explorer routes."
  artifacts:
    - src/components/explorer/ExplorerLayout.tsx
    - src/hooks/useConnection.ts
    - src/App.tsx
  missing:
    - "Shared connection state (React context or lifting state) so ExplorerLayout sees the connection established on the dashboard"
