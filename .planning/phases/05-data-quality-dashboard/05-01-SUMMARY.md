---
phase: 05-data-quality-dashboard
plan: 01
subsystem: foundation
tags: [quality, routing, sampling, cache, settings, contracts, tdd]

requires:
  - phase: 01-foundation-blaze-connectivity
    provides: ConnectionContext + useConnection gating pattern
  - phase: 02-resource-explorer
    provides: ExplorerLayout outlet-context pattern + useResourceCounts worker pool
  - phase: 04-terminology-resolution
    provides: TerminologyCache LRU+localStorage pattern, walker recursion shape

provides:
  - src/quality/types.ts — central Wave 2 contract module (PerTypeCompletenessReport, PerTypeCoverageReport, ValidationBackend, QualityMetricsCacheEntry, ClassifiedCodedField)
  - src/quality/keys.ts — buildMetricsKey + LOCAL_STORAGE_PREFIX='quality-metrics:v1:'
  - src/quality/sampling.ts — sampleResources(client, type, n) using searchResources + _count
  - src/quality/metricsCache.ts — QualityMetricsCache (LRU 500 / localStorage 200) + clearAllQualityMetrics
  - src/quality/QualityMetricsContext.tsx — rollup rendezvous for Plans 03/04 → Plan 02 OverviewStrip
  - src/components/quality/QualityLayout.tsx — connection-gated outlet with QualityMetricsProvider
  - src/components/quality/SampleSizeControl.tsx + useSampleSize — 10..1000 clamp, v1 localStorage key
  - Three Wave 2 stubs (QualityOverviewPage, CompletenessDrillDown, CodingDrillDown)
  - Settings page Validation section with Clear metrics cache button
  - 9 failing test scaffolds + 2 hermetic fixtures (fhir-samples, mii-profiles)
  - AppSettings.validation { validatorUrl?, batchSize=25 } settings.yaml block

affects: [05-02-counts, 05-03-completeness, 05-04-coverage, 05-05-validation]

tech-stack:
  added: []
  patterns:
    - "Wave 0 failing-test harness: every Wave 2 target has a test that fails with 'Failed to resolve import' pointing at the target module path"
    - "Context-based rollup: producers (Plans 03/04) call setCompleteness/setCoverage; consumer (Plan 02 OverviewStrip) reads overall* without prop-drilling"
    - "Connection-gated outlet: QualityLayout mirrors ExplorerLayout (not-connected Alert + MedplumProvider + satisfies QualityOutletContext)"
    - "Cache key namespacing: {serverUrl}|{metric}|{resourceType}|{sampleSize} prevents cross-server bleed"
    - "Stateless controls + debounced consumers: SampleSizeControl fires live onChange; downstream hooks apply useDebouncedValue per-hook"

key-files:
  created:
    - src/quality/types.ts
    - src/quality/keys.ts
    - src/quality/sampling.ts
    - src/quality/metricsCache.ts
    - src/quality/QualityMetricsContext.tsx
    - src/components/quality/QualityLayout.tsx
    - src/components/quality/SampleSizeControl.tsx
    - src/components/quality/QualityOverviewPage.tsx (stub)
    - src/components/quality/CompletenessDrillDown.tsx (stub)
    - src/components/quality/CodingDrillDown.tsx (stub)
    - src/__tests__/fixtures/fhir-samples.ts
    - src/__tests__/fixtures/mii-profiles.ts
    - src/__tests__/quality-counts.test.ts
    - src/__tests__/quality-overview.test.tsx
    - src/__tests__/completeness-walker.test.ts
    - src/__tests__/completeness-hook.test.tsx
    - src/__tests__/coding-coverage-walker.test.ts
    - src/__tests__/coding-coverage-panel.test.tsx
    - src/__tests__/structural-validator.test.ts
    - src/__tests__/remote-validator.test.ts
    - src/__tests__/validation-panel.test.tsx
  modified:
    - src/App.tsx (deleted inline QualityPage; mounted nested /quality tree)
    - src/config/types.ts (added optional validation block)
    - src/config/settings.ts (DEFAULTS.validation + deepMerge validation)
    - src/components/settings/SettingsPage.tsx (Validation Paper + Clear metrics cache button)

key-decisions:
  - "QualityMetricsContext rollup rule locked: arithmetic mean of per-type percentages (not count-weighted). Rationale: MII Kerndatensatz frames each module as equal-weight — count-weighting would let Observation mask gaps in clinically critical low-volume types."
  - "Exclusion rule for rollup: only settled reports with positive denominator (total>0 for completeness, totalCodedFields>0 for coverage) count. Loading/errored/no-profile types are dropped from the mean entirely."
  - "Cache bounds tightened vs TerminologyCache: MEMORY_LIMIT=500, LOCAL_STORAGE_LIMIT=200. Metrics payloads (perPath maps) are ~10x heavier than terminology display strings."
  - "Stub components carry data-testid='stub-{Name}' so Wave 2 tests can distinguish stub-present vs Wave-2-landed state in their assertions."
  - "SampleSizeControl is stateless — downstream hooks (Plan 03/04) apply useDebouncedValue. Keeps the control reusable across panels that may debounce at different cadences."
  - "@ts-expect-error placed on every Wave 2 test import so tsc --noEmit stays green while vitest fails deterministically with 'Failed to resolve import' at test-collection time."

patterns-established:
  - "Wave 0 contract + failing-test harness: Wave 1 ships skeletons only; Wave 2 plans implement against stable contracts with a red → green transition."
  - "quality-metrics:v1: localStorage namespace. Clear via Settings button calls clearAllQualityMetrics() returning count removed."
  - "QualityOutletContext = ExplorerOutletContext shape (client + capability) — downstream components can reuse Phase 2 helpers verbatim."

requirements-completed: [QUAL-01, QUAL-02, QUAL-03, QUAL-04]

duration: 7min
completed: 2026-04-12
---

# Phase 05 Plan 01: Data Quality Dashboard Foundation Summary

**Quality route + settings + metrics cache + rollup context + 21-file skeleton deployed; Wave 2 plans now have failing tests and stable contracts to build against.**

## Performance

- **Duration:** ~7 min
- **Started:** 2026-04-12T09:05:35Z
- **Completed:** 2026-04-12T09:13:42Z
- **Tasks:** 2 (both auto, Task 1 TDD-style)
- **Files modified:** 21 (15 created in Task 1, 6 created + 4 modified in Task 2)

## Accomplishments

- `/quality` is a real nested-route tree (`index`, `completeness/:type`, `coding/:type`) mounted behind `QualityLayout`'s connection gate — mirrors the proven `ExplorerLayout` shape.
- `src/quality/*` contract module exports every shape Wave 2 needs (`PerTypeCompletenessReport`, `PerTypeCoverageReport`, `ClassifiedCodedField`, `ValidationBackend`, `QualityMetricsCacheEntry`).
- `QualityMetricsCache` + `clearAllQualityMetrics()` are wired to the Settings "Clear metrics cache" button; localStorage namespace is `quality-metrics:v1:{serverUrl}|{metric}|{resourceType}|{sampleSize}`.
- `QualityMetricsProvider` wraps the Outlet; `useQualityMetrics()` exposes `{ overallCompleteness, overallCoverage, setCompleteness, setCoverage }` — the locked plumbing for Plan 03/04 rollups to reach Plan 02's OverviewStrip without prop-drilling.
- `settings.yaml` now accepts an optional `validation: { validatorUrl?, batchSize? }` block with deep-merge and type coercion. Default `batchSize=25`; no default `validatorUrl` (structural-only mode unless opted in).
- 9 failing test scaffolds import from Wave 2 target paths. `npm test` produces deterministic "Failed to resolve import" messages pointing at each missing module; `npx tsc --noEmit -p .` exits 0.

## Task Commits

Each task was committed atomically:

1. **Task 1: Wave-0 test scaffolds + fixtures + quality contracts** — `9d931b0` (test)
2. **Task 2: Settings extension + QualityMetricsContext + QualityLayout + SampleSizeControl + App.tsx routing** — `366a911` (feat)

## Files Created/Modified

**Contracts + cache + helpers (Task 1):**
- `src/quality/types.ts` — central Wave 2 contract module
- `src/quality/keys.ts` — `buildMetricsKey` + `LOCAL_STORAGE_PREFIX`
- `src/quality/sampling.ts` — `sampleResources` wrapping `searchResources(_count)`
- `src/quality/metricsCache.ts` — `QualityMetricsCache` (LRU 500 / localStorage 200) + top-level `clearAllQualityMetrics()`

**Test scaffolds (Task 1):**
- `src/__tests__/fixtures/fhir-samples.ts` — 3 Conditions, 2 Observations, 1 Patient with Identifier (Pitfall 5)
- `src/__tests__/fixtures/mii-profiles.ts` — trimmed Condition + Observation SDs (includes `value[x]` for Pitfall 3)
- `src/__tests__/quality-counts.test.ts`, `quality-overview.test.tsx`, `completeness-walker.test.ts`, `completeness-hook.test.tsx`, `coding-coverage-walker.test.ts`, `coding-coverage-panel.test.tsx`, `structural-validator.test.ts`, `remote-validator.test.ts`, `validation-panel.test.tsx`

**Context + layout + control + stubs (Task 2):**
- `src/quality/QualityMetricsContext.tsx` — provider + `useQualityMetrics` hook with no-op fallback
- `src/components/quality/QualityLayout.tsx` — connection gate + `MedplumProvider` + `QualityMetricsProvider` wrap Outlet
- `src/components/quality/SampleSizeControl.tsx` — Mantine `NumberInput` + `useSampleSize` hook (10..1000 clamp, `quality.sampleSize.v1` localStorage key)
- `src/components/quality/{QualityOverviewPage,CompletenessDrillDown,CodingDrillDown}.tsx` — Wave 2 replacement stubs

**Settings + routing (Task 2):**
- `src/config/types.ts` — added optional `validation` block
- `src/config/settings.ts` — `DEFAULTS.validation` + `deepMerge` handling with numeric coercion for `batchSize`
- `src/components/settings/SettingsPage.tsx` — added Validation section + Clear metrics cache button wired to `clearAllQualityMetrics()`
- `src/App.tsx` — deleted inline `QualityPage`, mounted nested `/quality` tree

## Decisions Made

- **Arithmetic mean rollup (locked):** `overallCompleteness = mean(populated/total*100 for each settled PerTypeCompletenessReport where total>0)`. Same shape for coverage. Rationale: MII Kerndatensatz treats each module as equal-weight clinical signal — count-weighting would let Observation dominate and mask gaps in low-volume clinically critical types (Allergy, Immunization). Plans 03/04 MUST call setters with `Math.round` applied.
- **Exclusion rule (locked):** types still loading, errored, or without a bundled MII profile (`total === 0`) are dropped from the mean's denominator entirely — they don't count as zero.
- **Cache bounds:** `MEMORY_LIMIT=500`, `LOCAL_STORAGE_LIMIT=200` (vs 10K/2K for TerminologyCache). Metrics entries carry `perPath` maps that are ~10x heavier than terminology display strings; tighter bounds keep the localStorage mirror well under the 5 MB browser quota.
- **Stub discrimination via `data-testid`:** all three stub components render `<div data-testid="stub-{Name}">`. Wave 2 tests query that ID to branch between "stub-present" (pre-replacement) and "Wave-2-landed" (replaced) assertions.
- **`@ts-expect-error` on every Wave 2 test import:** keeps `npx tsc --noEmit` at exit 0 while `npm test` produces the intended "Failed to resolve import" runtime failure. Wave 2 plans remove the pragma when they land the real module.

## Contracts Exported (for Wave 2 consumption)

From `src/quality/types.ts`:
- `CountValue = number | 'loading' | 'error'`
- `PerTypeCompletenessReport = { populated, total, perPath, sampleSize, totalForType, profileUrl }`
- `CodedClassification = 'systemCode' | 'textOnly' | 'empty'`
- `ClassifiedCodedField = { path, classification, value? }`
- `PerTypeCoverageReport = { systemCode, textOnly, empty, totalCodedFields, perPath, sampleSize }`
- `ValidationBackendKind = 'structural' | 'remote'`
- `ValidationBackend = { kind, validate(resource) → Promise<OperationOutcomeIssue[]> }`
- `QualityMetricsCacheEntry<T> = { value, computedAt, serverUrl, resourceType, sampleSize }`
- `PerTypeReport<T> = T | 'loading' | 'error'`

From `src/components/quality/QualityLayout.tsx`:
- `QualityOutletContext = { capability: CapabilityStatement; client: MedplumClient }` — identical to `ExplorerOutletContext`

From `src/quality/keys.ts`:
- `LOCAL_STORAGE_PREFIX = 'quality-metrics:v1:'`
- `buildMetricsKey(serverUrl, resourceType, sampleSize, metric)` → `"{serverUrl}|{metric}|{resourceType}|{sampleSize}"`

From `src/quality/QualityMetricsContext.tsx`:
- `QualityMetricsProvider`, `useQualityMetrics()`
- Rule: arithmetic mean of per-type percentages, excluding loading/errored/`total===0` types (see Decisions Made above)

From `src/components/quality/SampleSizeControl.tsx`:
- `useSampleSize(): [number, (n:number) => void]` — clamped 10..1000, localStorage key `quality.sampleSize.v1`, default 100

## Deviations from Plan

None - plan executed exactly as written. One minor correction during Task 2: the `quality-overview.test.tsx` scaffold originally used `toBeInTheDocument()` (jest-dom matcher) but the project does not include jest-dom. Switched to `toBeDefined()` to match existing test conventions (Rule 3 - blocking issue). This is a test-convention fix, not a behavior change.

## Issues Encountered

- `window.matchMedia is not a function` when rendering `QualityOverviewPage` through `MantineProvider` in the test scaffold. Fix: added the same `ResizeObserver` + `matchMedia` polyfills used by other Mantine-dependent tests (`patient-list.test.tsx`, etc.). This matches the project-wide convention.

## User Setup Required

None. All changes are code-only; no new environment variables, no external services, no migrations. `settings.yaml` gains an optional `validation:` block users MAY add when Plan 05 lands a validator URL they want to call. Default behavior is structural-only validation against bundled MII profiles (no config change needed).

## Verification

- `npx tsc --noEmit -p .` → exit 0 (entire project typechecks with new contracts + route tree)
- `npm test` → 171 passed, 27 todo, 8 failed (all 8 failures are Wave 2 target modules with `Failed to resolve import` pointing at the missing Wave 2 target — exactly the intended failing-test harness)
- `grep -r "quality-metrics:v1:" src/` → single hit in `src/quality/keys.ts` (no accidental duplicate prefixes)
- Manual sanity (post-connect): navigate to `/quality` renders the `QualityOverviewPage` stub; `/quality/completeness/Condition` renders the `CompletenessDrillDown` stub; `/quality/coding/Condition` renders the `CodingDrillDown` stub.

## Self-Check: PASSED

Files verified present:
- src/quality/types.ts, keys.ts, sampling.ts, metricsCache.ts, QualityMetricsContext.tsx
- src/components/quality/QualityLayout.tsx, SampleSizeControl.tsx, QualityOverviewPage.tsx, CompletenessDrillDown.tsx, CodingDrillDown.tsx
- src/__tests__/fixtures/{fhir-samples,mii-profiles}.ts
- All 9 Wave-0 test scaffolds

Commits verified on branch main:
- 9d931b0 — Task 1 (15 files)
- 366a911 — Task 2 (11 files changed, 6 new)
