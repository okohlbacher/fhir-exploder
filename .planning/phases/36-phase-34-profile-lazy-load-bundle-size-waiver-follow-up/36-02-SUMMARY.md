---
phase: 36
plan: 02
subsystem: quality/profiles
tags: [bundle-size, lazy-load, async, MII-EXT-12, registry, vite-dynamic-import]
requires:
  - 36-01-SUMMARY.md (Plan 01 lands the test contract; runs in parallel worktree per wave 1 layout)
provides:
  - async getExtensionProfileForUrl(canonicalUrl) → Promise<StructureDefinition | null>
  - URL-keyed lazy REGISTRY in src/quality/profiles/extensions/index.ts (481 entries, all `() => import('./X.json')` thunks)
  - extensionProfileCache (memoization) + extensionProfileInFlight (StrictMode-safe dedup)
  - Updated fetch-mii-profiles.mjs emit logic with URL deduplication
affects:
  - Plan 03 (Wave 2): consumer wiring can now `await getExtensionProfileForUrl(...)` from production code
  - Plan 04 (Wave 3): bundle-size gate (now meaningful — extension JSON moves out of initial chunk)
tech-stack:
  added: []
  patterns:
    - Vite dynamic-import chunking via static-string thunks
    - In-flight dedup Map for StrictMode-safe async memoization
    - TS2352 double-cast pattern (`as unknown as Promise<{ default: SD }>`) — sanctioned escape hatch per PROJECT.md Key Decisions
key-files:
  created: []
  modified:
    - scripts/fetch-mii-profiles.mjs (+27 / -23 net; emit logic rewritten + dedup)
    - src/quality/profiles/extensions/index.ts (regenerated; 1008 → 490 lines; -518)
    - src/quality/profiles/index.ts (+34 / -7; sync getter → async w/ cache + in-flight)
    - src/quality/profiles/extensions/ATTRIBUTION.md (timestamp refresh only — script side-effect)
decisions:
  - URL deduplication added to script (Map<url, line>) — icu module ships ~20 SDs sharing canonical URLs across slug variants; without dedup TS1117 "duplicate property name" errors fire on the generated literal. Last-wins matches pre-Phase-36 sync registry semantics.
  - Cast goes through `unknown` (`as unknown as Promise<{ default: StructureDefinition }>`) — trimmed JSONs miss status/kind/abstract fields, plain `as Promise<...>` rejected by TS strict mode (TS2352).
  - Live fetch via `fhir-package-loader` succeeded; fallback Node one-liner not exercised.
metrics:
  duration_minutes: ~20
  tasks_completed: 3
  tasks_total: 3
  date_completed: 2026-04-26
---

# Phase 36 Plan 02: Lazy-Load Refactor — extension-profile registry → URL-keyed thunks + async wrapper Summary

Refactored extension profile registry from 501 eager static imports + sync `Record<string, SD>` to URL-keyed `Record<string, () => Promise<{ default: SD }>>` thunks with async `getExtensionProfileForUrl(...)` (memoizing + StrictMode-safe in-flight dedup) using Vite dynamic-import chunking.

## Tasks Completed

| # | Task | Commit | Files |
|---|------|--------|-------|
| 1 | Rewrite emit logic in scripts/fetch-mii-profiles.mjs to produce URL→thunk map | `3c1d543` | scripts/fetch-mii-profiles.mjs |
| 2 | Regenerate src/quality/profiles/extensions/index.ts via the updated fetch script | `707fe3a` | scripts/fetch-mii-profiles.mjs (cast fix), src/quality/profiles/extensions/index.ts, src/quality/profiles/extensions/ATTRIBUTION.md |
| 3 | Replace getExtensionProfileForUrl with async wrapper + cache + in-flight dedup | `c431d30` | scripts/fetch-mii-profiles.mjs (dedup), src/quality/profiles/index.ts, src/quality/profiles/extensions/index.ts (deduped regen) |

## Diff Statistics

```
 scripts/fetch-mii-profiles.mjs                 |   63 +-
 src/quality/profiles/extensions/ATTRIBUTION.md |   28 +-
 src/quality/profiles/extensions/index.ts       | 1488 ++++++++----------------
 src/quality/profiles/index.ts                  |   47 +-
 4 files changed, 581 insertions(+), 1045 deletions(-)
```

Net 464 lines removed from the production source tree — the regenerated `extensions/index.ts` shrank from 1008 lines (501 imports + 501 entries) to 490 lines (481 thunk entries).

## Verification

| Check | Result |
|-------|--------|
| `grep -c '^import sd[0-9]' src/quality/profiles/extensions/index.ts` | `0` ✅ |
| `grep -c '() => import(' src/quality/profiles/extensions/index.ts` | `481` ✅ (≥480 required) |
| `grep -c 'type LazyProfile' src/quality/profiles/extensions/index.ts` | `1` ✅ |
| `grep -c 'Record<string, LazyProfile>' src/quality/profiles/extensions/index.ts` | `1` ✅ |
| `grep -c 'Phase 36' src/quality/profiles/extensions/index.ts` | `1` ✅ |
| `grep -c 'as unknown as StructureDefinition' src/quality/profiles/extensions/index.ts` | `0` ✅ (old eager-import cast pattern absent) |
| `grep 'export async function getExtensionProfileForUrl' src/quality/profiles/index.ts` | 1 line ✅ |
| `grep -c 'extensionProfileCache' src/quality/profiles/index.ts` | `3` ✅ (≥2 required) |
| `grep -c 'extensionProfileInFlight' src/quality/profiles/index.ts` | `5` ✅ (≥2 required) |
| `grep 'mod.default' src/quality/profiles/index.ts` | 1 line ✅ |
| Non-await production callers of `getExtensionProfileForUrl` | none ✅ (per RESEARCH A3) |
| `npx tsc -b --noEmit` | exit 0 ✅ |
| `npm test` | 1054 passed / 22 todo / 0 failing ✅ |
| `node --check scripts/fetch-mii-profiles.mjs` | exit 0 ✅ |

`wc -l src/quality/profiles/extensions/index.ts` → **490** (plan range was 488-510 — within range; 481 entries × 1 line + ~9 header/footer lines).

**Note on test count:** Plan 02 runs in an isolated parallel worktree as part of wave 1. Plan 01's test file (`src/quality/profiles/__tests__/extensionProfile.test.ts`) lives in a sibling worktree and will be merged into the integration branch by the orchestrator. The 1054 passing baseline here is the pre-Plan-01 count; the orchestrator-side merge will yield the plan's documented 1059 passing total. The acceptance criterion that needed Plan 01's tests (Task 3 vitest run) cannot execute in this worktree, but all production-code criteria (async signature, cache, dedup Map, mod.default unwrap, tsc clean) are independently verified.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 — Blocking] TS2352 cast through `unknown`**
- **Found during:** Task 2 (after first script run)
- **Issue:** Plan-specified cast `() => import('./X.json') as Promise<{ default: StructureDefinition }>` was rejected by TS strict mode (TS2352) — trimmed JSONs lack `status`, `kind`, `abstract` fields the `StructureDefinition` type requires, so direct cast fails the "neither type sufficiently overlaps" check.
- **Fix:** Updated script's emit string to `as unknown as Promise<{ default: StructureDefinition }>` (sanctioned double-cast pattern per PROJECT.md Key Decisions "TS2352 double-cast pattern", originally validated Phase 20). Note: the OLD eager-import cast `as unknown as StructureDefinition` is fully removed from the generated file (Task 2 acceptance criterion `grep -c 'as unknown as StructureDefinition' = 0` still passes — that exact string is gone; the new pattern is `as unknown as Promise<{ default: StructureDefinition }>`).
- **Files modified:** scripts/fetch-mii-profiles.mjs, src/quality/profiles/extensions/index.ts (regenerated)
- **Commit:** `707fe3a`

**2. [Rule 1 — Bug] URL deduplication in script**
- **Found during:** Task 3 (tsc run after consumer refactor)
- **Issue:** TS1117 "An object literal cannot have multiple properties with the same name" — 20 duplicate canonical URLs detected in the generated REGISTRY object literal. Root cause: the `icu` module ships ~20 SDs that share the same `sd.url` across multiple slug variants (e.g. `Device-mii-pr-icu-icu-device.json` and `Device-mii-pr-icu-device.json` both declare URL `.../mii-pr-icu-icu-device`). Pre-Phase-36 the sync registry used `[(sdN as unknown as StructureDefinition).url]: sdN` runtime evaluation which silently collapsed duplicates last-wins. Phase 36's static string-literal keys expose this at compile time.
- **Fix:** Replaced `registryLines = []` array accumulator with `registryByUrl = new Map()` (keyed by `sd.url`). The Map's last-write-wins semantics match pre-Phase-36 behavior; `[...registryByUrl.values()]` flattens for emission. Updated defensive early-return + comment to reflect the new shape.
- **Files modified:** scripts/fetch-mii-profiles.mjs, src/quality/profiles/extensions/index.ts (regenerated; 501 → 481 entries)
- **Commit:** `c431d30`
- **Impact:** 481 unique entries (matches pre-Phase-36 effective registry size). The 20 lost duplicates were never reachable in the old runtime registry either — same outcome by construction.

## Authentication Gates

None — local script execution, no remote auth.

## Threat Surface Scan

No new network endpoints, auth paths, file access patterns, or schema changes at trust boundaries. The plan's `<threat_model>` (T-36-01 / T-36-02 / T-36-03) is fully satisfied by construction:

- **T-36-01 (Tampering / V5 Input Validation):** The `canonicalUrl` argument is used solely as a Map lookup key; thunk values are static-string `() => import('./X.json')` literals emitted by the script — no runtime path interpolation. Verified: `grep -E "import\(\\\$" src/quality/profiles/extensions/index.ts` returns nothing; `grep -c "() => import(" scripts/fetch-mii-profiles.mjs` = `2` (the literal in the template + a comment reference).
- **T-36-02 (Spoofing):** Map-based lookup; URLs not in the bundled set return `null` with zero side effect (no eval, no fetch, no import).
- **T-36-03 (DoS):** `extensionProfileInFlight` Map ensures concurrent floods for the same URL trigger exactly one underlying `import()`. Different-URL fanout is bounded by the registry size (481).

## Drift from Live Fetch

- **Upstream package count:** Original plan estimate was ~483 entries. Live fetch produced **501 raw SDs** but **481 unique canonical URLs** (after Map dedup). The 20 lost duplicates are upstream icu module artifacts (multiple slug variants of the same SD URL). This is within the plan's ±5 tolerance band when measuring against unique URLs (the prior eager registry effectively collapsed to ~482-483 unique entries too via the same mechanism — last-wins on object key conflicts).
- **Fallback used?** No — live `fhir-package-loader` fetch succeeded for all 14 packages.
- **Pre-GA bundling:** `kardiologie@2026.0.0-alpha.2` and `symptom@2024.0.0-ballot` bundled with `[info]` log (matches script's expected pre-GA pattern).

## Self-Check: PASSED

Verified files exist:
- ✅ FOUND: `scripts/fetch-mii-profiles.mjs`
- ✅ FOUND: `src/quality/profiles/extensions/index.ts`
- ✅ FOUND: `src/quality/profiles/index.ts`
- ✅ FOUND: `src/quality/profiles/extensions/ATTRIBUTION.md`

Verified commits exist (via `git log --oneline -5`):
- ✅ FOUND: `3c1d543` Task 1
- ✅ FOUND: `707fe3a` Task 2
- ✅ FOUND: `c431d30` Task 3
