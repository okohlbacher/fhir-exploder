---
phase: 19-quality-trends-pdf-reports
plan: 01
subsystem: quality
tags: [quality, trends, pdf, storage, vitest, mantine-charts, jspdf, tdd]

requires:
  - phase: 18-quality-alerting-thresholds
    provides: MetricKey union, DEFAULT_THRESHOLDS, resolveThreshold/isBreached semantics
provides:
  - "QualitySnapshot interface (locked payload per D-02)"
  - "TRENDS_STORAGE_KEY='quality.trends.v1' + TRENDS_SOFT_LIMIT=500 persistence constants"
  - "captureSnapshot(params) pure factory — reads metrics + thresholds at call time"
  - "filterSnapshotsByServer() exact-match filter"
  - "serverUrlSlug() filesystem-safe URL sanitizer (T-19-02 mitigation)"
  - "pdfFilename() canonical download-name builder"
  - "computeBreachedFlag() strict-less-than breach check, null-short-circuits"
  - "@mantine/charts 8.3.18 (peer-valid against Mantine 8 + React 18)"
  - "jspdf ^4.2.1 dependency"
  - "44 passing vitest specs across 5 pure-function test files"
affects: [19-02-trends-ui, 19-03-pdf-export]

tech-stack:
  added: [jspdf ^4.2.1]
  patterns:
    - "Pure-function + types module ('trendsHistory') sibling to a React hook layer (Plan 02 will add useTrendsHistory on top) — mirrors Phase 18 thresholds.ts / useThresholds.ts split"
    - "Defensive array copy on input (cohort) before storing — caller array must not alias snapshot"
    - "UTC-only timestamp derivation from Date.toISOString() — filename is timezone-stable"

key-files:
  created:
    - "src/quality/trendsHistory.ts — types + 5 pure helpers"
    - "src/quality/__tests__/trendsHistory.test.ts — JSON round-trip coverage"
    - "src/quality/__tests__/capture-snapshot.test.ts — factory coverage"
    - "src/quality/__tests__/pdf-filename.test.ts — slug + filename coverage"
    - "src/quality/__tests__/trends-breach.test.ts — breach flag coverage"
    - "src/quality/__tests__/trends-filter.test.ts — server filter coverage"
    - ".planning/phases/19-quality-trends-pdf-reports/deferred-items.md — logs pre-existing TS2352 errors out of scope"
  modified:
    - "package.json — @mantine/charts 9.0.1→8.3.18, +jspdf ^4.2.1"
    - "package-lock.json — dependency tree realignment"

key-decisions:
  - "Dots in hostnames preserved in serverUrlSlug (behavior spec said 'blaze-mii-example-org' but RESEARCH.md + plan action code specified regex /[:/\\\\?#&]+/ which does NOT match dots — chose code/RESEARCH over behavior example; dots are filesystem-safe on all platforms)"
  - "Co-located tests under src/quality/__tests__/ (plan preferred this over src/__tests__/ if the directory did not yet exist — it did not, so created it; keeps pure-function tests adjacent to their module)"
  - "Pre-existing TS2352 errors in profileConformanceChecker.ts + temporalPlausibilityWalker.ts NOT fixed — out of scope per deviation-rules SCOPE BOUNDARY; logged to deferred-items.md with proof of pre-existence at HEAD fcc610f"

patterns-established:
  - "Pattern: trendsHistory as a dependency-free pure layer — imports only `type { MetricKey }` from thresholds. No React, no Mantine, no localStorage access. This keeps Plan 02/03 testable without DOM."
  - "Pattern: factory takes a `getActiveThreshold` callback rather than the raw stored Thresholds object — decouples capture-time threshold resolution from the hook's hydration gate"

requirements-completed: [QUAL-05, QUAL-06]

duration: 6min
completed: 2026-04-14
---

# Phase 19 Plan 01: Trends History Foundation Summary

**Pure-function types + 5 helpers (snapshot factory, server filter, URL slug, PDF filename, breach check) for Phase 19 trends + PDF work, plus @mantine/charts realignment to 8.3.18 and jspdf ^4.2.1 — 44 green vitest specs, zero new tsc errors.**

## Performance

- **Duration:** ~6 min
- **Started:** 2026-04-14T19:43:03Z
- **Completed:** 2026-04-14T19:48:53Z
- **Tasks:** 2 (1 dep alignment + 1 TDD trio: RED → GREEN, no REFACTOR needed)
- **Files created:** 7 (1 module + 5 test files + 1 deferred-items log)
- **Files modified:** 2 (package.json + package-lock.json)

## Accomplishments

- **Dep alignment:** `@mantine/charts` downgraded 9.0.1 → 8.3.18 to satisfy `@mantine/core` / `@mantine/hooks` peer constraints against Mantine 8 core + React 18. `npm ls @mantine/charts @mantine/core @mantine/hooks jspdf` now shows zero `invalid` warnings.
- **jspdf installed:** `jspdf@^4.2.1` added as a dependency; ESM import (`import { jsPDF } from 'jspdf'`) verified to resolve to a function.
- **Types + helpers shipped:** `src/quality/trendsHistory.ts` exports exactly 10 symbols (2 const + 3 interface + 5 function) per the plan's acceptance grep. Locked `QualitySnapshot` payload shape per D-02. TRENDS_STORAGE_KEY = 'quality.trends.v1' per D-03. TRENDS_SOFT_LIMIT = 500 per D-04.
- **Full TDD coverage:** 5 vitest files under `src/quality/__tests__/` exercise every behavior in the plan's `<behavior>` section: 44 specs, 5 files, all green. Zero React, zero DOM — pure-function unit tests only.
- **Threat model mitigation shipped:** `serverUrlSlug` strips the full `[:/\\?#&]` character set + caps at 60 chars + returns `'unknown-server'` on empty input. Filesystem-injection tests (T-19-02) are green across adversarial URL inputs.
- **Downstream plan unblocked:** Plan 02 (Trends UI) and Plan 03 (PDF export) can now `import { QualitySnapshot, TRENDS_STORAGE_KEY, TRENDS_SOFT_LIMIT, captureSnapshot, filterSnapshotsByServer, serverUrlSlug, pdfFilename, computeBreachedFlag } from '../quality/trendsHistory'` with no TypeScript or runtime errors.

## Task Commits

Each task was committed atomically. Plan executed sequentially:

1. **Task 1: Align @mantine/charts to 8.3.18 + add jspdf** — `43ae832` (chore)
2. **Task 2 (RED): Add failing tests for trendsHistory** — `e6095f2` (test)
3. **Task 2 (GREEN): Implement trendsHistory pure-function layer** — `6539c52` (feat)

_No REFACTOR commit — GREEN implementation matched the plan-specified surface exactly; no cleanup needed._

## Files Created/Modified

### Created

- `src/quality/trendsHistory.ts` — types + 5 pure helpers (TRENDS_STORAGE_KEY, TRENDS_SOFT_LIMIT, QualitySnapshot, MetricsReadSource, CaptureSnapshotParams, captureSnapshot, filterSnapshotsByServer, serverUrlSlug, pdfFilename, computeBreachedFlag)
- `src/quality/__tests__/trendsHistory.test.ts` — 6 specs, JSON round-trip of QualitySnapshot[] including empty cohorts, null scores, null thresholds
- `src/quality/__tests__/capture-snapshot.test.ts` — 10 specs, factory behavior (7-key ordering, undefined→null, threshold passthrough, UUID id, ISO capturedAt, defensive copy)
- `src/quality/__tests__/pdf-filename.test.ts` — 13 specs, serverUrlSlug adversarial inputs + pdfFilename canonical pattern
- `src/quality/__tests__/trends-breach.test.ts` — 9 specs, strict-less-than semantics across all null/number combinations + edge cases (0, 99.99)
- `src/quality/__tests__/trends-filter.test.ts` — 6 specs, exact-match filter, preserves order, non-mutating
- `.planning/phases/19-quality-trends-pdf-reports/deferred-items.md` — logs pre-existing TS2352 errors not caused by this plan

### Modified

- `package.json` — `@mantine/charts: ^9.0.1 → ^8.3.18`, added `jspdf: ^4.2.1`
- `package-lock.json` — dependency tree rewrite (expected)

## Decisions Made

1. **Dots preserved in serverUrlSlug.** The plan's `<behavior>` spec stated `'https://blaze.mii.example.org/fhir/' → 'blaze-mii-example-org'` (dashes replacing dots), but the plan's `<action>` code + the canonical RESEARCH.md snippet define the regex as `/[:/\\?#&]+/g` which does NOT match dots. The spec is internally inconsistent. I chose to match the authoritative code and RESEARCH.md — dots survive as `'blaze.mii.example.org'`. Rationale: dots are filesystem-safe on all platforms (macOS HFS+/APFS, Linux ext4, Windows NTFS), the regex is explicit, and the `<action>` section says "do not paraphrase" the provided code. The test `pdf-filename.test.ts` asserts the code-consistent value.

2. **Tests co-located under `src/quality/__tests__/`.** The plan's `<action>` said to prefer this location if the directory didn't exist. It didn't, so I created it. Keeps the pure-function unit tests adjacent to their module — matches the existing `src/quality/labRangeChecker.test.ts` + `src/quality/profileConformanceChecker.test.ts` co-location pattern already in the repo.

3. **Pre-existing TS2352 errors left as-is.** Seven errors in `profileConformanceChecker.ts` (6) and `temporalPlausibilityWalker.ts` (1) pre-exist at HEAD `fcc610f` and are unrelated to my dep or code changes. Per deviation-rules SCOPE BOUNDARY: logged to `deferred-items.md`, not fixed in this plan. The plan's acceptance-criterion "build exits 0" is only achievable once those are addressed in a dedicated tech-debt plan. The spirit of the gate (no errors in files that reference `@mantine/charts` or my new code) IS met: zero new errors.

## Deviations from Plan

### Auto-fixed Issues

None — no Rule 1/2/3 fixes were needed. The plan's code spec was complete and accurate, and no bugs / missing functionality / blockers surfaced during execution.

### Specification inconsistencies resolved

**1. [Rule 1 - Bug, upstream in plan text] serverUrlSlug behavior example contradicted its regex**
- **Found during:** Task 2 (writing pdf-filename.test.ts)
- **Issue:** The plan's `<behavior>` section gave `'https://blaze.mii.example.org/fhir/'` → `'blaze-mii-example-org'` as an expected outcome, but the `<action>` code's regex `/[:/\\?#&]+/g` does not match `.`. Running the action code against that input yields `'blaze.mii.example.org'`. The behavior example was wrong; the code was right.
- **Fix:** Implemented the `<action>` code verbatim (as the plan instructed). Wrote the test to assert `'blaze.mii.example.org'` (the actual output of the specified code). Documented in "Decisions Made" above so Plan 02/03 planners see the final slug behavior.
- **Files modified:** `src/quality/__tests__/pdf-filename.test.ts`
- **Verification:** Test passes; slug contains no chars from `[:/\\?#&]`; filesystem-safe on all platforms.
- **Committed in:** `e6095f2` (RED) + `6539c52` (GREEN)

---

**Total deviations:** 1 spec-inconsistency resolution. No Rule 1/2/3 auto-fixes needed on the actual code.
**Impact on plan:** None — the chosen behavior matches the `<action>` code + RESEARCH.md exactly and preserves the T-19-02 mitigation's goal (filesystem-safe filenames). Plan 02 and Plan 03 planners are notified via the decision record.

## Issues Encountered

**Pre-existing TypeScript errors surfaced by the build gate.**
- 7 errors (6 in `profileConformanceChecker.ts`, 1 in `temporalPlausibilityWalker.ts`), all TS2352 on `as Record<string, unknown>` casts of `ElementDefinition` / `Resource`.
- Proven pre-existing: `git stash && npm run build` at HEAD `fcc610f` (with `@mantine/charts@9.0.1` and no `jspdf`) reproduces the same 7 errors.
- Resolution: logged to `.planning/phases/19-quality-trends-pdf-reports/deferred-items.md` with fix suggestion (`as unknown as Record<string, unknown>` double-cast). Deferred to a dedicated tech-debt plan — out of scope for Phase 19 per SCOPE BOUNDARY.
- Impact on Plan 19-01: none. Zero errors originate from my new code; the `@mantine/charts` and `jspdf` changes produced no cascade errors.

## Known Stubs

None. `trendsHistory.ts` is a pure-data layer — it has no UI outputs, no placeholder content, no hardcoded empty states. Every exported function has behavior fully exercised by the test suite.

## User Setup Required

None — no external service configuration required for this plan.

## Next Phase Readiness

- **Plan 02 (Trends UI):** Ready to proceed. Can import the full surface from `../quality/trendsHistory`. The 500-snapshot soft-limit constant is exported but the UI-side enforcement + QuotaExceededError toast are Plan 02 scope per D-04.
- **Plan 03 (PDF export):** Ready to proceed. `pdfFilename()` + `serverUrlSlug()` + `computeBreachedFlag()` all in place. `jsPDF` import verified resolvable at task runtime.
- **No blockers.**

## Self-Check: PASSED

Verification run at plan completion:

- **File presence:**
  - `src/quality/trendsHistory.ts` — FOUND
  - `src/quality/__tests__/trendsHistory.test.ts` — FOUND
  - `src/quality/__tests__/capture-snapshot.test.ts` — FOUND
  - `src/quality/__tests__/pdf-filename.test.ts` — FOUND
  - `src/quality/__tests__/trends-breach.test.ts` — FOUND
  - `src/quality/__tests__/trends-filter.test.ts` — FOUND
  - `.planning/phases/19-quality-trends-pdf-reports/deferred-items.md` — FOUND

- **Commit presence in `git log --oneline`:**
  - `43ae832` chore(19-01): align @mantine/charts — FOUND
  - `e6095f2` test(19-01): add failing tests — FOUND
  - `6539c52` feat(19-01): add trendsHistory pure-function layer — FOUND

- **Test suite:** `npm run test -- src/quality/__tests__/` → 5 files, 44 specs, all passing.
- **Dep state:** `npm ls @mantine/charts @mantine/core @mantine/hooks jspdf` → no `invalid` lines.
- **Grep checks:** All 6 plan acceptance grep patterns match.

---
*Phase: 19-quality-trends-pdf-reports*
*Plan: 01*
*Completed: 2026-04-14*
