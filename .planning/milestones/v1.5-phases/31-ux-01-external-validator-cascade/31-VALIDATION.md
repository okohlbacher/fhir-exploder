---
phase: 31
slug: ux-01-external-validator-cascade
status: complete
nyquist_compliant: true
wave_0_complete: true
created: 2026-04-29
backfilled: true
backfilled_by: phase-39
notes: |
  Retroactive validation strategy authored 2026-04-29 under Phase 39 NYQ-01
  to close the v1.5 audit-trail gap for phases that bypassed the
  validation-strategy gate at execution time. Phase 31 shipped 33 new tests
  across phiGate, normalizers, cascadingValidator, and the
  ValidationPanel.phi-gate.integration regression suite (test baseline
  836 → 869 passing). Per-REQ coverage exists for VAL-01..05 in those test
  files; the Nyquist sampling threshold is met by the per-task /
  per-tier-decision coverage. nyquist_compliant flipped to true based on
  retroactive review of the post-Phase 31 test inventory (no test files
  authored under this Phase 39 backfill).
---

# Phase 31 — Validation Strategy

> Retroactive per-phase validation contract — backfilled 2026-04-29 under Phase 39 NYQ-01.
>
> Phase 31 (UX-01 external validator cascade) shipped its full test surface across plans 31-01 and 31-02 but did not author a VALIDATION.md at execution time. This file documents the validation contract that was *de facto* satisfied by the existing test inventory.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | Vitest 4.1.4 + @testing-library/react 16.3.2 + jsdom 29.0.2 |
| **Config file** | `vitest.config.ts` (existing) |
| **Quick run command** | `npx vitest run src/quality/__tests__/phiGate.test.ts src/quality/__tests__/normalizers.test.ts src/quality/__tests__/cascadingValidator.test.ts src/components/quality/__tests__/ValidationPanel.phi-gate.integration.test.tsx` |
| **Full suite command** | `npm test` |
| **Estimated runtime** | ~25 s (post-Phase 31 baseline 869 passing) |

---

## Sampling Rate

- **After every task commit:** `npx vitest run <files-touched>` (<2 s targeted)
- **After every plan wave:** `npm test` full suite + `npx tsc -b --noEmit`
- **Before `/gsd-verify-work`:** full suite green (≥ 869 passing / 0 failing)
- **Max feedback latency:** 60 s

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Threat Ref | Secure Behavior | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|------------|-----------------|-----------|-------------------|-------------|--------|
| 31-01-01 | 01 | 1 | VAL-01 | — | PHI gate consulted before external fetch | unit | `npx vitest run src/quality/__tests__/phiGate.test.ts` | ✅ | ✅ green |
| 31-01-02 | 01 | 1 | VAL-02 | — | OperationOutcome normalizer handles HAPI/Firely/IG-Publisher shapes | unit | `npx vitest run src/quality/__tests__/normalizers.test.ts` | ✅ | ✅ green |
| 31-01-03 | 01 | 1 | VAL-03 | — | 3-tier cascade demotes external→server→local on timeout/CORS | unit | `npx vitest run src/quality/__tests__/cascadingValidator.test.ts` | ✅ | ✅ green |
| 31-01-04 | 01 | 1 | VAL-04 | — | AbortSignal threaded through ValidationBackend.validate; unmount aborts external + server fetch | unit | `npx vitest run src/quality/__tests__/cascadingValidator.test.ts` | ✅ | ✅ green |
| 31-01-05 | 01 | 1 | VAL-05 | — | Probe cache 3-part key + per-type reset on Validate-sample click | unit | `npx vitest run src/quality/__tests__/cascadingValidator.test.ts` | ✅ | ✅ green |
| 31-02-01 | 02 | 2 | VAL-01 (CR-01) | — | UI↔cascade PHI ack key agreement at integration level | integration | `npx vitest run src/components/quality/__tests__/ValidationPanel.phi-gate.integration.test.tsx` | ✅ | ✅ green |
| 31-02-02 | 02 | 2 | all | — | Full regression: 869+ passing / 0 failing + tsc clean | aggregate | `npm test && npx tsc -b --noEmit` | ✅ | ✅ green |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

Wave 0 complete retroactively. All 4 cited test files already exist post-Phase 31 close (verified via `ls src/quality/__tests__/{phiGate,normalizers,cascadingValidator}.test.ts src/components/quality/__tests__/ValidationPanel.phi-gate.integration.test.tsx`). No framework installs needed.

---

## Manual-Only Verifications

All Phase 31 acceptance criteria have automated coverage. Live-Blaze UAT against a real HAPI external validator was deferred to Phase 38's HUMAN-UAT walk (covered there as a sub-task; not in scope for this VALIDATION.md).

---

## Validation Sign-Off

- [x] All tasks have `<automated>` verify or Wave 0 dependencies
- [x] Sampling continuity: no 3 consecutive tasks without automated verify
- [x] Wave 0 covers all MISSING references (none — all test files existed at phase close)
- [x] No watch-mode flags (`vitest run`, not `vitest`)
- [x] Feedback latency < 60s (full suite ~25s)
- [x] `nyquist_compliant: true` set in frontmatter

**Approval:** approved 2026-04-29 (retroactive backfill via Phase 39 NYQ-01)
