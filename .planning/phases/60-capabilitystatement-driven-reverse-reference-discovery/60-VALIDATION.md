---
phase: 60
slug: capabilitystatement-driven-reverse-reference-discovery
status: draft
nyquist_compliant: false
wave_0_complete: false
created: 2026-05-27
---

# Phase 60 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | vitest 3.x + jsdom |
| **Config file** | `vitest.config.ts` (root) |
| **Quick run command** | `npx vitest run src/__tests__/capabilityStatementCatalog.test.ts` |
| **Full suite command** | `npm test` |
| **Estimated runtime** | ~15 seconds |

---

## Sampling Rate

- **After every task commit:** Run `npx vitest run` on the files modified by that task (see map below)
- **After every plan wave:** Run `npm test` (full suite)
- **Before `/gsd-verify-work`:** Full suite must be green + `tsc -b --noEmit` exit 0 + `npm run build` clean
- **Max feedback latency:** ~15 seconds (unit suite)

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Automated Command | File Exists | Status |
|---------|------|------|-------------|-------------------|-------------|--------|
| 60-01-01 | 01 | 1 | REVR-04 | `npx vitest run src/__tests__/capabilityStatementCatalog.test.ts` | ❌ W0 | ⬜ pending |
| 60-01-02 | 01 | 1 | REVR-04 | `tsc -b --noEmit` | ✅ | ⬜ pending |
| 60-01-03 | 01 | 1 | REVR-04 | `npx vitest run src/__tests__/connection-context.test.tsx` | ✅ | ⬜ pending |
| 60-02-01 | 02 | 2 | REVR-04 | `npx vitest run src/components/explorer/__tests__/IncomingReferencesPanel.test.tsx` | ✅ | ⬜ pending |
| 60-02-02 | 02 | 2 | REVR-04 | `npx vitest run src/components/explorer/__tests__/IncomingReferencesPanel.test.tsx` | ✅ | ⬜ pending |
| 60-02-03 | 02 | 2 | REVR-04 | `npm test && npm run build` | ✅ | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

- [ ] `src/__tests__/capabilityStatementCatalog.test.ts` — test stubs for REVR-04 parser (criterion 4a)

All other test files (`IncomingReferencesPanel.test.tsx`, `connection-context.test.tsx`) already exist and will be extended, not created from scratch.

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| Dynamic catalog produces non-empty result on live Blaze | REVR-04, criterion 2 | Requires live Blaze server + Synthea data | Connect to Blaze, navigate to Encounter detail page, open DevTools Network, verify no second `/metadata` call fires, confirm "Referenced By" panel shows cards |
| Encounter panel shows additional reference types beyond curated 9 | REVR-04, criterion 2 | Requires server advertising >9 Encounter reference params | Inspect `dynamicCatalog.Encounter` in context; if server advertises extras, confirm panel cards match |

---

## Validation Sign-Off

- [ ] All tasks have `<automated>` verify or Wave 0 dependencies
- [ ] Sampling continuity: no 3 consecutive tasks without automated verify
- [ ] Wave 0 covers all MISSING references (capabilityStatementCatalog.test.ts)
- [ ] No watch-mode flags
- [ ] Feedback latency < 30s
- [ ] `nyquist_compliant: true` set in frontmatter

**Approval:** pending
