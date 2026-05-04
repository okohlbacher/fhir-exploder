---
phase: 54
slug: 4-mode-resource-shell
status: draft
nyquist_compliant: false
wave_0_complete: false
created: 2026-05-04
---

# Phase 54 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | vitest 4.1.4 + @testing-library/react 16.3.2 + jsdom 29.0.2 |
| **Config file** | `vitest.config.ts` (project root) |
| **Quick run command** | `npm test -- src/__tests__/resource-detail.test.tsx src/__tests__/resource-detail-summary-mode.test.tsx src/__tests__/resource-detail-graph-mode.test.tsx src/__tests__/graph-redirect.test.tsx src/__tests__/json-mode-view.test.tsx src/utils/__tests__/keyFieldsRegistry.test.ts src/components/json/__tests__/JsonViewer.test.tsx --run --no-coverage` |
| **Full suite command** | `npm test` |
| **Estimated runtime** | ~8 seconds (quick), ~45 seconds (full) |

---

## Sampling Rate

- **After every task commit:** Run quick command above
- **After every plan wave:** Run `npm test` + `npm run build`
- **Before `/gsd-verify-work`:** Full suite must be green; `tsc -b --noEmit` exit 0
- **Max feedback latency:** 8 seconds

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Threat Ref | Secure Behavior | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|------------|-----------------|-----------|-------------------|-------------|--------|
| 54-01-01 | 01 | 0 | SHELL-01..04 | — | N/A | stub stubs | `npm test -- src/__tests__/resource-detail.test.tsx --run --no-coverage` | ✅ extend | ⬜ pending |
| 54-01-02 | 01 | 0 | SHELL-02 | — | N/A | stub | `npm test -- src/__tests__/resource-detail-summary-mode.test.tsx --run --no-coverage` | ❌ W0 | ⬜ pending |
| 54-01-03 | 01 | 0 | SHELL-03 | — | N/A | stub | `npm test -- src/__tests__/resource-detail-graph-mode.test.tsx --run --no-coverage` | ❌ W0 | ⬜ pending |
| 54-01-04 | 01 | 0 | SHELL-03 | — | N/A | stub | `npm test -- src/__tests__/graph-redirect.test.tsx --run --no-coverage` | ❌ W0 | ⬜ pending |
| 54-01-05 | 01 | 0 | SHELL-04 | — | N/A | stub | `npm test -- src/__tests__/json-mode-view.test.tsx --run --no-coverage` | ❌ W0 | ⬜ pending |
| 54-01-06 | 01 | 0 | SHELL-02 | — | N/A | stub | `npm test -- src/utils/__tests__/keyFieldsRegistry.test.ts --run --no-coverage` | ❌ W0 | ⬜ pending |
| 54-01-07 | 01 | 0 | SHELL-04 | — | N/A | stub | `npm test -- src/components/json/__tests__/JsonViewer.test.tsx --run --no-coverage` | ❌ W0 | ⬜ pending |
| 54-01-08 | 01 | 1 | SHELL-01 | — | N/A | unit | `npm test -- src/__tests__/resource-detail.test.tsx --run --no-coverage` | ✅ extend | ⬜ pending |
| 54-01-09 | 01 | 1 | SHELL-02 | — | N/A | unit | `npm test -- src/utils/__tests__/keyFieldsRegistry.test.ts --run --no-coverage` | ❌ W0 | ⬜ pending |
| 54-01-10 | 01 | 1 | SHELL-02 | — | N/A | unit | `npm test -- src/__tests__/resource-detail-summary-mode.test.tsx --run --no-coverage` | ❌ W0 | ⬜ pending |
| 54-02-01 | 02 | 2 | SHELL-03 | — | N/A | unit | `npm test -- src/__tests__/resource-detail-graph-mode.test.tsx --run --no-coverage` | ❌ W0 | ⬜ pending |
| 54-02-02 | 02 | 2 | SHELL-03 | — | N/A | unit | `npm test -- src/__tests__/graph-redirect.test.tsx --run --no-coverage` | ❌ W0 | ⬜ pending |
| 54-02-03 | 02 | 2 | SHELL-04 | — | N/A | unit | `npm test -- src/__tests__/json-mode-view.test.tsx --run --no-coverage` | ❌ W0 | ⬜ pending |
| 54-02-04 | 02 | 2 | SHELL-04 | — | N/A | unit | `npm test -- src/components/json/__tests__/JsonViewer.test.tsx --run --no-coverage` | ❌ W0 | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

- [ ] `src/__tests__/resource-detail.test.tsx` — extend with 4-mode shell test stubs (SHELL-01)
- [ ] `src/__tests__/resource-detail-summary-mode.test.tsx` — NEW, stubs for Summary mode (SHELL-02)
- [ ] `src/__tests__/resource-detail-graph-mode.test.tsx` — NEW, stubs for Graph mode lazy-load (SHELL-03)
- [ ] `src/__tests__/graph-redirect.test.tsx` — NEW, stubs for /graph → ?mode=graph redirect (SHELL-03)
- [ ] `src/__tests__/json-mode-view.test.tsx` — NEW, stubs for Copy/Download/Validation chip (SHELL-04)
- [ ] `src/utils/__tests__/keyFieldsRegistry.test.ts` — NEW, stubs for 8-type registry + generic fallback (SHELL-02)
- [ ] `src/components/json/__tests__/JsonViewer.test.tsx` — NEW, stubs for showLineNumbers prop (SHELL-04)

*All Wave 0 stubs use `describe.skip` until Plan 01/02 implementation tasks populate them.*

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| Mode switcher visual pill styling | SHELL-01 | CSS measurement requires real browser | Open ResourceDetailPage; confirm Summary/Human/Graph/JSON render as pill tabs (not underline tabs) |
| Graph tab — React Flow renders with nodes | SHELL-03 | React Flow canvas requires real browser; jsdom cannot render SVG/canvas | Open /explorer/Patient/p1; switch to Graph tab; confirm graph renders with at least 1 node |
| Validation chip color (teal vs yellow) | SHELL-04 | Computed CSS in jsdom not reliable | Open resource with 0 issues; confirm chip is teal. Open resource with issues; confirm chip is yellow |
| Download saves valid JSON file | SHELL-04 | File system write; cannot assert in jsdom | Click Download; open file; confirm valid JSON with correct resourceType/id |

---

## Validation Sign-Off

- [ ] All tasks have `<automated>` verify or Wave 0 dependencies
- [ ] Sampling continuity: no 3 consecutive tasks without automated verify
- [ ] Wave 0 covers all MISSING references
- [ ] No watch-mode flags
- [ ] Feedback latency < 8s
- [ ] `nyquist_compliant: true` set in frontmatter

**Approval:** pending
