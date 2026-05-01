---
phase: 28
plan: 01
subsystem: micro-consistency
tags: [refactor, sweep-01, sweep-02, toRecord, dash-glyph]
requires: [fhir-helpers, drill-down-shell, resource-issue-table]
provides: [toRecord-generic-overload, en-dash-pagination]
affects:
  - src/utils/fhir-helpers.ts
  - src/hooks/useReferenceReport.ts
  - src/hooks/useConformanceRun.ts
  - src/quality/contentHasher.ts
  - src/quality/temporalPlausibilityWalker.ts
  - src/quality/temporalPlausibilityWalker.test.ts
  - src/quality/orphanDetector.ts
  - src/quality/profileConformanceChecker.ts
  - src/quality/codingCoverageWalker.ts
  - src/quality/completenessWalker.ts
  - src/__tests__/coding-coverage-walker.test.ts
  - src/__tests__/resource-issue-table.test.tsx
  - src/components/patients/PatientListPage.tsx
  - src/components/quality/PlausibilityDrillDown.tsx
  - src/components/quality/ResourceIssueTable.tsx
tech-stack:
  added: []
  patterns:
    - Generic-overload pattern on helper to accept non-Resource inputs without duplicating cast sites
key-files:
  created: []
  modified:
    - src/utils/fhir-helpers.ts
    - src/hooks/useReferenceReport.ts
    - src/hooks/useConformanceRun.ts
    - src/quality/contentHasher.ts
    - src/quality/temporalPlausibilityWalker.ts
    - src/quality/temporalPlausibilityWalker.test.ts
    - src/quality/orphanDetector.ts
    - src/quality/profileConformanceChecker.ts
    - src/quality/codingCoverageWalker.ts
    - src/quality/completenessWalker.ts
    - src/__tests__/coding-coverage-walker.test.ts
    - src/__tests__/resource-issue-table.test.tsx
    - src/components/patients/PatientListPage.tsx
    - src/components/quality/PlausibilityDrillDown.tsx
    - src/components/quality/ResourceIssueTable.tsx
decisions:
  - "Option A (generic overload): toRecord gained an `<T extends object>` overload because 6 cast sites consume ElementDefinition values, not Resource values — above the plan's ≥2-site threshold for Option A."
  - "Task 2 dash change broke 8 regex matchers in resource-issue-table.test.tsx (all testing the old ASCII `--` pagination string). Updated them to en-dash per the plan's explicit snapshot-update guidance."
metrics:
  duration: ~8 minutes
  completed: 2026-04-22
requirements:
  - SWEEP-01
  - SWEEP-02
---

# Phase 28 Plan 01: Micro-Consistency Sweep (SWEEP-01 + SWEEP-02) Summary

**One-liner:** Mechanical refactor migrating 22 `as unknown as Record<string, unknown>` cast sites to the existing `toRecord` helper (with a generic overload added for 6 non-Resource sites), plus ASCII `--` → unicode em-/en-dash glyph swap in 2 JSX text sites per typography convention.

## What Shipped

### SWEEP-01: toRecord helper sweep

- Extended `src/utils/fhir-helpers.ts` with a generic overload: `toRecord<T extends object>(value: T): Record<string, unknown>` alongside the existing `toRecord(resource: Resource)` signature. Runtime behavior unchanged — same single `as unknown as Record<string, unknown>` cast executed at one call site instead of 22.
- Migrated 22 cast sites across 11 files to `toRecord(x)`:
  - **Straight-swap (Resource input → 16 sites across 8 files):**
    - `src/hooks/useReferenceReport.ts:79` — `toRecord(r).id` in sample loop
    - `src/hooks/useConformanceRun.ts:175, 194` — batch loop resourceId + id
    - `src/quality/contentHasher.ts:54, 106` — canonicalize spread + member id
    - `src/quality/temporalPlausibilityWalker.ts:373, 439` — shape-discovery input + normalized resourceId
    - `src/quality/temporalPlausibilityWalker.test.ts:347` — test of shape discovery
    - `src/quality/orphanDetector.ts:109, 111` — field access + id
    - `src/quality/codingCoverageWalker.ts:206` — perResource resourceId
    - `src/quality/completenessWalker.ts:107` — perResource resourceId
    - `src/quality/profileConformanceChecker.ts:296` — normalizeConformanceIssues resourceId
    - `src/__tests__/coding-coverage-walker.test.ts:171` — test expectation
    - `src/components/patients/PatientListPage.tsx:33` — extractDate helper
  - **Generic-overload required (non-Resource input → 6 sites across 2 files):**
    - `src/quality/profileConformanceChecker.ts:139, 142, 143, 144, 147` — `el: ElementDefinition` field access (path, min, max, type, binding)
    - `src/hooks/useConformanceRun.ts:71` — `el: ElementDefinition` binding in collectBindingUrls

### SWEEP-02: ASCII double-dash → unicode glyph

- `src/components/quality/PlausibilityDrillDown.tsx:2` (header comment) — `--` → `—` (em-dash U+2014)
- `src/components/quality/PlausibilityDrillDown.tsx:38` (JSX title) — `--` → `—` (em-dash U+2014)
- `src/components/quality/ResourceIssueTable.tsx:2` (header comment) — `--` → `—` (em-dash, optional per plan but landed for consistency)
- `src/components/quality/ResourceIssueTable.tsx:160` (JSX pagination numeric range) — `{start}--{end}` → `{start}–{end}` (en-dash U+2013)
- **Preserved:** `src/components/quality/ResourceIssueTable.tsx:202` — `<Code>--</Code>` (intentional code-font "null value" visual indicator per plan's explicit instruction).

## Acceptance Checks

| Check | Result |
|-------|--------|
| `grep -rn 'as unknown as Record<string, unknown>' src/ --include='*.ts*' \| wc -l` | **2** (≤2 acceptable: helper comment + helper body) |
| Remaining occurrences only in `src/utils/fhir-helpers.ts`? | Yes (lines 5, 16) |
| `npx tsc -b --noEmit` | clean (exit 0) |
| `grep -n ' -- ' src/components/quality/PlausibilityDrillDown.tsx src/components/quality/ResourceIssueTable.tsx` | **0** matches |
| `grep -c '<Code>--</Code>' src/components/quality/ResourceIssueTable.tsx` | **1** (preserved intentional glyph) |
| `npx vitest --run` regressions vs post-Phase-27 baseline (22 failed / 814 passed) | **22 failed / 814 passed** — zero regressions |

## Deviations from Plan

### Auto-fixed / Deliberate

**1. [Rule 2 - Test fallout]** Updated 8 regex matchers in `src/__tests__/resource-issue-table.test.tsx` from `Showing N--M` to `Showing N–M` (en-dash).
- **Found during:** Task 2 verification (full `npx vitest --run` showed 4 new failures in this file after the JSX glyph swap).
- **Issue:** Tests assert on exact substring of the rendered pagination label; flipping `--` to `–` naturally broke them.
- **Fix:** Replaced ASCII `--` with en-dash `–` in all 8 assertions + one doc comment.
- **Plan guidance:** Task 2 action step #4 explicitly noted this outcome: *"if they contain the old ASCII `--` literally, they will fail and need the snapshot updated"*. So this is a plan-mandated update, not an out-of-scope change.
- **Files modified:** `src/__tests__/resource-issue-table.test.tsx`
- **Commit:** `01c6514` (`test(28-01): update pagination dash assertions for SWEEP-02`)

No other deviations. toRecord generic-overload decision (D-02 Option A vs Option B) was made within the plan's explicit guidance (≥2 non-Resource sites → Option A). 6 sites needed it, so Option A landed.

## Commits

| Commit | Type | Scope |
|--------|------|-------|
| `05054fc` | refactor | SWEEP-01 — 22 cast → toRecord migrations across 11 files + helper overload in fhir-helpers.ts |
| `e67968f` | style | SWEEP-02 — ASCII `--` → em-/en-dash in PlausibilityDrillDown.tsx + ResourceIssueTable.tsx (2 files) |
| `01c6514` | test | Pagination dash assertions updated for SWEEP-02 (1 test file) |

## Threat Surface Scan

No new trust boundaries crossed. Both SWEEP-01 and SWEEP-02 are compile-time or render-only changes; runtime execution paths and data flow are unchanged. The generic overload widens compile-time type acceptance only — runtime behavior is byte-identical.

## Self-Check: PASSED

### Files created/modified verification

All 15 files referenced in this summary confirmed present on disk:

- `src/utils/fhir-helpers.ts` — FOUND (has generic overload per `grep 'T extends object'`)
- `src/hooks/useReferenceReport.ts` — FOUND
- `src/hooks/useConformanceRun.ts` — FOUND
- `src/quality/contentHasher.ts` — FOUND
- `src/quality/temporalPlausibilityWalker.ts` — FOUND
- `src/quality/temporalPlausibilityWalker.test.ts` — FOUND
- `src/quality/orphanDetector.ts` — FOUND
- `src/quality/profileConformanceChecker.ts` — FOUND
- `src/quality/codingCoverageWalker.ts` — FOUND
- `src/quality/completenessWalker.ts` — FOUND
- `src/__tests__/coding-coverage-walker.test.ts` — FOUND
- `src/__tests__/resource-issue-table.test.tsx` — FOUND
- `src/components/patients/PatientListPage.tsx` — FOUND
- `src/components/quality/PlausibilityDrillDown.tsx` — FOUND
- `src/components/quality/ResourceIssueTable.tsx` — FOUND

### Commit verification

- `05054fc` — FOUND in `git log`
- `e67968f` — FOUND in `git log`
- `01c6514` — FOUND in `git log`

### Acceptance grep verification

- Cast count: 2 (≤2 — passes)
- ASCII `--` in target files: 0 (passes)
- Preserved `<Code>--</Code>`: 1 (passes)
- tsc: clean
- Full test suite: 22 failed / 814 passed (exact baseline match — 0 new regressions)
