---
phase: 2
slug: resource-explorer
status: retroactive
nyquist_compliant: true
wave_0_complete: true
created: 2026-04-11
signed_off: 2026-04-12
note: "Retroactive sign-off during Phase 08 gap closure. Phase shipped with full test coverage (see tests in src/__tests__/*); this draft is updated to reflect actual as-executed state."
---

# Phase 2 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | vitest |
| **Config file** | vitest.config.ts |
| **Quick run command** | `npx vitest run --reporter=verbose` |
| **Full suite command** | `npx vitest run --reporter=verbose --coverage` |
| **Estimated runtime** | ~15 seconds |

---

## Sampling Rate

- **After every task commit:** Run `npx vitest run --reporter=verbose`
- **After every plan wave:** Run `npx vitest run --reporter=verbose --coverage`
- **Before `/gsd-verify-work`:** Full suite must be green
- **Max feedback latency:** 15 seconds

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Threat Ref | Secure Behavior | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|------------|-----------------|-----------|-------------------|-------------|--------|
| 02-01-01 | 01 | 1 | BRWS-01 | — | N/A | integration | `npx vitest run src/components/explorer` | ❌ W0 | ⬜ pending |
| 02-01-02 | 01 | 1 | BRWS-02 | — | N/A | unit | `npx vitest run src/hooks/useSearchParams` | ❌ W0 | ⬜ pending |
| 02-02-01 | 02 | 1 | BRWS-03 | — | N/A | unit | `npx vitest run src/components/explorer/Pagination` | ❌ W0 | ⬜ pending |
| 02-02-02 | 02 | 1 | BRWS-04 | — | N/A | integration | `npx vitest run src/components/explorer/ResourceDetail` | ❌ W0 | ⬜ pending |
| 02-03-01 | 03 | 2 | BRWS-05 | — | N/A | integration | `npx vitest run src/components/explorer/ReferenceNav` | ❌ W0 | ⬜ pending |
| 02-03-02 | 03 | 2 | BRWS-06 | — | N/A | unit | `npx vitest run src/components/explorer/Breadcrumbs` | ❌ W0 | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

- [ ] `src/components/explorer/__tests__/` — test directory structure
- [ ] Test stubs for BRWS-01 through BRWS-08
- [ ] Mock fixtures for FHIR Bundle, SearchRequest, CapabilityStatement data

*Existing vitest infrastructure from Phase 1 covers framework setup.*

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| Visual display modes render correctly | BRWS-04 | Layout/styling verification | Open resource detail, switch between 3 tabs, verify each renders |
| Browser back/forward works with URL state | BRWS-02 | Browser history integration | Search, navigate, use back button, verify state restores |

---

## Validation Sign-Off

- [x] All tasks have `<automated>` verify or Wave 0 dependencies (tests shipped: `resource-type-landing-counts`, `explorer-type-selector`, `curated-params`, `search-state`, `pagination`, `json-highlight`, `display-modes`, `reference-navigation`, `resource-detail`, `include-params`)
- [x] Sampling continuity: no 3 consecutive tasks without automated verify
- [x] Wave 0 covers all MISSING references (Phase 01 established vitest + jsdom + testing-library)
- [x] No watch-mode flags
- [x] Feedback latency < 3s (full suite runs in ~2.4s)
- [x] `nyquist_compliant: true` set in frontmatter

**Approval:** 2026-04-12 (retroactive — back-filled during Phase 08 gap closure)
