---
phase: 31-ux-01-external-validator-cascade
reviewed: 2026-04-23T00:00:00Z
depth: standard
files_reviewed: 17
files_reviewed_list:
  - src/quality/phiGate.ts
  - src/quality/normalizers.ts
  - src/quality/cascadingValidator.ts
  - src/quality/types.ts
  - src/quality/remoteValidator.ts
  - src/quality/structuralValidator.ts
  - src/quality/__tests__/phiGate.test.ts
  - src/quality/__tests__/normalizers.test.ts
  - src/quality/__tests__/cascadingValidator.test.ts
  - src/quality/__tests__/fixtures/normalizers/hapi-required-binding.json
  - src/quality/__tests__/fixtures/normalizers/firely-preferred-binding.json
  - src/quality/__tests__/fixtures/normalizers/ig-publisher-slice-fail.json
  - src/config/types.ts
  - src/config/settings.ts
  - public/settings.yaml
  - src/hooks/useConformanceRun.ts
  - src/components/quality/ValidationPanel.tsx
findings:
  critical: 1
  warning: 3
  info: 4
  total: 8
status: issues_found
---

# Phase 31: Code Review Report

**Reviewed:** 2026-04-23
**Depth:** standard
**Files Reviewed:** 17
**Status:** issues_found

## Summary

Phase 31 UX-01 introduces a three-tier cascading FHIR validator (external → server → local) with a PHI-acknowledgement gate, probe-cache demotion, AbortController plumbing, and a variant-detection heuristic. The module boundaries are clean, the contracts are heavily commented, and the test suite is comprehensive (including regression locks for D-09 and a known-limitation lock for D-18). Documentation-to-code alignment is excellent.

However, the review identifies **one Critical bug that prevents the Tier-1 external validator from ever running in production**: the PHI acknowledgement UI is keyed against `settings.validation.validatorUrl` (the server-tier URL), while `cascadingValidator.tryExternal` gates on `settings.validation.externalValidator.url`. The two URLs are distinct, so the acknowledgement the user grants never satisfies the gate the external tier reads. In addition, the hook-level AbortController cleanup captures the controller at mount time and does not honor the D-20 "unmount aborts in-flight fetches" contract after the first run re-creates the controller.

Lesser findings include an empty-dep cleanup that clobbers a freshly-created probe cache on mount, a `cancel()` path that does not abort the in-flight external fetch, and a few information-level items.

## Critical Issues

### CR-01: PHI acknowledgement is keyed against the wrong validator URL — external tier is un-reachable from the UI

**Files:**
- `src/components/quality/ValidationPanel.tsx:101-108, 249, 284, 301`
- `src/quality/cascadingValidator.ts:132`
- `src/quality/phiGate.ts:21-23`

**Issue:**
`ValidationPanel` computes the PHI ack key from the **server-tier** validator URL:

```ts
const validatorUrl = settings?.validation?.validatorUrl;          // server tier
const phiAckKeyStr = useMemo(
  () => phiAckKey(serverUrl, validatorUrl ?? null),
  [serverUrl, validatorUrl],
);
const [phiAcknowledged, setPhiAcknowledged] = useLocalStorage<boolean>({
  key: phiAckKeyStr,
  defaultValue: false,
});
```

The PHI banner is also gated on `hasRemote` (which is driven by `validatorUrl`, not `externalValidator.url` — see `validationBackends.ts:38-40`). When the user clicks "I acknowledge", the value is written under `...phiAcknowledged.v1:{serverUrl}|{validatorUrl}`.

Meanwhile `cascadingValidator.tryExternal` reads the gate with `ext.url` (the **external-tier** URL):

```ts
// cascadingValidator.ts:132
if (!isPhiAcknowledged(opts.serverUrl, ext.url)) {
  return null;
}
```

`phiAckKey` formats the key from the URL passed in (`phiGate.ts:22`), so the key the cascade looks up is `...phiAcknowledged.v1:{serverUrl}|{externalValidator.url}`. When the two URLs differ (and they are semantically different settings keys — server-tier `$validate` endpoint vs. external cascading validator), the cascade never finds an acknowledgement and the external tier is silently skipped on every run.

Concretely this breaks two of the most likely deployment topologies:

1. **External-only configured (common UX-01 demo)**: user sets only `validation.externalValidator.url`. `hasRemote` is `false` → no PHI banner is shown → user has no way to acknowledge. Gate returns false → external tier never runs, cascade always falls through to server/local. Phase 31 is effectively disabled.
2. **Both configured**: user sees the banner (driven by `hasRemote`), acknowledges, but the acknowledgement lands at the server-tier key. Gate on `ext.url` still returns false → external tier still never runs.

This contradicts D-09 ("PHI gate re-evaluated before every outbound fetch") — the gate is correctly placed, but the two sides (UI write, cascade read) do not share a key.

Test Test 1 in `cascadingValidator.test.ts:77` sets localStorage under `phiAckKey(SERVER_URL, EXT_URL)` directly, bypassing `ValidationPanel` — the bug is invisible to unit tests because they seed the correct key manually. An end-to-end wire-up test would have caught this.

**Fix:**
Key the UI ack against the external-tier URL (and, when feasible, show the banner whenever an external validator is *or* a server validator is configured):

```ts
// ValidationPanel.tsx
const extValidatorUrl = settings?.validation?.externalValidator?.enabled
  ? settings?.validation?.externalValidator?.url
  : null;
const serverValidatorUrl = settings?.validation?.validatorUrl ?? null;

// Key against whichever tier will actually fire outbound. If both are set,
// the external tier is tried first, so gate on ext url.
const phiKeyUrl = extValidatorUrl ?? serverValidatorUrl;
const phiAckKeyStr = useMemo(
  () => phiAckKey(serverUrl, phiKeyUrl),
  [serverUrl, phiKeyUrl],
);

// Banner should appear when EITHER tier will POST PHI outbound.
const requiresPhiAck =
  (hasRemote || !!extValidatorUrl) && !phiAcknowledged;
```

Additionally, the server-tier call in `cascadingValidator.tryServer` is NOT currently PHI-gated (only `tryExternal` is). If the server tier is reachable in a deployment where PHI outflow is regulated, the gate must cover both. The simplest version of that fix: gate on "any outbound URL" — compute the URL that will actually be used and check `isPhiAcknowledged(serverUrl, thatUrl)` in `tryServer` as well, with the UI and cascade agreeing on the same key.

Add an integration test that drives the PHI banner in `ValidationPanel`, clicks acknowledge, and verifies that a subsequent cascade run actually issues the external fetch (vs. the current unit tests that pre-seed localStorage).

## Warnings

### WR-01: Unmount abort captures the mount-time AbortController — subsequent runs leak on unmount

**File:** `src/hooks/useConformanceRun.ts:349-355`
**Issue:**
The unmount-safety `useEffect` captures `abortRef.current` at mount:

```ts
useEffect(() => {
  const controller = abortRef.current;
  return () => {
    cancelledRef.current = true;
    controller.abort();       // closes over the mount-time controller
  };
}, []);
```

But `start()` at line 158 replaces the ref on every run:

```ts
abortRef.current = new AbortController();
```

After the first run, the closed-over `controller` refers to the **original** controller (already-abortable, but no fetch is attached). When the user unmounts mid-second-run, `controller.abort()` fires on the stale controller, not the current in-flight one. The D-20 contract claims unmount aborts in-flight external AND server fetches; this is only true for the first run.

Also note the effect returns cleanup against a ref — React warns against this pattern because the ref value at cleanup time is not guaranteed to match the ref value at effect-setup time. The idiomatic fix reads the ref inside the cleanup, not the captured value.

**Fix:**
Read the ref inside the cleanup so the abort always fires against whatever controller is currently active:

```ts
useEffect(() => {
  return () => {
    cancelledRef.current = true;
    abortRef.current.abort();
  };
}, []);
```

Add a regression test mirroring `useSampleWalker.test.tsx:197-243`: start a run, then start a second run, unmount mid-second-run, assert the second controller's signal fires `aborted`.

### WR-02: `cancel()` does not abort in-flight fetches — Cancel button leaves up to 15 s of network traffic pending

**File:** `src/hooks/useConformanceRun.ts:344-346`
**Issue:**
```ts
const cancel = useCallback(() => {
  cancelledRef.current = true;
}, []);
```

Cancel only flips the batch-loop guard. The currently running external fetch (with its 15 s default timeout) will continue to completion — POSTing full resource bodies (including PHI) to the external validator even though the user explicitly asked to stop. This is a privacy-relevant UX gap for a data-quality tool whose threat model is PHI outflow.

Related: the `tryExternal` catch arm at `cascadingValidator.ts:168-171` distinguishes caller-abort from timeout by checking `opts.abort.signal.aborted`. If `cancel()` calls `abortRef.current.abort()`, the current fetch's signal chain will propagate via the `chainListener` (line 141), the fetch rejects with AbortError, and the catch arm re-throws — which `useConformanceRun`'s outer try/catch turns into status `error` (not `cancelled`). The cancel flow should either:
(a) Set `cancelledRef.current = true` then call `abortRef.current.abort()` AND update the outer try/catch to check `cancelledRef.current` in the catch arm, treating AbortError-after-cancel as `cancelled` (not `error`).
(b) Introduce a second AbortController for caller-cancel (distinct from unmount-abort) so the two are separable.

**Fix (option a):**
```ts
const cancel = useCallback(() => {
  cancelledRef.current = true;
  abortRef.current.abort();
}, []);

// in start(), outer catch:
} catch (err) {
  if (cancelledRef.current) {
    setStatus('cancelled');
    return;
  }
  setStatus('error');
  setErrorMessage(err instanceof Error ? err.message : String(err));
}
```

### WR-03: Probe-cache reset effect wipes a freshly-created empty cache on every mount

**File:** `src/hooks/useConformanceRun.ts:128-135`
**Issue:**
```ts
const extSerialized = JSON.stringify(settings?.validation?.externalValidator ?? null);
useEffect(() => {
  clearProbeCache(probeCacheRef.current);
  setActiveStrategy(null);
  setActiveStrategyVariant(null);
}, [extSerialized]);
```

The effect runs on mount (React's behavior for effects with a populated dep value) and clears a Map that was just created empty on the previous line (`new Map()`). Harmless today but:
1. It fires two extra `setState` calls on mount that can cause a render-loop if a parent conditionally renders this hook mid-settings-load.
2. If future work introduces a persistence layer for the probe cache (plausible — a per-session cache is today's design but a per-server cache is a natural extension), this effect will clobber the hydrated state on mount.

**Fix:**
Skip the first run with a mount guard:

```ts
const didMountRef = useRef(false);
useEffect(() => {
  if (!didMountRef.current) {
    didMountRef.current = true;
    return;
  }
  clearProbeCache(probeCacheRef.current);
  setActiveStrategy(null);
  setActiveStrategyVariant(null);
}, [extSerialized]);
```

## Info

### IN-01: `res.json()` throwing after 200 OK silently demotes without a notify

**File:** `src/quality/cascadingValidator.ts:158-160, 178-180`
**Issue:**
If the external validator returns HTTP 200 with a body that isn't valid JSON (misconfigured reverse proxy, HTML error page at 200, truncated response), `res.json()` throws a `SyntaxError`. That lands in the final generic catch arm (line 179) and fires `notify('demote', ...)` — which is silent per `useConformanceRun.ts:273-275`. The user sees no explanation of why the external tier didn't fire; they only see "server" in the status line.

This is arguably correct (the underlying error is opaque) but worth a comment acknowledging it, and the `notify` call could include an optional `reason` field the UI can render on hover of the status line.

**Fix:**
Add a comment at line 160 noting that invalid-JSON-at-200 falls into the demote path, OR extend the notify payload:
```ts
opts.notify?.('demote', { from: 'external', to: 'server', reason: String(err) });
```

### IN-02: `phiAckKey` key-scope test does not cover the null-external collision case

**File:** `src/quality/__tests__/phiGate.test.ts:43-46`
**Issue:**
Test 6 covers the `|` separator between server and external, but not the `'none'` literal. `phiAckKey('http://a|none', null)` and `phiAckKey('http://a', 'none')` both render to `...http://a|none|none` and `...http://a|none` respectively — they differ, but it is NOT obvious from the current test. Users with a malformed `serverUrl` that already contains the literal string `|none` could collide unexpectedly with the fresh-server-no-external case.

**Fix:**
Add an assertion:
```ts
it('Test 6b: null external does not collide with literal "none"', () => {
  expect(phiAckKey('http://a|none', null)).not.toBe(phiAckKey('http://a', 'none'));
});
```

### IN-03: D-18 heuristic order of checks — `firely` substring can appear in tenant paths

**File:** `src/quality/cascadingValidator.ts:103-122`
**Issue:**
The `lower.includes('firely')` check on line 114 is order-dependent: if a HAPI instance is deployed at `https://firely-mirror.example/hapi-fhir-jpaserver/`, the `/hapi-fhir-jpaserver/` pattern on line 113 wins (correct). But `https://firely.example/hapi-fhir-jpaserver/` also contains both — HAPI wins, still correct. The risk case: `https://firely-test.fhir.org/baseR4` — `.fhir.org` wins, labels as HAPI, which is the documented W-3 known limitation. Fine.

But `https://ig-publisher.firely.com/...` would match `/ig-publisher` in the IG-Publisher branch only if the check order is reversed. Current order: HAPI → Firely → IG-Publisher. `.firely.com` + no `/ig-publisher/` ⇒ Firely. Correct by the spec but subtle.

**Fix:**
Add a short comment describing the precedence order and why HAPI must come first (`.fhir.org` is the broadest pattern and should not be stolen by a tenant-path match).

### IN-04: `detectValidatorVariant` URL parsing failure path uses empty host silently

**File:** `src/quality/cascadingValidator.ts:107-113`
**Issue:**
```ts
try {
  host = new URL(url).host.toLowerCase();
} catch {
  host = '';
}
```

When `url` is malformed (say `http://` with no host), `host` falls through as empty. The `host.endsWith('.fhir.org')` check on line 113 returns false for empty string, which is correct. But the `lower.includes(...)` branches at lines 113-120 still run against the raw `url` string. A user who pastes a malformed URL will get a non-null variant purely from the raw substring match — e.g., `detectValidatorVariant('not-a-url-but-mentions-firely')` returns `'Firely'`.

**Fix:**
Fall through to `null` when `new URL()` throws, so a malformed URL always yields `null` (prompting the user to fix the setting):

```ts
let host = '';
try {
  host = new URL(url).host.toLowerCase();
} catch {
  return null;
}
```

---

_Reviewed: 2026-04-23_
_Reviewer: Claude (gsd-code-reviewer)_
_Depth: standard_
