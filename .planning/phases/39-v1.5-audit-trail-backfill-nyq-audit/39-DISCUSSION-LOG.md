# Phase 39: v1.5 audit-trail backfill (NYQ + AUDIT) — Discussion Log

> **Audit trail only.** Do not use as input to planning, research, or execution agents.
> Decisions are captured in CONTEXT.md — this log preserves the alternatives considered.

**Date:** 2026-04-29
**Phase:** 39-v1.5-audit-trail-backfill-nyq-audit
**Mode:** `--auto` (recommended defaults auto-selected)
**Areas discussed:** Path resolution, VALIDATION.md backfill, nyquist_compliant upgrade, 38.1 VERIFICATION.md, audit refresh, work ordering

---

## Path Resolution (D-01)

| Option | Description | Selected |
|--------|-------------|----------|
| Operate on current paths (`.planning/phases/`) | Phase work uses paths as they currently exist; update roadmap success criteria post-hoc to match | |
| Include archive step + operate on `milestones/v1.5-phases/` | Move 10 v1.5 dirs to `milestones/v1.5-phases/` as a final task; success criteria paths become accurate | ✓ |

**Auto-selected:** Option (b). Reason: roadmap success criteria 1, 2, 3 explicitly reference `milestones/v1.5-phases/` paths; closing this ambiguity in one step is cleaner than splitting work across phases. `/gsd-complete-milestone v1.5` reported `archived.phases: false` so the archive is genuinely pending.

---

## VALIDATION.md Backfill — Phases 31, 33, 38 (D-02, D-03)

| Option | Description | Selected |
|--------|-------------|----------|
| Run `/gsd-validate-phase` per phase | Use the canonical tool to generate VALIDATION.md from RESEARCH.md (where exists) | |
| Manual backfill from existing artifacts | Fill the template manually using PLAN.md task acceptance criteria + SUMMARY.md test counts | ✓ |
| Mixed: tool where RESEARCH.md exists, manual where it doesn't | Run tool for phases that have RESEARCH.md; manual for the others | |

**Auto-selected:** Manual backfill. Reason: phases 31, 33, 38 all skipped research (no RESEARCH.md to feed `/gsd-validate-phase`); the canonical tool would not produce useful output. Manual templating from PLAN+SUMMARY is the only viable path. Format must match the existing v1.5 VALIDATION.md files (32, 34, 35, 36, 37).

---

## nyquist_compliant Upgrade — Phases 32, 34, 35, 36, 37 (D-04, D-05)

| Option | Description | Selected |
|--------|-------------|----------|
| Re-evaluate against current test suite, flip where coverage is sufficient | Cross-check Wave-0 + per-REQ samples; flip true if covered; WAIVE-AND-DEFER if not | ✓ |
| Force-flip all 5 to `true` | Treat the `false` flag as stale and unconditionally upgrade | |
| Run `/gsd-validate-phase` to backfill missing tests | Generate new tests for any insufficient coverage before flipping | |

**Auto-selected:** Re-evaluate. Reason: most v1.5 phases shipped abundant test coverage (+29 / +56 / +56 / +6 over baselines); the `false` flag is plausibly stale. Force-flip risks dishonest accounting; test-backfill expands scope beyond v1.6 budget. Re-evaluation is the right balance — flip where evidence supports it, keep `false` where it doesn't (Phase 37 may legitimately stay `false` until DEUT-01 lands in Phase 40).

---

## 38.1 VERIFICATION.md Backfill (D-06, D-07, D-08)

| Option | Description | Selected |
|--------|-------------|----------|
| Standard goal-backward VERIFICATION.md format | Match the v1.5 convention (frontmatter + must_haves + score) — same as 38, 38.2 | ✓ |
| Lightweight retrospective format | Minimal `status: passed` stub citing SUMMARY.md as the source of truth | |
| Skip — leave the gap and document in v1.5 audit instead | Accept the audit-trail debt; reference SUMMARY.md from v1.5-MILESTONE-AUDIT.md notes | |

**Auto-selected:** Standard format. Reason: consistency with v1.5 audit chain; the milestone-audit refresh (D-09) wants to mark this gap as `closed`, which only works if a real VERIFICATION.md exists. Lightweight stub is fragile; skipping perpetuates the debt that triggered Phase 39 in the first place.

---

## v1.5-MILESTONE-AUDIT.md Refresh (D-09, D-10)

| Option | Description | Selected |
|--------|-------------|----------|
| Full rewrite with `re_audited:` frontmatter | Clean record; supersedes the 2026-04-29 audit; preserves history via `re_audited` field | ✓ |
| Diff-style append at the bottom | Add a `## 2026-04-29 Refresh` section without touching prior content | |
| Status flip only | Edit only frontmatter `status:` and `nyquist:` fields; leave body unchanged | |

**Auto-selected:** Full rewrite with re_audited frontmatter. Reason: cleanest record; the existing audit was itself a refresh of 2026-04-25 (so this becomes refresh-of-refresh). Frontmatter chain (`audited`, `re_audited`, `re_audited_2`) preserves temporal sequence; readers always see current state without scrolling.

---

## Work Ordering (D-11)

| Option | Description | Selected |
|--------|-------------|----------|
| Single-sweep parallel | All 4 doc creates + 5 nyquist flips + audit refresh in one phase, no inter-task deps | ✓ |
| Sequential per-phase | One phase's backfill at a time; verify each before next | |
| Two phases: backfill, then audit refresh | Split so the audit refresh sees the backfilled state cleanly | |

**Auto-selected:** Single-sweep. Reason: every task touches a distinct file; zero conflict risk. Phase 39's whole purpose is to be a fast hygiene pass, not multi-phase staging. Audit refresh is naturally the last task of a single plan since it consumes the prior tasks' output (touching it in same plan is fine — read order within a plan is sequential by task number).

---

## Claude's Discretion

- Exact wording of `notes:` blocks in upgraded VALIDATION.md frontmatter — derived from per-phase test inventory by the planner
- Whether the optional phase-archive step (D-01 option b) is its own plan or the final task of the main plan — recommend final task for compactness
- Whether to consolidate `.planning/MILESTONES.md` v1.5 entry text with the refreshed audit (no — keep MILESTONES.md unchanged; it's the human-readable summary, not the audit detail)

## Deferred Ideas

- Cross-milestone VALIDATION.md hygiene for v1.0–v1.4 (out of scope; v1.7+ candidate)
- Automated VALIDATION.md generator subcommand in `gsd-tools` (deferred; manual works for 4 files)
- Programmatic milestone-audit re-run from within a phase (deferred; manual `/gsd-audit-milestone` invocation is fine as a post-Phase-39 follow-up)
