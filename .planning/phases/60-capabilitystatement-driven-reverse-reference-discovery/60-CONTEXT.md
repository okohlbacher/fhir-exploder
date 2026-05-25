# Phase 60: CapabilityStatement-Driven Reverse-Reference Discovery - Context

**Gathered:** 2026-05-25
**Status:** Ready for planning

<domain>
## Phase Boundary

Replace the hand-curated `reverseReferenceCatalog.ts` with a dynamic catalog derived from the connected server's `CapabilityStatement`, while keeping the curated catalog as a transparent fallback. `IncomingReferencesPanel` populates from the union of dynamic + curated entries; no UX regression on servers with missing or sparse CapabilityStatements.

Key constraint: `ConnectionContext` already fetches `/metadata` and stores the parsed `CapabilityStatement` in `connected.capability`. Phase 60 must not add a second `/metadata` fetch — the dynamic catalog is derived from the capability already in state.

</domain>

<decisions>
## Implementation Decisions

### Catalog Builder Placement

- **D-01:** Extend `ConnectionContext` — parse the dynamic catalog synchronously inside `connect()` immediately after the existing CapabilityStatement validation, and add `dynamicCatalog: ReverseReferenceCatalog` to the `connected` state. `IncomingReferencesPanel` reads it via `useConnectionContext()`. No second `/metadata` fetch; invalidation is automatic on server switch (existing disconnect/reconnect flow clears all connected state).
- **D-02:** The parsing logic lives in a standalone pure function `buildDynamicCatalog(capability: CapabilityStatement): ReverseReferenceCatalog` in `src/utils/capabilityStatementCatalog.ts`. Called from `connect()`, its result stored as `dynamicCatalog`. This makes it unit-testable with a fixture CapabilityStatement (required by success criterion 4a) without needing to mock the full connect flow.
- **D-03:** `dynamicCatalog` uses the existing `ReverseReferenceCatalog` type (`Partial<Record<ResourceType, readonly ReverseReferenceEntry[]>>`). No new types introduced. Empty catalog (`{}`) represents "server CapabilityStatement had no usable reference params."

### Plan Split (locked from STATE.md)

- **D-04:** Plan 60-01 covers: `buildDynamicCatalog` pure function + `src/utils/capabilityStatementCatalog.ts` + extension of `ConnectionState` type (`connected` state gains `dynamicCatalog`) + update to `connect()` in `ConnectionContext.tsx`.
- **D-05:** Plan 60-02 covers: `IncomingReferencesPanel` integration (read `dynamicCatalog` from context, merge with curated fallback) + fallback path (transparent, no toast/banner) + 4-test suite (parser fixture, dynamic panel render, fallback render, per-server cache invalidation).

### CapabilityStatement Parsing Contract (locked from ROADMAP.md)

- **D-06:** Parser reads `CapabilityStatement.rest[0].resource[*].searchParam`, filters to entries with `type: 'reference'`, and builds a reverse-keyed catalog. Target resource type inference approach (convention map vs. curated intersection vs. SearchParameter definition follow) is NOT locked — researcher must determine the best approach given REVR-DYN-EXT is deferred.
- **D-07:** Merge strategy per ROADMAP: "union of (a) what the server actually advertises as referenceable and (b) what the curated catalog covers." Deduplicate by `type+param` composite key (same logic as `entryKey` in `RelatedResourcesPanel.tsx`). Curated entries without icons that appear in both catalogs: researcher to determine icon handling.

### Fallback Behavior (locked from ROADMAP.md)

- **D-08:** When the CapabilityStatement is unavailable (404, network error, malformed) — which ConnectionContext already handles by not reaching the `connected` state — `IncomingReferencesPanel` falls back to the hand-curated `reverseReferenceCatalog.ts`. No error toast or banner. This is transparent to the user.
- **D-09:** When a specific resource type has no entries in `dynamicCatalog`, fall back to the curated catalog entry for that type. Per-type fallback, not all-or-nothing.

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Requirements
- `.planning/REQUIREMENTS.md` §REVR-04 — Full requirement text + acceptance criteria (5 success criteria, including the 4-test suite spec)
- `.planning/ROADMAP.md` §Phase 60 — Goal, success criteria 1-5, plan split, effort, UI hint

### Core Source Files to Modify
- `src/contexts/ConnectionContext.tsx` — Add `dynamicCatalog` to `connect()` + connected state; call `buildDynamicCatalog(capability)` after existing validation (line 34 region)
- `src/fhir/types.ts` — Extend `ConnectionState` connected variant: add `dynamicCatalog: ReverseReferenceCatalog`
- `src/components/explorer/IncomingReferencesPanel.tsx` — Replace direct `reverseReferenceCatalog` import with `useConnectionContext()` dynamic lookup + per-type curated fallback

### New File to Create
- `src/utils/capabilityStatementCatalog.ts` — `buildDynamicCatalog(capability)` pure function (D-02)

### Existing Assets (read before implementing)
- `src/utils/reverseReferenceCatalog.ts` — Curated catalog + `ReverseReferenceEntry` + `ReverseReferenceCatalog` types; must remain as fallback, not deleted
- `src/components/explorer/RelatedResourcesPanel.tsx` — `entryKey = (e) => \`${e.type}:${e.param}\`` composite key used for dedup; reuse this pattern
- `src/components/explorer/__tests__/IncomingReferencesPanel.test.tsx` — Existing tests; must not regress

### Prior Phase Context
- `.planning/phases/48-theme-c-reverse-references-incoming-references-panel/` — Phase 48 created the original reverse-reference infrastructure (REVR-01..03). Contains CONTEXT.md with D-03 curated catalog design notes and pitfalls.

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- `ConnectionContext.tsx` connected state: already parses and stores `capability: CapabilityStatement` at line 35 — extend this state object with `dynamicCatalog` using the same pattern.
- `ReverseReferenceCatalog` type from `reverseReferenceCatalog.ts`: same type used by both curated and dynamic catalogs — no new type surface.
- `entryKey(e)` from `RelatedResourcesPanel.tsx`: `\`${e.type}:${e.param}\`` composite key — use this exact string for deduplication in the union merge.
- `useConnectionContext()` hook: already used by components that need FHIR client; `IncomingReferencesPanel` can import this to access `dynamicCatalog`.

### Established Patterns
- Context extension: `ConnectionContext` was previously extended with `capability` without structural changes to its provider shape — `dynamicCatalog` follows the same path.
- Error handling in `connect()`: already catches all errors and maps them to `ConnectionError`; `buildDynamicCatalog` should throw on truly malformed input but return `{}` on empty/missing resource arrays (graceful degradation).
- Test fixture pattern: `IncomingReferencesPanel.test.tsx` already mocks `reverseReferenceCatalog` — new tests extend this approach with a fixture CapabilityStatement.

### Integration Points
- `connect()` in `ConnectionContext.tsx`: insertion point for `buildDynamicCatalog(capability)` is after line 34 (existing CapabilityStatement validation), before `setState({ status: 'connected', ... })`.
- `IncomingReferencesPanel.tsx` line 17: `const entries = reverseReferenceCatalog[resource.resourceType] ?? []` — replace this with `dynamicCatalog[resource.resourceType] ?? curatedEntries[resource.resourceType] ?? []`.
- `src/fhir/types.ts` `ConnectionState` connected variant: add `dynamicCatalog: ReverseReferenceCatalog` alongside the existing `client` and `capability` fields.

</code_context>

<specifics>
## Specific Ideas

- `buildDynamicCatalog` should return `{}` (not throw) when `capability.rest` is absent or empty — this enables graceful degradation without altering the try/catch in `connect()`.
- The `entryKey` dedup logic for the union merge should match `RelatedResourcesPanel.tsx` exactly: `\`${type}:${param}\`` — this keeps the two-component-key invariant consistent across all panel rendering.
- REVR-DYN-EXT (deep SearchParameter `$describe` resolution) is explicitly deferred — Phase 60 must NOT attempt to follow `searchParam.definition` URLs. The researcher should determine the correct target-inference approach within this constraint.

</specifics>

<deferred>
## Deferred Ideas

- **REVR-DYN-EXT** — Deep `$describe`/SearchParameter definition resolution for inferring target types of unconventional reference params. Tracked in ROADMAP.md §Deferred Items. Phase 60 uses a simpler approach (researcher to determine).
- **Icons for dynamic entries** — Dynamic catalog entries won't have emoji icons. Icon assignment for newly-discovered resource types is out of scope; researcher may propose a convention but it's not a hard requirement.

</deferred>

---

*Phase: 60-capabilitystatement-driven-reverse-reference-discovery*
*Context gathered: 2026-05-25*
