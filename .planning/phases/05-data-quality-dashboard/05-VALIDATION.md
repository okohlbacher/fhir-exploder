---
phase: 05
slug: data-quality-dashboard
status: draft
nyquist_compliant: false
wave_0_complete: false
created: 2026-04-12
---

# Phase 05 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | Vitest 4.1.4 + @testing-library/react 16.3.2 + jsdom 29 |
| **Config file** | `vitest.config.ts` (environment: jsdom, globals: true) |
| **Quick run command** | `npm test -- src/__tests__/{file}.test.ts` (file-scoped) |
| **Full suite command** | `npm test` |
| **Estimated runtime** | ~2s full suite (170 tests today, +~40 for phase 05) |

---

## Sampling Rate

- **After every task commit:** Run `npm test -- src/__tests__/{file being edited}.test.ts`
- **After every plan wave:** Run `npm test -- src/__tests__/quality-*.test.* completeness-*.test.* coding-*.test.* structural-*.test.* remote-*.test.* validation-*.test.*`
- **Before `/gsd-verify-work`:** Full `npm test` must be green, `npm run build` type-check clean for new files
- **Max feedback latency:** ~3 seconds per scoped run, ~5 seconds full suite

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Threat Ref | Secure Behavior | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|------------|-----------------|-----------|-------------------|-------------|--------|
| 05-01-01 | 01 | 1 | QUAL-01..04 | T-05-01-03 (DoS) | Sample size clamped 10..1000 in SampleSizeControl | unit | `npm test -- src/__tests__/quality-contracts.test.ts src/__tests__/quality-cache.test.ts src/__tests__/quality-sampling.test.ts` | ❌ Wave 0 | ⬜ pending |
| 05-01-02 | 01 | 1 | QUAL-01..04 | — | Quality route shell gated on connection status | component | `npm test -- src/__tests__/quality-layout.test.tsx src/__tests__/quality-settings.test.tsx` | ❌ Wave 0 | ⬜ pending |
| 05-02-01 | 02 | 2 | QUAL-01 | — | Counts aggregation consumes useResourceCounts output without duplication | unit | `npm test -- src/__tests__/quality-counts.test.ts` | ❌ Wave 0 | ⬜ pending |
| 05-02-02 | 02 | 2 | QUAL-01 | — | QualityOverviewPage renders 4-card strip + sortable counts panel | component | `npm test -- src/__tests__/quality-overview.test.tsx src/__tests__/counts-panel.test.tsx` | ❌ Wave 0 | ⬜ pending |
| 05-03-01 | 03 | 2 | QUAL-02 | T-05-03-01 (Tampering) | Bundled MII profiles version-pinned at build time | unit | `npm test -- src/__tests__/completeness-walker.test.ts` | ❌ Wave 0 | ⬜ pending |
| 05-03-02 | 03 | 2 | QUAL-02 | — | useCompletenessReport respects 4-concurrent limit, handles `value[x]` (Pitfall 3) | integration | `npm test -- src/__tests__/completeness-hook.test.tsx src/__tests__/completeness-panel.test.tsx` | ❌ Wave 0 | ⬜ pending |
| 05-04-01 | 04 | 2 | QUAL-03 | — | classifyCodedFields classifies CC into systemCode/textOnly/empty; ignores Identifier (Pitfall 5) | unit | `npm test -- src/__tests__/coding-coverage-walker.test.ts` | ❌ Wave 0 | ⬜ pending |
| 05-04-02 | 04 | 2 | QUAL-03 | — | CodingCoveragePanel renders 3-bucket stacked bars + drill-down | component | `npm test -- src/__tests__/coding-coverage-panel.test.tsx` | ❌ Wave 0 | ⬜ pending |
| 05-05-01 | 05 | 3 | QUAL-04 | T-05-05-01 (Info Disclosure), T-05-05-02 (Tampering) | remoteValidator never POSTs to Blaze base URL; dismissible PHI warning banner | unit | `npm test -- src/__tests__/structural-validator.test.ts src/__tests__/remote-validator.test.ts` | ❌ Wave 0 | ⬜ pending |
| 05-05-02 | 05 | 3 | QUAL-04 | T-05-05-01 | ValidationPanel shows progress, cancel stops in-flight, JSON export includes only sampled resources | component | `npm test -- src/__tests__/validation-panel.test.tsx` | ❌ Wave 0 | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

- [ ] `src/__tests__/quality-contracts.test.ts` — skeleton contract assertions for Plan 01 types
- [ ] `src/__tests__/quality-cache.test.ts` — metrics LRU scaffolds
- [ ] `src/__tests__/quality-sampling.test.ts` — sampling helper scaffolds (SampleSizeControl 10..1000 clamp)
- [ ] `src/__tests__/quality-layout.test.tsx` — QualityLayout gating stub
- [ ] `src/__tests__/quality-settings.test.tsx` — Settings validation section stub
- [ ] `src/__tests__/quality-counts.test.ts` — QUAL-01 counts aggregation stub
- [ ] `src/__tests__/quality-overview.test.tsx` — OverviewStrip + QualityOverviewPage stub
- [ ] `src/__tests__/completeness-walker.test.ts` — QUAL-02 walker + Pitfall 3 stubs
- [ ] `src/__tests__/completeness-hook.test.tsx` — QUAL-02 concurrency stub
- [ ] `src/__tests__/coding-coverage-walker.test.ts` — QUAL-03 walker + Pitfall 5 stubs
- [ ] `src/__tests__/coding-coverage-panel.test.tsx` — QUAL-03 UI stub
- [ ] `src/__tests__/structural-validator.test.ts` — QUAL-04 structural stub
- [ ] `src/__tests__/remote-validator.test.ts` — QUAL-04 remote stub (Blaze-URL-guard regression test)
- [ ] `src/__tests__/validation-panel.test.tsx` — QUAL-04 UI stub

All scaffolds must fail with `MISSING-IMPLEMENTATION` (not `ReferenceError`) so Wave 2 picks them up cleanly. Test framework itself is already installed (Phase 1) — no framework install needed.

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| Bundle size impact of MII StructureDefinition JSON ≤ 100 KB gz | QUAL-02 | Bundle analysis is post-build; jsdom can't assert over build output | After phase complete: `npm run build && du -hs dist/assets/` — confirm no single chunk >200 KB gz attributable to mii-profiles |
| External validator endpoint reachability on real network | QUAL-04 (enhanced mode) | Requires live validator URL + PHI-safe test resource | Configure `validation.validatorUrl` in settings.yaml, run Validation panel on synthetic Patient, verify OperationOutcome returns |
| PHI warning banner visual + dismiss persistence | QUAL-04 / T-05-05-01 | UX + localStorage round-trip | Enable validator URL, open Quality → Validation tab, confirm orange banner appears with explicit "outbound to {URL}" copy; dismiss, reload — banner stays dismissed |

---

## Validation Sign-Off

- [ ] All tasks have `<automated>` verify or Wave 0 dependencies
- [ ] Sampling continuity: no 3 consecutive tasks without automated verify
- [ ] Wave 0 covers all MISSING references
- [ ] No watch-mode flags
- [ ] Feedback latency < 5s
- [ ] `nyquist_compliant: true` set in frontmatter

**Approval:** pending
