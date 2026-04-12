# Deferred Items — Phase 06

Items discovered during Phase 06 execution that are out of scope
(pre-existing issues unrelated to the current task's changes).

## Pre-existing `npm run build` TypeScript errors

These errors exist on `main` before Phase 06 and were NOT introduced by
plan 06-01. Logged here per GSD scope-boundary rule — do not fix in 06-01.

- `src/__tests__/display-modes.test.tsx(7,7)`: `'mockPatient' is declared but its value is never read` (TS6133)
- `src/__tests__/json-highlight.test.ts(3,1)`: `'JsonToken' is declared but its value is never read` (TS6133)
- `src/__tests__/resource-type-landing-counts.test.tsx(11,1)`: `Cannot find name 'global'` (TS2304)
- `src/components/explorer/ResourceDetailPage.tsx`: `readResource(resourceType, id)` — `resourceType: string` not assignable to `ResourceType` union (TS2345)
- `src/components/explorer/SearchResultsPage.tsx(59,10)`, `(62,10)`: `SearchRequest<Resource>` to `Record<string, unknown>` coercion warning (TS2352)
- `src/components/patients/FhirResourcesView.tsx(106,17)`: same `readResource` type-widening issue as ResourceDetailPage (TS2345)

**Verification that Plan 06-01 introduced no new errors:** `diff` of
`npm run build` output before and after Plan 06-01 edits shows only a line-number
shift on `ResourceDetailPage.tsx` (same error moved from line 56 → 61 due to
added lines). Zero new errors.

**Resolution path:** Consider a follow-up cleanup plan post-milestone that
narrows `readResource` call sites via `as ResourceType` or a runtime-validated
helper. Tracked as cross-phase tech debt.
