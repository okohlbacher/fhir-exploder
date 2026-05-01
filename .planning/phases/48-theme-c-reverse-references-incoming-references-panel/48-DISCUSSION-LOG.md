# Phase 48: Theme C — Reverse References / Incoming-References Panel - Discussion Log

> **Audit trail only.** Do not use as input to planning, research, or execution agents.
> Decisions are captured in 48-CONTEXT.md — this log preserves the alternatives considered.

**Date:** 2026-05-01
**Phase:** 48 — Theme C: Reverse References / Incoming-References Panel
**Mode:** `--auto` (Claude selected the recommended option for every gray area without interactive AskUserQuestion turns)
**Areas discussed:** Catalog shape & scope, Component generalization, Card visual content, Mount position, Loading & empty state behavior

---

## Catalog Shape & Scope

| Question | Option | Selected |
|----------|--------|----------|
| How many source resource types? | 5 keys (NAV-01 typed entries minus less-referenced ones) | |
|  | **9 keys: Patient (existing 11) + 8 NAV-01 typed source types** | ✓ |
|  | 12+ keys (extend to Practitioner, Organization, Location, Medication) | |
| Catalog file location | `src/utils/reverseReferenceCatalog.ts` | ✓ |
|  | `src/components/explorer/reverseReferenceCatalog.ts` | |
|  | Inline inside `IncomingReferencesPanel.tsx` | |
| Per-entry value shape | `{ type, param }` minimal tuple | |
|  | `{ type, param, icon? }` minimal + optional icon | ✓ |
|  | `{ type, param, icon?, description? }` rich entry | |

**Selected:** 9 source-type keys, file at `src/utils/reverseReferenceCatalog.ts`, entry shape `{ type, param, icon? }`.
**Notes:** Coverage matches REQ wording "8–12 types matching NAV-01 scope." The optional `icon` field lets Patient retain its existing emoji set without forcing non-Patient entries to invent icons in v1.

---

## Component Generalization

| Question | Option | Selected |
|----------|--------|----------|
| How to share render between Patient + non-Patient? | Two parallel components, copy-paste body | |
|  | Single component with `mode: 'patient' \| 'reverse'` prop | |
|  | **Extract shared `<RelatedResourcesPanel>`; thin wrappers compute entries** | ✓ |
|  | Higher-order component / render prop pattern | |
| Patient wrapper file | Rename `PatientRelatedResources` → something neutral | |
|  | **Keep `PatientRelatedResources.tsx` filename; refactor body to consume catalog + shared render** | ✓ |
| New non-Patient wrapper file | `IncomingReferencesPanel.tsx` (matches REQ wording) | ✓ |
|  | `ReverseReferencesPanel.tsx` | |
|  | `RelatedResourcesPanel.tsx` directly used (no separate wrapper) | |

**Selected:** Extract shared render component; keep both wrapper filenames; new wrapper is `IncomingReferencesPanel.tsx`.
**Notes:** Satisfies SC #4 ("share single render component") cleanly. Existing callers of `PatientRelatedResources` need zero changes.

---

## Card Visual Content

| Question | Option | Selected |
|----------|--------|----------|
| What appears on each card? | **Icon + type + count badge (mirror existing PatientRelatedResources)** | ✓ |
|  | Icon + type + count + subtitle line (e.g., "5 most recent") | |
|  | Icon + type + count + summarizeResource preview of top entry | |
| Icons on non-Patient catalog entries? | Design icon for each non-Patient source type | |
|  | **Omit icons for non-Patient in v1 (text-only)** | ✓ |
|  | Generic `🔗` icon for all non-Patient | |

**Selected:** Minimal cards (icon optional + type + count); no icons for non-Patient in v1.
**Notes:** SC #2 says "card grid UI mirrors PatientRelatedResources" — minimal interpretation passes. Subtitle / top-result preview deferred.

---

## Mount Position in ResourceDetailPage

| Question | Option | Selected |
|----------|--------|----------|
| Where in `ResourceDetailPage.tsx` does the panel mount? | Above the `<Tabs>` block (preserve existing Patient position) | |
|  | **Below the `<Tabs>` block (true footer per design handoff)** | ✓ |
|  | Inside each `Tabs.Panel` (one mount per tab) | |
| What about existing Patient panel position? | Leave Patient above-Tabs, mount Incoming below for non-Patient | |
|  | **Relocate Patient panel below-Tabs too — single position for both wrappers** | ✓ |

**Selected:** Both wrappers mount below `<Tabs>` via a single ternary. The Patient panel relocates from above-Tabs to below-Tabs.
**Notes:** Design handoff §30 calls for footer-position. Spatial unification is the SC #4 closure interpretation.

---

## Loading & Empty State Behavior

| Question | Option | Selected |
|----------|--------|----------|
| Loading state | **Preserve existing pattern: skeleton cards with `<Loader>` while pending** | ✓ |
|  | Replace with global Mantine `<Skeleton>` block | |
|  | Hide panel entirely until all queries settle | |
| Failed-lookup behavior | **Silent drop: failed entry → count = 0 → card hidden** | ✓ |
|  | Show error toast for each failure | |
|  | Show inline "?" badge with retry button | |
| All counts zero | **Render `null` (panel disappears entirely)** | ✓ |
|  | Render panel with empty-state message | |
|  | Render panel with placeholder cards | |

**Selected:** Loading skeletons → silent failures → null when all empty.
**Notes:** Mirrors existing `PatientRelatedResources` semantics exactly. Same silent-fallback policy as Phase 47 reference resolver (D-02 of 47-CONTEXT) — consistent UX across the navigation features.

---

## Click-Through Navigation

| Question | Option | Selected |
|----------|--------|----------|
| Click target URL pattern | **`/explorer/{type}?{param}={ref}` (mirror existing `PatientRelatedResources`)** | ✓ |
|  | `/explorer/{type}/by-ref/{ref}/{param}` (typed sub-route) | |
|  | Open the JSON peek drawer (deferred — drawer not yet shipped) | |
| Where does the URL string get constructed? | Inside the shared `<RelatedResourcesPanel>` (hard-coded pattern) | |
|  | **In the wrapper via `onCardNavigate(entry)` callback (decouples shared render from URL convention)** | ✓ |

**Selected:** Same URL pattern as today; constructed in wrappers via callback prop.
**Notes:** Decoupling means future variations (e.g. drawer-trigger) require zero shared-component edits.

---

## Claude's Discretion

The following decisions are explicitly delegated to the researcher / planner:
- Icon strategy for non-Patient cards if reversed in a future polish phase (`@tabler/icons-react` is the likely vehicle).
- `useMemo` boundaries inside the shared component for `entries` and `refValue`.
- Card grid responsive breakpoints (recommend hardcoded `{ base: 2, sm: 3, md: 4 }` per existing).
- Test file naming inside `__tests__/` subfolders (recommend mirroring existing convention).

## Deferred Ideas

- CapabilityStatement-driven runtime catalog (REQUIREMENTS.md already defers this).
- "Peek JSON" card action (depends on JSON peek drawer phase — not yet scheduled).
- Card subtitle / top-referencer summary preview.
- Non-Patient card icon design system.
- Sort-by-count card ordering.
- CapabilityStatement gap-report Quality dashboard tile.
