---
quick_id: 260423-gz9
status: completed
completed: 2026-04-23
commit: d98a3c5
files_changed:
  - src/components/quality/CohortBuilderForm.tsx
---

# Summary — Quick 260423-gz9: Date range picker UX

## Outcome

CohortBuilderForm's Encounter date range now supports two fast paths that avoid
month-by-month calendar clicking:

1. **Typed shortcut** — new `TextInput` above the calendar accepts formats like
   `2001`, `2001-2025`, `2024-03 - 2026-04`, and `2024-03-15 to 2026-04-20`.
   Enter applies; invalid input shows an inline error without clobbering picker
   state.
2. **Header-click cascade** — `maxLevel="decade"` on the DatePickerInput
   unlocks month → year → decade navigation when the user clicks the calendar
   header.

Both controls write to the same `dateRange` state; neither is authoritative.
`resetForm()` clears both. No breaking changes to the `DateRangeCriterion`
serializer.

## Change

`src/components/quality/CohortBuilderForm.tsx`:

- Added `parseDateRangeShortcut` + `parseSideToStart` / `parseSideToEnd`
  helpers (module-private, pure). Parse rules documented inline.
- Added `dateRangeText` / `dateRangeTextError` state parallel to the existing
  `dateRange` state.
- Rewrote the "Encounter date range" JSX block: `Stack` wraps the new
  `TextInput` and the existing `DatePickerInput`. Picker picks up
  `maxLevel="decade"` and its `description` now mentions header cascade.
- Extended `resetForm()` to clear the new text state.

## Verification

- `npm run build` → `✓ built in 349ms` (tsc -b clean).
- `npm test` → 835 passed / 22 todo / 0 failed.
- Commit: `d98a3c5 feat(quick-260423-gz9): date range picker UX — typed shortcut + decade-level cascade`.

## Manual smoke checks (for the user)

- Open Cohorts → Create. Type `2001-2025` in the new text field, press Enter.
  The DatePickerInput below should show "01 Jan 2001 – 31 Dec 2025".
- Clear the text field, press Enter — picker resets to empty.
- Open the calendar popover and click the "March 2026" header. First click →
  year grid (all 12 months of 2026). Second click → decade grid (2020s).
- Type `bad input` and press Enter → inline error; picker state unchanged.
