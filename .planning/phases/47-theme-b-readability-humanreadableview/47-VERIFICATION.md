---
phase: 47-theme-b-readability-humanreadableview
verified: 2026-05-01T17:55:00Z
status: human_needed
score: 5/5
overrides_applied: 0
human_verification:
  - test: "Tooltip hover on resolved reference link"
    expected: "Hovering over a resolved reference link reveals the full Reference.reference URL string (e.g. Patient/abc123) in a Mantine Tooltip. Moving the mouse away dismisses the tooltip."
    why_human: "Cannot verify Mantine Tooltip hover behavior (openDelay=400ms, CSS pointer interaction) in jsdom tests."
  - test: "Accordion expand animation"
    expected: "Clicking an Accordion.Control in ContainedResourcesAccordion smoothly expands the panel. A full ResourcePropertyTable for the contained resource renders in-place without layout shift."
    why_human: "JSDOM does not execute CSS transitions/animations; jsdom Mantine Accordion mounts panel content eagerly. Smooth animation requires live Blaze data in a real browser."
  - test: "ExtensionChip inline layout with long property values"
    expected: "The [+N extensions] chip renders inline next to the property value without overflowing or wrapping in a way that breaks the table row layout."
    why_human: "Layout/overflow behavior requires a real browser rendering engine; jsdom has no layout engine."
  - test: "Terminology displays inside contained-resource panels"
    expected: "After expanding a contained-resource accordion panel, CodeableConcept coding.display values resolved by the terminology server appear correctly (Q2: parent useResolvedResource covers them)."
    why_human: "Requires live Blaze server with terminology server connected."
  - test: "Indexed-primitive _given extension chip on live seed Patient"
    expected: "A FHIR Patient resource with _given: [null, {extension:[...]}] shows the [+N extensions] chip on the given row; expanding reveals entries with [0], [1] prefixes correctly."
    why_human: "Requires live Blaze seed data with indexed primitive extensions."
---

# Phase 47: Theme B — Readability: HumanReadableView — Verification Report

**Phase Goal:** Make `HumanReadableView` self-sufficient — references resolve to human-readable summaries inline, property-level extensions are reachable without dropping into raw JSON, and contained resources render in-place.
**Verified:** 2026-05-01T17:55:00Z
**Status:** human_needed
**Re-verification:** No — initial verification

## Goal Achievement

### Observable Truths (ROADMAP Success Criteria)

| # | Truth | Status | Evidence |
|---|-------|--------|----------|
| 1 | Reference fields in HumanReadableView display `summarizeResource(target).primary` inline; full URL accessible on hover; rendered text is a clickable link to `/explorer/{type}/{id}` | VERIFIED | `ReferenceLink.tsx` resolved-state renders `summarizeResource(resource).primary` in `<Anchor href="/explorer/Type/id">` wrapped in `<Tooltip label={reference}>`. Tests: "resolved: renders summarizeResource(target).primary in Anchor with /explorer href" passes. |
| 2 | Session-level `Map<${type}/${id}, Resource \| null>` cache — repeat references hit cache; failed lookups silently fall back, NO error toast | VERIFIED | `useReferenceResolver.ts` maintains `referenceCache` (module-scoped Map). Cache-hit test shows second consumer gets synchronous `resolved` with 0 extra `readResource` calls. 404 + network-error tests confirm no `notifications.show` or `console.error` fired. |
| 3 | Property-level extensions are reachable from the human-readable surface — at least one affordance surfaces them without switching to JSON tab | VERIFIED | `ExtensionChip.tsx` renders a `[+N extensions]` button inline in every property row with `_K.extension[]` sibling data. Click expands URL + value inline. Tests: click-expand, nested-recursion, indexed-primitive `[i]` prefix all pass. |
| 4 | Contained resources render inline; each shows `summarizeResource()` output; expandable to full ResourcePropertyTable; no JSON-modal fall-through | VERIFIED | `ContainedResourcesAccordion.tsx` mounts in `HumanReadableView` between property table and ExtensionsSection. `'contained'` added to `SKIP_KEYS`. Accordion is `multiple variant="separated"` with no `defaultValue` (collapsed by default). Tests: summary header, expand-to-table, id-fallback all pass. |
| 5 | Tests cover cache hit/miss/fallback for READ-01, extension-surface presence for READ-02, contained-resource render path for READ-03; full suite passes; `npm run build` clean | VERIFIED | 54 Phase-47-specific tests across 6 suites, all passing. Full suite: 1346 passing / 1 pre-existing deuteranopia failure (Phase 40 carry-over, not a regression). `npx tsc -b --noEmit` exit 0. `npm run build` exit 0 (bundle 345 KB gz — well under +5 KB budget). |

**Score:** 5/5 truths verified

### Required Artifacts

| Artifact | Expected | Status | Details |
|----------|----------|--------|---------|
| `src/utils/referenceUrl.ts` | `normalizeReference` + `buildExplorerHref` + `isValidFhirReference` | VERIFIED | 64 LOC, all 3 functions exported, 16 unit tests passing |
| `src/hooks/useReferenceResolver.ts` | Session-level cache hook + `ReferenceResolution` interface + `__resetReferenceCache` | VERIFIED | 113 LOC, all exports present, cache Map NOT exported (D-03 confirmed), 11 tests passing |
| `src/components/explorer/ReferenceLink.tsx` | 4-state visual machine (pending/resolved/failed/fragment) | VERIFIED | 141 LOC, `useReferenceResolver` called unconditionally above early-returns (CR-01 fix), 7+1 regression tests passing |
| `src/components/explorer/ExtensionChip.tsx` | Inline chip with expand + nested recursion (READ-02) | VERIFIED | 130 LOC, `useState`/`useId` called unconditionally above early-returns (CR-02 fix), 8+1 regression tests passing |
| `src/components/explorer/ContainedResourcesAccordion.tsx` | Mantine Accordion for `Resource.contained[]` (READ-03) | VERIFIED | 91 LOC, `Accordion multiple variant="separated"`, no `defaultValue`, 7 tests passing |
| `src/components/explorer/__tests__/HumanReadableView.read-phase.test.tsx` | D-09 cross-cut integration test | VERIFIED | 3 tests: all three Phase 47 affordances render together; render order correct; plain resource renders cleanly |
| `src/quality/referenceWalker.ts` | Back-compat re-export of `normalizeReference` | VERIFIED | `export { normalizeReference } from '../utils/referenceUrl'` at line 23; internal `normalizeReference` function deleted (0 local definitions) |

### Key Link Verification

| From | To | Via | Status | Details |
|------|-----|-----|--------|---------|
| `ReferenceLink.tsx` | `useReferenceResolver.ts` | `useReferenceResolver(isFragment ? undefined : reference)` | WIRED | Line 58-60: hook called unconditionally; fragment refs pass `undefined` |
| `ResourcePropertyTable.tsx` | `ReferenceLink.tsx` | `<ReferenceLink reference={...} display={...} parentResource={...}/>` | WIRED | Lines 119-124: Reference branch in `RenderValue` uses `<ReferenceLink>` |
| `useReferenceResolver.ts` | `referenceUrl.ts` | `normalizeReference` + `isValidFhirReference` imported | WIRED | Line 25: `import { normalizeReference, isValidFhirReference } from '../utils/referenceUrl'` |
| `referenceWalker.ts` | `referenceUrl.ts` | `export { normalizeReference }` re-export for back-compat | WIRED | Line 23: re-export confirmed; original helper deleted |
| `HumanReadableView.tsx` | `ContainedResourcesAccordion.tsx` | `<ContainedResourcesAccordion resource={display}/>` between property table and ExtensionsSection | WIRED | Lines 6 (import) and 35 (render); DOM order verified by integration test |
| `ContainedResourcesAccordion.tsx` | `summarizeResource.ts` | `summarizeResource(c).primary` as accordion header text | WIRED | Line 49 (import), line 74: `summarizeResource(c).primary` in header |
| `ContainedResourcesAccordion.tsx` | `ResourcePropertyTable.tsx` | `<ResourcePropertyTable resource={c} parentResource={resource}/>` in each panel | WIRED | Lines 50 (import), line 83: `<ResourcePropertyTable>` in `Accordion.Panel` |
| `ResourcePropertyTable.tsx` | `ExtensionChip.tsx` | `<ExtensionChip extensions={collected}/>` when `collected.length > 0` | WIRED | Lines 6 (import), line 399: `<ExtensionChip>` in property row |

### Data-Flow Trace (Level 4)

| Artifact | Data Variable | Source | Produces Real Data | Status |
|----------|--------------|--------|-------------------|--------|
| `ReferenceLink.tsx` | `resource` from `useReferenceResolver` | `client.readResource(type, id)` via `fetchReference` in `useReferenceResolver.ts` | Yes — `client.readResource` is a live FHIR fetch; resolved to actual `Resource` objects | FLOWING |
| `ContainedResourcesAccordion.tsx` | `contained` array | `resource.contained` prop (passed from `HumanReadableView`) | Yes — derived directly from the FHIR resource; not hardcoded | FLOWING |
| `ExtensionChip.tsx` | `extensions` array | `collectPropertyExtensions(value, sibling)` in `ResourcePropertyTable.tsx` | Yes — reads `_K.extension[]` siblings from the actual resource at render time | FLOWING |

### Behavioral Spot-Checks

| Behavior | Command | Result | Status |
|----------|---------|--------|--------|
| Phase 47 test suites: 54 tests pass | `npx vitest run [6 test files]` | 6 files, 54 tests, 0 failures | PASS |
| Full test suite green (except known deuteranopia) | `npm test` | 1346 passing, 1 failing (pre-existing pair #13) | PASS |
| TypeScript compiles clean | `npx tsc -b --noEmit` | Exit 0, no output | PASS |
| Bundle builds clean within +5 KB budget | `npm run build` | index.js 345.52 KB gz (baseline 584.17 KB; well under +5 KB budget) | PASS |
| D-03: `referenceCache` Map not exported | `grep -q "^export const referenceCache" src/hooks/useReferenceResolver.ts` | Not found | PASS |
| D-02: No toast/console.error on failure | `grep -n "console.error|notifications.show" src/hooks/useReferenceResolver.ts` | Only in JSDoc comment (not executable) | PASS |
| T-47-03: No dangerouslySetInnerHTML | `grep -rn "dangerouslySetInnerHTML" src/components/explorer/{ExtensionChip,ContainedResourcesAccordion,ReferenceLink}.tsx` | Nothing found | PASS |
| READ-03 SKIP_KEYS invariant | `grep -n "'contained'" src/components/explorer/ResourcePropertyTable.tsx` | Line 31: `'contained'` in `SKIP_KEYS` | PASS |

### Requirements Coverage

| Requirement | Source Plan | Description | Status | Evidence |
|-------------|------------|-------------|--------|---------|
| READ-01 | 47-01-PLAN.md | Reference fields auto-resolve to `summarizeResource(target).primary`; session cache; silent 404 fallback | SATISFIED | `useReferenceResolver.ts` + `ReferenceLink.tsx` fully ship the requirement; 18 hook + component tests pin all D-09 READ-01 behaviors (cache miss/hit/404/network/dedup/normalization/fragment/urn/invalid-id) |
| READ-02 | 47-02-PLAN.md | Property-level extensions surfaced from human-readable view without JSON tab | SATISFIED | `ExtensionChip.tsx` + `collectPropertyExtensions` in `ResourcePropertyTable.tsx` surface `_K.extension[]` siblings inline; click-to-expand; nested recursion; indexed-primitive `[i]` prefix; 8 chip tests + integration test |
| READ-03 | 47-02-PLAN.md | `Resource.contained[]` renders inline in human-readable view; each shows `summarizeResource()`; expandable to ResourcePropertyTable; no JSON-modal fall-through | SATISFIED | `ContainedResourcesAccordion.tsx` mounts in `HumanReadableView`; `'contained'` in `SKIP_KEYS`; collapsed by default; 7 accordion tests + integration test |

No orphaned requirements: all three READ-* IDs claimed by Phase 47 plans, all satisfied.

### Anti-Patterns Found

| File | Line | Pattern | Severity | Impact |
|------|------|---------|----------|--------|
| None | — | — | — | — |

Scanned all 7 new/modified production files. No TODO/FIXME/PLACEHOLDER comments, no empty return stubs, no hardcoded empty data flows, no dangerouslySetInnerHTML. All hook-order violations from the original implementation were fixed in commit `3050e8c` with regression tests added.

### Human Verification Required

#### 1. Tooltip Hover on Resolved Reference Link

**Test:** Open a FHIR resource in the explorer that has Reference fields (e.g., an Observation with `subject`). Wait for references to resolve (a few seconds). Hover over the resolved summary text (e.g., the patient's name).
**Expected:** A Mantine Tooltip appears showing the full `Reference.reference` string (e.g., `Patient/abc123`). Moving the mouse away dismisses the tooltip within ~400ms.
**Why human:** Mantine Tooltip `openDelay={400}` requires real pointer interaction; jsdom has no pointer/hover model.

#### 2. Accordion Expand Animation Smoothness

**Test:** Open a FHIR resource with `Resource.contained[]` entries. Observe the "Contained Resources" section. Click an accordion header to expand it.
**Expected:** The panel expands smoothly (no layout shift, no flickering). A full ResourcePropertyTable for the contained resource renders in-place. Clicking again collapses it.
**Why human:** CSS transitions and animation smoothness cannot be verified in jsdom; the lab confirmed Mantine 8 Accordion mounts panel DOM eagerly (collapsed via CSS, not mount/unmount).

#### 3. ExtensionChip Inline Layout

**Test:** Open a FHIR resource that has property-level extensions (e.g., a Patient with `_birthDate.extension` or a MII-profile resource with many `_*` sibling extensions). Observe the rendered property rows.
**Expected:** The `[+N extensions]` chip appears inline below the property value without causing the table column to overflow or the row to break unexpectedly. All long values + chips should remain readable.
**Why human:** CSS layout / overflow behavior requires a real browser rendering engine.

#### 4. Terminology Displays Inside Contained-Resource Panels

**Test:** Open a FHIR resource with `contained[]` entries that themselves contain CodeableConcepts with LOINC/SNOMED codes. Expand the contained-resource accordion panel. Check that coding.display values are resolved (show German display text from the terminology server, not just raw codes).
**Expected:** The terminology server resolution from the parent's `useResolvedResource` wrapper covers codings inside contained resources (Q2 resolution confirmed by code trace of `collectCodings` in `src/terminology/walker.ts`).
**Why human:** Requires live Blaze + terminology server; Q2 verification was done by code inspection only.

#### 5. Indexed-Primitive `_given` Extension Chip on Live Seed Patient

**Test:** Use a Blaze seed Patient with `_given: [null, {extension: [{url: "...", valueCode: "..."}]}]` in their name array. Navigate to the patient's human-readable view. Observe the `given` property row.
**Expected:** A chip like `+ 1 extension` appears on the `given` row. Clicking expands to show `[1] http://...url...` with the extension value below (the `[1]` index prefix indicating array slot 1).
**Why human:** Requires live Blaze seed data with indexed primitive extensions; synthetic test fixture only covers the component in isolation.

### Deferred Items

None. All Phase 47 must-haves are satisfied. No items deferred to later phases.

### Gaps Summary

No gaps. All 5 ROADMAP success criteria are verified against the codebase. The phase goal is fully achieved: `HumanReadableView` is self-sufficient.

The `human_needed` status reflects the 5 Mantine + Blaze UAT items above — these are interaction and live-server checks that automated tooling cannot replace, not gaps in the implementation itself.

---

_Verified: 2026-05-01T17:55:00Z_
_Verifier: Claude (gsd-verifier)_
