---
status: superseded
phase: 29-backlog-ux
superseded_by: 30-layout-redesign
superseded_date: 2026-04-23
---

# Phase 29 Supersession Note

This phase was in-flight (plans 29-01 and 29-02 created, execution not started) when a
broader layout redesign (`handoff/INSTRUCTIONS.md` from the design team, delivered
2026-04-23) was introduced.

## Decision

- **29-01 (UX-02: OverviewStrip 9→7 + status-line header)** — **OBSOLETE.**
  The redesign's Step 4 explicitly *drops* `RingProgress` tiles and replaces them with
  uppercase label + big mono number + 3px fill bar + per-type quality matrix. The ring
  reduction planned in 29-01 conflicts with the new direction and is not merged.

- **29-02 (UX-01: external validator cascade)** — **PRESERVED AS-IS.**
  The redesign does not touch validation behavior. Plan 29-02 (three-tier cascading
  FHIR validator, PHI gate refactor, `normalizeOperationOutcomeIssue`, probe cache)
  remains valid. It will be picked up as a standalone phase in a future cycle
  (candidate: phase 31 or deferred to v1.5).

## Artifacts Kept

- `29-01-PLAN.md`, `29-02-PLAN.md`, `29-CONTEXT.md`, `29-DISCUSSION-LOG.md`,
  `29-RESEARCH.md`, `29-VALIDATION.md` — preserved for historical reference.
  29-02 may be copied forward when a new phase activates it.

## Action

- ROADMAP.md: Phase 29 entry updated to note supersession; Phase 30 added.
- STATE.md: current-focus advanced to Phase 30.
- Phase 30 (`30-layout-redesign`) created to integrate the full handoff.
