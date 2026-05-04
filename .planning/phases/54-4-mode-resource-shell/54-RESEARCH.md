# Phase 54: 4-Mode Resource Shell - Research

**Researched:** 2026-05-04
**Domain:** Mantine 8 Tabs (pills variant + keepMounted), React Router v7 useSearchParams, React.lazy for graph-mode, FHIR resource summary rendering, offline structural validation chip, JSON copy/download UX
**Confidence:** HIGH

## Summary

Phase 54 is a focused refactor of `ResourceDetailPage` plus three new small components. **No new dependencies are required.** Every primitive Phase 54 needs is already in the codebase and proven: `<Tabs variant="pills" keepMounted={false}>` (used in `MiiModuleTabs.tsx:214`), `useSearchParams` with `setSearchParams(next, { replace: true })` (used in `QualityOverviewPage.tsx:140`), `React.lazy + Suspense` for code-split routes (used in `App.tsx:48-96`), `<Navigate replace>` redirects (react-router-dom v7), `downloadString()` Blob+anchor utility (`src/utils/export.ts:60`), `notifications.show()` for copy toast (`src/components/settings/SettingsPage.tsx:129`), `createStructuralBackend` for offline validation (`src/quality/structuralValidator.ts:43`), and `summarizeResource()` covering all 8 typed R4 types plus a generic walker (`src/utils/summarizeResource.ts`).

The single open technical question is **how to render line numbers in JSON mode**. The current `JsonViewer` (Phase 52) wraps `JsonTreeView` — a *collapsible tree*, not a linear text dump. Line numbers only make sense on a flat `<pre>` rendering, which is exactly what the unused `JsonSyntaxHighlight.tsx` provides. Two viable paths exist (see §JSON Mode Line Numbers); planner picks one in Phase 54 plan 02.

Risk areas to watch: (1) Mantine `<Tabs>` defaults `keepMounted={true}` at the root, OR-overriding per-Panel `keepMounted={false}` (documented pitfall, fixed in `MiiModuleTabs.tsx:214` — must replicate); (2) the existing `handleReferenceClick` interceptor wraps every Tabs.Panel today and must continue to wrap them after refactor; (3) the existing `/explorer/:type/:id/graph` route is currently rendered by lazy `ResourceGraphView` directly in `App.tsx:147` — a `<Navigate>` redirect must preserve `?mode=graph` on the parent path; (4) when Phase 54 inlines `ResourceGraphView` as a `<Tabs.Panel>`, that component currently renders its own `<Title>Reference graph</Title>` + back-button + depth controls — keep those visible in mode 3 (do NOT strip them) so the graph panel works as a self-contained surface.

**Primary recommendation:** Execute the locked CONTEXT decisions verbatim. For the line-numbers open item, recommend Option A (extend JsonViewer with `showLineNumbers` prop using a flat `<pre>` rendering by `JsonSyntaxHighlight`-style tokens, kept inside the same component) — this preserves the PEEK-06 single-source-of-truth invariant while satisfying SHELL-04. For the "References out" open item, recommend deferring to Phase 57 — implementing a deep `Reference` walker is non-trivial and Patient-detail unification is the natural home for it.

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions

- **D-01: Mode Switcher Widget**
  - Use `<Tabs variant="pills">` (locked v1.8 STATE.md roadmap — "preserves `keepMounted` + ARIA tablist semantics; per RESEARCH PITFALLS #4"). Tab values: `summary` | `human` | `graph` | `json`. Do NOT use `SegmentedControl`.
  - `keepMounted` on all 4 tab panels so graph state is not destroyed on mode switch.

- **D-02: URL Mode Parameter**
  - Use `useSearchParams()` from `react-router-dom` to read/write `?mode=`. Default = `summary` when param is absent or invalid.
  - When mode switches, call `setSearchParams({ mode: newMode })` — replaces search params without navigating away (no push to history; use `{ replace: true }` for in-place swaps).
  - Phase 52 D-10: `Enter` in the peek drawer already emits `?mode=json`. Phase 54 must read and honor that param. The default `summary` applies only when no param is present.
  - Patient-context navigation: when `patientId` is in route params, mode switches navigate to `/patients/:patientId/:resourceType/:id?mode=X` (same page, only `?mode=` changes). `useSearchParams` handles this automatically.

- **D-03: Keyboard Shortcuts — Migrate to useShortcuts**
  - Replace the existing raw `document.addEventListener('keydown')` in `ResourceDetailPage` with `useShortcuts({ '1': setMode('summary'), '2': setMode('human'), '3': setMode('graph'), '4': setMode('json') })` from `src/hooks/useShortcuts.ts` (Phase 52).
  - Same input-focus guard: the hook internally skips when input is focused — same guard as Phase 52/53.

- **D-04: Graph Mode (SHELL-03)**
  - Inline `ResourceGraphView` as mode 3 in a `<Tabs.Panel value="graph">`, loaded via `React.lazy` + `Suspense` with a `<Skeleton>` fallback (consistent with Phase 49's lazy-load approach in App.tsx).
  - The existing `/explorer/:type/:id/graph` and `/patients/:patientId/:resourceType/:id/graph` routes in `App.tsx` become `<Navigate replace>` redirects to `?mode=graph` (preserving all path params). The `/graph` sub-route accepts no additional params — redirect to the parent route with `?mode=graph`.
  - The standalone "Graph" `<Button>` / `<Tooltip>` in the current ResourceDetailPage header (lines ~154–168) is REMOVED — mode 3 in the switcher replaces it.
  - `ResourceGraphView` receives `resourceType` and `id` (and `patientId` when present) via `useParams()` — same as today. No prop changes needed.

- **D-05: Summary Mode Layout (SHELL-02)**
  - Summary mode renders in two stacked sections (full-width, NOT side-by-side grid):
    1. **Heading + Key-fields table** — `summarizeResource(r).primary` as a `<Title order={3}>` followed by a `<KeyFieldsTable resource={resource} />` component
    2. **Reference panels** — existing `IncomingReferencesPanel` (non-Patient) / `PatientRelatedResources` (Patient) rendered below the key-fields table, visible ONLY in Summary mode (the panels only mount inside the Summary tab panel)
  - "References out" per SHELL-02 — Claude's discretion: implement as a lightweight `<ReferencesOutCard>` that scans the resource for all fields of FHIR type `Reference` (top-level only, no deep walk) and lists them with resolved summaries via `useReferenceResolver`. OR defer to Phase 57 if complexity is high. Research/planner decide.

- **D-06: Key-Fields Registry (SHELL-02)**
  - New file: `src/utils/keyFieldsRegistry.ts` — exports `getKeyFields(r: Resource): KeyFieldEntry[]` where `KeyFieldEntry = { label: string; value: string | undefined }`. Value is already formatted as a plain string (not a FHIR type object).
  - Registry covers the same 8 R4 types as `summarizeResource` (Patient, Observation, Condition, Encounter, MedicationStatement, Procedure, DiagnosticReport, AllergyIntolerance) + generic fallback.
  - Generic fallback: return the first 4 non-meta, non-`resourceType`, non-`id`, non-`text` fields from the resource as `label = key, value = JSON.stringify(resource[key]).slice(0, 80)` — "best effort" preview.
  - Per-type field count: 4–6 fields per type. Claude has full discretion on field selection per type. Focus on clinically meaningful fields. Avoid duplicating `summarizeResource.primary` — complement it, don't repeat it.
  - Rendered in `<KeyFieldsTable>` as a simple 2-column Mantine `<Table>` (label | value, no header row). Values rendered as plain `<Text>` strings (no `ResourcePropertyDisplay` — keep it lightweight and fast).

- **D-07: JSON Mode Enhancements (SHELL-04)**
  - **Toolbar row** (above the existing `<JsonViewer>`): `Copy` button, `Download` button, `Validation chip`, `Open in validator` link — all in a `<Group justify="space-between">` layout.
  - **Copy**: `navigator.clipboard.writeText(JSON.stringify(resource, null, 2))` → show Mantine `notifications.show` success toast. No confirmation prompt.
  - **Download**: Create a `Blob` + object URL + programmatic `<a>` click. Filename: `${resourceType}-${id}.json`. Cleanup: `URL.revokeObjectURL` immediately after click.
  - **Validation chip**: Run `createStructuralBackend()` (from `src/quality/structuralValidator.ts`) offline against the loaded resource. Show a `<Badge>` with issue count: `0 issues` (green/teal) or `{N} issues` (yellow). This is offline, no PHI is transmitted externally.
  - **Open in validator link**: `<Anchor href="/quality" component={Link}>Open in validator</Anchor>` — navigates to the in-app Quality page (not an external URL). PHI stays within the app.
  - **Line numbers in JsonViewer**: Investigate whether `JsonViewer` supports line numbers natively in Phase 54 research. If not, Claude's discretion on approach.

- **D-08: Existing Route Cleanup**
  - The existing `Tooltip`/`Button` "Graph" element in `ResourceDetailPage` header (lines ~149–168, using `IconAffiliate`) is REMOVED in Phase 54.
  - The existing keyboard handler `useEffect(() => { function handleKeyDown(e) { ... '1' → 'human-readable'; '2' → 'developer' ... } }, [])` in `ResourceDetailPage` is REMOVED and replaced by `useShortcuts` (D-03).
  - `activeTab` state is REMOVED. Mode is derived entirely from `useSearchParams().get('mode')`.

- **D-09: Non-Patient vs Patient ResourceDetailPage**
  - Phase 54 applies to all resources routed through `ResourceDetailPage` (including Patient resources accessed via `/explorer/:type/:id`).
  - For Patient resources accessed via `/patients/:patientId`, the same 4-mode shell applies in Phase 54. Phase 57 (LENS-02) will further refine the Patient Summary mode (MII tabs etc.). Phase 54 does NOT break the existing `/patients` layout — it just replaces the 2-tab UI with the 4-mode switcher.
  - `IncomingReferencesPanel` is shown only for non-Patient resources (existing behavior). `PatientRelatedResources` is shown only for Patient resources when `patientId` is in route (existing behavior). Both remain in Summary mode only (D-05).

### Claude's Discretion

- Exact key-field selection per resource type (subject to "4–6 fields" constraint from SHELL-02)
- Whether "References out" card is implemented in Phase 54 or deferred to Phase 57 (assess complexity in research)
- Whether `JsonViewer` gets a `showLineNumbers` prop or line numbers are added another way
- Exact `Suspense` fallback height for graph mode (to avoid layout shift)
- Whether `KeyFieldsTable` reuses any of `ResourcePropertyTable`'s internal renderers or is fully independent

### Deferred Ideas (OUT OF SCOPE)

- **"References out" card** — If `ReferencesOutCard` proves complex (deep Reference scanning, resolver integration), defer to Phase 57 with Patient unification. Planner should assess.
- **Expert toggle default mode** — Phase 56 owns this; Phase 54 hardcodes default = `summary`.
- **Patient-specific Summary mode (MII tabs in Summary)** — Phase 57 (LENS-02). Phase 54 Summary mode is generic (same for all resource types including Patient).
- **URL history management** — Mode switches use `replace: true` (no back-button accumulation). If users report unexpected back-button behavior, revisit in UAT phase.
- **External FHIR validator link** — `validator.fhir.org` integration deferred; in-app `/quality` link is sufficient for Phase 54. External link with resource encoding revisit in v1.9.
</user_constraints>

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|------------------|
| SHELL-01 | `ResourceDetailPage` replaces 2-tab layout with `Summary | Human | Graph | JSON` switcher; keys 1/2/3/4 with input-focus guard; `?mode=` URL persistence | `<Tabs variant="pills" keepMounted={false}>` with per-Panel `keepMounted` (D-01); `useSearchParams` (D-02, mirrors `QualityOverviewPage:131-141`); `useShortcuts({1..4})` from Phase 52 (D-03) |
| SHELL-02 | Summary mode (default for non-Expert) renders `summarizeResource(r).primary` heading + key-fields table for 8 typed R4 types + generic fallback walker; "References out" + "Referenced by" side cards | `summarizeResource` (Phase 46) covers all 8 types + generic; new `getKeyFields()` registry (D-06) mirrors that shape; existing `IncomingReferencesPanel` / `PatientRelatedResources` already render "Referenced by" via shared `RelatedResourcesPanel`; "References out" deferral recommended (see §Open Questions) |
| SHELL-03 | Graph mode lazy-loads `ResourceGraphView`; `/graph` route redirects to `?mode=graph` | `React.lazy + Suspense` (App.tsx:92-96 already does this); `<Navigate replace>` from react-router-dom v7; `ResourceGraphView` reads `useParams` so it works inline without prop changes (D-04) |
| SHELL-04 | JSON mode adds Copy, Download, validation chip, "Open in validator" link, line numbers | `navigator.clipboard.writeText` + `notifications.show` (D-07); `downloadString()` already exists in `src/utils/export.ts`; `createStructuralBackend()` from `src/quality/structuralValidator.ts:43`; line numbers — see §JSON Mode Line Numbers |
</phase_requirements>

## Standard Stack

### Core (all already installed)

| Library | Version | Purpose | Why Standard | Confidence |
|---------|---------|---------|--------------|------------|
| `@mantine/core` | 8.3.18 | `Tabs`, `Tabs.List`, `Tabs.Tab`, `Tabs.Panel`, `Group`, `Stack`, `Title`, `Table`, `Badge`, `Button`, `Anchor`, `Skeleton` | Existing project standard; required peer of `@medplum/react`. `Tabs variant="pills"` confirmed at `MiiModuleTabs.tsx:214`. | HIGH |
| `@mantine/notifications` | 8.3.18 | `notifications.show` for copy-success toast | Already wired at `main.tsx`; pattern in `SettingsPage.tsx:129/155/171`. | HIGH |
| `react-router-dom` | 7.14.0 | `useSearchParams`, `Navigate`, `Link`, `useParams`, `useNavigate` | All used elsewhere; `setSearchParams(next, { replace: true })` confirmed at `QualityOverviewPage.tsx:140`. | HIGH |
| `@tabler/icons-react` | 3.41.1 | `IconCopy`, `IconDownload`, `IconExternalLink` (toolbar icons) | Already imported throughout. | HIGH |
| `@medplum/fhirtypes` | 5.1.7 | `Resource`, `ResourceType`, plus per-type interfaces for the key-fields registry | Already used by `summarizeResource.ts`. | HIGH |

[VERIFIED: package.json + node_modules + grep audit 2026-05-04]

### No New Packages Required

Every dependency is already installed. The phase is purely additive code + a refactor of `ResourceDetailPage`.

**Installation:** None.

### Alternatives Considered (and why we are NOT using them)

| Instead of | Could Use | Why Not |
|------------|-----------|---------|
| `<Tabs variant="pills">` | `SegmentedControl` | Locked decision in v1.8 STATE.md — `Tabs` preserves `keepMounted` + WAI-ARIA `tablist` / `tab` / `tabpanel` semantics for free; `SegmentedControl` would need manual mount management and lacks the ARIA contract. |
| `useSearchParams` for `?mode=` | Local React state + `useNavigate` | Locked decision in CONTEXT D-02. URL persistence is a SHELL-01 success criterion. |
| `react-syntax-highlighter` for line-numbered JSON | Existing `JsonSyntaxHighlight.tsx` (custom tokenizer) or extending JsonViewer | The PEEK-06 grep gate forbids `react-syntax-highlighter`; the project deliberately uses an in-repo tokenizer. |
| Building a custom keyboard hook | Reuse `useShortcuts` (Phase 52) | Locked CONTEXT D-03. Single source of truth. |
| Building a custom download utility | Reuse `downloadString` from `src/utils/export.ts` | Already exists; identical Blob+anchor+revoke pattern. |
| Hand-rolling a JSON copy implementation | `navigator.clipboard.writeText` + `notifications.show` | Standard browser API; toast pattern already in `SettingsPage.tsx:129`. |

## Architecture Patterns

### Recommended Project Structure (file changes)

**Modified:**
```
src/components/explorer/ResourceDetailPage.tsx     — main refactor (2-tab → 4-mode shell)
src/App.tsx                                        — /graph routes become <Navigate replace> redirects
src/components/explorer/DeveloperJsonView.tsx      — likely obsoleted; JSON mode uses JsonViewer directly with toolbar
```

**New:**
```
src/utils/keyFieldsRegistry.ts                     — getKeyFields(r) registry (8 typed + generic fallback)
src/components/explorer/KeyFieldsTable.tsx         — Summary-mode 2-column property table
src/components/explorer/JsonModeView.tsx           — JSON mode toolbar + JsonViewer (replaces DeveloperJsonView)
```

**Optional (deferred recommendation — see Open Questions):**
```
src/components/explorer/ReferencesOutCard.tsx      — defer to Phase 57
```

### Pattern 1: URL-driven Tab Mode

Pattern from `QualityOverviewPage.tsx:131-141` (verified 2026-05-04):

```typescript
// Source: src/components/quality/QualityOverviewPage.tsx:131-141 [VERIFIED]
const VALID_MODES = new Set(['summary', 'human', 'graph', 'json'] as const);
type Mode = 'summary' | 'human' | 'graph' | 'json';
const DEFAULT_MODE: Mode = 'summary';

const [searchParams, setSearchParams] = useSearchParams();
const modeParam = searchParams.get('mode');
const activeMode: Mode =
  modeParam && VALID_MODES.has(modeParam as Mode) ? (modeParam as Mode) : DEFAULT_MODE;

const handleModeChange = (value: string | null) => {
  if (!value) return;
  const next = new URLSearchParams(searchParams);
  next.set('mode', value);
  setSearchParams(next, { replace: true });
};
```

Notes:
- `setSearchParams(next, { replace: true })` does NOT push a history entry — back-button skips through tab swaps. [VERIFIED in QualityOverviewPage usage]
- Reading via `searchParams.get('mode')` is synchronous; no effect needed to derive `activeMode`. [CITED: react-router-dom v7 useSearchParams docs]
- Building `next` from `new URLSearchParams(searchParams)` preserves any other query params (none expected on `/explorer/:type/:id` today, but defensive).

### Pattern 2: Tabs.Panel with keepMounted (Mantine 8 gotcha)

CRITICAL: Mantine `<Tabs>` defaults `keepMounted={true}` at the ROOT. Setting `keepMounted={false}` on individual `<Tabs.Panel>` does NOT work because the root default OR-overrides per-Panel. Phase 33 hit this; the fix lives at `MiiModuleTabs.tsx:202-214`:

```tsx
// Source: src/components/patients/MiiModuleTabs.tsx:202-214 [VERIFIED]
<Tabs value={activeTab} onChange={setActiveTab} variant="pills" keepMounted={false}>
  <Tabs.List>
    {/* ... Tabs.Tab ... */}
  </Tabs.List>
  <Tabs.Panel value="...">{/* mounts only when active */}</Tabs.Panel>
  <Tabs.Panel value="..." keepMounted>{/* opt-in: stays mounted */}</Tabs.Panel>
</Tabs>
```

For Phase 54 the requirement (CONTEXT D-01) is: **all 4 panels keepMounted** so the graph state survives mode switches. The simplest and intent-clear way is to set `keepMounted` (default true) at the root and rely on each `<Tabs.Panel>` staying mounted:

```tsx
<Tabs value={activeMode} onChange={handleModeChange} variant="pills">
  <Tabs.List>
    <Tabs.Tab value="summary">Summary</Tabs.Tab>
    <Tabs.Tab value="human">Human</Tabs.Tab>
    <Tabs.Tab value="graph">Graph</Tabs.Tab>
    <Tabs.Tab value="json">JSON</Tabs.Tab>
  </Tabs.List>
  <div onClick={handleReferenceClick}>
    <Tabs.Panel value="summary" pt="md">{/* Summary content */}</Tabs.Panel>
    <Tabs.Panel value="human" pt="md"><HumanReadableView resource={resource} /></Tabs.Panel>
    <Tabs.Panel value="graph" pt="md">
      <Suspense fallback={<Skeleton h={600} />}>
        <ResourceGraphView />
      </Suspense>
    </Tabs.Panel>
    <Tabs.Panel value="json" pt="md"><JsonModeView resource={resource} /></Tabs.Panel>
  </div>
</Tabs>
```

This works because Mantine's default IS keepMounted=true; we deliberately do NOT pass `keepMounted={false}` at the root. [VERIFIED: Mantine 8 docs + MiiModuleTabs counter-example]

### Pattern 3: Lazy ResourceGraphView with Suspense

Already done in `App.tsx:92-96`:

```tsx
// Source: src/App.tsx:92-96 [VERIFIED]
const ResourceGraphView = lazy(() =>
  retry(() => import('./components/explorer/ResourceGraphView')).then((m) => ({
    default: m.ResourceGraphView,
  })),
);
```

For Phase 54, **either** import the same lazy `ResourceGraphView` defined at App.tsx (export it from there or move to a shared module), OR re-declare the lazy import inside `ResourceDetailPage`. **Recommendation**: extract the lazy declaration into a local constant inside `ResourceDetailPage.tsx` (or a tiny `src/components/explorer/lazyResourceGraphView.ts` helper) so the component file remains self-contained. React's lazy cache deduplicates the import across re-renders and StrictMode (per App.tsx comment lines 36-38), so duplicate `lazy(...)` calls for the same dynamic import are safe but module-scoped is required.

For the Suspense fallback height: choose `h={600}` (matches the React Flow canvas `h="min(70vh, 720px)"` baseline at `ResourceGraphView.tsx:172`). This avoids layout shift when the chunk resolves.

### Pattern 4: Navigate Redirect (react-router-dom v7)

Replace the existing `/graph` Route elements:

```tsx
// Before (App.tsx:147)
<Route path=":resourceType/:id/graph" element={<ResourceGraphView />} />

// After
<Route path=":resourceType/:id/graph" element={
  <NavigateToMode mode="graph" />
} />
```

Where `NavigateToMode` is a tiny adapter:

```tsx
import { Navigate, useParams } from 'react-router-dom';
function NavigateToMode({ mode }: { mode: string }) {
  const { resourceType, id, patientId } = useParams<{
    resourceType: string;
    id: string;
    patientId?: string;
  }>();
  const target = patientId
    ? `/patients/${patientId}/${resourceType}/${id}?mode=${mode}`
    : `/explorer/${resourceType}/${id}?mode=${mode}`;
  return <Navigate to={target} replace />;
}
```

`replace` ensures the original `/graph` URL doesn't accumulate in history. [CITED: react-router-dom Navigate docs — `replace` prop replaces the current entry]

### Pattern 5: Validation Chip (offline structural)

```tsx
// Source: src/quality/structuralValidator.ts:43 [VERIFIED]
import { createStructuralBackend } from '../../quality/structuralValidator';
import { getProfileForType } from '../../quality/profiles';

// Inside JsonModeView:
const backend = useMemo(() => createStructuralBackend(getProfileForType), []);
const [issueCount, setIssueCount] = useState<number | null>(null);

useEffect(() => {
  let cancelled = false;
  backend.validate(resource).then((issues) => {
    if (!cancelled) setIssueCount(issues.length);
  });
  return () => { cancelled = true; };
}, [resource, backend]);

// Render
<Badge color={issueCount === 0 ? 'teal' : 'yellow'}>
  {issueCount === null ? '…' : `${issueCount} ${issueCount === 1 ? 'issue' : 'issues'}`}
</Badge>
```

Note: `validate` returns `Promise<OperationOutcomeIssue[]>` (per `ValidationBackend` interface). It is *internally synchronous* for the structural backend (per inline comment at structuralValidator.ts:50 "Structural validator is synchronous + offline; signal accepted for interface symmetry only"), but the API is Promise-typed. Use the cancellation pattern above to be safe.

`getProfileForType` returns `null` for resource types without bundled MII profiles (full list at `src/quality/profiles/index.ts:29-37`: Condition, Observation, Patient, Procedure, MedicationStatement, Encounter, Consent). For other types `validateStructural` returns `[]` (no issues — see structuralValidator.ts:25 `if (!profile) return [];`). The chip will render `0 issues` for unprofiled types — that's the correct behavior (we can't validate what we don't have a profile for).

### Pattern 6: Copy + Download Toolbar

```tsx
// Copy
import { notifications } from '@mantine/notifications';

const handleCopy = useCallback(async () => {
  try {
    await navigator.clipboard.writeText(JSON.stringify(resource, null, 2));
    notifications.show({
      title: 'Copied to clipboard',
      message: `${resource.resourceType}/${resource.id} (${(JSON.stringify(resource).length / 1024).toFixed(1)} KB)`,
      color: 'teal',
    });
  } catch {
    notifications.show({
      title: 'Copy failed',
      message: 'Clipboard permission was denied. Try keyboard shortcut Cmd/Ctrl+C after selecting the JSON.',
      color: 'red',
    });
  }
}, [resource]);

// Download
import { downloadString } from '../../utils/export';

const handleDownload = useCallback(() => {
  const filename = `${resource.resourceType}-${resource.id}.json`;
  downloadString(JSON.stringify(resource, null, 2), filename, 'application/json');
}, [resource]);
```

Reuses the existing `downloadString` (Blob → URL → anchor → click → revoke pattern) at `src/utils/export.ts:60` — DO NOT hand-roll. [VERIFIED]

### Anti-Patterns to Avoid

- **DO NOT pass `keepMounted={false}` at the root** — would force remount on every mode switch and destroy the graph's React Flow state (the entire reason the v1.8 STATE.md decision picked Tabs over SegmentedControl).
- **DO NOT push a history entry on mode switch** — without `{ replace: true }`, the back button would step through every mode the user hovered. Locked CONTEXT D-02.
- **DO NOT keep the existing `activeTab` state alongside `?mode=`** — single source of truth is the URL (CONTEXT D-08). Two state sources will desynchronize.
- **DO NOT remove the `handleReferenceClick` `<div onClick>` wrapper** — it intercepts FHIR reference anchor clicks rendered by Medplum's ReferenceDisplay and `ReferenceLink`. The wrapper must continue to surround all 4 Tabs.Panel elements (or at minimum the Summary, Human, JSON panels). Graph mode renders `ResourceGraphView` which navigates via `useNavigate` (no anchor interception needed).
- **DO NOT add `?mode=` to the parent `/explorer` or `/patients/:patientId` routes** — only `/explorer/:type/:id` and `/patients/:patientId/:resourceType/:id` honor `?mode=`. The list pages already use `?tab=` for their own tab semantics (`QualityOverviewPage`, `PatientListPage`); namespace collision avoided.
- **DO NOT call `validate()` synchronously assuming it's instant** — even though structural validation is internally synchronous, the typed return is `Promise`. Always use the `useEffect + cancelled` pattern (Pattern 5).

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| File download | Custom Blob + anchor click + revokeObjectURL | `downloadString` from `src/utils/export.ts:60` | Already battle-tested with proper cleanup (revoke after click); used by 4+ call sites. |
| Toast notification | DIY top-right banner | `notifications.show` from `@mantine/notifications` | Wired in `main.tsx`; consistent UX with the rest of the app. |
| Keyboard shortcut handler | Direct `document.addEventListener('keydown')` | `useShortcuts` from `src/hooks/useShortcuts.ts` | Phase 52's hook handles the input-focus guard, ref-stable shortcuts, and cleanup. CONTEXT D-03. |
| FHIR resource summary | Inline switch/case on resourceType | `summarizeResource` from `src/utils/summarizeResource.ts` | Already covers all 8 typed types + generic fallback; used by 5+ surfaces. |
| URL search-param updates | Custom `useNavigate` + URL string concat | `useSearchParams` + `setSearchParams(next, { replace: true })` | Idiomatic v7 pattern; preserves other params; no full-page nav. |
| JSON viewer | Yet another `<pre>` JSON dump | `JsonViewer` from `src/components/json/JsonViewer.tsx` | PEEK-06 single source of truth — duplicating it would BREAK the grep gate that Phase 52 enforces. |
| Reference resolution | New fetch logic for "References out" | `useReferenceResolver` from `src/hooks/useReferenceResolver.ts` | Already shared with `ReferenceLink`; session cache + negative cache + StrictMode-safe. |
| Lazy chunk wrapping | Direct `lazy(() => import(...))` | `lazy(() => retry(() => import(...)).then(m => ({ default: m.X })))` | The `retry` wrapper handles chunk-load failures (3 retries, 100/300/900ms backoff); pattern at App.tsx:48-96. |
| Reverse-reference panel | New "Referenced by" section | Existing `IncomingReferencesPanel` / `PatientRelatedResources` (both delegate to `RelatedResourcesPanel`) | Already render fine — Phase 54 just MOVES them inside the Summary tab panel. |

**Key insight:** Phase 54 is almost entirely a *recomposition* of existing primitives. The only genuinely new code is the small `keyFieldsRegistry` (8 typed handlers + generic fallback) and the `KeyFieldsTable` + `JsonModeView` UI shells.

## JSON Mode Line Numbers (open design item)

SHELL-04 requires "line-numbered JSON body". The current `JsonViewer` (Phase 52) wraps `JsonTreeView` — a *collapsible tree*. Line numbers don't apply to a tree view; they apply to a flat text rendering.

### Option A — RECOMMENDED: extend JsonViewer with `showLineNumbers` prop

Add a `showLineNumbers?: boolean` prop. When true, render a flat `<pre>`-style JSON block (using the existing `JsonSyntaxHighlight.tsx` tokenizer at `src/components/explorer/JsonSyntaxHighlight.tsx`) with a left-gutter line-number column. When false (default), render the existing `JsonTreeView` (preserves drawer + DeveloperJsonView behavior).

Pros:
- Preserves PEEK-06 invariant (single JSON source of truth — `JsonViewer` is still the only JSON renderer in the app).
- Reuses the existing `JsonSyntaxHighlight` tokenizer (already in repo, well-tested).
- The JSON tab in mode 4 gets line numbers; the peek drawer keeps the collapsible tree.

Cons:
- `JsonViewer` becomes two-modal — the planner must keep the drawer call site at `showLineNumbers={false}` (or omitted, default falsy).

Implementation sketch (~30 LOC extension):
```tsx
export interface JsonViewerProps {
  resource: Resource;
  h?: string | number;
  showLineNumbers?: boolean; // NEW
}

export function JsonViewer({ resource, h = '100%', showLineNumbers = false }: JsonViewerProps) {
  if (showLineNumbers) {
    return <ScrollArea h={h}><JsonWithLineNumbers data={resource} /></ScrollArea>;
  }
  return <ScrollArea h={h}><JsonTreeView data={resource} /></ScrollArea>;
}
```

### Option B: introduce a sibling `JsonLinedView` component

Create a new `src/components/json/JsonLinedView.tsx` next to `JsonViewer.tsx`, used only by JSON mode.

Pros: cleaner separation; no two-modal component.
Cons: technically a *third* JSON renderer in the codebase (JsonTreeView via JsonViewer, JsonSyntaxHighlight standalone, the new flat one) — risks PEEK-06 grep gate confusion. Documented exception would be required.

### Recommendation: Option A

The grep gate at PEEK-06 (`git grep -rn "react-syntax-highlighter\|JsonTreeView" src/`) checks specifically for `react-syntax-highlighter` and `JsonTreeView`. Adding a flat-line-numbered branch INSIDE `JsonViewer` doesn't violate it (we don't import `JsonTreeView` from a new location, and we don't introduce `react-syntax-highlighter`). Plus the user-facing semantics make sense: "the JSON viewer can show line numbers" is more discoverable than "we have two JSON viewers."

## Common Pitfalls

### Pitfall 1: keepMounted root override

**What goes wrong:** Setting `keepMounted={false}` on `<Tabs.Panel value="graph">` doesn't unmount the panel — and conversely, omitting `keepMounted={false}` at root with the assumption that "tabs default to lazy mounting" gets you eager mounting of all 4 panels.

**Why:** Mantine `<Tabs>` defaults `keepMounted={true}` at root and OR-overrides per-Panel `keepMounted={false}` (verified at `MiiModuleTabs.tsx:202-214` which documents this gotcha).

**For Phase 54:** We *want* all 4 panels to stay mounted (locked CONTEXT D-01). So leave `keepMounted` unset at root (defaults to true) and unset on each Panel (each defaults to true). Don't pass any `keepMounted` props.

**Warning sign:** Graph re-renders / loses zoom/pan state when switching to JSON and back.

### Pitfall 2: ResourceGraphView's own header re-renders inside the tab

**What goes wrong:** `ResourceGraphView` renders its own `<Title>Reference graph</Title>`, "Back to resource" button, and depth slider in a `<Stack gap="lg" p="lg">` (lines 124-141 of ResourceGraphView.tsx). Inside a Tabs.Panel this creates visually doubled headers (the page already has the resource heading at the top).

**Why:** ResourceGraphView was designed as a standalone route page in Phase 49.

**Mitigation options:**
- Accept the doubled header for Phase 54; defer cleanup to Phase 57 (cosmetic, not functional).
- Pass a `compact?: boolean` prop to ResourceGraphView that hides its own Title/Back button when true. New prop, simple flag.
- Refactor ResourceGraphView into `<ResourceGraphCanvas>` (the React Flow + slider) + `<ResourceGraphView>` (the page wrapper using the canvas).

**Recommendation:** Add a `compact` prop. Smallest change, preserves the standalone Graph route behavior pre-redirect (in case redirect strategy needs adjustment), and doesn't require a refactor.

**Warning sign:** Two "Back" buttons or two titles visible in mode 3.

### Pitfall 3: useSearchParams stale closure on shortcut handler

**What goes wrong:** Capturing `setSearchParams` or `searchParams` inside the `useShortcuts` shortcut object can lead to stale closures if the user navigates between two resources without unmounting (unlikely with current routing but possible).

**Why:** `useShortcuts` (`src/hooks/useShortcuts.ts:21-22`) stores shortcuts in a ref and updates the ref on every render — so handlers DO see fresh closures. But the handlers themselves are recreated on every render, which is fine.

**Mitigation:** Define handlers inline in the shortcuts object literal:
```tsx
useShortcuts({
  '1': () => handleModeChange('summary'),
  '2': () => handleModeChange('human'),
  '3': () => handleModeChange('graph'),
  '4': () => handleModeChange('json'),
});
```
Where `handleModeChange` is the `setSearchParams` wrapper from Pattern 1.

**Warning sign:** Pressing `2` switches to a stale mode; React DevTools shows the wrong active tab.

### Pitfall 4: Validation chip race condition on resource swap

**What goes wrong:** If the user navigates from `/explorer/Patient/A` to `/explorer/Patient/B` very quickly, the async validation Promise for resource A could resolve AFTER B is loaded — and update the chip with A's count.

**Why:** `Promise.then` doesn't know that `resource` changed.

**Mitigation:** Use the `cancelled` flag pattern in Pattern 5. The `useEffect` cleanup sets `cancelled = true`; the `.then` callback checks before `setIssueCount`.

**Warning sign:** Chip shows count for wrong resource after rapid navigation.

### Pitfall 5: Anchor click interception swallowing toolbar clicks

**What goes wrong:** The current `handleReferenceClick` at `ResourceDetailPage.tsx:105-124` is bound to a `<div onClick>` wrapper around the Tabs.Panel content. If the JSON-mode toolbar's `<Anchor href="/quality" component={Link}>Open in validator</Anchor>` is INSIDE that wrapper, the interceptor will see its href, fail the FHIR-reference regex (because `/quality` doesn't match `/Type/id`), and fall through to default link behavior — fine. BUT the regex match is `href.match(/\/([A-Z][a-zA-Z]+)\/([A-Za-z0-9][A-Za-z0-9\-.]{0,63})$/)` which only triggers on FHIR-shaped URLs. `/quality` won't match.

**Status:** Not a real pitfall — the regex is sufficiently restrictive. Documented for clarity.

**Verification:** Confirm by reading `ResourceDetailPage.tsx:113`: regex is `\/([A-Z][a-zA-Z]+)\/([A-Za-z0-9][A-Za-z0-9\-.]{0,63})$` — requires `/PascalCase/id` at end of URL. `/quality` doesn't match. ✓

### Pitfall 6: ?mode=graph redirect loop

**What goes wrong:** If the `<Navigate replace>` redirect from `/graph` lands on `/explorer/:type/:id?mode=graph` AND `ResourceDetailPage` then somehow re-emits a path-based navigation back to `/graph`, you get an infinite loop.

**Why:** Defensive concern only — there's no code path that does this today.

**Mitigation:** After Phase 54, the `/graph` route ONLY renders `<NavigateToMode mode="graph" />`. ResourceDetailPage never navigates to `/graph` (the existing "Graph" button at lines 154-168 is REMOVED per CONTEXT D-08). So no loop is possible.

**Warning sign:** Browser URL flips between `/explorer/X/Y/graph` and `/explorer/X/Y?mode=graph`.

### Pitfall 7: Mantine `<Tabs.Panel>` doesn't accept `tabIndex`

**What goes wrong:** If a planner tries to make tab panels keyboard-focusable for the shortcut hook to "see" them as focused, this won't work — `Tabs.Panel` renders a div with `role="tabpanel"` and Mantine controls `tabIndex` internally.

**Mitigation:** Don't try. The shortcut hook (`useShortcuts`) already handles the input-focus guard (skips when INPUT/TEXTAREA/SELECT is focused). Mode shortcuts work from anywhere on the page that isn't an input.

## Code Examples

### Example 1: Full ResourceDetailPage skeleton (post-Phase-54)

```tsx
// Source: composition of patterns above [VERIFIED via existing codebase analogues]
import { useEffect, useState, useCallback, useMemo, lazy, Suspense } from 'react';
import { useParams, useNavigate, useSearchParams } from 'react-router-dom';
import { useMedplum } from '@medplum/react-hooks';
import { Tabs, Stack, Title, Alert, Skeleton, Button, Group } from '@mantine/core';
import { IconArrowLeft } from '@tabler/icons-react';
import type { Resource, ResourceType } from '@medplum/fhirtypes';
import { useBreadcrumbTrail } from '../../hooks/useBreadcrumbTrail';
import { useShortcuts } from '../../hooks/useShortcuts';
import { NavigationBreadcrumbs } from './NavigationBreadcrumbs';
import { HumanReadableView } from './HumanReadableView';
import { JsonModeView } from './JsonModeView';
import { KeyFieldsTable } from './KeyFieldsTable';
import { PatientRelatedResources } from './PatientRelatedResources';
import { IncomingReferencesPanel } from './IncomingReferencesPanel';
import { summarizeResource } from '../../utils/summarizeResource';
import { retry } from '../../utils/lazyRetry';

const ResourceGraphView = lazy(() =>
  retry(() => import('./ResourceGraphView')).then((m) => ({ default: m.ResourceGraphView })),
);

const VALID_MODES = new Set(['summary', 'human', 'graph', 'json'] as const);
type Mode = 'summary' | 'human' | 'graph' | 'json';
const DEFAULT_MODE: Mode = 'summary';

const FHIR_REFERENCE_PATTERN = /^[A-Z][a-zA-Z]+$/;
const FHIR_ID_PATTERN = /^[A-Za-z0-9][A-Za-z0-9\-.]{0,63}$/;
function isValidFhirReference(rt: string, id: string) {
  return FHIR_REFERENCE_PATTERN.test(rt) && FHIR_ID_PATTERN.test(id);
}

export function ResourceDetailPage() {
  const { resourceType, id, patientId } = useParams<{
    resourceType: string; id: string; patientId?: string;
  }>();
  const navigate = useNavigate();
  const client = useMedplum();
  const basePath = patientId ? `/patients/${patientId}` : '/explorer';
  const breadcrumbs = useBreadcrumbTrail(basePath);

  const [resource, setResource] = useState<Resource | undefined>();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | undefined>();

  const [searchParams, setSearchParams] = useSearchParams();
  const modeParam = searchParams.get('mode');
  const activeMode: Mode =
    modeParam && VALID_MODES.has(modeParam as Mode) ? (modeParam as Mode) : DEFAULT_MODE;

  const handleModeChange = useCallback((value: string | null) => {
    if (!value || !VALID_MODES.has(value as Mode)) return;
    const next = new URLSearchParams(searchParams);
    next.set('mode', value);
    setSearchParams(next, { replace: true });
  }, [searchParams, setSearchParams]);

  useShortcuts({
    '1': () => handleModeChange('summary'),
    '2': () => handleModeChange('human'),
    '3': () => handleModeChange('graph'),
    '4': () => handleModeChange('json'),
  });

  useEffect(() => {
    if (!resourceType || !id) return;
    let cancelled = false;
    setLoading(true);
    setError(undefined);
    setResource(undefined);
    client.readResource(resourceType as ResourceType, id)
      .then((r) => { if (!cancelled) { setResource(r); setLoading(false); } })
      .catch((err: unknown) => {
        if (cancelled) return;
        const msg = err instanceof Error && err.message.includes('Not found')
          ? `Resource not found: ${resourceType}/${id} does not exist on this server.`
          : `Failed to load resource: Could not retrieve ${resourceType}/${id}. Check your connection and try again.`;
        setError(msg); setLoading(false);
      });
    return () => { cancelled = true; };
  }, [client, resourceType, id]);

  const handleReferenceClick = useCallback((e: React.MouseEvent) => {
    const target = e.target as HTMLElement;
    const anchor = target.closest('a[href]') as HTMLAnchorElement | null;
    if (!anchor) return;
    const href = anchor.getAttribute('href') || '';
    const m = href.match(/\/([A-Z][a-zA-Z]+)\/([A-Za-z0-9][A-Za-z0-9\-.]{0,63})$/);
    if (m) {
      const [, refType, refId] = m;
      if (isValidFhirReference(refType, refId)) {
        e.preventDefault();
        breadcrumbs.push({ resourceType: refType, id: refId });
      }
    }
  }, [breadcrumbs]);

  if (!resourceType || !id) {
    return <Alert color="red" title="Invalid URL">Missing resource type or ID in the URL.</Alert>;
  }

  return (
    <Stack gap="lg">
      <NavigationBreadcrumbs
        trail={breadcrumbs.trail}
        onNavigate={breadcrumbs.navigateTo}
        currentResourceType={resourceType}
        currentId={id}
        basePath={basePath}
      />

      <Group>
        <Button
          variant="subtle"
          leftSection={<IconArrowLeft size={16} />}
          onClick={() => navigate(patientId ? `/patients/${patientId}` : `/explorer/${resourceType}`)}
        >
          Back to results
        </Button>
        <Title order={2}>{resourceType}/{id}</Title>
      </Group>

      {loading && (
        <Stack gap="sm">
          <Skeleton height={32} />
          <Skeleton height={200} />
          <Skeleton height={200} />
        </Stack>
      )}

      {error && (
        <Alert color="red" title={error.startsWith('Resource not found') ? 'Resource not found' : 'Error'}>
          {error}
        </Alert>
      )}

      {resource && (
        <Tabs value={activeMode} onChange={handleModeChange} variant="pills">
          <Tabs.List>
            <Tabs.Tab value="summary">Summary</Tabs.Tab>
            <Tabs.Tab value="human">Human</Tabs.Tab>
            <Tabs.Tab value="graph">Graph</Tabs.Tab>
            <Tabs.Tab value="json">JSON</Tabs.Tab>
          </Tabs.List>

          {/* eslint-disable-next-line jsx-a11y/click-events-have-key-events, jsx-a11y/no-static-element-interactions */}
          <div onClick={handleReferenceClick}>
            <Tabs.Panel value="summary" pt="md">
              <Stack gap="lg">
                <Title order={3}>{summarizeResource(resource).primary}</Title>
                <KeyFieldsTable resource={resource} />
                {resource.resourceType === 'Patient' && id
                  ? <PatientRelatedResources patientId={id} />
                  : <IncomingReferencesPanel resource={resource} />}
              </Stack>
            </Tabs.Panel>
            <Tabs.Panel value="human" pt="md">
              <HumanReadableView resource={resource} />
            </Tabs.Panel>
            <Tabs.Panel value="graph" pt="md">
              <Suspense fallback={<Skeleton h={600} />}>
                <ResourceGraphView compact />
              </Suspense>
            </Tabs.Panel>
            <Tabs.Panel value="json" pt="md">
              <JsonModeView resource={resource} />
            </Tabs.Panel>
          </div>
        </Tabs>
      )}
    </Stack>
  );
}
```

### Example 2: keyFieldsRegistry skeleton

```tsx
// New file: src/utils/keyFieldsRegistry.ts
import type {
  Resource, Patient, Observation, Condition, Encounter,
  MedicationStatement, Procedure, DiagnosticReport, AllergyIntolerance,
} from '@medplum/fhirtypes';
import { getCodeDisplay, toRecord } from './fhir-helpers';

export interface KeyFieldEntry {
  label: string;
  value: string | undefined;
}

export function getKeyFields(r: Resource): KeyFieldEntry[] {
  switch (r.resourceType) {
    case 'Patient':              return patientFields(r as Patient);
    case 'Observation':          return observationFields(r as Observation);
    case 'Condition':            return conditionFields(r as Condition);
    case 'Encounter':            return encounterFields(r as Encounter);
    case 'MedicationStatement':  return medStatementFields(r as MedicationStatement);
    case 'Procedure':            return procedureFields(r as Procedure);
    case 'DiagnosticReport':     return diagReportFields(r as DiagnosticReport);
    case 'AllergyIntolerance':   return allergyFields(r as AllergyIntolerance);
    default:                     return genericFields(r);
  }
}

function patientFields(p: Patient): KeyFieldEntry[] {
  return [
    { label: 'Status',       value: p.active === true ? 'Active' : p.active === false ? 'Inactive' : undefined },
    { label: 'Gender',       value: p.gender },
    { label: 'Birth date',   value: p.birthDate },
    { label: 'Identifier',   value: p.identifier?.[0]?.value },
    { label: 'Phone',        value: p.telecom?.find(t => t.system === 'phone')?.value },
  ];
}

// ... (similar 4-6 field pickers for the other 7 types — Claude's discretion per CONTEXT D-06)

function genericFields(r: Resource): KeyFieldEntry[] {
  const obj = toRecord(r);
  const skip = new Set(['resourceType', 'id', 'meta', 'text']);
  const keys = Object.keys(obj).filter(k => !skip.has(k)).slice(0, 4);
  return keys.map(k => ({
    label: k,
    value: JSON.stringify(obj[k]).slice(0, 80),
  }));
}
```

### Example 3: KeyFieldsTable

```tsx
// New file: src/components/explorer/KeyFieldsTable.tsx
import { Table, Text } from '@mantine/core';
import type { Resource } from '@medplum/fhirtypes';
import { getKeyFields } from '../../utils/keyFieldsRegistry';

export function KeyFieldsTable({ resource }: { resource: Resource }) {
  const fields = getKeyFields(resource);
  return (
    <Table withTableBorder verticalSpacing="xs">
      <Table.Tbody>
        {fields.map((f) => (
          <Table.Tr key={f.label}>
            <Table.Td style={{ width: 180, fontWeight: 500 }}>
              <Text size="sm" c="dimmed">{f.label}</Text>
            </Table.Td>
            <Table.Td>
              {f.value
                ? <Text size="sm">{f.value}</Text>
                : <Text size="sm" c="dimmed">—</Text>}
            </Table.Td>
          </Table.Tr>
        ))}
      </Table.Tbody>
    </Table>
  );
}
```

### Example 4: JsonModeView

```tsx
// New file: src/components/explorer/JsonModeView.tsx
import { useCallback, useEffect, useMemo, useState } from 'react';
import { Anchor, Badge, Button, Group, Stack } from '@mantine/core';
import { IconCopy, IconDownload } from '@tabler/icons-react';
import { Link } from 'react-router-dom';
import { notifications } from '@mantine/notifications';
import type { Resource } from '@medplum/fhirtypes';
import { JsonViewer } from '../json/JsonViewer';
import { downloadString } from '../../utils/export';
import { createStructuralBackend } from '../../quality/structuralValidator';
import { getProfileForType } from '../../quality/profiles';

export function JsonModeView({ resource }: { resource: Resource }) {
  const backend = useMemo(() => createStructuralBackend(getProfileForType), []);
  const [issueCount, setIssueCount] = useState<number | null>(null);

  useEffect(() => {
    let cancelled = false;
    backend.validate(resource).then((issues) => {
      if (!cancelled) setIssueCount(issues.length);
    });
    return () => { cancelled = true; };
  }, [resource, backend]);

  const handleCopy = useCallback(async () => {
    try {
      await navigator.clipboard.writeText(JSON.stringify(resource, null, 2));
      notifications.show({
        title: 'Copied to clipboard',
        message: `${resource.resourceType}/${resource.id}`,
        color: 'teal',
      });
    } catch {
      notifications.show({
        title: 'Copy failed',
        message: 'Clipboard access was denied.',
        color: 'red',
      });
    }
  }, [resource]);

  const handleDownload = useCallback(() => {
    downloadString(
      JSON.stringify(resource, null, 2),
      `${resource.resourceType}-${resource.id}.json`,
      'application/json',
    );
  }, [resource]);

  return (
    <Stack gap="sm">
      <Group justify="space-between">
        <Group gap="xs">
          <Button
            size="xs"
            variant="light"
            leftSection={<IconCopy size={14} />}
            onClick={handleCopy}
          >Copy</Button>
          <Button
            size="xs"
            variant="light"
            leftSection={<IconDownload size={14} />}
            onClick={handleDownload}
          >Download</Button>
        </Group>
        <Group gap="sm">
          <Badge color={issueCount === 0 ? 'teal' : 'yellow'} variant="light">
            {issueCount === null ? '…' : `${issueCount} ${issueCount === 1 ? 'issue' : 'issues'}`}
          </Badge>
          <Anchor component={Link} to="/quality" size="sm">Open in validator</Anchor>
        </Group>
      </Group>
      <JsonViewer resource={resource} h="calc(100vh - 320px)" showLineNumbers />
    </Stack>
  );
}
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| Two `<Tabs.Tab>` with hardcoded values "human-readable" / "developer" | Four `<Tabs.Tab>` with values "summary" / "human" / "graph" / "json" | Phase 54 | URL-driven mode selection; key-1/2/3/4 shortcuts; preserves graph state via keepMounted |
| `activeTab` React state for tab selection | `useSearchParams` reading `?mode=` | Phase 54 | URL-shareable mode; back/forward navigation respects mode |
| Separate `/explorer/:type/:id/graph` route page | Inline `<Tabs.Panel value="graph">` lazy-loaded | Phase 54 | Single "resource detail" surface; graph shares scroll position with siblings |
| `DeveloperJsonView` (just `JsonViewer` shim) | `JsonModeView` (toolbar + JsonViewer) | Phase 54 | Adds Copy/Download/Validation chip; `DeveloperJsonView` likely deleted |
| Raw `document.addEventListener('keydown')` in ResourceDetailPage | `useShortcuts` hook | Phase 54 | Consistent with Phase 52/53 pattern; input-focus guard centralized |
| Standalone "Graph" `<Button>` in header | Mode 3 in switcher | Phase 54 | One way to reach graph; header less cluttered |

**Deprecated/outdated after Phase 54:**
- `src/components/explorer/DeveloperJsonView.tsx` — superseded by `JsonModeView` (planner decides whether to delete or leave as a thin re-export)
- `/explorer/:type/:id/graph` route element rendering `ResourceGraphView` directly — becomes a `<Navigate>` redirect

## Project Constraints (from CLAUDE.md)

- **Tech stack**: React 18 + Vite + TypeScript with Medplum React components — Phase 54 honors all (no new packages).
- **No write operations** to FHIR — Phase 54 is read-only (Copy/Download are local-only browser operations; no FHIR PUT/POST).
- **License**: MIT — no new dependencies, so no license-compatibility check needed.
- **Mantine 9.x is forbidden** — Phase 54 uses Mantine 8.3.18 (`Tabs variant="pills"`, `keepMounted`, `Badge`, `Anchor` all available in v8).
- **Tailwind is forbidden** — Phase 54 uses only Mantine + CSS modules.
- **react-query is forbidden** — Phase 54 does its own `useEffect + cancelled` for the validation chip. No new caching layers.
- **GSD workflow enforcement**: Phase 54 will be executed via `/gsd-execute-phase 54`. ✓
- **Reverse-reference catalog is curated** (per CLAUDE.md "Do NOT use" implicit; CONTEXT carry-forward) — Phase 54 reuses the existing catalog via `IncomingReferencesPanel` / `PatientRelatedResources` without expansion.

## Assumptions Log

| # | Claim | Section | Risk if Wrong |
|---|-------|---------|---------------|
| A1 | `setSearchParams(next, { replace: true })` does not push a history entry (only verified via existing usage in `QualityOverviewPage.tsx:140`, not directly tested in v7 docs). | Pattern 1 | If `replace: true` were ignored, the back button would step through every mode swap. Mitigation: vitest assertion on `history.length` after a mode change. [ASSUMED — pending v7 docs confirmation] |
| A2 | `<Navigate replace>` in react-router-dom v7 preserves URL search params on the target unless overwritten by the `to` URL. | Pattern 4 | Phase 54 redirects from `/graph` (no params expected) to `/?mode=graph` (param present), so this isn't an issue in practice. [ASSUMED — pending v7 docs confirmation, but conventional behavior] |
| A3 | `JsonViewer` adding a `showLineNumbers` prop does not violate the PEEK-06 grep gate (`git grep -rn "react-syntax-highlighter\|JsonTreeView" src/`). | JSON Mode Line Numbers | If the grep gate counts grep matches inside `JsonViewer.tsx` (not just imports), adding a `JsonTreeView` reference could fail it. Mitigation: keep the existing `import { JsonTreeView as TreeView }` line unchanged; the line-numbered branch uses `JsonSyntaxHighlight` tokens (no `JsonTreeView` reference). [ASSUMED — verified by reading the existing import at JsonViewer.tsx:3] |
| A4 | `notifications.show` is wired in `main.tsx` (the `<Notifications />` component is mounted at the root). | Pattern 6 | If not mounted, `notifications.show` calls are no-ops. Mitigation: confirmed at `main.tsx:10` import + grep for `<Notifications` mount. [VERIFIED via grep — notification import at main.tsx:10] |
| A5 | `ResourceGraphView`'s React Flow state (zoom, pan, node positions) survives a `Tabs.Panel` mode switch when `keepMounted` is true. | Pattern 2 | If React Flow re-initializes on panel re-display, the user loses graph context. Mitigation: vitest test asserting node positions are stable across mode switches. [ASSUMED — keepMounted preserves the React subtree, but React Flow may reset on certain events] |
| A6 | The `compact` prop (suggested for ResourceGraphView in Pitfall 2) is acceptable to add, or alternatively the doubled header is acceptable for Phase 54. | Pitfall 2 | If neither is acceptable, the planner needs a different mitigation (component split). [ASSUMED — confirm in plan-check] |
| A7 | The structural validation chip should default to `0 issues` (teal) for resource types without bundled MII profiles, not show `—` or hide. | Pattern 5 | If users expect `—` for unprofiled types, the green chip is misleading ("we validated and it's fine" vs. "we have no profile to validate against"). Mitigation: use `{issueCount === 0 ? 'no issues' : ...}` and include a Tooltip explaining the validation scope, OR show `n/a` when `getProfileForType` returns null. **Recommend planner add the Tooltip clarification.** [ASSUMED — ambiguous; validate during plan-check] |
| A8 | Recommending Option A (extend JsonViewer with `showLineNumbers` prop) is the right call vs. Option B (sibling JsonLinedView). | JSON Mode Line Numbers | Wrong recommendation could either bloat JsonViewer or violate the spirit of PEEK-06. [ASSUMED — based on judgment; confirm during plan-check] |
| A9 | "References out" deferral to Phase 57 is the right call for Phase 54 scope. | Open Questions / D-05 | If user wants References out in Phase 54, planner must include it (~1-day plan addition: walker over Reference fields + `useReferenceResolver` integration). [ASSUMED — pending discuss-phase or plan-check confirmation] |

## Open Questions

1. **Should "References out" ship in Phase 54 or defer to Phase 57?**
   - What we know: CONTEXT D-05 explicitly leaves this to Claude's discretion based on complexity. SHELL-02 spec lists it. The mechanism — walk top-level fields, find ones of FHIR type Reference, resolve via `useReferenceResolver` — is straightforward but requires either a per-type registry (knowing which fields are References) or a runtime check (looking for `{ reference: 'Type/id' }` shape).
   - What's unclear: Whether "top-level only" (CONTEXT D-05) is sufficient — many references are nested inside arrays (e.g. Observation.performer[]) or sub-objects (e.g. Encounter.location[].location).
   - **Recommendation: Defer to Phase 57.** Justification: Patient-detail unification (LENS-02) is Phase 57's scope; "References out" is a natural part of unified Patient summary. Building a robust Reference walker now risks scope creep. Summary mode in Phase 54 ships with key-fields table + "Referenced by" panel only; "References out" lands in 57.

2. **Should the validation chip render a Tooltip explaining its scope?**
   - What we know: Bundled MII profiles cover only 7 resource types (Condition, Observation, Patient, Procedure, MedicationStatement, Encounter, Consent). For other types `validateStructural` returns `[]` — chip shows `0 issues`.
   - What's unclear: Whether a green "0 issues" chip on an AllergyIntolerance resource (no profile bundled) is misleading.
   - Recommendation: Add a Tooltip on the Badge with text like "Structural validation against bundled MII profile" or "No profile bundled — structural validation skipped". Planner decides exact copy.

3. **Should `DeveloperJsonView` be deleted or kept as a re-export?**
   - What we know: After Phase 54, `JsonModeView` replaces it inside `ResourceDetailPage`. Grep shows no other importers (`grep DeveloperJsonView src` returns only the file itself + ResourceDetailPage import).
   - What's unclear: Whether external tests or future surfaces need it.
   - Recommendation: Delete it. Single source of truth = `JsonViewer` (raw) + `JsonModeView` (with toolbar). The thin `DeveloperJsonView` shim adds no value post-Phase-54.

4. **Should the lazy `ResourceGraphView` declaration be co-located with ResourceDetailPage or shared from App.tsx?**
   - What we know: App.tsx already declares `const ResourceGraphView = lazy(...)` at line 92-96 for the standalone `/graph` route.
   - What's unclear: After Phase 54 the standalone route becomes a `<Navigate>` redirect, so App.tsx's lazy import becomes orphaned. ResourceDetailPage needs its own.
   - Recommendation: Remove the lazy declaration from App.tsx (no longer used after redirect). Add a fresh lazy declaration inside ResourceDetailPage (or a tiny `lazyResourceGraphView.ts`). React's lazy cache ensures only one chunk is fetched per import URL.

## Environment Availability

Phase 54 is purely code/config — no external dependencies, services, or build tools beyond the existing project.

| Dependency | Required By | Available | Version | Fallback |
|------------|------------|-----------|---------|----------|
| Node.js | Build | ✓ | (project standard) | — |
| `npm test` (vitest) | Phase tests | ✓ | 4.1.4 | — |
| `npm run build` (Vite) | Build verification | ✓ | 8.0.4 | — |

No probing required; everything is in `package.json`.

## Validation Architecture

### Test Framework
| Property | Value |
|----------|-------|
| Framework | vitest 4.1.4 + @testing-library/react 16.3.2 + jsdom 29.0.2 |
| Config file | `vitest.config.ts` (verified — globals + jsdom + react plugin) |
| Quick run command | `npm test -- src/__tests__/resource-detail.test.tsx` |
| Full suite command | `npm test` |

### Phase Requirements → Test Map

| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|--------------|
| SHELL-01 | 4 Tabs.Tab elements rendered with values summary/human/graph/json | unit (RTL) | `npm test -- src/__tests__/resource-detail.test.tsx -t "renders 4 mode tabs"` | ❌ Wave 0 (extends existing file) |
| SHELL-01 | Pressing `1` activates Summary tab (input-focus guard intact) | unit (RTL) | `npm test -- src/__tests__/resource-detail.test.tsx -t "keyboard 1 activates Summary"` | ❌ Wave 0 |
| SHELL-01 | `?mode=human` in URL renders Human tab as active on initial load | unit (RTL + MemoryRouter) | `npm test -- src/__tests__/resource-detail.test.tsx -t "URL mode persists"` | ❌ Wave 0 |
| SHELL-01 | Mode change calls `setSearchParams(next, { replace: true })` (no history push) | unit | `npm test -- src/__tests__/resource-detail.test.tsx -t "mode change replaces URL"` | ❌ Wave 0 |
| SHELL-02 | Summary mode shows `summarizeResource(r).primary` as Title | unit (RTL) | `npm test -- src/__tests__/resource-detail-summary-mode.test.tsx -t "primary heading"` | ❌ Wave 0 (new file) |
| SHELL-02 | KeyFieldsTable renders 4-6 rows for each of 8 typed R4 types | unit | `npm test -- src/utils/__tests__/keyFieldsRegistry.test.ts` | ❌ Wave 0 (new file) |
| SHELL-02 | Generic fallback returns 4 fields with truncated JSON values | unit | `npm test -- src/utils/__tests__/keyFieldsRegistry.test.ts -t "generic fallback"` | ❌ Wave 0 |
| SHELL-02 | IncomingReferencesPanel mounts in Summary mode (non-Patient) | unit (RTL) | `npm test -- src/__tests__/resource-detail-summary-mode.test.tsx -t "incoming refs in summary"` | ❌ Wave 0 |
| SHELL-02 | PatientRelatedResources mounts in Summary mode (Patient) | unit (RTL) | `npm test -- src/__tests__/resource-detail-summary-mode.test.tsx -t "patient related in summary"` | ❌ Wave 0 |
| SHELL-03 | Graph mode lazy-loads ResourceGraphView (Suspense fallback visible first) | unit (RTL + lazy) | `npm test -- src/__tests__/resource-detail-graph-mode.test.tsx -t "graph mode lazy"` | ❌ Wave 0 (new file) |
| SHELL-03 | `/explorer/Patient/p1/graph` redirects to `/explorer/Patient/p1?mode=graph` | unit (RTL + MemoryRouter) | `npm test -- src/__tests__/graph-redirect.test.tsx` | ❌ Wave 0 (new file) |
| SHELL-03 | `/patients/p1/Encounter/e1/graph` redirects to `/patients/p1/Encounter/e1?mode=graph` | unit | `npm test -- src/__tests__/graph-redirect.test.tsx -t "patient graph redirect"` | ❌ Wave 0 |
| SHELL-04 | JSON mode renders Copy + Download + Validation chip + "Open in validator" link | unit (RTL) | `npm test -- src/__tests__/json-mode-view.test.tsx` | ❌ Wave 0 (new file) |
| SHELL-04 | Copy button calls `navigator.clipboard.writeText` with formatted JSON | unit (RTL + jsdom clipboard mock) | `npm test -- src/__tests__/json-mode-view.test.tsx -t "copy button"` | ❌ Wave 0 |
| SHELL-04 | Download button triggers a `Blob` + anchor click with correct filename | unit | `npm test -- src/__tests__/json-mode-view.test.tsx -t "download filename"` | ❌ Wave 0 |
| SHELL-04 | Validation chip displays `0 issues` when structural backend returns empty | unit | `npm test -- src/__tests__/json-mode-view.test.tsx -t "chip 0 issues"` | ❌ Wave 0 |
| SHELL-04 | Validation chip displays `N issues` (yellow) when backend returns issues | unit | `npm test -- src/__tests__/json-mode-view.test.tsx -t "chip N issues"` | ❌ Wave 0 |
| SHELL-04 | "Open in validator" Anchor uses `<Link to="/quality">` | unit | `npm test -- src/__tests__/json-mode-view.test.tsx -t "open in validator link"` | ❌ Wave 0 |
| SHELL-04 | JsonViewer with `showLineNumbers` renders a `<pre>` with line-number gutter (per chosen Option A) | unit | `npm test -- src/components/json/__tests__/JsonViewer.test.tsx -t "showLineNumbers"` | ❌ Wave 0 (new file) |

### Sampling Rate

- **Per task commit:** `npm test -- src/__tests__/resource-detail.test.tsx src/__tests__/resource-detail-summary-mode.test.tsx src/__tests__/resource-detail-graph-mode.test.tsx src/__tests__/graph-redirect.test.tsx src/__tests__/json-mode-view.test.tsx src/utils/__tests__/keyFieldsRegistry.test.ts src/components/json/__tests__/JsonViewer.test.tsx`
- **Per wave merge:** `npm test` (full suite) + `npm run build` (TypeScript + Vite production build)
- **Phase gate:** Full suite green; `tsc -b --noEmit` exit 0; bundle delta < +5 KB gz (Phase 54 only adds ~3-4 small files; should be well under)

### Wave 0 Gaps

- [ ] `src/__tests__/resource-detail.test.tsx` — extend with 4-mode shell tests (existing file already mocks ResourceDetailPage)
- [ ] `src/__tests__/resource-detail-summary-mode.test.tsx` — NEW (Summary mode behavior)
- [ ] `src/__tests__/resource-detail-graph-mode.test.tsx` — NEW (Graph mode lazy-load + Suspense fallback)
- [ ] `src/__tests__/graph-redirect.test.tsx` — NEW (Navigate redirect test for both /explorer and /patients flavors)
- [ ] `src/__tests__/json-mode-view.test.tsx` — NEW (Copy / Download / Validation chip / Open in validator)
- [ ] `src/utils/__tests__/keyFieldsRegistry.test.ts` — NEW (8 typed pickers + generic fallback)
- [ ] `src/components/json/__tests__/JsonViewer.test.tsx` — NEW (existing PEEK-06 test for tree mode + new `showLineNumbers` mode)

Wave 0 also needs the standard jsdom polyfills (matchMedia, ResizeObserver, getBoundingClientRect for React Flow, navigator.clipboard mock for Copy). All polyfills exist in `src/__tests__/resource-detail.test.tsx` and `src/components/explorer/__tests__/ResourceGraphView.test.tsx` and can be copy-pasted.

## Sources

### Primary (HIGH confidence)
- `src/components/explorer/ResourceDetailPage.tsx` — current implementation [VERIFIED via Read]
- `src/components/patients/MiiModuleTabs.tsx:202-214` — `<Tabs variant="pills" keepMounted={false}>` pattern + the keepMounted root-default gotcha [VERIFIED via Read]
- `src/components/quality/QualityOverviewPage.tsx:131-141` — `useSearchParams + setSearchParams(next, { replace: true })` pattern [VERIFIED via Read]
- `src/App.tsx:92-96` — `lazy(() => retry(() => import(...)).then(...))` pattern with the retry wrapper [VERIFIED via Read]
- `src/components/layout/AppLayout.tsx:46-51` — `<PeekProvider>` + `<Suspense fallback>` mount [VERIFIED via Read]
- `src/components/json/JsonViewer.tsx` — current single source of truth [VERIFIED via Read]
- `src/components/json/JsonPeekDrawer.tsx` — emits `?mode=json` on Enter [VERIFIED via Read]
- `src/hooks/useShortcuts.ts` — Phase 52 hook with input-focus guard [VERIFIED via Read]
- `src/utils/summarizeResource.ts` — Phase 46 registry covering all 8 typed R4 types [VERIFIED via Read]
- `src/utils/export.ts:60` — `downloadString` Blob+anchor utility [VERIFIED via Read]
- `src/quality/structuralValidator.ts` — `createStructuralBackend` offline validator [VERIFIED via Read]
- `src/quality/profiles/index.ts` — `getProfileForType` (returns null for unprofiled types) [VERIFIED via Read]
- `src/components/explorer/ResourceGraphView.tsx` — current standalone graph view (will be inlined as Tabs.Panel) [VERIFIED via Read]
- `src/components/explorer/IncomingReferencesPanel.tsx` + `PatientRelatedResources.tsx` — existing reverse-reference panels (will move into Summary tab panel) [VERIFIED via Read]
- `src/utils/reverseReferenceCatalog.ts` (referenced) + Phase 48 plan summaries — curated catalog drives both panels [VERIFIED via grep]
- `package.json` — all required deps already pinned [VERIFIED]

### Secondary (MEDIUM confidence)
- `https://mantine.dev/core/tabs/` — `Tabs` component variants and `keepMounted` semantics [CITED via WebFetch]
- `https://reactrouter.com/api/hooks/useSearchParams` — `useSearchParams` v7 signature and `.get()` reading [CITED via WebFetch]

### Tertiary (LOW confidence)
- None — all critical claims have a primary source in the codebase or official docs.

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH — every primitive is already installed and used in production code, with verified file references.
- Architecture: HIGH — patterns 1-6 each have a verified existing analogue in the repo (QualityOverviewPage, MiiModuleTabs, App.tsx, ResourceDetailPage handler, SettingsPage notifications, export.ts).
- Pitfalls: HIGH — pitfalls 1, 2, 4 are documented in existing code (MiiModuleTabs comment, ResourceGraphView structure, useReferenceResolver pattern); pitfalls 3, 5, 6, 7 are defensive based on standard React + Mantine semantics.
- JSON line numbers: MEDIUM — Option A is judgment-based; will be confirmed during plan-check or discuss-phase.
- "References out" deferral: MEDIUM — judgment recommendation; user may override.

**Research date:** 2026-05-04
**Valid until:** 2026-06-04 (30 days — stack is mature, no fast-moving dependencies in scope)
