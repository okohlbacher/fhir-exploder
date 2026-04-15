---
phase: 15
slug: quality-check-engine-drill-down
status: draft
nyquist_compliant: true
wave_0_complete: true
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
| 15-01-01 | 01 | 1 | DQ-01 | — | N/A | build | `npx tsc -b --noEmit` | n/a | ⬜ pending |
| 15-01-02 | 01 | 1 | DQ-01 | — | N/A | unit | `npx vitest run src/__tests__/completeness-walker.test.ts -x` | Yes (extend) | ⬜ pending |
| 15-01-03 | 01 | 1 | DQ-01 | — | N/A | unit | `npx vitest run src/__tests__/coding-coverage-walker.test.ts -x` | Yes (extend) | ⬜ pending |
| 15-02-01 | 02 | 2 | DQ-01, DQ-02 | T-15-02, T-15-03 | N/A | build | `npx tsc -b --noEmit` | n/a | ⬜ pending |
| 15-02-02 | 02 | 2 | DQ-01, DQ-02 | — | N/A | unit | `npx vitest run src/__tests__/resource-issue-table.test.tsx -x` | Wave 0 (created in 15-02-02) | ⬜ pending |
| 15-03-01 | 03 | 3 | DQ-01 | — | N/A | build | `npx tsc -b --noEmit` | n/a | ⬜ pending |
| 15-03-02 | 03 | 3 | DQ-01 | — | N/A | build | `npx tsc -b --noEmit` | n/a | ⬜ pending |
| 15-03-03 | 03 | 3 | DQ-01, DQ-02 | — | N/A | build | `npx tsc -b --noEmit` | n/a | ⬜ pending |
| 15-03-04 | 03 | 3 | DQ-01, DQ-02 | — | N/A | integration | `npx vitest run src/__tests__/coding-drilldown.test.tsx src/__tests__/completeness-drilldown.test.tsx -x` | Wave 0 (created in 15-03-04) | ⬜ pending |
| 15-03-05 | 03 | 3 | DQ-01, DQ-02 | — | N/A | manual | `npm run build && npm test` | n/a | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

All Wave 0 test gaps are covered by tasks within the plans:

- `src/__tests__/resource-issue-table.test.tsx` — created by Plan 02 Task 2 (covers DQ-01, DQ-02: ResourceIssueTable rendering, links, pagination, filters)
- `src/__tests__/coding-drilldown.test.tsx` — created by Plan 03 Task 4 (covers D-02: cross-filter from Fields to Resources tab for CodingDrillDown)
- `src/__tests__/completeness-drilldown.test.tsx` — created by Plan 03 Task 4 (covers D-02: cross-filter from Fields to Resources tab for CompletenessDrillDown)
- Extend `src/__tests__/completeness-walker.test.ts` — covered by Plan 01 Task 2 (perResource return data)
- Extend `src/__tests__/coding-coverage-walker.test.ts` — covered by Plan 01 Task 3 (perResource return data)

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| Cross-filter from Fields tab to Resources tab | DQ-01 | Interactive UX flow (also covered by integration tests in 15-03-04) | Click a field row in Fields tab, verify Resources tab activates with field filter pre-populated |
| Resource ID links navigate to detail view | DQ-02 | Browser navigation | Click resource ID link, verify /explorer/:type/:id page loads |

---

## Validation Sign-Off

- [x] All tasks have `<automated>` verify or Wave 0 dependencies
- [x] Sampling continuity: no 3 consecutive tasks without automated verify
- [x] Wave 0 covers all MISSING references
- [x] No watch-mode flags
- [x] Feedback latency < 15s
- [x] `nyquist_compliant: true` set in frontmatter

**Approval:** approved
