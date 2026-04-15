/**
 * Sampling helper used by Plans 03/04 to grab the first N resources of a
 * type without paging the full table. `_count` is the FHIR way to bound
 * page size; we don't follow `next` links because the audit intent is
 * "is this subset healthy?" rather than "audit every record."
 *
 * Phase 21 (21-03): optional `patientIds` parameter scopes results to a
 * patient set. Uses GET `?patient=...` for ≤40 IDs, POST `<Type>/_search`
 * with `application/x-www-form-urlencoded` body for larger cohorts
 * (Pitfall 2 — URL-length ceiling at ~8KB on Jetty/Blaze). `Patient` type
 * uses `_id=` since `patient=` isn't a valid search parameter on Patient
 * (Pitfall 4). Empty array is treated as "no scoping" (Pitfall 8 defensive
 * handling — same as omitting the argument).
 *
 * Threat T-21-07 (URL injection): all values are passed via object/
 * URLSearchParams; no string concatenation into the URL path. IDs come
 * from (a) FHIR subject.reference strings already extracted by the
 * resolver or (b) `parsePatientRefs` output (token-safe by construction).
 * T-21-08 (DoS via URL length): hard 40-ID threshold, POST fallback.
 */
import type { MedplumClient } from '@medplum/core';
import type { Bundle, Resource, ResourceType } from '@medplum/fhirtypes';

export const SHORT_QUERY_THRESHOLD = 40;

export async function sampleResources(
  client: MedplumClient,
  resourceType: string,
  sampleSize: number,
  patientIds?: string[],
): Promise<Resource[]> {
  const hasCohort = patientIds && patientIds.length > 0;
  if (!hasCohort) {
    return client.searchResources(resourceType as ResourceType, {
      _count: String(sampleSize),
    });
  }

  const isPatientType = resourceType === 'Patient';
  const scopeParam = isPatientType ? '_id' : 'patient';
  const scopeValue = isPatientType
    ? patientIds!.join(',')
    : patientIds!.map((id) => `Patient/${id}`).join(',');

  if (patientIds!.length <= SHORT_QUERY_THRESHOLD) {
    return client.searchResources(resourceType as ResourceType, {
      _count: String(sampleSize),
      [scopeParam]: scopeValue,
    });
  }

  // Large cohort: POST _search with form-urlencoded body (FHIR R4 spec
  // sanctioned escape hatch — hl7.org/fhir/R4/search.html §"search via POST").
  const body = new URLSearchParams({
    _count: String(sampleSize),
    [scopeParam]: scopeValue,
  }).toString();
  const bundle = (await client.post(
    client.fhirUrl(resourceType, '_search').toString(),
    body,
    'application/x-www-form-urlencoded',
  )) as Bundle<Resource>;
  return (bundle.entry ?? [])
    .map((e) => e.resource)
    .filter((r): r is Resource => Boolean(r));
}
