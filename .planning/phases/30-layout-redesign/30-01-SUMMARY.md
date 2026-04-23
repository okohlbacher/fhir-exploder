---
phase: 30-layout-redesign
plan: 01
status: completed
completed: 2026-04-23
branch: gsd/phase-30-layout-redesign
commits_on_branch: 9 (1 scaffold + 8 steps)
files_changed_src: 15
files_changed_tests: 2
---

# Summary — Plan 30-01: Layout Redesign Integration

## Outcome

Ported the external design team's handoff redesign
(`handoff/INSTRUCTIONS.md`) into the live Mantine codebase across 7 views in
8 single-commit steps. Zero business-logic changes — no hook rewrites, no
data-fetching changes, no routing changes, no new runtime dependencies.
Build clean and all tests passing after every step.

## Commits on `gsd/phase-30-layout-redesign`

| Step | Commit | Summary |
|------|--------|---------|
| — | `d5589d8` | plan: supersede phase 29, scaffold phase 30 |
| 0 | `bd41e2d` | tokens + IBM Plex + theme |
| 1 | `3b35f99` | Sidebar: Server card + nested Quality sub-nav |
| 2 | `126421a` | Dashboard: 4-card strip, open sections, drop ring, MII tiles |
| 3 | `be150d5` | Patients: card filter, chips, row-index + avatar + sparkline |
| 4 | `8f523e1` | Quality: 2-tier toolbar, strip restyle, pills + overall-% |
| 5 | `4b199b8` | Explorer: ResourceTypeRail + Category breadcrumb |
| 6 | `b7cbc0c` | Patient detail: pills MII tabs + 3-col header actions |
| 7 | `a83d13b` | Cohorts: 2-col grid layout |

## Files Changed

**Source (15)**

- `index.html` — IBM Plex fonts `<link>`.
- `src/main.tsx` — `import './styles/tokens.css'`.
- `src/theme.ts` — rewritten (indigo primary, warm neutral gray ramp,
  component defaults).
- `src/styles/tokens.css` — new (copied from `handoff/tokens.css`).
- `src/components/layout/Sidebar.tsx` — server card, nested Quality
  sub-nav, active-row rail.
- `src/components/layout/__tests__/Sidebar.test.tsx` — updated helper
  types + added thresholds Option B test.
- `src/components/dashboard/DashboardPage.tsx` — 4-card strip, collapsible
  sections, MII tile grid, no ring.
- `src/components/patients/PatientListPage.tsx` — card filter bar, chip
  row, row-index column, avatar, sparkline.
- `src/components/patients/PatientHeaderCard.tsx` — 3-col header with
  Raw JSON + `$everything` actions.
- `src/components/patients/MiiModuleTabs.tsx` — `variant="pills"`.
- `src/components/quality/SummaryCard.tsx` — restyled (no ring, big mono,
  3-px fill bar, within/near/breach badge).
- `src/__tests__/summary-card.test.tsx` — updated ring-assertion tests.
- `src/components/quality/QualityOverviewPage.tsx` — 2-tier toolbar, pills
  tabs, overall-% in tab labels.
- `src/components/quality/CohortsPage.tsx` — 2-col grid layout.
- `src/components/explorer/ExplorerLayout.tsx` — integrates
  ResourceTypeRail.
- `src/components/explorer/ResourceTypeRail.tsx` — new 240-px nav rail.
- `src/components/explorer/SearchResultsPage.tsx` — breadcrumb extended
  with Category.

## Verification

- `npm run build` → `✓ built` (tsc -b + vite), no warnings except the
  chunk-size warning that predates this phase.
- `npm test` → 836 passed / 22 todo / 3 skipped / 0 failed after each
  commit (baseline was 835; Step 1 added one thresholds-Option-B test
  case).

## Deferred Follow-ups (explicitly documented per-step)

These were part of the handoff scope but either require new data pipelines
or substantial refactors of unrelated components. Each is flagged inline
in its step commit:

1. **Step 4** — Per-type quality matrix card (Resource type / Complete% /
   Coverage% / Validation% / References% / Dup / Issues / chevron).
   `QualityMetricsContext` exposes only overall aggregates; each panel
   would need to push a per-type record into shared state.
2. **Step 4** — Real issue-count badges next to tab labels (instead of
   the overall-% we surface today).
3. **Step 5** — `<Card p="xs">` filter-bar wrap for SearchFilterPanel
   with an Add-filter chip row. Wants a dedicated SearchFilterPanel
   refactor.
4. **Step 5** — 4-tab `SegmentedControl` replacing the display-mode
   toggle (Table / Human-readable / Clinical + raw / Developer JSON).
   Display-mode logic is spread across several view components; better as
   a focused pass.
5. **Step 6** — 5-tile vitals strip below the PatientHeaderCard
   (Resources / Encounters / Conditions / Medications / Time range).
   Requires per-type searches not currently exposed by
   PatientRelatedResources.
6. **Step 6** — ClinicalTimeline row restyle
   (`[date 110px | dot rail 24px | title + sub | Open →]` with 2-px
   vertical divider). Warrants a dedicated Timeline pass.

## Out of Scope (confirmed at phase start)

- UX-01 external validator cascade (was 29-02). Preserved for a future
  phase.
- Mockup code under `handoff/mockup/`. Reference only, not shipped.
- New runtime dependencies or data-model changes.

## Next Step

Open a single PR on `gsd/phase-30-layout-redesign` for review.
