/**
 * patientDuplicateDetector -- DQ-07 patient duplicate detection.
 *
 * Finds patient clusters by exact normalized family+given+birthDate match
 * (D-01). Name normalization is case-insensitive with whitespace trimmed
 * (D-02). Patients missing any of the three key fields are skipped and
 * counted separately (D-03) so the UI can report "N patients skipped
 * because they have no usable name or DOB".
 *
 * Pure function -- testable without any client or async machinery.
 */
import type { Patient, Resource } from '@medplum/fhirtypes';
import type { NormalizedIssue } from './types';

export interface PatientDuplicateCluster {
  /** Composite key of the form `family|given|birthDate`, all normalized. */
  key: string;
  /** Every patient whose normalized key matches this cluster. */
  patients: Array<{ id: string; resourceType: string }>;
}

function normalizeName(value: string | undefined): string {
  if (typeof value !== 'string') return '';
  return value.toLowerCase().trim();
}

function extractFirstName(p: Patient): {
  family: string;
  given: string;
  birthDate: string;
} {
  const name = Array.isArray(p.name) && p.name.length > 0 ? p.name[0] : undefined;
  const family = normalizeName(name?.family);
  const given =
    Array.isArray(name?.given) && name!.given!.length > 0
      ? normalizeName(name!.given![0])
      : '';
  const birthDate = typeof p.birthDate === 'string' ? p.birthDate.trim() : '';
  return { family, given, birthDate };
}

/**
 * Group patients by normalized family|given|birthDate key. Returns only
 * clusters with >=2 members plus a count of patients that had to be
 * skipped because one of the key fields was missing.
 */
export function findPatientDuplicates(
  patients: Resource[],
): { clusters: PatientDuplicateCluster[]; skippedCount: number } {
  const groups = new Map<string, Array<{ id: string; resourceType: string }>>();
  let skippedCount = 0;

  for (const r of patients) {
    if (r?.resourceType !== 'Patient') {
      skippedCount++;
      continue;
    }
    const p = r as Patient;
    const { family, given, birthDate } = extractFirstName(p);
    if (!family || !given || !birthDate) {
      skippedCount++;
      continue;
    }
    const key = `${family}|${given}|${birthDate}`;
    const member = {
      id: `Patient/${p.id ?? 'unknown'}`,
      resourceType: 'Patient',
    };
    const bucket = groups.get(key);
    if (bucket) {
      bucket.push(member);
    } else {
      groups.set(key, [member]);
    }
  }

  const clusters: PatientDuplicateCluster[] = [];
  for (const [key, members] of groups.entries()) {
    if (members.length >= 2) {
      clusters.push({ key, patients: members });
    }
  }

  return { clusters, skippedCount };
}

/**
 * Convert PatientDuplicateCluster[] to NormalizedIssue[] so the UI layer
 * (ResourceIssueTable) can render them alongside other quality issues.
 */
export function normalizePatientDuplicateIssues(
  clusters: PatientDuplicateCluster[],
): NormalizedIssue[] {
  const issues: NormalizedIssue[] = [];
  for (const cluster of clusters) {
    const others = cluster.patients.length - 1;
    for (const member of cluster.patients) {
      issues.push({
        resourceId: member.id,
        resourceType: 'Patient',
        field: 'name + birthDate',
        description: `[patient-duplicate] Exact match with ${others} other patients (${cluster.key})`,
        severity: 'warning',
      });
    }
  }
  return issues;
}
