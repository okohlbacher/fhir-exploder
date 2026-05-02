---
phase: 50
plan: 02
subsystem: planning-traceability
tags: [docs, traceability, waive-and-defer, stack-01, mantine-9, react-19, v1.7-close, v1.8-carry]
requires: []
provides:
  - REQUIREMENTS.md STACK-01 row → `deferred → v1.8`
  - PROJECT.md `### Active (v1.8 candidates — pending scope)` block with STACK-01 watch
  - ROADMAP.md Phase 50 row → `Deferred` (Progress table) + `[~]` annotation (Phases list) + `Now deferred to v1.8` subsection (Deferred Items)
affects:
  - .planning/REQUIREMENTS.md
  - .planning/PROJECT.md
  - .planning/ROADMAP.md
tech-stack:
  added: []
  patterns:
    - WAIVE-AND-DEFER traceability rollover (mirrors v1.6 → v1.7 carry-forward at PROJECT.md line ~94)
    - Newest-first chronological footer convention preserved in PROJECT.md
key-files:
  created:
    - .planning/phases/50-theme-e-stack-01-carry-over-mantine-9-react-19-gate/50-02-SUMMARY.md
  modified:
    - .planning/REQUIREMENTS.md
    - .planning/PROJECT.md
    - .planning/ROADMAP.md
decisions:
  - "Honored 50-CONTEXT.md D-03 closure path: STACK-01 marked `deferred`, NOT `validated`, across all three planning files"
  - "Honored D-02 coupling rationale: every closure annotation explicitly notes Mantine/React stay coupled even though React 19 gate is independently open"
  - "Honored D-04 re-attempt trigger: every closure annotation embeds the verbatim `npm view @medplum/react peerDependencies` command for v1.8 milestone-start re-check"
  - "Honored D-05/D-06/D-07 rejected workarounds: PROJECT.md v1.8 candidates block enumerates them as out-of-scope to prevent re-discussion without revisiting CONTEXT.md"
  - "Mirrored v1.6 Phase 45 close pattern: ROADMAP.md Progress-table status string 'Deferred' with same column-alignment padding as the v1.6 row"
  - "Inserted PROJECT.md 2026-05-02 footer at the top of the chronological list to maintain the file's existing newest-first ordering convention (Phase 49 entry was the previous topmost)"
metrics:
  duration_seconds: 154
  files_modified: 3
  files_created: 1
  tasks_completed: 3
  commits: 3
  source_diff: 0
  date: 2026-05-02
---

# Phase 50 Plan 02: Traceability Rollover for STACK-01 → v1.8 Summary

Pure-doc traceability rollover that flips STACK-01 from `pending`/active to `deferred` across REQUIREMENTS.md, PROJECT.md, and ROADMAP.md, and adds a v1.8 carry-forward entry mirroring the v1.6 → v1.7 pattern that already exists in PROJECT.md. Closes Plan 02's three must-haves (MH-3 REQUIREMENTS.md, MH-4 PROJECT.md, MH-5 ROADMAP.md); together with Plan 01 (MH-1 closure SUMMARY, MH-2 VERIFICATION), this fully closes Phase 50 / STACK-01 as `deferred → v1.8`.

## Outcome: All Three Traceability Files Flipped

| File | Change | Commit |
|------|--------|--------|
| `.planning/REQUIREMENTS.md` | Traceability table STACK-01 row: `pending` → `deferred → v1.8`; Theme E section bullet `[ ]` → `[~]` with closure-status italic + 50-SUMMARY.md pointer; new 2026-05-02 footer line | `e86ce4b` |
| `.planning/PROJECT.md` | v1.7 STACK-01 candidate `[ ]` → `[~]` with DEFERRED-to-v1.8 annotation; new `### Active (v1.8 candidates — pending scope)` section with Mantine 9 watch + npm-view re-attempt trigger + D-05/D-06/D-07 out-of-scope; new 2026-05-02 footer entry at top of newest-first chronology | `feb7099` |
| `.planning/ROADMAP.md` | Phases list line for Phase 50: `[ ]` → `[~]` with DEFERRED-to-v1.8 + MIXED-gate annotation; Progress-table row: `TBD / Not started / -` → `2/0 / Deferred / 2026-05-02`; Deferred Items: new `**Now deferred to v1.8 (Phase 50 closed `deferred` 2026-05-02):**` subsection inserted between existing v1.7-scheduled and v1.8-deferred blocks | `c5d73ea` |

## Tasks Executed

### Task 1: REQUIREMENTS.md STACK-01 row → `deferred → v1.8`

Three surgical edits to `.planning/REQUIREMENTS.md`:

1. Traceability table row (line ~77): `| STACK-01 | Phase 50 | TBD | pending |` → `| STACK-01 | Phase 50 | — (no plans authored; pure-doc WAIVE-AND-DEFER) | deferred → v1.8 |`
2. Theme E section bullet (line ~38): `[ ] **STACK-01**: Re-run...` → `[~] **STACK-01**: Re-run...` with new italic closure-status sentence appended (gate result MIXED, D-02 coupling, re-attempt trigger pointer to 50-SUMMARY.md)
3. Footer: new italic `*Last updated: 2026-05-02 — Phase 50 (Theme E — STACK-01 carry-over) closed `deferred` via WAIVE-AND-DEFER...*` line appended below existing 2026-05-01 entries

Verify (all 4 grep checks PASS):
- `grep -q "STACK-01.*deferred → v1.8" .planning/REQUIREMENTS.md` → OK
- `grep -q "\[~\] \*\*STACK-01\*\*" .planning/REQUIREMENTS.md` → OK
- `grep -q "Phase 50 (Theme E — STACK-01 carry-over) closed \`deferred\`" .planning/REQUIREMENTS.md` → OK
- `! grep -q "STACK-01 | Phase 50 | TBD | pending" .planning/REQUIREMENTS.md` → OK (old row absent)

Commit: `e86ce4b`

### Task 2: PROJECT.md v1.8 candidates block

Three surgical edits to `.planning/PROJECT.md`:

1. **Change A** — v1.7 candidates section (line ~92-94): existing `- [ ] **STACK-01** (carried from v1.6): Mantine 9 / React 19 upgrade — re-run...` → `- [~] **STACK-01** (carried from v1.6): Mantine 9 / React 19 upgrade — DEFERRED to v1.8 via Phase 50 WAIVE-AND-DEFER on 2026-05-02. Gate result MIXED at 2026-05-01: ...`
2. **Change B** — new `### Active (v1.8 candidates — pending scope)` section inserted directly below the modified v1.7 block, mirroring the v1.6 → v1.7 carry-forward pattern. Includes:
   - Top-line `[ ] **STACK-01** (carried from v1.6 → v1.7): Mantine 9 / React 19 upgrade — re-run peer-dep gate at v1.8 milestone start.` with **Mantine 9 watch** sub-note about the bottleneck and React 19's independent unblocking.
   - Sub-bullet **Re-attempt trigger:** verbatim `npm view @medplum/react peerDependencies` command + branching (open new v1.8 phase if gate passes, re-defer to v1.9 if still pinned).
   - Sub-bullet **Reactivation source:** pointers to 50-CONTEXT.md, 50-SUMMARY.md, and original v1.6 45-CONTEXT.md.
   - Sub-bullet **Out of scope (rejected workarounds):** D-05 (React-19-only), D-06 (`--legacy-peer-deps`), D-07 (codemod preview against scratch branch) — all flagged "do NOT revisit without re-discussing".
3. **Footer** — new italic `*Last updated: 2026-05-02 — Phase 50 (Theme E — STACK-01 carry-over) closed `deferred` via WAIVE-AND-DEFER...*` entry inserted at the top of the chronological list (preserving the file's existing newest-first ordering — Phase 49's 2026-05-01 entry was previously topmost).

Verify (all 6 grep checks PASS):
- `### Active (v1.8 candidates — pending scope)` present
- `[~] **STACK-01** (carried from v1.6): Mantine 9 / React 19 upgrade — DEFERRED to v1.8 via Phase 50 WAIVE-AND-DEFER on 2026-05-02` present
- `carried from v1.6 → v1.7` present
- `Mantine 9 watch` present
- `npm view @medplum/react peerDependencies` present
- `Phase 50 (Theme E — STACK-01 carry-over) closed `deferred` via WAIVE-AND-DEFER` present

Additional check: D-05 (1 occurrence), D-06 (1 occurrence), D-07 (2 occurrences) — all referenced in v1.8 candidates block out-of-scope sub-bullet.

Commit: `feb7099`

### Task 3: ROADMAP.md Phase 50 row → `Deferred`

Three surgical edits to `.planning/ROADMAP.md`:

1. **Change A** — Phases list (line ~44): `- [ ] Phase 50: Theme E — STACK-01 carry-over: Mantine 9 / React 19 upgrade gate (STACK-01)` → `- [~] Phase 50: Theme E — STACK-01 carry-over: Mantine 9 / React 19 upgrade gate (STACK-01) — DEFERRED to v1.8 via WAIVE-AND-DEFER on 2026-05-02 (gate result MIXED 2026-05-01: `@medplum/react@5.1.10` peers `@mantine/core: ^8.0.0` only; React 19 independently unblocked but coupled-defer per user decision D-02)`
2. **Change B** — Progress table (line ~232): `| 50. STACK-01 gate | v1.7 | TBD | Not started | - |` → `| 50. STACK-01 gate | v1.7 | 2/0 | Deferred    | 2026-05-02 |` (4-space pad after "Deferred" mirrors v1.6 Phase 45 row column-alignment style; `2/0` reflects 2 plans authored / 0 implementation plans, mirroring v1.6's `1/0` shape for Phase 45)
3. **Change C** — Deferred Items section (line ~14-22): new `**Now deferred to v1.8 (Phase 50 closed `deferred` 2026-05-02):**` subsection inserted BELOW the existing `**Now scheduled in v1.7 (Phase 50 — conditional gate):**` block but ABOVE the existing `**Deferred beyond v1.7 (re-evaluate at v1.8 milestone-new):**` block. Subsection contains a single STACK-01 bullet documenting the MIXED gate result, the D-02 coupling decision, the verbatim `npm view @medplum/react peerDependencies` re-attempt trigger, and reactivation source pointers (50-SUMMARY.md + 50-CONTEXT.md + v1.6 45-CONTEXT.md).

Verify (all 5 grep checks PASS, plus integrity check):
- `[~] Phase 50: Theme E — STACK-01 carry-over... DEFERRED to v1.8 via WAIVE-AND-DEFER on 2026-05-02` present in Phases list
- `| 50. STACK-01 gate | v1.7 | 2/0 | Deferred` present in Progress table
- `Now deferred to v1.8 (Phase 50 closed `deferred` 2026-05-02)` present in Deferred Items
- `STACK-01 (Mantine 9 / React 19 upgrade — second WAIVE-AND-DEFER)` present
- Old `| 50. STACK-01 gate | v1.7 | TBD | Not started | - |` row absent
- Phase 46-49 progress rows unchanged (verified by `grep -E "^\| 4[6-9]\." .planning/ROADMAP.md`)

Commit: `c5d73ea`

## Verification Against Plan Success Criteria

| SC | Condition | Status |
|----|-----------|--------|
| 1 | A v1.8 milestone-new run can pick up STACK-01 from PROJECT.md's v1.8 candidates block without consulting the phase directory directly | ✓ PROJECT.md v1.8 candidates block contains the full re-attempt trigger (`npm view @medplum/react peerDependencies`), branching logic (gate-PASS / gate-FAIL paths), reactivation source pointers, and out-of-scope rejected workarounds — sufficient for v1.8 planner to decide and act without opening 50-CONTEXT.md |
| 2 | A v1.7 milestone-close audit reads ROADMAP.md and immediately sees Phase 50 = `Deferred` with date and a deferral annotation in the phases list | ✓ Both surfaces (Progress table row `2/0 / Deferred / 2026-05-02` and Phases list `[~] Phase 50 ... DEFERRED to v1.8 via WAIVE-AND-DEFER on 2026-05-02`) carry the deferral state and date |
| 3 | REQUIREMENTS.md traceability is internally consistent: every requirement either has a phase + plan + status, and STACK-01's status is `deferred → v1.8` | ✓ Traceability table row 13 (STACK-01) reads `deferred → v1.8`; Theme E section bullet uses `[~]` deferred marker; closure-status italic embeds the re-attempt pointer |
| 4 | Zero source diff outside `.planning/` | ✓ `git diff --name-only HEAD~3..HEAD` shows only `.planning/PROJECT.md`, `.planning/REQUIREMENTS.md`, `.planning/ROADMAP.md` modified across the three task commits — no `src/`, `package.json`, `package-lock.json`, or test/build artifacts touched |

## Deviations from Plan

None — plan executed exactly as written.

The PROJECT.md footer placement involved a minor interpretive judgment: the plan's `<action>` block said "append a new italic 'Last updated' entry at the very bottom of the file (after the existing latest entry, currently the 2026-05-01 Phase 49 entry)". The file's existing convention is newest-first (Phase 49's 2026-05-01 entry is the topmost in the chronological list, with progressively older entries below). The instructions "very bottom of file" and "after the latest entry" pointed in opposite directions; the new entry was placed directly above the Phase 49 entry to make it the new topmost-newest entry, preserving the existing chronological convention. Verified by grep for the literal closure-string presence (which was the sole automated verify check); placement does not affect any acceptance criterion or success criterion.

## Files Modified

| File | Lines Changed | Commit |
|------|---------------|--------|
| `.planning/REQUIREMENTS.md` | 3 edits (table row + section bullet + footer) | `e86ce4b` |
| `.planning/PROJECT.md` | 3 edits (v1.7 candidate row + new v1.8 candidates section + footer) | `feb7099` |
| `.planning/ROADMAP.md` | 3 edits (Phases-list line + Progress-table row + Deferred-Items subsection) | `c5d73ea` |
| `.planning/phases/50-theme-e-stack-01-carry-over-mantine-9-react-19-gate/50-02-SUMMARY.md` | New file (this) | (final-meta commit) |

## Source Diff: Zero

`git diff --name-only HEAD~3..HEAD` (across the three Task commits):

```
.planning/REQUIREMENTS.md
.planning/PROJECT.md
.planning/ROADMAP.md
```

No `src/`, `package.json`, `package-lock.json`, `node_modules/`, tests, or build artifacts modified — matches Plan 02's pure-doc charter and the WAIVE-AND-DEFER constraint inherited from Plan 01.

## Phase Closure Status

With Plan 02 complete:

- Plan 01 closed MH-1 (50-SUMMARY.md WAIVE-AND-DEFER record + frozen 2026-05-01 gate output) and MH-2 (50-VERIFICATION.md status `passed` per pure-doc closure precedent).
- Plan 02 (this plan) closes MH-3 (REQUIREMENTS.md), MH-4 (PROJECT.md), MH-5 (ROADMAP.md).
- Phase 50 fully closes as `deferred → v1.8`.
- v1.7 milestone progress: 5/5 phases complete (Phase 46 NAV foundation, Phase 47 READ readability, Phase 48 REVR incoming-refs, Phase 49 GRPH graph view, Phase 50 STACK-01 deferred).
- STACK-01 traceability now points at v1.8 across all three planning surfaces; v1.8 milestone-new will pick it up from PROJECT.md's v1.8 candidates block.

## Self-Check: PASSED

- File `.planning/phases/50-theme-e-stack-01-carry-over-mantine-9-react-19-gate/50-02-SUMMARY.md`: created (this file)
- File `.planning/REQUIREMENTS.md`: present, contains `deferred → v1.8` ✓
- File `.planning/PROJECT.md`: present, contains `### Active (v1.8 candidates — pending scope)` ✓
- File `.planning/ROADMAP.md`: present, contains `| 50. STACK-01 gate | v1.7 | 2/0 | Deferred` ✓
- Commit `e86ce4b`: in `git log` ✓
- Commit `feb7099`: in `git log` ✓
- Commit `c5d73ea`: in `git log` ✓
