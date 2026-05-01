# FHIR Exploder — Layout Redesign Integration Guide

This package contains everything Claude Code needs to port the redesigned layouts from the HTML mockup (`FHIR Exploder Redesign.html`) into the real Mantine-based codebase under `Exploder/src/`.

The mockups were built with vanilla CSS + JSX for visual review. Your job is to translate them into idiomatic Mantine 8 components while preserving existing behavior (routing, data fetching, state, tests).

## Ground rules

1. **Do not rewrite business logic.** Every hook (`useResourceCounts`, `useCohorts`, `useAsyncRun`, `useTerminologyHealth`, etc.) stays as-is. This is a layout-and-styling pass.
2. **Keep Mantine primitives** (`Stack`, `Group`, `Card`, `Table`, `Tabs`). Do not replace them with raw divs — but tighten defaults (spacing, borders, typography).
3. **Preserve all existing tests.** If a test asserts a label, selector or aria-label, keep it. If a test fails only because of a DOM-structure change, update the test minimally.
4. **Work in small PRs, one view per commit.** Order: tokens → Sidebar → Dashboard → Patients → Quality → Explorer → Patient detail → Cohorts.
5. **Verify after each view:** `npm run build` + `npm test -- <relevant>.test.tsx`.

## Step 0 — Design tokens

Copy `tokens.css` into `Exploder/src/styles/tokens.css` and import it once at the app entry (`main.tsx` or `index.css`). Then wire the Mantine theme to read from it:

```ts
// Exploder/src/theme.ts
import { createTheme } from '@mantine/core';

export const theme = createTheme({
  fontFamily: '"IBM Plex Sans", ui-sans-serif, system-ui, sans-serif',
  fontFamilyMonospace: '"IBM Plex Mono", ui-monospace, monospace',
  primaryColor: 'indigo',
  primaryShade: 6,
  defaultRadius: 'md',
  radius: { sm: '4px', md: '6px', lg: '10px' },
  colors: {
    // Keep Mantine's indigo; override greys with warm neutrals
    gray: [
      '#fafaf8', '#f5f4f1', '#ecebe7', '#dedcd6',
      '#c5c3bc', '#9a9791', '#6e6b66', '#504d48',
      '#35332f', '#1c1b18',
    ],
  },
  components: {
    Card: { defaultProps: { withBorder: true, radius: 'lg', padding: 'lg' } },
    Table: { defaultProps: { verticalSpacing: 'xs', horizontalSpacing: 'md' } },
    Button: { defaultProps: { size: 'sm', radius: 'md' } },
    Tabs: { defaultProps: { variant: 'pills' } },
  },
});
```

Load the font in `index.html`:
```html
<link href="https://fonts.googleapis.com/css2?family=IBM+Plex+Sans:wght@400;500;600;700&family=IBM+Plex+Mono:wght@400;500;600&display=swap" rel="stylesheet">
```

## Step 1 — Sidebar (`src/components/layout/Sidebar.tsx`)

Goals:
- Replace the two standalone status `UnstyledButton` pills with a single compact **Server card** that groups FHIR + terminology status, server URL, and profile.
- Indent `Cohorts` and `Thresholds` visually under `Quality` when on any `/quality/*` route (treat them as sub-nav, not siblings).
- Active row gets a 2px indigo rail on the left + `bg="white"` (`var(--panel)`) instead of Mantine's default.

Keep `SidebarRow` / `useMatch` logic intact. Only change:

```tsx
// Replace NAV_ITEMS Cohorts entry — Cohorts now renders as a child of Quality
const NAV_ITEMS: NavItem[] = [
  { label: 'Dashboard', icon: IconDashboard, to: '/', exact: true },
  { label: 'Explorer',  icon: IconDatabase,  to: '/explorer' },
  { label: 'Patients',  icon: IconUsers,     to: '/patients' },
  { label: 'Quality',   icon: IconChartBar,  to: '/quality',
    children: [
      { label: 'Overview',   to: '/quality' },
      { label: 'Cohorts',    to: '/quality/cohorts' },
      { label: 'Thresholds', to: '/quality/thresholds' },
    ] },
];
```

Replace the two status pills block with a single `<Card withBorder p="sm" radius="md">` containing: uppercase "Server" label + `Connected` badge, server URL in monospace, terminology status dot + label. Clicking the card opens the FHIR settings modal; clicking the terminology row opens the terminology modal (preserve `onClick` handlers that were on the old pills).

## Step 2 — Dashboard (`src/components/dashboard/DashboardPage.tsx`)

Current file already has the right data shape. Just restyle:

1. **Summary strip (3 cards → 4)** — Add a fourth card for "Patients" (use `counts['Patient']`). Bump value font to `size={34}` `fw={600}` and make it monospace with tabular numerals. Move the tiny hint (e.g. "+2.1% past 24h") below the number in `size="xs" c="dimmed"`. Use `ff="var(--font-mono)"` on numerics.
2. **Sections opened by default.** Flip `useDisclosure(false)` → `useDisclosure(true)` for both `categoryOpened` and `miiOpened`. The sections are the primary content, not hidden drilldowns.
3. **Category cards** — drop `RingProgress`. Replace with:
   - Colored 8×8 swatch + category name
   - Big monospace count
   - A 3px linear progress bar showing `populatedTypes / totalTypes`
   - Existing top-4 type list (keep as-is)
4. **MII tiles** — grid of 4 cols on `md`, 2 on `sm`. Inside each: label + FHIR resource type (mono) on the left, big number on the right. For empty modules use `opacity: 0.55` and "—" dash. Keep the navigate-on-click behavior.

## Step 3 — Patients list (`src/components/patients/PatientListPage.tsx`)

1. **Collapse the search `<Group>` into a single `<Card p="sm">` filter bar.** Inside:
   - Search `TextInput` with `leftSection={<IconSearch/>}` and `rightSection={<Kbd>⌘K</Kbd>}` — spans `flex: 1`.
   - Age min / max as two 60-px `NumberInput`s separated by an en-dash.
   - Gender `Select`.
   - Search button pushed right.
2. **Active-filter chip row** — a `<Group>` below the bar showing applied filters as dismissible `Badge`s (`variant="light"` `color="indigo"`) plus a "Clear all" subtle button. Derive chips from `activeSearch` state.
3. **Table**: keep the current columns but add a leading row-index cell (monospace, dimmed) and a trailing `ActionIcon` for the RAW button (it's already compact — just move it to the last column and show on hover). Swap the current gender `Badge` rendering for a neutral chip and add a 28×28 initials avatar in the Name cell.
4. **Time range sparkline** — tiny CSS-only 20-bar sparkline next to the existing monospace date range. Compute bar density from `summary.count` buckets if cheap; otherwise use a constant-weighted sparkline for v1.

## Step 4 — Quality overview (`src/components/quality/QualityOverviewPage.tsx`)

Split the crowded toolbar into **two tiers**:

**Tier 1 (scope)** — a `<Card p="sm">` with a 3-column `SimpleGrid`:
- col 1: `ResourceTypeSelector` wrapped with an uppercase "Resource types" label
- col 2: `ActiveCohortSelect` + "Manage cohorts" `Button`
- col 3: `SampleSizeControl` (slider + number)

**Tier 2 (actions)** — a `<Group justify="flex-end">` right under the title containing: "Last computed …" text, Thresholds, Capture, Export PDF, Recompute (keep all handlers).

Then:
- **OverviewStrip** — restyle tiles: uppercase label, big mono number for %, tiny `within/near/breach` badge at top-right, compact trend arrow (`+2.1pp` style) under the percent, 3px fill bar.
- **Tabs** — change `<Tabs>` to `variant="pills"`. Badge counts inline in each tab (e.g. `Validation [493]`) using the issue totals already in context.
- **Add a "Per-type quality matrix" card** beneath the tabs as the default (Counts) panel — a `<Table>` with columns: Resource type, Complete %, Coverage %, Validation %, References %, Dup, Issues, chevron. Each % cell has a horizontal fill bar inline.

## Step 5 — Explorer (new split layout)

`ExplorerLayout.tsx` currently renders a single `<Outlet>`. Introduce a **240-px left rail** for resource-type navigation on `/explorer/*` routes:

```tsx
<div style={{ display: 'flex', height: '100%' }}>
  <ResourceTypeRail capability={state.capability} counts={counts} />
  <div style={{ flex: 1, minWidth: 0 }}>
    <MedplumProvider medplum={state.client}>
      <Outlet context={...} />
    </MedplumProvider>
  </div>
</div>
```

Rail contents: search-filter `TextInput`, then grouped-by-category list (reuse `groupByCategory` + `CATEGORY_ORDER` from the dashboard). Each row: monospace type name + dimmed monospace count, highlighted on active route with a left indigo rail.

In `ResourceTypeLanding.tsx` / `SearchResultsPage.tsx`:
- Add a breadcrumb strip: `Explorer › <Category> › <Type>`.
- Promote the search/filter controls into a `<Card p="xs">` filter bar matching the Patients pattern (field → operator → value + `Add filter` button, applied filters as chips).
- Replace the "display mode" toggle with a 4-tab `SegmentedControl`: Table / Human-readable / Clinical + raw / Developer JSON.

## Step 6 — Patient detail (`src/components/patients/PatientDetailPage.tsx`)

1. **PatientHeaderCard** — restyle as a 3-col grid: 64×64 initials avatar, name + badges + identifier row, action buttons (`Raw JSON`, `$everything`).
2. **Vitals strip** — add a new `<SimpleGrid cols={5}>` of 5 tiles below the header (Resources, Encounters, Conditions, Medications, Time range). Fill from existing `PatientRelatedResources` data.
3. **MII module tabs** — switch `<Tabs>` to `variant="pills"`, keep tab order (`MiiModuleTabs.tsx`).
4. **ClinicalTimeline** — visually: each row is `[date 110px] [dot rail 24px] [title + sub] [Open →]`. Use a 2-px vertical divider behind the dots and give each category its own accent color. The existing `TimelineEntry` / `TimelineAggregateEntry` components only need styling tweaks.

## Step 7 — Cohorts (`src/components/quality/CohortsPage.tsx`)

Split into a 2-column layout: `grid-template-columns: 1fr 380px`.

- **Left**: existing cohorts `Table` (Name, Type badge, Patients mono count, Updated, `…` menu). Add a top-of-card filter `TextInput`.
- **Right**: live **Builder preview card**. When a cohort is selected, render each `CohortCriterion` as a small `<Card>` (reuse `FhirpathCriterionCard` where applicable). Match-count badge at the top. "Dry-run count" + "Save" actions at the bottom.

## Verification checklist (run after each step)

```bash
npm run build              # tsc -b must stay clean
npm test                   # 750 existing tests must still pass
npx vitest run <touched-test>  # focused re-run for the view you changed
```

Smoke test in the browser:
- All four top-level nav items reach their pages.
- `/quality/cohorts` highlights only the Cohorts row (not Quality).
- Dashboard sections open by default and counts stream in.
- Patient list filter chips dismiss correctly and clear URL params.
- Quality scope toolbar still persists resource types + active cohort through reloads.

## Deliverables for you to produce

1. Updated files in `src/components/` per the steps above.
2. New `src/styles/tokens.css` + `theme.ts`.
3. If splitting Explorer, a new `ResourceTypeRail.tsx` under `src/components/explorer/`.
4. Updated snapshot tests as needed (minimal changes).

## Files in this handoff package

- `INSTRUCTIONS.md` (this file)
- `tokens.css` — design tokens to drop into `src/styles/`
- `mockup/` — the full HTML mockup (`FHIR Exploder Redesign.html` + JSX sources) as visual reference. **Do not ship the mockup code**; it's reference only.

## Reference screenshots

Open `mockup/FHIR Exploder Redesign.html` locally to inspect every view at 1280×820. Each artboard can be focused fullscreen for precise measurements.
