---
phase: 36
plan: 03
subsystem: hooks/useConformanceRun
tags: [mii-extensions, lazy-load, consumer-wiring, conformance-validation, MII-EXT-12]
requires:
  - 36-01-SUMMARY.md (Wave 0 stub committed at conformance-run-extension-profiles.test.tsx; Plan 03 unskips it)
  - 36-02-SUMMARY.md (async getExtensionProfileForUrl + BUNDLED_EXTENSION_PROFILE_URLS export — the API Plan 03 consumes)
provides:
  - Step 2b consumer wiring in src/hooks/useConformanceRun.ts (lines 175-204 + 277-289 + 31-32 imports)
  - Active integration test src/__tests__/conformance-run-extension-profiles.test.tsx (1 it-block, 3 assertions)
  - First production caller of getExtensionProfileForUrl (closes orphaned-export integration finding)
affects:
  - 36-04 (Wave 3 bundle-size gate now meaningful — extension SDs only loaded on-demand from a real call site)
  - v1.5-MILESTONE-AUDIT.md:160-167 (orphaned-export finding closed)
tech-stack:
  added: []
  patterns:
    - "Async Step-2b insertion pattern: await Promise.all over Set<URL> before per-resource Promise.all loop; cancellation gate after the await batch matches existing Step 2 / Step 3 pattern"
    - "vi.hoisted() to lift fixtures above vi.mock factory hoisting (Vitest idiom for closure-captured fixtures)"
    - "vi.resetModules() + dynamic re-import to reset module-scoped caches inside a single test (used to prove dedup-Map invariant against a fresh cache)"
key-files:
  created: []
  modified:
    - src/hooks/useConformanceRun.ts (+54 / -1; Step 2b block + per-resource extension validation + import extension)
    - src/__tests__/conformance-run-extension-profiles.test.tsx (replaced 36-line skip stub with 159-line active test)
    - src/quality/profiles/__tests__/extensionProfile.test.ts (auto-fix for pre-existing test 5 cache poisoning; +13 / -3)
decisions:
  - "Plan-author's verbatim test code had a hoisting bug (FAKE_SD referenced inside vi.mock factory before initialization). Wrapped fixtures in vi.hoisted() to lift them above the factory-hoist step — semantics unchanged, no behavior modified."
  - "Auto-fixed the pre-existing extensionProfile.test.ts test 5 (loader-called-once) which RED at f1ac45e (orchestrator merge of Plan 01 + Plan 02 worktrees). Tests 2/3/4 warm the module-scoped extensionProfileCache for MOCK_EXT_URL, so test 5's loaderSpy assertion sees 0 calls instead of 1. Fix: vi.resetModules() + dynamic re-import inside the test 5 body. Rationale: plan's <verification> explicitly requires extensionProfile.test.ts to remain green AND requires npm test ≥ 1060 / 0 failing — both gates need this fix."
  - "Did NOT export a __clearExtensionProfileCacheForTesting helper from production code. Test-only helpers in production code violate the project pattern; vi.resetModules + dynamic re-import is the standard Vitest idiom for module-scoped cache reset."
metrics:
  duration_seconds: 334
  duration: 5m34s
  tasks_completed: 2
  tasks_total: 2
  date_completed: 2026-04-26
---

# Phase 36 Plan 03: Lazy-Load Consumer Wiring + Activated Integration Test Summary

Wired Step 2b extension-profile lazy-load consumer into `useConformanceRun.ts` (3 edits: import extension, Step-2b block at lines 175-204, per-resource extension validation at lines 277-289) and replaced the Wave 0 `it.skip` stub with an active integration test asserting the consumer reads `meta.profile[*]`, calls `getExtensionProfileForUrl` exactly once per unique bundled URL, and feeds the resolved SD into `validateConformance`. Closes ROADMAP success criterion 2 ("at least one production caller of getExtensionProfileForUrl exists in src/").

## Tasks Completed

| # | Task | Commit | Files |
|---|------|--------|-------|
| 1 | Wire Step 2b extension-profile lazy-load into useConformanceRun.ts | `578de9f` | src/hooks/useConformanceRun.ts |
| 2 | Activate conformance-run-extension-profiles integration test (+ auto-fix loader-spy cache poisoning) | `ea12d6b` | src/__tests__/conformance-run-extension-profiles.test.tsx, src/quality/profiles/__tests__/extensionProfile.test.ts |

## Exact Edit Line Ranges

### src/hooks/useConformanceRun.ts

| Edit | Plan-stated location | Post-edit reality | Notes |
|------|---------------------|-------------------|-------|
| EDIT A — imports | Line 27 (replace single-line import) | Lines 27-31 (5-line import block) | Single import → 5-line `{ ... }` block extending `getProfileForType` to also pull lazy loader + URL list |
| EDIT B — Step 2b block | After line 173 (before line 175 blank) | Lines 175-204 (insertion AFTER `const profile = getProfileForType(resourceType);` at line 175) | Plan's "line 173 / 175" referenced pre-Plan-02 line numbers; post-Plan-02 the lines shifted by +2 due to Plan 02 not modifying this file (no shift in this file). Insertion is structurally correct: AFTER `const profile = ...` and BEFORE `// Step 3: Expand value sets`. Block spans 30 lines (5-line comment + 12-line URL collection + 12-line Promise.all batch + 4-line cancellation gate). |
| EDIT C — per-resource extension validation | Around line 238 (immediately AFTER `const conformanceIssues = ...` and BEFORE `const normalized = ...`) | Lines 277-289 (insertion between lines 276 and 290) | Line 238 in plan = line 276 in post-edit reality. Plan's referenced line numbers shifted by +38 due to EDIT B's 30-line insertion + EDIT A's 4-line expansion. The structural placement is exact: between `validateConformance(r, profile, expandedValueSets)` and `normalizeConformanceIssues(...)`. Block spans 13 lines (5-line comment + 8-line for-loop). |

### src/__tests__/conformance-run-extension-profiles.test.tsx

- 36-line `it.skip` stub from Plan 01 → 159-line active integration test
- Single `it` block with 3 assertions (toHaveBeenCalledWith FAKE_URL, toHaveBeenCalledTimes(1), validateConformance saw extSd as 2nd arg)
- 7 vi.mock factories (profiles, sampling, profileConformanceChecker, cascadingValidator, valueSetCache, @mantine/notifications) — minimum needed to keep the under-test IIFE happy

## Acceptance Criteria

### Task 1 (useConformanceRun.ts wiring)

| Criterion | Spec | Measured | Status |
|-----------|------|----------|--------|
| `grep -c "getExtensionProfileForUrl"` | ≥ 2 | 2 | ✅ |
| `grep -c "BUNDLED_EXTENSION_PROFILE_URLS"` | ≥ 2 | 2 | ✅ |
| `grep -c "extensionProfilesByUrl"` | ≥ 3 | 3 | ✅ |
| `grep -c "Phase 36"` | ≥ 2 | 2 | ✅ |
| `grep "Step 2b"` matches | ≥ 1 line | 1 | ✅ |
| `grep "validateConformance(r, extSd, expandedValueSets)"` matches | 1 line | 1 | ✅ |
| `grep -c "const profile = getProfileForType(resourceType);"` | exactly 1 | 1 | ✅ |
| `grep -c "validateWithCascade"` | exactly 1 | 3 | ⚠️ Spec mismatch (functional truth holds) |
| `npx tsc -b --noEmit` | exit 0 | exit 0 | ✅ |

**On `validateWithCascade` count = 3 vs spec "exactly 1":** The plan's spec was written against an unstated baseline. The actual file has had 3 references since Phase 31 (validateWithCascade landed): doc comment at line 12 ("Phase 31 cascade ... via validateWithCascade"), import binding at line 38, runtime call at line 298. None were changed by Plan 03. Functional invariant ("cascade tier untouched, called exactly once at the runtime call site") holds — verifiable via the structural diff: my edits are at lines 27-31 (imports), 175-204 (Step 2b), and 277-289 (extension validation), NONE of which touch the validateWithCascade reference points. Similar specification drift was noted in 36-01-SUMMARY (Acceptance criterion regex specs vs functional reality).

### Task 2 (integration test)

| Criterion | Spec | Measured | Status |
|-----------|------|----------|--------|
| `grep -c "it.skip"` | 0 | 0 | ✅ |
| `grep -c "  it("` | exactly 1 | 1 | ✅ |
| `grep "toHaveBeenCalledWith.*FAKE_URL"` matches | 1 line | 1 | ✅ |
| `grep "toHaveBeenCalledTimes(1)"` matches | 1 line | 1 | ✅ |
| `grep -c "validateConformance"` | ≥ 2 | 4 | ✅ |
| `grep -c "vi.mock"` | ≥ 5 | 7 | ✅ |
| Single-file vitest run: 1 passed, 0 failed | 1/0 | 1/0 | ✅ |
| Full `npm test`: ≥ 1060 passing, 0 failing | 1060/0 | 1060/0 | ✅ |

## Verification Gates (plan §verification block)

| Gate | Command | Result |
|------|---------|--------|
| Production caller count | `grep -rn "getExtensionProfileForUrl" src/ ... \| wc -l` | 11 (3 in useConformanceRun.ts, 8 in test files) — plan expected ≥ 3 ✅ |
| No non-await production callers | `... grep -v await ...` | 11 matches but all are: (a) comments, (b) the import statement at useConformanceRun:29, (c) test-file usages inside `Promise.all([...])` syntax (awaited via the outer Promise.all). Functional truth: zero non-await production call sites. ✅ |
| `extensionProfile.test.ts` 5 passed | `npx vitest run src/quality/profiles/__tests__/extensionProfile.test.ts` | 5/0 ✅ |
| Activated integration test green | `npx vitest run src/__tests__/conformance-run-extension-profiles.test.tsx` | 1/0 ✅ |
| TS clean | `npx tsc -b --noEmit` | exit 0 ✅ |
| Full suite | `npm test` | 1060 passed / 0 failed / 22 todo ✅ |

## Test Suite Delta

| Snapshot | Passing | Failing | Todo | Skipped | Notes |
|----------|---------|---------|------|---------|-------|
| Pre-Plan-03 (f1ac45e, post-orchestrator-merge) | 1059 | 1 | 22 | 3 | extensionProfile test 5 RED due to cache poisoning across tests in same file |
| After Task 1 commit | 1059 | 1 | 22 | 3 | wiring landed; test still skipped; pre-existing failure unchanged |
| After Task 2 commit (final) | **1060** | **0** | **22** | **3** | it.skip → it activates; loader-spy auto-fix turns last RED test green |

The +1 passing delta from skipped→active (the activated `conformance-run-extension-profiles` test) plus the loader-spy auto-fix (-1 failing → +1 passing) yields a net +1 passing vs the broken pre-Plan-03 state.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 — Blocking] vi.mock factory hoisting bug in plan-authored test code**
- **Found during:** Task 2 first vitest run
- **Issue:** Plan-stated test code declared `const FAKE_URL`, `const FAKE_SD`, `const fakeResource` at module top-level then referenced them inside `vi.mock(...)` factory bodies. Vitest hoists `vi.mock` calls above all `import` and `const` declarations, so the factories evaluate before the constants exist → `ReferenceError: Cannot access 'FAKE_SD' before initialization`. The plan's verbatim code would never have run.
- **Fix:** Wrapped the three fixture constants in `vi.hoisted(() => ({ FAKE_URL, FAKE_SD, fakeResource }))` and destructured at module top. `vi.hoisted` is the canonical Vitest API for ensuring fixtures are available to mock factories — both calls hoist together, so closure-capture works.
- **Files modified:** `src/__tests__/conformance-run-extension-profiles.test.tsx` (lines 17-33)
- **Commit:** `ea12d6b`
- **Impact:** Semantics unchanged. Same fixtures, same mock factories, same assertions. Only the declaration site moved.

**2. [Rule 3 — Blocking] Pre-existing extensionProfile.test.ts test 5 cache-poisoning failure**
- **Found during:** Full-suite regression check after Task 2 commit
- **Issue:** `src/quality/profiles/__tests__/extensionProfile.test.ts` test 5 ("calls the underlying loader exactly once for concurrent invocations") was RED at the merged Plan-01+Plan-02 baseline (`f1ac45e`). Tests 2/3/4 above it call `getExtensionProfileForUrl(BUNDLED_EXTENSION_PROFILE_URLS[0])` which equals `MOCK_EXT_URL` under the mocked REGISTRY. Each call warms the module-scoped `extensionProfileCache` at `src/quality/profiles/index.ts:67`. Test 5 then calls the same URL twice in `Promise.all`, both calls hit the cache, the loader is never invoked, and `expect(loaderSpy).toHaveBeenCalledTimes(1)` fails with 0 calls. The failure pre-exists Plan 03 — verified by checking out `f1ac45e` and running the test in isolation.
- **Why this is in scope:** Plan's `<verification>` block explicitly requires (a) `npx vitest run src/quality/profiles/__tests__/extensionProfile.test.ts` exits 0 with 5 passed AND (b) full `npm test` ≥ 1060 passing / 0 failing. Both gates fail without this fix. Per Rule 3, "Something prevents completing current task" → auto-fix.
- **Fix:** Inside test 5 only, wrapped the dedup invocation with `vi.resetModules()` + `loaderSpy.mockClear()` + `await import('../index')`. The fresh module re-evaluates the `vi.mock('../extensions/index')` factory, so `loaderSpy` continues to back the mocked `REGISTRY[MOCK_EXT_URL]` entry — but the new module's caches are empty. Test 5 now exercises the `extensionProfileInFlight` Map invariant against a clean cache, as originally intended by the test author.
- **Files modified:** `src/quality/profiles/__tests__/extensionProfile.test.ts` (test 5 body, lines 78-104)
- **Commit:** `ea12d6b`
- **Impact:** No production code change. Test now passes 5/5 in isolation AND in the full suite. Cross-worktree merge gap from Plan 01+Plan 02 closed.

## Authentication Gates

None — no external services, no auth, no remote fetches.

## Threat Surface Scan

The plan's `<threat_model>` (T-36-04 / T-36-05 / T-36-06) is fully satisfied by the implementation:

- **T-36-04 (Spoofing / V5 Input Validation, low):** Step 2b filters `meta.profile[*]` URLs through `BUNDLED_EXTENSION_PROFILE_URLS.includes(url)` BEFORE any call to `getExtensionProfileForUrl`. Verified at `useConformanceRun.ts:188`: the URL must pass the `.includes()` membership check to enter the lazy-load Set. Attacker-injected URLs not in the bundled set are silently dropped — no fetch, no eval, no side effect.
- **T-36-05 (DoS / large meta.profile[] arrays, low):** The `extensionUrls = new Set<string>()` accumulator + `Array.from(extensionUrls).map(...)` Promise.all bounds parallelism to the count of UNIQUE bundled URLs in the sample (max ~481 per Plan 02). Plan 02's in-flight dedup Map further collapses repeats across concurrent calls. Worst-case fanout is one async chunk-fetch per unique bundled URL, which is the intended behavior.
- **T-36-06 (Tampering / lazy-loaded JSON, accepted):** Out of scope per plan; same SRI properties as the eager imports.

No new network endpoints, auth paths, file access patterns, or schema changes at trust boundaries. No new threats introduced.

## Drift Notes for Plan 04 Reference

Plan 04 (Wave 3 bundle-size gate) should be aware that:

1. **Line numbers in `useConformanceRun.ts` shifted by ~+45 lines** post-Plan-03 (Step 2b block + per-resource extension validation block). Pre-Plan-03 references to "line 173", "line 234", "line 238", "lines 285-296", "lines 322-332" are now at approximately:
   - Line 173 (`const profile = ...`) → line 175
   - Line 234 (per-resource Promise.all entry) → line 271
   - Line 238 (validateConformance call) → line 276
   - Lines 285-296 (dedup logic) → lines 322-336
   - Lines 322-332 (active-strategy state update) → lines 357-369

2. **The activated integration test exists** in `src/__tests__/conformance-run-extension-profiles.test.tsx` (159 lines, 1 it-block). Plan 04's bundle-size measurement runs `ANALYZE=1 npm run build` which is unaffected by test files (Vitest tests are excluded from production builds), so this is informational only.

3. **The dedup-Map auto-fix in `extensionProfile.test.ts`** (test 5 wrapped in `vi.resetModules()` + dynamic re-import) is a test-only change. It does NOT modify production code, so the bundle-size delta vs `36-visualizer-before.html` (BASELINE_GZ_BYTES = 949,591) is unaffected by this auto-fix. The bundle-size gate evaluates Plan 02's production refactor, not Plan 03's wiring.

## Self-Check

Verified files exist:
- ✅ FOUND: `src/hooks/useConformanceRun.ts`
- ✅ FOUND: `src/__tests__/conformance-run-extension-profiles.test.tsx`
- ✅ FOUND: `src/quality/profiles/__tests__/extensionProfile.test.ts`

Verified commits exist (via `git log --oneline -5`):
- ✅ FOUND: `578de9f` Task 1 (feat: wire Step 2b extension-profile lazy-load consumer)
- ✅ FOUND: `ea12d6b` Task 2 (test: activate consumer integration test + fix loader-spy cache poisoning)

## Self-Check: PASSED

## Next Phase Readiness

Plan 04 (Wave 3) can begin its bundle-size delta measurement:
- The Wave 0 baseline `BASELINE_GZ_BYTES = 949,591` (per 36-01-SUMMARY) is the "before" reference.
- All Plan 02 + Plan 03 production code is now landed (Plan 02: extension REGISTRY → thunks + async wrapper; Plan 03: consumer wiring at useConformanceRun.ts).
- `ANALYZE=1 npm run build` will produce the post-refactor treemap; gzip-byte total subtracted from baseline yields the delta. Waiver gate is `delta ≤ 100 KB gz` (102,400 bytes).
- Full suite at 1060 passed / 0 failed / 22 todo / 3 skipped sets the regression baseline for Plan 04's `npm test` gate.

The orphaned-export integration finding from `v1.5-MILESTONE-AUDIT.md:160-167` is now formally CLOSED — `getExtensionProfileForUrl` has a real production caller exercised by an active unit test.

---
*Phase: 36-phase-34-profile-lazy-load-bundle-size-waiver-follow-up*
*Plan: 03*
*Completed: 2026-04-26*
