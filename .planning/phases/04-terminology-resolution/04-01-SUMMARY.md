---
phase: 04-terminology-resolution
plan: 01
subsystem: terminology
tags: [terminology, ontoserver, medplum-client, settings, health-probe, abort-signal]

requires:
  - phase: 01-foundation-blaze-connectivity
    provides: AppSettings shape + loadSettings/deepMerge infrastructure
  - phase: 01-foundation-blaze-connectivity
    provides: createFhirClient pattern (baseUrl/fhirUrlPath split)
provides:
  - "DEFAULTS.terminology.serverUrl = https://r4.ontoserver.csiro.au/fhir (D-10)"
  - "createTerminologyClient(settings) → MedplumClient | null factory"
  - "probeTerminologyHealth(client, timeoutMs) → 'unknown' | 'ok' | 'unreachable' | 'not-configured'"
  - "mockMedplumClientForTerminology fixture for plans 02/03/04/05"
  - "TerminologyHealth / TerminologyCacheEntry / ResolverOptions types"
affects:
  - 04-02-resolver
  - 04-03-cache
  - 04-04-integration
  - 04-05-sidebar-settings

tech-stack:
  added:
    - "@medplum/core MedplumClient (second instance pattern)"
  patterns:
    - "AbortSignal.timeout fallback to AbortController for probe bounded requests"
    - "deepMerge validates individual field types before accepting partial overrides"
    - "Test fixture exposes predicate-map API (metadataReachable, lookupResponses, errors)"

key-files:
  created:
    - "src/terminology/types.ts"
    - "src/terminology/terminologyClient.ts"
    - "src/terminology/probe.ts"
    - "src/__tests__/fixtures/terminology.ts"
    - "src/__tests__/terminology-health.test.ts"
  modified:
    - "public/settings.yaml"
    - "src/config/settings.ts"
    - "src/__tests__/settings.test.ts"

key-decisions:
  - "DEFAULTS.terminology.serverUrl = https://r4.ontoserver.csiro.au/fhir (D-10 dev default)"
  - "MII URL ships commented with an explicit mTLS note — browser SPAs cannot authenticate directly; operators must front-terminate TLS"
  - "deepMerge validates terminology.serverUrl as string before overriding default — wrong-type YAML input falls back to Ontoserver rather than corrupting settings"
  - "probeTerminologyHealth never throws — all failure modes (null client, rejected fetch, timeout) collapse into deterministic TerminologyHealth values for the sidebar dot"
  - "createTerminologyClient mirrors createFhirClient's baseUrl/fhirUrlPath split so relative client.get('metadata') resolves correctly for both Ontoserver and MII (via reverse proxy)"

patterns-established:
  - "Pattern: Probe helpers accept a nullable MedplumClient and return a closed union — callers never need to distinguish 'no URL configured' from 'server dead'"
  - "Pattern: Test fixtures for terminology use a predicate-map API (lookupResponses by path substring) so plans 02-05 can register canned Parameters responses without rewriting the mock"
  - "Pattern: AbortSignal.timeout with AbortController fallback — the probe works in jsdom environments without AbortSignal.timeout"

requirements-completed:
  - TERM-01

duration: 3min 5s
completed: 2026-04-12
---

# Phase 04 Plan 01: Terminology Configuration + Client + Health Probe Summary

**Terminology configuration foundation: Ontoserver R4 ships as the dev default, a second `MedplumClient` is constructable from settings, and `probeTerminologyHealth` returns deterministic `ok | unreachable | not-configured` states in under 3 seconds without throwing.**

## Performance

- **Duration:** 3 min 5 s
- **Started:** 2026-04-12T07:09:47Z
- **Completed:** 2026-04-12T07:12:52Z
- **Tasks:** 2
- **Files modified:** 8 (5 created + 3 modified)

## Accomplishments

- `public/settings.yaml` now ships with `terminology.serverUrl: "https://r4.ontoserver.csiro.au/fhir"` uncommented, plus the MII URL commented with an mTLS note (D-10)
- `DEFAULTS.terminology.serverUrl` falls back to the Ontoserver URL when YAML omits the block or supplies the wrong type
- `createTerminologyClient(settings)` returns a `MedplumClient` bound to the terminology server, or `null` when no URL is configured
- `probeTerminologyHealth(client, timeoutMs)` returns `not-configured` (null client), `ok` (metadata responds), or `unreachable` (rejected or timed out) — **never throws** (D-08 foundation, V-15 probe-layer assertion)
- `mockMedplumClientForTerminology` fixture is ready for plans 02/03/04/05 to register canned `$lookup` responses by path substring
- Eight new tests passing (4 settings + 4 terminology-health); zero regressions in the 22-file test suite

## Task Commits

Each task was committed atomically in TDD order (test → feat):

1. **Task 1 RED: add failing tests for terminology.serverUrl defaults** — `737dff3` (test)
2. **Task 1 GREEN: ship Ontoserver R4 as default terminology server** — `6bcc0a8` (feat)
3. **Task 2 RED: add failing terminology health probe suite + mock fixture** — `0444525` (test)
4. **Task 2 GREEN: add terminology MedplumClient factory + health probe** — `961355a` (feat)

## Files Created/Modified

### Created

- `src/terminology/types.ts` — `TerminologyHealth`, `TerminologyCacheEntry`, `ResolverOptions` types (plans 02/03 cache + resolver consume these)
- `src/terminology/terminologyClient.ts` — `createTerminologyClient(settings) → MedplumClient | null`
- `src/terminology/probe.ts` — `probeTerminologyHealth(client, timeoutMs = 3000) → Promise<TerminologyHealth>` with `AbortSignal.timeout` + `AbortController` fallback
- `src/__tests__/fixtures/terminology.ts` — `mockMedplumClientForTerminology({ metadataReachable, lookupResponses, errors })`
- `src/__tests__/terminology-health.test.ts` — 4 tests covering `not-configured`, `ok`, `unreachable`, and timeout paths

### Modified

- `public/settings.yaml` — Replaced commented `terminology:` placeholder with active Ontoserver URL + commented MII URL + mTLS explainer
- `src/config/settings.ts` — Extended `DEFAULTS` with `terminology.serverUrl`; `deepMerge` now validates `terminology.serverUrl` as string before override
- `src/__tests__/settings.test.ts` — Added `terminology defaults` describe block with 4 assertions (default / preserve / missing / wrong-type)

## Mock Fixture API (for plans 02/03/04/05)

```typescript
mockMedplumClientForTerminology({
  metadataReachable?: boolean,               // controls /metadata probe
  lookupResponses?: Record<string, unknown>, // substring → canned Parameters
  errors?: Record<string, Error>,            // substring → thrown Error
}) => MedplumClient
```

The returned mock intercepts `client.get(path)` and matches `path` against the registered maps in order: `metadata` → `errors` → `lookupResponses`. Unmatched paths throw `"No mock registered for path: <path>"` so tests fail loudly when coverage drifts.

## Decisions Made

- **Ontoserver as dev default (D-10):** ships uncommented in `public/settings.yaml`; MII URL remains commented with explicit mTLS caveat so operators understand browser SPAs cannot authenticate directly
- **Probe never throws:** every failure mode collapses into a `TerminologyHealth` union — the sidebar dot (plan 05) can render from a single `switch` without try/catch
- **`AbortSignal.timeout` with `AbortController` fallback:** jsdom's test environment lacks `AbortSignal.timeout`, so the probe detects and falls back to a manual `AbortController` + `setTimeout` — same behavior, broader runtime support
- **deepMerge validates `terminology.serverUrl` as string:** a wrong-type YAML value (e.g., `42`) no longer corrupts `AppSettings` — falls back to the default. Mirrors the guard applied to `fhir.serverUrl`
- **Fixture uses predicate-map API:** plans 02-05 register canned responses by path substring rather than rewriting the mock — keeps fixture stable across plans

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] Replaced `global.*` with `globalThis.*` in `settings.test.ts`**
- **Found during:** Post-Task 1 `npm run build` verification
- **Issue:** `TS2304: Cannot find name 'global'` — tsconfig for this project does not pull in `@types/node` globals for the test tree, so `global.fetch` did not type-check. The identical pattern in `resource-type-landing-counts.test.tsx` has the same issue but is pre-existing (out of scope).
- **Fix:** Switched to `globalThis.fetch` (standard, works in both jsdom and Node 18+), cast `vi.fn()` as `typeof fetch` to satisfy `fetch` signature.
- **Files modified:** `src/__tests__/settings.test.ts`
- **Verification:** `npm test -- src/__tests__/settings.test.ts` green; `tsc -b` no longer reports errors from this file.
- **Committed in:** `961355a` (bundled with Task 2 GREEN since the fix was needed before Task 2's build could succeed)

**2. [Rule 3 - Blocking] Removed dead `neverResolving` stub from timeout test**
- **Found during:** Post-Task 2 `npm run build`
- **Issue:** `TS6133: 'reject' is declared but its value is never read` on the illustrative first stub in the timeout test. The stub was a leftover of the plan's prose guidance and had no assertion role.
- **Fix:** Deleted the unused stub; the active `abortAwareClient` (which honours the `AbortSignal` the probe threads through) is now the single source of truth for the timeout assertion.
- **Files modified:** `src/__tests__/terminology-health.test.ts`
- **Verification:** `npm test -- src/__tests__/terminology-health.test.ts` green (4/4); build no longer flags the file.
- **Committed in:** `961355a`

---

**Total deviations:** 2 auto-fixed (both Rule 3 blocking)
**Impact on plan:** Both fixes were type-checker blockers caused by test-scaffold choices in the plan. No scope creep; behavior unchanged.

## Deferred Issues

Pre-existing TypeScript errors observed during `npm run build` that are **out of scope** for this plan (they existed at commit `808df73` before Phase 04 execution began):

- `src/__tests__/display-modes.test.tsx(7,7)`: unused `mockPatient`
- `src/__tests__/json-highlight.test.ts(3,1)`: unused `JsonToken`
- `src/__tests__/resource-type-landing-counts.test.tsx(11,1)`: `Cannot find name 'global'`
- `src/components/explorer/ResourceDetailPage.tsx(56,21)`: `Argument of type 'string' is not assignable to parameter of type ...`
- `src/components/explorer/SearchResultsPage.tsx(59,10)` and `(62,10)`: `Conversion of type 'SearchRequest<Resource>' to type 'Record<string, unknown>' may be a mistake`
- `src/components/patients/FhirResourcesView.tsx(106,17)`: same FHIR resource-type string-assignability error

Logging to `deferred-items.md` per SCOPE BOUNDARY — not fixed here.

## Issues Encountered

- None beyond the two Rule 3 auto-fixes above.

## User Setup Required

None — the Ontoserver R4 sandbox at `https://r4.ontoserver.csiro.au/fhir` is public, CORS-enabled, and requires no credentials.

## Next Phase Readiness

- **Ready for Plan 02 (resolver):** `createTerminologyClient` + fixture are consumable
- **Ready for Plan 05 (sidebar + settings):** `probeTerminologyHealth` gives the sidebar dot deterministic states; V-15 probe-layer is green (UI-layer assertion still owned by Plan 05's `sidebar-terminology-row.test.tsx`)
- **No blockers**

## Self-Check: PASSED

All 8 claimed files present on disk; all 4 task commits (`737dff3`, `6bcc0a8`, `0444525`, `961355a`) present in `git log`.

---
*Phase: 04-terminology-resolution*
*Completed: 2026-04-12*
