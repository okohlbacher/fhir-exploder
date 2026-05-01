---
phase: 46
slug: theme-a-foundation-summary-util
status: draft
nyquist_compliant: false
wave_0_complete: false
created: 2026-05-01
---

# Phase 46 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution. Sourced from `46-RESEARCH.md` § Validation Architecture.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | vitest ^4.1.4 (already installed; `vitest.config.ts` at repo root, jsdom env, globals enabled) |
| **Config file** | `vitest.config.ts` |
| **Quick run command** | `npx vitest run src/utils/__tests__/summarizeResource.test.ts` |
| **Full suite command** | `npm test` (runs `vitest run`) |
| **Estimated runtime** | ~2s for the new file alone; ~30–60s for full suite (1240 baseline → ~1270 after Phase 46) |

---

## Sampling Rate

- **After every task commit:** Run `npx vitest run src/utils/__tests__/summarizeResource.test.ts` (~2s)
- **After every plan wave:** Run `npm test` (full suite — confirm no regression vs 1240 baseline)
- **Before `/gsd-verify-work`:** `npm test && npm run build && npx tsc -b --noEmit` all green
- **Max feedback latency:** ~60s (full suite), ~2s (quick)

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Threat Ref | Secure Behavior | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|------------|-----------------|-----------|-------------------|-------------|--------|
| 46-01-XX | 01 | 1 | NAV-01 | — | Pure-function summarizeResource returns `{primary, secondary?}` for Patient | unit | `npx vitest run src/utils/__tests__/summarizeResource.test.ts -t "Patient"` | ❌ W0 | ⬜ pending |
| 46-01-XX | 01 | 1 | NAV-01 | — | Lab Observation classification + value/unit rendering | unit | `npx vitest run src/utils/__tests__/summarizeResource.test.ts -t "lab"` | ❌ W0 | ⬜ pending |
| 46-01-XX | 01 | 1 | NAV-01 | — | Generic walker honors D-11 field precedence | unit | `npx vitest run src/utils/__tests__/summarizeResource.test.ts -t "generic"` | ❌ W0 | ⬜ pending |
| 46-01-XX | 01 | 1 | NAV-01 | V6 (non-crypto hash) | djb2 base36 6-char; deterministic; non-cryptographic | unit | `npx vitest run src/utils/__tests__/summarizeResource.test.ts -t "djb2"` | ❌ W0 | ⬜ pending |
| 46-01-XX | 01 | 1 | NAV-01 | — | Purity (call twice with same `now` → same output; no `Date.now`/`Math.random` reachable) | unit (in age-boundary test) | included above | ❌ W0 | ⬜ pending |
| 46-02-XX | 02 | 2 | NAV-02 | — | Legacy `getResourceSummary` / `getSummary` removed | grep | `! grep -rnE "function getResourceSummary\\\|function getSummary" src/components/` | ✅ | ⬜ pending |
| 46-02-XX | 02 | 2 | NAV-02 | — | `summarizeResource` imported by 3 sites (SearchResultsPage, FhirResourcesView, MiiModuleTab) | grep | `[ "$(grep -rln "summarizeResource" src/components/ \| wc -l \| tr -d ' ')" -ge 3 ]` | ✅ | ⬜ pending |
| 46-02-XX | 02 | 2 | NAV-02 | — | Build clean | command | `npm run build` (exit 0) | ✅ | ⬜ pending |
| 46-02-XX | 02 | 2 | NAV-02 | — | Type clean | command | `npx tsc -b --noEmit` (exit 0) | ✅ | ⬜ pending |
| 46-02-XX | 02 | 2 | NAV-02 | — | Full suite green; no regression vs 1240 baseline (expect ~1270) | command | `npm test` | ✅ | ⬜ pending |
| 46-02-XX | 02 | 2 | NAV-02 SC#4 | — | Visual match-or-improve at the 3 migrated sites | manual | see Manual-Only Verifications below | ✅ | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

*Task IDs filled in by gsd-planner once PLAN.md task indices are assigned.*

---

## Wave 0 Requirements

- [ ] `src/utils/summarizeResource.ts` — implements NAV-01 (typed switch over 8 R4 types + generic walker; djb2 hash; pure)
- [ ] `src/utils/__tests__/summarizeResource.test.ts` — covers NAV-01 (8 typed entries × ~2 cases avg + 7 generic precedence steps + Patient name-fallback × 3 + age boundary + lab-vs-non-lab classification; ~30 tests total)

*No framework install required — vitest already in `package.json`.*

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| Visual match-or-improve at 3 migrated render sites | NAV-02 SC#4 | DOM rendering of summary text inside `<Anchor maxWidth: 400>` and Mantine list rows can only be confirmed in a real browser (vitest jsdom doesn't exercise Mantine layout/truncation). | 1. `npm run dev` → open `http://localhost:5173/explorer/Patient`. Confirm Summary column renders names with `(age/sex)` parenthetical (improvement vs v1.6 which showed `id`); truncation still applied; no console errors. 2. Open `http://localhost:5173/patients/<id>`, expand a resource type (e.g. Observation). Confirm Summary cells render code displays correctly. 3. Click an MII module tab (e.g. Diagnose). Confirm rows render summaries. **Acceptance:** all 3 sites render summaries; no fewer characters than before; no JS errors. |

---

## Validation Sign-Off

- [ ] All tasks have `<automated>` verify or Wave 0 dependencies
- [ ] Sampling continuity: no 3 consecutive tasks without automated verify
- [ ] Wave 0 covers all MISSING references (`summarizeResource.ts` + test file)
- [ ] No watch-mode flags in any task command (`vitest run`, never `vitest` alone)
- [ ] Feedback latency < 60s
- [ ] `nyquist_compliant: true` set in frontmatter (after planner fills task IDs and completes mapping)

**Approval:** pending
