# Milestones

## v1.2 Tech Debt & Quality Monitoring (Shipped: 2026-04-15)

**Phases completed:** 7 phases (14-20), 22 plans
**Git range:** `60e9010` → `661109d` (216 files, +35,490 / −378)
**Timeline:** 2026-04-13 → 2026-04-14
**Requirements:** 16/16 satisfied

**Key accomplishments:**

- **Tech debt cleanup (Phase 14)** — zero TypeScript build errors, shared `fhir-helpers` utility (`toRecord`, `getCodeDisplay`), all 17 deferred code review findings from v1.0 phases 4+5 resolved (DEBT-01, DEBT-02)
- **Quality drill-down foundation (Phase 15)** — `NormalizedIssue` type, per-resource walker output, shared `ResourceIssueTable` with pagination/filters/severity badges, drill-down pages wired for completeness, coding coverage, and validation with clickable links to resource detail (DQ-01, DQ-02)
- **Conformance & plausibility checks (Phase 16)** — profile conformance engine with value set cache, cardinality validation, profile-driven temporal plausibility (future dates, period consistency, age, duration), lab reference range validation; 6-tab quality dashboard (DQ-03, DQ-04, DQ-05, DQ-06)
- **Duplicate detection & relational integrity (Phase 17)** — five pure-function engines (patient dedup, content-hash resource dedup, reference walking, existence checking, orphan detection) + two state-machine hooks + `DuplicatesPanel`/`ReferencesPanel` (DQ-07, DQ-08, DQ-09, DQ-10)
- **Quality alerting & thresholds (Phase 18)** — `useThresholds` localStorage hook with hydration gate, three-state override precedence, `/quality/thresholds` config page with save-on-blur + reset-to-defaults, `SummaryCard` breach primitive, 9-tile `OverviewStrip` with `?tab=` deep-linking (DQ-11, DQ-12)
- **Quality trends & PDF reports (Phase 19)** — `trendsHistory` pure module with localStorage persistence + quota handling, 7-mini-chart small-multiples with per-point breach coloring + overlay mode, cross-server filter, off-screen React portal + html-to-image + jsPDF multi-page export wired to `/quality` toolbar (QUAL-05, QUAL-06)
- **Milestone gap closure (Phase 20)** — TS2352 cast widening in `profileConformanceChecker.ts` + `temporalPlausibilityWalker.ts` (`as unknown as` double-cast), retrospective `15-VERIFICATION.md` + `18-VERIFICATION.md`, REQUIREMENTS.md traceability sync to 16/16 (closes `v1.2-MILESTONE-AUDIT.md`)

**Archives:**

- [v1.2-ROADMAP.md](milestones/v1.2-ROADMAP.md) — full phase details
- [v1.2-REQUIREMENTS.md](milestones/v1.2-REQUIREMENTS.md) — all 16 requirements satisfied
- [v1.2-MILESTONE-AUDIT.md](milestones/v1.2-MILESTONE-AUDIT.md) — initial audit (gaps closed by Phase 20)

---
