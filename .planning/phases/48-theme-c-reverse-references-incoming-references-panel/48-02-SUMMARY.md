---
phase: 48-theme-c-reverse-references-incoming-references-panel
plan: 02
subsystem: ui
tags: [react, mantine, vitest, rtl, fhir, reverse-references, panel, refactor, REVR-02, REVR-03]

# Dependency graph
requires:
  - phase: 48-01
    provides: reverseReferenceCatalog (typed const) + ReverseReferenceEntry type
provides:
  - RelatedResourcesPanel shared render (D-04)
  - IncomingReferencesPanel wrapper for non-Patient resources (D-06)
  - Vitest coverage for D-15 panel scenarios (parallel fetch, all-zero null, silent failure, click-navigate, loading, title)
  - Cross-wrapper structural-equivalence test (D-16 partial — Patient-side regression baseline ships in 48-03)
affects: [48-03 (Patient wrapper refactor will delegate to RelatedResourcesPanel), 49 (graph view consumes the same catalog)]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Stable client mock pattern for Medplum hook tests — module-scoped client object prevents useMedplum() returning new identity per render, which would otherwise cause infinite useEffect re-fire loop"
    - "Module-scoped readonly entries arrays in tests (Pitfall 2 stability for useEffect deps)"
    - "Cross-wrapper structural-equivalence assertion via card text-content array comparison"

key-files:
  created:
    - src/components/explorer/RelatedResourcesPanel.tsx
    - src/components/explorer/IncomingReferencesPanel.tsx
    - src/components/explorer/__tests__/RelatedResourcesPanel.test.tsx
    - src/components/explorer/__tests__/IncomingReferencesPanel.test.tsx
  modified: []

key-decisions:
  - "Byte-identical port of PatientRelatedResources lines 36-106 — only RELATED_TYPES + refValue lifted to props"
  - "State key remains entry.type (single string) for D-08 / D-16 byte-identical invariance"
  - "Stable client reference in test mocks — discovered via OOM/hang during initial test run"
  - "Used querySelector('[class*=Card]') / querySelector('[class*=SimpleGrid]') for null-render assertion since MantineProvider injects a <style> tag in container"

patterns-established:
  - "Pattern: All Medplum hook test mocks must return a stable singleton object — never create a new {} per useMedplum() call"
  - "Pattern: Cross-wrapper invariant tests render BOTH wrappers with identical inputs and assert card text content equality"
  - "Pattern: Tests for components with useEffect cleanup pass module-scoped frozen entries arrays — never inline literals"

requirements-completed: [REVR-02, REVR-03]

# Metrics
duration: 22min
completed: 2026-05-01
---

# Phase 48 Plan 02: RelatedResourcesPanel + IncomingReferencesPanel Summary

**Shared `<RelatedResourcesPanel>` + non-Patient `<IncomingReferencesPanel>` wrapper extracted from PatientRelatedResources with byte-identical card chrome, parallel `_summary=count` fetch, and silent failure handling — 11 vitest cases green including D-16 cross-wrapper structural-equivalence invariant.**

## Performance

- **Duration:** 22 min
- **Started:** 2026-05-01T17:50:41Z
- **Completed:** 2026-05-01T18:13:27Z
- **Tasks:** 2 (each TDD: RED + GREEN)
- **Files created:** 4
- **Files modified:** 0

## Accomplishments

- **`<RelatedResourcesPanel>`** — shared render component owning fetch + state + skeleton + populated grid + click-navigate. Title/Grid/Card/Badge visuals are byte-identical to `PatientRelatedResources.tsx` lines 36-106.
- **`<IncomingReferencesPanel>`** — thin wrapper for non-Patient resources. Looks up catalog by `resource.resourceType`, returns `null` for type-not-in-catalog or missing `id`, otherwise delegates to the shared component with `title="Referenced By"` and the D-13 URL pattern.
- **11 vitest cases** across two new test files cover all D-15 scenarios (parallel fetch, all-zero → null, silent failure, card click, loading skeleton, title prop) plus the D-16 cross-wrapper structural-equivalence invariant.
- **Zero changes** to `PatientRelatedResources.tsx`, `ResourceDetailPage.tsx`, or any other file outside the four new files (Plan 48-03 owns the refactor + mount-point relocation).

## Task Commits

Each task was committed atomically (TDD: RED test, then GREEN implementation):

1. **Task 1 RED: failing test for RelatedResourcesPanel** — `a5155cd` (test)
2. **Task 1 GREEN: RelatedResourcesPanel shared render** — `b51ec13` (feat)
3. **Task 2 RED: failing test for IncomingReferencesPanel** — `98aaf7b` (test)
4. **Task 2 GREEN: IncomingReferencesPanel wrapper** — `0bb60b2` (feat)

_Per plan instructions, no STATE/ROADMAP edits in this plan — orchestrator owns those after the wave completes._

## Files Created/Modified

### Created
- `src/components/explorer/RelatedResourcesPanel.tsx` — Shared render component (D-04). Owns parallel `_summary=count&_count=0` fetch, in-flight skeleton (4 cards), populated grid, click-navigate. Props: `{ title, entries, refValue, onCardNavigate }`. ~98 lines.
- `src/components/explorer/IncomingReferencesPanel.tsx` — Wrapper for non-Patient resources (D-06). Returns `null` when type-not-in-catalog or missing id; otherwise delegates to RelatedResourcesPanel with `title="Referenced By"` and `/explorer/{type}?{param}={refValue}` navigate URL. ~29 lines.
- `src/components/explorer/__tests__/RelatedResourcesPanel.test.tsx` — 6 it() blocks: parallel fetch, all zero counts, silent failure, card click navigation, loading state, title prop. Mirrors ReferenceLink.test.tsx polyfill + MantineProvider/MemoryRouter wrap idiom. ~213 lines.
- `src/components/explorer/__tests__/IncomingReferencesPanel.test.tsx` — 5 it() blocks: type not in catalog, Observation renders, missing resource.id, card click on Observation panel, structural equivalence (D-16 cross-wrapper invariant). ~178 lines.

### Modified
- None.

## Decisions Made

- **Byte-identical port** of `PatientRelatedResources` render path — only `RELATED_TYPES` (now `entries` prop) and `refValue` differ. Same Mantine components, same Group/Card/Badge structure, same `cursor: 'pointer'`, same `entries.slice(0, 4)` skeleton, same `Title order={5} mb="sm"`, same `cols={{ base: 2, sm: 3, md: 4 }}`.
- **Stable client mock pattern** — discovered during the GREEN phase that returning `{}` literal per `useMedplum()` call caused infinite useEffect re-fire (worker OOM after 7 minutes). Fixed by hoisting `stableClient` to module scope. Documented for the 48-03 plan and any future component-fetch tests.
- **State key kept as `entry.type`** (not `${type}:${param}`) per RESEARCH Pattern 4 — preserves byte-identical semantics with the existing component. Future-proofing the key is deferred until a catalog entry actually has a per-type collision.
- **`querySelector('[class*=Card]')` for null-render assertion** — MantineProvider injects a `<style data-mantine-styles="true">` element into the container, so `container.firstChild` is not null even when our component returns null. Asserting absence of Card / SimpleGrid / Title text is the cleaner gate.
- **Cross-wrapper invariant** uses card text-content array comparison rather than full HTML snapshot — robust against incidental Mantine class-name changes while still verifying the same entries → same cards mapping.

## Deviations from Plan

None of the deviation rules (1-4) fired. Plan executed as written. Two minor implementation discoveries during TDD GREEN phase are documented under "Decisions Made":

1. The stable-client mock issue was inherent to the test pattern, not a deviation from the plan — the plan said to mirror `ReferenceLink.test.tsx`, which mocks a hook that returns a stable function reference. Phase 48's panel mocks a hook that returns an object whose identity matters for `useEffect` deps; the plan's verbatim Code Examples §4 from RESEARCH.md uses the same per-call object literal, so this is a latent issue inherited from the research example. Documented above so 48-03 doesn't repeat it.
2. The `container.firstChild === null` assertion in the all-zero test (per the plan's Behavior block verbatim) had to be relaxed because MantineProvider injects a style sheet at the container root. The test still verifies the spec — no Title, no Cards, no SimpleGrid — just via more specific selectors.

## Issues Encountered

- **OOM / worker-hang on first GREEN run.** Initial `vitest run` of the RelatedResourcesPanel test file hit the worker-process timeout after ~7 minutes with a node V8 heap stack trace. Root cause: my `vi.mock('@medplum/react-hooks')` returned `{ get: mockGet, fhirUrl: ... }` per call, so every render produced a new client identity, triggering `useEffect` (deps `[client, refValue, entries]`) → `setCounts` → re-render → new client → re-fire → infinite loop. **Fix:** hoist `stableClient` to module scope. After fix, all 6 tests pass in 730 ms.
- **`container.firstChild` assertion failure.** MantineProvider injects `<style data-mantine-styles="true">` into the test container. Replaced the assertion with three more specific queries (no Title text, no Card class, no SimpleGrid class) that pass cleanly.
- **TS6133 unused React import.** The new test file imported `React` for old-style JSX but Vite + the React plugin uses automatic JSX runtime. Removed the import.

All issues self-resolved within Task 1; Task 2 proceeded clean.

## User Setup Required

None - no external service configuration required. All work is in-app TypeScript + tests; no env vars, no schemas, no deployments.

## Verification

Per the plan's `<verification>` block:

| Check | Result |
|-------|--------|
| `npx vitest run src/components/explorer/__tests__/RelatedResourcesPanel.test.tsx` | PASS — 6/6 tests green in 713 ms |
| `npx vitest run src/components/explorer/__tests__/IncomingReferencesPanel.test.tsx` | PASS — 5/5 tests green in 730 ms |
| Both files together | PASS — 11/11 tests green in 759 ms |
| `npx tsc -b --noEmit` | PASS — 0 errors |
| `grep "Title order={5} mb=\"sm\"" src/components/explorer/RelatedResourcesPanel.tsx` | 1 match (UI-SPEC typography lock) |
| `grep "title=\"Referenced By\"" src/components/explorer/IncomingReferencesPanel.tsx` | 1 match (UI-SPEC copy lock) |
| `grep "_summary=count&_count=0" src/components/explorer/RelatedResourcesPanel.tsx` | 1 match (D-15 / Findings §2) |
| No `console.*` in either new source file | 0 matches in both files (D-11 silent-drop verified) |

Per-task VALIDATION.md substring-filtered runs (D-15 IDs 48-02-01 through 48-02-06):

```
npx vitest run -t "parallel fetch"          → 1 passed (48-02-01)
npx vitest run -t "all zero counts"         → 1 passed (48-02-02)
npx vitest run -t "silent failure"          → 1 passed (48-02-03)
npx vitest run -t "card click navigation"   → 1 passed (48-02-04)
npx vitest run -t "type not in catalog"     → 1 passed (48-02-05)
npx vitest run -t "Observation renders"     → 1 passed (48-02-06)
npx vitest run -t "structural equivalence"  → 1 passed (D-16 partial)
```

## Next Phase Readiness

- **Plan 48-03 unblocked.** The `RelatedResourcesPanel` export interface matches D-04 verbatim. 48-03 can:
  1. `import { RelatedResourcesPanel } from './RelatedResourcesPanel'`
  2. Replace `PatientRelatedResources` body with the 12-line delegating wrapper from RESEARCH Code Examples §3
  3. Edit `ResourceDetailPage.tsx` to add the below-Tabs ternary mount per D-07
  4. Add `PatientRelatedResources.test.tsx` regression baseline per D-16 (snapshot pre-refactor DOM, then verify post-refactor matches)
- **No blockers.** All locked decisions (D-04, D-06, D-08, D-10, D-11, D-12, D-13, D-15) implemented.
- **Patient-side regression baseline (D-16 full)** is explicitly deferred to 48-03 per the plan; this plan ships the cross-wrapper structural-equivalence half only.

## Self-Check: PASSED

- [x] `src/components/explorer/RelatedResourcesPanel.tsx` exists (FOUND)
- [x] `src/components/explorer/IncomingReferencesPanel.tsx` exists (FOUND)
- [x] `src/components/explorer/__tests__/RelatedResourcesPanel.test.tsx` exists (FOUND)
- [x] `src/components/explorer/__tests__/IncomingReferencesPanel.test.tsx` exists (FOUND)
- [x] Commit `a5155cd` exists (FOUND — test RED #1)
- [x] Commit `b51ec13` exists (FOUND — feat GREEN #1)
- [x] Commit `98aaf7b` exists (FOUND — test RED #2)
- [x] Commit `0bb60b2` exists (FOUND — feat GREEN #2)
- [x] No edits to `PatientRelatedResources.tsx` or `ResourceDetailPage.tsx` (verified via `git log --name-only`)

---
*Phase: 48-theme-c-reverse-references-incoming-references-panel*
*Completed: 2026-05-01*
