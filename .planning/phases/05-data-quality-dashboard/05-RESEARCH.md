# Phase 5: Data Quality Dashboard - Research

**Researched:** 2026-04-12
**Domain:** FHIR data quality auditing (resource counts, field completeness, coding coverage, profile conformance) on Blaze + MII Kerndatensatz
**Confidence:** HIGH for counts / coding-coverage / completeness heuristic; MEDIUM for chart-library choice; **LOW → designed-around** for $validate (Blaze does not support it — see finding F-01)

## Summary

Phase 5 builds a Quality route that audits a connected Blaze FHIR server on four axes: resource counts per type, field completeness, coding-coverage (system+code vs text-only vs empty), and profile conformance against MII Kerndatensatz StructureDefinitions. Three of the four metrics are cheap to compute in-browser on top of infrastructure already built in Phases 1-4. The fourth — profile validation — is fundamentally constrained by the target server.

**The headline finding (F-01):** Blaze does NOT support the FHIR `$validate` operation on resources (only `CodeSystem/$validate-code` and `ValueSet/$validate-code`). [VERIFIED: https://samply.github.io/blaze/conformance.html — "System operations: `$compact` and `$cql`. CodeSystem: `$validate-code`. ValueSet: `$expand`, `$validate-code`. Measure: `$evaluate-measure`. Patient: `$everything`, `$purge`." — no resource-level `$validate`]. This means QUAL-04 cannot be satisfied by issuing `POST /{type}/$validate` against the configured Blaze instance and parsing the returned OperationOutcome. Three viable paths remain:

1. **External validator (recommended):** Optional `settings.yaml` field `validation.validatorUrl` pointing to any FHIR server that DOES support `$validate` (HL7 public test validator, Firely validator, HAPI). Batch the resources read from Blaze through the external validator. Graceful `not-configured` state when unset.
2. **Client-side structural validation:** Walk the StructureDefinition's `snapshot.element` list and check each `mustSupport=true` / `min>=1` element for presence on the target resource. Catches the "required field missing" subset of conformance issues without an external validator. Can coexist with path 1.
3. **Honest descope:** Ship QUAL-01/02/03 in Phase 5, defer full `$validate` to v2 (QUAL-06 PDF report) or a new phase once a validator is wired up.

**Primary recommendation:** **Path 1 + Path 2 in combination.** Client-side structural validation ships immediately (no external dependency) and covers the most common gaps (missing required elements). `settings.yaml` gains an optional `validation.validatorUrl` so a power user can plug in a full validator without touching code. Blaze remains the data source; validation goes elsewhere. This keeps the phase scope-complete for QUAL-04 while being honest that deep FHIR conformance requires server support we don't have.

**Everything else (QUAL-01/02/03)** is straightforward: reuse `useResourceCounts` from Phase 2, extend `collectCodings` from Phase 4 for coverage, and add a small `collectFields` walker for completeness. Sampling (first N per type) is the locked D-06 strategy for scale; `_summary=count` is the locked approach for totals (already proven in `useResourceCounts`).

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions

**Dashboard Layout**
- **D-01:** Dashboard accessible from sidebar "Quality" nav item. Landing view shows summary cards/tiles with key metrics at a glance — total resources, resource type count, overall completeness, overall coding coverage.
- **D-02:** Below summary cards, detailed sections for each metric type, navigable via tabs or scroll.

**Resource Counts**
- **D-03:** Table of all resource types with counts, reusing data from Phase 1's CapabilityStatement display. Sortable by count and name.
- **D-04:** Bar chart or visual indicator alongside counts for quick visual comparison of resource distribution.

**Field Completeness**
- **D-05:** Per resource type, show percentage of populated fields. Select a resource type to see a breakdown of which fields are populated vs empty.
- **D-06:** Completeness calculated by sampling resources (e.g., first 100) rather than scanning all resources — configurable sample size. Show "based on N resources" disclaimer.

**Coding Coverage**
- **D-07:** For each resource type that has CodeableConcept fields, show the percentage with proper system+code vs text-only vs empty.
- **D-08:** Drill-down capability — click a resource type's coding metric to see which specific CodeableConcept fields have gaps.

**Profile Validation**
- **D-09:** Validate individual resources or batches against MII Kerndatensatz StructureDefinition profiles using FHIR $validate operation (if supported by Blaze).
- **D-10:** Validation results shown as a list of issues per resource — severity (error/warning/information), location (field path), and description.
- **D-11:** Batch validation with configurable batch size. Show progress indicator during validation.

> **Planner note on D-09:** research finding F-01 shows Blaze does NOT support $validate. The parenthetical "if supported by Blaze" must drive the design — the feature has to work when Blaze does not support it, which is the actual case. See the Validation Architecture section for the recommended fallback path.

### Claude's Discretion
- Chart library choice for visualizations (or Mantine-only approach)
- Caching strategy for computed metrics
- Export format for quality reports (if any in v1)

### Deferred Ideas (OUT OF SCOPE)
None — discussion stayed within phase scope.
</user_constraints>

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|------------------|
| QUAL-01 | User can view a dashboard showing resource counts per type across the server | Reuse `src/hooks/useResourceCounts.ts` (already uses `_summary=count`). Aggregate into dashboard summary card + per-type chart. [VERIFIED: src/hooks/useResourceCounts.ts exists and works against Blaze in Phase 1/2] |
| QUAL-02 | User can view field completeness statistics (percentage of populated fields) per resource type | Sample N resources per type via `client.searchResources(type, { _count: N })`; walk each with new `collectFields` utility; compute populated/total ratio. Performance: sampling keeps bounded per D-06. |
| QUAL-03 | User can view coding coverage metrics (percentage of CodeableConcepts with system+code vs text-only) | Extend `src/terminology/walker.ts` `collectCodings` to also yield text-only CodeableConcepts. Walk sampled resources, classify each coded field into three buckets. |
| QUAL-04 | User can validate individual resources or batches against MII Kerndatensatz StructureDefinition profiles and see conformance issues | Blaze does NOT support `$validate` (F-01). Two-layer solution: (a) client-side `mustSupport`/`min` element walker using pre-bundled MII StructureDefinitions; (b) optional external `$validate` endpoint via `settings.yaml` `validation.validatorUrl`. Both return unified `OperationOutcome`-shaped issues. |
</phase_requirements>

## Project Constraints (from CLAUDE.md)

Locked stack — research does not propose alternatives:

- **Stack:** React 18 + Vite + TypeScript + Mantine 8 — locked. Chart library must be compatible with Mantine 8 peer chain.
- **FHIR client:** `@medplum/core` `MedplumClient` only. Use `client.search()`, `client.searchResources()`, `client.get()`, `client.post()` — no direct `fetch` to the FHIR server.
- **FHIR types:** `@medplum/fhirtypes` exclusively. Never import `@types/fhir` or hand-written FHIR interfaces.
- **UI components:** `@medplum/react` where a component exists (ResourceTable, CodeableConceptDisplay, etc.). Otherwise Mantine. Never custom-roll what either provides.
- **Forbidden:** Tailwind, `@tanstack/react-query`, Mantine 9, SMART-on-FHIR libraries, GraphQL FHIR, Next.js/Remix, SSR.
- **FHIR version:** R4 only. MII profiles are R4.
- **Read-only:** No create/update/delete operations anywhere. Validation must NOT POST resources back to Blaze.
- **License:** MIT; keep `package.json` `license` and `LICENSE` file in sync — adding a new optional dep (`@mantine/charts` + `recharts`) does not change this, both are MIT.
- **GSD enforcement:** Phase work MUST run through `/gsd-execute-phase` — no direct edits.

## Standard Stack

### Core (reused from prior phases — no new installs needed)

| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| @medplum/core | 5.1.7 | `MedplumClient.search()` with `_summary=count` + `searchResources()` for sampling | Already in use; `_summary=count` confirmed working on Blaze in Phase 2 `useResourceCounts` [VERIFIED: src/hooks/useResourceCounts.ts line 75] |
| @medplum/fhirtypes | 5.1.7 | `CapabilityStatement`, `StructureDefinition`, `ElementDefinition`, `OperationOutcome`, `OperationOutcomeIssue`, `Resource`, `Bundle`, `CodeableConcept` | All needed types already in the installed package |
| @medplum/react | 5.1.7 | `ResourceTable` (for drill-down rows), `CodeableConceptDisplay` (for coverage drill-down lists) | Already mounted via `MedplumProvider` in connected subtree |
| @mantine/core | 8.3.18 | `Card`, `Stack`, `Group`, `Grid`, `Progress`, `RingProgress`, `Tabs`, `Table`, `Badge`, `Alert`, `Loader`, `Select`, `NumberInput` (for sample size), `Tooltip` | Dashboard is card-heavy; RingProgress for percentage rings; Progress for inline bars |
| @mantine/hooks | 8.3.18 | `useLocalStorage` (metrics cache), `useDebouncedValue` (sample size input) | Already installed |
| @tabler/icons-react | 3.41.1 | `IconChartBar`, `IconCheck`, `IconAlertTriangle`, `IconAlertCircle`, `IconCircleCheck`, `IconInfoCircle` | Already used across sidebar/dashboard |
| react-router-dom | 7.14.0 | `/quality` route (already stub-wired in `App.tsx:66`), nested routes `/quality/completeness/:type`, `/quality/coding/:type`, `/quality/validation/:type` for drill-down | Already mounted |

### New (must install)

| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| @mantine/charts | 8.3.18 | `BarChart` for per-type resource count comparison (D-04); optionally `DonutChart` for coding-coverage split; `Sparkline` for per-type completeness indicators | Official Mantine package; pinned peer `@mantine/core: 8.3.18` exactly matches installed version. All other @mantine/* packages already align. [VERIFIED: `npm view @mantine/charts@8.3.18 peerDependencies` on 2026-04-12 → `{@mantine/core: '8.3.18', @mantine/hooks: '8.3.18', recharts: '>=2.13.3'}`] |
| recharts | ^2.15.4 | Peer dep of `@mantine/charts`. Use 2.x (not 3.x) for maximum compatibility — Mantine docs and internal components are written against 2.x. | [VERIFIED: `@mantine/charts@8.3.18` peer `recharts: '>=2.13.3'` accepts both. Current 2.x latest: `2.15.4`, current 3.x latest: `3.8.1`.] [CITED: github.com/mantinedev/mantine/issues/8001 — "upgrade recharts from 2.x to 3.x" still open, meaning Mantine's components were authored against 2.x API] Choose 2.x to avoid surprise breakage; recharts 3.0 removed `activeIndex`, changed `Customized`, and flipped `accessibilityLayer` default. [CITED: github.com/recharts/recharts/wiki/3.0-migration-guide] |

**Do NOT install:**
- `@mantine/charts@9.x` — peers on `@mantine/core: 9.x`, incompatible with installed Mantine 8 [VERIFIED: npm registry query 2026-04-12]
- `recharts@3.x` — breaking changes vs. Mantine's chart components, which target 2.x API
- `fhir-validator-js`, `fhir-validator-wrapper` — wrap the Java HL7 validator, require JVM runtime, incompatible with a browser SPA
- `fhir` (npm) — old client library, overlaps with `@medplum/core`

### Assets bundled at build time (not runtime-fetched)

| Asset | Source | Format | Why |
|-------|--------|--------|-----|
| MII Kerndatensatz StructureDefinitions | Simplifier `de.medizininformatikinitiative.kerndatensatz.*` packages, 2025 | JSON files in `src/quality/profiles/*.json` | Profiles are stable per module version; bundling avoids an extra network fetch at runtime and works offline. Limit to the 6 MII modules already in `src/utils/mii-modules.ts` + Patient: Condition, Procedure, Observation, MedicationStatement, Encounter, Consent, Patient. ~50-150 KB uncompressed total. [CITED: simplifier.net/packages/de.medizininformatikinitiative.kerndatensatz.person/2025.0.1] |

### Alternatives Considered

| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| `@mantine/charts` + `recharts` | `visx`, `victory`, `chart.js`, `d3` directly | All three would force us to re-implement Mantine-theme integration (colors, dark mode, font). `@mantine/charts` is the path of least surprise. |
| `@mantine/charts` + `recharts` | Mantine-only (`Progress`, `RingProgress`, custom CSS bar) | Viable for the summary strip; acceptable MVP if user wants to avoid the dep. `RingProgress` handles percentages beautifully, `Progress` handles bars. **Fallback recommendation:** if the planner judges `recharts` too heavy (~150 KB gz), ship Mantine-only visuals — the D-04 "bar chart or visual indicator" spec permits either. |
| Client-side profile walker | `fhir.js` npm | `fhir.js` is unmaintained, overlaps with `@medplum/core` type system, adds XML parsing we don't need |
| Bundled StructureDefinitions | Runtime fetch from `https://simplifier.net/...` | Network dependency, CORS risk, version drift. Bundling freezes the contract per app version. |

**Installation:**
```bash
npm install @mantine/charts@8.3.18 recharts@^2.15.4
```

**Version verification** (run on 2026-04-12):
```bash
$ npm view @mantine/charts@8.3.18 version
8.3.18
$ npm view @mantine/charts@8.3.18 peerDependencies
{ react: '^18.x || ^19.x', recharts: '>=2.13.3',
  'react-dom': '^18.x || ^19.x',
  '@mantine/core': '8.3.18', '@mantine/hooks': '8.3.18' }
$ npm view recharts@2 version
2.15.4    # most recent 2.x, published 2025
$ npm view recharts@3 version
3.8.1     # most recent 3.x — DO NOT use; Mantine components target 2.x
```

## Architecture Patterns

### Recommended Project Structure

```
src/
├── quality/                          # NEW: data-quality domain module
│   ├── types.ts                      # QualityMetric, CompletenessReport, CodingCoverageReport, ValidationIssue
│   ├── counts.ts                     # summarizeCounts(counts) → { total, typeCount, topN }
│   ├── completenessWalker.ts         # collectPopulatedFields(resource) + computeCompleteness(sample, profile?)
│   ├── codingCoverageWalker.ts       # classifyCoded(resource) → { systemCode, textOnly, empty } per path
│   ├── sampling.ts                   # sampleResources(client, type, n) — respects D-06 sample size
│   ├── profiles/                     # Bundled MII StructureDefinitions (JSON)
│   │   ├── index.ts                  # typed registry: getProfileForType(resourceType) → StructureDefinition | null
│   │   ├── Condition-diagnose.json
│   │   ├── Procedure-prozedur.json
│   │   ├── Observation-laborbefund.json
│   │   ├── Patient-person.json
│   │   ├── Encounter-fall.json
│   │   ├── MedicationStatement-medikation.json
│   │   └── Consent-consent.json
│   ├── structuralValidator.ts        # validateStructural(resource, profile) → OperationOutcomeIssue[]
│   └── remoteValidator.ts            # validateRemote(client, url, resource, profileCanonical) → OperationOutcomeIssue[]
├── hooks/
│   ├── useQualityMetrics.ts          # orchestrates counts + sampling + computes reports; stale-while-revalidate via useLocalStorage
│   ├── useCompletenessReport.ts
│   ├── useCodingCoverage.ts
│   └── useValidationReport.ts        # per-type drill-down
├── components/
│   └── quality/                      # NEW
│       ├── QualityLayout.tsx         # outlet for /quality/*
│       ├── QualityOverviewPage.tsx   # summary strip + BarChart of counts (D-01, D-02, D-04)
│       ├── ResourceCountsPanel.tsx   # sortable table (D-03) + BarChart
│       ├── CompletenessPanel.tsx     # per-type % grid (D-05)
│       ├── CompletenessDrillDown.tsx # field-level breakdown (D-05)
│       ├── CodingCoveragePanel.tsx   # per-type 3-bucket breakdown (D-07)
│       ├── CodingDrillDown.tsx       # field-level gaps (D-08)
│       ├── ValidationPanel.tsx       # batch runner + progress (D-11)
│       ├── ValidationIssueList.tsx   # per-resource issue list (D-10)
│       └── SampleSizeControl.tsx     # NumberInput tied to settings (D-06)
└── config/
    └── types.ts                      # ADD: validation: { validatorUrl?: string; batchSize?: number }
```

### Pattern 1: Sampling with MedplumClient (D-06)

**What:** Fetch first N resources of a type for in-browser walking. Sample size configurable; default 100.
**When to use:** Completeness, coding-coverage, validation — any metric that's too expensive for a full-table scan.

```typescript
// Source: existing MedplumClient API (verified in @medplum/core 5.1.7 installed typings)
import type { MedplumClient } from '@medplum/core';
import type { Resource, ResourceType } from '@medplum/fhirtypes';

export async function sampleResources(
  client: MedplumClient,
  resourceType: string,
  sampleSize: number,
): Promise<Resource[]> {
  // searchResources returns the unwrapped array, not the Bundle.
  // _count caps the page; single page is sufficient for sampling.
  const results = await client.searchResources(
    resourceType as ResourceType,
    { _count: String(sampleSize) },
  );
  return results;
}
```

### Pattern 2: Extend collectCodings for Coverage (D-07)

**What:** The existing walker finds Codings only. For coverage, we also need text-only CodeableConcepts and empty fields. Add a sibling walker.

```typescript
// Source: pattern adapted from src/terminology/walker.ts (collectCodings)
import type { CodeableConcept } from '@medplum/fhirtypes';

export type CodedClassification = 'systemCode' | 'textOnly' | 'empty';

export interface ClassifiedCodedField {
  path: string;                      // e.g., "Condition.code"
  classification: CodedClassification;
  value?: CodeableConcept;
}

export function classifyCodedFields(
  resource: unknown,
  path = '',
  out: ClassifiedCodedField[] = [],
): ClassifiedCodedField[] {
  if (!resource || typeof resource !== 'object') return out;
  if (Array.isArray(resource)) {
    resource.forEach((v, i) => classifyCodedFields(v, `${path}[${i}]`, out));
    return out;
  }
  const cc = resource as CodeableConcept;
  // Detect CodeableConcept-shape: has `coding` array OR `text` string and no non-CC-keys.
  const looksLikeCC =
    (Array.isArray(cc.coding) || typeof cc.text === 'string') &&
    Object.keys(cc).every(k => k === 'coding' || k === 'text' || k === 'extension' || k === 'id');

  if (looksLikeCC && path) {
    const hasSystemCode = cc.coding?.some(
      c => typeof c.system === 'string' && typeof c.code === 'string',
    );
    if (hasSystemCode) out.push({ path, classification: 'systemCode', value: cc });
    else if (cc.text) out.push({ path, classification: 'textOnly', value: cc });
    else out.push({ path, classification: 'empty', value: cc });
  }
  for (const [k, v] of Object.entries(resource as Record<string, unknown>)) {
    if (k === 'coding' || k === 'text') continue; // already classified above
    classifyCodedFields(v, path ? `${path}.${k}` : k, out);
  }
  return out;
}
```

Note the CC detection heuristic is intentionally conservative — FHIR has several look-alike shapes (Coding vs CodeableConcept vs Quantity). The test suite MUST cover: nested CCs, CCs with only text, CCs with only coding[], Codings that aren't inside a CC (ignored here), and Identifier (which has system+code-like fields but is NOT a CC — excluded by the `every` keys filter).

### Pattern 3: StructureDefinition-Based Completeness (D-05)

**What:** "% populated fields" needs a denominator. Candidates:

| Denominator | Trade-off |
|-------------|-----------|
| All R4 element paths | Noisy — most FHIR elements are optional and rarely populated |
| `mustSupport = true` elements from bundled MII profile | **Recommended.** Matches the audit intent: "is this dataset usable for its declared purpose?" |
| `min >= 1` elements (cardinality-required) | Subset of mustSupport; a good fallback when no MII profile applies |
| User-selected path list | v2 scope |

Recommendation: **`mustSupport=true` for typed-in-MII resources, `min>=1` for untyped ones.** Displayed denominator is always "based on N resources, M fields" so the user can see what was counted.

```typescript
// Source: FHIR R4 StructureDefinition snapshot element structure
// [CITED: https://hl7.org/fhir/R4/structuredefinition.html#snapshot]
import type { StructureDefinition, ElementDefinition, Resource } from '@medplum/fhirtypes';

export function requiredElementPaths(sd: StructureDefinition): string[] {
  const elements = sd.snapshot?.element ?? sd.differential?.element ?? [];
  return elements
    .filter(el => el.mustSupport === true || (el.min ?? 0) >= 1)
    .map(el => el.path!)
    .filter(Boolean);
}

export function computeCompleteness(
  sample: Resource[],
  requiredPaths: string[],
): { populated: number; total: number; perPath: Record<string, number> } {
  if (sample.length === 0 || requiredPaths.length === 0) {
    return { populated: 0, total: 0, perPath: {} };
  }
  const perPath: Record<string, number> = {};
  for (const path of requiredPaths) perPath[path] = 0;
  for (const r of sample) {
    for (const path of requiredPaths) {
      if (isPathPopulated(r, path)) perPath[path]++;
    }
  }
  const total = sample.length * requiredPaths.length;
  const populated = Object.values(perPath).reduce((a, b) => a + b, 0);
  return { populated, total, perPath };
}

// Simple dotted-path resolver — sufficient for FHIR element paths WITHOUT choice suffixes.
// Choice types (`value[x]`) need special handling; see Pitfall 3.
function isPathPopulated(resource: unknown, path: string): boolean {
  const segments = path.split('.').slice(1); // drop ResourceType prefix
  let node: unknown = resource;
  for (const seg of segments) {
    if (node == null || typeof node !== 'object') return false;
    node = (node as Record<string, unknown>)[seg];
    if (Array.isArray(node)) node = node[0]; // simplified — see Pitfall 3
  }
  return node != null && node !== '' && !(Array.isArray(node) && node.length === 0);
}
```

### Pattern 4: Dual-Source Validation (D-09/10/11)

**What:** Unified validation pipeline that emits `OperationOutcomeIssue[]` regardless of where validation actually happened.

```typescript
// Source: FHIR R4 OperationOutcome spec
// [CITED: https://hl7.org/fhir/R4/operationoutcome.html]
import type { OperationOutcome, OperationOutcomeIssue, Resource } from '@medplum/fhirtypes';

export interface ValidationBackend {
  kind: 'structural' | 'remote';
  validate(resource: Resource): Promise<OperationOutcomeIssue[]>;
}

// Backend A — offline, always available.
export function createStructuralBackend(profiles: Map<string, StructureDefinition>): ValidationBackend {
  return {
    kind: 'structural',
    async validate(resource) {
      const profile = profiles.get(resource.resourceType);
      if (!profile) return [];
      return validateStructural(resource, profile); // see Pattern 3 required paths
    },
  };
}

// Backend B — requires validation.validatorUrl in settings.yaml
export function createRemoteBackend(validatorClient: MedplumClient, profileCanonical: string): ValidationBackend {
  return {
    kind: 'remote',
    async validate(resource) {
      const outcome = await validatorClient.post<OperationOutcome>(
        `${resource.resourceType}/$validate?profile=${encodeURIComponent(profileCanonical)}`,
        resource,
      );
      return outcome.issue ?? [];
    },
  };
}
```

Run backends in parallel; merge issues; de-duplicate by (severity, code, expression). If the user hasn't configured `validatorUrl`, only the structural backend runs — the UI surfaces a small info banner "Full profile validation requires an external validator — see settings."

### Pattern 5: Stale-while-revalidate caching (Claude's discretion)

**What:** Sample-based metrics are expensive enough to want persistence, cheap enough to recompute on demand. Mirror the Phase 4 TerminologyCache pattern: in-memory + localStorage, server-URL-namespaced key.

```typescript
// Source: pattern from src/terminology/TerminologyCache.ts
const KEY = `quality-metrics:v1:${serverUrl}:${resourceType}:${sampleSize}`;
// stored value: { metrics, computedAt }
// display "Last computed 12min ago · Recompute" button
```

Invalidation triggers: manual "Recompute" button, settings change (serverUrl), sample size change. No TTL — cached metrics remain valid until user explicitly recomputes (dashboards are snapshots by design).

### Recommended Project Structure patterns to reuse

- **Nested routing under a layout:** `ExplorerLayout`/`PatientsLayout` are the template. `QualityLayout` should similarly read `useOutletContext()` for the `{ client, capability }` pair and render `<Outlet />`.
- **Connection gating:** `ExplorerLayout.tsx` gates on connection status before rendering children. `QualityLayout` MUST do the same — no point in running metrics against a disconnected server.
- **Progressive rendering:** `useResourceCounts` initializes every type to `'loading'`, resolves them individually, and renders per-row UI. Use the same pattern for per-type completeness / coverage — users see the dashboard populate progressively rather than blocking on the slowest resource type.
- **Concurrency limiter:** `useResourceCounts` caps concurrent count requests at 4. Apply the same cap to sampling for completeness/coverage — sampling 60 resource types at full parallel would hammer Blaze.

### Anti-Patterns to Avoid

- **DO NOT POST a resource to Blaze for `$validate`.** It either 404s (most likely), hangs, or — worst case — silently discards the body. Our design constraint is read-only; validation lives elsewhere.
- **DO NOT use `Bundle.total` without `_summary=count`.** `client.search(type)` without `_summary=count` fetches a full first page of resources (wasteful) and `total` may be absent on some servers. Always `_summary=count`.
- **DO NOT walk a full resource table for completeness.** For a server with 50K+ Observations, walking every one will OOM the browser tab and lock up the UI. Sampling is non-negotiable at project scale.
- **DO NOT hardcode MII profile canonicals in multiple places.** The `src/quality/profiles/index.ts` registry is the single source of truth, mapping `resourceType → StructureDefinition`. Plan 2's `mii-modules.ts` maps `moduleKey → resourceType`; don't duplicate profile URLs there.
- **DO NOT build custom CSS bar charts when `@mantine/charts` BarChart exists.** The Mantine bar chart already handles theme colors, responsive sizing, and tooltips.
- **DO NOT use `client.get('metadata')` for resource type discovery — reuse `connection.state.capability`.** The `ConnectionContext` already caches this; re-fetching adds latency and inconsistency risk.

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| FHIR resource count totals | A counter loop over paginated pages | `client.search(type, '_summary=count').total` | Already working in `useResourceCounts`; Blaze implements `_summary=count` natively. [VERIFIED: src/hooks/useResourceCounts.ts:75 working against Blaze] |
| Bar chart with Mantine theming | Custom SVG + color logic | `@mantine/charts` `<BarChart>` | Theme-aware, responsive, tooltips, legend — all free |
| Percentage ring | Custom SVG circle | `@mantine/core` `<RingProgress>` | Mantine primitive; composable with Stack/Group |
| Coding walker | Recursion from scratch | Extend `src/terminology/walker.ts` `collectCodings` with a sibling `classifyCodedFields` | Phase 4 walker already handles FHIR edge cases (nested Codings, Identifier look-alikes) |
| JSON loading of StructureDefinitions | Runtime fetch + CORS + parsing | Bundle as `.json` files; `import profile from './profiles/Condition-diagnose.json'` | Vite handles JSON imports natively; build-time asset; offline-capable |
| OperationOutcome issue list UI | Custom table | Mantine `<Table>` with severity-colored `<Badge>` | Every field (severity, code, expression, diagnostics) maps to a column |
| LRU/localStorage cache | New class | Mirror `TerminologyCache` exactly with a different key prefix | Already-proven pattern in `src/terminology/TerminologyCache.ts` |
| Concurrency limiter for sampling | New worker pool | Adapt `useResourceCounts`' 4-concurrent pattern | Same pattern, same bounds, proven |
| Full FHIR conformance validator | JS port of HAPI validator | External `$validate` via `validation.validatorUrl` config + structural walker fallback | A real validator is ~30 MB of jars; out of scope for a local browser tool |

**Key insight:** Phase 5 is mostly plumbing — Phases 1-4 already shipped the low-level primitives (MedplumClient wrapper, connection state, coding walker, capability parser, count hook, cache pattern). The research surface is small because the pattern library is already rich.

## Runtime State Inventory

Phase 5 is additive (new route, new components, new cache namespace). No renames, no migrations.

| Category | Items Found | Action Required |
|----------|-------------|------------------|
| Stored data | None — verified by search: no existing localStorage keys named `quality-*` | New cache namespace `quality-metrics:v1:*` to be introduced |
| Live service config | None — Blaze stays read-only; terminology server stays read-only | N/A |
| OS-registered state | None — browser SPA | N/A |
| Secrets/env vars | None new. Optional `validation.validatorUrl` joins existing settings.yaml; no credential for the external validator is required in v1 (assume open endpoint) — add auth later if needed | Update `src/config/types.ts` and `DEFAULTS` with a new optional block |
| Build artifacts | Bundled StructureDefinition JSON files — new. Vite will inline them. | None — Vite handles |

## Common Pitfalls

### Pitfall 1: `$validate` not supported on Blaze
**What goes wrong:** Plan assumes `POST /Condition/$validate` works against Blaze; implementation 404s; the feature silently breaks.
**Why it happens:** The locked decision D-09 parenthetically says "if supported by Blaze." Blaze's operation list makes clear it is NOT supported on resources. [VERIFIED: https://samply.github.io/blaze/conformance.html 2026-04-12]
**How to avoid:** Design for "not supported by Blaze" as the default state. External `validatorUrl` + structural fallback per Pattern 4.
**Warning signs:** Test plan that posts to `{blaze}/Condition/$validate` expects 200; Blaze returns 404.

### Pitfall 2: `_summary=count` can be slow on large Blaze stores
**What goes wrong:** Dashboard loads hang for 60s on a server with 50+ resource types and millions of resources.
**Why it happens:** Blaze explicitly warns `_summary=count` may exceed HTTP timeouts and offers an async pattern via `Prefer: respond-async`. [CITED: https://samply.github.io/blaze/api.html "complex FHIR searches with `_summary=count` can take longer"]
**How to avoid:** (1) Keep the `useResourceCounts` 4-concurrent cap; (2) render partial results as they arrive; (3) if dashboard-wide queries ever hit the async pattern, surface "Server still computing count" per-row rather than blocking the whole page. Prefer `respond-async` header is a v2 optimization — v1 can let individual counts fail with "Error" badge (already handled in `useResourceCounts`).
**Warning signs:** 30-second timeouts from the dev proxy; Vite's `changeOrigin: true` passes headers through unchanged but has a default timeout.

### Pitfall 3: FHIR choice types (`value[x]`) in completeness walker
**What goes wrong:** An ElementDefinition for `Observation.value[x]` has path `Observation.value[x]`; no FHIR resource has a literal `value[x]` field — it's `valueQuantity`, `valueString`, `valueCodeableConcept`, etc.
**Why it happens:** StructureDefinition paths use the `[x]` placeholder, but resources contain the typed field.
**How to avoid:** In `isPathPopulated`, when the last segment ends in `[x]`, strip it and check any key on the parent whose name starts with the stripped prefix. Example:
```typescript
if (seg.endsWith('[x]')) {
  const prefix = seg.slice(0, -3);
  const parent = node as Record<string, unknown>;
  for (const k of Object.keys(parent)) {
    if (k.startsWith(prefix) && parent[k] != null) return true;
  }
  return false;
}
```
**Warning signs:** `Observation.value[x]` appears 0% populated even when every sample has `valueQuantity`.

### Pitfall 4: Slice-aware `mustSupport`
**What goes wrong:** MII profiles slice elements like `Condition.code.coding[icd10-gm]`, `[snomed]`. A naive path walker treats `Condition.code.coding` as one path and misses which slices are populated.
**Why it happens:** MII uses slicing heavily to require specific coding systems (ICD-10-GM, SNOMED, OPS, LOINC).
**How to avoid:** For v1, limit the completeness walker to NON-sliced paths. Document this as a known limitation in the UI ("Completeness counts base cardinality; slice-level coverage is surfaced in Coding Coverage"). Coding Coverage (QUAL-03) is the right home for slice-level gaps anyway.
**Warning signs:** Completeness shows 100% for `Condition.code` but the actual ICD-10-GM coding is missing.

### Pitfall 5: Coding-coverage false positives on Identifier / Coding
**What goes wrong:** `classifyCodedFields` misclassifies `Identifier` (which has `system` + `value`) or a bare `Coding` (which has `system` + `code`) as a CodeableConcept.
**Why it happens:** All three shapes share the key `system`.
**How to avoid:** The heuristic in Pattern 2 uses `Object.keys(obj).every(k => k === 'coding' || k === 'text' || k === 'extension' || k === 'id')` — Identifier has `value`/`use`/`type`/`assigner`, so it fails the `.every()` check. Cover this in unit tests explicitly.
**Warning signs:** Patient.identifier contributes to coding coverage; every Patient shows "text-only" coverage gap for identifiers.

### Pitfall 6: Vite dev proxy timeout on long dashboard loads
**What goes wrong:** First dashboard load against a large server sends 60 parallel `_summary=count` requests through the Vite proxy; some take >30s; proxy closes connections.
**Why it happens:** Vite's default `proxy` config has no explicit `timeout`; under load Blaze returns slow.
**How to avoid:** (1) Concurrency limiter (already in `useResourceCounts`); (2) if needed, add `proxyTimeout: 120000` to vite config; (3) for production builds, there is no proxy — the browser hits Blaze directly, which dodges this entirely. [VERIFIED: src/vite.config.ts shows proxy config without timeout]
**Warning signs:** Dev works, production works, but first dashboard load in dev sees sporadic "Error" badges that clear on refresh.

### Pitfall 7: Bundling MII profiles inflates build size
**What goes wrong:** Bundling 7 full StructureDefinitions with their snapshots adds 500 KB+ to the JS bundle.
**Why it happens:** MII profiles are comprehensive; `snapshot.element` is the bulk.
**How to avoid:** (1) Bundle only the fields we use — write a small build-time script that strips StructureDefinitions to `{ url, name, type, snapshot.element[mustSupport|min|path|sliceName] }`; (2) lazy-load the profile registry (`import('./profiles')` inside the validation panel) so the main bundle stays lean. Target: profile registry chunk <100 KB gz.
**Warning signs:** Vite build warns "chunk larger than 500 KB."

## Code Examples

### Example 1: Reusing `useResourceCounts` for the summary strip

```typescript
// Source: pattern from src/components/dashboard/DashboardPage.tsx:45
// Adapted for QualityOverviewPage
import { useOutletContext } from 'react-router-dom';
import { useMemo } from 'react';
import { parseResourceTypes } from '../../fhir/capability';
import { useResourceCounts } from '../../hooks/useResourceCounts';
import type { ConnectionState } from '../../fhir/types';

export function QualityOverviewPage() {
  const { state } = useOutletContext<{ state: ConnectionState }>();
  const client = state.status === 'connected' ? state.client : null;
  const capability = state.status === 'connected' ? state.capability : null;

  const types = useMemo(
    () => (capability ? parseResourceTypes(capability).map(t => t.type) : []),
    [capability],
  );
  const counts = useResourceCounts(client, types);

  const total = Object.values(counts)
    .filter((v): v is number => typeof v === 'number')
    .reduce((a, b) => a + b, 0);
  const typeCount = types.length;
  // ... render summary cards
}
```

### Example 2: Mantine BarChart wrapping recharts

```typescript
// Source: https://mantine.dev/charts/bar-chart/ [VERIFIED: docs fetched 2026-04-12]
import '@mantine/charts/styles.css';
import { BarChart } from '@mantine/charts';

const data = Object.entries(counts)
  .filter(([, v]) => typeof v === 'number')
  .sort((a, b) => (b[1] as number) - (a[1] as number))
  .slice(0, 15)
  .map(([type, count]) => ({ type, count }));

<BarChart
  h={300}
  data={data}
  dataKey="type"
  series={[{ name: 'count', color: 'blue.6' }]}
  tickLine="y"
  gridAxis="y"
  withTooltip
/>
```

### Example 3: OperationOutcomeIssue rendering

```typescript
// Source: FHIR R4 OperationOutcome spec [CITED: hl7.org/fhir/R4/operationoutcome.html]
import type { OperationOutcomeIssue } from '@medplum/fhirtypes';
import { Badge, Table } from '@mantine/core';

const SEVERITY_COLOR: Record<string, string> = {
  fatal: 'red',
  error: 'red',
  warning: 'yellow',
  information: 'blue',
};

function IssueRow({ issue }: { issue: OperationOutcomeIssue }) {
  return (
    <Table.Tr>
      <Table.Td>
        <Badge color={SEVERITY_COLOR[issue.severity] ?? 'gray'}>
          {issue.severity}
        </Badge>
      </Table.Td>
      <Table.Td>{issue.code}</Table.Td>
      <Table.Td>
        <code>{issue.expression?.[0] ?? issue.location?.[0] ?? '—'}</code>
      </Table.Td>
      <Table.Td>{issue.diagnostics ?? issue.details?.text ?? ''}</Table.Td>
    </Table.Tr>
  );
}
```

### Example 4: Progressive completeness computation

```typescript
// Source: adapted from useResourceCounts concurrency pattern
import { useState, useEffect, useRef } from 'react';
import type { MedplumClient } from '@medplum/core';

type PerTypeReport = { populated: number; total: number } | 'loading' | 'error';

export function useCompletenessReport(
  client: MedplumClient | null,
  types: string[],
  sampleSize: number,
): Record<string, PerTypeReport> {
  const [reports, setReports] = useState<Record<string, PerTypeReport>>({});
  const cancelledRef = useRef(false);

  useEffect(() => {
    cancelledRef.current = false;
    if (!client || types.length === 0) { setReports({}); return; }
    const initial: Record<string, PerTypeReport> = {};
    for (const t of types) initial[t] = 'loading';
    setReports(initial);

    const queue = [...types];
    let active = 0;
    const CONCURRENCY = 4; // mirror useResourceCounts

    function next() {
      if (cancelledRef.current) return;
      while (active < CONCURRENCY && queue.length) {
        const t = queue.shift()!;
        active++;
        computeForType(client, t, sampleSize)
          .then(r => !cancelledRef.current && setReports(p => ({ ...p, [t]: r })))
          .catch(() => !cancelledRef.current && setReports(p => ({ ...p, [t]: 'error' })))
          .finally(() => { active--; next(); });
      }
    }
    next();
    return () => { cancelledRef.current = true; };
  }, [client, types.join(','), sampleSize]);

  return reports;
}
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| Walk every resource for completeness | Sample N per type, label "based on N" | D-06 locked | Bounded runtime; honest about the estimate |
| Post resource to source server for `$validate` | Dedicated external validator endpoint + client-side structural walker | Blaze's `$validate` is not implemented on resources (F-01) | Phase works on servers that don't ship validation |
| `Bundle.total` from raw search | `_summary=count` explicitly | Phase 2 | Skips wasted page load; Blaze-compliant |
| Hand-rolled SVG charts | `@mantine/charts` + `recharts` | Mantine 7.4 shipped `@mantine/charts` | Theme integration; less code |

**Deprecated/outdated:**
- `fhir.js` (the npm package) — last meaningful update long predates FHIR R4 active maintenance
- `@types/fhir` (community) — superseded by `@medplum/fhirtypes` for our use case
- Recharts 2.x (for new projects) — but we stay on 2.x because `@mantine/charts` targets 2.x API [CITED: github.com/mantinedev/mantine/issues/8001]

## Assumptions Log

| # | Claim | Section | Risk if Wrong |
|---|-------|---------|---------------|
| A1 | MII Kerndatensatz StructureDefinitions are re-distributable with our MIT app | Standard Stack — Bundled assets | If licensing forbids redistribution, profiles must be fetched at runtime from Simplifier; CORS + offline-breakage implications. Check `de.medizininformatikinitiative.kerndatensatz.*` package licenses before bundling. |
| A2 | The planner will size the phase across 3-5 plans (overview, counts+charts, completeness, coding-coverage, validation) | Recommended Project Structure | Low — structure adapts to plan count |
| A3 | Users with an MII-profiled dataset are the target audience for QUAL-04 (non-MII datasets see structural-only validation) | Validation Architecture | Medium — if target users have non-MII datasets, the profile registry is unhelpful; surface this explicitly in UI |
| A4 | Blaze honors `_count=N` on `searchResources` as a hard cap for sampling | Pattern 1 | Low — this is standard FHIR search behavior |
| A5 | `client.post(path, body)` on a MedplumClient pointed at a validator URL correctly issues `POST {base}/{path}` with JSON body and honors `_format=json` | Pattern 4 | Medium — verify with a simple test against HL7's public validator before committing to the remote-backend pattern. `MedplumClient.post` signature verified in Phase 4, but was only used against terminology endpoints. |
| A6 | The user's dashboard context includes `{ client, capability }` via `useOutletContext` (same pattern as Explorer / Patients) | Recommended Project Structure | Low — pattern is locked across all existing layouts |

## Open Questions (RESOLVED)

1. **Should the "validator server" be the terminology server or a separate endpoint?**
   - RESOLVED: separate `validation.validatorUrl` field in `settings.yaml`. Blank = structural-only mode. Candidates documented: `https://validator.fhir.org/validator`, Firely's public endpoint. Locked in UI-SPEC Settings section + Plan 05-01 settings.validation block.

2. **Do MII profiles cover all resource types the user might want to validate, or only the 6 MII modules?**
   - RESOLVED: Structural validation runs on any type with a registered profile; types without a profile get a "No MII profile — structural checks only" label (UI-SPEC empty state C-VAL-05, Plan 05-05 ValidationPanel). No profile guessing.

3. **Is a chart library justified for v1, or is Mantine-only sufficient?**
   - RESOLVED: Mantine-only for v1 — locked in UI-SPEC Dimension 6 (Registry Safety). No `@mantine/charts` or `recharts` install in this phase. Bar-chart branch of D-04 explicitly rejected in favor of the "visual indicator" branch (Mantine Progress/RingProgress/stacked Progress). Add chart library in a future v2 phase only if users request proper chart visuals. See Standard Stack table note below.

4. **Export format for quality reports (Claude's discretion)?**
   - RESOLVED: **JSON only** in v1 — single downloadable file captures all panels' state (Plan 05-05 Task 2, UI-SPEC `Export report (JSON)` CTA). CSV/PDF deferred to v2 (QUAL-05/QUAL-06 scope).

> **Standard Stack reconciliation (2026-04-12):** In light of Q3 RESOLVED = Mantine-only for v1, the `@mantine/charts@8.3.18` and `recharts@^2.15.4` entries in the "Standard Stack — New (must install)" table above are **deferred to v2**. Phase 05 plans do NOT install these packages. Do not re-introduce them during implementation without explicit user approval.

## Environment Availability

| Dependency | Required By | Available | Version | Fallback |
|------------|------------|-----------|---------|----------|
| Blaze (FHIR server) | All QUAL-* | Assumed (user-configured) | Any R4 Blaze | Same as other phases — "Not connected" screen |
| `_summary=count` on Blaze | QUAL-01 | Yes | — | [VERIFIED: Phase 2 uses this against Blaze via `useResourceCounts`] |
| `$validate` on Blaze | QUAL-04 | **No** | — | Structural validator + optional external `validatorUrl` [VERIFIED: https://samply.github.io/blaze/conformance.html 2026-04-12] |
| External FHIR validator | QUAL-04 (enhanced mode) | User-configured, optional | — | Structural-only mode when unset |
| `@mantine/charts` 8.3.18 | QUAL-01 visuals (optional) | On npm | 8.3.18 | Mantine-only (Progress/RingProgress) |
| `recharts` 2.15.4 | `@mantine/charts` peer | On npm | 2.15.4 | — |
| MII StructureDefinition JSON | QUAL-02, QUAL-04 | On Simplifier, downloadable | 2025.0.x | Bundle at build time; if unbundled, fall back to `min>=1` heuristic |

**Missing dependencies with no fallback:** None.

**Missing dependencies with fallback:** `$validate` on Blaze (structural walker fallback); external validator (structural-only fallback).

## Validation Architecture

Test framework is already established from prior phases; no framework setup needed.

### Test Framework

| Property | Value |
|----------|-------|
| Framework | Vitest 4.1.4 + @testing-library/react 16.3.2 + jsdom 29 |
| Config file | `vitest.config.ts` (environment: jsdom, globals: true) |
| Quick run command | `npm test -- src/__tests__/quality-*.test.ts` (after new tests land) |
| Full suite command | `npm test` |

### Phase Requirements → Test Map

| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| QUAL-01 | `summarizeCounts` aggregates total + typeCount from `Record<string, CountValue>` | unit | `npm test -- src/__tests__/quality-counts.test.ts` | ❌ Wave 0 |
| QUAL-01 | `QualityOverviewPage` renders summary cards from counts | component | `npm test -- src/__tests__/quality-overview.test.tsx` | ❌ Wave 0 |
| QUAL-02 | `computeCompleteness` returns correct populated/total/perPath for known sample + requiredPaths | unit | `npm test -- src/__tests__/completeness-walker.test.ts` | ❌ Wave 0 |
| QUAL-02 | `isPathPopulated` handles `value[x]` choice types (Pitfall 3) | unit | same file | ❌ Wave 0 |
| QUAL-02 | `useCompletenessReport` respects 4-concurrent limit, progressively populates state | integration | `npm test -- src/__tests__/completeness-hook.test.tsx` | ❌ Wave 0 |
| QUAL-03 | `classifyCodedFields` classifies CC into systemCode/textOnly/empty | unit | `npm test -- src/__tests__/coding-coverage-walker.test.ts` | ❌ Wave 0 |
| QUAL-03 | Walker ignores Identifier / bare Coding (Pitfall 5) | unit | same file | ❌ Wave 0 |
| QUAL-03 | `CodingCoveragePanel` renders 3-bucket breakdown | component | `npm test -- src/__tests__/coding-coverage-panel.test.tsx` | ❌ Wave 0 |
| QUAL-04 | `validateStructural` returns issues for missing `mustSupport` fields | unit | `npm test -- src/__tests__/structural-validator.test.ts` | ❌ Wave 0 |
| QUAL-04 | `validateRemote` parses OperationOutcome and returns `issue[]` | unit | `npm test -- src/__tests__/remote-validator.test.ts` | ❌ Wave 0 |
| QUAL-04 | `ValidationPanel` shows progress; stops on cancel | component | `npm test -- src/__tests__/validation-panel.test.tsx` | ❌ Wave 0 |
| All | Profiles registry typechecks every bundled JSON against `StructureDefinition` | type-test | `npm run build` (tsc phase) | N/A (compile-time) |

### Sampling Rate
- **Per task commit:** `npm test -- src/__tests__/{file being edited}.test.ts`
- **Per wave merge:** `npm test -- src/__tests__/quality-*.test.* completeness-*.test.* coding-*.test.* structural-*.test.* remote-*.test.* validation-*.test.*`
- **Phase gate:** `npm test` (full suite green) + `npm run build` (typecheck) before `/gsd-verify-work`

### Wave 0 Gaps
- [ ] `src/__tests__/quality-counts.test.ts` — covers QUAL-01 aggregation logic
- [ ] `src/__tests__/quality-overview.test.tsx` — covers QUAL-01 UI
- [ ] `src/__tests__/completeness-walker.test.ts` — covers QUAL-02 unit logic + Pitfall 3 + Pitfall 4
- [ ] `src/__tests__/completeness-hook.test.tsx` — covers QUAL-02 hook concurrency
- [ ] `src/__tests__/coding-coverage-walker.test.ts` — covers QUAL-03 classifier + Pitfall 5
- [ ] `src/__tests__/coding-coverage-panel.test.tsx` — covers QUAL-03 UI
- [ ] `src/__tests__/structural-validator.test.ts` — covers QUAL-04 offline backend
- [ ] `src/__tests__/remote-validator.test.ts` — covers QUAL-04 online backend with mocked `MedplumClient.post`
- [ ] `src/__tests__/validation-panel.test.tsx` — covers QUAL-04 UI + cancel + progress
- [ ] `src/__tests__/fixtures/mii-profiles.ts` — minimal trimmed StructureDefinitions for use in unit tests (don't load the full bundled profile — tests should be hermetic)
- [ ] `src/__tests__/fixtures/fhir-samples.ts` — small fixed Condition/Observation/Patient samples for walker tests

No framework install needed — Vitest, Testing Library, Mantine-test-safe polyfills (ResizeObserver, matchMedia) already established in the existing test files.

## Sources

### Primary (HIGH confidence)
- `src/hooks/useResourceCounts.ts` — existing `_summary=count` implementation, pattern to reuse
- `src/terminology/walker.ts` — existing `collectCodings`, pattern to extend
- `src/terminology/TerminologyCache.ts` — existing cache pattern to mirror
- `src/components/dashboard/DashboardPage.tsx` — layout pattern to mirror
- `src/App.tsx:66` — `/quality` route stub already wired
- `src/config/types.ts` — settings type (needs `validation` block addition)
- `package.json` — installed dep versions
- npm registry via `npm view` (2026-04-12): `@mantine/charts@8.3.18` peer deps, `recharts@2.15.4` / `3.8.1` versions
- https://samply.github.io/blaze/conformance.html — authoritative list of Blaze operations (NO `$validate`)
- https://samply.github.io/blaze/api.html — async `_summary=count` pattern
- https://mantine.dev/charts/getting-started/ — Mantine charts install
- https://hl7.org/fhir/R4/operationoutcome.html — OperationOutcome schema
- https://hl7.org/fhir/R4/structuredefinition.html — StructureDefinition snapshot/differential structure

### Secondary (MEDIUM confidence)
- https://www.medizininformatik-initiative.de/Kerndatensatz/Modul_Diagnose/Condition.html — MII Diagnose Condition canonical URL structure
- https://simplifier.net/packages/de.medizininformatikinitiative.kerndatensatz.person/2025.0.1 — MII Person 2025 package
- https://github.com/mantinedev/mantine/issues/8001 — Mantine charts still on recharts 2.x
- https://github.com/recharts/recharts/wiki/3.0-migration-guide — recharts 3.0 breaking changes
- https://fire.ly/blog/validate-fhir-resources-like-a-boss/ — external validator options

### Tertiary (LOW confidence)
- https://www.npmjs.com/package/fhirpath — fhirpath.js for path evaluation (NOT recommended for v1 — 6 MB dep, overkill for dotted paths without type resolution; v2 consideration only)

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH — all versions verified on npm 2026-04-12; all integration patterns already in codebase
- Architecture (counts/coverage/completeness): HIGH — primitives already shipped in Phases 1-4
- Architecture (validation): MEDIUM — structural walker is deterministic and testable; remote backend design is validated by FHIR spec but not end-to-end tested against a real validator yet
- Blaze `$validate` negative claim: HIGH — confirmed by Blaze's own conformance page enumerating supported operations, plus Blaze's GitHub API docs
- MII profile canonical URL structure: HIGH for the 2025 Diagnose module (direct verification); MEDIUM for the other 6 modules (extrapolated from the `fhir/core/modul-*/StructureDefinition/*` pattern — confirm each before bundling)
- Pitfalls: HIGH — derived from direct spec reading + existing codebase patterns
- Chart library choice: MEDIUM — `@mantine/charts` is the obvious fit but remains discretion-level; ship-without-charts is equally viable

**Research date:** 2026-04-12
**Valid until:** 2026-05-12 (stable stack; re-verify npm versions and Blaze capability list monthly)
