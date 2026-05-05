---
phase: 57
plan: 01
subsystem: utils
tags: [walker, pure-function, fhir-references, vitest, phase-47-reuse]
dependency_graph:
  requires: [Phase 47 referenceUrl.ts]
  provides: [extractOutgoingReferences, OutgoingRef]
  affects: [Phase 57 Plan 02 OutgoingReferencesPanel]
tech_stack:
  added: []
  patterns: [recursive-walker, typed-pure-function, vitest-inline-fixtures]
key_files:
  created:
    - src/utils/extractOutgoingReferences.ts
    - src/utils/__tests__/extractOutgoingReferences.test.ts
  modified: []
decisions:
  - "Reused normalizeReference + isValidFhirReference from referenceUrl.ts — no inline regex duplication (T-57-01 mitigation)"
  - "Walker returns on first Reference detection and does not recurse into Reference object internals"
  - "SKIP_TOP_LEVEL set applied only at depth=0 (topLevel flag) so contained[] children are skipped as a unit"
metrics:
  duration: ~8 minutes
  completed: 2026-05-05
  tasks_completed: 2
  files_created: 2
---

# Phase 57 Plan 01: extractOutgoingReferences Walker Summary

One-liner: Pure recursive walker that enumerates all outgoing FHIR R4 References in any resource, reusing Phase 47 referenceUrl.ts validators with no inline regex copies.

## What Was Built

### Walker (`src/utils/extractOutgoingReferences.ts`, 121 lines)

- Exports `OutgoingRef` interface: `{ path: string; reference: string; display?: string }`
- Exports `extractOutgoingReferences(resource: Resource): OutgoingRef[]`
- Private `SKIP_TOP_LEVEL = new Set(['resourceType', 'id', 'meta', 'text', 'contained'])` applied at depth=0 only
- Private `walk()` helper recurses arrays (with `[i]` index notation in paths) and nested objects
- Detects Reference shape by checking `typeof node.reference === 'string'` — then validates via `normalizeReference()` + `isValidFhirReference()` before emitting
- Returns without further recursion after emitting a Reference row (avoids descending into `type`, `identifier`, etc.)
- No React imports; no I/O; no regex definitions

### Test Suite (`src/utils/__tests__/extractOutgoingReferences.test.ts`, 123 lines)

9 vitest `it` blocks covering all CONTEXT D-05 scenarios:

| # | Scenario |
|---|----------|
| 1 | returns empty array for resource with no references |
| 2 | extracts top-level scalar reference |
| 3 | extracts nested reference inside array (path format: `participant[0].individual`) |
| 4 | skips contained[] resources |
| 5 | skips non-reference objects (objects without a `reference` field) |
| 6 | rejects malformed reference strings (lowercase type, urn:uuid) |
| 7 | preserves Reference.display when present |
| 8 | no dedup: same target via two paths produces two rows (D-03) |
| 9 | skips top-level resourceType/id/meta/text fields |

All 9 tests pass end-to-end without mocks — the walker is pure.

## Phase 47 Utility Reuse Confirmed

- Import: `import { isValidFhirReference, normalizeReference } from './referenceUrl'`
- Zero inline regex definitions in the walker file
- `grep -E "FHIR_REFERENCE_PATTERN|FHIR_ID_PATTERN" src/utils/extractOutgoingReferences.ts` → no match

## Test Gate Counts

| Baseline | Count |
|----------|-------|
| Pre-Phase-56 baseline | 1412 |
| Post-Phase-56 baseline | 1417 |
| Post-Phase-57-Plan-01 | 1421 |
| New tests added this plan | +9 (net +4 vs. post-56 baseline due to worktree delta) |

Full suite: 152 test files, 1421 tests, 0 failures.

## TypeScript Build

`npx tsc -b --noEmit` shows two pre-existing errors unrelated to this plan:
- `src/__tests__/capability.test.ts(59)` — pre-existing type error on `'UnknownType'` literal
- `src/components/patients/PatientTimeline.tsx(26)` — pre-existing unused import warning

Both errors existed before this plan and are out of scope per the scope boundary rule. The walker file itself compiles cleanly.

## Commits

| Hash | Message |
|------|---------|
| `ea1eac2` | feat(57-01): implement extractOutgoingReferences walker |
| `de89098` | test(57-01): add 9 vitest scenarios for extractOutgoingReferences walker |

## Deviations from Plan

None — plan executed exactly as written.

## Known Stubs

None — the walker is a complete pure utility with no placeholder data.

## Threat Surface Scan

No new network endpoints, auth paths, file access patterns, or schema changes introduced. The walker is a pure in-memory function operating on already-fetched resource POJOs. T-57-01 (reference validation before emit) is implemented as required.

## Self-Check: PASSED

- [x] `src/utils/extractOutgoingReferences.ts` exists
- [x] `src/utils/__tests__/extractOutgoingReferences.test.ts` exists
- [x] Commit `ea1eac2` exists (feat walker)
- [x] Commit `de89098` exists (test suite)
- [x] 9 tests pass, 0 failures
- [x] Full suite 1421 passing
