# Phase 57: References-Out Card — Discussion Log

> **Audit trail only.** Do not use as input to planning, research, or execution agents.
> Decisions are captured in CONTEXT.md — this log preserves the alternatives considered.

**Date:** 2026-05-05
**Phase:** 57-references-out-card
**Areas discussed:** Discovery, Layout, Deduplication

---

## Discovery

| Option | Description | Selected |
|--------|-------------|----------|
| Generic JSON walk | Recursively scan resource for `{ reference: "Type/id" }` shapes. Works automatically for all resource types; field path derived algorithmically. | ✓ |
| Curated registry | `forwardReferenceCatalog.ts` mapping each type to known reference fields. Explicit labels but requires manual maintenance per type. | |
| Hybrid: walk + friendly labels | Generic walk plus a small label overlay for common fields. Best of both but more code. | |

**User's choice:** Generic JSON walk
**Notes:** Default/recommended — zero maintenance, covers all types automatically.

---

## Layout

| Option | Description | Selected |
|--------|-------------|----------|
| Labeled list | `<Stack>` of rows: field path label (monospace/dimmed) + `<ReferenceLink>`. Renders immediately, no server queries, reuses existing component with all states + Cmd+click → peek. | ✓ |
| Card grid | `SimpleGrid` cards matching `IncomingReferencesPanel` visual style. Outgoing ref cards have no count to display — just navigation tiles. | |
| Inline in KeyFieldsTable | Extend `KeyFieldsTable` to render reference fields as clickable links in-place. Mixes concerns. | |

**User's choice:** Labeled list
**Notes:** Default/recommended — immediate render, reuses `ReferenceLink` component.

---

## Deduplication

| Option | Description | Selected |
|--------|-------------|----------|
| Show each field occurrence | One row per field path even if same target appears in multiple fields. Preserves structural context (e.g., `subject` vs `participant[0].individual` both point to Patient/123 → two rows). | ✓ |
| Deduplicate by target | Show each target once regardless of how many fields reference it. Cleaner visually, loses path context. | |
| Group: target + all field labels | Show target once, list all fields it appears under ("subject, participant[0].individual → Patient/123"). | |

**User's choice:** Show each field occurrence
**Notes:** Default/recommended — preserves full structural context.

---

## Claude's Discretion

- Panel title: "Outgoing References"
- Path label style: `ff="monospace"` + `c="dimmed"` + `size="sm"`
- Row layout: `<Group gap="xs">` with path left, `ReferenceLink` right
- Validation: reuse `FHIR_REFERENCE_PATTERN` / `FHIR_ID_PATTERN` from `ResourceDetailPage.tsx`
- Skip fields: `resourceType`, `id`, `meta`, `text`, `contained`

## Deferred Ideas

None — discussion stayed within phase scope.
