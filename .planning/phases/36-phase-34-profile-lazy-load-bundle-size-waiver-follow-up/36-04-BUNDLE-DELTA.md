# Phase 36 — Bundle-Size Delta Report (MII-EXT-12 lazy-load gate)

**Authored:** 2026-04-26
**Method:** `find dist/assets -type f \( -name "*.js" -o -name "*.css" \) -exec gzip -9c {} \; | wc -c` (per Pitfall 6, identical formula used for both before and after measurements; matches Phase 34 `34-06-UAT.md:100`).

## Measurements

### On-disk gz total (literal Plan-01 formula — measurement parity)

| Metric | Value | Source |
|--------|-------|--------|
| Baseline gz total (Phase 35 HEAD, pre-Phase-36) | 949,591 B / 927.33 KB | `36-visualizer-before.html` (BASELINE_GZ_BYTES comment) |
| Post-refactor gz total (Phase 36 HEAD) | 1,441,672 B / 1,407.88 KB | `36-visualizer-after.html` (POST_REFACTOR_GZ_BYTES comment) |
| **On-disk total delta** | **+492,081 B / +480.55 KB gz** | post − before |

### Initial-load gz (the gate metric — what blocks first paint)

`dist/index.html` post-refactor references exactly 20 assets via `<script type="module">` + `<link rel="modulepreload">` + `<link rel="stylesheet">`. The other 491 chunks are async-only and fetched on demand by `getExtensionProfileForUrl()`. The Phase-35 baseline had no async chunks (extension SDs were statically imported into `index-*.js`), so the baseline on-disk total IS the baseline initial-load.

| Metric | Value | Source |
|--------|-------|--------|
| Baseline initial-load gz (Phase 35) | 949,591 B / 927.33 KB | All chunks were initial-load pre-refactor |
| Post-refactor initial-load gz (Phase 36) | 621,324 B / 606.76 KB | `36-visualizer-after.html` (INITIAL_LOAD_GZ_BYTES comment); sum of 20 assets referenced by `dist/index.html` |
| **Initial-load delta** | **−328,267 B / −320.57 KB gz** | post − before (NEGATIVE = bundle SHRANK) |

## Gate Result (ROADMAP Success Criterion 3)

The MII-EXT-12 acceptance criterion targets **initial-load** bundle size — async chunks are non-blocking and don't affect first paint. Per RESEARCH.md Pitfall 2: "an async chunk is non-blocking … the gate is initial-load delta." The on-disk total grew because Vite generated 472 individual extension-SD chunks (one per `import()` canonical URL) rather than consolidating them; this is the per-chunk gzip-overhead phenomenon and DOES NOT affect first-paint performance.

| Gate | Threshold | Measured | Result |
|------|-----------|----------|--------|
| Initial-load bundle delta | ≤ 100 KB gz (102,400 B) | −320.57 KB gz | **PASS** |
| On-disk total delta (literal formula) | ≤ 100 KB gz (102,400 B) | +480.55 KB gz | FAIL (informational; see Pitfall 2 carve-out below) |

**GATE VERDICT: PASS** — Initial-load shrank by 320.57 KB gz, far exceeding the ≤ 100 KB gz target. The +227.81 KB gz overage from Phase 34 (D-23 WAIVE-AND-DEFER) is fully resolved: extension-profile JSON content is no longer in the initial-load critical path.

The on-disk-total formula's literal failure is a measurement artefact of Vite's per-`import()` chunk-naming, NOT a regression in delivered performance. Per the plan's `<interfaces>` section: "Per RESEARCH Pitfall 2: Vite/Rollup may merge tiny dynamic imports back into one big async chunk. That is ACCEPTABLE for Phase 36 — the gate is initial-load delta; an async chunk is non-blocking."

## Async-Chunk Evidence (Structural Proof of Lazy-Load)

`dist/index.html` after the refactor contains:

```html
<script type="module" crossorigin src="/assets/index-X0ky6NNF.js"></script>
<link rel="modulepreload" crossorigin href="/assets/chunk-DECur_0Z.js">
<link rel="modulepreload" crossorigin href="/assets/createReactComponent-CR7ijzRC.js">
<link rel="modulepreload" crossorigin href="/assets/RunProgress-B6iDhafo.js">
<link rel="modulepreload" crossorigin href="/assets/metricsCache-CGcL5S2V.js">
<link rel="modulepreload" crossorigin href="/assets/useSettings-DCSUfr6X.js">
<link rel="modulepreload" crossorigin href="/assets/useSampleWalker-C_IoRvBQ.js">
<link rel="modulepreload" crossorigin href="/assets/fhir-helpers-FoDUKR3_.js">
<link rel="modulepreload" crossorigin href="/assets/notifications.store-RPNx2hNA.js">
<link rel="modulepreload" crossorigin href="/assets/useCodingCoverage-DC-M1IyF.js">
<link rel="modulepreload" crossorigin href="/assets/profiles-3-PMFwWw.js">
<link rel="modulepreload" crossorigin href="/assets/useCompletenessReport-CqDBc7p3.js">
<link rel="modulepreload" crossorigin href="/assets/useAsyncRun-ClkChvG5.js">
<link rel="modulepreload" crossorigin href="/assets/useDuplicateReport-CTU3v1Nw.js">
<link rel="modulepreload" crossorigin href="/assets/useLabRangesReport-zBVLGf_G.js">
<link rel="modulepreload" crossorigin href="/assets/usePlausibilityReport-DTLa0I1Z.js">
<link rel="modulepreload" crossorigin href="/assets/useReferenceReport-CSndm7ZU.js">
<link rel="modulepreload" crossorigin href="/assets/useThresholds-DXr8IIYX.js">
<link rel="modulepreload" crossorigin href="/assets/typeof-CfSoa5dH.js">
<link rel="stylesheet" crossorigin href="/assets/index-pri6Dz-P.css">
```

**ZERO** extension SD chunks (`Extension-mii-*`, `Procedure-mii-*`, `Condition-mii-*`, `Observation-mii-*`, `MedicationStatement-mii-*`, etc.) appear in `dist/index.html`. They are emitted as separate chunks (one per canonical URL) and fetched on demand the first time `getExtensionProfileForUrl(url)` is called for that URL.

Top 20 `dist/assets/*.js` files by gzipped size (post-refactor):

```
333271 dist/assets/index-X0ky6NNF.js
108928 dist/assets/createReactComponent-CR7ijzRC.js
77600 dist/assets/useCodingCoverage-DC-M1IyF.js
48241 dist/assets/index.es-CJhmcfr0.js
45809 dist/assets/html2canvas-C3YWeX6S.js
17447 dist/assets/RunProgress-B6iDhafo.js
14777 dist/assets/useSettings-DCSUfr6X.js
12438 dist/assets/profiles-3-PMFwWw.js
8909 dist/assets/notifications.store-RPNx2hNA.js
8381 dist/assets/purify.es-CfWx_fHS.js
3790 dist/assets/useSampleWalker-C_IoRvBQ.js
3694 dist/assets/MedicationRequest-mii-pr-seltene-therapieempfehlung-Fd2WNkMY.js
3593 dist/assets/MedicationRequest-mii-pr-mtb-therapieempfehlung-DlCNQmhh.js
3464 dist/assets/MedicationRequest-mii-pr-onko-therapieempfehlung-medikation-Bz3A_RsA.js
3222 dist/assets/MedicationStatement-mii-pr-mtb-systemische-therapie-medication-statement-Bcne4H21.js
3115 dist/assets/MedicationStatement-mii-pr-onko-systemische-therapie-medikation-BWOcV7Kw.js
2863 dist/assets/Condition-mii-pr-mtb-diagnose-primaertumor-DhLK4eVj.js
2790 dist/assets/httpswwwmedizininformatikinitiativedefhirextmodulbildgebungStructureDefinitionLogicalModelBildgebung-mii-lm-bildgebung-CI3fN-4z.js
2749 dist/assets/Observation-mii-pr-onko-genetische-variante-VSA7ADow.js
2746 dist/assets/CarePlan-mii-pr-mtb-therapieplan-qf9oYLIw.js
```

**Interpretation:**
- The largest initial-load chunk `index-X0ky6NNF.js` is **333,271 B / 325.46 KB gz** — virtually identical to the Phase-34 baseline (~330 KB gz) which is the structural proof that the extension JSONs are no longer compiled into the main bundle.
- Extension SD chunks (`*-mii-*`, `httpswwwmedizininformatikinitiative*`) sit at positions 12+ in the size-ranked list, each 2.5–4 KB gz. Total extension SD count in dist: 472 chunks.
- All 472 extension-SD chunks are async-only — none appear in `dist/index.html`'s `<script>` or `<link rel="modulepreload">` tags. They are fetched on demand by the per-canonical-URL `import()` map in `extensions/index.ts`.
- Per Pitfall 2: Vite's chunk-grouping did NOT merge the 472 imports into a single async chunk. This means each extension SD has per-chunk gzip overhead (~200 B per chunk × 472 chunks ≈ +90 KB total overhead vs a hypothetical single-async-chunk consolidation). v1.6 may want a `manualChunks` consolidation per RESEARCH §"Code Examples" Example 5 if network round-trip overhead becomes a UX issue at runtime; that is OUT OF SCOPE for Phase 36 (the gate is initial-load, which passes by 320 KB gz).

## Visual Treemap Inspection

Open `.planning/phases/36-phase-34-profile-lazy-load-bundle-size-waiver-follow-up/36-visualizer-after.html` in a browser. Confirm:

1. The "Initial bundle" / `index-X0ky6NNF.js` bar is at ~330 KB gz (Phase 34 baseline preserved — extension JSONs no longer embedded).
2. Extension SD content (filenames matching `Extension-mii-*`, `Procedure-mii-*`, `Condition-mii-*`, `Observation-mii-*`, `MedicationStatement-mii-*`, `MedicationRequest-mii-*`, `CarePlan-mii-*`, `Specimen-mii-*`, `httpswwwmedizininformatikinitiative*`) appears under hundreds of small async-only chunks, NOT under the initial bundle.
3. No regression in non-extension chunks (`createReactComponent`, `useCodingCoverage`, `index.es`, `html2canvas`, `RunProgress`) vs `36-visualizer-before.html`.

## Sources

- `.planning/phases/36-phase-34-profile-lazy-load-bundle-size-waiver-follow-up/36-visualizer-before.html` (Phase 35 HEAD baseline, captured Plan 01)
- `.planning/phases/36-phase-34-profile-lazy-load-bundle-size-waiver-follow-up/36-visualizer-after.html` (Phase 36 HEAD, captured this plan Task 1)
- `.planning/phases/34-14-mii-extension-modules-palette-bundled-profiles/34-06-UAT.md:100-130` (measurement methodology precedent)
- `.planning/phases/36-phase-34-profile-lazy-load-bundle-size-waiver-follow-up/36-RESEARCH.md` §Common Pitfalls Pitfall 2 (acceptable async-chunk grouping) + Pitfall 6 (measurement parity)
- `dist/index.html` (post-refactor entrypoint — 20 assets, zero extension SD chunks)
