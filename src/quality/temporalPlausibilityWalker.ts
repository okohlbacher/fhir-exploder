/**
 * temporalPlausibilityWalker -- DQ-05 temporal plausibility checks.
 *
 * Auto-discovers date/dateTime/Period/instant fields from MII profile
 * element type arrays (D-07) and runs four check categories (D-06):
 *   1. Future dates (warning)
 *   2. Period consistency / inverted periods (error)
 *   3. Age plausibility for Patient.birthDate (error)
 *   4. Clinical duration limits (warning/error)
 *
 * Thresholds are configurable (D-08) via PlausibilityThresholds.
 * Resources without bundled profiles get temporal checks via shape
 * detection fallback (discoverTemporalPathsByShape).
 *
 * Output normalizes into NormalizedIssue[] for ResourceIssueTable.
 */
import type { Resource, StructureDefinition } from '@medplum/fhirtypes';
import type { IssueSeverity, NormalizedIssue } from './types';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface TemporalPath {
  path: string;
  type: 'dateTime' | 'date' | 'Period' | 'instant';
}

export interface TemporalIssue {
  path: string;
  checkType: 'future-date' | 'inverted-period' | 'implausible-age' | 'clinical-duration';
  severity: IssueSeverity;
  diagnostics: string;
}

export interface PlausibilityThresholds {
  maxAge: number;
  maxEncounterDays: number;
}

const DEFAULT_THRESHOLDS: PlausibilityThresholds = {
  maxAge: 150,
  maxEncounterDays: 365,
};

const TEMPORAL_TYPES = new Set(['dateTime', 'date', 'Period', 'instant']);

/** 1-hour tolerance for future date checks (ms). */
const FUTURE_TOLERANCE_MS = 3_600_000;

/** Max recursion depth for shape-based discovery (T-16-04). */
const MAX_SHAPE_DEPTH = 10;

/** ISO 8601 date pattern for shape detection. */
const DATE_REGEX = /^\d{4}(-\d{2}(-\d{2}(T\d{2}:\d{2})?)?)?/;

// ---------------------------------------------------------------------------
// Temporal path discovery from profiles (D-07)
// ---------------------------------------------------------------------------

/**
 * Extract temporal field paths from a StructureDefinition's snapshot
 * elements by inspecting each element's `type` array.
 */
export function discoverTemporalPaths(profile: StructureDefinition): TemporalPath[] {
  const elements = profile.snapshot?.element ?? [];
  const result: TemporalPath[] = [];
  for (const el of elements) {
    for (const t of el.type ?? []) {
      if (t.code && TEMPORAL_TYPES.has(t.code)) {
        result.push({ path: el.path!, type: t.code as TemporalPath['type'] });
      }
    }
  }
  return result;
}

// ---------------------------------------------------------------------------
// Runtime fallback: shape-based temporal discovery
// ---------------------------------------------------------------------------

/**
 * Walk a resource JSON tree and detect temporal values by shape.
 * Used when no bundled profile is available for the resource type.
 *
 * Depth is limited to MAX_SHAPE_DEPTH to prevent stack overflow on
 * deeply nested resources (T-16-04).
 */
export function discoverTemporalPathsByShape(
  resource: Record<string, unknown>,
  prefix: string,
  depth = 0,
): TemporalPath[] {
  if (depth >= MAX_SHAPE_DEPTH) return [];
  const result: TemporalPath[] = [];

  for (const [key, value] of Object.entries(resource)) {
    if (key === 'resourceType' || key === 'id' || key === 'meta') continue;
    const currentPath = prefix ? `${prefix}.${key}` : key;

    if (typeof value === 'string') {
      if (DATE_REGEX.test(value) && !isNaN(new Date(value).getTime())) {
        // Determine if it looks like a date (YYYY-MM-DD) or dateTime (has T)
        const type: TemporalPath['type'] = value.includes('T') ? 'dateTime' : 'date';
        result.push({ path: currentPath, type });
      }
    } else if (value !== null && typeof value === 'object' && !Array.isArray(value)) {
      const obj = value as Record<string, unknown>;
      // Check if it looks like a Period (has start or end that are date strings)
      const hasStart = typeof obj.start === 'string' && DATE_REGEX.test(obj.start);
      const hasEnd = typeof obj.end === 'string' && DATE_REGEX.test(obj.end);
      if (hasStart || hasEnd) {
        result.push({ path: currentPath, type: 'Period' });
      } else {
        // Recurse into nested objects
        result.push(...discoverTemporalPathsByShape(obj, currentPath, depth + 1));
      }
    } else if (Array.isArray(value)) {
      // Check first element of arrays
      for (let i = 0; i < Math.min(value.length, 1); i++) {
        const item = value[i];
        if (typeof item === 'string') {
          if (DATE_REGEX.test(item) && !isNaN(new Date(item).getTime())) {
            const type: TemporalPath['type'] = item.includes('T') ? 'dateTime' : 'date';
            result.push({ path: `${currentPath}[${i}]`, type });
          }
        } else if (item !== null && typeof item === 'object') {
          result.push(
            ...discoverTemporalPathsByShape(
              item as Record<string, unknown>,
              `${currentPath}[${i}]`,
              depth + 1,
            ),
          );
        }
      }
    }
  }
  return result;
}

// ---------------------------------------------------------------------------
// Value resolution helpers
// ---------------------------------------------------------------------------

/**
 * Resolve a dotted FHIR path against a resource, handling choice types
 * (`[x]` suffix) and array navigation.
 */
function resolveValue(resource: unknown, path: string): unknown {
  if (!resource || typeof resource !== 'object') return undefined;

  // Strip resourceType prefix
  const segments = path.split('.');
  if (segments.length < 2) return undefined;
  const fieldSegments = segments.slice(1);

  let node: unknown = resource;
  for (const seg of fieldSegments) {
    if (node == null || typeof node !== 'object') return undefined;

    if (seg.endsWith('[x]')) {
      // Choice type: find matching key
      const prefix = seg.slice(0, -3);
      const obj = node as Record<string, unknown>;
      for (const k of Object.keys(obj)) {
        if (k.startsWith(prefix)) {
          return obj[k];
        }
      }
      return undefined;
    }

    node = (node as Record<string, unknown>)[seg];
    if (Array.isArray(node) && node.length > 0) {
      // For periods and single-value fields, take first element
      // But don't unwrap if the path resolution is complete
      // We'll handle arrays in the caller
    }
  }
  return node;
}

/**
 * Validate and sanitize thresholds (T-16-05).
 * Falls back to defaults for non-finite or non-positive values.
 */
function sanitizeThresholds(
  partial?: Partial<PlausibilityThresholds>,
): PlausibilityThresholds {
  const maxAge =
    partial?.maxAge !== undefined &&
    Number.isFinite(partial.maxAge) &&
    partial.maxAge > 0
      ? partial.maxAge
      : DEFAULT_THRESHOLDS.maxAge;

  const maxEncounterDays =
    partial?.maxEncounterDays !== undefined &&
    Number.isFinite(partial.maxEncounterDays) &&
    partial.maxEncounterDays > 0
      ? partial.maxEncounterDays
      : DEFAULT_THRESHOLDS.maxEncounterDays;

  return { maxAge, maxEncounterDays };
}

// ---------------------------------------------------------------------------
// Core check functions (D-06)
// ---------------------------------------------------------------------------

function parseDate(value: unknown): number | null {
  if (typeof value !== 'string') return null;
  const ms = new Date(value).getTime();
  return isNaN(ms) ? null : ms;
}

/**
 * D-06.1: Check for future dates (1h tolerance).
 */
function checkFutureDate(
  path: string,
  value: unknown,
): TemporalIssue | null {
  const ms = parseDate(value);
  if (ms === null) return null;
  if (ms > Date.now() + FUTURE_TOLERANCE_MS) {
    return {
      path,
      checkType: 'future-date',
      severity: 'warning',
      diagnostics: `Date ${value} is in the future (beyond 1h tolerance)`,
    };
  }
  return null;
}

/**
 * D-06.2: Check Period consistency (end < start).
 */
function checkPeriodConsistency(
  path: string,
  value: unknown,
): TemporalIssue | null {
  if (!value || typeof value !== 'object') return null;
  const period = value as { start?: string; end?: string };
  if (!period.start || !period.end) return null;
  const startMs = parseDate(period.start);
  const endMs = parseDate(period.end);
  if (startMs === null || endMs === null) return null;
  if (endMs < startMs) {
    return {
      path,
      checkType: 'inverted-period',
      severity: 'error',
      diagnostics: `Period end (${period.end}) is before start (${period.start})`,
    };
  }
  return null;
}

/**
 * D-06.3: Age plausibility for Patient.birthDate.
 */
function checkAgePlausibility(
  path: string,
  value: unknown,
  maxAge: number,
): TemporalIssue | null {
  // Only applies to Patient.birthDate
  if (!path.endsWith('birthDate') || !path.startsWith('Patient.')) return null;
  const ms = parseDate(value);
  if (ms === null) return null;

  const ageYears = (Date.now() - ms) / (365.25 * 24 * 60 * 60 * 1000);
  if (ageYears < 0) {
    return {
      path,
      checkType: 'implausible-age',
      severity: 'error',
      diagnostics: `Birth date ${value} implies negative age (${ageYears.toFixed(1)} years)`,
    };
  }
  if (ageYears > maxAge) {
    return {
      path,
      checkType: 'implausible-age',
      severity: 'error',
      diagnostics: `Birth date ${value} implies age ${ageYears.toFixed(0)} years (exceeds max ${maxAge})`,
    };
  }
  return null;
}

/**
 * D-06.4: Clinical duration limits.
 */
function checkClinicalDuration(
  path: string,
  value: unknown,
  temporalType: TemporalPath['type'],
  maxEncounterDays: number,
  patientBirthDate?: string,
): TemporalIssue | null {
  // Encounter.period duration check
  if (path.includes('Encounter.') && path.endsWith('.period') && temporalType === 'Period') {
    if (!value || typeof value !== 'object') return null;
    const period = value as { start?: string; end?: string };
    if (!period.start || !period.end) return null;
    const startMs = parseDate(period.start);
    const endMs = parseDate(period.end);
    if (startMs === null || endMs === null) return null;
    const days = (endMs - startMs) / (24 * 60 * 60 * 1000);
    if (days > maxEncounterDays) {
      return {
        path,
        checkType: 'clinical-duration',
        severity: 'warning',
        diagnostics: `Encounter duration ${days.toFixed(0)} days exceeds limit of ${maxEncounterDays} days`,
      };
    }
    return null;
  }

  // Observation effective date before patient birth
  if (
    patientBirthDate &&
    (path.includes('effective') || path.includes('Observation.'))
  ) {
    if (temporalType === 'dateTime' || temporalType === 'date' || temporalType === 'instant') {
      const valueMs = parseDate(value);
      const birthMs = parseDate(patientBirthDate);
      if (valueMs !== null && birthMs !== null && valueMs < birthMs) {
        return {
          path,
          checkType: 'clinical-duration',
          severity: 'error',
          diagnostics: `Date ${value} is before patient birth date (${patientBirthDate})`,
        };
      }
    }
  }

  return null;
}

// ---------------------------------------------------------------------------
// Main check function
// ---------------------------------------------------------------------------

/**
 * Run all temporal plausibility checks on a resource.
 *
 * Uses profile-based path discovery when a profile is available,
 * otherwise falls back to shape-based detection.
 */
export function checkTemporalPlausibility(
  resource: Resource,
  profile: StructureDefinition | null,
  thresholds?: Partial<PlausibilityThresholds>,
  patientBirthDate?: string,
): TemporalIssue[] {
  const t = sanitizeThresholds(thresholds);
  const issues: TemporalIssue[] = [];

  // Discover temporal paths
  let temporalPaths: TemporalPath[];
  if (profile && discoverTemporalPaths(profile).length > 0) {
    temporalPaths = discoverTemporalPaths(profile);
  } else {
    // Runtime fallback: shape-based discovery
    temporalPaths = discoverTemporalPathsByShape(
      resource as unknown as Record<string, unknown>,
      resource.resourceType ?? '',
    );
  }

  for (const tp of temporalPaths) {
    const value = resolveValue(resource, tp.path);
    if (value === undefined || value === null) continue;

    // D-06.1: Future date check (for scalar dates, not Periods)
    if (tp.type !== 'Period') {
      const futureIssue = checkFutureDate(tp.path, value);
      if (futureIssue) issues.push(futureIssue);
    } else {
      // Check future dates within Period start/end
      if (typeof value === 'object' && value !== null) {
        const period = value as { start?: string; end?: string };
        if (period.start) {
          const fi = checkFutureDate(tp.path, period.start);
          if (fi) issues.push(fi);
        }
        if (period.end) {
          const fi = checkFutureDate(tp.path, period.end);
          if (fi) issues.push(fi);
        }
      }
    }

    // D-06.2: Period consistency
    if (tp.type === 'Period') {
      const periodIssue = checkPeriodConsistency(tp.path, value);
      if (periodIssue) issues.push(periodIssue);
    }

    // D-06.3: Age plausibility (Patient.birthDate only)
    if (tp.type === 'date' || tp.type === 'dateTime') {
      const ageIssue = checkAgePlausibility(tp.path, value, t.maxAge);
      if (ageIssue) issues.push(ageIssue);
    }

    // D-06.4: Clinical duration limits
    const durationIssue = checkClinicalDuration(
      tp.path,
      value,
      tp.type,
      t.maxEncounterDays,
      patientBirthDate,
    );
    if (durationIssue) issues.push(durationIssue);
  }

  return issues;
}

// ---------------------------------------------------------------------------
// Normalization
// ---------------------------------------------------------------------------

/**
 * Convert TemporalIssue[] to NormalizedIssue[] for ResourceIssueTable.
 */
export function normalizeTemporalIssues(
  issues: TemporalIssue[],
  resource: Resource,
): NormalizedIssue[] {
  return issues.map((i) => ({
    resourceId: `${resource.resourceType}/${(resource as Record<string, unknown>).id ?? 'unknown'}`,
    resourceType: resource.resourceType ?? '',
    field: i.path,
    description: `[${i.checkType}] ${i.diagnostics}`,
    severity: i.severity,
  }));
}
