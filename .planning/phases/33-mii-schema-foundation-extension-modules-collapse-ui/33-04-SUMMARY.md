---
phase: 33-mii-schema-foundation-extension-modules-collapse-ui
plan: 04
subsystem: mii-kerndatensatz
tags: [mii, fhir, fan-out, promise-all, per-type-catch, mii-ext-03, schema-foundation]

# Dependency graph
requires:
  - phase: 33-mii-schema-foundation-extension-modules-collapse-ui
    plan: 02
    provides: "Four MII-EXT-01 helpers + migrated URL builder at MiiModuleTab.tsx (types lookup already wired — plan 33-04 only rewires the call pattern from `types[0]` to `types.map(fetchOne)`)"
  - phase: 33-mii-schema-foundation-extension-modules-collapse-ui
    plan: 03
    provides: "Widened MiiModule schema (string | string[], category, patientSearchParamOverrides, extraQueryByType) so Promise.all fan-out naturally consumes multi-type modules"
provides:
  - "MiiModuleTab fetches every FHIR type in fhirResourceTypesOf(module) concurrently via Promise.all(types.map(fetchOne))"
  - "Per-type .catch(() => [] as Resource[]) so one failed type blanks only that type, not the whole module (D-06)"
  - "Per-type results concatenated via .flat() and sorted by getDate() descending (D-07)"
  - "Five unit tests locking single-type, multi-type, per-type-failure, patientSearchParamOverrides, and extraQueryByType behavior (new src/components/patients/__tests__/ directory)"
affects:
  - "33-05 (MII-EXT-04/05 MiiModuleTabs partition + keepMounted drop) — extension-panel Promise.all storms are bounded by D-11 drop; the fan-out landed here is what makes D-11 load-sensitive"
  - "34 (14 MII extension modules) — multi-type modules like Bildgebung [ImagingStudy, DiagnosticReport] drop into this code path with no further runtime changes; the D-17 per-module contract test + the fan-out tests here are the regression gates"

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Promise.all(types.map(fetchOne)) fan-out where each fetchOne owns a trailing `.catch(() => [] as Resource[])` — partial-failure isolation per D-06"
    - "Per-type results merged via .flat() then sorted with existing getDate(r) helper — reuses pure date-extraction logic"
    - "Test wrapper mocks @medplum/react-hooks via vi.hoisted() container so each test rebinds `mocks.client` before render — mirrors patient-detail.test.tsx convention"
    - "Mantine jsdom polyfills (ResizeObserver + matchMedia) copied from patient-detail.test.tsx — no new setup files"
    - "Chai-style `.toBeNull()` / `.toBeDefined()` matchers used throughout — project has no @testing-library/jest-dom setup, so no `.toBeInTheDocument()`"

key-files:
  created:
    - "src/components/patients/__tests__/MiiModuleTab.test.tsx (5 tests covering fan-out + override contract)"
  modified:
    - "src/components/patients/MiiModuleTab.tsx (useEffect body rewritten: types.map → Promise.all → .flat + sort; loading/empty/table render branches unchanged)"

key-decisions:
  - "fetchOne defined INSIDE the useEffect (per plan constraint 1) so it closes over current module + patientId without extra dep tracking"
  - "Promise.all chosen over Promise.allSettled because per-type .catch() already absorbs failures internally — every inner promise resolves"
  - "No outer .catch() on Promise.all — would be dead code since inner catches guarantee resolution; noted in plan constraint 6"
  - "useEffect deps kept as [client, module, patientId] — module is a stable MII_MODULES reference; no field-level tracking needed"
  - "Tests use findAllByText for resource ID assertions — the ID appears in both the Anchor summary cell AND the mono ID column, so findByText hits 'multiple elements' error; asserting length > 0 proves the row rendered without being brittle about which cell"
  - "Tests co-located under src/components/patients/__tests__/ (new directory) rather than src/__tests__/ — matches src/components/{layout,quality}/__tests__/ house pattern and follows the plan's explicit path"

requirements-completed: [MII-EXT-03]

# Metrics
duration: 5 min
completed: 2026-04-24
---

# Phase 33 Plan 04: MiiModuleTab Fan-Out Summary

**`MiiModuleTab` now fans out N concurrent FHIR GETs via `Promise.all(types.map(fetchOne))` with per-type `.catch(() => [] as Resource[])`, results concatenated with `.flat()` and sorted by `getDate()` descending (D-06/D-07); 5 unit tests lock single-type, multi-type, per-type-failure, and per-type override behavior.**

## Performance

- **Duration:** 5 min (2 commits)
- **Started:** 2026-04-24T11:03:35Z
- **Completed:** 2026-04-24T11:08:50Z
- **Tasks:** 2 (refactor useEffect; ship 5 unit tests)
- **Files modified:** 1 (MiiModuleTab.tsx)
- **Files created:** 1 (MiiModuleTab.test.tsx + new __tests__ directory)

## Accomplishments

- Rewrote `MiiModuleTab.useEffect` from a single `client.get(types[0])` fetch into a concurrent `Promise.all(types.map(fetchOne))` fan-out. Each `fetchOne` closes over the current `module` + `patientId`, builds its URL via the plan-33-02 helpers (`getPatientSearchParamForType`, `getExtraQueryForType`), and owns a trailing `.catch(() => [] as Resource[])` so a single failing type blanks only that type.
- Per-type results are concatenated via `perType.flat()` and sorted with `all.sort((a, b) => getDate(b).localeCompare(getDate(a)))` — matches the server-side `_sort=-date` hint now that multiple types are combined.
- Phase 33 behavior is semantically unchanged: every base module has a 1-element type array, so `Promise.all([one])` + `.flat()` is a no-op wrapper. Single-type Laborbefund / Diagnose / Prozedur / etc. tabs render identically to plan 33-02.
- Added five unit tests at `src/components/patients/__tests__/MiiModuleTab.test.tsx` covering all plan behavior clauses:
  1. Single-type module triggers exactly 1 FHIR GET; URL contains `Observation?patient=Patient/p1` + `category=laboratory`.
  2. Multi-type Bildgebung stub (`['ImagingStudy', 'DiagnosticReport']`) triggers exactly 2 concurrent GETs; both resources render.
  3. One-type-fails isolation — first-type reject + second-type resolve still renders the surviving type; no "No Bildgebung data found" empty state.
  4. `patientSearchParamOverrides: { TypeA: 'subject' }` routes TypeA via `subject=Patient/p1` AND TypeB via `patient=Patient/p1` in the same module.
  5. `extraQueryByType: { TypeA: 'category=foo' }` + module-wide `extraQuery: 'category=fallback'` → TypeA URL contains `category=foo`, TypeB URL contains `category=fallback`.

## Task Commits

Each task was committed atomically using `git commit --no-verify` (parallel executor mode):

1. **Task 1: Refactor MiiModuleTab useEffect to Promise.all fan-out** — `99e0cdb` (refactor)
2. **Task 2: Lock MiiModuleTab fan-out contract with 5 unit tests** — `cb23e27` (test)

_Note: Task 2 carries `tdd="true"` in the plan frontmatter, but the implementation landed in Task 1; the two halves of the RED→GREEN cycle collapsed into a single "test" commit since the behavior already existed. The tests prove the Task 1 implementation meets the D-06/D-07 contract._

## Files Created/Modified

- **`src/components/patients/MiiModuleTab.tsx`** — `useEffect` body rewritten. `fetchOne` helper defined inside the effect closure; `Promise.all(types.map(fetchOne))` replaces the previous `types[0]`-only single fetch; results `.flat()` then sorted descending by `getDate()`. Existing `getDate(r)` and `getSummary(r)` helpers at the top of the file untouched. Loading/empty/table render branches preserved verbatim — zero UI change.
- **`src/components/patients/__tests__/MiiModuleTab.test.tsx`** — New file (+282 lines); also creates the `src/components/patients/__tests__/` directory. Copies the jsdom `ResizeObserver` + `matchMedia` polyfill from `patient-detail.test.tsx`. Uses `vi.hoisted()` to share a `mocks.client` slot between the `vi.mock('@medplum/react-hooks', ...)` factory and each test's `makeClient()` helper.

## useEffect Diff (summary)

### Before (plan 33-02, single-type fetch with `types[0]` indexing)

```typescript
const types = fhirResourceTypesOf(module);
const type = types[0];
const param = getPatientSearchParamForType(module, type);
const extra = getExtraQueryForType(module, type);

let url = `${type}?${param}=Patient/${patientId}&_count=50&_sort=-date`;
if (extra) url += `&${extra}`;
client.get(client.fhirUrl(url).toString())
  .then(raw => { /* parse bundle; setResources; setLoading(false) */ })
  .catch(() => { /* setResources([]); setLoading(false) */ });
```

### After (plan 33-04, Promise.all fan-out with per-type catch)

```typescript
const types = fhirResourceTypesOf(module);

const fetchOne = (type: string): Promise<Resource[]> => {
  const param = getPatientSearchParamForType(module, type);
  const extra = getExtraQueryForType(module, type);
  let url = `${type}?${param}=Patient/${patientId}&_count=50&_sort=-date`;
  if (extra) url += `&${extra}`;
  return client.get(client.fhirUrl(url).toString())
    .then(raw => { /* parse bundle; return resources */ })
    .catch(() => [] as Resource[]); // D-06: per-type failure → empty
};

Promise.all(types.map(fetchOne)).then(perType => {
  if (cancelled) return;
  const all = perType.flat();
  all.sort((a, b) => getDate(b).localeCompare(getDate(a))); // D-07
  setResources(all);
  setLoading(false);
});
```

`cancelled` cleanup guard unchanged; deps `[client, module, patientId]` unchanged.

## Test Baseline Delta

| Scope | Before | After | Delta |
| ----- | ------ | ----- | ----- |
| `MiiModuleTab.test.tsx` | — (new file) | 5 passing | **+5** |
| Full suite (`npx vitest run`) | 891 passing / 22 todo / 3 skipped / 0 failing | 896 passing / 22 todo / 3 skipped / 0 failing | **+5** |
| `npx tsc -b --noEmit` | clean | clean | stable |

Plan acceptance criterion required ≥ 841 passing (836 baseline + 5 new). Actual: 896 — exceeded by +55 (the delta from 836 to 891 is accrued from plans 33-01 through 33-03 in this phase plus earlier work).

## Decisions Made

- **`fetchOne` defined INSIDE `useEffect`** — closes over current `module` + `patientId` without extra dep tracking. Plan constraint 1.
- **`Promise.all`, not `Promise.allSettled`** — each `fetchOne` already catches internally, so every promise resolves. No need for the heavier API. Plan constraint 3.
- **No outer `.catch()` on `Promise.all`** — would be dead code because per-type catches absorb all failures before reaching the outer combinator. Plan constraint 6.
- **`useEffect` deps collapsed at `[client, module, patientId]`** — carried from plan 33-02; `module` is a stable `MII_MODULES` reference, so field-level tracking isn't required.
- **Tests use `findAllByText(...)` for resource IDs** — the ID appears twice (Anchor summary cell + mono ID column), so single-match `findByText` fails with "multiple elements". `findAllByText + length > 0` proves the row rendered without being brittle about layout.
- **Tests use Chai `.toBeNull()` instead of `.toBeInTheDocument()`** — the project does NOT import `@testing-library/jest-dom`, so the DOM matcher is unavailable. Chai's `.toBeNull()` / `.toBeDefined()` mirror the existing `patient-detail.test.tsx` convention.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Test matcher incompatibility (`.toBeInTheDocument()` not available)**
- **Found during:** Task 2 (first test run after ship)
- **Issue:** The plan's test skeleton (the `<action>` block) used `.toBeInTheDocument()` from `@testing-library/jest-dom`. This project does not configure `jest-dom` matchers (no `src/test/setup.ts`, no `setupFiles` in `vitest.config.ts`), so the assertion errored with `Invalid Chai property: toBeInTheDocument`.
- **Fix:** Replaced `.not.toBeInTheDocument()` → `.toBeNull()` (2 occurrences via replace_all). Matches the `queryByText(...).toBeNull()` pattern already in `src/__tests__/patient-detail.test.tsx`.
- **Files modified:** `src/components/patients/__tests__/MiiModuleTab.test.tsx`
- **Verification:** 5/5 tests now pass; full suite 896 passing / 0 failing.
- **Committed in:** `cb23e27` (Task 2 commit — not a separate fix commit; iteration during test-writing before the first clean test run).

**2. [Rule 1 - Bug] Multi-match ambiguity in `findByText` assertions**
- **Found during:** Task 2 (first test run after ship)
- **Issue:** `findByText(/img-1/i)` and `findByText(/dr-ok/i)` failed because each resource ID renders in two cells (Anchor summary + mono ID column). `findByText` requires a single match.
- **Fix:** Switched to `findAllByText(...)` and asserted `.length > 0`. Preserves the "row rendered" signal without coupling to cell count.
- **Files modified:** `src/components/patients/__tests__/MiiModuleTab.test.tsx`
- **Verification:** 5/5 tests now pass.
- **Committed in:** `cb23e27` (Task 2 commit).

**3. [Rule 1 - Comment hygiene] Task 1 grep acceptance criterion mismatch**
- **Found during:** Task 1 (acceptance-criteria grep verification)
- **Issue:** The plan's acceptance criterion `grep -cE "\.catch\(\(\) => \[\]" src/components/patients/MiiModuleTab.tsx` returned 2 — one match from the implementation (`.catch(() => [] as Resource[])`) and one match from an inline comment that quoted `.catch(() => [])` verbatim. The criterion asked for exactly 1.
- **Fix:** Reworded the comment to describe the behavior prose-style instead of quoting the code fragment. No runtime impact.
- **Files modified:** `src/components/patients/MiiModuleTab.tsx`
- **Verification:** Grep count now 1; all 5 acceptance-criteria grep rules pass.
- **Committed in:** `99e0cdb` (part of Task 1 commit — not a separate fix; iterated pre-commit).

---

**Total deviations:** 3 auto-fixed (3 × Rule 1 — all in Task 2 test-skeleton + Task 1 comment hygiene; no scope change, no new behavior).
**Impact on plan:** Zero — all deviations were mechanical test/comment fixes with no behavior or API consequence. Plan executed exactly as designed. No Rule 2/3/4 triggers fired.

## Issues Encountered

None — no blocked tasks, no auth gates, no CLAUDE.md violations.

## Authentication Gates

None.

## User Setup Required

None — pure in-repo refactor and test addition.

## Verification Evidence

- `npx tsc -b --noEmit` → exit 0 (clean).
- `npx vitest run src/components/patients/__tests__/MiiModuleTab.test.tsx` → `Tests 5 passed (5)`, `Test Files 1 passed (1)`.
- `npx vitest run` (full suite) → `Tests 896 passed | 22 todo (918)`, `Test Files 101 passed | 3 skipped (104)`, 0 failing.
- `grep -c "Promise\.all" src/components/patients/MiiModuleTab.tsx` → 1.
- `grep -cE "\.catch\(\(\) => \[\]" src/components/patients/MiiModuleTab.tsx` → 1.
- `grep -c "types\.map(fetchOne)" src/components/patients/MiiModuleTab.tsx` → 1.
- `grep -c "\.flat()" src/components/patients/MiiModuleTab.tsx` → 1.
- `grep -c "getDate(b)\.localeCompare(getDate(a))" src/components/patients/MiiModuleTab.tsx` → 1.
- `[ -f src/components/patients/__tests__/MiiModuleTab.test.tsx ]` → file exists.
- `grep -c "MiiModuleTab fan-out" src/components/patients/__tests__/MiiModuleTab.test.tsx` → 1.
- `grep -cE "^\s*it\(" src/components/patients/__tests__/MiiModuleTab.test.tsx` → 5.

## Self-Check: PASSED

**Files:**
- `src/components/patients/MiiModuleTab.tsx` → FOUND (modified; useEffect rewritten for fan-out).
- `src/components/patients/__tests__/MiiModuleTab.test.tsx` → FOUND (new file, 5 tests).

**Commits:**
- `99e0cdb` `refactor(33-04): fan MiiModuleTab out to Promise.all(types.map(fetchOne))` → FOUND in `git log`.
- `cb23e27` `test(33-04): lock MiiModuleTab fan-out contract with 5 unit tests` → FOUND in `git log`.

**Success criteria:**
- [x] MII-EXT-03 binding criterion met: `MiiModuleTab` fans out N types concurrently with per-type `.catch()`; single-type behavior identical to plan 33-02.
- [x] D-06 + D-07 contract locked by 5 unit tests — one direct test per clause (multi-type fan-out, per-type-failure isolation, per-type overrides, per-type extraQuery, single-type baseline).
- [x] D-21 green-gate: `npx vitest run` + `npx tsc -b --noEmit` both clean (896 passing / 0 failing; tsc exit 0).

## Next Phase Readiness

- **Plan 33-05 (MII-EXT-04 / MII-EXT-05 MiiModuleTabs partition + keepMounted drop) unblocked.** Extension tabs will drop `keepMounted`, which combined with today's fan-out means only the active extension tab's `Promise.all` ever fires. The D-11 concurrency bound is structurally enforced.
- **Phase 34 (14 extension modules) unblocked.** Multi-type modules drop into the fan-out code path unchanged; the 5 tests here plus the D-17 per-module contract test in `src/__tests__/mii-modules.test.ts` are the regression gates. Adding a module = a `MII_MODULES` entry + a D-17 contract-test row; no `MiiModuleTab` changes required.

---

*Phase: 33-mii-schema-foundation-extension-modules-collapse-ui*
*Plan: 04*
*Completed: 2026-04-24*
