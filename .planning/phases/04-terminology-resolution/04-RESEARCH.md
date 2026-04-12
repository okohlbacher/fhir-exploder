# Phase 4: Terminology Resolution - Research

**Researched:** 2026-04-12
**Domain:** FHIR terminology resolution ($lookup) with client-side caching, Medplum React integration, graceful degradation
**Confidence:** MEDIUM-HIGH (resolution mechanics and caching are well-understood; the MII termserver accessibility is a genuine risk that the planner must address)

## Summary

Phase 4 must make CodeableConcept values across the app show human-readable text instead of raw codes. The mechanism is FHIR `CodeSystem/$lookup` against a terminology server, with an in-memory cache keyed by `system|code`, optional localStorage persistence, and silent fallback to the raw code when lookups fail.

The single most important finding: **Medplum's `CodeableConceptDisplay` is synchronous — it calls `formatCodeableConcept()` which returns `codeableConcept.text` → `coding[0].display` → `coding[0].code` in that order, with no terminology server call.** There is no hook inside `ResourceTable` to inject async resolution. The clean pattern is to **pre-populate the `display` field on each Coding in the resource** *before* handing the resource to Medplum components. Medplum then renders the now-populated display for free. This approach works across `ResourceTable`, `ResourcePropertyDisplay`, `SearchControl` rows, `PatientSummary`, `ObservationTable`, `DiagnosticReportDisplay` — all of them — without forking or wrapping Medplum internals.

The second critical finding: **the MII Terminology Server at `https://terminology.medizininformatik-initiative.de/fhir` is mTLS-protected and restricted to registered German entities, not a public endpoint.** [VERIFIED: mii-termserv.de/en/faq/] A browser-based SPA cannot authenticate with it out of the box without user-installed client certificates, and Firefox in particular is known not to forward client certs on CORS preflight. The planner must treat D-01's specific URL as a configuration default that likely won't work in practice, and the architecture must keep the terminology server URL fully swappable (it already is, per D-02). A public fallback endpoint — the CSIRO Ontoserver R4 sandbox at `https://r4.ontoserver.csiro.au/fhir` — supports the same operations ($lookup, $translate, $expand) with CORS enabled and no auth, and is the correct default for development. [VERIFIED: ontoserver.csiro.au/docs/6.23.0/api-fhir.html, capability statement fetch]

**Primary recommendation:** Build a `TerminologyResolver` service with (1) an in-memory `Map<string, Entry>` cache keyed by `${system}|${code}`, (2) in-flight request deduplication via a `Map<string, Promise>`, (3) a `resolveCodeableConcept(cc)` method that mutates a shallow clone to populate `display` values, and (4) silent catch-all that degrades to `formatCoding` output. Wrap every Medplum component rendering CodeableConcepts in a thin `<ResolvedResource>` or `<ResolvedResourceTable>` wrapper that fetches resolutions via a `useResolvedResource(resource)` hook and passes the enriched resource down. Ship with `https://r4.ontoserver.csiro.au/fhir` as the development default; document that the MII URL requires environment-specific mTLS setup the SPA cannot provide.

---

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions

**Terminology Server Integration**
- **D-01:** Use the MII Terminology Server at `https://terminology.medizininformatik-initiative.de/fhir` for $lookup and $translate operations on CodeableConcepts.
- **D-02:** Terminology server URL configurable in `settings.yaml` alongside the FHIR server URL.

**Resolution Strategy**
- **D-03:** Resolve CodeableConcepts by first checking if a `display` value already exists on the resource. If not, call `$lookup` on the terminology server using the `system` and `code`. Fall back to raw code if lookup fails.
- **D-04:** Resolution happens transparently — components that display CodeableConcepts automatically attempt resolution. No manual user action required.

**Caching**
- **D-05:** In-memory cache for resolved terminology values within the browser session. Cache keyed by `system+code` pair.
- **D-06:** Optional localStorage persistence for the cache so resolved values survive page reloads. Cache invalidation via a "Clear terminology cache" action in settings.

**Graceful Degradation**
- **D-07:** When the terminology server is unreachable, display the raw code value (`system|code`) without errors or broken UI. No error toast — silent fallback with a subtle indicator (e.g., monospace font or tooltip "unresolved code").
- **D-08:** Terminology server health check on app connect — show terminology server status alongside FHIR server status in the sidebar indicator.

### Claude's Discretion
- Batch vs individual resolution strategy for lists of resources
- Cache size limits and eviction policy
- Whether to prefetch common code systems on connect

### Deferred Ideas (OUT OF SCOPE)
None — discussion stayed within phase scope.
</user_constraints>

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|------------------|
| TERM-01 | App resolves CodeableConcept display values by querying the MII Terminology Server ($lookup, $translate) | `TerminologyResolver.resolveCoding()` issues `GET {termServerUrl}/CodeSystem/$lookup?system=...&code=...` and reads `parameter[name=display].valueString` from the response. See "MII/FHIR Terminology Server API" section. |
| TERM-02 | Resolved terminology display values are cached to avoid redundant server requests | In-memory `Map<string, TerminologyCacheEntry>` keyed by `${system}|${code}`, optional localStorage mirror. Hit cache before network, in-flight dedup via promise map. See "Caching Architecture" section. |
| TERM-03 | App falls back gracefully to raw code values when the terminology server is unavailable or a code cannot be resolved | Every resolver path wraps fetch in try/catch, records a negative cache entry with TTL, and `resolveCodeableConcept` returns the CodeableConcept unchanged on miss (Medplum's existing `formatCodeableConcept` then falls through to `code`). No toast, no thrown error. See "Failure Modes & Fallback" section. |

</phase_requirements>

## Project Constraints (from CLAUDE.md)

- React 18.3.x — no React 19-only APIs (`use()`, actions); stick to hooks and Suspense-free async patterns.
- @medplum/react 5.1.x and @mantine/core 8.x — don't swap Medplum components; wrap them.
- Do **NOT** add `@tanstack/react-query` — CLAUDE.md explicitly forbids it (conflicts with MedplumClient caching). Terminology cache must be hand-rolled (simple Map) or reuse MedplumClient HTTP caching incidentally.
- State management: React context + hooks only. No Redux, no Zustand. Terminology cache lives in a Context provider (`TerminologyProvider`) alongside the existing `ConnectionProvider`.
- Styling: Mantine only. No Tailwind. Use Mantine's `Text` / `Code` / `Tooltip` / `Badge` for the "unresolved code" subtle indicator.
- Testing: Vitest + jsdom + @testing-library/react (already wired). Tests live in `src/__tests__/*.test.ts{x}`.
- YAML config via `js-yaml`; settings shape already supports `terminology.serverUrl?` (see `src/config/types.ts` L11-13).
- No write operations to FHIR server — this is a read-only explorer. Terminology server calls are all GET/POST-read.
- License: MIT; don't pull in non-MIT-compatible deps.

## Standard Stack

No new dependencies are required. Everything needed is already installed.

### Core (already installed)
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| @medplum/core | 5.1.7 | `MedplumClient.get/post` for raw HTTP to termserver; `formatCodeableConcept`/`formatCoding` for fallback formatting; `ReadablePromise` semantics | Already used for Blaze; reuse its HTTP layer for termserver calls so error shape is consistent. `formatCodeableConcept` is the de-facto display algorithm (text → display → code) we must align with. [VERIFIED: node_modules/@medplum/core/dist/esm/index.d.ts L1867-1880, L3664-3678] |
| @medplum/fhirtypes | 5.1.7 | `CodeableConcept`, `Coding`, `Parameters`, `OperationOutcome` types | Already used; `Parameters` is the $lookup response envelope. [VERIFIED: node_modules/@medplum/fhirtypes/dist/CodeableConcept.d.ts] |
| @medplum/react | 5.1.7 | `CodeableConceptDisplay`, `ResourceTable`, `ResourcePropertyDisplay` | Existing render surface. Inject resolved `display` values by mutating the resource tree upstream — no forks. [VERIFIED: grepped dist — `CodeableConceptDisplay(props){return jsx(Fragment,{children:formatCodeableConcept(props.value)})}`] |
| js-yaml | 4.1.1 | Already reads settings.yaml (no changes needed) | Existing; `terminology.serverUrl` field already exists in `AppSettings` type. [VERIFIED: src/config/types.ts] |

### Supporting (already installed — no new adds)
| Library | Purpose | When to Use |
|---------|---------|-------------|
| @mantine/core | `Tooltip`, `Text c="dimmed" ff="monospace"`, `Badge` | Subtle "unresolved code" indicator per D-07 |
| @mantine/hooks | `useLocalStorage` | Cache persistence per D-06 (optional toggle) |
| react (18.3) | `createContext`, `useContext`, `useEffect`, `useState`, `useSyncExternalStore` | `TerminologyProvider`, `useResolvedResource` hook |

### Alternatives Considered
| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| Hand-rolled Map cache | `@tanstack/react-query` | **Forbidden by CLAUDE.md.** Also overkill — we need one cache, one promise dedup table, not a library. |
| `MedplumClient.valueSetExpand()` | — | `valueSetExpand` is for expanding a ValueSet (e.g., "give me all diabetes codes"). We need `$lookup` (code → display), not expansion. Keep in mind for Phase 5 quality metrics, not here. [VERIFIED: node_modules/@medplum/core/dist/esm/index.d.ts L3975] |
| Separate `MedplumClient` for termserver | `fetch()` directly | Using a second `MedplumClient` gives us consistent error classification, request options, and future auth support (basic/bearer against a non-MII termserver). Recommended. See "Architecture Patterns". |
| Wrapping `CodeableConceptDisplay` per-use-site | Upstream resource enrichment | Medplum components are deeply nested (`ResourceTable` renders internal `ResourcePropertyDisplay` → `CodeableConceptDisplay`). Wrapping every leaf is infeasible. Enriching the resource once at the boundary is idempotent and free. [VERIFIED: grepped dist impl] |
| `ValueSet/$validate-code` | `$lookup` | `$validate-code` validates membership in a ValueSet and optionally returns display. `$lookup` is more direct and works when we don't know the ValueSet. Use `$lookup` as primary. |
| `ConceptMap/$translate` | — | Listed in D-01 but not strictly needed for display resolution. Mention as future capability for Phase 5 (code-system translation like ICD→SNOMED); out of scope for TERM-01/02/03. |

**Installation:** None. All dependencies already present. Verify with:
```bash
npm ls @medplum/core @medplum/react @medplum/fhirtypes js-yaml
```

**Version verification (2026-04-12):**
```bash
npm view @medplum/core version   # → 5.1.7 (matches installed)
npm view @mantine/core version   # → 8.3.18 (matches installed)
```
[VERIFIED: package.json]

## MII / FHIR Terminology Server API

### Endpoint reality check (CRITICAL — read before locking D-01)

| Endpoint | Auth | CORS | Public? | Suitable? |
|----------|------|------|---------|-----------|
| `https://terminology.medizininformatik-initiative.de/fhir` (D-01 default) | **Mutual TLS** (DFN-issued client cert) | Unverified — typical mTLS servers are not CORS-friendly for browsers | No — German-registered entities only | **Not directly usable from a browser SPA without per-user cert install.** [VERIFIED: mii-termserv.de/en/, mii-termserv.de/en/faq/] |
| `https://r4.ontoserver.csiro.au/fhir` (CSIRO sandbox) | None (anonymousUser) | Yes — `cors: true` in capability | Yes | **Usable as dev default and for demos.** Same Ontoserver software as MII uses. [VERIFIED: WebFetch of metadata endpoint 2026-04-12] |
| `https://tx.fhir.org/r4` (HL7 public tx server) | None | Yes | Yes | Usable. SNOMED, LOINC, etc. General-purpose. [CITED: HL7 public test servers confluence] |
| User-hosted local Ontoserver | Configurable | Configurable | Per-deployment | The production deployment pattern for real MII data environments. |

**Implication for planner:** The settings.yaml `terminology.serverUrl` must be the mechanism by which operators point at their site-specific mTLS-proxied termserver or a local deployment. Ship the code with `https://r4.ontoserver.csiro.au/fhir` as the documented dev default (not the MII URL), and write docs that explain the MII endpoint requires operator infrastructure (reverse proxy with client cert, or CORS-enabled local mirror). This does not violate D-01 or D-02 — D-02 makes the URL configurable. Add a comment in the commented `terminology:` block of `public/settings.yaml` pointing to both options.

### `$lookup` request format (R4)

**GET** (primary — works for simple system+code):
```
GET {termServerUrl}/CodeSystem/$lookup?system={system}&code={code}&displayLanguage={lang}
Accept: application/fhir+json
```

**POST** (use when URL-encoding system+code is fragile, e.g. with special chars):
```http
POST {termServerUrl}/CodeSystem/$lookup
Content-Type: application/fhir+json
Accept: application/fhir+json

{
  "resourceType": "Parameters",
  "parameter": [
    { "name": "system", "valueUri": "http://hl7.org/fhir/sid/icd-10" },
    { "name": "code",   "valueCode": "E11.9" },
    { "name": "displayLanguage", "valueCode": "de" }
  ]
}
```

### `$lookup` response (success)

```json
{
  "resourceType": "Parameters",
  "parameter": [
    { "name": "name",    "valueString": "International Classification of Diseases, 10th Revision" },
    { "name": "version", "valueString": "2024" },
    { "name": "display", "valueString": "Diabetes mellitus, Type 2, without complications" },
    { "name": "designation", "part": [
        { "name": "language", "valueCode": "de" },
        { "name": "value",    "valueString": "Diabetes mellitus Typ 2, ohne Komplikationen" }
    ]}
  ]
}
```

**Extraction algorithm:**
1. Find parameter with `name === 'display'` → `valueString`. That's the display value. [CITED: hl7.org/fhir/R4/codesystem-operation-lookup.html]
2. If `displayLanguage=de` was requested and a German `designation` exists, prefer the designation's `valueString` over the top-level display (for MII resources where German is canonical).
3. Return the final string.

[VERIFIED: hl7.org/fhir/R4/codesystem-operation-lookup.html — parameter shape, cardinality]

### `$lookup` response (not found / server error)

Server returns HTTP 4xx/5xx with an `OperationOutcome`:
```json
{
  "resourceType": "OperationOutcome",
  "issue": [
    { "severity": "error", "code": "not-found",
      "details": { "text": "Unable to find code 'E11.99' in system 'http://hl7.org/fhir/sid/icd-10'" }}
  ]
}
```

**Handling:** Treat any non-2xx or any non-`Parameters` response as a lookup miss. Do NOT throw to the UI. Cache the miss with a short TTL (see Caching).

### `$translate` (out of scope for Phase 4 but document for future)

`ConceptMap/$translate` takes source system+code and a target ValueSet, returns mappings. Useful for Phase 5 data quality (e.g., translating local codes to MII standard codes), not for simple display resolution. Keep the `TerminologyResolver` API extensible so a `translate(system, code, targetValueSet)` method can be added later.

## Architecture Patterns

### Recommended Project Structure

```
src/
├── terminology/                        # NEW — phase 4 core
│   ├── client.ts                       # createTerminologyClient(settings) → MedplumClient
│   ├── resolver.ts                     # TerminologyResolver: cache + $lookup + dedup
│   ├── cache.ts                        # In-memory Map + optional localStorage sync
│   ├── types.ts                        # TerminologyCacheEntry, TerminologyStatus
│   └── health.ts                       # Health probe (metadata fetch with timeout)
├── contexts/
│   ├── ConnectionContext.tsx           # existing
│   └── TerminologyContext.tsx          # NEW — provides TerminologyResolver to tree
├── hooks/
│   ├── useConnection.ts                # existing
│   ├── useTerminology.ts               # NEW — thin wrapper for context access
│   ├── useResolvedResource.ts          # NEW — enriches a Resource with display values
│   └── useResolvedCodeableConcept.ts   # NEW — single CodeableConcept for one-off cases
├── components/
│   ├── explorer/HumanReadableView.tsx  # MODIFY — wrap ResourceTable with ResolvedResource
│   ├── explorer/ClinicalRawView.tsx    # MODIFY — same
│   ├── layout/Sidebar.tsx              # MODIFY — add terminology status dot
│   └── settings/SettingsPage.tsx       # MODIFY — add "Clear terminology cache" button
└── __tests__/
    ├── terminology-resolver.test.ts    # NEW — cache, dedup, fallback
    ├── terminology-cache.test.ts       # NEW — Map ops, localStorage sync, eviction
    ├── terminology-context.test.tsx    # NEW — provider + hook
    ├── resolved-resource.test.tsx      # NEW — hook integration with mocked fetch
    └── terminology-health.test.ts      # NEW — health probe success/failure/timeout
```

### Pattern 1: Enrich-Before-Render (Core Pattern)

**What:** Instead of wrapping every leaf Medplum component, walk the resource tree once, populate `display` on every `Coding`, pass the enriched resource to `ResourceTable`. Medplum's `formatCoding` already prefers `coding.display` over `code`, so enrichment is enough — no fork needed.

**When to use:** Any place we hand a resource or bundle to Medplum (ResourceTable, ResourcePropertyDisplay, SearchControl row rendering, PatientSummary, ObservationTable, DiagnosticReportDisplay).

**Why it works:** `CodeableConceptDisplay` calls `formatCodeableConcept(cc)` which returns `cc.text ?? formatCoding(cc.coding?.[0]) ?? ''`, and `formatCoding(c)` returns `c.display ?? c.code ?? ''`. Setting `coding[i].display` makes every downstream render show the resolved text. [VERIFIED: @medplum/core grepped dist]

**Example:**

```typescript
// src/hooks/useResolvedResource.ts
import { useEffect, useState } from 'react';
import type { Resource, CodeableConcept, Coding } from '@medplum/fhirtypes';
import { useTerminology } from './useTerminology';

/**
 * Returns a copy of `resource` with all Coding.display fields populated
 * from the terminology server (or cache). During resolution the original
 * resource is returned; the UI re-renders once all lookups settle.
 * Silent: failures leave display unset, which lets formatCoding fall back to code.
 */
export function useResolvedResource<T extends Resource>(resource: T | undefined): T | undefined {
  const resolver = useTerminology();
  const [resolved, setResolved] = useState<T | undefined>(resource);

  useEffect(() => {
    if (!resource) { setResolved(undefined); return; }
    let cancelled = false;
    resolver.resolveResource(resource).then((next) => {
      if (!cancelled) setResolved(next as T);
    });
    return () => { cancelled = true; };
  }, [resource, resolver]);

  return resolved;
}
```

### Pattern 2: Single MedplumClient per Server

**What:** Create a second `MedplumClient` bound to the terminology server URL. Don't try to reuse the FHIR/Blaze client.

**When to use:** Always. The FHIR server and terminology server have different base URLs, potentially different auth, and different error domains.

**Why:** Clean separation. `createTerminologyClient(settings)` mirrors `createFhirClient(settings)` exactly — same pattern, same error classification.

```typescript
// src/terminology/client.ts
import { MedplumClient } from '@medplum/core';
import type { AppSettings } from '../config/types';

export function createTerminologyClient(settings: AppSettings): MedplumClient | null {
  const url = settings.terminology?.serverUrl;
  if (!url) return null; // Terminology optional
  const u = new URL(url);
  return new MedplumClient({
    baseUrl: `${u.protocol}//${u.host}`,
    fhirUrlPath: u.pathname.replace(/^\//, '').replace(/\/?$/, '/'),
  });
}
```

### Pattern 3: Promise Deduplication + Cache Stratification

**What:** Three states per `${system}|${code}` key: (a) cached hit with display, (b) cached miss (short TTL), (c) in-flight Promise. Ensure N parallel components asking for the same code issue exactly one network request.

**When to use:** Always — this is the core of the resolver.

**Example:**

```typescript
// src/terminology/resolver.ts  (sketch)
export interface TerminologyCacheEntry {
  display: string | null;        // null = negative cache (known miss)
  resolvedAt: number;            // ms epoch
  ttlMs: number;                 // positive entries: Infinity (or long). Negatives: short (e.g., 60_000).
}

export class TerminologyResolver {
  private cache = new Map<string, TerminologyCacheEntry>();
  private inflight = new Map<string, Promise<string | null>>();

  constructor(private client: MedplumClient | null, private opts: ResolverOptions) {}

  private key(system: string, code: string): string { return `${system}|${code}`; }

  async resolveCoding(coding: Coding): Promise<Coding> {
    if (coding.display) return coding;                         // D-03: skip if already set
    if (!coding.system || !coding.code) return coding;          // nothing to ask
    const display = await this.lookupDisplay(coding.system, coding.code);
    return display ? { ...coding, display } : coding;
  }

  async resolveCodeableConcept(cc: CodeableConcept): Promise<CodeableConcept> {
    if (!cc.coding?.length) return cc;
    const resolved = await Promise.all(cc.coding.map(c => this.resolveCoding(c)));
    return { ...cc, coding: resolved };
  }

  async resolveResource<T extends Resource>(resource: T): Promise<T> {
    const codings = collectCodings(resource);                   // depth-first walk
    await Promise.all(codings.map(c => this.resolveCoding(c))); // fills cache; mutation step below
    return applyCachedDisplays(resource, this.cache) as T;      // pure clone with displays populated
  }

  private async lookupDisplay(system: string, code: string): Promise<string | null> {
    const k = this.key(system, code);
    const cached = this.cache.get(k);
    if (cached && !isExpired(cached)) return cached.display;
    const running = this.inflight.get(k);
    if (running) return running;
    if (!this.client) return null;                              // no termserver configured
    const p = this.fetchLookup(system, code).finally(() => this.inflight.delete(k));
    this.inflight.set(k, p);
    return p;
  }

  private async fetchLookup(system: string, code: string): Promise<string | null> {
    try {
      const qs = new URLSearchParams({ system, code });
      if (this.opts.displayLanguage) qs.set('displayLanguage', this.opts.displayLanguage);
      const result = await this.client!.get<Parameters>(
        `CodeSystem/$lookup?${qs.toString()}`,
        { signal: AbortSignal.timeout(this.opts.lookupTimeoutMs ?? 5000) }
      );
      const display = extractDisplay(result, this.opts.displayLanguage);
      this.cache.set(this.key(system, code), {
        display, resolvedAt: Date.now(),
        ttlMs: display ? Infinity : (this.opts.negativeTtlMs ?? 5 * 60_000),
      });
      return display;
    } catch {
      // Silent per D-07 — cache negative briefly to avoid hammering a dead server.
      this.cache.set(this.key(system, code), {
        display: null, resolvedAt: Date.now(),
        ttlMs: this.opts.negativeTtlMs ?? 5 * 60_000,
      });
      return null;
    }
  }
}

function extractDisplay(params: Parameters, lang?: string): string | null {
  if (params.resourceType !== 'Parameters') return null;
  const byName = (n: string) => params.parameter?.find(p => p.name === n);
  if (lang) {
    const desigs = params.parameter?.filter(p => p.name === 'designation') ?? [];
    for (const d of desigs) {
      const partLang = d.part?.find(p => p.name === 'language')?.valueCode;
      const partVal  = d.part?.find(p => p.name === 'value')?.valueString;
      if (partLang === lang && partVal) return partVal;
    }
  }
  return byName('display')?.valueString ?? null;
}
```

### Pattern 4: Batching via Batch-of-$lookup (Deferred — use Promise.all for v1)

**Decision on Claude's Discretion "batch vs individual":**
- **v1 (this phase):** Use `Promise.all` over N individual `$lookup` requests, deduplicated by the in-flight map. With HTTP/2 keepalive (default in modern browsers) and dedup, this is fast enough for typical pages (10-50 unique codes per view).
- **Not now:** FHIR `Bundle` batch POSTing multiple `$lookup` operations in one request. Adds ~100 lines of code and breaks streaming UX. Revisit only if profiling shows a bottleneck.
- **Rationale:** Most code systems (ICD-10, LOINC, SNOMED core concepts) are hit repeatedly across resources of the same type, so the *second* resource onwards is all cache hits. The first page is the only one that takes a network roundtrip per unique code.

[ASSUMED: typical page has <50 unique codes — not profiled. Verify in Phase 4 execution.]

### Pattern 5: Context Wiring

**What:** `TerminologyProvider` sits inside `ConnectionProvider` (needs settings) and wraps all routes. `useTerminology()` returns the shared `TerminologyResolver` instance.

**Why:** Single shared cache across the whole app. Matches the existing `ConnectionProvider` pattern. [VERIFIED: src/contexts/ConnectionContext.tsx, src/App.tsx L72-74]

```typescript
// src/contexts/TerminologyContext.tsx  (sketch)
export function TerminologyProvider({ children }: { children: ReactNode }) {
  const { settings } = useSettings();
  const resolver = useMemo(() => {
    const client = settings ? createTerminologyClient(settings) : null;
    return new TerminologyResolver(client, {
      displayLanguage: 'de',
      lookupTimeoutMs: 5000,
      negativeTtlMs: 5 * 60_000,
      persistToLocalStorage: true,
    });
  }, [settings]);
  return <TerminologyContext.Provider value={resolver}>{children}</TerminologyContext.Provider>;
}

// src/App.tsx (modification)
<ConnectionProvider>
  <TerminologyProvider>
    <AppRoutes />
  </TerminologyProvider>
</ConnectionProvider>
```

### Anti-Patterns to Avoid

- **Wrapping Medplum's `CodeableConceptDisplay` per-site.** `ResourceTable` instantiates it internally via `ResourcePropertyDisplay` — we cannot inject a custom renderer without forking Medplum. Enrich resources upstream instead.
- **Resolving inside render with `useEffect` on every `<CodeableConceptDisplay>`.** Causes N effects per row, waterfall renders, and makes dedup harder. Resolve once per resource, at the boundary.
- **Throwing errors on lookup failure.** D-07 forbids error toasts. Every failure path must return `null` / unresolved and let `formatCodeableConcept` handle the fallback.
- **Using `MedplumClient.valueSetExpand()` for display resolution.** `$expand` returns an entire ValueSet, which is massively over-fetching for a single code. Use `$lookup`.
- **Caching without a key prefix / version.** localStorage cache must be namespaced (`terminology-cache:v1`) so future format changes can invalidate cleanly.

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| HTTP with FHIR auth/headers | `fetch()` with manual Authorization | `MedplumClient.get()` | Already handles auth, retries, JSON parsing, same error shape as `createFhirClient`. Consistency beats marginal "simplicity". |
| CodeableConcept display formatting | Custom "text → display → code" logic | `formatCodeableConcept` / `formatCoding` from `@medplum/core` | Already exists and is battle-tested across Medplum's own components. Just feed it an enriched resource. [VERIFIED: node_modules/@medplum/core dist impl] |
| Request timeout | `Promise.race` with `setTimeout` | `AbortSignal.timeout(ms)` | Native in all modern browsers; composes with `fetch`; cancels the underlying request properly. [CITED: MDN AbortSignal.timeout] |
| Promise deduplication | LRU lib / p-memoize | 15-line `Map<key, Promise>` | One file, zero deps, matches CLAUDE.md "no extra caches" rule. |
| localStorage sync for cache | Custom serialization protocol | `useLocalStorage` from `@mantine/hooks` **only for the settings action** (Clear button); a plain `localStorage.setItem/getItem` JSON blob for the cache itself | Mantine's hook triggers re-renders on every set — wrong semantics for a hot path. For the cache body, use raw localStorage with a debounced flush. For the clear button and enable/disable toggle, Mantine's hook is fine. |
| Deep walk of FHIR resources to find Codings | AST/schema-driven walker | Simple recursive JS walk over objects (collect any value with `system` and `code` siblings, or shaped like `CodeableConcept`) | We only need to find Coding objects. Full FHIR schema walking (ElementDefinition traversal) is overkill and expensive. A ~30-line recursive function that yields `Coding` refs is sufficient. |

**Key insight:** The temptation is to build a "smart" terminology layer with validators, multiple operations, and complex caching. Resist. Phase 4's scope is *one* operation ($lookup), *one* cache (Map), and *one* display path (mutate `.display` before Medplum renders). Keep it boring.

## Common Pitfalls

### Pitfall 1: CORS / mTLS on the MII termserver
**What goes wrong:** The default URL in D-01 fails in the browser — either CORS preflight fails, or the browser can't present a client cert.
**Why it happens:** MII termserver requires mTLS; browsers don't forward client certs reliably in CORS preflights (especially Firefox). [VERIFIED: mii-termserv.de/en/faq/firefox-blank-pages/]
**How to avoid:** (a) Document `https://r4.ontoserver.csiro.au/fhir` as the dev default in `public/settings.yaml`. (b) Detect termserver failure in the health probe and surface "Terminology server unreachable" in the sidebar indicator (D-08) without breaking anything else. (c) For local MII deployments, a Vite proxy entry can front-terminate TLS to a local mTLS-capable proxy — document but don't implement here.
**Warning signs:** Every $lookup returns CORS error in console; health probe never turns green; all CodeableConcepts render as raw codes.

### Pitfall 2: Resolving CodeableConcept.text silently
**What goes wrong:** Developer wraps `ResourceTable` with resolution, but `formatCodeableConcept` prefers `cc.text` over `cc.coding[0].display`. If the resource has a narrative `text` like "see other record", the user never sees the resolved display.
**Why it happens:** FHIR cardinality: `CodeableConcept.text` is a free-form human reading that SHOULD win when present (spec). But `text` is frequently missing on MII data.
**How to avoid:** Resolve per `Coding` (populate `.display` on each coding), not per `CodeableConcept`. Don't overwrite `cc.text`. Let Medplum's existing logic decide precedence.
**Warning signs:** Some CodeableConcepts show resolved text, others show raw code, and it correlates with whether `cc.text` is populated.

### Pitfall 3: Infinite re-render on resolution
**What goes wrong:** `useResolvedResource` returns a new object each render → components depending on it re-render → lookup issued again.
**Why it happens:** `Promise.all` + `setState` on every render if dependency array is wrong (e.g., `[resource]` where `resource` is a new object on parent re-render).
**How to avoid:** Memoize resources upstream (`useMemo` on `resource.id`+`resource.meta.versionId` if stable). Inside the hook, early-return when the resolved output is deep-equal to the input. In tests, assert that a given resource triggers exactly one fetch.
**Warning signs:** Network tab shows repeated `$lookup` calls for the same code every few hundred ms.

### Pitfall 4: MII German display language not honored
**What goes wrong:** App displays English "Diabetes mellitus Type 2" instead of German "Diabetes mellitus Typ 2" despite a German-clinical user base.
**Why it happens:** `$lookup` without `displayLanguage=de` returns the code system's default display (often English for ICD-10).
**How to avoid:** Set `displayLanguage: 'de'` as a resolver option by default; read the preferred designation from the response. Make it overridable via settings for future i18n but default to `de` given the MII context. [VERIFIED: hl7.org/fhir/R4/codesystem-operation-lookup.html — `displayLanguage` and `designation` parts]
**Warning signs:** Users complain displays are "wrong language."

### Pitfall 5: Stale localStorage cache surviving a termserver swap
**What goes wrong:** User edits `terminology.serverUrl` in `settings.yaml` pointing to a different server (e.g., Ontoserver → MII-mirror); old cached displays from the previous server persist and are wrong for systems that disagree.
**Why it happens:** Cache key is `system|code`, not `serverUrl|system|code`.
**How to avoid:** Namespace the persistent cache by serverUrl (key prefix `terminology-cache:v1:{hash(serverUrl)}`). On `TerminologyProvider` mount, discard in-memory entries from other server URLs.
**Warning signs:** After changing settings.yaml, old display values appear for a few clicks before fresh lookups replace them.

### Pitfall 6: SearchControl result tables not re-rendering after resolution
**What goes wrong:** Resolution Promises resolve after `SearchControl` has already rendered; the resolved displays don't appear until scroll/refresh.
**Why it happens:** `SearchControl` receives a `SearchRequest`, not a pre-fetched bundle; it fetches internally. We can't enrich a bundle we don't own.
**How to avoid:** For SearchControl specifically, don't try to inject resolved displays — accept that the result table shows what Medplum renders (`cc.coding[0].display || code`). Instead, resolve on the **detail view** (`ResourceDetailPage` → `HumanReadableView` → wrapped `ResourceTable`) where we do own the fetched resource. For list-view coverage, add a later enhancement that replaces `SearchControl` with a custom bundle-fetching wrapper — defer to v2 or a follow-up plan.
**Warning signs:** Detail view shows resolved terms; search results table shows raw codes. Mixed UX.

### Pitfall 7: `AbortSignal.timeout` not available in jsdom
**What goes wrong:** Tests fail because jsdom doesn't polyfill `AbortSignal.timeout`.
**Why it happens:** jsdom 29 has it, but some older envs don't. [ASSUMED: Vitest 4 + jsdom 29 has it — verify in Wave 0]
**How to avoid:** Add a tiny shim in `resolver.ts` that falls back to a manual `AbortController` + `setTimeout` if `AbortSignal.timeout` is undefined.

## Code Examples

### Extracting display from `$lookup` response

```typescript
// src/terminology/resolver.ts
import type { Parameters } from '@medplum/fhirtypes';

export function extractDisplay(params: Parameters, lang?: string): string | null {
  if (params.resourceType !== 'Parameters') return null;
  if (lang) {
    const designations = params.parameter?.filter(p => p.name === 'designation') ?? [];
    for (const d of designations) {
      const l = d.part?.find(p => p.name === 'language')?.valueCode;
      const v = d.part?.find(p => p.name === 'value')?.valueString;
      if (l === lang && v) return v;
    }
  }
  return params.parameter?.find(p => p.name === 'display')?.valueString ?? null;
}
```

### Recursive Coding collector

```typescript
// src/terminology/walker.ts
import type { Coding } from '@medplum/fhirtypes';

/** Depth-first walk; yields every Coding-shaped object. */
export function collectCodings(value: unknown, out: Coding[] = []): Coding[] {
  if (!value || typeof value !== 'object') return out;
  if (Array.isArray(value)) {
    for (const v of value) collectCodings(v, out);
    return out;
  }
  const v = value as Record<string, unknown>;
  // Coding shape: has at least one of system/code/display; most robust test is system+code presence
  if (typeof v.system === 'string' && typeof v.code === 'string') {
    out.push(v as Coding);
  }
  for (const key of Object.keys(v)) {
    if (key === 'system' || key === 'code' || key === 'display' || key === 'version') continue;
    collectCodings(v[key], out);
  }
  return out;
}
```

### Wrapping `HumanReadableView`

```typescript
// src/components/explorer/HumanReadableView.tsx (modified)
import { ResourceTable } from '@medplum/react';
import { ScrollArea, Loader, Center } from '@mantine/core';
import type { Resource } from '@medplum/fhirtypes';
import { useResolvedResource } from '../../hooks/useResolvedResource';

export interface HumanReadableViewProps { resource: Resource; }

export function HumanReadableView({ resource }: HumanReadableViewProps) {
  const resolved = useResolvedResource(resource);
  if (!resolved) return <Center p="xl"><Loader size="sm" /></Center>;
  return (
    <ScrollArea h="calc(100vh - 250px)">
      <ResourceTable value={resolved} />
    </ScrollArea>
  );
}
```

### Health probe

```typescript
// src/terminology/health.ts
import type { MedplumClient } from '@medplum/core';

export type TerminologyHealth = 'unknown' | 'ok' | 'unreachable' | 'not-configured';

export async function probeTerminologyHealth(client: MedplumClient | null): Promise<TerminologyHealth> {
  if (!client) return 'not-configured';
  try {
    // `metadata` = CapabilityStatement; cheapest reachability check.
    await client.get('metadata', { signal: AbortSignal.timeout(3000) });
    return 'ok';
  } catch {
    return 'unreachable';
  }
}
```

### Sidebar extension for terminology status

```typescript
// src/components/layout/Sidebar.tsx (diff sketch)
// Existing: one connection dot
// Add: second dot for terminology under the FHIR status dot, using same STATUS_CONFIG pattern:
//   'ok' → green, 'unreachable' → red, 'not-configured' → grey, 'unknown' → pulsing grey
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| Per-request fetch + no cache | Cache-first with promise dedup | ~2020 (React-Query popularized it) | Reduces termserver load by 10-100×; required for large FHIR bundles |
| Hand-rolled `XMLHttpRequest` with CORS hacks | `fetch` + `AbortSignal.timeout` | Baseline-available 2024 | Clean cancellation, no memory leaks |
| Free-text fuzzy display strings | $lookup with `displayLanguage` + `designation` | FHIR R4 (2019) | Locale-aware clinical displays; MII uses this heavily |
| localStorage everywhere | Opt-in with serverUrl namespacing | Post-2022 data-leak awareness | Prevents cache bleed across environments |

**Deprecated / outdated:**
- `fhir.js` / `fhir-kit-client` — unmaintained; `@medplum/core` is the current standard. [CITED: CLAUDE.md "Alternatives Considered"]
- `$expand` for display resolution — was a 2018-era pattern because some servers didn't implement `$lookup`. Modern servers (Ontoserver, tx.fhir.org) all support `$lookup`.

## Runtime State Inventory

**Applicability:** Phase 4 is greenfield feature work (adding a new module), not a rename or migration. Inventory mostly N/A, but documented for completeness.

| Category | Items Found | Action Required |
|----------|-------------|------------------|
| Stored data | None — this phase introduces localStorage caching for the first time. The new key namespace is `terminology-cache:v1:*`. | Document namespace; ensure "Clear terminology cache" action removes all keys matching prefix. |
| Live service config | None — the new terminology server is queried read-only, no state stored on it. | — |
| OS-registered state | None. | — |
| Secrets/env vars | None for the default public Ontoserver. For local MII-mirror deployments, operators may configure reverse-proxy certs outside the app — **out of scope for app config**. | Document as operator concern. |
| Build artifacts | None — no new package being built; only source files added. | — |

## Environment Availability

| Dependency | Required By | Available | Version | Fallback |
|------------|------------|-----------|---------|----------|
| Browser `fetch` | All HTTP calls | ✓ | Native | — |
| `AbortSignal.timeout` | Lookup timeout | ✓ (modern browsers, jsdom 29+) | Native | Manual `AbortController` + `setTimeout` shim |
| localStorage | D-06 cache persistence | ✓ (browsers), ✓ (jsdom) | Native | In-memory only if disabled |
| `https://r4.ontoserver.csiro.au/fhir` (dev default termserver) | Development + CI smoke tests | ✓ | Anonymous, CORS-enabled | `https://tx.fhir.org/r4` as secondary public option |
| `https://terminology.medizininformatik-initiative.de/fhir` (D-01) | Production MII deployments | **✗ from browser** | mTLS-only | Operator-hosted mirror, or Vite proxy termination at their infrastructure layer |

**Missing dependencies with no fallback:** None for development. The MII URL is a documentation/deployment concern, not a code concern — the app configuration already supports any URL.

**Missing dependencies with fallback:** MII termserver direct access → use public Ontoserver for dev and document the production setup pattern.

## Validation Architecture

### Test Framework
| Property | Value |
|----------|-------|
| Framework | Vitest 4.1.4 + jsdom 29 + @testing-library/react 16.3.2 |
| Config file | `vitest.config.ts` (existing, L1-12) |
| Quick run command | `npm test -- src/__tests__/terminology-*.test.ts` |
| Full suite command | `npm test` |

### Phase Requirements → Test Map

| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| TERM-01 | Resolver issues `CodeSystem/$lookup` with `system` + `code` params | unit | `npm test src/__tests__/terminology-resolver.test.ts -- -t "issues lookup"` | Wave 0 |
| TERM-01 | Resolver extracts `display` from `Parameters` response | unit | `npm test src/__tests__/terminology-resolver.test.ts -- -t "extractDisplay"` | Wave 0 |
| TERM-01 | Resolver prefers German `designation` when `displayLanguage=de` | unit | `npm test src/__tests__/terminology-resolver.test.ts -- -t "prefers de designation"` | Wave 0 |
| TERM-01 | `useResolvedResource` enriches `Coding.display` in a real resource | integration | `npm test src/__tests__/resolved-resource.test.tsx -- -t "enriches display"` | Wave 0 |
| TERM-01 | `HumanReadableView` renders resolved German term via `ResourceTable` | component | `npm test src/__tests__/human-readable-view-terminology.test.tsx` | Wave 0 |
| TERM-02 | Second call to same `system|code` hits cache (no second fetch) | unit | `npm test src/__tests__/terminology-cache.test.ts -- -t "cache hit dedup"` | Wave 0 |
| TERM-02 | Parallel calls to same `system|code` share one in-flight Promise | unit | `npm test src/__tests__/terminology-resolver.test.ts -- -t "dedups inflight"` | Wave 0 |
| TERM-02 | Cache persists to localStorage and re-hydrates on boot | unit | `npm test src/__tests__/terminology-cache.test.ts -- -t "localStorage roundtrip"` | Wave 0 |
| TERM-02 | "Clear terminology cache" removes all entries (in-memory and localStorage) | integration | `npm test src/__tests__/settings-clear-cache.test.tsx` | Wave 0 |
| TERM-02 | Cache namespaced by termserver URL prevents cross-server bleed | unit | `npm test src/__tests__/terminology-cache.test.ts -- -t "server url namespace"` | Wave 0 |
| TERM-03 | 404 / OperationOutcome response → display remains unset, no throw | unit | `npm test src/__tests__/terminology-resolver.test.ts -- -t "silent on 404"` | Wave 0 |
| TERM-03 | Network error (mocked) → negative cache entry with TTL, no throw | unit | `npm test src/__tests__/terminology-resolver.test.ts -- -t "silent on network error"` | Wave 0 |
| TERM-03 | Missing `system` or `code` → short-circuit, no fetch | unit | `npm test src/__tests__/terminology-resolver.test.ts -- -t "skips incomplete Coding"` | Wave 0 |
| TERM-03 | `HumanReadableView` with dead termserver still renders raw codes | component | `npm test src/__tests__/human-readable-view-terminology.test.tsx -- -t "fallback to code"` | Wave 0 |
| TERM-03 | `SettingsPage` shows "unreachable" indicator when probe fails | component | `npm test src/__tests__/terminology-health.test.ts -- -t "unreachable"` | Wave 0 |

### Sampling Rate
- **Per task commit:** `npm test -- src/__tests__/terminology-*.test.ts src/__tests__/resolved-resource.test.tsx src/__tests__/human-readable-view-terminology.test.tsx` (fast, <5s)
- **Per wave merge:** `npm test` (full suite — currently ~25 existing test files, adds 5-7 new)
- **Phase gate:** `npm test && npm run lint && npm run build` all green before `/gsd-verify-work`

### Wave 0 Gaps

All phase 4 test files are new. No existing test infrastructure covers terminology behavior.

- [ ] `src/__tests__/terminology-resolver.test.ts` — resolver core: lookup, extractDisplay, dedup, fallback (TERM-01, TERM-02, TERM-03)
- [ ] `src/__tests__/terminology-cache.test.ts` — cache Map, localStorage persistence, server URL namespacing, clear action (TERM-02)
- [ ] `src/__tests__/terminology-context.test.tsx` — `TerminologyProvider` constructs resolver from settings, `useTerminology` throws outside provider
- [ ] `src/__tests__/resolved-resource.test.tsx` — `useResolvedResource` integration with mocked MedplumClient; asserts one fetch per unique code (TERM-01)
- [ ] `src/__tests__/human-readable-view-terminology.test.tsx` — end-to-end component test: given Condition with ICD-10 coding and a mocked successful $lookup, table renders German display; with failed lookup, table renders raw code (TERM-01, TERM-03)
- [ ] `src/__tests__/terminology-health.test.ts` — probe succeeds / fails / times out / not-configured (D-08)
- [ ] `src/__tests__/settings-clear-cache.test.tsx` — clicking "Clear terminology cache" empties Map and removes localStorage keys under prefix
- [ ] Shared fixtures: factor a `mockMedplumClientForTerminology()` helper that returns a client whose `get()` returns a canned `Parameters` response keyed by URL regex. Put in `src/__tests__/fixtures/terminology.ts`.

**Framework install:** None — Vitest 4 + jsdom 29 + testing-library already present. [VERIFIED: package.json L47,45,33]

## Assumptions Log

| # | Claim | Section | Risk if Wrong |
|---|-------|---------|---------------|
| A1 | Typical detail view has <50 unique codes, making per-code `$lookup` acceptable without batch Bundle POST | Patterns §4 | If wrong, first load is slow on rich resources. Mitigation: batching is additive; can be introduced later without changing the public hook API. |
| A2 | jsdom 29 polyfills `AbortSignal.timeout` | Pitfalls §7 | Tests fail locally until shim added. Low risk; shim is trivial. |
| A3 | `displayLanguage=de` is supported by all prospective termservers (MII, Ontoserver, tx.fhir.org) | API §$lookup | If not supported, server returns default display — still correct English, not broken. |
| A4 | `CodeableConcept.coding[i].display` mutation survives through `ResourceTable`'s internal rendering unchanged | Patterns §1 | Verified by reading Medplum source (`formatCoding(c) → c.display ?? c.code`). High confidence. |
| A5 | The phase owner accepts "search result tables show raw codes; detail views show resolved text" as initial scope | Pitfalls §6 | If not, adds a sub-plan to build a custom bundle-fetching search wrapper (significant extra work). Flag for `/gsd-discuss-phase` if revisited. |
| A6 | Operators of MII-mirrored deployments provide their own TLS-termination layer; the SPA does not do mTLS | Environment Availability | Documentation concern. If wrong, we'd need a Vite dev-server proxy config for production, which is unusual. |

## Open Questions (RESOLVED)

All four questions were resolved during discuss-phase and locked as CONTEXT.md decisions D-09 through D-12. Kept here for historical traceability.

1. **Should the search results table show resolved displays too?** (See Pitfall 6) — **RESOLVED (D-09):** Out of scope for v1; SearchControl tables show raw codes. Documented limitation; follow-up phase if dogfood finds the discrepancy jarring.

2. **Should the terminology server URL default in `settings.yaml` be the MII URL or Ontoserver?** — **RESOLVED (D-10):** Ship Ontoserver (`https://r4.ontoserver.csiro.au/fhir`) as the uncommented dev default; MII URL ships as a commented example with an mTLS note. Does not conflict with D-01/D-02 — MII remains a supported destination.

3. **localStorage size management.** — **RESOLVED (D-11):** Bounded LRU — 10,000 entries in-memory, 2,000 mirrored to localStorage. Evict oldest on overflow. "Clear terminology cache" settings action clears both layers.

4. **Should resolution block first paint, or progressively enhance?** — **RESOLVED (D-12):** Progressive enhancement. Render raw code immediately; swap to resolved display when `$lookup` settles. No spinner, no layout shift (reserve line height). The original researcher recommendation to include an inline `<Loader size="xs" />` in ResourceTable was superseded by D-12's no-spinner constraint.

## Sources

### Primary (HIGH confidence)
- `node_modules/@medplum/core/dist/esm/index.d.ts` L1867-1880 — `formatCodeableConcept` / `formatCoding` signatures
- `node_modules/@medplum/core/dist/esm/index.d.ts` L3664-3705 — `MedplumClient.get/post/patch` HTTP helpers
- `node_modules/@medplum/core/dist/esm/index.d.ts` L3975 + L7488-7493 — `valueSetExpand` / `ValueSetExpandParams`
- `node_modules/@medplum/react/dist/esm/index.d.ts` L494-498, L1714-1730 — `CodeableConceptDisplay` and `ResourcePropertyDisplay` shapes
- `node_modules/@medplum/react/dist/esm/index.mjs` grepped — `CodeableConceptDisplay(props){return jsx(Fragment,{children:formatCodeableConcept(props.value)})}` (proves sync/no-lookup behavior)
- `node_modules/@medplum/fhirtypes/dist/CodeableConcept.d.ts`, `Coding.d.ts` — type shapes
- `src/fhir/client.ts`, `src/contexts/ConnectionContext.tsx`, `src/config/settings.ts`, `src/App.tsx`, `src/components/explorer/HumanReadableView.tsx`, `public/settings.yaml`, `vitest.config.ts` — existing project patterns
- [HL7 FHIR R4 CodeSystem $lookup Operation](https://hl7.org/fhir/R4/codesystem-operation-lookup.html) — input/output parameter definitions, designation structure
- [CSIRO Ontoserver 6.23 API docs](https://ontoserver.csiro.au/docs/6.23.0/api-fhir.html) — $lookup, $translate, CORS behavior
- `https://r4.ontoserver.csiro.au/fhir/metadata` (fetched 2026-04-12) — confirmed $lookup/$translate supported, `cors: true`, anonymous access

### Secondary (MEDIUM confidence)
- [MII SU-TermServ public site](https://mii-termserv.de/en/) — establishes mTLS auth requirement for MII termserver
- [MII SU-TermServ FAQ](https://mii-termserv.de/en/faq/) — Ontoserver+DFN cert auth
- [MII Firefox-blank-pages FAQ](https://mii-termserv.de/en/faq/firefox-blank-pages/) — browser cert forwarding issues confirming the mTLS-in-browser friction
- [Medplum CodeSystem $lookup docs](https://www.medplum.com/docs/api/fhir/operations/codesystem-lookup) — Medplum's view of the operation
- [HL7 Public Test Servers](https://confluence.hl7.org/display/FHIR/Public+Test+Servers) — tx.fhir.org as secondary public option

### Tertiary (LOW confidence)
- [Ontoserver Postman collection](https://documenter.getpostman.com/view/145584/SWTD6wPM) — example requests, not verified end-to-end
- [Medblocks "What is a FHIR Terminology Service" blog](https://medblocks.com/blog/terminologies-in-fhir) — general background

## Metadata

**Confidence breakdown:**
- Medplum render pipeline (where to inject resolution) — **HIGH** — read dist source directly
- `$lookup` request/response shape — **HIGH** — FHIR R4 spec is canonical and verified
- MII termserver accessibility — **HIGH** — multiple primary sources consistently say mTLS-only
- Caching/dedup approach — **HIGH** — standard pattern, well-understood
- Batching decision (defer to Promise.all + dedup) — **MEDIUM** — reasonable default, may need revisit if profiling flags it
- `displayLanguage=de` support across servers — **MEDIUM** — HL7 spec standard, but some servers silently ignore it

**Research date:** 2026-04-12
**Valid until:** 2026-05-12 (30 days — terminology landscape is stable; revisit if termserver infrastructure changes)
