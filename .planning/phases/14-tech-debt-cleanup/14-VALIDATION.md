---
phase: 14
slug: tech-debt-cleanup
status: draft
nyquist_compliant: false
wave_0_complete: false
created: 2026-04-13
---

# Phase 14 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | vitest (via npm run test) |
| **Config file** | vite.config.ts |
| **Quick run command** | `npx tsc -b --noEmit` |
| **Full suite command** | `npm run build && npm test` |
| **Estimated runtime** | ~15 seconds |

---

## Sampling Rate

- **After every task commit:** Run `npx tsc -b --noEmit`
- **After every plan wave:** Run `npm run build && npm test`
- **Before `/gsd-verify-work`:** Full suite must be green
- **Max feedback latency:** 15 seconds

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Threat Ref | Secure Behavior | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|------------|-----------------|-----------|-------------------|-------------|--------|
| 14-01-01 | 01 | 1 | DEBT-02 | — | N/A | build | `npx tsc -b --noEmit 2>&1 \| grep "TS2305" \| wc -l` → 0 | ✅ | ⬜ pending |
| 14-01-02 | 01 | 1 | DEBT-02 | — | N/A | build | `npx tsc -b --noEmit 2>&1 \| grep "TS6133" \| wc -l` → 0 | ✅ | ⬜ pending |
| 14-01-03 | 01 | 1 | DEBT-02 | — | N/A | build | `npx tsc -b --noEmit 2>&1 \| grep "TS2352" \| wc -l` → 0 | ✅ | ⬜ pending |
| 14-01-04 | 01 | 1 | DEBT-02 | — | N/A | build | `npx tsc -b --noEmit 2>&1 \| grep "TS2345" \| wc -l` → 0 | ✅ | ⬜ pending |
| 14-02-01 | 02 | 2 | DEBT-01 | — | N/A | grep | grep for each IN-XX fix in the diff | ✅ | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

Existing infrastructure covers all phase requirements. No new test framework or stubs needed — validation is via `tsc --noEmit` (zero errors) and `npm run build` (clean build).

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| `npm run dev` starts without browser console errors | DEBT-02 | Runtime browser check | Start dev server, open browser, check console for errors |

---

## Validation Sign-Off

- [ ] All tasks have `<automated>` verify or Wave 0 dependencies
- [ ] Sampling continuity: no 3 consecutive tasks without automated verify
- [ ] Wave 0 covers all MISSING references
- [ ] No watch-mode flags
- [ ] Feedback latency < 15s
- [ ] `nyquist_compliant: true` set in frontmatter

**Approval:** pending
