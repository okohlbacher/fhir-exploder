# Phase 35: Phase-30 UAT Follow-ups + Per-Type Quality Matrix - Research

**Researched:** 2026-04-25
**Domain:** React component cleanup + per-type quality data plumbing (FHIR R4 explorer + quality dashboard)
**Confidence:** HIGH

## Summary

Phase 35 closes four Phase-30 UAT gaps (UAT-FU-01/02/03/05) on top of the Phase-32 7-context architecture. Three of the four follow-ups are mechanical and parallel-safe (UAT-FU-01 explorer per-type extractor, UAT-FU-02 HumanReadable extension cleanup, UAT-FU-03 mode toggle reduction). UAT-FU-05 (per-type quality matrix) is architecturally larger because it requires extending each per-metric Phase-32 context with a `byType` slot, then migrating the four producers that have a per-type stage (Completeness, Coverage, Validation, References) plus deriving the Duplicates per-type map from the existing breakdown.

**The single largest architectural surprise:** ValidationPanel and ReferencesPanel are SINGLE-TYPE producers — the user picks one resource type via Mantine `Select`, then runs one check. They do NOT iterate every resource type. This means the matrix's `Validation %` and `References %` columns can only be populated AFTER the user has manually run those checks for each type — the columns will be sparse on first load. Plan must surface this honestly and not pretend the matrix is "auto-populated" for those two metrics. (Phase 32 documents the same shape for `DuplicatesPanel.tsx:102` — the user runs one type, contributes one entry to `breakdown.hashByType`, runs another type, gains another entry, etc.)

**Primary recommendation:** Ship as 4 plans in 2 waves per CONTEXT.md D-01/D-02. Plan 35-01 (UAT-FU-03 SegmentedControl/Tabs cleanup) goes first as the warm-up; Plans 35-02 + 35-03 run parallel-safe in Wave 1 (different files); Plan 35-04 runs Wave 2 with byType extension + matrix card. Strict adherence to D-26 RED-then-GREEN commit pattern for UAT-FU-01.

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions

**Plan Decomposition + Ordering**
- **D-01:** Ship as 4 plans, mostly parallel-safe. Plan 35-01 (UAT-FU-03), 35-02 (UAT-FU-01), 35-03 (UAT-FU-02), 35-04 (UAT-FU-05). 35-01 first; 35-04 last.
- **D-02:** Wave structure: 35-01/02/03 share Wave 1 (parallel). 35-04 takes Wave 2.

**UAT-FU-01: Explorer Date/Status Per-Type Extractor**
- **D-03:** TDD baseline-drift pattern non-negotiable. Two commits: (a) RED tests, (b) GREEN extractor + flipped assertions + baseline updates together.
- **D-04:** Per-type extractor map at `src/components/explorer/SearchResultsPage.tsx`:
  - `Patient` → date: `birthDate`, status: `active`
  - `Condition` → date: `onsetDateTime`, status: `clinicalStatus`
  - `Observation` → date: `effectiveDateTime`, status: `status`
  - `MedicationStatement` → date: `effectiveDateTime`, status: `status`
  - `Encounter` → date: `period.start`, status: `status`
  - `Procedure` → date: `performedDateTime`, status: `status`
  - Default fallback: keep current `getResourceDate()` logic; status falls to empty string.
- **D-05:** Status normalization: FHIR `code` and `boolean` types render directly. `Patient.active === false` → `"inactive"`; `true` → `"active"`. Localization out of scope.

**UAT-FU-02: HumanReadableView Extension Cleanup**
- **D-06:** Identifier-system → Mantine Tooltip on the value cell.
- **D-07:** Address-extension JSON → Mantine Modal (`[View]` button opens Modal showing formatted JSON).
- **D-08:** Bottom "Extensions" section in `HumanReadableView.tsx` collects ALL `Resource.extension[]` entries. One row per unique `url`, columns: `URL fragment | Value summary | [View]`.
- **D-09:** `ResourcePropertyTable.tsx` parallel updates — same Tooltip + Modal idioms.

**UAT-FU-03: ResourceDetailPage Mode Cleanup**
- **D-10:** SegmentedControl reduction 4 → 3 options: `Clinical | Raw JSON | JSON` (renamed from Developer); REMOVED: `Clinical + raw`. *(Researcher note: actual implementation uses `<Tabs>` not `SegmentedControl`, and currently has 3 tabs not 4 — see Pitfall P-09.)*
- **D-11:** `ClinicalRawView.tsx` deletion mandatory; `grep -rn "ClinicalRawView" src/ --include="*.ts" --include="*.tsx"` returns 0 hits.
- **D-12:** Active-mode default preserved (`Clinical` per code scout; actual code uses `human-readable`).
- **D-13:** Settings-key cleanup: if any `localStorage` key persists active mode, migrate `"clinical-raw"` → `"clinical"` on read. *(Researcher note: NO localStorage key exists — see Pitfall P-10.)*

**UAT-FU-05: Per-Type Quality Matrix Card**
- **D-14:** Per-metric context `byType` slot extension. Each of 7 contexts in `src/quality/metrics/*.tsx` gains `byType: Record<string, number>` + `setByType` setter. DuplicatesContext exposes existing `breakdown.hashByType` as `byType` derived getter.
- **D-15:** Producers populate `setByType`: `useCompletenessReport.ts`, `useCodingCoverage.ts`, `ValidationPanel.tsx`, `ReferencesPanel.tsx`. Plausibility + LabRanges NOT migrated. DuplicatesPanel keeps current `contribute()`.
- **D-16:** Matrix card placement: inside or sibling-card under `ResourceCountsPanel.tsx`, below counts table. `<Card withBorder radius="lg" padding="lg">`. Title: "Quality by resource type".
- **D-17:** 7 columns: `Resource type | Complete % | Coverage % | Validation % | References % | Dup | Issues | chevron`. Plausibility + LabRanges columns EXCLUDED.
- **D-18:** Threshold breach coloring uses `isBreached(metricKey, value)` from `useThresholds()` hook. Cell `<Text c={isBreached(...) ? 'red.6' : undefined}>`; fill bar `color="red"` instead of default. Consistent with `OverviewStrip`.
- **D-19:** Row click → navigate to `/quality?tab=<metric>&type=<resourceType>`. Target metric: first non-empty metric column for that row. If all metrics empty → `/explorer/<resourceType>`.
- **D-20:** Sorting: every column sortable via existing `<SortableTh>`. Default: `Issues DESC, Resource type ASC`.
- **D-21:** Row inclusion: ONE row per resource type with count > 0. Empty types omitted. Skeleton rows while counts loading.
- **D-22:** No new FHIR fetches. Read-projection over already-fetched per-metric `byType` maps + `useResourceCounts`.

**Test Strategy**
- **D-23:** `npm test` ≥ 998 passing / 0 failing (Phase 34 baseline). Conservative target: ≥ 1015 post-Phase-35.
- **D-24:** `npx tsc -b --noEmit` clean + `npm run build` clean at end of every plan.

**Commit Cadence**
- **D-25:** Each plan ends with green test suite + clean tsc.
- **D-26:** Plan 35-02 must commit RED tests in a separate commit from GREEN extractor + flipped assertions.

### Claude's Discretion
- Final URL fragment trimming heuristic for the bottom-Extensions section header (D-08).
- Whether matrix sort default is `Issues DESC, Resource type ASC` or `Resource type ASC` only.
- Whether plan 35-04 ships matrix card and `byType` extension as one plan or splits them — currently D-01 keeps them together.

### Deferred Ideas (OUT OF SCOPE)
- CSV export of per-type matrix — v1.6+
- Heat-column gradient on the matrix — v1.6+
- German localization of Date/Status status enum values — out of scope; v1.6+ if requested
- Plausibility + LabRanges in the matrix — out of ROADMAP scope
- Per-type drill-down INSIDE the matrix card (expandable rows) — chevron-to-existing-panel is simpler
- Pre-probe extension-module counts on Patient detail — separate v1.6+ candidate
</user_constraints>

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|------------------|
| UAT-FU-01 | Explorer Date/Status per-resource-type extractor (TDD) | FHIR R4 field paths verified for all 6 types (§ FHIR R4 Field Path Verification); current extractor at `SearchResultsPage.tsx:62-76` (HIT location). Existing test infrastructure (vitest 4.1.4 + jsdom + @testing-library/react). |
| UAT-FU-02 | HumanReadableView extension cleanup (Tooltip + Modal) | Tooltip pattern in `PatientHeaderCard.tsx:152` (`withArrow`, default `withinPortal: true`). Modal pattern in same file lines 182-191. ResourcePropertyTable falls through to `JSON.stringify` at line 184 — confirms address-extension JSON dump source. |
| UAT-FU-03 | ResourceDetailPage mode cleanup + ClinicalRawView deletion | `ResourceDetailPage.tsx:182-202` actually uses `<Tabs>` (not `SegmentedControl`); 3 current tabs (not 4); `localStorage` key for active mode does NOT exist (D-13 simplification). 7 grep hits in production + tests for `ClinicalRawView` (§ Canonical Refs). |
| UAT-FU-05 | Per-type quality matrix card + byType slot extension | Phase-32 contexts: 7 files at `src/quality/metrics/*.tsx`. `useCompletenessReport.ts:30-55` already produces per-type maps via `useSampleWalker`. `isBreached(metricKey, value)` curried hook in `useThresholds.ts:89` (matches D-18). `useResourceCounts` returns `Record<string, CountValue>` (D-21 row source). |
</phase_requirements>

## Project Constraints (from CLAUDE.md)

| Directive | Source | Impact on Phase 35 |
|-----------|--------|---------------------|
| Mantine 8 only (Mantine 9 forbidden) | CLAUDE.md "Do NOT Use" | Tooltip / Modal / Progress / Tabs / Card all from `@mantine/core@^8.3.18` only. |
| No Tailwind | CLAUDE.md "Do NOT Use" | Use Mantine theme tokens + CSS modules only. |
| MIT license preserved | CLAUDE.md "License" | New files inherit MIT; no new licenses. |
| MUST use GSD entry points before Edit/Write | CLAUDE.md "GSD Workflow Enforcement" | Phase 35 already gated through `/gsd-research-phase`. |
| `@tanstack/react-query` forbidden | CLAUDE.md "Do NOT Use" | The matrix re-uses Phase-32 contexts; do NOT pull in react-query for byType caching. |
| `@medplum/fhirtypes` for typing | CLAUDE.md "Type System" | Use `Patient`, `Condition`, `Encounter`, `Observation`, `Procedure`, `MedicationStatement` from `@medplum/fhirtypes` for the extractor (§ FHIR R4 Field Path Verification). |

## Standard Stack

### Core (already installed — no new deps)

| Library | Version | Purpose | Why Standard | Source |
|---------|---------|---------|--------------|--------|
| `@mantine/core` | ^8.3.18 | Tooltip, Modal, Progress, Tabs, Card, Code, Stack, Group, Table, Text, Badge | Required peer of `@medplum/react`; already in `package.json` | [VERIFIED: package.json] |
| `@mantine/hooks` | ^8.3.18 | `useDisclosure` (Modal open/close), `useLocalStorage` | Already in use across project | [VERIFIED: package.json] |
| `@medplum/fhirtypes` | ^5.1.7 | `Patient`, `Condition`, etc. for the extractor | Project standard for FHIR R4 typing | [VERIFIED: package.json] |
| `vitest` | ^4.1.4 | Test runner | Project test framework | [VERIFIED: package.json + `vitest.config.ts`] |
| `@testing-library/react` | ^16.3.2 | Render + assertion | Project standard | [VERIFIED: package.json] |
| `@tabler/icons-react` | ^3.41.1 | `IconChevronRight` for matrix row | Already in use | [VERIFIED: package.json] |

### NOT Adding

- No new runtime deps. Phase 35 ships entirely on the existing Mantine 8 + Medplum + Tabler stack. [CITED: CONTEXT.md `<specifics>` line 193]

**Version verification** (`npm view ...`):
- All listed versions verified against installed `package.json` (committed). No registry round-trip needed; project versions align with Phase 34 baseline.

## Architecture Patterns

### Recommended Project Structure

```
src/
├── components/
│   ├── explorer/
│   │   ├── SearchResultsPage.tsx       # UAT-FU-01 extractor host
│   │   ├── HumanReadableView.tsx       # UAT-FU-02 wrapper
│   │   ├── ResourcePropertyTable.tsx   # UAT-FU-02 row renderer
│   │   ├── ResourceDetailPage.tsx      # UAT-FU-03 Tabs host
│   │   └── ClinicalRawView.tsx         # UAT-FU-03 DELETE
│   └── quality/
│       ├── ResourceCountsPanel.tsx     # UAT-FU-05 sibling host
│       ├── QualityByTypeMatrix.tsx     # UAT-FU-05 NEW (proposed name)
│       ├── SortableTh.tsx              # reused for column sort
│       └── MetricTile.tsx              # reference for isBreached pattern
├── quality/
│   ├── metrics/
│   │   ├── CompletenessContext.tsx     # +byType, +setByType
│   │   ├── CoverageContext.tsx         # +byType, +setByType
│   │   ├── ValidationContext.tsx       # +byType, +setByType
│   │   ├── ReferencesContext.tsx       # +byType, +setByType
│   │   ├── PlausibilityContext.tsx     # NO change (excluded from matrix)
│   │   ├── LabRangesContext.tsx        # NO change (excluded from matrix)
│   │   ├── DuplicatesContext.tsx       # +byType derived getter only
│   │   └── index.tsx                   # re-export
│   └── thresholds.ts                   # isBreached pure function
└── hooks/
    ├── useCompletenessReport.ts        # +setByType call
    ├── useCodingCoverage.ts            # +setByType call
    └── useThresholds.ts                # isBreached(key, value) curried
```

### Pattern 1: Per-Metric Context byType Extension (UAT-FU-05)

**What:** Extend each Phase-32 context interface with a parallel `byType: Record<string, number>` slot + setter. Existing `value` slot is preserved untouched.

**When to use:** ALL of Completeness, Coverage, Validation, References. NOT Plausibility / LabRanges (excluded from matrix per D-17). Duplicates uses derived getter, no new state.

**Example** (CompletenessContext after extension):
```typescript
// Source: src/quality/metrics/CompletenessContext.tsx (extended)
export interface CompletenessRollup {
  value: number | undefined;
  byType: Record<string, number>;            // NEW
  set: (value: number | undefined) => void;
  setByType: (byType: Record<string, number>) => void;  // NEW
}

const CompletenessCtx = createContext<CompletenessRollup | null>(null);

export function CompletenessProvider({ children }: { children: ReactNode }) {
  const [value, set] = useState<number | undefined>(undefined);
  const [byType, setByType] = useState<Record<string, number>>({});  // NEW
  const memoed = useMemo<CompletenessRollup>(
    () => ({ value, byType, set, setByType }),
    [value, byType],
  );
  return <CompletenessCtx.Provider value={memoed}>{children}</CompletenessCtx.Provider>;
}

export function useCompletenessRollup(): CompletenessRollup {
  const ctx = useContext(CompletenessCtx);
  if (!ctx) return { value: undefined, byType: {}, set: () => {}, setByType: () => {} };
  return ctx;
}
```

**Pattern preserves Phase-32 invariants:**
- Provider value wrapped in `useMemo` (D-07 in 32-CONTEXT.md)
- No-op fallback outside provider (matches existing `:179-200` shape)
- Facade `useQualityMetrics()` does NOT need updating because matrix consumes per-metric hooks directly

### Pattern 2: Producer Migration — Already-Mapped Producers (UAT-FU-05)

**What:** `useCompletenessReport` and `useCodingCoverage` already iterate every effective type via `useSampleWalker`. They already have a per-type map (`reports: Record<string, PerTypeReport<T>>`). Migration is mechanical: derive `Record<string, number>` from `reports` and call `setByType`.

**Example:**
```typescript
// Source: src/hooks/useCompletenessReport.ts (extended)
const { set: setCompleteness, setByType: setCompletenessByType } = useCompletenessRollup();

useEffect(() => {
  const values = Object.values(reports);
  const stillWaiting = values.length > 0 && values.some((r) => r === 'loading');
  // existing rollup math...
  if (pcts.length === 0) { /* ... */ return; }
  setCompleteness(Math.round(pcts.reduce((a, b) => a + b, 0) / pcts.length));

  // NEW: per-type map
  const byType: Record<string, number> = {};
  for (const [type, r] of Object.entries(reports)) {
    if (r === 'loading' || r === 'error' || !r || typeof r !== 'object') continue;
    if (r.total > 0) byType[type] = Math.round((r.populated / r.total) * 100);
  }
  setCompletenessByType(byType);
}, [reports, setCompleteness, setCompletenessByType]);
```

### Pattern 3: Producer Migration — Single-Type Producers (UAT-FU-05)

**What:** `ValidationPanel` and `ReferencesPanel` are SINGLE-TYPE — user picks one resource type via Mantine `<Select>`, then runs check. Pattern: when run completes, MERGE the new per-type entry into the existing `byType` map (don't replace).

**Example:**
```typescript
// Source: src/components/quality/ValidationPanel.tsx (extended)
const { set: setOverallValidation, byType, setByType } = useValidationRollup();

useEffect(() => {
  if (run.status !== 'complete' && run.status !== 'cancelled') return;
  const affected = new Set(allNormalizedIssues.map((i) => i.resourceId)).size;
  const pct = percentClean(affected, run.progress.total);
  setOverallValidation(pct);
  if (pct !== undefined) {
    // Merge — don't replace. Other types' values must persist.
    setByType({ ...byType, [resourceType]: pct });
  }
}, [run.status, run.progress.total, allNormalizedIssues, /* ... */ setByType]);
```

**Critical:** the `byType` dependency must be in the dep array but reading-stale-state risk applies — use functional setter to avoid stale closure: `setByType((prev) => ({ ...prev, [resourceType]: pct }))`. See Pitfall P-04.

### Pattern 4: TDD Baseline-Drift Commit (UAT-FU-01)

**What:** Per D-26 / D-03, the test diff and the production code change land together in commit #2 so the reviewer sees the deliberate baseline shift in one diff.

**Sequence:**
1. **Commit #1 (RED):** Add 6 test cases in `SearchResultsPage.test.tsx` (one per resource type) asserting CURRENT behavior — `getResourceDate(patient).toBe('')` and equivalent for status. Tests pass against the existing extractor.
2. **Commit #2 (GREEN):** In a single commit:
   - Replace `getResourceDate` with `getResourceDateByType(resource)` mapping switch.
   - Add `getResourceStatusByType(resource)` mirror function.
   - Update render JSX in `SearchResultsPage.tsx:402-419` to call the new functions.
   - Update the 6 tests' expected values from `''` to the actual extracted value (`'1980-01-15'`, `'active'`, etc.).

**Rationale:** Reviewer sees the SAME test file shift its assertion from "empty" to "extracted" in lockstep with the production change — the deliberate baseline drift is visible in a single PR diff. This pattern was established in Phase 32/33/34 and is non-negotiable for UAT-FU-01.

### Anti-Patterns to Avoid

- **Don't extend the facade `useQualityMetrics()` with byType** — keep the matrix on per-metric hooks only. Adding byType to the facade would force a cascade of context-wide re-renders, defeating Phase-32's whole point. (Phase 32 D-04 explicitly forbids facade growth.)
- **Don't add a setter that takes individual `(type, value)` pairs and merges internally** — the producer knows its full per-type map; pushing the full map gives the consumer a snapshot in one render frame. Per-pair setters cause React batching surprises.
- **Don't share one state symbol across providers** — Phase 32 D-06 already lockboxes this with a 7-provider smoke test. Extending byType doesn't change that risk.
- **Don't memoize the matrix row computation on `Object.values(byType)`** — reference-identity flips every render. Memo on the actual `byType` object reference instead.

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Sortable table header | Custom click + arrow icon logic | `<SortableTh>` at `src/components/quality/SortableTh.tsx` | Already shared between Completeness + Coverage panels (Phase 25 QDDEP-05) |
| Threshold breach coloring | Inline `if (value < threshold)` checks | `useThresholds().isBreached(metricKey, value)` | Hydration gate (WR-04) prevents one-frame red flicker |
| Sortable counts table primitive | New `Table` + sort state | Existing `ResourceCountsPanel` patterns | Reuse existing sort key + dir state idioms |
| FHIR resource counts per type | New `_summary=count` calls | `useResourceCounts(client, types)` | Module-scope LRU cache + concurrency-4 pool (FOUND-01) |
| FHIR field name guessing | Custom heuristic | `@medplum/fhirtypes` types ([VERIFIED]) | Compile-time validation of field paths |
| Modal open/close state | `useState<boolean>` | `useDisclosure()` from `@mantine/hooks` | Mantine standard, returns `[opened, { open, close, toggle }]` |
| URL fragment trimming for extension `url` | Custom regex | `new URL(url).pathname.split('/').pop()` or last `/` segment | Handles edge cases (trailing slash, query string) |

**Key insight:** Phase 35 is "make the existing patterns do new things," not "build new patterns." Every pattern needed already exists in the project — the work is wiring + extension.

## Common Pitfalls

### Pitfall P-01: `clinicalStatus` is `CodeableConcept`, not string

**What goes wrong:** D-04 specifies `Condition.clinicalStatus` as the status field, but rendering `String(condition.clinicalStatus)` produces `"[object Object]"`.

**Why it happens:** [VERIFIED: `node_modules/@medplum/fhirtypes/dist/Condition.d.ts`] — `clinicalStatus?: CodeableConcept`. Must access `clinicalStatus.coding?.[0]?.code` (e.g., `"active"`, `"resolved"`) or `clinicalStatus.text`.

**How to avoid:** Status extractor for Condition must walk the CodeableConcept; preferred: `coding[0].code ?? text ?? ''`. See ResourcePropertyTable.tsx:95-110 for an established CodeableConcept rendering pattern.

**Warning sign:** A test that checks `toBe('active')` fails with `[object Object]`.

### Pitfall P-02: `Patient.active` is boolean, not code

**What goes wrong:** D-05 mandates `Patient.active === false` → `"inactive"`; `true` → `"active"`. A naive `String(active)` renders `"true"` / `"false"`.

**Why it happens:** [VERIFIED: `Patient.d.ts:active?: boolean`]. Boolean-to-label mapping must be explicit.

**How to avoid:** `getResourceStatusByType(p: Patient)` returns `p.active === false ? 'inactive' : p.active === true ? 'active' : ''`. Note: `undefined` → empty string (per D-04 fallback).

**Warning sign:** Patients render "true" / "false" instead of "active" / "inactive".

### Pitfall P-03: Encounter has `period` AND `status` — but no `date`

**What goes wrong:** [CITED: HL7 FHIR R4 Encounter spec] — `Encounter.date` does NOT exist. The current `getResourceDate` includes `'period'` in its fallback list at line 68-72, so it accidentally works for Encounter via `period.start`. The new per-type extractor must use `period.start` explicitly.

**Why it happens:** Mixed-up legacy fallback behavior masked the missing field.

**How to avoid:** Use the typed `Encounter` from `@medplum/fhirtypes` (`period?: Period`) — TypeScript enforces no `.date` access. Status: `Encounter.status` is `'planned'|'arrived'|...` enum (cardinality 1..1, REQUIRED) — always present.

**Warning sign:** TypeScript error or `undefined` from `encounter.date`.

### Pitfall P-04: byType setter stale closure on multi-run sequence

**What goes wrong:** A user picks `Condition`, runs Validation → byType becomes `{Condition: 92}`. Then picks `Observation`, runs Validation. If the merging effect's deps are `[run.status, ..., byType, setByType]`, the closure captures the OLD `byType` and merges produce `{Condition: 92, Observation: 88}` correctly only if React re-renders BEFORE the next setByType. If multiple producers fire setByType in the same tick, the second overwrites the first.

**Why it happens:** Object spread is a snapshot read; functional updates are stale-safe.

**How to avoid:** Always use the functional setter form: `setByType((prev) => ({ ...prev, [type]: pct }))`. Drop `byType` from the dep array. Mirrors the `setBreakdown` functional pattern in `DuplicatesContext.tsx:63-71`.

**Warning sign:** Per-type entries vanish after running consecutive types.

### Pitfall P-05: ValidationPanel + ReferencesPanel are SINGLE-TYPE producers

**What goes wrong:** D-15 says producers populate `setByType`. But `ValidationPanel.tsx:137` + `ReferencesPanel.tsx:47` use `<Select>` to pick ONE resource type at a time. The matrix's Validation + References columns will be EMPTY for any type the user has not yet validated.

**Why it happens:** [CITED: `ValidationPanel.tsx:165-170` `useConformanceRun({resourceType, ...})` — `resourceType` is single, not iterated.] Same shape applies to `ReferencesPanel.tsx:46-57`. Phase 35's matrix consumes byType passively; it has no power to trigger runs across types.

**How to avoid:** (a) Plan must surface this honestly — the matrix shows what's been computed, with empty cells for types not yet checked. (b) Empty cell renders as em-dash, NOT `0%` (Phase 18 D-14 invariant). (c) Test for the matrix MUST cover the "sparse byType" case — assert that em-dashes render for types not in `byType`. (d) Future enhancement (out of scope): a "Validate all types" loop button. Track in Deferred.

**Warning sign:** Reviewer asks "why is the Validation column empty for Patient/Encounter?" — answer: user has not yet validated those types.

### Pitfall P-06: D-21 row inclusion vs. counts loading state

**What goes wrong:** `useResourceCounts` returns `Record<string, CountValue>` where `CountValue = number | 'loading' | 'error'`. D-21 says "ONE row per type with count > 0; render skeleton rows matching counts-table count while loading." If matrix iterates `Object.keys(counts)` and filters `count === 'loading'`, all rows vanish during the load — no skeleton appears.

**Why it happens:** Misalignment between "include if count > 0" and "show skeleton if still loading."

**How to avoid:** Two passes — (a) row keys = types where `counts[t] === 'loading' || (typeof counts[t] === 'number' && counts[t] > 0)`; (b) per-row, if `count === 'loading'` render `<Skeleton>` cells. Mirrors `ResourceCountsPanel.tsx:39-57` filter logic.

**Warning sign:** Matrix is empty during initial load, then suddenly populates.

### Pitfall P-07: D-19 "first non-empty metric" navigation heuristic on sparse data

**What goes wrong:** D-19 says click navigates to `/quality?tab=<metric>&type=<resourceType>` where metric is "first non-empty metric column for that row." With sparse byType (Pitfall P-05), the heuristic might pick Completeness 92% as "actionable" when Validation 12% would be more revealing.

**Why it happens:** "First non-empty" is order-dependent, not signal-strength-dependent.

**How to avoid:** Per D-19 letter-of-the-law, ship the "first non-empty" heuristic. Document this in the matrix card aria-label so users know what they get. Note as a known UX limitation in the discuss/discretion section. Future enhancement: weight by `(threshold - value)` to surface most-breached.

**Warning sign:** User clicks expecting to land on a breached metric and lands on a healthy one.

### Pitfall P-08: D-22 "no new FHIR fetches" can be violated by route deep-link

**What goes wrong:** Click navigates to `/quality?tab=validation&type=Condition`. ValidationPanel mounts, reads `?type=Condition` from `useSearchParams`, sets its internal `resourceType` state. But ValidationPanel doesn't auto-run — user must click "Validate sample" again.

**Why it happens:** Phase-30 ValidationPanel pre-selects the type but does NOT auto-run (PHI gate is the reason; auto-firing fetches that POST PHI to external validators violates the Phase 7 consent gate).

**How to avoid:** Plan does NOT auto-fire validation/reference runs from chevron click. The chevron is a NAVIGATION, not a TRIGGER. Phase 7 PHI gate is non-negotiable. Document explicitly: "chevron click pre-selects resource type; user must still click 'Validate sample' to fetch."

**Warning sign:** A test that asserts the chevron click triggered a network call. WRONG — the test should assert URL change + Select state change only.

### Pitfall P-09: ResourceDetailPage uses `<Tabs>` not `<SegmentedControl>`

**What goes wrong:** D-10 says "SegmentedControl reduction 4 → 3 options." Reading `ResourceDetailPage.tsx:182-202` shows actual code uses `<Tabs>` with THREE tabs, not 4 SegmentedControl options.

**Why it happens:** [VERIFIED: `ResourceDetailPage.tsx:182-202`] — current values are `human-readable | clinical-raw | developer`. The "4 options" in D-10 came from ROADMAP description that conflated planned-but-not-built modes. **Actual change is 3 → 2 tabs:**
- KEEP: `human-readable` (label "Human-readable")
- REMOVE: `clinical-raw` (label "Clinical + Raw")
- KEEP: `developer` (label "Developer" → renamed to "JSON")

**How to avoid:** Plan must reconcile D-10 wording with actual code. Recommended: keep D-10's intent ("Clinical + raw is gone, Developer renamed to JSON"), reword the count from "4 → 3" to "3 → 2 tabs" in plan. Test asserts: 2 `<Tabs.Tab>` elements remain; no element matches `/Clinical \+ Raw/`; one element matches `/^JSON$/`. Keyboard shortcut at `:88` (`case '2': setActiveTab('clinical-raw')`) must also be removed or remapped.

**Warning sign:** Test asserts `SegmentedControl` exists — it doesn't.

### Pitfall P-10: D-13 localStorage key for active mode does NOT exist

**What goes wrong:** D-13 says migrate `"clinical-raw"` → `"clinical"` on read from a localStorage key persisting active mode. Grepping the code: `ResourceDetailPage.tsx:51` uses plain `useState`, NOT `useLocalStorage`. There is NO persisted active mode.

**Why it happens:** Discussion-time assumption that the active mode persists. Verified [VERIFIED: grep `localStorage` in ResourceDetailPage] — no persistence.

**How to avoid:** Plan 35-01 simplification: D-13 migration is a no-op. Remove the migration step from the plan; document explicitly "no localStorage migration needed; active mode resets to default on each navigation per existing useState." The keyboard shortcut at `:88` (which sets `'clinical-raw'`) MUST be removed or remapped (e.g., `'2'` → `'developer'`).

**Warning sign:** Looking for `quality.resourceDetailMode.v1` and finding nothing.

### Pitfall P-11: ClinicalRawView referenced from 7 places (production + tests)

**What goes wrong:** D-11 mandates `grep -rn "ClinicalRawView" src/` returns 0 hits. Current grep returns 7 hits across 4 files:
- `src/components/explorer/ClinicalRawView.tsx` (the file itself)
- `src/components/explorer/ResourceDetailPage.tsx:10,196`
- `src/__tests__/resource-detail.test.tsx:49-50` (vi.mock)
- `src/__tests__/display-modes.test.tsx:3,22-40` (4 separate `expect(ClinicalRawView).toBeDefined()` lines)
- `src/__tests__/reference-navigation.test.tsx:61-62` (vi.mock)

**Why it happens:** Tests mock or reference the deleted module — they will fail to import after deletion.

**How to avoid:** Plan 35-01 task list MUST include:
1. Delete `ClinicalRawView.tsx` (file)
2. Remove import + usage in `ResourceDetailPage.tsx:10,196`
3. Remove `vi.mock(...ClinicalRawView)` blocks in `resource-detail.test.tsx:49-50` and `reference-navigation.test.tsx:61-62`
4. Delete the 4 `expect(ClinicalRawView).toBeDefined()` test cases in `display-modes.test.tsx:22-40` (these are stub tests that test nothing; delete entire `describe('ClinicalRawView')` block)
5. Re-run grep — must return 0 hits.

**Warning sign:** Test suite errors with "Cannot find module './ClinicalRawView'".

### Pitfall P-12: Tabs `pt="md"` panel container intercepts reference click

**What goes wrong:** ResourceDetailPage wraps ALL three Tabs.Panels in a single `<div onClick={handleReferenceClick}>` at line 190. Removing the middle `clinical-raw` panel must not break the click delegation for the remaining two panels.

**Why it happens:** Click handler is at the parent div level; reduces to two children but the wrapper stays.

**How to avoid:** Remove ONLY the `<Tabs.Panel value="clinical-raw">` block (lines 195-197) and the corresponding `<Tabs.Tab value="clinical-raw">` (line 185). Leave the wrapper div + handler intact. Run the existing reference-navigation test post-change.

**Warning sign:** Reference click stops working in the remaining panels.

### Pitfall P-13: Tooltip default `withinPortal: true` — but test queries miss portaled content

**What goes wrong:** [VERIFIED: Mantine 8 source — `withinPortal` defaults to `true` for Tooltip]. Tooltip content renders at document root, not inside the table cell. Tests using `within(cell).getByText(systemUrl)` won't find it.

**Why it happens:** Portal rendering is correct production behavior (avoids overflow:hidden clipping) but breaks naive scoped queries.

**How to avoid:** Tooltip tests use `screen.getByText(systemUrl)` (document-scoped) or render tooltip with `events={{hover: true, focus: true, touch: false}}` and trigger via `userEvent.hover(triggerElement)` then assert with `screen.getByRole('tooltip')`. See `MetricTile` test patterns for hover-trigger tests already in the suite.

**Warning sign:** Test passes locally with `screen.getByText` but fails with `within(cell).getByText`.

### Pitfall P-14: Per-metric byType setter wired into `useEffect` causes infinite re-renders

**What goes wrong:** Producer extends `useEffect(() => { setByType(map); }, [reports, setByType])`. If `setByType` reference changes per render (because the context value changes per render because byType state changed because setByType was called), → infinite loop.

**Why it happens:** Phase 32 D-07 mandates `useMemo` on context values. As long as byType state is included in the memo deps and the setter is the stable React useState setter, this is safe. But if the producer wraps with `useCallback` and forgets the deps, can recurse.

**How to avoid:** Mirror the existing pattern in `useCompletenessReport.ts:42-53`: destructure stable React `setByType` from the rollup, include in dep array. Don't `useCallback` the setter; useState setter is already stable. Add the 7-provider smoke test (Phase 32 D-06) plus a new "byType setter stability" test that asserts the setter reference is identity-stable across re-renders.

**Warning sign:** Test runs hang; "Maximum update depth exceeded" error.

## Code Examples

Verified patterns from the existing codebase:

### `isBreached` curried hook usage (D-18 reference)

```typescript
// Source: src/components/quality/MetricTile.tsx:40-43
const { isBreached, getActiveThreshold } = useThresholds();
const threshold = getActiveThreshold(metricKey);
const breached = isBreached(metricKey, value);  // <-- D-18 signature confirmed
```

[VERIFIED: `src/quality/thresholds.ts:73` exports `isBreached(value, threshold)` PURE function; `src/hooks/useThresholds.ts:89` exports CURRIED `isBreached(key, value)` via the hook. Phase 35 matrix uses the CURRIED hook form per D-18.]

### Tooltip + Modal idiom (UAT-FU-02 reference)

```typescript
// Source: src/components/patients/PatientHeaderCard.tsx:152-191 (excerpt)
import { Tooltip, Modal, Button, Code, ActionIcon } from '@mantine/core';
import { IconBraces } from '@tabler/icons-react';

const [rawOpen, setRawOpen] = useState(false);

<Tooltip label="View raw JSON" withArrow>
  <Button variant="light" size="xs" onClick={() => setRawOpen(true)}>
    Raw JSON
  </Button>
</Tooltip>

<Modal
  opened={rawOpen}
  onClose={() => setRawOpen(false)}
  title={`Raw JSON — Patient/${patient.id}`}
  size="lg"
>
  <Code block fz="xs" style={{ maxHeight: 500, overflowY: 'auto' }}>
    {json}
  </Code>
</Modal>
```

### Per-Type Extractor (UAT-FU-01 proposed implementation)

```typescript
// Proposed location: src/components/explorer/SearchResultsPage.tsx
import type { Resource, Patient, Condition, Observation, MedicationStatement, Encounter, Procedure } from '@medplum/fhirtypes';

function getResourceDateByType(resource: Resource): string {
  switch (resource.resourceType) {
    case 'Patient':
      return (resource as Patient).birthDate ?? '';
    case 'Condition':
      return (resource as Condition).onsetDateTime?.slice(0, 10) ?? '';
    case 'Observation':
      return (resource as Observation).effectiveDateTime?.slice(0, 10) ?? '';
    case 'MedicationStatement':
      return (resource as MedicationStatement).effectiveDateTime?.slice(0, 10) ?? '';
    case 'Encounter':
      return (resource as Encounter).period?.start?.slice(0, 10) ?? '';
    case 'Procedure':
      return (resource as Procedure).performedDateTime?.slice(0, 10) ?? '';
    default:
      return getResourceDate(resource); // existing fallback
  }
}

function getResourceStatusByType(resource: Resource): string {
  switch (resource.resourceType) {
    case 'Patient': {
      const p = resource as Patient;
      if (p.active === false) return 'inactive';
      if (p.active === true) return 'active';
      return '';
    }
    case 'Condition': {
      const c = resource as Condition;
      return c.clinicalStatus?.coding?.[0]?.code ?? c.clinicalStatus?.text ?? '';
    }
    case 'Observation':
    case 'MedicationStatement':
    case 'Encounter':
    case 'Procedure':
      return (resource as Observation | MedicationStatement | Encounter | Procedure).status ?? '';
    default:
      return ''; // per D-04 default fallback
  }
}
```

### Bottom-Extensions Section (UAT-FU-02 D-08 sketch)

```typescript
// Proposed location: src/components/explorer/HumanReadableView.tsx (extended)
function ExtensionsSection({ resource }: { resource: Resource }) {
  const extensions = (resource as Record<string, unknown>).extension as
    | Array<{ url: string; [k: string]: unknown }>
    | undefined;
  const [openUrl, setOpenUrl] = useState<string | null>(null);

  if (!extensions || extensions.length === 0) return null;

  // Dedupe by url, keep first occurrence
  const seen = new Set<string>();
  const unique = extensions.filter((e) => {
    if (seen.has(e.url)) return false;
    seen.add(e.url);
    return true;
  });

  return (
    <Stack gap="xs">
      <Text fw={600} size="sm">Extensions</Text>
      <Table withTableBorder verticalSpacing="xs">
        <Table.Thead>
          <Table.Tr>
            <Table.Th>URL fragment</Table.Th>
            <Table.Th>Value summary</Table.Th>
            <Table.Th style={{ width: 60 }}></Table.Th>
          </Table.Tr>
        </Table.Thead>
        <Table.Tbody>
          {unique.map((ext) => {
            const fragment = ext.url.split('/').slice(-2).join('/'); // last two segments
            const summary = summarizeExtension(ext); // "valueString: 12345" or "(complex)"
            return (
              <Table.Tr key={ext.url}>
                <Table.Td><Text size="xs" ff="monospace">{fragment}</Text></Table.Td>
                <Table.Td><Text size="sm">{summary}</Text></Table.Td>
                <Table.Td>
                  <Button size="xs" variant="light" onClick={() => setOpenUrl(ext.url)}>
                    View
                  </Button>
                </Table.Td>
              </Table.Tr>
            );
          })}
        </Table.Tbody>
      </Table>

      <Modal
        opened={openUrl !== null}
        onClose={() => setOpenUrl(null)}
        title={openUrl ? openUrl.split('/').slice(-2).join('/') : ''}
        size="lg"
      >
        {openUrl && (
          <Code block fz="xs">
            {JSON.stringify(unique.find((e) => e.url === openUrl), null, 2)}
          </Code>
        )}
      </Modal>
    </Stack>
  );
}
```

## FHIR R4 Field Path Verification

| Resource | Date field | Type | Status field | Type | Verified |
|----------|-----------|------|--------------|------|----------|
| Patient | `birthDate` | `string` (date) | `active` | `boolean` | [VERIFIED: `node_modules/@medplum/fhirtypes/dist/Patient.d.ts`] + [CITED: hl7.org/fhir/R4/patient.html] |
| Condition | `onsetDateTime` | `string` (dateTime, choice) | `clinicalStatus` | `CodeableConcept` | [VERIFIED: `Condition.d.ts`] + [CITED: hl7.org/fhir/R4/condition.html] |
| Observation | `effectiveDateTime` | `string` (dateTime, choice) | `status` | `code` (enum) | [VERIFIED: `Observation.d.ts`] + [CITED: hl7.org/fhir/R4/observation.html] |
| MedicationStatement | `effectiveDateTime` | `string` (dateTime, choice) | `status` | `code` (enum) | [VERIFIED: `MedicationStatement.d.ts:effectiveDateTime?: string`] + [CITED: hl7.org/fhir/R4/medicationstatement.html] |
| Encounter | `period.start` | `string` (Period.start) | `status` | `code` (enum, REQUIRED) | [VERIFIED: `Encounter.d.ts:period: Period; status: 'planned'\|...`] + [CITED: hl7.org/fhir/R4/encounter.html] |
| Procedure | `performedDateTime` | `string` (dateTime, choice) | `status` | `code` (enum) | [CITED: hl7.org/fhir/R4/procedure.html] — Medplum types confirmed analogous |

**Critical observations:**
- `MedicationStatement.effectiveDateTime` is FLAT in `@medplum/fhirtypes` — NOT nested under `effective.dateTime`. [VERIFIED]
- `Condition.clinicalStatus` is `CodeableConcept`, not string. Render via `.coding[0].code` or `.text`. (Pitfall P-01)
- `Encounter.status` cardinality is 1..1 (REQUIRED) — always present. Other types: 0..1.
- `Encounter` does NOT have a `date` field; `period.start` is the canonical "when did this happen." (Pitfall P-03)
- All five non-Patient types use `effective[x]` / `performed[x]` / `onset[x]` Choice types — Medplum flattens these to `effectiveDateTime`, `effectivePeriod`, etc. as separate fields. The extractor only reads the `*DateTime` variant per D-04; Period variants render empty (acceptable per Phase 35 scope).

## Integration Points

### UAT-FU-01 (Plan 35-02) Integration

| Site | File | Change |
|------|------|--------|
| Extractor functions | `src/components/explorer/SearchResultsPage.tsx:62-76` | Replace `getResourceDate` + add `getResourceStatusByType` |
| Render Date cell | `:402-403` | Call `getResourceDateByType(r)` |
| Render Status cell | `:405-419` | Call `getResourceStatusByType(r)` and use the returned string in `<Badge>` |
| Tests | `src/__tests__/SearchResultsPage.test.tsx` (NEW or extend) | 6 RED tests + 6 flipped GREEN assertions |

### UAT-FU-02 (Plan 35-03) Integration

| Site | File | Change |
|------|------|--------|
| Identifier system tooltip | `src/components/explorer/ResourcePropertyTable.tsx:138-145` | Wrap value `<Code>` in `<Tooltip label={system} withArrow>` |
| Address-extension JSON modal | `:184` (the JSON.stringify fallback) | Add `[View]` button → `<Modal>` with `<Code block>` |
| Bottom Extensions section | `src/components/explorer/HumanReadableView.tsx:21-28` | After `<ResourcePropertyTable>`, render `<ExtensionsSection resource={resolved ?? resource} />` |
| Skip extension in property table | `ResourcePropertyTable.tsx:10` (SKIP_KEYS Set) | Add `'extension'` so the bottom section is the SOLE renderer |

### UAT-FU-03 (Plan 35-01) Integration

| Site | File | Change |
|------|------|--------|
| Tabs.Tab list | `ResourceDetailPage.tsx:184-186` | DELETE line 185 (`clinical-raw`); RENAME line 186 label "Developer" → "JSON" |
| Tabs.Panel | `:191-201` | DELETE lines 195-197 (`clinical-raw` panel) |
| Keyboard shortcut | `:87-93` | DELETE case '2' branch (or remap '2' → 'developer') |
| Import | `:10` | DELETE `import { ClinicalRawView } from './ClinicalRawView'` |
| File deletion | `src/components/explorer/ClinicalRawView.tsx` | DELETE the file entirely |
| Test mocks | `src/__tests__/resource-detail.test.tsx:49-50`, `reference-navigation.test.tsx:61-62` | DELETE `vi.mock` blocks |
| Stub tests | `src/__tests__/display-modes.test.tsx:22-40` | DELETE entire `describe('ClinicalRawView')` block (4 trivial assertions) |
| Active-mode default | `:51` (`useState('human-readable')`) | NO CHANGE (default already correct) |

### UAT-FU-05 (Plan 35-04) Integration

**Per-metric context extension** (5 of 7 contexts touched):

| Context | byType slot | setByType setter | Notes |
|---------|-------------|------------------|-------|
| `CompletenessContext.tsx` | `Record<string, number>` | `useState`-backed | Mirror existing `value` pattern |
| `CoverageContext.tsx` | `Record<string, number>` | `useState`-backed | Mirror |
| `ValidationContext.tsx` | `Record<string, number>` | `useState`-backed | Mirror |
| `ReferencesContext.tsx` | `Record<string, number>` | `useState`-backed | Mirror |
| `DuplicatesContext.tsx` | DERIVED `byType: breakdown.hashByType` | NO new setter | Re-export existing breakdown.hashByType as byType through the rollup return |
| `PlausibilityContext.tsx` | NO change | — | Excluded from matrix per D-17 |
| `LabRangesContext.tsx` | NO change | — | Excluded from matrix per D-17 |

**Producer migrations** (4 sites):

| Producer | File | Effect change |
|----------|------|---------------|
| Completeness | `src/hooks/useCompletenessReport.ts:42-53` | Inside the existing `useEffect`, derive `byType` from `reports` and call `setCompletenessByType` |
| Coverage | `src/hooks/useCodingCoverage.ts:41-55` | Same pattern as Completeness |
| Validation | `src/components/quality/ValidationPanel.tsx:225-234` | Functional setter merge: `setByType((prev) => ({ ...prev, [resourceType]: pct }))` |
| References | `src/components/quality/ReferencesPanel.tsx:69-74` | Same pattern as Validation |

**Matrix card** (NEW):

| Site | File | Change |
|------|------|--------|
| Card mount | `src/components/quality/QualityOverviewPage.tsx:485-487` | Inside `<Tabs.Panel value="counts">`, render `<ResourceCountsPanel>` then `<QualityByTypeMatrix>` (sibling) |
| New component | `src/components/quality/QualityByTypeMatrix.tsx` (NEW) | Subscribes to 5 per-metric byType maps + `useResourceCounts`; renders 7-column sortable table |
| Issues column source | `QualityByTypeMatrix.tsx` | Computed in matrix from `validation.byType` size — actually requires NEW context slot OR derive from validation.byType count of issues per type. **Open question: see Unknowns.** |

## Runtime State Inventory

> Phase 35 is a code/feature phase, not a rename/refactor. No runtime state migration required.

| Category | Items Found | Action Required |
|----------|-------------|-----------------|
| Stored data | None — verified by grep `localStorage` in changed files | None |
| Live service config | None | None |
| OS-registered state | None | None |
| Secrets/env vars | None | None |
| Build artifacts | None — `ClinicalRawView.tsx` is source-only; deletion auto-removes from `dist/` on next `vite build` | None (rebuild on deploy) |

**Nothing found in any category.** Phase 35 is purely code/test changes.

## Environment Availability

| Dependency | Required By | Available | Version | Fallback |
|------------|------------|-----------|---------|----------|
| Node.js | `npm test`, `vite build` | ✓ | v22.22.0 | — |
| vitest | All test runs | ✓ | 4.1.4 | — |
| jsdom | Test environment | ✓ | 29.0.2 | — |
| `@testing-library/react` | Render in tests | ✓ | 16.3.2 | — |
| `@medplum/fhirtypes` | TypeScript field paths | ✓ | 5.1.7 | — |
| Mantine 8 | Tooltip / Modal / Tabs / etc. | ✓ | 8.3.18 | — |

**No missing dependencies.** All needed tooling is already in `package.json` and verified at the installed paths.

## Validation Architecture

### Test Framework

| Property | Value |
|----------|-------|
| Framework | vitest 4.1.4 + @testing-library/react 16.3.2 + jsdom 29.0.2 |
| Config file | `vitest.config.ts` (root) |
| Quick run command | `npx vitest run <pattern>` |
| Full suite command | `npm test` |

### Phase Requirements → Test Map

| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|--------------|
| UAT-FU-01 | `getResourceDateByType(Patient)` returns `birthDate` | unit | `npx vitest run src/__tests__/SearchResultsPage.test.tsx -t 'Patient.*birthDate'` | ❌ Wave 0 — NEW test file |
| UAT-FU-01 | `getResourceStatusByType(Patient)` returns `'active'` for `active: true` | unit | `npx vitest run src/__tests__/SearchResultsPage.test.tsx -t 'Patient.*status'` | ❌ Wave 0 |
| UAT-FU-01 | `getResourceStatusByType(Condition)` returns `coding[0].code` | unit | `npx vitest run src/__tests__/SearchResultsPage.test.tsx -t 'Condition.*clinicalStatus'` | ❌ Wave 0 |
| UAT-FU-01 | All 6 types extract correctly (Observation, MedicationStatement, Encounter, Procedure) | unit (4 more) | `npx vitest run src/__tests__/SearchResultsPage.test.tsx` | ❌ Wave 0 |
| UAT-FU-02 | Identifier value cell renders Tooltip with system URL on hover | integration | `npx vitest run src/__tests__/ResourcePropertyTable.test.tsx -t 'identifier.*tooltip'` | ❌ Wave 0 |
| UAT-FU-02 | Address-extension JSON `[View]` button opens Modal | integration | `npx vitest run src/__tests__/ResourcePropertyTable.test.tsx -t 'extension.*modal'` | ❌ Wave 0 |
| UAT-FU-02 | Bottom Extensions section renders one row per unique url | integration | `npx vitest run src/__tests__/HumanReadableView.test.tsx -t 'Extensions section'` | ❌ Wave 0 |
| UAT-FU-03 | Tabs renders exactly 2 `<Tabs.Tab>` elements | unit | `npx vitest run src/__tests__/resource-detail.test.tsx -t 'tabs.*2 options'` | ✅ exists; extend |
| UAT-FU-03 | "Developer" label replaced by "JSON" | unit | `npx vitest run src/__tests__/resource-detail.test.tsx -t 'JSON tab label'` | ✅ extend |
| UAT-FU-03 | grep `ClinicalRawView` returns 0 hits | shell | `bash -c "! grep -rn ClinicalRawView src/ --include='*.ts' --include='*.tsx'"` | shell test |
| UAT-FU-05 | Per-metric `setByType` round-trip contract | unit | `npx vitest run src/quality/metrics/__tests__/byType.test.tsx` | ❌ Wave 0 |
| UAT-FU-05 | Matrix renders one row per type with count > 0 | integration | `npx vitest run src/__tests__/QualityByTypeMatrix.test.tsx -t 'rows match types'` | ❌ Wave 0 |
| UAT-FU-05 | Threshold-breach coloring red on breached cells | integration | `npx vitest run src/__tests__/QualityByTypeMatrix.test.tsx -t 'breach coloring'` | ❌ Wave 0 |
| UAT-FU-05 | Chevron click navigates to `/quality?tab=<metric>&type=<type>` | integration | `npx vitest run src/__tests__/QualityByTypeMatrix.test.tsx -t 'chevron navigation'` | ❌ Wave 0 |
| UAT-FU-05 | Default sort is `Issues DESC, Resource type ASC` | unit | `npx vitest run src/__tests__/QualityByTypeMatrix.test.tsx -t 'default sort'` | ❌ Wave 0 |
| UAT-FU-05 | Matrix renders skeleton rows while counts loading | integration | `npx vitest run src/__tests__/QualityByTypeMatrix.test.tsx -t 'skeleton loading'` | ❌ Wave 0 |
| UAT-FU-05 | byType setter is reference-stable across renders | unit | `npx vitest run src/quality/metrics/__tests__/byType.test.tsx -t 'setter stability'` | ❌ Wave 0 |

### Sampling Rate

- **Per task commit:** `npx vitest run src/__tests__/<changed-area>.test.tsx` (single file, ~1-3s)
- **Per wave merge:** `npm test` full suite (target: 998 → ≥1015 passing)
- **Phase gate:** Full suite green + `npx tsc -b --noEmit` + `npm run build` clean before `/gsd-verify-work`

### Wave 0 Gaps

- [ ] `src/__tests__/SearchResultsPage.test.tsx` — Wave 0 file creation; covers UAT-FU-01 (12 cases: 6 RED + 6 GREEN per D-26)
- [ ] `src/__tests__/ResourcePropertyTable.test.tsx` — extend or create; covers UAT-FU-02 Tooltip + Modal
- [ ] `src/__tests__/HumanReadableView.test.tsx` — extend or create; covers UAT-FU-02 bottom Extensions section
- [ ] `src/__tests__/QualityByTypeMatrix.test.tsx` — Wave 0 file creation; covers UAT-FU-05 (rows, sort, breach color, chevron, skeleton)
- [ ] `src/quality/metrics/__tests__/byType.test.tsx` — Wave 0 file creation; covers UAT-FU-05 byType slot contract
- [ ] No new framework install needed; vitest + @testing-library/react already present

## Security Domain

> `security_enforcement` not explicitly set in `.planning/config.json`; treating as enabled per default. Phase 35 is a UI/UX phase with NO new authentication, authorization, or external network surface. Security analysis below is mostly "nothing applicable".

### Applicable ASVS Categories

| ASVS Category | Applies | Standard Control |
|---------------|---------|-----------------|
| V2 Authentication | no | App is local-only; no authentication added/changed |
| V3 Session Management | no | No sessions |
| V4 Access Control | no | No new access boundaries |
| V5 Input Validation | yes | UAT-FU-02 Modal renders extension JSON via `Code block` (escaped); UAT-FU-01 reads FHIR resource fields (typed via `@medplum/fhirtypes`) |
| V6 Cryptography | no | No crypto |

### Known Threat Patterns for FHIR-Exploder UI

| Pattern | STRIDE | Standard Mitigation |
|---------|--------|---------------------|
| Reflected XSS via FHIR resource string fields rendered as text | Tampering | Mantine `<Text>` and `<Code block>` escape by default; never use `dangerouslySetInnerHTML` (Phase 35 doesn't introduce any) |
| Reference click hijacking (Pitfall 5 from earlier phases) | Tampering | Existing `isValidFhirReference` guard at `ResourceDetailPage.tsx:23-25` is preserved untouched in Plan 35-01 |
| Open Redirect via chevron-click `?type=` parameter | Tampering | The chevron navigation passes `type=<resourceType>` directly; ValidationPanel + ReferencesPanel ALREADY validate resourceType against the server's `parseResourceTypes(capability)` list. No new exposure. [VERIFIED: ValidationPanel.tsx:131-135 builds whitelist from CapabilityStatement] |
| URL fragment trim → exposes wrong system | Tampering | UAT-FU-02 D-08 trims to last 2 segments; if extension URL is malicious-looking, the trimmed fragment displays harmlessly as Text (escaped) |

## Assumptions Log

| # | Claim | Section | Risk if Wrong |
|---|-------|---------|---------------|
| A1 | The "first non-empty metric" heuristic in D-19 means iterating columns in display order (Complete → Coverage → Validation → References → Dup) | Pitfall P-07 | If user expected "first by signal strength," the chevron lands on a less-actionable metric |
| A2 | The Issues column (D-17) maps to `Object.keys(validation.byType).length` — i.e., count of types validated — NOT issue counts per type | Open Question Q-01 | Column shows wrong number if planner intended per-type issue counts |
| A3 | URL fragment trimming in D-08 means "last 2 path segments" e.g. `modul-person/CodeSystem/abc` | Code Examples | If user wanted only last segment or only the canonical name, header text differs |
| A4 | "Empty types omitted" in D-21 means `count === 0` AND `count !== 'loading'`; loading types render as skeleton rows | Pitfall P-06 | If "empty" was meant to include loading, matrix is empty during initial fetch |

If A2 is wrong, downstream impact is the largest — Issues column needs a NEW context slot for per-type issue counts (not a derived count of byType keys). See Open Questions.

## Open Questions (RESOLVED)

### Q-01: Issues column source — count of validated types, count of issues per type, or sum of all issues?

- What we know: D-17 says "`Issues` (integer count from validation issues per type — sourced from existing `ValidationPanel` per-type aggregate)."
- What's unclear: ValidationPanel currently exposes `allNormalizedIssues: NormalizedIssue[]` PER RUN — i.e., for the currently selected `resourceType`. There is NO existing "per-type issue count aggregate." The aggregate doesn't exist; it would have to be NEWLY built into `ValidationContext`.
- RESOLVED: Recommendation: Plan must add a NEW context slot — `validationIssuesByType: Record<string, number>` — populated by ValidationPanel alongside the existing setByType call. The `Issues` column reads from this map. If a type has not been validated yet, render em-dash (consistent with Pitfall P-05). Surface this in discuss-phase if planner wants to defer.

### Q-02: D-19 chevron navigation when ValidationPanel/ReferencesPanel auto-deselect on URL change

- What we know: ValidationPanel reads `useState<string>` for resourceType (line 137), defaulted to `BUNDLED_PROFILE_TYPES[0]`. There is NO `useSearchParams` consumption that would react to `?type=Condition`.
- What's unclear: To honor D-19, ValidationPanel + ReferencesPanel must read `?type=` from URL on mount and pre-select that resourceType. This is a NEW behavior not currently implemented.
- RESOLVED: Recommendation: Plan 35-04 includes a sub-task to add `useSearchParams` consumption to BOTH panels (ValidationPanel.tsx:137 and ReferencesPanel.tsx:47) — read `searchParams.get('type')` as the initial state, fall back to current default. ~10-line change per panel. Alternative: chevron click ONLY navigates URL change; the user must reselect from the panel's own Select. Less smooth UX but smaller diff. Surface in discuss-phase.

### Q-03: D-13 localStorage migration — confirm no-op?

- What we know: `ResourceDetailPage.tsx:51` uses plain `useState`. `grep -rn localStorage src/components/explorer/` returns no hits for activeMode persistence.
- What's unclear: D-13 may have been written assuming persistence existed. Researcher could not find any.
- RESOLVED: Recommendation: Plan 35-01 explicitly documents "D-13 is a no-op — no localStorage key for active mode exists." Proceed without migration code. Surface in discuss-phase if planner wants to ADD persistence (out-of-scope for this phase per Pitfall P-10).

### Q-04: Order of byType slot extension vs producer migration in Plan 35-04

- What we know: Phase 32 used incremental landings (D-11): scaffold first, facade rewrite, producer/consumer migration last.
- What's unclear: Phase 35 D-01 says Plan 35-04 contains BOTH extension and migration. CONTEXT.md `Claude's Discretion` allows splitting if needed.
- RESOLVED: Recommendation: Keep them in one plan but TWO sub-tasks, with the byType slot extension landing FIRST in Plan 35-04 (Task 1) and producer migrations following (Tasks 2-5). A test-only task (Task 6) closes. Mirrors Phase 32's incremental cadence within a single plan.

## Canonical References

| Reference | Verified Path |
|-----------|---------------|
| Phase 30 UAT spec | `.planning/phases/30-layout-redesign/30-UAT.md` (correct path; CONTEXT.md cited `milestones/v1.4-phases/30-layout-redesign/30-UAT.md` which does NOT exist) |
| Phase 32 producer migration final state | Check Phase 32 SUMMARY at `.planning/phases/32-eff-r14-qualitymetricscontext-split/32-04-SUMMARY.md` (per CONTEXT.md but not yet verified by researcher) |
| `isBreached` location | `src/quality/thresholds.ts:73` (pure) + `src/hooks/useThresholds.ts:89` (curried hook with hydration gate) — D-18 must use the CURRIED hook form |
| `ClinicalRawView` references | 7 hits across 4 files: `ClinicalRawView.tsx` itself + `ResourceDetailPage.tsx` (2) + `resource-detail.test.tsx` (2) + `display-modes.test.tsx` (4) + `reference-navigation.test.tsx` (2) |
| Active-mode default in ResourceDetailPage | `'human-readable'` at `src/components/explorer/ResourceDetailPage.tsx:51` (NOT `'clinical'` as discretion section implied) |
| `useResourceCounts` return type | `Record<string, CountValue>` where `CountValue = number \| 'loading' \| 'error'` — `src/hooks/useResourceCounts.ts:59,124` |
| Mantine Tooltip `withinPortal` default | `true` (Mantine 8 source) — no special handling needed for table-cell clipping |
| Vitest config | `vitest.config.ts` at repo root — `globals: true`, `environment: 'jsdom'` |
| Test baseline | 998 passing as of Phase 34 (per STATE.md and ROADMAP) |

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| Monolithic `QualityMetricsContext` (8 fields, every tile re-renders on any update) | 7 per-metric `React.createContext` symbols + facade composer | Phase 32 (2026-04-24) | Phase 35 extends with `byType` slot per context — same isolation pattern |
| ResourceDetailPage 3 modes incl. `clinical-raw` split | 2 modes (`human-readable`, `developer` renamed `JSON`) | Phase 35 (this phase) | UAT-FU-03 simplifies; reduces test surface |
| `getResourceDate` fallback list works for some types accidentally (e.g., Encounter via `period`) | Per-type explicit extractor with TypeScript-typed paths | Phase 35 (this phase) | UAT-FU-01 makes the contract explicit, surfaces fall-through bugs early |

**Deprecated/outdated:**
- The "4-mode SegmentedControl" assumption in CONTEXT.md D-10 — actual code is `<Tabs>` with 3 tabs. Reconcile in plan.
- The "localStorage migration `clinical-raw → clinical`" assumption in D-13 — no such key exists; D-13 is a no-op.

## Sources

### Primary (HIGH confidence — VERIFIED)

- `node_modules/@medplum/fhirtypes/dist/Patient.d.ts` — verified `active?: boolean`, `birthDate?: string`
- `node_modules/@medplum/fhirtypes/dist/Condition.d.ts` — verified `clinicalStatus?: CodeableConcept`, `onsetDateTime?: string`, all 5 onset[x] variants
- `node_modules/@medplum/fhirtypes/dist/Encounter.d.ts` — verified `period: Period; status: 'planned'|'arrived'|...`
- `node_modules/@medplum/fhirtypes/dist/MedicationStatement.d.ts` — verified `effectiveDateTime?: string; effectivePeriod?: Period;` (FLAT shape)
- `node_modules/@medplum/fhirtypes/dist/Observation.d.ts` — verified `status: 'registered'|'preliminary'|'final'|'amended'|...`
- `node_modules/@medplum/fhirtypes/dist/Procedure.d.ts` — verified `status` enum
- `src/quality/thresholds.ts:73` — `isBreached(value, threshold)` pure function
- `src/hooks/useThresholds.ts:89-93` — `isBreached(key, value)` curried form (with hydration gate)
- `src/components/quality/MetricTile.tsx:40-43` — usage exemplar of `useThresholds().isBreached(metricKey, value)`
- `src/components/explorer/ResourceDetailPage.tsx:182-202` — actual Tabs structure (3 tabs)
- `src/components/explorer/ClinicalRawView.tsx` — full file
- `src/components/explorer/ResourcePropertyTable.tsx:184` — `JSON.stringify` fallback (UAT-FU-02 target)
- `src/components/quality/SortableTh.tsx` — sort primitive
- `src/components/patients/PatientHeaderCard.tsx:140-191` — Tooltip + Modal idiom
- `src/quality/metrics/index.tsx` — composer (Phase 32 final shape)
- `src/quality/metrics/CompletenessContext.tsx` — Phase 32 minimal-context exemplar to extend
- `src/quality/metrics/DuplicatesContext.tsx` — special-shape exemplar (already has `breakdown.hashByType`)
- `src/hooks/useCompletenessReport.ts:30-55` — producer pattern with `reports: Record<string, PerTypeReport>`
- `src/hooks/useCodingCoverage.ts:27-57` — same pattern
- `src/components/quality/ValidationPanel.tsx:137,165-170,225-234` — single-type producer
- `src/components/quality/ReferencesPanel.tsx:46-74` — single-type producer
- `src/components/quality/QualityOverviewPage.tsx:485-510` — counts panel mount + Tabs.Panel structure
- `src/hooks/useResourceCounts.ts` — counts source + cache
- `src/App.tsx:9,132,139` — ResourceDetailPage routing (not lazy)
- `package.json` — vitest 4.1.4, mantine 8.3.18, medplum 5.1.7
- `vitest.config.ts` — jsdom + globals
- `.planning/config.json` — `nyquist_validation: true`

### Secondary (MEDIUM confidence — CITED)

- [HL7 FHIR R4 Patient spec](https://www.hl7.org/fhir/R4/patient.html) — `Patient.active` is boolean
- [HL7 FHIR R4 Condition spec](https://www.hl7.org/fhir/R4/condition.html) — `clinicalStatus` is CodeableConcept; 5 onset[x] variants
- [HL7 FHIR R4 Observation spec](https://www.hl7.org/fhir/R4/observation.html) — 4 effective[x] variants; status enum
- [HL7 FHIR R4 Encounter spec](https://www.hl7.org/fhir/R4/encounter.html) — no `Encounter.date`; `period.start` is the canonical date
- [HL7 FHIR R4 MedicationStatement spec](https://www.hl7.org/fhir/R4/medicationstatement.html) — effective[x] variants
- [HL7 FHIR R4 Procedure spec](https://www.hl7.org/fhir/R4/procedure.html) — performed[x] variants; status enum
- [Mantine Tooltip source on GitHub](https://github.com/mantinedev/mantine/blob/master/packages/%40mantine/core/src/components/Tooltip/Tooltip.tsx) — `withinPortal: true` default in defaultProps

### Tertiary (LOW confidence — flagged for plan-time validation)

- (none — all critical claims verified)

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH — every dep verified in package.json + installed node_modules
- Architecture: HIGH — all integration points read from actual code
- Pitfalls: HIGH — 14 pitfalls grounded in code reads (not speculation); 4 of them surface CONTEXT.md drift (P-09/P-10/P-11 + Q-01) that planner MUST resolve
- FHIR field paths: HIGH — both Medplum types AND HL7 spec consulted

**Research date:** 2026-04-25
**Valid until:** 2026-05-25 (30 days; stable surface — Mantine 8, Medplum 5.1.7, FHIR R4 unchanged in this window)

**Sources:**
- [HL7 FHIR R4 Encounter](https://www.hl7.org/fhir/R4/encounter.html)
- [HL7 FHIR R4 Condition](https://www.hl7.org/fhir/R4/condition.html)
- [HL7 FHIR R4 Observation](https://www.hl7.org/fhir/R4/observation.html)
- [HL7 FHIR R4 Patient](https://www.hl7.org/fhir/R4/patient.html)
- [HL7 FHIR R4 MedicationStatement](https://www.hl7.org/fhir/R4/medicationstatement.html)
- [HL7 FHIR R4 Procedure](https://www.hl7.org/fhir/R4/procedure.html)
- [Mantine Tooltip source (GitHub)](https://github.com/mantinedev/mantine/blob/master/packages/%40mantine/core/src/components/Tooltip/Tooltip.tsx)
- [Mantine Tooltip docs](https://mantine.dev/core/tooltip/)
