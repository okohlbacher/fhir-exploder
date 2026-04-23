---
status: testing
phase: 30-layout-redesign
source: [30-01-SUMMARY.md]
started: 2026-04-23T12:55:00Z
updated: 2026-04-23T12:55:00Z
---

## Current Test

number: 1
name: App still boots after tokens import
expected: |
  `npm run dev` starts the Vite server with no errors.
  The app loads in the browser at http://localhost:5173 (or similar).
  No blank screen, no red console errors at startup.
  IBM Plex Sans is visibly applied (numbers have tabular mono look on
  the Dashboard summary tiles).
awaiting: user response

## Tests

### 1. App still boots after tokens import
expected: |
  `npm run dev` starts without errors; app loads; IBM Plex Sans visible on
  dashboard (mono tabular numerics on the summary tiles).
result: [pending]

### 2. Sidebar — Server card (Step 1)
expected: |
  The sidebar no longer shows two separate status pills for FHIR and
  Terminology. Instead, there's a single `<Card>` at the top labelled
  "SERVER" (uppercase, dimmed) with a Connected/Disconnected badge on the
  right, the server URL in monospace below, and the terminology dot +
  "Terminology: Reachable" (or Unreachable/Not configured) row underneath.
  Clicking anywhere in the card opens the FHIR settings modal; clicking
  the terminology row opens the terminology modal.
result: [pending]

### 3. Sidebar — Nested Quality sub-nav (Step 1)
expected: |
  Navigate to /quality. Under the "Quality" row, three indented child
  rows appear: "Overview", "Cohorts", "Thresholds". Navigating to
  /quality/cohorts dims the parent Quality row; only the Cohorts child
  gets the active (white bg + 2-px indigo left rail) treatment.
result: [pending]

### 4. Sidebar — Active-row rail (Step 1)
expected: |
  The currently-active sidebar row has a 2-px indigo vertical rail on
  its left edge and a slightly lighter (white/panel) background vs the
  inactive rows.
result: [pending]

### 5. Dashboard — 4-card summary strip (Step 2)
expected: |
  Dashboard now shows FOUR summary cards at the top (not three):
  Total Resources, Resource Types, With Data, Patients. Each card has
  an uppercase dimmed label, a big monospace value (size ≈ 34 px), and
  a dimmed hint line below. The Patients tile shows a number (or em-dash
  while loading).
result: [pending]

### 6. Dashboard — Sections open by default (Step 2)
expected: |
  Both "Data by Category" and "MII Kerndatensatz Modules" sections are
  open by default (their contents visible on first load). Clicking the
  chevron on either heading collapses/expands the section.
result: [pending]

### 7. Dashboard — Category cards (no rings) (Step 2)
expected: |
  Category cards in "Data by Category" show: a small colored swatch +
  category name at top, a big monospace count, a 3-px progress bar
  showing populated/total types, and the top-4 resource types with
  their counts in monospace on the right. NO RingProgress circles.
result: [pending]

### 8. Dashboard — MII tiles (Step 2)
expected: |
  Below the category cards, a new "MII Kerndatensatz Modules" section
  shows a 4-column grid (on desktop) of tiles — one per MII module
  (Person, Diagnose, Prozedur, Laborbefund, Medikation, Fall, Consent).
  Each tile has the German label + underlying FHIR resource type in
  mono on the left, and a big mono count on the right. Empty modules
  (count === 0 or loading) render at 55 % opacity with an em-dash for
  missing values.
result: [pending]

### 9. Patients list — Card filter bar (Step 3)
expected: |
  The /patients search fields are wrapped in a single `<Card>` filter
  bar. The Name field has a magnifying-glass icon on the left and a
  small "⌘K" keyboard hint on the right. Age-from and Age-to inputs
  are 70 px wide, separated by an en-dash.
result: [pending]

### 10. Patients list — Active-filter chips (Step 3)
expected: |
  Type a name and click Search Patients. Below the filter card, chip(s)
  appear showing each applied filter (e.g., "Name: Smith"). Clicking the
  × on a chip removes that filter and re-runs the search. "Clear all"
  removes every chip and resets the list.
result: [pending]

### 11. Patients list — Row index + avatar + sparkline (Step 3)
expected: |
  The results table has a new leading "#" column with the row index in
  monospace (dimmed). Each patient's name cell starts with a 28-px
  initials avatar (pink for female, indigo for male/other). A 20-bar
  CSS-only sparkline sits to the left of the "Time Range" text on each
  row; patients with no date range render it greyed out.
result: [pending]

### 12. Quality — 2-tier toolbar (Step 4)
expected: |
  /quality renders with the Title "Data Quality" on the left and a
  right-aligned group of action buttons (Last computed text, Configure
  thresholds, Capture snapshot, Export PDF, Recompute metrics) on the
  top row. Below that, a `<Card>` contains a 3-column grid: Resource
  types MultiSelect, Active-cohort select + Manage cohorts button,
  Sample-size control.
result: [pending]

### 13. Quality — OverviewStrip restyle (Step 4)
expected: |
  OverviewStrip tiles NO LONGER show RingProgress circles. Each tile
  shows: uppercase dimmed label, a within/near/breach colored badge at
  top-right (green/yellow/red), a big monospace value (like "92 %"),
  and a 3-px horizontal fill bar under the value. Breached tiles have
  red value text + red bar.
result: [pending]

### 14. Quality — Pills tabs with inline % (Step 4)
expected: |
  Tabs on /quality render as rounded pills (not underlines). Each
  metric tab label includes the current overall percentage when
  available, e.g., "Completeness · 92 %", "Validation · 88 %". The
  Counts and Trends tabs just show the bare label (no inline number).
result: [pending]

### 15. Explorer — 240-px rail (Step 5)
expected: |
  /explorer/Patient (or any /explorer/:type) shows a 240-px wide
  navigation rail on the left with:
    - A "Filter types…" search input at the top.
    - A grouped-by-category list (Individuals, Clinical, Diagnostics, …).
    - Each row: monospace resource-type name + dimmed mono count on the
      right.
    - The active type has a 2-px indigo left rail + white bg.
  The main search-results pane stays functional on the right.
result: [pending]

### 16. Explorer — Category breadcrumb (Step 5)
expected: |
  At the top of /explorer/Patient (or any type), the breadcrumb reads
  `Explorer › <Category> › <Type>` — for Patient, that's
  `Explorer › Individuals › Patient`.
result: [pending]

### 17. Patient detail — Header actions (Step 6)
expected: |
  Open any patient. The PatientHeaderCard shows: 64-px initials avatar
  on the left, name + gender/active badges + demographics in the
  middle, and two action controls on the right — a "Raw JSON" Button
  (opens a modal showing the raw Patient JSON) and an icon button that
  opens `Patient/{id}/$everything` in a new tab.
result: [pending]

### 18. Patient detail — Pills MII tabs (Step 6)
expected: |
  On /patients/:id with the "MII Modules" segment selected, the MII
  tabs (Person, Diagnose, Prozedur, Laborbefund, Medikation, Fall,
  Consent, Zeitleiste) render as pills rather than underline tabs.
result: [pending]

### 19. Cohorts — 2-col layout (Step 7)
expected: |
  /quality/cohorts shows a 2-column layout on screens ≥ 960 px wide:
  Saved-cohorts Paper on the left (flex width), New-cohort builder
  Paper on the right (fixed 380-px width). Narrower viewports stack
  vertically as a single column.
result: [pending]

## Summary

total: 19
passed: 0
issues: 0
pending: 19
skipped: 0
blocked: 0

## Gaps
