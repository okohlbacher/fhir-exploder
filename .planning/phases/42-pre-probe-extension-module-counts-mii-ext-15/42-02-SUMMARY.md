---
phase: 42-pre-probe-extension-module-counts-mii-ext-15
plan: 02
subsystem: ui
tags: [react, mantine-tabs, mii-extensions, empty-state, human-uat]

# Dependency graph
requires:
  - phase: 42-01
    provides: useMiiExtensionCounts(patientId) hook returning Record<moduleKey, number | undefined>; D-05 idempotent reportEmptiness wiring at hook level
  - phase: 34-mii-extension-modules
    provides: EmptyExtensionsProvider re-keyed on patientId; useEmptyExtensionsCoordinator with idempotent reportEmptiness; MiiModuleTabs render-site
provides:
  - TabPillLabel signature extended with optional count?: number + isEmpty?: boolean (D-04 base exemption)
  - MiiModuleTabsInner integration of useMiiExtensionCounts(patientId) — INSIDE EmptyExtensionsProvider (Pitfall #1)
  - data-testid="extension-tab-pill" + data-empty + opacity 0.55 dim placement on TabPillLabel's outer <div> (D-06 + Pitfall #5)
  - 6 new regression tests (MII-EXT-15-A/-C/-D/-E/-F/-G) at component level
  - Live-Blaze HUMAN-UAT scaffold (4 cases) for ROADMAP §42 SC #4
  - Phase-34 hide-empty toggle tests refreshed for the Phase-42 D-05 contract
affects: [42-verify, 42-finalize, future MII patient-detail UX work]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Outer-div opacity placement on TabPillLabel — preserves Mantine 8 active-pill background indicator while still dimming label content (Pitfall #5)"
    - "Optional-prop base exemption — TabPillLabel accepts count?: number + isEmpty?: boolean as optional; base render sites pass nothing → silent default of undefined → no count suffix, no testid, no dim (D-04)"
    - "data-testid + data-empty + style attributes on the host <div> for grep-friendly test assertions when Mantine 8's inline-style serialization is not stable enough for [style*='...'] selectors"

key-files:
  created:
    - .planning/phases/42-pre-probe-extension-module-counts-mii-ext-15/42-HUMAN-UAT.md
  modified:
    - src/components/patients/MiiModuleTabs.tsx
    - src/components/patients/__tests__/MiiModuleTabs.test.tsx

key-decisions:
  - "D-06 dim placement on TabPillLabel's OUTER content <div>, NOT on <Tabs.Tab>. Mantine 8 stacks the active-pill background indicator under <Tabs.Tab>'s style; outer-tab opacity dims the active indicator on a clicked-into 0-count tab (UX feels stuck). Inner-content opacity (mirroring MiiModuleTab.tsx:143) keeps the active indicator fully visible while still dimming the label."
  - "Test ID stability via data-testid='extension-tab-pill' + data-empty + style.opacity. Mantine 8 inline-style serialization is not grep-friendly (Pitfall #6); test assertions combine getByTestId + data-empty attribute + element.style.opacity instead."
  - "D-04 base exemption via prop absence. count + isEmpty are optional; base 7 + Zeitleiste callers pass nothing → defaults to undefined → no append, no testid, no dim. Existing call sites stay byte-for-byte unchanged."
  - "Phase-34 hide-empty toggle tests updated (NOT skipped). Pre-Phase-42 they asserted 'toggle hidden until ≥1 extension tab is visited'; under D-05 the pre-probe populates emptyMap on patient mount, so the click-required precondition no longer holds. Original assertions about toggle text, click-flip, localStorage roundtrip, and hide-filtering are preserved; only the entry conditions are refreshed (use makeCountClient with non-zero counts to exercise toggle-hidden, makeEmptyClient otherwise)."

patterns-established:
  - "Pattern 1: Outer-div opacity for tab pill dim — mirrors MiiModuleTab.tsx:143 idiom; future MII tab work should use this placement, not <Tabs.Tab style>"
  - "Pattern 2: Optional-prop exemption for D-04-style 'extension-only' surfaces — base callers stay unchanged because optional props default to undefined"

requirements-completed: [MII-EXT-15]

# Metrics
duration: 9 min (automated portion); UAT walk pending
completed: 2026-04-29 (Tasks 1+2 + Task 3 automated steps; Task 3 human-verify pending)
---

# Phase 42 Plan 02: Pre-probe extension counts wired into MiiModuleTabs (MII-EXT-15) Summary

**`MiiModuleTabs.tsx` now consumes `useMiiExtensionCounts(patientId)` from inside `MiiModuleTabsInner` so extension tabs render `{germanLabel} (N)` on patient mount, dim 0-count pills via outer-div `opacity: 0.55` (preserving Mantine 8's active-pill indicator per Pitfall #5), and feed the Phase-34 `EmptyExtensionsCoordinator` with accurate emptiness counts WITHOUT requiring any tab click. Live-Blaze UAT scaffold authored for ROADMAP §42 SC #4.**

## Performance

- **Duration:** ~9 min (automated tasks 1+2 + checkpoint automated steps); UAT walk pending
- **Started:** 2026-04-29T19:49:53Z
- **Tasks 1+2 + Task 3 automated steps complete:** 2026-04-29T19:58:41Z
- **Task 3 UAT walk:** pending human verification (see Checkpoint section below)
- **Tasks completed:** 2 of 3 fully (+ automated steps of Task 3)
- **Files created:** 1 (42-HUMAN-UAT.md)
- **Files modified:** 2 (MiiModuleTabs.tsx, MiiModuleTabs.test.tsx)

## Accomplishments

- **TabPillLabel extended with optional `count?: number` + `isEmpty?: boolean`.** D-01 appends `(${count})` once the count resolves; D-03 renders the bare label while still fetching; D-04 base 7 + Zeitleiste callers stay unchanged via prop absence; D-06 + Pitfall #5 dim placement is on the inner content `<div>`, NOT on `<Tabs.Tab>`, so the Mantine 8 active-pill background indicator stays fully visible on a clicked-into 0-count tab.
- **`useMiiExtensionCounts(patientId)` integrated inside `MiiModuleTabsInner`** — IMMEDIATELY after `useEmptyExtensionsCoordinator()` (line ~131), INSIDE the `EmptyExtensionsProvider` per Pitfall #1. Single call site, single render-pass, fan-out fires on patient mount and re-runs on patientId change via the provider's `key={patientId}` reset.
- **Extension-only render-site change.** Only `visibleExtensionModules.map(...)` (around line 256) passes `count` + `isEmpty` to `TabPillLabel`; base 7 + Zeitleiste sites are byte-for-byte unchanged (verified by `awk` script counting `count=` between `baseModules.map` and `Zeitleiste`: 0 hits).
- **6 new regression tests** in the new `describe('Phase 42 (MII-EXT-15) — pre-probe counts on extension tabs', …)` block:
  - `count appends to extension tab labels` — Onkologie 5+3+2+1=11, Bildgebung 4+2=6 (MII-EXT-15-A)
  - `no placeholder while fetching` — bare "Onkologie" label, no parens, no Loader (MII-EXT-15-C)
  - `base exemption — base tabs receive no count or testid` — Person/Fall/Diagnose/etc. stay bare; exactly 14 `extension-tab-pill` testids in the DOM (MII-EXT-15-D)
  - `dim on zero — opacity 0.55 + data-empty=true` — Onkologie (0) host has `data-empty="true"` and `style.opacity === '0.55'`; Bildgebung (6) host does not (MII-EXT-15-G)
  - `pre-probe feeds toggle — Hide N modules accurate without click` — `Hide 14 empty modules` visible without any tab click (MII-EXT-15-E)
  - `idempotency — pre-probe + post-visit publisher do not double-count` — clicking into Onkologie after pre-probe does NOT bump the count to 15 or 28 (MII-EXT-15-F)
- **`42-HUMAN-UAT.md` scaffold (119 lines)** with frontmatter (`status: scaffolded`, `covers: [MII-EXT-15-UAT]`) and 4 UAT cases (UAT-1 ≥3 non-zero counts; UAT-2 dim + active-indicator; UAT-3 toggle accurate on mount; UAT-4 cancellation on rapid nav). Tester fills `Pass/Fail` + `Notes` inline; Sign-Off block captures Tester / Date / Blaze instance / Patient ID(s).
- **Phase-34 hide-empty toggle tests refreshed** for the Phase-42 D-05 contract (4 tests updated). Original assertions about toggle text, click-flip, localStorage roundtrip, and hide-filtering preserved; only the entry conditions changed (pre-probe now populates emptyMap automatically).
- **Test gate (full suite):** 1154 passed / 22 todo / 3 skipped / 1 pre-existing failure (deuteranopia pair #13 — logged in `deferred-items.md` from Wave 1; verified pre-existing on commit `31ce2ed` before any Phase 42 source changes).
- **`npm run build` clean.**

## Task Commits

Each task was committed atomically:

1. **Task 1 RED — failing tests** — `b9ce1b2` (`test(42-02): RED — failing tests for pre-probe counts on extension tabs (MII-EXT-15-A/-C/-D/-E/-F/-G)`)
2. **Task 1 GREEN — source modifications** — `2fab1f3` (`feat(42-02): GREEN — pre-probe counts on extension tabs (D-01 + D-04 + D-06; MII-EXT-15-A/-C/-D/-E/-F/-G)`)
3. **Task 2 — UAT scaffold** — `efcf96d` (`docs(42-02): scaffold live-Blaze UAT (MII-EXT-15-UAT)`)

Task 3's UAT-pass commit (`docs(42-02): UAT passed — MII-EXT-15 live-Blaze smoke (4/4 cases pass)`) is pending the human walk.

_Note: TDD task 1 split into RED and GREEN per the plan's `tdd="true"` directive._

## Files Created/Modified

- `src/components/patients/MiiModuleTabs.tsx` — Imports `useMiiExtensionCounts`; extends `TabPillLabel` with optional `count` + `isEmpty` (outer-div opacity placement); calls hook in `MiiModuleTabsInner` after `useEmptyExtensionsCoordinator()`; passes count + isEmpty at the extension `<Tabs.Tab>` render site only.
- `src/components/patients/__tests__/MiiModuleTabs.test.tsx` — Adds `makeCountClient(perTypeCount)` helper; adds 6 new tests in the Phase 42 `describe` block; refreshes 4 Phase-34 hide-empty toggle tests for the D-05 contract.
- `.planning/phases/42-pre-probe-extension-module-counts-mii-ext-15/42-HUMAN-UAT.md` (new) — 4-case live-Blaze UAT scaffold.

## Decisions Made

- **D-06 dim placement on `TabPillLabel`'s outer content `<div>`, NOT on `<Tabs.Tab>`.** Pitfall #5 — Mantine 8 stacks the active-pill background indicator under `<Tabs.Tab>`'s style; outer-tab opacity dims the active indicator on a clicked-into 0-count tab. Outer-content opacity (mirroring `MiiModuleTab.tsx:143`) keeps the active indicator fully visible.
- **Test ID stability via `data-testid='extension-tab-pill'` + `data-empty` + `style.opacity`.** Mantine 8 inline-style serialization is not grep-friendly (Pitfall #6); test assertions combine `getByTestId` + `data-empty` attribute + `element.style.opacity`.
- **D-04 base exemption via prop absence.** `count` + `isEmpty` are optional; base 7 + Zeitleiste callers pass nothing → defaults to `undefined` → no append, no testid, no dim. Existing call sites stay byte-for-byte unchanged.
- **Phase-34 hide-empty toggle tests UPDATED (not skipped, not deleted).** Pre-Phase-42 they asserted "toggle hidden until ≥1 extension tab is visited"; under D-05 the pre-probe populates `emptyMap` on patient mount, so the click-required precondition no longer holds. Original assertions preserved; only entry conditions refreshed.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] 4 pre-existing Phase-34 hide-empty tests broke under the new D-05 contract**

- **Found during:** Task 1 GREEN (test run after the source modifications landed).
- **Issue:** The 4 tests in `describe('MiiModuleTabs hide-empty toggle (MII-EXT-14, Plan 34-05)', …)` asserted the v1.5 click-required model: "when no extension modules have been visited/emptied, toggle button is NOT rendered" and `await screen.findByText('Onkologie')` (exact text match). Under Phase 42, the pre-probe populates `emptyMap` on patient mount via `useMiiExtensionCounts`, so the toggle now appears WITHOUT any tab click — and the exact-text label is now `Onkologie (0)` (or whatever the resolved count is) once the pre-probe resolves. This is the EXPECTED behavioral change of D-05; the tests were locking in the OLD (now-superseded) contract.
- **Fix:** Updated all 4 tests to reflect the Phase-42 D-05 contract while preserving the original semantic assertions (toggle text format, click-flip behavior, localStorage roundtrip, hide-filtering of empty pills). Used `makeCountClient` with non-zero per-type counts to exercise the "toggle hidden" branch (where every extension module resolves > 0); kept `makeEmptyClient` for the rest. Replaced the now-stale `await screen.findByText('Onkologie')` exact-text matches with `await screen.findByText(/Onkologie/)` regex matches OR removed unnecessary tab-click steps that no longer drive the assertion.
- **Files modified:** `src/components/patients/__tests__/MiiModuleTabs.test.tsx` (the 4 tests in the Plan-34-05 describe block).
- **Verification:** All 10 tests in `MiiModuleTabs.test.tsx` pass; full Vitest suite at 1154 passing (1 pre-existing deuteranopia failure unrelated).
- **Committed in:** `2fab1f3` (Task 1 GREEN commit) — same commit as the source change because the test refresh and the source change co-evolved.

---

**Total deviations:** 1 auto-fixed (1 bug — actually a contract-shift documented in the plan's `<verification>` block as expected: "If any of the 13+ existing tests fail (regression), … investigate; if a snapshot needs updating because the wrapping div is intentional, update the snapshot deliberately and document why.")
**Impact on plan:** Required for the plan to complete (Task 1 acceptance criterion: "Existing 13+ tests in this file MUST stay green"). The Phase-34 tests were testing OBSOLETE behavior superseded by D-05; updating them is the correct fix per Rule 1. The original assertions (toggle text, click-flip, localStorage roundtrip, hide-filter) are all preserved. No scope creep — fix is inside the planned files.

## Issues Encountered

- **Pre-existing test failure: deuteranopia pair #13 (kardiologie ↔ mikrobiologie).** `src/__tests__/visual/deuteranopia.test.tsx` reports `ΔE2000 = 1.406 < 5`. Verified pre-existing on commit `31ce2ed` (worktree base) before any Phase 42-02 changes. Already logged in `.planning/phases/42-pre-probe-extension-module-counts-mii-ext-15/deferred-items.md` from Wave 1. Phase 42 only touches `src/components/patients/MiiModuleTabs.tsx` + tests + a new HUMAN-UAT.md; the deuteranopia matrix is a Phase 40 (DEUT-01) artifact and pair-discriminability tuning belongs to a future Phase 40 follow-up.

## Checkpoint Status (Task 3 — `checkpoint:human-verify`)

**Automated steps:** COMPLETE.

- `npm test -- --run`: 1154 passing / 22 todo / 3 skipped / 1 pre-existing failing (deuteranopia pair #13, scope-out per `deferred-items.md`).
- `npm run build`: exit 0; bundle emitted; tsc -b clean.

**UAT walk:** PENDING (live Blaze required).

The human tester needs to:
1. Start Blaze + load Synthea cohort with at least one Onkologie patient.
2. Run `npm run dev`.
3. Walk UAT-1 → UAT-4 in `42-HUMAN-UAT.md`, filling `Pass/Fail` + `Notes` inline.
4. Flip the frontmatter `status:` from `scaffolded` to `passed` (or `failed` with a gap analysis).
5. Resume the GSD workflow with `approved` (or `fail: UAT-N — {observation}`).

On `approved`, a follow-up agent will commit `docs(42-02): UAT passed — MII-EXT-15 live-Blaze smoke (4/4 cases pass)` and close Wave 2.

## User Setup Required

For the live-Blaze UAT walk: see `42-HUMAN-UAT.md` Prerequisites section (Blaze + Synthea cohort + `npm run dev`). No GSD-managed external services; all setup is documented inline in the UAT file.

## Next Phase Readiness

- Wave 2 source surface complete (assuming UAT passes). After the human resume, Phase 42 is ready for `/gsd-verify-work 42` and `/gsd-finalize-phase 42`.
- No blockers for the verifier; full-suite is green except the pre-existing deuteranopia failure (out of scope).
- Pre-existing deuteranopia pair #13 failure remains and is unrelated to this work.

## Self-Check: PASSED

- File `src/components/patients/MiiModuleTabs.tsx` modified ✓ (`grep -q "useMiiExtensionCounts" src/components/patients/MiiModuleTabs.tsx` exits 0)
- File `src/components/patients/__tests__/MiiModuleTabs.test.tsx` modified ✓ (`grep -q "extension-tab-pill" src/components/patients/__tests__/MiiModuleTabs.test.tsx` exits 0)
- File `.planning/phases/42-pre-probe-extension-module-counts-mii-ext-15/42-HUMAN-UAT.md` created ✓ (`test -f` exits 0)
- Commit `b9ce1b2` (RED) found in `git log` ✓
- Commit `2fab1f3` (GREEN) found in `git log` ✓
- Commit `efcf96d` (UAT scaffold) found in `git log` ✓
- All 6 new tests pass via individual `-t` filters ✓ (`count appends`, `no placeholder`, `base exemption`, `dim on zero`, `pre-probe feeds toggle`, `idempotency`)
- All 10 tests in `MiiModuleTabs.test.tsx` pass ✓
- `npx tsc -b --noEmit` exits 0 ✓
- `npm run build` exits 0 ✓
- All Task 1 acceptance-criteria greps pass: useMiiExtensionCounts present (1), exact import path, called once, extension-tab-pill present, data-empty present, opacity 0.55 present, count?: number present, isEmpty?: boolean present, base render does NOT pass count= ✓
- All Task 2 acceptance-criteria greps pass: file exists, MII-EXT-15-UAT, Synthea Onkologie, ≥3 extension tabs, 0.55 opacity, 4 UAT-N sections, status: scaffolded, covers: [MII-EXT-15-UAT], ≥60 lines (119) ✓

## MII-EXT-15-X Sub-Requirement Coverage

| Sub-Req | Description | Verified By |
|---------|-------------|-------------|
| MII-EXT-15-A | D-01 — Tab pill renders `Onkologie (12)` once count resolves | `count appends to extension tab labels` (5+3+2+1=11; 4+2=6) |
| MII-EXT-15-B | D-02 — Multi-type module shows summed count | Wave 1 hook test `multi-type sum` + Wave 2 component `count appends` (Onkologie's 4 types summed) |
| MII-EXT-15-C | D-03 — While fetching, label is just `Onkologie` | `no placeholder while fetching` |
| MII-EXT-15-D | D-04 — Base 7 receive no count, no testid | `base exemption — base tabs receive no count or testid` (exactly 14 `extension-tab-pill` testids) |
| MII-EXT-15-E | D-05 — `Hide N empty modules` accurate without click | `pre-probe feeds toggle — Hide N modules accurate without click` (`Hide 14 empty modules` on mount) |
| MII-EXT-15-F | D-05 — Idempotent under pre-probe + post-visit | `idempotency — pre-probe + post-visit publisher do not double-count` (count stays at 14 after click) |
| MII-EXT-15-G | D-06 — `data-empty="true"` + `opacity: 0.55` on 0-count pills | `dim on zero — opacity 0.55 + data-empty=true` |
| MII-EXT-15-H | Cancellation on rapid patientId change | Wave 1 hook test `cancelled-flag` (delayed-resolve mock + unmount) + UAT-4 visual confirmation |
| MII-EXT-15-UAT | ≥3 extension tabs show non-zero counts on a real Synthea Onkologie patient | `42-HUMAN-UAT.md` UAT-1 (live Blaze, pending human walk) |

---

*Phase: 42-pre-probe-extension-module-counts-mii-ext-15*
*Wave 2 / Plan 02 — automated portion completed: 2026-04-29*
*Live-Blaze UAT walk: pending human verification*
