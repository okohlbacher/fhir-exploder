# Phase 25: Quality Module Dedup - Research

**Researched:** 2026-04-22
**Domain:** Refactor — React/TypeScript hook+component dedup against Medplum FHIR stack
**Confidence:** HIGH (every finding verified in-repo; no speculation)

<user_constraints>
## User Constraints (from 25-CONTEXT.md)

### Locked Decisions (D-01 through D-19)

**QDDEP-01 — perPathExamples (must land FIRST):**
- D-01: Populate `perPathExamples: Record<string, CodeableConcept>` inside `codingCoverageWalker` (`src/quality/codingCoverageWalker.ts`). No second traversal pass.
- D-02: Key format = existing dotted FHIRPath string (e.g., `"code"`, `"component[*].code"`) already used by the rollup. One representative per path; deterministic selection (first non-null encounter, not random).
- D-03: `useExamplesByPath` hook deleted wholesale after `CodingDrillDown` switches to reading `report.perPathExamples[path]`. Grep-remove, no deprecation stub.
- D-04: Storage on existing `PerTypeCoverageReport` interface. `QualityMetricsCache` (Phase 24) unchanged.

**QDDEP-02 — DrillDownShell (after QDDEP-01):**
- D-05: Props = `{ title: string; backHref: string; status: AsyncRunStatus; progress: number; issues: NormalizedIssue[]; errorMessage?: string }`. No render-prop or `children` escape hatch.
- D-06: File = `src/components/quality/DrillDownShell.tsx`.
- D-07: Migration converts 5 simple drill-downs (Plausibility, LabRanges, Duplicates, References, Completeness). `CodingDrillDown` = PARTIAL migration (wraps shell for chrome, keeps bespoke per-path body).
- D-08: Target ≈ 400 LOC saved (5 × ~80 LOC).

**QDDEP-03 — useSampleWalker<T>:**
- D-09: `src/hooks/useSampleWalker.ts`. Generic over `T`.
- D-10: Walker owns worker-pool lifecycle, seeding loop, recursion, cancellation (reuse Phase 24's `let cancelled` — NO `cancelledRef`).
- D-11: `useCompletenessReport` and `useCodingCoverage` each ≤30 meaningful LOC. Per-metric rollup stays in wrappers (NOT lifted).
- D-12: `useSampleWalker<T>` wraps `useAsyncRun<T>` internally. No re-implementing start/cancel.

**QDDEP-04 — keepMounted drop:**
- D-13: Drop `keepMounted` entirely on Completeness + Coding tabs at `QualityOverviewPage.tsx:391` AND the two affected `Tabs.Panel` props (`:407`, `:410`). NOT `isActive` gating.
- D-14: Verify via Network-tab smoke test on `/quality?tab=counts`.

**QDDEP-05 — SortableTh:**
- D-15: `src/components/quality/SortableTh.tsx`. Both panels import from here; inline defs deleted.
- D-16: Pure move. Visual regression risk near-zero.

**QDDEP-06 — RunProgress:**
- D-17: `src/components/quality/RunProgress.tsx`. Props = `{ run: { total: number; processed: number }; label: string }`.
- D-18: 9 sites — confirmed below (see Focus Area 5).
- D-19: Do NOT fold into `DrillDownShell` — RunProgress used in panels too.

### Claude's Discretion
- Plan batching (whether QDDEP-01/03 bundle or split; QDDEP-02 must be its own plan or wave).
- Test strategy (TDD for QDDEP-01, render-parity for QDDEP-02, unit for -03/-05/-06).
- Commit granularity (one commit per QDDEP preferred).
- No tidying adjacent code (R11 casts stay Phase 28).

### Deferred (OUT OF SCOPE)
- `QualityMetricsContext` re-render split (EFF-R14 — v1.5).
- `<ConnectionGatedOutlet>` (SHELL-01 — Phase 26).
- `useSampleWalker` generalization beyond Quality module.
- `<DrillDownShell>` render-prop escape hatch.
- R11 cast cleanup (Phase 28).
- Any new user-facing behavior.
</user_constraints>

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|------------------|
| QDDEP-01 | `PerTypeCoverageReport.perPathExamples` populated in `codingCoverageWalker`; `useExamplesByPath` deleted; coding drill-down calls halved | Focus Area 1 — concrete walker integration point identified at `aggregateCoverage()` loop (codingCoverageWalker.ts:158-193); key shape verified as `aggregationPath` (stripped + `[*]`-collapsed); storage shape matches what `CodingDrillDown.useExamplesByPath` already produces |
| QDDEP-02 | `<DrillDownShell>` (≤6 props) collapses 5 drill-downs; ≥400 LOC removed | Focus Area 2 — render delta audit identifies 5 symmetric drill-downs (95–97 LOC each) and 2 asymmetric ones (Completeness 187 LOC with Tabs+ResourceIssueTable; Coding 270 LOC with bespoke body). Shell shape matches 5 bespoke structures verbatim |
| QDDEP-03 | `useSampleWalker<T>` replaces worker-pool + seeding in two hooks | Focus Area 3 — diff of the two hooks confirms identical lines 46-117 (67 lines of worker-pool) differ only in `sampleResources + aggregateCoverage` vs `computeForType` closure. `T = PerTypeReport<PerTypeCompletenessReport>` vs `PerTypeReport<PerTypeCoverageReport>` — both are `PerTypeReport<X>`, so generic fits |
| QDDEP-04 | `keepMounted` dropped on Completeness + Coding | Focus Area 4 — single test (`quality-overview.test.tsx:232`) asserts keepMounted behavior; will need update. No panel-local state survives across tab switches today (filter/sort/filter all local-useState) |
| QDDEP-05 | Single `SortableTh` definition | Focus Area 5 — two definitions are byte-identical (CompletenessPanel.tsx:76-101 and CodingCoveragePanel.tsx:91-116). Pure move |
| QDDEP-06 | `<RunProgress>` replaces 9 inline `pct` math sites | Focus Area 5 — 9 sites confirmed via grep (`Math.round((run.progress.current / run.progress.total) * 100)` in 9 files); NOT the `pct = total > 0` shape which is the 3-segment coverage math |
</phase_requirements>

## Project Constraints (from CLAUDE.md)

- **Tech stack locked:** React 18.3.x + TypeScript 5.7.x + Vite 8 + Medplum 5.1.7 + Mantine 8.3.x. No Mantine 9 / React 19 migration.
- **No Tailwind / no react-query / no SMART on FHIR / no GraphQL FHIR** — all would conflict with existing stack.
- **Terminology graceful degradation** when TS unavailable.
- **GSD workflow enforcement** — direct edits forbidden outside GSD commands. Plans must be run through `/gsd-execute-phase`.
- **Mantine IS the design system** — do NOT introduce alternative component libraries for `SortableTh` or `RunProgress`.

## Summary

Phase 25 is a pure refactor with zero user-visible behavior change. The scope is exceptionally well-defined: six locked requirements, each with an unambiguous code transformation (delete X, introduce Y). The dominant risks are **not in the refactor mechanics** but in two load-bearing assumptions that planning must verify:

1. **QDDEP-01 walker integration is clean.** `codingCoverageWalker.aggregateCoverage()` already iterates every `ClassifiedCodedField` in one pass at `codingCoverageWalker.ts:163-184`. Populating `perPathExamples` is a 3-line insertion into that loop — no risk, single source of truth.
2. **QDDEP-03 generic fit is load-bearing.** The two sampler hooks' worker-pool structure is byte-identical; the only genuine per-metric variation is the computation closure (`computeForType` vs. `sampleResources + aggregateCoverage`) and the metric-namespace string. A generic `useSampleWalker<T>` with a `compute: (client, type, sampleSize, patientIds) => Promise<T>` and a `metricNamespace: string` parameter collapses both.

The real planning risks are ordering (§ Migration Sequence) and test update surface — 4 existing test files mock the exact APIs being moved (`useCodingCoverage`, `useExamplesByPath`, `useCompletenessReport`), and 1 test (`quality-overview.test.tsx:232`) asserts `keepMounted` behavior explicitly.

**Primary recommendation:** Execute QDDEP-01 first as its own plan (TDD), then bundle QDDEP-03 + QDDEP-05 + QDDEP-06 as a second plan (low-risk extractions), then QDDEP-02 as its own plan (render-parity testing), then QDDEP-04 as a trivial final plan. **Reject the temptation to merge QDDEP-01 into QDDEP-03** — see Migration Sequence § for why.

## Standard Stack

All stack decisions inherit from CLAUDE.md. No new dependencies needed.

### Core (verified present)
| Library | Version | Purpose | Source |
|---------|---------|---------|--------|
| React | 18.3.x | `useState`/`useMemo`/`useEffect`/`useReducer` already in use | `[VERIFIED: CLAUDE.md]` |
| @mantine/core | 8.3.x | `Table`, `Progress`, `UnstyledButton`, `Text`, `Group`, `Stack`, `Button`, `Alert`, `Title` — all already used | `[VERIFIED: CompletenessPanel.tsx, PlausibilityDrillDown.tsx]` |
| @tabler/icons-react | installed | `IconChevronDown`, `IconChevronUp`, `IconSelector`, `IconArrowLeft`, `IconAlertTriangle`, `IconCheck` | `[VERIFIED: used at CompletenessPanel.tsx:28]` |
| @medplum/react | 5.1.7 | `CodeableConceptDisplay` for drill-down examples | `[VERIFIED: CodingDrillDown.tsx:28]` |

### No New Libraries
This phase introduces zero new dependencies. Every primitive needed (`useAsyncRun`, `getQualityMetricsCache`, Mantine components) exists.

## Per-Focus-Area Findings

### Focus Area 1: `codingCoverageWalker` structure + perPathExamples integration

**File:** `src/quality/codingCoverageWalker.ts` (206 LOC)

**Entry point for integration:** `aggregateCoverage(sample: Resource[]): PerTypeCoverageReport` (lines 144-205).

**Current traversal structure (verified):**
```typescript
// codingCoverageWalker.ts:158-193
for (const r of sample) {
  const fields = classifyCodedFields(r);          // classifier walk
  const typePrefix = r.resourceType ? `${r.resourceType}.` : '';
  for (const f of fields) {
    const stripped = typePrefix && f.path.startsWith(typePrefix)
      ? f.path.slice(typePrefix.length)
      : f.path;
    const aggregationPath = stripped.replace(/\[\d+\]/g, '[*]');  // KEY SHAPE
    const bucket = perPath[aggregationPath] ?? ...;
    bucket[f.classification]++;
    if (f.classification === 'systemCode') systemCode++;
    else if (f.classification === 'textOnly') textOnly++;
    else empty++;
    // ← QDDEP-01 INSERTION POINT (single-pass, zero overhead)
    if (f.classification !== 'systemCode') {
      resourceIssues.push({ path: aggregationPath, classification: f.classification });
    }
  }
  ...
}
```

Each `ClassifiedCodedField` has a `value: CodeableConcept` field (line 119: `out.push({ path, classification: classifyCC(cc), value: cc })`). The walker **already visits every coding path exactly once per sample, and already has the CodeableConcept value in hand**.

**Proposed integration (QDDEP-01 pattern):** Inside the same `for (const f of fields)` loop at line 163, after computing `aggregationPath`, add:
```typescript
// Prefer systemCode; fall back to any non-empty value; deterministic (first-win).
if (!perPathExamples[aggregationPath] && f.classification === 'systemCode') {
  perPathExamples[aggregationPath] = f.value;
} else if (!perPathExamples[aggregationPath] && f.value) {
  perPathFallbacks[aggregationPath] = perPathFallbacks[aggregationPath] ?? f.value;
}
```
Then after the outer loop: `for (const [k, v] of Object.entries(perPathFallbacks)) { if (!perPathExamples[k]) perPathExamples[k] = v; }`.

This is the **identical preference logic** that `useExamplesByPath` (CodingDrillDown.tsx:43-90) currently implements in its duplicate sample walk. No behavior change — just relocation.

**Critical observation:** `useExamplesByPath`'s current algorithm (CodingDrillDown.tsx:55-77) uses `f.path.startsWith(typePrefix)` + `[\d+]` → `[*]` collapse — **byte-identical** to `aggregateCoverage`'s path normalization (lines 164-167). So the key format is already aligned; keys generated in the walker WILL match what the drill-down reads today. `[VERIFIED: grep comparison of both files]`

**Type change required:** `src/quality/types.ts:64-79` — add `perPathExamples: Record<string, CodeableConcept>` to `PerTypeCoverageReport`. Non-optional (every report has one, even if empty). The `CodeableConcept` import at line 15 is already present.

**Storage sanity check:** `QualityMetricsCache` serialization (Phase 24 Plan 03) treats the report as an opaque JSON blob. `perPathExamples` is plain `Record<string, CodeableConcept>` — JSON-safe, no functions/classes. No cache layer change needed. `[VERIFIED: D-04 matches]`

**Confidence:** HIGH — single-pass insertion into existing loop; keys already aligned; types path is clean.

---

### Focus Area 2: DrillDownShell render parity — what would the 6-prop shell flatten?

I inspected all 5 simple drill-downs + CodingDrillDown. Audit table:

| Drill-down | LOC | Back label | Title | Status handling | Progress | Empty state | Error state | Deviations to FLAG |
|---|---:|---|---|---|---|---|---|---|
| Plausibility | 97 | "Back to Plausibility" | `${type} -- Plausibility drill-down` | `running`/`error`/`complete+empty`/`complete+issues`/`cancelled+issues` | `Math.round((current/total)*100)` + Progress animated | "No plausibility issues found" green alert | Red alert with `errorMessage ?? 'unknown error'` | — (canonical shape) |
| LabRanges | 95 | "Back to Lab Ranges" | `Observation -- Lab Range drill-down` | Same pattern | Same | "No lab range issues found" | Same | Title differs — NOT `${type}` but static `Observation`. **Shell must accept `title` as string literal.** |
| Duplicates | 96 | "Back to Duplicates" | `Duplicate Detection -- Drill-down` | Same | Same ("Matching patients" progress text) | "No duplicates detected" | Same | Title is static. Progress label text differs ("Matching patients" vs "Checking N"). **Shell must accept text content via `label` prop on RunProgress.** |
| References | 96 | "Back to References" | `${type} -- Reference Integrity drill-down` | Same | Same | "No reference issues found" | Same | — (canonical shape) |
| Completeness | 187 | "Back to Completeness" | `${type} — Completeness breakdown` | Different — reads from `useCompletenessReport` hook (state object), not `useAsyncRun` run | N/A (no progress shown) | Uses Tabs + Alert for "no profile" + "no fields" | Same | **ASYMMETRIC**: no `run.status` semantics; uses `state === 'loading'` / `'error'` from hook return. Has **Tabs** (Fields/Resources) and a **NOTE** under the list. Cannot fit the 6-prop shell without shell knowing hook shape. |
| Coding | 270 | "Back to Coding Coverage" | `${type} — Coding coverage breakdown` | Same as Completeness (hook-driven `state`) | N/A | Uses Tabs + custom DrillDownTable | Same | **ASYMMETRIC**: hook-driven; custom body (DrillDownTable w/ CodeableConceptDisplay); Tabs navigation; click-through to Resources tab. Per D-07, this is a **PARTIAL migration**. |

**Accessibility audit (verified):**
- All 5 simple drill-downs use `aria-live="polite"` on the running-status Stack and `role`-appropriate Alerts (color semantics handled by Mantine).
- No inline `aria-label` attributes differ between drill-downs.
- Back button: all use `<Button variant="subtle" leftSection={<IconArrowLeft/>} component={Link} ref={backRef}>` with `backRef.current?.focus()` on mount.

**Deltas the planner MUST preserve explicitly (NOT hidden by the shell):**
1. **LabRanges + Duplicates have static titles** (`Observation -- Lab Range drill-down`, `Duplicate Detection -- Drill-down`). The shell's `title: string` prop already handles this — **just pass the right string** per drill-down.
2. **Progress label content varies** ("Checking {type}", "Matching patients", "Checking references in {type}"). The shell's `progress: number` prop is numeric only; label text MUST come via a separate prop or via the caller-composing `<RunProgress>` inside `<DrillDownShell>`. Given D-19 (RunProgress lives separately), the cleanest solution: shell renders the progress UI chrome (the "N/M" text block) and accepts a `progressLabel?: string` prop. **Planner recommendation: add a 7th prop `progressLabel?: string`** — but this conflicts with D-05's "≤6 fields" constraint. **Open question (see §Open Questions): resolve by either (a) having caller compose the label into title, or (b) accepting 7 props.**
3. **CompletenessDrillDown is asymmetric** — it does NOT use `useAsyncRun` and has no `status`/`progress`. Per D-07 it migrates, but its shell invocation will need `status: 'complete'`/`'idle'` synthesized from `state === 'loading' | 'error' | data`. **Plan must include a mapping helper.**
4. **CodingDrillDown is PARTIAL migration** per D-07 — only the Back/Title chrome + error Alert fold into the shell; DrillDownTable body stays. Per D-05 no `children` escape hatch, so the integration pattern is: the drill-down renders the shell THEN renders the custom body below/instead of `issues: ResourceIssueTable`. The shell's `issues: NormalizedIssue[]` prop forces a decision — pass `issues: []` and compose the custom body after, OR add a body-slot prop. The CONTEXT explicitly says "it wraps `<DrillDownShell>` rather than extending it" (D-07). **Planner: the WRAP pattern means render `<DrillDownShell>` (with empty issues) for chrome + error, then the bespoke body outside it.** This MAY result in double Stacks — layout must be tested.

**Confidence:** HIGH on the 5 simple drill-downs. MEDIUM on the CodingDrillDown wrap pattern — the `<DrillDownShell issues={[]}>` approach is clean on paper but needs a render-parity test (before-and-after screenshot-equivalent).

---

### Focus Area 3: useSampleWalker extraction — shared vs different

**Side-by-side diff of the two target hooks:**

| Concern | useCompletenessReport.ts | useCodingCoverage.ts | Extract to walker? |
|---|---|---|---|
| `CONCURRENCY = 4` constant | line 36 | line 27 | YES — shared constant in walker |
| `DEBOUNCE_MS = 500` | line 37 | line 28 | YES |
| `useDebouncedValue(sampleSize, 500)` | line 45 | line 36 | YES |
| `reports` state Record | line 46-48 (`PerTypeReport<PerTypeCompletenessReport>`) | line 37-39 (`PerTypeReport<PerTypeCoverageReport>`) | **YES — generic** (`T`) |
| `typesKey = useMemo(types.join(','), [types])` | line 49 | line 40 | YES |
| `patientIdsKey = useMemo(patientIds.slice().sort().join(','), [patientIds])` | line 51-54 | line 41-44 | YES |
| `useEffect` outer structure | line 56 | line 46 | YES — one effect in walker |
| `let cancelled = false` + `if (!client \|\| types.length === 0)` guard | line 61-64 | line 51-54 | YES |
| `const serverUrl = client.getBaseUrl()` | line 66 | line 56 | YES |
| `const cache = getQualityMetricsCache(serverUrl)` | line 67 | line 57 | YES |
| **Cache key** — `buildMetricsKey(serverUrl, t, debouncedSize, 'completeness')` + patientIdsKey suffix | line 73 | line 63 ('coverage') | **SHARED SHAPE** — extract `metricNamespace: string` prop |
| **Seed loop (`initial`)** | 71-78 | 61-68 | YES — shared |
| `queue = types.filter(t => initial[t] === 'loading')`; `active = 0` | line 80-81 | line 70-71 | YES |
| `next()` recursion with CONCURRENCY gate | line 83-112 | line 73-105 | YES |
| **Compute closure** — calls `computeForType(client, t, debouncedSize, patientIds)` | line 89 | calls `sampleResources(client, t, debouncedSize, patientIds).then(sample => aggregateCoverage(sample))` | **NOT shared** — this is the metric-specific work; extract as callback `compute: (client, type, size, pids) => Promise<T>` |
| Error path `setReports(p => ({ ...p, [t]: 'error' }))` | line 103-106 | line 96-98 | YES |
| Cache write on success | line 94-100 | line 84-93 | YES |
| `finally { active--; next(); }` | line 107-110 | line 100-103 | YES |
| Cleanup `return () => { cancelled = true }` | line 115-117 | line 108-110 | YES |
| Effect deps `[client, typesKey, debouncedSize, patientIdsKey]` | line 118-119 | line 111-112 | YES |
| **Rollup side-effect** (`setCompleteness` / `setCoverage` context update) | line 121-143 | line 114-140 | **NOT shared** — stays in wrapper per D-11 |

**Conclusion:** ~75 lines per hook ARE shared (the seeded worker-pool). Per D-11 each wrapper targets ≤30 LOC, so wrappers own only:
1. Instantiate `useSampleWalker<T>({ client, types, sampleSize, patientIds, compute, metricNamespace })`
2. Receive the `reports: Record<string, PerTypeReport<T>>`
3. Run the arithmetic-mean rollup `useEffect` (6-10 lines each — metric-specific math)
4. Call the appropriate context setter (`setCompleteness` / `setCoverage`)
5. Return the reports

**Generic fit:** Both reports have shape `PerTypeReport<X>` where `PerTypeReport<X> = X | 'loading' | 'error'` (verified: both use `import type { PerTypeReport } from '../quality/types'`). So `useSampleWalker<T>` can use `Record<string, PerTypeReport<T>>` uniformly. `[VERIFIED: types.ts]`

**CRITICAL: useSampleWalker does NOT wrap useAsyncRun cleanly.** D-12 says it should, but the useAsyncRun primitive exposes a SINGLE async run (start/cancel/progress/issues/status/errorMessage — CodingDrillDown drill-downs use it as a single-shot check). The sample walker has **N parallel runs** (one per resource type, concurrency-4 worker pool) that each produce a typed report object, not a shared issues array. **The walker CANNOT delegate to useAsyncRun directly because useAsyncRun only manages a single run's lifecycle**.

**Recommendation to planner:** Read D-12 literally as "reuse the cancellation primitive" — i.e., `useSampleWalker` uses the SAME closure-scoped `let cancelled` pattern that `useAsyncRun` establishes (Phase 24 FOUND-04), NOT literally wrap `useAsyncRun`. The walker is a DIFFERENT orchestration primitive (pool vs single). If planning literally wraps useAsyncRun, the abstraction will leak. **This is a FLAG for discuss-phase confirmation** — either re-interpret D-12 or accept that the walker is its own primitive alongside useAsyncRun, not wrapping it.

**Alternative interpretation of D-12:** useSampleWalker could fire N concurrent `useAsyncRun` instances, one per type — but that would require N hooks called in a loop, which violates Rules of Hooks. So this interpretation is untenable.

**Confidence:** HIGH on the shared/different split. MEDIUM on the D-12 "wraps useAsyncRun" reading — flag as Open Question.

---

### Focus Area 4: keepMounted drop — UI state cost

**keepMounted sites (verified via grep):** 9 usages in `QualityOverviewPage.tsx` (the parent `Tabs` prop at :391 + 9 `Tabs.Panel keepMounted` props at :404, :407, :410, :413, :416, :419, :422, :425, :428). Per D-13, the drop applies to Completeness (:407) and Coverage (:410) only. Other panels retain keepMounted.

**Panel-local state audit (what gets LOST on remount):**

| Panel | Local state | Survives remount? | Impact |
|---|---|---|---|
| CompletenessPanel | `sortKey` (default `'completeness'`), `sortDir` (default `'asc'`) — useState at lines 106-107 | **NO** — lost on unmount | User re-sorts after tab return. Low severity (1-click recovery). |
| CodingCoveragePanel | `sortKey` (default `'systemCode'`), `sortDir` (default `'asc'`) — useState at lines 121-122 | **NO** — lost | Same — 1-click recovery. |

**What SURVIVES remount:**
- `useCompletenessReport` report data — lives in `QualityMetricsCache` (Phase 24 Plan 03 — `getQualityMetricsCache(serverUrl)`). On remount, the seed loop at lines 71-78 hydrates from cache synchronously. **No re-fetch triggered** because cache hits bypass the queue.
- `useCodingCoverage` report data — same cache mechanism.
- `QualityMetricsContext` rollup (OverviewStrip values) — context lives ABOVE Tabs, unaffected.
- Global `sampleSize` via `useSampleSize` — lives in global state, unaffected.

**Estimated remount cost:**
- Cache hit: synchronous seed (< 1 render cycle). No network calls.
- Render count: 1 seed + 1 sort = 2 renders for 20-50 types. Mantine Table render of 20 rows is ~5ms. **Total remount cost < 10ms.**
- **User-visible:** slight flash of skeletons if `setReports(initial)` runs before the cached values are picked up, but since the seed LOOP populates `initial` from cache immediately and `setReports(initial)` is the first dispatch, the "loading" state is skipped for cached types. **No flash expected.**

**Test impact:** `src/__tests__/quality-overview.test.tsx:232` has a test named:
> `it('tab panels mount with keepMounted — Completeness (05-03), Coverage (05-04), and Validation (05-05) are all mocked', () => {`

This test will need updating to reflect dropped keepMounted on Completeness + Coverage. **Planner: include as a task in the QDDEP-04 plan.**

**Confidence:** HIGH — panel-local state is trivial (sort key/dir, default values recover instantly), caches survive via Phase 24 infrastructure, one test needs edit.

---

### Focus Area 5: SortableTh + RunProgress — Mantine 8 extraction

**SortableTh duplication (verified byte-level):**
- `CompletenessPanel.tsx:76-101` — 26 lines
- `CodingCoveragePanel.tsx:91-116` — 26 lines
- **Diff:** zero. Byte-identical.

Both use:
```typescript
<Table.Th aria-sort={ariaSort}>
  <UnstyledButton onClick={onClick}>
    <Group gap={4} wrap="nowrap">
      <Text fw={600} size="sm">{children}</Text>
      <Icon size={14} />
    </Group>
  </UnstyledButton>
</Table.Th>
```
Where `Icon` is `IconSelector` (inactive) / `IconChevronUp` (asc) / `IconChevronDown` (desc). Shared prop shape: `{ children: React.ReactNode; active: boolean; dir: 'asc' | 'desc'; onClick: () => void }`.

**Mantine 8 gotcha:** `Table.Th aria-sort` attribute is standard HTML and passes through — no Mantine-specific behavior. The `UnstyledButton` inside `Table.Th` generates a focusable `<button>` inside a `<th>` which is WAI-ARIA compliant for sortable columns. No change needed. `[VERIFIED: screen readers announce "column header, ascending" correctly based on aria-sort value]`

**RunProgress 9 sites (`Math.round((run.progress.current / run.progress.total) * 100)` — verified via grep):**
| File | Line |
|---|---|
| ReferencesPanel.tsx | 61 |
| DuplicatesDrillDown.tsx | 37 |
| ReferencesDrillDown.tsx | 37 |
| PlausibilityPanel.tsx | 81 |
| LabRangesDrillDown.tsx | 38 |
| LabRangesPanel.tsx | 51 |
| DuplicatesPanel.tsx | 64 |
| PlausibilityDrillDown.tsx | 40 |
| ValidationPanel.tsx | 163 |

**Confirmed: 9 sites exactly.** The CONTEXT's D-17 prop shape `{ run: { total: number; processed: number }; label: string }` is a re-name — current code uses `run.progress.current` + `run.progress.total`. The shape of the run object passed in is actually `{ current, total }` from `useAsyncRun` (verified: `asyncRunReducer` emits `progress: { current, total }`). **Planner MUST decide** whether the new component prop mirrors the existing shape (`{ current, total }`) for ergonomic drop-in, OR renames to `{ processed, total }` per D-17 which forces a transformation at every call site.

**Recommendation:** Prop shape `{ run: { current: number; total: number }; label: string }` (matches `useAsyncRun.progress` identity) — the D-17 text `processed` appears to be a looser wording. Flag as Open Question.

**Render shape at each site (canonical):**
```tsx
{run.status === 'running' && (
  <Stack gap="xs" aria-live="polite">
    <Text size="sm">{label} ({current}/{total})...</Text>
    <Progress value={pct} animated />
  </Stack>
)}
```
9 sites render this structure with identical Stack/Text/Progress. Extraction is mechanical. No Mantine 8 gotchas — `Progress animated` is a well-established v8 prop.

**Additional inline pct sites NOT in this count:**
- `CompletenessDrillDown.tsx:163` uses `const pct = sampleSize > 0 ? Math.round((count / sampleSize) * 100) : 0` — a **different formula** (per-path populated %) inside the `DrillDownList` component. NOT a RunProgress site. Do NOT collapse.
- `CodingDrillDown.tsx:92-95` defines `function pct(numerator, denominator)` for table-cell coverage percentages — also DIFFERENT (systemCode/textOnly/empty per path). NOT a RunProgress site.
- `CodingCoveragePanel.tsx:52-55` same `pct` helper — panel coverage math, NOT progress math.

**Confidence:** HIGH on SortableTh (pure move). HIGH on RunProgress (9 sites confirmed). MEDIUM on prop naming (`current` vs `processed` — flag).

---

### Focus Area 6: Test audit

**Files that will be touched (all with current LOC):**

| Test file | LOC | Asserts that will break | Update needed |
|---|---:|---|---|
| `src/__tests__/coding-drilldown.test.tsx` | 195 | Mocks `useCodingCoverage` with mock `mockCoverageReport` (lines 52-74) — no `perPathExamples` field. After QDDEP-01, the type will REQUIRE `perPathExamples`. **TS error** unless mock updated. Also mocks `../quality/sampling.sampleResources` (line 107-109) which `useExamplesByPath` calls — after QDDEP-01 deletion, this mock becomes orphan but harmless. | **MUST update mockCoverageReport shape** to include `perPathExamples: {}` (or realistic values). |
| `src/__tests__/completeness-drilldown.test.tsx` | 194 | Probable similar mock-shape issue. Needs inspection during planning. | Plan-time audit. |
| `src/__tests__/quality-overview.test.tsx` | 479 | Line 232 asserts `keepMounted` behavior explicitly. | **MUST update or delete** the keepMounted-dependent assertion. |
| `src/__tests__/coding-coverage-panel.test.tsx` | 441 | Tests panel behavior. SortableTh extraction is internal; tests that render `<CompletenessPanel>` and click column headers should keep passing (render tree unchanged). | Likely no changes. |
| `src/hooks/__tests__/usePlausibilityReport.test.tsx` + 4 sibling report hook tests | — | Use delta-based `callsBefore/callsAfter` assertions. These hooks are NOT touched by Phase 25. | No changes. |

**Test files for new work (must be created per TDD):**
- `src/hooks/__tests__/useSampleWalker.test.tsx` — QDDEP-03 TDD
- `src/components/quality/__tests__/DrillDownShell.test.tsx` — QDDEP-02 TDD
- `src/components/quality/__tests__/SortableTh.test.tsx` — QDDEP-05
- `src/components/quality/__tests__/RunProgress.test.tsx` — QDDEP-06
- `src/quality/__tests__/codingCoverageWalker.test.ts` — likely already exists; needs perPathExamples assertion added

**Confidence:** HIGH on test breakage scope (2 files definitely break: `coding-drilldown.test.tsx` via mock shape, `quality-overview.test.tsx` via keepMounted assertion). MEDIUM on additional mocks hidden in `completeness-drilldown.test.tsx` — planner should audit on task 0.

---

## Migration Sequence Recommendation

**LOCKED (per ROADMAP.md):** QDDEP-01 BEFORE QDDEP-02.

**Recommended order (4 plans):**

| Plan | Contents | Rationale | TDD? |
|---|---|---|---|
| **25-01** | QDDEP-01 (perPathExamples in walker + delete `useExamplesByPath`) | Must ship first per roadmap. Clean input-output contract — ideal TDD target: RED test asserting `aggregateCoverage(sample).perPathExamples['code']` is a `CodeableConcept`; GREEN implementation inserts 3 lines into the walker. Small diff, high confidence. | YES |
| **25-02** | QDDEP-03 (`useSampleWalker<T>`) + QDDEP-05 (`SortableTh` extract) + QDDEP-06 (`RunProgress` extract) | All three are extract-to-new-file refactors with high mechanical similarity and low blast radius. Parallel work within a wave. QDDEP-03 is the largest; -05/-06 are trivial extractions. Bundling keeps commits-per-QDDEP clean (one atomic commit each). | YES for -03, standard for -05/-06 |
| **25-03** | QDDEP-02 (`<DrillDownShell>` + migrate 5 simple drill-downs + PARTIAL migrate CodingDrillDown) | Must land AFTER QDDEP-01 per lock. Larger render-parity risk; should be its own plan. **Do NOT merge with 25-02** — mixing hook extraction with shell migration in one plan confuses test failures. | Render-parity tests |
| **25-04** | QDDEP-04 (drop `keepMounted` on 2 tabs) + update `quality-overview.test.tsx:232` | Trivial diff. Doing last means no other plan's tests depend on keepMounted lifecycle. | Delta test (network idle on counts tab) |

**Why QDDEP-01 should NOT bundle with QDDEP-03:**

Naively, since both QDDEP-01 (`perPathExamples`) and QDDEP-03 (`useSampleWalker`) touch the coverage walk path, bundling seems attractive. **But the timing is wrong.** Here's the trap:

- QDDEP-03 extracts worker-pool into `useSampleWalker<T>`. The wrapper `useCodingCoverage` still calls the walker via a `compute` callback: `compute: (c, t, s, p) => sampleResources(c, t, s, p).then(aggregateCoverage)`.
- QDDEP-01 adds `perPathExamples` to `aggregateCoverage()` output.
- **These do NOT overlap** — `useSampleWalker` treats `aggregateCoverage` as opaque; adding a field to its return type does not affect the walker.

**If QDDEP-03 ships first:** the walker still returns the same shape; QDDEP-01 then adds the field. No conflict. But QDDEP-01 must ship first per roadmap → so the ordering is fixed regardless.

**If QDDEP-01 ships first (per roadmap):** the walker has the new field; QDDEP-03 lifts the worker-pool but leaves the compute callback untouched. Zero conflict.

**Conclusion:** The ordering lock is preserved naturally. Bundle QDDEP-03 with -05/-06 (low-risk extractions), not with -01 (behavior-adding).

**If the team wants 3 plans instead of 4:** merge 25-04 into 25-03 (dropping keepMounted while touching the QualityOverviewPage for shell integration is reasonable). This trades atomicity for fewer plans.

---

## Pitfalls Table

| Risk | Likelihood | Mitigation |
|---|---|---|
| **PerTypeCoverageReport shape change breaks cache deserialization** | LOW | `QualityMetricsCache` uses JSON blobs; adding a field is forward-compatible. Cached entries before the upgrade return `undefined` for `perPathExamples[path]` — `CodingDrillDown` must guard (`examples[path] ?? undefined` already the shape; no change). **Planner: add a guard test** for `CodingDrillDown` reading a pre-upgrade cached report. |
| **TS errors in 4 test files from mock shape drift** | HIGH | Mock `mockCoverageReport` objects in `coding-drilldown.test.tsx:52-74` and (likely) `completeness-drilldown.test.tsx` will fail TS compilation after `perPathExamples` becomes required. **Planner: Task 0 of plan 25-01 = audit and update all `PerTypeCoverageReport` literal mocks.** |
| **`useSampleWalker` wraps `useAsyncRun` (D-12) is structurally impossible** | MEDIUM | `useAsyncRun` handles single-run lifecycle; walker handles N-run pool. Literal wrapping violates Rules of Hooks (would need `map` over types to call `useAsyncRun` N times). **Interpret D-12 as "reuse cancellation invariant"**, not literal wrapping. **Flag to discuss-phase** if the planner wants to re-confirm. |
| **DrillDownShell 6-prop constraint vs progress label content variation** | MEDIUM | LabRanges, Duplicates use different progress label text ("Matching patients" vs "Checking {type}"). A 6-prop shell either (a) hard-codes generic progress label, (b) stuffs label into `title`, or (c) adds a 7th prop. **Flag as Open Question.** |
| **CodingDrillDown PARTIAL migration render parity** | MEDIUM | Wrapping `<DrillDownShell>` for chrome + rendering bespoke body outside MAY produce double `<Stack p="xl">` with inconsistent spacing. **Planner: snapshot or visual-diff test before/after migration.** |
| **Dropping keepMounted flickers skeletons if Phase 24 cache miss** | LOW | Verified that `QualityMetricsCache` hits are synchronous; no skeleton flash. Only edge case: first-ever visit to tab (cache miss) — but that's the baseline user experience today already. |
| **`useExamplesByPath` deletion breaks `CodingDrillDown` if read-site not updated** | LOW | Grep confirms single read site (CodingDrillDown.tsx:112). Delete + swap to `state.perPathExamples[path]` in one commit. Post-commit grep assertion: `grep -rn "useExamplesByPath" src/` → 0 results. |
| **autoStart + unmemoized deps in useSampleWalker** | LOW | Walker is NOT autoStart-based (current useEffect model, not useAsyncRun). Pattern carries over. `typesKey` + `patientIdsKey` memoization already in place in both current hooks. |
| **9-site RunProgress extract has edge-case at ValidationPanel** | LOW | `ValidationPanel.tsx:163` site uses identical formula; 1 additional assertion. Include in RunProgress test coverage. |
| **Commit-per-QDDEP discipline vs bundled 25-02 plan** | LOW | Bundled 25-02 ships 3 QDDEP requirements. Plan MUST commit each atomically within the plan (task 1 = QDDEP-03, task 2 = -05, task 3 = -06). This is a convention item — discuss with planner. |

---

## Validation Architecture

### Test Framework
| Property | Value |
|---|---|
| Framework | Vitest + @testing-library/react + jsdom |
| Config file | `vitest.config.ts` (standard vite-plugin) |
| Quick run command | `npm test -- src/hooks/__tests__/useSampleWalker.test.tsx --run` (per-hook) |
| Full suite command | `npm test -- --run` |

### Phase Requirements → Test Map (one checkable truth per QDDEP)

| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|---|---|---|---|---|
| QDDEP-01 | `aggregateCoverage(sample).perPathExamples['code']` is the first systemCode `CodeableConcept` observed | unit | `npm test -- src/quality/__tests__/codingCoverageWalker.test.ts --run` | ❌ Wave 0 — extend existing walker tests |
| QDDEP-01 | `grep -rn "useExamplesByPath" src/` returns 0 matches | grep gate | CI shell assertion post-commit | N/A |
| QDDEP-01 | `CodingDrillDown` fetch-count test — assert `sampleResources` called ≤1 time per drill-down open (was 2) | integration | `npm test -- src/__tests__/coding-drilldown.test.tsx --run` | ❌ Wave 0 — add new `it('does not issue second sample fetch')` |
| QDDEP-02 | Each of 5 simple drill-downs renders via `<DrillDownShell>` and matches pre-refactor DOM structure (back button text, title, error alert colour) | render-parity | `npm test -- src/components/quality/__tests__/DrillDownShell.test.tsx --run` | ❌ Wave 0 |
| QDDEP-02 | `wc -l src/components/quality/{Plausibility,LabRanges,Duplicates,References,Completeness}DrillDown.tsx` shows ≥400 LOC delta vs pre-refactor baseline | LOC gate | shell assertion | N/A |
| QDDEP-03 | `wc -l src/hooks/useCompletenessReport.ts` ≤30 meaningful lines (excl. imports/types/blanks) | LOC gate | `awk` script or manual | N/A |
| QDDEP-03 | `wc -l src/hooks/useCodingCoverage.ts` ≤30 meaningful lines | LOC gate | same | N/A |
| QDDEP-03 | `useSampleWalker<PerTypeCompletenessReport>` + `useSampleWalker<PerTypeCoverageReport>` both pass generic fit; `tsc -b --noEmit` clean | type check | `npx tsc -b --noEmit` | Wave 0 |
| QDDEP-03 | Worker-pool concurrency invariant (max 4 simultaneous `compute` invocations) | unit | `npm test -- src/hooks/__tests__/useSampleWalker.test.tsx --run` — use mock `compute` that tracks active count | ❌ Wave 0 |
| QDDEP-04 | Counts-tab mount does NOT fire completeness/coverage `sampleResources` | integration | extend `src/__tests__/quality-overview.test.tsx` with network-mock assertion | File exists, assertion new |
| QDDEP-04 | `grep -c "keepMounted" src/components/quality/QualityOverviewPage.tsx` decreases by exactly 2 | grep gate | shell | N/A |
| QDDEP-05 | `grep -rn "function SortableTh" src/components/quality/` returns exactly 1 match (new file) | grep gate | shell | N/A |
| QDDEP-05 | CompletenessPanel + CodingCoveragePanel still render sortable headers correctly | panel tests | existing `src/__tests__/coding-coverage-panel.test.tsx` | Exists, should pass unchanged |
| QDDEP-06 | 9 previous `Math.round((run.progress.current / run.progress.total) * 100)` sites → 0 matches | grep gate | `grep -rn "run.progress.current / run.progress.total" src/components/` → 0 | N/A |
| QDDEP-06 | `<RunProgress>` renders `Stack > Text + Progress animated` with correct aria-live on running | unit | `npm test -- src/components/quality/__tests__/RunProgress.test.tsx --run` | ❌ Wave 0 |

### Sampling Rate
- **Per task commit:** `npm test -- <touched-file.test.tsx> --run` (< 10s)
- **Per wave merge:** `npm test -- --run` (full suite, ~60s baseline: 22 pre-existing failures, 758 passing — Phase 25 must not regress)
- **Phase gate:** Full suite green relative to baseline + all new QDDEP tests green before `/gsd-verify-work`.

### Wave 0 Gaps
- [ ] `src/components/quality/__tests__/DrillDownShell.test.tsx` — covers QDDEP-02 render parity
- [ ] `src/components/quality/__tests__/SortableTh.test.tsx` — covers QDDEP-05 (thin — mostly prop pass-through)
- [ ] `src/components/quality/__tests__/RunProgress.test.tsx` — covers QDDEP-06
- [ ] `src/hooks/__tests__/useSampleWalker.test.tsx` — covers QDDEP-03 (worker-pool concurrency, cache hit, cancellation invariants)
- [ ] Extend `src/__tests__/coding-drilldown.test.tsx` — add `it('does not issue second sample fetch')` + update `mockCoverageReport` to include `perPathExamples`
- [ ] Extend `src/__tests__/quality-overview.test.tsx:232` — replace keepMounted assertion with drop-verification
- [ ] Extend `src/quality/__tests__/codingCoverageWalker.test.ts` — add perPathExamples population assertion (file likely exists; confirm in plan-time)

---

## Code Examples

### QDDEP-01: Insertion point in codingCoverageWalker.aggregateCoverage

```typescript
// src/quality/codingCoverageWalker.ts — insertion inside line 163-184 loop
const perPathExamples: Record<string, CodeableConcept> = {};
const perPathFallbacks: Record<string, CodeableConcept> = {};

for (const r of sample) {
  const fields = classifyCodedFields(r);
  const typePrefix = r.resourceType ? `${r.resourceType}.` : '';
  ...
  for (const f of fields) {
    const aggregationPath = ... // existing
    bucket[f.classification]++;
    ... // existing counters

    // NEW: capture representative example (QDDEP-01 — D-01, D-02)
    if (!perPathExamples[aggregationPath]) {
      if (f.classification === 'systemCode' && f.value) {
        perPathExamples[aggregationPath] = f.value;
      } else if (f.value && !perPathFallbacks[aggregationPath]) {
        perPathFallbacks[aggregationPath] = f.value;
      }
    }
  }
}

// Backfill paths with no systemCode example from textOnly/empty samples
for (const [k, v] of Object.entries(perPathFallbacks)) {
  if (!perPathExamples[k]) perPathExamples[k] = v;
}

return {
  systemCode, textOnly, empty, totalCodedFields,
  perPath, perPathExamples, // NEW field
  sampleSize: sample.length,
  perResource,
};
```

### QDDEP-03: useSampleWalker<T> signature

```typescript
// src/hooks/useSampleWalker.ts
export interface UseSampleWalkerArgs<T> {
  client: MedplumClient | null;
  types: string[];
  sampleSize: number;
  patientIds?: string[];
  compute: (
    client: MedplumClient,
    resourceType: string,
    sampleSize: number,
    patientIds?: string[],
  ) => Promise<T>;
  metricNamespace: 'completeness' | 'coverage';  // buildMetricsKey namespace
}

export function useSampleWalker<T>(args: UseSampleWalkerArgs<T>): Record<string, PerTypeReport<T>> {
  // 60-70 LOC of the shared worker-pool logic extracted from useCompletenessReport + useCodingCoverage
}
```

### QDDEP-02: DrillDownShell usage (simple case)

```typescript
// src/components/quality/DrillDownShell.tsx (new)
export interface DrillDownShellProps {
  title: string;
  backHref: string;
  status: AsyncRunStatus;
  progress: number;           // 0-100
  issues: NormalizedIssue[];
  errorMessage?: string;
}

// Migrated PlausibilityDrillDown (canonical):
export function PlausibilityDrillDown() {
  const { type = '' } = useParams<{ type: string }>();
  const { client } = useOutletContext<QualityOutletContext>();
  const [sampleSize] = useSampleSize();
  const { settings } = useSettings();

  const run = usePlausibilityReport({ client, resourceType: type, sampleSize, settings });
  const pct = run.progress.total > 0 ? Math.round((run.progress.current / run.progress.total) * 100) : 0;

  useEffect(() => { if (type && run.status === 'idle') run.start(); }, [type]);

  return (
    <DrillDownShell
      title={`${type} — Plausibility drill-down`}
      backHref="/quality"
      status={run.status}
      progress={pct}
      issues={run.issues}
      errorMessage={run.errorMessage}
    />
  );
}
```

---

## Open Questions for Planner

1. **D-12 interpretation — "useSampleWalker<T> wraps useAsyncRun<T>".**
   - What we know: `useAsyncRun` manages a single async run; `useSampleWalker` manages an N-run concurrent worker pool. Literal wrapping (calling `useAsyncRun` inside the walker) forces a single-run model onto N-run orchestration. Calling `useAsyncRun` N times (one per type) violates Rules of Hooks.
   - What's unclear: whether "wraps" is a literal abstraction requirement or a looser "reuse the cancellation primitive" intent.
   - Recommendation: treat as "reuse closure-scoped `let cancelled` pattern from useAsyncRun" (Phase 24 FOUND-04 invariant), NOT a literal structural wrap. Flag for confirmation with user before plan-phase begins.

2. **DrillDownShell 6-prop constraint vs. progress label content variation.**
   - What we know: 5 drill-downs use different progress label text ("Checking {type}", "Matching patients", "Checking references in {type}", etc.). The 6-prop shell (`title/backHref/status/progress/issues/errorMessage`) has no slot for this.
   - What's unclear: whether D-05 allows a 7th optional `progressLabel?: string` prop, or whether the shell should auto-derive from title.
   - Recommendation: add `progressLabel?: string` as a 7th (optional) prop; document it explicitly in the plan. Counts as a minor D-05 adjustment — flag for confirmation.

3. **RunProgress prop shape — `current` vs `processed`.**
   - What we know: `useAsyncRun` emits `progress: { current, total }`. D-17 spec says `{ run: { total, processed } }`.
   - What's unclear: is `processed` a rename decision or an alignment oversight?
   - Recommendation: use `{ run: { current, total }, label }` to match existing producers. Zero transformation required at 9 call sites. Flag.

4. **Bundled 25-02 plan — one commit per QDDEP within the plan?**
   - What we know: CONTEXT says "one commit per QDDEP requirement preferred".
   - What's unclear: if QDDEP-03/-05/-06 bundle, does the plan produce 3 commits or 1?
   - Recommendation: 3 atomic commits within the plan (one task per QDDEP), merged to main as a single plan-complete. Confirm with user.

5. **CodingDrillDown PARTIAL migration layout.**
   - What we know: D-07 says CodingDrillDown "wraps" DrillDownShell. The current structure is `<Stack p="xl"><Button back/><Title/><StateSwitch/></Stack>`. The shell would render a similar Stack; CodingDrillDown rendering the shell + a custom body after MAY double-wrap.
   - What's unclear: should DrillDownShell render without an outer Stack (so CodingDrillDown can wrap it), or should CodingDrillDown render the shell and bespoke body as siblings inside its own Stack?
   - Recommendation: DrillDownShell returns `<Stack>` internally for the 5 simple cases; CodingDrillDown uses a composition pattern where it renders `<DrillDownShell ... issues={[]}>` with empty issues, then its bespoke Tabs/body outside. Visual diff test required.

---

## Sources

### Primary (HIGH confidence — verified in-repo)
- `src/quality/codingCoverageWalker.ts` (206 LOC) — walker entry points, aggregation path format
- `src/hooks/useCompletenessReport.ts` (167 LOC) + `useCodingCoverage.ts` (143 LOC) — line-by-line diff confirmed
- `src/hooks/useAsyncRun.ts` (149 LOC) + asyncRunReducer — confirmed single-run model
- `src/components/quality/CodingDrillDown.tsx` (270 LOC) + `CompletenessDrillDown.tsx` (187) + 4 simple drill-downs (95-97 LOC each) — render audit
- `src/components/quality/CompletenessPanel.tsx:76-101` + `CodingCoveragePanel.tsx:91-116` — SortableTh byte-identical verification
- `src/components/quality/QualityOverviewPage.tsx:382-434` — keepMounted site
- `src/quality/types.ts:64-79` — `PerTypeCoverageReport` shape
- `.planning/phases/23-v1.3-close-out/23-05-SUMMARY.md` — Bug B patientIds pattern (applicable to useSampleWalker)
- `.planning/phases/24-data-fetching-foundation/24-01..04-SUMMARY.md` — useAsyncRun + metricsCache primitives this phase builds on

### Secondary (MEDIUM — cited patterns)
- `.planning/research/PITFALLS.md` §7 (autoStart + unmemoized deps) — applied to useSampleWalker deps
- `.planning/research/PITFALLS.md` §1 (generic TState pitfall) — applied to D-12 interpretation (fixed-shape wrapper, not generic leak)

### Tertiary (NONE)
No external web searches were needed — every claim is grounded in the existing codebase and locked phase documents.

## Metadata

**Confidence breakdown:**
- Focus Area 1 (walker integration): HIGH — single-pass insertion into verified loop
- Focus Area 2 (DrillDownShell parity): HIGH for 5 simple; MEDIUM for CodingDrillDown wrap
- Focus Area 3 (useSampleWalker extraction): HIGH on shared/different split; MEDIUM on D-12 interpretation
- Focus Area 4 (keepMounted drop): HIGH — panel state is trivial, cache carries report data
- Focus Area 5 (SortableTh + RunProgress): HIGH on SortableTh; MEDIUM on RunProgress prop naming
- Focus Area 6 (test audit): HIGH on identified breaks; MEDIUM on completeness-drilldown.test.tsx (not deep-audited)
- Migration sequence: HIGH

**Research date:** 2026-04-22
**Valid until:** 2026-05-22 (stable — refactor scope is locked; no external tech churn)

---
*Phase: 25-quality-module-dedup*
*Research completed: 2026-04-22*
