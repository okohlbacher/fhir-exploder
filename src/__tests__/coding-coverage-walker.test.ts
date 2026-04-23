/**
 * QUAL-03 — classifyCodedFields walker unit tests.
 *
 * Plan 05-04 delivers `src/quality/codingCoverageWalker.ts` exporting:
 *   - classifyCodedFields(resource, path?, out?): ClassifiedCodedField[]
 *   - aggregateCoverage(sample): PerTypeCoverageReport
 *
 * Critical behaviors:
 *   - systemCode: CodeableConcept with >=1 Coding that has BOTH system and code
 *   - textOnly:   CodeableConcept with only `text` (no coding or empty coding[])
 *   - empty:      CodeableConcept with neither text nor coding
 *   - Pitfall 5:  Identifier objects MUST NOT be classified (they have
 *     system+value, fail the CC every-keys filter)
 *   - Bare Coding NOT classified (not inside a CC)
 *   - aggregateCoverage reduces a Resource[] into PerTypeCoverageReport
 *     with `[*]` array-index collapse
 */
import { describe, it, expect } from 'vitest';
import {
  classifyCodedFields,
  aggregateCoverage,
} from '../quality/codingCoverageWalker';
import { codingSamples } from './fixtures/fhir-samples';
import type { Resource } from '@medplum/fhirtypes';
import { toRecord } from '../utils/fhir-helpers';

describe('classifyCodedFields (QUAL-03)', () => {
  it('classifies a CodeableConcept with both system+code as systemCode', () => {
    const results = classifyCodedFields(codingSamples.conditionSystemCode);
    const conditionCode = results.find((r) => r.path.endsWith('code'));
    expect(conditionCode?.classification).toBe('systemCode');
  });

  it('classifies a CodeableConcept with only text as textOnly', () => {
    const results = classifyCodedFields(codingSamples.conditionTextOnly);
    const conditionCode = results.find((r) => r.path.endsWith('code'));
    expect(conditionCode?.classification).toBe('textOnly');
  });

  it('classifies a CodeableConcept with neither coding nor text as empty', () => {
    const results = classifyCodedFields(codingSamples.conditionEmpty);
    const conditionCode = results.find((r) => r.path.endsWith('code'));
    expect(conditionCode?.classification).toBe('empty');
  });

  it('recurses into arrays with bracketed path segments', () => {
    const results = classifyCodedFields(codingSamples.observationMultipleCodings);
    // Observation.category[0] should appear as a classified CC path.
    const categoryField = results.find((r) => r.path.includes('category[0]'));
    expect(categoryField).toBeDefined();
    expect(categoryField?.classification).toBe('systemCode');
    // Observation.code as well.
    const codeField = results.find((r) => r.path === 'Observation.code');
    expect(codeField?.classification).toBe('systemCode');
  });

  it('yields disjoint results for each distinct CC path', () => {
    const results = classifyCodedFields(codingSamples.observationMultipleCodings);
    const paths = results.map((r) => r.path);
    const unique = new Set(paths);
    expect(unique.size).toBe(paths.length);
  });

  it('excludes Patient.identifier[*] from classification (Pitfall 5)', () => {
    const results = classifyCodedFields(codingSamples.patientWithIdentifiers);
    // Identifier has `value`/`use`/`type`/`system` keys — fails the CC
    // every-keys filter. No top-level identifier CC should appear. The
    // inner `Identifier.type` IS a real CodeableConcept, so that one is
    // fine to classify (it's a nested CC, not the Identifier itself).
    const identifierRoot = results.find(
      (r) =>
        r.path === 'Patient.identifier' ||
        r.path === 'Patient.identifier[0]' ||
        r.path === 'identifier' ||
        r.path === 'identifier[0]',
    );
    expect(identifierRoot).toBeUndefined();
    // Sanity: the walker should still descend into Identifier.type (which
    // is a real CC) and surface Patient.identifier[0].type as systemCode.
    const identifierType = results.find((r) =>
      r.path.includes('identifier[0].type'),
    );
    expect(identifierType?.classification).toBe('systemCode');
  });

  it('does NOT classify a bare Coding (outside a CodeableConcept)', () => {
    // A bare Coding has `{ system, code }` — no `coding` array and no
    // `text` string. The heuristic's `(Array.isArray(cc.coding) ||
    // typeof cc.text === 'string')` check returns false, so the walker
    // descends but emits no ClassifiedCodedField for this node.
    const bareCodingNode = {
      resourceType: 'Dummy',
      naked: { system: 'http://example.org', code: 'x' },
    };
    const results = classifyCodedFields(bareCodingNode);
    expect(results).toEqual([]);
  });

  it('classifyCodedFields does not recurse into primitives or arrays of primitives', () => {
    // Primitives must not produce ClassifiedCodedField entries even when
    // they live at a CC-looking key position. Arrays of primitives likewise.
    const results = classifyCodedFields({
      resourceType: 'Dummy',
      stringField: 'hello',
      numberField: 42,
      booleanField: true,
      stringArray: ['a', 'b'],
    });
    expect(results).toEqual([]);
  });
});

describe('aggregateCoverage (QUAL-03)', () => {
  it('returns a zeroed report on an empty sample', () => {
    const report = aggregateCoverage([]);
    expect(report.systemCode).toBe(0);
    expect(report.textOnly).toBe(0);
    expect(report.empty).toBe(0);
    expect(report.totalCodedFields).toBe(0);
    expect(report.perPath).toEqual({});
    expect(report.sampleSize).toBe(0);
  });

  it('aggregates per-classification totals across the sample', () => {
    const sample: Resource[] = [
      codingSamples.conditionSystemCode,
      codingSamples.conditionTextOnly,
      codingSamples.conditionEmpty,
    ];
    const report = aggregateCoverage(sample);
    expect(report.sampleSize).toBe(3);
    expect(report.systemCode).toBe(1);
    expect(report.textOnly).toBe(1);
    expect(report.empty).toBe(1);
    expect(report.totalCodedFields).toBe(3);
    // ResourceType prefix stripped — aggregation key is just `code`.
    expect(report.perPath.code).toEqual({ systemCode: 1, textOnly: 1, empty: 1 });
  });

  it('collapses array indexes in aggregation paths to [*]', () => {
    const sample: Resource[] = [codingSamples.observationMultipleCodings];
    const report = aggregateCoverage(sample);
    // category[0].? should aggregate under category[*]
    expect(report.perPath['category[*]']).toBeDefined();
    expect(report.perPath['category[*]'].systemCode).toBe(1);
    // code also aggregated (Observation.code → just 'code')
    expect(report.perPath.code).toBeDefined();
    expect(report.perPath.code.systemCode).toBe(1);
  });

  it('totalCodedFields equals the sum of the three buckets', () => {
    const sample: Resource[] = [
      codingSamples.conditionSystemCode,
      codingSamples.conditionTextOnly,
      codingSamples.observationMultipleCodings,
    ];
    const report = aggregateCoverage(sample);
    expect(report.totalCodedFields).toBe(
      report.systemCode + report.textOnly + report.empty,
    );
  });

  it('returns perResource with textOnly/empty issues', () => {
    const sample: Resource[] = [
      codingSamples.conditionTextOnly,
      codingSamples.conditionEmpty,
    ];
    const report = aggregateCoverage(sample);
    expect(report.perResource).toBeDefined();
    expect(report.perResource).toHaveLength(2);
    const textOnlyEntry = report.perResource!.find(
      (r) => r.resourceId === `Condition/${toRecord(codingSamples.conditionTextOnly).id ?? 'unknown'}`,
    );
    expect(textOnlyEntry).toBeDefined();
    expect(textOnlyEntry!.issues.length).toBeGreaterThan(0);
    expect(textOnlyEntry!.issues[0].classification).toBe('textOnly');
  });

  it('excludes resources with only systemCode from perResource', () => {
    const sample: Resource[] = [codingSamples.conditionSystemCode];
    const report = aggregateCoverage(sample);
    expect(report.perResource).toEqual([]);
  });

  it('returns empty perResource for empty sample', () => {
    const report = aggregateCoverage([]);
    expect(report.perResource).toEqual([]);
  });

  it('resource without id uses unknown in resourceId', () => {
    const noIdResource = { resourceType: 'Condition', code: { text: 'test' } } as Resource;
    const report = aggregateCoverage([noIdResource]);
    expect(report.perResource).toHaveLength(1);
    expect(report.perResource![0].resourceId).toBe('Condition/unknown');
  });

  it('excludes Identifier from coverage counts (Pitfall 5 regression)', () => {
    // patientWithIdentifiers has a name (array, not CC), gender (string),
    // birthDate (string), and identifier[0].type (CC with SNOMED-like
    // system+code). After Identifier exclusion, only the nested type CC
    // remains.
    const report = aggregateCoverage([codingSamples.patientWithIdentifiers]);
    // Ensure no aggregation key equals 'identifier' or 'identifier[*]' at
    // the top level (the Identifier object itself must be skipped).
    const keys = Object.keys(report.perPath);
    expect(keys.some((k) => k === 'identifier' || k === 'identifier[*]')).toBe(
      false,
    );
    // The nested identifier[*].type (real CC) SHOULD be counted.
    expect(report.perPath['identifier[*].type']?.systemCode).toBe(1);
  });
});
