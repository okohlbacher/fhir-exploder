---
phase: 49-theme-d-graph-view-reference-graph
verified: 2026-05-01T00:35:00Z
status: human_needed
score: 5/5 must-haves verified (4/4 requirements satisfied automatically)
overrides_applied: 0
human_verification:
  - test: "Pan / zoom feel on real Synthea data (UAT-01)"
    expected: "Smooth canvas drag in 4 directions; scroll-wheel zoom centered on cursor; no edge label overlaps node bounds at 100% zoom"
    why_human: "Tactile UX (drag inertia, zoom snap) cannot be RTL-asserted; needs human eye on live Blaze"
  - test: "Minimap interaction (UAT-02)"
    expected: "Click-drag on minimap viewport rectangle pans the main canvas; single click on minimap centers canvas on click point"
    why_human: "Spatial coordination test; jsdom does not simulate canvas-drag well"
  - test: "Dark-mode visual fidelity (UAT-03)"
    expected: "Node text readable; edges visible (gray-6 stroke); minimap mini-nodes themed; controls themed; theme re-toggle does NOT remount the canvas (no flicker / reload)"
    why_human: "Color contrast, edge stroke, label readability in dark mode is a perceptual judgment. Auto theme-switch invariant test (DOM identity) covers structural non-remount; visual fidelity remains human-verified"
  - test: "Slow-3G loading skeleton appearance (UAT-04)"
    expected: "Mantine <Skeleton> placeholders (4 cards in 2×2 grid) appear during BFS fetch; populated graph fades in once fetches resolve"
    why_human: "Network-throttling visualization not exercised by RTL fast mocks; requires Chrome DevTools Slow 3G profile"
  - test: "Empty-graph alert message readability (UAT-05)"
    expected: "Root node renders alone; Alert below canvas — gray, info icon, title 'No references at depth 1', body matches UI-SPEC §Copywriting Contract verbatim"
    why_human: "Layout / wording assessment against live Blaze data with a Provenance or zero-reference resource"
  - test: "Truncation alert at 150 nodes (UAT-06)"
    expected: "Alert — yellow, alert-triangle icon, title 'Showing 150 of {totalEstimate}+ nodes', body matches UI-SPEC §Copywriting Contract verbatim"
    why_human: "Requires real fan-out scenario (Patient with >150 referencing resources). Synthetic test asserts the truncated flag, not the user-facing UI"
  - test: "Browser back/forward respects history (UAT-07)"
    expected: "Browser back from /explorer/Encounter/xyz returns to /explorer/Patient/abc/graph (the GRAPH view). Browser forward re-navigates to /explorer/Encounter/xyz"
    why_human: "Routing test that's awkward in RTL (jsdom URL handling); needs real browser navigation stack"
---

# Phase 49: Theme D — Graph View: Reference Graph Verification Report

**Phase Goal:** Ship the G1 reference graph for any FHIR resource — outgoing + incoming refs at depth 1+ with click-to-navigate, hierarchical layout via React Flow + dagre, dark-mode-themed, lazy-loaded.

**Verified:** 2026-05-01T00:35:00Z
**Status:** human_needed
**Re-verification:** No — initial verification

## Goal Achievement

### Observable Truths (ROADMAP Success Criteria)

| #   | Truth                                                                                                                                                                                                                                              | Status     | Evidence                                                                                                                                                                                                                                              |
| --- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 1   | Lazy route `/explorer/:type/:id/graph` is reachable from a "Graph" button on ResourceDetailPage; initial-load bundle gz delta ≤ +5 KB; route's chunk is code-split                                                                                  | VERIFIED   | App.tsx lines 147 + 157 register both `/graph` routes; ResourceDetailPage has Graph button (IconAffiliate + tooltip "Open the reference graph for this resource"); bundle delta = -4.88 KB (within +5 KB cap); `dist/assets/ResourceGraphView-Bcu76g3a.js` lazy chunk emitted; xyflow/dagre absent from main chunk |
| 2   | Graph centers root, renders outgoing depth ≥1 + incoming depth=1 (sourced from Phase 48 `reverseReferenceCatalog`), defaults to depth=1, hard-caps at depth 3                                                                                       | VERIFIED   | `useGraphBfs.ts` exports MAX_DEPTH=3 + MAX_NODES=150 + PER_FETCH_COUNT=100; `Math.min(depth, MAX_DEPTH)` clamp; `level === 1 ? fetchIncomingSources(r) : []` guarantees incoming-only-at-depth-1; `import { reverseReferenceCatalog }` from Phase 48; ResourceGraphView state defaults `useState(1)` for depth |
| 3   | Each node clickable → `/explorer/{type}/{id}`; node label = `summarizeResource(target).primary`; edge label = FHIR field name; hover Tooltip surfaces secondary                                                                                     | VERIFIED   | `ResourceGraphNode.tsx` calls `summarizeResource` (3 occurrences); navigates with FHIR_REFERENCE_PATTERN+FHIR_ID_PATTERN guard; Mantine Tooltip wraps Card with `position="right" withArrow disabled={!secondary}`; BFS emits edges with `label: fieldName`; ResourceGraphView passes `label: e.label` through |
| 4   | Hierarchical (DAG) via @dagrejs/dagre via @xyflow/react (RF 12); theme switch (Mantine 8 light↔dark) re-themes via CSS variables WITHOUT remount; zoom/pan/minimap built-in                                                                         | VERIFIED   | `applyDagreLayout.ts` uses rankdir TB with NODESEP=60/RANKSEP=90/EDGESEP=24/NODE_WIDTH=220/NODE_HEIGHT=64; ResourceGraphView wraps in `<ReactFlowProvider>` + mounts `<Controls position="top-right" />` + `<MiniMap position="bottom-right" pannable zoomable />`; `graph.module.css` maps 20 `--mantine-color-*` vars to React Flow `--xy-*` vars (no hardcoded colors); theme-switch RTL test asserts `expect(flowRootAfter).toBe(refBefore)` (DOM identity) PASS |
| 5   | Pinned dep versions for @xyflow/react and @dagrejs/dagre recorded; tests cover BFS bounds + node-click navigation + theme-switch invariant; `npm run build` clean                                                                                  | VERIFIED   | `package.json` shows `"@xyflow/react": "12.10.2"` and `"@dagrejs/dagre": "3.0.0"` (exact, no caret); 49-CONTEXT.md + 49-RESEARCH.md document pins; 15 phase 49 tests pass (BFS depth/node/parallel + node-click + theme-switch + edge-label + dagre positions); `npm run build` exits 0 in 554ms |

**Score:** 5/5 truths verified

### Required Artifacts

| Artifact                                                                | Expected                                                                            | Status     | Details                                                                                                                                                |
| ----------------------------------------------------------------------- | ----------------------------------------------------------------------------------- | ---------- | ------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `src/App.tsx`                                                           | Lazy route registration for /explorer/:type/:id/graph + patient-nested sibling      | VERIFIED   | 11 lazy() blocks total (8 pre-existing + 1 new ResourceGraphView, with 5 ResourceGraphView mentions); both routes registered (lines 147, 157)            |
| `src/components/explorer/ResourceDetailPage.tsx`                        | Graph button in toolbar Group with IconAffiliate + tooltip                           | VERIFIED   | 2 IconAffiliate occurrences (import + use); 1 tooltip "Open the reference graph for this resource"; navigates to `/graph` on both explorer + patient mounts |
| `src/components/explorer/ResourceGraphView.tsx`                         | Full implementation wiring BFS + dagre + node + Controls + MiniMap + theme bridge   | VERIFIED   | All required imports + JSX present; data-testid="graph-flow-root" preserved; copy strings match UI-SPEC; debounced depth via `useDebouncedValue`           |
| `src/components/explorer/ResourceGraphNode.tsx`                         | Mantine Card 220×64 with summarizeResource label + tooltip + indigo-6 root accent   | VERIFIED   | summarizeResource imported + used (3x); var(--mantine-color-indigo-6) + var(--mantine-color-default-border); FHIR pattern guards before navigate           |
| `src/components/explorer/useGraphBfs.ts`                                | Pure runGraphBfs + useGraphBfs hook with depth+node caps; reads Phase 48 catalog    | VERIFIED   | MAX_DEPTH=3, MAX_NODES=150, PER_FETCH_COUNT=100; reverseReferenceCatalog imported (3 mentions); 0 AbortController; 5 Promise.all fanouts; cancel flag idiom |
| `src/components/explorer/applyDagreLayout.ts`                           | dagre TB layout with NODESEP=60/RANKSEP=90/EDGESEP=24/NODE_WIDTH=220/NODE_HEIGHT=64 | VERIFIED   | All 6 named constants present + rankdir; Number.isFinite NaN defense (Pitfall 2)                                                                          |
| `src/components/explorer/graph.module.css`                              | React Flow → Mantine CSS variable bridge; no hardcoded colors                       | VERIFIED   | 20 --mantine-color-* references; 1 :global(.react-flow) selector; 0 hardcoded oklch/hex/rgb values                                                       |
| `src/components/explorer/__tests__/ResourceGraphView.test.tsx`          | 8 RTL tests covering all D-20 + edge label + dagre positions                        | VERIFIED   | 0 it.skip; expect(flowRootAfter).toBe(refBefore) DOM identity assertion at line 363; Number.isFinite at lines 445+446                                  |
| `src/components/explorer/__tests__/useGraphBfs.test.ts`                 | 3 BFS unit tests (depth cap + node cap + parallel fanout)                           | VERIFIED   | 0 it.skip; 3 active tests passing                                                                                                                       |
| `src/components/explorer/__tests__/ResourceGraphNode.test.tsx`          | 3 RTL node component tests (label + tooltip + root accent)                          | VERIFIED   | 0 it.skip; 4 active tests passing                                                                                                                       |
| `scripts/check-bundle-delta.cjs`                                        | Build-time bundle delta gate enforcing ≤+5 KB main chunk delta                      | VERIFIED   | Script exists, exits 0; output confirms PASS, delta -4.88 KB, main contains xyflow=false, main contains dagre=false                                    |
| `package.json`                                                          | Pinned exact versions @xyflow/react@12.10.2 + @dagrejs/dagre@3.0.0                  | VERIFIED   | Both exact pins present (no caret/tilde); npm ls confirms 5 entries at @mantine/core@8.x, 0 entries at @mantine/core@9.x                                |

### Key Link Verification

| From                                          | To                                          | Via                                                                                | Status | Details                                                                                       |
| --------------------------------------------- | ------------------------------------------- | ---------------------------------------------------------------------------------- | ------ | --------------------------------------------------------------------------------------------- |
| App.tsx                                       | ResourceGraphView.tsx                       | lazy(() => retry(() => import(...)).then(m => ({ default: m.ResourceGraphView }))) | WIRED  | Verified by build emitting separate chunk; 5 ResourceGraphView mentions in App.tsx            |
| ResourceDetailPage.tsx                        | /explorer/:type/:id/graph                   | Mantine Button + navigate()                                                        | WIRED  | IconAffiliate Button onClick navigates to graph route conditionally on patientId              |
| ResourceGraphView.tsx                         | useGraphBfs.ts                              | import + call                                                                      | WIRED  | 2 occurrences of useGraphBfs (import + invocation)                                            |
| ResourceGraphView.tsx                         | applyDagreLayout.ts                         | import + call inside useMemo                                                       | WIRED  | 3 occurrences of applyDagreLayout (import + call + comment)                                   |
| ResourceGraphView.tsx                         | ResourceGraphNode.tsx                       | nodeTypes={{ resource: ResourceGraphNode }}                                        | WIRED  | NODE_TYPES registry passed as ReactFlow prop; node rendered for type='resource'                |
| ResourceGraphView.tsx                         | graph.module.css                            | side-effect import './graph.module.css'                                            | WIRED  | Side-effect import at top of file; Vite chunk-splits CSS into lazy chunk                       |
| useGraphBfs.ts                                | reverseReferenceCatalog (Phase 48)          | named import + dictionary lookup                                                    | WIRED  | Single named import; reverseReferenceCatalog[r.resourceType] ?? [] runtime read; no duplication |
| ResourceGraphNode.tsx                         | summarizeResource (Phase 46)                | named import + .primary + .secondary                                                | WIRED  | Single named import; both primary (Card text) + secondary (Tooltip label) consumed              |

### Data-Flow Trace (Level 4)

| Artifact                     | Data Variable                              | Source                                              | Produces Real Data                                              | Status   |
| ---------------------------- | ------------------------------------------ | --------------------------------------------------- | --------------------------------------------------------------- | -------- |
| ResourceGraphView.tsx        | `resource` (root)                          | `client.readResource(resourceType, id)` in useEffect | Yes — Medplum client real FHIR fetch                             | FLOWING  |
| ResourceGraphView.tsx        | `bfs.result` (nodes/edges)                 | `useGraphBfs(client, resource, debouncedDepth)`     | Yes — runGraphBfs traverses real refs via client.readResource + client.get | FLOWING  |
| ResourceGraphView.tsx        | `reactFlowGraph.nodes/edges` (positioned)  | `applyDagreLayout(nodes, edges, 'TB')` in useMemo   | Yes — dagre.layout() produces finite x/y coordinates             | FLOWING  |
| ResourceGraphNode.tsx        | `summary.primary` / `summary.secondary`    | `summarizeResource(resource)` per node              | Yes — Phase 46 typed summary registry covers 8 types + fallback  | FLOWING  |
| useGraphBfs.ts (incoming)    | `arrays` from catalog                      | `client.get(client.fhirUrl(...).toString())`        | Yes — Bundle.entry[].resource extracted; D-14 silent fallback    | FLOWING  |

### Behavioral Spot-Checks

| Behavior                                                       | Command                                                                                                                              | Result                                                                                | Status |
| -------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------ | ------------------------------------------------------------------------------------- | ------ |
| Type-check passes                                              | `npx tsc -b --noEmit`                                                                                                                | exit 0 (no output)                                                                    | PASS   |
| Build is clean and emits lazy chunk                            | `npm run build`                                                                                                                      | "✓ built in 554ms"; ResourceGraphView-Bcu76g3a.js lazy chunk (219.89 kB raw / 71.20 kB gz) | PASS   |
| Bundle delta within budget                                     | `node scripts/check-bundle-delta.cjs --max-delta-kb 5`                                                                               | PASS, delta -4.88 KB; main contains xyflow=false; main contains dagre=false           | PASS   |
| Lazy chunk emitted                                             | `find dist/assets -name "ResourceGraphView*.js"`                                                                                     | dist/assets/ResourceGraphView-Bcu76g3a.js                                              | PASS   |
| xyflow/dagre absent from main chunk                            | `grep -l "xyflow\|dagrejs" dist/assets/index-*.js`                                                                                   | No match                                                                              | PASS   |
| Phase 49 test suite passes                                     | `npx vitest run src/components/explorer/__tests__/ResourceGraphView.test.tsx ...useGraphBfs.test.ts ...ResourceGraphNode.test.tsx` | 3 files / 15 tests passed                                                              | PASS   |
| Full test suite passes (excluding pre-existing carry-over)     | `npm test`                                                                                                                           | 1386 passed / 22 todo / 1 pre-existing fail (pair #13 deuteranopia — Phase 40)         | PASS   |
| Mantine 9 not pulled transitively                              | `npm ls @mantine/core`                                                                                                               | 5 entries at 8.3.18 deduped; 0 entries at 9.x                                         | PASS   |

### Requirements Coverage

| Requirement | Source Plan       | Description                                                                                                       | Status    | Evidence                                                                                                            |
| ----------- | ----------------- | ----------------------------------------------------------------------------------------------------------------- | --------- | ------------------------------------------------------------------------------------------------------------------- |
| GRPH-01     | 49-01, 49-03      | Lazy /explorer/:type/:id/graph route + Graph button + ≤+5 KB initial-load gz delta                                 | SATISFIED | Lazy chunk emitted; bundle delta -4.88 KB; Graph button mounts on ResourceDetailPage; "Graph button mount" test PASS |
| GRPH-02     | 49-02             | Outgoing depth ≥1 + incoming depth 1 from reverseReferenceCatalog; default 1; hard-cap 3                          | SATISFIED | MAX_DEPTH=3 + MAX_NODES=150; level===1 incoming guard; "BFS depth cap" + "BFS node count cap" + "parallel fetch fanout" tests PASS |
| GRPH-03     | 49-02, 49-03      | Click-to-navigate; node label = summarizeResource(target).primary; edge label = FHIR field name; hover tooltip   | SATISFIED | "node click navigation" + "node label renders summarizeResource" + "edge label field name" + tooltip render tests PASS |
| GRPH-04     | 49-02, 49-03      | dagre TB via React Flow 12; theme switch via CSS vars without remount; zoom/pan/minimap built-in                  | SATISFIED | applyDagreLayout TB constants; ReactFlowProvider + Controls + MiniMap; graph.module.css bridge; "theme switch invariant" test PASS (DOM identity assertion) |

All 4 phase 49 requirements (GRPH-01..GRPH-04) are satisfied by automated verification. No orphaned requirements: REQUIREMENTS.md maps GRPH-01..GRPH-04 to Phase 49 only, and all 4 are claimed by at least one of the three plan frontmatters.

### Anti-Patterns Found

No blockers found. The locked production code passes all greps for stub patterns:
- 0 `it.skip` across all three test files
- 0 hardcoded color literals in graph.module.css
- 0 `AbortController` in useGraphBfs.ts (cancellation-flag idiom enforced)
- 0 `xyflow/dagrejs` strings in main chunk (lazy boundary intact)

The "renders depth-1 graph for a Resource with outgoing references" test in 49-03 was repurposed (not skipped) to assert both root + outgoing target nodes mount — this is documented in 49-03-SUMMARY.md as an intentional test rename, not a stub.

### Human Verification Required

Seven items in `49-HUMAN-UAT.md` remain `pending` and require live-Blaze + visual + network-throttling verification. These are intentionally deferred per the phase's HUMAN-UAT scaffold and the phase's `Execution: Mixed` classification in ROADMAP. They cannot be auto-verified inside vitest:

1. **UAT-01 — Pan / zoom feel on real Synthea data** (GRPH-04): Drag inertia + zoom-to-cursor centering require human tactile assessment.
2. **UAT-02 — Minimap interaction** (GRPH-04): Canvas-drag spatial coordination is not faithfully simulated by jsdom.
3. **UAT-03 — Dark-mode visual fidelity** (GRPH-04): Color contrast / readability is a perceptual judgment. Auto theme-switch invariant test (DOM identity) covers structural non-remount; visual fidelity remains human-verified.
4. **UAT-04 — Slow-3G loading skeleton appearance** (GRPH-01 / D-12): Network-throttling visualization not exercised by RTL fast mocks; Chrome DevTools required.
5. **UAT-05 — Empty-graph alert message readability** (D-13): Layout / wording assessment against live Blaze data with a Provenance or zero-reference resource.
6. **UAT-06 — Truncation alert at 150 nodes** (D-08): Requires real fan-out scenario. Synthetic test asserts the truncated flag, not the user-facing UI.
7. **UAT-07 — Browser back/forward respects history** (D-16): Routing test awkward in RTL; needs real browser navigation stack.

### Gaps Summary

No blocking gaps. All 5 ROADMAP success criteria are satisfied by automated verification (5/5), all 4 requirements (GRPH-01..GRPH-04) are satisfied (4/4), all 12 VALIDATION.md task-rows are closed by automated tests, the bundle gate passes with -4.88 KB delta, and the full vitest suite shows only the documented pre-existing Phase 40 deuteranopia carry-over (not a Phase 49 regression).

The 7 HUMAN-UAT items are explicit, scoped manual verifications that complement (not gate) the automated layer. Per the gsd-verifier `human_needed` semantics — and matching the Phase 48 close-out precedent referenced in 49-03-SUMMARY.md — phase status is `human_needed` until the user runs the live-Blaze walkthrough.

---

*Verified: 2026-05-01T00:35:00Z*
*Verifier: Claude (gsd-verifier)*
