# Architecture Patterns

**Domain:** FHIR Explorer (React SPA against Blaze FHIR Server)
**Researched:** 2026-04-11

## Recommended Architecture

```
+---------------------------------------------------------------+
|                        App Shell (Mantine)                     |
|  +------------------+  +------------------------------------+ |
|  |   Sidebar Nav    |  |          Content Area               | |
|  |                  |  |                                    | |
|  | - Patient Browse |  |  Router Outlet                    | |
|  | - Resource Types |  |  (React Router)                   | |
|  | - MII Modules    |  |                                    | |
|  | - Quality Dash   |  |                                    | |
|  | - Settings       |  |                                    | |
|  +------------------+  +------------------------------------+ |
+---------------------------------------------------------------+
         |                           |
    +---------+              +---------------+
    | Routing |              | Data Layer    |
    | (React  |              | (MedplumClient|
    |  Router)|              |  + hooks)     |
    +---------+              +---------------+
                                    |
                    +---------------+---------------+
                    |               |               |
              +-----------+  +-----------+  +-------------+
              | Blaze     |  | MII Term  |  | settings    |
              | FHIR      |  | Server    |  | .yaml       |
              | Server    |  | ($lookup) |  | (local file)|
              +-----------+  +-----------+  +-------------+
```

### Critical Architecture Decision: MedplumClient Against Blaze

MedplumClient (from `@medplum/core` v5.1.7) explicitly supports pointing to non-Medplum FHIR servers via `baseUrl` and `fhirUrlPath`. For Blaze:

```typescript
const medplum = new MedplumClient({
  baseUrl: 'http://localhost:8080',  // Blaze base
  fhirUrlPath: 'fhir/',             // Blaze uses /fhir/ not /fhir/R4/
});
```

**Confidence: MEDIUM** -- The `fhirUrlPath` option exists and is documented as "Use this if you want to use a different path when connecting to a FHIR server." Blaze exposes its FHIR endpoint at `/fhir`. This should work for standard FHIR operations (search, read, $validate). Features that depend on Medplum-specific endpoints (auth, subscriptions via WebSocket, bot execution) will not work, but those are out of scope for this read-only explorer.

**Key risk:** Some Medplum React components (like `SearchControl`) may internally call Medplum-specific APIs beyond standard FHIR. The `@medplum/react` README says "some advanced features are only available when paired with a Medplum server." We must validate which components work against plain FHIR and which assume Medplum-specific behavior. See Pitfalls for mitigation.

### Component Boundaries

| Component | Responsibility | Communicates With |
|-----------|---------------|-------------------|
| **AppShell** | Layout, sidebar nav, top bar | Router, SettingsProvider |
| **SettingsProvider** (context) | Load settings.yaml at startup, expose config | All components via React context |
| **FhirClientProvider** | Initialize MedplumClient from settings, wrap in MedplumProvider | SettingsProvider (reads config), all child components |
| **TerminologyProvider** (context) | Cache $lookup/$translate results from MII Terminology Server | Separate HTTP client (not MedplumClient), all Display components |
| **MiiModuleRegistry** | Static mapping of MII Kerndatensatz modules to FHIR types + profile URLs | Patient browser, Navigation, Quality dashboard |
| **Router** | URL-to-component mapping | All page-level components |
| **PatientBrowser** | List patients, drill into patient data by MII module | FhirClient, MiiModuleRegistry, TerminologyProvider |
| **ResourceExplorer** | Browse any resource type, search, filter, paginate | FhirClient, TerminologyProvider |
| **ResourceDetail** | Show single resource in human/clinical/raw modes | FhirClient, TerminologyProvider |
| **QualityDashboard** | Resource counts, completeness, coding coverage | FhirClient, MiiModuleRegistry |
| **SettingsPage** | Edit connection settings (URL, auth) | SettingsProvider |

### Data Flow

```
settings.yaml
     |
     v
SettingsProvider (React Context)
     |
     v
FhirClientProvider
  - Creates MedplumClient with baseUrl/fhirUrlPath from settings
  - Wraps children in MedplumProvider from @medplum/react-hooks
     |
     +---> TerminologyProvider
     |       - Separate MedplumClient instance for terminology server
     |       - In-memory LRU cache for $lookup results
     |       - Graceful fallback to raw codes on failure
     |
     v
Page Components (via React Router)
  - Use useMedplum() hook to get client
  - Use useSearch() for paginated list queries
  - Use useResource() for single resource reads
  - Pass FHIR resources to Medplum display components
```

## Detailed Component Design

### 1. Settings Layer

**What:** Load `settings.yaml` at app startup, provide to all components via context.

```typescript
// settings.ts
interface AppSettings {
  fhir: {
    baseUrl: string;        // e.g., "http://localhost:8080"
    fhirPath: string;       // e.g., "fhir/" (Blaze default)
    auth: {
      mode: 'open' | 'basic' | 'bearer';
      username?: string;     // for basic auth
      password?: string;     // for basic auth
      token?: string;        // for bearer token
    };
  };
  terminology: {
    baseUrl: string;        // "https://terminology.medizininformatik-initiative.de/fhir"
    enabled: boolean;
  };
}
```

**Loading strategy:** Fetch `/settings.yaml` as a static asset at startup. Parse with `js-yaml`. If missing or invalid, show configuration UI. Store in React context. Settings changes require re-creating the MedplumClient (triggers re-render of entire app tree under FhirClientProvider).

**Build order implication:** This must be built first -- everything depends on it.

### 2. FHIR Client Layer (MedplumProvider)

**What:** Thin wrapper that creates a MedplumClient from settings and provides it via MedplumProvider.

```typescript
function FhirClientProvider({ children }: { children: React.ReactNode }) {
  const settings = useSettings();
  
  const medplum = useMemo(() => {
    const client = new MedplumClient({
      baseUrl: settings.fhir.baseUrl,
      fhirUrlPath: settings.fhir.fhirPath,
    });
    // For bearer token auth:
    if (settings.fhir.auth.mode === 'bearer') {
      // Use accessToken option or set via setAccessToken
    }
    // For basic auth: set default headers
    return client;
  }, [settings.fhir]);

  return (
    <MedplumProvider medplum={medplum}>
      {children}
    </MedplumProvider>
  );
}
```

**Basic auth handling:** MedplumClient does not natively support basic auth (it is OAuth-oriented). For Blaze with basic auth, we will need to either:
- Use the `accessToken` field with a base64-encoded basic auth string (unlikely to work correctly)
- Create a custom fetch wrapper that adds `Authorization: Basic ...` headers
- Use MedplumClient's low-level `get()` method with custom headers

**Recommended approach:** Use MedplumClient's constructor and intercept via a custom fetch implementation or middleware. MedplumClient accepts a `fetch` option or we can set default headers. This needs phase-specific investigation.

**Build order implication:** Depends on Settings layer. Build second.

### 3. Terminology Resolution Layer

**What:** Separate service for resolving CodeableConcept display values via the MII Terminology Server.

**Architecture decision: Separate client, not the same MedplumClient.** The terminology server is a different endpoint entirely (https://terminology.medizininformatik-initiative.de/fhir). It does not need auth. Keep it isolated.

```typescript
interface TerminologyCache {
  lookup(system: string, code: string): Promise<string | null>;
  translate(conceptMapUrl: string, system: string, code: string): Promise<Coding | null>;
}

// Implementation
class MiiTerminologyService implements TerminologyCache {
  private cache: Map<string, string>;  // LRU cache, key = system|code
  private client: MedplumClient;       // Pointed at terminology server

  async lookup(system: string, code: string): Promise<string | null> {
    const key = `${system}|${code}`;
    if (this.cache.has(key)) return this.cache.get(key)!;
    try {
      // GET [base]/CodeSystem/$lookup?system=...&code=...
      const result = await this.client.get(
        `CodeSystem/$lookup?system=${encodeURIComponent(system)}&code=${encodeURIComponent(code)}`
      );
      const display = extractDisplay(result);
      this.cache.set(key, display);
      return display;
    } catch {
      return null; // Graceful fallback
    }
  }
}
```

**Caching strategy:**
- In-memory LRU cache (1000-2000 entries covers most clinical coding sets in a single session)
- Pre-warm common code systems on first use (ICD-10-GM, OPS, LOINC top codes)
- Never block rendering on terminology -- show raw code immediately, replace with display value when resolved
- Cache persists for session lifetime only (no localStorage -- codes can change)

**Build order implication:** Can be built in parallel with the UI shell. Needed before resource display is useful.

### 4. MII Kerndatensatz Module Registry

**What:** Static configuration mapping MII module names to FHIR resource types and profile URLs.

```typescript
interface MiiModule {
  id: string;
  name: string;                    // German display name
  nameEn: string;                  // English display name
  resourceTypes: ResourceType[];   // FHIR resource types
  profileUrls: string[];           // MII StructureDefinition URLs
  searchParams: Record<string, string>; // Default search params per resource type
}

const MII_MODULES: MiiModule[] = [
  {
    id: 'person',
    name: 'Person',
    nameEn: 'Demographics',
    resourceTypes: ['Patient'],
    profileUrls: ['https://www.medizininformatik-initiative.de/fhir/core/modul-person/StructureDefinition/Patient'],
    searchParams: {},
  },
  {
    id: 'fall',
    name: 'Fall',
    nameEn: 'Encounter',
    resourceTypes: ['Encounter'],
    profileUrls: ['https://www.medizininformatik-initiative.de/fhir/core/modul-fall/StructureDefinition/Encounter'],
    searchParams: { patient: '{patientId}' },
  },
  {
    id: 'diagnose',
    name: 'Diagnose',
    nameEn: 'Diagnosis',
    resourceTypes: ['Condition'],
    profileUrls: ['https://www.medizininformatik-initiative.de/fhir/core/modul-diagnose/StructureDefinition/Diagnose'],
    searchParams: { patient: '{patientId}', _profile: '{profileUrl}' },
  },
  {
    id: 'prozedur',
    name: 'Prozedur',
    nameEn: 'Procedure',
    resourceTypes: ['Procedure'],
    profileUrls: ['https://www.medizininformatik-initiative.de/fhir/core/modul-prozedur/StructureDefinition/Prozedur'],
    searchParams: { patient: '{patientId}' },
  },
  {
    id: 'laborbefund',
    name: 'Laborbefund',
    nameEn: 'Laboratory',
    resourceTypes: ['Observation', 'DiagnosticReport'],
    profileUrls: [
      'https://www.medizininformatik-initiative.de/fhir/core/modul-labor/StructureDefinition/ObservationLab',
      'https://www.medizininformatik-initiative.de/fhir/core/modul-labor/StructureDefinition/DiagnosticReportLab',
    ],
    searchParams: { patient: '{patientId}', category: 'laboratory' },
  },
  {
    id: 'medikation',
    name: 'Medikation',
    nameEn: 'Medication',
    resourceTypes: ['MedicationStatement', 'MedicationRequest', 'MedicationAdministration', 'Medication'],
    profileUrls: [
      'https://www.medizininformatik-initiative.de/fhir/core/modul-medikation/StructureDefinition/MedicationStatement',
    ],
    searchParams: { patient: '{patientId}' },
  },
  {
    id: 'consent',
    name: 'Consent',
    nameEn: 'Consent',
    resourceTypes: ['Consent'],
    profileUrls: ['https://www.medizininformatik-initiative.de/fhir/core/modul-consent/StructureDefinition/Consent'],
    searchParams: { patient: '{patientId}' },
  },
];
```

**Confidence: LOW for profile URLs** -- The exact MII profile URLs need validation against the current MII IG published versions. The module-to-resource-type mapping is well-established, but profile canonical URLs may have changed across MII IG versions (2024/2025 releases). Flag for validation during implementation.

**Build order implication:** Static data, no dependencies. Can be built anytime. Needed before Patient Browser and Quality Dashboard.

### 5. Routing

**Use React Router v7** (current stable, supports both SPA and SSR modes -- use SPA mode).

```
/                          → Dashboard / Home (redirect to /patients or /resources)
/patients                  → Patient list (paginated search)
/patients/:id              → Patient detail (summary + MII module tabs)
/patients/:id/:module      → Patient's resources for a specific MII module
/resources                 → Resource type picker
/resources/:type           → Resource list for type (paginated search + filters)
/resources/:type/:id       → Resource detail (three display modes)
/quality                   → Data quality dashboard
/settings                  → Settings editor
```

**Navigation state:** Search parameters (filters, sort, page) live in URL search params, not React state. This enables:
- Browser back/forward navigation through search history
- Shareable/bookmarkable search URLs
- No state loss on page refresh

**Pagination cursors:** FHIR bundle pagination uses `bundle.link` with `relation: "next"`. These are opaque URLs. Store the current bundle's next/prev links in component state (not URL -- they are server-generated URLs that are not human-meaningful). Track page number in URL params for display purposes.

### 6. Page Component Architecture

#### Patient List Page (`/patients`)

```
PatientListPage
  ├── SearchBar (name, identifier, birthdate filters)
  ├── PatientTable (uses Medplum SearchControl or custom table)
  │     └── Rows → click navigates to /patients/:id
  └── Pagination (bundle.link based)
```

**Data flow:**
1. Build FHIR search: `Patient?name=...&_count=20&_sort=-_lastUpdated`
2. `useSearch('Patient', searchParams)` returns Bundle
3. Render entries in table
4. Next page: follow `bundle.link[relation=next].url`

#### Patient Detail Page (`/patients/:id`)

```
PatientDetailPage
  ├── PatientHeader (name, DOB, identifiers -- use Medplum ResourceBadge or HumanNameDisplay)
  ├── MiiModuleTabs
  │     ├── Tab: Person (demographics)
  │     ├── Tab: Fall (encounters)
  │     ├── Tab: Diagnose (conditions)
  │     ├── Tab: Prozedur (procedures)
  │     ├── Tab: Laborbefund (observations)
  │     ├── Tab: Medikation (medications)
  │     └── Tab: Consent
  └── Each tab:
        ├── ResourceList (filtered by patient + module config)
        └── Click → navigates to /resources/:type/:id
```

**Data flow:**
1. `useResource<Patient>(id)` loads patient
2. For each visible MII module tab: `useSearch(resourceType, { patient: id, ...moduleSearchParams })`
3. Display results using module-specific rendering or generic ResourceTable

#### Resource Explorer Page (`/resources/:type`)

```
ResourceExplorerPage
  ├── ResourceTypePicker (if no :type in URL)
  ├── SearchFilters (dynamic based on resource type's search parameters)
  ├── ResultsTable (SearchControl or FhirPathTable)
  │     └── Rows → click navigates to /resources/:type/:id
  └── Pagination
```

#### Resource Detail Page (`/resources/:type/:id`)

```
ResourceDetailPage
  ├── ResourceHeader (type, id, meta.lastUpdated)
  ├── DisplayModeTabs
  │     ├── Human-Readable (default -- rendered display using Medplum components)
  │     ├── Clinical + Raw (split view)
  │     └── Developer/FHIR Structure (full element tree)
  ├── ReferenceResolver (clickable references → navigate to referenced resource)
  └── RawJsonView (syntax-highlighted JSON with collapsible sections)
```

**Display modes implementation:**
- **Human-readable:** Use Medplum's `ResourceTable` or `BackboneElementDisplay` to render resource properties in a readable table format. Augment with TerminologyProvider for display values.
- **Clinical + Raw:** Split pane -- left side human-readable summary, right side raw JSON.
- **Developer view:** Tree-based FHIR element display showing element paths, types, cardinalities. Custom component.

**Reference resolution data flow:**
1. Resource contains `Reference` fields (e.g., `Condition.subject` → `Patient/123`)
2. Render references as clickable links → `/resources/Patient/123`
3. Optionally: inline-resolve reference display names using `useResource()` for hover previews

#### Quality Dashboard (`/quality`)

```
QualityDashboardPage
  ├── ResourceCountsPanel
  │     └── For each resource type: GET [base]/[Type]?_summary=count
  ├── MiiModuleCoverage
  │     └── For each MII module: count resources matching profile
  ├── FieldCompletenessPanel
  │     └── Sample-based analysis (fetch N resources, check field presence)
  └── CodingCoveragePanel
        └── Check CodeableConcept fields have system+code+display
```

**Performance consideration:** Resource counts via `_summary=count` are efficient on Blaze. Field completeness requires sampling -- fetch 100 resources per type and compute stats client-side. Do NOT iterate all resources.

### 7. State Management

**Do NOT use Redux or Zustand.** The Medplum hooks (`useSearch`, `useResource`) with React context provide sufficient state management for this application.

**State locations:**

| State | Location | Reason |
|-------|----------|--------|
| App settings | React Context (SettingsProvider) | Global, rarely changes |
| FHIR client | React Context (MedplumProvider) | Global, singleton |
| Terminology cache | React Context (TerminologyProvider) | Global, grows over session |
| MII module config | Static import | Never changes at runtime |
| Search params/filters | URL search params (React Router) | Enables browser nav, sharing |
| Current bundle results | Component state via useSearch() | Scoped to page, auto-managed |
| Pagination cursors | Component state (bundle.link) | Ephemeral, per-search |
| Display mode toggle | Component state (useState) | Local UI state |
| Resource cache | MedplumClient internal cache | Automatic, configurable size |

### 8. Medplum Component Compatibility with Blaze

Based on the @medplum/react package analysis (v5.1.7):

**Likely compatible (standard FHIR only):**

| Component | What it does | Dependency |
|-----------|-------------|------------|
| `MedplumProvider` | Context provider | MedplumClient only |
| `ResourceTable` | Display resource properties in table | FHIR resource object |
| `ResourceBadge` | Compact resource display | FHIR resource object |
| `ResourceForm` | Form for editing (read-only use) | FHIR StructureDefinition |
| `HumanNameDisplay` | Render HumanName | FHIR datatype |
| `AddressDisplay` | Render Address | FHIR datatype |
| `CodeableConceptDisplay` | Render CodeableConcept | FHIR datatype |
| `CodingDisplay` | Render Coding | FHIR datatype |
| `FhirPathTable` | Table driven by FHIRPath expressions | FHIR resource + FHIRPath |
| `BackboneElementDisplay` | Render backbone elements | FHIR resource |
| `DiagnosticReportDisplay` | Render DiagnosticReport | FHIR resource |
| `ObservationTable` | Render Observation results | FHIR resource |
| `PatientSummary` | Patient summary view | FHIR Patient + related resources |
| `useMedplum` hook | Get client instance | MedplumClient |
| `useSearch` hook | FHIR search | Standard FHIR search |
| `useResource` hook | Read by ref/id | Standard FHIR read |

**Likely incompatible (Medplum-specific):**

| Component | Why | Alternative |
|-----------|-----|------------|
| `SearchControl` (advanced features) | May use Medplum-specific search endpoints | Use basic mode or build custom |
| `AppShell` | May expect Medplum auth context | Build custom shell with Mantine |
| `SignInForm` | Medplum auth only | Not needed |
| `ChatControl` | Medplum Communication | Not needed |
| `useSubscription` | Medplum WebSocket subscriptions | Not needed |
| Timeline components | May call Medplum history APIs | Build custom if needed |

**Confidence: MEDIUM** -- This assessment is based on component names and interface analysis. Actual compatibility must be validated by instantiation testing in Phase 1.

## Patterns to Follow

### Pattern 1: Progressive Enhancement for Terminology

**What:** Render raw FHIR codes immediately, enhance with terminology display values asynchronously.

**When:** Any time a CodeableConcept, Coding, or code element is displayed.

```typescript
function EnhancedCodingDisplay({ coding }: { coding: Coding }) {
  const { lookup } = useTerminology();
  const [display, setDisplay] = useState(coding.display || `${coding.system}|${coding.code}`);
  
  useEffect(() => {
    if (coding.system && coding.code && !coding.display) {
      lookup(coding.system, coding.code).then(resolved => {
        if (resolved) setDisplay(resolved);
      });
    }
  }, [coding.system, coding.code]);
  
  return <span>{display}</span>;
}
```

### Pattern 2: Bundle-First Data Flow

**What:** Always work with FHIR Bundles as the primary data unit, not individual resources.

**When:** Any list/search view.

**Why:** FHIR search returns Bundles. Pagination links are on Bundles. Total counts are on Bundles. Working with the Bundle directly (rather than extracting resources early) preserves all this metadata.

```typescript
function ResourceListView({ resourceType }: { resourceType: string }) {
  const [bundle, loading, error] = useSearch(resourceType as ResourceType, queryParams);
  
  if (loading) return <Spinner />;
  if (error) return <ErrorDisplay error={error} />;
  if (!bundle?.entry?.length) return <EmptyState />;
  
  return (
    <>
      <div>Total: {bundle.total ?? 'unknown'}</div>
      <ResourceResultTable entries={bundle.entry} />
      <BundlePagination links={bundle.link} onNavigate={handlePageChange} />
    </>
  );
}
```

### Pattern 3: URL-Driven Search State

**What:** Store all search/filter state in URL parameters, derive component state from URL.

**When:** Any searchable/filterable view.

```typescript
function ResourceExplorer() {
  const [searchParams, setSearchParams] = useSearchParams();
  
  const fhirQuery = useMemo(() => {
    const params = new URLSearchParams();
    if (searchParams.get('name')) params.set('name', searchParams.get('name')!);
    if (searchParams.get('status')) params.set('status', searchParams.get('status')!);
    params.set('_count', searchParams.get('_count') || '20');
    params.set('_sort', searchParams.get('_sort') || '-_lastUpdated');
    return params.toString();
  }, [searchParams]);
  
  const [bundle] = useSearch(resourceType, fhirQuery);
  // ...
}
```

### Pattern 4: Adapter Pattern for Medplum Components

**What:** Wrap Medplum components with thin adapters that handle Blaze-specific quirks.

**When:** Using any Medplum React component that may have subtle Medplum assumptions.

```typescript
// Wrap Medplum's ResourceTable to handle cases where it might 
// expect Medplum-specific resource properties
function BlazeResourceTable(props: ResourceTableProps) {
  // Strip Medplum-specific extensions if present
  // Add fallback rendering for unsupported features
  return <ResourceTable {...props} />;
}
```

## Anti-Patterns to Avoid

### Anti-Pattern 1: Fetching All Resources Then Filtering Client-Side

**What:** Loading large result sets into memory and filtering/sorting in JavaScript.
**Why bad:** Blaze can have 50K+ resources. Client-side filtering is slow and memory-intensive.
**Instead:** Always use FHIR search parameters (`_filter`, `_sort`, `_count`) to let Blaze do the work.

### Anti-Pattern 2: Eagerly Resolving All References

**What:** When displaying a resource, immediately resolving every Reference field to load the referenced resource.
**Why bad:** A single Encounter can reference Patient, Practitioner, Organization, Location, etc. Cascading resolution creates N+1 query storms.
**Instead:** Resolve references lazily -- show reference string by default, resolve on click or hover. Use `_include` search parameter for known reference chains (e.g., `Condition?_include=Condition:subject`).

### Anti-Pattern 3: Single Global MedplumClient for Both Blaze and Terminology

**What:** Using one MedplumClient pointed at Blaze and trying to route terminology requests through it.
**Why bad:** Different base URLs, different auth requirements, different caching strategies.
**Instead:** Two separate clients -- one for Blaze (primary), one for MII Terminology Server.

### Anti-Pattern 4: Storing FHIR Bundles in Global State

**What:** Putting search results in Redux/Zustand global store.
**Why bad:** Bundles are ephemeral search results. They go stale. They are page-specific. MedplumClient already has an internal resource cache with configurable size.
**Instead:** Let `useSearch()` manage bundle lifecycle. Use MedplumClient's built-in cache (`resourceCacheSize` option) for individual resource caching.

## Scalability Considerations

| Concern | At 1K resources | At 50K resources | At 500K resources |
|---------|-----------------|-------------------|-------------------|
| Search/browse | Direct, fast | Pagination required, _count=20 | Same + consider _total=none to skip count |
| Quality stats | Full scan OK | Sample-based (100/type) | Sample-based + background processing |
| Terminology cache | All in memory | All in memory (unique codes << total resources) | Same |
| Patient list | Full list feasible | Must search/filter, never "load all" | Same |
| Reference resolution | Eager OK | Lazy only | Lazy + _include for critical paths |

## Suggested Build Order (Dependencies)

```
Phase 1: Foundation
  1. Settings layer (settings.yaml loading, SettingsProvider context)
  2. FHIR client setup (MedplumClient config, MedplumProvider, basic auth handling)
  3. App shell (Mantine layout, sidebar, routing skeleton)
  4. Validate Medplum component compatibility with Blaze
     → GATE: Can we render a Patient from Blaze using Medplum components?

Phase 2: Core Browsing
  5. Resource Explorer (list any resource type, paginate, basic search)
  6. Resource Detail (three display modes, raw JSON view)
  7. Reference navigation (clickable references between resources)
     → GATE: Can we browse and drill into any resource on the server?

Phase 3: Patient-Centric + Terminology
  8. MII Module Registry (static config)
  9. Patient list + patient detail with MII module tabs
  10. Terminology resolution layer (MII Terminology Server + cache)
  11. Enhanced display with resolved terminology
      → GATE: Can we navigate a patient's clinical data organized by MII modules?

Phase 4: Quality + Polish
  12. Data quality dashboard (counts, completeness, coding coverage)
  13. Profile validation (validate against MII profiles)
  14. Performance optimization (large datasets, lazy loading)
      → GATE: Can we assess data quality across 50K+ resources?
```

**Ordering rationale:**
- Settings and FHIR client must come first (everything depends on server connection)
- Generic resource browsing before patient-centric (simpler, validates Medplum+Blaze compatibility)
- Terminology is deferred to Phase 3 because the app is usable without it (raw codes are functional)
- Quality dashboard last because it depends on both resource browsing and MII module mapping being stable

## Sources

- @medplum/core v5.1.7 README (npm) -- MedplumClient constructor, baseUrl/fhirUrlPath options
- @medplum/react v5.1.7 README (npm) -- "can be used with any compliant FHIR server"
- @medplum/react v5.1.7 type definitions -- Component exports, interfaces, hook signatures
- @medplum/react-hooks v5.1.7 README (npm) -- useSearch, useResource, useMedplum hooks
- MedplumClientOptions interface (extracted from @medplum/core type definitions)
- Confidence: MEDIUM overall -- MedplumClient API verified from package types, but actual Blaze compatibility needs runtime validation
