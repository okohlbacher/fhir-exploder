---
phase: 04-terminology-resolution
reviewed: 2026-04-12T00:00:00Z
depth: standard
files_reviewed: 28
files_reviewed_list:
  - public/settings.yaml
  - src/App.tsx
  - src/__tests__/fixtures/terminology.ts
  - src/__tests__/human-readable-view-terminology.test.tsx
  - src/__tests__/resolved-resource.test.tsx
  - src/__tests__/settings-clear-cache.test.tsx
  - src/__tests__/settings.test.ts
  - src/__tests__/sidebar-terminology-row.test.tsx
  - src/__tests__/terminology-cache.test.ts
  - src/__tests__/terminology-context.test.tsx
  - src/__tests__/terminology-health.test.ts
  - src/__tests__/terminology-resolver.test.ts
  - src/components/explorer/ClinicalRawView.tsx
  - src/components/explorer/HumanReadableView.tsx
  - src/components/layout/Sidebar.tsx
  - src/components/settings/SettingsPage.tsx
  - src/config/settings.ts
  - src/contexts/TerminologyContext.tsx
  - src/hooks/useResolvedResource.ts
  - src/hooks/useTerminology.ts
  - src/hooks/useTerminologyHealth.ts
  - src/terminology/TerminologyCache.ts
  - src/terminology/TerminologyResolver.ts
  - src/terminology/probe.ts
  - src/terminology/statusConfig.ts
  - src/terminology/terminologyClient.ts
  - src/terminology/terminologyKey.ts
  - src/terminology/types.ts
  - src/terminology/walker.ts
findings:
  critical: 1
  warning: 4
  info: 5
  total: 10
status: issues_found
---

# Phase 4: Code Review Report

**Reviewed:** 2026-04-12
**Depth:** standard
**Files Reviewed:** 28
**Status:** issues_found

## Summary

Phase 4 introduces terminology display resolution on top of a bounded LRU cache with a localStorage mirror, namespaced per terminology server URL. The module contract (non-throwing resolver, silent fallback to raw codes) is well-documented and well-tested — resolver tests cover inflight dedup, cache hits, 404/network errors, and incomplete codings; cache tests cover LRU eviction, namespace isolation, and clear semantics; the Sidebar renders the four TerminologyHealth states with the locked status-config colors.

One real bug stands out: an invalid `terminology.serverUrl` in `settings.yaml` crashes `TerminologyProvider` (and `useTerminologyHealth`) because `new URL(url)` in `createTerminologyClient` is not guarded. This bypasses the settings-validation safety net that already degrades wrong-type values to the default. Three additional warnings concern a timer leak in the probe fallback, duplicated MedplumClient construction in `useTerminologyHealth`, and a minor double-render redundancy in `useResolvedResource`. Info-level items flag test anti-patterns and opportunities to tighten the walker.

## Critical Issues

### CR-01: `createTerminologyClient` throws on malformed URL, crashes provider tree

**File:** `src/terminology/terminologyClient.ts:18`
**Issue:** `new URL(url)` throws `TypeError: Invalid URL` for any string that isn't parseable (e.g., `"not a url"`, `"foo.bar"` without a scheme, `"http://"` with no host). Callers are:
- `TerminologyProvider`'s `useMemo` factory (src/contexts/TerminologyContext.tsx:48) — an unhandled throw here fails the entire app render, since the provider wraps the top-level routes.
- `useTerminologyHealth`'s `useEffect` (src/hooks/useTerminologyHealth.ts:30) — an unhandled throw crashes the hook's component.

The settings layer only validates the type (`typeof terminology.serverUrl === 'string'`, src/config/settings.ts:41) and falls back to the default when the type is wrong — but an *invalid-but-string* URL passes this check and reaches `createTerminologyClient`. There is no try/catch and no format validation. A user typing e.g. `terminology.serverUrl: "localhost:8080"` (missing scheme) in `settings.yaml` will see the whole UI go blank.

The existing guard on line 16 (`url.trim() === ''`) shows the intent to harden this path but only handles the empty-string case.

**Fix:**
```ts
// src/terminology/terminologyClient.ts
export function createTerminologyClient(settings: AppSettings): MedplumClient | null {
  const url = settings.terminology?.serverUrl;
  if (!url || typeof url !== 'string' || url.trim() === '') return null;

  let u: URL;
  try {
    u = new URL(url);
  } catch {
    // Invalid URL in settings.yaml — treat as unconfigured rather than crashing the provider.
    return null;
  }

  return new MedplumClient({
    baseUrl: `${u.protocol}//${u.host}`,
    fhirUrlPath: u.pathname.replace(/^\//, '').replace(/\/?$/, '/'),
  });
}
```

Also add a unit test in `terminology-resolver.test.ts` (or a new `terminology-client.test.ts`) covering `createTerminologyClient({ terminology: { serverUrl: 'not a url' } })` returns `null` and does not throw.

## Warnings

### WR-01: `probe.ts` fallback path leaks a `setTimeout` handle

**File:** `src/terminology/probe.ts:39-42`
**Issue:** The `AbortSignal.timeout` fallback schedules a timer that aborts the controller, but never clears it. If the request resolves quickly (e.g., 10ms), the timer still fires at `timeoutMs` (default 3000ms) and calls `controller.abort()` on an already-completed controller — a no-op, but the timer stays alive in the event loop for the full duration. Under repeated probes (e.g., future periodic re-probe per D-08), this can accumulate and delays test runner exit.

**Fix:**
```ts
function buildTimeoutSignal(timeoutMs: number): AbortSignal | undefined {
  const maybeTimeout = (AbortSignal as unknown as { timeout?: (ms: number) => AbortSignal }).timeout;
  if (typeof maybeTimeout === 'function') {
    return maybeTimeout.call(AbortSignal, timeoutMs);
  }

  if (typeof AbortController !== 'undefined') {
    const controller = new AbortController();
    const handle = setTimeout(() => controller.abort(new Error('Timeout')), timeoutMs);
    // Clear the timer once the signal aborts OR once the caller's fetch completes.
    controller.signal.addEventListener('abort', () => clearTimeout(handle), { once: true });
    return controller.signal;
  }
  return undefined;
}
```
Note: this still leaks when the request completes successfully (signal never aborts). For a cleaner fix, have `probeTerminologyHealth` own the `AbortController` and call `clearTimeout` in a `finally` block after `client.get` settles.

### WR-02: `useTerminologyHealth` constructs a second MedplumClient every effect run

**File:** `src/hooks/useTerminologyHealth.ts:30`
**Issue:** Every time `settings` or `serverUrl` changes, the effect calls `createTerminologyClient(settings)` and instantiates a new MedplumClient solely to probe `/metadata`. The `TerminologyProvider` has already constructed one (src/contexts/TerminologyContext.tsx:48) and owns it through the resolver. This duplicates work, runs the `new URL(...)` parse a second time (which interacts with CR-01), and means the probe uses a client that is decoupled from the resolver's state.

**Fix:** Surface the underlying client through the resolver (add a `readonly client: MedplumClient | null` public field) and consume it from context:
```ts
// src/terminology/TerminologyResolver.ts — expose the client
readonly client: MedplumClient | null;

// src/hooks/useTerminologyHealth.ts — use the existing one
export function useTerminologyHealth(): TerminologyHealth {
  const resolver = useTerminology();
  const [health, setHealth] = useState<TerminologyHealth>('unknown');
  useEffect(() => {
    if (!resolver.client) { setHealth('not-configured'); return; }
    setHealth('unknown');
    let cancelled = false;
    probeTerminologyHealth(resolver.client).then((r) => { if (!cancelled) setHealth(r); });
    return () => { cancelled = true; };
  }, [resolver]);
  return health;
}
```
As a bonus this also removes the import chain `useTerminologyHealth → useSettings → loadSettings`, cutting a coupling point between the sidebar and settings loading.

### WR-03: `useResolvedResource` forces a redundant render on every resource change

**File:** `src/hooks/useResolvedResource.ts:27-36`
**Issue:** `useState<T | undefined>(resource)` initializes `resolved` to the first `resource` prop. The effect then calls `setResolved(resource)` again on every run, which schedules a re-render to the same value React-comparison-wise (same reference) — React will bail out, so this is not a correctness bug, but the subsequent `resolver.resolveResource(resource)` promise resolves to a *new* object (deep clone) and triggers a real second render. That's intended for progressive enhancement. However, when `resource` changes between parents (e.g., navigating to a new detail page), the state still holds the *previous* resolved reference until the effect runs, creating a one-frame window where `resolved` is stale. Currently `resolved ?? resource` in the callers (HumanReadableView:26, ClinicalRawView:28) masks this with a fallback, but the fallback never triggers because `resolved` is always defined after the first render. The net effect: stale resource flashes briefly on navigation.

**Fix:** Drive `resolved` purely from the effect, or reset it synchronously when the resource identity changes:
```ts
export function useResolvedResource<T extends Resource>(resource: T | undefined): T | undefined {
  const resolver = useTerminology();
  const [resolved, setResolved] = useState<T | undefined>(resource);

  useEffect(() => {
    if (!resource) { setResolved(undefined); return; }
    setResolved(resource);              // reset to raw immediately on input change
    let cancelled = false;
    resolver.resolveResource(resource)
      .then((next) => { if (!cancelled) setResolved(next as T); })
      .catch(() => { /* silent per D-07 */ });
    return () => { cancelled = true; };
  }, [resource, resolver]);

  // Guard against stale state when resource reference changed this render:
  return resolved === resource || (resolved && resource && isSameResource(resolved, resource))
    ? resolved
    : resource;
}
```
Simpler alternative: use `useLayoutEffect` to reset `resolved` synchronously, or do the reset in a render-phase derivation (`useMemo(() => ..., [resource])`). The stale-flash is minor but worth a low-priority fix.

### WR-04: `TerminologyResolver.resolveResource` double-walks and deep-clones unnecessarily

**File:** `src/terminology/TerminologyResolver.ts:97-108`
**Issue:** The method walks the resource, resolves each coding in parallel (producing resolved `Coding` objects whose results are discarded), then deep-clones the resource via `JSON.parse(JSON.stringify(resource))` and walks it *again*, reading from the cache to populate `display`. This has two minor correctness implications beyond the obvious inefficiency:

1. `JSON.parse(JSON.stringify(resource))` silently drops `undefined` fields and can misbehave on `Date` instances or typed arrays. FHIR resources don't contain those in practice, but the pattern is brittle.
2. Between the first-pass `Promise.all` and the second-pass cache read, any other caller could have called `cache.clear()` (e.g., user clicks "Clear terminology cache" on SettingsPage). The first-pass results are then lost and the clone sees an empty cache — result: the resource renders unenriched even though the lookups succeeded.

**Fix:** Use the resolved codings directly or structure-clone and patch in place using the first-pass results map:
```ts
async resolveResource<T extends Resource>(resource: T): Promise<T> {
  const codings = collectCodings(resource);
  const displays = await Promise.all(
    codings.map(async (c) => {
      if (c.display || !c.system || !c.code) return null;
      return this.lookupDisplay(c.system, c.code);
    }),
  );
  const clone = structuredClone(resource);
  const cloneCodings = collectCodings(clone);
  for (let i = 0; i < cloneCodings.length; i++) {
    const d = displays[i];
    if (d && !cloneCodings[i].display) cloneCodings[i].display = d;
  }
  return clone;
}
```
`structuredClone` is available in all modern browsers (and Node 17+), handles `undefined`/Date/Map correctly, and is faster than JSON round-tripping. Relying on first-pass results also eliminates the cache-clear race.

## Info

### IN-01: `walker.ts` does not stop descending into Coding scalar fields

**File:** `src/terminology/walker.ts:29-31`
**Issue:** After identifying a Coding (both `system` and `code` are strings), the walker still iterates `Object.keys(v)` and recurses into every key. The recursion into `system` / `code` / `display` / `version` string values is wasted work (they bail out at the `typeof !== 'object'` check), but the recursion into `userSelected` (boolean) and the like is also wasted. On a large Bundle with thousands of Codings this adds up. The inline comment already explains why keys aren't pre-skipped by name — a defensible choice — but a minor optimization is to iterate only object-typed values:
```ts
for (const key of Object.keys(v)) {
  const child = v[key];
  if (child && typeof child === 'object') collectCodings(child, out);
}
```
Not a bug. Marked Info because Phase 4 is explicitly out-of-scope for performance.

### IN-02: Non-persistent resolver options `serverUrl` fallback string is leaky

**File:** `src/terminology/TerminologyResolver.ts:63`
**Issue:** `this.serverUrl = opts.serverUrl ?? '__unconfigured__'` and the same sentinel is hardcoded in `src/contexts/TerminologyContext.tsx:40`. The sentinel is used as a localStorage key prefix — if two unconfigured resolvers ever coexist with different intent (e.g., tests, dev hot reload) they'd share a namespace. Consider defining it as an exported constant so both sites reference the same value:
```ts
// src/terminology/terminologyKey.ts
export const UNCONFIGURED_SERVER = '__unconfigured__';
```
Duplication risk only, no active bug.

### IN-03: `extractDisplay` should guard against malformed Parameters more defensively

**File:** `src/terminology/TerminologyResolver.ts:23-34`
**Issue:** The function checks `params.resourceType !== 'Parameters'` but then assumes `p.part` elements have well-formed `valueCode`/`valueString`. A terminology server returning a `designation` with only `value` (no `language` part) would give `l === undefined`, which is fine; but a `part` with neither `valueCode` nor `valueString` is silently ignored — correct behavior but worth a comment. More importantly, if `params.parameter` is not an array (malformed upstream), the optional-chain handles it. Consider adding:
```ts
if (params.parameter && !Array.isArray(params.parameter)) return null;
```
as a belt-and-braces guard. Minor.

### IN-04: `resolved-resource.test.tsx` mutates ref during render

**File:** `src/__tests__/resolved-resource.test.tsx:34`
**Issue:** `captured.current = resolved` is assigned during the render phase of `ConditionProbe`. React's concurrent mode (React 18) can run renders speculatively and discard results, which would leave `captured.current` pointing at an aborted render's value. In tests this happens not to matter because legacy rendering is used, but the pattern is an anti-pattern and the ESLint plugin for React may flag it. Consider capturing via a `useEffect`:
```tsx
useEffect(() => { captured.current = resolved; }, [resolved]);
```

### IN-05: `settings.yaml` YAML comment leaks a plausible-looking credential shape

**File:** `public/settings.yaml:7`
**Issue:** The commented-out example token `# token: "eyJ..."` is obviously a placeholder but future copy-paste users may replace it in the same checked-in file. Consider moving real/example credentials out of version control entirely (gitignore `settings.local.yaml` or similar) and have `settings.yaml` reference defaults only. Not a bug — the value is demonstrably fake — but the project is local-first and users will populate this file in place.

---

_Reviewed: 2026-04-12_
_Reviewer: Claude (gsd-code-reviewer)_
_Depth: standard_
