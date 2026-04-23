# v1.5 ARCHITECTURE Research — FHIR Exploder

**Domain:** Subsequent milestone integration — mature React 18 + Mantine 8 + Medplum 5 FHIR Exploder
**Researched:** 2026-04-23
**Confidence:** HIGH (every integration claim is file:line-verified against the v1.4-shipped codebase)

---

## Scope

This architecture research answers seven concrete integration questions for v1.5's four scope groups:

1. **UX-01** external FHIR validator cascade (execute `29-02-PLAN.md` verbatim)
2. **EFF-R14** `QualityMetricsContext` per-metric split (Option A: 7 context providers)
3. **Phase-30 UAT follow-ups (6)** — Explorer Date/Status extractor, HumanReadableView extension cleanup, ResourceDetailPage view-mode cleanup, empty per-patient panels, Dashboard MII scoping, per-type quality matrix card
4. **14 MII extension modules** + `category` + multi-type schema + collapsible section + per-module search param + color strategy

The v1.4 research at `.planning/milestones/v1.4-research/ARCHITECTURE.md` established the layer map, hook-per-metric pattern, and `<ConnectionGatedOutlet>` shape — that baseline is **input**, not re-researched. This document focuses only on what's new in v1.5.

---

## Q1 — MII_MODULES Schema Change: Multi-Type + Category

### Current consumers (exhaustive grep-verified)

| Consumer | file:line | Current assumption about `fhirResourceType` | Breakage on `string \| string[]` |
|----------|-----------|----------------------------------------------|-----------------------------------|
| `MiiModuleTab` fetch URL | `src/components/patients/MiiModuleTab.tsx:63` | String literal interpolated into `${module.fhirResourceType}?${module.patientSearchParam}=...` | **BREAKS** — `Array.toString()` gives `"Condition,Procedure"` which is not a valid FHIR resource type. Must fan out to N queries per tab. |
| `MiiModuleTab` effect dep | `src/components/patients/MiiModuleTab.tsx:81` | Used as stable scalar in `useEffect` deps | **BREAKS** — array identity changes every render unless memoized at source. |
| `MiiModuleTabs` tab subtitle | `src/components/patients/MiiModuleTabs.tsx:71` | Rendered as subtitle text under German label | **STRING RENDER BREAKAGE** — would display `"Condition,Procedure"`. Needs formatter (join with `·`? show count? show first?). |
| `ClinicalTimeline` badge lookup | `src/components/patients/ClinicalTimeline.tsx:85-86` | `MII_MODULES.find(m => m.fhirResourceType === resource.resourceType)` — **equality comparison against scalar** | **BREAKS** — `"Condition" === ["Condition", "Procedure"]` is always false, so timeline entries lose badge color + German label. Needs `.includes()` check on array. |
| `DashboardPage` MII tile count | `src/components/dashboard/DashboardPage.tsx:346` | `counts[module.fhirResourceType]` — object index with string key | **BREAKS** — indexing with array produces `undefined`. Needs sum across all types in the array. |
| `DashboardPage` subtitle | `src/components/dashboard/DashboardPage.tsx:374` | Rendered verbatim in mono text | **STRING RENDER BREAKAGE** — same as MiiModuleTabs. |
| `mii-modules.test.ts` shape test | `src/__tests__/mii-modules.test.ts:28-29` | `expect(mod.fhirResourceType).toBeTypeOf('string')` — **hard type assertion** | **BREAKS** — test needs update to allow array. |
| `mii-modules.test.ts` exact-match tests | `src/__tests__/mii-modules.test.ts:38-86` | `expect(diagnose?.fhirResourceType).toBe('Condition')` etc. | **BREAKS** — same. |

### Recommended migration strategy: normalize at the consumer boundary

Add a **single utility** in `src/utils/mii-modules.ts`:

```typescript
// NEW — added to src/utils/mii-modules.ts
export function fhirResourceTypesOf(mod: MiiModule): string[] {
  return Array.isArray(mod.fhirResourceType) ? mod.fhirResourceType : [mod.fhirResourceType];
}
```

This keeps the schema flexible (strings for the 7 base modules, arrays for multi-type extensions like Bildgebung: `['ImagingStudy', 'Media', 'DiagnosticReport']`) while giving consumers a single idiom.

| Consumer | Migration |
|----------|-----------|
| `MiiModuleTab.tsx:63` | Loop `fhirResourceTypesOf(module)`, `Promise.all` the fetches, concat entries. Becomes the primary per-module fetch shape. |
| `MiiModuleTab.tsx:81` | Use `module.key` (stable scalar) in deps instead of `module.fhirResourceType`. |
| `MiiModuleTabs.tsx:71` | Formatter: if 1 type, show as today; if >1, show `"N types"` or `types.join(' · ')`. Spec decision deferred to design. |
| `ClinicalTimeline.tsx:85-86` | `MII_MODULES.find(m => fhirResourceTypesOf(m).includes(resource.resourceType))`. |
| `DashboardPage.tsx:346` | `fhirResourceTypesOf(module).reduce((sum, t) => sum + (typeof counts[t] === 'number' ? counts[t] : 0), 0)`. Emits a sum for multi-type tiles. |
| `DashboardPage.tsx:374` | Same formatter as MiiModuleTabs. |
| `mii-modules.test.ts:28-86` | Loosen to `expect(typeof t === 'string' \|\| Array.isArray(t)).toBe(true)`; keep exact-match tests for base modules unchanged. |

### `category` field addition

New field: `category: 'base' | 'extension'`. All 7 existing base modules must get `category: 'base'` explicitly (no default — TypeScript discriminated union forces the decision). Extension modules added later carry `category: 'extension'`.

**Consumers that need to partition by category:**

- `MiiModuleTabs.tsx:67,85` — base tabs at top, extensions in `<Collapse>` section below.
- `DashboardPage.tsx:345` — base-only tile grid OR two sections. Decision: MII tile grid already renders 7 tiles at 4-col; extensions would add 14 more tiles → 21 total across ~5 rows. Recommend **partition by category** here too, or gate extensions behind a "Show extension modules" toggle since Phase-30 UAT already flagged the tile counts as confusing.
- `ClinicalTimeline.tsx:85` — no partition needed; `.find()` scan handles both transparently.

**Files new/modified:**

| New | Modified |
|-----|----------|
| — | `src/utils/mii-modules.ts:15-41` (interface) + `:48-103` (data) — add `category` to all 7; append 14 extensions |
| — | `src/utils/mii-modules.ts` — add `fhirResourceTypesOf()` helper |
| — | `src/components/patients/MiiModuleTab.tsx:63-81` — fan out per-type fetches |
| — | `src/components/patients/MiiModuleTabs.tsx:65-94` — partition base vs extension, wrap extensions in Collapse |
| — | `src/components/patients/ClinicalTimeline.tsx:85-86` — `.includes()` check |
| — | `src/components/dashboard/DashboardPage.tsx:345-384` — count sum for multi-type, category partition |
| — | `src/__tests__/mii-modules.test.ts:28-94` — relax type assertions, add coverage for extension modules |

### Confidence: HIGH
All 6 consumer sites verified by grep at file:line granularity.

---

## Q2 — QualityMetricsContext Split (EFF-R14)

### Current state (file:line-verified)

`src/quality/QualityMetricsContext.tsx:107-173` holds a single context with 8 values (`overallCompleteness`, `overallCoverage`, `overallValidation`, `overallPlausibility`, `overallLabRanges`, `overallDuplicates` (derived), `overallReferences`, `duplicatesBreakdown`) + 7 setters. The provider memos the value (`:142-171`) with **every metric in the deps array** (`:160-170`), so any single metric change creates a new value object → every consumer re-renders.

### Producer sites (where setters are called)

| Metric | Producer | file:line |
|--------|----------|-----------|
| `overallCompleteness` | `useCompletenessReport` rollup `useEffect` | `src/hooks/useCompletenessReport.ts:42,51-53` |
| `overallCoverage` | `useCodingCoverage` rollup `useEffect` | `src/hooks/useCodingCoverage.ts:41,51-55` |
| `overallValidation` | `ValidationPanel` terminal-gate effect | `src/components/quality/ValidationPanel.tsx:200-205` |
| `overallPlausibility` | `PlausibilityPanel` terminal-gate effect | `src/components/quality/PlausibilityPanel.tsx:109,113-114` |
| `overallLabRanges` | `LabRangesPanel` terminal-gate effect | `src/components/quality/LabRangesPanel.tsx:51,58-62` |
| `overallReferences` | `ReferencesPanel` terminal-gate effect | `src/components/quality/ReferencesPanel.tsx:69,73-74` |
| `overallDuplicates` (derived) | `DuplicatesPanel` via `setDuplicatesContribution` | `src/components/quality/DuplicatesPanel.tsx:102,108-121` |

### Multi-metric consumers (must preserve facade)

| Consumer | file:line | Reads |
|----------|-----------|-------|
| `OverviewStrip` | `src/components/quality/OverviewStrip.tsx:67,82-98` | **All 7** overall* fields (through `metricValueOf` switch) |
| `QualityOverviewPage` tab labels | `src/components/quality/QualityOverviewPage.tsx:204,444-462` | 7 overall* fields (one per metric tab label) |
| `QualityOverviewPage` PDF export | `src/components/quality/QualityOverviewPage.tsx:279-285` | 7 overall* fields (snapshot payload) |
| `QualityOverviewPage` capture snapshot | `src/components/quality/QualityOverviewPage.tsx:230-231` (via `metrics` arg) | Full context snapshot |
| `PdfReportLayout` | `src/components/quality/PdfReportLayout.tsx:270-286` | Consumes `summary.totals[k]` — **already shape-isolated**, no context read |

`PdfReportLayout` is the good news: it takes `totals: Record<MetricKey, number | undefined>` as a prop (`PdfReportLayoutProps.totals` at `PdfReportLayout.tsx:82`), so the **caller** (`QualityOverviewPage.tsx:278-286`) assembles the multi-metric object. The split does not touch `PdfReportLayout`.

### Recommended structure (Option A — aligns with v1.4 research recommendation)

```
src/quality/metrics/
  CompletenessContext.tsx    # { value, set }
  CoverageContext.tsx
  ValidationContext.tsx
  PlausibilityContext.tsx
  LabRangesContext.tsx
  ReferencesContext.tsx
  DuplicatesContext.tsx      # holds breakdown + derived overall
  index.tsx                  # <QualityMetricsProviders> composite + facade hook
```

### Facade preservation (non-negotiable per quality gate)

Keep `src/quality/QualityMetricsContext.tsx` exporting `useQualityMetrics()` but reimplement it as a composition of the 7 per-metric hooks:

```typescript
// NEW implementation — src/quality/QualityMetricsContext.tsx (rewrite, but API stable)
export function useQualityMetrics(): QualityMetricsContextValue {
  const completeness = useCompletenessRollup();
  const coverage = useCoverageRollup();
  const validation = useValidationRollup();
  const plausibility = usePlausibilityRollup();
  const labRanges = useLabRangesRollup();
  const references = useReferencesRollup();
  const duplicates = useDuplicatesRollup();
  return {
    overallCompleteness: completeness.value,
    overallCoverage: coverage.value,
    overallValidation: validation.value,
    overallPlausibility: plausibility.value,
    overallLabRanges: labRanges.value,
    overallReferences: references.value,
    overallDuplicates: duplicates.overall,
    duplicatesBreakdown: duplicates.breakdown,
    setCompleteness: completeness.set,
    setCoverage: coverage.set,
    setOverallValidation: validation.set,
    setOverallPlausibility: plausibility.set,
    setOverallLabRanges: labRanges.set,
    setOverallReferences: references.set,
    setDuplicatesContribution: duplicates.contribute,
  };
}
```

**Trade-off honest disclosure:** Consumers using the facade (`OverviewStrip`, the 3 consumer spots in `QualityOverviewPage`) re-render on **any** metric change, same as today. The perf win only materializes when consumers migrate to `useCompletenessRollup()` etc. directly. In practice:

- `OverviewStrip.tsx:67-98` — **must migrate** — it displays 7 independent tiles; per-metric subscription means each tile re-renders only when its own metric updates.
- `QualityOverviewPage.tsx:444-462` (tab labels) — **must migrate** — same rationale.
- `QualityOverviewPage.tsx:220-245` (capture snapshot) + `:247-328` (PDF export) — **keep using facade** — these fire on user action (one-shot), not re-render-sensitive.

### Producer-side migration

Each producer file needs a one-line change from `useQualityMetrics()` destructure to the specific hook:

| Producer | Change |
|----------|--------|
| `useCompletenessReport.ts:42` | `const { setCompleteness } = useQualityMetricsContext()` → `const { set: setCompleteness } = useCompletenessRollup()` |
| `useCodingCoverage.ts:41` | Same shape with `useCoverageRollup` |
| `ValidationPanel.tsx:200` | Same shape with `useValidationRollup` |
| `PlausibilityPanel.tsx:109` | Same shape with `usePlausibilityRollup` |
| `LabRangesPanel.tsx:51` | Same shape with `useLabRangesRollup` |
| `ReferencesPanel.tsx:69` | Same shape with `useReferencesRollup` |
| `DuplicatesPanel.tsx:102` | `useDuplicatesRollup().contribute` |

### Provider composition

`src/components/quality/QualityLayout.tsx:28` currently renders `<QualityMetricsProvider>`. Replace with `<QualityMetricsProviders>` (composite from the new `src/quality/metrics/index.tsx`). **Test impact:** all 6 test files that import `QualityMetricsProvider` (`completeness-hook.test.tsx:24`, `coding-coverage-panel.test.tsx:56`, `duplicates-panel.test.tsx:188`, `plausibility-panel.test.tsx:59`, `references-panel.test.tsx:52`, `lab-ranges-panel.test.tsx:66`, `quality-overview.test.tsx:173`) must migrate to `QualityMetricsProviders`. Keep `QualityMetricsProvider` as a deprecated alias for one cycle.

### Files new/modified

| New | Modified |
|-----|----------|
| `src/quality/metrics/CompletenessContext.tsx` | `src/quality/QualityMetricsContext.tsx` (reimplement `useQualityMetrics` as facade composition) |
| `src/quality/metrics/CoverageContext.tsx` | `src/components/quality/QualityLayout.tsx:28` (composite provider) |
| `src/quality/metrics/ValidationContext.tsx` | `src/hooks/useCompletenessReport.ts:42`, `useCodingCoverage.ts:41` |
| `src/quality/metrics/PlausibilityContext.tsx` | `src/components/quality/ValidationPanel.tsx:200`, `PlausibilityPanel.tsx:109`, `LabRangesPanel.tsx:51`, `DuplicatesPanel.tsx:102`, `ReferencesPanel.tsx:69` |
| `src/quality/metrics/LabRangesContext.tsx` | `src/components/quality/OverviewStrip.tsx:67-98` (switch to per-metric hooks) |
| `src/quality/metrics/ReferencesContext.tsx` | `src/components/quality/QualityOverviewPage.tsx:204` (mixed: tab labels → per-metric; capture/export → keep facade) |
| `src/quality/metrics/DuplicatesContext.tsx` | 6 test wrapper files + `quality-overview.test.tsx` |
| `src/quality/metrics/index.tsx` (composite + re-exports) | — |

### Confidence: HIGH on the split; MEDIUM on perf-win magnitude
Producers update ≤1× per terminal run. OverviewStrip's tile-by-tile re-render win is real but bounded. The main architectural benefit is the per-type quality matrix card (Phase-30 follow-up #6) can push per-type data into a dedicated context without contention.

---

## Q3 — External Validator Cascade (UX-01)

### Integration targets (file:line-verified per 29-02-PLAN.md)

`29-02-PLAN.md` is the execute-verbatim plan. The architecture question here is **where** each new piece attaches.

| Concern | Current location | v1.5 landing spot |
|---------|------------------|-------------------|
| PHI gate key builder + predicate | Inline in `ValidationPanel.tsx:72, 100-107` | NEW `src/quality/phiGate.ts` (per 29-02-PLAN Task 1) |
| PHI gate Alert + acknowledge button | `ValidationPanel.tsx:270-294` | Kept in `ValidationPanel.tsx`; helpers imported from `phiGate.ts` |
| `normalizeOperationOutcomeIssue` mapper | Inline `.map()` in `ValidationPanel.tsx:167-178` | NEW `src/quality/normalizers.ts` |
| `validateWithCascade()` orchestrator | Does not exist | NEW `src/quality/cascadingValidator.ts` |
| Cascade invocation | `useConformanceRun.ts:159,183-188` runs `resolveBackends` + `Promise.all(backends.map(b => b.validate(r)))` on legacy path | REPLACE `backends.map(...)` call at `useConformanceRun.ts:184-186` with `validateWithCascade(r, cascadeOptions)` |
| Probe cache | Does not exist | NEW — lives inside `useConformanceRun` as `const probeCacheRef = useRef(new Map<string, ActiveStrategy>())` alongside `valueSetCacheRef` at `useConformanceRun.ts:104` |
| "Active strategy: {tier}" status line | Does not exist | NEW render in `ValidationPanel.tsx` between `Paper` (line 296-358) backend-badge row and the progress section |
| Settings schema for `externalValidator.url/enabled/timeoutMs` | Does not exist | MODIFY `src/config/types.ts` + `src/config/settings.ts` (per 29-02-PLAN Task 4) |
| Settings YAML template | Existing `validation:` block in `public/settings.yaml` | MODIFY with commented `externalValidator:` example (per 29-02-PLAN Task 4) |
| Mantine timeout toast | Does not exist | NEW `notifications.show({ color: 'blue', ... })` inside `cascadingValidator.ts` timeout catch |

### Probe cache lifetime decision

**Recommendation: per-session `useRef<Map>` inside `useConformanceRun`**, NOT a module-scoped `Map<serverUrl, Map>` à la v1.4's `metricsCache.ts`.

Rationale:
1. Probe state is **coupled to the run coordinator**. Module scope would require an explicit invalidation hook on server-URL change (matching the `clearAllQualityMetrics()` pattern at `metricsCache.ts:163`) — extra surface for questionable value.
2. The hook already uses `useRef` for `valueSetCacheRef` at `useConformanceRun.ts:104` — identical idiom.
3. A fresh probe per session is cheap (one HEAD/`$version` call per resource type per user session).
4. The status line at `ValidationPanel.tsx` reads `run.activeStrategy` — that field is added to `ConformanceRunState` at `useConformanceRun.ts:42-52`, surfacing the current probe hit.

Module-scoped per-serverUrl map would be a premature optimization and break the 29-02-PLAN key_links contract at lines 95-98.

### Cascade control flow (new file `src/quality/cascadingValidator.ts`)

Per 29-02-PLAN interfaces (lines 200-219), the flow is:

```
validateWithCascade(resource, opts):
  key = `${opts.serverUrl}::${opts.resourceType}`
  hit = opts.probe.get(key)

  if opts.externalValidator?.enabled && isPhiAcknowledged(opts.serverUrl, opts.externalValidator.url):
    if hit !== 'server' && hit !== 'local':
      try AbortController + setTimeout(opts.externalValidator.timeoutMs ?? 15000):
        call external → normalize via normalizeOperationOutcomeIssue
        opts.probe.set(key, 'external') → return normalized
      on timeout:
        notifications.show({ color: 'blue', autoClose: 5000, ... })
        opts.probe.set(key, 'server') → fall through
      on other error:
        opts.probe.set(key, 'server') → fall through

  if opts.settings?.validation?.validatorUrl && hit !== 'local':
    try createRemoteBackend(...).validate(resource):
      opts.probe.set(key, 'server') → return via normalizer
    on error:
      opts.probe.set(key, 'local') → fall through

  // local tier (always succeeds)
  validateStructural(resource, opts.profile)
  opts.probe.set(key, 'local') → return normalized
```

### PHI gate integration point

The PHI gate has **two call sites** after extraction:

1. **UI Alert** at `ValidationPanel.tsx:270-294` — imports `isPhiAcknowledged` + `phiAckKey` from `phiGate.ts`. No behavior change.
2. **Cascade external-tier guard** — `cascadingValidator.ts` calls `isPhiAcknowledged(opts.serverUrl, opts.externalValidator.url)` **before** `new AbortController()`. Per 29-02-PLAN D-09, this is the regression-test-locked invariant (zero fetches before consent).

### Files new/modified

| New | Modified |
|-----|----------|
| `src/quality/phiGate.ts` | `src/components/quality/ValidationPanel.tsx:72,100-107,167-178,270-294` (import extraction, status line add) |
| `src/quality/normalizers.ts` | `src/hooks/useConformanceRun.ts:104,159,183-188,237-246` (cascade call + probe cache + activeStrategy surfacing) |
| `src/quality/cascadingValidator.ts` | `src/config/types.ts:14-24` (`externalValidator` block) |
| `src/quality/__tests__/phiGate.test.ts` | `src/config/settings.ts` (deepMerge for `externalValidator`) |
| `src/quality/__tests__/normalizers.test.ts` | `public/settings.yaml` (commented example) |
| `src/quality/__tests__/cascadingValidator.test.ts` | — |

### Confidence: HIGH — 29-02-PLAN.md is pre-litigated and preserved verbatim with all file:line references intact.

---

## Q4 — Extension-Modules Collapse Interaction with `keepMounted` + `activeTab`

### Current MiiModuleTabs shape (`src/components/patients/MiiModuleTabs.tsx:64-94`)

```tsx
<Tabs value={activeTab} onChange={setActiveTab} keepMounted variant="pills">
  <Tabs.List>
    {MII_MODULES.map(mod => <Tabs.Tab key={mod.key} value={mod.key}>...</Tabs.Tab>)}
    <Tabs.Tab value="timeline">...</Tabs.Tab>
  </Tabs.List>
  {MII_MODULES.map(mod => <Tabs.Panel key={mod.key} value={mod.key} keepMounted>...</Tabs.Panel>)}
  <Tabs.Panel value="timeline" keepMounted>...</Tabs.Panel>
</Tabs>
```

Two `keepMounted`: one on `<Tabs>` (parent, default `true` anyway) and one on each `<Tabs.Panel>`. Per the Phase 25 research at `.planning/milestones/v1.4-research/ARCHITECTURE.md` (Q1 investigations), Mantine's `TabsPanel` OR-combines these — the parent default `true` forces every panel to stay rendered unless the parent is explicitly `false`. Current component `keepMounted` at line 65 plus per-panel `keepMounted` at lines 86, 90 means **every tab content is mounted on first render**.

### Collapse interaction

`<Mantine Collapse>` is a CSS-height animator — it does NOT unmount children. This means:

- Wrapping extension `<Tabs.Tab>` entries inside a `<Collapse>` in `<Tabs.List>` keeps tabs clickable even when visually collapsed (Mantine allows list items outside alphabetical flow).
- Wrapping extension `<Tabs.Panel>` entries in a `<Collapse>` is unnecessary — the tab panel is already display:none when not active.

**Recommended structure:**

```tsx
<Tabs value={activeTab} onChange={setActiveTab} keepMounted variant="pills">
  <Stack gap="xs">
    <Tabs.List>
      {baseModules.map(...)}
      <Tabs.Tab value="timeline">...</Tabs.Tab>
    </Tabs.List>
    <UnstyledButton onClick={toggleExtensions}>
      <Group gap="xs">
        {extensionsOpen ? <IconChevronDown/> : <IconChevronRight/>}
        <Text size="sm" c="dimmed">Extension modules ({extensionModules.length})</Text>
      </Group>
    </UnstyledButton>
    <Collapse in={extensionsOpen}>
      <Tabs.List>
        {extensionModules.map(...)}
      </Tabs.List>
    </Collapse>
  </Stack>
  {/* Panels stay outside Collapse — Mantine Tabs controls visibility */}
  {MII_MODULES.map(mod => <Tabs.Panel key={mod.key} value={mod.key} keepMounted>...</Tabs.Panel>)}
  <Tabs.Panel value="timeline" keepMounted>...</Tabs.Panel>
</Tabs>
```

Two `Tabs.List`s inside a single `<Tabs>` context are safe — Mantine's `TabsContext` uses its parent-of-Tabs context, not structural proximity to `Tabs.List`. This is how vertical tab groupings work in other Mantine patterns.

### `activeTab` when a hidden extension is selected

If a user deep-links to `/patients/:id?moduleTab=onkologie` while Extensions are collapsed:
- `activeTab === 'onkologie'` → Mantine highlights that tab's pill
- Pill is inside `<Collapse in={false}>` → invisible to user
- **Recommended fix:** initial `extensionsOpen` state → `isExtensionKey(activeTab, MII_MODULES)` to auto-expand when the selected tab is an extension.

### Empty-state UX (per PROJECT.md v1.5 scope)

`MiiModuleTab.tsx:93-99` currently renders `"No {module.germanLabel} data found for this patient."` centered + dimmed. For extension modules where empty is **expected** (most patients won't have MTB or Biobank data), this appears 14 times below the collapse when expanded. Options:
1. **Hide empty extension tabs in tab list** (conditional tab rendering based on a per-module count — requires a new `useResourceCountsPerPatient` hook)
2. **Keep tabs visible but with dimmed opacity** (matches existing DashboardPage MII tile empty treatment at `DashboardPage.tsx:357`)

Option 2 is lighter-touch and consistent. Defer Option 1 to a follow-up.

### Files new/modified

| New | Modified |
|-----|----------|
| — | `src/components/patients/MiiModuleTabs.tsx:62-94` (partition, Collapse, auto-expand logic) |
| — | `src/components/patients/MiiModuleTab.tsx:93-99` (optional empty-state dim) |

### Confidence: HIGH on the structural pattern; MEDIUM on the auto-expand and empty-state decisions — both are UX calls that should be confirmed during requirements phase.

---

## Q5 — Multi-type Modules × Per-module patientSearchParam

### The tension

Current schema: `patientSearchParam: string` is a module-level scalar. Example: `laborbefund` uses `patient=Patient/{id}` (line 89), `person` uses `_id=Patient/{id}` (line 54). But extension modules may span multiple types with different expected params:

- Bildgebung: `ImagingStudy?patient=...` AND `Media?subject=...` AND `DiagnosticReport?subject=...`
- MTB (Molekulares Tumorboard): `Observation?subject=...` AND `ServiceRequest?subject=...`

A single `patientSearchParam: 'subject'` per module fails for types like `ImagingStudy` (uses `patient`). A single `'patient'` fails for `Observation` category=molecular-pathology variants that use `subject`.

### Recommended schema extension

**Option A — Per-type search param overrides:**

```typescript
interface MiiModule {
  // ... existing fields
  fhirResourceType: string | string[];
  patientSearchParam: string;  // default
  patientSearchParamOverrides?: Record<string, string>;  // per-type override
}
```

Example for Bildgebung:
```typescript
{
  key: 'bildgebung',
  category: 'extension',
  fhirResourceType: ['ImagingStudy', 'Media', 'DiagnosticReport'],
  patientSearchParam: 'subject',  // default for module
  patientSearchParamOverrides: { 'ImagingStudy': 'patient' },
}
```

`MiiModuleTab.tsx:63` becomes:
```typescript
const param = module.patientSearchParamOverrides?.[type] ?? module.patientSearchParam;
const url = `${type}?${param}=Patient/${patientId}&_count=50&_sort=-date`;
```

**Option B — Per-type tuples:**

Replace `fhirResourceType: string[]` with `fhirResourceTypes: Array<{ type: string; searchParam?: string }>`. More verbose but self-contained. Rejected because:
- Breaks the `fhirResourceType` identifier used across 8 sites (test grep evidence).
- `ClinicalTimeline.tsx:85-86` needs to match only on resource type, not on search param.
- The override map is cleaner in JSON serialization (if we ever persist module configs).

**Recommendation: Option A** — minimal surface, per-type overrides as sparse map.

### Files modified

| Modified |
|----------|
| `src/utils/mii-modules.ts:15-41` (add `patientSearchParamOverrides?: Record<string, string>`) |
| `src/components/patients/MiiModuleTab.tsx:63` (override lookup per type) |

### Confidence: HIGH on the data model; MEDIUM on which specific extension modules need which overrides — requires per-module profile research (happening in parallel per PROJECT.md).

---

## Q6 — Color Strategy: 14 Mantine Colors vs 21 Modules

### Current state

`src/theme.ts:19` sets `primaryColor: 'indigo'` with custom warm-neutral gray ramp override at `:26-37`. Base Mantine colors available (not overridden): `red, pink, grape, violet, indigo, blue, cyan, teal, green, lime, yellow, orange` (12 distinct non-gray colors, plus the neutral gray override).

### Existing usage

| Site | file:line | Uses |
|------|-----------|------|
| Base module `badgeColor` field | `src/utils/mii-modules.ts:53,60,67,74,81,88,100` | 7 colors: blue, indigo, teal, violet, pink, cyan, orange |
| `TimelineEntry` left border + badge | `src/components/patients/TimelineEntry.tsx:28,35` | Reads `entry.color` from `MII_MODULES` lookup in `ClinicalTimeline.tsx:94` |
| `DashboardPage` MII tile | `src/components/dashboard/DashboardPage.tsx:345-384` | Does NOT currently use `badgeColor` — tiles are neutral. **Opportunity** to surface module color as a 2-4px indicator rail (consistent with Phase-30 Sidebar indigo rail pattern). |
| Category colors | `src/components/dashboard/DashboardPage.tsx:47-59` | 11-color table for FHIR categories (Individuals → blue, Clinical → red, etc.) — **separate palette** from MII module colors |

### The 14 remaining colors

After claiming 7 for base modules: red, grape, green, lime, yellow + 2 from already-used but differentiable shades (dark+light variants of the same base hue, e.g., `blue.5` vs `blue.8`). Mantine supports shade suffixes in color tokens (`blue.6` default, `blue.3` light).

### Recommended approach

**Keep `badgeColor: string` as a Mantine color key** (not refactor to `{light, dark, text}` palette object). Reasons:

1. All existing consumers (`TimelineEntry.tsx:28,35`, the future `DashboardPage` rail) use Mantine's CSS variable system via the color key: `var(--mantine-color-${color}-6)`. Refactoring to explicit palettes breaks this idiom and duplicates Mantine's generated ramp.

2. The `ClinicalTimeline` dot color consumer at `ClinicalTimeline.tsx:94` fallbacks to `'gray'` when no match — a string fallback, not a palette fallback. Object palette would break the fallback.

3. Mantine theme (`theme.ts`) is the right place to add custom colors if 14 is insufficient. `createTheme({ colors: { mtb: ['...10 shades'], biobank: ['...10 shades'] }})` defines new first-class color keys reusable everywhere. **Defer this decision to the per-module research.**

**Color allocation strategy (preliminary, subject to revision):**

| Approach | Description | Pro | Con |
|----------|-------------|-----|-----|
| **Tier 1 — Unique per base + shared within extension subgroups** | 7 unique for base; 14 extensions share 6 colors by category (oncology=red, imaging=cyan, genetics=grape, pathology=violet, etc.) | Meaningful grouping; fits in 13 colors | Some modules share a color — risk of confusion in timeline legend |
| **Tier 2 — Unique per module via custom theme colors** | Add 7-10 custom colors to theme.colors; every module gets unique | Visual uniqueness; no confusion | Theme file bloat; palette saturation (21 swatches become hard to distinguish visually) |
| **Tier 3 — Color + shape/icon differentiator** | Colors shared by category; each module has an icon from `@tabler/icons-react` | Semantically rich; accessible (color-blind friendly) | Icon strategy not yet in MII_MODULES; needs schema field |

Recommendation: **Tier 1 for v1.5 first cut**, with optional follow-up to add icons (Tier 3) if UAT reveals confusion. Tier 2 only if Tier 1 fails UAT — adding theme colors mid-milestone is low-risk but pollutes the color palette.

### `DashboardPage` MII tile swatch

Currently `DashboardPage.tsx:345-384` renders MII tiles without a colored swatch. Adding a 2-4px indicator rail (`borderLeft: 2px solid var(--mantine-color-${module.badgeColor}-6)`) mirrors the Phase-30 sidebar active-rail pattern and the category-swatch pattern at `DashboardPage.tsx:282-289`.

### Files modified

| Modified |
|----------|
| `src/utils/mii-modules.ts` — add `badgeColor` for 14 extension modules |
| `src/components/dashboard/DashboardPage.tsx:345-384` — optional swatch/rail for module tiles (Phase-30 UAT follow-up #5 may subsume this) |
| `src/theme.ts` (optional, Tier 2) — custom color additions |

### Confidence: MEDIUM — the schema (keep string color key) is HIGH confidence; the palette strategy (Tier 1 vs 3) is a design decision that needs UAT confirmation.

---

## Q7 — Build Order & Risk Analysis

### Dependency graph

```
┌── UX-01 validator cascade ──────────────────┐
│   Independent. Touches ValidationPanel +    │
│   new files in src/quality/*. Parallel-safe │
│   with everything else.                     │
└─────────────────────────────────────────────┘

┌── EFF-R14 context split ──────────────┐
│   Internal refactor, API-preserving.  │──┬──▶ Phase-30 follow-up #6 (per-type
│   Blocks follow-up #6.                │  │    quality matrix card)
│   Parallel-safe with MII schema.      │  │    needs per-metric contexts.
└───────────────────────────────────────┘  │

┌── MII_MODULES schema change ──────────┐
│   `string | string[]` + `category` +  │
│   `patientSearchParamOverrides?`.     │
│   Blocks Extension-modules section.   │
│   Blocks 14 extension modules.        │
└────────────┬──────────────────────────┘
             │
             ▼
┌── Extension-modules Collapse UI ──────┐
│   MiiModuleTabs.tsx + dashboard tile  │
│   partition. Blocks 14-module adds    │
│   (so they have somewhere to render). │
└────────────┬──────────────────────────┘
             │
             ▼
┌── 14 extension module additions ──────┐
│   Data-only (module defs + profiles). │
│   Per-module research dictates        │
│   search params + colors.             │
└───────────────────────────────────────┘

Phase-30 UAT follow-ups (6): mostly independent except #6.
  #1 Explorer date/status extractor      → standalone
  #2 HumanReadableView extension cleanup → standalone
  #3 ResourceDetailPage rename           → standalone
  #4 Empty per-patient panel probe       → standalone (investigation)
  #5 Dashboard MII count scoping         → depends on MII schema (for extension tiles)
  #6 Per-type quality matrix card        → depends on EFF-R14 per-metric split
```

### Recommended phase order

**Phase 31 (parallel-safe group A):**
- UX-01 validator cascade (execute `29-02-PLAN.md` verbatim — all files scoped to `src/quality/cascadingValidator.ts`, `phiGate.ts`, `normalizers.ts`, `ValidationPanel.tsx`, `useConformanceRun.ts`, `config/*`)
- Phase-30 UAT #1 (Explorer date/status extractor — `SearchResultsPage.tsx` only)
- Phase-30 UAT #3 (ResourceDetailPage rename — `ResourceDetailPage.tsx`, drop `ClinicalRawView.tsx`)

These three have zero file overlap.

**Phase 32 (internal refactor):**
- EFF-R14 QualityMetricsContext split (~20 files modified, but API-preserving)
- Phase-30 UAT #4 empty per-patient panel investigation (may ship as a fix, or just a debug report)

Can start same day as Phase 31 (no file overlap with validator cascade).

**Phase 33 (MII foundation):**
- MII_MODULES schema change (`category`, `string | string[]`, `patientSearchParamOverrides?`)
- Extension-modules Collapse UI (base vs extension partition in `MiiModuleTabs.tsx`, `DashboardPage.tsx`)
- Phase-30 UAT #5 (Dashboard MII count scoping — touches same `DashboardPage.tsx:345-384` block)

**Phase 34 (MII extensions):**
- Add 14 extension modules data
- Bundled profiles per extension module (`src/quality/profiles/`)
- Per-module color strategy execution (Tier 1 palette decision from Q6)

**Phase 35 (final Phase-30 polish):**
- Phase-30 UAT #2 HumanReadableView extension cleanup (`HumanReadableView.tsx`, `ResourcePropertyTable.tsx`)
- Phase-30 UAT #6 per-type quality matrix card (depends on EFF-R14 landed in Phase 32)

### Risk analysis — what could break existing tests?

| Change | Risk | Affected tests |
|--------|------|----------------|
| MII_MODULES schema (`string \| string[]` + `category`) | MEDIUM | `src/__tests__/mii-modules.test.ts:6,10,23,28-87` (type asserts + exact-match) |
| QualityMetricsContext split | MEDIUM | 6 producer/consumer test wrappers + `quality-overview.test.tsx:351-363` (direct context-setter calls) |
| `MiiModuleTab` multi-type fan-out | LOW | `src/__tests__/` — search for MiiModuleTab tests; none found in grep, but component is integrated in `/patients/:id` tests if any |
| `ClinicalTimeline.find(...)` → `.includes()` migration | LOW | Timeline tests if any (none in explicit grep result) |
| Validator cascade in `useConformanceRun` | MEDIUM | `ValidationPanel` tests that mock `resolveBackends`; cascading shifts the mock surface |
| `setOverallValidation` etc. hook migration | LOW | Per-panel tests already wrap with `QualityMetricsProvider`, which becomes `QualityMetricsProviders` (composite) — mechanical |

### Risk analysis — what could break user behavior?

| Change | Risk | Mitigation |
|--------|------|-----------|
| `MiiModuleTab` fan-out to N queries | MEDIUM | Queries run in `Promise.all`; failure of one type falls to empty for that type (preserve `.catch()` pattern at `MiiModuleTab.tsx:74-77`) |
| External validator cascade in production | HIGH | PHI gate blocks by default; `externalValidator.enabled: false` default; AbortController + timeout + toast on failure |
| Dashboard MII tile count changes (multi-type sum) | LOW | Sum across types matches user expectation better than indexing with array (which returned undefined) |
| Extension modules visible in Collapse | LOW | Collapse starts closed by default; no change to existing tab flow |
| Color palette changes for existing modules | MEDIUM | KEEP the 7 base module colors unchanged — only add new colors for extensions |
| QualityMetricsContext split re-render behavior | LOW | Facade preserves `useQualityMetrics()`; consumer-side migration is opt-in |

### Confidence: HIGH on the graph and phase order; HIGH on test-risk identification (grep-verified).

---

## Summary Table — Integration Surface

| Scope group | New files | Modified files | Tests touched |
|-------------|-----------|----------------|---------------|
| UX-01 cascade | 6 (3 src + 3 tests) | 6 (ValidationPanel, useConformanceRun, config/types, config/settings, settings.yaml, phiGate alert extraction) | 3 new test files + ValidationPanel tests |
| EFF-R14 split | 8 (7 per-metric contexts + 1 composite) | ~12 (QualityMetricsContext.tsx facade, QualityLayout.tsx, 7 producer sites, OverviewStrip, QualityOverviewPage partial) | 7 test wrappers + quality-overview test |
| Phase-30 UAT follow-ups | 0 | 6-8 (SearchResultsPage, ResourceDetailPage, ClinicalRawView deletion, HumanReadableView, ResourcePropertyTable, DashboardPage, new per-type matrix) | moderate |
| MII schema + extensions | 14+ (bundled profiles + possibly icon modules) | 4 (mii-modules.ts, MiiModuleTab, MiiModuleTabs, DashboardPage, ClinicalTimeline, test file) | mii-modules.test.ts + new extension-module tests |

---

## Open Questions for Requirements Phase

1. **Auto-expand extension Collapse on deep-link.** Should `/patients/:id?moduleTab=onkologie` automatically open the Extension-modules Collapse? Recommend YES based on UX principle of not hiding selected state.
2. **Empty extension-module tab visibility.** Hide tabs with 0 resources per patient, or show dimmed? Current approach in `DashboardPage.tsx:357` is dimmed opacity — propose matching that idiom.
3. **Dashboard MII tile: partition or toggle?** With 14 extensions, the current 4-col grid becomes 21 tiles across 5-6 rows. Partition by category (same pattern as MiiModuleTabs) or gate extensions behind a toggle?
4. **Color palette decision — Tier 1, 2, or 3.** Needs design/UAT input before Phase 34.
5. **Probe cache module scope vs useRef.** Confirmed: `useRef` per v1.5 architecture review (diverges from v1.4 `metricsCache` pattern deliberately).
6. **Facade deprecation timeline.** Keep `useQualityMetrics()` forever, or deprecate in v1.6? Recommend keep — it's useful for PDF export and snapshot capture (bulk reads).
7. **Dashboard MII count: per-patient or server-wide?** (Phase-30 UAT #5). If per-patient, requires a new `useResourceCountsPerPatient` hook; if labelled server-wide, single-word text addition. Simpler option favored for v1.5.

---

## Sources

**Repo evidence (HIGH confidence — all line-verified 2026-04-23):**

- `src/utils/mii-modules.ts:15-103` — MiiModule interface + 7 base module definitions
- `src/components/patients/MiiModuleTab.tsx:53-99` — per-module fetch + empty state
- `src/components/patients/MiiModuleTabs.tsx:61-94` — tab bar with keepMounted
- `src/components/patients/ClinicalTimeline.tsx:85-94` — module lookup for badge color
- `src/components/patients/TimelineEntry.tsx:20-45` — color CSS variable consumption
- `src/components/dashboard/DashboardPage.tsx:30,345-384` — MII tile grid
- `src/quality/QualityMetricsContext.tsx:107-201` — monolithic context
- `src/components/quality/OverviewStrip.tsx:67-98` — 7-metric facade consumer
- `src/components/quality/QualityOverviewPage.tsx:204,279-286,444-462` — multi-metric facade consumer
- `src/components/quality/PdfReportLayout.tsx:82,270-286` — prop-shaped multi-metric consumer
- `src/components/quality/ValidationPanel.tsx:72,100-107,167-178,200-205,270-294` — PHI gate + normalizer inline
- `src/hooks/useConformanceRun.ts:104,159,183-188` — cascade integration target
- `src/quality/validationBackends.ts:32-48,53-70,83-98` — current 2-backend resolve pattern
- `src/components/quality/QualityLayout.tsx:17-35` — provider composition site
- `src/App.tsx:142-152` — lazy drill-down routes (v1.4 Phase 27 baseline)
- `src/theme.ts:16-45` — indigo primary + warm neutral ramp
- `.planning/milestones/v1.4-research/ARCHITECTURE.md` — v1.4 architecture baseline (Q4/R14 deferral, provider shim pattern)
- `.planning/phases/29-backlog-ux/29-02-PLAN.md:7-103` — cascade plan preserved verbatim
- `.planning/phases/30-layout-redesign/30-UAT.md:245-308` — 6 off-phase follow-up gaps with file paths
- `.planning/PROJECT.md:76-122` — v1.5 scope groups
