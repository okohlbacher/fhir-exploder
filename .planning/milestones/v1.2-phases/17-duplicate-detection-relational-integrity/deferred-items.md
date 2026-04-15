# Deferred Items — Phase 17

Items discovered during plan execution that fall outside scope and are
deferred to a future phase.

## From plan 17-03 (gap closure)

### Pre-existing test suite failures (not caused by 17-03)

`npx vitest run` reports 21 failures across 8 files that pre-date plan
17-03. Verified by stashing 17-03 changes and re-running: all failures
reproduce on the prior commit.

Failing files:
- `src/__tests__/terminology-health.test.ts`
- `src/__tests__/sidebar-terminology-row.test.tsx`
- `src/__tests__/human-readable-view-terminology.test.tsx`
- `src/__tests__/patient-detail.test.tsx`
- `src/__tests__/patient-list.test.tsx`
- `src/__tests__/patient-view-toggle.test.tsx`
- `src/__tests__/quality-overview.test.tsx`
- `src/__tests__/resource-type-landing-counts.test.tsx`

These look like terminology-server / fixture / network-mock issues
unrelated to DuplicatesPanel. Out of scope for the gap-closure plan
per the scope guardrails. Should be triaged in a future quality-pass
phase.

### Advisory findings from 17-REVIEW.md (WR-01, IN-01..IN-05)

The code review for phase 17 raised non-blocking advisory items that
were explicitly out of scope for the gap-closure plan. They remain
open for a future quality-pass phase.
