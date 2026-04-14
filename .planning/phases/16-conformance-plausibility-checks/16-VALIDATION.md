---
phase: 16
slug: conformance-plausibility-checks
status: draft
nyquist_compliant: false
wave_0_complete: false
created: 2026-04-14
---

# Phase 16 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | Vitest (via Vite 8) |
| **Config file** | `vitest.config.ts` |
| **Quick run command** | `npx vitest run --reporter=verbose` |
| **Full suite command** | `npx vitest run` |
| **Estimated runtime** | ~15 seconds |

---

## Sampling Rate

- **After every task commit:** Run `npx vitest run --reporter=verbose`
- **After every plan wave:** Run `npx vitest run`
- **Before `/gsd-verify-work`:** Full suite must be green
- **Max feedback latency:** 15 seconds

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Threat Ref | Secure Behavior | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|------------|-----------------|-----------|-------------------|-------------|--------|
| 16-01-01 | 01 | 1 | DQ-03 | T-16-01 | Validate $expand payload structure before caching | unit | `npx vitest run src/quality/profileConformanceChecker.test.ts -t "value-set"` | ❌ W0 | ⬜ pending |
| 16-01-02 | 01 | 1 | DQ-04 | — | N/A | unit | `npx vitest run src/quality/profileConformanceChecker.test.ts -t "cardinality"` | ❌ W0 | ⬜ pending |
| 16-02-01 | 02 | 1 | DQ-05 | — | N/A | unit | `npx vitest run src/quality/temporalPlausibilityWalker.test.ts` | ❌ W0 | ⬜ pending |
| 16-03-01 | 03 | 1 | DQ-06 | — | N/A | unit | `npx vitest run src/quality/labRangeChecker.test.ts` | ❌ W0 | ⬜ pending |
| 16-01-03 | 01 | 1 | DQ-03 | T-16-02 | Cap cached expansion size; limit count parameter | unit | `npx vitest run src/quality/valueSetCache.test.ts` | ❌ W0 | ⬜ pending |
| 16-04-01 | 04 | 2 | DQ-03, DQ-04, DQ-05, DQ-06 | — | N/A | integration | `npx vitest run src/quality/qualityDashboard.integration.test.ts` | ❌ W0 | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

- [ ] `src/quality/profileConformanceChecker.test.ts` — stubs for DQ-03, DQ-04
- [ ] `src/quality/temporalPlausibilityWalker.test.ts` — stubs for DQ-05
- [ ] `src/quality/labRangeChecker.test.ts` — stubs for DQ-06
- [ ] `src/quality/valueSetCache.test.ts` — covers $expand caching logic
- [ ] `src/config/settingsValidation.test.ts` — validates settings.yaml reference range/threshold values

*Existing infrastructure (Vitest) covers framework needs — no new test framework install required.*

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| Terminology server unavailable shows warning banner | DQ-03 | Requires simulating network failure to real server | Disconnect terminology server, reload quality dashboard, verify banner appears |
| All findings clickable to resource detail | DQ-03–06 | End-to-end UI interaction | Click a flagged issue in each tab, verify navigation to resource detail page |

---

## Validation Sign-Off

- [ ] All tasks have `<automated>` verify or Wave 0 dependencies
- [ ] Sampling continuity: no 3 consecutive tasks without automated verify
- [ ] Wave 0 covers all MISSING references
- [ ] No watch-mode flags
- [ ] Feedback latency < 15s
- [ ] `nyquist_compliant: true` set in frontmatter

**Approval:** pending
