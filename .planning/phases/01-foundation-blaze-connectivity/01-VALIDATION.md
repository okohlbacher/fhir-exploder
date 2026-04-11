---
phase: 1
slug: foundation-blaze-connectivity
status: draft
nyquist_compliant: false
wave_0_complete: false
created: 2026-04-11
---

# Phase 1 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | vitest |
| **Config file** | none — Wave 0 installs |
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
| 1-01-01 | 01 | 1 | CONN-01 | — | N/A | unit | `npx vitest run` | ❌ W0 | ⬜ pending |
| 1-01-02 | 01 | 1 | CONN-02 | — | N/A | unit | `npx vitest run` | ❌ W0 | ⬜ pending |
| 1-02-01 | 02 | 1 | CONN-03 | — | N/A | unit | `npx vitest run` | ❌ W0 | ⬜ pending |
| 1-02-02 | 02 | 1 | CONN-04 | — | N/A | unit | `npx vitest run` | ❌ W0 | ⬜ pending |
| 1-03-01 | 03 | 2 | CONN-05 | — | N/A | integration | `npx vitest run` | ❌ W0 | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

- [ ] `vitest` — install vitest as dev dependency
- [ ] `src/__tests__/` — test directory structure
- [ ] `vitest.config.ts` — vitest configuration

*If none: "Existing infrastructure covers all phase requirements."*

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| Blaze server reachable and responds | CONN-03 | Requires running Blaze instance | Start Blaze, load app, verify connection indicator |
| Medplum component renders FHIR resource | CONN-05 | Requires live FHIR data | Connect to Blaze with data, verify ResourceTable renders |

---

## Validation Sign-Off

- [ ] All tasks have `<automated>` verify or Wave 0 dependencies
- [ ] Sampling continuity: no 3 consecutive tasks without automated verify
- [ ] Wave 0 covers all MISSING references
- [ ] No watch-mode flags
- [ ] Feedback latency < 5s
- [ ] `nyquist_compliant: true` set in frontmatter

**Approval:** pending
