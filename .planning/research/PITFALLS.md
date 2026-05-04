# Pitfalls Research — v1.5 Validation, Performance & MII Extensions

**Domain:** Additive refactor + extension of existing FHIR Exploder (React 18 + Mantine 8 + Medplum 5, 836 passing tests, live Blaze integration, Phase 30 design tokens locked)
**Researched:** 2026-04-23
**Confidence:** HIGH — all pitfalls grounded in concrete code inspected at file:line references in this repo. WebSearch not used; v1.4 PITFALLS.md acts as the baseline and each item below is either "still applies" or "new to v1.5".

**Scope note:** This file deliberately does NOT re-research known constraints (Mantine 8 tab re-render traps, `client.get(client.fhirUrl(path).toString())` Blaze pattern, closure-scoped cancellation, StrictMode idempotency). Those are KNOWNS per the milestone brief. Pitfalls below focus on what *goes wrong when extending the system with v1.5 scope*.

---

## Critical Pitfalls

### Pitfall 1: External validator cascade — AbortController not threaded through all three tiers, orphaned fetches after unmount or tab switch

**What goes wrong:**
`cascadingValidator.ts` (per the preserved 29-02-PLAN.md) allocates *two* AbortControllers: `timeoutController` for the external timeout, plus the caller-owned `opts.abort` from `useConformanceRun`. The plan correctly chains them (`opts.abort.signal.addEventListener('abort', chainListener)`), but the *server tier* (`createRemoteBackend().validate(resource)`) does NOT currently accept an abort signal — see `src/quality/remoteValidator.ts:51-78` (referenced from 29-02-PLAN lines 194-195). If the user unmounts the Validation panel mid-run (tab switch to `/quality?tab=counts`, or navigation to `/patients`), the cascade's external fetch aborts cleanly but the server tier fetch continues until Blaze responds, then tries to `setConformanceIssues(...)` on an unmounted component. React logs "Can't perform a state update on an unmounted component" and — worse — the stale result lands in the per-metric `useConformanceRun` state and is surfaced the next time the tab is mounted.

**Why it happens:**
The UX-01 plan was authored with the external tier as the focus; the server and local tiers are reused verbatim from existing code that was never written to be abortable. When the cascade adds *one* AbortController per resource, the probe-cache-hit path that short-circuits to `server` bypasses the timeout controller entirely — and the caller-owned `opts.abort` has no listener on the server tier fetch.

**Warning signs:**
- `grep -n "signal" src/quality/remoteValidator.ts` returns zero matches after Phase 31 ships
- Vitest suite flakes with "Warning: Can't perform a state update on an unmounted component" during `useConformanceRun.test.tsx`
- DevTools Network tab shows pending `POST .../$validate` requests after navigating away from `/quality`
- Repeated tab switching during a 1000-sample run causes the final issue count to be non-deterministic across runs

**Prevention strategy:**
1. Thread the `AbortSignal` into `remoteValidator.ts`: change `createRemoteBackend(validatorUrl, profileCanonical?)` to `createRemoteBackend(validatorUrl, profileCanonical?, signal?)` and pass through to the inner `fetch(url, { signal })`. Backward-compatible — existing call site at `validationBackends.ts` can pass `undefined`.
2. In `cascadingValidator.ts` `tryServer()`, pass `opts.abort.signal` into `createRemoteBackend`.
3. Add a cascadingValidator test: start `validateWithCascade`, call `opts.abort.abort()` WHILE the server tier is in flight (mock the server to hang 10s, abort at 100ms), assert the fetch signal was aborted (`vi.spyOn(global, 'fetch').mock.calls[0][1].signal.aborted === true`).
4. `useConformanceRun.ts` cleanup (line 231-235 per 29-02 task 5 notes): assert `abortRef.current.abort()` is called in the unmount return; Phase 24's `useAsyncRun` pattern already does this correctly — port verbatim.

**Phase mapping:** **Phase 31 (UX-01 external validator cascade)** — add as acceptance criterion on Task 4 of the preserved 29-02 plan. This is an amendment to an existing plan, not a new phase.

**Sources:** `src/quality/remoteValidator.ts` (referenced line 51-78 in 29-02-PLAN.md); v1.4 PITFALLS.md Pitfall 2 "closure-scoped `let cancelled`" baseline still applies.

---

### Pitfall 2: Probe cache not scoped per-serverUrl → cross-server pollution after settings change

**What goes wrong:**
The 29-02 plan's `probeKey(serverUrl, resourceType)` correctly includes `serverUrl` in the key (line 601-603). However, the cache itself (`probeCacheRef: useRef<Map<string, ActiveStrategy>>`) is scoped to the `useConformanceRun` hook instance. That hook *outlives* settings changes — if the user changes `validation.externalValidator.url` in `settings.yaml` mid-session, or changes the server URL, the probe cache retains entries keyed by the *old* serverUrl+type pair. The cache is never invalidated on settings change. Worse: if the user configures an external validator, runs a validation, and then disables it (`enabled: false`), the probe cache still says `'external'` for all previously-probed types — the next run will attempt to dispatch to `tryExternal` via the probe-cache-hit fast path BUT `tryExternal` will return `null` because `ext.enabled` is false, so the cascade falls through to server correctly. The bug is subtler: if the user *swaps validator URLs* (external-A → external-B), probe cache entries for `serverUrl::Patient` still say `'external'`, cascade runs `tryExternal` against the new URL — but the PHI gate key is `(serverUrl, externalUrl)` which is now *different* — gate returns false — demotes silently to server. User sees `Active strategy: server` without understanding why.

**Why it happens:**
Probe cache was designed as a per-run optimization; settings-change lifecycle wasn't in scope. Mirrors exactly the v1.4 count-cache pitfall (v1.4 PITFALLS.md Pitfall 3: "unbounded `Map<serverUrl, cache>`") — but that one got fixed via `SettingsContext.setSettings()` invalidation. The probe cache has no equivalent wiring.

**Warning signs:**
- User reports "changed validator URL in settings.yaml, restarted dev server, but quality tab shows Active strategy: server — why is it not using my new external?"
- `grep -rn "clearProbeCache\|probeCacheRef.*clear" src/` after Phase 31 ships returns 0 matches
- No SettingsContext subscription in `useConformanceRun.ts`
- Test: mount component, seed probe with `('http://s1/::Patient', 'external')`, change settings to a new externalValidator URL, assert probe cache still has the stale entry

**Prevention strategy:**
1. Subscribe the probe cache to `SettingsContext`: on settings change, clear the probe cache. Simplest: pass `settings` as a dep to the `useEffect` in `useConformanceRun` and reset `probeCacheRef.current = new Map()` on change.
2. Alternative (cleaner): key the probe cache on `(serverUrl, externalValidatorUrl, resourceType)` so a URL swap invalidates naturally.
3. Add regression test: wrap `<useConformanceRun>` consumer in a `<SettingsProvider>` mock, change settings.validation.externalValidator.url, assert the next `validateWithCascade` call re-probes (fetch is called again).
4. Document in `cascadingValidator.ts` JSDoc: "Probe cache is owned by the caller (useConformanceRun); invalidation on settings change is the caller's responsibility. This module is stateless."

**Phase mapping:** **Phase 31 (UX-01)** — amendment to 29-02 Task 5 (wiring into useConformanceRun).

**Sources:** `29-02-PLAN.md:601-603` (probeKey shape); v1.4 PITFALLS.md Pitfall 3 (settings-change invalidation pattern).

---

### Pitfall 3: PHI gate bypass via refactoring — the gate is the LAST line of defense before PHI leaves the browser

**What goes wrong:**
The 29-02 plan's Task 1 extracts the PHI gate to `src/quality/phiGate.ts` — good. But `cascadingValidator.ts:tryExternal` reads the gate at *plan time* (line 614: `if (!isPhiAcknowledged(opts.serverUrl, ext.url)) return null;`). A future refactor to support batching (e.g., "validate all resources in one HTTP call for efficiency") would naturally move the PHI check *out of the per-resource loop* and into the batch planner. If the refactor moves the check to the wrong scope — e.g., checks once at batch start using the *current* PHI state, then during the 30-second batch the user revokes consent by clearing localStorage — subsequent requests in the same batch continue to leak PHI.

The subtler failure: `isPhiAcknowledged()` is a synchronous localStorage read. Under React 18 concurrent rendering, a component that renders with `phiAcknowledged === true` can be suspended and re-rendered later with `phiAcknowledged === false` (after the user clicked "revoke" in a sibling panel). The in-flight fetch issued during the first render continues regardless.

**Why it happens:**
PHI gates are typically implemented once and assumed permanent. But the cascade introduces a new pattern: the gate is consulted *inside an async function that may run for seconds*. Consent state can change while the async function is executing.

**Warning signs:**
- The cascade's `tryExternal` reads `isPhiAcknowledged` at start but doesn't re-check before each fetch
- Tests don't exercise "revoke consent mid-run"
- `grep -n "isPhiAcknowledged" src/` shows calls only at component-render time, never before each network I/O
- Any future "batched $validate" work references "efficiency" without a PHI-checkpoint-per-batch

**Prevention strategy:**
1. Keep the cascade per-resource (as the preserved plan does). Resist batching temptation for v1.5.
2. Add an integration test: mount `<ValidationPanel>`, start a run, call `setPhiAcknowledged(false)` during the run, assert no external fetch is issued after the state change. Requires threading `isPhiAcknowledged()` *into each `tryExternal` invocation*, not hoisting it.
3. Document in `phiGate.ts` JSDoc: "This gate MUST be re-evaluated before every outbound fetch, not cached across resource boundaries."
4. Add an ESLint custom rule or code comment audit: grep for `isPhiAcknowledged` inside a `useMemo`/`useCallback` body — if memoized, the stale-closure risk surfaces.
5. The regression test from 29-02 Task 1 Test 4 (`vi.spyOn(global, 'fetch').mockResolvedValue(...)` + assert zero fetches before consent) must be repeated at the cascade level (Task 4 Test 2 — already specified in plan, LOCK this).

**Phase mapping:** **Phase 31 (UX-01)** — the plan already has this covered at Task 1 Test 4 and Task 4 Test 2. Roadmap should require NO deferral or relaxation of these tests.

**Sources:** `29-02-PLAN.md` Task 1 Test 4; `src/components/quality/ValidationPanel.tsx:100-107,235,270-294` (current inline gate).

---

### Pitfall 4: Tier-switch thrashing — external takes >timeout but <cancel-deadline, probe demotes, next resource re-probes external, loop

**What goes wrong:**
Probe cache is updated at the END of `validateWithCascade` with `options.probe.set(pk, activeStrategy)`. The cache is checked at the START with `options.probe.get(pk)`. Between calls, the cache reflects the *last* tier that succeeded. If the external validator is *intermittently* slow (bursty load: 10% of requests >15s, 90% <1s), the first resource's probe times out → demotes to server → cache says `'server'`. The SECOND resource hits the cache, short-circuits to server → cache stays `'server'`. Good.

But consider the opposite: first resource's external call succeeds (fast path, 800ms) → cache says `'external'`. Second resource's external call times out → demotes → cache says `'server'`. Third resource hits cache → server. Fourth resource… the cache never tries external again, even though external is healthy for 9/10 requests. The user sees `Active strategy: server` and assumes external is dead. This is **cache stickiness on transient failures**.

Inverse failure: if the probe logic treats probe-cache-hit as "skip probing" (the 29-02 plan line 697-709 does this), the cache is never re-probed. Recovery requires a manual action (re-mount the panel) that users won't discover.

**Why it happens:**
Probe cache was designed for the common case ("external is either up or down") without accounting for intermittent failure modes. Real external validators (validator.fhir.org is an open public service, Firely's validator is a hosted service with quotas) exhibit bursty latency.

**Warning signs:**
- `Active strategy` gets stuck on server after a single timeout
- Users report "validator was working yesterday, now it's always server — did you change something?"
- No time-based eviction in `probeCacheRef.current`
- The cascade's notify callback is only wired to show the toast on `kind: 'timeout'`, never on successful external recovery

**Prevention strategy:**
1. **Probabilistic re-probe**: on probe-cache-hit for `'server'` or `'local'`, re-run external tier with probability 1/N (e.g., every 10th resource). Adds recovery without thrashing. Keep this OFF by default in v1.5; gate behind a `validation.externalValidator.reprobeEvery?: number` setting for ops tuning.
2. **Time-based eviction**: probe cache entries expire after 60s. Requires storing `{ strategy, probedAt }` per key.
3. **Simpler**: on every run (button press "Validate sample"), reset the probe cache. The `useConformanceRun.start` callback at 29-02-PLAN Task 5 line 773 suggests this ("decide per team norm, recommend always-fresh for predictability") — LOCK this choice in the roadmap.
4. Add an "explicit reset" toggle: right-click or long-press on the `Active strategy: server` label → "Retry external" → reset probe cache.
5. Document the tradeoff in ValidationPanel user-facing help text: "External status is cached per run. Click Validate sample again to retry."

**Phase mapping:** **Phase 31 (UX-01)** — add "always-fresh probe on Validate sample click" as acceptance criterion. Defer the probabilistic re-probe to v1.6 if needed.

**Sources:** `29-02-PLAN.md:770-775,778-781` (probeCacheRef lifecycle); no external source — this is an analytical pitfall from async-timing first principles.

---

### Pitfall 5: OperationOutcome severity drift across validators (HAPI / Firely / IG-Publisher / Ontoserver)

**What goes wrong:**
`normalizeOperationOutcomeIssue` (29-02 Task 2) maps `issue.severity` per FHIR spec: `fatal|error → 'error'`, `warning → 'warning'`, everything else → `'info'`. This is bit-for-bit identical to the current inline mapper (Task 2 requirement). But different validators emit different severity distributions for THE SAME rule:

- **HAPI validator** (validator.fhir.org): invariant violations → `error`; cardinality min=1 missing → `error`; value set binding (required) mismatch → `error`; slice matching failure → `error`.
- **Firely** (commercial SaaS): invariant violations → `error`; cardinality min=1 missing → `error`; value set binding (preferred) mismatch → `warning` (NOT error); unknown code in preferred binding → `information` (filtered to `info` by our mapper).
- **HL7 IG-Publisher** (offline tool): emits `fatal` severity for unrecoverable parse errors (which our mapper correctly maps to `error`), but also emits `error` for MII slice-matching failures that HAPI would flag as `warning` due to looser slicing rules.
- **Ontoserver $validate-code** (sometimes used as an ad-hoc validator): returns `error` for *any* unknown code, even if the binding strength is `example`.

So the same resource validated against the same profile can show 15 issues with one validator and 3 with another. Users will compare results and see noise as a bug.

Additionally: the `expression` vs `location` field populated differs — HAPI always populates `expression[]` (FHIRPath); IG-Publisher populates `location[]` (deprecated). Our mapper correctly handles both (`expression?.[0] ?? location?.[0]`), but downstream drill-down logic that expects a FHIRPath (for `src/quality/*` engines) will silently get a location string like `Patient.name[0]` which is NOT FHIRPath-valid.

**Why it happens:**
The FHIR spec under-specifies severity binding. Validators make per-project judgment calls. v1.0 Phase 5 only ever ran `structuralValidator` (our own) and optionally one HAPI instance — so severity drift never surfaced. The cascade enables running against user-configured external validators, i.e., any of the above.

**Warning signs:**
- Issue counts vary wildly between "Validate sample" runs on the same data when the user changes `externalValidator.url`
- Drill-down pages crash when `expression` contains brackets-with-spaces that our path parser can't handle
- Users file bugs like "the validator says my data is valid but I know field X is missing"
- No test for "ValidatorA run then ValidatorB run produces different issue sets"

**Prevention strategy:**
1. Add a `validatorVariant: 'hapi' | 'firely' | 'ig-publisher' | 'unknown'` field to the probe cache or to `NormalizedIssue.source`. Detect via response headers (HAPI sets `Server: HAPI FHIR`) or a probe endpoint. Surface in UI as `Active strategy: external (HAPI)`.
2. Document severity drift in the external validator settings copy in `settings.yaml`: "Note: severity assignments vary across validators. Compare results carefully when switching validators."
3. Add a normalizer test case per validator variant (fixture OperationOutcome blobs from each): Firely preferred-binding → `warning`; HAPI preferred-binding → `warning` (same); IG-Publisher slice-fail → `error` (differs).
4. **Do NOT** auto-normalize severity across validators — that would hide a real data-model difference. Surface the variant instead.
5. For drill-down robustness: if `expression` is empty and `location` is populated, flag the issue with a `_legacyLocationOnly: true` marker so the drill-down can render a simpler path-as-string view instead of trying to parse FHIRPath.

**Phase mapping:** **Phase 31 (UX-01)** — add normalizer test matrix (Task 2 of 29-02) to cover per-validator fixtures, not just severity matrix.

**Sources:** HAPI FHIR Validator docs (validator.fhir.org); Firely Terminal validator docs; HL7 FHIR spec on OperationOutcome.issue.severity (uninvestigated — analytical from FHIR R4 spec §OperationOutcome). Confidence: MEDIUM-HIGH on behavioral drift; LOW on specific validator quirks without direct tests.

---

### Pitfall 6: CORS on external validator endpoints — local-first app cannot control remote server CORS policy

**What goes wrong:**
The external validator is a user-supplied URL (`validation.externalValidator.url`). The FHIR Exploder runs in the browser from a localhost origin (or `file://` if bundled). Hitting `https://validator.fhir.org/validator/Patient/$validate` as a CORS POST requires the validator to return `Access-Control-Allow-Origin: <our-origin>` and `Access-Control-Allow-Headers: content-type`. **Most public FHIR validators do not emit CORS headers** because their expected clients are server-side or Postman-style tools.

Result: the `fetch` fails with a net-ambiguous error (browser console shows "CORS error" but the caught exception only has `TypeError: Failed to fetch`). Our current error handling (`29-02-PLAN.md:649-652`) catches and demotes to `'server'` — correct fallback, but the user has no idea why external never worked. `Active strategy: server` with no indication that CORS blocked external.

Additionally: many FHIR validators expose an *endpoint* that doesn't support the `OPTIONS` preflight. POST with `Content-Type: application/fhir+json` is a non-simple request → preflight is required → fails before the POST is even attempted.

**Why it happens:**
CORS is the default browser restriction; developers writing curl-based validator tests don't encounter it; local-first apps are a minority of FHIR-validator consumers.

**Warning signs:**
- DevTools Network tab shows a failed OPTIONS request with no response headers
- Console: "Access to fetch at '...validator.fhir.org...' from origin 'http://localhost:5173' has been blocked by CORS policy"
- User reports "external validator is configured but cascade always falls back to server — even though I can curl it fine"
- The cascade's `notify` callback fires `demote` but the cause is hidden

**Prevention strategy:**
1. **Surface the root cause**: in `tryExternal`'s catch block, distinguish `TypeError: Failed to fetch` (network/CORS) from HTTP 4xx/5xx. For the former, include "likely CORS or network" in the demote notification. Mantine toast copy: "External validator unreachable — check CORS configuration."
2. **Document the CORS requirement** in `settings.yaml` comment block + in a new docs page: "External validators must emit `Access-Control-Allow-Origin` for the exploder's origin. Public validators often don't — consider running a local validator container (HAPI JPA Server with `hapi.fhir.validator.enabled=true`, or the FHIR Validator Wrapper from markiantorno/validator-wrapper)."
3. **Add a settings preflight** — on settings save, issue a lightweight `GET {externalValidator.url}/metadata` to detect CORS failure early. Surface in Settings UI as "External validator: reachable / CORS-blocked / unreachable".
4. **Skip**: don't auto-configure a proxy. A proxy server is out of scope for a local-first app.

**Phase mapping:** **Phase 31 (UX-01)** — add "CORS error detection in demote notification" as a small sub-task. Roadmap should also add a one-page docs addition to the milestone ("External validator setup guide") listing HAPI-in-Docker as the recommended local external validator.

**Sources:** MDN CORS docs; FHIR community wiki on validator deployment. HIGH confidence — CORS is deterministic browser behavior.

---

### Pitfall 7: QualityMetricsContext split — 8 providers nested, one shadows another, silent data loss

**What goes wrong:**
EFF-R14 splits `QualityMetricsContext.tsx` into per-metric providers (Option A). The obvious implementation: `<CompletenessProvider><CoverageProvider><ValidationProvider>...<DuplicatesProvider>{children}</DuplicatesProvider>...</CompletenessProvider>`. If all 8 providers share a single `Ctx` symbol (say, `QualityMetricsCtx`), the outermost provider's value wins and all inner providers' values are shadowed — `useQualityMetrics()` called anywhere in the tree returns ONLY the outermost provider's state. No type error, no runtime error, just silent data loss where 7/8 metric panels render with `undefined`.

Alternative implementation: each provider uses its OWN context symbol (`CompletenessCtx`, `CoverageCtx`, etc.). Now the facade hook `useQualityMetrics()` must call 8 `useContext()` calls and merge them. That works, but:
- `OverviewStrip.tsx` (currently reads 7 overall* fields plus `duplicatesBreakdown` via the single `useQualityMetrics()` call, `src/components/quality/OverviewStrip.tsx:67`) re-renders if ANY of the 8 contexts change — same total re-render cost as today, no EFF-R14 benefit.
- Provider nesting order matters at the `setX` setter level if any provider's initial-state effect depends on another's state. Today the context is flat; all setters are independent. If the split introduces cross-metric dependencies (e.g., overall quality = f(completeness, coverage, validation)) that were planned for later, nesting order becomes load-bearing.

**Why it happens:**
"Option A: per-metric context providers" is a well-known React pattern, but naive split-by-file implementations commonly share a context symbol (e.g., a single `createContext` at module scope). The EFF-R14 research note is thin ("risk/reward deferred from Phase 27") — implementation details not yet settled.

**Warning signs:**
- After the split, only Completeness tile renders a value; the other 6 tiles show em-dashes
- Test suite has `<QualityMetricsProvider>` wrappers that don't fail to compile but fail to populate state
- `grep -n "createContext" src/quality/` returns only one call when the split should produce 8
- OverviewStrip.tsx re-renders on every metric change (check via React DevTools Profiler)

**Prevention strategy:**
1. **Eight separate context symbols** + a facade hook `useQualityMetrics()` that calls `useContext()` for each. Type: `export function useQualityMetrics(): QualityMetricsContextValue` — exact same signature as today.
2. **Selector-based consumers for new code**: add `useQualityMetric('completeness')` (returns only overallCompleteness) alongside the facade. OverviewStrip can migrate tile-by-tile over time — but don't require the migration in this phase.
3. **Provider composition utility**: `<QualityMetricsProviders>` that wraps all 8 in a fixed order (alphabetical), so test setup is one wrapper not 8. Prevents the 29.5-style test-repair pain v1.4 already paid.
4. **Critical test**: seed each provider with distinct values, read via facade hook, assert all 8 are present. Add this as the FIRST test written — TDD-style. If only 1 of 8 is readable, the split is broken.
5. **PdfReportLayout.tsx consumer**: verified to NOT use `useQualityMetrics()` (uses props-based snapshots per `grep -n "useQualityMetrics" src/components/quality/PdfReportLayout.tsx` → zero matches). Safe. But add a regression grep to the phase VERIFY: "grep shows PdfReportLayout still takes snapshot props, not live context."
6. **Re-render verification**: React DevTools Profiler test (documented, manual): update only overallCompleteness, assert only CompletenessTile re-renders, not the other 6 tiles. This is the whole point of EFF-R14 — if the profiler shows all 8 tiles re-rendering, the split didn't deliver value.

**Phase mapping:** **Phase 32 (EFF-R14 QualityMetricsContext split)**. Make these 6 points the phase's acceptance criteria.

**Sources:** `src/quality/QualityMetricsContext.tsx:107-173`; `src/components/quality/OverviewStrip.tsx:67`; v1.4 PITFALLS.md Pitfall 7 (`useSyncExternalStore` alternative — REJECTED per EFF-R14 "Option A: NOT useSyncExternalStore").

---

### Pitfall 8: Effect re-subscription loops — setMetric() in a producer useEffect → re-render → useEffect re-runs → setMetric → …

**What goes wrong:**
Today producers push to the monolithic context via a single setter call in a `useEffect`:
```tsx
// src/components/quality/ValidationPanel.tsx:201-205
useEffect(() => {
  if (run.status !== 'complete' && run.status !== 'cancelled') return;
  const affected = new Set(allNormalizedIssues.map((i) => i.resourceId)).size;
  setOverallValidation(percentClean(affected, run.progress.total));
}, [run.status, run.progress.total, allNormalizedIssues, setOverallValidation]);
```

`setOverallValidation` is stable today (it's a plain useState setter). After the split, `setOverallValidation` comes from `useContext(ValidationMetricCtx)`. If the provider creates a new object identity on every render (forgets `useMemo`), then `setOverallValidation` has a new identity every render → `useEffect` re-runs → calls setter → provider re-renders → new identity → loop. Infinite re-render, "Maximum update depth exceeded" error.

The current monolithic context avoids this via `useMemo` at line 142 of `QualityMetricsContext.tsx`. A naive split that forgets to memoize each provider's value object triggers the loop in EVERY panel simultaneously.

**Why it happens:**
The split multiplies the providers by 8. Each provider's `value` object needs its own `useMemo`. Miss one → that panel loops.

**Warning signs:**
- "Maximum update depth exceeded" error in React dev console when loading `/quality`
- React DevTools Profiler shows a single component flashing between render counts rapidly
- Tests hang (timeout) in Vitest
- `grep -n "useMemo" src/quality/providers/*.tsx` shows fewer matches than there are providers

**Prevention strategy:**
1. **Code template**: each per-metric provider file uses the IDENTICAL `useMemo`-around-the-value pattern. Commit a template file (e.g., `src/quality/providers/_template.tsx`) and have every provider copy it.
2. **ESLint rule `react-hooks/exhaustive-deps` on the useMemo**: ensures setter stability.
3. **Unit test per provider**: `render(<Provider><Consumer /></Provider>)`, bump state 10 times, assert consumer render count ≤ 11 (one initial + one per bump). Fail if >20.
4. **Smoke test for the whole stack**: mount the facade provider + the 7 panels simultaneously, wait 100ms, assert no "Maximum update depth" in console. Use `vi.spyOn(console, 'error')`.

**Phase mapping:** **Phase 32 (EFF-R14)**. Write the smoke test FIRST, before the refactor.

**Sources:** `src/quality/QualityMetricsContext.tsx:142-171` (useMemo pattern); `src/components/quality/ValidationPanel.tsx:201-205` (producer useEffect pattern — replicated in PlausibilityPanel, LabRangesPanel, DuplicatesPanel, ReferencesPanel).

---

### Pitfall 9: Lost updates when panel unmounts mid-compute — result lands AFTER the tab switch

**What goes wrong:**
Panel unmount during a long compute is already handled by `useAsyncRun`'s closure-scoped cancellation (v1.4 Pitfall 2 baseline). BUT: the result is pushed to the metric context via a `useEffect` (see ValidationPanel.tsx:201-205 pattern). If the panel unmounts BEFORE the useEffect fires for the terminal-status state transition, the metric is never set. Next tab visit: user sees the last OLD value (or em-dash), not the completed run.

With 8 per-metric providers instead of one, the write surface becomes 8× wider — each producer panel needs its own "push on unmount" guard. Today's monolithic context survives this because the parent `QualityMetricsProvider` lives at `/quality` layout level (never unmounts during tab switching); a split where some providers live inside panel subtrees (e.g., `<DuplicatesProvider>` inside `DuplicatesPanel`) would LOSE state on tab switch.

**Why it happens:**
"Per-metric providers" can be read as "each provider lives near its producer" — a reasonable but wrong placement. Providers must live ABOVE all consumers AND all producers, i.e., at the `/quality` layout.

**Warning signs:**
- After switching to `/quality?tab=duplicates`, running duplicates, switching to `/quality?tab=counts`, and back to OverviewStrip, the duplicates tile shows em-dash instead of the computed value
- Test: mount providers, compute duplicates, unmount the DuplicatesPanel (simulate tab switch), re-mount, assert the previous duplicates value is still readable → FAILS
- Provider files live under `src/components/quality/providers/DuplicatesProvider.tsx` (co-located with panel) instead of `src/quality/providers/`

**Prevention strategy:**
1. **Lock provider placement**: all 8 per-metric providers compose at `src/components/quality/QualityLayout.tsx` — the same place `QualityMetricsProvider` currently wraps (line 106). NOT inside panel components.
2. **Test**: mount layout, unmount panel, assert provider state persists.
3. **`keepMounted` invariant**: the quality metric tabs already drop `keepMounted` on Completeness + Coding (v1.4 Phase 25). After the split, producers MUST push on terminal status within the tab's lifetime — the Phase 18 gate (`run.status === 'complete'`) remains load-bearing.
4. **Document the constraint in providers/_template.tsx**: "This provider MUST be mounted at QualityLayout level. Never co-locate with a panel."

**Phase mapping:** **Phase 32 (EFF-R14)**.

**Sources:** `src/components/quality/QualityLayout.tsx` (current QualityMetricsProvider mount); v1.4 PITFALLS.md Pitfall 5 (ConnectionGatedOutlet provider timing).

---

### Pitfall 10: Test setup complexity — single provider wrap → 8 provider wraps → 29.5-style repair recurs

**What goes wrong:**
v1.4 Phase 29.5 repaired 22 tests by adding `<SettingsProvider>`/`<ConnectionProvider>` wrappers across 7 React test files (see MILESTONES.md). After the EFF-R14 split, 10+ test files currently importing `QualityMetricsProvider` need to wrap with 8 providers instead of 1. Without a composition utility, every test gets a 9-line wrapping boilerplate:
```tsx
<CompletenessProvider>
  <CoverageProvider>
    <ValidationProvider>
      <PlausibilityProvider>
        <LabRangesProvider>
          <DuplicatesProvider>
            <ReferencesProvider>
              <OverallProvider>{children}</OverallProvider>
            </ReferencesProvider>
          </DuplicatesProvider>
        </LabRangesProvider>
      </PlausibilityProvider>
    </ValidationProvider>
  </CoverageProvider>
</CompletenessProvider>
```
Every test file copy-pastes this. If the order later needs to change, 10+ files update.

**Why it happens:**
Default React test patterns don't ship a composition utility. Each developer rolls their own.

**Warning signs:**
- Test files have a `renderWithQualityProviders` helper duplicated across 10+ files
- A new panel test imports 8 providers by name
- Adding a 9th metric requires changing 10+ test files (dead giveaway)

**Prevention strategy:**
1. **Single exported `QualityMetricsProviders` composer component** (plural `s`) that wraps all 8 in the canonical order. Tests use `<QualityMetricsProviders>{children}</QualityMetricsProviders>` — one component, one line.
2. **Separate `renderWithQualityMetrics` helper** in `src/__tests__/testUtils.ts` (or similar) for tests that don't need Settings/Connection context.
3. **Import consolidation**: providers live in `src/quality/providers/index.ts` barrel re-export. Tests import from one path.
4. **Provider changeset audit in CI**: git hook or CI step that fails if a new provider is added but `QualityMetricsProviders.tsx` isn't updated.

**Phase mapping:** **Phase 32 (EFF-R14)** — ship the composer component as Task 1 BEFORE any panel migration.

**Sources:** MILESTONES.md Phase 29.5; existing `src/components/quality/__tests__/quality-layout.test.tsx` pattern.

---

### Pitfall 11: 21 concurrent FHIR searches per patient on mount — browser 6-per-origin limit + Blaze rate-limiting

**What goes wrong:**
Current `MiiModuleTabs.tsx:65,86-88` sets `keepMounted` on BOTH the `<Tabs>` parent AND every `<Tabs.Panel>`. Each `<MiiModuleTab>` fires a FHIR search in a `useEffect` on mount (`src/components/patients/MiiModuleTab.tsx:59-81`). Today: 7 base modules + 1 timeline = 8 concurrent FHIR searches on patient page load.

v1.5 adds 14 extension modules → 22 concurrent searches on mount. The browser enforces 6 concurrent HTTP/1.1 connections per origin — the 7th+ request queues at the browser level. Blaze (the default FHIR server) is single-threaded per request but handles concurrency via thread pools; its default `blaze.thread-pool.size` is typically 4-16. With 22 concurrent requests, head-of-line blocking pushes the last tab's load time from ~100ms to ~3-5s. User perceives the patient detail page as slow.

Worse: if the browser's connection slots are saturated by these 22 tab fetches, concurrent requests from other components (sidebar counts, PatientHeader, breadcrumb resolution) queue behind them.

**Why it happens:**
`keepMounted` is a Mantine convenience (avoid re-fetching on tab re-entry) that scales poorly. The extension modules weren't in scope when `keepMounted` was chosen.

**Warning signs:**
- DevTools Network tab shows 20+ FHIR requests on every `/patients/:id` load, many pending on "Stalled"
- Patient page time-to-interactive degrades from ~500ms (v1.4) to ~3000ms (v1.5 with all 21 modules)
- Blaze logs show request timeouts under load tests
- Dropping `keepMounted` fixes the latency but loses the "preserve scroll on tab re-entry" benefit

**Prevention strategy:**
1. **Lazy-load extension modules**: the base 7 modules keep `keepMounted` (preserve current UX); the 14 extension modules do NOT set `keepMounted` on their `<Tabs.Panel>` — they fetch on first visit only. Simple, low-risk.
2. **Alternative — prefetch with throttle**: load base 7 immediately; queue extensions at 4-concurrent-max via a shared throttle utility. More complex, higher reward for power users.
3. **Use `useResourceCounts` prefetch trick**: surface just COUNT per extension module in the tab label (fast `_summary=count` call, batched via the existing `useResourceCounts` infrastructure). Only load resource LIST when tab is clicked.
4. **Collapse-by-default**: the roadmap already specifies "collapsible Extension modules section below base tabs" — if the collapse is CLOSED by default, no extension tabs mount until user expands.
5. **Test**: performance regression test — load `/patients/:id`, assert total network requests within first 2s is <15 (base + count-only probes).

**Phase mapping:** **Phase 33 (MII extension modules)**. Decision needed early: which of the 4 strategies.

**Sources:** `src/components/patients/MiiModuleTabs.tsx:65,86-88`; `src/components/patients/MiiModuleTab.tsx:59-81`; MDN docs on HTTP/1.1 concurrent-connection limits. HIGH confidence.

---

### Pitfall 12: Per-module `extraQuery` breaks on multi-type modules (`fhirResourceType: string | string[]`)

**What goes wrong:**
Current schema: `MiiModule.extraQuery?: string` (`src/utils/mii-modules.ts:40`). Only used by Laborbefund (`category=laboratory`) to filter Observations. The v1.5 schema change makes `fhirResourceType: string | string[]`. A multi-type module like Pathologie might map to `['DiagnosticReport', 'Observation']`. If the module also sets `extraQuery: 'category=laboratory'`, that query applies to BOTH types — but `category=laboratory` is meaningful for Observation, meaningless for DiagnosticReport. The DiagnosticReport search returns empty (or errors on some servers) even though real pathology reports exist.

Inverse failure: if `extraQuery` becomes per-type, the schema grows to `extraQuery?: string | Record<string, string>` — higher complexity that existing Laborbefund config doesn't need. Migration is required.

**Why it happens:**
`extraQuery` was designed for the single-type case. Multi-type modules introduce a per-type dimension that the single-string shape can't carry.

**Warning signs:**
- Pathologie tab shows zero DiagnosticReports even on a populated server
- Any multi-type module with a category filter returns empty for at least one of its types
- Tests fixtures use string `extraQuery` and don't test multi-type combos
- Live-Blaze UAT reveals "some modules load, some don't"

**Prevention strategy:**
1. **Per-type extraQuery**: schema change `extraQuery?: Record<string, string>` where the key is the FHIR resource type. Example:
   ```ts
   { fhirResourceType: ['DiagnosticReport', 'Observation'],
     extraQuery: { Observation: 'category=laboratory' } }
   ```
   Missing key = no extra query for that type. Backward-compat: old config with `extraQuery: 'category=laboratory'` auto-migrates to `{ [fhirResourceType]: 'category=laboratory' }` when `fhirResourceType` is a string.
2. **Type guard utility**: `getExtraQueryForType(module, resourceType): string | undefined` — single import, one place to change shape later.
3. **Test per module**: every multi-type module's config has a unit test asserting correct query construction per type.
4. **Fallback**: if `extraQuery` is a plain string AND `fhirResourceType` is `string[]`, fail-loud in development (`console.warn` + skip extra query) so the mis-match surfaces during dev.

**Phase mapping:** **Phase 33 (MII extension modules)** — schema change is Task 1 of the phase.

**Sources:** `src/utils/mii-modules.ts:32-40`; MII Kerndatensatz profiles for Pathologie / Bildgebung (out of scope for this pitfall research; deferred to MII-extension-module research document).

---

### Pitfall 13: Every `MII_MODULES.find(m => m.fhirResourceType === X)` caller breaks when `fhirResourceType` becomes `string[]`

**What goes wrong:**
A `grep -n "MII_MODULES.find\|MII_MODULES\[" src/ -r` (not run here but predicted based on structure) reveals consumers like DashboardPage (MII tile grid), ClinicalTimeline (type badges), FhirResourcesView (module label resolution). Each expects `fhirResourceType` to be a string. Once it's `string | string[]`:
- `.find(m => m.fhirResourceType === resType)` returns undefined for ANY multi-type module → module is "invisible" to that caller
- `.find(m => m.fhirResourceType === 'Observation')` won't match the multi-type `['Observation', 'DiagnosticReport']` Pathologie module
- TypeScript happily accepts the old comparison (both sides are assignable to `string | string[]`) — no compile-time error

`npm test` will fail at 10+ call sites silently (tests mock `MII_MODULES` with the OLD shape) or loudly (type narrowing breaks).

**Why it happens:**
Schema widening from `string` to `string | string[]` is a breaking change that TypeScript can't flag because `===` on a union with `string` is structurally valid.

**Warning signs:**
- Dashboard MII tile grid shows only 7 base modules after the schema change (multi-type extensions disappear)
- Tests using `MII_MODULES.find(m => m.fhirResourceType === 'Specimen')` start failing when Specimen is promoted to a multi-type module
- No `Array.isArray(m.fhirResourceType)` check anywhere in call sites
- Hidden fields type-narrow to `never`

**Prevention strategy:**
1. **Audit EVERY call site**: `grep -rn "fhirResourceType" src/ | grep -v mii-modules.ts` — migrate each to use a helper.
2. **Helper utility**: `getTypesForModule(m: MiiModule): string[]` that returns `[m.fhirResourceType]` or `m.fhirResourceType` depending on shape. Single-source-of-truth.
3. **Helper utility**: `findModuleForType(resType: string): MiiModule | undefined` that handles both shapes — `MII_MODULES.find(m => getTypesForModule(m).includes(resType))`.
4. **Codemod**: before the schema change, add the helpers and refactor EVERY call site to use them — even with single-string modules. Then the schema widening is a one-liner change with no call-site breakage.
5. **Lint rule**: ban direct `.fhirResourceType ===` comparisons in `src/` outside of `mii-modules.ts`. Custom ESLint rule or code review checklist.
6. **Fixture migration**: update all test fixtures in ONE commit, separate from the production code change. Reviewable as "fixture-only PR".

**Phase mapping:** **Phase 33 (MII extension modules)** — Task 1 is the helper refactor (no shape change yet), Task 2 is the schema widening (no behavior change). Small, reviewable commits.

**Sources:** `src/utils/mii-modules.ts`; analytical — no grep run to confirm exact call site count; confidence HIGH based on codebase size and pattern frequency.

---

### Pitfall 14: `patientSearchParam` per-module-default + per-type-override mismatch (Specimen uses `subject=`)

**What goes wrong:**
The Biobank extension module likely maps to `Specimen`. Specimen's patient reference is `subject: Reference(Patient)`, not `patient: Reference(Patient)` (verify in FHIR R4 spec — Specimen uses `subject`). Current schema uses a single `patientSearchParam: string` per module. If Biobank also includes secondary types (e.g., `Specimen` + `Observation` for lab values tied to specimens), the two types use DIFFERENT patient search params (`subject` for Specimen, `patient` for Observation).

Hardcoding `patientSearchParam: 'subject'` on the module level means the Observation search uses `subject=Patient/{id}` — which on Blaze is NOT a valid search parameter for Observation (Observation's is `subject` AND `patient`, both work — per FHIR R4 Observation search params). So this MIGHT work for Observation but breaks on stricter servers (e.g., HAPI JPA with strict mode).

Counter-example: Consent uses `patient=...` (already in config). If Consent were multi-typed with Patient (e.g., `['Consent', 'Patient']`), the Patient sub-search would need `_id=...` not `patient=...` — because Patient doesn't have a `patient` search param.

**Why it happens:**
FHIR search parameters are per-resource-type. Some types use `patient`, some use `subject`, some use `_id` (for Patient itself). The current module schema assumes one per module.

**Warning signs:**
- A multi-type extension module's queries fail with HTTP 400 for one of its types
- Blaze returns `OperationOutcome` with code `invalid-parameter` for `subject=Patient/xyz` on a Patient search
- The UAT item #4 ("empty per-patient MII/FHIR panels") surfaces again for extension modules specifically
- Tests mock the FHIR client with a permissive matcher that accepts any search-param shape

**Prevention strategy:**
1. **Per-type search param override**: extend schema
   ```ts
   patientSearchParam: string | Record<string, string>;
   ```
   If string, applies to all types. If record, per-type keys. Helper utility `getPatientSearchParamForType(module, resType)`.
2. **Default: 'patient'** for any type not in the record. Patient-itself type exception → `_id` (same as current Person module).
3. **Validation at module definition time**: unit test per module asserting the per-type search param matches a FHIR-valid search parameter for that type. Fixture: FHIR R4 capability statement subset.
4. **Live-Blaze UAT**: for every multi-type extension module, confirm at least one query returns ≥1 result on a populated Synthea patient. Make this a phase-close gate.
5. **Cross-link with UAT #4** (empty per-patient MII/FHIR panels from Phase 30): this investigation may uncover a similar per-type search param bug in the BASE modules — fix once, apply to extensions.

**Phase mapping:** **Phase 33 (MII extension modules)** — schema change Task 1 includes this. Also cross-link to **Phase 33.X (UAT #4 investigation)**; fix order: investigate UAT #4 first, learn the search-param mistake pattern, apply fix to base modules, then add extensions with correct schema.

**Sources:** FHIR R4 Specimen spec (`subject: Reference(Patient | Group)`); `src/utils/mii-modules.ts:29` (current single-string shape); Phase 30 UAT gaps #4 and #5.

---

### Pitfall 15: Color collision — 14 Mantine colors, 21 modules → two modules render blue

**What goes wrong:**
Mantine 8 exposes 14 default colors: blue, cyan, teal, green, lime, yellow, orange, red, pink, grape, violet, indigo, gray, dark. The current 7 base modules already consume 7 of these (blue, indigo, teal, violet, pink, cyan, orange per `mii-modules.ts:53-101`). 14 extension modules need 14 more distinct colors → need 21 unique colors total. Mantine provides exactly 14. Two modules *must* share a color.

Naive pick: cycle through Mantine colors → Person (blue) and Module 15 (blue) both indigo active-pill + blue subtitle. User sees two identical-looking pills and can't tell them apart at a glance.

Worse: the dashboard MII tile grid (`/quality` shows these) uses the badge color as a left-edge swatch. 21 swatches with 14 colors = visual ambiguity.

**Why it happens:**
Mantine's palette is fixed at 14. No mechanism for custom colors without a theme extension.

**Warning signs:**
- Pull request review surfaces "which module is this?" for two blue tiles
- Screenshots show indistinguishable pills
- Accessibility review flags 1.x:1 color-difference between two adjacent modules
- Test takes a screenshot of the tile grid and can't uniquely identify modules by color

**Prevention strategy:**
1. **Custom Mantine theme colors**: Mantine 8 supports `theme.colors.custom1 = [10 shades]` — can define 7 extra semantic colors (brown, lavender, mint, coral, slate, amber, olive) to reach 21 distinct. Medium effort; committed in Phase 30's theme already supports this pattern.
2. **Color + shape**: pair color with a shape/glyph per module (square swatch vs circle swatch vs pill outline). Reduces color uniqueness burden.
3. **Color by CATEGORY, not module**: schema already has `category: 'base' | 'extension'` — extend to `category: 'base' | 'clinical' | 'imaging' | 'laboratory' | 'research' | ...` and assign one color per category. Modules within a category share a color; distinguished by label. Accepted tradeoff: same-category modules look similar.
4. **Drop color as primary disambiguator**: use mono label text for identity; color is decoration only. Aligns with Phase 30's "mono count + swatch" dashboard pattern where the count is the primary identifier.
5. **A11y audit**: run a deuteranopia simulation (browser DevTools) on the tile grid; any two modules indistinguishable under the simulation must be re-colored.
6. **Lock the decision in research** before Phase 33 starts: roadmap includes "Phase 33 kickoff: color strategy decision made" as a pre-task.

**Phase mapping:** **Phase 33 (MII extension modules)** — Pre-task A: color strategy decision. Pick strategy 3 (by category) as the starting recommendation; mark as reversible.

**Sources:** Mantine 8 theme docs; `src/utils/mii-modules.ts:53-101` (existing color assignments); WCAG 1.4.1 (color alone not sole means of conveying info).

---

### Pitfall 16: Empty state — cold Blaze with no Molekulargenetik Observations always shows "0" → clutter

**What goes wrong:**
Extension modules like Molekulargenetik (genomic observations), Biobank (Specimens), MTB (molecular tumor board), PRO (patient-reported outcomes) are data-rare on most real Blaze deployments. A typical dev or test Blaze has synthetic Synthea data — no genomic observations, no MTB records. Every extension tab for these shows "0" or the "No data found" empty state.

If the UI always shows all 14 extension tabs with "No data" empty states, users scroll past a wall of emptiness before reaching the data they want. Dashboard MII tile grid is similarly cluttered.

**Why it happens:**
Extension modules are aspirational — many MII sites don't ingest these data classes yet, but the profiles exist.

**Warning signs:**
- UAT feedback: "too many empty tabs"
- Extension modules section is ALWAYS expanded-with-nothing for typical datasets
- No visual distinction between "empty because no data" vs "empty because feature new"
- Patient detail page scroll height on cold data is 2-3× v1.4

**Prevention strategy:**
1. **Auto-hide zero-count extensions BY DEFAULT**: if a module has `category: 'extension'` AND its per-patient count is 0, hide the tab. Provide a "Show empty" toggle to opt in. Aligns with the roadmap note on "Optional relevance filtering (hide extension modules with no matching resources)".
2. **Show but dim**: all 21 tabs visible, but extensions with 0 count render at 50% opacity with a "—" count badge. Matches Phase 30 Dashboard MII tile pattern (0-count at 55% opacity per UAT #8).
3. **Collapse extension section by default**: roadmap already specifies a collapsible section. If CLOSED by default and SHOWS COUNT-PER-CATEGORY in the collapsed header ("Extension modules (12 of 14 empty)"), user decides whether to expand.
4. **Empty state copy tuning**: replace "No Molekulargenetik data found for this patient" with "No genomic observations recorded for this patient in this dataset." Softer; distinguishes data-gap from feature-gap.
5. **Skip telemetry** — don't track "user opened empty tab" metrics; local-first app.

**Phase mapping:** **Phase 33 (MII extension modules)** — decision needed in the phase kickoff. Roadmap bakes in "auto-hide zero-count extensions by default, with Show-empty toggle" as the recommended strategy.

**Sources:** Phase 30 UAT gap "Counts for modules and resources are off"; `src/components/patients/MiiModuleTab.tsx:93-99` (current empty state render).

---

### Pitfall 17: Per-type quality matrix (UAT #6) blocked on EFF-R14 — single-metric-update re-render cost

**What goes wrong:**
UAT follow-up #6 is "per-type quality matrix card under Counts tab" — a table with rows=resource types, columns=7 quality metrics, cells=overall% per type. Each cell reads from the current QualityMetricsContext. The monolithic context re-renders the entire matrix on any metric update — at ~50 rows × 7 columns = 350 cells × 7 metric updates = 2450 cell re-renders per complete quality run. Noticeable jank.

The solution is EFF-R14 (per-metric context → only the affected column re-renders). So UAT #6 is BLOCKED on Phase 32 completion. If Phase 32 slips or is cancelled, UAT #6 either ships with bad perf or gets deferred.

**Why it happens:**
Dependency ordering: matrix performance requires per-metric re-render isolation which requires context split.

**Warning signs:**
- Phase 33 (or UAT #6 sub-phase) PR lands with the matrix and includes a `React.memo` bandaid on every cell
- Roadmap schedules Phase 33-UAT-6 BEFORE Phase 32
- Performance UAT doesn't measure matrix update cost

**Prevention strategy:**
1. **Strict phase ordering**: Phase 32 (EFF-R14) ships BEFORE UAT #6 matrix card. Roadmap enforces.
2. **Conditional shipping**: if Phase 32 slips, UAT #6 ships with an EXPLICIT `React.memo` + `useMemo` scaffold per row — documented as "placeholder; revisit after EFF-R14". Creates tech debt, not hidden cost.
3. **Defer UAT #6 to v1.6 if Phase 32 isn't done**: cleanest option. Roadmap surfaces this dependency explicitly.
4. **Perf UAT acceptance criteria**: matrix updates fire at ≤N re-renders per metric change, where N = cells in one column (not all cells).

**Phase mapping:** **Phase 32 (EFF-R14) FIRST**, **Phase 34 (UAT follow-ups)** AFTER. Roadmap table should show "Phase 34 depends on Phase 32 completion".

**Sources:** Phase 30 UAT SUMMARY.md; PROJECT.md v1.5 Ordering section.

---

### Pitfall 18: UAT #1 (Explorer Date/Status per-type extractor) — existing tests LOCK the empty-string fallback

**What goes wrong:**
`SearchResultsPage.tsx:getResourceDate` returns `''` when no known date field is populated. Tests likely assert this behavior at the "Date column is empty for Patient resources" level. UAT #1 changes the behavior to Patient → birthDate, Condition → onsetDateTime, etc. Existing tests start FAILING with "expected empty string, got '1970-01-01'".

If the test isn't updated in the SAME commit as the behavior change, the baseline regression count increases. v1.4 fought this exact battle in Phase 29.5 (22→0 failing tests).

**Why it happens:**
Test fixtures codify current (broken) behavior without marking it as "intended empty". Refactors don't know which failing tests are regressions vs which are intentional behavior changes.

**Warning signs:**
- `npm test` shows `+5 failing` after UAT #1 ships
- Pre-existing test assertions use `toBe('')` or `toBeEmptyDOMElement` for Date/Status cells
- No test re-write commit alongside the extractor implementation

**Prevention strategy:**
1. **TDD this one**: write the NEW tests first (Patient → birthDate, etc.), assert they FAIL on current code, then implement the extractor. Updating tests happens in one commit.
2. **Snapshot test audit**: grep test files for existing Date/Status assertions on Patient rows; list each as "expected to change in UAT #1" before implementation.
3. **Commit discipline**: one commit per extractor type; each commit passes `npm test` green. No multi-type commits.
4. **Don't skip**: resist the "just extend getResourceDate with more fields" temptation — the extractor is per-type, not per-field (UAT gap root_cause note).

**Phase mapping:** **Phase 34 (UAT follow-ups)** — UAT #1 is first task. Acceptance criterion: test delta must be in SAME commit as behavior delta.

**Sources:** 30-UAT.md gaps (UAT#1 section); MILESTONES.md Phase 29.5 (test-baseline drift war).

---

### Pitfall 19: Design token drift — new components hardcode Mantine theme colors instead of `var(--accent)` / `var(--ink-*)`

**What goes wrong:**
Phase 30 introduced `src/styles/tokens.css` with `--accent`, `--ink`, `--panel`, etc. Phase 30 components consume these via CSS modules or inline styles. v1.5 new components (validator status line, EFF-R14 providers' UI, 14 extension module tabs, per-type quality matrix) are written by a different phase / different engineer and default to Mantine theme props (`color="indigo"`, `c="dimmed"`). The two systems LOOK identical on first glance (both render indigo text) but diverge on:
- Dark mode (future): tokens track dark mode; Mantine colors don't automatically.
- Theme swaps: changing the accent token updates all token-consuming components; Mantine-color components need a rewrite.
- Pixel-exact match: Phase 30's `oklch(54% 0.17 262)` accent is NOT Mantine's default indigo-6 — subtle color drift.

Worse: some v1.5 components will mix — a button using tokens and a label using Mantine colors within the same card. Looks broken.

**Why it happens:**
Mantine is the path of least resistance (single prop `color="indigo"`); tokens.css requires knowing the name. Documentation surface is low.

**Warning signs:**
- Diff-review surfaces a mix of `color="indigo"` and `style={{ color: 'var(--accent)' }}` in the same commit
- Visual regression tests (if they exist) show 1-2 pixel color difference between v1.4 and v1.5 components
- Future dark-mode work requires auditing every new component

**Prevention strategy:**
1. **Document the token system** in CLAUDE.md or a `src/styles/README.md`: "All new UI MUST use var(--accent), var(--ink-*), var(--panel-*). Mantine theme colors are used ONLY inside Mantine primitives where the theme prop is the API (e.g., Button color='indigo' is OK since it internally resolves to --accent via theme override). Custom CSS MUST use tokens."
2. **ESLint rule / grep CI check**: grep new src/ files for `#[0-9a-f]{3,6}` hex literals or `rgb(`/`rgba(` → flag as "use tokens".
3. **Code-review checklist**: "Does this component use tokens?" as explicit PR gate.
4. **Pattern library**: create a single `src/components/ui/StatusLine.tsx` that all panels consume. Shared components = shared tokens.
5. **Theme integration check**: verify `theme.primaryColor = 'indigo'` actually resolves to `var(--accent)` via theme overrides (Phase 30 work — confirm still in place).

**Phase mapping:** **Phase 31, 32, 33, 34 ALL** — cross-cutting. Roadmap adds "token compliance" to each phase's VERIFY block.

**Sources:** `src/styles/tokens.css`; Phase 30 SUMMARY.md; MANTINE 8 theming docs.

---

### Pitfall 20: Accessibility — 21 module swatches with hue-only differentiation fails color-blindness simulation

**What goes wrong:**
Even assuming Pitfall 15 is solved via custom palette (21 unique hues), the dashboard MII tile grid and MII tab pills will fail deuteranopia/protanopia/tritanopia simulations. 21 hues compressed into a red-green-insensitive perceptual space collapse into ~12 visually-distinct clusters. Users with red-green CVD (8% of European-descent males) can't distinguish 6-8 tile pairs.

**Why it happens:**
Hue alone is insufficient for 21-way discrimination at the brightness levels used in a data-dense UI.

**Warning signs:**
- Accessibility UAT (deuteranopia simulation in Chrome DevTools → Rendering → Emulate vision deficiencies) reveals indistinguishable tiles
- Users with CVD report difficulty navigating the MII grid
- Color-only cues (no label, no shape) in any UI element

**Prevention strategy:**
1. **Mandatory non-color cue per module**: module label always visible; icon/glyph per module or per category; count as primary mono identifier (already the Phase 30 pattern for Dashboard MII tiles — extend to tabs).
2. **Simulator pass as a VERIFY step**: manual UAT in Phase 33 explicitly includes "deuteranopia simulation of /patients/:id tab bar".
3. **High-contrast mode**: provide a toggle that renders all tabs with border-only differentiation (no color fill) — useful for CVD AND for dense-info scenarios.
4. **Category-based color strategy (Pitfall 15)**: 5-7 categories × distinguishable hues >> 21 modules × tight hues.
5. **WCAG 1.4.1 compliance**: document in the phase audit.

**Phase mapping:** **Phase 33 (MII extension modules)** — pre-task A decision includes a11y consideration.

**Sources:** WCAG 1.4.1; Chrome DevTools vision deficiency emulation.

---

## Technical Debt Patterns

| Shortcut | Immediate Benefit | Long-term Cost | When Acceptable |
|----------|-------------------|----------------|-----------------|
| Skip CORS root-cause surfacing in external validator demote | Phase 31 ships faster | Users can't diagnose their own validator setup; support burden | Never — one small branch in `tryExternal.catch` |
| Per-metric providers without composer component | Phase 32 ships with 8 providers quickly | Every test file pays 9-line wrapping tax; new metric = 10-file change | Never — composer adds 20 lines, saves hundreds |
| Keep `keepMounted` on all 21 MII tabs | Simpler Phase 33 | 22 concurrent FHIR searches on patient load; browser-level queueing; 3-5s TTI | Never — extension tabs MUST lazy-load |
| Skip probe-cache reset on settings change | Phase 31 ships faster | Stale probe entries cause silent strategy demotion after settings change | Never — one `useEffect` dep |
| Ship UAT #6 matrix without waiting for EFF-R14 | Users see the matrix sooner | 2450 cell re-renders per quality run; jank users will notice | Acceptable WITH explicit `React.memo` scaffold + "TODO: remove after EFF-R14" comment |
| Hardcode color values instead of tokens | Single-component shipping velocity | Dark-mode effort compounds; theme swaps require rewrite | Never — copy-paste from tokens.css is 1 line |
| Skip per-type `extraQuery` refactor (keep plain string) | Phase 33 Task 1 is shorter | Multi-type modules with filters render wrong | Never — migration is mechanical |
| Defer CORS docs addition to v1.6 | Phase 31 scope smaller | Every new user files the same support ticket | Acceptable if docs debt is added to v1.6 triage queue with explicit pointer |

---

## Integration Gotchas

| Integration | Common Mistake | Correct Approach |
|-------------|----------------|------------------|
| External FHIR validator (validator.fhir.org) | Assuming CORS is configured | Surface CORS errors explicitly; document local HAPI container as alternative |
| External FHIR validator (Firely) | Assuming severity mapping matches HAPI | Record validator variant; test per-variant fixtures |
| Blaze `$validate` (server tier of cascade) | Calling `$validate` without checking capability statement | Reuse `resolveBackends` pattern that already does capability probing |
| Blaze per-patient `Specimen?subject=Patient/{id}` | Using `patient=` as the search param (Specimen uses `subject=`) | Per-type `patientSearchParam` override |
| Blaze per-patient `Observation?category=laboratory` for multi-type module | Appending to multi-type search URL uniformly | Per-type `extraQuery` record |
| MII Terminology Server (Ontoserver) for extension-module CodeableConcept | Assuming cache is shared across v1.4 and v1.5 modules | LRU cache keys already include code+system; extension modules reuse transparently — verify no key namespace collision |
| `@mantine/hooks` `useLocalStorage` from PHI gate | Assuming `true`-boolean round-trip | Mantine serializes via `JSON.stringify`; phiGate.ts must accept both `'true'` and `JSON.parse('true')` (29-02 Task 1 Test 3 locks this) |
| `@medplum/core` `client.search()` for non-Patient types | Using `.search('Specimen', ...)` (Medplum may not resolve non-Medplum types) | Use `client.get(client.fhirUrl(...).toString())` pattern per KNOWN constraint |
| `@mantine/notifications` toast for external timeout | Message includes user input / OperationOutcome text | Message uses typed `ActiveStrategy` union only (T-29-02-07 in 29-02 threat model) |

---

## Performance Traps

| Trap | Symptoms | Prevention | When It Breaks |
|------|----------|------------|----------------|
| 22 concurrent FHIR searches on `/patients/:id` mount (all modules keepMounted) | Patient page TTI degrades 5×; Blaze request timeouts under load | Lazy-load extension modules; count-only probes in tab labels; collapsed-by-default extension section | First load of any patient after Phase 33 ships (i.e., every load) |
| External validator timeout cascading per-resource | 1000-sample run takes 1000 × 15s = 4+ hours | Probe-cache-hit short-circuits after 1st timeout; always-fresh on button click | First sample-size run after external-timing-out |
| Per-metric providers without memoization → re-subscription loops | "Maximum update depth exceeded" error | Template each provider on a memoized-value pattern; CI smoke test | Immediately on provider mount |
| Per-type quality matrix re-rendering all 350 cells per metric update | Visible jank on 7-metric quality run | EFF-R14 ships FIRST; matrix FIRST uses selector hook | After Phase 32 and Phase 34 both ship — if ordering reversed, at load |
| Probe cache never invalidated across settings changes | Stale probe strategy persists for session lifetime | Reset probe on settings change OR on "Validate sample" click | After first settings-change mid-session |
| 14 Mantine colors × 21 modules in the dashboard tile grid → color collisions degrade Grid scanning | Users can't visually locate a specific module | Category-based color strategy; label is primary identifier | Immediately at launch |
| No CORS preflight result cached for repeat external validator fetches | Each `$validate` POST pays preflight roundtrip (~100-300ms) | Browser caches preflight per `Access-Control-Max-Age`; rely on validator's header | First use; subsequent within cache window are fine |

---

## Security Mistakes

| Mistake | Risk | Prevention |
|---------|------|------------|
| PHI gate bypass via refactoring the check out of per-resource scope | PHI leaks to external validator without user consent | Lock the per-resource gate via a regression test (29-02 Task 4 Test 2); never hoist |
| PHI gate not re-evaluated between resources in a long run | User revokes consent mid-run, next resource still leaks | Re-check `isPhiAcknowledged` before EVERY external fetch, not once per run |
| Log external validator URL in toast message with PHI interpolated | PHI surfaces in DevTools console, screenshot, and bug reports | Toast uses typed union only (ActiveStrategy); no user-supplied strings interpolated |
| Probe cache leaks across sessions or tabs | Stale strategy carries credential assumptions | In-memory Map (as designed); not persisted to localStorage |
| Extension module queries use `subject=` which exposes more references than intended | `subject` is broader than `patient` (Specimen.subject can be Group not just Patient) — theoretical scope expansion | Use the most-specific search param per type; document choice in module config JSDoc |
| External validator URL includes credentials in query string | Credentials in URL surface in server logs and browser history | Strip query-string credentials in a settings-parse validator; warn if `url` contains `@` |
| Normalizer drops `diagnostics` containing PHI on log path | PHI in validator diagnostics logged to console | Never `console.log` raw OperationOutcome issues; keep the React-escaped table as the only surface |

---

## UX Pitfalls

| Pitfall | User Impact | Better Approach |
|---------|-------------|-----------------|
| All 14 extension modules always visible with "No data found" | Cold/typical datasets show a wall of empty tabs; users can't find the populated ones | Auto-hide zero-count extensions; show a "Show empty" toggle |
| External validator silently falls back without explanation | Users think the external is broken; actual cause (CORS, timeout, HTTP 500) hidden | Show cause in toast: "timed out", "CORS blocked", "HTTP 500" — differentiated |
| Dashboard MII tile "count" ambiguous (per-patient vs server-wide) | User believes counts are scoped to current patient; they're server-wide | Explicit label: "Across server" on dashboard tiles; scoped counts on patient detail (UAT #5 fix) |
| Probe cache makes external validator "sticky-off" after one timeout | User configures validator, it fails once, never retries → user assumes not configured | Always-fresh on button click; add explicit "Retry external" affordance |
| Extension-module tabs color-collision degrades visual scanning | Users can't remember which color is which module across sessions | Color by category (5-7 categories, semantic); label always visible; icon per module |
| 21 tabs overflow on narrow viewport (<1200px) | Horizontal scroll + lost tab context | Virtualize tab row OR collapse extensions section by default |
| "Active strategy: server" with no cue it demoted | User doesn't know the external was tried and failed | Show previous strategy in tooltip: "Demoted from external at 12:34:56 (timeout after 15s)" |

---

## "Looks Done But Isn't" Checklist

- [ ] **UX-01 external validator cascade**: Often missing CORS surfacing in the demote notification — verify `TypeError: Failed to fetch` branches into a user-visible message, not just silent demote
- [ ] **UX-01 probe cache**: Often missing settings-change invalidation — verify changing `externalValidator.url` in settings causes the next run to re-probe
- [ ] **UX-01 PHI gate**: Often missing per-resource re-check — verify the gate is called inside `tryExternal` per fetch, not once per batch
- [ ] **UX-01 server tier**: Often missing AbortSignal threading — verify `remoteValidator.ts` accepts and uses `signal`
- [ ] **UX-01 normalizer**: Often missing multi-validator fixture tests — verify Firely and HAPI variants both parse without info/warning drift
- [ ] **EFF-R14 providers**: Often missing the composer component — verify `<QualityMetricsProviders>` exists and is used by tests
- [ ] **EFF-R14 placement**: Often co-located with panels — verify all providers live at `QualityLayout` level
- [ ] **EFF-R14 re-render isolation**: Often all-tiles-rerender regression — verify with React DevTools Profiler that only the updated tile re-renders
- [ ] **EFF-R14 memoization**: Often skipped on one provider — grep all 8 provider files for `useMemo` around the value object
- [ ] **MII schema widen**: Often missing helper utilities — verify `getTypesForModule`, `findModuleForType` exist and every caller uses them
- [ ] **MII schema widen**: Often missing fixture migration — verify test fixtures updated in same commit as schema change
- [ ] **MII per-type extraQuery**: Often missing per-type granularity — verify Pathologie (multi-type) has per-type query where needed
- [ ] **MII per-type patientSearchParam**: Often missing Specimen `subject=` vs Observation `patient=` — verify each multi-type module query succeeds on live Blaze
- [ ] **MII color strategy**: Often 21 colors, same Mantine palette — verify category-based strategy implemented OR custom palette added
- [ ] **MII a11y**: Often missing deuteranopia simulation pass — verify manual UAT includes vision-deficiency check
- [ ] **MII concurrent fetch**: Often all-tabs-keepMounted — verify extension tabs DROP keepMounted or use throttled prefetch
- [ ] **MII empty state**: Often always-shown extensions — verify auto-hide-zero-count default with explicit toggle
- [ ] **UAT #1 Explorer Date/Status**: Often test delta in separate commit from behavior delta — verify single commit touches both
- [ ] **UAT #4 per-patient empty panels**: Often treated as a Phase 30 regression — verify investigation identifies it as a pre-existing patient-search-param issue
- [ ] **UAT #5 Dashboard MII tile counts**: Often "fixed" by labelling without scoping — verify the UX decision (scope vs label) is explicit in the phase acceptance criteria
- [ ] **UAT #6 per-type quality matrix**: Often shipped before EFF-R14 — verify phase ordering makes Phase 34 depend on Phase 32
- [ ] **Design tokens**: Often mixed with Mantine color props in new components — grep new files for hardcoded hex / `color="indigo"` → should be zero new additions
- [ ] **Test baseline**: Often drifts on every PR — verify each PR preserves 836 passing / 0 failing baseline; any test addition comes with the production delta

---

## Recovery Strategies

| Pitfall | Recovery Cost | Recovery Steps |
|---------|---------------|----------------|
| PHI gate bypass in merged code | **HIGH** (security regression) | Immediate revert; audit logs for any external validator calls post-merge; release emergency patch; notify users |
| Probe cache never invalidated (users report stale strategy) | LOW | Hotfix: reset probeCacheRef on settings change; one-line fix + test; ship |
| CORS blocking ignored (silent demote) | LOW | Documentation update + improved demote notification copy; cosmetic patch |
| EFF-R14 split causes re-render loop (Maximum update depth) | MEDIUM | Revert Phase 32; investigate missing `useMemo`; re-apply with tests; 1-2 day delay |
| EFF-R14 one provider shadows others (7/8 metrics show em-dash) | LOW | Confirm each provider uses its own context symbol; rename if shared; 2-hour fix |
| MII schema widen breaks all callers silently | MEDIUM | Revert; add helper utilities first; migrate callers; re-apply schema change — phase-level redo |
| Multi-type module with wrong per-type patientSearchParam returns empty | LOW | Per-type override added to module config; unit test; hotfix |
| 21 tabs slow patient page load (real user complaint) | MEDIUM | Drop keepMounted from extensions immediately; count-only probe as follow-up; UI regression minimal |
| Color collision UX complaint | LOW | Category color strategy applied post-hoc; palette swap is a CSS change; no code architecture change |
| Design token drift scattered across components | MEDIUM | Grep + rewrite sweep over a cleanup phase (v1.6 Phase XX); not urgent, just debt |

---

## Pitfall-to-Phase Mapping

| Pitfall | Prevention Phase | Verification |
|---------|------------------|--------------|
| 1. AbortController not threaded through server tier | **Phase 31 (UX-01)** | `grep -n signal src/quality/remoteValidator.ts` ≥1 match; integration test asserts fetch aborted |
| 2. Probe cache not scoped per-serverUrl / invalidated | **Phase 31 (UX-01)** | Settings-change test; `useConformanceRun` resets probe on settings change |
| 3. PHI gate bypass via refactoring | **Phase 31 (UX-01)** | 29-02 Task 1 Test 4 + Task 4 Test 2 LOCK invariant; no deferral |
| 4. Tier-switch thrashing / sticky server | **Phase 31 (UX-01)** | Always-fresh probe on Validate sample click; document behavior |
| 5. OperationOutcome severity drift across validators | **Phase 31 (UX-01)** | Normalizer test matrix covers HAPI + Firely + IG-Publisher fixtures |
| 6. CORS not surfaced | **Phase 31 (UX-01)** | Distinguish `TypeError: Failed to fetch` in demote notify; docs addition |
| 7. QualityMetricsContext providers share context symbol | **Phase 32 (EFF-R14)** | Each provider has own `createContext`; smoke test asserts 8/8 populate |
| 8. Re-subscription loops from non-memoized setters | **Phase 32 (EFF-R14)** | `useMemo` wrap on every provider value; smoke test for Maximum-update-depth |
| 9. Lost updates on panel unmount mid-compute | **Phase 32 (EFF-R14)** | Providers composed at QualityLayout level; regression test |
| 10. Test setup complexity (8× wrap) | **Phase 32 (EFF-R14)** | `<QualityMetricsProviders>` composer; tests use it |
| 11. 21 concurrent FHIR searches on patient mount | **Phase 33 (MII extensions)** | Extension tabs drop keepMounted; count-only probe; network-request count test |
| 12. Per-module extraQuery breaks on multi-type | **Phase 33 (MII extensions)** | `extraQuery: Record<string, string>`; per-type unit test |
| 13. `MII_MODULES.find(m => fhirResourceType === X)` breaks | **Phase 33 (MII extensions)** | Helper utilities added FIRST; grep for direct comparisons = 0 outside mii-modules.ts |
| 14. Per-type patientSearchParam mismatch | **Phase 33 (MII extensions)** | Per-type override support; live-Blaze UAT each multi-type module |
| 15. Color collision 14 Mantine colors × 21 modules | **Phase 33 (MII extensions)** | Pre-task A: color strategy decision; a11y audit |
| 16. Empty state clutter from rare-data extension modules | **Phase 33 (MII extensions)** | Auto-hide zero-count extensions; toggle to show |
| 17. Per-type quality matrix blocked on EFF-R14 | **Phase 34 (UAT follow-ups)** depends on **Phase 32** | Roadmap ordering explicit |
| 18. Explorer Date/Status extractor test drift | **Phase 34 (UAT follow-ups)** | TDD: new tests first, fail, then implement; one-commit discipline |
| 19. Design token drift | **Phases 31, 32, 33, 34 ALL** | Per-phase VERIFY grep: `# new components using tokens`; no hex literals |
| 20. A11y color-blindness failure | **Phase 33 (MII extensions)** | Deuteranopia simulation pass; label always primary; non-color cues |

---

## Inter-phase Integration Risks

| Phase pair | Conflict risk | Mitigation |
|---|---|---|
| **Phase 31 (UX-01) ↔ Phase 32 (EFF-R14)** | Both can run in parallel per PROJECT.md "UX-01 validator and EFF-R14 are independent". But Phase 32 touches `ValidationPanel.tsx` consumption of `overallValidation`; Phase 31 also touches `ValidationPanel.tsx` for status line. Merge conflict likely. | Serialize within `ValidationPanel.tsx`: Phase 31 ships first, Phase 32 rebases. OR one engineer owns both for the panel. |
| **Phase 32 (EFF-R14) ↔ Phase 34 UAT#6 (per-type matrix)** | Hard dependency: matrix perf requires per-metric context | Roadmap strict ordering: Phase 32 FIRST, Phase 34 matrix card AFTER |
| **Phase 33 (MII extensions) ↔ Phase 34 UAT#5 (dashboard MII tile scoping)** | Both touch Dashboard MII tile grid; schema change (multi-type) affects tile generation logic | Sequence: Phase 34 UAT#5 ships on BASE 7 modules first (behavior decision); Phase 33 extends the decision to 21 tiles |
| **Phase 33 (MII extensions) ↔ Phase 34 UAT#4 (empty per-patient panels)** | UAT#4 investigation may reveal a per-type patientSearchParam bug that applies to BASE modules; fix propagates to extensions | Sequence: UAT#4 investigation FIRST (possibly a quick task inside Phase 33 kickoff) |
| **Phase 31 (UX-01) ↔ Phase 34 UAT#2 (HumanReadableView cleanup)** | Independent files; no overlap | No coordination needed |
| **Phase 31 (UX-01) ↔ Phase 34 UAT#3 (ResourceDetailPage mode toggle)** | Independent files; no overlap | No coordination needed |
| **All v1.5 phases ↔ design tokens (Phase 30 baseline)** | Every phase adds new components risking token drift | Every phase adds token-compliance grep to VERIFY block |
| **All v1.5 phases ↔ v1.4 test baseline (836 passing)** | Every phase adds tests AND refactors existing ones; test baseline drift risk (29.5 pattern) | Every phase tracks baseline delta in SUMMARY.md; phase close-out checks 836+ passing / 0 failing |

---

## Sources

**Primary (inspected at file:line references):**
- `.planning/PROJECT.md` (v1.5 milestone scope, Ordering notes)
- `.planning/MILESTONES.md` (v1.4 accomplishments, Phase 29.5 test-baseline pattern)
- `.planning/phases/29-backlog-ux/29-02-PLAN.md` (preserved UX-01 plan — pitfalls #1-#6 ground on this plan's task list)
- `.planning/phases/30-layout-redesign/30-UAT.md` (6 UAT follow-ups — pitfalls #17-#18 ground on gap records)
- `.planning/milestones/v1.4-research/PITFALLS.md` (v1.4 baseline; pitfalls #1, #2, #7, #19 reuse its patterns)
- `src/components/quality/ValidationPanel.tsx:71-79,100-107,167-205,235-294` (inline PHI gate + inline normalizer + producer useEffect)
- `src/components/quality/OverviewStrip.tsx:67` (the single consumer that binds EFF-R14 risk)
- `src/quality/QualityMetricsContext.tsx:107-173` (monolithic context — split target)
- `src/utils/mii-modules.ts:15-103` (schema — widening target)
- `src/components/patients/MiiModuleTabs.tsx:65,86-88` (keepMounted on all tabs — concurrent-fetch risk)
- `src/components/patients/MiiModuleTab.tsx:59-81` (per-module FHIR search in useEffect)
- `src/hooks/useResourceCounts.ts` (cache + cancellation pattern for lazy-count reuse)
- `src/App.tsx:84-167` (provider chain order — Settings → Connection → Terminology → Routes)
- `src/styles/tokens.css` (Phase 30 token definitions — `--accent`, `--ink-*`, `--panel-*`)

**Secondary (analytical, not directly verified):**
- Mantine 8 Tabs documentation (keepMounted behavior; known constraint)
- FHIR R4 spec on OperationOutcome.issue.severity and Specimen.subject
- MDN CORS docs (HTTP 1.1 6-per-origin limit; preflight behavior)
- WCAG 1.4.1 (color alone not sole identifier)
- Validator implementation variance: HAPI (validator.fhir.org), Firely, HL7 IG-Publisher, Ontoserver — behavioral drift is analytical, not directly tested

**Confidence ratings per pitfall:**
- HIGH (direct code inspection): #1, #2, #7, #8, #10, #11, #12, #13, #15, #16, #17, #18, #19
- MEDIUM-HIGH (analytical + baseline pattern match): #3, #4, #9, #14, #20
- MEDIUM (analytical, per-vendor claim): #5 (severity drift), #6 (CORS behavior well-known, per-validator CORS config not verified)

---

*Pitfalls research for: v1.5 Validation, Performance & MII Extensions (FHIR Exploder)*
*Researched: 2026-04-23*
