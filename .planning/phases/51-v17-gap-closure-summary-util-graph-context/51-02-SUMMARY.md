---
phase: 51-v17-gap-closure-summary-util-graph-context
plan: 2
subsystem: explorer/graph
tags: [graph, navigation, patient-context, gap-closure, GAP-2, GRPH-03]
gap_closure: true
requirements:
  - GRPH-03
requires:
  - Phase 49 ResourceGraphNode component (custom React Flow node, Mantine Card 220×64)
  - Phase 49 ResourceGraphView (canonical patientId useParams pattern, lines 51-54 + 119-121)
  - App.tsx :patientId/:resourceType/:id/graph sibling route (line 157)
provides:
  - Patient-context-preserving navigation from any graph node click when entered via the patient-scoped graph route
  - FHIR_ID_PATTERN defensive validation on attacker-supplied patientId route param (T-51-02-01 mitigation)
affects:
  - src/components/explorer/ResourceGraphNode.tsx (navigation branch logic)
  - src/components/explorer/__tests__/ResourceGraphNode.test.tsx (+2 tests, +renderNodeAtRoute helper)
tech-stack:
  added: []
  patterns:
    - useParams<{ patientId?: string }>() + conditional navigate() target
      mirrors ResourceGraphView.tsx:51-54 / 119-121 verbatim
    - Defensive validator on every untrusted route segment before string-template
      composition into navigate()
key-files:
  created: []
  modified:
    - src/components/explorer/ResourceGraphNode.tsx
    - src/components/explorer/__tests__/ResourceGraphNode.test.tsx
decisions:
  - patientId validated via existing FHIR_ID_PATTERN, NOT a new validator (T-51-02-01)
  - Inline branch in safeNavigate; no useMemo / useCallback wrapping (Phase 49 didn't memoise it either; click handler equality is irrelevant)
  - renderNodeAtRoute test helper added alongside renderNode rather than replacing it — preserves all 4 original tests as regression locks
metrics:
  duration: ~5min
  tasks: 2
  files_changed: 2
  tests_added: 2
  tests_passing: 6
  completed_date: 2026-05-02
---

# Phase 51 Plan 2: Graph Node Patient-Context Navigation (GAP-2) Summary

**One-liner:** Closed GAP-2 from v1.7-MILESTONE-AUDIT — graph node clicks from `/patients/:patientId/:resourceType/:id/graph` now navigate back to `/patients/{patientId}/{type}/{id}` instead of dropping the user into `/explorer`, mirroring the canonical `backHref` pattern already used in `ResourceGraphView.tsx:119-121`.

## Files Changed (Diff Stats)

| File | Insertions | Deletions |
| ---- | ----------: | --------: |
| `src/components/explorer/ResourceGraphNode.tsx` | 9 | 3 |
| `src/components/explorer/__tests__/ResourceGraphNode.test.tsx` | 75 | 1 |
| **Totals** | **84** | **4** |

## What Changed

### `ResourceGraphNode.tsx` (T-1)

1. Imports — added `useParams` alongside existing `useNavigate`.
2. Component body — reads `const { patientId } = useParams<{ patientId?: string }>();` immediately after `useNavigate()`, matching the shape used in `ResourceGraphView.tsx:51-54`.
3. `safeNavigate` — replaced single-branch body with two-branch decision:
   - Outer guard: existing `FHIR_REFERENCE_PATTERN.test(type) && FHIR_ID_PATTERN.test(id)` preserved.
   - New inner branch: when `patientId && FHIR_ID_PATTERN.test(patientId)` → `navigate('/patients/${patientId}/${type}/${id}')`.
   - Fallback: existing `navigate('/explorer/${type}/${id}')` preserved byte-for-byte (Phase 49 contract regression lock).

### `ResourceGraphNode.test.tsx` (T-2)

1. Imports — pulled in `Route` and `Routes` from `react-router-dom` (added to existing import line).
2. Added `renderNodeAtRoute(resource, isRoot, path, initialEntry)` helper that mounts the component inside a `<MemoryRouter initialEntries=...><Routes><Route path=...>` shell so `useParams()` resolves real route values.
3. Added 2 new tests at the end of the existing describe block:
   - "node click from patient-scoped graph route navigates to /patients/{patientId}/{type}/{id} (GAP-2 fix)" — locks the new branch.
   - "FHIR_ID_PATTERN rejects malformed patientId — falls back to /explorer/{type}/{id}" — locks the defensive-validation tail.

The 4 original tests remain byte-identical (visual contract + the explorer-fallback branch).

## Both Navigation Branches Exercised by RTL

| Route shape on entry | useParams result | Click target | Navigate destination | Test |
|----------------------|-------------------|--------------|----------------------|------|
| (bare `<MemoryRouter>`, no Routes) | `{}` | `Observation/obs-42` | `/explorer/Observation/obs-42` | "node click navigation — clicking the Card calls useNavigate with /explorer/{type}/{id}" (regression lock) |
| `/patients/p1/Patient/p1/graph` | `{ patientId: 'p1', resourceType: 'Patient', id: 'p1' }` | `Observation/obs-42` | `/patients/p1/Observation/obs-42` | "node click from patient-scoped graph route navigates to /patients/{patientId}/{type}/{id} (GAP-2 fix)" |
| `/patients/bad%20id$$$/Patient/p1/graph` | `{ patientId: 'bad id$$$' (decoded), ... }` | `Observation/obs-42` | `/explorer/Observation/obs-42` (defensive fallback) | "FHIR_ID_PATTERN rejects malformed patientId — falls back to /explorer/{type}/{id}" |

## Test Count Delta

- Before: 4 tests in `ResourceGraphNode.test.tsx` (Phase 49 baseline).
- After: 6 tests in `ResourceGraphNode.test.tsx` (+2 new; 0 removed).
- Full vitest suite: 1388 passed / 22 todo / 1 pre-existing failed (`deuteranopia.test.tsx` pair #13 cardio↔mikro — Phase 40 artifact already documented in `deferred-items.md`).
- `tsc -b --noEmit` exits 0.
- `npm run build` clean (616 ms).

## GRPH-03 Traceability

The Phase 49 plan-text contract for GRPH-03 was satisfied — `ResourceGraphNode` rendered a Mantine `Card` with the correct visual chrome, click target, and navigation handler. The audit gap (GAP-2 in `.planning/v1.7-MILESTONE-AUDIT.md`) caught a UX divergence: when entered via the patient-scoped sibling route, the component dropped the patient context on click. This plan closes that gap without changing the literal Phase 49 visual contract — only the navigate target inside `safeNavigate` branches, mirroring the `backHref` pattern Phase 49 already used in `ResourceGraphView.tsx:119-121`.

## Defensive Validation (T-51-02-01 mitigation)

Per the plan's `<threat_model>` register, route params are untrusted user input. The new code applies `FHIR_ID_PATTERN.test(patientId)` BEFORE any string-template composition, mirroring the existing defense-in-depth at lines 25-26 + 43 (the same regex already protects `id` and `type` via `FHIR_REFERENCE_PATTERN`). The "FHIR_ID_PATTERN rejects malformed patientId" test exercises this branch explicitly. The validator rejects `/`, `?`, `#`, `..`, whitespace, and any character outside `[A-Za-z0-9.\-]` — closing the path-injection / segment-traversal vector for `T-51-02-01`.

## Visual / Chrome / Typography / Spacing

Zero changes. Verified by acceptance-criteria grep gates:
- `git diff src/components/explorer/ResourceGraphNode.tsx | grep -E "^\+.*<(Text|Title|Tooltip|Card|Paper|Button|Alert|Stack|Group)\b"` → 0 matches.
- `git diff src/components/explorer/ResourceGraphNode.tsx | grep -E "^\+.*(style=|c=|fw=|size=|padding=|radius=|withBorder)"` → 0 matches.

The `<Tooltip>` wrapper, `<Card withBorder radius="md" padding="xs" w={220} h={64}>`, `style.cursor / borderColor / borderWidth`, `data-testid`, `<Stack gap={2}>`, `<Text size="xs" c="dimmed" ff="monospace" tt="uppercase" lh={1.2}>`, and `<Text size="sm" fw={500} lineClamp={1}>` are byte-identical to Phase 49 baseline.

## Deviations from Plan

None — plan executed exactly as written. All acceptance criteria for both tasks passed on first run; no Rule 1/2/3 fixes were needed; no Rule 4 architectural decisions came up.

## Commits

| Task | Hash | Subject |
| ---- | ---- | ------- |
| T-1 | `579eddd` | feat(51-02): preserve patient context in graph node navigation (GAP-2) |
| T-2 | `0add6ad` | test(51-02): add RTL coverage for both graph node navigation branches |

## Self-Check: PASSED

- FOUND: `src/components/explorer/ResourceGraphNode.tsx`
- FOUND: `src/components/explorer/__tests__/ResourceGraphNode.test.tsx`
- FOUND: `.planning/phases/51-v17-gap-closure-summary-util-graph-context/51-02-SUMMARY.md`
- FOUND: commit `579eddd` (feat T-1)
- FOUND: commit `0add6ad` (test T-2)
