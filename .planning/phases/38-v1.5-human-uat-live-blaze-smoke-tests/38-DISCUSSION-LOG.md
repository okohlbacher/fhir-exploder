# Phase 38: v1.5 HUMAN-UAT live-Blaze smoke tests - Discussion Log

> **Audit trail only.** Do not use as input to planning, research, or execution agents.
> Decisions are captured in CONTEXT.md — this log preserves the alternatives considered.

**Date:** 2026-04-28
**Phase:** 38-v1.5-human-uat-live-blaze-smoke-tests
**Areas discussed:** Failure-handling protocol, Evidence & artifact pattern, Plan decomposition + ordering, Pre-flight reproducibility

---

## Failure-handling protocol

### Q1 — When a test fails, how should Phase 38 decide between inline-fix vs override vs defer?

| Option | Description | Selected |
|--------|-------------|----------|
| Severity-tiered | Critical/major UX → inline fix; minor/cosmetic → override; data-coverage gap → override with reason. Mirrors Phase 23 root_cause structure. | ✓ |
| All failures → separate phase | Phase 38 only records pass/fail; any failure produces backlog/insert-phase entry. | |
| All failures → inline fix | Every failure spawns in-phase fix plan before Phase 38 closes. | |
| User decides per failure | No pre-locked policy; executor pauses and asks fix-now / override / defer. | |

**User's choice:** Severity-tiered
**Notes:** Matches Phase 23 precedent and gives downstream planner a deterministic decision tree.

---

### Q2 — What override format should Phase 38 use when a failure is accepted?

| Option | Description | Selected |
|--------|-------------|----------|
| YAML override block | `result: override` + `override_reason:` + `override_category:` fields per test. | |
| `result: fail` + waiver block | Keep `result: fail`, add sibling `waiver:` block with rationale + accepting user. | |
| Per-test free text | Free text in the existing `evidence: |` block; no fixed schema. | ✓ |

**User's choice:** Per-test free text
**Notes:** Lowest ceremony; trusts the verifier to write what's needed per test. Matches the Phase 23 `evidence: |` shape.

---

### Q3 — If a critical failure triggers an inline fix, how should Phase 38 absorb the work?

| Option | Description | Selected |
|--------|-------------|----------|
| Decimal sub-phase | Inline fix lands as Phase 38.1 via `/gsd-insert-phase`. Phase 38 stays purely observational. | ✓ |
| Extra plan in Phase 38 | Add Plan 38-NN inside Phase 38 for the fix. | |
| Backlog the fix | Critical failure goes to backlog 999.X with severity tag. | |

**User's choice:** Decimal sub-phase
**Notes:** Cleanest audit trail. Phase 38 itself remains observational; sub-phase 38.1 owns its own plan/execute/verify cycle.

---

## Evidence & artifact pattern

### Q4 — Per-test, what evidence should Phase 38 capture beyond `result: pass|fail`?

| Option | Description | Selected |
|--------|-------------|----------|
| Free-text evidence block | Each test gets `evidence: |` with whatever the verifier records. Phase 23 precedent. | ✓ |
| Free text + screenshots | Same plus 12 PNGs per session. Phase 37 precedent. | |
| Minimal | Just `result: pass|fail`; free text only on failures. | |
| Net-tab tests get explicit field | Tests 33-4 + 35-6 get a structured `network_observed:` field. | |

**User's choice:** Free-text evidence block
**Notes:** Phase 23 shape preserved. Lower friction than mandatory schema.

---

### Q5 — For the two no-fetch tests (33-4 Drawer + 35-6 PHI gate), should evidence call out network observation explicitly?

| Option | Description | Selected |
|--------|-------------|----------|
| Yes — mandatory phrase | Evidence MUST include "DevTools Network tab: 0 outbound calls observed on [trigger]". | |
| Implicit — verifier judgment | Trust-based; if verifier says pass they observed it. | ✓ |

**User's choice:** Implicit — verifier judgment
**Notes:** Consistent with the "free text only" decision in Q4.

---

### Q6 — How should Phase 38 flip `33-VERIFICATION.md` and `35-VERIFICATION.md` from `human_needed` → `passed`?

| Option | Description | Selected |
|--------|-------------|----------|
| Append re-verification section | In-place `status: passed` flip + `re_verified:` field + new `## Re-verification (Phase 38, <sha>)` section listing per-test outcomes. | ✓ |
| Top-frontmatter only | Just flip `status` + add `re_verified:` and `re_verified_by:` fields. No new section. | |
| New sibling file | Leave originals untouched; write `33-VERIFICATION-PHASE-38.md` + `35-VERIFICATION-PHASE-38.md`. | |

**User's choice:** Append re-verification section
**Notes:** Phase 23 precedent for `re_verified:`; the appended section adds the cross-phase re-verification context.

---

## Plan decomposition + ordering

### Q7 — How should Phase 38 decompose into plans?

| Option | Description | Selected |
|--------|-------------|----------|
| 3 plans — walk-33 + walk-35 + closure | Plan 38-01 walks 33's 6 tests; Plan 38-02 walks 35's 6 tests; Plan 38-03 closure. | ✓ |
| 2 plans — one walk per source phase | Plan 38-01 (33 walk + verification flip); Plan 38-02 (35 walk + verification flip + SUMMARY). | |
| 1 plan — single walk | All 12 tests in one plan + SUMMARY + verification flips. | |

**User's choice:** 3 plans — walk-33 + walk-35 + closure
**Notes:** Cleanest separation of observational walks vs closure work.

---

### Q8 — Should walks run sequentially or in parallel waves?

| Option | Description | Selected |
|--------|-------------|----------|
| Sequential single browser session | Wave 1: 38-01 then 38-02 in same browser session. Wave 2: 38-03 closure. | ✓ |
| Parallel waves | 38-01 + 38-02 spawn simultaneously; verifier context-switches between them. | |
| Sequential with separate sessions allowed | 38-01 then 38-02; may run in different browser sessions / days. | |

**User's choice:** Sequential single browser session
**Notes:** Single session is what makes per-type counts table valid as bundle fingerprint.

---

### Q9 — Within each walk plan, how should the 6 tests be ordered?

| Option | Description | Selected |
|--------|-------------|----------|
| Numbered order from HUMAN-UAT.md | Tests run 1→2→3→4→5→6 matching file numbering. | ✓ |
| Grouped by route/page | Cluster tests sharing a page; fewer page navigations. | |
| Stop-on-first-fail | Numbered order; on first fail, route to severity handler before continuing. | |

**User's choice:** Numbered order from HUMAN-UAT.md
**Notes:** Predictable resume on interrupt; matches the file's authoritative ordering.

---

## Pre-flight reproducibility

### Q10 — How should Phase 38 capture the "Synthea bundle ID" for reproducibility?

| Option | Description | Selected |
|--------|-------------|----------|
| Per-type counts table | Resource-type counts at session start as data fingerprint. | ✓ |
| Bundle.id field if present, else N/A | Read Bundle.id from upload metadata if available. | |
| Synthea seed/version | Capture generator version + seed instead of Blaze-side identity. | |
| All three | Counts + Bundle.id + Synthea seed. | |

**User's choice:** Per-type counts table
**Notes:** Bundle.id rarely preserved by Blaze `$upload`; counts table is the practical fingerprint.

---

### Q11 — Should each walk plan include a pre-flight checklist?

| Option | Description | Selected |
|--------|-------------|----------|
| Yes — fail-fast checklist | Plan task 0 verifies Blaze + counts + dev server; halts on failure. | ✓ |
| Yes — capture-only | Records counts but doesn't fail on low data. | |
| No — verifier knows the setup | Skip; assume verifier has Blaze + Synthea ready. | |

**User's choice:** Yes — fail-fast checklist
**Notes:** Surfaces setup issues before any test walk consumes a checkpoint.

---

### Q12 — Should the per-type counts table be captured once or twice?

| Option | Description | Selected |
|--------|-------------|----------|
| Once at session start | Plan 38-01 captures; 38-02 + 38-03 reuse. Single source of truth. | ✓ |
| Twice — once per walk | Each walk captures its own counts; SUMMARY shows both with timestamps. | |

**User's choice:** Once at session start
**Notes:** Matches "sequential single browser session" decision; mid-session data drift is unlikely without a deliberate Blaze reset.

---

## Claude's Discretion

- Exact wording of the `## Re-verification (Phase 38, <sha>)` section header
- Whether `38-SESSION.md` exists as a separate artifact or counts table lives only in Plan 38-01 SUMMARY
- Exact markdown shape of Phase 38 SUMMARY (required content fixed; section ordering open)
- Whether to capture a one-time `<blazeUrl>` ping latency / `metadata.software.version` snapshot in pre-flight
- Whether Plan 38-03 closure additionally appends to `STATE.md` Decisions log

## Deferred Ideas

- Per-test screenshot artifacts (Phase 37 pattern not adopted — these tests are behavioral, not visual)
- Headless / scripted regression of the 12 UAT items (Playwright suite for CI — v1.6+ candidate)
- Synthea generator-side reproducibility (seed + version) — backlog
- Mandatory net-tab schema (`network_observed:` structured field) — revisit only if regression slips through
