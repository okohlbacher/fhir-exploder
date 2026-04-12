---
phase: 07-v1-gap-closure-code-review-fixes
type: gap-closure
status: complete
completed: 2026-04-12
scope: "Apply code review findings from Phase 4 (04-REVIEW.md) + Phase 5 (05-REVIEW.md) via /gsd-code-review-fix"
findings_fixed:
  critical: 3
  warning: 12
  total: 15
findings_deferred:
  info: 17
  rationale: "Info-level items deferred per scope (fix_scope: critical_warning). Acceptable as tech debt for v1.0 archival."
commits:
  phase_05:
    - "4198315 fix(05): CR-02 per-effect local cancelled closure in useCompletenessReport + useCodingCoverage"
    - "ba64c5e fix(05): CR-01 gate remote validation behind explicit PHI acknowledgement"
    - "769a10d fix(05): WR-01 flip cancelledRef on unmount in useValidationRun"
    - "91ad76f fix(05): WR-02 replace reverse-array refetch hack with refetchKey param"
    - "6c068be fix(05): WR-03 scope QualityMetricsCache#clear() to owning server namespace"
    - "aaf7cfc fix(05): WR-04 suppress rollup undefined while waiting for first settlement"
    - "fddb4b6 fix(05): WR-05 trim whitespace on validatorUrl ingestion"
    - "8849d2b fix(05): WR-06/IN-06 document first-element array semantics + useMemo singleTypeList"
    - "0b54d52 fix(05): WR-07 PHI notice next to JSON export button"
    - "0c00aac fix(05): WR-08 composite React key for ValidationIssueList rows"
  phase_04:
    - "914cc46 fix(04): CR-01 guard createTerminologyClient against malformed URLs"
    - "34b37e1 fix(04): WR-01 clear fallback timeout handle in probe"
    - "a09c520 fix(04): WR-02 reuse resolver client in useTerminologyHealth"
    - "d6293e0 fix(04): WR-03 reset useResolvedResource state on resource identity change"
    - "ca0f162 fix(04): WR-04 use structuredClone and local displays in resolveResource"
verification:
  tests_before: 274
  tests_after: 286
  regressions: 0
  new_tests: 6
  new_test_files: ["src/__tests__/terminology-client.test.ts"]
reports:
  - .planning/phases/04-terminology-resolution/04-REVIEW-FIX.md
  - .planning/phases/05-data-quality-dashboard/05-REVIEW-FIX.md
---

# Phase 07: v1.0 Gap Closure — Code Review Fixes — Summary

## Scope

Apply `critical` and `warning` severity findings from both phase-level code reviews. Executed directly via `/gsd-code-review-fix` (no traditional PLAN.md cycle — the fixer agent reads REVIEW.md structured findings and applies fixes atomically).

## Results

| Phase | Critical | Warning | Info (deferred) | Total fixed |
|-------|----------|---------|-----------------|-------------|
| 04 | 1 | 4 | 5 | 5/5 in-scope |
| 05 | 2 | 8 | 12 | 10/10 in-scope |
| **Totals** | **3** | **12** | **17 deferred** | **15 fixed** |

All critical findings closed:
- **04-CR-01**: Unguarded `new URL()` in `terminologyClient.ts` — can no longer crash app on malformed settings.yaml
- **05-CR-01**: PHI warning banner now gates first-use of remote validation via explicit acknowledgment (localStorage key scoped per `(serverUrl, validatorUrl)`)
- **05-CR-02**: Cancellation race in progressive-sampling hooks eliminated via per-effect local `cancelled` closure

## Verification

- Full test suite: **286 passing** (up from 274 pre-fix), 22 todo, 0 failures
- 6 new tests in `terminology-client.test.ts` (URL validation coverage)
- Zero Phase 1-6 regressions
- All 15 fixes landed as atomic commits with `fix(0X): {finding-id} {description}` format

## Human Verification (Recommended)

- **05-CR-01 (PHI gating UX):** Configure `validation.validatorUrl` in settings.yaml, navigate to `/quality` → Validation tab. Confirm the `Validate sample` button is disabled until the PHI banner is acknowledged; acknowledgment persists across reloads per `(serverUrl, validatorUrl)`; changing either URL re-surfaces the prompt.
- **04-WR-03 (stale flash):** Navigate rapidly between resource detail pages. Confirm no one-frame flash of previous resource's resolved values.

## Deferred (Info-level findings, 17 total)

Accepted as tech debt for v1.0. Documented in the source REVIEW.md files. Candidates for a v1.1 polish pass if desired.

## References

- [04-REVIEW.md](../04-terminology-resolution/04-REVIEW.md) — source findings
- [04-REVIEW-FIX.md](../04-terminology-resolution/04-REVIEW-FIX.md) — fix report
- [05-REVIEW.md](../05-data-quality-dashboard/05-REVIEW.md) — source findings
- [05-REVIEW-FIX.md](../05-data-quality-dashboard/05-REVIEW-FIX.md) — fix report
