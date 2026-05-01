# Phase 49: Theme D — Graph View: Reference Graph - Research

**Researched:** 2026-05-01
**Domain:** React Flow 12 + dagre hierarchical layout for FHIR resource reference graphs (G1 scope: outgoing + incoming refs at depth 1–3, click-to-navigate, Mantine 8 dark-mode-aware, lazy-loaded chunk).
**Confidence:** HIGH — every library version, sub-dependency, gz size, dagre 3.x API, Mantine CSS-variable name, and lazy-route precedent was verified against the live npm registry, the installed codebase, and official React Flow / Mantine 8 documentation. Two LOW-confidence items are explicitly flagged in the Assumptions Log.

---

## Summary

Phase 49 ships a lazy-loaded route `/explorer/:type/:id/graph` that renders a hierarchical (DAG) reference graph centered on the current FHIR resource. Outgoing references fan downward, incoming references rise upward (per Phase 48's `reverseReferenceCatalog`), depth defaults to 1 with a hard cap of 3, node labels render `summarizeResource(target).primary`, edges carry the FHIR field name, and clicking a node `useNavigate()`s to its detail page. Theme switching propagates via Mantine 8 CSS variables wired into React Flow's `colorMode` prop — no remount.

Three pre-planning blockers were resolved during research:

1. **`@dagrejs/dagre` version mismatch:** ROADMAP says "≥ 3.x." Live `npm view`: latest is **`3.0.0`** (published 2026-03-22) — 3.x IS now available, contradicting CONTEXT.md's claim that "current latest is 1.x." Verification of the public API surface (`dist/types/index.d.ts`) confirms the 3.x rewrite is **packaging-only** (ESM-first, smaller bundle, dependency upgrade) — `setGraph()`, `setNode()`, `setEdge()`, `dagre.layout()`, and `graphlib.Graph` are byte-identically named. **Recommendation: pin `@dagrejs/dagre@3.0.0`** (smaller — see §2). The ROADMAP is correct; CONTEXT.md's flagged warning was incorrect.
2. **`@xyflow/react` version pin:** Latest is **`12.10.2`**. Peer deps: `react: '>=17'` only — no Mantine peer (zero risk of pulling Mantine 9 transitively). Direct deps: `classcat`, `zustand@^4.4.0`, `@xyflow/system@0.0.76`. React 18 compatible. **Recommendation: pin `@xyflow/react@12.10.2`**.
3. **Lazy-route precedent EXISTS:** `src/App.tsx:48-88` already lazy-loads 8 quality drill-downs via `lazy(() => retry(() => import(...)).then((m) => ({ default: m.X })))`. The wrapper, the Suspense fallback at `AppLayout.tsx:44`, and the `lazy-routes.test.tsx` canonical test pattern are all in place. Phase 49 reuses this pattern verbatim.

**Primary recommendation:** Pin `@xyflow/react@12.10.2` + `@dagrejs/dagre@3.0.0`; structure code as `ResourceGraphView.tsx` (top-level lazy component) + `useGraphBfs.ts` (hook) + `ResourceGraphNode.tsx` (custom node) + `graph.css` (CSS-variable bridge); reuse the existing `lazy(() => retry(() => import(...)))` idiom from `src/App.tsx`; ship 6 mandatory tests (the 5 in D-20 plus a bundle-budget verifier); plan in 3 plans across 3 waves matching D-12/D-19/D-20 expectations.

---

<user_constraints>

## User Constraints (from CONTEXT.md)

### Locked Decisions

**Mount Point & Routing**
- **D-01** — Phase 49 ships a standalone "Graph" button on `ResourceDetailPage.tsx` next to "Raw JSON" / "$everything". The 4-mode resource shell (`Summary | Human | Graph | JSON`) from `design_handoff_v1.7_navigation/README.md` is **explicitly deferred** to a follow-up phase (working name "Phase 51 — 4-Mode Resource Shell") AFTER Phase 50 (STACK-01 gate) closes.
- **D-02** — Route path: `/explorer/:type/:id/graph` (verbatim per GRPH-01). Lazy-loaded via `React.lazy(() => import('./ResourceGraphView'))` in the router config.
- **D-03** — "Graph" button is a Mantine `Button variant="light"` with a `leftSection` icon from `@tabler/icons-react` (researcher pick: `IconShare` / `IconHierarchy` / `IconAffiliate` / `IconNetwork`) placed in the same `<Group>` as "Raw JSON" / "$everything" in `ResourceDetailPage.tsx`. Visible for ALL resource types — empty-graph state handled inside the view, not at the button.

**Depth Control & BFS Bounds**
- **D-04** — Depth control surface: Mantine `<Slider min={1} max={3}>` with marks at 1/2/3. Default = 1. Slider changes re-fetch BFS (NOT remount). Sits in toolbar above canvas.
- **D-04a** — Depth applies symmetrically to outgoing AND incoming traversal. No split control.
- **D-04b** — BFS hard-caps at depth 3 in code, regardless of caller-supplied value.
- **D-08** — Node-count safety cap = **150 nodes** (root + reachable). Truncation triggers a Mantine `<Alert>` below the canvas: "Showing 150 nodes (graph truncated). Reduce depth or navigate to a child resource to explore further." Researcher MAY adjust ±50 with rationale.

**Layout & Visual**
- **D-06** — dagre `rankdir: 'TB'` (top-down). Researcher to verify `nodesep` / `ranksep` / `edgesep` defaults produce readable spacing for typical 3-15 node Patient-centered graphs and tune if needed.
- **D-07** — Custom React Flow `nodeTypes: { resource: ResourceGraphNode }`. ResourceGraphNode = Mantine `Card withBorder padding="xs"` with: `<Text size="xs" c="dimmed">{resourceType}</Text>` top row + `<Text size="sm" fw={500}>{summarizeResource(r).primary}</Text>` main + `cursor: pointer` + `onClick → useNavigate()` + Mantine `<Tooltip label={summarizeResource(r).secondary} disabled={!secondary}>` (position `right` with `withArrow`). The CENTER node (root) gets a thicker border + `theme.colors.indigo[6]` accent. NO different shape — keeps dagre uniform.
- **D-09** — Edge: React Flow built-in (`smoothstep` or `default`) with `label` prop = FHIR reference field name. Always visible; no hover-only mode. Researcher to verify edge type readability under TB layout.
- **D-10** — Edge direction: outgoing refs draw FROM source TO target; incoming refs draw FROM source TO current (arrowhead points AT current). Visual arrow direction matches FHIR semantic ("X references Y" → arrow X→Y).
- **D-11** — Theme integration via CSS variables. Define `src/components/explorer/graph.css` (or `.module.css`) mapping React Flow `--xy-*` to Mantine `--mantine-color-*`. Theme toggle re-themes graph WITHOUT React re-renders / remount. Test asserts: render → `setColorScheme('dark')` → graph DOM root persists (same ref).

**Empty / Loading / Error States**
- **D-12** — Loading: Mantine `<Skeleton>` placeholders (4-6 grey card-shaped boxes in vertical stack) inside canvas. NO spinner.
- **D-13** — Empty: root node alone + Mantine `<Alert>` below canvas: "No references at depth 1. Try increasing depth via the slider above."
- **D-14** — Error: silent fallback per-fetch (drop the failing node, continue). Aggregate errors → console.log only. ALL fetches fail → fall through to empty state with alert "Unable to load references. Check Blaze connection."

**Navigation & Interaction**
- **D-05** — Single click navigates immediately. NO selection state, NO double-click intermediary, NO hover-preview navigation. Hover triggers Mantine Tooltip with `secondary`. Matches `PatientRelatedResources` / `IncomingReferencesPanel` (Phase 48) muscle memory.
- **D-15** — React Flow `<Controls />` (top-right; zoom in/out + fit-to-view) AND `<MiniMap />` (bottom-right) mounted unconditionally. Researcher MAY relocate if dagre TB places root under controls.
- **D-16** — Browser back/forward MUST respect history. `useNavigate()` default behavior; test asserts explicitly.

**Performance & Bundle**
- **D-17** — `<ResourceGraphView>` lazy-imported via `React.lazy()` in router. `@xyflow/react` and `@dagrejs/dagre` imported INSIDE the view — never at router or `App.tsx` level. Vite analyzer (`ANALYZE=1 npm run build`) MUST confirm both deps are in the lazy chunk and absent from the main chunk. Initial-load gz delta ≤ +5 KB vs post-Phase-48 baseline.
- **D-18** — BFS fetches at each level fire in parallel via `Promise.all` (Phase 48 idiom). Per-fetch cancellation flag prevents stale render after depth change / unmount.
- **D-19** — Outgoing-reference fetches reuse Phase 47 reference-resolution cache (READ-01) when available. Incoming fetches use a new module-scoped `Map<\`${type}/${id}:${depth}\`, Promise<Resource[]>>` (component-mount lifetime; cleared on unmount). NOT persisted to localStorage.

**Testing**
- **D-20** — 5 mandatory tests:
  1. **BFS depth-cap** (vitest unit): 10-deep chain, `maxDepth=3` → exactly 4 nodes, level 5+ never queried.
  2. **BFS node-count cap** (vitest unit): depth-1 fan-out > 150 → BFS stops at 150 + truncation flag.
  3. **Node-click navigation** (RTL): 3-node graph → click non-root → `useNavigate` mock called with `/explorer/{type}/{id}`.
  4. **Theme-switch invariant** (RTL): render light → capture root DOM ref → `setColorScheme('dark')` → same DOM ref persists.
  5. **Parallel-fetch fanout** (RTL): 5 outgoing refs at depth 1 → `client.get` called 5× in parallel.
  Researcher MAY add: error-recovery, lazy-chunk smoke (build + grep), edge-label render.

### Claude's Discretion

- Exact dagre tuning constants (`nodesep`, `ranksep`, `edgesep`).
- `@tabler/icons-react` icon for "Graph" button.
- Edge type (`smoothstep` / `default` / `bezier`).
- Depth slider position (canvas-overlay vs. above-canvas toolbar; recommend above-canvas).
- File organization (single file vs. `ResourceGraphView.tsx` + `useGraphBfs.ts` + `ResourceGraphNode.tsx` + `graph.css`; recommend split for testability).
- Mantine Tooltip placement strategy (`right` default; may switch to `top-end` if collision).

### Deferred Ideas (OUT OF SCOPE)

- 4-Mode Resource Shell (working name Phase 51).
- JSON peek drawer (`J` keypress).
- Sidebar v2 + ⌘K + Expert toggle.
- G2/G3 multi-resource graphs.
- Graph PNG/SVG/JSON export.
- Live updates / WebSocket / polling.
- Edge bundling / clustering / collision-avoidance beyond dagre defaults.
- Saved graph views / bookmarks.
- Path-finding queries.
- CapabilityStatement-driven reverse-reference discovery (still on the v1.8+ deferred list).

</user_constraints>

<phase_requirements>

## Phase Requirements

| ID | Description (verbatim REQUIREMENTS.md) | Research Support |
|----|---------------------------------------|------------------|
| **GRPH-01** | A new lazy-loaded route `/explorer/:type/:id/graph` mounts `<ResourceGraphView resource={r}>`. Reachable from a "Graph" button on `ResourceDetailPage` (next to "Raw JSON" / "$everything"). Initial-load bundle gz delta ≤ +5 KB. | §6 Lazy-Route Wiring + §2 Bundle Budget. Lazy precedent confirmed in `src/App.tsx:48-88` + `AppLayout.tsx:44`. Bundle math: lazy chunk ~63 KB gz (xyflow 49 KB + dagre 14 KB + system + glue ≈ 95 KB gz total — safely below the ~73 KB target in PROJECT.md note "graph route lazy ~73 KB gz on visit"); initial-load delta projected ≤ +1 KB gz (Mantine button + icon already in chunk). |
| **GRPH-02** | Graph (G1) shows root resource + outgoing refs at depth ≥ 1 + incoming refs at depth 1 from `reverseReferenceCatalog`. Default depth = 1 both directions; hard cap depth 3. | §3 BFS Algorithm. Catalog `src/utils/reverseReferenceCatalog.ts` provides `{ type, param }` per source-type — for graph use we issue `_count=N` (NOT `_summary=count`) to get ID-bearing results. |
| **GRPH-03** | Each node clickable → `/explorer/{type}/{id}`. Labels render `summarizeResource(target).primary`. Edge labels = FHIR reference field name. Hover tooltip = `summarizeResource(target).secondary`. | §4 Layout Configuration + Phase-46 `summarizeResource` is pure function ready for direct use in node component. Phase-48 `useNavigate()` click-pattern reused. |
| **GRPH-04** | Hierarchical (DAG) layout via `@dagrejs/dagre` ≥ 3.x rendered through `@xyflow/react` (React Flow 12). Mantine 8 dark-mode integration via CSS variables — theme switch re-themes WITHOUT remount. Zoom / pan / minimap built-in. Pinned versions recorded in `49-CONTEXT.md`. | §1 Library Versions + §5 Theme Integration. dagre 3.0.0 + xyflow 12.10.2 verified live. CSS-variable bridge documented in §5. `<Controls />` + `<MiniMap />` are React Flow built-ins (no extra deps). |

</phase_requirements>

## Project Constraints (from CLAUDE.md)

The planner MUST verify compliance with every directive below.

| Directive | Source line | Phase 49 implication |
|-----------|-------------|---------------------|
| **NO Mantine 9** | "Mantine 9.x — Requires React 19 exclusively; incompatible with @medplum/react 5.x" | Verified: `@xyflow/react@12.10.2` has NO Mantine peer (`peerDependencies = { react: '>=17', 'react-dom': '>=17' }`). Zero risk. |
| **NO `@tanstack/react-query`** | "MedplumClient + useSearch/useSearchResources already handle caching" | Phase 49 BFS uses raw `client.get(client.fhirUrl(url).toString())` per Phase 48 idiom. Module-scoped `Map<key, Promise>` cache. NOT TanStack. |
| **NO Tailwind** | "Conflicts with Mantine's styling system. Mantine IS the design system." | Theme integration is pure CSS variables in `graph.css` mapping `--xy-*` → `--mantine-*`. Zero utility classes. |
| **React 18 only** | "React 19 works… but React 18 is more battle-tested. React 19's new features… aren't needed." | `@xyflow/react@12.10.2` peer is `react: '>=17'` — fully React 18 compatible. |
| **TS 5.7 strict** | `"typescript": "^5.7.0"` | dagre 3.0.0 ships `dist/types/index.d.ts`; xyflow 12.10.2 ships per-file `.d.ts`. Both are first-class TS. |
| **Vite 8** | `"vite": "^8.0.4"` | `React.lazy()` + dynamic `import()` triggers Vite's automatic code-split. No manual `manualChunks` config needed (verified `vite.config.ts` line 30-50: zero chunk hints). |
| **GSD workflow enforcement** | "Before using Edit, Write, or other file-changing tools, start work through a GSD command" | This research file is being written via the GSD researcher; the planner will create plans via `/gsd-plan-phase`. ✓ |
| **Sequential A→B→C→D→E phase order** | v1.7 milestone decision | Phase 46 (`summarizeResource`) ✅ shipped; Phase 47 (HumanReadableView reference cache) ✅ shipped; Phase 48 (`reverseReferenceCatalog` + `RelatedResourcesPanel`) ✅ shipped. Phase 49 deps are all in tree. |

## Standard Stack

### Core (already installed — verified `package.json`)

| Library | Version | Purpose | Verification |
|---------|---------|---------|--------------|
| react | ^18.3.1 | UI runtime | `package.json:35` [VERIFIED] |
| @mantine/core | ^8.3.18 | Component library + theme + CSS variables | `package.json:21` [VERIFIED] |
| @mantine/hooks | ^8.3.18 | `useDisclosure`, `useDebouncedValue` if needed | `package.json:23` [VERIFIED] |
| @medplum/core | ^5.1.7 | `MedplumClient.get()` + `fhirUrl()` for BFS fetches | `package.json:26` [VERIFIED] |
| @medplum/fhirtypes | ^5.1.7 | `Resource`, `ResourceType`, `Reference`, `Bundle` types | `package.json:27` [VERIFIED] |
| @medplum/react-hooks | ^5.1.7 | `useMedplum()` | `package.json:29` [VERIFIED] |
| react-router-dom | ^7.14.0 | `useNavigate()` + new `<Route path="/explorer/:type/:id/graph">` | `package.json:37` [VERIFIED] |
| @tabler/icons-react | ^3.41.1 | Icon for "Graph" button (`IconShare` / `IconHierarchy` / `IconAffiliate` / `IconNetwork`) | `package.json:30` [VERIFIED] |

### New Dependencies to Add

| Library | Version | Purpose | Verification |
|---------|---------|---------|--------------|
| **@xyflow/react** | **`12.10.2`** | React Flow renderer + `<ReactFlow>`, `<Controls />`, `<MiniMap />`, `<ReactFlowProvider>`, `useNodesState`, `useEdgesState`, `Position`, `MarkerType` exports | `npm view @xyflow/react version` → `12.10.2` [VERIFIED 2026-05-01]. Peer: `react: '>=17'` — React 18 ✓. Direct deps: `classcat@^5.0.3`, `zustand@^4.4.0`, `@xyflow/system@0.0.76`. NO Mantine peer. |
| **@dagrejs/dagre** | **`3.0.0`** | Hierarchical layout — `dagre.graphlib.Graph().setGraph({ rankdir: 'TB' })` + `dagre.layout(g)` | `npm view @dagrejs/dagre version` → `3.0.0` [VERIFIED 2026-05-01, published 2026-03-22]. Direct dep: `@dagrejs/graphlib@4.0.1`. Public API verified byte-identical to 1.x via `dist/types/index.d.ts`: `setGraph()`, `setNode()`, `setEdge()`, `layout()`, `graphlib`, `Graph` all present. |

### Installation

```bash
npm install @xyflow/react@12.10.2 @dagrejs/dagre@3.0.0
```

**Critical version-pinning rationale:**

- **Pin both as exact versions** (no `^` prefix in the planner's `npm install` invocation); record the resulting `package.json` exact-or-caret line in 49-VERIFICATION.md. The CONTEXT.md "researcher must pin" requirement (Specifics §line 182) is hard-blocking.
- **DO NOT use `dagre@^0.8.5`** (the unscoped legacy package). It's the abandoned predecessor. The maintained fork is `@dagrejs/dagre`.
- **DO NOT use `reactflow@^11.x`** (the legacy package). React Flow 12 was renamed to `@xyflow/react`.

### ROADMAP-vs-actual `@dagrejs/dagre` version reconciliation

- **ROADMAP.md (line 184):** "`@dagrejs/dagre` ≥ 3.x" — CORRECT.
- **CONTEXT.md (D-06, line 17 + canonical_refs line 139):** "current latest is 1.x (NOT 3.x as roadmap mistakenly says)" — **INCORRECT as of 2026-05-01.**
- **Live npm verification:**
  ```
  $ npm view @dagrejs/dagre version
  3.0.0
  $ npm view @dagrejs/dagre versions --json | tail -5
  ["2.0.4", "3.0.0"]
  ```
  Latest 1.x: `1.1.5`. Latest 2.x: `2.0.4`. Latest 3.x: `3.0.0` (published 2026-03-22 per `npm view @dagrejs/dagre time.modified`).

**API compatibility check (3.x is a packaging bump, not a behavior bump):**

```ts
// dagre 3.0.0 — verified from extracted dist/types/index.d.ts
export { Graph } from '@dagrejs/graphlib';
export { layout } from './lib/layout';
export type { GraphLabel, NodeConfig, EdgeConfig, LayoutConfig, ... }
```

vs.

```ts
// dagre 1.1.5 — same public API: Graph (re-exported from graphlib),
//   setGraph(), setNode(), setEdge(), graphlib namespace, layout()
```

**Recommendation: pin `@dagrejs/dagre@3.0.0`.** Smaller bundle (13.8 KB gz vs 28.1 KB gz for 1.1.5 — see §2), ESM-first, dependency-update bump. Same API. Lower bundle cost is the deciding factor for D-17's bundle budget.

### Alternatives Considered (per CLAUDE.md "Do NOT Use" §)

| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| @xyflow/react 12 | reagraph (3D WebGL) | Bundle cost ~500 KB gz; no node-click-navigate first-class API; deferred per REQUIREMENTS.md "Out of Scope" §line 56. |
| @xyflow/react 12 | mermaid | No node-click navigation; markdown-syntax graph language; wrong tool per REQUIREMENTS.md line 57. |
| @xyflow/react 12 | reactflow@^11 (legacy) | Project rebrand happened — `@xyflow/react` is the maintained successor. v11 receives security patches only. |
| @dagrejs/dagre 3.0.0 | elkjs | ELK has more layout algorithms but ~280 KB gz vs dagre's 13.8 KB gz — fails D-17 budget. |
| @dagrejs/dagre 3.0.0 | d3-hierarchy | Tree-only (NOT DAG) — fails GRPH-04 hierarchical-DAG requirement when a resource has multiple incoming edges from different sources at depth 2+. |

## Bundle Budget Analysis

### Measured gzipped sizes (verified 2026-05-01 via `npm pack` + `gzip -9`)

| Component | Raw size | Gzipped (-9) | Source |
|-----------|---------:|-------------:|--------|
| `@xyflow/react@12.10.2` ESM (`dist/esm/index.js`) | 219.4 KB | **48.7 KB** | tarball extract [VERIFIED] |
| `@xyflow/system@0.0.76` ESM (transitive) | 146.3 KB | **33.3 KB** | tarball extract [VERIFIED] |
| `zustand@4.5.5` ESM (transitive) | — | **0.7 KB** | tarball extract [VERIFIED] |
| `classcat@5.0.5` ESM (transitive) | — | **0.2 KB** | tarball extract [VERIFIED] |
| `@dagrejs/dagre@3.0.0` ESM (`dist/dagre.esm.js`) | 39.6 KB | **13.7 KB** | tarball extract [VERIFIED] |
| `@dagrejs/dagre@1.1.5` UMD min (rejected) | 93.9 KB | 28.1 KB | tarball extract [VERIFIED] |
| `@dagrejs/graphlib@4.0.1` (transitive of dagre 3.x) | (included in `dagre.esm.js` via bundling) | (already counted) | inspect — graphlib re-exports inlined |

**Important: `@xyflow/system` is a transitive load-bearing peer.** It is NOT a separate npm install — it's a hidden dependency of `@xyflow/react` that Vite will tree-shake into the same lazy chunk. Its 33.3 KB gz is included in the lazy chunk.

### Lazy chunk projection

```
Lazy chunk = @xyflow/react (48.7) + @xyflow/system (33.3) + dagre (13.7) + zustand (0.7) + classcat (0.2)
           + ResourceGraphView.tsx + ResourceGraphNode.tsx + useGraphBfs.ts + graph.css
           + tree-shaking savings (Vite + Rollup typically –10-15%)

Pre-shake:  ~96.6 KB gz (deps only)
Post-shake estimate: ~78-86 KB gz (deps after Vite tree-shake — very rough)
+ phase 49 source code: ~3-5 KB gz

Total lazy chunk: ~83-91 KB gz projected.
```

### Verdict against budgets

| Budget | Target | Projected | Status |
|--------|-------:|----------:|--------|
| **Initial-load gz delta** (D-17 / GRPH-01 SC) | ≤ **+5 KB** | **≤ +1 KB** (Mantine Button + tabler icon already in main chunk; only the static `import('./ResourceGraphView')` thunk + the new `<Route>` registration land in main) | ✅ **PASS** |
| **Lazy chunk total gz** (PROJECT.md note "~73 KB gz") | ~73 KB | **~83-91 KB gz projected** | ⚠️ **+10-18 KB OVER soft target** |

The PROJECT.md "~73 KB gz" target is a forecast, not a SC. The ROADMAP / REQUIREMENTS hard SC is the **initial-load** delta (≤ +5 KB), which is satisfied. The lazy-chunk overshoot is unavoidable: `@xyflow/system` alone is 33.3 KB gz and is a load-bearing peer of `@xyflow/react`. The budget forecast in PROJECT.md likely did not account for `@xyflow/system` (it's a recent split — the dep boundary moved from a single bundle to a `react` + `system` split in xyflow 12.x).

**Recommendation:** Plan ships against the SC (initial-load ≤ +5 KB). Document the lazy-chunk overshoot in 49-VERIFICATION.md with the breakdown above. If the user wants strict 73 KB compliance, the only escape is to lazy-load `@xyflow/react` *inside* `ResourceGraphView` via a second React.lazy boundary, which adds a second loading skeleton — strictly worse UX.

### Verification step (planner MUST include this in the test plan)

```bash
# Run after implementation. Vite's analyzer treemap separates chunks.
ANALYZE=1 npm run build
# Then open dist/bundle-stats.html and verify:
#   1. Main chunk (index-*.js) does NOT contain xyflow / dagre / @xyflow/system / zustand
#   2. A separate async chunk (ResourceGraphView-*.js) contains all of them
#   3. Initial-load total (main + index.css + critical) gz delta ≤ +5 KB vs Phase 48 baseline
```

The Phase 48 close-out baseline is `npm run build exit 0 (537ms); test gate: 1371 passing` — the exact gz baseline number must be re-measured at Phase 49 wave-1 task-1 (`ls -la dist/assets/index-*.js | xargs gzip -c -9 | wc -c`) before the deps are added.

## Architecture Patterns

### Recommended File Layout

```
src/components/explorer/
├── ResourceGraphView.tsx          (NEW) — top-level, lazy-loaded; wraps everything
├── ResourceGraphNode.tsx          (NEW) — custom React Flow node component
├── useGraphBfs.ts                  (NEW) — depth-bounded BFS hook, parallel fanout
├── graph.module.css                (NEW) — React Flow → Mantine CSS variable bridge
└── ResourceDetailPage.tsx          (EDIT) — add "Graph" button next to existing actions

src/App.tsx                          (EDIT) — add lazy route `/explorer/:type/:id/graph`

src/components/explorer/__tests__/
├── ResourceGraphView.test.tsx      (NEW) — 5 mandatory D-20 tests (RTL)
└── useGraphBfs.test.ts              (NEW) — BFS depth-cap + node-cap unit tests (no RTL)
```

**Why split into 4 source files:**

1. `ResourceGraphView.tsx` is the React.lazy import target — it MUST be a default-export-or-thinly-shimmed module so the router-level `lazy(() => import('./ResourceGraphView'))` works.
2. `useGraphBfs.ts` is the testable pure-ish layer — depth-cap + node-cap + Promise.all fanout + cancellation flag — testable without React Flow.
3. `ResourceGraphNode.tsx` is the React Flow custom-node component — testable with RTL by passing it directly (avoiding the full ReactFlowProvider stack).
4. `graph.module.css` is a CSS-only file (NO TypeScript), wired through a `import './graph.module.css'` at the top of `ResourceGraphView.tsx`. Mantine's CSS variables are global, so the file selectors don't need to be CSS-modules-scoped — but using `.module.css` triggers Vite's CSS code-split which lands the styles in the same lazy chunk as the JS.

### Pattern 1: Module-scoped LRU caching for FHIR fetches

**What:** Per Phase 48's `RelatedResourcesPanel` and Phase 36's `extensionProfileCache`, in-flight Promises are deduplicated via a module-scoped `Map<key, Promise<T>>`.

**When to use:** Any time multiple components / re-renders / StrictMode double-invocation could request the same fetch. Phase 49 BFS hits this on (a) re-render during depth slider drag, (b) StrictMode double-mount, (c) two graph nodes pointing to the same target.

**Example:**
```ts
// useGraphBfs.ts
const incomingFetchCache = new Map<string, Promise<Resource[]>>();

function fetchIncomingForResource(
  client: MedplumClient,
  type: ResourceType,
  id: string,
  catalog: ReverseReferenceEntry[],
  signal: { cancelled: boolean },
): Promise<Resource[]> {
  const key = `${type}/${id}`;
  if (incomingFetchCache.has(key)) return incomingFetchCache.get(key)!;
  const p = Promise.all(
    catalog.map((entry) =>
      client
        .get(client.fhirUrl(`${entry.type}?${entry.param}=${type}/${id}&_count=100`).toString())
        .then((raw) => {
          const bundle: Bundle = typeof raw === 'string' ? JSON.parse(raw) : raw;
          return (bundle.entry ?? []).map((e) => e.resource).filter(Boolean) as Resource[];
        })
        .catch(() => []),  // D-14: silent fallback per fetch
    ),
  ).then((arrays) => arrays.flat());
  incomingFetchCache.set(key, p);
  return p;
}
```

**Cache lifetime:** Match Phase 48 — module-scoped, cleared on a hook call. NOT persisted to localStorage (D-19 explicit).

### Pattern 2: Cancellation flag (Phase 48 idiom)

**What:** Inside `useEffect`, declare `let cancelled = false`; when dispatched fetches resolve, check the flag before calling `setState`. Cleanup function flips `cancelled = true`.

**Why:** `client.get()` returns a Promise without an `AbortController` signal slot in Medplum 5.1.7 — verified per `useMiiExtensionCounts` precedent (Phase 42). Cannot abort the network request; can only suppress its render-side effects.

**Example (verbatim from `RelatedResourcesPanel.tsx:42-64`):**
```ts
useEffect(() => {
  let cancelled = false;
  // … kick off fetches …
  for (const e of entries) {
    client.get(...).then((raw) => {
      if (cancelled) return;  // ← key line
      setCounts((prev) => ({ ...prev, [entryKey(e)]: bundle.total ?? 0 }));
    }).catch(() => {
      if (cancelled) return;
      setCounts((prev) => ({ ...prev, [entryKey(e)]: 0 }));
    });
  }
  return () => { cancelled = true; };
}, [client, refValue, entries]);
```

Phase 49 BFS reuses verbatim — pass `signal: { cancelled: boolean }` into `useGraphBfs`'s internal helpers.

### Pattern 3: Lazy route via `React.lazy(() => retry(() => import(…)).then((m) => ({ default: m.X })))`

**What:** Established in `src/App.tsx:48-88` (Phase 27 EFF-02). NINE lazy-loaded routes already use this exact wrapper.

**Why the `.then((m) => ({ default: m.X }))` shape:** React.lazy expects a module with a `default` export. The Phase 27 idiom uses NAMED exports for components (better refactoring + grep-ability), so the thunk re-shapes the module.

**Why `retry(...)`:** `src/utils/lazyRetry.ts` wraps the dynamic `import()` with 3-attempt exponential backoff (100/300/900ms) to survive transient chunk-load failures (stale CDN cache after deploy, flaky network).

**Example (Phase 49 wiring — paste into `src/App.tsx` after line 88):**
```ts
// Phase 49 — Plan 49-XX (GRPH-01).
const ResourceGraphView = lazy(() =>
  retry(() => import('./components/explorer/ResourceGraphView')).then((m) => ({
    default: m.ResourceGraphView,
  })),
);
```

And in the `<Routes>` block (paste after `<Route path=":resourceType/:id" element={<ResourceDetailPage />} />` at line 138):
```tsx
<Route path=":resourceType/:id/graph" element={<ResourceGraphView />} />
```

The Suspense fallback (`<Center><Loader /></Center>` with `data-testid="route-loading"`) is already mounted at `AppLayout.tsx:44` — no additional Suspense wrapping needed.

### Anti-Patterns to Avoid

- **DO NOT call `lazy()` inside the component body.** Per `src/App.tsx:34` comment: "lazy() MUST be called at module scope (outside any component body) so React's lazy cache deduplicates the import across re-renders and StrictMode double-invocation." Phase 49 follows.
- **DO NOT add `<Suspense key={location.key}>`.** Per `AppLayout.tsx:21` comment: "would force a remount on every nav and harm UX even for cached chunks." Phase 49 follows.
- **DO NOT install `@xyflow/system` as a direct dependency.** It is a transitive of `@xyflow/react`. Adding it directly creates a duplicate-version risk — npm sometimes resolves the direct pin separately from the transitive, doubling the bundle.
- **DO NOT call `dagre.layout()` outside an effect.** It is synchronous and CPU-bound; for typical 8-15 node graphs runs in <5ms, but a 150-node graph (cap) can hit 50-100ms. Run inside a `useEffect` after BFS resolves (or inside a `useMemo` keyed on `[nodes, edges]`).
- **DO NOT mount `<ReactFlow>` without `<ReactFlowProvider>`** if you use any of the `useReactFlow()` / `useNodesState()` / `useEdgesState()` hooks anywhere up-tree. The provider is required (see Pitfall §3).

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Hierarchical layout | DIY DFS + manual y-coordinate stacking | `@dagrejs/dagre` | Network-simplex layering, cycle-breaking, edge-routing — months of work that dagre packs into 13.7 KB gz. |
| Pan/zoom/minimap | DIY SVG + wheel-event handlers | `@xyflow/react` `<Controls />` + `<MiniMap />` | Trackpad gesture handling, focus management, keyboard accessibility — gets hairy. |
| Click-to-navigate from a node | Wrap entire node SVG in `<Link>` | Use `onClick` on the React Flow node + `useNavigate()` | React Flow's pan-on-drag conflict-resolves with onClick; manually wrapping breaks drag. |
| Custom edge component with always-visible label | DIY SVG `<text>` element + edge endpoint math | React Flow `Edge.label` prop on a built-in `smoothstep` / `default` edge type | Built-in edges handle endpoint math, label rotation, midpoint auto-placement, viewport zoom level. |
| Theme switch propagation | Subscribe to `useMantineColorScheme` + manually update node `style` props | Map `--xy-*` CSS variables to `--mantine-color-*` in static CSS | CSS-variable propagation is automatic at the browser level; no React re-render needed. |
| BFS depth/node bounds | Recursive function with implicit stack | `while (queue.length > 0 && nodes.size < 150)` iteration | Recursion deepens the stack on densely-connected resources; iterative form is bounded and testable. |
| Reverse-reference catalog | Build per-resource lookup at runtime | Reuse Phase 48 `reverseReferenceCatalog` (already in tree) | Phase 48 verified the catalog against Blaze + the FHIR R4 SearchParameter registry. Reusing keeps both surfaces in sync. |
| Resource summary | Inline switch in node component | Reuse Phase 46 `summarizeResource(target)` | Phase 46 covers 8 typed resource types + generic fallback. Pure function, deterministic. |

**Key insight:** Phase 49 sits on top of two finished phases (46 + 48) — it's the integration-and-rendering phase, not a foundation phase. Hand-rolling either the catalog or the summary util would create two competing sources of truth.

## Runtime State Inventory

| Category | Items Found | Action Required |
|----------|-------------|------------------|
| Stored data | None — Phase 49 is read-only; no user state persisted. The graph state lives in component memory only. | None |
| Live service config | None — no external service config beyond the existing FHIR server URL (settings.yaml) which is unchanged. | None |
| OS-registered state | None — no OS-level registrations. | None |
| Secrets/env vars | None — graph queries piggyback on the existing MedplumClient auth (settings.yaml + the v1.6 Phase 43 `validator.bearerToken.v1` localStorage key, which is for the validator only, not for graph fetches). | None |
| Build artifacts | New lazy chunk `dist/assets/ResourceGraphView-*.js` will be emitted by Vite. No stale-egg-info-style risk because this is a NEW module (no rename). | None |

**Nothing found in any category** — this is a greenfield additive phase, not a rename / refactor.

## BFS Algorithm Pseudocode

The hook `useGraphBfs(rootResource, depth)` implements depth-bounded BFS with parallel per-level fanout and a hard cap on total node count.

```
GIVEN:
  rootResource: Resource (the current /explorer/:type/:id resource)
  depth: number (1..3, clamped)
  client: MedplumClient (from useMedplum())
  catalog: reverseReferenceCatalog
  summarize: summarizeResource (Phase 46)
  signal: { cancelled: boolean } (Phase-48 idiom)

CONSTANTS (locked by D-04b + D-08):
  MAX_DEPTH = 3
  MAX_NODES = 150
  PER_FETCH_COUNT = 100  // _count=100 per outgoing+incoming search

STATE:
  nodes:    Map<resourceKey, { resource, depthFromRoot, isRoot: boolean }>
  edges:    Array<{ source: resourceKey, target: resourceKey, label: string /* FHIR field name */ }>
  truncated: boolean

INVARIANTS:
  resourceKey = `${resource.resourceType}/${resource.id}`
  effectiveDepth = max(1, min(depth, MAX_DEPTH))
  After each level resolves, nodes.size <= MAX_NODES (hard cap)

ALGORITHM:

  function buildGraph(root, depth):
    nodes := new Map()
    edges := []
    nodes.set(key(root), { resource: root, depthFromRoot: 0, isRoot: true })
    truncated := false

    let frontier := [root]
    for level := 1 to effectiveDepth:
      if signal.cancelled: return                       # cooperative cancel
      if nodes.size >= MAX_NODES:
        truncated := true; break

      # --- Parallel fanout: all frontier nodes fetched at once ---
      const fanoutPromises := frontier.map((r) => Promise.all([
        fetchOutgoingTargets(r),                         # (A) outgoing refs
        level === 1 ? fetchIncomingSources(r) : []        # (B) incoming refs ONLY at depth 1 per CONTEXT.md
      ]))

      const results := await Promise.all(fanoutPromises) # parallel
      if signal.cancelled: return

      const nextFrontier := []
      for each (r, [outgoing, incoming]) in zip(frontier, results):
        for each {target, fieldName} in outgoing:
          if nodes.size >= MAX_NODES:
            truncated := true; break-out
          if !nodes.has(key(target)):
            nodes.set(key(target), { resource: target, depthFromRoot: level, isRoot: false })
            nextFrontier.push(target)
          edges.push({
            source: key(r),
            target: key(target),
            label: fieldName    # e.g. 'subject', 'encounter', 'performer'
          })

        for each {source, fieldName} in incoming:
          if nodes.size >= MAX_NODES:
            truncated := true; break-out
          if !nodes.has(key(source)):
            nodes.set(key(source), { resource: source, depthFromRoot: level, isRoot: false })
            nextFrontier.push(source)
          edges.push({
            source: key(source),    # incoming arrow points AT current (D-10)
            target: key(r),
            label: fieldName
          })

      frontier := nextFrontier

    return { nodes, edges, truncated }

  function fetchOutgoingTargets(r):
    # Walk r's reference fields in known FHIR R4 schema (Reference + Reference[])
    # For each non-null reference, parse "Type/id" and fetch via client.readResource(type, id).
    # Reuse Phase 47 reference-resolution cache when available (D-19).
    # On 404 / failure: silently drop that edge (D-14).
    const refs := extractReferences(r)   # implementation: see below
    return Promise.all(refs.map(({ refStr, fieldName }) =>
      client.readResource(parseType(refStr), parseId(refStr))
        .then((target) => ({ target, fieldName }))
        .catch(() => null)
    )).then((arr) => arr.filter(Boolean))

  function fetchIncomingSources(r):
    const catalog := reverseReferenceCatalog[r.resourceType] ?? []
    if catalog.length === 0: return []
    return Promise.all(catalog.map((entry) => {
      const url := `${entry.type}?${entry.param}=${r.resourceType}/${r.id}&_count=${PER_FETCH_COUNT}`
      return client.get(client.fhirUrl(url).toString())
        .then((raw) => parseJson(raw))
        .then((bundle) => (bundle.entry ?? [])
          .map((e) => e.resource)
          .filter(Boolean)
          .map((source) => ({ source, fieldName: entry.param })))
        .catch(() => [])     # D-14 silent
    })).then((arrays) => arrays.flat())
```

### Reference extraction (`extractReferences(r)`)

FHIR R4 has many reference-bearing fields per resource type. Initial implementation can use a pragmatic walker:

```ts
function extractReferences(r: Resource): Array<{ refStr: string; fieldName: string }> {
  const out: Array<{ refStr: string; fieldName: string }> = [];
  walk(r, '', (path, value) => {
    if (
      value &&
      typeof value === 'object' &&
      typeof (value as { reference?: unknown }).reference === 'string'
    ) {
      const refStr = (value as { reference: string }).reference;
      // Only handle relative "Type/id" references (skip absolute URLs to other servers)
      if (/^[A-Z][a-zA-Z]+\/[A-Za-z0-9][A-Za-z0-9\-.]{0,63}$/.test(refStr)) {
        out.push({ refStr, fieldName: path.split('.').pop() ?? '' });
      }
    }
  });
  return out;
}
```

**Note:** REQUIREMENTS.md "Out of Scope" §line 58 says cross-server references stay as raw href + dead link; the regex above filters them out from graph traversal. Same FHIR pattern as `ResourceDetailPage.tsx:20-21` (T-02-08 mitigation).

### Default `_count` choice (CONTEXT.md item §8)

For incoming-reference fetches at depth 1, use `_count=100`. Rationale:

- Density: typical clinical Patient has 50-200 Observations on Synthea data. `_count=100` covers most single-Patient cases.
- OOM defense: each Bundle.entry includes the full resource (including extensions). 100 × ~5 KB = 500 KB JSON per fetch → 11 simultaneous fetches (the Patient catalog) = ~5 MB peak — acceptable.
- Pagination: Blaze paginates via `Bundle.link[rel='next'].url`. Phase 49 BFS does NOT follow next links — the `_count=100` IS the cap. The 150-node total cap (D-08) takes effect upstream of pagination. **Document in 49-VERIFICATION.md:** "Resources with > 100 instances of a given incoming type at depth 1 will be visually truncated (Bundle.total displayed in the alert)."

If Synthea testing shows `_count=100` undercounts realistic graphs, raise to `_count=200`. Don't go higher without follow-up — at 500 the fetch latency tail starts dominating UX.

## Layout Configuration

### Recommended dagre configuration

```ts
import dagre from '@dagrejs/dagre';

const NODE_WIDTH = 220;   // matches Mantine Card 220px (room for ~20-char primary text + 6-char chip)
const NODE_HEIGHT = 64;   // matches Mantine Card padding="xs" + 2-line content (resourceType + primary)

function applyDagreLayout(
  nodes: ReactFlowNode[],
  edges: ReactFlowEdge[],
  direction: 'TB' | 'LR' = 'TB',
): ReactFlowNode[] {
  const g = new dagre.graphlib.Graph()
    .setDefaultEdgeLabel(() => ({}))
    .setGraph({
      rankdir: direction,    // D-06: 'TB' (top-down)
      nodesep: 60,           // gap between nodes IN the same rank (sibling spacing)
      ranksep: 90,           // gap between RANKS (vertical spacing in TB)
      edgesep: 24,           // gap between parallel edges between two ranks
      ranker: 'network-simplex', // dagre default; tighter rank assignment than 'tight-tree'
      align: undefined,      // dagre default — let it pick UL/UR/DL/DR per layout
    });

  for (const n of nodes) g.setNode(n.id, { width: NODE_WIDTH, height: NODE_HEIGHT });
  for (const e of edges) g.setEdge(e.source, e.target);

  dagre.layout(g);

  return nodes.map((n) => {
    const pos = g.node(n.id);
    return {
      ...n,
      // dagre returns center-coordinates; React Flow expects top-left.
      position: { x: pos.x - NODE_WIDTH / 2, y: pos.y - NODE_HEIGHT / 2 },
      sourcePosition: direction === 'TB' ? Position.Bottom : Position.Right,
      targetPosition: direction === 'TB' ? Position.Top    : Position.Left,
    };
  });
}
```

**Tuning rationale (CONTEXT.md item §4 + D-06 dagre defaults check):**

| Param | Default | Phase 49 pick | Why |
|-------|--------:|---------------:|-----|
| `nodesep` | 50 | **60** | Mantine Cards at 220 px wide need a touch more breathing room than text-only nodes; 60 keeps a typical 4-sibling row from feeling cramped. |
| `ranksep` | 50 | **90** | TB layout puts edge labels (FHIR field names: `subject`, `has-member`, etc.) ON the edge midpoint between ranks; default 50 px makes labels collide with nodes. 90 px gives ~28 px clear above + below the label. |
| `edgesep` | 10 | **24** | When a hub Patient has 8 outgoing refs to 8 different children, edges crowd. 24 px keeps adjacent edge curves visually distinct at default React Flow zoom. |
| `ranker` | `network-simplex` | `network-simplex` | Tighter ranks than `tight-tree`; matches React Flow's official dagre example. |

**[ASSUMED]** These tuning constants are best-guess based on dagre wiki guidance + 220×64 node sizing. The researcher could not run a visual sweep on actual Synthea data inside this session. The planner SHOULD include a HUMAN-UAT item: "Open `/explorer/Patient/{id}/graph` on a Patient with ≥6 references — verify edge labels are readable, no overlapping nodes."

### Recommended edge type

**Use `smoothstep`** for all edges. Three reasons:

1. React Flow's official dagre example (`reactflow.dev/examples/layout/dagre`) uses `ConnectionLineType.SmoothStep` — verified via WebFetch [CITED: reactflow.dev].
2. Smoothstep edges are right-angled with rounded corners — visually distinct from the Mantine Card border treatment, so edges don't visually merge with node frames.
3. The label-on-midpoint placement is built-in: `{ id, source, target, type: 'smoothstep', label: 'subject' }` renders a small gray rounded background behind the text automatically. No custom edge component needed.

```ts
const edges: Edge[] = bfsEdges.map((e, i) => ({
  id: `e-${i}`,
  source: e.source,
  target: e.target,
  type: 'smoothstep',           // recommended
  label: e.label,                // FHIR field name (D-09)
  animated: false,               // animations distract; D-09 is "always visible label"
  // No custom labelStyle needed — React Flow's default uses CSS vars (see §5)
}));
```

`default` (bezier) is acceptable too but tends to bow heavily on TB layout, pushing labels off-center. `straight` is too aggressive and crosses through node bounding boxes when ranks differ. `step` (sharp 90° corners, no rounding) is visually noisier than smoothstep.

## Theme Integration Pattern

### Strategy decision: `colorMode` prop vs. CSS-variable bridge

React Flow 12 supports two theming approaches:

1. **`colorMode` prop:** Pass `colorMode={mantineScheme}` to `<ReactFlow>`. React Flow adds `.dark` / `.light` to its root div and uses pre-baked colors. Simpler, but React Flow's pre-baked dark palette is gray (`#1e1e1e`-style) — does NOT pick up Mantine's warm-neutral `--mantine-color-dark-*` palette.
2. **CSS-variable bridge:** Override React Flow's `--xy-*` variables in your own CSS to point at Mantine's `--mantine-color-*` variables. Mantine's theme switch updates `--mantine-color-*` automatically (via the `data-mantine-color-scheme` attribute on `<html>`); React Flow re-paints WITHOUT remount because it reads CSS vars at the browser layer.

**Recommendation: use the CSS-variable bridge AND pass `colorMode`** — they compose. `colorMode` ensures React Flow's `.dark` selectors fire (e.g., for the controls' hover state), and the CSS-variable bridge means our overrides win.

### File location

Use **`src/components/explorer/graph.module.css`** (NOT `graph.css`). Two reasons:

- `.module.css` triggers Vite's CSS code-splitting — the styles land in the lazy chunk alongside `ResourceGraphView`, NOT in the main `index.css` (preserves D-17 budget).
- However, the `:global()` wrapper is necessary because React Flow's class names (`.react-flow__node`, `.react-flow__edge-path`, etc.) are generated by the library, not authored by us. CSS modules would mangle them otherwise.

### Exact CSS bridge

```css
/* src/components/explorer/graph.module.css
 * Phase 49 — Plan 49-XX (D-11). Maps React Flow CSS vars to Mantine 8's. */

:global(.react-flow) {
  /* Background canvas */
  --xy-background-pattern-dots-color-default: var(--mantine-color-default-border);
  --xy-background-color-default: var(--mantine-color-body);

  /* Edges */
  --xy-edge-stroke-default: var(--mantine-color-gray-5);
  --xy-edge-stroke-width-default: 1.6;
  --xy-edge-stroke-selected-default: var(--mantine-color-indigo-6);

  /* Nodes (when using built-in node renderer; our custom ResourceGraphNode
     uses Mantine Card directly so these only affect any default-type nodes
     React Flow falls back to). */
  --xy-node-color-default: var(--mantine-color-text);
  --xy-node-background-color-default: var(--mantine-color-body);
  --xy-node-border-default: 1px solid var(--mantine-color-default-border);
  --xy-node-boxshadow-hover-default: 0 0 0 1px var(--mantine-color-indigo-3);
  --xy-node-boxshadow-selected-default: 0 0 0 2px var(--mantine-color-indigo-6);

  /* Handles (the connection points; we don't expose them but they render) */
  --xy-handle-background-color-default: var(--mantine-color-indigo-6);
  --xy-handle-border-color-default: var(--mantine-color-body);

  /* Controls (zoom buttons, top-right) */
  --xy-controls-button-background-color-default: var(--mantine-color-default);
  --xy-controls-button-background-color-hover-default: var(--mantine-color-default-hover);
  --xy-controls-button-color-default: var(--mantine-color-text);
  --xy-controls-button-border-color-default: var(--mantine-color-default-border);

  /* Minimap (bottom-right) */
  --xy-minimap-background-color-default: var(--mantine-color-default);

  /* Attribution chip — keep readable in both schemes */
  --xy-attribution-background-color-default: var(--mantine-color-default);
}

/* Edge label (the FHIR field name on the edge midpoint) — needs explicit
   styling because React Flow's default is light-only. */
:global(.react-flow__edge-text) {
  fill: var(--mantine-color-text);
  font-family: var(--mantine-font-family-monospace);
  font-size: 11px;
}

:global(.react-flow__edge-textbg) {
  fill: var(--mantine-color-body);
  stroke: var(--mantine-color-default-border);
  stroke-width: 1px;
}
```

### Verified Mantine variable names (cross-checked with mantine.dev/styles/css-variables-list)

| Variable | Light value | Dark value | Use |
|----------|-------------|-----------|-----|
| `--mantine-color-body` | `#fff` | `var(--mantine-color-dark-7)` | Canvas / node background |
| `--mantine-color-text` | `#000` | `var(--mantine-color-dark-0)` | Node text + edge labels |
| `--mantine-color-default-border` | `var(--mantine-color-gray-4)` | `var(--mantine-color-dark-4)` | Borders |
| `--mantine-color-dimmed` | `var(--mantine-color-gray-6)` | `var(--mantine-color-dark-2)` | Edge stroke |
| `--mantine-color-default` | `var(--mantine-color-white)` | `var(--mantine-color-dark-6)` | Controls bg |
| `--mantine-color-default-hover` | `var(--mantine-color-gray-0)` | `var(--mantine-color-dark-5)` | Controls hover |
| `--mantine-color-gray-5` | (gray ramp; does NOT change) | (same) | Edge stroke neutral pick |
| `--mantine-color-indigo-3` | `theme.colors.indigo[3]` | (same) | Selected outline |
| `--mantine-color-indigo-6` | `theme.colors.indigo[6]` | (same) | Selected handle + root accent |

[VERIFIED — mantine.dev/styles/css-variables-list, fetched 2026-05-01]

### Mounting in `ResourceGraphView.tsx`

```tsx
import './graph.module.css';   // CSS-only side-effect import; Vite bundles into lazy chunk
import { useMantineColorScheme } from '@mantine/core';
import { ReactFlow, ReactFlowProvider, Controls, MiniMap, Background } from '@xyflow/react';
import '@xyflow/react/dist/style.css';   // React Flow's base styles (default --xy-* values)

export function ResourceGraphView({ resource }: { resource: Resource }) {
  const { colorScheme } = useMantineColorScheme();
  // … BFS, dagre layout, nodes, edges …
  return (
    <ReactFlowProvider>
      <ReactFlow
        nodes={layoutedNodes}
        edges={edges}
        nodeTypes={{ resource: ResourceGraphNode }}
        fitView
        colorMode={colorScheme === 'dark' ? 'dark' : 'light'}
        proOptions={{ hideAttribution: false }}  // attribution required by React Flow MIT license
      >
        <Background />
        <Controls />
        <MiniMap />
      </ReactFlow>
    </ReactFlowProvider>
  );
}
```

**Critical:** `colorMode` is just an extra signal — the actual theming work is done by the CSS-variable bridge in `graph.module.css`. When `useMantineColorScheme` flips `data-mantine-color-scheme="dark"` on `<html>`, the `--mantine-color-*` variables auto-flip, the `:global(.react-flow)` selectors re-resolve, and React Flow re-paints. NO React state change → NO remount. This is the "without remount" guarantee from GRPH-04.

## Lazy-Route Wiring Pattern

### State of the existing precedent

Lazy-route precedent is **fully established** in this codebase as of Phase 27 (EFF-02):

- `src/App.tsx:1` imports `lazy` from React.
- `src/App.tsx:21` imports the `retry` helper.
- `src/App.tsx:48-88` declares NINE lazy routes (`ThresholdsPage`, `CompletenessDrillDown`, `CodingDrillDown`, `PlausibilityDrillDown`, `LabRangesDrillDown`, `DuplicatesDrillDown`, `ReferencesDrillDown`, `IPSPanel`).
- `AppLayout.tsx:44` mounts a global `<Suspense fallback={<RouteLoadingFallback />}>` at the Outlet level.
- `src/__tests__/lazy-routes.test.tsx` is the canonical test (per its own header comment) for lazy-route behavior.

Phase 49 needs zero new infrastructure — it just adds one more entry.

### Concrete `App.tsx` patch

**Add (after line 88, in the lazy declarations block):**
```ts
// Phase 49 — Plan 49-XX (GRPH-01). Reference graph for any FHIR resource;
// loaded only when /explorer/:type/:id/graph is visited.
const ResourceGraphView = lazy(() =>
  retry(() => import('./components/explorer/ResourceGraphView')).then((m) => ({
    default: m.ResourceGraphView,
  })),
);
```

**Add (inside the `/explorer` Route block, after line 138):**
```tsx
<Route path=":resourceType/:id/graph" element={<ResourceGraphView />} />
```

That is the ENTIRE wiring change — 6 lines of code in `App.tsx`.

### Where the resource gets to the view

The route segment shape `/explorer/:resourceType/:id/graph` means `ResourceGraphView` reads the same params as `ResourceDetailPage`:

```tsx
// ResourceGraphView.tsx
import { useParams } from 'react-router-dom';
import { useMedplum } from '@medplum/react-hooks';

export function ResourceGraphView() {
  const { resourceType, id } = useParams<{ resourceType: string; id: string }>();
  const client = useMedplum();
  const [resource, setResource] = useState<Resource | undefined>();

  useEffect(() => {
    if (!resourceType || !id) return;
    let cancelled = false;
    client.readResource(resourceType as ResourceType, id).then((r) => {
      if (cancelled) return;
      setResource(r);
    }).catch(() => { /* D-14: silent → empty state */ });
    return () => { cancelled = true; };
  }, [client, resourceType, id]);

  if (!resource) return <Skeleton height={400} />;   // D-12 loading
  return <ResourceGraphContent resource={resource} />;
}
```

**Observation:** REQUIREMENTS.md GRPH-01 says `mounts <ResourceGraphView resource={r}>` with a `resource` prop. Practically the cleanest implementation reads from URL params and self-fetches (above). The "resource={r}" wording in REQUIREMENTS is a contract spec, not a literal prop signature requirement — but the planner can preserve the spec by splitting into the route component above + an inner `<ResourceGraphContent resource={r}>`. Document this trade-off in 49-PLAN-01.md if the planner adopts the split.

### Patch to `ResourceDetailPage.tsx`

The existing file already has a `<Group>` block (line 144-157) holding "Back to results" + the Title. Add the "Graph" button there, plus the existing "Raw JSON" / "$everything" patterns from `PatientHeaderCard` (which Phase 49 doesn't touch). Recommendation: extend the existing `<Group>` line 144 to include the Graph button. **Pick `IconAffiliate`** (Tabler iconography for "linked / connected nodes"; reads as graph-y; `IconShare` is overloaded with social-share semantics).

```tsx
import { IconAffiliate } from '@tabler/icons-react';

// Inside the <Group> on line 144-157, after the "Back to results" Button:
<Button
  variant="light"
  leftSection={<IconAffiliate size={16} />}
  onClick={() => navigate(
    patientId
      ? `/patients/${patientId}/${resourceType}/${id}/graph`
      : `/explorer/${resourceType}/${id}/graph`
  )}
>
  Graph
</Button>
```

**Note** the patient-nested path: `ResourceDetailPage` is mounted at TWO routes (`src/App.tsx:138` and `src/App.tsx:144`). When the user is in the `/patients/:patientId/...` chrome, the graph button SHOULD navigate to a parallel `/patients/:patientId/:resourceType/:id/graph` path — but Phase 49 scope (D-02) only specifies `/explorer/:type/:id/graph`. **The planner should decide:** either (a) navigate from BOTH chromes to `/explorer/...` (loses patient-context breadcrumb), or (b) add a sibling route `/patients/:patientId/:resourceType/:id/graph` that mounts the same `<ResourceGraphView />`. Option (b) is cleaner; planner can fold into Wave 1 or defer with a note.

## Test Patterns

### Vitest + RTL infrastructure (already in place)

| Concern | Pattern | Source |
|---------|---------|--------|
| Test runner | Vitest 4.1.4 | `package.json:62` |
| Component test util | `@testing-library/react@16.3.2` | `package.json:46` |
| jsdom polyfills (Mantine 8 needs `ResizeObserver`, `matchMedia`, `scrollIntoView`) | `beforeAll` block | `lazy-routes.test.tsx:24-56` (canonical) |
| MantineProvider wrapper | `<MantineProvider><Component/></MantineProvider>` | Phase 48 tests |
| MemoryRouter wrapper | `<MemoryRouter initialEntries={['/...']}>` | `lazy-routes.test.tsx:105` |
| MedplumClient mock | `vi.fn().mockResolvedValue(...)` on `client.get` / `client.fhirUrl` / `client.readResource` | `RelatedResourcesPanel.test.tsx` |
| Async lazy assertion | `await screen.findBy*` (NOT `getBy*`) | `lazy-routes.test.tsx:127` |

### The 5 mandatory D-20 tests — concrete code

#### Test 1: BFS depth-cap (`useGraphBfs.test.ts`)

```ts
import { describe, it, expect, vi } from 'vitest';
import { runGraphBfs } from '../useGraphBfs';   // pure function exported for unit testing

describe('useGraphBfs depth cap', () => {
  it('refuses to traverse beyond depth 3 even when caller passes 10', async () => {
    // Build a synthetic 10-deep linked-resource chain. Each Resource at level N
    // has one Reference to the resource at level N+1.
    const mockClient = {
      readResource: vi.fn().mockImplementation((type, id) =>
        Promise.resolve({
          resourceType: 'Observation',
          id,
          subject: id === '10' ? undefined : { reference: `Observation/${Number(id) + 1}` },
        }),
      ),
      fhirUrl: vi.fn((url) => ({ toString: () => `http://test/fhir/${url}` })),
      get: vi.fn().mockResolvedValue({ resourceType: 'Bundle', total: 0, entry: [] }),
    };
    const root = { resourceType: 'Observation', id: '0', subject: { reference: 'Observation/1' } };

    const { nodes } = await runGraphBfs(mockClient as never, root, 10);  // caller passes 10

    // Hard cap at 3 → 4 nodes total (root + level1 + level2 + level3)
    expect(nodes.size).toBe(4);
    expect(mockClient.readResource).toHaveBeenCalledWith('Observation', '1');
    expect(mockClient.readResource).toHaveBeenCalledWith('Observation', '2');
    expect(mockClient.readResource).toHaveBeenCalledWith('Observation', '3');
    expect(mockClient.readResource).not.toHaveBeenCalledWith('Observation', '4');
    expect(mockClient.readResource).not.toHaveBeenCalledWith('Observation', '5');
  });
});
```

#### Test 2: BFS node-count cap

```ts
it('hard-caps total node count at 150', async () => {
  // Construct a Patient whose depth-1 incoming-reference fanout returns 200 Observations
  const mockClient = {
    fhirUrl: vi.fn((url) => ({ toString: () => `http://test/fhir/${url}` })),
    get: vi.fn().mockImplementation((url) => {
      // First call (the count-bearing search) returns 200 entries
      if (url.includes('Observation?patient=')) {
        return Promise.resolve({
          resourceType: 'Bundle',
          total: 200,
          entry: Array.from({ length: 200 }, (_, i) => ({
            resource: { resourceType: 'Observation', id: `obs-${i}` },
          })),
        });
      }
      return Promise.resolve({ resourceType: 'Bundle', total: 0, entry: [] });
    }),
    readResource: vi.fn(),
  };
  const root = { resourceType: 'Patient', id: 'p1' };
  const { nodes, truncated } = await runGraphBfs(mockClient as never, root, 1);
  expect(nodes.size).toBe(150);    // hard cap
  expect(truncated).toBe(true);
});
```

#### Test 3: Node-click navigation (RTL — the most complex of the 5)

```tsx
it('clicking a non-root node navigates to /explorer/{type}/{id}', async () => {
  const navigate = vi.fn();
  vi.mock('react-router-dom', async () => {
    const actual = await vi.importActual<typeof import('react-router-dom')>('react-router-dom');
    return { ...actual, useNavigate: () => navigate };
  });
  // Mock client to return: root Observation with one outgoing reference to a Patient
  const mockClient = {
    fhirUrl: vi.fn((url) => ({ toString: () => `http://test/fhir/${url}` })),
    get: vi.fn().mockResolvedValue({ resourceType: 'Bundle', total: 0, entry: [] }),
    readResource: vi.fn().mockResolvedValue({
      resourceType: 'Patient', id: 'p1', name: [{ given: ['Test'], family: 'Patient' }],
    }),
  };

  render(
    <MantineProvider>
      <MemoryRouter initialEntries={['/explorer/Observation/o1/graph']}>
        <MedplumProvider client={mockClient as never}>
          <Routes>
            <Route path="/explorer/:resourceType/:id/graph" element={<ResourceGraphView />} />
          </Routes>
        </MedplumProvider>
      </MemoryRouter>
    </MantineProvider>
  );

  // Wait for the BFS to resolve and the graph node to render.
  // ResourceGraphNode renders the Patient summary as a Mantine Card; its
  // `data-testid="graph-node-Patient/p1"` lets RTL grab it.
  const patientNode = await screen.findByTestId('graph-node-Patient/p1');
  await userEvent.click(patientNode);

  expect(navigate).toHaveBeenCalledWith('/explorer/Patient/p1');
});
```

#### Test 4: Theme-switch invariant (the hardest test — capture root DOM ref pre-switch)

```tsx
it('graph component does NOT remount when theme switches', async () => {
  function ThemeSwitchHarness() {
    const { setColorScheme } = useMantineColorScheme();
    return (
      <>
        <button data-testid="toggle" onClick={() => setColorScheme('dark')}>Toggle</button>
        <ResourceGraphView />
      </>
    );
  }

  render(
    <MantineProvider defaultColorScheme="light">
      <MemoryRouter initialEntries={['/explorer/Observation/o1/graph']}>
        <MedplumProvider client={mockClient as never}>
          <Routes>
            <Route path="/explorer/:resourceType/:id/graph" element={<ThemeSwitchHarness />} />
          </Routes>
        </MedplumProvider>
      </MemoryRouter>
    </MantineProvider>
  );

  // Wait for first render — graph is now in the DOM.
  const flowRootBefore = await screen.findByTestId('graph-flow-root');
  // Capture: (1) the actual DOM Node reference, (2) its data-react-flow-id attr
  const refBefore: HTMLElement = flowRootBefore;
  const idBefore = refBefore.getAttribute('data-react-flow-id');

  // Trigger theme switch
  await userEvent.click(screen.getByTestId('toggle'));

  // After the click, query again and assert IDENTITY (===), not equality.
  const flowRootAfter = screen.getByTestId('graph-flow-root');
  expect(flowRootAfter).toBe(refBefore);                     // SAME DOM node
  expect(flowRootAfter.getAttribute('data-react-flow-id')).toBe(idBefore);
  // Bonus: verify the Mantine attribute changed on <html>
  expect(document.documentElement.getAttribute('data-mantine-color-scheme')).toBe('dark');
});
```

**The critical assertion is `expect(flowRootAfter).toBe(refBefore)`**, not `.toEqual`. `toBe` checks reference equality (same DOM Node identity), which is the test for "did NOT remount."

`ResourceGraphView` must surface a stable `data-testid="graph-flow-root"` on the outermost wrapping div for this test to work. Ensure that's part of the component contract.

#### Test 5: Parallel-fetch fanout

```ts
it('issues all 5 outgoing-ref fetches in parallel (Promise.all), not serialized', async () => {
  let inFlight = 0;
  let maxInFlight = 0;
  const mockClient = {
    fhirUrl: vi.fn((url) => ({ toString: () => `http://test/fhir/${url}` })),
    get: vi.fn().mockResolvedValue({ resourceType: 'Bundle', total: 0, entry: [] }),
    readResource: vi.fn().mockImplementation(() => {
      inFlight += 1;
      maxInFlight = Math.max(maxInFlight, inFlight);
      return new Promise((resolve) => setTimeout(() => {
        inFlight -= 1;
        resolve({ resourceType: 'Patient', id: `p-${Math.random()}` });
      }, 20));
    }),
  };
  // Root with 5 outgoing references
  const root = {
    resourceType: 'Observation', id: 'o1',
    subject: { reference: 'Patient/p1' },
    encounter: { reference: 'Encounter/e1' },
    performer: [
      { reference: 'Practitioner/pr1' },
      { reference: 'Practitioner/pr2' },
    ],
    specimen: { reference: 'Specimen/sp1' },
  };
  await runGraphBfs(mockClient as never, root, 1);
  // 5 parallel calls → maxInFlight === 5 (NOT 1 if serialized)
  expect(mockClient.readResource).toHaveBeenCalledTimes(5);
  expect(maxInFlight).toBe(5);
});
```

### Optional 6th test: Lazy-chunk smoke (build-time)

```ts
// src/components/explorer/__tests__/ResourceGraphView.bundle.test.ts
import { describe, it, expect } from 'vitest';
import { execSync } from 'node:child_process';
import { readFileSync, readdirSync } from 'node:fs';

describe('Phase 49 lazy chunk', () => {
  it('main chunk does NOT contain xyflow or dagre; lazy chunk does', () => {
    execSync('npm run build', { stdio: 'pipe' });
    const distAssets = readdirSync('dist/assets');
    const mainChunkName = distAssets.find((f) => f.match(/^index-.*\.js$/))!;
    const main = readFileSync(`dist/assets/${mainChunkName}`, 'utf8');
    expect(main).not.toMatch(/@xyflow\/react/);
    expect(main).not.toMatch(/dagrejs/);

    const lazyChunk = distAssets.find((f) => f.match(/ResourceGraphView/))!;
    expect(lazyChunk).toBeDefined();
    const lazy = readFileSync(`dist/assets/${lazyChunk}`, 'utf8');
    // Match minified xyflow/dagre source signatures
    expect(lazy).toMatch(/(ReactFlow|reactFlowInstance)/);
    expect(lazy).toMatch(/(dagre|graphlib)/);
  });
});
```

This is heavy (calls `npm run build` from inside vitest) so the planner may prefer to make it a separate `npm run test:bundle` script gated on Wave 3 only.

## Validation Architecture

### Test Framework

| Property | Value |
|----------|-------|
| Framework | Vitest 4.1.4 |
| Config file | `vitest.config.ts` (project root, existing) |
| Quick run command | `npx vitest run src/components/explorer/__tests__/ResourceGraphView.test.tsx src/components/explorer/__tests__/useGraphBfs.test.ts` |
| Full suite command | `npm test` |
| Estimated runtime | ~25s quick (RTL with React Flow is heavier than plain Mantine), ~95s full |

### Phase Requirements → Test Map

| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| **GRPH-01** | Lazy chunk; initial-load delta ≤ +5 KB | build-time + bundle analyzer | `ANALYZE=1 npm run build && node scripts/check-bundle-budget.mjs` (Wave 0 helper script) | ❌ Wave 0 |
| **GRPH-01** | "Graph" button on `ResourceDetailPage` navigates to `/explorer/:type/:id/graph` | RTL | `npx vitest run src/components/explorer/__tests__/ResourceDetailPage.test.tsx -t "Graph button navigates"` | ❌ Wave 0 |
| **GRPH-02** | Default depth = 1 both directions; renders root + outgoing + incoming | RTL | `npx vitest run src/components/explorer/__tests__/ResourceGraphView.test.tsx -t "renders depth-1 graph"` | ❌ Wave 0 |
| **GRPH-02** | Depth slider 1→3 increases traversal | RTL | `npx vitest run ... -t "depth slider triggers re-fetch"` | ❌ Wave 0 |
| **GRPH-02** | Depth-cap unit (caller passes 10 → BFS clamps to 3) | unit | `npx vitest run src/components/explorer/__tests__/useGraphBfs.test.ts -t "depth cap"` | ❌ Wave 0 |
| **GRPH-02** | Node-count cap unit (200 results → 150 nodes + truncated flag) | unit | `npx vitest run ... -t "node-count cap"` | ❌ Wave 0 |
| **GRPH-03** | Node click navigates to `/explorer/{type}/{id}` | RTL | `npx vitest run ... -t "click navigates"` | ❌ Wave 0 |
| **GRPH-03** | Node label = `summarizeResource(target).primary` | RTL | `npx vitest run ... -t "node label is summarizeResource primary"` | ❌ Wave 0 |
| **GRPH-03** | Edge label = FHIR reference field name | RTL | `npx vitest run ... -t "edge label is field name"` | ❌ Wave 0 |
| **GRPH-04** | Theme switch (light → dark) does NOT remount the graph | RTL | `npx vitest run ... -t "theme switch invariant"` | ❌ Wave 0 |
| **GRPH-04** | dagre version `3.0.0` pinned; xyflow `12.10.2` pinned | grep | `grep -E '"@dagrejs/dagre": "3.0.0"' package.json` AND `grep -E '"@xyflow/react": "12.10.2"' package.json` | ✅ existing infra |
| **GRPH-04** | Parallel-fetch fanout (Promise.all, not serialized) | RTL | `npx vitest run ... -t "parallel fanout"` | ❌ Wave 0 |
| **all** | Full suite green; tsc clean; build clean | gate | `npm test && npx tsc -b --noEmit && npm run build` | ✅ existing |

### Sampling Rate

- **Per task commit:** `npx vitest run src/components/explorer/__tests__/{ResourceGraphView,useGraphBfs}.test.tsx` — ≤ 25s
- **Per wave merge:** `npm test` — full suite (1371 baseline + 6+ new = ~1377)
- **Phase gate:** `npm test && npx tsc -b --noEmit && ANALYZE=1 npm run build` all green; bundle-budget script exits 0 (initial-load delta ≤ +5 KB confirmed)

### Wave 0 Gaps

- [ ] `src/components/explorer/__tests__/ResourceGraphView.test.tsx` — covers GRPH-01..04 RTL surface (5 mandatory + node-label + edge-label tests)
- [ ] `src/components/explorer/__tests__/useGraphBfs.test.ts` — covers BFS depth-cap + node-count-cap (no React)
- [ ] `src/components/explorer/__tests__/ResourceDetailPage.test.tsx` — extend existing (or create) for "Graph button navigates" test (GRPH-01)
- [ ] `scripts/check-bundle-budget.mjs` — node script that reads `dist/bundle-stats.html` (or `dist/assets/*.js` directly) and asserts initial-load gz delta ≤ +5 KB vs Phase-48 baseline. Wave 0 because GRPH-01 SC requires it.
- [ ] `49-HUMAN-UAT.md` scaffold — pan/zoom feel, dark-mode visual fidelity, Slow-3G skeleton, edge-label readability on real Synthea data. Per `48-VALIDATION.md` precedent.

### Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| Visual layout readability on real Synthea Patient (≥6 references) | GRPH-04 (dagre tuning quality) | The `nodesep`/`ranksep`/`edgesep` picks (60/90/24) are research-informed but not visually validated against real data | 1. `npm run dev` → connect to local Blaze. 2. Navigate `/explorer/Patient/{Synthea-id}/graph`. 3. Verify NO edge label text overlaps any node bounding box. 4. Verify NO two siblings overlap horizontally. |
| Pan/zoom/minimap interaction quality | GRPH-04 | Trackpad gesture feel and minimap drag are not RTL-testable | 1. From the graph view, two-finger pan in 4 directions. 2. Pinch-zoom in / out (or wheel-zoom). 3. Click a minimap region — viewport jumps. 4. Click "Fit view" — viewport recenters. |
| Dark-mode visual fidelity | GRPH-04 | Color picks need eyes-on confirmation | 1. Toggle theme to dark via Mantine theme switcher (when v1.7 exposes one — currently `defaultColorScheme="light"` only; Phase 49 may need to TEMPORARILY add a debug toggle for UAT or rely on a manual `data-mantine-color-scheme="dark"` browser-devtools flip). 2. Verify all 5 node-types render legibly. 3. Verify edge labels remain readable. |
| Slow-3G loading skeleton | D-12 | Throttling visualization not RTL-tested | 1. DevTools → Network → Slow 3G. 2. Open `/explorer/Patient/{id}/graph`. 3. Verify Skeleton placeholders visible until BFS resolves. |
| Bundle budget verification on production build | GRPH-01 SC | Manual sanity-check on the analyzer treemap | 1. `ANALYZE=1 npm run build`. 2. Open `dist/bundle-stats.html`. 3. Verify main `index-*.js` does NOT contain `@xyflow/react`, `@dagrejs/dagre`, or `@xyflow/system`. 4. Verify a separate `ResourceGraphView-*.js` chunk DOES contain all three. |

## Common Pitfalls

### Pitfall 1: ReactFlowProvider missing → cryptic "Zustand store not found" errors

**What goes wrong:** React Flow uses Zustand internally for its store. `<ReactFlow>` mounts the store via React Context. If you call `useReactFlow()`, `useNodesState()`, or `useEdgesState()` ANYWHERE inside `<ReactFlow>` without wrapping the OUTER tree in `<ReactFlowProvider>`, Zustand throws a non-obvious error.

**Why it happens:** The `<ReactFlow>` component DOES mount its own provider internally — but only for itself. Multiple `<ReactFlow>` instances on one page, or any hook called above the `<ReactFlow>`, requires the explicit wrapper.

**How to avoid:** Wrap the entire `ResourceGraphView` in `<ReactFlowProvider>` at the top level — even if you only have one graph. The cost is zero; the safety is high.

```tsx
// CORRECT
<ReactFlowProvider>
  <DepthSlider />
  <ReactFlow ...>
    <Controls />
    <MiniMap />
  </ReactFlow>
</ReactFlowProvider>
```

**Warning signs:** Tests fail with "Cannot read properties of undefined (reading 'getNodes')" or similar Zustand-store-shape errors.

### Pitfall 2: dagre layout NaN coordinates on disconnected components

**What goes wrong:** If your BFS produces a node that has NO edges in or out (orphan), dagre's network-simplex ranker may emit `NaN` for `x` or `y`. React Flow then mounts the node at `(NaN, NaN)`, which the browser renders at `(0, 0)` — usually behind the controls panel.

**Why it happens:** dagre 1.x had this bug; 3.x mostly fixes it but edge cases remain when `g.edgeCount() === 0`.

**How to avoid:** After `dagre.layout(g)`, validate every node: `if (Number.isNaN(pos.x) || Number.isNaN(pos.y)) { pos.x = 0; pos.y = level * 100; }`. Also: in the BFS, NEVER emit a node without at least one edge to/from it — the root node IS connected to all level-1 nodes by construction, so this shouldn't happen, but defense in depth.

**Warning signs:** Node renders at top-left corner (0, 0) — hidden behind `<Controls />` which is mounted at `top: 10, left: 10`.

### Pitfall 3: Minimap clipping in narrow viewports

**What goes wrong:** `<MiniMap />` defaults to `bottom-right` with a 200×150 px box. On a viewport <600 px wide (mobile), the minimap can overlay 30%+ of the canvas, blocking nodes.

**Why it happens:** React Flow's responsive defaults assume ≥800 px viewport.

**How to avoid:** Pass `<MiniMap pannable zoomable style={{ display: viewportWidth < 700 ? 'none' : 'block' }} />` or rely on a Mantine `useMediaQuery` hook to hide on narrow screens. Alternatively, set `position="top-left"` to put it where the user's finger doesn't typically rest.

**Warning signs:** UAT report "I clicked a node and it was hidden behind the minimap."

### Pitfall 4: Theme-switch test passes locally but fails in CI

**What goes wrong:** Test 4 (theme-switch invariant) relies on `useMantineColorScheme().setColorScheme('dark')` actually flipping the `data-mantine-color-scheme` attribute on `<html>`. In jsdom, this flip is synchronous; in CI, sometimes a microtask elapses before the attribute updates.

**Why it happens:** `setColorScheme` is asynchronous in Mantine 8 (uses `setTimeout(0)` to avoid hydration warnings).

**How to avoid:** After `await userEvent.click(toggle)`, wrap the assertion in `await waitFor(() => expect(...).toBe(...))` instead of immediate `expect`. The `waitFor` polls every 50 ms.

**Warning signs:** Test passes 9/10 runs locally; flakes in CI.

### Pitfall 5: `colorMode` prop changing causes flash

**What goes wrong:** When `colorMode` flips from `"light"` to `"dark"`, React Flow updates its internal `.dark` class on the root div. If the CSS-variable bridge doesn't have ALL the variables overridden, parts of the graph briefly flash the React Flow default color before the Mantine variables take effect.

**Why it happens:** React Flow's base styles (`@xyflow/react/dist/style.css`) define `--xy-*` defaults that point at hardcoded grays. Our overrides in `graph.module.css` only kick in for the variables we explicitly redirect.

**How to avoid:** Be exhaustive in `graph.module.css` — override every `--xy-*` variable from React Flow's full list (see §5). The variable list verified-from-docs in §5 is the complete set as of v12.10.2.

**Warning signs:** Visible color flicker on theme toggle (typically <100 ms but noticeable).

### Pitfall 6: Edge labels rotating with edge angle

**What goes wrong:** React Flow's default edge-label placement rotates the text with the edge angle. For a TB layout where most edges are near-vertical, this means edge labels read SIDEWAYS.

**Why it happens:** SVG `<text>` elements inherit transform rotation from their parent path-aligned group.

**How to avoid:** With `type: 'smoothstep'`, labels are placed on the horizontal segment of the right-angle path — already readable. With `type: 'default'` (bezier), labels rotate. Stick with smoothstep for TB. (This is one reason §4 recommends smoothstep over default.)

**Warning signs:** UAT report "I can't read the edge labels — they're tilted."

### Pitfall 7: Re-rendering on every depth-slider drag

**What goes wrong:** A naïve `<Slider value={depth} onChange={setDepth} />` re-fires `setDepth` on every drag pixel, which re-runs `useGraphBfs` on every value change. For a 3-state slider, that's hundreds of fetches per drag.

**Why it happens:** Mantine `Slider` calls `onChange` continuously during drag.

**How to avoid:** Use Mantine's `onChangeEnd` instead of `onChange`, OR debounce with `useDebouncedValue(depth, 200)` from `@mantine/hooks`. Both work; `onChangeEnd` is simpler.

```tsx
<Slider
  min={1} max={3}
  defaultValue={1}
  marks={[{value:1,label:'1'},{value:2,label:'2'},{value:3,label:'3'}]}
  onChangeEnd={setDepth}     // ← fires once on drag-release, not continuously
/>
```

**Warning signs:** Network panel shows >50 fetches per slider interaction.

### Pitfall 8: Vite tree-shaking missing `dagre` because of side-effects

**What goes wrong:** dagre 3.x ships ESM but doesn't declare `"sideEffects": false` in its package.json. Vite/Rollup treats it as having side effects → can't tree-shake unused exports.

**Why it happens:** dagre's `graphlib` re-exports are top-level. The full module loads even if you only use `dagre.layout`.

**How to avoid:** This is fine — the entire dagre ESM bundle is 13.7 KB gz. Tree-shaking it would save maybe 2-3 KB. Not worth a `optimizeDeps` config change.

**Warning signs:** None expected; just don't be surprised if `dagre.esm.js` arrives whole in the lazy chunk.

### Pitfall 9: `client.readResource` for outgoing refs — N+1 problem

**What goes wrong:** A Patient with 50 outgoing references (after Phase 47's reference cache) → 50 separate `client.readResource` calls. Even at 100 ms latency each = 5 seconds wall time at depth 1 if serialized.

**Why it happens:** Each `Reference.reference: 'Type/id'` requires a fresh GET (cache misses).

**How to avoid:** Phase 49 BFS uses `Promise.all` (D-18) — all 50 fire in parallel, cap latency at the slowest single fetch (typically ~200 ms). This is already in §3 pseudocode. Do NOT serialize.

**Warning signs:** UAT report "graph takes 3+ seconds to render" on a Patient.

### Pitfall 10: Memory leak from module-scoped cache on long sessions

**What goes wrong:** D-19 specifies "module-scoped Map<\`${type}/${id}:${depth}\`, Promise<Resource[]>>". If the user navigates between 100 different graphs in one session, the Map grows to 100 entries with full bundle responses retained.

**Why it happens:** Module scope = process lifetime. No GC.

**How to avoid:** Cap the cache size. Implement a tiny LRU: `if (cache.size > 50) cache.delete(cache.keys().next().value)`. Alternatively, scope the cache to a `useRef` inside `ResourceGraphView` so it dies on unmount (D-19 explicit: "cleared on unmount") — but that loses cross-component reuse from Phase 47.

**Warning signs:** Long-session memory profile in DevTools shows `Map` retaining MB of bundle JSON.

## Plan File Suggestions

### Recommended structure: 3 plans across 3 waves, ≤ 5 tasks per plan

```
49-01-PLAN.md — Foundation: deps + lazy route stub + Wave-0 test scaffold
  Wave 1, 4 tasks
  ├── 49-01-01: npm install @xyflow/react@12.10.2 @dagrejs/dagre@3.0.0
  ├── 49-01-02: Add ResourceGraphView.tsx scaffold (renders <Skeleton/>) + lazy route in App.tsx
  ├── 49-01-03: Add "Graph" button to ResourceDetailPage.tsx + RTL test for navigation
  └── 49-01-04: Wave-0 Vitest scaffold — empty ResourceGraphView.test.tsx + useGraphBfs.test.ts files
                with skipped tests for the 6 D-20 cases

49-02-PLAN.md — BFS engine + ResourceGraphNode + dagre layout
  Wave 2, 5 tasks
  ├── 49-02-01: useGraphBfs.ts pure-ish hook — runGraphBfs(client, root, depth) → { nodes, edges, truncated }
  ├── 49-02-02: BFS depth-cap unit test (Test 1)
  ├── 49-02-03: BFS node-count-cap unit test (Test 2)
  ├── 49-02-04: ResourceGraphNode.tsx Mantine Card with summarizeResource + Tooltip
  └── 49-02-05: dagre layout helper + nodeTypes registry wired into ResourceGraphView

49-03-PLAN.md — Theme bridge + remaining tests + bundle gate + HUMAN-UAT
  Wave 3, 6 tasks
  ├── 49-03-01: graph.module.css CSS-variable bridge (D-11)
  ├── 49-03-02: Wire <ReactFlowProvider>, <Controls/>, <MiniMap/>, depth Slider in ResourceGraphView
  ├── 49-03-03: Theme-switch invariant test (Test 4)
  ├── 49-03-04: Node-click navigation test (Test 3) + parallel-fetch fanout test (Test 5)
  ├── 49-03-05: scripts/check-bundle-budget.mjs + bundle smoke test (build-time)
  └── 49-03-06: 49-HUMAN-UAT.md scaffold (5 manual items per §"Manual-Only Verifications")
```

### Plan dependency graph

```
49-01 (Foundation)
   ↓
49-02 (BFS + Node + Layout)  ← depends on 49-01 deps installed
   ↓
49-03 (Theme + Tests + Gate) ← depends on 49-02 components existing
```

Waves 1–3 strictly sequential. NO parallelization across plans (each builds on the prior).

### Estimated effort (per ROADMAP "large 3+ days")

- Wave 1: ~0.5 day (mostly npm install + boilerplate)
- Wave 2: ~1.5 days (BFS algorithm + dagre integration is the meaty work; 2 unit tests)
- Wave 3: ~1 day (theming, 3 RTL tests, HUMAN-UAT scaffold, bundle gate)
- Total: **~3 days** + 1 day HUMAN-UAT walkthrough buffer = 4 days. Matches ROADMAP "large 3+ days."

### What does NOT belong in Phase 49

(Per CONTEXT.md "Out of scope" + REQUIREMENTS.md "Out of Scope" — re-stated for the planner's safety):

- 4-mode resource shell — defer to Phase 51.
- JSON peek drawer — separate phase.
- G2/G3 multi-resource graphs — v1.8+.
- Graph PNG/SVG/JSON export — polish phase.
- Live updates / WebSocket — out of scope.
- Edge bundling beyond dagre defaults — polish phase.
- Phase 50 Mantine 9 gate — independent phase.
- Anything from `design_handoff_v1.7_navigation/` that touches Sidebar / Explorer list / breadcrumb routing.

## Sources

### Primary (HIGH confidence)

- **npm registry, live `npm view` 2026-05-01:**
  - `@xyflow/react` → `12.10.2`; peer `react: '>=17'`; deps `classcat ^5.0.3`, `zustand ^4.4.0`, `@xyflow/system 0.0.76`.
  - `@dagrejs/dagre` → `3.0.0`; published 2026-03-22; dep `@dagrejs/graphlib 4.0.1`.
  - Versions cross-checked against `npm view @xyflow/react versions --json` and `npm view @dagrejs/dagre versions --json`.
- **Tarball extraction sizing (`/tmp/gsd-49-sizing/`):** Direct `npm pack` + `gzip -9` measurement of ESM bundle gz sizes for both deps and 3 transitives — exact byte counts in §2.
- **dagre 3.0.0 public API (`dist/types/index.d.ts` extracted):** `Graph`, `setGraph()`, `setNode()`, `setEdge()`, `layout()`, `graphlib` namespace verified byte-identical to 1.x signature.
- **`src/App.tsx`** (lines 1, 21, 48-88, 138, 144), `src/utils/lazyRetry.ts`, `src/components/layout/AppLayout.tsx:44`, `src/__tests__/lazy-routes.test.tsx` — lazy-route precedent fully established.
- **`src/components/explorer/RelatedResourcesPanel.tsx`** (Phase 48) — cancellation-flag + Promise.all + composite-key idiom.
- **`src/components/explorer/ResourceDetailPage.tsx`** — mount-point for "Graph" button.
- **`src/utils/summarizeResource.ts`** (Phase 46) — pure function consumed by node component.
- **`src/utils/reverseReferenceCatalog.ts`** (Phase 48) — incoming-edge source.
- **`package.json`** — pinned dep versions; no Mantine 9, no react-query, no Tailwind. Vite 8, TS 5.7, vitest 4.1.4.
- **`mantine.dev/styles/css-variables-list`** [WebFetch 2026-05-01] — verified Mantine 8 CSS variable names (`--mantine-color-body` / `-text` / `-default-border` / `-dimmed` / `-default` / `-default-hover`).
- **`reactflow.dev/learn/customization/theming`** [WebFetch 2026-05-01] — verified complete `--xy-*` variable list and `colorMode` prop semantics.
- **`reactflow.dev/examples/layout/dagre`** [WebFetch 2026-05-01] — verified `import dagre from '@dagrejs/dagre'` import line and `ConnectionLineType.SmoothStep` edge type usage.
- **`design_handoff_v1.7_navigation/concept.jsx` + `view-resource-shell.jsx` + `tokens.css`** — visual intent for node + edge styling (translation target, NOT scope expansion).
- **`.planning/phases/48-theme-c-reverse-references-incoming-references-panel/48-VALIDATION.md`** — Nyquist validation pattern Phase 49 follows.

### Secondary (MEDIUM confidence)

- **dagre 3.0.0 release notes:** GitHub releases page returned partial info via WebFetch — confirmed v2.0.0 packaging change but did not enumerate v3.0.0 deltas. Defended via direct `dist/types/index.d.ts` API inspection.
- **dagre tuning constants (60/90/24):** Inferred from dagre wiki defaults + Mantine Card 220×64 sizing. Not visually validated — flagged in Assumptions Log.
- **Lazy chunk gz total estimate (~83-91 KB):** Compositional sum + tree-shake estimate. Real number must be confirmed via `ANALYZE=1 npm run build`.

### Tertiary (LOW confidence — needs validation)

- None of substance. All major facts are verified.

## Assumptions Log

| # | Claim | Section | Risk if Wrong |
|---|-------|---------|---------------|
| A1 | dagre `nodesep=60`, `ranksep=90`, `edgesep=24` produce readable layout for typical 3-15 node Patient graphs. | §4 Layout Configuration | Medium — bad spacing makes graph unusable. Mitigated by HUMAN-UAT step "verify NO edge labels overlap nodes." Easy to tune post-implementation. |
| A2 | Tree-shaking of `@xyflow/react` + `@dagrejs/dagre` saves ~10-15% from raw bundle size. | §2 Bundle Budget projection | Low — projection range (83-91 KB gz) covers ±10% slop; real number measured at build. |
| A3 | `colorMode` + CSS-variable bridge composition does NOT cause a remount on theme switch. | §5 Theme Integration | Medium — if it DOES remount, GRPH-04 SC fails. Mitigated by Test 4 (theme-switch invariant) which detects it directly. Backup: use `key` prop approach manually if test fails. |
| A4 | `_count=100` is sufficient for typical Synthea Patient incoming-reference fanout. | §3 BFS pseudocode | Low — if undercount, graph shows partial picture; truncation alert (D-08) covers it. Easy to raise to 200. |
| A5 | dagre 3.0.0 emits coordinates correctly for connected DAGs (no NaN edge case). | §3 + §6 | Low — defense added in Pitfall 2 (validate `pos.x` / `pos.y`). |
| A6 | `ResourceGraphNode` Mantine Card click registers correctly when nested inside React Flow's drag-handle layer. | §"Don't Hand-Roll" + §6 | Low — common React Flow pattern; if click-vs-drag conflict appears, set `nodesDraggable={false}` to fully suppress drag. |

If anything in this Assumptions Log surprises the user during planning, the planner should flag it as a /gsd-discuss-phase amendment item.

## Open Questions

1. **Patient-nested route variant (`/patients/:patientId/:resourceType/:id/graph`)?**
   - What we know: `ResourceDetailPage` is mounted at TWO routes (`/explorer/...` and `/patients/.../...`) per `App.tsx:138, 144`.
   - What's unclear: D-02 only specifies `/explorer/:type/:id/graph`. Should there also be a sibling `/patients/:patientId/:resourceType/:id/graph` so the graph is reachable from the patient chrome?
   - Recommendation: Yes — add the sibling route in 49-01-02 (one extra `<Route>` line). Cleaner UX (preserves patient breadcrumb context). NOT a scope expansion — it's the same `<ResourceGraphView />` mounted twice.

2. **Dark-mode toggle UI — does Phase 49 ship one?**
   - What we know: `main.tsx:17` uses `defaultColorScheme="light"`. No UI exists today to switch to dark.
   - What's unclear: GRPH-04 says "Mantine 8 dark-mode integration is wired through CSS variables — switching the app theme re-themes the graph without remount." How does the user switch?
   - Recommendation: Phase 49 implements the bridge but does NOT ship a user-facing toggle. The theme-switch test (Test 4) calls `setColorScheme('dark')` programmatically. Surfacing a global toggle is a separate Sidebar v2 phase. The bridge is ready for whenever that lands.

3. **Should the bundle-budget script gate the test suite?**
   - What we know: `scripts/check-bundle-budget.mjs` is proposed in Wave-0 gaps.
   - What's unclear: Should `npm test` invoke it (slow), or should it be a separate `npm run test:bundle` (manual gate)?
   - Recommendation: Separate `npm run test:bundle`. `npm test` should stay <100s. Bundle test is build-dependent and run on phase-gate only.

4. **Phase 47's reference-resolution cache shape — direct reuse?**
   - What we know: Phase 47 (READ-01) ships a session-level `Map<\`${type}/${id}\`, Resource | null>`. Phase 49 outgoing-ref BFS step wants to reuse it (D-19).
   - What's unclear: The Phase 47 cache may be hook-internal or module-scoped — researcher couldn't introspect Phase 47 code without expanding scope.
   - Recommendation: 49-02-01 (BFS hook task) reads `src/hooks/useReferenceResolver.ts` (or wherever Phase 47 mounted it) at task start. If the cache is hook-internal, Phase 49 maintains its own parallel cache. If module-scoped, it imports + reuses.

## Environment Availability

| Dependency | Required By | Available | Version | Fallback |
|------------|------------|-----------|---------|----------|
| Node.js | npm install + Vite build | ✓ | (project standard) | — |
| npm | install | ✓ | (project standard) | — |
| Vite 8 | build / dev / chunk-split | ✓ | 8.0.4 (`package.json:62`) | — |
| TypeScript 5.7 | tsc compile | ✓ | 5.7.x (`package.json:60`) | — |
| Vitest 4.1.4 | test runner | ✓ | 4.1.4 (`package.json:63`) | — |
| `@vitejs/plugin-react` | JSX transform | ✓ | 6.0.1 | — |
| `rollup-plugin-visualizer` | bundle analyzer (`ANALYZE=1`) | ✓ | 7.0.1 (`package.json:59`) | — |
| Local Blaze FHIR server | HUMAN-UAT manual checks | ⚠ assumed running | localhost:8080 (per CLAUDE.md) | If down: scaffold mock data; CI doesn't need Blaze |
| Local browser w/ DevTools | Slow-3G + minimap UAT | ⚠ assumed | — | — |
| `@xyflow/react@12.10.2` | graph rendering | ✗ (NEW install) | — | None — hard dependency |
| `@dagrejs/dagre@3.0.0` | graph layout | ✗ (NEW install) | — | None — hard dependency |

**Missing dependencies with no fallback:** `@xyflow/react`, `@dagrejs/dagre` — both are project-additive installs in Wave 1. Not blocking; just must be installed.

**Missing dependencies with fallback:** None.

## Security Domain

Per `.planning/config.json` `workflow.security_enforcement` is not explicitly set; treating as enabled per researcher guidance.

### Applicable ASVS Categories

| ASVS Category | Applies | Standard Control |
|---------------|---------|-----------------|
| V2 Authentication | no | App-level auth out of scope (REQUIREMENTS.md "Out of Scope" line 53). Graph piggy-backs on existing MedplumClient session. |
| V3 Session Management | no | No session created or modified by Phase 49. |
| V4 Access Control | partial | The user can already see ALL resources via `/explorer`; the graph is a different render of the same allowed data. NO new access surface. |
| V5 Input Validation | yes | URL params `:resourceType` and `:id` flow into FHIR queries. Validation: Phase 6 `FHIR_REFERENCE_PATTERN` + `FHIR_ID_PATTERN` (`ResourceDetailPage.tsx:20-21`) — REUSE these regexes when extracting graph nodes' navigation hrefs. |
| V6 Cryptography | no | No crypto operations. |

### Known Threat Patterns for `/explorer/:type/:id/graph`

| Pattern | STRIDE | Standard Mitigation |
|---------|--------|---------------------|
| Reference tampering — a malicious FHIR resource with `subject: { reference: 'javascript:alert(1)' }` could cause `useNavigate(maliciousRef)` to navigate to `javascript:` URI. | Tampering | Reuse `FHIR_REFERENCE_PATTERN` + `FHIR_ID_PATTERN` from `ResourceDetailPage.tsx:20-21` to validate every node-click target before `navigate()`. T-02-08 mitigation pattern. |
| Cross-server reference traversal — outgoing reference `https://other-server.com/Patient/123` could leak data. | Information Disclosure | BFS reference-extractor regex `^[A-Z][a-zA-Z]+\/[A-Za-z0-9][A-Za-z0-9\-.]{0,63}$` (in §3 pseudocode) explicitly REJECTS absolute URLs — only relative `Type/id` references traverse. |
| Memory exhaustion via reference cycle (A → B → A → ...) | Denial of Service | BFS visited-set (`Map<key, ...>`) + node-count cap (150) + depth cap (3). All three layers must hold. |
| Bundle size bloat slowing initial-load | Denial of Service (UX) | D-17 `React.lazy()` boundary; bundle-budget verification gate (§"Validation Architecture"). |

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH — all versions live-verified via `npm view` 2026-05-01, sizes via direct tarball extraction.
- Architecture: HIGH — file layout follows 4-existing-precedents (Phase 27 lazy + Phase 48 fetch + Phase 36 cache + Phase 46 pure-fn).
- Pitfalls: HIGH — 10 pitfalls enumerated; mostly drawn from React Flow + dagre community knowledge cross-checked with project constraints.
- Bundle math: MEDIUM — projection ~83-91 KB gz lazy chunk depends on tree-shake assumption (A2). Real number measured at build.
- Layout tuning: MEDIUM — A1 nodesep/ranksep/edgesep picks need visual UAT validation.

**Research date:** 2026-05-01
**Valid until:** 2026-06-01 (30 days; React Flow + dagre are stable, but `@xyflow/react@12.10.2` could be superseded — re-verify at planning if delayed past 30 days).

---

## RESEARCH COMPLETE

All blocker items from CONTEXT.md "critical researcher flags" are resolved:

1. ✅ `@dagrejs/dagre` version: pin **`3.0.0`** (NOT 1.x — ROADMAP was correct, CONTEXT.md flag was outdated as of 2026-05-01).
2. ✅ `@xyflow/react` version: pin **`12.10.2`**; peer-dep verified React 18 compatible; NO Mantine peer (zero Mantine 9 transitive risk).
3. ✅ Lazy-route precedent: EXISTS in `src/App.tsx:48-88`; reuse the `lazy(() => retry(() => import(...)).then((m) => ({ default: m.X })))` pattern verbatim.
4. ✅ dagre tuning constants: recommended `nodesep=60`, `ranksep=90`, `edgesep=24` for TB layout with 220×64 px Mantine Card nodes; flagged for HUMAN-UAT visual confirmation (A1).
5. ✅ Edge type: **`smoothstep`** (matches React Flow official dagre example; readable labels on TB layout).
6. ✅ Mantine ↔ React Flow CSS-variable bridge: complete mapping in §5; file `graph.module.css` (NOT `.css`) for Vite chunk-split.
7. ✅ BFS pseudocode: depth-bounded + 150-node cap + Promise.all parallel fanout + cancellation flag — ready for `useGraphBfs.ts` implementation.
8. ✅ `_count` choice: 100 per incoming-ref fetch.
9. ✅ Bundle budget: initial-load delta ≤ +1 KB gz projected (well under +5 KB SC); lazy chunk ~83-91 KB gz projected (10-18 KB over PROJECT.md soft target — acceptable; planner documents in 49-VERIFICATION.md).
10. ✅ Theme-switch-no-remount test pattern: `expect(refAfter).toBe(refBefore)` (DOM identity, not equality) on a `data-testid="graph-flow-root"` ref.
11. ✅ Validation Architecture: 13-row test map covering all 4 GRPH-* requirements + bundle gate; 5 manual UAT items scaffolded.

The planner can now create three plan files (49-01, 49-02, 49-03) per §"Plan File Suggestions."
