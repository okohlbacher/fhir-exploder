/**
 * Curated search parameter lists per FHIR resource type.
 *
 * These provide clinically relevant defaults when browsing resources.
 * Only params actually available on the server (from CapabilityStatement)
 * are returned — curated lists act as a priority filter.
 */

export const CURATED_PARAMS: Record<string, string[]> = {
  Patient: ['name', 'family', 'given', 'birthdate', 'gender', 'identifier'],
  Observation: ['patient', 'code', 'date', 'status', 'category'],
  Condition: ['patient', 'code', 'clinical-status', 'onset-date'],
  Encounter: ['patient', 'date', 'status', 'class', 'type'],
  MedicationStatement: ['patient', 'status', 'effective'],
  Procedure: ['patient', 'code', 'date', 'status'],
  DiagnosticReport: ['patient', 'code', 'date', 'status'],
  MedicationRequest: ['patient', 'status', 'date', 'code'],
  AllergyIntolerance: ['patient', 'clinical-status', 'code'],
  Immunization: ['patient', 'date', 'status'],
};

/** Common search params that appear across many FHIR resource types */
const COMMON_PARAMS = ['patient', 'subject', 'name', 'date', 'status', 'code'];

/**
 * Get curated search params for a resource type, filtered to only those
 * available on the server.
 *
 * @param resourceType - FHIR resource type name
 * @param allParams - All search params available for this type (from CapabilityStatement)
 * @returns Prioritized subset of allParams
 */
export function getCuratedParams(resourceType: string, allParams: string[]): string[] {
  if (allParams.length === 0) {
    return [];
  }

  const curated = CURATED_PARAMS[resourceType];
  if (curated) {
    return curated.filter((p) => allParams.includes(p));
  }

  // Fallback: try common params that exist on this type
  const matched = COMMON_PARAMS.filter((p) => allParams.includes(p));
  if (matched.length > 0) {
    return matched.slice(0, 5);
  }

  // Last resort: first 5 available params
  return allParams.slice(0, 5);
}
