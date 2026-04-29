---
phase: 34
slug: 14-mii-extension-modules-palette-bundled-profiles
status: draft
shadcn_initialized: false
preset: none
created: 2026-04-24
---

# Phase 34 — UI Design Contract

> Visual and interaction contract for the 14 MII Extension Modules + Palette + Bundled Profiles phase.
> Consumed by gsd-planner, gsd-executor, gsd-ui-checker, gsd-ui-auditor.

---

## Design System

| Property | Value |
|----------|-------|
| Tool | none (shadcn not applicable — React/Mantine stack, Mantine is the design system) |
| Preset | not applicable |
| Component library | Mantine 8 (`@mantine/core@^8.3.18`, peer of `@medplum/react@5.1.7`) |
| Icon library | `@tabler/icons-react@^3.41.1` (already installed; tree-shakeable per-icon imports) |
| Font | IBM Plex Sans (body + heading), IBM Plex Mono (mono / tabular numerics) — preloaded via `<link>` in `index.html`, fallback `ui-sans-serif / ui-monospace` |

**Theme authority:** `src/theme.ts` `createTheme({ primaryColor: 'indigo', primaryShade: 6, defaultRadius: 'md' })` plus `src/styles/tokens.css` CSS variables (`--accent`, `--ink`, `--panel`, warm-neutral ramp). Phase 34 extends `theme.colors` with 7 new `MantineColorsTuple`s; no other theme fields change.

**Locked invariants from upstream (MUST NOT change in Phase 34):**
- Base 7 Mantine color tokens (`blue`, `indigo`, `teal`, `violet`, `pink`, `cyan`, `orange`) — not renamed, not overridden
- `primaryColor: 'indigo'` / `primaryShade: 6`
- `defaultRadius: 'md'` + `radius: { sm: '4px', md: '6px', lg: '10px' }`
- `components.Tabs.defaultProps.variant = 'pills'`
- IBM Plex font stack

---

## Spacing Scale

Declared values (Mantine's `xs/sm/md/lg/xl` string tokens map to these pixel sizes; all multiples of 4):

| Token | Value | Usage in this phase |
|-------|-------|---------------------|
| xs | 4px | Icon-to-label gap inside tab pills, Stack `gap={2}` between tile label rows |
| sm | 8px | Compact element spacing inside Drawer, chevron-to-label gap on toggles |
| md | 16px | Default Card padding, SimpleGrid row gaps, Drawer padding |
| lg | 24px | Section padding, Card padding `lg` |
| xl | 32px | Layout gaps between major sections (Summary strip → Data by Category → MII) |
| 2xl | 48px | (not used in this phase) |
| 3xl | 64px | (not used in this phase) |

**Icon sizes** (fixed — ROADMAP criterion #3 + CONTEXT D-07):

| Surface | Icon size | Rationale |
|---------|-----------|-----------|
| `ClinicalTimeline` dot marker | 14px | Inline with timeline date + summary text; replaces plain circular dot |
| `MiiModuleTabs` tab subtitle (leading) | 14px | Sits next to German module label inside pill; matches pill subtitle line-height |
| `DashboardPage` MII tile swatch | 32px | Visible iconography at glance distance inside 4-col tile grid |
| `DashboardPage` Drawer header (adjacent to label) | 20px | Mid-size — larger than inline pill (14px), smaller than tile swatch (32px) |

**Empty-state dim opacity** (fixed — ROADMAP criterion #6 + CONTEXT D-18):

| Property | Value |
|----------|-------|
| Dim opacity | `0.55` |
| Non-dim opacity | `1` (no change) |

**Exceptions:** none. All new spacing derives from Mantine string tokens — no raw px values added to component styles (grep compliance: `grep -rn 'padding: [0-9]' src/components/patients/` should stay clean).

---

## Typography

Inherits Phase 30 redesign tokens (IBM Plex Sans + Mono). Phase 34 adds zero new type scales; the four roles below cover every new render site.

| Role | Size | Weight | Line Height | Family | Where used in Phase 34 |
|------|------|--------|-------------|--------|------------------------|
| Body | 14px (`size="sm"`) | 400 | 1.45 | IBM Plex Sans | Empty-state copy, Drawer body rows, tile subtitle (secondary) |
| Label | 12px (`size="xs"`) | 600 uppercase lts 0.5px | 1.4 | IBM Plex Sans | Drawer section labels ("FHIR resource type(s)", "Server-wide count"), "Hide N empty modules" affordance |
| Heading (inline) | 14px (`size="sm"`) | 600 | 1.4 | IBM Plex Sans | Module `germanLabel` on tab pill + Dashboard tile + Drawer title |
| Tabular numeric | 20px (`size="xl"`) | 600 | 1.2 | IBM Plex Mono + `font-variant-numeric: tabular-nums` | Dashboard tile count, Drawer "Server-wide count" |

**Only two font weights declared:** 400 (body, subtitle) and 600 (labels, headings, tabular numerics). No italic, no 500/700 mixing.

**German legibility note (CONTEXT D-18 discretion):** empty-state copy is German-lang flexible. Phase 34 ships the English-like placeholder `"— no {germanLabel} data for this patient"` as locked default (see Copywriting Contract); swapping to `"— keine {germanLabel}-Daten für diesen Patienten"` is permitted during execution only if every existing `Text c="dimmed"` empty-state in `src/components/patients/` is simultaneously Germanized (consistency invariant). Default: ship English.

---

## Color

The 60/30/10 split below describes **page surface color** — separate from the per-module 21-color **badge palette** which is a semantic categorization layer on top of the neutral chrome.

### Page surface (60 / 30 / 10)

| Role | Value | Token | Usage |
|------|-------|-------|-------|
| Dominant (60%) | `oklch(99% 0.004 85)` | `--bg` | App background, behind Cards |
| Secondary (30%) | `#ffffff` + `oklch(97.2% 0.005 85)` | `--panel`, `--panel-2` | Card fills, Drawer surface, inset panels |
| Accent (10%) | `oklch(54% 0.17 262)` (Mantine `indigo.6`) | `--accent` | Active pill background, primary button fill, focus ring, active-row indicator |
| Destructive | `oklch(58% 0.16 22)` (Mantine `red.6`) | `--bad` | NOT USED in Phase 34 (no destructive actions — see Copywriting Contract) |

**Accent reserved for** (exhaustive list — this phase introduces no new accent uses):
1. Active pill background on `MiiModuleTabs` (Mantine `Tabs variant="pills"` — already in theme)
2. Primary button fill (`Drawer` "Open in Explorer" button — Mantine default primary)
3. Focus ring on interactive elements (input `:focus`, button `:focus-visible` — Mantine default)

The accent color is **NOT** used for module badges — module badges use the 21-module semantic palette below.

### Module palette (21-module semantic layer, new in Phase 34)

**Base 7 (UNCHANGED from Phase 30 — locked invariant):**

| Module key | `badgeColor` token | Mantine color family |
|------------|--------------------|----------------------|
| person | `blue` | blue |
| fall | `indigo` | indigo |
| diagnose | `teal` | teal |
| prozedur | `violet` | violet |
| consent | `pink` | pink |
| laborbefund | `cyan` | cyan |
| medikation | `orange` | orange |

**Extension 7 families (NEW — added to `theme.colors` in Plan 34-02 per CONTEXT D-04):**

| New palette key | Base hue family | Rationale |
|-----------------|-----------------|-----------|
| `oncology` | red | Cancer / radiation semantic; high-severity color |
| `imaging` | cyan (distinct from Laborbefund) | Image + scan semantic; light-blue family |
| `genetics` | grape | Distinctive non-adjacent-to-base hue; molecular/DNA semantic |
| `pathology` | violet (distinct shade from Prozedur) | Microscopy / histology; slide-purple association |
| `bioanalysis` | teal (distinct shade from Diagnose) | Lab-specimen semantic |
| `administration` | indigo (distinct shade from Fall) | Neutral admin / doc workflow |
| `patient-reported` | pink (distinct shade from Consent) | Soft / patient-voice semantic |

Each `MantineColorsTuple` = exactly 10 shades (indices 0-9); shade 6 is the primary render shade used in all three render sites; shade 1 reserved for wash / hover backgrounds if needed. Hex values are generated by the planner via the Mantine Colors Generator web tool (mantine.dev/colors-generator/), seeded from the hue family above, and committed in `src/theme.ts` with inline comments citing the WCAG audit.

**Module → palette pair assignment (CONTEXT D-05 — locked, may swap within-family only):**

| Palette family | Module pair |
|----------------|-------------|
| `oncology` | Onkologie + MTB |
| `imaging` | Bildgebung + Studie |
| `genetics` | Molekulargenetik + Seltene Erkrankungen |
| `pathology` | Pathologie + Mikrobiologie |
| `bioanalysis` | Biobank + Intensivmedizin |
| `administration` | Kardiologie + Dokument |
| `patient-reported` | Symptom + PRO |

The two modules in each palette family MUST differ by icon (see Icons table below) so deuteranopia pass through CONTEXT D-09 succeeds — same color + different icon is the discriminability contract.

### WCAG AA audit contract (CONTEXT D-06)

Per-palette measured contrast ratios committed to `.planning/research/color-design-audit.md` by Plan 34-01:

| Check | Threshold | Applies to |
|-------|-----------|-----------|
| Badge fill shade-6 against white text | ≥ 4.5:1 | Badge text-on-fill in ClinicalTimeline dot labels, pill subtitle-on-active-pill |
| Badge fill shade-6 against `#ffffff` Card background | ≥ 3:1 | Tile swatch visual separation from Card surface |
| Badge fill shade-6 against `#e7ecff` indigo active-pill background | ≥ 3:1 | Tile / Drawer swatch visibility when pill is active |

Any failing palette is tweaked (darker shade-6 seed via Mantine Colors Generator) BEFORE Plan 34-02 lands the theme extension.

---

## Copywriting Contract

All copy below is **locked** for Phase 34. Executors must not paraphrase.

| Element | Copy |
|---------|------|
| Primary CTA (Drawer "Open in Explorer") | `Open in Explorer` (unchanged from Phase 33 D-14) |
| Extension section heading (MiiModuleTabs) | `Extension modules (N)` (unchanged from Phase 33 D-08) |
| Dashboard extension toggle | `Show extension modules (N)` (unchanged from Phase 33 D-12) |
| Empty-state body (MiiModuleTab panel, dimmed) | `— no {germanLabel} data for this patient` |
| Hide-empties toggle (when empties visible) | `Hide N empty modules` |
| Hide-empties toggle (when empties hidden) | `Show N empty modules` |
| Count all-empty zero label | `(no data across any extension module)` — only rendered when every extension module is empty |
| Fetch failure copy (MiiModuleTab per-type catch) | (silent — empty array fallback; NOT a user-visible error per CONTEXT D-06 fan-out invariant) |
| Error state (existing ClinicalTimeline network failure) | `Failed to load timeline data.` (UNCHANGED — preserved from v1.4) |
| Loading state | Mantine `<Skeleton height={32}/>` × 3 (UNCHANGED — preserved from v1.4 MiiModuleTab) |
| Pre-GA package indicator | NONE (CONTEXT Deferred §Pre-GA UI surfacing — Kardiologie + Symptom ship silently, no "Beta" badge in UI) |
| Drawer section label 1 | `FHIR resource type(s)` (unchanged from Phase 33 D-14) |
| Drawer section label 2 | `Server-wide count` (unchanged from Phase 33 D-13 + D-14) |

**Destructive actions:** NONE in Phase 34. No confirmation dialogs, no `Delete` / `Remove` / `Reset` buttons introduced. Empty-state hide toggle is reversible; `localStorage.patients.hideEmptyExtensions.v1` is opaque patient-scoped state, not destructive.

**Copy substitution rules:**
- `{germanLabel}` — literal substitution from `MiiModule.germanLabel` (e.g., "Onkologie", "Bildgebung", "Kardiologie"). No translation layer.
- `{N}` — integer count, formatted via `.toLocaleString()` only if ≥ 1000 (Phase 34 ≤ 14 so always bare integer).

**Interaction language** (imperative, action-oriented):
- Toggle actions use `Show` / `Hide` verb pair consistently (never `Expand` / `Collapse`, never `Open` / `Close`)
- Navigation action uses `Open in Explorer` (never `Go to`, never `View`)
- Empty states use em-dash prefix + lowercase body for visual hierarchy (`— no {label} data for this patient`)

---

## Interaction Contract

Phase 34 introduces three new interaction primitives and preserves every Phase 33 primitive unchanged.

### 1. Module tile / tab hover

| State | Visual |
|-------|--------|
| Idle (non-empty) | `opacity: 1`, cursor `pointer` |
| Idle (empty) | `opacity: 0.55`, cursor `pointer` (still clickable — opens Drawer with 0 count) |
| Hover (non-empty) | Mantine Card `withBorder` `highlightOnHover` — inherits border-shift from theme |
| Active tab pill | Mantine `Tabs variant="pills"` active state — indigo fill, white text + icon |

### 2. Empty-state "Hide N empty modules" toggle

Location: adjacent to the existing "Show extension modules" affordance in `MiiModuleTabs` (patient detail) AND in `DashboardPage` MII section. Two toggles, both session-aware but differently-persisted:

| Surface | Persistence | Keying |
|---------|-------------|--------|
| Phase 33 `useDisclosure(false)` "Show extension modules" collapse | Session-only | No key |
| **Phase 34 NEW** `useLocalStorage` "Hide N empty modules" dim toggle | Persistent per-patient | `localStorage.patients.hideEmptyExtensions.v1` — `Record<patientId, boolean>` |

**Default state:** VISIBLE at `opacity: 0.55` (CONTEXT D-18). Missing/malformed localStorage entry → falls back to VISIBLE. Non-object stored value → treated as empty object (defensive parse per VALIDATION.md §1).

**Toggle label swaps on state change:**
- When empties visible → button reads `Hide N empty modules` (where N = count of empty extension modules for this patient)
- When empties hidden → button reads `Show N empty modules`
- When N = 0 (every extension module has data) → toggle not rendered

### 3. Drawer icon surfacing (minor addition to Phase 33 D-14)

Drawer header gains a leading 20px Tabler icon adjacent to the `germanLabel`. Zero new fetches, zero click-target change. Icon + German label render in a single `<Group gap="xs">` inside the Drawer `title` slot.

### 4. Deep-link behavior (preserved from Phase 33)

- URL `/patients/:id?tab=<extension-module-key>` → MiiModuleTabs Collapse auto-expands once (Mantine `<Collapse>` default ~200 ms animation per Phase 33 D-10)
- Empty-state dim toggle does NOT influence Collapse auto-expand — a deep-linked empty extension tab still renders its dimmed panel inside the expanded Collapse

---

## Icons (21-module complete assignment)

Rendered at 3 sizes × 3 surfaces per CONTEXT D-07. Base 7 icons locked by CONTEXT D-08; extension 14 finalized by Plan 34-01 audit (planner may swap within the semantic candidates listed).

| Module key | Category | Icon (Tabler name) | Fallback candidates |
|------------|----------|--------------------|----------------------|
| person | base | `IconUser` | — (locked) |
| fall | base | `IconBedFlat` | — (locked) |
| diagnose | base | `IconStethoscope` | — (locked) |
| prozedur | base | `IconMedicalCross` | — (locked) |
| consent | base | `IconFileSignature` | — (locked) |
| laborbefund | base | `IconFlask` | — (locked) |
| medikation | base | `IconPill` | — (locked) |
| onkologie | extension | `IconRadioactive` | `IconVirus` |
| kardiologie | extension | `IconHeartbeat` | `IconHeart` |
| intensivmedizin | extension | `IconBedFilled` | `IconEmergencyBed` |
| bildgebung | extension | `IconPhoto` | `IconScan` |
| pathologie | extension | `IconMicroscope` | — |
| mikrobiologie | extension | `IconBacteria` | `IconVirus` |
| molekulargenetik | extension | `IconDna` | `IconDna2` |
| seltene | extension | `IconPuzzle` | `IconQuestionMark` |
| symptom | extension | `IconMoodSmile` | `IconMessageReport` |
| biobank | extension | `IconTestPipe` | `IconFlaskFilled` |
| studie | extension | `IconClipboardData` | `IconReport` |
| dokument | extension | `IconFileDescription` | `IconFileText` |
| mtb | extension | `IconUsersGroup` | `IconClipboardHeart` |
| pro | extension | `IconQuestionnaire` | `IconListCheck` |

**Storage contract (CONTEXT RESEARCH §34-02):** `MiiModule.icon` is a **string** (e.g. `'IconRadioactive'`), NOT a React component reference. Each consumer (MiiModuleTabs / ClinicalTimeline / DashboardPage / Drawer) imports the 21 icons explicitly and uses a local `ICON_MAP` lookup. This preserves tree-shaking and keeps `MII_MODULES` JSON-serializable for test fixtures. Missing icon → render no icon (defensive — base-7 rows without `icon` set still work).

**Deuteranopia pass criterion** (CONTEXT D-09): every pair within a palette family (e.g., Onkologie + MTB both `oncology`) MUST differ by icon. Pathologie (`IconMicroscope`) + Mikrobiologie (`IconBacteria`) both sit in `pathology` palette → discriminable. Kardiologie (`IconHeartbeat`) + Dokument (`IconFileDescription`) both sit in `administration` palette → discriminable.

---

## Component Inventory

Components directly touched or extended in Phase 34:

| Component | Phase 34 change | Touch scope |
|-----------|-----------------|-------------|
| `src/theme.ts` | Add 7 `MantineColorsTuple` to `colors:` block; zero other field changes | Plan 34-02 |
| `src/utils/mii-modules.ts` — `MiiModule` interface | Add optional `icon?: string` field | Plan 34-02 |
| `src/utils/mii-modules.ts` — `MII_MODULES` array | Append 14 extension rows; add `icon` to all 21 rows | Plan 34-04 |
| `src/components/patients/MiiModuleTabs.tsx` | Render `IconComponent` in `TabPillLabel` leading slot (14px); add "Hide N empty modules" toggle; wire `localStorage.patients.hideEmptyExtensions.v1` | Plan 34-05 |
| `src/components/patients/MiiModuleTab.tsx` | Wrap panel in `opacity: isEmpty ? 0.55 : 1`; render empty-state copy `— no {germanLabel} data for this patient` when `resources.length === 0` AND `module.category === 'extension'` (base modules keep v1.4 copy) | Plan 34-05 |
| `src/components/patients/ClinicalTimeline.tsx` | Replace plain dot marker with `IconComponent` (14px); color inherits `moduleConfig.badgeColor` | Plan 34-04 |
| `src/components/dashboard/DashboardPage.tsx` — `renderMiiTile` | Replace plain swatch `<Box w={8} h={8}/>` with 32px `IconComponent` colored by `badgeColor` | Plan 34-04 |
| `src/components/dashboard/DashboardPage.tsx` — `Drawer` header | Add leading 20px `IconComponent` to the Drawer `title` slot | Plan 34-04 |

**Components NOT touched:** `ServerInfoCard`, `SummaryTile`, `SectionHeader`, `TimelineEntry` (already consumes `color` prop so icon add is inside `ClinicalTimeline` render logic, not the entry component itself), every `src/quality/` component, every `src/components/explorer/` component.

---

## Persistence Contract

One new localStorage key introduced:

| Key | Type | Default | Schema | Write site |
|-----|------|---------|--------|------------|
| `patients.hideEmptyExtensions.v1` | `Record<patientId, boolean>` | `{}` (empty object → all empties visible) | `{ [patientId]: boolean }` — `true` = empties hidden for this patient; `false` or missing = empties visible | `MiiModuleTabs` via `@mantine/hooks` `useLocalStorage` |

**Migration:** none. This is a first-time key per CONTEXT D-19. Malformed value parse fails defensively to `{}` (VISIBLE default).

**No PHI:** keys are patient UUIDs (already present in URL), values are booleans. No names, dates, or clinical codes stored.

**Unchanged localStorage keys** (Phase 33 and earlier, NOT touched by Phase 34): `quality.thresholds.v1`, `quality.trends.v1`, `quality.cohorts.v1`, `quality.activeCohortId.v1`, `quality.resourceTypes.v1`.

---

## States Matrix

| Render site | Loading | Error | Empty | Populated |
|-------------|---------|-------|-------|-----------|
| `MiiModuleTab` (extension) | 3× `<Skeleton height={32}/>` (unchanged) | silent per-type fallback to `[]` (CONTEXT D-06) — no user copy | `opacity: 0.55` panel + `— no {germanLabel} data for this patient` | `opacity: 1`, `<Table striped highlightOnHover withTableBorder>` with Summary / Date / Status / ID columns (unchanged from v1.4) |
| `MiiModuleTab` (base) | 3× `<Skeleton height={32}/>` (unchanged) | silent per-type fallback | `<Center py="xl"><Text c="dimmed">No {germanLabel} data found for this patient.</Text></Center>` (UNCHANGED from v1.4) | same populated render (unchanged) |
| `MiiModuleTabs` hide-empties toggle | not rendered when loading | n/a | rendered when `emptyCount ≥ 1`; label toggles `Show / Hide N empty modules` | not rendered when `emptyCount = 0` |
| `ClinicalTimeline` | 5× `<Skeleton height={60}/>` (unchanged) | red Mantine `<Alert>`: `Failed to load timeline data.` (unchanged) | `<Text c="dimmed">No clinical events recorded for this patient.</Text>` (unchanged) | `<TimelineEntry>` list with NEW per-entry icon replacing plain dot, icon color inherits `moduleConfig.badgeColor` |
| `DashboardPage` MII tile | Count = `'loading'` → `—` placeholder with `opacity: 0.55` (existing Phase 30 behavior) | n/a (count fetch failure already surfaces as undefined) | `opacity: 0.55` + `—` count (existing Phase 30 behavior) — icon still renders | `opacity: 1` + numeric count + NEW 32px icon swatch |
| `DashboardPage` Drawer | not rendered when Drawer closed | n/a | Drawer always opens — 0 count + empty type list still valid | Drawer with icon + German label header + type list + count + "Open in Explorer" button |

---

## Registry Safety

No shadcn initialization (stack is Mantine — Mantine is the design system per `src/theme.ts` and CLAUDE.md "Do NOT Use: Tailwind CSS (conflicts with Mantine's styling system. Mantine IS the design system.)"). Registry vetting gate not applicable.

| Registry | Blocks Used | Safety Gate |
|----------|-------------|-------------|
| shadcn official | none | not applicable — Mantine stack |
| third-party registries | none declared | not applicable |

**New dependencies this phase:**

| Package | Scope | Safety notes |
|---------|-------|--------------|
| `fhir-package-loader@^2.2.4` | **devDep only** — NEVER ships in browser bundle | Apache-2.0 license; verified official HL7/FHIR community loader per RESEARCH §Standard Stack. Consumed exclusively by `scripts/fetch-mii-profiles.mjs` on `prepare` npm lifecycle. Failure mode is `warn-and-continue` (CONTEXT D-13 / D-14). |
| `@tabler/icons-react` | runtime (already installed) | No new install; 21 specific icons imported by name. Tree-shaken. |
| `@mantine/hooks` `useLocalStorage` | runtime (already installed) | Existing idiom (see `src/hooks/useCohorts.ts`). |

**Asset license handling (CC-BY-4.0 bundled profiles):**
- `src/quality/profiles/extensions/*.json` — 14 trimmed MII StructureDefinition JSONs, CC-BY-4.0 licensed, attributed in `src/quality/profiles/extensions/ATTRIBUTION.md` (per-package: canonical URL, IG version, license, source URL, fetched-on timestamp)
- Root `LICENSE` appendix — append-only NOTICE-style addendum documenting bundled CC-BY-4.0 assets; MIT body preserved per CLAUDE.md License constraint
- `package.json` `license: "MIT"` — UNCHANGED (source-code license; bundled-asset license separately documented)
- `.gitattributes` — `src/quality/profiles/extensions/*.json linguist-generated=true` so GitHub diff view suppresses (git tracks them as normal)

---

## Pre-Population Provenance

| Field | Source |
|-------|--------|
| Design system (Mantine, no shadcn) | CLAUDE.md + `src/theme.ts` scan |
| Icon library (`@tabler/icons-react`) | `package.json` scan + CONTEXT D-08 |
| Font (IBM Plex) | `src/styles/tokens.css` + Phase 30 redesign tokens |
| Spacing tokens (Mantine `xs..xl`) | `src/theme.ts` + Mantine 8 defaults |
| Icon sizes (14 / 14 / 32 / 20 px) | CONTEXT D-07 + D-14 |
| Empty-state opacity 0.55 | ROADMAP success criterion #6 + CONTEXT D-18 |
| Dominant / secondary / accent hex | `src/styles/tokens.css` + Phase 30 design tokens |
| Module palette family names | ROADMAP-locked (CONTEXT D-04) |
| Module → palette pair mapping | CONTEXT D-05 |
| Base 7 icons | CONTEXT D-08 |
| Extension 14 icon candidates | RESEARCH §34-01 + CONTEXT discretion |
| Empty-state copy | CONTEXT D-18 + REQUIREMENTS.md MII-EXT-14 |
| Hide-empties toggle copy | CONTEXT D-18 |
| Drawer labels | Phase 33 D-14 (preserved) |
| localStorage key `patients.hideEmptyExtensions.v1` | ROADMAP success criterion #6 + CONTEXT D-19 |
| WCAG thresholds (4.5 / 3) | CONTEXT D-06 |
| Deuteranopia pass criterion | CONTEXT D-09 |

No user questions asked during this session — `--auto` mode per orchestrator config; all decisions resolved from upstream artifacts.

---

## Checker Sign-Off

- [ ] Dimension 1 Copywriting: PASS — 13 copy elements declared, all `{placeholder}` substitutions defined
- [ ] Dimension 2 Visuals: PASS — icon inventory × 3 sizes × 4 surfaces locked; empty-state 0.55 opacity contract declared
- [ ] Dimension 3 Color: PASS — 60/30/10 surface split declared; 21-module semantic palette declared with WCAG audit contract
- [ ] Dimension 4 Typography: PASS — 4 roles × 2 weights (400, 600) × 2 families (IBM Plex Sans, Mono) × fixed line-heights
- [ ] Dimension 5 Spacing: PASS — Mantine `xs..xl` tokens + fixed icon sizes; no raw px
- [ ] Dimension 6 Registry Safety: PASS — no shadcn; single devDep `fhir-package-loader` with license + scope declared; CC-BY-4.0 asset handling documented

**Approval:** pending (gsd-ui-checker to validate)
