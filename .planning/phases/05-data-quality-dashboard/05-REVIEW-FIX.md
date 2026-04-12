---
phase: 05
fixed_at: 2026-04-12
review_path: .planning/phases/05-data-quality-dashboard/05-REVIEW.md
iteration: 1
findings_in_scope: 10
fixed: 10
skipped: 0
status: all_fixed
---

# Phase 05: Code Review Fix Report

**Fixed at:** 2026-04-12
**Source review:** `.planning/phases/05-data-quality-dashboard/05-REVIEW.md`
**Iteration:** 1

**Summary:**
- Findings in scope: 10 (2 Critical + 8 Warning)
- Fixed: 10
- Skipped: 0
- Full test suite: 280 passed / 22 todo / 3 skipped (post-fix)

## Fixed Issues

### CR-01: PHI warning banner does not gate first-use (T-05-05-01 partial mitigation)

**Files modified:** `src/components/quality/ValidationPanel.tsx`
**Commit:** `ba64c5e`
**Applied fix:** Split the single dismissible notice into (a) an informational
`$validate unsupported` banner (blue/IconInfoCircle, unchanged copy so existing
tests still pass) and (b) a new PHI acknowledgement banner that renders only
when `hasRemote === true && !phiAcknowledged`. The PHI banner is NOT
dismissible — it carries an "I acknowledge and want to proceed" button that
flips a dedicated `quality.validation.phiAcknowledged.v1:{serverUrl}|{validatorUrl}`
localStorage entry. The `Validate sample` button is now gated: `disabled =
run.status === 'running' || (hasRemote && !phiAcknowledged)`, with a
descriptive title tooltip explaining why. Structural-only runs (no remote
configured) never trigger the gate so local workflows are untouched. Both
banner keys are scoped per (serverUrl, validatorUrl) so changing the
validator URL re-surfaces the PHI prompt.

**Human verification recommended:** logic fix — confirm the gated-until-ack
semantics behave as expected in a live browser session against a server with
`validation.validatorUrl` configured.

### CR-02: Cancellation race in progressive-sampling hooks

**Files modified:** `src/hooks/useCompletenessReport.ts`, `src/hooks/useCodingCoverage.ts`
**Commit:** `4198315`
**Applied fix:** Replaced the shared `cancelledRef` with a per-effect closure
`let cancelled = false;` in both hooks (matching the correct pattern already
in use in `CodingDrillDown.tsx:51-86`). Each cleanup now sets its OWN local
flag so a stale promise from a prior effect run can no longer commit after
the new effect re-sets a shared ref to `false`. Removed the no-longer-needed
`useRef` imports. All 20 completeness-hook and coding-coverage-panel tests
continue to pass.

## Warnings

### WR-01: `useValidationRun` can setState after unmount

**Files modified:** `src/hooks/useValidationRun.ts`
**Commit:** `769a10d`
**Applied fix:** Added a `useEffect(() => () => { cancelledRef.current = true; }, [])`
so that unmounting the panel flips the in-flight flag and the async batch
loop exits at its next `if (cancelledRef.current) return;` check.

### WR-02: `useQualityMetrics` "reverse array" re-fetch hack is brittle

**Files modified:** `src/hooks/useResourceCounts.ts`, `src/hooks/useQualityMetrics.ts`
**Commit:** `91ad76f`
**Applied fix:** Added an optional `refetchKey: number = 0` parameter to
`useResourceCounts` and included it in the effect's dep list. Rewrote
`useQualityMetrics` to pass its internal `version` counter as the
`refetchKey` and deleted the reverse-array trick + its 40-line rationale
docstring. `recompute()` now bumps `version`, which flows through as a dep,
which re-fires the underlying effect cleanly. All 29 counts-related tests
still pass.

### WR-03: `QualityMetricsCache#clear()` wipes ALL server namespaces

**Files modified:** `src/quality/metricsCache.ts`
**Commit:** `6c068be`
**Applied fix:** Narrowed the per-instance `clear()` method to remove only
localStorage keys starting with `${LOCAL_STORAGE_PREFIX}${this.serverUrl}|`
(matching the same prefix used during `hydrateFromLocalStorage`). The
cross-server wipe remains available via the top-level
`clearAllQualityMetrics()` helper wired to the Settings page button. Updated
docstrings accordingly; `settings-clear-cache` tests still pass.

### WR-04: OverviewStrip rollup flicker on tab-switch / rapid settling

**Files modified:** `src/hooks/useCompletenessReport.ts`, `src/hooks/useCodingCoverage.ts`
**Commit:** `aaf7cfc`
**Applied fix:** Before publishing `undefined` to `setCompleteness` /
`setCoverage`, both rollup effects now check whether any report is still in
the `'loading'` state (`stillWaiting`). If we're waiting for the first
settlement, we simply skip the publish rather than overwriting with
`undefined`. This prevents the em-dash → value → em-dash flicker on rapid
dep changes. Non-waiting no-result cases (all errored, all totals=0) still
fall back to `undefined` so stale values never linger.

### WR-05: No whitespace trimming of `validatorUrl` from settings.yaml

**Files modified:** `src/config/settings.ts`, `src/quality/remoteValidator.ts`
**Commit:** `fddb4b6`
**Applied fix:** Added `.trim()` during `deepMerge` validator-URL ingestion
with collapse-to-default when the trimmed string is empty. Also trim
defensively inside `createValidatorClient` so future callers outside the
settings flow are safe. Settings and remote-validator tests still pass.

### WR-06: `isPathPopulated` only inspects first array element (Pitfall 4)

**Files modified:** `src/components/quality/CompletenessDrillDown.tsx`
**Commit:** `8849d2b`
**Applied fix:** Chose the "document" option from the review — added a
small dimmed footer below the drill-down table explaining the semantic
("only the first element is inspected; slice-level gaps are surfaced in
the Coding Coverage tab"). Changing the walker's semantic to "any element
populated" would shift completeness percentages and risk reader confusion;
documenting the existing semantic avoids that. Also rolled in IN-06:
wrapped the single-element `singleTypeList` in `useMemo` for parity with
`CodingDrillDown`.

### WR-07: JSON export contains identifiers/PHI with no warning

**Files modified:** `src/components/quality/ValidationPanel.tsx`
**Commit:** `0b54d52`
**Applied fix:** Added a dimmed inline notice next to the Export button:
"Export includes resource IDs and validator diagnostics drawn from the
sampled resources. Review before sharing externally." Kept the button copy
unchanged so existing tests that target it by name still pass.

### WR-08: `ValidationIssueList` uses array index as React key

**Files modified:** `src/components/quality/ValidationIssueList.tsx`
**Commit:** `0c00aac`
**Applied fix:** Replaced `key={i}` with a composite
`${resourceId}|${expression}|${code}|${i}` key that survives re-sorts and
pagination while keeping the trailing index to disambiguate
rare-but-possible duplicate (resource, expression, code) triples that the
upstream dedupe step didn't collapse.

---

_Fixed: 2026-04-12_
_Fixer: Claude (gsd-code-fixer)_
_Iteration: 1_
