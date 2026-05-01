# Phase 27: Efficiency Polish - Context

**Gathered:** 2026-04-23
**Status:** Ready for planning
**Source:** Auto-captured via `/gsd-discuss-phase 27 --auto` (recommended defaults locked)

<domain>
## Phase Boundary

Cut render-time and bundle-size waste before it hurts users. **Measured by:**
- `ResourceIssueTable` pagination slice inside the existing `useMemo`, not on every render
- 7 quality drill-down routes load via `React.lazy()` with chunk-load retry and `data-testid="route-loading"` Suspense fallback
- `npm run analyze` (gated by `ANALYZE=1`) produces `bundle-stats.html` treemap via `rollup-plugin-visualizer@^7.0.1`

**Requirements covered:** EFF-01, EFF-02, EFF-03

**Explicitly NOT in this phase:**
- `QualityMetricsContext` re-render split (R14/EFF-R14) — **deferred to v1.5** per ROADMAP
- `useResourceCounts` line-75 memoization — **absorbed into Phase 24 already**
- Any new bundle-size budget or CI gate (observation only for v1.4)
- Behavior changes to any route content

**Dependencies:** Phase 23 complete. R15 (lazy routes) independent of Phase 24.

**Effort (ROADMAP):** ~1.5 days.

</domain>

<decisions>
## Implementation Decisions

### EFF-01: ResourceIssueTable pagination memo

- **D-01:** Move the `filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE)` computation INTO the existing `useMemo` at `src/components/quality/ResourceIssueTable.tsx:86-90` so the slice only recomputes when `issues`, `severityFilter`, `fieldFilter`, OR `page` changes. Current code at lines 92-94 re-slices on EVERY render.
- **D-02:** Also memoize `totalPages = Math.ceil(filtered.length / PAGE_SIZE)` — trivial but keeps it co-located with the slice for readability. Alternative: derive from `pageItems.length` inside the same memo return.
- **D-03:** Return shape: `{ filtered, pageItems, totalPages, start, end }` as a single memo output. Destructure at use site. Prevents creating 5 separate useMemo calls.
- **D-04:** `useMemo` deps: `[issues, severityFilter, fieldFilter, page]`. `PAGE_SIZE` is a constant, not a dep.

### EFF-02: React.lazy drill-down routes + retry + Suspense + test audit

- **D-05:** Lazy-load 7 routes: the 6 drill-downs (`completeness/:type`, `coding/:type`, `plausibility/:type`, `lab-ranges`, `duplicates`, `references/:type`) + `/quality/thresholds`. NOT the Quality overview (`index`), NOT Cohorts (`/quality/cohorts`), NOT Settings, NOT patient/explorer routes — the latter are either landing pages or non-drill-down chunks that users reach on first load.
- **D-06:** Suspense fallback: **single global fallback** at the `<AppLayout>` Outlet level, rendering a small Mantine `Loader` with `data-testid="route-loading"`. Per-route fallbacks would cause flashing and aren't necessary for a local-only app.
- **D-07:** Chunk-load retry: use a `retry(fn, maxAttempts)` utility at `src/utils/lazyRetry.ts` (or inline in `src/App.tsx` if ≤20 LOC). Shape: `retry(() => import('./X'), 3)` — 3 attempts, exponential backoff (100ms, 300ms, 900ms). Wraps `React.lazy`'s factory. Required for flaky networks / stale caches.
- **D-08:** Test audit: ALL `render(<App />)` tests that assert content from a lazy-loaded route MUST use `await findBy*` (or `waitFor`), NOT `getBy*`. Pitfall from `.planning/research/PITFALLS.md §6`. Planner must grep for existing tests that render `<App />` and touch drill-down content, list them, and update each.
- **D-09:** `data-testid="route-loading"` on the Suspense fallback is mandatory — gives tests a stable hook to wait against.

### EFF-03: Bundle analyzer via rollup-plugin-visualizer

- **D-10:** Add `rollup-plugin-visualizer@^7.0.1` to devDependencies (per STACK research). Configure in `vite.config.ts` behind an `ANALYZE=1` env gate so normal builds aren't slowed.
- **D-11:** `npm run analyze` script: `ANALYZE=1 vite build`. Output: `dist/bundle-stats.html` (or `bundle-stats.html` at project root — pick whichever doesn't conflict with build output paths). Default `template: 'treemap'`, `gzipSize: true`, `brotliSize: false`.
- **D-12:** No CI gate, no bundle-size budget — just make the treemap emittable. Observing the 7 lazy chunks as separate bundles is the acceptance proof.

### Plan batching — Claude's Discretion (recommended)

- **D-13 (recommended plan shape):** 2 plans:
  - **Plan 27-01** (Wave 1): EFF-01 — tiny, 1 file, isolated. Can run fully parallel with 27-02 if desired.
  - **Plan 27-02** (Wave 1 OR Wave 2): EFF-02 + EFF-03 bundled. They share the `vite.config.ts` touchpoint (lazy chunks show up in analyzer) and both affect build output.
  Planner may run 27-01 and 27-02 in parallel (disjoint files).

### Claude's Discretion (blanket)

- Test strategy for EFF-02: snapshot the `<Suspense fallback>` render, assert `findByTestId('route-loading')` appears during route transition
- Naming of the retry utility (`lazyRetry`, `retryImport`, etc.) — planner picks
- Exact location of `bundle-stats.html` (dist/ vs project root) — whichever avoids being committed
- Whether to add the `bundle-stats.html` path to `.gitignore` — yes, don't commit it

### Folded Todos

None — the 6 pending todos (MII Synthea, auto-connect, date-range UX, pin resource types, external validator, OverviewStrip reduction) belong elsewhere.

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Phase-level spec
- `.planning/ROADMAP.md` §"Phase 27: Efficiency Polish" — goal, success criteria
- `.planning/REQUIREMENTS.md` §"Phase 27 — Efficiency Polish" — EFF-01/02/03 acceptance text

### Research (lazy-route pitfalls)
- `.planning/research/PITFALLS.md` §6 — "Lazy routes break synchronous tests" — requires `getBy*` → `findBy*` test audit

### Dependency context
- `.planning/phases/23-v1.3-close-out/*.md` — Phase 23 complete
- `.planning/phases/24-data-fetching-foundation/24-02-SUMMARY.md` — `useResourceCounts` line-75 memo was absorbed here; NOT this phase's scope

### Target code
- `src/components/quality/ResourceIssueTable.tsx:86-95` — existing `useMemo` (line 86) and the slice call (lines 92-94) that must fold INTO the memo
- `src/App.tsx:60-83` — 8 quality routes defined in `<Route path="/quality">`; 7 become lazy (EFF-02)
- `vite.config.ts` — add visualizer plugin (EFF-03)
- `package.json` — add `rollup-plugin-visualizer@^7.0.1` devDep + `analyze` script

### Existing patterns (from Phase 26)
- `src/utils/searchByIdentifierPrefix.ts` (Phase 26) — pattern for a small util file with tests
- Test-first TDD from Phase 25 — applies to EFF-02 Suspense fallback rendering test

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- **React 18 `React.lazy`** — built-in, no dep needed
- **Mantine `Loader` or `LoadingOverlay`** — for the `route-loading` Suspense fallback
- **Vite's built-in code-splitting** — `import()` statements automatically become separate chunks
- **Existing `useMemo` at ResourceIssueTable.tsx:86** — extend it, don't add a sibling memo

### Established Patterns
- **`src/App.tsx` is the single route registry** — all route changes land here; no per-layout route duplication after Phase 26's shell dedup
- **Test file location** — `src/__tests__/*.test.tsx` for App-level integration tests; `src/components/**/__tests__/*.test.tsx` for component tests
- **`vitest` config** — colocated tests, no custom setup for lazy loading needed beyond async-aware assertions
- **Environment-gated build behavior** (from existing patterns) — `vite.config.ts` reads `process.env.ANALYZE` to conditionally include the visualizer plugin

### Integration Points
- **`src/App.tsx`** — 7 `import X from '...'` statements become `const X = lazy(() => retry(() => import('...'), 3))`
- **`<AppLayout>`** — wraps its Outlet in `<Suspense fallback={<RouteLoadingFallback />}>`
- **`vite.config.ts`** — conditional plugin insertion
- **`package.json`** — new devDep + `"analyze": "ANALYZE=1 vite build"` script
- **`.gitignore`** — append `bundle-stats.html` (or `dist/bundle-stats.html`)

### Test Baseline (post-Phase 26)
- 22 pre-existing failing tests, 806 passing
- Any `render(<App />)` test asserting drill-down content needs the `findBy*` conversion
- Planner to grep: `grep -rln "render(<App" src/__tests__ src/components` then audit each

</code_context>

<specifics>
## Specific Ideas

- **Retry utility signature:** `retry<T>(fn: () => Promise<T>, maxAttempts = 3, baseDelayMs = 100): Promise<T>`. Exponential backoff: `delay = baseDelayMs * 3^attempt`. Returns the first successful promise or throws the last error after `maxAttempts` tries.
- **Lazy wrapping pattern:** `const CompletenessDrillDown = lazy(() => retry(() => import('./components/quality/CompletenessDrillDown')));`
- **Suspense placement:** ONE Suspense wraps the Outlet at the AppLayout level. Not nested inside QualityLayout (which would cascade on every quality route change).
- **ANALYZE gate semantics:** `process.env.ANALYZE === '1'` — not truthy-check, explicit string match. Prevents accidental enablement from other env vars.

</specifics>

<deferred>
## Deferred Ideas

- **QualityMetricsContext re-render split (R14/EFF-R14)** — **v1.5** per ROADMAP "Deferred Items"
- **Per-route Suspense fallbacks** — one global is sufficient; more granular fallbacks add UI jitter without user benefit for a local tool
- **Bundle-size budget / CI gate** — out of scope; EFF-03 is observational
- **Lazy-loading of `QualityOverviewPage`, `CohortsPage`, `ResourceTypeLanding`, `PatientListPage`** — these are landing/index pages users hit on first load; lazy-loading would add a spinner on initial nav which harms UX
- **Preload hints for the 7 lazy chunks** — could reduce first-click latency but adds complexity; defer to v1.5 if user reports slow drill-down opens

### Reviewed Todos (not folded)

None — no pending todos triggered a match against Phase 27 scope.

</deferred>

---

*Phase: 27-efficiency-polish*
*Context gathered: 2026-04-23 via --auto (recommended defaults locked)*
