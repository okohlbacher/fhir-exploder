/**
 * Sampling helper used by Plans 03/04 to grab the first N resources of a
 * type without paging the full table. `_count` is the FHIR way to bound
 * page size; we don't follow `next` links because the audit intent is
 * "is this subset healthy?" rather than "audit every record."
 */
import type { MedplumClient } from '@medplum/core';
import type { Resource, ResourceType } from '@medplum/fhirtypes';

export async function sampleResources(
  client: MedplumClient,
  resourceType: string,
  sampleSize: number,
): Promise<Resource[]> {
  return client.searchResources(resourceType as ResourceType, {
    _count: String(sampleSize),
  });
}
