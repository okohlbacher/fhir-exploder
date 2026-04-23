# Project Research Summary

**Project:** FHIR Exploder
**Domain:** FHIR Server Explorer / Browser (read-only, local-first SPA)
**Researched:** 2026-04-11
**Confidence:** MEDIUM

## Executive Summary

FHIR Exploder is a read-only, local-first React SPA for exploring and auditing data on a Blaze FHIR R4 server, with specific focus on MII Kerndatensatz profiles and German clinical terminology. The recommended stack centers on Medplum's React component ecosystem (@medplum/core, @medplum/react, @medplum/fhirtypes v5.1.7), which provides battle-tested FHIR-aware UI components (ResourceTable, CodeableConceptDisplay, PatientSummary, etc.) and typed FHIR data hooks. Mantine 8 is a mandatory peer dependency of Medplum and serves as the sole design system -- no additional CSS framework should be added. Vite 8 is the build tool, React 18 is the runtime, and react-router-dom v7 handles client-side routing across three primary entry points: patient browser, resource explorer, and data quality dashboard.

The single largest architectural risk is the coupling between MedplumClient and the Medplum backend. While MedplumClient exposes `baseUrl` and `fhirUrlPath` options for pointing at non-Medplum servers like Blaze, many Medplum React components internally call `useMedplum()` to fetch data, which may invoke Medplum-specific API behaviors. The recommended mitigation is to audit every Medplum component during Phase 1 for internal fetch calls, use components purely as renderers where possible, and build a compatibility matrix before committing to the component strategy. If MedplumClient integration proves too tightly coupled, the fallback is a thin custom FHIR client with `fetch()` -- but this should be a last resort since it forfeits the hook ecosystem.

Secondary risks include CORS blocking (solved by Vite dev proxy from day one), Blaze's opaque cursor-based pagination (design Next/Previous UI, not page-number jumps), terminology server rate limiting (aggressive caching + progressive enhancement pattern), and the rabbit hole of client-side MII profile validation (use server-side `$validate` instead). The project has a clear feature dependency chain: server connection -> CapabilityStatement -> resource browsing -> patient-centric views -> terminology resolution -> data quality dashboard. This chain should directly inform phase structure.

## Key Findings

### Recommended Stack

The stack is anchored by the Medplum FHIR ecosystem (v5.1.7, all four packages version-locked) running on React 18 with Mantine 8. This is not a mix-and-match decision -- Medplum React requires Mantine as a peer dependency, so the UI framework choice is made for us. The good news is that Mantine is excellent (clean API, strong TypeScript support, comprehensive component set).

**Core technologies:**
- **React 18.3.1**: UI framework -- stable, avoids unnecessary React 19 risk for a read-only tool
- **@medplum/core + fhirtypes + react + react-hooks 5.1.7**: FHIR client, R4 types, FHIR-aware components, data hooks -- version-locked, must all match
- **Mantine 8.3.18**: UI component library -- required peer of @medplum/react, serves as sole design system
- **Vite 8**: Build/dev server -- fast HMR, proxy support for CORS, no SSR needed
- **react-router-dom 7.x**: Routing -- 3-route app, URL-driven search state
- **js-yaml 4.x**: Settings file parsing -- lightweight, no-dependency YAML parser
- **TypeScript 5.7**: Type safety -- required for @medplum/fhirtypes value; pin to 5.x to avoid TS 6.x edge cases

**Do not add:** Tailwind (conflicts with Mantine), react-query (competes with Medplum's cache), Redux/Zustand (unnecessary), Next.js (no SSR needed), Mantine 9 (React 19 only).

### Expected Features

**Must have (table stakes):**
- T1: Server connection configuration (URL, auth mode, settings.yaml)
- T2: CapabilityStatement discovery (drives available resource types and search params)
- T3: Resource type listing with counts
- T4: Resource search with parameters (auto-generated from CapabilityStatement)
- T5: Bundle pagination (cursor-based next/prev)
- T6: JSON display (pretty-printed, syntax highlighted)
- T7: Human-readable resource display (Medplum rendering components)
- T8: Patient list with search (name, identifier, birthDate)
- T9: Patient detail with clinical data organized by category
- T10: Clickable cross-references between resources
- T11: Error handling for server unavailability
- T12: Loading states and feedback

**Should have (differentiators):**
- D1: MII Kerndatensatz module navigation (Diagnose, Prozedur, Laborbefund, etc.)
- D2: Terminology resolution via MII Terminology Server ($lookup/$translate)
- D3: Data quality dashboard (counts, completeness, coding coverage)
- D5: Three-mode resource rendering (human-readable, clinical+raw split, developer/structure)
- D10: _include/_revinclude for efficient patient queries

**Defer (v2+):**
- D4: Profile validation (complex; use server-side $validate if available)
- D6: Clinical timeline view (high complexity, depends on stable browsing)
- D9: Bulk terminology pre-resolution (optimization, not required for usability)

### Architecture Approach

The app follows a provider-tree architecture: SettingsProvider (loads settings.yaml) -> FhirClientProvider (creates MedplumClient, wraps in MedplumProvider) -> TerminologyProvider (separate client for MII Terminology Server with LRU cache) -> React Router -> Page components. Two separate MedplumClient instances serve Blaze (primary data) and the MII Terminology Server (code display resolution). Search state lives in URL params for browser navigation and shareability. MII module configuration is a static registry mapping German clinical domain names to FHIR resource types and profile URLs.

**Major components:**
1. **SettingsProvider** -- loads settings.yaml, exposes config via context; everything depends on this
2. **FhirClientProvider** -- creates MedplumClient pointed at Blaze, handles auth modes (open/basic/bearer)
3. **TerminologyProvider** -- separate client for MII Terminology Server, LRU cache, progressive enhancement pattern
4. **MiiModuleRegistry** -- static mapping of MII modules (Person, Fall, Diagnose, Prozedur, Laborbefund, Medikation, Consent) to FHIR types + profile URLs
5. **PatientBrowser** -- patient list + detail with MII module tabs
6. **ResourceExplorer** -- generic resource type browsing with CapabilityStatement-driven search
7. **QualityDashboard** -- resource counts via _summary=count, sample-based field completeness, coding coverage

### Critical Pitfalls

1. **MedplumClient assumes Medplum backend** -- Many Medplum React components fetch data internally via `useMedplum()`, which may invoke Medplum-specific API paths. Audit every component's source for internal fetch calls before using it. Build a compatibility matrix in Phase 1.
2. **CORS blocks browser-to-Blaze requests** -- Different ports = different origins. Configure Vite dev proxy (`/fhir -> localhost:8080`) immediately. Plan reverse proxy for production deployment.
3. **Blaze pagination is cursor-based, not offset-based** -- Cannot jump to arbitrary pages. Design Next/Previous UI with cached visited-page links. Display total from Bundle.total but do not promise page jumps.
4. **Terminology server rate limiting and latency** -- Naive per-CodeableConcept $lookup creates request storms. Cache aggressively (LRU in-memory), render raw codes first then enhance asynchronously, set 2-3s timeouts.
5. **Credentials in settings.yaml** -- Add settings.yaml to .gitignore from day one. Ship settings.example.yaml. Support environment variable overrides for sensitive values.

## Implications for Roadmap

### Phase 1: Foundation and Blaze Connectivity
**Rationale:** Everything depends on connecting to Blaze and confirming Medplum components work against a non-Medplum server. This is the highest-risk phase -- if MedplumClient integration fails, the architecture pivots.
**Delivers:** Working connection to Blaze, app shell with routing, settings management, validated Medplum component compatibility matrix.
**Addresses:** T1 (server connection), T2 (CapabilityStatement), T11 (error handling), T12 (loading states)
**Avoids:** Pitfall 1 (MedplumClient coupling), Pitfall 5 (CORS), Pitfall 10 (credentials in settings.yaml), Pitfall 14 (production proxy planning)
**Gate:** Can we render a Patient resource from Blaze using Medplum components?

### Phase 2: Resource Explorer
**Rationale:** Generic resource browsing validates the core data flow (search -> paginate -> display -> navigate references) before adding patient-centric complexity. This phase exercises every architectural layer.
**Delivers:** Browse any resource type, search with CapabilityStatement-driven parameters, paginate results, view resources in JSON and human-readable modes, click references to navigate.
**Addresses:** T3 (resource listing), T4 (search), T5 (pagination), T6 (JSON display), T7 (human-readable display), T10 (cross-references), D5 (three-mode rendering)
**Avoids:** Pitfall 3 (cursor pagination), Pitfall 4 (large bundles), Pitfall 11 (sort limitations), Pitfall 13 (Bundle.total absent)

### Phase 3: Patient-Centric Browsing and MII Modules
**Rationale:** Patient-centric views are the core value proposition but depend on resource display being stable. MII module navigation is the primary differentiator and belongs here.
**Delivers:** Patient list, patient detail with MII module tabs (Diagnose, Prozedur, Laborbefund, etc.), per-module resource queries.
**Addresses:** T8 (patient list), T9 (patient detail), D1 (MII module navigation), D10 (_include/_revinclude)
**Avoids:** Pitfall 8 (_include limitations -- use per-type queries as primary strategy)

### Phase 4: Terminology Resolution
**Rationale:** Terminology makes the app truly usable for clinicians and data managers (showing "Diabetes mellitus Typ 2" instead of "E11.9"), but the app is functional without it. Separating this into its own phase contains the complexity of caching, rate limiting, and CodeableConcept resolution logic.
**Delivers:** MII Terminology Server integration, $lookup/$translate, LRU cache, progressive enhancement display pattern.
**Addresses:** D2 (terminology resolution), D9 (bulk resolution, partial)
**Avoids:** Pitfall 6 (rate limiting), Pitfall 7 (CodeableConcept complexity), Pitfall 15 (German system URIs)

### Phase 5: Data Quality Dashboard
**Rationale:** Quality metrics depend on stable resource browsing and MII module definitions. This is high value but architecturally independent -- it can be built in parallel with Phase 4 if resources allow.
**Delivers:** Resource counts per type, field completeness heatmap (sample-based), coding coverage metrics, optional lightweight profile conformance checks.
**Addresses:** D3 (quality dashboard), D7 (field completeness), D8 (coding coverage)
**Avoids:** Pitfall 9 (full validation rabbit hole -- use server-side $validate or lightweight checks only)

### Phase Ordering Rationale

- Foundation must come first because every other phase depends on a working Blaze connection and validated Medplum compatibility.
- Resource Explorer before Patient Browser because generic browsing is simpler, validates the full data flow, and de-risks Medplum component integration.
- Patient-centric views before terminology because the patient browser is the primary UX and is usable with raw codes.
- Terminology separated from patient browsing to contain its unique complexity (caching, rate limiting, German code systems).
- Quality dashboard last because it depends on both stable browsing and MII module definitions, and is the most independent feature.

### Research Flags

Phases likely needing deeper research during planning:
- **Phase 1:** Medplum component compatibility with Blaze is the biggest unknown. Requires hands-on testing, not just documentation review. Budget time for component auditing and potential fallback to custom FHIR client.
- **Phase 3:** MII profile canonical URLs need validation against current published IGs. The module-to-resource-type mapping is solid but exact profile URLs may have changed.
- **Phase 4:** MII Terminology Server rate limits, supported operations ($lookup, $translate, $expand), and latency characteristics need runtime validation.
- **Phase 5:** Blaze $validate support and loaded profile availability need verification.

Phases with standard patterns (skip deep research):
- **Phase 2:** Resource browsing with FHIR search, pagination, and JSON display follows well-documented FHIR patterns. Mantine table/tab components are straightforward.

## Confidence Assessment

| Area | Confidence | Notes |
|------|------------|-------|
| Stack | HIGH | All versions verified via npm registry; dependency graph confirmed; peer dependencies validated |
| Features | MEDIUM | Feature landscape based on training knowledge of FHIR tools; competitive analysis could not be web-verified |
| Architecture | MEDIUM | MedplumClient fhirUrlPath option confirmed from type defs; actual Blaze compatibility needs runtime validation |
| Pitfalls | MEDIUM-HIGH | CORS, pagination, large bundles, credentials are HIGH confidence; MedplumClient coupling and terminology server behavior are MEDIUM |

**Overall confidence:** MEDIUM -- The stack is solid and well-verified. The architecture is sound in theory but depends on a critical assumption (MedplumClient works adequately against Blaze) that can only be validated by building Phase 1.

### Gaps to Address

- **MedplumClient vs. Blaze compatibility:** Must be validated in Phase 1 with hands-on testing. No amount of documentation review replaces actually rendering Blaze data through Medplum components.
- **Basic auth handling:** MedplumClient is OAuth-oriented. Basic auth support (needed for some Blaze deployments) may require a custom fetch wrapper. Investigate in Phase 1.
- **MII profile canonical URLs:** The module registry's profile URLs are based on training data and may be outdated. Validate against https://simplifier.net/organization/koordinationsstellemii during Phase 3 planning.
- **MII Terminology Server behavior:** Rate limits, supported operations, and response latency are unknown. Test with real queries during Phase 4.
- **Blaze $validate support:** Whether Blaze supports $validate with loaded MII profiles needs verification before committing to the quality dashboard's validation feature.
- **SearchControl component:** This is Medplum's most powerful component for resource browsing but is the most likely to have Medplum-specific internal behavior. May need to be replaced with a custom search UI built on lower-level Medplum components.

## Sources

### Primary (HIGH confidence)
- npm registry -- all package versions, peer dependencies, dependency graphs (verified 2026-04-11)
- @medplum/core v5.1.7 TypeScript declarations -- MedplumClientOptions interface, baseUrl/fhirUrlPath options
- @medplum/react v5.1.7 TypeScript declarations -- component exports, hook signatures
- FHIR R4 specification -- pagination, search, CodeableConcept, Bundle structure
- German FHIR system URIs (fhir.de) -- ICD-10-GM, OPS, ATC canonical URLs

### Secondary (MEDIUM confidence)
- Medplum React component behavior against non-Medplum servers -- inferred from API surface and documentation
- Blaze FHIR server capabilities -- based on training data, may have improved in recent versions
- MII Kerndatensatz module structure -- based on training data of MII profile ecosystem

### Tertiary (LOW confidence)
- MII profile canonical URLs -- may have changed across IG versions; validate during implementation
- MII Terminology Server rate limits and latency -- assumed similar to other public FHIR terminology servers
- Blaze $validate operation support -- needs runtime verification

---
*Research completed: 2026-04-11*
*Ready for roadmap: yes*
