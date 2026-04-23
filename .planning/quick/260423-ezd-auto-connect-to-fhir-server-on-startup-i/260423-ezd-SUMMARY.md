---
quick_id: 260423-ezd
status: completed
completed: 2026-04-23
commit: 3e2784a
files_changed:
  - src/App.tsx
---

# Summary — Quick 260423-ezd: Auto-connect on startup

## Outcome

App now auto-connects to the configured FHIR server on startup. The manual
Connect button still works unchanged — this hook just fires the same flow once
when a URL is already present in settings and the connection is still idle.

## Change

`src/App.tsx` — `AppRoutes` gained a `useEffect` + `useRef` guard:

```ts
const autoConnectFiredRef = useRef(false);
useEffect(() => {
  if (loading) return;
  if (autoConnectFiredRef.current) return;
  if (!settings?.fhir?.serverUrl) return;
  if (connection.state.status !== 'idle') return;
  autoConnectFiredRef.current = true;
  connection.connect(settings);
}, [loading, settings, connection]);
```

Guarantees:

- **One-shot per mount.** `autoConnectFiredRef` short-circuits after the first
  fire so StrictMode double-invocation and downstream re-renders don't
  re-issue the connect.
- **Never overrides in-flight or successful connections.** The
  `status !== 'idle'` gate means reconnect after a manual disconnect still
  requires the user's click.
- **Graceful failure.** On unreachable server, `connection.state` becomes
  `error` and the existing Sidebar `STATUS_CONFIG` renders "Unreachable" —
  exactly what the manual path does.

No new UI added. Existing `AppLayout` already receives `connectionStatus` and
the sidebar already reflects idle / connecting / connected / error states.

## Verification

- `npm run build` → `✓ built in 494ms` (tsc -b clean).
- `npm test` → 835 passed / 22 todo / 0 failed.
- Commit: `3e2784a feat(quick-260423-ezd): auto-connect to FHIR server on startup`.
