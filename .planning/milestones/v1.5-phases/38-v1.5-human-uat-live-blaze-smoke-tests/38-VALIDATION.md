---
phase: 38
slug: v1.5-human-uat-live-blaze-smoke-tests
status: complete
nyquist_compliant: true
wave_0_complete: true
created: 2026-04-29
backfilled: true
backfilled_by: phase-39
phase_character: human_uat_observational
notes: |
  Retroactive validation strategy authored 2026-04-29 under Phase 39 NYQ-01.
  Phase 38 was an observational closure phase (zero src/ test files added —
  see 38-VERIFICATION.md "Anti-Patterns Found" section). Its validation
  contract is the 12-test HUMAN-UAT walk recorded in 33-HUMAN-UAT.md (6
  tests) and 35-HUMAN-UAT.md (6 tests), executed in a single browser
  session per D-09 invariant against the Blaze fingerprint pinned in
  38-SESSION.md (Patient=500, Observation=349715). Outcome:
  8 pass / 4 fail (3 critical-severity from Phase 33 cascading from a
  single Blaze 1.6.2 _sort=-date HTTP 400 root cause → routed to inserted
  Phase 38.1; 1 cosmetic from Phase 35 → minor follow-up).
  Nyquist sampling is satisfied by exhaustive coverage: every
  Phase-33-leftover and Phase-35-leftover live-Blaze test was walked
  against real Synthea data; observational phases do not author new
  automated tests. nyquist_compliant flipped to true on retroactive review.
---

# Phase 38 — Validation Strategy

> Retroactive per-phase validation contract — backfilled 2026-04-29 under Phase 39 NYQ-01.

**Phase character:** Live-Blaze HUMAN-UAT walk + closure-record authoring, not new code. The validation surface is the 12 walked tests (HUMAN-UAT artifacts) plus the cross-phase parent-VERIFICATION re-flip from `human_needed` → `passed` on 33-VERIFICATION.md and 35-VERIFICATION.md. No new automated tests authored — verification is artifact-existence + walk-result inventory.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | HUMAN-UAT (manual walk against live Blaze 1.6.2 + Synthea bundle) |
| **Config file** | `38-SESSION.md` (Synthea fingerprint pin: Patient=500, Observation=349715) |
| **Quick run command** | N/A (browser session) |
| **Full suite command** | `grep -c '^- \[x\]' .planning/phases/{33,35}-*/3{3,5}-HUMAN-UAT.md` (must return 12 — count of completed test rows) |
| **Estimated runtime** | ~90 min single session (D-09 invariant) |

---

## Sampling Rate

Sampling rate is the walk itself. Per Phase 38 D-09 invariant the 12 tests are walked in a single browser session — no incremental sampling between tests. After the walk: 33-HUMAN-UAT.md and 35-HUMAN-UAT.md frontmatter must show all 12 tests with non-pending `result:` values.

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Threat Ref | Secure Behavior | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|------------|-----------------|-----------|-------------------|-------------|--------|
| 38-01-01 | 01 | 1 | MII-EXT-04 | — | Laborbefund tab populated only with category=laboratory observations | human_uat | (manual walk; result in 33-HUMAN-UAT.md Test 1) | ✅ | ❌ → fixed in 38.1 |
| 38-01-02 | 01 | 1 | MII-EXT-08 | — | Timeline 4-color + German labels | human_uat | (manual walk; 33-HUMAN-UAT.md Test 2) | ✅ | ❌ → fixed in 38.1 |
| 38-01-03 | 01 | 1 | UAT-FU-04 | — | Dashboard MII heading 'MII Kerndatensatz · Server-wide totals' | human_uat | 33-HUMAN-UAT.md Test 3 | ✅ | ✅ pass |
| 38-01-04 | 01 | 1 | MII-EXT-04..07 | — | Dashboard tile Drawer + 'Open in Explorer' | human_uat | 33-HUMAN-UAT.md Test 4 | ✅ | ✅ pass |
| 38-01-05 | 01 | 1 | MII-EXT-01..08 | — | MiiModuleTabs deep-link + zero-extension surface guard | human_uat | 33-HUMAN-UAT.md Test 5 | ✅ | ✅ pass |
| 38-01-06 | 01 | 1 | UAT-FU-06 | — | Per-patient Laborbefund populated | human_uat | 33-HUMAN-UAT.md Test 6 | ✅ | ❌ → fixed in 38.1 |
| 38-02-01 | 02 | 2 | UAT-FU-01 | — | (per Phase-35 walk row 1) | human_uat | 35-HUMAN-UAT.md Test 1 | ✅ | ✅ pass |
| 38-02-02 | 02 | 2 | UAT-FU-02 | — | (Phase-35 row 2) | human_uat | 35-HUMAN-UAT.md Test 2 | ✅ | ✅ pass |
| 38-02-03 | 02 | 2 | UAT-FU-05 | — | (Phase-35 row 3) | human_uat | 35-HUMAN-UAT.md Test 3 | ✅ | ✅ pass |
| 38-02-04 | 02 | 2 | UAT-FU-05 | — | (Phase-35 row 4 — cosmetic JSON View) | human_uat | 35-HUMAN-UAT.md Test 4 | ✅ | ❌ cosmetic (accepted under D-01 minor path) |
| 38-02-05 | 02 | 2 | UAT-FU-01 | — | (Phase-35 row 5) | human_uat | 35-HUMAN-UAT.md Test 5 | ✅ | ✅ pass |
| 38-02-06 | 02 | 2 | UAT-FU-02 | — | (Phase-35 row 6) | human_uat | 35-HUMAN-UAT.md Test 6 | ✅ | ✅ pass |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

No Wave 0 — observational phase. The validation surface is 33-HUMAN-UAT.md + 35-HUMAN-UAT.md (already exist with results recorded; verified by `grep -c 'result: pass\|result: fail' .planning/phases/{33,35}-*/3{3,5}-HUMAN-UAT.md` = 12).

---

## Manual-Only Verifications

All 12 walked tests ARE manual-only by design. Each test row in 33-HUMAN-UAT.md / 35-HUMAN-UAT.md carries its own `expected:` + `why_human:` rationale. Phase 38 added no new manual verifications beyond closing the existing 12.

---

## Validation Sign-Off

- [x] All tasks have `<automated>` verify or are documented in Manual-Only Verifications
- [x] Sampling continuity: walk-coverage exhaustive (all 12 tests executed)
- [x] Wave 0 covers all MISSING references (N/A — observational phase)
- [x] No watch-mode flags (N/A — manual walk)
- [x] Feedback latency: ~90 min single session (D-09 invariant)
- [x] `nyquist_compliant: true` set in frontmatter

**Approval:** approved 2026-04-29 (retroactive backfill via Phase 39 NYQ-01)
