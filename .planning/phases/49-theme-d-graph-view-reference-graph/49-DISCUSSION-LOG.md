# Phase 49: Theme D — Graph View: Reference Graph - Discussion Log

> **Audit trail only.** Do not use as input to planning, research, or execution agents.
> Decisions are captured in CONTEXT.md — this log preserves the alternatives considered.

**Date:** 2026-05-01
**Phase:** 49-theme-d-graph-view-reference-graph
**Mode:** `--auto` — Claude analyzed each gray area and selected the recommended option without interactive prompts. The user can review every decision in CONTEXT.md and override before plan-phase commits.
**Areas discussed:** Mount Approach, Depth Control, BFS Bounds, Layout Direction, Node Component, Edge Component & Direction, Theme Integration, States (Loading/Empty/Error), Navigation & Interaction, Performance & Bundle, Caching, Testing

---

## Mount Approach (D-01, D-02, D-03)

| Option | Description | Selected |
|--------|-------------|----------|
| Standalone "Graph" button + lazy route `/explorer/:type/:id/graph` | Matches ROADMAP success criteria #1 verbatim. 3+ day budget. | ✓ |
| Fold into 4-mode resource shell (Summary \| Human \| Graph \| JSON) per design handoff | Subsumes Phases 47/48/49 into one redesign. Doubles Phase 49 scope. | |

**Auto-decision:** Standalone button + lazy route. Rationale: matches ROADMAP exactly; the 4-mode shell is the user's documented future direction but is its own phase, not a Phase 49 deliverable. The deferred 4-mode shell phase is captured in `<deferred>`.

**Notes:** Button placement next to existing "Raw JSON" / "$everything" actions in `ResourceDetailPage.tsx` `<Group>`. Visible for ALL resource types (empty-graph state handled inside the component, not via button visibility).

---

## Depth Control Surface (D-04)

| Option | Description | Selected |
|--------|-------------|----------|
| Mantine `Slider` 1-3 with marks | Most discoverable, matches design handoff "depth slider 1-3", matches existing Quality slider idiom. | ✓ |
| +/− buttons | Familiar but takes 2-3 clicks to reach max depth. | |
| `Select` dropdown 1/2/3 | Discoverable but feels heavier than a slider for 3 values. | |
| Fixed at 1 (no control) | Simplest but blocks exploration; ROADMAP mandates depth = 1 default with depth control. | |

**Auto-decision:** Mantine `<Slider min={1} max={3} marks>` with default 1. Slider above the canvas, NOT overlay. Symmetric depth (applies to both directions). Hard cap = 3.

---

## BFS Node-Count Cap (D-08)

| Option | Description | Selected |
|--------|-------------|----------|
| 150 nodes | Large enough to not clip realistic clinical data; small enough to render <500ms. | ✓ |
| 100 nodes | Conservative; may clip patient-centered fanouts at depth 2. | |
| 250 nodes | Aggressive; may cause UI lag on dense graphs. | |
| No cap, depth-only | Risk of accidental BFS explosion on densely connected resources. | |

**Auto-decision:** 150 nodes with truncation Alert. Researcher MAY adjust ±50 with rationale in 49-RESEARCH.md after profiling Synthea-style data.

---

## Layout Direction (D-06)

| Option | Description | Selected |
|--------|-------------|----------|
| TB (top-down) | Root at top-center, references cascade downward. Most familiar for hierarchical FHIR data. | ✓ |
| LR (left-right) | Root at left, references flow right. Better for wide screens but less natural reading direction. | |
| BT (bottom-up) | Inverted; rarely natural. | |

**Auto-decision:** `rankdir: 'TB'`. Researcher to verify dagre's `nodesep`, `ranksep`, `edgesep` defaults produce readable spacing for typical Patient-centered graphs (3-4 outgoing / 5-10 incoming).

---

## Node Component (D-07)

| Option | Description | Selected |
|--------|-------------|----------|
| Custom Mantine `Card` with `summarizeResource(resource).primary` + tooltip on `secondary` | Reuses existing patterns; visually consistent with the rest of the app. | ✓ |
| Default React Flow node with custom label | Faster to implement but visually inconsistent. | |
| Pure SVG hand-drawn node | Maximum control but expensive to maintain. | |

**Auto-decision:** Custom `<ResourceGraphNode>` registered in `nodeTypes`. Mantine `Card` `withBorder padding="xs"`. Center node gets thicker indigo border to distinguish root.

---

## Edge Component & Direction (D-09, D-10)

| Option | Description | Selected |
|--------|-------------|----------|
| Default React Flow edge with `label` (FHIR reference field name) | Always-visible edge labels match GRPH-03 verbatim. | ✓ |
| Custom edge with hover-only label | Reduces visual clutter but requires interaction to discover. | |
| `smoothstep` edge type | Reads best for hierarchical TB layout. | (researcher to confirm) |

**Auto-decision:** Default edge with always-visible `label` prop. Edge type tentatively `smoothstep` — researcher to confirm via render comparison. Arrow direction matches FHIR semantic ("X references Y" → arrow X→Y; for incoming refs, arrow points AT current resource).

---

## Theme Integration (D-11)

| Option | Description | Selected |
|--------|-------------|----------|
| CSS variables wired to Mantine theme tokens | Re-themes without remount; matches GRPH-04 invariant. | ✓ |
| JS-computed inline styles per `useMantineColorScheme()` value | Causes re-render on theme switch; risks remount. | |
| Hardcoded light-mode-only | Fails GRPH-04. | |

**Auto-decision:** Define `graph.css` (or `.module.css`) mapping React Flow CSS vars to Mantine vars (`--mantine-color-body`, etc.). Test asserts no remount on theme switch.

---

## Loading / Empty / Error States (D-12, D-13, D-14)

**Loading:** Mantine `Skeleton` placeholder (4-6 grey card-shaped boxes) — communicates "graph being built" better than a spinner. ✓

**Empty:** Single root node + Mantine `<Alert>` "No references at depth 1. Try increasing depth via the slider above." ✓

**Error (single fetch fails):** Drop the node silently, log to console. Match Phase 48 `RelatedResourcesPanel` `.catch()` idiom.

**Error (all fetches fail):** Empty state UI with different alert: "Unable to load references. Check Blaze connection."

---

## Navigation & Interaction (D-05, D-15, D-16)

| Decision | Selected |
|----------|----------|
| Single click on node → immediate `navigate(/explorer/{type}/{id})` | ✓ (matches Phase 48 click model) |
| No selection state, no double-click | ✓ |
| Hover triggers Mantine Tooltip with `summarizeResource.secondary` | ✓ |
| `<Controls />` (zoom/pan/fit) + `<MiniMap />` always visible | ✓ |
| Browser back/forward respects history (default `useNavigate()` behavior) | ✓ test asserts this |

---

## Performance & Bundle (D-17, D-18)

| Decision | Selected |
|----------|----------|
| `<ResourceGraphView>` is `React.lazy()`-imported in router config | ✓ |
| `@xyflow/react` + `@dagrejs/dagre` imported INSIDE the component file | ✓ (NOT at App.tsx level) |
| Vite analyzer confirms lazy chunk contains both deps; main `index.js` does not | ✓ test/build-time assertion |
| Initial-load gz delta target ≤ +5 KB | ✓ matches GRPH-01 |
| Parallel BFS fanout via `Promise.all` per depth level | ✓ mirrors Phase 48 |
| Per-fetch cancellation flag | ✓ mirrors Phase 48 |

---

## Caching (D-19)

| Option | Description | Selected |
|--------|-------------|----------|
| Module-scoped `Map<string, Promise<Resource[]>>` keyed by `${type}/${id}:${depth}` | Dedupes within same root across depth changes. Cleared on unmount. NOT persisted. | ✓ |
| Per-component `useState` cache | Loses cache on remount; doesn't dedupe across depth changes mid-session. | |
| `localStorage` persistence | Privacy / staleness concerns. | |

**Auto-decision:** Module-scoped Map; outgoing fetches reuse Phase 47 cache (READ-01) when available.

---

## Testing (D-20)

| Test | Type | Required |
|------|------|----------|
| BFS depth-cap (10-deep chain → 4 nodes returned) | vitest unit | ✓ |
| BFS node-count cap (>150 fanout → stops at 150 + truncation flag) | vitest unit | ✓ |
| Node-click navigation (mock click → `useNavigate` called with correct URL) | RTL | ✓ |
| Theme-switch invariant (DOM root persists across `setColorScheme`) | RTL | ✓ |
| Parallel-fetch fanout (5 refs → 5 parallel `client.get()` calls) | RTL | ✓ |
| Error recovery (1/5 fetches rejects → 4 nodes render) | RTL | optional |
| Lazy-chunk smoke (post-build grep for `xyflow` only in lazy chunk) | shell | optional |
| Edge-label rendering | RTL | optional (depends on RTL's ability to interrogate React Flow DOM) |

**Auto-decision:** 5 mandatory + 3 optional. Researcher / planner may add the optional ones if RTL infra supports them.

---

## Claude's Discretion

- Exact dagre tuning constants (`nodesep`, `ranksep`, `edgesep`)
- `@tabler/icons-react` icon for the "Graph" button (`IconShare` / `IconHierarchy` / `IconAffiliate` / `IconNetwork`)
- Edge type choice (`smoothstep` vs `default` vs `bezier`)
- Slider position (above-canvas toolbar vs in-canvas overlay) — default above-canvas
- File organization (single file vs split into `useGraphBfs.ts` + `ResourceGraphNode.tsx` + `graph.css`)
- Mantine `Tooltip` position strategy (default `right` with arrow)

## Deferred Ideas

- **4-Mode Resource Shell** (Phase 51 working name) — `Summary | Human | Graph | JSON` redesign from design handoff
- **JSON peek drawer** (J keypress)
- **Sidebar v2 + ⌘K + Expert toggle**
- **G2/G3 multi-resource graphs**
- **Graph PNG/SVG/JSON export**
- **Live updates / WebSocket**
- **Edge bundling / advanced layout**
- **Saved graph views**
- **Path-finding queries**

## Critical Researcher Flags

- **`@dagrejs/dagre` version mismatch:** ROADMAP says ≥3.x; npm latest is 1.x. Researcher MUST verify and document the correct version in `49-RESEARCH.md` before planning.
- **`@xyflow/react` exact version:** to be pinned post-`npm view` lookup.
- **Lazy-route precedent:** if no existing lazy routes in the explorer surface, researcher to verify the cleanest pattern (`React.lazy()` direct in router config).
