---
phase: 24
slug: data-fetching-foundation
status: draft
nyquist_compliant: false
wave_0_complete: false
created: 2026-04-17
updated: 2026-04-17
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

## Plan → Requirement Map

Authoritative mapping between plans and the requirements each plan addresses. Any downstream validation row MUST cite the requirement(s) that match the plan's `requirements:` frontmatter field.

| Plan | Frontmatter `requirements:` | Notes |
|------|-----------------------------|-------|
| 24-01 | FOUND-03 | `useAsyncRun` + `asyncRunReducer` primitive (authoring only; consumers migrate in Plan 04) |
| 24-02 | FOUND-01, FOUND-04 | `useResourceCounts` read-through cache (FOUND-01) + `cancelledRef` → `let cancelled` fix (FOUND-04); exports `clearQualityCountCache` + `clearAllQualityCountCache` consumed by Plan 03 |
| 24-03 | FOUND-02 | `metricsCache.ts` registry with 2-entry LRU + Settings wiring (depends on Plan 02 for the count-cache exports) |
| 24-04 | FOUND-03 | Migrates 4 report hooks to wrap `useAsyncRun` (depends on Plan 01) |

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Threat Ref | Secure Behavior | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|------------|-----------------|-----------|-------------------|-------------|--------|
| 24-01-01 | 01 | 0 | FOUND-03 | T-24-01-04 | Fresh-issues on start (no leak across runs) | unit | `npx vitest run src/hooks/__tests__/asyncRunReducer.test.ts` | ❌ W0 | ⬜ pending |
| 24-01-02 | 01 | 1 | FOUND-03 | T-24-01-01, T-24-01-02 | Closure-scoped cancellation; cancel beats complete/error | integration | `npx vitest run src/hooks/__tests__/useAsyncRun.test.tsx` | ❌ W0 | ⬜ pending |
| 24-02-01 | 02 | 0 | FOUND-01, FOUND-04 | T-24-02-01, T-24-02-05 | Cache write guarded by `if (cancelled) return`; closure-scoped cancellation replaces `cancelledRef` | unit + integration | `npx vitest run src/hooks/__tests__/useResourceCounts.test.tsx` | ❌ W0 | ⬜ pending |
| 24-02-02 | 02 | 1 | FOUND-01, FOUND-04 | T-24-02-01, T-24-02-02, T-24-02-03, T-24-02-05 | Cross-server isolation + error path does NOT cache + StrictMode cancellation green | integration | `npx vitest run src/hooks/__tests__/useResourceCounts.test.tsx` | ✅ (after 24-02-01) | ⬜ pending |
| 24-03-01 | 03 | 2 | FOUND-02 | T-24-03-01 | 2-entry LRU eviction; MRU touch; registry cleared by `clearAllQualityMetrics` | unit | `npx vitest run src/quality/__tests__/metricsCache.test.ts` | ❌ W0 | ⬜ pending |
| 24-03-02 | 03 | 2 | FOUND-02 | T-24-03-02, T-24-03-03 | Hooks use `getQualityMetricsCache(serverUrl)`; existing consumer tests unchanged + green | integration | `npx vitest run src/__tests__/completeness-hook.test.tsx src/__tests__/coding-coverage-panel.test.tsx` | ✅ | ⬜ pending |
| 24-03-03 | 03 | 2 | FOUND-02 | T-24-03-02 | `setSettings` wipes both caches; "Clear metrics cache" button wipes both caches | integration | `npx vitest run src/__tests__/settings-clear-cache.test.tsx` | ✅ (extend existing) | ⬜ pending |
| 24-04-01 | 04 | 2 | FOUND-03 | T-24-04-01 | Plausibility + LabRanges hook migrations preserve shape; panel tests green unchanged | integration | `npx vitest run src/__tests__/plausibility-panel.test.tsx src/__tests__/lab-ranges-panel.test.tsx` | ✅ | ⬜ pending |
| 24-04-02 | 04 | 2 | FOUND-03 | T-24-04-02, T-24-04-03 | Duplicate two-phase runner: progress math preserved; accessory state resets per run | integration | `npx vitest run src/__tests__/duplicates-panel.test.tsx` | ✅ | ⬜ pending |
| 24-04-03 | 04 | 2 | FOUND-03 | T-24-04-01, T-24-04-04 | Reference migration + full-suite gate + consumer-panel `as`-cast gate (zero net new casts) | integration + static | `npx vitest run && git diff main -- src/components/quality/*.tsx \| grep -c "^+.* as "` | ✅ | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

New test files (scaffolds created BEFORE implementation; each stub expected to fail until its corresponding task lands).

| Wave 0 File | Requirement(s) | Created By Plan | Details |
|-------------|----------------|-----------------|---------|
| `src/hooks/__tests__/asyncRunReducer.test.ts` | FOUND-03 | 24-01 Task 1 | 8 reducer transition tests (idle→running, running→complete, cancel beats complete, error, reset, etc.) |
| `src/hooks/__tests__/useAsyncRun.test.tsx` | FOUND-03 | 24-01 Task 2 | 8 integration tests (renderHook + StrictMode + rapid start() re-entry + unmount cancellation) |
| `src/hooks/__tests__/useResourceCounts.test.tsx` | FOUND-01, FOUND-04 | 24-02 Task 2 | 8 tests: cache hit, cache miss after clear, server isolation (per-serverUrl), typesKey stability, StrictMode cancellation (FOUND-04 regression gate), write-through guard, error non-caching, `clearAllQualityCountCache` wipe |
| `src/quality/__tests__/metricsCache.test.ts` | FOUND-02 | 24-03 Task 1 | 7 registry tests: same-instance on repeat, 2-entry LRU eviction, MRU touch on get, per-serverUrl clear, localStorage wipe, `clearAllQualityMetrics` drops registry, test isolation via beforeEach |

Checklist (no Wave 0 test file creates new files outside the paths above — file paths must match the plan's `files_modified` exactly):

- [ ] `src/hooks/__tests__/asyncRunReducer.test.ts` created (per Plan 24-01)
- [ ] `src/hooks/__tests__/useAsyncRun.test.tsx` created (per Plan 24-01 — `.tsx` extension; uses JSX/StrictMode)
- [ ] `src/hooks/__tests__/useResourceCounts.test.tsx` created (per Plan 24-02 — `.tsx` extension; uses JSX/StrictMode)
- [ ] `src/quality/__tests__/metricsCache.test.ts` created (per Plan 24-03 — note: lives under `src/quality/__tests__/`, NOT `src/hooks/__tests__/`)

Rationale for path choices (reconciled with Plan `files_modified`):

- Reducer test: `.ts` — no JSX in pure-reducer tests.
- `useAsyncRun` test: `.tsx` — uses `<StrictMode>` wrapper, requires JSX pragma.
- `useResourceCounts` test: `.tsx` — uses `<StrictMode>` wrapper, requires JSX pragma.
- `metricsCache` test: colocated under `src/quality/__tests__/` because it tests the quality-module registry, NOT a hook. Do NOT place this file under `src/hooks/__tests__/` — the module owner is `src/quality/metricsCache.ts`.

There is NO separate `countCache.test.ts` — the count-cache tests live INSIDE `useResourceCounts.test.tsx` (the count cache is a module-scope `Map` co-resident with `useResourceCounts.ts`, not a separate module).

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
- [ ] Wave 0 file paths align with each plan's `files_modified` frontmatter (verified 2026-04-17)
- [ ] Requirement mapping per row matches the plan's `requirements:` frontmatter (verified 2026-04-17)
- [ ] No watch-mode flags
- [ ] Feedback latency < 15s
- [ ] `nyquist_compliant: true` set in frontmatter

**Approval:** pending
