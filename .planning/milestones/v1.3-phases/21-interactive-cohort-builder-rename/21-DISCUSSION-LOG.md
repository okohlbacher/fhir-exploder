# Phase 21: Interactive Cohort Builder + Rename - Discussion Log

> **Audit trail only.** Do not use as input to planning, research, or execution agents.
> Decisions are captured in CONTEXT.md — this log preserves the alternatives considered.

**Date:** 2026-04-15
**Phase:** 21-interactive-cohort-builder-rename
**Areas discussed:** Builder surface + activation UX
**Areas deferred to Claude's Discretion:** Save & activation model, Criterion semantics + composition, Rename strategy (CHRT-04)

---

## Gray Area Selection

| Area | Description | Selected |
|------|-------------|----------|
| Builder surface + activation UX | Page vs inline vs drawer; indicator placement; switching; default state | ✓ |
| Save & activation model | List vs single cohort; explicit save vs auto-persist | (deferred) |
| Criterion semantics + composition | AND/OR/configurable; patient-level vs resource-level scope | (deferred) |
| Rename strategy (CHRT-04) | Label-only vs storage-key migration vs visual grouping | (deferred) |

**User's choice:** Builder surface + activation UX

---

## Builder surface + activation UX

### Q1: Where does the interactive cohort builder live?

| Option | Description | Selected |
|--------|-------------|----------|
| Dedicated page /quality/cohorts (Recommended) | Separate page mirroring /quality/thresholds. Reached via a toolbar button on the dashboard. Keeps the dashboard toolbar uncluttered, matches an established pattern (ThresholdsPage), and gives the builder room to grow in Phase 22 (FHIRPath editor, FDPG import/export, management view). | ✓ |
| Inline expandable panel on /quality | A collapsible panel above or below the toolbar on the dashboard itself. Builder is always one click away; no navigation needed. Risks crowding the dashboard when expanded. | |
| Modal/drawer from dashboard button | Compact, task-focused overlay triggered by a 'Build cohort' button in the toolbar. Good for focused editing but offers less room than a page — and modals are a new pattern in this codebase. | |

**User's choice:** Dedicated page /quality/cohorts
**Notes:** Mirrors established `ThresholdsPage` pattern; Phase 22 additions (FHIRPath, FDPG, management) land on the same page.

---

### Q2: Where does the dashboard show which cohort is active (and let users switch)?

| Option | Description | Selected |
|--------|-------------|----------|
| Dropdown in the toolbar, beside 'Resource types' (Recommended) | Consistent with the existing control row (CohortSelector + SampleSizeControl at line 211 of QualityOverviewPage). 'Active cohort' Select with options = saved cohort names + 'No cohort (all patients)'. Always visible, no extra UI chrome. | ✓ |
| Banner below the page title | A dedicated 'Active cohort: Elderly Diabetics [edit] [change]' banner underneath the Title. More prominent — reinforces that analyses are scoped. | |
| Tag badge in the OverviewStrip | Small badge on the 4-card summary strip. Least obtrusive but easiest to miss when scoping is active. | |

**User's choice:** Dropdown in the toolbar, beside 'Resource types'
**Notes:** Peer control to "Resource types" — same visual weight, same toolbar row.

---

### Q3: How does a user switch the active cohort?

| Option | Description | Selected |
|--------|-------------|----------|
| Dropdown switcher (Recommended) | Pick from the saved-cohort list (names) plus a 'No cohort — all patients' option. Switching is instant; analyses recompute. Matches how 'Resource types' works today. | ✓ |
| Button to builder page, last-saved wins | No dashboard switcher. Opening the builder page shows the current active cohort; saving there reactivates. Simpler but slower to toggle — every switch is a round-trip to the builder. | |
| Radio toggle in the builder, read-only on dashboard | Dashboard shows the active cohort but doesn't let you change it; switching happens on the builder page. Enforces that the builder is the 'source of truth' for cohort state. | |

**User's choice:** Dropdown switcher
**Notes:** Includes "No cohort — all patients" entry for deactivation. Builder page is source-of-truth for *defining*; dashboard dropdown is source-of-truth for *activating*.

---

### Q4: What does /quality show when the user has no saved cohorts yet (or intentionally no active cohort)?

| Option | Description | Selected |
|--------|-------------|----------|
| Analyze all patients — cohort is opt-in (Recommended) | No cohort = current behavior (all patients, filtered only by 'Resource types'). A subtle 'No cohort active' label beside the switcher. Zero friction for users who don't need cohorts; matches how thresholds and sampleSize work today (sensible defaults, opt-in overrides). | ✓ |
| Prompt 'Define your first cohort' empty state | First-run empty-state card in the dashboard inviting users to build one, with a skip/dismiss option. More discoverable but nagging for users who don't want cohort scoping. | |
| Require a cohort before analysis runs | Dashboard shows no metrics until a cohort is active. Hard-gates the analysis pipeline behind cohort definition. Too aggressive given the feature is additive — only mentioning for completeness. | |

**User's choice:** Analyze all patients — cohort is opt-in
**Notes:** Zero regression path; matches existing "sensible defaults, opt-in overrides" philosophy.

---

## Claude's Discretion

User opted to let downstream agents (researcher, planner) decide the following, with directional guidance captured in CONTEXT.md:

- **Save & activation model** — guidance: named cohort list with explicit "Save as…" name prompt; storage shape must support stable IDs for Phase 22 edit/duplicate/delete.
- **Criterion semantics + composition** — guidance: AND composition (intersection), patient-level scoping (cohort = set of Patient resources), condition code = "patients with a `Condition` matching this code/system".
- **Rename strategy (CHRT-04)** — guidance: label rename + localStorage key migration (`quality.cohort.v1` → `quality.resourceTypes.v1`) with read-side one-time migration; consider renaming the component file too.
- **Scoping mechanism (panel pipeline)** — guidance: resolve cohort → patient ID set once at activation, pass `patientIds?: string[]` into each panel; panels add `patient=` (or `subject=`) filter.

## Deferred Ideas

- Phase 22 scope (FHIRPath CHRT-05, FDPG CHRT-06, management view CHRT-07).
- Condition-code autocomplete via MII Terminology Server — opt-in future improvement if criterion input UX proves awkward.
- Trend comparability story across the rename boundary — planner concern.
