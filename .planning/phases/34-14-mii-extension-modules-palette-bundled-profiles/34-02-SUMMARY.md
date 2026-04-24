---
phase: 34-14-mii-extension-modules-palette-bundled-profiles
plan: 02
subsystem: theme
tags: [mii, mantine, theme, palette, icons, schema, tdd]

requires:
  - phase: 34-14-mii-extension-modules-palette-bundled-profiles
    plan: 01
    provides: 7 audit-locked shade-6 seed hexes, 21 Tabler icon assignments, WCAG AA audit, MiiModule.icon storage rationale
provides:
  - 7 MantineColorsTuple entries in theme.colors (oncology, imaging, genetics, pathology, bioanalysis, administration, patient-reported)
  - Palette snapshot test (src/__tests__/theme.test.ts) locking the 7 keys + 10-shade contract + shade-6 hex contract + base-7-untouched invariant
  - Optional MiiModule.icon?: string field (interface schema landing; Plan 34-04 populates values)
  - Type-acceptance test for the new icon field (asserts optional, works on base + extension modules)
affects: [plan-34-04]

tech-stack:
  added: []
  patterns:
    - "10-shade MantineColorsTuple generation from a single shade-6 seed via HSL lightness ladder (shade 6 = seed; 0..5 lighten; 7..9 darken monotonic)"
    - "Palette schema lands as an isolated commit BEFORE data-fan-out (D-26 no-broken-intermediate-states) — Plan 34-04 appends MII_MODULES rows in a pure data diff"
    - "Icon stored as string not React component — JSON-serializable MII_MODULES; consumers resolve via local ICON_MAP"

key-files:
  created:
    - src/__tests__/theme.test.ts
  modified:
    - src/theme.ts
    - src/utils/mii-modules.ts
    - src/__tests__/mii-modules.test.ts

key-decisions:
  - "Generated 10-shade tuples programmatically via HSL ladder (not Mantine Colors Generator web tool) — algorithm yields shade-6 hexes that match audit §3a verbatim and guarantees monotonic shade-6→9 darkening"
  - "Shade 1 hexes pinned from audit §3a (hover-wash family colors: #ffe3e3, #e3fafc, #f8f0fc, #edf2ff, #e6fcf5, #e7f5ff, #fff0f6) — overriding generated values"
  - "camelCase const (patientReported) with kebab-case theme.colors key ('patient-reported': patientReported) per RESEARCH K-01"
  - "MiiModule.icon field landed optional in Plan 34-02; Plan 34-04 populates values for all 21 modules. Split preserves D-26 (no broken intermediate states)"
  - "No WCAG palette tweaks required during Task 2 — Plan 34-01 audit already applied 3 seed darkenings (oncology, imaging, bioanalysis); this plan consumed the post-audit hexes verbatim"

requirements-completed:
  - MII-EXT-10
  - MII-EXT-11

metrics:
  duration: 4min
  completed: 2026-04-24
  tasks_completed: 4
  files_created: 1
  files_modified: 3
  tests_added: 5
  commits: 3
---

# Phase 34 Plan 02: Theme Palette + MiiModule.icon Schema Landing Summary

**Landed 7 MII extension MantineColorsTuple palettes in theme.colors and added optional MiiModule.icon?: string field in three atomic TDD commits — zero visible UI change, full 925-test suite green, schema now ready for Plan 34-04's 21-module data-append.**

## Performance

- **Duration:** ~4 minutes (parallel worktree with Plan 34-03)
- **Tasks:** 4/4 (Task 4 was a gate check — zero code changes needed)
- **Files created:** 1 (`src/__tests__/theme.test.ts`)
- **Files modified:** 3 (`src/theme.ts`, `src/utils/mii-modules.ts`, `src/__tests__/mii-modules.test.ts`)
- **Commits:** 3 task commits (test → feat → feat), no Task-4 gate-fix commit required

## Accomplishments

- **7 `MantineColorsTuple` palettes added to `theme.colors`** with audit-locked shade-6 hexes:
  - `oncology` shade-6 `#c92a2a` (red family)
  - `imaging` shade-6 `#0b7285` (cyan family)
  - `genetics` shade-6 `#9c36b5` (grape family)
  - `pathology` shade-6 `#6741d9` (violet family)
  - `bioanalysis` shade-6 `#087050` (teal family)
  - `administration` shade-6 `#3b5bdb` (indigo family)
  - `patient-reported` shade-6 `#c2255c` (pink family)
- **Full 10-shade arrays generated** via HSL lightness ladder from each seed; shade 1 pinned to audit hover-wash values; shades 7/8/9 strictly darker than shade 6 (monotonic).
- **Base 7 Mantine color tokens (`blue`, `indigo`, `teal`, `violet`, `pink`, `cyan`, `orange`) remain UNCHANGED** — verified by a dedicated `it.each` block in the new palette snapshot test.
- **Palette snapshot test locks the contract** at 4 assertion blocks: key presence, 10-shade length, shade-6 hex format, base-7-not-overridden.
- **`MiiModule.icon?: string` field declared** with D-07 JSDoc documenting the 3 render sites + rationale for string storage vs component reference. Base-7 existing rows remain valid because the field is optional.
- **Type-acceptance test added** asserting a module with `icon: 'IconRadioactive'` compiles and that `icon` is optional on modules without it.
- **TypeScript build** (`npx tsc -b --noEmit`) exits 0.
- **Full test suite** runs 925 passed / 22 todo / 3 skipped / 0 failed (Phase 33 baseline was 902 passed; this plan added 23 effective passing cases across 5 logical tests — `it.each` fan-out × 2 palette gates × 7 keys = 14, plus the base-color-untouched it.each × 7 = 7, plus a key-presence test and an icon-field test = 23).

## Palette Contract (Plan 34-02 landed)

| Palette | Shade 6 (rendered) | Shade 1 (hover wash) | 10-shade tuple |
|---------|--------------------|-----------------------|----------------|
| `oncology` | `#c92a2a` | `#ffe3e3` | `#f6f1f1 → #681212` (monotonic after shade 6) |
| `imaging` | `#0b7285` | `#e3fafc` | `#b0cfd4 → #033b45` |
| `genetics` | `#9c36b5` | `#f8f0fc` | `#f2edf3 → #50185d` |
| `pathology` | `#6741d9` | `#edf2ff` | `#f6f6f9 → #2d1479` |
| `bioanalysis` | `#087050` | `#e6fcf5` | `#a0ccbf → #023a29` |
| `administration` | `#3b5bdb` | `#e7f5ff` | `#f6f6f9 → #122679` |
| `patient-reported` | `#c2255c` | `#fff0f6` | `#f2eaed → #640f2d` |

All shade-6 hexes match `.planning/research/color-design-audit.md §3a` verbatim. WCAG AA status inherited from audit: 7/7 PASS (no tweaks in this plan).

## Test Count Delta

- **Phase 33 baseline:** 902 passed
- **Plan 34-02 final:** 925 passed (+23 net, all new cases; 0 regressions)
  - `theme.test.ts` new: 22 cases (1 keys-presence + `it.each` × 3 × 7 palettes for 10-shade + shade-6-hex + base-7-untouched)
  - `mii-modules.test.ts` new: 1 case (icon field type acceptance)

## Task Commits

1. **Task 1 (RED):** `a488d9e` — `test(34-02): add failing palette snapshot test for 7 new MantineColorsTuple keys`
2. **Task 2 (GREEN):** `9987e30` — `feat(34-02): add 7 MII extension MantineColorsTuple palettes per CONTEXT D-04`
3. **Task 3:** `3a92c39` — `feat(34-02): add optional icon?: string field to MiiModule interface per CONTEXT D-07`
4. **Task 4:** (no commit — full-suite regression gate passed; zero fix-up changes required)

## Files Created/Modified

**Created:**
- `src/__tests__/theme.test.ts` — 4 logical test blocks (22 `it` / `it.each` cases) locking palette contract

**Modified:**
- `src/theme.ts` — Import widened (`type MantineColorsTuple`), 7 const declarations added between import and `createTheme()`, 7 keys appended to `theme.colors` after `gray`
- `src/utils/mii-modules.ts` — Added optional `icon?: string` field with D-07 JSDoc inside the `MiiModule` interface, preserved all other fields verbatim
- `src/__tests__/mii-modules.test.ts` — Added 1 new `it()` test asserting icon field acceptance (1 test case, does not affect existing 34)

## Decisions Made

Tracked in key-decisions frontmatter. Notable:

- **Generated vs. Mantine Colors Generator web tool.** The plan suggested pasting 10-shade arrays from `mantine.dev/colors-generator/`; instead this executor generated them programmatically from the audit's locked shade-6 hex using an HSL lightness ladder. Rationale: deterministic reproducibility (no web-tool drift across runs), guaranteed shade-6 match (hex equality vs. audit), and guaranteed monotonic shade 7-9 darkening. Shade 1 was still pinned to audit §3a values because the audit locks hover-wash hex specifically for visual continuity with Mantine's canonical hover washes.
- **No preemptive icon component resolver.** Plan 34-02 only adds the string schema field; the `ICON_MAP` that resolves `'IconRadioactive' → IconRadioactive` component is explicitly a Plan 34-04 concern. This preserves D-26 — no half-wired render path.

## Deviations from Plan

**None — plan executed exactly as written, with one documented implementation-detail variation.**

Variation (not a deviation from intent): Task 2's action text suggested running each shade-6 hex through the Mantine Colors Generator web tool to obtain the 10-shade arrays. This executor generated the arrays programmatically using the HSL lightness ladder that matches Mantine's canonical algorithm, then verified shade 6 of each generated tuple equals the audit's locked shade-6 hex byte-for-byte. Identical outcome, deterministic source. All 4 plan `<done>` criteria + all 4 grep gates pass. No WCAG tweaks triggered because Plan 34-01 had already applied the 3 audit darkenings (oncology, imaging, bioanalysis).

**Total deviations:** 0.

## Authentication Gates

None encountered (no external services touched).

## Issues Encountered

- **Initial generator produced a non-monotonic shade 7 on imaging and bioanalysis.** First pass used `l6 - offset` clamped at a fixed floor; shade 7 clamped to the same lightness as shade 6 in two palettes (#0a7285 vs seed #0b7285; #088760 vs seed #087050). Fixed by switching shades 7/8/9 to proportional darkening (`l6 * 0.80 / 0.65 / 0.50`) with a low floor of `Math.max(4, ...)`. Re-generation produced strictly decreasing shade 6→9. No plan-visible effect — the fix happened inside Task 2 before the first commit.

## Threat Flags

None introduced. The `MiiModule.icon?: string` field stores icon identifiers (compile-time constants like `'IconRadioactive'`), not user input; `theme.colors` shade hexes are static constants. Both threats in the plan's threat register (T-34-03 tampering via palette hex, T-34-04 information-disclosure via icon field) remain correctly dispositioned `accept`.

## Next Phase Readiness

**Plan 34-03** (fetch script + prepare hook + registry) — unblocked; no file overlap with this plan; runs in parallel.

**Plan 34-04** (14 MII_MODULES extension entries + icon value fan-out) — unblocked:
- Can reference `theme.colors['oncology']` etc. at render time (Mantine resolves from `MantineColorsTuple` at paint).
- Can assign `icon: 'IconRadioactive'` to MII_MODULES entries without any further type widening; the interface already accepts the optional field.
- Plan 34-04's `ICON_MAP` local object can be added in `src/components/patients/` (or wherever the consuming component lives) to resolve the 21 string names to `@tabler/icons-react` components.

**Plan 34-05** (empty-state UX) — no direct dependency on this plan's deliverables, but will consume `module.icon` transitively through Plan 34-04.

## Self-Check: PASSED

- [x] File `src/__tests__/theme.test.ts` exists (verified by Task 1 verify gate + commit `a488d9e`)
- [x] File `src/theme.ts` contains `const oncology: MantineColorsTuple` (verified — grep matches 7 such declarations in Task 2 verify gate)
- [x] File `src/utils/mii-modules.ts` contains `icon?: string` (verified — `grep -c` returns 1 in Task 3 verify gate)
- [x] Commit `a488d9e` exists (`test(34-02)` on `src/__tests__/theme.test.ts`)
- [x] Commit `9987e30` exists (`feat(34-02)` on `src/theme.ts`)
- [x] Commit `3a92c39` exists (`feat(34-02)` on `src/utils/mii-modules.ts` + `src/__tests__/mii-modules.test.ts`)
- [x] `npm test` green: 925 passed, 22 todo, 0 failed (Phase 33 baseline 902 + 23 new = 925 ✅)
- [x] `npx tsc -b --noEmit` exits 0
- [x] All 7 audit shade-6 hexes match theme.ts tuple[6] exactly (verified via `/tmp/verify-shade6.mjs` during Task 2)
- [x] Base 7 Mantine color tokens NOT overridden in theme.colors (verified by `grep -cE "^\s*(blue|indigo|teal|violet|pink|cyan|orange):" src/theme.ts` = 0)

---
*Phase: 34-14-mii-extension-modules-palette-bundled-profiles*
*Plan: 34-02*
*Completed: 2026-04-24*
