# Feature Landscape

**Domain:** FHIR Server Explorer / Browser (read-only, local-first)
**Researched:** 2026-04-11
**Confidence:** MEDIUM (based on training knowledge of FHIR ecosystem tools; web verification unavailable)

## Existing Tool Landscape

Before categorizing features, here is what the competition does:

### HAPI FHIR Web Tester
- Generic CRUD operations against any resource type
- Dropdown of resource types from CapabilityStatement
- Search parameter forms auto-generated from search parameter definitions
- Raw JSON/XML view of responses
- Pagination via Bundle links
- No patient-centric view, no quality dashboards, no terminology resolution
- Developer-oriented, not clinician-friendly

### Firely Terminal (CLI)
- Command-line FHIR operations (get, search, put, post, delete)
- Profile validation via `fhir validate`
- Snapshot generation, package management
- Bulk operations on resource sets
- No GUI, no dashboards, no patient browsing

### Simplifier.net
- Web-based profile/IG browsing and editing
- Resource rendering with narrative display
- Dependency visualization between profiles
- Not a server explorer -- focuses on conformance resources (StructureDefinition, ValueSet)

### Inferno
- Automated FHIR conformance test suites (US Core, Bulk Data, SMART)
- Test runner with pass/fail reporting
- Request/response logging
- Not an exploration tool -- focuses on server conformance testing

### Blaze UI (built-in)
- Minimal resource browser at /fhir/__admin
- Resource counts per type
- Individual resource retrieval
- Very basic, no search parameter support

**Key gap this project fills:** None of these tools combine patient-centric clinical browsing, MII-specific profile navigation, terminology resolution, AND data quality auditing in a single GUI. The closest is HAPI FHIR Tester, but it is purely developer-oriented with no clinical lens.

---

## Table Stakes

Features users expect from any FHIR exploration tool. Missing = product feels incomplete.

| # | Feature | Why Expected | Complexity | Notes |
|---|---------|--------------|------------|-------|
| T1 | **Server connection configuration** | Cannot use the tool without it | Low | URL, auth mode (open/basic/bearer), persistence in settings.yaml |
| T2 | **CapabilityStatement discovery** | Every FHIR tool reads /metadata first; drives what's available | Low | Parse supported resource types, search params, operations |
| T3 | **Resource type listing** | Fundamental navigation unit in FHIR | Low | List from CapabilityStatement, show count per type |
| T4 | **Resource search with parameters** | FHIR's native interaction; users expect parameterized search | Medium | Auto-generate search forms from CapabilityStatement search params |
| T5 | **Bundle pagination** | Large datasets are unusable without it | Medium | Follow Bundle.link next/prev/self; support _count parameter |
| T6 | **Individual resource display (JSON)** | Developers need raw FHIR | Low | Pretty-printed JSON with syntax highlighting |
| T7 | **Individual resource display (human-readable)** | Clinicians and data managers need readable views | Medium | Medplum ResourceTable/resource components handle most of this |
| T8 | **Patient list with basic search** | Patient is the primary clinical anchor | Medium | Search by name, identifier, birthDate; display demographics |
| T9 | **Patient detail / clinical data view** | Core value proposition of patient-centric browsing | High | Organized by resource type or clinical category; linked resources |
| T10 | **Resource cross-references / navigation** | FHIR is a graph; references must be clickable | Medium | Click Reference fields to navigate to target resource |
| T11 | **Error handling for unavailable servers** | Connection failures are common in local dev | Low | Graceful error states, retry, clear messaging |
| T12 | **Loading states and feedback** | Large queries take time | Low | Spinners, progress indicators, skeleton screens |

## Differentiators

Features that set FHIR Exploder apart. Not expected from generic tools, but high-value for MII use cases.

| # | Feature | Value Proposition | Complexity | Notes |
|---|---------|-------------------|------------|-------|
| D1 | **MII Kerndatensatz module navigation** | Navigate by clinical domain (Diagnose, Prozedur, Laborbefund, etc.) instead of raw FHIR types | Medium | Maps MII modules to FHIR resource types + profiles; optional lens alongside raw browsing |
| D2 | **Terminology resolution (CodeableConcept display)** | Show "Diabetes mellitus Typ 2" instead of "E11.9" -- makes data actually readable | Medium | $lookup/$translate against MII Terminology Server; graceful fallback to raw code |
| D3 | **Data quality dashboard** | Answers "what's actually in this server?" at a glance | High | Resource counts, field completeness %, coding coverage, missing required fields |
| D4 | **Profile validation display** | Shows whether resources conform to MII profiles; critical for data quality work | High | Validate against MII StructureDefinitions; display issues per resource or in aggregate |
| D5 | **Three-mode resource rendering** | Human-readable (default), clinical+raw toggle, FHIR-structure view -- serves different user personas | Medium | Medplum components for human view; custom tree for structure view; JSON for raw |
| D6 | **Clinical timeline view per patient** | Temporal view of encounters, conditions, procedures -- tells the patient story | High | Chronological ordering of clinical events; grouped by encounter or date |
| D7 | **Field completeness heatmap** | Visual indicator of which fields are populated across resources of a type | Medium | Sample or scan resources, compute fill rates per field path |
| D8 | **Coding coverage metrics** | What % of CodeableConcepts have system+code vs. just text? | Medium | Aggregation across resource instances; breakdown by coding system |
| D9 | **Bulk terminology resolution** | Pre-resolve common codes on first load for snappy display | Medium | Cache $lookup results; batch where API supports it |
| D10 | **_include / _revinclude support** | Fetch related resources in one query (e.g., Patient + all Conditions) | Medium | Critical for efficient patient-centric views; reduces round trips |

## Anti-Features

Features to deliberately NOT build. These would bloat scope, conflict with read-only design, or duplicate existing tools.

| Anti-Feature | Why Avoid | What to Do Instead |
|--------------|-----------|-------------------|
| **Write operations (create/update/delete)** | Read-only explorer by design; write tools exist (Postman, Firely Terminal, HAPI Tester) | Link to raw FHIR endpoint URL for users who need to edit |
| **SMART on FHIR launch / OAuth2 flow** | Local tool against local Blaze; SMART adds massive complexity for no value here | Support simple auth (open/basic/bearer) which covers Blaze deployments |
| **Multi-server simultaneous browsing** | Multiplies complexity; unclear user value for a local exploration tool | One connection at a time; easy to switch via settings |
| **Full conformance test suite (Inferno-style)** | Inferno exists; duplicating it is a months-long project | Offer per-resource profile validation, not suite-level testing |
| **IG authoring / profile editing** | Simplifier and FSH/SUSHI exist for this | Read-only profile browsing at most |
| **Data export / ETL pipeline** | Different tool category entirely; scope creep risk | Show data, don't move it |
| **Custom query language / GraphQL** | Over-engineering; FHIR search parameters are sufficient for exploration | Stick to standard FHIR REST search |
| **User accounts / multi-user auth** | Local-only tool; adds infrastructure for zero value | No login, no sessions |
| **Mobile-responsive design** | Nobody explores FHIR servers on a phone; desktop-only is fine | Optimize for 1200px+ screens |
| **Internationalization (i18n)** | MII context is German-language domain; English UI is fine for developer/data manager audience | Use English UI; German clinical terms come from terminology server naturally |

## Feature Dependencies

```
T1 (Server connection) --> T2 (CapabilityStatement) --> T3 (Resource type listing)
T3 --> T4 (Search with parameters)
T4 --> T5 (Pagination)
T4 --> T6 (JSON display)
T4 --> T7 (Human-readable display)
T6 + T7 --> D5 (Three-mode rendering)
T3 --> T8 (Patient list)
T8 --> T9 (Patient detail)
T9 --> D6 (Clinical timeline)
T9 --> D1 (MII module navigation)
T6 | T7 --> T10 (Cross-references)
T7 --> D2 (Terminology resolution)
D2 --> D9 (Bulk terminology resolution)
T3 --> D3 (Data quality dashboard)
D3 --> D7 (Field completeness heatmap)
D3 --> D8 (Coding coverage metrics)
T2 --> D4 (Profile validation)
T4 --> D10 (_include/_revinclude)
D10 --> T9 (Patient detail -- more efficient with _include)
```

**Critical path:** T1 -> T2 -> T3 -> T4 -> T5 forms the foundation. Everything else branches from there.

## MVP Recommendation

### Phase 1: Foundation (must ship first)
1. **T1** Server connection + settings.yaml
2. **T2** CapabilityStatement parsing
3. **T3** Resource type listing with counts
4. **T4** Basic search (at minimum: _id, name/identifier for Patient, a few key params per type)
5. **T5** Pagination
6. **T6** JSON display
7. **T11** Error handling
8. **T12** Loading states

### Phase 2: Clinical Browsing
1. **T7** Human-readable rendering (Medplum components)
2. **T8** Patient list
3. **T9** Patient detail view
4. **T10** Cross-reference navigation
5. **D5** Three-mode rendering toggle

### Phase 3: MII-Specific Value
1. **D1** MII Kerndatensatz module navigation
2. **D2** Terminology resolution
3. **D10** _include/_revinclude for efficient patient queries

### Phase 4: Quality & Validation
1. **D3** Data quality dashboard (resource counts, basic stats)
2. **D7** Field completeness
3. **D8** Coding coverage
4. **D4** Profile validation

### Defer (nice-to-have)
- **D6** Clinical timeline: High complexity, can come after core browsing works
- **D9** Bulk terminology resolution: Optimization, not required for v1

**Rationale:** Foundation must exist before anything clinical. Clinical browsing is the core value prop and should come immediately after. MII-specific features are the differentiator but depend on clinical browsing. Quality/validation is high value but independent and can be built in parallel with MII features or after.

## Complexity Budget

| Complexity | Count | Features |
|------------|-------|----------|
| Low | 5 | T1, T3, T6, T11, T12 |
| Medium | 11 | T2, T4, T5, T7, T8, T10, D1, D2, D5, D7, D8, D9, D10 |
| High | 4 | T9, D3, D4, D6 |

**Total estimated effort:** The Medium features are the bulk. T9 (patient detail) and D3 (quality dashboard) are the two biggest individual pieces.

## Sources

- Training knowledge of HAPI FHIR, Firely Terminal, Simplifier, Inferno, Blaze (MEDIUM confidence -- based on pre-2025 knowledge, unable to verify current state via web)
- PROJECT.md requirements and constraints (HIGH confidence -- direct source)
- FHIR R4 specification knowledge for search parameters, Bundle pagination, CapabilityStatement (HIGH confidence -- stable spec)
- MII Kerndatensatz module structure (MEDIUM confidence -- based on training data of MII profile structure)
