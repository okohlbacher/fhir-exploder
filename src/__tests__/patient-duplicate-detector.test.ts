/**
 * DQ-07 — patientDuplicateDetector unit tests.
 *
 * Plan 17-01 delivers `src/quality/patientDuplicateDetector.ts` exporting:
 *   - findPatientDuplicates(patients: Resource[]):
 *       { clusters: PatientDuplicateCluster[]; skippedCount: number }
 *   - normalizePatientDuplicateIssues(clusters): NormalizedIssue[]
 *
 * Critical behaviors tested here:
 * - D-01/D-02: name+DOB normalization (lowercase + trim)
 * - D-03: skipped counting when name or birthDate is missing
 * - Cluster shape: only groups of >= 2 returned
 * - Normalized issue format matches "[patient-duplicate]" prefix
 */
import { describe, it, expect } from 'vitest';
import type { Resource } from '@medplum/fhirtypes';
import {
  findPatientDuplicates,
  normalizePatientDuplicateIssues,
} from '../quality/patientDuplicateDetector';

function patient(
  id: string,
  family: string | undefined,
  given: string | undefined,
  birthDate: string | undefined,
): Resource {
  const name =
    family !== undefined || given !== undefined
      ? [{ family, given: given !== undefined ? [given] : undefined }]
      : undefined;
  return {
    resourceType: 'Patient',
    id,
    ...(name ? { name } : {}),
    ...(birthDate !== undefined ? { birthDate } : {}),
  } as Resource;
}

describe('findPatientDuplicates (DQ-07)', () => {
  it('groups two patients with case-insensitive, trim-normalized name+DOB', () => {
    const result = findPatientDuplicates([
      patient('1', 'Smith', 'John', '1990-01-01'),
      patient('2', ' smith ', ' john ', '1990-01-01'),
    ]);
    expect(result.clusters).toHaveLength(1);
    expect(result.clusters[0].patients).toHaveLength(2);
    expect(result.clusters[0].key).toBe('smith|john|1990-01-01');
    expect(result.skippedCount).toBe(0);
  });

  it('groups three patients with the same normalized name+DOB into one cluster of 3', () => {
    const result = findPatientDuplicates([
      patient('1', 'Mueller', 'Anna', '1985-05-05'),
      patient('2', 'MUELLER', 'ANNA', '1985-05-05'),
      patient('3', 'mueller', 'anna', '1985-05-05'),
    ]);
    expect(result.clusters).toHaveLength(1);
    expect(result.clusters[0].patients).toHaveLength(3);
  });

  it('increments skippedCount for patients missing birthDate', () => {
    const result = findPatientDuplicates([
      patient('1', 'Smith', 'John', undefined),
    ]);
    expect(result.clusters).toHaveLength(0);
    expect(result.skippedCount).toBe(1);
  });

  it('increments skippedCount for patients missing name entirely', () => {
    const result = findPatientDuplicates([
      patient('1', undefined, undefined, '1990-01-01'),
    ]);
    expect(result.clusters).toHaveLength(0);
    expect(result.skippedCount).toBe(1);
  });

  it('increments skippedCount for patients missing family name', () => {
    const result = findPatientDuplicates([
      patient('1', undefined, 'John', '1990-01-01'),
    ]);
    expect(result.clusters).toHaveLength(0);
    expect(result.skippedCount).toBe(1);
  });

  it('increments skippedCount for patients missing given name', () => {
    const result = findPatientDuplicates([
      patient('1', 'Smith', undefined, '1990-01-01'),
    ]);
    expect(result.clusters).toHaveLength(0);
    expect(result.skippedCount).toBe(1);
  });

  it('returns 0 clusters for two distinct patients', () => {
    const result = findPatientDuplicates([
      patient('1', 'Smith', 'John', '1990-01-01'),
      patient('2', 'Doe', 'Jane', '1991-02-02'),
    ]);
    expect(result.clusters).toHaveLength(0);
    expect(result.skippedCount).toBe(0);
  });

  it('returns 0 clusters and skippedCount=0 for empty input', () => {
    const result = findPatientDuplicates([]);
    expect(result.clusters).toHaveLength(0);
    expect(result.skippedCount).toBe(0);
  });

  it('cluster members are prefixed with Patient/', () => {
    const result = findPatientDuplicates([
      patient('abc', 'Smith', 'John', '1990-01-01'),
      patient('def', 'Smith', 'John', '1990-01-01'),
    ]);
    expect(result.clusters[0].patients.map((p) => p.id).sort()).toEqual([
      'Patient/abc',
      'Patient/def',
    ]);
    expect(result.clusters[0].patients[0].resourceType).toBe('Patient');
  });

  it('does not include singleton patients in clusters', () => {
    const result = findPatientDuplicates([
      patient('1', 'Smith', 'John', '1990-01-01'),
      patient('2', 'Smith', 'John', '1990-01-01'),
      patient('3', 'Unique', 'Person', '2000-01-01'),
    ]);
    expect(result.clusters).toHaveLength(1);
    expect(result.clusters[0].patients).toHaveLength(2);
  });
});

describe('normalizePatientDuplicateIssues (DQ-07)', () => {
  it('emits one issue per patient in each cluster', () => {
    const clusters = [
      {
        key: 'smith|john|1990-01-01',
        patients: [
          { id: 'Patient/1', resourceType: 'Patient' },
          { id: 'Patient/2', resourceType: 'Patient' },
        ],
      },
    ];
    const issues = normalizePatientDuplicateIssues(clusters);
    expect(issues).toHaveLength(2);
    expect(issues[0].description).toContain('[patient-duplicate]');
    expect(issues[0].severity).toBe('warning');
    expect(issues[0].resourceType).toBe('Patient');
    expect(issues[0].field).toBe('name + birthDate');
  });

  it('description mentions the count of other members in the cluster', () => {
    const clusters = [
      {
        key: 'smith|john|1990-01-01',
        patients: [
          { id: 'Patient/1', resourceType: 'Patient' },
          { id: 'Patient/2', resourceType: 'Patient' },
          { id: 'Patient/3', resourceType: 'Patient' },
        ],
      },
    ];
    const issues = normalizePatientDuplicateIssues(clusters);
    for (const issue of issues) {
      expect(issue.description).toContain('2 other patients');
    }
  });

  it('returns empty array for empty cluster list', () => {
    expect(normalizePatientDuplicateIssues([])).toEqual([]);
  });
});
