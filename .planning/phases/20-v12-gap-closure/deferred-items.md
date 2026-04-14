# Phase 20 — Deferred Items

## Pre-existing test failures (discovered during Plan 20-01 execution, 2026-04-14)

While running `npm test` as Task 3 verification of Plan 20-01, 21 tests failed across 8 test files. Baseline verification (running the same tests against the pre-fix files) confirmed these failures **predate** Plan 20-01 and are **not caused by** the TS2352 cast-widening fix (which is compile-time only and cannot affect runtime behaviour).

Scope rule: per `deviation_rules` SCOPE BOUNDARY, only issues DIRECTLY caused by the current task are auto-fixed. These failures are out-of-scope for Plan 20-01.

### Failing test files (21 tests total)

| File | Failures | Apparent theme |
|------|----------|----------------|
| `src/__tests__/human-readable-view-terminology.test.tsx` | 2 | Terminology integration rendering |
| `src/__tests__/patient-detail.test.tsx` | 2 | PatientDetailPage loading / MII tabs |
| `src/__tests__/patient-list.test.tsx` | 5 | PatientListPage heading / search fields / placeholders |
| `src/__tests__/patient-view-toggle.test.tsx` | 5 | FhirResourcesView resource-type rows |
| `src/__tests__/quality-overview.test.tsx` | 1 | QualityOverviewPage counts table |
| `src/__tests__/resource-type-landing-counts.test.tsx` | 1 | Error-badge rendering when counts fail |
| `src/__tests__/sidebar-terminology-row.test.tsx` | 4 | Sidebar terminology health row (V-15 UI) |
| `src/__tests__/terminology-health.test.ts` | 1 | `probeTerminologyHealth` returns `ok` path |

### Representative failures

- `useSettingsContext must be used within SettingsProvider` — multiple tests render components that require a `SettingsContext` provider that isn't mounted in the test harness.
- `probeTerminologyHealth > returns 'ok'` — expected `'ok'` received `'unreachable'`. Mock wiring drift.

### Why these are out-of-scope for 20-01

- Plan 20-01 only widens TypeScript casts (double-cast via `unknown`). Casts are erased at compile time, so no runtime path is altered.
- Target-file tests pass:
  - `profileConformanceChecker.test.ts` — 9/9 pass
  - `temporalPlausibilityWalker.test.ts` — 15/15 pass
- `npx tsc -b --noEmit` and `npm run build` both exit 0 — the declared Phase 20 success condition is met.

### Recommended follow-up

Open a dedicated investigation plan (candidate for Phase 20 Plan 20-03 or a new gap-closure plan) to triage these tests. The `SettingsProvider` drift and terminology-health mock drift look like the two root causes covering most of the 21 failures.
