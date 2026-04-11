---
phase: 01-foundation-blaze-connectivity
plan: 02
subsystem: ui
tags: [react, medplum, mantine, fhir, connection, state-machine, error-handling]

requires:
  - phase: 01-foundation-blaze-connectivity/01
    provides: App shell, routing, settings loader, AppSettings type, Sidebar with connectionStatus prop
provides:
  - MedplumClient factory (createFhirClient) configured for Blaze with baseUrl/fhirUrlPath splitting
  - Connection state machine hook (useConnection) with idle/connecting/connected/error lifecycle
  - Error classification utility (classifyError) producing user-facing messages with fix suggestions
  - Settings loading hook (useSettings) wrapping loadSettings for React components
  - DashboardPage with server info card, connect button, error/success alerts, default settings warning
  - ServerInfoCard with loading spinner states and connection status display
  - SettingsPage with read-only config display and masked credentials
affects: [01-03, 02-resource-explorer, 03-patient-browser]

tech-stack:
  added: []
  patterns: [fhir-client-factory, connection-state-machine, error-classification, settings-hook]

key-files:
  created:
    - src/fhir/types.ts
    - src/fhir/client.ts
    - src/utils/errors.ts
    - src/hooks/useConnection.ts
    - src/hooks/useSettings.ts
    - src/components/dashboard/DashboardPage.tsx
    - src/components/dashboard/ServerInfoCard.tsx
    - src/components/settings/SettingsPage.tsx
  modified:
    - src/App.tsx

key-decisions:
  - "MedplumClient factory splits serverUrl into baseUrl + fhirUrlPath for Blaze compatibility"
  - "Connection uses client.get('metadata') to fetch CapabilityStatement as connectivity validation"
  - "Error classifier categorizes errors into network/auth/invalid_response/unknown with user-facing suggestions"
  - "Props drilling used for connection state instead of React context -- simple enough for current component tree"

patterns-established:
  - "FHIR client factory: createFhirClient(settings) returns configured MedplumClient"
  - "Connection state machine: useConnection() returns {state, connect, disconnect}"
  - "Error classification: classifyError(err, serverUrl, authMode) returns ConnectionError with message + suggestion"
  - "Settings hook: useSettings() returns {settings, usingDefaults, loading}"

requirements-completed: [CONN-02, CONN-04, CONN-05]

duration: 2min
completed: 2026-04-11
---

# Phase 01 Plan 02: FHIR Server Connection Flow Summary

**MedplumClient-to-Blaze connection flow with state machine, error classification, dashboard UI, and settings display**

## Performance

- **Duration:** 2 min
- **Started:** 2026-04-11T15:25:14Z
- **Completed:** 2026-04-11T15:27:28Z
- **Tasks:** 2
- **Files modified:** 9

## Accomplishments
- MedplumClient factory correctly splits Blaze server URL into baseUrl and fhirUrlPath, supporting open/basic/bearer auth modes
- Connection state machine with idle/connecting/connected/error lifecycle, fetching CapabilityStatement as validation
- Dashboard page with server info card showing Connect button with loading spinner, error alerts with actionable fix suggestions, and success confirmation
- Settings page displaying current configuration read-only with masked credentials

## Task Commits

Each task was committed atomically:

1. **Task 1: Create FHIR client factory, connection hook, error utilities, and settings hook** - `a50fe98` (feat)
2. **Task 2: Build DashboardPage, ServerInfoCard, SettingsPage, and wire connection flow into App** - `2b8c897` (feat)

## Files Created/Modified
- `src/fhir/types.ts` - ConnectionState, ConnectionStatus, ConnectionError type definitions
- `src/fhir/client.ts` - MedplumClient factory with baseUrl/fhirUrlPath splitting for Blaze
- `src/utils/errors.ts` - Error classification into network/auth/invalid_response/unknown with suggestions
- `src/hooks/useConnection.ts` - Connection state machine hook with connect/disconnect
- `src/hooks/useSettings.ts` - Settings loading hook wrapping loadSettings
- `src/components/dashboard/DashboardPage.tsx` - Landing page with connection flow, alerts, warnings
- `src/components/dashboard/ServerInfoCard.tsx` - Server URL, auth mode, Connect button with spinner states
- `src/components/settings/SettingsPage.tsx` - Read-only settings display with masked credentials
- `src/App.tsx` - Wired useSettings, useConnection hooks to DashboardPage and SettingsPage

## Decisions Made
- Used `client.get('metadata')` to fetch CapabilityStatement as the connection validation step -- simplest approach that confirms FHIR server is reachable and responding correctly
- Props drilling through App -> AppLayout -> Sidebar for connectionStatus rather than React context -- component tree is shallow enough that context adds unnecessary complexity
- Error classification checks `TypeError` with 'fetch' for network errors and `status` property for HTTP errors -- covers the main MedplumClient error patterns

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered

None.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness
- Connection flow complete -- Plan 03 can build CapabilityStatement parsing and resource type display on top of the connected state
- `ConnectionState` discriminated union provides typed access to `client` and `capability` when connected
- Dashboard placeholder div ready for resource types list (Plan 03)

## Self-Check: PASSED

All 8 created files verified present. Both task commits (a50fe98, 2b8c897) verified in git log. Build passes cleanly.

---
*Phase: 01-foundation-blaze-connectivity*
*Completed: 2026-04-11*
