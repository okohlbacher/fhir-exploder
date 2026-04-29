---
quick_id: 260429-kva
description: fix the fhir server switch bug
type: quick
date: 2026-04-29
status: complete
closed_at: 2026-04-29T13:50:00Z
tasks_completed: 4/4
files_modified: 5
commits:
  - 17498da  # initial createFhirClient direct-route (later partially reverted)
  - d7d73c7  # localStorage persistence in setSettings
  - 51e67db  # localStorage-first ordering in loadSettings
  - e5d37e1  # restore proxy-route in createFhirClient + add Settings page editable + Test Connection button
  - ba43422  # replace broken http-proxy `router` with custom Vite plugin (fhirProxyPlugin) for true dynamic routing
test_baseline_before: 1064
test_baseline_after: 1091
test_baseline_delta: "+27 (auto-discovered new tests; SettingsPage tests still pass with provider-wrapped helper)"
type_check: pass
build: pass
human_verification: passed
human_verification_message: "That's looking good, that's fixed."
---

# Quick Task 260429-kva SUMMARY

## What was done

Fixed two compounded bugs that prevented FHIR server-switching from working in dev mode, and added an editable FHIR section + Test Connection button to the Settings page so users can change servers without editing `public/settings.yaml`.

The work landed in two passes — an initial implementation (Tasks 1-3) that introduced a regression, and a recovery pass (Tasks 4 + 5) that restored connectivity, made the dev proxy genuinely dynamic, and shipped the Settings page UX.

## The original two bugs

1. **Vite dev-proxy hardcoded to `http://localhost:8080`** ([vite.config.ts](vite.config.ts) before this fix). Combined with `createFhirClient` using `window.location.origin` as `MedplumClient` baseUrl, this meant the host/port from `settings.fhir.serverUrl` was silently ignored — every request routed to `:8080` regardless of what the user configured.

2. **`setSettings` non-persistence** ([src/contexts/SettingsContext.tsx](src/contexts/SettingsContext.tsx)). The function only updated React state — no localStorage write. On hard reload, settings reverted to whatever was in `public/settings.yaml`, dropping any modal-driven changes.

## Per-task verdict (4/4 + 1 recovery pass)

| Task | Type | Action | Commit | Verify |
|------|------|--------|--------|--------|
| 1 | auto | createFhirClient: route to `settings.fhir.serverUrl` directly via `url.origin` | `17498da` | tsc clean; build clean (later REVERTED in `e5d37e1` because direct-route assumed permissive CORS that Blaze didn't have) |
| 2 | auto | setSettings: persist to localStorage `fhirExplorer.settings.v1` after state update (try/catch wrapped) | `d7d73c7` | grep `fhirExplorer.settings.v1` in SettingsContext returns 1 |
| 3 | auto | loadSettings: prefer localStorage over `/settings.yaml`, three-tier fallback (localStorage → YAML → DEFAULTS) | `51e67db` | grep in settings.ts returns 1 |
| 4 | checkpoint:human-verify | End-to-end manual UAT against live Blaze + HAPI servers | (combined into recovery commits below) | User reported app stopped connecting to ANY server after Tasks 1-3 — triggered recovery pass below |
| 5 (recovery) | auto | Restore proxy-route in createFhirClient + add `X-Fhir-Target` header + replace SettingsPage read-only Code blocks with editable TextInput/Select + Test Connection button + provider-wrapped test helper | `e5d37e1` | tsc clean; build clean; 1091 passed / 0 failed (test wrapping fixed 3 settings-cache tests) |
| 6 (real fix) | auto | Replace broken http-proxy `router` config with custom Vite plugin (`src/dev/fhirProxyPlugin.ts`) — uses node `fetch` to dynamically forward `/fhir/*` to upstream named in `X-Fhir-Target` header; strips hop-by-hop + content-encoding headers | `ba43422` | curl with `X-Fhir-Target: http://localhost:8081` returns HAPI's 85 Patient count vs Blaze's 500 (CONFIRMED) |

## Why two passes

Task 1's initial fix routed FHIR requests directly to the user-configured origin (e.g. `http://localhost:8081`). This bypassed the Vite dev proxy. The assumption — _"Blaze accepts CORS from `localhost:5173` by default"_ — turned out to be wrong on the user's setup, so all FHIR requests started failing CORS preflight.

The recovery pass (commits `e5d37e1` + `ba43422`) restored proxy-route by:
- Reverting `createFhirClient` to `window.location.origin` baseUrl (proxy path)
- Adding `X-Fhir-Target: <user URL>` to MedplumClient `defaultHeaders` so the proxy knows where to forward
- Discovering that http-proxy's `router` callback (initially used in `e5d37e1`) is silently dropped by Vite — the option exists in `http-proxy-middleware` but Vite uses bare `http-proxy`
- Replacing the proxy config with a real Vite plugin (`fhirProxyPlugin`) that adds custom middleware on `/fhir`, reads the `X-Fhir-Target` header per-request, and forwards via node's built-in `fetch` to the actual upstream

## Settings page UX (added in recovery pass)

Replaced the read-only `Code` blocks in [SettingsPage.tsx](src/components/settings/SettingsPage.tsx) with:
- `<TextInput label="Server URL">` — editable, placeholder shows the YAML default
- `<Select label="Auth Mode">` — Open / Basic / Bearer with conditional fields
- **Test connection** button — builds a candidate `MedplumClient`, fetches `/metadata`, surfaces a green/red Mantine `<Alert>` showing CapabilityStatement software/version on success or the raw error on failure (without saving)
- **Save & Connect** button — persists via `setSettings` (localStorage) and triggers `connection.connect()`
- "Unsaved changes" badge + Reset button + helper text documenting the localStorage key

## must_haves status

| Truth | Status | Evidence |
|-------|--------|----------|
| Switching FHIR server URL causes immediate data refresh from new server | PASS | curl `X-Fhir-Target: http://localhost:8081/fhir/Patient?_summary=count` returns 85 (HAPI), `:8080` returns 500 (Blaze). User confirmed "that's fixed". |
| Settings persist across browser reload | PASS | `fhirExplorer.settings.v1` localStorage key written on save, read on load |
| Loading order: localStorage > settings.yaml > DEFAULTS | PASS | `loadSettings` checks localStorage first; verified by reading the source |
| No regression in tests / tsc / build | PASS | 1091 passed / 0 failed; tsc clean; build 530ms clean |
| Settings page has editable FHIR fields + Test Connection button | PASS | SettingsPage.tsx now ships an editable form with a Test Connection button |

## Notable design decisions / lessons learned

1. **Don't trust http-proxy's `router` option.** Vite uses bare `http-proxy`; only `http-proxy-middleware` supports `router`. Curl-test the proxy behavior before assuming the config did anything.

2. **Backend routing belongs in a Vite plugin, not in `proxy` config**, when you need per-request dynamic targets. The plugin owns the routing decision; the frontend just declares its preference via a header.

3. **Strip `content-encoding` on the response side** when the proxy uses `fetch`. undici/fetch auto-decompresses gzip, but the original header survives — the browser then tries to gunzip plain JSON and fails with "Failed to fetch". Same applies to other Content-Encoding values (br, deflate).

4. **Buffer → undici/fetch BodyInit casting:** Node's undici accepts Buffer at runtime, but the DOM `BodyInit` type narrows it out. Cast through `unknown` for dev-only plugin code.

5. **Settings provider wrapping in tests:** The new editable Settings page consumes `useSettings()` and `useConnectionContext()`. Existing `settings-clear-cache.test.tsx` had to wrap its renderPage helper in `<SettingsProvider><ConnectionProvider>...` for the form to render without crashing.

## Files Touched

- **Modified:**
  - `src/fhir/client.ts` — proxy-route + X-Fhir-Target header
  - `src/contexts/SettingsContext.tsx` — localStorage persistence + exported `SETTINGS_STORAGE_KEY` constant
  - `src/config/settings.ts` — localStorage-first loading
  - `src/components/settings/SettingsPage.tsx` — full rewrite of FHIR section: editable form + Test Connection button
  - `src/__tests__/settings-clear-cache.test.tsx` — provider-wrapped renderPage helper
  - `vite.config.ts` — removed `/fhir` proxy config (now plugin-handled)
- **Created:**
  - `src/dev/fhirProxyPlugin.ts` — Vite plugin doing the actual dynamic routing

## Open follow-ups (NOT done in this task)

- **CORS-direct mode for production.** The plugin only runs in dev (`apply: 'serve'`). Production builds bypass it; requests go directly to the configured FHIR origin and require CORS-allow on the deploy origin. Worth documenting in a future README pass and possibly a runtime warning when the user first opens Settings in a non-dev build.
- **Per-server bearer-token storage** (REQ VAL-06 in v1.6 Phase 43): tokens currently land in localStorage per the new persistence path, which is the intended endpoint per the v1.6 plan, but the UI doesn't yet differentiate between secure/insecure storage modes.
