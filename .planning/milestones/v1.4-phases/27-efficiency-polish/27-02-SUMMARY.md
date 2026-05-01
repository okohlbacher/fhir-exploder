---
phase: 27-efficiency-polish
plan: 02
subsystem: build, routing
tags: [react, lazy-loading, vite, bundle-analyzer, code-splitting, suspense, tdd]
requires:
  - src/App.tsx (route registry — 7 quality drill-downs converted)
  - src/components/layout/AppLayout.tsx (Suspense boundary host)
  - vite.config.ts (visualizer plugin host)
  - package.json + package-lock.json (devDep + script)
  - .gitignore (analyzer output exclusion)
provides:
  - retry<T>(fn, maxAttempts=3, baseDelayMs=100) — explicit-loop chunk-load retry utility
  - 7 separate Vite chunks for quality drill-down routes (initial bundle smaller)
  - Single global Suspense fallback at AppLayout with data-testid='route-loading'
  - npm run analyze script gated on ANALYZE=1 → dist/bundle-stats.html treemap
  - Canonical findBy* test pattern reference for future contributors
affects:
  - Initial bundle size (7 drill-down components no longer in main bundle)
  - First-visit latency to drill-down routes (one network round-trip per chunk on first hit; cached thereafter)
  - Build pipeline (analyzer plugin only when ANALYZE=1; no impact on plain builds)
tech-stack:
  added: [rollup-plugin-visualizer@^7.0.1]
  patterns: [react-lazy-with-retry, module-scope-lazy-declarations, env-gated-vite-plugin, tdd-red-green]
key-files:
  created:
    - src/utils/lazyRetry.ts
    - src/utils/__tests__/lazyRetry.test.ts
    - src/__tests__/lazy-routes.test.tsx
  modified:
    - src/App.tsx
    - src/components/layout/AppLayout.tsx
    - vite.config.ts
    - package.json
    - package-lock.json
    - .gitignore
decisions:
  - "D-05..D-09 (EFF-02): 7 lazy routes (6 drill-downs + thresholds), single global Suspense at AppLayout Outlet, retry util at src/utils/lazyRetry.ts, data-testid='route-loading' mandatory."
  - "D-07 retry shape: explicit for-loop, NOT recursion (Pitfall 1). 3 attempts default. Backoff baseDelayMs * Math.pow(3, attempt) → 100/300ms waits between retries."
  - "D-10..D-12 (EFF-03): rollup-plugin-visualizer ^7.0.1 in devDeps, gated on process.env.ANALYZE === '1' (strict string equality, NOT truthy — Pitfall 3). Output dist/bundle-stats.html, treemap, gzipSize true."
  - "Test harness for lazy-routes test uses a minimal Suspense-around-Outlet shell rather than the full AppLayout — avoids needing to provide Settings/Connection/Terminology context for Sidebar's settings modals, which are unrelated to the lazy-loading behavior under test."
  - "React Router #12474 watchpoint documented in AppLayout.tsx fallback comment but workaround NOT applied — would force remount on every nav and harm UX even for cached chunks. Revisit in v1.5 only if user reports missing-spinner UX."
metrics:
  duration: "~7 minutes (planned ~1 day for full phase 27, 27-02 portion roughly 4-6 hr planned)"
  completed: "2026-04-23T06:07Z"
  diff_loc: "+416 / -27 (most of +416 is package-lock.json from rollup-plugin-visualizer transitive deps; source delta ≈ +145 / -27)"
  test_count_delta: "+6 (806 → 812 passing; 22 pre-existing failures unchanged)"
  lazy_chunks_emitted: 7
---

# Phase 27 Plan 02: Lazy Quality Routes + Bundle Analyzer Summary

EFF-02 + EFF-03 satisfied. The 6 quality drill-down routes plus `/quality/thresholds` now load as separate Vite chunks via `React.lazy()` wrapped in a `retry()` utility (3 attempts, 100/300ms exponential backoff). A single global `<Suspense>` boundary at `AppLayout` provides a Mantine Loader with `data-testid="route-loading"`. `rollup-plugin-visualizer@^7.0.1` is wired behind an `ANALYZE=1` env gate so `npm run analyze` emits `dist/bundle-stats.html` (a 2.9 MB treemap) showing each lazy chunk as a separate emit.

## What changed

### New file — `src/utils/lazyRetry.ts` (~40 LOC)

`retry<T>(fn, maxAttempts=3, baseDelayMs=100): Promise<T>` — explicit-loop, exponential backoff (`baseDelayMs * Math.pow(3, attempt)`). Returns first success or throws the LAST error after `maxAttempts`. Per Pitfall 1 (27-RESEARCH.md), the implementation is a bounded `for` loop — no recursion — so accidental infinite-loop footguns are impossible regardless of attempt count.

### Source — `src/App.tsx` (+57 LOC, -8 LOC)

Removed 7 static imports for the drill-down components. Added 7 `lazy(() => retry(() => import('...')).then((m) => ({ default: m.X })))` declarations at module scope (Pitfall 2: lazy() must NOT be called inside a render). Each named export is reshaped to React.lazy's required default-export shape. Route entries unchanged — they reference the same identifiers, just now lazy-bound. NOT lazy: `QualityOverviewPage`, `CohortsPage`, dashboard / explorer / patients / settings — landing pages users hit on first load (D-05).

### Source — `src/components/layout/AppLayout.tsx` (+27 LOC, -1 LOC)

`<Outlet />` now wrapped in `<Suspense fallback={<RouteLoadingFallback />}>`. `RouteLoadingFallback` is an inline component rendering a Mantine `Center` + `Loader` with `data-testid="route-loading"` (D-09 mandatory). The component's docblock documents the React Router #12474 watchpoint and explicitly notes the `<Suspense key={location.key}>` workaround was deliberately not applied.

### Build pipeline — `vite.config.ts` (+18 LOC, -1 LOC)

Plugin array becomes a `PluginOption[]` built up before `defineConfig`. When `process.env.ANALYZE === '1'` (strict equality — Pitfall 3 mitigation), the visualizer plugin is pushed with `filename: 'dist/bundle-stats.html'`, `template: 'treemap'`, `gzipSize: true`, `brotliSize: false`, `open: false`.

### Build pipeline — `package.json` (+1 line)

New script: `"analyze": "ANALYZE=1 npm run build"`. Chains through `tsc -b && vite build` so the analyzer reflects the production build, not a bare `vite build`. New devDep: `"rollup-plugin-visualizer": "^7.0.1"`.

### Build pipeline — `.gitignore` (+3 lines)

Appended `bundle-stats.html` and `dist/bundle-stats.html` so the report (which exposes source-path structure) is never committed (T-27-02-02 mitigation).

### Test — `src/utils/__tests__/lazyRetry.test.ts` (109 LOC, new)

5 tests under `describe('retry')`:
1. Returns resolved value on first success (1 call, 0 retries).
2. Retries up to `maxAttempts=3` then throws the LAST error (asserts `attempt-3`, not `attempt-1`). Uses `vi.useFakeTimers()` and pre-attaches a `.catch()` so the rejection has a listener while timers advance.
3. Succeeds on attempt 2 (1 call fails, 2nd call succeeds → 2 total calls).
4. Default `baseDelayMs=100` → 100ms wait between attempt 1 fail and attempt 2 fire (asserted by advancing 99ms, checking call count, then advancing 1ms).
5. Custom `baseDelayMs=50` → 50/150/450 backoff (proves the formula `baseDelayMs * 3^attempt`).

### Test — `src/__tests__/lazy-routes.test.tsx` (123 LOC, new)

1 test that mounts a minimal `<MantineProvider><MemoryRouter><Routes><Route element={<SuspenseShell />}><Route ...><LazyThresholdsPage /></Route></Route></Routes></MemoryRouter></MantineProvider>` harness at initial entry `/quality/thresholds`. The shell is `<Suspense fallback={<div data-testid="route-loading">Loading…</div>}><Outlet /></Suspense>`, mirroring AppLayout's structure without dragging in Sidebar's context dependencies. Uses `await screen.findByRole('heading', ...)` — the canonical lazy-aware assertion. The file's header docs the canonical `findBy*` pattern for future contributors.

## TDD discipline

- **RED commit `1c67e6b`:** Both test files committed first. `npx vitest run src/utils/__tests__/lazyRetry.test.ts src/__tests__/lazy-routes.test.tsx` failed with `Failed to resolve import "../lazyRetry"` (and same for the lazy-routes import) — RED predictably.
- **GREEN commit `bcbd44b`:** lazyRetry util + 7 lazy routes + Suspense boundary added → 6/6 tests green, full suite 812 passing + 22 pre-existing failures (zero regressions). Build smoke produced 7 hash-named chunks.
- **EFF-03 commit `cab09c6`:** visualizer + script + .gitignore. Negative gate (`npm run build` → no report) and positive gate (`npm run analyze` → 2.9 MB treemap with drill-down chunks) both verified.

## Bundle composition (post-build)

7 lazy chunks now ship as separate `dist/assets/*.js` files:

| Chunk | Size (kB) | Gzipped (kB) |
|-------|-----------|--------------|
| `ThresholdsPage-*.js` | 3.65 | 1.63 |
| `CompletenessDrillDown-*.js` | 3.12 | 1.52 |
| `CodingDrillDown-*.js` | 3.59 | 1.54 |
| `PlausibilityDrillDown-*.js` | 0.86 | 0.52 |
| `LabRangesDrillDown-*.js` | 0.81 | 0.50 |
| `DuplicatesDrillDown-*.js` | 0.75 | 0.47 |
| `ReferencesDrillDown-*.js` | 0.81 | 0.51 |

Most drill-downs themselves are small because their heavy dependencies (`useCompletenessReport`, `useReferenceReport`, `useDuplicateReport`, `usePlausibilityReport`, `useLabRangesReport`, `useCodingCoverage`, `metricsCache`, `profiles`, `DrillDownShell`) were already chunked separately by Vite's automatic dependency-graph splitting. The lazy conversion ensures the drill-down ROOT modules — and any of their unique dependency subtrees — are deferred to first visit. Main bundle (`index-*.js`) remains 1.09 MB / 326 kB gzipped — same order of magnitude as pre-edit (the dominant chunks are `react-router`, `mantine`, `recharts`, `medplum`, all retained on first load by the unchanged eager routes).

The treemap at `dist/bundle-stats.html` (run `npm run analyze` to regenerate) shows the full breakdown by source path and is the artifact used to spot future regressions.

## Test audit summary

Per 27-RESEARCH.md Focus 1, the repo-wide grep for `render(<App />)` returned **zero matches** before this plan started. D-08 / PITFALLS §6's audit constraint therefore reduces to **preventive guidance only** — there were no existing tests to convert from `getBy*` to `findBy*`. The new `src/__tests__/lazy-routes.test.tsx` documents the canonical `findBy*` pattern so future contributors writing App-level integration tests have a working reference. The header comment in that file and the explanatory comment block in `src/App.tsx` (above the lazy declarations) both call out the requirement explicitly.

## React Router #12474 watchpoint

[CITED: https://github.com/remix-run/react-router/issues/12474, opened Dec 2024, status open as of 2026-04-22] When navigating between two already-resolved lazy routes, the `<Suspense fallback>` executes (its render function fires) but does NOT render visually because React Router keeps the previous route mounted until the new chunk resolves. **Initial mount works correctly.** Mitigation `<Suspense key={location.key} fallback>` would force a remount on every navigation — including for already-cached chunks — and harm UX. Per the planner's recommendation in 27-RESEARCH.md Focus 2, the workaround was **NOT applied**. The limitation is documented inline in `src/components/layout/AppLayout.tsx` (in `RouteLoadingFallback`'s docblock) and flagged here for v1.5 attention only if a user reports the missing-spinner UX during route-to-route navigation.

## Open question (deferred to v1.5)

A chunk-error `ErrorBoundary` was NOT added — the `retry()` utility covers transient failures (3 attempts with backoff), but a permanent chunk-load failure (e.g. deploy-hash mismatch in production) would surface React's default error UI, which on a local dev tool means a blank screen with a console error. Adding a global ErrorBoundary is out of scope per CONTEXT (only Suspense fallback and retry are specified). Punt to v1.5 unless a deploy-hash-mismatch scenario is observed in production.

## Acceptance criteria

| Criterion | Result |
| --- | --- |
| `test -f src/utils/lazyRetry.ts` succeeds | PASS |
| `grep -q "export function retry" src/utils/lazyRetry.ts` succeeds | PASS |
| `grep -q "for (let attempt" src/utils/lazyRetry.ts` succeeds (Pitfall 1: explicit loop, no recursion) | PASS |
| `grep -c "lazy(" src/App.tsx` returns ≥ 7 | PASS (returns 9: 7 declarations + 2 in comments) |
| `grep -c "import { CompletenessDrillDown }" src/App.tsx` returns 0 (static import gone) | PASS |
| `grep -c "data-testid=\"route-loading\"" src/components/layout/AppLayout.tsx` returns ≥ 1 | PASS (returns 2: 1 attribute + 1 in docblock) |
| `grep -q "Suspense fallback" src/components/layout/AppLayout.tsx` succeeds | PASS |
| `npx vitest run src/utils/__tests__/lazyRetry.test.ts` exits 0 with all 5 tests green | PASS (5/5) |
| `npx vitest run src/__tests__/lazy-routes.test.tsx` exits 0 | PASS (1/1) |
| `npm run build` exits 0 | PASS |
| `ls dist/assets/ \| grep -E "(Threshold\|Completeness\|Coding\|Plausibility\|LabRanges\|Duplicates\|References)DrillDown\|ThresholdsPage" \| wc -l` returns ≥ 7 | PASS (returns 7) |
| `grep -q "rollup-plugin-visualizer" package.json` (devDep present) | PASS |
| `grep -q "\"analyze\":" package.json` (script present) | PASS |
| `grep -q "ANALYZE=1 npm run build" package.json` (script body correct) | PASS |
| `grep -q "process.env.ANALYZE === '1'" vite.config.ts` (strict equality, NOT truthy) | PASS |
| `grep -q "rollup-plugin-visualizer" vite.config.ts` (import present) | PASS |
| `grep -q "^bundle-stats.html$" .gitignore` | PASS |
| `grep -q "^dist/bundle-stats.html$" .gitignore` | PASS |
| `rm -f dist/bundle-stats.html && npm run build && test ! -f dist/bundle-stats.html` exits 0 (gate works) | PASS |
| `rm -f dist/bundle-stats.html && npm run analyze && test -s dist/bundle-stats.html` exits 0 (analyze emits report) | PASS |
| `grep -qE "DrillDown\|ThresholdsPage" dist/bundle-stats.html` (lazy chunks visible in treemap) | PASS |
| `npm test` shows no new regressions vs baseline | PASS (22 pre-existing failures unchanged; 806 → 812 passing — exactly +6 from new tests) |

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 — Blocking issue] lazy-routes test harness initially included full AppLayout, which dragged in Sidebar's context dependencies**

- **Found during:** Task 2 verification (running the lazy-routes test against the GREEN code)
- **Issue:** The plan's initial test harness rendered `<AppLayout connectionStatus="connected" />` directly. AppLayout includes `<Sidebar>`, which calls `useTerminologyHealth()` (needs TerminologyContext) and renders `<FhirSettingsModal>` (needs SettingsContext). Wrapping in `<TerminologyProvider settings={null}>` then surfaced the SettingsContext requirement, which is a less-trivial provider to satisfy without bringing in localStorage I/O.
- **Fix:** Replaced the AppLayout wrapper with a minimal `SuspenseShell` component that mirrors AppLayout's structure (`<Suspense fallback={...}><Outlet /></Suspense>`) without the navbar/Sidebar tree. The shell faithfully exercises the production Suspense placement — Suspense above Outlet — which is the only behavior the test claims to verify. The plan's intent is preserved; the harness is simpler.
- **Files modified:** `src/__tests__/lazy-routes.test.tsx`
- **Commit:** `bcbd44b` (folded into the GREEN commit since the file was being introduced)

### Architectural Changes

None.

### Authentication Gates

None.

## Threat Flags

None — this plan introduces no new network endpoints, no new auth surface, no new file I/O at runtime. The bundle-stats.html information-disclosure threat (T-27-02-02) is mitigated by `.gitignore`, verified by acceptance criteria. The ANALYZE truthy-check leak (T-27-02-03) is mitigated by strict equality in vite.config.ts, verified by the negative-gate smoke test.

## Known Stubs

None.

## Deferred Issues

- **Chunk-error ErrorBoundary** — not added; out of scope per CONTEXT. Permanent chunk-load failures (e.g. deploy-hash mismatch) currently surface React's default error UI. Add in v1.5 if observed in production.
- **`<Suspense key={location.key}>` for React Router #12474** — not applied; would harm UX for cached chunks. Revisit in v1.5 only if missing-spinner UX is reported.

## Commits

| # | Hash | Message |
| - | ---- | ------- |
| 1 | `1c67e6b` | `test(27-02): add lazyRetry + lazy-routes tests (EFF-02 RED)` |
| 2 | `bcbd44b` | `feat(27-02): lazy-load 7 quality routes with Suspense + retry (EFF-02)` |
| 3 | `cab09c6` | `feat(27-02): add bundle analyzer behind ANALYZE=1 gate (EFF-03)` |

## Self-Check: PASSED

- FOUND: src/utils/lazyRetry.ts
- FOUND: src/utils/__tests__/lazyRetry.test.ts
- FOUND: src/__tests__/lazy-routes.test.tsx
- FOUND: src/App.tsx (modified — 7 lazy declarations)
- FOUND: src/components/layout/AppLayout.tsx (modified — Suspense + route-loading testid)
- FOUND: vite.config.ts (modified — conditional visualizer plugin)
- FOUND: package.json (modified — analyze script + visualizer devDep)
- FOUND: package-lock.json (modified — lockfile updated)
- FOUND: .gitignore (modified — bundle-stats.html exclusions)
- FOUND: .planning/phases/27-efficiency-polish/27-02-SUMMARY.md (this file)
- FOUND commit: 1c67e6b (RED)
- FOUND commit: bcbd44b (GREEN — EFF-02)
- FOUND commit: cab09c6 (EFF-03)
