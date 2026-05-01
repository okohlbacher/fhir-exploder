import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Anchor, Center, Skeleton, Stack, Table, Text } from '@mantine/core';
import { useMedplum } from '@medplum/react-hooks';
import type { Bundle, Resource } from '@medplum/fhirtypes';
import {
  type MiiModule,
  fhirResourceTypesOf,
  getPatientSearchParamForType,
  getExtraQueryForType,
} from '../../utils/mii-modules';
import { toRecord } from '../../utils/fhir-helpers';
import { summarizeResource } from '../../utils/summarizeResource';
import { useEmptyExtensionsPublisher } from '../../hooks/useEmptyExtensionsCoordinator';

interface MiiModuleTabProps {
  module: MiiModule;
  patientId: string;
}

function getDate(r: Resource): string {
  const obj = toRecord(r);
  for (const field of [
    'effectiveDateTime', 'performedDateTime', 'recordedDate', 'onsetDateTime',
    'authoredOn', 'date', 'issued',
  ]) {
    if (typeof obj[field] === 'string') return (obj[field] as string).slice(0, 10);
  }
  for (const field of ['effectivePeriod', 'period', 'performedPeriod']) {
    const p = obj[field] as Record<string, unknown> | undefined;
    if (p?.start && typeof p.start === 'string') return (p.start as string).slice(0, 10);
  }
  return '';
}

/**
 * Single MII module tab content — uses direct FHIR search instead of
 * Medplum's SearchControl (which crashes on non-Medplum servers).
 */
export function MiiModuleTab({ module, patientId }: MiiModuleTabProps) {
  const navigate = useNavigate();
  const client = useMedplum();
  const [resources, setResources] = useState<Resource[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);

    // Plan 33-04 (MII-EXT-03 / D-06): fan out across every FHIR type covered
    // by this module. Each per-type fetch owns its own per-type catch that
    // returns an empty array so a single failing type blanks only that type —
    // other types in the module still render. For Phase 33 every base module
    // has a one-element type array, so this is a semantic no-op; Phase 34
    // extension modules (e.g. Bildgebung = ['ImagingStudy', 'DiagnosticReport'])
    // drop in unchanged.
    const types = fhirResourceTypesOf(module);

    const fetchOne = (type: string): Promise<Resource[]> => {
      const param = getPatientSearchParamForType(module, type);
      const extra = getExtraQueryForType(module, type);
      let url = `${type}?${param}=Patient/${patientId}&_count=50&_sort=-_lastUpdated`;
      if (extra) url += `&${extra}`;

      return client
        .get(client.fhirUrl(url).toString())
        .then((raw) => {
          const bundle: Bundle = typeof raw === 'string' ? JSON.parse(raw) : raw;
          return (bundle.entry ?? [])
            .map((e) => e.resource)
            .filter(Boolean) as Resource[];
        })
        .catch(() => [] as Resource[]); // D-06: per-type failure → empty
    };

    Promise.all(types.map(fetchOne)).then((perType) => {
      if (cancelled) return;
      const all = perType.flat();
      // D-07: merge per-type results and sort newest-first. Matches the
      // server-side `_sort=-_lastUpdated` hint now that we combine multiple
      // types. (Phase 38.1: swapped from the previous `date` sort clause
      // because Blaze 1.6.2 rejects `date` as a sort clause with HTTP 400
      // — see 38-SUMMARY.md for the full root-cause analysis.)
      all.sort((a, b) => getDate(b).localeCompare(getDate(a)));
      setResources(all);
      setLoading(false);
    });

    return () => { cancelled = true; };
  }, [client, module, patientId]);

  // Plan 34-05 (MII-EXT-14): publish per-(patientId, moduleKey) emptiness
  // up to the EmptyExtensionsProvider so MiiModuleTabs can count and
  // optionally hide empty extension pills. Only extension modules
  // contribute — base 7 are exempt from the hide-empty toggle (D-21).
  // While loading, isEmpty is false so the toggle doesn't flicker.
  const isExtension = module.category === 'extension';
  const isEmpty = !loading && resources.length === 0;
  useEmptyExtensionsPublisher({
    moduleKey: module.key,
    isEmpty: isExtension && isEmpty,
  });

  if (loading) {
    return (
      <Stack gap="sm" pt="md">
        <Skeleton height={32} />
        <Skeleton height={32} />
        <Skeleton height={32} />
      </Stack>
    );
  }

  if (resources.length === 0) {
    if (isExtension) {
      // CONTEXT D-18: visible + 0.55 opacity + em-dash copy. The
      // data-testid="empty-state-wrapper" enables robust test assertions
      // via getByTestId + getComputedStyle (Mantine 8's inline-style
      // serialization is not stable enough for [style*="opacity: 0.55"]
      // attribute selectors — checker fix for nyquist_compliance).
      return (
        <Center
          py="xl"
          style={{ opacity: 0.55 }}
          data-testid="empty-state-wrapper"
        >
          <Text c="dimmed">— no {module.germanLabel} data for this patient</Text>
        </Center>
      );
    }
    // Base modules keep Phase 33 copy + full opacity (D-21 exemption).
    // Note: the base empty branch DOES NOT carry the empty-state-wrapper
    // testid — tests use its absence (or opacity !== '0.55') to confirm
    // base exemption.
    return (
      <Center py="xl">
        <Text c="dimmed">No {module.germanLabel} data found for this patient.</Text>
      </Center>
    );
  }

  return (
    <Table striped highlightOnHover withTableBorder mt="md">
      <Table.Thead>
        <Table.Tr>
          <Table.Th>Summary</Table.Th>
          <Table.Th>Date</Table.Th>
          <Table.Th>Status</Table.Th>
          <Table.Th>ID</Table.Th>
        </Table.Tr>
      </Table.Thead>
      <Table.Tbody>
        {resources.map((r) => (
          <Table.Tr
            key={r.id}
            style={{ cursor: 'pointer' }}
            onClick={() => navigate(`/patients/${patientId}/${r.resourceType}/${r.id}`)}
          >
            <Table.Td>
              <Anchor
                size="sm"
                href={`/patients/${patientId}/${r.resourceType}/${r.id}`}
                onClick={(e) => e.preventDefault()}
              >
                {summarizeResource(r).primary}
              </Anchor>
            </Table.Td>
            <Table.Td><Text size="sm">{getDate(r)}</Text></Table.Td>
            <Table.Td>
              <Text size="sm" c="dimmed">
                {toRecord(r).status as string ?? ''}
              </Text>
            </Table.Td>
            <Table.Td>
              <Text size="sm" ff="monospace" c="dimmed" truncate style={{ maxWidth: 150 }}>
                {r.id}
              </Text>
            </Table.Td>
          </Table.Tr>
        ))}
      </Table.Tbody>
    </Table>
  );
}
