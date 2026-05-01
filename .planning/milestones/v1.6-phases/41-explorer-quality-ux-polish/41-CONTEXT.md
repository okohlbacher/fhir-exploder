# Phase 41: Explorer + Quality UX polish (EXPL + QUAL-01 + QUAL-02 + QUAL-03) — Context

**Gathered:** 2026-04-29
**Status:** Ready for planning
**Mode:** `--auto` (decisions auto-selected with recommended defaults)

<domain>
## Phase Boundary

Ship four independent UX-polish improvements bundled into a single phase to share the test-suite + bundle-size gate. Each surface is small (~30-100 LOC) and touches a distinct file:

1. **EXPL-01** — Add a "Hide empty resource types" toggle to `ResourceTypeLanding.tsx`. localStorage-persisted; default off.
2. **QUAL-01** — Fix `compareRows` in `CompletenessPanel.tsx` (and equivalent panels) so rows with `pct === null` ("not-applicable") sort to the bottom regardless of sort direction. Add muted-row styling.
3. **QUAL-02** — Add a heat-column gradient on `QualityByTypeMatrix.tsx`'s Complete/Coverage/Validation/References columns: green at 100%, yellow at threshold, red below. Color supplements (does not replace) the numeric value for a11y.
4. **QUAL-03** — Add a "Download CSV" button to the matrix card. UTF-8 BOM-prefixed; sparse cells empty (NOT `0%`); filename pattern `quality-matrix-{server-host}-{YYYY-MM-DD}.csv`.

No new dependencies. No theme changes. No new contexts. Each item is a localized refactor of existing surfaces.

</domain>

<decisions>
## Implementation Decisions

### EXPL-01 — Hide empty resource types toggle

- **D-01 (control type):** Mantine `<Switch>` (NOT `<Checkbox>`). Matches the existing v1.5 toolbar idiom (e.g., the `MiiModuleTabs` "Hide N empty modules" toggle from Phase 33).
- **D-02 (placement):** Render the Switch ABOVE the resource-type list, right-aligned in a Group. Aligns with the v1.5 right-aligned filter pattern. Includes a subdued count: "Hide empty (N)" where N is the runtime count of zero-count types.
- **D-03 (default state):** Off (`false`). Existing v1.5 default behavior is "show all" — preserving this avoids a behavior surprise on existing users.
- **D-04 (localStorage key):** `explorer.hideEmptyResourceTypes.v1` per REQUIREMENTS.md EXPL-01. Use Mantine's `useLocalStorage` hook (already in stack).
- **D-05 (count source):** Use the existing `counts[type]` map already populated by `useResourceCounts` — same source the page already reads. Filter rule: `counts[type] === 0` AND not in a loading state. Loading rows always render.
- **D-06 (no zeros = no toggle UX):** When zero zero-count types exist (e.g., very rich servers), show the toggle but disabled with a tooltip "No empty types". Avoids the UI mystery of the toggle disappearing.

### QUAL-01 — N/A rows sort to bottom

- **D-07 (predicate):** A row is "N/A" when `row.pct === null`. This is the existing convention in CompletenessPanel for zero-count types. Matches REQUIREMENTS.md QUAL-01 wording exactly.
- **D-08 (sort behavior):** N/A rows sort to the END regardless of `dir` (ASC or DESC). This mirrors the existing `aSettled !== bSettled` pattern at `CompletenessPanel.tsx:62` which already pushes loading/error rows to the bottom unconditionally. Add a parallel branch BEFORE the value comparison: `if (aIsNA !== bIsNA) return aIsNA ? 1 : -1;`.
- **D-09 (multi-panel scope):** Audit `CompletenessPanel`, `CoveragePanel` (if it exists — confirmed it does NOT, only `CodingCoveragePanel`), `ValidationPanel`, `ReferencesPanel`. Apply same fix where a similar pattern exists. Per-panel verdict recorded in SUMMARY.
- **D-10 (visual indicator):** N/A rows render the metric column with a muted "—" badge (`<Text c="dimmed">—</Text>`) instead of "0%". Reuses the em-dash + dimmed convention already established by Phase 38.2's `ResourcePropertyTable` empty-state and Phase 33 D-09 within-family pair styling. NO new design tokens.
- **D-11 (regression test):** Vitest test asserts that for a fixture with mixed-N/A rows: ASC sort produces `[non-NA in ascending order, ..., NA rows]`; DESC sort produces `[non-NA in descending order, ..., NA rows]`. Same fixture exercises both directions in one `it()` block.

### QUAL-02 — Heat-column gradient on per-type matrix

- **D-12 (color scheme):** Three-stop gradient via Mantine theme tokens:
  - **Green** (`var(--mantine-color-green-1)` background + `var(--mantine-color-green-9)` text) when `value >= 100`
  - **Yellow** (`var(--mantine-color-yellow-1)` / `--yellow-9`) when `value >= threshold && value < 100`
  - **Red** (`var(--mantine-color-red-1)` / `--red-9`) when `value < threshold`
  - **Muted "—"** when `value === null` (sparse cell — same convention as QUAL-01)
- **D-13 (threshold source):** `useThresholds().isBreached(metricKey, value)` — already used at `QualityByTypeMatrix.tsx:338` for cell breach. Reuse this — do NOT introduce a parallel threshold reader. The hook already handles per-metric thresholds + the three-state override (enabled/disabled/default) from Phase 18.
- **D-14 (a11y):** Color is supplementary — the `<SortableTh>` numeric value remains the primary carrier. NO additional ARIA attributes needed (already present from Phase 35). Verify with a contrast check using existing v1.4 design audit primitives.
- **D-15 (gradient implementation):** Inline `style={{ backgroundColor: ..., color: ... }}` on the `<Table.Td>` cell. Wraps in a `<Box>` only if needed for padding. Avoid CSS-in-JS objects for this PR — keeps the diff localized.

### QUAL-03 — CSV export

- **D-16 (button placement):** Mantine `<Button leftSection={<IconDownload size={16} />}>Download CSV</Button>` in the matrix card header, right-aligned next to the existing controls. Uses `variant="subtle"` to match the matrix card's existing visual rhythm (lighter than primary actions).
- **D-17 (CSV format):** UTF-8 with BOM (`﻿` prefix) per REQUIREMENTS.md QUAL-03. Headers match visible columns: `Resource type, Complete%, Coverage%, Validation%, References%, Duplicates, Issues`. Sparse cells render empty `""` — never `0` or `0%`. Comma delimiter, double-quote escaping for any field containing `,` or `"`.
- **D-18 (filename pattern):** `quality-matrix-{server-host}-{YYYY-MM-DD}.csv`. Server-host extracted from `settings.fhir.serverUrl` via `new URL(...).host` (e.g. `localhost:8080`). Date in ISO YYYY-MM-DD form (UTC). Slashes/colons replaced with `-` in the host portion to be filesystem-safe (`localhost-8080-2026-04-29.csv`).
- **D-19 (download mechanism):** Use the same pattern as Phase 19's `downloadString` helper (`src/quality/pdfExport.ts` or similar — verify in scout) — Blob + `URL.createObjectURL` + anchor click + revoke. NO new file-saver lib. If `downloadString` doesn't exist by that name, write a tiny inline helper inside `QualityByTypeMatrix.tsx` (keeps the surface localized).
- **D-20 (which rows):** Export the CURRENT visible/sorted rows (post-filter, post-sort). What the user sees is what they get. Future enhancement (out of scope): "export all" toggle.
- **D-21 (regression test):** Test fixture with 3 rows (1 sparse, 2 populated). Assert: filename matches `quality-matrix-{host}-{YYYY-MM-DD}.csv` regex; CSV body starts with `﻿`; sparse cell renders as empty between commas; populated cells render as numeric strings without `%`.

### Cross-cutting

- **D-22 (bundle-size gate):** Per ROADMAP success criterion 5, no regression > 5 KB gz vs v1.5 baseline (606.76 KB initial-load). Capture pre/post values in SUMMARY. Existing v1.5 measure pattern is `vite build` + grep `dist/index.html` size from output. IconDownload is already in the @tabler/icons-react chunk (used by other components) — should be ~0 delta.
- **D-23 (test-suite baseline):** Phase 40 left the suite at **1105 passing / 1 failing (intentional pair #13) / 22 todo**. Phase 41 must preserve this exactly: 1105+ passing (we will add new tests), 1 failing (the same pair #13), 22+ todo. Do NOT introduce additional failures. The intentional pair #13 fail is the open follow-up for Phase 40.1.
- **D-24 (commit cadence):** One commit per REQ-ID (4 atomic commits) + 1 commit for SUMMARY.md. NOT one big commit. Each REQ-ID lands as `feat(41-XX): EXPL-01: ...` etc.

### Claude's Discretion

- Exact wording of the EXPL-01 toggle helper text ("Hide empty (N)" vs "Hide N empty types" vs "Hide empty (N=12)") — planner decides based on space.
- QUAL-02 gradient: whether intermediate `yellow-1`/`red-1` shades or `yellow-2`/`red-2` give better visual contrast at table-cell sizes — planner decides; default to shade-1 backgrounds for subtle.
- QUAL-03: should the button be `variant="subtle"` or `variant="default"` — planner picks based on existing matrix-card button styling.
- QUAL-01 muted-row styling: applies to the entire row (`<Table.Tr c="dimmed">`) or just the metric column — planner decides; default to entire row to make N/A rows visually settle to the bottom of the page.

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Source files for the 4 surfaces
- `src/components/explorer/ResourceTypeLanding.tsx` — EXPL-01 mount site
- `src/components/quality/CompletenessPanel.tsx` (line 58: `compareRows`; line 62: `aSettled` pattern to mirror) — QUAL-01 fix site
- `src/components/quality/ValidationPanel.tsx`, `src/components/quality/ReferencesPanel.tsx` — QUAL-01 audit targets
- `src/components/quality/CodingCoveragePanel.tsx` (NOT `CoveragePanel`) — QUAL-01 audit target
- `src/components/quality/QualityByTypeMatrix.tsx` (line 50: `useThresholds` import; line 338: `isBreached` consumer) — QUAL-02 + QUAL-03 mount site

### Hooks / utilities to reuse
- `src/hooks/useThresholds.ts` — QUAL-02 driver (do NOT bypass)
- `src/hooks/useResourceCounts.ts` — EXPL-01 count source
- `@mantine/hooks` `useLocalStorage` — EXPL-01 persistence
- `src/quality/pdfExport.ts` (verify exact path) — possible downloadString helper for QUAL-03

### REQ-IDs (REQUIREMENTS.md)
- `.planning/REQUIREMENTS.md` Theme 2 — EXPL-01, QUAL-01, QUAL-02, QUAL-03 acceptance criteria

### Project meta
- `.planning/ROADMAP.md` Phase 41 section — 5 success criteria including bundle-size gate
- `.planning/PROJECT.md` Current Milestone v1.6 — milestone framing
- `./CLAUDE.md` — Vitest + Mantine 8 + React 18 conventions; no new deps preference

### Prior phase patterns (for consistency)
- Phase 33 `MiiModuleTabs` "Hide N empty modules" toggle — establishes the v1.5 hide-empty pattern (look for the visual cadence + localStorage key style)
- Phase 35 `QualityByTypeMatrix` Phase-32 byType slot wiring — already in place; QUAL-02 + QUAL-03 build on it
- Phase 38.2 `ResourcePropertyTable` em-dash + dimmed convention — visual ancestor for QUAL-01 muted rows + QUAL-02 sparse cells
- Phase 19 PDF export — possible CSV download helper if `downloadString` exists there

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- **`useThresholds().isBreached`** (`src/hooks/useThresholds.ts`) — already drives QualityByTypeMatrix breach coloring at line 338. QUAL-02 extends this from binary breach (red/not-red) to a 3-stop gradient (red/yellow/green) by reading the threshold value directly.
- **`compareRows`** (`src/components/quality/CompletenessPanel.tsx:58`) — already has the right shape for the QUAL-01 fix: lines 60-62 push unsettled rows to the bottom via `aSettled !== bSettled`. The N/A fix mirrors that pattern one branch later.
- **Mantine `Switch` + `useLocalStorage`** — already in stack and used elsewhere; no new imports.
- **`@tabler/icons-react`** `IconDownload` — already imported elsewhere in the codebase (PDF export); no bundle-size impact.

### Established Patterns
- **Right-aligned controls** above lists: established by `MiiModuleTabs` (Phase 33) and `QualityByTypeMatrix` header. EXPL-01's Switch follows this idiom.
- **localStorage keys** version-suffixed: `quality.thresholds.v1`, `quality.cohorts.v1`, etc. EXPL-01's `explorer.hideEmptyResourceTypes.v1` matches.
- **`pct === null` as N/A**: already in CompletenessPanel's data layer; QUAL-01 just teaches `compareRows` to honor it.
- **Dimmed em-dash for empty cells**: Phase 38.2 + Phase 33 + Phase 35 (per-type matrix sparse cells). QUAL-01 + QUAL-02 reuse the same convention.

### Integration Points
- **None new at runtime.** All four surfaces consume already-rendered data from existing contexts. No new fetches. No new state machines.

</code_context>

<specifics>
## Specific Ideas

- **The bundle-size gate (5 KB ceiling)** is tighter than the v1.6 milestone gate (60 KB). This is intentional per ROADMAP — small UX changes shouldn't move the bundle. If the gate fires, investigate before relaxing.
- **Phase 40's intentional failing test (pair #13)** stays red across this phase. Don't try to "fix" it here — Phase 40.1 owns that.
- **No CoveragePanel exists** — only `CodingCoveragePanel`. The QUAL-01 audit list is therefore: `CompletenessPanel`, `CodingCoveragePanel`, `ValidationPanel`, `ReferencesPanel` (4 panels, not 5).
- **QUAL-03 download mechanism** should be a 5-line inline helper at minimum — DO NOT add a `file-saver` dep.

</specifics>

<deferred>
## Deferred Ideas

- **"Export all rows" toggle for CSV** (vs current sorted/filtered set). Mentioned in REQUIREMENTS.md QUAL-03 only as the implicit choice ("visible columns"); explicit "export all" is a v1.7+ candidate.
- **Heat-column gradient on Counts table** (not just the per-type matrix card). Same visual treatment could extend to the other Counts-tab table, but ROADMAP scopes QUAL-02 to the matrix card only. Defer.
- **Sortable column headers in the CSV file** (preserving sort direction marker in the export). Out of scope; CSV is data-only.
- **Per-row "Show details" expansion in QualityByTypeMatrix** to drill into the sparse cells. Out of scope.

</deferred>

---

*Phase: 41-explorer-quality-ux-polish*
*Context gathered: 2026-04-29 via `/gsd-discuss-phase 41 --auto`*
