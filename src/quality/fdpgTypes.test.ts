/**
 * Smoke tests for the FDPG v3 TypeScript interfaces + constants.
 *
 * These tests assert:
 *   - FDPG_SQ_VERSION is the exact pinned URL (T-22-08 version confusion)
 *   - Context term codes use the fdpg.mii.cds system with Fall / Diagnose
 *   - The interfaces compile against the expected minimal shapes
 *
 * Test names cited by 22-VALIDATION.md `-t "…"` filters.
 */
import { describe, it, expect } from 'vitest';
import {
  FDPG_SQ_VERSION,
  FDPG_CONTEXT_FALL,
  FDPG_CONTEXT_DIAGNOSE,
  type StructuredQuery,
  type FdpgCriterion,
  type FdpgTermCode,
} from './fdpgTypes';

describe('fdpgTypes', () => {
  it('pins the v3 schema URL as a literal constant', () => {
    expect(FDPG_SQ_VERSION).toBe(
      'https://medizininformatik-initiative.de/fdpg/StructuredQuery/v3/schema',
    );
  });

  it('exposes Fall and Diagnose context term-codes in the fdpg.mii.cds system', () => {
    expect(FDPG_CONTEXT_FALL.system).toBe('fdpg.mii.cds');
    expect(FDPG_CONTEXT_FALL.code).toBe('Fall');
    expect(FDPG_CONTEXT_DIAGNOSE.system).toBe('fdpg.mii.cds');
    expect(FDPG_CONTEXT_DIAGNOSE.code).toBe('Diagnose');
  });

  it('StructuredQuery type requires version and inclusionCriteria', () => {
    // Compile-time check — if these assignments fail, type is broken.
    const sq: StructuredQuery = {
      version: FDPG_SQ_VERSION,
      inclusionCriteria: [],
    };
    expect(sq.version).toBe(FDPG_SQ_VERSION);
  });

  it('FdpgCriterion has termCodes (array) and context (single)', () => {
    const c: FdpgCriterion = {
      termCodes: [{ system: 's', code: 'c' }],
      context: FDPG_CONTEXT_DIAGNOSE,
    };
    expect(c.termCodes).toHaveLength(1);
  });

  it('FdpgTermCode requires system and code', () => {
    const t: FdpgTermCode = { system: 'http://snomed.info/sct', code: '44054006' };
    expect(t.code).toBe('44054006');
  });
});
