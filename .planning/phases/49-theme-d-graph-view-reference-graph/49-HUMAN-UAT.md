---
phase: 49
slug: theme-d-graph-view-reference-graph
status: pending
requires_live_blaze: true
requires_chrome_devtools: true
created: 2026-05-01
items:
  - id: UAT-01
    title: "Pan / zoom feel on real Synthea data"
  - id: UAT-02
    title: "Minimap interaction (drag minimap to navigate)"
  - id: UAT-03
    title: "Dark-mode visual fidelity"
  - id: UAT-04
    title: "Slow-3G loading skeleton appearance"
  - id: UAT-05
    title: "Empty-graph alert message readability"
  - id: UAT-06
    title: "Truncation alert at 150 nodes"
  - id: UAT-07
    title: "Browser back/forward respects history"
---

# Phase 49 — Live-Blaze HUMAN-UAT Walkthrough

> Manual verification scaffold per `49-VALIDATION.md` §"Manual-Only Verifications"
> (7 rows). Each item below has automated coverage as far as possible; the
> manual leg is the visual / tactile check that automation cannot run inside
> vitest. Run AFTER `/gsd-verify-work` returns clean on the automated tests.
>
> Pre-requisites:
>   - Local Blaze running at `localhost:8080` with Synthea-style sample data.
>   - At least one Patient resource with ≥6 references (most Synthea Patients
>     qualify — Encounters, Conditions, Observations, etc.).
>   - Optional: a Provenance resource (or a Practitioner with no incoming
>     refs) for the empty-graph alert.

## UAT-01 — Pan / zoom feel on real Synthea data

**Requirement:** GRPH-04
**Why manual:** Tactile UX (drag inertia, zoom snap) cannot be RTL-asserted.

**Expected:** Smooth canvas drag in all 4 directions; scroll-wheel zoom centered on cursor; no edge label overlaps node bounds at 100 % zoom.

**Steps:**
1. Open `/explorer/Patient/{Synthea-id}/graph` against local Blaze.
2. Drag the canvas in 4 directions — verify smooth pan, no jitter.
3. Scroll-wheel zoom in / out — verify zoom-to-cursor centering.
4. Verify NO edge label text overlaps any node bounding box at 100 % zoom.

**Result:** [pending]

## UAT-02 — Minimap interaction

**Requirement:** GRPH-04
**Why manual:** Spatial coordination test; RTL doesn't simulate canvas-drag well.

**Expected:** Click-drag on minimap viewport rectangle pans the main canvas; single click on minimap centers canvas on click point.

**Steps:**
1. From the same view, click-drag the minimap viewport rectangle — confirm main canvas pans to match.
2. Click in the minimap (single click, NOT drag) — confirm canvas centers on that point.

**Result:** [pending]

## UAT-03 — Dark-mode visual fidelity

**Requirement:** GRPH-04
**Why manual:** Color contrast, edge stroke, label readability in dark mode is a perceptual judgment.

**Expected:** Node text readable; edges visible (gray-6 stroke); minimap mini-nodes themed; controls themed; theme re-toggle does NOT remount the canvas (no flicker / reload).

**Steps:**
1. Toggle Mantine color scheme to dark via DevTools (set `<html data-mantine-color-scheme="dark">`) OR via the project's Mantine theme switcher (when one ships).
2. Visually inspect: node text readable, edges visible (gray-6 stroke), minimap mini-nodes themed, controls themed.
3. Trigger `setColorScheme('light')` again — confirm graph re-themes WITHOUT remount (the canvas should NOT flicker / reload).

**Result:** [pending]

## UAT-04 — Slow-3G loading skeleton appearance

**Requirement:** GRPH-01 / D-12
**Why manual:** Network-throttling visualization not exercised by RTL fast mocks.

**Expected:** Mantine `<Skeleton>` placeholders (4 cards in a 2×2 grid) appear during BFS fetch; populated graph fades in once fetches resolve.

**Steps:**
1. Chrome DevTools → Network tab → Slow 3G profile.
2. Hard-refresh `/explorer/Patient/{id}/graph`.
3. Confirm Mantine `<Skeleton>` placeholders (4 cards in 2×2 grid) appear during BFS fetch.
4. Confirm populated graph fades in once fetches resolve.

**Result:** [pending]

## UAT-05 — Empty-graph alert message readability

**Requirement:** D-13
**Why manual:** Layout / wording assessment.

**Expected:** Root node renders alone in canvas; Alert below canvas — gray, info icon, title `No references at depth 1`, body matches UI-SPEC §"Copywriting Contract" verbatim.

**Steps:**
1. Navigate to a Provenance resource (or another resource with no incoming + no outgoing references).
2. Confirm root node renders alone in canvas.
3. Confirm Alert below canvas: gray, info icon, title `No references at depth 1`, body matches UI-SPEC §"Copywriting Contract" verbatim.

**Result:** [pending]

## UAT-06 — Truncation alert at 150 nodes

**Requirement:** D-08
**Why manual:** Requires real fan-out scenario; synthetic test asserts the flag, not the user-facing UI.

**Expected:** Alert — yellow, alert-triangle icon, title `Showing 150 of {totalEstimate}+ nodes`, body matches UI-SPEC §"Copywriting Contract" verbatim.

**Steps:**
1. On a Patient with > 150 referencing resources (Synthea Patients with many Observations qualify), open the graph.
2. Confirm Alert: yellow, alert-triangle icon, title `Showing 150 of {totalEstimate}+ nodes`, body matches UI-SPEC §"Copywriting Contract" verbatim.

**Result:** [pending]

## UAT-07 — Browser back/forward respects history

**Requirement:** D-16
**Why manual:** Routing test that's awkward in RTL (jsdom URL handling).

**Expected:** Browser back from `/explorer/Encounter/xyz` returns to `/explorer/Patient/abc/graph` (the GRAPH view, not the resource detail). Browser forward re-navigates to `/explorer/Encounter/xyz`.

**Steps:**
1. From `/explorer/Patient/abc/graph` click an Encounter node — should navigate to `/explorer/Encounter/xyz`.
2. Press browser back — should return to `/explorer/Patient/abc/graph` (the GRAPH view), NOT to the resource detail.
3. Press browser forward — should re-navigate to `/explorer/Encounter/xyz`.

**Result:** [pending]

---

## Sign-Off

- [ ] UAT-01 — Pan / zoom feel on real Synthea data
- [ ] UAT-02 — Minimap interaction
- [ ] UAT-03 — Dark-mode visual fidelity
- [ ] UAT-04 — Slow-3G loading skeleton appearance
- [ ] UAT-05 — Empty-graph alert message readability
- [ ] UAT-06 — Truncation alert at 150 nodes
- [ ] UAT-07 — Browser back/forward respects history
- [ ] All 7 items PASS.
- [ ] Any FAIL items have GitHub issues / TODO entries logged.
- [ ] Phase 49 closes `validated` (all PASS) or `human_needed` (some PASS / some pending) at `/gsd-transition`.
