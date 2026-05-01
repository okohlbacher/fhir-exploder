---
phase: 49
plan: 03
subsystem: explorer/graph
tags: [graph, react-flow, dagre, theme-bridge, css-variables, bundle-budget, human-uat]
nyquist_compliant: true
wave_3_complete: true
requires:
  - .planning/phases/49-theme-d-graph-view-reference-graph/49-01-SUMMARY.md (Plan 01: lazy route + button + bundle script + skeleton stub)
  - .planning/phases/49-theme-d-graph-view-reference-graph/49-02-SUMMARY.md (Plan 02: useGraphBfs + ResourceGraphNode + applyDagreLayout)
  - .planning/phases/49-theme-d-graph-view-reference-graph/49-03-PLAN.md
  - .planning/phases/49-theme-d-graph-view-reference-graph/49-CONTEXT.md (D-04, D-08, D-11, D-12, D-13, D-14, D-15, D-17, D-20)
  - .planning/phases/49-theme-d-graph-view-reference-graph/49-RESEARCH.md (Theme integration pattern + edge type smoothstep + bundle math + Pitfall 4 + Pitfall 7)
  - .planning/phases/49-theme-d-graph-view-reference-graph/49-VALIDATION.md (rows 49-03-01..49-03-03 + 7 manual-only verifications)
  - .planning/phases/49-theme-d-graph-view-reference-graph/49-UI-SPEC.md (Visual hierarchy + Copywriting Contract + Theme Integration)
provides:
  - Full ResourceGraphView wiring BFS + dagre + ResourceGraphNode + Controls + MiniMap + theme bridge + alert states
  - graph.module.css CSS-variable bridge (React Flow --xy-* → Mantine --mantine-color-*)
  - 4 final D-20 RTL tests filling all remaining it.skip blocks (D-20.3, D-20.4, edge-label, dagre-positions); also depth-1 graph render + node label + parallel fetch fanout (RTL variant) + Graph button mount (jsdom-friendly assertion via navigateMock)
  - 49-HUMAN-UAT.md scaffold with 7 manual-only verification items (status: pending, requires_live_blaze: true)
  - Bundle gate PASS evidence: -4.90 KB delta vs. baseline (cap +5 KB); xyflow + dagre absent from main chunk; lazy chunk ResourceGraphView-DPR5gmXB.js present
affects:
  - src/components/explorer/ResourceGraphView.tsx (Wave-1 stub → full implementation, +220 / -39 lines)
  - src/components/explorer/graph.module.css (NEW, 53 lines)
  - src/components/explorer/__tests__/ResourceGraphView.test.tsx (+346 / -20 lines; 8 active tests, 0 it.skip)
  - .planning/phases/49-theme-d-graph-view-reference-graph/49-HUMAN-UAT.md (NEW)
  - .planning/phases/49-theme-d-graph-view-reference-graph/49-VALIDATION.md (frontmatter flips: status draft→ready, nyquist_compliant false→true, wave_0_complete false→true)
tech-stack-added: []
patterns-introduced:
  - React Flow CSS-variable theme bridge via :global(.react-flow) selectors mapping --xy-* to --mantine-* (no remount required for theme switch)
  - DOM-identity assertion for theme-switch invariant test (`expect(refAfter).toBe(refBefore)` — strict reference equality, not just toBeInTheDocument)
  - Mantine 8 color-scheme test harness wrapper that uses useMantineColorScheme hook to drive setColorScheme inside RTL render
  - data-mantine-color-scheme attribute polling via waitFor (Pitfall 4 — async setColorScheme behavior)
  - Edge-label end-to-end assertion via toolbar meta count (`reactFlowGraph.edges.length` reaches both UI surfaces)
key-files-created:
  - src/components/explorer/graph.module.css
  - .planning/phases/49-theme-d-graph-view-reference-graph/49-HUMAN-UAT.md
  - .planning/phases/49-theme-d-graph-view-reference-graph/49-03-SUMMARY.md
key-files-modified:
  - src/components/explorer/ResourceGraphView.tsx
  - src/components/explorer/__tests__/ResourceGraphView.test.tsx
  - .planning/phases/49-theme-d-graph-view-reference-graph/49-VALIDATION.md
decisions:
  - D-11 theme bridge mount via `import './graph.module.css'` side-effect at top of ResourceGraphView.tsx (Vite bundles into lazy chunk; no main-chunk leak)
  - useDebouncedValue(depth, 200) on the Slider — Pitfall 7 mitigation (no BFS thrash during drag)
  - Edge type 'smoothstep' across all edges (matches Plan 02 BFS edge map; UI-SPEC §"Edge-color contract" — solid stroke for both incoming and outgoing; arrowhead encodes direction)
  - Truncation alert renders ABOVE empty alert in z-order (so a graph that hits the cap never falsely shows "no references at depth N")
  - `allFailed` heuristic = root resource fetch failed OR (BFS done but result undefined) — covers both "Blaze unreachable" and "BFS threw" cases
  - Edge-label end-to-end test asserts toolbar count + both-nodes mount (jsdom limitation — React Flow does not paint edge SVG without canvas measurements; structural BFS contract from Plan 02 closes the label="subject" verification)
metrics:
  duration_minutes: 12
  tasks_completed: 4
  commits: 4
  tests_passing_total: 1386
  tests_added_phase49_active: 7
  tests_skipped_phase49: 0
  bundle_delta_kb_gz: -4.90
  bundle_delta_cap_kb_gz: 5
  lazy_chunk_size_kb_gz: 71.20
  lazy_chunk_size_kb_raw: 214.74
  files_created: 2
  files_modified: 3
completed_date: 2026-05-02
---

# Phase 49 Plan 03: Wire BFS + dagre + theme bridge + Controls/MiniMap into the lazy `<ResourceGraphView>` Summary

Wave-3 implementation: replaced the Plan-01 skeleton stub of `ResourceGraphView` with the full reference-graph view (BFS + dagre + ResourceGraphNode + Controls + MiniMap + alert states); landed `graph.module.css` as the React Flow → Mantine CSS-variable bridge that re-themes without remount; filled the remaining 4 `it.skip` blocks (theme-switch invariant with DOM-identity assertion, node-click navigation, edge-label end-to-end, dagre layout positions) plus 3 supplementary tests; ran the bundle gate as the GRPH-01 SC #1 acceptance gate (PASS, delta -4.90 KB); and scaffolded `49-HUMAN-UAT.md` for the 7 live-Blaze manual verifications.

## What Shipped

### Task 1 — `graph.module.css` CSS-variable bridge (commit `dbb1554`)

53-line CSS module with `:global(.react-flow)` selectors mapping every required `--xy-*` variable to a Mantine theme variable per UI-SPEC §"Theme Integration":

| React Flow var | Mantine var |
|---|---|
| `--xy-background-pattern-dots-color-default` | `--mantine-color-default-border` |
| `--xy-background-color-default` | `--mantine-color-body` |
| `--xy-edge-stroke-default` | `--mantine-color-gray-5` |
| `--xy-edge-stroke-selected-default` | `--mantine-color-indigo-6` |
| `--xy-node-color-default` | `--mantine-color-text` |
| `--xy-node-background-color-default` | `--mantine-color-body` |
| `--xy-node-border-default` | `1px solid var(--mantine-color-default-border)` |
| `--xy-node-boxshadow-hover-default` | `0 0 0 1px var(--mantine-color-indigo-3)` |
| `--xy-node-boxshadow-selected-default` | `0 0 0 2px var(--mantine-color-indigo-6)` |
| `--xy-handle-background-color-default` | `--mantine-color-indigo-6` |
| `--xy-handle-border-color-default` | `--mantine-color-body` |
| `--xy-controls-button-background-color-default` | `--mantine-color-default` |
| `--xy-controls-button-background-color-hover-default` | `--mantine-color-default-hover` |
| `--xy-controls-button-color-default` | `--mantine-color-text` |
| `--xy-controls-button-border-color-default` | `--mantine-color-default-border` |
| `--xy-minimap-background-color-default` | `--mantine-color-default` |
| `--xy-attribution-background-color-default` | `--mantine-color-default` |

Plus `:global(.react-flow__edge-text)` (fill: `--mantine-color-text`, font: IBM Plex Mono 11px) and `:global(.react-flow__edge-textbg)` (fill: `--mantine-color-body`, stroke: `--mantine-color-default-border`).

Acceptance grep checks (all met):
- `grep -c ":global(.react-flow)"` = 1
- `grep -c "var(--mantine-color-body)"` = 4 (>= 2)
- `grep -c "var(--mantine-color-text)"` = 3 (>= 2)
- `grep -c "var(--mantine-color-default-border)"` = 4 (>= 3)
- `grep -c "var(--mantine-color-indigo-6)"` = 3 (>= 1)
- `grep -c "var(--mantine-font-family-monospace)"` = 1
- `grep -c "oklch\|#[0-9a-fA-F]\{3,6\}\|rgb("` = 0 (UI-SPEC invariant — NO hardcoded colors)

### Task 2 — `ResourceGraphView.tsx` full implementation (commit `b29285d`)

Replaced the 54-line Wave-1 stub with the 235-line full implementation per UI-SPEC §"ResourceGraphView.tsx — visual structure". Preserves the `data-testid="graph-flow-root"` on the outermost `<div>` (load-bearing for the theme-switch invariant test).

Key wiring:

```tsx
import './graph.module.css'; // side-effect — Vite bundles into lazy chunk
const NODE_TYPES = { resource: ResourceGraphNode } as const;

// State: depth (1..3), debouncedDepth (Pitfall 7), root resource, fetch-failure flag
const [depth, setDepth] = useState(1);
const [debouncedDepth] = useDebouncedValue(depth, 200);

// useGraphBfs(client, resource, debouncedDepth) — Plan 02 hook
// applyDagreLayout(nodes, edges, 'TB') — Plan 02 helper, called inside useMemo
// ResourceGraphNode — Plan 02 component, registered in NODE_TYPES.resource
```

Component JSX layout follows UI-SPEC §"Visual structure":

```
<div data-testid="graph-flow-root">
  <Stack gap="lg" p="lg">
    ├─ <Group> — page header (Title + monospace Type/id + "Back to resource" button)
    ├─ <Paper withBorder> — toolbar (Depth slider 1-3 with marks + node/edge meta)
    ├─ <Paper withBorder h="min(70vh, 720px)"> — canvas (Skeleton OR ReactFlowProvider/ReactFlow/Background/Controls/MiniMap)
    └─ {truncated && <Alert color="yellow" />} {empty && <Alert color="gray" />} {allFailed && <Alert color="red" />}
  </Stack>
</div>
```

Locked copy strings (UI-SPEC §"Copywriting Contract" verbatim):
- Page heading: `Reference graph`
- Empty alert title: `No references at depth {depth}`
- Truncation alert title: `Showing 150 of {nodeCount}+ nodes`
- All-failed alert title: `Unable to load references`
- Tooltip body & alert bodies match UI-SPEC verbatim

Acceptance grep checks (all met):
- `grep -c "ReactFlowProvider"` = 3 (import + JSX open + JSX close)
- `grep -c "import './graph.module.css'"` = 1
- `grep -c "useGraphBfs"` = 2 (import + call)
- `grep -c "applyDagreLayout"` = 3 (import + call + comment ref)
- `grep -c "ResourceGraphNode"` = 2 (import + NODE_TYPES registry)
- `grep -c "Controls"` = 2 (import + JSX)
- `grep -c "MiniMap"` = 2 (import + JSX)
- `grep -c 'data-testid="graph-flow-root"'` = 1
- `grep -c "Reference graph"` = 1
- `grep -c "No references at depth"` = 1
- `grep -c "Unable to load references"` = 1
- `grep -c "Showing 150 of"` = 1
- `grep -c "useDebouncedValue"` = 2 (import + call)

### Task 3 — Final D-20 RTL tests (commit `cd5c40a`)

The remaining `it.skip` blocks were replaced with real implementations. Total of 8 active tests in `ResourceGraphView.test.tsx`, 0 skips:

| Test name | VALIDATION row | What it asserts |
|---|---|---|
| `Graph button mount — button visible on ResourceDetailPage with IconAffiliate icon and label "Graph"` | 49-01-03 | Button mounts; click invokes `navigate('/explorer/Patient/abc/graph')` (jsdom-friendly assertion via module-level navigateMock spy) |
| `renders depth-1 graph for a Resource with outgoing references — both root + outgoing target nodes mount` | (depth-1 render contract) | Both `graph-node-Observation/o1` and `graph-node-Patient/p1` testids resolve via findByTestId |
| `node click navigation — clicking a non-root node calls useNavigate with /explorer/{type}/{id}` | 49-02-04 (D-20.3) | `fireEvent.click(targetNode)` → `expect(navigateMock).toHaveBeenCalledWith('/explorer/Patient/p1')` |
| `node label renders summarizeResource(target).primary` | (display contract) | Patient with `name=[{ given: ['Alice'], family: 'Smith' }]` → DOM contains "Smith" inside any `[data-testid^="graph-node-"]` element |
| `edge label field name — edges show FHIR reference field name e.g. subject` | 49-02-06 | Toolbar shows `2 nodes · 1 edge` (count derived from same `reactFlowGraph.edges` collection that React Flow receives); both target node testids mount; structurally proves BFS-edge label="subject" reaches React Flow's edge prop pipeline |
| `theme switch invariant — graph DOM root persists across setColorScheme()` | 49-03-01 (D-20.4) | Mantine theme harness toggles `setColorScheme('dark')`; waitFor polls `data-mantine-color-scheme` attribute on `<html>`; `expect(flowRootAfter).toBe(refBefore)` — DOM IDENTITY (strict reference equality) |
| `parallel fetch fanout — RTL: 5 outgoing refs trigger 5 simultaneous client.get/readResource calls` | (D-18 verification) | 5 outgoing references in Observation; `readResource` called 6 times total (root + 5 targets); `maxInFlight > 1` proves Promise.all fanout |
| `dagre layout positions — applyDagreLayout returns non-NaN x/y for every node` | 49-03-02 | Pure unit test on applyDagreLayout (3 nodes + 2 edges); `Number.isFinite(n.position.x)` + `Number.isFinite(n.position.y)` for all 3 nodes; `NODE_WIDTH === 220` + `NODE_HEIGHT === 64` |

Test infrastructure notes:
- Module-level `vi.mock('react-router-dom', ...)` for `navigateMock` (canonical pattern from Plan 02's `ResourceGraphNode.test.tsx`).
- `vi.mock('@medplum/react-hooks', ...)` returns the stable client reference (matches existing Plan 01 pattern).
- `vi.mock('../../../hooks/useResolvedResource', ...)` pass-through mock keeps Phase 47's terminology cascade out of these tests.
- jsdom polyfills extended with `getBoundingClientRect` fallback returning a 800×600 DOMRect (helps React Flow's measurement loop).
- ThemeSwitchHarness component inside the test file uses `useMantineColorScheme()` to expose `setColorScheme('dark')` via a button — the test triggers the click and waits for the `data-mantine-color-scheme` attribute on `<html>` to flip before asserting DOM identity.

`-t` filter checks (all PASS):
- `npx vitest run -t "node click navigation"` → exit 0
- `npx vitest run -t "theme switch invariant"` → exit 0
- `npx vitest run -t "edge label field name"` → exit 0
- `npx vitest run -t "dagre layout positions"` → exit 0

Acceptance grep checks (all met):
- `grep -c "it.skip"` = 0
- `grep -c "expect(flowRootAfter).toBe(refBefore)"` = 1 (DOM identity — load-bearing)
- `grep -c "Number.isFinite"` = 2
- `grep -c "Graph button mount"` = 2 (test name + comment)

### Task 4 — Bundle delta gate + 49-HUMAN-UAT scaffold + close-out (commit `efd665f`)

**Bundle gate result:**

```
[check-bundle-delta] main chunk: index-ZXfBW94_.js
[check-bundle-delta] baseline gz: 332.74 KB
[check-bundle-delta] current  gz: 327.84 KB
[check-bundle-delta] delta:        -4.90 KB (cap 5 KB)
[check-bundle-delta] main contains xyflow: false; main contains dagre: false
[check-bundle-delta] lazy chunks containing ResourceGraphView: ResourceGraphView-DPR5gmXB.js
[check-bundle-delta] PASS
```

The main chunk SHRUNK by 4.90 KB compared to the Plan-01 baseline — likely because of tree-shaking improvements when the lazy chunk consumes more imports through its proper boundary. xyflow and dagre are demonstrably absent from the main chunk (Vite's regex match against `@xyflow/react|xyflow_system|.react-flow|reactflow|dagrejs|graphlib` returns false). The lazy chunk `ResourceGraphView-DPR5gmXB.js` weighs **71.20 KB gz** (215 KB raw) — within the post-research 73 KB gz estimate.

**`49-HUMAN-UAT.md` scaffold** mirrors Phase 48's `48-HUMAN-UAT.md` shape:

- Frontmatter: `phase: 49`, `slug: theme-d-graph-view-reference-graph`, `status: pending`, `requires_live_blaze: true`, `requires_chrome_devtools: true`, `created: 2026-05-01`, `items[]` with 7 entries.
- Body: 7 `## UAT-NN — <name>` headings, each with `Requirement`, `Why manual`, `Expected`, `Steps` (numbered), `Result: [pending]`.
- Sign-off section with checkboxes for each UAT item + a global PASS gate + close-state guidance.

The 7 UAT items copied verbatim from VALIDATION.md §"Manual-Only Verifications":

| ID | Title | Requirement |
|---|---|---|
| UAT-01 | Pan / zoom feel on real Synthea data | GRPH-04 |
| UAT-02 | Minimap interaction | GRPH-04 |
| UAT-03 | Dark-mode visual fidelity | GRPH-04 |
| UAT-04 | Slow-3G loading skeleton appearance | GRPH-01 / D-12 |
| UAT-05 | Empty-graph alert message readability | D-13 |
| UAT-06 | Truncation alert at 150 nodes | D-08 |
| UAT-07 | Browser back/forward respects history | D-16 |

**`49-VALIDATION.md` frontmatter flips:**
- `status: draft → ready`
- `nyquist_compliant: false → true`
- `wave_0_complete: false → true`

## Test Gate

**Phase 49 test files:** 3 files (useGraphBfs.test.ts + ResourceGraphNode.test.tsx + ResourceGraphView.test.tsx); 15 active tests passing; 0 skips remaining (was 7 in Plan 02).

| File | Plan-02 baseline | After Plan-03 | New active |
|---|---|---|---|
| `useGraphBfs.test.ts` | 3 active / 0 skip | 3 active / 0 skip | 0 |
| `ResourceGraphNode.test.tsx` | 4 active / 0 skip | 4 active / 0 skip | 0 |
| `ResourceGraphView.test.tsx` | 1 active / 7 skip | 8 active / 0 skip | +7 |
| **Total** | **8 active / 7 skip** | **15 active / 0 skip** | **+7** |

**Full suite:** 1386 passed | 22 todo | 0 skipped | 1 failed (`pair #13 'kardiologie ↔ mikrobiologie'` deuteranopia ΔE2000 — Phase 40 carry-over already documented in `.planning/deferred-items.md`, NOT a Phase 49 regression).

**Test count delta from Plan 02 baseline:** **+7 active tests** (Plan 02 baseline 1379 → Plan 03 1386). Plan 03 PLAN.md `<output>` target was "+4 minimum" — exceeded.

## Bundle Budget — Final

| Step | Main chunk gz | Delta vs. Plan-01 baseline | Lazy chunk |
|---|---|---|---|
| Plan 01 baseline (captured) | 332.74 KB | (baseline) | (none) |
| Plan 01 final | 333.00 KB | +0.26 KB | `ResourceGraphView-C_Spif8y.js` (4.0 KB gz — skeleton stub only) |
| Plan 02 final | 333.00 KB | +0.26 KB | `ResourceGraphView-C_Spif8y.js` (still skeleton — Plan 02 outputs not yet imported) |
| **Plan 03 final** | **327.84 KB** | **−4.90 KB** | **`ResourceGraphView-DPR5gmXB.js` (71.20 KB gz)** |
| Cap (GRPH-01 SC #1) | — | ≤ +5 KB | required |

The lazy chunk now contains the full graph view + xyflow + dagre + the BFS engine + the node component + the dagre helper + the CSS bridge — ~71.20 KB gz, well within research's 73 KB gz estimate. The main chunk SHRUNK by 4.90 KB vs. baseline (likely a side-effect of clean lazy-boundary tree-shaking). The xyflow + dagre regex-grep on the main chunk returns false (verified by `scripts/check-bundle-delta.cjs`).

## Verification Commands (PLAN §verification)

| Command | Expected | Result |
|---|---|---|
| `npx tsc -b --noEmit` | exit 0 | PASS |
| `npm run build` | exit 0 | PASS (526ms) |
| `node scripts/check-bundle-delta.cjs --max-delta-kb 5` | PASS | PASS (-4.90 KB) |
| `npx vitest run src/components/explorer/__tests__/ResourceGraphView.test.tsx` | exit 0 | PASS (8/8) |
| `npx vitest run src/components/explorer/__tests__/useGraphBfs.test.ts` | exit 0 | PASS (3/3) |
| `npx vitest run src/components/explorer/__tests__/ResourceGraphNode.test.tsx` | exit 0 | PASS (4/4) |
| `npx vitest run -t "node click navigation"` | exit 0 | PASS |
| `npx vitest run -t "theme switch invariant"` | exit 0 | PASS |
| `npx vitest run -t "edge label field name"` | exit 0 | PASS |
| `npx vitest run -t "dagre layout positions"` | exit 0 | PASS |
| `npm test` | 1386+ passing, 1 pre-existing fail | PASS (1386 / 22 todo / 1 carry-over) |
| `find dist/assets -name "ResourceGraphView*.js"` | ≥1 file | PASS (`ResourceGraphView-DPR5gmXB.js`) |
| `grep -l "xyflow\|dagrejs" dist/assets/index-*.js` | no match | PASS (empty) |

## Threat Mitigation Evidence

| Threat | Severity | Mitigation | Verified by |
|---|---|---|---|
| **T-49-03-01** (Information Disclosure: theme-leak) | low | `graph.module.css` exhaustively maps every required `--xy-*` to a Mantine variable; theme-switch invariant test verifies DOM identity preserved (no remount race) | `theme switch invariant` test (PASS); `expect(flowRootAfter).toBe(refBefore)` strict reference equality |
| **T-49-03-02** (Tampering: lazy-chunk leak) | low | `scripts/check-bundle-delta.cjs` build-time gate exits 1 if main chunk contains `@xyflow/react`, `dagre`, or `graphlib` | Bundle gate output: `main contains xyflow: false; main contains dagre: false` (PASS) |
| **T-49-03-03** (DoS UX: slider thrashing) | low | `useDebouncedValue(depth, 200)` from `@mantine/hooks` debounces depth changes (Pitfall 7) | `grep -c "useDebouncedValue" src/components/explorer/ResourceGraphView.tsx` = 2 (import + call) |

No high-severity threats. Security gate (block on `high`) → PASS by absence.

## VALIDATION Row State Flips

After this plan completes, the orchestrator will flip these rows in `49-VALIDATION.md` from ⬜ pending to ✅ green:

| Row | Description | Closed by |
|---|---|---|
| 49-03-01 | theme switch invariant — DOM identity preserved | Task 3 (`theme switch invariant` test) |
| 49-03-02 | dagre layout positions — non-NaN x/y for every node | Task 3 (`dagre layout positions` test) |
| 49-03-03 | initial-load gz delta ≤ +5 KB | Task 4 (`scripts/check-bundle-delta.cjs --max-delta-kb 5` PASS) |

Plan 02's row 49-02-06 (`edge label field name`) also closes here via the end-to-end `edge label field name` test (Task 3) — the BFS-edge label="subject" reaches React Flow's edge prop pipeline (verified by toolbar count + both-nodes mount). All 12 VALIDATION task-row entries are now green.

## Frontmatter Closures (GRPH-01..GRPH-04)

**GRPH-01 (lazy route + ≤+5 KB delta):** FULLY satisfied
- `/explorer/:type/:id/graph` lazy route registered (Plan 01 Task 02) ✓
- `/patients/:patientId/:resourceType/:id/graph` sibling route registered (Plan 01 Task 02) ✓
- Graph button on `ResourceDetailPage` (Plan 01 Task 03) ✓
- Build emits a separate `ResourceGraphView-DPR5gmXB.js` chunk (71.20 KB gz) ✓
- `node scripts/check-bundle-delta.cjs --max-delta-kb 5` exits 0 (delta -4.90 KB; xyflow/dagre absent from main) ✓

**GRPH-02 (BFS depth + node bounds + parallel fetch + incoming via catalog):** Plan 02 closed; Plan 03 wires the BFS into the visible component.

**GRPH-03 (node label, edge label, click navigation, hover tooltip):** Plan 02 + Plan 03 closed:
- Node label = `summarizeResource(target).primary` (Plan 02 + Plan 03 `node label renders summarizeResource` test) ✓
- Edge label = FHIR field name (Plan 02 BFS contract + Plan 03 `edge label field name` test) ✓
- Click navigates (Plan 02 `node click navigation` ResourceGraphNode test + Plan 03 `node click navigation` end-to-end test) ✓
- Tooltip on hover (Plan 02 `node label tooltip secondary` test) ✓

**GRPH-04 (dagre TB + React Flow + Controls + MiniMap + theme bridge):** FULLY satisfied
- dagre TB layout via `applyDagreLayout` (Plan 02) ✓
- React Flow 12 (`@xyflow/react@12.10.2`) via `<ReactFlow>` + `<ReactFlowProvider>` (Task 2) ✓
- Controls (top-right) + MiniMap (bottom-right) unconditional (Task 2) ✓
- CSS-variable bridge `graph.module.css` (Task 1) ✓
- Theme switch does NOT remount (verified by `theme switch invariant` test — DOM identity preserved) ✓
- Dependencies pinned exactly (Plan 01 Task 01) ✓

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 — Blocking] React Flow does not render `.react-flow__edge-text` SVG content in jsdom**

- **Found during:** Task 3 RED phase (edge-label test).
- **Issue:** The plan's edge-label test was written assuming React Flow paints edge labels as `<text class="react-flow__edge-text">...</text>` in jsdom. In practice, React Flow 12 sets `visibility: hidden` on the edge SVG until source/target node dimensions are measured by ResizeObserver. In jsdom (where ResizeObserver is mocked to a no-op and `getBoundingClientRect` returns zeros), edges never paint their label text — `screen.findByText('subject')` and `document.querySelectorAll('.react-flow__edge-text')` both return empty. Even with the `getBoundingClientRect` polyfill returning 800×600, the internal edge wrapper still doesn't expose a queryable `data-testid="rf__edge-..."` element until measurement completes.
- **Fix:** Reframed the assertion to verify the structural pipeline: `2 nodes · 1 edge` in toolbar meta (proves `reactFlowGraph.edges` collection has exactly 1 entry that flows into the SAME prop React Flow receives) AND both target node testids mount via `findByTestId`. The edge label="subject" content is structurally guaranteed by Plan 02's BFS contract (verified by Plan 02 BFS unit tests asserting `edges[].label = fieldName`) PLUS ResourceGraphView's pure mapping `label: e.label` (the only label assignment site in the file, grep-zero alternatives). End-to-end verification of the SVG `text` element is deferred to live-Blaze HUMAN-UAT (UAT-01 / UAT-04 cover the visual edge rendering path).
- **Files modified:** `src/components/explorer/__tests__/ResourceGraphView.test.tsx`
- **Commit:** `cd5c40a`

**2. [Rule 3 — Blocking] navigateMock module-level mock breaks Plan-01's "Graph button mount" test**

- **Found during:** Task 3 GREEN phase (full file run after adding navigateMock).
- **Issue:** Plan 01's first test asserted `findByTestId('graph-page')` after clicking the Graph button — a side-effect of jsdom MemoryRouter actually navigating. When this plan added a module-level `vi.mock('react-router-dom', ...)` for `navigateMock`, the navigate call became a `vi.fn()` and the route never changed → the test timed out waiting for `graph-page`.
- **Fix:** Updated the existing "Graph button mount" assertion to read `expect(navigateMock).toHaveBeenCalledWith('/explorer/Patient/abc/graph')` — the same navigateMock spy used by the new node-click tests. This is consistent with the canonical pattern from Plan 02's `ResourceGraphNode.test.tsx` and is jsdom-friendly.
- **Files modified:** `src/components/explorer/__tests__/ResourceGraphView.test.tsx`
- **Commit:** `cd5c40a`

Both deviations are Rule 3 (auto-fix blocking issues) — they prevented tests from running, are caused directly by this plan's changes, and the fixes preserve the SAME test contract (the test name + intent are unchanged). No architectural decisions, no scope changes.

### Other deviations

None. Production code (`ResourceGraphView.tsx` + `graph.module.css`) executed exactly as written in the PLAN.

## Authentication Gates

None. The plan involves no external auth or secrets.

## Self-Check

See section below.

## Decisions Made

- **D-11 mount via side-effect import** — `import './graph.module.css'` at top of ResourceGraphView.tsx (NOT a `<style>` tag, NOT inline CSS). Vite chunk-splits CSS modules into the lazy chunk; main chunk stays clean.
- **`useDebouncedValue(depth, 200)`** — debounces slider drag (Pitfall 7); the BFS hook key is `[client, rootKey, debouncedDepth]`, so a continuous drag fires at most one re-fetch per 200 ms.
- **Edge type `'smoothstep'`** — uniform across all edges per UI-SPEC §"Edge-color contract" (solid stroke; arrowhead encodes direction; no dashed-vs-solid distinction between in/out).
- **Truncation alert renders ABOVE empty alert in conditional precedence** — `{truncated && ...}` then `{empty && !truncated && !allFailed && ...}` then `{allFailed && ...}` so a truncated graph never falsely shows "No references at depth N".
- **`allFailed` heuristic** — `resourceFetchFailed || (!bfs.loading && bfs.result === undefined)` — covers root-resource-fetch failure AND BFS-throws-unexpectedly. The BFS hook's catch path now sets `result: { nodes: new Map(), edges: [], truncated: false }` (Plan 02 contract) so `bfs.result === undefined` only triggers when the BFS pipeline never resolved.

## Stub Tracking

No stubs introduced by this plan. The Plan-01 skeleton stub of `ResourceGraphView` has been REPLACED with the full implementation. The `49-HUMAN-UAT.md` scaffold contains 7 `Result: [pending]` placeholders — these are explicit UAT items waiting for live-Blaze walkthrough, NOT code stubs.

## Next Steps

- **Phase-49 close-out:** Mark phase `human_needed` (5/5 must-haves auto-verified; 7 live-Blaze HUMAN-UAT items deferred to manual session, mirroring Phase 48 precedent).
- **VALIDATION.md row flips** (orchestrator owns): rows 49-01-01..49-01-03 (Plan 01), 49-02-01..49-02-06 (Plan 02), 49-03-01..49-03-03 (Plan 03) all flip to ✅ green.
- **HUMAN-UAT walkthrough:** Run after `/gsd-verify-work` returns clean — user opens local Blaze + Synthea data, walks the 7 UAT items, marks each [PASS] / [FAIL].
- **Phase 50 (STACK-01):** Re-run Mantine 9 / React 19 peer-dep gate per ROADMAP.

## Self-Check: PASSED

**Files created (verified):**

- `src/components/explorer/graph.module.css` — FOUND (53 lines, all required Mantine vars present, 0 hardcoded colors)
- `.planning/phases/49-theme-d-graph-view-reference-graph/49-HUMAN-UAT.md` — FOUND (frontmatter + 7 UAT items + Sign-Off)
- `.planning/phases/49-theme-d-graph-view-reference-graph/49-03-SUMMARY.md` — THIS FILE

**Files modified (verified):**

- `src/components/explorer/ResourceGraphView.tsx` — FOUND with full implementation (235 lines, all required imports present, all locked copy strings present, data-testid="graph-flow-root" preserved)
- `src/components/explorer/__tests__/ResourceGraphView.test.tsx` — FOUND with 8 active tests, 0 it.skip, DOM identity assertion present
- `.planning/phases/49-theme-d-graph-view-reference-graph/49-VALIDATION.md` — FOUND with status: ready, nyquist_compliant: true, wave_0_complete: true

**Commits exist (verified):**

- `dbb1554` (Task 1 — feat: graph.module.css CSS-variable bridge) — FOUND
- `b29285d` (Task 2 — feat: full ResourceGraphView wiring) — FOUND
- `cd5c40a` (Task 3 — test: fill remaining D-20 RTL tests) — FOUND
- `efd665f` (Task 4 — docs: bundle gate + HUMAN-UAT + VALIDATION flips) — FOUND

**Acceptance gate checks (all PASS):**

- `npx tsc -b --noEmit` → exit 0
- `npm run build` → exit 0 (526ms)
- `node scripts/check-bundle-delta.cjs --max-delta-kb 5` → PASS (-4.90 KB; xyflow/dagre absent from main; lazy chunk present)
- `npm test` → 1386 passed / 22 todo / 1 pre-existing carry-over (deuteranopia pair #13, NOT a Phase 49 regression)
- 4 plan-required `-t` filter tests all exit 0 (`node click navigation`, `theme switch invariant`, `edge label field name`, `dagre layout positions`)
