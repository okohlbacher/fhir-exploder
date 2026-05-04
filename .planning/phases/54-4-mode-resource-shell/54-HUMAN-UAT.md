---
status: partial
phase: 54-4-mode-resource-shell
source: [54-VERIFICATION.md]
started: 2026-05-04T19:40:00.000Z
updated: 2026-05-04T19:40:00.000Z
---

## Current Test

[awaiting human testing]

## Tests

### 1. Visual pill tab appearance
expected: Mode switcher renders as pill-style tabs (not underline tabs) — Summary/Human/Graph/JSON labels visible as distinct pill buttons

### 2. Keyboard 1/2/3/4 mode switching in browser
expected: Pressing 1 activates Summary, 2 Human, 3 Graph, 4 JSON; URL ?mode= param updates; shortcuts inactive when input is focused

### 3. Graph tab React Flow canvas rendering + compact prop
expected: Switching to Graph tab loads ResourceGraphView with at least 1 node rendered; no standalone "Reference graph" title or back button visible (compact=true)

### 4. Validation chip color rendering
expected: Resource with 0 issues shows teal chip "0 issues"; resource with issues shows yellow chip "N issues"; unprofiled resource type shows gray chip "Not validated"

### 5. Download button saves file to filesystem
expected: Clicking Download saves file named "${resourceType}-${id}.json" containing valid JSON with correct resourceType/id

### 6. Legacy /graph URL redirect visual confirmation
expected: Navigating to /explorer/Patient/example/graph redirects to /explorer/Patient/example?mode=graph (no 404, graph tab active)

## Summary

total: 6
passed: 0
issues: 0
pending: 6
skipped: 0
blocked: 0

## Gaps
