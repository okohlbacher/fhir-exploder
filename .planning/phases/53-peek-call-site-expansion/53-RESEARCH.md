# Phase 53: Peek Call-Site Expansion - Research

**Researched:** 2026-05-04
**Domain:** React event interception, PeekContext extension, Mantine Drawer error state, vitest jsdom Cmd+click simulation
**Confidence:** HIGH

## Summary

Phase 53 is purely additive code expansion built on Phase 52's `PeekContext` foundation. All four target surfaces (Explorer table J, Patients list J, Human-mode reference rows Cmd+click, IncomingReferences/PatientRelatedResources Cmd+click) live in components already mounted under `AppLayout → PeekProvider`, so `usePeek()` is available everywhere. The phase introduces three concrete code changes plus four vitest integration tests:

1. Extend `PeekContext` with `openPeekError(reference, originElement)` and a nullable `resource` so the drawer can render an inline "Reference unresolvable" state without a toast.
2. Add Cmd/Ctrl+click handlers to two components: `ReferenceLink` (Anchor) and `RelatedResourcesPanel` (Card).
3. Mirror the Phase 52 J-shortcut wiring (tabIndex + focus tracking + `useShortcuts({ j })`) into `PatientListPage`.

All required APIs are already in place: `useReferenceResolver` exposes `{ resource, status }` synchronously when status is `'resolved'`; `useMedplum().searchResources(type, params)` returns `Resource[]` for one-shot first-result fetches; `useShortcuts` already implements the input-focus guard and ref-stable shortcut object pattern. No new packages.

**Primary recommendation:** Follow the locked decisions verbatim. Mirror `SearchResultsPage` row-focus wiring (lines 430-451) byte-for-byte in `PatientRow`. Use `e.preventDefault() + e.stopPropagation()` on Cmd+click in `ReferenceLink` to suppress both the anchor's default navigation AND the parent `handleReferenceClick` interceptor. Use `vi.mock('../../hooks/useReferenceResolver')` to control resolved/failed state in `ReferenceLink` tests, and `fireEvent.click(el, { metaKey: true })` to simulate Cmd+click in jsdom.

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions

#### Reference Chip Intercept (PEEK-04)
- **D-01:** Intercept Cmd/Ctrl+click in `ReferenceLink.tsx` via an `onClick` handler on the Anchor elements in both the `resolved` and `failed` render paths (NOT in `ResourceDetailPage.handleReferenceClick` — that interceptor handles plain clicks for in-app navigation; Cmd+click is a distinct action). When `e.metaKey || e.ctrlKey`:
  - `status === 'resolved'`: call `openPeek(resource, document.activeElement as HTMLElement | null)` + `e.preventDefault()` + `e.stopPropagation()`. `e.stopPropagation()` prevents the event from bubbling to the parent div's `handleReferenceClick` (which handles ONLY plain navigation — stopping it is correct).
  - `status === 'failed'`: call `openPeekError('Reference unresolvable', document.activeElement)` + `e.preventDefault()`
  - `status === 'pending'`: no-op — let the anchor behave normally (resource not yet available)
- **D-02:** `ReferenceLink` calls `usePeek()` to get `openPeek` and `openPeekError`. `ReferenceLink` is rendered inside `ResourceDetailPage` which is inside `AppLayout → PeekProvider`, so the context is available.

#### Drawer Error State (PEEK-04)
- **D-03:** Extend `PeekState` in `src/contexts/PeekContext.tsx` with optional `error?: string`. When `error` is set, the drawer body renders `<Text c="dimmed">Reference unresolvable</Text>` instead of `<JsonViewer>`. Change `resource` in `PeekState` from `Resource` to `Resource | null` (null when in error state).
- **D-04:** Add `openPeekError(reference: string, originElement?: HTMLElement | null): void` to `PeekContextValue`. The `reference` string (e.g., `"Patient/123"`) is used as the drawer title. Sets `peekState = { resource: null, originElement, error: 'Reference unresolvable', referenceText: reference }`.
- **D-05:** `JsonPeekDrawer` drawer title: when `peekState.resource` is null, display `peekState.referenceText ?? 'Reference'` in `ff="monospace"`. The `[Open full →]` button is hidden when resource is null (no resource to navigate to). Body shows `<Text c="dimmed">Reference unresolvable</Text>`.
- **D-06:** `PeekState.referenceText?: string` — optional field to hold the raw reference string (used as title in error state). When `resource` is non-null, the title continues to derive from `resource.resourceType/resource.id` as before.

#### Patients List J Shortcut (PEEK-05 surface 2)
- **D-07:** Add `focusedPatient: Patient | null` state + `useShortcuts({ j: handleJ })` to `PatientListPage`. `handleJ` calls `openPeek(focusedPatient as Resource, document.activeElement)` when `focusedPatient !== null`; silent no-op otherwise (same pattern as Phase 52 SearchResultsPage).
- **D-08:** Add `tabIndex={0}` + `onFocus?: () => void` + `onBlur?: (e: React.FocusEvent<HTMLTableRowElement>) => void` to `PatientRow` component props. Parent `PatientListPage` passes handlers that set/clear `focusedPatient`.
- **D-09:** `onBlur` uses the same `relatedTarget`/`tbody.contains(next)` guard as Phase 52 to prevent flicker when focus moves from one row to another within the table. Same indigo `var(--accent-ring)` focus outline (2px, -1px offset) via inline `style`.
- **D-10:** `PatientListPage` passes `focusedPatient` down to each `PatientRow` to conditionally apply the focus ring style (matching Phase 52 pattern).

#### RelatedResourcesPanel Cmd+click (PEEK-05 surfaces 3+4)
- **D-11:** Add Cmd/Ctrl+click handler to `<Card>` elements in `RelatedResourcesPanel.tsx`. When `e.metaKey || e.ctrlKey` on a card:
  1. `e.stopPropagation()` (prevents navigation from the plain `onClick`)
  2. Check `counts[entryKey(e)]`: if still loading or 0, no-op (nothing to peek)
  3. Fetch first resource: `client.searchResources(entry.type as ResourceType, { [entry.param]: refValue, _count: '1' })[0]`
  4. If result: `openPeek(result, document.activeElement as HTMLElement | null)`
  5. If no result or error: `openPeekError('Reference unresolvable', document.activeElement)`
- **D-12:** `RelatedResourcesPanel` calls `usePeek()` and `useMedplum()` (already uses `useMedplum` for count fetches). `client.searchResources()` returns `Resource[]` directly.
- **D-13:** The Cmd+click fetch is a one-shot async call — no loading spinner in the card. If the user Cmd+clicks and the drawer opens with a brief delay, that is acceptable (local Blaze is fast). No additional loading state needed.
- **D-14:** Both `IncomingReferencesPanel` (non-Patient reverse refs) and `PatientRelatedResources` (Patient forward refs) use `RelatedResourcesPanel`, so Cmd+click peek is free on BOTH surfaces. `PatientRelatedResources` cards count as PEEK-05 surface 4.

#### Test Strategy (PEEK-05 verification)
- **D-15:** Each of the 4 surfaces requires a vitest test:
  - Explorer table J: `src/__tests__/peek-srp-integration.test.tsx` (Phase 52, done)
  - Patients list J: `src/__tests__/peek-patients-integration.test.tsx` (new)
  - Human-mode reference rows: `src/__tests__/peek-reference-link.test.tsx` (new)
  - IncomingReferences/RelatedResources: `src/__tests__/peek-related-resources.test.tsx` (new)

### Claude's Discretion

- Whether to add a visual affordance (e.g., cursor change or `Cmd` modifier hint tooltip) to ReferenceLink anchors to communicate that Cmd+click opens the peek drawer — not required by PEEK-04, but improves discoverability. Claude may add a subtle tooltip if straightforward.
- Whether `openPeekError` reuses the same `openPeek` code path with `resource = null` or has a separate code path in `PeekProvider`. Either approach is acceptable.
- Exact `_count=1` fetch in RelatedResourcesPanel — consider reusing `client.search()` or `client.searchResources()` per project pattern.

### Deferred Ideas (OUT OF SCOPE)

- Hover-peek 4-line JSON preview tooltip on reference chips — explicitly out of scope (REQUIREMENTS.md §Out of Scope)
- Arrow-key navigation between focused rows in PatientListPage — Polish item; not in PEEK requirements
- Optimistic drawer open (open drawer immediately while fetch is in progress for RelatedResourcesPanel Cmd+click) — D-13 decided against this to keep implementation simple
</user_constraints>

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|------------------|
| PEEK-04 | `Cmd/Ctrl+click` on any reference chip opens the drawer with the referenced resource (resolved via Phase 47 cache); failed resolution shows inline "Reference unresolvable" — no toast | `useReferenceResolver()` already exposes synchronous `{ resource, status }` in `ReferenceLink`. PeekContext extension adds `openPeekError(reference, origin)`. JsonPeekDrawer renders `<Text c="dimmed">Reference unresolvable</Text>` body when `peekState.resource === null`. |
| PEEK-05 | Drawer reachable from at least 4 surfaces: Explorer table (J), Patients list (J), IncomingReferencesPanel cards (Cmd+click), Human-mode reference rows (Cmd+click) | Surface 1 done in Phase 52 (`SearchResultsPage`). Surface 2: mirror Phase 52 wiring in `PatientListPage` + `PatientRow`. Surface 3+4: shared `RelatedResourcesPanel` Cmd+click handler covers both `IncomingReferencesPanel` and `PatientRelatedResources` (free dual coverage per D-14). Surface 4 (Human-mode reference rows): `ReferenceLink` Cmd+click handler. |
</phase_requirements>

## Project Constraints (from CLAUDE.md)

- **Tech stack:** React 18.3.1, TypeScript 5.7.x, Vite 8, `@medplum/{core,fhirtypes,react,react-hooks}` 5.1.7, `@mantine/*` 8.3.18 — no new packages may be added.
- **DO NOT use:** Tailwind, Mantine 9 (React 19 conflict), `@tanstack/react-query` (competes with MedplumClient cache), Next.js. Phase 53 introduces no new libraries — pure code change.
- **GSD enforcement:** All file edits MUST go through `/gsd-execute-phase`. The plan files this research feeds are the only authoritative entry point.
- **License/JSON viewer rules:** PEEK-06 grep gate locked in Phase 52 — `JsonViewer` is the ONLY non-definition consumer of `JsonTreeView`. Phase 53 must continue to render JSON via `<JsonViewer resource={...} />` and MUST NOT directly import `JsonTreeView` or `react-syntax-highlighter`.
- **Read-only constraint:** Phase 53 only reads FHIR data (one-shot `searchResources` for related cards, no writes). Aligns with project core constraint.
- **Local-only Blaze:** Per D-13, fetch latency is assumed low — no loading spinner needed for Cmd+click first-result fetch.

## Standard Stack

### Core
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| `@mantine/core` | 8.3.18 (installed) | `Drawer`, `Text`, `Group` (drawer error body); `Anchor`, `Tooltip`, `Card` (already used by ReferenceLink/RelatedResourcesPanel) | Required peer dep of `@medplum/react` 5.x; locked at ^8.0.0 by `@medplum/react` peer pin (STACK-01 deferred indefinitely). [VERIFIED: package.json] |
| `@mantine/hooks` | 8.3.18 (installed) | `useDisclosure` (already used in `PeekProvider`) | Required peer dep of `@medplum/react`. [VERIFIED: package.json] |
| `@medplum/core` | 5.1.7 (installed) | `MedplumClient.searchResources(type, query)` returns `ReadablePromise<ResourceArray<WithId<...>>>` — used by D-11 first-result fetch | Project standard. [VERIFIED: node_modules/@medplum/core/dist/cjs/index.d.ts:3940] |
| `@medplum/react-hooks` | 5.1.7 (installed) | `useMedplum()` — already used in `RelatedResourcesPanel` for count fetches | Project standard. [VERIFIED: package.json] |
| `@medplum/fhirtypes` | 5.1.7 (installed) | `Resource`, `ResourceType`, `Patient` types — `Patient extends Resource`, so `openPeek(focusedPatient as Resource, ...)` is type-safe | Project standard. [VERIFIED: package.json] |
| `react-router-dom` | 7.14.0 (installed) | `useNavigate` (continues to drive Card plain-click navigation in `RelatedResourcesPanel`) | Already used. [VERIFIED: package.json] |
| `vitest` | 4.1.4 (installed) | Test framework for the 3 new integration tests + extended drawer tests | Project standard. [VERIFIED: package.json] |
| `@testing-library/react` | (installed) | `render`, `screen`, `fireEvent`, `waitFor`, `act` | Already used in Phase 52 tests. [VERIFIED: src/__tests__/peek-srp-integration.test.tsx] |

### No New Packages Required
All dependencies for Phase 53 are already installed. The phase is purely additive TypeScript code in three existing components plus one extended context.

**Installation:** None needed.

## Architecture Patterns

### Component Map (Phase 53 file changes)

```
src/
├── contexts/
│   └── PeekContext.tsx                    # EXTEND — add openPeekError, nullable resource
├── components/
│   ├── json/
│   │   └── JsonPeekDrawer.tsx             # EXTEND — render error body, hide [Open full →] when resource null
│   ├── explorer/
│   │   ├── ReferenceLink.tsx              # EXTEND — Cmd+click handler in resolved + failed paths
│   │   └── RelatedResourcesPanel.tsx      # EXTEND — Card Cmd+click handler with searchResources fetch
│   └── patients/
│       └── PatientListPage.tsx            # EXTEND — focusedPatient state + useShortcuts + tabIndex on PatientRow
└── __tests__/
    ├── peek-patients-integration.test.tsx # NEW — Patients list J shortcut
    ├── peek-reference-link.test.tsx       # NEW — Cmd+click on ReferenceLink (resolved + failed)
    └── peek-related-resources.test.tsx    # NEW — Cmd+click on RelatedResourcesPanel Card
```

### Pattern 1: J-Shortcut Row Wiring (mirror SearchResultsPage)
**What:** Track focused row via `onFocus`/`onBlur`, register `useShortcuts({ j: handleJ })` at the page level, render indigo focus ring inline.
**When to use:** PatientListPage `PatientRow` — D-07/D-08/D-09/D-10.
**Reference implementation:** `src/components/explorer/SearchResultsPage.tsx:148-156, 429-451`.

```typescript
// Source: src/components/explorer/SearchResultsPage.tsx (Phase 52 ref impl)
const { openPeek } = usePeek();
const [focusedResource, setFocusedResource] = useState<Resource | null>(null);

const handleJ = useCallback(() => {
  if (!focusedResource) return; // silent no-op
  openPeek(focusedResource, document.activeElement as HTMLElement | null);
}, [focusedResource, openPeek]);

useShortcuts({ j: handleJ });

// Inside <Table.Tbody>:
<Table.Tr
  key={r.id}
  tabIndex={0}
  style={{
    cursor: 'pointer',
    outline: focusedResource?.id === r.id ? '2px solid var(--accent-ring)' : undefined,
    outlineOffset: focusedResource?.id === r.id ? '-1px' : undefined,
  }}
  onClick={() => navigate(`/explorer/${r.resourceType}/${r.id}`)}
  onFocus={() => setFocusedResource(r)}
  onBlur={(e) => {
    const next = e.relatedTarget as Node | null;
    const tbody = (e.currentTarget as HTMLElement).closest('tbody');
    if (!next || !tbody?.contains(next)) {
      setFocusedResource(null);
    }
  }}
>
```

For Phase 53, swap `Resource` → `Patient`, `setFocusedResource` → `setFocusedPatient`, and pass the page-level state down to `PatientRow` so it can compute the outline (D-10).

### Pattern 2: Cmd+Click Interception with Event Propagation Control
**What:** Intercept the modifier-key click on Anchor/Card, call `e.preventDefault()` + `e.stopPropagation()` to suppress both the default navigation and the parent click handler.
**When to use:** `ReferenceLink` (Anchor) and `RelatedResourcesPanel` (Card) — D-01, D-11.
**Why both calls matter:** `preventDefault()` cancels the browser's default `<a href>` navigation; `stopPropagation()` blocks the click from bubbling to ancestor handlers like `ResourceDetailPage.handleReferenceClick` (which intercepts plain clicks on FHIR-style anchors at line 105-124 of `ResourceDetailPage.tsx`).

```typescript
// Pattern for ReferenceLink resolved-status Anchor
<Anchor
  size="sm"
  href={href}
  onClick={(e) => {
    if (e.metaKey || e.ctrlKey) {
      e.preventDefault();
      e.stopPropagation();
      openPeek(resource, document.activeElement as HTMLElement | null);
      return;
    }
    // plain click: let parent handleReferenceClick intercept (do nothing here)
  }}
>
  {summary}
</Anchor>
```

For the `failed` path, mirror the same shape but call `openPeekError(reference, document.activeElement)`. For `pending` status, no `onClick` modification — the user gets the raw text (no anchor anyway, per current code path).

### Pattern 3: First-Result Fetch via searchResources
**What:** One-shot async fetch of the first matching resource for a reverse-reference Card.
**When to use:** `RelatedResourcesPanel` Cmd+click handler — D-11.

```typescript
// Source: pattern in RelatedResourcesPanel + MedplumClient.searchResources signature
import type { ResourceType } from '@medplum/fhirtypes';

async function handleCardCmdClick(e: ReverseReferenceEntry) {
  try {
    const results = await client.searchResources(e.type as ResourceType, {
      [e.param]: refValue,
      _count: '1',
    });
    const first = results[0];
    if (first) {
      openPeek(first, document.activeElement as HTMLElement | null);
    } else {
      openPeekError('Reference unresolvable', document.activeElement as HTMLElement | null);
    }
  } catch {
    openPeekError('Reference unresolvable', document.activeElement as HTMLElement | null);
  }
}
```

`searchResources` returns `ReadablePromise<ResourceArray<WithId<ExtractResource<RT>>>>` — directly indexable. [VERIFIED: node_modules/@medplum/core/dist/cjs/index.d.ts:3940]

### Pattern 4: PeekContext Error State Extension
**What:** Add a nullable `resource` and an optional `error`/`referenceText` to `PeekState`; the drawer branches on `peekState.resource === null` to render the error body.
**When to use:** `PeekContext.tsx` + `JsonPeekDrawer.tsx` — D-03, D-04, D-05, D-06.

```typescript
// Extended PeekContext (D-03..D-06)
export interface PeekState {
  resource: Resource | null;          // CHANGED: was Resource (D-03)
  originElement: HTMLElement | null;
  error?: string;                     // NEW (D-03)
  referenceText?: string;             // NEW — used as title when resource is null (D-06)
}

export interface PeekContextValue {
  peekState: PeekState | null;
  opened: boolean;
  openPeek: (resource: Resource, originElement?: HTMLElement | null) => void;
  openPeekError: (reference: string, originElement?: HTMLElement | null) => void;  // NEW (D-04)
  closePeek: () => void;
}

// Implementation
const openPeekError = useCallback(
  (reference: string, originElement?: HTMLElement | null) => {
    setPeekState({
      resource: null,
      originElement: originElement ?? null,
      error: 'Reference unresolvable',
      referenceText: reference,
    });
    open();
  },
  [open],
);
```

In `JsonPeekDrawer`, branch on `peekState.resource`:

```typescript
if (!peekState) return null;

const isError = peekState.resource === null;
const titleText = isError
  ? (peekState.referenceText ?? 'Reference')
  : `${peekState.resource.resourceType}/${peekState.resource.id}`;

return (
  <Drawer ... title={
    <Group justify="space-between" gap="sm" wrap="nowrap" w="100%">
      <Text size="sm" ff="monospace" fw={600}>{titleText}</Text>
      {!isError && (
        <Button size="xs" variant="subtle" color="indigo" onClick={handleOpenFull}>
          Open full →
        </Button>
      )}
    </Group>
  }>
    {isError
      ? <Text c="dimmed">Reference unresolvable</Text>
      : <JsonViewer resource={peekState.resource} />}
  </Drawer>
);
```

The Enter shortcut (`useShortcuts({ Enter: ... })`) should also no-op when `isError === true` so the user can't navigate to a non-existent resource. Add the guard at the top of the Enter handler.

### Anti-Patterns to Avoid

- **Adding the Cmd+click intercept inside `ResourceDetailPage.handleReferenceClick` instead of `ReferenceLink`:** Deliberately rejected by D-01. `handleReferenceClick` exists for ALL anchors (including ones not rendered by `ReferenceLink`) and currently uses href-pattern matching. Mixing peek logic into it would (1) require it to know about `usePeek`, (2) couple it to `useReferenceResolver` cache lookups, and (3) break the principle that the interceptor handles "plain navigation only." Keep the layers separate.
- **Forgetting `e.stopPropagation()` on the Cmd+click handler in `ReferenceLink`:** Without it, the click event bubbles up to the `<div onClick={handleReferenceClick}>` wrapper in `ResourceDetailPage:198`. That handler runs `breadcrumbs.push(...)` AND would also run `e.preventDefault()` if it matches, causing a navigation push WHILE the drawer opens. Both `preventDefault` AND `stopPropagation` are required.
- **Mounting a second `<JsonPeekDrawer>` inside `PatientListPage`:** Phase 52 already mounts one in `AppLayout` (line 50). Don't add another.
- **Inlining the `searchResources` call in the `<Card>` JSX (in arrow function form):** Define `handleCardCmdClick(e)` once with `useCallback` so each card click reuses the same closure (consistent with the existing `onClick={() => navigate(onCardNavigate(e))}` pattern but extended).
- **Using `client.search()` (returns Bundle) instead of `client.searchResources()` (returns array) for the first-result fetch:** `searchResources` is already idiomatic in the codebase and avoids the `bundle.entry?.[0]?.resource` unwrap dance.
- **Treating `Patient` as not assignable to `Resource`:** `Patient extends DomainResource extends Resource` per `@medplum/fhirtypes`. The `as Resource` cast in D-07 is purely for clarity; it is not actually narrowing — `openPeek(focusedPatient, ...)` would also compile.
- **Skipping the input-focus guard for J:** `useShortcuts` already does this (`tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT'` → skip). PatientListPage has many TextInput/NumberInput/Select fields in its filter card; the guard is what keeps J from triggering while a user types in the Name field.

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Modifier-key keyboard shortcuts | Raw `document.addEventListener('keydown')` | `useShortcuts({ j: handleJ })` | Already implemented in Phase 52 with input-focus guard, ref-stable shortcuts, cleanup. |
| First-result FHIR fetch | Manual `bundle.entry?.[0]?.resource` unwrap | `client.searchResources(type, params).then(arr => arr[0])` | Returns `Resource[]` directly; less plumbing. |
| Drawer state | Multiple `useState` + manual open/close | `usePeek()` from `PeekContext` | Already provides `openPeek`, `closePeek`, `opened`, `peekState` plus `originElement` capture. |
| Reference resolution / cache | Manual `client.readResource()` in `ReferenceLink` Cmd+click | `useReferenceResolver()` already runs synchronously when `status === 'resolved'` | Phase 47 cache hits return `Resource` immediately. No additional fetch needed in the resolved path. |
| Focus return after drawer close | Custom focus-restoration logic | `peekState.originElement.focus()` in `JsonPeekDrawer.handleClose` (already implemented Phase 52) | Captures the focused element at open time, restores via `queueMicrotask`. |
| Card-click navigation in RelatedResourcesPanel | New `onClick` plumbing | Existing `onClick={() => navigate(onCardNavigate(e))}` retained for plain click; extend with Cmd-modifier branch | Preserves existing test contracts while adding peek behavior. |

**Key insight:** Phase 53 is 90% wiring existing primitives together. The only "new" code is the `openPeekError` reducer in `PeekContext` and the `Resource | null` branch in `JsonPeekDrawer`. Don't reinvent any of the focus/keyboard/cache machinery — it is all in place.

## Common Pitfalls

### Pitfall 1: Cmd+click event order — preventDefault and stopPropagation order matters
**What goes wrong:** Without `stopPropagation`, the click bubbles to `ResourceDetailPage:198`'s `handleReferenceClick`, which calls `breadcrumbs.push({ resourceType, id })` — pushing a breadcrumb AND opening the drawer simultaneously. The user sees a stale URL/breadcrumb after Esc closes the drawer.
**Why it happens:** React's synthetic event system bubbles by default. The Anchor and the wrapping div both have onClick handlers.
**How to avoid:** Always call BOTH `e.preventDefault()` AND `e.stopPropagation()` in the modifier branch. Tests should assert `mockNavigate` (or breadcrumbs.push) was NOT called when peek is opened via Cmd+click.
**Warning signs:** After Cmd+click, the URL changes or the back button jumps; drawer opens correctly but breadcrumb count grows.

### Pitfall 2: `useReferenceResolver` returns `pending` status on first render — Cmd+click must no-op
**What goes wrong:** If the user Cmd+clicks during the brief pending window, the handler tries to `openPeek(undefined)` and crashes (or opens an empty drawer).
**Why it happens:** Phase 47 cache populates asynchronously; first render after a fresh page load shows skeleton + raw text.
**How to avoid:** D-01 explicitly says: `pending` → no-op (let the anchor behave normally / no Cmd+click handler installed). Confirm by guarding `if (status !== 'resolved' && status !== 'failed') return;` at the top of the Cmd+click branch — but the simplest implementation is to only attach the `onClick` modifier branch in the `resolved` and `failed` render paths (which is what the existing structure already does).
**Warning signs:** Tests with `useReferenceResolver` mocked to return `pending` should observe NO drawer state change on Cmd+click.

### Pitfall 3: Patient list J shortcut clobbered by filter input typing
**What goes wrong:** User types "Joachim" into the Name filter; pressing the `j` key opens the drawer with whatever row was last focused.
**Why it happens:** `useShortcuts` registers a global `keydown` listener.
**How to avoid:** `useShortcuts` already has the `INPUT/TEXTAREA/SELECT` guard built in (`src/hooks/useShortcuts.ts:28`). Phase 52 verified this in `peek-srp-integration.test.tsx:173-187`. Phase 53 inherits the guard for free — no extra work in PatientListPage. Just confirm with a regression test (D-15: include an INPUT-focused J test in `peek-patients-integration.test.tsx`).
**Warning signs:** Drawer opens unexpectedly while filter inputs have focus.

### Pitfall 4: Mantine Card `onClick` fires the modifier branch even when row is plain-clicked
**What goes wrong:** The current `<Card onClick={() => navigate(...)}>` doesn't read modifiers. After D-11, the SAME onClick handles both plain and Cmd+click. If the modifier check is missing or backwards, plain clicks trigger peek instead of navigation (or vice versa).
**Why it happens:** A single `onClick` handler must handle both code paths.
**How to avoid:** Structure the handler to fall through to `navigate(onCardNavigate(e))` when modifier is absent:
```typescript
onClick={(evt) => {
  if (evt.metaKey || evt.ctrlKey) {
    evt.stopPropagation();
    handleCardCmdClick(e);
    return;
  }
  navigate(onCardNavigate(e));
}}
```
Tests must cover BOTH paths: plain click → `mockNavigate` called; Cmd+click → `mockNavigate` NOT called, `openPeek` called instead.
**Warning signs:** Existing `RelatedResourcesPanel` plain-click navigation test (`__tests__/RelatedResourcesPanel.test.tsx:169-189`) starts failing.

### Pitfall 5: `searchResources` `_count` parameter — string vs number, page count vs total
**What goes wrong:** `_count='1'` returns a Bundle with one entry; the resource count is ALSO 1. But if you accidentally pass `count=1` (no underscore) Medplum may not recognize it.
**Why it happens:** FHIR search params are underscore-prefixed.
**How to avoid:** Use exact key `_count: '1'` (string) or `_count: 1` (number — Medplum coerces). Verify in node_modules typing if uncertain. The existing `searchByIdentifierPrefix` pattern in `src/utils/searchByIdentifierPrefix.ts` already uses `_count` correctly.
**Warning signs:** Test mock receives a query string without `_count=1` and returns the full result set, which still works in jsdom but is wasteful in prod.

### Pitfall 6: `searchResources` returns a `ReadablePromise` — must be awaited
**What goes wrong:** `client.searchResources(...)[0]` (no await) returns `undefined` — `ReadablePromise` is a Promise, not an Array.
**Why it happens:** Easy to skim past `Promise<...>` in IDE autocomplete.
**How to avoid:** Use `await` or `.then()`. The Phase 53 handler is `async` — make sure the `onClick` arrow remains synchronous and calls an async helper that handles the `await`.
**Warning signs:** TypeScript catches this immediately; runtime behavior is "drawer opens with `undefined` resource" → JsonPeekDrawer crashes on `peekState.resource.resourceType`.

### Pitfall 7: jsdom Cmd+click test simulation — must include `metaKey: true` (or `ctrlKey`)
**What goes wrong:** `fireEvent.click(card)` simulates a plain click (no modifiers). The Cmd+click branch never executes; tests pass for the wrong reason.
**Why it happens:** Default `MouseEvent` constructor sets all modifier keys to `false`.
**How to avoid:** `fireEvent.click(card, { metaKey: true })` (or `ctrlKey: true` for cross-platform). Both must be tested separately if both paths are supported.
**Warning signs:** Test asserts `openPeek` was called but the actual implementation never reads `e.metaKey`.

### Pitfall 8: Mantine Anchor with `href="#"` and no `onClick.preventDefault()` causes URL `#` artifact
**What goes wrong:** Cmd+click on a `failed`-state Anchor fires `openPeekError` but the browser still navigates to `#fragment`, leaving a `#` in the address bar.
**Why it happens:** `<a href="#">` is the default for `failed` paths in some renders. `e.preventDefault()` is required regardless of path.
**How to avoid:** Always `preventDefault()` in the modifier branch — D-01 requires it.
**Warning signs:** Address bar gains a `#` character after Cmd+click on an unresolvable reference.

### Pitfall 9: `PatientRow` is defined OUTSIDE `PatientListPage` — passing `focusedPatient` requires prop drilling
**What goes wrong:** Adding `focusedPatient` as a closure variable to `PatientRow` doesn't work because `PatientRow` is a top-level function (line 244-311), not nested inside `PatientListPage`.
**Why it happens:** `PatientRow` is hoisted as its own component for clarity.
**How to avoid:** Add `isFocused?: boolean` (or `focusedPatientId?: string`) as a `PatientRow` prop. `PatientListPage` passes `isFocused={focusedPatient?.id === p.id}`. Cleaner than passing the full `Patient` object. Keep prop names obvious — D-10 just says "pass focusedPatient down"; the planner/implementer can choose the cleanest prop shape.
**Warning signs:** Test for focus ring style fails because `PatientRow` doesn't receive the focus state.

### Pitfall 10: Patient row already has an inner `<Anchor>` for the patient name — focus may land on Anchor not Row
**What goes wrong:** When user Tabs through the table, focus moves to the inner Anchor (line 281-291) rather than the `<Table.Tr>`. The `onFocus` handler on `<Table.Tr>` does fire (focus events bubble) but `document.activeElement` will be the Anchor, not the row. Phase 52 has the same situation in `SearchResultsPage` — its tests pass because the row's `onFocus` is what tracks `focusedResource`, not `document.activeElement`.
**Why it happens:** The `<Anchor>` inside `<Table.Td>` is a focusable child; tabIndex=0 on `<Table.Tr>` makes the row a sibling tab stop.
**How to avoid:** Keep the same approach as Phase 52: `onFocus` (delegated, fires when anything inside the row is focused) sets `focusedPatient`; `J` press opens drawer with that patient regardless of which inner element has focus. The `originElement` captured at openPeek time will be `document.activeElement` (the Anchor or the Tr) — both are valid focus targets for restoration.
**Warning signs:** Test for "J on focused row opens drawer" passes; "Esc returns focus to the row" might restore focus to the Anchor instead. Acceptable per existing Phase 52 behavior.

## Code Examples

### Extending PeekContext with openPeekError

```typescript
// Source: pattern derived from src/contexts/PeekContext.tsx (Phase 52)
import { createContext, useCallback, useContext, useMemo, useState, type ReactNode } from 'react';
import { useDisclosure } from '@mantine/hooks';
import type { Resource } from '@medplum/fhirtypes';

export interface PeekState {
  resource: Resource | null;        // CHANGED for D-03
  originElement: HTMLElement | null;
  error?: string;                    // NEW for D-03
  referenceText?: string;            // NEW for D-06
}

export interface PeekContextValue {
  peekState: PeekState | null;
  opened: boolean;
  openPeek: (resource: Resource, originElement?: HTMLElement | null) => void;
  openPeekError: (reference: string, originElement?: HTMLElement | null) => void;
  closePeek: () => void;
}

export function PeekProvider({ children }: { children: ReactNode }) {
  const [peekState, setPeekState] = useState<PeekState | null>(null);
  const [opened, { open, close }] = useDisclosure(false);

  const openPeek = useCallback(
    (resource: Resource, originElement?: HTMLElement | null) => {
      setPeekState({ resource, originElement: originElement ?? null });
      open();
    },
    [open],
  );

  const openPeekError = useCallback(
    (reference: string, originElement?: HTMLElement | null) => {
      setPeekState({
        resource: null,
        originElement: originElement ?? null,
        error: 'Reference unresolvable',
        referenceText: reference,
      });
      open();
    },
    [open],
  );

  const closePeek = useCallback(() => { close(); }, [close]);

  const value = useMemo<PeekContextValue>(
    () => ({ peekState, opened, openPeek, openPeekError, closePeek }),
    [peekState, opened, openPeek, openPeekError, closePeek],
  );

  return <PeekContext.Provider value={value}>{children}</PeekContext.Provider>;
}
```

### ReferenceLink Cmd+Click in Resolved Path

```typescript
// Source: extension of src/components/explorer/ReferenceLink.tsx
import { usePeek } from '../../contexts/PeekContext';

// Inside the component body, after useReferenceResolver:
const { openPeek, openPeekError } = usePeek();

const handleAnchorClick = useCallback(
  (e: React.MouseEvent<HTMLAnchorElement>) => {
    if (!(e.metaKey || e.ctrlKey)) return; // plain click — let parent intercept
    e.preventDefault();
    e.stopPropagation();
    if (status === 'resolved' && resource) {
      openPeek(resource, document.activeElement as HTMLElement | null);
    } else if (status === 'failed') {
      openPeekError(rawText, document.activeElement as HTMLElement | null);
    }
    // pending: should not even reach this branch (no Anchor in pending render)
  },
  [status, resource, rawText, openPeek, openPeekError],
);

// Inside the resolved Anchor:
<Anchor size="sm" href={href} aria-label={...} onClick={handleAnchorClick}>{summary}</Anchor>

// Inside the failed Anchor:
<Anchor size="sm" href={href} aria-label={rawText} onClick={handleAnchorClick}>{rawText}</Anchor>

// Fragment-resolved path (from contained[]) — also add the same handler so contained refs peek too:
<Anchor size="sm" href={href} aria-label={...} onClick={handleAnchorClick}>{summary}</Anchor>
```

Note: `rawText` is already computed in the `ReferenceLink` body (line 97) — reuse it for the title in `openPeekError`.

### RelatedResourcesPanel Card Cmd+Click

```typescript
// Source: extension of src/components/explorer/RelatedResourcesPanel.tsx
import { usePeek } from '../../contexts/PeekContext';
import type { ResourceType } from '@medplum/fhirtypes';

// Inside RelatedResourcesPanel:
const { openPeek, openPeekError } = usePeek();

const handleCardClick = useCallback(
  async (evt: React.MouseEvent, e: ReverseReferenceEntry) => {
    if (evt.metaKey || evt.ctrlKey) {
      evt.stopPropagation();
      const c = counts[entryKey(e)];
      if (c === 'loading' || c === 0 || c === undefined) return; // nothing to peek
      try {
        const results = await client.searchResources(e.type as ResourceType, {
          [e.param]: refValue,
          _count: '1',
        });
        const first = results[0];
        if (first) {
          openPeek(first, document.activeElement as HTMLElement | null);
        } else {
          openPeekError(`${e.type}?${e.param}=${refValue}`, document.activeElement as HTMLElement | null);
        }
      } catch {
        openPeekError(`${e.type}?${e.param}=${refValue}`, document.activeElement as HTMLElement | null);
      }
      return;
    }
    navigate(onCardNavigate(e));
  },
  [counts, client, refValue, openPeek, openPeekError, navigate, onCardNavigate],
);

// Inside the Card map:
<Card
  key={entryKey(e)}
  withBorder
  padding="sm"
  style={{ cursor: 'pointer' }}
  onClick={(evt) => handleCardClick(evt, e)}
>
```

### PatientListPage J Shortcut — Page-level changes

```typescript
// Source: mirror of src/components/explorer/SearchResultsPage.tsx PEEK-01 wiring
import { usePeek } from '../../contexts/PeekContext';
import { useShortcuts } from '../../hooks/useShortcuts';

export function PatientListPage() {
  // ... existing state ...
  const { openPeek } = usePeek();
  const [focusedPatient, setFocusedPatient] = useState<Patient | null>(null);

  const handleJ = useCallback(() => {
    if (!focusedPatient) return;
    openPeek(focusedPatient as Resource, document.activeElement as HTMLElement | null);
  }, [focusedPatient, openPeek]);

  useShortcuts({ j: handleJ });

  // ... in the rendering loop ...
  {patients.map((p, idx) => (
    <PatientRow
      key={p.id}
      rowIndex={idx + 1}
      patient={p}
      client={client}
      onNavigate={(id) => navigate(`/patients/${id}`)}
      isFocused={focusedPatient?.id === p.id}
      onFocus={() => setFocusedPatient(p)}
      onBlur={(e) => {
        const next = e.relatedTarget as Node | null;
        const tbody = (e.currentTarget as HTMLElement).closest('tbody');
        if (!next || !tbody?.contains(next)) {
          setFocusedPatient(null);
        }
      }}
    />
  ))}
}
```

### PatientRow component prop changes

```typescript
function PatientRow({
  rowIndex, patient, client, onNavigate,
  isFocused = false,
  onFocus,
  onBlur,
}: {
  rowIndex: number;
  patient: Patient;
  client: MedplumClient;
  onNavigate: (id: string) => void;
  isFocused?: boolean;
  onFocus?: () => void;
  onBlur?: (e: React.FocusEvent<HTMLTableRowElement>) => void;
}) {
  const summary = usePatientResourceSummary(patient.id ?? '', client);
  return (
    <Table.Tr
      tabIndex={0}
      style={{
        cursor: 'pointer',
        outline: isFocused ? '2px solid var(--accent-ring)' : undefined,
        outlineOffset: isFocused ? '-1px' : undefined,
      }}
      onClick={() => patient.id && onNavigate(patient.id)}
      onFocus={onFocus}
      onBlur={onBlur}
    >
      {/* ... existing cells unchanged ... */}
    </Table.Tr>
  );
}
```

### JsonPeekDrawer Error Body Branching

```typescript
// Source: extension of src/components/json/JsonPeekDrawer.tsx
if (!peekState) return null;

const isError = peekState.resource === null;
const titleText = isError
  ? (peekState.referenceText ?? 'Reference')
  : `${peekState.resource.resourceType}/${peekState.resource.id}`;

// Update Enter handler to suppress when in error state
useShortcuts(
  {
    Enter: () => {
      if (isError) return; // no resource to navigate to
      const tag = document.activeElement?.tagName;
      if (tag === 'BUTTON' || tag === 'A') return;
      handleOpenFull();
    },
  },
  opened,
);

// Update handleOpenFull to early-return on error
const handleOpenFull = useCallback(() => {
  if (!peekState || !peekState.resource) return; // CHANGED: also check resource
  const { resourceType, id } = peekState.resource;
  navigate(`/explorer/${resourceType}/${id}?mode=json`);
  closePeek();
}, [peekState, navigate, closePeek]);

return (
  <Drawer
    opened={opened}
    onClose={handleClose}
    position="right"
    size={420}
    trapFocus
    withOverlay={false}
    returnFocus={false}
    padding="md"
    title={
      <Group justify="space-between" gap="sm" wrap="nowrap" w="100%">
        <Text size="sm" ff="monospace" fw={600}>{titleText}</Text>
        {!isError && (
          <Button size="xs" variant="subtle" color="indigo" onClick={handleOpenFull}>
            Open full →
          </Button>
        )}
      </Group>
    }
  >
    {isError
      ? <Text c="dimmed">Reference unresolvable</Text>
      : <JsonViewer resource={peekState.resource} />}
  </Drawer>
);
```

### Test: Cmd+click on ReferenceLink (resolved + failed)

```typescript
// Source: src/__tests__/peek-reference-link.test.tsx (NEW)
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { MantineProvider } from '@mantine/core';
import { PeekProvider } from '../contexts/PeekContext';
import { JsonPeekDrawer } from '../components/json/JsonPeekDrawer';
import { ReferenceLink } from '../components/explorer/ReferenceLink';

class MockResizeObserver { observe = () => {}; unobserve = () => {}; disconnect = () => {}; }
(globalThis as unknown as { ResizeObserver: typeof ResizeObserver }).ResizeObserver =
  MockResizeObserver as unknown as typeof ResizeObserver;
Object.defineProperty(window, 'matchMedia', {
  writable: true,
  value: () => ({ matches: false, media: '', addEventListener: () => {}, removeEventListener: () => {} }),
});

const resolvedResource = { resourceType: 'Patient', id: 'pat-x', name: [{ family: 'Doe' }] };
const mockUseRefResolver = vi.fn();

vi.mock('../hooks/useReferenceResolver', async () => {
  const actual = await vi.importActual<typeof import('../hooks/useReferenceResolver')>('../hooks/useReferenceResolver');
  return { ...actual, useReferenceResolver: (ref: string) => mockUseRefResolver(ref) };
});

vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual<typeof import('react-router-dom')>('react-router-dom');
  return { ...actual, useNavigate: () => vi.fn() };
});

vi.mock('@medplum/react-hooks', () => ({ useMedplum: () => ({}) }));

function renderHarness() {
  return render(
    <MantineProvider env="test">
      <MemoryRouter>
        <PeekProvider>
          <ReferenceLink reference="Patient/pat-x" />
          <JsonPeekDrawer />
        </PeekProvider>
      </MemoryRouter>
    </MantineProvider>,
  );
}

describe('ReferenceLink Cmd+click peek (PEEK-04)', () => {
  beforeEach(() => mockUseRefResolver.mockReset());

  it('resolved status: Cmd+click opens drawer with resolved resource', () => {
    mockUseRefResolver.mockReturnValue({ resource: resolvedResource, status: 'resolved' });
    renderHarness();
    const anchor = screen.getByRole('link');
    fireEvent.click(anchor, { metaKey: true });
    expect(screen.getByText('Patient/pat-x')).toBeTruthy();
  });

  it('failed status: Cmd+click opens drawer with "Reference unresolvable" body', () => {
    mockUseRefResolver.mockReturnValue({ resource: null, status: 'failed' });
    renderHarness();
    const anchor = screen.getByRole('link');
    fireEvent.click(anchor, { metaKey: true });
    // Title shows the raw reference
    expect(screen.getByText('Patient/pat-x')).toBeTruthy();
    // Body shows the dimmed error text
    expect(screen.getByText('Reference unresolvable')).toBeTruthy();
  });

  it('plain click (no modifier): does NOT open drawer', () => {
    mockUseRefResolver.mockReturnValue({ resource: resolvedResource, status: 'resolved' });
    renderHarness();
    const anchor = screen.getByRole('link');
    fireEvent.click(anchor); // no modifier
    // Drawer should not be visible — the inner Text element with the title
    // exists once (in the link), not twice (link + drawer title).
    expect(screen.queryAllByText('Patient/pat-x').length).toBeLessThanOrEqual(1);
  });
});
```

### Test: PatientListPage J shortcut

Mirror `peek-srp-integration.test.tsx`:
- Mock `useOutletContext` → `{ client: { get: vi.fn(async () => mockBundle), fhirUrl: ... } }`.
- Render `<PatientListPage />` inside `<PeekProvider><JsonPeekDrawer />`.
- Wait for rows.
- `fireEvent.focus(rows[1])`, `fireEvent.keyDown(document, { key: 'j' })`, expect drawer title `Patient/pat-a`.
- Negative test: focus an INPUT (e.g., the Name field), press J, expect no drawer.
- Negative test: no focused row, press J, expect no drawer.

### Test: RelatedResourcesPanel Cmd+click

Mirror `RelatedResourcesPanel.test.tsx`:
- Mock `useMedplum` with both `get` (count fetch) and `searchResources` (first-result fetch).
- `mockGet` returns `{ resourceType: 'Bundle', total: 5 }` for the count.
- `mockSearchResources` returns `[{ resourceType: 'Observation', id: 'obs-1' }]`.
- Render panel → wait for "Observation" Card → `fireEvent.click(card, { metaKey: true })` → expect drawer title `Observation/obs-1`.
- Negative test: count is 0 → no Card rendered → no Cmd+click possible (existing behavior).
- Failure test: `mockSearchResources` rejects → expect drawer with "Reference unresolvable" body.
- Plain-click regression: `fireEvent.click(card)` without modifier → `mockNavigate` called (existing assertion preserved).

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| (Phase 52) `PeekState.resource: Resource` | (Phase 53) `PeekState.resource: Resource \| null` with optional `error`/`referenceText` | This phase | Drawer can render an error body without a separate component. |
| `usePeek()` returns `{ openPeek, closePeek }` | `usePeek()` returns `{ openPeek, openPeekError, closePeek }` | This phase | Call sites can open the drawer in error state without resource resolution. |
| `ReferenceLink` Cmd+click was browser default (open in new tab) | `ReferenceLink` Cmd+click opens peek drawer | This phase | Users get a new affordance for reference inspection without leaving the page. |

**Deprecated/outdated:** Nothing in Phase 53 deprecates Phase 52 behavior. The PeekContext extension is backwards-compatible: existing `openPeek(resource)` calls continue to work; the drawer's title-derivation falls through to `resource.resourceType/id` when `resource` is non-null.

## Assumptions Log

| # | Claim | Section | Risk if Wrong |
|---|-------|---------|---------------|
| A1 | `PatientRow` is best refactored to receive `isFocused: boolean` rather than receiving the full `focusedPatient: Patient \| null` | Pattern 1 / Pitfall 9 | If the planner prefers passing the full `Patient` object, the implementation differs but the tests don't change. Discretionary per CONTEXT. |
| A2 | `searchResources` is the right one-shot first-result fetch (vs `client.search()` returning a Bundle) | Don't Hand-Roll / Pattern 3 | If the project pattern leans toward `search()` + `bundle.entry?.[0]?.resource`, the implementation is slightly more verbose. Both work. CONTEXT D-12 explicitly approves either. |
| A3 | `e.metaKey \|\| e.ctrlKey` (Mac Cmd OR Windows/Linux Ctrl) is the correct modifier check (vs `e.metaKey` alone) | Pitfall 7 / Code Examples | If we only check `metaKey`, Windows/Linux users can't trigger Cmd+click. CONTEXT D-01 says "`Cmd/Ctrl+click`" so both are required. Verified by reading CONTEXT verbatim. |
| A4 | The `title` field in `JsonPeekDrawer` for the error state should match the user-clicked reference text exactly (e.g., `"Patient/abc"`) | D-04, D-05, D-06 | If the design wants a friendlier title (e.g., "Unresolvable reference" + monospace ref below), this needs a small UI tweak. CONTEXT D-05/D-06 are explicit on monospace + raw text. |
| A5 | The test files should live in `src/__tests__/` (matching Phase 52 location), not in `src/components/.../__tests__/` | D-15 / Architecture | CONTEXT D-15 explicitly names paths in `src/__tests__/` — verified. |
| A6 | When `RelatedResourcesPanel` Cmd+click fails, the `openPeekError` reference text should be the FHIR search URL fragment (e.g., `"Observation?patient=Patient/p1"`) — not just the type name | Code Examples / D-11 | If the team prefers a shorter title like `"No matching Observation"`, this is a small wording change. CONTEXT doesn't specify the exact text — discretionary. |

## Open Questions

1. **Should the `pending` status branch in `ReferenceLink` install the `onClick` handler (and no-op) or simply omit it?**
   - What we know: D-01 says "no-op — let the anchor behave normally." The current `pending` render returns `<Text>` not `<Anchor>`, so there's no anchor to attach a handler to.
   - What's unclear: Does "no-op" mean "we DON'T add a Cmd+click handler in pending mode" (correct, current code naturally already does this) or "we DO add a handler that returns immediately"?
   - Recommendation: Don't install the handler in pending mode. The current code only renders `<Anchor>` in resolved/failed paths — adding `onClick` to those Anchors is sufficient.

2. **Should the `JsonPeekDrawer` Enter shortcut also no-op when the drawer is in error state, or simply open `/explorer/Type/id?mode=json` based on `peekState.referenceText`?**
   - What we know: D-05 says the `[Open full →]` button is hidden in error state.
   - What's unclear: Should pressing Enter while the error drawer is open silently no-op, or should it parse `referenceText` and navigate anyway (giving the user the JSON-mode URL even though the resource isn't there)?
   - Recommendation: Silent no-op in error state (consistent with hiding the button). Add `if (isError) return;` at the top of the Enter handler. Leave route navigation for the case where the user navigates manually via the URL.

3. **Should fragment-resolved references (e.g., `#contained-id` resolved from `parentResource.contained[]`) also support Cmd+click peek?**
   - What we know: ReferenceLink's fragment-resolved branch (lines 63-90) renders an `<Anchor>` to `/explorer/Type/id` for the contained resource. CONTEXT D-01 says "Anchor elements in both the `resolved` and `failed` render paths" — fragment-resolved is a third path.
   - What's unclear: Does PEEK-04 cover fragment refs? The contained resource is already in memory (no fetch needed).
   - Recommendation: Yes, add the Cmd+click handler to the fragment-resolved Anchor too. The contained resource is available synchronously — `openPeek(contained, ...)` works without any extra plumbing. Treat unmatched fragments as `failed` (they already render dimmed text — no anchor to attach to).

## Environment Availability

This phase is purely browser-side TypeScript code. No new external dependencies, no CLI tools, no databases. The existing dev environment (Node 18+ for Vite, vitest for tests) is sufficient.

| Dependency | Required By | Available | Version | Fallback |
|------------|------------|-----------|---------|----------|
| Node + Vite | Dev/build | ✓ | per repo | — |
| vitest | Test framework | ✓ | 4.1.4 | — |
| @testing-library/react | Test library | ✓ | (installed) | — |
| Blaze FHIR server | UAT only (not unit tests) | (assumed available locally) | R4 | Tests use mocks |

**Missing dependencies with no fallback:** None.
**Missing dependencies with fallback:** None.

## Validation Architecture

### Test Framework
| Property | Value |
|----------|-------|
| Framework | vitest 4.1.4 |
| Config file | `vitest.config.ts` (project root) |
| Quick run command | `npm test -- --run --no-coverage <pattern>` (e.g., `npm test -- --run peek-`) |
| Full suite command | `npm test` (vitest run) |

### Phase Requirements → Test Map
| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| PEEK-04 | Cmd+click on resolved ReferenceLink opens drawer with resource | integration | `npm test -- --run peek-reference-link` | Wave 0 (NEW) |
| PEEK-04 | Cmd+click on failed ReferenceLink opens drawer with "Reference unresolvable" body | integration | `npm test -- --run peek-reference-link` | Wave 0 (NEW) |
| PEEK-04 | Plain click on ReferenceLink does NOT open drawer (regression) | integration | `npm test -- --run peek-reference-link` | Wave 0 (NEW) |
| PEEK-04 | PeekContext openPeekError sets resource=null + referenceText | unit | `npm test -- --run peek-drawer` | Existing — extend |
| PEEK-04 | JsonPeekDrawer hides [Open full →] when resource null | unit | `npm test -- --run peek-drawer` | Existing — extend |
| PEEK-04 | JsonPeekDrawer renders "Reference unresolvable" Text when resource null | unit | `npm test -- --run peek-drawer` | Existing — extend |
| PEEK-05 surface 1 | J on focused Explorer table row opens drawer | integration | `npm test -- --run peek-srp-integration` | Existing (Phase 52) |
| PEEK-05 surface 2 | J on focused PatientListPage row opens drawer | integration | `npm test -- --run peek-patients-integration` | Wave 0 (NEW) |
| PEEK-05 surface 2 | J does NOT open drawer when an INPUT is focused (regression) | integration | `npm test -- --run peek-patients-integration` | Wave 0 (NEW) |
| PEEK-05 surface 2 | J without focused row does nothing | integration | `npm test -- --run peek-patients-integration` | Wave 0 (NEW) |
| PEEK-05 surfaces 3+4 | Cmd+click on RelatedResourcesPanel Card fetches first result + opens drawer | integration | `npm test -- --run peek-related-resources` | Wave 0 (NEW) |
| PEEK-05 surfaces 3+4 | searchResources rejection → drawer opens with "Reference unresolvable" | integration | `npm test -- --run peek-related-resources` | Wave 0 (NEW) |
| PEEK-05 surfaces 3+4 | Plain click navigation preserved (regression) | integration | `npm test -- --run peek-related-resources` | Wave 0 (NEW) |

### Sampling Rate
- **Per task commit:** `npm test -- --run peek-` (runs all peek-* test files; ~12 tests, < 5s)
- **Per wave merge:** `npm test -- --run` (full suite, ~70 test files)
- **Phase gate:** Full suite green before `/gsd-verify-work`

### Wave 0 Gaps
- [ ] `src/__tests__/peek-patients-integration.test.tsx` — covers PEEK-05 surface 2 (PatientListPage J shortcut, INPUT-focus guard regression, no-focused-row no-op)
- [ ] `src/__tests__/peek-reference-link.test.tsx` — covers PEEK-04 (resolved Cmd+click, failed Cmd+click, plain click regression)
- [ ] `src/__tests__/peek-related-resources.test.tsx` — covers PEEK-05 surfaces 3+4 (Cmd+click peek, plain-click navigation regression, fetch failure → openPeekError)
- [ ] Extend `src/__tests__/peek-drawer.test.tsx` to cover `openPeekError` flow (drawer renders with `resource=null`, error body visible, [Open full →] button hidden, Enter shortcut no-ops in error state)

No framework install or shared fixture additions needed — vitest, @testing-library/react, MantineProvider+MemoryRouter+PeekProvider harness are all in place from Phase 52.

## Security Domain

| ASVS Category | Applies | Standard Control |
|---------------|---------|-----------------|
| V2 Authentication | no | Local-only browser tool; no auth flow added in Phase 53 |
| V3 Session Management | no | No sessions; FHIR fetches inherit existing MedplumClient connection |
| V4 Access Control | no | Read-only data, single-user local tool |
| V5 Input Validation | yes | `useReferenceResolver` uses `isValidFhirReference()` (referenceUrl.ts:23) before any fetch — defense in depth retained |
| V6 Cryptography | no | No cryptographic operations in this phase |

### Known Threat Patterns

| Pattern | STRIDE | Standard Mitigation |
|---------|--------|---------------------|
| Reference string from FHIR data parsed as URL | Tampering / Spoofing | `normalizeReference()` + `isValidFhirReference()` already gate the cache lookup; Phase 53 reuses `useReferenceResolver` synchronously and never constructs URLs from raw user input |
| Cmd+click navigation hijack | Tampering | `e.preventDefault()` + `e.stopPropagation()` cancel the browser's default navigation AND the parent click handler. The peek drawer never navigates to an arbitrary URL — `[Open full →]` uses `useNavigate('/explorer/Type/id?mode=json')` constructed from the resource's typed `resourceType` and `id` fields |
| Open redirect via referenceText title | Spoofing | The error-state title is plain `<Text>` (rendered as text content) — no `href` from `referenceText` is ever constructed. Even if a malicious reference string were rendered, it would display as text only |
| Async race between Cmd+click and drawer close | Tampering | `searchResources` is awaited inside the click handler; if the user closes the drawer before the fetch resolves, `openPeek` will simply re-open it. No state corruption — `peekState` is always set atomically by the latest call |

No new attack surface introduced. The phase reuses Phase 47's reference validation and Phase 52's drawer infrastructure.

## Sources

### Primary (HIGH confidence)
- `/Users/kohlbach/Claude/Exploder/.planning/phases/53-peek-call-site-expansion/53-CONTEXT.md` — locked decisions D-01..D-15
- `/Users/kohlbach/Claude/Exploder/.planning/REQUIREMENTS.md` — PEEK-04, PEEK-05 acceptance criteria
- `/Users/kohlbach/Claude/Exploder/.planning/STATE.md` — Phase 52 deliverables, project state
- `/Users/kohlbach/Claude/Exploder/src/contexts/PeekContext.tsx` — Phase 52 PeekContext baseline (66 LOC, fully read)
- `/Users/kohlbach/Claude/Exploder/src/hooks/useShortcuts.ts` — input-focus guard, ref-stable shortcuts (35 LOC, fully read)
- `/Users/kohlbach/Claude/Exploder/src/components/json/JsonPeekDrawer.tsx` — drawer config + Enter handler (100 LOC, fully read)
- `/Users/kohlbach/Claude/Exploder/src/components/explorer/ReferenceLink.tsx` — current Anchor render paths (141 LOC, fully read)
- `/Users/kohlbach/Claude/Exploder/src/components/explorer/RelatedResourcesPanel.tsx` — Card onClick + counts state (111 LOC, fully read)
- `/Users/kohlbach/Claude/Exploder/src/components/patients/PatientListPage.tsx` — PatientRow shape, table structure (710 LOC, fully read)
- `/Users/kohlbach/Claude/Exploder/src/components/explorer/SearchResultsPage.tsx` — Phase 52 J-shortcut reference impl (524 LOC, fully read)
- `/Users/kohlbach/Claude/Exploder/src/components/explorer/IncomingReferencesPanel.tsx` — wrapper around RelatedResourcesPanel (29 LOC)
- `/Users/kohlbach/Claude/Exploder/src/components/explorer/PatientRelatedResources.tsx` — wrapper around RelatedResourcesPanel (28 LOC)
- `/Users/kohlbach/Claude/Exploder/src/hooks/useReferenceResolver.ts` — Phase 47 cache + status (112 LOC)
- `/Users/kohlbach/Claude/Exploder/src/utils/referenceUrl.ts` — `normalizeReference`, `isValidFhirReference` (65 LOC)
- `/Users/kohlbach/Claude/Exploder/src/components/layout/AppLayout.tsx` — confirms PeekProvider mount site (56 LOC)
- `/Users/kohlbach/Claude/Exploder/src/__tests__/peek-srp-integration.test.tsx` — Phase 52 integration test pattern (188 LOC)
- `/Users/kohlbach/Claude/Exploder/src/__tests__/peek-drawer.test.tsx` — Phase 52 drawer unit tests (255 LOC)
- `/Users/kohlbach/Claude/Exploder/src/components/explorer/__tests__/RelatedResourcesPanel.test.tsx` — existing mock pattern (268 LOC)
- `/Users/kohlbach/Claude/Exploder/src/components/explorer/__tests__/ReferenceLink.test.tsx` — existing mock pattern for useReferenceResolver
- `/Users/kohlbach/Claude/Exploder/node_modules/@medplum/core/dist/cjs/index.d.ts:3940` — `searchResources` signature
- `/Users/kohlbach/Claude/Exploder/CLAUDE.md` — stack constraints, "do not use" list, GSD workflow rules
- `/Users/kohlbach/Claude/Exploder/.planning/config.json` — workflow.nyquist_validation enabled
- `/Users/kohlbach/Claude/Exploder/.planning/phases/52-json-peek-drawer-foundation/52-RESEARCH.md` — Phase 52 patterns and pitfalls inherited

### Secondary (MEDIUM confidence)
- React 18 synthetic event semantics (preventDefault/stopPropagation) — well-documented in React docs; not re-verified in this session
- jsdom + @testing-library `fireEvent.click(el, { metaKey: true })` modifier-key simulation — observed pattern in existing project tests (peek-drawer.test.tsx fires keyDown with key) and standard testing-library API

### Tertiary (LOW confidence)
- None. All claims in this research were verified against the codebase or CONTEXT.md.

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH — every package version verified in package.json; no new packages
- Architecture: HIGH — every pattern has a Phase 52 precedent in SearchResultsPage / JsonPeekDrawer
- Pitfalls: HIGH — derived from reading actual code paths (event bubbling, useReferenceResolver pending state, MedplumClient type signature)

**Research date:** 2026-05-04
**Valid until:** 2026-06-03 (~30 days; stable codebase, no upstream library changes expected before phase execution)
