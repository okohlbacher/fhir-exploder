# Phase 24: Data-Fetching Foundation — Context

**Gathered:** 2026-04-17
**Status:** Ready for planning

<domain>
## Phase Boundary

Make the FHIR fetch layer cache-aware and cancellation-safe. Three deliverables:

1. **FOUND-01** — `useResourceCounts` reads through a module-scoped `Map<serverUrl+type, count>` cache so Dashboard, ResourceTypeLanding, and QualityOverviewPage don't re-fire count sweeps on every mount. Absorbs the `resourceTypes.join(',')` effect-dep bug fix (line 75).
2. **FOUND-02** — `metricsCache.ts` gets a `Map<serverUrl, QualityMetricsCache>` module-scope registry with 2-entry LRU eviction, replacing the rotating `cacheInstance` singleton in `useCompletenessReport` and `useCodingCoverage`. Registry clears the current-server entry whenever settings are saved.
3. **FOUND-03 + FOUND-04** — New `useAsyncRun<TIssue>` hook with closure-scoped `let cancelled` (NOT `cancelledRef`) owns `{status, progress, errorMessage, cancel, run}`. The 4 report hooks (`usePlausibilityReport`, `useLabRangesReport`, `useDuplicateReport`, `useReferenceReport`) refactor to wrap it. `useResourceCounts.ts:29` `cancelledRef` pre-fixed to `let cancelled` in the same PR.

No user-visible UI changes. No scope beyond the 4 requirements.

</domain>

<decisions>
## Implementation Decisions

### FOUND-01 — Count cache staleness policy

- **D-01:** Count cache is **session-scoped with no TTL**. The module-scope `Map<serverUrl+type, count>` persists for the browser tab's lifetime and is never automatically refreshed.
- **D-02:** Staleness is acceptable for a local tool — Blaze data changes mid-session are rare. The existing "Recompute" button on the quality dashboard gives users intentional refresh when they need it. No TTL, no background polling.
- **D-03:** The count cache IS cleared when `clearQualityCountCache(serverUrl)` is called. Wire it alongside `clearQualityMetricsCache(serverUrl)` in `SettingsPage.tsx` (existing "Clear cache" button) and on any `setSettings()` call (same as FOUND-02 trigger).

### FOUND-02 — Settings invalidation mechanism

- **D-04:** Use a **direct call at save time** (not a version counter or `useEffect` watcher). When `SettingsPage` calls `setSettings(next)` to apply new settings, it also calls `clearQualityMetricsCache(serverUrl)` and `clearQualityCountCache(serverUrl)`. No watcher needed.
- **D-05:** "Any settings save" triggers the wipe — conservative and simple. Even a sampleSize change clears cached reports. The clear is cheap (memory Map cleared + scoped localStorage keys removed) and prevents stale reports from silently accumulating.
- **D-06:** Registry function signature: `getQualityMetricsCache(serverUrl: string): QualityMetricsCache` — creates and inserts if absent (with 2-entry LRU eviction), returns existing if present. `clearQualityMetricsCache(serverUrl: string)` calls `.clear()` on the registry entry and removes it from the map. Both exported from `metricsCache.ts`.

### FOUND-03 — `useAsyncRun` API and scope

- **D-07:** Follow the ARCHITECTURE.md Q1 proposed shape exactly. The `runner` receives `{ isCancelled, setProgress, appendIssues }` helpers. Closure-scoped `let cancelled` is the cancellation mechanism — no `AbortController`, no `useRef`. This is an explicit invariant (STATE.md safety invariants).
- **D-08:** Include `autoStart?: boolean` in Phase 24 when `useAsyncRun` is authored. Zero extra cost to add now; Phase 25 drill-down refactor will use it, and a second patch-the-hook PR would be wasteful. `autoStart: true` triggers a `start()` call inside the hook's `useEffect` on mount (and on `deps` change). Drill-down pages will set `autoStart: true`; panel pages will leave it at the default `false` and call `start()` imperatively.
- **D-09:** The 4 refactored report hooks retain their own typed state for metric-specific payload (e.g., `useLabRangesReport` still returns `LaunchRangeIssue[]`, not `unknown[]`). No new `as` casts in consumer panels. Hook exported API is backward-compatible.

### FOUND-04 — Cancellation fix in `useResourceCounts`

- **D-10:** `cancelledRef` at `useResourceCounts.ts:29` converted to closure-scoped `let cancelled = false` inside the `useEffect`. Matches the already-validated pattern in `useCompletenessReport.ts:71-74`. This is a latent bug (stale `cancelledRef.current = false` at the top of the effect does not reset the ref for concurrent runs from prior effects).

### Claude's Discretion

- Exact LRU eviction implementation in `Map<serverUrl, QualityMetricsCache>` (insert-evict when size > 2, deleting `map.keys().next().value` — the same pattern as `QualityMetricsCache.memory`).
- Test split: `useAsyncRun.test.ts` unit-tests the reducer; integration-level smoke via the existing panel tests that exercise `start()` / `cancel()`.
- Whether to colocate `getQualityCountCache` with `metricsCache.ts` or create a separate `countCache.ts` — either is fine; prefer same file for discoverability.

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Requirements
- `.planning/REQUIREMENTS.md` §Phase 24 — FOUND-01, FOUND-02, FOUND-03, FOUND-04 (exact acceptance criteria)

### Architecture Research
- `.planning/research/ARCHITECTURE.md` §Q1 — `useAsyncRun<TIssue>` and `useSampleWalker<T>` proposed shapes, reducer pattern, closure-scoped cancellation rationale
- `.planning/research/ARCHITECTURE.md` §Q2 — Module-scoped `Map<serverUrl, X>` cache pattern, problem statement with file:line evidence
- `.planning/research/PITFALLS.md` — Phase 24 pitfalls (esp. Pitfall 2: stale closure in multi-effect hook; Pitfall 3: LRU eviction race)

### State / Safety Invariants
- `.planning/STATE.md` §Accumulated Context §Decisions — "closure-scoped `let cancelled` in `useAsyncRun` (NOT `cancelledRef`); 2-entry LRU eviction on `Map<serverUrl, QualityMetricsCache>`"

### Source Files to Read Before Modifying
- `src/hooks/useResourceCounts.ts` — FOUND-01 + FOUND-04 target; note line 75 `resourceTypes.join(',')` dep and line 29 `cancelledRef`
- `src/hooks/useResourceCountsMetrics.ts` — thin orchestrator above `useResourceCounts`; check consumer signature before changing return type
- `src/quality/metricsCache.ts` — FOUND-02 target; `QualityMetricsCache` class stays unchanged, only the module-scope registry is new
- `src/hooks/useCompletenessReport.ts` lines 43-51 — existing `cacheInstance` pattern being replaced by FOUND-02 registry
- `src/hooks/useCodingCoverage.ts` lines 35-43 — same pattern, second site
- `src/hooks/usePlausibilityReport.ts` — FOUND-03 refactor target (139 → ~40 lines)
- `src/hooks/useLabRangesReport.ts` — FOUND-03 refactor target (124 → ~40 lines)
- `src/hooks/useDuplicateReport.ts` — FOUND-03 refactor target (203 → ~40 lines; two-phase runner)
- `src/hooks/useReferenceReport.ts` — FOUND-03 refactor target (169 → ~40 lines)
- `src/contexts/SettingsContext.tsx` — `setSettings()` call site for FOUND-02 cache-clear wiring
- `src/components/settings/SettingsPage.tsx` — existing "Clear cache" button; add count cache clear here

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- `QualityMetricsCache` class (`src/quality/metricsCache.ts:26`) — keep class unchanged; wrap in registry
- `clearAllQualityMetrics()` function in `metricsCache.ts` — already wired to Settings "Clear cache" button; extend with count cache clear
- `useCompletenessReport.ts:43-51` — existing `getCache(serverUrl)` helper pattern to follow for the registry
- Worker-pool + `CONCURRENCY=4` + `processNext()` pattern in `useResourceCounts.ts` — keep for FOUND-01; just add cache read-through wrapper

### Established Patterns
- Closure-scoped `let cancelled = false` inside `useEffect` (validated in `useCompletenessReport.ts:71-74` — comment explains the rationale vs `useRef`)
- Module-scope singleton already precedent: `TerminologyCache.ts`, existing `cacheInstance` in completeness/coding hooks
- Hook-per-metric architecture: `useAsyncRun` is a new primitive but does NOT replace individual hooks — it's adopted inside them

### Integration Points
- `DashboardPage.tsx:77` + `ResourceTypeLanding.tsx:24` + `QualityOverviewPage.tsx:108` — all call `useResourceCounts`; no consumer changes needed after FOUND-01 (module-scope cache is transparent)
- `SettingsPage.tsx` `handleSave` — add `clearQualityCountCache(serverUrl)` and `clearQualityMetricsCache(serverUrl)` calls alongside existing `setSettings()`
- `CompletenessPanel.tsx`, `CodingCoveragePanel.tsx` — currently call the refactored hooks; no signature changes (backward-compatible)
- Phase 25 will adopt `useAsyncRun` in `useSampleWalker` — keep the hook file at `src/hooks/useAsyncRun.ts` (conventional location)

</code_context>

<specifics>
## Specific Ideas

- The ARCHITECTURE.md Q1 section has a concrete code sketch of `useAsyncRun<TIssue>` and the refactored `usePlausibilityReport` (~40 lines). Use it as the starting template for the reducer + runner shape.
- The `let cancelled` pattern rationale is documented in the existing codebase at `useCompletenessReport.ts:71-74` — reference that comment in the new `useAsyncRun.ts` file header so the pattern is discoverable.
- For FOUND-01: the `Map<serverUrl+type, count>` key format should be `${serverUrl}::${resourceType}` (double-colon separator to avoid collision with URLs that contain slashes).

</specifics>

<deferred>
## Deferred Ideas

- `useSampleWalker<T>` for completeness + coding — Phase 25 (QDDEP-03), after `useAsyncRun` is stable
- `autoStart` drill-down behavior wiring — Phase 25 (when drill-downs are refactored)
- `QualityMetricsContext` re-render split — v1.5+ (EFF-R14, deferred on risk/reward grounds)
- AbortController for network-level cancellation — defer to a later milestone if profiling shows network dominates

None — discussion stayed within phase scope.

</deferred>

---

*Phase: 24-data-fetching-foundation*
*Context gathered: 2026-04-17*
