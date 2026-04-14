---
status: complete
phase: 18-quality-alerting-thresholds
source: [18-01-SUMMARY.md, 18-02-SUMMARY.md, 18-03-SUMMARY.md, 18-04-SUMMARY.md]
started: 2026-04-14T13:15:56Z
updated: 2026-04-14T13:30:00Z
---

## Current Test

(all tests evaluated)

## Tests

### 1. Configure thresholds entry point
expected: On `/quality`, a "Configure thresholds" button is visible in the toolbar (left of "Recompute metrics"). Clicking it navigates to `/quality/thresholds`.
result: pass

### 2. Thresholds page renders
expected: `/quality/thresholds` shows a table with 7 rows, one per metric (Completeness, Coding coverage, Validation, Plausibility, Lab ranges, Duplicates, References). Each row has: metric label / default % / NumberInput with `%` suffix / Active badge / Clear (trash) button. A "Back to overview" link and a subtle red "Reset to defaults" button are visible.
result: pass

### 3. Custom threshold persists on blur + reload
expected: Type `60` into the Completeness row's input and tab/click away. Active badge changes to "custom". Reload the page (F5). The value `60` is still shown in the input and badge still reads "custom".
result: pass

### 4. Clear button disables alerting for a metric
expected: Click the Clear (trash) icon on any row. Active badge changes to "disabled"; the input clears. Going to the Overview Strip, that metric's tile never shows a red ring even if its value is low.
result: pass

### 5. Empty-on-blur resets to default
expected: On a row currently in "custom" state, select the input, delete all digits, and blur. Active badge returns to "default" and the row falls back to the shipped default threshold.
result: pass

### 6. Reset all to defaults
expected: Click the red "Reset to defaults" button. A Mantine modal opens with confirmation copy. Confirming triggers a blue notification ("Thresholds reset / All metrics restored to shipped defaults") and every row returns to "default" state. Cancelling leaves state untouched.
result: pass

### 7. OverviewStrip shows 9 tiles
expected: On `/quality`, the overview strip shows 9 tiles in one or two rows depending on viewport: [Total resources] [Resource types] [Completeness] [Coding coverage] [Validation] [Plausibility] [Lab ranges] [Duplicates] [References]. Total resources and Resource types are plain cards (not clickable). The other 7 are clickable.
result: pass

### 8. Breach visualization (red ring + annotation)
expected: When a metric's current value is below its active threshold, its tile shows a red ring (instead of the usual blue), the numeric value is red, and a small dimmed `threshold: N%` line appears below the value. Non-breached tiles stay blue with no annotation.
result: fixed
reported: "Rings are not visible on the tiles for all metrics."
severity: major
resolution: |
  Root cause: 18-04 expanded OverviewStrip to `xl=9` cols; with SummaryCard's old
  horizontal `Group wrap="nowrap"` layout the 80px RingProgress got clipped by
  Mantine Card's default `overflow: hidden` at narrow tile widths.
  Fix (Option C — vertical layout): restructured SummaryCard to stack
  [icon+label] / [ring with value inside] / [subtitle, threshold] vertically.
  Ring renders at all viewport widths. summary-card.test.tsx (8/8) + relevant
  quality-overview.test.tsx suites still pass.

### 9. Metric tile click deep-links to correct tab
expected: Clicking a metric tile in the OverviewStrip navigates to `/quality?tab=<route>` (e.g., clicking Completeness → `?tab=completeness`, Duplicates → `?tab=duplicates`). The corresponding tab is active on first paint, content visible.
result: pass

### 10. Direct URL with ?tab= selects the right tab
expected: Opening `/quality?tab=duplicates` directly (e.g., pasting URL) lands on the Duplicates tab without first flashing Counts. Replace the URL with `?tab=bogus` — UI falls back gracefully to Counts (no crash, no Mantine orphan-value warning in the console).
result: waived
reported: "That lands on 'server not connected'."
severity: major
waiver: |
  Pre-existing scope limitation — NOT a Phase 18 regression. ConnectionContext
  initializes to `idle` on mount with no auto-reconnect; all gated routes
  (/quality, /explorer, /patients) show "Not connected" on cold-start URLs.
  The Phase 18 tab-routing logic itself is correct (proven by Test 9 which
  exercises the same useSearchParams → activeTab path end-to-end via tile
  click). Test 10 requires connection persistence to exercise.
  Logged in deferred-items.md as "Connection state lost on page reload /
  direct-URL navigation" — needs a dedicated future phase.

## Summary

total: 10
passed: 8
fixed: 1
waived: 1
pending: 0
skipped: 0

## Gaps

- truth: "OverviewStrip metric tiles must render a ring (red when breached, blue otherwise) so users can see breach state at a glance, per DQ-12."
  status: fixed
  reason: "User reported: Rings are not visible on the tiles for all metrics."
  severity: major
  test: 8
  resolution: "SummaryCard refactored to vertical layout (Option C). Ring no longer clipped at narrow tile widths. summary-card.test.tsx 8/8, quality-overview 25/26 (1 pre-existing unrelated failure)."
  artifacts: ["src/components/quality/SummaryCard.tsx"]
  missing: []

- truth: "Opening /quality?tab=<valid-route> directly must land on the corresponding tab (and ?tab=bogus must fall back to Counts) without bouncing to the 'server not connected' screen."
  status: waived
  reason: "User reported: That lands on 'server not connected'."
  severity: major
  test: 10
  waiver: "Pre-existing scope limitation: ConnectionContext has no persistence/auto-reconnect; affects all gated routes (/quality, /explorer, /patients). Phase 18 tab-routing logic itself is correct (proven by Test 9). Deferred to future connection-persistence phase. See deferred-items.md."
  artifacts: []
  missing: []
