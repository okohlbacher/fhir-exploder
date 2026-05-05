---
phase: 57
status: context_complete
mode: discuss
created: 2026-05-05
---

# Phase 57: References-Out Card — CONTEXT

## Phase Goal

Add an "Outgoing References" panel to the Summary mode of `ResourceDetailPage` — a labeled list of every resource this resource points to (outgoing FHIR references). Complements the existing `IncomingReferencesPanel` (reverse/incoming refs). LENS-02 only.

Requirements: LENS-02

---

<domain>
## Phase Boundary

A single new component (`OutgoingReferencesPanel`) that walks the current resource's JSON for outgoing Reference fields and renders them as a labeled link list. Wired into `ResourceDetailPage` Summary panel below `KeyFieldsTable` and `IncomingReferencesPanel` (or `PatientRelatedResources` for Patient).

Patient resources: panel is **not shown** — `PatientRelatedResources` already covers that surface.
Empty state: panel is **hidden** when no outgoing references are found — no empty card.

**Not in scope:** curated registry, server queries, count badges, new routing, pagination.

</domain>

<decisions>
## Implementation Decisions

### D-01: Discovery — Generic JSON walk

Walk the resource JSON recursively for any object that has a `reference` string field matching the `ResourceType/id` pattern. No curated catalog needed — the walker covers all resource types automatically including rare ones.

The walker derives the field path algorithmically (e.g., `"subject"`, `"participant[0].individual"`, `"diagnosis[1].condition"`). Each extracted entry is:
```ts
interface OutgoingRef {
  path: string;    // human-readable JSON path, e.g. "subject" or "participant[0].individual"
  reference: string; // raw FHIR reference string, e.g. "Patient/abc123"
  display?: string;  // Reference.display if present
}
```

Skip `resourceType`, `id`, `meta`, `text` top-level fields — these are structural, not outgoing references. Skip `contained[]` resources (they are local fragments, not outgoing refs).

Use the existing `FHIR_REFERENCE_PATTERN` (`/^[A-Z][a-zA-Z]+$/`) and `FHIR_ID_PATTERN` from `ResourceDetailPage.tsx` to validate extracted references before rendering.

### D-02: Layout — Labeled list

A compact `<Stack gap="xs">` of rows. Each row is a `<Group gap="xs">`:
- Left: `<Text size="sm" c="dimmed" ff="monospace">{path}</Text>` — the field path label
- Right: `<ReferenceLink reference={ref.reference} display={ref.display} />` — reuses the existing Phase 47 component with all its resolved/pending/failed states and Cmd+click → peek

Title: `<Title order={5} mb="sm">Outgoing References</Title>` — matches `IncomingReferencesPanel`'s "Referenced By" title style.

No server queries. The panel renders immediately with data already in the resource JSON.

### D-03: Deduplication — Show each field occurrence

If the same target (`Patient/123`) appears under two different fields (`subject` and `participant[0].individual`), show two rows — one per field path. This preserves the structural context of where each reference lives in the resource.

No deduplication by target value.

### D-04: Component and utility structure

**New files:**
- `src/utils/extractOutgoingReferences.ts` — pure function `extractOutgoingReferences(resource: Resource): OutgoingRef[]`; recursive walker; skips `resourceType`, `id`, `meta`, `text`, `contained`; validates references with FHIR patterns
- `src/components/explorer/OutgoingReferencesPanel.tsx` — renders `OutgoingRef[]` as labeled list; returns `null` when array is empty

**Modified files:**
- `src/components/explorer/ResourceDetailPage.tsx` — add `<OutgoingReferencesPanel>` inside Summary `Tabs.Panel`, after `IncomingReferencesPanel` (or `PatientRelatedResources`); guard with `resource.resourceType !== 'Patient'`

### D-05: Tests

**`src/utils/__tests__/extractOutgoingReferences.test.ts`:**
- Returns empty array for resource with no references
- Extracts top-level scalar reference (e.g., `Encounter.subject`)
- Extracts nested reference in array (e.g., `Encounter.participant[0].individual`)
- Skips `contained[]` resources
- Skips non-reference objects (objects without a `reference` field)
- Validates FHIR reference format (ignores `"foo/bar"` where `foo` fails the type pattern)
- Preserves `display` when present

**`src/components/explorer/__tests__/OutgoingReferencesPanel.test.tsx`:**
- Returns null when refs array is empty
- Renders one row per `OutgoingRef` entry
- Shows path label as monospace dimmed text
- Renders `ReferenceLink` for each entry

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Phase 54 — Summary panel composition (what LENS-02 extends)
- `src/components/explorer/ResourceDetailPage.tsx` — Summary Tabs.Panel composition (lines ~206-215): Title → KeyFieldsTable → PatientRelatedResources (Patient) OR IncomingReferencesPanel (non-Patient). OutgoingReferencesPanel slots in after IncomingReferencesPanel.
- `.planning/phases/54-4-mode-resource-shell/54-02-SUMMARY.md` — §References-Out Deferral and §Open Items Handed Forward: confirms LENS-02 scope and deferred status

### Existing reference rendering components
- `src/components/explorer/IncomingReferencesPanel.tsx` — structural sibling; wraps `RelatedResourcesPanel` with `reverseReferenceCatalog` lookup
- `src/components/explorer/RelatedResourcesPanel.tsx` — card grid pattern with server count queries (NOT reused for LENS-02 — outgoing refs need no server queries)
- `src/components/explorer/ReferenceLink.tsx` — **reused directly** for rendering each outgoing ref; handles pending/resolved/failed states + Cmd+click → peek (Phase 47 D-01/D-05)

### Reference utilities
- `src/utils/reverseReferenceCatalog.ts` — `ReverseReferenceEntry` shape and catalog pattern (for reference; outgoing refs don't use a catalog)
- `src/utils/referenceUrl.ts` — `normalizeReference()` and `buildExplorerHref()` — used by `ReferenceLink` internally; may be useful in the walker for path-building

### Validation patterns
- `src/components/explorer/ResourceDetailPage.tsx` lines 22-29 — `FHIR_REFERENCE_PATTERN` and `FHIR_ID_PATTERN` regexes; reuse in the walker to filter out non-resource references

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- `ReferenceLink` (`src/components/explorer/ReferenceLink.tsx`): drop-in for each outgoing ref row; accepts `reference`, `display?`, `parentResource?`; all states (pending/resolved/failed) + Cmd+click → peek already handled
- `FHIR_REFERENCE_PATTERN` / `FHIR_ID_PATTERN` from `ResourceDetailPage.tsx`: copy into `extractOutgoingReferences.ts` or extract to shared util
- `normalizeReference` from `referenceUrl.ts`: parses relative/absolute/fragment refs — useful to pre-validate before rendering

### Established Patterns
- Summary panel composition: `<Stack gap="lg">` with `<Title order={5}>` per sub-panel heading, `null` return for empty (see `IncomingReferencesPanel`)
- Panel hidden when empty: `RelatedResourcesPanel` returns `null` when `populated.length === 0` — same contract for `OutgoingReferencesPanel`
- Patient guard: `resource.resourceType === 'Patient' && id ? <PatientRelatedResources ...> : <IncomingReferencesPanel ...>` — extend with an additional `{resource.resourceType !== 'Patient' && <OutgoingReferencesPanel .../>}`

### Integration Points
- `ResourceDetailPage.tsx` Summary `Tabs.Panel` (lines ~206-215): add `<OutgoingReferencesPanel resource={resource} />` after the existing ref panel conditional
- `ReferenceLink` already wired into the `handleReferenceClick` interceptor pattern — no changes needed to click handling

</code_context>

<specifics>
## Specific Ideas

- Panel title: **"Outgoing References"** — explicit complement to `IncomingReferencesPanel`'s "Referenced By"
- Path label style: `ff="monospace"` + `c="dimmed"` + `size="sm"` — matches the secondary text convention from Phase 55 EXPL-01
- Row separator: none needed — `<Stack gap="xs">` provides enough breathing room
- `display` field: pass through to `ReferenceLink` as the `display` prop; it renders as dim text while pending and is replaced by resolved summary once fetched

</specifics>

<deferred>
## Deferred Ideas

- **Curated field labels** (e.g., `subject → "Patient"`, `performer → "Performed by"`): a friendly label overlay could improve readability but adds maintenance overhead; deferred until real-world usage shows it's needed
- **Filter out references already shown in KeyFieldsTable**: the two surfaces may overlap for some resource types; cross-filtering is a future polish item
- **Count badges**: outgoing refs have exact targets, no need for counts — but showing resolved display names inline (via `ReferenceLink`) gives equivalent utility

None — discussion stayed within phase scope.

</deferred>

---

*Phase: 57-references-out-card*
*Context gathered: 2026-05-05*
