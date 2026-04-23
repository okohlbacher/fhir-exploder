---
quick_id: 260423-ezd
type: quick
description: Auto-connect to FHIR server on startup if URL is already configured in settings
files_modified:
  - src/App.tsx
source_todo: .planning/todos/pending/2026-04-17-auto-connect-to-fhir-server-on-startup-if-url-is-already-con.md
---

# Quick 260423-ezd: Auto-connect on startup

## Task

When the app loads, if `settings.fhir.serverUrl` is present and the connection is
still `idle`, fire the same connect flow the manual button uses. No manual click
required for the common case of returning to a pre-configured local server.

## Implementation

Add a `useEffect` in `AppRoutes` (`src/App.tsx`) that:

1. Waits for settings to finish loading (`loading === false` via `useSettings()`).
2. Checks `settings?.fhir?.serverUrl` is non-empty.
3. Checks `connection.state.status === 'idle'` — so it doesn't re-fire if the
   user is already connected, already tried, or failed.
4. Calls `handleConnect()` (already exists on the page, wraps
   `connection.connect(settings)`).
5. Runs **exactly once** per settings identity — don't retry on error. If the
   server is unreachable, `connection.state` becomes `error` and the existing
   sidebar indicator shows "Unreachable"; the user can click Connect manually.

## Status indicator

Already exists: `AppLayout` receives `connectionStatus` and the Sidebar renders
"FHIR server: Connecting… / Connected / Unreachable / Not connected" via
existing `STATUS_CONFIG`. No new UI required.

## Non-goals

- Retrying after error (one-shot auto-connect).
- Changing the `ConnectionProvider` contract or adding persistence beyond the
  already-configured `settings.yaml` URL.
- Auto-reconnect after a settings change (`setSettings` cache clear flow is
  unchanged; settings save flows are separate from startup).

## Verification

- `npm run build` exits 0.
- `npm test` exits 0.
- Manual: loading `/` with a pre-configured `settings.yaml` shows the sidebar
  flip from "Connecting…" to "Connected" without clicking the Connect button.
