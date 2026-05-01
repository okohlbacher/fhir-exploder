---
phase: 49
plan: 01
subsystem: explorer/graph
tags: [graph, lazy-route, code-split, dependency-pin, wave-0-scaffold]
nyquist_compliant: false
wave_0_complete: true
requires:
  - .planning/phases/49-theme-d-graph-view-reference-graph/49-CONTEXT.md
  - .planning/phases/49-theme-d-graph-view-reference-graph/49-RESEARCH.md
  - .planning/phases/49-theme-d-graph-view-reference-graph/49-VALIDATION.md
  - .planning/phases/49-theme-d-graph-view-reference-graph/49-UI-SPEC.md
  - src/App.tsx (lazy-route precedent at lines 48-88; Phase 27 EFF-02 idiom)
  - src/components/explorer/ResourceDetailPage.tsx (toolbar Group mount point)
  - src/utils/lazyRetry.ts (retry wrapper)
provides:
  - Lazy /explorer/:resourceType/:id/graph route (and patient-nested sibling)
  - ResourceGraphView skeleton stub (Wave-1 placeholder)
  - Graph button on ResourceDetailPage with IconAffiliate
  - 3 test scaffolds covering all 8 D-20 mandatory tests (1 active, 7 skipped)
  - scripts/check-bundle-delta.cjs gate + scripts/.bundle-baseline.json
affects:
  - src/App.tsx (+10 lines: 1 lazy declaration + 2 Route entries)
  - src/components/explorer/ResourceDetailPage.tsx (+19 lines: imports + button)
  - package.json (+2 exact-pinned deps)
tech-stack-added:
  - "@xyflow/react@12.10.2 (exact pin)"
  - "@dagrejs/dagre@3.0.0 (exact pin)"
patterns-introduced:
  - First lazy route under /explorer/* (extends Phase 27 EFF-02 idiom into a new surface)
  - Bundle-delta CI gate (scripts/check-bundle-delta.cjs reading dist/assets + gzip-9)
key-files-created:
  - src/components/explorer/ResourceGraphView.tsx
  - src/components/explorer/__tests__/ResourceGraphView.test.tsx
  - src/components/explorer/__tests__/useGraphBfs.test.ts
  - src/components/explorer/__tests__/ResourceGraphNode.test.tsx
  - scripts/check-bundle-delta.cjs
  - scripts/.bundle-baseline.json
key-files-modified:
  - src/App.tsx
  - src/components/explorer/ResourceDetailPage.tsx
  - package.json
  - package-lock.json
decisions:
  - D-01 standalone Graph button (NOT 4-mode shell — deferred)
  - D-02 route /explorer/:type/:id/graph (lazy)
  - D-03 button placement in toolbar Group, all resource types
  - IconAffiliate locked (UI-SPEC over IconShare/IconHierarchy/IconNetwork)
  - data-testid="graph-flow-root" on outermost div is theme-switch contract for D-20.4
metrics:
  duration_minutes: 7
  tasks_completed: 3
  commits: 3
  tests_passing_total: 1372
  tests_active_phase49: 1
  tests_skipped_phase49: 14
  bundle_delta_kb_gz: 0.26
  bundle_delta_cap_kb_gz: 5
completed_date: 2026-05-01
---

# Phase 49 Plan 01: Foundation — Lazy Graph Route + Graph Button + Wave 0 Scaffolds Summary

Wave-1 foundation for Theme D graph view: pinned `@xyflow/react@12.10.2` + `@dagrejs/dagre@3.0.0`, registered the lazy `/explorer/:type/:id/graph` route (and patient-nested sibling), mounted the IconAffiliate Graph button on `ResourceDetailPage`, and shipped the 3 test scaffolds + bundle-delta gate Plans 02/03 will build on.

## What Shipped

### Task 1 — Pinned deps + Wave 0 scaffolds + bundle-delta gate (commit `1bdcfe6`)

**Pinned dependencies (exact, no `^` / `~`):**

```json
"@dagrejs/dagre": "3.0.0",
"@xyflow/react": "12.10.2"
```

`npm ls @mantine/core` confirms Mantine 8.3.18 only — no Mantine 9 transitive pull (the Phase 50 STACK-01 gate would have triggered if either dep peered on Mantine 9).

**Test scaffolds** (all `it.skip` placeholders, vitest exits clean):

- `src/components/explorer/__tests__/useGraphBfs.test.ts` — 3 stubs (depth cap, node-count cap, parallel fanout). Plan 02 fills these in.
- `src/components/explorer/__tests__/ResourceGraphView.test.tsx` — 8 stubs covering the 5 D-20 mandatory tests + 3 RTL render tests. Task 3 of THIS plan filled the first stub ("Graph button mount") with a real RTL test; Plans 02 + 03 fill the rest.
- `src/components/explorer/__tests__/ResourceGraphNode.test.tsx` — 3 stubs (label render, tooltip on secondary, root-node accent border). Plan 02 fills these in.

**Bundle-delta gate** — `scripts/check-bundle-delta.cjs`:

- Reads `dist/assets/index-*.js`, gzip-9 compresses, compares to `scripts/.bundle-baseline.json`.
- CLI flags: `--max-delta-kb N` (default 5), `--update-baseline`.
- Rejects `xyflow` / `dagre` content in the main chunk (lazy boundary integrity check).
- Exits 0 PASS / 1 FAIL / 2 ENV-error.

**Baseline captured:** main chunk pre-Plan-02 = **332.74 KB gz** (`index-B2d830-Y.js`). Plan 03 Task 04 will run the gate against the final implementation to close GRPH-01 SC #1.

### Task 2 — ResourceGraphView skeleton + lazy route registration (commit `8ba4563`)

**`src/components/explorer/ResourceGraphView.tsx`** — Wave-1 skeleton stub:

- Named export `ResourceGraphView` (required by the lazy `.then((m) => ({ default: m.ResourceGraphView }))` shape per Phase 27 EFF-02).
- Reads `useParams<{ resourceType: string; id: string }>()`.
- Renders a Mantine `<Stack gap="lg" p="lg">` with the page heading + monospace `Type/id` subtitle + a single `<Skeleton h="60vh" radius="lg" />` placeholder.
- **Outermost div carries `data-testid="graph-flow-root"`** — load-bearing contract for Plan 03 Task 03's theme-switch invariant test (D-20.4).

**`src/App.tsx`** patch:

- Added a 9th lazy declaration after `IPSPanel`, mirroring the Phase 27 EFF-02 idiom verbatim:
  ```ts
  const ResourceGraphView = lazy(() =>
    retry(() => import('./components/explorer/ResourceGraphView')).then((m) => ({
      default: m.ResourceGraphView,
    })),
  );
  ```
- Registered both routes:
  - `/explorer/:resourceType/:id/graph` inside the `/explorer` block
  - `/patients/:patientId/:resourceType/:id/graph` inside the `/patients` block (preserves patient-context breadcrumb per RESEARCH §"Open Questions" Q-1)

**Verification:**

- `npx tsc -b --noEmit` → exit 0
- `npm run build` → exit 0; lazy chunk emitted: `dist/assets/ResourceGraphView-C_Spif8y.js`
- `node scripts/check-bundle-delta.cjs --max-delta-kb 5` → PASS (delta +0.06 KB gz; xyflow/dagre absent from main, present only in lazy chunk)

### Task 3 — Graph button + RTL navigation test (commit `e5754fa`)

**`src/components/explorer/ResourceDetailPage.tsx`** — toolbar `<Group>` extension:

- Imports extended: `Tooltip` added to the `@mantine/core` import; `IconAffiliate` added to the `@tabler/icons-react` import.
- New button inserted between "Back to results" and the `<Title>`:
  ```tsx
  <Tooltip label="Open the reference graph for this resource" withArrow>
    <Button
      variant="light"
      color="indigo"
      size="sm"
      leftSection={<IconAffiliate size={16} />}
      onClick={() =>
        navigate(
          patientId
            ? `/patients/${patientId}/${resourceType}/${id}/graph`
            : `/explorer/${resourceType}/${id}/graph`,
        )
      }
    >
      Graph
    </Button>
  </Tooltip>
  ```
- Button is visible for ALL resource types (D-03 contract — NOT gated by `resourceType`).
- Reuses the already-in-scope `navigate`, `patientId`, `resourceType`, `id` variables.

**RTL test** — `ResourceGraphView.test.tsx` first stub now active:

- Renders `<ResourceDetailPage />` under MemoryRouter at `/explorer/Patient/abc`.
- `vi.mock('@medplum/react-hooks')` + stable `readResource` / `get` mocks.
- `vi.mock('../../../hooks/useResolvedResource')` pass-through bypasses the terminology resolution path (HumanReadableView → useResolvedResource → useTerminology) since this test only cares about the toolbar contract.
- `screen.findByRole('button', { name: /^Graph$/i })` → finds button.
- `fireEvent.click` → `findByTestId('graph-page')` confirms route changed.

**Verification:**

- `npx vitest run -t "Graph button mount"` → 1 passed / 1407 skipped / 0 failed
- `npx tsc -b --noEmit` → exit 0
- `npm run build` → exit 0
- `node scripts/check-bundle-delta.cjs --max-delta-kb 5` → PASS (delta +0.26 KB gz; main chunk 333.00 KB; lazy chunk `ResourceGraphView-*.js` still present)

## Test Gate

**Full suite result:** 1372 passed / 13 skipped / 22 todo / 1 failed (`pair #13 'kardiologie ↔ mikrobiologie'` deuteranopia ΔE2000 — Phase 40 carry-over already documented in `.planning/deferred-items.md`, NOT a Phase 49 regression).

**Phase 49 test count:** 1 active passing test (Graph button mount) + 14 it.skip stubs awaiting Plans 02 + 03 (3 in useGraphBfs, 7 in ResourceGraphView, 3 in ResourceGraphNode, plus the 1 active in ResourceGraphView).

## Bundle Budget

| Step | Main chunk gz | Delta vs. baseline | Lazy chunk |
|------|---------------|--------------------|-----------|
| Pre-Plan-01 (baseline captured) | 332.74 KB | (baseline) | none |
| After Task 2 (lazy route registered) | 332.80 KB | +0.06 KB | `ResourceGraphView-C_Spif8y.js` |
| After Task 3 (Graph button mounted) | 333.00 KB | +0.26 KB | `ResourceGraphView-C_Spif8y.js` |
| Cap (Plan 03 Task 04 acceptance) | — | ≤ +5 KB | required |

`xyflow/dagre` content **never** leaks into the main chunk — verified by the gate's grep against `mainChunkText` for both module identifiers.

## Mantine Peer Compatibility

`npm ls @mantine/core` after dep install:

```
fhir-exploder@0.0.0 /Users/kohlbach/Claude/Exploder
+-- @mantine/charts@8.3.18
| `-- @mantine/core@8.3.18 deduped
+-- @mantine/core@8.3.18
+-- @mantine/dates@8.3.18
| `-- @mantine/core@8.3.18 deduped
+-- @mantine/notifications@8.3.18
| `-- @mantine/core@8.3.18 deduped
+-- @mantine/spotlight@8.3.18
| `-- @mantine/core@8.3.18 deduped
`-- @medplum/react@5.1.7
  `-- @mantine/core@8.3.18 deduped
```

5 entries at `@mantine/core@8.x`, **0 entries** at `@mantine/core@9.x`. Phase 50 STACK-01 gate untouched.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 — Blocking] Mock client missing `getProfile`**
- **Found during:** Task 3 RED phase
- **Issue:** Initial test used `MedplumProvider` from `@medplum/react-hooks` directly with a hand-rolled `MedplumClient` mock; `MedplumProvider` calls `client.getProfile()` on mount, which my mock didn't implement → `TypeError: t.getProfile is not a function`.
- **Fix:** Switched to the project's existing pattern (used in `IncomingReferencesPanel.test.tsx`, `HumanReadableView.read-phase.test.tsx`, etc.): `vi.mock('@medplum/react-hooks', () => ({ useMedplum: () => stableClient }))` returns a small surface object with just `readResource`, `get`, `fhirUrl` — no `MedplumProvider` wrapper, no `getProfile` requirement.
- **Files modified:** `src/components/explorer/__tests__/ResourceGraphView.test.tsx`
- **Commit:** `e5754fa`

**2. [Rule 3 — Blocking] Test cascading into HumanReadableView → useResolvedResource → useTerminology**
- **Found during:** Task 3 RED phase (after fix #1)
- **Issue:** `ResourceDetailPage` renders `<HumanReadableView>` once the resource resolves; HumanReadableView calls `useResolvedResource()` which calls `useTerminology()` which throws "must be used within a TerminologyProvider" outside a `<TerminologyProvider>`. The test deliberately doesn't wrap in TerminologyProvider since it's testing the toolbar, not terminology.
- **Fix:** Added `vi.mock('../../../hooks/useResolvedResource', () => ({ useResolvedResource: <T,>(r: T): T => r }))` — the same pass-through mock pattern used in `HumanReadableView.read-phase.test.tsx:32-34`.
- **Files modified:** `src/components/explorer/__tests__/ResourceGraphView.test.tsx`
- **Commit:** `e5754fa`

Both deviations are Rule 3 (auto-fix blocking issues) — they prevented the test from running at all, are caused directly by Task 3's changes (the test file is new in this task), and the project already has the canonical fix pattern documented in two existing test files.

### Other deviations

None. The plan executed exactly as written for Tasks 1, 2, and the Task 3 production code.

## Authentication Gates

None. The plan involves no external auth or secrets.

## Self-Check

See section below.

## Decisions Made

- **D-01..D-20 already locked** in 49-CONTEXT.md before this plan; this plan implements the foundation slice (D-01 standalone button, D-02 route, D-03 button placement, IconAffiliate from UI-SPEC).
- **No new architectural decisions** introduced by Plan 01.

## Next Steps

- **Plan 02 (49-02):** Implement `useGraphBfs` hook + `ResourceGraphNode` component + `applyDagreLayout` helper. Fills the 3 useGraphBfs stubs and 3 ResourceGraphNode stubs + RTL render tests for the node component.
- **Plan 03 (49-03):** Wire `<ReactFlowProvider>` + `<Controls>` + `<MiniMap>` + theme bridge `graph.module.css` (D-11). Fill the remaining 7 ResourceGraphView stubs (depth-1 graph render, node-click navigation, theme-switch invariant, parallel-fetch fanout, dagre positions). Run bundle-delta gate against final implementation. Create `49-HUMAN-UAT.md` scaffold.
- **VALIDATION.md updates** (after Plan 03 closes): flip rows 49-01-01, 49-01-02, 49-01-03 from `⬜ pending` to `✅ green`; the orchestrator owns this write.

## Self-Check: PASSED

**Files created (verified):**

- `src/components/explorer/ResourceGraphView.tsx` — FOUND
- `src/components/explorer/__tests__/ResourceGraphView.test.tsx` — FOUND
- `src/components/explorer/__tests__/useGraphBfs.test.ts` — FOUND
- `src/components/explorer/__tests__/ResourceGraphNode.test.tsx` — FOUND
- `scripts/check-bundle-delta.cjs` — FOUND
- `scripts/.bundle-baseline.json` — FOUND

**Files modified (verified):**

- `src/App.tsx` — FOUND with new lazy + 2 routes
- `src/components/explorer/ResourceDetailPage.tsx` — FOUND with IconAffiliate + Tooltip + Graph button
- `package.json` — FOUND with `"@xyflow/react": "12.10.2"` + `"@dagrejs/dagre": "3.0.0"` (exact)
- `package-lock.json` — FOUND, both packages locked

**Commits exist (verified):**

- `1bdcfe6` (Task 1 — chore: pin deps + Wave 0 scaffolds) — FOUND
- `8ba4563` (Task 2 — feat: lazy route + skeleton stub) — FOUND
- `e5754fa` (Task 3 — feat: Graph button + RTL test) — FOUND
