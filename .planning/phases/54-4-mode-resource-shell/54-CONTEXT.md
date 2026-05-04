# Phase 54: 4-Mode Resource Shell - Context

**Gathered:** 2026-05-04
**Status:** Ready for planning

<domain>
## Phase Boundary

Phase 54 replaces `ResourceDetailPage`'s current 2-tab layout (`Human-readable | JSON`) with a unified 4-mode shell: **Summary | Human | Graph | JSON**. Keyboard shortcuts `1`/`2`/`3`/`4`, selected mode persists in URL `?mode=` param.

Requirements in scope: SHELL-01, SHELL-02, SHELL-03, SHELL-04.

NOT in scope:
- Explorer list changes (EXPL-01..03 → Phase 55)
- Sidebar restructure and Expert toggle (SIDE-01..04 → Phase 56)
- Patient-detail unification through Explorer chrome (LENS-01..02 → Phase 57)
- The Expert toggle default (Phase 56 owns it); Phase 54 defaults to `summary` for all users

</domain>

<decisions>
## Implementation Decisions

### D-01: Mode Switcher Widget
- Use `<Tabs variant="pills">` (locked decision from v1.8 STATE.md roadmap — "preserves `keepMounted` + ARIA tablist semantics; per RESEARCH PITFALLS #4"). Tab values: `summary` | `human` | `graph` | `json`. Do NOT use `SegmentedControl`.
- `keepMounted` on all 4 tab panels so graph state is not destroyed on mode switch.

### D-02: URL Mode Parameter
- Use `useSearchParams()` from `react-router-dom` to read/write `?mode=`. Default = `summary` when param is absent or invalid.
- When mode switches, call `setSearchParams({ mode: newMode })` — this replaces the search params without navigating away (no push to history; use `{ replace: true }` for in-place swaps).
- Phase 52 D-10: `Enter` in the peek drawer already emits `?mode=json`. Phase 54 must read and honor that param. The default `summary` applies only when no param is present.
- Patient-context navigation: when `patientId` is in route params, mode switches navigate to `/patients/:patientId/:resourceType/:id?mode=X` (same page, only `?mode=` changes). `useSearchParams` handles this automatically.

### D-03: Keyboard Shortcuts — Migrate to useShortcuts
- Replace the existing raw `document.addEventListener('keydown')` in `ResourceDetailPage` with `useShortcuts({ '1': setMode('summary'), '2': setMode('human'), '3': setMode('graph'), '4': setMode('json') })` from `src/hooks/useShortcuts.ts` (Phase 52).
- Same input-focus guard: `useShortcuts(shortcuts, enabled)` where `enabled = true` always (the hook internally skips when input is focused — same guard as Phase 52/53).

### D-04: Graph Mode (SHELL-03)
- Inline `ResourceGraphView` as mode 3 in a `<Tabs.Panel value="graph">`, loaded via `React.lazy` + `Suspense` with a `<Skeleton>` fallback (consistent with Phase 49's lazy-load approach in App.tsx).
- The existing `/explorer/:type/:id/graph` and `/patients/:patientId/:resourceType/:id/graph` routes in `App.tsx` become `<Navigate replace>` redirects to `?mode=graph` (preserving all path params). The `/graph` sub-route accepts no additional params — redirect to the parent route with `?mode=graph`.
- The standalone "Graph" `<Button>` / `<Tooltip>` in the current ResourceDetailPage header (lines ~154–168) is REMOVED — mode 3 in the switcher replaces it.
- `ResourceGraphView` receives `resourceType` and `id` (and `patientId` when present) via `useParams()` — same as today. No prop changes needed.

### D-05: Summary Mode Layout (SHELL-02)
- Summary mode renders in two stacked sections (full-width, NOT side-by-side grid):
  1. **Heading + Key-fields table** — `summarizeResource(r).primary` as a `<Title order={3}>` followed by a `<KeyFieldsTable resource={resource} />` component
  2. **Reference panels** — existing `IncomingReferencesPanel` (non-Patient) / `PatientRelatedResources` (Patient) rendered below the key-fields table, visible ONLY in Summary mode (hidden in Human/Graph/JSON modes by `keepMounted` — the panels only mount inside the Summary tab panel)

- "References out" per SHELL-02 — Claude's discretion: implement as a lightweight `<ReferencesOutCard>` that scans the resource for all fields of FHIR type `Reference` (top-level only, no deep walk) and lists them with resolved summaries via `useReferenceResolver`. OR defer to Phase 57 if complexity is high. Research/planner decide.

### D-06: Key-Fields Registry (SHELL-02)
- New file: `src/utils/keyFieldsRegistry.ts` — exports `getKeyFields(r: Resource): KeyFieldEntry[]` where `KeyFieldEntry = { label: string; value: string | undefined }`. Value is already formatted as a plain string (not a FHIR type object).
- Registry covers the same 8 R4 types as `summarizeResource` (Patient, Observation, Condition, Encounter, MedicationStatement, Procedure, DiagnosticReport, AllergyIntolerance) + generic fallback.
- Generic fallback: return the first 4 non-meta, non-`resourceType`, non-`id`, non-`text` fields from the resource as `label = key, value = JSON.stringify(resource[key]).slice(0, 80)` — "best effort" preview.
- Per-type field count: 4–6 fields per type. Claude has full discretion on field selection per type. Focus on clinically meaningful fields (status, effective date, code/category, subject, value). Avoid duplicating `summarizeResource.primary` — complement it, don't repeat it.
- Rendered in `<KeyFieldsTable>` as a simple 2-column Mantine `<Table>` (label | value, no header row). Values rendered as plain `<Text>` strings (no `ResourcePropertyDisplay` — keep it lightweight and fast).

### D-07: JSON Mode Enhancements (SHELL-04)
- **Toolbar row** (above the existing `<JsonViewer>`): `Copy` button, `Download` button, `Validation chip`, `Open in validator` link — all in a `<Group justify="space-between">` layout.
- **Copy**: `navigator.clipboard.writeText(JSON.stringify(resource, null, 2))` → show Mantine `notifications.show` success toast. No confirmation prompt.
- **Download**: Create a `Blob` + object URL + programmatic `<a>` click. Filename: `${resourceType}-${id}.json`. Cleanup: `URL.revokeObjectURL` immediately after click.
- **Validation chip**: Run `createStructuralBackend()` (from `src/quality/structuralValidator.ts`) offline against the loaded resource. Show a `<Badge>` with issue count: `0 issues` (green/teal) or `{N} issues` (yellow). This is offline, no PHI is transmitted externally. The `createStructuralBackend` call is synchronous; result is available immediately.
- **Open in validator link**: `<Anchor href="/quality" component={Link}>Open in validator</Anchor>` — navigates to the in-app Quality page (not an external URL). PHI stays within the app. The link communicates intent without exposing resources to third parties.
- **Line numbers in JsonViewer**: Investigate whether `JsonViewer` supports line numbers natively in Phase 54 research. If not, Claude's discretion on approach (e.g., add a `showLineNumbers` prop to `JsonViewer`).

### D-08: Existing Route Cleanup
- The existing `Tooltip`/`Button` "Graph" element in `ResourceDetailPage` header (lines ~149–168, using `IconAffiliate`) is REMOVED in Phase 54.
- The existing keyboard handler `useEffect(() => { function handleKeyDown(e) { ... '1' → 'human-readable'; '2' → 'developer' ... } }, [])` in `ResourceDetailPage` is REMOVED and replaced by `useShortcuts` (D-03).
- `activeTab` state is REMOVED. Mode is derived entirely from `useSearchParams().get('mode')`.

### D-09: Non-Patient vs Patient ResourceDetailPage
- Phase 54 applies to all resources routed through `ResourceDetailPage` (including Patient resources accessed via `/explorer/:type/:id`).
- For Patient resources accessed via `/patients/:patientId`, the same 4-mode shell applies in Phase 54. Phase 57 (LENS-02) will further refine the Patient Summary mode (MII tabs etc.). Phase 54 does NOT break the existing `/patients` layout — it just replaces the 2-tab UI with the 4-mode switcher.
- `IncomingReferencesPanel` is shown only for non-Patient resources (existing behavior). `PatientRelatedResources` is shown only for Patient resources when `patientId` is in route (existing behavior). Both remain in Summary mode only (D-05).

### Claude's Discretion
- Exact key-field selection per resource type (subject to "4–6 fields" constraint from SHELL-02)
- Whether "References out" card is implemented in Phase 54 or deferred to Phase 57 (assess complexity in research)
- Whether `JsonViewer` gets a `showLineNumbers` prop or line numbers are added another way
- Exact `Suspense` fallback height for graph mode (to avoid layout shift)
- Whether `KeyFieldsTable` reuses any of `ResourcePropertyTable`'s internal renderers or is fully independent

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Requirements
- `.planning/REQUIREMENTS.md` §4-Mode Resource Shell (SHELL-01, SHELL-02, SHELL-03, SHELL-04) — exact acceptance criteria
- `.planning/ROADMAP.md` §Phase 54 — success criteria and dependency on Phase 52

### Phase 52/53 Foundation (Phase 54 builds on these)
- `src/hooks/useShortcuts.ts` — shared keyboard hook; Phase 54 migrates ResourceDetailPage to use this
- `src/contexts/PeekContext.tsx` — PeekProvider; Phase 52 D-10: Enter in drawer emits `?mode=json`; Phase 54 must read it
- `src/components/json/JsonViewer.tsx` — used by JSON mode (SHELL-04); check if line numbers are supported

### Files to modify in Phase 54
- `src/components/explorer/ResourceDetailPage.tsx` — main refactor target (2-tab → 4-mode shell)
- `src/App.tsx` — add Navigate redirects for `/graph` routes
- `src/components/explorer/DeveloperJsonView.tsx` — may be obsoleted by direct JsonViewer use in JSON mode panel with toolbar

### New files to create
- `src/utils/keyFieldsRegistry.ts` — key-fields registry for Summary mode
- `src/components/explorer/KeyFieldsTable.tsx` — Summary mode property table
- (Optional) `src/components/explorer/ReferencesOutCard.tsx` — "References out" side card

### Phase 49 Reference Implementation
- `src/components/explorer/ResourceGraphView.tsx` — Graph view component (inlined as mode 3)
- `src/components/explorer/useGraphBfs.ts` — BFS hook used by ResourceGraphView

### Quality Module (validation chip)
- `src/quality/structuralValidator.ts` — `createStructuralBackend()` + `validateStructural()`; offline, PHI-safe

### Architecture Notes
- `.planning/STATE.md` §v1.8 Roadmap Locked Decisions — mode switcher = `<Tabs variant="pills">`, NOT SegmentedControl
- `.planning/STATE.md` §Phase 53 Deliverables — `useShortcuts`, `usePeek`, `PeekContext` API carried forward

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- `src/hooks/useShortcuts.ts` — `useShortcuts(shortcuts, enabled?)`: takes a `Record<string, () => void>` and optional enabled flag; skips when input is focused. Phase 54 uses keys `'1'`, `'2'`, `'3'`, `'4'`.
- `src/utils/summarizeResource.ts` — `summarizeResource(r) → { primary, secondary? }`: Summary mode heading uses `.primary`. Already covers 8 R4 types + generic.
- `src/components/explorer/ResourceGraphView.tsx` — existing graph component; Phase 54 inlines via `React.lazy` in a `<Tabs.Panel>`.
- `src/components/json/JsonViewer.tsx` — JSON renderer (Phase 52 / PEEK-06); JSON mode uses it with an added toolbar.
- `src/quality/structuralValidator.ts` — `createStructuralBackend()` → `ValidationBackend`: offline validator for the JSON mode chip.
- `src/components/explorer/IncomingReferencesPanel.tsx` — reverse-references panel (Phase 48); moved to Summary-mode-only in Phase 54.
- `src/components/explorer/PatientRelatedResources.tsx` — Patient forward refs (Phase 48); moved to Summary-mode-only.

### Established Patterns
- React Router v7: `useSearchParams()` for reading/writing URL search params without re-navigating.
- Lazy loading: `React.lazy(() => retry(() => import(...)).then(m => ({ default: m.ComponentName })))` — see App.tsx for the exact retry wrapper pattern used in Phase 49.
- Mode persistence: No prior URL-mode pattern exists — Phase 54 introduces it. `setSearchParams({ mode }, { replace: true })` is the right call (no history entry per tab switch).
- Key file `src/App.tsx` lines 147, 157: current `/graph` routes that become `<Navigate>` redirects.

### Integration Points
- `ResourceDetailPage` currently renders at routes `/explorer/:type/:id` and `/patients/:patientId/:resourceType/:id`.
- `useParams()` provides `resourceType`, `id`, and optionally `patientId`.
- `useSearchParams()` will be added to read `?mode=`.
- The `Tabs.Panel value="graph"` needs `keepMounted` so graph state persists; the `<Suspense>` fallback goes inside the panel.

</code_context>

<specifics>
## Specific Ideas

- The locked v1.8 decision specifies `<Tabs variant="pills">` specifically because it gives `keepMounted` for free (SegmentedControl does not). Planner must use `keepMounted` on all 4 panels.
- `?mode=json` is already emitted by the Phase 52 drawer's Enter key handler — Phase 54 must treat this as a valid default (don't override with `summary` when `?mode=json` is present).
- ResourceDetailPage currently has an `activeTab` state variable — Phase 54 removes this entirely (mode is URL-driven).
- The existing "Graph" button (with `IconAffiliate` icon + Tooltip) is removed; its slot in the header becomes the mode switcher `<Tabs.List>`.
- Download filename convention: `${resourceType}-${id}.json` (e.g., `Patient-example-patient-1.json`).
- Structural validator chip — use the same severity colors as the Quality dashboard: `0 issues` = `color="teal"`, `N issues` = `color="yellow"`.

</specifics>

<deferred>
## Deferred Ideas

- **"References out" card** — If `ReferencesOutCard` proves complex (deep Reference scanning, resolver integration), defer to Phase 57 with Patient unification. Planner should assess.
- **Expert toggle default mode** — Phase 56 owns this; Phase 54 hardcodes default = `summary`.
- **Patient-specific Summary mode (MII tabs in Summary)** — Phase 57 (LENS-02). Phase 54 Summary mode is generic (same for all resource types including Patient).
- **URL history management** — Mode switches use `replace: true` (no back-button accumulation). If users report unexpected back-button behavior, revisit in UAT phase.
- **External FHIR validator link** — `validator.fhir.org` integration deferred; in-app `/quality` link is sufficient for Phase 54. External link with resource encoding revisit in v1.9.

</deferred>

---

*Phase: 54-4-mode-resource-shell*
*Context gathered: 2026-05-04*
