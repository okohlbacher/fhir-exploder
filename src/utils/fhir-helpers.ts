import type { CodeableConcept, Resource } from '@medplum/fhirtypes';

/**
 * Cast a FHIR Resource to a plain record for dynamic property access.
 * Centralizes the `as unknown as Record<string, unknown>` double-cast
 * needed because some Resource union members (e.g. VisionPrescription)
 * lack an index signature.
 */
export function toRecord(resource: Resource): Record<string, unknown> {
  return resource as unknown as Record<string, unknown>;
}

/**
 * Extract a human-readable display string from a CodeableConcept.
 * Prefers text, then first coding's display, then first coding's code.
 * Returns empty string if no display value is available.
 */
export function getCodeDisplay(concept: CodeableConcept | undefined): string {
  if (!concept) return '';
  if (concept.text) return concept.text;
  const coding = concept.coding?.[0];
  if (!coding) return '';
  return coding.display ?? coding.code ?? '';
}
