---
phase: 15
slug: quality-check-engine-drill-down
status: draft
nyquist_compliant: false
wave_0_complete: false
created: 2026-04-13
---

# Phase 15 — Validation Strategy

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
| 15-01-01 | 01 | 1 | DQ-01 | — | N/A | build | `npx tsc -b --noEmit` | ✅ | ⬜ pending |
| 15-01-02 | 01 | 1 | DQ-01 | — | N/A | build | `npx tsc -b --noEmit` | ✅ | ⬜ pending |
| 15-01-03 | 01 | 1 | DQ-02 | — | N/A | build | `npx tsc -b --noEmit` | ✅ | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

Existing infrastructure covers all phase requirements. No new test framework or stubs needed — validation is via `tsc --noEmit` (zero errors) and `npm run build` (clean build).

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| Cross-filter from Fields tab to Resources tab | DQ-01 | Interactive UX flow | Click a field row in Fields tab, verify Resources tab activates with field filter pre-populated |
| Resource ID links navigate to detail view | DQ-02 | Browser navigation | Click resource ID link, verify /explorer/:type/:id page loads |

---

## Validation Sign-Off

- [ ] All tasks have `<automated>` verify or Wave 0 dependencies
- [ ] Sampling continuity: no 3 consecutive tasks without automated verify
- [ ] Wave 0 covers all MISSING references
- [ ] No watch-mode flags
- [ ] Feedback latency < 15s
- [ ] `nyquist_compliant: true` set in frontmatter

**Approval:** pending
