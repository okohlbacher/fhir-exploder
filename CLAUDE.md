<!-- GSD:project-start source:PROJECT.md -->
## Project

**FHIR Exploder**

A local-first React application for exploring, browsing, and auditing data on a FHIR server (Blaze). Built with Medplum React components, it provides three entry points — patient-centric browsing, generic resource exploration, and data quality auditing — with the MII Kerndatensatz as an optional navigation lens. Resolves terminology display values via the MII Terminology Server.

**Core Value:** Connect to a Blaze FHIR server and make its contents human-readable and navigable — from patient-level clinical views down to raw FHIR JSON — without requiring deep FHIR expertise to understand what's in there.

### Constraints

- **Tech stack**: React + Vite + TypeScript with Medplum React components — chosen for FHIR-native rendering
- **Runtime**: Local-only, runs in browser against localhost or reachable FHIR server
- **FHIR version**: R4 (Blaze default, MII profiles are R4)
- **Terminology**: Must handle terminology server being unavailable gracefully (fall back to raw codes)
<!-- GSD:project-end -->

<!-- GSD:stack-start source:research/STACK.md -->
## Technology Stack

## Recommended Stack
### Core Framework
| Technology | Version | Purpose | Why | Confidence |
|------------|---------|---------|-----|------------|
| React | ^18.3.1 | UI framework | Medplum 5.x supports React 18 or 19; use 18 for maximum stability with Mantine 8 and broader ecosystem compat. React 19 is fine but unnecessary risk for a local tool. | HIGH |
| TypeScript | ^5.7.0 | Type safety | Required for @medplum/fhirtypes to provide value; pin to 5.x since TS 6.0.2 just shipped and may have edge cases with Medplum's generated types | MEDIUM |
| Vite | ^8.0.8 | Build tool / dev server | Fast HMR, native ESM, first-class React+TS support. Vite 8 is current stable. | HIGH |
### FHIR Libraries (Medplum Ecosystem)
| Technology | Version | Purpose | Why | Confidence |
|------------|---------|---------|-----|------------|
| @medplum/core | 5.1.7 | FHIR client, search utilities, type helpers | MedplumClient provides `search()`, `searchResources()`, `searchResourcePages()`, `readResource()`, `readPatientEverything()`, `valueSetExpand()`. Handles FHIR search param parsing, pagination. Critical: supports `fhirUrlPath` and `baseUrl` for connecting to non-Medplum servers. | HIGH |
| @medplum/fhirtypes | 5.1.7 | FHIR R4 TypeScript types | Comprehensive R4 type definitions (Patient, Bundle, Condition, Observation, etc.). All Medplum components are typed against these. | HIGH |
| @medplum/react | 5.1.7 | FHIR-aware React components | Key components: `ResourceTable`, `SearchControl`, `ResourcePropertyDisplay`, `CodeableConceptDisplay`, `PatientHeader`, `PatientSummary`, `ResourceForm`, `ResourceHistoryTable`, `DiagnosticReportDisplay`, `ObservationTable`. Also: `ResourceName`, `ResourceBadge`, `ReferenceDisplay`. | HIGH |
| @medplum/react-hooks | 5.1.7 | React hooks for FHIR data | `useMedplum()`, `useSearch()`, `useSearchResources()`, `useResource()`, `useMedplumContext()`. Required peer of @medplum/react. | HIGH |
### UI Framework (Mantine -- Required by Medplum)
| Technology | Version | Purpose | Why | Confidence |
|------------|---------|---------|-----|------------|
| @mantine/core | ^8.3.18 | Component library | **Required peer dependency** of @medplum/react 5.x. Not optional. Provides Table, Tabs, Modal, Button, TextInput, Select, Pagination, ActionIcon, Badge, Card, Group, Stack, Grid, Paper, etc. | HIGH |
| @mantine/hooks | ^8.3.18 | Utility hooks | Required peer of @medplum/react. Provides useDisclosure, useLocalStorage, useDebouncedValue, useMediaQuery. | HIGH |
| @mantine/notifications | ^8.3.18 | Toast notifications | Required peer of @medplum/react. Use for error/success feedback on FHIR operations. | HIGH |
| @mantine/spotlight | ^8.3.18 | Command palette / search | Required peer of @medplum/react. Could be useful for quick resource-type switching. | HIGH |
### Configuration
| Technology | Version | Purpose | Why | Confidence |
|------------|---------|---------|-----|------------|
| js-yaml | 4.1.1 | YAML parsing for settings.yaml | De facto standard for YAML in JS. Small, no dependencies, well-maintained. settings.yaml will store server URL, auth config, terminology server URL. | HIGH |
| @types/js-yaml | 4.0.9 | TypeScript types for js-yaml | Required for TS compilation. | HIGH |
### Routing
| Technology | Version | Purpose | Why | Confidence |
|------------|---------|---------|-----|------------|
| react-router-dom | ^7.14.0 | Client-side routing | Three entry points (patient browser, resource explorer, data quality dashboard) need distinct routes. react-router v7 is current stable, well-integrated with React 18. | HIGH |
### Dev Dependencies
| Technology | Version | Purpose | Why | Confidence |
|------------|---------|---------|-----|------------|
| @vitejs/plugin-react | latest | Vite React plugin | Required for JSX transform with Vite. | HIGH |
| @types/react | ^18.3.28 | React type definitions | Required for TypeScript + React 18. | HIGH |
| @types/react-dom | ^18.3.x | ReactDOM type definitions | Required for TypeScript + React 18. | HIGH |
## Key Architecture Decisions
### Connecting MedplumClient to Blaze (Non-Medplum FHIR Server)
- `client.search('Patient', ...)` -- standard FHIR search
- `client.searchResources('Patient', ...)` -- returns Resource[]
- `client.searchResourcePages('Patient', ...)` -- async generator for pagination
- `client.readResource('Patient', 'id')` -- read by ID
- `client.readPatientEverything('id')` -- $everything operation (if Blaze supports it)
- `client.get(url)` / `client.post(url, body)` -- raw HTTP for custom operations
- OAuth login flows (`startLogin`, `signInWithRedirect`) -- these are Medplum-specific
- Bot execution, project management, SMART launch -- Medplum platform features
- `useMedplumProfile()` -- returns the logged-in Medplum user (irrelevant here)
### Terminology Server Integration
### Medplum React Components for This Project
| Component | Use Case | Notes |
|-----------|----------|-------|
| `MedplumProvider` | App-level context | Wraps app, provides MedplumClient to all children via context |
| `SearchControl` | Resource explorer browse/search | Full search UI: filters, sort, pagination, column display. Accepts `SearchRequest` object. This is the workhorse component. |
| `ResourceTable` | Display a bundle/search result as table | Simpler than SearchControl. Good for sub-views. |
| `ResourcePropertyDisplay` | Show a single FHIR property | Renders any FHIR datatype correctly (HumanName, Address, CodeableConcept, etc.) |
| `ResourceForm` | Detailed resource view | Read-only mode available. Shows all resource fields. |
| `CodeableConceptDisplay` | Show coded values | Renders CodeableConcept with display text. Key for terminology display. |
| `PatientHeader` | Patient banner | Shows name, DOB, identifiers, photo. Standard clinical header. |
| `PatientSummary` | Patient overview | Sections: Allergies, Problems, Medications, Labs, Insurance. |
| `ObservationTable` | Lab results | Renders Observation resources in a clinical table format. |
| `DiagnosticReportDisplay` | Diagnostic reports | Renders DiagnosticReport with contained observations. |
| `ReferenceDisplay` | Clickable FHIR references | Resolves and displays Reference fields. |
| `ResourceName` | Display resource name/title | Smart display of resource identifying info. |
| `ResourceHistoryTable` | Resource version history | Shows resource changes over time. |
| Hook | Use Case |
|------|----------|
| `useSearch(resourceType, params)` | Returns Bundle for a search query |
| `useSearchResources(resourceType, params)` | Returns Resource[] (unwrapped from bundle) |
| `useResource(resourceType, id)` | Fetch single resource by ID |
| `useMedplum()` | Access MedplumClient instance |
### CSS Strategy
- CSS-in-JS with className-based styling (no runtime overhead)
- Complete design system with theming
- All layout primitives (Grid, Stack, Group, Flex, Container)
- Dark mode support built-in
- Responsive utilities
- Use `@mantine/core/styles.css` as the base stylesheet
- Custom CSS modules (`.module.css`) for app-specific styling
- Mantine's `createTheme()` for consistent branding
## Alternatives Considered
| Category | Recommended | Alternative | Why Not |
|----------|-------------|-------------|---------|
| FHIR client | @medplum/core | HAPI FHIR JS / fhir.js | Medplum is TypeScript-first, actively maintained, and tightly integrated with @medplum/react components. fhir.js is unmaintained. |
| FHIR types | @medplum/fhirtypes | @types/fhir | @medplum/fhirtypes is more comprehensive and version-locked with the client. @types/fhir exists but is community-maintained with fewer guarantees. |
| FHIR UI | @medplum/react | Build custom components | Medplum provides ResourceTable, SearchControl, CodeableConceptDisplay etc. out of the box. Building from scratch would take weeks for what Medplum provides in hours. |
| UI framework | Mantine 8 | Material UI / Ant Design | Mantine is a required peer dep of @medplum/react. No choice here -- but Mantine is excellent anyway (clean API, good TS support, fast). |
| Build tool | Vite 8 | Next.js / Webpack | Local-only SPA with no SSR needs. Vite is simpler, faster, and the right tool for a client-side-only app. |
| YAML parser | js-yaml | yaml (npm) | js-yaml is smaller, more widely used (50M+ weekly downloads), battle-tested. The `yaml` package is more spec-complete but overkill for a simple config file. |
| State management | React context + hooks | Redux / Zustand | MedplumClient handles caching, React hooks handle data fetching. Minimal app state (settings, active route). No need for a state management library. |
| Routing | react-router-dom v7 | TanStack Router | react-router is the ecosystem standard, Medplum's own examples use it, simpler setup for a 3-route app. |
| React version | React 18 | React 19 | React 19 works with Mantine 8 and Medplum 5, but React 18 is more battle-tested. React 19's new features (actions, use()) aren't needed for this read-only explorer. Lower risk. |
| Virtualization | @tanstack/react-virtual | react-window | TanStack Virtual is the actively maintained successor. Use for large resource lists (50K+ resources). Only add if pagination alone isn't sufficient. |
## Do NOT Use
| Technology | Reason |
|------------|--------|
| Mantine 9.x | Requires React 19 exclusively; incompatible with @medplum/react 5.x which peers on Mantine ^8.0.0 |
| @tanstack/react-query | MedplumClient + useSearch/useSearchResources already handle caching and data fetching. Adding react-query would create two competing cache layers. |
| Tailwind CSS | Conflicts with Mantine's styling system. Mantine IS the design system. |
| SMART on FHIR libraries | Out of scope per PROJECT.md. Blaze access is direct, not via SMART launch. |
| GraphQL FHIR | Blaze supports FHIR REST, not FHIR GraphQL. Stick to REST search. |
| Next.js / Remix | This is a local SPA, not a web application needing SSR/SSG. Vite is correct. |
## Installation
# Core dependencies
# Peer dependency of @medplum/react (not used directly but required)
# Dev dependencies
# Optional: add later if pagination isn't enough for 50K+ resources
# npm install @tanstack/react-virtual@^3.13.0
## Dependency Graph
## Sources
- npm registry: `npm view` commands for all version numbers (verified 2026-04-11)
- @medplum/react peer dependencies: verified from npm metadata
- @medplum/core MedplumClientOptions: verified from installed package TypeScript declarations
- @medplum/react component list: verified from installed package TypeScript declarations
- Mantine 8 vs 9 React requirements: verified from npm peer dependency metadata
<!-- GSD:stack-end -->

<!-- GSD:conventions-start source:CONVENTIONS.md -->
## Conventions

Conventions not yet established. Will populate as patterns emerge during development.
<!-- GSD:conventions-end -->

<!-- GSD:architecture-start source:ARCHITECTURE.md -->
## Architecture

Architecture not yet mapped. Follow existing patterns found in the codebase.
<!-- GSD:architecture-end -->

<!-- GSD:skills-start source:skills/ -->
## Project Skills

No project skills found. Add skills to any of: `.claude/skills/`, `.agents/skills/`, `.cursor/skills/`, or `.github/skills/` with a `SKILL.md` index file.
<!-- GSD:skills-end -->

<!-- GSD:workflow-start source:GSD defaults -->
## GSD Workflow Enforcement

Before using Edit, Write, or other file-changing tools, start work through a GSD command so planning artifacts and execution context stay in sync.

Use these entry points:
- `/gsd-quick` for small fixes, doc updates, and ad-hoc tasks
- `/gsd-debug` for investigation and bug fixing
- `/gsd-execute-phase` for planned phase work

Do not make direct repo edits outside a GSD workflow unless the user explicitly asks to bypass it.
<!-- GSD:workflow-end -->



<!-- GSD:profile-start -->
## Developer Profile

> Profile not yet configured. Run `/gsd-profile-user` to generate your developer profile.
> This section is managed by `generate-claude-profile` -- do not edit manually.
<!-- GSD:profile-end -->
