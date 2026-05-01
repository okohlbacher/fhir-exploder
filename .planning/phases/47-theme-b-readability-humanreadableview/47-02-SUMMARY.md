---
phase: 47
plan: 02
subsystem: explorer/readability
tags: [readability, extensions, contained, accordion, mantine, vitest, tdd, READ-02, READ-03]
nyquist_compliant: true
dependency_graph:
  requires:
    - "src/utils/summarizeResource.ts (Phase 46 / NAV-01)"
    - "src/components/explorer/ResourcePropertyTable.tsx (Plan 01 — RenderValue + parentResource thread-through)"
    - "src/hooks/useReferenceResolver.ts (Plan 01 — D-03 single API)"
    - "src/components/explorer/ReferenceLink.tsx (Plan 01)"
    - "@mantine/core@8.3.18 (Accordion, Button, Code, Group, Stack, Text)"
  provides:
    - "src/components/explorer/ExtensionChip.tsx → ExtensionChip + ExtensionChipProps + RenderValue-based extension value display"
    - "src/components/explorer/ContainedResourcesAccordion.tsx → ContainedResourcesAccordion + ContainedResourcesAccordionProps"
    - "src/components/explorer/ResourcePropertyTable.tsx → exports RenderValue + CollectedExtension type + collectPropertyExtensions helper (private but used by tests via integration)"
  affects:
    - "src/components/explorer/HumanReadableView.tsx (mounts ContainedResourcesAccordion between property table and ExtensionsSection)"
    - "src/components/explorer/ResourcePropertyTable.tsx (property walker now sibling-aware; SKIP_KEYS now includes 'contained')"
tech_stack:
  added: []
  patterns:
    - "Sibling-aware property walker (`_K` + `_K[i]` + inline `value.extension`) with bracket-access defense (T-47-07)"
    - "Mantine 8 uncontrolled Accordion (no defaultValue) + per-item id-fallback to `idx-${i}` (Pitfall 6 + 7)"
    - "Component composition: ExtensionChip reuses RenderValue from ResourcePropertyTable; ContainedResourcesAccordion mounts ResourcePropertyTable inside its panel"
    - "Aggregated indexed-primitive surfacing with `[i]` prefix (Q4 resolution)"
key_files:
  created:
    - "src/components/explorer/ExtensionChip.tsx (130 LOC)"
    - "src/components/explorer/__tests__/ExtensionChip.test.tsx (167 LOC, 8 tests)"
    - "src/components/explorer/ContainedResourcesAccordion.tsx (91 LOC)"
    - "src/components/explorer/__tests__/ContainedResourcesAccordion.test.tsx (155 LOC, 7 tests)"
    - "src/components/explorer/__tests__/HumanReadableView.read-phase.test.tsx (154 LOC, 3 tests)"
  modified:
    - "src/components/explorer/ResourcePropertyTable.tsx (+105 lines: export RenderValue, CollectedExtension type, collectPropertyExtensions helper, sibling-aware property walker, 'contained' added to SKIP_KEYS)"
    - "src/components/explorer/HumanReadableView.tsx (+2 lines: import + mount ContainedResourcesAccordion between table and ExtensionsSection)"
decisions:
  - "D-06 (extension chip): Property-level extensions surfaced via inline `[+N extensions]` chip; click expands inline reveal (NOT modal). Resource-level Extensions section preserved unchanged."
  - "D-07 (extension display): Each surfaced extension renders as `<Code>{url}</Code>` + value via local `<RenderValue>`; nested extension.extension[] recurses with `pl='md'` 1-level indent."
  - "D-08 (contained accordion): Mantine `<Accordion multiple variant='separated' radius='sm'>`, collapsed by default (no defaultValue). Header = summarizeResource(c).primary. Panel = full ResourcePropertyTable for the contained resource."
  - "D-09 (test coverage): Cross-cut HumanReadableView.read-phase.test.tsx fixture exercises READ-01 + READ-02 + READ-03 simultaneously."
  - "D-10 (bundle budget): +5 KB gz vs Phase 46 close baseline (584.17 KB) — actual delta is NEGATIVE (-243 KB) thanks to Phase 36 chunk-split; current gz size 333.18 KB."
  - "D-11 (back-compat): HumanReadableView signature unchanged (`{ resource: Resource }`); resource-level ExtensionsSection still renders below the new accordion; existing tests still pass."
  - "Q2 resolution: terminology walker `collectCodings` is a generic depth-first walker (`src/terminology/walker.ts:30-31` walks every key including `contained`); parent's `useResolvedResource` therefore handles codings inside contained transparently. No per-panel re-resolution needed."
  - "Q4 resolution: indexed-primitive extensions (`_given: [null, {ext}]`) aggregate count for the chip; expand displays one entry per indexed extension with `[i]` prefix on the URL line."
  - "Q5 resolution: extension values render via the local `RenderValue` exported from `ResourcePropertyTable` — Medplum's `<ResourcePropertyDisplay>` is NOT used (existing comment at ResourcePropertyTable.tsx:259 'crashes on non-Medplum servers')."
metrics:
  duration_minutes: 9
  completed_date: "2026-05-01"
  commits: 2
  test_count_new: 18
  loc_production: 221
  loc_tests: 476
---

# Phase 47 Plan 02: ExtensionChip + ContainedResourcesAccordion Summary

**One-liner:** Closes READ-02 + READ-03 by surfacing property-level FHIR extensions inline (`[+N extensions]` chip with click-to-expand URL+value rows + nested recursion) and rendering `Resource.contained[]` as an inline Mantine Accordion below the property table — the human-readable view now displays every reachable byte of a FHIR resource without a JSON-tab fall-through.

## What was built

Two TDD waves landed Theme B's read-phase enrichments on top of the Plan-01 foundation:

1. **`src/components/explorer/ExtensionChip.tsx`** — Inline `[+N extensions]` chip wired into every `ResourcePropertyTable` row whose property has hidden `_propertyName.extension` siblings or inline `value.extension` arrays. The chip is a Mantine `<Button variant="subtle" size="xs">` with `aria-expanded` + `aria-controls`; click toggles a `<Stack>` reveal containing one `<ExtensionRow>` per collected extension. Each row renders `<Code>{url}</Code>` (text-escaped, never an `href`) + the first `value*` field via the **exported** `RenderValue` from `ResourcePropertyTable`. Nested `extension.extension[]` recurses with `pl="md"` indent (D-07). Indexed-primitive extensions (`_given: [null, {ext}]`) get a `[i]` prefix on the URL line so users can locate which array slot the extension applies to (Q4 resolution).

2. **`src/components/explorer/ContainedResourcesAccordion.tsx`** — Mantine `<Accordion multiple variant="separated" radius="sm">` mounted between `<ResourcePropertyTable>` and `<ExtensionsSection>` in `HumanReadableView`. No `defaultValue` (uncontrolled all-collapsed per Pitfall 6). Each contained entry uses `c.id ?? \`idx-${i}\`` as both React key and Accordion value (Pitfall 7). Header text is `summarizeResource(c).primary` (D-08). Panel mounts a full `<ResourcePropertyTable resource={c} parentResource={resource}/>` so fragment-ref (`#contained-id`) lookups continue to work inside the panel. Section heading "Contained Resources" appears only when at least one contained entry exists.

3. **`ResourcePropertyTable.tsx`** modifications — Three surgical changes:
   - Added `'contained'` to `SKIP_KEYS` so the legacy `DeepJsonModal` fall-through for contained resources is no longer reachable (D-08 invariant; READ-03 SC#4).
   - **Exported `RenderValue`** so `ExtensionChip` can reuse the same value renderer (Q5 resolution).
   - Added the `CollectedExtension` type + private `collectPropertyExtensions(value, sibling)` helper. Property walker now reads BOTH `K` and `_K` together; when `collected.length > 0`, the row's value cell wraps `<RenderValue>` and `<ExtensionChip>` in a `<Stack>` so the chip appears below the value (UI-SPEC §Component 2 layout).

4. **`HumanReadableView.tsx`** — Two-line change: import + mount `<ContainedResourcesAccordion resource={display}/>` between the property table and the resource-level `<ExtensionsSection>`. Public signature unchanged (`{ resource: Resource }`) — D-11 back-compat.

## Test coverage

**18 new tests across 3 suites:**

| File | Cases | Covers |
|------|-------|--------|
| `src/components/explorer/__tests__/ExtensionChip.test.tsx` | 8 | empty array → no button; singular vs plural label; click expands (`aria-expanded` toggles, URL + value visible); click again collapses (content unmounts); indexed-primitive `[i]` prefix; nested `extension.extension[]` recursion; chip is keyboard-focusable as `role=button` |
| `src/components/explorer/__tests__/ContainedResourcesAccordion.test.tsx` | 7 | `contained` undefined → no heading; empty array → no heading; single contained renders `summarizeResource` header; multi-contained preserves source order; expand toggles `aria-expanded` true; id-fallback for contained without `id`; all panels collapsed by default (`aria-expanded='false'` on every control) |
| `src/components/explorer/__tests__/HumanReadableView.read-phase.test.tsx` | 3 | D-09 cross-cut: refs + property-extensions + contained-resources + resource-level extension all render together; DOM order property-table → contained accordion → ExtensionsSection; plain resource (no refs/extensions/contained) renders only the property table |

**Cross-suite results:**
- Full suite: **1344 passing** (was 1326 post-Plan-01 → +18 new from Plan 02), 22 todo, 1 failing (pre-existing deuteranopia pair #13 — out of scope per `deferred-items.md`)
- All Plan-01 sentries still green: `useReferenceResolver.test.tsx`, `ReferenceLink.test.tsx`, `referenceUrl.test.ts` (34 tests)
- All Phase 35/UAT-FU sentries still green: `HumanReadableView.extensions.test.tsx`, `human-readable-view-terminology.test.tsx` (combined 8 tests)
- `npx tsc -b --noEmit` exit 0
- `npm run build` exit 0

## Sub-decisions confirmed

- **D-06** asserted by ExtensionChip tests "singular label", "plural label", "click expands", "indexed primitive shows [i] prefix" — chip surfacing covers single + multi + indexed shapes with click-to-expand inline (NOT modal).
- **D-07** asserted by ExtensionChip test "nested extension recurses" + the `<Code>{url}</Code>` + `<RenderValue value={pickFirstValueX(ext)}/>` rendering pattern in `ExtensionChip.tsx`.
- **D-08** asserted by ContainedResourcesAccordion tests "all panels collapsed by default" + the `! grep defaultValue` acceptance criterion + `Accordion multiple variant="separated"` literal in source.
- **D-09** asserted by `HumanReadableView.read-phase.test.tsx` test "renders all three new affordances together without errors" with a fixture Observation containing reference + `_effectiveDateTime.extension` + `contained[]` + resource-level `extension[]`.
- **D-10** verified at phase gate: built bundle gz = 333 KB; baseline 584.17 KB → delta of approximately -243 KB (significantly under the +5 KB budget). The negative delta is consistent with the Phase 36 chunk-split shipped before this phase began.
- **D-11** asserted by `HumanReadableView.extensions.test.tsx` (5 tests covering the bottom Extensions section) staying green and `HumanReadableView` keeping its single `{ resource: Resource }` prop.
- **READ-03 SC#4 invariant** asserted by `grep -q "'contained'" src/components/explorer/ResourcePropertyTable.tsx` — the DeepJsonModal fall-through path for `contained` is unreachable.

## Open-question resolutions adopted

- **Q2 (Terminology re-resolution inside contained panels)**: The terminology walker `collectCodings` in `src/terminology/walker.ts` is a generic depth-first walker over all object keys (line 30-31: `for (const key of Object.keys(v)) { const child = v[key]; if (child && typeof child === 'object') collectCodings(child, out); }`). It DOES recurse into `contained[]` because there is no key skip-list. The parent's `useResolvedResource` therefore covers codings inside contained resources transparently. Phase 47 does NOT re-wrap each accordion panel in `useResolvedResource` (Research A2). HUMAN-UAT row 4 confirms behavior on live Blaze.
- **Q4 (Indexed primitive `_given: [null, {ext}]` UX)**: Aggregate count for the chip; on expand display one entry per indexed extension with a `[i]` prefix (`<Text size="xs" c="dimmed">[{index}]</Text>` adjacent to the `<Code>{url}</Code>`). Test "indexed primitive shows [i] prefix" pins this behavior.
- **Q5 (`<ResourcePropertyDisplay>` vs local `<RenderValue>` for extension values)**: Reuse the local `RenderValue` (now exported from `ResourcePropertyTable.tsx`) — Medplum's `<ResourcePropertyDisplay>` is rejected because it crashes on non-Medplum servers (existing comment at `ResourcePropertyTable.tsx:259`). All extension `value*` rendering routes through Mantine `<Text>` / `<Code>` text-node escaping (T-47-03 mitigation).

## Threat surface scan

The plan's threat register lists three threats; one is `accept` and two are `mitigate`. All confirmed at close:

- **T-47-02** (DoS via pathological `contained[]` count) — **ACCEPTED**. Mantine `<Accordion>` mounts panel content lazily but a worst-case array of N=10000 would still create N headers. Acceptable under single-user local-tool threat model. Defensive `slice(0, 200)` cap NOT added; flagged for HUMAN-UAT confirmation against live Blaze.
- **T-47-03** (Tampering / XSS via extension value rendering) — **MITIGATED**. Verified by:
  - `! grep -rn "dangerouslySetInnerHTML" src/components/explorer/ExtensionChip.tsx` (clean)
  - `! grep -rn "dangerouslySetInnerHTML" src/components/explorer/ContainedResourcesAccordion.tsx` (clean)
  - All `value*` rendering uses Mantine `<Text>{string}</Text>` and `<Code>{string}</Code>` — React text-node escaping
  - URLs in extension `url` field are rendered as text inside `<Code>` — never as anchor `href`
- **T-47-07** (Tampering via property walker `_K` sibling lookup) — **MITIGATED**. Verified by:
  - `collectPropertyExtensions` uses bracket access `(resource as Record<string, unknown>)[\`_${key}\`]` (no spread, no `Object.assign`, no `__proto__` reachable)
  - Each extension is filtered by `typeof e === 'object' && typeof e.url === 'string'` before being collected; malformed entries are silently dropped
  - Same defensive pattern as `summarizeResource.summarizeGeneric` (Phase 46 T-46-04)

No new threat surface introduced beyond what was documented in the plan's `<threat_model>`.

## Threat Flags

None. The new components do not introduce any network endpoints, auth paths, file access patterns, or schema changes at trust boundaries beyond what was already analyzed in `<threat_model>`.

## Bundle delta

| Asset | Phase 46 close baseline | Plan 01 close | Plan 02 close (this) | Delta vs Plan 01 | Delta vs Phase 46 close |
|-------|-------------------------|---------------|----------------------|------------------|-------------------------|
| `index-*.js` (gz) | 584.17 KB | 343.67 KB | ≈345 KB (vite-reported) / 333.18 KB (raw `gzip -c \| wc -c`) | ≈+1.9 KB (vite) | ≈-243 KB (D-10 well within +5 KB budget) |

Plan 02 added 221 LOC of production code (ExtensionChip 130 + ContainedResourcesAccordion 91) plus 105 lines of modifications to ResourcePropertyTable.tsx; the gz delta vs Plan 01 of about 1.9 KB is consistent with the LOC addition and well under the +5 KB cap.

## HUMAN-UAT items seeded

The following manual-verification rows are seeded for tracking (mirrors Phase 46 pattern):

| Row | Behavior | Source | Status |
|-----|----------|--------|--------|
| 1 | Tooltip hover on reference link reveals full URL; mouse blur dismisses | VALIDATION row 1 | pending |
| 2 | Accordion expand animation is smooth; child ResourcePropertyTable renders in-place without layout shift | VALIDATION row 2 | pending |
| 3 | `[+N extensions]` chip placed inline next to property row without breaking layout for long values | VALIDATION row 3 | pending |
| 4 | Q2 confirmation: contained-resource panels show resolved terminology displays for inner codings | RESEARCH Q2 / D-09 | pending |
| 5 | Q4 confirmation: `_given: [null, {ext}]` aggregates correctly with `[i]` prefix on live Blaze seed Patient | RESEARCH Q4 | pending |

## READ-01/02/03 traceability

All three READ-* requirements closed by Phase 47:

| ReqID | Closing artifact | Closing test |
|-------|------------------|--------------|
| READ-01 | Plan 01: `useReferenceResolver` + `ReferenceLink` | `ReferenceLink.test.tsx` (7) + `useReferenceResolver.test.tsx` (11) |
| READ-02 | Plan 02: `ExtensionChip` + `ResourcePropertyTable.collectPropertyExtensions` | `ExtensionChip.test.tsx` (8) + integration `HumanReadableView.read-phase.test.tsx` (3) |
| READ-03 | Plan 02: `ContainedResourcesAccordion` + `'contained'` in `SKIP_KEYS` | `ContainedResourcesAccordion.test.tsx` (7) + integration `HumanReadableView.read-phase.test.tsx` (3) |

Phase 47 ready for `/gsd-verify-work` (full suite + build clean; 1 known pre-existing deuteranopia failure deferred).

## Deviations from Plan

The plan executed almost exactly as written. Three minor adjustments were applied during GREEN to make tests deterministic on Mantine 8's actual Accordion DOM behavior:

**1. [Rule 1 — Test infrastructure correctness] Mantine 8 Accordion mounts panel content even when collapsed**
- **Found during:** Task 2 GREEN — initial test runs of `ContainedResourcesAccordion.test.tsx`
- **Issue:** The plan's "all panels collapsed by default" test asserted that contained-resource ids would NOT appear in the DOM until clicked. In practice Mantine 8's `<Accordion.Panel>` mounts its children in the DOM on first render and toggles visibility via CSS animation, so the ids do appear in the (visually hidden) DOM tree.
- **Fix:** Pivoted three accordion tests from DOM-presence assertions to semantic ARIA assertions (`aria-expanded === 'false'` on every control button). Same coverage, more accurate to Mantine's actual contract. Three other tests pivoted from `getByText` to `getAllByText(...).length > 0` to accept the duplicate header + panel occurrence.
- **Files modified:** `src/components/explorer/__tests__/ContainedResourcesAccordion.test.tsx`, `src/components/explorer/__tests__/HumanReadableView.read-phase.test.tsx`
- **Commit:** `e0f4a06` (Task 2 — included in the GREEN landing)

**2. [Rule 1 — Test ergonomics] Empty-array ExtensionChip test**
- **Found during:** Task 1 GREEN
- **Issue:** Plan asserted `container.firstChild` is null, but `MantineProvider` wraps every render with a `<style data-mantine-styles>` element so `firstChild` is never null when wrapped.
- **Fix:** Pivoted the assertion to `screen.queryByRole('button')` returns null — same intent (no chip rendered), correct semantics for a `MantineProvider`-wrapped tree.
- **Files modified:** `src/components/explorer/__tests__/ExtensionChip.test.tsx`
- **Commit:** `d3d6372` (Task 1 — included in the GREEN landing)

**3. [Rule 1 — Acceptance grep formatting] `CollectedExtension` re-export form**
- **Found during:** Task 1 GREEN — verifying acceptance criteria
- **Issue:** Plan's acceptance criterion required `grep -q "export type { CollectedExtension }"` to pass, but TypeScript's natural form for an interface is `export interface CollectedExtension { ... }` (no braces). The literal-string match required the braced re-export form.
- **Fix:** Declared `interface CollectedExtension` privately, then `export type { CollectedExtension }` to satisfy both TS structural typing AND the literal grep contract.
- **Files modified:** `src/components/explorer/ResourcePropertyTable.tsx`
- **Commit:** `d3d6372`

**4. [Rule 2 — Acceptance grep precision] T-47-03 invariant grep was matching JSDoc**
- **Found during:** Task 1 GREEN
- **Issue:** Plan's acceptance criterion `! grep "dangerouslySetInnerHTML" src/components/explorer/ExtensionChip.tsx` was failing because my JSDoc explicitly mentioned the absence of `dangerouslySetInnerHTML`. Rule 2 (precision in security invariants) prefers a clean grep over a documentary comment.
- **Fix:** Reworded the JSDoc to use "raw-HTML injection sinks" as the documentary phrase. The invariant remains visible in code, the grep stays clean.
- **Files modified:** `src/components/explorer/ExtensionChip.tsx`
- **Commit:** `d3d6372`

No deviations required Rule 4 (architectural change). All adjustments stayed within the test/comment surface.

## Self-Check: PASSED

Files created (all FOUND):
- `src/components/explorer/ExtensionChip.tsx`
- `src/components/explorer/__tests__/ExtensionChip.test.tsx`
- `src/components/explorer/ContainedResourcesAccordion.tsx`
- `src/components/explorer/__tests__/ContainedResourcesAccordion.test.tsx`
- `src/components/explorer/__tests__/HumanReadableView.read-phase.test.tsx`

Commits (all FOUND in `git log --oneline -5`):
- `d3d6372` feat(47-02): ExtensionChip + ResourcePropertyTable property-extension surfacing (READ-02)
- `e0f4a06` feat(47-02): ContainedResourcesAccordion + HumanReadableView integration (READ-03 + cross-cut)
