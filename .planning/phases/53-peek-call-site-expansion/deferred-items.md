# Phase 53 — Deferred Items (Out-of-Scope Discoveries)

> Issues found during execution that are NOT caused by this phase's work.
> Logged here per Scope Boundary rule; not addressed in this phase.

## Pre-existing TypeScript errors (not caused by Phase 53)

Discovered during `npx tsc -b --noEmit` run for plan 53-01 verification on
2026-05-04. Both errors exist on the v1.7-close baseline (commit `26efb93`)
BEFORE Phase 53 changes were applied (verified via `git stash` + tsc rerun).

1. **`src/__tests__/capability.test.ts(59,9)`** — `error TS2322: Type
   '"UnknownType"' is not assignable to type ...153 more...`
   Test fixture intentionally uses an invalid resourceType but the type
   widening accepted it previously. Pre-existing.

2. **`src/components/patients/PatientTimeline.tsx(26,23)`** — `error TS6196:
   'Resource' is declared but never used.`
   Unused import. Trivial cleanup but unrelated to Phase 53 scope.

These two errors do NOT block Phase 53 because:
- They were present on the baseline commit `26efb93` BEFORE Phase 53 started.
- `npm run build` and `npm test` both pass; `tsc -b --noEmit` only fails on
  these two pre-existing errors.
- Per CLAUDE.md and execute-plan.md Scope Boundary rule, pre-existing failures
  in unrelated files are NOT in scope of the current task.

Recommend: Open a follow-up cleanup task or roll into the next code-review
sweep (consistent with v1.7's "1 pre-existing Phase-40 deuteranopia failure"
pattern).
