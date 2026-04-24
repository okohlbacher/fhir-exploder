# Phase 33: MII Schema Foundation + Extension-Modules Collapse UI - Context

**Gathered:** 2026-04-24
**Status:** Ready for planning

<domain>
## Phase Boundary

Widen the `MiiModule` schema and ship the collapsible "Extension modules" UI shell **without** adding the 14 new data entries. Helpers-first refactor isolates the mechanical codemod (`fhirResourceTypesOf`, `findModuleForType`, `getPatientSearchParamForType`, `getExtraQueryForType`) from the schema landing so silent breakage on `===` comparisons against `string | string[]` cannot hide. Absorbs Phase-30 UAT follow-ups UAT-FU-04 (Dashboard MII tile scoping decision) and UAT-FU-06 (empty per-patient MII/FHIR panel root cause), so the per-module `patient=` vs `subject=` pattern is locked before Phase 34 fans the schema out across 14 extension modules.

**Unblocks:** Phase 34 (data payload — 14 module entries + palette + bundled profiles).

**NOT in scope:** the 14 extension-module entries themselves; new colors/icons/Tabler additions; bundled `StructureDefinition` JSON; empty-state opacity UX; `MantineColorsTuple` palette work — all Phase 34. No rollup-math changes. No new quality features.

</domain>

<decisions>
## Implementation Decisions

### Helpers (MII-EXT-01) — pre-locked by ROADMAP success criterion #1

- **D-01:** Four helpers ship in `src/utils/mii-modules.ts` **before** the schema widens. Mechanical codemod first; type-widening commit lands separately so TypeScript can flag every `===` site that the codemod missed:
  - `fhirResourceTypesOf(mod): string[]` — returns the type list (single string normalised to one-element array).
  - `findModuleForType(type, modules): MiiModule | undefined` — replaces `MII_MODULES.find(m => m.fhirResourceType === type)` (currently at `ClinicalTimeline.tsx:85-86`).
  - `getPatientSearchParamForType(mod, type): string` — returns `patientSearchParamOverrides[type] ?? mod.patientSearchParam`.
  - `getExtraQueryForType(mod, type): string | undefined` — returns `extraQueryByType?.[type] ?? mod.extraQuery` (see D-04).

### Schema widening (MII-EXT-02) — pre-locked by ROADMAP success criterion #2

- **D-02:** `MiiModule` interface gains:
  - `fhirResourceType: string | string[]` (was `string`).
  - `category: 'base' | 'extension'` (REQUIRED, no default — all 7 existing modules explicitly tagged `'base'` in this phase; Phase 34's data ships with `'extension'`).
  - `patientSearchParamOverrides?: Record<string, string>` — type-keyed overrides; falls back to module-wide `patientSearchParam`.
  - `extraQueryByType?: Record<string, string>` — see D-04.
- **D-03:** All 7 existing base modules in `MII_MODULES` are explicitly tagged `category: 'base'` in this phase. No data-shape change beyond the new field. The `extraQuery` field on Laborbefund stays as today (single-type module — fallback path exercised).

### Per-type `extraQuery` shape

- **D-04:** Encode per-type query filters via a **map**, not inline tuples or array-of-discriminated-unions:
  - Add `extraQueryByType?: Record<string, string>` to `MiiModule` (e.g. `{ Observation: 'category=laboratory' }`).
  - Retain the existing module-wide `extraQuery?: string` as a single-type fallback applied to all types when `extraQueryByType` is absent — no migration churn for Laborbefund.
  - `getExtraQueryForType(mod, type)` checks `extraQueryByType[type]` first, then falls back to `extraQuery`.
  - Symmetric with the locked-in `patientSearchParamOverrides?: Record<string, string>` shape — same map idiom, same fallback story.
- **D-05:** `getExtraQueryForType()` returns `string | undefined` (NOT `string` with `''` fallback). Matches the existing `extraQuery?: string` field semantics. Callers conditionally append (`if (q) url += '&' + q;`) without empty-string concat noise. Test assertions can distinguish "no filter" from "empty filter".

### `MiiModuleTab` fan-out (MII-EXT-03)

- **D-06:** `Promise.all(types.map(...))` per ROADMAP success criterion #3. Per-type `.catch()` returns `[]` so a single failed type doesn't blank the whole module. Single-type modules behave identically to v1.4 — wrapping a one-element array in `Promise.all` is a no-op overhead.
- **D-07:** Per-type results concatenated and sorted by `getDate()` (existing helper at `MiiModuleTab.tsx:34-47`). No new sort logic.

### `MiiModuleTabs.tsx` partition + Collapse (MII-EXT-04, MII-EXT-05)

- **D-08:** Pre-locked by ROADMAP success criterion #4. Base pill tabs render at top (today's `<Tabs.List>` unchanged in layout). Extension tabs live inside a `<Collapse>` block beneath, in their own `<Tabs.List>`. The whole component remains a single `<Tabs>` so `activeTab` state stays unified.
- **D-09:** Collapse open/closed state is **session-only** via `useDisclosure(false)` — defaults CLOSED, resets to CLOSED on every patient mount. No localStorage key. Matches Dashboard MII section's no-persistence convention. Phase 34's `patients.hideEmptyExtensions.v1` toggle is independent.
- **D-10:** When the URL `?tab=<extension-key>` deep-links to an extension module (e.g. `/patients/:id?tab=onkologie`), the Collapse **auto-expands using Mantine's default `<Collapse>` animation** (~200ms). Users who land via deep link see the expand transition; this is acceptable per the user's call. Open state is set in a `useEffect` that runs on mount + `activeTab` change.
- **D-11:** Extension `Tabs.Panel`s drop `keepMounted` (per MII-EXT-05). Base 7 keep `keepMounted` (no behavior change — preserves the v1.4 "no re-fetch on tab switch" property for the most-used tabs). Phase 34's `Promise.all` storm is bounded to the active extension tab.

### Dashboard MII tile partition + scoping (MII-EXT-06 / UAT-FU-04)

- **D-12:** `DashboardPage.tsx:340-385` partitions `MII_MODULES` into base vs extension via `m.category`. Base 4-col grid renders unchanged (top). Extension grid lives in a second Collapse-or-Section gated behind a "Show extension modules" toggle (per MII-EXT-06). Toggle defaults closed; uses the same session-only `useDisclosure(false)` pattern as D-09 (no localStorage in Phase 33).
- **D-13:** **Tile counts stay server-wide** (`counts[fhirResourceType]` as today). Heading reworded to unambiguously surface the scope: e.g. `MII Kerndatensatz · Server-wide totals` (final copy is the planner's call but must end the ambiguity per ROADMAP success criterion #5). No new FHIR fetches; no cohort wiring; no per-patient distinct-count probe.
- **D-14:** Tile click target changes from today's `navigate('/patients')` to a **minimal read-only in-place drawer/modal** (using Mantine's existing `Drawer` or `Modal` primitive). Drawer contents: module name (German + FHIR), the module's resource type list, the server-wide count just shown on the tile, and an "Open in Explorer" link/button to `/explorer/<primary-type>`. **No new FHIR fetches in Phase 33** — the "top 5 codes" extension is explicitly NOT included; if the existing counts cache happens to contain richer data the planner may surface it, otherwise just the count + nav link. Keeps the drawer cheap (~0.25 day add). Effort budget aligned with the 2.5-3 day phase estimate.

### `ClinicalTimeline.tsx` migration (MII-EXT-08)

- **D-15:** `ClinicalTimeline.tsx:85-86` `MII_MODULES.find((m) => m.fhirResourceType === resource.resourceType)` is replaced with `findModuleForType(resource.resourceType, MII_MODULES)`. No other timeline logic changes; badge color + German label fall out of the helper return. Tests cover a multi-type module stub (Bildgebung-style) to lock the behavior so Phase 34's data drop doesn't regress badge mapping.

### UAT-FU-06 investigation (MII-EXT-07) — pre-tasks

- **D-16:** Investigation runs **first** in the phase (per intra-phase ordering in ROADMAP). Approach: **live Blaze probe + fix forward**.
  1. Hit each module's URL against the configured Blaze + Synthea bundle (DevTools / curl), record empty results per module/type.
  2. For each empty type, retry with `subject=<patientId>` instead of `patient=<patientId>` (the most likely root cause per the roadmap hypothesis).
  3. Patch the affected module in `MII_MODULES` — either change the module-wide `patientSearchParam` (if every type wants the same param) or add an entry to `patientSearchParamOverrides` (if only one type differs).
  4. Document each finding inline as a comment on the module entry.
- **D-17:** **Per-module unit test in `mii-modules.test.ts`** locks the per-type param contract so Phase 34's 14 modules can't reintroduce the bug. The test asserts `getPatientSearchParamForType(mod, type)` returns the expected param for every `(module, type)` pair. Adding a Phase-34 module = adding a test row. No JSDoc table — the test is the contract. (Reading `mii-modules.test.ts` = reading the per-module convention.)

### Test Strategy

- **D-18:** `src/__tests__/mii-modules.test.ts` updates required (per ROADMAP success criterion #8):
  - Existing `expect(MII_MODULES).toHaveLength(7)` stays unchanged (7 base modules still — no Phase-34 data added in Phase 33).
  - Type assertions for `fhirResourceType` relaxed to accept `string | string[]`. Exact-match tests for the 7 base modules remain unchanged.
  - New: assert each module has `category: 'base'` after the schema widen.
  - New: D-17 per-module `getPatientSearchParamForType` table.
  - New: helper unit tests — `fhirResourceTypesOf` (string + array inputs), `findModuleForType` (single-type + multi-type stub), `getExtraQueryForType` (with map, with fallback, with neither).
  - New: timeline regression test with a multi-type module stub (Bildgebung-style: `['ImagingStudy', 'DiagnosticReport']`) verifying badge color + German label propagate via `findModuleForType`.
- **D-19:** Test count gate per ROADMAP success criterion #8: `npm test` ≥ 836 passing / 0 failing. New helper + per-module tests bump the count slightly upward; no test deletions.

### Commit Cadence

- **D-20:** Helpers-first commit ordering is **non-negotiable** (per ROADMAP intra-phase ordering + REQUIREMENTS.md MII-EXT-01 explicit "no-behavior-change" mandate). Proposed plan decomposition (planner finalises):
  - **Plan 33-01:** MII-EXT-07 — UAT-FU-06 live Blaze investigation + per-module fixes + D-17 per-module test. Lands BEFORE schema widen so the regression test exists against the current narrow schema.
  - **Plan 33-02:** MII-EXT-01 — four helpers added; existing call sites migrated to helpers (`MiiModuleTab`, `MiiModuleTabs`, `ClinicalTimeline.tsx:85-86`, `DashboardPage.tsx:345-384`). No schema change yet. Mechanical refactor with no behavior change. Grep verification in commit message: zero `.fhirResourceType ===` survivors.
  - **Plan 33-03:** MII-EXT-02 — schema widen. `MiiModule` gains `string | string[]`, `category`, `patientSearchParamOverrides`, `extraQueryByType`. All 7 base modules tagged `'base'`. Test-type assertions relaxed.
  - **Plan 33-04:** MII-EXT-03 — `MiiModuleTab` fan-out (`Promise.all`). Single-type behavior unchanged.
  - **Plan 33-05:** MII-EXT-04 + MII-EXT-05 — `MiiModuleTabs` partition + extension Collapse + `keepMounted` drop on extension panels. (Today no extension tabs exist, so the Collapse is structurally present but visually empty until Phase 34.)
  - **Plan 33-06:** MII-EXT-06 — Dashboard partition + "Show extension modules" toggle + drawer/modal click target + label clarification (D-13).
  - **Plan 33-07:** MII-EXT-08 — `ClinicalTimeline` migration verification (mostly subsumed by 33-02 if the helper sweep is done correctly; this plan exists as a verification + multi-type test stub gate).
- **D-21:** Each plan ends with green `npm test` + `npx tsc -b --noEmit`. No "broken but fixed in next plan" intermediate states.

### Folded Todos

None — `gsd-tools todo match-phase 33` returned 0 matches.

### Claude's Discretion

- Drawer vs Modal primitive for D-14 — `Drawer` (right-edge) reads better for a sidebar-summary feel; `Modal` is fine if it composes more naturally with existing dashboard layout.
- Final wording of the Dashboard MII heading clarification (D-13) — must end ambiguity but exact copy is the planner's call.
- Whether MII-EXT-08 lands as a standalone plan (D-20: 33-07) or folded into 33-02 helper sweep — depends on how clean the timeline call-site migration ends up being.
- Internal location of the new helpers vs the existing `MII_MODULES` array — either in `src/utils/mii-modules.ts` (recommended for co-location) or `src/utils/mii-helpers.ts` (split file). Planner picks; co-location is the cheaper default.
- Drawer "Open in Explorer" link: `/explorer/<primary-type>` (first type in array) vs the typed-list dropdown — primary type is the simplest and matches Dashboard's existing single-card-per-module pattern.

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### ROADMAP + Requirements
- `.planning/ROADMAP.md` lines 117-127 — Phase 33 goal, depends-on, intra-phase ordering, 8 success criteria.
- `.planning/REQUIREMENTS.md` MII-EXT-01..MII-EXT-08 — the binding acceptance contract for the 8 helper/schema/UI changes.
- `.planning/REQUIREMENTS.md` UAT-FU-04 + UAT-FU-06 — Phase-30 UAT items subsumed by Phase 33 (cross-referenced for traceability).

### Prior phase context
- `.planning/milestones/v1.4-phases/30-layout-redesign/30-UAT.md` — Phase-30 UAT Gaps section. UAT-FU-04 (Dashboard MII tile scoping ambiguity) and UAT-FU-06 (empty per-patient MII/FHIR panels for Synthea) defined here.
- `.planning/phases/32-eff-r14-qualitymetricscontext-split/32-CONTEXT.md` — sibling phase format reference; same milestone (v1.5).

### Existing code to migrate (helpers-first sweep)
- `src/utils/mii-modules.ts` — current narrow `MiiModule` interface (lines 15-41) + `MII_MODULES` array (lines 48-103). Single source of truth for the schema widen.
- `src/components/patients/MiiModuleTab.tsx:53-81` — single-type fetch via `client.get(...)`. Becomes `Promise.all(types.map(...))` per D-06.
- `src/components/patients/MiiModuleTabs.tsx:61-95` — current single `<Tabs.List>` with all 7 modules. Becomes the partitioned base/extension layout per D-08.
- `src/components/patients/ClinicalTimeline.tsx:85-86` — the `===` site that breaks silently after schema widen. Migrated to `findModuleForType` per D-15.
- `src/components/dashboard/DashboardPage.tsx:340-385` — current MII grid using `useDisclosure(true)` for the section toggle. Partition + drawer per D-12, D-13, D-14.

### Existing test scaffolding to extend
- `src/__tests__/mii-modules.test.ts` — current type assertions + per-module exact-match tests. Relaxed + extended per D-18, D-19.

### Mantine primitives in use
- `Collapse` — already used at `DashboardPage.tsx:343` for the existing MII section. Reuse pattern for extension Collapse in `MiiModuleTabs.tsx`.
- `useDisclosure` — already imported at `DashboardPage.tsx:17,76,77`. Same import + idiom for D-09 + D-12.
- `Drawer` / `Modal` — Mantine 8.x primitives; planner picks per D-14. Check existing usage in `src/components/` for any house-style choice.

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- **`getDate(r)`** at `src/components/patients/MiiModuleTab.tsx:34-47` — pure, used to sort fan-out results in D-07 without rewriting the date-extraction logic.
- **`getSummary(r)`** at `src/components/patients/MiiModuleTab.tsx:14-32` — pure, used unchanged after fan-out.
- **`useDisclosure(false)`** idiom — already imported in `DashboardPage.tsx`. Direct reuse for D-09 (extension Collapse) + D-12 (Dashboard "Show extension modules" toggle).
- **`<Collapse>`** component pattern at `DashboardPage.tsx:343` — copy-paste shape for `MiiModuleTabs.tsx` extension panel.
- **`extraQuery` already-encoded URL convention** at `MiiModuleTab.tsx` (currently absent from URL builder; today only Laborbefund's `extraQuery: 'category=laboratory'` defines it but the `useEffect` at line 63 doesn't append it — INVESTIGATE during MII-EXT-07 whether this is a separate bug, since `MiiModule.extraQuery` exists in the type but is unused).

### Established Patterns
- **`category=laboratory` URL append convention** (`mii-modules.ts:91-94` JSDoc) — the field is verbatim-appended; helper signature `string | undefined` (D-05) preserves this.
- **`patientSearchParam` per-module field** (`mii-modules.ts:25-29` JSDoc) — already uses the per-module-override pattern; `patientSearchParamOverrides` widens it to per-type.
- **Tab-pill-with-subtitle layout** (`MiiModuleTabs.tsx:33-59` `TabPillLabel`) — extension tabs reuse the same component; no new tab styling.
- **`keepMounted` opt-in/out** — `Tabs.Panel` exposes the `keepMounted` prop; the partition in D-11 is a single-line per-panel toggle (extension panels omit it).

### Integration Points
- **`MII_MODULES.find` call sites** — currently 1 explicit (`ClinicalTimeline.tsx:85-86`). Grep verification post-D-02 must show zero `=== resource.resourceType` and zero `m.fhirResourceType ===` survivors.
- **Dashboard `counts` source** — `DashboardPage.tsx` reads `counts[fhirResourceType]`; with multi-type modules, the planner may need to sum `getResourceCounts` across types for extension modules. Phase 33 only touches the base 7 (single types each), so this is a Phase-34-deferred concern; today's behavior preserved.
- **Test wrappers** — `src/__tests__/mii-modules.test.ts` is the only consumer of `MII_MODULES` in tests; helper unit tests (D-18) co-locate here unless the planner prefers `src/utils/__tests__/mii-modules-helpers.test.ts`.

### Latent bug surfaced during scout
- **`MiiModuleTab.tsx:63`** — the URL builder reads `${module.fhirResourceType}?${module.patientSearchParam}=Patient/${patientId}&_count=50&_sort=-date` but does NOT append `module.extraQuery`. Laborbefund's `extraQuery: 'category=laboratory'` is therefore silently dropped — every Observation type leaks into the Laborbefund tab today. This is the original bug the field was supposed to fix; investigate during MII-EXT-07 (D-16) and confirm whether UAT-FU-06's "empty MII panels" symptom is partly caused by extras-not-appended (not just `patient`/`subject` mismatch).

</code_context>

<specifics>
## Specific Ideas

- **Helpers-first commit ordering enforces type safety:** the user's intuition is that landing helpers + call-site migration BEFORE the schema widen lets TypeScript flag every survivor when the type changes. Without the helper sweep, a `m.fhirResourceType === 'Patient'` against `string | string[]` produces a TS error AT BEST and a silently-always-false `===` AT WORST (depending on TS strictness on union narrowing). Test the worst case in CI to be sure.
- **Drawer "Open in Explorer" link target** (D-14): for multi-type modules in Phase 34, defaults to the FIRST type in the array. Cheap, deterministic; users who want all types can use the resource-type rail in Explorer.
- **D-04 vs locked `patientSearchParamOverrides` symmetry**: pick the same shape (`Record<string, string>`) deliberately so Phase 34's per-module rows have a consistent grammar — `patientSearchParamOverrides`, `extraQueryByType`. Reading one tells the reader how the other works.
- **Drawer animation gating** (D-10): the user explicitly chose Mantine's default Collapse animation over instant-expand. If user testing later flags it as sluggish on direct-URL access, swap to `transitionDuration={0}` on first mount only (one-line change).
- **MII-EXT-07 latent bug surface (`extraQuery` never appended at `MiiModuleTab.tsx:63`)**: discovered during scout, NOT pre-known. Surface it as part of MII-EXT-07's investigation — fixing it may resolve part of UAT-FU-06's empty-panel symptom on its own.

</specifics>

<deferred>
## Deferred Ideas

- **Per-cohort Dashboard MII counts** — the "cohort-scoped when active" option from Area 1. User chose server-wide for Phase 33. Worth revisiting when the Dashboard generally becomes cohort-aware (no current ticket).
- **Patients-with-data column on Dashboard MII tiles** — the "two-number" option. Adds significant FHIR-search load on Dashboard mount. Defer indefinitely unless user feedback specifically asks.
- **localStorage persistence of extension Collapse state** — explicitly rejected for Phase 33 (D-09). Phase 34 ships `patients.hideEmptyExtensions.v1` which is a different toggle (empty modules visibility, not Collapse open/close); the patterns can be reconciled in Phase 34 if it becomes inconsistent.
- **Drawer "top 5 codes" enrichment** (D-14 originally floated) — explicitly excluded to keep Phase 33 cheap. Belongs in a later "Dashboard depth" phase if the in-place drawer pattern proves popular.
- **Speculative codemod (try `patient=` then fall back to `subject=`)** — explicitly rejected as anti-pattern in Area 2. Doubles fetches and hides the per-module contract.
- **Inline tuple shape for `fhirResourceType: Array<string | {type, extraQuery?}>`** — explicitly rejected in D-04 in favor of the map shape.
- **Per-patient localStorage map for Collapse state** — explicitly rejected in Area 4 Q1 as overkill.
- **JSDoc table on `MiiModule` for the per-type param convention** — explicitly rejected in D-17 in favor of test-as-contract. Could be revisited in Phase 34 if the per-module test grows unwieldy.

### Reviewed Todos (not folded)

None — no pending todos matched Phase 33 scope.

</deferred>

---

*Phase: 33-mii-schema-foundation-extension-modules-collapse-ui*
*Context gathered: 2026-04-24*
*Mode: interactive (4 gray areas discussed; 2 follow-up clarifications captured)*
