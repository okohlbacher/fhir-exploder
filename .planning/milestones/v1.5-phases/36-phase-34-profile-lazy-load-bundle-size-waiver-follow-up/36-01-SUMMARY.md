---
phase: 36-phase-34-profile-lazy-load-bundle-size-waiver-follow-up
plan: 01
subsystem: testing
tags: [vitest, bundle-size, lazy-load, mii-extensions, baseline]

# Dependency graph
requires:
  - phase: 34-14-mii-extension-modules-palette-bundled-profiles
    provides: src/quality/profiles/extensions/index.ts REGISTRY shape; baseline measurement formula from 34-06-UAT.md
  - phase: 35-phase-30-uat-follow-ups-per-type-quality-matrix
    provides: HEAD commit serving as the bundle-size "before" snapshot
provides:
  - 36-visualizer-before.html (Phase 35 HEAD treemap baseline)
  - BASELINE_GZ_BYTES = 949591 (recorded as HTML comment for Plan 04 delta computation)
  - src/quality/profiles/__tests__/extensionProfile.test.ts (5 it-blocks targeting post-refactor async API)
  - src/__tests__/conformance-run-extension-profiles.test.tsx (1 it.skip stub for Wave 2 consumer wiring)
affects:
  - 36-02 (Plan 02 turns extensionProfile.test.ts tests 2 + 5 GREEN by switching REGISTRY to thunks + adding extensionProfileInFlight dedup Map)
  - 36-03 (Plan 03 unskips conformance-run-extension-profiles.test.tsx + wires useConformanceRun.ts:173)
  - 36-04 (Plan 04 reads BASELINE_GZ_BYTES from this artifact to compute delta = after - before)

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Wave-0 stub-test pattern: commit RED tests targeting post-refactor API; Wave 1+ flips RED→GREEN as Nyquist signal"
    - "Bundle-size baseline-as-artifact: visualizer HTML carries BASELINE_GZ_BYTES comment; subsequent waves subtract from it"

key-files:
  created:
    - .planning/phases/36-phase-34-profile-lazy-load-bundle-size-waiver-follow-up/36-visualizer-before.html
    - src/quality/profiles/__tests__/extensionProfile.test.ts
    - src/__tests__/conformance-run-extension-profiles.test.tsx
  modified: []

key-decisions:
  - "Commit verbatim plan-authored test contents even though Wave 0 RED state is 2 fail (tests 2+5) rather than the 1 fail the plan author anticipated — deliberate: turning them GREEN is Plan 02's job, and a stronger RED signal increases test value"
  - "Baseline measured via plan-mandated formula: find dist/assets -type f \\( -name '*.js' -o -name '*.css' \\) -exec gzip -9c {} \\; | wc -c — guarantees parity with Plan 04 'after' measurement"

patterns-established:
  - "Wave-0 baseline-and-stub plan pattern: 3 artifacts (baseline + 2 stub tests) commit before any production code change in Wave 1+"

requirements-completed:
  - MII-EXT-12

# Metrics
duration: 4m13s
completed: 2026-04-26
---

# Phase 36 Plan 01: Wave 0 Baseline & Stub Tests Summary

**Captured Phase 35 HEAD bundle-size baseline (949,591 gz bytes) and committed two RED-state stub tests targeting the post-refactor async getExtensionProfileForUrl contract and the useConformanceRun extension-profile consumer wiring.**

## Performance

- **Duration:** 4m13s
- **Started:** 2026-04-26T04:09:32Z
- **Completed:** 2026-04-26T04:13:45Z
- **Tasks:** 3
- **Files created:** 3
- **Files modified:** 0

## Accomplishments

- **Baseline captured:** `ANALYZE=1 npm run build` ran cleanly; `dist/bundle-stats.html` (3.4 MB treemap) copied to `36-visualizer-before.html` with `BASELINE_GZ_BYTES: 949591` comment for Plan 04 delta computation.
- **Lazy-load contract test stubbed:** 5 it-blocks in `extensionProfile.test.ts` target the Wave 1 async API (memoize, dedup, null, URL match, loader-call-count). Plan 02 will turn the 2 failing tests GREEN.
- **Consumer wiring stub committed:** `conformance-run-extension-profiles.test.tsx` carries 1 `it.skip` documenting the Plan 03 contract (useConformanceRun reads meta.profile[*] and lazy-loads extension SDs). Test collector counts the skip; suite remains green.

## Task Commits

Each task was committed atomically:

1. **Task 1: Capture Phase 35 HEAD baseline visualizer treemap** - `9105622` (chore)
2. **Task 2: Stub unit tests for async getExtensionProfileForUrl** - `87c68fd` (test)
3. **Task 3: Stub integration test for useConformanceRun consumer wiring** - `169fc62` (test)

## Files Created/Modified

- `.planning/phases/36-phase-34-profile-lazy-load-bundle-size-waiver-follow-up/36-visualizer-before.html` (3,388,742 bytes — Phase 35 HEAD treemap + BASELINE_GZ_BYTES comment)
- `src/quality/profiles/__tests__/extensionProfile.test.ts` (94 lines — 5 it-blocks, vi.mock '../extensions/index', loaderSpy contract test)
- `src/__tests__/conformance-run-extension-profiles.test.tsx` (36 lines — 1 it.skip stub with Plan 03 instructions inline)

## Baseline Measurement (for Plan 04 Wave 3 delta)

```
BASELINE_GZ_BYTES: 949591
```

Source: `find dist/assets -type f \( -name "*.js" -o -name "*.css" \) -exec gzip -9c {} \; | wc -c` on Phase 35 HEAD (`b0df4b8`).

This formula is the canonical one from `34-06-UAT.md:100`. Plan 04 must use the IDENTICAL command on the post-Wave-1+2 build to compute `delta = after - before`. The waiver gate is `delta ≤ 100 KB gz` (102,400 bytes).

## Test Suite State (Wave 0 RED snapshot)

`npm test` after this plan:

```
 Test Files  1 failed | 112 passed | 3 skipped (116)
      Tests  2 failed | 1057 passed | 22 todo (1081)
```

The 2 failing tests are `extensionProfile.test.ts > tests 2 and 5`:
- Test 2 (`returns a StructureDefinition with matching .url for a bundled URL`) fails because `vi.mock('../extensions/index')` replaces REGISTRY with `{ MOCK_EXT_URL: loaderSpy }` — so `BUNDLED_EXTENSION_PROFILE_URLS[0]` resolves to `MOCK_EXT_URL` and the sync `EXTENSION_REGISTRY[url] ?? null` returns the spy function, not an SD. `sd.url` is undefined.
- Test 5 (`calls the underlying loader exactly once`) fails because the sync API does not invoke `EXTENSION_REGISTRY[url]` as a thunk — `loaderSpy` is never called.

**This is the EXPECTED Wave 0 Nyquist RED signal.** Plan 02 will:
1. Switch the bundled REGISTRY to thunk-based dynamic imports → test 5's loaderSpy invocation count goes from 0 → 1.
2. Have `getExtensionProfileForUrl` invoke the thunk and resolve `{ default: SD }` → test 2's `sd.url` becomes defined → assertion passes.
3. Add the `extensionProfileInFlight: Map<string, Promise<SD | null>>` dedup so concurrent calls share a single in-flight Promise → test 5's `toHaveBeenCalledTimes(1)` holds even with two concurrent calls.

After Plan 02 lands, the suite returns to ≥ 1059 passed / 0 failed / 22 todo.

## Decisions Made

- **Honored plan's "EXACT contents" directive for test files** rather than restructuring to match the acceptance criterion's "4 passed + 1 failed" target state. The plan author appears to have not anticipated that mocking REGISTRY at module level also displaces `BUNDLED_EXTENSION_PROFILE_URLS[0]` (since it's derived from REGISTRY). The 3-pass / 2-fail state is functionally equivalent — both failures will turn GREEN under Plan 02's thunk-based registry. Restructuring would have required two separate test fixtures or split files, which the plan did not authorize.
- **Did NOT modify `src/quality/profiles/index.ts`** — Wave 0 is strictly stub + baseline; production-code changes are Wave 1's (Plan 02) job.
- **Did NOT add new runtime dependencies** — plain Vitest `vi.mock` + `vi.fn()` is sufficient.

## Deviations from Plan

None — plan executed exactly as written. Three caveats worth recording (none required intervention):

1. **Wave 0 RED state is 2 fail, not 1 fail.** The plan's verification block predicted "tests 1-4 pass + test 5 fails", but the actual state is "tests 1, 3, 4 pass + tests 2 + 5 fail". This is a consequence of mocking `../extensions/index` at module scope (which the plan instructs verbatim) — it replaces both REGISTRY *and* the BUNDLED_EXTENSION_PROFILE_URLS export. The plan's success criteria ("Wave 0 baseline established: lazy-load + consumer contracts have stub tests in place that Wave 1+2 will satisfy/unskip") is satisfied — both failing tests turn GREEN under Plan 02's thunk REGISTRY refactor. Plan 02's verification gate should assert ≥ 1059 passed (not 1058), to confirm both tests transition.

2. **Acceptance criterion regex spec mismatches actual file indentation.** Task 2 acceptance says `grep -cE "^      it\("` (6 spaces) returns 5; the file uses 2-space indentation per project convention, so 6-space match returns 0. Functional truth: there are 5 `it(` blocks at the describe-block level (verifiable via `grep -nE "^[[:space:]]+it\(" file | wc -l`). Did not introduce non-standard indentation.

3. **Acceptance criterion regex `grep -c "it.skip"` matches 3 lines, not 1.** The 3 matches are: the actual `it.skip(` call + 2 comment references ("this skip", "the skip"). Functional truth: there is exactly 1 `it.skip(` invocation (verifiable via `grep -cE "it\.skip\("`).

## Issues Encountered

None.

## User Setup Required

None — no external service configuration required.

## Self-Check: PASSED

- [x] `.planning/phases/36-.../36-visualizer-before.html` exists (3,388,742 bytes)
- [x] BASELINE_GZ_BYTES: 949591 comment present in visualizer baseline
- [x] `src/quality/profiles/__tests__/extensionProfile.test.ts` exists (94 lines, 5 it-blocks)
- [x] `src/__tests__/conformance-run-extension-profiles.test.tsx` exists (36 lines, 1 it.skip)
- [x] Commit `9105622` exists in git log
- [x] Commit `87c68fd` exists in git log
- [x] Commit `169fc62` exists in git log

## Next Phase Readiness

Plan 02 (Wave 1) can begin: it has a real "before" treemap to diff against AND a contract test that goes RED → GREEN as it lands the thunk-based REGISTRY + extensionProfileInFlight dedup Map. Plan 03 (Wave 2) similarly has its `it.skip` stub waiting to be unskipped. Plan 04 (Wave 3) reads BASELINE_GZ_BYTES = 949591 from this artifact to compute the bundle-size delta gate.

---
*Phase: 36-phase-34-profile-lazy-load-bundle-size-waiver-follow-up*
*Plan: 01*
*Completed: 2026-04-26*
