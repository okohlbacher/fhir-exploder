# v1.5 Research Summary

Synthesis of [STACK.md](./STACK.md), [FEATURES.md](./FEATURES.md), [ARCHITECTURE.md](./ARCHITECTURE.md), [PITFALLS.md](./PITFALLS.md).

## Executive Summary

v1.5 is a **four-group delta** on a mature codebase (v1.4 shipped 2026-04-23, 836 passing tests, live-Blaze validated): UX-01 external validator cascade, EFF-R14 per-metric `QualityMetricsContext` split, six Phase-30 UAT follow-ups, and the 14 MII Kerndatensatz extension modules. All four research docs converge: **the v1.4 stack already covers ~95% of scope; the only new dependency is one devDep (`fhir-package-loader@^2.2.4`) to script-extract extension-module `StructureDefinition`s at build time**. No runtime packages, no state-management libs, no color libs, no new test tooling.

Recommended approach: execute `29-02-PLAN.md` **verbatim** for UX-01; apply **Option A (seven separate `React.createContext` symbols + `<QualityMetricsProviders>` composer)** for EFF-R14; introduce a **schema widening pattern** (`fhirResourceType: string | string[]` + `category` + per-type override helpers) for the 21-module rollout; ship six mostly-independent UAT fixes. Phase ordering is dictated by two hard dependencies: (a) **EFF-R14 must land before the per-type quality matrix card (UAT #6)**, and (b) **MII schema widening + helper utilities must land before the 14 extension data entries** to prevent silent `.find()` breakage across ~8 call sites.

Highest risks: PHI gate regressions in the validator cascade (D-09 invariant must not be relaxed), concurrent-fetch storms from 22 `keepMounted` tabs on `/patients/:id` (browser 6-per-origin limit + Blaze head-of-line blocking), and compounding test-baseline maintenance cost (29.5-style repairs if providers aren't wrapped in a composer). All three have locked mitigations below.

---

## Locked Decisions (cross-document agreement)

| Decision | Lock reason | Source |
|---|---|---|
| **Exactly one new devDep: `fhir-package-loader@^2.2.4`** (Apache-2.0, Node-only, build-time) | npm + packages.fhir.org verified; nothing else needed | STACK §Bottom Line |
| **Zero new runtime deps** | Native `fetch` + `AbortController` locked by 29-02 test contract; per-metric context = vanilla React; color = Mantine custom tuples | STACK §What NOT to Add; PITFALLS #19 |
| **UX-01 = execute `29-02-PLAN.md` verbatim** (three-tier cascade, 15s timeout, probe cache, PHI gate extraction, `normalizeOperationOutcomeIssue`, active-strategy line) | Plan pre-litigated with D-07..D-16; all four docs concur | FEATURES §1.a; ARCHITECTURE Q3; PITFALLS #1-6 |
| **EFF-R14 = Option A, seven `createContext` symbols + `<QualityMetricsProviders>` composer** (NOT `useSyncExternalStore`, NOT selector libs, NOT Zustand/Jotai) | PROJECT.md locks Option A; STACK rejects state libs on design grounds | STACK §EFF-R14; ARCHITECTURE Q2; PITFALLS #7-10 |
| **Providers at `QualityLayout` level, never co-located with panels** | State must survive tab switches | ARCHITECTURE Q2; PITFALLS #9 |
| **Facade `useQualityMetrics()` preserved** — consumers migrate opt-in per tile | PdfReportLayout + capture-snapshot use bulk reads | ARCHITECTURE Q2 |
| **Keep 7 base module colors unchanged** (blue/indigo/teal/violet/pink/cyan/orange) | Muscle memory; Phase 30 tokens locked | ARCHITECTURE Q6 |
| **Extension colors: 7 custom `MantineColorsTuple`s on `createTheme()`** (NOT runtime color libs; one-off `npx wcag-contrast` audit during design) | Design-time task, not runtime behavior | STACK §Color Strategy; PITFALLS #15 |
| **MII schema: `fhirResourceType: string \| string[]` + `category: 'base' \| 'extension'` + `patientSearchParamOverrides?: Record<string,string>` + `extraQuery?: Record<string,string>`** | All four shapes surfaced by call-site analysis | ARCHITECTURE Q1/Q5; PITFALLS #12-14 |
| **Helper utilities shipped BEFORE schema widening** (`getTypesForModule`, `findModuleForType`, `getPatientSearchParamForType`, `getExtraQueryForType`) | TS cannot flag `===` on `string` vs `string \| string[]`; only codemod prevents silent breakage | PITFALLS #13 |
| **Collapsible "Extension modules" section defaults CLOSED; auto-expand if activeTab is extension key** | Discoverability + first-paint perf | ARCHITECTURE Q4; FEATURES §2.a |
| **Extension tabs DROP `keepMounted`; base 7 keep it** | 22 concurrent FHIR searches = 3-5s TTI degradation | PITFALLS #11 |
| **Empty-state: visible + dimmed (0.55 opacity) + specific copy + "Show N empty" toggle** (NOT auto-hide) | "Browse the ecosystem" core value; matches Phase 30 Dashboard MII pattern | FEATURES §5; PITFALLS #16 |
| **Probe cache: per-session `useRef<Map>` inside `useConformanceRun`; reset on Validate-sample click AND on settings change; include `externalValidatorUrl` in key** | Per-run isolation; invalidation on settings mismatch | ARCHITECTURE Q3; PITFALLS #2 |
| **Bundled extension profiles under `src/quality/profiles/extensions/` — CC-BY-4.0, attribution in `ATTRIBUTION.md`** | Mirrors v1.0 Phase 5 pattern; license verified | STACK §2 |
| **Pre-GA MII packages bundled as-latest-available** (Kardiologie `2026.0.0-alpha.2`, Symptom `2024.0.0-ballot`) with graceful empty-state | Upgrade-safe version-string change | STACK §2 |

---

## Phase Ordering Constraints (Hard Dependencies)

1. **EFF-R14 (Phase 32) → Per-type quality matrix (UAT #6, Phase 35).** Matrix has 50×7=350 cells; without per-metric isolation → jank. [PITFALLS #17]
2. **MII helpers → schema widening → 14 extension entries.** Ship helpers first (mechanical refactor, no behavior change), then widen schema, then add data. [PITFALLS #13]
3. **UAT #4 (empty per-patient panel investigation) → MII extension rollout.** UAT #4 likely exposes a `patient=` vs `subject=` bug applicable to base modules; fix pattern propagates. [PITFALLS #14]
4. **UAT #5 (Dashboard MII tile scoping) → MII extension rollout.** Decision for 7 base tiles applies to 14 extensions. [ARCHITECTURE Q7]

**Parallel-safe:** UX-01 is independent of everything else. Phase-30 UAT #1/#2/#3 have no inter-dependencies.

**Merge-conflict watch:** Both UX-01 and EFF-R14 touch `ValidationPanel.tsx`. Recommend UX-01 ships first, EFF-R14 rebases — OR one engineer owns the panel surface.

---

## Key Findings

### Stack — see [STACK.md](./STACK.md)
v1.4 stack sufficient + `fhir-package-loader@^2.2.4` devDep for MII extension profile extraction. Explicit rejections with rationale: `zustand`/`jotai`/`use-context-selector` (vanilla React suffices); `axios`/`ky` (duplicates MedplumClient auth + breaks `vi.spyOn(global,'fetch')` contract); `chroma-js`/`colorizr` runtime (design-time task only); `msw` (forks mocking); Mantine 9 (requires React 19).

### Features — see [FEATURES.md](./FEATURES.md)
**P1 (launch v1.5):** UX-01 full cascade (9 items from 29-02-PLAN); EFF-R14 split; per-type quality matrix; 14 extension entries + collapsible + dashboard partition; 21-color + Tabler-icon palette; empty-state UX; all 6 Phase-30 UAT follow-ups.
**P2:** "Test connectivity" button; pre-probe extension counts; auto-select most-data extension.
**P3:** CSV export; heat-column gradient; IPS `emptyReason`; semantic near-miss detection; validator auth.
**Anti-features rejected:** auto-populate `validator.fhir.org`; local full FHIR validator in browser; retry-with-backoff on 5xx; all 21 tabs flat; auto-hide empty (destroys discoverability); rainbow palette; emoji icons.

### Architecture — see [ARCHITECTURE.md](./ARCHITECTURE.md)
Seven file:line-verified questions answered. 6 MII consumer sites enumerated; 7 EFF-R14 producers + 3 multi-metric consumers mapped; UX-01 lands 6 new files + 6 modified; probe cache = `useRef<Map>` in `useConformanceRun`; two `Tabs.List`s inside one `<Tabs>` context is safe; multi-type patient search param = per-type override map (Option A preferred).

### Top-5 Pitfalls — see [PITFALLS.md](./PITFALLS.md) for all 20

1. **PHI gate bypass via refactoring** (#3) — future batching could hoist `isPhiAcknowledged` out of per-resource loop; revocation mid-run leaks PHI. **Prevent:** re-evaluate gate before EVERY outbound fetch. 29-02 Task 1 Test 4 + Task 4 Test 2 LOCK this.
2. **22 concurrent FHIR searches on `/patients/:id`** (#11) — `keepMounted` × 21 tabs blows 6-per-origin limit + Blaze thread-pool saturation; TTI 5× degradation. **Prevent:** extension tabs drop `keepMounted`; collapse closed by default; count-only `_summary=count` on expand.
3. **MII schema-widening silent breakage** (#13) — TS can't flag `===` between `string` and `string | string[]`. **Prevent:** ship helpers first (one commit), migrate call sites (second commit), widen schema (third).
4. **Probe cache not invalidated on settings change** (#2) — URL swap causes silent demote to `server`. **Prevent:** reset probe on settings change + always-fresh on "Validate sample" click; include `externalValidatorUrl` in key.
5. **EFF-R14 re-subscription loops** (#8) — missing `useMemo` on any provider value → "Maximum update depth exceeded". **Prevent:** `src/quality/metrics/_template.tsx` copied verbatim per provider; smoke test asserts no Max-Update-Depth.

Additional high-value pitfalls: #1 AbortSignal not threaded through server tier; #5 severity drift across HAPI/Firely/IG-Publisher; #6 CORS root-cause surfacing; #7 shared context symbol → silent 7/8 data loss; #10 test-setup cascade; #15 color collision 14 vs 21; #19 design token drift; #20 deuteranopia 21→12 perceptual collapse.

---

## Implications for Roadmap

Five phases over ~3-4 engineering weeks:

### Phase 31 — UX-01 External Validator Cascade (parallel-safe)
**Rationale:** Zero file overlap with EFF-R14 or MII work; `29-02-PLAN.md` pre-litigated.
**Delivers:** `cascadingValidator.ts`, `phiGate.ts`, `normalizers.ts`; active-strategy status line; settings schema; probe cache in `useConformanceRun`; blue timeout toast.
**Avoids:** PHI gate bypass (#3); probe cache staleness (#2); AbortSignal threading through server tier (#1); CORS root-cause surfacing (#6); normalizer severity-drift test matrix (#5).
**Research flag:** LOW — plan pre-litigated.

### Phase 32 — EFF-R14 QualityMetricsContext Split (parallel-safe; blocks Phase 35 matrix)
**Rationale:** Internal refactor, API-preserving via facade. Unblocks UAT #6.
**Delivers:** 7 per-metric providers under `src/quality/metrics/`; `<QualityMetricsProviders>` composer at `QualityLayout`; producer migrations; `OverviewStrip` + tab-label consumers migrated.
**Avoids:** shared context symbol (#7); missing memoization (#8); panel co-location (#9); test-wrap explosion (#10) — composer ships as Task 1.
**Research flag:** LOW — textbook React Context pattern.

### Phase 33 — MII Schema Foundation + Extension-Modules Collapse UI
**Rationale:** Mechanical codemod phase; no new data yet.
**Delivers:** helpers (`fhirResourceTypesOf`, etc.); schema widening; `MiiModuleTab` fans out per-type via `Promise.all`; `MiiModuleTabs` partition + `<Collapse>`; Dashboard MII tile partition.
**Avoids:** silent `.find()` breakage (#13); `extraQuery` collapse on multi-type (#12). Includes UAT #4 investigation pre-task.
**Research flag:** MEDIUM — codemod may surface additional patterns; `grep -rn "fhirResourceType" src/` audit is a pre-task.

### Phase 34 — 14 MII Extension Modules + Palette + Bundled Profiles
**Rationale:** Data rollout; schema locked, helpers exist, UI shell exists.
**Delivers:** 14 entries with per-type overrides; `scripts/fetch-mii-profiles.mjs` + `prepare` lifecycle; 7 custom `MantineColorsTuple`; 21 Tabler icons; dimmed empty-state + toggle + "Check on server" link; CC-BY-4.0 attribution.
**Avoids:** color collision (#15); deuteranopia failure (#20); concurrent-fetch storm (#11); empty clutter (#16); per-type `patientSearchParam` mismatch (#14).
**Research flag:** HIGH — per-module research needed against live MII IGs; color palette seed audit (`.planning/research/color-design-audit.md`).

### Phase 35 — Phase-30 UAT Follow-ups + Per-Type Quality Matrix
**Rationale:** Depends on Phase 32 (matrix) and Phase 33 (UAT #4/#5 propagation). Smaller plans; split freely.
**Delivers:** UAT #1 Explorer Date/Status per-type extractor; UAT #2 HumanReadableView cleanup; UAT #3 mode removal + Developer→JSON rename; UAT #4 fix; UAT #5 scope/label; UAT #6 per-type matrix (7 sortable columns, drill-down).
**Avoids:** UAT #1 test-baseline drift (#18) — TDD with single commits; matrix-before-EFF-R14 ordering (#17); token drift (#19).
**Research flag:** LOW — UAT gaps well-scoped; matrix follows OverviewStrip patterns.

### Cross-Cutting VERIFY (every phase)
- Design token compliance grep (no hardcoded hex or `color="indigo"` outside Mantine theme primitives)
- Test baseline preserved (836 passing / 0 failed)
- `npm run build` clean
- Live-Blaze UAT per phase

---

## Conflicts / Tensions Resolved

| Tension | Resolution |
|---|---|
| **Color granularity** — STACK hand-picked tuples; FEATURES category+icon; ARCHITECTURE 3-tier; PITFALLS category-based | **Tier 3 from the start: color + Tabler icon per module.** Category-color as hue-assignment algorithm (5-7 categories → 7 hues → 21 modules distinguished by icon+label). |
| **Empty-state default** — ARCHITECTURE dimmed-visible; PITFALLS #16 auto-hide w/ toggle | **Dimmed-visible wins** (FEATURES §5.c explicitly calls auto-hide an anti-feature). Reconcile via "Show N empty" toggle. |
| **Probe cache scope+key** — ARCHITECTURE `useRef<Map>` per-session; PITFALLS key includes `externalValidatorUrl` | **Both**: `useRef<Map>` scope + 3-tuple key `(serverUrl, externalValidatorUrl, resourceType)`. |
| **Dashboard MII partition** — FEATURES Option (b) base+extension sections; ARCHITECTURE partition-or-toggle; UAT #5 per-patient vs server-wide | **Partition by category AND decide scoping in Phase 35 UAT #5** — orthogonal decisions. |
| **Normalizer severity policy** — PITFALLS #5: do NOT auto-normalize across validators | **Record `validatorVariant`, surface in UI** ("Active strategy: external (HAPI)"); per-variant normalizer fixtures added to Task 2 tests. |

No hard conflicts — docs amend, not contradict.

---

## Confidence Assessment

| Area | Confidence | Notes |
|---|---|---|
| Stack | **HIGH** | npm + packages.fhir.org verified 2026-04-23; peerDeps inspected in `/node_modules`; CC-BY-4.0 on Simplifier verified. |
| Features | **HIGH/MEDIUM** | HIGH for UX-01 + matrix; MEDIUM for 21-module taxonomy (per-module FHIR-type arrays inferred) + 21-color strategy (design decision). |
| Architecture | **HIGH** | Every integration claim file:line-verified. |
| Pitfalls | **HIGH/MEDIUM** | HIGH for code-grounded (#1,2,7,8,10,11,12,13,15,16,17,18,19); MEDIUM-HIGH for analytical (#3,4,9,14,20); MEDIUM for per-vendor (#5,6). |

**Overall confidence: HIGH.** Bounded delta on mature code; research anchored in live code + live registries.

### Gaps to Address During Requirements

1. **Per-module `patientSearchParam` + `extraQuery` + `fhirResourceType` array for 14 extensions** — Phase 34 pre-task; parallel research deliverable.
2. **Color palette seeds** — 7 custom hexes need design sign-off in `.planning/research/color-design-audit.md` (one-off Chrome deuteranopia pass).
3. **`prebuild:profiles` script placement** — `build` only or `prepare` lifecycle? Recommend `prepare` for fresh-clone test reliability.
4. **Dashboard MII tile scoping** (per-patient vs server-wide) — Phase 35 UAT #5 decision; propagates to 21 tiles.
5. **Auto-expand Collapse on deep-link** — recommend YES per ARCHITECTURE Q4; UX sign-off.
6. **Facade deprecation timeline** — recommend keep indefinitely (PDF export + snapshot capture need bulk reads).
7. **Pre-GA MII package policy** — recommend bundle-with-warning.
8. **CORS documentation depth** — one-page "External Validator Setup Guide" or inline settings.yaml comments?

---

## Sources (aggregated)

### Primary (HIGH)
- **npm registry `npm view`** (verified 2026-04-23): `fhir-package-loader@2.2.4`, `@mantine/core@8.3.18`+`9.1.0`, `@medplum/*@5.1.7`, `use-context-selector@2.0.0`, `zustand@5.0.12`, `jotai@2.19.1`
- **packages.fhir.org** (verified 2026-04-23): all 14 MII extension package versions + CC-BY-4.0
- **Installed declarations:** `@mantine/core/.../theme.types.d.ts:DefaultMantineColor`, `@medplum/react/package.json:peerDependencies`
- **In-repo file:line:** `src/utils/mii-modules.ts`, `src/quality/QualityMetricsContext.tsx`, `src/components/quality/ValidationPanel.tsx`, `src/components/patients/MiiModuleTabs.tsx`, `src/hooks/useConformanceRun.ts`, `.planning/phases/29-backlog-ux/29-02-PLAN.md`, `.planning/phases/30-layout-redesign/30-UAT.md`
- **FHIR R4 specs:** resource-operation-validate, CapabilityStatement, IPS Empty-Sections
- **Mantine docs:** theming/colors, colors-generator
- **CC BY 4.0 Deed**

### Secondary (MEDIUM)
- MII Simplifier + `build.fhir.org/ig/medizininformatik-initiative/` pages
- Firely Simplifier Validator Playground; HAPI Tester; Inferno; Touchstone
- Epic Chart Review / Cerner PowerChart / Medplum Chart Demo UI patterns
- Great Expectations / dbt-expectations / Soda / OpenRefine DQ dashboards
- Glasbey, Tableau 20, arXiv 2107.02270 color-blind-safe palettes

### Tertiary (LOW)
- Per-validator severity drift (analytical from FHIR R4 §OperationOutcome)
- Vendor UI patterns (not publicly documented in depth)
- Public validator CORS configurations (deterministic browser behavior; per-validator config not verified)
