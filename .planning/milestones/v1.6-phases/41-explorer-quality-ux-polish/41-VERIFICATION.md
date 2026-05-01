---
status: passed
phase: 41-explorer-quality-ux-polish
verified_at: 2026-04-29T18:15:00Z
score: 6/6 must-haves verified
test_baseline: "1134 passing / 1 expected fail (pair #13 from Phase 40 deuteranopia gate) / 22 todo / 3 skipped — 1157 total"
bundle_size_gz_initial_kb: 610.80
bundle_size_baseline_kb: 606.76
bundle_size_delta_kb: 4.04
bundle_size_budget_kb: 5.00
bundle_size_within_budget: true
deviations_from_plan:
  - "EXPL-01 default flipped from OFF to ON (hide zero-counts) per user UAT feedback 2026-04-29"
  - "EXPL-01 scope extended to include matching Switch on ResourceTypeRail left sidebar (shared localStorage state with the right-hand Landing Switch)"
---

# Phase 41 — VERIFICATION

## Goal Recap

Ship four bundled UX-polish improvements (EXPL-01, QUAL-01, QUAL-02, QUAL-03) across Explorer landing and Quality dashboard surfaces, sharing a single test-suite + bundle-size gate.

## Per-REQ verdict

| REQ-ID | Plan | Status | Evidence |
|--------|------|--------|----------|
| EXPL-01 | 41-01 + UAT amendment | PASS | UAT Test 1 manual verify; ResourceTypeLanding.tsx + ResourceTypeRail.tsx both render Mantine Switch with shared localStorage key `explorer.hideEmptyResourceTypes.v1` (default ON post-amendment); 6/6 colocated tests pass |
| QUAL-01 | 41-02 | PASS | UAT Test 2 (Completeness) + Test 3 (Coding Coverage) manual verify; em-dash sinks to bottom under both ASC and DESC; 5 colocated tests across CompletenessPanel.compareRows + CodingCoveragePanel.compareRows |
| QUAL-02 | 41-03 | PASS | UAT Test 4 manual verify; 3-stop heat gradient (green ≥100% / yellow at threshold / red below) on Complete% + Coverage% + Validation% + References% columns; numeric value preserved as primary semantic carrier; 6 colocated tests |
| QUAL-03 | 41-03 | PASS | UAT Test 5 manual verify; Download CSV button produces UTF-8 BOM CSV with sanitized filename `quality-matrix-{server-host}-{YYYY-MM-DD}.csv`; sparse cells empty (NOT 0%); 12 colocated tests |

## Phase-level gates (Plan 41-03 deferred Task 5)

### Test baseline gate

```
npm test -- --run
→ Test Files  1 failed | 120 passed | 3 skipped (124)
→ Tests  1 failed | 1134 passed | 22 todo (1157)
```

Single failure is the **expected** Phase-40 deuteranopia gate `pair #13 ('kardiologie ↔ mikrobiologie')`. Plan 41-03 baseline expectation was "≥ 1105 passing, 1 fail (pair #13)". Actual 1134 > 1105 ✓. No regression introduced by Phase-41 surface changes nor by the UAT-driven inline fix.

### Bundle-size gate

Computed initial-load gz by enumerating every asset referenced from `dist/index.html` (entry script + module-preloads + CSS) and summing `gzip -c | wc -c`:

| Metric | Value |
|--------|-------|
| Initial-load gz total | 610.80 KB |
| v1.5 close baseline | 606.76 KB |
| Delta | +4.04 KB |
| Budget | ≤ 5 KB |
| Within budget | ✅ |

## UAT-Driven Inline Fix (2026-04-29)

User feedback during Test 1 surfaced a feature gap:
- The legacy ResourceTypeRail (left-hand 240-px sidebar) had no equivalent of the right-hand "Hide empty" Switch.
- The planned default OFF (show empty) felt wrong against Synthea data — 5 zero-count types cluttered the view by default.

Fix applied inline (no separate gap-closure plan, no executor agent):
1. `src/components/explorer/ResourceTypeRail.tsx` — added Mantine `<Switch>` mirroring the Landing-page idiom, shared localStorage key, `Tooltip` on disabled state, count summarization in label.
2. `src/components/explorer/ResourceTypeLanding.tsx` — flipped `useLocalStorage` `defaultValue` from `false` to `true`.
3. `src/components/explorer/__tests__/ResourceTypeLanding.test.tsx` — updated 4 of 6 tests to match the new default-ON behavior; suite continues to pass 6/6.

Decision rationale recorded in 41-UAT.md Test 1 `note:` field. The PLAN.md and original SUMMARY.md files describing default-OFF behavior have been preserved unmodified — the deviation is documented in the verification trail rather than retro-edited into the plan body.

## Files Modified Beyond Plan

- `src/components/explorer/ResourceTypeRail.tsx` (+30 / −5)
- `src/components/explorer/ResourceTypeLanding.tsx` (1-line default flip)
- `src/components/explorer/__tests__/ResourceTypeLanding.test.tsx` (4-test rewrite for flipped default)

## Sign-Off

All 5 UAT tests pass. All 4 REQ-IDs (EXPL-01, QUAL-01, QUAL-02, QUAL-03) shipped. Test-baseline + bundle-size gates both green. Deviations from plan documented and confined to a single user-driven UX flip + scope extension; no functional regression.
