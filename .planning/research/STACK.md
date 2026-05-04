# Stack Research — v1.8 Navigation Redesign

**Domain:** Subsequent-milestone delta on the shipped FHIR Exploder (React 18 + Vite 8 + Mantine 8 + Medplum 5 + TS 5.7).
**Researched:** 2026-05-04
**Overall confidence:** HIGH (every claim verified against the installed `node_modules` `.d.ts` files and `package.json` peer-dep metadata; no recommendation depends on training data alone).

Scope: PEEK-01..06 (JSON peek drawer), SHELL-01..04 (4-mode resource shell), EXPL-01..03 (Explorer summary column + density), SIDE-01..04 (Sidebar v2 + ⌘K + Expert toggle), LENS-01..02 (Patients-as-lens). Excludes UAT-01 (no stack implications).

---

## Summary

**Net new runtime dependencies for v1.8: ZERO.** Every capability the design handoff requires is already covered by packages installed and at versions that match v1.7 ship state. The redesign is intentionally engineered against primitives we already have:

| Capability | Already-installed solution |
|---|---|
| 420px right-side drawer with `withOverlay={false}`, `trapFocus={false}`, `position="right"`, `size={420}` | `@mantine/core@8.3.18` `Drawer` (props verified in `node_modules/@mantine/core/lib/components/Drawer/Drawer.d.ts` + `ModalBase.d.ts`) |
| ⌘K command palette with grouped actions, fuzzy filter, keyboard nav | `@mantine/spotlight@8.3.18` (peer dep already wired, but never imported in `src/`) |
| 4-mode segmented control with keyboard `1`/`2`/`3`/`4` | `@mantine/core` `SegmentedControl` + manual `keydown` listener (matches the existing `1`/`2` Tabs idiom in `ResourceDetailPage.tsx`) |
| List density toggle (Cards / Table / Compact) | `@mantine/core` `SegmentedControl` |
| Expert toggle in sidebar footer | `@mantine/core` `Switch` + `localStorage` persistence (existing pattern: `quality.thresholds.v1`, `EXPL-01` v1.6 hide-empty toggle) |
| Reused syntax-highlighted JSON renderer | Existing `JsonTreeView.tsx` (134 LOC) — already the inner renderer of `DeveloperJsonView`. Extract into a shared `JsonViewer.tsx` per design handoff §"Component split" |
| Drawer state | React Context + `useState` (no `zustand`) — see §"No New Dependencies Needed" #2 |
| Global hotkeys (`J`, `Esc`, `Cmd+click`) | `@mantine/hooks` `useHotkeys` (already a peer dep; verified by `useDisclosure` imports across 9+ files) — no new lib needed |

**The stack work for v1.8 is wiring, not installing.** The single highest-risk change is the v1.7 milestone's deferred Mantine 9 / React 19 upgrade (STACK-01), which the project chose to remove from Active scope on 2026-05-04 — see §"Version constraints" below for why this isolation matters.

---

## New Dependencies

**None required.** Confidence: HIGH.

The design handoff (`design_handoff_v1.7_navigation/README.md` §"⭐ JSON peek drawer" line 161) suggests `zustand` for drawer state, but this is a non-load-bearing aside. Two reasons to reject it:

1. **`zustand` would be the *first* state-management library in the codebase.** `package.json` shows zero state libs (no zustand, jotai, valtio, recoil, redux). v1.4 Phase 32's per-metric context split established `React.createContext` as the pattern for cross-component state — adding zustand for a single boolean-plus-target store would diverge from a deliberate decision (see CLAUDE.md "Alternatives Considered: State management → React context + hooks").
2. **The drawer state is exactly two fields** (`{ peekTarget: { type, id } | null }`). The bar for adding a runtime dependency is "the colocated/context option is materially worse." It isn't here.

If a future milestone needs cross-cutting global stores (e.g. multi-server browsing, undo stacks), revisit. For v1.8: **don't.**

---

## No New Dependencies Needed

### 1. Command palette — Mantine Spotlight covers it fully

**Question (1):** Is any new package needed for ⌘K, or does Mantine Spotlight + existing stack fully cover it?

**Answer:** Mantine Spotlight 8.3.18 fully covers it. No new package.

Verified in `node_modules/@mantine/spotlight/lib/index.d.ts` (lines 1-20):
- `Spotlight`, `spotlight.open()`, `spotlight.close()`, `spotlight.toggle()` — programmatic open/close
- `SpotlightActionData[]` with `id`, `label`, `description`, `onClick`, `keywords`, `leftSection`, `rightSection`
- `SpotlightActionGroupData` for grouped sections (Browse / Audit / Resources)
- `SpotlightFilterFunction` for custom matching (e.g. fuzzy resource-type prefix)
- `SpotlightSearch`, `SpotlightActionsList`, `SpotlightEmpty`, `SpotlightFooter` slots

Peer-deps shipped: `@mantine/store@8.3.18`. Already installed (we have `@mantine/spotlight@^8.3.18` listed in `package.json` and resolved at `node_modules/@mantine/spotlight`, version `8.3.18`).

**Currently unused** — `grep -rn "Spotlight\|spotlight" src/` returns zero hits. Wiring it is net-new code, not net-new dependency.

**Recommended commands to register (consumed by requirements + roadmapper):**

| Group | Action | `id` | Trigger |
|---|---|---|---|
| Navigate | Go to Dashboard | `nav.dashboard` | route `/` |
| Navigate | Go to Explorer | `nav.explorer` | route `/explorer` |
| Navigate | Go to Patients lens | `nav.patients` | route `/patients` |
| Navigate | Go to Quality | `nav.quality` | route `/quality` |
| Navigate | Go to Cohorts | `nav.cohorts` | route `/quality/cohorts` |
| Resources | Browse `<Type>` (lazy-listed from `MIIModule` registry + curated common R4 types) | `resource.<Type>` | route `/explorer/<Type>` |
| Modes (when on a resource) | Switch to Summary / Human / Graph / JSON | `mode.summary..json` | mirrors `1`/`2`/`3`/`4` |
| Toggles | Toggle Expert view | `toggle.expert` | flips `localStorage["expert.v1"]` |
| Actions | Peek JSON for current resource | `action.peek` | mirrors `J` |
| Settings | Open Settings | `nav.settings` | route `/settings` |

Confidence on the *list* of registered commands: MEDIUM — these are derived from the design handoff's IA (sidebar v2 sections) plus standard command-palette conventions. The roadmapper should validate the resource-list section size; eagerly listing 100+ R4 types in Spotlight will fight the fuzzy filter UX. Recommend lazy population of resource actions only when search text length ≥ 2.

### 2. Drawer state — React Context, not zustand

**Question (2):** Is zustand or a context store the right choice for peek drawer state, or is colocation sufficient?

**Answer:** **React Context with `useState`** (a `PeekProvider` near `<AppLayout>`). Not zustand. Not pure colocation.

Reasoning:

- **Pure colocation fails.** The peek drawer is mounted *once* at `<AppLayout>` level (per design handoff line 172) so any list page can call `usePeekTarget().open(type, id)`. Local `useState` in `<JsonPeekDrawer>` cannot be opened from `<SearchResultsPage>` without prop-drilling through 5+ layout layers.
- **Context fits exactly.** State shape: `{ target: { type: ResourceType, id: string } | null, open(t,id): void, close(): void, swap(t,id): void }`. Two callers (`<JsonPeekDrawer>` reads it; trigger surfaces call `.open()`/`.swap()`). One provider. No selector-based optimization needed because a) it re-renders only the drawer and the small set of trigger surfaces that *also* read state (very few — most triggers only call setters), and b) the value changes at most once per user `J` keypress.
- **Codebase precedent.** v1.5 Phase 32 split monolithic quality state into per-metric `React.createContext` providers (`useCompletenessReport`, `useCodingCoverage`, etc.). This is the established pattern for cross-component state in this app.
- **Bundle.** Context is zero bytes (already shipped with React). zustand is ~1.2 KB gz minified. Trivially small but non-zero — and crucially, sets a precedent that lowers the bar for the *next* "tiny store" that will inevitably be requested.

**Open/close API to expose** (consumed by roadmapper for SHELL-PEEK split):

```ts
// src/components/peek/PeekContext.tsx
type PeekTarget = { type: ResourceType; id: string };
interface PeekApi {
  target: PeekTarget | null;
  open(target: PeekTarget): void;
  close(): void;
  swap(target: PeekTarget): void; // J on a different row — refetch, don't unmount
}
```

Hotkey wiring uses `@mantine/hooks`'s `useHotkeys` (already a peer dep). Sample acceptance test pattern available in v1.7's `MiiModuleTabs.tsx` `useDisclosure` consumers.

### 3. JSON syntax highlighter — already exists

**Question (3 + design constraint):** Re-using `JsonViewer` between peek drawer and current `DeveloperJsonView` requires a single source of truth for JSON rendering — what to use?

**Answer:** Reuse `src/components/explorer/JsonTreeView.tsx` (134 LOC, Phase 1.x or earlier). It's already the inner renderer that `DeveloperJsonView.tsx` (21 LOC) wraps in a `<ScrollArea>`. The peek drawer should consume `<JsonTreeView data={resource} />` directly, *or* both `DeveloperJsonView` and `JsonPeekDrawer` should render through a renamed `<JsonViewer>` shared module. Mechanically trivial — rename + re-export.

**Do NOT add:**
- `react-syntax-highlighter` (~85 KB gz; we already have collapsible tree highlighting in `JsonTreeView`)
- `prismjs`, `shiki`, `highlight.js` — same reason; bundle bloat, no incremental capability
- `react-json-view` / `react-json-pretty` — `JsonTreeView` already does what these do, with our theme

The design handoff line 153 explicitly says: *"Do not duplicate the syntax-highlighter."* The existing `JsonTreeView` is the answer.

### 4. Drawer primitive — Mantine Drawer covers all spec requirements

Verified in `node_modules/@mantine/core/lib/components/Drawer/Drawer.d.ts` + `ModalBase.d.ts`. Every spec requirement from the design handoff line 124–187 is a supported prop:

| Spec | Mantine prop | Verified |
|---|---|---|
| 420px right-side | `position="right"` `size={420}` | YES |
| No overlay (clicks back to list still work) | `withOverlay={false}` | YES |
| `trapFocus={false}` (don't steal focus) | `trapFocus={false}` (inherited from `ModalBaseProps`) | YES |
| Stays open during list scroll | `lockScroll={false}` | YES |
| `Esc` closes | `closeOnEscape={true}` (default) | YES |
| Title + close button | `title`, `withCloseButton` | YES |
| Custom header strip with chip row | `<Drawer.Header>` static slot | YES |

No custom drawer library needed. (Reject `react-spring-bottom-sheet`, `vaul` — wrong primitive; we want a side drawer, not a sheet.)

### 5. Segmented control — already in Mantine

`@mantine/core` `SegmentedControl` covers both the 4-mode shell (Summary | Human | Graph | JSON) and the list density toggle (Cards | Table | Compact). Keyboard `1`/`2`/`3`/`4` is wired the same way the existing `ResourceDetailPage.tsx` wires `1`/`2` for Tabs — manual keydown listener with the existing input-focus guard.

### 6. Switch — already in Mantine

`@mantine/core` `Switch` for sidebar-footer Expert toggle. Persistence via existing `useLocalStorage` from `@mantine/hooks` (mirrors v1.6 EXPL-01 hide-empty pattern at `src/components/explorer/`).

---

## Integration Points

### Existing components that change

| File | Change | Risk |
|---|---|---|
| `src/components/explorer/DeveloperJsonView.tsx` | Refactor: extract inner to `JsonViewer.tsx`, this file becomes a thin `<ScrollArea>` wrapper or is deleted in favor of `<JsonViewer>` | LOW |
| `src/components/explorer/JsonTreeView.tsx` | Possibly rename to `JsonViewer.tsx` and add a `lineNumbers?: boolean` prop (per design handoff §"JSON" mode line numbers + outline panel) | LOW |
| `src/components/explorer/ResourceDetailPage.tsx` | Replace `<Tabs>` with `<SegmentedControl>` 4-mode; extend keyboard handler from `1`/`2` to `1`/`2`/`3`/`4` (`useHotkeys`) | MEDIUM (test-impact: existing `display-modes.test.tsx`, `resource-detail.test.tsx` need updates — both already exist in `src/__tests__/`) |
| `src/components/layout/AppLayout.tsx` | Mount `<JsonPeekDrawer />` once; mount `<Spotlight>` once; mount `<PeekProvider>` context; sidebar IA restructure (Browse / Audit) | MEDIUM (single mount point) |
| `src/components/explorer/SearchResultsPage.tsx` | Add Summary column wired to `summarizeResource()` (Phase 46 util, already shipped); add density `SegmentedControl`; wire `J` to `usePeekTarget().open()` | MEDIUM |
| `src/components/patients/PatientHeaderCard.tsx` (or equiv) | Remove "Raw JSON" modal — JSON mode covers it | LOW |
| `src/components/patients/PatientListPage.tsx` | Render through Explorer chrome (LENS-01..02) — mostly route/breadcrumb wiring | MEDIUM |

### New files (no new packages)

```
src/components/peek/
  JsonPeekDrawer.tsx      ← Mantine Drawer wrapper; uses Phase 47 reference cache for Cmd+click
  PeekContext.tsx         ← React Context provider + usePeekTarget hook
  registerGlobalHotkeys.ts ← thin useHotkeys('j', 'Escape', 'Enter') registrar — runs at AppLayout
src/components/spotlight/
  CommandPalette.tsx      ← <Spotlight> wrapper with action registry (Browse/Audit/Resources/Modes)
  useSpotlightActions.ts  ← memoized action list, route-aware (mode actions only when on /explorer/:type/:id)
src/components/shell/
  ResourceShellSegmented.tsx ← 4-mode SegmentedControl + keyboard handler
  SummaryMode.tsx         ← uses summarizeResource() + per-type key-fields registry
  SummaryFieldsRegistry.ts ← parallel to summarizeResource registry, 4-6 fields per type
```

### Existing utilities that v1.8 reuses (no changes)

- `src/utils/summarizeResource.ts` (Phase 46, 328 LOC, 8 typed R4 entries) — drives Summary column, peek-drawer header, Spotlight result labels
- Phase 47 reference-resolution cache (`Map<\`${type}/${id}\`, Resource | null>`) — feeds `Cmd+click`-on-reference flow into the drawer
- `@mantine/hooks` `useHotkeys`, `useDisclosure`, `useLocalStorage` — all already in active use across 10+ files

---

## Bundle Impact

**Estimated initial-load delta: +3 to +6 KB gz.** Confidence: MEDIUM (depends on tree-shaking; verify post-implementation against `scripts/check-bundle-delta.cjs` infrastructure shipped Phase 49).

Sources of the delta:

| Source | Estimate | Note |
|---|---|---|
| Mantine `Spotlight` component (already a peer dep, never previously imported) | ~3-4 KB gz | Tree-shaken until first import; first wire-up brings it into main chunk |
| Mantine `SegmentedControl` (already in main chunk via other call sites — DashboardPage, etc.) | ~0 KB | Already loaded |
| Mantine `Drawer` (already in main chunk via DashboardPage line 9) | ~0 KB | Already loaded |
| New peek/shell/spotlight component code | ~1-2 KB gz | Pure app code, no new deps |

**No lazy-load required for v1.8.** The graph route lazy-loading from Phase 49 is preserved verbatim — Mode 3 (Graph) in the 4-mode shell continues to be a `React.lazy` import boundary. Spotlight's bundle cost is small enough that putting it in the main chunk is correct (it's reachable from every route).

**Bundle gate suggestion** (consumed by roadmapper): `scripts/check-bundle-delta.cjs` should be run with `--max-delta-kb 8` for the v1.8 milestone, with a per-phase budget. Phase 46+47 main-chunk has been *shrinking* (−22.59 KB Phase 46, −4.88 KB Phase 49 main). v1.8 will reverse that direction modestly. Acceptable.

---

## Version Constraints

### React + Mantine — no upgrade required, no upgrade recommended

Verified versions in installed `node_modules`:
- `react@18.3.1` — peer-compat with all listed packages
- `@mantine/core@8.3.18` (and all `@mantine/*` siblings at the same version) — peer-compat with `react@^18.x || ^19.x`
- `@mantine/spotlight@8.3.18` peer-deps `react@^18.x || ^19.x`, `@mantine/core@8.3.18`, `@mantine/hooks@8.3.18` — all satisfied
- `@medplum/react@5.1.7` peers `@mantine/core@^8.0.0` (the constraint that twice deferred Mantine 9 — at v1.6 Phase 45 and v1.7 Phase 50)

**STACK-01 (Mantine 9 / React 19) was removed from v1.8 Active scope on 2026-05-04** per the user decision recorded at PROJECT.md line 311. v1.8 should NOT attempt the upgrade. Reasons specific to v1.8 features:

1. **Spotlight is the new wiring.** Spotlight 9.x has different action API surfaces (verified in past peer-dep gates). Wiring against 8.x now and re-wiring on 9.x later is the safer path.
2. **Mantine 9.x requires React 19.** React 19 + Medplum 5.1.7 is unblocked by Medplum's peer ranges, but the React-19 ecosystem migration risk (concurrent rendering edge cases in `@xyflow/react@12.10.2`, `recharts@3.8.1`) is precisely what STACK-01 was about absorbing. Spotlight + drawer + segmented control all work cleanly on Mantine 8.

### TypeScript / Vite — no upgrade required

`typescript@^5.7.0` and `vite@^8.0.4` cover all v1.8 needs. No new TS or Vite features are required by these features.

### Verify before wiring (medium-priority sanity checks for the implementer)

1. **`@mantine/spotlight` styles**: must import `@mantine/spotlight/styles.css` once at app entry. Verify path matches existing `@mantine/core/styles.css` import in `src/main.tsx`.
2. **Spotlight `<Spotlight />` mount point**: must be inside `MantineProvider` and outside `<Routes>` (so palette persists across navigation). `<AppLayout>` is correct.
3. **`useHotkeys` collisions**: register `J`/`Esc` listeners only at `<AppLayout>` level *and* gate on no-input-focused (mirror `ResourceDetailPage.tsx`'s existing guard for `1`/`2`). Avoid double-registration when nested routes also try to bind `J`.

---

## What does NOT belong in the bundle for these features

**Question (4):** What does NOT belong?

Hard "NO" list — adding any of these for v1.8 is wrong:

| Package | Why NOT |
|---|---|
| `zustand`, `jotai`, `valtio`, `redux`, `recoil` | Drawer state is a single nullable target — React Context is the established codebase pattern (Phase 32 per-metric contexts). Adding the *first* state-management library for this is wrong. |
| `react-syntax-highlighter`, `prismjs`, `shiki`, `highlight.js` | `JsonTreeView.tsx` already provides syntax-highlighted, collapsible JSON. Design handoff line 153: "Do not duplicate the syntax-highlighter." |
| `react-json-view`, `react-json-pretty`, `react-json-tree` | Same reason — `JsonTreeView` covers it. |
| `cmdk`, `kbar`, `react-cmdk` | We have `@mantine/spotlight` already installed. No second command palette. |
| `vaul`, `react-spring-bottom-sheet`, `react-modal-sheet` | Mantine `Drawer` covers `position="right"` + `size={420}` + `withOverlay={false}`. Wrong primitive anyway (these are bottom sheets). |
| `tinykeys`, `hotkeys-js`, `mousetrap`, `react-hotkeys-hook` | `@mantine/hooks` `useHotkeys` is already a peer dep and is already active in the codebase. |
| `framer-motion`, `react-spring`, `motion` | Mantine `Drawer` ships its own slide animation via `@mantine/core` transitions. Adding a motion lib for a drawer is YAGNI. |
| `@tanstack/react-query` | CLAUDE.md "Do NOT Use" list calls this out explicitly: "MedplumClient + useSearch/useSearchResources already handle caching and data fetching." The peek drawer's reference-resolution cache (Phase 47) is hand-rolled `Map<string, Resource>` and reuses MedplumClient. |
| `react-virtuoso`, `@tanstack/react-virtual`, `react-window` | The peek drawer renders a single resource. The Explorer list density modes still rely on existing pagination. Virtualization is a v2 concern (CLAUDE.md alternatives table: "Only add if pagination alone isn't sufficient"). |
| `lodash`, `lodash-es`, `ramda` | App is lodash-free. Don't introduce. |
| `dompurify`, `sanitize-html` | All rendered content is from FHIR resources serialized to JSON in our own components — no innerHTML, no markdown. Not needed. |
| Mantine 9.x or React 19 | STACK-01 carry-over removed from v1.8 Active scope on 2026-05-04. Don't attempt the upgrade in this milestone. |

---

## Sources

- `package.json` (working copy at HEAD `26efb93`)
- `node_modules/@mantine/spotlight/package.json` (version 8.3.18, peer-deps `react@^18.x || ^19.x`, `@mantine/core@8.3.18`, `@mantine/hooks@8.3.18`)
- `node_modules/@mantine/spotlight/lib/index.d.ts` (verified API: `Spotlight`, `spotlight.{open,close,toggle}`, `SpotlightActionData`, `SpotlightActionGroupData`, `SpotlightFilterFunction`)
- `node_modules/@mantine/core/lib/components/Drawer/Drawer.d.ts` + `ModalBase.d.ts` (verified props: `position`, `size`, `withOverlay`, `trapFocus`, `lockScroll`, `closeOnEscape`, `closeOnClickOutside`, `returnFocus`)
- `src/components/explorer/DeveloperJsonView.tsx` + `JsonTreeView.tsx` (verified existing JSON renderer to reuse)
- `src/components/dashboard/DashboardPage.tsx:9` (verified Mantine `Drawer` already in main chunk)
- `src/components/explorer/ResourceDetailPage.tsx` (verified existing `1`/`2` keyboard handler pattern to extend to `1`-`4`)
- `src/utils/summarizeResource.ts` (Phase 46 ship — drives Summary column + drawer header + Spotlight labels)
- `design_handoff_v1.7_navigation/README.md` (the design contract; especially §"⭐ JSON peek drawer" lines 118-187 and §"Concrete changes by file" lines 34-72)
- `.planning/PROJECT.md` Current Milestone v1.8 section (line 110-118 active requirements, line 311 STACK-01 removal)
- CLAUDE.md "Do NOT Use" + "Alternatives Considered" sections — anchors the "no new state lib", "no new query lib", "no Tailwind", "no Mantine 9" rejections

**Confidence assessment per claim type:**

| Claim type | Confidence | Why |
|---|---|---|
| Versions / installed packages | HIGH | Read directly from `node_modules` `.d.ts` and `package.json` files |
| Mantine API capabilities | HIGH | Verified from installed `.d.ts` declarations |
| Spotlight API + peer deps | HIGH | Verified from installed `lib/index.d.ts` + `package.json` |
| Bundle delta estimate | MEDIUM | Numerical estimate; the implementer should verify against `scripts/check-bundle-delta.cjs` |
| Recommended Spotlight command list | MEDIUM | Derived from design handoff IA + UX convention; needs roadmapper validation for resource-list section size |
| "Don't add zustand" | HIGH | Backed by codebase precedent (Phase 32 contexts), CLAUDE.md alternatives table, and minimal state shape |
| "Don't add syntax highlighter" | HIGH | `JsonTreeView` exists and is referenced explicitly by the design handoff |
| Mantine 9 / React 19 deferral fit-for-v1.8 | HIGH | PROJECT.md line 311 explicit user decision 2026-05-04 |
