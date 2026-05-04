# Phase 54: 4-Mode Resource Shell - Discussion Log

> **Audit trail only.** Do not use as input to planning, research, or execution agents.
> Decisions are captured in CONTEXT.md — this log preserves the alternatives considered.

**Date:** 2026-05-04
**Phase:** 54-4-mode-resource-shell
**Mode:** `--auto` (all areas auto-selected; recommended options chosen)
**Areas discussed:** Summary Mode Layout, Key-Fields Registry, URL Mode Param, JSON Mode Enhancements, Graph Mode Integration

---

## Summary Mode Layout

| Option | Description | Selected |
|--------|-------------|----------|
| Full-width stacked | Property table above, reference panels below; consistent with existing design | ✓ |
| 2-col side-by-side | Property table left, reference cards right (matches SHELL-02 literal "side cards" wording) | |
| Deferred to Phase 57 | Skip reference cards in Phase 54 entirely | |

**Auto-selected:** Full-width stacked  
**Notes:** "Side cards" in SHELL-02 is interpreted as visual cards (styled card components), not 2-column grid layout. Side-by-side would be complex and inconsistent with existing RelatedResourcesPanel full-width design. `IncomingReferencesPanel` and `PatientRelatedResources` move to Summary-only visibility. "References out" card is Claude's discretion (may defer to Phase 57 if complex).

---

## Key-Fields Registry

| Option | Description | Selected |
|--------|-------------|----------|
| New keyFieldsRegistry.ts | Separate from summarizeResource; string-extraction functions per type | ✓ |
| Extend summarizeResource | Add a `keyFields` array to the existing registry | |
| Use ResourcePropertyTable | Filter existing table to show fewer keys | |

**Auto-selected:** New keyFieldsRegistry.ts  
**Notes:** Clean separation from summarizeResource (which returns {primary, secondary} strings for list display). Key-fields registry returns `{label, value}[]` for property table display. Covers same 8 R4 types + generic fallback. Claude has full discretion on specific field selection (4–6 per type).

---

## URL Mode Param

| Option | Description | Selected |
|--------|-------------|----------|
| useSearchParams + ?mode= | Standard React Router v7 pattern; works with existing routing | ✓ |
| State-only (no URL) | Simpler but breaks deep-linking and Phase 52 D-10 (Enter → ?mode=json) | |
| New sub-routes | /explorer/:type/:id/summary etc — complex, breaks existing routes | |

**Auto-selected:** useSearchParams + ?mode=  
**Notes:** `?mode=` is already emitted by Phase 52 drawer Enter handler (`?mode=json`). Phase 54 must read and honor it. Default = `summary`. `/graph` sub-routes become `<Navigate replace>` redirects to `?mode=graph`. Use `{ replace: true }` on mode switches to avoid history accumulation.

---

## JSON Mode Enhancements

| Option | Description | Selected |
|--------|-------------|----------|
| Offline structural validator chip | `createStructuralBackend()` from quality module; PHI-safe; issue count badge | ✓ |
| External validator chip | POST to validator.fhir.org; network call; PHI exposure risk | |
| No validation chip | Skip SHELL-04 chip; just Copy + Download | |

**Auto-selected:** Offline structural validator chip  
**Notes:** Structural validator is synchronous, offline, already used in the Quality module. No PHI transmitted. Issue count badge colors match Quality dashboard (teal=0, yellow=N). Copy = clipboard API. Download = Blob + `${resourceType}-${id}.json`. "Open in validator" = in-app `/quality` link (not external). Line numbers in JsonViewer = Claude's discretion (assess in research).

---

## Graph Mode Integration

| Option | Description | Selected |
|--------|-------------|----------|
| React.lazy inline in Tabs.Panel | Reuses Phase 49 component; /graph routes become Navigate redirects | ✓ |
| Copy ResourceGraphView into ResourceDetailPage | Duplicate code; avoid | |
| Keep /graph route as primary | No URL mode persistence; inconsistent with SHELL-01 | |

**Auto-selected:** React.lazy inline in Tabs.Panel  
**Notes:** Phase 49 `ResourceGraphView` already lazy-loaded in App.tsx using the `retry()` wrapper. Same pattern in `<Tabs.Panel value="graph">` with Suspense fallback. App.tsx removes `/graph` sub-routes and adds `<Navigate replace to="?mode=graph">` at those paths. The existing "Graph" button/Tooltip in ResourceDetailPage header is removed.

---

## Claude's Discretion

- Exact key-field selection per resource type (label text, which fields)
- Whether "References out" card is implemented in Phase 54 or deferred to Phase 57
- Whether `JsonViewer` gets a `showLineNumbers` prop
- Exact Suspense fallback height for graph mode
- Whether `KeyFieldsTable` shares any internals with `ResourcePropertyTable`

## Deferred Ideas

- Expert toggle default mode (Phase 56)
- Patient-specific Summary mode with MII tabs (Phase 57)
- External `validator.fhir.org` link with resource encoding (v1.9)
- URL history management tuning (UAT phase)
