import type { MedplumClient } from '@medplum/core';
import type { Bundle, ResourceType } from '@medplum/fhirtypes';

export interface SearchByIdentifierPrefixOptions {
  /**
   * Max IDs to enumerate via `_elements=id&_count=${limit}`. Defaults to 5000
   * to match the call-site behavior in SearchResultsPage / PatientListPage
   * (formerly the inline `MAX_ID_FETCH` constant).
   */
  limit?: number;
  /**
   * Paginated result batch size for the follow-up `_id=a,b,c&_count=${pageSize}`
   * fetch. Defaults to 20 to match the call-site default page size.
   */
  pageSize?: number;
}

/**
 * Wildcard identifier/id prefix search for a FHIR resource type.
 *
 * Used when the user enters an identifier-like wildcard (e.g. "pat-lmu-*").
 * Blaze does not support `:contains` on token params, so we client-side
 * match by fetching all IDs (lightweight — `_elements=id` strips payloads),
 * filtering by prefix, then fetching full resources for the first page of
 * matches via `_id=a,b,c`.
 *
 * The returned Bundle's `total` is overridden to reflect the FULL match
 * count (not just the current page) so pagination UI stays correct —
 * preserving the "Override total to reflect all matches, not just this
 * page" semantics of the former inline implementation.
 */
export async function searchByIdentifierPrefix<T extends ResourceType>(
  client: MedplumClient,
  type: T,
  prefix: string,
  options?: SearchByIdentifierPrefixOptions,
): Promise<Bundle> {
  const { limit = 5000, pageSize = 20 } = options ?? {};

  // Step 1: enumerate IDs (lightweight — `_elements=id` strips the payload).
  const idUrl = `${type}?_elements=id&_count=${limit}`;
  const rawIds = await client.get(client.fhirUrl(idUrl).toString());
  const idBundle: Bundle = typeof rawIds === 'string' ? JSON.parse(rawIds) : rawIds;

  // Step 2: prefix-match the IDs client-side.
  const allIds = (idBundle.entry ?? [])
    .map((e) => e.resource?.id)
    .filter((id): id is string => !!id);
  const matching = allIds.filter((id) => id.startsWith(prefix));

  // Step 3: no matches — return an empty searchset stub.
  if (matching.length === 0) {
    return { resourceType: 'Bundle', type: 'searchset', total: 0, entry: [] };
  }

  // Step 4-5: fetch the first page of full resources for the matched IDs.
  const pageIds = matching.slice(0, pageSize);
  const fetchUrl = `${type}?_id=${pageIds.join(',')}&_count=${pageSize}`;
  const rawPage = await client.get(client.fhirUrl(fetchUrl).toString());
  const result: Bundle = typeof rawPage === 'string' ? JSON.parse(rawPage) : rawPage;

  // Step 6: override total to reflect all matches, not just this page.
  result.total = matching.length;
  return result;
}
