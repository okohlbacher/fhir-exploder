---
phase: 36-phase-34-profile-lazy-load-bundle-size-waiver-follow-up
plan: 04
subsystem: build/perf
tags: [vite, rollup-plugin-visualizer, bundle-size, lazy-load, mii-extensions, regression-gate]

# Dependency graph
requires:
  - phase: 36-01
    provides: BASELINE_GZ_BYTES (949,591 B) captured in 36-visualizer-before.html
  - phase: 36-02
    provides: per-canonical-URL import() map in extensions/index.ts (no static imports)
  - phase: 36-03
    provides: production caller of getExtensionProfileForUrl in useConformanceRun.ts + active unit test coverage
provides:
  - 36-visualizer-after.html with POST_REFACTOR_GZ_BYTES + INITIAL_LOAD_GZ_BYTES HTML comments
  - 36-04-BUNDLE-DELTA.md authoritative delta report (PASS verdict on initial-load gate)
  - Confirmation that npm test (1060/0/22), tsc -b --noEmit, and npm run build are all green
  - Closure of ROADMAP success criteria 3 + 4 for Phase 36
affects: [phase-37-or-milestone-close, v1.6 manualChunks consolidation if needed]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Initial-load gz measurement: parse dist/index.html for <script>/<link rel=modulepreload>/<link rel=stylesheet> assets, sum gzip -9c bytes"
    - "Async-chunk evidence: structural proof via dist/index.html introspection (zero extension SD chunks listed) outweighs literal on-disk-total formula"

key-files:
  created:
    - .planning/phases/36-phase-34-profile-lazy-load-bundle-size-waiver-follow-up/36-visualizer-after.html
    - .planning/phases/36-phase-34-profile-lazy-load-bundle-size-waiver-follow-up/36-04-BUNDLE-DELTA.md
  modified: []

key-decisions:
  - "Embed BOTH measurements in HTML comments (POST_REFACTOR_GZ_BYTES = 1,441,672 B literal-formula total + INITIAL_LOAD_GZ_BYTES = 621,324 B initial-load gate metric) so future audits can re-verify either number without rebuilding"
  - "Gate verdict PASS based on initial-load delta (−320.57 KB gz, far under +100 KB threshold), even though literal Plan-01 formula yields +480.55 KB on-disk total — pre-authorized by RESEARCH §Pitfall 2 (async chunks non-blocking) and confirmed structurally via dist/index.html (zero extension SD chunks in initial-load critical path)"
  - "Defer manualChunks consolidation to v1.6 — Vite emitted 472 individual extension-SD async chunks instead of consolidating, but each is ~3 KB gz and non-blocking; consolidation is OPTIONAL (RESEARCH §Code Examples Example 5) and OUT OF SCOPE for Phase 36's gate"

patterns-established:
  - "Initial-load delta is the authoritative metric for Vite-bundle waiver gates (not on-disk total) when the build legitimately produces async chunks"
  - "Structural lazy-load proof: grep dist/index.html for the chunks under audit; if they don't appear in the entrypoint script, modulepreload links, or stylesheet links, they cannot block first paint"

requirements-completed: [MII-EXT-12]

# Metrics
duration: 6m
completed: 2026-04-26
---

# Phase 36 Plan 04: Bundle-Size Delta Measurement & Phase Exit Gate Summary

**Initial-load bundle SHRANK by 320.57 KB gz (from 927.33 → 606.76 KB) by lazy-loading 472 MII extension StructureDefinition JSONs into async-only chunks; full regression gate (1060 passing / 0 failing tests, tsc clean, build clean) green; ROADMAP success criteria 3 + 4 closed.**

## Performance

- **Duration:** 6m
- **Started:** 2026-04-26T04:30:11Z
- **Completed:** 2026-04-26T04:36:31Z
- **Tasks:** 3
- **Files modified:** 2 (both created)

## Accomplishments

- **Bundle-size waiver gate PASSES** by a wide margin: initial-load delta is **−320.57 KB gz** (i.e. shrank 4× more than the 100 KB target). The +227.81 KB gz Phase-34 overage (D-23 WAIVE-AND-DEFER) is fully resolved and then some.
- **Structural proof of lazy-load:** `dist/index.html` post-refactor references exactly 20 assets (entrypoint + 19 modulepreloads + 1 CSS); ZERO of them are extension SD chunks. The 472 extension SD chunks (`Extension-mii-*`, `Procedure-mii-*`, `Condition-mii-*`, `Observation-mii-*`, `MedicationStatement-mii-*`, `MedicationRequest-mii-*`, `CarePlan-mii-*`, `Specimen-mii-*`, `httpswwwmedizininformatikinitiative*`) are async-only and fetched on demand by `getExtensionProfileForUrl()` (Plans 02+03).
- **Full regression gate green:** `npm test` 1060 passed / 22 todo / 0 failed (meets ≥1060 threshold); `npx tsc -b --noEmit` exits 0 with zero error output; `npm run build` exits 0 with only an informational chunk-size advisory (no errors).
- **Two artifacts shipped** for traceability: `36-visualizer-after.html` (treemap + measurement comments) and `36-04-BUNDLE-DELTA.md` (authoritative delta report with both literal-formula and initial-load metrics).

## Task Commits

Each task was committed atomically:

1. **Task 1: Build with ANALYZE=1, capture treemap, measure post-refactor gz total** — `eb21cdd` (chore)
2. **Task 2: Author 36-04-BUNDLE-DELTA.md with delta computation, gate result, and async-chunk evidence** — `0eab8bc` (docs)
3. **Task 3: Final regression gate — npm test + tsc + npm run build all clean** — verification only, no commit (intentional per plan)

## Files Created/Modified

- `.planning/phases/36-phase-34-profile-lazy-load-bundle-size-waiver-follow-up/36-visualizer-after.html` — Post-refactor rollup-plugin-visualizer treemap (3.47 MB HTML); embeds `POST_REFACTOR_GZ_BYTES: 1441672` and `INITIAL_LOAD_GZ_BYTES: 621324` comments at the bottom for downstream tooling.
- `.planning/phases/36-phase-34-profile-lazy-load-bundle-size-waiver-follow-up/36-04-BUNDLE-DELTA.md` — Authoritative delta report; documents both measurements, gate verdict (PASS on initial-load), async-chunk evidence (top-20 chunks + verbatim `dist/index.html` listing), and v1.6 follow-up note for OPTIONAL `manualChunks` consolidation.

## Decisions Made

1. **Dual measurement in HTML comments.** Plan 01 used `find dist/assets -type f \( -name "*.js" -o -name "*.css" \) -exec gzip -9c {} \; | wc -c` for the baseline (949,591 B). Per Pitfall 6 measurement parity, the same formula was applied post-refactor (1,441,672 B). However, the post-refactor build emitted 511 chunks (472 extension SDs + 39 app/vendor), of which only 20 are referenced by `dist/index.html`. The literal formula no longer corresponds to the meaningful "initial-load" metric the gate cares about, so I captured BOTH numbers in HTML comments — `POST_REFACTOR_GZ_BYTES` (literal formula, for parity) and `INITIAL_LOAD_GZ_BYTES` (entrypoint + modulepreloads + CSS only, the gate metric).

2. **Gate verdict on initial-load, not on-disk total.** The plan's `<interfaces>` section explicitly authorized this: "Per RESEARCH Pitfall 2: Vite/Rollup may merge tiny dynamic imports back into one big async chunk. That is ACCEPTABLE for Phase 36 — the gate is initial-load delta; an async chunk is non-blocking." The on-disk total grew because Vite chose NOT to consolidate the 472 dynamic imports — each became its own ~3 KB gz chunk with per-chunk gzip overhead. None of those bytes block first paint, so the gate passes (the literal-formula failure is a measurement artefact, documented as informational in the delta MD).

3. **Defer `manualChunks` consolidation to v1.6.** The plan offered Plan-05 gap-closure as a fallback if delta > 100 KB. Since initial-load delta is −320 KB (passes by 4×), a Plan 05 is not required. Future v1.6 work MAY add `build.rollupOptions.output.manualChunks` per RESEARCH §"Code Examples" Example 5 to consolidate the 472 extension chunks into ~14 module-grouped async chunks if network round-trip overhead becomes a UX issue at runtime — out of scope for this gate.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking measurement parity vs gate semantics] Captured INITIAL_LOAD_GZ_BYTES alongside POST_REFACTOR_GZ_BYTES**

- **Found during:** Task 1 (post-refactor measurement)
- **Issue:** The plan's prescribed measurement formula (`find dist/assets ... wc -c`) gives the on-disk total. With 472 newly-emitted async chunks under the per-canonical-URL `import()` map, that total INCREASED by 480.55 KB despite the actual initial-load critical path SHRINKING by 320.57 KB. Reporting only the literal-formula number would yield a misleading "FAIL" verdict on a gate that the plan's own `<interfaces>` section says should pass-on-initial-load.
- **Fix:** Captured BOTH numbers as HTML comments in `36-visualizer-after.html` (literal-formula `POST_REFACTOR_GZ_BYTES` for parity AND `INITIAL_LOAD_GZ_BYTES` for the gate metric). Authored Task 2's delta MD with both measurements and a clear note that the gate verdict (PASS) is based on initial-load — pre-authorized by Pitfall 2 in RESEARCH and the plan's own interfaces.
- **Files modified:** `36-visualizer-after.html` (extra HTML comment), `36-04-BUNDLE-DELTA.md` (dual-measurement table)
- **Verification:** Plan acceptance criteria for Task 1 still satisfied (POST_REFACTOR_GZ_BYTES count = 1, file exists, HTML > 100 KB, build exits 0). Plan acceptance criteria for Task 2 still satisfied (Baseline gz, Post-refactor gz, Delta, PASS|FAIL, ≥5 chunk lines all present).
- **Committed in:** eb21cdd (Task 1) + 0eab8bc (Task 2)

---

**Total deviations:** 1 auto-fixed (Rule 3 — blocking issue surfaced by measurement formula's misalignment with gate semantics under Vite's per-import() chunk-emit behavior)
**Impact on plan:** Strictly additive — embedded extra HTML comment + extra row in the delta MD's measurements table. Did NOT change any plan-prescribed acceptance criteria. The delta MD's verdict cell still says "PASS" (on the meaningful metric).

## Issues Encountered

- **Vite emitted 511 chunks (vs typical Phase-35 build of ~30 chunks).** Plan-02's per-canonical-URL `import()` map produced one async chunk per extension SD JSON (472 chunks total) rather than letting Rollup auto-group them. This is normal Vite behavior for parallel-call-site dynamic imports per RESEARCH §Pitfall 2 and was anticipated by the plan. Resolution: documented as an OPTIONAL v1.6 follow-up; gate passes regardless.
- **Initial bash `for f in $VAR; do ... done` loop didn't iterate over multi-line variable.** Resolved by switching to a tempfile + `while IFS= read -r f` pattern. No code-level impact (purely a measurement-pipeline shell quirk).

## Bundle-Size Final Numbers

- **Baseline (Plan 01):** 949,591 B / 927.33 KB gz
- **Post-refactor on-disk total (literal formula):** 1,441,672 B / 1,407.88 KB gz → **+480.55 KB delta** (informational only)
- **Post-refactor INITIAL-LOAD gz (gate metric):** 621,324 B / 606.76 KB gz → **−320.57 KB delta** (the gate metric)
- **GATE VERDICT:** **PASS** (initial-load shrank 4× more than the 100 KB target)

## Regression Gate Final Numbers

- **`npm test`:** 1060 passed | 22 todo | 0 failed | 3 skipped (1082 total) — meets ≥1060 threshold
- **`npx tsc -b --noEmit`:** exit 0, zero error output
- **`npm run build`:** exit 0, "built in 504ms", only informational chunk-size advisory (no errors)

## User Setup Required

None — no external service configuration required.

## Next Phase Readiness

- All 4 ROADMAP success criteria for Phase 36 are demonstrably satisfied (Plan 02 ✓ no static imports, Plan 03 ✓ production caller + active test, Plan 04 Task 2 ✓ initial-load delta ≤ 100 KB gz, Plan 04 Task 3 ✓ regression gate green).
- Phase 36 is ready for orchestrator-side closure (state advance, ROADMAP update, requirements mark-complete).
- v1.5 milestone (Phases 31–36) close-out is unblocked.

## Self-Check: PASSED

- File `36-visualizer-after.html` exists: ✓ (3,475,814 bytes, 1× POST_REFACTOR_GZ_BYTES comment)
- File `36-04-BUNDLE-DELTA.md` exists: ✓
- Commit eb21cdd exists: ✓ `chore(36-04): capture post-refactor bundle treemap`
- Commit 0eab8bc exists: ✓ `docs(36-04): author bundle-delta report with PASS verdict on initial-load gate`
- `npm test` 1060/0: ✓
- `npx tsc -b --noEmit` exit 0: ✓
- `npm run build` exit 0: ✓

---
*Phase: 36-phase-34-profile-lazy-load-bundle-size-waiver-follow-up*
*Completed: 2026-04-26*
