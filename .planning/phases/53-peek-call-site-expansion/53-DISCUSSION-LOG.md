# Phase 53: Peek Call-Site Expansion - Discussion Log

> **Audit trail only.** Do not use as input to planning, research, or execution agents.
> Decisions are captured in CONTEXT.md — this log preserves the alternatives considered.

**Date:** 2026-05-04
**Phase:** 53-peek-call-site-expansion
**Mode:** --auto (all areas auto-resolved with recommended defaults)
**Areas discussed:** Reference Chip Intercept, Drawer Error State, Patients List J Shortcut, RelatedResourcesPanel Cmd+click

---

## Reference Chip Intercept (PEEK-04)

| Option | Description | Selected |
|--------|-------------|----------|
| Intercept in `ResourceDetailPage.handleReferenceClick` | Centralized — one place to change; but requires passing resource back from handleReferenceClick | |
| Intercept in `ReferenceLink.tsx` onClick | Direct access to resolved Resource; minimal surface area; stopPropagation prevents double-firing with parent interceptor | ✓ |

**Auto-selected:** Intercept in `ReferenceLink.tsx`
**Notes:** `ReferenceLink` already holds the resolved Resource from `useReferenceResolver` — no additional lookup needed for the `resolved` path. `e.stopPropagation()` prevents the event from bubbling to `ResourceDetailPage.handleReferenceClick`.

---

## Drawer Error State (PEEK-04)

| Option | Description | Selected |
|--------|-------------|----------|
| Toast notification | Standard error pattern; but REQUIREMENTS explicitly says "no toast" | |
| Inline text in current page | No drawer interaction | |
| Inline in drawer body | Opens drawer with error in body; title shows the reference; consistent with existing drawer pattern | ✓ |

**Auto-selected:** Inline in drawer body
**Notes:** Extends `PeekState` with optional `error?: string` and `referenceText?: string`. When error is set, `JsonPeekDrawer` shows error text instead of `JsonViewer`. `[Open full →]` button is hidden in error state.

---

## Patients List J Shortcut (PEEK-05 surface 2)

| Option | Description | Selected |
|--------|-------------|----------|
| tabIndex + useShortcuts in PatientListPage (same as Phase 52) | Consistent pattern; proven in SearchResultsPage | ✓ |
| Separate keyboard handler per PatientRow | Per-row complexity; harder to maintain single focusedPatient state | |

**Auto-selected:** tabIndex + useShortcuts in PatientListPage (Phase 52 pattern)
**Notes:** `PatientRow` gets `onFocus`/`onBlur` props. Focus state lives in parent. Same relatedTarget onBlur guard as Phase 52.

---

## RelatedResourcesPanel Cmd+click (PEEK-05 surfaces 3+4)

| Option | Description | Selected |
|--------|-------------|----------|
| Navigate to search results page; count as surface via subsequent J | Two-step interaction; doesn't truly count as peek from the card | |
| Add Cmd+click → fetch first resource → openPeek | Single interaction; true first-class peek from card surface | ✓ |
| Show a list picker when count > 1 | Complex UI; out of scope | |

**Auto-selected:** Cmd+click → fetch first resource → openPeek
**Notes:** Only fires when count > 0. Uses `client.searchResources(_count=1)`. Works on both `IncomingReferencesPanel` and `PatientRelatedResources` (both use `RelatedResourcesPanel`). No loading spinner — local Blaze is fast enough.

---

## Claude's Discretion

- Whether to add Cmd+click tooltip affordance on ReferenceLink anchors
- Whether `openPeekError` reuses or separates from `openPeek` code path
- Exact `client.searchResources` vs `client.search` call style for first-resource fetch

## Deferred Ideas

- Hover-peek 4-line JSON preview tooltip — explicitly out of scope per REQUIREMENTS.md
- Arrow-key row navigation in PatientListPage
- Optimistic drawer open during async fetch in RelatedResourcesPanel Cmd+click
