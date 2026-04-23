---
phase: 31-ux-01-external-validator-cascade
reviewed: 2026-04-23T00:00:00Z
depth: standard
files_reviewed: 2
files_reviewed_list:
  - src/components/quality/ValidationPanel.tsx
  - src/components/quality/__tests__/ValidationPanel.phi-gate.integration.test.tsx
findings:
  critical: 0
  warning: 3
  info: 5
  total: 8
status: issues_found
---

# Phase 31: Code Review Report (post 31-02 gap closure)

**Reviewed:** 2026-04-23
**Depth:** standard
**Files Reviewed:** 2 (gap-closure scope) — full Phase-31 surface still tracked via prior open findings
**Status:** issues_found (carry-over warnings/info from initial review remain open)

## Summary

Phase 31-02 closes the Critical CR-01 defect from the initial review: ValidationPanel now derives the PHI ack key from the URL the cascade actually reads. Specifically, `phiGateUrl` resolves to `externalValidator.url` when the external tier is enabled and falls back to `validation.validatorUrl` only when the external tier is absent or disabled. The PHI banner trigger has been broadened from `hasRemote && !phiAcknowledged` to `(hasRemote || hasExternal) && !phiAcknowledged`, so external-only deployments (the most-likely UX-01 demo topology) now correctly surface the gate. The displayed Validator URL string is also updated to render `phiGateUrl`.

A new integration test (`ValidationPanel.phi-gate.integration.test.tsx`, 272 lines, three cases) exercises the wire-up end-to-end: external-only, both-tiers-with-differing-URLs, and server-only. The test renders the real panel, clicks the acknowledge button, and asserts both the localStorage key and that fetch is dispatched against the external URL. This is the regression lock the original CR-01 explicitly called for ("an end-to-end wire-up test would have caught this").

**CR-01 is resolved.** No new Critical issues are introduced by 31-02.

The remaining open findings from the original 31-REVIEW.md (WR-01, WR-02, WR-03, IN-01..IN-04) were intentionally deferred per the 31-02 SUMMARY and remain open — none of the underlying files (`useConformanceRun.ts`, `cascadingValidator.ts`, `phiGate.ts`, `phiGate.test.ts`) were modified in this gap closure. They are preserved verbatim below for traceability.

A small number of new minor findings are recorded against the 31-02 changes themselves (banner-dismissal scope interaction, `phiGateUrl` whitespace handling consistency, unused `mockPost` in the new integration test, and a strengthen-the-regression-lock suggestion).

## Resolved (carried over from 31-REVIEW.md @ f109d83)

### CR-01 (RESOLVED in 31-02): PHI acknowledgement is now keyed against the cascade-read URL

**Files:** `src/components/quality/ValidationPanel.tsx:84-99, 103-123, 264-269, 304, 314`

**Resolution:** `ValidationPanel` now computes `phiGateUrl` (lines 94-99) as `externalValidator.url` when enabled, else `validatorUrl ?? null`. Both `bannerKey` (line 104) and `phiAckKeyStr` (line 117) are derived from `phiGateUrl`, matching the key `cascadingValidator.tryExternal` reads via `isPhiAcknowledged(serverUrl, ext.url)`. The banner-trigger predicate `requiresPhiAck` (line 269) now fires for external-only deployments via the added `hasExternal` clause. Validator URL display in the banner body (line 314) reads `phiGateUrl ?? ''`.

The new integration test `ValidationPanel.phi-gate.integration.test.tsx` covers the three relevant topologies (external-only, both, server-only) and asserts:
1. Banner renders with the correct URL.
2. Acknowledgement lands at the same key the cascade reads (`phiAckKey(SERVER_URL, EXT_URL)` for external-tier; `phiAckKey(SERVER_URL, SERVER_VAL_URL)` for server-only).
3. For Test A and Test B, `fetch` is actually dispatched against the external URL after acknowledgement — proving the UI/cascade wire-up.

The unit-suite-blind-spot called out in the original CR-01 is closed. Note that the auxiliary suggestion in the original CR-01 fix — extending PHI gating to `tryServer` so the server tier is also gated — remains unaddressed in 31-02 and is NOT re-raised here because (a) the original CR-01 framed it as an additional consideration rather than a defect, and (b) the 31-02 SUMMARY does not claim to address it. If that broadening is desired, it should be filed as a separate phase.

## Warnings

### WR-01 (OPEN, carried from f109d83): Unmount abort captures the mount-time AbortController — subsequent runs leak on unmount

**File:** `src/hooks/useConformanceRun.ts:349-355` (file unchanged in 31-02)

**Issue:** The unmount-safety `useEffect` captures `abortRef.current` at mount; `start()` replaces the ref on every run, so subsequent runs leak on unmount.

**Fix:** Read the ref inside the cleanup so the abort always fires against whatever controller is currently active.

```ts
useEffect(() => {
  return () => {
    cancelledRef.current = true;
    abortRef.current.abort();
  };
}, []);
```

(See original 31-REVIEW.md @ f109d83 §WR-01 for full rationale and suggested regression test.)

### WR-02 (OPEN, carried from f109d83): `cancel()` does not abort in-flight fetches

**File:** `src/hooks/useConformanceRun.ts:344-346` (file unchanged in 31-02)

**Issue:** `cancel()` only flips the batch-loop guard. The currently running external fetch (with its 15 s default timeout) continues to completion — POSTing PHI to the external validator even though the user explicitly asked to stop.

**Fix (option a):** Add `abortRef.current.abort()` to `cancel()` and update the outer try/catch in `start()` to translate AbortError-after-cancel into status `cancelled` (not `error`). See original 31-REVIEW.md §WR-02 for the full snippet.

### WR-03 (OPEN, carried from f109d83): Probe-cache reset effect wipes a freshly-created empty cache on every mount

**File:** `src/hooks/useConformanceRun.ts:128-135` (file unchanged in 31-02)

**Issue:** The effect runs on mount and clears a Map that was just created empty. Harmless today; bites once probe-cache persistence is added.

**Fix:** Skip the first run with a `didMountRef` mount guard (see original 31-REVIEW.md §WR-03).

## Info

### IN-01 (OPEN, carried from f109d83): `res.json()` throwing after 200 OK silently demotes without a notify reason

**File:** `src/quality/cascadingValidator.ts:158-160, 178-180` (file unchanged in 31-02)

**Fix:** Add a comment acknowledging the case OR extend `notify('demote', { from, to, reason })` so the UI can surface why the external tier was skipped.

### IN-02 (OPEN, carried from f109d83): `phiAckKey` key-scope test does not cover the null-external collision case

**File:** `src/quality/__tests__/phiGate.test.ts:43-46` (file unchanged in 31-02)

**Fix:** Add an assertion verifying `phiAckKey('http://a|none', null)` is not equal to `phiAckKey('http://a', 'none')`.

### IN-03 (OPEN, carried from f109d83): D-18 heuristic order of checks — comment the precedence

**File:** `src/quality/cascadingValidator.ts:103-122` (file unchanged in 31-02)

**Fix:** Add a comment documenting why HAPI must come first in the `detectValidatorVariant` precedence chain.

### IN-04 (OPEN, carried from f109d83): `detectValidatorVariant` URL parsing failure path uses empty host silently

**File:** `src/quality/cascadingValidator.ts:107-113` (file unchanged in 31-02)

**Fix:** Return `null` from the `new URL()` catch arm rather than falling through with an empty host, so a malformed URL always yields `null`.

### IN-05 (NEW in 31-02): `phiGateUrl` does not trim the external-tier URL even though `hasExternal` does

**File:** `src/components/quality/ValidationPanel.tsx:94-99, 265-268`

**Issue:** `hasExternal` (line 265) defends against whitespace-only `externalValidator.url` values via `.trim().length > 0`. `phiGateUrl` (line 94-99) does not — it accepts any truthy `externalValidator.url` and uses it verbatim as the gate key. The two predicates can therefore disagree for a settings.yaml entry like `url: "  "`:

- `hasExternal` → false (so `requiresPhiAck` falls through to the `hasRemote`-only branch).
- `phiGateUrl` → `"  "` (so `phiAckKeyStr` = `phiAckKey(serverUrl, "  ")`).

The cascade also reads `ext.url` directly with no trim, so today the two sides accidentally agree — the cascade also won't fire because of the same whitespace value. This is therefore not a correctness bug, only a robustness/consistency smell. If a future change adds trimming to `cascadingValidator.tryExternal` it should also apply to `phiGateUrl`, and the two should ideally derive from a single helper.

**Fix:** Either trim once and reuse, or document that whitespace-only URLs are out of scope and validated upstream:

```ts
const trimmedExtUrl = externalValidator?.url?.trim() ?? '';
const phiGateUrl = useMemo<string | null>(() => {
  if (externalValidator?.enabled && trimmedExtUrl) {
    return trimmedExtUrl;
  }
  return validatorUrl ?? null;
}, [externalValidator?.enabled, trimmedExtUrl, validatorUrl]);

const hasExternal = !!externalValidator?.enabled && trimmedExtUrl.length > 0;
```

### IN-06 (NEW in 31-02): Banner-dismissal key now changes when external tier is toggled, re-showing a previously-dismissed banner

**File:** `src/components/quality/ValidationPanel.tsx:103-110`

**Issue:** `bannerKey` is now derived from `phiGateUrl`. A user who dismisses the Blaze-`$validate`-unsupported info banner with only `validation.validatorUrl` set, then later sets `externalValidator.enabled = true` with a different external URL, will see the dismissed banner re-appear because the key changes. This is documented in the new comment at line 101-102 ("a user who changes either their external or server validator URL sees the warning again") and is arguably correct behavior — but the banner content is about Blaze `$validate` server support, not about which validator URL is configured, so re-showing it on validator-URL change is a stretch. The dismissal scope was already per `(serverUrl, validatorUrl)` pre-31-02, so this is an extension of an existing pattern rather than a regression.

**Fix (optional):** Scope `bannerKey` to `serverUrl` only, since the banner copy is about server capability not validator choice:

```ts
const bannerKey = useMemo(
  () => `${BANNER_KEY_PREFIX}:${serverUrl}`,
  [serverUrl],
);
```

Defer if the per-(server, validator) scope is intentional.

### IN-07 (NEW in 31-02): Integration test declares `mockPost` and never asserts against it

**File:** `src/components/quality/__tests__/ValidationPanel.phi-gate.integration.test.tsx:85, 148-150`

**Issue:** `mockPost` is wired into `mockClient.post` but never asserted against in any of the three cases. It exists as a defensive default in case a code path inside `useConformanceRun` calls `client.post()` rather than `fetch`, but its presence implies an assertion that isn't there. This is a low-cost cleanup: either add an assertion ("client.post was NOT called for the external tier") to lock the contract that the cascade goes through `fetch`, or drop the mock and let the test fail loudly if the implementation changes.

**Fix:** Add an assertion that `mockPost` was not invoked during the external-tier path, OR remove the unused mock. Prefer the assertion (it locks an invariant the original CR-01 implicitly relied on):

```ts
expect(mockPost).not.toHaveBeenCalled();
```

### IN-08 (NEW in 31-02): Tests would benefit from an explicit pre-click "ack key not yet set" assertion

**File:** `src/components/quality/__tests__/ValidationPanel.phi-gate.integration.test.tsx:181-188, 225-235, 263-270`

**Issue:** `beforeEach` clears localStorage — correct — and the tests assert the post-click value of the ack key. But none of them assert the key is `null` BEFORE the click. A future refactor that defaulted the `useLocalStorage` hook to `true` would make these tests pass for the wrong reason (banner click would be a no-op and the cascade would still fire because the gate already returned true). A pre-click assertion strengthens the regression lock.

The existing `screen.findByText(/PHI will be sent/i)` already implies the banner was shown (which only happens when not-yet-acknowledged), so the regression coverage exists indirectly. This is therefore a "make the lock airtight" suggestion, not a defect.

**Fix:**
```ts
expect(window.localStorage.getItem(phiAckKey(SERVER_URL, EXT_URL))).toBeNull();
fireEvent.click(ackButton);
await waitFor(() => {
  expect(window.localStorage.getItem(phiAckKey(SERVER_URL, EXT_URL))).toBe('true');
});
```

---

_Reviewed: 2026-04-23_
_Reviewer: Claude (gsd-code-reviewer)_
_Depth: standard_
_Scope: 31-02 gap closure (ValidationPanel.tsx, ValidationPanel.phi-gate.integration.test.tsx)_
_Carry-over: 7 open findings (WR-01..03, IN-01..04) preserved from 31-REVIEW.md @ f109d83 — underlying files unchanged in 31-02_
