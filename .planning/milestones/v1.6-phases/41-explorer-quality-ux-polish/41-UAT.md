---
status: complete
phase: 41-explorer-quality-ux-polish
source:
  - 41-01-SUMMARY.md
  - 41-02-SUMMARY.md
  - 41-03-SUMMARY.md
started: 2026-04-29T17:30:00Z
updated: 2026-04-29T18:10:00Z
---

## Current Test

[testing complete]

## Tests

### 1. EXPL-01 — Hide empty resource types Switch (right) + Rail Switch (left)
expected: Both the right-hand Resource Type Landing page AND the left-hand ResourceTypeRail sidebar (240-px nav rail visible alongside any /explorer/* route) carry a "Hide empty resource types" Switch. Both default ON (zero-count types hidden by default). Both share state via the same localStorage key — toggling one updates the other.
result: pass
note: |
  Original Phase 41 spec (default OFF on right-hand Switch only) deviated by user request mid-UAT 2026-04-29: (a) added matching Switch on the left-rail; (b) flipped default for both to ON (hide zero-counts). Inline fix applied + 6/6 ResourceTypeLanding tests pass post-change. Decision recorded here, not in the original PLAN.md.

### 2. QUAL-01 — Completeness panel N/A rows sort to bottom
expected: Navigate to /quality?tab=completeness. Sort by the Complete% column ascending — rows with data (e.g. 40%, 80%, 95%) appear in ascending order, then any rows with no data render with a dimmed em-dash ("—") at the BOTTOM. Click the column header to flip to descending — data rows reverse (95%, 80%, 40%) but the em-dash rows STAY at the bottom (they do not flip to the top). Sorting by the Resource type column shows the same: N/A rows below settled rows.
result: pass

### 3. QUAL-01 — Coding Coverage panel N/A rows sort to bottom
expected: Navigate to /quality?tab=coding (Coding Coverage). Sort by systemCode%, ASC and DESC — rows where the type has no codeable fields (rendered with em-dash "—") stay at the BOTTOM in both directions. Same behavior on the textOnly% column. Compare to before the fix: the N/A rows used to be inconsistent under DESC.
result: pass

### 4. QUAL-02 — Heat-column gradient on Quality matrix
expected: On the Quality dashboard, the per-type matrix card shows the Complete% / Coverage% / Validation% / References% columns with a 3-stop colored background — green for values ≥ 100%, yellow when at/above the configured threshold but below 100%, red when below threshold. Sparse cells (em-dash) have NO background color. Numeric values are still readable inside each colored cell (color is supplementary, not the only signal).
result: pass

### 5. QUAL-03 — Download CSV button on Quality matrix
expected: On the Quality matrix card, there is a "Download CSV" button (subtle variant, with a download icon) in the card header area. Clicking it triggers a file download. The filename matches the pattern `quality-matrix-{server-host}-{YYYY-MM-DD}.csv` (e.g. `quality-matrix-localhost-8080-2026-04-29.csv`). Open the CSV in Excel or a text editor — it has a BOM, the header row matches the visible columns (Resource type, Complete%, Coverage%, Validation%, References%, Duplicates, Issues), and sparse cells are empty (NOT rendered as `0%`).
result: pass

## Summary

total: 5
passed: 5
issues: 0
pending: 0
skipped: 0

## Gaps

[none yet]
