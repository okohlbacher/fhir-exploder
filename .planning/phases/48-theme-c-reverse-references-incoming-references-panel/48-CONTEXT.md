# Phase 48: Theme C — Reverse References / Incoming-References Panel - Context

**Gathered:** 2026-05-01
**Status:** Ready for planning
**Mode:** `--auto` (Claude selected the recommended option for every gray area; see DISCUSSION-LOG.md for the full audit trail)

<domain>
## Phase Boundary

**In scope (Phase 48):**
- Curated reverse-reference catalog `src/utils/reverseReferenceCatalog.ts` exporting a typed const that maps each covered "currently-viewed" resource type → array of `{ type, param }` pairs for resources that reference it (REVR-01).
- New `<IncomingReferencesPanel resource={r}>` component rendered at the bottom of `ResourceDetailPage.tsx` for every non-Patient resource. Counts fetched via parallel `?{param}={ref}&_summary=count&_count=0` queries against the catalog (REVR-02).
- Generalize the existing `PatientRelatedResources` so both it and `IncomingReferencesPanel` render through a single shared `<RelatedResourcesPanel>` component — two thin wrappers, one render path (REVR-03). Patient detail UX must show zero regression.
- Tests for catalog shape, parallel count fetch + card render, and the shared-component invariant.

**Out of scope (deferred to later phases):**
- The G1 reference graph view (Phase 49) — consumes this catalog but is its own phase.
- "Peek JSON" action on cards (design handoff §197) — depends on the JSON peek drawer phase, not yet scheduled. Cards stay click-to-navigate-only in v1.
- The 4-mode resource shell (`Summary | Human | Graph | JSON`) — Phase 47 explicitly preserved the existing `<Tabs>`, and Phase 48 inherits that. The IncomingReferencesPanel mounts below the Tabs container regardless of which tab is active.
- CapabilityStatement-driven runtime catalog discovery — explicitly deferred per REQUIREMENTS.md §"Deferred to Future Milestones".
- Card subtitle / top-referencer summary preview — defer to a polish phase if/when the UX feedback asks for it.
- IconStrip / per-card icon design system — reuse existing emoji icons for Patient entries; non-Patient catalog entries get an optional icon field that may be left undefined in v1.

</domain>

<decisions>
## Implementation Decisions

### Catalog Shape & Scope

- **D-01 (file location):** Catalog lives at `src/utils/reverseReferenceCatalog.ts` — matches the REQUIREMENTS.md REVR-01 wording verbatim and follows the existing `src/utils/` convention (peer of `summarizeResource.ts`, `fhir-helpers.ts`).
- **D-02 (entry value shape):** Each catalog entry exports as
  ```ts
  type ReverseReferenceEntry = { type: ResourceType; param: string; icon?: string };
  type ReverseReferenceCatalog = Partial<Record<ResourceType, ReverseReferenceEntry[]>>;
  ```
  Exported as a `const` (typed, frozen) for static analysis. `icon` is an optional emoji/string the card renderer falls back to neutral text if missing.
- **D-03 (catalog coverage — 9 source-type keys):**
  1. **Patient** — re-exported from the existing 11-entry list inside `PatientRelatedResources.tsx` (Condition, Procedure, Observation, Encounter, MedicationStatement, MedicationRequest, DiagnosticReport, ImagingStudy, AllergyIntolerance, Immunization, Consent — all via `param: 'patient'`). Move the array out of the component into the catalog so `PatientRelatedResources` consumes it, NOT duplicates it.
  2. **Observation** — `{ DiagnosticReport, param: 'result' }`, `{ Observation, param: 'has-member' }`, `{ Observation, param: 'derived-from' }`, `{ Provenance, param: 'target' }`.
  3. **Condition** — `{ Encounter, param: 'reason-reference' }`, `{ Procedure, param: 'reason-reference' }`, `{ MedicationStatement, param: 'reason-reference' }`, `{ Provenance, param: 'target' }`.
  4. **Encounter** — `{ Observation, param: 'encounter' }`, `{ Condition, param: 'encounter' }`, `{ Procedure, param: 'encounter' }`, `{ DiagnosticReport, param: 'encounter' }`, `{ MedicationStatement, param: 'context' }`, `{ MedicationRequest, param: 'encounter' }`.
  5. **MedicationStatement** — `{ Provenance, param: 'target' }` (most M-Statements are leaf nodes; minimal entry is acceptable, panel auto-hides when empty per D-12).
  6. **Procedure** — `{ DiagnosticReport, param: 'based-on' }`, `{ Provenance, param: 'target' }`.
  7. **DiagnosticReport** — `{ Observation, param: 'has-member' }`, `{ Provenance, param: 'target' }`.
  8. **AllergyIntolerance** — `{ Provenance, param: 'target' }`.
  9. **Practitioner** — `{ Encounter, param: 'practitioner' }`, `{ Procedure, param: 'performer' }`, `{ Observation, param: 'performer' }`, `{ DiagnosticReport, param: 'performer' }`, `{ Condition, param: 'asserter' }`.

  Researcher MUST verify each `{type, param}` pair against the FHIR R4 SearchParameter registry (the "Searches the resource via this param" check) and adjust for any that don't exist. The 9 source-type list itself is locked; entries inside each may be tuned by the researcher with explicit notes in 48-RESEARCH.md.

### Component Architecture

- **D-04 (shared render component — extracted):** Create `src/components/explorer/RelatedResourcesPanel.tsx` whose props are
  ```ts
  type RelatedResourcesPanelProps = {
    title: string;                // e.g. "Related Resources" or "Referenced By"
    entries: ReverseReferenceEntry[];
    refValue: string;             // the `{ResourceType}/{id}` string used in queries + the navigate target query string
    onCardNavigate: (entry: ReverseReferenceEntry) => string;  // returns the route to push when clicked
  };
  ```
  This component owns: the `useEffect` that fires the `_summary=count` queries in parallel, the loading-skeleton render, the populated-cards render, and the click-to-navigate. It does NOT know anything about Patient vs non-Patient — both use cases reduce to "fetch counts for these N entries against this ref value."
- **D-05 (Patient wrapper — preserve filename, internal refactor):** `src/components/explorer/PatientRelatedResources.tsx` keeps its filename (callers don't change) but its body becomes
  ```tsx
  export function PatientRelatedResources({ patientId }) {
    const entries = reverseReferenceCatalog.Patient ?? [];
    return (
      <RelatedResourcesPanel
        title="Related Resources"
        entries={entries}
        refValue={`Patient/${patientId}`}
        onCardNavigate={(e) => `/explorer/${e.type}?${e.param}=Patient/${patientId}`}
      />
    );
  }
  ```
  The hard-coded `RELATED_TYPES` array is **deleted** from this file in the same plan that adds the catalog import — the catalog becomes the single source of truth. Existing `PatientRelatedResources` callers (`PatientHeaderCard` etc.) continue to work without prop changes.
- **D-06 (new IncomingReferencesPanel wrapper):** `src/components/explorer/IncomingReferencesPanel.tsx` exports
  ```tsx
  export function IncomingReferencesPanel({ resource }: { resource: Resource }) {
    const entries = reverseReferenceCatalog[resource.resourceType] ?? [];
    if (entries.length === 0) return null;  // type not in catalog → silent no-op
    return (
      <RelatedResourcesPanel
        title="Referenced By"
        entries={entries}
        refValue={`${resource.resourceType}/${resource.id}`}
        onCardNavigate={(e) => `/explorer/${e.type}?${e.param}=${resource.resourceType}/${resource.id}`}
      />
    );
  }
  ```
  Type-not-in-catalog → renders nothing. Type-in-catalog-but-zero-counts → shared component handles via the existing "all empty → return null" guard (D-12).

### Mount Position in ResourceDetailPage

- **D-07 (relocate Patient panel + add Incoming panel below Tabs):** In `src/components/explorer/ResourceDetailPage.tsx`:
  - **Remove** the current `<PatientRelatedResources patientId={id} />` block at lines 172–174 (above-Tabs position).
  - **Add** a single panel mount **below** the `<Tabs>` block:
    ```tsx
    {resource && (
      resource.resourceType === 'Patient' && id
        ? <PatientRelatedResources patientId={id} />
        : <IncomingReferencesPanel resource={resource} />
    )}
    ```
  This satisfies design handoff §30 ("footer that appears on every non-graph mode") and unifies the spatial position so both wrappers occupy the same slot. Patient detail's UX changes only in vertical position (panel moves from above to below the tabs); the panel content + click behavior is byte-identical.
  - **Trade-off accepted:** The Patient detail page's "Related Resources" cards move down the screen. This is a deliberate choice for spatial consistency and the design-handoff direction; it is the one Patient-side visible change Phase 48 ships, and it counts as the SC #4 "no regression" target because the cards remain present, fully functional, and identical in count/click behavior. If user feedback rejects the move, a Phase-48.1 revert is trivial (single ternary).

### Card Visual Content

- **D-08 (card minimal):** Card layout is byte-identical to current `PatientRelatedResources` — `[icon? + type label]` left, `[count badge]` right; same Mantine `Card withBorder padding="sm"` chrome; same `cursor: pointer`; same `Group justify="space-between"` layout. NO subtitle, NO top-result preview, NO summarizeResource integration on the card itself in v1.
- **D-09 (icons):** Patient's 11 emoji icons (already in existing component) move into the Patient catalog entry. Non-Patient catalog entries omit `icon` in v1 (rendered as just `[type label] [count]`). This is intentionally minimalist — adding emojis to non-Patient catalog entries is a polish task for a later phase if user feedback asks.

### Loading & Empty States

- **D-10 (loading — preserve existing pattern):** While ANY count query is in-flight and `populated.length === 0`, render up to 4 placeholder cards each with a Mantine `<Loader size="xs" />` (mirrors current `PatientRelatedResources` lines 73–82). As individual counts resolve, render their populated cards alongside the remaining loaders. Once all queries settle, only populated (count > 0) cards remain.
- **D-11 (failed lookup — silent drop):** A failed count query (network error, server error, malformed bundle) sets that entry's count to `0` so the card is dropped from the populated list. NO toast, NO console.error, NO retry. Same silent-fallback policy as Phase 47's reference resolver (D-02 of 47-CONTEXT).
- **D-12 (zero-results panel — render nothing):** If `populated.length === 0` after all queries settle (every catalog entry returned 0 or failed), the component returns `null`. The Title + Grid never render. This preserves the existing `PatientRelatedResources` invariant ("not all Patients have all 11 related types") and means the panel is gracefully invisible on resources with no incoming references.

### Click-Through Navigation

- **D-13:** Click on a card calls `navigate(onCardNavigate(entry))` — the wrapper supplies the route. For both wrappers the route shape is `/explorer/{type}?{param}={refValue}`, identical to current `PatientRelatedResources` line 90. The shared component does NOT hard-code this URL pattern — wrappers compose it via the `onCardNavigate` callback so future variations (e.g. routing into a typed sub-view) require no change to the shared render.

### Testing

- **D-14 (catalog shape — REVR-01 test):** Vitest covers:
  - Catalog exports a typed `const` (TypeScript compile-check via `as const` assertion + `satisfies ReverseReferenceCatalog` clause).
  - Patient key contains exactly the 11 entries currently in `PatientRelatedResources` (regression guard for D-05 refactor).
  - Each non-Patient key has at least 1 entry where the `type` is a valid FHIR R4 ResourceType (`@medplum/fhirtypes` `ResourceType` union check at compile time + runtime sanity at test time).
  - Coverage: 9 source-type keys present.
- **D-15 (panel render — REVR-02 test):** Vitest + React Testing Library cover:
  - Mount `<IncomingReferencesPanel resource={mockObservation} />`, mock `MedplumClient.get` to return bundles with `total: 5` for one entry and `total: 0` for others — verify only the 5-count card renders, others hidden.
  - Mock all entries returning 0 — verify component renders `null`.
  - Mock 1 entry's fetch to throw — verify component still renders the others without error toast / console.error.
  - Click a populated card — verify `useNavigate` called with `/explorer/{type}?{param}=Observation/abc123`.
- **D-16 (shared-component invariant — REVR-03 test):** Vitest covers:
  - Mount `<PatientRelatedResources patientId="p1" />` with the same mocked counts as the existing test (regression guard) — verify byte-identical output structure (cards, badges, click target URLs).
  - Mount both wrappers side-by-side with intentionally identical entry sets and refValues — verify their rendered DOM is structurally equivalent (snapshot or per-element assertion). This is the explicit "single render component" gate.
- **D-17 (full suite + build):** `npm test` green (modulo the pre-existing Phase 40 deuteranopia known-failure carry-over noted in Phase 47 verification); `npx tsc -b --noEmit` exit 0; `npm run build` exit 0.

### Bundle Budget

- **D-18:** Phase 48 delta ≤ +3 KB gz on the initial chunk. Catalog is a static const (~1 KB raw, <0.5 KB gz). The new `RelatedResourcesPanel` + `IncomingReferencesPanel` together replace the inline `PatientRelatedResources` body — net source LOC delta is small (refactor, not addition). React Flow / dagre are NOT involved (Phase 49). Reference-resolution cache hook from Phase 47 is NOT consumed by this panel (counts are fetched fresh; cache is for individual resource bodies, not bundle.totals). If a researcher proposes consuming the cache anyway, that's a no-op net-zero suggestion — defer.

### Backwards Compatibility

- **D-19:** All existing `PatientRelatedResources` callers (`ResourceDetailPage`, `PatientHeaderCard`, any tests) continue to import `{ PatientRelatedResources }` from the same path with the same prop signature. The rename of the internal cards array to a catalog-driven import is invisible to callers. The only behavior delta visible to a Patient detail view is the panel's vertical position (D-07) — count, content, click target are byte-identical.

### Claude's Discretion

- Exact Mantine icon strategy for non-Patient cards if a researcher decides emojis ARE wanted (e.g. `IconLink` from `@tabler/icons-react`). v1 default is "no icon for non-Patient."
- Whether to memoize `entries` or `refValue` inside the shared component (`useMemo` for the cancellation-stable URL string).
- Ordering of cards in the populated grid — current `PatientRelatedResources` preserves catalog-array order; recommend keeping that and not sorting by count.
- Whether the shared component takes a `cols` prop for SimpleGrid responsiveness or keeps the hardcoded `{ base: 2, sm: 3, md: 4 }`. Recommend hardcoded for v1 (mirrors existing).
- Test file naming — recommend `src/utils/__tests__/reverseReferenceCatalog.test.ts` for the catalog and `src/components/explorer/__tests__/IncomingReferencesPanel.test.tsx` + `RelatedResourcesPanel.test.tsx` for the components, mirroring established conventions.

### Folded Todos

(None — `gsd-tools todo match-phase 48` returned 0 matches.)

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Requirements & Roadmap
- `.planning/REQUIREMENTS.md` §"Theme C — Reverse References" — REVR-01, REVR-02, REVR-03 verbatim text (the source of "curated catalog", "8–12 source resource types", "card grid mirrors PatientRelatedResources", "single shared render component", "no regression in Patient detail UX").
- `.planning/ROADMAP.md` Phase 48 §Success Criteria — the 5 closure conditions.
- `.planning/PROJECT.md` §"Current Milestone: v1.7 Resource Navigation" — locked decisions (curated catalog NOT CapabilityStatement-driven; lazy fetch + session cache; sequential phase order).

### Design Handoff
- `design_handoff_v1.7_navigation/README.md` §"Phase 48" row in the table (line 30) — "Referenced by footer that appears on every non-graph mode of the resource shell. Generalized — same component for Patient and non-Patient."
- `design_handoff_v1.7_navigation/README.md` §"Suggested implementation order" line 197 — "add IncomingReferencesPanel as the persistent footer; cards expose 'Peek JSON' action." (Peek JSON action is OUT of scope for Phase 48 — see domain section.)
- `design_handoff_v1.7_navigation/view-resource-shell.jsx` — visual target for the Mode 2 (Human) shell. The footer position is consistent across modes per design intent.

### Existing Code (Building Blocks + Refactor Targets)
- `src/components/explorer/PatientRelatedResources.tsx` — the existing component. Its `RELATED_TYPES` array (lines 8–20) becomes the Patient entry of the catalog. Its render body (lines 36–106) becomes the shared `RelatedResourcesPanel`. Its file becomes a thin wrapper.
- `src/components/explorer/ResourceDetailPage.tsx:172-174` — current Patient panel mount point (above Tabs). Phase 48 deletes this and adds a single below-Tabs ternary mount per D-07.
- `src/components/patients/PatientHeaderCard.tsx` — caller of `PatientRelatedResources` (or its parent). Verify caller signature unchanged after refactor.
- `src/utils/summarizeResource.ts` — Phase 46 output. NOT consumed in Phase 48 (cards stay minimal per D-08), but downstream Phase 49 graph will consume both this util AND the Phase 48 catalog.
- `src/hooks/useReferenceResolver.ts` — Phase 47 cache hook. NOT consumed in Phase 48 (count queries are direct fetches, not resource-body resolutions per D-18).

### FHIR Data Model
- `@medplum/fhirtypes` — `Resource`, `ResourceType` union, `Bundle`, `Reference`.
- `@medplum/core` — `MedplumClient.get(url)` for the count queries; `client.fhirUrl(path)` for URL construction (preserve existing pattern from `PatientRelatedResources` lines 43–45).
- FHIR R4 SearchParameter registry (no local file — researcher can probe via the Blaze server's `/SearchParameter?base={Type}` endpoint or consult the published FHIR R4 search-parameter list at https://hl7.org/fhir/R4/searchparameter-registry.html when verifying D-03 entries).

### Conventions
- `src/utils/__tests__/` — vitest test file naming for catalog (`colorVision.test.ts`, `summarizeResource.test.ts` are reference patterns).
- `src/components/explorer/__tests__/` — vitest + RTL convention for component tests (Phase 47 tests are the closest reference for fetch-mocking and Mantine render setup).

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- `PatientRelatedResources.tsx` — the entire body becomes the foundation for `RelatedResourcesPanel`. Loading/empty/error semantics are battle-tested; preserve them.
- `client.fhirUrl(url).toString()` + `client.get(...)` — established pattern for raw count queries. The `_summary=count&_count=0` trick is verified to return just `bundle.total` without entries.
- `useNavigate` + the `/explorer/{type}?{param}={ref}` URL convention — already wired up in `SearchResultsPage` to filter by query string.
- Mantine `Card`, `SimpleGrid`, `Badge`, `Group`, `Text`, `Title`, `Loader` — all already imported in the existing component; no new dependencies.
- `@medplum/fhirtypes` `ResourceType` union — gives compile-time safety for catalog keys without `as` casts.

### Established Patterns
- **Cancellation token pattern** (`let cancelled = false; ... return () => { cancelled = true; }`) in the existing `useEffect` — preserve in shared component.
- **Loading state encoded as `'loading' | number`** — preserve; downstream rendering checks `typeof counts[type] === 'number'`.
- **Hidden-when-empty** invariant — preserve as the panel-level guard.

### Integration Points
- One file deleted in spirit (PatientRelatedResources internal array), one file added (catalog), one file refactored (PatientRelatedResources body), one file added (RelatedResourcesPanel), one file added (IncomingReferencesPanel), one file edited (ResourceDetailPage mount).
- Zero new routes. Zero new Mantine theme changes. Zero new dependencies.
- Bundle delta: per D-18, ≤ +3 KB gz initial chunk.

</code_context>

<specifics>
## Specific Ideas

- The Patient detail page's "Related Resources" panel moving from above-Tabs to below-Tabs is a deliberate spatial unification (D-07). It's the one user-visible change to the existing Patient flow this phase ships, and it's the SC #4 closure target — "no regression" is interpreted as "card content and click behavior identical," not "vertical position identical."
- The catalog is a Partial<Record<ResourceType, …>> rather than a full Record so we can grow coverage incrementally without TypeScript demanding all 144 R4 types be enumerated.
- The Phase 47 reference-resolution cache is intentionally NOT consumed here. Count queries are bundle.total fetches — they don't return resource bodies, so cache populates nothing useful. Re-stating this so the researcher doesn't propose unnecessary integration.
- The "icon" field on catalog entries is intentionally optional and rendered only when present. This lets the Patient catalog entry preserve its existing emoji set (regression guard) while non-Patient entries skip the icon design problem entirely in v1.
- The Provenance entry shows up across multiple non-Patient catalog values — Provenance.target is the canonical "audit trail" reverse pointer for almost every domain resource. If a Blaze deployment doesn't index Provenance, those entries return 0 and disappear via D-12; no harm done.

</specifics>

<deferred>
## Deferred Ideas

- **CapabilityStatement-driven runtime catalog** — replace the curated const with a runtime discovery from the connected server's `CapabilityStatement.rest.resource[].searchParam`. Already in REQUIREMENTS.md §"Deferred to Future Milestones". Defer until the curated approach reveals real-world gaps (probably v1.8+).
- **"Peek JSON" card action** — design handoff calls for cards to expose a Peek JSON action that opens the (deferred) JSON peek drawer. Out of scope until the drawer ships as its own phase.
- **Card subtitle / top-referencer summary** — show a one-line preview of the highest-scoring incoming reference under the card's count badge. Defer until UX feedback asks.
- **Non-Patient card icons** — design a consistent icon set for all 8 non-Patient source types (likely `@tabler/icons-react`). Defer; v1 ships text-only cards for non-Patient.
- **Sort-by-count on card grid** — currently catalog-array order. If users say "I want to see what has the most refs first," swap to count-desc sort. Defer.
- **CapabilityStatement gap report** — a Quality dashboard item that diffs the curated catalog against the live server's CapabilityStatement.searchParam list and surfaces "you have refs we don't show." Out of v1.7 scope; potential v1.8 Quality phase.

(No reviewed-but-not-folded todos — no todos matched Phase 48 in the cross-reference step.)

</deferred>

---

*Phase: 48-theme-c-reverse-references-incoming-references-panel*
*Context gathered: 2026-05-01 via `/gsd-discuss-phase 48 --auto` (recommended-default selections logged in DISCUSSION-LOG.md)*
