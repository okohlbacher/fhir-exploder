---
phase: 01-foundation-blaze-connectivity
verified: 2026-04-11T18:10:00Z
status: human_needed
score: 5/5 must-haves verified
overrides_applied: 0
human_verification:
  - test: "Connect to Blaze FHIR server and verify full flow"
    expected: "Sidebar dot turns green, resource types accordion appears with counts loading, green Connected alert shown"
    why_human: "Cannot start Blaze server in CI context — requires live FHIR server to verify connection state machine end-to-end, CapabilityStatement parsing on real data, and lazy count loading"
  - test: "Verify Medplum ResourceTable renders Blaze-fetched data (Roadmap SC 5)"
    expected: "Green 'Medplum compatibility verified' alert shown below resource list with a ResourceTable rendering one fetched resource"
    why_human: "MedplumCompatGate requires live Blaze to fetch a resource — cannot verify Medplum-on-Blaze rendering compatibility without a running server"
  - test: "Test error flow with Blaze NOT running"
    expected: "Red alert 'Cannot reach FHIR server at http://localhost:8080/fhir...' with fix suggestion, sidebar dot turns red with 'Disconnected', Retry Connection button shown"
    why_human: "Error classification depends on actual network failure from browser fetch — cannot simulate TypeError with 'fetch' message reliably in programmatic check"
  - test: "Verify settings.yaml override: rename/remove public/settings.yaml and refresh"
    expected: "Orange 'Using default settings' warning banner appears on both the dashboard and settings page"
    why_human: "Browser fetch behavior for 404 on static assets requires a running dev server to verify fallback path"
---

# Phase 1: Foundation & Blaze Connectivity Verification Report

**Phase Goal:** Users can connect to a Blaze FHIR server and see that it works -- the app loads, reads settings, connects, discovers server capabilities, and handles errors gracefully
**Verified:** 2026-04-11T18:10:00Z
**Status:** human_needed
**Re-verification:** No -- initial verification

## Goal Achievement

### Observable Truths (Roadmap Success Criteria)

| # | Truth | Status | Evidence |
|---|-------|--------|----------|
| 1 | User can edit settings.yaml to configure server URL, auth mode, and credentials, and the app uses that configuration on startup | VERIFIED | `public/settings.yaml` contains serverUrl + auth.mode; `loadSettings()` in `src/config/settings.ts` fetches `/settings.yaml`, parses with js-yaml, deep-merges with DEFAULTS, returns `{ settings, usingDefaults }`. `useSettings()` hook wired into `App.tsx` and passed to `DashboardPage` and `SettingsPage`. |
| 2 | App connects to Blaze and displays the list of supported resource types discovered from the CapabilityStatement | VERIFIED (code path) | `useConnection` hook calls `client.get('metadata')` to fetch CapabilityStatement; `parseResourceTypes()` in `src/fhir/capability.ts` maps `rest[0].resource` to `ParsedResourceType[]` with category; `ResourceTypeList` renders Accordion grouped by `CATEGORY_ORDER`. Full data flow from connection -> parseResourceTypes -> ResourceTypeList -> ResourceTypeGroup -> ResourceTypeRow is wired. Needs human to confirm with live server. |
| 3 | App shows a clear, actionable error message when the FHIR server is unreachable or returns an error | VERIFIED (code path) | `classifyError()` in `src/utils/errors.ts` produces network/auth/invalid_response/unknown categories with `serverUrl` interpolated in messages and fix `suggestion`. `DashboardPage` renders red `Alert` with `ERROR_TITLES` mapping when `connectionState.status === 'error'`. Sidebar shows `#fa5252` red dot with 'Disconnected' label on error. Needs human to confirm with failing connection. |
| 4 | App shows loading indicators while FHIR requests are in flight | VERIFIED | `ServerInfoCard` renders `<Loader size="xs" color="white" />` inside the Connect button when `status === 'connecting'`. `ResourceTypeRow` renders `<Loader size="xs" />` inline when `count === 'loading'`. `MedplumCompatGate` shows `<Loader size="sm" />` during verification. All three loading states are implemented. |
| 5 | A Medplum React component can successfully render a FHIR resource fetched from Blaze (compatibility gate) | VERIFIED (code path) | `MedplumCompatGate.tsx` fetches a resource via `client.searchResources()`, wraps it in `<MedplumProvider medplum={client}>`, and renders `<ResourceTable value={state.resource} />`. Local `MedplumProvider` pattern avoids global provider conflict. Needs human to confirm rendering succeeds with actual Blaze data. |

**Score:** 5/5 truths verified (code paths complete; runtime confirmation needs human)

### Required Artifacts

| Artifact | Expected | Status | Details |
|----------|----------|--------|---------|
| `package.json` | All dependencies installed | VERIFIED | @medplum/core@^5.1.7, @mantine/core@^8.3.18, react-router-dom@^7.14.0, js-yaml@^4.1.1, @tabler/icons-react@^3.41.1, rfc6902, signature_pad, vitest@^4.1.4 all present |
| `src/main.tsx` | App entry with MantineProvider, BrowserRouter | VERIFIED | First import `@mantine/core/styles.css`, wraps with MantineProvider + Notifications + BrowserRouter as specified |
| `src/theme.ts` | Mantine theme configuration | VERIFIED | `createTheme` with fontFamily, defaultRadius: 'sm', primaryColor: 'blue' |
| `src/config/settings.ts` | Settings loader with defaults | VERIFIED | Exports `loadSettings`, `DEFAULTS` (localhost:8080, open auth); deep-merges with fallback |
| `src/config/types.ts` | AppSettings interface | VERIFIED | `mode: 'open' \| 'basic' \| 'bearer'`, optional username/password/token, optional terminology |
| `src/components/layout/AppLayout.tsx` | Mantine AppShell with sidebar | VERIFIED | `AppShell` with `navbar={{ width: 240, breakpoint: 0 }}`, `padding="lg"`, renders `Sidebar` + `<Outlet />` |
| `src/components/layout/Sidebar.tsx` | Navigation sidebar | VERIFIED | `NavLink` for Explorer/Patients/Quality/Settings with tabler icons, connectionStatus dot with STATUS_CONFIG, "FHIR Exploder" title |
| `public/settings.yaml` | Default settings file | VERIFIED | `serverUrl: "http://localhost:8080/fhir"`, `mode: open` |
| `vitest.config.ts` | Vitest configuration | VERIFIED | `defineConfig` with jsdom environment, globals: true |
| `src/__tests__/settings.test.ts` | Test scaffold for settings | VERIFIED | `describe` + 4 `it.todo()` items (Wave 0 scaffold) |
| `src/fhir/client.ts` | MedplumClient factory for Blaze | VERIFIED | `createFhirClient` splits serverUrl into baseUrl + fhirUrlPath, handles open/basic/bearer auth |
| `src/hooks/useConnection.ts` | Connection state machine | VERIFIED | `useConnection` with idle/connecting/connected/error, calls `createFhirClient` + `client.get('metadata')` |
| `src/hooks/useSettings.ts` | Settings loading hook | VERIFIED | `useSettings` wraps `loadSettings()` in useEffect, returns {settings, usingDefaults, loading} |
| `src/utils/errors.ts` | Error classification | VERIFIED | `classifyError` returns ConnectionError with type/message/details/suggestion; serverUrl interpolated |
| `src/components/dashboard/DashboardPage.tsx` | Landing page with connect flow | VERIFIED | "Server Connection" title, ServerInfoCard, error/success/warning alerts, ResourceTypeList + MedplumCompatGate when connected, "Not Connected" empty state |
| `src/components/dashboard/ServerInfoCard.tsx` | Server URL display + Connect button | VERIFIED | Shows server URL, auth mode; button states: "Connect to Server" (idle), Loader + "Connecting..." (connecting), green "Connected" (connected), "Retry Connection" (error) |
| `src/components/settings/SettingsPage.tsx` | Read-only settings display | VERIFIED | Title "Settings", Code elements for URL/auth/credentials, "Edit public/settings.yaml" note |
| `src/fhir/capability.ts` | CapabilityStatement parser | VERIFIED | `parseResourceTypes` maps `rest[0].resource` to `ParsedResourceType[]` with type/searchParams/operations/category |
| `src/utils/fhir-categories.ts` | FHIR category mapping | VERIFIED | `CATEGORY_MAP` with 120+ entries, `getResourceCategory`, `groupByCategory`, `CATEGORY_ORDER` (15 categories) |
| `src/hooks/useResourceCounts.ts` | Lazy resource counts hook | VERIFIED | `useResourceCounts` with `CONCURRENCY = 4` worker pool, `cancelledRef` cleanup, `_summary=count` queries |
| `src/components/dashboard/ResourceTypeList.tsx` | Grouped accordion display | VERIFIED | `Accordion` with `multiple`, `defaultValue` set to all categories, "No Resource Types Found" empty state |
| `src/components/dashboard/ResourceTypeGroup.tsx` | Category section | VERIFIED | `SimpleGrid cols={{ base: 1, sm: 2, lg: 3 }}`, renders `ResourceTypeRow` per type |
| `src/components/dashboard/ResourceTypeRow.tsx` | Single resource type row | VERIFIED | `Link` to `/explorer/{type}`, Loader/Badge for count states, search params + operations counts |
| `src/components/dashboard/MedplumCompatGate.tsx` | Medplum compatibility gate | VERIFIED | `ResourceTable` wrapped in `<MedplumProvider medplum={client}>`, fetches first available resource from Blaze |

### Key Link Verification

| From | To | Via | Status | Details |
|------|-----|-----|--------|---------|
| `src/main.tsx` | `src/App.tsx` | React root render | WIRED | `import { App } from './App'` + rendered in createRoot |
| `src/App.tsx` | `src/components/layout/AppLayout.tsx` | component render | WIRED | Route element `<AppLayout connectionStatus={connectionStatus} />` |
| `src/config/settings.ts` | `public/settings.yaml` | fetch('/settings.yaml') | WIRED | `fetch('/settings.yaml')` on line 42 |
| `src/components/dashboard/ServerInfoCard.tsx` | `src/hooks/useConnection.ts` | connect callback on button click | WIRED | `onConnect` prop called on button click; `useConnection().connect()` bound to `handleConnect` in App.tsx |
| `src/hooks/useConnection.ts` | `src/fhir/client.ts` | createFhirClient call | WIRED | `const client = createFhirClient(settings)` inside connect() |
| `src/fhir/client.ts` | MedplumClient | constructor with baseUrl and fhirUrlPath | WIRED | `return new MedplumClient(options)` with derived baseUrl + fhirUrlPath |
| `src/components/dashboard/DashboardPage.tsx` | `src/fhir/capability.ts` | parseResourceTypes(capability) | WIRED | `const resourceTypes = parseResourceTypes(connectionState.capability)` in useMemo |
| `src/components/dashboard/ResourceTypeRow.tsx` | `src/hooks/useResourceCounts.ts` | count display from hook | WIRED | `counts[rt.type]` passed from `useResourceCounts` in DashboardPage |
| `src/hooks/useResourceCounts.ts` | MedplumClient.search | _summary=count queries | WIRED | `client.search(resourceType as ResourceType, '_summary=count')` |
| `src/components/dashboard/MedplumCompatGate.tsx` | `@medplum/react` | ResourceTable rendering FHIR data | WIRED | `import { ResourceTable } from '@medplum/react'` + `<ResourceTable value={state.resource} />` inside MedplumProvider |

### Data-Flow Trace (Level 4)

| Artifact | Data Variable | Source | Produces Real Data | Status |
|----------|---------------|--------|--------------------|--------|
| `DashboardPage.tsx` | `resourceTypes` | `parseResourceTypes(connectionState.capability)` | Yes -- capability from live `client.get('metadata')` call | FLOWING (when connected) |
| `DashboardPage.tsx` | `counts` | `useResourceCounts(client, resourceTypeNames)` | Yes -- live `client.search(type, '_summary=count')` per type | FLOWING (lazy, after connect) |
| `ServerInfoCard.tsx` | `settings` | `useSettings()` -> `loadSettings()` -> `fetch('/settings.yaml')` | Yes -- reads actual YAML file | FLOWING |
| `MedplumCompatGate.tsx` | `state.resource` | `client.searchResources(type, { _count: '1' })` | Yes -- live FHIR search from Blaze | FLOWING (when connected) |
| `SettingsPage.tsx` | `settings` | `useSettings()` from App.tsx | Yes -- same flow as above | FLOWING |

### Behavioral Spot-Checks

| Behavior | Command | Result | Status |
|----------|---------|--------|--------|
| TypeScript compiles cleanly | `npx tsc --noEmit` | Exit 0, no output | PASS |
| Production build succeeds | `npm run build` | `built in 256ms`, exit 0 | PASS |
| Vitest runs without errors | `npx vitest run` | 22 todo tests, 4 files skipped, 0 failures | PASS |
| Module exports createFhirClient | `node -e "const m = require(...); console.log(typeof m.createFhirClient)"` | `function` | PASS |
| Connect to live Blaze server | Browser manual test | Requires running server | SKIP (human needed) |
| Error state on failed connection | Browser manual test | Requires controlled network failure | SKIP (human needed) |

### Requirements Coverage

| Requirement | Source Plan | Description | Status | Evidence |
|-------------|------------|-------------|--------|----------|
| CONN-01 | 01-01-PLAN.md | User can configure FHIR server URL, auth mode, and credentials in settings.yaml | SATISFIED | `public/settings.yaml` + `src/config/types.ts` AppSettings + `src/config/settings.ts` loadSettings |
| CONN-02 | 01-02-PLAN.md | App reads settings.yaml at startup and connects to the configured FHIR server | SATISFIED | `useSettings()` loads on mount; `useConnection.connect()` triggered by user button click; wired in App.tsx |
| CONN-03 | 01-03-PLAN.md | App fetches and parses CapabilityStatement to discover resource types, search params, and operations | SATISFIED | `parseResourceTypes()` extracts type/searchParams/operations/category from `rest[0].resource`; displayed in categorized ResourceTypeList |
| CONN-04 | 01-02-PLAN.md | App displays clear error messages when FHIR server is unreachable or returns errors | SATISFIED | `classifyError()` produces network/auth/invalid_response/unknown with serverUrl interpolated + actionable suggestion; rendered as red Alert in DashboardPage |
| CONN-05 | 01-02-PLAN.md + 01-03-PLAN.md | App shows loading indicators during FHIR server requests | SATISFIED | 3 loading states: Loader in Connect button (connecting), per-type Loader in ResourceTypeRow (count loading), Loader in MedplumCompatGate (compatibility check) |

**No orphaned requirements.** REQUIREMENTS.md maps CONN-01 through CONN-05 to Phase 1. All five are claimed by the plans and verified above.

### Anti-Patterns Found

| File | Line | Pattern | Severity | Impact |
|------|------|---------|----------|--------|
| `src/App.tsx` | 9-18 | Placeholder route components `<div>Explorer (Phase 2)</div>` etc. | Info | Expected -- these are intentional forward-declaration stubs for Phase 2/3/5 routes. Not blocking Phase 1 goal. |

No TODO/FIXME/PLACEHOLDER comments found in any source file. No empty return statements or hardcoded empty data arrays in non-scaffold code.

### Human Verification Required

#### 1. End-to-End Connection Flow with Blaze Running

**Test:** Start dev server with `npm run dev`. With Blaze FHIR server running at localhost:8080, open http://localhost:5173, click "Connect to Server".
**Expected:** Button shows spinner ("Connecting..."), then turns to green outlined "Connected". Sidebar dot turns green (#40c057) with label "Connected". Green success Alert shows "Connected to {server name}". Resource types accordion appears below with categories expanded and per-type count spinners resolving to blue Badge numbers.
**Why human:** Cannot programmatically start Blaze server or simulate a successful FHIR connection in this environment.

#### 2. Medplum React Compatibility Gate (Roadmap Success Criterion 5)

**Test:** After connecting to Blaze (test 1 above), scroll below the resource type list on the dashboard.
**Expected:** Green "Medplum compatibility verified" Alert is shown. A `ResourceTable` component renders a real FHIR resource (Patient, Observation, or similar) fetched from Blaze, displaying its properties in Medplum's table format.
**Why human:** This is the critical architecture validation -- `ResourceTable` rendering Blaze-fetched data confirms Medplum React components work with non-Medplum FHIR servers. Cannot verify without a live server returning real FHIR resources.

#### 3. Error State When Blaze Is Not Running

**Test:** With Blaze NOT running, click "Connect to Server".
**Expected:** Red Alert with title "Cannot reach FHIR server" and body "Cannot reach FHIR server at http://localhost:8080/fhir. Check that the server is running..." plus a fix suggestion. Sidebar dot turns red with "Disconnected" label. Button changes to "Retry Connection".
**Why human:** Error classification depends on actual `TypeError` raised by browser `fetch()` on unreachable host -- cannot reproduce the exact error type programmatically.

#### 4. Default Settings Warning Banner

**Test:** Rename `public/settings.yaml` to `public/settings.yaml.bak`, refresh the app.
**Expected:** Orange "Using default settings" Alert banner appears on both the dashboard page and the settings page.
**Why human:** Requires running dev server serving static assets; the 404 fallback behavior in `loadSettings()` must be triggered by an actual missing file.

---

## Gap / Deferred Summary

No gaps found. All code paths verified. All required artifacts exist with substantive implementations and are correctly wired. The 22 test scaffolds are intentional Wave 0 `it.todo()` placeholders -- this is the documented pattern per Plan 01-01 and is not a gap (tests are scaffolds awaiting implementation in a future test-completion pass).

The placeholder route components for Explorer, Patients, and Quality (`<div>Phase X</div>`) are forward declarations for phases 2, 3, and 5 respectively -- not gaps in Phase 1 scope.

Human verification items are required to confirm the live connection flow, error handling, and Medplum-on-Blaze compatibility -- all of which require a running FHIR server.

---

_Verified: 2026-04-11T18:10:00Z_
_Verifier: Claude (gsd-verifier)_
