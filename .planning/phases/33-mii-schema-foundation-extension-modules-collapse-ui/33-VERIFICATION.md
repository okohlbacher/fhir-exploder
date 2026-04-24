---
phase: 33-mii-schema-foundation-extension-modules-collapse-ui
verified: 2026-04-24T13:42:00Z
status: human_needed
score: 8/8 must-haves verified
overrides_applied: 0
human_verification:
  - test: "Live Synthea patient → Laborbefund tab only lab Observations (extraQuery URL append)"
    expected: "Opening a Synthea patient and clicking the Laborbefund tab shows only FHIR Observation entries with category=laboratory (no social-history, vital-signs, or survey leakage). Before the plan-33-01 fix the tab showed ~25% non-lab leakage."
    why_human: "Requires running the dev server against live Blaze + Synthea bundle. Unit tests lock the URL construction but do not render real FHIR responses."
  - test: "Timeline color + German label for all 4 TIMELINE_RESOURCE_TYPES"
    expected: "Patient detail → Zeitleiste tab renders Conditions labelled 'Diagnose' (teal border-left + teal badge), Encounters labelled 'Fall' (indigo), Procedures labelled 'Prozedur' (violet), Observations labelled 'Laborbefund' (cyan). Visual color tokens must match."
    why_human: "CSS color-token rendering + visual badge appearance cannot be verified by jsdom test — only by browser smoke."
  - test: "Dashboard MII heading reads unambiguous scope"
    expected: "Dashboard MII section shows the heading 'MII Kerndatensatz · Server-wide totals' so users cannot misinterpret the counts as per-patient. Visual typography + middle-dot separator should render correctly."
    why_human: "UAT-FU-04 closure depends on user-facing legibility of the scope label. Visual-only verification."
  - test: "Dashboard tile click opens Drawer (not navigate) — visual UX check"
    expected: "Clicking any of the 7 base MII tiles opens a right-edge Drawer (not a navigation to /patients). Drawer shows German label + FHIR resource type(s) + server-wide count + 'Open in Explorer' button. Clicking 'Open in Explorer' navigates to /explorer/<primary-type> and closes the Drawer. No new network GETs fire when opening the Drawer (DevTools Network tab check)."
    why_human: "Mantine Drawer animation + right-edge placement + no-new-fetch invariant require browser verification. DevTools Network tab check cannot be automated."
  - test: "MiiModuleTabs deep-link ?tab=<extension-key> auto-expand (forward-compat verification)"
    expected: "In Phase 33 no extension modules exist so the deep-link useEffect path is inactive. Smoke verifies base tabs still render correctly (Person, Fall, Diagnose, Prozedur, Consent, Laborbefund, Medikation + Zeitleiste). Extension toggle section NOT visible (length-guarded)."
    why_human: "Phase 33 ships the structural partition with zero extension data; visual confirmation that no extension surface renders is a UX invariant."
  - test: "Per-patient Laborbefund previously-empty-panel (UAT-FU-06) now populated"
    expected: "For a Synthea patient with observations, the Laborbefund tab shows ≥ 1 lab result (not empty). Other modules may legitimately show empty (Consent, Medikation) per 33-01-INVESTIGATION.md — that is data-coverage reality, not a bug."
    why_human: "UAT-FU-06 symptom was originally observed as a UX regression; resolution requires live Blaze + Synthea rendering to confirm the fix."
---

# Phase 33: MII Schema Foundation + Extension-Modules Collapse UI Verification Report

**Phase Goal:** Widen the MII module schema and ship the collapsible "Extension modules" UI shell WITHOUT yet adding the 14 new data entries. Helpers-first codemod isolates the mechanical refactor from the later data rollout. Absorb UAT-FU-04 (Dashboard scoping) and UAT-FU-06 (empty panel investigation) as pre-tasks.

**Verified:** 2026-04-24T13:42:00Z
**Status:** human_needed (automated checks all pass; visual/behavioral smoke tests require browser + live Blaze)
**Re-verification:** No — initial verification

## Goal Achievement

### Observable Truths (merged from ROADMAP Success Criteria + plan frontmatter must_haves)

| # | Truth (Success Criterion) | Status | Evidence |
|---|---------------------------|--------|----------|
| 1 | mii-modules.ts exports 4 helpers (fhirResourceTypesOf, findModuleForType, getPatientSearchParamForType, getExtraQueryForType); all call sites consume helpers; no direct `.fhirResourceType` === comparison remains (grep-verified) | VERIFIED | `grep -n "export function " src/utils/mii-modules.ts` → 4 exports at lines 175, 190, 206, 222. `grep -rn "\.fhirResourceType\s*===" src/ --include='*.ts' --include='*.tsx' \| grep -v __tests__` → only 1 JSDoc docstring match (line 183, `mii-modules.ts`), 0 production-code survivors. `grep -rn "MII_MODULES\.find.*fhirResourceType"` same single JSDoc hit. |
| 2 | MiiModule accepts `fhirResourceType: string \| string[]` + required `category: 'base' \| 'extension'`; all 7 base modules tagged `'base'`; optional `patientSearchParamOverrides?` + per-type extraQuery structure exist | VERIFIED | `grep -c "category: 'base'" src/utils/mii-modules.ts` → 8 (interface JSDoc + 7 module literals). `grep -n "fhirResourceType: string \| string\[\]" src/utils/mii-modules.ts` → line 32. `grep -c "patientSearchParamOverrides?:" src/utils/mii-modules.ts` → 2 (interface + JSDoc). `grep -c "extraQueryByType?:" src/utils/mii-modules.ts` → 1 (interface). |
| 3 | MiiModuleTab fans out N concurrent FHIR searches via Promise.all(types.map(...)) with per-type .catch() preserving empty-on-failure; single-type modules identical to v1.4 | VERIFIED | `grep -n "Promise\.all\|types\.map(fetchOne)\|\.catch(() => \[\]" src/components/patients/MiiModuleTab.tsx` → lines 91 (catch → empty), 94 (Promise.all + types.map). 5 unit tests in `src/components/patients/__tests__/MiiModuleTab.test.tsx` (fan-out count, multi-type, per-type failure, patientSearchParamOverrides routing, extraQueryByType routing) — all passing. |
| 4 | MiiModuleTabs partitions base vs extension; extension tabs inside <Collapse> defaulting CLOSED; auto-expands when activeTab is extension; extension Panels drop keepMounted, base 7 keep it | VERIFIED | `grep -n "useDisclosure(false)" src/components/patients/MiiModuleTabs.tsx` → line 104 (session-only). Partition filters at lines 92-93. Deep-link useEffect lines 111-119. keepMounted inspection: base panels line 189 (keepMounted), extension panels line 194 (omitted), timeline line 198 (keepMounted). `grep -c "extensionModules\.length > 0"` → 1 (length-guarded). |
| 5 | Dashboard MII tile grid partitions base vs extension; "Show extension modules" toggle; scoping label unambiguous (UAT-FU-04 closure) | VERIFIED | DashboardPage.tsx: `grep -n "m\.category === 'base'\|m\.category === 'extension'"` → lines 170 + 172. `grep -n "title=\"MII Kerndatensatz · Server-wide totals\""` → line 436. extensionGridOpened state at line 89 (useDisclosure(false)). `grep -cE "client\.search\|searchResources\|useSearch\|useResourceCounts\|client\.get\|client\.post\|fetch\(" src/components/dashboard/DashboardPage.tsx` → 2 (no new fetches added; matches plan 33-06 invariant). |
| 6 | UAT-FU-06 root cause identified, fixed, regression test locks the pattern | VERIFIED | 33-01-INVESTIGATION.md documents live Blaze probe on 2026-04-24. Root cause analysis identifies 3 roots: Consent 0 server-wide (data reality), Medikation on non-Synthea patients (data reality), Laborbefund contamination from extraQuery URL drop (fixed). MiiModuleTab.tsx:81 now appends `&${module.extraQuery}` (see `if (extra) url += ...` at line 81). D-17 per-module contract test at `src/__tests__/mii-modules.test.ts` (describe 'per-module patientSearchParam contract (D-17)', 8 tests: 7 modules + 1 coverage assertion). |
| 7 | ClinicalTimeline.tsx:85-86 uses fhirResourceTypesOf(m).includes() (via findModuleForType); timeline entries keep badge color + German label for multi-type modules (verified via Bildgebung-style fixture) | VERIFIED | `grep -n "findModuleForType" src/components/patients/ClinicalTimeline.tsx` → line 7 (import) + line 85 (call site). `grep -n "MII_MODULES\.find\|m\.fhirResourceType\s*===" src/components/patients/ClinicalTimeline.tsx` → 0. Helper test: 3 new regression tests in `src/__tests__/mii-modules.test.ts` describe 'findModuleForType with multi-type module (MII-EXT-08 timeline regression)' (same-germanLabel, same-badgeColor, shadow-guard). Render test: `src/components/patients/__tests__/ClinicalTimeline.test.tsx` (3 tests: Condition → Diagnose, Procedure → Prozedur, empty-bundle no-crash). |
| 8 | npm test 836+ passing / 0 failing; type assertions relaxed to accept string \| string[]; exact-match tests for 7 base modules remain | VERIFIED | `npm test --run` → **902 passing / 22 todo / 0 failing** (far exceeds 836 baseline). `grep -c "Array\.isArray(mod\.fhirResourceType)" src/__tests__/mii-modules.test.ts` → 1 (relaxed assertion). `grep -c "toHaveLength(7)" src/__tests__/mii-modules.test.ts` → 1 (unchanged; Phase 34 bumps to 21). Exact-match test for `MII_MODULES[0]` updated to include `category: 'base'` but otherwise preserves the 7-module shape. |

**Score:** 8/8 truths verified

### Required Artifacts

| Artifact | Expected | Status | Details |
|----------|----------|--------|---------|
| `src/utils/mii-modules.ts` | Widened MiiModule interface + 7 base modules tagged 'base' + 4 helpers | VERIFIED | 228 lines; interface at lines 15-72 with all 7 fields including `category: 'base' \| 'extension'`, `patientSearchParamOverrides?`, `extraQueryByType?`, widened `fhirResourceType: string \| string[]`. 7 base modules tagged 'base' at lines 90-152. Helpers exported at 175 (fhirResourceTypesOf), 190 (findModuleForType), 206 (getPatientSearchParamForType), 222 (getExtraQueryForType). |
| `src/components/patients/MiiModuleTab.tsx` | Promise.all fan-out via helpers; per-type catch; URL builder with extraQuery append | VERIFIED | 168 lines; fetchOne closure at line 77 uses getPatientSearchParamForType + getExtraQueryForType; URL append `if (extra) url += "&" + extra` at line 81; Promise.all at line 94; .flat() + sort at lines 96-99. |
| `src/components/patients/MiiModuleTabs.tsx` | Base/extension partition + Collapse + deep-link useEffect + selective keepMounted | VERIFIED | 204 lines; partition at lines 92-93; useDisclosure(false) at line 104; deep-link useEffect at lines 111-119; length-guarded Collapse + UnstyledButton at lines 146-181; per-panel keepMounted at 189/198 (present), 194 (omitted for extension). |
| `src/components/patients/ClinicalTimeline.tsx` | findModuleForType replaces === comparison | VERIFIED | Line 7 imports findModuleForType; line 85 invokes `findModuleForType(resource.resourceType, ...)`; 0 surviving `MII_MODULES.find(... === ...)` patterns. |
| `src/components/dashboard/DashboardPage.tsx` | Base/extension partition + D-13 heading + Drawer click target + no new fetches | VERIFIED | Drawer import at line 9; extensionGridOpened state at line 89; drawerOpened state at line 95; partition at lines 170-172; handleTileClick at line 178; renderMiiTile at line 186; D-13 heading 'MII Kerndatensatz · Server-wide totals' at line 436; Drawer JSX at lines 480-551; navigate(`/explorer/${primary}`) at line 544; fetch-site count unchanged at 2. |
| `src/__tests__/mii-modules.test.ts` | Helper tests + D-17 contract + widened-schema tests + MII-EXT-08 regression | VERIFIED | 34/34 tests passing. Includes `helpers (MII-EXT-01)` describe, `per-module patientSearchParam contract (D-17)` describe, `every Phase 33 module is tagged category: base`, `MiiModule type shape accepts array fhirResourceType + extension category`, `findModuleForType with multi-type module (MII-EXT-08 timeline regression)` describe. `Array.isArray(mod.fhirResourceType)` guard present. |
| `src/components/patients/__tests__/MiiModuleTab.test.tsx` | 5 fan-out tests | VERIFIED | File created; 5 `it(...)` blocks — single-type GET, multi-type concurrent GETs, per-type failure isolation, patientSearchParamOverrides routing, extraQueryByType routing. All passing. |
| `src/components/patients/__tests__/ClinicalTimeline.test.tsx` | 3 render regression tests for MII-EXT-08 | VERIFIED | File created; 3 `it(...)` blocks — Condition → Diagnose label, Procedure → Prozedur label, empty-bundle no-crash. All passing. |
| `.planning/phases/33-mii-schema-foundation-extension-modules-collapse-ui/33-01-INVESTIGATION.md` | Live-probe findings for UAT-FU-06 | VERIFIED | 11,048 bytes; contains per-module probe results, root cause analysis, bug note for MiiModuleTab.tsx:63 extraQuery drop, concrete fix list. |

### Key Link Verification

| From | To | Via | Status | Details |
|------|------|-----|--------|---------|
| MiiModuleTab.tsx useEffect | mii-modules.ts helpers | per-type URL construction inside types.map(fetchOne) | WIRED | Lines 77-92 of MiiModuleTab.tsx use all 3 helpers (getPatientSearchParamForType, getExtraQueryForType, fhirResourceTypesOf); Promise.all at line 94. |
| ClinicalTimeline.tsx:85 | mii-modules.ts findModuleForType | function call replacing inline find | WIRED | Line 7 import + line 85 invocation; grep confirms 0 `=== ` survivors. |
| mii-modules.test.ts | mii-modules.ts getPatientSearchParamForType | import replacing inline probe() | WIRED | `grep -c "import.*getPatientSearchParamForType" src/__tests__/mii-modules.test.ts` ≥ 1; plan 33-02 eliminated inline `probe()` helper. |
| MiiModuleTabs.tsx | @mantine/core Collapse + @mantine/hooks useDisclosure | imported idiom from DashboardPage | WIRED | Imports at lines 2-10; useDisclosure(false) at line 104; Collapse usage at line 164. |
| URL query ?tab=<key> | extensionOpened state | useEffect that auto-expands when activeTab matches an extension module | WIRED | useEffect at lines 111-119 with `!extensionOpened` guard. |
| Dashboard base tile click | Drawer state + render | useDisclosure state + Drawer component | WIRED | handleTileClick line 178 calls `setSelectedModule(mod); openDrawer();` — Drawer renders at lines 480-551 with `opened={drawerOpened}`. |
| Drawer "Open in Explorer" button | navigate(`/explorer/<primary-type>`) | useNavigate + fhirResourceTypesOf(selectedModule)[0] | WIRED | Line 542 gets primary; line 544 navigates with template literal. |

### Data-Flow Trace (Level 4)

| Artifact | Data Variable | Source | Produces Real Data | Status |
|----------|---------------|--------|--------------------|--------|
| MiiModuleTab.tsx | `resources` (state) | `Promise.all(types.map(fetchOne))` → `perType.flat()` | Yes — `client.get` fetches bundle, parses entries | FLOWING |
| MiiModuleTabs.tsx | `baseModules` / `extensionModules` (compile-time) | `MII_MODULES.filter((m) => m.category === ...)` | Yes — reads from real MII_MODULES (7 entries) | FLOWING |
| ClinicalTimeline.tsx | `resources` (state) | `client.searchResources` per TIMELINE_RESOURCE_TYPE | Yes — actual FHIR search queries | FLOWING |
| DashboardPage.tsx (MII tiles) | `counts[type]` | `useResourceCounts(client, resourceTypeNames)` hook | Yes — pre-existing fetch, unchanged (fetch-site grep = 2, same as pre-33-06) | FLOWING |
| DashboardPage.tsx (Drawer) | `selectedModule`, `counts[type]` | `setSelectedModule(mod)` on tile click + same counts map | Yes — reads already-fetched counts | FLOWING |

### Behavioral Spot-Checks

| Behavior | Command | Result | Status |
|----------|---------|--------|--------|
| TypeScript compilation clean | `npx tsc -b --noEmit` | exit 0 | PASS |
| Full test suite | `npm test --run` | 902 passed / 22 todo / 0 failing / 105 test files (3 skipped) | PASS |
| mii-modules helper + contract tests | `npm test -- --run src/__tests__/mii-modules.test.ts` | 34/34 tests passing | PASS |
| MiiModuleTab + ClinicalTimeline tests | `npm test -- --run src/components/patients/__tests__` | 8/8 tests passing (5 + 3) | PASS |
| 0 survivors of `=== fhirResourceType` in production code | `grep -rn ".fhirResourceType\s*===" src/ --include='*.ts' --include='*.tsx' \| grep -v __tests__` | 1 JSDoc match only (mii-modules.ts:183 docstring) | PASS |
| 0 survivors of `navigate('/patients')` on tile click in DashboardPage (string appears only in comment) | `grep -n "navigate('/patients')" src/components/dashboard/DashboardPage.tsx` | Single match at line 91 inside `// D-14 (plan 33-06): tile click target switched from navigate('/patients')` comment — NOT a code path | PASS |
| D-13 heading present | `grep -n "Server-wide totals" src/components/dashboard/DashboardPage.tsx` | 2 matches (line 433 comment + line 436 title prop) | PASS |
| No new FHIR fetch sites in DashboardPage | `grep -cE "client.search\|searchResources\|useSearch\|useResourceCounts\|client.get\|client.post\|fetch(" src/components/dashboard/DashboardPage.tsx` | 2 (unchanged from pre-plan-33-06) | PASS |

### Requirements Coverage

| Requirement | Source Plan | Description (from REQUIREMENTS.md) | Status | Evidence |
|-------------|-------------|-----------------------------------|--------|----------|
| MII-EXT-01 | 33-02 | Helper utilities shipped before schema widens; mechanical refactor with no behavior change; call sites migrated | SATISFIED | 4 helpers exported from mii-modules.ts; grep confirms 0 production-code survivors of `.fhirResourceType ===`. 33-02 commits 43de56e (test RED) → 7b2663c (feat GREEN) → 97e816d (refactor). |
| MII-EXT-02 | 33-03 | MiiModule widened: `fhirResourceType: string \| string[]` + `category: 'base' \| 'extension'` + `patientSearchParamOverrides?` + per-type extraQuery | SATISFIED | Interface at lines 15-72 of mii-modules.ts has all 4 required fields. All 7 base modules tagged 'base'. Helpers dropped forward-compat casts. 33-03 commits dc583b5 + 6100fcc. |
| MII-EXT-03 | 33-04 | MiiModuleTab fans out N concurrent searches via Promise.all; per-type .catch() preserves empty-on-failure | SATISFIED | useEffect at MiiModuleTab.tsx lines 64-105 implements fetchOne closure + Promise.all. 5 unit tests lock fan-out behaviors. 33-04 commits 99e0cdb + cb23e27. |
| MII-EXT-04 | 33-05 | MiiModuleTabs partitions base vs extension; extension tabs inside Collapse defaulting CLOSED; auto-expands on deep-link | SATISFIED | Partition at MiiModuleTabs.tsx lines 92-93; useDisclosure(false) line 104; deep-link useEffect lines 111-119. 33-05 commit 2784362. |
| MII-EXT-05 | 33-05 | Extension tabs drop keepMounted; base 7 keep it | SATISFIED | Per-panel keepMounted inspection: line 189 (base: set), line 194 (extension: omitted), line 198 (timeline: set). |
| MII-EXT-06 | 33-06 | Dashboard MII tile grid partitions base vs extension; extension section gated behind toggle; scoping decision resolved | SATISFIED | DashboardPage.tsx lines 170-172 partition; lines 448-475 length-guarded extension toggle + Collapse; line 436 D-13 heading 'MII Kerndatensatz · Server-wide totals' resolves UAT-FU-04. 33-06 commit 68d9cfa. |
| MII-EXT-07 | 33-01 | Phase-30 UAT follow-up (empty per-patient MII/FHIR panels) investigated; root cause fixed; regression test | SATISFIED | 33-01-INVESTIGATION.md documents live probe; all 7 patientSearchParam values verified correct; extraQuery URL drop bug fixed at MiiModuleTab.tsx:81; D-17 per-module contract test in mii-modules.test.ts (7 rows + coverage). 33-01 commits e0918a6 → 995f56f → 62e1177 → 6c2d859. |
| MII-EXT-08 | 33-07 | ClinicalTimeline.tsx:85-86 uses fhirResourceTypesOf(m).includes() (via findModuleForType); badge color + German label propagate for multi-type modules | SATISFIED | grep confirms 0 `=== ` survivors at line 85; findModuleForType invoked. Helper + render regression tests lock multi-type same-germanLabel + same-badgeColor + shadow-guard. 33-07 commits e845e56 + ba4536e. |
| UAT-FU-04 | 33-06 (subsumed) | Dashboard MII tile scoping decision | SATISFIED (via MII-EXT-06) | D-13 heading 'MII Kerndatensatz · Server-wide totals' ends the scoping ambiguity. |
| UAT-FU-06 | 33-01 (subsumed) | Phase-30 UAT follow-up fix propagation | SATISFIED (via MII-EXT-07) | Investigation doc + extraQuery URL fix + D-17 contract test. |

All 8 MII-EXT-* requirements are accounted for across all 7 plans; no orphaned requirements.

### Anti-Patterns Found

No blocker anti-patterns. Code is substantive throughout:

| File | Line | Pattern | Severity | Impact |
|------|------|---------|----------|--------|
| src/utils/mii-modules.ts | 183 | JSDoc docstring quotes `MII_MODULES.find(m => m.fhirResourceType === type)` verbatim | INFO | Intentional — documents the pre-refactor pattern for future readers. Not executable code. |
| src/components/dashboard/DashboardPage.tsx | 91 | Comment references `navigate('/patients')` to explain what was changed to Drawer | INFO | Intentional — documents D-14 change rationale. Not executable code. |

No TODO / FIXME / PLACEHOLDER / "coming soon" / "not yet implemented" strings found in the 5 modified source files (verified via grep across all phase-modified files).

### Human Verification Required

See YAML frontmatter `human_verification` section. 6 items require visual / behavioral browser-smoke verification:

1. **Live Synthea patient → Laborbefund tab shows only lab Observations** — verifies extraQuery URL append in live Blaze + rendering.
2. **Timeline color + German label for all 4 TIMELINE_RESOURCE_TYPES** — CSS color-token rendering cannot be verified in jsdom.
3. **Dashboard MII heading reads 'MII Kerndatensatz · Server-wide totals'** — UAT-FU-04 closure requires visual confirmation of the scope label.
4. **Dashboard tile click opens Drawer (not navigate) + no new fetches** — Mantine Drawer animation + DevTools Network tab check cannot be automated.
5. **MiiModuleTabs base tabs still render correctly** — visual confirmation that no extension surface renders in Phase 33.
6. **UAT-FU-06 previously-empty-panel now populated** — live Blaze + Synthea rendering confirms the bug fix.

### Gaps Summary

No gaps found in automated verification. All 8 must-haves VERIFIED:
- All helpers exist, are substantive, are wired, and produce real data.
- The MiiModule interface is widened correctly with all required fields.
- Every call site uses helpers; grep confirms 0 `===` survivors.
- MiiModuleTab fan-out is implemented with Promise.all + per-type catch; locked by 5 unit tests.
- MiiModuleTabs partition + Collapse + selective keepMounted is in place with 0 localStorage persistence.
- DashboardPage partition + D-13 heading + Drawer click target + 0 new FHIR fetches all verified.
- ClinicalTimeline uses findModuleForType; regression tests lock multi-type resolution.
- Test suite: 902 passing / 0 failing (far exceeds 836 baseline).

The phase is **automated-verification-passed**. Status is `human_needed` because the success criteria include user-facing UX concerns (visual appearance of the D-13 scope label, Drawer UX, Laborbefund empty-panel resolution on live Synthea data, timeline color rendering) that only a browser smoke test can confirm.

---

_Verified: 2026-04-24T13:42:00Z_
_Verifier: Claude (gsd-verifier)_
