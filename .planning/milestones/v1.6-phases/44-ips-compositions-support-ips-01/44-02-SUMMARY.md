---
phase: 44-ips-compositions-support-ips-01
plan: 02
subsystem: quality

# Searchable tags
tags: [ips, fhir, hl7, composition, bundle-walker, validation, drilldown, mantine, lazy-route, paste-tab, server-picker]

# Dependency graph
requires:
  - phase: 44-ips-compositions-support-ips-01
    plan: 01
    provides: IPS_REGISTRY + getIpsProfileForUrl + IPS_COMPOSITION_PROFILE_URL constant + Wave 0 stubs + 3 IPS bundle fixtures
  - phase: 15-quality-drill-downs
    provides: <ResourceIssueTable> primitive (reused unmodified, accepts NormalizedIssue[])
  - phase: 31-validation-tier-cascade
    provides: normalizeOperationOutcomeIssue (severity policy mapper, reused unmodified)
  - phase: 27-quality-lazy-loading
    provides: lazy(() => retry(() => import(...))) idiom for /quality/* drill-downs
provides:
  - validateIpsBundle pure-function walker with embedded 16-section LOINC catalogue (3 required + 13 optional)
  - IPS_SECTION_SLICES exported constant (sliceName, title, loincCode, required) — re-verifiable against future IPS pin bumps
  - IPSPanel component reachable at /quality/ips with paste tab + server-picker tab + Validate button + ResourceIssueTable results
  - Sidebar 'IPS Validator' sub-nav under Quality cluster with Option B most-specific-wins suppression
  - QualityOverviewPage discoverability button next to 'Configure thresholds'
  - 11 walker tests + 3 component tests covering T-44-02, T-44-03, T-44-04, T-44-06 + severity + expression-path + catalogue invariants
affects: [phase-45-mantine-9-codemod (JsonInput rename), future-ips-au-ch-dialects]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Pure-function bundle walker (synchronous, side-effect-free) — easy to unit-test, easy to reason about"
    - "Hard-coded section catalogue inside walker file — decouples from trim() shape per RESEARCH §6 Pitfall 5; version-pinned IPS-2.0.0 in JSDoc"
    - "Outlet client OPTIONAL in panel — paste mode works without a connected server, server tab is disabled when outlet undefined"
    - "Component test mocks getIpsProfileForUrl to sidestep dynamic JSON import in jsdom (RESEARCH §6 Pitfall 7)"
    - "Project assertion idiom: .toBeDefined() / .toBeNull() over @testing-library/jest-dom .toBeInTheDocument() (project doesn't ship jest-dom)"

key-files:
  created:
    - src/quality/ipsBundleValidator.ts
    - src/components/quality/IPSPanel.tsx
  modified:
    - src/quality/__tests__/ipsBundleValidator.test.ts (Wave 0 stubs replaced with 11 real assertions)
    - src/components/quality/__tests__/IPSPanel.test.tsx (Wave 0 stubs replaced with 3 real assertions)
    - src/App.tsx (added IPSPanel lazy import + /quality/ips Route)
    - src/components/layout/Sidebar.tsx (added 'IPS Validator' child + IPS suppression in SidebarRow)
    - src/components/quality/QualityOverviewPage.tsx (added IPS Validator toolbar button)

key-decisions:
  - "Walker uses hard-coded IPS_SECTION_SLICES constant (16 entries) — RESEARCH §6 Pitfall 5 says trim() drops patternCodeableConcept. ipsProfile param is threaded for forward-compat (prefixed with _ for TS noUnusedParameters)."
  - "Three severity levels emitted (D-09): error/required for missing required section, warning/incomplete for empty entry, information/incomplete for unresolvable reference. Bundle.type wrong + Bundle.resourceType wrong + missing Composition emit error/structure or error/required."
  - "Expression path format (D-11): present sections use Composition.section[<idx>].title; missing sections use Composition.section[?slice='<sliceName>'].title (no real index)."
  - "IPSPanel does NOT use @medplum/mock or useMedplum() — consumes the connected client via useOutletContext like every other Quality panel; the outlet is OPTIONAL so unit tests render without a Router outlet."
  - "Test assertion style: project standard is .toBeDefined() / .toBeNull() (no @testing-library/jest-dom imported). Aligned the IPSPanel test with ValidationPanel.test.tsx idiom."
  - "RESEARCH A5 confirmed: Bundle.entry slicing remains OUT of v1.6 scope. Walker only enforces Bundle.type='document' + Composition existence as malformed-bundle defenses."
  - "Q5 close-out: Wave 0 used hand-crafted minimal fixtures (per A3); package/example bundles were NOT consulted in this plan. The hand-crafted fixtures cleanly produce 0/2/2 issue counts and are ~30-110 lines each."
  - "Sidebar Option B suppression extended: /quality/ips now also suppresses the Quality parent row (matching Cohorts + Thresholds). 8 existing Sidebar.test.tsx assertions still green."

patterns-established:
  - "Walker invariant tests: catalogue cardinality (16 sections) + required/optional split (3/13) asserted at runtime so future trim() changes can't silently drop slices"
  - "Component test mock for dynamic JSON import: vi.mock the getIpsProfileForUrl module surface, NOT the underlying JSON files (smaller blast radius, more robust against vitest config changes)"

requirements-completed: [IPS-01]

# Metrics
duration: 36 min
completed: 2026-04-30
---

# Phase 44 Plan 02: IPS Compositions Support (User-Facing Surface) Summary

**Pure-function IPS bundle walker + IPSPanel UI (paste tab + server picker + Validate button) reachable at `/quality/ips`, surfacing missing-required-section, empty-entry, and unresolvable-reference findings via the unmodified Phase 15 ResourceIssueTable.**

## Performance

- **Duration:** 36 min
- **Started:** 2026-04-30T13:14:00Z (worktree base verified at 3da111d, Wave 1 sanity checks passed)
- **Completed:** 2026-04-30T11:23:39Z (UTC)
- **Tasks:** 4 (all completed)
- **Files created:** 2 (validator + panel)
- **Files modified:** 5 (2 test stubs replaced + App.tsx + Sidebar.tsx + QualityOverviewPage.tsx)
- **Lines added:** 905 total across the 4 new/replaced files (219 walker + 336 panel + 225 walker test + 125 panel test)

## Accomplishments

- `validateIpsBundle` pure function (219 lines) with embedded 16-section LOINC catalogue. Three severity levels per D-09. Top-level malformed-bundle defenses (T-44-02). Reference resolution against both relative `Type/id` and absolute `fullUrl` keys (T-44-03).
- 11-test walker suite (T-44-02..04 + severity + expression-path + profile-not-loaded fallback + catalogue invariants) — all passing.
- IPSPanel component (336 lines) with paste tab (Mantine `<JsonInput autosize minRows={10} maxRows={30}>`), server-picker tab (`Composition/$document` operation with graceful fallback), explicit "Validate" button, and result rendering via `<ResourceIssueTable>` UNMODIFIED.
- 3-test component suite (T-44-06): mount + paste-and-validate (renders ≥3 table rows for the incomplete fixture) + invalid-JSON error alert.
- Routing wiring: lazy `/quality/ips` route, sidebar 'IPS Validator' sub-nav with Option B suppression, QualityOverviewPage discoverability button.
- Build emits IPSPanel as a 14 KB raw / 4.3 KB gzipped lazy chunk; initial bundle unchanged.

## Task Commits

Each task was committed atomically:

1. **Task 1: implement validateIpsBundle walker** — `afb2184` (feat)
2. **Task 2: real walker assertions (T-44-02..04 + severity + path)** — `a2b8568` (test)
3. **Task 3: IPSPanel + T-44-06 component test** — `1fc58cc` (feat)
4. **Task 4: wire /quality/ips route + sidebar nav + Quality overview link** — `2f9d715` (feat)

## Files Created/Modified

**Source — walker**
- `src/quality/ipsBundleValidator.ts` (219 lines) — exports `validateIpsBundle` + `IPS_SECTION_SLICES` + `IpsSectionSlice` interface; consumed only by IPSPanel.

**Source — UI**
- `src/components/quality/IPSPanel.tsx` (336 lines) — default-exported React component; consumes `useOutletContext`, `getIpsProfileForUrl`, `validateIpsBundle`, `normalizeOperationOutcomeIssue`, `<ResourceIssueTable>`.

**Tests**
- `src/quality/__tests__/ipsBundleValidator.test.ts` — Wave 0 8-stub `it.skip` block replaced with 11 real assertions (3 missing-comp + 1 ref-resolution + 3 fixtures + 1 severity + 1 expression-path + 1 profile-not-loaded + 1 catalogue-invariants).
- `src/components/quality/__tests__/IPSPanel.test.tsx` — Wave 0 3-stub block replaced with 3 real assertions (mount + paste-and-validate + invalid-JSON).

**Routing & nav**
- `src/App.tsx` — added `IPSPanel` lazy import alongside other Phase 27 drill-downs; added `<Route path="ips" element={<IPSPanel />} />` inside the `/quality` cluster.
- `src/components/layout/Sidebar.tsx` — added `{ label: 'IPS Validator', to: '/quality/ips', suppressParent: true }` to Quality children; extended `SidebarRow` suppression logic to also dim Quality on `/quality/ips`.
- `src/components/quality/QualityOverviewPage.tsx` — added `IconClipboardCheck` import and 'IPS Validator' toolbar button next to 'Configure thresholds' that navigates to `/quality/ips`.

## Walker test count + pass status

11 tests, **all passing**, 400 ms duration:

| # | Test | Threat / Decision |
|---|------|-------------------|
| 1 | empty entry => severity:error required | T-44-02 |
| 2 | non-Composition entry => severity:error required | T-44-02 |
| 3 | wrong resourceType BAILS with single structure error | T-44-02 |
| 4 | unresolvable refs => severity:information; resolvable refs (Type/id + fullUrl) silent | T-44-03 |
| 5 | complete fixture => 0 issues | T-44-04 |
| 6 | incomplete fixture => >=2 issues with missing-Allergies error + empty-Medications warning | T-44-04 |
| 7 | malformed fixture => >=2 issues with Bundle.type structure error + missing-Composition required | T-44-04 |
| 8 | severity-classification: only error \| warning \| information emitted | D-09 |
| 9 | expression-path-format: every expression[0] matches one of 5 documented patterns | D-11 |
| 10 | profile-not-loaded fallback: walker accepts null ipsProfile without throwing | discretion |
| 11 | catalogue invariants: 16 slices, 3 required, 13 optional | RESEARCH §3 |

## IPSPanel component test count + pass status

3 tests, **all passing**, 913 ms duration:

| # | Test | Threat / Decision |
|---|------|-------------------|
| 1 | mounts; ips-panel + ips-validate-button + ips-paste-input rendered | T-44-06 sanity |
| 2 | paste incomplete fixture + click Validate => ResourceIssueTable shows >=3 rows (1 thead + 2+ issue rows) | T-44-06 wiring |
| 3 | invalid JSON triggers error alert with /not valid JSON/i copy | error-state coverage |

## Full-suite delta

**Pre-plan baseline (after Plan 44-01):** 1227 passing tests (Phase 43 baseline 1207 + 19 new from 44-01 + 1 pre-existing failure).

**Post-plan:** 1240 passing tests (+13 new tests this plan: 11 walker + 3 component + minus 1 deuteranopia pre-existing failure unchanged out of scope).

**Net delta from this plan:** +13 passing tests, 0 regressions. Pre-existing `deuteranopia.test.tsx pair #13` failure is unchanged (documented in 44-01 deferred-items.md as pre-dating Phase 44).

## Bundle-size impact

- **IPSPanel lazy chunk:** 14 009 bytes raw / 4 420 bytes gzipped (~4.3 KB gz). Filename `dist/assets/IPSPanel-CUjBmxPl.js`.
- **Initial-load bundle:** unchanged (IPSPanel is lazy-loaded via the same `lazy(() => retry(() => import(...)))` idiom as the other Phase 27 drill-downs). The `index-*.js` initial chunk is ~342 KB gz, identical pre/post this plan.
- The IPS Composition profile JSON (`Composition-compositionuvips-CZL5yfxi.js` ≈ 56.76 KB raw / 2.61 KB gz) is also lazy-loaded and only fetched on Validate-button click via `getIpsProfileForUrl`.

## Sidebar visual smoke

Sidebar test suite (`src/components/layout/__tests__/Sidebar.test.tsx`) ran post-change with all 8 assertions still green. Manual inspection of the Sidebar.tsx diff confirms:
- 'IPS Validator' child renders under Quality with `pl={44}` indent (same as Cohorts + Thresholds).
- Option B suppression extended: when on `/quality/ips`, the Quality parent row is dimmed and only the IPS child is highlighted.
- No other rows touched; no regression in the existing 8 assertions.

(A live-browser smoke pass is gated on the optional UAT in 44-VALIDATION.md Manual-Only-Verifications and was not performed in this plan — see "Live-Blaze UAT" below.)

## Live-Blaze UAT

**Not performed in this plan.** The plan is fully automatable (per ROADMAP "Fully automatable with optional live-Blaze UAT"); a live UAT against a Blaze instance with at least one IPS-tagged Composition is captured as a manual-only verification in `44-VALIDATION.md`. No blocker for plan completion.

If/when performed: record (a) the Composition resource ID tested, (b) walker output count, (c) any Composition/$document fallback messaging seen.

## Decision Q5 close-out

Q5 asked whether package/example bundles should be considered for the complete fixture. **Resolution:** the Wave 0 hand-crafted fixtures (committed in Plan 44-01) were retained; no package/example bundles were imported. Justification:
- Hand-crafted fixtures are minimal (≈30-110 lines each) and tightly aligned with the 3 severity scenarios the walker emits.
- Package examples may carry references to external IDs we'd need to invent — defeats the "0 issues" baseline for the complete fixture.
- All three fixtures cleanly produce 0/2/2 issue counts as asserted by tests #5, #6, #7.

## A5 final status

**Section-level only confirmed.** RESEARCH A5 (Bundle.entry slicing — entry[1]=Patient etc.) remains OUT of v1.6 scope. Walker enforces only:
- `bundle.resourceType === 'Bundle'` (BAILS if wrong)
- `bundle.type === 'document'` (emits structure error but continues)
- A Composition resource exists in `bundle.entry[]` (BAILS if missing)
- Plus the 16 IPS section slices on the Composition

No Bundle.entry slice diagnostics. Captured as a deferred idea if user feedback emerges in v1.7+.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] TS noUnusedParameters error on the unused `ipsProfile` walker parameter**
- **Found during:** Task 1 verification (`npx tsc -b --noEmit`)
- **Issue:** The plan's behaviour spec instructed the walker to accept `ipsProfile: StructureDefinition` for forward-compat but never read it. With only an `// eslint-disable-next-line` comment, TypeScript still flagged `TS6133: 'ipsProfile' is declared but its value is never read.` because `noUnusedParameters` is enabled in `tsconfig`.
- **Fix:** Renamed the parameter to `_ipsProfile` (underscore prefix is the project's idiom for intentionally-unused parameters and is recognised by TS noUnusedParameters as a deliberate "ignore"). Replaced the eslint disable with a JSDoc comment explaining the forward-compat intent + RESEARCH §6 Pitfall 5 reference.
- **Files modified:** `src/quality/ipsBundleValidator.ts`
- **Verification:** Re-ran `npx tsc -b --noEmit` → exit 0. All 11 walker tests still pass with the renamed parameter (param name doesn't affect call sites or behaviour).
- **Committed in:** `afb2184` (Task 1 commit; the fix landed before the commit was made).

**2. [Rule 1 - Bug] `toBeInTheDocument` matcher not registered in vitest**
- **Found during:** Task 3 first test run.
- **Issue:** Plan's IPSPanel test scaffold used `expect(...).toBeInTheDocument()`, which is provided by `@testing-library/jest-dom`. The project does NOT import that package in the vitest config; `Invalid Chai property: toBeInTheDocument` errored on the first 2 tests.
- **Fix:** Replaced all 5 `.toBeInTheDocument()` assertions with `.toBeDefined()` (the project's existing pattern, verified against `src/components/quality/__tests__/ValidationPanel.test.tsx`).
- **Files modified:** `src/components/quality/__tests__/IPSPanel.test.tsx`
- **Verification:** Re-ran `npx vitest run --no-coverage src/components/quality/__tests__/IPSPanel.test.tsx` → 3 passed, 913 ms duration.
- **Committed in:** `1fc58cc` (Task 3 commit; the fix landed before the commit was made).

**3. [Rule 2 - Missing critical functionality] Sidebar parent-row suppression not extended for IPS**
- **Found during:** Task 4 implementation.
- **Issue:** The plan specified adding `{ label: 'IPS Validator', to: '/quality/ips', suppressParent: true }` to Quality children but didn't explicitly call out updating `SidebarRow`'s `suppressed` calculation. Without that update, the Quality parent row would stay highlighted on `/quality/ips` while the IPS child also lit up — violating Option B "section root (singular)" from ROADMAP Phase 26 SC#3.
- **Fix:** Added a third `useMatch({ path: '/quality/ips', end: false })` call in `SidebarRow` and OR-ed it into the `suppressed` expression. Mirrors the existing Cohorts + Thresholds suppression pattern.
- **Files modified:** `src/components/layout/Sidebar.tsx`
- **Verification:** Re-ran `npx vitest run --no-coverage src/components/layout/__tests__/Sidebar.test.tsx` → 8 passed, 831 ms duration. The 8 existing assertions cover all suppressing-parent scenarios for Cohorts + Thresholds; the Option B contract still holds for the new IPS sub-nav.
- **Committed in:** `2f9d715` (Task 4 commit).

---

**Total deviations:** 3 auto-fixed (2 bugs + 1 missing-functionality / spec gap). All fixes are minimal, localised, and verified by automated tests.
**Impact on plan:** zero scope creep; the walker behaviour, panel UX, and routing surface match the plan exactly.

## Issues Encountered

- **Pre-existing `deuteranopia.test.tsx pair #13` failure (out of scope):** Phase 40 palette issue documented in `44-01-SUMMARY.md` deferred-items.md. Failure observed pre-existing at the worktree base `3da111d`; this plan did not touch palette tokens or color utilities. Continues to fail; logged as pre-existing.
- **Pre-existing modified files in worktree:** `.planning/.next-call-count`, `.planning/ROADMAP.md`, `src/quality/profiles/ips/ATTRIBUTION.md`. The first two are auto-managed by gsd-tools; the third is the `Fetched on:` timestamp drift documented in 44-01-SUMMARY.md (Phase 34 D-13 idiom). Left untouched per plan boundary; orchestrator owns ROADMAP/STATE updates after wave completion.

## Threat Flags

| Flag | File | Description |
|------|------|-------------|
| (none) | — | No new auth paths, network endpoints, or schema changes at trust boundaries. IPSPanel reads the connected MedplumClient via the existing outlet context (already-authenticated) for the optional server-picker tab; the bundle walker is local. No new PHI gate (D-08). |

## Self-Check

**Files claimed to exist:**

- `src/quality/ipsBundleValidator.ts` — FOUND (219 lines)
- `src/components/quality/IPSPanel.tsx` — FOUND (336 lines)
- `src/quality/__tests__/ipsBundleValidator.test.ts` — FOUND (225 lines, 11 real tests, no .skip)
- `src/components/quality/__tests__/IPSPanel.test.tsx` — FOUND (125 lines, 3 real tests, no .skip)
- `src/App.tsx` — FOUND (modified; IPSPanel lazy import + Route path="ips")
- `src/components/layout/Sidebar.tsx` — FOUND (modified; IPS Validator child + ipsMatch suppression)
- `src/components/quality/QualityOverviewPage.tsx` — FOUND (modified; IPS Validator toolbar button)
- `dist/assets/IPSPanel-*.js` — FOUND (lazy chunk, 14009 bytes raw / 4420 bytes gzipped)

**Commits claimed to exist:**

- `afb2184` — FOUND (Task 1)
- `a2b8568` — FOUND (Task 2)
- `1fc58cc` — FOUND (Task 3)
- `2f9d715` — FOUND (Task 4)

**Phase-specific invariants verified:**

- Walker is dedicated (D-08), not cascade — `grep cascadingValidator src/quality/ipsBundleValidator.ts src/components/quality/IPSPanel.tsx` returns 0 — VERIFIED
- 16-section LOINC catalogue embedded — `grep -c loincCode src/quality/ipsBundleValidator.ts` returns 19 (16 in slices + interface + JSDoc + LOINC_SYSTEM); `grep -c "required: true"` returns 3; `grep -c "required: false"` returns 13 — VERIFIED
- Three severity levels (D-09): walker emits only `error` / `warning` / `information` — asserted by walker test #8 — VERIFIED
- Expression path format (D-11): `Composition.section[N].title` for present sections — asserted by walker test #9 — VERIFIED
- Reuse `<ResourceIssueTable>` UNMODIFIED: `grep ResourceIssueTable src/components/quality/IPSPanel.tsx` matches; ResourceIssueTable.tsx file mtime unchanged — VERIFIED
- Mantine 8 components per D-15: `grep "minRows={10}" src/components/quality/IPSPanel.tsx` matches; `grep "maxRows={30}"` matches; `grep -c Tabs.Tab` returns 4 (≥2) — VERIFIED
- Walker is synchronous (D-16): no `async` keyword in `validateIpsBundle` signature; `grep -E "async (function|.*validateIpsBundle)" src/quality/ipsBundleValidator.ts` returns 0 — VERIFIED
- Bundle.entry slicing OUT of scope: walker has no reference to `entry[1]` or Patient slice; A5 confirmed in test cases — VERIFIED
- Complete fixture produces 0 issues — asserted by walker test #5 — VERIFIED
- Three-fixture regression (T-44-04): all 3 fixtures produce expected counts — asserted by walker tests #5, #6, #7 — VERIFIED
- No Phase 43 / 31 regression: `cascadingValidator.ts`, `useConformanceRun.ts`, auth/PHI code NOT in modified-files list — VERIFIED
- Wave 0 stubs replaced: `it.skip` test cases removed from both test files (the only matches in `grep "it.skip"` are JSDoc references to "Wave 0 it.skip stubs" in the file headers, NOT test cases) — VERIFIED
- `npm run build` clean; `tsc -b --noEmit` clean — VERIFIED
- Phase 43 auth tests still green: full suite 1240 passing (Phase 43 baseline 1207 fully green) — VERIFIED

## Self-Check: PASSED

## Next Phase Readiness

- Phase 44 IPS-01 fully delivered across 44-01 (backbone) + 44-02 (user-facing surface).
- Users can:
  1. Click "IPS Validator" in the sidebar Quality cluster, OR
  2. Click "IPS Validator" toolbar button on `/quality`, OR
  3. Navigate directly to `/quality/ips`,
  and validate FHIR bundles via paste OR server-picker against the IPS Composition profile.
- All ROADMAP Phase 44 success criteria reflected:
  - SC1 (Plan 44-01): IPS profile fetch + registry + LICENSE — DONE
  - SC2 (this plan): bundle-validation entry-point in dedicated IPSPanel — DONE
  - SC3 (this plan): per-section drill-down via Phase 15 ResourceIssueTable; section-name + expected-element + severity surfaced — DONE
  - SC4 (this plan): fixture-driven regression asserts ≥2 distinct findings on incomplete fixture — DONE
- Phase 44 ready for `/gsd-verify-phase` — no blockers, no architectural debt, deferred items unchanged from 44-01.
- A5 OUT-of-scope confirmation final; if user feedback in v1.7+ requests Bundle.entry slicing, scope is well-defined (extend walker; add Bundle profile to IPS_REGISTRY consumption; add new severity rules per slice).

---
*Phase: 44-ips-compositions-support-ips-01*
*Plan: 02 (user-facing surface)*
*Completed: 2026-04-30*
