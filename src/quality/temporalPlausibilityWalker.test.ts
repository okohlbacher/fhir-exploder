/**
 * DQ-05 -- temporal plausibility walker unit tests.
 *
 * Plan 16-02 delivers `src/quality/temporalPlausibilityWalker.ts` exporting:
 *   - discoverTemporalPaths(profile): TemporalPath[]
 *   - discoverTemporalPathsByShape(resource, prefix): TemporalPath[]
 *   - checkTemporalPlausibility(resource, profile, thresholds?, patientBirthDate?): TemporalIssue[]
 *   - normalizeTemporalIssues(issues, resource): NormalizedIssue[]
 *
 * Test categories:
 *   1. Temporal path discovery from profiles
 *   2. Future date checks
 *   3. Period consistency checks
 *   4. Age plausibility checks
 *   5. Clinical duration checks
 *   6. Runtime fallback (shape detection)
 *   7. Normalization to NormalizedIssue[]
 */
import { describe, it, expect } from 'vitest';
import type { StructureDefinition, Resource } from '@medplum/fhirtypes';
import {
  discoverTemporalPaths,
  discoverTemporalPathsByShape,
  checkTemporalPlausibility,
  normalizeTemporalIssues,
} from './temporalPlausibilityWalker';
import { toRecord } from '../utils/fhir-helpers';

// --- Mini profiles for testing ---

const miniEncounterProfile: StructureDefinition = {
  resourceType: 'StructureDefinition',
  url: 'http://test/encounter',
  name: 'TestEncounter',
  status: 'active',
  kind: 'resource',
  abstract: false,
  type: 'Encounter',
  snapshot: {
    element: [
      { path: 'Encounter', id: 'Encounter' },
      { path: 'Encounter.status', type: [{ code: 'code' }] },
      { path: 'Encounter.class', type: [{ code: 'Coding' }] },
      { path: 'Encounter.period', type: [{ code: 'Period' }], min: 1, mustSupport: true },
      { path: 'Encounter.subject', type: [{ code: 'Reference' }] },
    ],
  },
};

const miniPatientProfile: StructureDefinition = {
  resourceType: 'StructureDefinition',
  url: 'http://test/patient',
  name: 'TestPatient',
  status: 'active',
  kind: 'resource',
  abstract: false,
  type: 'Patient',
  snapshot: {
    element: [
      { path: 'Patient', id: 'Patient' },
      { path: 'Patient.birthDate', type: [{ code: 'date' }], mustSupport: true },
      { path: 'Patient.name', type: [{ code: 'HumanName' }] },
      { path: 'Patient.gender', type: [{ code: 'code' }] },
    ],
  },
};

const miniObservationProfile: StructureDefinition = {
  resourceType: 'StructureDefinition',
  url: 'http://test/observation',
  name: 'TestObservation',
  status: 'active',
  kind: 'resource',
  abstract: false,
  type: 'Observation',
  snapshot: {
    element: [
      { path: 'Observation', id: 'Observation' },
      { path: 'Observation.status', type: [{ code: 'code' }] },
      { path: 'Observation.effective[x]', type: [{ code: 'dateTime' }, { code: 'Period' }] },
      { path: 'Observation.issued', type: [{ code: 'instant' }] },
      { path: 'Observation.value[x]', type: [{ code: 'Quantity' }, { code: 'string' }] },
    ],
  },
};

const noTemporalProfile: StructureDefinition = {
  resourceType: 'StructureDefinition',
  url: 'http://test/no-temporal',
  name: 'NoTemporalFields',
  status: 'active',
  kind: 'resource',
  abstract: false,
  type: 'Basic',
  snapshot: {
    element: [
      { path: 'Basic', id: 'Basic' },
      { path: 'Basic.code', type: [{ code: 'CodeableConcept' }] },
      { path: 'Basic.subject', type: [{ code: 'Reference' }] },
    ],
  },
};

// --- Tests ---

describe('discoverTemporalPaths (D-07)', () => {
  it('returns paths with type dateTime/date/Period/instant from a mixed-element profile', () => {
    const paths = discoverTemporalPaths(miniObservationProfile);
    expect(paths).toEqual(
      expect.arrayContaining([
        { path: 'Observation.effective[x]', type: 'dateTime' },
        { path: 'Observation.effective[x]', type: 'Period' },
        { path: 'Observation.issued', type: 'instant' },
      ]),
    );
    // Should NOT include non-temporal types
    const types = paths.map((p) => p.type);
    expect(types).not.toContain('Quantity');
    expect(types).not.toContain('string');
    expect(types).not.toContain('code');
  });

  it('returns empty array for a profile with no temporal elements', () => {
    const paths = discoverTemporalPaths(noTemporalProfile);
    expect(paths).toEqual([]);
  });

  it('handles choice-type elements like onset[x] that include dateTime among their types', () => {
    const conditionProfile: StructureDefinition = {
      resourceType: 'StructureDefinition',
      url: 'http://test/condition',
      name: 'TestCondition',
      status: 'active',
      kind: 'resource',
      abstract: false,
      type: 'Condition',
      snapshot: {
        element: [
          { path: 'Condition', id: 'Condition' },
          {
            path: 'Condition.onset[x]',
            type: [
              { code: 'dateTime' },
              { code: 'Age' },
              { code: 'Period' },
              { code: 'Range' },
              { code: 'string' },
            ],
          },
        ],
      },
    };
    const paths = discoverTemporalPaths(conditionProfile);
    expect(paths).toEqual(
      expect.arrayContaining([
        { path: 'Condition.onset[x]', type: 'dateTime' },
        { path: 'Condition.onset[x]', type: 'Period' },
      ]),
    );
    // Age, Range, string are not temporal
    const types = paths.map((p) => p.type);
    expect(types).not.toContain('Age');
    expect(types).not.toContain('Range');
    expect(types).not.toContain('string');
  });
});

describe('checkTemporalPlausibility - Future date (D-06.1)', () => {
  it('flags a Patient.birthDate in the future as a warning', () => {
    const patient = {
      resourceType: 'Patient',
      id: 'p1',
      birthDate: '2030-01-01',
    } as unknown as Resource;
    const issues = checkTemporalPlausibility(patient, miniPatientProfile);
    const futureIssues = issues.filter((i) => i.checkType === 'future-date');
    expect(futureIssues.length).toBeGreaterThanOrEqual(1);
    expect(futureIssues[0].severity).toBe('warning');
    expect(futureIssues[0].path).toContain('birthDate');
  });

  it('does NOT flag a date within 1 hour of now', () => {
    // A date 30 minutes from now should be within tolerance
    const nearFuture = new Date(Date.now() + 30 * 60 * 1000);
    const patient = {
      resourceType: 'Patient',
      id: 'p2',
      birthDate: nearFuture.toISOString().slice(0, 10),
    } as unknown as Resource;
    // Use the profile-based approach. birthDate as today's date won't trigger future-date.
    const issues = checkTemporalPlausibility(patient, miniPatientProfile);
    const futureIssues = issues.filter((i) => i.checkType === 'future-date');
    expect(futureIssues).toEqual([]);
  });
});

describe('checkTemporalPlausibility - Period consistency (D-06.2)', () => {
  it('flags Encounter.period with end < start as an error', () => {
    const encounter = {
      resourceType: 'Encounter',
      id: 'e1',
      status: 'finished',
      class: { code: 'AMB' },
      period: {
        start: '2024-06-01T10:00:00Z',
        end: '2024-05-01T10:00:00Z',
      },
    } as unknown as Resource;
    const issues = checkTemporalPlausibility(encounter, miniEncounterProfile);
    const invertedIssues = issues.filter((i) => i.checkType === 'inverted-period');
    expect(invertedIssues.length).toBeGreaterThanOrEqual(1);
    expect(invertedIssues[0].severity).toBe('error');
  });

  it('produces no issue when end > start', () => {
    const encounter = {
      resourceType: 'Encounter',
      id: 'e2',
      status: 'finished',
      class: { code: 'AMB' },
      period: {
        start: '2024-05-01T10:00:00Z',
        end: '2024-06-01T10:00:00Z',
      },
    } as unknown as Resource;
    const issues = checkTemporalPlausibility(encounter, miniEncounterProfile);
    const invertedIssues = issues.filter((i) => i.checkType === 'inverted-period');
    expect(invertedIssues).toEqual([]);
  });
});

describe('checkTemporalPlausibility - Age plausibility (D-06.3)', () => {
  it('flags Patient.birthDate implying age > 150 as error', () => {
    const patient = {
      resourceType: 'Patient',
      id: 'p3',
      birthDate: '1800-01-01',
    } as unknown as Resource;
    const issues = checkTemporalPlausibility(patient, miniPatientProfile);
    const ageIssues = issues.filter((i) => i.checkType === 'implausible-age');
    expect(ageIssues.length).toBeGreaterThanOrEqual(1);
    expect(ageIssues[0].severity).toBe('error');
  });

  it('flags Patient.birthDate implying negative age as error', () => {
    const patient = {
      resourceType: 'Patient',
      id: 'p4',
      birthDate: '2030-01-01',
    } as unknown as Resource;
    const issues = checkTemporalPlausibility(patient, miniPatientProfile);
    const ageIssues = issues.filter((i) => i.checkType === 'implausible-age');
    expect(ageIssues.length).toBeGreaterThanOrEqual(1);
    expect(ageIssues[0].severity).toBe('error');
  });
});

describe('checkTemporalPlausibility - Clinical duration (D-06.4)', () => {
  it('flags Encounter with period spanning > 365 days as warning', () => {
    const encounter = {
      resourceType: 'Encounter',
      id: 'e3',
      status: 'finished',
      class: { code: 'AMB' },
      period: {
        start: '2020-01-01T00:00:00Z',
        end: '2022-06-01T00:00:00Z',
      },
    } as unknown as Resource;
    const issues = checkTemporalPlausibility(encounter, miniEncounterProfile);
    const durationIssues = issues.filter((i) => i.checkType === 'clinical-duration');
    expect(durationIssues.length).toBeGreaterThanOrEqual(1);
    expect(durationIssues[0].severity).toBe('warning');
  });

  it('flags Observation.effectiveDateTime before patient birth as error', () => {
    const observation = {
      resourceType: 'Observation',
      id: 'obs1',
      status: 'final',
      code: { coding: [{ system: 'http://loinc.org', code: '1234' }] },
      effectiveDateTime: '2000-01-01T00:00:00Z',
    } as unknown as Resource;
    const issues = checkTemporalPlausibility(
      observation,
      miniObservationProfile,
      undefined,
      '2010-06-15', // patient born in 2010
    );
    const durationIssues = issues.filter((i) => i.checkType === 'clinical-duration');
    expect(durationIssues.length).toBeGreaterThanOrEqual(1);
    expect(durationIssues[0].severity).toBe('error');
  });
});

describe('checkTemporalPlausibility - Runtime fallback', () => {
  it('detects temporal issues on a resource without a bundled profile', () => {
    const unknownResource = {
      resourceType: 'AllergyIntolerance',
      id: 'ai1',
      onsetDateTime: '2030-06-01T00:00:00Z',
      recordedDate: '2024-01-01',
    } as unknown as Resource;
    // No profile => null
    const issues = checkTemporalPlausibility(unknownResource, null);
    // Should still detect the future date in onsetDateTime via shape detection
    const futureIssues = issues.filter((i) => i.checkType === 'future-date');
    expect(futureIssues.length).toBeGreaterThanOrEqual(1);
  });
});

describe('normalizeTemporalIssues', () => {
  it('returns NormalizedIssue[] with correct fields', () => {
    const patient = {
      resourceType: 'Patient',
      id: 'p5',
      birthDate: '2030-01-01',
    } as unknown as Resource;
    const issues = checkTemporalPlausibility(patient, miniPatientProfile);
    expect(issues.length).toBeGreaterThan(0);

    const normalized = normalizeTemporalIssues(issues, patient);
    expect(normalized.length).toBe(issues.length);
    for (const n of normalized) {
      expect(n.resourceId).toBe('Patient/p5');
      expect(n.resourceType).toBe('Patient');
      expect(typeof n.field).toBe('string');
      expect(typeof n.description).toBe('string');
      expect(['error', 'warning', 'info']).toContain(n.severity);
    }
  });
});

describe('Threat mitigations', () => {
  it('T-16-04: limits recursion depth in shape detection to prevent stack overflow', () => {
    // Create a deeply nested resource (15 levels deep)
    let deep: Record<string, unknown> = { dateField: '2030-01-01T00:00:00Z' };
    for (let i = 0; i < 15; i++) {
      deep = { nested: deep };
    }
    const resource = {
      resourceType: 'CustomType',
      id: 'deep1',
      ...deep,
    } as unknown as Resource;
    // Should not throw, and should not detect the deeply nested date
    const paths = discoverTemporalPathsByShape(
      toRecord(resource),
      'CustomType',
    );
    // With depth limit of 10, the date at level 15 should not be found
    const deepPaths = paths.filter((p) => p.path.includes('dateField'));
    expect(deepPaths).toEqual([]);
  });

  it('T-16-05: validates thresholds and falls back to defaults for invalid values', () => {
    const patient = {
      resourceType: 'Patient',
      id: 'p6',
      birthDate: '1800-01-01',
    } as unknown as Resource;
    // Pass invalid thresholds
    const issues = checkTemporalPlausibility(patient, miniPatientProfile, {
      maxAge: -5,
      maxEncounterDays: NaN,
    });
    // Should still work using defaults -- 1800 birthDate should flag implausible age
    const ageIssues = issues.filter((i) => i.checkType === 'implausible-age');
    expect(ageIssues.length).toBeGreaterThanOrEqual(1);
  });
});
