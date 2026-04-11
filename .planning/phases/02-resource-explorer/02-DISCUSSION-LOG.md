# Phase 2: Resource Explorer - Discussion Log

> **Audit trail only.** Do not use as input to planning, research, or execution agents.
> Decisions are captured in CONTEXT.md — this log preserves the alternatives considered.

**Date:** 2026-04-11
**Phase:** 02-resource-explorer
**Areas discussed:** Search UX (interactive), Resource type selection, Pagination, Display modes, Reference navigation, _include/_revinclude (carried from prior auto-run)

---

## Search UX (Interactive Discussion)

### Q1: Search component approach

| Option | Description | Selected |
|--------|-------------|----------|
| SearchControl-first (Recommended) | Use Medplum's SearchControl as the primary search UI. Handles filter fields, sorting, pagination, and result display in one component. Customize columns and styling but don't reinvent the search form. | ✓ |
| Custom search form | Build our own search form from scratch using Mantine inputs. More control over layout and UX, but significant effort to replicate what SearchControl does. | |
| Hybrid | Use SearchControl for results/pagination but add a custom search bar + expandable filter panel on top. | |

**User's choice:** SearchControl-first (Recommended)

### Q2: Search parameter visibility

| Option | Description | Selected |
|--------|-------------|----------|
| All params visible | Show all available search parameters. May be overwhelming for types with 30+ params. | |
| Curated defaults + expand | Show curated common params (name, date, status, code) by default. "Show all filters" reveals full CapabilityStatement param list. | ✓ |
| You decide | Claude picks based on SearchControl's native capabilities. | |

**User's choice:** Curated defaults + expand

### Q3: Search trigger behavior

| Option | Description | Selected |
|--------|-------------|----------|
| Explicit submit (Recommended) | User fills params and clicks Search / presses Enter. Predictable, avoids hammering Blaze on large datasets. | ✓ |
| Live filter with debounce | Results update as user types with 300-500ms debounce. Snappy but may cause excessive Blaze requests. | |
| You decide | Claude picks based on SearchControl behavior and Blaze performance. | |

**User's choice:** Explicit submit (Recommended)

### Q4: URL state management

| Option | Description | Selected |
|--------|-------------|----------|
| URL-driven search (Recommended) | Search params sync to URL (e.g., /explorer/Patient?name=Mueller&_count=25). Back/forward works, bookmarkable. Prepares for v2 BRWS-09. | ✓ |
| In-memory only | State in component only. Simpler but no bookmarking, back-button resets search. | |
| You decide | Claude picks what works best with SearchControl's API. | |

**User's choice:** URL-driven search (Recommended)

---

## Resource Type Selection
[carried from auto-run] Reuse Phase 1 grouped list + top-of-Explorer dropdown.

## Pagination
[carried from auto-run] FHIR Bundle pagination links with configurable _count dropdown (10/25/50/100, default 20).

## Display Modes
[carried from auto-run] Three-mode tab bar: human-readable (Medplum), clinical+raw split, developer JSON.

## Reference Navigation
[carried from auto-run] Clickable Reference fields via ReferenceDisplay + breadcrumb trail.

## _include/_revinclude
[carried from auto-run] Optional in advanced filter panel, related resources grouped in results.

## Claude's Discretion

- Search results table column selection and ordering per resource type
- Keyboard shortcuts for switching display modes
- Search history/recent searches behavior
- How "curated" search params are determined per resource type

## Deferred Ideas

None — discussion stayed within phase scope.
