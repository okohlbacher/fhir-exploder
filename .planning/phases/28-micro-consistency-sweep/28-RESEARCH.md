---
phase: 28
gathered: 2026-04-23
mode: skip-full-research (0.5-day mechanical phase; scout intel inlined)
confidence: HIGH
---

# Phase 28 Research — Scout Intel

## Executive Summary

This phase is a 0.5-day mechanical sweep. Full researcher agent skipped; scout data collected inline. Key findings:

1. **SWEEP-01 count confirmed:** 23 `as unknown as Record<string, unknown>` occurrences across 12 files (ROADMAP said "13+"; actual is 23).
2. **SWEEP-02 scope is NARROW, not wide:** 635 em-dashes + 2 en-dashes live in src/ but nearly all are idiomatic in comments. **The actual inconsistency** is ASCII double-dash `--` used as separator/range glyph in a few specific sites — convert to proper unicode `—` (separator) or `–` (range). Not a global 635-site sweep.
3. **SWEEP-03 lines shifted post-Phase 25:** `eslint-disable-next-line react-hooks/exhaustive-deps` now at lines 33, 31, 30, 31 (not 52/50/49/49 per stale ROADMAP).
4. **SWEEP-04 ref-type site MOVED to Shell:** `useRef<HTMLAnchorElement | null>` is at `DrillDownShell.tsx:73` (not CompletenessDrillDown:44 or CodingDrillDown:101 — those were refactored in Phase 25). Single change, not two.
5. **SWEEP-04 PatientListPage:** `eslint-disable-line react-hooks/exhaustive-deps` is at line **291** on a `useMemo`, NOT line 70 on a `useState`. Fix is still the same shape: lazy initializer pattern or fix the deps.

## SWEEP-01: Cast Sites (23 total, 12 files)

```
src/__tests__/coding-coverage-walker.test.ts
src/components/patients/PatientListPage.tsx
src/hooks/useConformanceRun.ts
src/hooks/useReferenceReport.ts
src/quality/codingCoverageWalker.ts
src/quality/completenessWalker.ts
src/quality/contentHasher.ts
src/quality/orphanDetector.ts
src/quality/profileConformanceChecker.ts
src/quality/temporalPlausibilityWalker.test.ts
src/quality/temporalPlausibilityWalker.ts
src/utils/fhir-helpers.ts
```

Planner: grep exact lines before editing. `toRecord(resource: Resource)` is defined at `src/utils/fhir-helpers.ts:9`. Note: `src/utils/fhir-helpers.ts` ITSELF contains one of the cast sites — may be the helper's internal implementation; do not self-refactor without inspection.

## SWEEP-02: Actual ASCII-Double-Dash Sites (narrow scope)

The real acceptance-shaped inconsistency: `--` (ASCII) used where `—` (em-dash) or `–` (en-dash) is idiomatic.

Confirmed via grep at these specific sites:
- `src/components/quality/PlausibilityDrillDown.tsx:2` — comment `PlausibilityDrillDown -- /quality/plausibility/:type sub-page.`
- `src/components/quality/PlausibilityDrillDown.tsx:38` — JSX `${type} -- Plausibility drill-down` (should be em-dash `—`)
- `src/components/quality/ResourceIssueTable.tsx:158` — JSX `Showing {start}--{end} of {filtered.length} issues` (should be en-dash `–` — numeric range)

**Scope decision:** SWEEP-02 targets ASCII `--` sites that render to the user (JSX text content + displayed strings), NOT `--` in code/comments. Planner must grep `--` patterns across `.tsx` files AND review each for context (JSX text vs comment vs CLI arg).

Do NOT attempt a mass migration of the 635 unicode em-dashes — they are idiomatic and consistent.

## SWEEP-03: Drill-Down eslint-disable Sites (confirmed)

| File | Line |
|------|------|
| `src/components/quality/PlausibilityDrillDown.tsx` | 33 |
| `src/components/quality/LabRangesDrillDown.tsx` | 31 |
| `src/components/quality/DuplicatesDrillDown.tsx` | 30 |
| `src/components/quality/ReferencesDrillDown.tsx` | 31 |

All 4 are confirmed present. After removal, run `npx eslint <file>` to verify no new errors.

## SWEEP-04: Re-Scoped Micro-Cleanup

| Target | Old (ROADMAP) | Actual (post-Phase 25) | Action |
|--------|---------------|-----------------------|--------|
| Ref type | CompletenessDrillDown:44 + CodingDrillDown:101 (2 sites) | `DrillDownShell.tsx:73` (1 site, owns the ref for all drill-downs) | Change `HTMLAnchorElement` → `HTMLButtonElement` in 1 file |
| QualityLayout essay | Inline `useEffect` in QualityLayout.tsx | Still there (line 24-29 approx — `migrateLegacyResourceTypeKey()` call wraps but essay comment remains) | Move essay body INTO the helper at `cohorts.ts`, keep QualityLayout's call site clean |
| PatientListPage init | Line 70 `useState` with eslint-disable | Line 291 `useMemo` with `eslint-disable-line react-hooks/exhaustive-deps` | Fix the deps OR convert to a lazy initializer pattern; remove the disable |

## Plan-Batching Recommendation

2 plans:
- **Plan 28-01** (Wave 1): SWEEP-01 + SWEEP-02 bundle — both are grep-driven mechanical sweeps. 23 cast sites + ~3 ASCII-dash sites in JSX text.
- **Plan 28-02** (Wave 1, parallel — disjoint files): SWEEP-03 + SWEEP-04 bundle — drill-down disables + Shell ref type + QualityLayout essay + PatientListPage deps.

File sets disjoint:
- 28-01: 12 cast-site files + 2 JSX-dash files (PlausibilityDrillDown.tsx OVERLAPS with 28-02 if both touch it — move PlausibilityDrillDown dashes to 28-02 to keep disjoint, OR run sequentially)
- 28-02: 4 drill-downs (disable removal) + DrillDownShell.tsx + QualityLayout.tsx + cohorts.ts + PatientListPage.tsx

**Overlap warning:** PlausibilityDrillDown.tsx is in BOTH 28-01 (SWEEP-02 ASCII dashes) AND 28-02 (SWEEP-03 eslint-disable). Resolution: either run sequentially (safer), or move the SWEEP-02 dash fix for PlausibilityDrillDown into Plan 28-02, keeping 28-01 purely SWEEP-01 + ResourceIssueTable dash.

## Pitfalls (low-risk phase)

| Risk | Likelihood | Mitigation |
|------|-----------|-----------|
| SWEEP-01 `toRecord` signature mismatch at non-Resource sites | Medium | Per D-02: either add generic overload or comment-and-skip |
| SWEEP-03 removal reveals genuine effect dep gap | Low | Per D-09: investigate root cause, do NOT re-add disable |
| SWEEP-02 over-scope (mass unicode dash edit) | Medium | Scope strictly to ASCII `--` in JSX text; leave unicode dashes alone |
| ROADMAP line numbers drift | HIGH (already confirmed) | Planner MUST grep exact lines before editing |

## Validation Architecture (Nyquist Dimension 8)

One checkable truth per SWEEP:

| SWEEP | Validation Truth | Check Command |
|-------|-----------------|---------------|
| SWEEP-01 | Zero remaining casts | `grep -rn "as unknown as Record<string, unknown>" src/ --include="*.ts*" \| wc -l` returns 0 |
| SWEEP-02 | No ASCII `--` in JSX text at confirmed sites | `grep -n '{.*--.*}' src/components/quality/PlausibilityDrillDown.tsx src/components/quality/ResourceIssueTable.tsx` returns 0 |
| SWEEP-03 | Zero drill-down auto-start disables | `grep -c "eslint-disable-next-line react-hooks/exhaustive-deps" src/components/quality/{Plausibility,LabRanges,Duplicates,References}DrillDown.tsx` sums to 0 |
| SWEEP-04 | Ref type corrected + essay moved + PatientListPage init fixed | `grep -c "HTMLAnchorElement" src/components/quality/DrillDownShell.tsx` returns 0; `grep -c "eslint-disable-line react-hooks/exhaustive-deps" src/components/patients/PatientListPage.tsx` returns 0; `grep -c "migrateLegacyResourceTypeKey" src/quality/cohorts.ts` shows the essay body there (not the thin wrapper) |

## Open Questions

None — all scope decisions made via scout data. Planner proceeds directly.

