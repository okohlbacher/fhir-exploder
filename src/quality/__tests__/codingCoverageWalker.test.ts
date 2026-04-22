/**
 * codingCoverageWalker.aggregateCoverage — perPathExamples tests (QDDEP-01).
 *
 * Phase 25 Plan 01 adds `perPathExamples: Record<string, CodeableConcept>`
 * to `PerTypeCoverageReport`, populated by `aggregateCoverage` in the
 * existing single-pass loop. Selection is deterministic:
 *   - The FIRST `systemCode` occurrence per aggregation path wins.
 *   - If no `systemCode` is ever seen for a path, the first non-null
 *     `textOnly` / `empty` CodeableConcept is used as a fallback.
 *   - Keys match `perPath` exactly (stripped resourceType prefix,
 *     `[\d+]` → `[*]` collapse).
 *
 * These tests are intentionally separate from the existing
 * `src/__tests__/coding-coverage-walker.test.ts` to scope Phase 25 churn
 * to a single file per the plan.
 */
import { describe, it, expect } from 'vitest';
import { aggregateCoverage } from '../codingCoverageWalker';
import type { CodeableConcept, Resource } from '@medplum/fhirtypes';

// ---------- helpers ----------

function observationWithCode(
  id: string,
  code: CodeableConcept,
): Resource {
  return { resourceType: 'Observation', id, status: 'final', code } as Resource;
}

function observationWithComponentCode(
  id: string,
  code: CodeableConcept,
): Resource {
  return {
    resourceType: 'Observation',
    id,
    status: 'final',
    component: [{ code }],
  } as Resource;
}

const systemCodeCC1: CodeableConcept = {
  coding: [{ system: 'http://loinc.org', code: '1234-5', display: 'First' }],
};
const systemCodeCC2: CodeableConcept = {
  coding: [{ system: 'http://loinc.org', code: '6789-0', display: 'Second' }],
};
const textOnlyCC: CodeableConcept = { text: 'legacy free-text code' };
const emptyCC: CodeableConcept = {};

// ---------- tests ----------

describe('aggregateCoverage perPathExamples (QDDEP-01)', () => {
  it('picks the first systemCode example encountered per path (deterministic first-win)', () => {
    const sample: Resource[] = [
      observationWithCode('a', systemCodeCC1),
      observationWithCode('b', systemCodeCC2),
    ];
    const report = aggregateCoverage(sample);
    expect(report.perPathExamples).toBeDefined();
    expect(report.perPathExamples.code).toBeDefined();
    // First-win: CC1 must be selected even though CC2 is also systemCode.
    expect(report.perPathExamples.code).toEqual(systemCodeCC1);
  });

  it('falls back to textOnly when no systemCode is ever seen for a path', () => {
    const sample: Resource[] = [observationWithCode('a', textOnlyCC)];
    const report = aggregateCoverage(sample);
    expect(report.perPathExamples.code).toEqual(textOnlyCC);
  });

  it('prefers a later systemCode over an earlier textOnly on the same path', () => {
    const sample: Resource[] = [
      observationWithCode('a', textOnlyCC), // seen first, textOnly
      observationWithCode('b', systemCodeCC1), // seen second, systemCode — must win
    ];
    const report = aggregateCoverage(sample);
    expect(report.perPathExamples.code).toEqual(systemCodeCC1);
  });

  it('empty sample yields an empty (but present) perPathExamples object', () => {
    const report = aggregateCoverage([]);
    expect(report.perPathExamples).toBeDefined();
    expect(report.perPathExamples).toEqual({});
  });

  it('uses the same aggregation key format as perPath (collapsed [*])', () => {
    const sample: Resource[] = [
      observationWithComponentCode('a', systemCodeCC1),
    ];
    const report = aggregateCoverage(sample);
    // perPath key exists at 'component[*].code' — perPathExamples must match.
    expect(report.perPath['component[*].code']).toBeDefined();
    expect(report.perPathExamples['component[*].code']).toEqual(systemCodeCC1);
  });

  it('falls back to empty CodeableConcept when that is the only non-null value seen', () => {
    // Sanity: an empty `{}` CodeableConcept still counts as a value. When
    // it is the only one on a path, it becomes the representative.
    const sample: Resource[] = [observationWithCode('a', emptyCC)];
    const report = aggregateCoverage(sample);
    expect(report.perPathExamples.code).toEqual(emptyCC);
  });
});
