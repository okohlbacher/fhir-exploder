---
phase: 48
slug: theme-c-reverse-references-incoming-references-panel
status: draft
shadcn_initialized: false
preset: none
created: 2026-05-01
---

# Phase 48 — UI Design Contract

> Visual and interaction contract for the Incoming-References Panel + generalized RelatedResourcesPanel. This phase is a **refactor + extraction** of the existing `PatientRelatedResources` component; the contract here documents the byte-identical visuals already in production so downstream verification has a written baseline. Per CONTEXT D-08/D-09/D-10: visual content is locked byte-identical to existing cards. No new tokens, no new typography, no new icons.

---

## Design System

| Property | Value |
|----------|-------|
| Tool | none (Mantine 8 is the project design system; shadcn does not apply — Mantine theme + CSS-in-JS) |
| Preset | not applicable |
| Component library | `@mantine/core` ^8.3.18 (required peer of `@medplum/react`) |
| Icon library | Emoji glyphs only for Patient catalog entries (existing); no new icon library introduced (`@tabler/icons-react` is in the stack but not consumed here per CONTEXT D-09) |
| Font | Mantine default (system-ui stack); no font change |

**Detection result:** No `components.json`, no `tailwind.config.*`. Project uses Mantine 8 theme via `MantineProvider` at app root. Phase 48 introduces zero new dependencies (CONTEXT D-18).

---

## Spacing Scale

Mantine 8 default scale (multiples of 4) — Phase 48 uses these values verbatim from existing `PatientRelatedResources.tsx`:

| Token | Value | Usage in this phase |
|-------|-------|---------------------|
| `xs` | 4px (Mantine `xs`) | `Group gap="xs"` between icon and type label inside cards |
| `sm` | 8px (Mantine `sm`) | `Card padding="sm"`, `Title mb="sm"` (gap below section title) |
| `md` | 16px (Mantine `md`) | Default `SimpleGrid` column gap |
| `lg` | 24px (Mantine `lg`) | **NEW for this phase:** vertical gap between `<Tabs>` block and the panel beneath it (panel container receives `mt="lg"` or sits inside the parent `Stack gap="lg"` already on `ResourceDetailPage`) |

Exceptions: none. The parent `ResourceDetailPage` already wraps everything in `<Stack gap="lg">` (line 134), so the new below-Tabs panel inherits the `lg` vertical rhythm without an explicit `mt` prop.

---

## Typography

Mantine 8 default scale — Phase 48 uses these values verbatim from existing `PatientRelatedResources.tsx` lines 71–96:

| Role | Mantine prop | Computed | Weight | Line Height | Usage |
|------|-------------|----------|--------|-------------|-------|
| Section title | `<Title order={5}>` | ~16px (Mantine h5) | 700 (Mantine default heading) | 1.35 | `"Related Resources"` (Patient wrapper) and `"Referenced By"` (Incoming wrapper) |
| Card type label | `<Text size="sm" fw={500}>` | 14px | 500 | 1.55 | Bold resource type name on the populated card (e.g. `"Observation"`) |
| Card icon glyph | `<Text size="sm">` | 14px | 400 | 1.55 | Emoji-only render for Patient entries; omitted for non-Patient |
| Card loading-state label | `<Text size="sm">` | 14px | 400 | 1.55 | Resource type name beside the loader spinner |
| Badge count | `<Badge size="sm">` | 11px (Mantine sm-badge) | 700 | 1 | Numeric count, right-aligned in card |

**Constraints:**
- 3 distinct sizes: 16px (title), 14px (card body), 11px (badge).
- 2 distinct weights: 400 (regular) for icon glyph + loading label, 500–700 (medium/bold) for type label, badge, and section title.
- Line heights are Mantine defaults; no override.
- No new font-family. No new typography scale.

---

## Color

Phase 48 introduces **zero new colors**. Mantine 8 theme tokens already cover everything:

| Role | Source | Usage in this phase |
|------|--------|---------------------|
| Dominant (60%) — surface | Mantine `body` background (white in light mode, dark.7 in dark mode) | Page background; flows in from `MantineProvider` |
| Secondary (30%) — card chrome | Mantine `Card withBorder` default (1px `gray.3` border, surface fill) | Card backgrounds + 1px borders for both panels |
| Accent (10%) — count emphasis | Mantine `color="blue"` `variant="light"` on `<Badge>` | **Reserved for:** Badge count chip ONLY. The accent is the count itself (e.g. `5,234`). Not used on borders, not used on text, not used on hover. |
| Destructive | not used | Phase 48 has no destructive actions |

**Accent reserved for:** the right-aligned `<Badge size="sm" variant="light" color="blue">` count chip on each populated card. Nothing else in this phase uses `color="blue"`.

**Theme integration:** Mantine handles light/dark automatically via `MantineProvider`. No explicit dark-mode overrides required for Phase 48 — `Card withBorder`, `Badge variant="light"`, and `Title` all theme-respond out of the box.

---

## Copywriting Contract

| Element | Copy | Notes |
|---------|------|-------|
| Section title — Patient wrapper | **`Related Resources`** | Verbatim from existing `PatientRelatedResources.tsx:71` — preserved unchanged. Patient wrapper passes this as `title` prop to the shared component. |
| Section title — Incoming wrapper | **`Referenced By`** | NEW for this phase. Locked per CONTEXT D-06. Title-case, no trailing punctuation, two words. The semantic distinction from "Related Resources" reflects the directional inversion (Patient cards point to forward references; Incoming cards point to inbound references). |
| Card primary label | `{ResourceType}` (the literal FHIR type name, e.g. `Observation`) | Existing convention; no humanization (`MedicationStatement` stays as-is, not `"Medication Statement"`). |
| Card count | `{count.toLocaleString()}` | E.g. `5,234`. Locale-formatted thousands separator via JS built-in. Existing line 99. |
| Loading state — visible copy | `{ResourceType}` (still rendered next to spinner) | Skeleton cards display the type name + a `<Loader size="xs" />` — no separate "Loading…" label. Mirrors existing lines 73–82. |
| Empty state | **None — render `null`** | When all queries settle and `populated.length === 0`, the entire panel returns `null`. No "No related resources" copy. No empty-state illustration. Locked per CONTEXT D-12. |
| Error state | **None — silent drop** | A failed count query sets that entry's count to `0` so the card is dropped from the populated grid. No toast, no inline error message, no `console.error`. Locked per CONTEXT D-11. Mirrors Phase 47 reference-resolver fallback policy. |
| Destructive confirmation | not applicable | Phase 48 has no destructive actions. |
| Click affordance | implicit (cursor change only) | Cards expose `style={{ cursor: 'pointer' }}` — no "Click to view" hint copy on the card surface. |

---

## Layout & Mount Position

### Mount Position (the one visual delta this phase ships)

In `src/components/explorer/ResourceDetailPage.tsx`:

**Before (current, lines 172–174):**
```tsx
{resource && resourceType === 'Patient' && id && (
  <PatientRelatedResources patientId={id} />
)}

{resource && (
  <Tabs>...</Tabs>
)}
```

**After (Phase 48 D-07):**
```tsx
{resource && (
  <Tabs>...</Tabs>
)}

{resource && (
  resource.resourceType === 'Patient' && id
    ? <PatientRelatedResources patientId={id} />
    : <IncomingReferencesPanel resource={resource} />
)}
```

**Spatial delta:** The Patient panel moves from **above-Tabs** to **below-Tabs**. Both wrappers now occupy the same below-Tabs slot. Vertical rhythm preserved by parent `<Stack gap="lg">` (no explicit `mt` needed).

**Section divider:** none. Panel sits in the natural Stack flow with `gap="lg"` separation from the Tabs block above.

### Grid

```tsx
<SimpleGrid cols={{ base: 2, sm: 3, md: 4 }}>
```

Verbatim from existing `PatientRelatedResources.tsx:72`. Locked — no `cols` prop on the shared component (CONTEXT discretion → "hardcoded for v1, mirrors existing"). Responsive breakpoints:
- `base` (< 768px): 2 columns
- `sm` (≥ 768px): 3 columns
- `md` (≥ 992px): 4 columns

### Card Anatomy (byte-identical to existing — DO NOT redesign)

```
┌─────────────────────────────────┐
│  [icon? + Type label]   [count] │  ← Group justify="space-between"
└─────────────────────────────────┘
   ↑ Card withBorder padding="sm" cursor:pointer
```

| Slot | Implementation | Source line in existing component |
|------|----------------|-----------------------------------|
| Card chrome | `<Card withBorder padding="sm" style={{ cursor: 'pointer' }}>` | lines 84–91 |
| Outer layout | `<Group justify="space-between">` | lines 93, 77 |
| Left cluster | `<Group gap="xs">` containing icon `<Text size="sm">{icon}</Text>` (Patient only) + `<Text size="sm" fw={500}>{type}</Text>` | lines 94–97 |
| Right cluster | `<Badge size="sm" variant="light" color="blue">{count.toLocaleString()}</Badge>` | lines 98–100 |
| Loading variant | `<Card withBorder padding="sm">` (no cursor change) with `<Group justify="space-between"><Text size="sm">{type}</Text><Loader size="xs"/></Group>` | lines 76–81 |

**Non-Patient cards omit the icon `<Text>` element entirely** (per CONTEXT D-09 — `e.icon &&` conditional render). Layout reflows naturally because the left cluster becomes a single-child `Group`.

---

## Interaction Contract

### Click target
- **Surface:** entire card area (full `<Card>` `onClick`).
- **Action:** `navigate(onCardNavigate(entry))` — wrapper supplies the URL via callback (CONTEXT D-13).
- **URL pattern (both wrappers):** `/explorer/{type}?{param}={refValue}`.
  - Patient: `/explorer/Observation?patient=Patient/abc123`
  - Incoming (e.g. on an Observation page): `/explorer/DiagnosticReport?result=Observation/xyz789`
- **Cursor:** `pointer` (set inline; existing pattern).
- **Hover state:** Mantine `Card` default — no custom hover styling. No elevation change, no border-color change, no animation. (Card animations / transitions are explicitly out of scope per critical_constraint.)

### Keyboard / Accessibility — DECISION

**Locked: document the inherited gap; do NOT add `role="button"` + `tabIndex` + key handler in v1.**

Rationale:
- The existing `PatientRelatedResources` cards are `<div>`-rooted (Mantine `Card` renders a styled `div`) without `tabIndex`, without `role`, and without keyboard handlers. They are not currently focusable or keyboard-activatable.
- CONTEXT D-19 (backwards compatibility) requires the Patient wrapper's behavior to be byte-identical post-refactor. Adding focusability to the shared component would change the Patient detail page's a11y surface — that's a behavior delta beyond the phase's stated scope.
- The critical_constraint allows either path; we pick "document as known a11y gap inherited" so REVR-03's "no regression in existing Patient detail UX" gate passes cleanly.

**Documented gap (carried forward to a future a11y polish phase):**
- Cards are not reachable via keyboard `Tab`.
- Cards do not respond to `Enter` / `Space`.
- Cards do not announce `role="button"` to screen readers.
- These limitations apply equally to both wrappers (Patient and Incoming) and exist today in production.

**Future fix (out of scope for Phase 48):** add `role="button"`, `tabIndex={0}`, `onKeyDown` handler matching `Enter`/`Space`, and a visible `:focus-visible` outline. Track as a v1.8 a11y polish item if user feedback surfaces it.

### Loading state
- **Trigger:** any `useEffect` query in flight AND `populated.length === 0`.
- **Render:** up to 4 skeleton cards (`entries.slice(0, 4)`), each containing the type label and a `<Loader size="xs" />`. CONTEXT D-10 — skeleton count fixed at 4.
- **Transition:** as individual counts resolve, populated cards render alongside any remaining loaders. Once all queries settle, only `count > 0` cards remain.
- **Animation:** none beyond Mantine's default `<Loader>` spin.

### Empty state
- All queries settle, all counts are `0` (or failed, which sets count to `0` per D-11) → component returns `null`. The `<Title>` and `<SimpleGrid>` never render (CONTEXT D-12).

### Error state
- Single fetch throws → silent: `setCounts(prev => ({ ...prev, [e.type]: 0 }))`. Card disappears from `populated`. No toast, no `console.error`, no inline error chip, no retry. CONTEXT D-11.
- All fetches throw → reduces to the empty-state path → component returns `null`.
- No "Couldn't load related resources" recovery surface in v1.

---

## Component Inventory (for the planner)

| File | Status | Mantine components used | Notes |
|------|--------|------------------------|-------|
| `src/utils/reverseReferenceCatalog.ts` | NEW | (none — pure data) | TypeScript const + types per CONTEXT D-01/D-02 |
| `src/components/explorer/RelatedResourcesPanel.tsx` | NEW | `Card`, `SimpleGrid`, `Badge`, `Group`, `Text`, `Title`, `Loader` | Shared render. Owns fetch + state + loading skeleton + populated grid. CONTEXT D-04. |
| `src/components/explorer/PatientRelatedResources.tsx` | REFACTORED (file kept) | (delegates to `RelatedResourcesPanel`) | Thin wrapper. Same prop signature `{ patientId: string }`. CONTEXT D-05. |
| `src/components/explorer/IncomingReferencesPanel.tsx` | NEW | (delegates to `RelatedResourcesPanel`) | Thin wrapper. Props `{ resource: Resource }`. Returns `null` when `resource.resourceType` not in catalog. CONTEXT D-06. |
| `src/components/explorer/ResourceDetailPage.tsx` | EDIT | (no new imports beyond `IncomingReferencesPanel`) | Mount-point relocation per D-07. |

**Zero new Mantine imports** — every component used by Phase 48 is already imported by the existing `PatientRelatedResources.tsx`.

---

## Registry Safety

| Registry | Blocks Used | Safety Gate |
|----------|-------------|-------------|
| (none) | — | not applicable — project does not use shadcn / external block registries; Mantine 8 is the design system and is the locked peer dep of `@medplum/react` |

---

## Checker Sign-Off

- [ ] Dimension 1 Copywriting: PASS — 2 section titles locked verbatim ("Related Resources" / "Referenced By"); empty + error states explicitly null/silent per CONTEXT D-11/D-12; no destructive actions.
- [ ] Dimension 2 Visuals: PASS — card anatomy locked byte-identical to existing component (5 slots tabled above with source line refs); mount-position relocation is the single visual delta and is documented.
- [ ] Dimension 3 Color: PASS — zero new colors; accent (`color="blue" variant="light"`) reserved exclusively for the count Badge.
- [ ] Dimension 4 Typography: PASS — 3 sizes (16/14/11px), 2 weight tiers (400 / 500–700), all Mantine defaults, no font-family change.
- [ ] Dimension 5 Spacing: PASS — Mantine `xs/sm/md/lg` only (4/8/16/24px), all multiples of 4; vertical rhythm inherited from parent `Stack gap="lg"`.
- [ ] Dimension 6 Registry Safety: PASS — no third-party registries; Mantine 8 only.

**Approval:** pending

---

## Verification References (for ui-checker / ui-auditor)

- **Existing component to mirror byte-for-byte:** `src/components/explorer/PatientRelatedResources.tsx` (lines 36–106 = the render path being extracted; lines 73–82 = loading skeleton contract; lines 84–102 = populated card contract).
- **Mount-point file:** `src/components/explorer/ResourceDetailPage.tsx` (lines 172–174 to delete; new ternary added below the `<Tabs>` block at line 193–194).
- **Locked decisions:** `48-CONTEXT.md` D-04 through D-13 cover every visual + interaction contract above; D-08 / D-09 / D-10 specifically lock the byte-identical card visuals.
- **Research evidence (catalog corrections that affect what entries the panel renders, but NOT what individual cards look like):** `48-RESEARCH.md` Findings §1 (drops `MedicationStatement.reason-reference` from Condition source list).

*End of UI-SPEC.*
