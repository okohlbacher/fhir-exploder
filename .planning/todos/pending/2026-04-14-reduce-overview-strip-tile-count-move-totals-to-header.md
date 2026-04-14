---
created: 2026-04-14T17:30:00.000Z
title: Shrink OverviewStrip to 7 metric tiles; move Total resources / Resource types to a status line above
area: ui
files:
  - src/components/quality/OverviewStrip.tsx
  - src/components/quality/QualityOverviewPage.tsx
source: feedback/feedback-2026-04-14T16-58-51-549Z_2dcf9656.json
---

## Problem

The OverviewStrip on `/quality` currently renders 9 tiles: `[Total resources] [Resource types] [Completeness] [Coding coverage] [Validation] [Plausibility] [Lab ranges] [Duplicates] [References]`. The two informational tiles on the left are infrastructure context (how much data exists on the server, how many types it knows about) — not quality metrics. Mixing them into the same strip dilutes the strip's purpose (at-a-glance quality dashboard) and forces tighter tile widths, which cramps the ring visualizations and the metric labels.

Logged from user feedback on `/quality?tab=references` (2026-04-14): "There are too many tiles in the strip (9) move the Totals resources and resource types to a status over the strip."

## Solution

1. Remove `Total resources` and `Resource types` from the `SimpleGrid` in `OverviewStrip.tsx`. Drop `OverviewStripProps.summary` if no other consumer needs it (or narrow it to just what the strip still uses).
2. Render those two values as a single compact status line ABOVE the strip, placed in `QualityOverviewPage.tsx` — e.g., near the "Last computed" caption:
   > `12,785 resources · 18 types · Last computed 3m ago`
3. With only 7 tiles left, rebalance `GRID_COLS` (e.g., `{ base: 1, xs: 2, sm: 3, md: 4, lg: 4, xl: 7 }`) so xl fits all 7 on one row at reasonable widths.
4. Update `quality-overview.test.tsx` expectations that assert presence of "Total resources" / "Resource types" labels — move those assertions onto the new status line.
5. Update `18-UI-SPEC.md` Layout Contract to reflect the new structure.

Non-goals: restyling individual tiles further (the SummaryCard vertical layout fix in this session already addresses ring clipping at narrow widths).
