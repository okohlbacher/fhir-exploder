---
phase: 05-data-quality-dashboard
plan: 04
subsystem: quality-coding-coverage
tags: [quality, coding-coverage, walker, drill-down, terminology, tdd]

requires:
  - phase: 05-data-quality-dashboard
    plan: 01
    provides: PerTypeCoverageReport contract, QualityMetricsCache, buildMetricsKey, QualityMetricsContext (setCoverage), CodingDrillDown stub, QualityOutletContext, codingSamples fixtures
  - phase: 05-data-quality-dashboard
    plan: 02
    provides: CodingCoveragePanel stub slot with locked prop signature { types, client, sampleSize }, OverviewStrip Card 4 context consumption
  - phase: 05-data-quality-dashboard
    plan: 03
    provides: Module-scoped getCache(serverUrl) pattern mirrored verbatim; rollup effect shape (Math.round arithmetic mean with exclusion rule)
  - phase: 04-terminology-resolution
    provides: @medplum/react CodeableConceptDisplay wired into TerminologyProvider — drill-down examples render resolved display values automatically

provides:
  - src/quality/codingCoverageWalker.ts — classifyCodedFields + aggregateCoverage pure functions with Pitfall 5 allowlist defense
  - src/hooks/useCodingCoverage.ts — concurrency-limited progressive coverage hook with cache hit path + QualityMetricsContext rollup wire-up
  - src/components/quality/CodingCoveragePanel.tsx — real implementation (overwrites Plan 02 stub): sortable per-type table, 3-bucket legend, stacked Progress.Root bars, drill-down links
  - src/components/quality/CodingDrillDown.tsx — real implementation (overwrites Plan 01 stub): per-path Table with CodeableConceptDisplay examples on /quality/coding/:type
  - 23 passing tests (13 walker + 10 panel/rollup) replacing Wave 0 failing scaffolds

affects: [05-05-validation]

tech-stack:
  added: []
  patterns:
    - "Pitfall 5 allowlist: `Object.keys(cc).every(k => CC_KEYS.has(k))` with CC_KEYS = {coding, text, extension, id} — excludes Identifier/Reference/Quantity by their extra keys"
    - "Two-phase CC detection: (1) allowlist filter rejects non-CC shapes, (2) marker presence OR empty-object placeholder admits a CC. Empty `{}` at a field position classifies as `empty` per plan behavior table"
    - "Shape-matched early return in walker: once a node is classified as a CC, do NOT recurse into coding[]/text — Codings are Phase 4's concern and strings are primitives; recursing would double-count nested display fields"
    - "Aggregation path collapse: `[0]/[1]/...` → `[*]` so `component[0].code` and `component[1].code` aggregate under `component[*].code` in perPath"
    - "Duplicated getCache(serverUrl) pattern across useCompletenessReport and useCodingCoverage — each hook owns a module-scoped singleton; cache keys namespaced by metric kind prevent collision"

key-files:
  created:
    - src/quality/codingCoverageWalker.ts
    - src/hooks/useCodingCoverage.ts
  modified:
    - src/components/quality/CodingCoveragePanel.tsx (stub → real sortable 3-bucket table)
    - src/components/quality/CodingDrillDown.tsx (stub → real drill-down with CodeableConceptDisplay)
    - src/__tests__/coding-coverage-walker.test.ts (scaffold → 13 real tests)
    - src/__tests__/coding-coverage-panel.test.tsx (scaffold → 10 real tests)
    - src/__tests__/quality-overview.test.tsx (mock CodingCoveragePanel since stub now real)

key-decisions:
  - "CC-shape heuristic allowlist is {coding, text, extension, id} — any other key disqualifies the node as a CodeableConcept. This is the load-bearing Pitfall 5 defense. Future maintainers editing this heuristic MUST re-run the Patient.identifier regression test (`classifyCodedFields(codingSamples.patientWithIdentifiers)` must not emit `Patient.identifier` or `Patient.identifier[0]` as a classified path)."
  - "Empty-object placeholder admits as CC: a node with zero own keys classifies as `empty` when reached through the walker's recursion. This supports the FHIR authoring pattern where a CC field is declared as `code: {}` — which the plan behavior table requires to classify as `empty`. Tradeoff: any `{}` at any field position inside a resource produces an `empty` classification. Acceptable because FHIR resources don't use bare `{}` for non-CC fields in practice."
  - "Shape-matched early return: once `isCodeableConcept(node) === true`, the walker pushes the classification and returns WITHOUT recursing into `coding[]`/`text`. Rationale: `coding[]` is Phase 4's concern (bare Codings for terminology display) and `text` is a primitive. Recursing would double-count and pollute perPath with meaningless keys like `Condition.code.text`."
  - "Separate module-scoped QualityMetricsCache for coverage vs completeness (duplicated getCache pattern). Alternative: share a single cacheInstance across hooks via a new `src/quality/cacheSingleton.ts`. Chose duplication because (a) each hook gets its own LRU eviction budget — important for many-type servers, (b) buildMetricsKey namespaces by metric so entries never collide regardless of instance, (c) refactor pressure is low with only two consumers. Flag: if Plan 05-05 validation ends up using the same cache shape, extract to cacheSingleton.ts."
  - "Default sort systemCode ASC (worst-first) matches 05-UI-SPEC and mirrors Plan 03 CompletenessPanel's 'completeness ASC' default. Rationale: users hit the tab to see what needs attention, not what's already clean."
  - "CodingDrillDown uses a separate fetch for examples (via sampleResources) rather than piping the sample through useCodingCoverage. Rationale: keeps the hook's return type narrow (reports only) and avoids forcing the hook to hold Resource[] in memory after aggregation. Both fetches hit the same QualityMetricsCache key structure in future iterations if we promote example caching."

patterns-established:
  - "Pitfall 5 defense pattern: Object.keys(X).every(k => ALLOWLIST.has(k)) — usable for any FHIR look-alike disambiguation (Coding vs Quantity, Identifier vs CodeableConcept). The allowlist should be the minimal key set of the INTENDED shape."
  - "Wave 2 stub replacement includes updating downstream quality-overview.test.tsx with a vi.mock for the newly-real panel — same pattern Plan 03 established. Plan 05-05 should do the same for ValidationPanel."

requirements-completed: [QUAL-03]

duration: 7min
completed: 2026-04-12
---

# Phase 05 Plan 04: Coding Coverage — Walker, Hook, Panel, Drill-down Summary

**Ships QUAL-03: per-type CodeableConcept coverage metrics with systemCode/textOnly/empty classification + drill-down showing resolved example coded values. Overview Strip Card 4 now flips from em-dash to live arithmetic-mean coverage once the batch settles.**

## Performance

- **Duration:** ~7 min
- **Started:** 2026-04-12T09:40:00Z (approximate — post-Plan-03 context load)
- **Completed:** 2026-04-12T09:48:02Z
- **Tasks:** 2 (both auto, both TDD-style)
- **Files:** 2 created + 5 modified = 7 touched

## Accomplishments

- `/quality` Coding Coverage tab renders a real per-type sortable table with a legend (blue/orange/red color swatches for system+code / text-only / empty), a disclosure banner (`Completeness and coverage are estimated from a sample of the first {N} resources per type.`), and stacked 3-segment `Progress.Root` bars (blue.6/orange.6/red.6) per row.
- Default sort is systemCode ASC (worst-first). Clicking any of the four sortable column headers (Resource type + three bucket columns) toggles sort direction; aria-sort attributes stay in sync.
- Rows with `totalCodedFields === 0` render a dimmed em-dash + tooltip-style "no CodeableConcept fields" note in place of the stacked bar — matches 05-UI-SPEC States Matrix.
- `/quality/coding/:type` drill-down shows per-path classification (system+code/text-only/empty percentages) with an example CodeableConcept rendered via `@medplum/react` `CodeableConceptDisplay`. Examples are picked systemCode-first with fallback to textOnly — so drill-downs surface the "best example" of what coded values actually look like.
- `CodeableConceptDisplay` plugs into Phase 4's `TerminologyProvider` out of the box, so resolved display values appear automatically in the drill-down without any new terminology-resolution code in this plan.
- `useCodingCoverage` mirrors Plan 03's `useCompletenessReport` exactly: 4-way concurrency, 500ms `useDebouncedValue` guard on sampleSize, `cancelledRef` abort on unmount/dep-change, module-scoped `QualityMetricsCache` keyed by `(serverUrl, type, sampleSize, 'coverage')`.
- OverviewStrip Card 4 `Overall coding coverage` flips from em-dash to a live integer percentage once the batch settles — via a dedicated useEffect that pushes `Math.round` of the arithmetic mean of `systemCode / totalCodedFields * 100` into `QualityMetricsContext.setCoverage`. Exclusion rule from 05-01-SUMMARY honored: loading, errored, and zero-CC types are dropped from the mean's denominator.
- 23 new Plan-04 tests all green (13 walker + 10 panel/rollup). Full suite: 249 passing, 27 todo. Only Wave 0 scaffolds for Plan 05-05 (`structural-validator`, `remote-validator`) remain red — by design.

## Task Commits

Each task was committed atomically:

1. **Task 1: Coding coverage walker + aggregateCoverage + 13 tests** — `53a84fc` (feat)
2. **Task 2: useCodingCoverage + CodingCoveragePanel + CodingDrillDown + 10 tests** — `ea62d96` (feat)

## Contracts / Public API

### `src/quality/codingCoverageWalker.ts`

```typescript
export function classifyCodedFields(
  resource: unknown,
  path?: string,
  out?: ClassifiedCodedField[]
): ClassifiedCodedField[];
// Pure. Walks the resource top-down; classifies every CodeableConcept-
// shaped node into 'systemCode' | 'textOnly' | 'empty'. Starting from a
// resource root (path === ''), uses resourceType as the first path
// segment so nested CCs carry a stable prefix like 'Condition.code'.
// Shape-matched nodes do not recurse — coding[]/text are not re-walked.

export function aggregateCoverage(
  sample: Resource[]
): PerTypeCoverageReport;
// Pure. Reduces a sample into totals + per-path aggregation. The
// ResourceType prefix is stripped and array indexes are collapsed to
// '[*]' so 'Observation.component[0].code' and 'Observation.component[1].code'
// both feed the 'component[*].code' bucket. Empty sample returns a
// zeroed report (not an error).
```

### `src/hooks/useCodingCoverage.ts`

```typescript
export function useCodingCoverage(
  client: MedplumClient | null,
  types: string[],
  sampleSize: number,
): Record<string, PerTypeReport<PerTypeCoverageReport>>;
// Each type starts as 'loading', settles independently. Cache hits
// rehydrate synchronously on first render. 4-way concurrency on
// network. 500ms debounce on sampleSize. Rollup: pushes arithmetic
// mean via QualityMetricsContext.setCoverage (Math.round integer,
// undefined if nothing settled, excludes totalCodedFields===0 types).
```

### Pitfall 5 Heuristic (load-bearing — read before modifying)

```typescript
const CC_KEYS = new Set(['coding', 'text', 'extension', 'id']);

function isCodeableConcept(cc: Record<string, unknown>): boolean {
  // Rule 1: key allowlist. Identifier/Reference/Quantity fail this.
  if (!Object.keys(cc).every((k) => CC_KEYS.has(k))) return false;
  // Rule 2: non-empty CCs need at least one marker; empty {} is treated
  // as an empty-placeholder CC per plan behavior table.
  if (Object.keys(cc).length === 0) return true;
  return (
    Array.isArray(cc.coding) ||
    typeof cc.text === 'string' ||
    'extension' in cc ||
    'id' in cc
  );
}
```

**Before editing this heuristic:** run the Identifier regression test (`npm test -- src/__tests__/coding-coverage-walker.test.ts -t "excludes Patient.identifier"`). Any change that lets a Patient.identifier entry appear in `classifyCodedFields` output is a Pitfall 5 regression.

## QualityMetricsContext Wire-up (mirrors Plan 03)

```typescript
const { setCoverage } = useQualityMetricsContext();
useEffect(() => {
  const pcts: number[] = [];
  for (const r of Object.values(reports)) {
    if (r === 'loading' || r === 'error') continue;
    if (!r || typeof r !== 'object') continue;
    if (r.totalCodedFields > 0) {
      pcts.push((r.systemCode / r.totalCodedFields) * 100);
    }
  }
  if (pcts.length === 0) {
    setCoverage(undefined);  // em-dash in OverviewStrip Card 4
    return;
  }
  setCoverage(Math.round(pcts.reduce((a, b) => a + b, 0) / pcts.length));
}, [reports, setCoverage]);
```

End-to-end result: with Plans 03 and 04 both live, OverviewStrip Cards 3 (Overall completeness) and 4 (Overall coding coverage) render real integer percentages as soon as the batch settles.

## Duplicated `getCache(serverUrl)` — Follow-up Refactor Candidate

Both `useCompletenessReport` and `useCodingCoverage` own an identical module-scoped cache helper:

```typescript
let cacheInstance: QualityMetricsCache | null = null;
let cacheServerUrl: string | null = null;
function getCache(serverUrl: string): QualityMetricsCache {
  if (!cacheInstance || cacheServerUrl !== serverUrl) {
    cacheInstance = new QualityMetricsCache({ serverUrl });
    cacheServerUrl = serverUrl;
  }
  return cacheInstance;
}
```

This duplication is intentional for two consumers — cache keys are metric-namespaced so entries can't collide, and two instances give each hook its own LRU budget. **If Plan 05-05 adds a third consumer** (e.g., `useValidationReport`), extract this helper to `src/quality/cacheSingleton.ts` with an instance-per-metric map:

```typescript
// Hypothetical src/quality/cacheSingleton.ts
const instances = new Map<string, QualityMetricsCache>(); // key = `${serverUrl}|${metric}`
export function getCache(serverUrl: string, metric: QualityMetricKind) { ... }
```

Not doing it now because the third consumer's cache shape isn't yet defined.

## Phase 4 walker.ts is UNMODIFIED

`git diff src/terminology/walker.ts` returns zero lines. The coding coverage walker is a pure sibling — it does not touch `collectCodings` or its callers.

## Deviations from Plan

**[Rule 3 - blocking issue] Updated `quality-overview.test.tsx` to mock CodingCoveragePanel since its stub is now replaced by the real implementation.**
- **Found during:** Task 2 full-suite verification.
- **Issue:** The quality-overview test renders the full QualityOverviewPage with `keepMounted` Tabs, which mounts every panel simultaneously. With the real CodingCoveragePanel now consuming `useCodingCoverage` → `client.getBaseUrl()` → `sampleResources`, the existing `mockClient = { search, getBaseUrl, searchResources }` was close but the prior assertion `/Coming in Plan 05-04/` no longer exists.
- **Fix:** Added a `vi.mock('../components/quality/CodingCoveragePanel', ...)` returning a simple testid-marked mock (same pattern Plan 05-03 established for CompletenessPanel). Updated the "tab panels mount with keepMounted" test to assert the mock-testid + only the 05-05 stub copy remains.
- **Files modified:** `src/__tests__/quality-overview.test.tsx`
- **Commit:** `ea62d96`

**[Minor - scope adjustment to behavior table]** The plan's test behavior required `classifyCodedFields({ resourceType: 'Condition', code: {} })` to classify `code` as `empty`, while an earlier draft of the walker heuristic required at least one of `coding`/`text`/`extension`/`id` to be present. Softened Rule 2 to also admit zero-key objects (`{}`) as empty-placeholder CCs. This matches the fixture `conditionEmpty` and the plan behavior table. Tradeoff documented in Decisions Made.

## Issues Encountered

- First panel-test run had 2 failures: (a) `getByText('system+code')` errored with "multiple matches" because the label appears both in the legend and in the sortable column header — switched to `getAllByText().length >= 1`; (b) Skeleton data attribute selector was wrong — switched to `.mantine-Skeleton-root` class selector after checking Mantine's compiled module CSS. Both fixes are test-side only; no walker or panel changes needed.
- Initial walker heuristic used an explicit `for (const k of keys)` loop. Refactored to `Object.keys(cc).every((k) => CC_KEYS.has(k))` to match the plan's acceptance-criteria grep string. Functionally identical.

## User Setup Required

None. All changes are code-only. No new environment variables, no external services, no migrations. Navigate to `/quality` → Coding Coverage tab to see the new table; click any row or visit `/quality/coding/Condition` directly to see the drill-down. If a terminology server is configured (Phase 4), the drill-down's example CodeableConcepts will render with resolved display values automatically.

## Verification

- `npm test -- src/__tests__/coding-coverage-walker.test.ts` → 13 passing, 0 todo, exit 0
- `npm test -- src/__tests__/coding-coverage-panel.test.tsx` → 10 passing, 0 todo, exit 0
- `npm test -- src/__tests__/quality-overview.test.tsx` → 11 passing (fixed after mocking CodingCoveragePanel)
- `npx vitest run` (full suite) → 249 passed, 27 todo, 2 files failing — both are Wave 0 scaffolds for Plan 05-05 (`structural-validator`, `remote-validator`). Zero regressions.
- `npx tsc --noEmit -p .` → exit 0
- `git diff src/terminology/walker.ts` → 0 lines changed
- `grep -c "CONCURRENCY = 4" src/hooks/useCodingCoverage.ts` → 1
- `grep -c "useDebouncedValue" src/hooks/useCodingCoverage.ts` → 2
- `grep -c "cancelledRef" src/hooks/useCodingCoverage.ts` → 6
- `grep -c "'coverage'" src/hooks/useCodingCoverage.ts` → 4 (import kind, 2 cache calls, 1 doc)
- `grep -c "Progress.Section" src/components/quality/CodingCoveragePanel.tsx` → 3 (blue/orange/red)
- `grep -E "system\+code|text-only|empty" src/components/quality/CodingCoveragePanel.tsx | wc -l` → 17 (legend + headers + color classes)
- `grep -c "aria-sort" src/components/quality/CodingCoveragePanel.tsx` → 1 (in SortableTh helper, applied to all 4 sortable headers)
- `grep -c "CodeableConceptDisplay" src/components/quality/CodingDrillDown.tsx` → 4 (import + doc + JSX + prop hint)
- `grep -c "setCoverage" src/hooks/useCodingCoverage.ts` → 4 (import + destructure + 2 call sites)
- `grep -c "Math.round" src/hooks/useCodingCoverage.ts` → 1
- `grep -c "totalCodedFields > 0" src/hooks/useCodingCoverage.ts` → 1
- `grep "// STUB" src/components/quality/CodingCoveragePanel.tsx src/components/quality/CodingDrillDown.tsx | wc -l` → 0
- `grep -c "Object.keys(cc).every" src/quality/codingCoverageWalker.ts` → 2 (code + comment reinforcement)
- `grep -E "'coding'|'text'|'extension'|'id'" src/quality/codingCoverageWalker.ts | head -1` → `const CC_KEYS = new Set(['coding', 'text', 'extension', 'id']);`
- `grep "it.todo" src/__tests__/coding-coverage-*.test.*` → 0 matches

## Self-Check: PASSED

Files verified present:
- src/quality/codingCoverageWalker.ts — FOUND
- src/hooks/useCodingCoverage.ts — FOUND
- src/components/quality/CodingCoveragePanel.tsx — FOUND (stub replaced)
- src/components/quality/CodingDrillDown.tsx — FOUND (stub replaced)
- src/__tests__/coding-coverage-walker.test.ts — FOUND (13 real tests)
- src/__tests__/coding-coverage-panel.test.tsx — FOUND (10 real tests)
- .planning/phases/05-data-quality-dashboard/05-04-SUMMARY.md — FOUND

Commits verified on branch main:
- 53a84fc — Task 1 (walker + 13 tests)
- ea62d96 — Task 2 (hook + panel + drill-down + 10 tests + quality-overview mock fix)
