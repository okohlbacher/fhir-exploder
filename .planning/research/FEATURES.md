# Feature Landscape — v1.8 Navigation Redesign

**Domain:** FHIR resource explorer — navigation IA + expert escape hatches
**Researched:** 2026-05-04
**Source documents:** `design_handoff_v1.7_navigation/README.md`, `view-resource-shell.jsx`, `sidebar-v2.jsx`, `.planning/PROJECT.md`
**Confidence:** HIGH (design handoff is the authoritative spec; existing codebase patterns documented in PROJECT.md)

---

## Scope Note

This document catalogues the **six v1.8 features** the user listed in the milestone context. Each entry follows the prescribed structure: table stakes / differentiators / anti-features / complexity. Features build on v1.7 foundation (`summarizeResource()`, reference-resolution cache, `IncomingReferencesPanel`, lazy graph route) — those primitives are NOT re-researched here.

The redesign's central thesis: **unify three competing display patterns** (`ResourceDetailPage` Tabs, `PatientHeaderCard` Raw JSON modal, planned standalone Graph button) **into one 4-mode shell**, with the **JSON peek drawer as the headline UX primitive** for read-only expert peeks without navigation.

Prior milestones' FEATURES.md content (v1.5 validation/performance/MII extensions, v1.6 hardening, v1.7 navigation foundations) has been superseded — those features are now in PROJECT.md's "Validated" sections. This file is scoped to v1.8 active requirements.

---

### JSON Peek Drawer (PEEK-01..06)

The lightweight 420px right-side drawer is the **headline UX primitive** — the chosen primary answer to "switch to expert / FULL JSON" per README §⭐. Slides over the current view without navigating; closing returns the user to the exact prior scroll/filter state.

**Table stakes:**
- Mantine `Drawer position="right" size={420}` with `withOverlay={false}` + `trapFocus={false}` (lighter than modal — README §"Why this beats the alternatives")
- Triggered by `J` key on focused list row (consistent across Explorer, Patients, Quality drill-downs, Cohort matches, Graph nodes)
- Triggered by `Cmd/Ctrl+click` on any reference chip (Human mode rows, Summary mode chips, IncomingReferencesPanel cards)
- `Esc` closes; focus returns to the originating row (NOT to list start)
- `Enter` while drawer open promotes to full detail (`/explorer/:type/:id` mode 4)
- Pressing `J` on a different row swaps content WITHOUT unmounting the drawer (refetch only)
- Drawer header strip: `summarizeResource(resource).primary` as bold title, `.secondary` as dim subtitle, validation chip on right (reuses existing `ValidationChip`)
- Footer: 5 action buttons — `[Copy]` `[Download]` `[Open Human]` `[Open Graph]` `[Open full →]`
- Backed by the same data-fetch path as detail page (`useResource(type, id)` from Medplum) — cache-hit instant, miss fires `Type/id` GET
- Cache-hit render ≤ 100 ms; cache-miss render ≤ 1 s with skeleton
- URL is **NOT mutated** when peeking (entire point — keeps it lightweight); only "Open full →" pushes a route
- Mounted ONCE at `AppLayout` level — global state via small zustand/context store (`{ peekTarget: { type, id } | null }`)
- Reachable from at least 4 surfaces by v1.8 close: Explorer table, Patients list, IncomingReferencesPanel cards, Human-mode reference rows (Phase 49 graph adds 5th)
- Failed reference resolution shows inline "Reference unresolvable" state — **NO toast** (README SC #3)
- Reuses Phase 47 reference-resolution cache (`Map<\`${type}/${id}\`, Resource | null>`) for `Cmd+click` flow

**Differentiators:**
- Single `JsonViewer.tsx` shared between `JsonPeekDrawer` and `DeveloperJsonView` (mode 4) — grep-provable zero-duplication acceptance criterion (SC #4)
- Drawer-swap on second `J` press (no unmount flicker) preserves perceived responsiveness when expert users compare many rows in rapid succession
- Line numbers + collapse triangles on objects/arrays in JSON body (matches mode 4 JSON anatomy from `view-resource-shell.jsx` JsonBody)
- Validation chip in drawer header reflects same status the full-detail page would show (consistency with mode 4)
- Peek-then-promote flow: user can chain `J` (peek) → `Enter` (promote) without ever touching the mouse
- Hover-peek 4-line JSON preview tooltip on reference chips (README §"Three answers" #3 — *polish item, deferrable*)

**Anti-features:**
- Modal dialog instead of right-side drawer — README explicitly rejects: drawer feels lighter for read-only peek; modal forces a full-attention context that breaks comparison flow
- Inline-expand row instead of drawer — README explicitly rejects: disrupts list rhythm; doesn't generalize across all list surfaces uniformly
- URL mutation on peek (`?peek=Patient/123`) — defeats the lightweight non-navigational property; would prevent rapid-fire comparison
- Edit affordances inside drawer — out-of-scope per PROJECT.md ("read-only explorer"); drawer is read-only
- Toast notifications for unresolved references (SC #3) — drawer's own inline state IS the feedback; toasts compound noise
- Duplicating syntax-highlighter logic between drawer and DeveloperJsonView (SC #4) — anti-feature explicitly called out in design spec
- Persisting drawer state across navigations or page reloads — peek IS the ephemeral surface; persistence belongs to mode 4
- Auto-opening on hover (vs. explicit `J` key) — would fire on accidental cursor sweeps; deliberate trigger required
- Multiple simultaneous drawers — single-target zustand store enforces one peek at a time

**Complexity: Medium**
- Net-new module `src/components/peek/` — `JsonPeekDrawer.tsx`, `JsonViewer.tsx` (extracted from `DeveloperJsonView`), `usePeekTarget.ts` (zustand or React context), `registerGlobalHotkeys.ts` (`J`/`Esc` listeners with input-focus guard mirroring existing ResourceDetailPage `1`/`2` guard)
- Required refactor: extract syntax-highlighter from existing `DeveloperJsonView` into shared `JsonViewer.tsx` so both surfaces consume one source — small but touches an existing file
- 5 wire-up sites (Explorer table, Patients list, IncomingReferencesPanel, HumanReadableView reference rows, future Phase 49 Graph nodes) — each is a small `usePeekTarget().open(type, id)` call but distributed
- Keyboard-contract testing requires JSDOM keyboard-event simulation (existing test pattern from ResourceDetailPage `1`/`2` keys can be reused)
- `Cmd+click` differs from `click` by `e.metaKey || e.ctrlKey` — straightforward but easy to miss (cross-platform Mac/Windows/Linux)
- Estimated: 3-4 phases worth of work (PEEK-01..06 numbering already implies 6 plans). Highest-risk plan: cache integration with Phase 47 ref-resolution cache (cross-cutting state).

---

### 4-Mode Resource Shell (SHELL-01..04)

Replaces existing 2-tab `ResourceDetailPage` (Human-readable / JSON) with a `Summary | Human | Graph | JSON` Mantine `SegmentedControl`. The centerpiece of the redesign — also subsumes the bespoke `PatientHeaderCard` "Raw JSON" modal and the planned standalone Graph button.

**Table stakes:**
- 4-mode `SegmentedControl` keyed `1`/`2`/`3`/`4`, replacing existing Mantine `<Tabs>` in `src/components/explorer/ResourceDetailPage.tsx`
- Keyboard contract extends existing `1`/`2` guard (currently switches Human/JSON) to all 4 keys; input-focus guard preserved
- Mode 1 — **Summary** (new, default): renders `summarizeResource(resource).primary` as heading; key-fields property table (4-6 most-asked fields, type-specific via parallel registry to `summarizeResource`); two side cards "References out" + "Referenced by"
- Mode 2 — **Human**: existing `HumanReadableView` enriched per Phase 47 (reference rows MUST display `summarizeResource(target).primary`, not `Type/id`)
- Mode 3 — **Graph**: lazy-loads existing Phase 49 component at the resource shell level (already code-split per Phase 49 SC; just relocate the mount point from standalone route into mode 3)
- Mode 4 — **JSON**: existing `DeveloperJsonView` with line numbers + right-side outline panel + top-right validation chip; toolbar adds Copy / Download / "Open in fhir-validator" actions
- "Referenced by" footer (Phase 48 `IncomingReferencesPanel`) renders below modes 1/2/4 — **NOT below Graph** (redundant; graph already shows incoming edges)
- Per-resource-type **key-fields registry** parallel to `summarizeResource`: for Patient, Observation, Condition, Encounter, MedicationStatement, Procedure, DiagnosticReport, AllergyIntolerance — each ships a list of 4-6 paths to display in Summary mode
- Mode persists in URL search param (e.g. `?mode=summary`) so bookmarks survive (table stakes for shareable URLs)
- Title-row resource header strip: `summarizeResource().primary` heading + status chip + `Type/id · LOINC code · timestamp` mono subtitle (matches `view-resource-shell.jsx` lines 358-378)
- Breadcrumb: `Explorer › <Category> › <Type> › <id>` (preserves existing v1.4 breadcrumb shape)
- All 4 modes share single render-once `<ResourceDetailPage>` shell — modes are React components swapped on the `mode` state, not separate routes

**Differentiators:**
- Summary mode replaces bespoke `PatientHeaderCard` for Patient resource (`view-resource-shell.jsx` claims this consolidates 3 patterns into 1)
- Tooltips on mode-switch buttons explain what each mode does ("Compact one-liner + key fields" / "Resolved references, extensions inline" / "Reference graph centered here" / "Raw FHIR JSON")
- Expert toggle interaction: when ON, mode 4 (JSON) becomes the default for new resource opens (instead of mode 1 Summary) — coupled with Sidebar v2 Expert switch
- "EXP" chip on JSON mode button when Expert view is enabled (visual feedback that the default has shifted)
- JSON mode outline panel: collapsible nested-key navigator on right (separate scroll region, sticky)
- JSON mode toolbar metadata strip: `17 lines · 412 bytes · validated · MII Laborbefund 1.0.6` (matches `view-resource-shell.jsx` line 294)
- Summary mode "References out" panel pre-renders before Phase 47 cache populates — uses existing `Reference.reference` field with placeholder text (`Type · ${id}`) until resolved
- Mode-switch animation suppressed (instant swap) for keyboard rhythm — no fade transition
- `extractSummary` symbol already removed (Phase 51 gap closure) — clean baseline

**Anti-features:**
- Persisting mode state across DIFFERENT resource types in localStorage (e.g. "user prefers JSON for all Observations") — adds state complexity for marginal value; URL param is enough
- Adding mode 5 ("Raw" / "MII module" / "Validation") — README explicitly closes scope at 4 modes; further modes belong in modes 1 or 2 sub-views
- Migrating mode 4 JSON viewer to a different lib (Monaco, CodeMirror) — out-of-scope; reuse existing `DeveloperJsonView` syntax highlighter
- Editable JSON in mode 4 — read-only explorer per PROJECT.md
- Mode tabs as Mantine `<Tabs>` — README and prototype both use `SegmentedControl`; tabs imply equal-weight switching, segmented control implies a discrete choice
- Auto-switching modes based on resource type (e.g. always start in Human for Patient, Summary for Observation) — surprising; constant default lowers cognitive load
- Showing "Referenced by" footer below Graph mode (redundant per README §"Concrete changes")
- Reusing `<Tabs>` HTML semantics for the segmented control — accessibility regression (radio-group vs. tablist semantics differ)

**Complexity: High**
- Largest single change in v1.8 — `ResourceDetailPage.tsx` is the central FHIR rendering surface (touched by Phases 30, 47, 48, 49, 51)
- Net-new module: `src/utils/keyFields/` — per-resource-type registry (8 typed entries to start, fall back to generic), parallel structure to `src/utils/summarizeResource.ts`
- Refactor existing tabs → segmented control while preserving keyboard contract; tests for `1`/`2` extend to `3`/`4`
- Mount point migration for Phase 49 Graph: from standalone `/explorer/:type/:id/graph` route → mode 3 of resource shell. The route can stay (deep-linking) but should redirect to `/explorer/:type/:id?mode=graph`
- Risk: re-running existing visual snapshot tests (Phase 30 design tokens) for ResourceDetailPage — may need golden-snapshot rebuild
- Risk: PatientHeaderCard removal cascades to Patient detail tests; existing Patient UAT snapshot from Phase 48 (`__snapshots__/PatientRelatedResources.test.tsx.snap`) will need re-baseline
- Estimated: 4 phases worth (SHELL-01..04 numbering implies 4 plans). Highest-risk plan: Patient summary registry entry (because Patient is the most-touched resource type)

---

### Explorer Improvements (EXPL-01..03)

Three changes to `SearchResultsPage.tsx`: Summary column, list density modes, JSON peek wiring.

**Table stakes:**
- **Summary column** as the leftmost data column in `SearchResultsPage.tsx` table — primary line bold, secondary line dim/mono — wired directly to `summarizeResource()` (Phase 46 already shipped; just consume it)
- **List density** Mantine `SegmentedControl`: `Cards / Table / Compact` (3 discrete modes)
  - Cards: card-grid layout, ~280px wide tiles with primary/secondary + key chips
  - Table: existing tabular layout with summary column added
  - Compact: dense single-line table with primary only (no secondary line)
- Density preference persists in `localStorage` keyed `explorer.density.v1` (per existing convention from v1.3 cohorts/thresholds keys)
- **JSON peek wired to all Explorer rows** via `J` key on focused row — depends on PEEK-01..06
- Existing v1.4 `<ResourceTypeRail>` (240px left rail) preserved unchanged
- Existing v1.6 "Hide empty resource types" toggle preserved unchanged
- Existing v1.4 `Explorer › <Category> › <Type>` breadcrumb preserved unchanged
- Row keyboard navigation: arrow keys move focus, `Enter` opens detail, `J` opens peek (table stakes for the `J` keyboard contract to work)

**Differentiators:**
- Density mode persists to localStorage AND respects URL param override (e.g. `?density=compact` for shareable links)
- Summary column secondary line uses IBM Plex Mono (matches v1.4 design token system)
- Cards mode shows reference-out chips inline (e.g. `subject: Patient/abc123`) — clickable to peek with `Cmd+click`
- Compact mode hides secondary line entirely — useful for 1000+ row scans
- Active filters from existing v1.4 chip row preserved across density switches (no state loss when toggling)
- Sortable Summary column: ASC/DESC by primary string (string comparison fallback when no native FHIR `_sort` parameter exists for the displayed field)

**Anti-features:**
- Adding a 4th density (e.g. "Tiles", "Spreadsheet") — 3 is the canonical count from `view-explorer-v2.jsx`; more dilutes choice
- Per-column show/hide configuration in v1.8 — out-of-scope; density picks the layout, columns are not user-configurable
- Virtualized scrolling (TanStack Virtual) — STACK.md explicitly defers until "pagination alone isn't sufficient"; not needed for v1.8
- Inline-edit affordances in Cards mode — read-only explorer
- Showing JSON inline in Cards mode (vs. peek drawer) — defeats peek drawer's purpose; one expert-escape pattern is enough
- Adding column for raw `id` next to summary — `id` already in summary's secondary line; redundant
- Persisting density per resource-type (e.g. Cards for Patient, Compact for Observation) — over-engineered; single global preference is sufficient
- Cards mode at sub-200px screen width — gracefully degrade to Table at narrow widths (responsive table is acceptable; broken card grid is not)

**Complexity: Low-Medium**
- Summary column: trivial — `summarizeResource(r)` already exists and is already consumed by `SearchResultsPage` (Phase 46/51); just promote from helper to dedicated column
- Density modes: medium — three distinct render paths (existing Table preserved; Cards is net-new render branch; Compact is style override on Table). ~150-300 LOC.
- JSON peek wiring: depends on PEEK-01..06 landing first; once it does, ~10 LOC per row to add `onKeyDown={(e) => e.key === 'J' && open(...)}`
- Existing v1.4 Explorer redesign already established the visual baseline — design tokens, breadcrumbs, ResourceTypeRail. Low regression risk.
- Estimated: 3 phases worth (EXPL-01..03 numbering implies 3 plans). Sequential dependency: PEEK must land first before EXPL-03 (JSON peek wiring).

---

### Sidebar v2 (SIDE-01..04)

IA restructure: Browse / Audit sections replacing flat 4-entry list; Expert toggle in footer; ⌘K command palette via Mantine Spotlight; Cohorts moved under Quality.

**Table stakes:**
- **Two sections** replacing flat nav: `Browse` (Dashboard, Explorer + lenses) / `Audit` (Quality, Cohorts)
- Section headers in uppercase 10px label style (matches `sidebar-v2.jsx` line 73; consistent with v1.4 design tokens)
- **Lenses sub-list under Explorer**: Patients, Practitioners, MII modules (3 lenses, dashed left-border + `LENSES` uppercase label per `sidebar-v2.jsx` lines 95-114)
- **Cohorts moved under Quality section** (already at `/quality/cohorts` route per v1.3 — only sidebar IA changes, no route changes)
- **⌘K command palette** at top of sidebar (above sections) — Mantine Spotlight integration (already a peer-dep of `@medplum/react`, free)
- ⌘K input rendered as fake search input in sidebar (`sidebar-v2.jsx` lines 47-58) — clicking opens Spotlight modal
- ⌘K opens via global hotkey (Mac `Cmd+K`, Windows/Linux `Ctrl+K`)
- ⌘K results: resource types (94), saved cohorts (4), recent resources (top 10), settings shortcuts
- **Expert toggle** in footer — Mantine `Switch` component with "Expert view" label and `<Ico.code>` icon
- Expert toggle persists to localStorage keyed `sidebar.expertView.v1`
- When Expert ON: JSON becomes default mode for new resource opens; raw search-param input visible on Explorer; `EXP` chip appears on mode 4 button
- Footer order: Expert toggle → Settings link (preserves existing pattern)
- Active-row indication preserves v1.4 `2-px indigo left rail + white background` rule
- Server card preserved (the v1.4 consolidated Server status pill, with Connected badge + click-to-modal)

**Differentiators:**
- Lens count labels inline (`Patients · 12.4k`, `Practitioners · 820`, `MII modules · 7`) — give density preview before navigating
- Expert toggle has visual chip when ON (light purple background per `sidebar-v2.jsx` line 126) — discoverable state
- ⌘K results show `summarizeResource()` output for recent resources — consistent surface across app
- ⌘K is the "third escape hatch" alongside JSON peek drawer and Expert toggle (README §"Three answers")
- Hover state on nav entries shows brief tooltip with shortcut hint (`g d` for Dashboard, `g e` for Explorer — optional polish)

**Anti-features:**
- 3+ sections (e.g. Browse / Audit / Settings / Help) — README closes at 2 sections; Settings stays in footer; Help is out-of-scope
- Drag-to-reorder sections or items — over-engineered for a 6-entry sidebar
- User-customizable lens list — out-of-scope; lenses are curated (Patients/Practitioners/MII modules)
- ⌘K with custom-built command palette — Mantine Spotlight is already a peer-dep; rebuild is wasted work
- Multi-column sidebar layout — single 232-px column matches existing design tokens
- Collapsible sidebar (icon-only mode) — not in design handoff; defer beyond v1.8
- Removing Server card from sidebar — v1.4 design landed it; out-of-scope to revisit
- Animating section expand/collapse on hover — sections always visible (the prototype shows static expand)
- Per-user account customization (favorites, pinned) — local-only tool, no user accounts (PROJECT.md constraint)

**Complexity: Medium**
- IA restructure: refactor `src/components/layout/AppLayout.tsx` (or wherever sidebar lives) — ~200-400 LOC change to swap flat list for sections + lenses
- Expert toggle: net-new state via React context or localStorage hook; downstream consumers in `ResourceDetailPage` (default mode) and `SearchResultsPage` (raw search-param input visibility)
- ⌘K Spotlight: low-medium — Mantine Spotlight is a drop-in component, but populating action list (resource types, cohorts, recent resources) requires a small data-aggregation layer. Recent resources may need a new `localStorage` key for tracking.
- Cohorts move under Quality: pure sidebar change; routes already at `/quality/cohorts` per v1.3; the existing v1.4 Quality sub-nav rail (Overview / Cohorts / Thresholds) already supports this — possible the sidebar change is trivial
- Risk: existing v1.4 sidebar tests for active-row activation (`useMatch`-based) need updates for new structure
- Estimated: 4 phases worth (SIDE-01..04 implies 4 plans). Sequential dependency: Expert toggle state must exist before SHELL-04 can react to it for default-mode selection.

---

### Patients-as-Lens (LENS-01..02)

`/patients` route remains but renders through Explorer chrome. Bespoke `PatientHeaderCard` "Raw JSON" modal removed (subsumed by 4-mode shell mode 4).

**Table stakes:**
- Route `/patients` preserved (deep-link compatibility) — internal redirect or chrome-rewrap, NOT a route change
- Patients list page renders inside Explorer chrome: same breadcrumbs root (`Explorer › Patients lens`), same sidebar highlight (Sidebar v2 "Patients" lens active state)
- Patient detail page = unified `ResourceDetailPage` shell (4-mode, mode 1 Summary by default)
- Patient summary registry entry provides MII module summary layout (in mode 1) — preserves clinical surface from v1.4 PatientHeaderCard
- **Bespoke `PatientHeaderCard` "Raw JSON" modal removed** — JSON mode (mode 4) covers it
- **Bespoke `PatientHeaderCard` `$everything` icon button** — consider keeping or migrating to mode-1 Summary action (decision point; spec says JSON mode is the only mandatory removal)
- Existing v1.4 Patients filter card (search + age + gender + chip row + initials avatar + row-index) preserved unchanged
- Existing MII Kerndatensatz module tabs preserved as a sub-element WITHIN Summary mode for Patient (Person / Fall / Diagnose / Prozedur / Consent / Laborbefund / Medikation order)
- Patient detail breadcrumb: `Explorer › Patients lens › <patient name>` (NOT `Patients › <name>`) — reflects the lens IA model
- Existing v1.6 `useMiiExtensionCounts` pre-probe behavior preserved (zero-count tab dimming continues to work)

**Differentiators:**
- "Patients lens" label in breadcrumb — explicit naming reinforces that Patients is one of many resource-type entry points, not its own top-level concept
- The Patient detail page no longer has a Resource-Type Rail (since it's a single-resource view, not a list) — but breadcrumb anchors back to `Explorer › Patients lens`
- Keyboard shortcut `g p` for "go to Patients lens" (consistent with hypothetical `g e` for Explorer, `g d` for Dashboard)
- Same JSON peek drawer wired across Patients list rows — consistent with Explorer

**Anti-features:**
- Removing `/patients` route entirely (forcing redirect to `/explorer/Patient`) — breaks bookmarks; the spec says "keep the route /patients and the existing component"
- Building a bespoke Patient lens page chrome separate from Explorer — defeats the "as-lens" thesis
- Migrating MII module tabs OUT of Patient detail — they're the clinical view; preserve them inside Summary mode
- Keeping `PatientHeaderCard` "Raw JSON" modal alongside mode-4 JSON — duplication; pick one (the spec says drop the modal)
- Adding lens-specific filter sets to other lenses (Practitioners, MII modules) — out-of-scope; lenses are entry points, not customized list views
- Treating "Patients lens" as a saved cohort — different concept; cohorts have lifecycle CRUD, lenses are static IA entries
- Replacing v1.4 Patients filter card with a generic Explorer filter — Patients-specific filters (age, gender) are higher-value than generic resource search

**Complexity: Low-Medium**
- Bulk of the change is **chrome-only**: breadcrumb structure, sidebar highlight, route alias. Existing PatientsLayout component largely preserved.
- `PatientHeaderCard` Raw JSON modal removal: small — delete modal component + button, replace with mode-4 link
- Risk: existing Patient detail UAT snapshots (Phase 48 byte-identical baseline) will need re-baseline after PatientHeaderCard restructure
- Risk: MII module tabs nesting inside Summary mode (mode 1) requires a Patient-specific summary mode override — non-trivial because Summary mode for other resources is a flat key-fields table
- Estimated: 2 phases worth (LENS-01..02 numbering implies 2 plans). Cleanup item; lowest user-facing risk among the six features.

---

### UAT Backlog Closure (UAT-01)

~20 deferred browser-only verification items from v1.6 + v1.7 phases — consolidated and verified in a dedicated UAT phase.

**Table stakes:**
- Single consolidated UAT phase (one phase, not distributed across other v1.8 phases)
- Verifies all `42-HUMAN-UAT.md`, `43-HUMAN-UAT.md`, `44-HUMAN-UAT.md`, `46-HUMAN-UAT.md`, `48-HUMAN-UAT.md`, `49-HUMAN-UAT.md` items currently with `[deferred]` or `[pending]` markers
- Live-Blaze server connection required (localhost:8080 with Synthea or similar test data)
- Each item flips from `pending` → `pass` with a screenshot or live observation note
- Failed items become explicit follow-up tasks or accepted-as-known-issues with documented rationale
- Updates corresponding `nyquist_compliant: false → true` flags on the originating phases (audit-trail closure)
- Final report appended to milestone audit document

**Differentiators:**
- Time-boxed (e.g. one focused half-day) to avoid UAT scope creep
- Streamed/recorded session for future reference (low-effort if done with screen capture)
- Categorized output: Pass / Fail / Known-issue-deferred / Test-environment-blocked
- New defects discovered surface as separate phase candidates, not silent failures

**Anti-features:**
- Re-running UAT items that already passed — out-of-scope; only deferred items
- Adding net-new UAT items not from prior phases (scope creep) — those belong in their own phases
- Treating UAT as a substitute for unit/integration tests — it's a complementary verification layer, not a replacement
- Manual perf measurements that headless tools cover better — Phase 37's Lighthouse substitution showed automation is preferable when feasible
- Detailed regression suite expansion in this phase — UAT closure is verification, not test authoring
- Automating items that are inherently observational (e.g. "feels smooth on Slow-3G") — those remain manual by design

**Complexity: Low (effort) / Medium (scheduling)**
- No code changes expected; only verification + audit-trail flips
- Effort: half-day to full day of focused live-Blaze interaction + documentation
- Scheduling complexity: requires a stable test FHIR server with representative data; coordinating with milestone gating
- Risk: UAT discovers a real defect that blocks v1.8 close — should be planned for, not avoided
- Estimated: 1 phase worth (UAT-01 implies single plan). Complete LAST, after all other v1.8 features have shipped, so UAT covers the v1.8 surface plus the v1.6+v1.7 backlog.

---

## Cross-Feature Dependencies

```
PEEK-01..06 ────┬──> EXPL-03 (JSON peek wiring on Explorer rows)
                ├──> SHELL-04 (drawer "Open full →" promotes to mode 4)
                └──> LENS-01..02 (drawer wired on Patients list)

NAV-01 (v1.7 shipped) ──> SHELL-01 (Summary mode), EXPL-01 (Summary column),
                          PEEK-01 (drawer header strip), LENS-01 (Patient summary)

REVR-02 (v1.7 shipped) ──> SHELL-01..04 ("Referenced by" footer below modes 1/2/4)

GRPH-01..04 (v1.7 shipped) ──> SHELL-03 (Graph mode mounts existing component)

READ-01..03 (v1.7 shipped) ──> SHELL-02 (Human mode), PEEK (Cmd+click ref-resolution cache)

SIDE-03 (Expert toggle state) ──> SHELL-04 (default mode = JSON when expert ON)
                              ──> EXPL (raw search params visible when expert ON)

UAT-01 ──> runs LAST, after all other v1.8 features ship
```

## MVP Recommendation

If forced to ship a subset of v1.8, prioritize:

1. **PEEK-01..06** (JSON peek drawer) — the headline UX primitive; standalone-shippable; immediate user value (expert escape hatch without route change)
2. **SHELL-01..04** (4-mode resource shell) — central navigation thesis; subsumes 3 existing patterns
3. **EXPL-01** (Summary column) — small win, leverages already-shipped Phase 46 util
4. **SIDE-03** (Expert toggle) — pairs with SHELL to give expert default-mode behavior

**Defer if needed:**
- LENS-01..02 — chrome polish, can ship after the four core features
- SIDE-04 (⌘K palette) — nice-to-have; not blocking
- EXPL-02 (Cards/Compact density) — additive; Table mode alone is functional
- UAT-01 — must close before milestone gate, but is verification not feature

**MVP order for one-at-a-time shipping** (per README §"Suggested implementation order"):

1. JSON peek drawer (PEEK) — wire to Explorer + Patients lists first
2. Resource shell skeleton (SHELL) — replace Tabs with SegmentedControl; mode 1 + mode 4 light up; mode 2 wraps existing HumanReadableView; mode 3 stub-renders or mounts Phase 49 component
3. Explorer Summary column + density (EXPL) — already-shipped util consumption + visual polish
4. Sidebar v2 (SIDE) — IA restructure; ⌘K palette; Expert toggle wires to SHELL/EXPL
5. Patients-as-lens (LENS) — chrome rewrap; PatientHeaderCard modal removal
6. UAT-01 — last, covers all v1.8 surface plus v1.6+v1.7 backlog

---

## Sources

- `design_handoff_v1.7_navigation/README.md` — primary spec (HIGH confidence; authoritative design intent)
- `design_handoff_v1.7_navigation/view-resource-shell.jsx` — 4-mode shell visual reference
- `design_handoff_v1.7_navigation/sidebar-v2.jsx` — Sidebar v2 visual reference
- `.planning/PROJECT.md` — project context, v1.7 shipped baseline, v1.8 active requirements (HIGH confidence)
- `CLAUDE.md` STACK section — Mantine 8 + Medplum 5 constraint set (HIGH confidence; pinned via npm peer-dep verification)
- v1.7 phase summaries (Phases 46-51) — `summarizeResource`, ref-resolution cache, IncomingReferencesPanel, graph route foundations (HIGH confidence; shipped code)
