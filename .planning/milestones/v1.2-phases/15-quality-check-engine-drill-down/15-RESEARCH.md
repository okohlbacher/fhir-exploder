# Phase 15: Quality Check Engine & Drill-Down - Research

**Researched:** 2026-04-13
**Domain:** React UI components, FHIR quality data transformation, Mantine Tabs/Table/Pagination
**Confidence:** HIGH

## Summary

Phase 15 adds per-resource drill-down to the existing quality dashboard's three panels (completeness, coding coverage, validation). The core work is: (1) extending the completeness and coding coverage walkers to return per-resource issue data (they currently return only aggregate field-level stats), (2) building a shared `ResourceIssueTable` component that all three panels feed normalized issue data into, and (3) wiring tab navigation into the existing `CodingDrillDown` and `CompletenessDrillDown` pages plus the `ValidationPanel`.

The existing `ValidationIssueList` already implements the target pattern -- per-resource table with severity badges and clickable links to `/explorer/:type/:id`. This is the reference implementation for the new shared component. The completeness and coding walkers need the most work since they currently discard per-resource identity during aggregation. The validation panel already has `byResource` data from `useValidationRun`.

**Primary recommendation:** Create a shared `ResourceIssueTable` component modeled on `ValidationIssueList`, define a `NormalizedIssue` type in `src/quality/types.ts`, extend walkers to return per-resource data alongside existing aggregates, and add Mantine Tabs to the two existing drill-down pages.

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions
- **D-01:** Add a "Resources" tab alongside the existing field-level view in each drill-down page (`CodingDrillDown`, `CompletenessDrillDown`, and validation). The existing per-field breakdown becomes the "Fields" tab; the new per-resource listing becomes the "Resources" tab. Same URL, tabs switch the view.
- **D-02:** Clicking a field row in the Fields tab cross-filters the Resources tab to show only resources with issues on that specific field. This answers "which resources have this particular problem?" without requiring manual filtering.
- **D-03:** Table layout matching the existing `ValidationIssueList` pattern: Resource ID (link to `/explorer/:type/:id`), severity badge, field path, issue description. Consistent UX across all panels.
- **D-04:** Each resource ID is a clickable link to the existing resource detail view (Phase 2), satisfying DQ-02 directly.
- **D-05:** Create a shared `ResourceIssueTable` component that all 3 panels use for the Resources tab. Each panel normalizes its quality data into a common issue format (`{ resourceId, resourceType, field, description, severity }`), then passes it to `ResourceIssueTable`. This avoids duplicating table/pagination/filter logic across panels.
- **D-06:** Client-side pagination at 50 items per page using Mantine's `Pagination` component. Quality walkers already use sampling (configurable sample size), so the dataset is bounded by the sample size.
- **D-07:** Two filter controls on the Resources tab: severity dropdown (all/error/warning/info) and field path filter (text input that pre-populates when cross-filtering from the Fields tab via D-02).

### Claude's Discretion
- Exact component file organization (whether ResourceIssueTable lives in `src/components/quality/` or `src/components/shared/`)
- Tab component choice (Mantine Tabs is the obvious choice)
- How quality walkers expose per-resource data (may need to extend walker return types)
- Whether to refactor ValidationIssueList to use the new shared ResourceIssueTable or keep it separate

### Deferred Ideas (OUT OF SCOPE)
None -- discussion stayed within phase scope.
</user_constraints>

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|------------------|
| DQ-01 | User can click a quality metric on the dashboard to see the specific resources and fields causing that issue | Existing drill-down pages (`CodingDrillDown`, `CompletenessDrillDown`) already handle field-level view; adding a Resources tab (D-01) with `ResourceIssueTable` (D-05) fulfills per-resource visibility. Walker extensions needed (see Architecture Patterns). |
| DQ-02 | Each drill-down entry links to the resource detail view for inspection | `ValidationIssueList` already uses `<Anchor component={Link} to={/explorer/${type}/${id}}>` pattern (line 94-101). `ResourceIssueTable` reuses this exact pattern (D-04). |
</phase_requirements>

## Standard Stack

### Core (already installed -- no new dependencies)
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| @mantine/core | ^8.3.18 | Tabs, Table, Pagination, Select, TextInput, Badge | Already installed; all required components available [VERIFIED: existing package.json] |
| react-router-dom | ^7.14.0 | Link component for resource detail navigation | Already installed; same pattern as ValidationIssueList [VERIFIED: existing code] |
| @tabler/icons-react | (installed) | Icons for UI consistency | Already used in drill-down back buttons [VERIFIED: CodingDrillDown.tsx] |

### No New Dependencies Required
This phase requires zero new npm packages. All UI components (Tabs, Table, Pagination, Select, TextInput, Badge, Anchor) are available from `@mantine/core` which is already installed. The `Link` component from `react-router-dom` is already used in `ValidationIssueList`.

## Architecture Patterns

### Recommended Component Organization
```
src/
├── quality/
│   └── types.ts              # Add NormalizedIssue type
├── components/quality/
│   ├── ResourceIssueTable.tsx # NEW: shared per-resource table
│   ├── CodingDrillDown.tsx    # MODIFY: wrap in Tabs, add Resources tab
│   ├── CompletenessDrillDown.tsx # MODIFY: wrap in Tabs, add Resources tab
│   ├── ValidationPanel.tsx    # MODIFY: integrate ResourceIssueTable or keep ValidationIssueList
│   └── ValidationIssueList.tsx # EXISTING: reference pattern (possibly refactored)
├── hooks/
│   ├── useCodingCoverage.ts   # MODIFY: return per-resource data
│   └── useCompletenessReport.ts # MODIFY: return per-resource data
```

**Recommendation for Claude's Discretion items:**
- Place `ResourceIssueTable` in `src/components/quality/` -- it is quality-specific, not generic. [ASSUMED]
- Use Mantine `Tabs` -- already a peer dependency, natural fit, consistent with Mantine-first approach. [VERIFIED: @mantine/core exports Tabs]
- Refactor `ValidationIssueList` to use `ResourceIssueTable` internally -- reduces code duplication, satisfies D-05's cross-panel consistency goal. The `AttributedIssue` type already contains the needed fields. [ASSUMED]

### Pattern 1: NormalizedIssue Type (extends src/quality/types.ts)
**What:** Common issue format that all three panels normalize their data into before passing to ResourceIssueTable.
**When to use:** Every panel's Resources tab.
**Example:**
```typescript
// Source: Decision D-05 from CONTEXT.md
export interface NormalizedIssue {
  resourceId: string;      // e.g., "Patient/123"
  resourceType: string;    // e.g., "Patient"
  field: string;           // e.g., "code" or "Condition.code"
  description: string;     // human-readable issue text
  severity: 'error' | 'warning' | 'info';
}
```

### Pattern 2: Walker Extension for Per-Resource Data
**What:** The coding and completeness walkers currently aggregate per-field stats, discarding resource identity. They need to also return per-resource issue arrays.
**How it works now:**
- `aggregateCoverage(sample: Resource[])` returns `PerTypeCoverageReport` with `perPath` aggregates -- no per-resource tracking [VERIFIED: codingCoverageWalker.ts line 144]
- `computeCompleteness(sample, requiredPaths)` returns `{ populated, total, perPath }` with per-path counts -- no per-resource tracking [VERIFIED: completenessWalker.ts line 81]

**What needs to change:**
- `aggregateCoverage` must also return per-resource classified fields so the UI can show "Resource X has textOnly on field Y"
- `computeCompleteness` must also return per-resource missing paths so the UI can show "Resource X is missing required field Y"
- These additions should be additive (new fields on existing return types) to avoid breaking existing consumers.

**Example approach for completeness:**
```typescript
// Extend PerTypeCompletenessReport
export interface PerResourceCompletenessIssue {
  resourceId: string;
  resourceType: string;
  missingPaths: string[];
}

export interface PerTypeCompletenessReport {
  // ... existing fields ...
  /** Per-resource missing-path data for drill-down (Phase 15). */
  perResource?: PerResourceCompletenessIssue[];
}
```

**Example approach for coding coverage:**
```typescript
export interface PerResourceCodingIssue {
  resourceId: string;
  resourceType: string;
  issues: Array<{ path: string; classification: CodedClassification }>;
}

export interface PerTypeCoverageReport {
  // ... existing fields ...
  /** Per-resource coding issues for drill-down (Phase 15). */
  perResource?: PerResourceCodingIssue[];
}
```

### Pattern 3: Tab Navigation with Cross-Filter State
**What:** Mantine Tabs wrapping existing field-level view (Fields tab) and new ResourceIssueTable (Resources tab). Clicking a field row cross-filters to Resources tab with that field pre-populated.
**Example:**
```typescript
// Source: Mantine 8 Tabs API [VERIFIED: @mantine/core]
import { Tabs } from '@mantine/core';

const [activeTab, setActiveTab] = useState<string | null>('fields');
const [fieldFilter, setFieldFilter] = useState<string>('');

// Cross-filter: clicking a field row in the Fields tab
const handleFieldClick = (path: string) => {
  setFieldFilter(path);
  setActiveTab('resources');
};

<Tabs value={activeTab} onChange={setActiveTab}>
  <Tabs.List>
    <Tabs.Tab value="fields">Fields</Tabs.Tab>
    <Tabs.Tab value="resources">Resources</Tabs.Tab>
  </Tabs.List>
  <Tabs.Panel value="fields">
    {/* Existing field-level view with clickable rows */}
  </Tabs.Panel>
  <Tabs.Panel value="resources">
    <ResourceIssueTable
      issues={normalizedIssues}
      initialFieldFilter={fieldFilter}
    />
  </Tabs.Panel>
</Tabs>
```

### Pattern 4: Client-Side Pagination
**What:** Paginate ResourceIssueTable at 50 items per page.
**Example:**
```typescript
// Source: Mantine 8 Pagination API [VERIFIED: @mantine/core]
import { Pagination } from '@mantine/core';

const [page, setPage] = useState(1);
const PAGE_SIZE = 50;
const filtered = issues.filter(/* severity + field filters */);
const totalPages = Math.ceil(filtered.length / PAGE_SIZE);
const pageItems = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);
```

### Pattern 5: Validation Panel Integration
**What:** The validation panel already has per-resource data in `run.byResource` and `run.issues` (AttributedIssue[]). The normalization is straightforward.
**Source:** [VERIFIED: useValidationRun.ts lines 44-52]
```typescript
// AttributedIssue already has _resourceId, severity, expression, code, diagnostics
// Normalize to NormalizedIssue:
const normalized: NormalizedIssue[] = run.issues.map(issue => ({
  resourceId: issue._resourceId ?? '',
  resourceType: (issue._resourceId ?? '').split('/')[0],
  field: issue.expression?.[0] ?? issue.location?.[0] ?? '',
  description: `${issue.code} - ${issue.diagnostics ?? issue.details?.text ?? ''}`,
  severity: mapFhirSeverity(issue.severity),
}));
```

### Anti-Patterns to Avoid
- **Separate fetch for per-resource data:** Do NOT re-sample resources for the Resources tab. Extend existing walker/hook return types to include per-resource data from the same sample pass. The hooks already fetch via `sampleResources()` -- adding per-resource tracking is O(0) additional network cost.
- **Breaking existing hook consumers:** Walker return type extensions MUST be optional fields (`perResource?`) so `QualityOverviewPage` and `OverviewStrip` continue working without changes.

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Table with sort/filter | Custom table component | Mantine `Table` + manual filter/sort | Mantine Table is already used in ValidationIssueList and CodingDrillDown [VERIFIED: existing code] |
| Pagination | Custom pagination logic | Mantine `Pagination` + array slice | D-06 locks this choice; Mantine Pagination handles page count, active page, boundaries |
| Tab navigation | Custom tab state | Mantine `Tabs` | Required peer dep, handles ARIA roles, keyboard nav, controlled/uncontrolled modes |
| Severity badges | Custom styled spans | Mantine `Badge` with color mapping | Already used in ValidationIssueList with SEVERITY_COLOR map [VERIFIED: ValidationIssueList.tsx line 26] |

## Common Pitfalls

### Pitfall 1: Walker Extensions Breaking Existing Consumers
**What goes wrong:** Adding required fields to `PerTypeCoverageReport` or `PerTypeCompletenessReport` causes TypeScript errors in all existing consumers (overview pages, hooks, tests).
**Why it happens:** The types are imported across many files.
**How to avoid:** Make per-resource fields optional (`perResource?`). Existing code ignores the field; new drill-down code checks for it.
**Warning signs:** TypeScript build errors in unrelated quality components after modifying types.

### Pitfall 2: Memory Pressure from Per-Resource Data
**What goes wrong:** Storing per-resource issue arrays for large samples (500+ resources with many coded fields each) creates large objects in React state and the metrics cache.
**Why it happens:** Each resource can have 10-50 coded fields; 500 resources x 50 fields = 25,000 issue entries.
**How to avoid:** The sample size is bounded (configurable, default typically 50-100). With 500 resources and 50 fields, ~25K issue objects at ~100 bytes each = ~2.5MB -- acceptable. If this becomes an issue, the cache LRU eviction (already implemented at MEMORY_LIMIT=500 entries) handles it. [VERIFIED: useCodingCoverage.ts mentions MEMORY_LIMIT=500]
**Warning signs:** Slow tab switching or browser memory warnings.

### Pitfall 3: Stale Cross-Filter State
**What goes wrong:** User clicks a field in the Fields tab, sees pre-filtered Resources tab, then switches back to Fields tab and clicks a different field -- but the filter does not update.
**Why it happens:** React state for `fieldFilter` must be updated on every field click, and the Tabs `onChange` must coordinate with filter state.
**How to avoid:** Use controlled Tabs with `value`/`onChange` and update `fieldFilter` in the field click handler before switching tabs (single state update batched by React 18).
**Warning signs:** Filter text not updating when clicking different fields.

### Pitfall 4: Validation Panel Already Has Per-Resource Data
**What goes wrong:** Implementing a separate walker extension for validation when `useValidationRun` already returns `byResource` and `issues` with `_resourceId`.
**Why it happens:** Not recognizing that validation is structurally different from completeness/coding -- it already has per-resource data.
**How to avoid:** For the validation panel, normalize `run.issues` (AttributedIssue[]) directly into `NormalizedIssue[]`. No walker extension needed for validation.
**Warning signs:** Duplicate validation logic or unnecessary re-sampling.

### Pitfall 5: Severity Mapping Mismatch
**What goes wrong:** The three panels use different severity vocabularies. FHIR validation uses `fatal/error/warning/information`; completeness and coding coverage have no inherent severity -- they need a severity assignment convention.
**Why it happens:** Completeness and coding are not naturally severity-graded.
**How to avoid:** Define a mapping convention: completeness missing required field = "warning", coding empty = "warning", coding textOnly = "info". This is a UX decision the planner should lock.
**Warning signs:** Inconsistent badge colors across panels, or the severity filter not being useful for completeness/coding.

## Code Examples

### ResourceIssueTable Component Shape
```typescript
// Source: Modeled on ValidationIssueList.tsx (existing code) + D-05 decisions
import { Anchor, Badge, Code, Pagination, Select, Table, TextInput } from '@mantine/core';
import { Link } from 'react-router-dom';
import type { NormalizedIssue } from '../../quality/types';

export interface ResourceIssueTableProps {
  issues: NormalizedIssue[];
  initialFieldFilter?: string;
}

export function ResourceIssueTable({ issues, initialFieldFilter = '' }: ResourceIssueTableProps) {
  // State: page, severityFilter, fieldFilter (pre-populated from initialFieldFilter)
  // Filter logic: apply severity + field filters, then paginate
  // Render: Mantine Table with columns: #, Severity (Badge), Resource (Link), Field (Code), Description
  // Pagination: Mantine Pagination at bottom, 50 per page (D-06)
}
```

### Completeness Walker Extension
```typescript
// Source: Extending computeCompleteness in completenessWalker.ts
export function computeCompleteness(
  sample: Resource[],
  requiredPaths: string[],
): {
  populated: number;
  total: number;
  perPath: Record<string, number>;
  perResource: Array<{ resourceId: string; resourceType: string; missingPaths: string[] }>;
} {
  // ... existing logic ...
  const perResource: Array<{ resourceId: string; resourceType: string; missingPaths: string[] }> = [];
  for (const r of sample) {
    const missing: string[] = [];
    for (const p of requiredPaths) {
      if (!isPathPopulated(r, p)) missing.push(p);
    }
    if (missing.length > 0) {
      perResource.push({
        resourceId: `${r.resourceType}/${r.id ?? 'unknown'}`,
        resourceType: r.resourceType ?? '',
        missingPaths: missing,
      });
    }
  }
  return { populated, total, perPath, perResource };
}
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| Field-level-only drill-down | Per-resource + per-field drill-down with cross-filtering | Phase 15 (this phase) | Users can identify exactly which resources have issues, not just which fields |
| Separate issue table per panel | Shared ResourceIssueTable component | Phase 15 (this phase) | Consistent UX, less code duplication |

## Assumptions Log

| # | Claim | Section | Risk if Wrong |
|---|-------|---------|---------------|
| A1 | `ResourceIssueTable` should live in `src/components/quality/` not `src/components/shared/` | Architecture Patterns | Low -- just a file location, easily moved |
| A2 | Completeness missing field = "warning" severity, coding empty = "warning", coding textOnly = "info" | Pitfall 5 | Medium -- affects filter UX; if user expects different mapping, severity filter becomes confusing |
| A3 | Refactoring `ValidationIssueList` to use `ResourceIssueTable` is net positive | Architecture Patterns | Low -- if refactor is risky, keep ValidationIssueList separate and only use ResourceIssueTable for completeness/coding |
| A4 | Per-resource data in completeness/coding walkers should be additive optional fields on existing types | Architecture Patterns | Low -- safe approach, no breaking changes |

## Open Questions

1. **Severity mapping for completeness and coding issues**
   - What we know: FHIR validation has natural severity levels (fatal/error/warning/information). Completeness and coding coverage do not.
   - What's unclear: Should a missing required field be "error" or "warning"? Should empty CodeableConcept be "error" or "warning"? Should textOnly CodeableConcept be "info" or "warning"?
   - Recommendation: Default to warning/info as proposed in A2, but planner should document the mapping explicitly so it can be adjusted.

2. **ValidationIssueList refactor scope**
   - What we know: ValidationIssueList is working and tested. ResourceIssueTable will overlap significantly.
   - What's unclear: Is the refactor worth the test churn? ValidationPanel's `run.issues` are `AttributedIssue[]` (OperationOutcomeIssue-based), not `NormalizedIssue[]`.
   - Recommendation: Create ResourceIssueTable as the new component. Optionally refactor ValidationIssueList to delegate to it, but this is not required for DQ-01/DQ-02.

## Validation Architecture

### Test Framework
| Property | Value |
|----------|-------|
| Framework | Vitest 4.1.4 |
| Config file | vitest.config.ts (assumed, standard for Vite projects) |
| Quick run command | `npx vitest run --reporter=verbose` |
| Full suite command | `npm run test` |

### Phase Requirements -> Test Map
| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| DQ-01 | Click quality metric to see resources/fields | unit + integration | `npx vitest run src/__tests__/resource-issue-table.test.tsx -x` | No -- Wave 0 |
| DQ-01 | Completeness walker returns per-resource data | unit | `npx vitest run src/__tests__/completeness-walker.test.ts -x` | Yes (extend) |
| DQ-01 | Coding walker returns per-resource data | unit | `npx vitest run src/__tests__/coding-coverage-walker.test.ts -x` | Yes (extend) |
| DQ-02 | Each entry links to resource detail view | unit | `npx vitest run src/__tests__/resource-issue-table.test.tsx -x` | No -- Wave 0 |
| D-02 | Cross-filter from Fields tab to Resources tab | integration | `npx vitest run src/__tests__/coding-drilldown.test.tsx -x` | No -- Wave 0 |

### Sampling Rate
- **Per task commit:** `npx vitest run --reporter=verbose`
- **Per wave merge:** `npm run test`
- **Phase gate:** Full suite green before `/gsd-verify-work`

### Wave 0 Gaps
- [ ] `src/__tests__/resource-issue-table.test.tsx` -- covers DQ-01, DQ-02 (ResourceIssueTable rendering, links, pagination, filters)
- [ ] `src/__tests__/coding-drilldown.test.tsx` -- covers D-02 (cross-filter from Fields to Resources tab)
- [ ] Extend `src/__tests__/completeness-walker.test.ts` -- cover perResource return data
- [ ] Extend `src/__tests__/coding-coverage-walker.test.ts` -- cover perResource return data

## Security Domain

### Applicable ASVS Categories

| ASVS Category | Applies | Standard Control |
|---------------|---------|-----------------|
| V2 Authentication | No | N/A -- local-only app |
| V3 Session Management | No | N/A -- no sessions |
| V4 Access Control | No | N/A -- no auth |
| V5 Input Validation | No | No user-input-to-server; filters are client-side only |
| V6 Cryptography | No | No crypto operations |

No security concerns for this phase. All data is already loaded from the FHIR server via existing hooks. The new components only render and filter data client-side. Resource links use `react-router-dom` `Link` component (no raw href injection).

## Sources

### Primary (HIGH confidence)
- `src/components/quality/ValidationIssueList.tsx` -- reference pattern for per-resource table with severity badges and detail links
- `src/components/quality/CodingDrillDown.tsx` -- existing field-level drill-down, target for tab extension
- `src/components/quality/CompletenessDrillDown.tsx` -- existing field-level drill-down, target for tab extension
- `src/quality/types.ts` -- existing type definitions for quality reports
- `src/quality/codingCoverageWalker.ts` -- walker that needs per-resource extension
- `src/quality/completenessWalker.ts` -- walker that needs per-resource extension
- `src/hooks/useValidationRun.ts` -- already returns per-resource data (byResource, AttributedIssue[])
- `src/hooks/useCodingCoverage.ts` -- hook consuming coverage walker
- `src/hooks/useCompletenessReport.ts` -- hook consuming completeness walker
- `src/App.tsx` -- existing quality routes (lines 67-71)
- `@mantine/core` -- Tabs, Table, Pagination, Badge, Select, TextInput all available [VERIFIED: installed package]

### Secondary (MEDIUM confidence)
- None

### Tertiary (LOW confidence)
- None

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH -- zero new dependencies, all components already installed and used in codebase
- Architecture: HIGH -- existing code patterns are clear, walker extension approach is straightforward
- Pitfalls: HIGH -- based on direct code reading of existing walkers and type system

**Research date:** 2026-04-13
**Valid until:** 2026-05-13 (stable -- no external dependency changes expected)
