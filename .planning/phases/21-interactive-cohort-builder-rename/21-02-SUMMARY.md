---
phase: 21-interactive-cohort-builder-rename
plan: "21-02"
subsystem: cohorts
tags: [cohorts, react-hook, medplum, fhir-query, caching, wave-1]

# Dependency graph
requires:
  - phase: 21-interactive-cohort-builder-rename
    plan: "21-01"
    provides: "CohortDefinition/CohortCriterion/CohortsStorage types, parsePatientRefs, findActiveCohort, storage-key constants, Wave 0 skip-stubs locking -t filters"
  - phase: 18-quality-thresholds
    provides: "useThresholds hydration-gate pattern + three-state precedence (mirrored here for useCohorts)"
  - phase: 19-pdf-report-and-trends
    provides: "QualityMetricsCache module-scope cache pattern + MedplumClient mocking shape (pdfExport.test.ts)"
provides:
  - "useCohorts() — React hook exposing { cohorts, activeCohortId, activeCohort, hydrated, addCohort, activateCohort } backed by quality.cohorts.v1 with hydration gate"
  - "resolveCohort(client, cohort) — async CohortDefinition → Patient-ID `string[]` resolver with AND intersection + 10K per-criterion cap + module-scoped cache"
  - "clearCohortResolutionCache() — cache invalidation hook for server-URL change"
  - "GREEN Wave 0 tests for hook persistence/hydration/UUID + resolver intersect/date-range/condition-code/cache/malformed-ref handling"
affects: [21-03-sampling-scoping, 21-05-builder-ui, 21-06-dashboard-wiring]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "useLocalStorage + hydration-gate (mirrors src/hooks/useThresholds.ts)"
    - "Module-scoped Map cache keyed by cohort.id + invalidated on cohort.updatedAt change (mirrors QualityMetricsCache in useCompletenessReport.ts)"
    - "FHIR search via searchResourcePages with _elements=subject projection — lean bundles, pagination handled by generator"
    - "AND intersection smallest-first for short-circuit"
    - "Count-only telemetry for malformed subject refs (T-21-03 PHI-in-logs mitigation)"

key-files:
  created:
    - src/hooks/useCohorts.ts
    - src/quality/cohortResolver.ts
  modified:
    - src/hooks/useCohorts.test.ts
    - src/quality/cohortResolver.test.ts

# Requirements satisfied
requirements-satisfied:
  - id: CHRT-01
    how: "Cohort definition persisted in quality.cohorts.v1 via useCohorts; resolveCohort intersects three criterion types into a Patient ID set consumable by sampleResources (Plan 21-03)"
    evidence: "src/hooks/useCohorts.test.ts 'persists cohorts to quality.cohorts.v1' + src/quality/cohortResolver.test.ts 'intersects three criterion sets' — GREEN"
  - id: CHRT-02
    how: "Hydration gate in useCohorts prevents one-frame 'No cohort' flash; activateCohort(id | null) toggles scope explicitly"
    evidence: "src/hooks/useCohorts.test.ts 'hydrated=false on first render' + 'activateCohort persists and round-trips' — GREEN"

# Validation
validation:
  test-filters:
    - "persists"
    - "hydrated"
    - "crypto.randomUUID"
    - "intersects"
    - "date range"
    - "condition code"
    - "caches"
  test-runs:
    - cmd: "npx vitest run src/hooks/useCohorts.test.ts src/quality/cohortResolver.test.ts"
      result: "10 passed | 2 skipped | 0 failed (12 total)"
---

# Plan 21-02 Summary — Cohort Hook + Resolver

## What was built

Two modules bridging the pure-types foundation (Plan 21-01) to downstream UI
(Plans 21-05, 21-06) and sampling (Plan 21-03):

### `src/hooks/useCohorts.ts`
React-facing state hook for cohort persistence + activation.

- Backed by `@mantine/hooks.useLocalStorage` against the `quality.cohorts.v1`
  key with `DEFAULT_COHORTS_STORAGE` default.
- **Hydration gate** (`hydrated: boolean`) follows the `useThresholds.ts`
  pattern — a `useEffect` flips the flag on mount so the dashboard can render
  a neutral state for one frame instead of flashing "No cohort" (RESEARCH.md
  §Pitfall 1).
- `addCohort({ name, criteria })` generates IDs via `crypto.randomUUID()` and
  stamps `createdAt`/`updatedAt`. Wraps the `useLocalStorage` setter in a
  try/catch and surfaces quota-exceeded errors through
  `@mantine/notifications` (T-21-04 mitigation).
- `activateCohort(id | null)` updates `activeCohortId`; `activeCohort` is
  derived via `findActiveCohort` (Plan 21-01).
- `updateCohort` / `deleteCohort` are stubbed as future-use exports for
  Phase 22 consumers.

### `src/quality/cohortResolver.ts`
Async criterion → Patient-ID-set resolver.

- `resolveCohort(client, cohort) → Promise<string[]>`: resolves each criterion
  independently, AND-intersects the resulting Sets (smallest-first sort to
  short-circuit `.every()` earlier), returns a deduped array.
- Criterion resolvers:
  - **date-range** → `Encounter?date=ge{start}&date=le{end}&_elements=subject
    &_count=1000` (D-05: Encounter.period is the canonical date surface).
    Passed as a `Record` with `date: [geX, leY]` array value — Medplum
    serializes via `URLSearchParams` to repeated `date=` params (AND-bounded,
    not comma-joined).
  - **condition-code** → `Condition?code={system}|{code}&_elements=subject
    &_count=1000` (FHIR R4 token pipe form; forces explicit terminology).
  - **reference-list** → client-side short-circuit, `new Set(patientIds)`; no
    server roundtrip.
- **Per-criterion 10 000 ID cap** (D-06, matches `parsePatientRefs`). The
  pagination loop breaks at `ids.size >= MAX_IDS_PER_CRITERION` (T-21-02
  DoS mitigation).
- **Cache**: module-scoped `Map<cohortId, { updatedAt, ids }>`. A second call
  with unchanged `updatedAt` short-circuits to the cached IDs — zero server
  calls. Any edit bumps `updatedAt` via `useCohorts.addCohort`, invalidating
  naturally. `clearCohortResolutionCache()` wipes the map (for server-URL
  change hook in Plan 21-06).
- **Malformed subject refs**: missing/non-Patient subjects silently skipped;
  malformed strings counted + logged once as a single `console.warn` that
  reports the COUNT only, never the reference value itself (T-21-03
  PHI-in-logs mitigation).
- **URL injection (T-21-05)**: all criterion values are passed as `Record`
  properties to `searchResourcePages` — Medplum's URLSearchParams serializer
  owns the URL construction. The `system|code` separator is a literal `|`
  joining two form-bound inputs — no user-controlled separator surface.

## Commits

- `05d3432` test(21-02): activate useCohorts persistence + hydration + uuid tests
- `684d7e2` test(21-02): un-skip useCohorts persistence/hydration/uuid tests
- `34f59c1` feat(21-02): implement useCohorts hook with hydration gate + UUID add
- `5fe3018` test(21-02): activate cohortResolver tests for intersection + queries + cache
- `906d33a` feat(21-02): implement cohortResolver with AND intersection + 10K cap + cache

## Test results

```
$ npx vitest run src/hooks/useCohorts.test.ts src/quality/cohortResolver.test.ts

 Test Files  2 passed (2)
      Tests  10 passed | 2 skipped (12)
   Duration  1.16s
```

Skipped tests are Plan 21-04 / 21-05 placeholders (rename migration +
builder-form integration) — they stay skipped until their owning plans
activate them.

## Outstanding items

None for Plan 21-02 scope. Downstream hand-offs:

- Plan 21-03 will import `resolveCohort` from `./cohortResolver` and pass
  its output as `patient=` filter to `sampleResources`.
- Plan 21-05 will consume `useCohorts` from the Builder page (the
  `addCohort` / `activateCohort` methods drive the Save-modal submit path).
- Plan 21-06 will call `clearCohortResolutionCache()` on server-URL change
  in the settings sidebar hook.
