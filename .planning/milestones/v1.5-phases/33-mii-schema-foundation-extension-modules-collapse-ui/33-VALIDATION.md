---
phase: 33
slug: mii-schema-foundation-extension-modules-collapse-ui
status: complete
nyquist_compliant: true
wave_0_complete: true
created: 2026-04-29
backfilled: true
backfilled_by: phase-39
notes: |
  Retroactive validation strategy authored 2026-04-29 under Phase 39 NYQ-01.
  Phase 33 added approximately 66 net new passing tests (test baseline
  836 → 902 passing across 7 plans), with concentrated coverage in:
  - src/__tests__/mii-modules.test.ts (5 new tests across plans 33-03 and 33-07: 2 widened-schema + 3 multi-type/shadow-guard regressions for MII-EXT-08)
  - src/components/patients/__tests__/MiiModuleTab.test.tsx (5 new tests in plan 33-04)
  - src/components/patients/__tests__/ClinicalTimeline.test.tsx (3 new regression tests in plan 33-07)
  Plus existing-test-file reuse for the schema widening, extraQuery URL
  construction, and dashboard MII section relabel. Per-REQ coverage exists
  for MII-EXT-01..08 + UAT-FU-04, UAT-FU-06 (subsumed). Live-Blaze UAT
  coverage was scheduled to (and did) close under Phase 38's HUMAN-UAT walk
  and the inserted Phase 38.1 fix-walk; 33-VERIFICATION.md was re_verified
  by phase-38 on 2026-04-28. nyquist_compliant flipped to true on
  retroactive review.
---

# Phase 33 — Validation Strategy

> Retroactive per-phase validation contract — backfilled 2026-04-29 under Phase 39 NYQ-01.
>
> Phase 33 (MII schema foundation + extension-modules collapse UI) shipped its full test surface across plans 33-01..33-07 but did not author a VALIDATION.md at execution time. This file documents the validation contract that was *de facto* satisfied by the existing test inventory.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | Vitest 4.1.4 + @testing-library/react 16.3.2 + jsdom 29.0.2 |
| **Config file** | `vitest.config.ts` (existing) |
| **Quick run command** | `npx vitest run src/__tests__/mii-modules.test.ts src/components/patients/__tests__/MiiModuleTab.test.tsx src/components/patients/__tests__/ClinicalTimeline.test.tsx` |
| **Full suite command** | `npm test` |
| **Estimated runtime** | ~25 s (post-Phase 33 baseline 902 passing) |

---

## Sampling Rate

- **After every task commit:** Run targeted vitest on files-touched-by-task (<2 s)
- **After every plan wave:** `npm test` full suite + `npx tsc -b --noEmit`
- **Before `/gsd-verify-work`:** full suite green (≥ 902 passing / 0 failing)
- **Max feedback latency:** 60 s

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Threat Ref | Secure Behavior | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|------------|-----------------|-----------|-------------------|-------------|--------|
| 33-01-01 | 01 | 1 | UAT-FU-06 | — | extraQuery URL appends `&category=laboratory` for Observation searches | unit | `npx vitest run src/__tests__/mii-modules.test.ts` | ✅ | ✅ green |
| 33-02-01 | 02 | 1 | MII-EXT-08 (D-15) | — | findModuleForType migration in ClinicalTimeline.tsx (replaces ===  comparison) | regression | `npx vitest run src/components/patients/__tests__/ClinicalTimeline.test.tsx` | ✅ | ✅ green |
| 33-03-01 | 03 | 2 | MII-EXT-01..03 | — | Widened MiiModule schema with category: 'base' \| 'extension'; 6 test updates + 2 new tests | unit | `npx vitest run src/__tests__/mii-modules.test.ts` | ✅ | ✅ green |
| 33-04-01 | 04 | 2 | MII-EXT-04..06 | — | MiiModuleTab component (Drawer + 'Open in Explorer'); +5 tests | component | `npx vitest run src/components/patients/__tests__/MiiModuleTab.test.tsx` | ✅ | ✅ green |
| 33-05-01 | 05 | 3 | MII-EXT-04..07 | — | MiiModuleTabs layout wrapper (no new tests — pure composition) | structural | `grep -c "MiiModuleTabs" src/components/patients/MiiModuleTabs.tsx` ≥ 1 | ✅ | ✅ green |
| 33-06-01 | 06 | 3 | UAT-FU-04 | — | Dashboard MII heading 'MII Kerndatensatz · Server-wide totals' (relabel) | unit | `npx vitest run src/components/dashboard/__tests__/` | ✅ | ✅ green |
| 33-07-01 | 07 | 4 | MII-EXT-08 (D-15) | — | Multi-type module shadow-guard + same-germanLabel + same-badgeColor regressions | regression | `npx vitest run src/__tests__/mii-modules.test.ts src/components/patients/__tests__/ClinicalTimeline.test.tsx` | ✅ | ✅ green |
| 33-07-02 | 07 | 4 | all | — | Full regression: ≥902 passing / 0 failing + tsc clean | aggregate | `npm test && npx tsc -b --noEmit` | ✅ | ✅ green |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

Wave 0 complete retroactively. The 3 cited test files (`src/__tests__/mii-modules.test.ts`, `src/components/patients/__tests__/MiiModuleTab.test.tsx`, `src/components/patients/__tests__/ClinicalTimeline.test.tsx`) already exist with the post-Phase 33 test counts (verified via `wc -l` against current HEAD). No framework installs needed.

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions / Closure Evidence |
|----------|-------------|------------|--------------------------------------|
| Live Synthea Laborbefund extraQuery — `&category=laboratory` filter populates only lab observations | UAT-FU-06 | Live-Blaze data sourced from real Synthea bundle; Vitest covers URL-construction unit, but the populated-tab UX is human-perceptual | closed by phase-38 HUMAN-UAT walk + phase-38.1 fix-walk; see 33-HUMAN-UAT.md results columns and 38-VERIFICATION.md |
| Timeline 4-color + German labels render correctly under MII palette | MII-EXT-08 | Palette + label parity is visual; emulator screenshots assert color but final label German pluralization needs human read | closed by phase-38 HUMAN-UAT walk + phase-38.1 fix-walk; see 33-HUMAN-UAT.md results columns and 38-VERIFICATION.md |
| Dashboard 'MII Kerndatensatz · Server-wide totals' heading present and accurate | UAT-FU-04 | Heading copy is human-read, German+English mix | closed by phase-38 HUMAN-UAT walk + phase-38.1 fix-walk; see 33-HUMAN-UAT.md results columns and 38-VERIFICATION.md |
| Dashboard tile Drawer no-new-fetch (cache hit) | MII-EXT-04..07 | Network-hit detection is human-observed (DevTools) | closed by phase-38 HUMAN-UAT walk + phase-38.1 fix-walk; see 33-HUMAN-UAT.md results columns and 38-VERIFICATION.md |
| MiiModuleTabs deep-link (URL → tab activation) | MII-EXT-04..07 | Browser URL state interaction is human-driven | closed by phase-38 HUMAN-UAT walk + phase-38.1 fix-walk; see 33-HUMAN-UAT.md results columns and 38-VERIFICATION.md |
| Per-patient Laborbefund populated against real Synthea data | UAT-FU-06 | Real-data correctness needs live Blaze + perceptual judgment | closed by phase-38 HUMAN-UAT walk + phase-38.1 fix-walk; see 33-HUMAN-UAT.md results columns and 38-VERIFICATION.md |

---

## Validation Sign-Off

- [x] All tasks have `<automated>` verify or Wave 0 dependencies
- [x] Sampling continuity: no 3 consecutive tasks without automated verify
- [x] Wave 0 covers all MISSING references (none — all test files existed at phase close)
- [x] No watch-mode flags (`vitest run`, not `vitest`)
- [x] Feedback latency < 60s (full suite ~25s)
- [x] `nyquist_compliant: true` set in frontmatter

**Approval:** approved 2026-04-29 (retroactive backfill via Phase 39 NYQ-01)
