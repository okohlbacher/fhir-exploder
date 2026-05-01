# Phase 21: Interactive Cohort Builder + Rename - Context

**Gathered:** 2026-04-15
**Status:** Ready for planning

<domain>
## Phase Boundary

Ship the interactive cohort builder: users define a patient cohort via a UI supporting **date range filter**, **condition code filter**, and **explicit reference-list inclusion**; cohort definitions persist in `localStorage` under `quality.cohorts.v1` and are reusable across sessions; all 7 quality panels can be scoped to the active cohort (composing with the existing resource-type filter); and the existing "Cohort" control on `CohortSelector` is renamed to "Resource types" so the two controls coexist clearly.

**Explicitly NOT in this phase (Phase 22):**
- FHIRPath query expressions as cohort definitions (CHRT-05)
- MII FDPG JSON import/export (CHRT-06)
- Full management view — edit / duplicate / delete (CHRT-07)

**Requirements covered:** CHRT-01, CHRT-02, CHRT-03, CHRT-04.

</domain>

<decisions>
## Implementation Decisions

### Builder Surface + Activation UX (discussed with user)

- **D-01:** The interactive cohort builder lives on a **dedicated page at `/quality/cohorts`**, mirroring the `/quality/thresholds` pattern (`ThresholdsPage.tsx`). Not inline on `/quality`, not in a modal/drawer. Reasons: (a) keeps the `/quality` dashboard toolbar uncluttered, (b) matches an established project pattern downstream agents already know, (c) gives the builder room to grow in Phase 22 (FHIRPath editor, FDPG import/export, management view all land here).
- **D-02:** The active cohort is surfaced on `/quality` as a **dropdown in the toolbar row, beside the renamed "Resource types" control** (currently line 211 of `QualityOverviewPage.tsx` in the `<Group gap="md" align="flex-end">` block). This is visually a peer of "Resource types" — not a banner, not a strip badge. Consistent with how existing toolbar controls work.
- **D-03:** Switching the active cohort is done **via the dropdown directly** — pick from saved cohort names, or select "No cohort — all patients" to deactivate. No trip to the builder page required. The builder page is the source of truth for *defining* cohorts; the dashboard dropdown is the source of truth for *activating* them.
- **D-04:** Default state is **cohort-is-opt-in**. No cohort active = analyze all patients (current behavior, zero regression). The dropdown shows "No cohort" when nothing is selected. No first-run empty-state prompt, no hard gate. Matches how thresholds and sampleSize work today — sensible defaults, opt-in overrides.

### Criterion Semantics (resolved 2026-04-15 after researcher surfaced A3/A7)

- **D-05:** The **date range criterion applies to `Encounter.period` only** (resolves A3). Cohort query: `Encounter?date=geYYYY-MM-DD&date=leYYYY-MM-DD&_elements=subject`, then dedupe subjects to patient IDs. Rationale: clinical-activity window is the most defensible semantic for "patients active in this range", matches the MII Kerndatensatz Fall (Encounter) module, and keeps the resolver path single-query simple. Observation/Condition date ranges are NOT in scope for Phase 21; they can be added later as a separate criterion type if needed.
- **D-06:** **Cohort resolution hard cap at 10,000 patient IDs** (resolves A7). When any individual criterion's resolution would exceed 10K distinct patients, truncate and surface a visible warning on the builder page: "Cohort truncated to 10,000 patients — add more criteria to narrow it, or use FHIRPath (Phase 22) for larger cohorts." Consistent with `parsePatientRefs` reference-list cap and with the URL-length threshold (~40 IDs triggers POST `_search` fallback; 10K is the hard ceiling). Matches the intersection semantics (D-C below): the AND-intersected patient set can never exceed the smallest pre-intersection set, so capping each input keeps the final set bounded.

### Claude's Discretion

User opted to let the researcher + planner decide the following, provided they stay consistent with codebase patterns. Directional guidance below:

- **Save & activation model** — Recommend **named cohort list** (explicit "Save as…" name prompt on the builder page). Rationale: Phase 22 adds edit/duplicate/delete management — which requires uniquely-identifiable, named entries. Implementing as a list now avoids a migration in Phase 22. Storage shape: `{ cohorts: CohortDefinition[], activeCohortId: string | null }` or similar — must support stable IDs so Phase 22 operations (edit/duplicate/delete) and cross-cohort references (FHIRPath definitions re-using interactive-builder output) work without a migration. One-cohort-only is an acceptable alternative if the researcher surfaces a strong argument.

- **Criterion semantics** — Recommend:
  - **Composition = AND** (intersection) — this matches how clinical cohorts are typically defined (e.g., "patients with diabetes AND born before 1960 AND from this reference list"). OR/mixed composition is not in the requirement set and adds UI complexity not justified for Phase 21.
  - **Patient-level scoping** — a cohort is a set of Patient resources. Date range, condition code, and reference list all resolve to "which patients qualify." This defines the contract Phase 22 inherits (FHIRPath cohorts also resolve to patient sets). The downstream panel queries then filter patient-bound resources by that patient set.
  - **Date range semantics** — should apply to resource-bearing events the user wants to bound (encounter period, observation date, condition onset). Researcher to recommend the specific field set and whether it's a single unified "anything in this date range" filter or criterion-typed. Keep the UX simple: one date range control, applied to the patient's clinical activity window.
  - **Condition code semantics** — "patients with a `Condition` matching this code/system" (not "resources with this code", not "patients with this code in any resource"). Uses standard FHIR `Condition?code=...&patient=...` or equivalent.

- **Rename strategy (CHRT-04)** — Recommend:
  - **Label rename** from "Cohort" → "Resource types" in `CohortSelector.tsx` (D-04 of the phase goal is non-negotiable).
  - **localStorage key migration** from `quality.cohort.v1` → `quality.resourceTypes.v1` with a one-time read-side migration (read both keys on mount; if old key exists and new doesn't, write to new and delete old). Leaving the stale key name will confuse future maintainers and looks bad in DevTools once the new `quality.cohorts.v1` (plural, the real cohort) lands beside it.
  - **Component rename** — consider renaming `CohortSelector.tsx` → `ResourceTypeSelector.tsx` to match the label. Researcher/planner's call; if the rename cascade is cheap, do it.
  - **Visual layout** — keep the two controls (Resource types, Active cohort) as adjacent peers in the toolbar `<Group>`; no divider needed, but add a short `Text size="xs" c="dimmed"` helper line under each to reinforce the distinct purposes if clarity feels off in review.

- **Scoping mechanism (how cohort propagates into the 7 panels)** — Claude's discretion, but guidance:
  - The panels currently receive `types + client + sampleSize` (see `QualityOverviewPage.tsx` lines 272-298). The active cohort needs to enter this pipeline cleanly.
  - Preferred approach: **resolve cohort → patient ID set once at activation** (cached, recomputed on recompute), then pass `patientIds?: string[]` down to each panel. Each panel adds a `patient=Patient/id1,Patient/id2,…` filter (or `subject=…` for resources using `subject`) to its search. Keeps the scoping logic central, avoids per-panel query differences, and handles large cohorts with chunked queries.
  - Alternative: server-side `_has` / chained search per panel. Might be more efficient for large cohorts but adds per-panel complexity and relies on Blaze's chained-search completeness. Researcher to decide.
  - Whichever mechanism is picked, the contract MUST be: "given an active cohort, each panel's analysis runs only over resources belonging to patients in the cohort." Panels themselves should be unaware of *how* that set is derived.

### Folded Todos

None — v1.3 REQUIREMENTS.md already absorbed all cohort-related pending todos.

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Requirements & Scope
- `.planning/REQUIREMENTS.md` — full CHRT-01..07 requirements (Phase 21 = CHRT-01..04, Phase 22 = CHRT-05..07); see also Out of Scope table (federated queries, phenotype builder, cross-user sharing, versioning/audit, live updates — all deferred).
- `.planning/ROADMAP.md` §"Phase Details (v1.3)" — phase goal, depends-on, success criteria, UI hint.
- `.planning/PROJECT.md` §"Current Milestone: v1.3" + §"Key Decisions" — established localStorage key convention (`quality.X.vN`), dual-source validation lineage, `NormalizedIssue` shape, `ResourceIssueTable` drill-down primitive.

### Code — Rename Target (CHRT-04)
- `src/components/quality/CohortSelector.tsx` — the misnamed control; label + storage key rename target.
- `src/components/quality/QualityOverviewPage.tsx` §lines 79-83, 211 — the `useLocalStorage({ key: 'quality.cohort.v1' })` call site and the `<CohortSelector>` render site in the toolbar `<Group>`. This is also where the new cohort dropdown slots in.
- `src/components/quality/QualityOverviewPage.tsx` §lines 272-298 — the 7 panel render sites whose signatures will grow a cohort-scoping input.

### Code — Patterns to Reuse (not duplicate)
- `src/components/quality/ThresholdsPage.tsx` — blueprint for `/quality/cohorts` page shape, routing wire-up, and back-navigation.
- `src/hooks/useThresholds.ts` — canonical `useLocalStorage` + post-mount hydration gate pattern. The cohort storage hook MUST follow this to avoid one-frame flicker (same class of bug as REVIEW-FIX WR-04 noted in that file).
- `src/quality/thresholds.ts` — three-state precedence (undefined/null/value), `STORAGE_KEY` export, pure resolver functions. Model `src/quality/cohorts.ts` on this shape.

### Code — Panel Pipeline (where scoping lands)
- `src/components/quality/CompletenessPanel.tsx`, `CodingCoveragePanel.tsx`, `ValidationPanel.tsx`, `PlausibilityPanel.tsx`, `LabRangesPanel.tsx`, `DuplicatesPanel.tsx`, `ReferencesPanel.tsx` — the 7 panels whose search queries need to accept an optional patient-ID set. Researcher should confirm each panel's actual search-building call site.

### Code — Potentially Useful Assets
- `src/terminology/` (TerminologyClient, TerminologyResolver, Cache) — if the condition-code input offers code autocomplete via the MII Terminology Server, this is where that integration lives. No existing autocomplete *component*, though — that would be new.
- `src/quality/valueSetCache.ts` — cached ValueSet expansions; reusable if condition codes are constrained to a specific value set.

### External Specs
- FHIR R4 Search (`patient` / `subject` parameters, `_has` chained search) — stdlib reference, no project-local doc.
- MII FDPG format spec (Forschungsdatenportal für Gesundheit) — **deferred to Phase 22**. NOT needed for Phase 21.

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets

- **`useThresholds` hook pattern** (`src/hooks/useThresholds.ts`): direct blueprint for `useCohorts`. `useLocalStorage` + hydration gate + pure resolver. Must reproduce the hydration gate or the dashboard dropdown will flicker one frame on every page load.
- **`ThresholdsPage.tsx`**: direct blueprint for `CohortsPage.tsx` at `/quality/cohorts`. Routing wire-up (in whichever file registers `/quality/thresholds`), back-navigation, Mantine layout.
- **`MultiSelect` from `@mantine/core`**: already in use for `CohortSelector` (the rename target); `Select` (single-value) is what the new "Active cohort" dropdown needs.
- **`@mantine/notifications`**: used throughout the dashboard (see `handleRecompute`, `handleCapture` in `QualityOverviewPage.tsx`) — use for "Cohort saved", "Cohort deleted" (Phase 22), "No patients match this cohort" feedback.
- **`NormalizedIssue` + `ResourceIssueTable`**: cohort scoping is upstream of these, so no direct reuse — but the downstream drill-down rows must render correctly when the panel's input resource set is cohort-filtered (no hidden assumptions about unfiltered patients).

### Established Patterns

- **`quality.X.vN` localStorage keys**: `quality.thresholds.v1`, `quality.trends.v1`, `quality.cohort.v1` (existing, to be renamed). New keys: `quality.cohorts.v1` (the real cohorts), `quality.resourceTypes.v1` (renamed from `quality.cohort.v1`).
- **Three-state precedence** from `resolveThreshold`: a good template if cohort activation needs "default / disabled / explicit" semantics. Probably overkill for cohorts — activation is simpler (a cohort ID or null) — but the pattern exists if needed.
- **Pure function + state-machine hook split**: `src/quality/thresholds.ts` (pure) + `src/hooks/useThresholds.ts` (React state). Apply the same split: `src/quality/cohorts.ts` (types, storage I/O, resolver) + `src/hooks/useCohorts.ts` (React-facing).
- **`captureSnapshot` already tracks `cohort`** (`src/components/quality/QualityOverviewPage.tsx` line 121): the existing trends pipeline already persists `cohort: string[]` (the resource-type list) in each snapshot. After rename, this field should become `resourceTypes: string[]` — and a new `cohortId: string | null` field should be added so historical snapshots record *which cohort was active* at capture time. Trends comparability story across the rename is a planner concern.

### Integration Points

- **Router** — new route `/quality/cohorts` (wherever `/quality/thresholds` is registered; most likely `QualityLayout` or `main.tsx`).
- **Toolbar** — `QualityOverviewPage.tsx` line 210 `<Group gap="md" align="flex-end">` gains a third control between "Resource types" and `SampleSizeControl`, or a new row above the existing one.
- **Panel signatures** — all 7 panel components grow an optional `patientIds?: string[]` prop (or equivalent cohort-scoping input); their search builders add `patient=` filter when present.
- **`QualityMetricsContext`** — if metrics are cohort-scoped, the context-produced rollups (`overallCompleteness`, etc.) already reflect the cohort without extra work. No change to context shape expected; just input scoping.
- **PDF export** (`src/quality/pdfExport.ts`): the `cohort` prop threaded through (`QualityOverviewPage.tsx` line 164) currently carries resource-type list. After rename, PDF needs to surface BOTH "Resource types: …" and "Cohort: <name>" lines so the report audit trail is clear.

</code_context>

<specifics>
## Specific Ideas

- Builder page at `/quality/cohorts` mirrors `ThresholdsPage` structure (Stack → Title → cards/sections → back button).
- Dashboard toolbar dropdown labeled "Active cohort" with a "No cohort — all patients" entry.
- On cohort activation, `/quality` panels recompute scoped to that cohort. Same "Recompute metrics" flow as today.

</specifics>

<deferred>
## Deferred Ideas

- **Phase 22 scope (explicit):** FHIRPath query expressions as cohort definitions (CHRT-05), MII FDPG JSON import/export (CHRT-06), management view with edit/duplicate/delete (CHRT-07).
- **Out of milestone scope (per REQUIREMENTS.md Out of Scope):** server-side cohort evaluation / federated queries, phenotype builder (multi-criteria boolean), cross-user sharing, cohort versioning/audit history, live cohort updates.
- **Potential future:** condition-code autocomplete via MII Terminology Server if criterion input UX proves awkward in Phase 21; trend comparability across rename boundary.

</deferred>

---

*Phase: 21-interactive-cohort-builder-rename*
*Context gathered: 2026-04-15*
