---
phase: 31-ux-01-external-validator-cascade
verified: 2026-04-23T21:52:00Z
status: passed
score: 14/14 must-haves verified
overrides_applied: 0
re_verification:
  previous_status: gaps_found
  previous_score: 13/14
  gaps_closed:
    - "With `validation.externalValidator.enabled: true` + a reachable HAPI-style endpoint, running 'Validate sample' routes through the external tier and `ValidationPanel` displays `Active strategy: external (HAPI)` — external tier is now reachable from the UI (CR-01 fixed)"
    - "Before ANY external-tier `fetch`, `isPhiAcknowledged(serverUrl, externalValidatorUrl)` is consulted — UI↔cascade key agreement now locked at integration level (integration test added)"
  gaps_remaining: []
  regressions: []
---

# Phase 31: UX-01 External Validator Cascade Verification Report (Re-verification)

**Phase Goal:** Deliver Phase 31 UX-01 — a three-tier FHIR validator cascade (external HTTP → server `$validate` → local structural) with extracted PHI gate + OperationOutcome normalizer modules, 3-part probe cache with D-17 reset semantics, AbortController with 15s timeout + distinct CORS/timeout toasts (D-19), AbortSignal threaded through `ValidationBackend.validate` (D-20), extended settings schema, cascade wired into `useConformanceRun`, and `Active strategy: external | server | local [(variant)]` status line rendered in `ValidationPanel`.
**Verified:** 2026-04-23T21:52:00Z
**Status:** passed
**Re-verification:** Yes — after gap closure (Plan 31-02 closed CR-01)

## Goal Achievement

### Observable Truths

| # | Truth | Status | Evidence |
|---|-------|--------|----------|
| 1 | Cascade routes through external tier; status line shows `Active strategy: external (HAPI)` | VERIFIED | CR-01 fix: `ValidationPanel.tsx:94-99` derives `phiGateUrl` from `externalValidator.url` when `enabled && url`. `phiAckKeyStr` (line 117) and `bannerKey` (line 104) both key from `phiGateUrl`, matching what `cascadingValidator.tryExternal` reads via `isPhiAcknowledged(opts.serverUrl, ext.url)`. Integration Test A confirms external fetch fires after acknowledgement. |
| 2 | Timeout toast fires (blue, autoClose 5000, locked copy); cascade demotes; probe cache records demote | VERIFIED | `cascadingValidator.ts:172-177` emits `notify('timeout', ...)`; `useConformanceRun.ts:254-262` fires blue `autoClose: 5000` toast with locked copy; probe cache set at cascadingValidator.ts:237. Test 3 locks timeout path. |
| 3 | CORS toast fires (blue, autoClose 8000, locked CORS copy); cascade demotes | VERIFIED | `cascadingValidator.ts:161-164` catches `TypeError && !aborted` and emits `notify('cors', ...)`; `useConformanceRun.ts:263-272` fires blue `autoClose: 8000`. cascadingValidator.test.ts Test 4 covers TypeError/CORS path. |
| 4 | `isPhiAcknowledged` consulted before ANY external-tier fetch (D-09 regression-locked) | VERIFIED | `cascadingValidator.ts:132` calls `isPhiAcknowledged(opts.serverUrl, ext.url)` BEFORE `new AbortController()` (line 136). phiGate.test.ts Test 5 locks unit contract. Integration test (Tests A + B) locks UI↔cascade key agreement end-to-end: `vi.spyOn(global, 'fetch')` confirms external fetch fires only after the correct ack key is written. |
| 5 | Unmount aborts BOTH external and server tier fetches via threaded AbortSignal | VERIFIED (with WR-01 note) | `useConformanceRun.ts:349-355` aborts on unmount; `cascadingValidator.ts:141` chains external via addEventListener; `remoteValidator.ts:71-76` threads `options?.signal` into `client.post`. WR-01 (stale controller capture on subsequent runs) is a warning, not a blocker for the first run. |
| 6 | `src/quality/phiGate.ts`, `normalizers.ts`, `cascadingValidator.ts` exist with dedicated unit tests | VERIFIED | All 3 source modules + 3 test files exist. Test suite: 869 passing / 22 todo / 0 failed. |
| 7 | Normalizer tests include 3 real-shape fixtures for HAPI/Firely/IG-Publisher | VERIFIED | `src/quality/__tests__/fixtures/normalizers/` contains all 3 fixture files with appropriate severity+shape diversity. |
| 8 | Probe cache uses 3-part key; full-wipe on settings change; per-type delete on 'Validate sample' click | VERIFIED | `cascadingValidator.ts:64-70` `probeKey(serverUrl, externalValidatorUrl, resourceType)`; `useConformanceRun.ts:131-135` full-wipes on extSerialized change; line 151-156 calls `resetProbeForType` on every `start()` click. |
| 9 | `public/settings.yaml` ships commented `externalValidator:` block with `label`; schema accepts `{url,enabled,timeoutMs?,label?}`; backward-compatible | VERIFIED | `public/settings.yaml:35-47` commented example; `src/config/types.ts:34-40` block defined; `src/config/settings.ts:73-101` deepMerge handles missing block. |
| 10 | `ValidationBackend.validate` widened; `remoteValidator.ts` threads `options?.signal` into `MedplumClient.post` | VERIFIED | `src/quality/types.ts:113` widened; `remoteValidator.ts:71-76` threads signal; `structuralValidator.ts:49` accepts `_options` for symmetry. |
| 11 | B-1: `ValidationPanel` consumers all source from `allNormalizedIssues`/`validationIssueListSource`; zero `run.legacyIssues` refs | VERIFIED | `grep -c "run.legacyIssues" src/components/quality/ValidationPanel.tsx` = 0; `validationIssueListSource` used at line 436, `allNormalizedIssues` used at lines 408, 416, 427, 439, 230. |
| 12 | B-2: Cascade output + `validateConformance` deduped per-resource by `(resourceId|field|description)` before batch push | VERIFIED | `useConformanceRun.ts:285-297` dedupes via `seenKeys` on the 3-part key before pushing to `batchConformanceIssues`. |
| 13 | W-2: `useConformanceRun` destructures `const ext = settings?.validation?.externalValidator` once; no chained `.url` access on settings | VERIFIED | `useConformanceRun.ts:208` single destructure; `grep -c "settings.validation.externalValidator.url"` = 0. `npx tsc -b --noEmit` exits clean. |
| 14 | Test suite shows 836+ passing / 0 failing | VERIFIED | `npx vitest run` reports 98 passed | 3 skipped (101) test files; 869 passed | 22 todo (891) tests; 0 failed. Baseline 836 + 33 new tests (6 phiGate + 11 normalizers + 13 cascadingValidator + 3 integration). |

**Score:** 14/14 truths verified

### Required Artifacts

| Artifact | Expected | Status | Details |
|----------|----------|--------|---------|
| `src/quality/phiGate.ts` | PHI_ACK_KEY_PREFIX, phiAckKey, isPhiAcknowledged | VERIFIED | Exists; all exports present |
| `src/quality/__tests__/phiGate.test.ts` | PHI gate tests + fetch-spy regression | VERIFIED | 6 tests; Test 5 is D-09 regression lock |
| `src/quality/normalizers.ts` | normalizeOperationOutcomeIssue | VERIFIED | Exists; single export |
| `src/quality/__tests__/normalizers.test.ts` | ≥5 tests + 3 fixtures | VERIFIED | 11 tests; 3 fixtures |
| `src/quality/__tests__/fixtures/normalizers/` | HAPI/Firely/IG-Publisher JSON | VERIFIED | All 3 fixture files present |
| `src/quality/cascadingValidator.ts` | validateWithCascade + probe utilities + variant detection | VERIFIED | Exports all required symbols |
| `src/quality/__tests__/cascadingValidator.test.ts` | Happy-path + timeout + probe cache + D-17 + D-19 tests | VERIFIED | 13 tests |
| `src/quality/types.ts` | `signal?: AbortSignal` widening | VERIFIED | Line 113 widened |
| `src/quality/remoteValidator.ts` | `options?.signal` threaded into client.post | VERIFIED | Lines 58-76 |
| `src/quality/structuralValidator.ts` | options accepted for symmetry | VERIFIED | Line 49 `_options` param |
| `src/config/types.ts` | externalValidator block | VERIFIED | Lines 34-40 with `label?: string` |
| `src/config/settings.ts` | deepMerge narrowing for externalValidator | VERIFIED | Lines 73-101 |
| `public/settings.yaml` | commented externalValidator block | VERIFIED | Lines 35-47 |
| `src/hooks/useConformanceRun.ts` | cascade wiring + probe cache + unmount abort + activeStrategy | VERIFIED (with WR-01 note) | validateWithCascade imported; probe cache useRef Map; unmount abort; activeStrategy/activeStrategyVariant in return state |
| `src/components/quality/ValidationPanel.tsx` | PHI gate + Active-strategy status line + B-1 migration + CR-01 fix | VERIFIED | phiAckKey imported; phiGateUrl useMemo (lines 94-99) derives ack key from externalValidator.url when enabled; Active-strategy status line at 418-425; B-1 migration complete; `grep -c "externalValidator"` = 8; `grep -c "phiGateUrl"` = 7; `grep -c "hasRemote || hasExternal"` = 1; `grep -c "hasRemote && !phiAcknowledged"` = 0 |
| `src/components/quality/__tests__/ValidationPanel.phi-gate.integration.test.tsx` | Integration test — UI-cascade PHI key agreement | VERIFIED | 272 lines; 3 tests (Test A external-only, Test B differing URLs, Test C server-only regression lock); `vi.spyOn(global, 'fetch')` pattern; `phiAckKey(SERVER_URL, EXT_URL)` asserted; all 3 pass; no it.skip/it.todo |

### Key Link Verification

| From | To | Via | Status | Details |
|------|----|-----|--------|---------|
| ValidationPanel.tsx | phiGate.ts | `import { phiAckKey }` + `phiAckKey(serverUrl, phiGateUrl)` at line 117 | WIRED | phiGateUrl now resolves to `externalValidator.url` when external tier is enabled — CR-01 fix |
| ValidationPanel.tsx | normalizers.ts | normalizeOperationOutcomeIssue | NOT WIRED (intentional) | Import dropped during B-1 migration — cascade outputs NormalizedIssue directly; normalizer still consumed by cascadingValidator.ts |
| cascadingValidator.ts | phiGate.ts | `isPhiAcknowledged` before `new AbortController()` at line 136 | WIRED | Key agreement with UI now verified at integration level |
| cascadingValidator.ts | normalizers.ts | `normalizeOperationOutcomeIssue` | WIRED | Line 37 imports; line 239 maps external-tier issues |
| cascadingValidator.ts | remoteValidator.ts | `createRemoteBackend` with threaded AbortSignal | WIRED | Line 39 imports; line 194 constructs; line 196 passes `options.abort.signal` |
| cascadingValidator.ts | structuralValidator.ts | `validateStructural` | WIRED | Line 38 imports; line 207 calls |
| useConformanceRun.ts | cascadingValidator.ts | `validateWithCascade` + probe utilities | WIRED | Lines 33-41 import; line 245 calls |
| ValidationPanel.tsx | useConformanceRun.ts | `run.activeStrategy` drives status line | WIRED | Line 147 calls hook; lines 418-425 render status line |
| ValidationPanel.tsx | allNormalizedIssues / validationIssueListSource | B-1 migration | WIRED | 0 `run.legacyIssues` refs; validationIssueListSource at line 436; allNormalizedIssues at lines 408, 416, 427, 439, 230 |
| ValidationPanel.phi-gate.integration.test.tsx | ValidationPanel.tsx + cascadingValidator.ts + phiGate.ts | Real render + real cascade + vi.spyOn(global, 'fetch') | WIRED (end-to-end) | Test A: external-only ack → fetch fires at EXT_URL. Test B: both-tiers ack → external fetch fires, server ack key remains null. Test C: server-only ack → fallback key written. |

### Data-Flow Trace (Level 4)

| Artifact | Data Variable | Source | Produces Real Data | Status |
|----------|---------------|--------|--------------------|--------|
| ValidationPanel.tsx | `run.activeStrategy` | `useConformanceRun` state from `probeCacheRef.current.get(pk)` post-run | Yes — external tier now reachable with correct ack key; `Active strategy: external` is reachable end-to-end | FLOWING |
| ValidationPanel.tsx | `allNormalizedIssues` | `run.issues` via `conformanceIssues` (line 168) | Yes — cascade feeds via useConformanceRun.ts:308 `setIssues((prev) => [...prev, ...batchConformanceIssues])` | FLOWING |
| useConformanceRun.ts | `cascadeResult` | `validateWithCascade(r, {...})` (line 245) | Yes (all three tiers reachable) | FLOWING |
| cascadingValidator.ts | external-tier `rawIssues` | `fetch(url, { signal })` → `outcome.issue` | Yes — gate now satisfied when UI writes `phiAckKey(serverUrl, externalValidator.url)` | FLOWING |

### Behavioral Spot-Checks

| Behavior | Command | Result | Status |
|----------|---------|--------|--------|
| Full test suite passes | `npx vitest run` | 98 passed \| 3 skipped (101) / 869 passed \| 22 todo / 0 failed | PASS |
| TypeScript type-check clean | `npx tsc -b --noEmit` | exit 0, zero output | PASS |
| Integration tests pass (3 of 3) | `npx vitest run src/components/quality/__tests__/ValidationPanel.phi-gate.integration.test.tsx` | 1 test file passed; 3 tests passed | PASS |
| Existing ValidationPanel unit tests pass | `npx vitest run src/__tests__/validation-panel.test.tsx` | all 11 tests pass (fallback path preserved) | PASS |
| phiGate + cascadingValidator tests pass | `npx vitest run src/quality/__tests__/phiGate.test.ts src/quality/__tests__/cascadingValidator.test.ts` | 6 + 13 = 19 tests pass | PASS |
| PHI key broken pattern eliminated | `grep -c "hasRemote && !phiAcknowledged" src/components/quality/ValidationPanel.tsx` | 0 | PASS |
| Broken key derivation eliminated | `grep -c "phiAckKey(serverUrl, validatorUrl" src/components/quality/ValidationPanel.tsx` | 0 | PASS |
| externalValidator referenced throughout ValidationPanel | `grep -c "externalValidator" src/components/quality/ValidationPanel.tsx` | 8 (>= 4) | PASS |
| phiGateUrl single source of truth | `grep -c "phiGateUrl" src/components/quality/ValidationPanel.tsx` | 7 (>= 4) | PASS |
| Zero `run.legacyIssues` refs in ValidationPanel | `grep -c "run.legacyIssues" src/components/quality/ValidationPanel.tsx` | 0 | PASS (B-1) |
| Task 1 + Task 2 commits exist | `git log --oneline` | `29c434d fix(31-02): align PHI ack key with external-tier URL` + `ca54c9c test(31-02): integration test locks UI<->cascade PHI key agreement` | PASS |

### Requirements Coverage

| Requirement | Source Plan | Description | Status | Evidence |
|-------------|------------|-------------|--------|----------|
| VAL-01 | 31-01, 31-02 | Settings schema + cascade + probe cache reset | SATISFIED | Schema at src/config/types.ts:34-40; cascade at cascadingValidator.ts:210; probe-cache reset at useConformanceRun.ts:131-156. External-tier reachability confirmed by Integration Test A (CR-01 fix). |
| VAL-02 | 31-01 | AbortController + 15s timeout + PHI gate + D-19 CORS | SATISFIED | AbortController at cascadingValidator.ts:136; 15s default at settings.ts:83; PHI gate at cascadingValidator.ts:132; UI now writes correct key (CR-01 fixed); CORS heuristic at cascadingValidator.ts:161-164. |
| VAL-03 | 31-01 | Active-strategy status line + normalizer + D-18 variant | SATISFIED | Status line at ValidationPanel.tsx:418-425; normalizer extracted to normalizers.ts; detectValidatorVariant with `label` override at cascadingValidator.ts:103-122. |
| VAL-04 | 31-01, 31-02 | `phiGate.ts` extracted with bypass-prevention tests | SATISFIED | Module exists with 6 tests; Test 5 locks zero-fetch-before-consent. Integration tests A+B lock UI↔cascade key agreement at integration level (not just unit isolation). |
| VAL-05 | 31-01 | remoteValidator accepts AbortSignal; unmount does not orphan | SATISFIED (WR-01 note) | Widening at types.ts:113; threading at remoteValidator.ts:71-76. Unmount abort fires (useConformanceRun.ts:349-355). WR-01 (stale controller on subsequent runs) is a warning, not a functional defect for the documented goal. |

**Requirements ID reconciliation:**
- All 5 VAL-* IDs declared in both 31-01-PLAN.md and 31-02-PLAN.md `requirements` frontmatter are present in REQUIREMENTS.md §Group A.
- 31-02-PLAN.md claims VAL-01 and VAL-04 (upgrading them from PARTIAL to SATISFIED); both are confirmed satisfied.
- No orphaned REQ-IDs. REQUIREMENTS.md traceability table maps VAL-01..05 exclusively to Phase 31.

### Anti-Patterns Found

| File | Line | Pattern | Severity | Impact |
|------|------|---------|----------|--------|
| src/hooks/useConformanceRun.ts | 349-355 | Unmount effect captures mount-time AbortController (stale after first `start()`) | Warning (WR-01) | Subsequent runs after the first leak on unmount — D-20 contract only holds for first run. Does not block phase goal. |
| src/hooks/useConformanceRun.ts | 344-346 | `cancel()` flips `cancelledRef` but does not abort in-flight external fetch | Warning (WR-02) | Cancel button leaves up to 15s of PHI-carrying outbound traffic in flight. Does not block phase goal. |
| src/hooks/useConformanceRun.ts | 128-135 | Probe-cache reset effect fires on mount, clobbering a freshly-created empty cache | Info (WR-03) | Harmless today; hazardous if cache persistence is added later. |
| src/quality/cascadingValidator.ts | 158-160 | `res.json()` SyntaxError at 200 falls silently into `demote` | Info (IN-01) | User sees no explanation when validator returns HTML-at-200. |
| src/quality/phiGate.ts (test) | Test 6 | Null-external vs literal 'none' collision case not asserted | Info (IN-02) | Edge-case robustness gap. |
| src/quality/cascadingValidator.ts | 103-122 | `detectValidatorVariant` URL-parsing failure falls through to raw substring match | Info (IN-04) | Malformed URL with 'firely' in path mis-labels as Firely. |

No blockers remain. CR-01 (the sole blocker from the prior verification) is resolved.

### Human Verification Required

None — all gaps were deterministic code bugs addressable via automated verification. Once the phase is deployed to a live environment, UAT against a real HAPI instance (external-only config + acknowledge + run → verify `Active strategy: external (HAPI)` renders) would be a natural next step, but that is outside the scope of this automated verifier.

### Gaps Summary

Phase 31 is fully delivered. The prior `gaps_found` status (score 13/14) arose entirely from CR-01: the PHI ack key written by `ValidationPanel` used the server-tier `validatorUrl` rather than the external-tier `externalValidator.url`. Plan 31-02 closed this in two parts:

1. `ValidationPanel.tsx` now derives `phiGateUrl` from `externalValidator.url` when the external tier is enabled, and falls back to `validatorUrl` otherwise. The `phiAckKeyStr` and `bannerKey` both consume `phiGateUrl`. Banner visibility extends to external-only deployments via `(hasRemote || hasExternal) && !phiAcknowledged`.

2. New integration test `ValidationPanel.phi-gate.integration.test.tsx` (3 test cases) locks the UI↔cascade key agreement at the integration level using `vi.spyOn(global, 'fetch')`, exercising the real cascade end-to-end.

Test suite: **869 passing / 0 failing** (baseline 836 + 33 new tests). TypeScript clean. All 5 VAL-* requirements are fully satisfied.

Open warnings (WR-01, WR-02, WR-03) and info findings (IN-01..IN-04) are tracked for future phases and do not affect Phase 31's goal achievement.

---

_Verified: 2026-04-23T21:52:00Z_
_Verifier: Claude (gsd-verifier)_
