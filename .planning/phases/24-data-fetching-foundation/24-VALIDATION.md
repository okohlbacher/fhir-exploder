---
phase: 24
slug: data-fetching-foundation
status: draft
nyquist_compliant: false
wave_0_complete: false
created: 2026-04-17
---

# Phase 24 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | vitest 4.1.4 + @testing-library/react |
| **Config file** | `vitest.config.ts` |
| **Quick run command** | `npx vitest run --reporter=dot` |
| **Full suite command** | `npx vitest run` |
| **Estimated runtime** | ~15 seconds |

---

## Sampling Rate

- **After every task commit:** Run `npx vitest run --reporter=dot`
- **After every plan wave:** Run `npx vitest run`
- **Before `/gsd-verify-work`:** Full suite must be green
- **Max feedback latency:** 15 seconds

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Threat Ref | Secure Behavior | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|------------|-----------------|-----------|-------------------|-------------|--------|
| 24-01-01 | 01 | 0 | FOUND-03 | — | N/A | unit | `npx vitest run src/hooks/__tests__/useAsyncRun.test.ts` | ❌ W0 | ⬜ pending |
| 24-01-02 | 01 | 1 | FOUND-03 | — | N/A | unit | `npx vitest run src/hooks/__tests__/useAsyncRun.test.ts` | ✅ | ⬜ pending |
| 24-02-01 | 02 | 0 | FOUND-02 | — | N/A | unit | `npx vitest run src/hooks/__tests__/metricsCacheRegistry.test.ts` | ❌ W0 | ⬜ pending |
| 24-02-02 | 02 | 1 | FOUND-02 | — | N/A | unit | `npx vitest run src/hooks/__tests__/metricsCacheRegistry.test.ts` | ✅ | ⬜ pending |
| 24-03-01 | 03 | 1 | FOUND-03 | — | N/A | unit | `npx vitest run src/hooks/__tests__/useAsyncRun.test.ts` | ✅ | ⬜ pending |
| 24-04-01 | 04 | 0 | FOUND-01, FOUND-04 | — | N/A | unit | `npx vitest run src/hooks/__tests__/countCache.test.ts src/hooks/__tests__/useResourceCounts.cache.test.ts` | ❌ W0 | ⬜ pending |
| 24-04-02 | 04 | 1 | FOUND-01, FOUND-04 | — | N/A | unit | `npx vitest run src/hooks/__tests__/countCache.test.ts src/hooks/__tests__/useResourceCounts.cache.test.ts` | ✅ | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

- [ ] `src/hooks/__tests__/useAsyncRun.test.ts` — stubs for FOUND-03 (useAsyncRun hook unit tests)
- [ ] `src/hooks/__tests__/metricsCacheRegistry.test.ts` — stubs for FOUND-02 (LRU registry tests)
- [ ] `src/hooks/__tests__/countCache.test.ts` — stubs for FOUND-01 (count cache unit tests)
- [ ] `src/hooks/__tests__/useResourceCounts.cache.test.ts` — stubs for FOUND-01 + FOUND-04 (useResourceCounts with cache + cancellation fix)

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| No duplicate `_summary=count` requests when switching between `/`, `/explorer`, `/quality` routes | FOUND-01 | Requires real browser with DevTools Network tab and a live Blaze server | Load app, open Network tab, navigate `/` → `/explorer` → `/quality` → back to `/`; verify no second batch of count requests fires for resource types already fetched |

---

## Validation Sign-Off

- [ ] All tasks have `<automated>` verify or Wave 0 dependencies
- [ ] Sampling continuity: no 3 consecutive tasks without automated verify
- [ ] Wave 0 covers all MISSING references
- [ ] No watch-mode flags
- [ ] Feedback latency < 15s
- [ ] `nyquist_compliant: true` set in frontmatter

**Approval:** pending
