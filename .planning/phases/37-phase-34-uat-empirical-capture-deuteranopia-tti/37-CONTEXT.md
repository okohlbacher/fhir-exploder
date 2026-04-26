# Phase 37: Phase 34 empirical UAT capture (deuteranopia + TTI) - Context

**Gathered:** 2026-04-26
**Status:** Ready for planning
**Mode:** `--auto` (recommended defaults selected without interactive prompting)

<domain>
## Phase Boundary

Close the two human-gated UAT items left open by Plan 34-06: (1) capture three deuteranopia screenshots (Dashboard, patient tab row, ClinicalTimeline) under Chrome DevTools' deuteranopia emulation and reconcile them against the paper predictions in `color-design-audit.md` §4b/§4c (7 within-family + 14 cross-family pairs); (2) capture before/after TTI snapshots at commit `048e99c` (Phase 33 tail) and Phase 34 HEAD on `/patients/:id`, write `tti-snapshot.json`, and apply the dual-gate regression threshold. Trigger contingency icon swaps from §4d only if HIGH or MEDIUM-HIGH paper-pass pairs fail empirically. Update `34-06-UAT.md` items 1d + §2 with the empirical results.

**Out-of-scope (carried forward):** New features, new modules, palette redesigns, new performance work. This phase is purely measurement + reconciliation + targeted contingency commits.

</domain>

<decisions>
## Implementation Decisions

### Artifact Locations

- **D-01:** All Phase 37 artifacts (3 deuteranopia PNGs, `tti-snapshot.json`, `37-EMPIRICAL.md`) commit to `.planning/phases/37-phase-34-uat-empirical-capture-deuteranopia-tti/`. ROADMAP §Phase 37 is authoritative; the older path in `34-06-UAT.md` (`.planning/phases/34-14-.../`) predated Phase 37 promotion and is superseded. Update `34-06-UAT.md` cross-references in the same commit set.
- **D-02:** Filenames are fixed (no slug variation): `deuteranopia-dashboard.png`, `deuteranopia-tab-row.png`, `deuteranopia-timeline.png`, `tti-snapshot.json`, `37-EMPIRICAL.md`.

### Capture Methodology

- **D-03:** Deuteranopia capture follows `34-06-PLAN.md` Task 1 verbatim — Chrome DevTools Rendering panel → Emulate vision deficiencies → deuteranopia → full-viewport PNG via `Cmd+Shift+P` → "Capture full size screenshot". Run against `npm run dev` on the Phase 34 HEAD checkout (no production build needed for the visual capture).
- **D-04:** TTI capture follows `34-06-PLAN.md` Task 2 verbatim — `npm run build && npm run preview`, Chrome DevTools Performance panel, three consecutive recordings per checkout, **median** value goes into `tti-snapshot.json`. No CPU/network throttling (default = "No throttling", CPU 1×) so the gate measures real app behavior, not synthetic device profiles. Document the throttling explicitly in `tti-snapshot.json` so a future re-capture is reproducible.
- **D-05:** Patient ID for TTI capture is **deterministic** — pick the first Synthea patient alphabetically by `name[0].family` from the loaded bundle, record the chosen `Patient.id` in `tti-snapshot.json` under a `patient_id` field. This makes the run reproducible without hard-coding a magic ID.
- **D-06:** Baseline checkout (commit `048e99c`) runs in a temporary git worktree (`git worktree add /tmp/exploder-tti-baseline 048e99c`) so the main working tree is undisturbed. Run `npm install` in the worktree (lockfile may differ from current — confirm before measuring). Remove the worktree after capture.

### Reconciliation & Gates

- **D-07:** `37-EMPIRICAL.md` structure mirrors `color-design-audit.md` §4b/§4c with an added `Empirical` column per row. Required sections:
  1. **§1 Within-family pairs** — 7 rows (matching §4b), columns: Family / Pair / Paper prediction / Empirical / Agree?
  2. **§2 Cross-family pairs** — 14 rows (matching §4c), same columns
  3. **§3 TTI** — baseline_ms, post_phase_ms, delta_ms, delta_pct, dual-gate verdict
  4. **§4 Contradictions** — list of pairs where Paper ≠ Empirical (or "0 contradictions — paper analysis confirmed empirically")
  5. **§5 Contingency commits triggered** — list of icon swap commits (or "None — no contingency triggered")
  6. **§6 34-06-UAT.md update** — cross-reference to the commit that closed items 1d + §2
- **D-08:** TTI dual gate — PASS only if `delta_ms ≤ 100` **AND** `delta_pct ≤ 10%`. Either threshold breach → FAIL → §3 must include a culprit-attribution paragraph (use `.planning/phases/36-.../36-visualizer-after.html` chunk treemap to identify which chunk grew, since that visualizer is post-Phase-34 plus lazy-load and represents the actual current state better than Phase 34's). Failure does not block phase completion if a waiver is justified per `34-06-PLAN.md` `<done>` waiver path.
- **D-09:** Contradiction handling — if a HIGH or MEDIUM-HIGH pair (`mikrobiologie ↔ molekulargenetik`, `pro ↔ seltene`) fails empirically, apply the §4d contingency swap **inline in this phase** as a separate commit:
  - `mikrobiologie` failure → swap `IconBacteria` → `IconVirus` in `MII_MODULES`
  - `pro` failure → swap `IconQuestionnaire` → `IconListCheck` in `MII_MODULES`
  - Update `color-design-audit.md` §4d with a `## Revision (2026-04-26, Phase 37)` note
  - Re-capture the affected screenshot(s) after the swap; both pre-swap and post-swap PNGs commit (pre-swap → `deuteranopia-{tab-row,timeline}-pre-swap.png`; post-swap takes the canonical filename)
- **D-10:** A LOW-risk pair failing empirically is informational only — log in §4 Contradictions, do **not** trigger a contingency swap. The §4d swap plan is reserved for HIGH and MEDIUM-HIGH pairs (see color-design-audit.md §4d narrative).

### Phase 34 Closure

- **D-11:** This phase **updates** `34-06-UAT.md` (does not replace it):
  - §1d "Contradictions (pending empirical verification)" → fill with §4 of `37-EMPIRICAL.md`
  - §2 "TTI Regression Check" table → fill `pending` cells with empirical data
  - §6 closure checklist → mark items 1 + 2 as ✅ (or ❌ with override reference)
  - Phase 34's `34-VERIFICATION.md` status remains `passed` — the open items were `checkpoint:human-verify` gates explicitly carried forward, not gaps; Phase 37 closes the gates without re-opening Phase 34's verification.

### Plans Shape (handed to planner)

- **D-12:** Three plans recommended by ROADMAP — Plan 37-01 deuteranopia capture + reconciliation (Wave 1), Plan 37-02 TTI capture (Wave 1, parallel with 37-01 — different artifacts, no file overlap), Plan 37-03 contingency commits + Phase 34 closure (Wave 2, depends on both 37-01 and 37-02 completing). If §4 Contradictions is empty after Wave 1, Plan 37-03 is a thin closure-only plan; otherwise it includes the icon-swap commits.
- **D-13:** Each capture plan has a `checkpoint:human-verify` gate at its capture step — the planner spawns the executor, the executor pauses at the capture step, the user runs Chrome DevTools manually and saves files, the orchestrator resumes the executor to commit. This is the standard pattern Plan 34-06 used.

### Claude's Discretion

- Exact phrasing of §4 Contradictions narrative (when present)
- Whether to include a §7 "Future hardening" section in `37-EMPIRICAL.md` (e.g., suggest a perceptual color-difference CI check, headless deuteranopia simulation in CI). Recommended: yes, brief, no commitment.
- The `tti-snapshot.json` schema beyond the required fields (`baseline_ms`, `post_phase_ms`, `delta_ms`, `delta_pct`, `patient_id`, `throttling`, `commits.{baseline,post_phase}`, `runs_per_checkout`, `verdict`) — planner may add additional metadata fields if useful.
- Whether to defer a "Future paper update" if empirical results substantively diverge — recommended: only if §4 Contradictions has ≥ 3 entries.

### Folded Todos

None — `gsd-tools todo match-phase 37` returned 0 matches.

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Phase 37 scope authority
- `.planning/ROADMAP.md` §Phase 37 — Goal, dependencies, success criteria, requirement IDs
- `.planning/REQUIREMENTS.md` — closes deferred clauses of MII-EXT-11 (deuteranopia discriminability) + D-22 TTI override (no new REQ-ID per ROADMAP)

### Paper predictions to verify
- `.planning/research/color-design-audit.md` §4 — Full deuteranopia paper assessment
  - §4a — Method (3-channel reasoning: deuteranopia color-space simulation, icon shape distinctiveness, combined channel)
  - §4b — 7 within-family pairs + paper-pass predictions (table)
  - §4c — 14 cross-family adjacent-tab pairs + paper-pass predictions (table)
  - §4d — Contingency icon swap plan (mikrobiologie → IconVirus; pro → IconListCheck)
  - §4e — Empirical capture procedure deferred to Plan 34-06 (now Phase 37)

### Phase 34 procedural source-of-truth
- `.planning/phases/34-14-mii-extension-modules-palette-bundled-profiles/34-06-PLAN.md` — Verbatim capture procedure
  - Task 1 — Deuteranopia capture (Chrome DevTools Rendering panel command sequence)
  - Task 2 — TTI capture (Chrome DevTools Performance panel command sequence)
- `.planning/phases/34-14-mii-extension-modules-palette-bundled-profiles/34-06-UAT.md` — Items to update with empirical data (§1d, §2, §6 closure)
- `.planning/phases/34-14-mii-extension-modules-palette-bundled-profiles/34-CONTEXT.md` D-09 — "Same color + different icon = discriminability contract" invariant
- `.planning/phases/34-14-mii-extension-modules-palette-bundled-profiles/34-UI-SPEC.md` §Icons — Icon set + fallback options used in §4d swaps

### Phase 33 baseline anchor
- Commit `048e99c` — Phase 33 tail; baseline checkout for TTI capture
- `.planning/phases/33-*/33-CONTEXT.md` D-11 — `keepMounted` invariant on extension Tabs.Panel (the structural reason TTI shouldn't regress)

### Code touch points (no edits unless contingency triggers)
- `src/components/patients/MiiModuleTabs.tsx` — Tab row screenshot target; module icon registry edits IF §4d contingency triggers
- `src/components/patients/ClinicalTimeline.tsx` — Timeline screenshot target
- `src/theme.ts` — Palette source-of-truth (extension 14 + base 7); read-only for this phase
- Dashboard route component (resolved via routing) — Tile grid screenshot target; read-only

### Bundle attribution (TTI culprit identification)
- `.planning/phases/36-phase-34-profile-lazy-load-bundle-size-waiver-follow-up/36-visualizer-after.html` — Post-lazy-load chunk treemap; use this for §3 culprit attribution if TTI regresses (it represents the actual current state better than Phase 34's pre-lazy-load `visualizer-after.html`)

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- **Chrome DevTools workflow** — Plan 34-06 already documents the exact command sequence (Cmd+Shift+P → "Show Rendering" → "Emulate vision deficiencies" → "deuteranopia" → "Capture full size screenshot"). Phase 37 reuses verbatim.
- **MiiModuleTabs + ClinicalTimeline** — Components are stable post-Phase 34; no edits needed for capture (they ARE the capture targets).
- **Synthea bundle** — Already loaded in dev server; deterministic first-patient selection via alphabetical sort by `name[0].family` is straightforward (one-liner in browser console or `useEffect` log).
- **Worktree pattern** — Phase 36 used worktrees for executor isolation; Phase 37 uses one for the baseline checkout (`048e99c`). Same `git worktree add` mechanics.

### Established Patterns
- **Paper-then-empirical pattern** — `color-design-audit.md` §4 + Plan 34-06 → Phase 37 follows the project's locked pattern: paper predictions land first (cheap), empirical capture validates after (expensive, human-bound).
- **Contingency-not-preemptive** — `color-design-audit.md` §4d explicitly distinguishes preemptive swaps (apply now) vs contingency swaps (apply only if empirical fails). Phase 37 honors this — no proactive icon changes.
- **`checkpoint:human-verify`** — Phase 33 + Phase 34 used this checkpoint type for browser-driven captures. Phase 37 is the same pattern, just one phase later. Executor pauses, user captures, executor resumes.

### Integration Points
- `34-06-UAT.md` has explicit "MUST be filled by human verifier" markers in §1d and §2 — Phase 37's update commit fills exactly those cells.
- `color-design-audit.md` §4d has a "Borderline note for Plan 34-06 UAT attention" — Phase 37 inherits this attention focus on the two HIGH/MEDIUM-HIGH pairs.
- No production code edits unless a contingency swap fires. If a swap fires, the touch is `MII_MODULES` icon entries in `MiiModuleTabs.tsx` (or wherever they live post-Phase-34); the planner verifies the exact path during the contingency plan.

</code_context>

<specifics>
## Specific Ideas

- **Three consecutive TTI runs, take median.** Single-run TTI is noisy; the noise floor is ~10-30 ms per Plan 34-05 narrative. Median of 3 is a small enough cost (3 minutes) for a much steadier number.
- **`tti-snapshot.json` records the throttling profile explicitly.** Even though the decision is "no throttling", documenting it in the JSON makes a future re-capture reproducible. Field: `"throttling": { "cpu": "1x (off)", "network": "no throttling" }`.
- **Pre-swap PNGs preserved when contingency fires.** If `IconBacteria` is swapped for `IconVirus`, the original `deuteranopia-tab-row.png` becomes `deuteranopia-tab-row-pre-swap.png` and the post-swap capture takes the canonical filename. This makes the phase auditable end-to-end.
- **Use the Phase 36 visualizer for TTI culprit analysis, not Phase 34's.** Phase 34's visualizer predates the Phase 36 lazy-load refactor; using Phase 36's `36-visualizer-after.html` reflects the actual production bundle the user lands on.

</specifics>

<deferred>
## Deferred Ideas

- **Headless deuteranopia simulation in CI** — A `puppeteer` + Brettel/Machado matrix script could capture the 3 PNGs automatically on every PR. Out of scope for Phase 37 (which is an empirical-vs-paper reconciliation, not a CI plumbing project). Note in `37-EMPIRICAL.md` §7 if §7 is included.
- **Perceptual ΔE2000 color-difference gate in CI** — A static lint that fails CI if any two adjacent tabs in `MII_MODULES` fall below a perceptual-distance threshold under deuteranopia simulation. Belongs in a future v1.6 hardening phase, not Phase 37.
- **Auto-update `color-design-audit.md`** — If Phase 37 finds substantive divergence (≥ 3 contradictions), a follow-up phase could rewrite §4b/§4c with empirical-anchored predictions. Not Phase 37's job; flag to backlog.

</deferred>

---

*Phase: 37-phase-34-uat-empirical-capture-deuteranopia-tti*
*Context gathered: 2026-04-26 (auto-mode, recommended defaults selected)*
