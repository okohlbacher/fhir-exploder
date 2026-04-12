# Phase 9 Context: Inline Settings & Server Configuration

## Domain

Users can change FHIR and terminology server settings from the sidebar without editing settings.yaml or restarting the app. Clicking the status indicators in the sidebar opens an inline editor.

## Decisions

### Edit Trigger
**Decision:** Clicking the FHIR server status line or Terminology status line in the sidebar opens a Mantine Modal with an edit form.
**Rationale:** Consistent with the feedback button modal pattern. Popover would be too narrow for URL + auth fields.

### Settings Scope
**Decision:** Sidebar modals edit FHIR server (URL + auth mode + credentials) and terminology server (URL) only. Validation URL stays on the full Settings page.
**Rationale:** FHIR and terminology are the two most-changed settings during development. Validation is rarely changed.

### Persistence Model
**Decision:** Settings changes live in React state only — session-scoped. `settings.yaml` remains the source of truth on restart. No file writes from the browser.
**Rationale:** This is a local dev tool. Editing settings.yaml is the permanent config mechanism. The UI override is for quick iteration without restart.

### Reconnection Flow
**Decision:** After saving new settings in the modal, automatically reconnect the FHIR client and re-probe the terminology server. Sidebar status dots update immediately without page reload.
**Rationale:** The whole point of inline editing is instant feedback. Manual "reconnect" button would be friction.

## Implementation Approach

### Key Changes
1. **Lift settings state up:** Convert `useSettings()` from a read-only hook to a state provider with a `setSettings()` callback. Wrap the app in a `SettingsProvider` context.
2. **Sidebar modals:** Two modals — one for FHIR (URL + auth mode + username/password/token), one for terminology (URL only). Open via click on the status lines.
3. **Reconnect on save:** FHIR modal save calls `connection.disconnect()` then `connection.connect(newSettings)`. Terminology modal save triggers `TerminologyProvider` to rebuild its client via the memoized settings key.

### Existing Assets to Reuse
- `src/config/types.ts` — `AppSettings` type (no changes needed)
- `src/config/settings.ts` — `loadSettings()` + `DEFAULTS` (initial load unchanged)
- `src/hooks/useSettings.ts` — upgrade to context provider
- `src/contexts/ConnectionContext.tsx` — `connect(settings)` already accepts settings param
- `src/contexts/TerminologyContext.tsx` — memo key on `settings.terminology` JSON already triggers rebuild
- `src/components/layout/Sidebar.tsx` — add click handlers on status lines
- `src/components/settings/SettingsPage.tsx` — reference for form field patterns

### Canonical Refs
- `src/config/types.ts` — AppSettings interface
- `src/hooks/useSettings.ts` — current settings hook (to upgrade)
- `src/components/layout/Sidebar.tsx` — edit trigger integration point
- `src/contexts/ConnectionContext.tsx` — reconnect API
- `src/contexts/TerminologyContext.tsx` — terminology rebuild trigger

## Deferred Ideas

None.
