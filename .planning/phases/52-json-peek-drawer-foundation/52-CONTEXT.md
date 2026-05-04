# Phase 52: JSON Peek Drawer Foundation - Context

**Gathered:** 2026-05-04
**Status:** Ready for planning

<domain>
## Phase Boundary

Phase 52 delivers the JSON peek drawer foundation:
1. Extract `JsonViewer` component (single source of truth, eliminating `JsonTreeView` duplication)
2. Create `PeekProvider` + `JsonPeekDrawer` mounted at `AppLayout` (app-wide, reusable by Phases 53+)
3. Wire `J` keystroke on focused Explorer rows (`SearchResultsPage`) to open the drawer
4. Implement shared `useShortcuts` hook (foundation for Phases 54 and 56 shortcut extensions)

Requirements in scope: PEEK-01, PEEK-02, PEEK-03, PEEK-06.
NOT in scope: Patients list wiring (Phase 53), reference chip Cmd+click (Phase 53), mode switcher (Phase 54).

</domain>

<decisions>
## Implementation Decisions

### JsonViewer Extraction (PEEK-06)
- **D-01:** Create `src/components/json/JsonViewer.tsx` as the single source-of-truth JSON rendering component. It wraps `JsonTreeView` (tree-view + expand/collapse) inside a `<ScrollArea>` with the correct height calculation. Accepts `resource: Resource` prop.
- **D-02:** `JsonTreeView.tsx` remains in place (it is the implementation detail) but `DeveloperJsonView.tsx` is updated to import `JsonViewer` from `src/components/json/JsonViewer.tsx` instead of `JsonTreeView` directly. The success criterion grep (`git grep -rn "JsonTreeView" src/`) must resolve to exactly the one definition file.
- **D-03:** `JsonSyntaxHighlight.tsx` is NOT part of this extraction — it is a separate utility (tokenizer) not currently used by `DeveloperJsonView`. Scope only what the grep gate requires. Phase 54 (SHELL-04, JSON mode improvements) will handle it if needed.

### Row Focus Model (PEEK-01, PEEK-02)
- **D-04:** Add `tabIndex={0}` to each `<Table.Tr>` in `SearchResultsPage`. Track the currently focused row via `onFocus` → set `focusedResource` state; `onBlur` clears it (with a delay or `relatedTarget` check to avoid flicker on click).
- **D-05:** The `J` keydown handler fires when `document.activeElement` is a focused table row (or a child of one) — matching the existing input-focus-guard pattern (`tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT' → skip`). No custom focus-trap needed for the list rows.
- **D-06:** `Esc` while drawer is open closes it (handled inside `JsonPeekDrawer` via Mantine `Drawer`'s `onClose` + `closeOnEscape`). Focus returns to the originating row via `element.focus()` stored before opening.
- **D-07:** Pressing `J` on a different row while drawer is open replaces drawer content without unmounting (`opened` stays `true`, `peekResource` state updates). Mantine `Drawer` with `keepMounted={false}` and `opened` prop toggle is sufficient — no animation on content swap since drawer stays open.

### Drawer + PeekProvider Mount Point
- **D-08:** Mount `<PeekProvider>` wrapping the `<Outlet>` inside `AppLayout.tsx`. The `<JsonPeekDrawer>` renders inside `PeekProvider`. This makes the drawer accessible app-wide without layout changes for Phases 53+ call sites.
- **D-09:** Drawer config: `position="right"` · `size={420}` · `trapFocus={true}` · `withOverlay={false}` — per REQUIREMENTS.md Design Decisions and STATE.md carry-forward decision. `trapFocus={true}` + `withOverlay={false}` is the a11y-safe, lightweight-visual configuration.
- **D-10:** `Enter` while drawer is open (PEEK-03) is handled by a keydown listener inside `JsonPeekDrawer` that calls `navigate('/explorer/:type/:id?mode=json')`. `mode=json` is Phase 54's URL param — Phase 52 can emit the URL even before Phase 54 reads it (harmless fallback: Phase 54 will implement the mode reader).

### Shared `useShortcuts` Hook
- **D-11:** Create `src/hooks/useShortcuts.ts` — accepts `shortcuts: Record<string, () => void>` and `enabled?: boolean` (defaults `true`). Uses `document.addEventListener('keydown')` with the standard input-focus guard. Returns nothing (side-effect only).
- **D-12:** Phase 52 registers `{ j: openPeek }` via `useShortcuts` in `SearchResultsPage`. The hook is designed to be called multiple times (Phases 54 and 56 will call it in their own components for `1`/`2`/`3`/`4` and `⌘K`). No global registry or deduplication needed at Phase 52 scope.
- **D-13:** The existing raw `document.addEventListener('keydown')` in `ResourceDetailPage.tsx` (for `1`/`2` tab switching) is NOT migrated in Phase 52 — Phase 54 owns that migration as part of the 4-mode shell refactor.

### PeekContext API
- **D-14:** `PeekContext` exports `openPeek(resource: Resource): void` and `closePeek(): void`. State lives in `PeekProvider` as `useState<{ resource: Resource; originElement: HTMLElement | null } | null>(null)`. Components call `const { openPeek } = usePeek()`.
- **D-15:** `originElement` is stored at `openPeek` call time (the focused `<tr>` element) to restore focus on close (PEEK-02 requirement). Passed as a parameter: `openPeek(resource, originElement)` or derived inside the hook from `document.activeElement`.
- **D-16:** The `[Open full →]` button in the drawer (PEEK-03) receives `resourceType` and `id` from the current `peekResource` and navigates using `useNavigate` inside the drawer component. The button label is `Open full →`.

### Claude's Discretion
- Exact `ScrollArea` height formula for `JsonViewer` in drawer context (drawer has different height constraints than `ResourceDetailPage` — adjust to `100%` height since drawer has its own scroll container via Mantine).
- Whether `JsonViewer` in the drawer should show a loading spinner while `peekResource` is being set (likely not needed — resource is already fetched when `J` is pressed on an Explorer row).
- Exact `onBlur` timing / `relatedTarget` approach to prevent `focusedResource` flicker when clicking row (instead of pressing `J`).

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Requirements
- `.planning/REQUIREMENTS.md` §JSON Peek Drawer (PEEK-01..06) — exact acceptance criteria
- `.planning/ROADMAP.md` §Phase 52 — success criteria (especially the grep gate in criterion 4)
- `.planning/ROADMAP.md` §Cross-Phase Notes (v1.8) — keyboard shortcut ownership, drawer config decisions

### Existing Code (read before implementing)
- `src/components/explorer/DeveloperJsonView.tsx` — current JSON display; thin wrapper around `JsonTreeView`
- `src/components/explorer/JsonTreeView.tsx` — the collapsible tree implementation to extract
- `src/components/explorer/JsonSyntaxHighlight.tsx` — tokenizer utility (NOT part of extraction; for reference only)
- `src/components/explorer/SearchResultsPage.tsx` — Explorer list; add `tabIndex`, focus state, and `J` handler here
- `src/components/explorer/ResourceDetailPage.tsx` — existing `document.addEventListener('keydown')` pattern to mirror in `useShortcuts`
- `src/components/layout/AppLayout.tsx` — add `PeekProvider` + `JsonPeekDrawer` here
- `src/components/dashboard/DashboardPage.tsx` — existing Mantine `Drawer` + `useDisclosure` pattern for reference

### Architecture Notes
- `.planning/STATE.md` §Decisions carry-forward — `trapFocus={true}` + `withOverlay={false}` is a locked decision

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- `JsonTreeView.tsx` (src/components/explorer/): The interactive tree viewer — extract into `JsonViewer.tsx`
- `useDisclosure` from `@mantine/hooks`: Already used in DashboardPage, PatientListPage, ThresholdsPage — use for drawer open/close state inside PeekProvider
- Mantine `Drawer`: Already used in DashboardPage — same import pattern
- `useNavigate` from react-router-dom: Used throughout for navigation; use in `JsonPeekDrawer` for PEEK-03
- `summarizeResource`: Available at `src/utils/summarizeResource.ts` — could be used for drawer title display

### Established Patterns
- Keyboard shortcuts: Raw `useEffect` + `document.addEventListener('keydown')` with `INPUT/TEXTAREA/SELECT` guard (ResourceDetailPage:77-94) — `useShortcuts` should mirror this exactly
- Drawer state: `useDisclosure` from `@mantine/hooks` → `[opened, { open, close }]` (DashboardPage:96)
- Context pattern: `ConnectionContext`, `SettingsContext`, `TerminologyContext` all follow the `Provider + useFoo()` hook pattern — `PeekContext` should match
- Table rows: `SearchResultsPage` renders `<Table.Tr>` + `<Table.Td>` with `onClick` → navigate. Adding `tabIndex={0}` + `onFocus`/`onBlur` follows Mantine table patterns.

### Integration Points
- `AppLayout.tsx`: Add `<PeekProvider>` wrapping the `<Outlet>` (inside `<AppShell.Main>` or wrapping `AppShell` entirely — wrap at Provider level above the shell for context availability in Sidebar future use)
- `SearchResultsPage.tsx`: Add `tabIndex`, focus tracking, `useShortcuts({ j: ... })` call
- `DeveloperJsonView.tsx`: Update import from `JsonTreeView` → `JsonViewer`
- New files: `src/components/json/JsonViewer.tsx`, `src/contexts/PeekContext.tsx`, `src/hooks/useShortcuts.ts`, `src/components/json/JsonPeekDrawer.tsx`

</code_context>

<specifics>
## Specific Ideas

- The drawer should display `resourceType/id` as its title (simple, always available from the resource object)
- The `[Open full →]` button is positioned in the drawer header/title area (right side), not in the body
- Drawer `withCloseButton={true}` (Mantine default) — `Esc` and the × button both close
- Success criterion 4 grep: `git grep -rn "react-syntax-highlighter\|JsonTreeView" src/` — note `react-syntax-highlighter` is NOT currently installed; the check ensures no one installs it. `JsonTreeView` must resolve to exactly one file.

</specifics>

<deferred>
## Deferred Ideas

- Copy button / Download button in drawer — Phase 54 scope (SHELL-04)
- Validation chip in drawer — not in PEEK requirements; Phase 54 scope
- Line numbers in drawer JSON view — not in PEEK requirements
- `PatientListPage` `J` wiring — Phase 53 scope (PEEK-05)
- Reference chip `Cmd+click` — Phase 53 scope (PEEK-04)

</deferred>

---

*Phase: 52-json-peek-drawer-foundation*
*Context gathered: 2026-05-04*
