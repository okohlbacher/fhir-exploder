# Phase 14: Tech Debt Cleanup - Context

**Gathered:** 2026-04-13
**Status:** Ready for planning

<domain>
## Phase Boundary

Resolve all deferred code review findings (17 info-level items from phases 4+5) and eliminate all TypeScript build errors (54 errors across 23 files) so the codebase compiles cleanly with zero errors/warnings. No new features, no UI changes, no behavioral changes.

</domain>

<decisions>
## Implementation Decisions

### Fix Strategy
- **D-01:** Fix all 17 info-level findings as written in the review files. For IN-08 (shared sample cache for CodingDrillDown), add a TODO comment rather than building the cache infrastructure.
- **D-02:** All 4 pending todos are folded into Phase 14 scope (TS2345 readResource type-widening, unused variable warnings in tests, global not found in resource-type-landing-counts test, SearchRequest coercion TS2352). These overlap directly with DEBT-02 and avoid duplicate work.

### TypeScript Error Resolution
- **D-03:** Create a utility helper (e.g., `toRecord(resource)`) that performs the `as unknown as Record<string, unknown>` cast in one place. Use this helper across all 54 error sites rather than inlining the cast at each location. Reduces noise and centralizes the pattern.

### Claude's Discretion
- Exact naming and location of the utility helper
- Order of fixes (info findings first vs TS errors first vs interleaved)
- Whether to fix test file TS errors alongside source file errors or in a separate pass

### Folded Todos
- **Fix readResource type-widening TS2345 errors** — overlaps with DEBT-02 (Resource type cast issues)
- **Fix unused variable warnings in tests** — overlaps with DEBT-02 (zero-warning build)
- **Fix global not found in resource-type-landing-counts test** — test runtime error
- **Fix SearchRequest coercion warning TS2352** — overlaps with DEBT-02 (type cast issues)

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Code Review Findings (Info-Level Items to Fix)
- `.planning/phases/04-terminology-resolution/04-REVIEW.md` — 5 info-level findings (IN-01 through IN-05) deferred from Phase 4
- `.planning/phases/05-data-quality-dashboard/05-REVIEW.md` — 12 info-level findings (IN-01 through IN-12) deferred from Phase 5

### Already-Fixed Items (Do Not Re-Fix)
- `.planning/phases/04-terminology-resolution/04-REVIEW-FIX.md` — Confirms all critical+warning items from Phase 4 already resolved
- `.planning/phases/05-data-quality-dashboard/05-REVIEW-FIX.md` — Confirms all critical+warning items from Phase 5 already resolved

### Requirements
- `.planning/REQUIREMENTS.md` — DEBT-01 (17 info findings) and DEBT-02 (zero TS build errors)

**Note:** Review files are in git history (deleted from working tree during milestone archival). Researcher/planner must use `git show HEAD:<path>` to read them.

</canonical_refs>

<code_context>
## Existing Code Insights

### Error Patterns
- 54 TypeScript errors, predominantly `Resource` to `Record<string, unknown>` cast failures (TS2352) caused by `VisionPrescription` lacking an index signature
- Unused imports (`useCallback`, `useMemo`) in `MiiModuleTab.tsx`
- Errors span both source files (7 files) and test files (16 files)

### Files with Source Errors
- `src/components/explorer/ResourceDetailPage.tsx`
- `src/components/explorer/ResourcePropertyTable.tsx`
- `src/components/explorer/SearchResultsPage.tsx`
- `src/components/patients/FhirResourcesView.tsx`
- `src/components/patients/MiiModuleTab.tsx`
- `src/components/patients/PatientTimeline.tsx`
- `src/utils/export.ts`

### Integration Points
- Utility helper should live in `src/utils/` alongside existing utilities
- No new dependencies needed — purely TypeScript type-level fixes

</code_context>

<specifics>
## Specific Ideas

No specific requirements — standard mechanical cleanup following the enumerated review findings and build error output.

</specifics>

<deferred>
## Deferred Ideas

None — discussion stayed within phase scope

</deferred>

---

*Phase: 14-tech-debt-cleanup*
*Context gathered: 2026-04-13*
