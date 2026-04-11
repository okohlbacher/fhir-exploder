# Phase 1: Foundation & Blaze Connectivity - Research

**Researched:** 2026-04-11
**Domain:** React/Vite project scaffolding, FHIR server connectivity via Medplum SDK, CapabilityStatement parsing
**Confidence:** HIGH

## Summary

Phase 1 is greenfield scaffolding: create a Vite + React + TypeScript project, wire up Mantine 8 and Medplum React, build an app shell with sidebar navigation, implement settings.yaml configuration loading, connect to a Blaze FHIR server via MedplumClient, parse the CapabilityStatement to display supported resource types, and handle errors and loading states throughout.

The critical technical risk is MedplumClient compatibility with Blaze (a non-Medplum FHIR server). MedplumClient supports `baseUrl` and `fhirUrlPath` constructor options for connecting to arbitrary FHIR servers, and Blaze exposes a standard FHIR REST API at `http://localhost:8080/fhir`. The compatibility gate (success criterion 5) should be tested early. A secondary concern is loading settings.yaml in a browser context -- the file must be served as a static asset and fetched at runtime, since browsers cannot read the local filesystem.

**Primary recommendation:** Scaffold with `npm create vite@latest`, configure MedplumClient with `baseUrl` pointing at Blaze, fetch `settings.yaml` from the `public/` directory at runtime, and use MedplumClient's `get()` method to fetch the CapabilityStatement directly from `/fhir/metadata`.

<user_constraints>

## User Constraints (from CONTEXT.md)

### Locked Decisions
- **D-01:** Persistent left sidebar with icons/labels for each entry point (Explorer, Patients, Quality, Settings). Logo/title at top, settings at bottom.
- **D-02:** Landing page shows connection status -- server info, connection health, and resource type list from CapabilityStatement after successful connect.
- **D-03:** Light theme using Mantine's default light theme. Clean, clinical look optimized for data-heavy tables and JSON.
- **D-04:** File-only editing -- users edit settings.yaml in their text editor. App reads on startup. Settings page shows current config read-only.
- **D-05:** settings.yaml lives at the project root (`./settings.yaml`).
- **D-06:** Sensible defaults when settings.yaml is missing -- fall back to `localhost:8080` with open auth. Show a warning banner that defaults are in use.
- **D-07:** Resource types displayed in a grouped list organized by FHIR category (Clinical, Financial, Foundation, etc.).
- **D-08:** Each resource type shows: resource count, supported search parameters, and supported operations.
- **D-09:** Resource counts lazy-loaded in background -- show the list immediately with per-type spinners, then populate counts as they arrive.
- **D-10:** Resource types are clickable links that navigate to the Resource Explorer (dead links until Phase 2, but navigation structure is ready).
- **D-11:** Manual connect -- app loads and shows current config, user clicks a "Connect" button to initiate connection. No auto-connect on startup.
- **D-12:** Connection status indicator lives at the top of the sidebar -- colored dot/badge showing connected/disconnected/error. Always visible.
- **D-13:** Connection errors displayed inline in the main content area -- clear description, error details, and actionable fix suggestions.

### Claude's Discretion
No areas deferred to Claude's discretion -- all decisions were user-specified.

### Deferred Ideas (OUT OF SCOPE)
None.

</user_constraints>

<phase_requirements>

## Phase Requirements

| ID | Description | Research Support |
|----|-------------|------------------|
| CONN-01 | User can configure FHIR server URL, auth mode (open/basic/bearer), and credentials in a settings.yaml file | settings.yaml schema design, js-yaml parsing, runtime fetch from public/ directory |
| CONN-02 | App reads settings.yaml at startup and connects to the configured FHIR server | MedplumClient constructor with baseUrl/fhirUrlPath/accessToken options, fetch-based YAML loading |
| CONN-03 | App fetches and parses the server's CapabilityStatement to discover supported resource types, search parameters, and operations | Blaze /fhir/metadata endpoint, CapabilityStatement.rest[0].resource array, FHIR resource category mapping |
| CONN-04 | App displays clear error messages when the FHIR server is unreachable or returns errors | Error classification (network, auth, invalid response), Mantine Alert component |
| CONN-05 | App shows loading indicators during FHIR server requests | Mantine Loader/Skeleton components, React state management for async operations |

</phase_requirements>

## Standard Stack

### Core (verified against npm registry 2026-04-11)

| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| react | ^18.3.1 | UI framework | Medplum 5.x peers on react ^18.0.0 or ^19.0.0; React 18 is more stable choice [VERIFIED: npm registry] |
| react-dom | ^18.3.1 | DOM rendering | Required companion to React [VERIFIED: npm registry] |
| typescript | ^5.7.0 | Type safety | Required for @medplum/fhirtypes [VERIFIED: npm registry] |
| vite | ^8.0.8 | Build tool / dev server | Current stable, fast HMR [VERIFIED: npm registry -- 8.0.8] |
| @medplum/core | 5.1.7 | FHIR client | MedplumClient for Blaze connectivity [VERIFIED: npm registry] |
| @medplum/fhirtypes | 5.1.7 | FHIR R4 TypeScript types | Type definitions for CapabilityStatement, Bundle, etc. [VERIFIED: npm registry] |
| @medplum/react | 5.1.7 | FHIR-aware React components | MedplumProvider, compatibility gate [VERIFIED: npm registry] |
| @medplum/react-hooks | 5.1.7 | React hooks for FHIR | useMedplum(), required peer of @medplum/react [VERIFIED: npm registry] |
| @mantine/core | ^8.3.18 | Component library | Required peer of @medplum/react (peers on ^8.0.0). Latest 8.x is 8.3.18. Do NOT use 9.x (requires React 19 exclusively). [VERIFIED: npm registry] |
| @mantine/hooks | ^8.3.18 | Utility hooks | Required peer of @medplum/react [VERIFIED: npm registry] |
| @mantine/notifications | ^8.3.18 | Toast notifications | Required peer of @medplum/react [VERIFIED: npm registry] |
| @mantine/spotlight | ^8.3.18 | Command palette | Required peer of @medplum/react [VERIFIED: npm registry] |
| react-router-dom | ^7.14.0 | Client-side routing | Sidebar navigation, 4 routes [VERIFIED: npm registry] |
| js-yaml | 4.1.1 | YAML parsing | Parse settings.yaml at runtime [VERIFIED: npm registry] |
| @tabler/icons-react | ^3.41.1 | Icons | Mantine ecosystem default icon library [VERIFIED: npm registry] |

### Dev Dependencies

| Library | Version | Purpose |
|---------|---------|---------|
| @vitejs/plugin-react | ^6.0.1 | Vite React plugin [VERIFIED: npm registry] |
| @types/react | ^18.3.28 | React type definitions |
| @types/react-dom | ^18.3.x | ReactDOM type definitions |
| @types/js-yaml | ^4.0.9 | js-yaml type definitions |
| vitest | ^4.1.4 | Test framework [VERIFIED: npm registry] |
| @testing-library/react | ^16.3.2 | React testing utilities [VERIFIED: npm registry] |

### Also Required (Medplum peer deps not directly used)

| Library | Version | Reason |
|---------|---------|--------|
| rfc6902 | ^5.0.1 | Peer dependency of @medplum/react [VERIFIED: npm peer deps] |
| signature_pad | ^5.0.10 | Peer dependency of @medplum/react [VERIFIED: npm peer deps] |

### Installation

```bash
# Core
npm install react react-dom @medplum/core@5.1.7 @medplum/fhirtypes@5.1.7 @medplum/react@5.1.7 @medplum/react-hooks@5.1.7

# Mantine (pin to 8.x)
npm install @mantine/core@^8.3.18 @mantine/hooks@^8.3.18 @mantine/notifications@^8.3.18 @mantine/spotlight@^8.3.18

# Medplum peer deps
npm install rfc6902 signature_pad

# Routing, config, icons
npm install react-router-dom js-yaml @tabler/icons-react

# Dev deps
npm install -D typescript @vitejs/plugin-react @types/react @types/react-dom @types/js-yaml vitest @testing-library/react
```

## Architecture Patterns

### Recommended Project Structure

```
src/
  main.tsx                   # Entry point, React root
  App.tsx                    # MedplumProvider + MantineProvider + Router + AppShell
  theme.ts                   # Mantine createTheme() configuration
  config/
    settings.ts              # Settings type, load/parse logic, defaults
    types.ts                 # AppSettings interface
  fhir/
    client.ts                # MedplumClient factory, connection logic
    capability.ts            # CapabilityStatement parsing, resource categorization
    types.ts                 # Parsed capability types
  components/
    layout/
      AppShell.tsx           # Mantine AppShell with sidebar
      Sidebar.tsx            # Navigation + connection status indicator
      ConnectionStatus.tsx   # Colored dot + label component
    dashboard/
      DashboardPage.tsx      # Landing page (D-02)
      ServerInfoCard.tsx     # Server URL, auth mode, Connect button
      ResourceTypeList.tsx   # Grouped resource type display (D-07)
      ResourceTypeGroup.tsx  # Single category accordion section
      ResourceTypeRow.tsx    # Single resource type with count/params/ops
    settings/
      SettingsPage.tsx       # Read-only settings display (D-04)
  hooks/
    useSettings.ts           # Load and cache settings.yaml
    useConnection.ts         # Connection state machine
    useResourceCounts.ts     # Lazy-load resource counts (D-09)
  utils/
    fhir-categories.ts       # FHIR resource type -> category mapping
    errors.ts                # Error classification and message generation
public/
  settings.yaml              # User-editable configuration file
```

### Pattern 1: Settings Loading via fetch() from public/

**What:** Load `settings.yaml` at runtime by fetching it as a static asset from the `public/` directory.

**Why this approach:** D-05 says settings.yaml lives at "project root." In a Vite SPA, the browser cannot access the filesystem. Files in `public/` are served at `/` during dev and copied to `dist/` on build. Placing `settings.yaml` in `public/` makes it fetchable at `/settings.yaml` and editable by users. This is the standard Vite pattern for runtime configuration files. [CITED: vite.dev/config/shared-options -- publicDir documentation]

**Example:**
```typescript
// src/config/settings.ts
import yaml from 'js-yaml';

export interface AppSettings {
  fhir: {
    serverUrl: string;    // e.g., "http://localhost:8080/fhir"
    auth: {
      mode: 'open' | 'basic' | 'bearer';
      username?: string;  // for basic auth
      password?: string;  // for basic auth
      token?: string;     // for bearer auth
    };
  };
  terminology?: {
    serverUrl?: string;   // MII Terminology Server URL (future phases)
  };
}

const DEFAULTS: AppSettings = {
  fhir: {
    serverUrl: 'http://localhost:8080/fhir',
    auth: { mode: 'open' },
  },
};

export async function loadSettings(): Promise<{ settings: AppSettings; usingDefaults: boolean }> {
  try {
    const response = await fetch('/settings.yaml');
    if (!response.ok) {
      return { settings: DEFAULTS, usingDefaults: true };
    }
    const text = await response.text();
    const parsed = yaml.load(text) as Partial<AppSettings>;
    // Merge with defaults for missing fields
    return {
      settings: { ...DEFAULTS, ...parsed, fhir: { ...DEFAULTS.fhir, ...parsed?.fhir } },
      usingDefaults: false,
    };
  } catch {
    return { settings: DEFAULTS, usingDefaults: true };
  }
}
```

### Pattern 2: MedplumClient for Blaze Connection

**What:** Configure MedplumClient to connect to a Blaze FHIR server using `baseUrl` and `fhirUrlPath`.

**Critical detail:** Blaze exposes its FHIR API at `http://localhost:8080/fhir`. MedplumClient's `baseUrl` is the server root and `fhirUrlPath` is the path appended for FHIR operations. So for a settings URL of `http://localhost:8080/fhir`, we extract the base (`http://localhost:8080`) and the path (`fhir/`). [VERIFIED: medplum.com/docs/sdk/core.medplumclientoptions -- baseUrl and fhirUrlPath documented]

**Example:**
```typescript
// src/fhir/client.ts
import { MedplumClient } from '@medplum/core';
import type { AppSettings } from '../config/settings';

export function createFhirClient(settings: AppSettings): MedplumClient {
  // Parse serverUrl into baseUrl + fhirUrlPath
  // e.g., "http://localhost:8080/fhir" -> base="http://localhost:8080", path="fhir/"
  const url = new URL(settings.fhir.serverUrl);
  const baseUrl = `${url.protocol}//${url.host}`;
  const fhirUrlPath = url.pathname.replace(/^\//, '').replace(/\/?$/, '/');

  const options: Record<string, unknown> = {
    baseUrl,
    fhirUrlPath,
    // Disable Medplum-specific extended mode for non-Medplum servers
    // extendedMode defaults to true -- set false for standard FHIR servers
  };

  // Auth configuration
  if (settings.fhir.auth.mode === 'bearer' && settings.fhir.auth.token) {
    options.accessToken = settings.fhir.auth.token;
  } else if (settings.fhir.auth.mode === 'basic') {
    // MedplumClient doesn't natively support basic auth --
    // use defaultHeaders to add Authorization header
    const credentials = btoa(
      `${settings.fhir.auth.username}:${settings.fhir.auth.password}`
    );
    options.defaultHeaders = { Authorization: `Basic ${credentials}` };
  }
  // 'open' mode: no auth headers needed

  return new MedplumClient(options);
}
```

### Pattern 3: CapabilityStatement Parsing

**What:** Fetch the CapabilityStatement from Blaze's `/metadata` endpoint and extract resource types with search parameters and operations.

**FHIR standard:** The CapabilityStatement is available at `[base]/metadata`. The `rest[0].resource` array contains one entry per supported resource type, each with `type` (resource name), `searchParam` (array of supported search parameters), and `operation` (array of supported operations). [CITED: hl7.org/fhir/capabilitystatement.html]

**Example:**
```typescript
// src/fhir/capability.ts
import type { CapabilityStatement, CapabilityStatementRestResource } from '@medplum/fhirtypes';
import type { MedplumClient } from '@medplum/core';

export interface ParsedResourceType {
  type: string;
  searchParams: string[];
  operations: string[];
  category: string;  // from FHIR category mapping
}

export async function fetchCapabilityStatement(
  client: MedplumClient
): Promise<CapabilityStatement> {
  // MedplumClient.get() makes a raw GET request
  // The metadata endpoint is at [fhirUrlPath]/metadata
  return client.get('metadata').then(res => res as CapabilityStatement);
}

export function parseResourceTypes(
  capabilityStatement: CapabilityStatement
): ParsedResourceType[] {
  const restResources = capabilityStatement.rest?.[0]?.resource ?? [];

  return restResources.map((resource: CapabilityStatementRestResource) => ({
    type: resource.type ?? 'Unknown',
    searchParams: (resource.searchParam ?? []).map(sp => sp.name ?? ''),
    operations: (resource.operation ?? []).map(op => op.name ?? ''),
    category: getResourceCategory(resource.type ?? ''),
  }));
}
```

### Pattern 4: FHIR Resource Category Mapping

**What:** Map FHIR resource type names to human-readable categories for grouped display (D-07).

**Note:** FHIR does not include category information in the CapabilityStatement itself. The category mapping must be hardcoded based on the FHIR specification's resource list. [CITED: hl7.org/fhir/resourcelist.html]

**Example:**
```typescript
// src/utils/fhir-categories.ts

// Based on FHIR R4 specification resource list
const CATEGORY_MAP: Record<string, string> = {
  // Foundation
  CapabilityStatement: 'Foundation',
  StructureDefinition: 'Foundation',
  OperationDefinition: 'Foundation',
  SearchParameter: 'Foundation',
  CompartmentDefinition: 'Foundation',
  CodeSystem: 'Foundation',
  ValueSet: 'Foundation',
  ConceptMap: 'Foundation',
  NamingSystem: 'Foundation',
  Bundle: 'Foundation',
  Binary: 'Foundation',
  Basic: 'Foundation',
  OperationOutcome: 'Foundation',
  Parameters: 'Foundation',
  Subscription: 'Foundation',

  // Individuals
  Patient: 'Individuals',
  Practitioner: 'Individuals',
  PractitionerRole: 'Individuals',
  RelatedPerson: 'Individuals',
  Person: 'Individuals',
  Group: 'Individuals',

  // Entities
  Organization: 'Entities',
  HealthcareService: 'Entities',
  Endpoint: 'Entities',
  Location: 'Entities',
  Substance: 'Entities',
  Device: 'Entities',
  DeviceMetric: 'Entities',

  // Workflow
  Task: 'Workflow',
  Appointment: 'Workflow',
  AppointmentResponse: 'Workflow',
  Schedule: 'Workflow',
  Slot: 'Workflow',
  Encounter: 'Workflow',
  EpisodeOfCare: 'Workflow',
  Flag: 'Workflow',
  List: 'Workflow',

  // Clinical
  AllergyIntolerance: 'Clinical',
  Condition: 'Clinical',
  Procedure: 'Clinical',
  FamilyMemberHistory: 'Clinical',
  ClinicalImpression: 'Clinical',
  AdverseEvent: 'Clinical',
  DetectedIssue: 'Clinical',

  // Diagnostics
  Observation: 'Diagnostics',
  DiagnosticReport: 'Diagnostics',
  Specimen: 'Diagnostics',
  BodyStructure: 'Diagnostics',
  ImagingStudy: 'Diagnostics',
  QuestionnaireResponse: 'Diagnostics',
  DocumentReference: 'Diagnostics',

  // Medications
  Medication: 'Medications',
  MedicationRequest: 'Medications',
  MedicationAdministration: 'Medications',
  MedicationDispense: 'Medications',
  MedicationStatement: 'Medications',
  MedicationKnowledge: 'Medications',
  Immunization: 'Medications',
  ImmunizationEvaluation: 'Medications',
  ImmunizationRecommendation: 'Medications',

  // Care Provision
  CarePlan: 'Care Provision',
  CareTeam: 'Care Provision',
  Goal: 'Care Provision',
  ServiceRequest: 'Care Provision',
  NutritionOrder: 'Care Provision',
  VisionPrescription: 'Care Provision',
  RiskAssessment: 'Care Provision',

  // Financial
  Coverage: 'Financial',
  Claim: 'Financial',
  ClaimResponse: 'Financial',
  Account: 'Financial',
  ChargeItem: 'Financial',
  Invoice: 'Financial',
  PaymentNotice: 'Financial',
  ExplanationOfBenefit: 'Financial',
  InsurancePlan: 'Financial',

  // Security
  Provenance: 'Security',
  AuditEvent: 'Security',
  Consent: 'Security',

  // Documents
  Composition: 'Documents',
  DocumentManifest: 'Documents',

  // Communication
  Communication: 'Communication',
  CommunicationRequest: 'Communication',

  // Research
  ResearchStudy: 'Research',
  ResearchSubject: 'Research',

  // Quality & Testing
  Measure: 'Quality',
  MeasureReport: 'Quality',
  TestScript: 'Quality',
  TestReport: 'Quality',
};

export function getResourceCategory(resourceType: string): string {
  return CATEGORY_MAP[resourceType] ?? 'Other';
}

export function groupByCategory(
  resources: Array<{ type: string; category: string }>
): Map<string, typeof resources> {
  const groups = new Map<string, typeof resources>();
  for (const resource of resources) {
    const existing = groups.get(resource.category) ?? [];
    existing.push(resource);
    groups.set(resource.category, existing);
  }
  return groups;
}
```

### Pattern 5: Connection State Machine

**What:** Manage connection lifecycle with explicit states: idle -> connecting -> connected | error.

**Example:**
```typescript
// src/hooks/useConnection.ts
import { useState, useCallback } from 'react';
import type { MedplumClient } from '@medplum/core';
import type { CapabilityStatement } from '@medplum/fhirtypes';
import { createFhirClient } from '../fhir/client';
import { fetchCapabilityStatement } from '../fhir/capability';
import type { AppSettings } from '../config/settings';

type ConnectionState =
  | { status: 'idle' }
  | { status: 'connecting' }
  | { status: 'connected'; client: MedplumClient; capability: CapabilityStatement }
  | { status: 'error'; error: ConnectionError };

interface ConnectionError {
  type: 'network' | 'auth' | 'invalid_response' | 'unknown';
  message: string;
  details?: string;
}

export function useConnection() {
  const [state, setState] = useState<ConnectionState>({ status: 'idle' });

  const connect = useCallback(async (settings: AppSettings) => {
    setState({ status: 'connecting' });
    try {
      const client = createFhirClient(settings);
      const capability = await fetchCapabilityStatement(client);
      setState({ status: 'connected', client, capability });
    } catch (err) {
      setState({ status: 'error', error: classifyError(err) });
    }
  }, []);

  const disconnect = useCallback(() => {
    setState({ status: 'idle' });
  }, []);

  return { state, connect, disconnect };
}

function classifyError(err: unknown): ConnectionError {
  if (err instanceof TypeError && (err as Error).message.includes('fetch')) {
    return { type: 'network', message: 'Cannot reach FHIR server', details: (err as Error).message };
  }
  // Add more classification logic for HTTP status codes
  return { type: 'unknown', message: 'Connection failed', details: String(err) };
}
```

### Pattern 6: Vite Proxy for CORS

**What:** Configure Vite's dev server proxy to avoid CORS issues when the browser makes requests to Blaze.

**Why:** Blaze does not set CORS headers by default. During development, the Vite dev server (port 5173) makes requests to Blaze (port 8080), which is a cross-origin request. The Vite proxy forwards these requests server-side, avoiding CORS entirely. [CITED: vite.dev/config/server-options -- server.proxy]

**Critical consideration for MedplumClient:** MedplumClient constructs URLs using `baseUrl + fhirUrlPath`. If we use Vite proxy, the `baseUrl` in development should point to the Vite dev server (e.g., `http://localhost:5173`) with a proxy path (e.g., `/fhir-proxy`), NOT directly to Blaze. However, this adds complexity -- the `serverUrl` in settings.yaml would need to differ between dev and production.

**Simpler alternative:** Configure Blaze to allow CORS by setting the `CORS_ALLOW_ORIGIN` environment variable (Blaze supports this). Or use the Vite proxy transparently. [ASSUMED]

**Recommended approach:** Use Vite proxy for development. The proxy rewrites `/fhir` to the Blaze server.

```typescript
// vite.config.ts
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  server: {
    proxy: {
      // Proxy /fhir requests to Blaze during development
      '/fhir': {
        target: 'http://localhost:8080',
        changeOrigin: true,
      },
    },
  },
});
```

**Note:** With this proxy, `settings.yaml` can use `serverUrl: "/fhir"` (relative) for dev, or `http://localhost:8080/fhir` (absolute) for direct access. The app should handle both relative and absolute URLs.

### Anti-Patterns to Avoid

- **Do NOT auto-connect on startup:** D-11 explicitly requires manual connect via button click. Resist the urge to auto-fetch the CapabilityStatement on mount.
- **Do NOT use MedplumClient.startLogin() or signInWithRedirect():** These are Medplum-platform-specific OAuth flows. For Blaze, use `accessToken` or `defaultHeaders` for auth.
- **Do NOT use `useMedplumProfile()`:** Returns the Medplum-authenticated user, which is irrelevant for a non-Medplum server.
- **Do NOT use Mantine 9.x:** It requires React 19 exclusively and is incompatible with @medplum/react 5.x.
- **Do NOT put settings.yaml outside `public/`:** The browser cannot access files outside the served directory.

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| FHIR client / HTTP layer | Custom fetch wrapper for FHIR | MedplumClient | Handles pagination, content negotiation, caching, FHIR-specific headers |
| FHIR type definitions | Manual TypeScript interfaces for FHIR resources | @medplum/fhirtypes | 145+ resource types with all nested types, maintained by Medplum team |
| YAML parsing | Custom config parser | js-yaml | Battle-tested, handles edge cases (multiline strings, anchors, etc.) |
| App shell layout | Custom CSS grid layout | Mantine AppShell | Handles responsive sidebar, scrolling, padding, theming |
| Loading indicators | Custom CSS spinners | Mantine Loader, Skeleton | Consistent with design system, theme-aware |
| Error display | Custom error banners | Mantine Alert | Icon support, color variants, consistent styling |
| Navigation | Custom link/active-state management | Mantine NavLink + react-router | Active state, icon support, nested navigation built-in |
| Icon system | SVG imports or icon fonts | @tabler/icons-react | Mantine ecosystem default, tree-shakeable, 5000+ icons |

**Key insight:** Phase 1 should lean heavily on Mantine components and Medplum infrastructure. The only custom logic is the settings loader, the CapabilityStatement parser, the resource category mapping, the connection state machine, and the resource count fetcher. Everything else is composition of existing components.

## Common Pitfalls

### Pitfall 1: MedplumClient Medplum-Specific Behavior

**What goes wrong:** MedplumClient has features that assume a Medplum server backend. If these are triggered against Blaze, requests may fail silently or with confusing errors.
**Why it happens:** `extendedMode` defaults to `true`, which adds Medplum-specific headers/params. Login flows assume Medplum OAuth.
**How to avoid:** Do NOT call any auth/login methods. Consider setting `extendedMode: false` if it causes issues (test during compatibility gate). Only use FHIR-standard methods: `get()`, `search()`, `readResource()`.
**Warning signs:** Unexpected 400/404 errors from Blaze, requests with `_medplum` parameters. [ASSUMED -- needs validation during compatibility gate]

### Pitfall 2: CORS During Development

**What goes wrong:** Browser blocks requests from `localhost:5173` (Vite) to `localhost:8080` (Blaze) due to same-origin policy.
**Why it happens:** Blaze does not set CORS headers by default. Cross-port is cross-origin.
**How to avoid:** Configure Vite dev server proxy from day one. Every FHIR request goes through the proxy during development.
**Warning signs:** "Access to fetch at 'http://localhost:8080/fhir/metadata' from origin 'http://localhost:5173' has been blocked by CORS policy."

### Pitfall 3: settings.yaml Location Confusion

**What goes wrong:** User edits a `settings.yaml` at the project root but the app reads from `public/settings.yaml`, leading to "my changes aren't working."
**Why it happens:** D-05 says "project root" but the browser can only access files in the `public/` directory.
**How to avoid:** Place the canonical `settings.yaml` in `public/`. Document clearly that `public/settings.yaml` is the file to edit. Consider adding a symlink from project root, or a Vite middleware that serves `./settings.yaml` from project root.
**Warning signs:** 404 when fetching `/settings.yaml`, stale configuration after edits.

### Pitfall 4: Resource Count Fetching Overload

**What goes wrong:** Fetching `?_summary=count` for every resource type simultaneously creates a burst of concurrent requests that overwhelms Blaze or causes browser connection limits.
**Why it happens:** D-09 requires lazy-loading counts in background. Naive implementation fires all requests at once.
**How to avoid:** Implement a concurrency limiter (e.g., fetch counts in batches of 3-5 concurrent requests). Use `Promise.allSettled` so one failure doesn't block others. Consider `MedplumClient.autoBatchTime` option to batch requests.
**Warning signs:** Many failed requests, Blaze returning 429 or timeouts, browser showing "net::ERR_INSUFFICIENT_RESOURCES."

### Pitfall 5: MedplumProvider Without Authentication

**What goes wrong:** `MedplumProvider` may expect or enforce authentication state. Without a logged-in user, Medplum hooks may not work as expected.
**Why it happens:** MedplumProvider is designed for Medplum applications with authenticated users.
**How to avoid:** Test the compatibility gate early. If MedplumProvider does not work without authentication, use MedplumClient directly (without the Provider/hooks ecosystem) and pass it through React context manually.
**Warning signs:** useMedplum() returning null, components refusing to render, console errors about missing profile. [ASSUMED -- needs testing]

### Pitfall 6: Mantine AppShell CSS Import Order

**What goes wrong:** Mantine components render unstyled or with broken layout.
**Why it happens:** `@mantine/core/styles.css` must be imported before any component usage, typically in `main.tsx`.
**How to avoid:** Import `@mantine/core/styles.css` as the first CSS import in `main.tsx`. If using @mantine/notifications, also import `@mantine/notifications/styles.css`.
**Warning signs:** Unstyled buttons, broken grid layout, console warnings about missing styles.

## Code Examples

### Vite Project Scaffolding

```bash
# Source: vite.dev/guide
npm create vite@latest fhir-exploder -- --template react-ts
cd fhir-exploder
```

### Mantine + Medplum Provider Setup

```typescript
// src/main.tsx
import '@mantine/core/styles.css';
import '@mantine/notifications/styles.css';

import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { MantineProvider } from '@mantine/core';
import { Notifications } from '@mantine/notifications';
import { BrowserRouter } from 'react-router-dom';
import { theme } from './theme';
import { App } from './App';

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <MantineProvider theme={theme} defaultColorScheme="light">
      <Notifications />
      <BrowserRouter>
        <App />
      </BrowserRouter>
    </MantineProvider>
  </StrictMode>
);
```

### Mantine Theme Configuration

```typescript
// src/theme.ts
import { createTheme } from '@mantine/core';

export const theme = createTheme({
  fontFamily: '-apple-system, BlinkMacSystemFont, Segoe UI, Roboto, Helvetica, Arial, sans-serif',
  fontSizes: { xs: '12px', sm: '14px', md: '16px', lg: '18px', xl: '20px' },
  defaultRadius: 'sm',
  primaryColor: 'blue',
});
```

### Mantine AppShell with Sidebar

```typescript
// Source: mantine.dev/core/app-shell
import { AppShell, NavLink, Group, Text, Badge } from '@mantine/core';
import { IconDatabase, IconUsers, IconChartBar, IconSettings } from '@tabler/icons-react';

function AppLayout() {
  return (
    <AppShell
      navbar={{ width: 240, breakpoint: 0 }}
      padding="lg"
    >
      <AppShell.Navbar p="md" bg="gray.0">
        <AppShell.Section>
          <Text fw={600} size="lg">FHIR Exploder</Text>
          <ConnectionStatusBadge />
        </AppShell.Section>

        <AppShell.Section grow mt="md">
          <NavLink label="Explorer" leftSection={<IconDatabase size={20} />} />
          <NavLink label="Patients" leftSection={<IconUsers size={20} />} />
          <NavLink label="Quality" leftSection={<IconChartBar size={20} />} />
        </AppShell.Section>

        <AppShell.Section>
          <NavLink label="Settings" leftSection={<IconSettings size={20} />} />
        </AppShell.Section>
      </AppShell.Navbar>

      <AppShell.Main>
        {/* Route content renders here */}
      </AppShell.Main>
    </AppShell>
  );
}
```

### Fetching Resource Counts with Concurrency Limit

```typescript
// src/hooks/useResourceCounts.ts
import { useState, useEffect } from 'react';
import type { MedplumClient } from '@medplum/core';

export function useResourceCounts(
  client: MedplumClient | null,
  resourceTypes: string[]
) {
  const [counts, setCounts] = useState<Record<string, number | 'loading' | 'error'>>({});

  useEffect(() => {
    if (!client || resourceTypes.length === 0) return;

    // Initialize all as loading
    const initial: Record<string, 'loading'> = {};
    resourceTypes.forEach(rt => { initial[rt] = 'loading'; });
    setCounts(initial);

    // Fetch with concurrency limit
    const CONCURRENCY = 4;
    let index = 0;

    async function fetchNext() {
      while (index < resourceTypes.length) {
        const rt = resourceTypes[index++];
        try {
          // _summary=count returns Bundle with total but no entries
          const bundle = await client!.search(rt, '_summary=count');
          setCounts(prev => ({ ...prev, [rt]: bundle.total ?? 0 }));
        } catch {
          setCounts(prev => ({ ...prev, [rt]: 'error' }));
        }
      }
    }

    // Launch CONCURRENCY workers
    const workers = Array.from({ length: CONCURRENCY }, () => fetchNext());
    Promise.allSettled(workers);
  }, [client, resourceTypes]);

  return counts;
}
```

### settings.yaml Schema

```yaml
# public/settings.yaml
fhir:
  serverUrl: "http://localhost:8080/fhir"
  auth:
    mode: open          # open | basic | bearer
    # username: admin   # for basic auth
    # password: secret  # for basic auth
    # token: "eyJ..."  # for bearer auth

# Future phases:
# terminology:
#   serverUrl: "https://terminology.mii.de/fhir"
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| Create React App | Vite (npm create vite) | 2023+ | CRA is deprecated; Vite is the standard React scaffolding tool |
| Mantine 7 with emotion | Mantine 8 with CSS modules | Late 2024 | No runtime CSS-in-JS overhead, PostCSS-based |
| react-router v6 | react-router v7 | 2025 | New data loading patterns, but basic routing API is similar |
| fhir.js client | @medplum/core | Ongoing | fhir.js is unmaintained; Medplum is actively maintained TypeScript-first |

## Assumptions Log

| # | Claim | Section | Risk if Wrong |
|---|-------|---------|---------------|
| A1 | MedplumClient works against Blaze without authentication flow issues | Pattern 2 / Pitfall 1 | HIGH -- if MedplumClient requires Medplum-specific auth, we need a custom FHIR client wrapper. Mitigated by compatibility gate (success criterion 5). |
| A2 | MedplumProvider works without an authenticated user session | Pitfall 5 | MEDIUM -- if it doesn't, we bypass Provider and pass client via custom React context. Medplum hooks (useSearch, etc.) would be unavailable. |
| A3 | `extendedMode: false` prevents Medplum-specific behavior | Pitfall 1 | LOW -- if not, we can inspect and suppress specific behaviors. |
| A4 | Blaze supports `_summary=count` search parameter | Pattern: Resource Counts | MEDIUM -- if not, we must use a different count strategy (fetch first page and read Bundle.total). |
| A5 | Blaze does not set CORS headers by default | Pitfall 2 | LOW -- if it does, Vite proxy is still harmless but unnecessary. |
| A6 | Vite proxy is sufficient for production use (or app will always run in dev mode) | Pattern 6 | MEDIUM -- for a local tool, running `npm run dev` is likely fine. If production build is needed, users must configure Blaze CORS or use a reverse proxy. |

## Open Questions

1. **MedplumClient `extendedMode` behavior**
   - What we know: It defaults to `true` and adds Medplum-specific behavior.
   - What's unclear: Exactly what non-standard requests it makes and whether Blaze handles them gracefully.
   - Recommendation: Test with `extendedMode: false` during the compatibility gate. If both modes work, use `false` for predictability.

2. **settings.yaml location: project root vs public/**
   - What we know: D-05 says "project root" but the browser can only fetch from public/.
   - What's unclear: Whether the user expects `./settings.yaml` or `./public/settings.yaml`.
   - Recommendation: Place in `public/settings.yaml`. Add a Vite dev middleware that also serves `./settings.yaml` from root as a fallback, so users can edit either location. Document `public/settings.yaml` as the canonical location.

3. **MedplumClient.get() for CapabilityStatement**
   - What we know: `client.get('metadata')` should work for fetching the CapabilityStatement.
   - What's unclear: Whether `get()` prepends the `fhirUrlPath` automatically or expects a full path.
   - Recommendation: Test during compatibility gate. If `get('metadata')` doesn't work, try `get(fhirUrlPath + 'metadata')` or use raw `fetch()`.

## Environment Availability

| Dependency | Required By | Available | Version | Fallback |
|------------|------------|-----------|---------|----------|
| Node.js | Vite, npm | Yes | v22.22.0 | -- |
| npm | Package management | Yes | (bundled with Node) | -- |
| Blaze FHIR server | CONN-02 through CONN-05 | Unknown | -- | App handles connection errors gracefully (CONN-04) |

**Missing dependencies with no fallback:**
- None (all development dependencies are available)

**Missing dependencies with fallback:**
- Blaze server may not be running during development -- app must handle this gracefully per CONN-04

## Validation Architecture

### Test Framework

| Property | Value |
|----------|-------|
| Framework | vitest 4.1.4 |
| Config file | vitest.config.ts (Wave 0 -- needs creation) |
| Quick run command | `npx vitest run --reporter=verbose` |
| Full suite command | `npx vitest run` |

### Phase Requirements -> Test Map

| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| CONN-01 | Settings YAML parsing with all auth modes | unit | `npx vitest run src/config/__tests__/settings.test.ts -t "settings"` | Wave 0 |
| CONN-02 | MedplumClient creation from settings, connection flow | unit + integration | `npx vitest run src/fhir/__tests__/client.test.ts` | Wave 0 |
| CONN-03 | CapabilityStatement parsing, resource categorization | unit | `npx vitest run src/fhir/__tests__/capability.test.ts` | Wave 0 |
| CONN-04 | Error classification and display | unit | `npx vitest run src/utils/__tests__/errors.test.ts` | Wave 0 |
| CONN-05 | Loading state transitions | unit | `npx vitest run src/hooks/__tests__/useConnection.test.ts` | Wave 0 |

### Sampling Rate
- **Per task commit:** `npx vitest run --reporter=verbose`
- **Per wave merge:** `npx vitest run`
- **Phase gate:** Full suite green before `/gsd-verify-work`

### Wave 0 Gaps
- [ ] `vitest.config.ts` -- test framework configuration
- [ ] `src/config/__tests__/settings.test.ts` -- settings parsing tests
- [ ] `src/fhir/__tests__/client.test.ts` -- client creation tests
- [ ] `src/fhir/__tests__/capability.test.ts` -- CapabilityStatement parsing tests
- [ ] `src/utils/__tests__/errors.test.ts` -- error classification tests
- [ ] `src/hooks/__tests__/useConnection.test.ts` -- connection state tests
- [ ] Framework install: `npm install -D vitest @testing-library/react jsdom`

## Security Domain

### Applicable ASVS Categories

| ASVS Category | Applies | Standard Control |
|---------------|---------|-----------------|
| V2 Authentication | Minimal -- basic/bearer auth config only | Credentials in settings.yaml (local file); no browser-stored secrets |
| V3 Session Management | No | No sessions -- stateless FHIR requests |
| V4 Access Control | No | Read-only app, no user roles |
| V5 Input Validation | Yes | Validate settings.yaml schema with TypeScript types; sanitize server URLs |
| V6 Cryptography | No | No encryption needed -- local-only tool |

### Known Threat Patterns

| Pattern | STRIDE | Standard Mitigation |
|---------|--------|---------------------|
| Credentials in settings.yaml readable by local users | Information Disclosure | Document that settings.yaml should not contain production credentials; this is a local dev tool |
| SSRF via configurable serverUrl | Spoofing | Local-only tool; user controls their own config. No mitigation needed. |
| XSS via FHIR data rendering | Tampering | Medplum React components handle FHIR data rendering safely; do not use `dangerouslySetInnerHTML` on FHIR data |

## Sources

### Primary (HIGH confidence)
- [npm registry] -- all package versions verified via `npm view` (2026-04-11)
- [@medplum/react peer dependencies] -- verified via `npm view @medplum/react peerDependencies`
- [medplum.com/docs/sdk/core.medplumclientoptions] -- MedplumClientOptions interface with all properties
- [hl7.org/fhir/capabilitystatement.html] -- CapabilityStatement structure
- [hl7.org/fhir/resourcelist.html] -- FHIR resource categories
- [vite.dev/config/server-options] -- Vite proxy configuration

### Secondary (MEDIUM confidence)
- [medplum.com/docs/cli/external-fhir-servers] -- CLI-focused but confirms baseUrl/fhirUrlPath pattern
- [samply.github.io/blaze] -- Blaze default URL structure (localhost:8080/fhir)
- [github.com/samply/blaze] -- Blaze API documentation

### Tertiary (LOW confidence)
- MedplumClient behavior against non-Medplum servers (needs testing -- compatibility gate)

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH -- all versions verified against npm, peer dependencies confirmed
- Architecture: HIGH -- patterns are standard React/Vite/Mantine composition
- Pitfalls: MEDIUM -- MedplumClient compatibility with Blaze is the main uncertainty, requires testing
- FHIR integration: MEDIUM -- CapabilityStatement structure is well-documented but MedplumClient behavior against Blaze is assumed

**Research date:** 2026-04-11
**Valid until:** 2026-05-11 (stable stack, 30-day validity)
