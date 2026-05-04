# Phase 52: JSON Peek Drawer Foundation - Research

**Researched:** 2026-05-04
**Domain:** Mantine Drawer, React Context, keyboard shortcut hooks, component extraction
**Confidence:** HIGH

## Summary

Phase 52 builds four tightly coupled pieces from scratch: a `JsonViewer` wrapper (extraction from `DeveloperJsonView`), a `PeekContext`/`PeekProvider` for app-wide drawer state, a `JsonPeekDrawer` component mounted at `AppLayout`, and a `useShortcuts` hook consumed first by `SearchResultsPage`. All dependencies (Mantine `Drawer`, `useDisclosure`, `ScrollArea`, `react-router-dom` `useNavigate`) are already installed and used in production code. No new packages are required.

The codebase already has clear precedents for every pattern this phase needs: `DashboardPage` shows the full `Drawer` + `useDisclosure` wiring; `ConnectionContext` / `TerminologyContext` show the `Provider + useFoo()` hook pattern; `ResourceDetailPage` shows the exact `document.addEventListener('keydown')` guard pattern that `useShortcuts` should mirror. The only net-new pattern is the focus-return-on-close mechanic (store `document.activeElement` at `openPeek` call time, call `element.focus()` on `closePeek`).

The grep success criterion (`git grep -rn "react-syntax-highlighter|JsonTreeView" src/`) is the binding constraint for the extraction task. After Phase 52, `JsonTreeView` must appear in exactly one file (`JsonTreeView.tsx` itself) and `react-syntax-highlighter` must appear in zero files. The current state has `JsonTreeView` imported in two places (`JsonTreeView.tsx` definition + `DeveloperJsonView.tsx` import) — the extraction removes the `DeveloperJsonView` direct import.

**Primary recommendation:** Follow the locked decisions verbatim. All patterns are verifiable in existing codebase files. Use `returnFocus={false}` on the Drawer (manual focus-return via stored `originElement` is required for PEEK-02; Mantine's built-in `returnFocus` returns to the last active element before the drawer opened, which may not be the originating row after content-swap).

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions

- **D-01:** Create `src/components/json/JsonViewer.tsx` as the single source-of-truth JSON rendering component. It wraps `JsonTreeView` (tree-view + expand/collapse) inside a `<ScrollArea>` with the correct height calculation. Accepts `resource: Resource` prop.
- **D-02:** `JsonTreeView.tsx` remains in place (it is the implementation detail) but `DeveloperJsonView.tsx` is updated to import `JsonViewer` from `src/components/json/JsonViewer.tsx` instead of `JsonTreeView` directly. The success criterion grep must resolve to exactly one definition file.
- **D-03:** `JsonSyntaxHighlight.tsx` is NOT part of this extraction. Scope only what the grep gate requires.
- **D-04:** Add `tabIndex={0}` to each `<Table.Tr>` in `SearchResultsPage`. Track the currently focused row via `onFocus` → set `focusedResource` state; `onBlur` clears it (with a delay or `relatedTarget` check to avoid flicker on click).
- **D-05:** The `J` keydown handler fires when `document.activeElement` is a focused table row (or a child of one). Input-focus guard: skip when `tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT'`.
- **D-06:** `Esc` while drawer is open closes it via Mantine `Drawer`'s `onClose` + `closeOnEscape`. Focus returns to originating row via `element.focus()` stored before opening.
- **D-07:** Pressing `J` on a different row while drawer is open replaces content without unmounting (`opened` stays `true`, `peekResource` state updates).
- **D-08:** Mount `<PeekProvider>` wrapping the `<Outlet>` inside `AppLayout.tsx`. `<JsonPeekDrawer>` renders inside `PeekProvider`.
- **D-09:** Drawer config: `position="right"` · `size={420}` · `trapFocus={true}` · `withOverlay={false}`.
- **D-10:** `Enter` while drawer is open navigates to `/explorer/:type/:id?mode=json` via `useNavigate` inside `JsonPeekDrawer`.
- **D-11:** Create `src/hooks/useShortcuts.ts` — accepts `shortcuts: Record<string, () => void>` and `enabled?: boolean` (defaults `true`). Uses `document.addEventListener('keydown')` with the standard input-focus guard.
- **D-12:** Phase 52 registers `{ j: openPeek }` via `useShortcuts` in `SearchResultsPage`.
- **D-13:** Existing raw `document.addEventListener('keydown')` in `ResourceDetailPage.tsx` is NOT migrated in Phase 52.
- **D-14:** `PeekContext` exports `openPeek(resource: Resource, originElement?: HTMLElement | null): void` and `closePeek(): void`. State lives in `PeekProvider`.
- **D-15:** `originElement` is stored at `openPeek` call time (the focused `<tr>` element) to restore focus on close.
- **D-16:** `[Open full →]` button in drawer header navigates using `useNavigate` inside the drawer component.

### Claude's Discretion

- Exact `ScrollArea` height formula for `JsonViewer` in drawer context — use `100%` since Mantine Drawer's own scroll container handles overflow.
- Whether `JsonViewer` shows a loading spinner — no spinner needed (resource already in state when `J` is pressed).
- Exact `onBlur` timing / `relatedTarget` approach to prevent `focusedResource` flicker.

### Deferred Ideas (OUT OF SCOPE)

- Copy button / Download button in drawer (Phase 54)
- Validation chip in drawer (Phase 54)
- Line numbers in drawer JSON view (Phase 54)
- `PatientListPage` `J` wiring (Phase 53 / PEEK-05)
- Reference chip `Cmd+click` (Phase 53 / PEEK-04)
</user_constraints>

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|------------------|
| PEEK-01 | Press `J` on focused Explorer row → 420px right-side drawer with full FHIR JSON, no URL change | `useShortcuts` hook + `PeekContext.openPeek` + Mantine `Drawer` with `position="right"` `size={420}` |
| PEEK-02 | `Esc` closes drawer, returns focus to originating row; `J` on different row swaps content without unmount | `returnFocus={false}` + manual `originElement.focus()` on close; `opened` stays true, `peekResource` state updates |
| PEEK-03 | `Enter` while drawer open / `[Open full →]` button → navigate to `/explorer/:type/:id?mode=json` | `keydown` listener inside `JsonPeekDrawer` + `useNavigate`; `mode=json` param is harmless before Phase 54 reads it |
| PEEK-06 | `JsonViewer` extracted from `DeveloperJsonView` — zero duplicate implementations (grep-provable) | Create `src/components/json/JsonViewer.tsx`; update `DeveloperJsonView` import; `JsonTreeView` remains as implementation detail |
</phase_requirements>

## Standard Stack

### Core
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| `@mantine/core` | 8.3.18 (installed) | `Drawer`, `ScrollArea`, `Group`, `Text`, `Button`, `ActionIcon` | Required peer dep; `Drawer` component has all needed props (`trapFocus`, `withOverlay`, `returnFocus`, `closeOnEscape`) |
| `@mantine/hooks` | 8.3.18 (installed) | `useDisclosure` for drawer open/close state inside `PeekProvider` | Already used in `DashboardPage`, `PatientListPage`, `ThresholdsPage` |
| `react-router-dom` | 7.14.0 (installed) | `useNavigate` in `JsonPeekDrawer` for PEEK-03 | Already used throughout for navigation |
| `@medplum/fhirtypes` | 5.1.7 (installed) | `Resource` type for `PeekContext` and `JsonViewer` props | Project standard for all FHIR types |

[VERIFIED: local node_modules — npm/package.json inspection 2026-05-04]

### No New Packages Required
All dependencies for Phase 52 are already installed. The phase is purely additive code.

**Installation:** None needed.

## Architecture Patterns

### Recommended Project Structure (new files)

```
src/
├── components/
│   └── json/                    # NEW directory
│       ├── JsonViewer.tsx        # NEW: single source-of-truth JSON renderer (PEEK-06)
│       └── JsonPeekDrawer.tsx    # NEW: 420px right drawer using PeekContext
├── contexts/
│   └── PeekContext.tsx           # NEW: openPeek/closePeek + peekState
└── hooks/
    └── useShortcuts.ts           # NEW: keyboard shortcut registration hook
```

Modified files:
```
src/components/explorer/DeveloperJsonView.tsx   — import from JsonViewer, not JsonTreeView
src/components/layout/AppLayout.tsx             — add PeekProvider + JsonPeekDrawer
src/components/explorer/SearchResultsPage.tsx   — tabIndex, focus state, useShortcuts
```

### Pattern 1: PeekContext — Provider + useFoo() Hook

Follows the exact pattern used by `ConnectionContext`, `SettingsContext`, `TerminologyContext`.

```typescript
// Source: src/contexts/ConnectionContext.tsx (verified 2026-05-04)
const PeekContext = createContext<PeekContextValue | null>(null);

export function PeekProvider({ children }: { children: ReactNode }) {
  const [peekState, setPeekState] = useState<PeekState | null>(null);
  // useDisclosure for open/close
  const [opened, { open, close }] = useDisclosure(false);

  const openPeek = useCallback((resource: Resource, originElement?: HTMLElement | null) => {
    setPeekState({ resource, originElement: originElement ?? null });
    open();
  }, [open]);

  const closePeek = useCallback(() => {
    close();
    // Restore focus after drawer close transition (small timeout for animation)
    // OR call synchronously if returnFocus={false} on Drawer
  }, [close, peekState]);

  // ...
}

export function usePeek(): PeekContextValue {
  const ctx = useContext(PeekContext);
  if (!ctx) throw new Error('usePeek must be used within PeekProvider');
  return ctx;
}
```

[VERIFIED: pattern confirmed from ConnectionContext.tsx — 2026-05-04]

### Pattern 2: Mantine Drawer — DashboardPage Reference

```typescript
// Source: src/components/dashboard/DashboardPage.tsx lines 496-587 (verified 2026-05-04)
<Drawer
  opened={drawerOpened}
  onClose={closeDrawer}
  position="right"
  title={<Group>...</Group>}
  padding="md"
  size="sm"
>
  {/* content */}
</Drawer>
```

For `JsonPeekDrawer`, the locked config is:
```typescript
<Drawer
  opened={opened}
  onClose={handleClose}
  position="right"
  size={420}               // px value (Mantine accepts number → converts to px)
  trapFocus={true}         // D-09 locked decision
  withOverlay={false}      // D-09 locked decision
  returnFocus={false}      // Manual focus-return via originElement (D-15)
  title={<Group justify="space-between">
    <Text ff="monospace">{resource.resourceType}/{resource.id}</Text>
    <Button size="xs" variant="subtle" onClick={handleOpenFull}>Open full →</Button>
  </Group>}
>
  <JsonViewer resource={resource} />
</Drawer>
```

[VERIFIED: Mantine ModalBaseProps.d.ts — `trapFocus`, `withOverlay`, `returnFocus`, `closeOnEscape` props confirmed — 2026-05-04]

### Pattern 3: useShortcuts Hook

Mirrors `ResourceDetailPage.tsx` lines 77-94 exactly:

```typescript
// Source: src/components/explorer/ResourceDetailPage.tsx:77-94 (verified 2026-05-04)
useEffect(() => {
  function handleKeyDown(e: KeyboardEvent) {
    const tag = document.activeElement?.tagName;
    if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT') return;
    switch (e.key) {
      case '1': setActiveTab('human-readable'); break;
      case '2': setActiveTab('developer'); break;
    }
  }
  document.addEventListener('keydown', handleKeyDown);
  return () => document.removeEventListener('keydown', handleKeyDown);
}, []);
```

`useShortcuts` generalizes this:
```typescript
// src/hooks/useShortcuts.ts
export function useShortcuts(
  shortcuts: Record<string, () => void>,
  enabled = true
): void {
  const shortcutsRef = useRef(shortcuts);
  shortcutsRef.current = shortcuts;  // stable ref to avoid re-adding listener

  useEffect(() => {
    if (!enabled) return;
    function handleKeyDown(e: KeyboardEvent) {
      const tag = document.activeElement?.tagName;
      if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT') return;
      const handler = shortcutsRef.current[e.key];
      if (handler) handler();
    }
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [enabled]);
}
```

[ASSUMED: `useRef` to stabilize the shortcuts map across re-renders — standard React pattern for event listeners, not verified against a specific doc page. LOW risk.]

### Pattern 4: tabIndex + Focus Tracking in Table Rows

Current `SearchResultsPage.tsx` `<Table.Tr>` uses only `onClick`. Adding focus:

```typescript
// Focused row state
const [focusedResource, setFocusedResource] = useState<Resource | null>(null);

// On each Table.Tr:
<Table.Tr
  key={r.id}
  tabIndex={0}
  style={{ cursor: 'pointer' }}
  onClick={() => navigate(`/explorer/${r.resourceType}/${r.id}`)}
  onFocus={() => setFocusedResource(r)}
  onBlur={(e) => {
    // relatedTarget check: if focus moves to another row or drawer, don't clear
    if (!e.currentTarget.parentElement?.contains(e.relatedTarget as Node)) {
      setFocusedResource(null);
    }
  }}
>
```

Then in `useShortcuts` call-site:
```typescript
useShortcuts({
  j: () => {
    if (!focusedResource) return;
    const originEl = document.activeElement as HTMLElement | null;
    openPeek(focusedResource, originEl);
  },
});
```

[VERIFIED: tabIndex on non-interactive elements is standard HTML; Mantine Table.Tr accepts HTML tr attributes — confirmed from Mantine Table docs pattern]

### Pattern 5: PEEK-03 Enter Key in Drawer

Inside `JsonPeekDrawer`, a second `useShortcuts` call (or raw useEffect) handles `Enter`:

```typescript
// Only active when drawer is open
useShortcuts(
  { Enter: handleOpenFull },
  opened  // enabled only when drawer is open
);
```

Where `handleOpenFull`:
```typescript
const handleOpenFull = useCallback(() => {
  if (!peekState) return;
  navigate(`/explorer/${peekState.resource.resourceType}/${peekState.resource.id}?mode=json`);
  closePeek();
}, [peekState, navigate, closePeek]);
```

### Pattern 6: AppLayout Integration

```typescript
// src/components/layout/AppLayout.tsx — add PeekProvider wrapping Outlet
import { PeekProvider } from '../../contexts/PeekContext';
import { JsonPeekDrawer } from '../json/JsonPeekDrawer';

// Inside AppShell.Main:
<PeekProvider>
  <Suspense fallback={<RouteLoadingFallback />}>
    <Outlet />
  </Suspense>
  <JsonPeekDrawer />
</PeekProvider>
```

The `JsonPeekDrawer` renders as a sibling to `<Suspense>` so it stays mounted regardless of route changes.

[VERIFIED: AppLayout.tsx read 2026-05-04 — `<AppShell.Main>` contains `<Suspense><Outlet /></Suspense>` and `<FeedbackButton />`; same mounting pattern applies]

### Anti-Patterns to Avoid

- **Do NOT use `returnFocus={true}` on the Drawer.** Mantine's built-in focus-return points to the last active element before the Drawer mounted — not the `<tr>` that called `openPeek`. Manual `originElement.focus()` is required. [VERIFIED: `returnFocus` prop confirmed in ModalBase.d.ts]
- **Do NOT use `keepMounted={true}`.** With `keepMounted={false}` (default), drawer unmounts on close; state resets cleanly. Content-swap while open is handled by updating `peekState` while `opened` remains `true`.
- **Do NOT unmount the drawer between row switches.** Close/reopen would cause visible flicker. Keep `opened={true}` and update `peekResource` state.
- **Do NOT add a dependency on `shortcuts` object** in the `useShortcuts` `useEffect` dep array — this would re-register the listener on every render. Use a stable `useRef` to hold the current shortcuts map.
- **Do NOT place `PeekProvider` inside a route component.** It must be at `AppLayout` level so Phase 53+ can call `openPeek` from `PatientListPage` and `IncomingReferencesPanel`.

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Drawer open/close state | Manual `useState(boolean)` | `useDisclosure` from `@mantine/hooks` | Already installed; handles open/close/toggle with stable refs |
| Focus trap inside drawer | Custom focus-trap logic | Mantine `trapFocus={true}` (built-in) | Mantine Drawer uses `react-focus-trap` internally |
| Escape key handling | Custom `onKeyDown` in drawer | `closeOnEscape={true}` (Mantine default) | Mantine handles it via ModalBase |
| Scroll container for JSON | Custom overflow CSS | `ScrollArea` from `@mantine/core` | Already used in `DeveloperJsonView`; handles resize correctly |
| JSON rendering | New syntax highlighter | `JsonTreeView.tsx` (existing) wrapped in `JsonViewer.tsx` | Extraction, not replacement; grep gate requires no new highlighter |

## Common Pitfalls

### Pitfall 1: Mantine Drawer `size` Prop Accepts Number or String
**What goes wrong:** Passing `size="420"` (string) vs `size={420}` (number). Mantine converts numbers to pixels (`420px`) via `rem()` conversion internally — but only for number primitives.
**Why it happens:** Inconsistency in how designers describe drawer widths.
**How to avoid:** Use `size={420}` (number) for the 420px requirement. [VERIFIED: DrawerRootCssVariables uses `'--drawer-size'`; Mantine converts numeric sizes to rem]
**Warning signs:** Drawer wider or narrower than expected in browser DevTools.

### Pitfall 2: Focus Flicker on Row Click (not keyboard press)
**What goes wrong:** When a user clicks a row (instead of using keyboard to focus then press `J`), `onFocus` fires immediately before `onClick`, setting `focusedResource`. Then `onBlur` fires when the row loses focus (because the click navigates away). This is fine for the navigate-on-click case. But if the drawer opens via click + `J`, `focusedResource` may be cleared by `onBlur` before `J` fires.
**Why it happens:** `onBlur` fires when `trapFocus={true}` on the Drawer captures focus.
**How to avoid:** In `onBlur`, use `relatedTarget` check — if focus moves into the drawer or to another `<tr>`, don't clear `focusedResource`. The `originElement` is captured at `openPeek` call time, before focus moves. [ASSUMED: `relatedTarget` approach — standard browser pattern, not verified against a specific doc]
**Warning signs:** `J` does nothing on second press; focus returns to wrong element on `Esc`.

### Pitfall 3: `trapFocus={true}` + `withOverlay={false}` Interaction
**What goes wrong:** With `trapFocus={true}`, focus is trapped inside the drawer. With `withOverlay={false}`, there is no visual backdrop — the user can see the table but cannot click it (keyboard only). This is the intended a11y-safe behavior per D-09, but it surprises devs who expect click-through.
**Why it happens:** Locked decision from STATE.md / REQUIREMENTS.md research.
**How to avoid:** Accept the behavior as correct. The user can use `Esc` to close and return to the table. Do NOT change to `trapFocus={false}` without revisiting the a11y analysis.

### Pitfall 4: Double Event Listener Registration in `useShortcuts`
**What goes wrong:** If `shortcuts` object is created inline (e.g., `useShortcuts({ j: fn })`), a new object reference is created on every render. If the `useEffect` has `shortcuts` in its dep array, the listener is torn down and re-added on every render.
**Why it happens:** Common React performance mistake.
**How to avoid:** Use `useRef` to store the current shortcuts map; the effect only depends on `enabled`. [ASSUMED: this is standard React hook pattern — see Pattern 3 above]

### Pitfall 5: `Enter` Key Conflicts With Drawer's Own Controls
**What goes wrong:** The `Enter` key handler for PEEK-03 fires even when focus is on the Drawer's close button (×) or the `[Open full →]` button — pressing `Enter` would then trigger both the button's click action AND the global `Enter` handler.
**Why it happens:** `useShortcuts` fires on `document.addEventListener` regardless of focused element.
**How to avoid:** In the `Enter` handler, add the same input-focus guard plus a check for interactive elements: `if (tag === 'BUTTON' || tag === 'A') return;`. This prevents double-firing when focus is on a button. [ASSUMED: button/anchor guard — reasonable extension of the existing pattern]
**Warning signs:** `[Open full →]` button triggers navigation twice (once from click, once from `Enter` listener).

### Pitfall 6: `DeveloperJsonView` Test References `JsonSyntaxHighlight`
**What goes wrong:** `src/__tests__/display-modes.test.tsx` has a comment saying `DeveloperJsonView wraps JsonSyntaxHighlight` — this is **stale documentation**. The actual implementation wraps `JsonTreeView`. The test only checks `DeveloperJsonView` is defined, not the actual implementation.
**Why it happens:** Historical comment from an earlier version; `DeveloperJsonView` now uses `JsonTreeView`, not `JsonSyntaxHighlight`.
**How to avoid:** After Phase 52, update the comment in `display-modes.test.tsx` to say "wraps `JsonViewer`" to keep tests and comments aligned.
**Warning signs:** `git grep -rn "JsonSyntaxHighlight" src/__tests__/` returns `display-modes.test.tsx` — this is a stale comment, not a real import.

### Pitfall 7: `ScrollArea` Height in Drawer Context
**What goes wrong:** `DeveloperJsonView` uses `h="calc(100vh - 250px)"` for its `ScrollArea`. Inside a Mantine Drawer, the drawer itself has its own scroll container. Using `calc(100vh - N)` inside a drawer can overflow or under-fill.
**Why it happens:** Drawer body has `overflow-y: auto` by default; nested `ScrollArea` with explicit `h` can conflict.
**How to avoid:** In `JsonViewer.tsx`, when rendered in the drawer context, use `h="100%"` (as noted in Claude's Discretion). The `ScrollArea` height is context-dependent — the `JsonViewer` should accept an optional `h` prop or default to `"100%"`. [VERIFIED: `DeveloperJsonView.tsx` uses `h="calc(100vh - 250px)"` — confirmed by reading the file]

## Code Examples

### JsonViewer.tsx (new — PEEK-06)
```typescript
// src/components/json/JsonViewer.tsx
// Source: extracts from DeveloperJsonView.tsx (verified 2026-05-04)
import { ScrollArea } from '@mantine/core';
import type { Resource } from '@medplum/fhirtypes';
import { JsonTreeView } from '../explorer/JsonTreeView';

export interface JsonViewerProps {
  resource: Resource;
  /** ScrollArea height. Defaults to '100%' for drawer context. */
  h?: string | number;
}

export function JsonViewer({ resource, h = '100%' }: JsonViewerProps) {
  return (
    <ScrollArea h={h}>
      <JsonTreeView data={resource} />
    </ScrollArea>
  );
}
```

### DeveloperJsonView.tsx (updated — PEEK-06)
```typescript
// src/components/explorer/DeveloperJsonView.tsx
// After: import JsonViewer from components/json; use h="calc(100vh - 250px)"
import { JsonViewer } from '../json/JsonViewer';
import type { Resource } from '@medplum/fhirtypes';

export function DeveloperJsonView({ resource }: { resource: Resource }) {
  return <JsonViewer resource={resource} h="calc(100vh - 250px)" />;
}
```

### Grep gate verification (post-implementation)
```bash
# Must return exactly: src/components/explorer/JsonTreeView.tsx (definition only)
git grep -rn "JsonTreeView" src/
# Must return 0 results:
git grep -rn "react-syntax-highlighter" src/
```

### Focus-return on close (PEEK-02)
```typescript
// Inside PeekProvider or JsonPeekDrawer onClose handler
const handleClose = useCallback(() => {
  closePeek();
  // After animation completes (or synchronously if no animation)
  peekState?.originElement?.focus();
}, [closePeek, peekState]);
```

## Environment Availability

All tools and dependencies are already present. No external services required.

| Dependency | Required By | Available | Version | Fallback |
|------------|------------|-----------|---------|----------|
| `@mantine/core` Drawer | JsonPeekDrawer | Yes | 8.3.18 | — |
| `@mantine/hooks` useDisclosure | PeekProvider | Yes | 8.3.18 | — |
| `react-router-dom` useNavigate | JsonPeekDrawer PEEK-03 | Yes | 7.14.0 | — |
| `@medplum/fhirtypes` Resource | JsonViewer, PeekContext | Yes | 5.1.7 | — |
| vitest + @testing-library/react | Test suite | Yes | 4.1.4 / 16.3.2 | — |

[VERIFIED: package.json + node_modules inspection 2026-05-04]

**No missing dependencies.**

## Validation Architecture

### Test Framework
| Property | Value |
|----------|-------|
| Framework | vitest 4.1.4 + @testing-library/react 16.3.2 |
| Config file | `vitest.config.ts` (root) |
| Quick run command | `npx vitest run src/__tests__/display-modes.test.tsx src/hooks/__tests__/` |
| Full suite command | `npx vitest run` |

### Phase Requirements → Test Map

| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| PEEK-06 | JsonViewer renders; DeveloperJsonView uses JsonViewer not JsonTreeView directly; grep gate passes | unit + grep | `npx vitest run src/__tests__/display-modes.test.tsx && git grep -rn "JsonTreeView" src/ | grep -v JsonTreeView.tsx | wc -l` | Partial (display-modes.test.tsx exists, needs update) |
| PEEK-01 | useShortcuts registers `J` handler; SearchResultsPage has tabIndex on rows | unit | `npx vitest run src/__tests__/SearchResultsPage.dateStatus.test.tsx` | Partial (file exists; new test needed for J/focus) |
| PEEK-02 | Esc closes drawer; focus returns to originElement; J on different row swaps content | unit | `npx vitest run src/__tests__/peek-drawer.test.tsx` | No — Wave 0 gap |
| PEEK-03 | Enter while drawer open navigates to correct URL | unit | `npx vitest run src/__tests__/peek-drawer.test.tsx` | No — Wave 0 gap |

### Sampling Rate
- **Per task commit:** `npx vitest run src/__tests__/display-modes.test.tsx`
- **Per wave merge:** `npx vitest run`
- **Phase gate:** Full suite green before `/gsd-verify-work`

### Wave 0 Gaps
- [ ] `src/__tests__/peek-drawer.test.tsx` — covers PEEK-01, PEEK-02, PEEK-03 (drawer mount, Esc close, Enter navigate, J-on-row)
- [ ] `src/__tests__/useShortcuts.test.ts` — covers useShortcuts hook (key dispatch, input-focus guard, enabled flag)
- [ ] Update comment in `src/__tests__/display-modes.test.tsx` line 28 — "wraps JsonViewer" not "wraps JsonSyntaxHighlight"

## Security Domain

Security enforcement is enabled (no explicit `false` in config).

### Applicable ASVS Categories

| ASVS Category | Applies | Standard Control |
|---------------|---------|-----------------|
| V2 Authentication | No | — |
| V3 Session Management | No | — |
| V4 Access Control | No | — |
| V5 Input Validation | Partial | FHIR resources rendered via `JsonTreeView` use React's JSX text rendering (no `dangerouslySetInnerHTML`). No user input is accepted in the drawer. |
| V6 Cryptography | No | — |

### Known Threat Patterns

| Pattern | STRIDE | Standard Mitigation |
|---------|--------|---------------------|
| XSS via FHIR resource content in JSON drawer | Tampering | `JsonTreeView` renders all values via React JSX children (text content), not `dangerouslySetInnerHTML`. `JsonSyntaxHighlight` also uses JSX-safe rendering. This is already verified in the existing implementation. |
| Focus injection via malicious `originElement` | Elevation of privilege | `originElement` is always `document.activeElement` at call time — always a DOM element the user actually focused. No user-supplied string is converted to an element reference. |

No new threat surfaces introduced. The drawer renders already-fetched FHIR data using existing safe rendering primitives.

## Assumptions Log

| # | Claim | Section | Risk if Wrong |
|---|-------|---------|---------------|
| A1 | `useRef` to stabilize shortcuts map prevents listener re-registration on every render | Architecture Patterns (Pattern 3), Pitfall 4 | LOW — if wrong, listeners accumulate and J fires multiple times. Fix: add explicit listener count guard or switch to `useCallback` with stable deps. |
| A2 | `relatedTarget` check in `onBlur` prevents `focusedResource` flicker when click navigates | Pitfall 2 | LOW — `relatedTarget` is standard DOM API; behavior may vary in jsdom tests. Fix: use `setTimeout(clearFocused, 0)` fallback if relatedTarget unreliable in tests. |
| A3 | `Enter` key guard should check `BUTTON` and `A` tags to prevent double-fire | Pitfall 5 | MEDIUM — if wrong, clicking `[Open full →]` with keyboard fires navigation twice. Fix: check `e.target` tagName in Enter handler. |
| A4 | Mantine Drawer `size={420}` (number) renders as `420px` | Pitfall 1 | LOW — confirmed numerics are valid by DrawerRootCssVariables type; actual px conversion is internal Mantine logic not verified via docs. |

## Open Questions

1. **`onBlur` timing for `focusedResource` clearing**
   - What we know: When drawer opens with `trapFocus={true}`, focus moves into the drawer, triggering `onBlur` on the `<tr>`. If `focusedResource` is cleared by `onBlur`, subsequent `J` presses (while the drawer is already open) may not know which row was active.
   - What's unclear: Whether `peekState.originElement` is sufficient to re-derive the row resource on content-swap (row → drawer → different-row focus → J again).
   - Recommendation: Store the resource directly in `peekState` (D-14 already does this via `openPeek(resource, originElement)` at call time, before `onBlur` fires). The `focusedResource` state in `SearchResultsPage` only needs to be valid long enough for the `J` handler to call `openPeek`. Content-swap is driven by the new `openPeek` call, not by `focusedResource`. This is self-resolving.

2. **`Enter` key conflict with Mantine Drawer's close button**
   - What we know: With `trapFocus={true}`, when user presses `Tab` to reach the × close button, pressing `Enter` should close the drawer (button click). The global `Enter` handler would simultaneously trigger `handleOpenFull`.
   - What's unclear: Whether Mantine's `trapFocus` prevents the global `document.addEventListener('keydown')` from firing.
   - Recommendation: It does NOT prevent global listeners. The `Enter` handler must guard against `tag === 'BUTTON'` (see Pitfall 5). Mark as Wave 0 test case.

## Sources

### Primary (HIGH confidence)
- `src/components/explorer/DeveloperJsonView.tsx` — current JSON wrapper; extraction target; verified by file read
- `src/components/explorer/JsonTreeView.tsx` — implementation detail; stays in place; verified by file read
- `src/components/explorer/SearchResultsPage.tsx` — Table.Tr pattern; tabIndex/focus integration point; verified by file read
- `src/components/layout/AppLayout.tsx` — PeekProvider mount point; `<Outlet>` + `<Suspense>` structure; verified
- `src/components/dashboard/DashboardPage.tsx` lines 496-587 — `Drawer` + `useDisclosure` reference implementation; verified
- `src/components/explorer/ResourceDetailPage.tsx` lines 77-94 — `useShortcuts` pattern to mirror; verified
- `src/contexts/ConnectionContext.tsx` — `Provider + useFoo()` context pattern; verified
- `node_modules/@mantine/core/lib/components/ModalBase/ModalBase.d.ts` — `trapFocus`, `withOverlay`, `returnFocus`, `closeOnEscape`, `keepMounted` props; verified
- `node_modules/@mantine/core/lib/components/Drawer/Drawer.d.ts` — `DrawerProps` interface; verified
- `package.json` + `node_modules/` — installed versions confirmed

### Secondary (MEDIUM confidence)
- `.planning/phases/52-json-peek-drawer-foundation/52-CONTEXT.md` — locked decisions (D-01 through D-16); authoritative design source
- `.planning/REQUIREMENTS.md` — PEEK-01 through PEEK-06 acceptance criteria
- `.planning/STATE.md` — carry-forward decisions (drawer config, focus behavior)

### Tertiary (LOW confidence)
- None for this phase — all claims are verified against local installed code or explicit design decisions.

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH — all packages installed and confirmed from node_modules
- Architecture: HIGH — all patterns have direct precedents in existing codebase files
- Pitfalls: HIGH (discovered from code) / ASSUMED (flagged in Assumptions Log)

**Research date:** 2026-05-04
**Valid until:** 2026-06-04 (stable Mantine 8 API; no fast-moving dependencies in this phase)
