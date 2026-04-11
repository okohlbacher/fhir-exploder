---
phase: 1
slug: foundation-blaze-connectivity
status: draft
nyquist_compliant: true
wave_0_complete: true
created: 2026-04-11
---

# Phase 1 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | vitest |
| **Config file** | vitest.config.ts (created in Plan 01 Task 1, Wave 0) |
| **Quick run command** | `npx vitest run --reporter=verbose` |
| **Full suite command** | `npx vitest run --reporter=verbose` |
| **Estimated runtime** | ~5 seconds |

---

## Sampling Rate

- **After every task commit:** Run `npx vitest run --reporter=verbose`
- **After every plan wave:** Run `npx vitest run --reporter=verbose`
- **Before `/gsd-verify-work`:** Full suite must be green
- **Max feedback latency:** 5 seconds

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Threat Ref | Secure Behavior | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|------------|-----------------|-----------|-------------------|-------------|--------|
| 1-01-01 | 01 | 1 | CONN-01 | — | N/A | unit | `npx vitest run` | ✅ W0 (Plan 01 Task 1) | ⬜ pending |
| 1-01-02 | 01 | 1 | CONN-02 | — | N/A | unit | `npx vitest run` | ✅ W0 (Plan 01 Task 1) | ⬜ pending |
| 1-02-01 | 02 | 2 | CONN-03 | — | N/A | unit | `npx vitest run` | ✅ W0 (Plan 01 Task 1) | ⬜ pending |
| 1-02-02 | 02 | 2 | CONN-04 | — | N/A | unit | `npx vitest run` | ✅ W0 (Plan 01 Task 1) | ⬜ pending |
| 1-03-01 | 03 | 3 | CONN-05 | — | N/A | integration | `npx vitest run` | ✅ W0 (Plan 01 Task 1) | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

- [x] `vitest` — installed as dev dependency in Plan 01 Task 1
- [x] `vitest.config.ts` — created in Plan 01 Task 1
- [x] `src/__tests__/` — test directory with scaffold files created in Plan 01 Task 1:
  - `src/__tests__/settings.test.ts` (CONN-01, CONN-02)
  - `src/__tests__/errors.test.ts` (CONN-04)
  - `src/__tests__/capability.test.ts` (CONN-03)
  - `src/__tests__/fhir-categories.test.ts` (CONN-03)

*Wave 0 infrastructure is created by Plan 01 Task 1 before any other tasks execute.*

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| Blaze server reachable and responds | CONN-03 | Requires running Blaze instance | Start Blaze, load app, verify connection indicator |
| Medplum component renders FHIR resource | CONN-05 | Requires live FHIR data | Connect to Blaze with data, verify MedplumCompatGate renders ResourceTable (Plan 03 Task 2 checkpoint) |

---

## Validation Sign-Off

- [x] All tasks have `<automated>` verify or Wave 0 dependencies
- [x] Sampling continuity: no 3 consecutive tasks without automated verify
- [x] Wave 0 covers all MISSING references
- [x] No watch-mode flags
- [x] Feedback latency < 5s
- [x] `nyquist_compliant: true` set in frontmatter

**Approval:** pending execution
