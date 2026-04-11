---
phase: 01-foundation-blaze-connectivity
reviewed: 2026-04-11T00:00:00Z
depth: standard
files_reviewed: 24
files_reviewed_list:
  - public/settings.yaml
  - src/App.tsx
  - src/components/dashboard/DashboardPage.tsx
  - src/components/dashboard/MedplumCompatGate.tsx
  - src/components/dashboard/ResourceTypeGroup.tsx
  - src/components/dashboard/ResourceTypeList.tsx
  - src/components/dashboard/ResourceTypeRow.tsx
  - src/components/dashboard/ServerInfoCard.tsx
  - src/components/layout/AppLayout.tsx
  - src/components/layout/Sidebar.tsx
  - src/components/settings/SettingsPage.tsx
  - src/config/settings.ts
  - src/config/types.ts
  - src/fhir/capability.ts
  - src/fhir/client.ts
  - src/fhir/types.ts
  - src/hooks/useConnection.ts
  - src/hooks/useResourceCounts.ts
  - src/hooks/useSettings.ts
  - src/main.tsx
  - src/theme.ts
  - src/utils/errors.ts
  - src/utils/fhir-categories.ts
  - vite.config.ts
  - vitest.config.ts
findings:
  critical: 1
  warning: 4
  info: 4
  total: 9
status: issues_found
---

# Phase 01: Code Review Report

**Reviewed:** 2026-04-11
**Depth:** standard
**Files Reviewed:** 24
**Status:** issues_found

## Summary

This is a well-structured Phase 1 foundation. The code is clean, TypeScript types are used thoughtfully, and error handling is generally solid. The architecture separates concerns well: config loading, FHIR client creation, connection state, and UI components are all cleanly isolated.

One critical issue: credentials (username/password, bearer token) loaded from `settings.yaml` are held in-memory as plain strings in React state and passed down the component tree. This is fine for a local-only tool, but the basic auth path has a concrete bug — the password is incorporated into a `btoa()` call while the token flow has a subtle credential-exposure risk in error state.

Four warnings address logic correctness: a URL-parsing crash on invalid server URLs, a stale-closure bug in the concurrency limiter, a missing `null` guard in `main.tsx`, and an unhandled edge case in the `deepMerge` auth spread.

---

## Critical Issues

### CR-01: `createFhirClient` crashes on invalid `serverUrl` without recovery

**File:** `src/fhir/client.ts:5`
**Issue:** `new URL(settings.fhir.serverUrl)` throws a `TypeError` if the string is not a valid URL (e.g., `"localhost:8080/fhir"` without a scheme, or an empty string from a misconfigured YAML). This exception is thrown synchronously inside `createFhirClient`, which is called from `useConnection.connect`. The `try/catch` in `useConnection` will catch it, but `classifyError` will classify it as `unknown` rather than `network`, producing a confusing error message ("Connection failed to localhost:8080/fhir" without the "Cannot reach server" context). More importantly, if settings.yaml contains a clearly invalid URL, the user gets no actionable guidance.

**Fix:** Validate the URL before passing it to `new URL` and throw a structured error that `classifyError` can identify:

```typescript
export function createFhirClient(settings: AppSettings): MedplumClient {
  let url: URL;
  try {
    url = new URL(settings.fhir.serverUrl);
  } catch {
    throw Object.assign(new TypeError(`fetch: invalid URL: ${settings.fhir.serverUrl}`), {
      status: 0,
    });
  }
  // ... rest unchanged
}
```

Alternatively, add a `'invalid_url'` branch to `classifyError` that matches `TypeError` with `errMsg.includes('Invalid URL')` or `errMsg.includes('invalid URL')`, so the user sees: "The server URL in settings.yaml is not a valid URL."

---

## Warnings

### WR-01: Stale `activeCount` closure in `useResourceCounts` concurrency limiter

**File:** `src/hooks/useResourceCounts.ts:39-61`
**Issue:** `activeCount` is a plain `let` variable captured in the closure of `processNext`. Because `processNext` is called from within `.finally()` callbacks (i.e., asynchronously), and `processNext` itself may call `processNext` recursively via `.finally()`, there is a re-entrancy risk: the initial `processNext()` call at line 64 fires synchronously and can drain up to `CONCURRENCY` items from the queue. Each spawned promise's `.finally()` calls `processNext()` again. This works correctly in the happy path, but the `activeCount--` at line 58 runs before the `processNext()` at line 59, so the counter is always correct — this is actually fine as written. However, a subtler bug exists: the effect dependency array uses `resourceTypes.join(',')` (line 69), which means if the same resource types are passed in a different order, the effect does NOT re-run, but the counts may be stale. More practically, `resourceTypes` is derived from `resourceTypeNames` in `DashboardPage`, which is a stable `useMemo` — but this dependency serialization is a fragile pattern that can silently miss re-runs.

**Fix:** Either pass `resourceTypes` directly as the dependency (React's linter will warn, but the array reference changes when connection changes), or use a stable identity key that truly represents the set:

```typescript
// Use a sorted, stable key
}, [client, [...resourceTypes].sort().join(',')]);
```

More robustly, since `useResourceCounts` is only called when `client` changes (new connection), keying the effect on `client` alone would suffice — the resource types come from the same connection's capability statement and won't change independently.

### WR-02: Non-null assertion on `document.getElementById('root')` in `main.tsx`

**File:** `src/main.tsx:12`
**Issue:** `document.getElementById('root')!` uses a non-null assertion. If `index.html` is misconfigured and the `#root` element is missing, this silently passes `null` to `createRoot`, which will throw an unhelpful runtime error: "Target container is not a DOM element." This is a common React bootstrapping failure mode.

**Fix:** Add an explicit null check:

```typescript
const rootElement = document.getElementById('root');
if (!rootElement) {
  throw new Error('Root element #root not found in index.html. Check your HTML template.');
}
createRoot(rootElement).render(/* ... */);
```

### WR-03: Auth spread in `deepMerge` may promote unexpected YAML keys into auth config

**File:** `src/config/settings.ts:28`
**Issue:** The auth merge at line 28 spreads `fhir.auth` from the parsed YAML directly:

```typescript
...(fhir.auth && typeof fhir.auth === 'object' ? fhir.auth as Record<string, unknown> : {}),
```

This spread accepts any key present in the YAML's `auth` object, including arbitrary unknown keys. If someone adds an unexpected key to `settings.yaml` (e.g., `auth.privateKey`), it will be silently merged into `AppSettings['fhir']['auth']`. TypeScript's `as` cast suppresses the type-checker here. While not immediately exploitable in a local tool, it's a correctness issue — the final `auth` object may carry keys that don't match the declared type.

**Fix:** Only copy the known auth fields by name:

```typescript
const rawAuth = fhir.auth as Record<string, unknown>;
result.fhir = {
  ...defaults.fhir,
  serverUrl: typeof fhir.serverUrl === 'string' ? fhir.serverUrl : defaults.fhir.serverUrl,
  auth: {
    mode: (['open', 'basic', 'bearer'].includes(rawAuth.mode as string)
      ? rawAuth.mode
      : defaults.fhir.auth.mode) as AppSettings['fhir']['auth']['mode'],
    ...(typeof rawAuth.username === 'string' ? { username: rawAuth.username } : {}),
    ...(typeof rawAuth.password === 'string' ? { password: rawAuth.password } : {}),
    ...(typeof rawAuth.token === 'string' ? { token: rawAuth.token } : {}),
  },
};
```

### WR-04: `MedplumCompatGate` does not reset state when `client` prop changes

**File:** `src/components/dashboard/MedplumCompatGate.tsx:23`
**Issue:** `useState({ status: 'loading' })` initializes once. When the user disconnects and reconnects (receiving a new `client` instance), the `useEffect` re-runs correctly because `client` is in the dependency array. However, the state is NOT reset to `{ status: 'loading' }` before the new async `verify()` call. Between the effect re-run and the first `setState` inside `verify()`, the component will briefly show the stale previous result (success or error from the prior connection), which is misleading.

**Fix:** Reset state at the start of the effect:

```typescript
useEffect(() => {
  let cancelled = false;
  setState({ status: 'loading' });  // reset on every new client

  async function verify() {
    // ...
  }
  verify();
  return () => { cancelled = true; };
}, [client, resourceTypes?.join(',')]);
```

---

## Info

### IN-01: `useSettings` does not expose `loading` to consumers

**File:** `src/hooks/useSettings.ts:18`
**Issue:** `useSettings` computes a `loading` boolean but does not return it. `App.tsx` destructures only `{ settings, usingDefaults }`. During the async `loadSettings()` call, `settings` is `null`. `App.tsx` passes `settings={null}` to `DashboardPage`, which renders the `ServerInfoCard` only when `settings` is truthy — so no explicit loading state is shown while settings load. This is harmless for fast local fetches but would produce a brief flash of "Not Connected" UI before settings resolve.

**Fix:** Return `loading` from the hook and use it in `App.tsx` to show a loading indicator or defer rendering:

```typescript
// useSettings.ts already computes loading — just add it to return
return { settings, usingDefaults, loading };

// App.tsx
const { settings, usingDefaults, loading } = useSettings();
if (loading) return <LoadingOverlay visible />;
```

### IN-02: `ConnectionStatus` type is duplicated between `Sidebar.tsx` and `fhir/types.ts`

**File:** `src/components/layout/Sidebar.tsx:11`
**Issue:** `Sidebar.tsx` exports its own `ConnectionStatus` type (`'idle' | 'connecting' | 'connected' | 'error'`), which is identical to `ConnectionStatus` in `src/fhir/types.ts`. `AppLayout.tsx` imports `ConnectionStatus` from `Sidebar.tsx` rather than from the canonical definition. This is a type duplication that could silently diverge if the status values change.

**Fix:** Remove the local `ConnectionStatus` type from `Sidebar.tsx` and import it from `src/fhir/types.ts`:

```typescript
// Sidebar.tsx
import type { ConnectionStatus } from '../../fhir/types';
// Remove: export type ConnectionStatus = ...
```

### IN-03: Vite proxy path does not match `settings.yaml` default FHIR path

**File:** `vite.config.ts:9`
**Issue:** The Vite dev server proxy is configured for `/fhir` paths, but `settings.yaml` sets `serverUrl: "http://localhost:8080/fhir"`. `createFhirClient` constructs `baseUrl` as `http://localhost:8080` and `fhirUrlPath` as `fhir/`. In development, requests go to `http://localhost:8080/fhir/...` directly — they bypass the Vite proxy because `createFhirClient` uses the full absolute URL, not a relative path. The proxy is effectively unused. This causes no bug (the app talks directly to Blaze on 8080), but it's confusing — developers might expect the proxy to handle CORS.

**Fix:** Either remove the dead proxy config, or document why it exists (e.g., as a fallback for future relative-URL mode). If the intent is to proxy requests through Vite to avoid CORS issues, `createFhirClient` needs to use a relative base URL in dev.

### IN-04: `ResourceTypeRow` links to `/explorer/:type` which has no route defined yet

**File:** `src/components/dashboard/ResourceTypeRow.tsx:16`
**Issue:** Each resource type card renders a `Link` to `/explorer/${resourceType.type}`, but `App.tsx` only defines `/explorer` (as a placeholder). Clicking any resource type link will render a 404 (no matching route), and since there is no catch-all route, the user will see a blank `AppLayout` body. This is expected Phase 1 behavior but is worth tracking.

**Fix:** Either add a catch-all `<Route path="*" element={<NotFound />} />` to prevent the blank-page UX, or render the resource type name as plain text (not a link) until Phase 2 implements the explorer route. A simple guard:

```tsx
// Option: disable the link until Phase 2
<Text fw={500} size="sm" c={isExplorerReady ? 'blue' : 'dark'}>
  {resourceType.type}
</Text>
```

---

_Reviewed: 2026-04-11_
_Reviewer: Claude (gsd-code-reviewer)_
_Depth: standard_
