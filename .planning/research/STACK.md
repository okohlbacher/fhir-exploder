# Stack Research — v1.4 Hardening & Tech-Debt Sweep

**Domain:** Subsequent-milestone delta on existing FHIR Exploder app
**Researched:** 2026-04-16
**Overall confidence:** HIGH

## Bottom Line

**One new dev-dependency, zero new runtime dependencies.** The existing stack
(React 18 + Vite 8 + Medplum 5 + Mantine 8) already covers ~95% of v1.4 work.

| Change | Action | Effort |
|--------|--------|--------|
| `rollup-plugin-visualizer@^7.0.1` (devDep) | **ADD** to verify R15 (lazy routes) produces separate chunks | XS |
| External FHIR validator client (T1) | **KEEP CURRENT** `src/quality/remoteValidator.ts` — `MedplumClient.post()` is correct; just add settings UI + connectivity probe | S-M |
| `Map<serverUrl, ...>` cache (R1, R2) | **NO NEW DEP** — module-scoped `Map` in plain TS | XS |
| `useSyncExternalStore` for `QualityMetricsContext` split (R14) | **NO NEW DEP** — built into React 18.0+ | M |
| `useSampleWalker`, `useAsyncRun`, `<DrillDownShell>` (R1, R3, R6) | **NO NEW DEP** — pure React hook/component extraction | M |
| `React.lazy()` route splitting (R15) | **NO NEW DEP** — built into React + Vite supports dynamic `import()` natively | S |

---

## Recommended Additions

### Bundle Analyzer (devDependency)

| Technology | Version | Purpose | Why |
|------------|---------|---------|-----|
| `rollup-plugin-visualizer` | `^7.0.1` | Generates an HTML/treemap report of the production bundle, broken down by chunk and module | Verifies that R15's `React.lazy()` work actually produces separate chunks for the 3 drill-down routes + Thresholds page. Without an analyzer the team has no objective way to confirm the code-split worked — the success criterion in `v1.4-PLAN-DRAFT.md` Phase 27 is literally "bundle analyzer shows Quality drill-downs as separate chunks." |

**Compatibility (verified 2026-04-16 via npm registry):**
- `rollup-plugin-visualizer@7.0.1` peers on `rollup: 2.x \|\| 3.x \|\| 4.x` — Vite 8 ships Rollup 4.60.1, ✓ compatible
- Released 2026-03-04 (current)
- Requires Node ≥ 22 — repo is on Node 22.22, ✓ compatible

**Integration (one-line `vite.config.ts` change + one new npm script):**

```ts
// vite.config.ts
import { defineConfig, type PluginOption } from 'vite';
import react from '@vitejs/plugin-react';
import { visualizer } from 'rollup-plugin-visualizer';

export default defineConfig({
  plugins: [
    react(),
    process.env.ANALYZE && visualizer({
      filename: 'dist/stats.html',
      template: 'treemap',
      gzipSize: true,
      brotliSize: true,
    }) as PluginOption,
  ].filter(Boolean),
});
```

```json
// package.json — add script
"analyze": "ANALYZE=1 vite build"
```

Gating on `ANALYZE` keeps normal `npm run build` unaffected; the analyzer
only runs when explicitly requested. Matches the standard pattern published
in the plugin's README.

**Alternatives considered:**

| Alternative | Why not |
|-------------|---------|
| `vite-bundle-visualizer@1.2.1` | Thin CLI wrapper around `rollup-plugin-visualizer`. Adds an extra package without exposing more options. Use the underlying plugin directly. |
| `source-map-explorer@2.5.3` | Works on already-built artifacts via source maps. Slower workflow (build → run on dist), no Vite plugin integration. Useful for one-off audits but not for Vite-native CI integration. |
| Vite built-in `--profile` flag | Profiles dev-server startup, NOT bundle composition. Wrong tool. |

---

## Existing Stack Sufficiency (NO new deps needed)

### T1 — External FHIR Validator Integration

**The current `src/quality/remoteValidator.ts` is correct and should be kept.**
v1.4's T1 work is settings UI + connectivity probe + status line — not a new
HTTP client.

**Why `MedplumClient.post()` over `MedplumClient.validateResource()`:**

`@medplum/core@5.1.7` exposes `MedplumClient.validateResource(resource, options)`
(line 4413 of `dist/esm/index.d.ts`) which wraps `$validate`. **However it does
NOT accept a `profile` query parameter** — the FHIR spec's
`POST {server}/{Type}/$validate?profile={canonical}` form is the only way to
constrain validation against an MII profile. The existing code uses
`client.post('Condition/$validate?profile=...', resource)` to thread the
canonical URL through, which `validateResource()` cannot do.

| Validator endpoint | URL pattern | Wire format | Existing code handles it? |
|--------------------|-------------|-------------|---------------------------|
| HAPI FHIR JPA server `$validate` | `{base}/Condition/$validate?profile=...` | POST resource JSON, response = `OperationOutcome` | ✓ Yes |
| FHIR Validator Wrapper (standalone server, hosted at `validator.fhir.org`) | `{base}/validate` (NB different path) | POST resource, response = `OperationOutcome` | Partial — would need URL-pattern flexibility |
| IG Publisher CLI in server mode | `{base}/Condition/$validate?profile=...` | Same as HAPI | ✓ Yes |
| Aidbox `/$validate` | `{base}/$validate?profile=...` (resource type inferred from body) | Same body, same response shape | ✓ Yes |

**Recommendation:** Keep `remoteValidator.ts` unchanged for v1.4. The optional
extension — supporting the FHIR Validator Wrapper's `/validate` endpoint
shape — can be deferred to v1.5 if a user actually requests it. For v1.4, the
spec form (`{Type}/$validate?profile=...`) is what HAPI, IG-publisher, and
Aidbox all implement, and it's what the existing code emits.

**v1.4 T1 work is settings + UX, not stack:**
1. Extend `AppSettings.validation` schema in `src/config/types.ts` with
   `externalValidator: { url, auth?, profilePack? }`
2. Settings page UI: text input + "Test connectivity" button (use existing
   Mantine `TextInput` + `Button` + `Notifications`)
3. ValidationPanel status line: "Using external validator @ X" /
   "Using server $validate" / "Using local MII profile bundle" (existing
   `Alert` component from Mantine)
4. Connectivity probe = `client.get('metadata')` — already supported by
   `MedplumClient`. No new dependency.

### Other Refactors — All Doable With Current Stack

| Refactor | What's needed | Already in stack? |
|----------|---------------|-------------------|
| `Map<serverUrl, QualityMetricsCache>` (R1) | Plain TS `Map`, replace module-scoped `let cacheInstance` | ✓ TS 5.7 |
| `Map<serverUrl+type, count>` cache (R2) | Plain TS `Map` keyed by composite string | ✓ TS 5.7 |
| `useSampleWalker<T>` extraction (R1) | Custom React hook wrapping the worker-pool pattern | ✓ React 18 |
| `useAsyncRun<TState>` extraction (R6) | Custom hook owning status / progress / cancellation | ✓ React 18 |
| `<DrillDownShell>` extraction (R3) | Pure-presentation React component | ✓ React 18 + Mantine 8 |
| `<ConnectionGatedOutlet>` extraction (R7) | React component using `Outlet` from react-router-dom 7 | ✓ react-router-dom 7 |
| `searchByIdentifierPrefix` helper (R8) | Pure async function calling `MedplumClient.search()` | ✓ Medplum core 5 |
| `QualityMetricsContext` re-render split (R14) | Either (a) split into N narrow contexts, or (b) `useSyncExternalStore` with an external store (built-in to React 18 ≥ 18.0.0) | ✓ React 18 — `useSyncExternalStore` is part of the React core API since 18.0 |
| `React.lazy()` drill-down routes (R15) | `React.lazy(() => import('./CodingDrillDown'))` + `<Suspense>` | ✓ React 18 + Vite 8 (native dynamic `import()` support, code-splits automatically) |
| `SortableTh` lift (R12) | Pure component move | ✓ Mantine 8 `Table.Th` |
| `<RunProgress>` extraction | Pure component using Mantine `Progress` | ✓ Mantine 8 |
| `useCallback` for `setSettings` (R13) | Built-in React hook | ✓ React 18 |
| `toRecord` helper sweep (R11) | Existing helper at `src/utils/fhir-helpers.ts:9` | ✓ already exists |

**Notable: `useSyncExternalStore` for R14.** This is the canonical React 18
solution for the exact problem Gemini flagged ("provider re-renders all
consumers on any metric update"). It allows fine-grained subscription where
each consumer only re-renders when *its* slice of the store changes, without
any new library. React's docs explicitly position it as an alternative to
context for "external store" patterns. Reference:
https://react.dev/reference/react/useSyncExternalStore

If the team prefers a higher-level abstraction over hand-rolling the store, a
single-file ~40-line implementation is sufficient — adding Zustand or Jotai
for one context split would violate the existing "no state library" decision
in `STACK.md`. Recommend hand-rolled for v1.4, defer state-library discussion
to v1.5+ if multiple contexts need the same treatment.

---

## Version Compatibility Matrix

| Package | Installed | Latest (2026-04-16) | Action |
|---------|-----------|---------------------|--------|
| `react` | ^18.3.1 | 18.3.x (React 19.x exists, not adopting) | None — keep |
| `vite` | ^8.0.4 | 8.0.8 | Range covers it; optional bump on next chore sweep |
| `@medplum/core` | ^5.1.7 | 5.1.8 | Patch within range; no action |
| `rollup-plugin-visualizer` (NEW) | — | 7.0.1 | Add as `devDependencies` |

**No version bumps needed for v1.4.** Existing caret ranges absorb all current
patches. Resist the urge to bump majors mid-tech-debt sweep.

---

## What NOT to Add

| Library | Why someone might suggest it | Why NOT |
|---------|------------------------------|---------|
| `zustand` / `jotai` / `valtio` | Cleaner API for R14 context split | Existing `STACK.md` decision: "MedplumClient handles caching, React hooks handle data fetching… no need for a state management library." `useSyncExternalStore` (built-in) solves R14 without a new dep. |
| `@tanstack/react-query` | Cleaner API for R2 cross-mount cache | Existing `STACK.md` "Do NOT use" list — would create a competing cache layer with `MedplumClient`. A 30-line `Map<serverUrl+type, count>` is simpler. |
| `swr` | Same as react-query | Same reason. |
| `fhir.js` / `fhirclient` | Alternative validator HTTP client | `@medplum/core`'s `MedplumClient.post()` already handles `$validate`. Adding a second FHIR client would duplicate auth handling and Bundle parsing. |
| `axios` | "Better fetch" for validator requests | Native `fetch` + `MedplumClient` cover all needs. Adding axios for one POST is overkill. |
| `vite-plugin-bundle-analyzer` | Older naming | Use `rollup-plugin-visualizer` directly — it's the maintained option Vite itself recommends. |
| `webpack-bundle-analyzer` | Familiar from webpack ecosystem | Wrong bundler — Vite uses Rollup, not webpack. |
| `react-error-boundary` | Could help with `<DrillDownShell>` error states | The existing pattern (status union: `idle \| loading \| error \| success`) is sufficient and already established across the 4 report hooks. Don't introduce a second error model mid-refactor. |
| `immer` | Could help with `useAsyncRun` state updates | The state shape is small (status + progress + issues + error). Spread-based updates are fine. |

---

## Installation

```bash
# v1.4 — single dev dependency
npm install -D rollup-plugin-visualizer@^7.0.1

# That's it. No runtime additions.
```

---

## Integration Notes for Downstream (Roadmap Authors)

**Phase 24 (Data fetching foundation):**
- No new deps. Use plain `Map<string, X>` for caches.
- For `useAsyncRun<TState>`, type signature should match the discriminated
  union already used in the 4 report hooks (`{status: 'idle'|'loading'|'success'|'error', ...}`).

**Phase 25 (Quality dedup):**
- No new deps. `useSampleWalker` and `<DrillDownShell>` are pure extractions.
- `perPathExamples` change is a type widening on `PerTypeCoverageReport` in
  `src/quality/codingCoverageWalker.ts` — no library involved.

**Phase 26 (App-shell dedup):**
- No new deps. `<ConnectionGatedOutlet>` uses existing `Outlet` from
  react-router-dom 7. `Anchor component={Link}` standardization is purely
  Mantine 8 + react-router idiom — no new package.

**Phase 27 (Efficiency polish):**
- **R14** (`QualityMetricsContext` split): Use `useSyncExternalStore` (React 18
  built-in). Keep store in a plain class with a `subscribe(listener)` /
  `getSnapshot(metricKey)` interface — ~40 LOC. Or split into N narrow
  contexts; both are dep-free.
- **R15** (lazy routes): `React.lazy(() => import(...))` + `<Suspense
  fallback={<Loader />}>` from React + Mantine. After implementation, run
  `npm run analyze` (new script) to confirm chunk separation in the
  `dist/stats.html` treemap.

**Phase 29 (Backlog UX):**
- **T1** (external validator): No new deps. Extend settings schema, add
  Mantine `TextInput` + `Button` for connectivity probe, keep
  `remoteValidator.ts` as-is.
- **T2** (OverviewStrip 9→7): Pure UI change in existing Mantine components.

---

## Sources

- `node_modules/@medplum/core/dist/esm/index.d.ts` (lines 4396-4413) — verified
  `MedplumClient.validateResource()` exists but lacks `profile` param support
  → confirms `client.post()` approach in `remoteValidator.ts` is correct.
  Confidence: HIGH.
- `npm view rollup-plugin-visualizer` — version 7.0.1, peer rollup `2.x ||
  3.x || 4.x`, released 2026-03-04. Confidence: HIGH.
- `npm view vite peerDependencies` + `npm view rollup version` — Vite 8.0.8
  ships with Rollup 4.60.1. Confidence: HIGH.
- `node --version` — Node 22.22.0 satisfies plugin's Node ≥22 requirement.
  Confidence: HIGH.
- `src/quality/remoteValidator.ts` (lines 51-78) — current implementation
  uses `MedplumClient.post()` with `?profile=` query string; correctly handles
  `OperationOutcome` response and degrades gracefully on network failure.
  Confidence: HIGH.
- `src/quality/validationBackends.ts` (lines 32-48) — existing
  `resolveBackends(settings, resourceType)` already composes structural +
  remote backends; v1.4 T1 work plugs into this composition layer rather than
  adding new clients. Confidence: HIGH.
- React docs — `useSyncExternalStore` is part of React 18 core API:
  https://react.dev/reference/react/useSyncExternalStore. Confidence: HIGH.
- HAPI FHIR `$validate` reference:
  https://hapifhir.io/hapi-fhir/docs/validation/instance_validator.html — wire
  format matches existing `remoteValidator.ts` POST shape. Confidence: HIGH.
- FHIR Validator standalone server:
  https://github.com/hapifhir/org.hl7.fhir.validator-wrapper — uses `/validate`
  path (not `/{Type}/$validate`); flag for v1.5 if user needs it.
  Confidence: MEDIUM (path noted, not exercised in code).

---
*Stack research for: v1.4 Hardening & Tech-Debt Sweep delta*
*Researched: 2026-04-16*
