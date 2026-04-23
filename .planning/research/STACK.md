# Stack Research — v1.5 Validation, Performance & MII Extensions

**Domain:** Subsequent-milestone delta on an existing, shipped FHIR Exploder (React 18 + Vite 8 + Mantine 8 + Medplum 5 + TS 5.7)
**Researched:** 2026-04-23
**Overall confidence:** HIGH (all recommendations verified against npm registry / packages.fhir.org / installed declaration files; nothing relies on training data alone)

---

## Bottom Line

**v1.5 should add one new devDependency (`fhir-package-loader`), zero new runtime dependencies, and one optional hand-bundled profile source set (the 14 MII Kerndatensatz extension packages) pulled in at build time, not at run time.** The validated v1.4 stack already covers ~95 % of the four scope groups.

| Capability group | Recommended action | New deps? |
|------------------|-------------------|-----------|
| **UX-01 validator cascade** | Keep `remoteValidator.ts` (verified v1.4); use native `fetch` + `AbortController` + `setTimeout` — the 29-02 plan already specifies this in full. | None |
| **EFF-R14 per-metric context split** | **Option A (per-metric React.createContext providers)** — vanilla React, zero deps. Reject `use-context-selector`/`jotai`/`zustand` on grounds below. | None |
| **Phase-30 UAT follow-ups (6)** | All in-house refactors. | None |
| **MII extension modules (Phase 999.1 → v1.5)** | **Build-time prefetch-and-trim pipeline** using `fhir-package-loader` (devDep only) → 14 trimmed JSON files under `src/quality/profiles/extensions/`. Runtime loads them the same way `src/quality/profiles/index.ts` loads the 7 base profiles. | `fhir-package-loader@^2.2.4` (dev only) |

---

## Recommended Additions

### 1. `fhir-package-loader` — Build-time MII extension profile fetcher (devDependency only)

| Technology | Version | Purpose | Why |
|------------|---------|---------|-----|
| `fhir-package-loader` | `^2.2.4` | Node CLI + library for downloading FHIR NPM packages from the registry at `packages.fhir.org` and extracting their `StructureDefinition` resources. | The 14 MII extension modules are published as FHIR NPM packages on Simplifier (e.g. `de.medizininformatikinitiative.kerndatensatz.onkologie@2026.0.3`). They are **not** published on the JavaScript npm registry — only on `packages.fhir.org`/Simplifier. We already hand-trim the 7 base profiles into `src/quality/profiles/*.json`; for 14 additional modules, scripted extraction + trim via `fhir-package-loader` removes the manual toil, pins exact versions in a `scripts/fetch-mii-profiles.mjs` prebuild step, and keeps the runtime bundle lean. |

**Verified 2026-04-23 via `npm view`:**
- Current version: `2.2.4` (published by the `FHIR/fhir-package-loader` GitHub org — the HL7/FHIR community-official loader).
- License: `Apache-2.0`.
- Dependencies: `axios`, `tar`, `fs-extra`, `semver`, `lodash` — **all Node-only** (not browser-safe; this is *correct* — it is a build-time tool).
- No peer deps.
- Node ≥ 18 engine expectation implied by `axios@^1.13`.

**Why not ship the Simplifier packages as runtime deps?** Because (a) they aren't on the JS npm registry, (b) each package is 1-4 MB including snapshot `StructureDefinition`s we don't need at runtime, (c) we only consume the top-level `StructureDefinition`s and trim them to `{ url, name, type, snapshot.element[{path, min, max, mustSupport}] }` — mirroring Phase 5's bundle-size discipline (see `src/quality/profiles/index.ts` header comment).

**Integration pattern (stays consistent with v1.0 Phase 5 decision):**

```json
// package.json — one new script
"prebuild:profiles": "node scripts/fetch-mii-profiles.mjs",
"build": "npm run prebuild:profiles && tsc -b && vite build"
```

```js
// scripts/fetch-mii-profiles.mjs — pseudocode
import { loadDependencies } from 'fhir-package-loader';

const EXTENSION_PACKAGES = [
  ['de.medizininformatikinitiative.kerndatensatz.onkologie',     '2026.0.3'],
  ['de.medizininformatikinitiative.kerndatensatz.kardiologie',   '2026.0.0-alpha.2'], // latest — no final yet
  ['de.medizininformatikinitiative.kerndatensatz.icu',           '2026.0.2'],
  ['de.medizininformatikinitiative.kerndatensatz.bildgebung',    '2026.0.0'],
  ['de.medizininformatikinitiative.kerndatensatz.patho',         '2026.0.2'],
  ['de.medizininformatikinitiative.kerndatensatz.mikrobiologie', '2025.0.1'],
  ['de.medizininformatikinitiative.kerndatensatz.molgen',        '2026.0.4'],
  ['de.medizininformatikinitiative.kerndatensatz.seltene',       '2026.0.1'],
  ['de.medizininformatikinitiative.kerndatensatz.symptom',       '2024.0.0-ballot'], // earliest available
  ['de.medizininformatikinitiative.kerndatensatz.biobank',       '2026.0.1'],
  ['de.medizininformatikinitiative.kerndatensatz.studie',        '2026.0.2'],
  ['de.medizininformatikinitiative.kerndatensatz.dokument',      '2026.0.1'],
  ['de.medizininformatikinitiative.kerndatensatz.mtb',           '2026.0.1'],
  ['de.medizininformatikinitiative.kerndatensatz.pros',          '2026.2.0'],
];
// → fetches, unpacks, trims snapshot elements, writes to src/quality/profiles/extensions/
```

**Alternatives considered for this slot:**

| Alternative | Why not |
|-------------|---------|
| Hand-curate 14 JSON files (like we did for the 7 base profiles) | Works for 7 profiles; scales poorly to 14 — each MII extension carries 5-30 profiles (Onkologie alone ships ~60). Scripted extraction is the only sustainable path. |
| Install the Simplifier tarballs as git-submodules | Binds our repo to Simplifier's CDN availability, no easy version pin, and ships ~30 MB of unused IG assets into every clone. |
| Runtime fetch from Simplifier on app boot | Contradicts the local-first runtime constraint (`CLAUDE.md`: "runs in browser against localhost or reachable FHIR server"); also turns a Simplifier outage into an app-startup failure. |
| Clone GitHub repos (e.g. `medizininformatik-initiative/kerndatensatzmodul-onkologie`) | Repos ship FSH sources, not compiled `StructureDefinition` JSON — requires IG Publisher / SUSHI in the dev loop. Out of scope. |

### 2. MII Extension Profile source URLs (data, not a package)

**This is a *content* decision, not a runtime dependency.** The 14 MII extension packages are canonical data. We distribute *derived, trimmed* copies in-tree.

| MII Module | Package name | Latest version (verified 2026-04-23 via `packages.fhir.org`) | FHIR resource type(s) | License | Canonical URL |
|------------|--------------|----|----|----|----|
| Onkologie | `de.medizininformatikinitiative.kerndatensatz.onkologie` | `2026.0.3` | Condition, Procedure, Observation, MedicationStatement, AdverseEvent, CarePlan | CC-BY-4.0 | [simplifier.net/medizininformatikinitiative-modulonkologie](https://simplifier.net/medizininformatikinitiative-modulonkologie) |
| Kardiologie | `de.medizininformatikinitiative.kerndatensatz.kardiologie` | `2026.0.0-alpha.2` (no GA release yet — **FLAG: alpha-only**) | Observation, Device, Procedure | CC-BY-4.0 | [simplifier.net/mii-erweiterungsmodul-kardiologie](https://simplifier.net/mii-erweiterungsmodul-kardiologie) |
| Intensivmedizin (ICU) | `de.medizininformatikinitiative.kerndatensatz.icu` | `2026.0.2` | Observation, Device, Procedure | CC-BY-4.0 | [simplifier.net/medizininformatikinitiative-modul-intensivmedizin](https://simplifier.net/medizininformatikinitiative-modul-intensivmedizin) |
| Bildgebung | `de.medizininformatikinitiative.kerndatensatz.bildgebung` | `2026.0.0` | DiagnosticReport, ImagingStudy, Observation | CC-BY-4.0 | [GitHub — kerndatensatz-bildgebung](https://github.com/medizininformatik-initiative/kerndatensatz-bildgebung) |
| Pathologie | `de.medizininformatikinitiative.kerndatensatz.patho` | `2026.0.2` | DiagnosticReport, Specimen, Observation | CC-BY-4.0 | Simplifier — `medizininformatikinitiative-modul-pathologie` |
| Mikrobiologie | `de.medizininformatikinitiative.kerndatensatz.mikrobiologie` | `2025.0.1` | DiagnosticReport, Observation | CC-BY-4.0 | Simplifier |
| Molekulargenetik | `de.medizininformatikinitiative.kerndatensatz.molgen` | `2026.0.4` | DiagnosticReport, Observation | CC-BY-4.0 | Simplifier |
| Seltene Erkrankungen | `de.medizininformatikinitiative.kerndatensatz.seltene` | `2026.0.1` | Condition | CC-BY-4.0 | Simplifier |
| Symptom / Phänotyp | `de.medizininformatikinitiative.kerndatensatz.symptom` | `2024.0.0-ballot` (no GA yet — **FLAG: ballot-only**) | Observation | CC-BY-4.0 | Simplifier |
| Biobank | `de.medizininformatikinitiative.kerndatensatz.biobank` | `2026.0.1` | Specimen | CC-BY-4.0 | [Simplifier — biobank](https://simplifier.net/medizininformatikinitiative-modulbiobank) |
| Studie | `de.medizininformatikinitiative.kerndatensatz.studie` | `2026.0.2` | ResearchStudy, ResearchSubject | CC-BY-4.0 | Simplifier |
| Dokument | `de.medizininformatikinitiative.kerndatensatz.dokument` | `2026.0.1` | DocumentReference | CC-BY-4.0 | Simplifier |
| MTB (Molekulares Tumorboard) | `de.medizininformatikinitiative.kerndatensatz.mtb` | `2026.0.1` | ServiceRequest, Observation, CarePlan | CC-BY-4.0 | Simplifier |
| PRO (Patient-Reported Outcomes) | `de.medizininformatikinitiative.kerndatensatz.pros` | `2026.2.0` | Observation, Questionnaire, QuestionnaireResponse | CC-BY-4.0 | Simplifier |

**License verification (HIGH confidence):**
- Individual IG pages on `build.fhir.org/ig/medizininformatik-initiative/…` and Simplifier's package cards declare **CC-BY-4.0**. Attribution is the only obligation — redistribution (incl. trimmed snapshot subsets in-tree) is explicitly allowed, including commercially.
- We MUST carry an attribution notice in `src/quality/profiles/extensions/README.md` and a single-line `SPDX-License-Identifier: CC-BY-4.0` header at the top of each bundled extension JSON (by convention even though JSON doesn't support comments — drop into a sibling `.license` manifest).
- Base profiles (v1.0 Phase 5) already set this precedent with a `// Source: derived from the MII Kerndatensatz 2025 packages on Simplifier` comment in `src/quality/profiles/index.ts:10` — continue the pattern.

**Version pinning risk (MEDIUM):**
- Kardiologie and Symptom are pre-GA. If our `category: 'extension'` tabs show two modules without snapshot profiles, the **local structural validator** on those types degrades to "cannot match profile" gracefully — but users will see "No MII structural checks available for this type" in the Validation tab. Acceptable for v1.5. Document this in `PITFALLS.md`.
- When pre-GA packages ship final (e.g. Kardiologie 2026.0.0), a follow-up `prebuild:profiles` run re-trims and bumps the version string in the `EXTENSION_PACKAGES` array — no runtime code changes.

---

## Existing Stack Sufficiency (NO new deps needed)

### EFF-R14 — Per-Metric Context Split (verdict: vanilla `React.createContext`)

**Recommendation: Option A (per-metric context providers) with vanilla React. Do NOT add `use-context-selector`, `jotai`, or `zustand`.**

The current `QualityMetricsContext` (see `src/quality/QualityMetricsContext.tsx:92`) is a single `createContext<QualityMetricsContextValue | null>` — setting any one of the 7 `setOverall*` values re-renders all 8 consumers (`OverviewStrip` tile + the 7 panel tiles that read for display). The fix:

```tsx
// src/quality/metrics/CompletenessContext.tsx
const Ctx = createContext<{ value: number | undefined; set: (v: number | undefined) => void } | null>(null);

export function CompletenessProvider({ children }: { children: ReactNode }) {
  const [value, set] = useState<number | undefined>(undefined);
  const api = useMemo(() => ({ value, set }), [value]);
  return <Ctx.Provider value={api}>{children}</Ctx.Provider>;
}

export function useCompletenessMetric() { /* same fallback pattern as today */ }
```

Repeat × 7 metrics, plus one shared `DuplicatesBreakdownProvider` for the one field that needs a Map (preserves the existing `deriveOverallDuplicates` logic at line 96 verbatim). The OverviewStrip tile for each metric consumes only its own context → no blast radius beyond that tile when its own metric updates.

**Why reject dependency-backed alternatives:**

| Library | npm version | Reason for rejection |
|---------|-------------|----------------------|
| `use-context-selector@2.0.0` | MIT, peer `react >=18.0.0` (verified) | Solves the exact problem *if and only if* we keep a single monolithic context. Per-metric contexts eliminate the need for selectors entirely. Adding it is solving a different problem than the one PROJECT.md says we want solved ("Option A per PROJECT.md"). |
| `zustand@5.0.12` | MIT, tiny (~1 KB gzip) | Would work, but the v1.4 `STACK.md` explicitly rejected state-management libs: *"MedplumClient handles caching, React hooks handle data fetching… no need for a state management library."* Adding Zustand now for one context split crosses that line; if we do it here, the next refactor wants the same treatment and we've quietly adopted a state lib. Close the door cleanly with vanilla React instead. |
| `jotai@2.19.1` | MIT, needs `@babel/core >= 7`, peer `react >= 17` | Same rejection as Zustand, with added compile-time cost (`@babel/core >= 7` peer dep). Jotai's atomic model is attractive for *dense* state (dashboards with 100+ atoms), not 7 scalars + 1 map. |
| `valtio` | — | Proxy-based reactivity conflicts with React strict-mode double-render patterns we already rely on. Not worth the debugging surface. |
| `useSyncExternalStore` + hand-rolled store | Built into React 18 | The v1.4 STACK proposed this as a fallback. It works, but per-metric contexts are *simpler* (~40 LOC deleted vs. ~40 LOC of store machinery added). Keep it in reserve if a future requirement adds >15 metrics — today it's over-engineering. |

**Verified 2026-04-23 via `npm view`:** `use-context-selector@2.0.0` (MIT, last release 2024-05-06), `jotai@2.19.1`, `zustand@5.0.12`. All three are compatible with our React 18 base. The rejection is on design grounds, not compatibility.

### UX-01 — External Validator Cascade (verdict: keep everything we have)

Re-verifies v1.4's stance and the 29-02-PLAN spec:

| Capability | Needed library | Already in stack? |
|------------|---------------|-------------------|
| External POST with body + headers | `fetch` (built into browser) | ✓ |
| AbortController + 15s timeout | `AbortController` + `setTimeout` (browser built-ins) | ✓ |
| Server `$validate` client | `MedplumClient.post()` via `src/quality/remoteValidator.ts` | ✓ (preserved from v1.0 Phase 5) |
| Local structural checker | `src/quality/structuralValidator.ts` + `src/quality/profiles/` | ✓ (shipped v1.0 Phase 5) |
| OperationOutcome normalizer | Extracted into `src/quality/normalizers.ts` by 29-02 Task 2 | To be created by the plan; no lib needed |
| PHI acknowledgement gate | `src/quality/phiGate.ts` + `@mantine/hooks` `useLocalStorage` | ✓ |
| Probe cache per `(serverUrl, resourceType)` | Plain `Map<string, ActiveStrategy>` | ✓ TS 5.7 |
| Timeout toast | `@mantine/notifications` | ✓ |

**Do NOT add** `axios`, `ky`, `fhirclient`, `fhir.js`, or a "validator SDK". The 29-02 plan's pseudocode uses raw `fetch` intentionally — a dependency here would duplicate `MedplumClient`'s auth handling and double the surface area of the test suite's `vi.spyOn(global, 'fetch')` regression contract (Task 1 Test 4 in 29-02).

**About `validator.fhir.org`:** it is a human-facing web validator, not a documented programmatic API. The 29-02 plan correctly targets **HAPI-style `POST {url}/{Type}/$validate?profile=...`**, which covers HAPI FHIR JPA, IG Publisher CLI in server mode, Aidbox, and any `org.hl7.fhir.validator-wrapper` deployment the user self-hosts. CONTEXT D-13 defers the wrapper-specific `/validate` path to v1.5+ — keep deferred.

### Phase-30 UAT Follow-ups (verdict: all in-house)

None of the six UAT follow-ups need a new dep:

| Follow-up | What it needs | Already available |
|-----------|---------------|-------------------|
| Explorer Date/Status per-type extractor | TypeScript switch + existing date formatters | ✓ |
| HumanReadableView extension cleanup | Mantine `Tooltip` + `Modal` | ✓ |
| ResourceDetailPage tab rename | Pure UI | ✓ |
| Empty per-patient MII/FHIR panel investigation | Debugging only | — |
| Dashboard MII tile count scoping | Existing `useResourceCounts` + label update | ✓ |
| Per-type quality matrix card | Existing `ResourceIssueTable` + per-metric contexts from EFF-R14 | ✓ (blocks on EFF-R14) |

### Color Strategy for 21 Modules (verdict: hand-pick CSS tuples, no library)

**Mantine 8 ships 14 default colors:** `dark, gray, red, pink, grape, violet, indigo, blue, cyan, green, lime, yellow, orange, teal` (verified against `/node_modules/@mantine/core/lib/core/MantineProvider/theme.types.d.ts:DefaultMantineColor`). The 7 base MII modules currently consume: `blue (Person), indigo (Fall), teal (Diagnose), violet (Prozedur), pink (Consent), cyan (Laborbefund), orange (Medikation)`. That leaves 7 default colors unused for extensions: `dark (reserve), gray, red, grape, green, lime, yellow` — but `dark`/`gray`/`yellow` are poor badge choices against both white and indigo pill backgrounds, so only `red, grape, green, lime` plus 3 custom tuples are realistic.

**Recommendation: define 7 custom `MantineColorsTuple`s on the existing `createTheme()` rather than add a color library.** The `customColors` pattern (see `mantine.dev/theming/colors/` — verified) requires a 10-string array per custom color keyed by name:

```ts
// src/styles/theme.ts — extend the existing createTheme() from Phase 30
const MII_EXTENSION_COLORS: Record<string, MantineColorsTuple> = {
  'mii-onkologie':    ['#ffeef2','#ffd4e0','#ffa8c1','#ff7ca2','#ff5083','#ff2464','#cc1d50','#99163c','#660f28','#330814'], // rose
  'mii-kardio':       ['#fff0ee','#ffd6d2','#ffa8a0','#ff7a6e','#ff4c3c','#ff2010','#cc190d','#99130a','#660c06','#330603'], // bold red
  'mii-icu':          ['#fff5e6','#ffe3b3','#ffc166','#ffa933','#ff9100','#cc7400','#995700','#663a00','#331d00','#1a0e00'], // amber
  // …7 tuples total, each with min 10 stops per Mantine's documented requirement.
};
export const theme = createTheme({ colors: { ...MII_EXTENSION_COLORS }, primaryColor: 'indigo' });
```

**WCAG AA verification workflow (no runtime lib needed):**
- Pick shade 6 (Mantine's default `primaryShade.light`) as the badge-fill color — the pattern used by all 14 built-in Mantine colors, which hit AA against white out of the box by design.
- Verify the chosen hex against **both** `#ffffff` (Card surface) and `#e7ecff` (indigo pill background used by the active MII tab in Phase 30) using `npx wcag-contrast` (BSD-2-Clause, version 3.0.0) as a **one-off design tool**, not a runtime dep. Check into `.planning/research/color-contrast-audit.md` — do NOT add `wcag-contrast` or `chroma-js` to `package.json`.
- Alternative: use the **Mantine Colors Generator** web tool (`mantine.dev/colors-generator/`) which produces 10-stop tuples from a single seed hex and eyeballs contrast ratios. Cheapest, zero-dep workflow.

**Why not `chroma-js@3.2.0` (BSD-3 + Apache-2.0) or `colorizr@5.0.1` (MIT)?**
- Both are runtime-capable color libraries. Neither is needed for *using* colors — only for *generating* them, which is a one-time design task that happens outside the build loop.
- `colorizr` has first-class WCAG 2.x and APCA (WCAG 3.0 draft) contrast helpers and TypeScript types, so it's the closest thing to a "right fit" — but one-time contrast audits don't justify a bundle dep.
- If at some point users want to *dynamically* color modules by patient-level data (e.g. "worst quality tile glows red"), reconsider `colorizr`. Not today.

### Test Libraries (verdict: no additions)

Current devDeps cover v1.5 scope:

| Test need (v1.5) | Existing capability |
|------------------|---------------------|
| AbortController + fetch spy (UX-01 Tasks 1, 4) | `vitest@4.1.4` + `vi.spyOn(global, 'fetch')` (used in 29-02 Task 1 Test 4) |
| PHI gate regression (Task 1 Test 4) | `@testing-library/react@16.3.2` + `jsdom@29.0.2` with `vi.stubGlobal('localStorage', ...)` |
| Per-metric context split unit tests (EFF-R14) | `@testing-library/react` renderHook pattern |
| MII extension module tab rendering | `@testing-library/react` + existing `MedplumProvider` wrapper fixtures from `src/test-utils/` |
| Structural validator tests against new bundled profiles | Pattern already established in `src/quality/__tests__/structuralValidator.test.ts` — extend, don't add tooling |

**Do NOT add** `@vitest/coverage-v8` (not required by any v1.5 requirement; Phase 27 already shipped `rollup-plugin-visualizer` for bundle analysis), `playwright`, `cypress`, or `msw`. The existing `vi.spyOn(global, 'fetch')` pattern is the contract UX-01 is built on — introducing MSW would add a second network-mocking layer and confuse the invariant that "zero external fetches before PHI consent" (Task 1 Test 4).

---

## Installation

```bash
# v1.5 — single new dev dependency (build-time MII extension profile fetcher)
npm install -D fhir-package-loader@^2.2.4

# That's it. No runtime additions.
# MII extension profiles are fetched + trimmed by `scripts/fetch-mii-profiles.mjs`
# (new prebuild step), output bundled statically under `src/quality/profiles/extensions/`.
```

---

## Alternatives Considered

| Our choice | Alternative | When alternative might be better |
|-----------|-------------|----------------------------------|
| Vanilla per-metric `React.createContext` (EFF-R14) | `zustand@5.0.12` | If v1.6+ grows the metric count past 15 and context fan-out becomes a maintenance burden, Zustand's slice-based selectors beat N providers. Threshold: ~15 independent scalar metrics with cross-cutting derived state. |
| Vanilla per-metric `React.createContext` | `use-context-selector@2.0.0` | If we ever need to keep a single context (for dependency-injection simplicity in tests), `use-context-selector` is the minimal-risk choice. Today's per-metric split makes the need moot. |
| `fhir-package-loader` build-time | Hand-curated JSON (as used for 7 base profiles) | If only 1-2 extension modules mattered (e.g. Onkologie + Bildgebung only). For 14 modules the scripted path wins. |
| Native `fetch` for validator cascade | `axios@1.13` / `ky` | Only if the project later needs uniform retry/interceptor behaviour across many external HTTP integrations. Today it's one surface — `fetch` + `AbortController` is sufficient and the 29-02 test contract depends on `vi.spyOn(global, 'fetch')`. |
| 7 hand-picked Mantine color tuples | `colorizr@5.0.1` runtime color library | If v1.6+ adds user-customizable module colors (theming per deployment), a runtime color engine starts to earn its weight. Not today. |
| `useResourceCounts` + manual scoping for Phase-30 UAT fix | `@tanstack/react-query` | Already ruled out by v1.0 `STACK.md` ("Do NOT use"). Re-confirmed. |

---

## What NOT to Add

| Avoid | Why | Use Instead |
|-------|-----|-------------|
| `@tanstack/react-query` (or `swr`) | Existing `STACK.md` "Do NOT use" list — two competing cache layers with `MedplumClient`. | `MedplumClient.search()` + existing `useResourceCounts` + `Map<serverUrl, cache>` (from v1.4 Phase 24). |
| `zustand`, `jotai`, `valtio`, `use-context-selector` | PROJECT.md locks in **Option A (per-metric context providers)** for EFF-R14. Dep-free `React.createContext` × 7 is the specified design. | Vanilla `React.createContext` per metric; shared `DuplicatesBreakdown` context for the one Map-shaped field. |
| `axios`, `ky`, `got` | Duplicates `MedplumClient` auth handling + breaks the `vi.spyOn(global, 'fetch')` regression contract in 29-02 Task 1 Test 4. | Native `fetch` + `AbortController` + `setTimeout`. |
| `fhirclient`, `fhir.js` | `@medplum/core@5.1.7` is our FHIR client. Two clients → two cache layers, two auth models, two bundle contributions. | `MedplumClient.post()` (already used by `remoteValidator.ts`) for the server `$validate` tier; raw `fetch` for the external tier. |
| `chroma-js`, `colorizr`, `wcag-contrast` (as runtime deps) | Color generation is a one-time design task, not a runtime behaviour. Adding any of them ships 10-30 KB to every user. | `npx wcag-contrast …` as a one-off CLI during design; Mantine Colors Generator web tool for 10-stop tuples; static hex values baked into `src/styles/theme.ts`. |
| `msw` (Mock Service Worker) | The v1.4 test suite is built on `vi.spyOn(global, 'fetch')`. Introducing MSW forks the mocking strategy mid-migration and risks the PHI-gate regression contract. | Continue `vi.spyOn(global, 'fetch')` per the 29-02 plan. |
| `@tanstack/react-virtual`, `react-window` | No v1.5 requirement stresses virtualization (quality panels page at 50-500 rows, MII extension tabs load one resource type each). | Existing Mantine `Pagination`. |
| `react-query-devtools`, Redux DevTools | No state management lib → no devtools needed. | React DevTools (browser extension, not a package). |
| `@fluentui/react-context-selector` | Microsoft-Fluent ecosystem; larger footprint than `use-context-selector`, and we've rejected the selector approach entirely. | Vanilla per-metric `createContext`. |
| IG Publisher / SUSHI as a dev-time dep | Needed only if we author *new* FHIR profiles. We consume pre-built ones. | `fhir-package-loader` for prebuilt `StructureDefinition` extraction. |

---

## Stack Patterns by Variant

**If MII Kardiologie or Symptom packages still lack a GA release at v1.5 implementation time:**
- Bundle the latest alpha/ballot package available; log a `console.info` in `scripts/fetch-mii-profiles.mjs` warning pre-GA.
- The empty-state UX for extension modules with no matching profile (PROJECT.md §4 — MII extension modules) covers the user-facing case gracefully: the tab renders a "No structural profile bundled — see `extensionProfiles.ts`" banner with a link to the canonical Simplifier URL.
- On GA release, update the version string in `EXTENSION_PACKAGES` → rerun `npm run prebuild:profiles` → ship in the next patch.

**If users request runtime profile fetching (not bundled):**
- Move to v1.6+. Adds a `Map<canonicalUrl, StructureDefinition>` LRU cache (mirrors the existing Phase 4 terminology LRU pattern in `src/fhir/terminology/cache.ts`). Would need a new runtime FHIR-package NPM client — not available today; closest option is rolling our own tarball-unpack via `pako` + manual JSON extraction.

**If EFF-R14's per-metric context split proves insufficient for React 18 concurrent rendering semantics:**
- Wrap the 7 context setters in `startTransition()` (React 18 built-in) — zero dep.
- Only *after* that, revisit `useSyncExternalStore`. `use-context-selector` remains rejected on design grounds (PROJECT.md locks in Option A).

---

## Version Compatibility

| Package | Installed (v1.4) | Latest (2026-04-23) | Action for v1.5 |
|---------|------------------|---------------------|-----------------|
| `react` | `^18.3.1` | 18.3.x still stable; React 19.2 released but not adopted | Keep — Medplum 5.1.7 peers `^18.0.0 \|\| ^19.0.0` (verified in `/node_modules/@medplum/react/package.json`) but Mantine 8 peers `react >=18.0.0` only |
| `@mantine/core` | `^8.3.18` | **Mantine 9.1.0 exists but requires React 19** (`peer: react: '^19.2.0'`) | Keep 8 — upgrading to Mantine 9 would force a React 19 migration out of v1.5 scope |
| `@medplum/core` / `fhirtypes` / `react` / `react-hooks` | `^5.1.7` | 5.1.x still current | Keep |
| `vite` | `^8.0.4` | 8.0.x | Keep; caret range absorbs patches |
| `typescript` | `^5.7.0` | 5.7.x | Keep |
| `vitest` | `^4.1.4` | 4.1.x | Keep |
| `fhir-package-loader` (NEW) | — | `2.2.4` (Apache-2.0) | **Add to `devDependencies`** |

**CRITICAL:** Do not bump Mantine to 9 in v1.5. `@mantine/core@9.1.0` now requires React 19 exclusively (verified 2026-04-23 via `npm view @mantine/core@9.1.0 peerDependencies`). Upgrading breaks compatibility with our React 18 base and would cascade into the Medplum react dep surface. The v1.0 `STACK.md` "Do NOT use Mantine 9" line still applies one version later.

---

## Compatibility Matrix (new additions only)

| Package A | Compatible with | Notes |
|-----------|-----------------|-------|
| `fhir-package-loader@2.2.4` | Node ≥ 18 | Node-only; invoked by `scripts/fetch-mii-profiles.mjs` at build time, never in `src/`. Output JSON consumed in-browser has zero dep-level coupling. |
| `fhir-package-loader@2.2.4` | `vite@8.0.4` | No interaction — FPL runs *before* Vite. Output JSON is statically imported by `src/quality/profiles/extensions/index.ts`. |
| Bundled extension profiles (CC-BY-4.0) | MIT app license | CC-BY-4.0 is a permissive content license; MIT repo can redistribute CC-BY-4.0 assets with attribution. Carry attribution in `src/quality/profiles/extensions/README.md` + repo `LICENSE` appendix. Verified against Creative Commons FAQ (CC-BY + MIT combo is standard). |

---

## Sources

- **Installed declaration files (authoritative, HIGH confidence):**
  - `/node_modules/@mantine/core/package.json` — version `8.3.18`
  - `/node_modules/@mantine/core/lib/core/MantineProvider/theme.types.d.ts:DefaultMantineColor` — enumeration of 14 built-in colors
  - `/node_modules/@medplum/react/package.json:peerDependencies` — Medplum 5.1.7 peers `@mantine/core@^8.0.0` (Mantine 9 is not an option)
  - `src/quality/QualityMetricsContext.tsx` — current single-context structure to be split
  - `src/utils/mii-modules.ts` — current 7-module shape to extend with `category` and multi-type `fhirResourceType`
  - `src/quality/profiles/index.ts` — existing bundled-profile pattern to extend under `extensions/`

- **npm registry (`npm view …`, verified 2026-04-23):**
  - `fhir-package-loader@2.2.4` — Apache-2.0, Node deps only, published by the HL7/FHIR community org
  - `use-context-selector@2.0.0` — MIT, peer `react >= 18.0.0, scheduler >= 0.19.0`, last release 2024-05-06
  - `zustand@5.0.12`, `jotai@2.19.1` — both MIT; for completeness, both rejected on design grounds
  - `@mantine/core@9.1.0` — requires React 19 (peer `react: ^19.2.0`); blocks upgrade path
  - `chroma-js@3.2.0` (BSD-3 + Apache-2.0), `colorizr@5.0.1` (MIT), `wcag-contrast@3.0.0` (BSD-2-Clause) — all rejected as runtime deps; `wcag-contrast` useful as a one-off CLI

- **FHIR package registry (`curl packages.fhir.org/<pkg>`, verified 2026-04-23):**
  - All 14 MII extension package versions listed in the table above were queried live
  - [packages.fhir.org — registry homepage](https://packages.fhir.org/) — HIGH confidence
  - [FHIR NPM Package Specification (HL7)](https://confluence.hl7.org/display/FHIR/NPM+Package+Specification) — HIGH confidence

- **Simplifier (MEDIUM confidence — package metadata verified, license declared on each IG page):**
  - [simplifier.net/organization/koordinationsstellemii](https://simplifier.net/organization/koordinationsstellemii) — MII organization page listing all 23 `de.medizininformatikinitiative.kerndatensatz.*` packages (base + extension + meta + base-profile)
  - [simplifier.net/medizininformatikinitiative-modulonkologie](https://simplifier.net/medizininformatikinitiative-modulonkologie) — Onkologie package, CC-BY-4.0
  - [simplifier.net/mii-erweiterungsmodul-kardiologie](https://simplifier.net/mii-erweiterungsmodul-kardiologie) — Kardiologie package (alpha-only, FLAGGED)
  - [simplifier.net/medizininformatikinitiative-modul-intensivmedizin](https://simplifier.net/medizininformatikinitiative-modul-intensivmedizin) — ICU package
  - [simplifier.net/medizininformatikinitiative-modulbiobank](https://simplifier.net/medizininformatikinitiative-modulbiobank) — Biobank package

- **Mantine documentation (HIGH confidence):**
  - [mantine.dev/theming/colors/](https://mantine.dev/theming/colors/) — custom color tuples require 10 strings min
  - [mantine.dev/colors-generator/](https://mantine.dev/colors-generator/) — recommended one-off tool for extension-module tuples

- **HL7/FHIR validator references (HIGH confidence):**
  - [FHIR R4 Validation operation spec](https://www.hl7.org/fhir/validation.html) — `POST {base}/{Type}/$validate?profile={canonical}` wire format that `remoteValidator.ts` implements
  - [HAPI FHIR Instance Validator](https://hapifhir.io/hapi-fhir/docs/validation/instance_validator.html) — default deployment target for the UX-01 server tier
  - [Using the FHIR Validator (HL7 Confluence)](https://confluence.hl7.org/display/FHIR/Using+the+FHIR+Validator) — confirms `validator.fhir.org` is a web UI, not a documented programmatic API; CONTEXT D-13 defers wrapper path to v1.5+

- **Creative Commons licensing (HIGH confidence):**
  - [Creative Commons — CC BY 4.0 Deed](https://creativecommons.org/licenses/by/4.0/deed.en) — redistribution + modification + commercial use permitted with attribution
  - MII IG pages on `build.fhir.org/ig/medizininformatik-initiative/…` — each carries a CC-BY-4.0 footer (verified against `kerndatensatz-meta` and `kerndatensatzmodul-onkologie` GitHub READMEs)

- **React docs (HIGH confidence):**
  - [react.dev/reference/react/useSyncExternalStore](https://react.dev/reference/react/useSyncExternalStore) — kept as reference for the rejected alternative

- **State-management comparison reviews (LOW confidence — ecosystem context only, not driving decisions):**
  - [Jotai — Comparison](https://jotai.org/docs/basics/comparison)
  - [React State: Redux vs Zustand vs Jotai (2026)](https://inhaq.com/blog/react-state-management-2026-redux-vs-zustand-vs-jotai.html)

---

## Open Questions for Roadmap Phase Split

1. **Prebuild script placement** — Does `prebuild:profiles` belong in `npm run build` only, or also `npm run test` (so fresh clones can run tests without first running build)? Recommend: add a `prepare` npm lifecycle hook so `npm install` auto-fetches extension profiles on fresh clones — avoids "profile not found" test failures.
2. **Bundled-extension runtime size budget** — Base 7 profiles total ~10 KB trimmed. Budget for 14 extensions is unclear until the prebuild script runs; trim target stays `{url, name, type, snapshot.element[{path, min, max, mustSupport}]}` identical to base. Rough estimate: 14 × 5-20 profiles × 150 B/element = ~20-80 KB additional. Acceptable.
3. **Attribution placement** — CC-BY-4.0 requires attribution. Propose: a single `src/quality/profiles/extensions/ATTRIBUTION.md` + an entry in the app's About dialog (if it exists — check in Phase 1 of v1.5 roadmap).
4. **Color tuple seeds** — 7 hand-picked seed hexes need design-side sign-off before the extension-module tab row ships. Recommend a one-page `.planning/research/color-design-audit.md` companion document produced by a separate pass (UX scope, not stack scope).

---

*Stack research for: v1.5 Validation, Performance & MII Extensions*
*Researched: 2026-04-23 (by research agent spawned from `/gsd-new-milestone`)*
