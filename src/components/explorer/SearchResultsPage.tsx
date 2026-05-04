import { useState, useMemo, useCallback, useEffect } from 'react';
import { useOutletContext, useNavigate } from 'react-router-dom';
import { Alert, Anchor, Breadcrumbs, Button, Group, Menu, Paper, SegmentedControl, SimpleGrid, Skeleton, Stack, Table, Text, Badge } from '@mantine/core';
import { useLocalStorage } from '@mantine/hooks';
import { IconDownload, IconFileTypeCsv, IconFileCode } from '@tabler/icons-react';
import { useMedplum } from '@medplum/react-hooks';
import type {
  Bundle,
  Resource,
  ResourceType,
  Patient,
  Condition,
  Observation,
  MedicationStatement,
  Encounter,
  Procedure,
} from '@medplum/fhirtypes';
import type { ExplorerOutletContext } from './ExplorerLayout';
import { parseResourceTypes } from '../../fhir/capability';
import { getResourceCategory } from '../../utils/fhir-categories';
import { useSearchState } from '../../hooks/useSearchState';
import { ResourceTypeSelector } from './ResourceTypeSelector';
import { SearchFilterPanel } from './SearchFilterPanel';
import { PaginationControls } from './PaginationControls';
import { resourcesToCSV, resourcesToNDJSON, downloadString } from '../../utils/export';
import { toRecord } from '../../utils/fhir-helpers';
import { searchByIdentifierPrefix } from '../../utils/searchByIdentifierPrefix';
import { summarizeResource } from '../../utils/summarizeResource';
import { usePeek } from '../../contexts/PeekContext';
import { useShortcuts } from '../../hooks/useShortcuts';

// WR-02 fix: module-scope constant — prevents re-creation on every render and
// avoids stale-dep risk if this ever enters a useCallback/useMemo dep array.
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

export function getResourceDate(resource: Resource): string {
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
 * Per-resource-type Date extractor for the SearchResultsPage table (UAT-FU-01 /
 * CONTEXT D-04). Uses typed @medplum/fhirtypes accessors for the 6 target FHIR
 * resource types and falls back to the legacy `getResourceDate` for everything
 * else (preserving current behavior for unknown / unmapped types per D-04).
 *
 * Field paths verified against `@medplum/fhirtypes` declarations + HL7 R4 spec
 * (see RESEARCH §FHIR R4 Field Path Verification):
 *   - Patient.birthDate (date)
 *   - Condition.onsetDateTime (dateTime, choice)
 *   - Observation.effectiveDateTime (dateTime, choice)
 *   - MedicationStatement.effectiveDateTime (dateTime, choice — FLAT in Medplum
 *     types, NOT nested under .effective.dateTime)
 *   - Encounter.period.start (Period.start — NO .date field exists, Pitfall P-03)
 *   - Procedure.performedDateTime (dateTime, choice)
 *
 * All extracted values are sliced to YYYY-MM-DD per UI-SPEC §Copywriting
 * UAT-FU-01; missing fields render as empty string (NOT em-dash) to preserve
 * the table's "empty = empty" visual baseline.
 */
export function getResourceDateByType(resource: Resource): string {
  switch (resource.resourceType) {
    case 'Patient':
      return (resource as Patient).birthDate ?? '';
    case 'Condition':
      return (resource as Condition).onsetDateTime?.slice(0, 10) ?? '';
    case 'Observation':
      return (resource as Observation).effectiveDateTime?.slice(0, 10) ?? '';
    case 'MedicationStatement':
      return (resource as MedicationStatement).effectiveDateTime?.slice(0, 10) ?? '';
    case 'Encounter':
      return (resource as Encounter).period?.start?.slice(0, 10) ?? '';
    case 'Procedure':
      return (resource as Procedure).performedDateTime?.slice(0, 10) ?? '';
    default:
      return getResourceDate(resource);
  }
}

/**
 * Per-resource-type Status extractor for the SearchResultsPage table (UAT-FU-01 /
 * CONTEXT D-05). Returns the raw status code string per type (no enum
 * prettification — German localization is deferred to v1.6+).
 *
 * Pitfall mitigations:
 *   - P-01: Condition.clinicalStatus is a CodeableConcept (NOT a string); walk
 *     to `.coding[0].code` then fall back to `.text` then ''.
 *   - P-02: Patient.active is a boolean (NOT a code); explicit boolean→label
 *     mapping (`true → 'active'`, `false → 'inactive'`, `undefined → ''`).
 *
 * The 4 enum-status types (Observation, MedicationStatement, Encounter,
 * Procedure) expose `.status` as a top-level FHIR `code` field — read directly.
 *
 * Default for non-target types is empty string (D-04 default fallback) so the
 * Status column stays empty rather than rendering misleading inline JSON.
 */
export function getResourceStatusByType(resource: Resource): string {
  switch (resource.resourceType) {
    case 'Patient': {
      const p = resource as Patient;
      if (p.active === false) return 'inactive';
      if (p.active === true) return 'active';
      return '';
    }
    case 'Condition': {
      const c = resource as Condition;
      return c.clinicalStatus?.coding?.[0]?.code ?? c.clinicalStatus?.text ?? '';
    }
    case 'Observation':
    case 'MedicationStatement':
    case 'Encounter':
    case 'Procedure':
      return (
        (resource as Observation | MedicationStatement | Encounter | Procedure)
          .status ?? ''
      );
    default:
      return '';
  }
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

  // PEEK-01: JSON peek drawer wiring (Phase 52 Plan 02).
  // J on a focused table row opens the 420px right drawer (CONTEXT D-04, D-12).
  const { openPeek } = usePeek();
  const [focusedResource, setFocusedResource] = useState<Resource | null>(null);

  const handleJ = useCallback(() => {
    if (!focusedResource) return; // No focused row → silent no-op (UI-SPEC empty state contract)
    openPeek(focusedResource, document.activeElement as HTMLElement | null);
  }, [focusedResource, openPeek]);

  useShortcuts({ j: handleJ });

  // EXPL-02 / D-02 / D-10: density mode persists to localStorage under explorer.density.v1
  // Default 'table' → no visible change on first load. getInitialValueInEffect: false matches
  // ResourceTypeLanding pattern (no flicker on hydration).
  const [density, setDensity] = useLocalStorage<'cards' | 'table' | 'compact'>({
    key: 'explorer.density.v1',
    defaultValue: 'table',
    getInitialValueInEffect: false,
  });

  const parsedTypes = useMemo(() => parseResourceTypes(capability), [capability]);
  const allTypeNames = useMemo(() => parsedTypes.map((t) => t.type), [parsedTypes]);
  const currentTypeData = useMemo(
    () => parsedTypes.find((t) => t.type === resourceType),
    [parsedTypes, resourceType]
  );

  // (REFERENCE_PARAMS moved to module scope — see below component definition)

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
    // Delegated to shared helper (SHELL-02). Helper fetches IDs, prefix-filters,
    // and returns a Bundle with `total` overridden to the full match count.
    if (idPrefixSearch !== null) {
      searchByIdentifierPrefix(client, resourceType as ResourceType, idPrefixSearch, {
        limit: 5000,
        pageSize: searchRequest.count ?? 20,
      })
        .then((result) => {
          if (cancelled) return;
          setBundle(result);
          setLoading(false);
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

  // CR-01 fix: hoisted from inline JSX prop — useMemo must be called at top level,
  // not inside a JSX expression (Rules of Hooks).
  const activeFilters = useMemo(
    () => Object.fromEntries(
      (searchRequest.filters ?? [])
        .filter((f) => f.value)
        .map((f) => [f.code, f.value])
    ),
    [searchRequest.filters]
  );

  return (
    <Stack gap="lg" p="md">
      <Breadcrumbs>
        <Anchor onClick={() => navigate('/explorer')} size="sm">
          Explorer
        </Anchor>
        <Text size="sm" c="dimmed">
          {getResourceCategory(resourceType)}
        </Text>
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
        activeFilters={activeFilters}
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
        <Group justify="space-between" align="center">
          <SegmentedControl
            value={density}
            onChange={(v) => setDensity(v as 'cards' | 'table' | 'compact')}
            data={[
              { value: 'cards', label: 'Cards' },
              { value: 'table', label: 'Table' },
              { value: 'compact', label: 'Compact' },
            ]}
            size="xs"
          />
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

      {!loading && resources.length > 0 && density === 'cards' && (
        <SimpleGrid cols={{ base: 1, sm: 2, lg: 3 }} spacing="sm">
          {resources.map((r) => {
            const summary = summarizeResource(r);
            const date = getResourceDateByType(r);
            const status = getResourceStatusByType(r);
            const statusColor = status === 'active' || status === 'completed' ? 'green' : 'gray';
            return (
              <Paper
                key={r.id}
                withBorder
                p="sm"
                radius="sm"
                tabIndex={0}
                style={{
                  cursor: 'pointer',
                  outline: focusedResource?.id === r.id
                    ? '2px solid var(--accent-ring)'
                    : undefined,
                  outlineOffset: focusedResource?.id === r.id ? '-1px' : undefined,
                }}
                onClick={() => navigate(`/explorer/${r.resourceType}/${r.id}`)}
                onFocus={() => setFocusedResource(r)}
                onBlur={(e) => {
                  const next = e.relatedTarget as Node | null;
                  const grid = (e.currentTarget as HTMLElement).closest('.mantine-SimpleGrid-root');
                  if (!next || !grid?.contains(next)) {
                    setFocusedResource(null);
                  }
                }}
              >
                <Group justify="space-between" mb={4}>
                  <Text ff="monospace" size="xs" c="dimmed" truncate="end" style={{ maxWidth: 180 }}>
                    {r.id}
                  </Text>
                  {status && (
                    <Badge size="sm" variant="light" color={statusColor}>
                      {status}
                    </Badge>
                  )}
                </Group>
                <Text fw={600} size="sm" lineClamp={2}>{summary.primary}</Text>
                {summary.secondary && (
                  <Text c="dimmed" ff="monospace" size="xs" lineClamp={1}>
                    {summary.secondary}
                  </Text>
                )}
                {date && <Text size="xs" c="dimmed" mt={4}>{date}</Text>}
              </Paper>
            );
          })}
        </SimpleGrid>
      )}

      {!loading && resources.length > 0 && (density === 'table' || density === 'compact') && (
        <Table
          striped
          highlightOnHover
          withTableBorder
          verticalSpacing={density === 'compact' ? 'xs' : undefined}
        >
          <Table.Thead>
            <Table.Tr>
              <Table.Th>ID</Table.Th>
              <Table.Th>Summary</Table.Th>
              <Table.Th>Date</Table.Th>
              <Table.Th>Status</Table.Th>
            </Table.Tr>
          </Table.Thead>
          <Table.Tbody>
            {resources.map((r) => {
              const summary = summarizeResource(r);
              const primarySize = density === 'compact' ? 'xs' : 'sm';
              const secondaryMaxWidth = density === 'compact' ? 300 : 380;
              const dateSize = density === 'compact' ? 'xs' : 'sm';
              return (
                <Table.Tr
                  key={r.id}
                  tabIndex={0}
                  style={{
                    cursor: 'pointer',
                    outline: focusedResource?.id === r.id
                      ? '2px solid var(--accent-ring)'
                      : undefined,
                    outlineOffset: focusedResource?.id === r.id ? '-1px' : undefined,
                  }}
                  onClick={() => navigate(`/explorer/${r.resourceType}/${r.id}`)}
                  onFocus={() => setFocusedResource(r)}
                  onBlur={(e) => {
                    // Keep focusedResource when focus moves within tbody or into the drawer.
                    // Only clear when focus leaves the tbody entirely.
                    const next = e.relatedTarget as Node | null;
                    const tbody = (e.currentTarget as HTMLElement).closest('tbody');
                    if (!next || !tbody?.contains(next)) {
                      setFocusedResource(null);
                    }
                  }}
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
                      href={`/explorer/${r.resourceType}/${r.id}`}
                      onClick={(e) => {
                        e.preventDefault();
                        navigate(`/explorer/${r.resourceType}/${r.id}`);
                      }}
                      style={{ display: 'block', maxWidth: 400 }}
                    >
                      <Stack gap={4}>
                        <Text fw={600} size={primarySize}>{summary.primary}</Text>
                        {summary.secondary && (
                          <Text
                            c="dimmed"
                            ff="monospace"
                            size="xs"
                            truncate="end"
                            style={{ maxWidth: secondaryMaxWidth }}
                          >
                            {summary.secondary}
                          </Text>
                        )}
                      </Stack>
                    </Anchor>
                  </Table.Td>
                  <Table.Td>
                    <Text size={dateSize}>{getResourceDateByType(r)}</Text>
                  </Table.Td>
                  <Table.Td>
                    {(() => {
                      const status = getResourceStatusByType(r);
                      if (!status) return null;
                      const color =
                        status === 'active' || status === 'completed'
                          ? 'green'
                          : 'gray';
                      return (
                        <Badge size="sm" variant="light" color={color}>
                          {status}
                        </Badge>
                      );
                    })()}
                  </Table.Td>
                </Table.Tr>
              );
            })}
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
