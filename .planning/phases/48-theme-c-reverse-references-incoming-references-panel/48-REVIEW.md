---
phase: 48-theme-c-reverse-references-incoming-references-panel
reviewed: 2026-05-01T20:37:29Z
depth: standard
files_reviewed: 2
files_reviewed_list:
  - src/components/explorer/RelatedResourcesPanel.tsx
  - src/components/explorer/__tests__/RelatedResourcesPanel.test.tsx
findings:
  critical: 0
  warning: 0
  info: 0
  total: 0
status: clean
---

# Phase 48: Code Review Report (gap-closure for 48-04)

**Reviewed:** 2026-05-01T20:37:29Z
**Depth:** standard
**Files Reviewed:** 2
**Status:** clean

## Summary

Gap-closure review for Phase 48 plan 48-04 — the WR-01 state-key collision fix in
`RelatedResourcesPanel`. The fix introduces a composite key `${e.type}:${e.param}`
exposed via a private `entryKey()` helper, and applies it consistently everywhere
the `counts` Record is read or written, plus to React `key` props for both the
loading-skeleton and populated-card lists. A new regression test (`duplicate-target-type
entries: both render distinct cards (WR-01 regression)`) drives two same-type entries
with different params through the panel and asserts that both counts surface and
no React duplicate-key warning is emitted.

The fix is complete, surgical, and correct. The regression test exercises the exact
bug scenario and would fail under the pre-fix code (last-write-wins on
`counts['Observation']` plus a duplicate React key warning). All other behaviors
(URL construction, visible type labels, cancellation flag, populated filter,
loading-state computation) are preserved unchanged.

No critical, warning, or info findings introduced by 48-04. Pre-existing items
(IN-01 magic skeleton count, IN-02 jsdom polyfill duplication, IN-03 legacy
scaffold tautology, WR-02 URL encoding) are explicitly out of 48-04 scope per
the scope note and were not made worse by this change.

### Verification details

**1. Composite-key fix is complete.**
Every `counts[...]` access and every `key={...}` on a list-rendered Card now uses
`entryKey(e)`. Confirmed by grep: the only remaining `e.type` references in the
file are at:
- Line 49 — building the FHIR URL (`${e.type}?${e.param}=...`); must remain
  raw `type` (correct).
- Lines 84, 100 — visible Card label `<Text size="sm">{e.type}</Text>`; must
  remain raw `type` per scope note (correct — users see the resource type, not
  the search-param-qualified key).

**2. Regression test exercises the bug.**
`COLLIDING_ENTRIES` contains two `Observation` entries with params `has-member`
and `derived-from`. The mock dispatches based on URL substring, returning total
5 for `has-member` and 8 for `derived-from`. The test then asserts:
- Both counts (`5` and `8`) appear in the DOM — under the pre-fix `e.type`-only
  key, the second resolution would overwrite the first slot and only one count
  would render.
- Two `mantine-Card-root` DOM nodes exist.
- `mockGet` was called exactly twice with both URL variants.
- `console.error` was not called with React's "Encountered two children with
  the same key" message — pre-fix, `key={e.type}` would have collided on the
  two `Observation` entries and React would have warned.

The test would fail under pre-fix code on at least three assertions (the two
`getByText` for counts, and the duplicate-key warning regex). Confirmed strong.

**3. console.error spy is correctly scoped.**
- Spy is created inside the regression test body (not module-scoped), so it
  cannot leak into other tests.
- `mockImplementation(() => {})` silences output without losing call records.
- `mockRestore()` is called at the end of the test (synchronously, after all
  `await waitFor` have settled).
- The spy fires only when React itself logs, and the assertion uses
  `not.toMatch(/Encountered two children with the same key/)` rather than
  `not.toHaveBeenCalled()`, which correctly tolerates unrelated React warnings
  (e.g. act() warnings) while still catching the specific WR-01 regression.
  This is the right level of strictness — broader assertion would be brittle.

**4. No new bugs introduced.**

- *entryKey determinism*: `${e.type}:${e.param}` is stable for any
  `ReverseReferenceEntry`. `param` is typed as required `string` in
  `ReverseReferenceEntry` (verified at `src/utils/reverseReferenceCatalog.ts:25-29`),
  so the key is never `Observation:undefined`.
- *Cancellation flag*: unchanged. `cancelled` is captured by closure, set to
  `true` in cleanup, and checked in both `.then` and `.catch` before any state
  write. The composite-key change is value-only and does not alter the
  cancellation timing.
- *Stale closures*: the `useEffect` deps array `[client, refValue, entries]`
  is unchanged. `entryKey` is module-scoped (pure, no captured state), so it
  cannot stale-close. `e` is loop-local per iteration; `entryKey(e)` evaluates
  inside the `.then`/`.catch` lambdas at resolution time but `e` is the same
  reference captured by the closure — no aliasing issue.
- *Initial seed vs. resolution*: both writes (`initial[entryKey(e)] = 'loading'`
  on line 45 and the per-resolution
  `setCounts((prev) => ({...prev, [entryKey(e)]: ...}))` on lines 55/59) use
  the identical key derivation. No risk of seed/resolve key drift.

**5. Code quality.**
- `entryKey` is a clean module-level pure function with a thorough JSDoc
  block linking back to WR-01 and explaining the bug it closes — exactly
  the right level of documentation for a small but load-bearing helper.
- No dead code, no unused imports, no type loosening. The `as number` cast
  on line 67 and 103 is unchanged from the prior version (necessary to
  narrow `number | 'loading'` after the `typeof === 'number'` guard).
- Test fixture (`COLLIDING_ENTRIES`) is module-scoped alongside other
  fixtures, matching the file's existing convention (Pitfall 2 note in
  the source).

## Critical Issues

None.

## Warnings

None.

## Info

None.

---

_Reviewed: 2026-05-01T20:37:29Z_
_Reviewer: Claude (gsd-code-reviewer)_
_Depth: standard_
