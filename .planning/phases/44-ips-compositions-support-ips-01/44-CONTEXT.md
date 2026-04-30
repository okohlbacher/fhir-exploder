# Phase 44: IPS Compositions Support (IPS-01) - Context

**Gathered:** 2026-04-30
**Status:** Ready for planning
**Mode:** `--auto` (auto-picked recommended defaults; every auto-pick logged inline)

<domain>
## Phase Boundary

Validate FHIR resource bundles against the IPS (International Patient Summary) Composition profile and surface "Empty Sections and Missing Data" findings in the existing drill-down chrome.

**In scope:**
- Profile fetch script for HL7 IPS package (`hl7.fhir.uv.ips`) via `fhir-package-loader` (Phase 34 mechanism)
- New URL-keyed `IPS_REGISTRY` (parallel to `EXTENSION_REGISTRY` from Phase 36)
- New `IPSPanel.tsx` reachable from `/quality` with bundle paste + Composition picker
- IPS-specific bundle walker (NOT the Phase 31 cascade — IPS is bundle-level, not per-resource)
- Per-section drill-down via Phase 15's `<ResourceIssueTable>` (reused as-is)
- LICENSE/NOTICE update for HL7 IPS attribution
- Fixture-driven regression test asserting ≥2 distinct empty-section findings

**Not in scope:**
- Multi-bundle batch validation (defer; scope creep candidate per D-18)
- Bundle authoring/editing (read-only validator only)
- Server-side `$validate` against IPS (Blaze doesn't ship IPS profiles by default; rely on bundled package)
- IPS-AU / IPS-CH dialects (stick to IPS-UV; regional profiles are separate phases)
- Composition.section auto-fix suggestions (validation only; no remediation UI)

</domain>

<decisions>
## Implementation Decisions

### G-01 Profile Fetch & Registry

- **D-01 [auto-picked: recommended]:** Create a NEW `scripts/fetch-ips-profiles.mjs` (separate from `scripts/fetch-mii-profiles.mjs`) plus a parallel `IPS_REGISTRY` URL-keyed mapping. Mounted from `src/quality/profiles/ips/index.ts` mirroring the Phase 36 extension registry shape (lazy-load thunks: `() => Promise<{ default: StructureDefinition }>`).
  *Rationale:* IPS is HL7 International (different attribution domain than MII Kerndatensatz), and a separate fetch script keeps update cadence + license metadata isolated. Reusing Phase 36's URL-keyed lazy-load shape preserves the existing trim/cache invariants without coupling MII and IPS update flows.

- **D-02 [auto-picked: recommended]:** IPS package = `hl7.fhir.uv.ips` from `packages.fhir.org`. Pin version exactly per `npm view`-style live probe at fetch time; record the exact pin in `IPS_PACKAGES` constant in `scripts/fetch-ips-profiles.mjs`. Researcher will verify the latest stable at planning time (likely `1.1.0` or `2.0.0` line).
  *Rationale:* Matches the Phase 34 version-pin pattern (`EXTENSION_PACKAGES` const). Researcher confirms the live version since IPS is an upstream package whose minor versions change between sessions.

- **D-03 [auto-picked: recommended]:** Trim StructureDefinition to `{ resourceType, url, name, type, snapshot.element[] (path, min, max?, mustSupport?, sliceName?) }` — IDENTICAL trimming to Phase 34's MII extensions. Reuse the trim function from `scripts/fetch-mii-profiles.mjs` (extract to `scripts/lib/trim-profile.mjs` if not already shared, or copy verbatim — researcher decides per code-dedup analysis).
  *Rationale:* The completeness/section walker reads only these fields. Trimming keeps bundle size sane (Phase 34 PITFALLS #7).

- **D-04 [auto-picked: recommended]:** ATTRIBUTION.md added at `src/quality/profiles/ips/ATTRIBUTION.md` with HL7 IPS package metadata (name, version, license per package manifest). LICENSE/NOTICE at repo root gets a new section "IPS Composition profile (HL7 International)" with the upstream license terms.
  *Rationale:* Phase 34's pattern. License compliance — IPS package may be CC0 or Apache-2; researcher confirms from package manifest.

### G-02 UI Entry Point

- **D-05 [auto-picked: recommended]:** NEW dedicated `src/components/quality/IPSPanel.tsx` reachable from `/quality` (sub-route `/quality/ips`). NOT bolted onto `ValidationPanel` (which is per-resource cascade — different mental model). Sidebar nav entry under `/quality` cluster.
  *Rationale:* IPS validation is bundle-level (paste a bundle → validate against profile), fundamentally different UX from cascade validation (per-resource). Mixing them would confuse users.

- **D-06 [auto-picked: recommended]:** Bundle input supports BOTH paste-textarea AND server-Composition picker. Two tabs (Mantine `<Tabs>`): "Paste Bundle JSON" (`<JsonInput>` with autosize) and "Select from Server" (search Composition resources via `client.searchResources('Composition', ...)` + select dropdown). Reuse the existing Medplum Composition picker idiom from `Patient` flows where applicable.
  *Rationale:* Paste covers ad-hoc analysis (user pastes a bundle from a file or another tool); server picker covers connected-Blaze workflow. Both modes validate the same way once the bundle is loaded.

- **D-07 [auto-picked: recommended]:** Validation runs on explicit "Validate" button click (not auto-on-input). Loading state via Mantine `<Button loading>` + `<Skeleton>` over the results area while walker runs.
  *Rationale:* Avoids accidental triggers during multi-line paste. Matches existing Quality cluster patterns (CompletenessPanel, etc. use explicit-run).

### G-03 Validator Architecture

- **D-08 [auto-picked: recommended]:** DEDICATED IPS bundle walker at `src/quality/ipsBundleValidator.ts` (NOT the Phase 31 `cascadingValidator`). Walker takes `(bundle: Bundle, ipsProfile: StructureDefinition) => OperationOutcome.issue[]`. Reuses `normalizeOperationOutcomeIssue` from `src/quality/normalizers.ts` for shape. NO server-side `$validate` cascade (Blaze doesn't ship IPS profiles; relying on bundled package is sufficient and avoids the PHI gate complexity).
  *Rationale:* IPS validation is fundamentally bundle-level traversal of `Composition.section[]` against profile slices — not the per-resource HTTP cascade. Reusing the cascade would introduce PHI-gate friction (Phase 7) and external-validator round-trips that don't fit. The walker is a pure function, easy to unit-test.

- **D-09 [auto-picked: recommended]:** Walker logic:
  1. Resolve the Composition resource at `bundle.entry[0]` (or first `entry.resource.resourceType === 'Composition'`).
  2. For each expected section slice in the IPS profile (from `snapshot.element` paths matching `Composition.section`), check:
     - **section absent** → issue with `severity: error`, `code: required`, `expression: 'Composition.section[N]'`, `details.text`: `"Required section '${title}' is missing"`
     - **section.entry empty** → issue with `severity: warning`, `code: incomplete`, `details.text`: `"Section '${title}' is present but has no entries"`
     - **section.entry references unresolvable resource** (i.e., `entry.reference` doesn't resolve in `bundle.entry[]`) → issue with `severity: information`, `code: incomplete`, `details.text`: `"Section '${title}' references unresolvable resource ${ref}"`
  3. Return the flat `OperationOutcome.issue[]` for the panel to consume.
  *Rationale:* Three severity levels match clinical reality (absent ≠ empty ≠ unresolvable). The expression path lets the drill-down link back to the section in the rendered Composition.

### G-04 Drill-Down Wiring

- **D-10 [auto-picked: recommended]:** Drill-down rows render via Phase 15's `<ResourceIssueTable>` UNCHANGED. The walker output already maps to `NormalizedIssue` via `normalizeOperationOutcomeIssue`. Click-through opens the source resource (Composition) in the standard resource detail view.
  *Rationale:* Maximum reuse of Phase 15. Zero new drill-down primitives needed. Keeps cross-cluster UX consistent.

- **D-11 [auto-picked: recommended]:** Section path format (for the "expression" column in the issue table): `Composition.section[<index>].title` — e.g., `Composition.section[0].title = 'Allergies and Intolerances'`. The IPS section ordering is locked by the profile slice definitions (researcher confirms slice names from the IPS package).
  *Rationale:* Keeps the table sortable and groupable. Users can scan "all empty sections" at a glance.

### G-05 Test Strategy

- **D-12 [auto-picked: recommended]:** Test fixtures live at `src/quality/__tests__/fixtures/ips/`:
  - `ips-bundle-complete.json` — a fully-populated reference bundle (used as positive baseline; validator returns 0 issues)
  - `ips-bundle-incomplete.json` — deliberately missing AllergyIntolerance section + empty Medications section (used as primary regression fixture; validator MUST return ≥2 issues with severity error/warning)
  - `ips-bundle-malformed.json` — invalid bundle structure (e.g., missing Composition entry; tests graceful failure)
  *Rationale:* Three fixtures cover the happy path, the SC #4 assertion, and the edge case. All committed to repo.

- **D-13 [auto-picked: recommended]:** Test setup:
  - `src/quality/__tests__/ipsBundleValidator.test.ts` — unit tests for the walker (≥6 tests: complete-bundle-zero-issues, incomplete-bundle-2+-findings, missing-Composition-graceful-error, profile-not-loaded-graceful-fallback, severity-classification, expression-path-format)
  - `src/components/quality/__tests__/IPSPanel.test.tsx` — component test that mounts IPSPanel, pastes the incomplete fixture into JsonInput, clicks Validate, asserts ResourceIssueTable shows ≥2 rows
  - NO new test framework dependencies (vitest 1.x already covers everything per 43-VALIDATION.md baseline)

### G-06 LICENSE/Attribution

- **D-14 [auto-picked: recommended]:** Update LICENSE file at repo root:
  - Add new section `## Bundled FHIR Profiles — HL7 IPS` with package canonical URL, version pin, and upstream license text (per package manifest — usually CC0 or Apache-2)
  - Update `package.json` `description` field to mention IPS support if not already covered
  - `src/quality/profiles/ips/ATTRIBUTION.md` carries the per-package metadata (similar to extensions/ATTRIBUTION.md from Phase 34)
  *Rationale:* Compliance — bundling third-party profiles requires attribution. Phase 34 set the pattern for extensions; mirror it for IPS.

### Claude's Discretion

- **D-15 [Claude's Discretion]:** Exact Mantine input for bundle paste — `<JsonInput autosize minRows={10} maxRows={30}>` recommended over `<Textarea>` because JsonInput validates JSON shape on input and provides syntax error feedback for free. Planner can pick the equivalent if Mantine 9 changes the API surface (Phase 45 may rename it).
- **D-16 [Claude's Discretion]:** Whether to debounce or use idle scheduling for large bundles (>1 MB). Walker is synchronous; for very large bundles the planner can wrap it in a `requestIdleCallback` or `Promise.resolve().then()` to keep the UI responsive. Default is synchronous; revisit if user feedback shows lag.
- **D-17 [Claude's Discretion]:** Severity row color-coding in `ResourceIssueTable` is already inherited from Phase 15. No change needed; planner doesn't need to revisit this unless a regression slips in.
- **D-18 [Claude's Discretion]:** Multi-bundle batch validation — explicitly DEFERRED. If user feedback emerges, opens a future v1.7+ phase. Do NOT add to v1.6.

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Phase 44 source files (extend / mirror Phase 34 + Phase 36 patterns)
- `scripts/fetch-mii-profiles.mjs` — pattern reference for new `scripts/fetch-ips-profiles.mjs` (fetch + trim + write JSON + ATTRIBUTION.md)
- `src/quality/profiles/extensions/index.ts` — URL-keyed lazy-load registry; mirror this in `src/quality/profiles/ips/index.ts`
- `src/quality/profiles/extensions/ATTRIBUTION.md` — pattern for `src/quality/profiles/ips/ATTRIBUTION.md`
- `src/quality/profiles/index.ts` — type-keyed registry, NOT to be extended (IPS is URL-keyed under separate registry)
- `src/quality/normalizers.ts` — `normalizeOperationOutcomeIssue` for issue shape; reuse, do not modify
- `src/components/quality/ResourceIssueTable.tsx` — Phase 15 drill-down primitive; reuse as-is, no modifications
- `src/components/quality/ValidationPanel.tsx` — Phase 31 reference (NOT extended; new `IPSPanel.tsx` lives parallel)
- `src/components/quality/CompletenessPanel.tsx` — pattern reference for new `IPSPanel.tsx` (loading state, run button, results display)
- `LICENSE` (repo root) — update for IPS attribution per D-14
- `package.json` — verify `fhir-package-loader` devDep version still satisfies IPS package (Phase 34 pinned `^2.2.4`)

### Phase 44 tests (new files)
- `src/quality/__tests__/ipsBundleValidator.test.ts` — Wave 0 stub + Wave 1 implementation
- `src/components/quality/__tests__/IPSPanel.test.tsx` — Wave 0 stub + Wave 2 implementation
- `src/quality/__tests__/fixtures/ips/ips-bundle-complete.json` — new fixture
- `src/quality/__tests__/fixtures/ips/ips-bundle-incomplete.json` — primary regression fixture (≥2 empty-section findings)
- `src/quality/__tests__/fixtures/ips/ips-bundle-malformed.json` — edge-case fixture

### Prior phase context (consume during planning)
- Phase 34 (`.planning/milestones/v1.5/` archive — researcher locates) — fhir-package-loader scaffold + URL-keyed registry
- Phase 36 — lazy-load thunks pattern + cache invariants
- Phase 15 — `<ResourceIssueTable>` + drill-down primitives + `NormalizedIssue` shape
- Phase 31 — `ValidationPanel` UX (for inspiration only; IPS is a separate panel)
- Phase 5 — Phase-5 completeness walker (similar shape to IPS section walker — read for traversal idiom)

### Standards & specs
- HL7 IPS Implementation Guide: https://hl7.org/fhir/uv/ips/
- HL7 IPS Composition profile: https://hl7.org/fhir/uv/ips/StructureDefinition-Composition-uv-ips.html
- HL7 FHIR R4 Composition resource: https://hl7.org/fhir/R4/composition.html
- HL7 FHIR R4 OperationOutcome: https://hl7.org/fhir/R4/operationoutcome.html
- packages.fhir.org IPS package: https://packages.fhir.org/hl7.fhir.uv.ips
- ROADMAP.md §Phase 44 — definitive SCs

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- **Phase 34 fetch scaffold** (`scripts/fetch-mii-profiles.mjs`): proven `fhir-package-loader` + trim + write pattern; mirrors directly to IPS.
- **Phase 36 URL-keyed registry** (`src/quality/profiles/extensions/index.ts`): lazy-load thunk pattern + module-scoped cache + StrictMode-safe in-flight Promise sharing — copy idiom for `IPS_REGISTRY`.
- **Phase 15 `<ResourceIssueTable>`** (`src/components/quality/ResourceIssueTable.tsx`): drill-down + sort + drill-down click-through — reused unmodified.
- **`normalizeOperationOutcomeIssue`** (`src/quality/normalizers.ts`): canonical issue shape — walker output flows through this.
- **Mantine 8 `<JsonInput>`**: built-in JSON validation + syntax-error feedback — no new dep.
- **Mantine 8 `<Tabs>`**: paste-vs-server picker idiom — already used in Cohorts panel.
- **Medplum `client.searchResources('Composition', ...)`**: server picker mode reuses existing Medplum search idiom.
- **vitest fixture pattern** (`src/quality/__tests__/fixtures/`): existing fixture directory; add `ips/` subdir following the established naming.

### Established Patterns
- **URL-keyed lazy-load** (`extensions/index.ts`): IPS_REGISTRY follows the same shape; first call dynamically imports, subsequent calls hit module-scoped cache; concurrent calls share the same in-flight Promise.
- **Trim-on-fetch** (Phase 34 PITFALLS #7): bundle size constraint — trim profile JSON to walker-relevant fields only.
- **Warn-and-continue fetch failures** (Phase 34 D-13): if IPS package fetch fails (offline install), the script logs `console.warn` and exits 0; CI relies on committed JSON in the repo.
- **Explicit-run UX** (CompletenessPanel, CodingCoveragePanel): Validate button + loading state, no auto-trigger.
- **Pure-function walker + state-machine hook** (Phase 17): `ipsBundleValidator` is pure; `IPSPanel` manages loading/error/success state via local `useState` (no Context provider needed for a single-panel feature).
- **`<DrillDownShell>`** (Phase 15): standard drill-down container — IPSPanel uses it to wrap `<ResourceIssueTable>` results.

### Integration Points
- **`/quality` route cluster** — add `/quality/ips` sub-route + sidebar nav entry
- **`scripts/fetch-mii-profiles.mjs`** — `prepare` hook in `package.json` already runs the MII fetcher with `|| true` escape; either add `&& node scripts/fetch-ips-profiles.mjs || true` chain OR create a dispatcher script. Researcher decides.
- **`LICENSE` / NOTICE** (repo root) — append IPS attribution section
- **`package.json` `prepare`** — extend to fetch IPS profiles alongside MII

</code_context>

<specifics>
## Specific Ideas

- **IPSPanel mirrors `CompletenessPanel` structure** — Toolbar (input mode tabs + Validate button) + Results area (skeleton during run, ResourceIssueTable after).
- **No server `$validate` cascade for IPS** — bundled package is sufficient; PHI gate avoidance keeps the UX simple.
- **Walker is synchronous** — bundle size is bounded (typical IPS ≤500 KB); no need for async chunking. Revisit only if perf data shows otherwise.
- **JsonInput preferred over Textarea** — built-in JSON shape validation saves us a regex check and gives users immediate feedback on syntax errors.
- **Three severity levels** (error / warning / information) match clinical IPS workflow — absent ≠ empty ≠ unresolvable.
- **Section path expression format** `Composition.section[N].title` — locks the issue table sort and groupability.
- **Reuse Phase 15 `<ResourceIssueTable>` UNMODIFIED** — zero changes to that component; IPSPanel feeds it `NormalizedIssue[]` and it just works.

</specifics>

<deferred>
## Deferred Ideas

- **Multi-bundle batch validation** — defer to v1.7+ (validate a folder/array of bundles in one run; useful for batch-quality auditing but adds UI complexity for a single-tool MVP).
- **Server-side `$validate` IPS support** — defer; depends on Blaze (or alternative server) shipping IPS profiles. If a future server supports it, opens a parallel cascade tier.
- **IPS-AU / IPS-CH / regional dialects** — defer; each is a separate phase. v1.6 ships IPS-UV only.
- **Composition.section auto-fix suggestions** — defer; this is an editor feature, not a validator feature. Different mental model.
- **Mantine 9 JsonInput API differences** — Phase 45 problem. If Mantine 9 renames the component, planner does the rename in this phase OR Phase 45 codemod handles it. Defer detail to Phase 45 gate.
- **IPS Schematron rules / `fhirpath` constraints beyond `min`/`max`/`mustSupport`** — out of scope. v1.6 ships structural section validation only. Schematron-style cross-element rules opens a Phase 4x.

</deferred>

---

*Phase: 44-ips-compositions-support-ips-01*
*Context gathered: 2026-04-30 via /gsd-discuss-phase 44 --auto*
*Mode: --auto (every D-XX rationale logged inline; user can review and revise CONTEXT.md before /gsd-plan-phase 44 --auto runs)*
