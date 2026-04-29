---
phase: 36-phase-34-profile-lazy-load-bundle-size-waiver-follow-up
verified: 2026-04-26T08:00:00Z
status: passed
score: 4/4 must-haves verified
overrides_applied: 0
re_verification: null
gaps: []
deferred: []
human_verification: []
---

# Phase 36: Phase 34 Profile Lazy-Load (Bundle-Size Waiver Follow-Up) Verification Report

**Phase Goal:** Address D-23 bundle-size gate failure from Plan 34-06. Switch `src/quality/profiles/extensions/index.ts` from static imports to dynamic `import()` per-canonical-URL, define a real production consumer for `getExtensionProfileForUrl`, and re-measure with `rollup-plugin-visualizer`.
**Verified:** 2026-04-26T08:00:00Z
**Status:** PASSED
**Re-verification:** No — initial verification

---

## Goal Achievement

### Observable Truths

| #  | Truth                                                                                                                                                                                                                        | Status     | Evidence                                                                                                                                                                          |
|----|------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------|------------|-----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------|
| 1  | `src/quality/profiles/extensions/index.ts` no longer uses static `import` for SD JSONs; per-canonical-URL `import()` resolved on first call to `getExtensionProfileForUrl`.                                                 | ✓ VERIFIED | `grep -c "^import sd[0-9]"` → 0; `grep -c "() => import("` → 481; file is 490 lines with `type LazyProfile` + `Record<string, LazyProfile>` REGISTRY; Phase 36 header comment present. |
| 2  | At least one production caller of `getExtensionProfileForUrl` exists (in useConformanceRun) and is exercised by a unit test.                                                                                                  | ✓ VERIFIED | `src/hooks/useConformanceRun.ts` imports and `await`s `getExtensionProfileForUrl` at line 200 (Step 2b). Active integration test `src/__tests__/conformance-run-extension-profiles.test.tsx` has 1 active `it(` (no `.skip`), asserts `toHaveBeenCalledWith(FAKE_URL)` and `toHaveBeenCalledTimes(1)`. |
| 3  | `rollup-plugin-visualizer` treemap shows initial-load bundle delta vs Phase 34 baseline ≤ 100 KB gz; before/after HTMLs committed under `.planning/phases/36-.../`.                                                          | ✓ VERIFIED | `36-visualizer-before.html` (BASELINE_GZ_BYTES: 949591) and `36-visualizer-after.html` (POST_REFACTOR_GZ_BYTES: 1441672, INITIAL_LOAD_GZ_BYTES: 621324) both committed. `36-04-BUNDLE-DELTA.md` records initial-load delta −320.57 KB gz (gate: ≤ 100 KB gz → PASS). Structural proof: `dist/index.html` lists 20 initial-load assets; zero extension SD chunks (`Extension-mii-*` etc.) appear in the initial-load critical path. |
| 4  | `npm test` 1054+ passing / 0 failing; `npx tsc -b --noEmit` clean; `npm run build` clean.                                                                                                                                   | ✓ VERIFIED | Plan 04 SUMMARY records: `npm test` 1060 passed / 0 failed / 22 todo / 3 skipped; `npx tsc -b --noEmit` exit 0; `npm run build` exit 0 / built in 504ms. All three gates green.     |

**Score:** 4/4 truths verified

---

### Required Artifacts

| Artifact                                                                              | Expected                                          | Status     | Details                                                                                                              |
|---------------------------------------------------------------------------------------|---------------------------------------------------|------------|----------------------------------------------------------------------------------------------------------------------|
| `src/quality/profiles/extensions/index.ts`                                            | URL-keyed REGISTRY of lazy thunks (no static SD imports) | ✓ VERIFIED | 490 lines; 0 static `import sdN` lines; 481 `() => import(...)` thunks; `LazyProfile` type; Phase 36 header comment. |
| `src/quality/profiles/index.ts`                                                       | `async getExtensionProfileForUrl` + cache + in-flight dedup | ✓ VERIFIED | `export async function getExtensionProfileForUrl` present; `extensionProfileCache` (3 uses); `extensionProfileInFlight` (5 uses); `mod.default` unwrap; `REGISTRY as EXTENSION_REGISTRY` import; `BUNDLED_EXTENSION_PROFILE_URLS` exported. Sync version absent. |
| `src/hooks/useConformanceRun.ts`                                                      | Step 2b extension-profile lazy-load + validateConformance wiring | ✓ VERIFIED | Imports `getExtensionProfileForUrl` and `BUNDLED_EXTENSION_PROFILE_URLS` (2 uses each); `extensionProfilesByUrl` Map (3 uses); `Step 2b` comment present; `validateConformance(r, extSd, expandedValueSets)` call present. |
| `src/__tests__/conformance-run-extension-profiles.test.tsx`                           | Active integration test (no it.skip) asserting consumer wiring | ✓ VERIFIED | 0 `it.skip` occurrences; 1 active `it(` block; `toHaveBeenCalledWith(FAKE_URL)` and `toHaveBeenCalledTimes(1)` assertions present; 7 `vi.mock` factories. |
| `.planning/phases/36-.../36-visualizer-before.html`                                  | Phase 35 HEAD treemap + BASELINE_GZ_BYTES comment  | ✓ VERIFIED | File exists; `<!-- BASELINE_GZ_BYTES: 949591 -->` comment present.                                                  |
| `.planning/phases/36-.../36-visualizer-after.html`                                   | Post-refactor treemap + POST_REFACTOR_GZ_BYTES + INITIAL_LOAD_GZ_BYTES comments | ✓ VERIFIED | File exists; `<!-- POST_REFACTOR_GZ_BYTES: 1441672 -->` and `<!-- INITIAL_LOAD_GZ_BYTES: 621324 -->` present.       |
| `.planning/phases/36-.../36-04-BUNDLE-DELTA.md`                                      | Authoritative delta report with gate verdict       | ✓ VERIFIED | File exists; baseline/post-refactor measurements; initial-load delta −320.57 KB gz; GATE VERDICT: PASS.              |

---

### Key Link Verification

| From                                          | To                                                | Via                                             | Status     | Details                                                                                 |
|-----------------------------------------------|---------------------------------------------------|-------------------------------------------------|------------|-----------------------------------------------------------------------------------------|
| `src/quality/profiles/index.ts`               | `src/quality/profiles/extensions/index.ts`        | `import { REGISTRY as EXTENSION_REGISTRY }`     | ✓ WIRED    | `grep -c "REGISTRY as EXTENSION_REGISTRY"` → 1 in profiles/index.ts.                   |
| `src/quality/profiles/extensions/index.ts`    | Individual SD JSON files                          | `() => import('./X.json')` thunks               | ✓ WIRED    | 481 thunk entries; no static imports; Vite produces 472 async chunks at build time.     |
| `src/hooks/useConformanceRun.ts`              | `src/quality/profiles/index.ts`                   | `import { getExtensionProfileForUrl, BUNDLED_EXTENSION_PROFILE_URLS }` | ✓ WIRED | Both names imported and used at call sites (lines 29–31, 200, and filter check). |
| `src/hooks/useConformanceRun.ts`              | `validateConformance`                             | `validateConformance(r, extSd, expandedValueSets)` | ✓ WIRED | Call site present; extension SD folded into conformance issues before normalization. |
| `src/__tests__/conformance-run-extension-profiles.test.tsx` | `src/hooks/useConformanceRun.ts` | `vi.mock('../quality/profiles')` + `renderHook(useConformanceRun)` | ✓ WIRED | 7 vi.mock factories; `renderHook` + `act` + `waitFor` pattern; 3 assertions covering caller invocation count and SD argument identity. |

---

### Data-Flow Trace (Level 4)

| Artifact                        | Data Variable           | Source                                      | Produces Real Data | Status     |
|---------------------------------|-------------------------|---------------------------------------------|--------------------|------------|
| `src/quality/profiles/index.ts` | `extensionProfileCache` | `EXTENSION_REGISTRY[url]()` → `mod.default` | Yes — dynamic import resolves to actual SD JSON from bundled chunk | ✓ FLOWING  |
| `src/hooks/useConformanceRun.ts` | `extensionProfilesByUrl` | `await getExtensionProfileForUrl(url)` within `Promise.all` | Yes — result of the async thunk resolver | ✓ FLOWING  |
| `src/__tests__/conformance-run-extension-profiles.test.tsx` | `validateConformance` mock calls | `FAKE_SD` injected via `vi.fn().mockResolvedValue(FAKE_SD)` | Yes — test wires synthetic SD, asserts it reaches validator arg position | ✓ FLOWING  |

---

### Behavioral Spot-Checks

Step 7b skipped for bundle-size artifacts (visualizer HTML files are build outputs, not runnable entry points). Source code checks are runnable:

| Behavior                                  | Check                                                                                   | Result                            | Status  |
|-------------------------------------------|-----------------------------------------------------------------------------------------|-----------------------------------|---------|
| extensions/index.ts has no static imports | `grep -c "^import sd[0-9]" src/quality/profiles/extensions/index.ts`                   | 0                                 | ✓ PASS  |
| 481 lazy thunks present                   | `grep -c "() => import(" src/quality/profiles/extensions/index.ts`                      | 481                               | ✓ PASS  |
| async getter exported                     | `grep "export async function getExtensionProfileForUrl" src/quality/profiles/index.ts`  | 1 match                           | ✓ PASS  |
| consumer import wired                     | `grep -c "getExtensionProfileForUrl" src/hooks/useConformanceRun.ts`                    | 2 (import + await call site)      | ✓ PASS  |
| integration test active (no skip)         | `grep -c "it.skip" src/__tests__/conformance-run-extension-profiles.test.tsx`           | 0                                 | ✓ PASS  |
| both treemap HTMLs committed              | `ls .planning/phases/36-.../*.html`                                                     | before.html + after.html          | ✓ PASS  |
| gate verdict PASS in delta report         | `grep -E "PASS" .planning/phases/36-.../36-04-BUNDLE-DELTA.md`                         | GATE VERDICT: PASS (−320.57 KB gz) | ✓ PASS  |

---

### Requirements Coverage

| Requirement | Source Plan(s) | Description                                                                 | Status     | Evidence                                                                                             |
|-------------|----------------|-----------------------------------------------------------------------------|------------|------------------------------------------------------------------------------------------------------|
| MII-EXT-12  | 36-01 through 36-04 | Lazy-load deferred clause: per-URL `import()` map, real production consumer, bundle gate ≤ 100 KB gz | ✓ SATISFIED | extensions/index.ts regenerated with thunks; async wrapper + cache + dedup in profiles/index.ts; Step 2b consumer in useConformanceRun.ts; active integration test; PASS verdict on initial-load delta; regression gate green. |

MII-EXT-12 is the only requirement ID declared across all four plans. No orphaned REQUIREMENTS.md phase mappings for Phase 36 beyond this requirement.

---

### Anti-Patterns Found

| File | Line | Pattern | Severity | Impact |
|------|------|---------|----------|--------|
| None found | — | — | — | No TODO/FIXME/placeholder or stub patterns in phase 36 modified production files. |

The code review (`36-REVIEW.md`) surfaced 4 warnings (WR-01 through WR-04) and 5 info items — these are code quality items for follow-up, not blockers. None prevent the phase goal from being achieved. Summary:
- **WR-01** (O(n) `Array.includes` vs O(1) Set lookup) — performance concern, not a correctness bug
- **WR-02** (AbortController not propagated to extension loads) — documented risk, not a current correctness bug; bundled JSON loads are near-instant
- **WR-03** (path-traversal class concern in codegen) — current code paths are safe; future maintenance risk only
- **WR-04** (module-scoped cache never cleared) — test isolation note; `vi.resetModules()` already used in test 5 to defend against this

None classify as blockers against the phase goal.

---

### Human Verification Required

None required. All four ROADMAP success criteria are verifiable programmatically:

1. Static import removal and lazy thunk count verified via `grep`.
2. Production caller and active unit test verified via file content inspection.
3. Initial-load delta verified via HTML comment values (621324 B vs 949591 B baseline = −328267 B / −320.57 KB gz) and structural proof via `dist/index.html` listing (zero extension SD chunks in critical path) documented in `36-04-BUNDLE-DELTA.md`.
4. Regression gate counts (1060/0) verified via Plan 04 SUMMARY and commit records.

The visual treemap inspection ("open in browser") described in Plan 04 is confirmatory only; the gate-relevant metric (initial-load delta) is fully established by the INITIAL_LOAD_GZ_BYTES HTML comment and the `dist/index.html` asset enumeration.

---

### Gaps Summary

No gaps. All four ROADMAP success criteria are satisfied:

1. **SC1 (no static SD imports):** `extensions/index.ts` contains 0 static `import sdN` lines and 481 `() => import(...)` thunks. The file is regenerated by `fetch-mii-profiles.mjs` and never contains eager SD imports.

2. **SC2 (production caller + unit test):** `useConformanceRun.ts` Step 2b reads `meta.profile[*]` from sampled resources, filters to `BUNDLED_EXTENSION_PROFILE_URLS`, and `await`s `getExtensionProfileForUrl(url)` in a `Promise.all`. The active integration test (1 `it(` block, 0 `it.skip`) asserts the caller is invoked exactly once with the expected URL and that the resolved SD reaches `validateConformance` as its second argument. Orphaned-export finding from v1.5-MILESTONE-AUDIT closed.

3. **SC3 (treemap / bundle gate):** Before treemap committed with `BASELINE_GZ_BYTES: 949591`. After treemap committed with `POST_REFACTOR_GZ_BYTES: 1441672` and `INITIAL_LOAD_GZ_BYTES: 621324`. Initial-load delta: −320.57 KB gz (gate threshold: ≤ 100 KB gz → PASS by 420 KB margin). The on-disk total increased by +480.55 KB due to Vite emitting 472 individual async chunks (one per canonical URL), but this is non-blocking per-chunk gzip overhead; none of the extension SD chunks appear in `dist/index.html`'s initial-load critical path. Gate verdict: **PASS**.

4. **SC4 (regression gate):** `npm test` 1060 passed / 0 failed (threshold ≥ 1054); `npx tsc -b --noEmit` exit 0; `npm run build` exit 0 / 504ms.

---

_Verified: 2026-04-26T08:00:00Z_
_Verifier: Claude (gsd-verifier)_
