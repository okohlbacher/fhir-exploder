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

// ---------------------------------------------------------------------------
// CIELAB conversion + ΔE2000 (Sharma 2005)
// ---------------------------------------------------------------------------

/**
 * Pass threshold per Phase 40 CONTEXT D-04. Below 5.0 = ΔE2000 perceptual
 * distance is too small under deuteranopia simulation; pair fails the
 * discriminability gate. Source: Sharma 2005 / ISO/CIE 11664-6 JND guidance
 * (5.0 ≈ "clearly distinguishable" boundary; 1.0 ≈ "just-noticeable
 * difference").
 */
export const MIN_DELTA_E_DEUTERANOPIA = 5.0;

// sRGB D65 → CIE XYZ matrix (Bruce Lindbloom / IEC 61966-2-1).
const SRGB_TO_XYZ: readonly [
  readonly [number, number, number],
  readonly [number, number, number],
  readonly [number, number, number],
] = Object.freeze([
  Object.freeze([0.4124564, 0.3575761, 0.1804375]),
  Object.freeze([0.2126729, 0.7151522, 0.0721750]),
  Object.freeze([0.0193339, 0.1191920, 0.9503041]),
]) as never;

// CIE D65 reference white (2° observer).
const D65_XN = 0.95047;
const D65_YN = 1.0;
const D65_ZN = 1.08883;

// 25^7 = 6103515625 — module-level constant for ΔE2000 inner loop.
const POW_25_7 = Math.pow(25, 7);

// Lab-conversion thresholds (Bruce Lindbloom / CIE 15:2004).
const LAB_DELTA = 6 / 29; // (6/29)
const LAB_DELTA_CUBED = LAB_DELTA * LAB_DELTA * LAB_DELTA; // (6/29)^3
const LAB_F_LINEAR_FACTOR = (1 / 3) * (29 / 6) * (29 / 6); // 1/3 · (29/6)^2

function labF(t: number): number {
  return t > LAB_DELTA_CUBED ? Math.cbrt(t) : LAB_F_LINEAR_FACTOR * t + 4 / 29;
}

/**
 * Convert sRGB (0..255 integer) → CIELAB (D65 reference white).
 *
 * Pipeline:
 *   1. sRGB integer → linear RGB (0..1) via the IEC 61966-2-1 EOTF.
 *   2. linear RGB → CIE XYZ via the sRGB D65 matrix (Bruce Lindbloom).
 *   3. XYZ → CIELAB with f(t) piecewise-linear approximation near 0.
 *
 * @returns `[L, a, b]` triple. Black is `[0, 0, 0]`; pure red is
 * approximately `[53.24, 80.09, 67.20]` per published Lab values.
 */
export function srgbToLab(
  rgb: readonly [number, number, number],
): [number, number, number] {
  // 1. sRGB integer → linear-RGB float
  const r_lin = srgbToLinear(rgb[0] / 255);
  const g_lin = srgbToLinear(rgb[1] / 255);
  const b_lin = srgbToLinear(rgb[2] / 255);

  // 2. linear-RGB → XYZ
  const M = SRGB_TO_XYZ;
  const X = M[0][0] * r_lin + M[0][1] * g_lin + M[0][2] * b_lin;
  const Y = M[1][0] * r_lin + M[1][1] * g_lin + M[1][2] * b_lin;
  const Z = M[2][0] * r_lin + M[2][1] * g_lin + M[2][2] * b_lin;

  // 3. XYZ → CIELAB (D65)
  const fx = labF(X / D65_XN);
  const fy = labF(Y / D65_YN);
  const fz = labF(Z / D65_ZN);
  const L = 116 * fy - 16;
  const a = 500 * (fx - fy);
  const b = 200 * (fy - fz);
  return [L, a, b];
}

/**
 * Compute the CIEDE2000 (ΔE2000) perceptual color distance between two
 * CIELAB triples.
 *
 * Source: Sharma et al. 2005, "The CIEDE2000 color-difference formula:
 * Implementation notes, supplementary test data, and mathematical
 * observations", Color Research and Application 30(1), 21-30. Reference
 * implementation at https://www2.ece.rochester.edu/~gsharma/ciede2000/.
 * Port follows the chroma-js shape (well-tested) and reproduces Sharma's
 * Table 1 reference fixtures within ±0.01 — see colorVision.test.ts.
 *
 * Uses `kL = kC = kH = 1` (the standard parametric weighting). For
 * deuteranopia gating in Phase 40 these defaults are correct; alternate
 * parametric weightings (textile, graphic arts) are not needed.
 *
 * @returns Non-negative ΔE2000 perceptual distance. Identity inputs return
 * exactly 0.
 */
export function deltaE2000(
  lab1: readonly [number, number, number],
  lab2: readonly [number, number, number],
): number {
  const [L1, a1, b1] = lab1;
  const [L2, a2, b2] = lab2;

  // Identity short-circuit (avoids floating-point dust on identical inputs).
  if (L1 === L2 && a1 === a2 && b1 === b2) return 0;

  const kL = 1;
  const kC = 1;
  const kH = 1;

  const deg2rad = Math.PI / 180;
  const rad2deg = 180 / Math.PI;

  // Step 1: C1*, C2*, C̄, G, a1', a2', C1', C2', h1', h2'
  const C1_star = Math.sqrt(a1 * a1 + b1 * b1);
  const C2_star = Math.sqrt(a2 * a2 + b2 * b2);
  const Cbar_star = (C1_star + C2_star) / 2;
  const Cbar_star_7 = Math.pow(Cbar_star, 7);
  // 25^7 = 6103515625 (computed once at module load below).
  const G = 0.5 * (1 - Math.sqrt(Cbar_star_7 / (Cbar_star_7 + POW_25_7)));
  const a1_prime = (1 + G) * a1;
  const a2_prime = (1 + G) * a2;
  const C1_prime = Math.sqrt(a1_prime * a1_prime + b1 * b1);
  const C2_prime = Math.sqrt(a2_prime * a2_prime + b2 * b2);

  function hueAngle(b: number, a: number): number {
    if (b === 0 && a === 0) return 0;
    const h = Math.atan2(b, a) * rad2deg;
    return h < 0 ? h + 360 : h;
  }
  const h1_prime = hueAngle(b1, a1_prime);
  const h2_prime = hueAngle(b2, a2_prime);

  // Step 2: ΔL', ΔC', Δh', ΔH'
  const dL_prime = L2 - L1;
  const dC_prime = C2_prime - C1_prime;
  let dh_prime: number;
  if (C1_prime * C2_prime === 0) {
    dh_prime = 0;
  } else {
    const diff = h2_prime - h1_prime;
    if (Math.abs(diff) <= 180) {
      dh_prime = diff;
    } else if (diff > 180) {
      dh_prime = diff - 360;
    } else {
      dh_prime = diff + 360;
    }
  }
  const dH_prime =
    2 * Math.sqrt(C1_prime * C2_prime) * Math.sin((dh_prime / 2) * deg2rad);

  // Step 3: L̄', C̄', h̄'
  const Lbar_prime = (L1 + L2) / 2;
  const Cbar_prime = (C1_prime + C2_prime) / 2;
  let hbar_prime: number;
  if (C1_prime * C2_prime === 0) {
    hbar_prime = h1_prime + h2_prime;
  } else {
    const sum = h1_prime + h2_prime;
    const absDiff = Math.abs(h1_prime - h2_prime);
    if (absDiff <= 180) {
      hbar_prime = sum / 2;
    } else if (sum < 360) {
      hbar_prime = (sum + 360) / 2;
    } else {
      hbar_prime = (sum - 360) / 2;
    }
  }

  // Step 4: T, SL, SC, SH, RT
  const T =
    1 -
    0.17 * Math.cos((hbar_prime - 30) * deg2rad) +
    0.24 * Math.cos((2 * hbar_prime) * deg2rad) +
    0.32 * Math.cos((3 * hbar_prime + 6) * deg2rad) -
    0.20 * Math.cos((4 * hbar_prime - 63) * deg2rad);
  const dTheta =
    30 * Math.exp(-Math.pow((hbar_prime - 275) / 25, 2));
  const Cbar_prime_7 = Math.pow(Cbar_prime, 7);
  const RC =
    2 * Math.sqrt(Cbar_prime_7 / (Cbar_prime_7 + POW_25_7));
  const Lbar_prime_minus_50_sq =
    (Lbar_prime - 50) * (Lbar_prime - 50);
  const SL =
    1 +
    (0.015 * Lbar_prime_minus_50_sq) /
      Math.sqrt(20 + Lbar_prime_minus_50_sq);
  const SC = 1 + 0.045 * Cbar_prime;
  const SH = 1 + 0.015 * Cbar_prime * T;
  const RT = -Math.sin(2 * dTheta * deg2rad) * RC;

  // Step 5: combine
  const term_L = dL_prime / (kL * SL);
  const term_C = dC_prime / (kC * SC);
  const term_H = dH_prime / (kH * SH);
  return Math.sqrt(
    term_L * term_L + term_C * term_C + term_H * term_H + RT * term_C * term_H,
  );
}
