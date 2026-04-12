---
phase: 05-data-quality-dashboard
plan: 03
subsystem: quality-completeness
tags: [quality, completeness, walker, profiles, sampling, drill-down, tdd]

requires:
  - phase: 05-data-quality-dashboard
    plan: 01
    provides: PerTypeCompletenessReport contract, QualityMetricsCache, buildMetricsKey, QualityMetricsContext (setCompleteness), CompletenessDrillDown stub, QualityOutletContext
  - phase: 05-data-quality-dashboard
    plan: 02
    provides: CompletenessPanel stub slot with locked prop signature { types, client, sampleSize }, OverviewStrip Card 3 context consumption
  - phase: 02-resource-explorer
    provides: useResourceCounts worker-pool pattern (CONCURRENCY=4, cancelledRef)
  - phase: 04-terminology-resolution
    provides: Module-scoped cache singleton pattern with localStorage mirror (TerminologyCache ancestry)

provides:
  - src/quality/profiles/*.json — 7 trimmed MII StructureDefinitions (Condition, Observation, Patient, Procedure, MedicationStatement, Encounter, Consent)
  - src/quality/profiles/index.ts — getProfileForType + BUNDLED_PROFILE_TYPES registry
  - src/quality/completenessWalker.ts — requiredElementPaths, isPathPopulated, computeCompleteness (pure functions)
  - src/hooks/useCompletenessReport.ts — concurrency-limited progressive sampling hook with cache hit path and QualityMetricsContext rollup wire-up
  - src/components/quality/CompletenessPanel.tsx — real implementation (overwrites Plan 02 stub): sortable per-type table with RingProgress, disclosure banner, drill-down links
  - src/components/quality/CompletenessDrillDown.tsx — real implementation (overwrites Plan 01 stub): per-field Progress rows on /quality/completeness/:type
  - 30 passing tests (20 walker + 10 hook) replacing Wave 0 failing scaffolds

affects: [05-04-coverage, 05-05-validation]

tech-stack:
  added: []
  patterns:
    - "Bundle-time MII profiles via Vite JSON imports — `resolveJsonModule` implicit under moduleResolution=bundler; no runtime fetch per RESEARCH Pitfall 7"
    - "Module-scoped QualityMetricsCache singleton keyed by serverUrl; rebuilt on URL change. Plan 04 coverage hook should reuse this pattern verbatim (different metric key via buildMetricsKey prevents collision)"
    - "Hook-level debounce (useDebouncedValue 500ms) on sampleSize — SampleSizeControl stays stateless so each consumer hook applies its own cadence"
    - "Choice-type `value[x]` walking: path segment ending in `[x]` strips the suffix and probes any key on the parent starting with the prefix (Pitfall 3)"
    - "Rollup side-effect: a dedicated useEffect over reports map computes arithmetic mean over settled positive-denominator entries and pushes into QualityMetricsContext — undefined when nothing has settled, rounded integer otherwise"

key-files:
  created:
    - src/quality/profiles/Condition-diagnose.json
    - src/quality/profiles/Observation-laborbefund.json
    - src/quality/profiles/Patient-person.json
    - src/quality/profiles/Procedure-prozedur.json
    - src/quality/profiles/MedicationStatement-medikation.json
    - src/quality/profiles/Encounter-fall.json
    - src/quality/profiles/Consent-consent.json
    - src/quality/profiles/index.ts
    - src/quality/completenessWalker.ts
    - src/hooks/useCompletenessReport.ts
  modified:
    - src/components/quality/CompletenessPanel.tsx (stub → real sortable table)
    - src/components/quality/CompletenessDrillDown.tsx (stub → real drill-down)
    - src/__tests__/completeness-walker.test.ts (scaffold → 20 real tests)
    - src/__tests__/completeness-hook.test.tsx (scaffold → 10 real tests)
    - src/__tests__/quality-overview.test.tsx (mock CompletenessPanel since stub now real)

key-decisions:
  - "requiredElementPaths prefers snapshot.element, falls back to differential.element, dedupes, drops empty/missing paths — deterministic regardless of how Simplifier generates a profile"
  - "isNonEmpty treats plain objects as populated iff they have at least one own key — essential because FHIR Reference objects (`{ reference: 'Patient/1' }`) must count as 'present' for Condition.subject and similar paths"
  - "Arrays in walker path traversal take [0] for v1 — Pitfall 4 (slice-aware mustSupport) is documented as out-of-scope and delegated to the Coverage tab. Walker treats sliced paths like `Condition.code.coding` as the base cardinality answer (does ANY coding exist?)"
  - "Module-scoped cache singleton (cacheInstance + cacheServerUrl guard) is the blessed pattern — constructor is expensive (hydrates localStorage) so we keep one instance per server URL. Plan 04 coverage hook MUST instantiate its own module-scoped cache the same way rather than sharing cacheInstance, since metric='coverage' in buildMetricsKey ensures no cross-metric collision but the singleton is private to this module"
  - "sampleSize debounce lives at the HOOK level (not at the SampleSizeControl). Rationale: Plans 03 and 04 may debounce at different cadences, and the Counts tab (Plan 02) is already rendered synchronously through useResourceCounts — a debounce upstream would slow the Counts flow unnecessarily. Each Wave 2 hook applies its own useDebouncedValue(sampleSize, 500)"
  - "Rollup uses Math.round to integer percentages — matches UI-SPEC card label 72% / 84% (no decimal rendering). Truncation was rejected because 49.6% → 50% is more intuitive than → 49%"
  - "Each test gets a unique server URL via a module-scoped counter so the singleton cacheInstance resets between tests — alternative would have been to export a `_resetForTests` escape hatch, but URL-scoping keeps the production code unchanged"

patterns-established:
  - "Wave 2 replacement pattern: when replacing a stub, also update any tests that queried the stub via data-testid=stub-* or 'Coming in Plan 05-0X'. Our quality-overview.test.tsx was updated to vi.mock('.../CompletenessPanel', ...) since the stub is now heavy (calls client.getBaseUrl). Downstream Plans 04/05 must apply the same pattern when their stubs are replaced."
  - "Profile registry update procedure: (1) fetch canonical StructureDefinition from Simplifier MII 2025 package; (2) trim to { resourceType, url, name, type, snapshot.element[] } keeping only { path, min?, max?, mustSupport?, sliceName? } fields per element; (3) replace the file under src/quality/profiles/; (4) leave REGISTRY mapping untouched unless adding a new type (also update BUNDLED_PROFILE_TYPES consumers)."

requirements-completed: [QUAL-02]

duration: 9min
completed: 2026-04-12
---

# Phase 05 Plan 03: Completeness — MII Profiles, Walker, Hook, Panel, Drill-down Summary

**Ships QUAL-02: field-level completeness auditing against 7 bundled MII profiles. Walker + hook + panel + drill-down replace all Wave 1 stubs; Overview Strip Card 3 now reflects live arithmetic-mean completeness once the batch settles.**

## Performance

- **Duration:** ~9 min (523s)
- **Started:** 2026-04-12T09:26:27Z
- **Completed:** 2026-04-12T09:35:10Z
- **Tasks:** 2 (both auto, both TDD-style)
- **Files:** 10 created + 5 modified = 15 touched

## Accomplishments

- `/quality` Completeness tab renders a real per-type table sorted worst-first (completeness ASC). Each row shows a 48px RingProgress with the percentage, `populated / total` counts, sample size, and the bundled MII profile name (or `Structural (min>=1)` fallback for types without a bundled profile).
- Disclosure banner `Completeness and coverage are estimated from a sample of the first {N} resources per type.` renders at the top of the panel (UI-SPEC blue Alert).
- `/quality/completeness/:type` drill-down works: back button (auto-focused), title `{Type} — Completeness breakdown`, per-path Progress rows with `{pct}% ({count}/{sampleSize})` captions. Types without a bundled profile show the fallback Alert.
- 7 MII StructureDefinitions bundled under `src/quality/profiles/` (Condition, Observation, Patient, Procedure, MedicationStatement, Encounter, Consent). Total on-disk size: trimmed to mustSupport paths per Pitfall 7 — each file <2 KB.
- `useCompletenessReport` implements the full Wave 2 contract: 4-concurrent worker pool mirrors `useResourceCounts`, 500ms `useDebouncedValue` guard on sampleSize, `cancelledRef` abort on unmount/dep-change, `QualityMetricsCache` hit path keyed by `(serverUrl, type, sampleSize, 'completeness')`.
- OverviewStrip Card 3 `Overall completeness` flips from em-dash to a live integer percentage once the batch settles — via a dedicated useEffect that pushes the arithmetic mean (Math.round) into `QualityMetricsContext.setCompleteness`. Exclusion rule from 05-01-SUMMARY is honoured: loading, errored, and `total === 0` (no-profile) types are dropped from the denominator.
- 30 new Plan-03 tests all green (20 walker + 10 hook); full suite: 227 passing, 31 todo. Only Wave 0 failing scaffolds for Plans 04-05 remain red (by design).

## Task Commits

1. **Task 1: Bundled MII profiles + completenessWalker + 20 walker tests** — `cd20039` (feat)
2. **Task 2: useCompletenessReport + CompletenessPanel + CompletenessDrillDown + 10 hook tests** — `08b5a00` (feat)

## Contracts / Public API

### `src/quality/completenessWalker.ts`

```typescript
export function requiredElementPaths(sd: StructureDefinition): string[];
// Pure. Prefers snapshot.element, falls back to differential.element.
// Returns deduplicated paths where mustSupport === true OR (min ?? 0) >= 1.
// Drops falsy/empty paths. Order-preserving within each filter pass.

export function isPathPopulated(resource: unknown, path: string): boolean;
// Pure. Walks a dotted FHIR path starting after the ResourceType prefix.
// Choice-type: a segment ending in `[x]` probes any key starting with the
// prefix on the current node (Pitfall 3). Arrays take [0] for v1 — slice-
// aware walking is Pitfall 4, delegated to the Coverage panel.
// Non-empty check: null/''/[] are false; plain objects require at least
// one own key; strings/numbers/booleans (non-empty) are true.

export function computeCompleteness(
  sample: Resource[], requiredPaths: string[]
): { populated: number; total: number; perPath: Record<string, number> };
// Pure. total = sample.length * requiredPaths.length.
// populated = sum of perPath values. perPath[path] = count of resources
// where isPathPopulated returns true. Edge cases: empty sample OR empty
// paths → { 0, 0, {} } — NOT an error.
```

### `src/quality/profiles/index.ts`

```typescript
export const BUNDLED_PROFILE_TYPES: readonly string[];
// ['Condition', 'Observation', 'Patient', 'Procedure',
//  'MedicationStatement', 'Encounter', 'Consent']

export function getProfileForType(resourceType: string): StructureDefinition | null;
// null for unbundled types (e.g., ImagingStudy). Callers use the null
// branch to fall back to "Structural (min>=1)" mode in the UI.
```

### `src/hooks/useCompletenessReport.ts`

```typescript
export function useCompletenessReport(
  client: MedplumClient | null,
  types: string[],
  sampleSize: number,
): Record<string, PerTypeReport<PerTypeCompletenessReport>>;
// Each type starts as 'loading', settles independently to a report or
// 'error'. Cache-hit rehydration is synchronous (first render). 4-way
// concurrency on network. 500ms debounce on sampleSize. Rollup pushes
// arithmetic mean via QualityMetricsContext.setCompleteness (Math.round
// integer, undefined if nothing settled, excludes total===0 types).
```

## Profile Registry Update Procedure

1. Fetch the canonical StructureDefinition from Simplifier (MII Kerndatensatz 2025 package).
2. Trim to the minimal shape: `{ resourceType, url, name, type, snapshot: { element: [{ path, min?, max?, mustSupport?, sliceName? }, ...] } }`. Elements without `path` or without `mustSupport`/`min>=1` can be omitted (requiredElementPaths filters them out anyway), but keeping them is harmless.
3. Replace the corresponding file under `src/quality/profiles/` (filename convention: `{ResourceType}-{moduleKey}.json`).
4. Re-run `npm test -- src/__tests__/completeness-walker.test.ts` to confirm no regression in path extraction.
5. No code change required — the registry in `index.ts` maps by resource type and reloads automatically at bundle time.

To add a NEW resource type: (a) add the JSON file, (b) add the import + REGISTRY entry in `profiles/index.ts`. `BUNDLED_PROFILE_TYPES` is derived from `Object.keys(REGISTRY)` so consumers update automatically.

## Module-scoped Cache Singleton Pattern (for Plan 04)

`useCompletenessReport` owns a module-private `cacheInstance: QualityMetricsCache | null` plus `cacheServerUrl: string | null` guard. The `getCache(serverUrl)` helper rebuilds the cache when the server URL changes:

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

**Plan 04 must follow the same shape** — instantiate a separate module-scoped cache in `useCodingCoverage.ts`. Sharing cache instances across hooks is unnecessary because `buildMetricsKey` already namespaces by metric (`'completeness' | 'coverage' | 'validation'`), so entries never collide. Two cache instances also give each hook its own LRU eviction budget, which matters when a server has many types.

## v1 Slice Limitation (Pitfall 4)

The walker treats sliced mustSupport paths at the base cardinality: `Condition.code.coding[snomed]` is effectively asked as "does Condition.code.coding exist at all?" This is correct for a Completeness axis because MII's `mustSupport` at slice level really asks "is there ANY coding bound to any slice?" — the per-slice binding check belongs to the Coverage axis where we classify each CodeableConcept into `systemCode | textOnly | empty`. Plan 04's CodingCoveragePanel is the home for slice-level gaps.

## QualityMetricsContext Wire-up

`useCompletenessReport` wires into Plan 02's OverviewStrip via a dedicated `useEffect` over `reports`:

```typescript
const { setCompleteness } = useQualityMetricsContext();
useEffect(() => {
  const pcts: number[] = [];
  for (const r of Object.values(reports)) {
    if (r === 'loading' || r === 'error') continue;
    if (r.total > 0) pcts.push((r.populated / r.total) * 100);
  }
  if (pcts.length === 0) {
    setCompleteness(undefined);  // em-dash
    return;
  }
  setCompleteness(Math.round(pcts.reduce((a, b) => a + b, 0) / pcts.length));
}, [reports, setCompleteness]);
```

**Plan 04 mirrors this pattern for coverage**: arithmetic mean of `systemCode / totalCodedFields * 100` across settled reports where `totalCodedFields > 0`, pushed through `setCoverage`. Same exclusion rule, same Math.round, same em-dash when empty.

## Deviations from Plan

**[Rule 3 - blocking issue] Updated `quality-overview.test.tsx` to mock CompletenessPanel since its stub is now replaced by the real implementation.**
- **Found during:** Task 2
- **Issue:** The quality-overview test rendered the full QualityOverviewPage (with `keepMounted` Tabs rendering ALL panels simultaneously). The real CompletenessPanel calls `useCompletenessReport` which calls `client.getBaseUrl()`, but the test's `mockClient = { search: vi.fn() }` did not expose that method. The test also asserted `/Coming in Plan 05-03/` which no longer exists.
- **Fix:** Added `vi.mock('../components/quality/CompletenessPanel', ...)` returning a simple testid-marked stub; added `getBaseUrl` + `searchResources` to `mockClient` as defensive belt-and-braces; rewrote the "tab panels mount with keepMounted" assertion to check for the mock-testid + the 05-04/05 stub copies.
- **Files modified:** `src/__tests__/quality-overview.test.tsx`
- **Commit:** `08b5a00`

**[Rule 3 - blocking issue] Hook tests use per-test unique server URLs to bypass the module-scoped cache singleton.**
- **Found during:** Task 2
- **Issue:** The first run of the hook tests showed cross-test pollution: the rollup test populated `Observation: { populated:0, total:0 }` into the module-scoped cache singleton, then the "settles each type independently; errors do not poison siblings" test expected the same Observation to be 'error' but got the cached zero-report instead.
- **Fix:** Added a module-scoped `serverCounter` in the test file so each `makeClient()` call gets a fresh URL unless `serverUrl` is passed explicitly. The cache-hit test passes `serverUrl: sharedUrl` to the two clients it creates.
- **Rationale:** Chose URL-scoping over exporting a `_resetForTests` helper because it keeps production code unchanged and mirrors the real-world behaviour (changing server URL genuinely rebuilds the cache).
- **Files modified:** `src/__tests__/completeness-hook.test.tsx`
- **Commit:** `08b5a00`

**[minor - test-side fixture adjustment]** The scaffold hook test imported from `../quality/useCompletenessReport` (incorrect path) with `@ts-expect-error`; rewritten to import from the canonical `../hooks/useCompletenessReport` path without the pragma. No production impact — the plan's acceptance criteria grep `src/hooks/useCompletenessReport.ts`.

## Issues Encountered

- Initial hook-test run had 3 failures all traceable to the cache singleton test pollution described above. One investigation loop (2 min) located the root cause via the unexpected `profileUrl: "...ObservationLab"` leaking into the "errors do not poison siblings" assertion. Fix was mechanical and applied once.
- `npx tsc --noEmit -p tsconfig.app.json` flagged one new error (`_client` unused local in CompletenessPanel) — removed the dead intermediate variable. All other tsc errors on that stricter config are pre-existing (documented in 05-02 deferred-items.md).

## User Setup Required

None. All changes are code-only. The 7 bundled MII profiles ship as JSON files committed to git; no runtime fetch, no network dependency, no settings.yaml change. Navigate to `/quality` → Completeness tab to see the new table; click any row or visit `/quality/completeness/Condition` directly to see the drill-down.

## Verification

- `npm test -- src/__tests__/completeness-walker.test.ts` → 20 passing, 0 todo, exit 0
- `npm test -- src/__tests__/completeness-hook.test.tsx` → 10 passing, 0 todo, exit 0
- `npm test -- src/__tests__/quality-overview.test.tsx` → 11 passing (fixed after mocking CompletenessPanel)
- `npx vitest run` (full suite) → 227 passed, 31 todo, 3 files failing — all 3 failures are Wave 0 scaffolds for Plans 04/05 (`coding-coverage-walker`, `structural-validator`, `remote-validator`). Zero regressions.
- `npx tsc --noEmit -p .` → exit 0
- `grep -l '"mustSupport": true' src/quality/profiles/*.json | wc -l` → 7
- `grep -l "\\[x\\]" src/quality/profiles/*.json` → lists Observation, Procedure, MedicationStatement (matches choice-type spec)
- `grep "BUNDLED_PROFILE_TYPES" src/quality/profiles/index.ts` → one export
- `grep "endsWith('\\[x\\]')" src/quality/completenessWalker.ts` → one match (Pitfall 3 handling)
- `grep "setCompleteness" src/hooks/useCompletenessReport.ts` → 5 matches (docstring + import + destructure + call + undefined call)
- `grep "Math.round" src/hooks/useCompletenessReport.ts` → one match (integer rollup)
- `grep "r.total > 0" src/hooks/useCompletenessReport.ts` → one match (exclusion guard)
- `grep "Completeness and coverage are estimated" src/components/quality/CompletenessPanel.tsx` → one match
- `grep "RingProgress\|size={48}" src/components/quality/CompletenessPanel.tsx` → both present
- `grep "/quality/completeness/" src/components/quality/CompletenessPanel.tsx` → 2 matches (link to drill-down from loading + settled rows)
- `grep "Back to Completeness" src/components/quality/CompletenessDrillDown.tsx` → one match
- `grep "// STUB" src/components/quality/CompletenessPanel.tsx` → 0 matches (stub replaced)
- `grep "// STUB" src/components/quality/CompletenessDrillDown.tsx` → 0 matches (stub replaced)
- `grep "it.todo" src/__tests__/completeness-*.test.*` → 0 matches

## Self-Check: PASSED

Files verified present:
- src/quality/profiles/{Condition-diagnose,Observation-laborbefund,Patient-person,Procedure-prozedur,MedicationStatement-medikation,Encounter-fall,Consent-consent}.json
- src/quality/profiles/index.ts
- src/quality/completenessWalker.ts
- src/hooks/useCompletenessReport.ts
- src/components/quality/CompletenessPanel.tsx (stub replaced)
- src/components/quality/CompletenessDrillDown.tsx (stub replaced)
- src/__tests__/completeness-walker.test.ts (scaffold → 20 real tests)
- src/__tests__/completeness-hook.test.tsx (scaffold → 10 real tests)
- .planning/phases/05-data-quality-dashboard/05-03-SUMMARY.md

Commits verified on branch main:
- cd20039 — Task 1 (7 profile JSONs + registry + walker + 20 tests)
- 08b5a00 — Task 2 (hook + panel + drill-down + 10 tests + test mock fix)
