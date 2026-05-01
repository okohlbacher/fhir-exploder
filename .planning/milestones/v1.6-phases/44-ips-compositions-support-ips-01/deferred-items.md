# Phase 44 — Deferred Items

Pre-existing issues observed during Phase 44 execution that are out of scope
for this phase (per Rule 1-3 SCOPE BOUNDARY in execute-plan workflow).

## Pre-existing test failures (not introduced by Phase 44)

### deuteranopia.test.tsx pair #13 (kardiologie ↔ mikrobiologie)

- **Location:** `src/__tests__/visual/deuteranopia.test.tsx:341`
- **Failure:** `ΔE2000 = 1.406` (threshold 5)
- **Status:** Known failure documented at base commit `8d8a0bc` (and earlier).
  Commit `5f99b93` (Phase 40-01) explicitly notes:
  *"land ΔE2000 ≥ 5.0 gate; pair #13 kardiologie ↔ mikrobiologie fails
  (Phase 40.1 will fix palette)"*.
- **Disposition:** Phase 44 does NOT touch palette / color tokens / Phase 40
  surface. Failure pre-dates Phase 44 worktree base. Defer to Phase 40.1
  palette adjustment.

## Run-time prepare hook timestamp drift

- **Location:** `src/quality/profiles/{extensions,ips}/ATTRIBUTION.md`
- **Behavior:** `npm run prepare` regenerates ATTRIBUTION.md with a fresh
  `Fetched on:` ISO timestamp on every install.
- **Disposition:** By design (Phase 34 D-13 idiom). Not a defect.
  Engineers running `npm install` locally may see this in `git status` —
  it is not staged/committed by GSD workflow agents. Documented here so
  future executors don't mis-read the diff as drift requiring a fix.
