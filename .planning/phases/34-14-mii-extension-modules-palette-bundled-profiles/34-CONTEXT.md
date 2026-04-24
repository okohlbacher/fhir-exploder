# Phase 34: 14 MII Extension Modules + Palette + Bundled Profiles - Context

**Gathered:** 2026-04-24
**Status:** Ready for planning
**Mode:** `--auto` (all decisions auto-selected from ROADMAP recommendations + Phase 33 patterns)

<domain>
## Phase Boundary

Populate the shell that Phase 33 built. Ship 14 MII extension module entries (Onkologie, Kardiologie, Intensivmedizin, Bildgebung, Pathologie, Mikrobiologie, Molekulargenetik, Seltene Erkrankungen, Symptom, Biobank, Studie, Dokument, MTB, PRO) with per-type search-param overrides, a 21-module palette (7 base unchanged + 7 custom `MantineColorsTuple`s), 21 Tabler icons, bundled CC-BY-4.0 trimmed StructureDefinition JSON via a one-time `fhir-package-loader` devDep, and per-module empty-state UX at 0.55 opacity.

**Out of scope (future phases):**
- Per-type quality matrix card consuming the new colors (Phase 35 UAT-FU-05)
- Phase-30 UAT follow-ups (Phase 35)
- Any MII base-module behavioral changes (locked by Phase 33)

</domain>

<decisions>
## Implementation Decisions

### Module Ordering (MII-EXT-09)

- **D-01:** Within the extension section, list modules **alphabetically by German label** (Bildgebung, Biobank, Dokument, Intensivmedizin, Kardiologie, Molekulargenetik, MTB, Onkologie, Pathologie, PRO, Seltene Erkrankungen, Studie, Symptom). Rationale: extensions lack the clinical-workflow axis that orders Phase 33's base 7; alphabetical gives deterministic discoverability and is the MII IG's own reference order. Base 7 ordering (Person → Fall → Diagnose → Prozedur → Consent → Laborbefund → Medikation) is UNCHANGED.

### Per-Module Spec Research (MII-EXT-09)

- **D-02:** Per-module research deliverable lands at `.planning/research/color-design-audit.md` (ROADMAP-locked path). For each of 14 modules the audit records: MII IG canonical URL, primary `fhirResourceType` + any secondary types (multi-type modules), expected `patientSearchParam` (default `patient=`) + per-type `patientSearchParamOverrides` when the IG diverges (e.g., `Consent.patient`, some Observation references), chosen `badgeColor` (Mantine token name), chosen `@tabler/icons-react` icon name, and German + FHIR display label. Pre-GA packages (Kardiologie `2026.0.0-alpha.2`, Symptom `2024.0.0-ballot`) flagged in the audit but shipped silently (no UI "beta" badge) per ROADMAP.
- **D-03:** Phase 33 `getPatientSearchParamForType` contract test (D-17 in 33-CONTEXT.md) is EXTENDED with 14 new rows — one per extension module, one assertion per `(module, type)` pair. Coverage assertion from Phase 33 auto-catches missing rows. This is the structural mechanism that prevents Phase 34's data drop from silently reintroducing the UAT-FU-06 class of bug.

### Color Palette (MII-EXT-10)

- **D-04:** `src/theme.ts` gains **7 custom `MantineColorsTuple`s** (names locked by ROADMAP): `oncology` (red family), `imaging` (cyan family), `genetics` (grape family), `pathology` (violet family), `bioanalysis` (teal family), `administration` (indigo family), `patient-reported` (pink family). Each tuple = 10 shades, Mantine `primaryShade: 6` convention preserved. Base 7 colors (`blue`, `indigo`, `teal`, `violet`, `pink`, `cyan`, `orange`) are **UNCHANGED and not renamed** — module `badgeColor: 'indigo'` on base Fall continues to resolve to Mantine's stock indigo, not the new `administration` tuple.
- **D-05:** **14 modules → 7 palettes mapping** follows clinical-semantic grouping (final per-pair assignment locked in the D-02 color audit file):
  - `oncology`: Onkologie + MTB (Molecular Tumor Board is a cancer-care subspecialty)
  - `imaging`: Bildgebung + Studie (studies frequently image-centric)
  - `genetics`: Molekulargenetik + Seltene Erkrankungen (rare diseases ≥80% genetic)
  - `pathology`: Pathologie + Mikrobiologie (both lab-histology axis)
  - `bioanalysis`: Biobank + Intensivmedizin (both high-volume bio-sample-heavy)
  - `administration`: Kardiologie + Dokument (Kardio maps to cross-cutting workflow; Dokument is a doc-admin module)
  - `patient-reported`: Symptom + PRO (both patient-voice)
  The auditor may swap pairs within the families if the WCAG AA contrast check fails on any combination — the principle (clinical-semantic grouping) is locked, the final pairs are a planner + research finding.
- **D-06:** **WCAG AA audit** at `.planning/research/color-design-audit.md` documents per-palette contrast ratios (badge text against surface, badge fill against Card background, tab text against active-pill background) using the measured hex of primaryShade 6. Minimum 4.5:1 for text-on-fill, 3:1 for UI-chrome elements. Any failing palette is tweaked (lighter primary shade or darker text) before landing.

### Icons (MII-EXT-11)

- **D-07:** **21 Tabler icons assigned — one per module, rendered in THREE places** per ROADMAP criterion #3: (1) `ClinicalTimeline.tsx` dot markers (replaces plain dot); (2) `MiiModuleTabs.tsx` tab subtitle/pill label (leading icon, 14-px); (3) `DashboardPage.tsx` MII tile swatch (32-px, replaces the current solid swatch). Phase 33's Drawer (`DashboardPage.tsx` tile-click target, D-14 in 33-CONTEXT.md) additionally surfaces the module icon adjacent to the German label — small scope add, zero new fetches.
- **D-08:** **Base 7 icons** chosen to match the existing color/theme (final per-module in the color-design-audit doc): Person → IconUser, Fall → IconBedFlat, Diagnose → IconStethoscope, Prozedur → IconMedicalCross, Consent → IconFileSignature, Laborbefund → IconFlask, Medikation → IconPill. **14 extension icons** follow the same semantic-first principle (e.g., Onkologie → IconRadioactive or IconVirus; Bildgebung → IconPhoto or IconScan; Pathologie → IconMicroscope). Final icon-per-module in the audit.
- **D-09:** **Deuteranopia discriminability** verified via Chrome DevTools > Rendering > Emulate vision deficiencies → `deuteranopia`. Three screenshots committed under `.planning/research/color-design-audit.md` §deuteranopia: (1) Dashboard MII tile grid (21 tiles); (2) Patient detail tab row (21 tabs); (3) `ClinicalTimeline` with fixture containing one entry per module. Pass criterion: every adjacent pair distinguishable by the color + icon combo. Automated tooling (e.g., axe color-check) not required.

### Profile Fetching (MII-EXT-12 + MII-EXT-13)

- **D-10:** `scripts/fetch-mii-profiles.mjs` uses `fhir-package-loader@^2.2.4` devDep (caret pin — minor updates flow). Fetches 14 MII extension IG packages from `packages.fhir.org`, extracts `StructureDefinition` resources, trims each to `{ url, name, type, snapshot: { element: [{ path, min, max, mustSupport, sliceName? }] } }` (same trim shape the existing Phase 5 base profiles at `src/quality/profiles/*.json` use — see `src/quality/profiles/index.ts` header comment).
- **D-11:** Trimmed JSON lands under **`src/quality/profiles/extensions/`** (dedicated sub-directory — base 7 stay at parent level unchanged). `src/quality/profiles/index.ts` is extended to mount the extension registry alongside the base registry.
- **D-12:** **Commit the fetched JSON to git.** The `prepare` hook regenerates on fresh clones, but committed outputs mean: (a) fresh clones without network access still pass `npm test`; (b) diffs of profile updates are reviewable. Add `.gitattributes` entry marking `src/quality/profiles/extensions/*.json linguist-generated=true` to suppress them from GitHub's diff view without hiding from git itself.
- **D-13:** **Failure mode = warn-and-continue** (per ROADMAP success criterion #4). If a package fetch fails (network down, package 404), the script logs `console.warn` with the package name + URL but exits 0. CI relies on the committed JSON. Pre-GA packages explicitly get a `console.info` "bundling pre-GA version {semver}" message (not warn) to distinguish expected pre-GA from genuine fetch failures.
- **D-14:** **`prepare` lifecycle hook** runs `node scripts/fetch-mii-profiles.mjs` on `npm install`. Script is idempotent — re-running overwrites outputs if packages.fhir.org returns newer content. Failure (non-zero exit) is suppressed via `|| true` in the `prepare` script so `npm install` on an offline machine still succeeds.

### Attribution + Licensing (MII-EXT-13)

- **D-15:** **`src/quality/profiles/extensions/ATTRIBUTION.md`** carries per-package metadata: canonical URL, MII IG version, license (`CC-BY-4.0`), source URL on `packages.fhir.org`, fetched-on timestamp (ISO 8601). One section per package.
- **D-16:** **Root `LICENSE` appendix** (append-only, preserves MIT body per CLAUDE.md constraint): "Bundled MII StructureDefinition profiles are licensed under CC-BY-4.0 — see `src/quality/profiles/extensions/ATTRIBUTION.md` for per-package attribution. The FHIR Exploder source code itself remains MIT-licensed." `package.json` `license` field stays `MIT` (mixed-license projects conventionally report the source-code license, with bundled-asset license noted in the LICENSE file).

### Empty-State UX (MII-EXT-14)

- **D-17:** **"Empty" definition** (for deciding when to apply the 0.55 opacity / hide-able treatment): a module is empty when the concatenated result of `fhirResourceTypesOf(mod).flatMap(fetch)` returns zero entries. Any single matching resource across ANY listed type makes the module non-empty. For Bildgebung `[ImagingStudy, DiagnosticReport]`, a single DiagnosticReport is enough. This matches user expectation ("the imaging section has data") and is computationally free — `MiiModuleTab`'s post-fan-out `resources` array length is the sole signal.
- **D-18:** **Default visibility = VISIBLE at 0.55 opacity** (per ROADMAP success criterion #6). A one-line header "Show N empty modules" (or "Hide N empty modules" when currently shown — toggles label with state) sits above the extension `<Collapse>` block (sharing real estate with the existing "Show extension modules" affordance from Phase 33 D-12). Copy placeholder: `"— no {module label} data for this patient"` rendered inside the dimmed tab's panel.
- **D-19:** **Persistence**: `localStorage.patients.hideEmptyExtensions.v1` per ROADMAP. Schema: `Record<patientId, boolean>` — patient-scoped, not global. Missing/null → default VISIBLE. First Phase 34 write, no migration.

### Integration with Phase 33 Artifacts

- **D-20:** **Zero changes to Phase 33 base-module behavior.** `MII_MODULES` array extension is **append-only** after the base 7. `MiiModuleTabs` partition filter (`m.category === 'extension'`) already handles the new rows. `MiiModuleTab` fan-out already handles `string | string[]`. `DashboardPage` partition + extension subgrid already renders the extension tile count — Phase 34 just fills the rows.
- **D-21:** **`MiiModuleTab.tsx` minor change** for empty-state UX: wrap the tab panel in an `opacity: isEmpty ? 0.55 : 1` + render the empty-state copy when `resources.length === 0`. No new fetches. This touches the component but preserves its Phase 33 fan-out contract. Base 7 modules are exempt (`category === 'base'`) — they keep their existing empty-state render.

### Performance Gates

- **D-22:** **Time-to-Interactive (TTI)** on `/patients/:id` must not regress from the v1.4 baseline. Capture baseline on a committed patient fixture before Phase 34 starts (if not archived from Phase 30) using Chrome DevTools Performance panel → "TTI" metric. Post-execution snapshot committed at `.planning/phases/34-14-mii-extension-modules-palette-bundled-profiles/tti-snapshot.json`. Guard: Phase 33's `keepMounted` drop on extension panels is the enabling invariant — the 14 extension tabs do NOT fetch until user clicks them.
- **D-23:** **Bundle-size delta** < 100 KB post-gzip. Use `rollup-plugin-visualizer@^7.0.1` (already devDep). Commit pre-Phase-34 treemap at `.planning/phases/34-14-mii-extension-modules-palette-bundled-profiles/visualizer-before.html` and post treemap as `visualizer-after.html`. The 14 trimmed profile JSONs + 14 new icons + 7 `MantineColorsTuple`s (70 hex strings) comprise the vast majority of the delta.

### Test Strategy

- **D-24:** **Test-count gate:** `npm test` ≥ 902 passing / 0 failing (Phase 33 baseline). Phase 34 additions:
  - `mii-modules.test.ts`: 14 new rows in the D-17 per-module patientSearchParam contract table + `toHaveLength(21)` update (was 7 after Phase 33, becomes 21 after Phase 34).
  - `mii-modules.test.ts`: palette snapshot test asserting theme.colors contains the 7 new MantineColorsTuple keys (`oncology`, `imaging`, `genetics`, `pathology`, `bioanalysis`, `administration`, `patient-reported`).
  - `scripts/fetch-mii-profiles.test.mjs` (new): smoke test with a mocked `fhir-package-loader` — asserts trim shape and file write path, no network IO.
  - `MiiModuleTab.test.tsx`: new empty-state tests — `opacity: 0.55` when `resources.length === 0` + empty-copy renders, base-module path unchanged.
  - `MiiModuleTabs.test.tsx` (create if missing): "Show N empty modules" toggle visibility + localStorage persistence roundtrip.

### Commit Cadence

- **D-25:** Mirror Phase 33's non-negotiable helpers-first ordering. Proposed plan decomposition (planner finalises):
  - **Plan 34-01** — Per-module research + color/icon/palette audit doc (`.planning/research/color-design-audit.md`) landing BEFORE any code changes. Output: committed audit doc with per-module spec lookup, WCAG contrast ratios, deuteranopia screenshots, icon-per-module table. No code touched.
  - **Plan 34-02** — `src/theme.ts` adds 7 new `MantineColorsTuple`s + component defaults unchanged. Base 7 icons added (type-only extension — `MiiModule.icon` field in `mii-modules.ts` schema; gated optional so Phase 34-04 fills the extension values). Snapshot test locks the palette keys. Zero UI visible change yet (icons render conditionally).
  - **Plan 34-03** — `scripts/fetch-mii-profiles.mjs` + `prepare` lifecycle hook + `src/quality/profiles/extensions/ATTRIBUTION.md` + LICENSE appendix. Trimmed JSON for all 14 extensions committed under `src/quality/profiles/extensions/`. `index.ts` extended to mount the extension registry.
  - **Plan 34-04** — 14 `MII_MODULES` extension entries appended (per-module `fhirResourceType` arrays, `patientSearchParam` + `patientSearchParamOverrides`, `badgeColor` from D-04 palette, `icon` from `@tabler/icons-react` per D-08). 14 new D-17 contract-test rows. Base 7 icons also assigned here (reuses the D-22 hook). Dashboard tile + tab + Timeline now visually render the extensions.
  - **Plan 34-05** — Empty-state UX: `MiiModuleTab` dimmed-panel render + copy. `MiiModuleTabs` (or `DashboardPage` MII section) "Hide N empty modules" toggle + localStorage `patients.hideEmptyExtensions.v1` persistence. `MiiModuleTab.test.tsx` + `MiiModuleTabs.test.tsx` empty-state coverage.
  - **Plan 34-06** — UAT: deuteranopia screenshots committed, TTI before/after snapshot, bundle-size treemap before/after — all lodged under `.planning/phases/34-14-mii-extension-modules-palette-bundled-profiles/`. `npm test` green gate reassessed against the ≥ 902 baseline.
- **D-26:** Each plan ends with green `npm test` + `npx tsc -b --noEmit`. No "broken but fixed in next plan" intermediate states — inherits Phase 33 D-21 invariant.

### Claude's Discretion
- Final icon-per-module selection within the semantic principle (D-08) — the audit doc captures reasoning; planner/researcher picks.
- Final copy of the empty-state line (D-18) — "— no {module} data for this patient" is placeholder; German-legible rewording allowed.
- Exact plan-boundary split of plans 34-04 / 34-05 — e.g., pushing the icon assignment out of 34-02 into 34-04 is acceptable if the planner finds the seam cleaner.

### Folded Todos
(None — no pending todos matched Phase 34 scope at context-gathering time.)

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### ROADMAP + REQUIREMENTS
- `.planning/ROADMAP.md` §Phase 34 — goal, dependencies, 7 success criteria
- `.planning/REQUIREMENTS.md` §MII-EXT-09..14 — acceptance criteria per requirement

### Phase 33 Locked Decisions (prior context)
- `.planning/phases/33-mii-schema-foundation-extension-modules-collapse-ui/33-CONTEXT.md` — D-01..D-21 define the schema widen, helpers, fan-out, Tabs partition, Dashboard Drawer, and timeline migration that Phase 34 builds on
- `.planning/phases/33-mii-schema-foundation-extension-modules-collapse-ui/33-01-INVESTIGATION.md` — live Blaze probe for UAT-FU-06; informs per-module `patientSearchParam` research (D-03)
- `.planning/phases/33-mii-schema-foundation-extension-modules-collapse-ui/33-HUMAN-UAT.md` — 6 deferred smoke tests (Phase 999.1 backlog); Phase 34 should not regress the scenarios listed

### Phase 34 Research Outputs (to be authored by plan 34-01)
- `.planning/research/color-design-audit.md` — WCAG AA contrast audit + deuteranopia screenshots + per-module icon/palette assignments (ROADMAP criterion #2 + #3 anchor — MUST exist before palette lands)

### Code Anchors
- `src/utils/mii-modules.ts:15-72` — `MiiModule` interface widened in Phase 33; Phase 34 appends 14 rows and adds `icon` field
- `src/utils/mii-modules.ts:90-152` — 7 base modules; Phase 34 extends the array (append-only)
- `src/theme.ts:17-44` — `createTheme()`; Phase 34 adds 7 `MantineColorsTuple` to `colors:` block
- `src/quality/profiles/index.ts` — base 7 registry; Phase 34 extends to mount extension registry
- `src/quality/profiles/*.json` — existing trim shape reference for extension JSON (trimmed to `{ url, name, type, snapshot.element[{ path, min, max, mustSupport }] }`)
- `src/components/patients/MiiModuleTab.tsx` — fan-out host; Phase 34 adds empty-state dimming only (D-21)
- `src/components/patients/MiiModuleTabs.tsx` — Tabs partition host; Phase 34 adds "Hide N empty modules" toggle
- `src/components/patients/ClinicalTimeline.tsx` — dot renderer; Phase 34 swaps plain dot for icon per D-07
- `src/components/dashboard/DashboardPage.tsx` — MII tile grid + Drawer; Phase 34 adds icon to tile swatch + Drawer (D-07)
- `package.json:54` — `rollup-plugin-visualizer@^7.0.1` already devDep; Phase 34 consumes for D-23

### External Specs (read during research plan 34-01)
- MII Kerndatensatz Erweiterungsmodule index page (https://www.medizininformatik-initiative.de/en/basic-modules → Erweiterungsmodule section) — 14 extension IGs
- Per-package pages on `packages.fhir.org` — canonical URLs + pre-GA version flags
- CC-BY-4.0 license text (https://creativecommons.org/licenses/by/4.0/legalcode) — attribution requirements

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- **`src/theme.ts`** — `createTheme()` already extended for warm-neutrals + radii; adding 7 `MantineColorsTuple`s is a mechanical `colors:` block extension
- **`src/utils/mii-modules.ts`** — Phase 33 schema widen (`string | string[]`, `category`, `patientSearchParamOverrides`, `extraQueryByType`) + 4 helpers + D-17 contract test scaffold are all in place; Phase 34 = data addition
- **`src/quality/profiles/index.ts`** — base 7 registry pattern; extension registry mirrors it
- **`src/quality/profiles/*.json`** — 7 existing trimmed profile JSONs are the definitional shape for extensions
- **`rollup-plugin-visualizer@^7.0.1`** (devDep) — bundle-size treemap ready to consume (D-23)
- **`@tabler/icons-react`** — already imported across `src/components/`; no new dep
- **`@mantine/hooks` `useDisclosure`** — Phase 33 D-09 session-only pattern; Phase 34 uses localStorage instead (D-19)

### Established Patterns
- **Per-module contract test** (Phase 33 D-17) — adding a module = adding a test row. Phase 34 extends by 14.
- **Commit cadence** (Phase 33 D-20/D-21) — each plan ends green; no broken intermediate states
- **Design tokens** — `primaryColor: 'indigo'`, `primaryShade: 6`, `defaultRadius: 'md'` — preserved; new `MantineColorsTuple`s obey these
- **Trimmed profile JSON shape** — `{ url, name, type, snapshot.element[{ path, min, max, mustSupport }] }` matches existing base profiles
- **Partition + Collapse UI** (Phase 33 D-08/D-12) — extension rendering infrastructure already in place

### Integration Points
- **`MII_MODULES` array** — single source of truth; 14 append-only entries trigger all three render sites (Tabs, Dashboard, Timeline)
- **`MiiModule.icon` field** — new schema field (Phase 34 Plan 34-02 adds to interface; Plan 34-04 fills the values)
- **`scripts/` directory** — empty today; new `fetch-mii-profiles.mjs` is the first entry
- **`package.json` `prepare` hook** — first write (not currently present); owns the fetch-on-install contract
- **`src/quality/profiles/extensions/`** — new sub-directory, parallel to the base profiles at parent level
- **Phase 33 D-17 contract test** — extensible via new table rows; Phase 34's primary test-surface anchor

</code_context>

<specifics>
## Specific Ideas

- **ROADMAP-locked palette family names** (`oncology`, `imaging`, `genetics`, `pathology`, `bioanalysis`, `administration`, `patient-reported`) — do not rename
- **Pre-GA packages** Kardiologie `2026.0.0-alpha.2` + Symptom `2024.0.0-ballot` — bundle as-latest-available with `console.info` warning (not `console.warn` — pre-GA is expected, not an error)
- **MIT license field stays** — `package.json` `license` remains `MIT`; LICENSE file appendix documents CC-BY-4.0 for bundled profiles only
- **Base 7 colors untouched** — `blue`, `indigo`, `teal`, `violet`, `pink`, `cyan`, `orange` — no renames, no palette overrides
- **localStorage key versioned** — `patients.hideEmptyExtensions.v1` (v1 suffix already reserved in the key per project convention)

</specifics>

<deferred>
## Deferred Ideas

- **Pre-GA UI surfacing** — a "Beta" badge on Kardiologie + Symptom module tabs was considered (D-02) and explicitly REJECTED for Phase 34 (out of ROADMAP scope). Re-propose for v1.6+ if pre-GA fraction grows.
- **Automated deuteranopia tooling** — axe-core color-contrast check was considered (D-09) and deferred in favor of manual Chrome DevTools verification. Re-evaluate if the palette grows beyond 21 modules.
- **Full MII profile snapshots** — bundling non-trimmed StructureDefinitions was considered and rejected per Phase 5 Pitfall 7 (bundle-size rationale already locked). Trim-shape continues.
- **Per-type quality matrix module-color usage** — not a Phase 34 deliverable. Phase 35 UAT-FU-05 consumes the palette retroactively; no forward-dep lock.
- **Cohort-scoped empty-state computation** — Phase 34 empty-state is per-patient only. Cohort-scoped dimming is out of scope.

### Reviewed Todos (not folded)
(None reviewed — no matching todos in the backlog at context-gathering time.)

</deferred>

---

*Phase: 34-14-mii-extension-modules-palette-bundled-profiles*
*Context gathered: 2026-04-24*
