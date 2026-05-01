---
phase: 46-theme-a-foundation-summary-util
plan: 01
subsystem: utils
tags: [fhir, summarize, registry, pure-function, vitest, tdd]

# Dependency graph
requires:
  - phase: phase-22-cohort-management
    provides: "toRecord pattern (CHRT-06) sanctioned for prototype-pollution-safe Resource walking"
  - phase: phase-28-tech-debt-sweep
    provides: "fhir-helpers.ts (getCodeDisplay, toRecord) — single source of truth for CodeableConcept rendering"
provides:
  - "Pure-function summarizeResource(r, now?) -> { primary, secondary? } module exported from src/utils/summarizeResource.ts"
  - "Typed switch over 8 R4 resource types: Patient, Observation (lab/non-lab classification), Condition, Encounter, MedicationStatement, Procedure, DiagnosticReport, AllergyIntolerance"
  - "Generic 7-step walker (code -> type -> category -> name -> description -> identifier[0].value -> id) for the long tail of R4 types"
  - "djb2 base36-6 hash (NOT cryptographic; documented) for D-03 Patient name-missing fallback"
  - "Public Summary interface + summarizeResource entry point — locked API for Phases 47/48/49"
  - "52 vitest cases covering 8 typed + generic + Patient name fallbacks + age boundary + lab classification + sub-decision pins (A1/A2/A3) + djb2 determinism + D-12 generic-no-secondary"
affects: [phase-46-02-migrate-call-sites, phase-47-readability, phase-48-incoming-references, phase-49-graph-view]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Module-private classifier for resource sub-typing (isLabObservation) — kept un-exported per researcher recommendation"
    - "Defensive optional-chaining on schema-required fields when Blaze data may violate (e.g. Encounter.class)"
    - "Cast inside each switch case (TS strict + noFallthroughCasesInSwitch) — mirrors SearchResultsPage.getResourceDateByType pattern"

key-files:
  created:
    - "src/utils/summarizeResource.ts (328 LOC) — registry + 8 typed helpers + generic walker + djb2 + 4 helpers + Summary interface"
    - "src/utils/__tests__/summarizeResource.test.ts (686 LOC) — 52 vitest cases"
  modified: []

key-decisions:
  - "A1 pinned: gender 'other' -> 'O' (NOT 'U'); test asserts (45/O) byte string"
  - "A2 pinned: partial birthDate (length < 10) -> omit parenthetical; tests for '2026' and '2026-05'"
  - "A3 pinned: HumanName legacy comma-join 'family, given1, given2' (mirrors SearchResultsPage line 39-40 byte-for-byte); test asserts 'Mueller, Anna, Maria'"
  - "Lab vs non-lab Observation classification via category[].coding[].code === 'laboratory' (D-04)"
  - "Lab format uses U+00B7 middot '·' separator (NOT U+2022 bullet '•') — pinned by byte-string test"
  - "Encounter.class carries defensive ?. despite R4 schema marking it required (Blaze may violate)"
  - "MedicationStatement.medicationReference.display read literal — NEVER resolves the reference (purity)"
  - "DiagnosticReport prefers issued over effectiveDateTime when both present"
  - "AllergyIntolerance prefers category[0] over type when both present"
  - "Generic walker D-12: secondary ALWAYS undefined (asserted via 'secondary' in result === false)"
  - "djb2 hash documented 'NOT cryptographic — display label only'; threat T-46-02 mitigated by JSDoc"
  - "Walker uses toRecord bracket access ONLY — no spread, no Object.assign (T-46-04 prototype-pollution defence)"

patterns-established:
  - "Per-resource-type summary registry: typed switch + cast-inside-case + per-type pure function returning { primary, secondary? }; default branch falls through to generic walker"
  - "djb2 base36-6 hash for short stable display IDs (deterministic, 36^6 namespace, padStart(6,'0') for fixed width)"
  - "Module-private classifier helpers (isLabObservation, isShortAlphanumeric) kept unexported when only one caller needs them"

requirements-completed: [NAV-01]

# Metrics
duration: ~10 min
completed: 2026-05-01
---

# Phase 46 Plan 01: Build summarizeResource Util Summary

**Pure-function `summarizeResource(r, now?) -> { primary, secondary? }` registry over 8 typed R4 resource types + generic walker + djb2 hash, with 52 vitest cases pinning sub-decisions A1/A2/A3 — foundation for v1.7 Phases 47/48/49.**

## Performance

- **Duration:** ~10 min
- **Started:** 2026-05-01T14:02:00Z (approximate; recorded after worktree base reset)
- **Completed:** 2026-05-01T14:12:52Z
- **Tasks:** 3 (all TDD: RED -> GREEN per task)
- **Files created:** 2 (`src/utils/summarizeResource.ts`, `src/utils/__tests__/summarizeResource.test.ts`)
- **Files modified:** 0

## Accomplishments

- Pure `summarizeResource(r, now?) -> { primary, secondary? }` shipped — single module, deterministic, no I/O / no clock / no RNG. Test suite asserts call-twice equality.
- 8 typed helpers cover Patient (name + age + gender; identifier hash fallback for D-03), Observation (lab/non-lab dispatch with middot separator), Condition, Encounter (defensive `class` chain), MedicationStatement (medicationReference.display literal — no resolution), Procedure, DiagnosticReport (issued > effectiveDateTime), AllergyIntolerance (category[0] > type).
- Generic 7-step walker handles the long tail: code -> type -> category -> name -> description -> identifier -> id (D-11/D-12).
- djb2 base36-6 hash implemented + documented "NOT cryptographic — display label only" per T-46-02.
- 52 vitest cases written test-first; sub-decisions A1/A2/A3 pinned by byte-string assertions; D-12 enforced via `'secondary' in result === false`.
- Full vitest suite: **1292 passing** (from 1240 baseline; +52 new). `npx tsc -b --noEmit` exits 0. `npm run build` clean.

## Task Commits

Each task was committed atomically (TDD test+source merged into a single feat commit per task; per-RED/per-GREEN split was the alternative but each task contributes a coherent unit of behavior so single commits keep the log readable):

1. **Task 1: Skeleton + interface + djb2 + helpers + summarizePatient** — `e88da9a` (feat)
   - New module + new test file. Patient implementation, 4 helpers (formatHumanName/isShortAlphanumeric/genderToChar/fullYearsBetween), djb2Base36Six. 21 Patient-tagged tests pass; 7 typed + generic remain stubs.
2. **Task 2: 7 typed helpers (Observation lab/non-lab + 6 others)** — `23a1c29` (feat)
   - Replaced all 7 stubs with full implementations + module-private isLabObservation classifier. Added 7 describe blocks + lab classification block to test file. Middot byte string `'5.4 mmol/L · Glucose'` pinned (U+00B7).
3. **Task 3: Generic walker + full-suite gate** — `315d38a` (feat)
   - Replaced summarizeGeneric stub with full 7-step precedence walker. Added 10-test generic describe block (Specimen/Practitioner/Device/Location fixtures — none in registry). Final gate: 1292 passing, build clean, tsc clean.

## Files Created/Modified

- `src/utils/summarizeResource.ts` (NEW, 328 LOC) — registry + 8 typed helpers + generic walker + djb2 + 4 helpers + Summary interface + summarizeResource public export.
- `src/utils/__tests__/summarizeResource.test.ts` (NEW, 686 LOC, 52 tests) — Patient (3 describes: 21 tests), Observation, Condition, Encounter, MedicationStatement, Procedure, DiagnosticReport, AllergyIntolerance, lab classification, generic fallback (10 tests).

## Decisions Made

All decisions follow the plan exactly. The plan's `<action>` blocks specified verbatim implementations for every helper; this execution adopted them byte-for-byte. The only adjustments were:

- **Imports:** I temporarily removed `CodeableConcept` from the import list during Task 2 (TS6196 unused) and re-added it for Task 3. The plan's Task 1 skeleton imported CodeableConcept up-front, which would have failed `noUnusedLocals` after Task 1's stubs lacked walker code; this is a build-order accommodation, not a behavioural change.
- **`_typeAnchor` workaround:** Task 1 also briefly used a `void _ccAnchor` to keep `CodeableConcept` alive across the stubs → removed in Task 2 once the import was deleted, then re-instated cleanly in Task 3 by actual usage. No surface impact on the public API.

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered

- **Worktree branch base mismatch (resolved before any code work).** The worktree branch was created from `a20f2c3` (current main) instead of `95b08307` (the expected feature-branch HEAD per the bootstrap instructions). Per the documented Windows-known-issue protocol, the branch was reset to `95b08307` via `git reset --soft`; restoring the phase 46 planning files via `git checkout HEAD -- .planning/`. Net effect: zero — the working tree was already empty, the .planning files were restored from HEAD's tree, and execution proceeded normally. No code work was lost.
- **Pre-existing test failure (NOT a regression).** `npm test` reports 1 failing test: deuteranopia pair #13 (`kardiologie ↔ mikrobiologie`, ΔE2000 = 1.406 < 5). This is the documented carry-over from Phase 40 / DEUT-01 captured in the v1.6 phases 42 / 43 / 44 deferred-items.md ledgers and tracked in PROJECT.md `Last updated 2026-04-29` paragraph. The plan's baseline of 1240 nominally allowed 1 known failure; my contribution is exactly +52 new passing tests (1239 + 1 fail + 52 = 1292 + 1 fail).

## Verification Commands Run

```bash
# Task 1 gates
npx tsc -b --noEmit                                                 # exit 0
npx vitest run src/utils/__tests__/summarizeResource.test.ts -t "Patient"  # 21 passed

# Task 2 gates
npx tsc -b --noEmit                                                 # exit 0
npx vitest run src/utils/__tests__/summarizeResource.test.ts -t "Observation"        # 6 passed
npx vitest run src/utils/__tests__/summarizeResource.test.ts -t "Condition"          # 2 passed
npx vitest run src/utils/__tests__/summarizeResource.test.ts -t "Encounter"          # 3 passed
npx vitest run src/utils/__tests__/summarizeResource.test.ts -t "MedicationStatement"# 3 passed
npx vitest run src/utils/__tests__/summarizeResource.test.ts -t "Procedure"          # 1 passed
npx vitest run src/utils/__tests__/summarizeResource.test.ts -t "DiagnosticReport"   # 2 passed
npx vitest run src/utils/__tests__/summarizeResource.test.ts -t "AllergyIntolerance" # 2 passed
npx vitest run src/utils/__tests__/summarizeResource.test.ts -t "lab"                # 8 passed (cross-cuts Observation block)

# Task 3 final full-suite gate
npx tsc -b --noEmit                                                 # exit 0
npx vitest run src/utils/__tests__/summarizeResource.test.ts        # 52 passed
npm test                                                            # 1292 passed | 22 todo | 1 failed (pre-existing deuteranopia pair #13)
npm run build                                                       # exit 0; built in 612ms
```

## Sub-Decision Confirmation

| Sub-decision | Pin | Test asserts |
| --- | --- | --- |
| **A1** | `gender 'other' -> 'O'` (NOT 'U') | `expect(result.primary).toContain('(45/O)')` + `endsWith('(45/O)')` for Patient `birthDate: '1981-01-15'`, gender `'other'`, `now: 2026-05-01` |
| **A2** | partial `birthDate` (length < 10) -> omit parenthetical | `expect(result.primary).toBe('Mueller, Anna')` for `birthDate: '2026'` AND `'2026-05'`; secondary still passes through verbatim |
| **A3** | HumanName legacy comma-join `family, given1, given2` | `expect(result.primary).toBe('Mueller, Anna, Maria (68/F)')` for `family: 'Mueller', given: ['Anna', 'Maria']` |

## Threat Surface Scan

No new surface beyond the plan's `<threat_model>`:
- T-46-01 (Tampering — undefined fields): mitigated via `?.` chaining + `??` fallbacks; tests cover undefined birthDate / gender / identifier / class.
- T-46-02 (Information Disclosure — djb2 misuse): JSDoc carries "NOT cryptographic — display label only. Never use for auth or integrity." Verified by grep.
- T-46-03 (DoS — ReDoS): regex `/^[A-Za-z0-9]+$/` is linear (no backreferences, no nested quantifiers). Safe.
- T-46-04 (Tampering — prototype pollution): walker uses bracket access ONLY; verified by grep — no `...obj`, no `Object.assign` in code (only documentation references in JSDoc, which use different wording to avoid grep false positives).
- T-46-05 (Information Disclosure — PHI in fixtures): All test fixtures use synthetic names ('Mueller', 'Anna', 'Doe', 'Smith'), synthetic OIDs (`urn:oid:1.2.3.4.5.6.7.8.9`), synthetic IDs (`p1`, `pat-xyz-001`).
- T-46-06 (XSS): out of scope for this plan (PLAN 02 + Phases 47/48/49 render the strings via Mantine `<Text>` / `<Anchor>` text-node escaping).

No threat flags raised.

## Next Phase Readiness

- **Plan 02 (migrate-call-sites) is unblocked.** Public API `summarizeResource(r).primary` is locked; the 3 inline duplicate implementations across SearchResultsPage / FhirResourcesView / MiiModuleTab can now be replaced with a single call site each.
- **Phases 47/48/49 contract met.** `{ primary, secondary? }` shape stable; deterministic for fixed `now`; pure (no resolution); covers all 8 named MII Kerndatensatz types + generic walker for the long tail.

## Self-Check: PASSED

Verified files exist:
- `src/utils/summarizeResource.ts` — FOUND (328 LOC).
- `src/utils/__tests__/summarizeResource.test.ts` — FOUND (686 LOC, 52 it() blocks).

Verified commits exist:
- `e88da9a` — FOUND (Task 1).
- `23a1c29` — FOUND (Task 2).
- `315d38a` — FOUND (Task 3).

---
*Phase: 46-theme-a-foundation-summary-util*
*Plan: 01*
*Completed: 2026-05-01*
