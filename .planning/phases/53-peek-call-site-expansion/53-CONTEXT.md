# Phase 53: Peek Call-Site Expansion - Context

**Gathered:** 2026-05-04
**Status:** Ready for planning

<domain>
## Phase Boundary

Phase 53 expands JSON peek drawer access to every list/reference surface in normal navigation:
1. `Cmd/Ctrl+click` on any reference chip (`ReferenceLink` anchor) opens the drawer with the resolved resource, or shows "Reference unresolvable" inline when resolution fails (PEEK-04)
2. Wire `J` keystroke on focused `PatientListPage` rows — Patients list becomes the second `J`-shortcut surface (PEEK-05 surface 2)
3. `Cmd/Ctrl+click` on `RelatedResourcesPanel` cards (used by both `IncomingReferencesPanel` and `PatientRelatedResources`) fetches and peeks the first matching resource (PEEK-05 surfaces 3+4)

Requirements in scope: PEEK-04, PEEK-05.
NOT in scope: PatientListPage-as-lens rebrand (Phase 57), mode switcher (Phase 54), Explorer density controls (Phase 55).

Surfaces after Phase 53:
1. Explorer table — J key (Phase 52 ✓)
2. Patients list — J key (this phase)
3. Human-mode reference rows — Cmd/Ctrl+click on `ReferenceLink` (this phase)
4. IncomingReferencesPanel + PatientRelatedResources cards — Cmd/Ctrl+click (this phase)

</domain>

<decisions>
## Implementation Decisions

### Reference Chip Intercept (PEEK-04)
- **D-01:** Intercept Cmd/Ctrl+click in `ReferenceLink.tsx` via an `onClick` handler on the Anchor elements in both the `resolved` and `failed` render paths (NOT in `ResourceDetailPage.handleReferenceClick` — that interceptor handles plain clicks for in-app navigation; Cmd+click is a distinct action). When `e.metaKey || e.ctrlKey`:
  - `status === 'resolved'`: call `openPeek(resource, document.activeElement as HTMLElement | null)` + `e.preventDefault()` + `e.stopPropagation()`. `e.stopPropagation()` prevents the event from bubbling to the parent div's `handleReferenceClick` (which handles ONLY plain navigation — stopping it is correct).
  - `status === 'failed'`: call `openPeekError('Reference unresolvable', document.activeElement)` + `e.preventDefault()`
  - `status === 'pending'`: no-op — let the anchor behave normally (resource not yet available)
- **D-02:** `ReferenceLink` calls `usePeek()` to get `openPeek` and `openPeekError`. `ReferenceLink` is rendered inside `ResourceDetailPage` which is inside `AppLayout → PeekProvider`, so the context is available.

### Drawer Error State (PEEK-04)
- **D-03:** Extend `PeekState` in `src/contexts/PeekContext.tsx` with optional `error?: string`. When `error` is set, the drawer body renders `<Text c="dimmed">Reference unresolvable</Text>` instead of `<JsonViewer>`. Change `resource` in `PeekState` from `Resource` to `Resource | null` (null when in error state).
- **D-04:** Add `openPeekError(reference: string, originElement?: HTMLElement | null): void` to `PeekContextValue`. The `reference` string (e.g., `"Patient/123"`) is used as the drawer title. Sets `peekState = { resource: null, originElement, error: 'Reference unresolvable', referenceText: reference }`.
- **D-05:** `JsonPeekDrawer` drawer title: when `peekState.resource` is null, display `peekState.referenceText ?? 'Reference'` in `ff="monospace"`. The `[Open full →]` button is hidden when resource is null (no resource to navigate to). Body shows `<Text c="dimmed">Reference unresolvable</Text>`.
- **D-06:** `PeekState.referenceText?: string` — optional field to hold the raw reference string (used as title in error state). When `resource` is non-null, the title continues to derive from `resource.resourceType/resource.id` as before.

### Patients List J Shortcut (PEEK-05 surface 2)
- **D-07:** Add `focusedPatient: Patient | null` state + `useShortcuts({ j: handleJ })` to `PatientListPage`. `handleJ` calls `openPeek(focusedPatient as Resource, document.activeElement)` when `focusedPatient !== null`; silent no-op otherwise (same pattern as Phase 52 SearchResultsPage).
- **D-08:** Add `tabIndex={0}` + `onFocus?: () => void` + `onBlur?: (e: React.FocusEvent<HTMLTableRowElement>) => void` to `PatientRow` component props. Parent `PatientListPage` passes handlers that set/clear `focusedPatient`.
- **D-09:** `onBlur` uses the same `relatedTarget`/`tbody.contains(next)` guard as Phase 52 to prevent flicker when focus moves from one row to another within the table. Same indigo `var(--accent-ring)` focus outline (2px, -1px offset) via inline `style`.
- **D-10:** `PatientListPage` passes `focusedPatient` down to each `PatientRow` to conditionally apply the focus ring style (matching Phase 52 pattern).

### RelatedResourcesPanel Cmd+click (PEEK-05 surfaces 3+4)
- **D-11:** Add Cmd/Ctrl+click handler to `<Card>` elements in `RelatedResourcesPanel.tsx`. When `e.metaKey || e.ctrlKey` on a card:
  1. `e.stopPropagation()` (prevents navigation from the plain `onClick`)
  2. Check `counts[entryKey(e)]`: if still loading or 0, no-op (nothing to peek)
  3. Fetch first resource: `client.searchResources(entry.type as ResourceType, { [entry.param]: refValue, _count: '1' })[0]`
  4. If result: `openPeek(result, document.activeElement as HTMLElement | null)`
  5. If no result or error: `openPeekError('Reference unresolvable', document.activeElement)`
- **D-12:** `RelatedResourcesPanel` calls `usePeek()` and `useMedplum()` (already uses `useMedplum` for count fetches). `client.searchResources()` returns `Resource[]` directly.
- **D-13:** The Cmd+click fetch is a one-shot async call — no loading spinner in the card. If the user Cmd+clicks and the drawer opens with a brief delay, that is acceptable (local Blaze is fast). No additional loading state needed.
- **D-14:** Both `IncomingReferencesPanel` (non-Patient reverse refs) and `PatientRelatedResources` (Patient forward refs) use `RelatedResourcesPanel`, so Cmd+click peek is free on BOTH surfaces. `PatientRelatedResources` cards count as PEEK-05 surface 4.

### Test Strategy (PEEK-05 verification)
- **D-15:** Each of the 4 surfaces requires a vitest test:
  - Explorer table J: `src/__tests__/peek-srp-integration.test.tsx` (Phase 52, done ✓)
  - Patients list J: `src/__tests__/peek-patients-integration.test.tsx` (new)
  - Human-mode reference rows: `src/__tests__/peek-reference-link.test.tsx` (new)
  - IncomingReferences/RelatedResources: `src/__tests__/peek-related-resources.test.tsx` (new)

### Claude's Discretion
- Whether to add a visual affordance (e.g., cursor change or `Cmd` modifier hint tooltip) to ReferenceLink anchors to communicate that Cmd+click opens the peek drawer — not required by PEEK-04, but improves discoverability. Claude may add a subtle tooltip if straightforward.
- Whether `openPeekError` reuses the same `openPeek` code path with `resource = null` or has a separate code path in `PeekProvider`. Either approach is acceptable.
- Exact `_count=1` fetch in RelatedResourcesPanel — consider reusing `client.search()` or `client.searchResources()` per project pattern.

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Requirements
- `.planning/REQUIREMENTS.md` §JSON Peek Drawer (PEEK-04, PEEK-05) — exact acceptance criteria
- `.planning/ROADMAP.md` §Phase 53 — success criteria (4 surfaces, error state, reference chip behavior)

### Phase 52 Foundation (everything Phase 53 builds on)
- `src/contexts/PeekContext.tsx` — PeekProvider, usePeek(), openPeek() — Phase 53 extends this
- `src/hooks/useShortcuts.ts` — shared keyboard hook — PatientListPage uses this
- `src/components/json/JsonPeekDrawer.tsx` — extend for error state rendering (D-05)
- `src/components/json/JsonViewer.tsx` — single source-of-truth renderer (unchanged in Phase 53)
- `src/components/explorer/SearchResultsPage.tsx` — reference implementation of J-shortcut wiring pattern (tabIndex, focusedResource, useShortcuts, relatedTarget guard)

### Files to modify in Phase 53
- `src/components/explorer/ReferenceLink.tsx` — add Cmd+click handler (D-01, D-02)
- `src/components/explorer/RelatedResourcesPanel.tsx` — add Cmd+click handler (D-11..D-14)
- `src/components/patients/PatientListPage.tsx` — add J-shortcut wiring (D-07..D-10)

### Architecture Notes
- `.planning/STATE.md` §Phase 52 Deliverables — PeekContext API carried forward

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- `src/hooks/useReferenceResolver.ts` — Phase 47 session-level cache (`Map<${type}/${id}, Resource | null>`). Already used by `ReferenceLink`. Resolved Resource is available synchronously in the `status === 'resolved'` render path — no additional fetch needed for PEEK-04.
- `useShortcuts(shortcuts, enabled?)` — already implemented (Phase 52). PatientListPage uses this directly.
- `usePeek()` — available to any component under `AppLayout → PeekProvider`. `ReferenceLink`, `RelatedResourcesPanel`, `PatientListPage` are all under this provider.
- `useMedplum()` — already used in `RelatedResourcesPanel` for count fetches. D-12 reuses it.

### Established Patterns
- Phase 52 J-shortcut pattern (tabIndex + onFocus/onBlur + relatedTarget guard + useShortcuts + indigo `var(--accent-ring)` outline): mirror exactly in `PatientListPage`
- `e.stopPropagation()` to prevent event from bubbling to `handleReferenceClick` in `ResourceDetailPage` — required for D-01
- `client.searchResources(type, params)` returns `Resource[]` — use in D-11 for first-result peek

### Integration Points
- `ReferenceLink.tsx` renders `<Anchor>` with `href` and `onClick` for navigation. Phase 53 adds Cmd+click detection without changing plain click behavior.
- `RelatedResourcesPanel.tsx` `<Card onClick>` navigates. Phase 53 adds Cmd+click detection to the same Card.
- `PatientListPage.tsx` `PatientRow` component — add `onFocus`/`onBlur` props; keep `onNavigate` unchanged.

### PatientRow Component Shape
The `PatientRow` function in `PatientListPage.tsx` accepts `{ rowIndex, patient, client, onNavigate }`. Phase 53 adds `onFocus?: () => void` and `onBlur?: (e: React.FocusEvent<HTMLTableRowElement>) => void` props, spreads them onto `<Table.Tr tabIndex={0}>`.

</code_context>

<specifics>
## Specific Ideas

- Drawer title for error state: use the raw reference string (e.g., `"Patient/123"`) from `referenceText` so users see exactly which reference was unresolvable. Monospace font matches the success state.
- `openPeekError` string: exactly `"Reference unresolvable"` per REQUIREMENTS.md wording.
- RelatedResourcesPanel Cmd+click cursor: no change needed (already `style={{ cursor: 'pointer' }}`). The Cmd modifier is a discoverable pattern in macOS.
- PatientListPage: `Patient` from `@medplum/fhirtypes` IS a `Resource` (extends Resource), so `openPeek(focusedPatient as Resource, ...)` is type-safe.

</specifics>

<deferred>
## Deferred Ideas

- Hover-peek 4-line JSON preview tooltip on reference chips — explicitly out of scope (REQUIREMENTS.md §Out of Scope)
- Arrow-key navigation between focused rows in PatientListPage — Polish item; not in PEEK requirements
- Optimistic drawer open (open drawer immediately while fetch is in progress for RelatedResourcesPanel Cmd+click) — D-13 decided against this to keep implementation simple

</deferred>

---

*Phase: 53-peek-call-site-expansion*
*Context gathered: 2026-05-04*
