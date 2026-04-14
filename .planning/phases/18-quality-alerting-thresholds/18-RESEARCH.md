# Phase 18: Quality Alerting & Thresholds - Research

**Researched:** 2026-04-14
**Domain:** React/Mantine threshold configuration UI + per-metric "% clean" derivation over existing quality hooks
**Confidence:** HIGH (all code-shape claims verified against the installed source; zero external-ecosystem claims)

## Summary

Phase 18 is an internal re-composition, not a new capability. Every ingredient already exists in the codebase:

1. **Threshold storage** is a trivial `useLocalStorage` binding to a single key (`quality.thresholds.v1`) — mirroring the proven `quality.cohort.v1` / `quality.sampleSize.v1` pattern in `CohortSelector` and `SampleSizeControl`.
2. **% clean derivation** lives on top of the existing 7 hooks. Two hooks (`useCompletenessReport`, `useCodingCoverage`) already rollup into `QualityMetricsContext` as arithmetic means of per-type percentages. The other 5 hooks (`useConformanceRun`, `usePlausibilityReport`, `useLabRangesReport`, `useDuplicateReport`, `useReferenceReport`) are **panel-local state** (they don't rollup) and expose `issues: NormalizedIssue[]` plus check-specific cluster/count arrays — enough to derive `affectedResources` by counting `new Set(issues.map(i => i.resourceId)).size`.
3. **Breach visual** is two Mantine prop swaps on `SummaryCard`: a different `color` on `RingProgress.sections[0]` and a different `c=` on the `<Text>` for the value. No new primitive.
4. **Routing** is a one-line child route under `<Route path="/quality" element={<QualityLayout />}>`.

The phase has no net-new libraries, no new Mantine components, no dependency bumps. Scope is about 1 new file (`src/quality/thresholds.ts`), 1 new hook (`useThresholds`), 1 new page (`ThresholdsPage`), 1 extended context (`QualityMetricsContext` — 5 new setters), and small prop additions to `SummaryCard` + `OverviewStrip`.

**Primary recommendation:** Follow the CONTEXT/UI-SPEC verbatim. The UI-SPEC has already answered every Mantine, copywriting, and interaction question. Research effort is spent confirming the existing hook signatures are compatible (they are) and nailing the rollup wiring for the 5 issue-count metrics (non-trivial — see Section "% Clean Derivation per Metric" below).

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions

**Score Model (foundational — shapes everything else)**
- **D-01:** All 7 metrics are normalized to a uniform **0-100 "% clean" score** so every threshold is expressed the same way (`alert if < X%`). Higher is always better; breach direction is always "below threshold."
- **D-02:** For the 2 existing aggregate metrics, use the current computation:
  - Completeness: `populated / total × 100` (already aggregated in `QualityMetricsContext.overallCompleteness`)
  - Coding coverage: `systemCode / totalCodedFields × 100` (already `overallCoverage`)
- **D-03:** For the 5 issue-count metrics, derive "% clean" as `(sampledResources - affectedResources) / sampledResources × 100`:
  - **Validation/conformance:** `1 − (resources with any OperationOutcomeIssue / sampled)` × 100
  - **Plausibility:** `1 − (resources with any temporal plausibility issue / sampled)` × 100
  - **Lab ranges:** `1 − (Observations outside reference range / sampled lab Observations)` × 100
  - **Duplicates:** `1 − (resources in any duplicate cluster / sampled)` × 100 — applied per resource type then averaged
  - **References:** `1 − (resources with broken or orphan reference / sampled)` × 100

**Threshold Configuration UI (DQ-11)**
- **D-04:** Dedicated route: `/quality/thresholds`. New page reachable from a toolbar button on `/quality` ("Configure thresholds").
- **D-05:** Page shows a table: one row per metric × threshold value input (number, 0-100) × default indicator × clear button.
- **D-06:** Leaving a threshold input empty / clicking clear = **unset = no alerting for that metric**. Single-field-per-row UI; no separate enable toggle.
- **D-07:** Page provides a "Reset to defaults" action that restores all metrics to their shipped defaults.

**Defaults & Persistence**
- **D-08:** Ship sensible defaults per metric. Starting values:
  - Completeness: `< 80%`
  - Coding coverage: `< 70%`
  - Validation/conformance: `< 95%` clean
  - Plausibility: `< 99%` clean
  - Lab ranges: `< 95%` clean
  - Duplicates: `< 99%` clean
  - References: `< 98%` clean
- **D-09:** Persistence: single `localStorage` key (e.g., `quality.thresholds.v1`) holding a JSON object `{ metricKey: number | null }`. **Global scope** — not keyed by server URL.
- **D-10:** Defaults live in code (a `DEFAULT_THRESHOLDS` constant). The stored object holds only user overrides; unset metrics fall back to defaults. Clearing a metric in the UI sets the key to `null` (explicit disable) distinct from absent key (fall back to default). "Reset to defaults" clears the entire object.

**Breach Visual Treatment (DQ-12)**
- **D-11:** Primary signal: **RingProgress arc / numeric value turns red** when the metric is below its active threshold. Reuses the existing `SummaryCard.ringValue` + Mantine color props — no new primitive needed.
- **D-12:** Applied consistently in both places the metric appears:
  - Dashboard `OverviewStrip` summary tile
  - Each panel's internal summary (per-type rows in CompletenessPanel/CodingCoveragePanel retain their current per-type semantics; only the panel-level aggregate turns red when the aggregate breaches)
- **D-13:** No toast notifications, tab-header badges, or breach-summary banners in this phase. Visual-only per DQ-12 wording.

**Dashboard Layout**
- **D-14:** Expand `OverviewStrip` from 4 cards to **7 metric tiles** (one per quality metric) plus the existing "Total resources" and "Resource types" informational cards — 9 tiles total.
- **D-15:** Each metric tile shows: label, % clean value, RingProgress arc, and (when breached) the threshold value annotated below the score (e.g., "threshold: 80%").
- **D-16:** Clicking a metric tile navigates to its corresponding quality tab.

**Edge Cases**
- **D-17:** When `sampledResources` is 0 for a metric (no data), the metric displays "—" and is treated as **not breached** (insufficient data is not an alerting condition).
- **D-18:** Metrics that have not yet been run display "—" and are **not breached**.

**Scope Exclusions**
- **D-19:** No toast/sound/email notification layer.
- **D-20:** No historical trending of threshold breaches — Phase 19 owns that.
- **D-21:** No exporting of threshold configs to a file.

### Claude's Discretion
- Exact column layout and Mantine components on the `/quality/thresholds` page.
- Whether the `DEFAULT_THRESHOLDS` map lives in `src/quality/thresholds.ts` (new file) or an existing types module.
- Whether to extract a `useThresholds()` hook or layer the logic into `QualityMetricsContext`.
- Exact shade of red (Mantine `red.6` vs severity-graded orange→red gradient) and whether to use a ThemeIcon accent next to the ring.
- Whether to compute "% clean" lazily from existing hook results or add a new reducer to `QualityMetricsContext`.
- Whether the summary-tile click navigates to the tab (D-16) or also pre-filters its drill-down.

### Deferred Ideas (OUT OF SCOPE)
- Cohort selection todos (unrelated to thresholds).
- Toast / sound / email notifications.
- Historical trending — owned by Phase 19.
- Per-cohort / per-resource-type thresholds.
- Severity-graded color (orange → red gradient).
</user_constraints>

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|------------------|
| DQ-11 | User can configure quality thresholds per metric (e.g., "alert if completeness < 80%") | `src/quality/thresholds.ts` exposes `DEFAULT_THRESHOLDS` + storage key `quality.thresholds.v1`; `ThresholdsPage` at `/quality/thresholds` provides the Mantine Table UI; `useThresholds` hook wraps `@mantine/hooks` `useLocalStorage` with the same pattern proven in `SampleSizeControl` and `QualityOverviewPage` (cohort selector). Persistence across reloads is `useLocalStorage` guarantee. |
| DQ-12 | Dashboard visually highlights metrics that breach configured thresholds | `SummaryCard` gains `breached?: boolean` + `threshold?: number` props; RingProgress `sections[0].color` flips from `'blue.6'` to `'red.6'`; `<Text>` value gains `c="red.6"` on breach. All 7 metrics participate via `QualityMetricsContext` extended with `overallValidation`, `overallPlausibility`, `overallLabRanges`, `overallDuplicates`, `overallReferences`. Derivation rules locked in D-03; implementation detailed in "% Clean Derivation per Metric" below. |
</phase_requirements>

## Project Constraints (from CLAUDE.md)

| Constraint | Implication for Phase 18 |
|------------|--------------------------|
| React 18 (not 19) | All JSX/hooks target React 18 patterns; no `use()`, no actions |
| Mantine 8 (not 9) | Use `SimpleGrid cols={{...}}`, `Table` with `Table.Thead`/`Table.Tr`, `NumberInput` with `suffix`/`clampBehavior`, `RingProgress sections`, `Modal`, `Badge`, `ActionIcon`. No Mantine 9 APIs. |
| TypeScript 5.7 | Strict typing; new `MetricKey` union, `Thresholds` partial record |
| Medplum 5.1.7 | Unchanged — no FHIR surface is touched by Phase 18 |
| Vite 8 | No build/config changes |
| react-router-dom 7 | Add child route under `/quality`; use `useNavigate`, `useSearchParams`, or `useLocation().state` for tile→tab navigation |
| Do NOT use `@tanstack/react-query` | Thresholds are synchronous localStorage reads — React state + `useLocalStorage` is enough |
| Do NOT use Tailwind | Mantine IS the design system |
| License MIT | No new deps means no license concerns |

**GSD workflow enforcement:** all Edit/Write operations in Phase 18 must flow through `/gsd-execute-phase` — no direct repo edits.

## Standard Stack

### Core (all already installed — no new deps)
| Library | Version | Purpose | Verified |
|---------|---------|---------|----------|
| react | 18.3.1 | UI framework | `[VERIFIED: package.json]` |
| @mantine/core | 8.3.18 | `Card`, `Table`, `NumberInput`, `RingProgress`, `Modal`, `SimpleGrid`, `Badge`, `ActionIcon`, `Anchor`, `Button`, `Group`, `Paper`, `Stack`, `Text`, `Title` | `[VERIFIED: package.json]` |
| @mantine/hooks | 8.3.18 | `useLocalStorage` — the threshold persistence primitive | `[VERIFIED: package.json + existing use in SampleSizeControl, QualityOverviewPage, ValidationPanel]` |
| @mantine/notifications | 8.3.18 | Post-reset toast "Thresholds reset" | `[VERIFIED: package.json + existing use in QualityOverviewPage]` |
| react-router-dom | 7.14.0 | `useNavigate`, `Link`, `Route`, `useSearchParams` | `[VERIFIED: package.json + existing use throughout]` |
| @tabler/icons-react | 3.41.1 | `IconAdjustmentsAlt`, `IconRestore`, `IconX`, `IconArrowLeft` (or `IconChevronLeft`) | `[VERIFIED: package.json]` |

### Dev (test infrastructure — all already installed)
| Library | Version | Purpose | Verified |
|---------|---------|---------|----------|
| vitest | 4.1.4 | Test runner (`npm test` → `vitest run`) | `[VERIFIED: package.json]` |
| @testing-library/react | 16.3.2 | `render`, `screen`, `fireEvent` | `[VERIFIED: package.json]` |
| @testing-library/dom | 10.4.1 | Query primitives | `[VERIFIED: package.json]` |
| @testing-library/jest-dom | 6.9.1 | Matchers | `[VERIFIED: package.json]` |
| jsdom | 29.0.2 | `environment: 'jsdom'` in vitest.config.ts | `[VERIFIED: package.json + vitest.config.ts]` |

### Alternatives Considered
| Instead of | Could Use | Why Not |
|------------|-----------|---------|
| `useLocalStorage` from `@mantine/hooks` | Raw `window.localStorage` + custom sync | `useLocalStorage` already handles cross-tab sync and initial hydration; proven in 3 existing call sites (`SampleSizeControl`, `QualityOverviewPage`, `ValidationPanel`). Rolling our own would duplicate work and risk hydration mismatches. |
| `useThresholds` hook wrapping `useLocalStorage` | Inline `useLocalStorage` in `OverviewStrip` + `ThresholdsPage` | The hook centralizes: (1) merge of overrides over `DEFAULT_THRESHOLDS`, (2) `isBreached(key, value)` logic, (3) `null` vs `undefined` semantics (D-10). Two call sites benefit from the same logic. |
| Add breach logic inside `QualityMetricsContext` | Compute breach in `OverviewStrip` where values+thresholds meet | CONTEXT D-03 says context already exposes the 7 % clean values; breach is a UI concern, not a data concern. Keeping breach derivation in the view layer keeps context minimal and makes `QualityMetricsContext` testable without threshold knowledge. |
| New Mantine primitive for breached tile | Prop flag on existing `SummaryCard` | Zero new primitives per D-11. Only two visual knobs change: ring color, value color. |

**Installation:** Nothing to install. All dependencies present.

**Version verification:** All `@mantine/*` 8.3.18 (locked to React 18 per peer deps). Installed 2026-04-12 per v1.0 milestone. No upgrade required. `[VERIFIED: package.json]`

## Architecture Patterns

### Recommended File Layout
```
src/
├── quality/
│   ├── thresholds.ts                    # NEW — MetricKey, DEFAULT_THRESHOLDS, STORAGE_KEY, pure helpers
│   ├── QualityMetricsContext.tsx        # EXTEND — add 5 new (value, setter) pairs
│   ├── types.ts                         # UNCHANGED — NormalizedIssue already the universal format
│   ├── sampling.ts                      # UNCHANGED
│   └── ... (other quality modules)      # UNCHANGED
├── hooks/
│   ├── useThresholds.ts                 # NEW — wraps useLocalStorage, merges overrides, isBreached
│   ├── useCompletenessReport.ts         # UNCHANGED — already rolls up into context
│   ├── useCodingCoverage.ts             # UNCHANGED — already rolls up into context
│   ├── useConformanceRun.ts             # UNCHANGED (see rollup strategy below)
│   ├── usePlausibilityReport.ts         # UNCHANGED
│   ├── useLabRangesReport.ts            # UNCHANGED
│   ├── useDuplicateReport.ts            # UNCHANGED
│   └── useReferenceReport.ts            # UNCHANGED
└── components/
    └── quality/
        ├── ThresholdsPage.tsx           # NEW — /quality/thresholds route element
        ├── SummaryCard.tsx              # EXTEND — add breached?, threshold?, onClick? props
        ├── OverviewStrip.tsx            # REWRITE — 4 → 9 tiles, consume useThresholds + extended context
        ├── QualityOverviewPage.tsx      # EXTEND — add "Configure thresholds" toolbar button; maybe read ?tab=
        ├── ValidationPanel.tsx          # ROLLUP-WIRE — push overallValidation on status==='complete'
        ├── PlausibilityPanel.tsx        # ROLLUP-WIRE — push overallPlausibility
        ├── LabRangesPanel.tsx           # ROLLUP-WIRE — push overallLabRanges
        ├── DuplicatesPanel.tsx          # ROLLUP-WIRE — push overallDuplicates (averaged per type)
        └── ReferencesPanel.tsx          # ROLLUP-WIRE — push overallReferences
src/App.tsx                              # EXTEND — add <Route path="thresholds" element={<ThresholdsPage />} />
```

### Pattern 1: `useLocalStorage` for UI Preferences
Every existing quality preference follows this exact shape:
```typescript
// Source: src/components/quality/SampleSizeControl.tsx:32-36
export function useSampleSize(): [number, (n: number) => void] {
  const [raw, setRaw] = useLocalStorage<number>({ key: KEY, defaultValue: DEFAULT });
  const clamped = clamp(Number(raw));
  return [clamped, (n: number) => setRaw(clamp(n))];
}
```
`[VERIFIED: src/components/quality/SampleSizeControl.tsx]`

And in `QualityOverviewPage`:
```typescript
// Source: src/components/quality/QualityOverviewPage.tsx:53-56
const [cohortTypes, setCohortTypes] = useLocalStorage<string[]>({
  key: 'quality.cohort.v1',
  defaultValue: [],
});
```
`[VERIFIED: src/components/quality/QualityOverviewPage.tsx]`

**Key names follow `quality.{concern}.v1` convention.** Phase 18 uses `quality.thresholds.v1` per D-09. Versioning suffix is idiomatic — matches every existing quality storage key.

### Pattern 2: Context-Fed Rollup Values
`QualityMetricsContext` already proves the pattern:
```typescript
// Source: src/quality/QualityMetricsContext.tsx:23-30
export interface QualityMetricsContextValue {
  overallCompleteness: number | undefined;
  overallCoverage: number | undefined;
  setCompleteness: (value: number | undefined) => void;
  setCoverage: (value: number | undefined) => void;
}
```
`[VERIFIED: src/quality/QualityMetricsContext.tsx]`

The producer (hook) writes via `setCompleteness`; the consumer (`OverviewStrip`) reads via `useQualityMetrics`. Outside-provider fallback returns no-op setters — important so unit tests can render `OverviewStrip` without a full provider chain (see `quality-overview.test.tsx:291-309`).

**Phase 18 extends this exact shape** with 5 new pairs. No new primitives.

### Pattern 3: Panel → Rollup Wiring
`useCompletenessReport` pushes into the context in a `useEffect` keyed on its `reports` state:
```typescript
// Source: src/hooks/useCompletenessReport.ts:128-148 (summarized)
const { setCompleteness } = useQualityMetricsContext();
useEffect(() => {
  const values = Object.values(reports);
  const stillWaiting = values.length > 0 && values.some((r) => r === 'loading');
  const pcts: number[] = [];
  for (const r of values) {
    if (r === 'loading' || r === 'error') continue;
    if (!r || typeof r !== 'object') continue;
    if (r.total > 0) pcts.push((r.populated / r.total) * 100);
  }
  if (pcts.length === 0) {
    if (!stillWaiting) setCompleteness(undefined);
    return;
  }
  const avg = pcts.reduce((a, b) => a + b, 0) / pcts.length;
  setCompleteness(Math.round(avg));
}, [reports, setCompleteness]);
```
`[VERIFIED: src/hooks/useCompletenessReport.ts:128-148]`

**Key behaviors:**
- Undefined is emitted only AFTER settling (not while loading) — prevents em-dash → value → em-dash flicker.
- Arithmetic mean of per-type percentages (equal weight per MII module per the locked rollup rule in 05-01-SUMMARY).
- Value is `Math.round`ed before write.

**Phase 18 strategy:** The 5 issue-count hooks are _panel-local_ — they run on button click inside a panel, not automatically for all types. Rollup wiring must happen in the **panel**, not the hook, because the hook only sees a single `resourceType` at a time. Each panel pushes its rollup in a `useEffect` keyed on `run.status === 'complete'` + `run.progress.total > 0` + the issues array. See "% Clean Derivation per Metric" below.

### Pattern 4: Route Structure
```typescript
// Source: src/App.tsx:71-79
<Route path="/quality" element={<QualityLayout />}>
  <Route index element={<QualityOverviewPage />} />
  <Route path="completeness/:type" element={<CompletenessDrillDown />} />
  <Route path="coding/:type" element={<CodingDrillDown />} />
  <Route path="plausibility/:type" element={<PlausibilityDrillDown />} />
  <Route path="lab-ranges" element={<LabRangesDrillDown />} />
  <Route path="duplicates" element={<DuplicatesDrillDown />} />
  <Route path="references/:type" element={<ReferencesDrillDown />} />
</Route>
```
`[VERIFIED: src/App.tsx]`

Phase 18 adds:
```typescript
<Route path="thresholds" element={<ThresholdsPage />} />
```
— as a sibling of `index` under `/quality`. This places `ThresholdsPage` inside the `QualityLayout`, which means it inherits the connection gate (Not connected → Alert) and the `QualityMetricsProvider`. The latter is unnecessary for the thresholds page (it doesn't read `%` values) but costs nothing.

### Pattern 5: Tabs + keepMounted
```typescript
// Source: src/components/quality/QualityOverviewPage.tsx:99-110
<Tabs defaultValue="counts" keepMounted>
  <Tabs.List>
    <Tabs.Tab value="counts">Counts</Tabs.Tab>
    <Tabs.Tab value="completeness">Completeness</Tabs.Tab>
    ...
  </Tabs.List>
```
`[VERIFIED: src/components/quality/QualityOverviewPage.tsx]`

**Tab value strings already locked** — Phase 18's `METRIC_ROUTES` map (UI-SPEC line 248-258) must match these exactly: `completeness`, `coverage`, `validation`, `plausibility`, `lab-ranges`, `duplicates`, `references`.

For click-through (D-16), `defaultValue="counts"` is hard-coded today. To support `?tab=completeness` deep-linking we must change `defaultValue` to `value={...}` (controlled) or read `searchParams` and set `defaultValue` dynamically. The UI-SPEC recommends `?tab=` query string (preferred) or `useLocation().state.activeTab` (acceptable fallback).

### Anti-Patterns to Avoid
- **Recomputing % clean inside every render of `OverviewStrip`.** Push rollups into context at the hook/panel boundary; read them as pre-computed numbers in `OverviewStrip`. Same pattern as completeness/coverage already use.
- **Re-deriving breach inside `SummaryCard`.** Pass `breached` as a prop. Breach logic lives in `useThresholds().isBreached(key, value)` — one source of truth, testable in isolation.
- **Storing thresholds per-server in `QualityMetricsCache`.** CONTEXT D-09 explicitly says global scope. The existing `QualityMetricsCache` is server-namespaced; piggy-backing on it would require a cross-server lookup. Use a plain global `localStorage` key instead.
- **Writing to localStorage on every keystroke in the NumberInput.** UI-SPEC I-02 requires save-on-blur. Mantine `NumberInput` fires `onChange` per keystroke AND `onBlur` on blur. Use local component state + commit on blur.

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| localStorage persistence | Raw `localStorage.getItem` + `JSON.parse` | `@mantine/hooks` `useLocalStorage` | Handles SSR-safe hydration, cross-tab `storage` event sync, and is already used for 3 other quality prefs. Consistency beats novelty. |
| Ring-progress visualization | Custom SVG arc | Mantine `RingProgress` | Already in use in `OverviewStrip` and `CompletenessPanel`. `sections[0].color` accepts any `MantineColor` — flipping `'blue.6'` → `'red.6'` is zero effort. |
| Threshold input | Custom `<input type="number">` with validation | Mantine `NumberInput` with `min`, `max`, `step`, `suffix`, `clampBehavior="strict"` | Clamps invalid input automatically, filters non-numeric keystrokes, handles Enter key to blur. |
| Confirmation dialog | Custom modal primitive | Mantine `Modal` + `Button color="red"` | Focus trap, ESC-to-close, ARIA dialog role all built in. |
| Merging overrides over defaults | Custom recursive merge | `{ ...DEFAULT_THRESHOLDS, ...overrides }` — flat object with primitive values | `Thresholds` is `Partial<Record<MetricKey, number \| null>>` — spread is sufficient. Watch out for `null` semantics (see Gotchas). |
| Tab routing state | `useState` + manual URL sync | `useSearchParams()` from react-router v7 | Deep-linkable. Back button works correctly. |

**Key insight:** Phase 18 is a "paint by numbers" phase. All primitives exist. The risk is NOT in picking tools — it's in getting rollup wiring correct across 5 disparate panel-local state machines.

## % Clean Derivation per Metric

This is the only subtle part of the phase. For each metric, document: (a) what hook supplies the data, (b) where `affectedResources` comes from, (c) where `sampledResources` comes from, (d) where the rollup push happens.

### Completeness (already done)
- **Hook:** `useCompletenessReport` (global, runs for all `effectiveTypes` in `QualityOverviewPage`)
- **Aggregate:** Arithmetic mean of per-type `populated/total*100`, already pushed to `setCompleteness`
- **No change for Phase 18.** `overallCompleteness` already serves as the % clean score.

### Coding Coverage (already done)
- **Hook:** `useCodingCoverage`
- **Aggregate:** Arithmetic mean of per-type `systemCode/totalCodedFields*100`, already pushed to `setCoverage`
- **No change for Phase 18.**

### Validation / Conformance (new rollup)
- **Hook:** `useConformanceRun` (panel-local, `resourceType` scoped)
- **Returns:** `{ status, progress, issues: NormalizedIssue[], legacyIssues, byResource, ... }`
- **affectedResources:** `new Set(run.issues.map(i => i.resourceId)).size` — count of unique resources with any conformance issue
- **sampledResources:** `run.progress.total` — exactly the sample size iterated (important: `progress.total` is set to `sample.length`, not `sampleSize`, because the server may have fewer resources than requested; see `useConformanceRun.ts:121`)
- **% clean:** `Math.round((1 - affected / sampled) * 100)` — or `undefined` when `sampled === 0` per D-17
- **Rollup push:** Add a `useEffect` in `ValidationPanel` that fires on `run.status === 'complete' || run.status === 'cancelled'` and pushes to `setOverallValidation(value)`. Reset to `undefined` on a new start (or keep last value — UI-SPEC is silent; recommend keeping last value so tiles don't flicker, consistent with completeness/coverage behavior).
- **Subtle:** `ValidationPanel` also tracks `legacyIssues` (structural + remote). The "affected resources" count should deduplicate across conformance + legacy since `allNormalizedIssues` already does this (`ValidationPanel.tsx:183-195`). Use `Object.keys(run.byResource).length` OR `new Set(allNormalizedIssues.map(i => i.resourceId)).size` — the latter is safer because `byResource` only contains legacy data. `[VERIFIED: src/components/quality/ValidationPanel.tsx:165-196]`

### Plausibility (new rollup)
- **Hook:** `usePlausibilityReport`
- **Returns:** `{ status, progress, issues: NormalizedIssue[], ... }`
- **affectedResources:** `new Set(run.issues.map(i => i.resourceId)).size` (the panel already computes `resourcesWithIssues` this way — `PlausibilityPanel.tsx:102-105`)
- **sampledResources:** `run.progress.total`
- **Rollup push:** In `PlausibilityPanel`, on status complete/cancelled, push `Math.round((1 - affected/total) * 100)` to `setOverallPlausibility`.
- **Note:** Plausibility is resource-type-scoped (one type at a time). The rollup reflects the _last run_ type, NOT an average across types. If the user wants cross-type aggregation they must run per type manually. The UI-SPEC treats this as acceptable — the tile shows what was last computed, matching the existing "latest run wins" semantics of the completeness/coverage hooks (which sweep all types automatically, so the distinction doesn't bite them).

### Lab Ranges (new rollup)
- **Hook:** `useLabRangesReport`
- **Returns:** `{ status, progress, issues, summary: LabRangeSummary | null, ... }`
- **affectedResources:** `run.summary.outOfRange` — directly tracked (no need to dedup via resourceId because each Observation appears at most once in issues)
- **sampledResources:** `run.summary.checked` — the count of Observations with numeric values that were range-checked
- **Edge case:** `run.summary.noRange === run.summary.checked` means no ranges were configured — there's no alerting signal here. Treat as "not applicable" = undefined, not 100%. Otherwise users appear perfectly clean simply because nothing was checked.
- **Rollup push:** In `LabRangesPanel` on complete/cancelled, if `summary && summary.checked > 0 && summary.noRange < summary.checked`, push `Math.round((1 - summary.outOfRange/summary.checked) * 100)`.
- `[VERIFIED: src/quality/labRangeChecker.ts:22-28 — LabRangeSummary shape]`

### Duplicates (new rollup — needs per-type average per D-03)
- **Hook:** `useDuplicateReport` (currently called with `types: [resourceType]` — single type per run, `DuplicatesPanel.tsx:52-56`)
- **Returns:** `{ status, progress, issues, duplicateClusters, contentHashClusters, skippedPatients, ... }`
- **Two cluster shapes:**
  - `duplicateClusters: PatientDuplicateCluster[]` — `{ key, patients: Array<{id, resourceType}> }` (patient-duplicate), each cluster has ≥2 patients (filtered in detector)
  - `contentHashClusters: ContentHashCluster[]` — `{ hash, resourceType, resources: Array<{id, resourceType}> }` (per-type content hash), each cluster has ≥2 resources
- **affectedResources (patient):** `duplicateClusters.reduce((sum, c) => sum + c.patients.length, 0)` — "N patients involved" (already computed in `DuplicatesPanel.tsx:71-75` as `patientsInvolved`)
- **affectedResources (content-hash, per type):** For each unique type in `contentHashClusters`, sum `resources.length` across that type's clusters.
- **sampledResources (patient):** Patient sample size — the hook calls `sampleResources(client, 'Patient', sampleSize)` regardless of selected type (`useDuplicateReport.ts:91-96`). It's not surfaced explicitly; must be derived from `run.duplicateClusters` being populated means patient pass ran. Recommendation: when pushing the rollup, take `sampleSize` prop (the panel knows it) as the patient denominator.
- **sampledResources (content-hash):** `run.progress.total - patientSample.length` — but since the hook doesn't expose `patientSample.length`, use the per-type cluster members as upper bound, OR re-use `sampleSize` (accepting that the true denominator may be smaller if the server has fewer resources). Simpler alternative: use `sampleSize` as a nominal denominator and accept slight over-cleanliness in edge cases. This matches how `DuplicatesPanel.tsx:212` already approximates ("Checked {sampleSize} of total patients").
- **D-03 aggregation:** "applied per resource type then averaged." With the current single-type-at-a-time panel, this aggregation is vacuous — there's only one type per run. Recommendation: push `% clean` computed as `Math.round((1 - (patientsInvolved + hashResourcesInvolved_currentType) / (2 * sampleSize)) * 100)` (average of patient cleanliness + content-hash cleanliness for the current type). Document this simplification explicitly in the plan so the planner decides whether it's acceptable or whether Phase 18 should lift `useDuplicateReport` to run cross-type (bigger scope).
- **Safer alternative:** Skip per-type averaging, roll up only content-hash % clean for the current type. Patient duplicates are surfaced as a separate number inside the panel and never hit the tile. This under-alerts but over-simplifies — discussable with the planner.

**RECOMMENDATION:** The planner should raise this ambiguity with the user during planning. The simplest path that honors D-03 literally is to iterate `types` at the `OverviewStrip` level (not inside the panel) — but that re-opens the hook-vs-panel boundary and is a bigger edit. Prefer the "nominal denominator = sampleSize" approach and note in the plan that this is a conservative, single-type rollup.

### References (new rollup)
- **Hook:** `useReferenceReport` (single `resourceType` per run, `ReferencesPanel.tsx:49-53`)
- **Returns:** `{ status, progress, issues, brokenCount, orphanCount, ... }`
- **affectedResources:** The unique resources impacted. Note: `brokenCount` counts broken _references_, not resources — a single resource with 3 broken refs contributes 3 to `brokenCount`. Use `new Set(run.issues.map(i => i.resourceId)).size` for unique resource count, which is the denominator-compatible number per D-03.
- **sampledResources:** `sampleSize` (the panel prop) — the reference check samples `resourceType` at `sampleSize`. `run.progress.total` is the number of _ref-batches_ (see `useReferenceReport.ts:117` — `onProgress(current, total)` from `checkReferencesExist`), NOT the resource count. Do not use it as denominator.
- **Rollup push:** On complete/cancelled, push `Math.round((1 - uniqueAffected / sampleSize) * 100)` to `setOverallReferences`.

**Summary table for planner:**

| Metric | Rollup location | Sampled denominator | Affected numerator |
|--------|----------------|---------------------|--------------------|
| Completeness | `useCompletenessReport` (DONE) | Per-type settled | Per-type populated/total |
| Coverage | `useCodingCoverage` (DONE) | Per-type settled | Per-type systemCode/total |
| Validation | `ValidationPanel` | `run.progress.total` | `new Set(issues.map(.resourceId)).size` |
| Plausibility | `PlausibilityPanel` | `run.progress.total` | `new Set(issues.map(.resourceId)).size` |
| Lab Ranges | `LabRangesPanel` | `run.summary.checked` (skip if `noRange===checked`) | `run.summary.outOfRange` |
| Duplicates | `DuplicatesPanel` | `sampleSize` (panel prop) | `patientsInvolved + hashResourcesInvolved_currentType`, averaged |
| References | `ReferencesPanel` | `sampleSize` (panel prop) | `new Set(issues.map(.resourceId)).size` |

## Runtime State Inventory

Not applicable — Phase 18 is a greenfield UI addition to the quality dashboard. No rename, refactor, or migration. No existing localStorage keys are renamed. The new `quality.thresholds.v1` key is additive.

**Nothing found in any category:**
- **Stored data:** None — the new storage key is additive.
- **Live service config:** None — no external service integration.
- **OS-registered state:** None — browser-only tool.
- **Secrets/env vars:** None — thresholds are user preferences.
- **Build artifacts:** None — no compiled assets carry the name.

## Common Pitfalls

### Pitfall 1: `null` vs `undefined` in `Thresholds`
**What goes wrong:** Storing `{completeness: null}` and later reading with `{...DEFAULT_THRESHOLDS, ...overrides}` returns `null`, which is NOT `> 0`. If code uses `threshold > 0` as a "threshold is active" check, disabled metrics (null) get treated as active with value 0 → everything breaches.

**Why it happens:** UI-SPEC I-02 requires three-state semantics: absent (use default), null (explicitly disabled), number (custom value). Spread-merge does not collapse `null` onto the default.

**How to avoid:** Resolve thresholds with explicit precedence:
```typescript
function resolveThreshold(key: MetricKey, overrides: Thresholds): number | null {
  if (key in overrides) return overrides[key] ?? null; // null stays null (disabled)
  return DEFAULT_THRESHOLDS[key]; // absent → default
}

function isBreached(value: number | undefined, threshold: number | null): boolean {
  return value != null && threshold != null && value < threshold;
}
```

**Warning sign:** Writing a test that clears a threshold and expects the tile to stop alerting — if the spread-merge bug is present, the test will show the tile still breaching at threshold=0.

### Pitfall 2: Rollup Push During Running State Causes Flicker
**What goes wrong:** If `useEffect` in a panel pushes a rollup value on every status change (including `running`), partial results arrive — user sees "—" → "45%" → "67%" → "72%" as batches complete. Visually noisy.

**Why it happens:** `run.issues` accumulates during batched iteration; if the rollup effect keys on `[issues]` without gating on `status`, every batch commit triggers a rollup push.

**How to avoid:** Gate on terminal status only:
```typescript
useEffect(() => {
  if (run.status !== 'complete' && run.status !== 'cancelled') return;
  if (run.progress.total === 0) return;
  const affected = new Set(run.issues.map(i => i.resourceId)).size;
  setOverallValidation(Math.round((1 - affected / run.progress.total) * 100));
}, [run.status, run.issues, run.progress.total]);
```

**Warning sign:** Tile value changes visibly during a running check.

### Pitfall 3: `keepMounted` Means Tile State Never Clears on Tab Switch
**What goes wrong:** User runs Validation on Patient → Validation shows 72% clean → user switches to Plausibility tab → runs Plausibility → Plausibility tile shows new value, but Validation tile still shows Patient's 72% (stale).

**Why it happens:** `keepMounted` on Tabs means the `ValidationPanel` stays mounted; its `useEffect` persists the last push. This is actually _desired_ behavior (tiles should persist the last known value) — but the planner should explicitly decide whether a new tab visit re-runs or reuses. CONTEXT D-18 says "not yet run = —"; once run, value persists = correct.

**How to avoid:** Just be aware. Don't try to "reset" tile values on tab switch — that defeats the "quick view" purpose of the OverviewStrip.

**Warning sign:** Someone adds code to `OverviewStrip` unmount / tab-change to call `setOverallValidation(undefined)` — reject it.

### Pitfall 4: OverviewStrip at 1200-1407px Wraps Awkwardly
**What goes wrong:** UI-SPEC responsive grid is `cols={{ base: 1, xs: 2, sm: 3, md: 4, lg: 5, xl: 9 }}`. At 1200-1407px (lg), 5 per row × 2 rows = 10 slots but only 9 tiles. Layout reads "5 + 4" with one half-row.

**Why it happens:** 9 tiles doesn't divide evenly by 2-5. Only at xl (≥1408px) do all 9 fit on one line.

**How to avoid:** This is acceptable per UI-SPEC — informational cards first, metric tiles as peers, no visual hierarchy across them. Don't add complicated alignment logic. If the row-wrap is visually disturbing, the planner may switch to `cols={{ lg: 4, xl: 9 }}` (4+4+1 at lg, all 9 at xl) — but the UI-SPEC approved layout.

**Warning sign:** Someone adds `@media` queries or `visibleFrom`/`hiddenFrom` to hide tiles at certain breakpoints — rejects the spec.

### Pitfall 5: Tile Click Navigates but Doesn't Switch Tab
**What goes wrong:** `navigate('/quality?tab=completeness')` pushes the URL, but `<Tabs defaultValue="counts">` ignores the query param. User lands on `/quality?tab=completeness` and still sees the Counts tab.

**Why it happens:** `defaultValue` is set-once; it doesn't re-read on URL change.

**How to avoid:** Change `QualityOverviewPage` to read `useSearchParams` and set `<Tabs value={tabFromUrl} onChange={onTabChange}>` (controlled). The `onChange` pushes `?tab=X` back to the URL. This is a small refactor but is the only robust way to deep-link to tabs.

**Alternative** (UI-SPEC "acceptable fallback"): `navigate('/quality', { state: { activeTab: 'completeness' } })` + read `useLocation().state.activeTab` — but this is stateful, doesn't survive refresh, and complicates testing. Prefer the URL-param approach.

**Warning sign:** UAT reports "click tile does nothing visible" — likely the tab didn't switch.

### Pitfall 6: Validation Panel Uses `conformanceIssues + legacyIssues` — Dedup Needed
**What goes wrong:** `run.issues` is already normalized conformance issues. `run.legacyIssues` is structural/remote validator output. The panel's `allNormalizedIssues` merges and dedupes these (`ValidationPanel.tsx:183-195`). A naive rollup using only `run.issues` under-counts affected resources (misses legacy-only issues).

**How to avoid:** Use `allNormalizedIssues` (the already-deduped merge) for the rollup numerator. Or, push the rollup from the panel code right after `allNormalizedIssues` is computed (both live in the same component, so this is straightforward).

**Warning sign:** Validation tile shows 100% clean but a glance at the issue list shows dozens of issues.

### Pitfall 7: Lab Ranges — `noRange` Treated as "Clean"
**What goes wrong:** If 0 ranges are configured and no Observation has embedded ranges, `summary.outOfRange === 0` — naive rollup produces 100%. User thinks data is perfect when actually nothing was checked.

**How to avoid:** Test `summary.noRange === summary.checked` — if true, emit `undefined` (= "—" tile, not breached) rather than 100%. See "% Clean Derivation" above.

**Warning sign:** Lab Ranges tile shows 100% on a server with lab data but no configured ranges.

### Pitfall 8: Mantine NumberInput Empty State Is `''`, Not `undefined`
**What goes wrong:** `onChange` receives `''` (empty string) when the input is cleared, NOT `undefined`. Code that does `if (v === undefined) setThreshold(null)` never fires.

**How to avoid:** Treat both `''` and `undefined` as "cleared":
```typescript
onChange={(v) => {
  if (v === '' || v === undefined) {
    // Empty — defer to blur to decide whether to unset or keep default
    return;
  }
  const n = typeof v === 'number' ? v : Number(v);
  if (Number.isFinite(n)) setLocalValue(n);
}}
onBlur={() => {
  if (localValue === '' || localValue === undefined) clearThreshold(key);
  else setThreshold(key, localValue);
}}
```

**Warning sign:** Input shows empty but `Active` badge still says `custom`.

## Code Examples

### Example 1: `thresholds.ts` skeleton
```typescript
// Source: NEW FILE — src/quality/thresholds.ts
// Pattern inspired by src/components/quality/SampleSizeControl.tsx (clamp + DEFAULT + KEY)
// and src/quality/QualityMetricsContext.tsx (MetricKey union implied by context shape).

export type MetricKey =
  | 'completeness'
  | 'coverage'
  | 'validation'
  | 'plausibility'
  | 'labRanges'
  | 'duplicates'
  | 'references';

export const METRIC_LABELS: Record<MetricKey, string> = {
  completeness: 'Completeness',
  coverage: 'Coding coverage',
  validation: 'Validation',
  plausibility: 'Plausibility',
  labRanges: 'Lab ranges',
  duplicates: 'Duplicates',
  references: 'References',
};

export const METRIC_ROUTES: Record<MetricKey, string> = {
  completeness: 'completeness',
  coverage: 'coverage',
  validation: 'validation',
  plausibility: 'plausibility',
  labRanges: 'lab-ranges',
  duplicates: 'duplicates',
  references: 'references',
};

export const DEFAULT_THRESHOLDS: Record<MetricKey, number> = {
  completeness: 80,
  coverage: 70,
  validation: 95,
  plausibility: 99,
  labRanges: 95,
  duplicates: 99,
  references: 98,
};

export const STORAGE_KEY = 'quality.thresholds.v1';

/**
 * Stored override value per metric:
 *   - undefined (absent key): fall back to DEFAULT_THRESHOLDS
 *   - null: explicitly disabled (no alerting)
 *   - number: custom active threshold
 */
export type Thresholds = Partial<Record<MetricKey, number | null>>;

export function resolveThreshold(key: MetricKey, stored: Thresholds): number | null {
  if (key in stored) return stored[key] ?? null;
  return DEFAULT_THRESHOLDS[key];
}

export function isBreached(value: number | undefined, threshold: number | null): boolean {
  return value != null && threshold != null && value < threshold;
}
```

### Example 2: `useThresholds` hook
```typescript
// Source: NEW FILE — src/hooks/useThresholds.ts
// Pattern: src/components/quality/SampleSizeControl.tsx (useLocalStorage wrapper).
import { useLocalStorage } from '@mantine/hooks';
import { useCallback } from 'react';
import {
  DEFAULT_THRESHOLDS,
  STORAGE_KEY,
  isBreached as pureIsBreached,
  resolveThreshold,
  type MetricKey,
  type Thresholds,
} from '../quality/thresholds';

export function useThresholds() {
  const [stored, setStored] = useLocalStorage<Thresholds>({
    key: STORAGE_KEY,
    defaultValue: {},
  });

  const setThreshold = useCallback((key: MetricKey, value: number) => {
    setStored((prev) => ({ ...prev, [key]: value }));
  }, [setStored]);

  const clearThreshold = useCallback((key: MetricKey) => {
    setStored((prev) => ({ ...prev, [key]: null }));
  }, [setStored]);

  const resetThreshold = useCallback((key: MetricKey) => {
    setStored((prev) => {
      const { [key]: _, ...rest } = prev;
      return rest;
    });
  }, [setStored]);

  const resetAll = useCallback(() => setStored({}), [setStored]);

  const isBreached = useCallback(
    (key: MetricKey, value: number | undefined) =>
      pureIsBreached(value, resolveThreshold(key, stored)),
    [stored],
  );

  const getActiveThreshold = useCallback(
    (key: MetricKey) => resolveThreshold(key, stored),
    [stored],
  );

  return {
    stored,
    defaults: DEFAULT_THRESHOLDS,
    setThreshold,
    clearThreshold,
    resetThreshold,
    resetAll,
    isBreached,
    getActiveThreshold,
  };
}
```

### Example 3: Extended `SummaryCard`
```typescript
// Source: EXTEND src/components/quality/SummaryCard.tsx
// Existing file is 50 LOC; this is the minimal delta.
import { Card, Group, RingProgress, Stack, Text } from '@mantine/core';
import type { ReactNode } from 'react';

export interface SummaryCardProps {
  label: string;
  value: string | number;
  icon: ReactNode;
  ringValue?: number;
  subtitle?: string;
  /** NEW: breached controls ring + value color. */
  breached?: boolean;
  /** NEW: rendered as "threshold: {N}%" annotation when breached. */
  threshold?: number;
  /** NEW: makes the card clickable. */
  onClick?: () => void;
  /** NEW: aria-label override for clickable tiles. */
  ariaLabel?: string;
}

export function SummaryCard({
  label, value, icon, ringValue, subtitle, breached, threshold, onClick, ariaLabel,
}: SummaryCardProps) {
  const ringColor = breached ? 'red.6' : 'blue.6';
  const valueColor = breached ? 'red.6' : undefined;
  const cardProps = onClick
    ? { component: 'button' as const, type: 'button' as const, onClick, 'aria-label': ariaLabel, style: { cursor: 'pointer', textAlign: 'left' as const } }
    : {};

  return (
    <Card padding="md" withBorder radius="sm" {...cardProps}>
      <Group justify="space-between" align="flex-start" wrap="nowrap">
        <Stack gap={4}>
          <Group gap="xs">
            {icon}
            <Text size="sm" fw={600}>{label}</Text>
          </Group>
          <Text size="xl" fw={700} c={valueColor}>{value}</Text>
          {subtitle && <Text size="xs" c="dimmed">{subtitle}</Text>}
          {breached && threshold !== undefined && (
            <Text size="xs" c="dimmed">threshold: {threshold}%</Text>
          )}
        </Stack>
        {ringValue !== undefined && (
          <RingProgress size={80} thickness={6} sections={[{ value: ringValue, color: ringColor }]} />
        )}
      </Group>
    </Card>
  );
}
```

### Example 4: Rollup push in `ValidationPanel` (inline diff)
```typescript
// Source: EXTEND src/components/quality/ValidationPanel.tsx
// Add near allNormalizedIssues useMemo (around line 195):
import { useQualityMetrics } from '../../quality/QualityMetricsContext';
// ...
const { setOverallValidation } = useQualityMetrics();
useEffect(() => {
  if (run.status !== 'complete' && run.status !== 'cancelled') return;
  if (run.progress.total === 0) return;
  const affected = new Set(allNormalizedIssues.map((i) => i.resourceId)).size;
  setOverallValidation(Math.round((1 - affected / run.progress.total) * 100));
}, [run.status, run.progress.total, allNormalizedIssues, setOverallValidation]);
```

### Example 5: Extended `QualityMetricsContext`
```typescript
// Source: EXTEND src/quality/QualityMetricsContext.tsx
export interface QualityMetricsContextValue {
  overallCompleteness: number | undefined;
  overallCoverage: number | undefined;
  overallValidation: number | undefined;     // NEW
  overallPlausibility: number | undefined;   // NEW
  overallLabRanges: number | undefined;      // NEW
  overallDuplicates: number | undefined;     // NEW
  overallReferences: number | undefined;     // NEW

  setCompleteness: (value: number | undefined) => void;
  setCoverage: (value: number | undefined) => void;
  setOverallValidation: (value: number | undefined) => void;    // NEW
  setOverallPlausibility: (value: number | undefined) => void;  // NEW
  setOverallLabRanges: (value: number | undefined) => void;     // NEW
  setOverallDuplicates: (value: number | undefined) => void;    // NEW
  setOverallReferences: (value: number | undefined) => void;    // NEW
}

// The no-op fallback in useQualityMetrics() must extend to all 7 pairs.
```

### Example 6: Route addition
```typescript
// Source: EXTEND src/App.tsx:71-79
<Route path="/quality" element={<QualityLayout />}>
  <Route index element={<QualityOverviewPage />} />
  <Route path="thresholds" element={<ThresholdsPage />} />  // NEW
  <Route path="completeness/:type" element={<CompletenessDrillDown />} />
  {/* ... existing drill-down routes unchanged ... */}
</Route>
```

## State of the Art

No "state of the art" shift — Phase 18 uses the same Mantine 8 + React 18 + react-router 7 stack that Phases 1-17 established. No deprecations apply.

**Nothing deprecated:**
- `useLocalStorage` from `@mantine/hooks` is current (8.3.x).
- `RingProgress.sections` API has been stable since Mantine 7.
- `NumberInput.clampBehavior` is stable in Mantine 8 (introduced in 7.x).

## Assumptions Log

| # | Claim | Section | Risk if Wrong |
|---|-------|---------|---------------|
| A1 | `useDuplicateReport` per-type average per D-03 simplifies to "use sampleSize as denominator" since the panel runs one type at a time | % Clean Derivation (Duplicates) | Tile shows slightly over-clean values on sparse servers; not an alerting false-negative unless sample returned drastically fewer than sampleSize — acceptable under D-17 "no-data = not breached" |
| A2 | Patient duplicate pass in `useDuplicateReport` always runs, so `duplicateClusters` + `skippedPatients` are reliable indicators even if selected `type !== 'Patient'` | % Clean Derivation (Duplicates) | Rollup denominator miscounts; user confused by tile not reflecting their selected type. Surface in plan as an explicit question to user. |
| A3 | `run.progress.total` for `usePlausibilityReport` equals `sample.length` (not `sampleSize`) at all statuses >= 'running' | % Clean Derivation (Plausibility) | `[VERIFIED: usePlausibilityReport.ts:78]` — `setProgress({ current: 0, total: sample.length })` confirmed. NOT an assumption. |
| A4 | Mantine `NumberInput` emits `''` or `undefined` on clear, not `null` | Pitfall 8 | `[ASSUMED]` — based on Mantine training data; should be confirmed in plan test cases. Wrong value handling breaks clear button. |
| A5 | Changing `defaultValue="counts"` to controlled `value={...}` on `<Tabs>` in `QualityOverviewPage` doesn't break existing tests | Pattern 4 / Pitfall 5 | `quality-overview.test.tsx` asserts tab panels mount with `keepMounted` — controlled mode should still satisfy that. Worth confirming in Wave 0 validation. |

All other factual claims in this research are `[VERIFIED: source file line-range]` against the installed codebase.

## Open Questions

1. **Duplicates rollup aggregation strategy** (D-03 literal interpretation)
   - What we know: D-03 says "applied per resource type then averaged." Current `DuplicatesPanel` runs one type at a time; averaging across types would require either (a) the panel iterates, (b) the OverviewStrip orchestrates across types, or (c) we accept the single-type-at-a-time simplification.
   - What's unclear: Which of (a)/(b)/(c) the user wants.
   - Recommendation: Planner raises this in plan-check or discuss-phase if still live. Conservative default: option (c) — document the simplification in the plan, flag it visibly, ship. Phase 19+ can widen if needed.

2. **Tile click — new URL or reuse `useState`?**
   - What we know: UI-SPEC prefers `?tab=X` query string; marks `useLocation().state` as fallback.
   - What's unclear: Whether the existing tests would break if `<Tabs>` changes from uncontrolled to controlled. (A5 above.)
   - Recommendation: Start with `?tab=X` (deep-linkable, robust). Update `quality-overview.test.tsx` test if needed — the test mocks panel components so behavior should be unchanged.

3. **Breach in panel summary vs. only in OverviewStrip (D-12 edge)**
   - What we know: D-12 says breach applies in "both places the metric appears" — OverviewStrip + each panel's internal summary.
   - What's unclear: For panels where the "internal summary" is a set of Mantine Badges (e.g., Plausibility's check-type badges, Duplicates' patient/hash lines), is "breached" even meaningful? CompletenessPanel has per-type RingProgress with no panel-level aggregate ring.
   - Recommendation: Interpret D-12 narrowly — the breach visual applies only where a panel-level aggregate value exists. For Plausibility/Duplicates/References, the panels currently show an Alert banner when issues are found and badges for counts; the "aggregate ring" in these panels does not exist. Phase 18 can either (a) add a panel-level aggregate ring that mirrors the tile (extra scope), or (b) interpret D-12 as "only tiles turn red; panels are unchanged." Recommend (b) for Phase 18 scope and document in plan.

## Environment Availability

Phase 18 has no external tools, services, or CLIs beyond the project's own build/test stack. All required tooling is already part of the project:

| Dependency | Required By | Available | Version | Fallback |
|------------|------------|-----------|---------|----------|
| Node.js | build + test | ✓ | — (project-provided) | — |
| npm | dependency install | ✓ | — | — |
| vite | dev server / build | ✓ | 8.0.4 | — |
| vitest | test runner | ✓ | 4.1.4 | — |
| jsdom | test environment | ✓ | 29.0.2 | — |

Phase 18 is a code-only change. Nothing new to install. Nothing to install blocks execution.

## Validation Architecture

`nyquist_validation` is explicitly enabled in `.planning/config.json`. This section is required.

### Test Framework
| Property | Value |
|----------|-------|
| Framework | vitest 4.1.4 + @testing-library/react 16.3.2 |
| Config file | `vitest.config.ts` (jsdom environment, globals enabled, includes `src/**/*.test.ts?(x)`) |
| Quick run command | `npm test -- <pattern>` (runs specific file once) — e.g., `npm test -- thresholds` |
| Full suite command | `npm test` (= `vitest run`) |

### Phase Requirements → Test Map

| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| DQ-11 | `useThresholds` merges overrides over `DEFAULT_THRESHOLDS` | unit | `npm test -- thresholds` | Wave 0 |
| DQ-11 | `useThresholds` persists to `quality.thresholds.v1` localStorage key | unit | `npm test -- thresholds` | Wave 0 |
| DQ-11 | `ThresholdsPage` renders 7 rows with defaults, custom, disabled badge states | integration | `npm test -- thresholds-page` | Wave 0 |
| DQ-11 | `ThresholdsPage` NumberInput blur commits value to storage | integration | `npm test -- thresholds-page` | Wave 0 |
| DQ-11 | `ThresholdsPage` Clear ActionIcon sets key to null | integration | `npm test -- thresholds-page` | Wave 0 |
| DQ-11 | `ThresholdsPage` Reset button opens modal and clears all overrides on confirm | integration | `npm test -- thresholds-page` | Wave 0 |
| DQ-11 | Configuration persists across reload (simulated via store + remount) | integration | `npm test -- thresholds-page` | Wave 0 |
| DQ-12 | `isBreached` returns `false` for undefined/null inputs, `true` when value < threshold | unit | `npm test -- thresholds` | Wave 0 |
| DQ-12 | `SummaryCard breached={true}` renders `red.6` ring section + red value text | integration | `npm test -- summary-card` | Wave 0 |
| DQ-12 | `SummaryCard breached={true} threshold={80}` renders "threshold: 80%" annotation | integration | `npm test -- summary-card` | Wave 0 |
| DQ-12 | `OverviewStrip` renders 9 tiles (2 informational + 7 metric) | integration | Extend `quality-overview.test.tsx` | ✅ (extend) |
| DQ-12 | `OverviewStrip` tile turns red when context value < threshold | integration | Extend `quality-overview.test.tsx` | ✅ (extend) |
| DQ-12 | `OverviewStrip` tile stays blue when no threshold set or value >= threshold | integration | Extend `quality-overview.test.tsx` | ✅ (extend) |
| DQ-12 | `OverviewStrip` tile renders em-dash + no breach when value undefined (D-17/D-18) | integration | Extend `quality-overview.test.tsx` | ✅ (extend) |
| DQ-12 | Metric tile click navigates to `/quality?tab=<metric>` | integration | Extend `quality-overview.test.tsx` | ✅ (extend) |
| DQ-12 | `ValidationPanel` pushes `overallValidation = (1 - unique_resources / total) * 100` on complete | integration | Extend `validation-panel.test.tsx` | ✅ (extend) |
| DQ-12 | `PlausibilityPanel` pushes `overallPlausibility` on complete | integration | Add `plausibility-panel.test.tsx` (or extend existing) | Wave 0 if no existing file |
| DQ-12 | `LabRangesPanel` pushes `overallLabRanges` (or skips when noRange===checked) | integration | Add `lab-ranges-panel.test.tsx` | Wave 0 |
| DQ-12 | `DuplicatesPanel` pushes `overallDuplicates` | integration | Extend `duplicates-panel.test.tsx` | ✅ (extend) |
| DQ-12 | `ReferencesPanel` pushes `overallReferences` | integration | Add `references-panel.test.tsx` | Wave 0 |

### Sampling Rate
- **Per task commit:** `npm test -- <the-file-just-touched>` — typically 1-2 seconds per file.
- **Per wave merge:** `npm test` — full suite, typically ~10-30 seconds on this codebase.
- **Phase gate:** Full suite green AND `npm run build` clean before `/gsd-verify-work`.

### Wave 0 Gaps
- [ ] `src/__tests__/thresholds.test.ts` — covers `useThresholds` hook + pure helpers (`resolveThreshold`, `isBreached`, storage round-trip)
- [ ] `src/__tests__/thresholds-page.test.tsx` — covers `ThresholdsPage` table, NumberInput, Clear, Reset modal, persistence
- [ ] `src/__tests__/summary-card.test.tsx` — covers `SummaryCard` breach props, click, ariaLabel
- [ ] `src/__tests__/lab-ranges-panel.test.tsx` — if missing, needed for rollup push test
- [ ] `src/__tests__/references-panel.test.tsx` — if missing, needed for rollup push test
- [ ] Test for `/quality/thresholds` route — can live inside `thresholds-page.test.tsx` using `<MemoryRouter initialEntries={['/quality/thresholds']}>`

*Note: Framework install is NOT needed — all test infrastructure is already installed and working (see package.json devDependencies).*

## Sources

### Primary (HIGH confidence — verified against installed source files)
- `src/quality/QualityMetricsContext.tsx` — context shape, current setters, no-op fallback
- `src/quality/types.ts` — `NormalizedIssue`, `IssueSeverity`, `PerTypeCompletenessReport`, `PerTypeCoverageReport`
- `src/quality/sampling.ts` — sample helper signature
- `src/quality/keys.ts` — existing `LOCAL_STORAGE_PREFIX` convention (`quality-metrics:v1:`)
- `src/quality/metricsCache.ts` — LRU cache pattern (for reference; Phase 18 does NOT extend this)
- `src/quality/labRangeChecker.ts` — `LabRangeSummary` shape (checked / outOfRange / noRange / perLoincCode)
- `src/quality/patientDuplicateDetector.ts` — `PatientDuplicateCluster` shape
- `src/quality/contentHasher.ts` — `ContentHashCluster` shape
- `src/quality/orphanDetector.ts` — orphan issue semantics
- `src/hooks/useCompletenessReport.ts` — existing rollup wiring (canonical pattern for Phase 18)
- `src/hooks/useCodingCoverage.ts` — same
- `src/hooks/useConformanceRun.ts` — shape of `run.issues`, `run.progress.total = sample.length`
- `src/hooks/usePlausibilityReport.ts` — same
- `src/hooks/useLabRangesReport.ts` — shape including `summary` field
- `src/hooks/useDuplicateReport.ts` — cluster shapes + progress semantics
- `src/hooks/useReferenceReport.ts` — `brokenCount`/`orphanCount`/`issues` shape; progress = batch count (NOT resource count)
- `src/components/quality/SummaryCard.tsx` — existing prop surface (45 LOC — small, easy to extend)
- `src/components/quality/OverviewStrip.tsx` — existing 4-tile layout + `useQualityMetrics` consumption
- `src/components/quality/QualityOverviewPage.tsx` — toolbar structure, useLocalStorage for cohort, Tabs value strings
- `src/components/quality/QualityLayout.tsx` — connection-gated outlet; `QualityMetricsProvider` mount point
- `src/components/quality/SampleSizeControl.tsx` — `useLocalStorage` pattern for preferences
- `src/components/quality/CohortSelector.tsx` — existing MultiSelect preference pattern
- `src/components/quality/CompletenessPanel.tsx` — per-type ring rendering pattern
- `src/components/quality/ValidationPanel.tsx` — dedup of conformance + legacy issues (for rollup numerator)
- `src/components/quality/PlausibilityPanel.tsx` — `resourcesWithIssues` derivation pattern
- `src/components/quality/LabRangesPanel.tsx` — `summary`-driven UI
- `src/components/quality/DuplicatesPanel.tsx` — `patientsInvolved`, `hashResourcesInvolved` already computed
- `src/components/quality/ReferencesPanel.tsx` — `brokenCount`/`orphanCount` surfaced
- `src/App.tsx` — route tree; child-route-of-`/quality` pattern
- `src/__tests__/quality-overview.test.tsx` — existing test shape; shows how to test context consumption
- `vitest.config.ts` — test env config
- `package.json` — dep versions (all 6 Mantine 8 peers present + test stack)
- `node_modules/@mantine/core/lib/components/RingProgress/RingProgress.d.ts` — `sections: { value, color: MantineColor, tooltip? }[]`

### Secondary (MEDIUM confidence — project convention inferred from multiple call sites)
- `useLocalStorage` pattern: verified in 3 independent call sites (SampleSizeControl, QualityOverviewPage for cohort, ValidationPanel for banner dismissal) — high consistency, low risk pattern.
- Key naming convention `quality.{concern}.v1` — verified in `quality.cohort.v1`, `quality.sampleSize.v1`, `quality.validation.bannerDismissed.v1:...`, `quality.validation.phiAcknowledged.v1:...`.

### Tertiary (LOW confidence — none)
No LOW confidence claims in this research. Every claim is traced to an installed source file line range.

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH — all deps already installed, pinned versions verified against package.json.
- Architecture: HIGH — patterns are established in 3-5 places per pattern; Phase 18 reuses them verbatim.
- Pitfalls: HIGH for Pitfalls 1-7 (code-grounded). MEDIUM for Pitfall 8 (Mantine NumberInput empty-value behavior — assumption flagged in Assumptions Log as A4).
- % Clean Derivation: MEDIUM for Duplicates (A1/A2 — implementation choice pending planner confirmation), HIGH for the other 6 metrics.

**Research date:** 2026-04-14
**Valid until:** 2026-05-14 (30 days — stable stack, no fast-moving dependencies; the codebase is internal and may evolve, so re-verify line references if the phase isn't executed within the window).

## RESEARCH COMPLETE
