---
phase: 2
slug: resource-explorer
status: draft
nyquist_compliant: false
wave_0_complete: false
created: 2026-04-11
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

- [ ] All tasks have `<automated>` verify or Wave 0 dependencies
- [ ] Sampling continuity: no 3 consecutive tasks without automated verify
- [ ] Wave 0 covers all MISSING references
- [ ] No watch-mode flags
- [ ] Feedback latency < 15s
- [ ] `nyquist_compliant: true` set in frontmatter

**Approval:** pending
