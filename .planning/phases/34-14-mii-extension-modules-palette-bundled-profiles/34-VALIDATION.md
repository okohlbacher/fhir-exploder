---
phase: 34
slug: 14-mii-extension-modules-palette-bundled-profiles
status: complete
nyquist_compliant: true
wave_0_complete: true
created: 2026-04-24
re_audited: 2026-04-29
re_audited_by: phase-39
notes: |
  Retroactively flipped from `nyquist_compliant: false` on 2026-04-29 under
  Phase 39 NYQ-01. Phase 34 shipped 998 passing / 0 failing (baseline 902
  → 998, +56 over Phase 33 baseline; per 34-06-SUMMARY.md "D-24 test count"
  gate). Per-REQ coverage: MII-EXT-09..14 covered via the 21-module
  data drop in MII_MODULES + ICON_MAP / resolveMiiIcon helper, exercised
  across src/__tests__/mii-modules.test.ts (extension-category schema +
  multi-profile fhirResourceType array variants), src/components/patients/__tests__/MiiModuleTab.test.tsx
  (extension-category empty-state + opacity 0.55 dimming), src/components/dashboard/__tests__/
  (21-tile palette rendering with new MantineColorsTuple custom colors),
  and the lazy-load follow-up (Phase 36) that closed MII-EXT-12. Wave-0 +
  per-task table unchanged. status flipped draft → complete (Phase 34
  shipped 2026-04-25).
---

# Phase 34 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | vitest (`vitest@^3`) + `@testing-library/react@^16` (existing) |
| **Config file** | `vitest.config.ts` (existing) |
| **Quick run command** | `npx vitest run src/__tests__/mii-modules.test.ts src/components/patients/__tests__/MiiModuleTab.test.tsx` |
| **Full suite command** | `npx vitest run && npx tsc -b --noEmit` |
| **Estimated runtime** | ~10 s (quick) / ~30 s (full — 900+ tests + tsc) |

---

## Sampling Rate

- **After every task commit:** Run the quick command (targeted files for that plan)
- **After every plan wave:** Run the full suite command
- **Before `/gsd-verify-work`:** Full suite must be green, `tsc -b --noEmit` must exit 0
- **Max feedback latency:** 30 s

---

## Per-Task Verification Map

(Filled after `gsd-planner` produces task IDs. Each row maps a task to a verifiable artifact.)

| Task ID | Plan | Wave | Requirement | Threat Ref | Secure Behavior | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|------------|-----------------|-----------|-------------------|-------------|--------|
| TBD-per-plan-output | … | … | MII-EXT-09..14 | — | N/A (local-first, no new attack surface) | unit + snapshot + artifact | see per-plan `<acceptance_criteria>` | — | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

- [ ] `.planning/research/color-design-audit.md` — per-module IG URL + version + icon + palette-family + WCAG ratio + deuteranopia screenshots (written by plan 34-01, blocks 34-02..34-05)
- [ ] `src/__tests__/mii-modules.test.ts` — extended D-17 contract table (Phase 33) now expects 21 module rows + per-type `(module, type)` assertions
- [ ] `scripts/fetch-mii-profiles.test.mjs` — smoke test with mocked `fhir-package-loader` + trim-shape assertion (written by plan 34-03)

---

## Validation Dimensions (Nyquist)

### 1. Input Validation
- `scripts/fetch-mii-profiles.mjs` tolerates package fetch failure (returns warn, exits 0); does NOT retry on 4xx, only on network error.
- `MiiModuleTab.tsx` `resources` array is already validated by Phase 33 fan-out contract — Phase 34 does not add inputs.
- `localStorage.patients.hideEmptyExtensions.v1` parse is defensive — any non-object falls back to empty object (VISIBLE default).

### 2. Output Validation
- Trimmed profile JSONs conform to shape `{ url, name, type, snapshot.element[{path, min, max, mustSupport}] }` — snapshot-test per-file in `fetch-mii-profiles.test.mjs`.
- `theme.colors` includes 7 new keys (`oncology`, `imaging`, `genetics`, `pathology`, `bioanalysis`, `administration`, `patient-reported`); palette-snapshot test locks.
- `MII_MODULES.length === 21`; `mii-modules.test.ts` locks.
- 14 extension modules each have `icon: string`, `category: 'extension'`, `badgeColor` from the new palette family set.

### 3. State Management
- `useDisclosure(false)` for Phase 33 "Show extension modules" is preserved (session-only).
- New `useLocalStorage<Record<string, boolean>>('patients.hideEmptyExtensions.v1', {})` for per-patient dim-toggle persistence.
- Hydration: missing/null → `{}` → all visible at 0.55 opacity (default).

### 4. Error Handling
- Fetch failure: `console.warn('[mii-profiles] fetch failed for <package>: <reason>')` + exit 0.
- Pre-GA: `console.info('[mii-profiles] bundling pre-GA <package>@<version>')`.
- Missing profile at runtime: the extension registry returns `undefined` → completeness walker (from Phase 5) silently skips — existing behavior preserved.

### 5. Integration Points
- `src/theme.ts` extends `colors:` — no new imports beyond `MantineColorsTuple` type.
- `src/quality/profiles/index.ts` extends export to include `EXTENSION_REGISTRY` (URL-keyed) alongside existing type-keyed `REGISTRY`.
- `src/utils/mii-modules.ts` `MII_MODULES` array appends 14 rows after the base 7 (Phase 33 append-only invariant).
- `src/components/patients/MiiModuleTab.tsx` wraps existing panel in `opacity: isEmpty ? 0.55 : 1` (no fan-out change).
- `src/components/patients/MiiModuleTabs.tsx` and/or `src/components/patients/MiiModuleTab.tsx` gain "Hide N empty modules" affordance (final placement at planner's discretion per D-26).
- `src/components/patients/ClinicalTimeline.tsx` + `src/components/dashboard/DashboardPage.tsx` render `module.icon` at render sites from D-07.

### 6. Performance
- Time-to-Interactive on `/patients/:id` unchanged from v1.4 baseline (D-22 — Chrome DevTools Performance snapshot).
- Bundle-size delta <100 KB post-gzip (D-23 — `rollup-plugin-visualizer@^7.0.1` treemap before/after).
- `keepMounted` invariant preserved (Phase 33 D-11): extension tabs do NOT fetch until clicked.

### 7. Security
- Zero new runtime attack surface: `fhir-package-loader` is devDep only; trimmed JSONs are static at build time.
- CC-BY-4.0 attribution committed in `src/quality/profiles/extensions/ATTRIBUTION.md` + LICENSE appendix — no legal exposure from bundling.
- `localStorage` key `patients.hideEmptyExtensions.v1` is opaque JSON — no PHI, no auth tokens.

### 8. Acceptance Artifacts (research-derived)
- Deuteranopia screenshots (Dashboard tile grid, Patient detail tab row, Timeline fixture) → `.planning/research/color-design-audit.md` §deuteranopia
- WCAG AA contrast audit per palette/shade-6 combination → `.planning/research/color-design-audit.md` §wcag
- TTI before/after snapshots → `.planning/phases/34-14-mii-extension-modules-palette-bundled-profiles/tti-snapshot.json`
- Bundle-size treemaps → `.planning/phases/34-14-mii-extension-modules-palette-bundled-profiles/visualizer-{before,after}.html`

---

## Owner

- Planner: fills per-task rows in the Verification Map after PLAN.md files are produced.
- Executor: updates Status column as each task commits.
- Verifier: confirms all rows ✅ before `/gsd-verify-work` can pass Phase 34.
