---
phase: 53
slug: peek-call-site-expansion
status: draft
nyquist_compliant: false
wave_0_complete: false
created: 2026-05-04
---

# Phase 53 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | vitest 4.1.4 |
| **Config file** | `vitest.config.ts` (project root) |
| **Quick run command** | `npm test -- --run --no-coverage peek-` |
| **Full suite command** | `npm test` |
| **Estimated runtime** | ~5 seconds (quick), ~30 seconds (full) |

---

## Sampling Rate

- **After every task commit:** Run `npm test -- --run peek-`
- **After every plan wave:** Run `npm test`
- **Before `/gsd-verify-work`:** Full suite must be green
- **Max feedback latency:** 5 seconds

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Threat Ref | Secure Behavior | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|------------|-----------------|-----------|-------------------|-------------|--------|
| 53-01-01 | 01 | 0 | PEEK-04 | — | N/A | unit stub | `npm test -- --run peek-drawer` | ✅ extend | ⬜ pending |
| 53-01-02 | 01 | 0 | PEEK-04 | — | N/A | integration stub | `npm test -- --run peek-reference-link` | ❌ W0 | ⬜ pending |
| 53-01-03 | 01 | 0 | PEEK-05 | — | N/A | integration stub | `npm test -- --run peek-patients-integration` | ❌ W0 | ⬜ pending |
| 53-01-04 | 01 | 0 | PEEK-05 | — | N/A | integration stub | `npm test -- --run peek-related-resources` | ❌ W0 | ⬜ pending |
| 53-01-05 | 01 | 1 | PEEK-04 | T-NavHijack | `e.preventDefault()` + `e.stopPropagation()` cancel browser nav AND parent handler | unit | `npm test -- --run peek-drawer` | ✅ extend | ⬜ pending |
| 53-01-06 | 01 | 1 | PEEK-04 | T-OpenRedirect | `referenceText` rendered as plain `<Text>`, no href constructed | unit | `npm test -- --run peek-drawer` | ✅ extend | ⬜ pending |
| 53-02-01 | 02 | 1 | PEEK-04 | T-NavHijack | Cmd+click intercepted; plain click untouched | integration | `npm test -- --run peek-reference-link` | ❌ W0 | ⬜ pending |
| 53-02-02 | 02 | 1 | PEEK-04 | — | failed resolution → inline error, no toast | integration | `npm test -- --run peek-reference-link` | ❌ W0 | ⬜ pending |
| 53-02-03 | 02 | 1 | PEEK-05 | — | J on focused row opens drawer | integration | `npm test -- --run peek-patients-integration` | ❌ W0 | ⬜ pending |
| 53-02-04 | 02 | 1 | PEEK-05 | — | INPUT-focus guard prevents J from firing | integration | `npm test -- --run peek-patients-integration` | ❌ W0 | ⬜ pending |
| 53-02-05 | 02 | 1 | PEEK-05 | — | Cmd+click Card fetches first resource + opens drawer | integration | `npm test -- --run peek-related-resources` | ❌ W0 | ⬜ pending |
| 53-02-06 | 02 | 1 | PEEK-05 | — | fetch failure → openPeekError (no toast) | integration | `npm test -- --run peek-related-resources` | ❌ W0 | ⬜ pending |
| 53-02-07 | 02 | 1 | PEEK-05 | — | plain click navigation preserved (regression) | integration | `npm test -- --run peek-related-resources` | ❌ W0 | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

- [ ] `src/__tests__/peek-reference-link.test.tsx` — stubs for PEEK-04 (resolved Cmd+click, failed Cmd+click, plain click regression)
- [ ] `src/__tests__/peek-patients-integration.test.tsx` — stubs for PEEK-05 surface 2 (J shortcut, INPUT-focus guard, no-focused-row no-op)
- [ ] `src/__tests__/peek-related-resources.test.tsx` — stubs for PEEK-05 surfaces 3+4 (Cmd+click peek, fetch failure → error, plain click regression)
- [ ] Extend `src/__tests__/peek-drawer.test.tsx` with stubs for `openPeekError` flow (resource=null, error body, hidden Open button, Enter no-op in error state)

*Existing infrastructure covers all phase requirements — no framework install or shared fixture additions needed.*

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| Drawer visual width at 420px | PEEK-04 | CSS measurement requires real browser | Open drawer via Cmd+click on a reference chip; measure drawer width in DevTools |
| Focus ring visible on PatientRow | PEEK-05 | Computed CSS style in jsdom not reliable | Tab to PatientListPage table rows; confirm indigo outline appears |
| Cmd+click tooltip affordance (if added) | PEEK-04 | Visual affordance | Hover reference chip; confirm tooltip or cursor change is visible |

---

## Validation Sign-Off

- [ ] All tasks have `<automated>` verify or Wave 0 dependencies
- [ ] Sampling continuity: no 3 consecutive tasks without automated verify
- [ ] Wave 0 covers all MISSING references
- [ ] No watch-mode flags
- [ ] Feedback latency < 5s
- [ ] `nyquist_compliant: true` set in frontmatter

**Approval:** pending
