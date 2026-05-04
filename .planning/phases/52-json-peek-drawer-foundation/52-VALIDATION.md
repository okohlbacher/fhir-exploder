---
phase: 52
slug: json-peek-drawer-foundation
status: draft
nyquist_compliant: false
wave_0_complete: false
created: 2026-05-04
---

# Phase 52 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | vitest 4.1.4 + @testing-library/react 16.3.2 |
| **Config file** | `vitest.config.ts` (root) |
| **Quick run command** | `npx vitest run src/__tests__/display-modes.test.tsx` |
| **Full suite command** | `npx vitest run` |
| **Estimated runtime** | ~15 seconds |

---

## Sampling Rate

- **After every task commit:** Run `npx vitest run src/__tests__/display-modes.test.tsx`
- **After every plan wave:** Run `npx vitest run`
- **Before `/gsd-verify-work`:** Full suite must be green
- **Max feedback latency:** ~15 seconds

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Threat Ref | Secure Behavior | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|------------|-----------------|-----------|-------------------|-------------|--------|
| 52-01-01 | 01 | 0 | PEEK-06 | — | N/A | unit stub | `npx vitest run src/__tests__/peek-drawer.test.tsx` | ❌ W0 | ⬜ pending |
| 52-01-02 | 01 | 0 | PEEK-01 | — | N/A | unit stub | `npx vitest run src/hooks/__tests__/useShortcuts.test.ts` | ❌ W0 | ⬜ pending |
| 52-01-03 | 01 | 1 | PEEK-06 | — | JsonTreeView uses JSX-safe rendering (no dangerouslySetInnerHTML) | unit + grep | `npx vitest run src/__tests__/display-modes.test.tsx && git grep -rn "JsonTreeView" src/ \| grep -v JsonTreeView.tsx \| wc -l` | ✅ partial | ⬜ pending |
| 52-01-04 | 01 | 1 | PEEK-06 | — | N/A | grep gate | `git grep -rn "react-syntax-highlighter\|JsonTreeView" src/ \| grep -v JsonTreeView.tsx` | ✅ (existing grep) | ⬜ pending |
| 52-02-01 | 02 | 1 | PEEK-01 | — | N/A | unit | `npx vitest run src/__tests__/peek-drawer.test.tsx` | ❌ W0 | ⬜ pending |
| 52-02-02 | 02 | 1 | PEEK-02 | — | originElement always from document.activeElement (user-focused element only) | unit | `npx vitest run src/__tests__/peek-drawer.test.tsx` | ❌ W0 | ⬜ pending |
| 52-02-03 | 02 | 1 | PEEK-03 | — | N/A | unit | `npx vitest run src/__tests__/peek-drawer.test.tsx` | ❌ W0 | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

- [ ] `src/__tests__/peek-drawer.test.tsx` — stubs for PEEK-01, PEEK-02, PEEK-03 (drawer mount, Esc close, focus return, Enter navigate, J-on-row, content-swap)
- [ ] `src/hooks/__tests__/useShortcuts.test.ts` — stubs for useShortcuts hook (key dispatch, input-focus guard, enabled flag, listener cleanup)
- [ ] Update comment in `src/__tests__/display-modes.test.tsx` line ~28 — change "wraps JsonSyntaxHighlight" to "wraps JsonViewer"

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| Drawer visual width is 420px | PEEK-01 | Browser DevTools required | Open drawer, inspect element width in Chrome DevTools Elements panel |
| `withOverlay={false}` table remains visible | PEEK-01 | Visual check | Open drawer; verify Explorer table is visible behind (no dimmed backdrop) |
| `trapFocus={true}` keyboard focus trapped | PEEK-02 | Screen reader / Tab navigation | Open drawer, Tab through controls; confirm focus does not leave drawer |

---

## Validation Sign-Off

- [ ] All tasks have `<automated>` verify or Wave 0 dependencies
- [ ] Sampling continuity: no 3 consecutive tasks without automated verify
- [ ] Wave 0 covers all MISSING references
- [ ] No watch-mode flags
- [ ] Feedback latency < 15s
- [ ] `nyquist_compliant: true` set in frontmatter

**Approval:** pending
