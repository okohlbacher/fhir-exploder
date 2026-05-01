# Phase 39: v1.5 audit-trail backfill (NYQ + AUDIT) — Context

**Gathered:** 2026-04-29
**Status:** Ready for planning
**Mode:** `--auto` (decisions auto-selected with recommended defaults)

<domain>
## Phase Boundary

This phase delivers a clean audit trail for milestone v1.5 by retroactively producing 4 missing/upgradable artifacts and refreshing the v1.5 audit document:

1. Three retroactive `VALIDATION.md` files for v1.5 phases that lack one (31, 33, 38).
2. One retroactive `VERIFICATION.md` for Phase 38.1 (currently missing — evidence is captured indirectly in `38.1-01-SUMMARY.md` `re_walk: passed` + cascading `33-HUMAN-UAT.md` annotations).
3. Five `nyquist_compliant: false → true` upgrades on existing VALIDATION.md frontmatter (phases 32, 34, 35, 36, 37) after retroactive test-coverage review.
4. Refreshed `v1.5-MILESTONE-AUDIT.md` with `nyquist.overall: compliant` and Phase 38.1 VERIFICATION.md gap marked closed.

Pure-doc work — zero source files modified. Every change is grep-verifiable. The phase is fully automatable (no UI, no tests-of-tests, no live-Blaze UAT).

</domain>

<decisions>
## Implementation Decisions

### Path resolution
- **D-01 (operating paths):** Plan operates on `.planning/phases/{31..38, 38.1, 38.2}/` — the **current** location of v1.5 phase directories. Roadmap success criteria reference `.planning/milestones/v1.5-phases/` (post-archive paths) but the phases were NOT archived during `/gsd-complete-milestone v1.5` (return JSON: `archived.phases: false`). Plan reconciles this by either (a) operating on current paths and updating roadmap success criteria post-hoc, OR (b) including a final archive step that moves the 10 v1.5 phase dirs to `.planning/milestones/v1.5-phases/`. Option (b) is the recommended default — closes the path ambiguity in one step. *Auto-selected: Option (b).*

### VALIDATION.md backfill (phases 31, 33, 38)
- **D-02 (template + sourcing):** Use `$HOME/.claude/get-shit-done/templates/VALIDATION.md` as the base template. Source the validation strategy from each phase's existing artifacts:
  - **Phase 31** — RESEARCH.md doesn't exist (research was skipped); derive validation strategy from `31-01-PLAN.md` task acceptance criteria + `31-01-SUMMARY.md` per-task verifications.
  - **Phase 33** — RESEARCH.md doesn't exist; derive from the 7 plan SUMMARYs (33-01 through 33-07).
  - **Phase 38** — RESEARCH.md doesn't exist (HUMAN-UAT walk, not technical research); derive from `38-SESSION.md` Blaze fingerprint + `38-01-SUMMARY.md`/`38-02-SUMMARY.md`/`38-03-SUMMARY.md`.
- **D-03 (Wave-0 backfill):** For each phase, identify the existing test surface that satisfies the Nyquist sampling threshold (Wave-0 smoke + per-REQ-ID coverage). Cite test file paths + counts in the new VALIDATION.md `wave_0` section. Where coverage is genuinely insufficient, mark the phase `WAIVE-AND-DEFER` to v1.7 hardening rather than fabricating compliance.

### nyquist_compliant upgrade (phases 32, 34, 35, 36, 37)
- **D-04 (re-evaluation methodology):** For each of the 5 phases currently `nyquist_compliant: false`, re-evaluate against the current test suite (1064 passing post-v1.5):
  - Read the existing VALIDATION.md `wave_0` and `nyquist_thresholds` sections.
  - Cross-reference against the phase's SUMMARY.md test-baseline-after counts and the live test-file inventory.
  - If Wave-0 + per-REQ samples are present AND tests cover all phase REQ-IDs → flip frontmatter to `nyquist_compliant: true`, append a dated `notes:` entry citing the evidence.
  - If genuinely insufficient → keep `false`, add a `WAIVE-AND-DEFER` block citing what would need to land in v1.7 to flip it.
- **D-05 (audit conservatism):** Most v1.5 phases shipped abundant test coverage (Phase 32: +29 tests, Phase 34: +56, Phase 35: +56, Phase 36: +6 with full re-baseline, Phase 37: +0 doc-only TTI). The `false` flag is plausibly stale on at least 4 of 5; only Phase 37 is at risk of legitimate `WAIVE` (deuteranopia leg deferred — but DEUT-01 in Phase 40 will close this). *Default expectation: 4-5 phases flip to `true`; Phase 37 may legitimately stay `WAIVE-AND-DEFER` until Phase 40 lands.*

### 38.1 VERIFICATION.md backfill
- **D-06 (format):** Use the standard goal-backward `VERIFICATION.md` format (matches v1.5 conventions — same as 38, 38.2).
- **D-07 (sourcing):** Frontmatter `status: passed`, `score: 6/6 must-haves verified`. Evidence sources:
  - `38.1-01-SUMMARY.md` frontmatter (`re_walk: passed`, `tasks_completed: 6/6`, `test_baseline_before: 1054`, `test_baseline_after: 1060`, `test_baseline_delta: +6`)
  - `33-HUMAN-UAT.md` Tests 1, 2, 6 — three `fixed in Phase 38.1, commit <sha>` annotations preserve `result: fail` per D-03 invariant
  - Git log: `git log --oneline 76f2183..bc427d1` shows the 6-task commit chain
- **D-08 (re-verification stanza):** Add a `re_verification` block referencing the live-Blaze re-walk performed on 2026-04-28 by user; cite that this VERIFICATION.md is retroactive (written 2026-04-29) but reflects the verified state at phase close.

### Audit refresh (v1.5-MILESTONE-AUDIT.md)
- **D-09 (refresh content):** Update the existing `.planning/milestones/v1.5-MILESTONE-AUDIT.md` (created in Phase 39's predecessor by /gsd-audit-milestone v1.5 on 2026-04-29) by:
  - Updating frontmatter `nyquist.compliant_phases` count (was 0/8); recompute after Phase 39's flips
  - Updating frontmatter `nyquist.overall` from `0/8 compliant` to the new ratio
  - Removing the `Phase 38.1 standalone VERIFICATION.md` tech-debt entry (now closed)
  - Adding a `re-audited: 2026-04-29` note distinguishing this update from the original 2026-04-29 audit
- **D-10 (status flip):** If post-flip nyquist count is ≥ 8/10 AND no other tech_debt items remain → flip status `tech_debt → passed`. If only Phase 37 deuteranopia + Phase 40 dependency remain → keep status `tech_debt` with a single carry-over noted (DEUT-01 → Phase 40 closes it).

### Work ordering
- **D-11 (single-sweep):** All 4 doc creates + 5 nyquist flips + 1 audit refresh land in a single phase with NO inter-task ordering dependencies (every task touches a distinct file). Plan can parallelize freely. *Auto-selected: single-sweep.*

### Claude's Discretion
- Exact wording of the `notes:` block in each upgraded VALIDATION.md frontmatter — planner derives from per-phase test inventory.
- Whether to consolidate the audit-refresh into a single `.planning/milestones/v1.5-MILESTONE-AUDIT.md` rewrite or apply a diff-style append. Recommend rewrite (cleaner record).
- Whether the optional phase-archive step (D-01 option b) goes in its own plan or as the final task of the main backfill plan. Recommend final task — keeps the phase to one plan if scope allows.

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Templates
- `$HOME/.claude/get-shit-done/templates/VALIDATION.md` — base template for retroactive VALIDATION.md backfill
- v1.5 example VALIDATION.md files (for format consistency): `.planning/phases/32-eff-r14-qualitymetricscontext-split/32-VALIDATION.md`, `34-14-mii-extension-modules-palette-bundled-profiles/34-VALIDATION.md`, `35-phase-30-uat-follow-ups-per-type-quality-matrix/35-VALIDATION.md`, `36-phase-34-profile-lazy-load-bundle-size-waiver-follow-up/36-VALIDATION.md`, `37-phase-34-uat-empirical-capture-deuteranopia-tti/37-VALIDATION.md`

### Source artifacts for retroactive backfill
- `.planning/phases/31-ux-01-external-validator-cascade/31-01-PLAN.md`, `31-01-SUMMARY.md`, `31-02-PLAN.md`, `31-02-SUMMARY.md`, `31-VERIFICATION.md` — Phase 31 evidence
- `.planning/phases/33-mii-schema-foundation-extension-modules-collapse-ui/33-{01..07}-PLAN.md`, `33-{01..07}-SUMMARY.md`, `33-VERIFICATION.md` — Phase 33 evidence
- `.planning/phases/38-v1.5-human-uat-live-blaze-smoke-tests/38-{01..03}-PLAN.md`, `38-{01..03}-SUMMARY.md`, `38-VERIFICATION.md`, `38-SESSION.md` — Phase 38 evidence
- `.planning/phases/38.1-fix-sort-date-blaze-incompatibility/38.1-01-PLAN.md`, `38.1-01-SUMMARY.md` — Phase 38.1 evidence (no VERIFICATION.md yet)
- `.planning/phases/33-mii-schema-foundation-extension-modules-collapse-ui/33-HUMAN-UAT.md` — cross-reference evidence for 38.1 (Tests 1, 2, 6 annotations)

### Existing VALIDATION.md files to UPGRADE (`nyquist_compliant: false → true`)
- `.planning/phases/32-eff-r14-qualitymetricscontext-split/32-VALIDATION.md`
- `.planning/phases/34-14-mii-extension-modules-palette-bundled-profiles/34-VALIDATION.md`
- `.planning/phases/35-phase-30-uat-follow-ups-per-type-quality-matrix/35-VALIDATION.md`
- `.planning/phases/36-phase-34-profile-lazy-load-bundle-size-waiver-follow-up/36-VALIDATION.md`
- `.planning/phases/37-phase-34-uat-empirical-capture-deuteranopia-tti/37-VALIDATION.md`

### Audit document (refresh target)
- `.planning/milestones/v1.5-MILESTONE-AUDIT.md` — refresh after backfills land

### Project meta
- `.planning/REQUIREMENTS.md` — REQ-IDs NYQ-01 + AUDIT-01 acceptance criteria
- `.planning/ROADMAP.md` (Phase 39 section, lines ~96-114) — phase goal + 4 success criteria
- `.planning/PROJECT.md` (Current Milestone v1.6 section) — milestone framing

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- **VALIDATION.md template** at `$HOME/.claude/get-shit-done/templates/VALIDATION.md` — pre-existing structure that downstream phases reuse; backfill should preserve frontmatter shape (`nyquist_compliant`, `wave_0_complete`, etc.) so the milestone audit's existing scan logic works unchanged.
- **VERIFICATION.md format** — see `38-VERIFICATION.md` and `38.2-VERIFICATION.md` for the goal-backward shape that 38.1's retroactive file should mirror.

### Established Patterns
- v1.5 phases that DID write VALIDATION.md (32, 34, 35, 36, 37) all use the same frontmatter keys and `wave_0` / `nyquist_thresholds` sections — the 3 retroactive files (31, 33, 38) should match this shape exactly.
- Append-only audit annotations on HUMAN-UAT files: per Phase 33 D-03 invariant, original `result: fail` markers are NEVER changed; fix evidence is appended via `→ fixed in Phase X, commit <sha>`. Phase 39's 38.1-VERIFICATION.md must NOT alter the existing 33-HUMAN-UAT.md annotations — only reference them.

### Integration Points
- The `gsd-tools` CLI's `state planned-phase` and `phase complete` commands already read VALIDATION.md frontmatter — backfill must not break those parsers.
- The milestone audit refresh feeds into the next milestone's `init milestone-op` call (it scans for `nyquist_compliant` flags) — so a clean refresh propagates correct nyquist totals into v1.6+ workflows.

</code_context>

<specifics>
## Specific Ideas

- The existing `.planning/milestones/v1.5-MILESTONE-AUDIT.md` (committed `c529eba` on 2026-04-29) was already a refresh of the original 2026-04-25 audit. Phase 39's audit refresh is the SECOND refresh, post-backfill. Keep the audit chain explicit in frontmatter (`audited`, `re_audited`, `re_audited_2`) so the temporal sequence stays legible.
- Phase 36, 37 are decimal-promoted phases (former backlog 999.3, 999.2) with smaller scope than the main 31-35 phases — their VALIDATION.md upgrades may need less ceremony.
- Phase 37's `nyquist_compliant: false` is partly intentional (deuteranopia leg deferred). Plan should NOT force-flip Phase 37 to `true` if DEUT-01 hasn't landed yet (Phase 40). Either keep `false` with a clear `pending: DEUT-01 in Phase 40` note, OR partially flip to `partial` if the schema supports it.

</specifics>

<deferred>
## Deferred Ideas

- **Cross-milestone audit hygiene** — earlier milestones (v1.0, v1.1, v1.2) likely have similar VALIDATION.md gaps. Phase 39 deliberately scopes only to v1.5; cross-milestone backfill is a separate v1.7+ candidate.
- **Automated VALIDATION.md generator** — a `gsd-tools` subcommand that scaffolds VALIDATION.md from SUMMARY.md test-counts. Useful but out of scope; manual templating works fine for 4 retroactive files.
- **Audit re-run automation** — programmatic invocation of `/gsd-audit-milestone` from within the phase. Out of scope; planner can include a manual step or recommend a follow-up command.

</deferred>

---

*Phase: 39-v1.5-audit-trail-backfill-nyq-audit*
*Context gathered: 2026-04-29 via `/gsd-discuss-phase 39 --auto`*
