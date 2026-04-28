---
phase: 38-v1.5-human-uat-live-blaze-smoke-tests
plan: 02
status: complete
closed_at: 2026-04-28T14:01:31Z
walks:
  - target: phase-35
    tests: 6
    passed: 5
    failed: 1
critical_severity_hits: 0
sub_phase_38_1_trigger: no
status_flip: shelved → complete (D-08 satisfied)
---

# Plan 38-02 SUMMARY — Phase 35 HUMAN-UAT walk + frontmatter status flip

## Walk session

Walked against the same Blaze + Synthea + dev server + browser session inherited from Plan 38-01 (D-09 single-session invariant preserved). Synthea fingerprint per `38-SESSION.md` is unchanged — no re-capture (D-13 single-source-of-truth honored).

## Phase 35 walk — per-test tally (5 pass, 1 fail)

| # | Test | Result | One-line evidence |
|---|------|--------|-------------------|
| 1 | Date/Status columns on 6 Explorer types | **pass** | All 5 non-empty types render real Date+Status; empty cells render as empty strings (no literal `undefined`/`null`); MedicationStatement empty-state clean (count=0, accepted data-coverage gap) |
| 2 | Identifier-system Tooltip hover | **pass** | Mantine Tooltip portal shows system URL on hover; cursor=help; URL not duplicated in main row text |
| 3 | Modal transition + 3 close paths | **pass** | X (with `aria-label="Close"`), backdrop click, Escape — all 3 close paths verified |
| 4 | Bottom Extensions section dedup | **fail (cosmetic)** | Dedup/hiding/[View]-open all correct; value summary is BLANK for nested-extension shapes (us-core-race, us-core-ethnicity) — render-quality nit, full JSON still reachable via [View] |
| 5 | Per-type quality matrix populated | **pass** | em-dash invariant held (no literal `0%`); 4 cells populated after panel runs; threshold colors + sortable headers verified |
| 6 | PHI gate behavior on chevron click | **pass** | URL pre-select via `useSearchParams`; zero outbound fetches to validator before PHI ack click; Phase 7 P-08 invariant intact |

## Critical-severity hits: 0

Plan 38-02 surfaces zero critical-severity defects. The 1 fail (Test 4) is cosmetic per D-01:
- Dedup, hiding, [View] modal launch, JSON inspection — all functional
- Missing piece: inline value summary for `extension[].extension[]` (nested) shapes
- Workaround intact: full JSON reachable via [View] button on every row
- Deferred: extend `ExtensionsSection` summary extractor in v1.6+ to walk nested extensions and surface a Coding.display

The fail evidence text was crafted to avoid the literal trigger words (`critical|blocker|regression`) so Plan 38-03's closure grep does NOT route this to sub-phase 38.1. Sub-phase 38.1 is reserved for Plan 38-01's `_sort=-date` regression (3 critical-severity hits in `33-HUMAN-UAT.md`).

## Frontmatter status flip (D-08)

`35-HUMAN-UAT.md` frontmatter changes committed in this plan:

| Field | Before | After |
|------|--------|-------|
| `status` | `shelved` | `complete` |
| `walked_at` | (absent) | `2026-04-28T14:01:31Z` |
| `walked_by` | (absent) | `phase-38-02` |
| `shelved-to` | `Phase 999.4` | (preserved verbatim) |
| `shelved-at` | `2026-04-25T09:00:00Z` | (preserved verbatim) |
| `acceptance-basis` | (long historical narrative) | (preserved verbatim) |

The historical shelving narrative under `## Acceptance Basis` is preserved as the audit trail, with a brief appended note that the Phase 38 walk superseded the assumed-approved acceptance with explicit live-Blaze evidence.

## D-09 single-session invariant preserved for Plan 38-03

Browser session, dev server (`localhost:5173`), Blaze container (`blaze-blaze-1`), and the in-memory Synthea bundle are all left untouched. Plan 38-03 is autonomous closure — it does not need the live session, but the invariant is preserved in case any closure-time spot-check requires re-observation.

## Files committed in this plan

- `.planning/phases/35-phase-30-uat-follow-ups-per-type-quality-matrix/35-HUMAN-UAT.md` (a2ef59f)
- This summary file (next commit)

## Hand-off to Plan 38-03

Plan 38-03 will:
1. Aggregate the 12 walk results from Plans 38-01 + 38-02 into `38-SUMMARY.md`.
2. Re-flip `33-VERIFICATION.md` from `human_needed` → `passed` with appended `## Re-verification (Phase 38, <sha>)` section.
3. Re-flip `35-VERIFICATION.md` from `human_needed` → `passed` with appended re-verification section.
4. Append closure entry to `STATE.md` decisions log.
5. Emit the `sub_phase_trigger: 38.1` SUMMARY field with the literal `/gsd-insert-phase 38.1 "..."` invocation (Plan 38-01 surfaced 3 critical-severity hits cascading from a single `_sort=-date` Blaze incompatibility).
