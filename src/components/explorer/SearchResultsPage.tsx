import { useState, useMemo, useCallback, useEffect } from 'react';
import { useOutletContext, useNavigate } from 'react-router-dom';
import { Alert, Anchor, Breadcrumbs, Button, Group, Menu, Skeleton, Stack, Table, Text, Badge } from '@mantine/core';
import { IconDownload, IconFileTypeCsv, IconFileCode } from '@tabler/icons-react';
import { useMedplum } from '@medplum/react-hooks';
import type { Bundle, Resource } from '@medplum/fhirtypes';
import type { ExplorerOutletContext } from './ExplorerLayout';
import { parseResourceTypes } from '../../fhir/capability';
import { useSearchState } from '../../hooks/useSearchState';
import { ResourceTypeSelector } from './ResourceTypeSelector';
import { SearchFilterPanel } from './SearchFilterPanel';
import { PaginationControls } from './PaginationControls';
import { resourcesToCSV, resourcesToNDJSON, downloadString } from '../../utils/export';
import { toRecord } from '../../utils/fhir-helpers';

/**
 * Extracts a human-readable summary of a resource for table display.
 * Tries common fields: name, code, identifier, then falls back to id.
 */
function getResourceSummary(resource: Resource): string {
  const r = toRecord(resource);

  // HumanName (Patient, Practitioner, etc.)
  if (Array.isArray(r.name) && r.name.length > 0) {
    const n = r.name[0] as Record<string, unknown>;
    if (typeof n.text === 'string') return n.text;
    const parts = [n.family, ...(Array.isArray(n.given) ? n.given : [])].filter(Boolean);
    if (parts.length > 0) return parts.join(', ');
  }
  if (typeof r.name === 'string') return r.name;

  // CodeableConcept fields
  for (const field of ['code', 'type', 'category']) {
    const cc = r[field];
    if (cc && typeof cc === 'object') {
      const concept = Array.isArray(cc) ? cc[0] : cc;
      if (concept) {
        const c = concept as Record<string, unknown>;
        if (typeof c.text === 'string') return c.text;
        if (Array.isArray(c.coding) && c.coding.length > 0) {
          const coding = c.coding[0] as Record<string, unknown>;
          return (coding.display as string) ?? (coding.code as string) ?? '';
        }
      }
    }
  }

  // Identifier
  if (Array.isArray(r.identifier) && r.identifier.length > 0) {
    const id = r.identifier[0] as Record<string, unknown>;
    return (id.value as string) ?? '';
  }

  // Status
  if (typeof r.status === 'string') return r.status;

  return resource.id ?? '';
}

function getResourceDate(resource: Resource): string {
  const r = toRecord(resource);
  for (const field of [
    'effectiveDateTime', 'performedDateTime', 'dateTime', 'date',
    'issued', 'recordedDate', 'onsetDateTime', 'authoredOn',
    'period',
  ]) {
    const val = r[field];
    if (typeof val === 'string') return val.slice(0, 10);
    if (val && typeof val === 'object' && 'start' in (val as object)) {
      return ((val as Record<string, unknown>).start as string)?.slice(0, 10) ?? '';
    }
  }
  return '';
}

/**
 * Main search results page for /explorer/:resourceType.
 *
 * Uses direct FHIR search via MedplumClient instead of Medplum's SearchControl
 * (which requires schema loading that doesn't work with non-Medplum servers like Blaze).
 *
 * Auto-loads results on page load without requiring the user to click Search.
 */
export function SearchResultsPage() {
  const { capability } = useOutletContext<ExplorerOutletContext>();
  const navigate = useNavigate();
  const client = useMedplum();
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

  // Reference-type search params that expect Patient/id, not bare id
  const REFERENCE_PARAMS: Record<string, string> = {
    patient: 'Patient',
    subject: 'Patient',
    encounter: 'Encounter',
    performer: 'Practitioner',
    author: 'Practitioner',
    requester: 'Practitioner',
    recorder: 'Practitioner',
    asserter: 'Practitioner',
    practitioner: 'Practitioner',
    organization: 'Organization',
  };

  // Build search URL from searchRequest and execute it
  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);

    // Detect wildcard on identifier/_id fields — these need client-side prefix search
    // because Blaze doesn't support :contains on token params.
    let idPrefixSearch: string | null = null;

    const params = new URLSearchParams();
    params.set('_count', String(searchRequest.count ?? 20));

    if (searchRequest.filters) {
      for (const f of searchRequest.filters) {
        if (!f.value) continue;
        let code = f.code;
        let value = f.value;

        const isWildcard = value.includes('*');
        const isIdentifierLike = code === 'identifier' || code === '_id';

        // Wildcard on identifier/_id: use client-side prefix matching
        if (isWildcard && isIdentifierLike) {
          idPrefixSearch = value.replace(/\*/g, '');
          continue; // Don't add to server params — handled below
        }

        // Wildcard on other params: use :contains modifier
        if (isWildcard) {
          value = value.replace(/\*/g, '');
          if (!code.includes(':')) code = `${code}:contains`;
        }

        // identifier without system|value separator: user likely means the
        // resource ID (e.g. "pat-lmu-001"), not a token identifier value.
        if (code === 'identifier' && !value.includes('|')) {
          code = '_id';
        }

        // Reference params: auto-prefix "Patient/" if user typed a bare ID
        const refType = REFERENCE_PARAMS[code.split(':')[0]];
        if (refType && !value.includes('/') && !code.includes(':')) {
          value = `${refType}/${value}`;
        }

        params.set(code, value);
      }
    }

    // Client-side prefix search for identifier/ID wildcards.
    // Fetches all IDs (lightweight), filters by prefix, then fetches matching resources.
    if (idPrefixSearch !== null) {
      const prefix = idPrefixSearch;
      const MAX_ID_FETCH = 5000;
      const idUrl = `${resourceType}?_elements=id&_count=${MAX_ID_FETCH}`;
      client
        .get(client.fhirUrl(idUrl).toString())
        .then((raw) => {
          if (cancelled) return;
          const idBundle: Bundle = typeof raw === 'string' ? JSON.parse(raw) : raw;
          const allIds = (idBundle.entry ?? [])
            .map((e) => e.resource?.id)
            .filter((id): id is string => !!id);
          const matchingIds = allIds.filter((id) => id.startsWith(prefix));

          if (matchingIds.length === 0) {
            setBundle({ resourceType: 'Bundle', type: 'searchset', total: 0, entry: [] });
            setLoading(false);
            return;
          }

          // Fetch full resources for matching IDs (batch in groups of 50)
          const pageSize = searchRequest.count ?? 20;
          const pageIds = matchingIds.slice(0, pageSize);
          const fetchUrl = `${resourceType}?_id=${pageIds.join(',')}&_count=${pageSize}`;
          return client.get(client.fhirUrl(fetchUrl).toString()).then((raw2) => {
            if (cancelled) return;
            const result: Bundle = typeof raw2 === 'string' ? JSON.parse(raw2) : raw2;
            // Override total to reflect all matches, not just this page
            result.total = matchingIds.length;
            setBundle(result);
            setLoading(false);
          });
        })
        .catch((err) => {
          if (cancelled) return;
          setError(err instanceof Error ? err.message : String(err));
          setLoading(false);
        });

      return () => { cancelled = true; };
    }

    const url = `${resourceType}?${params.toString()}`;
    client
      .get(client.fhirUrl(url).toString())
      .then((raw) => {
        if (cancelled) return;
        const result: Bundle = typeof raw === 'string' ? JSON.parse(raw) : raw;
        setBundle(result);
        setLoading(false);
      })
      .catch((err) => {
        if (cancelled) return;
        setError(err instanceof Error ? err.message : String(err));
        setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [client, resourceType, searchRequest]);

  const resources = useMemo(
    () => (bundle?.entry ?? []).map((e) => e.resource).filter(Boolean) as Resource[],
    [bundle]
  );

  const handleTypeChange = useCallback(
    (newType: string) => navigate(`/explorer/${newType}`),
    [navigate]
  );

  const handleSearch = useCallback(
    (
      filters: Record<string, string>,
      _includes?: { include?: string[]; revinclude?: string[] }
    ) => {
      setSearch({
        ...searchRequest,
        resourceType: resourceType as 'Patient',
        filters: Object.entries(filters)
          .filter(([, v]) => v)
          .map(([code, value]) => ({
            code,
            operator: 'eq' as const,
            value,
          })),
      });
    },
    [resourceType, searchRequest, setSearch]
  );

  const handlePageChange = useCallback(
    (url: string) => {
      // Blaze pagination links are absolute URLs (e.g. http://localhost:8080/fhir/...).
      // Rewrite them to go through the Vite proxy to avoid CORS issues.
      let fetchUrl = url;
      try {
        const parsed = new URL(url);
        // Replace origin with page origin, keep the path
        fetchUrl = `${window.location.origin}${parsed.pathname}${parsed.search}`;
      } catch {
        // If URL parsing fails, use as-is
      }

      setLoading(true);
      setError(null);
      client
        .get(fetchUrl)
        .then((raw) => {
          const result: Bundle = typeof raw === 'string' ? JSON.parse(raw) : raw;
          setBundle(result);
          setLoading(false);
        })
        .catch((err) => {
          setError(err instanceof Error ? err.message : String(err));
          setLoading(false);
        });
    },
    [client]
  );

  const handleCountChange = useCallback(
    (count: number) => setSearch({ ...searchRequest, count }),
    [searchRequest, setSearch]
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
        activeFilters={useMemo(
          () => Object.fromEntries(
            (searchRequest.filters ?? [])
              .filter((f) => f.value)
              .map((f) => [f.code, f.value])
          ),
          [searchRequest.filters]
        )}
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

      {!loading && resources.length > 0 && (
        <Group justify="flex-end">
          <Menu shadow="md" width={200}>
            <Menu.Target>
              <Button variant="light" size="xs" leftSection={<IconDownload size={14} />}>
                Export
              </Button>
            </Menu.Target>
            <Menu.Dropdown>
              <Menu.Item
                leftSection={<IconFileTypeCsv size={16} />}
                onClick={() => {
                  const csv = resourcesToCSV(resources);
                  downloadString(csv, `${resourceType}.csv`, 'text/csv');
                }}
              >
                Export as CSV
              </Menu.Item>
              <Menu.Item
                leftSection={<IconFileCode size={16} />}
                onClick={() => {
                  const ndjson = resourcesToNDJSON(resources);
                  downloadString(ndjson, `${resourceType}.ndjson`, 'application/x-ndjson');
                }}
              >
                Export as NDJSON
              </Menu.Item>
            </Menu.Dropdown>
          </Menu>
        </Group>
      )}

      {!loading && resources.length > 0 && (
        <Table striped highlightOnHover withTableBorder>
          <Table.Thead>
            <Table.Tr>
              <Table.Th>ID</Table.Th>
              <Table.Th>Summary</Table.Th>
              <Table.Th>Date</Table.Th>
              <Table.Th>Status</Table.Th>
            </Table.Tr>
          </Table.Thead>
          <Table.Tbody>
            {resources.map((r) => (
              <Table.Tr
                key={r.id}
                style={{ cursor: 'pointer' }}
                onClick={() => navigate(`/explorer/${r.resourceType}/${r.id}`)}
              >
                <Table.Td>
                  <Anchor
                    size="sm"
                    ff="monospace"
                    truncate="end"
                    style={{ maxWidth: 200, display: 'block' }}
                    href={`/explorer/${r.resourceType}/${r.id}`}
                    onClick={(e) => {
                      e.preventDefault();
                      navigate(`/explorer/${r.resourceType}/${r.id}`);
                    }}
                  >
                    {r.id}
                  </Anchor>
                </Table.Td>
                <Table.Td>
                  <Anchor
                    size="sm"
                    truncate="end"
                    style={{ maxWidth: 400, display: 'block' }}
                    href={`/explorer/${r.resourceType}/${r.id}`}
                    onClick={(e) => {
                      e.preventDefault();
                      navigate(`/explorer/${r.resourceType}/${r.id}`);
                    }}
                  >
                    {getResourceSummary(r)}
                  </Anchor>
                </Table.Td>
                <Table.Td>
                  <Text size="sm">{getResourceDate(r)}</Text>
                </Table.Td>
                <Table.Td>
                  {toRecord(r).status && (
                    <Badge
                      size="sm"
                      variant="light"
                      color={
                        toRecord(r).status === 'active' ||
                        toRecord(r).status === 'completed'
                          ? 'green'
                          : 'gray'
                      }
                    >
                      {String(toRecord(r).status)}
                    </Badge>
                  )}
                </Table.Td>
              </Table.Tr>
            ))}
          </Table.Tbody>
        </Table>
      )}

      {!loading && bundle && resources.length === 0 && (
        <Stack align="center" py="xl">
          <Text size="lg" fw={600}>No resources found</Text>
          <Text c="dimmed">
            No {resourceType} resources match your search. Try adjusting your filters.
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
