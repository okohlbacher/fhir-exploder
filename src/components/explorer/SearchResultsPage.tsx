import { useState, useMemo, useCallback } from 'react';
import { useOutletContext, useNavigate } from 'react-router-dom';
import { Alert, Anchor, Breadcrumbs, Skeleton, Stack, Text } from '@mantine/core';
import { SearchControl } from '@medplum/react';
import type { SearchClickEvent, SearchLoadEvent, SearchChangeEvent } from '@medplum/react';
import type { Bundle } from '@medplum/fhirtypes';
import type { SearchRequest } from '@medplum/core';
import type { ExplorerOutletContext } from './ExplorerLayout';
import { parseResourceTypes } from '../../fhir/capability';
import { useSearchState } from '../../hooks/useSearchState';
import { ResourceTypeSelector } from './ResourceTypeSelector';
import { SearchFilterPanel } from './SearchFilterPanel';
import { PaginationControls } from './PaginationControls';

/**
 * Main search results page for /explorer/:resourceType.
 * Orchestrates resource type selector, filter panel, SearchControl, and pagination.
 * All search state is URL-driven via useSearchState (D-04).
 */
export function SearchResultsPage() {
  const { capability } = useOutletContext<ExplorerOutletContext>();
  const navigate = useNavigate();
  const { searchRequest, setSearch, resourceType } = useSearchState();

  const [bundle, setBundle] = useState<Bundle | undefined>(undefined);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const parsedTypes = useMemo(() => parseResourceTypes(capability), [capability]);
  const allTypeNames = useMemo(() => parsedTypes.map((t) => t.type), [parsedTypes]);
  const currentTypeData = useMemo(
    () => parsedTypes.find((t) => t.type === resourceType),
    [parsedTypes, resourceType]
  );

  const handleTypeChange = useCallback(
    (newType: string) => {
      navigate(`/explorer/${newType}`);
    },
    [navigate]
  );

  const handleSearch = useCallback(
    (
      filters: Record<string, string>,
      includes?: { include?: string[]; revinclude?: string[] }
    ) => {
      const newSearch: SearchRequest = {
        resourceType: resourceType as SearchRequest['resourceType'],
        count: searchRequest.count,
        filters: Object.entries(filters).map(([code, value]) => ({
          code,
          operator: 'eq' as const,
          value,
        })),
      };

      if (includes?.include && includes.include.length > 0) {
        (newSearch as Record<string, unknown>)['_include'] = includes.include;
      }
      if (includes?.revinclude && includes.revinclude.length > 0) {
        (newSearch as Record<string, unknown>)['_revinclude'] = includes.revinclude;
      }

      setSearch(newSearch);
    },
    [resourceType, searchRequest.count, setSearch]
  );

  const handlePageChange = useCallback(
    (url: string) => {
      // Extract query params from the pagination URL and apply them
      try {
        const parsedUrl = new URL(url, 'http://localhost');
        const params = new URLSearchParams(parsedUrl.search);
        // Navigate with updated params
        navigate(`/explorer/${resourceType}?${params.toString()}`);
      } catch {
        // Fallback: just use the URL directly
        navigate(`/explorer/${resourceType}`);
      }
    },
    [navigate, resourceType]
  );

  const handleCountChange = useCallback(
    (count: number) => {
      setSearch({ ...searchRequest, count });
    },
    [searchRequest, setSearch]
  );

  const handleSearchLoad = useCallback((e: SearchLoadEvent) => {
    setBundle(e.response);
    setLoading(false);
    setError(null);
  }, []);

  const handleClick = useCallback(
    (e: SearchClickEvent) => {
      const resource = e.resource;
      if (resource.resourceType && resource.id) {
        navigate(`/explorer/${resource.resourceType}/${resource.id}`);
      }
    },
    [navigate]
  );

  return (
    <Stack gap="lg" p="md">
      <Breadcrumbs>
        <Anchor onClick={() => navigate('/explorer')} size="sm">
          Explorer
        </Anchor>
        <Text size="sm" fw={600}>
          {resourceType}
        </Text>
      </Breadcrumbs>

      <ResourceTypeSelector
        resourceTypes={allTypeNames}
        currentType={resourceType}
        onChange={handleTypeChange}
      />

      <SearchFilterPanel
        resourceType={resourceType}
        allSearchParams={currentTypeData?.searchParams ?? []}
        onSearch={handleSearch}
      />

      {error && (
        <Alert color="red" title="Search failed">
          Could not load {resourceType} resources. {error}
        </Alert>
      )}

      {loading && !bundle && (
        <Stack gap="sm">
          <Skeleton height={36} />
          <Skeleton height={36} />
          <Skeleton height={36} />
          <Skeleton height={36} />
          <Skeleton height={36} />
        </Stack>
      )}

      <SearchControl
        search={searchRequest}
        hideToolbar={true}
        hideFilters={true}
        onClick={handleClick}
        onLoad={handleSearchLoad}
        onChange={(e: SearchChangeEvent) => {
          // Only update if search definition meaningfully changed (Pitfall 2)
          if (e.definition && JSON.stringify(e.definition) !== JSON.stringify(searchRequest)) {
            setSearch(e.definition);
          }
        }}
      />

      {!loading && bundle && (bundle.entry?.length ?? 0) === 0 && (
        <Stack align="center" py="xl">
          <Text size="lg" fw={600}>No resources found</Text>
          <Text c="dimmed">
            No {resourceType} resources match your search. Try adjusting your filters or search with no filters to see all resources.
          </Text>
        </Stack>
      )}

      <PaginationControls
        bundle={bundle}
        currentCount={searchRequest.count ?? 20}
        onPageChange={handlePageChange}
        onCountChange={handleCountChange}
        loading={loading}
      />
    </Stack>
  );
}
