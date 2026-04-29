---
phase: 33-mii-schema-foundation-extension-modules-collapse-ui
plan: 01
subsystem: ui
tags: [mii, fhir, blaze, synthea, observation, category, laboratory, testing]

# Dependency graph
requires:
  - phase: 30-layout-redesign
    provides: "MII_MODULES array + MiiModuleTab single-type fetch shape + Phase-30 UAT-FU-06 'empty panel' observation"
provides:
  - "Live-probe-verified per-module patientSearchParam values (all 7 base modules correct as-is)"
  - "Root-cause analysis for UAT-FU-06 (Consent+Medikation empty on Synthea is data-coverage reality, not a param bug)"
  - "Fix for latent MiiModuleTab.tsx:63 extraQuery URL drop (Laborbefund tab no longer leaks non-lab Observations)"
  - "D-17 per-module getPatientSearchParamForType contract test (table-driven; Phase-34 modules must add one row each)"
  - "Verification comment at top of MII_MODULES documenting the 2026-04-24 live-probe audit outcome"
affects:
  - "33-02 (MII-EXT-01 helpers) — will replace the inline probe() with an import of getPatientSearchParamForType per TODO"
  - "33-03 (MII-EXT-02 schema widen) — existing D-17 test extends naturally to patientSearchParamOverrides rows"
  - "33-04 (MII-EXT-03 MiiModuleTab fan-out) — URL builder fix also applies per-type in the Promise.all fan-out"
  - "34 (data payload — 14 extension modules) — D-17 contract binds every new module to add a test row"

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Live-Blaze-probe-and-fix-forward: verify per-module FHIR search param behavior against the configured server before schema-widening work lands"
    - "Test-as-contract (D-17): table-driven per-module assertion replaces JSDoc documentation as the binding specification"
    - "TDD RED/GREEN on contract tests: deliberately-wrong row to prove the test binds, then flip to the correct value for GREEN"

key-files:
  created:
    - ".planning/phases/33-mii-schema-foundation-extension-modules-collapse-ui/33-01-INVESTIGATION.md"
  modified:
    - "src/components/patients/MiiModuleTab.tsx (extraQuery URL append + useEffect dep array)"
    - "src/utils/mii-modules.ts (live-probe verification comment at top of MII_MODULES)"
    - "src/__tests__/mii-modules.test.ts (new describe block: per-module patientSearchParam contract)"

key-decisions:
  - "All 7 existing patientSearchParam values are correct — no MII_MODULES data changes needed (verified against live Blaze + Synthea patient DHNTXK2BX5F3N4U6)"
  - "Consent empty panel is a data-coverage reality (0 Consent resources server-wide on Synthea), not a param bug — out of scope for 33-01; Medikation the same"
  - "extraQuery URL drop at MiiModuleTab.tsx:63 IS a separate bug that compounded UAT-FU-06's visual symptom — 1121 of 4410 Observations the probe patient sees today are non-lab leakage (~25%)"
  - "Inline probe() in the contract test mirrors the future getPatientSearchParamForType helper without depending on its existence; plan 33-02 migrates to the real import per an inline TODO"
  - "TDD RED stage was exercised by deliberately setting person/Patient → 'subject' (wrong), confirming vitest failure, then flipping to '_id' for GREEN — proves the test actually binds"

patterns-established:
  - "Live-probe investigation before schema work: confirm current contract with real server data before widening types (per D-16 / Phase 33 intra-phase ordering)"
  - "Verification-comment-above-data convention: the live-probe audit date + investigation doc link sits at the top of MII_MODULES so future readers know the contract is currently correct"

requirements-completed: [MII-EXT-07]

# Metrics
duration: ~8 min
completed: 2026-04-24
---

# Phase 33 Plan 01: MII-EXT-07 UAT-FU-06 Root-Cause Investigation + extraQuery URL Fix Summary

**Live Blaze probe confirms all 7 MII-base-module patientSearchParam values are correct; separately fixes the latent MiiModuleTab.tsx:63 bug where module.extraQuery was declared in the type but never appended to the URL (Laborbefund tab shed 1121 non-lab Observations per probe patient once fixed); locks the contract with a 7-row table-driven test (D-17).**

## Performance

- **Duration:** ~8 min (4 commits from 12:36:52 → 12:40:03 local)
- **Started:** 2026-04-24T10:36Z
- **Completed:** 2026-04-24T10:40Z
- **Tasks:** 3 (Task 1 investigation, Task 2 code fix, Task 3 TDD contract test with RED + GREEN)
- **Files modified:** 3 source files + 1 new investigation doc

## Accomplishments

- Probed all 7 MII base modules against a Synthea patient on the live Blaze server; documented per-module count + param-variant results.
- Identified 3 independent roots of UAT-FU-06's "empty panel" symptom: (1) Consent has 0 resources server-wide, (2) Medikation lives only on non-Synthea `pat-uka-*` patients, (3) Laborbefund contaminated by the extraQuery URL drop — only #3 is in scope for this plan.
- Fixed the latent `MiiModuleTab.tsx:63` bug: `module.extraQuery` is now correctly appended to the fetch URL (`&${module.extraQuery}`) with the useEffect dep array updated to match.
- Added a top-of-array verification comment to `MII_MODULES` documenting the 2026-04-24 live-probe audit so future readers can see at a glance that the per-module params were validated.
- Landed the D-17 per-module contract test: 7 rows (one per base module) + 1 coverage assertion (every MII_MODULES entry has an EXPECTED row). Phase 34's 14-module data drop cannot ship without extending this table.

## Task Commits

Each task was committed atomically using `git commit --no-verify` (parallel executor mode):

1. **Task 1: Live Blaze probe investigation** — `e0918a6` (docs)
   - Wrote `33-01-INVESTIGATION.md` with setup, per-module results table (9 rows including Consent/Medikation control probes), root cause analysis, bug note for MiiModuleTab.tsx:63, concrete fix list.

2. **Task 2: Apply extraQuery URL fix + MII_MODULES verification comment** — `995f56f` (fix)
   - Changed `const url = ...` to `let url = ...; if (module.extraQuery) url += '&' + module.extraQuery;` at MiiModuleTab.tsx:63.
   - Added `module.extraQuery` to useEffect dep array at line 83.
   - Added a block comment above `MII_MODULES` documenting the live-probe audit outcome (no data changes).

3. **Task 3a: RED — per-module contract test with one deliberately-wrong row** — `62e1177` (test)
   - Added `describe('per-module patientSearchParam contract (D-17)', ...)` block.
   - Set `person/Patient → 'subject'` (wrong) to prove the test binds; vitest reported `expected '_id' to be 'subject'`.

4. **Task 3b: GREEN — flip person to `_id`, test passes** — `6c2d859` (test)
   - Changed `expectedParam: 'subject'` → `expectedParam: '_id'` for the person row. Full suite: 879 passing / 22 todo / 0 failing.

_Note: Task 3 followed TDD; the RED commit is a deliberate intermediate state and was green within 45 seconds via the follow-up GREEN commit._

## Files Created/Modified

- **`.planning/phases/33-mii-schema-foundation-extension-modules-collapse-ui/33-01-INVESTIGATION.md`** (new) — live probe findings with per-module results table, Observation category breakdown (72 lab / 14 vital-signs / 12 survey / 2 social-history), root cause of UAT-FU-06, concrete fix list for Tasks 2+3, out-of-scope follow-ups logged.
- **`src/components/patients/MiiModuleTab.tsx`** — URL builder at line 63 now appends `&${module.extraQuery}` when the field is present; useEffect dep array at line 83 includes `module.extraQuery`.
- **`src/utils/mii-modules.ts`** — new top-of-array comment block (no data changes) documenting the 2026-04-24 live-probe audit outcome with a link to `33-01-INVESTIGATION.md`.
- **`src/__tests__/mii-modules.test.ts`** — new `describe('per-module patientSearchParam contract (D-17)', ...)` with a 7-row table + 1 coverage assertion, inline `probe()` helper mirroring the future `getPatientSearchParamForType`, and a TODO comment flagging the 33-02 migration.

## Decisions Made

- **No MII_MODULES data changes.** The live probe confirmed all 7 `patientSearchParam` values are correct against the configured Blaze server + Synthea bundle. The plan allowed either data-change or verification-comment — verification comment was chosen because no mismatch was found.
- **Consent and Medikation empty-panel UAT items are out of scope for 33-01.** The probe proved both are data-coverage realities on Synthea (Consent = 0 server-wide; Medikation lives on `pat-uka-*` non-Synthea patients), not parameter mismatches. Both are logged as out-of-scope follow-ups in INVESTIGATION.md "Out-of-scope follow-ups" section for a later plan (likely Phase 34 empty-state UX).
- **TDD RED/GREEN on the contract test is worth the extra commit.** The person/Patient row was deliberately wrong in the RED commit to confirm the test actually discriminates. This pattern proves contract tests bind without requiring the slower "break then fix" loop on real behavior.
- **Inline `probe()` helper in the test file.** Per D-17 and the plan's `<behavior>` guidance, the test does not yet import `getPatientSearchParamForType` (plan 33-02 ships it). The inline `probe()` mirrors the future helper signature (`function probe(mod: MiiModule, _type: string): string { return mod.patientSearchParam; }`) so the 33-02 migration is a one-line import swap.

## Deviations from Plan

None — plan executed exactly as written.

The plan's Task 2 allowed two branches depending on Task 1's findings: "update patientSearchParam for mismatched modules" OR "add a verification comment at the top of the array." The live probe found no mismatches, so the comment branch was taken per the plan's explicit fallback. No deviation rules (1-4) triggered. No CLAUDE.md constraints violated.

## Issues Encountered

- **Plan files not present in the worktree at agent start.** The worktree was created from commit `c80d64c` but all plan files under `.planning/phases/33-*/` were untracked in the main repo (not yet committed). I copied `33-01-PLAN.md` and the investigation file into the worktree and committed them alongside Task 1's deliverable so subsequent tasks had proper context. No impact on the plan's deliverables — just a cosmetic workspace-setup step.
- **Parallel-executor commits used `--no-verify`.** Per the orchestrator's instruction for parallel mode, all 4 commits used `--no-verify` to avoid pre-commit-hook contention. The orchestrator validates hooks once after all agents complete.

## User Setup Required

None - no external service configuration required beyond the assumed live Blaze server at `http://localhost:8080/fhir` with the Synthea bundle loaded. This was verified via `curl` at the start of Task 1; no further user action needed.

## Verification

- `npx tsc -b --noEmit` → exit 0
- `npm test -- mii-modules.test.ts --run` → 19/19 passing (was 11 before — added 8 new test cases: 7 module rows + 1 coverage assertion)
- Full suite `npm test --run` → **879 passing / 22 todo / 0 failing** (baseline from plan: ≥ 836 passing / 0 failing — exceeded by +43 tests, all pre-existing)
- `grep -c "module\.extraQuery" src/components/patients/MiiModuleTab.tsx` → 3 (was 0; now 1 in the `if` guard, 1 in the append, 1 in useEffect deps)
- `grep -c "UAT-FU-06\|33-01-INVESTIGATION" src/utils/mii-modules.ts` → 2
- `grep -c "per-module patientSearchParam contract" src/__tests__/mii-modules.test.ts` → 1
- `grep -c "TODO(plan 33-02)" src/__tests__/mii-modules.test.ts` → 1
- `grep -c "expectedParam" src/__tests__/mii-modules.test.ts` → 12 (threshold ≥ 8)

## Self-Check: PASSED

**Files:**
- `.planning/phases/33-mii-schema-foundation-extension-modules-collapse-ui/33-01-INVESTIGATION.md` → FOUND
- `src/components/patients/MiiModuleTab.tsx` → FOUND (modified)
- `src/utils/mii-modules.ts` → FOUND (modified)
- `src/__tests__/mii-modules.test.ts` → FOUND (modified)

**Commits:**
- `e0918a6` docs(33-01): live Blaze probe investigation for UAT-FU-06 → FOUND
- `995f56f` fix(33-01): append module.extraQuery to MiiModuleTab URL (MII-EXT-07) → FOUND
- `62e1177` test(33-01): add failing per-module patientSearchParam contract (D-17) → FOUND
- `6c2d859` test(33-01): lock D-17 contract — flip person to _id, test GREEN → FOUND

**Success criteria:**
- [x] MII-EXT-07 met: UAT-FU-06 root cause identified (INVESTIGATION.md) + fixed (Task 2) + regression-locked (Task 3)
- [x] MiiModuleTab.tsx:63 extraQuery drop fixed (grep shows 3 × module.extraQuery)
- [x] mii-modules.test.ts contract table has ≥ 7 rows (exactly 7 base modules + 1 coverage assertion)
- [x] npm test ≥ 836 passing / 0 failing (879 passing / 0 failing)
- [x] npx tsc -b --noEmit exits 0

## Next Phase Readiness

- Plan 33-02 (MII-EXT-01 helpers) unblocked. The D-17 contract test's inline `probe()` will be replaced with `import { getPatientSearchParamForType } from '../utils/mii-modules'` — a one-line swap per the in-file TODO.
- Plan 33-03 (MII-EXT-02 schema widen) unblocked. The contract test already passes against the narrow schema and will naturally extend to `patientSearchParamOverrides` rows once the schema widens.
- No blockers, no concerns carried forward. Phase 34's 14-module data drop is bound by the D-17 test: every new module must add exactly one EXPECTED row (or one per overridden type).

---
*Phase: 33-mii-schema-foundation-extension-modules-collapse-ui*
*Plan: 01*
*Completed: 2026-04-24*
