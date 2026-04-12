import { useCallback, useEffect, useMemo, useState } from 'react';
import { useNavigate, useOutletContext, useSearchParams } from 'react-router-dom';
import {
  Alert,
  Badge,
  Button,
  Group,
  NumberInput,
  Select,
  Skeleton,
  Stack,
  Table,
  Text,
  TextInput,
  Title,
} from '@mantine/core';
import type { Bundle, Patient } from '@medplum/fhirtypes';
import type { PatientsOutletContext } from './PatientsLayout';
import { PaginationControls } from '../explorer/PaginationControls';

interface PatientSearchParams {
  name: string;
  identifier: string;
  ageMin: string;
  ageMax: string;
  gender: string;
}

/** Convert an age in years to a FHIR birthdate bound (YYYY-MM-DD). */
function ageToBirthdate(age: number, bound: 'ge' | 'le'): string {
  const now = new Date();
  // For "age >= X" → birthdate <= (today - X years)
  // For "age <= X" → birthdate >= (today - (X+1) years + 1 day)
  if (bound === 'ge') {
    const d = new Date(now.getFullYear() - age, now.getMonth(), now.getDate());
    return d.toISOString().slice(0, 10);
  }
  const d = new Date(now.getFullYear() - age - 1, now.getMonth(), now.getDate() + 1);
  return d.toISOString().slice(0, 10);
}

const DEFAULT_COUNT = 20;

function getPatientName(patient: Patient): string {
  if (!patient.name || patient.name.length === 0) return patient.id ?? '';
  const n = patient.name[0];
  if (n.text) return n.text;
  const parts = [n.family, ...(n.given ?? [])].filter(Boolean);
  return parts.join(', ') || (patient.id ?? '');
}

function getPatientIdentifier(patient: Patient): string {
  if (!patient.identifier || patient.identifier.length === 0) return '';
  return patient.identifier[0].value ?? '';
}

/**
 * Patient list page at `/patients`.
 *
 * Auto-loads patients on mount. Provides Name, Identifier, Birth Date search.
 * Identifier field supports bare IDs (mapped to _id) and wildcards (prefix*).
 */
export function PatientListPage() {
  const { client } = useOutletContext<PatientsOutletContext>();
  const navigate = useNavigate();
  const [urlParams, setUrlParams] = useSearchParams();

  // Initialize from URL params (bookmark restore)
  const initialFromUrl = useMemo<PatientSearchParams>(() => ({
    name: urlParams.get('name') ?? '',
    identifier: urlParams.get('identifier') ?? '',
    ageMin: urlParams.get('ageMin') ?? '',
    ageMax: urlParams.get('ageMax') ?? '',
    gender: urlParams.get('gender') ?? '',
  }), []); // eslint-disable-line react-hooks/exhaustive-deps

  const [searchParams, setSearchParams] = useState<PatientSearchParams>(initialFromUrl);
  const [bundle, setBundle] = useState<Bundle | undefined>(undefined);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [count, setCount] = useState<number>(
    parseInt(urlParams.get('_count') ?? '', 10) || DEFAULT_COUNT
  );

  // Active search = what's actually been submitted (not live typing)
  const [activeSearch, setActiveSearch] = useState<PatientSearchParams>(initialFromUrl);
  const [searchVersion, setSearchVersion] = useState(0);

  // Execute search whenever activeSearch or count changes
  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);

    const params = new URLSearchParams();
    params.set('_count', String(count));

    if (activeSearch.name) {
      params.set('name', activeSearch.name);
    }

    if (activeSearch.identifier) {
      let idValue = activeSearch.identifier;
      const isWildcard = idValue.includes('*');

      if (isWildcard) {
        // Wildcard: client-side prefix search on _id
        const prefix = idValue.replace(/\*/g, '');
        const idUrl = `Patient?_elements=id&_count=5000`;
        client
          .get(client.fhirUrl(idUrl).toString())
          .then((raw) => {
            if (cancelled) return;
            const idBundle: Bundle = typeof raw === 'string' ? JSON.parse(raw) : raw;
            const allIds = (idBundle.entry ?? [])
              .map((e) => e.resource?.id)
              .filter((id): id is string => !!id);
            const matching = allIds.filter((id) => id.startsWith(prefix));

            if (matching.length === 0) {
              setBundle({ resourceType: 'Bundle', type: 'searchset', total: 0, entry: [] });
              setLoading(false);
              return;
            }

            const pageIds = matching.slice(0, count);
            return client
              .get(client.fhirUrl(`Patient?_id=${pageIds.join(',')}&_count=${count}`).toString())
              .then((raw2) => {
                if (cancelled) return;
                const result: Bundle = typeof raw2 === 'string' ? JSON.parse(raw2) : raw2;
                result.total = matching.length;
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

      // No wildcard: if no | separator, treat as _id
      if (!idValue.includes('|')) {
        params.set('_id', idValue);
      } else {
        params.set('identifier', idValue);
      }
    }

    // Age range → FHIR birthdate range conversion
    const ageMin = activeSearch.ageMin ? parseInt(activeSearch.ageMin, 10) : NaN;
    const ageMax = activeSearch.ageMax ? parseInt(activeSearch.ageMax, 10) : NaN;
    if (!isNaN(ageMin)) {
      // age >= ageMin means birthdate <= (today - ageMin years)
      params.append('birthdate', `le${ageToBirthdate(ageMin, 'ge')}`);
    }
    if (!isNaN(ageMax)) {
      // age <= ageMax means birthdate >= (today - (ageMax+1) years + 1 day)
      params.append('birthdate', `ge${ageToBirthdate(ageMax, 'le')}`);
    }

    if (activeSearch.gender) {
      params.set('gender', activeSearch.gender);
    }

    const url = `Patient?${params.toString()}`;
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

    return () => { cancelled = true; };
  }, [client, activeSearch, count, searchVersion]);

  const patients = useMemo(
    () => (bundle?.entry ?? []).map((e) => e.resource).filter(Boolean) as Patient[],
    [bundle]
  );

  const handleSearch = useCallback(() => {
    setActiveSearch(searchParams);
    setSearchVersion((v) => v + 1);
    // Sync to URL for bookmarkability
    const params = new URLSearchParams();
    if (searchParams.name) params.set('name', searchParams.name);
    if (searchParams.identifier) params.set('identifier', searchParams.identifier);
    if (searchParams.ageMin) params.set('ageMin', searchParams.ageMin);
    if (searchParams.ageMax) params.set('ageMax', searchParams.ageMax);
    if (searchParams.gender) params.set('gender', searchParams.gender);
    if (count !== DEFAULT_COUNT) params.set('_count', String(count));
    setUrlParams(params);
  }, [searchParams, count, setUrlParams]);

  const handlePageChange = useCallback(
    (url: string) => {
      let fetchUrl = url;
      try {
        const parsed = new URL(url);
        fetchUrl = `${window.location.origin}${parsed.pathname}${parsed.search}`;
      } catch { /* use as-is */ }

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

  const handleCountChange = useCallback((nextCount: number) => {
    setCount(nextCount);
  }, []);

  const updateField = (field: keyof PatientSearchParams) =>
    (event: React.ChangeEvent<HTMLInputElement>) => {
      setSearchParams((prev) => ({ ...prev, [field]: event.currentTarget.value }));
    };

  const handleKeyDown = (event: React.KeyboardEvent<HTMLInputElement>) => {
    if (event.key === 'Enter') {
      event.preventDefault();
      handleSearch();
    }
  };

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
          placeholder="ID, prefix*, or system|value"
          value={searchParams.identifier}
          onChange={updateField('identifier')}
          onKeyDown={handleKeyDown}
          style={{ minWidth: 220 }}
        />
        <NumberInput
          label="Age from"
          placeholder="Min"
          value={searchParams.ageMin ? parseInt(searchParams.ageMin, 10) : ''}
          onChange={(val) =>
            setSearchParams((prev) => ({ ...prev, ageMin: val ? String(val) : '' }))
          }
          min={0}
          max={150}
          style={{ width: 90 }}
        />
        <NumberInput
          label="Age to"
          placeholder="Max"
          value={searchParams.ageMax ? parseInt(searchParams.ageMax, 10) : ''}
          onChange={(val) =>
            setSearchParams((prev) => ({ ...prev, ageMax: val ? String(val) : '' }))
          }
          min={0}
          max={150}
          style={{ width: 90 }}
        />
        <Select
          label="Gender"
          placeholder="All"
          value={searchParams.gender || null}
          onChange={(val) =>
            setSearchParams((prev) => ({ ...prev, gender: val ?? '' }))
          }
          data={[
            { value: 'male', label: 'Male' },
            { value: 'female', label: 'Female' },
            { value: 'other', label: 'Other' },
            { value: 'unknown', label: 'Unknown' },
          ]}
          clearable
          style={{ width: 130 }}
        />
        <Button onClick={handleSearch}>Search Patients</Button>
      </Group>

      {error && (
        <Alert color="red" title="Search failed">
          {error}
        </Alert>
      )}

      {loading && !bundle && (
        <Stack gap="sm">
          <Skeleton height={36} />
          <Skeleton height={36} />
          <Skeleton height={36} />
        </Stack>
      )}

      {!loading && patients.length > 0 && (
        <Table striped highlightOnHover withTableBorder>
          <Table.Thead>
            <Table.Tr>
              <Table.Th>Name</Table.Th>
              <Table.Th>Birth Date</Table.Th>
              <Table.Th>Gender</Table.Th>
              <Table.Th>Identifier</Table.Th>
              <Table.Th>ID</Table.Th>
            </Table.Tr>
          </Table.Thead>
          <Table.Tbody>
            {patients.map((p) => (
              <Table.Tr
                key={p.id}
                style={{ cursor: 'pointer' }}
                onClick={() => navigate(`/patients/${p.id}`)}
              >
                <Table.Td>
                  <Text size="sm" fw={500}>{getPatientName(p)}</Text>
                </Table.Td>
                <Table.Td>
                  <Text size="sm">{p.birthDate ?? ''}</Text>
                </Table.Td>
                <Table.Td>
                  {p.gender && (
                    <Badge size="sm" variant="light" color={p.gender === 'female' ? 'pink' : 'blue'}>
                      {p.gender}
                    </Badge>
                  )}
                </Table.Td>
                <Table.Td>
                  <Text size="sm" ff="monospace" truncate style={{ maxWidth: 200 }}>
                    {getPatientIdentifier(p)}
                  </Text>
                </Table.Td>
                <Table.Td>
                  <Text size="sm" ff="monospace" truncate style={{ maxWidth: 150 }}>
                    {p.id}
                  </Text>
                </Table.Td>
              </Table.Tr>
            ))}
          </Table.Tbody>
        </Table>
      )}

      {!loading && bundle && patients.length === 0 && (
        <Stack align="center" py="xl">
          <Title order={3}>No patients found</Title>
          <Text c="dimmed">Try adjusting your search criteria.</Text>
        </Stack>
      )}

      <PaginationControls
        bundle={bundle}
        currentCount={count}
        onPageChange={handlePageChange}
        onCountChange={handleCountChange}
        loading={loading}
      />
    </Stack>
  );
}
