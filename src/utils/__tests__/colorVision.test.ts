/**
 * colorVision.test.ts — unit tests for colorVision.ts utilities.
 *
 * Phase 40 / DEUT-01 — verifies the pure-JS Machado 2009 deuteranopia
 * simulation matrix and the ΔE2000 (Sharma 2005) implementation against
 * published reference fixtures.
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
  srgbToLab,
  deltaE2000,
  MIN_DELTA_E_DEUTERANOPIA,
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

describe('srgbToLab (Phase 40 — sanity check for ΔE2000 input)', () => {
  it('pure red [255, 0, 0] approximates published Lab [53.24, 80.09, 67.20]', () => {
    const [L, a, b] = srgbToLab([255, 0, 0]);
    expect(Math.abs(L - 53.24)).toBeLessThan(0.5);
    expect(Math.abs(a - 80.09)).toBeLessThan(0.5);
    expect(Math.abs(b - 67.2)).toBeLessThan(0.5);
  });

  it('black [0, 0, 0] is L=0 a=0 b=0', () => {
    const [L, a, b] = srgbToLab([0, 0, 0]);
    expect(L).toBeCloseTo(0, 5);
    expect(a).toBeCloseTo(0, 5);
    expect(b).toBeCloseTo(0, 5);
  });
});

describe('deltaE2000 (Sharma 2005 reference fixtures)', () => {
  // Sharma 2005 Table 1 sample data — canonical CIEDE2000 reference fixtures.
  // Source: https://www2.ece.rochester.edu/~gsharma/ciede2000/
  // Tolerance ±0.01 per Phase 40 plan Task 2.
  const TOLERANCE = 0.01;

  it.each([
    {
      lab1: [50.0, 2.6772, -79.7751] as const,
      lab2: [50.0, 0.0, -82.7485] as const,
      expected: 2.0425,
    },
    {
      lab1: [50.0, 3.1571, -77.2803] as const,
      lab2: [50.0, 0.0, -82.7485] as const,
      expected: 2.8615,
    },
    {
      lab1: [50.0, 2.8361, -74.02] as const,
      lab2: [50.0, 0.0, -82.7485] as const,
      expected: 3.4412,
    },
    {
      lab1: [50.0, -1.3802, -84.2814] as const,
      lab2: [50.0, 0.0, -82.7485] as const,
      expected: 1.0,
    },
  ])(
    'Sharma 2005 fixture: ΔE2000(lab1, lab2) ≈ $expected',
    ({ lab1, lab2, expected }) => {
      const measured = deltaE2000(lab1, lab2);
      expect(Math.abs(measured - expected)).toBeLessThanOrEqual(TOLERANCE);
    },
  );

  it('identity: deltaE2000([50, 0, 0], [50, 0, 0]) === 0', () => {
    expect(deltaE2000([50, 0, 0], [50, 0, 0])).toBe(0);
  });

  it('symmetric: ΔE2000(a, b) === ΔE2000(b, a)', () => {
    const a = [50, 2.6772, -79.7751] as const;
    const b = [50, 0, -82.7485] as const;
    expect(deltaE2000(a, b)).toBeCloseTo(deltaE2000(b, a), 6);
  });
});

describe('MIN_DELTA_E_DEUTERANOPIA threshold constant', () => {
  it('is exactly 5.0 per Phase 40 CONTEXT D-04', () => {
    expect(MIN_DELTA_E_DEUTERANOPIA).toBe(5.0);
  });
});
