# Phase 4: Terminology Resolution - Context

**Gathered:** 2026-04-11
**Status:** Ready for planning

<domain>
## Phase Boundary

Integrate the MII Terminology Server to resolve CodeableConcept display values throughout the app — replacing raw codes (e.g., "E11.9") with human-readable terms (e.g., "Diabetes mellitus Typ 2"). Implement caching for resolved values and graceful fallback when the terminology server is unavailable.

</domain>

<decisions>
## Implementation Decisions

### Terminology Server Integration
- **D-01:** [auto] Use the MII Terminology Server at `https://terminology.medizininformatik-initiative.de/fhir` for $lookup and $translate operations on CodeableConcepts.
- **D-02:** [auto] Terminology server URL configurable in settings.yaml alongside the FHIR server URL.

### Resolution Strategy
- **D-03:** [auto] Resolve CodeableConcepts by first checking if a `display` value already exists on the resource. If not, call $lookup on the terminology server using the `system` and `code`. Fall back to raw code if lookup fails.
- **D-04:** [auto] Resolution happens transparently — components that display CodeableConcepts automatically attempt resolution. No manual user action required.

### Caching
- **D-05:** [auto] In-memory cache for resolved terminology values within the browser session. Cache keyed by system+code pair.
- **D-06:** [auto] Optional localStorage persistence for the cache so resolved values survive page reloads. Cache invalidation via a "Clear terminology cache" action in settings.

### Graceful Degradation
- **D-07:** [auto] When the terminology server is unreachable, display the raw code value (system|code) without errors or broken UI. No error toast — silent fallback with a subtle indicator (e.g., monospace font or tooltip "unresolved code").
- **D-08:** [auto] Terminology server health check on app connect — show terminology server status alongside FHIR server status in the sidebar indicator.

### Resolved post-research (locked)
- **D-09:** [user] v1 scope: resolve CodeableConcepts in **detail/clinical views only** (HumanReadableView, ClinicalRawView). SearchControl tables show raw codes in v1 — documented limitation, not a bug. Table enrichment deferred to a follow-up phase.
- **D-10:** [user] Dev default terminology server: `https://r4.ontoserver.csiro.au/fhir` (public, CORS-enabled, FHIR R4 $lookup). MII URL `https://terminology.medizininformatik-initiative.de/fhir` ships in `public/settings.yaml` as a commented example with an mTLS note.
- **D-11:** [user] Cache policy: bounded LRU — 10,000 entries in-memory, 2,000 entries mirrored to localStorage. Evict oldest on overflow. "Clear terminology cache" settings action clears both layers.
- **D-12:** [user] Resolution UX: progressive enhancement. Render raw code immediately; swap to resolved display text when $lookup resolves. No spinner, no layout shift (reserve line height).

### Claude's Discretion
- Batch vs individual resolution strategy for lists of resources (researcher recommends sequential with in-flight dedup for v1; revisit with profiling data)
- Whether to prefetch common code systems on connect

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Project Documentation
- `.planning/PROJECT.md` — Terminology server context, graceful degradation constraint
- `.planning/REQUIREMENTS.md` — TERM-01 through TERM-03 requirements for this phase
- `.planning/ROADMAP.md` — Phase 4 success criteria and dependencies
- `CLAUDE.md` — MedplumClient valueSetExpand(), CodeableConceptDisplay component

### Prior Phase Context
- `.planning/phases/01-foundation-blaze-connectivity/01-CONTEXT.md` — Settings.yaml structure, connection flow
- `.planning/phases/02-resource-explorer/02-CONTEXT.md` — Display modes where CodeableConcepts appear

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- Medplum's CodeableConceptDisplay component for rendering coded values
- MedplumClient for HTTP requests to the terminology server
- Settings infrastructure from Phase 1 for terminology server URL

### Established Patterns
- MedplumClient for FHIR operations (from Phase 1)
- Resource rendering pipeline (from Phase 2) where CodeableConcepts appear

### Integration Points
- CodeableConceptDisplay throughout all resource views (Explorer, Patient detail, Quality dashboard)
- Settings.yaml for terminology server URL configuration
- Connection status indicator extended for terminology server health

</code_context>

<specifics>
## Specific Ideas

No specific requirements — open to standard approaches within the decisions captured above.

</specifics>

<deferred>
## Deferred Ideas

None — discussion stayed within phase scope.

</deferred>

---

*Phase: 04-terminology-resolution*
*Context gathered: 2026-04-11*
