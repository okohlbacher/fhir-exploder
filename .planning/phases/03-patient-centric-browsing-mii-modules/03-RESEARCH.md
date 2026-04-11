# Phase 3: Patient-Centric Browsing & MII Modules - Research

**Researched:** 2026-04-11
**Domain:** Patient browsing, MII Kerndatensatz navigation, FHIR patient compartment queries, clinical timeline
**Confidence:** HIGH

## Summary

Phase 3 builds patient-centric browsing on top of the existing Explorer infrastructure from Phase 2. The core challenge is routing and layout: creating a Patient list page, a Patient detail page with MII Kerndatensatz module tabs, a clinical timeline, and a toggle between MII and raw FHIR views -- all while reusing Phase 2's resource detail views for drill-down.

The codebase already has a placeholder `PatientsPage` component in `App.tsx` and a "Patients" nav item in the sidebar. The `ExplorerLayout` pattern (connection gating + MedplumProvider wrapping + Outlet context) should be replicated for the patients route tree. All FHIR data fetching uses `MedplumClient` via `useMedplum()`, and `SearchControl` is the established pattern for search result tables.

**Primary recommendation:** Create a `PatientsLayout` mirroring `ExplorerLayout` (connection gate + MedplumProvider), with nested routes for patient list, patient detail, and patient-scoped resource detail. Use `SearchControl` for patient-scoped resource tables in each MII module tab, and build a custom timeline component from Mantine primitives (Paper, Badge, Stack).

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions
- **D-01:** Patient list as a searchable table using Medplum SearchControl -- columns for name, birthDate, gender, identifier. Search fields for name, identifier, and birthDate.
- **D-02:** Patient list accessible from the sidebar "Patients" nav item. Separate from the generic Resource Explorer.
- **D-03:** Patient header banner using Medplum's PatientHeader component -- shows name, DOB, gender, identifiers, photo if available.
- **D-04:** Clinical data below the header organized into tabbed sections. Default view shows MII Kerndatensatz module tabs.
- **D-05:** Tab bar with German module names as primary labels and FHIR resource type as subtitle: Diagnose (Condition), Prozedur (Procedure), Laborbefund (Observation), Medikation (MedicationStatement/MedicationRequest), Fall (Encounter), Consent (Consent).
- **D-06:** Each tab shows a table of resources of that type for the patient, using FHIR search with patient reference parameter. Clicking a row opens the resource detail view (reusing Phase 2 display modes).
- **D-07:** Chronological timeline view as an additional tab or toggle -- shows encounters, conditions, procedures, and observations in date order. Each entry shows date, type badge, and summary.
- **D-08:** Timeline entries are clickable, opening the full resource detail view.
- **D-09:** Toggle switch at the top of the patient detail page -- "MII Modules" vs "FHIR Resources". MII view shows the Kerndatensatz tabs. FHIR view shows all resource types linked to this patient (similar to Explorer but patient-scoped).
- **D-10:** Default to MII Modules view. User preference remembered in component state for the session.

### Claude's Discretion
- Patient list pagination defaults and behavior
- Timeline visual styling (vertical line vs cards vs list)
- How to handle resource types not covered by MII modules in the MII view

### Deferred Ideas (OUT OF SCOPE)
None -- discussion stayed within phase scope.
</user_constraints>

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|------------------|
| PTNT-01 | User can view a list of patients with search by name, identifier, and birthDate | SearchControl with `search={{ resourceType: 'Patient', fields: ['name','birthDate','gender','identifier'] }}` + custom search filter panel |
| PTNT-02 | User can view a patient detail page showing all clinical data organized by category | PatientHeader + Mantine Tabs with MII module tabs, each using SearchControl scoped to `patient={id}` |
| PTNT-03 | User can navigate a patient's clinical data using MII Kerndatensatz module tabs | Mantine Tabs with German labels + FHIR type subtitles, SearchControl per tab with `{ResourceType}?patient={patientId}` |
| PTNT-04 | User can view a chronological clinical timeline | Custom timeline component fetching Encounter, Condition, Procedure, Observation for patient, sorted by date descending |
| PTNT-05 | MII Kerndatensatz modules available as optional navigation lens alongside raw FHIR resource type browsing | SegmentedControl toggle between MII tabs view and FHIR resource type list with counts |
</phase_requirements>

## Standard Stack

### Core (already installed)
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| @medplum/react | ^5.1.7 | SearchControl, PatientHeader, ResourceTable | Already used in Phase 2; provides patient-aware FHIR components [VERIFIED: package.json] |
| @medplum/react-hooks | ^5.1.7 | useMedplum(), useSearch(), useSearchResources() | Data fetching hooks for patient-scoped queries [VERIFIED: package.json] |
| @medplum/core | ^5.1.7 | MedplumClient, SearchRequest, parseSearchRequest | FHIR client for all server requests [VERIFIED: package.json] |
| @medplum/fhirtypes | ^5.1.7 | Patient, Condition, Procedure, Observation, Encounter, etc. types | Type safety for all FHIR resources [VERIFIED: package.json] |
| @mantine/core | ^8.3.18 | Tabs, SegmentedControl, Badge, Paper, Stack, Group, Skeleton, Alert | UI primitives for module tabs, toggle, timeline cards [VERIFIED: package.json] |
| @tabler/icons-react | ^3.41.1 | Icons for timeline, navigation | Already established in Phase 1 [VERIFIED: package.json] |
| react-router-dom | ^7.14.0 | Nested routes for patient list/detail/resource | Already established routing [VERIFIED: package.json] |

### No New Dependencies Required
Phase 3 uses only existing dependencies. No new packages needed.

## Architecture Patterns

### Recommended Project Structure
```
src/
├── components/
│   ├── patients/
│   │   ├── PatientsLayout.tsx        # Connection gate + MedplumProvider (mirrors ExplorerLayout)
│   │   ├── PatientListPage.tsx       # Patient search + SearchControl table
│   │   ├── PatientDetailPage.tsx     # PatientHeader + view toggle + tab container
│   │   ├── MiiModuleTabs.tsx         # Mantine Tabs with 6 MII modules + timeline
│   │   ├── MiiModuleTab.tsx          # Single module tab content (SearchControl)
│   │   ├── FhirResourcesView.tsx     # Raw FHIR resource type list with counts
│   │   ├── ClinicalTimeline.tsx      # Chronological timeline component
│   │   └── TimelineEntry.tsx         # Single timeline entry card
│   └── explorer/                     # Existing Phase 2 components (reused)
├── hooks/
│   └── usePatientResources.ts        # Hook to fetch patient-scoped resources for timeline
└── utils/
    └── mii-modules.ts                # MII module configuration (labels, colors, resource types)
```

### Pattern 1: PatientsLayout (Connection Gate)
**What:** Mirror ExplorerLayout -- gate on connection status, wrap children in MedplumProvider, pass context via Outlet.
**When to use:** All patient routes require a connected FHIR server.
**Example:**
```typescript
// Source: Existing ExplorerLayout pattern in src/components/explorer/ExplorerLayout.tsx
export type PatientsOutletContext = {
  capability: CapabilityStatement;
  client: MedplumClient;
};

export function PatientsLayout() {
  const { state } = useConnection();
  if (state.status !== 'connected') {
    // Same error alert pattern as ExplorerLayout
    return <Alert ...>Not connected</Alert>;
  }
  return (
    <MedplumProvider medplum={state.client}>
      <Outlet context={{ capability: state.capability, client: state.client } satisfies PatientsOutletContext} />
    </MedplumProvider>
  );
}
```
[VERIFIED: ExplorerLayout.tsx uses this exact pattern]

### Pattern 2: Route Structure
**What:** Nested routes under `/patients` for list, detail, and resource drill-down.
**Example:**
```typescript
// In App.tsx
<Route path="/patients" element={<PatientsLayout />}>
  <Route index element={<PatientListPage />} />
  <Route path=":patientId" element={<PatientDetailPage />} />
  <Route path=":patientId/:resourceType/:resourceId" element={<ResourceDetailPage />} />
</Route>
```
[VERIFIED: App.tsx currently has placeholder `<Route path="/patients" element={<PatientsPage />} />`]

**Key insight:** The existing `ResourceDetailPage` from Phase 2 can be reused directly for patient-scoped resource detail views. It already handles three display modes, reference click interception, and breadcrumb navigation. The only adjustment needed is that breadcrumb navigation within patient context should use `/patients/:patientId/...` URLs instead of `/explorer/...` URLs.

### Pattern 3: Patient-Scoped SearchControl
**What:** Use SearchControl with a search request that includes the patient parameter.
**Example:**
```typescript
// Source: SearchControl props from @medplum/react d.ts
const search: SearchRequest = {
  resourceType: 'Condition',
  filters: [{ code: 'patient', operator: 'eq', value: `Patient/${patientId}` }],
  count: 20,
};

<SearchControl
  search={search}
  hideToolbar={true}
  hideFilters={true}
  onClick={(e) => navigate(`/patients/${patientId}/${e.resource.resourceType}/${e.resource.id}`)}
  onLoad={(e) => setBundle(e.response)}
/>
```
[VERIFIED: SearchControl props from @medplum/react type declarations; SearchResultsPage.tsx uses this pattern]

### Pattern 4: MII Module Configuration Object
**What:** Centralize MII Kerndatensatz module definitions for reuse across tabs, timeline, and FHIR view.
**Example:**
```typescript
// src/utils/mii-modules.ts
export interface MiiModule {
  key: string;
  germanLabel: string;
  fhirResourceType: string;
  badgeColor: string;
  patientSearchParam: string; // 'patient' for most, 'subject' for some
}

export const MII_MODULES: MiiModule[] = [
  { key: 'diagnose', germanLabel: 'Diagnose', fhirResourceType: 'Condition', badgeColor: 'teal', patientSearchParam: 'patient' },
  { key: 'prozedur', germanLabel: 'Prozedur', fhirResourceType: 'Procedure', badgeColor: 'violet', patientSearchParam: 'patient' },
  { key: 'laborbefund', germanLabel: 'Laborbefund', fhirResourceType: 'Observation', badgeColor: 'cyan', patientSearchParam: 'patient' },
  { key: 'medikation', germanLabel: 'Medikation', fhirResourceType: 'MedicationStatement', badgeColor: 'orange', patientSearchParam: 'patient' },
  { key: 'fall', germanLabel: 'Fall', fhirResourceType: 'Encounter', badgeColor: 'indigo', patientSearchParam: 'patient' },
  { key: 'consent', germanLabel: 'Consent', fhirResourceType: 'Consent', badgeColor: 'pink', patientSearchParam: 'patient' },
];
```
[ASSUMED: patientSearchParam may vary -- Condition uses `patient`, Observation uses `patient` or `subject`. Blaze behavior should be tested.]

### Pattern 5: Clinical Timeline Data Fetching
**What:** Fetch multiple resource types for a patient, merge and sort by date.
**Example:**
```typescript
// Fetch resources from multiple types, extract dates, merge and sort
async function fetchTimelineEntries(client: MedplumClient, patientId: string): Promise<TimelineEntry[]> {
  const types = ['Encounter', 'Condition', 'Procedure', 'Observation'] as const;
  const results = await Promise.all(
    types.map(type => client.searchResources(type, `patient=Patient/${patientId}&_count=100&_sort=-date`))
  );
  // Merge, extract date from each resource type, sort descending
  return mergeAndSortByDate(results, types);
}
```
[VERIFIED: MedplumClient.searchResources exists in @medplum/core type declarations]

### Pattern 6: FHIR Resources View (Patient Compartment)
**What:** Show all resource types linked to this patient with counts, expandable to show resources.
**Key consideration:** FHIR R4 defines a Patient compartment -- resources that can be associated with a patient. Not all resource types support a `patient` search parameter. The safest approach is to query each resource type from the MII modules list plus discover additional linked types.
**Approach:** Use the CapabilityStatement to find resource types with a `patient` or `subject` search parameter, then query each with `patient=Patient/{id}&_summary=count` to get counts.
```typescript
// Find resource types that support patient search
const patientLinkedTypes = capability.rest?.[0]?.resource
  ?.filter(r => r.searchParam?.some(p => p.name === 'patient' || p.name === 'subject'))
  ?.map(r => r.type) ?? [];
```
[VERIFIED: CapabilityStatement structure from @medplum/fhirtypes]

### Anti-Patterns to Avoid
- **Using $everything operation:** Blaze may or may not support Patient/$everything. Even if supported, it returns all resources in a single Bundle which can be enormous. Use individual resource type queries instead. [ASSUMED: Blaze $everything support is uncertain per Phase 1 notes]
- **Fetching all resources on page load:** Lazy-load tab content only when the tab is activated. Each MII module tab should fetch its data on first activation, not on page mount.
- **Hardcoding patient search parameter names:** Different resource types use `patient` vs `subject` vs `encounter`. Use the CapabilityStatement to discover the correct parameter, or maintain a mapping.
- **Duplicating ResourceDetailPage:** Reuse the existing Phase 2 component. Don't build a second resource detail view for patient context.

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Patient header display | Custom patient name/DOB rendering | `PatientHeader` from @medplum/react | Handles all FHIR Patient name edge cases (multiple names, periods, prefixes), photo display, identifier formatting [VERIFIED: PatientHeader props accept `Patient | Reference<Patient>`] |
| Resource search tables | Custom FHIR table renderer | `SearchControl` from @medplum/react | Handles column rendering for any FHIR resource type, type-aware display (dates, codes, references), loading states [VERIFIED: already used in Phase 2 SearchResultsPage] |
| FHIR search request formatting | Custom URL query building | `parseSearchRequest` / `formatSearchQuery` from @medplum/core | Bidirectional URL sync, handles all search parameter types [VERIFIED: already used in useSearchState.ts] |
| Date extraction from FHIR resources | Custom date parsing per resource type | Utility function with resource-type-aware date field mapping | Different resources store dates in different fields (Condition.onsetDateTime, Encounter.period.start, Procedure.performedDateTime, Observation.effectiveDateTime) -- but this is a simple mapping, not a library |

**Key insight:** The timeline date extraction IS something that needs a hand-rolled mapping because each FHIR resource type stores its clinically-relevant date in a different field. There is no library for this.

## Common Pitfalls

### Pitfall 1: Patient Search Parameter Naming
**What goes wrong:** Using `patient` search parameter for all resource types fails because some use `subject` instead.
**Why it happens:** FHIR R4 is inconsistent -- Condition and Procedure use `patient`, but Observation uses `patient` OR `subject`, and Consent uses `patient`. MedicationStatement uses `patient` in R4.
**How to avoid:** For the six MII modules, hardcode the correct parameter name per resource type. For the FHIR Resources view, discover from CapabilityStatement.
**Warning signs:** Empty search results for a resource type that should have data.
[ASSUMED: Blaze may map both `patient` and `subject` to the same parameter for some types -- needs testing]

### Pitfall 2: SearchControl Click Handler URL Mismatch
**What goes wrong:** Clicking a resource in a patient-scoped table navigates to `/explorer/...` instead of `/patients/:patientId/...`.
**Why it happens:** The default SearchControl click handler or reference interception from Phase 2 uses `/explorer/` prefix.
**How to avoid:** The `onClick` handler on SearchControl must navigate to `/patients/${patientId}/${resourceType}/${id}`. The `ResourceDetailPage` reused in patient context needs its reference click handler to also use patient-prefixed URLs.
**Warning signs:** User clicks a resource and lands on the Explorer page instead of staying in patient context.

### Pitfall 3: Timeline Date Field Extraction
**What goes wrong:** Timeline shows "Unknown date" for most entries because the date extraction logic doesn't handle all field names.
**Why it happens:** FHIR resources store dates in different fields:
- Condition: `onsetDateTime`, `recordedDate`, or `onsetPeriod.start`
- Encounter: `period.start`
- Procedure: `performedDateTime` or `performedPeriod.start`
- Observation: `effectiveDateTime` or `effectivePeriod.start` or `issued`
**How to avoid:** Create an explicit date extraction function with fallbacks for each resource type.
**Warning signs:** Dates showing as "Unknown" or timeline entries not sorting correctly.
[VERIFIED: FHIR R4 resource field names from @medplum/fhirtypes type definitions]

### Pitfall 4: Tab Content Re-fetching on Tab Switch
**What goes wrong:** Every time a user switches tabs, data is re-fetched from the server, causing slow tab switching.
**Why it happens:** SearchControl refetches when its `search` prop changes or when it remounts.
**How to avoid:** Keep all tab panels mounted (don't conditionally render based on active tab). Mantine Tabs keeps inactive panels in DOM by default. Use `keepMounted` on Tabs.Panel if needed.
**Warning signs:** Loading skeleton appears every time user switches between tabs.

### Pitfall 5: Breadcrumb Trail Context Confusion
**What goes wrong:** Breadcrumb trail from `useBreadcrumbTrail` navigates to `/explorer/...` URLs.
**Why it happens:** The existing `useBreadcrumbTrail` hook hardcodes `/explorer/` prefix in its `push` and `navigateTo` callbacks.
**How to avoid:** Either (a) make `useBreadcrumbTrail` accept a base path prefix, or (b) create a patient-specific breadcrumb hook, or (c) pass the navigate function from the parent that knows the context.
**Warning signs:** Clicking breadcrumb entries in patient context redirects to the Explorer.
[VERIFIED: useBreadcrumbTrail.ts hardcodes `/explorer/` prefix on lines 22 and 31]

### Pitfall 6: MedicationStatement vs MedicationRequest
**What goes wrong:** Medikation tab only searches MedicationStatement but the server has data in MedicationRequest.
**Why it happens:** D-05 says "Medikation (MedicationStatement/MedicationRequest)" but a single tab can only query one resource type at a time with SearchControl.
**How to avoid:** Either (a) query both types and merge results in a custom table, or (b) default to MedicationStatement with a sub-toggle for MedicationRequest, or (c) use two separate SearchControl instances stacked.
**Warning signs:** Medikation tab appears empty even though medication data exists on the server.

## Code Examples

### PatientHeader Usage
```typescript
// Source: @medplum/react PatientHeader interface [VERIFIED: d.ts declarations]
import { PatientHeader } from '@medplum/react';
import type { Patient } from '@medplum/fhirtypes';

// PatientHeader accepts Patient resource or Reference<Patient>
<PatientHeader patient={patient} />
```

### Mantine Tabs with German Labels
```typescript
// Source: Mantine 8 Tabs API [VERIFIED: already used in ResourceDetailPage.tsx]
import { Tabs, Text } from '@mantine/core';

<Tabs value={activeTab} onChange={setActiveTab}>
  <Tabs.List>
    {MII_MODULES.map(mod => (
      <Tabs.Tab key={mod.key} value={mod.key}>
        <Text fw={600} size="sm">{mod.germanLabel}</Text>
        <Text size="xs" c="dimmed">{mod.fhirResourceType}</Text>
      </Tabs.Tab>
    ))}
    <Tabs.Tab value="timeline">
      <Text fw={600} size="sm">Zeitleiste</Text>
      <Text size="xs" c="dimmed">Timeline</Text>
    </Tabs.Tab>
  </Tabs.List>
  {MII_MODULES.map(mod => (
    <Tabs.Panel key={mod.key} value={mod.key}>
      <MiiModuleTab module={mod} patientId={patientId} />
    </Tabs.Panel>
  ))}
  <Tabs.Panel value="timeline">
    <ClinicalTimeline patientId={patientId} />
  </Tabs.Panel>
</Tabs>
```

### SegmentedControl Toggle
```typescript
// Source: Mantine 8 SegmentedControl [VERIFIED: @mantine/core package installed]
import { SegmentedControl } from '@mantine/core';

<SegmentedControl
  value={viewMode}
  onChange={(val) => setViewMode(val as 'mii' | 'fhir')}
  data={[
    { label: 'MII Modules', value: 'mii' },
    { label: 'FHIR Resources', value: 'fhir' },
  ]}
/>
```

### Timeline Entry Card
```typescript
// Source: UI-SPEC timeline entry structure [VERIFIED: 03-UI-SPEC.md]
import { Paper, Badge, Group, Text, Stack } from '@mantine/core';

function TimelineEntry({ entry, onClick }: { entry: TimelineData; onClick: () => void }) {
  return (
    <Group gap="md" align="flex-start" wrap="nowrap">
      <Text size="sm" c="dimmed" w={100} style={{ flexShrink: 0 }}>
        {entry.date}
      </Text>
      <Paper
        p="sm"
        withBorder
        style={{ borderLeft: `3px solid var(--mantine-color-${entry.color}-6)`, cursor: 'pointer', flex: 1 }}
        onClick={onClick}
      >
        <Group gap="sm">
          <Badge color={entry.color} variant="light">{entry.typeLabel}</Badge>
          <Text size="sm">{entry.summary}</Text>
        </Group>
        <Text size="xs" c="dimmed">{entry.resourceType}/{entry.resourceId}</Text>
      </Paper>
    </Group>
  );
}
```

### Date Extraction from FHIR Resources
```typescript
// Source: FHIR R4 type definitions [VERIFIED: @medplum/fhirtypes]
function extractDate(resource: Resource): string | undefined {
  switch (resource.resourceType) {
    case 'Condition': {
      const c = resource as Condition;
      return c.onsetDateTime ?? c.recordedDate ?? c.onsetPeriod?.start;
    }
    case 'Encounter': {
      const e = resource as Encounter;
      return e.period?.start;
    }
    case 'Procedure': {
      const p = resource as Procedure;
      return p.performedDateTime ?? (p.performedPeriod as Period | undefined)?.start;
    }
    case 'Observation': {
      const o = resource as Observation;
      return o.effectiveDateTime ?? o.effectivePeriod?.start ?? o.issued;
    }
    default:
      return (resource as Record<string, unknown>).date as string | undefined;
  }
}
```

### Resource Summary Text Extraction
```typescript
// Source: FHIR R4 type definitions [VERIFIED: @medplum/fhirtypes]
function extractSummary(resource: Resource): string {
  switch (resource.resourceType) {
    case 'Condition':
      return (resource as Condition).code?.text
        ?? (resource as Condition).code?.coding?.[0]?.display
        ?? (resource as Condition).code?.coding?.[0]?.code
        ?? 'Condition';
    case 'Encounter':
      return (resource as Encounter).type?.[0]?.text
        ?? (resource as Encounter).type?.[0]?.coding?.[0]?.display
        ?? (resource as Encounter).class?.display
        ?? 'Encounter';
    case 'Procedure':
      return (resource as Procedure).code?.text
        ?? (resource as Procedure).code?.coding?.[0]?.display
        ?? 'Procedure';
    case 'Observation':
      return (resource as Observation).code?.text
        ?? (resource as Observation).code?.coding?.[0]?.display
        ?? 'Observation';
    default:
      return resource.resourceType;
  }
}
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| Patient/$everything | Individual resource type queries | N/A (design choice) | $everything returns too much data; per-type queries allow lazy loading and pagination |
| Custom FHIR patient display | Medplum PatientHeader | Medplum 5.x | Handles all Patient name/identifier edge cases out of the box |
| Flat resource list | MII Kerndatensatz module categorization | MII KDS spec | Provides clinically-meaningful grouping for German healthcare context |

## Assumptions Log

| # | Claim | Section | Risk if Wrong |
|---|-------|---------|---------------|
| A1 | Blaze supports `patient` search parameter on all six MII module resource types | Architecture Patterns | Empty search results -- would need to try `subject` parameter instead |
| A2 | `patientSearchParam` is `patient` for all six types (Condition, Procedure, Observation, MedicationStatement, Encounter, Consent) | MII Module Configuration | Some types may require `subject` instead; Observation in particular supports both |
| A3 | SearchControl correctly renders results from non-Medplum servers (Blaze) for patient-scoped searches | Architecture Patterns | If SearchControl fails, would need to use `useSearchResources` + custom table rendering |
| A4 | Mantine Tabs.Panel keeps content mounted by default (no re-render on tab switch) | Pitfall 4 | Tab content may re-fetch on every switch, causing poor UX |

## Open Questions

1. **Breadcrumb Trail in Patient Context**
   - What we know: `useBreadcrumbTrail` hardcodes `/explorer/` URLs. Patient context needs `/patients/:patientId/...` URLs.
   - What's unclear: Whether to refactor the existing hook to accept a prefix, or create a separate hook.
   - Recommendation: Parameterize `useBreadcrumbTrail` to accept a `basePath` parameter. This is a small change and avoids code duplication.

2. **Medikation Tab: MedicationStatement vs MedicationRequest**
   - What we know: D-05 lists "MedicationStatement/MedicationRequest" as the FHIR types for Medikation.
   - What's unclear: Should both be queried and merged, or should one be primary?
   - Recommendation: Query MedicationStatement as primary. If empty, try MedicationRequest. Most MII KDS data uses MedicationStatement. Show a note if using MedicationRequest fallback.

3. **ResourceDetailPage Reuse in Patient Context**
   - What we know: ResourceDetailPage works standalone in Explorer. It uses `useBreadcrumbTrail` which hardcodes `/explorer/`.
   - What's unclear: How to make reference click interception route to `/patients/:patientId/...` instead of `/explorer/...`.
   - Recommendation: The reference click interception in `ResourceDetailPage` should detect whether it's in patient context (via route params or outlet context) and use the appropriate URL prefix.

## Validation Architecture

### Test Framework
| Property | Value |
|----------|-------|
| Framework | Vitest 4.1.4 |
| Config file | vitest.config.ts |
| Quick run command | `npm run test` |
| Full suite command | `npm run test` |

### Phase Requirements -> Test Map
| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| PTNT-01 | Patient list renders with search fields and SearchControl | unit | `npx vitest run src/__tests__/patient-list.test.tsx` | No -- Wave 0 |
| PTNT-02 | Patient detail page renders PatientHeader + tabs | unit | `npx vitest run src/__tests__/patient-detail.test.tsx` | No -- Wave 0 |
| PTNT-03 | MII module tabs render with correct German labels and load patient-scoped resources | unit | `npx vitest run src/__tests__/mii-modules.test.tsx` | No -- Wave 0 |
| PTNT-04 | Clinical timeline aggregates, sorts by date, and displays entries | unit | `npx vitest run src/__tests__/clinical-timeline.test.tsx` | No -- Wave 0 |
| PTNT-05 | View toggle switches between MII and FHIR views | unit | `npx vitest run src/__tests__/patient-view-toggle.test.tsx` | No -- Wave 0 |

### Sampling Rate
- **Per task commit:** `npm run test`
- **Per wave merge:** `npm run test`
- **Phase gate:** Full suite green before `/gsd-verify-work`

### Wave 0 Gaps
- [ ] `src/__tests__/patient-list.test.tsx` -- covers PTNT-01
- [ ] `src/__tests__/patient-detail.test.tsx` -- covers PTNT-02
- [ ] `src/__tests__/mii-modules.test.tsx` -- covers PTNT-03
- [ ] `src/__tests__/clinical-timeline.test.tsx` -- covers PTNT-04
- [ ] `src/__tests__/patient-view-toggle.test.tsx` -- covers PTNT-05
- [ ] `src/utils/mii-modules.ts` -- MII module configuration (testable pure data)
- [ ] Date extraction utility tests (extractDate, extractSummary functions)

## Security Domain

### Applicable ASVS Categories

| ASVS Category | Applies | Standard Control |
|---------------|---------|-----------------|
| V2 Authentication | No | Handled at connection level (Phase 1) |
| V3 Session Management | No | Local-only app, no sessions |
| V4 Access Control | No | Read-only app, no write operations |
| V5 Input Validation | Yes | Patient search inputs should be sanitized before FHIR query construction |
| V6 Cryptography | No | No crypto operations |

### Known Threat Patterns

| Pattern | STRIDE | Standard Mitigation |
|---------|--------|---------------------|
| FHIR reference URL injection via timeline click | Tampering | Reuse existing `isValidFhirReference` validation from ResourceDetailPage (T-02-08 pattern) |
| Patient search parameter injection | Tampering | SearchControl handles parameter encoding; custom search filters should use parseSearchRequest |

## Sources

### Primary (HIGH confidence)
- `package.json` -- verified all dependency versions
- `src/components/explorer/ExplorerLayout.tsx` -- verified connection gate pattern
- `src/components/explorer/SearchResultsPage.tsx` -- verified SearchControl usage pattern
- `src/components/explorer/ResourceDetailPage.tsx` -- verified reference interception and breadcrumb patterns
- `src/hooks/useBreadcrumbTrail.ts` -- verified hardcoded `/explorer/` URLs
- `src/hooks/useSearchState.ts` -- verified URL-driven search state pattern
- `node_modules/@medplum/react/dist/cjs/index.d.ts` -- verified PatientHeader, SearchControl, ResourceTable props
- `node_modules/@medplum/core/dist/cjs/index.d.ts` -- verified MedplumClient search methods
- `.planning/phases/03-patient-centric-browsing-mii-modules/03-UI-SPEC.md` -- verified layout, color, and copy contracts

### Secondary (MEDIUM confidence)
- `.planning/phases/03-patient-centric-browsing-mii-modules/03-CONTEXT.md` -- user decisions

### Tertiary (LOW confidence)
- Blaze $everything support status -- not verified, assumed unavailable

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH -- all dependencies already installed and verified
- Architecture: HIGH -- directly extends established Phase 2 patterns
- Pitfalls: HIGH -- identified from codebase analysis of existing hardcoded paths and FHIR resource field variations

**Research date:** 2026-04-11
**Valid until:** 2026-05-11 (stable -- no dependency changes expected)
