# Phase 17: Duplicate Detection & Relational Integrity - Research

**Researched:** 2026-04-14
**Domain:** FHIR data quality -- duplicate detection and relational integrity checking
**Confidence:** HIGH

## Summary

Phase 17 adds two new quality check categories to the existing dashboard: duplicate detection (patient matching + content hash deduplication) and relational integrity (broken references + orphan resources). All four checks follow the established hook-panel-drilldown pattern from Phases 15/16 and normalize findings to `NormalizedIssue` for display via `ResourceIssueTable`.

The implementation is primarily algorithmic -- no new external libraries are needed. Patient duplicate detection uses string normalization + exact matching. Content hash deduplication uses the browser's native `crypto.subtle.digest('SHA-256', ...)` API. Broken reference checking batches existence checks via FHIR `_id` search with `_summary=count`. Orphan detection reads `min >= 1` Reference elements from bundled MII profiles.

**Primary recommendation:** Follow the usePlausibilityReport/PlausibilityPanel pattern exactly for both new tabs. Keep all four checks as pure functions tested independently, with hooks orchestrating sampling + progress + cancellation.

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions
- **D-01:** Match on normalized family name + given name + birthDate. Normalize names by lowercasing and trimming whitespace. Two patients match when all three fields are equal after normalization.
- **D-02:** Present matches as grouped pairs/clusters with a confidence indicator. Since the matching is deterministic (exact match on normalized fields), confidence is binary -- "exact match" only. No fuzzy/phonetic matching in this phase.
- **D-03:** Handle partial data gracefully: patients missing birthDate or name fields are excluded from duplicate detection (not flagged as duplicates, not flagged as errors -- simply skipped with a count shown).
- **D-04:** Compute a content hash per resource by serializing a canonical form: sort all object keys alphabetically, strip `id`, `meta` (versionId, lastUpdated), and `text` (narrative) fields, then SHA-256 hash the resulting JSON string. Two resources of the same type with different IDs but identical hashes are flagged as potential duplicates.
- **D-05:** Present content-hash duplicates grouped by resource type, showing the hash cluster size and linking to each resource in the cluster via ResourceIssueTable.
- **D-06:** Walk all Reference-typed fields in sampled resources. For each reference, check existence via batched `_id` search with `_summary=count` to minimize server round-trips.
- **D-07:** Report broken references with the source resource, the reference field path, and the target reference that doesn't resolve. Severity: warning.
- **D-08:** Define orphan detection rules per resource type based on FHIR R4 semantics. A resource is an orphan if its expected subject/patient reference field is absent or empty.
- **D-09:** Use the MII profile element definitions to determine which reference fields are expected (min >= 1 in profile). Resources without a bundled MII profile fall back to checking standard FHIR R4 subject/patient reference fields.
- **D-10:** Add 2 new tabs: "Duplicates" + "References" (expanding from 6 to 8 tabs).
- **D-11:** Both new tabs follow the established panel pattern: hook (useX) + panel component + drill-down page with ResourceIssueTable.
- **D-12:** Use the same sampling mechanism as other quality checks (10..1000 clamp via SampleSizeControl).
- **D-13:** Broken reference checking uses configurable concurrency limit (default: 5 parallel batch requests) with progress feedback.

### Claude's Discretion
- Internal module organization (single file vs separate files for each check type)
- Whether to cache reference existence results in the metricsCache
- Batch size for reference existence checks (e.g., 50 IDs per request vs 100)
- Whether orphan detection needs its own drill-down page or shares the References drill-down

### Deferred Ideas (OUT OF SCOPE)
- Advanced cohort definition via FHIRPath query or MII FDPG format
</user_constraints>

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|------------------|
| DQ-07 | Dashboard detects potential duplicate patients by matching on name + date of birth | Patient duplicate detection via normalized name+DOB exact matching (D-01 through D-03). Pure function + hook pattern. |
| DQ-08 | Dashboard detects potential duplicate resources (same content hash, different IDs) | Content hash dedup via canonical JSON serialization + Web Crypto SHA-256 (D-04, D-05). Pure function + hook pattern. |
| DQ-09 | Dashboard checks for broken references (dangling pointers to non-existent resources) | Reference walking + batched existence checks via FHIR `_id` search with `_summary=count` (D-06, D-07, D-13). |
| DQ-10 | Dashboard checks for orphan resources (resources that should reference a parent but don't) | Orphan detection via MII profile min>=1 Reference elements with R4 fallback (D-08, D-09). |
</phase_requirements>

## Standard Stack

### Core (no new dependencies)
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| Web Crypto API | Browser native | SHA-256 hashing for content dedup | Zero-dependency, available in all modern browsers. `crypto.subtle.digest('SHA-256', data)` is async and non-blocking. [VERIFIED: MDN Web Crypto API] |
| @medplum/core | 5.1.7 (installed) | FHIR client for batched existence checks | Already in project. `client.search()` with `_id` param + `_summary=count` for existence checking. [VERIFIED: codebase] |
| @mantine/core | ^8.3.18 (installed) | UI components (Tabs, Progress, Badge, etc.) | Already in project. Used by all existing quality panels. [VERIFIED: codebase] |

### No New Dependencies Required

All four checks are implementable with existing project dependencies:
- Patient name normalization: `String.prototype.toLowerCase().trim()` -- no library needed
- SHA-256 hashing: `crypto.subtle.digest()` -- browser native
- JSON key sorting: recursive `Object.keys().sort()` -- trivial utility
- Reference field walking: recursive object traversal -- pure function
- Batched HTTP: `MedplumClient.search()` with `_id` param -- already available

**Installation:** None required.

## Architecture Patterns

### Recommended Module Structure

```
src/
├── quality/
│   ├── patientDuplicateDetector.ts    # Pure function: find duplicate patient clusters
│   ├── contentHasher.ts               # Pure function: canonical JSON + SHA-256
│   ├── referenceWalker.ts             # Pure function: extract all Reference values from a resource
│   ├── referenceChecker.ts            # Async: batched existence checks against server
│   └── orphanDetector.ts              # Pure function: check required references present
├── hooks/
│   ├── useDuplicateReport.ts          # Orchestrates DQ-07 + DQ-08
│   └── useReferenceReport.ts          # Orchestrates DQ-09 + DQ-10
└── components/quality/
    ├── DuplicatesPanel.tsx            # Tab panel for Duplicates
    ├── DuplicatesDrillDown.tsx        # Drill-down page
    ├── ReferencesPanel.tsx            # Tab panel for References
    └── ReferencesDrillDown.tsx        # Drill-down page
```

**Rationale for separate files per check type:** Each check (patient dedup, content hash, reference walking, orphan detection) is a pure function with distinct test cases. Separate files keep tests focused and files under 200 lines. [ASSUMED]

### Pattern 1: Patient Duplicate Detection (DQ-07)

**What:** Group patients by normalized `(family, given, birthDate)` key. Clusters with 2+ members are potential duplicates.

**Algorithm:**
```typescript
interface PatientDuplicateCluster {
  key: string;                    // normalized "family|given|birthDate"
  patients: Array<{ id: string; resourceType: string }>;
}

function findPatientDuplicates(patients: Resource[]): {
  clusters: PatientDuplicateCluster[];
  skippedCount: number;           // patients missing name or birthDate
} {
  const map = new Map<string, Array<{ id: string; resourceType: string }>>();
  let skipped = 0;

  for (const p of patients as Patient[]) {
    const family = p.name?.[0]?.family?.toLowerCase().trim();
    const given = p.name?.[0]?.given?.[0]?.toLowerCase().trim();
    const dob = p.birthDate;

    if (!family || !given || !dob) {
      skipped++;
      continue;
    }

    const key = `${family}|${given}|${dob}`;
    if (!map.has(key)) map.set(key, []);
    map.get(key)!.push({ id: `Patient/${p.id}`, resourceType: 'Patient' });
  }

  const clusters = [...map.entries()]
    .filter(([, members]) => members.length >= 2)
    .map(([key, patients]) => ({ key, patients }));

  return { clusters, skippedCount: skipped };
}
```

**NormalizedIssue mapping:** Each member of a cluster generates one `NormalizedIssue`:
- `resourceId`: `"Patient/abc123"`
- `resourceType`: `"Patient"`
- `field`: `"name + birthDate"`
- `description`: `"[patient-duplicate] Exact match with N other patients (family|given|YYYY-MM-DD)"`
- `severity`: `"warning"`

### Pattern 2: Content Hash Deduplication (DQ-08)

**What:** Compute a canonical hash per resource, group by `(resourceType, hash)`, flag clusters with 2+ members.

**Algorithm:**
```typescript
// Canonical JSON: sort keys, strip id/meta/text
function canonicalize(resource: Resource): string {
  const stripped = { ...resource };
  delete (stripped as Record<string, unknown>).id;
  delete (stripped as Record<string, unknown>).meta;
  delete (stripped as Record<string, unknown>).text;
  return JSON.stringify(stripped, Object.keys(stripped).sort());
}

// SHA-256 via Web Crypto (async)
async function hashResource(resource: Resource): Promise<string> {
  const canonical = canonicalize(resource);
  const encoded = new TextEncoder().encode(canonical);
  const buffer = await crypto.subtle.digest('SHA-256', encoded);
  return Array.from(new Uint8Array(buffer))
    .map(b => b.toString(16).padStart(2, '0'))
    .join('');
}
```

**Important:** `JSON.stringify(obj, replacer)` where replacer is a key array only works for the top-level object. For deep key sorting, use a recursive sort function:
```typescript
function sortKeys(obj: unknown): unknown {
  if (Array.isArray(obj)) return obj.map(sortKeys);
  if (obj !== null && typeof obj === 'object') {
    const sorted: Record<string, unknown> = {};
    for (const key of Object.keys(obj as Record<string, unknown>).sort()) {
      sorted[key] = sortKeys((obj as Record<string, unknown>)[key]);
    }
    return sorted;
  }
  return obj;
}
```

### Pattern 3: Reference Walking (DQ-09)

**What:** Recursively walk a FHIR resource's properties to extract all `{ reference: "Type/id" }` values with their JSON paths.

**Algorithm:**
```typescript
interface ExtractedReference {
  path: string;       // e.g., "Encounter.subject.reference"
  reference: string;  // e.g., "Patient/123"
}

function extractReferences(resource: Resource): ExtractedReference[] {
  const refs: ExtractedReference[] = [];

  function walk(obj: unknown, path: string) {
    if (obj === null || obj === undefined) return;
    if (Array.isArray(obj)) {
      obj.forEach((item, i) => walk(item, `${path}[${i}]`));
      return;
    }
    if (typeof obj === 'object') {
      const record = obj as Record<string, unknown>;
      if (typeof record.reference === 'string') {
        refs.push({ path: `${path}.reference`, reference: record.reference });
      }
      for (const [key, value] of Object.entries(record)) {
        if (key === 'reference') continue; // already handled
        walk(value, path ? `${path}.${key}` : key);
      }
    }
  }

  walk(resource, resource.resourceType ?? '');
  return refs;
}
```

### Pattern 4: Batched Existence Checking (DQ-09)

**What:** Collect all unique `Type/id` references, group by type, then check existence in batches via `_id=id1,id2,...&_summary=count`.

```typescript
// Group references by target resource type
// Then batch-check: GET /ResourceType?_id=a,b,c&_summary=count
// If returned total < batch size, some are missing
// To identify WHICH are missing: GET /ResourceType?_id=a,b,c&_elements=id
// Then diff the returned IDs against the requested IDs

async function checkReferencesExist(
  client: MedplumClient,
  refs: ExtractedReference[],
  batchSize: number = 50,
  concurrency: number = 5,
): Promise<Set<string>> {
  // Returns set of broken references (e.g., "Patient/nonexistent")
  const byType = new Map<string, Set<string>>();
  for (const ref of refs) {
    const [type, id] = ref.reference.split('/');
    if (!type || !id) continue;
    if (!byType.has(type)) byType.set(type, new Set());
    byType.get(type)!.add(id);
  }

  const broken = new Set<string>();

  for (const [type, ids] of byType) {
    const idArray = [...ids];
    // Process in batches with concurrency limit
    for (let i = 0; i < idArray.length; i += batchSize) {
      const batch = idArray.slice(i, i + batchSize);
      const results = await client.searchResources(type as ResourceType, {
        _id: batch.join(','),
        _elements: 'id',
      });
      const foundIds = new Set(results.map(r => r.id));
      for (const id of batch) {
        if (!foundIds.has(id)) broken.add(`${type}/${id}`);
      }
    }
  }

  return broken;
}
```

**Key design choice for `_elements` vs `_summary=count`:** Using `_summary=count` tells you IF any are missing but not WHICH. Using `_elements=id` returns only the `id` field, keeping response size tiny while identifying exactly which IDs exist. This is the better approach for broken reference detection. [ASSUMED -- Blaze _elements support should be verified at implementation time]

### Pattern 5: Orphan Detection (DQ-10)

**What:** For each sampled resource, check if expected Reference fields (min >= 1 in profile) are populated.

```typescript
function getRequiredReferenceFields(resourceType: string): string[] {
  const profile = getProfileForType(resourceType);
  if (profile) {
    // Extract elements with min >= 1 and type includes Reference
    return profile.snapshot?.element
      ?.filter(e =>
        (e.min ?? 0) >= 1 &&
        e.type?.some(t => t.code === 'Reference')
      )
      .map(e => e.path ?? '') ?? [];
  }

  // R4 fallback: common subject/patient fields
  const FALLBACK: Record<string, string[]> = {
    Observation: ['Observation.subject'],
    Condition: ['Condition.subject'],
    Encounter: ['Encounter.subject'],
    Procedure: ['Procedure.subject'],
    MedicationStatement: ['MedicationStatement.subject'],
    MedicationRequest: ['MedicationRequest.subject'],
    DiagnosticReport: ['DiagnosticReport.subject'],
    AllergyIntolerance: ['AllergyIntolerance.patient'],
    Immunization: ['Immunization.patient'],
    CarePlan: ['CarePlan.subject'],
  };
  return FALLBACK[resourceType] ?? [];
}
```

**Verified from bundled profiles:** All 7 MII profiles (Condition, Observation, Patient, Procedure, MedicationStatement, Encounter, Consent) have `subject` or `patient` Reference fields with `min=1`. The profile data structure supports the `e.min >= 1 && e.type includes Reference` filter pattern. [VERIFIED: codebase profile JSONs]

### Anti-Patterns to Avoid
- **Individual HEAD requests per reference:** Server will be hammered. Always batch via `_id=a,b,c`. [VERIFIED: D-06 decision]
- **Hashing with JSON.stringify without deep key sorting:** Top-level key sort only catches shallow differences. Resources with nested objects will produce different hashes for identical content if key order differs.
- **Using `_summary=count` for broken ref detection:** Tells you the count but not WHICH references are broken. Use `_elements=id` instead.
- **Blocking the UI during SHA-256 computation:** `crypto.subtle.digest` is async -- use it correctly with batched yields to keep the UI responsive.

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| SHA-256 hashing | Custom hash function or npm crypto lib | `crypto.subtle.digest('SHA-256', ...)` | Browser-native, zero dependencies, async/non-blocking. Available in all target browsers. [VERIFIED: Web Crypto API] |
| Progress + cancellation pattern | Custom state machine | Copy `usePlausibilityReport` pattern | Already proven in Phase 16. Same state machine (idle/running/complete/cancelled/error), same `cancelledRef` pattern. [VERIFIED: codebase] |
| Issue display table | Custom table component | `ResourceIssueTable` | Already handles pagination, severity filtering, field filtering, clickable links. [VERIFIED: codebase] |
| Resource sampling | Custom fetch logic | `sampleResources()` from `sampling.ts` | Existing utility, consistent with all other quality checks. [VERIFIED: codebase] |

## Common Pitfalls

### Pitfall 1: JSON.stringify Key Order is Not Deep
**What goes wrong:** Using `JSON.stringify(obj, keyArray)` only sorts top-level keys. Nested objects retain their original key order, producing different hashes for semantically identical resources.
**Why it happens:** `JSON.stringify` replacer as array only applies to the root level.
**How to avoid:** Write a recursive `sortKeys()` utility that deep-sorts all object keys before stringifying.
**Warning signs:** Two visually identical resources producing different hashes in tests.

### Pitfall 2: Absolute vs Relative FHIR References
**What goes wrong:** FHIR references can be relative (`"Patient/123"`), absolute (`"http://server/fhir/Patient/123"`), or URN-based (`"urn:uuid:abc"`). Code that only handles relative format misses the others.
**Why it happens:** Different FHIR servers produce different reference formats.
**How to avoid:** Parse references to extract `Type/id` from all three formats. Skip URN references (they're bundle-internal and can't be checked via REST). Skip absolute URLs that point to external servers.
**Warning signs:** Broken reference count seems unexpectedly high (URN refs being flagged).

### Pitfall 3: Contained Resources
**What goes wrong:** FHIR resources can have `contained` resources with references like `"#contained-id"`. These internal references should NOT be checked against the server.
**Why it happens:** Contained resources are inline, not independently addressable.
**How to avoid:** Skip references starting with `#` during reference walking.
**Warning signs:** Many broken references where the reference value starts with `#`.

### Pitfall 4: Web Crypto Async in Tight Loops
**What goes wrong:** Calling `crypto.subtle.digest()` in a tight loop without yielding blocks the event loop despite the API being async.
**Why it happens:** Microtask queue saturation -- all promises resolve in the same tick.
**How to avoid:** Process resources in batches (e.g., 25 at a time like `usePlausibilityReport`) and yield between batches with a small `setTimeout` or by batching `Promise.all` calls.
**Warning signs:** UI freezes during content hash computation on large samples.

### Pitfall 5: Sample Size Impact on Duplicate Detection
**What goes wrong:** Patient duplicate detection with small samples misses many duplicates, giving a false sense of data quality.
**Why it happens:** Duplicates are rare events -- a 100-resource sample from 50,000 patients may contain zero duplicate pairs.
**How to avoid:** Document this limitation in the UI. Show a note like "Checked N of M patients. Increase sample size for more thorough detection."
**Warning signs:** Users report "no duplicates found" when they know duplicates exist.

### Pitfall 6: Missing `_elements` Support in Blaze
**What goes wrong:** If Blaze doesn't support `_elements=id`, the existence check query returns full resources, wasting bandwidth.
**Why it happens:** `_elements` is an optional FHIR search parameter.
**How to avoid:** Fall back to `_summary=data` or just accept full resources if `_elements` fails. The important thing is the `_id` batching to reduce round-trips.
**Warning signs:** Slow reference checking despite batching.

## Code Examples

### Integrating New Tabs into QualityOverviewPage

Based on the existing tab pattern in `QualityOverviewPage.tsx` (lines 97-127):

```typescript
// Add imports
import { DuplicatesPanel } from './DuplicatesPanel';
import { ReferencesPanel } from './ReferencesPanel';

// Add tabs inside <Tabs.List> after existing tabs:
<Tabs.Tab value="duplicates">Duplicates</Tabs.Tab>
<Tabs.Tab value="references">References</Tabs.Tab>

// Add panels after existing panels:
<Tabs.Panel value="duplicates" pt="md" keepMounted>
  <DuplicatesPanel types={effectiveTypes} client={client} sampleSize={sampleSize} />
</Tabs.Panel>
<Tabs.Panel value="references" pt="md" keepMounted>
  <ReferencesPanel types={effectiveTypes} client={client} sampleSize={sampleSize} />
</Tabs.Panel>
```
[VERIFIED: QualityOverviewPage.tsx structure in codebase]

### Adding Drill-Down Routes

Based on existing routes in `App.tsx` (lines 69-75):

```typescript
// Inside <Route path="/quality" ...>:
<Route path="duplicates" element={<DuplicatesDrillDown />} />
<Route path="references/:type" element={<ReferencesDrillDown />} />
```
[VERIFIED: App.tsx routing pattern in codebase]

### Hook Return Type (following established pattern)

```typescript
// Same shape as usePlausibilityReport (verified from codebase)
export interface DuplicateRunState {
  status: 'idle' | 'running' | 'complete' | 'cancelled' | 'error';
  progress: { current: number; total: number };
  issues: NormalizedIssue[];
  // Extension for duplicate-specific summary data:
  duplicateClusters?: PatientDuplicateCluster[];
  contentHashClusters?: ContentHashCluster[];
  skippedPatients?: number;
  errorMessage?: string;
  start: () => void;
  cancel: () => void;
}
```
[VERIFIED: usePlausibilityReport pattern in codebase]

## Validation Architecture

### Test Framework
| Property | Value |
|----------|-------|
| Framework | Vitest 4.1.4 |
| Config file | `vitest.config.ts` |
| Quick run command | `npx vitest run --reporter=verbose` |
| Full suite command | `npm run test` |

### Phase Requirements to Test Map
| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| DQ-07 | Patient duplicate detection by name+DOB | unit | `npx vitest run src/__tests__/patient-duplicate-detector.test.ts -x` | Wave 0 |
| DQ-08 | Content hash dedup (canonical JSON + SHA-256) | unit | `npx vitest run src/__tests__/content-hasher.test.ts -x` | Wave 0 |
| DQ-09 | Broken reference detection (walking + batched checks) | unit | `npx vitest run src/__tests__/reference-checker.test.ts -x` | Wave 0 |
| DQ-10 | Orphan resource detection | unit | `npx vitest run src/__tests__/orphan-detector.test.ts -x` | Wave 0 |

### Sampling Rate
- **Per task commit:** `npx vitest run --reporter=verbose`
- **Per wave merge:** `npm run test`
- **Phase gate:** Full suite green before `/gsd-verify-work`

### Wave 0 Gaps
- [ ] `src/__tests__/patient-duplicate-detector.test.ts` -- covers DQ-07 (name normalization, clustering, partial data handling)
- [ ] `src/__tests__/content-hasher.test.ts` -- covers DQ-08 (canonical form, deep key sort, field stripping, hash consistency)
- [ ] `src/__tests__/reference-checker.test.ts` -- covers DQ-09 (reference extraction, relative/absolute/URN/contained refs, batched checking)
- [ ] `src/__tests__/orphan-detector.test.ts` -- covers DQ-10 (profile-based detection, R4 fallback, missing fields)

## Assumptions Log

| # | Claim | Section | Risk if Wrong |
|---|-------|---------|---------------|
| A1 | Blaze supports `_elements=id` search parameter for efficient existence checks | Architecture Patterns / Pattern 4 | LOW -- fallback is to accept full resources (more bandwidth but still functional) |
| A2 | Separate files per check type is better than a single module | Architecture Patterns | LOW -- organizational preference, easy to refactor |
| A3 | 50 IDs per batch is a good default for `_id` search | Architecture Patterns | LOW -- tunable, no correctness impact |

## Open Questions

1. **Blaze `_elements` support**
   - What we know: `_elements` is optional in FHIR spec. Blaze supports `_summary=count`.
   - What's unclear: Whether Blaze supports `_elements=id` specifically.
   - Recommendation: Try `_elements=id` first, fall back to full resource fetch. Either way, the `_id` batching is the primary optimization.

2. **Drill-down page for duplicates**
   - What we know: Other checks have per-type drill-down pages (e.g., `/quality/plausibility/:type`).
   - What's unclear: Patient duplicates are cross-resource (showing clusters), not per-type. Content hash duplicates ARE per-type.
   - Recommendation: Single `/quality/duplicates` drill-down page (no `:type` param) that shows both patient and content hash results filtered by the panel's current state. This matches D-10 which puts both on one "Duplicates" tab.

## Security Domain

### Applicable ASVS Categories

| ASVS Category | Applies | Standard Control |
|---------------|---------|-----------------|
| V2 Authentication | no | N/A -- local app |
| V3 Session Management | no | N/A -- local app |
| V4 Access Control | no | N/A -- read-only |
| V5 Input Validation | yes | Validate reference format before parsing (Type/id split). Reject malformed references gracefully. |
| V6 Cryptography | no | SHA-256 used for fingerprinting, not security. No secrets involved. |

### Known Threat Patterns

| Pattern | STRIDE | Standard Mitigation |
|---------|--------|---------------------|
| ReDoS in reference parsing | Denial of Service | Use simple string split, not regex, for `Type/id` extraction |
| Large sample causing OOM | Denial of Service | Sample size clamped to 1000 by existing SampleSizeControl |

## Sources

### Primary (HIGH confidence)
- Codebase inspection: `src/quality/types.ts`, `src/quality/sampling.ts`, `src/hooks/usePlausibilityReport.ts`, `src/components/quality/PlausibilityPanel.tsx`, `src/components/quality/ResourceIssueTable.tsx`, `src/components/quality/QualityOverviewPage.tsx`, `src/quality/profiles/index.ts`
- Bundled MII profile JSONs: verified Reference elements with min=1 across all 7 profiles
- App.tsx routing: verified drill-down route pattern

### Secondary (MEDIUM confidence)
- Web Crypto API: `crypto.subtle.digest('SHA-256', ...)` -- well-documented browser standard
- FHIR R4 search: `_id` parameter for batch existence checking -- core spec feature

### Tertiary (LOW confidence)
- Blaze `_elements` support -- needs runtime verification

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH -- no new dependencies, all patterns verified in codebase
- Architecture: HIGH -- follows established hook+panel+drilldown pattern exactly
- Pitfalls: HIGH -- common FHIR reference edge cases well-documented in spec
- Algorithms: HIGH -- deterministic matching/hashing with clear specifications from CONTEXT.md

**Research date:** 2026-04-14
**Valid until:** 2026-05-14 (stable -- no moving targets)
