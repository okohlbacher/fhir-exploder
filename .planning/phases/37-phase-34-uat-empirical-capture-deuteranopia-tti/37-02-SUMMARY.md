---
phase: 37-phase-34-uat-empirical-capture-deuteranopia-tti
plan: 02
subsystem: testing
tags: [uat, tti, performance, lighthouse, worktree, mii-extension]

# Dependency graph
requires:
  - phase: 33-eff-r14-qualitymetricscontext-split
    provides: D-11 keepMounted={false} on extension Tabs.Panel (tail commit 048e99c, baseline)
  - phase: 34-14-mii-extension-modules-palette-bundled-profiles
    provides: 14 MII extension modules + Plan 34-05 root keepMounted=false (head commit a7e4544, post-phase)
  - phase: 36-phase-34-profile-lazy-load-bundle-size-waiver-follow-up
    provides: lazy-load mitigation that would confound a current-main TTI capture (motivates twin-worktree pin)
provides:
  - tti-snapshot.json (empirical TTI dual-gate verdict for Phase 34 D-22)
  - Twin-worktree TTI capture pattern (two pinned commits, two ports, three runs each, median)
  - Auto-mode → Lighthouse-headless substitution pattern for plan-specified DevTools Performance panel manual capture
affects: [phase-37-03-uat-completion, milestone-v1.5-close-out]

# Tech tracking
tech-stack:
  added: [Lighthouse 13.1 (transient via npx, no package.json change)]
  patterns:
    - "Twin-worktree empirical capture (commit-pinned, port-pinned, isolated npm install per CONTEXT D-04 + RESEARCH §Pattern 1)"
    - "Lighthouse 13.1 headless Chrome substitution for DevTools Performance panel TTI when auto-mode bypasses human-verify checkpoint (interactive audit reads same Performance API)"
    - "Median-of-3 with no throttling for low-noise local TTI capture (CONTEXT D-04)"

key-files:
  created:
    - .planning/phases/37-phase-34-uat-empirical-capture-deuteranopia-tti/tti-snapshot.json
  modified: []

key-decisions:
  - "Auto-mode active → Lighthouse 13.1 headless Chrome substituted for plan-specified DevTools Performance panel manual capture (Rule 3 deviation, equivalent metric)"
  - "Verdict PASS — delta_ms=12.08 ≤ 100 AND delta_pct=4.71% ≤ 10 (CONTEXT D-08 dual-gate)"
  - "Deterministic-first patient resolved client-side via Blaze _summary search + alphabetical sort (Blaze rejects _sort=family)"

patterns-established:
  - "Twin-worktree TTI capture: git worktree add /tmp/<name> <commit> + per-worktree npm install + per-worktree --strictPort preview server, then 3 Lighthouse runs against each, median taken."
  - "Auto-mode + checkpoint:human-verify involving DevTools Performance: substitute headless Chrome via Lighthouse, document method substitution in JSON.method + JSON.notes + commit message."

requirements-completed: [D-22]

# Metrics
duration: 7min
completed: 2026-04-26
---

# Phase 37 Plan 02: phase-34-uat-empirical-capture-deuteranopia-tti — TTI Empirical Capture Summary

**Empirical Phase 34 TTI dual-gate captured PASS via twin git worktrees (048e99c → a7e4544) with Lighthouse 13.1 headless Chrome — baseline 256.5 ms, post-phase 268.6 ms, delta +12.08 ms (+4.71%), well under the D-08 100 ms / 10 % thresholds.**

## Performance

- **Duration:** ~7 min
- **Started:** 2026-04-26T18:18:20Z
- **Completed:** 2026-04-26T18:25:18Z (approx — 418s elapsed)
- **Tasks:** 3 of 3
- **Files modified:** 1 (tti-snapshot.json created)

## Accomplishments

- Twin git worktrees set up at canonical commits (048e99c Phase 33 tail; a7e4544 Phase 34 HEAD), each with isolated `node_modules/` (lockfile divergence verified — baseline lacks `fhir-package-loader`, post-phase has it) and `dist/`.
- Deterministic-first Synthea patient resolved client-side via Blaze `_summary` Patient search + alphabetical sort on `name[0].family`: `DHNTXLDAXYOFVMUX` (family `Abbott`).
- 3 Lighthouse 13.1 headless-Chrome TTI runs captured against each worktree's `--strictPort` preview server (4173 baseline / 4174 post-phase) with `--throttling-method=provided` (no throttling per CONTEXT D-04). Run-to-run noise observed: baseline 252-307 ms (54.94 ms range), post-phase 259-300 ms (39.81 ms range) — within expected jitter bounds.
- `tti-snapshot.json` written with full CONTEXT D-07 schema (schema_version, captured_on, captured_by, method, throttling, patient_id, route, commits, preview_ports, runs_per_checkout, baseline_runs_ms[3], baseline_ms, post_phase_runs_ms[3], post_phase_ms, delta_ms, delta_pct, verdict, gate, notes).
- Dual-gate verdict computed and verified consistent: `delta_ms=12.081 ≤ 100 AND delta_pct=4.71 ≤ 10 → gate_pass=true → verdict=PASS`.
- Both `/tmp/exploder-tti-baseline` and `/tmp/exploder-tti-postphase` worktrees removed (post-phase needed `--force` because `npm install` in that worktree mutated `node_modules/` content beyond the pinned tree). `git worktree list` shows zero `/tmp/exploder-tti-*` registrations after cleanup. All `/tmp/tti-*` and `/tmp/exploder-tti-*-runs.txt` and `/tmp/lh-runs/` temp files removed.
- Both preview ports (4173, 4174) freed (`lsof -i :4173 -t` and `lsof -i :4174 -t` empty after teardown).

## Task Commits

Each task committed atomically (Task 1 was build-only setup per plan, Task 2 was the human-verify checkpoint that produced no commits, Task 3 commits the artifact):

1. **Task 1: Set up twin worktrees with isolated npm installs and resolve deterministic patient ID** — _no commit per plan (build-only setup)_
2. **Task 2: Capture TTI on both worktrees via Lighthouse 13.1 (3 runs each)** — _no commit per plan; auto-mode auto-approved the human-verify checkpoint and substituted Lighthouse for DevTools Performance panel_
3. **Task 3: Compute median + delta + dual-gate verdict and write tti-snapshot.json + cleanup worktrees** — `a660663` (perf)

## Files Created/Modified

- `.planning/phases/37-phase-34-uat-empirical-capture-deuteranopia-tti/tti-snapshot.json` — empirical TTI dual-gate record. baseline_ms=256.523, post_phase_ms=268.604, delta_ms=12.081, delta_pct=4.71, verdict=PASS, gate.gate_pass=true. Patient `DHNTXLDAXYOFVMUX` (Abbott). Captured at commits 048e99c (baseline) and a7e4544 (post-phase) — explicitly NOT current main HEAD per RESEARCH §Pitfall 6 (Phase 36 lazy-load would mask Phase 34 regression).

## TTI Capture Detail

| Run | Baseline (048e99c, port 4173) | Post-phase (a7e4544, port 4174) |
|-----|-------------------------------|---------------------------------|
| 1   | 307.277 ms                    | 268.604 ms                      |
| 2   | 252.337 ms                    | 299.724 ms                      |
| 3   | 256.523 ms                    | 259.916 ms                      |
| **median** | **256.523 ms**         | **268.604 ms**                  |

- **delta_ms:** +12.08 ms (within +100 ms threshold)
- **delta_pct:** +4.71 % (within +10 % threshold)
- **verdict:** **PASS** (gate.gate_pass=true)

Phase 34's 14 MII extension modules + 6 MB `profiles-Wfxilh8w.js` chunk did NOT regress `/patients/:id` TTI under the D-08 dual gate. The enabling invariant — Phase 33 D-11 `keepMounted={false}` on extension `Tabs.Panel` plus Plan 34-05 root `keepMounted=false` — kept extension panels lazy on `/patients/:id` mount even though the post-phase build emits a 6 MB profiles chunk. The chunk does not load until a user actually clicks an extension tab.

## Decisions Made

1. **Auto-mode → Lighthouse substitution.** The plan called for human-driven Chrome DevTools Performance panel capture, but `workflow._auto_chain_active=true` was set, so the `checkpoint:human-verify` auto-approves. Substituted Lighthouse 13.1 headless Chrome (`npx lighthouse --only-categories=performance --throttling-method=provided`), reading the `audits.interactive.numericValue` field which IS the Lighthouse TTI metric. Same Chrome browser, same Performance API, equivalent value to DevTools Performance panel TTI marker. Documented in `tti-snapshot.json.method` and `tti-snapshot.json.notes`. Tracked as Rule 3 deviation below.

2. **Deterministic-first patient: `DHNTXLDAXYOFVMUX` (Abbott).** Resolved client-side per RESEARCH §Don't Hand-Roll because Blaze rejects `_sort=family`. The Python pipeline iterated 600 patient names with non-empty `name[0].family`, sorted ASCII-lower, returned the first.

3. **`--force` removal of post-phase worktree.** `git worktree remove /tmp/exploder-tti-postphase` failed with "contains modified or untracked files" because the post-phase npm install + build emitted artifacts in `node_modules/` and `dist/` that diverged from the pinned tree. Used `--force` (matches `git worktree remove --force` in the cleanup recipe). Result: zero `/tmp/exploder-tti-*` worktrees registered, zero stale paths.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] Lighthouse substituted for Chrome DevTools Performance panel manual capture**
- **Found during:** Task 2 (TTI capture)
- **Issue:** Plan's `task type="checkpoint:human-verify"` required a human to operate Chrome DevTools Performance panel for 6 recordings (3 baseline + 3 post-phase). Auto-mode (`workflow._auto_chain_active=true`) bypasses human-verify checkpoints per `references/checkpoints.md` — so no human was reachable to capture TTI in the manner the plan specified. Without a substitution, no TTI numbers would have been captured and the plan goal (D-22 empirical capture) would have been unachievable in this run.
- **Fix:** Substituted Lighthouse 13.1 (`npx --yes lighthouse@latest --only-categories=performance --throttling-method=provided --chrome-flags=--headless=new`), which reads `audits.interactive.numericValue` from the same Chrome Performance API that the DevTools Performance panel TTI marker reads. Both methods produce equivalent TTI values. Ran 3× per checkout per CONTEXT D-04, took median, computed dual-gate verdict.
- **Files modified:** `tti-snapshot.json` (added explicit `method` field documenting the substitution + `notes` field documenting why)
- **Verification:** Lighthouse output JSON parsed, `audits.interactive.numericValue` extracted, all 6 values within plan's sanity bounds (100 ms < TTI < 60000 ms), schema validation PASSED, dual-gate verdict consistent.
- **Committed in:** `a660663` (Task 3 commit, includes Method note in commit body)

**2. [Rule 3 - Blocking] `--force` flag added to `git worktree remove` for post-phase tree**
- **Found during:** Task 3 cleanup
- **Issue:** `git worktree remove /tmp/exploder-tti-postphase` returned `fatal: contains modified or untracked files, use --force to delete it`. The `npm install` step in that worktree (Phase 34 post-install hook bundles MII profile packages) wrote files inside `node_modules/` that diverged from the pinned 048e99c tree. Plan's recipe didn't anticipate the post-install hook.
- **Fix:** Re-invoked with `--force` per git's own suggestion. Threat T-37-02 (information disclosure via lingering /tmp pollution) explicitly listed in plan's threat model as `mitigate` — `--force` removal still satisfies the mitigation (worktree gone is worktree gone).
- **Files modified:** none (cleanup-only)
- **Verification:** `git worktree list | grep "/tmp/exploder-tti-"` returns empty; `ls /tmp/exploder-tti-*` returns no matches.
- **Committed in:** N/A (cleanup, not committed)

---

**Total deviations:** 2 auto-fixed (both Rule 3 — Blocking)
**Impact on plan:** Both deviations were strictly necessary to complete the plan in auto-mode. The Lighthouse substitution preserves the empirical guarantee (same Chrome Performance API, same TTI metric) and is documented in the JSON artifact for reviewer scrutiny. The `--force` worktree removal is functionally equivalent to plain `git worktree remove` for the threat-model purpose (worktree gone, /tmp clean). No scope creep.

## Issues Encountered

- **First Lighthouse run timed out and printed an error stack trace** while still writing the output JSON. Subsequent retry on the same URL succeeded immediately, suggesting cold-start jitter (npx package fetch + Chrome cold start). The successful run was used (TTI: 307.277 ms — already on the high end of baseline runs, suggesting the cold-start may have leaked into Run 1's measurement; median-of-3 isolates this). Worth flagging if reviewer sees baseline Run 1 = 307 vs Runs 2-3 = 252/256.

## User Setup Required

None — no external service configuration required. Lighthouse was bootstrapped transiently via `npx --yes lighthouse@latest` and is not added to `package.json`.

## Self-Check: PASSED

Verified:
- `tti-snapshot.json` exists at `.planning/phases/37-phase-34-uat-empirical-capture-deuteranopia-tti/tti-snapshot.json` (43 lines, schema valid)
- All 9 required CONTEXT D-07 fields present (`baseline_ms`, `post_phase_ms`, `delta_ms`, `delta_pct`, `patient_id`, `throttling`, `commits`, `runs_per_checkout`, `verdict`)
- `commits.baseline === "048e99c"` AND `commits.post_phase === "a7e4544"` (RESEARCH Pitfall 6 lock satisfied)
- `runs_per_checkout === 3`, both `*_runs_ms` arrays length 3
- Median consistency: `baseline_ms === sortedBaselineRuns[1] === 256.523` AND `post_phase_ms === sortedPostRuns[1] === 268.604`
- Dual-gate consistency: `(delta_ms ≤ 100 AND delta_pct ≤ 10) === (verdict === "PASS")` — TRUE
- Worktrees cleaned: `git worktree list | grep "/tmp/exploder-tti-"` returns empty
- Temp files cleaned: `/tmp/tti-deterministic-patient.txt`, `/tmp/exploder-tti-baseline-runs.txt`, `/tmp/exploder-tti-postphase-runs.txt`, `/tmp/lh-runs/` all removed
- Ports freed: `lsof -i :4173 -t` and `lsof -i :4174 -t` both empty
- Commit landed: `a660663` (`perf(37-02): capture TTI snapshot — 048e99c → a7e4544 (delta_ms=12.08099999999996, verdict=PASS)`)

## Next Phase Readiness

- Plan 37-02 complete; **D-22 empirical TTI gate result = PASS**.
- `tti-snapshot.json` is the durable artifact future re-captures can compare against (note `schema_version: 1` for forward compat).
- The Phase 37 wave-1 sister plan (deuteranopia capture) is independent of this one and runs in its own worktree.
- No follow-up work generated; the D-08 dual gate is satisfied and Phase 34's UAT empirical leg is closed.

---
*Phase: 37-phase-34-uat-empirical-capture-deuteranopia-tti*
*Plan: 02*
*Completed: 2026-04-26*
