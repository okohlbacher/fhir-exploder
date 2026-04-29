---
phase: 35-phase-30-uat-follow-ups-per-type-quality-matrix
plan: 02
subsystem: ui
tags: [fhir, medplum, fhirtypes, react, mantine, tdd, baseline-drift, search-results, patient, condition, observation, medicationstatement, encounter, procedure]

# Dependency graph
requires:
  - phase: 30-layout-redesign
    provides: SearchResultsPage Date/Status column shell + Mantine Badge color convention
  - phase: 34-uat-of-phase-30
    provides: UAT-FU-01 acceptance criteria + 998-test stable baseline
provides:
  - Per-type Date extractor (getResourceDateByType) for 6 FHIR R4 resource types
  - Per-type Status extractor (getResourceStatusByType) with explicit Patient boolean→label and Condition CodeableConcept walk
  - 17-test fixture suite for SearchResultsPage Date/Status extractor regression coverage
  - Re-usable TDD baseline-drift commit pair (RED capture → GREEN flip in lockstep)
affects: [35-03 HumanReadableView extension cleanup (independent — no shared files), 35-04 Quality byType matrix (independent — different folder)]

# Tech tracking
tech-stack:
  added: []  # No new deps; pure typed extractor refactor on existing @medplum/fhirtypes
  patterns:
    - "TDD baseline-drift commit pair: commit #1 captures CURRENT behavior, commit #2 extractor + flipped assertions in single reviewable diff (CONTEXT D-26)"
    - "Per-resource-type switch dispatch over @medplum/fhirtypes typed accessors with legacy fallback default branch (D-04)"
    - "Explicit boolean→label mapping for FHIR boolean status fields (Pitfall P-02 mitigation)"
    - "CodeableConcept walk via coding[0].code → text → '' for status-bearing CodeableConcepts (Pitfall P-01 mitigation)"

key-files:
  created:
    - src/__tests__/SearchResultsPage.dateStatus.test.tsx (192 lines, 17 tests)
  modified:
    - src/components/explorer/SearchResultsPage.tsx (+107 net lines: type imports extended, 2 new exported extractors, render JSX rewired)

key-decisions:
  - "Approach B (planner-locked): exported existing getResourceDate from SearchResultsPage so the RED test file could import it under the new name and assert current legacy behavior verbatim — single-line export modifier was the only production change in the RED commit"
  - "Patient boolean→label mapping made explicit per Pitfall P-02 (active=true → 'active'; active=false → 'inactive'; active=undefined → '')"
  - "Condition status walks clinicalStatus.coding[0].code → text → '' per Pitfall P-01 — never stringifies the CodeableConcept directly"
  - "Encounter date reads period.start NOT a non-existent Encounter.date field per Pitfall P-03"
  - "Render JSX uses an IIFE wrapper to compute status once and conditionally render Badge, preserving the existing 'active'/'completed' → green; else gray badge color logic and the empty-status-no-badge behavior verbatim per UI-SPEC §Copywriting UAT-FU-01"
  - "Default branch of both extractors preserved per D-04: getResourceDateByType falls through to legacy getResourceDate; getResourceStatusByType returns '' for unknown types"

patterns-established:
  - "Pattern 1: TDD baseline-drift commit pair — RED commit captures the current 'empty = empty' behavior in passing assertions; GREEN commit lands the new functions AND flips those assertions in a single reviewable diff so the baseline shift is deliberate and visible to the reviewer"
  - "Pattern 2: Typed @medplum/fhirtypes switch dispatch — per-resource-type extractor functions branch on resource.resourceType then narrow with a typed cast; default branch preserves legacy fallback behavior so unknown types are not regressed"
  - "Pattern 3: Inline IIFE for conditional Badge render — `{(() => { const status = ...; if (!status) return null; return <Badge .../>; })()}` keeps the JSX tree readable while ensuring the extractor runs once per row"

requirements-completed: [UAT-FU-01]

# Metrics
duration: 3min
completed: 2026-04-25
---

# Phase 35 Plan 02: UAT-FU-01 — Per-Type Date/Status Extractors Summary

**Per-resource-type Date and Status field extractors for SearchResultsPage covering Patient (birthDate / active), Condition (onsetDateTime / clinicalStatus.coding[0].code), Observation / MedicationStatement / Procedure (effective[Date|Performed]Time / status), and Encounter (period.start / status), shipped via the TDD baseline-drift commit pair with all 4 RESEARCH-identified pitfalls mitigated and the existing badge color + empty-state behavior preserved.**

## Performance

- **Duration:** ~3 min
- **Started:** 2026-04-25T08:42:30Z (test baseline run)
- **Completed:** 2026-04-25T08:50:00Z
- **Tasks:** 2 (Task 1 RED + Task 2 GREEN)
- **Files modified:** 2

## Accomplishments
- Closed UAT-FU-01: SearchResultsPage Date column now populates for all 6 target FHIR R4 resource types using typed @medplum/fhirtypes accessors (Patient.birthDate previously rendered empty under the legacy field-list fallback).
- Closed UAT-FU-01: SearchResultsPage Status column now populates for Patient (boolean→label), Condition (CodeableConcept walk), and the 4 enum-status types (Observation, MedicationStatement, Encounter, Procedure).
- Demonstrated the TDD baseline-drift commit pattern (CONTEXT D-03 / D-26) end-to-end: 12 RED-baseline assertions captured today's "empty = empty" behavior, then a single GREEN commit landed the new extractors and flipped those assertions in lockstep so the deliberate shift is visible in one PR diff.
- All 4 RESEARCH-identified pitfalls mitigated in the production extractors (P-01 CodeableConcept walk, P-02 boolean→label, P-03 Encounter.period.start, FLAT effectiveDateTime in Medplum types).
- Net test delta: 998 → 1015 passing (+17). All edge cases covered (Patient.birthDate undefined, Encounter.period undefined, Condition.clinicalStatus undefined, Patient.active false / undefined branches).

## Task Commits

Each task was committed atomically:

1. **Task 1: RED baseline — current Date/Status extractor behavior across 6 resource types** — `25ac79e` (test)
2. **Task 2: GREEN — per-type extractors + flipped assertions in lockstep (single commit)** — `131bd7d` (feat)

Plan-metadata commit (this SUMMARY) is created separately.

## Files Created/Modified
- `src/__tests__/SearchResultsPage.dateStatus.test.tsx` (NEW, 192 lines) — 17 unit tests: 6 Date + 8 Status (4 enum-status types + 3 Patient active branches + 1 Condition CodeableConcept walk) + 3 missing-field edge cases. Typed fixtures from @medplum/fhirtypes, no `as any`, no untyped JSON.
- `src/components/explorer/SearchResultsPage.tsx` (MODIFIED, +107 net lines):
  - Extended `import type { ... } from '@medplum/fhirtypes'` with the 6 target type names.
  - Added `export function getResourceDateByType(resource: Resource): string` — typed switch with default falling through to legacy `getResourceDate`.
  - Added `export function getResourceStatusByType(resource: Resource): string` — typed switch with Patient boolean→label, Condition CodeableConcept walk, combined enum-status branch for the 4 remaining types, and `''` default per D-04.
  - Re-wired the Date column render (line 402-403) to call `getResourceDateByType(r)`.
  - Re-wired the Status column render (lines 405-419) to call `getResourceStatusByType(r)` via an IIFE wrapper that preserves the badge color logic (`'active'`/`'completed'` → green, else gray) and the empty-status-no-badge behavior verbatim.
  - Marked the existing `getResourceDate` as `export` so the RED test file could import it (single-line modifier change in the RED commit; no behavioral change).

## Decisions Made
See `key-decisions` in frontmatter. All decisions were planner-locked in `35-02-PLAN.md` or surfaced in `35-CONTEXT.md` (D-03 / D-04 / D-05 / D-26) and `35-RESEARCH.md` (P-01 / P-02 / P-03 / FLAT effectiveDateTime). No discretionary executor choices required beyond the IIFE-wrapper pattern for the Badge conditional, which preserves existing behavior 1:1.

## Pitfall Mitigations Confirmed

| Pitfall | Pre-fix risk | Mitigation in code | Test coverage |
|---------|-------------|--------------------|---------------|
| P-01 — Condition.clinicalStatus is CodeableConcept, not string | `String(clinicalStatus)` would render `[object Object]` | `c.clinicalStatus?.coding?.[0]?.code ?? c.clinicalStatus?.text ?? ''` walk | `Condition → 'active'` (line 144) + `clinicalStatus undefined → ''` edge case |
| P-02 — Patient.active is boolean, not code | Naive `String(active)` renders `'true'` / `'false'` | Explicit `if (p.active === true) return 'active'` / `false → 'inactive'` / undefined → `''` | 3 Patient Status tests (active=true, false, undefined) |
| P-03 — Encounter has no .date field | Reading `encounter.date` returns undefined silently | Switch case uses typed `(resource as Encounter).period?.start?.slice(0, 10)` | `Encounter → '2024-04-15'` + `period undefined → ''` edge case |
| FLAT effectiveDateTime in Medplum types | Code expecting `.effective.dateTime` would always return undefined for MedicationStatement | Switch case reads top-level `.effectiveDateTime?.slice(0, 10)` | `MedicationStatement → '2024-06-01'` |

## Default-Fallback + Badge-Color Preservation Confirmed

- `getResourceDateByType` default branch: `return getResourceDate(resource)` — preserves legacy behavior for any FHIR resource type not in the explicit 6.
- `getResourceStatusByType` default branch: `return ''` — per D-04 (Status column stays empty for non-target types rather than rendering misleading inline JSON).
- Render JSX badge color logic: `status === 'active' || status === 'completed' ? 'green' : 'gray'` — copied verbatim from the prior inline expression.
- Render JSX empty-status behavior: `if (!status) return null` — equivalent to the prior `{toRecord(r).status && (...)}` truthy guard.

## Deviations from Plan

None — plan executed exactly as written. The plan even named the 2 extra Patient Status assertions (active=false / active=undefined) in its action description, so the final test count of 17 (= plan's "12 flipped + 3 edge cases" baseline of 15 + 2 explicitly-named Patient extras) matches the plan's intent. The acceptance criterion of "≥ 15 passing" is satisfied.

## Issues Encountered

- During Task 1 execution, the absolute path `/Users/kohlbach/Claude/Exploder/...` initially routed Edit/Write calls to the main repository instead of the worktree (the worktree's identical relative path lives under `.claude/worktrees/agent-aec1bfeb728ccee7c/`). Reverted the stray edit in main with `git checkout --` and re-applied to the worktree using the full worktree-prefixed absolute path. No code lost; no rework needed beyond re-running the Edit and Write with the correct path.

## User Setup Required

None — pure typed extractor refactor with zero new runtime dependencies and zero environment changes.

## Verification Summary

| Gate | Result |
|------|--------|
| `npx vitest run src/__tests__/SearchResultsPage.dateStatus.test.tsx` | 17 passed / 0 failed |
| `npx vitest run` (full suite) | 1015 passed / 0 failed / 22 todo (108 files / 3 skipped) |
| `npx tsc -b --noEmit` | exit 0 (clean) |
| `npm run build` | exit 0 (clean; only pre-existing chunk-size warning unrelated to this plan) |
| `git log --oneline -2` shows TWO commits in order: RED then GREEN | ✓ `25ac79e test(35-02): RED baseline ...` then `131bd7d feat(35-02): per-type Date/Status extractors ...` |
| No new runtime dependencies | ✓ `git diff HEAD~2 -- package.json` empty |
| `grep -c "getResourceDateByType\|getResourceStatusByType" src/components/explorer/SearchResultsPage.tsx` | 4 (2 exported declarations + 2 JSX call sites — well above the acceptance threshold of ≥ 2) |

## Next Phase Readiness

UAT-FU-01 is closed; no follow-up work required. The two new extractor functions are exported from `SearchResultsPage.tsx` and could be reused by other tables if a similar Date/Status column ever appears elsewhere in the explorer surface. Plan 35-03 (UAT-FU-02 HumanReadableView extension cleanup) and Plan 35-04 (per-type quality matrix) are independent — no shared files, no cross-plan rebase risk.

## Self-Check: PASSED

- File `src/__tests__/SearchResultsPage.dateStatus.test.tsx` exists (verified via `git log --stat`).
- File `src/components/explorer/SearchResultsPage.tsx` modified (verified via `git log --stat`).
- Commits `25ac79e` and `131bd7d` exist in `git log --oneline -3`.
- 17 tests passing in the new file (verified via `vitest run`).
- Full suite 1015 passing / 0 failed (verified via `vitest run` post-GREEN).
- tsc clean + build clean (verified post-GREEN).

---

*Phase: 35-phase-30-uat-follow-ups-per-type-quality-matrix*
*Plan: 02*
*Completed: 2026-04-25*
