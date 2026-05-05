---
gsd_state_version: 1.0
milestone: v1.8
milestone_name: -- Navigation Redesign (in progress, started 2026-05-04)
status: verifying
stopped_at: Phase 57 UI-SPEC approved
last_updated: "2026-05-05T04:24:40.689Z"
last_activity: 2026-05-04
progress:
  total_phases: 7
  completed_phases: 6
  total_plans: 15
  completed_plans: 16
  percent: 100
---

# Project State

## Project Reference

See: .planning/PROJECT.md (updated 2026-05-04)

**Core value:** Connect to a Blaze FHIR server and make its contents human-readable and navigable without requiring deep FHIR expertise.
**Current focus:** Phase 56 — sidebar-v2-expert-toggle-cmd-k

## Current Position

Phase: 56
Plan: Not started
Status: Phase complete — ready for verification
Last activity: 2026-05-04

v1.8 phases (52-58):

- **Phase 52: JSON Peek Drawer Foundation (PEEK-01, PEEK-02, PEEK-03, PEEK-06) — COMPLETE**
- **Phase 53: Peek Call-Site Expansion (PEEK-04, PEEK-05) — COMPLETE**
- **Phase 54: 4-Mode Resource Shell (SHELL-01, SHELL-02, SHELL-03, SHELL-04) — COMPLETE**
- **Phase 55: Explorer Improvements (EXPL-01, EXPL-02, EXPL-03) — COMPLETE**
- Phase 56: Sidebar v2 + Expert Toggle + ⌘K (SIDE-01, SIDE-02, SIDE-03, SIDE-04)
- Phase 57: Patients-as-Lens (LENS-01, LENS-02)
- Phase 58: UAT Backlog Closure (UAT-01)

Progress: [####      ] 57%

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

### Pending Todos (v1.8 milestone)

- **Human UAT backlog (Phase 58 scope)** — ~24 deferred browser-only items across v1.6 + v1.7 + v1.8 phases:
  - Phase 42: 1 item (live-Blaze MII extension count walk)
  - Phase 43: 3 items (basic-auth URL, bearer-token URL, invalid-SNOMED near-miss)
  - Phase 44: 2 items (live-Blaze server-picker mode + large-bundle perf)
  - Phase 46: 3 items (summarizeResource visual rendering on live Blaze)
  - Phase 47: 5 items (tooltip hover, accordion animation, extension chips, terminology in contained panels, indexed-primitive extension)
  - Phase 48: 3 items (RelatedResourcesPanel live rendering)
  - Phase 49: 5 items (graph layout, node navigation, patient-context badge, depth limit badge, empty-state)
  - Phase 52: 3 items (drawer visual width 420px, URL stability when J pressed, focus ring visibility)
  - Phase 53: 4 items (resolved Cmd+click live Blaze, error state visual, PatientList focus ring, RelatedResourcesPanel async fetch)
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

Last session: 2026-05-05T04:24:40.684Z
Stopped at: Phase 57 UI-SPEC approved
Resume file: .planning/phases/57-references-out-card/57-UI-SPEC.md
Next action: `/gsd-discuss-phase 56` or `/gsd-plan-phase 56`
