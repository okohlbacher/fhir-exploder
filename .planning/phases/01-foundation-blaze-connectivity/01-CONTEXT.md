# Phase 1: Foundation & Blaze Connectivity - Context

**Gathered:** 2026-04-11
**Status:** Ready for planning

<domain>
## Phase Boundary

Deliver the app shell, settings.yaml-based configuration, Blaze FHIR server connection with CapabilityStatement discovery, error handling, loading indicators, and a Medplum React compatibility gate. Users can connect to a Blaze server and see that it works.

</domain>

<decisions>
## Implementation Decisions

### App Shell & Navigation
- **D-01:** Persistent left sidebar with icons/labels for each entry point (Explorer, Patients, Quality, Settings). Logo/title at top, settings at bottom.
- **D-02:** Landing page shows connection status — server info, connection health, and resource type list from CapabilityStatement after successful connect.
- **D-03:** Light theme using Mantine's default light theme. Clean, clinical look optimized for data-heavy tables and JSON.

### Settings Management
- **D-04:** File-only editing — users edit settings.yaml in their text editor. App reads on startup. Settings page shows current config read-only.
- **D-05:** settings.yaml lives at the project root (`./settings.yaml`).
- **D-06:** Sensible defaults when settings.yaml is missing — fall back to `localhost:8080` with open auth. Show a warning banner that defaults are in use.

### CapabilityStatement Display
- **D-07:** Resource types displayed in a grouped list organized by FHIR category (Clinical, Financial, Foundation, etc.).
- **D-08:** Each resource type shows: resource count, supported search parameters, and supported operations.
- **D-09:** Resource counts lazy-loaded in background — show the list immediately with per-type spinners, then populate counts as they arrive.
- **D-10:** Resource types are clickable links that navigate to the Resource Explorer (dead links until Phase 2, but navigation structure is ready).

### Connection Flow & Feedback
- **D-11:** Manual connect — app loads and shows current config, user clicks a "Connect" button to initiate connection. No auto-connect on startup.
- **D-12:** Connection status indicator lives at the top of the sidebar — colored dot/badge showing connected/disconnected/error. Always visible.
- **D-13:** Connection errors displayed inline in the main content area — clear description, error details, and actionable fix suggestions (check URL, check if Blaze is running, etc.).

### Claude's Discretion
- No areas deferred to Claude's discretion — all decisions were user-specified.

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

No external specs — requirements fully captured in decisions above. Key project files:

### Project Documentation
- `.planning/PROJECT.md` — Project vision, constraints, key decisions
- `.planning/REQUIREMENTS.md` — CONN-01 through CONN-05 requirements for this phase
- `.planning/ROADMAP.md` — Phase 1 success criteria and dependencies
- `CLAUDE.md` — Technology stack details, Medplum component reference, architecture decisions

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- None — greenfield project. Only CLAUDE.md exists in the repo.

### Established Patterns
- None yet — Phase 1 establishes all foundational patterns (component structure, state management, data fetching, styling).

### Integration Points
- MedplumClient connection to Blaze (non-Medplum FHIR server) using `baseUrl` and `fhirUrlPath` configuration
- Mantine UI framework required as peer dependency of @medplum/react
- react-router-dom for sidebar navigation routes
- js-yaml for parsing settings.yaml

</code_context>

<specifics>
## Specific Ideas

No specific requirements — open to standard approaches within the decisions captured above.

</specifics>

<deferred>
## Deferred Ideas

None — discussion stayed within phase scope.

</deferred>

---

*Phase: 01-foundation-blaze-connectivity*
*Context gathered: 2026-04-11*
