---
review_type: codebase
reviewers: [claude, codex, gemini]
reviewed_at: 2026-04-16
scope: entire src/ tree
axes: [inconsistencies, duplication, efficiency, style]
---

# Cross-AI Codebase Review — FHIR Exploder

Three independent reviewers audited the repo for inconsistencies, duplication,
efficiency, and style drift.

- **Claude** (in-process subagent, Read/Grep) — full structured review
- **Codex** (`codex exec`) — full structured review
- **Gemini** (`gemini -p`) — rate-limited before finishing; partial narrative
  observations captured below

---

## Claude Review

### Summary
The codebase is well-documented and internally consistent in broad strokes, but
the Quality module shows substantial copy-paste from parallel development of
multiple similar metrics (Completeness / Coding / Validation / Plausibility /
LabRanges / Duplicates / References). Five drill-down pages are near-identical
shells, two cache-bearing hooks are 95% duplicated, four async "report" hooks
share an unextracted state machine, and the `toRecord` helper in
`src/utils/fhir-helpers.ts` is ignored by 13+ call sites that open-code the
exact double-cast it was created to centralise.

### Inconsistencies
- **HIGH** `src/hooks/useCompletenessReport.ts:43-51` ↔ `src/hooks/useCodingCoverage.ts:35-43` — both hooks keep a single module-scoped `cacheInstance` that rotates on `serverUrl` change, silently discarding the previous server's cache. Fix: promote to `Map<string, QualityMetricsCache>` in `src/quality/metricsCache.ts`.
- **MEDIUM** `src/hooks/useCompletenessReport.ts:70-133` uses closure-scoped `let cancelled = false` for cancellation while six sibling hooks (`useValidationRun.ts:81`, `useConformanceRun.ts:102`, `usePlausibilityReport.ts:62`, `useLabRangesReport.ts:58`, `useDuplicateReport.ts:73`, `useReferenceReport.ts:67`) use `cancelledRef`. Pick one.
- **MEDIUM** `src/components/quality/CompletenessPanel.tsx:173-175,200-205,220-223` (plain `<Link>` with inline `style={{ color: 'var(--mantine-color-blue-6)' }}`) ↔ `src/components/quality/CodingCoveragePanel.tsx:214-219` (`<Anchor component={Link} c="blue.6">`). Fix: adopt the Anchor idiom in CompletenessPanel.
- **LOW** `src/components/quality/PlausibilityDrillDown.tsx:68-69` uses `--` where `CompletenessDrillDown.tsx:94-95` uses `—` for the same separator.

### Duplication
- **HIGH** All 5 type-scoped drill-downs — `PlausibilityDrillDown.tsx:24-97`, `LabRangesDrillDown.tsx:24-95`, `DuplicatesDrillDown.tsx:24-96`, `ReferencesDrillDown.tsx:23-96`, plus the progress/error/empty blocks of `CompletenessDrillDown.tsx:81-141` + `CodingDrillDown.tsx:141-191` — repeat the same "Back → Title → auto-focus → progress / error / empty / ResourceIssueTable" shell. ~400 duplicated lines. Fix: extract `<DrillDownShell>` taking `{ status, progress, issues, errorMessage }`.
- **HIGH** `src/hooks/useCompletenessReport.ts:45-51` ↔ `src/hooks/useCodingCoverage.ts:37-43` — `getCache`, `cacheInstance`, the seeding loop (`:85-92` ↔ `:76-83`), the worker-pool `next()` (`:97-127` ↔ `:88-121`), and the rollup effect (`:137-157` ↔ `:133-155`) are line-for-line. Fix: extract `useSampleWalker<T>({ walker, metricKey, setRollup })`.
- **HIGH** `src/hooks/usePlausibilityReport.ts:48-139` ↔ `src/hooks/useLabRangesReport.ts:44-124` ↔ `src/hooks/useDuplicateReport.ts:57-203` ↔ `src/hooks/useReferenceReport.ts:52-169` — identical state-machine scaffolding (status/progress/issues/errorMessage/cancelledRef, IIFE with 4 cancellation checks, unmount cleanup, `cancel` callback). Fix: extract `useAsyncRun<TState>(runner)`.
- **MEDIUM** `src/components/quality/CompletenessDrillDown.tsx:165-183` ↔ `src/components/quality/CodingDrillDown.tsx:229-236` — identical `onClick` / `role="button"` / `tabIndex` / `onKeyDown` space+enter block. Fix: `<ClickableRow>` or `useClickableRow(onClick)` hook.
- **MEDIUM** `src/components/quality/CompletenessPanel.tsx:76-101` ↔ `src/components/quality/CodingCoveragePanel.tsx:91-116` — `SortableTh` defined identically in both. Fix: move to shared `SortableTh.tsx`.
- **MEDIUM** Progress-widget math `pct = run.progress.total > 0 ? Math.round(...) : 0` inlined in 9 panel+drill-down files. Fix: `<RunProgress run={run} label="..." />`.
- **MEDIUM** `src/components/layout/Sidebar.tsx:56-93` — the two `UnstyledButton + dot + Text` blocks for FHIR/Terminology status differ only in the config source.
- **LOW** `as unknown as Record<string, unknown>` appears 13+ times across `useReferenceReport.ts:101`, `useConformanceRun.ts:71,175,194`, `completenessWalker.ts:107`, `codingCoverageWalker.ts:188`, `orphanDetector.ts:109`, `contentHasher.ts:54,106`, `temporalPlausibilityWalker.ts:373,439`, `profileConformanceChecker.ts:139,142-147,296` — despite `src/utils/fhir-helpers.ts:9` exporting `toRecord(resource)` to centralise this.

### Efficiency
- **HIGH** `src/components/quality/CodingDrillDown.tsx:112` — `useExamplesByPath` fires a second `sampleResources` call for the same (type, sampleSize) that `useCodingCoverage` just fetched. Inline comment at `:107-111` acknowledges it. Fix: extend `PerTypeCoverageReport` with `perPathExamples: Record<string, CodeableConcept>` populated by `aggregateCoverage`.
- **MEDIUM** `src/hooks/useResourceCounts.ts:75` uses `resourceTypes.join(',')` as an effect dep, allocating a new string every render. Fix: `useMemo(() => resourceTypes.join(','), [resourceTypes])`.
- **MEDIUM** `src/components/quality/ResourceIssueTable.tsx:92-94` — `filtered.slice(...)` runs outside `useMemo` on every render. Fix: move the pagination slice into the memo.
- **LOW** `src/quality/completenessWalker.ts:58-61` — `isPathPopulated` inspects only `node[0]` of arrays (flagged as v1 scope).

### Style / Conventions
- **MEDIUM** `src/components/quality/CompletenessDrillDown.tsx:44` / `CodingDrillDown.tsx:101` — `useRef<HTMLAnchorElement | null>` for a `<Button component={Link}>`. Fix: `HTMLButtonElement` or `HTMLElement`.
- **MEDIUM** Four drill-downs (`PlausibilityDrillDown.tsx:52`, `LabRangesDrillDown.tsx:50`, `DuplicatesDrillDown.tsx:49`, `ReferencesDrillDown.tsx:49`) carry `eslint-disable-next-line react-hooks/exhaustive-deps` above auto-start effects.
- **LOW** `ResourceIssueTable.tsx:158` uses `--` between numeric ranges while sibling UI uses `—`.

### Claude's Top 5
1. Extract `<DrillDownShell>` and collapse the five drill-down bodies (~400 lines eliminated).
2. Extract `useAsyncRun<TState>` for the four report hooks.
3. Extract `useSampleWalker` to dedupe completeness vs. coding; fold the cache into `Map<serverUrl, cache>`.
4. Add `perPathExamples` to `PerTypeCoverageReport` and delete `useExamplesByPath` — halves coding-drill-down server calls.
5. Sweep the `as unknown as Record<string, unknown>` casts to the existing `toRecord` helper; extract `SortableTh` and `<RunProgress>`.

---

## Codex Review

### Summary
The codebase is generally coherent and appears well-covered by tests, but it is
starting to drift in the exact places that usually get expensive later: route
shells, metric/report runners, and search flows are duplicated and no longer
perfectly aligned. The biggest risks are extra server traffic from repeated
count/sampling work and small but visible convention drift around routing,
link handling, hook suppressions, and comment density.

### Inconsistencies
- **MEDIUM** `src/components/layout/Sidebar.tsx:97-115` — sidebar marks items active only on exact pathname matches (`location.pathname === item.to`), so nested routes like `/patients/123`, `/explorer/Patient/1`, `/quality/plausibility/Observation` lose their main-section highlight. Fix: prefix match for section roots or let `RouterNavLink` decide.
- **LOW** `src/components/explorer/SearchResultsPage.tsx:385`, `src/components/patients/PatientListPage.tsx:337`, `src/components/quality/ResourceCountsPanel.tsx:136`, `src/components/quality/CodingCoveragePanel.tsx:214` — internal navigation uses three different patterns: `href + preventDefault + navigate`, raw `Link` with inline color, and `Anchor component={Link}`. Fix: standardize on `Anchor component={Link}`.
- **LOW** `src/components/quality/CompletenessPanel.tsx:169` ↔ `src/components/quality/CodingCoveragePanel.tsx:210` — same "resource-type link in table row" pattern rendered two different ways.

### Duplication
- **MEDIUM** `src/components/explorer/ExplorerLayout.tsx:24`, `src/components/patients/PatientsLayout.tsx:28`, `src/components/quality/QualityLayout.tsx:84` — connection gate, "Not connected" alert copy, and `MedplumProvider` outlet wiring are triplicated. Fix: extract shared connection-gated outlet.
- **MEDIUM** `src/hooks/useCompletenessReport.ts:70` ↔ `src/hooks/useCodingCoverage.ts:61` — debounce, cache lookup, queue worker pool, cancellation, error handling, and rollup-update structure duplicated; only compute step differs.
- **MEDIUM** `src/components/explorer/SearchResultsPage.tsx:165`, `src/components/patients/PatientListPage.tsx:107` — wildcard identifier search repeats "fetch up to 5000 ids, prefix-filter client-side, then fetch the matching page" in two places. Fix: shared helper.
- **LOW** `PlausibilityDrillDown.tsx:43`, `ReferencesDrillDown.tsx:40`, `LabRangesDrillDown.tsx:41`, `DuplicatesDrillDown.tsx:40` — autofocus, auto-start, progress banner, alerts, back-button scaffolding nearly identical.

### Efficiency
- **HIGH** `src/hooks/useResourceCounts.ts:28`, `src/components/dashboard/DashboardPage.tsx:77`, `src/components/explorer/ResourceTypeLanding.tsx:24`, `src/components/quality/QualityOverviewPage.tsx:108` — `useResourceCounts` does one `_summary=count` per type with no cross-mount cache, and three top-level pages invoke it independently. Switching sections replays dozens of count requests. Fix: module-scoped cache keyed by `serverUrl + resourceType`.
- **HIGH** `src/components/quality/QualityOverviewPage.tsx:382`, `src/components/quality/CompletenessPanel.tsx:98`, `src/components/quality/CodingCoveragePanel.tsx:111` — the quality dashboard keeps every tab mounted (`keepMounted`), and two panels fetch immediately on render. Opening `/quality?tab=counts` still kicks off completeness + coding sampling in the background. Fix: drop `keepMounted` on heavy panels, or gate hooks behind active tab.
- **MEDIUM** `src/components/quality/CodingDrillDown.tsx:52,103` — drill-down fetches the same sample twice (TODO present).

### Style / Conventions
- **MEDIUM** `src/contexts/SettingsContext.tsx:32` suppresses `react-hooks/exhaustive-deps` while `src/contexts/TerminologyContext.tsx:30` stays lint-clean. Fix: wrap `setSettings` in `useCallback`.
- **LOW** `src/components/patients/PatientListPage.tsx:70` — `initialFromUrl` frozen via inline `eslint-disable-line`. Fix: `useState(() => ...)` or `useRef(...)`.
- **LOW** `QualityLayout.tsx:35` embeds a long migration essay while sibling `ExplorerLayout.tsx:14`, `PatientsLayout.tsx:14` stay terse. Fix: move rationale into `migrateLegacyResourceTypeKey`.

### Codex's Top 5
1. Shared cache for `useResourceCounts` so dashboard, explorer, and quality don't each re-run a full per-type sweep.
2. Stop mounting heavy quality tabs by default or gate report hooks on the active tab.
3. Extract shared connection-gated outlet / "Not connected" alert used by three layouts.
4. Extract wildcard `_id`/`identifier` prefix-search helper.
5. Standardize internal links on `Anchor component={Link}` and fix sidebar activation for nested routes.

---

## Gemini Review (partial — rate-limited)

Gemini exhausted its quota mid-review. It completed enough exploration to
corroborate several findings but did not emit a structured report. Its captured
observations:

- **Duplication** between `useCodingCoverage.ts` and `useCompletenessReport.ts`
  in both worker-pool structure and cache management — "clear candidate for a
  unified `useQualityReport` hook." (corroborates Claude + Codex)
- **Re-render cost**: worker pools trigger a re-render for every completed
  resource type; `QualityMetricsProvider` causes all consumers to re-render on
  any metric update. Suggests splitting the context or reducer-style updates.
- **`CodingCoveragePanel.tsx` vs `CompletenessPanel.tsx`**: duplication in
  sorting logic, table structures, state handling. Link rendering is
  inconsistent (`Anchor` more idiomatic). (corroborates Codex)
- **Bundle size**: all routes are statically imported in `src/App.tsx`. A
  ~35k-LOC app likely benefits from `React.lazy` for routes.

---

## Consensus Summary

### Agreed findings (2+ reviewers)

**HIGH severity**
1. **`useCompletenessReport` ↔ `useCodingCoverage` duplication** — flagged by
   all three reviewers. Worker pool, cache handling, cancellation,
   rollup effect are line-for-line. Action: extract a shared
   `useSampleWalker` / `useQualityReport` hook.
2. **`useResourceCounts` has no cross-mount cache** — Codex flagged as HIGH;
   Gemini noted excessive re-renders from the same hook. Three consumers
   (dashboard / explorer / quality) each re-run the full per-type sweep on
   mount. Action: module-scoped `Map<serverUrl+type, count>` cache.
3. **Drill-down page duplication** — Claude: 5 drill-downs, ~400 lines.
   Codex: 4 drill-downs, near-identical scaffolding. Action: `<DrillDownShell>`.
4. **`keepMounted` eager fetch** — Codex flagged that `/quality?tab=counts`
   silently fires completeness + coding sampling. Gemini independently noted
   "statically imported / always-mounted" as a bundle+work concern.
5. **Duplicated coding-sample fetch in `CodingDrillDown.tsx`** — Claude (HIGH)
   and Codex (MEDIUM). Same sample fetched twice; TODO already in code.

**MEDIUM severity**
6. **Inconsistent link rendering** — Claude + Codex both flagged plain `Link`
   with inline color vs. Mantine `Anchor component={Link}`. Gemini confirmed.
   Action: standardize on `Anchor component={Link}`.
7. **Route-layout triplication** — Codex flagged `ExplorerLayout` /
   `PatientsLayout` / `QualityLayout` gate + alert triplication. Not called
   out by Claude but verifiable.
8. **Four report hooks share an unextracted state machine** — Claude flagged
   `usePlausibilityReport` / `useLabRangesReport` / `useDuplicateReport` /
   `useReferenceReport`. Codex's finding on hook duplication subsumes it.
   Action: `useAsyncRun<TState>` hook.

### Divergent views

- **Claude** emphasized micro-duplication (`toRecord` casts, `SortableTh`,
  progress math, clickable-row handler) — lower severity but low-effort fixes.
- **Codex** emphasized macro-duplication at route-layout and search-flow level,
  and nested-route sidebar activation — Claude missed these.
- **Gemini** (before exhaustion) emphasized context-provider re-render cost
  and route-level code-splitting — neither other reviewer brought this up.

### Recommended first wave (highest impact / lowest effort)

1. `Map<serverUrl, QualityMetricsCache>` + shared `useSampleWalker` — fixes
   caching and dedupes two hooks in one change.
2. `<DrillDownShell>` — deletes ~400 lines, forces convention.
3. Drop `keepMounted` on the Completeness/Coding tabs (or gate the hooks on
   `isActive`).
4. Thread `perPathExamples` into `PerTypeCoverageReport` and delete
   `useExamplesByPath` — halves server calls on coding drill-down.
5. Sweep `as unknown as Record<string, unknown>` → existing `toRecord` helper
   (mechanical, low risk).

---

## Artifacts
- Full Claude review: above
- Full Codex review: above (extracted from `/tmp/gsd-review-codex-code.err`
  line 11864+)
- Gemini narrative: `/tmp/gsd-review-gemini-code.md` (truncated by rate limit)

To incorporate these findings into planning, feed this file to
`/gsd-plan-phase {N} --reviews`.
