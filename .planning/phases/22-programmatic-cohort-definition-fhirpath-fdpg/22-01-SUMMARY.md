---
phase: 22-programmatic-cohort-definition-fhirpath-fdpg
plan: 01
subsystem: cohort-resolver
tags: [fhirpath, translator, cohort, resolver, medplum-ast, chrt-05]

requires:
  - phase: 21-interactive-cohort-builder
    provides: "CohortDefinition/CohortsStorage types, cohortResolver module-scoped cache keyed on cohort.id+updatedAt, collectSubjectPatientIds paginated collector"
provides:
  - translateFhirpath — parse + validate FHIRPath D-02 subset via Medplum AST
  - translatedQueryToFhirSearchUrl — structured-query → FHIR search URL path
  - dryRunCount — Validate-button count check via client.search + _summary=count
  - TranslationError — subclass of Error for UI result-row display
  - SEARCH_PARAM_MAP + PREFIX_FOR_OPERATOR — curated lookup tables (4 resources × 6 operators)
  - FhirpathCriterion — 4th variant of CohortCriterion discriminated union
  - cohortResolver fhirpath branch — routes Patient searches through new collectIdField; non-Patient through existing collectSubjectPatientIds
  - collectIdField — sibling of collectSubjectPatientIds for Patient-rooted FHIRPath queries
affects:
  - Plan 22-03 (UI wiring) — FhirpathCriterionCard's Validate button handler calls translateFhirpath + translatedQueryToFhirSearchUrl + dryRunCount
  - Plan 22-02 (FDPG codec) — shares the CohortCriterion union (FhirpathCriterion is a no-op for FDPG export per research §Pattern 5 hard limitation note)
  - Any future phase adding a 5th CohortCriterion variant — _exhaustive: never tail in resolveCriterion will force an explicit branch

tech-stack:
  added: []
  patterns:
    - "Hand-curated SEARCH_PARAM_MAP over dynamic FHIR R4 SearchParameter bundle (30-row table vs multi-MB download)"
    - "Explicit if-cascade + const _exhaustive: never = c tail for discriminated-union exhaustiveness in async functions (preferred over switch when branches need await)"
    - "AndAtom/OrAtom special-case BEFORE generic 'Unsupported clause type' branch so composition errors produce precise UI messaging"

key-files:
  created:
    - src/quality/fhirpathTranslator.ts
    - src/quality/fhirpathTranslator.test.ts
  modified:
    - src/quality/cohorts.ts
    - src/quality/cohorts.test.ts
    - src/quality/cohortResolver.ts
    - src/quality/cohortResolver.test.ts

key-decisions:
  - "Translator AST walk special-cases AndAtom/OrAtom BEFORE generic Unsupported-clause-type check so composition produces the verbatim 22-UI-SPEC §S7 Composition error string — Medplum parses `Resource.where(a and b)` as a valid single .where() with an AndAtom inside, not as top-level composition"
  - "Resolver re-translates on every resolve rather than consuming the UI's cached translatedQuery field — keeps the resolver deterministic and self-contained (same behaviour whether the cohort was just validated in-editor or loaded from storage)"
  - "collectIdField is a sibling function (not a parameterised collectSubjectPatientIds) because the two helpers read different extraction paths (r.id vs r.subject.reference) with different malformed-data semantics (Patient without id = silent skip; Condition without subject = silent skip + count malformed)"
  - "assertNever tail uses `const _exhaustive: never = c;` + throw, not an explicit switch default — this pattern works for if-cascades where switch statement typing would not narrow correctly through async branches"

patterns-established:
  - "Pattern 1: Medplum parseFhirPath AST walk with instanceof chain (AndAtom/OrAtom → composition error, EqualsAtom/NotEqualsAtom → =/!=, ArithemticOperatorAtom → </=</>/>=, else → unsupported clause type)"
  - "Pattern 2: TranslatedQuery → FHIR search URL via hand-curated SEARCH_PARAM_MAP with type-compatibility gating (range prefixes only on date/number/quantity params)"
  - "Pattern 3: dryRunCount / resolver branch always pass params object to MedplumClient.search + searchResourcePages — never hand-build URL strings (T-22-02 mitigation)"

requirements-completed: [CHRT-05]

duration: 9min
completed: 2026-04-16
---

# Phase 22 Plan 01: FHIRPath Translator + CohortCriterion Fhirpath Branch Summary

**FHIRPath AST-to-FHIR-search-URL translator and cohortResolver fhirpath branch — both foundations for CHRT-05 programmatic cohort definitions ship with full test coverage and a 10K-ID cap, ready for the Plan 22-03 UI layer.**

## Performance

- **Duration:** ~9 min
- **Started:** 2026-04-16T12:58:23Z
- **Completed:** 2026-04-16T13:06:51Z
- **Tasks:** 3 completed
- **Files modified:** 6 (2 new, 4 extended)

## Accomplishments

- `translateFhirpath` parses the D-02 locked subset `<Resource>.where(<fieldPath> <op> <literal>)` via Medplum's `parseFhirPath` AST and rejects every non-whitelisted shape with the 13 verbatim error strings from 22-UI-SPEC §S7 Translator error catalog
- `translatedQueryToFhirSearchUrl` emits correct FHIR R4 search URLs for all 6 operators across the 4 supported resource types (Patient, Condition, Observation, Encounter — 25 field mappings total) with operator/type-compatibility gating
- `CohortCriterion` is now a 4-variant discriminated union; `cohortResolver.resolveCriterion` handles all 4 via explicit if-cascade + `const _exhaustive: never = c;` tail
- Resolver `fhirpath` branch routes Patient searches through the new `collectIdField` helper and non-Patient searches through the existing Phase-21 `collectSubjectPatientIds`, inheriting the 10K-ID cap and D-10 cache-invalidation contract

## Task Commits

Each task was committed atomically (TDD RED+GREEN pairs):

1. **Task 1: FHIRPath translator + tests** — `d0badf9` (test RED) + `fd935ab` (feat GREEN)
2. **Task 2: CohortCriterion FhirpathCriterion variant + type test** — `1031ed3` (feat+test atomic)
3. **Task 3: cohortResolver fhirpath branch + collectIdField + tests** — `9ed4356` (test RED) + `102d6ab` (feat GREEN)

## Files Created/Modified

- `src/quality/fhirpathTranslator.ts` (NEW, 439 lines) — `translateFhirpath`, `translatedQueryToFhirSearchUrl`, `dryRunCount`, `TranslationError`, `SEARCH_PARAM_MAP`, `PREFIX_FOR_OPERATOR`, `TranslatedQuery` type
- `src/quality/fhirpathTranslator.test.ts` (NEW, 298 lines) — 25 unit tests covering parse, translate, operator prefix, unsupported-syntax rejection, dry-run count mock, SEARCH_PARAM_MAP coverage
- `src/quality/cohorts.ts` (EXTENDED, +24 lines) — new `FhirpathCriterion` interface; `CohortCriterion` union widened to 4 variants
- `src/quality/cohorts.test.ts` (EXTENDED, +73 lines) — new `describe('FhirpathCriterion type', …)` block with `assertNever` exhaustiveness enforcement
- `src/quality/cohortResolver.ts` (EXTENDED, ~99 lines touched) — imports from `./fhirpathTranslator`; `resolveCriterion` rewritten as explicit if-cascade with fhirpath branch + `_exhaustive: never` tail; new `collectIdField` helper
- `src/quality/cohortResolver.test.ts` (EXTENDED, +201 lines) — 5 new tests: 2 for fhirpath branch (Patient collectIdField + Condition collectSubjectPatientIds), 1 for 10K-ID cap, 1 for TranslationError propagation, 1 for cache invalidation on updatedAt change

## Exports Surfaced to Downstream Plans

Plan 22-03 (UI wiring) will import these from `src/quality/fhirpathTranslator.ts` into the Validate button handler:

```typescript
import {
  translateFhirpath,
  translatedQueryToFhirSearchUrl,
  dryRunCount,
  TranslationError,
} from '../../quality/fhirpathTranslator';
```

The resolver's fhirpath branch is invoked transparently via the widened `CohortCriterion` union — no new import surface needed for Plan 22-02 / 22-03 consumers of `resolveCohort`.

## Decisions Made

1. **Composition inside `where()` is detected BEFORE the generic unsupported-clause-type branch.** Medplum's AST for `Patient.where(a and b)` is a valid single-.where() call with an `AndAtom` argument, not top-level composition. Special-casing `AndAtom`/`OrAtom` early produces the verbatim `Expression must be a single Resource.where(...) call. Composition (and / or) is not supported.` string required by 22-UI-SPEC §S7 — and required to pass the plan's specific test assertion.
2. **Resolver re-translates on every resolve, ignoring the cached `translatedQuery` field on `FhirpathCriterion`.** The cache field is a UI-only convenience (populated by a successful Validate click; cleared on edit). Re-translating keeps the resolver deterministic and self-contained: same behaviour whether the cohort was just validated in the editor or loaded from storage without visiting the editor. Translator is pure and cheap (~1ms), so the cost is negligible. Documented inline in `resolveCriterion`.
3. **`collectIdField` is a sibling helper rather than a parameterised `collectSubjectPatientIds`.** The two helpers read different extraction paths (`r.id` vs `r.subject.reference`) with different malformed-data handling (Patient without `id` = silent skip; Condition without `subject` = silent skip + malformed counter). Keeping them separate keeps each function short and avoids a "mode" flag.
4. **`const _exhaustive: never = c;` + throw tail chosen over `switch` with a `default: assertNever(c)` clause.** The if-cascade is necessary because every branch has an `await`; TS narrowing through `switch` works but the if-cascade reads cleaner and matches the precedent set by `translateFhirpath`'s AST walk.

## Medplum AST Gotchas Encountered

1. **AndAtom/OrAtom shape.** The plan's test "rejects and composition" initially failed because `Patient.where(a and b)` parses to `DotAtom(Symbol, FunctionAtom('where', [AndAtom(...)]))` — a valid single `.where()` call with an `AndAtom` *inside*. The naive implementation (which only knew about Equals/NotEquals/Arithemtic) hit the "Unsupported clause type" branch with a className of `"Nt"` (minified/mangled?). Fixed by importing `AndAtom`/`OrAtom` and special-casing them BEFORE the generic branch to throw the verbatim "Composition (and / or)" error.
2. **`ArithemticOperatorAtom` typo is real.** The class name is literally spelled with a typo in Medplum's `index.d.ts` (line 282: `ArithemticOperatorAtom extends BooleanInfixOperatorAtom`). We import it verbatim — renaming or aliasing would break `instanceof` checks (Pitfall 1).
3. **Pitfall 1 (instanceof across module boundaries) did NOT manifest** in this implementation. Single `@medplum/core` import at the top of both `fhirpathTranslator.ts` and `cohortResolver.ts` means Vite's module resolver uses one atom-class identity across both modules. If it had manifested, we'd have seen failures like "Unsupported clause type: Mt" (minified rename) in bundled builds. No such failures occurred in `vitest` (which uses Vite's resolver by default).

## Test Count Delta

- **New passing tests:** 31 (25 translator + 3 FhirpathCriterion type + 5 resolver fhirpath/cap/cache/propagation)
- **Plan-target suite:** 56/56 pass (`npx vitest run src/quality/fhirpathTranslator.test.ts src/quality/cohorts.test.ts src/quality/cohortResolver.test.ts`)
- **Phase-21 regression:** 0 new failures (existing resolver tests for date-range, condition-code, reference-list, cache, malformed-subject all still pass via the explicit if-cascade)
- **TypeScript:** `npx tsc --noEmit -p tsconfig.app.json` exits 0 on the touched files
- **Baseline:** 22 pre-existing failures elsewhere in `npm test` (per STATE.md) — not retested here; Wave-1 scope is the 3 files above

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 — Bug] AndAtom/OrAtom composition detection**

- **Found during:** Task 1 GREEN phase (first vitest run)
- **Issue:** The plan action step 6 only enumerated `EqualsAtom`/`NotEqualsAtom`/`ArithemticOperatorAtom` in the operator detection chain. A literal implementation failed the plan's own test `"rejects and composition"` because Medplum parses `Patient.where(a and b)` as a valid single `.where()` call with an `AndAtom` child — not as top-level composition. The fallback branch produced `"Unsupported clause type: Nt. Use field op literal."` instead of the verbatim composition string the plan mandated.
- **Fix:** Added `AndAtom` and `OrAtom` imports from `@medplum/core` and an explicit early-return check that throws the exact `"Expression must be a single Resource.where(...) call. Composition (and / or) is not supported."` string. Placed BEFORE the generic Equals/NotEquals/Arithemtic cascade so composition errors always produce the precise UI message.
- **Files modified:** `src/quality/fhirpathTranslator.ts`
- **Commit:** `fd935ab` (the fix was part of the initial GREEN implementation — the RED test already documented the expected behaviour)
- **Also added to research guidance (implicit):** Pattern 1 in `22-RESEARCH.md` only listed Equals/NotEquals/Arithemtic for its instanceof chain. Real plan execution revealed that the "composition (and/or)" error cannot flow from the top-level `child instanceof DotAtom` check because `a and b` doesn't change the top-level shape; it has to be detected one level deeper. Any Phase-22 plan that reuses this pattern needs the AndAtom/OrAtom pre-check.

### Authentication Gates

None encountered — all tests use mocked MedplumClient; no live server involved.

## Known Stubs

None. All added surface areas have concrete implementations with test coverage.

## Self-Check: PASSED

- [x] `src/quality/fhirpathTranslator.ts` exists (FOUND)
- [x] `src/quality/fhirpathTranslator.test.ts` exists (FOUND)
- [x] `src/quality/cohorts.ts` contains `FhirpathCriterion` (FOUND)
- [x] `src/quality/cohorts.test.ts` contains `'FhirpathCriterion type'` describe block (FOUND)
- [x] `src/quality/cohortResolver.ts` contains `from './fhirpathTranslator'` import (FOUND)
- [x] `src/quality/cohortResolver.ts` contains `c.type === 'fhirpath'` branch (FOUND, line 152)
- [x] `src/quality/cohortResolver.ts` contains `_exhaustive: never` tail (FOUND, line 219)
- [x] `src/quality/cohortResolver.ts` contains `async function collectIdField` (FOUND, line 304)
- [x] `src/quality/cohortResolver.test.ts` contains `'resolves fhirpath criterion'` (3 occurrences)
- [x] `src/quality/cohortResolver.test.ts` contains `'cache invalidates on updatedAt'` (3 occurrences)
- [x] `src/quality/cohortResolver.test.ts` contains `'applies 10K-ID cap'` (2 occurrences)
- [x] Commit `d0badf9` exists (FOUND — test RED for translator)
- [x] Commit `fd935ab` exists (FOUND — feat GREEN for translator)
- [x] Commit `1031ed3` exists (FOUND — feat for FhirpathCriterion union)
- [x] Commit `9ed4356` exists (FOUND — test RED for resolver fhirpath branch)
- [x] Commit `102d6ab` exists (FOUND — feat GREEN for resolver fhirpath branch)
- [x] All 56 plan-target tests pass (`npx vitest run src/quality/fhirpathTranslator.test.ts src/quality/cohorts.test.ts src/quality/cohortResolver.test.ts` exits 0)
- [x] TypeScript clean (`npx tsc --noEmit -p tsconfig.app.json` exits 0)
