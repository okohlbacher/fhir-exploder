# Phase 46: Theme A — Foundation: Summary Util - Discussion Log

> **Audit trail only.** Do not use as input to planning, research, or execution agents.
> Decisions are captured in CONTEXT.md — this log preserves the alternatives considered.

**Date:** 2026-05-01
**Phase:** 46-theme-a-foundation-summary-util
**Areas discussed:** Registry shape, Per-type content, Generic fallback, Call-site render, Patient short-PSN mechanic, Lab Observation rendering

---

## Gray Area Selection

| Option | Description | Selected |
|--------|-------------|----------|
| Registry shape | Object literal vs typed switch vs class strategy — affects how 47/48/49 extend | ✓ |
| Per-type content | Per-type primary/secondary content for the 8 typed entries | ✓ |
| Generic fallback | Field-precedence walk for the ~140 non-registered types | ✓ |
| Call-site render | Primary-only vs primary+secondary at the 3 migrated sites | ✓ |

**User's choice:** All four selected (multiSelect).

---

## Registry Shape

| Option | Description | Selected |
|--------|-------------|----------|
| Typed switch (Recommended) | switch over r.resourceType, mirrors getResourceDateByType pattern; type narrowing per case; default → summarizeGeneric | ✓ |
| Object literal map | Partial<Record<ResourceType, fn>>; declarative but loses type narrowing without explicit casts inside each fn | |
| Class/strategy pattern | SummaryStrategy interface + Map registration; over-engineered for static 8-type set | |

**User's choice:** Typed switch.
**Notes:** Mirrors existing `getResourceDateByType` / `getResourceStatusByType` at `src/components/explorer/SearchResultsPage.tsx:108-145`. Free type narrowing per case; exhaustiveness across the covered 8 enforced at compile time.

---

## Per-Type Content

Initial proposal presented as a table:

| Type | Primary | Secondary |
|---|---|---|
| Patient | `name[0]` formatted | DOB |
| Observation | `code` display | value + unit |
| Condition | `code` display | onsetDateTime |
| Encounter | `class.display` / `type[0]` | `period.start` |
| MedicationStatement | medication display | `effectiveDateTime` |
| Procedure | `code` display | `performedDateTime` |
| DiagnosticReport | `code` display | `issued` / `effectiveDateTime` |
| AllergyIntolerance | `code` display | `category[0]` / `type` |

| Option | Description | Selected |
|--------|-------------|----------|
| Accept proposed table (Recommended) | Use the 8-type table as-is | ✓ |
| Primary only — omit secondary for v1 | Return only `{ primary }`; defer secondary until consumers need it | |
| Customize specific types | Adjust per-type | |

**User's choice:** Accept proposed table — with later "Other" refinements (Patient age/sex, lab Observation rendering) layered on top.

---

## Generic Fallback

| Option | Description | Selected |
|--------|-------------|----------|
| code → type → category → name → description → identifier → id (Recommended) | Mirrors union of 3 legacy impls; tries clinical fields first, administrative second, id last | ✓ |
| Minimal: code → name → id | Tighter walk; risks blank summaries for type/description-bearing types | |
| Generic also gets secondary | Add date-extractor fallback for secondary | |

**User's choice:** Recommended walk; secondary stays undefined for fallback.

---

## Call-Site Render

| Option | Description | Selected |
|--------|-------------|----------|
| Primary-only at all 3 sites (Recommended) | Render `.primary`; zero visual change; `.secondary` available for downstream phases | ✓ |
| Primary + dimmed secondary line below | Two-line render | |
| Primary + inline middot secondary | Single-line `primary · secondary` | |

**User's choice:** Primary-only at all 3 sites. Patient's `(age/sex)` enrichment IS visible improvement (legacy impls returned just `id` for Patient since `code/type/category` fields don't exist on Patient).

---

## Done-Check (1st Round)

| Option | Description | Selected |
|--------|-------------|----------|
| Ready for context | Write 46-CONTEXT.md with the four decisions above | |
| Explore more gray areas | More gray areas surfaced | ✓ (via "Other") |

**User's free-text response:** "For Patient also include Age and sex in short hand (68/M) in the primary. If Name is not given, fall back to available PSN/ID - make sure the IDs are short enough (max 6 alphanumeric digits, if not, map to a short-PNS registry) and use that to replace overlong Pat PSNs/IDs. For lab observations, make sure the primary is value + unit. Then we are ready for context"

This triggered two clarifying questions on:
1. Pure-vs-stateful mechanic for the short-PSN mapping
2. Where the test name goes when value+unit becomes Observation primary

---

## Patient Short-PSN Mechanic

| Option | Description | Selected |
|--------|-------------|----------|
| Deterministic truncate/hash (Recommended) | ≤6 alphanumeric → as-is; >6 → 6-char base36 hash; pure, no state | ✓ |
| Runtime alias registry (PSN-001, PSN-002...) | Module-scoped Map + lazy alias assignment; violates NAV-01 purity | |
| Just truncate to first 6 chars | Pure but risks duplicate-prefix collisions | |

**User's choice:** Deterministic truncate/hash. Preserves NAV-01 "Pure (no I/O)" constraint without amending the requirement. Hash collision risk acceptable for a display label.

---

## Lab Observation Rendering

| Option | Description | Selected |
|--------|-------------|----------|
| Secondary holds code display (Recommended) | Lab obs: primary = "5.4 mmol/L", secondary = "Glucose" | |
| Primary combines: "value unit · code display" | Lab obs: primary = "5.4 mmol/L · Glucose", secondary = effectiveDateTime | ✓ |
| Primary value+unit only | Test name dropped from summary | |

**User's choice:** Combined primary with middot. Single line keeps row layout intact at the 400px Anchor cell; user gets both the value and the test name without clicking through.

---

## Claude's Discretion

- Exact byte-precise HumanName formatting when both `text` and `family/given` exist (legacy uses `text` first; mirror that).
- Hash function choice (djb2 / fnv1a / similar — pick a stable 32-bit hash, mod into base36; no crypto).
- File-organization (single file vs `summarizers/` subfolder) — researcher decides based on file length.
- Lab-detection helper extraction (`isLabObservation(o)`) — inline or extract.

## Deferred Ideas

- Reference resolution for `medicationReference` in MedicationStatement — Phase 47.
- Generic fallback `secondary` (date extractor) — Phase 48 if needed.
- Locale-aware date / German month names — out of scope.
- Status pill — explicitly excluded by NAV-01.
- Reference-counting / popularity-weighted summary — out of scope.
