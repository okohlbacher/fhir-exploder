---
phase: 58
slug: uat-backlog-closure
milestone: v1.8
status: context-complete
created: 2026-05-05
mode: auto
---

# Phase 58 Context: UAT Backlog Closure

## Phase Summary

Human-only UAT verification pass against a live Blaze server. All items in this phase require:

- Local dev server: `npm run dev` (localhost:5173)
- Live Blaze FHIR server at `localhost:8080/fhir` with Synthea sample data loaded
- A real browser (Chrome recommended for DevTools network throttling)

**This phase is not automatable by executor agents.** No code changes are expected. The output is confirmed/documented PASS or FAIL results in each source HUMAN-UAT.md file.

---

## Decision: Phase Structure

Phase 58 is a pure human verification pass. No plans to execute, no code to ship. Work consists of:

1. Running each UAT item in a real browser against live Blaze
2. Marking results in the source HUMAN-UAT.md files
3. Filing issues for any FAILs (fix in a follow-up quick task or inserted phase)
4. Closing Phase 58 once all items are PASS or WAIVED with documented rationale

---

## Deferred UAT Inventory

### Group A — Phases without HUMAN-UAT files (from STATE.md carry-forward)

**Phase 42 (1 item) — MII Module Extension Count**
- Live-Blaze MII extension count walk: verify MII module tab shows correct counts of resources per module tab for a real patient on Blaze

**Phase 43 (3 items) — Auth URL Bar**
- Basic-auth server URL configured in Settings renders correctly in URL bar (no credentials exposed in page title or breadcrumb)
- Bearer-token server URL configured in Settings renders correctly
- Invalid SNOMED code near-miss: entering a code that almost-matches SNOMED shows appropriate "not found" rather than a false positive

**Phase 44 (2 items) — Server Picker**
- Live Blaze mode switch via Settings page: change FHIR server URL and verify app re-connects without page reload
- Large-bundle performance: navigate to a resource type with 1000+ entries and confirm the paginated table remains responsive (no jank)

---

### Group B — Phase 47: HumanReadableView (4 items — data-blocked)

Source: `.planning/phases/47-theme-b-readability-humanreadableview/47-HUMAN-UAT.md`

All 4 items are BLOCKED-NO-DATA. The Synthea dataset lacks `contained[]` resources and property-level primitive extensions. To unblock, seed Blaze with:

- A `DiagnosticReport` with `contained` Observation resources → unblocks UAT-2 + UAT-4
- A `Patient` with `_birthDate: { extension: [{...}] }` → unblocks UAT-3
- A `Patient` with `_given: [null, { extension: [{...}] }]` → unblocks UAT-5

**UAT-2: Accordion expand animation**
- Open a resource with `contained[]` (e.g. DiagnosticReport with contained Observations)
- Click each accordion entry; confirm smooth expand transition and full `ResourcePropertyTable` renders in-place

**UAT-3: ExtensionChip inline layout with long property values**
- Open a Patient with `_birthDate.extension`
- Confirm `[+N extensions]` chip renders inline without wrapping or overflowing the table row

**UAT-4: Terminology displays inside contained-resource panels**
- Expand a contained-resource accordion panel with CodeableConcepts
- Confirm coded values render with display text from the terminology server (not raw codes)

**UAT-5: Indexed-primitive `_given` extension chip**
- Open a Patient with `_given: [null, {extension:[...]}]`
- Confirm chip appears on the `given` row; expanding shows `[0]`, `[1]` prefixes on each entry

---

### Group C — Phase 48: Slow-3G Skeleton (1 item)

Source: `.planning/phases/48-theme-c-reverse-references-incoming-references-panel/48-HUMAN-UAT.md`

**UAT-3: Loading skeletons on slow network**
- Open Chrome DevTools → Network → Slow 3G profile
- Open any non-Patient resource detail page (e.g. `/explorer/Observation/{id}`)
- Confirm up to 4 placeholder skeleton cards with `<Loader>` spinners appear during in-flight queries
- Confirm populated cards replace loaders as counts resolve; final state shows only count > 0 cards

---

### Group D — Phase 49: Graph View Visual/Tactile (3–4 items)

Source: `.planning/phases/49-theme-d-graph-view-reference-graph/49-HUMAN-UAT.md`

All PASS-WIRING — code path confirmed; visual/tactile verification deferred to real browser.

**UAT-1: Pan / zoom feel on real Synthea data**
- `/explorer/Patient/{id}?mode=graph` (or `/graph` redirect)
- Drag canvas in 4 directions — smooth pan, no jitter
- Scroll-wheel zoom — zoom-to-cursor centering
- Confirm no edge label text overlaps node bounds at 100 % zoom

**UAT-2: Minimap interaction**
- Click-drag minimap viewport rectangle → main canvas pans to match
- Single click on minimap → canvas centers on click point

**UAT-4: Slow-3G loading skeleton**
- Chrome DevTools → Network → Slow 3G
- Hard-refresh `/explorer/Patient/{id}?mode=graph`
- Confirm 4 `<Skeleton>` placeholders (2×2 grid) appear during BFS fetch
- Confirm populated graph fades in once fetches resolve

**UAT-3 (partial): Dark-mode color contrast**
- Toggle Mantine color scheme to dark (DevTools: `document.documentElement.setAttribute('data-mantine-color-scheme', 'dark')`)
- Visually inspect: node text readable, edges visible (gray-6 stroke), minimap themed, controls themed

---

### Group E — Phase 52: JSON Peek Drawer (3 items)

From STATE.md carry-forward (no HUMAN-UAT file).

**E-1: Drawer visual width 420px**
- Open any resource detail page, press `J` to open Peek drawer
- Confirm drawer slides in from the right at 420px width (not 320px or full-screen)

**E-2: URL stability when J pressed**
- Confirm pressing `J` does NOT change the browser URL (drawer is ephemeral overlay, not a route)

**E-3: Focus ring visibility**
- Navigate the Peek drawer using Tab/Shift-Tab
- Confirm visible focus rings on all interactive elements (Open-full button, Close button, JSON copy button)

---

### Group F — Phase 53: Peek Call-Site Expansion (4 items)

From STATE.md carry-forward (no HUMAN-UAT file).

**F-1: Resolved Cmd+click on live Blaze**
- On a resource detail page with reference links, Cmd+click a resolvable reference
- Confirm the Peek drawer opens with the resolved resource's JSON
- Confirm the resource renders correctly (not a blank drawer)

**F-2: Error state visual — unresolvable reference**
- Cmd+click a reference that cannot be resolved (e.g. a reference to a non-existent resource id)
- Confirm drawer shows monospace `referenceText` title and dimmed "Reference unresolvable" body
- Confirm Open-full button is hidden

**F-3: PatientList focus ring**
- On `/patients`, use keyboard Tab to focus patient rows
- Confirm visible indigo focus ring on focused row

**F-4: RelatedResourcesPanel async fetch via Cmd+click**
- On a resource with a `RelatedResourcesPanel` card, Cmd+click a card's reference
- Confirm the Peek drawer opens with the first matching resource fetched asynchronously

---

### Group G — Phase 54: 4-Mode Resource Shell (6 items)

Source: `.planning/phases/54-4-mode-resource-shell/54-HUMAN-UAT.md`

**G-1: Visual pill tab appearance**
- Open any resource detail page (e.g. `/explorer/Patient/{id}`)
- Confirm mode switcher renders as pill-style tabs — Summary/Human/Graph/JSON labels visible as distinct pill buttons (not underline-style tabs)

**G-2: Keyboard 1/2/3/4 mode switching**
- Press `1` → Summary mode activates, URL `?mode=` updates
- Press `2` → Human mode, `3` → Graph, `4` → JSON
- Click into a text input, then press keys — confirm shortcuts are inactive while input is focused

**G-3: Graph tab React Flow canvas rendering + compact prop**
- Switch to Graph tab (`3` or click)
- Confirm React Flow canvas loads with at least 1 node rendered
- Confirm no standalone "Reference graph" title or back button visible (compact=true suppresses them)

**G-4: Validation chip color rendering**
- Resource with 0 issues → teal chip "0 issues"
- Resource with validation issues → yellow chip "N issues"
- Unprofiled resource type → gray chip "Not validated"

**G-5: Download button saves file**
- On JSON mode tab, click the Download button
- Confirm file saved as `{resourceType}-{id}.json` containing valid JSON with correct `resourceType`/`id`

**G-6: Legacy `/graph` URL redirect**
- Navigate to `/explorer/Patient/{id}/graph`
- Confirm redirect to `/explorer/Patient/{id}?mode=graph` (no 404, graph tab active)

---

## Acceptance Criteria for Phase 58 Closure

Phase 58 closes when ALL items above are either:
- `PASS` — visual/behavior confirmed in real browser against live Blaze
- `WAIVED` — documented rationale that the item is superseded, out of scope, or data-unblockable (e.g. Phase 47 items remain WAIVED until seed data is available)

## Notes

- Phase 47 data-blocked items (Group B) can only be cleared after seeding Blaze with the required fixture resources. If not seeded during v1.8, these items should be WAIVEd with a note to revisit when real-world FHIR data (not Synthea) is connected.
- Phases 55, 56, 57 have zero deferred UAT items — all were verified programmatically.
- Phase 46 items were fully PASSED during the milestone v1.7 walkthrough — not in scope.
- Phase 48 UAT-01/02 were fully PASSED — not in scope.
- Phase 49 UAT-03/05/06/07 were fully PASSED — not in scope.
