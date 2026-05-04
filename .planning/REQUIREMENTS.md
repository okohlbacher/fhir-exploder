# Requirements: FHIR Exploder v1.8

**Defined:** 2026-05-04
**Core Value:** Connect to a Blaze FHIR server and make its contents human-readable and navigable — from patient-level clinical views down to raw FHIR JSON — without requiring deep FHIR expertise to understand what's in there.

## v1.8 Requirements

### JSON Peek Drawer

- [ ] **PEEK-01**: User can press `J` on a focused list row to open a 420px right-side drawer with full FHIR JSON, without navigating away or changing the URL
- [ ] **PEEK-02**: `Esc` closes the drawer and returns focus to the originating row; pressing `J` on a different row swaps drawer content without unmounting the drawer
- [ ] **PEEK-03**: `Enter` while drawer is open (and `[Open full →]` button) navigates to full resource detail at JSON mode (`/explorer/:type/:id?mode=json`)
- [ ] **PEEK-04**: `Cmd/Ctrl+click` on any reference chip opens the drawer with the referenced resource (resolved via Phase 47 cache); failed resolution shows inline "Reference unresolvable" state — no toast
- [ ] **PEEK-05**: Drawer is reachable from at least 4 surfaces by milestone close: Explorer table, Patients list, IncomingReferencesPanel cards, Human-mode reference rows
- [x] **PEEK-06**: `JsonViewer` component is extracted from `DeveloperJsonView` and shared between peek drawer and mode 4 — zero duplicate syntax-highlighter implementations (grep-provable)

### 4-Mode Resource Shell

- [ ] **SHELL-01**: `ResourceDetailPage` replaces current 2-tab layout with a 4-mode switcher (`Summary | Human | Graph | JSON`); keyboard shortcuts `1`/`2`/`3`/`4` with input-focus guard; selected mode persists in URL `?mode=` param
- [ ] **SHELL-02**: Summary mode (mode 1, default) renders `summarizeResource(r).primary` as heading + key-fields property table (4–6 fields, type-specific registry for 8 R4 resource types + generic fallback) + "References out" + "Referenced by" side cards
- [ ] **SHELL-03**: Graph mode (mode 3) lazy-loads existing Phase 49 `ResourceGraphView`; `/explorer/:type/:id/graph` route redirects to `?mode=graph`
- [ ] **SHELL-04**: JSON mode (mode 4) adds Copy, Download, top-right validation chip, and "Open in fhir-validator" action link; line numbers in JSON body

### Explorer Improvements

- [ ] **EXPL-01**: Explorer list table adds a Summary column as the leftmost data column (primary bold, secondary dim/mono via `summarizeResource()`)
- [ ] **EXPL-02**: List density control (Cards / Table / Compact) via SegmentedControl; preference persists to `localStorage` keyed `explorer.density.v1`
- [ ] **EXPL-03**: JSON peek drawer wired to all Explorer list rows (`J` on focused row); depends on PEEK-01..06

### Sidebar v2

- [ ] **SIDE-01**: Sidebar restructured into two sections — **Browse** (Dashboard, Explorer with Lenses sub-list: Patients, Practitioners, MII modules) / **Audit** (Quality, Cohorts); Server card and footer preserved; v1.4 active-row `2-px indigo left rail + white background` styling preserved
- [ ] **SIDE-02**: Cohorts entry appears under Audit section (sidebar IA only; `/quality/cohorts` route unchanged)
- [ ] **SIDE-03**: Expert toggle (`Switch` in sidebar footer) persists to `localStorage` keyed `sidebar.expertView.v1`; when ON, JSON becomes default mode for new resource opens and raw search params appear in Explorer
- [ ] **SIDE-04**: ⌘K command palette via Mantine Spotlight (already installed as peer dep); sidebar shows a fake-search-input trigger; registered commands cover resource types, saved cohorts, settings shortcuts

### Patients-as-Lens

- [ ] **LENS-01**: `/patients` route preserved; Patients list renders through Explorer chrome; breadcrumb reads `Explorer › Patients lens`; sidebar highlights "Patients" under Browse > Explorer > Lenses
- [ ] **LENS-02**: Patient detail uses unified `ResourceDetailPage` shell; `PatientHeaderCard` "Raw JSON" modal removed (mode 4 covers it); MII module tabs preserved within Summary mode

### UAT Backlog

- [ ] **UAT-01**: All deferred `HUMAN-UAT.md` items from Phases 42–49 verified against live Blaze (pass / fail / known-issue); originating `nyquist_compliant` flags updated; final report written

## Out of Scope

| Feature | Reason |
|---------|--------|
| STACK-01 (Mantine 9 / React 19 upgrade) | Deferred indefinitely per user decision 2026-05-04; bottleneck remains `@medplum/react` `@mantine/core: ^8.0.0` peer pin |
| Write operations (create/update/delete FHIR resources) | Read-only explorer per PROJECT.md core constraint |
| Hover-peek 4-line JSON preview tooltip on reference chips | Polish item; deferrable beyond v1.8 |
| Collapsible sidebar (icon-only mode) | Not in design handoff |
| Per-user favorites / pinned resources | Local-only tool, no user accounts |
| Virtualized scrolling (TanStack Virtual) | Pagination alone sufficient; YAGNI |
| JSON editor / inline edit in mode 4 | Read-only explorer |
| Mode 5+ in resource shell | Design closes at 4 modes |
| Drag-to-reorder sidebar sections | Over-engineered for 6-entry sidebar |
| User-customizable lens list | Lenses are curated (Patients / Practitioners / MII modules) |
| Keyboard shortcut `g d` / `g e` / `g p` global nav shortcuts | Polish item; not in design handoff |
| CapabilityStatement-driven reverse-reference catalog expansion | Curated catalog from Phase 48 carries forward; auto-discovery deferred |

## Design Decisions (pending — resolve at phase planning)

| Decision | Options | Research recommendation |
|----------|---------|------------------------|
| Drawer `trapFocus` | `false` (design handoff spec) vs `true` + `withOverlay={false}` (a11y-safe) | `trapFocus={true}` + `withOverlay={false}` — preserves keyboard/SR contract while keeping lightweight visual |
| Mode switcher widget | `SegmentedControl` (design handoff spec) vs `Tabs variant="pills"` (keepMounted free, ARIA tablist semantics) | Tabs variant pills — avoids manual keepMounted and is more accessible |
| Global hotkey ownership | PEEK phase vs pre-PEEK foundation plan | Single shared `useShortcuts` module owned by PEEK phase 1 |
| Spotlight resource-type list population | Eager (all types) vs lazy (text ≥ 2 chars) | Lazy if CapabilityStatement returns >40 types |

## Traceability

| Requirement | Phase | Status |
|-------------|-------|--------|
| PEEK-01 | Phase 52 | Pending |
| PEEK-02 | Phase 52 | Pending |
| PEEK-03 | Phase 52 | Pending |
| PEEK-04 | Phase 53 | Pending |
| PEEK-05 | Phase 53 | Pending |
| PEEK-06 | Phase 52 | Complete |
| SHELL-01 | Phase 54 | Pending |
| SHELL-02 | Phase 54 | Pending |
| SHELL-03 | Phase 54 | Pending |
| SHELL-04 | Phase 54 | Pending |
| EXPL-01 | Phase 55 | Pending |
| EXPL-02 | Phase 55 | Pending |
| EXPL-03 | Phase 55 | Pending |
| SIDE-01 | Phase 56 | Pending |
| SIDE-02 | Phase 56 | Pending |
| SIDE-03 | Phase 56 | Pending |
| SIDE-04 | Phase 56 | Pending |
| LENS-01 | Phase 57 | Pending |
| LENS-02 | Phase 57 | Pending |
| UAT-01 | Phase 58 | Pending |

**Coverage:**
- v1.8 requirements: 20 total
- Mapped to phases: 20 ✓
- Unmapped: 0

---
*Requirements defined: 2026-05-04*
*Last updated: 2026-05-04 — roadmap created, all 20 requirements mapped to Phases 52–58*
