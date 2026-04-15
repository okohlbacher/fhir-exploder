# Phase 16: Conformance & Plausibility Checks - Discussion Log

> **Audit trail only.** Do not use as input to planning, research, or execution agents.
> Decisions are captured in CONTEXT.md — this log preserves the alternatives considered.

**Date:** 2026-04-13
**Phase:** 16-conformance-plausibility-checks
**Areas discussed:** Value set conformance, Cardinality vs existing, Temporal plausibility, Lab reference ranges

---

## Folded Todos

Both pending cohort-related todos were folded into Phase 16 scope:
- Add cohort selection for scoped data quality analysis (relevance: 0.7)
- Define cohorts via FHIRPath query or MII FDPG format (relevance: 0.5)

---

## Value Set Conformance

### Value set source

| Option | Description | Selected |
|--------|-------------|----------|
| Terminology server (Recommended) | Expand value sets via MII Terminology Server ($expand). Cache expansions. Falls back gracefully to 'skip check' if server unavailable. | ✓ |
| Bundled value set lists | Ship a static list of expected codes per binding. Works offline but quickly outdated. | |
| Binding metadata only | Just check that coding.system matches expected system, without validating individual codes. | |

**User's choice:** Terminology server (Recommended)

### Presentation

| Option | Description | Selected |
|--------|-------------|----------|
| New 'Conformance' panel tab | Add a 5th tab on the quality dashboard. | |
| Extend Validation panel | Add conformance issues into the existing Validation panel. | ✓ |
| Extend Coding Coverage panel | Fold into existing Coverage panel. | |

**User's choice:** Extend Validation panel

### Terminology fallback

| Option | Description | Selected |
|--------|-------------|----------|
| Skip + warn (Recommended) | Skip value set checks, show warning banner. Consistent with existing fallback. | ✓ |
| Cache last expansion | Use last successful expansion from cache. | |

**User's choice:** Skip + warn (Recommended)

### Value set cache

| Option | Description | Selected |
|--------|-------------|----------|
| Session cache (Recommended) | Cache in memory for browser session. Re-fetched on page reload. | ✓ |
| Persistent cache | Cache in localStorage with TTL. | |
| No cache | Always expand on demand. | |

**User's choice:** Session cache (Recommended)

---

## Cardinality vs Existing

### Extending structural validator

| Option | Description | Selected |
|--------|-------------|----------|
| Add max checks (Recommended) | Extend structural validator to also check max cardinality. | |
| Separate cardinality walker | Build a new walker specifically for cardinality. | |
| Profile-based full check | Replace structural validator with comprehensive profile checker (min, max, type, value set bindings). | ✓ |

**User's choice:** Profile-based full check

### Layout

| Option | Description | Selected |
|--------|-------------|----------|
| Same section (Recommended) | Cardinality issues appear in existing Validation panel alongside other checks. | ✓ |
| Separate sub-tab | Add a 'Cardinality' sub-tab within Validation panel. | |

**User's choice:** Same section (Recommended)

### Check scope (multi-select)

| Option | Description | Selected |
|--------|-------------|----------|
| Min cardinality (existing) | Required paths must be populated. | ✓ |
| Max cardinality (new) | Fields with max=1 must not have multiple values. | ✓ |
| Type constraints (new) | Values match expected FHIR types from profile. | ✓ |
| Value set bindings (new) | Coded values checked against bound value sets (DQ-03). | ✓ |

**User's choice:** All four selected — comprehensive profile checker

---

## Temporal Plausibility

### Temporal checks (multi-select)

| Option | Description | Selected |
|--------|-------------|----------|
| Future dates (Recommended) | Flag any dateTime/date in the future. | ✓ |
| Period consistency | Flag Period fields where end < start. | ✓ |
| Age plausibility | Flag birthDate implying age > 150 or negative. | ✓ |
| Clinical duration limits | Flag encounters > 365d, observations before patient birth. | ✓ |

**User's choice:** All four selected

### Date field discovery

| Option | Description | Selected |
|--------|-------------|----------|
| Auto-discover from profiles (Recommended) | Walk MII profile elements for temporal types. Extensible. | ✓ |
| Hardcoded field list | Fixed list of known fields. | |
| All date fields in any resource | Walk every resource for date-like fields. | |

**User's choice:** Auto-discover from profiles (Recommended)

### Thresholds

| Option | Description | Selected |
|--------|-------------|----------|
| Hardcoded sensible defaults | Fixed thresholds. Phase 18 adds configurability later. | |
| Configurable from start | Store thresholds in settings.yaml. | ✓ |

**User's choice:** Configurable from start

### Layout

| Option | Description | Selected |
|--------|-------------|----------|
| New 'Plausibility' tab (Recommended) | New tab for temporal checks, separate from Validation. | ✓ |
| Inside Validation panel | Add plausibility to Validation panel. | |

**User's choice:** New 'Plausibility' tab (Recommended)

---

## Lab Reference Ranges

### Range source

| Option | Description | Selected |
|--------|-------------|----------|
| Data-first + config override (Recommended) | Use Observation.referenceRange from data, with user-defined overrides in settings.yaml. | ✓ |
| Config-only | All ranges from settings.yaml. | |
| Data-only | Only Observation.referenceRange from data. | |

**User's choice:** Data-first + config override (Recommended)

### Range logic

| Option | Description | Selected |
|--------|-------------|----------|
| Outside low/high bounds (Recommended) | Flag when value < low or > high. Standard clinical logic. | ✓ |
| Percentage deviation | Flag when value deviates by > X% from midpoint. | |
| Critical ranges only | Only flag dangerously out-of-range values. | |

**User's choice:** Outside low/high bounds (Recommended)

### Layout

| Option | Description | Selected |
|--------|-------------|----------|
| In Plausibility tab (Recommended) | Group with temporal checks. | |
| Separate Lab tab | Dedicated tab for lab range analysis. | ✓ |

**User's choice:** Separate Lab tab

### Range config storage

| Option | Description | Selected |
|--------|-------------|----------|
| settings.yaml section (Recommended) | Add referenceRanges section to existing settings.yaml. | ✓ |
| Separate config file | Dedicated reference-ranges.yaml. | |

**User's choice:** settings.yaml section (Recommended)

---

## Claude's Discretion

- Whether to refactor structuralValidator.ts in place or create new profileValidator.ts
- Internal organization of plausibility walker
- Settings.yaml schema for reference ranges and thresholds
- Temporal field auto-discovery fallback for resources without bundled profiles

## Deferred Ideas

None — discussion stayed within phase scope
