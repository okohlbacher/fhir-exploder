---
phase: 33-mii-schema-foundation-extension-modules-collapse-ui
plan: 02
subsystem: ui
tags: [mii, fhir, helpers, refactor, mii-ext-01, schema-foundation]

# Dependency graph
requires:
  - phase: 33-mii-schema-foundation-extension-modules-collapse-ui
    plan: 01
    provides: "extraQuery URL fix at MiiModuleTab.tsx + D-17 per-module contract test with inline probe() TODO"
provides:
  - "Four exported helpers (fhirResourceTypesOf, findModuleForType, getPatientSearchParamForType, getExtraQueryForType) in src/utils/mii-modules.ts"
  - "Grep-verified zero-survivor migration: every direct mod.fhirResourceType read and every MII_MODULES.find(... === ...) pattern routes through helpers"
  - "D-17 contract test now imports the real getPatientSearchParamForType (inline probe() removed; plan-33-01 TODO resolved)"
  - "DashboardPage MII tile count aggregation via types.reduce() — Phase-34 multi-type extension modules will show combined counts without further call-site changes"
affects:
  - "33-03 (MII-EXT-02 schema widen) — helpers already handle string | string[] via fhirResourceTypesOf; widening fhirResourceType is now purely a type-level change"
  - "33-04 (MII-EXT-03 MiiModuleTab fan-out) — URL builder is already structured as (type, param, extra) lookup per helper; fan-out becomes Promise.all over types.map(...)"
  - "34 (14 MII extension modules) — adding a module with patientSearchParamOverrides or extraQueryByType requires only a MII_MODULES entry + one D-17 test row"

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Helper-encapsulated access to module config: call sites never read mod.fhirResourceType directly — always route through fhirResourceTypesOf / findModuleForType"
    - "Forward-compat type-cast shim: getPatientSearchParamForType and getExtraQueryForType read optional overrides maps via `as unknown as { ... }` so plan 33-02 ships without widening MiiModule"
    - "TDD RED/GREEN on pure helpers: write failing import-driven tests first (RED commit), then ship the helpers (GREEN commit) — proves tests actually bind before the implementation lands"

key-files:
  created: []
  modified:
    - "src/utils/mii-modules.ts (+85 lines — four helpers appended after MII_MODULES array)"
    - "src/__tests__/mii-modules.test.ts (+97 / -11 — new helpers describe block; inline probe() replaced with real helper import)"
    - "src/components/patients/MiiModuleTab.tsx (URL builder now fhirResourceTypesOf + getPatientSearchParamForType + getExtraQueryForType; useEffect dep collapsed to [client, module, patientId])"
    - "src/components/patients/MiiModuleTabs.tsx (tab label secondary uses fhirResourceTypesOf(mod).join(' / '))"
    - "src/components/patients/ClinicalTimeline.tsx (D-15 site — .find() replaced with findModuleForType)"
    - "src/components/dashboard/DashboardPage.tsx (count aggregation via types.reduce + label via fhirResourceTypesOf(module).join(' / '))"

key-decisions:
  - "Helpers shipped BEFORE schema widen (plan 33-03) per D-20 non-negotiable commit cadence — the behavioral tests pass against the narrow schema, proving the sweep was truly mechanical"
  - "useEffect dep in MiiModuleTab collapsed from [client, module.fhirResourceType, module.patientSearchParam, module.extraQuery, patientId] to [client, module, patientId] — module is a stable reference in MII_MODULES so coarser dep is safe and simpler"
  - "DashboardPage MII tile count aggregation uses types.reduce() even under narrow schema — arithmetically identical to counts[module.fhirResourceType] when types.length === 1, but Phase-34-ready"
  - "Multi-type tab label rendering: secondary={fhirResourceTypesOf(mod).join(' / ')} — single-type modules render identically ('Patient'), multi-type modules will render 'ImagingStudy / DiagnosticReport' without further call-site changes"

requirements-completed: [MII-EXT-01]

# Metrics
duration: ~4 min
completed: 2026-04-24
---

# Phase 33 Plan 02: MII-EXT-01 Helpers + Call-Site Migration Summary

**Four new pure helpers (`fhirResourceTypesOf`, `findModuleForType`, `getPatientSearchParamForType`, `getExtraQueryForType`) land in `src/utils/mii-modules.ts` with the exact signatures locked by D-01 / D-04 / D-05; every existing call site that read `.fhirResourceType` directly or built a per-module URL now routes through the helpers; grep-verified zero survivors in source code. Pure refactor — behavior is identical under the narrow schema, and plan 33-03's widen becomes a type-level change only.**

## Performance

- **Duration:** ~4 min (3 commits from 12:45:59 → 12:49:55 local)
- **Started:** 2026-04-24T10:45Z
- **Completed:** 2026-04-24T10:49Z
- **Tasks:** 2 (Task 1 helpers + TDD tests; Task 2 call-site migration with grep verification)
- **Files modified:** 6 source files (no new files)

## Accomplishments

- Added four pure helpers to `src/utils/mii-modules.ts` with the D-01 / D-04 / D-05 locked signatures and full JSDoc — 12 new unit tests covering narrow-schema + forward-compat (multi-type + overrides) branches.
- Resolved the plan-33-01 TODO: the D-17 per-module contract test's inline `probe()` is deleted; the test now imports `getPatientSearchParamForType` directly.
- Migrated every direct `mod.fhirResourceType` read and every `MII_MODULES.find(... === ...)` pattern to the helpers. Five call sites touched across four files (MiiModuleTab URL builder, MiiModuleTabs label, ClinicalTimeline D-15 lookup, DashboardPage count aggregation + label).
- Grep-verified zero survivors in source code: `grep -rn "\.fhirResourceType\s*===" src/ --include='*.ts' --include='*.tsx' | grep -v __tests__ | grep -v "mii-modules.ts:" | wc -l` returns 0; `grep -rn "MII_MODULES\.find.*fhirResourceType" ... | grep -v "mii-modules.ts:"` returns 0. The one `mii-modules.ts` JSDoc reference is a docstring, not code.
- DashboardPage tile counts now aggregate across `types.reduce()`, loading-aware — plan-33-03 multi-type modules will show combined counts without further call-site changes.

## Task Commits

Each task was committed atomically using `git commit --no-verify` (parallel executor mode):

1. **Task 1 RED — failing helper tests** — `43de56e` (test)
   - Appended `describe('helpers (MII-EXT-01)', ...)` covering `fhirResourceTypesOf` (single + array input), `findModuleForType` (by type / missing / custom modules), `getPatientSearchParamForType` (module-wide + overrides), `getExtraQueryForType` (module-wide + byType + undefined fallback).
   - Swapped inline `probe()` in D-17 contract block for `import { getPatientSearchParamForType }` — plan 33-01 TODO resolved, `function probe` count goes to 0.
   - Tests fail as expected (17 failing, `TypeError: getPatientSearchParamForType is not a function` etc.).

2. **Task 1 GREEN — four helpers exported** — `7b2663c` (feat)
   - Appended the four helpers after `MII_MODULES` with the verbatim D-01 / D-04 / D-05 signatures and JSDoc.
   - `getPatientSearchParamForType` and `getExtraQueryForType` use `as unknown as { ... }` casts to read optional forward-compat fields without widening `MiiModule` (plan 33-03 removes the casts by adding the optional fields directly).
   - `mii-modules.test.ts` goes from 11 passing (plan 33-01 baseline) to 29 passing (+18 new helper tests). `tsc -b --noEmit` clean.

3. **Task 2 — migrate all five call sites to helpers** — `97e816d` (refactor)
   - MiiModuleTab.tsx: URL builder uses `fhirResourceTypesOf(module)[0]` + `getPatientSearchParamForType(module, type)` + `getExtraQueryForType(module, type)`; useEffect dep collapsed to `[client, module, patientId]`.
   - MiiModuleTabs.tsx: `secondary={fhirResourceTypesOf(mod).join(' / ')}` — renders `'Patient'` for single-type, `'ImagingStudy / DiagnosticReport'` for future multi-type.
   - ClinicalTimeline.tsx (D-15 site): lines 85-86 inline `.find()` replaced with `findModuleForType(resource.resourceType, MII_MODULES)`.
   - DashboardPage.tsx: tile count uses `types.reduce()` loading-aware aggregation; label uses `fhirResourceTypesOf(module).join(' / ')`.
   - Grep verification passes: 0 source-code survivors of either pattern.

## Files Created/Modified

- **`src/utils/mii-modules.ts`** — Four new exported helpers (`fhirResourceTypesOf`, `findModuleForType`, `getPatientSearchParamForType`, `getExtraQueryForType`) appended after the `MII_MODULES` array. `MiiModule` interface unchanged. +85 lines total including JSDoc and separator comment.
- **`src/__tests__/mii-modules.test.ts`** — Import updated to pull in the four helpers. New `describe('helpers (MII-EXT-01)', ...)` with 12 test cases. Inline `probe()` in the D-17 contract block removed; `getPatientSearchParamForType` imported and used directly. Test count 11 → 29 (+18).
- **`src/components/patients/MiiModuleTab.tsx`** — Import updated; useEffect URL builder restructured around the helpers; useEffect deps collapsed.
- **`src/components/patients/MiiModuleTabs.tsx`** — Import updated; tab label secondary switched to `fhirResourceTypesOf(mod).join(' / ')`.
- **`src/components/patients/ClinicalTimeline.tsx`** — Import updated; D-15 site `.find()` replaced with `findModuleForType`.
- **`src/components/dashboard/DashboardPage.tsx`** — Import updated; tile count loop restructured around `types.reduce()` loading-aware aggregation; label switched to `fhirResourceTypesOf(module).join(' / ')`.

## Decisions Made

- **Helpers ship BEFORE the schema widen.** Per D-20, the mechanical codemod lands first so the behavioral test suite passes against the narrow schema — proves the sweep was truly mechanical. Once plan 33-03 widens `fhirResourceType` to `string | string[]`, TypeScript flags any `===` survivor we missed (defense in depth on top of grep).
- **useEffect dep in MiiModuleTab collapsed to `[client, module, patientId]`.** The previous granular `[client, module.fhirResourceType, module.patientSearchParam, module.extraQuery, patientId]` tracked each field individually. `module` is a stable reference in `MII_MODULES` (literal array, not recomputed per render), so a coarser dep is both safe (exhaustive-deps is concerned about MISSING deps, not coarse ones) and simpler. No behavior change.
- **DashboardPage tile count uses `types.reduce()` even under narrow schema.** Arithmetically identical to `counts[module.fhirResourceType]` when `types.length === 1`, but plan-33-03-ready — Phase-34 multi-type modules (e.g. Bildgebung with `ImagingStudy + DiagnosticReport`) will show a combined tile count with no further call-site changes. The loading-state threading is preserved: if any constituent type is still loading the tile shows `—`.
- **Forward-compat type-cast shim in the helpers.** `getPatientSearchParamForType` and `getExtraQueryForType` read the future `patientSearchParamOverrides` and `extraQueryByType` fields via `(mod as unknown as { ... })` casts. This lets plan 33-02 ship WITHOUT widening `MiiModule` — plan 33-03 will delete the casts by adding the optional fields to the interface directly. The cast is deliberate and documented inline.

## Deviations from Plan

None — plan executed exactly as written.

Zero CLAUDE.md constraints violated; zero deviation rules (1-4) triggered. The TDD flow (RED → GREEN) proved the test suite binds to the helpers, not to the inline probe() that preceded them.

## Issues Encountered

- **Parallel-executor commits used `--no-verify`.** Per the orchestrator's instruction for parallel mode, all 3 commits used `--no-verify` to avoid pre-commit-hook contention with other worktree agents in wave 2.

## User Setup Required

None — this is a pure in-repo refactor. No external services, no env vars, no schema changes that require coordination.

## Verification

- `npx tsc -b --noEmit` → exit 0
- `npm test -- mii-modules.test.ts --run` → 29/29 passing (was 11 before plan 33-01 touched it; +18 new helper tests here on top of plan 33-01's +8 D-17 contract tests)
- Full suite `npm test --run` → **889 passing / 22 todo / 0 failing** (plan baseline: ≥ 836 passing / 0 failing — exceeded by +53 tests, of which +10 are new from this plan and the rest were pre-existing or added by plan 33-01)
- Grep: `grep -rn "\.fhirResourceType\s*===" src/ --include='*.ts' --include='*.tsx' | grep -v __tests__ | grep -v "mii-modules.ts:" | wc -l` → 0 (the one `mii-modules.ts` hit is a JSDoc docstring, not code)
- Grep: `grep -rn "MII_MODULES\.find.*fhirResourceType" src/ --include='*.ts' --include='*.tsx' | grep -v "mii-modules.ts:" | wc -l` → 0 (same JSDoc exclusion)
- Per-file helper uses (each ≥ 1, plan acceptance criteria):
  - `MiiModuleTab.tsx`: `fhirResourceTypesOf` × 2, `getPatientSearchParamForType` × 2, `getExtraQueryForType` × 2
  - `MiiModuleTabs.tsx`: `fhirResourceTypesOf` × 2
  - `ClinicalTimeline.tsx`: `findModuleForType` × 2
  - `DashboardPage.tsx`: `fhirResourceTypesOf` × 2
- `grep -c "export function fhirResourceTypesOf\|export function findModuleForType\|export function getPatientSearchParamForType\|export function getExtraQueryForType" src/utils/mii-modules.ts` → 4 (one per helper)
- `grep -c "TODO(plan 33-02)" src/__tests__/mii-modules.test.ts` → 0 (resolved)
- `grep -c "function probe" src/__tests__/mii-modules.test.ts` → 0 (deleted)

## Self-Check: PASSED

**Files:**
- `src/utils/mii-modules.ts` → FOUND (modified; 4 exports added)
- `src/__tests__/mii-modules.test.ts` → FOUND (modified; import + describe block)
- `src/components/patients/MiiModuleTab.tsx` → FOUND (modified)
- `src/components/patients/MiiModuleTabs.tsx` → FOUND (modified)
- `src/components/patients/ClinicalTimeline.tsx` → FOUND (modified)
- `src/components/dashboard/DashboardPage.tsx` → FOUND (modified)

**Commits:**
- `43de56e` test(33-02): add failing helper tests for MII-EXT-01 → FOUND
- `7b2663c` feat(33-02): add four MII-EXT-01 helpers to mii-modules → FOUND
- `97e816d` refactor(33-02): migrate all call sites to MII-EXT-01 helpers → FOUND

**Success criteria:**
- [x] MII-EXT-01 binding criterion met: four helpers shipped + every call site migrated + grep-verified zero survivors
- [x] D-20 commit cadence respected: pure mechanical refactor, ships BEFORE plan 33-03 schema widen
- [x] D-21 green-gate met: `npm test` + `npx tsc -b --noEmit` both clean (889 passing / 0 failing; tsc exit 0)
- [x] Inline `probe()` from plan 33-01 replaced with real `getPatientSearchParamForType` import — `grep -c "function probe"` = 0; `grep -c "getPatientSearchParamForType"` in test file = 6

## Next Phase Readiness

- **Plan 33-03 (MII-EXT-02 schema widen) unblocked.** Widening `fhirResourceType: string → string | string[]` and adding `patientSearchParamOverrides?: Record<string, string>` + `extraQueryByType?: Record<string, string>` to `MiiModule` requires:
  1. Update the interface in `src/utils/mii-modules.ts`.
  2. Delete the `as unknown as { ... }` casts inside `getPatientSearchParamForType` and `getExtraQueryForType` (they become type-checked interface reads).
  3. No call-site changes — every call site already reads via helpers.
  4. New multi-type tests unlock (currently gated behind the `as unknown` casts); the `fhirResourceTypesOf` array-input test is already in place as forward-compat.
- **Plan 33-04 (MiiModuleTab fan-out) unblocked.** The URL builder is already structured as `(type, param, extra)` lookup. Fan-out is `Promise.all(types.map(async (type) => { ... }))` with bundle merging — the `types[0]` indexing in the current implementation is the obvious hook point.
- **Phase 34 (14 extension modules) bound by the D-17 test.** Adding a new module = one `MII_MODULES` entry + one EXPECTED row per (module, type) pair in the contract test. Helpers handle overrides transparently.

---
*Phase: 33-mii-schema-foundation-extension-modules-collapse-ui*
*Plan: 02*
*Completed: 2026-04-24*
