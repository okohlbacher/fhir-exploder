# Phase 14: Tech Debt Cleanup - Context

**Gathered:** 2026-04-13 (updated)
**Status:** Ready for planning

<domain>
## Phase Boundary

Resolve all deferred code review findings (17 info-level items from phases 4+5) and eliminate all TypeScript build errors (54 errors across 24 files) so the codebase compiles cleanly with zero errors/warnings. No new features, no UI changes, no behavioral changes.

</domain>

<decisions>
## Implementation Decisions

### Error Breakdown (Verified)
The 54 TypeScript errors break down as:
- **TS2305** (31 errors, 17 test files): `@testing-library/dom` not installed as dev dependency, so re-exports from `@testing-library/react` (`screen`, `waitFor`, `fireEvent`, `within`) don't resolve
- **TS2352** (17 errors, 6 source files): `Resource` to `Record<string, unknown>` cast failures due to `VisionPrescription` lacking an index signature
- **TS6133** (4 errors): Unused declarations (`useMemo`, `useCallback` in MiiModuleTab.tsx; `mockPatient` in test; `JsonToken` and `includes` in other files)
- **TS2345** (1 error): String not assignable to `ResourceType` union in `readResource` call
- **TS6133** (1 error): Unused import

### Fix Strategy
- **D-01:** Fix all 17 info-level findings as written in the review files. For IN-08 (shared sample cache for CodingDrillDown), add a TODO comment rather than building the cache infrastructure.
- **D-02:** All 4 pending todos are folded into Phase 14 scope (TS2345 readResource type-widening, unused variable warnings in tests, global not found in resource-type-landing-counts test, SearchRequest coercion TS2352). These overlap directly with DEBT-02 and avoid duplicate work.

### Fix Prioritization
- **D-03:** Quick wins first order:
  1. Install `@testing-library/dom` as dev dependency (clears 31 errors in one fix)
  2. Remove unused declarations (clears 4 errors)
  3. Create `src/utils/fhir-helpers.ts` with `toRecord()` + `getCodeDisplay()` helpers, apply across all 17 TS2352 error sites AND existing inline casts (~45 sites across the codebase)
  4. Fix remaining TS2345 ResourceType string error
  5. Address all 17 info-level code review findings

### Utility Helper Module
- **D-04:** Create `src/utils/fhir-helpers.ts` containing:
  - `toRecord(resource)`: Performs `as unknown as Record<string, unknown>` cast in one place. Covers 17 TS2352 errors + ~45 existing inline casts across the codebase.
  - `getCodeDisplay(concept)`: Extracts display string from CodeableConcept. Repeated pattern in SearchResultsPage, MiiModuleTab, FhirResourcesView, PatientTimeline (4+ files).
  - Date/period extraction left as-is (more context-dependent, not worth abstracting now).

### TypeScript Test Error Resolution
- **D-05:** Install `@testing-library/dom` as a dev dependency. This is a peer dependency of `@testing-library/react` whose types provide the re-exported `screen`, `waitFor`, `fireEvent`, and `within` symbols. Single install clears 31 of 54 TS errors.

### Claude's Discretion
- Exact naming of the utility module and helper functions
- Whether to fix test file TS errors alongside source file errors or in a separate pass within the quick-wins-first order
- Specific implementation of `getCodeDisplay()` (return type, null handling)

### Folded Todos
- **Fix readResource type-widening TS2345 errors** -- overlaps with DEBT-02 (Resource type cast issues)
- **Fix unused variable warnings in tests** -- overlaps with DEBT-02 (zero-warning build)
- **Fix global not found in resource-type-landing-counts test** -- test runtime error
- **Fix SearchRequest coercion warning TS2352** -- overlaps with DEBT-02 (type cast issues)

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Code Review Findings (Info-Level Items to Fix)
- `git show 46e2c82:.planning/phases/04-terminology-resolution/04-REVIEW.md` -- 5 info-level findings (IN-01 through IN-05) deferred from Phase 4
- `git show 2596316:.planning/phases/05-data-quality-dashboard/05-REVIEW.md` -- 12 info-level findings (IN-01 through IN-12) deferred from Phase 5

### Already-Fixed Items (Do Not Re-Fix)
- `git show 46e2c82:.planning/phases/04-terminology-resolution/04-REVIEW-FIX.md` -- Confirms all critical+warning items from Phase 4 already resolved
- `git show 2596316:.planning/phases/05-data-quality-dashboard/05-REVIEW-FIX.md` -- Confirms all critical+warning items from Phase 5 already resolved

### Requirements
- `.planning/REQUIREMENTS.md` -- DEBT-01 (17 info findings) and DEBT-02 (zero TS build errors)

**Note:** Review files were deleted from working tree during milestone archival. Use the exact commit SHAs above (not `HEAD`) to read them.

</canonical_refs>

<code_context>
## Existing Code Insights

### Error Patterns (Verified 2026-04-13)
- 54 TypeScript errors total: 31 TS2305 (testing-library types), 17 TS2352 (Resource cast), 4 TS6133 (unused), 1 TS2345 (ResourceType string), 1 other
- Errors span 7 source files and 17 test files

### Files with Source Errors (TS2352 Resource Casts)
- `src/components/explorer/ResourceDetailPage.tsx`
- `src/components/explorer/ResourcePropertyTable.tsx`
- `src/components/explorer/SearchResultsPage.tsx`
- `src/components/patients/FhirResourcesView.tsx`
- `src/components/patients/MiiModuleTab.tsx` (also has TS6133 unused imports)
- `src/components/patients/PatientTimeline.tsx`
- `src/utils/export.ts`

### Existing Cast Pattern (Consolidation Targets)
~45 existing `as Record<string, unknown>` casts across the codebase that already work but should be migrated to the `toRecord()` helper for consistency:
- `src/quality/codingCoverageWalker.ts`
- `src/quality/completenessWalker.ts`
- `src/terminology/walker.ts`
- `src/components/explorer/JsonTreeView.tsx`
- `src/config/settings.ts`
- `src/utils/timeline-utils.ts`

### Integration Points
- Utility helper module at `src/utils/fhir-helpers.ts` alongside existing `src/utils/export.ts` and `src/utils/timeline-utils.ts`
- `@testing-library/dom` added as dev dependency in `package.json`
- No other new dependencies needed

</code_context>

<specifics>
## Specific Ideas

No specific requirements -- standard mechanical cleanup following the enumerated review findings and build error output.

</specifics>

<deferred>
## Deferred Ideas

None -- discussion stayed within phase scope

</deferred>

---

*Phase: 14-tech-debt-cleanup*
*Context gathered: 2026-04-13*
