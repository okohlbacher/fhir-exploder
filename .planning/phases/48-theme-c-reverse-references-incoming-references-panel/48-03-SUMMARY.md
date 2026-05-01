---
phase: 48-theme-c-reverse-references-incoming-references-panel
plan: 03
subsystem: ui
tags: [react, mantine, vitest, rtl, fhir, reverse-references, refactor, snapshot-test, mount-relocation, REVR-03]

# Dependency graph
requires:
  - phase: 48-01
    provides: reverseReferenceCatalog (Patient entry with 11 catalog rows + icons)
  - phase: 48-02
    provides: RelatedResourcesPanel shared render + IncomingReferencesPanel wrapper + stable-singleton-mock test pattern
provides:
  - PatientRelatedResources thin wrapper (28 LOC) delegating to RelatedResourcesPanel (D-05)
  - ResourceDetailPage single below-Tabs ternary mount (D-07)
  - PatientRelatedResources regression snapshot baseline (D-16, byte-identical DOM)
  - 48-HUMAN-UAT.md scaffold for 3 manual live-Blaze verifications
  - Mock extension pattern for ResourceDetailPage tests (fhirUrl + get stubs in mockClient)
affects:
  - 48 (phase closure — REVR-03 satisfied)
  - 49 (graph view consumes the same catalog and the established mount-position convention)

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Snapshot test written FIRST against pre-refactor source, then preserved unchanged through refactor — proves byte-identical DOM (D-19 invariant) without manual diff inspection"
    - "Snapshot the panel <div> not container.firstChild — MantineProvider injects <style> as the first child and would dominate the snapshot otherwise"
    - "Below-Tabs ternary mount as the unified slot for both wrappers (D-07) — single placement decision, two render paths"

key-files:
  created:
    - src/components/explorer/__tests__/PatientRelatedResources.test.tsx
    - src/components/explorer/__tests__/__snapshots__/PatientRelatedResources.test.tsx.snap
    - .planning/phases/48-theme-c-reverse-references-incoming-references-panel/48-HUMAN-UAT.md
  modified:
    - src/components/explorer/PatientRelatedResources.tsx
    - src/components/explorer/ResourceDetailPage.tsx
    - src/__tests__/resource-detail.test.tsx
    - src/__tests__/reference-navigation.test.tsx

key-decisions:
  - "TDD ordering enforced: snapshot test (Task 1) GREEN against pre-refactor → refactor (Task 2) → snapshot STILL GREEN proves no DOM delta"
  - "Snapshot target is container.querySelector('div:not([data-mantine-styles])') not container.firstChild — bypasses MantineProvider style injection"
  - "ResourceDetailPage mount uses the new ternary's resource.resourceType (from fetched Resource) per D-07 verbatim, not the URL-param resourceType — functionally identical when resource is loaded but aligns with the IncomingReferencesPanel branch"
  - "Existing test mocks (resource-detail.test.tsx + reference-navigation.test.tsx) extended with fhirUrl + get stubs — auto-fix Rule 1 because the new IncomingReferencesPanel mount on non-Patient resources would otherwise crash with TypeError on the missing methods"

patterns-established:
  - "Pattern: TDD-style regression snapshot — write+green test against pre-refactor source, then refactor, snapshot must stay byte-identical"
  - "Pattern: Mock extension on shared mockClient when adding new MedplumClient API surface (fhirUrl + get) so existing tests don't break"

requirements-completed: [REVR-03]

# Metrics
duration: 8min
completed: 2026-05-01
---

# Phase 48 Plan 03: PatientRelatedResources refactor + below-Tabs mount unification Summary

**PatientRelatedResources shrinks 107 → 28 LOC delegating to the shared RelatedResourcesPanel; ResourceDetailPage relocates the panel mount from above-Tabs Patient-only to a single below-Tabs ternary covering Patient + non-Patient — proven byte-identical via a 6-test regression snapshot baseline taken pre-refactor and preserved unchanged through the refactor.**

## Performance

- **Duration:** 8 min
- **Started:** 2026-05-01T18:17:29Z
- **Completed:** 2026-05-01T18:25:09Z
- **Tasks:** 4 (Task 4 = HUMAN-UAT scaffold; auto-mode treats human-verify as approved)
- **Files created:** 3 (test + snapshot + UAT)
- **Files modified:** 4 (2 source + 2 test mock extensions)

## Accomplishments

- **PatientRelatedResources.tsx** body shrinks 107 → 28 LOC. The hardcoded `RELATED_TYPES` array is gone; the wrapper now consumes `reverseReferenceCatalog.Patient` (Plan 48-01) and delegates to `<RelatedResourcesPanel>` (Plan 48-02). Export name + `{ patientId: string }` prop signature unchanged (D-19 invariant). Only one production caller (`ResourceDetailPage.tsx`) — verified via grep.
- **ResourceDetailPage.tsx** mount-point relocation per D-07: above-Tabs Patient-only mount block (was lines 172–174) deleted; new single ternary mounted AFTER `</Tabs>` and BEFORE `</Stack>` — Patient → `PatientRelatedResources`, otherwise → `IncomingReferencesPanel`. Plus new `IncomingReferencesPanel` import.
- **PatientRelatedResources regression baseline** at `src/components/explorer/__tests__/PatientRelatedResources.test.tsx` — 6 it() blocks each with the literal `"byte-identical to baseline"` substring (matches VALIDATION.md task 48-03-01 filter `-t "byte-identical to baseline"`). Test file written FIRST against the pre-refactor source, snapshot file generated, both committed BEFORE the refactor (Task 1 commit `ec75929`). After Task 2 refactor, ALL 6 tests including the snapshot still pass unchanged → D-19 byte-identical invariant proven.
- **48-HUMAN-UAT.md scaffold** for the 3 manual live-Blaze verifications (panel position below Tabs on Patient + non-Patient + Provenance silent-null; card click navigation on live data; Slow 3G loading skeletons). Frontmatter: `status: pending`, `requires_live_blaze: true`. Tester walks the steps post-merge to close the manual leg of REVR-02 + REVR-03.

## Task Commits

Each task was committed atomically:

1. **Task 1: PatientRelatedResources regression baseline (D-16)** — `ec75929` (test)
2. **Task 2: PatientRelatedResources refactor + ResourceDetailPage mount relocation** — `422e45f` (refactor)
3. **Task 3: 48-HUMAN-UAT.md scaffold** — `e1b3991` (docs)
4. **Task 4: HUMAN-UAT live-Blaze checkpoint** — auto-approved (auto-mode treats human-verify as approved per orchestrator chain flag); the scaffold itself was Task 3's deliverable.

## Files Created/Modified

### Created
- `src/components/explorer/__tests__/PatientRelatedResources.test.tsx` (178 LOC) — 6 byte-identical-baseline it() blocks: 11-cards-render, emoji-icons-preserved, card-click-navigation, section-title-verbatim, all-zero-null-behaviour, full-DOM-snapshot. Stable-singleton useMedplum mock pattern (per 48-02 pitfall finding). Module-scoped `PATIENT_ENTRIES` read from the catalog so future catalog edits don't mechanically break the test.
- `src/components/explorer/__tests__/__snapshots__/PatientRelatedResources.test.tsx.snap` (484 LOC) — immutable regression baseline of the panel DOM (the `<div>` wrapping `<Title>` + `<SimpleGrid>` + 11 `<Card>`s). Generated against the pre-refactor source in Task 1; preserved unchanged through Task 2's refactor.
- `.planning/phases/48-theme-c-reverse-references-incoming-references-panel/48-HUMAN-UAT.md` (112 LOC) — 3 UAT items + sign-off block; status `pending`, requires live Blaze.

### Modified
- `src/components/explorer/PatientRelatedResources.tsx` (107 → 28 LOC) — deleted: `RELATED_TYPES`, `useEffect`/`useState`/`useMemo`/`useNavigate`/`useMedplum` imports, the entire render path. Added: 2 imports (`reverseReferenceCatalog`, `RelatedResourcesPanel`). Body is now a single `return <RelatedResourcesPanel ... />` JSX expression.
- `src/components/explorer/ResourceDetailPage.tsx` — added `import { IncomingReferencesPanel } from './IncomingReferencesPanel'`. Deleted the 3-line above-Tabs Patient-only mount block. Added 5-line below-Tabs ternary mount.
- `src/__tests__/resource-detail.test.tsx` — extended `mockClient` with `fhirUrl` + `get` stubs (Rule 1 auto-fix; the new IncomingReferencesPanel mount on Condition resources called these methods, crashing the existing test render).
- `src/__tests__/reference-navigation.test.tsx` — same extension applied.

## Decisions Made

- **TDD ordering is load-bearing.** The regression snapshot MUST be written and pass against the PRE-REFACTOR component first; only then is the refactor safe. Reverse ordering (refactor first, snapshot after) would make the snapshot prove nothing — it would just lock in whatever the refactor produced. The plan's task order enforces this and was followed strictly.
- **Snapshot target = panel `<div>`, not `container.firstChild`.** Initial run produced a 13-line snapshot containing ONLY the MantineProvider's injected `<style>` tag. Fix: snapshot `container.querySelector('div:not([data-mantine-styles])')`. Re-ran → 484-line snapshot capturing the actual panel DOM (Title + SimpleGrid + 11 Cards with Mantine class names, badge counts, emoji icons, click-target structure).
- **Mount-point ternary uses `resource.resourceType`, not `resourceType` URL-param.** Per D-07 verbatim. Functionally identical when `resource` is loaded (the truthy guard precedes the ternary), but aligns with `IncomingReferencesPanel`'s expectation of a `Resource` object.
- **Test mocks extended automatically (Rule 1 deviation).** The new `IncomingReferencesPanel` mount on non-Patient resource detail pages calls `client.fhirUrl(...)` and `client.get(...)`. The pre-existing `mockClient = { readResource }` shapes in `resource-detail.test.tsx` and `reference-navigation.test.tsx` lacked these methods → 7 test failures with `TypeError: client.fhirUrl is not a function`. Fix: extend both mocks with `fhirUrl: (p) => ({ toString: () => 'http://test/fhir/' + p })` and `get: vi.fn().mockResolvedValue({ resourceType: 'Bundle', total: 0 })`. Both files now pass; full suite restored to its baseline (only the pre-existing Phase 40 deuteranopia failure remains).

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Snapshot captured MantineProvider style tag instead of component DOM**
- **Found during:** Task 1 (initial run of the regression snapshot test)
- **Issue:** First run produced a 13-line snapshot file containing only `<style data-mantine-styles="true">...</style>`. The MantineProvider injects this style element as `container.firstChild`, displacing our component's `<div>` to a sibling position.
- **Fix:** Changed the snapshot target from `container.firstChild` to `container.querySelector('div:not([data-mantine-styles])')`. Re-ran to regenerate the snapshot (484 lines, captures the actual panel DOM).
- **Files modified:** `src/components/explorer/__tests__/PatientRelatedResources.test.tsx`
- **Verification:** Snapshot file `wc -l` = 484 (vs. 13 originally); contains `Related Resources` title text, 11 Card divs, badge counts, emoji icons.
- **Committed in:** `ec75929` (Task 1 commit; the deletion+regeneration happened pre-commit so this is a captured-once-correctly outcome rather than a fix-after-commit).

**2. [Rule 1 - Bug] Existing test mocks crashed when IncomingReferencesPanel mounted on non-Patient resources**
- **Found during:** Task 2 (full suite gate run after the mount-point relocation)
- **Issue:** `src/__tests__/resource-detail.test.tsx` and `src/__tests__/reference-navigation.test.tsx` mock `useMedplum` to return `{ readResource: mockReadResource }`. After relocation, `ResourceDetailPage` mounts `IncomingReferencesPanel` for any non-Patient resource (Condition in these tests' fixture), which calls `client.fhirUrl(...)` + `client.get(...)`. Both methods missing from the mock → `TypeError: client.fhirUrl is not a function`. 7 tests failed with this trace.
- **Fix:** Extended `mockClient` in both files to include `fhirUrl: (p) => ({ toString: () => 'http://test/fhir/' + p })` + `get: vi.fn().mockResolvedValue({ resourceType: 'Bundle', total: 0 })`. The `total: 0` resolution makes the panel return null (no card render needed for these tests' assertions).
- **Files modified:** `src/__tests__/resource-detail.test.tsx`, `src/__tests__/reference-navigation.test.tsx`
- **Verification:** Both files re-run individually → 29/29 tests pass. Full suite re-run → 1370 passed, 1 failure (the pre-existing Phase 40 deuteranopia carry-over per VALIDATION.md).
- **Committed in:** `422e45f` (folded into the Task 2 mount-relocation commit since the mock extension is a direct consequence of the production-code change).

---

**Total deviations:** 2 auto-fixed (both Rule 1 bugs caused by my changes — neither pre-existing nor scope creep)
**Impact on plan:** Both fixes were essential to land the refactor cleanly. The snapshot fix produced a stronger regression baseline; the mock fix preserved the existing test contract under the new mount surface. No new abstractions or scope additions.

## Issues Encountered

- **First snapshot run captured MantineProvider style only.** Documented as Deviation #1 above — fixed within Task 1 before commit.
- **7 cascading test failures from missing `fhirUrl`/`get` on the existing mock.** Documented as Deviation #2 above — fixed within Task 2.

No other issues. Tasks 1, 2, 3 each completed within a single iteration after the above fixes.

## User Setup Required

None — no external service configuration required. All work is in-app TypeScript + tests + a markdown UAT scaffold; no env vars, no schemas, no deployments.

The 48-HUMAN-UAT.md scaffold is the user-action item: post-merge, a tester walks 3 verifications on local Blaze (panel position below Tabs, card click navigation on live data, Slow 3G loading skeletons) and fills in the sign-off block. Status starts at `pending` per the frontmatter.

## Verification

Per the plan's `<verification>` block, all gates green:

| Check | Result |
|-------|--------|
| `npx vitest run src/components/explorer/__tests__/PatientRelatedResources.test.tsx` | PASS — 6/6 tests including snapshot in 781 ms |
| `npx vitest run src/components/explorer/__tests__/RelatedResourcesPanel.test.tsx src/components/explorer/__tests__/IncomingReferencesPanel.test.tsx src/utils/__tests__/reverseReferenceCatalog.test.ts` | PASS — 24/24 across the 4 phase-48 test files (Plan 48-01 + 48-02 still green) |
| `npm test` | PASS modulo 1 — 1370/1393 pass; only the pre-existing Phase 40 deuteranopia carry-over fails (per VALIDATION.md note) |
| `npx tsc -b --noEmit` | PASS — 0 errors |
| `npm run build` | PASS — production bundle compiled in 692 ms |
| `grep -c "PatientRelatedResources" src/components/explorer/ResourceDetailPage.tsx` | 2 (1 import + 1 JSX in the new ternary; old above-Tabs usage gone) |
| `grep -c "IncomingReferencesPanel" src/components/explorer/ResourceDetailPage.tsx` | 2 (1 import + 1 JSX in the ternary) |
| `grep "resource.resourceType === 'Patient'" src/components/explorer/ResourceDetailPage.tsx` | 1 match (the new ternary branch — D-07) |
| `awk '/<\/Tabs>/{f=1; next} f && /resource.resourceType === .Patient./{print "FOUND"; exit}' ResourceDetailPage.tsx` | "FOUND" — ternary sits AFTER `</Tabs>` |
| `grep -rln "import.*PatientRelatedResources" src/` | 2 (`ResourceDetailPage.tsx` + the new test file). D-19 invariant: only production caller is unchanged. |
| `wc -l src/components/explorer/PatientRelatedResources.tsx` | 28 (within 12–30 acceptance band; was 107 pre-refactor) |
| 48-HUMAN-UAT.md exists with `UAT-01`, `UAT-02`, `UAT-03`, `requires_live_blaze: true`, `status: pending` | All 5 grep checks pass |

Per-task VALIDATION.md substring-filtered runs:

```
npx vitest run src/components/explorer/__tests__/PatientRelatedResources.test.tsx -t "byte-identical to baseline"
  → 6 passed (covers VALIDATION task 48-03-01 fully)
npx vitest run src/components/explorer/__tests__/PatientRelatedResources.test.tsx -t "byte-identical to baseline: full DOM snapshot"
  → 1 passed (the strongest regression guard — proves D-19 byte-identical)
```

## Next Phase Readiness

- **Phase 48 closure-criterion #4 satisfied** ("PatientRelatedResources and IncomingReferencesPanel share a single render component — no two-component duplication; existing Patient detail UX shows zero regression"). The "zero regression" half is proven by the snapshot test; the "single render component" half was delivered by Plan 48-02.
- **REVR-01 ✓ (48-01), REVR-02 ✓ (48-02), REVR-03 ✓ (48-03)** — all three Phase 48 requirements complete.
- **Phase 48 is ready for `/gsd-verify-work` then phase close.** The HUMAN-UAT walk is the only outstanding manual leg; per the orchestrator's verification step, the tester will run it post-merge and fill in the sign-off block.
- **Phase 49 (graph view) unblocked.** The catalog (48-01) and the unified below-Tabs mount slot (48-03) are both prerequisites the graph view will consume.

## Self-Check: PASSED

- [x] `src/components/explorer/__tests__/PatientRelatedResources.test.tsx` exists (FOUND)
- [x] `src/components/explorer/__tests__/__snapshots__/PatientRelatedResources.test.tsx.snap` exists (FOUND, 484 lines)
- [x] `src/components/explorer/PatientRelatedResources.tsx` refactored to 28 LOC (FOUND, contains `import { RelatedResourcesPanel }`, `import { reverseReferenceCatalog }`, `title="Related Resources"`, `reverseReferenceCatalog.Patient ?? []`)
- [x] `src/components/explorer/ResourceDetailPage.tsx` has `IncomingReferencesPanel` import + ternary mount (FOUND below `</Tabs>`)
- [x] `.planning/phases/48-theme-c-reverse-references-incoming-references-panel/48-HUMAN-UAT.md` exists with UAT-01, UAT-02, UAT-03 + frontmatter `status: pending` + `requires_live_blaze: true` (FOUND)
- [x] Commit `ec75929` exists (FOUND — test regression baseline)
- [x] Commit `422e45f` exists (FOUND — refactor + mount relocation + mock extensions)
- [x] Commit `e1b3991` exists (FOUND — HUMAN-UAT scaffold)
- [x] D-19 caller invariant: `grep -rln "import.*PatientRelatedResources" src/` returns 2 (ResourceDetailPage + new test); only production caller `ResourceDetailPage.tsx` unchanged.
- [x] Snapshot test `byte-identical to baseline: full DOM snapshot` passes against the refactored wrapper (proves D-19 byte-identical).

---
*Phase: 48-theme-c-reverse-references-incoming-references-panel*
*Completed: 2026-05-01*
