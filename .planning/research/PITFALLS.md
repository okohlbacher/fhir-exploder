# Pitfalls Research — v1.8 Navigation Redesign

**Domain:** Additive navigation rework on existing FHIR Exploder (React 18 + Mantine 8 + Medplum 5 + react-router-dom v7 + @medplum/react). Baseline: 1412 passing tests, `npm run build` clean. Existing patterns: input-focus-guarded keyboard shortcuts in `ResourceDetailPage` (1/2 tab switch), Mantine Drawer for MII module tile drawer (Dashboard), React.lazy with chunk-load retry (Phase 27), useMatch-based per-row exact flag for sidebar active state (Phase 26 SHELL-01..05).

**Researched:** 2026-05-04
**Confidence:** HIGH on items grounded in inspected code (`ResourceDetailPage.tsx:36-217`, design handoff README §JSON peek drawer, Mantine 8 Drawer/Spotlight docs); MEDIUM on integration interactions where v1.8 components don't yet exist (drawer global state singleton, Spotlight ⌘K vs existing 1/2/3/4).

**Scope note:** This file is laser-focused on what *goes wrong when adding v1.8 features to this app*. KNOWN constraints not re-researched: Mantine 8 Tabs `keepMounted` semantics, react-router v7 `useMatches`/`useMatch` API, `client.readResource(type, id)` Medplum cache behavior, Phase 27 `lazyWithRetry` pattern, IBM Plex Mono token availability in theme.

**Cross-references:**
- Existing 1/2 keyboard handler with input-focus guard: `src/components/explorer/ResourceDetailPage.tsx:77-94`
- Existing Drawer use (no overlay, click-back-to-dismiss): MII tile drawer (Dashboard, Phase 30)
- Existing `useMatch` per-row exact flag: Phase 26 SHELL-01 (Sidebar nested-route activation)
- Existing reference-resolution `Map<type/id, Resource | null>`: Phase 47 `READ-01`
- Existing chunk-load retry: Phase 27 EFF-02 (drill-down lazy routes)
- Existing summarizeResource registry: Phase 46 NAV-01 (`src/utils/summarizeResource.ts`)

---

## Critical Pitfalls

### Pitfall 1: JSON peek drawer — `J` keyboard shortcut fires while user is typing in Explorer search input

**Risk:** **HIGH** — destroys the typing experience. The existing `ResourceDetailPage.tsx:79-80` guard is `tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT'`. That works on the detail page (no search box visible) but **breaks on Explorer list pages where SearchControl, the resource-type rail filter, and the cohort builder all expose live text inputs**. A user typing "Patient" → presses `j` to type the next letter → drawer flies in and steals focus → user is mid-word, focus goes to drawer content, next keystroke goes nowhere. Worse: the existing guard does NOT cover `[contenteditable="true"]` elements, which Mantine's combobox internal markup uses, and does not cover Monaco/CodeMirror-style editors if a future JSON-edit panel is added.

**Prevention:**
1. **Reuse Mantine's `useHotkeys` hook** (built into `@mantine/hooks`) instead of hand-rolling another `addEventListener('keydown', ...)` — it already ignores `INPUT`/`TEXTAREA`/`SELECT` by default, and accepts a custom ignore-tag list as the second argument. Add `BUTTON` for safety on row-action buttons that shouldn't fire `J` while clicked.
2. **Extend the guard to cover `contenteditable`:** check `(document.activeElement as HTMLElement)?.isContentEditable === true` and bail if true. Mantine combobox listboxes and any future rich-text fields will rely on this.
3. **Add a dedicated `data-no-shortcuts` opt-out attribute** that the JSON peek drawer body itself sets, so pressing `J` while the drawer's JSON body is focused (e.g. for "find next" in a future enhancement) doesn't reopen the drawer with the same content.
4. **Test:** unit test fires `KeyboardEvent('j')` while `<input>` is focused (assert no drawer open), while `<div contenteditable>` is focused (assert no drawer open), while `<button>` is focused (assert IS open — buttons should not block).

**Phase to address:** **PEEK phase (PEEK-01..06)** — Plan 1 of the peek drawer phase. Block all subsequent wiring until the guard is generalized; otherwise every list-page integration inherits the bug.

---

### Pitfall 2: Mantine Spotlight ⌘K hijacks browser "Find in page" / Mantine 8 spotlight overrides existing 1/2/3/4 when palette is OPEN

**Risk:** **HIGH** — two distinct sub-failures:

- **Sub-failure A — ⌘K already mapped:** Browsers and OS widgets bind `⌘K` to focus the address bar (Safari/Chrome on macOS), and the existing `/patients` filter card already shows a `⌘K` kbd hint (Phase 30 PatientsLayout). If Spotlight registers `⌘K` globally via `useHotkeys` and the patients page has a custom `⌘K` for "focus search," **two handlers compete** — depending on registration order, the search input may steal focus AND Spotlight opens behind it, or vice versa. The user gets a dropped keystroke and a half-open palette.
- **Sub-failure B — 1/2/3/4 fire while Spotlight is OPEN:** When Spotlight is open, the user types `1` to select the first command. The existing `ResourceDetailPage` listener at `:77-94` is `document.addEventListener('keydown', ...)` — it fires regardless of whether a modal/spotlight is open, because `document.activeElement` is the Spotlight input (which is `INPUT`, so the existing guard saves us — confirmed). **BUT**: if the SHELL-01 redesign moves the 1/2/3/4 handler to a `useEffect` inside `ResourceDetailPage` and Spotlight is mounted at `AppLayout` level, both listeners are on `document` and both fire. The `INPUT` guard saves us when the Spotlight search field is focused, but **fails the moment Spotlight users use arrow keys to highlight a result** — focus is then on a `<div role="option">` (NOT an input), and `1` hits the SegmentedControl handler instead of selecting the highlighted command.

**Prevention:**
1. **Make Spotlight the only source of truth for global shortcuts.** Use `useHotkeys` for ALL global shortcuts (1/2/3/4, J, /, ⌘K) registered in a single `<GlobalHotkeys />` component mounted at AppLayout level. Do NOT keep the in-page `useEffect` from `ResourceDetailPage:77-94` after SHELL-01 lands — migrate the 1/2/3/4 handler into a context-aware mode setter exposed via `useResourceShellMode()`.
2. **Detect Spotlight open state and short-circuit numeric shortcuts** when the Spotlight portal is in the DOM. Mantine 8 exposes `spotlight.opened` as a store atom — gate the 1/2/3/4 handler on `!spotlight.opened`. Tests: open Spotlight, press `1`, assert the active command becomes the first item AND the resource shell mode does not change.
3. **Reserve the `⌘K` binding for Spotlight only.** Drop the bespoke `⌘K` kbd hint on the Patients filter card (Phase 30 added it as a visual stub — there was no actual handler). The visual hint becomes truthful when Spotlight ships and registers ⌘K globally.
4. **Negative test for Sub-failure A:** mount AppLayout + a Patients page with the filter input rendered, press `⌘K`, assert (a) Spotlight opens, (b) the filter input does NOT receive focus, (c) `e.preventDefault` was called by Spotlight first.

**Phase to address:** **SIDE phase (SIDE-01..04)** — Spotlight integration plan. Coordinate with **SHELL phase** so that 1/2/3/4 migration to `useHotkeys` lands in the same milestone, not split across two phases.

---

### Pitfall 3: Drawer with `trapFocus={false}` + `withOverlay={false}` — screen reader users get stranded; keyboard users tab into background

**Risk:** **HIGH (a11y), MEDIUM (functional)** — The design handoff README explicitly specifies `trapFocus={false}` and `withOverlay={false}` for the JSON peek drawer (line 187: "drawer is dismissible by clicking back to the list (Mantine Drawer with `withOverlay={false}` + `trapFocus={false}`)"). This is fine for sighted mouse users — but breaks several flows:
- **Screen reader stranding:** With no overlay and no focus trap, NVDA/VoiceOver users tabbing through the drawer can land on a focusable element in the background list (e.g. the next row's link), and there's no audible cue that the drawer is "modal-ish." They lose context.
- **Keyboard wraparound:** Tab from the last footer button ("Open full →") lands on a list-row link in the background, NOT the drawer's close button. User can no longer close the drawer with `Esc` if the drawer itself has lost focus to the background.
- **Mantine `returnFocus` prop becomes useless** when `trapFocus={false}` because focus has already drifted into the background BEFORE close — Mantine returns focus to "the element focused before drawer opened" but that may have been a list row that was rerendered and unmounted (cache invalidation, paginated reload).

**Prevention:**
1. **Compromise approach: `trapFocus={true}` + `withOverlay={false}`.** The Mantine 8 Drawer supports this combo. Focus is trapped inside the drawer (a11y preserved), but the drawer is still dismissible by `Esc` and the background is still visible/scrollable. The "click backdrop to dismiss" UX is replaced with `Esc` + an explicit close button. **This is the recommended config** — the README's combination is over-aggressive.
2. **If `trapFocus={false}` is non-negotiable (user requirement):**
   - Add an `aria-modal="false"` + `role="complementary"` + `aria-label="JSON peek for {type}/{id}"` so screen readers announce the drawer as a sidebar, not a dialog.
   - Manage focus return manually via `useFocusReturn` from `@mantine/hooks` — pass `shouldReturnFocus` keyed on a stable target ref captured at drawer open (not the row that opened it, since the row may unmount).
   - Add a global Tab interceptor: when drawer is open, Tab from the last drawer focusable wraps to the first; Shift+Tab from the first wraps to the last. This is what `trapFocus={true}` does for free — replicating it manually is error-prone.
3. **Test with axe-core:** add a vitest + jest-axe test that opens the drawer and asserts zero a11y violations.
4. **Test focus return:** open drawer, close drawer, assert `document.activeElement` is the row that triggered open (or its replacement via a stable `data-row-id={resource.id}` selector if the row was re-rendered).

**Phase to address:** **PEEK phase** — Plan 2 (Drawer shell). Resolve `trapFocus` decision with user/UX before implementing; default to `trapFocus={true}` unless explicit pushback.

---

### Pitfall 4: SegmentedControl swap of Tabs loses tab keyboard semantics + `keepMounted` is no longer free

**Risk:** **HIGH** — Mantine `Tabs` provides arrow-key navigation between tabs (Left/Right/Home/End) for free, and `Tabs.Panel` keeps each panel mounted by default (so JSON view's scroll position survives a switch to Human and back). **Mantine `SegmentedControl` is a radio group, not a tablist** — its keyboard model is different (arrows still work, but the rendering model is "one panel visible, the rest are not in the DOM"). Concrete failures when migrating `ResourceDetailPage.tsx:191-207`:
- The current code renders `<Tabs.Panel>` with all panels in the DOM (`keepMounted` defaults true, only Coverage/Completeness drilldowns drop it per Phase 25 QDDEP-04). Switching from Human → JSON → Human keeps JSON scroll position. **After SegmentedControl migration**, if the rewrite uses a single `{mode === 'json' && <DeveloperJsonView />}` ternary, JSON unmounts on every switch → scroll position resets, expand/collapse state of objects in the JSON tree resets, the validation chip recomputes.
- The existing `<div onClick={handleReferenceClick}>` wrapper (`:198`) uses event delegation across all panel content. After SegmentedControl, only one panel's content is in the DOM at a time — the click handler still works for the visible panel, but **if the user is in JSON mode and the inline reference-chip Cmd+click is supposed to open peek**, a different listener path applies and may double-fire.
- `Tabs` has built-in ARIA `role="tablist"` / `role="tab"` / `role="tabpanel"` / `aria-selected`. SegmentedControl uses `role="radiogroup"` / `role="radio"`. **Screen readers will announce "radio button" instead of "tab"** — semantically wrong for a content-mode switcher. The handoff visually wants SegmentedControl, but the semantics want Tabs.

**Prevention:**
1. **Preserve mount semantics manually.** Keep all four mode bodies mounted in the DOM, hidden with CSS `display: none` (NOT conditional render). This keeps Human and JSON scroll positions, validation chip state, and Phase 47 reference-cache hits across switches. The Graph mode is the exception — it must stay lazy-imported (Phase 49 SC) and only mount on first switch to mode 3.
2. **Use Mantine `Tabs` with `variant="pills"` styled to LOOK like SegmentedControl** instead of a true SegmentedControl. This is what Phase 30 already did for the Quality tabs (verified in PROJECT.md L132: "Tabs use `variant=\"pills\"`"). Reuse the pattern: `<Tabs variant="pills" value={mode} onChange={setMode}>` with `<Tabs.List>` styled with the same indigo accent and warm-neutral background as SegmentedControl. Keep all the keyboard a11y and `Tabs.Panel keepMounted` behavior for free.
3. **If true SegmentedControl is required by design:**
   - Wrap each mode body in a stable container (`<div role="tabpanel" hidden={mode !== 'json'}>...</div>`) — `hidden` attribute removes it from the a11y tree but keeps it in the DOM. Use this instead of conditional render for Summary/Human/JSON; Graph remains ternary-mounted.
   - Add ARIA: SegmentedControl gets `aria-label="Resource view mode"`; the panels get `role="region"` + `aria-labelledby={modeButtonId}`.
4. **Snapshot test the DOM identity invariant:** render mode 2 (Human), grab a `data-testid="human-readable-root"` ref, switch to mode 4 (JSON), switch back to mode 2, grab the same ref — assert `refAfter === refBefore` (proven approach from Phase 49 GRPH-04 `expect(refAfter).toBe(refBefore)`).

**Phase to address:** **SHELL phase (SHELL-01..04)** — Plan 1 (Mode switcher). Decide Tabs-as-pills vs. SegmentedControl up front; the rest of the shell follows.

---

### Pitfall 5: Patients-as-lens — sidebar highlights "Patients" instead of "Explorer" because `useMatch('/patients/*')` wins over `useMatch('/explorer/*')`

**Risk:** **HIGH (visual correctness), LOW (functional)** — The Phase 26 SHELL-01 sidebar uses `useMatch` per-row with the "most-specific-wins" rule (PROJECT.md L129). After LENS-01, `/patients` is supposed to highlight "Explorer" (with sub-list "Lenses: Patients" expanded). Concrete failure modes:
- If the sidebar still has a top-level "Patients" entry (legacy from before the IA collapse), `useMatch('/patients/*')` matches AND `useMatch('/explorer/*')` does NOT match → "Patients" gets the indigo rail, "Explorer" stays dim. The user navigates to `/patients` and the sidebar tells them "you are in Patients" — but the design says "Explorer › Patients lens."
- Conversely, if "Patients" is removed from the sidebar but `/patients` route is preserved (LENS-01 explicit requirement), `useMatch` returns null for any sidebar row → no row gets highlighted at all. The user sees `/patients` content with NO sidebar indicator → looks like a bug ("which section am I in?").
- The breadcrumb generation reads from `useBreadcrumbTrail(basePath)` (`ResourceDetailPage.tsx:45`) — `basePath` is `/patients/{patientId}` for patient context, `/explorer` otherwise. After LENS-01, what is `basePath` for `/patients` (the LIST page, not a specific patient)? The current code only handles patient-detail context. If LENS-01 wires `/patients` through Explorer chrome but the breadcrumb hook isn't updated, breadcrumbs render `Explorer › Patients` from one component path and `Patients` from another — inconsistent.

**Prevention:**
1. **Add an explicit "lens mapping" alongside useMatch:** the sidebar Explorer row computes `isActive = useMatch('/explorer/*') || useMatch('/patients/*') || useMatch('/practitioners/*')` (ANY of the lens routes). Make this a typed `EXPLORER_LENS_ROUTES` constant so future lenses (Practitioners, MII modules) can be added centrally.
2. **Sub-list expansion logic:** when on `/patients`, the Explorer row is highlighted AND the "Patients" lens sub-row is highlighted (nested active state). Mirror Phase 26's quality sub-nav pattern (PROJECT.md L129: "Quality sub-nav renders as indented children (Overview / Cohorts / Thresholds) on /quality/*"). Reuse `<NestedNavGroup>` from that phase if it exists; otherwise generalize.
3. **Update `useBreadcrumbTrail`:** add a `lens` parameter that emits `Explorer › Patients` when `pathname.startsWith('/patients')`. Add a snapshot test for the breadcrumb at three URLs: `/explorer`, `/explorer/Patient`, `/patients`, `/patients/abc123`. Expected breadcrumb crumbs: `["Explorer"]`, `["Explorer", "Patient"]`, `["Explorer", "Patients"]`, `["Explorer", "Patients", "abc123"]`.
4. **Manual QA matrix:** table row per route × expected sidebar highlight × expected breadcrumb. Include `/quality/cohorts` (now under Audit), `/practitioners`, and the four MII module routes. UAT validates the matrix.

**Phase to address:** **LENS phase (LENS-01..02)** — Plan 1 (route-to-IA mapping). Hard prereq for the SIDE phase (sidebar v2): the IA mapping must be designed before the sidebar can render lens highlights.

---

### Pitfall 6: PatientHeaderCard "Raw JSON" modal removal cascades — bookmarks, e2e selectors, and patient-summary `$everything` action all reference it

**Risk:** **MEDIUM** — The handoff (line 68) says: "Remove the bespoke `PatientHeaderCard` 'Raw JSON' modal — JSON mode already covers it." Phase 30 UX-REDESIGN-06 added this modal as part of the "3-col `PatientHeaderCard`" (PROJECT.md L134). Removing a public-facing button has ripple effects:
- **Vitest tests** that select on `getByRole('button', { name: 'Raw JSON' })` or `data-testid="patient-raw-json-button"` will fail. Phase 48 has a byte-identical Patient snapshot guarantee (PROJECT.md "REVR-03 ... byte-identical Patient UAT snapshot") — removing the button **breaks the snapshot** and the snapshot will regenerate noisy diffs across the whole patient detail tree.
- The `$everything` icon button is rendered in the same `<Group>` as Raw JSON (L134: "Raw JSON button + $everything icon"). If both are removed in one phase, the click target `IconAffiliate` from `ResourceDetailPage:159` (the Graph button) may shift left in the toolbar and break visual regression snapshots.
- **User muscle memory:** users trained to click "Raw JSON" on a Patient detail page will look for it. Removing without a discoverable replacement (the new mode 4 / JSON button) creates a "where did it go?" UX hit. The mode 4 button is in a different location (mode switcher above the body, not in the header).

**Prevention:**
1. **Stage the removal in two parts:**
   - Stage 1 (early in shell phase): Add the new 4-mode shell to the patient detail page; mode 4 is reachable via shortcut `4` and via the mode pill. The old "Raw JSON" button stays AND links to mode 4 (so existing tests pass). Run the full test suite — baseline is green.
   - Stage 2 (later): Remove the "Raw JSON" button. Update the Patient snapshot (single audit-trailed diff), update tests that select on it. **Run `git grep -n "Raw JSON"` and triage every match before deleting.**
2. **Preserve `$everything`** — explicit non-removal. The `$everything` operation is a Patient-scoped FHIR feature that is NOT covered by JSON mode (JSON shows the single resource; `$everything` shows the bundle). Keep the icon button.
3. **Visual-regression test:** Phase 48 captured a 484-LOC Patient snapshot — re-baseline it once at Stage 2 with a code-review-trailed commit ("re-baseline patient header after Raw JSON button removal").
4. **Migration warning in console (dev-only):** if `searchParams` carries a legacy `?modal=raw-json` (in case any docs or bookmarks linked to it), redirect to `/explorer/Patient/{id}#mode=json` and log a one-time deprecation warning. Drop after one milestone.

**Phase to address:** **LENS phase** — Plan 2 (PatientHeaderCard refactor). Stage 2 must be the last patch before LENS phase ships.

---

## Moderate Pitfalls

### Pitfall 7: Shared `JsonViewer` extraction — `DeveloperJsonView` internal state (collapse/expand, scroll position) breaks on refactor

**Risk:** **MEDIUM** — The handoff (line 153, line 179) requires extracting `DeveloperJsonView`'s inner JSON renderer into `JsonViewer.tsx` and having both the existing detail page and the peek drawer consume it. `DeveloperJsonView` likely manages its own collapse/expand state (objects/arrays toggleable per the drawer anatomy diagram L143 "with line numbers + collapse triangles"). Extraction risks:
- If extracted naively, the new `JsonViewer` becomes a controlled component (state passed in via props) but the detail page wasn't passing state before — collapse state is lost on every detail page mount.
- If extracted with internal state preserved, opening the same resource in the drawer and then in mode 4 shows TWO independent collapse states (drawer expanded `Patient.name`, mode 4 still collapsed). User confusion.
- Refs are tricky: scroll position lives in a child `<pre>` element. Hoisting state up but keeping the scroll-position ref local means switching modes resets the scroll — same UX hit as Pitfall 4.

**Prevention:**
1. **Extract with collapse state in a per-(type, id) Map, scoped to the AppLayout-mounted shell.** Open `Patient/abc123` in the drawer → expand `name` → close drawer → open mode 4 detail → `name` is still expanded. Cache invalidates when the resource changes (etag/versionId).
2. **Scroll position is OK to be local per-instance** — don't share that. The drawer and mode 4 are different visual contexts; scrolling one shouldn't scroll the other.
3. **Preserve byte-identical render of `DeveloperJsonView`:** add a snapshot test BEFORE extraction. Extract. Run the snapshot. If diff is non-trivial, the extraction changed behavior; revert and try smaller.
4. **Watch out for `react-syntax-highlighter` initialization cost** — if both drawer and mode 4 import it, ensure tree-shaking dedupes; otherwise the bundle takes a hit. Verify with `rollup-plugin-visualizer` (already in repo per Phase 27 EFF-03).

**Phase to address:** **PEEK phase** — Plan 2 (JsonViewer extraction). Single largest "refactor risk" in v1.8.

---

### Pitfall 8: Drawer "second J swaps content" — content re-fetches but old content flashes; stale content lingers if fetch is slower than swap

**Risk:** **MEDIUM** — The README L135 explicitly says: "Pressing `J` again on a *different* row swaps the drawer contents (don't unmount — just refetch)." The intent: open drawer for `Patient/abc`, press `J` on next row `Patient/def` → drawer header updates instantly, body re-fetches `def`, drawer doesn't slide in/out. Failure modes:
- Naive impl: `setPeekTarget({type, id})` → drawer rerenders, calls `useResource(type, id)` → React-router/medplum fetch starts → meanwhile the OLD `abc` body is still in the DOM (last render's data). For a few hundred ms, the drawer header says `Patient/def` but the body shows `abc`'s JSON. Visual lie.
- If the user presses `J` rapidly across 5 rows, all 5 fetches race. Without a request-key cancellation pattern, the response order is non-deterministic — drawer ends up showing `Patient/c` even though the user landed on `Patient/e`. (The Medplum cache may save us if all 5 are cache hits; not guaranteed for cache misses.)
- Cache-hit case still has issues: `useResource` returns the cached resource synchronously, but if the row is from a paginated search where Medplum cached only the search bundle (not individual resources), `useResource(type, id)` will re-fetch — same race as above.

**Prevention:**
1. **Show a skeleton in the body on `peekTarget` change**, even if cache will return synchronously. This eliminates the "header says X, body shows Y" visual lie. Skeleton is replaced with body the same render the resource is available.
2. **Use an in-flight request-key cancellation pattern.** When `peekTarget` changes, capture the current target in a closure; when the promise resolves, check `if (currentTarget !== peekTarget) return;`. Same idiom as Phase 49 GRPH-02 BFS cancellation flag.
3. **Test rapid swap:** mock `client.readResource` to return promises with controlled resolution order. Press J on row 1 (resolution slow, 500ms), press J on row 2 immediately (resolution fast, 50ms), press J on row 3 (resolution medium, 200ms). Assert drawer shows row 3's content at the end, not row 1's stale data.
4. **The cache used by the drawer must be the same one used by `ResourceDetailPage`** (Phase 47 reference-resolution `Map<type/id, Resource | null>`). Don't introduce a parallel cache — opening the drawer should warm the cache for the eventual mode 4 navigation.

**Phase to address:** **PEEK phase** — Plan 3 (data flow). Test gate is the rapid-swap test.

---

### Pitfall 9: `useHotkeys` on document — drawer's keyboard contract collides with global shortcuts when drawer body is focused

**Risk:** **MEDIUM** — Specific failure: drawer is open, user presses `Tab` to land focus inside the JSON body (a `<pre>` element). User presses `4` to navigate to full detail (per README L136: "Pressing `Enter` while drawer is open promotes it to full detail"). With document-level `useHotkeys` for `4 → mode 4 navigate`, the global handler fires AND the drawer's local handler fires — depending on order, one wins arbitrarily. Or worse: the user is in the drawer's footer "Open full →" button, presses `Enter` → button click navigates → global `Enter` handler fires AFTER and tries to navigate again to the same route → React-router warns "navigated to current location" and the back-stack is corrupted.

**Prevention:**
1. **Drawer-local handlers stop propagation.** Inside the drawer body, register `Esc` and `Enter` via `getHotkeyHandler` (Mantine's exported helper for non-document-scope hotkeys) on the drawer root, with `e.stopPropagation()` after handling.
2. **Global handlers check drawer state.** The global `1/2/3/4` handler bails when `usePeekTarget().peekTarget !== null`. Similarly, the global `J` handler is a no-op when drawer is already open (use `Esc` to close, then `J` to reopen — explicit user intent).
3. **`Enter` is NOT a global shortcut.** Reserve it for in-drawer "promote to full detail" only. Using `Enter` globally would conflict with any list-row `Enter`-to-open behavior already shipped (verify with `git grep -n "key === 'Enter'" src/`).
4. **Test: keyboard contract matrix.** Open drawer. Press `Esc` → drawer closes, no global handler fired. Open drawer. Press `Enter` → navigates to mode 4, drawer closes, no double navigation. Open drawer. Press `1` → no mode change in background AND no drawer action. Open drawer + Spotlight → close drawer first (Esc), then close Spotlight (Esc). Two-keypress dismissal is acceptable; one-keypress would require global "close topmost surface" coordination that Mantine doesn't provide.

**Phase to address:** **PEEK phase** — Plan 4 (keyboard wiring). Test matrix is the SC.

---

### Pitfall 10: Lazy-loaded Graph mode — first switch to mode 3 stalls UI thread, then chunk-load failure leaves mode 3 broken until reload

**Risk:** **MEDIUM** — Phase 49 GRPH-01 already lazy-loads `/explorer/:type/:id/graph` route (lazy chunk 71.20 KB gz). After SHELL-01, mode 3 must lazy-load on demand within the same page (not via a route navigation). Issues:
- First switch to mode 3 fires `import(...)` for `ResourceGraphView.tsx` AND its peers (`useGraphBfs`, `applyDagreLayout`, `@xyflow/react@12.10.2`, `@dagrejs/dagre@3.0.0`). Network + parse cost ~200ms-2s on slow connections. If no Suspense fallback, the SegmentedControl appears to "lock up" on mode 3 click — user clicks again, twice, → multiple `import()` calls → React.lazy caches one, others reuse, but the user perceives a frozen UI.
- Phase 27 has `lazyWithRetry` — verify it's reused. If SHELL-01 plan opens a fresh `lazy(() => import('./ResourceGraphView'))` without retry wrapping, a flaky network drop on chunk-load fails the lazy import permanently (per the React.lazy pitfall L150 "no longer possible to retry loading"). Mode 3 stays broken until full page reload.
- The CSS variable bridge for React Flow (Phase 49 GRPH-04) is in `graph.module.css` — that CSS is bundled with the lazy chunk. **First mode 3 switch in dark mode:** during the load, the Graph component renders briefly with default React Flow styling (light-theme-leaning) before the CSS module attaches. Flash of unstyled content (FOUC).

**Prevention:**
1. **Reuse `lazyWithRetry`** from Phase 27 EFF-02. Grep `git grep -n "lazyWithRetry" src/` to confirm path. Wrap `ResourceGraphView` import with it.
2. **Suspense fallback inside the SegmentedControl panel:** wrap mode 3 body in `<Suspense fallback={<Skeleton height={400} />}>`. Mantine `<Skeleton>` is already used app-wide (Phase 47 used it for reference-skeletons).
3. **Preload on hover/focus of the Graph mode pill** (best-effort): `onMouseEnter` triggers `import('./ResourceGraphView')` early. Network has time to start before the user clicks. Standard React.lazy preload pattern.
4. **Theme bridge CSS in main bundle, component code lazy.** Move `graph.module.css` import out of `ResourceGraphView.tsx` and into a top-level `App.tsx` import (or a `theme.css`). Trade-off: ~2 KB of CSS in main chunk. Avoids FOUC.
5. **Test:** mock `import()` to reject once then resolve, assert mode 3 renders eventually (retry works). Mock `import()` to be slow (2s), assert Skeleton renders during load.

**Phase to address:** **SHELL phase** — Plan 3 (mode 3 wiring). Coordinate with Phase 49 ownership; this is a refactor of where the lazy boundary sits.

---

### Pitfall 11: Expert toggle persists in localStorage but doesn't propagate to already-open drawers / detail pages

**Risk:** **MEDIUM** — The Expert toggle (sidebar v2) flips `expertMode: boolean` globally. When ON, "JSON becomes default detail mode and raw search-param input appears on Explorer" (handoff L43-44). Failure modes:
- User has `/explorer/Patient/abc` open in mode 1 (Summary). User toggles Expert ON in the sidebar. Expectation: page reloads to mode 4 (JSON). Reality: the mode state is local to `ResourceDetailPage`, lives in `useState`, doesn't react to the toggle. Sidebar toggles, but the open detail page stays in Summary. User has to navigate away and back.
- If the toggle DOES rewire mode (e.g. via a `useExpertMode()` hook + effect that calls `setMode('json')`), the user's manual mode selection is overridden — annoying. ("I picked Summary on this page; why did Expert mode reset me?")
- localStorage write contention: rapid toggling could write more than once per render via `useLocalStorage` from `@mantine/hooks` (StrictMode double-fires effects). Phase 21 has a precedent: "Legacy localStorage key migration in parent useEffect before child reads" (PROJECT.md key decision). Same hazard applies — child reads of `expertMode` may race with the parent write.

**Prevention:**
1. **Expert mode affects DEFAULTS, not active state.** The toggle changes the initial mode for *newly-mounted* `ResourceDetailPage` instances and the default search-param visibility on Explorer. Already-open pages preserve their current mode (user won't be surprised by mode changes). Same pattern as the Phase 25 `keepMounted={false}` decision: scope changes affect new instances.
2. **Single source of truth via context.** `<ExpertModeProvider>` mounted in AppLayout reads `useLocalStorage('expert.mode.v1', false)` once. Children read via `useExpertMode()`. localStorage write happens only in the provider, not in children.
3. **Test the toggle:**
   - Mount Explorer with expertMode=false, navigate to a detail page, assert mode is 1 (Summary).
   - Toggle expertMode=true. Assert the open detail page mode is STILL 1 (no mid-session change).
   - Open a new detail page. Assert it defaults to mode 4 (JSON).
4. **Storage key naming:** follow the existing convention `quality.thresholds.v1` (PROJECT.md L139). Use `nav.expertMode.v1` to namespace from quality keys.

**Phase to address:** **SIDE phase** — Plan 2 (Expert toggle). Coordinate context boundary with SHELL phase (since Expert mode reads from same context as default mode).

---

## Minor Pitfalls

### Pitfall 12: ⌘+click on reference chips behaves differently across platforms (macOS Cmd vs Windows Ctrl), with Mantine's default `onClick` not capturing modifier state

**Risk:** **LOW** — README L131 says "any reference chip → Cmd/Ctrl+click → opens drawer." Mantine's `onClick` handler receives a React MouseEvent with `metaKey` (Cmd) and `ctrlKey` (Ctrl). Naive impl: `if (e.ctrlKey || e.metaKey) openDrawer(...)`. But:
- macOS Chrome: Cmd+click on a `<a href>` opens in a new tab BEFORE React handlers fire (browser default). Reference chips that are anchors lose the Cmd+click to native handling.
- Linux: Ctrl+click also opens in a new tab natively. Same problem.
- Mantine `Anchor component={Link}` renders as `<a>` — same trap.

**Prevention:**
1. Reference chips for the peek-drawer target are `<button>` or `<span role="button">`, NOT `<a>`. Anchors are reserved for "navigate to detail" semantics; the peek modifier-click is a separate UX. Native Cmd-click new-tab behavior on `<a>` is preserved.
2. If the chip needs to be both clickable (navigate) AND modifier-clickable (peek), call `e.preventDefault()` early in the onClick when `e.metaKey || e.ctrlKey` is true, then route to peek.
3. Test: jsdom doesn't fire the native open-new-tab handler, but the React handler test verifies our preventDefault path.

**Phase to address:** **PEEK phase** — Plan 5 (reference-chip integration).

---

### Pitfall 13: Sidebar v2 IA collapse — Cohorts moves from top-level to under Quality, but old localStorage `quality.activeCohortId.v1` keys + URL `/cohorts` remain reachable

**Risk:** **LOW** — IA reorg moves Cohorts under Quality (handoff L72). The route is already `/quality/cohorts` (Phase 21). But:
- Any user-saved bookmark/link to `/cohorts` (if such a route ever existed) will 404.
- Test selectors that hit "Cohorts" as a top-level sidebar item via `getByRole('link', { name: 'Cohorts' })` may match the new nested entry — same accessible name, different DOM path. Tests pass but actually tested the wrong row.

**Prevention:**
1. `git grep -n "/cohorts" src/` to enumerate all references. Confirm route is already `/quality/cohorts` only.
2. Sidebar v2 nests Cohorts under Quality — same `<NestedNavGroup>` pattern as Phase 26 Quality sub-nav.
3. localStorage keys are unchanged (PROJECT.md L139 confirms `quality.cohorts.v1` is stable). No migration needed.

**Phase to address:** **SIDE phase** — Plan 1 (IA restructure).

---

### Pitfall 14: UAT-01 backlog closure — discovering real bugs vs. confirming already-working behavior; ~20 items mixes "phase wrap-up" with "actual issues"

**Risk:** **LOW (project hygiene)** — The PROJECT.md mentions "~20 deferred browser-only items from v1.6 + v1.7" (L117). These are scaffolded UAT items in `.planning/phases/{phase}/HUMAN-UAT.md` files that were tagged `[deferred]` because the phase shipped before the live-Blaze walkthrough. Risk: most are confirmations ("scroll feels smooth"), but some may surface actual bugs that block v1.8 ship.

**Prevention:**
1. **Triage before execution:** open every HUMAN-UAT.md with deferred items, classify each as:
   - (a) Sensory/feel ("color discrimination," "scroll smoothness") — fast confirm/no-confirm via headless tools where possible (deuteranopia headless from Phase 40 is already automated).
   - (b) Functional behavior under live data ("Slow-3G skeleton renders," "Blaze 50K-resource pagination") — run with Synthea or similar.
   - (c) Edge case integration ("Patient with empty MII modules dims correctly").
2. **Reserve 1-2 plan slots inside the UAT phase** for "fix bugs surfaced during UAT" — don't assume zero bugs. Phases 28, 41 in the project history both had unplanned bug-fix slots open mid-execution.
3. Track which items become permanent automated tests (deuteranopia in Phase 40 → vitest in Phase 40) vs. one-time confirmations. Avoid recreating the v1.5 deferred-item churn (Phase 33-37 deuteranopia history) — automate wherever possible.

**Phase to address:** **UAT phase (UAT-01)** — Plan 1 (triage + execute). Schedule near the end of v1.8 so all features being UATed are present.

---

### Pitfall 15: `data-no-shortcuts` and `data-autofocus` attribute semantics drift across the codebase

**Risk:** **LOW** — Mantine's `data-autofocus` is a documented contract (Drawer FocusTrap). If v1.8 introduces a custom `data-no-shortcuts` for the global hotkey guard (Pitfall 1), and developers mistake it for a Mantine-blessed attribute and try to use it in non-shortcut contexts, semantics drift.

**Prevention:**
1. Document `data-no-shortcuts` in `CONVENTIONS.md` (project-level) when adopted.
2. Ensure the global `useHotkeys` ignore-element check is the SOLE consumer of `data-no-shortcuts`. No other code reads it.
3. Optionally namespace: `data-fhir-no-shortcuts` to make it grep-distinguishable from any future Mantine attribute.

**Phase to address:** **PEEK phase** — Plan 1 (keyboard guard generalization).

---

## Phase-Specific Risk Summary

| Phase Topic | Critical Pitfalls | Moderate Pitfalls | Minor Pitfalls |
|-------------|-------------------|-------------------|----------------|
| PEEK (JSON peek drawer) | 1 (input-focus guard), 3 (drawer a11y) | 7 (JsonViewer extraction), 8 (rapid swap), 9 (drawer kbd) | 12 (Cmd+click), 15 (attribute semantics) |
| SHELL (4-mode resource shell) | 4 (SegmentedControl semantics) | 10 (lazy mode 3) | — |
| EXPL (Explorer improvements) | — | — | — *(low risk; mostly additive)* |
| SIDE (Sidebar v2 + Spotlight) | 2 (Spotlight ⌘K conflict) | 11 (Expert toggle propagation) | 13 (Cohorts IA move) |
| LENS (Patients-as-lens) | 5 (sidebar highlight), 6 (Raw JSON modal removal) | — | — |
| UAT (Backlog closure) | — | — | 14 (triage discipline) |

**Highest-risk phase:** **PEEK** (3 critical, 3 moderate). Recommend it ship first per the handoff's own ordering (L194 "Phase 46.5"), so downstream phases consume a stable peek API rather than coupling to a moving target.

**Risk concentration insight:** the navigation redesign's biggest risks cluster around two patterns: (a) **keyboard contract integration** (Pitfalls 1, 2, 9, 15 — five of them), and (b) **state-bound-to-URL/route invariants** (Pitfalls 5, 6, 11). Both are resolvable by doing a single shared concern (global hotkey infrastructure; routing/IA mapping) BEFORE the per-feature plans, rather than letting each phase reinvent.

---

## Sources

- `src/components/explorer/ResourceDetailPage.tsx:36-217` — current keyboard handler + tabs + reference click interception (inspected directly).
- `design_handoff_v1.7_navigation/README.md` — design intent for peek drawer, 4-mode shell, sidebar v2, Patients-as-lens (inspected directly).
- `.planning/PROJECT.md` Key Decisions + Phase History (inspected directly).
- [Mantine Drawer documentation — `trapFocus`, `withOverlay`, `returnFocus`](https://mantine.dev/core/drawer/) — HIGH confidence; official docs.
- [Mantine Spotlight documentation — `mod+K` shortcut, ignore tag list](https://mantine.dev/x/spotlight/) — HIGH confidence; official docs.
- [Mantine Tabs documentation — `keepMounted`, ARIA roles](https://mantine.dev/core/tabs/) — HIGH confidence; official docs.
- [Mantine SegmentedControl — `role="radiogroup"` semantics](https://mantine.dev/core/segmented-control/) — HIGH confidence; official docs.
- [Mantine `use-hotkeys` — INPUT/TEXTAREA/SELECT default ignore](https://mantine.dev/hooks/use-hotkeys/) — HIGH confidence; official docs.
- [Mantine `use-focus-return`](https://mantine.dev/hooks/use-focus-return/) — HIGH confidence; official docs.
- [React Router v7 NavLink `end` prop / nested route active state](https://reactrouter.com/api/components/NavLink) — HIGH confidence; official docs.
- [React Router v7 useMatches + handle pattern for breadcrumbs](https://blog.logrocket.com/react-router-v7-guide/) — MEDIUM confidence; community.
- [React.lazy chunk-load retry — known limitation, sessionStorage workaround](https://dev.to/goenning/how-to-retry-when-react-lazy-fails-mb5) — HIGH confidence; corroborated by Phase 27 EFF-02 in this repo.
- [Zustand-with-Context vs singleton — memory leak considerations](https://tkdodo.eu/blog/zustand-and-react-context) — MEDIUM confidence; community blog (TkDodo / React Query maintainer).
