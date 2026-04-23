# Phase 27: Efficiency Polish — Research

**Researched:** 2026-04-22
**Domain:** React 18 lazy routes + Vite 8 bundle analyzer + memo polish
**Confidence:** HIGH (every external claim verified against npm/installed package; every codebase claim grounded in file:line read in this session)

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions

- **D-01**: Move `filtered.slice((page-1)*PAGE_SIZE, page*PAGE_SIZE)` INTO the existing `useMemo` at `ResourceIssueTable.tsx:86-90`.
- **D-02**: Memoize `totalPages = Math.ceil(filtered.length / PAGE_SIZE)` co-located with the slice.
- **D-03**: Single memo returns `{ filtered, pageItems, totalPages, start, end }`; destructure at use site.
- **D-04**: `useMemo` deps `[issues, severityFilter, fieldFilter, page]`. PAGE_SIZE constant, not a dep.
- **D-05**: Lazy-load 7 routes — 6 drill-downs + `/quality/thresholds`. NOT Quality overview, NOT Cohorts, NOT Settings, NOT patient/explorer routes.
- **D-06**: Single global Suspense fallback at the `<AppLayout>` Outlet level; Mantine `Loader` with `data-testid="route-loading"`.
- **D-07**: Chunk-load retry: `retry(fn, maxAttempts)` utility at `src/utils/lazyRetry.ts` (or inline in App.tsx if ≤20 LOC). 3 attempts, exponential backoff (100ms, 300ms, 900ms).
- **D-08**: ALL `render(<App />)` tests asserting lazy-loaded content MUST use `await findBy*`, NOT `getBy*`.
- **D-09**: `data-testid="route-loading"` on Suspense fallback is mandatory.
- **D-10**: `rollup-plugin-visualizer@^7.0.1` in devDependencies; configure in `vite.config.ts` behind `ANALYZE=1` env gate.
- **D-11**: `npm run analyze` script: `ANALYZE=1 vite build`. Output `bundle-stats.html`. `template: 'treemap'`, `gzipSize: true`, `brotliSize: false`.
- **D-12**: No CI gate, no bundle-size budget — observation only.
- **D-13 (recommended plan shape)**: 2 plans — 27-01 (EFF-01, isolated 1 file), 27-02 (EFF-02 + EFF-03 bundled, share `vite.config.ts` touchpoint).

### Claude's Discretion
- Test strategy for EFF-02: snapshot Suspense fallback render, assert `findByTestId('route-loading')` during route transition.
- Naming of retry utility (`lazyRetry`, `retryImport`, etc.).
- Exact location of `bundle-stats.html` (dist/ vs project root) — whichever avoids being committed.
- Whether to add `bundle-stats.html` to `.gitignore` — yes.

### Deferred Ideas (OUT OF SCOPE)
- `QualityMetricsContext` re-render split (R14/EFF-R14) — v1.5.
- Per-route Suspense fallbacks.
- Bundle-size budget / CI gate.
- Lazy-loading of `QualityOverviewPage`, `CohortsPage`, `ResourceTypeLanding`, `PatientListPage`.
- Preload hints for the 7 lazy chunks.
</user_constraints>

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|------------------|
| EFF-01 | `ResourceIssueTable.tsx:92-94` — `filtered.slice(...)` moved into pagination `useMemo` | Read of file confirms slice is recomputed every render (not inside line-70 memo). 1-file change, ~8 LOC delta. |
| EFF-02 | 7 routes lazy-load with Suspense fallback (`data-testid="route-loading"`) + chunk-load retry; `render(<App />)` tests audited | Audit complete: zero existing `render(<App />)` tests in repo. All drill-down tests render the component directly via MemoryRouter — not affected by lazy conversion. Audit becomes preventive guidance only. |
| EFF-03 | `rollup-plugin-visualizer@^7.0.1` devDep + `ANALYZE=1` gated `npm run analyze` script emits `bundle-stats.html` treemap | Verified: latest is 7.0.1 (published 2026-03-03). Peer deps `rollup: 2.x \|\| 3.x \|\| 4.x` — Vite 8 ships with Rollup 4, compatible. Requires `node >= 22`; user has v22.22.0. |
</phase_requirements>

## Executive Summary

- **Test audit produces an EMPTY list.** [VERIFIED: grep `render(<App` in `src/` returns zero matches in `*.test.tsx` files; the only two files matching that pattern are `Sidebar.test.tsx` files that render `<Sidebar/>`, not `<App/>`.] All existing drill-down tests (`completeness-drilldown.test.tsx`, `coding-drilldown.test.tsx`, `thresholds-page.test.tsx`) render the drill-down component directly through a `<MemoryRouter><Routes><Route element={<X/>}>` harness with the component **statically imported** — they are unaffected by lazy conversion. D-08 becomes documented preventive guidance for future tests, not an active migration burden.
- **Suspense placement at `AppLayout` Outlet (D-06) is structurally correct.** ConnectionGatedOutlet renders the alert OR the connected children; lazy-loaded route elements only mount in the connected branch. A Suspense above the AppLayout `<Outlet/>` catches the lazy chunk load regardless. No conflict with Phase 26's gating.
- **`rollup-plugin-visualizer@7.0.1` is fully Vite 8 / Rollup 4 compatible** — peer deps declare `rollup: 2.x || 3.x || 4.x`, and node engine `>=22` is satisfied (user runs v22.22.0). [VERIFIED: `npm view rollup-plugin-visualizer peerDependencies engines` 2026-04-22.]
- **React Router v7 has a known Suspense-during-navigation glitch** ([CITED: GitHub remix-run/react-router#12474, opened 2024-12-05, status: open]) — fallback executes but doesn't render visually during transitions between two already-resolved lazy routes. Mitigation: `<Suspense key={location.key} fallback=...>` to force re-mount on navigation. Initial mount works correctly.
- **Single-memo refactor of EFF-01** is mechanical: extend the lines 70-90 `useMemo` return value to `{ filtered, pageItems, totalPages, start, end }` with `page` added to deps. Eliminates re-slice per render (currently lines 92-98 run on every parent re-render even when filters/page haven't changed).

## Per-Focus Findings

### Focus 1: Test audit (`render(<App />)`)

**Result:** [VERIFIED: Grep on `/Users/kohlbach/Claude/Exploder/src` 2026-04-22] — zero matches for `render(<App` across all test files.

| Search | Result |
|--------|--------|
| `render\(<App` (literal) in `src/**/*.test.{ts,tsx}` | 0 matches |
| `render\(.*<App\s*/?>` (regex) | 0 matches |
| `import.*App.*from` in test files | 0 matches |
| `<App />` JSX in tests | 0 matches |
| Files importing the lazy targets in tests | 5 files — all import the drill-down component directly and mount under `<MemoryRouter><Routes><Route element={<Component/>}>` |

**Interpretation:** EFF-02's `getBy*` → `findBy*` conversion list is empty in the current codebase. The audit constraint (D-08, PITFALLS §6) becomes:
1. **Preventive documentation** — the lazy-conversion PR adds a comment in `App.tsx` near the lazy declarations: "If you write a test that renders `<App />` and asserts content from one of these routes, use `await findBy*`."
2. **Future test guard** — Plan 27-02 should add ONE positive test that DOES render the routed tree and uses `findByTestId('route-loading')` then `await findBy*` for the drilled-down content (this is the "snapshot the Suspense fallback render" test from Claude's Discretion). It serves as the canonical pattern.

The 5 drill-down test files do NOT need modification — they bypass the lazy wrapper by importing the component directly.

### Focus 2: React.lazy + react-router-dom@7 compatibility

[VERIFIED: react-router-dom@^7.14.0 is installed; `<Routes>` element pattern in `App.tsx:43-85` is the standard JSX-defined-routes API.]

**Compatibility status:** Works. `React.lazy()` returns a component that can be passed to `<Route element={<LazyX />}>` without modification. Suspense boundary at any ancestor will catch the chunk-load suspension.

**Known gotcha — GitHub remix-run/react-router #12474:** [CITED: https://github.com/remix-run/react-router/issues/12474, opened Dec 2024, status open as of 2026-04-22] In React Router v7, when navigating between two lazy-loaded routes, the Suspense fallback **executes** (console.log fires) but does **not render visually** in the DOM during the transition. Initial mount works correctly. This is React Router's transition behavior — it keeps the previous route mounted until the new one resolves, suppressing intermediate Suspense fallbacks for "smoothness."

**Mitigation if user reports flicker/no-spinner:** wrap with `<Suspense key={location.key} fallback={...}><Outlet/></Suspense>`. The `key` change forces the Suspense subtree to unmount + remount on each navigation, surfacing the fallback. Trade-off: brief flash on every nav even for already-cached chunks.

**Recommendation for Phase 27:** Use the basic `<Suspense fallback>` form WITHOUT the `key` workaround. For a local-only tool with mostly already-fetched chunks after first visit, the absent flicker is fine; D-06's "single global fallback... per-route fallbacks would cause flashing" is consistent with this. Add the `key={location.key}` pattern in Phase 28 or v1.5 only if a user reports the missing-spinner UX issue.

### Focus 3: rollup-plugin-visualizer Vite 8 check

[VERIFIED: `npm view rollup-plugin-visualizer` 2026-04-22.]

| Property | Value |
|----------|-------|
| Latest version | `7.0.1` (published 2026-03-03) |
| Prior 7.x | `7.0.0` (published 2026-02-20) |
| Peer deps | `rollup: 2.x \|\| 3.x \|\| 4.x`, `rolldown: 1.x \|\| ^1.0.0-beta \|\| ^1.0.0-rc` |
| Node engines | `>=22` |
| Direct deps | `open@^11`, `yargs@^18`, `picomatch@^4`, `source-map@^0.7.4` |

**Compatibility verdict for this project:**
- Vite 8.0.8 installed (verified from `node_modules/vite/package.json`) — uses Rollup 4 internally; the visualizer's peer dep `rollup: 4.x` is satisfied transitively.
- User Node v22.22.0 — satisfies `>=22`.
- `^7.0.1` is the correct version range. **No incompatibilities found.**

**Vite 8 + Rolldown caveat:** Web search results suggested Vite 8 "ships with Rolldown" — this is misleading. Vite 8 *supports* Rolldown as a bundler choice; the default remains Rollup 4 unless explicitly opted into Rolldown. The visualizer covers both peer dep ranges, so either path works.

### Focus 4: Suspense fallback structural placement

[VERIFIED: Read `App.tsx`, `AppLayout.tsx`, `ConnectionGatedOutlet.tsx`, `QualityLayout.tsx`, `ExplorerLayout.tsx`, `PatientsLayout.tsx`.]

**Tree structure (post-Phase-26):**
```
<Routes>
  <Route element={<AppLayout />}>          ← AppShell + Sidebar + <Outlet/> at line 20
    <Route index element={<Dashboard/>}/>
    <Route path="/quality" element={<QualityLayout />}>   ← <ConnectionGatedOutlet> wrapping <MedplumProvider><Outlet/></MedplumProvider>
      <Route path="thresholds" element={<ThresholdsPage/>}/>     ← LAZY in EFF-02
      <Route path="completeness/:type" element={<CompletenessDrillDown/>}/>   ← LAZY
      ... (5 more lazy routes)
    </Route>
  </Route>
</Routes>
```

**Three placement options analysed:**

| Option | Where | Pros | Cons |
|--------|-------|------|------|
| **(a) AppLayout** | wrap `<Outlet/>` at `AppLayout.tsx:20` | Single touchpoint; catches future lazy routes anywhere in the tree; simplest | Fallback briefly appears on EVERY nav (incl. non-lazy, but only on first chunk-load — no impact after) |
| (b) QualityLayout connected branch | wrap the inner `<Outlet/>` inside `<MedplumProvider>` | Most precise — only fires for quality routes when connected | Needs to know which layouts host lazy children; future lazy routes outside `/quality` would need their own Suspense |
| (c) Per-route element | wrap each `<Route element={<Suspense><LazyX/></Suspense>}/>` | Per-route fallback granularity | 7 boilerplate wrappers; D-06 explicitly rejects per-route flashing |

**Recommendation: (a) AppLayout** — matches D-06 explicitly. The ConnectionGatedOutlet does NOT conflict: when disconnected, the alert renders BEFORE the lazy chunk is requested (the lazy `<Outlet/>` content never mounts in disconnected branch), so Suspense never fires while disconnected. When connected, the lazy chunk loads, suspends up to the AppLayout Suspense boundary, and shows the fallback.

**Implementation snippet:**
```tsx
// AppLayout.tsx
import { Suspense } from 'react';
import { Loader } from '@mantine/core';

export function AppLayout({ connectionStatus }: AppLayoutProps) {
  return (
    <AppShell ...>
      <AppShell.Navbar bg="gray.0">
        <Sidebar connectionStatus={connectionStatus} />
      </AppShell.Navbar>
      <AppShell.Main>
        <Suspense fallback={<Loader size="md" data-testid="route-loading" />}>
          <Outlet />
        </Suspense>
      </AppShell.Main>
      {import.meta.env.DEV && <FeedbackButton />}
    </AppShell>
  );
}
```

## Test Audit Table

| Test file | Line | Asserts content from a lazy-loaded route? | Renders `<App/>`? | Fix needed |
|-----------|------|------------------------------------------|-------------------|------------|
| (none — full repo grep returns 0 matches for `render(<App`) | — | — | — | **None.** Audit complete. |

**Files importing lazy targets directly (already use direct render, NOT through `<App/>`):**

| Test file | Imports | Render pattern | Affected by lazy conversion? |
|-----------|---------|----------------|------------------------------|
| `src/__tests__/completeness-drilldown.test.tsx:112,116-126` | `CompletenessDrillDown` | `<MemoryRouter><Routes><Route element={<CompletenessDrillDown/>}/></Routes></MemoryRouter>` | NO — direct import bypasses lazy wrapper |
| `src/__tests__/coding-drilldown.test.tsx:132,137-147` | `CodingDrillDown` | same MemoryRouter+Routes pattern | NO |
| `src/__tests__/thresholds-page.test.tsx:48-57` | `ThresholdsPage` | same pattern | NO |
| `src/components/quality/__tests__/DrillDownShell.test.tsx` | `DrillDownShell` (component, not route) | direct render | NO |
| `src/__tests__/coding-coverage-panel.test.tsx` | `CodingCoveragePanel` (panel inside QualityOverviewPage, not lazy) | direct render | NO |

**Conclusion:** Plan 27-02's test work is one new positive test (Suspense fallback appears, then resolves to drill-down content) — not a sweeping migration.

## Plan-Batching Recommendation

**Confirm D-13's 2-plan shape** with one refinement.

| Plan | Reqs | Files touched | Independence |
|------|------|---------------|--------------|
| **27-01** | EFF-01 | `src/components/quality/ResourceIssueTable.tsx` only | Fully isolated — no shared file with 27-02 |
| **27-02** | EFF-02 + EFF-03 | `src/App.tsx`, `src/components/layout/AppLayout.tsx`, `src/utils/lazyRetry.ts` (new), `src/utils/__tests__/lazyRetry.test.ts` (new), `vite.config.ts`, `package.json`, `.gitignore`, ONE new App-level Suspense test | Bundles because both touch build pipeline / `vite.config.ts` and the lazy chunks ARE what the visualizer reveals |

**Wave layout:** 27-01 and 27-02 can run **in parallel in Wave 1** — disjoint file sets. Estimated combined effort: ~1.5 days as ROADMAP specifies. No alternative plan shape considered better given the file-disjoint property.

**Refinement to D-13:** The retry utility (`src/utils/lazyRetry.ts`) deserves its own test file even though CONTEXT D-07 says "or inline in App.tsx if ≤20 LOC." Recommend the standalone util because (1) it's testable with a synthetic flaky-promise, (2) future lazy imports outside `App.tsx` reuse it, (3) the codebase has the precedent `src/utils/searchByIdentifierPrefix.ts` from Phase 26 with its own tests — same shape.

## Validation Architecture

### Test Framework

| Property | Value |
|----------|-------|
| Framework | vitest 4.1.4 + @testing-library/react 16.3.2 + jsdom 29.0.2 |
| Config file | none (vitest auto-detects; tests colocated as `*.test.{ts,tsx}` under `src/`) |
| Quick run command | `npx vitest run <file>` |
| Full suite command | `npm test` (== `vitest run`) |

### Phase Requirements → Test Map

| Req ID | Behavior (one checkable truth) | Test type | Automated command | File exists? |
|--------|--------------------------------|-----------|-------------------|--------------|
| EFF-01 | `filtered.slice(...)` no longer recomputes when only the parent re-renders (only when `issues`/`severityFilter`/`fieldFilter`/`page` change). Verifiable via React Testing Library: render with stable props, force a parent re-render, assert the slice reference is stable (using a spy or `Object.is` on a memoized derived value exposed via test seam). Practical alternative: render the table with 200 issues, assert `pageItems.length === 50` AND clicking page 2 yields rows 51–100 — proves the slice is page-aware AND covers the regression directly. | unit (RTL) | `npx vitest run src/__tests__/resource-issue-table.test.tsx -x` | YES — extend existing file |
| EFF-02 | After lazy conversion, navigating to `/quality/completeness/Patient` (a) shows `data-testid="route-loading"` then (b) resolves to the drill-down content found via `findBy*`. AND the retry utility retries 3 times on a synthetic chunk-load failure with exponential backoff. | integration (RTL) + unit (lazyRetry) | `npx vitest run src/utils/__tests__/lazyRetry.test.ts src/__tests__/lazy-routes.test.tsx -x` | NO — Wave 0 creates `src/utils/__tests__/lazyRetry.test.ts` and `src/__tests__/lazy-routes.test.tsx` |
| EFF-03 | `ANALYZE=1 npm run build` produces a non-empty `bundle-stats.html` AND the file references at least one drill-down chunk by source path. Plain `npm run build` does NOT produce the file (gate works). | shell smoke (manual + CI-checkable) | `ANALYZE=1 npm run analyze && test -s bundle-stats.html && grep -q "DrillDown" bundle-stats.html` | NO — script added in package.json; one-liner shell test serves as smoke |

### Sampling Rate

- **Per task commit:** `npx vitest run <file>` for the touched file(s).
- **Per wave merge:** `npm test` (full vitest suite).
- **Phase gate:** `npm test` green + `ANALYZE=1 npm run analyze` produces `bundle-stats.html` showing 7 distinct lazy chunks before `/gsd-verify-work`.

### Wave 0 Gaps

- [ ] `src/utils/__tests__/lazyRetry.test.ts` — covers EFF-02 retry semantics (retries N times, exponential backoff, gives up after maxAttempts, returns first success)
- [ ] `src/__tests__/lazy-routes.test.tsx` — covers EFF-02 Suspense fallback render + resolution to drill-down content (uses MemoryRouter at a specific path, asserts `findByTestId('route-loading')` then `findByText` of drill-down content). Sets the canonical `findBy*` pattern.

*(No new vitest config or fixtures needed — existing test infrastructure handles lazy/suspense assertions natively.)*

## Pitfalls

| # | Pitfall | Why it happens | Prevention |
|---|---------|----------------|------------|
| 1 | **Retry utility infinite loop** — `retry(fn, 3)` written with `while(true)` and forgotten `attempts++` increment, or the recursive form without a depth guard, can hang the chunk load | Easy to write the recursion as `retry(fn, n) { return fn().catch(() => retry(fn, n)); }` and forget to decrement `n` | Use the explicit-loop form: `for (let attempt = 0; attempt < maxAttempts; attempt++) { try { return await fn(); } catch (e) { if (attempt === maxAttempts - 1) throw e; await sleep(baseDelayMs * 3 ** attempt); } }`. Unit-test with a function that always throws and assert it gives up after exactly `maxAttempts` calls. |
| 2 | **Suspense + StrictMode double-fire** — React 18 StrictMode mounts twice in dev; `React.lazy()` factory may be invoked twice, triggering two retry chains in parallel — one succeeds, the other hits a stale chunk URL after deploy | StrictMode invokes constructors and `useState` initializers twice; `React.lazy`'s factory is called once per module-load attempt | The `lazy()` cache deduplicates by reference, so a single `lazy(() => retry(import, 3))` declaration only invokes the factory once even under StrictMode. **DO NOT** call `lazy()` inline inside a render — call it at module scope. Unit test by importing the lazy declaration twice and asserting `===` identity. |
| 3 | **`ANALYZE` env var leaking into other build contexts** — if `vite.config.ts` checks `process.env.ANALYZE` truthy, any value (even `0`, `false`, ``) enables the visualizer; a stray `ANALYZE=` in shell env or CI silently slows every build | Truthy-checking in JS is bug-prone; `process.env.ANALYZE === '1'` is unambiguous | Per CONTEXT spec D-11 + specifics: use **explicit string match** `process.env.ANALYZE === '1'`, not `!!process.env.ANALYZE` or `Boolean(process.env.ANALYZE)`. Verify by running `ANALYZE=0 npm run build` and confirming `bundle-stats.html` is NOT created. |
| 4 | **Lazy chunks broken when deployed without correct base path** — Vite emits chunks as relative URLs assuming `base: '/'`. If the app is ever served from `/exploder/` (sub-path), the runtime tries to fetch `/assets/CompletenessDrillDown-abc123.js` and 404s. Static-import builds tolerate this better; lazy chunks expose the misconfiguration | This project today is local-only (`vite preview` and `npm run dev` both serve at `/`), but the lazy work shifts a previously-statically-bundled file to a runtime-fetched chunk | Verify after Phase 27 ships: `npm run build && npm run preview` and click into each of the 7 lazy routes, confirming no 404s in the network panel. If the project ever moves to a sub-path deploy, set `base: '/exploder/'` in `vite.config.ts` AND ensure the SPA host serves index.html for unknown sub-paths. |

## Open Questions

1. **Retry baseDelayMs default 100ms vs 200ms?** CONTEXT specifics say 100ms (yielding 100ms / 300ms / 900ms = 1.3s total). For local network this is fine; for very flaky public networks 200ms (200/600/1800 = 2.6s total) is more forgiving. **Recommendation:** keep 100ms per CONTEXT — easy to tune later if a user reports the spinner flicking on a slow network.
2. **Does Plan 27-02 need a chunk-error error boundary?** PITFALLS §6 mentions "navigation after deploy hash mismatch shows error UI not blank page." Currently no global ErrorBoundary in the tree. Adding one is out of scope per CONTEXT (only Suspense fallback and retry are specified). **Recommendation:** punt to v1.5 unless a user reports a blank page after a deploy. Document as a known limitation in 27-02-SUMMARY.

## Sources

### Primary (HIGH confidence)
- `npm view rollup-plugin-visualizer version peerDependencies engines time` — 2026-04-22, returns 7.0.1 / Rollup 2-4 + Rolldown 1 / node ≥22 / published 2026-03-03
- `node_modules/vite/package.json` — installed Vite version `8.0.8`
- `node --version` — local Node `v22.22.0`
- Direct read of `src/App.tsx`, `src/components/layout/AppLayout.tsx`, `src/components/layout/ConnectionGatedOutlet.tsx`, `src/components/quality/QualityLayout.tsx`, `src/components/explorer/ExplorerLayout.tsx`, `src/components/patients/PatientsLayout.tsx`, `src/components/quality/ResourceIssueTable.tsx`, `vite.config.ts`, `package.json`
- Repo-wide grep on test files for `render\(<App`, `<App />`, `import.*App` — all return zero matches in test files

### Secondary (MEDIUM confidence)
- React Router docs: https://reactrouter.com/how-to/suspense — covers loader Suspense; no explicit guidance for `React.lazy` route-level placement
- Robin Wieruch React Router 7 lazy loading guide: https://www.robinwieruch.de/react-router-lazy-loading/

### Tertiary (LOW — surfaced but not authoritative)
- GitHub issue remix-run/react-router#12474 — open since 2024-12; no fix released; cited as known limitation, not as a blocker

## Metadata

**Confidence breakdown:**
- Test audit: HIGH — empty list verified by exhaustive grep
- Suspense placement: HIGH — tree structure read in this session, no ambiguity
- rollup-plugin-visualizer compatibility: HIGH — npm registry verified 2026-04-22
- React Router v7 + lazy edge case: MEDIUM — issue #12474 documents the glitch but no official mitigation in v7 docs

**Research date:** 2026-04-22
**Valid until:** 2026-05-22 (30 days; React Router and Vite ecosystem stable enough for this window)
