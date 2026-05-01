---
phase: 47
slug: theme-b-readability-humanreadableview
status: contract
created: 2026-05-01
source: design_handoff_v1.7_navigation/README.md + CONTEXT.md D-01..D-08
---

# Phase 47 — UI Design Contract

> Visual + interaction specs for the three HumanReadableView enrichments. NOT a chrome change — the existing `<Tabs>` shell stays intact.

---

## Scope

Phase 47 enriches the **content** of Mode 2 (Human view) inside the existing `ResourceDetailPage` `<Tabs>` chrome. It does NOT introduce the 4-mode resource shell from the design handoff (that's deferred). All changes appear inside `HumanReadableView.tsx` and `ResourcePropertyTable.tsx`.

---

## Component 1 — `<ReferenceLink>` (READ-01)

Renders a single FHIR `Reference` field as a router link with human-readable text.

### Visual states

| State | Anchor text | Suffix | Tooltip target | Behavior |
|-------|-------------|--------|----------------|----------|
| `pending` | raw `Type/id` (verbatim) | Mantine `<Skeleton width={120} height={14}>` overlay/adjacent | none | non-clickable while resolving |
| `resolved` | `summarizeResource(target).primary` | none | full `Reference.reference` URL on hover | click → router push to `/explorer/{type}/{id}` |
| `failed` | raw `Type/id` (or full URL if absolute) | none | full `Reference.reference` URL on hover | click → router push to `/explorer/{type}/{id}` (deep-link still works even if reference unresolvable in this Blaze instance) |

### Mantine primitives

- `<Tooltip label={fullRef} withArrow position="top" openDelay={400}>` wraps the link content
- `<Anchor component={RouterLink} to={`/explorer/${type}/${id}`}>` — preserves Mantine theme accent color (indigo)
- `<Skeleton>` for pending state — **adjacent**, not overlay (avoids text reflow when resolved swap happens)

### Spacing / alignment

- Inline within `<ResourcePropertyTable>` value cells; no extra padding
- No icon prefix; the colored anchor styling already signals it's a link

### Accessibility

- Tooltip MUST not be the only place full ref is exposed — the click target's `aria-label` SHOULD include the full ref string (e.g. `aria-label="Open Patient/abc123 (Müller, Anna)"`)
- Keyboard tab order preserved (no tabIndex changes)

---

## Component 2 — `<ExtensionChip>` (READ-02)

Renders an inline affordance for hidden `_propertyName` extensions.

### Visual

```
[ Property row content ]   [+1 extension]   ← chip on right, same line
[ Property row content ]   [+2 extensions]
```

When the chip is clicked, an inline reveal expands BELOW the property row (not as modal):

```
[ Property row content ]   [-]
└─ Extension URL: http://hl7.org/fhir/StructureDefinition/...
   Value: <ResourcePropertyDisplay value={ext.value*}/>
└─ Extension URL: ...
   Value: ...
```

### Mantine primitives

- Closed state: `<Button variant="subtle" size="xs" radius="sm">+1 extension</Button>` or `<Chip size="xs">+1 extension</Chip>` (planner picks based on existing project chip idiom)
- Expanded state: `<Stack gap="xs" mt="xs" pl="md" style={{ borderLeft: '2px solid var(--mantine-color-gray-3)' }}>` to visually group revealed extensions
- Toggle icon: chevron-down/up on the chip itself (use `@tabler/icons-react` if already imported, else text glyph `▾`/`▴`)

### Nested extensions

Nested `extension.extension[]` recurses with a 1-level indent (`pl="md"` per level, max 3 levels visual; deeper nesting truncates with `...` and a "View raw" link to JSON tab).

### Accessibility

- Chip is keyboard-focusable (`<Button>` or `<Chip component="button">`)
- `aria-expanded={open}` on the chip
- `aria-controls` references the revealed list's id

### When NOT to render

- If a property row has zero hidden `_propertyName` extensions, NO chip is rendered (no empty `[+0 extensions]`)
- The bottom-of-view "Extensions" subsection (Phase 35 UAT-FU-02) for resource-level `extension[]` STAYS as-is — chips only cover property-level

---

## Component 3 — `<ContainedResourcesAccordion>` (READ-03)

Renders `Resource.contained[]` inline below the parent resource's property table.

### Visual

```
─── Property table (existing) ───
...

─── Contained Resources ──────────
▸ Patient — Müller, Anna (68/F)        ← header = summarizeResource(c).primary
▸ Practitioner — Dr. Schmidt, Hans
▸ Encounter — ambulatory · 2026-04-30
```

Header collapsed by default. Click expands inline:

```
▾ Patient — Müller, Anna (68/F)
  ┌─ ResourcePropertyTable ──────┐
  │ id: pat-001                  │
  │ name: ...                    │
  │ birthDate: 1958-03-15        │
  │ ...                          │
  └──────────────────────────────┘

▸ Practitioner — Dr. Schmidt, Hans
```

### Mantine primitives

- `<Accordion multiple variant="separated" radius="sm">` (mirrors `ResourceTypeList.tsx` accordion idiom per RESEARCH.md)
- `<Accordion.Item>` per contained resource, keyed by `contained[i].id ?? index`
- `<Accordion.Control>` shows: `<Group><ResourceTypeBadge type={c.resourceType}/> {summarizeResource(c).primary}</Group>` (badge optional — planner picks)
- `<Accordion.Panel>` mounts `<ResourcePropertyTable resource={c} readonly/>` (existing component, no changes)

### Section heading

A small `<Text size="sm" c="dimmed" tt="uppercase" mt="lg" mb="xs">Contained Resources</Text>` divider above the accordion.

### When NOT to render

- If `Resource.contained` is undefined or empty array, the entire section (heading + accordion) is hidden — no empty container.

### Accessibility

- Mantine `<Accordion>` already provides correct ARIA semantics (`aria-expanded`, focus management) — no additional wiring needed.
- Each panel is independently focusable / scrollable.

---

## Out of scope (explicitly NOT in this phase)

- 4-mode resource shell (`Summary | Human | Graph | JSON` SegmentedControl) — defer to a separate phase
- JSON peek drawer — defer to a separate phase
- Sidebar v2 + Expert toggle + ⌘K palette — defer to last
- Hover-tooltip on reference chips showing 4-line JSON preview (design handoff polish item) — defer
- Cross-server reference resolution — out of scope (single Blaze instance only)

---

## Tokens reused

All from existing Mantine 8 theme (`primaryColor: 'indigo'`, warm-neutral gray ramp, radii `sm/md/lg = 4/6/10 px`). No new tokens.

---

## Visual fidelity bar

- Reference link: indistinguishable from existing `<Anchor>` styling in `ResourceDetailPage.tsx`
- Extension chip: matches existing chip idioms in the codebase (search `<Chip>` and `<Button variant="subtle" size="xs">` for closest sibling)
- Contained accordion: matches existing accordion in `ResourceTypeList.tsx` (separator radius, density)
