---
phase: 50-theme-e-stack-01-carry-over-mantine-9-react-19-gate
status: deferred
deferred_to: v1.8
deferred_reason: peer-dep gate MIXED — Mantine 9 still pinned to ^8.0.0 by @medplum/react@5.1.10; React 19 independently unblocked; user decision (D-02) keeps React/Mantine coupled, so entire upgrade defers
plans_executed: 0/0
date: 2026-05-02
---

# Phase 50: Theme E — STACK-01 Carry-Over (Mantine 9 / React 19 Gate) — SUMMARY

## Outcome: WAIVE-AND-DEFER

Per ROADMAP §Phase 50 success criteria "If gate FAILS" branch and 50-CONTEXT.md D-03:

> Phase 50 closes as `deferred` (NOT `validated`). STACK-01 carries to v1.8 deferred-items list. No source diff. No npm install. No tests.

This phase closes as `deferred`. **No source files modified. No plans authored beyond the closure docs themselves. No `npm install` executed. No codemod run. No `--legacy-peer-deps` attempted.**

This mirrors the v1.6 Phase 45 WAIVE-AND-DEFER precedent exactly.

## Pre-Flight Gate Result: MIXED (Mantine 9 FAILS, React 19 PASSES)

Per 50-CONTEXT.md D-01, the live probe was executed at v1.7-Phase-50 start (2026-05-01) against `@medplum/react@5.1.10`:

Probe command (reproducible):

```
npm view @medplum/react peerDependencies
```

Verbatim output (frozen 2026-05-01, medplum/react@5.1.10):

```json
{
  "@mantine/core": "^8.0.0",
  "@mantine/hooks": "^8.0.0",
  "@mantine/notifications": "^8.0.0",
  "@mantine/spotlight": "^8.0.0",
  "@medplum/core": "5.1.10",
  "@medplum/react-hooks": "5.1.10",
  "react": "^18.0.0 || ^19.0.0",
  "react-dom": "^18.0.0 || ^19.0.0",
  "rfc6902": "^5.0.1",
  "signature_pad": "^5.0.10"
}
```

| Check | Expected | Actual | Verdict |
|-------|----------|--------|---------|
| `@medplum/react` version | latest 5.x | `5.1.10` | OK |
| `@mantine/core` peer range | includes `^9.x` | `^8.0.0` | **FAIL** |
| `@mantine/hooks` peer range | includes `^9.x` | `^8.0.0` | **FAIL** |
| `@mantine/notifications` peer range | includes `^9.x` | `^8.0.0` | **FAIL** |
| `@mantine/spotlight` peer range | includes `^9.x` | `^8.0.0` | **FAIL** |
| `react` peer range | includes `^19.x` | `^18.0.0 \|\| ^19.0.0` | **OK (newly open vs. v1.6)** |
| `react-dom` peer range | includes `^19.x` | `^18.0.0 \|\| ^19.0.0` | **OK (newly open vs. v1.6)** |

### NEW finding vs. v1.6 Phase 45 close

At v1.6-close (2026-04-30) the working assumption was that Mantine 9 and React 19 would move together in `@medplum/react`. **Medplum has decoupled them since.** As of 2026-05-01:

- **Mantine 9 gate: still CLOSED** (peer pin remains `^8.0.0` only).
- **React 19 gate: now OPEN** (peer pin is `^18.0.0 || ^19.0.0`).

Future v1.8 planners checking the gate must check **both** peer pins separately — a single combined check is no longer correct.

## Decisions Recorded

- **D-01 [gate result, frozen 2026-05-01]:** `npm view @medplum/react peerDependencies` for medplum/react@5.1.10 returned the JSON block above. Mantine 9 gate FAILS; React 19 gate PASSES; finding is MIXED.

- **D-02 [WAIVE-AND-DEFER — keep React/Mantine coupled]:** Defer the entire upgrade until the Mantine 9 gate also opens. Do NOT upgrade React 19 in isolation. Rationale (condensed from interactive discussion captured in 50-DISCUSSION-LOG.md):
  - Mantine 9 is the larger, more visually impactful change; doing React 19 alone yields breaking-change cost (deprecated `React.FC` defaults, ref forwarding changes, StrictMode tightening) without the matching Mantine bundle/cascade wins.
  - Medplum's `^8.0.0` Mantine pin means a Mantine 9 attempt today would require `--legacy-peer-deps` long-term — a footgun that masks future incompatibilities.
  - 145 source files import Mantine (~25% of codebase). Visual regression UAT across 9 surfaces (Sidebar, Dashboard, Patients, Quality, Explorer, Patient detail, Cohorts, IPS, Phase-49 Graph) is significant manual work to absorb on a moving target.
  - One coordinated upgrade in v1.8 (when Medplum's gate also opens for Mantine 9) is lower risk than a partial shuffle now.
  - Matches v1.6 Phase 45 WAIVE-AND-DEFER precedent exactly.

- **D-03 [closure path]:** Phase 50 closes `deferred`. STACK-01 carries to v1.8 deferred-items list. No source diff, no npm install, no tests. Phase ships only:
  - This 50-SUMMARY.md (frozen gate output + WAIVE-AND-DEFER decision + rationale + v1.8 trigger).
  - 50-VERIFICATION.md (status `passed` — pure-doc closure precedent from v1.6 Phase 45).
  - REQUIREMENTS.md traceability flip (STACK-01 → `deferred` → v1.8).
  - PROJECT.md v1.8 deferred-items entry.
  - ROADMAP.md Progress-table Phase 50 row → `deferred`.

- **D-04 [v1.8 re-attempt trigger]:** At v1.8 milestone start (date TBD when v1.8 begins), re-run the gate:

  ```
  npm view @medplum/react peerDependencies
  ```

  - **If `@mantine/core` peer range now includes `^9.x`:** Open a new phase (working name "Theme X — STACK-01 Mantine 9 / React 19 upgrade") in the v1.8 roadmap. Scope: codemod + breaking-change sweep + visual regression UAT + bundle measurement, per the original Phase 50 success criteria gate-PASS branch.
  - **If `@mantine/core` peer range still pins `^8.0.0`:** Re-defer to v1.9 with another WAIVE-AND-DEFER. Document the gate output again as evidence.

## Out of Scope (rejected workarounds — do NOT do these now or in v1.8)

- **D-05 [NO partial React 19 upgrade]:** Even though `@medplum/react` now accepts `^19.0.0`, do NOT upgrade React in isolation. The decoupling rationale in D-02 holds — keep the pair coupled until both gates open.
- **D-06 [NO `--legacy-peer-deps` workaround attempt]:** Do not try to install `@mantine/core@9.x` against the current Medplum peer pin via `--legacy-peer-deps`. Rejected as a footgun in D-02.
- **D-07 [NO codemod preview]:** Do not run the Mantine 9 codemod against a scratch branch "to see what it would do." Pure-doc deferral means zero source touch on this phase.

## What Did NOT Change

- `package.json` — UNCHANGED (still `@mantine/core: ^8.3.18`, `react: ^18.3.1`)
- `package-lock.json` — UNCHANGED
- `src/**/*` — UNCHANGED (no files modified)
- Test count: unchanged from v1.7-pre-Phase-50 baseline (Phase 49: 1386 passing / 1 pre-existing Phase-40 deuteranopia carry-over)
- Build: unchanged (no `npm run build` invoked in this phase)

## Roadmap Success Criteria — Conditional Closure (gate-FAIL branch)

| SC | Condition | Status |
|----|-----------|--------|
| F1 | `npm view @medplum/react peerDependencies` output captured verbatim in closure docs as evidence of gate state | ✓ Captured verbatim above (D-01) |
| F2 | SUMMARY.md documents the WAIVE-AND-DEFER decision matching v1.6 Phase 45 precedent — no source diff applied | ✓ This document; format mirrors 45-SUMMARY.md; zero source diff |
| F3 | STACK-01 carried forward to v1.8 deferred-items list; phase closes `deferred` | ✓ Closure: see Plan 02 (REQUIREMENTS.md flip + PROJECT.md v1.8 entry + ROADMAP.md Phase 50 row → `deferred`) |

Gate-PASS SCs (P1..P5 from ROADMAP §Phase 50) are N/A — gate failed for Mantine 9.

## Re-Activation Plan

When `@medplum/react` releases a version with Mantine `^9.x` in its peer-range:

1. Run `npm view @medplum/react peerDependencies` and confirm `@mantine/core` now allows `^9.x`.
2. Reactivate the original Phase 45 / Phase 50 scope from `.planning/milestones/v1.6-phases/45-mantine-9-upgrade-stack-01/45-CONTEXT.md` and this file.
3. Open new phase in v1.8 roadmap (working name "Theme X — STACK-01 Mantine 9 / React 19 upgrade").
4. Scope: Mantine 8 → 9 codemod + React 18 → 19 upgrade + breaking-change sweep + visual regression UAT across all 9 surfaces (Sidebar, Dashboard, Patients, Quality, Explorer, Patient detail, Cohorts, IPS, Phase-49 Graph) + bundle-size delta measurement.
5. Re-validate Phase 49's `graph.module.css` CSS-variable bridge under Mantine 9's `--mantine-color-*` namespace (may need adjustment).

## Files

- `.planning/phases/50-theme-e-stack-01-carry-over-mantine-9-react-19-gate/50-CONTEXT.md` (locked decisions D-01..D-07; gate output frozen 2026-05-01)
- `.planning/phases/50-theme-e-stack-01-carry-over-mantine-9-react-19-gate/50-DISCUSSION-LOG.md` (full pros/cons audit and user's decision rationale)
- `.planning/phases/50-theme-e-stack-01-carry-over-mantine-9-react-19-gate/50-SUMMARY.md` (this file)
- `.planning/phases/50-theme-e-stack-01-carry-over-mantine-9-react-19-gate/50-VERIFICATION.md` (status `passed` — pure-doc closure)
- `.planning/milestones/v1.6-phases/45-mantine-9-upgrade-stack-01/45-SUMMARY.md` (precedent — original WAIVE-AND-DEFER record)

## Notes for Future Self

- The `@mantine/core` peer-range remains the bottleneck. The React 19 gate has independently opened — that is the meaningful change since v1.6 close. If Medplum bumps Mantine to `^8.0.0 || ^9.0.0` (transition range) before fully moving to `^9.0.0`, the gate passes and the upgrade can proceed.
- The user's D-02 decision is to keep React 18 ↔ Mantine 8 paired through this defer. Future planners must NOT split the upgrade ("just do React 19 now") without revisiting D-02 with the user.
- CLAUDE.md §"Do NOT Use" pins Mantine 9 as forbidden until the Medplum gate opens — this phase honors that pin.
- This is a SAFE outcome. The defer protects v1.7 ship integrity.
