---
phase: 05
phase_name: data-quality-dashboard
depth: standard
files_reviewed: 40
status: issues_found
findings:
  critical: 2
  warning: 8
  info: 12
  total: 22
reviewed: 2026-04-12
---

# Phase 05: Code Review Report

**Depth:** standard · **Files reviewed:** 40 · **Status:** issues_found

## Summary

Reviewed the Phase 05 Data Quality Dashboard (walkers, backends, hooks, panels, drill-downs, tests). The code is well-documented. The T-05-05-02 regression (remote validator URL isolation) is correctly mitigated through a second MedplumClient instance with a test that asserts the fetch URL never contains the Blaze hostname. Pitfall 3 (value[x]) and Pitfall 5 (Identifier/Coding exclusion) are handled correctly with regression tests.

Two significant concerns merit attention:

1. **PHI warning banner (T-05-05-01) does not functionally block first-use of remote validation** — it is a passive, dismissible notice with copy that mis-targets the PHI threat model, and it is shown even when no remote validator is configured.
2. **A genuine cancellation race exists in the two progressive-sampling hooks** (`useCompletenessReport`, `useCodingCoverage`) because their `cancelledRef` is reset to `false` at the top of every effect re-run, allowing previously-cancelled in-flight promises to commit stale state.

Warnings around module-scoped cache mutation, unmounted-setState possibility in `useValidationRun`, and a brittle "reverse-array" re-fetch hack in `useQualityMetrics` round out the findings.

---

## Critical Issues

### CR-01: PHI warning banner does not gate first-use (T-05-05-01 partial mitigation)

**File:** `src/components/quality/ValidationPanel.tsx:72-169`

**Issue:** The implementation does not satisfy T-05-05-01 requirement of a warning banner that "blocks first-use flow":

1. **Passive** — dismissible once, persisted via localStorage; user can click `Validate sample` before ever seeing/acknowledging the banner
2. **Mis-targeted text** — copy talks about "Blaze does not implement $validate" (availability) rather than **PHI being POSTed to an external validator** (actual threat)
3. **Not tied to remote validator config** — same generic copy shown regardless of whether `validatorUrl` is configured

**Fix:** Split into two banners with distinct keys; require explicit acknowledgement of the PHI banner before enabling the Validate button when `hasRemote === true`. See inline patch in agent return.

### CR-02: Cancellation race in progressive-sampling hooks

**Files:** `src/hooks/useCompletenessReport.ts:58-116`, `src/hooks/useCodingCoverage.ts:54-116`

**Issue:** Both hooks reset `cancelledRef.current = false` at the top of every effect re-run. When `debouncedSize` or `typesKey` changes:
1. Cleanup sets `cancelledRef.current = true` for prior effect's in-flight fetches
2. New effect sets `cancelledRef.current = false`
3. In-flight promise from PRIOR run resolves and sees `cancelledRef.current === false`, commits stale data

**Fix:** Use a local `cancelled` closure per effect (matches pattern already correct in `CodingDrillDown.tsx:51-86`):
```ts
useEffect(() => {
  let cancelled = false;
  // ...
  return () => { cancelled = true; };
}, [client, typesKey, debouncedSize]);
```

---

## Warnings

### WR-01: `useValidationRun` can setState after unmount
**File:** `src/hooks/useValidationRun.ts:81-181` — no unmount effect; cleanup should flip `cancelledRef.current = true` on unmount.

### WR-02: `useQualityMetrics` "reverse array" re-fetch hack is brittle
**File:** `src/hooks/useQualityMetrics.ts:58-91` — replace with explicit `refetchKey` param on `useResourceCounts`.

### WR-03: `QualityMetricsCache#clear()` wipes ALL server namespaces
**File:** `src/quality/metricsCache.ts:69-84` — per-instance clear should be per-server; keep global wipe in top-level `clearAllQualityMetrics()`.

### WR-04: OverviewStrip rollup flicker on tab-switch / rapid settling
**Files:** `src/hooks/useCompletenessReport.ts:120-134`, `src/hooks/useCodingCoverage.ts:122-138` — skip publishing `undefined` while still waiting for first settlement.

### WR-05: No whitespace trimming of `validatorUrl` from settings.yaml
**Files:** `src/config/settings.ts:51-64`, `src/quality/remoteValidator.ts:32-45` — trim on ingestion.

### WR-06: `isPathPopulated` only inspects first array element (Pitfall 4)
**File:** `src/quality/completenessWalker.ts:58-63` — document in drill-down UI copy OR change semantics to "any element populated".

### WR-07: JSON export contains identifiers/PHI with no warning
**File:** `src/components/quality/ValidationPanel.tsx:130-153` — add "Export includes resource IDs and validator diagnostics" notice.

### WR-08: `ValidationIssueList` uses array index as React key
**File:** `src/components/quality/ValidationIssueList.tsx:74` — use composite key `${_resourceId}|${expression}|${code}|${i}`.

---

## Info

- **IN-01:** Duplicate React imports in `CodingDrillDown.tsx:14,35` — merge
- **IN-02:** `isNonEmpty` uses `for..in` with unused `_` — use `Object.keys(...).length > 0`
- **IN-03:** Export filename contains colons (Windows-hostile) — replace `[:.]` with `-`
- **IN-04:** Dead `void NumberFormatter;` in ValidationPanel.tsx:70 — remove
- **IN-05:** Dead `void backends` — destructure only used fields
- **IN-06:** `CompletenessDrillDown` re-creates `singleTypeList` array — wrap in useMemo for parity with `CodingDrillDown`
- **IN-07:** `SampleSizeControl.onChange` coerces `0` → DEFAULT instead of clamping to MIN
- **IN-08:** `CodingDrillDown` double-fetches samples — add TODO for shared sample cache
- **IN-09:** `useValidationRun.errorMessage` cleared on subsequent starts — acceptable
- **IN-10:** `useValidationRun` progress-update block duplicated ~40 lines — extract helper
- **IN-11:** `useCompletenessReport` cancel-return in `next()` is subtle — add comment
- **IN-12:** `bannerKey` recomputed per render — wrap in useMemo

---

_Reviewed: 2026-04-12 · Reviewer: gsd-code-reviewer · Depth: standard_
