# Phase 28: Micro-Consistency Sweep - Context

**Gathered:** 2026-04-23
**Status:** Ready for planning
**Source:** Auto-captured via `/gsd-discuss-phase 28 --auto` (recommended defaults locked)

<domain>
## Phase Boundary

Mechanical, low-risk cleanup of casts, dashes, and stale `eslint-disable` pragmas accumulated across v1.0–v1.3. No behavior change — purely consistency/type/lint hygiene. **Success measured by grep counts.**

**Requirements covered:** SWEEP-01, SWEEP-02, SWEEP-03, SWEEP-04

**Confirmed target counts (from live scout):**
- **SWEEP-01:** 23 sites of `as unknown as Record<string, unknown>` (ROADMAP said "13+"; actual is 23 — documented)
- **SWEEP-02:** 2 explicit dash sites mentioned (PlausibilityDrillDown:68, ResourceIssueTable:158) + "any siblings" — planner must grep for `–` and `—` to surface the full set
- **SWEEP-03:** 4 drill-down `eslint-disable-next-line react-hooks/exhaustive-deps` pragmas confirmed present (Plausibility/LabRanges/Duplicates/References drill-downs)
- **SWEEP-04:** Bundled micro-cleanup — ref types (2 sites: CompletenessDrillDown:44, CodingDrillDown:101), QualityLayout legacy-migration essay extraction (Phase 26 handoff — `migrateLegacyResourceTypeKey` already exists at `src/quality/cohorts.ts:9`), and `PatientListPage:70` `useState(() => …)` initializer

**Explicitly NOT in this phase:**
- New features, refactors, or structural changes
- Any behavior-visible change (type-only, dash-only, pragma-only)

**Dependencies:** Phase 25 (drill-down bodies stable) AND Phase 24 (`useAsyncRun` absorbed the auto-start concern). Both complete.

**Effort (ROADMAP):** ~0.5 day.

</domain>

<decisions>
## Implementation Decisions

### SWEEP-01: toRecord helper sweep (23 cast sites)

- **D-01:** Replace every `as unknown as Record<string, unknown>` with `toRecord(x)` where `toRecord` is the existing helper at `src/utils/fhir-helpers.ts:9`. **All 23 sites, not just the "13+" from ROADMAP.** Planner must grep for the exact pattern to get the definitive list.
- **D-02:** Do NOT change the helper's signature. If a call site's input isn't a `Resource` (the helper's current type), check whether a cast is needed; for value paths where the source is plain `unknown`, consider whether `toRecord` needs a generic-widening overload — **but defer that decision to the planner**. For v1.4 scope, only migrate sites whose input already matches the helper's input type. If any site requires a signature change to migrate, flag in plan text and either (a) defer that site with a comment or (b) extend the helper with an overload — planner picks.
- **D-03:** One commit per file OR one grep-driven commit across all 23 sites — planner picks. Preferably one atomic commit for the mechanical replacement since blast radius is zero (pure type-level change).

### SWEEP-02: En-dash vs em-dash unification

- **D-04:** Convention: **em-dash (`—`) for separators**, **en-dash (`–`) for numeric ranges**. This is the idiomatic typography rule; matches existing codebase usage at most sites.
- **D-05:** Planner must grep for all `–` (U+2013 en-dash) and `—` (U+2014 em-dash) occurrences in `src/` to produce the complete fix list. Start with the 2 known sites (PlausibilityDrillDown:68, ResourceIssueTable:158); likely siblings exist in other drill-downs and panels.
- **D-06:** No visual regression tests required — dash glyph changes don't affect layout enough to matter. `npx tsc -b --noEmit` + existing UI snapshots suffice.

### SWEEP-03: Drop 4 drill-down eslint-disables

- **D-07:** Remove `eslint-disable-next-line react-hooks/exhaustive-deps` at:
  - `src/components/quality/PlausibilityDrillDown.tsx` — current line 52 approx (plan may have shifted lines post-Phase-25-03; grep exact line before editing)
  - `src/components/quality/LabRangesDrillDown.tsx` — current line 50 approx
  - `src/components/quality/DuplicatesDrillDown.tsx` — current line 49 approx
  - `src/components/quality/ReferencesDrillDown.tsx` — current line 49 approx
- **D-08:** These disables were for auto-start effects that `useAsyncRun` (Phase 24) + Bug B fix (Phase 23) absorbed. The effect deps are now clean. Verify via `npx eslint src/components/quality/<file>.tsx` post-removal — should pass without the disable.
- **D-09:** If removing any disable triggers an eslint error, the Phase 24/23/25 absorption didn't land that site cleanly. Investigate root cause; do NOT re-add the disable. This is the "no new disables introduced" acceptance.

### SWEEP-04: Micro-cleanup bundle

- **D-10 (ref types):** `src/components/quality/CompletenessDrillDown.tsx:44` and `src/components/quality/CodingDrillDown.tsx:101` currently type Back-button refs as `HTMLAnchorElement`. Change to `HTMLButtonElement` (matches actual rendered element). Grep-check with `git diff` pre/post.
- **D-11 (QualityLayout essay extraction):** `QualityLayout.tsx` has an inline `useEffect` with a multi-line legacy-migration "essay" (comment + inlined logic from Phase 26). Move the body into the existing `migrateLegacyResourceTypeKey()` function at `src/quality/cohorts.ts:9` so `QualityLayout` just calls it. This removes the Phase 26 soft-miss on ≤30 LOC — target QualityLayout ≤35 LOC post-extraction.
- **D-12 (PatientListPage initializer):** `src/components/patients/PatientListPage.tsx:70` has an inline `useState(…)` with an `eslint-disable-line` for an initial snapshot pattern. Change to `useState(() => …)` (lazy initializer) which is the canonical fix per React docs. Remove the disable comment.

### Plan batching — Claude's Discretion (recommended)

- **D-13:** 2 plans recommended:
  - **Plan 28-01** (Wave 1): SWEEP-01 + SWEEP-02 bundle — pure grep-driven sweeps. 23 cast sites + dash unification.
  - **Plan 28-02** (Wave 1, parallel — different files): SWEEP-03 + SWEEP-04 bundle — drill-down disables, ref types, QualityLayout essay, PatientListPage initializer.
  Planner may merge to 1 plan if all 4 sweeps are truly mechanical. 3 plans feels over-segmented for ~0.5 day work.

### Claude's Discretion (blanket)

- Whether to run `npx eslint --fix` pass after SWEEP-03 to auto-clean any residual warnings
- Commit granularity (per-SWEEP vs per-file)
- Whether to fold SWEEP-02 dash grep into SWEEP-01's commit (both are text-replace sweeps) — probably no (separate concerns)
- Whether `toRecord` needs a generic-widening overload to handle non-Resource inputs

### Folded Todos

None — no backlog items scoped to Phase 28.

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Phase-level spec
- `.planning/ROADMAP.md` §"Phase 28: Micro-Consistency Sweep" — goal, success criteria
- `.planning/REQUIREMENTS.md` §"Phase 28" — SWEEP-01..04 acceptance text

### Dependency context
- `.planning/phases/24-data-fetching-foundation/24-04-SUMMARY.md` — `useAsyncRun` absorbed the auto-start concern (SWEEP-03 justification)
- `.planning/phases/25-quality-module-dedup/25-03-SUMMARY.md` — drill-down bodies stable (SWEEP-03 prerequisite)
- `.planning/phases/26-app-shell-dedup/26-01-SUMMARY.md` — QualityLayout soft-miss on ≤30 LOC (SWEEP-04 handoff target)

### Helper to reuse
- `src/utils/fhir-helpers.ts:9` — `toRecord(resource: Resource): Record<string, unknown>` — THE canonical helper for SWEEP-01

### Existing migrate function (extend in SWEEP-04)
- `src/quality/cohorts.ts:9` — `migrateLegacyResourceTypeKey()` — where the QualityLayout essay moves

### Target files (confirmed via scout)
- **SWEEP-01 (23 sites):** `grep -rn "as unknown as Record<string, unknown>" src/ --include="*.ts*"` — planner runs this to enumerate
- **SWEEP-02:** PlausibilityDrillDown.tsx:68, ResourceIssueTable.tsx:158 + any siblings (grep)
- **SWEEP-03:** PlausibilityDrillDown.tsx:~52, LabRangesDrillDown.tsx:~50, DuplicatesDrillDown.tsx:~49, ReferencesDrillDown.tsx:~49
- **SWEEP-04:** CompletenessDrillDown.tsx:44, CodingDrillDown.tsx:101, QualityLayout.tsx (inline essay), PatientListPage.tsx:70

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- **`toRecord(resource: Resource)`** (src/utils/fhir-helpers.ts:9) — the target helper for SWEEP-01; no new code needed
- **`migrateLegacyResourceTypeKey()`** (src/quality/cohorts.ts:9) — already exists; just needs the essay body from QualityLayout moved into it

### Established Patterns
- **Grep-driven sweeps** (from Phase 25 RunProgress migration, Phase 26 Anchor+Link) — one commit per sweep, mechanical replacements, verify with post-sweep grep count = 0
- **Pre-existing-failures baseline** — 22 failed tests pinned; any new failure = regression
- **TDD is optional for pure text-level changes** — SWEEP-01/02/04 don't need RED-first tests; SWEEP-03 disable-removal may reveal lint issues that do

### Integration Points
- **23 cast sites** spread across src/ — planner to enumerate via grep
- **4 drill-down files** (Plausibility, LabRanges, Duplicates, References) for SWEEP-03
- **2 drill-down files** (Completeness, Coding) for SWEEP-04 ref types
- **QualityLayout.tsx + cohorts.ts** for SWEEP-04 essay extraction
- **PatientListPage.tsx** for SWEEP-04 initializer fix

### Test Baseline (post-Phase 27)
- 22 pre-existing failures, 814 passing
- No new test files expected — this is a type/style sweep
- `npx tsc -b --noEmit` + `npx eslint src/` are the primary verification gates

</code_context>

<specifics>
## Specific Ideas

- **`toRecord` overload decision:** If SWEEP-01 encounters a cast site where the source isn't `Resource` (e.g., a parsed JSON value typed as `unknown`), planner should EITHER extend the helper with a generic overload `function toRecord<T>(value: T): Record<string, unknown>` (safer, single callsite change) OR leave those specific sites with a comment noting the type mismatch. Defer to planner's best judgment.
- **Dash grep command:** `grep -Prn '[\x{2013}\x{2014}]' src/ --include="*.ts*" --include="*.md"` — enumerates both en-dash and em-dash. Apply unification rule based on surrounding context (range vs separator).
- **eslint-disable removal verification:** run `npx eslint src/components/quality/PlausibilityDrillDown.tsx` (and siblings) after each removal; expect zero violations. If violations surface, the effect deps still have a gap — investigate don't re-add.

</specifics>

<deferred>
## Deferred Ideas

- **Non-Resource `toRecord` overload** — decide in SWEEP-01 plan, not here
- **Dash style for .md planning documents** — ROADMAP and REQUIREMENTS have plenty of dashes; SWEEP-02 scope is src/ only unless planner decides to extend
- **Global eslint-disable audit** — SWEEP-03 is scoped to the 4 drill-down auto-start sites; other disables stay (may be valid)

### Reviewed Todos (not folded)

None.

</deferred>

---

*Phase: 28-micro-consistency-sweep*
*Context gathered: 2026-04-23 via --auto (recommended defaults locked)*
