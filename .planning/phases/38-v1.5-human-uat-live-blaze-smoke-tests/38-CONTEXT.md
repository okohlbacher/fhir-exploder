# Phase 38: v1.5 HUMAN-UAT live-Blaze smoke tests (Phase 33 + Phase 35) - Context

**Gathered:** 2026-04-28
**Status:** Ready for planning

<domain>
## Phase Boundary

Run the 12 live-Blaze observational tests merged from `33-HUMAN-UAT.md` (6 items) and `35-HUMAN-UAT.md` (6 items) in a single browser session against live Blaze + Synthea. Per-test pass/fail recorded inline in the source HUMAN-UAT files. Failures route through a severity-tiered protocol (critical → inline sub-phase fix; minor/data-coverage → accepted override with free-text rationale). Both `33-VERIFICATION.md` and `35-VERIFICATION.md` are flipped from `human_needed` → `passed` via in-place top-frontmatter update plus appended `## Re-verification (Phase 38, <sha>)` section. Phase 38 SUMMARY records the Blaze server URL plus a per-resource-type counts table as the Synthea bundle fingerprint so the smoke session is reproducible.

**Out-of-scope (carried forward):** New features. New requirements. Re-running the programmatic gates Phase 33/35 already passed. Per-test screenshot capture (Phase 37 pattern not adopted here — these tests are interaction/behavior checks, not visual artifacts). Synthea generator regeneration / seed capture.

</domain>

<decisions>
## Implementation Decisions

### Failure-handling protocol

- **D-01:** Severity-tiered routing on test fail:
  - **Critical/major UX defect** (e.g., Drawer opens on wrong route, PHI gate bypassed, timeline mis-colored across all four types) → inline fix lands as **decimal sub-phase 38.1** via `/gsd-insert-phase`. Phase 38 itself stays observational; the fix-phase has its own PLAN/EXECUTE/VERIFY cycle. Phase 38 closure does NOT wait on 38.1 unless the user explicitly chains it.
  - **Minor/cosmetic** (e.g., a single label-copy nit, a non-blocking tooltip mis-position) → accepted override recorded as `result: fail` plus free-text `evidence: |` rationale. No fix in v1.5.
  - **Data-coverage gap** (e.g., "Synthea bundle has zero Consent resources, so test 33-6 cannot pass for that module") → `result: fail` + free-text rationale citing data shape. Documented in evidence as the accepting basis. Mirrors Phase 33 `33-01-INVESTIGATION.md` precedent ("Consent, Medikation may legitimately show empty").
- **D-02:** No fixed YAML schema for override / failure rationale — **per-test free-text** in the existing `evidence: |` block (Phase 23 precedent). Each test's narrative chooses its own shape (a count, a sentence, a list of observed values). The verifier judges what's needed; downstream readers grep on `result: pass | fail` and read evidence inline.
- **D-03:** Critical-failure fix-phase is numbered 38.1 (or 38.2 if a second one fires). Phase 38 SUMMARY links to the inserted phase by directory path. The HUMAN-UAT.md row keeps `result: fail` plus a closing line `→ fixed in Phase 38.1, commit <sha>` after 38.1 lands.

### Evidence & artifact pattern

- **D-04:** Each of the 12 tests gets a `result: pass | fail` field plus a free-text `evidence: |` block (Phase 23 YAML shape). No mandatory schema, no per-test screenshot. Evidence length scales with the test — pass cases may be one sentence, failures or net-tab tests may be a paragraph.
- **D-05:** Net-tab tests (33-4 Drawer no-fetch on tile click; 35-6 PHI gate no-fetch on chevron click) — **trust verifier judgment**. No mandatory `network_observed:` field, no required phrase. The verifier confirms `result: pass` based on what they observed in DevTools; if they want to add net-tab notes to their evidence string, that's their call.
- **D-06:** Re-verification format for `33-VERIFICATION.md` and `35-VERIFICATION.md`:
  1. Top-of-file frontmatter: `status: human_needed` → `status: passed`. Add `re_verified: <ISO-8601 timestamp>`. Add `re_verified_by: phase-38`.
  2. Append a new section at end: `## Re-verification (Phase 38, <commit-sha-of-walk-plan>)` listing each previously-`pending` test → final outcome (pass / fail-overridden / fail-fixed-in-38.1) with a one-line rationale.
  3. The original verification narrative above remains untouched (historical record).
- **D-07:** Phase 23's `re_verified:` frontmatter convention is the shape; Phase 38's appended section is the new contribution. Both 33 and 35 verification files get the same treatment in the same closure plan (38-03).

### Plan decomposition + ordering

- **D-08:** **Three plans:**
  - **Plan 38-01** — Pre-flight checklist + walk Phase 33's 6 HUMAN-UAT tests; record per-test results in `33-HUMAN-UAT.md`. Captures the per-type counts table as session-start artifact (writes to `38-SESSION.md` and inlines into the plan SUMMARY).
  - **Plan 38-02** — Walk Phase 35's 6 HUMAN-UAT tests in the same browser session; record results in `35-HUMAN-UAT.md`. Reuses counts table from 38-01's pre-flight (no re-capture).
  - **Plan 38-03** — Closure: write `38-SUMMARY.md` (embedding Blaze URL + counts table + per-test pass/fail digest); flip both verification files (D-06); flip Phase 38's own status when 38-01 + 38-02 both report.
- **D-09:** **Sequential single-session execution:** Wave 1 = Plan 38-01 → Plan 38-02 (one browser session, dev server stays running, no Blaze reset between). Wave 2 = Plan 38-03 (closure; runs after both walks land). The "single browser session" property is what makes the per-type counts table valid as a fingerprint — re-loading Synthea between walks would invalidate it.
- **D-10:** Within each walk plan, tests run in **numbered order from the HUMAN-UAT.md file** (1 → 2 → 3 → 4 → 5 → 6). Predictable resume on interruption; matches the file's authoritative ordering.
- **D-11:** Each walk plan uses the `checkpoint:human-verify` pattern (Phase 33 / 34 / 37 precedent) — executor pauses, user runs the browser test, executor resumes to commit the result update. One checkpoint covers all 6 tests in the plan (single human-verifier hand-off per plan), not per-test.

### Pre-flight reproducibility

- **D-12:** **Synthea bundle identity = per-resource-type counts table.** No Bundle.id capture (Synthea bundles imported via `$upload` typically don't preserve one). No Synthea generator seed/version capture (the generator-side identity isn't tracked on the Blaze side). The counts table is the de-facto fingerprint a future re-run can compare against.
- **D-13:** Counts table captured **once** at session start (Plan 38-01 task 0 pre-flight). Persisted to `38-SESSION.md` (or written into the plan SUMMARY frontmatter — planner's call). Plan 38-02 reuses; Plan 38-03 SUMMARY embeds. Single source of truth, matches "sequential single session" decision.
- **D-14:** Counts table format: GET `<blazeUrl>/<ResourceType>?_summary=count` for each of: Patient, Condition, Observation, Encounter, Procedure, MedicationStatement, AllergyIntolerance, Consent, Immunization, DiagnosticReport, ServiceRequest. (List covers the 11 types touched by Phase 33 + Phase 35 tests; planner may extend if research surfaces additions.) Format in SUMMARY: a markdown table with `| Resource type | Count |` rows.
- **D-15:** **Pre-flight fail-fast checklist** (Plan 38-01 task 0):
  1. `<blazeUrl>/metadata` returns 200.
  2. `Patient?_summary=count` ≥ 1.
  3. `Observation?_summary=count` ≥ 1.
  4. Dev server (`npm run dev`) reachable on the configured port (e.g., 5173).
  5. The configured `fhir.serverUrl` from `public/settings.yaml` matches the Blaze instance the verifier intends to use.

  Any failure → plan halts before any test walk; verifier fixes setup and re-runs. Halt is logged in plan SUMMARY but does not consume a checkpoint.

### Claude's Discretion

- Exact wording of the `## Re-verification (Phase 38, <sha>)` section header (D-06) — planner may choose `### Tests re-verified` or similar sub-structure.
- Whether `38-SESSION.md` exists as a separate artifact or the counts table lives only in Plan 38-01 SUMMARY (D-13). Planner picks based on whether other plans need to read it independently.
- The exact markdown shape of the Phase 38 SUMMARY (D-08 Plan 38-03) — required content fixed (Blaze URL + counts + 12-test digest); section ordering and prose are open.
- Whether to capture a one-time `<blazeUrl>` ping latency / `metadata.software.version` snapshot in pre-flight as bonus reproducibility data — recommended, low cost, high audit value.
- Whether Plan 38-03 closure additionally appends a one-line entry to `STATE.md` Decisions log noting "v1.5 HUMAN-UAT closure landed Phase 38" — recommended.

### Folded Todos

None — `gsd-tools todo match-phase 38` returned 0 matches.

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Phase 38 scope authority
- `.planning/ROADMAP.md` §Phase 38 — Goal, dependencies, 4 success criteria, requirement IDs (closes Phase 33 SC5 + Phase 35 SC5)
- `.planning/REQUIREMENTS.md` — flips MII-EXT-04/06/07/08 + UAT-FU-01/02/05 from `human_needed` → `passed` (no new REQ-IDs)

### Tests to walk (authoritative content)
- `.planning/phases/33-mii-schema-foundation-extension-modules-collapse-ui/33-HUMAN-UAT.md` — 6 tests (Synthea Laborbefund extraQuery; timeline color/label; Dashboard heading; tile Drawer UX; deep-link auto-expand; UAT-FU-06 previously-empty-panel). Updated in Plan 38-01.
- `.planning/phases/35-phase-30-uat-follow-ups-per-type-quality-matrix/35-HUMAN-UAT.md` — 6 tests (Date/Status real data; identifier-system Tooltip; Modal transition; bottom Extensions section; per-type quality matrix card; PHI gate behavior on chevron click). Updated in Plan 38-02. Note: this file is currently `status: shelved`; Plan 38-02 flips to `status: complete` after walk.

### Verification files to re-flip (D-06 procedure)
- `.planning/phases/33-mii-schema-foundation-extension-modules-collapse-ui/33-VERIFICATION.md` — current `status: human_needed`; Plan 38-03 flips to `passed` + appends `## Re-verification (Phase 38, <sha>)` section.
- `.planning/phases/35-phase-30-uat-follow-ups-per-type-quality-matrix/35-VERIFICATION.md` — current `status: human_needed`; Plan 38-03 flips to `passed` + appends `## Re-verification (Phase 38, <sha>)` section.

### Format precedents
- `.planning/phases/23-v1.3-close-out/23-HUMAN-UAT.md` — `result: pass` + `evidence: |` YAML pattern (D-02, D-04). Also shows `re_verified:` frontmatter convention (D-06).
- `.planning/phases/23-v1.3-close-out/23-VERIFICATION.md` — re-verification narrative shape (referenced by D-06 narrative section).
- `.planning/phases/33-mii-schema-foundation-extension-modules-collapse-ui/33-01-INVESTIGATION.md` — Phase 33 root-cause investigation; shows the data-coverage rationale ("Consent, Medikation may legitimately show empty per Synthea data") that grounds D-01's data-coverage override path.

### Checkpoint pattern precedents (executor pause / verifier resume)
- `.planning/phases/34-14-mii-extension-modules-palette-bundled-profiles/34-06-PLAN.md` — `checkpoint:human-verify` shape used for browser-bound tasks.
- `.planning/phases/37-phase-34-uat-empirical-capture-deuteranopia-tti/37-CONTEXT.md` D-13 — Same pattern for empirical capture; reused verbatim in Phase 38 walks.

### Configuration / runtime
- `public/settings.yaml` — `fhir.serverUrl` is the Blaze URL captured in SUMMARY + pre-flight (D-15).

### Code touch points (read-only — no production edits unless 38.1 fires)
- `src/components/patients/MiiModuleTabs.tsx` — Tested in 33-2, 33-4, 33-5; not edited.
- `src/components/patients/ClinicalTimeline.tsx` — Tested in 33-2; not edited.
- `src/components/explorer/SearchResultsPage.tsx` — Tested in 35-1; not edited.
- `src/components/explorer/HumanReadableView.tsx` — Tested in 35-2, 35-3, 35-4; not edited.
- `src/components/quality/QualityByTypeMatrix.tsx` — Tested in 35-5, 35-6; not edited.

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- **Phase 23 YAML shape** — `23-HUMAN-UAT.md` already shows the exact `result: pass | fail` + `evidence: |` shape Phase 38 uses. The two walk plans copy that template into the per-test entries of `33-HUMAN-UAT.md` and `35-HUMAN-UAT.md`. No new shape to invent.
- **`checkpoint:human-verify` checkpoint type** — Phase 33, 34, 37 all use this for browser-bound tasks. Phase 38 walks reuse verbatim; the executor framework already understands the pause/resume contract.
- **Blaze `/<Type>?_summary=count` query** — Already used elsewhere in the app for resource counts (DashboardPage tile counts). Pre-flight reuses this URL shape for the counts-table fingerprint (D-14).
- **`re_verified:` frontmatter field** — Phase 23 used this in `23-HUMAN-UAT.md` after the Plan 23-05 fix re-run. Phase 38 verification re-flip (D-06) carries the same field into the verification files (not the HUMAN-UAT files this time, since those are the test-records).
- **`/gsd-insert-phase` for sub-phase 38.1** — Documented GSD workflow; on critical-fail trigger (D-01), Phase 38 closure script invokes this rather than spawning ad-hoc work in-phase.

### Established Patterns
- **In-place updates to frontmatter** — Phase 33's `status: partial` and Phase 35's `status: shelved` get updated in-place by the walk plans. Phase 23 already did this on `status: complete`.
- **Verification re-verification idiom** — Phase 23 used "Re-run pass after Plan 23-05 fix"; Phase 38 generalizes to "Re-verification (Phase 38, <sha>)" since it's spanning two source phases at once.
- **Single-session pre-flight as task 0** — Plan 24, 25, 26 all start with environment-setup tasks. Phase 38 Plan 38-01 task 0 is in the same family.
- **No new REQ-IDs for closure phases** — Phase 23 closed v1.3 UAT without adding requirements; Phase 36, 37, 38 follow the same pattern. ROADMAP language confirms.

### Integration Points
- The walk plans WRITE to `33-HUMAN-UAT.md` and `35-HUMAN-UAT.md` — the source HUMAN-UAT files are owned by their original phases but Phase 38 has explicit ROADMAP authority to update them.
- Plan 38-03 closure WRITES to `33-VERIFICATION.md` and `35-VERIFICATION.md` — same explicit authority via ROADMAP success criteria #2 + #3.
- No `src/` edits expected. If sub-phase 38.1 fires (D-01 critical fail), that phase touches src; Phase 38 itself does not.
- `npm run dev` (not `npm run build && npm run preview`) is the runtime per D-15 — this is a UX/interaction test set, not a TTI / production-bundle test set.

</code_context>

<specifics>
## Specific Ideas

- **Per-type counts table is the bundle fingerprint, not Bundle.id.** D-12 makes this explicit because Blaze `$upload` typically discards Bundle.id; counts are the practical reproducibility anchor.
- **Trust the human verifier on net-tab observation** (D-05) — the contract is "the verifier confirms they saw 0 calls"; the YAML doesn't enforce a special phrase. Lowers ceremony, matches the user's general preference for free-text evidence.
- **Failure path is severity-tiered, not all-or-nothing** (D-01) — critical defects DO get fixed in v1.5 (via 38.1), but cosmetic / data-coverage failures don't block the milestone. Mirrors the Phase 23 "real fix vs accepted gap" precedent.
- **Sequential single browser session** (D-09) is the load-bearing decision: it's why per-type counts are captured once, and why Plan 38-01 → 38-02 ordering matters.

</specifics>

<deferred>
## Deferred Ideas

- **Per-test screenshot artifacts** (Phase 37 pattern) — Not adopted here because Phase 38's tests are behavioral/interactive (Tooltip hover, Modal transition, no-fetch invariant), not visual fingerprints. Could be added later as "v1.6 UAT photo log" if a future hardening phase needs it.
- **Headless / scripted regression of these UAT items** — A Playwright suite covering all 12 tests would let CI re-verify on every PR. Out of scope for v1.5 (and out of scope for Phase 38, which is a closure walk). Track for a possible v1.6 "browser regression CI" phase.
- **Synthea generator-side reproducibility (seed + version)** — D-12 explicitly skips this. If future phases need stronger reproducibility, capturing the Synthea seed + generator version when the bundle is uploaded would let regenerate-and-rediff workflows. Backlog.
- **Mandatory net-tab schema** (D-05 alternative) — Considered and rejected for friction. If a future Phase shows we missed a no-fetch regression because of vague evidence, revisit and add a structured `network_observed:` field to the YAML shape.

</deferred>

---

*Phase: 38-v1.5-human-uat-live-blaze-smoke-tests*
*Context gathered: 2026-04-28*
