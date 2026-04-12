---
phase: 04-terminology-resolution
plan: 02
subsystem: terminology
tags: [terminology, cache, lru, localstorage]

requires:
  - phase: 04-terminology-resolution
    plan: "01"
    provides: TerminologyCacheEntry type + createTerminologyClient factory
provides:
  - "TerminologyCache class (get/set/clear/size) with 10K in-memory LRU + 2K localStorage mirror"
  - "makeTerminologyKey(serverUrl, system, code) → string key format `{serverUrl}|{system}|{code}`"
  - "parseTerminologyKey(key) → {serverUrl, system, code} | null (inverse)"
  - "LOCAL_STORAGE_PREFIX = 'tx-cache:v1:' exported for Plan 05 Settings clear button enumeration"
affects:
  - 04-03-resolver
  - 04-04-integration
  - 04-05-sidebar-settings

tech-stack:
  added: []
  patterns:
    - "Map-based LRU: delete+re-set on read/write to mark recently-used"
    - "localStorage mirror trimmed by oldest resolvedAt (not insertion order) to respect entry freshness"
    - "Hydrate-on-construct scans localStorage by prefix, server-URL namespaced"

key-files:
  created:
    - "src/terminology/terminologyKey.ts"
    - "src/terminology/TerminologyCache.ts"
    - "src/__tests__/terminology-cache.test.ts"
  modified: []

key-decisions:
  - "LOCAL_STORAGE_PREFIX is global (not server-scoped) so clear() can atomically wipe all namespaces in one pass (D-06)"
  - "parseTerminologyKey splits on first two '|' only (not naive split('|')) so code values containing '|' survive the roundtrip"
  - "enforceLocalStorageLimit ranks by resolvedAt (not insertion order) so freshness — not write-recency — drives eviction in the persistent mirror"
  - "persistToLocalStorage option (default true) lets LRU test bypass localStorage roundtrip overhead when filling 10K entries"
  - "MEMORY_LIMIT = 10_000 and LOCAL_STORAGE_LIMIT = 2_000 exist as named module-level constants (D-11 bounds are concrete, greppable)"

patterns-established:
  - "Pattern: Bounded LRU via Map delete+set — O(1) promote on get, O(1) evict oldest via keys().next()"
  - "Pattern: localStorage persistence is fail-soft — try/catch around every setItem/removeItem so quota exceeded / private mode never crashes the cache"
  - "Pattern: Server-URL namespacing at the cache-key level (not separate caches) — one TerminologyCache instance handles all entries but only hydrates its own namespace"

requirements-completed:
  - TERM-02

duration: 90s
completed: 2026-04-12
---

# Phase 04 Plan 02: Terminology Cache (LRU + localStorage) Summary

**Bounded LRU terminology cache with 10K in-memory entries + 2K localStorage mirror, server-URL namespaced so settings.yaml URL swaps never surface stale entries, and atomically wipeable via `clear()` for the Plan 05 Settings button.**

## Performance

- **Duration:** 90 s
- **Started:** 2026-04-12T07:15:33Z
- **Completed:** 2026-04-12T07:17:03Z
- **Tasks:** 1 (TDD: RED + GREEN, no refactor needed)
- **Files created:** 3
- **Files modified:** 0

## Accomplishments

- `TerminologyCache` class exposes `get`, `set`, `clear`, `size` with a Map-based LRU capped at **10,000** entries and a localStorage mirror capped at **2,000** entries
- Cache keys use the format `{serverUrl}|{system}|{code}` so switching `terminology.serverUrl` in settings.yaml hydrates only the new server's entries (Pitfall 5 mitigation)
- `LOCAL_STORAGE_PREFIX = 'tx-cache:v1:'` is exported for the Plan 05 Settings "Clear terminology cache" button to enumerate-and-delete safely
- `clear()` atomically wipes in-memory Map **and** every localStorage key starting with `tx-cache:v1:` across all server namespaces (D-06)
- Hydration on construct is server-scoped: `new TerminologyCache({ serverUrl: X })` does NOT see entries written under server Y (V-10 cross-server isolation)
- `TerminologyCacheEntry` is imported from Plan 01's `src/terminology/types.ts` — no duplicate type definition (wave ordering 01 → 02 respected)
- 9 new tests green; full 23-file test suite still healthy

## Task Commits

1. **Task 1 RED:** `545d54e` — `test(04-02): add failing terminology cache suite for LRU + localStorage mirror`
2. **Task 1 GREEN:** `254a803` — `feat(04-02): bounded LRU terminology cache with localStorage mirror`

## Files Created

- `src/terminology/terminologyKey.ts` — Key format helpers
  - `LOCAL_STORAGE_PREFIX = 'tx-cache:v1:'`
  - `makeTerminologyKey(serverUrl, system, code) → string`
  - `parseTerminologyKey(key) → { serverUrl, system, code } | null`
- `src/terminology/TerminologyCache.ts` — Bounded LRU + localStorage mirror
  - `class TerminologyCache` (constructor: `{ serverUrl, persistToLocalStorage? }`)
  - Module-level bounds: `const MEMORY_LIMIT = 10_000`, `const LOCAL_STORAGE_LIMIT = 2_000`
  - Public API: `get(key)`, `set(key, entry)`, `clear()`, `size()`
  - Private: `hydrateFromLocalStorage()`, `writeLocalStorage(key, entry)`, `enforceLocalStorageLimit()`
- `src/__tests__/terminology-cache.test.ts` — 9 tests (109 lines)
  - terminologyKey helpers: prefix constant, make, parse, parse-malformed
  - TerminologyCache: `'cache hit dedup'` (V-06), `'localStorage roundtrip'` (V-08), `'server url namespace'` (V-10), `'LRU eviction above MEMORY_LIMIT'`, `'clear removes memory and localStorage'`

## Public API (for Plans 03–05)

```typescript
import { TerminologyCache } from '../terminology/TerminologyCache';
import { makeTerminologyKey, LOCAL_STORAGE_PREFIX } from '../terminology/terminologyKey';

const cache = new TerminologyCache({ serverUrl: settings.terminology.serverUrl });
const key = makeTerminologyKey(settings.terminology.serverUrl, system, code);

const hit = cache.get(key);          // TerminologyCacheEntry | undefined
if (!hit) {
  // ... resolve via $lookup (Plan 03) ...
  cache.set(key, { display, resolvedAt: Date.now(), ttlMs: 24 * 60 * 60 * 1000 });
}

// Plan 05 Settings "Clear terminology cache" button:
cache.clear();
```

### Constructor Options

| Option                    | Type      | Default | Purpose                                                    |
| ------------------------- | --------- | ------- | ---------------------------------------------------------- |
| `serverUrl`               | `string`  | —       | Required. Namespaces hydration to this server's entries    |
| `persistToLocalStorage`   | `boolean` | `true`  | Set `false` for tests / SSR to skip localStorage I/O       |

### Bounds (D-11)

| Tier          | Constant                | Value  |
| ------------- | ----------------------- | ------ |
| In-memory     | `MEMORY_LIMIT`          | 10,000 |
| localStorage  | `LOCAL_STORAGE_LIMIT`   | 2,000  |

### Storage Format

- localStorage key: `tx-cache:v1:{serverUrl}|{system}|{code}`
- localStorage value: `JSON.stringify(TerminologyCacheEntry)`

## Decisions Made

- **Global LOCAL_STORAGE_PREFIX for `clear()`:** the clear action wipes ALL server namespaces (not just the current one) so a user clicking "Clear" in Settings gets predictable "cache is empty" behavior regardless of how many termservers they've pointed at during the session
- **`parseTerminologyKey` uses first-two-pipes split:** naive `split('|')` would break if a code value contains a pipe (rare but legal in some terminology systems). Slicing on the first two pipe indices preserves roundtrip fidelity
- **localStorage trim by `resolvedAt`, not insertion order:** the persistent mirror favors keeping fresh entries even if recently accessed but old. The in-memory LRU keeps recently-accessed entries. Two different strategies, one per tier, each matched to its purpose
- **`persistToLocalStorage: false` opt-out:** the 10K eviction test would otherwise perform 10K localStorage setItem calls (slow + jsdom-chatty). Tests that need deterministic in-memory behavior pass the opt-out
- **Concrete named constants (not magic numbers):** `MEMORY_LIMIT = 10_000` and `LOCAL_STORAGE_LIMIT = 2_000` are greppable, making D-11 bound audits trivial

## Deviations from Plan

None — plan executed exactly as written, with one minor strengthening:

**[Enhancement — not a deviation]** The plan's inline sketch of `parseTerminologyKey` used `split('|')` then reassembled the code via `rest.join('|')`. I kept the same semantics but implemented it via `indexOf` + `slice` to make the "first two pipes only" contract explicit in code. Behavior identical; readability slightly higher. Test covers both the happy path and malformed input.

## Issues Encountered

None.

## Deferred Issues

The `npm run build` pre-existing TypeScript errors listed in Plan 01's SUMMARY are still present and still out of scope:

- `src/__tests__/display-modes.test.tsx(7,7)` — unused `mockPatient`
- `src/__tests__/json-highlight.test.ts(3,1)` — unused `JsonToken`
- `src/__tests__/resource-type-landing-counts.test.tsx(11,1)` — `Cannot find name 'global'`
- `src/components/explorer/ResourceDetailPage.tsx(56,21)` — FHIR resource-type string assignability
- `src/components/explorer/SearchResultsPage.tsx(59,10)` and `(62,10)` — SearchRequest/Record conversion
- `src/components/patients/FhirResourcesView.tsx(106,17)` — same FHIR resource-type string assignability

None introduced by this plan. Files created by this plan (`terminologyKey.ts`, `TerminologyCache.ts`, `terminology-cache.test.ts`) type-check cleanly in isolation.

## User Setup Required

None.

## Next Plan Readiness

- **Ready for Plan 03 (resolver):** `TerminologyCache` instance + `makeTerminologyKey` are consumable; the resolver can `cache.get(key)` on entry and `cache.set(key, entry)` after a successful `$lookup`
- **Ready for Plan 05 (sidebar + settings):** `LOCAL_STORAGE_PREFIX` export + `cache.clear()` give the Settings "Clear terminology cache" button its exact contract
- **No blockers**

## Self-Check: PASSED

All 3 claimed files present on disk:

- `src/terminology/terminologyKey.ts` — FOUND
- `src/terminology/TerminologyCache.ts` — FOUND
- `src/__tests__/terminology-cache.test.ts` — FOUND

Both task commits present in `git log`:

- `545d54e` (test/RED) — FOUND
- `254a803` (feat/GREEN) — FOUND

Verification commands green:

- `npm test -- src/__tests__/terminology-cache.test.ts` — 9/9 tests passed
- grep confirms `MEMORY_LIMIT = 10_000` and `LOCAL_STORAGE_LIMIT = 2_000` in TerminologyCache.ts
- grep confirms `import type { TerminologyCacheEntry } from './types'` — no inline duplicate

---
*Phase: 04-terminology-resolution*
*Completed: 2026-04-12*
