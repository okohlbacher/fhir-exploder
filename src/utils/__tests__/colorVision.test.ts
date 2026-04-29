/**
 * colorVision.test.ts — unit tests for colorVision.ts utilities.
 *
 * Phase 40 / DEUT-01 — verifies the pure-JS Machado 2009 deuteranopia
 * simulation matrix and (in Task 2) the ΔE2000 (Sharma 2005)
 * implementation against published reference fixtures.
 *
 * Fixture-derivation note: the deuteranopia simulation expected values
 * below were COMPUTED FROM THE FORMULA itself (Machado matrix + IEC
 * 61966-2-1 sRGB EOTF + clamp+round), not pulled from an external
 * implementation. This is the approach recommended by the Phase 40 plan
 * (Task 1) — the matrix coefficients are the contract, the integer
 * triples are derived. The ±2 tolerance absorbs floating-point drift
 * across Node versions; the fixtures self-document the expected output
 * shape (yellow-brown collapse for red+green; blue near-invariant).
 */

import { describe, it, expect } from 'vitest';
import {
  simulateDeuteranopia,
  MACHADO_DEUTERANOPIA_MATRIX,
  srgbToLinear,
  linearToSrgb,
} from '../colorVision';

describe('Machado 2009 deuteranopia simulation matrix', () => {
  it('matrix is frozen 3x3', () => {
    expect(MACHADO_DEUTERANOPIA_MATRIX).toHaveLength(3);
    expect(MACHADO_DEUTERANOPIA_MATRIX[0]).toHaveLength(3);
    expect(Object.isFrozen(MACHADO_DEUTERANOPIA_MATRIX)).toBe(true);
    expect(Object.isFrozen(MACHADO_DEUTERANOPIA_MATRIX[0])).toBe(true);
  });

  it('sRGB EOTF roundtrip is identity (within float epsilon)', () => {
    for (const c of [0, 0.04, 0.05, 0.5, 0.99, 1.0]) {
      const round = linearToSrgb(srgbToLinear(c));
      expect(Math.abs(round - c)).toBeLessThan(1e-9);
    }
  });
});

describe('simulateDeuteranopia (Machado 2009 severity 1.0)', () => {
  // Computed fixtures (from the matrix itself) — see header note.
  // Tolerance ±2 per channel absorbs Node-version FP drift on the EOTF.
  const TOLERANCE = 2;

  function expectClose(
    actual: readonly [number, number, number],
    expected: readonly [number, number, number],
    tol = TOLERANCE,
  ): void {
    expect(Math.abs(actual[0] - expected[0])).toBeLessThanOrEqual(tol);
    expect(Math.abs(actual[1] - expected[1])).toBeLessThanOrEqual(tol);
    expect(Math.abs(actual[2] - expected[2])).toBeLessThanOrEqual(tol);
  }

  it('red [255, 0, 0] collapses toward yellow-brown', () => {
    // Machado severity 1.0: red → ~[163, 144, 0] (saturated yellow-brown).
    expectClose(simulateDeuteranopia([255, 0, 0]), [163, 144, 0]);
  });

  it('green [0, 255, 0] collapses toward yellow', () => {
    // Machado severity 1.0: green → ~[239, 214, 58] (yellowish).
    expectClose(simulateDeuteranopia([0, 255, 0]), [239, 214, 58]);
  });

  it('blue [0, 0, 255] is near-invariant', () => {
    // Tolerance ±5 here per Phase 40 plan Task 1 — blue is nominally
    // "invariant" but the matrix has small green-channel bleed.
    expectClose(simulateDeuteranopia([0, 0, 255]), [0, 61, 251], 5);
  });

  it('black [0, 0, 0] is invariant', () => {
    expect(simulateDeuteranopia([0, 0, 0])).toEqual([0, 0, 0]);
  });

  it('white [255, 255, 255] is invariant', () => {
    expect(simulateDeuteranopia([255, 255, 255])).toEqual([255, 255, 255]);
  });

  it('output channels are integers in [0, 255]', () => {
    const out = simulateDeuteranopia([128, 64, 200]);
    for (const c of out) {
      expect(Number.isInteger(c)).toBe(true);
      expect(c).toBeGreaterThanOrEqual(0);
      expect(c).toBeLessThanOrEqual(255);
    }
  });
});
