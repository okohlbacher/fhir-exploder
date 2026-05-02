---
phase: 51-v17-gap-closure-summary-util-graph-context
plan: 1
subsystem: patient-timeline
tags: [refactor, gap-closure, NAV-02, summarizeResource]
requirements:
  - NAV-02
gap_closure: true
dependency_graph:
  requires:
    - "src/utils/summarizeResource.ts (Phase 46 / NAV-01 foundation)"
    - "src/utils/fhir-helpers.ts (getCodeDisplay, toRecord)"
  provides:
    - "Canonical summary path for both PatientTimeline (horizontal ribbon) and ClinicalTimeline (vertical column) — every list/card surface in the app now consumes summarizeResource(r).primary"
  affects:
    - "src/components/patients/PatientTimeline.tsx"
    - "src/components/patients/ClinicalTimeline.tsx"
    - "src/utils/timeline-utils.ts"
    - "src/__tests__/clinical-timeline.test.tsx"
tech_stack:
  added: []
  patterns:
    - "Canonical summary util replacing inline switches — one symbol (summarizeResource) supplants two divergent extractSummary implementations"
key_files:
  created: []
  modified:
    - "src/components/patients/PatientTimeline.tsx (-25 / +2 net; removed local extractSummary, added summarizeResource import + call site)"
    - "src/components/patients/ClinicalTimeline.tsx (-2 / +2; swapped extractSummary import for summarizeResource)"
    - "src/utils/timeline-utils.ts (-38 / +0; deleted extractSummary export entirely — option A from PLAN.md, makes divergence physically impossible)"
    - "src/__tests__/clinical-timeline.test.tsx (+25 / -13; renamed describe block, migrated 6 calls + 1 new GAP-1-locking test, fixture+assertion updates for canonical contract)"
decisions:
  - "Option A (full removal) chosen over option B (thin re-export) for timeline-utils.ts extractSummary — removing the symbol prevents future re-introduction of a divergent inline implementation."
  - "Condition no-code test (line 154) assertion changed from 'Condition' → '' to match canonical summarizeCondition() returning getCodeDisplay(c.code) which is '' for missing code (NOT a hardcoded resourceType fallback). Visible delta in real data: a Condition with no code now shows '' instead of 'Condition' as fallback string. Per UI-SPEC §'Copywriting Contract' this is the locked NAV-02 outcome."
  - "Consent unknown-type test (line 181) fixture gains id='consent-42'; assertion becomes 'consent-42' to match the canonical summarizeGeneric() walker step 7 (id last-resort). Legacy extractSummary returned the bare 'Consent' resourceType string; the canonical walker is richer (returns id when no other field hits)."
metrics:
  duration: "~7 minutes (plan start 19:18:20Z → plan end 19:24:54Z)"
  completed_date: "2026-05-02"
  tasks_completed: 2
  commits: 3
  files_changed: 4
  net_lines: "+29 / -79 = -50 net source lines"
---

# Phase 51 Plan 1: GAP-1 closure — PatientTimeline + ClinicalTimeline → summarizeResource Summary

**One-liner:** Replaced two divergent inline `extractSummary` implementations (PatientTimeline.tsx local function + timeline-utils.ts exported function) with calls to the canonical `summarizeResource(r).primary` from Phase 46, locking NAV-02 to its full intent — every list/card surface in the app now emits the same summary text for the same resource.

## What Shipped

### 1. PatientTimeline.tsx migration (commit `395d8fb`)
- Deleted local `extractSummary` function (23 lines including JSDoc + body) at lines 74-96.
- Added import: `import { summarizeResource } from '../../utils/summarizeResource';`
- Replaced single call site `summary: extractSummary(resource)` → `summary: summarizeResource(resource).primary` (line 112 post-delete).
- `toRecord` import retained — still consumed by `extractDate` (line 60).
- Visual chrome (icons, ScrollArea, UnstyledButton, Tooltip, Stack, Group, Box, Badge, Title) byte-identical.
- Diff stat: 2 insertions / 25 deletions.

### 2. Test re-point (commit `22483ff`)
- Renamed `describe('extractSummary', ...)` block to `describe('summarizeResource(timeline-context).primary', ...)`.
- Migrated 6 existing test bodies from `extractSummary(x)` → `summarizeResource(x).primary`.
- Updated Condition no-code test: assertion `'Condition'` → `''` (canonical contract — `getCodeDisplay` returns empty string for missing CodeableConcept, not a hardcoded resourceType fallback).
- Updated Consent unknown-type test: fixture `id: 'consent-42'`; assertion `'Consent'` → `'consent-42'` (generic walker step 7 returns `id` last-resort).
- **Added 1 new GAP-1-locking test** (line 189): "Encounter — class.display wins over type[0].text (canonical order; GAP-1 fix)" — proves `summarizeResource({class: {display: 'Ambulant'}, type: [{text: 'Other Type'}]}).primary === 'Ambulant'`. This is the structural assertion that GAP-1 stays closed.
- Replaced `extractSummary` import with `summarizeResource` from the canonical module path.

### 3. Source migration (commit `4d25ebc`)
- **`src/utils/timeline-utils.ts`** — Removed `extractSummary` export entirely (38 lines including JSDoc + body, lines 81-118 of pre-edit file). Type imports (`Condition`, `Encounter`, `Observation`, `Period`, `Procedure`, `Resource`) retained because `extractDate` still consumes them. Final exports: `TimelineData` interface + `extractDate` + `formatTimelineDate`.
- **`src/components/patients/ClinicalTimeline.tsx`** — Updated import block on lines 12-17: removed `extractSummary` from the timeline-utils destructure; added new import line `import { summarizeResource } from '../../utils/summarizeResource';`. Replaced call site on line 99: `summary: extractSummary(resource)` → `summary: summarizeResource(resource).primary`. Everything else (MII module resolution, sort, loading/error/empty branches, TimelineEntry render) byte-identical.

## NAV-02 Traceability

This plan closes **GAP-1** from `.planning/v1.7-MILESTONE-AUDIT.md`. Pre-Phase-51, three call sites consumed three different summary strings for the same resource:

- `SearchResultsPage.tsx`, `FhirResourcesView.tsx`, `MiiModuleTab.tsx` — already migrated in Phase 46 to `summarizeResource(r).primary` (NAV-02 partial).
- `PatientTimeline.tsx` — used local `extractSummary` (CodeableConcept-walker prioritising `code → type → category → class`).
- `ClinicalTimeline.tsx` — used `timeline-utils.ts extractSummary` (per-resource-type switch with field-priority `code.text → coding.display → resourceType` for Condition; `type[0].text → coding.display → class.display → 'Encounter'` for Encounter).

Post-Phase-51, all five sites consume `summarizeResource(r).primary` exclusively. NAV-02 (audit reference: "summarize util used everywhere") now satisfied at the source-text level.

**Behavioral delta — Encounter labels** (the visible NAV-02 effect):
- Legacy ClinicalTimeline: `e.type?.[0]?.text ?? e.type?.[0]?.coding?.[0]?.display ?? e.class?.display ?? 'Encounter'`
- Canonical (post-refactor): `e.class?.display ?? getCodeDisplay(e.type?.[0])` (which walks `text → coding[0].display → coding[0].code → ''`)

For an Encounter with `class: {display: 'Ambulant'}` AND `type: [{text: 'Other Type'}]`:
- Before: `'Other Type'` (type wins)
- After: `'Ambulant'` (class.display wins)

Locked by the new test on line 189 (`Encounter — class.display wins over type[0].text`).

## Test Counts

| Suite | Before | After | Delta |
| --- | --- | --- | --- |
| `src/__tests__/clinical-timeline.test.tsx` | 19 | 20 | +1 (new GAP-1 lock test) |
| `src/components/patients/__tests__/ClinicalTimeline.test.tsx` | 3 | 3 | 0 (unchanged — code.text path still wins for Condition + Procedure) |
| Full suite | 1386 (pre-Phase-51 baseline) | 1387 | +1 |

Full-suite tally: **1387 passing / 22 todo / 1 failing** (pre-existing Phase-40 deuteranopia pair #13 carry-over — NOT a regression; confirmed by stashing Phase 51 changes and re-running on the pristine `3d6f413` baseline). `tsc -b --noEmit` exit 0; `npm run build` clean (476ms).

## Verification Checks (from plan)

| # | Check | Result |
| --- | --- | --- |
| 1 | `npx tsc -b --noEmit` exits 0 | PASS |
| 2 | Full vitest run reports zero NEW test failures | PASS (1 pre-existing failure carry-over from Phase 40) |
| 3 | `npm run build` completes cleanly with `dist/` bundle | PASS |
| 4 | `grep -rEn "function extractSummary\|export function extractSummary\|export const extractSummary" src/components src/utils` returns 0 | PASS (0 matches) |
| 5 | `grep -rn "summarizeResource" src/components/patients/PatientTimeline.tsx src/components/patients/ClinicalTimeline.tsx \| wc -l` returns ≥ 4 | PASS (4 matches: 1 import + 1 call per file × 2 files) |

## Success Criteria (from plan)

1. PatientTimeline.tsx contains zero `extractSummary` definitions; consumes `summarizeResource(r).primary` exclusively. **PASS**
2. timeline-utils.ts no longer exports `extractSummary` (option A: full removal). **PASS**
3. ClinicalTimeline.tsx imports `summarizeResource` directly. **PASS**
4. `clinical-timeline.test.tsx` updated; describe block renamed; new GAP-1 lock test added. **PASS**
5. Full Vitest suite + `tsc -b --noEmit` + `npm run build` all clean (no NEW regressions vs. post-Phase-49 baseline). **PASS**
6. Visual chrome byte-identical (no new JSX primitives, no new copy, no new icons, no new style props). **PASS** (`git diff src/components/patients/PatientTimeline.tsx | grep -E "^\+.*<(Text|Title|Tooltip|Card|Paper|Button|Alert)\b"` returns 0; same check on ClinicalTimeline.tsx returns 0).

## Deviations from Plan

None — plan executed exactly as written.

The plan's "concrete replacement for the Consent test" (lines 277-285) was followed verbatim, and the Condition no-code-text test was updated per the plan's explicit guidance ("change the expectation to match the new contract"). One minor copy adjustment: the Encounter-with-only-class.code test description was clarified from `'returns type[0].text for Encounter'` to `'returns type[0].text for Encounter (when class.display is absent)'` to make the canonical fallback path explicit — pure documentation, no behavior change.

## Deferred Issues

- **Phase 40 deuteranopia pair #13 (`kardiologie ↔ mikrobiologie`)** — pre-existing test failure, NOT a regression introduced by Phase 51. Documented across Phase 41/42/43/44/46/48/49 SUMMARY.md files as a known carry-over. Out of scope per Rule 3 (scope boundary): the deuteranopia palette adjustment is a separate v1.6+ candidate already on the deferred-items track for headless Brettel/Machado simulation.

## Threat Flags

None — Phase 51 is a refactor with zero new attack surface. The threat model in `51-01-PLAN.md` (T-51-01-01..04) all carried `accept` dispositions, and the post-refactor code path is strictly narrower (one symbol replaces two — the `summarizeResource` registry was already audited in Phase 46).

## Commits

| Hash | Type | Subject |
| --- | --- | --- |
| `395d8fb` | refactor | Migrate PatientTimeline.tsx to summarizeResource (Task 1) |
| `22483ff` | test | Re-point clinical-timeline tests to summarizeResource (Task 2 / TDD test phase) |
| `4d25ebc` | refactor | Drop divergent extractSummary; ClinicalTimeline → summarizeResource (Task 2 / TDD source phase) |

## Self-Check: PASSED

- File `src/components/patients/PatientTimeline.tsx` exists (modified): FOUND
- File `src/components/patients/ClinicalTimeline.tsx` exists (modified): FOUND
- File `src/utils/timeline-utils.ts` exists (modified): FOUND
- File `src/__tests__/clinical-timeline.test.tsx` exists (modified): FOUND
- Commit `395d8fb`: FOUND
- Commit `22483ff`: FOUND
- Commit `4d25ebc`: FOUND
