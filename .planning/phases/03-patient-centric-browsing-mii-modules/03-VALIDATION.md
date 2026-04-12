---
phase: 3
slug: patient-centric-browsing-mii-modules
status: retroactive
nyquist_compliant: true
wave_0_complete: true
created: 2026-04-11
signed_off: 2026-04-12
note: "Retroactive sign-off during Phase 08. Phase shipped with tests: patient-list, patient-detail, mii-modules, patient-view-toggle, clinical-timeline."
---

# Phase 3 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | vitest |
| **Config file** | vite.config.ts |
| **Quick run command** | `npx vitest run --reporter=verbose` |
| **Full suite command** | `npx vitest run --reporter=verbose` |
| **Estimated runtime** | ~10 seconds |

---

## Sampling Rate

- **After every task commit:** Run `npx vitest run --reporter=verbose`
- **After every plan wave:** Run `npx vitest run --reporter=verbose`
- **Before `/gsd-verify-work`:** Full suite must be green
- **Max feedback latency:** 10 seconds

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Threat Ref | Secure Behavior | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|------------|-----------------|-----------|-------------------|-------------|--------|
| 03-01-01 | 01 | 1 | PTNT-01 | — | N/A | unit | `npx vitest run` | ❌ W0 | ⬜ pending |
| 03-01-02 | 01 | 1 | PTNT-02 | — | N/A | unit | `npx vitest run` | ❌ W0 | ⬜ pending |
| 03-02-01 | 02 | 1 | PTNT-03 | — | N/A | unit | `npx vitest run` | ❌ W0 | ⬜ pending |
| 03-02-02 | 02 | 1 | PTNT-04 | — | N/A | unit | `npx vitest run` | ❌ W0 | ⬜ pending |
| 03-02-03 | 02 | 1 | PTNT-05 | — | N/A | unit | `npx vitest run` | ❌ W0 | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

- [ ] Test framework setup (vitest already installed)
- [ ] Test stubs for patient list, patient detail, MII module tabs, timeline, toggle views

*If none: "Existing infrastructure covers all phase requirements."*

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| MII tab navigation renders correct resources | PTNT-03 | UI interaction flow | Open patient detail, click each MII tab, verify correct resource types appear |
| Timeline chronological ordering | PTNT-04 | Visual verification | Open patient timeline, verify entries appear in date order |
| Toggle between MII and raw FHIR views | PTNT-05 | UI state toggle | Click toggle, verify view switches between MII modules and raw FHIR types |

---

## Validation Sign-Off

- [x] All tasks have `<automated>` verify (tests: `patient-list`, `patient-detail`, `mii-modules`, `patient-view-toggle`, `clinical-timeline`)
- [x] Sampling continuity maintained
- [x] Wave 0 covered by prior phase infrastructure + mii-modules.ts seeded early
- [x] No watch-mode flags
- [x] Feedback latency < 3s
- [x] `nyquist_compliant: true`

**Approval:** 2026-04-12 (retroactive)
