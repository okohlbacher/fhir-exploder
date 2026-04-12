---
phase: 06-v1-gap-closure-patient-navigation
plan: 01
subsystem: patient-aware-navigation
tags: [bug-fix, navigation, breadcrumbs, patient-context, routing]
gap_closure: true
closes:
  - MC-1  # Integration gap: ResourceDetailPage hardcoded /explorer basePath
  - BF-1  # Flow gap: reference navigation ejects user from patient subtree
upgrades_requirements:
  - { id: BRWS-07, from: partial, to: satisfied }
  - { id: PTNT-04, from: partial, to: satisfied }
  - { id: PTNT-05, from: partial, to: satisfied }
requirements: [BRWS-07, PTNT-04, PTNT-05]
depends_on: []
provides:
  - patient-aware breadcrumb root anchor
  - patient-aware Back-to-results target
  - patient-aware reference click navigation
  - regression guards for /explorer subtree behavior
affects:
  - src/components/explorer/ResourceDetailPage.tsx
  - src/components/explorer/NavigationBreadcrumbs.tsx
tech-stack:
  added: []
  patterns:
    - "basePath prop threading from route-aware parent into sibling nav components"
    - "prefix-string comparison to constrain navigate() target to hardcoded literals (T-06-02 mitigation)"
key-files:
  created:
    - src/__tests__/ entries added inline (no new files — extended existing placeholders)
    - .planning/phases/06-v1-gap-closure-patient-navigation/deferred-items.md
  modified:
    - src/components/explorer/ResourceDetailPage.tsx
    - src/components/explorer/NavigationBreadcrumbs.tsx
    - src/__tests__/reference-navigation.test.tsx
    - src/__tests__/resource-detail.test.tsx
decisions:
  - "basePath is derived once at the top of ResourceDetailPage and threaded explicitly into useBreadcrumbTrail and NavigationBreadcrumbs — no context, no prop-drilling beyond sibling scope"
  - "NavigationBreadcrumbs uses basePath.startsWith('/patients/') as the sole discriminator between 'Explorer' and 'Patients' root anchors; basePath itself is never passed to navigate() (T-06-02 mitigation)"
  - "Back-to-results target differs by context: patient subtree returns to /patients/:patientId (the patient detail page); explorer subtree returns to /explorer/:resourceType (the type landing) — matches the back-affordance expected by each entry point"
  - "Intermediate 'Patient/{patientId}' breadcrumb NOT added — deferred as future enhancement (audit did not request it, scope creep avoided)"
metrics:
  duration: "~3min"
  tasks: 2
  files: 4
  completed: 2026-04-12
  new-tests: 6
  new-tests-assertive: 6
  pre-existing-placeholder-tests-preserved: true
---

# Phase 06 Plan 01: Patient-aware Reference Navigation Summary

Fix the HIGH-severity cross-phase wiring defect (MC-1 / BF-1) where `ResourceDetailPage` unconditionally used `/explorer` as its breadcrumb basePath and Back-button target even when mounted under `/patients/:patientId/:resourceType/:id`, silently ejecting users out of patient context on every reference click.

---

## Closes

**Closes MC-1 (integration) and BF-1 (flow) from v1.0-MILESTONE-AUDIT.md.**

| Audit ID | Severity | Type | Before | After |
|----------|----------|------|--------|-------|
| MC-1 | HIGH | Integration | `ResourceDetailPage` hardcoded `/explorer` basePath | Dynamic basePath from `useParams<{ patientId?: string }>()` |
| BF-1 | HIGH | Flow | Reference click inside `/patients/:patientId/...` landed on `/explorer/...` | Reference click stays inside `/patients/:patientId/...` |

## Requirement Status Deltas

| Req | Before | After | Evidence |
|-----|--------|-------|----------|
| BRWS-07 (Reference navigation) | partial | **satisfied** | Test A: reference click in patient subtree now targets `/patients/pat-123/Observation/obs-9` |
| PTNT-04 (Clinical timeline) | partial | **satisfied** | MiiModuleTab (producer) + ResourceDetailPage (consumer) now preserve patient context end-to-end |
| PTNT-05 (MII lens) | partial | **satisfied** | Same fix applies — MII-lens reference drill-downs route via ResourceDetailPage |

**Note:** Plan 06-02 owns REQUIREMENTS.md traceability checkbox reconciliation (including flipping BRWS-07, PTNT-04, PTNT-05 to checked state if 06-02 runs after this).

## Tests Added

All 6 new tests are assertive (not `expect(true).toBe(true)` placeholders). Legacy placeholder tests preserved per plan scope.

### `src/__tests__/reference-navigation.test.tsx`

| # | Test | RED before Task 2 | GREEN after Task 2 |
|---|------|-------------------|---------------------|
| A | reference click inside `/patients/pat-123/Condition/cond-1` → navigates to `/patients/pat-123/Observation/obs-9` | ✗ failed | ✓ passed |
| B | reference click inside `/explorer/Condition/cond-1` → navigates to `/explorer/Observation/obs-9` (regression) | ✓ passed | ✓ passed |
| E | breadcrumb root anchor reads "Patients" → `/patients` in patient subtree | ✗ failed | ✓ passed |
| F | breadcrumb root anchor reads "Explorer" → `/explorer` in explorer subtree (regression) | ✓ passed | ✓ passed |

### `src/__tests__/resource-detail.test.tsx`

| # | Test | RED before Task 2 | GREEN after Task 2 |
|---|------|-------------------|---------------------|
| C | Back to results from `/patients/pat-123/Condition/cond-1` → navigates to `/patients/pat-123` | ✗ failed | ✓ passed |
| D | Back to results from `/explorer/Condition/cond-1` → navigates to `/explorer/Condition` (regression) | ✓ passed | ✓ passed |

**Test harness:** `MemoryRouter` + `Routes` with `initialEntries`, a `LocationProbe` component exposing `useLocation().pathname` via `data-testid`, and stubbed display-mode subcomponents so the tests don't require a FHIR schema bundle. The existing `patient-detail.test.tsx` mock-router pattern was not used here because Tests A–F need real `useParams` resolution under different URLs within a single test file.

## Files Modified

### `src/components/explorer/ResourceDetailPage.tsx` (3 edits)

One-line diff summary:
- Extract `patientId` from `useParams` (optional route segment on patient-scoped mount)
- Compute `basePath = patientId ? '/patients/${patientId}' : '/explorer'` and thread it into `useBreadcrumbTrail(basePath)` and `<NavigationBreadcrumbs basePath={basePath} />`
- Make the Back-button `onClick` target patient-aware: `navigate(patientId ? '/patients/${patientId}' : '/explorer/${resourceType}')`

### `src/components/explorer/NavigationBreadcrumbs.tsx` (prop added + render adapted)

One-line diff summary:
- Add optional `basePath?: string` prop (default `/explorer`)
- Derive `rootLabel` ("Patients" vs "Explorer") and `rootHref` ("/patients" vs "/explorer") from `basePath.startsWith('/patients/')` — `basePath` itself is never passed to `navigate()` (T-06-02 mitigation)

### Untouched (by design per plan's Do-NOT list)

- `src/hooks/useBreadcrumbTrail.ts` — primitive already supported `basePath` parameter since Phase 03
- `src/App.tsx` — route table unchanged
- `src/components/patients/MiiModuleTab.tsx`, `src/components/patients/FhirResourcesView.tsx` — producers already emit correct `/patients/:patientId/...` URLs

## Verification

| Check | Result |
|-------|--------|
| `npm test -- --run reference-navigation resource-detail` | ✓ 24/24 passed (6 new + 18 legacy scaffold) |
| `npm test` (full suite) | ✓ 280 passed, 22 todo, 3 skipped (zero regressions) |
| `npm run build` | ✗ pre-existing errors only (documented in `deferred-items.md`); `diff` of build output before/after shows zero new errors introduced by 06-01 |

## Deviations from Plan

**None — plan executed exactly as written.**

Minor scope-boundary observation: `npm run build` surfaced pre-existing TypeScript errors on files Plan 06-01 did not modify (and on one line that Plan 06-01 did touch but that error pre-existed on `main`). Per GSD scope-boundary rule, these are out of scope for 06-01. Logged in `.planning/phases/06-v1-gap-closure-patient-navigation/deferred-items.md` with `diff` evidence that 06-01 introduced zero new errors.

## Threat Model Application

Plan's `<threat_model>` threat dispositions:

| Threat ID | Disposition | Applied |
|-----------|-------------|---------|
| T-06-01 (Tampering — patientId from URL) | accept | No code change required — `patientId` is a path segment on router-controlled routes |
| T-06-02 (Tampering — basePath into navigate) | **mitigate** | Implementation uses `basePath.startsWith('/patients/')` check and constrains `rootHref` to one of two hardcoded literals. `basePath` itself is never passed to `navigate()`. Documented in inline JSDoc on `NavigationBreadcrumbs`. |
| T-06-03 (Info disclosure — cross-context leakage) | accept | Regression guards (Tests B, D, F) prevent silent reintroduction |
| T-06-04 (DoS — basePath recursion) | accept | basePath is computed synchronously once per render |
| T-06-05 (Elevation — malicious basePath injection) | accept | All call-sites in-repo; prop is optional with safe default |

## Threat Flags

_None — Plan 06-01 did not introduce new trust-boundary surfaces. Existing `FHIR_REFERENCE_PATTERN` / `FHIR_ID_PATTERN` guards on reference extraction remain intact and unchanged._

## Commits

| Task | Commit | Message |
|------|--------|---------|
| 1 | `e2db285` | test(06-01): add failing integration tests for patient-aware navigation |
| 2 | `e551f44` | feat(06-01): make ResourceDetailPage + NavigationBreadcrumbs patient-aware |

## Self-Check: PASSED

- `src/components/explorer/ResourceDetailPage.tsx` — FOUND
- `src/components/explorer/NavigationBreadcrumbs.tsx` — FOUND
- `src/__tests__/reference-navigation.test.tsx` — FOUND
- `src/__tests__/resource-detail.test.tsx` — FOUND
- `.planning/phases/06-v1-gap-closure-patient-navigation/deferred-items.md` — FOUND
- Commit `e2db285` — FOUND in `git log`
- Commit `e551f44` — FOUND in `git log`
- All 6 new tests assertive (verified via `grep -c "expect(true).toBe(true)"` against new test blocks — zero hits in the six new cases)
