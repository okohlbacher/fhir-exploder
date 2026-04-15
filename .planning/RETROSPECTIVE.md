# Project Retrospective

*A living document updated after each milestone. Lessons feed forward into future planning.*

## Milestone: v1.2 — Tech Debt & Quality Monitoring

**Shipped:** 2026-04-15
**Phases:** 7 (14-20) | **Plans:** 22 | **Timeline:** 2026-04-13 → 2026-04-14 (2 calendar days)

### What Was Built

- **Tech debt foundation (Phase 14):** zero TypeScript errors, shared `fhir-helpers.ts` with `toRecord()` + `getCodeDisplay()` helpers, 17 deferred code review findings from v1.0 resolved
- **Drill-down pattern (Phase 15):** `NormalizedIssue` type + shared `ResourceIssueTable` primitive reused by every downstream quality engine
- **Four new quality engines (Phases 16-17):** value set conformance, cardinality, temporal plausibility, lab ranges, duplicate detection (patient + content hash), reference integrity (broken + orphan)
- **Alerting layer (Phase 18):** three-state threshold overrides persisted in localStorage, breach-aware `SummaryCard` primitive, 9-tile `OverviewStrip` with `?tab=` deep-linking
- **Trends + PDF (Phase 19):** 7-mini-chart small-multiples with per-point breach coloring (D-11: historical thresholds preserved), off-screen portal + html-to-image + jsPDF pipeline
- **Milestone gap closure (Phase 20):** retrospective VERIFICATION.md authoring pattern for phases that shipped functional code before the goal-backward verification step was standardized

### What Worked

- **Drill-down-first foundation.** Phase 15 was intentionally foundational — every later DQ phase landed faster because `ResourceIssueTable` + `NormalizedIssue` were already in place. Two-week's worth of UI work collapsed into hook wiring.
- **Pure-function engines + state-machine hooks split.** Phase 17's five pure modules + two hooks pattern made engines testable in isolation (62 green unit tests) before any UI existed. Replicated in Phases 18 + 19.
- **Retrospective verification as a recovery mechanism.** When the v1.2 audit surfaced missing VERIFICATION.md files for phases whose code already satisfied their requirements, Phase 20 authored them retrospectively against existing VALIDATION.md + UAT.md + live code — no re-execution needed. Cheaper than re-running the phase; legitimizes the gap-closure pattern for future milestones.
- **Cast-widening pattern for strict-mode walkers.** `(x as unknown as Record<string, unknown>)` is now the sanctioned pattern for walker parameters typed as `unknown`. Single-cast is rejected by strict TypeScript.

### What Was Inefficient

- **Phase 16 introduced TS2352 errors that Phase 14 had just eliminated.** Root cause: walker implementations used the single-cast pattern while `fhir-helpers.ts` was only applied to components. Fix took Phase 20 to surface — would have been caught by running `tsc -b --noEmit` in CI at each phase.
- **Audit gap for Phases 15 and 18 VERIFICATION.md.** Both phases had VALIDATION.md + UAT.md but no goal-backward VERIFICATION.md. Cost was one extra phase (20) to author retrospectively. Future milestones should fail a phase that ships without VERIFICATION.md rather than catching it at milestone-audit time.
- **REQUIREMENTS.md traceability drift.** Checkboxes stayed unchecked across 5 phases despite completion; flipped all at once in Phase 20-03. Cheaper to flip them at each phase transition.

### Patterns Established

- **`NormalizedIssue` as unifying quality finding shape.** All quality engines now emit this type; all drill-down pages consume it. Keeps new checks drop-in.
- **Pure engine + state-machine hook per quality check.** Standardized across 6 engines (completeness, coding, validation, conformance, plausibility, duplicates/references).
- **Three-state threshold override.** `enabled | disabled | default` (not just enabled/disabled) because "silence this metric" is a distinct user intent from "never alert".
- **Historical breach-coloring (D-11).** Changing a threshold does NOT rewrite past snapshot breach states — preserves provenance.
- **Off-screen 816×1056 React portal + font-readiness gate + 2× rAF + html-to-image + jsPDF multi-page** for deterministic PDF export independent of viewport.
- **Retrospective VERIFICATION.md authoring** as a legitimate gap-closure mechanism when code satisfies requirements but formal verification was skipped.

### Key Lessons

1. **Run `tsc -b --noEmit` as a build gate at every phase transition.** Phase 16 silently re-introduced errors Phase 14 fixed. A per-phase build check would have surfaced this in minutes instead of a milestone-audit phase later.
2. **Fail phases missing VERIFICATION.md before milestone-audit stage.** The `/gsd-transition` or `/gsd-verify-work` step should require goal-backward VERIFICATION.md; VALIDATION.md + UAT.md are not substitutes.
3. **Sync REQUIREMENTS.md traceability checkboxes per phase, not per milestone.** Checkbox drift across 5 phases is a smell that the phase completion hook isn't touching REQUIREMENTS.md. Either automate or make it a required artifact.
4. **Drill-down primitive first, panels after.** Investing Phase 15 in a shared `NormalizedIssue` + `ResourceIssueTable` paid off across 4 subsequent phases. Build the primitive before the five features that need it.
5. **Pure-function engines + state-machine hooks is the right split** for anything that does real computation. Engines testable without React; hooks manage async/loading/error.

### Cost Observations

- **Pace:** 7 phases + 22 plans shipped across 2 calendar days (extremely fast, post-gap-closure phase was 1 day of work).
- **Bundle growth:** +35,490 insertions / 378 deletions across 216 files. +@mantine/charts and jspdf added (justified v1.0's "no charts library" constraint being lifted).
- **Gap-closure overhead:** Phase 20 (3 plans) was pure cleanup — TS2352 fix + two retrospective VERIFICATION.md files + REQUIREMENTS.md sync. ~20% of milestone phase count was recovery work.

---

## Cross-Milestone Trends

### Process Evolution

| Milestone | Phases | Plans | Key Change |
|-----------|--------|-------|------------|
| v1.0 | 8 (incl. 3 gap-closure) | — | Initial MVP; Nyquist compliance verified; first milestone audit |
| v1.1 | — | — | Dev feedback loop + 8 user-feedback UI improvements |
| v1.2 | 7 (incl. 1 gap-closure) | 22 | First full DQ stack; `NormalizedIssue` pattern; retrospective VERIFICATION.md recovery mechanism |

### Cumulative Quality

| Milestone | src LOC (approx) | Build Status | Notable |
|-----------|------------------|--------------|---------|
| v1.0 | — | ✓ Clean | 286 tests; 5/5 Nyquist compliant |
| v1.1 | — | ✓ Clean | User-feedback-driven improvements |
| v1.2 | ~28,400 | ✓ Clean (`tsc -b` + `npm run build` exit 0) | 9-tab quality dashboard; 16/16 requirements satisfied |

### Top Lessons (Verified Across Milestones)

1. **Gap-closure phases are the norm, not the exception.** v1.0 had 3, v1.2 had 1. Budget a dedicated gap-closure phase per milestone rather than treating milestone audits as a rejection.
2. **Shared primitives pay compound interest.** v1.0 shipped MII module tabs as a shared pattern; v1.2 built `NormalizedIssue` + `ResourceIssueTable`. Both unlocked downstream phases to ship faster.
3. **Build hygiene must be a per-phase gate.** v1.0 deferred 17 code review findings (fixed in v1.2 Phase 14); v1.2 Phase 16 re-introduced TS errors Phase 14 just fixed (caught in v1.2 Phase 20). Each milestone has eventually paid for skipped build gates.
