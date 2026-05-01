# Phase 40: Headless deuteranopia simulation in Vitest (DEUT) — Discussion Log

> **Audit trail only.** Do not use as input to planning, research, or execution agents.
> Decisions are captured in CONTEXT.md — this log preserves the alternatives considered.

**Date:** 2026-04-29
**Phase:** 40-headless-deuteranopia-simulation-deut
**Mode:** `--auto` (recommended defaults auto-selected)
**Areas discussed:** Simulation library, color distance metric, fixture/RGBA capture, pair scope, test scaffolding, output format, Phase 37 closure

---

## Simulation Library (D-01, D-02)

| Option | Description | Selected |
|--------|-------------|----------|
| Pure-JS Machado 2009 matrix in `src/utils/colorVision.ts` | ~30 lines, no new dep, full control | ✓ |
| New npm dependency (e.g. `colord` plugin or `@bjornlu/colorblind`) | One-line API, but adds bundle weight | |
| Use existing chroma-js if present | Already-tested, but project has no chroma-js dep currently | |

**Auto-selected:** Pure-JS implementation. Reason: zero new deps; the matrix is 9 numbers; Phase 34 already established the "minimize new deps" pattern (only added `fhir-package-loader`); Machado severity 1.0 (full deuteranopia) matches Phase 37's paper analysis.

---

## Color Distance Metric (D-03, D-04)

| Option | Description | Selected |
|--------|-------------|----------|
| ΔE2000 (CIE2000) | Perceptually uniform; gold standard for borderline judgments; ~80 lines port | ✓ |
| ΔE76 (CIE76) | Simpler (~5 lines); over-rejects on hue rotation | |
| RGB Euclidean distance | Trivial to compute; not perceptually uniform | |
| LAB Manhattan distance | Simple; less accurate than ΔE2000 | |

**Auto-selected:** ΔE2000. Reason: Phase 37's borderline pairs (#7, #12) sit in the regime where ΔE76 over-rejects (large hue rotation, similar lightness). Sharma 2005 reference implementation is well-tested. JND threshold 5.0 is the documented "clearly distinguishable" floor; Phase 40 uses 5.0 with measured-value reporting for trend visibility.

---

## Fixture / RGBA Capture (D-05, D-06, D-07)

| Option | Description | Selected |
|--------|-------------|----------|
| Direct token extraction (read `MII_MODULES[i].badgeColor` + `theme.colors[name][6]`) | Bypasses render; deterministic; fast | ✓ (primary) |
| Render-then-extract via JSDOM + getComputedStyle | Mirrors actual browser flow; exposes CSS-driven dynamics | ✓ (secondary verification) |
| Headless Chrome / Puppeteer / Playwright | Pixel-accurate post-render including layered effects | |
| Static HTML fixture | Outside test framework; harder to maintain | |

**Auto-selected:** Both — direct token extraction primary + render-then-extract secondary. Reason: direct extraction gives deterministic, fast assertions for the 21-pair gate. Render-then-extract guards against unnoticed CSS/Mantine theme drift. Avoiding Puppeteer/Playwright keeps the test in the existing 1064-test suite without new infra.

**D-07 (icon discriminability):** Color-only gate. Icon-shape discriminability stays in Phase 37's paper analysis (out of scope for Phase 40). Decision documented in test comments.

---

## Pair Scope (D-08, D-09)

| Option | Description | Selected |
|--------|-------------|----------|
| All 21 adjacent pairs from Phase 37 EMPIRICAL.md | Matches Phase 37's paper analysis exactly | ✓ |
| Just the 2 borderline pairs (#7, #12) | Smaller test surface; misses surprise regressions | |
| All C(21,2)=210 pairs | Full combinatorial coverage; mostly noise | |

**Auto-selected:** All 21 adjacent pairs (with named cases for #7 + #12). Reason: Phase 37's pair list is the authoritative scope; named borderline cases surface the high-risk pairs immediately on failure.

---

## Test Scaffolding (D-10, D-11, D-12)

| Decision | Choice | Selected |
|----------|--------|----------|
| Test file location | `src/__tests__/visual/deuteranopia.test.tsx` | ✓ |
| Utility location | `src/utils/colorVision.ts` | ✓ |
| Parameterized format | Vitest `it.each(PAIRS)` with measured-value reporting | ✓ |
| Threshold constant | `MIN_DELTA_E_DEUTERANOPIA = 5.0` | ✓ |

**Auto-selected:** All four. Reason: matches v1.5 colocation conventions; `it.each` makes pair iteration self-documenting in test output.

---

## Output / Debugging (D-13, D-14)

| Option | Description | Selected |
|--------|-------------|----------|
| Vitest pass/fail + JSON snapshot of measured ΔE2000 per pair | Belt-and-suspenders; snapshot drift surfaces palette changes | ✓ |
| Vitest pass/fail only | Simpler; no trend visibility | |
| HTML report | Heavyweight; out of stack | |

**Auto-selected:** Pass/fail + JSON snapshot. Snapshot at `src/__tests__/visual/__snapshots__/deuteranopia-pair-deltas.json`. CI integration: zero special config — runs as part of `npm test`.

---

## Phase 37 Closure (D-15, D-16, D-17)

| Decision | Choice | Selected |
|----------|--------|----------|
| 37-EMPIRICAL.md `[deferred]` cells | Flip to `[verified by deuteranopiaDiscriminability.test.ts at commit <sha>]` for all 21 pairs | ✓ |
| 37-VALIDATION.md `nyquist_compliant` | Flip `false → true`; remove `pending: DEUT-01 in Phase 40` annotation | ✓ |
| v1.5-MILESTONE-AUDIT.md | Refresh with another `re_audited:` entry; close last `tech_debt` cluster; flip status `tech_debt → passed` if no other items remain | ✓ |

**Auto-selected:** All three. Reason: Phase 39 already established the audit-refresh pattern; this is the same pattern applied to the Phase 37 carry-over. With this, v1.5's milestone audit reaches `status: passed` retroactively.

---

## Claude's Discretion

- Test message format for parameterized assertions
- Whether to include protanopia / tritanopia (deferred — D-deferred-1)
- ΔE2000 implementation source (recommend chroma-js reference port; planner verifies via Sharma 2005 sample data)

## Deferred Ideas

- Protanopia + tritanopia simulations (would 3× the pair count)
- Headless WebGL canvas rendering (Puppeteer/Playwright overhead)
- Icon-shape discriminability test (separate v1.7 candidate)
- Color-blindness-friendly contrast for non-MII surfaces (broader v1.7 visual-accessibility phase)
