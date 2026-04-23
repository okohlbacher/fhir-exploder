---
phase: 31-ux-01-external-validator-cascade
plan: 01
subsystem: validation
tags: [validation, fhir, cascade, phi-gate, abort-controller, probe-cache, cors, mantine-toast]

# Dependency graph
requires:
  - phase: 05
    provides: ValidationPanel + structural/remote validator backends (PHI gate + $validate path)
  - phase: 07
    provides: PHI acknowledgement gate (localStorage key `quality.validation.phiAcknowledged.v1`) — invariant preserved verbatim
  - phase: 16
    provides: useConformanceRun batch validator with cancelledRef pattern
  - phase: 24
    provides: `${serverUrl}::${resourceType}` flat-string key convention mirrored in the 3-part probe key
provides:
  - Reusable `phiGate.ts` (PHI_ACK_KEY_PREFIX, phiAckKey, isPhiAcknowledged)
  - Shared `normalizeOperationOutcomeIssue` mapper for OperationOutcome → NormalizedIssue
  - `cascadingValidator.ts` three-tier validator (external → server $validate → local structural) with PHI-gated external tier, AbortController timeout, 3-part probe cache, D-19 CORS heuristic, and D-20 AbortSignal threading
  - Widened `ValidationBackend.validate(resource, options?: { signal?: AbortSignal })` (D-20)
  - `validation.externalValidator: { url, enabled, timeoutMs?, label? }` settings schema extension with backward-compatible deepMerge narrowing
  - `useConformanceRun` cascade wiring: per-hook useRef<Map> probe cache, settings-change full-wipe, per-type reset on "Validate sample" click, unmount AbortController.abort(), `activeStrategy` + `activeStrategyVariant` return state
  - `Active strategy: external (HAPI) | server | local` status line in `ValidationPanel`
  - Three real-shape OperationOutcome fixtures (HAPI / Firely / IG-Publisher) + 30 new unit tests
affects: [Phase 32 EFF-R14 QualityMetricsContext split — merge-conflict surface in ValidationPanel.tsx status-line block + useConformanceRun.ts; any future v1.6+ Wrapper URL-shape phase]

# Tech tracking
tech-stack:
  added: []  # zero new runtime deps (STACK.md invariant)
  patterns:
    - "3-part probe cache key `${serverUrl}::${externalValidatorUrl}::${resourceType}` — matches Phase 24's `::` separator convention"
    - "PHI gate extracted as a pure localStorage read with fetch-spy regression test locking zero-fetch-before-consent"
    - "CORS heuristic via `error instanceof TypeError && !controller.signal.aborted` (no OPTIONS preflight)"
    - "AbortSignal threaded through `ValidationBackend.validate` options param so unmount aborts both external fetch and server $validate"
    - "Per-resource dedup by `(resourceId|field|description)` key — prevents cascade/conformance overlap from inflating rollup denominators"

key-files:
  created:
    - src/quality/phiGate.ts
    - src/quality/normalizers.ts
    - src/quality/cascadingValidator.ts
    - src/quality/__tests__/phiGate.test.ts
    - src/quality/__tests__/normalizers.test.ts
    - src/quality/__tests__/cascadingValidator.test.ts
    - src/quality/__tests__/fixtures/normalizers/hapi-required-binding.json
    - src/quality/__tests__/fixtures/normalizers/firely-preferred-binding.json
    - src/quality/__tests__/fixtures/normalizers/ig-publisher-slice-fail.json
    - .planning/todos/completed/2026-04-14-add-external-validator-integration-for-full-fhir-validate.md (D-16 retroactive stub)
  modified:
    - src/quality/types.ts (widened ValidationBackend.validate signature — D-20)
    - src/quality/remoteValidator.ts (thread options?.signal into MedplumClient.post's 4th arg — D-20)
    - src/quality/structuralValidator.ts (accept options for interface symmetry — D-20)
    - src/config/types.ts (validation.externalValidator block — D-07 + D-18)
    - src/config/settings.ts (deepMerge field-level narrowing — D-07 + D-18)
    - public/settings.yaml (commented externalValidator example block)
    - src/hooks/useConformanceRun.ts (cascade wiring + probe cache + unmount abort + activeStrategy/activeStrategyVariant)
    - src/components/quality/ValidationPanel.tsx (PHI gate + normalizer imports; Active-strategy status line; migrated all 4 run.legacyIssues consumers to allNormalizedIssues / validationIssueListSource — B-1)

key-decisions:
  - "Preserved legacy PHI localStorage key shape `quality.validation.phiAcknowledged.v1:${serverUrl}|${externalUrl ?? 'none'}` so pre-existing user acknowledgements continue to resolve"
  - "3-part probe key (serverUrl, externalValidatorUrl, resourceType) — not nested Map — matches Phase 24 convention and keeps cache trivially inspectable in DevTools"
  - "Probe cache reset semantics: full-wipe on ANY externalValidator settings change (JSON.stringify-serialized dep) + per-type delete on every 'Validate sample' click (D-17)"
  - "Validator variant detection via URL-pattern heuristic + optional `label` override (D-18) — no Capability Statement query (rejected: 200-500ms latency for cosmetic label)"
  - "CORS heuristic via `TypeError && !signal.aborted` — no OPTIONS preflight (D-19). Distinct blue toast with 8000ms autoClose, separate from timeout's 5000ms toast"
  - "AbortSignal threaded through `ValidationBackend.validate` options param (not factory arg, not second method) — additive non-breaking widening (D-20)"
  - "Validator.fhir.org intentionally mis-labelled as HAPI (W-3 known limitation) — Wrapper URL-shape support deferred to v1.6+. Test 13 in cascadingValidator.test.ts locks the mis-identification so the future update site is obvious"
  - "B-1 migrated all four run.legacyIssues consumers in ValidationPanel to allNormalizedIssues / validationIssueListSource — post-cascade, legacyIssues is permanently empty and ValidationIssueList now receives a back-converted NormalizedIssue→AttributedIssue stream"
  - "B-2 per-resource dedup of [...validateConformance output, ...cascade output] by (resourceId|field|description) key inside useConformanceRun prevents setOverallValidation's affected-resource denominator from being inflated by cascade/conformance overlap"

patterns-established:
  - "Pattern 1: Extract-then-share — inline logic in a UI component (PHI gate literal, OperationOutcome mapper) is extracted to a module before being reused by a new non-UI consumer. Regression contract (fetch-spy) moves with the extraction"
  - "Pattern 2: Probe cache as a caller-owned Map — hooks pass their useRef<Map> into the pure validator function. Keeps the validator synchronously testable (no React context dependency) while giving the hook full control over cache lifecycle"
  - "Pattern 3: Caller abort + tier-local timeout — caller owns `opts.abort` (unmount); the external tier allocates its own `timeoutController` and chains `opts.abort.signal -> timeoutController.abort()` via `addEventListener('abort', ..., { once: true })` in a finally-removed listener"
  - "Pattern 4: Forward-migration over reverse-mapping — B-1 migrated consumers TO the new canonical shape rather than reverse-mapping cascade output back to the legacy AttributedIssue. NormalizedIssue is now the single-source post-Phase-31 contract"

requirements-completed: [VAL-01, VAL-02, VAL-03, VAL-04, VAL-05]

# Metrics
duration: ~45min (autonomous execution)
completed: 2026-04-23
---

# Phase 31 Plan 01: UX-01 External Validator Cascade Summary

**Three-tier FHIR validator cascade (external HTTP → server `$validate` → local structural) wired into `ValidationPanel` with PHI-gated external tier, 15s AbortController timeout, distinct blue toasts for timeout vs CORS, 3-part probe cache, D-20 unmount-safe AbortSignal threading, and an `Active strategy: external (HAPI) | server | local` status line.**

## Performance

- **Duration:** ~45 min (autonomous)
- **Started:** 2026-04-23T18:23Z (after baseline test suite verified 836 passing)
- **Completed:** 2026-04-23T18:40Z
- **Tasks:** 6 (all committed atomically)
- **Files changed:** 17 (1,103 insertions / 57 deletions)
- **Test delta:** 836 → 866 passing (+30 new tests across phiGate, normalizers, cascadingValidator)

## Accomplishments

- **Three-tier cascade** in `src/quality/cascadingValidator.ts` — external (PHI-gated, AbortController-wrapped, 15s default timeout) → server `$validate` → local structural. Probe cache per `(serverUrl, externalValidatorUrl, resourceType)` with full-wipe on settings change and per-type delete on "Validate sample" click.
- **PHI gate extraction** — reusable `phiGate.ts` consumed by both the UI Alert in `ValidationPanel` AND the cascade's external tier. Fetch-spy regression test locks the D-09 contract that the gate triggers zero network calls.
- **Normalizer extraction** — `normalizeOperationOutcomeIssue` shared across validators, with real-shape fixtures from HAPI, Firely, and IG-Publisher locking severity-drift behavior per PITFALLS #5.
- **D-20 AbortSignal threading** — widened `ValidationBackend.validate(resource, options?: { signal?: AbortSignal })` — unmount aborts both external fetch (via chained signal) and server `$validate` (via `client.post(path, resource, undefined, { signal })`).
- **Settings schema extension** — `validation.externalValidator: { url, enabled, timeoutMs?, label? }` with field-level deepMerge narrowing; backward-compatible when block absent; commented example in `public/settings.yaml`.
- **Active-strategy status line** — `<Text size="xs" c="dimmed">Active strategy: external (HAPI)</Text>` above the issue tabs in `ValidationPanel`; variant label resolved via URL-pattern heuristic or user-provided `label` override.
- **B-1 legacy consumer migration** — all four `run.legacyIssues` consumers in `ValidationPanel` (JSON export payload, empty-state alert, render-gate, `<ValidationIssueList>`) migrated to `allNormalizedIssues` / `validationIssueListSource`. Issue List tab renders cascade+conformance issues via a back-converted `NormalizedIssue → AttributedIssue` memo.
- **B-2 per-resource dedup** — inside `useConformanceRun`, `[...validateConformance output, ...cascade output]` dedupes by `(resourceId|field|description)` before flowing to `batchConformanceIssues`, preventing `percentClean`'s affected-resource denominator from being inflated by cascade/conformance overlap.

## Task Commits

Each task committed atomically on `worktree-agent-ab5fbe0a`:

1. **Task 1: Extract PHI gate** — `f9550f6` (refactor)
2. **Task 2: Extract normalizer + HAPI/Firely/IG-Publisher fixtures** — `7996692` (refactor)
3. **Task 3: Settings schema extension (validation.externalValidator)** — `8913d2b` (feat)
4. **Task 4: cascadingValidator + 3-part probe cache + D-19 CORS + D-20 AbortSignal** — `16953e6` (feat)
5. **Task 5: Wire cascade + Active-strategy status line + migrate legacyIssues consumers (B-1/B-2/W-2)** — `b22adf8` (feat)
6. **Task 6: Todo audit + baseline verification (D-16)** — `b7dc40e` (chore)

All commits used `--no-verify` per parallel-executor protocol.

## Files Created/Modified

**Created:**
- `src/quality/phiGate.ts` (40 lines) — PHI_ACK_KEY_PREFIX, phiAckKey, isPhiAcknowledged
- `src/quality/normalizers.ts` (39 lines) — normalizeOperationOutcomeIssue
- `src/quality/cascadingValidator.ts` (240 lines) — validateWithCascade, probeKey, clearProbeCache, resetProbeForType, detectValidatorVariant
- `src/quality/__tests__/phiGate.test.ts` (48 lines, 6 tests)
- `src/quality/__tests__/normalizers.test.ts` (109 lines, 11 tests)
- `src/quality/__tests__/cascadingValidator.test.ts` (322 lines, 13 tests)
- 3 OperationOutcome fixtures under `src/quality/__tests__/fixtures/normalizers/`
- `.planning/todos/completed/2026-04-14-add-external-validator-integration-for-full-fhir-validate.md` (D-16 stub)

**Modified:**
- `src/quality/types.ts` — D-20 widening of `ValidationBackend.validate`
- `src/quality/remoteValidator.ts` — thread `options?.signal` into `MedplumClient.post` 4th arg
- `src/quality/structuralValidator.ts` — accept `_options` for interface symmetry
- `src/config/types.ts` — `externalValidator` block (url/enabled/timeoutMs/label)
- `src/config/settings.ts` — deepMerge narrowing for `externalValidator`
- `public/settings.yaml` — commented example block
- `src/hooks/useConformanceRun.ts` — cascade wiring (useRef<Map> probe cache, settings-change full-wipe, per-type reset, unmount abort, activeStrategy/activeStrategyVariant)
- `src/components/quality/ValidationPanel.tsx` — phiAckKey + Active-strategy status line + B-1 migration of 4 legacyIssues consumers

## Decisions Made

See `key-decisions` frontmatter. All locked-in-plan decisions (D-07..D-21) implemented; no divergences.

## Deviations from Plan

**None — plan executed exactly as written.**

All plan-checker revisions (B-1, B-2, W-1, W-2, W-3) were pre-embedded in the plan file and implemented as specified. No runtime bugs required Rule-1/2/3 auto-fixes during execution. One small judgement call:

- **Dropped `legacyNormalizedIssues` useMemo in `ValidationPanel.tsx`** — the plan removed 4 `run.legacyIssues` consumers (lines 209, 387, 395, 407), but the upstream `legacyNormalizedIssues` useMemo (line 167 pre-migration) still read `run.legacyIssues`. Post-cascade it produces an always-empty array that was merged into `allNormalizedIssues` alongside the cascade stream. Removing the dead memo kept `grep -c "run.legacyIssues" ValidationPanel.tsx` at 0 (per plan verification item #23) and simplified `allNormalizedIssues` to a single-source dedup pass over `conformanceIssues`. The unused `normalizeOperationOutcomeIssue` import was also removed to satisfy `noUnusedLocals`. This is a cleanup consequence of the B-1 migration, not a scope change.

## Verification Evidence

**Full test suite** (`npx vitest run`):
```
Test Files  97 passed | 3 skipped (100)
     Tests  866 passed | 22 todo (888)
```
Baseline was 836 passing; Phase 31 added exactly 30 new tests (6 phiGate + 11 normalizers + 13 cascadingValidator) — no regressions.

**TypeScript** (`npx tsc -b --noEmit`): clean (zero output).

**Build** (`npm run build`): clean (vite chunk-size warning pre-existing, unrelated to Phase 31).

**Grep audits:**
- `grep -rn "quality.validation.phiAcknowledged.v1" src/ | grep -v phiGate.ts` → 0 matches
- `grep -rn "severity === 'fatal'" src/components/ src/quality/ | grep -v normalizers.ts | grep -v __tests__` → 0 matches
- `grep -rn "import.*axios\|import.*ky" src/quality/` → 0 matches (STACK.md "zero new runtime deps")
- `grep -c "validateWithCascade" src/hooks/useConformanceRun.ts` → 3
- `grep -c "clearProbeCache" + "resetProbeForType" src/hooks/useConformanceRun.ts` → 4 (D-17 reset semantics wired)
- `grep -c "Active strategy" src/components/quality/ValidationPanel.tsx` → 1
- `grep -c "externalValidator" src/config/types.ts` → 2 (JSDoc + field)
- `grep -c "externalValidator" public/settings.yaml` → 1
- `grep -c "options?: { signal" src/quality/types.ts` → 1 (D-20 widening)
- `grep -c "signal" src/quality/remoteValidator.ts` → 3 (options arg + threading into client.post)
- `grep -c "autoClose: 5000" src/hooks/useConformanceRun.ts` → 1 (D-10 timeout toast)
- `grep -c "autoClose: 8000" src/hooks/useConformanceRun.ts` → 1 (D-19 CORS toast)
- `grep -c "run.legacyIssues" src/components/quality/ValidationPanel.tsx` → 0 (B-1 migration complete)
- `grep -c "validationIssueListSource" src/components/quality/ValidationPanel.tsx` → 2 (declaration + usage)
- `grep -c "mergedForThisResource" src/hooks/useConformanceRun.ts` → 2 (B-2 dedup)
- `grep -c "const ext = settings" src/hooks/useConformanceRun.ts` → 1 (W-2 destructure)
- `grep -c "settings.validation.externalValidator.url" src/hooks/useConformanceRun.ts` → 0 (all accesses via `ext?.`)
- `grep -c "advanceTimersByTimeAsync" src/quality/__tests__/cascadingValidator.test.ts` → 1 (W-1 timer fix)
- `grep -c "validator.fhir.org" src/quality/__tests__/cascadingValidator.test.ts` → 1 (W-3 known-limitation lock test)
- `grep -c "KNOWN LIMITATION" src/quality/cascadingValidator.ts` → 1 (JSDoc on detectValidatorVariant)

## Decision-Coverage Summary

| Decision | Implementing Task | Evidence |
|----------|-------------------|----------|
| D-07 (externalValidator schema) | Task 3 | src/config/types.ts + settings.ts + public/settings.yaml |
| D-08 (cascade order) | Task 4 | validateWithCascade external → server → local |
| D-09 (PHI gate re-evaluation per-fetch) | Task 1 + Task 4 | phiGate.test.ts Test 5 + cascadingValidator.test.ts Test 2 |
| D-10 (timeout toast copy + autoClose: 5000) | Task 4 + Task 5 | cascadingValidator notify('timeout') + useConformanceRun toast |
| D-11 (Active-strategy status line) | Task 5 | ValidationPanel `<Text size="xs" c="dimmed">` above issue tabs |
| D-12 (normalizer + ≥5 tests + 3 fixtures) | Task 2 | normalizers.ts + 11 tests + HAPI/Firely/IG-Publisher fixtures |
| D-13 (HAPI URL shape only) | Task 4 | tryExternal constructs `{url}/{Type}/$validate?profile=...` |
| D-16 (todo state idempotent audit) | Task 6 | pending/ does not exist; both todos in completed/ |
| D-17 (3-part probe key + reset semantics) | Task 4 + Task 5 | probeKey + clearProbeCache + resetProbeForType + settings-change effect |
| D-18 (label field + detectValidatorVariant) | Task 3 + Task 4 + Task 5 | label in types.ts + detectValidatorVariant heuristic + status-line variant suffix |
| D-19 (CORS heuristic + locked toast copy) | Task 4 + Task 5 | tryExternal TypeError catch + useConformanceRun 8000ms toast |
| D-20 (AbortSignal threading) | Task 4 + Task 5 | types.ts widening + remoteValidator threading + abortRef.current.abort() on unmount |

## Plan-Checker Revision Coverage

| Revision | Implementing Task | Evidence |
|----------|-------------------|----------|
| B-1 (migrate legacyIssues consumers) | Task 5 step (k) | 4 consumers in ValidationPanel now use allNormalizedIssues / validationIssueListSource; grep `run.legacyIssues` returns 0 |
| B-2 (per-resource dedup cascade + conformance) | Task 5 step (f) | `mergedForThisResource` + `seenKeys` deduplicate before push to `batchConformanceIssues` |
| W-1 (`advanceTimersByTimeAsync` for microtask flush) | Task 4 Test 3 | `await vi.advanceTimersByTimeAsync(150)` with JSDoc explaining why |
| W-2 (`const ext = settings?.validation?.externalValidator` destructure) | Task 5 step (f) | single destructure in useConformanceRun; zero `settings.validation.externalValidator.url` chains |
| W-3 (validator.fhir.org → HAPI mis-id lock + JSDoc) | Task 4 | detectValidatorVariant KNOWN LIMITATION JSDoc + Test 13 locking the behavior |

## STRIDE Mitigation → Test Mapping

| Threat | Mitigation Test |
|--------|------------------|
| T-31-03 (PHI gate bypass) | `phiGate.test.ts` Test 5 (fetch-spy zero-before-consent) + `cascadingValidator.test.ts` Test 2 (external fetch never fired when localStorage empty) |
| T-31-04 (Timeout exhaustion / hang post-unmount) | `cascadingValidator.test.ts` Test 3 (timeout path) + Test 7 (caller-abort mid-fetch) |
| T-31-05 (OperationOutcome schema drift) | `normalizers.test.ts` Tests 9/10/11 (HAPI/Firely/IG-Publisher fixtures) |
| T-31-06 (Probe cache staleness after settings swap) | `cascadingValidator.test.ts` Tests 9/10 (clearProbeCache + resetProbeForType) |
| T-31-07 (Settings deepMerge parse error) | Covered by manual schema review + `npx tsc -b` strict-null-check pass (no dedicated test file at plan's assumed path) |
| T-31-08 (Log injection via diagnostics) | TypeScript union type check — `payload.to` is `ActiveStrategy` enum (not a user string) |
| T-31-10 (AbortSignal integrity — orphan requests) | `cascadingValidator.test.ts` Test 7 + grep `grep -c "signal" src/quality/remoteValidator.ts` → 3 |

## Known Stubs

None — all pathways are wired end-to-end. The `externalValidator` settings block ships disabled-by-default; users opt in via `public/settings.yaml`. No placeholders, no hardcoded empty-UI fallbacks.

## Threat Flags

No new security-relevant surface introduced outside the plan's `<threat_model>`. All outbound network calls already covered by T-31-01..T-31-10.

## Issues Encountered

- **Unused `normalizeOperationOutcomeIssue` import in ValidationPanel after B-1 migration** — after removing the `legacyNormalizedIssues` useMemo (dead code post-cascade), the normalizer import became unused and violated `noUnusedLocals`. Dropped the import. Still consumed by `cascadingValidator.ts` (external-tier mapper), which preserves Task 2's "single-source normalizer" invariant.

## Next Phase Readiness

- **Phase 32 (EFF-R14 QualityMetricsContext split)** can now rebase safely. Merge-conflict surface is:
  - `ValidationPanel.tsx` — the Active-strategy status line insertion above the issue tabs + the new `validationIssueListSource` useMemo
  - `useConformanceRun.ts` — the cascade call block + probe cache refs + activeStrategy return state
  - `setOverallValidation` call at `ValidationPanel.tsx` lines 188-193 — UNCHANGED by Phase 31
- Phase 31 leaves zero new runtime dependencies (STACK.md invariant preserved), zero retry-with-backoff surface (FEATURES.md §2.b anti-feature preserved), and zero OPTIONS preflight probes (D-19 design constraint preserved).

## Self-Check

- [x] `src/quality/phiGate.ts` exists → FOUND
- [x] `src/quality/normalizers.ts` exists → FOUND
- [x] `src/quality/cascadingValidator.ts` exists → FOUND
- [x] `src/quality/__tests__/phiGate.test.ts` exists → FOUND
- [x] `src/quality/__tests__/normalizers.test.ts` exists → FOUND
- [x] `src/quality/__tests__/cascadingValidator.test.ts` exists → FOUND
- [x] 3 fixture JSON files exist under `src/quality/__tests__/fixtures/normalizers/` → FOUND
- [x] Commit `f9550f6` (Task 1) → FOUND
- [x] Commit `7996692` (Task 2) → FOUND
- [x] Commit `8913d2b` (Task 3) → FOUND
- [x] Commit `16953e6` (Task 4) → FOUND
- [x] Commit `b22adf8` (Task 5) → FOUND
- [x] Commit `b7dc40e` (Task 6) → FOUND

## Self-Check: PASSED

---
*Phase: 31-ux-01-external-validator-cascade*
*Completed: 2026-04-23*
