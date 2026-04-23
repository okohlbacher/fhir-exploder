---
phase: 31-ux-01-external-validator-cascade
plan: 02
subsystem: validation
tags: [validation, phi-gate, integration-test, gap-closure, cr-01]

# Dependency graph
requires:
  - phase: 31
    plan: 01
    provides: cascadingValidator + phiGate + ValidationPanel wiring (cascade external -> server -> local)
provides:
  - "PHI ack key derived from `externalValidator.url` when external tier is enabled (matches `cascadingValidator.tryExternal`'s `isPhiAcknowledged(serverUrl, ext.url)` read)"
  - "Banner visibility extended to (`hasRemote || hasExternal`) so external-only deployments render the PHI Alert"
  - "Banner copy displays the URL that will actually receive PHI (not always the server-tier URL)"
  - "Integration test (`ValidationPanel.phi-gate.integration.test.tsx`) locks UI<->cascade key agreement at the integration level (3 test cases)"
affects: [Phase 32 EFF-R14 — small additional merge surface in ValidationPanel.tsx (new `phiGateUrl` useMemo + `hasExternal` calc)]

# Tech tracking
tech-stack:
  added: []  # zero new runtime deps; zero new test deps
  patterns:
    - "Derived-URL useMemo with destructured-property deps: `[externalValidator?.enabled, externalValidator?.url, validatorUrl]` — fires only on the URL fields the cascade actually consults"
    - "Integration test pattern: vi.hoisted mutable settings ref + per-test reassignment + vi.spyOn(global, 'fetch') — mirrors the pattern used in src/__tests__/validation-panel.test.tsx but scoped under `src/components/quality/__tests__/`"
    - "Banner-URL display = `phiGateUrl ?? ''` — single source of truth so Tests B's assertion that the banner shows the EXTERNAL URL (not the server URL) when both are configured catches any future regression that would silently re-introduce the dual-URL display ambiguity"

key-files:
  created:
    - src/components/quality/__tests__/ValidationPanel.phi-gate.integration.test.tsx
  modified:
    - src/components/quality/ValidationPanel.tsx

key-decisions:
  - "`phiGateUrl` derives from `externalValidator.url` first (when `enabled && url`), else falls back to `validatorUrl ?? null` — preserves server-tier-only behavior while making external-only reachable"
  - "Banner visibility uses unified `requiresPhiAck = (hasRemote || hasExternal) && !phiAcknowledged` — both the disabled-button gate and the Alert render gate consume the same expression (single source of truth, no drift)"
  - "Integration test uses `vi.spyOn(global, 'fetch')` to assert the external fetch fires — does NOT mock `cascadingValidator` itself, exercising the real cascade module end-to-end from the UI"
  - "Test B asserts `screen.queryByText(SERVER_VAL_URL)` returns null when both tiers are configured — locks the design choice that the banner shows ONLY the URL that will actually receive PHI first (the external URL), not both URLs"
  - "Test C is a fallback-path regression lock — preserves the pre-CR-01 server-tier-only behavior so future refactoring cannot silently re-introduce the original bug only in the inverse direction"

patterns-established:
  - "Pattern: gap-closure plan tightly scoped to ONE production source file + ONE test file. Out-of-scope review findings (WR-01, WR-02, WR-03, IN-01..04) explicitly deferred and called out in summary, not silently fixed"

requirements-completed: [VAL-01, VAL-04]

# Metrics
duration: ~3min (autonomous execution)
completed: 2026-04-23
---

# Phase 31 Plan 02: UX-01 External Validator Cascade Gap Closure Summary

**Closes the CR-01 critical bug from 31-REVIEW.md: `ValidationPanel`'s PHI ack key now derives from `externalValidator.url` when the external tier is enabled, matching the key `cascadingValidator.tryExternal` reads via `isPhiAcknowledged(serverUrl, ext.url)`. Banner visibility extends to external-only deployments. Integration test locks the UI<->cascade key agreement at end-to-end level.**

## Performance

- **Duration:** ~3 min (autonomous, no checkpoints)
- **Started:** 2026-04-23T19:37:49Z
- **Completed:** 2026-04-23T19:41:00Z
- **Tasks:** 3 (Task 1 + Task 2 committed atomically; Task 3 is a verification-only no-commit task)
- **Files changed:** 2 (1 modified, 1 created)
- **Test delta:** 866 -> 869 passing (+3 new integration tests)

## Accomplishments

- **CR-01 fixed in production code (Task 1):**
  - `phiGateUrl` useMemo derives the PHI URL from `externalValidator.url` when `externalValidator.enabled && externalValidator.url`, falling back to `validatorUrl ?? null` otherwise.
  - `bannerKey` and `phiAckKeyStr` both consume `phiGateUrl` (single source of truth — no drift between dismissal scoping and ack scoping).
  - `hasExternal` calculated from `externalValidator?.enabled && url`; `requiresPhiAck = (hasRemote || hasExternal) && !phiAcknowledged`.
  - Alert render gate switched from inline `hasRemote && !phiAcknowledged` to the unified `requiresPhiAck` variable (consumed both by the disabled-button gate and the Alert visibility — they cannot drift).
  - Banner copy line `Validator URL: <code>{phiGateUrl ?? ''}</code>` (was `{validatorUrl}`) so the displayed URL matches the URL that will actually receive PHI.

- **CR-01 fixed in test coverage (Task 2):**
  - New file `src/components/quality/__tests__/ValidationPanel.phi-gate.integration.test.tsx` with 3 test cases:
    - **Test A (external-only):** banner renders, `EXT_URL` displayed, "I acknowledge" click writes `localStorage[phiAckKey(SERVER_URL, EXT_URL)] = 'true'`, "Validate sample" click triggers `global.fetch` call to a URL starting with `EXT_URL`.
    - **Test B (both tiers, differing URLs):** banner displays `EXT_URL` (NOT `SERVER_VAL_URL`), ack lands at the external-tier key (server-tier key remains null), external fetch fires.
    - **Test C (server-only):** banner displays `SERVER_VAL_URL`, ack writes to `phiAckKey(SERVER_URL, SERVER_VAL_URL)` (fallback-path regression lock).
  - All three tests pass on first run — no flake mitigation needed.

- **Full regression check (Task 3):**
  - `npx vitest run`: **98 passed | 3 skipped (101) test files; 869 passed | 22 todo (891) tests; 0 failed**.
  - `npx tsc -b --noEmit`: clean (zero output).
  - Targeted regression: 11 ValidationPanel + 6 phiGate + 13 cascadingValidator = 30 tests, all green.

## Task Commits

Each task committed atomically:

1. **Task 1: Fix PHI ack key alignment + banner visibility (CR-01)** — `29c434d` (fix)
2. **Task 2: Integration test — UI<->cascade PHI key agreement** — `ca54c9c` (test)
3. **Task 3: Full regression check + verification gap closure** — no commit (verification-only)

All commits used `--no-verify` per parallel-executor protocol.

## Files Created/Modified

**Created:**
- `src/components/quality/__tests__/ValidationPanel.phi-gate.integration.test.tsx` (272 lines, 3 tests) — integration test locking the CR-01 fix end-to-end via `vi.spyOn(global, 'fetch')`.

**Modified:**
- `src/components/quality/ValidationPanel.tsx` (35 insertions / 15 deletions)
  - Lines 84-86: destructured `externalValidator` from `settings.validation`.
  - Lines 88-99: new `phiGateUrl` useMemo — derives the active PHI URL.
  - Lines 101-110: `bannerKey` rewritten to consume `phiGateUrl`.
  - Lines 112-123: `phiAckKeyStr` rewritten to consume `phiGateUrl`.
  - Lines 261-269: `requiresPhiAck` rewritten with `hasExternal` calc and OR with `hasRemote`.
  - Line 296: Alert render gate switched to `{requiresPhiAck && (`.
  - Line 306: banner copy URL switched to `{phiGateUrl ?? ''}`.

## Decisions Made

See `key-decisions` frontmatter. The five key choices:

1. **External tier wins precedence in `phiGateUrl`** — when both are configured, the cascade fires external first (per D-08 in 31-01-PLAN.md), so the ack must protect the external URL. The server-tier ack is implicit (the user has already acknowledged that PHI may flow outbound, and the server-tier endpoint is a strict subset of the trust required for the external endpoint).
2. **Banner copy single-URL display** — Test B locks that ONLY the external URL is shown when both are configured. This is intentional UX: showing both URLs would clutter the banner and dilute user attention from the URL that will actually receive PHI first.
3. **`requiresPhiAck` consumed twice** — both the Validate-sample disabled gate AND the Alert visibility consume the same variable, ruling out future divergence.
4. **Test uses `vi.spyOn(global, 'fetch')`** — does NOT mock `cascadingValidator` itself, so the test exercises the real module end-to-end. A regression that re-introduces the key mismatch would fail Tests A and B.
5. **No changes to `cascadingValidator.ts`, `phiGate.ts`, or `useConformanceRun.ts`** — the cascade-side reads were already correct (per 31-REVIEW.md CR-01 analysis); the bug was UI-side only.

## Deviations from Plan

**None substantive — plan executed exactly as written.**

Two minor cosmetic notes:

1. **`grep -c "hapi.example.org"` literal-count interpretation.** The plan acceptance criterion specified `≥ 3` literal matches of `hapi.example.org`. The implementation defines `EXT_URL = 'https://hapi.example.org/baseR4'` once and references `EXT_URL` 14 times across Tests A and B. The literal `hapi.example.org` text appears once. The spirit of the criterion (URL exercised in multiple test points) is amply met; using a const is more idiomatic than inline literals. No code change made.

2. **Test assertions use `.toBeDefined()` + `.toBeNull()` rather than `.toBeInTheDocument()`.** Phase 31's existing test files (e.g. `src/__tests__/validation-panel.test.tsx`) use `.toBeDefined()` rather than `@testing-library/jest-dom`'s `.toBeInTheDocument()` matcher. This codebase does not import `@testing-library/jest-dom` globally, so I matched the surrounding convention. Functionally equivalent.

No Rule-1/2/3 auto-fixes were needed during execution. No CLAUDE.md directives were violated.

## Verification Evidence

**Full test suite** (`npx vitest run`):
```
Test Files  98 passed | 3 skipped (101)
     Tests  869 passed | 22 todo (891)
```
Baseline was 866 passing (Phase 31-01); this plan added exactly 3 new tests (Tests A, B, C) — no regressions.

**TypeScript** (`npx tsc -b --noEmit`): clean (zero output).

**Targeted regression** (`npx vitest run src/__tests__/validation-panel.test.tsx src/quality/__tests__/phiGate.test.ts src/quality/__tests__/cascadingValidator.test.ts`):
```
Test Files  3 passed (3)
     Tests  30 passed (30)
```

**Grep audits (production code):**
- `grep -c "externalValidator" src/components/quality/ValidationPanel.tsx` -> 8 (>= 4 expected)
- `grep -c "phiGateUrl" src/components/quality/ValidationPanel.tsx` -> 7 (>= 4 expected)
- `grep -c "hasRemote || hasExternal" src/components/quality/ValidationPanel.tsx` -> 1 (>= 1)
- `grep -c "requiresPhiAck && (" src/components/quality/ValidationPanel.tsx` -> 1 (>= 1)
- `grep -c "hasRemote && !phiAcknowledged" src/components/quality/ValidationPanel.tsx` -> 0 (broken pattern eliminated)
- `grep -c "phiAckKey(serverUrl, validatorUrl" src/components/quality/ValidationPanel.tsx` -> 0 (broken pattern eliminated)

**Grep audits (integration test):**
- `grep -c "vi.spyOn(global, 'fetch')" src/components/quality/__tests__/ValidationPanel.phi-gate.integration.test.tsx` -> 1 (>= 1)
- `grep -c "phiAckKey(SERVER_URL, EXT_URL)" src/components/quality/__tests__/ValidationPanel.phi-gate.integration.test.tsx` -> 3 (>= 1)
- `grep -c "EXT_URL" src/components/quality/__tests__/ValidationPanel.phi-gate.integration.test.tsx` -> 14 (deep coverage of external tier in tests A, B)
- `grep -c "it\\.skip\\|it\\.todo" src/components/quality/__tests__/ValidationPanel.phi-gate.integration.test.tsx` -> 0 (no skipped tests)

## Decision-Coverage Update

| 31-01 Decision | Status After 31-02 | Evidence |
|----------------|--------------------|----------|
| D-09 (PHI gate re-evaluated per-fetch) | **VERIFIED at integration level** — Tests A + B prove the gate write equals the gate read. Previously VERIFIED only at unit level. | New integration test |
| D-08 (cascade order external -> server -> local) | **VERIFIED at integration level** — Test B asserts the external fetch fires when both tiers are configured (server tier not silently preferred). | Test B |
| D-07 (`externalValidator` schema) | UNCHANGED (no schema modifications in 31-02) | n/a |
| All other D-* decisions | UNCHANGED — 31-02 is scoped to UI-side key derivation only | n/a |

## Plan-Checker Revision Coverage (from 31-01-PLAN.md)

All B-1, B-2, W-1, W-2, W-3 revisions remain VERIFIED as of Phase 31-01. No interaction with Phase 31-02's UI-side fix.

## STRIDE Mitigation -> Test Mapping

| Threat (from 31-02 plan) | Mitigation Test |
|--------------------------|-----------------|
| T-31-02-01 (Tampering — PHI ack key derivation) | Tests A, B, C all assert `localStorage.getItem(phiAckKey(...))` equals the expected key — direct integration coverage |
| T-31-02-02 (Information Disclosure — external-only no banner) | Test A renders `ValidationPanel` with external-only config and asserts the banner appears; if banner visibility regresses, Test A fails |
| T-31-02-03 (Repudiation — future refactor reintroduces mismatch) | Tests A + B run the real cascade against `vi.spyOn(global, 'fetch')`; any future code change that causes the UI-written ack to NOT satisfy the cascade gate will fail Tests A and B |

## Known Limitations / Out of Scope

The following 31-REVIEW.md findings remain OPEN — explicitly out of scope for this gap-closure plan:

| Finding | Severity | Recommended Future Phase |
|---------|----------|--------------------------|
| WR-01 (unmount abort captures stale controller) | Warning | Future phase or quick fix — change `useConformanceRun.ts:349-355` to read `abortRef.current` inside the cleanup |
| WR-02 (`cancel()` does not abort in-flight fetches) | Warning | Future phase or quick fix — `cancel()` should call `abortRef.current.abort()` and the outer try/catch should treat post-cancel AbortError as `cancelled` not `error` |
| WR-03 (probe-cache reset effect fires on mount) | Info | Future phase or quick fix — add `didMountRef` mount guard |
| IN-01 (silent demote on `res.json()` SyntaxError) | Info | Future phase — extend notify payload with optional `reason` |
| IN-02 (`phiAckKey` literal-`none` collision test missing) | Info | Future phase — add Test 6b assertion |
| IN-03 (variant-detection precedence comment missing) | Info | Future phase — add JSDoc comment |
| IN-04 (`detectValidatorVariant` URL-parse fallthrough) | Info | Future phase — return `null` on `URL` constructor throw |

These are tracked for future pickup, e.g., `/gsd-quick`. They do not block VAL-01 or VAL-04 acceptance.

## Known Stubs

None. The CR-01 fix wires production behavior end-to-end through the UI to the cascade. No placeholders, no hardcoded empty paths.

## Threat Flags

No new security-relevant surface. The fix REMOVES a security gap (T-31-02-02 — external-only deployments could not record acknowledgement) by extending banner visibility, and TIGHTENS T-31-02-01 (the tampering surface that produced CR-01) by aligning the UI-write key with the cascade-read key.

## Issues Encountered

None. All 3 integration tests passed on first run. TypeScript was clean throughout. No fix-attempt loop needed.

## Next Phase Readiness

- **Phase 32 (EFF-R14 QualityMetricsContext split):** small additional merge surface in `ValidationPanel.tsx` — the new `phiGateUrl` useMemo + `hasExternal` calc + the unified `requiresPhiAck` consumer are isolated to lines 84-123 and 261-271, away from the QualityMetrics-related `setOverallValidation` block at lines 226-230 (unchanged in this plan). Phase 32 should rebase cleanly.
- **Verification re-run:** `/gsd-verify-phase 31` should now flip Truth #1 and Truth #4 from PARTIAL to VERIFIED, raising the score from 13/14-effective to a clean 14/14.
- **VAL-01 and VAL-04 requirements:** both move from PARTIAL acceptance (code exists, integration not locked) to fully SATISFIED (integration test locks the contract).

## Self-Check

- [x] `src/components/quality/ValidationPanel.tsx` modified -> FOUND
- [x] `src/components/quality/__tests__/ValidationPanel.phi-gate.integration.test.tsx` exists -> FOUND
- [x] Commit `29c434d` (Task 1) -> FOUND
- [x] Commit `ca54c9c` (Task 2) -> FOUND
- [x] No commit for Task 3 (verification-only) -> CONFIRMED
- [x] `npx vitest run` -> 869 passed / 0 failed
- [x] `npx tsc -b --noEmit` -> exit 0, no output
- [x] `grep -c "externalValidator"` in ValidationPanel.tsx -> 8 (>= 4)
- [x] `grep -c "phiGateUrl"` in ValidationPanel.tsx -> 7 (>= 4)
- [x] `grep -c "hasRemote && !phiAcknowledged"` in ValidationPanel.tsx -> 0 (eliminated)

## Self-Check: PASSED

---
*Phase: 31-ux-01-external-validator-cascade*
*Plan: 02 (gap closure for CR-01)*
*Completed: 2026-04-23*
