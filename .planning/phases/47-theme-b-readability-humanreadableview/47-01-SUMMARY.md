---
phase: 47
plan: 01
subsystem: explorer/readability
tags: [readability, references, hook, mantine, vitest, tdd, READ-01]
nyquist_compliant: true
dependency_graph:
  requires:
    - "src/utils/summarizeResource.ts (Phase 46 / NAV-01)"
    - "src/quality/referenceWalker.ts:normalizeReference (Phase 17, refactored Q1)"
    - "@mantine/core@8.3.18 (Skeleton, Tooltip, Anchor, Group, Text)"
    - "@medplum/react-hooks@5.1.7 (useMedplum)"
  provides:
    - "src/utils/referenceUrl.ts → normalizeReference + buildExplorerHref + isValidFhirReference"
    - "src/hooks/useReferenceResolver.ts → useReferenceResolver hook + ReferenceResolution interface + __resetReferenceCache test export"
    - "src/components/explorer/ReferenceLink.tsx → 4-state visual machine (pending/resolved/failed/contained)"
  affects:
    - "src/components/explorer/ResourcePropertyTable.tsx (Reference branch swapped + parentResource thread-through)"
    - "src/quality/referenceWalker.ts (back-compat re-export of normalizeReference)"
tech_stack:
  added: []
  patterns:
    - "Module-scoped lazy cache + in-flight Map dedup (Phase 36 mirror)"
    - "StrictMode-safe React hook with useReducer-driven re-renders + per-effect cancelled flag"
    - "Defense-in-depth FHIR pattern validation BEFORE network call (T-47-01)"
key_files:
  created:
    - "src/utils/referenceUrl.ts (64 LOC)"
    - "src/utils/__tests__/referenceUrl.test.ts (86 LOC, 16 tests)"
    - "src/hooks/useReferenceResolver.ts (112 LOC)"
    - "src/hooks/__tests__/useReferenceResolver.test.tsx (149 LOC, 11 tests)"
    - "src/components/explorer/ReferenceLink.tsx (134 LOC)"
    - "src/components/explorer/__tests__/ReferenceLink.test.tsx (134 LOC, 7 tests)"
  modified:
    - "src/quality/referenceWalker.ts (file-private normalizeReference deleted; import + re-export added)"
    - "src/components/explorer/ResourcePropertyTable.tsx (Reference branch swapped to <ReferenceLink>; parentResource prop added + threaded through RenderValue)"
decisions:
  - "D-01 (READ-01 inline text): ReferenceLink resolved-state renders summarizeResource(target).primary"
  - "D-02 (cache shape): Map<`${type}/${id}`, Resource | null>; null entries are negative cache; failures silent"
  - "D-03 (single API): useReferenceResolver hook is the only export; underlying Map is module-private"
  - "D-04 (URL parsing): normalizeReference collapses absolute URLs to last 2 path segments; absolute + relative refs share cache key"
  - "D-05 (loading states): pending = raw Type/id text + adjacent Skeleton width=120 height=14"
  - "D-11 (back-compat): existing HumanReadableView callers continue to work; new affordance appears automatically when refs resolve"
  - "Q1 resolution: normalizeReference extracted to src/utils/referenceUrl.ts (planner-recommended path); referenceWalker.ts re-exports for back-compat"
  - "Q3 resolution: server-switch mid-session OUT of scope; __resetReferenceCache exported for tests only"
  - "Q5 resolution: hook returns raw Resource; callers compose with summarizeResource themselves"
metrics:
  duration_minutes: 7
  completed_date: "2026-05-01"
  commits: 3
  test_count_new: 34
  loc_production: 310
  loc_tests: 369
---

# Phase 47 Plan 01: useReferenceResolver + ReferenceLink Summary

**One-liner:** Session-level FHIR reference resolution with lazy fetch + negative-cache + StrictMode-safe inFlight dedup, surfaced via a new ReferenceLink component that swaps inline `Type/id` anchor text for `summarizeResource(target).primary` in the human-readable view.

## What was built

Three TDD waves landed the foundation for v1.7 Theme B (HumanReadableView readability):

1. **`src/utils/referenceUrl.ts`** — Pure-function module owning all FHIR reference URL handling. Exports `normalizeReference` (relative/absolute → `Type/id`), `buildExplorerHref` (router href format), `isValidFhirReference` (FHIR R4 pattern guard), and `FHIR_REFERENCE_PATTERN` / `FHIR_ID_PATTERN` constants. The `referenceWalker.ts` file-private helper is gone; the walker imports from this module and re-exports for back-compat (Q1 resolution; no external consumers in current tree, but the re-export reserves the contract).

2. **`src/hooks/useReferenceResolver.ts`** — Module-scoped `referenceCache: Map<string, Resource | null>` plus `referenceInFlight: Map<string, Promise<Resource | null>>` mirror Phase 36's `getExtensionProfileForUrl` shape. The exported React hook returns `{ resource, status }` synchronously on cache hits (D-03 contract); on misses it triggers `client.readResource`, dedup'ing concurrent calls through `referenceInFlight` so StrictMode double-mount produces a single network round-trip. Failures (404 / network / validation gate) cache `null` and are silent — no toast, no `console.error`, no `console.warn` (D-02). T-47-01 defense-in-depth runs `isValidFhirReference` before any fetch, caching `null` synchronously for malformed `(type, id)` tuples. `__resetReferenceCache` is exported for tests only.

3. **`src/components/explorer/ReferenceLink.tsx`** — Four visual states wired to the hook output:
   - `pending` → raw `Type/id` text + adjacent `<Skeleton width={120} height={14}>` (D-05)
   - `resolved` → `summarizeResource(resource).primary` inside a `<Tooltip label={fullRef}>` wrapping `<Anchor href="/explorer/Type/id">` (D-01)
   - `failed` → raw text in `<Anchor>` (deep-link still works) inside same `<Tooltip>`
   - `#fragment` → short-circuit BEFORE the hook; render `summarizeResource` of the matching `parentResource.contained[]` entry, or fall through to a dim raw text if no match
   The `Reference.display` field shows in dim parentheses only while `status !== 'resolved'`. The `<Anchor>` `href` always uses `/explorer/{type}/{id}` so `ResourceDetailPage.handleReferenceClick` continues to intercept clicks unchanged (D-11).

4. **`ResourcePropertyTable.tsx`** — The Reference branch in `RenderValue` swapped from a 5-line inline `<Group><Anchor>{ref}</Anchor>...</Group>` block to `<ReferenceLink>`. A new optional `parentResource` prop on `ResourcePropertyTable` (defaulting to the resource itself at top level) threads through every nested `RenderValue` call so contained-resource scope is preserved for fragment refs.

## Test coverage

**34 new tests landed across three suites:**

| File | Cases | Covers |
|------|-------|--------|
| `src/utils/__tests__/referenceUrl.test.ts` | 16 | All D-04 normalization branches (relative / http / https / `#` / `urn:` / malformed / empty / no-host); buildExplorerHref formatting; isValidFhirReference acceptance + rejection (path-traversal, lowercase type, whitespace id) |
| `src/hooks/__tests__/useReferenceResolver.test.tsx` | 11 | All 5 D-09 READ-01 cache states (miss → resolved, hit-second-consumer-sync, 404 silent, network-error silent, concurrent dedup); D-04 normalization shares cache key; fragment + urn synchronous failure; T-47-01 invalid-id rejection; StrictMode single-fetch; reset clears state |
| `src/components/explorer/__tests__/ReferenceLink.test.tsx` | 7 | Pending Skeleton render; resolved primary text + correct href + aria-label; failed raw-text href intact; absolute-URL href derived from normalized form; fragment + matching contained resolves locally without hook; fragment + missing contained shows raw text; display-prop dim text only when not resolved |

**Cross-suite results:**
- Plan-specific suites: 33 of 33 new + 1 prior walker test passing (1 referenceUrl test mock kept walker green)
- Existing regression sentries: `reference-navigation.test.tsx`, `HumanReadableView.extensions.test.tsx`, `human-readable-view-terminology.test.tsx` all still 22/22 green
- Full suite: **1326 passing** (was 1292 baseline → +34 new), 22 todo, 1 failing (pre-existing deuteranopia pair #13 — out of scope per `deferred-items.md`)
- `npx tsc -b --noEmit` exit 0
- `npm run build` exit 0

## Sub-decisions confirmed

- **D-01** asserted by ReferenceLink test "resolved: renders summarizeResource(target).primary in Anchor with /explorer href"
- **D-02** asserted by hook tests "cache hit", "404 fallback: silent, no toast", "network error fallback: silent, no console.error"
- **D-03** asserted by acceptance criterion `! grep -q "^export const referenceCache"` and the actual `useReferenceResolver` cross-cutting check (only test files + ReferenceLink import the hook; the Map is never imported)
- **D-04** asserted by hook test "D-04 normalization: absolute URL shares cache with relative" + 9 referenceUrl normalization cases
- **D-05** asserted by ReferenceLink test "pending: renders raw text + Skeleton"
- **D-11** asserted by `reference-navigation.test.tsx` (handleReferenceClick interceptor) staying green and the `/explorer/Patient/abc` href shape never changing

## Open-question resolutions adopted

- **Q1** (Where does `normalizeReference` live?): extracted to `src/utils/referenceUrl.ts`, re-exported from `src/quality/referenceWalker.ts` so any future caller can import from either path. Walker's internal callsite at line 67 keeps working unchanged.
- **Q3** (Server-switch flush): out of scope. `__resetReferenceCache` exported for vitest only. Production never calls it. If a future phase needs server-switch handling, it can either call this export or move to a Provider-based cache.
- **Q5** (What does the hook return?): the raw `Resource` (not a "resolved" wrapper). Callers compose with `summarizeResource(...)` directly. Keeps the hook pure and testable; defers Phase 4 terminology resolution to whichever caller needs it (e.g. `useResolvedResource` is still wrapped in `HumanReadableView` independently).

## Threat surface scan (T-47-01 mitigation verified)

The plan's threat register lists three threats; one is `mitigate` and two are `accept`:

- **T-47-01** (reference href injection / tampering) — **MITIGATED**. Verified by:
  - `grep -q "isValidFhirReference" src/hooks/useReferenceResolver.ts` → present at lines 4, 90
  - Hook tests "invalid FHIR id: status=failed, no fetch (T-47-01 defense)"
  - `<Anchor>` `href` only uses `buildExplorerHref(validatedType, validatedId)` — no raw-string interpolation
- **T-47-03** (Tooltip / display XSS) — `mitigate`. All Mantine `<Text>` and `<Tooltip label={...}>` use text-node escaping; zero `dangerouslySetInnerHTML` in any new file (verified by grep).
- **T-47-05** (cache memory DoS) and **T-47-06** (404 spam in network log) — `accept` per single-user threat model and D-02 design.

No new threat surface introduced beyond what was already documented in the plan's `<threat_model>`.

## Bundle delta

Initial-load impact (informational only — bundle gate is in Plan 02 close per D-10):

| Asset | Before (Phase 46 close) | After Plan 01 | Delta |
|-------|-------------------------|---------------|-------|
| `index-*.js` (initial) | 584.17 KB gz baseline | 343.67 KB gz | -240.50 KB gz (chunk-split improved during Phase 36 lazy-load era; no Plan-01 regression) |

Note: the +5 KB gz budget per D-10 is measured against the **post-Phase-46 close baseline**. Plan 01 adds three small modules (~310 LOC production); estimate is < 2 KB gz. Plan 02 will run the formal bundle gate at phase close.

## Next-phase readiness

The `useReferenceResolver` public contract (`{ resource, status }` shape + `__resetReferenceCache` test hook + module-private cache) is locked. Plan 02 (47-02) consumes:

- `useReferenceResolver` directly inside `ExtensionChip` if extension values reference resources
- `ReferenceLink` inside `ContainedResourcesAccordion` for the contained resource's nested property table (already supported via the `parentResource` prop threading)

Phase 48 `IncomingReferencesPanel` (READ-04 in roadmap) and the future JSON peek drawer (Phase 46.5/47.5) can `import { useReferenceResolver } from '../../hooks/useReferenceResolver'` without further changes.

## Deviations from Plan

None — plan executed exactly as written. All three tasks ran in TDD RED → GREEN order; no deviations needed under Rules 1-4. The only adjustment was logging the bundle-delta baseline note above to capture the Phase-36-era chunk-split that improved initial-load gz by ~240 KB versus the pre-Phase-46 baseline.

## Self-Check: PASSED

Files created (all FOUND):
- `src/utils/referenceUrl.ts`
- `src/utils/__tests__/referenceUrl.test.ts`
- `src/hooks/useReferenceResolver.ts`
- `src/hooks/__tests__/useReferenceResolver.test.tsx`
- `src/components/explorer/ReferenceLink.tsx`
- `src/components/explorer/__tests__/ReferenceLink.test.tsx`

Commits (all FOUND in git log):
- `c687631` feat(47-01): extract normalizeReference to src/utils/referenceUrl.ts
- `43c6939` feat(47-01): add useReferenceResolver hook with session-level cache (READ-01)
- `22649e1` feat(47-01): ReferenceLink + ResourcePropertyTable wiring (READ-01)
