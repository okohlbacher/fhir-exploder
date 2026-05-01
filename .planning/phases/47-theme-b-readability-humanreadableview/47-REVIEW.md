---
phase: 47-theme-b-readability-humanreadableview
reviewed: 2026-05-01T00:00:00Z
depth: standard
files_reviewed: 13
files_reviewed_list:
  - src/utils/referenceUrl.ts
  - src/utils/__tests__/referenceUrl.test.ts
  - src/hooks/useReferenceResolver.ts
  - src/hooks/__tests__/useReferenceResolver.test.tsx
  - src/components/explorer/ReferenceLink.tsx
  - src/components/explorer/__tests__/ReferenceLink.test.tsx
  - src/components/explorer/ExtensionChip.tsx
  - src/components/explorer/__tests__/ExtensionChip.test.tsx
  - src/components/explorer/ContainedResourcesAccordion.tsx
  - src/components/explorer/__tests__/ContainedResourcesAccordion.test.tsx
  - src/components/explorer/__tests__/HumanReadableView.read-phase.test.tsx
  - src/components/explorer/ResourcePropertyTable.tsx
  - src/components/explorer/HumanReadableView.tsx
findings:
  critical: 2
  warning: 4
  info: 5
  total: 11
status: issues_found
---

# Phase 47: Code Review Report

**Reviewed:** 2026-05-01
**Depth:** standard
**Files Reviewed:** 13
**Status:** issues_found

## Summary

Phase 47 ships three READ enrichments to `HumanReadableView` (reference resolver hook, extension chip, contained accordion). The architecture is clean: cache + in-flight Map mirror the proven Phase 36 pattern, the security gate (`isValidFhirReference`) is enforced before fetch, and the contained accordion uses dedicated SKIP_KEYS plumbing instead of leaking through `DeepJsonModal`.

Two **Critical Rules-of-Hooks violations** were found. Both `ReferenceLink` and `ExtensionChip` call hooks AFTER an early `return`, which crashes the React reconciler ("Rendered more hooks than during the previous render") whenever the prop that drives the early return changes between renders of the same instance. The current test suite happens to never re-render the same component instance with a flipped condition, so these escaped CI — but in production a parent re-render with a new `reference` prop (e.g. an editable form, or a list virtualization swap) WILL crash the page.

Other findings are: a duplicated `isValidFhirReference` definition that Phase 47 created the consolidation opportunity for but did not collapse, an unused `MockResizeObserver` lint smell, a missed `rel="noopener"` on `target="_blank"` (preexisting but reachable from the new ExtensionChip via `RenderValue`), a docstring/implementation mismatch on the indent depth ladder, and a fragile `Math.random` panel-id that should be `useId()`.

Reference href injection (T-47-01) is correctly enforced: `isValidFhirReference` blocks non-PascalCase types and whitespace/path-traversal ids before any fetch, and the render path uses `buildExplorerHref` exclusively (no user-controlled string ever lands in `href`). Cache correctness, in-flight dedup, and StrictMode safety are all sound.

## Critical Issues

### CR-01: Rules-of-Hooks violation in `ReferenceLink` — `useReferenceResolver` called conditionally

**File:** `src/components/explorer/ReferenceLink.tsx:55-84`
**Issue:** The fragment-ref short-circuit at line 55 (`if (reference.startsWith('#')) { ... return ... }`) returns BEFORE the `useReferenceResolver` call at line 84. If the same `<ReferenceLink>` instance is re-rendered with a different `reference` prop that flips between fragment and non-fragment forms (or vice-versa), React sees the hook count change (0 → 1 or 1 → 0) and throws "Rendered more hooks than during the previous render." This crashes the entire `HumanReadableView` for that resource.

This is reachable in practice when:
- A parent re-renders the same row with an updated reference (form edits, terminology resolution mutating the resource shape).
- A list (e.g. `Bundle.entry[*].resource.subject`) is reordered or virtualized so `<ReferenceLink>` instances are reused with new props.
- `useResolvedResource` enriches the resource and a `subject.reference` changes from `#contained` to `Patient/123` between renders.

The unit tests do not catch this because each test mounts a fresh component — they never re-render the same instance with a flipped fragment condition. The eslint-plugin-react-hooks `rules-of-hooks` lint rule should also be flagging this if it is enabled.

**Fix:** Move the hook call BEFORE the early return, then branch on the result:

```tsx
export function ReferenceLink({
  reference,
  display,
  parentResource,
}: ReferenceLinkProps): JSX.Element {
  const isFragment = reference.startsWith('#');
  // Always call the hook; pass undefined to skip the fetch when fragment.
  const { resource, status } = useReferenceResolver(isFragment ? undefined : reference);

  if (isFragment) {
    const contained = findContained(parentResource, reference);
    if (contained) {
      // ...existing contained branch...
    }
    return (
      <Tooltip label={reference} withArrow position="top" openDelay={400}>
        <Text size="sm" c="dimmed">{reference}</Text>
      </Tooltip>
    );
  }

  // ...existing non-fragment branches...
}
```

Note: `useReferenceResolver(undefined)` already returns `{ resource: null, status: 'failed' }` synchronously without firing a fetch (line 82, 107 of the hook), so passing `undefined` for fragment refs preserves the "no extra network call" behavior. Add a regression test that re-renders the same instance with flipping fragment props.

### CR-02: Rules-of-Hooks violation in `ExtensionChip` — second `useState` called conditionally

**File:** `src/components/explorer/ExtensionChip.tsx:37-45`
**Issue:** `const [open, setOpen] = useState(false)` runs at line 37, then `if (count === 0) return null;` at line 39, then `const [panelId] = useState(() => ...)` at line 43. If the same `<ExtensionChip>` instance is re-rendered with `extensions` going from non-empty to empty (or the reverse), the second `useState` is skipped on one render and called on the next — hook count flips 1 ↔ 2 and React crashes.

This is reachable when a property's `_K.extension[]` is mutated between renders (e.g. terminology resolution adds/removes extensions on the wrapped resource, or live FHIR data is reloaded and the new payload has an empty extension array on the same property).

**Fix:** Move both hooks above the early return and use `useId` (React 18) for the panel id — both hooks must be called unconditionally:

```tsx
import { useId, useState } from 'react';

export function ExtensionChip({ extensions }: ExtensionChipProps): JSX.Element | null {
  const [open, setOpen] = useState(false);
  const panelId = useId();
  const count = extensions.length;
  if (count === 0) return null;

  const label = count === 1 ? '1 extension' : `${count} extensions`;
  // ...rest unchanged, using panelId from useId()...
}
```

`useId()` is the React-18-blessed API for stable, SSR-safe ids and avoids the `Math.random()` collision-probability concern noted in IN-04 below. Add a regression test that re-renders the same instance with extensions toggling between `[]` and `[ext]`.

## Warnings

### WR-01: Duplicated `isValidFhirReference` constant — Phase 47 left the legacy copy in place

**File:** `src/components/explorer/ResourceDetailPage.tsx:19-24` (vs `src/utils/referenceUrl.ts:13-25`)
**Issue:** `FHIR_REFERENCE_PATTERN`, `FHIR_ID_PATTERN`, and `isValidFhirReference` are defined identically in BOTH `ResourceDetailPage.tsx:19-24` and the new `src/utils/referenceUrl.ts:13-25`. Phase 47 explicitly extracted these into `referenceUrl.ts` (per the docstring in `referenceUrl.ts:20` "Mirrors the existing T-02-08 mitigation in ResourceDetailPage.tsx:19-24") but did not collapse the original. Two copies of a security-sensitive validator now drift independently — if the FHIR R4 id grammar is ever tightened, both must be updated, and CI cannot enforce parity.

**Fix:** Delete the local definition in `ResourceDetailPage.tsx` and import from the canonical location:

```tsx
// In src/components/explorer/ResourceDetailPage.tsx, replace lines 19-24 with:
import { isValidFhirReference } from '../../utils/referenceUrl';
```

This is the explicit Q1 follow-up the phase docstring promises. Defer to a small follow-up PR if out-of-scope for Phase 47 closure, but file it before Phase 48 starts so the Phase 47 commit is the canonical reference for future work.

### WR-02: Reverse-tabnabbing on external URLs in `RenderValue` (preexisting; reachable via new ExtensionChip)

**File:** `src/components/explorer/ResourcePropertyTable.tsx:90`
**Issue:** `<Anchor href={value} target="_blank" size="sm">{value}</Anchor>` opens external URLs in a new tab without `rel="noopener noreferrer"`. The opened page can call `window.opener.location = 'https://attacker.example/'` and silently navigate the Explorer tab elsewhere — the classic reverse-tabnabbing attack.

This branch existed pre-Phase-47 but is now reached more often because `RenderValue` is reused inside `<ExtensionChip>` to render `valueUri`/`valueUrl` extension fields, which are user-controlled (extensions originate from arbitrary FHIR servers / arbitrary profiles). An MII Kerndatensatz extension carrying a malicious `valueUrl` will trigger this path on click.

Modern browsers (Chrome 88+, Firefox 79+, Safari 12.1+) default to `noopener` for `target="_blank"`, but this is not guaranteed across all jsdom-compat targets the project supports, and explicit `rel` is the auditable defense.

**Fix:**
```tsx
return <Anchor href={value} target="_blank" rel="noopener noreferrer" size="sm">{value}</Anchor>;
```

### WR-03: `findContained` does linear scan with no length guard — pathological `contained[]` could degrade perceived render time

**File:** `src/components/explorer/ReferenceLink.tsx:36-47`
**Issue:** `findContained` runs `for (const c of contained)` for every `<ReferenceLink>` mount with a fragment ref. If a single resource has 50 fragment refs and `contained.length === 200`, that's 10,000 string comparisons per render. Combined with the unbounded `contained[]` length called out in `ContainedResourcesAccordion` T-47-02 ("Defensive `slice(0, 200)` cap NOT added in Phase 47 — flagged for HUMAN-UAT"), this compounds.

This is a render-time correctness hazard rather than a perf-only issue: `<ReferenceLink>` is called inside `<RenderValue>` inside `<ResourcePropertyTable>`, so a slow scan blocks the React commit and surfaces as Skeleton-flash. A `Map<string, Resource>` lookup built once per parent fixes this.

**Fix:** Build the lookup map at `<ResourcePropertyTable>` level via `useMemo` and pass it down through `parentResource`, OR memoize inside `findContained` via a WeakMap keyed on `parent`:

```tsx
const containedIndex = new WeakMap<Resource, Map<string, Resource>>();
function findContained(parent: Resource | undefined, fragment: string): Resource | null {
  if (!parent) return null;
  const id = fragment.startsWith('#') ? fragment.slice(1) : fragment;
  let idx = containedIndex.get(parent);
  if (!idx) {
    idx = new Map();
    const contained = (parent as { contained?: Resource[] }).contained ?? [];
    for (const c of contained) {
      if (c.id) idx.set(c.id, c);
    }
    containedIndex.set(parent, idx);
  }
  return idx.get(id) ?? null;
}
```

WeakMap keyed on the parent object reference avoids leaks (parent goes out of scope → entry is GC'd) and gets us O(1) lookup without prop-drilling.

### WR-04: `ExtensionRow` indent does not actually accumulate per nesting level (docstring/code mismatch)

**File:** `src/components/explorer/ExtensionChip.tsx:83-91`
**Issue:** The docstring at line 11-13 states "Nested: extension.extension[] recurses with `pl="md"` indent (D-07)" and the inline comment at line 87-88 says "1-level indent per nesting level (D-07)." But the actual implementation `const indent = depth > 0 ? 'md' : 0` collapses ALL non-zero depths to a single `md` indent. A 3-deep extension nest (`ext → ext → ext → ext`) renders with the same horizontal offset at depth 1, 2, and 3, defeating the visual hierarchy D-07 promises.

This is a UX correctness issue, not a crash, but it makes deeply-nested extensions visually flat and harder to scan.

**Fix:** Use a numeric pl that scales with depth, or chain Stacks each at `pl="md"` (each child inherits its parent's offset). The simplest fix:

```tsx
function ExtensionRow({ collected, depth }: ExtensionRowProps): JSX.Element {
  // ...
  return (
    <Stack gap={4} pl={depth > 0 ? 'md' : 0}>
      <Group gap="xs" wrap="nowrap">
        {/* row content */}
      </Group>
      {value !== undefined && <RenderValue value={value} />}
      {/* Nested rows are wrapped in their OWN <Stack pl="md">, so each level
          inherits the parent's offset → cumulative indent works for free. */}
      {nested.length > 0 && nested.map((n, i) =>
        n && typeof n === 'object' && typeof (n as { url?: unknown }).url === 'string' ? (
          <ExtensionRow
            key={i}
            collected={{ url: (n as { url: string }).url, ext: n }}
            depth={depth + 1}
          />
        ) : null
      )}
    </Stack>
  );
}
```

Looking at the existing structure, this MAY actually already work because each `ExtensionRow` returns its own `<Stack pl={indent}>`, so nested rows DO inherit their parent's pl. If so, the bug is just that depth=2 and depth=3 both apply `pl="md"` on top of each parent's `pl="md"` — which IS cumulative. In that case, this finding reduces to a docstring-vs-code clarity issue: please verify the actual rendered DOM and either fix the comment or fix the code accordingly. Either way, add an integration test asserting `[data-testid="ext-row-depth-2"]` has greater computed-style padding-left than `[data-testid="ext-row-depth-1"]`.

## Info

### IN-01: `MockResizeObserver` boilerplate duplicated across 4 test files

**File:** `src/components/explorer/__tests__/ReferenceLink.test.tsx:16-35`, `ExtensionChip.test.tsx:8-27`, `ContainedResourcesAccordion.test.tsx:9-28`, `HumanReadableView.read-phase.test.tsx:10-29`
**Issue:** The `MockResizeObserver` + `matchMedia` polyfill block is copy-pasted across all four new component test files (29 lines each). The block exists pre-Phase-47 in other tests too, but Phase 47 is a good moment to consolidate.

**Fix:** Extract to `src/test/setup-mantine-jsdom.ts` and either import it from each test or register it as a global setup file in `vitest.config.ts`. Reduces ~120 lines of test boilerplate.

### IN-02: `findContained` does not validate contained `id` against `FHIR_ID_PATTERN`

**File:** `src/components/explorer/ReferenceLink.tsx:41-46`
**Issue:** The fragment-ref handling strips `#` and matches on `c.id === id` without first validating that the stripped fragment is a well-formed FHIR id. Bracket-string equality is safe (no prototype lookup), so this is not a security bug, but for consistency with T-47-01 defense-in-depth (every reference go through `isValidFhirReference` before being used), add the same gate here.

**Fix:** After stripping the leading `#`, check `if (!FHIR_ID_PATTERN.test(id)) return null;` before scanning `contained[]`. Negligible cost, parity with the resolver path.

### IN-03: `useReferenceResolver` `useReducer` is used purely for forced re-render; consider `useState`

**File:** `src/hooks/useReferenceResolver.ts:79`
**Issue:** `const [, forceUpdate] = useReducer((n: number) => n + 1, 0)` is an idiomatic-but-uncommon pattern for triggering a re-render. A simple `const [, setTick] = useState(0); ... setTick((n) => n + 1)` is functionally equivalent and a more familiar shape for future readers. Not wrong, just adds a small comprehension cost.

**Fix:** Optional. Either swap to `useState`, or add a one-line comment "// forceUpdate: bump local state to re-read from cache after fetchReference resolves" so the intent is obvious.

### IN-04: `Math.random()` panel-id is fragile under SSR / collision-prone enough to lint

**File:** `src/components/explorer/ExtensionChip.tsx:43-45`
**Issue:** `Math.random().toString(36).slice(2, 8)` produces a 6-char base-36 string (~36^6 ≈ 2 billion possibilities). On a page with N=1000 chips, the birthday-paradox collision probability is ~10^-3 — small but non-zero. More importantly, `Math.random()` is non-deterministic at SSR-hydration time (this app is SPA-only, so not a concrete bug, but it does mean React DevTools show different ids across remounts and Strict-Mode double-mount).

**Fix:** Use `useId()` (React 18). See CR-02 fix for the combined patch.

### IN-05: `ContainedResourcesAccordion` mounts `<ResourcePropertyTable>` inside every `<Accordion.Panel>` — confirms test author's own observation that panels render content even when collapsed

**File:** `src/components/explorer/ContainedResourcesAccordion.tsx:82-85`
**Issue:** Mantine 8 `<Accordion>` mounts panel children eagerly (visible at `aria-expanded="false"` via display:none). The test file at `ContainedResourcesAccordion.test.tsx:117-120` and `:148-153` notes this behavior explicitly. For T-47-02 ("DoS via pathological contained[] count") this is a real concern — a Bundle with 500 contained resources will mount 500 `<ResourcePropertyTable>` instances even though the user sees only the headers. Each table can be quite heavy.

The phase docstring at lines 36-41 acknowledges this and accepts the risk for typical FHIR data (N ≤ 50), deferring a `slice(0, 200)` cap to HUMAN-UAT. Just confirming this for the record so reviewers know the concern was considered. If HUMAN-UAT confirms slow loads on real Blaze data, add a `chunkLoadOnExpand: true`-style escape hatch (e.g. render `<ResourcePropertyTable>` only when `expanded.includes(value)` via controlled `<Accordion onChange>`).

**Fix:** No action required for Phase 47 closure. File a HUMAN-UAT follow-up note ("if contained-count > 50 in real data, gate panel rendering on expand state") and revisit.

---

_Reviewed: 2026-05-01_
_Reviewer: Claude (gsd-code-reviewer)_
_Depth: standard_
