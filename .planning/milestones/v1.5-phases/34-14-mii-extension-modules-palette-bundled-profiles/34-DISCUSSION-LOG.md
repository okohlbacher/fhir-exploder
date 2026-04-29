# Phase 34: 14 MII Extension Modules + Palette + Bundled Profiles - Discussion Log

> **Audit trail only.** Do not use as input to planning, research, or execution agents.
> Decisions are captured in CONTEXT.md — this log preserves the alternatives considered.

**Date:** 2026-04-24
**Phase:** 34-14-mii-extension-modules-palette-bundled-profiles
**Mode:** `--auto` (recommended option auto-selected for every area)
**Areas discussed:** Module Ordering, Per-Module Spec Research, Color Palette, Icons, Profile Fetching, Attribution + Licensing, Empty-State UX, Integration with Phase 33, Performance Gates, Test Strategy, Commit Cadence

---

## Module Ordering

| Option | Description | Selected |
|--------|-------------|----------|
| Alphabetical by German label | Deterministic, matches MII IG index ordering | ✓ |
| Grouped by color-family (per D-05) | Highlights palette clusters in the UI | |
| Clinical workflow (like base 7 Person→Fall→Diagnose chain) | No dominant workflow axis for extensions | |

**Auto-selected:** Alphabetical by German label (recommended default — predictable, deterministic, matches IG convention).

---

## Per-Module Spec Research Location

| Option | Description | Selected |
|--------|-------------|----------|
| `.planning/research/color-design-audit.md` | Single consolidated audit (ROADMAP-locked path) | ✓ |
| Per-module files under `.planning/research/modules/*.md` | Finer-grained; harder to cross-compare | |
| Inline JSDoc in `mii-modules.ts` | Ships with the code but muddies the data file | |

**Auto-selected:** Consolidated audit doc (ROADMAP success criterion #1 locks this path).

---

## Color Palette — Custom vs Stock Mantine

| Option | Description | Selected |
|--------|-------------|----------|
| 7 custom `MantineColorsTuple`s (ROADMAP-named) | Enables palette families for clinical grouping | ✓ |
| Reuse Mantine stock colors (lime, grape, yellow, etc.) | Minimal change but only 14 colors total in Mantine — 21 modules won't fit cleanly | |
| Shape/icon differentiation only (no color families) | Less information density in the UI | |

**Auto-selected:** 7 custom palettes (ROADMAP success criterion #2 locks the names + approach).

---

## 14 Modules → 7 Palettes Mapping

| Option | Description | Selected |
|--------|-------------|----------|
| Clinical-semantic grouping (oncology=Onkologie+MTB, etc.) | Principle-locked here; final pairs in audit | ✓ |
| Alphabetical slotting | Breaks semantic grouping; harder to remember | |
| By MII IG version release order | Arbitrary; no user-facing benefit | |

**Auto-selected:** Clinical-semantic grouping (recommended default — principle locked in D-05, final pair assignments deferred to palette audit).

---

## Icon Rendering Locations

| Option | Description | Selected |
|--------|-------------|----------|
| Timeline dots + Tab subtitle + Dashboard tile swatch (+ Drawer) | Maximum legibility; ROADMAP criterion #3 locks first three | ✓ |
| Timeline dots only | Too sparse — extension tabs look identical | |
| Tab subtitle only | Loses Timeline entry discrimination | |

**Auto-selected:** All four sites (ROADMAP criterion #3 locks three; Drawer addition is zero-cost scope add).

---

## Profile Fetch Script Failure Mode

| Option | Description | Selected |
|--------|-------------|----------|
| Warn and continue (exit 0) | Offline installs still pass; falls back to committed JSON | ✓ |
| Fail hard (exit 1) | CI/dev loop breaks on transient network issues | |
| Retry N times with backoff | Over-engineering for a one-time prepare step | |

**Auto-selected:** Warn-and-continue (ROADMAP criterion #4 explicitly locks this).

---

## Profile JSON Commit Policy

| Option | Description | Selected |
|--------|-------------|----------|
| Commit fetched JSON + `.gitattributes linguist-generated=true` | Offline-resilient; reviewable diffs; GitHub-diff-suppressed | ✓ |
| `.gitignore` the profiles; always fetch | Fresh clones fail without network | |
| CI-only regen (release artifact) | Adds release complexity for a local-first app | |

**Auto-selected:** Commit + generated-marker (recommended default for local-first).

---

## Pre-GA Package UI Surfacing

| Option | Description | Selected |
|--------|-------------|----------|
| No badge — silent bundling with console.info | ROADMAP explicit ("bundled as-latest-available") | ✓ |
| "Beta" badge on Kardiologie + Symptom tabs | Scope creep; re-propose for v1.6+ | |
| Block pre-GA entirely (skip module) | Loses planned MII IG coverage | |

**Auto-selected:** No badge (ROADMAP success criterion #4 locks silent bundling).

---

## Empty-State Default Visibility

| Option | Description | Selected |
|--------|-------------|----------|
| Visible at 0.55 opacity + "Hide N empty modules" toggle | ROADMAP-locked | ✓ |
| Hidden by default + "Show N empty modules" toggle | User-unfriendly — patient-context discovery cost | |
| Auto-hide only multi-empty modules | Heuristic-heavy; unpredictable | |

**Auto-selected:** Visible at 0.55 opacity (ROADMAP criterion #6 locks this).

---

## Empty-State Persistence Scope

| Option | Description | Selected |
|--------|-------------|----------|
| Per-patient (`Record<patientId, boolean>`) | ROADMAP-locked key `patients.hideEmptyExtensions.v1` | ✓ |
| Global (single boolean) | Conflicts with per-patient clinical workflows | |
| Session-only | Loses state across tabs/refreshes | |

**Auto-selected:** Per-patient (ROADMAP criterion #6 locks key + scope).

---

## "Empty" Definition for Multi-Type Modules

| Option | Description | Selected |
|--------|-------------|----------|
| Zero resources across ALL listed fhirResourceTypes | Matches user expectation; computationally free | ✓ |
| Zero on primary (first) type only | Hides modules with non-primary data (misleading) | |
| Configurable per module | Over-engineering; no user request | |

**Auto-selected:** All-types (recommended default — matches D-17 paired with Phase 33 fan-out semantics).

---

## Commit Cadence Plan Decomposition

| Option | Description | Selected |
|--------|-------------|----------|
| 6 plans (research → theme → fetch → data → empty-state → UAT) | Mirrors Phase 33's 7-plan cadence; green between each | ✓ |
| 3 plans (research → code → UAT) | Too coarse; schema + data + UI in one plan is a review blob | |
| Per-requirement (MII-EXT-09..14, one plan each) | Breaks the helpers-first principle for the empty-state UX | |

**Auto-selected:** 6-plan decomposition (D-25 recommended; final plan boundaries at planner's discretion per D-26 footnote).

---

## Claude's Discretion

- Final icon-per-module picks (principle locked D-08; final in audit)
- Exact empty-state copy wording (placeholder locked D-18)
- Plan 34-02 vs 34-04 icon-assignment boundary (D-26 notes either is acceptable)
- 14 modules ↔ 7 palette-family exact pairing if WCAG audit finds a failure (D-05 principle locked; pairs may shuffle within families)

## Deferred Ideas

- Pre-GA UI badge (D-02 reject → v1.6+)
- Automated deuteranopia tooling (D-09 reject → manual DevTools)
- Full profile snapshots (out of scope per Phase 5 Pitfall 7)
- Per-type quality matrix palette consumption (Phase 35 UAT-FU-05)
- Cohort-scoped empty-state (out of scope)
