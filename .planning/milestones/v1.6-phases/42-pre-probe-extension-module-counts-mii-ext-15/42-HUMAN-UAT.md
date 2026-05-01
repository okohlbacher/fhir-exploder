---
phase: 42
slug: 42-pre-probe-extension-module-counts-mii-ext-15
status: scaffolded
created: 2026-04-29
covers: [MII-EXT-15-UAT]
roadmap_success_criterion: "ROADMAP §42 SC #4 — Live-Blaze UAT confirms counts appear on at least 3 extension tabs against a real Synthea patient (e.g. an Onkologie patient with >=1 extension hit)."
---

# Phase 42 — Human UAT (Live Blaze)

> Manual smoke test against a running Blaze + Synthea cohort. Run AFTER 42-02 Task 1 lands. Record results inline; do NOT split into a separate VERIFICATION.md.

## Prerequisites

- [ ] Blaze running locally (or reachable via `settings.yaml` URL).
- [ ] Synthea cohort loaded with at least one Synthea Onkologie patient (≥1 Condition + ≥1 Observation tagged with the Onkologie profile or extension).
- [ ] `npm run dev` running and reachable in a browser.
- [ ] Browser DevTools Network tab open to observe `_summary=count` GETs.
- [ ] FHIR Exploder built from a HEAD that contains commits for 42-01 + 42-02 Task 1 (Phase 42 wave 1 + wave 2 GREEN).

## Test Cases

### UAT-1 — ≥3 extension tabs show non-zero counts (MII-EXT-15-UAT, ROADMAP §42 SC #4)

Steps:

1. Navigate to `/patients/{id}` for the Onkologie test patient.
2. Wait ~2s for the pre-probe to resolve (slower on remote Blaze).
3. Expand the "Extension modules" Collapse.
4. Count extension tabs whose label includes a parenthesized integer >0.

Expected:

- ≥3 extension tabs render `{germanLabel} (N)` with N>0 (e.g. `Onkologie (12)`, `Pathologie (3)`, `Symptom (8)`).
- Network tab shows ≤14 simultaneous `_summary=count&_count=0` GETs in parallel waves.
- The "Hide N empty modules" toggle reads the correct N (= count of zero-count extension tabs) BEFORE any tab click.

**Pass/Fail:** _________________

**Observed counts:** _________________

**Notes:** _________________

### UAT-2 — Zero-count tabs visibly dimmed (D-06 + Pitfall #5)

Steps:

1. Identify a 0-count extension tab (e.g. `MTB (0)` or `PRO (0)` on a non-MTB patient).
2. Visually confirm the tab pill is rendered at reduced opacity (~55%).
3. Click into the dimmed tab.
4. Visually confirm the active-tab indicator (pill background fill) is fully visible — the click feels responsive, NOT "stuck".

Expected:

- Pre-click: dimmed at 0.55 opacity.
- Post-click: active indicator fully visible (full-opacity background fill).
- The label text inside the active pill remains dimmed (because opacity is on the inner content, not the outer Tab).

**Pass/Fail:** _________________

**Notes:** _________________

### UAT-3 — Pre-probe feeds Phase 34 toggle accurately (MII-EXT-15-E visual)

Steps:

1. Navigate to a patient with mixed empty/non-empty extension modules.
2. Immediately (BEFORE clicking any extension tab) expand the Collapse.
3. Read the "Hide N empty modules" toggle text.
4. Mentally verify N matches the count of dimmed/zero-count tabs visible in the Collapse.

Expected:

- N is accurate on patient mount with no clicks needed.
- Pre-Phase-42 baseline: in v1.5 this would have read "Hide 0 empty modules" (or been hidden entirely) until each empty extension tab was visited individually.

**Pass/Fail:** _________________

**Observed N:** _________________

**Notes:** _________________

### UAT-4 — Cancellation on rapid patient navigation (MII-EXT-15-H visual)

Steps:

1. Navigate to Patient A (Onkologie).
2. Immediately (within 1 second, BEFORE Patient A pre-probe resolves) navigate to Patient B (different patient).
3. Wait for Patient B pre-probe to resolve.
4. Visually confirm Patient B tab counts are correct (no Patient A bleed-through).

Expected:

- Patient B counts are accurate.
- No flash of Patient A counts on Patient B tabs.
- DevTools Network tab MAY show some Patient A requests still completing (cancelled-flag guards setState; does not abort the underlying fetch — documented discretion choice).

**Pass/Fail:** _________________

**Notes:** _________________

## Sign-Off

- [ ] All 4 UAT cases pass.
- [ ] No console errors during the walk.
- [ ] No Mantine / React warnings introduced.

**Tester:** _________________

**Date:** _________________

**Blaze instance:** _________________

**Patient ID(s) used:** _________________

## Status

`status: scaffolded` — flip to `status: passed` when all 4 cases checked off, OR `status: failed` with a gap analysis if any case fails.
