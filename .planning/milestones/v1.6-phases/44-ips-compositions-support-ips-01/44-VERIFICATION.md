---
phase: 44-ips-compositions-support-ips-01
verified: 2026-04-30T13:35:00Z
status: human_needed
score: 9/9 must-haves verified
overrides_applied: 0
human_verification:
  - test: "Open /quality/ips, switch to 'Select from Server' tab, select a Composition from a live Blaze instance, click Validate, confirm ResourceIssueTable renders findings"
    expected: "Composition/$document is fetched; walker runs; per-section findings render in the issue table; no crash or blank screen"
    why_human: "Requires a live connected Blaze server with at least one IPS-tagged Composition resource. MockClient test covers the wire shape but not Blaze-specific $document operation quirks."
  - test: "Paste a bundle >=500 KB (large real-world IPS bundle) into the JsonInput and click Validate"
    expected: "UI does not freeze for more than ~250 ms; results render; no stack overflow"
    why_human: "Synchronous walker on very large bundles may show perceptible UI lag — only reproducible with real-world bundle sizes, not detectable via unit tests."
---

# Phase 44: IPS Compositions Support Verification Report

**Phase Goal:** Validate FHIR resource bundles against the IPS Composition profile so users can audit IPS conformance and see Empty-Sections-and-Missing-Data patterns in the existing drill-down chrome.
**Verified:** 2026-04-30T13:35:00Z
**Status:** human_needed
**Re-verification:** No — initial verification

## Goal Achievement

### Observable Truths

| # | Truth | Status | Evidence |
|---|-------|--------|----------|
| 1 | `scripts/fetch-ips-profiles.mjs` exists pinning `hl7.fhir.uv.ips@2.0.0`; `IPS_REGISTRY` URL-keyed lazy-load mounted at `src/quality/profiles/ips/index.ts`; LICENSE updated for IPS attribution | VERIFIED | File exists; grep confirms `['hl7.fhir.uv.ips', '2.0.0']` in fetcher; `export const IPS_REGISTRY` in index.ts; LICENSE contains `hl7.fhir.uv.ips`, `CC0-1.0`, `2.0.0` |
| 2 | `IPSPanel.tsx` reachable from `/quality/ips`; user can paste bundle OR select Composition from server; validator runs and surfaces issues classified by section | VERIFIED | `<Route path="ips" element={<IPSPanel />} />` in App.tsx; Mantine `<Tabs>` with paste + server tabs; `handleValidate` calls `validateIpsBundle` and feeds `<ResourceIssueTable>` |
| 3 | Per-section drill-down reuses Phase 15's `ResourceIssueTable` UNCHANGED; section name + expected element + severity render; click-through wired via `resourceRef` | VERIFIED | `ResourceIssueTable.tsx` last modified in Phase 43 (4b33ca1); IPSPanel imports it unmodified; `normalizeOperationOutcomeIssue` threads `resourceRef` for click-through |
| 4 | Fixture `ips-bundle-incomplete.json` triggers >=2 distinct empty-section findings; full suite passes (1240+ passing) | VERIFIED | Walker test #6 asserts incomplete fixture produces >=2 issues with Allergies error + Medications warning; full suite: 1240 passing / 1 pre-existing deuteranopia failure (documented) |
| 5 | Walker is DEDICATED — `ipsBundleValidator.ts` does NOT import `cascadingValidator` | VERIFIED | `grep cascadingValidator src/quality/ipsBundleValidator.ts src/components/quality/IPSPanel.tsx` returns 0 matches |
| 6 | Walker bounds: 16-section LOINC catalogue (3 required + 13 optional) | VERIFIED | `grep -c "loincCode"` returns 19 (16 slice entries + interface + JSDoc + LOINC_SYSTEM const); `grep -c "required: true"` = 3; `grep -c "required: false"` = 13; catalogue invariants test asserts 16/3/13 |
| 7 | Three severity levels (error/warning/information) per D-09; section path expression format `Composition.section[N].title` per D-11 | VERIFIED | Walker test #8 (severity-classification) pins only `error|warning|information`; test #9 (expression-path-format) asserts each issue expression matches one of 5 documented patterns via regex |
| 8 | `<ResourceIssueTable>` UNMODIFIED; walker is synchronous (no async/await); Phase 36 lazy-load pattern preserved in `getIpsProfileForUrl` | VERIFIED | `validateIpsBundle` signature is `export function` (no `async`); `getIpsProfileForUrl.ts` uses module-scoped Map cache + in-flight Promise sharing identical to Phase 36 |
| 9 | No Phase 43 auth-path regression; `cascadingValidator.test.ts` baseline green | VERIFIED | `cascadingValidator.ts` last touched at Phase 43 commit `4b33ca1`; full suite 1240 passing includes all Phase 43 auth tests |

**Score:** 9/9 truths verified

### Required Artifacts

| Artifact | Expected | Status | Details |
|----------|----------|--------|---------|
| `scripts/fetch-ips-profiles.mjs` | IPS package fetch + trim + write pipeline | VERIFIED | Exists; pins `hl7.fhir.uv.ips@2.0.0`; imports `from './lib/trim-profile.mjs'` |
| `scripts/lib/trim-profile.mjs` | Shared trim() function (DRY) | VERIFIED | Exists; imported by both `fetch-ips-profiles.mjs` and `fetch-mii-profiles.mjs` |
| `src/quality/profiles/ips/index.ts` | `IPS_REGISTRY` URL-keyed lazy thunks | VERIFIED | Exports `IPS_REGISTRY: Record<string, LazyProfile>` with Composition-uv-ips URL keyed |
| `src/quality/profiles/ips/getIpsProfileForUrl.ts` | Lazy-load + cache + in-flight share helper | VERIFIED | Exports `getIpsProfileForUrl` + `IPS_COMPOSITION_PROFILE_URL`; Phase 36 pattern |
| `src/quality/profiles/ips/ATTRIBUTION.md` | HL7 IPS attribution metadata | VERIFIED | Exists; contains `hl7.fhir.uv.ips` and version pin |
| `src/quality/profiles/ips/Composition-compositionuvips.json` | Trimmed IPS Composition SD | VERIFIED | Exists; lazy-loaded via IPS_REGISTRY |
| `LICENSE` | Root license + IPS attribution section | VERIFIED | Contains `hl7.fhir.uv.ips`, `CC0-1.0`, `2.0.0` |
| `src/quality/ipsBundleValidator.ts` | Pure-function bundle walker | VERIFIED | 219 lines; exports `validateIpsBundle` + `IPS_SECTION_SLICES`; synchronous; dedicated (no cascade import) |
| `src/components/quality/IPSPanel.tsx` | `/quality/ips` panel UI | VERIFIED | 336 lines; paste tab + server-picker tab + Validate button + ResourceIssueTable results |
| `src/quality/__tests__/ipsBundleValidator.test.ts` | Walker test suite (>=8 cases) | VERIFIED | 11 real assertions (no `it.skip` test cases); covers T-44-02..04 + severity + expression-path + catalogue |
| `src/components/quality/__tests__/IPSPanel.test.tsx` | Component test (>=3 cases) | VERIFIED | 3 real assertions (no `it.skip` test cases); mount + paste-validate + invalid-JSON error |
| `src/quality/__tests__/fixtures/ips/ips-bundle-complete.json` | Complete IPS bundle fixture | VERIFIED | Exists; walker test #5 asserts 0 issues |
| `src/quality/__tests__/fixtures/ips/ips-bundle-incomplete.json` | Incomplete IPS bundle fixture | VERIFIED | Exists; walker test #6 asserts >=2 issues (Allergies error + Medications warning) |
| `src/quality/__tests__/fixtures/ips/ips-bundle-malformed.json` | Malformed bundle fixture | VERIFIED | Exists; walker test #7 asserts >=2 issues (Bundle.type structure + Bundle.entry required) |

### Key Link Verification

| From | To | Via | Status | Details |
|------|----|-----|--------|---------|
| `package.json prepare` | `scripts/fetch-ips-profiles.mjs` | `node scripts/fetch-ips-profiles.mjs \|\| true` | WIRED | Confirmed in package.json; semicolon-chained; `\|\| true` escape preserved |
| `scripts/fetch-ips-profiles.mjs` | `scripts/lib/trim-profile.mjs` | `import { trim } from './lib/trim-profile.mjs'` | WIRED | Pattern confirmed in fetcher |
| `src/quality/profiles/ips/getIpsProfileForUrl.ts` | `src/quality/profiles/ips/index.ts` | `import { IPS_REGISTRY } from './index'` | WIRED | IPS_REGISTRY is imported and used in the lazy-load resolver |
| `src/components/quality/IPSPanel.tsx` | `src/quality/ipsBundleValidator.ts` | `import { validateIpsBundle }` | WIRED | Import present; `validateIpsBundle(bundle, profile)` called in `handleValidate` |
| `src/components/quality/IPSPanel.tsx` | `src/quality/profiles/ips/getIpsProfileForUrl.ts` | `import { getIpsProfileForUrl, IPS_COMPOSITION_PROFILE_URL }` | WIRED | Both symbols imported and used in `handleValidate` |
| `src/components/quality/IPSPanel.tsx` | `src/components/quality/ResourceIssueTable.tsx` | `import { ResourceIssueTable } from './ResourceIssueTable'` | WIRED | Import present; `<ResourceIssueTable issues={run.issues} />` rendered on complete status |
| `src/components/quality/IPSPanel.tsx` | `src/quality/normalizers.ts` | `import { normalizeOperationOutcomeIssue }` | WIRED | Import present; called to map raw `OperationOutcomeIssue[]` to `NormalizedIssue[]` |
| `src/App.tsx` | `src/components/quality/IPSPanel.tsx` | `lazy(() => retry(() => import('./components/quality/IPSPanel')))` + `<Route path="ips">` | WIRED | Both lazy import and route element confirmed |
| `src/components/layout/Sidebar.tsx` | `/quality/ips` | `{ label: 'IPS Validator', to: '/quality/ips', suppressParent: true }` | WIRED | Entry present; `ipsMatch` suppression logic added to `SidebarRow` |
| `src/components/quality/QualityOverviewPage.tsx` | `/quality/ips` | `onClick={() => navigate('/quality/ips')}` on 'IPS Validator' button | WIRED | Discoverability button confirmed in QualityOverviewPage |

### Data-Flow Trace (Level 4)

| Artifact | Data Variable | Source | Produces Real Data | Status |
|----------|---------------|--------|--------------------|--------|
| `IPSPanel.tsx` | `run.issues` (NormalizedIssue[]) | `validateIpsBundle(bundle, profile)` → `normalizeOperationOutcomeIssue` → `setRun({ status: 'complete', issues: normalized })` | Yes — walker computes issues from real bundle entries against IPS_SECTION_SLICES catalogue | FLOWING |
| `IPSPanel.tsx` paste path | `bundle` (Bundle) | `JSON.parse(pasteValue)` from user input | Yes — real user-pasted JSON | FLOWING |
| `IPSPanel.tsx` server path | `bundle` (Bundle) | `medplum.get('Composition/${id}/$document')` | Yes — live FHIR server call (requires live Blaze; mocked in tests) | FLOWING (manual UAT needed for live path) |

### Behavioral Spot-Checks

| Behavior | Command | Result | Status |
|----------|---------|--------|--------|
| Walker test suite: 11 tests covering T-44-02..04 + severity + expression-path + catalogue | `npx vitest run --no-coverage src/quality/__tests__/ipsBundleValidator.test.ts` | 11 passed (399ms) | PASS |
| IPSPanel component test suite: 3 tests covering mount + paste-validate + error state | `npx vitest run --no-coverage src/components/quality/__tests__/IPSPanel.test.tsx` | 3 passed (913ms) | PASS |
| Combined IPS test suite | both targets together | 14 passed (907ms) | PASS |
| Full vitest suite | `npm test` | 1240 passing / 1 failed (pre-existing deuteranopia pair #13, Phase 40 scope, documented) | PASS |
| TypeScript compilation | `npx tsc -b --noEmit` | exit 0, no output | PASS |
| Validate walker does not import cascadingValidator | `grep cascadingValidator ipsBundleValidator.ts IPSPanel.tsx` | 0 matches | PASS |
| Walker is synchronous | `grep "^export async function validateIpsBundle" ipsBundleValidator.ts` | 0 matches | PASS |

### Requirements Coverage

| Requirement | Source Plan | Description | Status | Evidence |
|-------------|------------|-------------|--------|----------|
| IPS-01 | 44-01, 44-02 | User can validate a FHIR resource bundle against the IPS Composition profile and see OperationOutcome issues for "Empty Sections and Missing Data" patterns. Per-section drill-down reuses Phase 15 ResourceIssueTable. | SATISFIED | Walker + IPSPanel + route + sidebar all delivered; three-fixture regression locks the contract; 14 IPS-specific tests passing |

### Anti-Patterns Found

| File | Line | Pattern | Severity | Impact |
|------|------|---------|----------|--------|
| `src/components/quality/IPSPanel.tsx` | ~139 | `handleValidate` captures `activeTab` before async awaits — stale tab can drive wrong path if user switches tabs during in-flight profile load | Warning (WR-01 from 44-REVIEW.md) | Non-blocking UX race condition; requires deliberate user action during the ~50ms profile load window; auto-fix is adding a cancellation ref |

No MISSING, STUB, or PLACEHOLDER patterns found. All `it.skip` occurrences in test files are JSDoc references to "Wave 0 it.skip stubs" in comments only — not active test skips.

### Human Verification Required

#### 1. Live-Blaze server picker mode

**Test:** Connect the app to a Blaze instance that has at least one IPS-tagged Composition resource. Open `/quality/ips`. Switch to the "Select from Server" tab. Select the Composition from the dropdown. Click Validate. Observe whether findings render in the ResourceIssueTable.
**Expected:** `Composition/$document` returns a Bundle; walker emits per-section findings; ResourceIssueTable shows rows with severity/section-name/expression columns populated. If `$document` is not implemented on the server, the error alert "Server did not return a bundle..." appears (graceful fallback path).
**Why human:** Requires a real connected Blaze server with at least one Composition resource. The mock client test (`MockClient`) covers the component wire shape, but Blaze-specific `$document` operation support, search parameter syntax, and CORS behavior cannot be verified programmatically.

#### 2. Large-bundle performance

**Test:** Locate or generate a real-world IPS bundle of 500 KB or more. Paste its JSON content into the JsonInput and click Validate.
**Expected:** UI does not visibly freeze for more than ~250 ms. Results render. No stack overflow or browser crash.
**Why human:** The walker is intentionally synchronous (D-16). Large bundles block the JS thread. Performance impact is only observable with real-world data at scale and requires subjective UI responsiveness assessment that cannot be captured by unit tests.

### Gaps Summary

No gaps found. All 9 phase-specific must-haves are met by the codebase. The two human verification items are operational confirmations (live-server integration, large-bundle perf) documented in `44-VALIDATION.md` as "Manual-Only Verifications" — they are not blockers for the automated goal achievement.

---

_Verified: 2026-04-30T13:35:00Z_
_Verifier: Claude (gsd-verifier)_
