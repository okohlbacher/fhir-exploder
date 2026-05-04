# Architecture: v1.8 Navigation Redesign Integration

**Domain:** FHIR Exploder — adding navigation redesign features (PEEK / SHELL / EXPL / SIDE / LENS) to an existing v1.7 codebase.
**Researched:** 2026-05-04
**Mode:** Subsequent-milestone integration analysis. Existing code is the ground truth; this doc maps the design handoff onto it.
**Confidence:** HIGH — all integration points verified against `src/` HEAD (commit `26efb93`).

This is an integration-architecture document for an established codebase, not a greenfield study. It answers: *where exactly does each new piece bolt on, what existing code does it touch, and in what order should phases land?*

## Component Map

The existing tree, with v1.8 additions marked. Read this top-down.

```
src/
├── App.tsx                                           — MODIFY (route shape unchanged; add ⌘K Spotlight provider)
├── components/
│   ├── layout/
│   │   ├── AppLayout.tsx                             — MODIFY  (mount <JsonPeekDrawer/> + register global hotkeys)
│   │   ├── Sidebar.tsx                               — REWRITE (Browse/Audit sections + Expert toggle + ⌘K trigger)
│   │   └── ConnectionGatedOutlet.tsx                 — UNCHANGED
│   ├── peek/                                         — NEW directory
│   │   ├── JsonPeekDrawer.tsx                        — NEW (Mantine Drawer + header strip + footer)
│   │   ├── PeekProvider.tsx                          — NEW (context for { peekTarget, open, close })
│   │   ├── usePeekTarget.ts                          — NEW (hook + register/release focus key)
│   │   └── registerGlobalHotkeys.tsx                 — NEW (J / Esc / Cmd+click bindings)
│   ├── json/                                         — NEW directory (extracted shared viewer)
│   │   ├── JsonViewer.tsx                            — NEW (extracted from JsonTreeView; line numbers + search outline)
│   │   └── JsonViewerActions.tsx                     — NEW (Copy / Download / "Open in fhir-validator")
│   ├── shell/                                        — NEW directory (resource shell)
│   │   ├── ResourceShell.tsx                         — NEW (4-mode SegmentedControl host)
│   │   ├── SummaryMode.tsx                           — NEW (uses keyFieldsRegistry)
│   │   ├── HumanMode.tsx                             — THIN WRAPPER around HumanReadableView
│   │   ├── GraphMode.tsx                             — THIN WRAPPER around lazy ResourceGraphView
│   │   ├── JsonMode.tsx                              — NEW (JsonViewer + JsonViewerActions + outline panel)
│   │   ├── keyFieldsRegistry.ts                      — NEW (parallel to summarizeResource registry)
│   │   └── ValidationChip.tsx                        — NEW (small chip; reads cascadingValidator state)
│   ├── command/                                      — NEW directory
│   │   └── CommandPalette.tsx                        — NEW (Mantine Spotlight wrapper)
│   ├── explorer/
│   │   ├── ResourceDetailPage.tsx                    — REWRITE (delegates entirely to <ResourceShell/>)
│   │   ├── SearchResultsPage.tsx                     — MODIFY (Summary column already present; add density toggle + J binding + JSON peek action; row-focus state)
│   │   ├── DeveloperJsonView.tsx                     — DELETE-CANDIDATE (post-extraction; or keep as 3-line wrapper)
│   │   ├── JsonTreeView.tsx                          — MOVE/RENAME to components/json/JsonViewer.tsx (single source — drawer + JSON mode share)
│   │   ├── HumanReadableView.tsx                     — UNCHANGED (mounted by HumanMode)
│   │   ├── IncomingReferencesPanel.tsx               — UNCHANGED (mounted by ResourceShell as persistent footer)
│   │   ├── PatientRelatedResources.tsx               — UNCHANGED (mounted by ResourceShell when type === Patient)
│   │   ├── ReferenceLink.tsx                         — MODIFY (add Cmd+click handler → open peek)
│   │   ├── ExplorerLayout.tsx                        — UNCHANGED (already provides MedplumProvider + 240px rail)
│   │   ├── ResourceGraphView.tsx                     — UNCHANGED (still lazy; mounted by GraphMode)
│   │   └── (rest)                                    — UNCHANGED
│   ├── patients/
│   │   ├── PatientsLayout.tsx                        — MODIFY  (drop separate MedplumProvider once ExplorerLayout becomes the chrome; or keep wrapping if route stays nested)
│   │   ├── PatientDetailPage.tsx                     — REWRITE LIGHT (delegate detail body to <ResourceShell/>; keep MII/FHIR view toggle as Summary-mode key-fields content for Patient)
│   │   ├── PatientHeaderCard.tsx                     — MODIFY (drop PatientHeaderActions; card layout becomes the Patient keyFieldsRegistry render output)
│   │   ├── PatientListPage.tsx                       — MODIFY (Summary column + density toggle + J binding; remove RawPatientButton modal — peek covers it)
│   │   └── (rest)                                    — UNCHANGED
│   └── quality/
│       ├── QualityLayout.tsx                         — UNCHANGED (sidebar v2 reorders sub-nav, layout is unaffected)
│       └── ResourceIssueTable.tsx                    — MODIFY (drill-down rows gain "Peek JSON" overflow item — already lists resource id+type)
├── contexts/
│   ├── ConnectionContext.tsx                         — UNCHANGED
│   ├── SettingsContext.tsx                           — UNCHANGED  (Expert toggle persists in localStorage, not settings.yaml)
│   └── ExpertContext.tsx                             — NEW (boolean + setter; localStorage `ui.expert.v1`)
├── hooks/
│   ├── useReferenceResolver.ts                       — UNCHANGED (drawer reuses for Cmd+click target)
│   └── useResolvedResource.ts                        — UNCHANGED
└── utils/
    ├── summarizeResource.ts                          — UNCHANGED (already at all 5 needed call sites)
    └── reverseReferenceCatalog.ts                    — UNCHANGED
```

Verified counts: 8 source-type entries in `summarizeResource.ts` (Patient, Observation, Condition, Encounter, MedicationStatement, Procedure, DiagnosticReport, AllergyIntolerance) — `keyFieldsRegistry.ts` should mirror those plus a generic fallback walker so coverage parity is automatic.

## Integration Points

### IP-1 — JsonPeekDrawer mount: AppLayout (single instance)

**Decision: Mount `<JsonPeekDrawer/>` and `<PeekProvider>` once at `AppLayout.tsx`.**

The handoff explicitly says so (line 172: "Mount `<JsonPeekDrawer />` once at `AppLayout` level"), and the existing layout structure supports it cleanly:

```tsx
// src/components/layout/AppLayout.tsx (post-modification)
export function AppLayout({ connectionStatus }: AppLayoutProps) {
  return (
    <PeekProvider>
      <ExpertProvider>
        <AppShell navbar={{ width: 240, breakpoint: 0 }} padding="lg">
          <AppShell.Navbar bg="gray.0">
            <Sidebar connectionStatus={connectionStatus} />
          </AppShell.Navbar>
          <AppShell.Main>
            <Suspense fallback={<RouteLoadingFallback />}>
              <Outlet />
            </Suspense>
          </AppShell.Main>
          <CommandPalette />        {/* Mantine Spotlight, listens for ⌘K */}
          <JsonPeekDrawer />         {/* single global instance */}
          {import.meta.env.DEV && <FeedbackButton />}
        </AppShell>
      </ExpertProvider>
    </PeekProvider>
  );
}
```

**Why AppLayout, not App.tsx:**
- AppLayout is rendered *inside* `MedplumProvider`-bearing route layouts only when needed (per-section ExplorerLayout / PatientsLayout / QualityLayout each mount their own `MedplumProvider`). The drawer needs `useMedplum()` to fetch unresolved references, so its consumers must run inside one of those route subtrees.
- Solution: `JsonPeekDrawer` itself does *not* call `useMedplum()` directly. The `peekTarget` state lives in `PeekProvider` (above all route layouts). When the drawer needs to fetch, it relies on the **already-warm `useReferenceResolver` cache** (Phase 47, `referenceCache: Map<\`${type}/${id}\`, Resource | null>`). On a cache miss, the drawer body is rendered by a small inner component that runs `useMedplum()` — this inner component only renders inside `<AppShell.Main>`'s `<Outlet/>` subtree, *but the drawer host (Mantine Drawer) does not need a client to merely toggle visibility*. The inner body is conditionally rendered only when a route subtree has supplied a client via outlet context, otherwise it shows skeleton.
- Mantine Drawer itself works at any tree level; it portals to `document.body` regardless of tree position.

**State management pattern: Context API + `useReducer`. NOT zustand.**

The codebase already uses three identical patterns for app-wide state:
- `ConnectionContext` (provider + hook)
- `SettingsContext` (provider + hook)
- `TerminologyContext` (provider + hook)
- Module-scoped Maps for cross-component caches: `referenceCache` in `useReferenceResolver.ts`, `extensionProfileCache` in `quality/profiles/extensions/index.ts`.

Adding zustand would be the only state library in the repo (rejected per `STACK.md`: "Adding react-query would create two competing cache layers" — same logic). React context with a `useReducer` (`(prev, action) => next`) reducer is the established idiom and is sufficient for `{ peekTarget: { type, id } | null }`.

```ts
// src/components/peek/PeekProvider.tsx
type PeekTarget = { type: string; id: string };
type PeekContext = { target: PeekTarget | null; open: (t: PeekTarget) => void; close: () => void };
const Ctx = createContext<PeekContext | null>(null);
export function PeekProvider({ children }: { children: React.ReactNode }) { ... }
export function usePeekTarget(): PeekContext { ... }
```

**No URL mutation when peeking.** Confirmed in handoff line 160: "URL is **not** mutated when peeking (that's the whole point — keeps it lightweight)." The "Open full →" footer action is the only place `navigate()` fires.

### IP-2 — 4-mode shell vs. PatientHeaderCard

**The PatientHeaderCard layout should be absorbed into the Patient SummaryMode key-fields registry entry.** Handoff is explicit (line 68: "Remove the bespoke `PatientHeaderCard` 'Raw JSON' modal — JSON mode already covers it"). The component itself can survive as the registry entry's render output to minimise test churn; only its `PatientHeaderActions` sub-component is dropped.

Mechanics that avoid breakage:

1. **`ResourceDetailPage.tsx` becomes a 25-line component** that fetches the resource (existing `useEffect` + `client.readResource`) and delegates rendering to `<ResourceShell resource={resource} />`. The fetch logic, error handling, breadcrumbs, and reference-click interception (`handleReferenceClick`) all stay. Keyboard shortcut listener (currently `1`/`2`) extends to `1`/`2`/`3`/`4`.

2. **`ResourceShell.tsx`** owns the SegmentedControl + 4 mode panels:
   - `SummaryMode` — looks up `keyFieldsRegistry[resource.resourceType]`. For `Patient`, the registry entry returns the 3-column avatar/demographics/actions layout currently in `PatientHeaderCard`. For other types, it returns a generic "key fields" property table built from a small spec (4–6 most-asked fields per type, parallel to the `summarizeResource` registry).
   - `HumanMode` — `<HumanReadableView resource={resource} />`. Unchanged.
   - `GraphMode` — lazy-loads `ResourceGraphView` (already code-split). Reuses the `/graph` route's component, just embedded.
   - `JsonMode` — `<JsonViewer data={resource} showLineNumbers showOutline />` + `<JsonViewerActions />` (Copy / Download / Open in fhir-validator).

3. **`PatientDetailPage.tsx`** (existing) currently renders `PatientHeaderCard + PatientTimeline + SegmentedControl(MII|FHIR) + (MiiModuleTabs|FhirResourcesView)`. The redesign shifts this:
   - The Patient resource fetch stays in `PatientDetailPage`.
   - The body becomes `<ResourceShell resource={patient} />`.
   - SummaryMode for Patient returns: `<PatientHeaderCard/>` (without Actions) + `<PatientTimeline/>` + the existing `MII Modules / FHIR Resources` SegmentedControl + (`MiiModuleTabs` | `FhirResourcesView`). All those blocks already exist; only the wrapper structure changes. **PatientHeaderCard.tsx survives, just shorn of its Raw JSON / $everything actions** (those migrate to `JsonViewerActions`).

4. **Backwards compatibility:** existing tests reference `PatientHeaderCard` by name. Keeping `PatientHeaderCard.tsx` as a thin component used by the registry entry minimises test churn — only `PatientHeaderActions` test cases need to be deleted.

5. **Keyboard contract extension** (existing handler in `ResourceDetailPage.tsx:77-94`):
   ```ts
   case '1': setActiveTab('human-readable'); break;
   case '2': setActiveTab('developer'); break;
   ```
   Extends mechanically to `'1'..'4'` mapping to `summary | human | graph | json`. Input-focus guard (lines 79-80) stays as-is.

**Risk:** the existing test suite includes `Sidebar.test.tsx`, `ResourceDetailPage.test.tsx`, `PatientHeaderCard.test.tsx` — each must be updated when the corresponding component changes shape. None of them are pinned by snapshot to PatientHeaderCard's exact DOM (verified by grepping `__snapshots__/PatientRelatedResources.test.tsx.snap` only), so byte-identical preservation is not required.

### IP-3 — Shared JsonViewer extraction

The current state:
- `DeveloperJsonView.tsx` (22 lines) wraps `<ScrollArea h="calc(100vh - 250px)"><JsonTreeView data={resource} /></ScrollArea>`.
- `JsonTreeView.tsx` (135 lines) is the actual recursive renderer — collapsible nodes, color-coded leaves.
- `PatientHeaderCard.tsx`'s "Raw JSON" Modal uses a plain `<Code block fz="xs">{JSON.stringify(patient, null, 2)}</Code>` — *different* renderer (no collapse, no syntax highlight).
- `PatientListPage.tsx` `RawPatientButton` does the same `<Code block>` pattern.
- `HumanReadableView.tsx`'s `ExtensionsSection` Modal also uses `<Code block fz="xs">{JSON.stringify(opened, null, 2)}</Code>`.

**Path forward:**
1. Move `JsonTreeView.tsx` → `components/json/JsonViewer.tsx`. Add optional props: `showLineNumbers?: boolean`, `outlinePanel?: boolean`. The collapsible-tree behaviour stays; line numbers and outline are layered as additional render passes.
2. `DeveloperJsonView.tsx` becomes a 5-line wrapper: `<JsonViewer data={resource} showLineNumbers />` (or just inline at call sites and delete the file).
3. `JsonPeekDrawer.tsx` body uses `<JsonViewer data={resource} />` — same component.
4. The two `<Code block>` raw-JSON modals (`PatientHeaderCard.PatientHeaderActions` + `PatientListPage.RawPatientButton`) are *deleted* — peek/JSON-mode covers the use cases.
5. `HumanReadableView.tsx`'s `ExtensionsSection` Modal migrates to `<JsonViewer/>` for consistency.

**Acceptance criterion already specified in handoff (SC#4):** "grep proves zero duplicate syntax-highlighter implementations." The existing JsonTreeView is the one source; `<Code block>` callsites are not real syntax highlighters and just go away.

**Verification:** `grep -rn "JSON.stringify(.*null, 2)" src/components/` should drop from ~3 hits to 0 after the cleanup.

### IP-4 — Patients-as-lens routing

**The `/patients` URL prefix is preserved per handoff** (line 67: "keep the route `/patients` and the existing component, but render it through the Explorer chrome").

Three concrete changes, each minimal:

1. **Sidebar** (`Sidebar.tsx`): The `Patients` top-level entry moves *under* `Explorer > Lenses` as a sub-nav child. New nav structure:
   ```
   Browse
     Dashboard       → /
     Explorer        → /explorer
       Patients      → /patients  (rendered under Explorer's expanded children)
       Practitioners → /explorer/Practitioner
       MII modules   → /explorer/Patient (or a tag-only landing)
   Audit
     Quality         → /quality
       Overview      → /quality
       Cohorts       → /quality/cohorts
       Thresholds    → /quality/thresholds
       IPS Validator → /quality/ips
   ```
   The existing `useMatch` + suppress-parent logic in `SidebarRow`/`SidebarChildRow` already supports this — just register `Patients` as a child of `Explorer`'s `children` array, mirroring how Cohorts/Thresholds work under Quality today. Note: the current suppress logic (lines 153-160) is `Quality`-specific by hard-coded path; it must be generalised into a per-row data field instead of an in-function switch.

2. **Breadcrumbs** (`PatientListPage.tsx`, `PatientDetailPage.tsx`): The breadcrumbs currently read `Patients > {name}`. Update root anchor:
   ```tsx
   <Breadcrumbs>
     <Anchor onClick={() => navigate('/explorer')} size="sm">Explorer</Anchor>
     <Anchor onClick={() => navigate('/patients')} size="sm">Patients</Anchor>
     <Text size="sm" fw={600}>{displayName}</Text>
   </Breadcrumbs>
   ```

3. **Routing structure** (`App.tsx`): **No route changes required.** `/patients`, `/patients/:patientId`, `/patients/:patientId/:resourceType/:id`, `/patients/:patientId/:resourceType/:id/graph` all stay. The `<PatientsLayout>` outlet remains (it provides MedplumProvider). Optional follow-up: if `<ExplorerLayout>` and `<PatientsLayout>` end up identical except for the rail content, refactor both to share a single `<DataRouteLayout>` — but this is a SHELL-only cleanup, not required for v1.8 SCs.

**Sidebar highlight:** when on `/patients/*`, the active row should be the `Patients` child under `Explorer`, with the `Explorer` parent row dimmed (`suppressParent: true`) — same idiom as Cohorts under Quality today.

### IP-5 — Sidebar v2 + Expert toggle + ⌘K

Three sub-points:

**5a. Browse / Audit section labels** — small visual change. Wrap existing `NAV_ITEMS` in two arrays:
```ts
const BROWSE_ITEMS: NavItem[] = [Dashboard, Explorer (with Patients/Practitioners as children)];
const AUDIT_ITEMS:  NavItem[] = [Quality (with Overview/Cohorts/Thresholds/IPS as children)];
```
Render each section with a small `<Text c="dimmed" tt="uppercase" fz="xs">Browse</Text>` header above. The existing `SidebarRow` component is reused unchanged.

**5b. Expert toggle (footer Switch)** — a new `ExpertContext` provider in `AppLayout`:
- Persists to `localStorage['ui.expert.v1']` (matches existing `quality.thresholds.v1` naming pattern).
- When ON, **default mode for `<ResourceShell>` becomes `'json'`** (read in `ResourceShell.tsx`'s initial `useState`).
- Optional Phase 4 of v1.8: when ON, `<SearchFilterPanel>` exposes a "raw search params" textarea — already deferred per handoff line 87 ("Add (2) when expert audiences ship feedback").

**5c. ⌘K command palette via Mantine Spotlight** — Spotlight is **already a dep** (`package.json:26 — @mantine/spotlight: ^8.3.18`). Currently unused (grep returns no hits). Wiring:

```tsx
// src/components/command/CommandPalette.tsx
import { Spotlight } from '@mantine/spotlight';
import '@mantine/spotlight/styles.css';

export function CommandPalette() {
  const navigate = useNavigate();
  const actions: SpotlightActionData[] = [
    { id: 'patients', label: 'Patients', onClick: () => navigate('/patients') },
    { id: 'quality',  label: 'Quality',  onClick: () => navigate('/quality') },
    // resource-type quick-jumps from CapabilityStatement
    ...resourceTypes.map(t => ({ id: `type-${t}`, label: `Browse ${t}`, onClick: () => navigate(`/explorer/${t}`) })),
  ];
  return <Spotlight actions={actions} shortcut={['mod+K', 'mod+P']} />;
}
```
Mount once in `AppLayout` (see IP-1 snippet). The `mod+K` shortcut is intercepted globally; no extra hotkey wiring needed.

## Data Flow

### Peek flow (cache-hit case — most common)

```
User on /explorer/Observation  (SearchResultsPage already fetched 20 resources)
  │
  └─ press J on focused row #5
       │
       └─ usePeekTarget().open({ type: 'Observation', id: 'obs-abc' })
            │
            └─ PeekProvider state: { peekTarget: { type, id } }
                 │
                 └─ JsonPeekDrawer renders Drawer position="right" size={420}
                      │
                      ├─ Header: summarizeResource(resource).primary  ← from resource (cache hit)
                      ├─ Body:   <JsonViewer data={resource} />
                      └─ Footer: [Copy] [Download] [Open Human] [Open Graph] [Open full →]
```

### Peek flow (cache-miss — Cmd+click on reference chip)

```
User Cmd+clicks "Observation/lab-42" chip in HumanReadableView
  │
  └─ ReferenceLink intercepts: usePeekTarget().open({ type: 'Observation', id: 'lab-42' })
       │
       └─ JsonPeekDrawer mounts; resource lookup via useReferenceResolver('Observation/lab-42')
            │
            ├─ referenceCache.has('Observation/lab-42')?
            │    │
            │    ├─ YES (Phase 47 already resolved it): instant render
            │    │
            │    └─ NO: drawer shows Skeleton + "Resolving…"
            │            │
            │            └─ fetchReference() fires; on resolve → forceUpdate → drawer body populates
            │                  │
            │                  └─ on 404/error → drawer shows "Reference unresolvable" inline state (NO toast — D-02)
```

The Phase 47 negative cache (failed lookups stored as `null`) means a second Cmd+click on the same broken reference returns the unresolvable state instantly — no retry, no spinner.

### 4-mode shell flow

```
User navigates /explorer/Patient/abc-123
  │
  └─ ResourceDetailPage useEffect: client.readResource('Patient', 'abc-123')
       │
       └─ <ResourceShell resource={patient}>
            │
            ├─ SegmentedControl: [Summary | Human | Graph | JSON]
            │     activeMode = 'summary' (default)  OR 'json' if Expert mode is ON
            │     │
            │     └─ Keyboard 1/2/3/4 swap activeMode (existing handler)
            │
            ├─ activeMode === 'summary' → SummaryMode
            │     │
            │     └─ keyFieldsRegistry['Patient'](patient) → React node
            │           │
            │           └─ Returns: <PatientHeaderCard/> + <PatientTimeline/> + <ViewToggle/> + (MII|FHIR)
            │                       (the existing PatientDetailPage body, refactored into a registry entry)
            │
            ├─ activeMode === 'human'  → HumanMode → <HumanReadableView resource={patient}/>
            ├─ activeMode === 'graph'  → GraphMode → <Suspense><ResourceGraphView/></Suspense>
            └─ activeMode === 'json'   → JsonMode  → <JsonViewer data={patient} showLineNumbers showOutline/>
                                                     <JsonViewerActions resource={patient}/>

       └─ Below all modes (except 'graph'):
            │
            ├─ if Patient → <PatientRelatedResources patientId={patient.id}/>   (existing)
            └─ else      → <IncomingReferencesPanel resource={resource}/>        (existing)
```

### Sidebar v2 IA flow

```
NAV_ITEMS reorganised:
  Browse
    Dashboard         (exact match /)
    Explorer          (matches /explorer*)
      Patients        (matches /patients*)            ← NEW location (was top-level)
      Practitioners   (matches /explorer/Practitioner)
  Audit
    Quality           (matches /quality*)
      Overview        (exact /quality)
      Cohorts         (matches /quality/cohorts)
      Thresholds      (matches /quality/thresholds)
      IPS Validator   (matches /quality/ips)

Footer
  [Switch] Expert view   ← reads/writes ExpertContext
  Settings              (existing)
```

## New Components

| File | Purpose | Reuses | LOC est. |
|------|---------|--------|---------:|
| `components/peek/JsonPeekDrawer.tsx` | Mantine Drawer host; header strip; footer actions; key handlers | `JsonViewer`, `summarizeResource`, `useReferenceResolver` | 120 |
| `components/peek/PeekProvider.tsx` | React context + reducer for `peekTarget` | — | 40 |
| `components/peek/usePeekTarget.ts` | Hook wrapping context | — | 10 |
| `components/peek/registerGlobalHotkeys.tsx` | `J`/`Esc` document listeners with input-focus guard | (mirrors `ResourceDetailPage:77-94`) | 30 |
| `components/json/JsonViewer.tsx` | Single source for FHIR JSON rendering (extracted from `JsonTreeView`) | (move + extend) | 180 |
| `components/json/JsonViewerActions.tsx` | Copy / Download / Validator-link toolbar | — | 50 |
| `components/shell/ResourceShell.tsx` | 4-mode SegmentedControl + key-listener; mounts active mode | `keyFieldsRegistry`, `summarizeResource` | 100 |
| `components/shell/SummaryMode.tsx` | Renders registry entry for resource type | `keyFieldsRegistry` | 30 |
| `components/shell/HumanMode.tsx` | Thin wrapper; click-interceptor preserved | `HumanReadableView` | 30 |
| `components/shell/GraphMode.tsx` | Suspense + lazy `ResourceGraphView` | (existing lazy ref) | 20 |
| `components/shell/JsonMode.tsx` | `JsonViewer` + outline + actions | `JsonViewer`, `JsonViewerActions` | 60 |
| `components/shell/keyFieldsRegistry.ts` | Type-keyed map: `(resource) => ReactNode` for 8 known types + generic | `summarizeResource` | 200 |
| `components/shell/ValidationChip.tsx` | Status pill (valid / warnings / errors / unknown); reads cached validation state if present | `useConformanceRun` (read-only) | 40 |
| `components/command/CommandPalette.tsx` | Mantine Spotlight wrapper; resource-type + section actions | (capability statement) | 60 |
| `contexts/ExpertContext.tsx` | Boolean + setter; `localStorage['ui.expert.v1']` | (mirrors `useThresholds` persistence) | 50 |

Total new code: ~1000 LOC (estimate). New `node_modules` deps: **none** — Spotlight is already installed.

## Modified Components

| File | Change | Risk |
|------|--------|------|
| `App.tsx` | None to routes. Optional: lift `<MedplumProvider>` if peek drawer needs client at root (rejected: provider stays per-section). | LOW |
| `components/layout/AppLayout.tsx` | Wrap with `<PeekProvider>` + `<ExpertProvider>`; mount `<JsonPeekDrawer/>` + `<CommandPalette/>` siblings to `<AppShell.Main>` | LOW — additive, no existing render path changed |
| `components/layout/Sidebar.tsx` | Reorganise `NAV_ITEMS` into Browse/Audit groups; add Expert Switch in footer; Patients moves under Explorer.children; generalise `suppressParent` so it stops being Quality-specific | MEDIUM — existing `Sidebar.test.tsx` asserts `data-active="true"` contract on parent rows; suppression logic generalisation must hold for the new Patients-under-Explorer case |
| `components/explorer/ResourceDetailPage.tsx` | Reduce to fetch + `<ResourceShell/>`. Keyboard handler extends to `1`/`2`/`3`/`4`. `handleReferenceClick` migrates into `HumanMode` wrapper | MEDIUM — existing tests reference Tabs by `value="human-readable"`/`value="developer"`; need rewrite for SegmentedControl |
| `components/explorer/SearchResultsPage.tsx` | Add row-focus state (track focused row index for `J` binding); add density `<SegmentedControl Cards/Table/Compact>`; add row overflow menu with "Peek JSON" action | MEDIUM — Summary column already wired (line 446); density modes are new |
| `components/explorer/ReferenceLink.tsx` | Add `e.metaKey || e.ctrlKey` branch → `usePeekTarget().open(target)` instead of navigate | LOW — additive |
| `components/explorer/JsonTreeView.tsx` | MOVE to `components/json/JsonViewer.tsx`; add optional `showLineNumbers`, `outlinePanel` props | LOW — internal moves; all callers updated in same PR |
| `components/explorer/DeveloperJsonView.tsx` | DELETE or reduce to one-line wrapper `<JsonViewer data={resource} showLineNumbers/>` | LOW |
| `components/patients/PatientDetailPage.tsx` | Body becomes `<ResourceShell resource={patient}/>`; existing 60-line conditional collapses to ~20 LOC | MEDIUM — patient-detail tests must update SegmentedControl assertions |
| `components/patients/PatientListPage.tsx` | Add Summary column matching SearchResultsPage; add density toggle; add `J`-focus binding; **delete `RawPatientButton` Modal** (peek replaces it) | LOW |
| `components/patients/PatientHeaderCard.tsx` | Drop `PatientHeaderActions` (Raw JSON button) — drawer/JSON mode covers it. Card layout becomes the Patient `keyFieldsRegistry` render output. | LOW |
| `components/patients/PatientsLayout.tsx` | Unchanged structurally. Future: deduplicate with ExplorerLayout if desired | LOW |
| `components/quality/ResourceIssueTable.tsx` | Add overflow-menu "Peek JSON" item per row (rows already carry resource type+id) | LOW |
| `components/explorer/HumanReadableView.tsx` | `ExtensionsSection` Modal migrates from `<Code block>` to `<JsonViewer/>` for visual consistency | LOW |

## Build Order

The handoff itself proposes an order (lines 192-199). Below is the **codebase-grounded refinement** — same intent, with v1.7 already shipped (so handoff Phases 46/47/48/49 are already done in the repo).

**Each phase below is one milestone-internal phase, not a milestone.** Sequential.

### Phase A — Foundation: shared JsonViewer + PeekProvider (smallest, unblocks everything)
- Move `JsonTreeView.tsx` → `components/json/JsonViewer.tsx` with optional props.
- Convert `DeveloperJsonView.tsx` into a 5-line wrapper or delete it.
- Add `components/peek/PeekProvider.tsx` + `usePeekTarget.ts` + `JsonPeekDrawer.tsx` (basic — header, body, close).
- Mount provider + drawer in `AppLayout.tsx`.
- Wire `J` hotkey on `SearchResultsPage` rows. Esc closes.
- Tests: peek-open, peek-close, drawer-swap (J on different row), focus-return on close.
- **Ship value:** users get a JSON peek on Explorer rows. Standalone PR.
- **No risk to existing flows.** Drawer is additive. Existing routes unchanged.

### Phase B — JSON peek expansion (call-site coverage)
- Wire `J` on `PatientListPage` rows.
- Wire Cmd/Ctrl+click on `ReferenceLink.tsx` → opens drawer using `useReferenceResolver` cache.
- Wire "Peek JSON" overflow item in `ResourceIssueTable.tsx`.
- Wire `J` on Graph nodes (`ResourceGraphNode.tsx` — onKeyDown when focused).
- Tests: each call site triggers drawer; Cmd+click cache-hit vs miss path; broken-ref state.
- **Ships:** drawer reaches all 5 call sites mandated by handoff SC#5.

### Phase C — 4-mode resource shell
- Create `components/shell/ResourceShell.tsx` + `SummaryMode/HumanMode/GraphMode/JsonMode` panels.
- Build `keyFieldsRegistry.ts` for 8 known types + generic walker (parallel to `summarizeResource` 8 entries — reuse field-extraction helpers from `SearchResultsPage:65-82`).
- Rewrite `ResourceDetailPage.tsx` → fetch + `<ResourceShell/>`.
- Extend keyboard handler to `1`/`2`/`3`/`4`.
- Drawer footer "Open full →" → `navigate(/explorer/${type}/${id})` lands on Mode 4 (JSON) when Expert is ON, else Mode 1 (Summary).
- Tests: 4-mode switch via segmented control AND keyboard; PatientHeaderCard absorbed into Patient registry; existing `IncomingReferencesPanel`/`PatientRelatedResources` mount logic preserved.
- **Ships:** unified detail experience for all non-Patient resource types.

### Phase D — Patient detail integration into shell
- Move `PatientDetailPage.tsx`'s `<PatientHeaderCard/>` + `<PatientTimeline/>` + `<SegmentedControl(MII|FHIR)>` + `(MiiModuleTabs|FhirResourcesView)` into the Patient `keyFieldsRegistry` entry as Summary mode content.
- `PatientDetailPage.tsx` collapses to: fetch + `<ResourceShell resource={patient}/>`.
- Drop `PatientHeaderCard.PatientHeaderActions` (Raw JSON button + $everything ActionIcon migrate to `JsonViewerActions`).
- Drop `PatientListPage.tsx`'s `RawPatientButton` Modal (peek replaces).
- Tests: patient detail still renders MII tabs by default; SegmentedControl(MII|FHIR) still works inside SummaryMode.
- **Ships:** Patient is no longer special-cased. Same shell everywhere.

### Phase E — Explorer list improvements (EXPL-01..03)
- Density modes (`Cards | Table | Compact`) via `<SegmentedControl>` in `SearchResultsPage` + `PatientListPage`. Persist selection to localStorage.
- Summary column already exists in `SearchResultsPage` (verified line 446); add to `PatientListPage`.
- Tests: density selection persists; Summary column shows `summarizeResource(r).primary` and `.secondary`.

### Phase F — Sidebar v2 + ⌘K + Expert toggle (SIDE-01..04 + LENS-01..02)
- Reorganise `NAV_ITEMS` into Browse/Audit. Patients moves under Explorer (Lenses).
- Generalise `suppressParent` logic in `Sidebar.tsx` (currently Quality-specific) to a per-row data field.
- Add `ExpertContext` provider; mount in `AppLayout`. Footer Switch in `Sidebar`.
- Wire `<CommandPalette/>` (Spotlight, already a dep).
- Update `PatientListPage`/`PatientDetailPage` breadcrumbs to start from `Explorer › Patients`.
- Tests: command palette opens on `mod+K`; Expert toggle persists; sidebar most-specific-wins on `/patients/*`.
- **Ships:** LENS-01..02 + SIDE-01..04 in one phase (cohesive IA change).

### Phase G — UAT closure (UAT-01)
- Walk the deferred items from v1.6 + v1.7 phase HUMAN-UAT.md files.
- Stand-alone phase per existing project pattern.

---

### Build-order rationale

| # | Why this position |
|---|---|
| A | Smallest scope; pure refactor + additive drawer; no other phase blocks on this not landing |
| B | All peek call-sites wired before shell lands so testing surface is broad |
| C | Shell is high-blast-radius; ship after drawer (so Mode 4's "Open full" works) |
| D | Patient is most-special; isolate its migration from Phase C's shell-skeleton work |
| E | EXPL pieces are nearly orthogonal; deferred so Phase A-D test churn settles |
| F | IA changes touch routing/breadcrumbs; ship last among the structural work |
| G | UAT closure is always a phase of its own per repo convention |

**Dependencies enforce A → B/C in parallel-impossible: no.** Phase B can technically run in parallel with C since their files barely overlap (`ReferenceLink.tsx` is the only shared touch). But a single-track sequence keeps test-baseline drift manageable for a small team.

### Breaking-change risks (flagged for roadmap)

- **R1 (Phase C)**: `ResourceDetailPage.test.tsx` and any test that asserts `Tabs.Tab[value="human-readable"]` will break. Mitigation: rewrite assertions in same PR.
- **R2 (Phase D)**: `PatientHeaderCard.test.tsx` mocks ID/age/gender rendering. The component survives but its actions go away — update test.
- **R3 (Phase F)**: `Sidebar.test.tsx` asserts `data-active="true"` on `Patients` row when on `/patients/*`. New: that row is now an `Explorer` child. The contract still holds for the *child* row; the parent `Explorer` row should be dimmed. Mitigation: extend the existing `suppressParent` test to cover Patients-under-Explorer.
- **R4 (Phase A)**: deleting `DeveloperJsonView.tsx` would break any external referrer. Grep `DeveloperJsonView` → only `ResourceDetailPage.tsx` imports it. Safe to delete in same PR.
- **R5 (Phase B)**: `ReferenceLink.tsx` Cmd+click handler must not break the existing `handleReferenceClick` interception in `ResourceDetailPage.tsx:105-124`. The two run on different events (Cmd+click vs plain click). Mitigation: explicit `if (e.metaKey || e.ctrlKey)` branch in ReferenceLink; ResourceDetailPage's handler remains for plain clicks.
- **R6 (cross-cut)**: `JsonViewer` move requires updating all imports. `git grep -l "from .*JsonTreeView\|DeveloperJsonView"` returns ~3 files — small blast radius.
- **R7 (Phase A)**: `Sidebar.test.tsx`'s suppression generalisation test must be added at Phase F time, not Phase A — keep them separate to avoid cross-phase test churn.

## Sources

- `.planning/PROJECT.md` — v1.8 active requirements (PEEK/SHELL/EXPL/SIDE/LENS/UAT)
- `design_handoff_v1.7_navigation/README.md` — design intent, mount/state directives, suggested order
- `src/App.tsx` — current routing tree, lazy-route wiring (verified)
- `src/components/layout/AppLayout.tsx` — current shell structure (verified)
- `src/components/layout/Sidebar.tsx` — current NAV_ITEMS shape, suppress-parent logic (verified lines 153-160)
- `src/components/explorer/ResourceDetailPage.tsx` — current Tabs structure, key handlers, click interception (verified lines 77-94, 105-124)
- `src/components/explorer/SearchResultsPage.tsx` — confirmed Summary column already wired via `summarizeResource` (line 446)
- `src/components/explorer/JsonTreeView.tsx` + `DeveloperJsonView.tsx` — extraction-target shape (verified)
- `src/components/explorer/IncomingReferencesPanel.tsx` + `PatientRelatedResources.tsx` — mount-below-modes preservation
- `src/components/patients/{PatientsLayout,PatientDetailPage,PatientListPage,PatientHeaderCard}.tsx` — Patients-as-lens migration footprint (verified)
- `src/hooks/useReferenceResolver.ts` — drawer Cmd+click cache pathway (verified — `referenceCache` Map exists)
- `src/utils/summarizeResource.ts` — registry parity for `keyFieldsRegistry` (8 typed entries verified)
- `package.json` — confirmed `@mantine/spotlight: ^8.3.18` already installed; no zustand
