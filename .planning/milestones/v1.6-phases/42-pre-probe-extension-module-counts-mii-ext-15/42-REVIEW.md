---
phase: 42-pre-probe-extension-module-counts-mii-ext-15
reviewed: 2026-04-29T20:06:31Z
depth: standard
files_reviewed: 4
files_reviewed_list:
  - src/hooks/useMiiExtensionCounts.tsx
  - src/hooks/__tests__/useMiiExtensionCounts.test.tsx
  - src/components/patients/MiiModuleTabs.tsx
  - src/components/patients/__tests__/MiiModuleTabs.test.tsx
findings:
  critical: 0
  warning: 3
  info: 6
  total: 9
status: issues_found
---

# Phase 42: Code Review Report

**Reviewed:** 2026-04-29T20:06:31Z
**Depth:** standard
**Files Reviewed:** 4
**Status:** issues_found

## Summary

Phase 42 introduces `useMiiExtensionCounts`, a hook that fans out
`_summary=count` GETs across MII extension modules and feeds the Phase-34
`EmptyExtensionsCoordinator`. The core data-flow is sound: the cancelled-flag
cleanup correctly gates stale `setState`, per-type `.catch(() => 0)` keeps a
single failure from blanking a whole module's total, and the
`reportEmptinessRef` indirection neatly avoids an infinite-loop trap from the
no-op coordinator fallback. The `setCounts((prev) => prev[mod.key] === cached
? prev : { ...prev, ... })` guard correctly prevents render loops on cache hits.

The findings below cluster around two themes:

1. **Hidden coupling between the cache lifetime and the parent's `key=
   {patientId}` re-mount.** The hook docs assert "cache lifetime = hook mount"
   and rely on `MiiModuleTabs.tsx:139` re-keying the provider on patient change
   to enforce that. Removing or moving the `key={patientId}` would silently
   leak previous patients' counts into a new patient's pills with zero
   compile-time signal. (WR-01)

2. **One test that does not exercise the path it claims** (cache short-circuit
   test 7 — when deps are unchanged, the effect never re-fires, so
   call-count parity is a tautology rather than a cache assertion). (WR-02)

3. **One UX edge case** when `?tab=<extension>` deep-link points at a
   currently-hidden empty extension: the pill is filtered out but the panel
   is still active, leaving an active panel with no active pill. (WR-03)

The remaining items are minor — narrow-cast `Bundle` without runtime shape
validation, `extensionModules` recreated each render driving an extra
`useEffect` run, regex assumptions about FHIR type names — all defensive or
cosmetic.

No critical bugs, security issues, or memory leaks were found. The cancelled-
flag pattern is correctly applied; per-type rejection is contained; mock
fidelity is generally good.

## Warnings

### WR-01: Cache-lifetime invariant relies on undocumented external coupling

**File:** `src/hooks/useMiiExtensionCounts.tsx:27-31`
**Issue:** The hook's docblock claims "Cache lifetime = hook mount; the
provider re-keys on `patientId` change … forcing the hook to remount and the
cache to die. No cross-patient leak." This is true *today*, but it is enforced
**only** by `MiiModuleTabs.tsx:139` (`<EmptyExtensionsProvider key={patientId}
…>`). Nothing in `useMiiExtensionCounts` itself prevents
`cacheRef.current.get(\`${patientId}:${mod.key}\`)` from returning a stale
value if a future caller mounts the hook outside that re-keyed subtree, or if
someone changes the parent to re-use the same provider instance across
patients. The cache key includes `patientId` so the lookup is *correct*, but
the cache is also *unbounded* — a long-lived hook instance that sees N
patients would accumulate N × (extension count) entries with no eviction.

**Fix:** Add a defensive `patientId`-change reset inside the hook so the
invariant holds regardless of caller hierarchy. One small addition:

```ts
// Reset cache when patientId changes within the same hook instance.
const prevPatientIdRef = useRef(patientId);
useEffect(() => {
  if (prevPatientIdRef.current !== patientId) {
    cacheRef.current.clear();
    prevPatientIdRef.current = patientId;
  }
}, [patientId]);
```

Alternatively: keep the current behaviour but tighten the docblock to say
"hook mount lifetime, and only safe because the parent re-keys on patientId
— see MiiModuleTabs.tsx:139. Do not call this hook outside a re-keyed
EmptyExtensionsProvider." Either is acceptable; the silent leak hazard if
the parent contract changes is the real concern.

### WR-02: "Cache short-circuit" test does not actually exercise the cache

**File:** `src/hooks/__tests__/useMiiExtensionCounts.test.tsx:356-398`
**Issue:** The test asserts that re-rendering with the same `patientId` does
not issue extra `client.get` calls. It does this by comparing
`client.get.mock.calls.length` before and after `rerender({ id: 'p-cache' })`.
However, the hook's effect deps are `[client, patientId]` (line 128). Because
`mocks.client` is the same object reference and `patientId` is identical, the
effect **does not re-run at all** on rerender — so the call-count parity is a
tautology that proves nothing about the cache short-circuit branch on lines
79-89. A regression that broke the cache (e.g., removing the `cacheRef` lookup
entirely) would still pass this test.

**Fix:** Force the effect to re-run with same `patientId`. Two options:

```ts
// Option 1: pass a fresh client ref so the effect re-fires, then assert
// call-count parity. The cache-hit branch will run and short-circuit.
rerender({ id: 'p-cache' }); // doesn't fire effect
mocks.client = { ...mocks.client };  // new reference
rerender({ id: 'p-cache' }); // fires effect with same patientId → cache hit
// Now assert call-count parity.

// Option 2 (cleaner): test the observable contract with a patientId round-
// trip A → B → A. Returning to A must not re-fetch (cache hit on A's keys).
// This also surfaces the WR-01 cache-leak concern.
rerender({ id: 'p-other' });          // new fan-out
await waitFor(...);
const callsAtB = client.get.mock.calls.length;
rerender({ id: 'p-cache' });          // back to A → expect cache hit, no new calls
expect(client.get.mock.calls.length).toBe(callsAtB);
```

### WR-03: Deep-linked-to extension that is hidden leaves an "active panel, no active pill"

**File:** `src/components/patients/MiiModuleTabs.tsx:182-200, 318-322`
**Issue:** Two interacting decisions produce an inconsistent state:

1. Lines 198-200: `visibleExtensionModules` filters out empty extensions
   when `hideEmpty=true` — so the `Tabs.Tab` pill is removed from the DOM.
2. Lines 318-322: `Tabs.Panel` registrations always use the *unfiltered*
   `extensionModules` — so the panel is still registered for the parent
   `<Tabs>` to switch to.
3. Lines 182-190: the deep-link auto-expand `useEffect` opens the Collapse
   when `activeTab` matches an extension key, but does **not** unset
   `hideEmpty` or otherwise reveal the hidden pill.

Result: a user navigating to `?tab=onkologie` on a patient where Onkologie is
empty AND `hideEmpty=true` (carried over from a prior session via
localStorage) sees the Collapse open, the Onkologie *panel* render, but no
Onkologie pill in the secondary `Tabs.List`. The pill they would click to
*leave* the tab is also gone (they can still click any visible tab to switch
away, so it's not a trap, but the active-tab indicator has no anchor).

**Fix:** When the deep-link auto-expand fires for an extension that is
currently filtered out, also reveal it. The simplest version:

```ts
useEffect(() => {
  if (
    activeTab &&
    extensionModules.some((m) => m.key === activeTab) &&
    !extensionOpened
  ) {
    toggleExtension();
  }
  // NEW: if the deep-linked extension is currently filtered out by hideEmpty,
  // either (a) unhide for this session, or (b) include the active tab in the
  // visible set unconditionally. (b) is less surprising — keeps user prefs.
}, [activeTab, extensionModules, extensionOpened, toggleExtension]);
```

For (b), update the visibility filter so the active tab is always visible:

```ts
const visibleExtensionModules = hideEmpty
  ? extensionModules.filter(
      (m) => !emptyModuleKeys.includes(m.key) || m.key === activeTab,
    )
  : extensionModules;
```

## Info

### IN-01: `extensionModules` array recreated each render drives a re-running `useEffect`

**File:** `src/components/patients/MiiModuleTabs.tsx:151, 182-190`
**Issue:** `extensionModules = MII_MODULES.filter(...)` produces a new array
identity on every render. Listed as a dep on the deep-link `useEffect` (line
190), this causes the effect to re-evaluate every render. The body's
`!extensionOpened` guard prevents `toggleExtension()` from running more than
once, so this is harmless — but it is unnecessary work.
**Fix:** Memoize, or drop from deps (the partition is module-scoped and
constant for the component lifetime):

```ts
const extensionModules = useMemo(
  () => MII_MODULES.filter((m) => m.category === 'extension'),
  [],
);
const baseModules = useMemo(
  () => MII_MODULES.filter((m) => m.category === 'base'),
  [],
);
```

### IN-02: `Bundle` cast on parsed response has no runtime shape validation

**File:** `src/hooks/useMiiExtensionCounts.tsx:103-105`
**Issue:** `const bundle: Bundle = typeof raw === 'string' ? JSON.parse(raw)
: raw;` — if the FHIR server returns an unexpected shape (e.g., an
OperationOutcome or a non-Bundle object), `bundle.total ?? 0` evaluates to 0,
which is then summed and reported as "this module is empty". The
`.catch(() => 0)` only catches thrown errors / rejections, not "200 OK with
unexpected JSON". For Blaze with `_summary=count`, this is unlikely in
practice, but pre-probe-on-mount is exactly the surface where a misbehaving
server would silently mis-classify modules as empty (which then feeds the
Hide-N toggle).
**Fix:** Add a soft shape check:

```ts
.then((raw) => {
  const bundle = typeof raw === 'string' ? JSON.parse(raw) : raw;
  if (!bundle || bundle.resourceType !== 'Bundle' || typeof bundle.total !== 'number') {
    return 0;
  }
  return bundle.total;
})
```

### IN-03: Hanging-promise test creates a closure leak in the test environment

**File:** `src/components/patients/__tests__/MiiModuleTabs.test.tsx:253-279`
**Issue:** `vi.fn(() => new Promise<unknown>(() => {}))` is a never-resolving
promise. The hook's `.then()` callbacks remain pending forever, holding
references to `cancelled`, `cacheRef`, `setCounts`, and `reportEmptinessRef`
— per call. With 14 extension modules × N FHIR types each (≈ 30 fetches),
that's ≈ 30 long-lived closures. The `unmount()` call at line 278 sets
`cancelled = true` but does **not** resolve the promises, so GC can only
reclaim them after the entire test process exits. Not a real leak in
production code, but a test-fidelity / test-env hygiene smell.
**Fix:** Resolve the pending promises in cleanup, or scope them with a
deferred-resolver pattern that the test owns:

```ts
const resolvers: Array<(v: unknown) => void> = [];
mocks.client = {
  get: vi.fn(() => new Promise<unknown>((resolve) => resolvers.push(resolve))),
  fhirUrl: (s: string) => ({ toString: () => s }),
};
// ... assertions ...
unmount();
resolvers.forEach((r) => r({ resourceType: 'Bundle', total: 0, entry: [] }));
```

### IN-04: URL parsing regex assumes FHIR type names match `[A-Z][A-Za-z]+`

**File:** `src/components/patients/__tests__/MiiModuleTabs.test.tsx:87`
**Issue:** `url.match(/^([A-Z][A-Za-z]+)\?/)` parses the FHIR resource type
out of the test URL. Works for every type currently in `MII_MODULES`, but
would silently fall through to `type = ''` (and `total = 0`) for any future
type containing digits, hyphens, or starting with lowercase — silent test
failure (the assertion would still see "0" totals and could pass or fail
non-obviously). Same regex assumption is implicit in
`useMiiExtensionCounts.test.tsx:83` (`url.split('?')[0]`) but the split-based
form is more permissive.
**Fix:** Use `url.split('?')[0]` consistently across both test files:

```ts
const type = url.split('?')[0];
const total = perTypeCount[type] ?? 0;
```

### IN-05: Hook docblock cites mirroring of `PatientRelatedResources.tsx:37,57` line numbers

**File:** `src/hooks/useMiiExtensionCounts.tsx:22, 97`
**Issue:** Two docblock comments cite specific line numbers in
`PatientRelatedResources.tsx` (lines 37, 57, 43). These will rot the moment
that file is edited. Documentation drift, not a bug.
**Fix:** Cite the function/symbol name instead of line numbers:

```ts
// Cleanup primitive: cancelled-flag (Claude's discretion per CONTEXT.md +
// RESEARCH.md §Open Q2). Mirrors the cancelled-flag pattern used in
// PatientRelatedResources.tsx (`useEffect` body + cleanup return).
```

### IN-06: Cache-hit branch publishes emptiness even when value is unchanged from a prior identical publish

**File:** `src/hooks/useMiiExtensionCounts.tsx:84-87`
**Issue:** On a cache hit, the hook calls
`reportEmptinessRef.current(mod.key, cached === 0)` unconditionally. The
coordinator's `reportEmptiness` already de-dupes via
`if (prev[moduleKey] === isEmpty) return prev;`
(`useEmptyExtensionsCoordinator.tsx:106`), so this is *correct* and *safe*
— but it's a redundant call on every effect re-run with same patientId
(e.g., if `client` identity changes). Minor: skip publishing when the
`setCounts` updater also short-circuits.
**Fix:** Optional micro-optimisation; the current behaviour is correct and
the comment on line 80-83 explicitly justifies it ("Still publish to the
coordinator so the 'Hide N empty modules' toggle stays consistent across
re-renders"). Leave as-is unless you want to drop one redundant function
call per cache-hit per render.

---

_Reviewed: 2026-04-29T20:06:31Z_
_Reviewer: Claude (gsd-code-reviewer)_
_Depth: standard_
