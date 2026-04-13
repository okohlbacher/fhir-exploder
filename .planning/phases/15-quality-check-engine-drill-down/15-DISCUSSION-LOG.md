# Phase 15: Quality Check Engine & Drill-Down - Discussion Log

> **Audit trail only.** Do not use as input to planning, research, or execution agents.
> Decisions are captured in CONTEXT.md -- this log preserves the alternatives considered.

**Date:** 2026-04-13
**Phase:** 15-quality-check-engine-drill-down
**Areas discussed:** Drill-down navigation, Resource list layout, Cross-panel consistency, Filtering & pagination

---

## Drill-down Navigation

### How should users navigate from dashboard metric to individual resources?

| Option | Description | Selected |
|--------|-------------|----------|
| Add resource tab to existing drill-downs | Extend /quality/{panel}/:type with "Fields" + "Resources" tabs. Reuses existing routing. | ✓ |
| New nested route layer | Dashboard -> per-type -> per-resource. Three-level deep. | |
| Inline expansion | Expand field rows to see resources. No new page. | |
| You decide | Claude picks | |

**User's choice:** Add resource tab to existing drill-downs

### Should clicking a field cross-filter the Resources tab?

| Option | Description | Selected |
|--------|-------------|----------|
| Yes, cross-filter | Click field -> switch to Resources tab pre-filtered | ✓ |
| No, independent tabs | Each tab independent | |
| You decide | Claude picks | |

**User's choice:** Yes, cross-filter

---

## Resource List Layout

### How should the resource list display?

| Option | Description | Selected |
|--------|-------------|----------|
| Table with columns | Resource ID (link), severity badge, field path, issue description | ✓ |
| Card layout | Cards with ID, type, fields, View button | |
| Compact list | Simple list grouped by issue type | |

**User's choice:** Table with columns

### What info should each entry show?

| Option | Description | Selected |
|--------|-------------|----------|
| Match ValidationIssueList | Resource ID link, severity badge, field path, issue description | ✓ |
| Richer cards | Add resource summary (patient name, observation code) | |
| You decide | Claude picks based on walker data | |

**User's choice:** Match ValidationIssueList

---

## Cross-Panel Consistency

### Should all 3 panels use a shared drill-down component?

| Option | Description | Selected |
|--------|-------------|----------|
| Shared ResourceIssueTable | One component, common issue format, DRY and consistent | ✓ |
| Panel-specific views | Each panel has own resource list component | |
| You decide | Claude decides based on data shapes | |

**User's choice:** Shared ResourceIssueTable

---

## Filtering & Pagination

### How to handle many resources?

| Option | Description | Selected |
|--------|-------------|----------|
| Client-side pagination | 50 per page, Mantine Pagination | ✓ |
| Virtual scroll | @tanstack/react-virtual | |
| Load more button | Show 50, append more | |
| You decide | Claude picks | |

**User's choice:** Client-side pagination

### Should the resource list have filters?

| Option | Description | Selected |
|--------|-------------|----------|
| Severity + field filter | Dropdown for severity, field filter pre-populated from cross-filter | ✓ |
| No filters | Flat list with pagination only | |
| You decide | Claude decides | |

**User's choice:** Severity + field filter

---

## Claude's Discretion

- Component file organization
- Tab component choice
- Walker return type extensions
- Whether to refactor existing ValidationIssueList

## Deferred Ideas

None -- discussion stayed within phase scope
