---
phase: 45-mantine-9-upgrade-stack-01
status: deferred
deferred_to: v1.7
deferred_reason: pre-flight gate failed (Medplum 5.1.9 peers Mantine ^8.0.0 only)
plans_executed: 0/0
date: 2026-04-30
---

# Phase 45: Mantine 9 Upgrade (STACK-01) — SUMMARY

## Outcome: WAIVE-AND-DEFER

Per ROADMAP §Phase 45 SC #1 verbatim:

> "If gate fails → 45-SUMMARY.md records `WAIVE-AND-DEFER` decision with the actual peer range pinned, and Phase 45 closes as `deferred` with no source diff (defer to v1.7)."

This phase closes as `deferred`. **No source files modified. No plans authored. No `npm install` executed.**

## Pre-Flight Gate Result

| Check | Expected | Actual | Verdict |
|-------|----------|--------|---------|
| `@medplum/react` version | latest 5.x | `5.1.9` | OK |
| `@mantine/core` peer range | includes `^9.x` | `^8.0.0` | **FAIL** |
| `@mantine/hooks` peer range | includes `^9.x` | `^8.0.0` | **FAIL** |
| `@mantine/notifications` peer range | includes `^9.x` | `^8.0.0` | **FAIL** |
| `@mantine/spotlight` peer range | includes `^9.x` | `^8.0.0` | **FAIL** |
| `react` peer range | includes `^19.x` | `^18.0.0 || ^19.0.0` | OK |
| `react-dom` peer range | includes `^19.x` | `^18.0.0 || ^19.0.0` | OK |

Probe command (reproducible):
```
npm view @medplum/react peerDependencies
```

## Decisions Recorded

- **D-01 [WAIVE-AND-DEFER]:** Phase 45 closes deferred. No package bumps. No codemod. No visual regression UAT. No bundle-size delta measurement. (All work conditional per ROADMAP SC #2-4 "If gate passes" — gate did not pass.)
- **D-02 [Re-evaluation trigger]:** Re-run pre-flight gate at v1.7 milestone start, or when `@medplum/react` releases a Mantine `^9.x` peer-range bump (whichever comes first).

## What Did NOT Change

- `package.json` — UNCHANGED (still `@mantine/core: ^8.3.18`, `react: ^18.3.1`)
- `package-lock.json` — UNCHANGED
- `src/**/*` — UNCHANGED (no files modified)
- Test count: 1240 passing (Phase 44 baseline preserved)
- Build: clean

## Roadmap Success Criteria — Conditional Closure

| SC | Condition | Status |
|----|-----------|--------|
| 1 | Gate documented in CONTEXT.md (gate ran) | ✓ Documented and ran (FAIL) |
| 2 | "If gate passes" — package bumps | N/A (gate failed) |
| 3 | "If gate passes" — tests + build clean | N/A (gate failed) |
| 4 | "If gate passes" — bundle delta within ±10% | N/A (gate failed) |

SC #1 satisfied (gate documented + ran + recorded). SC #2-4 are conditional on gate passing — not applicable for this run.

## Re-Activation Plan

When `@medplum/react` releases a version with Mantine `^9.x` in its peer-range:

1. Run `npm view @medplum/react peerDependencies` and confirm the new range
2. Re-run `/gsd-discuss-phase 45 --auto` (this CONTEXT.md will be updated, gate will re-run)
3. If gate passes → proceed to `/gsd-plan-phase 45 --auto` → `/gsd-execute-phase 45 --auto` (codemod + visual regression UAT path)
4. Bundle-size delta measurement against v1.5 baseline (606.76 KB gz initial-load) per SC #4

## Files

- `/Users/kohlbach/Claude/Exploder/.planning/phases/45-mantine-9-upgrade-stack-01/45-CONTEXT.md` (gate result + decisions)
- `/Users/kohlbach/Claude/Exploder/.planning/phases/45-mantine-9-upgrade-stack-01/45-SUMMARY.md` (this file)

## Notes for Future Self

- The `@mantine/core` peer-range is the bottleneck — if Medplum bumps it to `^8.0.0 || ^9.0.0` (transition range) before fully moving to `^9.0.0`, the gate passes and the upgrade can proceed.
- React 19 is already allowed standalone, but STACK-01 milestone scope ties the React bump to the Mantine bump — they're treated as a single upgrade.
- This is a SAFE outcome. The defer protects v1.6 ship integrity.
