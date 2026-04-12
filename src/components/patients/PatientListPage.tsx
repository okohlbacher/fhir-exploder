import { useCallback, useMemo, useState } from 'react';
import { useNavigate, useOutletContext } from 'react-router-dom';
import {
  Alert,
  Button,
  Group,
  Stack,
  Text,
  TextInput,
  Title,
} from '@mantine/core';
import { SearchControl } from '@medplum/react';
import type { SearchClickEvent, SearchLoadEvent } from '@medplum/react';
import type { Bundle } from '@medplum/fhirtypes';
import type { SearchRequest } from '@medplum/core';
import type { PatientsOutletContext } from './PatientsLayout';
import { PaginationControls } from '../explorer/PaginationControls';

interface PatientSearchParams {
  name: string;
  identifier: string;
  birthDate: string;
}

const DEFAULT_COUNT = 20;

/**
 * Patient list page at `/patients` (D-01, D-02).
 *
 * Provides three search fields (Name, Identifier, Birth Date), a SearchControl
 * bound table for results, and pagination. Results display columns Name,
 * birthDate, gender, identifier per UI-SPEC. Row click navigates to the
 * patient detail page. Until the first search is triggered, a "Browse
 * Patients" empty state is shown.
 *
 * Security note (T-03-01): User-supplied filter values are passed through the
 * SearchRequest.filters array; @medplum/core SearchControl encodes them when
 * executing FHIR search rather than interpolating raw strings into URLs.
 */
export function PatientListPage() {
  const { client } = useOutletContext<PatientsOutletContext>();
  const navigate = useNavigate();

  const [searchParams, setSearchParams] = useState<PatientSearchParams>({
    name: '',
    identifier: '',
    birthDate: '',
  });
  const [searchTriggered, setSearchTriggered] = useState(false);
  const [bundle, setBundle] = useState<Bundle | undefined>(undefined);
  const [error, setError] = useState<string | null>(null);
  const [count, setCount] = useState<number>(DEFAULT_COUNT);

  // Track the search request we actually run (updated on submit, not on every keystroke).
  const [activeSearch, setActiveSearch] = useState<PatientSearchParams>({
    name: '',
    identifier: '',
    birthDate: '',
  });

  const searchRequest = useMemo<SearchRequest>(() => {
    const filters: NonNullable<SearchRequest['filters']> = [];
    if (activeSearch.name) {
      filters.push({ code: 'name', operator: 'eq', value: activeSearch.name });
    }
    if (activeSearch.identifier) {
      filters.push({
        code: 'identifier',
        operator: 'eq',
        value: activeSearch.identifier,
      });
    }
    if (activeSearch.birthDate) {
      filters.push({
        code: 'birthdate',
        operator: 'eq',
        value: activeSearch.birthDate,
      });
    }
    return {
      resourceType: 'Patient',
      filters,
      fields: ['name', 'birthDate', 'gender', 'identifier'],
      count,
    };
  }, [activeSearch, count]);

  const handleSearch = useCallback(() => {
    setError(null);
    setActiveSearch(searchParams);
    setSearchTriggered(true);
  }, [searchParams]);

  const handleSearchLoad = useCallback((e: SearchLoadEvent) => {
    setBundle(e.response);
    setError(null);
  }, []);

  const handleClick = useCallback(
    (e: SearchClickEvent) => {
      const resource = e.resource;
      if (resource.resourceType === 'Patient' && resource.id) {
        navigate(`/patients/${resource.id}`);
      }
    },
    [navigate]
  );

  const handlePageChange = useCallback(
    (url: string) => {
      // Use MedplumClient to follow the pagination link and refresh the bundle.
      client
        .get(url)
        .then((next) => {
          setBundle(next as Bundle);
        })
        .catch((err: unknown) => {
          const message = err instanceof Error ? err.message : 'Unknown error';
          setError(message);
        });
    },
    [client]
  );

  const handleCountChange = useCallback((nextCount: number) => {
    setCount(nextCount);
  }, []);

  const updateField = (field: keyof PatientSearchParams) =>
    (event: React.ChangeEvent<HTMLInputElement>) => {
      const value = event.currentTarget.value;
      setSearchParams((prev) => ({ ...prev, [field]: value }));
    };

  const handleKeyDown = (event: React.KeyboardEvent<HTMLInputElement>) => {
    if (event.key === 'Enter') {
      event.preventDefault();
      handleSearch();
    }
  };

  // Position text for result header
  const positionText = useMemo(() => {
    if (!bundle) return '';
    const entryCount = bundle.entry?.length ?? 0;
    if (entryCount === 0) return '';
    let offset = 0;
    const selfLink = bundle.link?.find((l) => l.relation === 'self')?.url;
    if (selfLink) {
      try {
        const url = new URL(selfLink, 'http://localhost');
        const offsetParam =
          url.searchParams.get('__page-offset') ?? url.searchParams.get('_offset');
        if (offsetParam) {
          offset = parseInt(offsetParam, 10) || 0;
        }
      } catch {
        offset = 0;
      }
    }
    const start = offset + 1;
    const end = offset + entryCount;
    if (typeof bundle.total === 'number') {
      return `Showing ${start}-${end} of ${bundle.total}`;
    }
    return `Showing ${start}-${end}`;
  }, [bundle]);

  return (
    <Stack gap="lg" p="md">
      <Title order={2}>Patients</Title>

      <Group align="flex-end" gap="md" wrap="wrap">
        <TextInput
          label="Name"
          placeholder="Search by name..."
          value={searchParams.name}
          onChange={updateField('name')}
          onKeyDown={handleKeyDown}
          style={{ minWidth: 220 }}
        />
        <TextInput
          label="Identifier"
          placeholder="Search by identifier..."
          value={searchParams.identifier}
          onChange={updateField('identifier')}
          onKeyDown={handleKeyDown}
          style={{ minWidth: 220 }}
        />
        <TextInput
          label="Birth Date"
          placeholder="YYYY-MM-DD"
          value={searchParams.birthDate}
          onChange={updateField('birthDate')}
          onKeyDown={handleKeyDown}
          style={{ minWidth: 180 }}
        />
        <Button onClick={handleSearch}>Search Patients</Button>
      </Group>

      {error && (
        <Alert color="red" title="Search failed">
          Search failed: Could not load patients. Check your server connection
          and try again.
        </Alert>
      )}

      {!searchTriggered && !error && (
        <Stack align="center" py="xl">
          <Title order={3}>Browse Patients</Title>
          <Text c="dimmed">
            Use the search fields above to find patients, or click Search with
            no filters to list all patients.
          </Text>
        </Stack>
      )}

      {searchTriggered && (
        <>
          {positionText && (
            <Text size="sm" c="dimmed">
              {positionText}
            </Text>
          )}
          <SearchControl
            search={searchRequest}
            hideToolbar={true}
            hideFilters={true}
            onClick={handleClick}
            onLoad={handleSearchLoad}
          />
          <PaginationControls
            bundle={bundle}
            currentCount={count}
            onPageChange={handlePageChange}
            onCountChange={handleCountChange}
          />
        </>
      )}
    </Stack>
  );
}
