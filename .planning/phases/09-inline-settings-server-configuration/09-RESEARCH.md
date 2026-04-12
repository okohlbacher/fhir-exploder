# Phase 9: Inline Settings & Server Configuration - Research

**Researched:** 2026-04-12
**Domain:** React context patterns, Mantine Modal forms, FHIR client reconnection
**Confidence:** HIGH

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions
- **Edit trigger:** Clicking the FHIR server status line or Terminology status line in the sidebar opens a Mantine Modal with an edit form.
- **Settings scope:** Sidebar modals edit FHIR server (URL + auth mode + credentials) and terminology server (URL) only. Validation URL stays on the full Settings page.
- **Persistence model:** Settings changes live in React state only — session-scoped. `settings.yaml` remains the source of truth on restart. No file writes from the browser.
- **Reconnection flow:** After saving new settings in the modal, automatically reconnect the FHIR client and re-probe the terminology server. Sidebar status dots update immediately without page reload.

### Claude's Discretion
- None listed.

### Deferred Ideas (OUT OF SCOPE)
- None listed.
</user_constraints>

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|------------------|
| CONF-01 | User can edit the FHIR server URL and auth mode by clicking the FHIR server status in the sidebar | SettingsProvider + sidebar click handler + FhirSettingsModal |
| CONF-02 | User can edit the terminology server URL by clicking the terminology status in the sidebar | SettingsProvider + sidebar click handler + TerminologySettingsModal |
| CONF-03 | Settings changes take effect immediately without requiring a file edit or app restart | ConnectionContext.connect(newSettings) + TerminologyProvider memo key rebuild |
</phase_requirements>

---

## Summary

Phase 9 threads through three layers of the app: a new writable settings context (`SettingsProvider`) that replaces the current read-only `useSettings` hook, two Mantine Modal forms mounted in the `Sidebar`, and the orchestration between `ConnectionContext.connect()` and `TerminologyProvider`'s memoized rebuild. All three pieces already have strong foundations in the codebase — this phase wires them together rather than building from scratch.

The settings lift is a one-file change: convert `useSettings` from a local `useState` + `useEffect` pair into a `createContext` + provider that exposes both `settings` and a `setSettings` callback. `App.tsx` gains one extra wrapper (`SettingsProvider`), and `AppRoutes` switches from `useSettings()` to `useSettingsContext()`. Everything downstream keeps reading `settings` with the same type — `AppSettings | null` — so no consumer signatures change.

Reconnection already works: `ConnectionContext.connect(settings)` accepts a full `AppSettings` and replaces the live client in a single call — `disconnect()` is not needed first because `connect` already sets state to `connecting` before the async probe. The `TerminologyProvider` also already self-rebuilds: its `useMemo` key is `JSON.stringify(settings?.terminology)`, so when `setSettings` pushes a new settings object with a changed terminology URL the provider automatically tears down the old resolver and builds a fresh one.

**Primary recommendation:** Create `SettingsContext` (new file, minimal boilerplate), update `App.tsx` to wrap with it, add click handlers plus modal components to `Sidebar.tsx`, and let the existing `ConnectionContext` and `TerminologyContext` auto-react — no changes to either context's internal implementation are required.

---

## Standard Stack

### Core (already installed — no new packages needed)

| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| `@mantine/core` | ^8.3.18 | `Modal`, `TextInput`, `Select`, `PasswordInput`, `Button`, `Stack`, `Group` | Required peer dep of `@medplum/react`; already in use throughout |
| `@mantine/hooks` | ^8.3.18 | `useDisclosure()` for modal open/close state | Cleaner than raw `useState(false)` — idiomatic Mantine pattern |
| React `createContext` | 18.x | `SettingsContext` state + `setSettings` callback | Built-in; same pattern as `ConnectionContext` and `TerminologyContext` |
| `@tabler/icons-react` | already installed | `IconEdit` / `IconPencil` on clickable status rows | Already used throughout sidebar |

**Installation:** No new packages required. [VERIFIED: package.json inspection]

### Supporting (already installed)
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| `@mantine/notifications` | ^8.3.18 | Show error toast if FHIR reconnect fails | Consistent with existing cache-clear feedback pattern in `SettingsPage` |

---

## Architecture Patterns

### Recommended Project Structure (new files only)
```
src/
├── contexts/
│   ├── ConnectionContext.tsx       # unchanged
│   ├── TerminologyContext.tsx      # unchanged
│   └── SettingsContext.tsx         # NEW — writable settings provider
├── components/
│   └── settings/
│       ├── FhirSettingsModal.tsx   # NEW — FHIR URL + auth form
│       └── TerminologySettingsModal.tsx  # NEW — terminology URL form
│   └── layout/
│       └── Sidebar.tsx             # MODIFIED — click handlers + modal mounts
└── hooks/
    └── useSettings.ts              # MODIFIED — re-export from SettingsContext
```

---

### Pattern 1: SettingsContext (Writable Settings Provider)

**What:** Converts the read-only `useSettings` hook into a context provider that holds mutable settings state. `SettingsProvider` calls `loadSettings()` once on mount (same as current hook), then exposes `settings`, `usingDefaults`, `loading`, and `setSettings` to all descendants.

**When to use:** Whenever a component needs to change settings at runtime. Consumers that only read settings continue to call `useSettings()` (which will just re-export from context).

**Pattern:**
```typescript
// src/contexts/SettingsContext.tsx
// Source: [VERIFIED: mirrors ConnectionContext.tsx structure in this codebase]
import { createContext, useContext, useState, useEffect, useMemo, type ReactNode } from 'react';
import type { AppSettings } from '../config/types';
import { loadSettings } from '../config/settings';

type SettingsContextValue = {
  settings: AppSettings | null;
  usingDefaults: boolean;
  loading: boolean;
  setSettings: (next: AppSettings) => void;
};

const SettingsContext = createContext<SettingsContextValue | null>(null);

export function SettingsProvider({ children }: { children: ReactNode }) {
  const [settings, setSettings] = useState<AppSettings | null>(null);
  const [usingDefaults, setUsingDefaults] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadSettings().then(({ settings: s, usingDefaults: d }) => {
      setSettings(s);
      setUsingDefaults(d);
      setLoading(false);
    });
  }, []);

  const value = useMemo(
    () => ({ settings, usingDefaults, loading, setSettings }),
    [settings, usingDefaults, loading],
  );

  return <SettingsContext.Provider value={value}>{children}</SettingsContext.Provider>;
}

export function useSettingsContext(): SettingsContextValue {
  const ctx = useContext(SettingsContext);
  if (!ctx) throw new Error('useSettingsContext must be used within a SettingsProvider');
  return ctx;
}
```

**Migration for `useSettings.ts`:** Replace the current hook body with a thin delegate:
```typescript
// src/hooks/useSettings.ts — after migration
import { useSettingsContext } from '../contexts/SettingsContext';

export function useSettings() {
  return useSettingsContext();
}
```
This keeps all existing call sites unchanged — `FeedbackButton`, `SettingsPage`, `AppRoutes` all call `useSettings()` today and will continue to work. [VERIFIED: grepped all `useSettings` call sites]

---

### Pattern 2: App.tsx Provider Nesting

**What:** Wrap the existing `ConnectionProvider` with the new `SettingsProvider` so settings are available to everything. Move `useSettings` call from `AppRoutes` inner component to the provider level (it's already at the right scope).

**Critical:** `SettingsProvider` must sit **outside** `ConnectionProvider` in the tree so that `ConnectionProvider` can read settings from context when needed — but `ConnectionContext` currently doesn't consume settings from context; it receives them as a function argument on `connect(settings)`. So nesting order doesn't matter for functionality. The canonical clean order is:

```typescript
// src/App.tsx — updated wrapping
export function App() {
  return (
    <SettingsProvider>
      <ConnectionProvider>
        <AppRoutes />
      </ConnectionProvider>
    </SettingsProvider>
  );
}
```

`AppRoutes` then calls `useSettings()` (which now reads from context) instead of the standalone hook. `TerminologyProvider` already sits inside `AppRoutes` and receives `settings` as a prop — that prop now comes from context rather than local hook state. [VERIFIED: App.tsx read]

---

### Pattern 3: Sidebar Modal Integration

**What:** Two modals mounted directly in `Sidebar.tsx` (co-located with their triggers), each opened by clicking a status row. The status row `Group` becomes a clickable element.

**Mantine `useDisclosure` pattern** (idiomatic — from `@mantine/hooks`):
```typescript
// Source: [CITED: https://mantine.dev/hooks/use-disclosure/]
import { useDisclosure } from '@mantine/hooks';

const [fhirModalOpened, { open: openFhirModal, close: closeFhirModal }] = useDisclosure(false);
const [termModalOpened, { open: openTermModal, close: closeTermModal }] = useDisclosure(false);
```

**Clickable status row** — wrap the existing `Group` in an `UnstyledButton` or add `onClick` + cursor styling:
```typescript
// Existing Group becomes clickable:
<UnstyledButton onClick={openFhirModal} style={{ cursor: 'pointer', width: '100%' }}>
  <Group gap="xs">
    <Box style={{ /* dot styles */ }} />
    <Text size="xs" c="dimmed">{status.label}</Text>
    <IconPencil size={12} opacity={0.4} />
  </Group>
</UnstyledButton>
```

The edit icon (`IconPencil` size 12, low opacity) signals editability without cluttering the sidebar.

**Sidebar needs `setSettings` and `connect`** — pass via props or read from context. Since `Sidebar` currently only receives `connectionStatus` as a prop, the cleanest option is to read both `useSettingsContext()` and `useConnectionContext()` directly inside `Sidebar` (both contexts are available anywhere in the tree). This removes prop-drilling through `AppLayout`. [VERIFIED: Sidebar.tsx and AppLayout.tsx read]

---

### Pattern 4: FHIR Settings Modal Form

**What:** A Mantine Modal with `TextInput` for URL, `Select` for auth mode, and conditional `TextInput`/`PasswordInput` fields for basic or bearer credentials.

**Form state:** Local `useState` inside the modal component, initialized from current settings on open. Does not use `@mantine/form` (overkill for 3-5 fields). [ASSUMED: no `@mantine/form` used elsewhere in codebase — consistent with SettingsPage read-only display approach]

**Auth mode conditional fields:**
```typescript
// Source: [VERIFIED: AppSettings interface in src/config/types.ts]
type AuthMode = 'open' | 'basic' | 'bearer';

// Rendered conditionally on authMode local state:
{authMode === 'basic' && (
  <>
    <TextInput label="Username" value={username} onChange={...} />
    <PasswordInput label="Password" value={password} onChange={...} />
  </>
)}
{authMode === 'bearer' && (
  <PasswordInput label="Bearer Token" value={token} onChange={...} />
)}
```

**Save handler sequence:**
1. Call `setSettings({ ...currentSettings, fhir: { serverUrl, auth: { mode, username, password, token } } })`
2. Call `connection.connect(newSettings)` — this sets status to `connecting`, probes `/metadata`, updates to `connected` or `error`
3. Close modal
4. If connect fails, `ConnectionContext` sets `state.status = 'error'` — sidebar dot turns red immediately. Show a notification via `notifications.show()` for the error detail.

**The `disconnect()` question:** `ConnectionContext.connect()` already transitions through `connecting` state before completing — calling `disconnect()` first is redundant and causes an extra render cycle (idle → connecting vs. just connecting). Skip `disconnect()`. [VERIFIED: ConnectionContext.tsx implementation]

---

### Pattern 5: Terminology Settings Modal Form

**What:** Simpler modal — one `TextInput` for the terminology server URL.

**Save handler sequence:**
1. Call `setSettings({ ...currentSettings, terminology: { serverUrl: newUrl } })`
2. `TerminologyProvider` auto-rebuilds because its `useMemo` key is `JSON.stringify(settings?.terminology)` — the changed settings prop triggers a re-render with new key → new resolver
3. `useTerminologyHealth` re-probes on resolver identity change (its `useEffect` dep is `[resolver]`)
4. Close modal

**No explicit reconnect call needed for terminology.** The provider's memo key mechanism handles it automatically. [VERIFIED: TerminologyContext.tsx useMemo implementation]

---

### Pattern 6: Settings Reset / Stale State Guard

When the modal opens, it should initialize its local form state from the *current* settings, not the settings at mount time. Use the modal's `onOpen` / `opened` prop change or initialize in the `open` callback:

```typescript
const handleOpenFhirModal = () => {
  // Initialize form from current live settings
  setFormUrl(settings?.fhir.serverUrl ?? '');
  setFormAuthMode(settings?.fhir.auth.mode ?? 'open');
  setFormUsername(settings?.fhir.auth.username ?? '');
  setFormPassword(settings?.fhir.auth.password ?? '');
  setFormToken(settings?.fhir.auth.token ?? '');
  openFhirModal();
};
```

This is simpler than Mantine's `Modal` `onOpen` callback — just initialize state in the click handler before calling `open()`. [VERIFIED: FeedbackButton.tsx uses same pattern — state reset before `setOpened(true)`]

---

### Anti-Patterns to Avoid

- **Don't pass `setSettings` as a prop chain through `AppLayout` → `Sidebar`.** Both contexts are available anywhere; read directly with `useSettingsContext()` and `useConnectionContext()` in `Sidebar.tsx`. Adding props to `AppLayout` for something already in context is unnecessary coupling.
- **Don't call `disconnect()` before `connect()`.** `ConnectionContext.connect()` sets `status: 'connecting'` as its first action — the UI shows the transition state correctly without a preceding disconnect.
- **Don't use `@mantine/form` for 3-5 fields.** Plain `useState` is sufficient and avoids the form library's validation schema overhead. Keep it consistent with how `SettingsPage` is built (display-only currently, but the pattern is plain JSX + state).
- **Don't persist to `settings.yaml`.** The browser has no filesystem access. The persistence decision is locked as in-memory only. The `loadSettings()` function is for initial load only.
- **Don't validate URL format strictly in the modal.** The connect attempt itself is the validation — if the URL is wrong, the error state surfaces in the sidebar dot. A malformed URL will fail at `fetch()` and be caught by `classifyError`. Adding a regex validator creates false positives for valid-but-unusual URLs.

---

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Modal open/close state | `useState(false)` + manual toggle | `useDisclosure()` from `@mantine/hooks` | Returns named `open`/`close`/`toggle` — cleaner than boolean setter |
| Password field masking | Custom input with show/hide toggle | `PasswordInput` from `@mantine/core` | Built-in show/hide toggle, accessibility, correct autocomplete attrs |
| Auth mode dropdown | Custom `<select>` | `Select` from `@mantine/core` | Consistent Mantine styling, accessible, works with Mantine theme |
| Form field labels + layout | Custom CSS | `Stack`, `TextInput label` prop | Already the pattern throughout the app |
| Reconnect after settings change | Custom reconnect hook | `connection.connect(newSettings)` | Already implemented in `ConnectionContext` — one call does it all |

---

## Common Pitfalls

### Pitfall 1: Stale Closure on Modal Form Init
**What goes wrong:** Modal form state captures settings at the time the component first renders, not when the modal opens. If the user opens the modal, closes without saving, changes settings via `settings.yaml` + reload, then opens again — they see the old values.
**Why it happens:** `useState` initializer runs once. If state is initialized as `useState(settings?.fhir.serverUrl ?? '')` at component mount, it never updates.
**How to avoid:** Initialize form state in the click handler that calls `open()` (see Pattern 6), not in `useState(initialValue)`.
**Warning signs:** Stale URL showing in the modal after a prior session.

### Pitfall 2: TerminologyProvider Rebuild Drops In-Flight Lookups
**What goes wrong:** When the user saves a new terminology URL, the resolver is replaced. Any pending `resolveCoding` promises from the old resolver are abandoned — components waiting on them will never receive results.
**Why it happens:** The old `TerminologyResolver` instance is garbage-collected; its internal promises have no way to complete.
**How to avoid:** This is acceptable behavior — stale lookups from the old server are irrelevant after the URL changes. The `TerminologyResolver` already has a `negativeTtlMs` so failed lookups are retried. No special cleanup needed.
**Warning signs:** None visible to users — React re-renders will trigger fresh lookups against the new resolver.

### Pitfall 3: Settings Context Not Above MedplumProvider
**What goes wrong:** `FeedbackButton` calls `useSettings()` which currently uses the standalone hook. After migration, it will read from `SettingsContext`. If `SettingsProvider` is nested inside some intermediate component that's unmounted on route change, context is lost.
**Why it happens:** Context consumers throw if rendered outside a provider.
**How to avoid:** Place `SettingsProvider` at the `App()` level — the outermost component — so it never unmounts. [VERIFIED: App.tsx structure]

### Pitfall 4: ConnectionContext.connect() is async — don't await in modal save handler without error handling
**What goes wrong:** If `connect()` rejects (network error), the modal closes but no feedback is shown.
**Why it happens:** `connection.connect()` is `async` — it sets `status: 'error'` internally but doesn't throw. The sidebar dot goes red but the user gets no explanation.
**How to avoid:** After calling `connect()`, the sidebar dot update is automatic. Optionally add a `notifications.show()` call in an `onError` state handler, but the sidebar dot alone may be sufficient — consistent with existing connection behavior on initial load.

### Pitfall 5: `@mantine/hooks` `useDisclosure` not yet used in codebase — FeedbackButton uses `useState`
**What goes wrong:** Developer assumes `useDisclosure` is imported and available as a hook without checking.
**Why it happens:** `@mantine/hooks` is installed (required peer dep) but not yet consumed — `FeedbackButton` uses `useState(false)` instead.
**How to avoid:** This is fine — `useDisclosure` is available, just not yet used. Import it directly: `import { useDisclosure } from '@mantine/hooks'`. [VERIFIED: package.json has `@mantine/hooks`, no existing useDisclosure imports]

---

## Code Examples

### SettingsContext minimal boilerplate
```typescript
// src/contexts/SettingsContext.tsx
// Source: [VERIFIED: mirrors ConnectionContext.tsx in this codebase]
import { createContext, useContext, useState, useEffect, useMemo, type ReactNode } from 'react';
import type { AppSettings } from '../config/types';
import { loadSettings } from '../config/settings';

type SettingsContextValue = {
  settings: AppSettings | null;
  usingDefaults: boolean;
  loading: boolean;
  setSettings: (next: AppSettings) => void;
};

const SettingsContext = createContext<SettingsContextValue | null>(null);

export function SettingsProvider({ children }: { children: ReactNode }) {
  const [settings, setSettingsState] = useState<AppSettings | null>(null);
  const [usingDefaults, setUsingDefaults] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadSettings().then(({ settings: s, usingDefaults: d }) => {
      setSettingsState(s);
      setUsingDefaults(d);
      setLoading(false);
    });
  }, []);

  const value = useMemo(
    () => ({ settings, usingDefaults, loading, setSettings: setSettingsState }),
    [settings, usingDefaults, loading],
  );

  return <SettingsContext.Provider value={value}>{children}</SettingsContext.Provider>;
}

export function useSettingsContext() {
  const ctx = useContext(SettingsContext);
  if (!ctx) throw new Error('useSettingsContext must be used within SettingsProvider');
  return ctx;
}
```

### FHIR modal save handler
```typescript
// Source: [VERIFIED: ConnectionContext.connect() API from ConnectionContext.tsx]
const handleFhirSave = () => {
  const newSettings: AppSettings = {
    ...settings!,
    fhir: {
      serverUrl: formUrl.trim(),
      auth: {
        mode: formAuthMode,
        ...(formAuthMode === 'basic' ? { username: formUsername, password: formPassword } : {}),
        ...(formAuthMode === 'bearer' ? { token: formToken } : {}),
      },
    },
  };
  setSettings(newSettings);           // update context — TerminologyProvider re-renders with new prop
  connection.connect(newSettings);    // async — sets status to 'connecting', then 'connected'/'error'
  closeFhirModal();
};
```

### Terminology modal save handler
```typescript
// Source: [VERIFIED: TerminologyContext.tsx memo key mechanism]
const handleTermSave = () => {
  const newSettings: AppSettings = {
    ...settings!,
    terminology: { serverUrl: termUrl.trim() },
  };
  setSettings(newSettings);   // TerminologyProvider rebuilds automatically via JSON.stringify memo key
  closeTermModal();
};
// No explicit reconnect needed — TerminologyProvider's useMemo([terminologyKey]) handles it.
```

### Sidebar click handler integration (sketch)
```typescript
// src/components/layout/Sidebar.tsx (additions)
import { useDisclosure } from '@mantine/hooks';
import { useSettingsContext } from '../../contexts/SettingsContext';
import { useConnectionContext } from '../../contexts/ConnectionContext';
import { UnstyledButton } from '@mantine/core';

// Inside Sidebar():
const { settings, setSettings } = useSettingsContext();
const connection = useConnectionContext();
const [fhirOpened, { open: openFhir, close: closeFhir }] = useDisclosure(false);
const [termOpened, { open: openTerm, close: closeTerm }] = useDisclosure(false);
```

---

## State of the Art

| Old Approach | Current Approach | Impact |
|--------------|-----------------|--------|
| `useSettings()` as standalone hook (read-only) | `SettingsProvider` context with `setSettings` | Enables any component to mutate settings without prop drilling |
| `settings.yaml` edit + restart to change server | Inline modal editing | Settings changes apply in < 1 second |

---

## Open Questions

1. **Should the `Sidebar` receive `connectionStatus` as a prop or read from `ConnectionContext` directly?**
   - What we know: Currently it receives `connectionStatus: ConnectionStatus` from `AppLayout` as a prop. The sidebar will now also need `connection.connect()` via `useConnectionContext()`.
   - What's unclear: Whether to keep the prop (consistent with current) or remove it (read everything from context in Sidebar).
   - Recommendation: Remove the `connectionStatus` prop from `Sidebar` and read `connection.state.status` directly from `useConnectionContext()` inside `Sidebar`. This is consistent with reading `useSettingsContext()` there too, and removes the awkward split of "some connection data via prop, some via context".

2. **Should `usingDefaults` flag be reset when user overrides settings in modal?**
   - What we know: `usingDefaults` means "settings.yaml was missing/invalid, fell back to DEFAULTS". Once user edits in modal, their values may differ from both DEFAULTS and yaml.
   - What's unclear: Whether the banner on SettingsPage/DashboardPage should still show after a modal override.
   - Recommendation: When `setSettings()` is called from a modal, also set `usingDefaults = false` (since the user has intentionally configured the server). Simplest: expose a `setSettings(next, { usingDefaults?: boolean })` overload, or just always pass `false` from the modal save handler.

---

## Environment Availability

Step 2.6: SKIPPED (no external tool dependencies — purely code/config changes within the existing React + Vite stack)

---

## Validation Architecture

### Test Framework
| Property | Value |
|----------|-------|
| Framework | Vitest + @testing-library/react |
| Config file | `vitest.config.ts` |
| Quick run command | `npx vitest run src/__tests__/settings-modal.test.tsx` |
| Full suite command | `npx vitest run` |

### Phase Requirements → Test Map
| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| CONF-01 | Clicking FHIR status row opens modal with pre-filled URL and auth mode | unit | `npx vitest run src/__tests__/settings-modal.test.tsx` | ❌ Wave 0 |
| CONF-01 | Saving new FHIR URL calls `connection.connect()` with updated settings | unit | `npx vitest run src/__tests__/settings-modal.test.tsx` | ❌ Wave 0 |
| CONF-02 | Clicking terminology status row opens modal with pre-filled URL | unit | `npx vitest run src/__tests__/settings-modal.test.tsx` | ❌ Wave 0 |
| CONF-02 | Saving new terminology URL calls `setSettings()` with updated terminology block | unit | `npx vitest run src/__tests__/settings-modal.test.tsx` | ❌ Wave 0 |
| CONF-03 | `SettingsContext.setSettings()` updates context value and downstream consumers re-render | unit | `npx vitest run src/__tests__/settings-context.test.tsx` | ❌ Wave 0 |
| CONF-03 | `TerminologyProvider` rebuilds resolver when settings.terminology changes | unit | `npx vitest run src/__tests__/terminology-context.test.tsx` | ✅ (existing — verify covers setSettings trigger) |

### Sampling Rate
- **Per task commit:** `npx vitest run src/__tests__/settings-modal.test.tsx src/__tests__/settings-context.test.tsx`
- **Per wave merge:** `npx vitest run`
- **Phase gate:** Full suite green before `/gsd-verify-work`

### Wave 0 Gaps
- [ ] `src/__tests__/settings-modal.test.tsx` — covers CONF-01, CONF-02 (modal open, pre-fill, save calls)
- [ ] `src/__tests__/settings-context.test.tsx` — covers CONF-03 (SettingsProvider state update propagation)
- [ ] Verify existing `src/__tests__/terminology-context.test.tsx` covers the `setSettings` trigger path (TerminologyProvider prop change → resolver rebuild)

---

## Security Domain

> `security_enforcement` not set in config.json — treated as enabled.

### Applicable ASVS Categories

| ASVS Category | Applies | Standard Control |
|---------------|---------|-----------------|
| V2 Authentication | no | No auth flows — settings store credentials, not authenticate |
| V3 Session Management | no | No server-side sessions |
| V4 Access Control | no | Local-only tool |
| V5 Input Validation | yes | URL trimming already in `settings.ts` deepMerge; repeat in modal save handler |
| V6 Cryptography | no | Credentials stored in React state (memory only, not persisted) |

### Known Threat Patterns

| Pattern | STRIDE | Standard Mitigation |
|---------|--------|---------------------|
| Credentials in React state (memory) | Information Disclosure | Acceptable — session-scoped, never persisted to localStorage or file. Existing `SettingsPage` already masks tokens. |
| XSS reading React state | Information Disclosure | Out of scope for local-only tool; no untrusted content sources |
| URL injection via modal input | Tampering | `trim()` on save (already done in `deepMerge`); no server-side eval. Malformed URLs fail at `fetch()` and surface as connection error. |

**No new security surface introduced.** Credentials were already loaded from `settings.yaml` into React state at startup — moving editability to the UI doesn't change the storage model.

---

## Assumptions Log

| # | Claim | Section | Risk if Wrong |
|---|-------|---------|---------------|
| A1 | `@mantine/form` is not used elsewhere in the codebase and plain `useState` is the project pattern for forms | Pattern 4 | Low — `@mantine/form` is available if desired but adds boilerplate for 3-5 fields |
| A2 | `Sidebar` can safely call `useSettingsContext()` and `useConnectionContext()` directly without prop changes breaking `AppLayout` | Pattern 3 | Low — confirmed both contexts sit above `AppShell` in provider tree |

---

## Sources

### Primary (HIGH confidence)
- `src/contexts/ConnectionContext.tsx` — `connect(settings)` API, `disconnect()`, state transitions [VERIFIED: file read]
- `src/contexts/TerminologyContext.tsx` — `useMemo([terminologyKey])` rebuild mechanism [VERIFIED: file read]
- `src/hooks/useSettings.ts` — current read-only hook structure to be upgraded [VERIFIED: file read]
- `src/config/types.ts` — `AppSettings` interface (AuthMode union, optional terminology/validation) [VERIFIED: file read]
- `src/config/settings.ts` — `loadSettings()`, `DEFAULTS`, `deepMerge` [VERIFIED: file read]
- `src/components/layout/Sidebar.tsx` — current status row structure, edit integration points [VERIFIED: file read]
- `src/App.tsx` — provider nesting, `TerminologyProvider` prop wiring [VERIFIED: file read]
- `src/components/feedback/FeedbackButton.tsx` — existing Modal pattern in codebase [VERIFIED: file read]
- `package.json` — installed packages including `@mantine/hooks` [VERIFIED: file read]

### Secondary (MEDIUM confidence)
- [Mantine useDisclosure docs](https://mantine.dev/hooks/use-disclosure/) — `open`/`close`/`toggle` API [CITED: mantine.dev]
- [Mantine Modal docs](https://mantine.dev/core/modal/) — `opened`, `onClose`, `size`, `centered` props [CITED: mantine.dev]
- [Mantine PasswordInput docs](https://mantine.dev/core/password-input/) — built-in show/hide toggle [CITED: mantine.dev]

---

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH — all libraries verified present in package.json, no new installs needed
- Architecture: HIGH — all context/hook patterns verified from existing codebase files
- Pitfalls: HIGH — identified from direct code inspection; memo key and async connect behavior verified from source
- Test patterns: HIGH — vitest + testing-library confirmed from vitest.config.ts and existing test files

**Research date:** 2026-04-12
**Valid until:** 2026-05-12 (stable stack — Mantine 8 and Medplum 5 APIs are not fast-moving)
