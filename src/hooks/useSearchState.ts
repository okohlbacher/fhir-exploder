import { useMemo, useCallback } from 'react';
import { useSearchParams, useParams } from 'react-router-dom';
import { parseSearchRequest, formatSearchQuery } from '@medplum/core';
import type { SearchRequest } from '@medplum/core';
import type { Resource } from '@medplum/fhirtypes';

export interface SearchState {
  searchRequest: SearchRequest;
  setSearch: (search: SearchRequest) => void;
  resourceType: string;
}

/**
 * Bidirectional URL <-> SearchRequest sync hook.
 *
 * Reads the current URL search params and resourceType route param,
 * constructs a SearchRequest via Medplum's parseSearchRequest,
 * and provides setSearch to update the URL when search state changes.
 *
 * Default count is 20 when _count is not present in URL (per D-08).
 */
export function useSearchState(): SearchState {
  const { resourceType = '' } = useParams<{ resourceType: string }>();
  const [searchParams, setSearchParams] = useSearchParams();

  const searchRequest = useMemo(() => {
    const parsed = parseSearchRequest<Resource>(
      `${resourceType}?${searchParams.toString()}`
    );

    // Default count to 20 if not specified (D-08)
    if (parsed.count === undefined) {
      return { ...parsed, count: 20 };
    }

    return parsed;
  }, [resourceType, searchParams]);

  const setSearch = useCallback(
    (newSearch: SearchRequest) => {
      const queryString = formatSearchQuery(newSearch);
      // formatSearchQuery returns "?key=val&..." — strip the leading "?"
      const params = new URLSearchParams(
        queryString.startsWith('?') ? queryString.slice(1) : queryString
      );
      setSearchParams(params);
    },
    [setSearchParams]
  );

  return { searchRequest, setSearch, resourceType };
}
