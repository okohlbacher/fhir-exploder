---
phase: 35-phase-30-uat-follow-ups-per-type-quality-matrix
reviewed: 2026-04-25T00:00:00Z
depth: standard
files_reviewed: 20
files_reviewed_list:
  - src/__tests__/HumanReadableView.extensions.test.tsx
  - src/__tests__/QualityByTypeMatrix.test.tsx
  - src/__tests__/ResourcePropertyTable.test.tsx
  - src/__tests__/SearchResultsPage.dateStatus.test.tsx
  - src/components/explorer/HumanReadableView.tsx
  - src/components/explorer/ResourceDetailPage.tsx
  - src/components/explorer/ResourcePropertyTable.tsx
  - src/components/explorer/SearchResultsPage.tsx
  - src/components/quality/QualityByTypeMatrix.tsx
  - src/components/quality/QualityOverviewPage.tsx
  - src/components/quality/ReferencesPanel.tsx
  - src/components/quality/ValidationPanel.tsx
  - src/hooks/useCodingCoverage.ts
  - src/hooks/useCompletenessReport.ts
  - src/quality/metrics/CompletenessContext.tsx
  - src/quality/metrics/CoverageContext.tsx
  - src/quality/metrics/DuplicatesContext.tsx
  - src/quality/metrics/ReferencesContext.tsx
  - src/quality/metrics/ValidationContext.tsx
  - src/quality/metrics/__tests__/byType.test.tsx
findings:
  critical: 0
  warning: 4
  info: 7
  total: 11
status: issues_found
---

# Phase 35: Code Review Report

**Reviewed:** 2026-04-25
**Depth:** standard
**Files Reviewed:** 20
**Status:** issues_found

## Summary

The Phase 35 changes implement UAT follow-ups (UAT-FU-01 dates/status, UAT-FU-02
extensions/identifier tooltip, UAT-FU-05 per-type quality matrix). The
architecture is clean: per-metric contexts get a `byType` slot in a backwards-
compatible way (CompletenessContext / CoverageContext / ReferencesContext /
ValidationContext add fields without changing existing ones), DuplicatesContext
uses an identity-stable derived passthrough, and the new `QualityByTypeMatrix`
component subscribes per-metric to preserve Phase 32 isolation. Tests are
strong: the `byType.test.tsx` parameterized suite hits empty/replacement/
functional/setter-stability for each context, the matrix test enforces the
P-05 em-dash invariant + P-08 PHI gate, and the date/status tests pin every
new branch including all three missing-field edge cases.

No critical issues. The four warnings are bugs or correctness regressions that
should be fixed: a chevron href that fires on Enter/Space and dispatches an
unguarded navigate (W-01), a `MetricKey` mismatch between matrix and threshold
domain (`'duplicates'` is valid but the matrix passes a `metricKey="duplicates"`
that is never found in `DEFAULT_THRESHOLDS` for the Dup column — actually
verified valid; downgraded to info), a stale-closure trap in
`QualityByTypeMatrix.handleRowClick` when `counts` flips from `loading` to
`number` mid-render, a Reference href bug in `ResourcePropertyTable` for
already-prefixed URLs, and a brittle threshold-breach assertion in the matrix
test. Info items are mostly type-safety and code-smell nits.

## Warnings

### WR-01: `ResourcePropertyTable` Reference href double-prefixes already-absolute URLs

**File:** `src/components/explorer/ResourcePropertyTable.tsx:90-99`
**Issue:** The Reference branch builds `href` as
`ref.includes('/') ? \`/explorer/${ref}\` : ref`. An absolute reference like
`http://localhost:8080/fhir/Patient/123` (Blaze emits absolute Reference URLs
when the resource was POSTed against a different base, and many FHIR servers
include them) contains `/` and would be rewritten to
`/explorer/http://localhost:8080/fhir/Patient/123`. The
`ResourceDetailPage.handleReferenceClick` interceptor uses a regex that
matches the trailing `/Type/id` pattern and would still recover, but the
visible href is now broken (right-click → "copy link" gives garbage) and SSR /
non-JS fallback navigation fails. The test does not cover absolute references.
**Fix:**
```tsx
// Strip absolute URL prefix before building the SPA href.
const buildRefHref = (ref: string): string => {
  // Absolute URL: extract trailing /Type/id
  const m = ref.match(/\/([A-Z][A-Za-z]+)\/([A-Za-z0-9][A-Za-z0-9\-.]{0,63})$/);
  if (m) return `/explorer/${m[1]}/${m[2]}`;
  // Relative reference like "Patient/123"
  if (ref.includes('/')) return `/explorer/${ref}`;
  return ref;
};
const href = buildRefHref(ref);
```

### WR-02: `QualityByTypeMatrix` chevron `<UnstyledButton>` dispatches navigate twice on row + chevron click

**File:** `src/components/quality/QualityByTypeMatrix.tsx:312-319`
**Issue:** The chevron `<Table.Td onClick={(e) => e.stopPropagation()}>`
correctly stops bubbling for *mouse* clicks, but the inner `UnstyledButton`'s
`onClick={() => handleRowClick(row)}` runs first and navigates. Because the
parent `<Table.Tr onClick={...}>` is also wired to `handleRowClick`, the
keyboard-navigation flow is inconsistent: pressing Enter on the chevron
triggers the button's onClick, but the Tr's onClick is never wired to
keyboard, so keyboard users cannot drill into rows at all (the button is the
only keyboard-accessible affordance, and it lives inside a non-focusable td).
This is also why the tests assert `chevron.click()` instead of row click.
Two fixes are needed:
1. The Tr should accept Enter/Space via `onKeyDown` (or rely on the button as
   the canonical drill-down).
2. The chevron's td `onClick` `stopPropagation` is good but should also be
   `onKeyDown` to mirror.
**Fix:**
```tsx
<Table.Tr
  key={row.type}
  style={{ cursor: 'pointer' }}
  onClick={() => handleRowClick(row)}
  onKeyDown={(e) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      handleRowClick(row);
    }
  }}
  tabIndex={0}
  role="row"
>
  ...
  <Table.Td
    onClick={(e) => e.stopPropagation()}
    onKeyDown={(e) => e.stopPropagation()}
  >
    <UnstyledButton ...>
```

### WR-03: `getResourceDate` legacy fallback returns Period.start without validating the `start` field type

**File:** `src/components/explorer/SearchResultsPage.tsx:81-83`
**Issue:** The legacy `getResourceDate` walks
`val && typeof val === 'object' && 'start' in (val as object)`. When a
resource has a Period whose `start` is missing or non-string (e.g.
`{ end: '...' }`), the cast `(val as Record<string, unknown>).start as string`
returns `undefined`, and `?.slice(0, 10) ?? ''` saves it. But the same
function would also crash if `start` were a number-like value where
`.slice` is unavailable (e.g. typed-array reuse, or a malformed FHIR payload
where someone wrote `start: 19800115`). The new `getResourceDateByType`
correctly uses `?.slice(0, 10) ?? ''` after a typed accessor, but the legacy
fallback is still reachable for the long-tail of resource types not in the 6
mapped cases, and it loses a test guard. While not a regression introduced by
this phase, the new code adjacent to it should add a typeof check for safety.
**Fix:**
```tsx
if (val && typeof val === 'object' && 'start' in (val as object)) {
  const start = (val as Record<string, unknown>).start;
  if (typeof start === 'string') return start.slice(0, 10);
}
```

### WR-04: `QualityByTypeMatrix` test for threshold-breach styling is non-deterministic

**File:** `src/__tests__/QualityByTypeMatrix.test.tsx:190-214`
**Issue:** The test asserts that one of four heuristic conditions matches —
inline style `color`, className substring, raw outerHTML containing `'red'`,
or `--mantine-color-red`. This is overly permissive: the test passes if any
unrelated child text node anywhere contains "red" (e.g. a future "Red flag"
label, or a Mantine theme variable that always includes "red" tokens for
unrelated reasons). The hydration-gate workaround comment ("we trigger one
more tick by querying again") is also a no-op — `findByText` already awaits
one tick, but `useThresholds().isBreached` requires a useEffect microtask that
`findByText` does not synchronize. Test will silently pass even if breach
styling stops working. Recommend explicit assertion against Mantine's
`data-color` or computed `--text-color` CSS variable.
**Fix:**
```tsx
// Replace permissive OR-chain with a single explicit assertion:
// Mantine 8 renders <Text c="red.6"> as inline style with --text-color var
// pointing at red.6; the rendered DOM has a stable signature.
await waitFor(() => {
  const breached = screen.getByText('50%');
  // Either the data-* attribute or the resolved CSS var should match
  expect(breached.style.getPropertyValue('--text-color')).toMatch(/red/);
});
```

## Info

### IN-01: `ResourcePropertyTable` Identifier Tooltip uses `display: 'cursor: help'` only when `obj.system` is truthy, but the Tooltip wraps unconditionally

**File:** `src/components/explorer/ResourcePropertyTable.tsx:147-164`
**Issue:** The fallback path (`obj.type !== undefined` but no `system`)
renders `valueCode` bare without a Tooltip. That is correct, but the inline
style `cursor: obj.system ? 'help' : undefined` is computed once and reads
fine — however the `cursor: undefined` resolves to no inline style, which is
inconsistent with other Code components that have no cursor. Cosmetic; not
a bug.
**Fix:** Skip the inline style entirely in the no-system branch:
```tsx
const valueCode = obj.system ? (
  <Code style={{ cursor: 'help' }}>{obj.value as string}</Code>
) : (
  <Code>{obj.value as string}</Code>
);
```

### IN-02: `RenderValue` casts heavily through `as` — type safety could use a helper

**File:** `src/components/explorer/ResourcePropertyTable.tsx:49-208`
**Issue:** The function uses `value as Record<string, unknown>` and per-field
`obj.x as string` repeatedly. Each cast is locally safe but there is no single
guard function — if the upstream FHIR schema changes a CodeableConcept's
`coding` to a non-array, the cast `c.coding[0]` would silently produce
`undefined`. Suggest extracting a `safeString(v): string | undefined` and
`safeArray<T>(v): T[]` helper.
**Fix:** Add a typed-narrowing helper module:
```tsx
function asString(v: unknown): string | undefined {
  return typeof v === 'string' ? v : undefined;
}
```
Use throughout `RenderValue` to replace `obj.foo as string` with
`asString(obj.foo)`.

### IN-03: `HumanReadableView.summarizeExtension` uses `Object.entries` ordering for "first value\* field"

**File:** `src/components/explorer/HumanReadableView.tsx:132-141`
**Issue:** `Object.entries(ext)` returns keys in insertion order for string
keys (ES2015+ guarantee), so iteration order is the order they appear in the
input JSON. For a resource fetched from a FHIR server this is stable, but
extensions constructed programmatically (e.g. by the user pasting JSON in a
future feature) could surface a non-canonical first field. Not a bug today.
**Fix:** Optional — sort `value*` keys lexicographically for determinism, or
prefer `valueString`/`valueCodeableConcept`/`valueQuantity` in an explicit
priority list.

### IN-04: `getResourceDateByType` ignores `Encounter.actualPeriod` (R5) and `effectivePeriod` for Observation

**File:** `src/components/explorer/SearchResultsPage.tsx:108-125`
**Issue:** Per project constraints, FHIR R4 is the target so `Encounter.period`
and `Observation.effectiveDateTime` are correct. However, an Observation may
populate `effectivePeriod` (choice) instead of `effectiveDateTime`. The legacy
`getResourceDate` covers the period fallback, but the typed branch returns
empty string before falling through. So an Observation with
`effectivePeriod: { start: '...' }` shows empty in the table. Worth
documenting as known limitation or extending the switch.
**Fix:**
```tsx
case 'Observation': {
  const o = resource as Observation;
  return (
    o.effectiveDateTime?.slice(0, 10) ??
    o.effectivePeriod?.start?.slice(0, 10) ??
    ''
  );
}
```

### IN-05: `QualityByTypeMatrix.handleRowClick` does not handle `loading` cells gracefully

**File:** `src/components/quality/QualityByTypeMatrix.tsx:160-175`
**Issue:** When a row is rendered with `countLoading: true`, the chevron is
still active and clicking it falls into the empty-metrics branch and navigates
to `/explorer/<type>`. This may or may not be intentional, but during loading
it would be safer to disable the chevron to avoid users navigating away
prematurely.
**Fix:**
```tsx
<UnstyledButton
  aria-label="Open per-type drill-down"
  onClick={() => handleRowClick(row)}
  disabled={row.countLoading}
  style={{ opacity: row.countLoading ? 0.4 : 1 }}
>
```

### IN-06: `useCompletenessReport` and `useCodingCoverage` write `setByType` on every effect run

**File:** `src/hooks/useCompletenessReport.ts:46-62`, `src/hooks/useCodingCoverage.ts:44-63`
**Issue:** Both hooks call `setByType(byType)` unconditionally on every
`reports` change, even when the computed `byType` is structurally identical
to the prior state. This causes unnecessary re-renders of the matrix card on
every sample-walker tick. Mantine/React shallow-compare strategies don't
help here because `byType` is a new object literal each time.
**Fix:** Memoize and shallow-equal-check, e.g.:
```tsx
const prevRef = useRef<Record<string, number>>({});
useEffect(() => {
  // ... compute byType ...
  const next = byType;
  if (!shallowEqual(prevRef.current, next)) {
    prevRef.current = next;
    setCompletenessByType(next);
  }
  // ... rollup logic ...
}, [reports, ...]);
```

### IN-07: Test polyfills duplicated across 3 test files

**File:** `src/__tests__/HumanReadableView.extensions.test.tsx:7-29`,
`src/__tests__/ResourcePropertyTable.test.tsx:8-30`,
`src/__tests__/QualityByTypeMatrix.test.tsx:38-50`
**Issue:** The `MockResizeObserver` + `matchMedia` polyfills are copy-pasted
into each test file. A shared `src/__tests__/setup.ts` file (or vitest setup
file) would dedupe and ensure consistency if Mantine adds a new global
expectation.
**Fix:** Extract to `src/__tests__/setup.ts`:
```ts
class MockResizeObserver { observe = vi.fn(); unobserve = vi.fn(); disconnect = vi.fn(); }
(globalThis as unknown as { ResizeObserver: typeof ResizeObserver }).ResizeObserver =
  MockResizeObserver as unknown as typeof ResizeObserver;
Object.defineProperty(window, 'matchMedia', { writable: true, value: vi.fn().mockImplementation(...) });
```
Reference from `vitest.config.ts` via `test.setupFiles: ['./src/__tests__/setup.ts']`.

---

_Reviewed: 2026-04-25_
_Reviewer: Claude (gsd-code-reviewer)_
_Depth: standard_
