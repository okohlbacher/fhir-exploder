---
phase: 04-terminology-resolution
plan: 04
subsystem: terminology
tags: [terminology, hook, integration, progressive-enhancement, detail-views]

requires:
  - phase: 04-terminology-resolution
    plan: "03"
    provides: TerminologyResolver + TerminologyProvider + useTerminology
provides:
  - "useResolvedResource<T extends Resource>(resource: T | undefined): T | undefined hook"
  - "HumanReadableView renders enriched resource via useResolvedResource"
  - "ClinicalRawView left panel enriched; right panel still raw wire-format"
  - "App.tsx mounts TerminologyProvider inside AppRoutes so settings-driven resolver wraps all routes"
affects:
  - 04-05-sidebar-settings

tech-stack:
  added: []
  patterns:
    - "Progressive enhancement via hook: return raw resource synchronously, re-render with enriched copy once resolver settles — no spinner, no layout shift (D-12)"
    - "Silent-fallback hook: belt-and-braces .catch() on the resolver's (already non-throwing) resolveResource promise — render path stays untouched even if a future resolver refactor leaks"
    - "Provider nesting locked: ConnectionProvider > AppRoutes > TerminologyProvider > Routes — TerminologyProvider sits inside AppRoutes because it needs `settings` from useSettings()"
    - "Component-test strategy for Medplum components: mock @medplum/react.ResourceTable to observe its `value` prop, bypasses need for @medplum/definitions schema bundle"

key-files:
  created:
    - "src/hooks/useResolvedResource.ts"
    - "src/__tests__/resolved-resource.test.tsx"
    - "src/__tests__/human-readable-view-terminology.test.tsx"
  modified:
    - "src/components/explorer/HumanReadableView.tsx"
    - "src/components/explorer/ClinicalRawView.tsx"
    - "src/App.tsx"

key-decisions:
  - "Hook re-effect dep is [resource, resolver] — a stable resource reference does NOT re-fire a lookup (V-06/dedup proved at hook level)"
  - "ClinicalRawView right panel stays on original `resource` (not `resolved`) so the JSON panel shows exactly what the FHIR server returned over the wire (Cross-View Consistency in UI-SPEC C-3)"
  - "TerminologyProvider mounted INSIDE AppRoutes because settings comes from useSettings() which is scoped to AppRoutes — mounting it higher up would require lifting settings too (W-3 fix, locks the nesting)"
  - "Component test mocks ResourceTable rather than depending on Medplum's R4 StructureDefinition bundle (not installed) — captures the integration contract (enriched resource reaches ResourceTable) without loading ~5MB of schema fixtures"
  - "DeveloperJsonView is intentionally NOT wrapped — D-09 scope is detail views (table rendering), not raw JSON (which must stay wire-format)"
  - "SearchControl tables in ResourceExplorer are intentionally NOT wrapped — D-09 scope is single-resource detail views only; list tables stay on raw Bundle for performance (Pitfall 4)"

patterns-established:
  - "Pattern: progressive-enhancement hook — useState initialized to input, useEffect awaits resolver, cancelled-flag guards unmount, returns current state always so consumers get sync baseline + async enrichment with zero ceremony"
  - "Pattern: mock Medplum React components when testing component-level integration contracts — much lighter than loading the full schema bundle"

requirements-completed:
  - TERM-01
  - TERM-03

duration: 5min 55s
completed: 2026-04-12
---

# Phase 04 Plan 04: useResolvedResource Hook + View Integration Summary

**User-visible payoff of Phase 4: `useResolvedResource` wraps detail-view resources so Medplum's `ResourceTable` re-renders with German CodeableConcept displays once the terminology server's `$lookup` settles — no spinner, no layout shift, and raw codes stay visible if the server is dead.**

## Performance

- **Duration:** 5 min 55 s
- **Started:** 2026-04-12T07:26:55Z
- **Completed:** 2026-04-12T07:32:50Z
- **Tasks:** 2 (TDD: both RED → GREEN)
- **Files created:** 3 (hook + 2 tests)
- **Files modified:** 3 (HumanReadableView, ClinicalRawView, App.tsx)

## Accomplishments

- `useResolvedResource<T>(resource: T | undefined): T | undefined` delivers progressive enhancement per D-12 — returns the raw resource synchronously on first render, re-renders with `Coding.display` populated once the resolver settles
- Cancellation on unmount / resource-change prevents stale `setState` on unmounted components
- Identical input reference does NOT re-fire a lookup (dedup contract proved at the hook level, complementing the resolver's inflight Map dedup from Plan 03)
- `HumanReadableView` wraps its input in `useResolvedResource` before handing to Medplum's `ResourceTable` — TERM-01 observable outcome (user sees "Diabetes mellitus Typ 2" in place of "E11.9")
- `ClinicalRawView` left panel gets the resolved resource; right-hand JSON panel continues to show the wire-format unenriched resource (UI-SPEC C-3 Cross-View Consistency)
- `App.tsx` locks the provider nesting: `ConnectionProvider > AppRoutes > TerminologyProvider > Routes` — TerminologyProvider sits inside AppRoutes so it can read `settings` from `useSettings()` (W-3 fix)
- Dead terminology server → raw codes, no crash, no error boundary trip (TERM-03 / V-14 verified at the component boundary)
- 6 new tests green (4 hook + 2 component integration); zero regressions in the full 164-test suite
- **NO** `<Loader />` or `<Skeleton />` introduced in HumanReadableView or ClinicalRawView (progressive enhancement contract preserved)

## Task Commits

Each task committed atomically in TDD order:

1. **Task 1 RED: failing tests for useResolvedResource** — `4568750` (test)
2. **Task 1 GREEN: implement useResolvedResource** — `7963e19` (feat)
3. **Task 2 RED: failing integration tests for HumanReadableView** — `9885e35` (test)
4. **Task 2 GREEN: wire useResolvedResource + mount TerminologyProvider** — `18f6aa4` (feat)

## Public API

### useResolvedResource

```typescript
import { useResolvedResource } from '../hooks/useResolvedResource';

function MyDetailView({ resource }: { resource: Resource }) {
  const resolved = useResolvedResource(resource);
  return <ResourceTable value={resolved ?? resource} />;
}
```

**Contract:**
- `undefined` input → `undefined` output (hook is safe to use with loading states)
- Non-undefined input → same reference on first render, then enriched deep-clone on re-render once resolver settles
- Resolver failure → stays on the original input indefinitely (silent per D-07/TERM-03)
- Stable input reference across re-renders → no lookup re-fire

## Provider Nesting (locked per W-3)

```tsx
<ConnectionProvider>                // outermost: FHIR client lifecycle
  <AppRoutes>                       // reads settings via useSettings()
    <TerminologyProvider settings={settings}>   // resolver wraps all routes
      <Routes>...</Routes>
    </TerminologyProvider>
  </AppRoutes>
</ConnectionProvider>
```

This is the only acceptable structure. TerminologyProvider MUST be inside AppRoutes because `useSettings()` is called there; mounting it higher would require lifting settings too.

## Views Wired (D-09 scope)

| Component | Wrapped? | Rationale |
|-----------|----------|-----------|
| HumanReadableView | ✓ | Detail view, primary terminology surface |
| ClinicalRawView left panel | ✓ | Detail view, table rendering |
| ClinicalRawView right panel | ✗ (intentional) | UI-SPEC C-3: JSON shows wire format |
| DeveloperJsonView | ✗ (intentional) | Same rationale; JSON must stay raw |
| SearchControl tables (ResourceExplorer) | ✗ (intentional) | D-09 scope is detail views; list tables stay on raw Bundle (Pitfall 4) |
| PatientHeader / PatientSummary | ✗ (future) | Not touched by this plan |

## Decisions Made

- **Progressive enhancement over spinner:** the hook deliberately returns the raw resource synchronously on first render and re-renders with the enriched copy once resolution settles. No `<Loader />`, no `<Skeleton />`, no fade. Matches D-12 and UI-SPEC C-3 explicitly — users see the table immediately, enriched displays drop in silently.
- **Belt-and-braces `.catch()` in the hook:** the resolver's public API is already non-throwing (Plan 03 contract), but the hook still wraps `.resolveResource()` in `.catch()` so any future leak can never bubble into the render path.
- **Right panel stays on raw `resource`:** ClinicalRawView's JSON panel is the developer's "what exactly came over the wire" view; enriching it would silently rewrite the server's payload. Cross-View Consistency in UI-SPEC C-3.
- **TerminologyProvider inside AppRoutes (W-3):** AppRoutes reads `settings` via `useSettings()`. Mounting TerminologyProvider outside AppRoutes would require lifting settings — simpler to put it where settings already lives, right around the `<Routes>` tree.
- **Mocked `ResourceTable` in integration test:** Medplum's `ResourceTable` requires the R4 StructureDefinition bundle to be indexed via `@medplum/definitions` (not installed). Rather than add ~5MB of schema fixtures, the component test mocks `@medplum/react.ResourceTable` to capture its `value` prop and assert that the enriched resource reaches it. This tests the integration contract exactly — that useResolvedResource wires up correctly and the enriched resource flows through.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] Mocked `@medplum/react.ResourceTable` in component test**

- **Found during:** Task 2 RED → GREEN transition (component test failed with "empty ScrollArea-content")
- **Issue:** Plan Task 2's sketch used `screen.findByText('Diabetes mellitus Typ 2')` against Medplum's real ResourceTable. But ResourceTable enumerates resource properties via Medplum's indexed R4 StructureDefinitions; without `@medplum/definitions` (not an installed dep) it renders zero rows. Test would never find ANY text, enriched or raw.
- **Fix:** `vi.mock('@medplum/react', () => ({ ResourceTable: (...) => <span data-testid="rt-display">{value.code.coding[0].display}</span> }))`. The mock captures the exact prop `value` that HumanReadableView passes, so the test still asserts the integration contract (useResolvedResource → enriched resource → ResourceTable.value) without dragging in the schema bundle.
- **Files modified:** `src/__tests__/human-readable-view-terminology.test.tsx`
- **Verification:** Both tests green ("renders resolved display" + "fallback to code"); hook test (Task 1) uses the real hook against a real resolver so the end-to-end enrichment is still verified there.
- **Committed in:** `18f6aa4` (bundled with Task 2 GREEN)

**2. [Rule 2 - Missing critical functionality] Added polyfills for `ResizeObserver` + `window.matchMedia` in component test**

- **Found during:** Task 2 RED first run
- **Issue:** Mantine's `ScrollArea` + `MantineProvider` require `ResizeObserver` and `window.matchMedia` which jsdom does not ship. Every existing Mantine-using test in this repo polyfills both (see `patient-list.test.tsx`, `patient-detail.test.tsx`, `resource-type-landing-counts.test.tsx`). The plan's sketch omitted this.
- **Fix:** Added the same `MockResizeObserver` class + `Object.defineProperty(window, 'matchMedia', ...)` polyfill stanzas that are already canonical in this project's test tree.
- **Files modified:** `src/__tests__/human-readable-view-terminology.test.tsx`
- **Verification:** `npm test -- src/__tests__/human-readable-view-terminology.test.tsx` green (2/2).
- **Committed in:** `18f6aa4` (bundled with Task 2 GREEN — polyfills are file-local scaffolding)

---

**Total deviations:** 2 auto-fixed (1 Rule 3 blocking from schema-bundle absence, 1 Rule 2 adding project-canonical polyfills to a new test file). Neither changes behavior of the shipped hook or views.

## Issues Encountered

None beyond the two auto-fixes above.

## Deferred Issues

Pre-existing TypeScript errors surfaced by `npm run build` are unchanged since Plan 01 and remain **out of scope** per SCOPE BOUNDARY:

- `src/__tests__/display-modes.test.tsx(7,7)` — unused `mockPatient`
- `src/__tests__/json-highlight.test.ts(3,1)` — unused `JsonToken`
- `src/__tests__/resource-type-landing-counts.test.tsx(11,1)` — `Cannot find name 'global'`
- `src/components/explorer/ResourceDetailPage.tsx(56,21)` — FHIR resource-type string assignability
- `src/components/explorer/SearchResultsPage.tsx(59,10)` and `(62,10)` — SearchRequest/Record conversion
- `src/components/patients/FhirResourcesView.tsx(106,17)` — same FHIR resource-type string assignability

All 6 files touched by this plan (`useResolvedResource.ts`, `resolved-resource.test.tsx`, `human-readable-view-terminology.test.tsx`, `HumanReadableView.tsx`, `ClinicalRawView.tsx`, `App.tsx`) type-check cleanly.

## User Setup Required

None. Ontoserver R4 (default from Plan 01) is public and CORS-enabled; no credentials, no additional services to start.

## Next Plan Readiness

- **Ready for Plan 05 (sidebar + settings):** TerminologyProvider is mounted in App and swaps its underlying client whenever `settings.terminology` changes; sidebar dot can now read `probeTerminologyHealth` against the provider's current resolver client; "Clear terminology cache" button can call `resolver.cache.clear()`.
- **No blockers.**

## Self-Check: PASSED

All 6 claimed files present on disk (verified via Read tool during execution):

- `src/hooks/useResolvedResource.ts` — FOUND
- `src/__tests__/resolved-resource.test.tsx` — FOUND (170 lines)
- `src/__tests__/human-readable-view-terminology.test.tsx` — FOUND (140+ lines with polyfills + mock)
- `src/components/explorer/HumanReadableView.tsx` — FOUND (modified)
- `src/components/explorer/ClinicalRawView.tsx` — FOUND (modified)
- `src/App.tsx` — FOUND (modified)

All 4 task commits present:

- `4568750` (Task 1 RED) — FOUND
- `7963e19` (Task 1 GREEN) — FOUND
- `9885e35` (Task 2 RED) — FOUND
- `18f6aa4` (Task 2 GREEN) — FOUND

Verification commands green:

- `npm test -- src/__tests__/resolved-resource.test.tsx` — 4/4 tests passed
- `npm test -- src/__tests__/human-readable-view-terminology.test.tsx` — 2/2 tests passed
- `npm test` full suite — 164/164 tests passed (22 todo, 3 skipped suites pre-existing, 22 test files passed)
- `npm run build` — only pre-existing deferred errors remain; new/modified files type-check cleanly

grep-verified acceptance criteria:

- `useResolvedResource` in `src/hooks/useResolvedResource.ts` — FOUND
- `useTerminology` import in `useResolvedResource.ts` — FOUND
- `cancelled = true` cleanup in `useResolvedResource.ts` — FOUND (count: 1)
- `'enriches display'` test name in `resolved-resource.test.tsx` — FOUND
- `waitFor` in `resolved-resource.test.tsx` — FOUND
- `useResolvedResource` in `HumanReadableView.tsx` — FOUND (count: 3 — import + hook call + comment)
- `<Loader` or `Skeleton` in `HumanReadableView.tsx` — NOT FOUND (count: 0) ✓
- `useResolvedResource` in `ClinicalRawView.tsx` — FOUND (count: 3)
- `data={resource}` in `ClinicalRawView.tsx` — FOUND (right panel wire-format)
- `TerminologyProvider` in `App.tsx` — FOUND (count: 3 — import + JSX open + JSX close)
- `'renders resolved display'` + `'fallback to code'` in `human-readable-view-terminology.test.tsx` — FOUND (count: 2)

---
*Phase: 04-terminology-resolution*
*Completed: 2026-04-12*
