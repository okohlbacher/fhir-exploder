# Phase 23: v1.3 Close-Out — Context

**Gathered:** 2026-04-16
**Status:** Ready for planning

<domain>
## Phase Boundary

Flip v1.3 milestone status from `tech_debt` to `shipped-clean` by closing the 13 follow-up items surfaced in `.planning/milestones/v1.3-MILESTONE-AUDIT.md`:

- 3 code review **warnings** (W1 `handleExport` closure-capture, W2 `activateCohort` quota probe, W3 `parsePatientRefs` truncation false-positive)
- 2 cosmetic **integration notes** (I1 `FhirpathLike` alias, I2 stale "Cohort updated" toast)
- 8 human **UAT items** (U1-U8 — 2 from Phase 21 + 6 from Phase 22) against a live Blaze server
- 1 audit **nyquist gate** (N1 — flip `nyquist_compliant: true` on Phase 21 + Phase 22 VALIDATION.md)

**Requirements covered:** CLOSE-01, CLOSE-02, CLOSE-03, CLOSE-04, CLOSE-05, CLOSE-06, CLOSE-07.

**Explicitly NOT in this phase:**
- Any of the 15 code-review findings (R1-R15) from `.planning/CODE-REVIEW-2026-04-16.md` — those drive Phases 24-29
- `QualityMetricsContext` re-render split (R14 / EFF-R14) — deferred to v1.5+
- Broader refactor / dedup work (Phases 25-28)
- New features or UX changes — Phase 29 covers backlog UX

This is a correctness-and-sign-off phase. The only net-new *code* is the three bug fixes (W1-W3) and two cosmetic patches (I1-I2); everything else is test-writing, UAT execution, and document flips.

</domain>

<decisions>
## Implementation Decisions

### Code review warnings (locked in REQUIREMENTS.md + 22-REVIEW.md)

- **D-01 (CLOSE-01, W1):** Verify-first approach. Write a failing regression test for the closure-capture bug BEFORE touching `handleExport`. If the test passes immediately — because Phase 22's `SavedCohortRow` extraction (`CohortsPage.tsx:116-203`) already isolates the closure and `handleExport` now takes `cohort: CohortDefinition` as an explicit argument (`CohortsPage.tsx:304`) — keep the test as a regression guard and close CLOSE-01 as already-resolved. Do NOT add redundant defensive code. Document the outcome in the plan SUMMARY.

- **D-02 (CLOSE-02, W2):** Route `activateCohort` through the existing `persist` helper in `useCohorts.ts`, matching the pattern used by `addCohort` / `updateCohort` / `deleteCohort` / `duplicateCohort`. A `QuotaExceededError` raised on activation toggle MUST surface a red toast ("Browser storage is full. Delete unused cohorts to make room.") before Mantine's `useLocalStorage` can swallow it. The exact fix shape is given in 22-REVIEW.md §WR-02.

- **D-03 (CLOSE-03, W3):** Change `parsePatientRefs` to return `{ refs: string[]; truncated: boolean; originalCount: number }` and compute `truncated` as `dedupedCount > PATIENT_REF_CAP` (input-vs-cap, not post-dedupe length). Update the single caller in `CohortBuilderForm.tsx:181-184`. Cover with a **5-case test matrix**: (1) 0 refs, (2) < cap no duplicates, (3) < cap with duplicates, (4) exactly cap with duplicates (NOT truncated), (5) > cap with duplicates (truncated). This is a breaking API change to `parsePatientRefs`; the `cohorts.test.ts` file needs updating.

### Cosmetic integration notes

- **D-04 (CLOSE-04, I1):** Remove the `FhirpathLike` type alias from `src/quality/fdpgCodec.ts:51-52` and inline-use `FhirpathCriterion` directly. The merged `CohortCriterion` union makes the alias inert. Run `tsc -b --noEmit` and `npm test -- fdpgCodec` to confirm no regression.

- **D-05 (CLOSE-05, I2):** `EditCohortModal`'s "Cohort updated" toast MUST capture the cohort name at toast-dispatch time (from the saved/renamed value), not from the pre-save prop. Fix shape: pass the resolved name from the `onSave` callback return or read it from the updated cohort record after persistence, not from the initial `cohort.name` closure. Verify with a test that renames a cohort and asserts the toast `message` contains the new name.

### UAT execution (CLOSE-06)

- **D-06 (UAT surface):** U1-U8 breakdown — 2 items from Phase 21 (`T-5.3` builder authoring flow, `T-6.3` dashboard cohort scoping A/B/C/D) currently recorded as "pass" in `21-UAT.md` but marked "deferred" in the milestone audit. 6 items from Phase 22 (`22-HUMAN-UAT.md`) currently "pending". Planner must reconcile: re-run Phase 21's 2 items against live Blaze to confirm the `21-UAT.md` passes were live-server passes (not jsdom-only); execute Phase 22's 6 items fresh.

- **D-07 (recording location):** UAT results recorded in the existing files — Phase 21 → `21-UAT.md` (update if re-run surfaces anything new); Phase 22 → `22-HUMAN-UAT.md`. Each item records pass/fail + timestamp + server URL (sanitized, no PHI). New failures become explicit follow-up warnings appended to each file's `## Gaps` section.

### Nyquist flip (CLOSE-07)

- **D-08 (flip mechanics):** Edit YAML frontmatter directly on both `21-VALIDATION.md` and `22-VALIDATION.md` to flip `nyquist_compliant: false` → `true` and `wave_0_complete: false` → `true` AFTER CLOSE-01..06 are all green. Do NOT re-run `/gsd-validate-phase 21` / `/gsd-validate-phase 22` unless the milestone audit explicitly requires a fresh audit artifact — per the audit's own Nyquist Compliance note, the per-task verification maps are already complete; only the formal sign-off was missing.

### Plan batching — Claude's Discretion (recommended)

- **D-09 (recommended plan shape):** 4 plans, grouped by work-type so each plan has a single review / test-run cadence:
  - **Plan 23-01** — Code review warnings (W1 + W2 + W3 bundled; TDD; single PR-style review cycle). Rationale: all three touch the cohort subsystem, share the same test files (`cohorts.test.ts`, `useCohorts.test.tsx`, `CohortsPage.test.tsx`), and one vitest run verifies them together.
  - **Plan 23-02** — Cosmetic integration notes (I1 + I2 bundled; trivial; minimal test coverage). Rationale: two mechanical edits with low blast radius.
  - **Plan 23-03** — UAT execution + result recording (U1-U8; human-in-the-loop; may surface follow-up warnings). Rationale: a checkpoint gate distinct from code work.
  - **Plan 23-04** — Nyquist frontmatter flip + milestone audit re-run. Rationale: a pure documentation plan gated on Plans 23-01..03 being green; produces the `shipped-clean` verdict.
  Planner may deviate (e.g., split W1 into its own plan if the verify-first test requires deeper audit, or collapse 23-02 into 23-01 if review scope allows). One-plan-per-REQ (7 plans) is over-segmented for this phase; single-plan is under-segmented because the UAT gate needs a natural pause-point.

### UAT blocker handling — Claude's Discretion (recommended)

- **D-10 (blocker escalation policy):** Fail-open for environmental issues, fail-closed for code bugs:
  - Code bug surfaced by UAT → file as a new `CLOSE-08+` requirement and fix inline before CLOSE-07 flip
  - Environmental / server-specific failure (e.g., Blaze capability missing, network timeout, test-data absence) → escalate as an explicit follow-up warning in the UAT file's `## Gaps` section AND do NOT flip nyquist; surface to user for decision (accept-and-defer vs. block-and-investigate)
  - Cosmetic UX-only failure (e.g., toast color off) → record as a v1.5+ backlog item, continue
  Planner must surface this policy in Plan 23-03 so the UAT runner knows the classification rules up front.

### Claude's Discretion (blanket)

- Test file naming / location — follow existing `src/**/*.test.ts(x)` patterns alongside source files
- Commit granularity — one commit per CLOSE requirement preferred; atomic commits required per GSD workflow
- Whether to batch the test runs (one `npm test` at end vs. per-plan) — planner's call based on CI runtime

### Folded Todos

None — all v1.3 follow-up items were absorbed into CLOSE-01..07 during milestone planning.

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents (researcher, planner, executor) MUST read these before producing artifacts.**

### Requirements & Scope
- `.planning/REQUIREMENTS.md` §"Phase 23 — v1.3 Close-Out" — CLOSE-01..07 requirements (lines 19-27).
- `.planning/ROADMAP.md` §"Phase 23: v1.3 Close-Out" (lines 56-67) — phase goal, depends-on, success criteria.
- `.planning/PROJECT.md` — local-first, R4-only, MII Kerndatensatz constraints relevant to live-Blaze UAT.

### Source of Truth for Warnings & Notes
- `.planning/milestones/v1.3-MILESTONE-AUDIT.md` — authoritative list of W1-W3 warnings, I1-I2 integration notes, U1-U8 UAT items, N1 nyquist gate; rows 126-139 name each finding and its file location.
- `.planning/phases/22-programmatic-cohort-definition-fhirpath-fdpg/22-REVIEW.md` §WR-01/WR-02/WR-03 — exact fix shapes for CLOSE-01/02/03 with file:line references and code snippets.

### UAT Tracking Files
- `.planning/phases/21-interactive-cohort-builder-rename/21-UAT.md` — Phase 21's 13-item UAT (all recorded as `pass`; re-run against live Blaze to confirm as part of CLOSE-06).
- `.planning/phases/22-programmatic-cohort-definition-fhirpath-fdpg/22-HUMAN-UAT.md` — Phase 22's 6-item UAT (all `pending`); primary target for CLOSE-06 execution.

### Nyquist Flip Targets (CLOSE-07)
- `.planning/phases/21-interactive-cohort-builder-rename/21-VALIDATION.md` — frontmatter: flip `nyquist_compliant: false → true`, `wave_0_complete: false → true`.
- `.planning/phases/22-programmatic-cohort-definition-fhirpath-fdpg/22-VALIDATION.md` — frontmatter: same flip.

### Phase 21/22 Outputs (for UAT re-execution context)
- `.planning/phases/21-interactive-cohort-builder-rename/21-CONTEXT.md` — Phase 21 decisions (D-05 Encounter.period semantics, D-06 10K cap) relevant to UAT re-run semantics.
- `.planning/phases/22-programmatic-cohort-definition-fhirpath-fdpg/22-CONTEXT.md` — Phase 22 decisions (D-01..D-11 FHIRPath translator + FDPG codec + Edit/Duplicate/Delete) relevant to Phase 22 UAT.
- `.planning/phases/21-interactive-cohort-builder-rename/21-VERIFICATION.md` — Phase 21 12/12 code must-haves map.
- `.planning/phases/22-programmatic-cohort-definition-fhirpath-fdpg/22-VERIFICATION.md` — Phase 22 4/4 must-haves map.

### Code — Direct Fix Targets
- `src/components/quality/CohortsPage.tsx:304` — W1 `handleExport`; `:116-203` — `SavedCohortRow` extraction (the "already-resolved?" claim in D-01).
- `src/hooks/useCohorts.ts:154-159` — W2 `activateCohort`; `:113-152` — `persist` helper pattern to reuse.
- `src/quality/cohorts.ts:200` — W3 `parsePatientRefs` (signature change); `:21-23` — threat-model comment that must remain accurate after refactor.
- `src/components/quality/CohortBuilderForm.tsx:181-184` — W3 consumer site; `:97` `PATIENT_REF_CAP` constant.
- `src/quality/fdpgCodec.ts:51-52` — I1 `FhirpathLike` alias target.
- `src/components/quality/EditCohortModal.tsx` — I2 stale toast target (line number not pinned; planner to locate the `notifications.show({ title: 'Cohort updated' ... })` call).

### Code — Test File Targets
- `src/quality/cohorts.test.ts` — add 5-case test matrix for `parsePatientRefs` (CLOSE-03).
- `src/hooks/useCohorts.test.tsx` — add quota-exhaustion test for `activateCohort` (CLOSE-02).
- `src/components/quality/CohortsPage.test.tsx` — add non-current-row Export closure-capture test (CLOSE-01; the failing test required by D-01).
- `src/components/quality/EditCohortModal.test.tsx` — add rename-then-toast-reflects-new-name test (CLOSE-05).
- `src/quality/fdpgCodec.test.ts` — confirm no regression after `FhirpathLike` inline (CLOSE-04).

### Broader v1.4 Context (read once, don't re-open per-plan)
- `.planning/CODE-REVIEW-2026-04-16.md` — 15 findings R1-R15 driving Phases 24-29. Phase 23 scope is strictly a subset of the W1-W3 warnings; R1-R15 are NOT in this phase.
- `.planning/research/SUMMARY.md` — v1.4 research synthesis (safety invariants, R14 deferral rationale). Not directly needed for Phase 23, but downstream planner should be aware that Phase 23 is the gate before the refactor thread starts.

### External Specs
- None — Phase 23 is all internal code + UAT + frontmatter. No new library choices, no external API surface changes.

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets

- **`persist` helper in `useCohorts.ts`** (lines 113-152): already probes localStorage quota before committing; `activateCohort` just needs to route through it (CLOSE-02). No new abstraction required.
- **`SavedCohortRow` component** (`CohortsPage.tsx:116-203`): the Phase 22 extraction that likely already resolves the W1 closure-capture bug. The failing-test-first approach (D-01) is how we confirm.
- **Mantine `notifications.show`** pattern: used across all cohort mutators for red/yellow/blue toasts. I2 fix (D-05) uses the same pattern; just needs to read cohort name from the post-save value, not the pre-save closure.
- **5-case boundary test pattern**: already present in `cohorts.test.ts` for other `parsePatientRefs` scenarios; extend rather than create a new test file (CLOSE-03).

### Established Patterns

- **Threat-model comments** (e.g., `cohorts.ts:21-23` "T-21-01 Tampering/XSS", "T-21-02 DoS"): any signature change to `parsePatientRefs` (CLOSE-03) must update these comments so the security posture stays accurate.
- **YAML frontmatter on VALIDATION.md files**: canonical boolean flags (`nyquist_compliant`, `wave_0_complete`); Phase 21's + Phase 22's frontmatter shape is identical, so CLOSE-07 is a mechanical two-file edit.
- **UAT files as `## Tests` enumeration with `result: pass | pending | fail`**: established structure; CLOSE-06 updates existing files in-place rather than creating new ones.
- **TDD cadence on warning-fix plans**: Phase 21 Plan 21-02 and Phase 22 Plan 22-01 both used test-first for `useCohorts` mutators; Plan 23-01 should follow the same shape for W1/W2/W3.

### Integration Points

- **`parsePatientRefs` signature change (CLOSE-03)**: ripples into (a) `CohortBuilderForm.tsx:181-184` consumer, (b) `cohorts.test.ts` fixtures, (c) any threat-model comment referencing the return type. No other call sites per current grep.
- **Nyquist frontmatter flip (CLOSE-07)**: mechanical; no runtime code touched. But the commit message should make the trigger condition explicit (post-UAT-green).
- **Milestone audit re-run**: after Phase 23 ships, running `/gsd-audit-milestone v1.3` should flip the verdict from `tech_debt` to `shipped-clean`. This is a downstream verification signal, not a Phase 23 step.

</code_context>

<specifics>
## Specific Ideas

- Oliver explicitly declined interactive gray-area discussion — the `REQUIREMENTS.md` spec + `22-REVIEW.md` fix shapes are sufficient for planning. Planner should proceed on the locked decisions (D-01..D-08) and the recommended discretionary shape (D-09, D-10) without re-litigating.
- Phase 23 blocks the entire v1.4 refactor thread (Phase 24 depends on Phase 23) — time-to-ship matters more than scope expansion. If a UAT item surfaces non-trivial work, prefer "escalate as follow-up and defer to v1.5" over "block Phase 23 indefinitely", unless it's a true correctness regression.
- The failing-test-first approach for W1 (D-01) is non-negotiable per REQUIREMENTS.md wording; if Phase 22's refactor already fixed the bug, the test is still valuable as a regression guard — document the outcome cleanly in the plan SUMMARY rather than silently skipping.

</specifics>

<deferred>
## Deferred Ideas

- **Phase 24+ work:** all 15 code-review findings R1-R15 (duplicated hooks, drill-down shell, `useAsyncRun`, `Map<serverUrl>` registry, lazy routes, etc.) are explicitly out of scope for Phase 23. Phase 24 is the first follow-on and depends on Phase 23 shipping.
- **v1.5+ EFF-R14:** `QualityMetricsContext` re-render split (per-metric providers, Option A) — REQUIREMENTS.md §"Future Requirements".
- **Full `/gsd-validate-phase 21|22` re-run:** only trigger if CLOSE-06 UAT surfaces findings that materially change the phase 21/22 must-haves. Otherwise the frontmatter flip (D-08) is sufficient.
- **UAT automation:** driving a real browser against a live Blaze server from Claude Code is out of scope for this repo (local-first, PHI-sensitive). If a UAT item is re-classifiable as a jsdom/unit test, planner should prefer that over adding it to U1-U8; but no new automation infrastructure in this phase.

</deferred>

---

*Phase: 23-v1.3-close-out*
*Context gathered: 2026-04-16*
