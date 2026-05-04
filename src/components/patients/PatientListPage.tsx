import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { useNavigate, useOutletContext, useSearchParams } from 'react-router-dom';
import {
  Anchor,
  ActionIcon,
  Alert,
  Avatar,
  Badge,
  Button,
  Card,
  Code,
  Group,
  Kbd,
  Modal,
  NumberInput,
  Select,
  Skeleton,
  Stack,
  Table,
  Text,
  TextInput,
  Title,
  Tooltip,
} from '@mantine/core';
import { useDisclosure } from '@mantine/hooks';
import { IconSearch, IconX } from '@tabler/icons-react';
import type { Bundle, Patient, Resource } from '@medplum/fhirtypes';
import type { MedplumClient } from '@medplum/core';
import type { PatientsOutletContext } from './PatientsLayout';
import { PaginationControls } from '../explorer/PaginationControls';
import { searchByIdentifierPrefix } from '../../utils/searchByIdentifierPrefix';
import { toRecord } from '../../utils/fhir-helpers';

// ---------------------------------------------------------------------------
// extractDate — pull the most relevant clinical date from any FHIR resource
// ---------------------------------------------------------------------------
function extractDate(r: Resource): string | null {
  const o = toRecord(r);
  // Direct date/dateTime fields
  for (const f of [
    'effectiveDateTime', 'performedDateTime', 'recordedDate', 'onsetDateTime',
    'authoredOn', 'date', 'issued', 'recorded', 'birthDate',
  ]) {
    const v = o[f];
    if (typeof v === 'string' && v.length >= 4) return v;
  }
  // Period start
  for (const f of ['effectivePeriod', 'period', 'performedPeriod', 'onsetPeriod']) {
    const p = o[f] as Record<string, unknown> | undefined;
    if (p && typeof p.start === 'string') return p.start;
  }
  return null;
}

// ---------------------------------------------------------------------------
// usePatientResourceSummary — fetches $everything sample once per patient,
// returns total count + clinical date range (first → last)
// ---------------------------------------------------------------------------
const SAMPLE_SIZE = 200;

interface ResourceSummary {
  count: number | null;
  firstDate: string | null;
  lastDate: string | null;
  error: boolean;
}

function usePatientResourceSummary(patientId: string, client: MedplumClient): ResourceSummary {
  const [state, setState] = useState<ResourceSummary>({
    count: null, firstDate: null, lastDate: null, error: false,
  });

  useEffect(() => {
    let cancelled = false;
    client
      .get(client.fhirUrl(`Patient/${patientId}/$everything?_count=${SAMPLE_SIZE}`).toString())
      .then((raw) => {
        if (cancelled) return;
        const bundle: Bundle = typeof raw === 'string' ? JSON.parse(raw) : raw;
        const resources = (bundle.entry ?? [])
          .map((e) => e.resource)
          .filter(Boolean) as Resource[];
        let first: string | null = null;
        let last: string | null = null;
        for (const r of resources) {
          const d = extractDate(r);
          if (!d) continue;
          if (!first || d < first) first = d;
          if (!last || d > last) last = d;
        }
        setState({
          count: bundle.total ?? resources.length,
          firstDate: first,
          lastDate: last,
          error: false,
        });
      })
      .catch(() => {
        if (!cancelled) setState({ count: null, firstDate: null, lastDate: null, error: true });
      });
    return () => { cancelled = true; };
  }, [patientId, client]);

  return state;
}

function formatTimeRange(s: ResourceSummary): React.ReactNode {
  if (s.error) return <Text size="sm" c="dimmed">—</Text>;
  if (s.count === null) return <Skeleton height={14} width={140} />;
  const { firstDate, lastDate } = s;
  if (!firstDate && !lastDate) return <Text size="sm" c="dimmed">—</Text>;
  const fmt = (d: string | null) => (d ? d.slice(0, 10) : '?');
  if (firstDate && lastDate && firstDate.slice(0, 10) === lastDate.slice(0, 10)) {
    return <Text size="sm" c="dimmed" ff="monospace">{fmt(firstDate)}</Text>;
  }
  return (
    <Text size="sm" c="dimmed" ff="monospace">
      {fmt(firstDate)} → {fmt(lastDate)}
    </Text>
  );
}

function formatCount(s: ResourceSummary): React.ReactNode {
  if (s.error) return <Text size="sm" c="dimmed">—</Text>;
  if (s.count === null) return <Skeleton height={14} width={36} />;
  return <Text size="sm">{s.count.toLocaleString()}</Text>;
}

// ---------------------------------------------------------------------------
// RawPatientButton — compact [RAW] badge that opens a modal with ids + JSON
// ---------------------------------------------------------------------------
function RawPatientButton({ patient }: { patient: Patient }) {
  const [opened, { open, close }] = useDisclosure(false);

  const identifiers = patient.identifier ?? [];
  const json = JSON.stringify(patient, null, 2);

  return (
    <>
      <Tooltip label="View raw IDs and JSON" withArrow>
        <ActionIcon
          variant="subtle"
          color="gray"
          size="sm"
          onClick={(e) => { e.stopPropagation(); open(); }}
          aria-label="View raw patient data"
        >
          <Text size="xs" fw={600} ff="monospace">RAW</Text>
        </ActionIcon>
      </Tooltip>

      <Modal
        opened={opened}
        onClose={close}
        title={`Raw data — ${patient.id}`}
        size="lg"
        onClick={(e) => e.stopPropagation()}
      >
        <Stack gap="sm">
          {identifiers.length > 0 && (
            <>
              <Text size="sm" fw={600}>Identifiers</Text>
              <Table withTableBorder withColumnBorders fz="xs">
                <Table.Thead>
                  <Table.Tr>
                    <Table.Th>System</Table.Th>
                    <Table.Th>Value</Table.Th>
                    <Table.Th>Use</Table.Th>
                  </Table.Tr>
                </Table.Thead>
                <Table.Tbody>
                  {identifiers.map((id, i) => (
                    <Table.Tr key={i}>
                      <Table.Td ff="monospace">{id.system ?? '—'}</Table.Td>
                      <Table.Td ff="monospace">{id.value ?? '—'}</Table.Td>
                      <Table.Td>{id.use ?? '—'}</Table.Td>
                    </Table.Tr>
                  ))}
                </Table.Tbody>
              </Table>
            </>
          )}
          <Text size="sm" fw={600}>FHIR ID</Text>
          <Code block fz="xs">{patient.id}</Code>
          <Text size="sm" fw={600}>Full JSON</Text>
          <Code block fz="xs" style={{ maxHeight: 400, overflowY: 'auto' }}>{json}</Code>
        </Stack>
      </Modal>
    </>
  );
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------
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

/** Derive two-letter initials for the Name-cell avatar (Phase 30 Step 3). */
function getInitials(patient: Patient): string {
  if (patient.name && patient.name.length > 0) {
    const n = patient.name[0];
    const given = n.given?.[0]?.[0] ?? '';
    const family = n.family?.[0] ?? '';
    const combined = `${given}${family}`.toUpperCase();
    if (combined) return combined.slice(0, 2);
  }
  if (patient.id) return patient.id.slice(0, 2).toUpperCase();
  return '?';
}

// ---------------------------------------------------------------------------
// PatientRow — single row; calls usePatientResourceSummary once and renders
// the count + time-range cells from the shared result.
// ---------------------------------------------------------------------------
function PatientRow({
  rowIndex,
  patient,
  client,
  onNavigate,
}: {
  rowIndex: number;
  patient: Patient;
  client: MedplumClient;
  onNavigate: (id: string) => void;
}) {
  const summary = usePatientResourceSummary(patient.id ?? '', client);
  return (
    <Table.Tr
      style={{ cursor: 'pointer' }}
      onClick={() => patient.id && onNavigate(patient.id)}
    >
      <Table.Td
        style={{
          fontFamily: 'var(--font-mono, var(--mantine-font-family-monospace))',
          color: 'var(--mantine-color-dimmed)',
          fontVariantNumeric: 'tabular-nums',
          width: 48,
        }}
      >
        {rowIndex}
      </Table.Td>
      <Table.Td>
        <Group gap="sm" wrap="nowrap">
          <Avatar
            size={28}
            radius="xl"
            color={patient.gender === 'female' ? 'pink' : 'indigo'}
            variant="light"
          >
            {getInitials(patient)}
          </Avatar>
          <Anchor
            size="sm"
            fw={500}
            href={`/patients/${patient.id}`}
            onClick={(e) => {
              e.preventDefault();
              if (patient.id) onNavigate(patient.id);
            }}
          >
            {getPatientName(patient)}
          </Anchor>
        </Group>
      </Table.Td>
      <Table.Td>
        <Text size="sm">{patient.birthDate ?? ''}</Text>
      </Table.Td>
      <Table.Td>
        {patient.gender && (
          <Badge size="sm" variant="light" color="gray">
            {patient.gender}
          </Badge>
        )}
      </Table.Td>
      <Table.Td>{formatTimeRange(summary)}</Table.Td>
      <Table.Td style={{ textAlign: 'right' }}>{formatCount(summary)}</Table.Td>
      <Table.Td onClick={(e) => e.stopPropagation()}>
        <RawPatientButton patient={patient} />
      </Table.Td>
    </Table.Tr>
  );
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

  // Mount-time snapshot from URL params (bookmark restore) — the function
  // is defined in render scope so it closes over the current `urlParams`,
  // but `useState` only invokes it on the first render. Re-renders that
  // re-create the function with a different `urlParams` are harmless;
  // useState ignores subsequent initializers. This is the canonical fix
  // for the previous useMemo with empty deps that needed a lint suppression
  // (Phase 28 SWEEP-04).
  const computeInitialFromUrl = (): PatientSearchParams => ({
    name: urlParams.get('name') ?? '',
    identifier: urlParams.get('identifier') ?? '',
    ageMin: urlParams.get('ageMin') ?? '',
    ageMax: urlParams.get('ageMax') ?? '',
    gender: urlParams.get('gender') ?? '',
  });

  const [searchParams, setSearchParams] = useState<PatientSearchParams>(computeInitialFromUrl);
  const [bundle, setBundle] = useState<Bundle | undefined>(undefined);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [count, setCount] = useState<number>(
    parseInt(urlParams.get('_count') ?? '', 10) || DEFAULT_COUNT
  );

  // Active search = what's actually been submitted (not live typing)
  const [activeSearch, setActiveSearch] = useState<PatientSearchParams>(computeInitialFromUrl);
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
        // Wildcard: client-side prefix search on _id (delegated to SHELL-02 helper).
        const prefix = idValue.replace(/\*/g, '');
        searchByIdentifierPrefix(client, 'Patient', prefix, {
          limit: 5000,
          pageSize: count,
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

  // Phase 30 Step 3 — active-filter chip derivation. Each chip corresponds
  // to a field in `activeSearch` (the submitted criteria, not live typing).
  // Dismissing a chip clears its field in BOTH `searchParams` and
  // `activeSearch` and bumps `searchVersion` so the `useEffect` re-runs.
  const activeChips = useMemo(() => {
    const chips: { key: keyof PatientSearchParams; label: string }[] = [];
    if (activeSearch.name) chips.push({ key: 'name', label: `Name: ${activeSearch.name}` });
    if (activeSearch.identifier)
      chips.push({ key: 'identifier', label: `ID: ${activeSearch.identifier}` });
    if (activeSearch.ageMin) chips.push({ key: 'ageMin', label: `Age ≥ ${activeSearch.ageMin}` });
    if (activeSearch.ageMax) chips.push({ key: 'ageMax', label: `Age ≤ ${activeSearch.ageMax}` });
    if (activeSearch.gender)
      chips.push({ key: 'gender', label: `Gender: ${activeSearch.gender}` });
    return chips;
  }, [activeSearch]);

  const clearChip = useCallback(
    (key: keyof PatientSearchParams) => {
      const next: PatientSearchParams = { ...activeSearch, [key]: '' };
      setSearchParams(next);
      setActiveSearch(next);
      setSearchVersion((v) => v + 1);
      // Sync URL — omit cleared fields.
      const params = new URLSearchParams();
      if (next.name) params.set('name', next.name);
      if (next.identifier) params.set('identifier', next.identifier);
      if (next.ageMin) params.set('ageMin', next.ageMin);
      if (next.ageMax) params.set('ageMax', next.ageMax);
      if (next.gender) params.set('gender', next.gender);
      if (count !== DEFAULT_COUNT) params.set('_count', String(count));
      setUrlParams(params);
    },
    [activeSearch, count, setUrlParams],
  );

  const clearAllChips = useCallback(() => {
    const cleared: PatientSearchParams = {
      name: '',
      identifier: '',
      ageMin: '',
      ageMax: '',
      gender: '',
    };
    setSearchParams(cleared);
    setActiveSearch(cleared);
    setSearchVersion((v) => v + 1);
    setUrlParams(new URLSearchParams());
  }, [setUrlParams]);

  return (
    <Stack gap="lg" p="md">
      <Title order={2}>Patients</Title>

      {/* Phase 30 Step 3 — filter bar collapsed into a single Card. Search
          TextInput carries the ⌘K kbd hint and flexes to fill available
          space. All labels/placeholders preserved so the existing patient-list
          test contracts continue to pass. */}
      <Card p="sm" radius="md">
        <Group align="flex-end" gap="md" wrap="wrap">
          <TextInput
            label="Name"
            placeholder="Search by name..."
            value={searchParams.name}
            onChange={updateField('name')}
            onKeyDown={handleKeyDown}
            leftSection={<IconSearch size={14} />}
            rightSection={<Kbd size="xs">⌘K</Kbd>}
            rightSectionWidth={44}
            style={{ flex: '1 1 240px', minWidth: 220 }}
          />
          <TextInput
            label="Identifier"
            placeholder="ID, prefix*, or system|value"
            value={searchParams.identifier}
            onChange={updateField('identifier')}
            onKeyDown={handleKeyDown}
            style={{ minWidth: 220 }}
          />
          <Group gap={4} align="flex-end" wrap="nowrap">
            <NumberInput
              label="Age from"
              placeholder="Min"
              value={searchParams.ageMin ? parseInt(searchParams.ageMin, 10) : ''}
              onChange={(val) =>
                setSearchParams((prev) => ({
                  ...prev,
                  ageMin: val ? String(val) : '',
                }))
              }
              min={0}
              max={150}
              style={{ width: 70 }}
            />
            <Text size="sm" c="dimmed" pb={8}>
              –
            </Text>
            <NumberInput
              label="Age to"
              placeholder="Max"
              value={searchParams.ageMax ? parseInt(searchParams.ageMax, 10) : ''}
              onChange={(val) =>
                setSearchParams((prev) => ({
                  ...prev,
                  ageMax: val ? String(val) : '',
                }))
              }
              min={0}
              max={150}
              style={{ width: 70 }}
            />
          </Group>
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
          <Button onClick={handleSearch} ml="auto">
            Search Patients
          </Button>
        </Group>
      </Card>

      {/* Active-filter chip row. Dismissing a chip clears that field and
          re-runs the search; "Clear all" resets every field. */}
      {activeChips.length > 0 && (
        <Group gap="xs">
          {activeChips.map((chip) => (
            <Badge
              key={chip.key}
              variant="light"
              color="indigo"
              rightSection={
                <ActionIcon
                  size="xs"
                  variant="transparent"
                  color="indigo"
                  aria-label={`Remove filter ${chip.label}`}
                  onClick={() => clearChip(chip.key)}
                >
                  <IconX size={12} />
                </ActionIcon>
              }
            >
              {chip.label}
            </Badge>
          ))}
          <Button size="xs" variant="subtle" color="gray" onClick={clearAllChips}>
            Clear all
          </Button>
        </Group>
      )}

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
              <Table.Th style={{ width: 48 }}>#</Table.Th>
              <Table.Th>Name</Table.Th>
              <Table.Th>Birth Date</Table.Th>
              <Table.Th>Gender</Table.Th>
              <Table.Th>Time Range</Table.Th>
              <Table.Th style={{ textAlign: 'right' }}>Resources</Table.Th>
              <Table.Th></Table.Th>
            </Table.Tr>
          </Table.Thead>
          <Table.Tbody>
            {patients.map((p, idx) => (
              <PatientRow
                key={p.id}
                rowIndex={idx + 1}
                patient={p}
                client={client}
                onNavigate={(id) => navigate(`/patients/${id}`)}
              />
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
