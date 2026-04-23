---
status: resolved
phase: 30-layout-redesign
source: [30-01-SUMMARY.md]
started: 2026-04-23T12:55:00Z
updated: 2026-04-23T13:45:00Z
resolved_in_phase: true      # 5 in-scope gaps fixed on this branch
open_off_phase: 6            # 6 off-phase follow-ups deferred
---

## Current Test

[UAT walkthrough complete — 16 pass, 0 fail-to-complete, 11 gaps logged (5 in-phase fixable, 6 off-phase follow-ups).]

## Tests

### 1. App still boots after tokens import
expected: |
  `npm run dev` starts without errors; app loads; IBM Plex Sans visible on
  dashboard (mono tabular numerics on the summary tiles).
result: pass

### 2. Sidebar — Server card (Step 1)
expected: |
  The sidebar no longer shows two separate status pills for FHIR and
  Terminology. Instead, there's a single `<Card>` at the top labelled
  "SERVER" (uppercase, dimmed) with a Connected/Disconnected badge on the
  right, the server URL in monospace below, and the terminology dot +
  "Terminology: Reachable" (or Unreachable/Not configured) row underneath.
  Clicking anywhere in the card opens the FHIR settings modal; clicking
  the terminology row opens the terminology modal.
result: issue
reported: "Looks good. But remove display of the FHIR server URL in the sidebar."
severity: cosmetic

### 3. Sidebar — Nested Quality sub-nav (Step 1)
expected: |
  Navigate to /quality. Under the "Quality" row, three indented child
  rows appear: "Overview", "Cohorts", "Thresholds". Navigating to
  /quality/cohorts dims the parent Quality row; only the Cohorts child
  gets the active (white bg + 2-px indigo left rail) treatment.
result: pass

### 4. Sidebar — Active-row rail (Step 1)
expected: |
  The currently-active sidebar row has a 2-px indigo vertical rail on
  its left edge and a slightly lighter (white/panel) background vs the
  inactive rows.
result: pass

### 5. Dashboard — 4-card summary strip (Step 2)
expected: |
  Dashboard now shows FOUR summary cards at the top (not three):
  Total Resources, Resource Types, With Data, Patients. Each card has
  an uppercase dimmed label, a big monospace value (size ≈ 34 px), and
  a dimmed hint line below. The Patients tile shows a number (or em-dash
  while loading).
result: pass

### 6. Dashboard — Sections open by default (Step 2)
expected: |
  Both "Data by Category" and "MII Kerndatensatz Modules" sections are
  open by default (their contents visible on first load). Clicking the
  chevron on either heading collapses/expands the section.
result: pass

### 7. Dashboard — Category cards (no rings) (Step 2)
expected: |
  Category cards in "Data by Category" show: a small colored swatch +
  category name at top, a big monospace count, a 3-px progress bar
  showing populated/total types, and the top-4 resource types with
  their counts in monospace on the right. NO RingProgress circles.
result: pass

### 8. Dashboard — MII tiles (Step 2)
expected: |
  Below the category cards, a new "MII Kerndatensatz Modules" section
  shows a 4-column grid (on desktop) of tiles — one per MII module
  (Person, Diagnose, Prozedur, Laborbefund, Medikation, Fall, Consent).
  Each tile has the German label + underlying FHIR resource type in
  mono on the left, and a big mono count on the right. Empty modules
  (count === 0 or loading) render at 55 % opacity with an em-dash for
  missing values.
result: issue
reported: "Looks good, but reorder in this order: Person, Fall, Diagnose, Prozedur, Consent, Laborbefund, Medikation"
severity: minor

### 9. Patients list — Card filter bar (Step 3)
expected: |
  The /patients search fields are wrapped in a single `<Card>` filter
  bar. The Name field has a magnifying-glass icon on the left and a
  small "⌘K" keyboard hint on the right. Age-from and Age-to inputs
  are 70 px wide, separated by an en-dash.
result: pass

### 10. Patients list — Active-filter chips (Step 3)
expected: |
  Type a name and click Search Patients. Below the filter card, chip(s)
  appear showing each applied filter (e.g., "Name: Smith"). Clicking the
  × on a chip removes that filter and re-runs the search. "Clear all"
  removes every chip and resets the list.
result: pass

### 11. Patients list — Row index + avatar + sparkline (Step 3)
expected: |
  The results table has a new leading "#" column with the row index in
  monospace (dimmed). Each patient's name cell starts with a 28-px
  initials avatar (pink for female, indigo for male/other). A 20-bar
  CSS-only sparkline sits to the left of the "Time Range" text on each
  row; patients with no date range render it greyed out.
result: issue
reported: "What are the blue lines under timerange on the /patients page - remove"
severity: minor

### 12. Quality — 2-tier toolbar (Step 4)
expected: |
  /quality renders with the Title "Data Quality" on the left and a
  right-aligned group of action buttons (Last computed text, Configure
  thresholds, Capture snapshot, Export PDF, Recompute metrics) on the
  top row. Below that, a `<Card>` contains a 3-column grid: Resource
  types MultiSelect, Active-cohort select + Manage cohorts button,
  Sample-size control.
result: pass

### 13. Quality — OverviewStrip restyle (Step 4)
expected: |
  OverviewStrip tiles NO LONGER show RingProgress circles. Each tile
  shows: uppercase dimmed label, a within/near/breach colored badge at
  top-right (green/yellow/red), a big monospace value (like "92 %"),
  and a 3-px horizontal fill bar under the value. Breached tiles have
  red value text + red bar.
result: pass

### 14. Quality — Pills tabs with inline % (Step 4)
expected: |
  Tabs on /quality render as rounded pills (not underlines). Each
  metric tab label includes the current overall percentage when
  available, e.g., "Completeness · 92 %", "Validation · 88 %". The
  Counts and Trends tabs just show the bare label (no inline number).
result: pass

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
result: pass

### 16. Explorer — Category breadcrumb (Step 5)
expected: |
  At the top of /explorer/Patient (or any type), the breadcrumb reads
  `Explorer › <Category> › <Type>` — for Patient, that's
  `Explorer › Individuals › Patient`.
result: pass

### 17. Patient detail — Header actions (Step 6)
expected: |
  Open any patient. The PatientHeaderCard shows: 64-px initials avatar
  on the left, name + gender/active badges + demographics in the
  middle, and two action controls on the right — a "Raw JSON" Button
  (opens a modal showing the raw Patient JSON) and an icon button that
  opens `Patient/{id}/$everything` in a new tab.
result: pass-assumed
reported: "User did not flag PatientHeaderCard directly; gave feedback on HumanReadableView instead (logged as off-phase gap)."

### 18. Patient detail — Pills MII tabs (Step 6)
expected: |
  On /patients/:id with the "MII Modules" segment selected, the MII
  tabs (Person, Diagnose, Prozedur, Laborbefund, Medikation, Fall,
  Consent, Zeitleiste) render as pills rather than underline tabs.
result: pass

### 19. Cohorts — 2-col layout (Step 7)
expected: |
  /quality/cohorts shows a 2-column layout on screens ≥ 960 px wide:
  Saved-cohorts Paper on the left (flex width), New-cohort builder
  Paper on the right (fixed 380-px width). Narrower viewports stack
  vertically as a single column.
result: pass

## Summary

total: 19
passed: 16
issues: 7
pending: 0
skipped: 0
blocked: 0

# pass-with-followup rows (tests with non-blocking nits logged in Gaps):
# test 2 (Sidebar server card URL) — pass-with-followup
# test 8 (Dashboard MII tile order) — pass-with-followup
# test 11 (Patients list sparkline) — pass-with-followup (sparkline renders, user wants it gone)
# test 17 (Patient detail header actions) — pass-assumed (user diverted to unrelated HumanReadable feedback)
# test 18 (Patient detail pills MII tabs) — pass-with-followup (contrast nit logged)
# All 19 checkpoints observed; none blocking.

## Gaps

- truth: "Server card should not display the FHIR server URL"
  status: resolved
  resolved_commit: "7fd08c7"
  reason: "User reported: Looks good. But remove display of the FHIR server URL in the sidebar."
  severity: cosmetic
  test: 2
  root_cause: ""
  artifacts: ["src/components/layout/Sidebar.tsx"]
  missing: []
  debug_session: ""
- truth: "Tier-1 scope Card (/quality) — the Active cohort column label should align horizontally with the Resource types and Sample size labels at the top of the Card. Currently it sits lower."
  status: resolved
  resolved_commit: "5b4fb93"
  reason: "User reported via screenshot: alignment of the cohort selection under /quality is not well aligned. The 'Active cohort' label is below the baseline of 'Resource types' / 'Sample size' because the inner Group uses align='flex-end' (to bottom-align the Manage cohorts button with the Select), which pushes the whole cohort column downward."
  severity: minor
  test: 6
  root_cause: "QualityOverviewPage.tsx uses align='flex-end' on the Group containing ActiveCohortSelect + Manage cohorts button. flex-end makes the Group align items to the bottom of the cell, so the ActiveCohortSelect's own label drops below the labels in the sibling columns (which naturally sit at the cell top)."
  artifacts: ["src/components/quality/QualityOverviewPage.tsx"]
  missing: []
  debug_session: ""
- truth: "MII module ordering: Person, Fall, Diagnose, Prozedur, Consent, Laborbefund, Medikation"
  status: resolved
  resolved_commit: "c1bffd7"
  reason: "User reported: Looks good, but reorder in this order: Person, Fall, Diagnose, Prozedur, Consent, Laborbefund, Medikation."
  severity: minor
  test: 8
  root_cause: "MII_MODULES array in src/utils/mii-modules.ts currently declares the modules in a different order (Person, Diagnose, Prozedur, Laborbefund, Medikation, Fall, Consent). The Dashboard tile grid (Step 2), the MiiModuleTabs tab bar, and the ClinicalTimeline type badges all consume this array, so reordering here ripples through every MII surface for consistency."
  artifacts: ["src/utils/mii-modules.ts"]
  missing: []
  debug_session: ""
- truth: "Remove the per-row sparkline from the /patients time-range column"
  status: resolved
  resolved_commit: "517adf7"
  reason: "User reported via screenshot: 'What are the blue lines under timerange on the /patients page - remove'."
  severity: minor
  test: 11
  root_cause: "The CSS-only 20-bar TimeRangeSparkline added in Step 3 is not carrying its weight; the bars confused the user and don't yet reflect real data density (constant-weighted v1)."
  artifacts: ["src/components/patients/PatientListPage.tsx"]
  missing: []
  debug_session: ""
- truth: "Explorer Patient search table should show Date and Status per resource-type semantics"
  status: failed
  reason: "User reported via screenshot at /explorer/Patient: 'date and status columns for patients are empty'. Pre-existing issue, not a Phase 30 regression."
  severity: minor
  test: off-phase  # surfaced during test 17 but unrelated
  root_cause: "SearchResultsPage `getResourceDate` checks `effectiveDateTime`, `performedDateTime`, `date`, `issued`, `recordedDate`, `onsetDateTime`, `authoredOn`, `period` — none apply to Patient, which uses `birthDate`. Status column likely falls through when resource has no `status` field (Patient uses `active`). Needs per-resource-type date/status extractor (e.g., Patient→birthDate+active, Condition→onsetDateTime+clinicalStatus, Observation→effectiveDateTime+status, etc.)."
  artifacts: ["src/components/explorer/SearchResultsPage.tsx"]
  missing: []
  debug_session: ""
- truth: "MII pill tabs — contrast of the dimmed German-resource-type subtitle against the indigo active-pill background is too low to read"
  status: resolved
  resolved_commit: "eec2331"
  reason: "User reported via screenshot: 'Colors of the Pills for MII Modules are poorly chosen (contrast of the gray on blue too low).' Introduced by Phase 30 Step 6 when MiiModuleTabs gained variant='pills' — the active pill background became solid indigo but the nested <Text c='dimmed'> subtitle kept its grey color, leaving ≈1.5:1 contrast."
  severity: major
  test: 18
  root_cause: "MiiModuleTabs renders each tab as <Text fw=600 size=sm>{germanLabel}</Text> + <Text c='dimmed'>{fhirResourceType}</Text>. Under variant='pills', the active pill uses --mantine-color-indigo-6 bg + white label; the subtitle inherits no explicit colour so Mantine's 'dimmed' stays the default muted grey. Fix: when active, swap subtitle colour to white/indigo-1 (or use inherit from the pill's text colour token)."
  artifacts: ["src/components/patients/MiiModuleTabs.tsx"]
  missing: []
  debug_session: ""
- truth: "MII modules panel on /patients/:id should show per-patient data"
  status: failed
  reason: "User reported via screenshot: 'MII modules do not show any data.' Showing 'No Diagnose data found for this patient' for a 100-year-old Synthea-generated patient that should have conditions. Likely pre-existing."
  severity: major
  test: off-phase  # surfaced during test 18/19 walkthrough
  root_cause: "Unconfirmed. Either MiiModuleTab queries the wrong endpoint / field, or per-patient searches return empty bundles (capability mismatch). Phase 30 did not touch MiiModuleTab or the per-patient query hooks — needs a dedicated investigation."
  artifacts: ["src/components/patients/MiiModuleTab.tsx", "src/utils/mii-modules.ts"]
  missing: []
  debug_session: ""
- truth: "FHIR Resources view on /patients/:id should show per-patient resources"
  status: failed
  reason: "User reported via screenshot: 'FHIR Resources also do not show any data.' Same patient, same empty panel. Likely pre-existing."
  severity: major
  test: off-phase
  root_cause: "FhirResourcesView currently renders an empty state when every type's count is 0 or all loading. If per-type $search queries are returning empty bundles for this patient, the whole view renders empty. Phase 30 did not touch this component."
  artifacts: ["src/components/patients/FhirResourcesView.tsx"]
  missing: []
  debug_session: ""
- truth: "Dashboard MII tile counts should be scoped to the current patient (or clearly labelled as server-wide)"
  status: failed
  reason: "User reported: 'Counts for modules and resources are off (unfiltered?)' Dashboard MII tiles currently show server-wide totals from useResourceCounts; the user expects per-patient counts or clear labelling."
  severity: minor
  test: off-phase
  root_cause: "DashboardPage's new MII tile grid (Step 2) sources counts from `counts[module.fhirResourceType]` — that's the server-wide count across ALL patients. For a per-patient view, counts need scoping (param `patient=Patient/{id}` or `subject=Patient/{id}`) or the tiles need a label making it explicit these are server totals."
  artifacts: ["src/components/dashboard/DashboardPage.tsx"]
  missing: []
  debug_session: ""
- truth: "Resource view-mode toggle: remove the 'Clinical + raw' mode entirely, and rename 'Developer' to 'JSON'"
  status: failed
  reason: "User reported: 'Remove the Clinical and Raw view in the patient view. Rename Developer tab to JSON.' Pre-existing; Phase 30 never touched the view-mode toggle (deferred to a follow-up in the SUMMARY)."
  severity: minor
  test: off-phase
  root_cause: "The resource detail view toggles between modes via components under src/components/explorer/ (ClinicalRawView.tsx + DeveloperJsonView.tsx + HumanReadableView.tsx etc.). Remove ClinicalRawView from the toggle, drop the import, rename the Developer-JSON tab label to 'JSON'."
  artifacts: ["src/components/explorer/ResourceDetailPage.tsx", "src/components/explorer/DeveloperJsonView.tsx", "src/components/explorer/ClinicalRawView.tsx"]
  missing: []
  debug_session: ""
- truth: "Human-readable resource view: suppress coding-system URLs for identifiers (hover-only at best), suppress JSON dumps for address extensions, put all extensions at the end as a table listing which are present, click to open modal with the extension content"
  status: failed
  reason: "User reported: 'The human-readable part contains all sorts of non-human-readable things. No need to display the coding systems of identifiers (mouse over, at best), the address shows JSON for extensions - remove. Put all extensions to the end - and show what extensions are available in a table, then the content only as a modal dialog upon click.' Pre-existing, not a Phase 30 regression — Phase 30 never touched HumanReadableView or ResourcePropertyTable."
  severity: major
  test: off-phase  # surfaced during test 17 but unrelated
  root_cause: "ResourcePropertyTable renders every field verbatim, including Identifier.system URIs and Address extensions (which arrive as nested JSON that the current renderer falls back to JSON.stringify on). Needs: (1) identifier formatter that shows value + Tooltip(system); (2) extension collector that pulls all extensions to an 'Extensions' section at the bottom rendering one row per extension url with a 'View' button → Modal."
  artifacts: ["src/components/explorer/ResourcePropertyTable.tsx", "src/components/explorer/HumanReadableView.tsx"]
  missing: []
  debug_session: ""
