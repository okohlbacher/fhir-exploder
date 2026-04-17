---
created: 2026-04-17T08:07:13.458Z
title: Improve date range picker UX — type ranges and fast year navigation
area: ui
files:
  - src/components/quality/CohortBuilderForm.tsx
---

## Problem

Surfaced during Phase 23 live-Blaze UAT (T-5.3 pass, cosmetic feedback):

The DatePickerInput in the cohort builder requires clicking through the calendar month by month to reach multi-year ranges. For clinical use cases (e.g. "patients born before 1960" or "observations in 2001–2025") this is very tedious — up to 240 clicks to span 20 years.

Two specific requests from UAT:
1. **Fast year/month navigation** — clicking the month/year header in the calendar should open a year picker so users can jump directly to a year without paging through months.
2. **Free-text range input** — users should be able to type a range directly, e.g. `2001 - 2025` (year-only) or `01/2024 - 02/2026` (month/year). The picker should parse and apply the typed value.

## Solution

Investigate Mantine's `DatePickerInput` / `DateRangePicker` API for:
- `levelNames` or `maxLevel="year"` prop to allow clicking up to a decade/year grid (Mantine DatePicker supports `maxLevel` — check if exposed on `DatePickerInput`).
- A controlled text input overlay or `allowDeselect` + `valueFormat` trick that lets users type directly.

If Mantine's built-in controls are insufficient, consider a hybrid: keep the calendar for mouse users, add a plain text input alongside it that parses common date-range formats (`YYYY`, `MM/YYYY`, `YYYY-MM-DD`) and sets the picker value programmatically.

Acceptance: selecting "2001–2025" takes ≤ 5 interactions (ideally 1 typed entry).
