/**
 * Lab reference range checker (DQ-06).
 *
 * Validates Observation.valueQuantity against reference ranges from either
 * settings.yaml config or the Observation's embedded referenceRange field.
 * Config ranges take precedence per D-10.
 */
import type { Observation, Resource } from '@medplum/fhirtypes';
import type { NormalizedIssue, IssueSeverity } from './types';

export interface LabRangeIssue {
  observationId: string;
  loincCode: string | null;
  displayName: string | null;
  value: number;
  low: number | undefined;
  high: number | undefined;
  rangeSource: 'config' | 'embedded';
  direction: 'below' | 'above';
}

export interface LabRangeSummary {
  checked: number;
  inRange: number;
  outOfRange: number;
  noRange: number;
  perLoincCode: Record<string, { checked: number; outOfRange: number; displayName: string | null }>;
}

export interface ReferenceRangeConfig {
  low?: number;
  high?: number;
  unit?: string;
}

/**
 * Check lab observations against reference ranges.
 *
 * @param observations - Array of FHIR resources (only Observations with valueQuantity are checked)
 * @param configRanges - Reference ranges from settings.yaml keyed by LOINC code
 * @returns Issues found and summary statistics
 */
export function checkLabRanges(
  observations: Resource[],
  configRanges: Record<string, ReferenceRangeConfig>,
): { issues: LabRangeIssue[]; summary: LabRangeSummary } {
  const issues: LabRangeIssue[] = [];
  const summary: LabRangeSummary = {
    checked: 0,
    inRange: 0,
    outOfRange: 0,
    noRange: 0,
    perLoincCode: {},
  };

  for (const resource of observations) {
    if (resource.resourceType !== 'Observation') continue;
    const obs = resource as Observation;

    // Skip if no numeric value
    const value = obs.valueQuantity?.value;
    if (value === undefined || typeof value !== 'number') continue;

    summary.checked++;

    // Extract LOINC code and display name
    const loincCoding = obs.code?.coding?.find(
      (c) => c.system === 'http://loinc.org',
    );
    const loincCode = loincCoding?.code ?? null;
    const displayName = loincCoding?.display ?? null;

    // Determine reference range with D-10 precedence: config > embedded
    let low: number | undefined;
    let high: number | undefined;
    let rangeSource: 'config' | 'embedded' | null = null;

    if (loincCode && configRanges[loincCode]) {
      const configRange = configRanges[loincCode];
      low = configRange.low;
      high = configRange.high;
      rangeSource = 'config';
    } else if (obs.referenceRange?.[0]) {
      const embedded = obs.referenceRange[0];
      low = embedded.low?.value;
      high = embedded.high?.value;
      rangeSource = 'embedded';
    }

    // Track per-LOINC stats
    if (loincCode) {
      if (!summary.perLoincCode[loincCode]) {
        summary.perLoincCode[loincCode] = { checked: 0, outOfRange: 0, displayName };
      }
      summary.perLoincCode[loincCode].checked++;
    }

    // No range available — cannot check
    if (rangeSource === null) {
      summary.noRange++;
      continue;
    }

    // Compare value against range (D-11)
    let flagged = false;

    if (low !== undefined && value < low) {
      issues.push({
        observationId: obs.id ?? 'unknown',
        loincCode,
        displayName,
        value,
        low,
        high,
        rangeSource,
        direction: 'below',
      });
      flagged = true;
    }

    if (high !== undefined && value > high) {
      issues.push({
        observationId: obs.id ?? 'unknown',
        loincCode,
        displayName,
        value,
        low,
        high,
        rangeSource,
        direction: 'above',
      });
      flagged = true;
    }

    if (flagged) {
      summary.outOfRange++;
      if (loincCode && summary.perLoincCode[loincCode]) {
        summary.perLoincCode[loincCode].outOfRange++;
      }
    } else {
      summary.inRange++;
    }
  }

  return { issues, summary };
}

/**
 * Convert LabRangeIssues into NormalizedIssues for the unified issue table (D-05).
 */
export function normalizeLabRangeIssues(issues: LabRangeIssue[]): NormalizedIssue[] {
  return issues.map((i) => ({
    resourceId: `Observation/${i.observationId}`,
    resourceType: 'Observation',
    field: 'valueQuantity.value',
    description:
      i.direction === 'below'
        ? `Value ${i.value} is below reference range low (${i.low})`
        : `Value ${i.value} is above reference range high (${i.high})`,
    severity: 'warning' as IssueSeverity,
  }));
}
