/**
 * colorVision.ts — Color-vision discriminability utilities.
 *
 * Pure-JS, zero-dependency math primitives for verifying perceptual color
 * distance under deuteranopia simulation. Used by the headless Phase 40
 * deuteranopia gate at `src/__tests__/visual/deuteranopia.test.tsx` to lock
 * the 21 MII module adjacent pairs against ΔE2000 ≥ 5.0 perceptual distance
 * after applying the Machado 2009 simulation matrix at severity 1.0
 * (full deuteranopia).
 *
 * **OUT OF SCOPE.** Color-only discriminability. Icon-shape discriminability
 * is intentionally NOT covered here — paper analysis in
 * `.planning/research/color-design-audit.md` §4b/§4c remains authoritative
 * for icon claims (see Phase 40 CONTEXT D-07).
 *
 * Design constraints:
 * - Zero npm-package imports (Phase 40 CONTEXT D-01). Only `node:` builtins
 *   may appear in this file. The `simulateDeuteranopia` and `deltaE2000`
 *   functions must run in any modern JS runtime without setup.
 * - No React imports. No test-library imports. Pure math.
 *
 * Sources cited:
 * - Machado et al. 2009, "A Physiologically-based Model for Simulation of
 *   Color Vision Deficiency", IEEE TVCG 15(6), DOI 10.1109/TVCG.2009.113.
 *   Matrix locked at severity 1.0 (full deuteranopia) per Phase 40 CONTEXT
 *   D-02 to match Phase 37's paper analysis severity.
 * - Sharma et al. 2005, "The CIEDE2000 color-difference formula:
 *   Implementation notes, supplementary test data, and mathematical
 *   observations", Color Research and Application 30(1), 21-30.
 *   Reference fixtures used in unit tests; ΔE2000 implementation follows
 *   the chroma-js port (which itself ports the Sharma 2005 reference).
 */

/* eslint-disable @typescript-eslint/no-magic-numbers -- numeric constants
 * here are matrix coefficients and CIE/Machado/Sharma reference values. */

// ---------------------------------------------------------------------------
// Machado 2009 deuteranopia simulation
// ---------------------------------------------------------------------------

/**
 * Machado et al. 2009 deuteranopia simulation matrix at severity 1.0.
 * Source: "A Physiologically-based Model for Simulation of Color Vision
 * Deficiency", IEEE TVCG 15(6), DOI 10.1109/TVCG.2009.113.
 *
 * Applied as: rgb_simulated = MATRIX × rgb_input (column vector).
 * Input/output in linear RGB (0..1); callers convert from sRGB via
 * `srgbToLinear` / `linearToSrgb` (defined below).
 */
export const MACHADO_DEUTERANOPIA_MATRIX: readonly [
  readonly [number, number, number],
  readonly [number, number, number],
  readonly [number, number, number],
] = Object.freeze([
  Object.freeze([0.367322, 0.860646, -0.227968]),
  Object.freeze([0.280085, 0.672501, 0.047413]),
  Object.freeze([-0.011820, 0.042940, 0.968881]),
]) as never;

/**
 * sRGB → linear-RGB EOTF (per IEC 61966-2-1).
 * Input: a single channel in [0, 1]. Output: linear channel in [0, 1].
 */
export function srgbToLinear(c: number): number {
  return c <= 0.04045 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4);
}

/**
 * linear-RGB → sRGB inverse EOTF.
 * Input: a single channel in [0, 1]. Output: sRGB channel in [0, 1].
 */
export function linearToSrgb(c: number): number {
  return c <= 0.0031308 ? 12.92 * c : 1.055 * Math.pow(c, 1 / 2.4) - 0.055;
}

/**
 * Apply the Machado 2009 deuteranopia simulation to a single sRGB triple.
 *
 * @param rgb sRGB triple, each channel in [0, 255] integer.
 * @returns simulated sRGB triple, each channel clamped to [0, 255] integer.
 *
 * Pipeline:
 *   1. sRGB (0..255) → linear RGB (0..1) via the IEC 61966-2-1 EOTF.
 *   2. matrix × linear-RGB column vector (3×3 × 3×1 → 3×1).
 *   3. linear (0..1) → sRGB (0..1) via the inverse EOTF; multiply by 255,
 *      clamp to [0, 255], round.
 *
 * Note on test fixtures: published deuteranopia simulation outputs vary
 * slightly between implementations because of (a) sRGB EOTF roundoff and
 * (b) clamp/round order. The Phase 40 fixtures use a tolerance of ±2-5 per
 * channel to absorb these implementation-detail differences. The expected
 * values below are computed from this exact pipeline (matrix coefficients +
 * IEC 61966-2-1 EOTF + clamp+round) — see `colorVision.test.ts`.
 */
export function simulateDeuteranopia(
  rgb: readonly [number, number, number],
): [number, number, number] {
  // 1. sRGB integer → linear-RGB float
  const r_lin = srgbToLinear(rgb[0] / 255);
  const g_lin = srgbToLinear(rgb[1] / 255);
  const b_lin = srgbToLinear(rgb[2] / 255);

  // 2. Apply Machado matrix
  const M = MACHADO_DEUTERANOPIA_MATRIX;
  const r_sim_lin = M[0][0] * r_lin + M[0][1] * g_lin + M[0][2] * b_lin;
  const g_sim_lin = M[1][0] * r_lin + M[1][1] * g_lin + M[1][2] * b_lin;
  const b_sim_lin = M[2][0] * r_lin + M[2][1] * g_lin + M[2][2] * b_lin;

  // 3. linear-RGB → sRGB integer with clamp + round
  // The matrix can produce values outside [0, 1] (e.g. small negatives or
  // slight overshoots). Clamp BEFORE the inverse EOTF since Math.pow on a
  // negative base + non-integer exponent yields NaN.
  const clamp01 = (x: number): number => Math.max(0, Math.min(1, x));
  const r_out = Math.round(linearToSrgb(clamp01(r_sim_lin)) * 255);
  const g_out = Math.round(linearToSrgb(clamp01(g_sim_lin)) * 255);
  const b_out = Math.round(linearToSrgb(clamp01(b_sim_lin)) * 255);

  return [
    Math.max(0, Math.min(255, r_out)),
    Math.max(0, Math.min(255, g_out)),
    Math.max(0, Math.min(255, b_out)),
  ];
}
