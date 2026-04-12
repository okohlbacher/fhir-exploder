---
phase: 04-terminology-resolution
plan: 03
subsystem: terminology
tags: [terminology, resolver, context, dedup, cache-miss, silent-fallback]

requires:
  - phase: 04-terminology-resolution
    plan: "01"
    provides: createTerminologyClient factory + ResolverOptions/TerminologyCacheEntry types + mockMedplumClientForTerminology fixture
  - phase: 04-terminology-resolution
    plan: "02"
    provides: TerminologyCache + makeTerminologyKey
provides:
  - "TerminologyResolver class: resolveCoding / resolveCodeableConcept / resolveResource / lookupDisplay"
  - "extractDisplay(params, lang?) static helper — prefers matching designation over top-level display"
  - "collectCodings(value) depth-first walker that yields every Coding-shaped object in a FHIR value"
  - "TerminologyProvider React context wiring AppSettings → resolver instance"
  - "useTerminology() hook — throws outside provider"
affects:
  - 04-04-integration
  - 04-05-sidebar-settings

tech-stack:
  added: []
  patterns:
    - "Inflight dedup via Map<key, Promise> — delete-on-settle so no leaks"
    - "Positive cache entry: ttlMs = Infinity (immutable); negative entry: ttlMs = negativeTtlMs"
    - "Memo-key-via-JSON pattern: useMemo deps = JSON.stringify(settings.terminology) avoids eslint-disable"
    - "Walker recurses every object key — no per-key skip list, relying on typeof !== 'object' short-circuit"

key-files:
  created:
    - "src/terminology/TerminologyResolver.ts"
    - "src/terminology/walker.ts"
    - "src/contexts/TerminologyContext.tsx"
    - "src/hooks/useTerminology.ts"
    - "src/__tests__/terminology-resolver.test.ts"
    - "src/__tests__/terminology-context.test.tsx"
  modified: []

key-decisions:
  - "extractDisplay short-circuits on non-Parameters input and falls back to top-level display when no matching designation — single-branch contract used by both lookup path and tests"
  - "Inflight dedup at system|code granularity (not per-request) — 3 parallel resolveCoding calls for the same code trigger exactly 1 $lookup (V-07); finally() block deletes inflight Map entry whether the Promise resolves or rejects"
  - "Positive cache entries live with ttlMs = Infinity (code→display mappings in R4 terminology do not change mid-session); negative entries expire after negativeTtlMs (default 5 min) so transient failures self-heal"
  - "Walker recurses every key (no skip list for system/code/display/version) — the skip-list optimization silently masked Codings nested under fields literally named `code` (e.g. Condition.code.coding[]); relying on typeof !== 'object' is correct and simpler"
  - "TerminologyProvider memo reads a parsed terminology snapshot (JSON.parse(terminologyKey)) instead of the live settings prop, so deps = [terminologyKey] is exhaustive without an eslint-disable comment"

patterns-established:
  - "Pattern: Public async API on the resolver is non-throwing — every failure mode lands in a catch that records a negative cache entry and returns null; callers never need try/catch around resolve*"
  - "Pattern: AbortSignal.timeout with capability check (typeof AbortSignal.timeout === 'function') — works in jsdom runtimes that lack the newer AbortSignal.timeout API"
  - "Pattern: resolveResource returns a deep-cloned resource (JSON.parse(JSON.stringify(x))) with display populated post-hoc from cache — never mutates the input"

requirements-completed:
  - TERM-01
  - TERM-02
  - TERM-03

duration: 4min 45s
completed: 2026-04-12
---

# Phase 04 Plan 03: TerminologyResolver + Context + Hook Summary

**Beating heart of Phase 4: a `TerminologyResolver` that issues `CodeSystem/$lookup` with `displayLanguage=de`, coalesces concurrent lookups for the same system|code, caches results (positive forever, negative for 5 min), and falls back silently on every error path — wrapped in a `TerminologyProvider` React context that re-creates the resolver whenever `settings.terminology` changes.**

## Performance

- **Duration:** 4 min 45 s
- **Started:** 2026-04-12T07:19:11Z
- **Completed:** 2026-04-12T07:23:56Z
- **Tasks:** 2 (TDD: RED → GREEN, no refactor needed)
- **Files created:** 6

## Accomplishments

- `TerminologyResolver.resolveCoding({system, code})` issues one `GET CodeSystem/$lookup?system=...&code=...&displayLanguage=de` per unique system|code and returns a new Coding with `display` populated (TERM-01, V-01, V-02, V-03)
- Inflight Map dedup: 3 parallel `resolveCoding` calls for the same system|code trigger exactly 1 network request; second sequential call hits the in-memory cache (TERM-02, V-07, V-06 foundation)
- Silent fallback: 404s, OperationOutcome bodies, and thrown network errors all land in a catch block that caches a negative entry and returns the coding unchanged — no throw (TERM-03, V-11, V-12)
- Missing system OR missing code short-circuits without a network call (V-13)
- `extractDisplay(params, 'de')` prefers a matching German designation over the top-level display parameter; falls back cleanly when no match exists (V-03)
- `collectCodings` walker recurses every object key so Codings nested under FHIR fields named `code` (CodeableConcept) are not silently skipped
- `TerminologyProvider` wires AppSettings → resolver; `useTerminology` throws a developer-friendly error when used outside a provider
- 21 new tests green (18 resolver + 3 context); zero regressions (158 tests total, up from 137)

## Task Commits

Each task was committed atomically in TDD order:

1. **Task 1 RED: add failing tests for TerminologyResolver + walker** — `42e3ce4` (test)
2. **Task 1 GREEN: implement TerminologyResolver + collectCodings walker** — `cf57216` (feat)
3. **Task 2 RED: add failing tests for TerminologyProvider + useTerminology** — `a971379` (test)
4. **Task 2 GREEN: TerminologyProvider + useTerminology + erasableSyntaxOnly fix** — `c06d05c` (feat)

## Public API

### TerminologyResolver

```typescript
import { TerminologyResolver, extractDisplay } from './TerminologyResolver';

const resolver = new TerminologyResolver(medplumClient, {
  displayLanguage: 'de',
  lookupTimeoutMs: 5000,
  negativeTtlMs: 5 * 60_000,
  persistToLocalStorage: true,
  serverUrl: 'https://tx.example/fhir',
});

// Single Coding — returns new Coding or input unchanged on miss
const enriched: Coding = await resolver.resolveCoding({ system, code });

// CodeableConcept — resolves every coding in parallel, returns new CC
const cc: CodeableConcept = await resolver.resolveCodeableConcept(input);

// Whole resource — deep clone with every Coding's display populated
const condition: Condition = await resolver.resolveResource(rawCondition);

// Raw lookup — returns string | null (cache + inflight aware)
const display: string | null = await resolver.lookupDisplay(system, code);
```

**Contract:** every method is non-throwing. On failure, Codings come back unchanged and a negative cache entry (ttlMs = 5 min) short-circuits the next call.

### extractDisplay

```typescript
extractDisplay(params: Parameters, lang?: string): string | null
```

- Returns `null` when `params` is not a Parameters resource
- When `lang` is provided, a matching `designation` (with `language` = lang and a `value` part) wins over the top-level `display` parameter
- Falls back to the top-level `display` valueString when no designation matches

### collectCodings

```typescript
collectCodings(value: unknown, out?: Coding[]): Coding[]
```

- Returns `[]` for non-object inputs
- Yields every object with `system: string` AND `code: string` — walks every other key
- No per-key skip list, so a field literally named `code` (CodeableConcept) still has its children walked

### TerminologyProvider

```typescript
<TerminologyProvider settings={appSettings}>
  {children}
</TerminologyProvider>
```

- `settings` may be `AppSettings` or `null`
- When null OR `settings.terminology.serverUrl` is missing → client is null, all lookups short-circuit
- Memo key: `JSON.stringify(settings?.terminology ?? null)` — any change anywhere under `settings.terminology` recreates the resolver (W-1 / Pitfall 3 mitigation)
- **No `eslint-disable react-hooks/exhaustive-deps` required** — memo body reads parsed terminology snapshot, not the live settings prop

### useTerminology

```typescript
const resolver = useTerminology();
// Throws: 'useTerminology must be used within a TerminologyProvider' when unprovided
```

## Decisions Made

- **Non-throwing public API:** every public method catches its own errors and falls back to "return the input unchanged + record a negative cache entry". Consumers in Plan 04 never need try/catch, which keeps the `<CodingCell>` render path simple and drift-free.
- **Inflight dedup at system|code granularity, not per-request:** 3 parallel `resolveCoding` calls from a single render pass share ONE Promise in the `inflight` Map, so `client.get` fires exactly once. `finally()` removes the entry whether the Promise resolved or rejected, so no leaks.
- **Positive entries immortal, negative entries 5-min TTL:** R4 code→display mappings do not change mid-session, so positive cache is `ttlMs = Infinity`. Transient failures (network blip, termserver restart) self-heal after 5 minutes via negativeTtlMs.
- **Walker has no per-key skip list:** the original sketch skipped `system`/`code`/`display`/`version` as an optimization. That silently hid Codings nested under fields literally named `code` (e.g. `Condition.code.coding[]`). Dropping the skip list is correct — the `typeof !== 'object'` early-return still skips the primitives.
- **Memo-key-via-JSON.parse pattern:** the TerminologyProvider memo deps = `[terminologyKey]` where `terminologyKey = JSON.stringify(settings.terminology)`. Because the factory body reads ONLY `JSON.parse(terminologyKey)`, not the live `settings` prop, the deps array is exhaustive without an eslint-disable comment. This matches Plan's W-1 acceptance criterion.
- **Deep-clone-then-enrich in resolveResource:** we first fire all `resolveCoding` calls (which populates the cache), then deep-clone the resource and post-hoc write `display` from the cache. Avoids mutating the caller's object, which is important because the resource is typically a Redux/React state value.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] Fixed `erasableSyntaxOnly` compile error by dropping parameter-property shorthand**

- **Found during:** Post-Task 2 `npm run build`
- **Issue:** `TerminologyResolver.ts(59,5): TS1294: This syntax is not allowed when 'erasableSyntaxOnly' is enabled.` The plan sketch used TypeScript parameter-property shorthand (`private client: MedplumClient | null, private opts: ResolverOptions = {}`) which this tsconfig forbids.
- **Fix:** Replaced with explicit field declarations + assignments inside the constructor body. Behavior identical; syntax compatible with `erasableSyntaxOnly`.
- **Files modified:** `src/terminology/TerminologyResolver.ts`
- **Verification:** `npm run build` no longer reports errors from this file; `npm test -- src/__tests__/terminology-resolver.test.ts` still 18/18 green.
- **Committed in:** `c06d05c` (bundled with Task 2 GREEN)

**2. [Rule 1 - Bug] Removed per-key skip list from `collectCodings` walker**

- **Found during:** Task 1 first test run after implementing walker per plan sketch
- **Issue:** The plan's walker sketch skipped keys named `system`/`code`/`display`/`version` when recursing, as an optimization. The test `'walks nested resources and yields every Coding'` expected 3 codings from a Condition but got 1 — the skip-list silently masked codings nested under `Condition.code.coding[]` because the walker refused to recurse into any key named `code`.
- **Fix:** Dropped the skip list. The `typeof value !== 'object'` early-return still skips the string primitives that live directly on a Coding (`system`/`code`/`display`/`version` are all strings), so the optimization was redundant AND wrong.
- **Files modified:** `src/terminology/walker.ts`
- **Verification:** 18/18 resolver tests green including `enriches resource end-to-end via resolveResource` and `walks nested resources and yields every Coding`.
- **Committed in:** `cf57216` (Task 1 GREEN)

---

**Total deviations:** 2 auto-fixed (1 Rule 3 blocking, 1 Rule 1 bug in plan sketch). Both behavior-neutral for the resolver's observable semantics.

## Issues Encountered

None beyond the two auto-fixes above.

## Deferred Issues

Pre-existing TypeScript errors observed during `npm run build` that are still **out of scope** (unchanged since Plan 01):

- `src/__tests__/display-modes.test.tsx(7,7)` — unused `mockPatient`
- `src/__tests__/json-highlight.test.ts(3,1)` — unused `JsonToken`
- `src/__tests__/resource-type-landing-counts.test.tsx(11,1)` — `Cannot find name 'global'`
- `src/components/explorer/ResourceDetailPage.tsx(56,21)` — FHIR resource-type string assignability
- `src/components/explorer/SearchResultsPage.tsx(59,10)` and `(62,10)` — SearchRequest/Record conversion
- `src/components/patients/FhirResourcesView.tsx(106,17)` — same FHIR resource-type string assignability

All 6 files typed by Plan 03 (`TerminologyResolver.ts`, `walker.ts`, `TerminologyContext.tsx`, `useTerminology.ts`, `terminology-resolver.test.ts`, `terminology-context.test.tsx`) type-check cleanly.

## User Setup Required

None.

## Next Plan Readiness

- **Ready for Plan 04 (integration hooks):** `useTerminology` is consumable; resolver API (`resolveCoding`, `resolveCodeableConcept`, `resolveResource`) is locked for the `CodingCell` / `useResolvedResource` hook.
- **Ready for Plan 05 (sidebar + settings):** `TerminologyProvider` already accepts `AppSettings | null` and swaps resolver on settings change; `resolver.cache.clear()` is exposed via the TerminologyCache instance for the Settings "Clear terminology cache" button.
- **No blockers.**

## Self-Check: PASSED

All 6 claimed files present on disk:

- `src/terminology/TerminologyResolver.ts` — FOUND
- `src/terminology/walker.ts` — FOUND
- `src/contexts/TerminologyContext.tsx` — FOUND
- `src/hooks/useTerminology.ts` — FOUND
- `src/__tests__/terminology-resolver.test.ts` — FOUND
- `src/__tests__/terminology-context.test.tsx` — FOUND

All 4 task commits present in `git log`:

- `42e3ce4` (Task 1 RED) — FOUND
- `cf57216` (Task 1 GREEN) — FOUND
- `a971379` (Task 2 RED) — FOUND
- `c06d05c` (Task 2 GREEN) — FOUND

Verification commands green:

- `npm test -- src/__tests__/terminology-resolver.test.ts` — 18/18 tests passed
- `npm test -- src/__tests__/terminology-context.test.tsx` — 3/3 tests passed
- `npm test` full suite — 158/158 tests passed (22 todo, 3 skipped suites pre-existing)
- `npm run build` — only pre-existing deferred errors remain; new files type-check cleanly

grep-verified acceptance criteria:

- `export class TerminologyResolver` — FOUND in TerminologyResolver.ts
- `export function extractDisplay` — FOUND in TerminologyResolver.ts
- `CodeSystem/$lookup?` — FOUND at line 144 of TerminologyResolver.ts
- `displayLanguage` — FOUND
- `export function collectCodings` — FOUND in walker.ts
- `export function TerminologyProvider` + `export const TerminologyContext` — FOUND in TerminologyContext.tsx
- `displayLanguage: 'de'` — FOUND in TerminologyContext.tsx
- `JSON.stringify(settings?.terminology` — FOUND in TerminologyContext.tsx
- `eslint-disable-next-line react-hooks/exhaustive-deps` — NOT FOUND (W-1 fix verified)
- `export function useTerminology` — FOUND in useTerminology.ts
- `throw new Error` with `'TerminologyProvider'` — FOUND in useTerminology.ts

---
*Phase: 04-terminology-resolution*
*Completed: 2026-04-12*
