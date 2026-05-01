# Phase 47: Theme B — Readability: HumanReadableView - Context

**Gathered:** 2026-05-01
**Status:** Ready for planning
**Source:** PRD-equivalent — locked decisions captured from `design_handoff_v1.7_navigation/README.md` plus existing ROADMAP.md success criteria for READ-01/02/03

<domain>
## Phase Boundary

**In scope (Phase 47):**
- Reference resolution + display for HumanReadableView (READ-01)
- Property-level extension surfacing (READ-02)
- Contained-resource rendering (READ-03)
- Session-level reference-resolution cache (consumed by Phase 47 itself + Phase 48 IncomingReferencesPanel + Phase 49 Graph + new JSON peek drawer when it ships)

**Out of scope (deferred to later phases):**
- 4-mode resource shell (`Summary | Human | Graph | JSON`) — REPLACES `<Tabs>` in `ResourceDetailPage`. Tracked separately; Phase 47 keeps the existing `<Tabs>` chrome and only enriches `HumanReadableView` (Mode 2 content).
- JSON peek drawer (`src/components/peek/`) — proposed Phase 46.5 / 47.5; Phase 47 does NOT ship the drawer but MUST expose the reference-resolution cache via a hook (`useReferenceResolver`) so the drawer's `Cmd+click` flow can reuse it.
- Sidebar v2 / Expert toggle / IA collapse — last per design handoff order.
- Graph Mode 3 — Phase 49.
- IncomingReferencesPanel — Phase 48.

</domain>

<decisions>
## Implementation Decisions

### D-01 — Reference rendering text (READ-01)
**Locked:** Inline text MUST be `summarizeResource(target).primary`. The full reference URL (e.g. `Patient/abc123`) is accessible via Mantine `<Tooltip>` on hover. The rendered text remains a clickable router link to `/explorer/{type}/{id}`.

### D-02 — Reference cache shape (READ-01 SC#2)
**Locked:** Session-level `Map<\`${type}/${id}\`, Resource | null>`. Cleared on full reload. Repeat references hit cache; failed lookups (404 / network error) cache `null` and silently fall back to the raw href display. NO error toast. NO retry on cache miss within the session.

### D-03 — Cache lifecycle and exposure
**Locked:** Cache lives in a module-scoped `Map` accessed via a custom hook `useReferenceResolver(reference: string) → { resource: Resource | null; status: 'pending' | 'resolved' | 'failed' }`. The hook is the SINGLE consumer-facing API. The underlying `Map` is NOT exported. The hook is reusable by Phase 48 (IncomingReferencesPanel) and the future JSON peek drawer (`Cmd+click` chip resolution).

### D-04 — Reference URL parsing
**Locked:** `Reference.reference` strings are parsed as `Type/id` (relative) or full URL (absolute). Absolute URLs that match the configured FHIR base URL are normalized to `Type/id` for cache lookup. Cross-server / contained-resource fragment refs (`#contained-id`) are NOT cached — they resolve from the parent resource's `contained[]` array.

### D-05 — Loading states (READ-01)
**Locked:** While a reference is in-flight (status `'pending'`), render the reference URL string verbatim with a Mantine `<Skeleton width={120} height={14}>` overlay (or equivalent visual cue). Once resolved (`status: 'resolved'`), swap to the human-readable text. On failure (`status: 'failed'`), render the raw `Type/id` text as the link content.

### D-06 — Extension surfacing affordance (READ-02)
**Locked:** Property-level extensions (the `_`-prefix-filtered `_propertyName` keys plus standalone `extension[]` entries) MUST be reachable from the human-readable surface. The chosen affordance: an inline `[+1 extension]` chip rendered next to the property row, click-expands to reveal the extension's URL + value inline (NOT a modal). For multiple extensions on the same property, the chip reads `[+N extensions]`. The full `extension[]` array of the resource itself remains accessible via the existing dedicated "Extensions" subsection at the bottom of the view (already shipped in Phase 35 UAT-FU-02).

### D-07 — Extension display format
**Locked:** Each surfaced extension renders as: `<Code>extension URL</Code>` on one line, the extension's value rendered via the existing `<ResourcePropertyDisplay>` on the next line. For nested extensions (`extension.extension[]`), recurse with a 1-level indent.

### D-08 — Contained-resource rendering (READ-03)
**Locked:** `Resource.contained[]` is rendered inline as a collapsed accordion below the parent resource's properties. Each contained entry shows `summarizeResource(contained).primary` in the accordion header. Click-expand reveals a full `<ResourcePropertyTable>` for that contained resource (read-only, no further drilldown). NO fall-through to the JSON modal. NO router navigation (contained resources have no addressable URL).

### D-09 — Test coverage
**Locked per SC#5:**
- READ-01: cache hit, cache miss, 404 fallback, network-error fallback, repeat-reference cache reuse
- READ-02: extension chip presence + expand behavior + nested-extension recursion
- READ-03: contained-resource accordion render + expand-to-table behavior + multi-contained ordering

### D-10 — Bundle budget
**Locked:** +5 KB gz vs Phase 46 close baseline (584.17 KB). The hook + accordion adds minimal LOC; React Flow / dagre are NOT involved in this phase.

### D-11 — Backwards compatibility
**Locked:** Existing `HumanReadableView` callers in `ResourceDetailPage.tsx` and any other consumers MUST continue to work without prop changes. The hook is internal. The new affordances (reference resolution + extension chips + contained accordion) appear automatically when the rendered resource has the relevant data.

### Claude's Discretion
- Hook implementation pattern (custom hook vs context-based) — pick whichever Mantine 8 + React 18 idiom is cleanest.
- Which `MedplumClient` method to use for reference resolution (`readReference` vs `readResource` vs raw `client.get`) — choose the path that minimizes 404 noise in the network log and respects the configured base URL.
- File layout: introduce `src/hooks/useReferenceResolver.ts` or co-locate inside `HumanReadableView` directory — follow existing project conventions.
- Skeleton width / accordion styling defaults — Mantine 8 sensible defaults.

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Phase 46 — `summarizeResource` foundation
- `src/utils/summarizeResource.ts` — public API consumed by reference rows + contained-resource accordion headers
- `.planning/phases/46-theme-a-foundation-summary-util/46-01-SUMMARY.md` — what was shipped and the contract

### Existing HumanReadableView surface
- `src/components/explorer/HumanReadableView.tsx` (or wherever the current implementation lives — confirm path during research)
- `src/components/explorer/ResourceDetailPage.tsx` — caller (Tabs container — DO NOT modify Tabs structure in this phase)
- `src/components/explorer/ResourcePropertyTable.tsx` — reused for contained-resource expand
- `src/components/explorer/ResourcePropertyDisplay` (or equivalent) — reused for extension value rendering

### FHIR data model
- `@medplum/fhirtypes` — `Reference`, `Resource`, `Extension`, `Resource.contained[]`
- `@medplum/core` — `MedplumClient.readReference` / `readResource` / `client.get`

### Design handoff
- `design_handoff_v1.7_navigation/README.md` — see "Phase 47" mapping in the table; "Reference rows MUST display `summarizeResource(target).primary`"
- `design_handoff_v1.7_navigation/view-resource-shell.jsx` — shows the visual target for Mode 2 (Human) within the future 4-mode shell. Phase 47 implements the content; the shell chrome is deferred.

### Project skills
- `.claude/skills/` and `.agents/skills/` — check for relevant SKILL.md files

</canonical_refs>

<specifics>
## Specific Ideas

- The hook MUST not re-fire requests on every render; use a ref or stable-callback pattern to deduplicate in-flight requests for the same `Type/id`.
- The cache `Map` is the source of truth for "we tried this reference"; `null` value = "tried, failed". Distinguish `undefined` (not tried) from `null` (tried, failed).
- Extension chips should be keyboard-focusable (Mantine `<Chip>` or `<Button variant="subtle" size="xs">`) for a11y.
- Contained-resource accordion: use Mantine `<Accordion variant="subtle" multiple>` so users can expand multiple at once. Default state: all collapsed.

</specifics>

<deferred>
## Deferred Ideas

- 4-mode resource shell (`Summary | Human | Graph | JSON`) — propose as a separate phase (47.5 or fold into 48) per design handoff. Phase 47 keeps the existing `<Tabs>` chrome.
- JSON peek drawer — propose as Phase 46.5 / 47.5. Phase 47 ships the cache hook the drawer will reuse, but NOT the drawer itself.
- Per-extension hover tooltip showing extension definition / SD URL — polish item, defer.
- Cross-server reference resolution — out of scope (current Blaze setup is single-server; explicit out-of-scope per project constraints).
- Extension validation against profile SDs — out of scope; existing Phase 31 validator covers this independently.

</deferred>

---

*Phase: 47-theme-b-readability-humanreadableview*
*Context gathered: 2026-05-01 via locked-decisions express path (design handoff + ROADMAP success criteria)*
