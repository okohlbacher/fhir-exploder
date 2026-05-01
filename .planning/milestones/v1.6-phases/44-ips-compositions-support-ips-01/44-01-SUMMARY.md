---
phase: 44-ips-compositions-support-ips-01
plan: 01
subsystem: testing

# Searchable tags
tags: [ips, fhir, hl7, structure-definition, fhir-package-loader, lazy-load, registry, license, cc0, attribution]

# Dependency graph
requires:
  - phase: 34-mii-extension-profiles
    provides: defaultPackageLoader + trim() + URL-keyed registry generation idiom (now extracted to scripts/lib/trim-profile.mjs)
  - phase: 36-extension-registry-lazy-load
    provides: Lazy-thunk + module-scoped cache + StrictMode-safe in-flight Promise share pattern (mirrored as IPS_REGISTRY)
provides:
  - Bundled hl7.fhir.uv.ips@2.0.0 (32 trimmed StructureDefinitions) under src/quality/profiles/ips/
  - URL-keyed IPS_REGISTRY (lazy thunks) with getIpsProfileForUrl() helper
  - IPS_COMPOSITION_PROFILE_URL canonical constant for downstream consumers
  - Shared scripts/lib/trim-profile.mjs (DRY refactor — single source of truth for SD trim shape)
  - LICENSE root attribution section + CC0-1.0 reference
  - Wave 0 stubs + 3 IPS bundle fixtures consumable by Plan 44-02
affects: [44-02-ips-panel-walker, plan-phase-45-mantine-9-codemod]

# Tech tracking
tech-stack:
  added: []  # No new runtime/build deps; all infra reuses Phase 34 + Phase 36 stack
  patterns:
    - "Shared trim-profile.mjs module — both fetchers import from one source of truth (DRY)"
    - "Per-test 60s timeout for spawnSync-driven offline-fetch tests (vitest default 5s too short)"
    - "Single-package fetcher pattern (one-package IPS_PACKAGES vs MII fetcher's 14-entry array) — file scaffolding identical, scope minimal"

key-files:
  created:
    - scripts/fetch-ips-profiles.mjs
    - scripts/lib/trim-profile.mjs
    - scripts/__tests__/trim-profile.test.mjs
    - scripts/__tests__/fetch-ips-profiles.test.mjs
    - src/quality/profiles/ips/getIpsProfileForUrl.ts
    - src/quality/profiles/ips/index.ts (generated)
    - src/quality/profiles/ips/ATTRIBUTION.md (generated)
    - src/quality/profiles/ips/Composition-compositionuvips.json (+ 31 sibling SDs)
    - src/quality/profiles/ips/__tests__/index.test.ts
    - src/__tests__/license-ips.test.ts
    - src/quality/__tests__/ipsBundleValidator.test.ts (Wave 0 stub)
    - src/components/quality/__tests__/IPSPanel.test.tsx (Wave 0 stub)
    - src/quality/__tests__/fixtures/ips/ips-bundle-complete.json
    - src/quality/__tests__/fixtures/ips/ips-bundle-incomplete.json
    - src/quality/__tests__/fixtures/ips/ips-bundle-malformed.json
    - .planning/phases/44-ips-compositions-support-ips-01/deferred-items.md
  modified:
    - scripts/fetch-mii-profiles.mjs (inline trim() removed; now imports from lib/trim-profile.mjs)
    - package.json (prepare hook chains both fetchers; new fetch:ips-profiles script alias)
    - LICENSE (HL7 IPS Composition profile attribution section appended)

key-decisions:
  - "Shared trim() extracted to scripts/lib/trim-profile.mjs — DRY single source of truth used by both MII and IPS fetchers (RESEARCH A2 recommendation)"
  - "IPS_REGISTRY exported as IPS_REGISTRY (not REGISTRY) so consumers can import both MII + IPS registries unambiguously"
  - "Hand-coded section catalogue (planned in 44-02) over trim-shape extension — keeps Phase 34 trim() unchanged and decouples walker from profile-version trim drift (RESEARCH §6 Pitfall 5)"
  - "prepare hook chained via semicolon + per-command || true (RESEARCH §6 Pitfall 9 Option 1) — neither fetcher short-circuits the other"
  - "RESEARCH A5 — Bundle.entry slicing OUT OF SCOPE for v1.6 walker; section-level diagnostics only. Plan 44-02 honors this default unless user overrides before Wave 1 starts"

patterns-established:
  - "Per-test timeout for spawn-based offline tests — vitest default 5s is too short for HTTP_PROXY blackhole + spawnSync overhead (~8s total)"
  - "Defensive empty-fetch early-return for single-package fetchers — matches Phase 34 pattern (RESEARCH §6 Pitfall 8); committed JSON is the authoritative offline fallback"
  - "Trimmed JSON imports use the canonical `as unknown as Promise<{ default: StructureDefinition }>` double-cast (Phase 36 idiom; recorded as PROJECT-level escape hatch for TS2352)"

requirements-completed: [IPS-01]

# Metrics
duration: 18 min
completed: 2026-04-30
---

# Phase 44 Plan 01: IPS Compositions Support Backbone Summary

**hl7.fhir.uv.ips@2.0.0 (CC0-1.0) bundled as 32 trimmed StructureDefinitions with URL-keyed lazy-load IPS_REGISTRY, getIpsProfileForUrl helper, LICENSE attribution, and Wave 0 stubs ready for Plan 44-02 walker.**

## Performance

- **Duration:** 18 min
- **Started:** 2026-04-30T10:51:29Z
- **Completed:** 2026-04-30T11:09:54Z
- **Tasks:** 8 (all completed)
- **Files created:** 49 (32 IPS profile JSONs + 1 generated index.ts + 1 ATTRIBUTION.md + 6 test files + 3 fixtures + 5 source/script files + 1 deferred-items.md)
- **Files modified:** 3 (scripts/fetch-mii-profiles.mjs, package.json, LICENSE)

## Accomplishments

- IPS package fetched + 32 StructureDefinitions trimmed and committed under `src/quality/profiles/ips/`
- Shared `scripts/lib/trim-profile.mjs` extracted (DRY) — both fetchers import; Phase 34 behavior preserved (existing fetch-mii test still green)
- `IPS_REGISTRY` (URL-keyed lazy thunks) generated; canonical URL `http://hl7.org/fhir/uv/ips/StructureDefinition/Composition-uv-ips` indexed
- `getIpsProfileForUrl()` helper + `IPS_COMPOSITION_PROFILE_URL` constant exported with module-scoped cache + StrictMode-safe in-flight Promise sharing (Phase 36 idiom)
- `prepare` lifecycle hook chains both fetchers offline-tolerated (semicolon + `|| true` per RESEARCH §6 Pitfall 9 Option 1)
- LICENSE root + ATTRIBUTION.md cite IPS package, version pin 2.0.0, and CC0-1.0 (T-44-05 mitigated)
- 19 new tests added (8 trim-profile + 2 fetch-ips offline + 4 IPS_REGISTRY lazy-load + 5 license-ips); 11 Wave 0 stubs scaffolded for Plan 44-02
- Open Question A5 honored — section-level diagnostics only; Bundle.entry slicing deferred to user-override before Wave 1

## Task Commits

Each task was committed atomically:

1. **Task 1 (Wave 0): test stubs + 3 IPS bundle fixtures** — `fa37039` (test)
2. **Task 2: extract trim() to scripts/lib/trim-profile.mjs (DRY)** — `3c4362f` (refactor)
3. **Task 3: create scripts/fetch-ips-profiles.mjs + populate IPS profiles** — `a8a145f` (feat)
4. **Task 4: real assertions for fetch-ips offline graceful-exit** — `39b8217` (test)
5. **Task 5: chain IPS fetcher into prepare hook** — `b3cf517` (feat)
6. **Task 6: getIpsProfileForUrl helper (cache + in-flight share)** — `2dd38a8` (feat)
7. **Task 7: real assertions for IPS_REGISTRY lazy-load + cache** — `73dafd0` (test)
8. **Task 8: LICENSE root section + license-ips test (T-44-05)** — `9cc0b01` (feat)

## Files Created/Modified

**Scripts**
- `scripts/lib/trim-profile.mjs` — shared SD trim function (extracted DRY from Phase 34 fetcher)
- `scripts/fetch-ips-profiles.mjs` — IPS package fetcher (mirrors Phase 34 idiom, single-package; 32 SDs written)
- `scripts/fetch-mii-profiles.mjs` — modified to import shared trim() (inline function removed)
- `scripts/__tests__/trim-profile.test.mjs` — 8 assertions covering path/sliceName/min/max/mustSupport/type/required-binding/empty-snapshot
- `scripts/__tests__/fetch-ips-profiles.test.mjs` — 2 assertions for offline graceful-exit + index.ts preservation

**Source — IPS profile registry**
- `src/quality/profiles/ips/getIpsProfileForUrl.ts` — lazy-load helper + IPS_COMPOSITION_PROFILE_URL constant + __resetIpsProfileCacheForTests test hook
- `src/quality/profiles/ips/index.ts` — GENERATED IPS_REGISTRY (Record<string, LazyProfile> with 32 URL-keyed thunks)
- `src/quality/profiles/ips/ATTRIBUTION.md` — GENERATED package metadata (version pin, CC0-1.0, upstream source)
- `src/quality/profiles/ips/{32 trimmed SDs}.json` — including `Composition-compositionuvips.json` (the one Plan 44-02 walker reads)

**Tests**
- `src/quality/profiles/ips/__tests__/index.test.ts` — 4 tests for first-call / cache-hit / concurrent-share / unknown-URL fallback
- `src/__tests__/license-ips.test.ts` — 5 tests grep-asserting LICENSE + ATTRIBUTION fields (T-44-05)
- `src/quality/__tests__/ipsBundleValidator.test.ts` — Wave 0 stub (8 it.skip cases for Plan 44-02 walker)
- `src/components/quality/__tests__/IPSPanel.test.tsx` — Wave 0 stub (3 it.skip cases for Plan 44-02 panel)

**Fixtures**
- `src/quality/__tests__/fixtures/ips/ips-bundle-complete.json` — 5 sections (3 required + 2 optional), all entries resolvable
- `src/quality/__tests__/fixtures/ips/ips-bundle-incomplete.json` — Allergies missing (LOINC 48765-2 absent), Medications empty
- `src/quality/__tests__/fixtures/ips/ips-bundle-malformed.json` — Bundle.type=collection, no Composition entry

**Repo metadata**
- `package.json` — `prepare` hook now `node scripts/fetch-mii-profiles.mjs || true; node scripts/fetch-ips-profiles.mjs || true`; new `fetch:ips-profiles` script
- `LICENSE` — HL7 IPS Composition profile section appended (32 lines)
- `.planning/phases/44-ips-compositions-support-ips-01/deferred-items.md` — pre-existing deuteranopia test failure documented; npm-install ATTRIBUTION timestamp drift documented

## Decisions Made

- **trim() extraction:** Extracted to `scripts/lib/trim-profile.mjs` per RESEARCH A2 recommendation. Both fetchers import; existing Phase 34 fetch-mii-profiles test remains green (no behavior change, byte-for-byte identical output).
- **IPS_REGISTRY naming:** Exported as `IPS_REGISTRY` (not `REGISTRY`) so consumers in Plan 44-02 and beyond can import both MII (`REGISTRY`) and IPS (`IPS_REGISTRY`) without aliasing.
- **Filename slug:** The fetcher's `slugify()` lowercases hyphens, so `Composition-uv-ips` becomes `compositionuvips` — actual file is `Composition-compositionuvips.json`. Walker (Plan 44-02) looks up by canonical URL via IPS_REGISTRY, so the filename-shape difference is transparent.
- **Section catalogue location:** Will live inside `ipsBundleValidator.ts` (Plan 44-02), NOT extracted from trimmed SD. RESEARCH §6 Pitfall 5 notes that `patternCodeableConcept` is dropped by trim(); option to extend trim shape was rejected to avoid coupling Phase 34 trim shape to IPS profile semantics.
- **A5 deferred:** Bundle.entry slicing diagnostics OUT of v1.6 scope. Plan 44-02 walker only enforces Bundle.type=='document' + Composition existence + section-level diagnostics. User did not override before Wave 1, so default holds.
- **Per-test timeout for offline tests:** Vitest default 5s timeout is too short for `spawnSync` of fetch-ips-profiles with HTTP_PROXY blackhole (~8s total). Per-test 60s timeout established as pattern.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Per-test timeout missing for offline fetcher test**
- **Found during:** Task 4 (real assertions for fetch-ips-profiles offline graceful-exit)
- **Issue:** First Task 4 test run failed with "Test timed out in 5000ms". Vitest's default 5s timeout was hit before the 60s `spawnSync` timeout could fire — `node scripts/fetch-ips-profiles.mjs` with HTTP_PROXY blackhole takes ~8s end-to-end.
- **Fix:** Passed per-test timeout `60000` as third argument to both `it()` calls in `scripts/__tests__/fetch-ips-profiles.test.mjs`.
- **Files modified:** `scripts/__tests__/fetch-ips-profiles.test.mjs`
- **Verification:** Re-ran `npx vitest run --no-coverage scripts/__tests__/fetch-ips-profiles.test.mjs` → 2 passed, 12.37s duration.
- **Committed in:** `39b8217` (Task 4 commit)

---

**Total deviations:** 1 auto-fixed (1 bug)
**Impact on plan:** Bug fix necessary for the test family to run reliably. No scope creep.

## Issues Encountered

- **Pre-existing test failure (out of scope):** `src/__tests__/visual/deuteranopia.test.tsx` pair #13 (kardiologie ↔ mikrobiologie) fails with ΔE2000 = 1.406 (threshold 5). Verified the failure pre-dates Phase 44's worktree base (`8d8a0bc`) — commit `5f99b93` (Phase 40-01) explicitly notes "Phase 40.1 will fix palette". Logged in `.planning/phases/44-ips-compositions-support-ips-01/deferred-items.md`. Phase 44 does NOT touch palette / color tokens. Confirmed by checking out base commit's deuteranopia test and observing identical failure.
- **`npm install` ATTRIBUTION.md timestamp drift:** `npm run prepare` regenerates `Fetched on:` ISO timestamp on every run. By design (Phase 34 D-13 idiom). Future executors should not mis-read this in `git status` as drift requiring a fix; documented in deferred-items.md.

## Threat Flags

| Flag | File | Description |
|------|------|-------------|
| (none) | — | No new auth paths, network endpoints, or schema changes at trust boundaries. IPS validation is read-only local computation against bundled profiles. |

## Self-Check

**Files claimed to exist:**

- `scripts/fetch-ips-profiles.mjs` — FOUND
- `scripts/lib/trim-profile.mjs` — FOUND
- `scripts/__tests__/trim-profile.test.mjs` — FOUND
- `scripts/__tests__/fetch-ips-profiles.test.mjs` — FOUND
- `src/quality/profiles/ips/index.ts` — FOUND
- `src/quality/profiles/ips/getIpsProfileForUrl.ts` — FOUND
- `src/quality/profiles/ips/Composition-compositionuvips.json` — FOUND
- `src/quality/profiles/ips/ATTRIBUTION.md` — FOUND
- `src/quality/profiles/ips/__tests__/index.test.ts` — FOUND
- `src/__tests__/license-ips.test.ts` — FOUND
- `src/quality/__tests__/ipsBundleValidator.test.ts` — FOUND
- `src/components/quality/__tests__/IPSPanel.test.tsx` — FOUND
- `src/quality/__tests__/fixtures/ips/ips-bundle-{complete,incomplete,malformed}.json` — FOUND (3/3)
- `LICENSE` — FOUND (modified; HL7 IPS section appended)

**Commits claimed to exist:**

- `fa37039` — FOUND
- `3c4362f` — FOUND
- `a8a145f` — FOUND
- `39b8217` — FOUND
- `b3cf517` — FOUND
- `2dd38a8` — FOUND
- `73dafd0` — FOUND
- `9cc0b01` — FOUND

**Phase-specific invariants verified:**

- IPS package pin exact: `hl7.fhir.uv.ips@2.0.0` (grep both fetcher + ATTRIBUTION + LICENSE) — VERIFIED
- Trim function shared: both fetchers import `from './lib/trim-profile.mjs'` — VERIFIED
- URL-keyed lazy-load mirrors Phase 36: `IPS_REGISTRY: Record<string, LazyProfile>` shape identical — VERIFIED
- Bearer token from Phase 43 not regressed: `cascadingValidator.ts` and `useConformanceRun.ts` not in modified files list — VERIFIED
- LICENSE compliance grep test: `'hl7.fhir.uv.ips'`, `'CC0-1.0'`, `'2.0.0'` all present in LICENSE — VERIFIED (5 tests passing)
- Wave 0 stubs use `describe.skip` / `it.skip`: 4 stub files (`ipsBundleValidator.test.ts`, `IPSPanel.test.tsx`, `fetch-ips-profiles.test.mjs` originally, `license-ips.test.ts` originally; latter two now have real assertions; the two consumed in 44-02 still skip)
- `prepare` hook keeps `|| true` escape: `node scripts/fetch-mii-profiles.mjs || true; node scripts/fetch-ips-profiles.mjs || true` — VERIFIED
- A5 confirmation deferred: documented as decision; not expanded — VERIFIED

## Self-Check: PASSED

## Next Phase Readiness

- Plan 44-02 (IPS panel + walker) can now `import { getIpsProfileForUrl, IPS_COMPOSITION_PROFILE_URL } from '../../quality/profiles/ips/getIpsProfileForUrl'` and consume the bundled IPS Composition profile.
- All Wave 0 stubs are in place — Plan 44-02 only needs to replace `it.skip` with real assertions and implement the walker + panel components.
- Three IPS bundle fixtures match the walker's expected output shape (complete=0 issues; incomplete≥2 issues; malformed≥2 issues) — fixture-driven regression scaffolded.
- License compliance (T-44-05) automated; future IPS version bumps need only update LICENSE/ATTRIBUTION grep targets.
- No blockers for Plan 44-02. RESEARCH A5 (Bundle.entry slicing) deferred-but-documented; Plan 44-02 walker scope is section-level only unless user override arrives.

---
*Phase: 44-ips-compositions-support-ips-01*
*Completed: 2026-04-30*
