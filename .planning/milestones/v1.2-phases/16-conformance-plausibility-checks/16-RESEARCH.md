# Phase 16: Conformance & Plausibility Checks - Research

**Researched:** 2026-04-14
**Domain:** FHIR data quality -- conformance validation (value sets, cardinality) and plausibility checks (temporal, lab ranges)
**Confidence:** HIGH

## Summary

Phase 16 extends the existing quality dashboard with three new check categories: (1) comprehensive profile-based conformance checking that replaces/extends the current `structuralValidator.ts`, (2) temporal plausibility checks with configurable thresholds, and (3) lab reference range checks. All findings normalize into the Phase 15 `NormalizedIssue` format and render via the shared `ResourceIssueTable` component.

The implementation is primarily a codebase extension -- no new libraries are needed. The core challenge is enriching the bundled MII StructureDefinition JSON files with additional element metadata (`max`, `type`, `binding`) that the trimmed profiles currently lack. The conformance checker then walks these enriched profiles to validate value set membership (via terminology server `$expand`), max cardinality constraints, and type correctness. Temporal and lab checks are separate walkers that follow the established `codingCoverageWalker` pattern.

**Primary recommendation:** Enrich bundled profile JSONs with `max`, `type[].code`, and `binding.valueSet` fields per element, then build a unified `profileConformanceChecker.ts` that supersedes `structuralValidator.ts` for the enhanced Validation panel. Build `temporalPlausibilityWalker.ts` and `labRangeChecker.ts` as independent modules for their respective new tabs.

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions
- **D-01:** Use the MII Terminology Server to expand value sets via `$expand`. Extract value set binding URLs from the bundled MII StructureDefinition element definitions. Cache expansions in memory for the browser session (re-fetched on page reload).
- **D-02:** When the terminology server is unavailable, skip value set conformance checks and show a warning banner on the Validation panel: "Terminology server unavailable -- value set conformance checks skipped." Consistent with the existing terminology fallback pattern in `src/terminology/`.
- **D-03:** Non-conforming coded values appear in the existing Validation panel (not a new tab), alongside structural validation issues.
- **D-04:** Replace the current structural validator with a comprehensive profile-based checker that covers: min cardinality (existing), max cardinality (new -- fields with max=1 must not have multiple values), type constraints (new -- values match expected FHIR types from profile), and value set bindings (new -- DQ-03 folds into this unified checker).
- **D-05:** All conformance/cardinality issues appear in the existing Validation panel in the same section -- no separate sub-tab. Users see all profile conformance findings in one place.
- **D-06:** Implement four temporal plausibility checks: (1) future dates -- flag any dateTime/date value in the future, (2) period consistency -- flag Period-typed fields where end < start, (3) age plausibility -- flag Patient.birthDate implying age > 150 or negative age, (4) clinical duration limits -- flag encounters > 365 days, observations with effectiveDateTime before patient birth.
- **D-07:** Auto-discover date/dateTime/Period fields by walking MII profile elements for temporal types. Extensible as new profiles are added -- no hardcoded field list.
- **D-08:** Clinical duration thresholds (max age, max encounter duration) are configurable from the start -- stored in settings.yaml. Do not defer to Phase 18.
- **D-09:** Temporal plausibility checks appear in a new "Plausibility" tab on the quality dashboard, separate from the Validation panel.
- **D-10:** Data-first approach: use `Observation.referenceRange` from the FHIR data when present. Allow user-defined overrides/defaults in settings.yaml for LOINC codes without embedded ranges. Config overrides take precedence over data-embedded ranges.
- **D-11:** Flag when `Observation.valueQuantity.value < referenceRange.low.value` or `> referenceRange.high.value`. Standard clinical range logic.
- **D-12:** Lab range checks appear in a separate "Lab Ranges" tab on the quality dashboard (not grouped with temporal plausibility).
- **D-13:** Reference range configuration stored in a `referenceRanges` section of the existing `settings.yaml`, keyed by LOINC code with low/high/unit values.
- **D-14:** Quality dashboard tabs expand from 4 to 6: Counts | Completeness | Coding Coverage | Validation (enhanced with conformance + cardinality) | Plausibility (temporal) | Lab Ranges.
- **D-15:** All new checks (conformance, cardinality, plausibility, lab ranges) normalize their findings into `NormalizedIssue` format and use the shared `ResourceIssueTable` component for drill-down, consistent with Phase 15 patterns.

### Claude's Discretion
- Whether to refactor structuralValidator.ts in place or create a new profileValidator.ts that supersedes it
- Internal organization of the plausibility walker (single module vs split by check type)
- How to structure the settings.yaml schema for reference ranges and plausibility thresholds
- Whether auto-discovery of temporal fields needs a fallback for resources without bundled profiles

### Deferred Ideas (OUT OF SCOPE)
None -- discussion stayed within phase scope

### Folded Todos (IN SCOPE)
- Add cohort selection for scoped data quality analysis -- interactive UI filtering
- Define cohorts via FHIRPath query or MII FDPG format -- programmatic definition, import/export, deletion
</user_constraints>

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|------------------|
| DQ-03 | Dashboard checks resources against expected value sets and flags non-conforming coded values | Profile-based conformance checker extracts `binding.valueSet` from enriched profile elements, expands via terminology server `$expand`, validates coded fields against expanded code lists |
| DQ-04 | Dashboard checks cardinality rules (required fields present, no unexpected repeats) per resource type | Unified profile checker validates `min` (existing) and `max` (new) cardinality from enriched profile elements, plus type constraints |
| DQ-05 | Dashboard flags implausible temporal values (dates in the future, encounter end before start, negative age) | Temporal plausibility walker auto-discovers date/dateTime/Period fields from profile elements, applies four check categories |
| DQ-06 | Dashboard flags lab observations with values outside configurable reference ranges | Lab range checker reads `Observation.referenceRange` + settings.yaml overrides, compares `valueQuantity.value` against low/high bounds |
</phase_requirements>

## Standard Stack

No new libraries required. Phase 16 builds entirely on the existing stack.

### Core (already installed)
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| @medplum/core | 5.1.7 | MedplumClient for terminology `$expand` calls | Already used for terminology resolution |
| @mantine/core | ^8.3.18 | Tabs, Table, Alert, Badge for new panels | Already used in quality dashboard |
| react-router-dom | ^7.14.0 | New drill-down routes for Plausibility and Lab Ranges | Already used for quality routes |
| js-yaml | 4.1.1 | Extended settings.yaml with plausibility thresholds and reference ranges | Already used for settings |

[VERIFIED: existing package.json and installed dependencies]

## Architecture Patterns

### Recommended Module Structure
```
src/
├── quality/
│   ├── profileConformanceChecker.ts   # NEW: replaces structuralValidator.ts
│   ├── temporalPlausibilityWalker.ts  # NEW: walks temporal fields
│   ├── labRangeChecker.ts             # NEW: lab reference range validation
│   ├── valueSetCache.ts               # NEW: in-memory $expand cache
│   ├── structuralValidator.ts         # DEPRECATED: superseded by profileConformanceChecker
│   ├── validationBackends.ts          # MODIFIED: wire new conformance checker
│   ├── types.ts                       # MODIFIED: new report types
│   ├── profiles/
│   │   ├── *.json                     # MODIFIED: enrich with max, type, binding
│   │   └── index.ts                   # unchanged
│   └── ...existing walkers
├── config/
│   ├── types.ts                       # MODIFIED: plausibility + referenceRanges sections
│   └── settings.ts                    # MODIFIED: deepMerge for new sections
├── components/quality/
│   ├── QualityOverviewPage.tsx         # MODIFIED: 2 new tabs
│   ├── ValidationPanel.tsx            # MODIFIED: terminology unavailable banner
│   ├── PlausibilityPanel.tsx          # NEW: temporal plausibility tab
│   ├── LabRangesPanel.tsx             # NEW: lab reference range tab
│   ├── PlausibilityDrillDown.tsx      # NEW: per-type drill-down
│   ├── LabRangesDrillDown.tsx         # NEW: per-type drill-down
│   └── CohortSelector.tsx            # NEW: cohort selection control
├── hooks/
│   ├── usePlausibilityReport.ts       # NEW: temporal check runner hook
│   └── useLabRangesReport.ts          # NEW: lab range check runner hook
└── App.tsx                            # MODIFIED: 2 new drill-down routes
```

### Pattern 1: Enriched Profile Element Schema
**What:** Extend the trimmed bundled profile JSONs with `max`, `type`, and `binding` metadata per element.
**When to use:** All profile-based checks (conformance, cardinality, temporal auto-discovery).
**Why:** The current profiles only carry `{ path, min, mustSupport }`. DQ-03 needs `binding.valueSet`, DQ-04 needs `max`, and DQ-05 needs `type[].code` for temporal field detection.

```typescript
// Extended element shape in profile JSONs
interface EnrichedElement {
  path: string;
  min?: number;
  max?: string;        // NEW: "1", "*", "0"
  mustSupport?: boolean;
  sliceName?: string;
  type?: Array<{       // NEW
    code: string;      // e.g., "CodeableConcept", "dateTime", "Period", "Quantity"
  }>;
  binding?: {          // NEW
    strength: 'required' | 'extensible' | 'preferred' | 'example';
    valueSet?: string; // canonical URL like "http://hl7.org/fhir/ValueSet/..."
  };
}
```
[VERIFIED: FHIR R4 StructureDefinition.snapshot.element schema from HL7 spec]

### Pattern 2: Unified Profile Conformance Checker (supersedes structuralValidator)
**What:** A single-pass walker that checks min cardinality, max cardinality, type constraints, and value set bindings for each element in a resource against its MII profile.
**When to use:** The enhanced Validation panel (D-04).
**Recommendation:** Create a new `profileConformanceChecker.ts` rather than refactoring `structuralValidator.ts` in place. Rationale: the structural validator is simple (40 lines), well-tested, and its API (`validateStructural` + `createStructuralBackend`) is consumed by `validationBackends.ts`. A new module with a richer API is cleaner than mutating the existing one, and `validationBackends.ts` simply swaps which backend factory it calls.

```typescript
// Source: derived from existing structuralValidator.ts pattern
export interface ConformanceIssue {
  path: string;
  code: 'required' | 'max-cardinality' | 'type-mismatch' | 'value-set';
  severity: 'error' | 'warning';
  diagnostics: string;
}

export async function validateConformance(
  resource: Resource,
  profile: StructureDefinition | null,
  expandedValueSets: Map<string, Set<string>>, // valueSetUrl → set of system|code
): Promise<ConformanceIssue[]> {
  if (!profile) return [];
  const elements = profile.snapshot?.element ?? [];
  const issues: ConformanceIssue[] = [];
  
  for (const el of elements) {
    // 1. Min cardinality (existing behavior)
    if ((el.min ?? 0) >= 1 && !isPathPopulated(resource, el.path)) {
      issues.push({ path: el.path, code: 'required', severity: 'error', ... });
    }
    // 2. Max cardinality (new)
    if (el.max === '1' && isArrayAtPath(resource, el.path)) {
      issues.push({ path: el.path, code: 'max-cardinality', severity: 'error', ... });
    }
    // 3. Type constraints (new)
    if (el.type?.length && !matchesExpectedType(resource, el)) {
      issues.push({ path: el.path, code: 'type-mismatch', severity: 'error', ... });
    }
    // 4. Value set binding (new - DQ-03)
    if (el.binding?.valueSet && el.binding.strength !== 'example') {
      const codes = expandedValueSets.get(el.binding.valueSet);
      if (codes && !isCodeInValueSet(resource, el.path, codes)) {
        issues.push({ path: el.path, code: 'value-set', severity: 'warning', ... });
      }
    }
  }
  return issues;
}
```
[ASSUMED: exact API shape -- will be refined during implementation]

### Pattern 3: Value Set Expansion Cache
**What:** In-memory `Map<string, Set<string>>` that caches `$expand` results per value set URL for the browser session.
**When to use:** DQ-03 value set conformance checks.

```typescript
// Source: pattern derived from TerminologyResolver cache approach
export class ValueSetCache {
  private cache = new Map<string, Set<string>>(); // valueSetUrl → Set<"system|code">
  private inflight = new Map<string, Promise<Set<string> | null>>();

  async expand(
    client: MedplumClient,
    valueSetUrl: string,
  ): Promise<Set<string> | null> {
    const cached = this.cache.get(valueSetUrl);
    if (cached) return cached;
    // Coalesce concurrent requests
    const running = this.inflight.get(valueSetUrl);
    if (running) return running;
    
    const p = this.fetchExpand(client, valueSetUrl);
    this.inflight.set(valueSetUrl, p);
    return p;
  }

  private async fetchExpand(
    client: MedplumClient,
    valueSetUrl: string,
  ): Promise<Set<string> | null> {
    try {
      // $expand?url=<canonical>&count=1000
      const result = await client.get(
        `ValueSet/$expand?url=${encodeURIComponent(valueSetUrl)}&count=1000`
      );
      const codes = new Set<string>();
      for (const contains of result?.expansion?.contains ?? []) {
        if (contains.system && contains.code) {
          codes.add(`${contains.system}|${contains.code}`);
        }
      }
      this.cache.set(valueSetUrl, codes);
      return codes;
    } catch {
      return null; // terminology server unavailable
    } finally {
      this.inflight.delete(valueSetUrl);
    }
  }
}
```
[VERIFIED: FHIR R4 ValueSet/$expand operation returns `expansion.contains[].{system, code}` -- standard FHIR operation]

### Pattern 4: Temporal Field Auto-Discovery
**What:** Walk profile elements and collect all paths with `type[].code` in `{'dateTime', 'date', 'Period', 'instant'}`.
**When to use:** DQ-05 temporal plausibility checks (D-07).

```typescript
// Source: mirrors codingCoverageWalker's approach of walking by type
export function discoverTemporalPaths(
  profile: StructureDefinition,
): Array<{ path: string; type: 'dateTime' | 'date' | 'Period' | 'instant' }> {
  const elements = profile.snapshot?.element ?? [];
  const temporalTypes = new Set(['dateTime', 'date', 'Period', 'instant']);
  const result: Array<{ path: string; type: string }> = [];
  
  for (const el of elements) {
    for (const t of el.type ?? []) {
      if (temporalTypes.has(t.code)) {
        result.push({ path: el.path, type: t.code });
      }
    }
  }
  return result;
}
```
[VERIFIED: FHIR R4 primitive types include dateTime, date, instant; complex type Period has start/end -- from HL7 spec]

### Pattern 5: Fallback for Resources Without Bundled Profiles
**What:** For temporal auto-discovery when a resource type has no bundled MII profile.
**Recommendation:** Implement a generic runtime walker that detects temporal values by inspecting the resource JSON directly (similar to how `codingCoverageWalker` detects CodeableConcepts by shape). Walk all string values and check if they match ISO 8601 date patterns; walk all objects and check for `start`/`end` string properties (Period shape). This ensures plausibility checks work for resource types beyond the 7 bundled profiles.

[ASSUMED: this fallback approach is sufficient -- the profile-based approach is primary]

### Pattern 6: Settings Schema Extension
**What:** Extend `AppSettings` with `plausibility` and `referenceRanges` sections.

```typescript
// Source: derived from existing AppSettings pattern
export interface AppSettings {
  fhir: { ... };
  terminology?: { ... };
  validation?: { ... };
  plausibility?: {
    maxAge?: number;               // default: 150
    maxEncounterDays?: number;     // default: 365
  };
  referenceRanges?: Record<string, {  // keyed by LOINC code
    low?: number;
    high?: number;
    unit?: string;
  }>;
}
```

Corresponding `settings.yaml`:
```yaml
plausibility:
  maxAge: 150
  maxEncounterDays: 365

referenceRanges:
  "2093-3":    # Total Cholesterol
    low: 0
    high: 300
    unit: "mg/dL"
  "2571-8":    # Triglycerides
    low: 0
    high: 500
    unit: "mg/dL"
```
[ASSUMED: exact LOINC codes and ranges are examples -- user configures actual values]

### Anti-Patterns to Avoid
- **Hardcoding temporal field paths:** D-07 explicitly requires auto-discovery from profiles. Never maintain a manual list like `['Patient.birthDate', 'Encounter.period.start']`.
- **Separate value set conformance module:** D-04 explicitly folds DQ-03 into the unified profile checker. Do not create a standalone `valueSetValidator.ts`.
- **Blocking on terminology server:** Value set expansion failures must not prevent other conformance checks from running. The checker must handle partial results gracefully.
- **Mutating the existing structuralValidator.ts API:** Create a new module instead. The old one can be deprecated but should not have its interface changed, since `validationBackends.ts` consumes it.

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Value set expansion | Custom code system lookup | Terminology server `$expand` via MedplumClient | Value sets can contain thousands of codes from multiple code systems; `$expand` handles includes/excludes/filters |
| FHIR date parsing | Custom regex parser | `new Date()` + ISO 8601 validation | FHIR dateTime is a subset of ISO 8601; native Date parsing handles it correctly |
| Period comparison | Custom date math | Simple `new Date(end) < new Date(start)` | FHIR Period start/end are ISO strings; native comparison works |
| Resource sampling | Custom pagination | Existing `sampleResources()` from `src/quality/sampling.ts` | Already handles pagination, random sampling, and Blaze quirks |

**Key insight:** The main complexity is in the profile element walking and value set caching -- the actual check logic for each category is straightforward comparison logic. The walker infrastructure from completenessWalker and codingCoverageWalker provides proven patterns to follow.

## Common Pitfalls

### Pitfall 1: Bundled Profile JSON Stale After Enrichment
**What goes wrong:** Enriching profile JSONs with `max`, `type`, `binding` metadata changes the bundle size and may miss fields if done incorrectly.
**Why it happens:** The current profiles were trimmed for completeness checking only. The enrichment must be done against the full MII StructureDefinitions from Simplifier.
**How to avoid:** Source the full StructureDefinitions from the published MII packages on Simplifier (e.g., `de.medizininformatik-initiative.kerndatensatz.diagnose`). Trim to only the needed fields: `{ path, min, max, mustSupport, sliceName, type: [{code}], binding: {strength, valueSet} }`.
**Warning signs:** Profile element count changes after enrichment; missing `type` arrays on polymorphic elements like `value[x]`.

### Pitfall 2: Choice Type Elements in Conformance Checking
**What goes wrong:** Elements like `Observation.value[x]` or `Condition.onset[x]` need special handling for both type checking and value set binding.
**Why it happens:** FHIR choice types map `value[x]` to concrete properties like `valueQuantity`, `valueString`, etc. The profile declares allowed types on the `value[x]` element.
**How to avoid:** Reuse the existing `[x]` handling from `isPathPopulated()` in `completenessWalker.ts` -- it already handles the prefix-matching pattern. Extend for type validation: check that the concrete suffix matches one of the declared `type[].code` values.
**Warning signs:** False positives on resources with valid choice type values that happen to use an unexpected (but allowed) type.

### Pitfall 3: Value Set $expand Pagination and Size
**What goes wrong:** Large value sets (ICD-10-GM has ~16,000 codes) may exceed the server's default page size for `$expand`.
**Why it happens:** Terminology servers typically cap `$expand` responses at 1000-2000 entries unless `count` is specified.
**How to avoid:** Pass `count=10000` (or higher) in the `$expand` request. If the expansion is incomplete (`expansion.total > expansion.contains.length`), iterate with `offset` parameter. Cache the full expansion.
**Warning signs:** Conformance checks miss valid codes that are beyond the first page of the expansion.

### Pitfall 4: Terminology Server CORS / Availability
**What goes wrong:** The `$expand` call fails due to CORS restrictions or server downtime, blocking all value set conformance checks.
**Why it happens:** The app runs in a browser; the terminology server may not allow cross-origin requests.
**How to avoid:** D-02 already specifies the mitigation: skip value set checks and show a warning banner. The existing Vite proxy for the terminology server (see `vite.config.ts` proxy rules) should handle CORS in dev mode. For production, the user must configure their own proxy.
**Warning signs:** `$expand` calls failing with CORS errors in the browser console.

### Pitfall 5: FHIR Date Precision Levels
**What goes wrong:** FHIR dates can have variable precision: `2024`, `2024-03`, `2024-03-15`, `2024-03-15T10:30:00Z`. Future date checks must handle all precision levels.
**Why it happens:** FHIR `date` allows year-only, year-month, and full date. `dateTime` additionally allows time. `new Date('2024')` parses to Jan 1 2024 00:00 UTC.
**How to avoid:** For "future date" checks, parse the FHIR date string with `new Date()` and compare to `Date.now()`. Year-only and year-month values naturally compare correctly since they parse to the start of the period. A date of `2028` correctly flags as future. Add a small tolerance (e.g., 1 hour) to avoid flagging "today" dates due to timezone differences.
**Warning signs:** False positives on dates that are "today" in a different timezone.

### Pitfall 6: Observation.referenceRange Array
**What goes wrong:** `Observation.referenceRange` is an array (multiple ranges for different contexts like age/sex). Using the wrong range produces incorrect flags.
**Why it happens:** FHIR allows multiple reference ranges per Observation, each potentially scoped to a population (e.g., male adults, pediatric).
**How to avoid:** Use the first `referenceRange` entry as the default. If the array is empty, fall back to settings.yaml config. Do not attempt to match on `referenceRange.appliesTo` or `.age` -- that level of sophistication is out of scope for v1.
**Warning signs:** Observations with multiple reference ranges being checked against the wrong one.

### Pitfall 7: Max Cardinality on Arrays vs Scalars
**What goes wrong:** Checking `max=1` by testing if a JSON property is an array produces false positives when the FHIR spec allows both scalar and array forms.
**Why it happens:** FHIR resources in JSON represent `max=1` elements as scalars and `max>1` elements as arrays. But when a resource incorrectly provides an array where `max=1` is declared, the check should flag it.
**How to avoid:** Check `Array.isArray(value) && value.length > 1` for `max=1` elements. A single-element array `[value]` is technically non-conformant but may be an artifact of some serializers, so flag as warning not error.
**Warning signs:** Resources from Blaze may serialize single values in arrays depending on the resource type.

## Code Examples

### ValueSet $expand via MedplumClient
```typescript
// Source: FHIR R4 spec for ValueSet/$expand operation
const terminologyClient = createTerminologyClient(settings);
if (terminologyClient) {
  const result = await terminologyClient.get(
    `ValueSet/$expand?url=${encodeURIComponent(valueSetUrl)}&count=10000`
  );
  // result.expansion.contains[].{system, code, display}
}
```
[VERIFIED: FHIR R4 ValueSet/$expand returns expansion.contains array -- standard FHIR operation]

### Extracting Value Set Bindings from Profile
```typescript
// Source: derived from FHIR R4 StructureDefinition element definition
const elements = profile.snapshot?.element ?? [];
const bindings = elements
  .filter(el => el.binding?.valueSet && el.binding.strength !== 'example')
  .map(el => ({
    path: el.path,
    valueSetUrl: el.binding!.valueSet!,
    strength: el.binding!.strength,
  }));
```
[VERIFIED: FHIR R4 ElementDefinition.binding has strength + valueSet fields]

### Lab Range Check Logic
```typescript
// Source: standard clinical range comparison
function checkLabRange(
  observation: Observation,
  configRanges: Record<string, { low?: number; high?: number; unit?: string }>,
): NormalizedIssue[] {
  const issues: NormalizedIssue[] = [];
  const value = observation.valueQuantity?.value;
  if (value === undefined) return issues;

  // D-10: config overrides take precedence
  const loincCode = observation.code?.coding?.find(
    c => c.system === 'http://loinc.org'
  )?.code;
  
  let low: number | undefined;
  let high: number | undefined;
  
  if (loincCode && configRanges[loincCode]) {
    low = configRanges[loincCode].low;
    high = configRanges[loincCode].high;
  } else if (observation.referenceRange?.[0]) {
    low = observation.referenceRange[0].low?.value;
    high = observation.referenceRange[0].high?.value;
  }

  if (low !== undefined && value < low) {
    issues.push({
      resourceId: `Observation/${observation.id}`,
      resourceType: 'Observation',
      field: 'valueQuantity.value',
      description: `Value ${value} is below reference range low (${low})`,
      severity: 'warning',
    });
  }
  if (high !== undefined && value > high) {
    issues.push({
      resourceId: `Observation/${observation.id}`,
      resourceType: 'Observation',
      field: 'valueQuantity.value',
      description: `Value ${value} is above reference range high (${high})`,
      severity: 'warning',
    });
  }
  return issues;
}
```
[ASSUMED: exact implementation shape -- will be refined]

### Temporal Plausibility Check
```typescript
// Source: derived from FHIR R4 date/dateTime/Period spec
const now = Date.now();
const HOUR_MS = 3_600_000;

function isFutureDate(dateStr: string): boolean {
  const parsed = new Date(dateStr).getTime();
  return !isNaN(parsed) && parsed > now + HOUR_MS; // 1h tolerance
}

function isPeriodInverted(period: { start?: string; end?: string }): boolean {
  if (!period.start || !period.end) return false;
  return new Date(period.end).getTime() < new Date(period.start).getTime();
}

function isImplausibleAge(birthDate: string, maxAge: number): boolean {
  const birth = new Date(birthDate).getTime();
  if (isNaN(birth)) return false;
  const ageYears = (now - birth) / (365.25 * 24 * 60 * 60 * 1000);
  return ageYears < 0 || ageYears > maxAge;
}
```
[VERIFIED: FHIR R4 dateTime is ISO 8601 subset; Period has start/end dateTime fields]

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| structuralValidator.ts (min cardinality only) | profileConformanceChecker.ts (min+max+type+valueset) | Phase 16 | Unified conformance checking replaces single-purpose validator |
| 4-tab quality dashboard | 6-tab quality dashboard | Phase 16 | Adds Plausibility and Lab Ranges tabs |
| Trimmed profile JSONs (path, min, mustSupport) | Enriched profile JSONs (+ max, type, binding) | Phase 16 | Profiles carry enough metadata for comprehensive conformance |

## Assumptions Log

| # | Claim | Section | Risk if Wrong |
|---|-------|---------|---------------|
| A1 | Generic runtime walker is sufficient as fallback for resources without bundled profiles (temporal checks) | Architecture Pattern 5 | Temporal checks would miss fields on non-MII resource types; LOW risk since the 7 bundled types cover the primary use cases |
| A2 | First `referenceRange` entry is the appropriate default for lab checks | Pitfall 6 | Could flag incorrect ranges for age/sex-specific populations; LOW risk for v1 |
| A3 | `$expand` with `count=10000` is sufficient for all MII-relevant value sets | Pitfall 3 | ICD-10-GM has ~16K codes; may need pagination; MEDIUM risk |
| A4 | Blaze does not serialize max=1 elements as arrays | Pitfall 7 | Would produce false positive cardinality errors; LOW risk -- Blaze follows FHIR JSON spec |
| A5 | Example LOINC codes and reference ranges in settings.yaml schema are illustrative only | Architecture Pattern 6 | User must configure their own ranges; no risk |

## Open Questions (RESOLVED)

1. **Full MII StructureDefinition access for enrichment**
   - What we know: Current profile JSONs are trimmed to `{path, min, mustSupport}`. We need `{max, type, binding}`.
   - What's unclear: Whether the enrichment should be done manually from Simplifier downloads or via a script.
   - RESOLVED: Manual enrichment of the 7 existing profile JSONs during implementation. Document the source StructureDefinition URLs. The update instructions in `profiles/index.ts` already describe the trimming process -- extend those instructions.

2. **Cohort selection scope and complexity**
   - What we know: Two folded todos require cohort selection UI and FHIRPath-based cohort definition.
   - What's unclear: How deep the FHIRPath integration should go -- full FHIRPath engine vs simple filter expressions.
   - RESOLVED: Start with a simple resource-type + search parameter filter (e.g., "Condition where onset >= 2020"). FHIRPath is a complex spec; a full engine (like `fhirpath.js`) is likely overkill for v1. The cohort selector should filter the `sampleResources()` call with additional search parameters.

3. **Value set binding strength behavior**
   - What we know: FHIR defines 4 binding strengths: required, extensible, preferred, example.
   - What's unclear: Whether to flag `extensible` bindings as errors or warnings.
   - RESOLVED: `required` = error, `extensible` = warning, `preferred` = info, `example` = skip. This follows the FHIR conformance spec.

## Validation Architecture

### Test Framework
| Property | Value |
|----------|-------|
| Framework | Vitest (via Vite 8) |
| Config file | `vitest.config.ts` |
| Quick run command | `npx vitest run --reporter=verbose` |
| Full suite command | `npx vitest run` |

### Phase Requirements to Test Map
| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| DQ-03 | Value set conformance checking flags non-conforming coded values | unit | `npx vitest run src/quality/profileConformanceChecker.test.ts -t "value-set"` | Wave 0 |
| DQ-04 | Cardinality + type checking flags violations | unit | `npx vitest run src/quality/profileConformanceChecker.test.ts -t "cardinality"` | Wave 0 |
| DQ-05 | Temporal plausibility flags future dates, inverted periods, implausible age | unit | `npx vitest run src/quality/temporalPlausibilityWalker.test.ts` | Wave 0 |
| DQ-06 | Lab range checker flags out-of-range values | unit | `npx vitest run src/quality/labRangeChecker.test.ts` | Wave 0 |

### Sampling Rate
- **Per task commit:** `npx vitest run --reporter=verbose`
- **Per wave merge:** `npx vitest run`
- **Phase gate:** Full suite green before `/gsd-verify-work`

### Wave 0 Gaps
- [ ] `src/quality/profileConformanceChecker.test.ts` -- covers DQ-03, DQ-04
- [ ] `src/quality/temporalPlausibilityWalker.test.ts` -- covers DQ-05
- [ ] `src/quality/labRangeChecker.test.ts` -- covers DQ-06
- [ ] `src/quality/valueSetCache.test.ts` -- covers $expand caching logic

## Security Domain

### Applicable ASVS Categories

| ASVS Category | Applies | Standard Control |
|---------------|---------|-----------------|
| V2 Authentication | no | N/A -- local-only app |
| V3 Session Management | no | N/A |
| V4 Access Control | no | N/A |
| V5 Input Validation | yes | Validate settings.yaml values (numeric ranges, LOINC code format) before use |
| V6 Cryptography | no | N/A |

### Known Threat Patterns

| Pattern | STRIDE | Standard Mitigation |
|---------|--------|---------------------|
| Malicious settings.yaml with extreme reference ranges | Tampering | Validate numeric ranges are finite and non-negative |
| Terminology server returns unexpected $expand payload | Spoofing | Validate expansion.contains structure before caching; fall back gracefully |
| Large value set expansion exhausts browser memory | Denial of Service | Cap cached expansion size; limit `count` parameter |

## Sources

### Primary (HIGH confidence)
- Existing codebase: `src/quality/structuralValidator.ts`, `completenessWalker.ts`, `codingCoverageWalker.ts`, `types.ts`, `profiles/index.ts`, `validationBackends.ts` -- verified patterns and interfaces
- Existing codebase: `src/components/quality/ValidationPanel.tsx`, `QualityOverviewPage.tsx`, `ResourceIssueTable.tsx` -- verified UI patterns
- Existing codebase: `src/config/types.ts`, `src/config/settings.ts` -- verified settings schema
- Existing codebase: `src/terminology/terminologyClient.ts`, `TerminologyResolver.ts` -- verified terminology server interaction pattern
- FHIR R4 spec: StructureDefinition.snapshot.element, ValueSet/$expand, dateTime/Period types [CITED: https://hl7.org/fhir/R4/]

### Secondary (MEDIUM confidence)
- MII Kerndatensatz StructureDefinitions on Simplifier [CITED: https://simplifier.net/medizininformatikinitiative-kerndatensatz]

### Tertiary (LOW confidence)
- None

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH -- no new libraries, extending existing patterns
- Architecture: HIGH -- follows proven walker/checker patterns from Phases 5 and 15
- Pitfalls: HIGH -- most pitfalls are FHIR spec edge cases well-documented in HL7 spec

**Research date:** 2026-04-14
**Valid until:** 2026-05-14 (stable -- FHIR R4 and MII profiles are frozen)
