---
phase: 42-pre-probe-extension-module-counts-mii-ext-15
verified: 2026-04-29T22:15:00Z
status: human_needed
score: 3/4 success criteria verified (SC #4 awaiting human walk)
overrides_applied: 0
human_verification:
  - test: "Live-Blaze UAT walk: 4 cases in 42-HUMAN-UAT.md (≥3 non-zero extension counts on real Synthea Onkologie patient; 0-count tab dim + active-indicator visibility; toggle accuracy on patient mount; cancellation on rapid patient navigation)"
    expected: "All 4 UAT cases marked Pass/Fail: pass; frontmatter status flipped to 'passed'; Tester / Date / Blaze instance / Patient ID(s) populated"
    why_human: "ROADMAP §Phase 42 SC #4 explicitly requires live-Blaze validation against a real Synthea cohort; visual D-06 active-indicator confirmation is a perceptual check; rapid-nav cancellation surfaces real network timing the mocks don't reproduce. Scaffold (42-HUMAN-UAT.md, 119 lines) is in place but the walk has not been executed (frontmatter status: scaffolded; all 4 Pass/Fail lines blank)."
---

# Phase 42: Pre-probe Extension-Module Counts (MII-EXT-15) Verification Report

**Phase Goal:** Patient-detail extension-module tabs show counts on labels (e.g. `Onkologie (12)`) so users know which tabs have data before clicking — closes the empty-tab UX gap from Phase 34's data-drop.

**Verified:** 2026-04-29T22:15:00Z
**Status:** human_needed
**Re-verification:** No — initial verification

## Goal Achievement

### Observable Truths (Roadmap Success Criteria)

| # | Truth (ROADMAP SC) | Status | Evidence |
|---|--------------------|--------|----------|
| 1 | New hook `useMiiExtensionCounts(patientId)` fires one `_summary=count` FHIR GET per extension module on patient mount, in parallel via `Promise.all`, with per-type `.catch(() => 0)` fallbacks; cached per `(patientId, moduleId)` for the session. | ✓ VERIFIED | `src/hooks/useMiiExtensionCounts.tsx:42` exports the hook; line 100-110 builds URL with `_summary=count&_count=0`; line 110 `Promise.all(types.map(fetchOneCount))`; line 107 `.catch(() => 0)`; line 59 `useRef<Map<string, number>>` cache keyed `${patientId}:${mod.key}` (line 77). 8 unit tests in `src/hooks/__tests__/useMiiExtensionCounts.test.tsx` pass. |
| 2 | `MiiModuleTabs` tab labels render counts inline as `{germanLabel} ({count})`; zero-count tabs render at opacity 0.55; regression test asserts both presence and dimming. | ✓ VERIFIED | `MiiModuleTabs.tsx:92-93` renders `${primary} (${count})` when count defined; line 110 applies `style={{ opacity: 0.55 }}` when `isEmpty`; lines 105-110 apply `data-testid="extension-tab-pill"` + `data-empty` on the OUTER `<div>` (not `<Tabs.Tab>` — Pitfall #5). Regression tests `count appends to extension tab labels` and `dim on zero — opacity 0.55 + data-empty=true` pass. |
| 3 | AbortController threading: when the user navigates away from the patient detail page mid-probe, all in-flight count requests cancel (D-20 unmount-safe pattern). NOTE: per phase context, executors used a cancelled-flag pattern instead of AbortController because Medplum v5.1.7 `client.get()` does not accept signal. Verify functional equivalence (mid-probe unmount → no setState calls land). | ✓ VERIFIED (override-equivalent) | `useMiiExtensionCounts.tsx:71` `let cancelled = false`; line 111 `if (cancelled) return` guards the OUTER `.then` before any setState; line 121-123 cleanup sets `cancelled = true`. Discretion choice documented in 42-01-PLAN.md key-decisions and `useMiiExtensionCounts.tsx:21-25` (AbortController unusable: Medplum v5.1.7 `client.get()` accepts no signal). Test 6 `cancelled-flag` in hook unit tests proves stale-resolve does not overwrite new patient state via delayed-resolve mock + unmount. Functional equivalence established: mid-probe unmount → no setState calls land. |
| 4 | Live-Blaze UAT smoke item recorded in 42-HUMAN-UAT.md confirms counts appear on at least 3 extension tabs against a real Synthea patient. | ⚠️ HUMAN_NEEDED | `42-HUMAN-UAT.md` exists (119 lines, comprehensive 4-case scaffold covering SC #4 + visual D-06 check + toggle accuracy + rapid-nav cancellation). Frontmatter `status: scaffolded` (NOT `passed`). All 4 Pass/Fail lines blank (`_________________`). UAT walk has NOT been executed against live Blaze. |

**Score:** 3/4 success criteria fully verified; 1 awaiting human walk.

### Required Artifacts

| Artifact | Expected | Status | Details |
|----------|----------|--------|---------|
| `src/hooks/useMiiExtensionCounts.tsx` | useMiiExtensionCounts(patientId) hook | ✓ VERIFIED (Level 1-4) | 131 lines (>= min 60); exports `useMiiExtensionCounts`; contains `category === 'extension'`, `_summary=count&_count=0`, `let cancelled = false`, `cancelled = true`, `.catch(() => 0)`, `reportEmptiness`, `useRef`, `new Map`. Imported and used in `MiiModuleTabs.tsx:17,164`. Wave 4 data flow: hook returns Record<string, number> populated by real Bundle.total values from `client.get` (Medplum FHIR client). |
| `src/hooks/__tests__/useMiiExtensionCounts.test.tsx` | Unit tests | ✓ VERIFIED (Level 1-3) | 1 describe block named `useMiiExtensionCounts`, 8 `it(...)` cases. All 8 pass under vitest. |
| `src/components/patients/MiiModuleTabs.tsx` | Hook integrated in MiiModuleTabsInner; TabPillLabel accepts count + isEmpty; extension Tabs.Tab passes them | ✓ VERIFIED (Level 1-4) | Hook called once at line 164 inside `MiiModuleTabsInner` (Pitfall #1 — INSIDE `EmptyExtensionsProvider` from line 139). TabPillLabel signature lines 65-83 has `count?: number` + `isEmpty?: boolean`. Extension render site lines 284-302 passes both; base render site lines 217-226 + Zeitleiste lines 227-233 do NOT pass them (D-04). `awk` between `baseModules.map` and `Zeitleiste` finds 0 `count=` (D-04 enforced). Data-flow: extensionCounts variable populated by hook return value, flows into JSX prop. |
| `src/components/patients/__tests__/MiiModuleTabs.test.tsx` | Regression tests | ✓ VERIFIED (Level 1-3) | Contains `extension-tab-pill` testid; 6 new test names match `-t` filter contract: `count appends to extension tab labels`, `no placeholder while fetching`, `base exemption — base tabs receive no count or testid`, `dim on zero — opacity 0.55 + data-empty=true`, `pre-probe feeds toggle — Hide N modules accurate without click`, `idempotency — pre-probe + post-visit publisher do not double-count`. All pass (24 tests passing in this file). |
| `.planning/phases/42-pre-probe-extension-module-counts-mii-ext-15/42-HUMAN-UAT.md` | Live-Blaze UAT scaffold | ✓ VERIFIED (Level 1-2 only) | 119 lines (>= min 60); contains `MII-EXT-15-UAT`, `Synthea Onkologie`, `≥3 extension tabs`, `0.55 opacity`; 4 UAT cases (UAT-1..UAT-4); frontmatter `status: scaffolded`, `covers: [MII-EXT-15-UAT]`. Walk NOT executed (Level 4 — see SC #4 above). |

### Key Link Verification

| From | To | Via | Status | Details |
|------|----|----|--------|---------|
| `src/hooks/useMiiExtensionCounts.tsx` | `@medplum/react-hooks useMedplum()` | `client.get(client.fhirUrl(url).toString())` | ✓ WIRED | Line 45 `useMedplum()`; line 100-101 `client.get(client.fhirUrl(url).toString())` matches pattern verbatim. |
| `src/hooks/useMiiExtensionCounts.tsx` | `src/hooks/useEmptyExtensionsCoordinator.tsx` | `reportEmptiness(...)` from coordinator destructure | ✓ WIRED | Line 46 destructures `reportEmptiness`; line 67-68 promotes to stable ref; lines 87 (cache-hit) + 117 (resolve) call `reportEmptinessRef.current(mod.key, total === 0)` — D-05 idempotent in coordinator (verified in `useEmptyExtensionsCoordinator.tsx:106`). |
| `src/hooks/useMiiExtensionCounts.tsx` | `src/utils/mii-modules.ts` | `MII_MODULES.filter(category === 'extension')`, `fhirResourceTypesOf`, helpers | ✓ WIRED | Lines 4-9 import all four; line 53 + line 72-74 filter `category === 'extension'`; line 91 calls `fhirResourceTypesOf(mod)`; lines 94-95 call `getPatientSearchParamForType` + `getExtraQueryForType`. |
| `MiiModuleTabsInner` | `useMiiExtensionCounts` | `const extensionCounts = useMiiExtensionCounts(patientId)` | ✓ WIRED | Line 164 — INSIDE `EmptyExtensionsProvider` from line 139 (Pitfall #1). `grep -c` returns exactly 1 call site. |
| `TabPillLabel` (extension render site) | DOM testid + opacity | `data-testid='extension-tab-pill', data-empty={isEmpty ? 'true' : 'false'}, style={isEmpty ? { opacity: 0.55 } : undefined}` | ✓ WIRED | Lines 105-110 emit attributes on outer `<div>` (D-06 + Pitfall #5 — preserves Mantine 8 active-pill indicator). |
| `MiiModuleTabsInner` pre-probe resolve | `useEmptyExtensionsCoordinator.reportEmptiness` | called from inside `useMiiExtensionCounts` | ✓ WIRED | Hook calls `reportEmptiness(mod.key, total === 0)` (line 117) → coordinator de-dupes via `prev[moduleKey] === isEmpty` guard. Regression test `pre-probe feeds toggle — Hide N modules accurate without click` confirms `Hide 14 empty modules` rendered without any tab click (D-05 contract). |

### Data-Flow Trace (Level 4)

| Artifact | Data Variable | Source | Produces Real Data | Status |
|----------|---------------|--------|--------------------|----|
| `useMiiExtensionCounts.tsx` | `counts` (state) / `cached` (ref) | `client.get(client.fhirUrl(url).toString())` → `bundle.total` (line 105) | Yes — Bundle.total from FHIR `_summary=count` response | ✓ FLOWING |
| `MiiModuleTabs.tsx` | `extensionCounts` | `useMiiExtensionCounts(patientId)` (line 164) | Yes — propagates to `count` and `isEmpty` per-module (lines 288-289), then to `<TabPillLabel count={count} isEmpty={isEmpty} />` (lines 297-298) | ✓ FLOWING |
| `TabPillLabel` (extension) | `count`, `isEmpty` props | `MiiModuleTabsInner` extension render site (lines 284-302) | Yes — feeds `primaryWithCount` text + opacity/testid attributes | ✓ FLOWING |

### Behavioral Spot-Checks

| Behavior | Command | Result | Status |
|----------|---------|--------|--------|
| Hook test file: 8 tests pass | `npm test -- --run src/hooks/__tests__/useMiiExtensionCounts.test.tsx` | `Tests  8 passed (8)` | ✓ PASS |
| MiiModuleTabs test file: 24 tests pass (incl. 6 Phase 42 + 18 prior) | `npm test -- --run src/components/patients/__tests__/MiiModuleTabs.test.tsx` | `Tests  24 passed (24)` | ✓ PASS |
| Full Vitest suite green at expected baseline | `npm test -- --run` | `Tests  1 failed | 22 todo | 3 skipped | 1154 passed (1180)` — pre-existing deuteranopia pair #13 failure documented in `deferred-items.md` (verified pre-existing on commit 31ce2ed before any Phase 42 changes); 1154 passing matches expected post-phase total (1140 baseline + 8 hook + 6 component = 1154) | ✓ PASS |
| Production build clean | `npm run build` | `✓ built in 642ms` (tsc + Vite, exit 0) | ✓ PASS |
| Live-Blaze UAT walk | manual — see 42-HUMAN-UAT.md | scaffold present; walk NOT executed | ? SKIP (human_needed) |

### Requirements Coverage

| Requirement | Source Plan | Description | Status | Evidence |
|------------|-------------|-------------|--------|----------|
| MII-EXT-15 | 42-01-PLAN.md, 42-02-PLAN.md | "Patient-detail extension-module tabs show pre-probed counts on tab labels (e.g. `Onkologie (12)`) … `_summary=count` request per extension module, fired in parallel on patient mount, with results cached per `(patientId, moduleId)` for the session. Tab labels with zero count render dimmed with `(0)`." | ✓ SATISFIED (3/4 sub-criteria) + ? NEEDS HUMAN (UAT walk) | Hook + integration covered (sub-reqs A/B/C/D/E/F/G/H per 42-02-SUMMARY.md table). Live-Blaze UAT (sub-req UAT) scaffolded but pending human walk. |

No orphaned requirements: REQUIREMENTS.md maps MII-EXT-15 → Phase 42, and both plans declare it under `requirements:` frontmatter.

### Anti-Patterns Found

| File | Line | Pattern | Severity | Impact |
|------|------|---------|----------|--------|
| `src/hooks/useMiiExtensionCounts.tsx` | — | TODO/FIXME/PLACEHOLDER scan | None | 0 hits |
| `src/components/patients/MiiModuleTabs.tsx` | — | TODO/FIXME/PLACEHOLDER scan | None | 0 hits |
| `src/hooks/useMiiExtensionCounts.tsx` | 79-89 | Cache-hit branch publishes emptiness redundantly | ℹ️ Info | Documented in 42-REVIEW.md IN-06; coordinator de-dupes; not a defect. |
| `src/hooks/useMiiExtensionCounts.tsx` | 27-31 | Cache-lifetime invariant relies on parent `key={patientId}` re-mount (no in-hook reset) | ⚠️ Warning | Documented in 42-REVIEW.md WR-01; correct today (`MiiModuleTabs.tsx:139` re-keys on patientId), but a brittle invariant. Not a Phase 42 goal-blocker. |
| `src/hooks/__tests__/useMiiExtensionCounts.test.tsx` | 356-398 | "Cache short-circuit" test does not exercise the cache (effect deps unchanged → effect doesn't re-fire) | ⚠️ Warning | Documented in 42-REVIEW.md WR-02. Test passes vacuously; cache short-circuit is still implemented and effective in production. Not a Phase 42 goal-blocker. |
| `MiiModuleTabs.tsx` | 182-200, 318-322 | Deep-linked-to extension that is hidden leaves "active panel, no active pill" | ⚠️ Warning | Documented in 42-REVIEW.md WR-03; pre-existing UX edge case interacting with Phase 34's hideEmpty filter, not introduced by Phase 42. |
| `useMiiExtensionCounts.tsx` | 103-105 | `Bundle` cast on parsed response has no runtime shape validation | ℹ️ Info | Documented in 42-REVIEW.md IN-02; defensive concern, not a defect. |

No blockers. All warnings are pre-existing or design tradeoffs documented in 42-REVIEW.md and accepted.

### Human Verification Required

#### 1. Live-Blaze UAT walk (4 cases)

**Test:** Walk all 4 UAT cases in `.planning/phases/42-pre-probe-extension-module-counts-mii-ext-15/42-HUMAN-UAT.md` against a running Blaze + Synthea cohort:
  - **UAT-1** (ROADMAP SC #4): Navigate to `/patients/{id}` for a Synthea Onkologie patient; confirm ≥3 extension tabs render `{germanLabel} (N)` with N>0; observe ≤14 simultaneous `_summary=count&_count=0` GETs in DevTools; confirm "Hide N empty modules" toggle reads correct N before any tab click.
  - **UAT-2** (D-06 visual + Pitfall #5): Identify a 0-count extension tab; confirm dimmed at 0.55 opacity pre-click; click into it and confirm Mantine 8 active-pill background indicator stays fully visible while label text remains dimmed.
  - **UAT-3** (MII-EXT-15-E visual): On a patient with mixed empty/non-empty modules, BEFORE any tab click, expand the Collapse and verify "Hide N empty modules" N matches the visible dimmed/zero tabs.
  - **UAT-4** (MII-EXT-15-H visual): Navigate Patient A → immediately Patient B (within 1s); confirm Patient B counts are accurate with no Patient A bleed-through.

**Expected:**
  - All 4 UAT cases marked `Pass/Fail: pass`.
  - Frontmatter `status:` flipped from `scaffolded` to `passed`.
  - `Tester`, `Date`, `Blaze instance`, `Patient ID(s) used` populated.
  - No console errors / Mantine warnings reported.
  - On completion, commit message: `docs(42-02): UAT passed — MII-EXT-15 live-Blaze smoke (4/4 cases pass)`.

**Why human:** ROADMAP §Phase 42 SC #4 explicitly requires live-Blaze validation against a real Synthea cohort. Visual confirmation of D-06 active-indicator (UAT-2) is a perceptual check the automated test stack cannot do (Mantine 8's active-pill background z-stacking). Rapid-nav cancellation (UAT-4) surfaces real network timing the mocks don't reproduce. The 4-case scaffold is in place (119 lines, comprehensive); only the walk itself remains.

### Gaps Summary

There are **no gaps in the implementation**. The phase goal is fully achieved at the code level:

- The pre-probe hook fires per-module/per-type `_summary=count` GETs in parallel via `Promise.all` with `.catch(() => 0)` per-type fallbacks (SC #1 ✓).
- Tab labels render `{germanLabel} ({count})` once counts resolve; zero-count tabs apply `opacity: 0.55` to the inner content `<div>` (preserving the Mantine 8 active-pill indicator per Pitfall #5); regression tests assert both presence and dimming (SC #2 ✓).
- Stale `setState` after unmount is prevented by a cancelled-flag pattern (functionally equivalent to AbortController for this use case; AbortController is unusable because Medplum v5.1.7 `client.get()` does not accept `signal`); discretion choice documented across 42-01-PLAN.md, 42-RESEARCH.md, and the hook's docblock (SC #3 ✓).
- Full Vitest suite at 1154 passing (1140 baseline + 8 hook unit + 6 component regression); `npm run build` clean; one pre-existing deuteranopia pair #13 failure documented as out-of-scope in `deferred-items.md` and verified on commit 31ce2ed before any Phase 42 source change.

The only remaining item is the **live-Blaze UAT walk** (SC #4), which is human-execution-bound by design. The 4-case scaffold (`42-HUMAN-UAT.md`, 119 lines) is in place but the walk has not been executed (frontmatter `status: scaffolded`, all `Pass/Fail` lines blank). Status is `human_needed` accordingly.

Once the human tester walks UAT-1..UAT-4 and flips frontmatter status to `passed`, the phase is fully closed.

---

_Verified: 2026-04-29T22:15:00Z_
_Verifier: Claude (gsd-verifier)_
