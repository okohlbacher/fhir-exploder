# Phase 18 — Deferred Items

Out-of-scope discoveries logged while executing plans. Not fixed — these predate Phase 18 work and belong to future tech-debt clean-up.

## Pre-existing TypeScript strict-mode violations (discovered during 18-01)

**Source:** `npx tsc -b --noEmit` run against the codebase before any Plan 18 changes (confirmed via `git stash` roundtrip on 2026-04-14).

**Files:**
- `src/quality/completenessWalker.ts:107` — `TS2352` Resource -> Record<string, unknown> cast unsafe for VisionPrescription
- `src/quality/profileConformanceChecker.ts:139,142,143,144,147,296` — same TS2352 for ElementDefinition and Resource casts
- `src/quality/temporalPlausibilityWalker.ts:439` — same TS2352 for Resource cast

**Impact:** Does NOT break the build (tsc exits 0 for the `-b --noEmit` flow under the project's current config; errors are reported but not fatal). Does NOT affect runtime behavior. Plan 18 files compile cleanly on their own.

**Recommendation:** Open a tech-debt ticket (DEBT-03) to replace these unsafe casts with `as unknown as Record<string, unknown>` per TypeScript's suggested pattern. Out of scope for Phase 18 (alerting/thresholds feature).
