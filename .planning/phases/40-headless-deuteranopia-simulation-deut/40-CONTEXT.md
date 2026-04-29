# Phase 40: Headless deuteranopia simulation in Vitest (DEUT) — Context

**Gathered:** 2026-04-29
**Status:** Ready for planning
**Mode:** `--auto` (decisions auto-selected with recommended defaults)

<domain>
## Phase Boundary

Build a CI-runnable color-vision discriminability gate that uses a pure-JS Brettel/Machado deuteranopia simulation matrix to verify that all 21 MII module adjacent pairs remain visually discriminable under deuteranopia. The test runs as part of `npm test` and blocks any future palette/icon change that would collapse pair discriminability. Closes Phase 37's deferred clause (DEUT-01) without requiring a Chrome DevTools manual capture session.

**This phase is test-infrastructure only.** No production code changes. No new runtime dependencies. The deliverable is one new test file + one new utility module + retroactive annotations on Phase 37's EMPIRICAL.md.

</domain>

<decisions>
## Implementation Decisions

### Simulation library
- **D-01 (algorithm + source):** Use the Machado 2009 deuteranopia simulation matrix (DOI 10.1109/TVCG.2009.113), implemented as a pure-JS function in a new `src/utils/colorVision.ts` utility. ~30 lines of code (3×3 matrix multiply on linearized sRGB). NO new npm dependency — avoids bundle bloat and gives full control over the math. Cite the source paper in a header comment.
- **D-02 (severity level):** Severity 1.0 (full deuteranopia, not partial deuteranomaly). Phase 37 paper analysis used full severity for borderline-pair predictions; Phase 40 must match for traceability.

### Color distance metric
- **D-03 (metric):** ΔE2000 (CIE2000) — perceptually uniform, more accurate than CIE76 for borderline judgments. Implemented as a second pure-JS function in `src/utils/colorVision.ts` (~80 lines; well-documented reference implementation in chroma-js source — port without dependency). Despite the larger implementation, ΔE2000 is the right call for the borderline pairs (#7 mikrobiologie↔molekulargenetik HIGH, #12 pro↔seltene MEDIUM-HIGH) where ΔE76 over-rejects on hue rotation.
- **D-04 (threshold):** Pass threshold ΔE2000 ≥ 5.0 (clearly distinguishable per Sharma 2005 / ISO/CIE 11664-6). Below 5.0 fails the test. Borderline pairs may sit in the 5.0–10.0 range; document the actual measured values in test output for trend analysis.

### Fixture / RGBA capture
- **D-05 (rendering pattern):** Render the actual components (Dashboard tile grid, Patient-detail tab row, ClinicalTimeline) via `@testing-library/react` + JSDOM (already in stack). Extract the rendered color tokens by reading the CSS-applied `backgroundColor` / `color` styles from each tile/badge/timeline-marker element. NO offscreen canvas, NO Puppeteer, NO Playwright — JSDOM's computed-style API is sufficient because Mantine's color tuples resolve to concrete hex values via the theme.
- **D-06 (token extraction shortcut):** As a faster fallback, the test can ALSO read `MII_MODULES[i].badgeColor` directly + `theme.colors[badgeColor][6]` (Mantine's default mid-shade index) — bypassing the render step. This is the recommended path: pull the 21 module colors directly from the theme + mii-modules.ts, simulate deuteranopia, compute ΔE2000 per pair. Render-then-extract is the verification fallback if direct extraction misses any visual context (icons + colors combined). Plan: do BOTH — direct token extraction is the primary assertion; render-extraction is the secondary check.
- **D-07 (icon discriminability):** Phase 37's analysis flagged that icon-shape + color together drive discriminability. For Phase 40, the test asserts color discriminability ALONE (via ΔE2000). Icon-shape discriminability is OUT OF SCOPE — paper analysis in `color-design-audit.md` §4b/§4c remains authoritative for icon claims. Note explicitly in test comments and in CONTEXT/SUMMARY that this gate covers ONE of the two color-vision attributes (color); icon shape remains qualitatively asserted.

### Pair scope
- **D-08 (which pairs):** All 21 adjacent pairs from Phase 37's EMPIRICAL.md §1 (7 within-family) + §2 (14 cross-family). Phase 37's EMPIRICAL.md is the authoritative pair list — Phase 40's plan extracts the 21 pair definitions from there, not by re-deriving.
- **D-09 (named borderline assertions):** Pairs #7 (mikrobiologie ↔ molekulargenetik, HIGH risk) and #12 (pro ↔ seltene, MEDIUM-HIGH risk) get explicit named test cases (`it('pair #7: mikrobiologie ↔ molekulargenetik discriminable', ...)`) so failures are immediately attributable. The other 19 pairs run under a single parameterized `it.each()` block.

### Test scaffolding
- **D-10 (test file location):** `src/__tests__/visual/deuteranopia.test.tsx` (under `src/__tests__/visual/` — new subdirectory if not exists). Reason: matches v1.5 colocation convention for cross-cutting visual tests and signals "this is visual-domain", not unit-utility.
- **D-11 (utility location):** `src/utils/colorVision.ts` — exports `simulateDeuteranopia(rgb: [number, number, number]): [number, number, number]` and `deltaE2000(lab1, lab2): number`. Co-locate with `mii-modules.ts` and `mii-icons.ts` for the MII utility cluster.
- **D-12 (parameterized format):** Use Vitest's `it.each(PAIRS)` for the 19 non-borderline pairs; the test reports each pair's measured ΔE2000 in the failure message so debugging surfaces the actual value. Threshold lives in a single `MIN_DELTA_E_DEUTERANOPIA = 5.0` constant.

### Output / debugging
- **D-13 (output format):** Vitest pass/fail is the canonical signal. ADDITIONALLY, write a JSON snapshot to `src/__tests__/visual/__snapshots__/deuteranopia-pair-deltas.json` recording each pair's measured ΔE2000 — useful for trend analysis when palette changes. Include this snapshot in the test's `expect(matchSnapshot)` so unintended palette drift surfaces in PRs.
- **D-14 (CI integration):** No special CI config needed — runs as part of `npm test`. The new test file lives in `src/__tests__/visual/` and is picked up by the existing vitest globbing.

### Phase 37 closure
- **D-15 (EMPIRICAL.md annotation):** After the test lands and passes, edit `.planning/milestones/v1.5-phases/37-*/37-EMPIRICAL.md` §1 + §2 to flip every `[deferred]` cell in the Empirical column to `[verified by deuteranopiaDiscriminability.test.ts at commit <sha>]`. Annotate the file frontmatter `status: pending → resolved` and add a `closed_by: phase-40` field.
- **D-16 (37-VALIDATION.md flip):** When Phase 40 lands, edit `.planning/milestones/v1.5-phases/37-*/37-VALIDATION.md` frontmatter `nyquist_compliant: false → true`, REMOVE the `pending: DEUT-01 in Phase 40` annotation Phase 39 added, append a dated `notes:` entry citing Phase 40 commit SHA + test file path.
- **D-17 (v1.5 audit refresh):** Same pattern as Phase 39 — refresh `.planning/milestones/v1.5-MILESTONE-AUDIT.md` to reflect that the last `tech_debt` cluster (Phase 37 deuteranopia) is now closed. After this refresh, status should flip `tech_debt → passed`.

### Claude's Discretion
- Exact test message format for parameterized assertions (e.g. `pair-${i} (${labelA} ↔ ${labelB}) discriminable`).
- Whether to also include protanopia / tritanopia simulations (paper analysis covered all three; deferred — Phase 37's deferral was specifically deuteranopia, scope here matches).
- Whether to assert ON the snapshot or alongside ΔE2000 thresholds. Recommend BOTH as belt-and-suspenders.
- ΔE2000 implementation: hand-port from chroma-js reference vs spec sheet implementation. Recommend port-from-reference (well-tested) but the planner verifies via a known-fixture test (CIEDE2000 sample data from Sharma 2005).

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Phase 37 inputs (authoritative for pair definitions + paper analysis)
- `.planning/milestones/v1.5-phases/37-phase-34-uat-empirical-capture-deuteranopia-tti/37-EMPIRICAL.md` — 21 adjacent pairs, paper-derived predictions, all `[deferred]` cells to flip
- `.planning/milestones/v1.5-phases/37-phase-34-uat-empirical-capture-deuteranopia-tti/37-VERIFICATION.md` — `gaps_found` status; the `gaps[].truth: deuteranopia capture deferred` block is what Phase 40 closes
- `.planning/milestones/v1.5-phases/37-phase-34-uat-empirical-capture-deuteranopia-tti/37-VALIDATION.md` — to be flipped `nyquist_compliant: false → true` per D-16
- `.planning/research/color-design-audit.md` (§4b deuteranopia, §4c borderline-pair attention) — paper-derived discriminability claims; Phase 40 verifies these empirically

### Code under test
- `src/utils/mii-modules.ts` — `MII_MODULES` array (21 entries with `badgeColor: string` field)
- `src/theme.ts` — Mantine theme with 7 custom `MantineColorsTuple` palettes (oncology, imaging, genetics, pathology, bioanalysis, administration, patientReported); 14 base Mantine colors fill the rest

### Test infrastructure (existing)
- `vitest.config.ts` — vitest 4.1.4 config; new test files under `src/__tests__/` are auto-discovered
- `src/setup-tests.ts` (or equivalent) — JSDOM setup; verify it exposes the computed-style API for D-05 fallback path

### Phase 39 outputs (audit chain)
- `.planning/milestones/v1.5-MILESTONE-AUDIT.md` — `re_audited: 2026-04-29T10:22:38Z`; the `closures[]` entry for Phase 39 sets the precedent for Phase 40's similar audit refresh
- `.planning/milestones/v1.5-phases/37-*/37-VALIDATION.md` — `pending: DEUT-01 in Phase 40` annotation Phase 40 must remove

### Project meta
- `.planning/REQUIREMENTS.md` — DEUT-01 acceptance criteria
- `.planning/ROADMAP.md` (Phase 40 section) — phase goal + 4 success criteria
- `./CLAUDE.md` — Vitest + @testing-library/react conventions

### External (paper-derived; cite in code comments only — no fetch needed)
- Machado et al. 2009, "A Physiologically-based Model for Simulation of Color Vision Deficiency", IEEE TVCG 15(6). DOI 10.1109/TVCG.2009.113 — RGB→deuteranopia matrix
- Sharma et al. 2005, "The CIEDE2000 color-difference formula: Implementation notes…", Color Research and Application 30(1) — ΔE2000 reference implementation + JND threshold guidance

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- **`MII_MODULES` array** (`src/utils/mii-modules.ts`) — provides the 21 module entries with `badgeColor` field; direct access avoids needing to render anything
- **`theme.colors`** (`src/theme.ts`) — Mantine theme tokens; Mantine's `theme.colors[colorName][6]` is the canonical "default shade" for each tuple
- **JSDOM + @testing-library/react** — already in stack; no new dev-deps needed

### Established Patterns
- **Tests live under `src/__tests__/`** — vitest auto-discovers; `src/__tests__/visual/` is a new but acceptable subdirectory
- **Pure-JS utilities live under `src/utils/`** — colocated with `mii-modules.ts`, `mii-icons.ts`, etc.
- **No-new-dep preference** — Phase 34 added one devDep (`fhir-package-loader`) but otherwise the project minimizes external deps. Phase 40 should add ZERO deps.

### Integration Points
- **None at runtime** — Phase 40's deliverable is a test that runs in CI. No production-code import surface changes. The new utility (`src/utils/colorVision.ts`) could later be reused by other tests but has no current production caller.

</code_context>

<specifics>
## Specific Ideas

- **Phase 37's pair list IS the source of truth.** Don't re-derive the 21 pairs; extract them programmatically from `37-EMPIRICAL.md` §1 + §2, or copy them into a `PAIRS` constant in the test file with a comment citing the source.
- **The "borderline" pairs (#7 + #12) deserve named tests** — failure messages need to surface the pair identity immediately, not as `pair-12` requiring a lookup.
- **Don't fetch the paper PDFs** — both Machado 2009 and Sharma 2005 are well-known references; implementation detail is in the formula. Cite the DOI in a header comment and provide the matrix / formula inline.
- **Snapshot delta drift** — when Phase 41+ touches the palette, the snapshot will change. That's the desired signal — review the diff in PR.

</specifics>

<deferred>
## Deferred Ideas

- **Protanopia + tritanopia simulations** — Phase 37 covered all three forms in paper analysis; deuteranopia is the most common. Adding the other two would 3× the test count (63 pairs total). Defer to v1.7+ candidate if needed.
- **Headless WebGL canvas rendering** — would give pixel-accurate post-render simulation but requires Puppeteer/Playwright (heavy). Defer; direct token extraction is sufficient for go/no-go.
- **Icon-shape discriminability test** — Phase 37 paper analysis covered icon disambiguation (claim: shape + color together cover all 21 pairs). Phase 40 covers color only. Icon-shape gate is a v1.7+ candidate (would require glyph-extraction-then-comparison, harder than color metric).
- **Color-blindness-friendly contrast for non-MII surfaces** — Dashboard non-MII tiles, Quality matrix cells, etc. Out of scope for Phase 40 (which is MII-module-specific). Could become a v1.7 broader visual-accessibility phase.

</deferred>

---

*Phase: 40-headless-deuteranopia-simulation-deut*
*Context gathered: 2026-04-29 via `/gsd-discuss-phase 40 --auto`*
