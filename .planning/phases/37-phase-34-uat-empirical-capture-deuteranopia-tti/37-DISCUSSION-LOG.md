# Phase 37: Phase 34 empirical UAT capture (deuteranopia + TTI) - Discussion Log

> **Audit trail only.** Do not use as input to planning, research, or execution agents.
> Decisions are captured in CONTEXT.md — this log preserves the alternatives considered.

**Date:** 2026-04-26
**Phase:** 37-phase-34-uat-empirical-capture-deuteranopia-tti
**Mode:** `--auto` (no user interaction; orchestrator selected recommended option for each gray area)
**Areas discussed:** Artifact location, Capture methodology, TTI threshold, Reconciliation doc structure, Contradiction handling, Phase 34 closure linkage, Plan structure

---

## Artifact Location

| Option | Description | Selected |
|--------|-------------|----------|
| Phase 37 directory | All artifacts under `.planning/phases/37-.../` per ROADMAP §Phase 37 | ✓ |
| Phase 34 directory | Older path from `34-06-UAT.md` (`.planning/phases/34-14-.../`) | |

**Selected:** Phase 37 directory.
**Rationale:** ROADMAP is the authoritative scope source; `34-06-UAT.md` predated Phase 37's promotion from backlog. Update `34-06-UAT.md` cross-references in the same commit set so the older doc points at the new canonical location.

---

## Capture Methodology

| Option | Description | Selected |
|--------|-------------|----------|
| Follow Plan 34-06 verbatim (no throttling, dev server for screenshots, build+preview for TTI, deterministic first-patient) | Use the procedure already documented; pick the first Synthea patient alphabetically as a deterministic test fixture | ✓ |
| Add CPU/network throttling profile (e.g., Fast 4G + 4× CPU) | Match real-world device profiles | |
| Use a hard-coded magic patient ID | Fixes the test target absolutely | |

**Selected:** Plan 34-06 verbatim + deterministic first-patient.
**Rationale:** The TTI gate measures the app's actual behavior on a development laptop, not a synthetic device profile. Deterministic patient selection (alphabetical first by `name[0].family`) is reproducible without coupling the test to a specific patient ID that might disappear from a future Synthea bundle.
**Notes:** Three consecutive TTI runs per checkout, take median (noise floor is ~10-30 ms per Plan 34-05 narrative). Use a worktree (`/tmp/exploder-tti-baseline`) for the `048e99c` baseline checkout so the main tree stays clean.

---

## TTI Regression Threshold

| Option | Description | Selected |
|--------|-------------|----------|
| Dual gate (delta_ms ≤ 100 AND delta_pct ≤ 10%) | Both `34-06-UAT.md` (≤100ms) and ROADMAP SC2 (>10%) thresholds apply; either breach → FAIL | ✓ |
| ms-only gate (≤100ms, per 34-06-UAT.md) | Original Plan 34-06 framing | |
| pct-only gate (≤10%, per ROADMAP) | Newer ROADMAP framing | |

**Selected:** Dual gate.
**Rationale:** ROADMAP and 34-06-UAT each independently define a meaningful threshold; honoring both keeps Phase 37 consistent with both upstream contracts. A regression that's 110ms but only 5% (huge baseline) deserves attention; a regression that's 12% but only 60ms (tiny baseline) also deserves attention. Failure does not block phase completion if a waiver is justified per `34-06-PLAN.md` `<done>` waiver path.

---

## Reconciliation Doc Structure

| Option | Description | Selected |
|--------|-------------|----------|
| Mirror §4b/§4c with `Empirical` column added | 7-row + 14-row tables matching paper structure; sections for TTI, contradictions, contingencies, UAT update cross-ref | ✓ |
| Free-form narrative writeup | Less rigid; harder to audit | |
| JSON-only artifact | Machine-parseable but human-unfriendly | |

**Selected:** Mirror §4b/§4c with `Empirical` column.
**Rationale:** The reconciliation IS a paper-vs-empirical comparison; structurally mirroring the paper makes the audit trail one-to-one. Required sections: §1 Within-family / §2 Cross-family / §3 TTI / §4 Contradictions / §5 Contingency commits triggered / §6 34-06-UAT.md update.

---

## Contradiction Handling

| Option | Description | Selected |
|--------|-------------|----------|
| Inline contingency commit in Phase 37 (only for HIGH/MEDIUM-HIGH pairs) | If a high-risk pair fails empirically, swap the icon and re-capture in the same phase | ✓ |
| Spawn a Phase 37.1 gap-closure | Treat any contradiction as a gap requiring its own phase | |
| Defer all contingency work to Phase 38 | Keep Phase 37 measurement-only | |

**Selected:** Inline contingency commit (HIGH/MEDIUM-HIGH only).
**Rationale:** `color-design-audit.md` §4d already specifies the swap plan (mikrobiologie → IconVirus; pro → IconListCheck). The swap is a single-line edit; spinning up a separate phase is overhead without benefit. LOW-risk pair failures are informational only — the §4d plan reserves swaps for HIGH and MEDIUM-HIGH pairs because shape distinctness already covers low-risk pairs.
**Notes:** Pre-swap PNGs preserved as `*-pre-swap.png` for audit; post-swap takes the canonical filename. `color-design-audit.md` §4d gets a `## Revision (2026-04-26, Phase 37)` note.

---

## Phase 34 Closure Linkage

| Option | Description | Selected |
|--------|-------------|----------|
| Phase 37 commits update `34-06-UAT.md` (§1d + §2 + §6 closure) | Surgical update to the existing UAT doc | ✓ |
| Mark Phase 34 verification as `gaps_found` and re-run /gsd-plan-phase 34 --gaps | Treat the human-gated items as gaps | |
| Leave 34-06-UAT.md untouched, capture only in 37-EMPIRICAL.md | Minimum disruption to Phase 34 artifacts | |

**Selected:** Phase 37 commits update `34-06-UAT.md`.
**Rationale:** The open items in `34-06-UAT.md` were `checkpoint:human-verify` gates explicitly carried forward, not gaps. Phase 37 closes the gates without reopening Phase 34's verification status. The cross-reference in `37-EMPIRICAL.md` §6 makes the audit trail discoverable.

---

## Plan Structure

| Option | Description | Selected |
|--------|-------------|----------|
| 3 plans across 2 waves | 37-01 deuteranopia (Wave 1), 37-02 TTI (Wave 1, parallel), 37-03 contingency + closure (Wave 2) | ✓ |
| 2 plans (combined deuteranopia + TTI in one plan) | Less parallelism but smaller plan count | |
| 4 plans (one per task + one per artifact) | Maximum granularity | |

**Selected:** 3 plans, 2 waves.
**Rationale:** Deuteranopia capture and TTI capture touch disjoint artifacts (no file overlap) so they parallelize safely in Wave 1. The contingency + closure plan in Wave 2 needs both Wave 1 results to know whether contingency commits are needed, so it sequences after. If §4 Contradictions is empty post-Wave-1, Plan 37-03 collapses to a thin closure-only plan.
**Notes:** Each capture plan has a `checkpoint:human-verify` gate at its capture step — same pattern Plan 34-06 used. Executor pauses, user captures, executor resumes.

---

## Claude's Discretion

The following decisions are **not locked** in CONTEXT.md and are explicitly delegated to the planner / executor:

- Exact phrasing of §4 Contradictions narrative (when present)
- Whether `37-EMPIRICAL.md` includes a §7 "Future hardening" section (recommended: yes, brief, no commitment)
- The `tti-snapshot.json` schema beyond the required fields (planner may add metadata)
- Whether to defer a "future paper update" if empirical results substantively diverge (recommended: only if §4 has ≥ 3 entries)

## Deferred Ideas

- **Headless deuteranopia simulation in CI** (puppeteer + Brettel/Machado matrices) — out of scope; v1.6+ hardening
- **Perceptual ΔE2000 color-difference gate in CI** — out of scope; v1.6+ hardening
- **Auto-update of `color-design-audit.md` §4** — only if ≥ 3 contradictions found; flag to backlog otherwise
