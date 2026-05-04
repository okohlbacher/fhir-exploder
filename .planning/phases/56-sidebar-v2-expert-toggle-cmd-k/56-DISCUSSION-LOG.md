# Phase 56: Sidebar v2 + Expert Toggle + ⌘K — Discussion Log

> **Audit trail only.** Do not use as input to planning, research, or execution agents.
> Decisions are captured in CONTEXT.md — this log preserves the alternatives considered.

**Date:** 2026-05-04
**Phase:** 56-sidebar-v2-expert-toggle-cmd-k
**Mode:** --auto (all decisions auto-selected)
**Areas discussed:** Spotlight trigger, Spotlight mount, Spotlight actions, Expert Toggle state, Expert Toggle placement, Expert Toggle effects, Sidebar v2 polish, Wave structure

---

## ⌘K Spotlight trigger mechanism

| Option | Description | Selected |
|--------|-------------|----------|
| Extend `useShortcuts` | Add modifier key support to existing hook | |
| `useHotkeys` from `@mantine/hooks` | Separate hook for ⌘K | |
| Spotlight built-in `shortcut` prop | `SpotlightProvider shortcut="mod+K"` — Mantine owns the listener | ✓ |

**Auto-selected:** Spotlight built-in — cleanest integration, no `useShortcuts` changes needed.

---

## Spotlight mounting location

| Option | Selected |
|--------|----------|
| `main.tsx` / `App.tsx` outermost wrapper | |
| `AppLayout.tsx` (recommended) — wraps Navbar + Main | ✓ |
| `ExplorerLayout.tsx` only | |

**Auto-selected:** `AppLayout.tsx` — available from all pages.

---

## Spotlight action types

| Option | Selected |
|--------|----------|
| Resource-type navigation only (MVP) | ✓ |
| Resource-type + recently visited resources | |
| Resource-type + cross-type search | |

**Auto-selected:** Resource-type navigation only — aligns with locked decision (lazy ≥ 2 chars trigger).

---

## Expert Toggle: state

| Option | Selected |
|--------|----------|
| Local component state (lost on nav) | |
| `useLocalStorage` key `app.expertMode.v1` via `ExpertModeContext` | ✓ |
| URL param `?expert=1` | |

**Auto-selected:** `useLocalStorage` + Context — persists across sessions, accessible everywhere.

---

## Expert Toggle: placement

| Option | Selected |
|--------|----------|
| Sidebar footer compact Switch row | ✓ |
| Settings page only | |
| Floating badge overlay | |

**Auto-selected:** Sidebar footer — discoverable, minimal footprint, consistent with nav design.

---

## Expert Toggle: UI effects

| Option | Selected |
|--------|----------|
| ID cell full UUID (drop truncation) | ✓ |
| Server URL in sidebar Server card | ✓ |
| Raw FHIR field names in HumanReadableView | (deferred) |

**Auto-selected:** Two concrete, immediately useful effects scoped to Explorer + Sidebar.

---

## Sidebar v2 polish

| Option | Selected |
|--------|----------|
| ⌘K discovery hint in sidebar | ✓ |
| Explorer nav count badge | ✓ |
| Collapsible sidebar (icon-only mode) | (deferred) |

**Auto-selected:** ⌘K hint + count badge — both are low-risk additions that improve discoverability.

---

## Claude's Discretion

- `getCategoryLabel()` utility implementation (fhir-categories.ts lookup)
- Exact styling of the ⌘K search row in sidebar (size, border, radius)
- Whether to lazy-import spotlight styles or include in main CSS

## Deferred Ideas

- Recently visited resources in Spotlight
- Global cross-type FHIR search in Spotlight
- Sidebar collapsible icon-only mode
- Expert mode JSON field name overlay in HumanReadableView
