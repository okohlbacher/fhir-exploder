# Phase 05 Deferred Items

Pre-existing issues discovered during plan execution but OUT OF SCOPE for the
current plan's changes. Documented for future cleanup.

## Pre-existing tsc/build errors (discovered during Plan 05-02)

`npm run build` (which runs `tsc -b` with project references and stricter
emit-path checks) fails with the following errors, ALL of which predate any
Phase 05 work:

| File | Line | Error |
|------|------|-------|
| src/components/explorer/ResourceDetailPage.tsx | 56 | TS2345 string not assignable to ResourceType literal union |
| src/components/explorer/SearchResultsPage.tsx | 59,62 | TS2352 SearchRequest → Record<string, unknown> cast |
| src/components/patients/FhirResourcesView.tsx | 106 | TS2345 same as ResourceDetailPage |
| src/__tests__/display-modes.test.tsx | 7 | TS6133 'mockPatient' unused |
| src/__tests__/json-highlight.test.ts | 3 | TS6133 'JsonToken' unused |
| src/__tests__/resource-type-landing-counts.test.tsx | 11 | TS2304 Cannot find name 'global' |
| src/__tests__/completeness-walker.test.ts | 18,23 | Wave 0 target missing (intended — Plan 05-03) |

**Note:** `npx tsc --noEmit -p .` (which uses the root tsconfig that has
`files: []` and just project references) returns exit 0 because the root
tsconfig does not cascade errors from referenced projects without `-b`.
Plan 05-02 acceptance criterion (`npx tsc --noEmit -p .`) passes.

These are flagged as pre-existing in git history: running `git stash` to
revert Plan 05-02 changes and re-running `npm run build` produces the same
errors. Fix proposal: a cleanup plan at the end of Phase 05 or a Phase 06
housekeeping pass.
