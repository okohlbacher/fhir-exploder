---
phase: 17
slug: duplicate-detection-relational-integrity
status: draft
nyquist_compliant: false
wave_0_complete: false
created: 2026-04-14
---

# Phase 17 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | vitest |
| **Config file** | `vitest.config.ts` |
| **Quick run command** | `npx vitest run --reporter=verbose` |
| **Full suite command** | `npx vitest run --reporter=verbose` |
| **Estimated runtime** | ~15 seconds |

---

## Sampling Rate

- **After every task commit:** Run `npx vitest run --reporter=verbose`
- **After every plan wave:** Run `npx vitest run --reporter=verbose`
- **Before `/gsd-verify-work`:** Full suite must be green
- **Max feedback latency:** 15 seconds

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Threat Ref | Secure Behavior | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|------------|-----------------|-----------|-------------------|-------------|--------|
| 17-01-01 | 01 | 1 | DQ-07 | — | N/A | unit | `npx vitest run src/hooks/__tests__/useDuplicateReport.test.ts` | ❌ W0 | ⬜ pending |
| 17-01-02 | 01 | 1 | DQ-08 | — | N/A | unit | `npx vitest run src/hooks/__tests__/useReferenceReport.test.ts` | ❌ W0 | ⬜ pending |
| 17-02-01 | 02 | 2 | DQ-07 | — | N/A | unit | `npx vitest run src/components/__tests__/DuplicatesPanel.test.tsx` | ❌ W0 | ⬜ pending |
| 17-02-02 | 02 | 2 | DQ-09, DQ-10 | — | N/A | unit | `npx vitest run src/components/__tests__/ReferencesPanel.test.tsx` | ❌ W0 | ⬜ pending |
| 17-03-01 | 03 | 3 | DQ-07 thru DQ-10 | — | N/A | integration | `npx vitest run src/pages/__tests__/DuplicatesDrillDown.test.tsx` | ❌ W0 | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

- [ ] Test stubs for `useDuplicateReport` and `useReferenceReport` hooks
- [ ] Test stubs for `DuplicatesPanel` and `ReferencesPanel` components
- [ ] Test stubs for drill-down integration

*Existing vitest infrastructure covers all phase requirements.*

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| Tabs render correctly in dashboard | DQ-07, DQ-09 | Visual layout | Open dashboard, verify "Duplicates" and "References" tabs appear |
| Drill-down navigation from issue table | DQ-07 thru DQ-10 | Navigation flow | Click a finding row, verify resource detail page loads |

---

## Validation Sign-Off

- [ ] All tasks have `<automated>` verify or Wave 0 dependencies
- [ ] Sampling continuity: no 3 consecutive tasks without automated verify
- [ ] Wave 0 covers all MISSING references
- [ ] No watch-mode flags
- [ ] Feedback latency < 15s
- [ ] `nyquist_compliant: true` set in frontmatter

**Approval:** pending
