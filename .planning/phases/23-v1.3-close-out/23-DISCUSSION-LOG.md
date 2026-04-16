# Phase 23: v1.3 Close-Out — Discussion Log

> **Audit trail only.** Do not use as input to planning, research, or execution agents.
> Decisions are captured in [23-CONTEXT.md](23-CONTEXT.md) — this log preserves the alternatives considered.

**Date:** 2026-04-16
**Phase:** 23-v1.3-close-out
**Areas discussed:** None — user declined interactive gray-area discussion

---

## Gray Area Menu (Presented, User Selected "None")

Phase 23 is a close-out / correctness phase. Most CLOSE-XX technical fixes are already
specified in `.planning/REQUIREMENTS.md` and `22-REVIEW.md` §WR-01/02/03. Four remaining
decisions were offered for discussion:

| Option | Description | Selected |
|--------|-------------|----------|
| UAT execution model | (CLOSE-06) Who runs the 8 U1-U8 items, against which Blaze server, and how is Claude involved? Some items (file downloads, browser pickers) aren't automatable from Claude Code directly. | |
| UAT blocker handling | (CLOSE-06) When a U1-U8 item fails against live Blaze, does the phase block until it's fixed, or do we escalate as a follow-up warning and continue to the nyquist flip (CLOSE-07)? | |
| Plan batching strategy | How to decompose 7 CLOSE requirements into plans: one-plan-per-REQ (7 plans), grouped by category (~3-4 plans: code fixes / cosmetic / UAT / audit flip), or a single plan? | |
| WR-01 verification-first path | (CLOSE-01) If the failing test for the closure-capture bug passes immediately (meaning Phase 22's SavedCohortRow extraction already fixed it), do we still make a code change or close CLOSE-01 as already-resolved with just the test as regression guard? | |

**User's choice:** None (multiSelect = empty)
**Notes:** Oliver signaled the REQUIREMENTS.md spec + 22-REVIEW.md fix shapes are sufficient. Remaining decisions deferred to Claude's Discretion with directional guidance captured in `23-CONTEXT.md` §Decisions (D-01..D-10).

---

## Claude's Discretion (Captured in CONTEXT.md)

All four gray areas were resolved as Claude's Discretion with recommended shapes in CONTEXT.md:

- **UAT execution model** — D-06 (UAT surface breakdown), D-07 (recording location)
- **UAT blocker handling** — D-10 (fail-open for environmental, fail-closed for code bugs; cosmetic → v1.5+ backlog)
- **Plan batching strategy** — D-09 (4 plans: code-warnings / cosmetic / UAT / nyquist-flip)
- **WR-01 verification-first path** — D-01 (write failing test first; if already-resolved, keep test as regression guard and close CLOSE-01 without redundant code)

Planner has full latitude to deviate from D-09 and D-10; D-01..D-08 are locked per REQUIREMENTS.md and 22-REVIEW.md.

---

## Deferred Ideas

Captured in [23-CONTEXT.md](23-CONTEXT.md) §Deferred — Phase 24+ work (R1-R15 findings), v1.5+ EFF-R14, UAT automation infrastructure.

---

*Discussion log compiled: 2026-04-16*
