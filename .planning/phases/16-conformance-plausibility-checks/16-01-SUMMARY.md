---
phase: 16-conformance-plausibility-checks
plan: 01
subsystem: quality-engine
tags: [conformance, validation, value-set, profile, TDD]
dependency_graph:
  requires: []
  provides:
    - profileConformanceChecker (validateConformance, ConformanceIssue, normalizeConformanceIssues)
    - ValueSetCache ($expand caching with request coalescing)
    - Enriched MII profile JSONs (max, type, binding metadata)
  affects:
    - src/quality/profiles/index.ts (unchanged, but enriched JSONs flow through it)
    - structuralValidator.ts (not modified, remains as deprecated fallback)
tech_stack:
  added: []
  patterns:
    - In-memory cache with concurrent request coalescing (ValueSetCache)
    - Single-pass multi-check validation walker (profileConformanceChecker)
    - TDD RED/GREEN for both modules
key_files:
  created:
    - src/quality/valueSetCache.ts
    - src/quality/valueSetCache.test.ts
    - src/quality/profileConformanceChecker.ts
    - src/quality/profileConformanceChecker.test.ts
  modified:
    - src/quality/profiles/Condition-diagnose.json
    - src/quality/profiles/Observation-laborbefund.json
    - src/quality/profiles/Patient-person.json
    - src/quality/profiles/Procedure-prozedur.json
    - src/quality/profiles/MedicationStatement-medikation.json
    - src/quality/profiles/Encounter-fall.json
    - src/quality/profiles/Consent-consent.json
key_decisions:
  - "Binding strength severity mapping: required=error, extensible=warning, preferred=info per D-03/UI-SPEC"
  - "Single-element arrays on max=1 fields emit warning (not error) per Pitfall 7 serializer tolerance"
  - "ValueSetCache flips available=false on first failure, skipping all subsequent $expand attempts in session"
metrics:
  duration: "5m 14s"
  completed: "2026-04-14T06:34:09Z"
  tasks_completed: 2
  tasks_total: 2
  test_cases_added: 15
  files_created: 4
  files_modified: 7
---

# Phase 16 Plan 01: Profile Conformance Checker & Value Set Cache Summary

Unified profile conformance validation engine with $expand result caching, enriched MII profile JSONs, and comprehensive TDD test coverage for DQ-03/DQ-04.

## What Was Built

### ValueSetCache (`src/quality/valueSetCache.ts`)
- In-memory cache mapping valueSet URLs to `Set<"system|code">` for fast membership lookups
- Concurrent request coalescing via inflight promise tracking
- Circuit breaker pattern: flips `available=false` on first failure, prevents retry storms
- T-16-01 mitigation: validates expansion.contains structure before caching
- T-16-02 mitigation: caps cached sets at 50,000 entries to prevent memory exhaustion

### Profile Conformance Checker (`src/quality/profileConformanceChecker.ts`)
- Single-pass walker over profile snapshot elements performing 4 checks:
  1. **Min cardinality** (code: `required`): uses `isPathPopulated` from completenessWalker
  2. **Max cardinality** (code: `max-cardinality`): detects arrays exceeding max="1"
  3. **Type constraints** (code: `type-mismatch`): validates JS typeof against FHIR type codes, handles choice-type `[x]` suffix matching
  4. **Value set bindings** (code: `value-set`): checks CodeableConcept/Coding against expanded value set membership
- `normalizeConformanceIssues()` converts to `NormalizedIssue[]` for ResourceIssueTable

### Enriched Profile JSONs (7 files)
- All 7 bundled MII profiles extended with `max`, `type[]`, and `binding` fields
- Source: MII Kerndatensatz StructureDefinition snapshots
- Choice-type elements include all allowed types (e.g., Observation.value[x] has 11 types)
- Bindings include strength and valueSet URL (example bindings excluded per spec)

## Commits

| Task | Commit | Description |
|------|--------|-------------|
| 1 | 371edf0 | Enrich profile JSONs and create ValueSetCache with tests |
| 2 | e8aca0c | Create profileConformanceChecker with 4-category validation |

## Test Results

- `valueSetCache.test.ts`: 6 tests (cache hit, coalescing, error handling, size cap, payload validation, successful expand)
- `profileConformanceChecker.test.ts`: 9 tests (required, max-cardinality, type-mismatch, value-set x3 strengths, null profile, choice type, normalization)
- Full suite: 31 passed, 8 failed (pre-existing), 3 skipped -- no regressions

## Deviations from Plan

None -- plan executed exactly as written.

## Known Stubs

None. All functions are fully implemented with no placeholder data or TODO markers.

## Verification Checklist

- [x] All 7 profile JSONs contain elements with `"type"` arrays
- [x] All 7 profile JSONs contain elements with `"max"` fields
- [x] `valueSetCache.ts` exports `ValueSetCache` with `expand` and `isAvailable`
- [x] `profileConformanceChecker.ts` exports `validateConformance`, `ConformanceIssue`, `normalizeConformanceIssues`
- [x] `npx vitest run src/quality/valueSetCache.test.ts` exits 0
- [x] `npx vitest run src/quality/profileConformanceChecker.test.ts` exits 0
- [x] No modifications to `structuralValidator.ts`
- [x] No regressions in full test suite

## Self-Check: PASSED

All 4 created files verified on disk. Both commit hashes (371edf0, e8aca0c) found in git log.
