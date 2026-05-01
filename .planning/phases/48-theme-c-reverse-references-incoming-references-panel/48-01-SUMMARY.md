---
phase: 48-theme-c-reverse-references-incoming-references-panel
plan: 01
subsystem: fhir
tags: [fhir, catalog, reverse-references, vitest, REVR-01, typescript-as-const-satisfies]

# Dependency graph
requires:
  - phase: 47
    provides: ResourceDetailPage Tabs container that Plan 48-03 will mount the new panel below; useReferenceResolver cache (NOT consumed per D-18)
provides:
  - Typed `reverseReferenceCatalog` const (9 source-type keys) at `src/utils/reverseReferenceCatalog.ts`
  - `ReverseReferenceEntry` and `ReverseReferenceCatalog` type exports
  - Vitest drift-detection suite locking in 9-keys / Patient=11-entries / RESEARCH §1 corrections
affects:
  - 48-02 (RelatedResourcesPanel + IncomingReferencesPanel — imports the catalog + types)
  - 48-03 (PatientRelatedResources refactor — replaces inline RELATED_TYPES with `reverseReferenceCatalog.Patient`)
  - 49 (ResourceGraphView G1 incoming-edge discovery — same catalog feeds the graph builder)

# Tech tracking
tech-stack:
  added: []  # zero new dependencies — pure TypeScript const + vitest test
  patterns:
    - "TS 4.9+ `as const satisfies T` for catalog-as-frozen-typed-const"
    - "`Partial<Record<ResourceType, readonly EntryT[]>>` for incrementally-grown FHIR-type lookup tables (no need to enumerate all 144 R4 types)"
    - "Wider-typed view (`const catalog: T = literalConst`) inside test files to escape literal narrowing for runtime drift-detection assertions"

key-files:
  created:
    - src/utils/reverseReferenceCatalog.ts
    - src/utils/__tests__/reverseReferenceCatalog.test.ts
  modified: []

key-decisions:
  - "Adopt `as const satisfies ReverseReferenceCatalog` (TS 4.9+ idiom) — preserves literal narrowing for downstream inference while compile-checking against the schema"
  - "Use `Partial<Record<ResourceType, readonly ReverseReferenceEntry[]>>` to allow incremental coverage growth without enumerating all 144 R4 ResourceType variants"
  - "Drop `{ MedicationStatement, 'reason-reference' }` from Condition source list (RESEARCH §1.b — SearchParameter does not exist in R4; Blaze silently drops the param and returns the unfiltered count, producing misleading numbers)"
  - "Keep `{ MedicationStatement, 'context' }` in Encounter source list (RESEARCH §1.a — R4 uses `context` not `encounter` for MedicationStatement encounter linkage)"
  - "Test file introduces a wider-typed `catalog: ReverseReferenceCatalog` view so runtime negative-find assertions and icon-undefined loops compile against the satisfies schema (the literal const correctly narrows them away at the type level — but the runtime test is the drift-detection guarantee for future edits that might re-introduce the bad entries)"

patterns-established:
  - "Catalog-as-frozen-typed-const at `src/utils/`: future curated FHIR-domain lookup tables (e.g. forward-reference catalog, slot/extension catalogs) should follow the same `as const satisfies Partial<Record<ResourceType, …>>` shape and live alongside the catalog"
  - "Drift-detection vitest pattern: hard-code regression baselines (e.g. Patient=11-entries) and negative assertions for known-invalid-but-tempting entries (e.g. `MedicationStatement.reason-reference`) — the test catches a developer re-adding a wrong entry from the original CONTEXT proposal without re-checking the SearchParameter registry"

requirements-completed: [REVR-01]

# Metrics
duration: ~3 min
completed: 2026-05-01
---

# Phase 48 Plan 01: reverseReferenceCatalog Summary

**Curated reverse-reference catalog (9 source-type keys, Patient=11 entries byte-identical to existing RELATED_TYPES) exported as a frozen `as const satisfies ReverseReferenceCatalog` with RESEARCH §1 SearchParameter corrections baked in.**

## Performance

- **Duration:** ~3 min
- **Started:** 2026-05-01T17:43:00Z (approximate, agent spawn)
- **Completed:** 2026-05-01T17:46:15Z
- **Tasks:** 2 (TDD: RED + GREEN; no REFACTOR step needed)
- **Files modified:** 2 (both new)

## Accomplishments

- Single source of truth for reverse-reference search parameters established at `src/utils/reverseReferenceCatalog.ts` — Plan 48-02 (RelatedResourcesPanel + IncomingReferencesPanel) and Plan 48-03 (PatientRelatedResources refactor) can now import without duplicating data.
- 9 source-type keys covered: Patient, Observation, Condition, Encounter, MedicationStatement, Procedure, DiagnosticReport, AllergyIntolerance, Practitioner — locked by D-03.
- Patient catalog entry preserves all 11 emoji-bearing entries from existing `PatientRelatedResources.RELATED_TYPES` byte-identical (D-09 / D-19 regression baseline).
- RESEARCH §1 corrections to D-03 enforced both at code and at test level:
  - Dropped invalid `{ MedicationStatement, 'reason-reference' }` (would have caused Blaze to silently return unfiltered counts).
  - Kept correct `{ MedicationStatement, 'context' }` in Encounter source list.
- Vitest drift-detection suite (7 tests, all green) locks the catalog shape against future edits.

## Task Commits

Each task was committed atomically (parallel-executor convention: `--no-verify`):

1. **Task 1: Write reverseReferenceCatalog.test.ts (RED)** — `1617f3e` (test)
2. **Task 2: Write reverseReferenceCatalog.ts source (GREEN)** — `5383310` (feat)

_Note: Task 2's commit also includes a small refinement to the test file (the wider-typed `catalog` view) needed for tsc to accept the runtime negative-find assertions against the literal-narrowed const. This is the standard GREEN pairing — source + test passing together._

## Files Created/Modified

- `src/utils/reverseReferenceCatalog.ts` — typed const catalog mapping 9 source FHIR resource types → arrays of `{type, param, icon?}` reverse-reference targets; exports `ReverseReferenceEntry` and `ReverseReferenceCatalog` type aliases. 89 lines.
- `src/utils/__tests__/reverseReferenceCatalog.test.ts` — 7-test vitest suite covering D-14 contract: 9 keys, Patient=11 regression baseline, non-Patient minimum, ResourceType-shaped types, RESEARCH §1.a/§1.b correction enforcement (positive + negative), D-09 icon-omission default. 132 lines.

## Decisions Made

See `key-decisions` frontmatter — five decisions, the substantive ones:

1. **TS 4.9+ `as const satisfies` idiom** — preserves literal narrowing for downstream inference (e.g. `reverseReferenceCatalog.Patient` is typed with the actual 11-entry tuple rather than `readonly ReverseReferenceEntry[] | undefined` widened) while still compile-checking entries against `ReverseReferenceCatalog`.
2. **`Partial<Record<ResourceType, …>>`** — allows incrementally growing source-type coverage without TypeScript demanding all 144 R4 types enumerated.
3. **Wider-typed view inside the test file** — needed because the literal narrowing of `as const satisfies` makes the negative-find assertions (`condition.find(e => e.type === 'MedicationStatement')`) a tsc TS2367 error, since tsc statically knows MedicationStatement is not in Condition's narrowed entry union. The runtime test still has value as drift-detection for future edits, so casting through the wider `ReverseReferenceCatalog` view preserves both static and runtime safety.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug in test code] Wider-typed `catalog` view added to test file**
- **Found during:** Task 2 verification (`npx tsc -b --noEmit` returned exit 2)
- **Issue:** The literal-narrowing of `as const satisfies` made three test-file expressions tsc-invalid: (a) `condition.find(e => e.type === 'MedicationStatement' && …)` — TS2367 because the literal type for Condition's entries does not include MedicationStatement (which is the whole point — but tsc is strict); (b) `condition.find(...).param` — TS2339 because the narrowed type was `never`; (c) `entry.icon` access in the non-Patient loop — TS2339 because the narrowed entry tuples literally lack the optional `icon` property.
- **Fix:** Introduced `const catalog: ReverseReferenceCatalog = reverseReferenceCatalog;` at the top of the test file and routed the three offending assertions through `catalog` plus `as readonly ReverseReferenceEntry[]` casts. The runtime semantics are identical; tsc now accepts the assertions because they go through the wider satisfies-schema view.
- **Files modified:** `src/utils/__tests__/reverseReferenceCatalog.test.ts`
- **Verification:** `npx vitest run …reverseReferenceCatalog.test.ts` → 7/7 pass; `npx tsc -b --noEmit` → exit 0
- **Committed in:** `5383310` (Task 2 commit, paired with the catalog source)

---

**Total deviations:** 1 auto-fixed (Rule 1 — test-code bug)
**Impact on plan:** No scope creep. Fix preserves the exact test coverage the plan specified; only the type-level routing changed.

## Issues Encountered

None beyond the auto-fixed Rule 1 above. The catalog itself compiled clean on first try.

## User Setup Required

None — pure TypeScript const + test file. No external services, no env vars, no dashboard configuration.

## Next Phase Readiness

- **Plan 48-02** can now `import { reverseReferenceCatalog, type ReverseReferenceEntry, type ReverseReferenceCatalog } from '../../utils/reverseReferenceCatalog'` and build `RelatedResourcesPanel` + `IncomingReferencesPanel` against the typed surface.
- **Plan 48-03** can replace `RELATED_TYPES` inline in `PatientRelatedResources.tsx` with `reverseReferenceCatalog.Patient ?? []` and the existing 11-entry behavior is guaranteed byte-identical by the regression-baseline test.
- **Phase 49** (ResourceGraphView) can consume the same catalog for G1 incoming-edge discovery — no changes needed when that phase lands.

## Self-Check: PASSED

- `src/utils/reverseReferenceCatalog.ts` — FOUND
- `src/utils/__tests__/reverseReferenceCatalog.test.ts` — FOUND
- Commit `1617f3e` (Task 1 RED test) — FOUND
- Commit `5383310` (Task 2 GREEN catalog + test refinement) — FOUND
- `npx vitest run src/utils/__tests__/reverseReferenceCatalog.test.ts` — 7/7 pass, exit 0
- `npx tsc -b --noEmit` — exit 0
- 9 catalog keys present (verified via grep)
- 0 entries with `MedicationStatement.reason-reference` (verified via grep — comments-only references retained for traceability)
- 1 entry with `MedicationStatement.context` in Encounter source list (verified via grep)
- Patient entry has 11 entries (verified via test assertion)

---

*Phase: 48-theme-c-reverse-references-incoming-references-panel*
*Completed: 2026-05-01*
