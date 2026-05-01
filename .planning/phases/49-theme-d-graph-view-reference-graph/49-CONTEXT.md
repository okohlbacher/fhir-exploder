# Phase 49: Theme D — Graph View: Reference Graph - Context

**Gathered:** 2026-05-01
**Status:** Ready for planning
**Mode:** `--auto` (Claude selected the recommended option for every gray area; user can review and amend before / during plan-phase. See DISCUSSION-LOG.md for the auto-decision audit trail.)

<domain>
## Phase Boundary

**In scope (Phase 49):**
- New lazy-loaded route `/explorer/:type/:id/graph` mounts `<ResourceGraphView resource={r}>` (GRPH-01).
- A "Graph" button on `ResourceDetailPage` next to the existing "Raw JSON" / "$everything" actions navigates to that route.
- `<ResourceGraphView>` renders the current resource as a centered root node, fans outgoing references at depth ≥ 1 via the existing reference-resolution code path (Phase 47 reuse), and fans incoming references at depth 1 via the Phase-48 `reverseReferenceCatalog` plus parallel `_summary=count`-style search queries (the catalog provides `{ type, param }`; for graph use we need the actual ID-bearing search, not just counts) (GRPH-02).
- Default depth = 1 in BOTH directions; hard cap = 3 in BOTH directions (defense against accidental BFS explosion on densely connected resources). Depth control surface is a Mantine `Slider` 1–3 with marks (D-04).
- Each node renders `summarizeResource(target).primary` as the visible label (Mantine-themed React component); hover shows a Mantine `Tooltip` with `summarizeResource(target).secondary`. Edge labels show the FHIR reference field name (e.g. `subject`, `encounter`) (GRPH-03).
- Click any node navigates to `/explorer/{type}/{id}` for that target — `useNavigate()` from `react-router-dom`. Single click, no double-click intermediary, no selection state to preserve (D-05).
- Hierarchical layout via `@dagrejs/dagre` ≥ 1.x (NOT ≥ 3.x as the roadmap mistakenly states — current latest is 1.x; the researcher MUST verify exact installed versions and pin in 49-CONTEXT.md after this phase begins) rendered through `@xyflow/react` (React Flow 12.x). Direction `rankdir: 'TB'` (top-down): root resource at top-center, references cascade downward (D-06).
- Mantine 8 dark-mode integration via CSS variables. Theme switch (light ↔ dark) re-themes the graph WITHOUT remounting the component — proven by a test that triggers `useMantineColorScheme().setColorScheme()` and asserts the graph DOM root persists across the switch (GRPH-04).
- Zoom / pan / minimap controls visible and functional (React Flow built-ins via `<Controls />` + `<MiniMap />` components).
- Initial-load bundle gz delta target: ≤ +5 KB. The route is code-split via `React.lazy()`; `@xyflow/react` and `@dagrejs/dagre` land in the lazy chunk only (NOT in the main chunk).
- Tests: BFS depth-cap unit test, node-click navigation RTL test, theme-switch invariant RTL test, parallel-fetch fanout RTL test, hard-cap node-count truncation test (D-08). All must be green; `npx tsc -b --noEmit` exit 0; `npm run build` exit 0.

**Out of scope (deferred to later phases or other workstreams):**
- The **4-mode resource shell** (`Summary | Human | Graph | JSON`) from `design_handoff_v1.7_navigation/README.md` — this is a structural redesign of `ResourceDetailPage`'s tabs/header that subsumes Phase 47 (Human mode), Phase 48 (Referenced By footer), AND Phase 49 (Graph mode) into a single shell. Folding it into Phase 49 would balloon scope by 2–3×. Phase 49 ships the standalone Graph button + route as the ROADMAP success criteria specify; the 4-mode shell becomes its own phase (working name: **Phase 51 — 4-Mode Resource Shell**) AFTER Phase 50 (STACK-01 Mantine 9 gate) closes. This is the locked decision (D-01).
- **JSON peek drawer** (press `J` on any list row, design handoff §"Concrete changes by file") — separate phase, not Phase 49.
- **Sidebar v2 + ⌘K + Expert toggle** (design handoff) — separate phase.
- **G2/G3 multi-resource graphs** (e.g. patient-centered network across all related resources) — explicitly out of v1.7 per ROADMAP; G1 only.
- **Graph export** (PNG / SVG / JSON) — defer to a polish phase if the user requests it after using the v1 surface.
- **Live-update** — graph is rendered once on mount and only re-renders when (a) depth changes, (b) the user navigates to a new root, (c) theme changes (CSS-only, no remount). No polling, no WebSocket, no manual "refresh" button.
- **Edge bundling / clustering / collision-avoidance beyond what dagre provides natively** — reuse dagre's defaults; if real-world data shows the layout is unreadable, treat as a follow-up polish item.

</domain>

<decisions>
## Implementation Decisions

### Mount Point & Routing

- **D-01 (mount approach — standalone button, NOT 4-mode shell):** Phase 49 adds a "Graph" button to `ResourceDetailPage.tsx` next to the existing "Raw JSON" and "$everything" buttons that navigates to `/explorer/:type/:id/graph`. The `4-mode resource shell` redesign in the design handoff is **explicitly deferred** to a follow-up phase (working name "4-Mode Resource Shell"). Locking this in keeps Phase 49 within its 3+ day budget and avoids destabilizing Phase 47 (HumanReadableView) and Phase 48 (IncomingReferencesPanel) which both ship into the current shell. Auto-decision rationale: ROADMAP success criteria #1 explicitly says "Graph button on ResourceDetailPage (positioned next to existing 'Raw JSON' / '$everything' actions)"; the design handoff is acknowledged as a future direction, not a Phase 49 deliverable.
- **D-02 (route path):** `/explorer/:type/:id/graph` — appended to the existing `/explorer/:type/:id` pattern. Lazy-loaded via `React.lazy(() => import('./ResourceGraphView'))` in the router config. Matches GRPH-01 verbatim.
- **D-03 (button placement):** "Graph" button is a Mantine `Button` (variant `light`, leftSection icon — researcher to pick a graph icon from `@tabler/icons-react`, candidates: `IconShare`, `IconHierarchy`, `IconAffiliate`) placed in the same `<Group>` as "Raw JSON" / "$everything" in `ResourceDetailPage.tsx`. The button is visible for ALL resource types (Patient + non-Patient) because every resource has at least outgoing references; the empty-graph state is handled inside `<ResourceGraphView>` rather than at the button level.

### Depth Control & BFS Bounds

- **D-04 (depth control surface — Mantine Slider 1-3):** A Mantine `<Slider>` with `min={1} max={3} marks={[{value:1,label:'1'},{value:2,label:'2'},{value:3,label:'3'}]}` controls graph depth. Default value = 1. Slider changes trigger a re-fetch of the BFS (NOT a remount of the graph). Slider sits in the toolbar above the graph alongside reset-zoom and minimap-toggle controls. Auto-decision rationale: matches design handoff "depth slider 1–3"; slider is more discoverable than +/− buttons or a `Select`; matches existing Quality-page slider idiom.
- **D-04a (depth applies to BOTH directions):** The depth value applies symmetrically to outgoing AND incoming traversal. No split control. Reasoning: simpler UX, matches GRPH-02 default `depth = 1 in both directions`.
- **D-04b (depth hard cap = 3):** BFS code MUST refuse to traverse beyond depth 3 even if a future call site passes a larger value. Defense in depth — protects against densely connected resources causing UI freeze.
- **D-08 (node-count safety cap):** In addition to the depth cap, BFS MUST hard-cap at **150 nodes** (root + all reachable resources within depth bound). When the cap is reached, traversal stops, and the graph renders a Mantine `Alert` below the canvas: "Showing 150 nodes (graph truncated). Reduce depth or navigate to a child resource to explore further." 150 is large enough to not clip realistic clinical data (a Patient with 100+ Observations would already display fine in the existing PatientRelatedResources card view), small enough to render in <500ms. Researcher MUST verify the threshold against Synthea-style test data and may adjust ±50 with rationale in 49-RESEARCH.md.

### Layout & Visual

- **D-06 (dagre layout direction = TB top-down):** `rankdir: 'TB'` puts the root resource at top-center, with outgoing references cascading downward and incoming references rising upward as siblings/parents in the DAG. Auto-decision rationale: top-down is the most familiar reading direction for hierarchical FHIR data (Patient → Encounter → Observation feels natural top-to-bottom). LR (left-right) is acceptable too but is a follow-up polish swap if user feedback prefers it. Researcher to verify dagre's `nodesep`, `ranksep`, `edgesep` defaults produce readable spacing for typical Patient-centered graphs (3-4 outgoing / 5-10 incoming) and tune if needed.
- **D-07 (node component — `<ResourceGraphNode>`, Mantine-themed):** Custom React Flow `nodeTypes` registry with one entry: `resource: ResourceGraphNode`. The component is a Mantine `Card` (`withBorder padding="xs"` to keep the graph dense) containing:
  - Top row: optional `<Text size="xs" c="dimmed">{resource.resourceType}</Text>` (the FHIR ResourceType, lighter than the label)
  - Main text: `<Text size="sm" fw={500}>{summarizeResource(resource).primary}</Text>`
  - The card has `style={{ cursor: 'pointer' }}` and an `onClick` that calls `useNavigate()(\`/explorer/${type}/${id}\`)`.
  - The card is wrapped in a Mantine `<Tooltip label={summarizeResource(resource).secondary} disabled={!secondary}>` so hover shows the secondary line. Tooltips position must not occlude graph edges — use `position="right"` with `withArrow`.
  - The CENTER node (the root resource the user navigated to) gets a distinguishing visual treatment: `withBorder` becomes a thicker border + accent color (Mantine `theme.colors.indigo[6]`). NOT a different shape — keeps dagre layout uniform.
- **D-09 (edge component — default React Flow edge with label):** Use React Flow's default `smoothstep` or `default` edge type with a `label` prop set to the FHIR reference field name (e.g. `subject`, `encounter`, `has-member`). Label is always visible; no hover-only mode. Researcher to verify which edge type renders most readably in dagre TB layout — `smoothstep` typically reads best for hierarchical layouts.
- **D-10 (edge direction):** Outgoing references draw FROM the source node TO the target. Incoming references (from `reverseReferenceCatalog`) draw FROM the source resource TO the current resource — i.e., arrowhead points AT the current resource for incoming. This means the visual arrow direction matches the FHIR semantic ("X references Y" → arrow X→Y).
- **D-11 (theme integration via CSS variables):** Define a `src/components/explorer/graph.css` (or `.module.css`) that maps React Flow's CSS variables to Mantine theme variables:
  ```css
  .react-flow__node {
    background: var(--mantine-color-body);
    color: var(--mantine-color-text);
    border-color: var(--mantine-color-default-border);
  }
  .react-flow__edge-path { stroke: var(--mantine-color-gray-6); }
  /* ... etc */
  ```
  When the user toggles theme via `useMantineColorScheme().setColorScheme('dark')`, Mantine swaps `--mantine-color-*` automatically; the graph re-themes without React re-renders. Test asserts: render graph → switch theme → graph DOM root has same `data-react-flow-id` (or equivalent) — proves no remount.

### Empty / Loading States

- **D-12 (loading state — skeleton then progressive):** While BFS fetches outgoing + incoming references, render a Mantine `Skeleton` placeholder (e.g., 4–6 grey card-shaped boxes in a vertical stack) inside the graph canvas. Once fetches resolve, the dagre layout runs and the populated graph fades in. Avoid a spinner — the skeleton communicates "graph is being built" better than indeterminate progress.
- **D-13 (empty state — single-node + alert):** When BOTH outgoing and incoming reference fetches return zero results, render the root node alone in the canvas plus a Mantine `<Alert>` below the canvas: "No references at depth 1. Try increasing depth via the slider above." This is common for `Provenance` or some `Practitioner` resources.
- **D-14 (error state — silent fallback):** If a single reference fetch fails (e.g., 404 on a stale reference or 500 from Blaze), drop that node from the graph and continue. Aggregate errors logged to console only. NO user-facing error toast — the existing `client.get()` `.catch()` pattern from Phase 48's `RelatedResourcesPanel` (silent count = 0) carries over. If ALL fetches fail, fall through to the empty state (D-13) with a different alert message: "Unable to load references. Check Blaze connection."

### Navigation & Interaction

- **D-05 (single click navigates immediately):** No selection state, no double-click intermediary, no hover-preview. Clicking a node calls `navigate(\`/explorer/${target.resourceType}/${target.id}\`)`. Hover triggers the Mantine Tooltip with `secondary`. This matches the click-to-navigate model of `PatientRelatedResources` and `IncomingReferencesPanel` (Phase 48), keeping muscle memory consistent.
- **D-15 (zoom / pan / minimap visible):** React Flow's `<Controls />` (top-right by default, has zoom in / zoom out / fit-to-view buttons) AND `<MiniMap />` (bottom-right by default) are mounted unconditionally. NOT hidden behind a toggle. Researcher MAY relocate them if dagre TB layout puts the root node directly under the controls (occlusion); standard React Flow positioning prevents this.
- **D-16 (back/forward respects history):** Browser back/forward buttons MUST work — clicking from `/explorer/Patient/abc/graph` to a child node `/explorer/Encounter/xyz` and pressing browser-back should return to `/explorer/Patient/abc/graph` (the graph view), NOT collapse to the resource detail page. This is the default `useNavigate()` behavior; the test should explicitly assert it.

### Performance & Bundle

- **D-17 (bundle target — code-split chunk only):** `<ResourceGraphView>` is `React.lazy()`-imported in the router. `@xyflow/react` and `@dagrejs/dagre` are imported INSIDE `<ResourceGraphView>` (or its child files) — never at the router or `App.tsx` level. Vite's analyzer (or `rollup-plugin-visualizer`) MUST confirm the lazy chunk contains both deps and the main `index.js` chunk does not. Initial-load gz delta ≤ +5 KB target measured against the post-Phase-48 baseline.
- **D-18 (parallel fetch — Promise.all-style fanout):** BFS fetches at each level fire in parallel via `Promise.all` (mirrors the Phase-48 `RelatedResourcesPanel` pattern). Per-fetch cancellation flag (also from Phase 48) prevents stale state from rendering after the user changes depth or navigates away.
- **D-19 (caching — module-scoped LRU map keyed by `${type}/${id}`):** Outgoing-reference fetches reuse the Phase 47 reference-resolution cache (READ-01) when available. Incoming-reference fetches use a new module-scoped `Map<string, Promise<Resource[]>>` keyed by `${type}/${id}:${depth}` to dedupe across depth changes within the same root. Cache lifetime = component mount; cleared on unmount. NOT persisted to `localStorage`.

### Testing

- **D-20 (test inventory — 5 tests minimum):**
  1. **BFS depth-cap test (vitest unit):** Construct a synthetic 10-deep linked-resource chain in mock data, run BFS with `maxDepth=3`, assert exactly 4 nodes returned (root + 3 levels) and node 5+ never queried.
  2. **BFS node-count cap test (vitest unit):** Construct a fan-out scenario where depth-1 alone returns >150 references; assert the BFS stops at 150 and emits the truncation flag.
  3. **Node-click navigation test (RTL):** Mock a 3-node graph, render, click a non-root node, assert `useNavigate()` mock was called with `/explorer/{type}/{id}`.
  4. **Theme-switch invariant test (RTL):** Render graph in light mode, capture root DOM node ref, call `setColorScheme('dark')`, assert the same DOM ref persists (no remount). Optional: assert at least one CSS variable's resolved value differs.
  5. **Parallel-fetch fanout test (RTL):** Mock 5 outgoing refs, render graph at depth 1, assert `client.get()` was called 5 times in parallel (NOT serialized — measure by `Promise.all` ordering or by counting calls before any resolves).
  Researcher MAY add (a) error-recovery test (one fetch rejects, other 4 resolve, graph renders with 4 nodes), (b) lazy-chunk smoke test (build, grep dist for `xyflow` only inside the lazy chunk filename), (c) edge-label rendering test if RTL can interrogate React Flow's DOM.

### Claude's Discretion

- Exact dagre tuning constants (`nodesep`, `ranksep`, `edgesep`) — researcher should pick values that keep typical graphs (3-15 nodes) readable, tune in 49-RESEARCH.md.
- Choice of `@tabler/icons-react` icon for the "Graph" button — pick one of `IconShare`, `IconHierarchy`, `IconAffiliate`, `IconNetwork`. Researcher's call.
- Edge type choice (`smoothstep` vs `default` vs `bezier`) — researcher tests which renders most readably with TB layout and a mix of short and long edge labels.
- Whether the depth slider is positioned inside the React Flow canvas (overlay) or above the canvas in a separate toolbar `<Group>`. Recommend above-canvas to keep canvas focus on the graph itself.
- File organization: single `ResourceGraphView.tsx` vs split into `ResourceGraphView.tsx` + `useGraphBfs.ts` + `ResourceGraphNode.tsx` + `graph.css`. Recommend the split for testability.
- Mantine `Tooltip` placement strategy — `position="right"` is the default recommendation; researcher may switch to `top-end` if right-side tooltips collide with edge labels.

### Folded Todos

None — no pending todos matched Phase 49 scope per a quick check (the gsd-tools `todo match-phase` step would have surfaced any).

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Phase 49 dependencies (Phase 46, 47, 48 deliverables)
- `src/utils/summarizeResource.ts` — Phase 46 NAV-01: `summarizeResource(r) → { primary, secondary? }`. Node labels render `summarizeResource(target).primary`; tooltips render `secondary`. The graph component depends on this directly.
- `src/utils/reverseReferenceCatalog.ts` — Phase 48 REVR-01: 9 source-type catalog `{ type, param }` entries. The BFS uses this catalog (not just `_summary=count`, but actual `_count=large` searches) to fan incoming references at each level.
- `src/components/explorer/RelatedResourcesPanel.tsx` — Phase 48 REVR-02: parallel-fetch + `Promise.all` + cancellation flag pattern. Phase 49 BFS reuses this idiom for graph-edge fanout.
- `src/components/explorer/ResourceDetailPage.tsx` — where the "Graph" button mounts (next to "Raw JSON" / "$everything" actions); also where the lazy-loaded `<ResourceGraphView>` is reachable from.

### Roadmap & requirements
- `.planning/ROADMAP.md` §"Phase 49: Theme D — Graph View: Reference Graph" — 5 success criteria.
- `.planning/REQUIREMENTS.md` §GRPH-01..GRPH-04 — verbatim acceptance criteria.

### Design handoff (informs UI direction; explicitly NOT folded into Phase 49 scope)
- `design_handoff_v1.7_navigation/README.md` — describes the 4-mode resource shell that subsumes Phase 49's Graph button into a "Graph mode" tab. Phase 49 ships the standalone button per ROADMAP; the 4-mode shell becomes a separate phase. The design handoff still informs visual treatment of nodes (Mantine Card with summary text) and the depth-slider UX.
- `design_handoff_v1.7_navigation/view-resource-shell.jsx` — JSX prototype showing the proposed 4-mode shell visual layout (informs node component visuals, NOT the shell structure itself).
- `design_handoff_v1.7_navigation/concept.jsx` — design intent for graph node + edge styling.
- `design_handoff_v1.7_navigation/tokens.css` — IBM Plex Sans/Mono fonts, indigo accent, warm-neutral grays, 4/6/10px radii. The graph CSS variables (D-11) MUST resolve to these tokens via Mantine's theme.

### External libraries (researcher MUST verify versions)
- `@xyflow/react` — React Flow 12.x. Researcher: pin exact version after `npm view @xyflow/react versions` and add to `49-CONTEXT.md` post-research.
- `@dagrejs/dagre` — current latest is 1.x (NOT 3.x as roadmap mistakenly says). Researcher: pin exact version, document the roadmap mismatch in 49-RESEARCH.md, and proceed with 1.x.

### Project guidelines
- `CLAUDE.md` — Mantine 8 / Medplum 5 / React 18 / Vite / TS 5.7 / vitest stack. NEVER add Mantine 9 (peer dep gate). NEVER add `@tanstack/react-query` (MedplumClient handles caching).
- `.planning/PROJECT.md` §"Current Milestone: v1.7 Resource Navigation" — Theme D goals, bundle budget (initial-load delta target 0 KB; graph route lazy ~73 KB gz on visit only).

### Validation reference
- `.planning/phases/48-theme-c-reverse-references-incoming-references-panel/48-VALIDATION.md` — Nyquist validation pattern Phase 49 should follow (BFS bounds + render-correctness + theme-invariant + bundle-budget).

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- `src/utils/summarizeResource.ts` (Phase 46) — pure function, typed switch over 8 R4 resource types. The graph node label component just calls `summarizeResource(resource).primary`. No new label logic needed.
- `src/utils/reverseReferenceCatalog.ts` (Phase 48) — 9 source-type keys, typed `Record<ResourceType, ReverseReferenceEntry[]>`. The BFS reads this directly.
- `src/components/explorer/RelatedResourcesPanel.tsx` (Phase 48) — owns the parallel-fetch + cancellation-flag idiom and the `client.get(client.fhirUrl(...).toString())` URL pattern. Lift this idiom into a `useGraphBfs` hook for the graph component.
- `src/components/explorer/ResourceDetailPage.tsx` — already has the toolbar `<Group>` where the "Graph" button mounts. Phase 48 added the below-Tabs ternary for `<IncomingReferencesPanel>`; Phase 49 adds a button at the top header level, NOT a panel below.
- `client.fhirUrl(...)` from `@medplum/core` — used for all FHIR queries in Phase 48; Phase 49 reuses for graph-edge searches.
- `useNavigate()` from `react-router-dom` — already in use across the app.
- `useMantineColorScheme()` from `@mantine/core` — for theme-switch test setup.

### Established Patterns
- **Module-scoped LRU caching for FHIR fetches:** Phase 36's `extensionProfileCache: Map<string, Promise<...>>` pattern is the project idiom for in-flight Promise sharing. Phase 49's BFS cache (D-19) follows this idiom.
- **Cancellation flag pattern:** `let cancelled = false; ... return () => { cancelled = true; }` from `RelatedResourcesPanel.tsx:33-54`. Phase 49 reuses verbatim.
- **Lazy route registration:** Existing routes are NOT currently lazy-loaded (researcher to confirm). Phase 49 introduces the first `React.lazy()` route in the explorer surface; pattern needs to be established cleanly.
- **CSS variables for theming:** Mantine 8 already exposes `--mantine-color-body`, `--mantine-color-text`, `--mantine-color-default-border`, etc. The graph CSS variable mapping (D-11) wires React Flow's `--xy-*` variables to these.

### Integration Points
- Router config (likely `src/App.tsx` or `src/router.tsx`) — add the lazy route.
- `ResourceDetailPage.tsx` toolbar `<Group>` — add the "Graph" button.
- `package.json` — add `@xyflow/react` + `@dagrejs/dagre` deps. Researcher to verify exact versions; no peer-dep conflict expected (both are React 18 compatible).
- Vite config — confirm code-split is automatic (it is for React.lazy); no manual chunk hints needed.

</code_context>

<specifics>
## Specific Ideas

- The user's design handoff (`design_handoff_v1.7_navigation/`) is the authoritative visual reference for node + edge styling. Translate to Mantine, do NOT copy the JSX verbatim.
- Test infra MUST avoid the deuteranopia carry-over (`Phase 40 #13`) — it's pre-existing, not a regression risk.
- Re-use the existing `npm test` baseline (1371 passing post-Phase-48); Phase 49's tests should land at 1376+ passing.
- The `@dagrejs/dagre` version mismatch (ROADMAP says ≥3.x, npm latest is 1.x) MUST be flagged by the researcher and corrected in 49-RESEARCH.md before planning. Do NOT proceed to plan-phase if this version question is unresolved — it's a hard prerequisite for D-06 layout decisions.

</specifics>

<deferred>
## Deferred Ideas

- **4-Mode Resource Shell** (working name "Phase 51"): the `Summary | Human | Graph | JSON` redesign from `design_handoff_v1.7_navigation/README.md` that subsumes Phases 47/48/49 into one shell. This is the user's documented design intent for v1.7+ but cannot be folded into Phase 49 without doubling its scope and destabilizing the just-shipped Phase 47 + 48 surfaces. Open as a new phase after Phase 50 (STACK-01 Mantine 9 gate) closes.
- **JSON peek drawer** (`J` keypress on Explorer list rows) — design handoff §"SearchResultsPage". Separate phase.
- **Sidebar v2 + ⌘K + Expert toggle** — design handoff. Separate phase.
- **G2/G3 multi-resource graphs** (patient-centered network) — out of v1.7 per ROADMAP.
- **Graph PNG/SVG/JSON export** — polish phase if requested.
- **Live updates / WebSocket / polling** — out of scope; FHIR Exploder is read-only.
- **Edge bundling / advanced layout** — reuse dagre defaults; treat as polish if needed.
- **Saved graph views / bookmarks** — not in v1.7.
- **Path-finding queries ("show me how Patient X is related to Practitioner Y")** — out of v1.7.
- **Reviewed Todos (not folded):** None — no pending todos matched Phase 49 scope.

</deferred>

---

*Phase: 49-theme-d-graph-view-reference-graph*
*Context gathered: 2026-05-01 via auto-mode discuss-phase*
