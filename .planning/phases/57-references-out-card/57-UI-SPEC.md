---
phase: 57
slug: references-out-card
status: draft
shadcn_initialized: false
preset: none
created: 2026-05-05
---

# Phase 57 — UI Design Contract

> Visual and interaction contract for the OutgoingReferencesPanel surface in `ResourceDetailPage` Summary mode. Pre-populated from `57-CONTEXT.md`, the project Mantine theme (`src/theme.ts`), design tokens (`src/styles/tokens.css`), and the structural sibling `IncomingReferencesPanel`.

---

## Design System

| Property | Value |
|----------|-------|
| Tool | none (shadcn N/A — project uses `@medplum/react` 5.x which pins `@mantine/core` ^8.0.0; shadcn gate explicitly does not apply) |
| Preset | not applicable |
| Component library | Mantine 8 (`@mantine/core` ^8.3.18) — required peer of `@medplum/react` 5.1.7 |
| Icon library | `@tabler/icons-react` — phase 57 introduces no new icons (panel is text-only labels + reused `<ReferenceLink>`) |
| Font | IBM Plex Sans (body) + IBM Plex Mono (path labels), preloaded via `index.html`, fallbacks `ui-sans-serif` / `ui-monospace` |

Project conventions baked into Mantine theme (`src/theme.ts`):
- `primaryColor: 'indigo'`, `primaryShade: 6`, `defaultRadius: 'md'`
- Component defaults — Card: `withBorder + radius:'lg' + padding:'lg'`; Tabs: `variant:'pills'`; Button: `size:'sm' + radius:'md'`
- Warm-neutral grey ramp override (10 stops, `#fafaf8` → `#1c1b18`)

---

## Spacing Scale

Declared values (Mantine spacing tokens, all multiples of 4):

| Token | Value | Usage in this phase |
|-------|-------|---------------------|
| xs | 4px | (not used in this panel) |
| sm | 8px | Vertical gap between rows in `<Stack gap="xs">` (Mantine `xs`=10px is closest; we use `xs`); inline gap inside row `<Group gap="xs">` |
| md | 16px | (not used directly — row content auto-sizes) |
| lg | 24px | Outer Summary panel `<Stack gap="lg">` already in place — `OutgoingReferencesPanel` slots into that rhythm |
| xl | 32px | (not used) |
| 2xl | 48px | (not used) |
| 3xl | 64px | (not used) |

Exceptions: none. Panel inherits Summary `<Stack gap="lg">` outer rhythm; internal `<Stack gap="xs">` for row list matches `IncomingReferencesPanel` density (which uses `<SimpleGrid>` but at equivalent visual density per Mantine 8 defaults).

Title-to-list spacing: `<Title order={5} mb="sm">` — locked to match `RelatedResourcesPanel` line 120 (`mb="sm"` = 12px in Mantine 8 default theme).

---

## Typography

Mantine 8 size tokens used in this panel (sizes resolved against Mantine default scale; project theme does not override fontSizes):

| Role | Size | Weight | Line Height | Token | Usage |
|------|------|--------|-------------|-------|-------|
| Panel title | 16px | 600 (semibold) | 1.4 | `<Title order={5}>` | "Outgoing References" heading |
| Path label | 14px | 400 (regular) | 1.55 | `<Text size="sm" c="dimmed" ff="monospace">` | The JSON field path (e.g., `subject`, `participant[0].individual`) |
| Reference link text | 14px | 400 | 1.55 | `<Anchor size="sm">` (rendered inside `<ReferenceLink>`) | Resolved `summarizeResource(target).primary` or raw `Type/id` fallback |
| Reference display fallback | 14px | 400 | 1.55 | `<Text size="sm" c="dimmed">` (inside `<ReferenceLink>`) | `Reference.display` shown only while pending or on failure (existing `<ReferenceLink>` contract) |

Total declared sizes for this phase: **2** (16px title + 14px row content). Total declared weights: **2** (regular 400 for body/labels, semibold 600 for title — matches Mantine `<Title>` defaults). Within budget.

---

## Color

Project 60/30/10 split (carry-forward from Phase 30 design tokens — `src/styles/tokens.css`):

| Role | Value | Usage |
|------|-------|-------|
| Dominant (60%) | `--bg` `oklch(99% 0.004 85)` (warm off-white) | Page background — panel inherits |
| Secondary (30%) | `--panel` `#ffffff` + `--panel-2` `oklch(97.2% 0.005 85)` | The Summary `Tabs.Panel` is the surface; `OutgoingReferencesPanel` itself is **untreated** (no Card chrome — it's a labeled list directly on the Summary surface, mirroring `<RelatedResourcesPanel>`'s no-Card title-then-content composition) |
| Accent (10%) | indigo-6 `oklch(54% 0.17 262)` (Mantine `var(--mantine-color-indigo-6)`) | Reserved exclusively for `<ReferenceLink>` `<Anchor>` text colour (Mantine default Anchor uses `theme.primaryColor` shade 6) — this is the only accented element introduced by phase 57 |
| Destructive | not used in this phase | Panel is read-only display; no destructive actions |

Accent reserved for: **`<Anchor>` link text inside `<ReferenceLink>` only.** Path labels use `c="dimmed"` (`--ink-3` `oklch(55% 0.01 260)`). Title uses default `--ink` `oklch(22% 0.01 260)`. No badges, no fills, no chip colours.

Dimmed-text contrast: `--ink-3` against `--bg` audited in `.planning/research/color-design-audit.md` — passes WCAG AA at 14px regular per the project palette gate.

---

## Copywriting Contract

| Element | Copy | Notes |
|---------|------|-------|
| Panel title | **"Outgoing References"** | Locked in CONTEXT.md §"Specifics" line 139 — explicit complement to `IncomingReferencesPanel`'s "Referenced By". Sentence case, two words. |
| Primary CTA | (none — no buttons in this panel) | Each row is itself a navigational link via `<ReferenceLink>` — no separate CTA |
| Empty state heading | (none — panel is **hidden** when empty) | CONTEXT.md D-04: `OutgoingReferencesPanel` returns `null` when `extractOutgoingReferences(resource).length === 0`. No empty card, no empty heading, no "no references found" copy. |
| Empty state body | (not rendered) | Same as above — panel is absent from the DOM. |
| Error state | (none — discovery is synchronous + pure) | The walker is a pure function over JSON already in memory. No fetch, no async state, no error path at the panel level. Per-row resolution failures are owned by `<ReferenceLink>` (its own pending/resolved/failed contract) and surface as raw `Type/id` text with a tooltip — no error toast. |
| Destructive confirmation | (none) | No destructive actions in this phase. |
| Patient guard fallback | (panel not rendered) | When `resource.resourceType === 'Patient'` the panel is absent — `PatientRelatedResources` covers that surface. No "see Patient panel" pointer copy. |

Path label format (from CONTEXT.md D-01 + walker contract):
- Top-level scalar refs: `subject`, `encounter`, `recorder`
- Array indices: `participant[0].individual`, `diagnosis[1].condition`
- Nested objects: `medicationReference`, `partOf`

Display string: passed through to `<ReferenceLink>` `display` prop unchanged when `Reference.display` is present in source JSON. No truncation, no transformation.

---

## Interaction Contract

(Extension to template — phase introduces no new interaction primitives, but documents reuse for the checker.)

| Interaction | Behaviour | Source |
|-------------|-----------|--------|
| Plain click on row link | Navigate to `/explorer/{Type}/{id}` (or patient-scoped equivalent via `ResourceDetailPage.handleReferenceClick` interceptor) | `<ReferenceLink>` Anchor + `ResourceDetailPage` parent click handler — unchanged |
| Cmd/Ctrl + click | Open JSON peek drawer with target resource (or `openPeekError(rawRef)` on failure) | `<ReferenceLink>` `handleAnchorClick` — unchanged from Phase 47/52 |
| Hover on link | Mantine Tooltip showing the full raw `Reference.reference` string after 400ms openDelay | `<ReferenceLink>` `<Tooltip>` — unchanged |
| Pending state | Raw `Type/id` text + adjacent 120×14 Mantine Skeleton; no Anchor | `<ReferenceLink>` pending branch — unchanged |
| Resolved state | `summarizeResource(target).primary` rendered as `<Anchor size="sm">` indigo link | `<ReferenceLink>` resolved branch — unchanged |
| Failed state | Raw `Type/id` text rendered as `<Anchor>` (still navigable) + optional `(display)` dim suffix | `<ReferenceLink>` failed branch — unchanged |
| Keyboard focus | Anchor inherits Mantine default focus ring (indigo, 2px outline, `--accent-ring` token) | Mantine 8 default + `tokens.css` `.input:focus` ring token |
| Row order | DOM order preserves walker traversal order (depth-first JSON walk per CONTEXT D-01) — stable across renders | `extractOutgoingReferences` walker contract |
| Duplicate target handling | Two field paths pointing to the same target render as **two rows** (no dedup) | CONTEXT D-03 |

---

## Component Anatomy (locked spec)

```
OutgoingReferencesPanel
├── (returns null if refs.length === 0 OR resource.resourceType === 'Patient')
└── <div>                                              // no Card chrome
    ├── <Title order={5} mb="sm">Outgoing References</Title>
    └── <Stack gap="xs">                              // 10px vertical between rows
        └── <Group gap="xs" wrap="nowrap"> per ref   // 10px horizontal label↔link
            ├── <Text size="sm" c="dimmed" ff="monospace">{ref.path}</Text>
            └── <ReferenceLink reference={ref.reference} display={ref.display} />
```

Mount point in `ResourceDetailPage`:

```tsx
<Tabs.Panel value="summary" pt="md">
  <Stack gap="lg">
    <Title order={3}>{summarizeResource(resource).primary}</Title>
    <KeyFieldsTable resource={resource} />
    {resource.resourceType === 'Patient' && id ? (
      <PatientRelatedResources patientId={id} />
    ) : (
      <IncomingReferencesPanel resource={resource} />
    )}
    {resource.resourceType !== 'Patient' && (
      <OutgoingReferencesPanel resource={resource} />
    )}
  </Stack>
</Tabs.Panel>
```

Outer Summary `<Stack gap="lg">` provides the 24px breathing room between `IncomingReferencesPanel` and `OutgoingReferencesPanel` — no panel-internal margin needed.

---

## Registry Safety

| Registry | Blocks Used | Safety Gate |
|----------|-------------|-------------|
| shadcn (any) | none | not applicable — project does not use shadcn; UI is built with Mantine 8 components only |
| Third-party Mantine extensions | none | not applicable |

No new third-party UI dependencies introduced by phase 57. All visual primitives are: Mantine 8 (`Stack`, `Group`, `Text`, `Title`) + reused project component (`<ReferenceLink>` from Phase 47).

---

## Pre-Population Sources

| Field | Source |
|-------|--------|
| Panel title text | CONTEXT.md §Specifics line 139 ("Outgoing References") |
| Panel hidden when empty | CONTEXT.md §Phase Boundary + D-04 (`returns null when array is empty`) |
| Patient guard | CONTEXT.md §Phase Boundary + D-04 (panel not shown for Patient resources) |
| Layout (Stack of Group rows) | CONTEXT.md D-02 |
| Path label style (`mono` + `dimmed` + `size="sm"`) | CONTEXT.md §Specifics line 140 |
| Row gap (`gap="xs"`) | CONTEXT.md §Specifics line 141 ("`<Stack gap="xs">` provides enough breathing room") |
| Reference rendering reuses `<ReferenceLink>` | CONTEXT.md §"Existing Code Insights" + D-02 |
| No deduplication | CONTEXT.md D-03 |
| Title style `<Title order={5} mb="sm">` | Sibling `RelatedResourcesPanel.tsx` line 120 (locked structural sibling) |
| Spacing scale + Mantine theme | `src/theme.ts` + `src/styles/tokens.css` (project-wide design tokens, Phase 30) |
| Color palette | `src/styles/tokens.css` (warm-neutral + indigo accent, Phase 30) |
| Font | `src/theme.ts` (IBM Plex Sans + Mono, project-wide since Phase 30) |
| Interaction states (hover/click/Cmd-click/peek) | `src/components/explorer/ReferenceLink.tsx` (Phase 47/52, unchanged for phase 57) |

User input solicited during this session: **0 questions** — all design decisions were already locked by upstream artifacts and the project's Mantine theme.

---

## Checker Sign-Off

- [ ] Dimension 1 Copywriting: PASS
- [ ] Dimension 2 Visuals: PASS
- [ ] Dimension 3 Color: PASS
- [ ] Dimension 4 Typography: PASS
- [ ] Dimension 5 Spacing: PASS
- [ ] Dimension 6 Registry Safety: PASS

**Approval:** pending
