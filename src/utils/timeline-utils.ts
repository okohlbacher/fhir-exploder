import type {
  Condition,
  Encounter,
  Observation,
  Period,
  Procedure,
  Resource,
} from '@medplum/fhirtypes';
import { toRecord } from './fhir-helpers';

/**
 * Normalized timeline entry used by the ClinicalTimeline component.
 *
 * Each timeline row represents one clinical event derived from a FHIR
 * resource (Condition, Encounter, Procedure, Observation, ...). The
 * fields are pre-extracted so the rendering layer does not need to
 * reach into FHIR datatype variations for every entry.
 */
export interface TimelineData {
  /** FHIR resourceType (e.g. 'Condition', 'Encounter'). */
  resourceType: string;
  /** Server-assigned resource id. */
  resourceId: string;
  /** ISO date or datetime string used for sorting and display. */
  date: string;
  /** German label from MII_MODULES (e.g. 'Diagnose'), or resourceType fallback. */
  typeLabel: string;
  /** Human-readable summary derived from code.text / coding.display. */
  summary: string;
  /** Mantine color token from MII_MODULES, or 'gray' fallback. */
  color: string;
  /**
   * Tabler icon name (e.g. 'IconStethoscope') from the MII module that
   * owns this resource type, or undefined for resources that don't map
   * to any module (defensive fallback — the Timeline only aggregates
   * base MII module types today, so every resource should have one).
   *
   * Consumed by TimelineEntry to render a 14px leading icon alongside
   * the color-coded badge (Plan 34-04 MII-EXT-11 render site).
   */
  iconKey?: string;
  /** Original FHIR resource for downstream navigation. */
  resource: Resource;
}

/**
 * Extract the clinically-relevant date from a FHIR resource.
 *
 * FHIR R4 stores dates in different fields per resource type; this
 * function centralises the fallback chain so the timeline displays
 * reasonable dates without the rendering layer duplicating the logic.
 * Returns `undefined` when no known date field is populated.
 */
export function extractDate(resource: Resource): string | undefined {
  switch (resource.resourceType) {
    case 'Condition': {
      const c = resource as Condition;
      return c.onsetDateTime ?? c.recordedDate ?? c.onsetPeriod?.start;
    }
    case 'Encounter': {
      const e = resource as Encounter;
      return e.period?.start;
    }
    case 'Procedure': {
      const p = resource as Procedure;
      return (
        p.performedDateTime ?? (p.performedPeriod as Period | undefined)?.start
      );
    }
    case 'Observation': {
      const o = resource as Observation;
      return o.effectiveDateTime ?? o.effectivePeriod?.start ?? o.issued;
    }
    default:
      return toRecord(resource).date as
        | string
        | undefined;
  }
}

/**
 * Format an ISO datetime string as `YYYY-MM-DD` for timeline display.
 *
 * Both full ISO datetimes ("2024-03-15T10:30:00Z") and date-only
 * strings ("2024-03-15") collapse to the first 10 characters, which
 * matches the FHIR `date` format used throughout the UI spec.
 */
export function formatTimelineDate(isoDate: string): string {
  return isoDate.substring(0, 10);
}
