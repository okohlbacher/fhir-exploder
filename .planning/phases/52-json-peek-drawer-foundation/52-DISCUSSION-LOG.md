# Phase 52: JSON Peek Drawer Foundation - Discussion Log

> **Audit trail only.** Do not use as input to planning, research, or execution agents.
> Decisions are captured in CONTEXT.md — this log preserves the alternatives considered.

**Date:** 2026-05-04
**Phase:** 52-json-peek-drawer-foundation
**Mode:** --auto (all areas auto-resolved with recommended defaults)
**Areas discussed:** JsonViewer Extraction, Row Focus Model, Drawer Mount Point, useShortcuts Design, PeekContext API

---

## JsonViewer Extraction

| Option | Description | Selected |
|--------|-------------|----------|
| Rename JsonTreeView → JsonViewer | Minimal rename + move to src/components/json/ | |
| Create composite JsonViewer | Wraps JsonTreeView + ScrollArea; DeveloperJsonView calls JsonViewer | ✓ |

**Auto-selected:** Create composite JsonViewer
**Notes:** Satisfies the grep gate in success criterion 4. JsonSyntaxHighlight.tsx excluded — not used by DeveloperJsonView, not part of the dedup target.

---

## Row Focus Model

| Option | Description | Selected |
|--------|-------------|----------|
| tabIndex={0} + onFocus/onBlur | Semantic HTML, accessible, standard Mantine table pattern | ✓ |
| Hover tracking | Less accessible, not keyboard-navigable | |
| Arrow key navigation | Heavier implementation, not required by PEEK-01 | |

**Auto-selected:** tabIndex={0} + onFocus/onBlur
**Notes:** Mirrors existing input-focus-guard pattern in ResourceDetailPage. Origin element stored for PEEK-02 focus return.

---

## Drawer Mount Point

| Option | Description | Selected |
|--------|-------------|----------|
| AppLayout.tsx (app-wide) | PeekProvider wraps Outlet; all routes can open drawer | ✓ |
| ExplorerLayout only | Scoped to /explorer — Phase 53 surfaces can't access | |

**Auto-selected:** AppLayout.tsx
**Notes:** ROADMAP explicitly calls for AppLayout mount. Required for Phase 53 multi-surface expansion.

---

## useShortcuts Hook Design

| Option | Description | Selected |
|--------|-------------|----------|
| Shared useShortcuts hook | New src/hooks/useShortcuts.ts, extended by Phases 54+56 | ✓ |
| Raw addEventListener per component | Matches existing ResourceDetailPage pattern (interim) | |

**Auto-selected:** Shared useShortcuts hook
**Notes:** ROADMAP cross-phase note locks this — "Phase 52 ships a single shared useShortcuts / useHotkeys module that all later phases extend." ResourceDetailPage migration deferred to Phase 54.

---

## PeekContext API

| Option | Description | Selected |
|--------|-------------|----------|
| React context with openPeek(resource, origin) | Standard context pattern matching ConnectionContext/SettingsContext | ✓ |
| useDisclosure in AppLayout (prop drilling) | Too many layers for Phase 53 deep call sites | |

**Auto-selected:** React context
**Notes:** Stores `{ resource, originElement }` to support PEEK-02 focus return. Pattern matches existing context files in src/contexts/.

---

## Claude's Discretion

- ScrollArea height in drawer context (use `100%` — drawer manages own scroll)
- onBlur timing to prevent focus flicker on row click
- Whether to use `relatedTarget` check or timeout for blur debounce

## Deferred Ideas

- Copy/Download in drawer → Phase 54 (SHELL-04)
- Validation chip in drawer → Phase 54
- PatientListPage J wiring → Phase 53 (PEEK-05)
- Reference chip Cmd+click → Phase 53 (PEEK-04)
