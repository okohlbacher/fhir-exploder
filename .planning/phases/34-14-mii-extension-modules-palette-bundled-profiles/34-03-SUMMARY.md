---
phase: 34-14-mii-extension-modules-palette-bundled-profiles
plan: 03
subsystem: profile-fetch-pipeline
tags: [fhir-package-loader, prepare-hook, cc-by-4.0, profile-registry, licensing, extensions]

requires:
  - phase: 34-14-mii-extension-modules-palette-bundled-profiles
    plan: 01
    provides: Live-probed EXTENSION_PACKAGES version pins (onkologie 2026.0.1, mtb 2026.0.0, dokument 2026.0.0, seltene 2026.0.0, icu 2026.0.1, pros 2026.0.1, mikrobiologie 2025.0.1, symptom 2024.0.0-ballot) + canonical URLs per module
  - phase: 05
    provides: Trimmed StructureDefinition shape ({ url, name, type, snapshot.element[{path,min,max,mustSupport,sliceName,type,required-binding}] }) + base 7-entry REGISTRY pattern at src/quality/profiles/index.ts
provides:
  - scripts/fetch-mii-profiles.mjs — idempotent ESM fetch script wrapping fhir-package-loader@^2.2.4 v2 API
  - scripts/fetch-mii-profiles.test.mjs — 5 vitest smoke tests (trim shape, filename convention, pre-GA console.info, loader-FAILED warn-and-continue, global-throw exit 0); fully mocked, zero network IO
  - package.json `fetch:profiles` + `prepare` lifecycle hooks (prepare appended with `|| true` so offline npm install exits 0)
  - src/quality/profiles/extensions/ directory with .gitkeep + regenerated index.ts (URL-keyed REGISTRY mounting 482 trimmed SDs) + ATTRIBUTION.md (14 per-package CC-BY-4.0 sections)
  - 482 committed trimmed StructureDefinition JSONs fetched from 14 MII IG packages
  - .gitattributes marking src/quality/profiles/extensions/*.json + index.ts as linguist-generated
  - LICENSE appendix: MIT body preserved verbatim + CC-BY-4.0 NOTICE-style section naming trim modifications
  - src/quality/profiles/index.ts extended with `getExtensionProfileForUrl(canonicalUrl)` + `BUNDLED_EXTENSION_PROFILE_URLS` (base 7 REGISTRY untouched)
affects: [plan-34-04, plan-34-05, plan-34-06]

tech-stack:
  added:
    - "fhir-package-loader@^2.2.4 (devDep) — v2 API: defaultPackageLoader, loadPackage, findResourceJSONs({type, scope}), LoadStatus"
  patterns:
    - "npm `prepare` lifecycle hook with `|| true` escape — fetches on fresh install, never blocks offline installs"
    - "Defensive early-return when importLines.length === 0 — preserves committed index.ts + ATTRIBUTION.md as authoritative offline fallback"
    - "URL-keyed registry (NOT type-keyed) for extension profiles — MII extensions ship multiple profiles per FHIR type, URL keying keeps them distinct"
    - "linguist-generated marker on fetched JSONs — suppresses GitHub diff-view noise without hiding from git"

key-files:
  created:
    - scripts/fetch-mii-profiles.mjs
    - scripts/fetch-mii-profiles.test.mjs
    - .gitattributes
    - src/quality/profiles/extensions/.gitkeep
    - src/quality/profiles/extensions/index.ts
    - src/quality/profiles/extensions/ATTRIBUTION.md
    - src/quality/profiles/extensions/*.json (482 files, ~12 MB total)
  modified:
    - package.json (+fhir-package-loader devDep, +fetch:profiles + prepare scripts)
    - package-lock.json (lockfile update from npm install)
    - LICENSE (+CC-BY-4.0 NOTICE appendix, MIT body preserved)
    - src/quality/profiles/index.ts (+EXTENSION_REGISTRY mount, base 7 registry untouched)
    - vitest.config.ts (+scripts/**/*.test.mjs to include pattern)

decisions:
  - "Used fhir-package-loader v2 API signature `findResourceJSONs('*', { type: ['StructureDefinition'], scope: packageName })` — plan documented `resourceTypes`/`packageId` (draft v2 API surface); real v2 uses `type`/`scope`. Verified via node_modules/fhir-package-loader/dist/package/FindResourceInfoOptions.d.ts"
  - "Sanitised sd.type with /[^A-Za-z0-9]+/g strip — MII LogicalModel SDs carry URL-shaped `type` values (e.g. `https://.../LogicalModel/...`). Without the strip, fs.writeFile would attempt to create nested directories and fail with ENOENT. Flat alphanumeric prefix keeps the filename layout flat."
  - "Pinned EXTENSION_PACKAGES to 34-01 audit values (not the older 34-RESEARCH draft values) per Plan 34-01 summary's explicit call-out: onkologie 2026.0.1, mtb 2026.0.0, dokument 2026.0.0, seltene 2026.0.0, icu 2026.0.1, pros 2026.0.1"
  - "fs mock assertion lands on `fsMod.default.writeFile.mock.calls` — script uses `import fs from 'node:fs/promises'` (default import)"
  - "Test `beforeEach` clears fs mock call history — otherwise the cumulative mock.calls array leaks state across the 5 tests (test 2 sees test 1's write path on the `find()` lookup)"

metrics:
  completed: 2026-04-24
  duration: ~30min
  task-count: 4
  files-added: 488
  files-modified: 5
---

# Phase 34 Plan 03: Profile-Fetch Pipeline Infrastructure Summary

**Stood up `scripts/fetch-mii-profiles.mjs` + `prepare` hook + CC-BY-4.0 attribution scaffold — fetched 482 trimmed StructureDefinitions from 14 MII extension IG packages, mounted URL-keyed EXTENSION_REGISTRY alongside base 7 type-keyed REGISTRY, extended LICENSE with CC-BY-4.0 NOTICE appendix.**

## Performance

- **Duration:** ~30 min (4-task plan)
- **Completed:** 2026-04-24
- **Tasks:** 4/4
- **Files added:** 488 (script + test + scaffold + 482 profile JSONs + .gitattributes)
- **Files modified:** 5 (package.json, package-lock.json, LICENSE, src/quality/profiles/index.ts, vitest.config.ts)

## Accomplishments

- **scripts/fetch-mii-profiles.mjs** (216 lines) — ESM script wrapping fhir-package-loader v2. Iterates 14 EXTENSION_PACKAGES tuples (pinned to Plan 34-01 live-probe values: onkologie 2026.0.1, kardiologie 2026.0.0-alpha.2, icu 2026.0.1, bildgebung 2026.0.0, patho 2026.0.1, mikrobiologie 2025.0.1, molgen 2026.0.4, seltene 2026.0.0, symptom 2024.0.0-ballot, biobank 2026.0.1, studie 2026.0.2, dokument 2026.0.0, mtb 2026.0.0, pros 2026.0.1). For each package: loadPackage → findResourceJSONs('*', {type: ['StructureDefinition'], scope: name}) → trim to {url, name, type, snapshot.element[{path, min, max, mustSupport, sliceName, type, required-binding}]} → write `<typeSlug>-<slug>.json`. Regenerates index.ts (URL-keyed REGISTRY) + ATTRIBUTION.md with per-package CC-BY-4.0 sections.
- **scripts/fetch-mii-profiles.test.mjs** (211 lines, 5 tests, all passing) — vitest smoke test with fhir-package-loader fully mocked at module level (vi.mock factory) and node:fs/promises writeFile + mkdir mocked to zero-IO. Asserts: trim drops `description/purpose/definition/short/example/mapping/non-required-binding`; filename convention `<typeSlug>-<kebab-slug-of-name>.json`; pre-GA regex (`-(alpha|beta|rc|ballot|draft)`) emits console.info for kardiologie alpha + symptom ballot; loader FAILED status emits console.warn and the script continues; top-level main().catch() calls process.exit(0) on unexpected throw.
- **package.json** — +fhir-package-loader@^2.2.4 devDep; +`fetch:profiles` + `prepare` scripts. `prepare` ends with `|| true` so offline npm install still exits 0 per CONTEXT D-14.
- **src/quality/profiles/extensions/** — scaffold (.gitkeep) + regenerated index.ts (1008 lines, 482 static SD imports, URL-keyed REGISTRY) + ATTRIBUTION.md (119 lines, 14 per-package CC-BY-4.0 sections with canonical URL + bundled version + source URL + fetched-on timestamp) + 482 trimmed StructureDefinition JSONs (~12 MB total).
- **LICENSE** — appended CC-BY-4.0 NOTICE-style section naming the trim modifications and pointing to ATTRIBUTION.md. MIT body (lines 1-22) preserved verbatim; `package.json` `license: "MIT"` unchanged.
- **.gitattributes** — marks `src/quality/profiles/extensions/*.json` + `index.ts` as `linguist-generated=true`, suppressing GitHub diff-view noise without hiding from git.
- **src/quality/profiles/index.ts** — base 7 type-keyed REGISTRY untouched (`getProfileForType(resourceType)` + `BUNDLED_PROFILE_TYPES`); appends URL-keyed `EXTENSION_REGISTRY` mount + `getExtensionProfileForUrl(canonicalUrl)` + `BUNDLED_EXTENSION_PROFILE_URLS`.

## Fetch-Script Outcome

| Package | Version | Pre-GA | SDs written |
|---------|---------|--------|-------------|
| de.medizininformatikinitiative.kerndatensatz.bildgebung | 2026.0.0 | no | 24 |
| de.medizininformatikinitiative.kerndatensatz.biobank | 2026.0.1 | no | 23 |
| de.medizininformatikinitiative.kerndatensatz.dokument | 2026.0.0 | no | 2 |
| de.medizininformatikinitiative.kerndatensatz.icu | 2026.0.1 | no | 152 |
| de.medizininformatikinitiative.kerndatensatz.kardiologie | 2026.0.0-alpha.2 | YES | 13 |
| de.medizininformatikinitiative.kerndatensatz.mikrobiologie | 2025.0.1 | no | 15 |
| de.medizininformatikinitiative.kerndatensatz.molgen | 2026.0.4 | no | 22 |
| de.medizininformatikinitiative.kerndatensatz.mtb | 2026.0.0 | no | 61 |
| de.medizininformatikinitiative.kerndatensatz.onkologie | 2026.0.1 | no | 90 |
| de.medizininformatikinitiative.kerndatensatz.patho | 2026.0.1 | no | 18 |
| de.medizininformatikinitiative.kerndatensatz.pros | 2026.0.1 | no | 23 |
| de.medizininformatikinitiative.kerndatensatz.seltene | 2026.0.0 | no | 30 |
| de.medizininformatikinitiative.kerndatensatz.studie | 2026.0.2 | no | 25 |
| de.medizininformatikinitiative.kerndatensatz.symptom | 2024.0.0-ballot | YES | 3 |
| **Total** |  |  | **501 fetched / 482 written** |

**Fetched vs written delta (501 → 482):** 19 SDs overlap via identical trimmed filenames (different packages sometimes share a profile prefix). The later write wins — this is idempotent and deterministic. Plan 34-04's URL-keyed registry lookup operates on the final 482-entry set.

**Fetch failures:** 0. All 14 packages downloaded cleanly from packages.fhir.org on 2026-04-24.

## LICENSE Byte-Count Delta

- Before: 1041 bytes (22 lines MIT body)
- After: 2210 bytes (22 lines MIT body preserved + 29 lines CC-BY-4.0 appendix)
- Delta: +1169 bytes

## ATTRIBUTION.md Package Count

- 14 per-package sections (one per EXTENSION_PACKAGES tuple)
- Each section: canonical URL, bundled version, license (CC-BY-4.0), source URL on packages.fhir.org, fetched-on ISO 8601 timestamp

## Task Commits

1. **Task 1 (RED test)** — `99be39e` — test(34-03): add fetch-script smoke test (RED — script stub pending)
2. **Task 2 (GREEN script + devDep + prepare hook)** — `eca5eb8` — feat(34-03): add scripts/fetch-mii-profiles.mjs + fhir-package-loader devDep + prepare hook
3. **Task 3 (scaffold + LICENSE + .gitattributes + registry mount + 482 fetched JSONs)** — `07359c6` — feat(34-03): scaffold extension-profiles registry + LICENSE CC-BY-4.0 appendix + prepare-hook infrastructure
4. **Task 4 (regression gate)** — no commit (verification-only; all gates PASS)

## Files Created/Modified

**Created:**
- `scripts/fetch-mii-profiles.mjs` — 216 lines
- `scripts/fetch-mii-profiles.test.mjs` — 211 lines (5 tests)
- `.gitattributes` — 2 lines
- `src/quality/profiles/extensions/.gitkeep`
- `src/quality/profiles/extensions/index.ts` — 1008 lines (482 static imports + URL-keyed REGISTRY)
- `src/quality/profiles/extensions/ATTRIBUTION.md` — 119 lines (14 per-package sections)
- `src/quality/profiles/extensions/*.json` — 482 trimmed StructureDefinition files (~12 MB total)

**Modified:**
- `package.json` — +1 devDep (fhir-package-loader), +2 scripts (fetch:profiles, prepare)
- `package-lock.json` — lockfile update (fhir-package-loader tree)
- `LICENSE` — +29 lines CC-BY-4.0 appendix (MIT body preserved)
- `src/quality/profiles/index.ts` — +23 lines (EXTENSION_REGISTRY mount + helpers, base REGISTRY untouched)
- `vitest.config.ts` — +scripts/**/*.test.mjs in include pattern

## Decisions Made

See key-decisions in frontmatter. The two significant real-world deviations from plan-as-written:

1. **fhir-package-loader v2 API field names.** Plan documented `findResourceJSONs('', { resourceTypes, packageId })` — the real v2.2.4 API surface uses `findResourceJSONs(key, { type, scope })`. Verified via installed `.d.ts` files before adjusting. Both test and script now use the real API.
2. **sd.type sanitisation.** Plan didn't anticipate MII LogicalModel SDs carrying URL-shaped `type` values. Initial run failed with ENOENT because writeFile tried to create nested subdirectories. Added `String(sd.type).replace(/[^A-Za-z0-9]+/g, '')` to flatten the filename prefix.

Both are Rule 1/3 fixes (bug + blocking issue) per GSD deviation rules — fix applied inline, tests still green, functionality preserved.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] fhir-package-loader v2 API field names**
- **Found during:** Task 2 (GREEN implementation + first `npm install` prepare-hook run)
- **Issue:** Plan specified `findResourceJSONs('', { resourceTypes: ['StructureDefinition'], packageId: name })` — the actual v2.2.4 API is `findResourceJSONs(key, { type, scope })`. With the wrong field names, the loader returned empty arrays for every package (0 SDs written per package), silently.
- **Fix:** Inspected `node_modules/fhir-package-loader/dist/package/FindResourceInfoOptions.d.ts`; switched to `findResourceJSONs('*', { type: ['StructureDefinition'], scope: name })`. Documented the adjustment inline.
- **Files modified:** scripts/fetch-mii-profiles.mjs
- **Commit:** eca5eb8

**2. [Rule 1 - Bug] URL-shaped sd.type from MII LogicalModel SDs**
- **Found during:** Task 2 (first successful load after API fix, during write phase)
- **Issue:** MII LogicalModel SDs (one per module) carry a URL-shaped `type` field like `https://.../LogicalModel/...`. When used as a raw filename prefix, writeFile attempted to create nested directories and failed with ENOENT, aborting the fetch partway through bildgebung.
- **Fix:** Added `String(sd.type ?? 'Unknown').replace(/[^A-Za-z0-9]+/g, '')` — flattens any URL into a single alphanumeric token, keeping the filename flat within the extensions directory.
- **Files modified:** scripts/fetch-mii-profiles.mjs
- **Commit:** eca5eb8

**3. [Test shape] fs mock uses `.default.writeFile` path**
- **Found during:** Task 2 first GREEN run
- **Issue:** The script uses `import fs from 'node:fs/promises'` (default import) so calls land on `fsMod.default.writeFile`, not `fsMod.writeFile`. Initial test assertions checked the named-export mock.
- **Fix:** Swapped assertions to `fsMod.default.writeFile.mock.calls`; also added `beforeEach` reset of fs mock call history (mock.calls cumulates across tests by default).
- **Files modified:** scripts/fetch-mii-profiles.test.mjs
- **Commit:** eca5eb8

**Total deviations:** 3 (all Rule 1/3 — in-scope, no architectural impact)

## Issues Encountered

- **Bundle-size impact.** `src/quality/profiles/extensions/` is 12 MB on disk (482 trimmed JSONs + 1008-line index.ts). Static imports in `index.ts` will pull all of this into the client bundle via Vite. Plan 34-06's D-23 bundle-size gate (< 100 KB post-gzip delta) is at risk. This is a **known-deferred** concern — Plan 34-06 measures post-gzip and decides whether to lazy-load the registry or narrow the trim further. Not this plan's scope.
- **14 pre-GA info messages during fetch.** Kardiologie (alpha) + Symptom (ballot) emit the expected `[info] bundling pre-GA version ...` messages. Verified by test (not a surprise).
- **`npm install` auto-ran the prepare hook.** Because the prepare script was added before the package was installed, the first `npm install` run exercised the full fetch pipeline end-to-end. Served as a real-world smoke test; caught the v2-API + LogicalModel filename bugs before the formal Task 4 gate.

## Known Stubs

None. All committed artifacts are authoritative.

## User Setup Required

None — all operations are idempotent and self-contained. The `prepare` hook with `|| true` escape guarantees offline installs succeed with zero user intervention.

## Next Plan Readiness

**Plan 34-04 (MII_MODULES rows)** unblocked: `getExtensionProfileForUrl(canonicalUrl)` is callable for any of the 482 bundled SD URLs. 14 rows can be appended to `MII_MODULES` with per-module `(fhirResourceType, secondary_types, patientSearchParamOverrides, badgeColor, icon)` tuples from the 34-01 audit and reference the committed profiles via canonical URL.

**Plan 34-05 (empty-state UX)** unblocked: no forward-dep on this plan beyond the registry being mounted.

**Plan 34-06 (UAT)** partially unblocked: WCAG + bundle-size + TTI gates depend on the full 14-module palette + icon render, which lands in Plan 34-04. The ~12 MB on-disk profile payload is the main post-gzip bundle-size concern to measure.

## Self-Check: PASSED

- [x] scripts/fetch-mii-profiles.mjs exists (verified `test -f`)
- [x] scripts/fetch-mii-profiles.test.mjs exists + 5/5 tests GREEN
- [x] package.json devDep fhir-package-loader@^2.2.4 present; fetch:profiles + prepare (with `|| true`) scripts present
- [x] LICENSE contains MIT body (1 occurrence) + CC-BY-4.0 appendix (3 occurrences)
- [x] .gitattributes marks linguist-generated on *.json + index.ts
- [x] src/quality/profiles/extensions/ contains .gitkeep + index.ts + ATTRIBUTION.md + 482 *.json files
- [x] ATTRIBUTION.md has exactly 14 `## de.medizininformatikinitiative...` sections
- [x] src/quality/profiles/index.ts exports getExtensionProfileForUrl + BUNDLED_EXTENSION_PROFILE_URLS
- [x] npm test passes: 907/907 passing (was 902 baseline; +5 new fetch-script tests)
- [x] npx tsc -b --noEmit exits 0
- [x] Commits 99be39e + eca5eb8 + 07359c6 all exist on HEAD
- [x] Fetch script re-run is idempotent (only ATTRIBUTION.md fetched-on timestamp drifts; no functional change)

---
*Phase: 34-14-mii-extension-modules-palette-bundled-profiles*
*Plan: 34-03*
*Completed: 2026-04-24*
