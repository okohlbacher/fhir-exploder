# Project Retrospective

*A living document updated after each milestone. Lessons feed forward into future planning.*

## Milestone: v1.3 — Cohort Definition & Storage

**Shipped:** 2026-04-16
**Phases:** 2 (21-22) | **Plans:** 9 | **Timeline:** 2026-04-15 → 2026-04-16 (2 calendar days)

### What Was Built

- **Interactive cohort builder (Phase 21):** `/quality/cohorts` page with date-range + condition-code + reference-list criteria, localStorage persistence, hydration-gated `useCohorts` hook, 10K-patient cap with truncation Alert
- **Dashboard cohort scoping (Phase 21):** `resolveCohort` AND-intersects criterion sets with `cohort.id + updatedAt` cache key (D-10); `ActiveCohortSelect` threads `patientIds` into all 7 quality panels; `sampleResources` GET/POST cutover at 40 IDs
- **Cohort/Resource-types rename (Phase 21):** `CohortSelector` → `ResourceTypeSelector`, legacy localStorage key migration in `QualityLayout` mount effect, `migrateSnapshot` rewrites historic trend snapshots, PDF layout surfaces both lines
- **FHIRPath programmatic cohorts (Phase 22):** AST-to-FHIR-search-URL translator via Medplum `parseFhirPath`, 6 comparison operators, URLSearchParams-only (no string concat), `dryRunCount` validation with `_summary=count`, `FhirpathCriterion` 4th variant on discriminated union with `assertNever` tail
- **MII FDPG import/export (Phase 22):** Bidirectional codec targeting SQ v3 schema, 1 MB file-size cap, prototype-pollution defence (field-by-field parse, no `Object.assign`), FileButton Import + per-row Menu Export, tooltip on fhirpath-cohort Export-disabled state
- **Cohort CRUD (Phase 22):** `updateCohort`/`deleteCohort`/`duplicateCohort` on `useCohorts`, `EditCohortModal` (size-lg with D-10 recompute warning), `DeleteCohortModal` (size-sm red-button confirm), per-row three-dot Menu

### What Worked

- **Worktree isolation for parallel waves.** Phase 22's Wave 1 ran 22-01 and 22-02 in disjoint worktrees with auto-cleanup on merge. Zero merge conflicts because file-overlap check ran pre-spawn. Trade: merge resurrection false-positive required manual recovery (see below).
- **Discriminated-union extension via `assertNever` tail.** Adding `FhirpathCriterion` as the 4th variant surfaced the missing resolver branch at compile time, not runtime. Pattern will extend cleanly for v2 if phenotype-style criteria land.
- **D-10 cache invalidation pre-designed in Phase 21 paid off in Phase 22.** The `cohort.id + updatedAt` key meant `updateCohort` needed zero cache-layer changes — bumping `updatedAt` automatically invalidates. Would have been a bug-hunt in the opposite order.
- **Security-first codec decisions.** 1 MB cap + field-by-field parse + `URLSearchParams` were decided in RESEARCH.md before implementation. Zero security findings in code review — the contract was right, the implementation followed.

### What Was Inefficient

- **Worktree merge resurrection false-positive.** After merging 22-01, the resurrection-detection logic flagged the newly-created `22-01-SUMMARY.md` as "resurrected" because it wasn't in `PRE_MERGE_FILES`, and deleted it. Manual recovery (`git checkout worktree-branch -- SUMMARY.md` + amend). For 22-03's fast-forward merge, resurrection check was skipped entirely. Root cause: the check doesn't distinguish "created during merge" from "resurrected after delete". Should be fixed upstream in `gsd-tools`.
- **22-02 executor committed directly to main instead of its worktree.** Five commits landed on main that should have been in the worktree. No conflict because the files were disjoint, but it means the worktree isolation contract isn't airtight. Investigation needed into which executor path bypassed the worktree chdir.
- **Accomplishments extraction via `summary-extract` returned garbage for 5 of 9 summaries.** The `one_liner` field regex doesn't match common SUMMARY.md heading patterns. Hand-curated replacement in MILESTONES.md. Fix upstream.
- **Nyquist sign-off gate never flipped for either phase.** `nyquist_compliant: false` / `wave_0_complete: false` on both VALIDATION.md files despite 219 phase-scoped tests being GREEN. The gate exists but nothing in the execution flow advances it. Either automate the flip on wave-0 green or drop the frontmatter entirely.

### Patterns Established

- **Discriminated-union + `assertNever` exhaustiveness** as the canonical pattern for extensible domain types (here `CohortCriterion`). Compile-time errors on missing branches beat runtime default-case bugs.
- **D-10 cache keying on mutable-record `updatedAt`** for any hook that memoizes derived server data. Edit triggers recompute without a manual cache-clear path.
- **Legacy localStorage migration in parent `useEffect` before child `useLocalStorage` reads.** `QualityLayout` mount effect runs migrate helpers + belt-and-suspenders inline before any tree-descendent hook fires.
- **Medplum `parseFhirPath` AST + whitelisted operator mapping** as the safe FHIRPath→FHIR-search translation pattern. Never string concat; `URLSearchParams` only; reject unsupported AST nodes with precise error pointing at the offending atom.
- **File-size cap + field-by-field parse + no spread-on-parsed** as the canonical untrusted-JSON import defence. Covers DoS + prototype pollution in one pattern.
- **`status: human_needed` on VERIFICATION.md** when code passes but browser/live-server UAT is genuinely untestable in jsdom. Formalizes the deferral without pretending the phase is complete.

### Key Lessons

1. **Worktree merge resurrection needs a carve-out for "created during this merge".** Current logic: `PRE_MERGE_FILES` diff against post-merge; anything "added" not in pre-merge is treated as resurrected. Fix: union `PRE_MERGE_FILES` with files introduced by the merge commit itself before checking resurrection.
2. **Executor agents must chdir into their worktree before any write.** The 22-02 leak onto main suggests the executor isn't guaranteed to start in its isolated directory. Verify the executor skill starts with `cd "$WORKTREE_PATH"` or equivalent.
3. **Human UAT items belong in a structured registry, not only per-phase files.** v1.3 shipped with 8 deferred UAT items scattered across `21-VERIFICATION.md` + `22-HUMAN-UAT.md`. A top-level `.planning/UAT-BACKLOG.md` would make them visible across milestones.
4. **Nyquist frontmatter is vestigial if nothing flips it.** Either wire `wave_0_complete` to advance automatically on green wave-0 tests, or remove the field. False "compliant: false" muddies audits.
5. **Pre-designed cache keys pay compound interest when CRUD lands later.** D-10 (`cohort.id + updatedAt`) was decided in Phase 21 without knowing Phase 22 would add `updateCohort`. Worth asking "what mutations will this state see?" even when the current feature is read-only.

### Cost Observations

- **Pace:** 9 plans shipped across 2 calendar days — similar to v1.2 despite smaller scope. Worktree isolation + parallel waves kept pace high.
- **Test:code ratio:** 160 Phase-22 tests for ~2,000 lines of implementation. High. Security-heavy surface (FHIRPath translation, FDPG parsing) justified the ratio.
- **Human UAT debt:** 8 deferred items is the most in any single milestone. Browser-only surfaces (FileButton, download, live-server dry-run) are genuinely untestable in jsdom — accepting debt here is correct, but it accumulates.
- **Code review findings:** 0 critical, 3 warnings, 6 info. Lowest critical count across v1.0-v1.3. Worth attributing to upfront threat modeling in RESEARCH.md and conventions established v1.2.

---

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

## Milestone: v1.7 — Resource Navigation

**Shipped:** 2026-05-04
**Phases:** 6 (46-51, Phase 50 deferred) | **Plans:** 13 active + 1 deferred | **Timeline:** 2026-05-01 → 2026-05-04 (4 calendar days)

### What Was Built

- **`summarizeResource` foundation (Phase 46):** Pure-function `summarizeResource(r, now?) → { primary, secondary? }` covering 8 R4 resource types (Patient, Observation, Condition, Encounter, MedicationStatement, Procedure, DiagnosticReport, AllergyIntolerance). Deduped three divergent inline implementations. 328-line module with typed helpers; `getSummary` legacy shim preserved for non-covered types.
- **HumanReadableView readability layer (Phase 47):** `useResolvedResource` hook for lazy reference resolution + session cache; `ContainedResourcesAccordion` for inline contained resource expansion; `ExtensionChip` + `useMiiExtensionCounts` for MII primitive/complex extension display with [+N] chip; reference URLs in Tooltip on hover.
- **RelatedResourcesPanel — incoming references (Phase 48):** `reverseReferenceCatalog.ts` with 11 curated R4 reverse-reference entries; lazy per-catalog-entry fetch; `RelatedResourcesPanel` mounts below Tabs on all resource detail pages; state-key bug (WR-01 type-collision) caught in re-verification.
- **Reference graph view (Phase 49):** `/explorer/:type/:id/graph` lazy route; React Flow + dagre layout; `useResourceGraph` hook with depth-limited BFS (max depth 3); lazy import of `@xyflow/react` (~73 KB gz) with zero initial-load bundle delta; `ResourceGraphNode` custom node with patient-context awareness.
- **STACK-01 gate (Phase 50):** Second WAIVE-AND-DEFER — `@medplum/react@5.1.10` peers `@mantine/core: ^8.0.0` only; Mantine 9 blocked; React 19 independently unblocked but deferred coupled per user decision D-02. Zero source diff; phase closed cleanly.
- **Gap closure (Phase 51):** GAP-1 — reconciled `ClinicalTimeline` divergence from `summarizeResource` (re-pointed tests + removed duplicated `extractDate`); GAP-2 — `ResourceGraphNode` guard for missing resource `id` preventing silent non-navigation; `entries` state reset on `patientId` change in `PatientTimeline`.

### What Worked

- **Theme-A-first sequential ordering.** Phase 46's `summarizeResource` was consumed by Phases 47, 48, and 49 without back-porting or duplication. The registry-first decision (D-01 in v1.7 milestone notes) paid off immediately: each downstream phase had a stable, typed import.
- **Curated reverse-reference catalog.** Shipping a static 11-entry catalog (`reverseReferenceCatalog.ts`) was the right pragmatic call. CapabilityStatement-driven discovery is theoretically complete but requires parsing the server's capability on every navigation. The curated approach is deterministic, fast, and covers the MII Kerndatensatz core types that matter.
- **React Flow lazy-chunk isolation.** Splitting `@xyflow/react` into its own lazy route chunk achieved the stated goal: zero initial-load bundle delta. The `/graph` route loads ~73 KB gz on first access and nothing on every other route. Pattern is replicable for other heavy visualization dependencies.
- **WAIVE-AND-DEFER pattern maturing.** Phase 50 closed in minutes — gate check, result recorded, no source diff, `deferred` status set. The pattern now has three precedents (v1.6 Phase 45, v1.7 Phase 50 pre-plan, v1.7 Phase 50 execution). Repeating it a third time confirmed it is the correct response to an external blocker, not a process failure.
- **Code review re-verification catching WR-01 state-key collision.** Phase 48's first VERIFICATION pass returned `gaps_found` (4/5) on the `RelatedResourcesPanel` state key bug. The re-verification gate (not a new phase) closed the gap and returned a clean `human_needed` 5/5. Gap-within-phase recovery is cheaper than a gap-closure phase.

### What Was Inefficient

- **Gap closure Phase 51 was still needed.** Despite Phase 46 scoring 4/5 on first verification, the `ClinicalTimeline` divergence wasn't surfaced until Phase 51's dedicated gap-analysis pass. Root cause: the gap was in a call-site (`ClinicalTimeline`) that was not in Phase 46's change set — a valid cross-phase blind spot, but one that a broader "consuming files" scan in VERIFICATION.md could have caught earlier.
- **Three separate `summarizeResource` implementations at v1.7 start.** The refactoring problem existed from v1.5 (when `extractSummary` was introduced) but wasn't diagnosed until Phase 46's RESEARCH pass. Longitudinal code review after each milestone would surface cross-cutting duplication earlier.
- **Human UAT backlog is now 20+ items across v1.6 + v1.7.** Phases 46, 47, 48, and 49 each added 3-5 human UAT items requiring live Blaze + browser. No top-level UAT backlog registry exists. These items currently live only in per-phase `HUMAN-UAT.md` files and aren't surfaced in the next-session STATE.md reminders.
- **`summary-extract` accomplishments extraction still broken.** Third milestone where MILESTONES.md required hand-curation after CLI generated partial/garbage phrases from SUMMARY.md one-liner fields. The `one_liner` regex mismatches SUMMARY.md heading patterns — upstream fix still pending since v1.3.

### Patterns Established

- **`summarizeResource(r, now?) → { primary, secondary? }` as the canonical resource display primitive.** Any list surface, card header, or graph node that needs a display string calls this. No inline implementations. Non-covered types fall through to `getSummary` shim.
- **`useResolvedResource(ref)` lazy session-cache hook.** Fetches a FHIR Reference once per session via MedplumClient; returns `{ resource, loading, error }`. Use for any "show what this reference points to" surface.
- **Curated reverse-reference catalog as the incremental approach to incoming-reference discovery.** Static map of `(sourceType, fieldPath) → targetType` pairs. Add entries as real-world navigation reveals gaps. CapabilityStatement-driven is the eventual target.
- **Lazy route chunk for heavy visualization dependencies.** `const LazyGraphView = lazy(() => import('./components/ResourceGraphView'))` — zero initial-load cost, downloaded on demand. Use for any dependency ≥ 50 KB gz that is only needed on a specific route.
- **WAIVE-AND-DEFER for external blockers.** If the phase gate is an external peer-dep check and the gate fails, close the phase with `deferred` status and zero source diff. Document the re-attempt trigger (npm view command + condition). Don't force a workaround that creates future debt.

### Key Lessons

1. **Cross-phase call-site verification.** When Phase N introduces a new utility, VERIFICATION.md should scan not just files changed in Phase N but all files that previously implemented the old pattern. A grep for the old function name in post-Phase-46 verification would have caught `ClinicalTimeline`'s divergence and avoided Phase 51.
2. **Human UAT needs a top-level registry before v1.8.** `.planning/UAT-BACKLOG.md` should be created at the start of v1.8, pre-populated with all outstanding v1.7 items, and updated as each new phase adds browser-only UAT. A single file surfaced in STATE.md "Pending Todos" is far more visible than 6 separate `HUMAN-UAT.md` files.
3. **Curated catalogs need a versioning signal.** The `reverseReferenceCatalog.ts` catalog has no metadata about when entries were added or which MII profiles they cover. Adding a comment `// MII Kerndatensatz v2025 — Condition.subject` would make future maintenance and CapabilityStatement-driven migration easier.
4. **Two-slot summary is the right scope for v1.7.** The `{ primary, secondary? }` contract was proposed and held for all 6 phases. Adding a `status` field (rejected in v1.7 milestone decisions) would have required re-touching 8 resource-type helpers and all downstream consumers mid-milestone. Scope discipline on the type contract kept the phase count tractable.
5. **The WAIVE-AND-DEFER pattern needs a status dashboard.** STACK-01 has now deferred three consecutive milestones (v1.6 Phase 45, v1.7 Phase 50 pre-plan, v1.7 Phase 50 execution). There is no single file that lists all currently-deferred items with their re-attempt dates. `.planning/DEFERRED.md` or a ROADMAP Deferred section updated at each milestone would make the accumulation visible.

### Cost Observations

- **Pace:** 13 active plans across 4 calendar days — fastest feature-heavy milestone (v1.2 was 7 phases / 22 plans / 2 days but was mostly refactor work).
- **Bundle:** 27,815 insertions / 428 deletions across 327 files. +`@xyflow/react` (lazy route only; zero initial-load delta). All other dependencies unchanged.
- **Test count:** 1,412 tests green (up from ~1,200 at v1.6 end). 151 test files. No test regressions across 124 commits.
- **Human UAT debt:** ~20 items accumulated across v1.6 + v1.7 without a top-level registry. Most items require live Blaze with MII seed data — the surface area of browser-only testing is growing faster than the cadence allows.
- **Code review findings:** 3 code review findings in Phase 51 (WR-01/02/03), all fixed same session. Lowest finding count in a gap-closure phase across milestones.

---

## Cross-Milestone Trends

### Process Evolution

| Milestone | Phases | Plans | Key Change |
|-----------|--------|-------|------------|
| v1.0 | 8 (incl. 3 gap-closure) | — | Initial MVP; Nyquist compliance verified; first milestone audit |
| v1.1 | — | — | Dev feedback loop + 8 user-feedback UI improvements |
| v1.2 | 7 (incl. 1 gap-closure) | 22 | First full DQ stack; `NormalizedIssue` pattern; retrospective VERIFICATION.md recovery mechanism |
| v1.3 | 2 (0 gap-closure) | 9 | First milestone without a gap-closure phase; worktree-isolated parallel execution; discriminated-union extension pattern |
| v1.7 | 6 (1 gap-closure, 1 deferred) | 13 active | Resource navigation layer; `summarizeResource` canonical util; incoming-reference panel; graph view (React Flow lazy chunk) |

### Cumulative Quality

| Milestone | src LOC (approx) | Build Status | Notable |
|-----------|------------------|--------------|---------|
| v1.0 | — | ✓ Clean | 286 tests; 5/5 Nyquist compliant |
| v1.1 | — | ✓ Clean | User-feedback-driven improvements |
| v1.2 | ~28,400 | ✓ Clean (`tsc -b` + `npm run build` exit 0) | 9-tab quality dashboard; 16/16 requirements satisfied |
| v1.3 | ~35,000 | ✓ Clean | Cohort layer (interactive + FHIRPath + FDPG); 7/7 requirements satisfied (code); 0 regressions; 0/2 phases Nyquist-flipped (sign-off gate vestigial) |
| v1.7 | ~63,000 | ✓ Clean | Navigation layer (summarize, readability, refs, graph); 12/13 requirements satisfied (STACK-01 deferred); 1,412 tests green; zero bundle regressions |

### Top Lessons (Verified Across Milestones)

1. **Gap-closure phases were the norm until v1.3, returned in v1.7.** v1.0 had 3, v1.2 had 1, v1.3 had 0, v1.7 had 1 (Phase 51). The v1.7 gap was cross-phase (Phase 46 util not fully propagated), not an implementation bug — suggests the cross-phase call-site scan is the missing verification step.
2. **Shared primitives pay compound interest.** v1.0 shipped MII module tabs; v1.2 built `NormalizedIssue`; v1.3 extended `CohortCriterion` with `assertNever`; v1.7 established `summarizeResource` + `useResolvedResource`. Each milestone's key primitive is consumed by the next milestone's features.
3. **Build hygiene must be a per-phase gate.** v1.0 deferred 17 code review findings (fixed in v1.2 Phase 14); v1.2 Phase 16 re-introduced TS errors Phase 14 just fixed (caught in v1.2 Phase 20); v1.3 and v1.7 shipped clean. Each milestone that ran `tsc -b --noEmit` at every phase tip avoided a gap-closure phase for TS errors.
4. **Human UAT accumulates across milestones.** v1.0: 3, v1.2: 0, v1.3: 8, v1.7: ~20 cumulative. Browser-only surfaces (live server rendering, CSS layout, hover interactions) are the dominant source. A top-level `.planning/UAT-BACKLOG.md` is now overdue.
5. **WAIVE-AND-DEFER is a healthy pattern when applied consistently.** Three consecutive deferral cycles for STACK-01 without any source-diff workaround means the codebase stays clean and the unblock happens atomically when the peer dep finally opens. The pattern is correct; the missing piece is a DEFERRED.md dashboard so accumulation stays visible.
