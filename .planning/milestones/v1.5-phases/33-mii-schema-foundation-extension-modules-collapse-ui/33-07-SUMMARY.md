---
phase: 33-mii-schema-foundation-extension-modules-collapse-ui
plan: 07
subsystem: mii-kerndatensatz
tags: [mii, fhir, verification, regression-test, timeline, mii-ext-08, phase-33-close]

# Dependency graph
requires:
  - phase: 33-mii-schema-foundation-extension-modules-collapse-ui
    plan: 02
    provides: "ClinicalTimeline.tsx:85-86 migration from MII_MODULES.find(=== comparison) to findModuleForType — plan 33-07 VERIFIES this survived downstream refactors"
  - phase: 33-mii-schema-foundation-extension-modules-collapse-ui
    plan: 03
    provides: "Widened MiiModule schema with category: 'base' | 'extension' — enables multi-type fixture tests with extension-category stubs"
provides:
  - "Grep-verified plan 33-02 migration intact: 0 MII_MODULES.find(=== ...) survivors in ClinicalTimeline.tsx; findModuleForType present at line 85-86 D-15 site"
  - "3 new helper-level regression tests in src/__tests__/mii-modules.test.ts: multi-type same-germanLabel, multi-type same-badgeColor (D-15), shadow-guard for base module lookup under prepended extension stub"
  - "3 new render-level regression tests in src/components/patients/__tests__/ClinicalTimeline.test.tsx: Condition → Diagnose, Procedure → Prozedur, empty-bundle no-crash guard"
  - "End-to-end chain covered: searchResources → extractDate/extractSummary → findModuleForType(resource.resourceType, MII_MODULES) → TimelineEntry rendering"
affects:
  - "34 (14 MII extension modules) — multi-type shadow-guard test prevents Phase 34 module ordering regressions from masking base module lookups in the timeline chain; Bildgebung-shaped ['ImagingStudy', 'DiagnosticReport'] resolution locked as the canonical multi-type contract"

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Helper-level regression test with MULTI_TYPE_FIXTURE prepended to real MII_MODULES — proves findModuleForType resolves multi-type entries AND shadow-guards base module lookups under prepended stubs"
    - "Render-level regression test using real MII_MODULES (no helper-level mocking) — jsdom ResizeObserver + matchMedia polyfills, vi.mock on react-router-dom + @medplum/react-hooks, per-test makeClient(resourcesByType) stub with vi.fn searchResources"
    - "Grep-based verification gate: `grep -n 'MII_MODULES\\.find|m\\.fhirResourceType\\s*===' src/components/patients/ClinicalTimeline.tsx` returns 0 matches — locks the plan 33-02 migration against silent regressions"

key-files:
  created:
    - "src/components/patients/__tests__/ClinicalTimeline.test.tsx (+187 lines — 3 render regression tests + jsdom polyfills + hoisted mocks)"
  modified:
    - "src/__tests__/mii-modules.test.ts (+42 lines — 3 new helper regression tests inside new `findModuleForType with multi-type module (MII-EXT-08 timeline regression)` describe block)"

key-decisions:
  - "Render-level test uses REAL MII_MODULES (not a stub) because ClinicalTimeline reads MII_MODULES directly (no prop injection). Proving the Condition→Diagnose / Procedure→Prozedur chain against the production config is exactly the regression we want to lock — a stub would not catch a production MII_MODULES ordering bug in Phase 34."
  - "Helper-level MULTI_TYPE_FIXTURE is built as `[stub, ...MII_MODULES]` (prepended) — this matches the shadow-guard intent: if Phase 34's extension stubs are prepended during iteration, the `Array.prototype.find` short-circuit must not mask base module lookups. Appending would not exercise the shadow-guard code path."
  - "Third ClinicalTimeline test is defensive (empty-state no-crash) rather than testing the 'gray' fallback directly — because all 4 TIMELINE_RESOURCE_TYPES = ['Encounter', 'Condition', 'Procedure', 'Observation'] map to base MII modules, the fallback-color path is not reachable from the component's own fetches. Documenting this in a test prevents a future contributor from mistakenly adding a fallback-color assertion that would be untestable end-to-end."
  - "Used bare `findByText` + `.toBeTruthy()` instead of `.toBeInTheDocument()` because this repo does not configure `@testing-library/jest-dom` matchers (verified by failing initial run). `findByText` throws on miss, so presence is asserted implicitly by the absence of a thrown error; `toBeTruthy()` on the returned HTMLElement provides a strong assertion that serves the same purpose without the missing matcher."

requirements-completed: [MII-EXT-08]

# Metrics
duration: ~3 min
completed: 2026-04-24
---

# Phase 33 Plan 07: MII-EXT-08 Timeline Verification + Regression Tests Summary

**Plan 33-07 fulfills its D-20 verification-only role: grep confirms plan 33-02's ClinicalTimeline migration from `MII_MODULES.find(=== comparison)` to `findModuleForType` survived wave 2-6 refactors (0 survivors); 3 new helper-level regression tests in `mii-modules.test.ts` lock multi-type germanLabel + badgeColor resolution and shadow-guard base module lookup under prepended extension stubs; 3 new render-level regression tests in a new `ClinicalTimeline.test.tsx` lock the end-to-end chain (searchResources → findModuleForType → TimelineEntry) with Condition→Diagnose (teal) and Procedure→Prozedur (violet). No production code changes — this plan only adds tests. Phase 33 (MII schema foundation + extension-modules collapse UI) closes with all 8 MII-EXT-* requirements satisfied.**

## Performance

- **Duration:** ~3 min (2 commits from 11:27:48Z → 11:31:00Z)
- **Started:** 2026-04-24T11:27:48Z
- **Completed:** 2026-04-24T11:31:00Z
- **Tasks:** 2 (Task 1 helper regression tests + grep verification; Task 2 ClinicalTimeline render regression test)
- **Files modified:** 1 (`src/__tests__/mii-modules.test.ts`)
- **Files created:** 1 (`src/components/patients/__tests__/ClinicalTimeline.test.tsx`)

## Grep Verification (plan 33-02 migration intact)

**Grep 1 — zero `===` survivors on the timeline `.find` path:**

```
grep -n "MII_MODULES\.find\|m\.fhirResourceType\s*===" src/components/patients/ClinicalTimeline.tsx
```

Result: **0 matches.** Plan 33-02's migration of line 85-86 from
`MII_MODULES.find(m => m.fhirResourceType === resource.resourceType)` to
`findModuleForType(resource.resourceType, MII_MODULES)` survived waves 3-6 untouched.

**Grep 2 — `findModuleForType` present at the expected site:**

```
grep -n "findModuleForType" src/components/patients/ClinicalTimeline.tsx
```

Result: **2 matches** (line 7 import + line 85 call site). Confirms the helper is
invoked exactly where the plan-33-02 refactor placed it.

## Accomplishments

### Task 1 — Helper-level regression tests + grep verification

Appended a new `findModuleForType with multi-type module (MII-EXT-08 timeline regression)` describe block to `src/__tests__/mii-modules.test.ts` with a prepended `MULTI_TYPE_FIXTURE: MiiModule[]` that injects a Bildgebung-shaped `{ fhirResourceType: ['ImagingStudy', 'DiagnosticReport'], category: 'extension' }` stub into the real `MII_MODULES` array. Three new tests:

1. `multi-type module: both member types resolve to same germanLabel` — both `ImagingStudy` and `DiagnosticReport` resolve to `Bildgebung`.
2. `multi-type module: both member types resolve to same badgeColor (D-15)` — both resolve to `cyan`, locking the D-15 color-propagation contract.
3. `base module still resolves when multi-type fixture is prepended (shadow-guard)` — `Condition` → `diagnose`, `Patient` → `person` even when the extension stub is prepended. Protects against Phase 34 module-ordering regressions.

Plan 33-02's existing helper test `findModuleForType accepts custom module array (multi-type fixture)` already covers the first-case `key === 'bildgebung'` assertion from the plan's interfaces section, so plan 33-07 layers SAME-LABEL + SAME-COLOR + SHADOW-GUARD on top without duplication.

### Task 2 — Render-level end-to-end regression test

Created `src/components/patients/__tests__/ClinicalTimeline.test.tsx` with three render tests exercising the production chain:

1. **Condition → Diagnose** — a `Condition` resource with `onsetDateTime` and `code.text: 'Test Condition'` renders with the `Diagnose` German label (via `findModuleForType('Condition') → MII_MODULES['diagnose'].germanLabel`) and the extracted summary text.
2. **Procedure → Prozedur** — a `Procedure` resource with `performedDateTime` and `code.text: 'Test Procedure'` renders with the `Prozedur` German label and extracted summary.
3. **Empty-bundle no-crash** — empty bundles across all 4 TIMELINE_RESOURCE_TYPES render the UI-SPEC empty-state copy (`No clinical events recorded for this patient.`) without crashing.

Harness pattern mirrors `MiiModuleTab.test.tsx`:
- jsdom polyfills for `ResizeObserver` and `matchMedia` (required by Mantine).
- `vi.mock('react-router-dom', ...)` for `useNavigate`.
- Hoisted mock container (`mocks.client`) written per-test, consumed by `vi.mock('@medplum/react-hooks', ...)` for `useMedplum`.
- Per-test `makeClient(resourcesByType: Record<string, Resource[]>)` helper with a `vi.fn` `searchResources` responder.

The test uses the REAL `MII_MODULES` (no helper-level mocking) so Condition→Diagnose, Procedure→Prozedur, etc. resolve through the same chain that production uses. This is the regression the plan wants to lock.

## Files Created/Modified

- **`src/__tests__/mii-modules.test.ts`** (modified) — +42 lines. New `findModuleForType with multi-type module (MII-EXT-08 timeline regression)` describe block appended after the plan 33-02 `helpers (MII-EXT-01)` block. Three new `it(...)` tests inside. No imports needed (plan 33-02 already imports `findModuleForType` and `MiiModule`).
- **`src/components/patients/__tests__/ClinicalTimeline.test.tsx`** (created) — +187 lines. New test file with 3 render-level regression tests. Imports `ClinicalTimeline`, `MantineProvider`, `vi`, `render`, `screen`, `waitFor`, `act`, and `Resource` from `@medplum/fhirtypes`.

## Task Commits

Parallel-executor mode with `git commit --no-verify`:

1. **Task 1 — helper regression + grep verification** — `e845e56` (test)
   - Appended `findModuleForType with multi-type module (MII-EXT-08 timeline regression)` describe block.
   - `MULTI_TYPE_FIXTURE = [bildgebung-stub, ...MII_MODULES]` prepended style proves shadow-guard.
   - 3 new tests: same-germanLabel, same-badgeColor (D-15), shadow-guard.

2. **Task 2 — ClinicalTimeline render regression test** — `ba4536e` (test)
   - Created `src/components/patients/__tests__/ClinicalTimeline.test.tsx` with jsdom polyfills + vi.mock setup + 3 render tests.
   - Condition→Diagnose end-to-end test proves the findModuleForType chain works in production rendering.
   - Empty-state no-crash test guards the fallback branch.

## Acceptance Criteria Verification

### Task 1

| Criterion | Expected | Actual |
|-----------|----------|--------|
| `grep -n "MII_MODULES\\.find\|m\\.fhirResourceType\\s*===" src/components/patients/ClinicalTimeline.tsx \| wc -l` | 0 | **0** |
| `grep -c "findModuleForType" src/components/patients/ClinicalTimeline.tsx` | ≥ 1 | **2** (import + call site) |
| `grep -c "MII-EXT-08 timeline regression" src/__tests__/mii-modules.test.ts` | 1 | **1** |
| `grep -c "bildgebung-stub" src/__tests__/mii-modules.test.ts` | ≥ 1 | **1** |
| `npm test -- mii-modules.test.ts` | exit 0 | **34/34 passing** (was 31 before) |
| `npx tsc -b --noEmit` | exit 0 | **exit 0** |
| `npm test` total | ≥ 844 passing / 0 failing | **902 passing / 0 failing** |

### Task 2

| Criterion | Expected | Actual |
|-----------|----------|--------|
| File `src/components/patients/__tests__/ClinicalTimeline.test.tsx` | exists | **FOUND** |
| `grep -c "ClinicalTimeline MII module resolution" ClinicalTimeline.test.tsx` | 1 (describe block) | **2** (file header comment + describe block — criterion met on describe block alone) |
| `it(...)` test blocks | ≥ 3 | **3** |
| `npm test -- ClinicalTimeline` | exit 0 | **3/3 passing** |
| `npm test` total | ≥ 847 passing / 0 failing | **902 passing / 0 failing** |
| `npx tsc -b --noEmit` | exit 0 | **exit 0** |

## Decisions Made

- **Render-level test uses real `MII_MODULES`**, not a stub. `ClinicalTimeline` reads `MII_MODULES` directly (no prop injection), so proving the Condition→Diagnose / Procedure→Prozedur chain against the production config is the regression we want to lock. A stub would not catch a production `MII_MODULES` ordering bug in Phase 34.
- **`MULTI_TYPE_FIXTURE` is prepended** (`[stub, ...MII_MODULES]`), not appended. `Array.prototype.find` short-circuits on the first match — prepending is the ordering that actually exercises the shadow-guard code path against a hostile module ordering in Phase 34.
- **Third ClinicalTimeline test is empty-state no-crash**, not a fallback-color assertion. All 4 `TIMELINE_RESOURCE_TYPES` map to base MII modules, so the `'gray'` fallback path is unreachable from the component's own fetches. A fallback-color assertion would be end-to-end untestable without module injection.
- **Bare `findByText` + `.toBeTruthy()` instead of `.toBeInTheDocument()`** — this repo does not configure `@testing-library/jest-dom` matchers (verified by failing initial run). `findByText` throws on miss, so presence is asserted implicitly; `toBeTruthy()` on the returned `HTMLElement` provides equivalent assertion strength.

## Deviations from Plan

None — plan executed exactly as written.

One minor adjustment during Task 2 execution: the plan's example test code used `.toBeInTheDocument()` (jest-dom matcher). The initial test run surfaced `Invalid Chai property: toBeInTheDocument` because this repo does not have `@testing-library/jest-dom` set up. Replaced with bare `.toBeTruthy()` on the awaited `findByText` result — same semantic assertion (findByText throws if element is missing, so truthy on the return value is equivalent to "in the document"). This is not a deviation from the plan's INTENT (which was to assert rendered presence); it's just an adaptation to the repo's actual test configuration. Not tracked under Rules 1-4 because no issue was introduced and no fix was needed beyond the test-file style adjustment.

Zero CLAUDE.md constraints violated; zero Rules 1-4 triggered. No auth gates. No architectural decisions surfaced.

## Issues Encountered

- **Initial test run failed with `Invalid Chai property: toBeInTheDocument`.** The plan's example code assumed `@testing-library/jest-dom` was configured; it is not. Resolved by replacing `.toBeInTheDocument()` with bare `findByText` + `.toBeTruthy()` — same assertion semantics. 3/3 tests green on the re-run.

## Authentication Gates

None.

## User Setup Required

None — pure in-repo test addition. No external services, no env vars, no schema changes.

Manual smoke recommended on a live Blaze + Synthea patient to confirm the D-15 contract holds in production rendering (the automated tests prove the chain at jsdom-level; manual smoke confirms CSS color tokens and badge rendering look correct):
- Patient detail → timeline tab renders Conditions labelled "Diagnose" (teal border-left + teal badge)
- Encounters labelled "Fall" (indigo)
- Procedures labelled "Prozedur" (violet)
- Observations labelled "Laborbefund" (cyan)

## Verification Evidence

- `npx tsc -b --noEmit` → **exit 0**
- `npm test -- mii-modules.test.ts --run` → **34 passed / 34 total** (was 31 before plan 33-07; +3 new MII-EXT-08 tests)
- `npm test -- ClinicalTimeline --run` → **3 passed / 3 total** (new test file)
- `npm test --run` (full suite) → **Test Files 102 passed | 3 skipped (105); Tests 902 passed | 22 todo (924)**, 0 failing
- `grep -n "MII_MODULES\.find\|m\.fhirResourceType\s*===" src/components/patients/ClinicalTimeline.tsx | wc -l` → **0**
- `grep -c "findModuleForType" src/components/patients/ClinicalTimeline.tsx` → **2**
- `grep -c "MII-EXT-08 timeline regression" src/__tests__/mii-modules.test.ts` → **1**
- `grep -c "bildgebung-stub" src/__tests__/mii-modules.test.ts` → **1**
- `grep -c "ClinicalTimeline MII module resolution" src/components/patients/__tests__/ClinicalTimeline.test.tsx` → **2** (file header docstring + describe block)

## Self-Check: PASSED

**Files:**
- `src/__tests__/mii-modules.test.ts` → **FOUND** (modified; +3 regression tests)
- `src/components/patients/__tests__/ClinicalTimeline.test.tsx` → **FOUND** (created; 3 render tests)

**Commits:**
- `e845e56` `test(33-07): add MII-EXT-08 multi-type + shadow-guard timeline regression tests` → **FOUND**
- `ba4536e` `test(33-07): add ClinicalTimeline render regression test (MII-EXT-08)` → **FOUND**

**Success criteria:**
- [x] MII-EXT-08 binding criterion met: `ClinicalTimeline.tsx:85-86` uses `findModuleForType` (grep-verified 0 survivors of the `===` pattern); multi-type module stub test locks color + label; shadow-guard test prevents Phase 34 ordering regressions.
- [x] D-15 contract: badge color + German label propagate correctly for multi-type modules (`same-germanLabel` + `same-badgeColor` tests).
- [x] D-20 folding acknowledged: bulk migration done in plan 33-02; plan 33-07 = verification + regression tests only (no production code changes).
- [x] D-21 green-gate: `tsc -b --noEmit` + `vitest --run` both clean; no intermediate broken state.

## Phase 33 Closure

This plan closes Phase 33 — all 8 MII-EXT-* requirements satisfied:

| Requirement | Plan | Status |
|-------------|------|--------|
| MII-EXT-01 (helpers + call-site migration) | 33-02 | ✓ |
| MII-EXT-02 (schema widen: string \| string[] + category + override maps) | 33-03 | ✓ |
| MII-EXT-03 (MiiModuleTab per-type fan-out) | 33-04 | ✓ |
| MII-EXT-04 (MiiModuleTabs partition + Collapse session-only toggle) | 33-05 | ✓ |
| MII-EXT-05 (MiiModuleTabs empty-state UX per module) | 33-05 | ✓ |
| MII-EXT-06 (Dashboard MII partition + Drawer click target + D-13 heading) | 33-06 | ✓ |
| MII-EXT-07 (D-17 per-module patientSearchParam contract test) | 33-01 | ✓ |
| MII-EXT-08 (ClinicalTimeline multi-type verification + regression test) | 33-07 | ✓ |

Phase 34 (14 MII extension modules — Onkologie, Kardiologie, Intensivmedizin, Bildgebung, Pathologie, Mikrobiologie, Molekulargenetik, Seltene Erkrankungen, Symptom, Biobank, Studie, Dokument, MTB, PRO) is structurally unblocked: dropping module rows into `MII_MODULES` with `category: 'extension'` + `fhirResourceType: string | string[]` automatically activates all wired UX surfaces (tab partition + Collapse, Dashboard tile subgrid + Drawer, per-type fan-out fetches, timeline color/label resolution) without further component changes.

---

*Phase: 33-mii-schema-foundation-extension-modules-collapse-ui*
*Plan: 07*
*Completed: 2026-04-24*
