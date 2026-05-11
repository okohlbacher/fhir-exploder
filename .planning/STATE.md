---
gsd_state_version: 1.0
milestone: v1.9
milestone_name: Polish, Discovery & UAT Closure
status: active
last_updated: "2026-05-11T00:00:00.000Z"
last_activity: 2026-05-11
progress:
  total_phases: 0
  completed_phases: 0
  total_plans: 0
  completed_plans: 0
  percent: 0
---

# Project State

## Project Reference

See: .planning/PROJECT.md (updated 2026-05-04)

**Core value:** Connect to a Blaze FHIR server and make its contents human-readable and navigable without requiring deep FHIR expertise.
**Current focus:** v1.8 archived — run `/gsd-new-milestone` to start v1.9

## Current Position

Phase: Not started (defining requirements)
Plan: —
Status: Defining requirements
Last activity: 2026-05-11 — Milestone v1.9 started

## Performance Metrics

**Velocity:**

- Total plans completed (v1.7): 13 across 6 phases (46-51; Phase 50 closed `deferred` via WAIVE-AND-DEFER)
- Total plans completed (v1.6): 14 across 7 phases (39-45; Phase 45 closed `deferred` via WAIVE-AND-DEFER)
- Total plans completed (v1.5): 32 (79 tasks across 10 phases including inserted 38.1 + 38.2)
- Total plans completed (v1.4): 35 (51 tasks across 9 phases)
- Total plans completed (v1.3): 9 (16 tasks across 2 phases)
- Total plans completed (v1.2): 22 (across 7 phases)

## Accumulated Context

### Decisions (carry-forward to v1.8)

- **STACK-01 deferred indefinitely (2026-05-04):** Removed from Active requirements. Bottleneck remains `@medplum/react`'s `@mantine/core: ^8.0.0` peer pin. Will resurface only if user-requested or if the peer-dep range opens to `^9.x`.
- **Bearer tokens for VAL-06** stored in `localStorage` under `validator.bearerToken.v1` — NEVER persisted to settings.yaml on disk.
- **Curated reverse-reference catalog** (`reverseReferenceCatalog.ts`) — CapabilityStatement-driven discovery deferred to v1.9+. Add entries as real-world navigation reveals gaps.
- **`summarizeResource` contract: `{ primary, secondary? }` two-slot only** — no status field/pill. Extend to new resource types in v1.8 as needed (Phase 54 key-fields registry mirrors the same 8 typed entries).

### v1.8 Roadmap Locked Decisions

- **Drawer config:** `trapFocus={true}` + `withOverlay={false}` (a11y-safe; per RESEARCH PITFALLS #3).
- **Mode switcher widget:** Mantine `<Tabs variant="pills">` styled to look like SegmentedControl (preserves `keepMounted` + ARIA tablist semantics; per RESEARCH PITFALLS #4).
- **Global hotkey ownership:** Single shared `useShortcuts` / `useHotkeys` module owned by Phase 52 (foundation). Phase 54 (1/2/3/4) and Phase 56 (⌘K) extend it.
- **Spotlight resource-type list:** Lazy population (≥ 2 chars trigger) per RESEARCH (avoids upfront 94-action cost).

### Pending Todos (v1.9 scope — in progress)

- **Human UAT backlog (Phase 58 scope)** — deferred browser-only items. Full inventory in `.planning/phases/58-uat-backlog-closure/58-CONTEXT.md`. Summary:
  - **Group A** (no HUMAN-UAT files): Phase 42 (1), Phase 43 (3), Phase 44 (2)
  - **Group B** Phase 47 (4 items — BLOCKED-NO-DATA, need seed fixtures in Blaze)
  - **Group C** Phase 48 UAT-3 (1 item — Slow-3G skeleton, needs Chrome DevTools)
  - **Group D** Phase 49 UAT-1/2/3/4 (3–4 items — pan/zoom, minimap, dark-mode contrast, Slow-3G, need real browser)
  - **Group E** Phase 52 (3 items — drawer width, URL stability, focus ring)
  - **Group F** Phase 53 (4 items — Cmd+click resolve, error state, PatientList focus ring, async fetch)
  - **Group G** Phase 54 (6 items — pill tabs, keyboard shortcuts, graph canvas, chip colors, download, /graph redirect)
  - Phases 46, 48 UAT-1/2, 49 UAT-3/5/6/7, 55, 56, 57 — fully closed, nothing deferred
- **DEFERRED.md dashboard** — create at v1.8 milestone start to track all WAIVE-AND-DEFER items with re-attempt triggers (low priority since STACK-01 is now indefinitely deferred).

### Phase 53 Deliverables (carry-forward to Phase 54)

- **`src/contexts/PeekContext.tsx`** — now includes `openPeekError(reference, originElement?)` + nullable `PeekState.resource` + `error?`/`referenceText?` fields
- **`src/components/json/JsonPeekDrawer.tsx`** — error-state branch: monospace `referenceText` title, dimmed "Reference unresolvable" body, hidden Open-full button, Enter no-op
- **`src/components/explorer/ReferenceLink.tsx`** — Cmd+click intercepted: resolved → `openPeek`; failed → `openPeekError(rawText)`; pending → no-op
- **`src/components/explorer/RelatedResourcesPanel.tsx`** — Cmd+click: async first-resource fetch → `openPeek`; empty/error → `openPeekError`
- **`src/components/patients/PatientListPage.tsx`** — J shortcut wired (4th surface); `focusedPatient` + relatedTarget blur guard + indigo focus ring
- **Phase 52+53 Human UAT pending (Phase 58 scope)**: drawer visual width (420px), URL stability when J pressed, focus ring visibility (Phase 52); + 4 new Phase 53 items (see 53-HUMAN-UAT.md)

### Phase 54 Deliverables (carry-forward to Phase 55)

- **`src/utils/keyFieldsRegistry.ts`** — `getKeyFields(r): KeyFieldEntry[]` for 8 typed R4 types + generic fallback (4-6 fields per type)
- **`src/components/explorer/KeyFieldsTable.tsx`** — 2-column Mantine Table for Summary mode
- **`src/components/explorer/JsonModeView.tsx`** — JSON toolbar: Copy/Download/validation chip/Open-in-validator
- **`src/components/json/JsonViewer.tsx`** — extended with `showLineNumbers?: boolean` prop (PEEK-06 invariant preserved)
- **`src/components/explorer/ResourceDetailPage.tsx`** — full 4-mode shell: `Summary | Human | Graph | JSON`, URL-driven `?mode=`, `useShortcuts` for 1/2/3/4, lazy ResourceGraphView
- **`src/components/explorer/ResourceGraphView.tsx`** — `compact?: boolean` prop suppresses standalone header when embedded
- **`src/App.tsx`** — `NavigateToMode` adapter; legacy `/graph` routes → `?mode=graph` redirects
- **`DeveloperJsonView.tsx` deleted** — merged into JsonModeView; 0 remaining importers
- **Phase 54 Human UAT pending (Phase 58 scope)**: visual pill tabs, keyboard shortcuts, React Flow canvas, chip colors, file download, /graph redirect (6 items)

### Blockers/Concerns

- None. EXPL-01/02/03 fully shipped (Phase 55). Phase 56 (Sidebar v2 + Expert Toggle + ⌘K) is unblocked.

### Quick Tasks Completed

| # | Description | Date | Commit | Directory |
|---|-------------|------|--------|-----------|
| 260429-kqa | Align /quality Tier-1 filter inputs by moving Sample size description into a Tooltip | 2026-04-29 | aa80da4 | [260429-kqa-align-quality-tier-1-filter-inputs-by-mo](./quick/260429-kqa-align-quality-tier-1-filter-inputs-by-mo/) |
| 260429-kva | Fix FHIR server-switch bug + editable Settings page with Test Connection (dev-side dynamic proxy via Vite plugin + localStorage persistence) | 2026-04-29 | ba43422 | [260429-kva-fix-the-fhir-server-switch-bug](./quick/260429-kva-fix-the-fhir-server-switch-bug/) |
| Phase 56 P01 | 12 | 3 tasks | 6 files |
| Phase 56 P02 | 20 | 3 tasks | 9 files |

## Session Continuity

Last session: 2026-05-05T11:00:00.000Z
Stopped at: v1.8 milestone archived — tag v1.8 created
Next action: `/gsd-new-milestone` to start v1.9 planning (or run Phase 58 UAT manually — see 58-CONTEXT.md)
