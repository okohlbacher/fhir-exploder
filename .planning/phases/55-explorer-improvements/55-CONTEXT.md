---
phase: 55
status: context_complete
mode: auto
created: 2026-05-04
---

# Phase 55: Explorer Improvements — CONTEXT

## Phase Goal

Explorer list scanning is faster and more legible — primary/secondary summaries inline, density configurable, JSON peek one keystroke away.

Requirements: EXPL-01, EXPL-02, EXPL-03

---

## Codebase Scouting Findings

### Key files
- `src/components/explorer/SearchResultsPage.tsx` — primary target for all 3 requirements
- `src/utils/summarizeResource.ts` — returns `{ primary: string; secondary?: string }`
- `src/hooks/useShortcuts.ts` — keyboard shortcut hook already in use
- `src/contexts/PeekContext.tsx` — `openPeek(resource, originElement?)` — already wired
- `src/__tests__/SearchResultsPage.dateStatus.test.tsx` — existing test baseline

### Current state of SearchResultsPage
1. **Summary column already exists** (line 419–481) — renders `summarizeResource(r).primary` only; secondary line missing
2. **J shortcut already wired** (lines 148–156) — `useShortcuts({ j: handleJ })` + `openPeek()` — EXPL-03 IS DONE
3. **No density SegmentedControl** — not yet present

### EXPL-03 status: COMPLETE
The J key shortcut for JSON peek is fully implemented in SearchResultsPage as of Phase 52/53. EXPL-03 tests just need to be written — no implementation work required.

---

## Decisions

### D-01: EXPL-01 — Two-line Summary cell

**Decision:** Replace the single `<Anchor>{primary}</Anchor>` in the Summary Table.Td with a `<Stack gap={4}>` (xs token = 4px, on-grid minimum) containing:
- Line 1: `<Text fw={600} size="sm">{primary}</Text>` — bold primary
- Line 2 (conditional): `<Text c="dimmed" ff="monospace" size="xs" truncate="end" style={{ maxWidth: 380 }}>{secondary}</Text>` — dim + monospace; omitted entirely when secondary is absent or empty string

The outer element remains an `<Anchor>` (or `<Box component="a">`) wrapping the Stack for consistent click navigation. The existing `onClick` + `href` pattern is preserved.

**Why:** `Stack gap={2}` gives 2px gap between lines — tight enough for table scanning. Monospace on secondary matches the "technical" nature of dates and coded values. Conditional render avoids empty line for generic fallback resources.

### D-02: EXPL-02 — Density SegmentedControl

**Decision:** Add a Mantine `<SegmentedControl>` with 3 values: `cards | table | compact`

```
data=[
  { value: 'cards', label: 'Cards' },
  { value: 'table', label: 'Table' },
  { value: 'compact', label: 'Compact' },
]
```

localStorage key: `explorer.density.v1` (per ROADMAP spec); default: `'table'`.  
Use `useLocalStorage<'cards' | 'table' | 'compact'>` from `@mantine/hooks`.  
Placement: `<Group justify="space-between">` row — SegmentedControl on the left, existing Export button on the right (replaces the current right-only Export group).

Show the density control **only when resources.length > 0** (same condition gate as the Export button).

### D-03: EXPL-02 — Table mode (density = 'table')

Unchanged from current behavior. `<Table striped highlightOnHover withTableBorder>`.  
Summary cell shows two-line (primary bold + secondary dim/mono per D-01).

### D-04: EXPL-02 — Compact mode (density = 'compact')

Same `<Table>` structure but:
- Add `verticalSpacing="xs"` to `<Table>` (reduces row height)
- Use `size="xs"` on the primary Text (line 1 of summary)
- Use `size="xs"` on secondary Text (already xs — no change)
- Date and Status cells use `size="xs"` Text/Badge
- Summary cell max-width reduced to 300 on compact (saves horizontal space)

### D-05: EXPL-02 — Cards mode (density = 'cards')

Replace the Table with a `<SimpleGrid cols={{ base: 1, sm: 2, lg: 3 }} spacing="sm">`.  
Each card: `<Paper withBorder p="sm" radius="sm" style={{ cursor: 'pointer' }} onClick={navigate}>` with tabIndex, onFocus/onBlur for J-key compatibility.

Card layout (top-to-bottom):
```
<Group justify="space-between" mb={4}>
  <Text ff="monospace" size="xs" c="dimmed" truncate="end">{r.id}</Text>
  {status badge if present}
</Group>
<Text fw={600} size="sm" lineClamp={2}>{primary}</Text>
{secondary && <Text c="dimmed" ff="monospace" size="xs" lineClamp={1}>{secondary}</Text>}
<Text size="xs" c="dimmed" mt={4}>{date || ''}</Text>
```

Cards are focusable (`tabIndex={0}`) and set `focusedResource` on focus (same state as table rows), so J key works in Cards mode too.

### D-06: EXPL-03 — J key tests

Write tests in `src/__tests__/search-results-peek.test.tsx` covering:
1. J key on focused row calls `openPeek` with the row resource
2. J key with no focused row is a silent no-op
3. Focus/blur tracking: focusedResource is set on focus, cleared on blur away from tbody

These tests should use the existing `vi.mock('../../contexts/PeekContext')` pattern from `src/__tests__/peek-related-resources.test.tsx`.

### D-07: Test file structure for Phase 55

Two new test files:
- `src/__tests__/search-results-summary.test.tsx` — EXPL-01 summary two-line rendering
- `src/__tests__/search-results-peek.test.tsx` — EXPL-03 J key peek tests  
(EXPL-02 density: tested inline in a `src/__tests__/search-results-density.test.tsx`)

All test files ship **live tests** (no `describe.skip`). SearchResultsPage mocks: `useMedplum`, `useOutletContext`, `useNavigate`, `usePeek`, `useSearchState`.

### D-08: Wave structure

**Wave 1:** EXPL-01 (two-line summary cell) + EXPL-03 tests (J key)
- Modifies: `SearchResultsPage.tsx` (summary cell only)
- Creates: `search-results-summary.test.tsx`, `search-results-peek.test.tsx`

**Wave 2:** EXPL-02 (density SegmentedControl — all 3 modes)
- Modifies: `SearchResultsPage.tsx` (add SegmentedControl + conditional render per mode)
- Creates: `search-results-density.test.tsx`

Waves are independent at task-level; Wave 2 depends on Wave 1 only for the two-line summary rendering (which Wave 2 must preserve in Table + Compact modes).

### D-09: useShortcuts interaction with SegmentedControl

The `useShortcuts` guard already skips when `document.activeElement.tagName` is INPUT/TEXTAREA/SELECT. SegmentedControl renders as radio inputs — so J will be skipped when the SegmentedControl has focus. This is correct behavior (user is interacting with the control).

### D-10: Density default and persistence

Default: `'table'` (matches current behavior — no visible change on first load).  
`getInitialValueInEffect: false` on `useLocalStorage` (consistent with existing `hideEmpty` pattern in ResourceTypeLanding).

### D-11: Secondary line truncation

Secondary line truncates at `maxWidth: 380` (table mode) / `maxWidth: 300` (compact) via Mantine `truncate="end"` prop. Cards mode uses `lineClamp={1}` instead (flex context). This prevents long coded values / dates from blowing out column width.

### D-12: EXPL-01 backward compatibility

The existing `getResourceDate()` / `getResourceDateByType()` / `getResourceStatusByType()` columns remain unchanged. EXPL-01 only modifies the Summary column content. The Date and Status columns stay.

---

## Deferred

- **Sorting by Summary column** — would require client-side sort since Blaze doesn't support sorting by arbitrary summary fields. Out of Phase 55.
- **Filtering from Cards view** — cards are a display mode only; filter panel stays visible in all modes.
- **Export in Cards mode** — export always exports current `resources[]` regardless of display mode.
- **Cards per-type custom layouts** — generic card only; no per-type special cards.
- **Keyboard navigation between cards** — Arrow key navigation within SimpleGrid. Out of Phase 55.
- **Saved density preference per resource type** — single global localStorage key only (per ROADMAP spec).

---

*Generated: 2026-05-04 via discuss-phase --auto*
