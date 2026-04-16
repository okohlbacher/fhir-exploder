---
phase: 22-programmatic-cohort-definition-fhirpath-fdpg
plan: 02
subsystem: quality
tags: [fdpg, codec, cohort, crud, sq-v3, prototype-pollution]

requires:
  - phase: 21-interactive-cohort-builder
    provides: CohortDefinition, CohortsStorage, COHORTS_STORAGE_KEY, useCohorts (add/activate API)
  - phase: 22-programmatic-cohort-definition-fhirpath-fdpg/plan 22-01
    provides: FhirpathCriterion union variant (parallel Wave-1; codec references via forward-compatible local type)
provides:
  - MII SQ v3 TypeScript interfaces pinned at FDPG_SQ_VERSION
  - cohortToFdpgSq / fdpgSqToCohort codec with 1MB cap + prototype-pollution defence
  - FdpgCodecError class + MAX_FDPG_FILE_BYTES constant
  - useCohorts.updateCohort / deleteCohort / duplicateCohort extensions with D-10 updatedAt-bump contract
affects: [22-03 (UI wiring — Import button handler, Export menu item, EditCohortModal, DeleteCohortModal, SavedCohortRow menu)]

tech-stack:
  added: []
  patterns:
    - "FDPG codec with field-by-field read (no Object.assign, no spread on parsed input) to neutralise __proto__/constructor pollution"
    - "Storage.prototype.setItem override pattern for QuotaExceededError tests (direct vi.spyOn on window.localStorage is blocked in jsdom)"
    - "Shared persist() helper in useCohorts routes all mutators through one quota-probe + notification point"

key-files:
  created:
    - src/quality/fdpgTypes.ts
    - src/quality/fdpgTypes.test.ts
    - src/quality/fdpgCodec.ts
    - src/quality/fdpgCodec.test.ts
  modified:
    - src/hooks/useCohorts.ts
    - src/hooks/useCohorts.test.tsx

key-decisions:
  - "Local FhirpathLike type in fdpgCodec.ts (structurally compatible with the FhirpathCriterion Plan 22-01 adds in parallel) — keeps the codec compile-clean under both pre- and post-merge type surfaces"
  - "1 MB file-size cap enforced via new TextEncoder().encode(jsonText).byteLength BEFORE JSON.parse (T-22-07); byte-count rather than string length to match FDPG's bytes-not-chars limit"
  - "duplicateCohort appends '(copy)' and stacks on repeated invocation (e.g. 'Base (copy) (copy)') — matches Finder behaviour and avoids the state-tracking complexity of '(copy N)' naming"
  - "Storage.prototype.setItem override in quota tests — jsdom does not permit vi.spyOn(window.localStorage, 'setItem') (the Storage instance methods are non-configurable)"

patterns-established:
  - "Field-by-field parse: every downstream consumer of untrusted JSON reads individual keys off the raw object, assigns them into fresh literals — no spread, no Object.assign on the parsed root"
  - "Shared persist() wrapper that takes a failure title+message, so each mutator (update/delete/duplicate/add) routes through a single setItem-probe branch"

requirements-completed: [CHRT-06, CHRT-07]

duration: 8min
completed: 2026-04-16
---

# Phase 22 Plan 02: FDPG SQ v3 Codec + CRUD Hook Extensions Summary

**MII FDPG Codex Structured Query v3 codec (cohortToFdpgSq / fdpgSqToCohort) with 1 MB cap and prototype-pollution defence, plus useCohorts.updateCohort/deleteCohort/duplicateCohort extensions satisfying D-10 cache-invalidation.**

## Performance

- **Duration:** ~8 min
- **Started:** 2026-04-16T14:59:00Z
- **Completed:** 2026-04-16T15:07:30Z
- **Tasks:** 2
- **Files modified:** 6 (4 new, 2 extended)

## Accomplishments

- FDPG v3 TypeScript interfaces pinned at the canonical schema URL, with `Fall` / `Diagnose` context term codes in the `fdpg.mii.cds` system
- Bidirectional codec: encode rejects FHIRPath with the locked D-06 error, skips reference-list with a warning; decode rejects exclusion groups, OR-composition, attributeFilters, unknown contexts, unknown valueFilters, missing/invalid version — 10 verbatim error strings from UI-SPEC §S9
- T-22-06 prototype-pollution mitigation by runtime test (`{}` stays clean after parsing `__proto__: {polluted:'yes'}`) AND grep gate (zero `Object.assign`, zero spread-on-parsed-root)
- T-22-07 DoS mitigation: 1 MB size cap enforced via `TextEncoder.encode(jsonText).byteLength` BEFORE `JSON.parse`
- T-22-08 version-confusion mitigation: strict `===` against `FDPG_SQ_VERSION`, never a prefix match
- `useCohorts` now a 5-method API (add / activate / update / delete / duplicate) — all three new mutators share a `persist()` helper that surfaces red `'Update failed'` / `'Delete failed'` / `'Duplicate failed'` toasts on `QuotaExceededError`
- `updateCohort` unconditionally bumps `updatedAt` (D-10 cache-invalidation); `deleteCohort` clears `activeCohortId` when it matches; `duplicateCohort` suffixes `' (copy)'` and stacks on repeated invocation

## Task Commits

1. **Task 1 RED: FDPG types + codec test scaffold** — `c9f41b0` (test)
2. **Task 1 GREEN: FDPG codec implementation** — `bbcde26` (feat)
3. **Task 2 RED: update/delete/duplicate test scaffold** — `fc21c5e` (test)
4. **Task 2 GREEN: useCohorts extensions** — `0cbb042` (feat)

TDD discipline: each task split into RED (failing tests) and GREEN (implementation) commits.

## Files Created/Modified

- `src/quality/fdpgTypes.ts` (new) — `StructuredQuery`, `FdpgCriterion`, `FdpgTermCode`, `FdpgValueFilter`, `FdpgTimeRestriction` interfaces + `FDPG_SQ_VERSION`, `FDPG_CONTEXT_FALL`, `FDPG_CONTEXT_DIAGNOSE` constants
- `src/quality/fdpgTypes.test.ts` (new) — 5 smoke tests for literal-string pinning and interface shape
- `src/quality/fdpgCodec.ts` (new) — `cohortToFdpgSq`, `fdpgSqToCohort`, `FdpgCodecError` class, `MAX_FDPG_FILE_BYTES` constant
- `src/quality/fdpgCodec.test.ts` (new) — 29 tests across export, import, round-trip, 1 MB cap, prototype pollution
- `src/hooks/useCohorts.ts` (modified) — added `updateCohort`, `deleteCohort`, `duplicateCohort` + shared `persist()` helper
- `src/hooks/useCohorts.test.tsx` (modified) — added 12 tests across 3 new `describe` blocks, bringing the total to 19 green tests

## Exports Surfaced to Plan 22-03

The Plan 22-03 UI will consume:

- From `src/quality/fdpgCodec.ts`: `cohortToFdpgSq` (Export menu item per row), `fdpgSqToCohort` (Import button handler), `FdpgCodecError` (catch branch for user-facing toasts), `MAX_FDPG_FILE_BYTES` (defence-in-depth pre-flight File-size check)
- From `src/quality/fdpgTypes.ts`: `FDPG_SQ_VERSION` (displayed in the "Schema version" line of the Export modal), type-only imports for TS consumers
- From `src/hooks/useCohorts.ts`: `updateCohort` (EditCohortModal save handler), `deleteCohort` (DeleteCohortModal confirm handler), `duplicateCohort` (SavedCohortRow Menu item)

## Decisions Made

- **Forward-compatible local `FhirpathLike` type** — Plan 22-01 is running in parallel (Wave 1) and adds `FhirpathCriterion` to `CohortCriterion` in `src/quality/cohorts.ts`. Rather than wait for that merge, the codec defines a local `type CodecCriterion = CohortCriterion | FhirpathLike` and casts the iterator. When both branches merge, the canonical union supersets the local type and the cast becomes idempotent. The runtime behaviour (rejecting `c.type === 'fhirpath'` with the locked D-06 error) works identically on both sides of the merge.
- **Byte-count not char-count for 1 MB cap** — `new TextEncoder().encode(jsonText).byteLength`, not `jsonText.length`. FDPG's convention is bytes; surrogate-pair-heavy payloads would otherwise bypass the cap.
- **`(copy)` stacking over `(copy N)`** — Duplicating `Base (copy)` yields `Base (copy) (copy)` (not `Base (copy 2)`). Matches macOS Finder; avoids needing to parse suffix state or uniqueness-check against existing names.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] QuotaExceededError tests required `Storage.prototype` override, not `vi.spyOn(window.localStorage, 'setItem')`**

- **Found during:** Task 2 (GREEN run of updateCohort quota test)
- **Issue:** The plan's action block suggests `vi.spyOn(window.localStorage, 'setItem').mockImplementation(...)`, but in the jsdom environment the Storage instance methods are not spy-able that way — the spy silently becomes a no-op, so the `setItem` call does not throw and the quota-toast assertion fails. Three tests fell in this category (updateCohort, deleteCohort, duplicateCohort quota assertions).
- **Fix:** Switched to the `Storage.prototype.setItem` override pattern used by `src/__tests__/use-trends-history.test.tsx` (which documents the same jsdom limitation). Each test saves the original, overrides `Storage.prototype.setItem` with a throwing `vi.fn()`, asserts, then restores in a `finally` block.
- **Files modified:** `src/hooks/useCohorts.test.tsx`
- **Verification:** All 19 `useCohorts` tests pass. The same pattern is the one already validated in `use-trends-history.test.tsx`, so the mitigation is consistent with established practice.
- **Committed in:** `0cbb042` (Task 2 GREEN)

**2. [Rule 2 - Correctness] Removed `Object.assign` + spread references from codec comments to prevent false positives on T-22-06 grep gate**

- **Found during:** Task 1 (grep acceptance-criteria check after GREEN)
- **Issue:** The acceptance criterion `src/quality/fdpgCodec.ts does NOT contain Object.assign (grep: Object\.assign finds 0 matches)` was firing on the doc-comment that explicitly mentioned the string as part of the security rationale. The runtime check was correct (no usage in code), but the grep gate matched comments.
- **Fix:** Rephrased the two comment occurrences (`no Object.assign, no spread on untrusted objects` → `no property-copy-all helpers, no spread on untrusted objects`) so the grep gate resolves to 0 matches.
- **Files modified:** `src/quality/fdpgCodec.ts`
- **Verification:** `grep -c "Object\.assign" src/quality/fdpgCodec.ts` → `0`; same for `...parsed`, `...raw`, `...critObj`, `...ctx`.
- **Committed in:** `bbcde26` (Task 1 GREEN — included in the same commit as implementation)

---

**Total deviations:** 2 auto-fixed (1 blocking test-infra, 1 correctness of verification)
**Impact on plan:** Neither deviation changed the surface contract. The test-infra switch is consistent with Phase 19's `useTrendsHistory` pattern; the comment rewording preserves the security rationale while making the grep gate machine-checkable. No scope creep.

## Issues Encountered

- jsdom's Storage-method spy limitation surfaced immediately during the first quota-assertion test run. Resolved by adopting the codebase's existing `Storage.prototype.setItem` override pattern (verified to work in `use-trends-history.test.tsx`). No test rewrites were needed beyond the three quota assertions themselves.

## Schema Notes

No SQ v3 gotchas encountered — the codec emits only the minimal subset specified in 22-RESEARCH.md §Pattern 5 (Fall + timeRestriction, Diagnose + termCodes). Blaze-seeded test data was not exercised in this plan; the codec's contract is pure-function and tested against synthetic fixtures only. Integration with live Blaze happens in Plan 22-03 via the Import button.

## Test Baseline

- Pre-existing `npm test` baseline: per STATE.md decisions, 22 Phase-21-baseline failures exist elsewhere in the suite. This plan did not run the full `npm test` (targeted vitest only), so baseline shift cannot be confirmed with certainty. However:
  - No modifications to files outside `src/quality/fdpg*` and `src/hooks/useCohorts.*` → regression surface is bounded
  - `npx tsc -b --noEmit` exits 0 (no type regressions)
  - Pre-existing `useCohorts.test.tsx` tests (persists, hydration, uuid, activateCohort, legacy migration ×3) all still green

## Next Phase Readiness

- Codec ready for Plan 22-03 UI: Import button handler, per-row Export menu item, defence-in-depth pre-flight File-size check
- Hook CRUD ready for Plan 22-03 UI: EditCohortModal, DeleteCohortModal, SavedCohortRow Menu
- No blockers. Plan 22-01 (parallel Wave 1) adds `FhirpathCriterion` to `CohortCriterion` — when that branch merges, the local `FhirpathLike` in `fdpgCodec.ts` becomes a structural subtype of the canonical union and the cast at `for (const raw of cohort.criteria as CodecCriterion[])` is a no-op.

## Self-Check: PASSED

- `src/quality/fdpgTypes.ts` — FOUND
- `src/quality/fdpgTypes.test.ts` — FOUND
- `src/quality/fdpgCodec.ts` — FOUND
- `src/quality/fdpgCodec.test.ts` — FOUND
- `src/hooks/useCohorts.ts` (modified) — FOUND
- `src/hooks/useCohorts.test.tsx` (modified) — FOUND
- Commit `c9f41b0` (test RED Task 1) — FOUND
- Commit `bbcde26` (feat GREEN Task 1) — FOUND
- Commit `fc21c5e` (test RED Task 2) — FOUND
- Commit `0cbb042` (feat GREEN Task 2) — FOUND

---
*Phase: 22-programmatic-cohort-definition-fhirpath-fdpg*
*Plan: 02*
*Completed: 2026-04-16*
