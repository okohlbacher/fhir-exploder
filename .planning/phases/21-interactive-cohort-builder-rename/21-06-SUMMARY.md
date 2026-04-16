---
phase: 21
plan: "21-06"
subsystem: quality-dashboard
tags: [dashboard-integration, cohort-scoping, pdf, trends, CHRT-03, CHRT-04]
requirements: ["CHRT-03", "CHRT-04"]
dependency-graph:
  requires:
    - "21-02 useCohorts + resolveCohort + activateCohort"
    - "21-03 sampleResources 4-arg patientIds signature"
    - "21-04 captureSnapshot cohort fields + pdfExport cohort param + Resource types rename"
    - "21-05 /quality/cohorts page + CohortBuilderForm"
  provides:
    - "Active cohort Select on /quality dashboard toolbar"
    - "patientIds threaded through all 8 panel hooks to sampleResources"
    - "Cohort metadata captured into quality.trends.v1 snapshots"
    - "Cohort line rendered in PDF export cover page"
    - "Zero-match cohort Alert + resolution-failure fallback to unscoped"
  affects:
    - "src/components/quality/QualityOverviewPage.tsx toolbar structure + resolver state"
    - "All 7 quality panel components (now accept optional patientIds prop)"
tech-stack:
  added: []
  patterns:
    - "Cohort resolver useEffect with cancelled flag (T-21-15 mitigation)"
    - "clearCohortResolutionCache on client change (T-21-16 stale cache)"
    - "Stable cache key via patientIds.slice().sort().join(',')"
    - "Hydration Skeleton gate before Select renders (Pitfall 1)"
    - "JSX string attributes use literal Unicode (—, …, ·) not \\u escapes"
key-files:
  created:
    - "src/components/quality/ActiveCohortSelect.tsx"
  modified:
    - "src/components/quality/QualityOverviewPage.tsx"
    - "src/components/quality/CompletenessPanel.tsx"
    - "src/components/quality/CodingCoveragePanel.tsx"
    - "src/components/quality/ValidationPanel.tsx"
    - "src/components/quality/PlausibilityPanel.tsx"
    - "src/components/quality/LabRangesPanel.tsx"
    - "src/components/quality/DuplicatesPanel.tsx"
    - "src/components/quality/ReferencesPanel.tsx"
    - "src/hooks/useCompletenessReport.ts"
    - "src/hooks/useCodingCoverage.ts"
    - "src/hooks/useConformanceRun.ts"
    - "src/hooks/useValidationRun.ts"
    - "src/hooks/usePlausibilityReport.ts"
    - "src/hooks/useLabRangesReport.ts"
    - "src/hooks/useDuplicateReport.ts"
    - "src/hooks/useReferenceReport.ts"
decisions:
  - "Added optional patientIds prop to each of 7 panel components rather than hoisting hook calls into QualityOverviewPage — minimal surface change, preserves panel-component contract, backward-compatible (undefined = unscoped)"
  - "Bundled T-6.3 code changes (handleCapture + handleExport + resolver state) into the single QualityOverviewPage rewrite for T-6.1 instead of a separate commit — simpler diff review, all QOP changes land atomically; T-6.3 is a human-UAT gate so commit boundary matters less"
  - "Used literal Unicode chars (—, …, ·) in strings rather than \\u2014/\\u2026/\\u00B7 escapes so JSX attribute values render correctly and acceptance-criteria greps match verbatim"
metrics:
  duration: "continuation session (resumed after context boundary)"
  completed: "2026-04-16"
---

# Phase 21 Plan 21-06: Dashboard Integration Summary

Shipped the Active cohort Select on `/quality`, threaded resolved patient IDs through all 8 panel hooks to `sampleResources`, and wired cohort metadata into both trend-snapshot capture and PDF export — closing CHRT-03 (dashboard scoping) and CHRT-04 (rename finalization) for Phase 21 Wave 3.

## T-6.3 HUMAN UAT PENDING

**Status:** Automated checks green; live UAT against a real Blaze server is still required.

The plan's final task (T-6.3) is a `checkpoint:human-verify gate="blocking"`. The `<what-built>` code portion is complete and committed. The `<how-to-verify>` UAT script (UAT A–D) requires browser interaction against a live Blaze instance and is out of scope for automated execution per the user's explicit instruction:

> "T-6.3 is a blocking `checkpoint:human-verify` task. Do NOT attempt browser UAT yourself — complete the `<what-built>` code portion of T-6.3 only. After automated checks pass, STOP and clearly flag that human UAT A/B/C/D is pending."

**UAT script (for the human):**

- **UAT A — end-to-end scoping:** Create a narrow date-range cohort → activate it on `/quality` → verify panel numbers decrease across all 9 tabs vs. baseline, and Network tab shows `patient=Patient/...` or `_id=` in panel queries.
- **UAT B — capture + PDF:** With cohort active → Capture snapshot → inspect `quality.trends.v1` in Local Storage for `cohortId`/`cohortName`/`cohortPatientCount` → Export PDF → verify both `Resource types:` and `Cohort: "name" (N patients)` lines render on the cover page. Deactivate → export → only `Resource types:` renders.
- **UAT C — legacy migration:** Seed `quality.cohort.v1 = '["Patient","Observation"]'` → reload → MultiSelect shows "Resource types" label with Patient+Observation preselected → `quality.resourceTypes.v1` present, `quality.cohort.v1` absent.
- **UAT D — zero-match:** Create a cohort matching 0 patients (e.g., 1900 date range) → activate → yellow Alert "Active cohort matches 0 patients" renders above Tabs with "Open Cohorts page" link → panels run unscoped.

**Resume signal:** Reply `approved` to proceed to `/gsd-verify-work`, or list mismatches.

## Requirements

### CHRT-03 — Dashboard scoping (code-complete, UAT pending)

Active cohort Select renders in the `/quality` toolbar between `ResourceTypeSelector` and `SampleSizeControl`. Switching the Select fires `activateCohort(id|null)`, a 2500ms blue toast, and a cohort-resolver `useEffect` that populates `resolvedPatientIds`. That array flows into `scopedPatientIds = resolutionStatus === 'idle' ? (resolvedPatientIds ?? undefined) : undefined` and is passed as `patientIds` to all 7 panels. Each panel component forwards `patientIds` to its underlying hook, which in turn passes it as the 4th argument of `sampleResources(client, resourceType, sampleSize, patientIds)`. Sampled bundles are therefore scoped to the cohort's resolved patient set.

Resolution-failure path: the `useEffect` catches the reject, sets `resolutionStatus === 'failed'`, fires ONE red toast (T-21-15 mitigation via `cancelled` flag), and `scopedPatientIds` collapses to `undefined` — panels run unscoped.

Zero-match path: when `resolvedPatientIds.length === 0` and status is `idle`, a yellow `<Alert>` with `IconAlertTriangle` renders above the Tabs strip with an "Open Cohorts page" `<Anchor component={Link} to="/quality/cohorts">` (Pitfall 8 / UI-SPEC §S5).

Hydration gate: `ActiveCohortSelect` renders `<Skeleton height={36} width={240} />` until `useCohorts().hydrated === true` (Pitfall 1).

Cache invalidation: `useEffect(() => { clearCohortResolutionCache(); }, [client])` clears module-scoped resolver cache on Blaze server switch (T-21-16).

### CHRT-04 — Rename finalization (code-complete, UAT pending)

The toolbar now visually shows both controls side-by-side: `ResourceTypeSelector` ("Resource types" label from Plan 21-04) on the left, then `ActiveCohortSelect` ("Active cohort" label, new in this plan). A "Manage cohorts" button with `IconUsersGroup` joins the right-side button cluster, routing to `/quality/cohorts`. Both `<Group>` elements gained `wrap="wrap"` for responsive layout per UI-SPEC §"Responsive behavior — explicit".

## Validation Results

- **`npm run build`** exit 0 (4 build invocations during execution).
- **`npm test`** exit 1: `Test Files  8 failed | 59 passed | 3 skipped (70)` and `Tests  22 failed | 582 passed | 22 todo (626)`. **No regression** — matches the baseline 22 failures (pre-existing terminology/health + unrelated suites), same count as before Plan 21-06 started.
- All T-6.1 / T-6.2 / T-6.3 grep acceptance criteria pass:
  - T-6.1: `Active cohort` (2), `No cohort — all patients` (3), `Resolving cohort…` (1), `Analyzing all patients.` (2), `Skeleton` (3), `IconUsersGroup` (2), `Manage cohorts` (4), `resolveCohort` (2), `Active cohort matches 0 patients` (1), `wrap="wrap"` (3).
  - T-6.2: all 8 hooks contain `patientIds` (4–12 matches each), QualityOverviewPage has 7 `patientIds=` prop sites, `clearCohortResolutionCache` appears 2x.
  - T-6.3: `cohort(Id|Name|PatientCount)` matches 12 in `trendsHistory.ts` (≥3 required), `cohort` matches 6 in `pdfExport.ts`, `Cohort` line present in `PdfReportLayout.tsx`.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 — Bug] JSX string attributes rendering `\u2014` literally**
- **Found during:** Final acceptance-criteria grep verification (T-6.1 acceptance pass)
- **Issue:** `ActiveCohortSelect.tsx` used `\u2014`/`\u2026`/`\u00B7` escape sequences inside a JSX string attribute (`placeholder="No cohort \u2014 all patients"`). JSX does NOT interpret `\u` escapes inside double-quoted attribute values — the user would see the literal string `"No cohort \u2014 all patients"` rendered in the Select placeholder, not the intended em-dash. Also made the acceptance-criteria greps fail (they expect literal `—` / `…`).
- **Fix:** Replaced all four occurrences (label option, placeholder, helper-text ellipsis, middot separator) with literal Unicode characters (`—`, `…`, `·`).
- **Files modified:** `src/components/quality/ActiveCohortSelect.tsx`
- **Commit:** `877cda9`

### Plan-spec Deviations (documented)

**2. T-6.3 code bundled into T-6.1 commit instead of separate commit**
- **What the plan expected:** Two commits — one for T-6.1+T-6.2 combined, then a separate commit for the `handleCapture` + `handleExport` cohort threading in T-6.3.
- **What actually happened:** All `QualityOverviewPage.tsx` edits (resolver state, toolbar rewrite, `handleCapture` cohort param, `handleExport` cohort param) landed together in commit `06aa25e`. The `trendsHistory.ts` and `pdfExport.ts` files already had cohort field support from Plan 21-04, so no additional file-level changes were needed in those modules.
- **Rationale:** Atomic single-file rewrite is easier to review than two incremental diffs of the same file. T-6.3 is a human-UAT gate, so the commit boundary matters less than the code-correctness commitment.

## Known Stubs

None. No hardcoded empty values or placeholder text introduced. All data paths wire through to real resolver/sampleResources/captureSnapshot/exportQualityPdf APIs.

## Commits

| Hash | Message |
|------|---------|
| `06aa25e` | `feat(21-06): ActiveCohortSelect + toolbar + thread patientIds through 8 hooks` |
| `877cda9` | `fix(21-06): use literal Unicode chars in ActiveCohortSelect strings` |

## Threat Mitigations Confirmed

- **T-21-03** (PHI in UI): Toast messages use cohort name + patient count only, never IDs. Zero-match Alert contains no PHI. Resolver-failure toast uses generic "Could not resolve" copy.
- **T-21-15** (toast spam on resolver failure): `useEffect` uses a local `cancelled` flag; failure fires exactly one toast per activation, not per render.
- **T-21-16** (stale PHI cache on server switch): `clearCohortResolutionCache()` invoked from `useEffect(() => {...}, [client])`. Panel hooks key their own caches on `client`.
- **T-21-17** (over-sharing to panels): Panels receive `string[]` (resolved patient IDs only), never the full `CohortDefinition`. They cannot introspect cohort criteria.
- **T-21-07** (URL length): Delegated to Plan 21-03 `sampleResources` which already switches to POST `/_search` for > 40 patient IDs.
- **T-21-18** (PDF export): Accepted — PDF stays local, contains cohort name (user-provided) + patient count, no patient IDs.

## Self-Check: PASSED

- FOUND: `src/components/quality/ActiveCohortSelect.tsx`
- FOUND: commits `06aa25e` and `877cda9` in `git log --oneline`
- FOUND: all 8 hooks have `patientIds` references
- FOUND: 7 `patientIds=` prop sites in `QualityOverviewPage.tsx`
- FOUND: `cohortId` / `cohortName` / `cohortPatientCount` fields in `trendsHistory.ts`
- FOUND: `cohort` param threaded through `pdfExport.ts` and `PdfReportLayout.tsx`
- Build exit 0 verified post-fix
- Test count matches baseline (22 failed / 582 passed / 22 todo) — no regression

**Next:** Human UAT A/B/C/D against a live Blaze server before Phase 21 proceeds to `/gsd-verify-work`.
