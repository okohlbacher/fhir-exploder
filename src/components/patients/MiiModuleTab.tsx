import { useCallback, useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Anchor, Center, Skeleton, Stack, Table, Text } from '@mantine/core';
import { useMedplum } from '@medplum/react-hooks';
import type { Bundle, Resource } from '@medplum/fhirtypes';
import type { MiiModule } from '../../utils/mii-modules';

interface MiiModuleTabProps {
  module: MiiModule;
  patientId: string;
}

function getSummary(r: Resource): string {
  const obj = r as Record<string, unknown>;
  for (const field of ['code', 'type', 'category']) {
    const cc = obj[field];
    if (cc && typeof cc === 'object') {
      const concept = Array.isArray(cc) ? cc[0] : cc;
      if (concept) {
        const c = concept as Record<string, unknown>;
        if (typeof c.text === 'string') return c.text;
        if (Array.isArray(c.coding) && c.coding[0]) {
          const coding = c.coding[0] as Record<string, unknown>;
          return (coding.display as string) ?? (coding.code as string) ?? '';
        }
      }
    }
  }
  if (typeof obj.description === 'string') return obj.description;
  return r.id ?? '';
}

function getDate(r: Resource): string {
  const obj = r as Record<string, unknown>;
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

    const url = `${module.fhirResourceType}?${module.patientSearchParam}=Patient/${patientId}&_count=50&_sort=-date`;
    client
      .get(client.fhirUrl(url).toString())
      .then((raw) => {
        if (cancelled) return;
        const bundle: Bundle = typeof raw === 'string' ? JSON.parse(raw) : raw;
        setResources(
          (bundle.entry ?? []).map((e) => e.resource).filter(Boolean) as Resource[]
        );
        setLoading(false);
      })
      .catch(() => {
        if (cancelled) return;
        setResources([]);
        setLoading(false);
      });

    return () => { cancelled = true; };
  }, [client, module.fhirResourceType, module.patientSearchParam, patientId]);

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
                {getSummary(r)}
              </Anchor>
            </Table.Td>
            <Table.Td><Text size="sm">{getDate(r)}</Text></Table.Td>
            <Table.Td>
              <Text size="sm" c="dimmed">
                {(r as Record<string, unknown>).status as string ?? ''}
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
