---
phase: 56
status: context_complete
mode: auto
created: 2026-05-04
---

# Phase 56: Sidebar v2 + Expert Toggle + ⌘K — CONTEXT

## Phase Goal

App-level navigation polish: a ⌘K command palette for jumping to any resource type, an Expert Toggle that surfaces technical details for power users, and sidebar improvements that bring the nav surface up to v2 quality.

Requirements: SIDE-01, SIDE-02, SIDE-03, SIDE-04

---

## Codebase Scouting Findings

### Key files
- `src/components/layout/AppLayout.tsx` — shell component; `SpotlightProvider` mounts here
- `src/components/layout/Sidebar.tsx` — Expert Toggle + sidebar v2 changes land here
- `src/hooks/useShortcuts.ts` — already notes Phase 56 (⌘K) as an extender; Spotlight owns its own hotkey so `useShortcuts` need not change
- `src/contexts/ConnectionContext.tsx` — provides `CapabilityStatement` + `MedplumClient` via `useConnectionContext()`
- `src/components/explorer/ResourceTypeRail.tsx` — uses `parseResourceTypes(capability)` + `useResourceCounts()`; Spotlight borrows same data
- `src/utils/fhir-categories.ts` — `groupByCategory()` + `CATEGORY_ORDER`; re-usable for Spotlight action grouping
- `src/fhir/capability.ts` — `parseResourceTypes(capability)` → `Array<{ type: string; ... }>`
- `src/components/explorer/SearchResultsPage.tsx` — Expert Toggle affects ID truncation here
- `@mantine/spotlight@8.3.18` — already installed; has `openSpotlight()` + `SpotlightProvider`
- `@mantine/hooks` — `useLocalStorage` (same pattern as Phase 55 density persistence)

### Current state
1. **⌘K kbd hint exists** in `PatientListPage.tsx` line 586 (`rightSection={<Kbd size="xs">⌘K</Kbd>}`) — purely visual; no actual Spotlight mounted anywhere
2. **Expert Toggle absent** — no expert mode context, no toggle in Sidebar
3. **Sidebar is v1** — 5 nav items + Server card + Settings footer; no Expert Toggle row
4. **`useShortcuts`** already guards INPUT/TEXTAREA/SELECT; explicitly notes Phase 56 as a ⌘K extender (comment line 10) — but Spotlight's built-in `shortcut` prop replaces the need to modify `useShortcuts`
5. **`ConnectionContext`** exposes `state.capability` + `state.client`; `useConnectionContext()` available anywhere; this is the source for resource type list

---

## Decisions

### D-01: SIDE-01 — ⌘K Spotlight: trigger mechanism

**Decision:** Use `@mantine/spotlight`'s built-in `shortcut` prop set to `'mod+K'` (⌘K on Mac, Ctrl+K on Linux/Windows). Do NOT modify `useShortcuts` — Spotlight manages its own global listener internally.

**Why:** Cleanest path. No new listener code; Mantine Spotlight handles registration, teardown, and focus guards automatically. `useShortcuts` comment on line 10 says Phase 56 "extends it" — but the actual implementation uses Spotlight's own shortcut mechanism, which is more appropriate for a modal trigger than a single-key handler.

### D-02: SIDE-01 — ⌘K Spotlight: mounting location

**Decision:** Mount `<SpotlightProvider>` in `AppLayout.tsx`, wrapping both `AppShell.Navbar` and `AppShell.Main`. This makes `openSpotlight()` accessible from any child component.

```tsx
// AppLayout.tsx
import { SpotlightProvider } from '@mantine/spotlight';

export function AppLayout(...) {
  return (
    <SpotlightProvider
      shortcut="mod+K"
      actions={spotlightActions}   // see D-04
      searchPlaceholder="Go to resource type…"
      nothingFound="No matching resource types"
    >
      <AppShell ...>
        <AppShell.Navbar ...><Sidebar .../></AppShell.Navbar>
        <AppShell.Main>
          <PeekProvider>
            <Suspense ...><Outlet /></Suspense>
            <JsonPeekDrawer />
          </PeekProvider>
        </AppShell.Main>
      </AppShell>
    </SpotlightProvider>
  );
}
```

Import `@mantine/spotlight/styles.css` in `src/styles/global.css` or `main.tsx` (same pattern as `@mantine/notifications/styles.css`).

### D-03: SIDE-01 — ⌘K Spotlight: action types

**Decision:** Resource-type navigation only (MVP scope). Each action navigates to `/explorer/:type`.

Action shape:
```tsx
{ id: type, label: type, description: `View ${type} resources`, group: categoryLabel }
```

- **Groups:** use `CATEGORY_ORDER` from `fhir-categories.ts` — same grouping as `ResourceTypeRail`
- **Lazy population (locked):** Actions state is `[]` until `query.length >= 2` — filters resource types client-side on each keystroke. The raw `resourceTypes` array is loaded from `ConnectionContext.capability` at mount.

```tsx
function useSpotlightActions(query: string): SpotlightAction[] {
  const { state } = useConnectionContext();
  const types = useMemo(
    () => state.status === 'connected' ? parseResourceTypes(state.capability) : [],
    [state]
  );
  return useMemo(() => {
    if (query.length < 2) return [];
    const q = query.toLowerCase();
    return types
      .filter(({ type }) => type.toLowerCase().includes(q))
      .map(({ type }) => ({
        id: type,
        label: type,
        group: getCategoryLabel(type),   // util from fhir-categories.ts
        onTrigger: () => navigate(`/explorer/${type}`),
      }));
  }, [query, types]);
}
```

`navigate` comes from `useNavigate()` — the action callback closes the palette and navigates.

### D-04: SIDE-02 — Expert Toggle: state and context

**Decision:** `useLocalStorage` from `@mantine/hooks` in a new `ExpertModeContext`.

```tsx
// src/contexts/ExpertModeContext.tsx
import { createContext, useContext } from 'react';
import { useLocalStorage } from '@mantine/hooks';

const ExpertModeContext = createContext<{ isExpert: boolean; toggle: () => void } | null>(null);

export function ExpertModeProvider({ children }: { children: React.ReactNode }) {
  const [isExpert, setIsExpert] = useLocalStorage<boolean>({
    key: 'app.expertMode.v1',
    defaultValue: false,
    getInitialValueInEffect: false,
  });
  return (
    <ExpertModeContext.Provider value={{ isExpert, toggle: () => setIsExpert(!isExpert) }}>
      {children}
    </ExpertModeContext.Provider>
  );
}

export function useExpertMode() {
  const ctx = useContext(ExpertModeContext);
  if (!ctx) throw new Error('useExpertMode must be used within ExpertModeProvider');
  return ctx;
}
```

`ExpertModeProvider` wraps `AppLayout` (added in `App.tsx` or inside `AppLayout`).

### D-05: SIDE-02 — Expert Toggle: placement in Sidebar

**Decision:** Compact `Switch` row in the sidebar footer, between Settings row and the bottom edge. Single row, no icon, minimal footprint.

```tsx
// Inside Sidebar — after Settings AppShell.Section
<AppShell.Section p="sm">
  <Group justify="space-between" align="center">
    <Text size="xs" c="dimmed">Expert mode</Text>
    <Switch
      size="xs"
      checked={isExpert}
      onChange={toggle}
      aria-label="Expert mode toggle"
    />
  </Group>
</AppShell.Section>
```

### D-06: SIDE-03 — Expert Toggle: UI effects

**Decision:** Two concrete effects, scoped to places the user directly sees:

1. **Explorer ID cells:** When `isExpert`, the `<Text>` in the ID `Table.Td` drops `truncate="end"` and `maxWidth` cap — full UUID visible.
2. **Sidebar Server card:** When `isExpert`, an `<Text size="xs" c="dimmed" ff="monospace">` line appears below the FHIR status row showing the server base URL (from `ConnectionContext`).

These are additive: non-expert mode is unchanged; expert mode surfaces raw technical data that most users don't need but power users want.

### D-07: SIDE-04 — Sidebar v2 polish

**Decision:** Two sidebar improvements beyond Expert Toggle:

1. **⌘K kbd hint in sidebar:** Add a small `<Kbd size="xs">⌘K</Kbd>` hint to the nav header or a subtle "Search" item above the nav, so users discover the palette from the sidebar.

   ```tsx
   // Below "FHIR Exploder" title, above Server card
   <UnstyledButton onClick={() => openSpotlight()} style={{ width: '100%' }}>
     <Group justify="space-between" p="xs" style={{ border: '1px solid var(--mantine-color-gray-3)', borderRadius: 4 }}>
       <Text size="xs" c="dimmed">Go to resource type…</Text>
       <Kbd size="xs">⌘K</Kbd>
     </Group>
   </UnstyledButton>
   ```

2. **Explorer nav count badge:** When resource type counts are loaded, show a faint `<Badge variant="light" size="xs">` next to the "Explorer" nav item in the sidebar showing total resource types with data. Sourced from the same `useResourceCounts` hook used by `ResourceTypeRail`.

### D-08: Wave structure

**Wave 1: SIDE-01 (⌘K Spotlight)**
- Creates: `src/contexts/ExpertModeContext.tsx` (stub, used in Wave 2)
- Modifies: `AppLayout.tsx` (SpotlightProvider + ExpertModeProvider mount)
- Creates: `src/__tests__/spotlight-cmd-k.test.tsx` (5 tests)

**Wave 2: SIDE-02 / SIDE-03 / SIDE-04 (Expert Toggle + Sidebar v2 polish)**
- Modifies: `src/components/layout/Sidebar.tsx` (Expert Toggle row + ⌘K hint + Explorer count badge)
- Modifies: `src/components/explorer/SearchResultsPage.tsx` (ID cell truncation driven by `useExpertMode()`)
- Creates: `src/__tests__/expert-toggle.test.tsx` (5 tests)

Waves are sequential: Wave 2 consumes `ExpertModeContext` created in Wave 1.

### D-09: Tests

**`src/__tests__/spotlight-cmd-k.test.tsx`** (SIDE-01):
- SpotlightProvider renders without crash
- No actions returned when query < 2 chars
- Actions filtered by query ≥ 2 chars match resource type names
- Clicking action navigates to `/explorer/:type`
- Spotlight shortcut label is `mod+K`

**`src/__tests__/expert-toggle.test.tsx`** (SIDE-02/03/04):
- Expert mode defaults to `false`
- Toggle flips state via Switch
- When expert off: ID cell has `truncate="end"` (or maxWidth cap)
- When expert on: ID cell shows full ID (no truncation)
- Server URL row appears in Sidebar when expert on, absent when off

---

## Deferred

- **Spotlight: recently visited resources** — requires persisting navigation history; out of Phase 56
- **Spotlight: global search across all resource types** — server-side search; separate phase
- **Expert Toggle: JSON field name overlay** — toggle raw FHIR field names vs human labels in HumanReadableView; out of scope
- **Sidebar collapsible/icon-only mode** — responsive collapse; deferred
- **Arrow-key navigation within Spotlight** — Mantine Spotlight handles this natively

---

*Phase: 56-sidebar-v2-expert-toggle-cmd-k*
*Context gathered: 2026-05-04*
