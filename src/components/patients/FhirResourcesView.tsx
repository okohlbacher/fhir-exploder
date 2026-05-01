import { useCallback, useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Anchor,
  Badge,
  Center,
  Collapse,
  Group,
  Paper,
  Skeleton,
  Stack,
  Table,
  Text,
  UnstyledButton,
} from '@mantine/core';
import { IconChevronDown, IconChevronRight } from '@tabler/icons-react';
import { useMedplum } from '@medplum/react-hooks';
import type { Bundle, CapabilityStatement, Resource } from '@medplum/fhirtypes';
import { toRecord } from '../../utils/fhir-helpers';
import { summarizeResource } from '../../utils/summarizeResource';

type CountState = number | 'loading' | 'error';

interface FhirResourcesViewProps {
  patientId: string;
  capability: CapabilityStatement;
}

function usePatientLinkedTypes(capability: CapabilityStatement): {
  types: string[];
  paramByType: Map<string, 'patient' | 'subject'>;
} {
  return useMemo(() => {
    const types: string[] = [];
    const paramByType = new Map<string, 'patient' | 'subject'>();
    const resources = capability.rest?.[0]?.resource ?? [];
    for (const r of resources) {
      const params = r.searchParam ?? [];
      const hasPatient = params.some((p) => p.name === 'patient');
      const hasSubject = params.some((p) => p.name === 'subject');
      if (!hasPatient && !hasSubject) continue;
      const type = r.type;
      if (!type) continue;
      types.push(type);
      paramByType.set(type, hasPatient ? 'patient' : 'subject');
    }
    types.sort();
    return { types, paramByType };
  }, [capability]);
}

function getDate(r: Resource): string {
  const obj = toRecord(r);
  for (const field of [
    'effectiveDateTime', 'performedDateTime', 'recordedDate', 'onsetDateTime',
    'authoredOn', 'date', 'issued',
  ]) {
    if (typeof obj[field] === 'string') return (obj[field] as string).slice(0, 10);
  }
  return '';
}

/**
 * Patient-scoped FHIR Resources view — uses direct FHIR search
 * instead of Medplum's SearchControl.
 */
export function FhirResourcesView({ patientId, capability }: FhirResourcesViewProps) {
  const navigate = useNavigate();
  const client = useMedplum();

  const { types: patientLinkedTypes, paramByType } = usePatientLinkedTypes(capability);

  const [counts, setCounts] = useState<Record<string, CountState>>({});
  const [expandedType, setExpandedType] = useState<string | null>(null);
  const [expandedResources, setExpandedResources] = useState<Resource[]>([]);
  const [expandedLoading, setExpandedLoading] = useState(false);

  // Fetch counts
  useEffect(() => {
    if (patientLinkedTypes.length === 0) { setCounts({}); return; }
    const initial: Record<string, CountState> = {};
    for (const t of patientLinkedTypes) initial[t] = 'loading';
    setCounts(initial);

    let cancelled = false;
    for (const type of patientLinkedTypes) {
      const param = paramByType.get(type) ?? 'patient';
      const url = `${type}?${param}=Patient/${patientId}&_summary=count&_count=0`;
      client.get(client.fhirUrl(url).toString())
        .then((raw) => {
          if (cancelled) return;
          const bundle: Bundle = typeof raw === 'string' ? JSON.parse(raw) : raw;
          setCounts((prev) => ({ ...prev, [type]: bundle.total ?? 0 }));
        })
        .catch(() => {
          if (cancelled) return;
          setCounts((prev) => ({ ...prev, [type]: 'error' }));
        });
    }
    return () => { cancelled = true; };
  }, [client, patientId, patientLinkedTypes, paramByType]);

  // Fetch resources when a type is expanded
  const handleExpand = useCallback((type: string) => {
    if (expandedType === type) {
      setExpandedType(null);
      return;
    }
    setExpandedType(type);
    setExpandedLoading(true);
    setExpandedResources([]);

    const param = paramByType.get(type) ?? 'patient';
    const url = `${type}?${param}=Patient/${patientId}&_count=20&_sort=-_lastUpdated`;
    client.get(client.fhirUrl(url).toString())
      .then((raw) => {
        const bundle: Bundle = typeof raw === 'string' ? JSON.parse(raw) : raw;
        setExpandedResources(
          (bundle.entry ?? []).map((e) => e.resource).filter(Boolean) as Resource[]
        );
        setExpandedLoading(false);
      })
      .catch(() => {
        setExpandedResources([]);
        setExpandedLoading(false);
      });
  }, [client, expandedType, paramByType, patientId]);

  const stillLoading = patientLinkedTypes.some((t) => counts[t] === 'loading');
  const visibleTypes = patientLinkedTypes.filter((t) => {
    const c = counts[t];
    if (c === 'loading' || c === 'error') return true;
    return typeof c === 'number' && c > 0;
  });

  const allKnownAndEmpty =
    !stillLoading && patientLinkedTypes.length > 0 &&
    patientLinkedTypes.every((t) => counts[t] === 0);

  if (patientLinkedTypes.length === 0 || allKnownAndEmpty) {
    return (
      <Center py="xl">
        <Text c="dimmed">No linked resources found for this patient.</Text>
      </Center>
    );
  }

  return (
    <Stack gap="sm" pt="md">
      {stillLoading && visibleTypes.length === 0 && (
        <Stack gap="xs">
          <Skeleton height={40} />
          <Skeleton height={40} />
          <Skeleton height={40} />
        </Stack>
      )}

      {visibleTypes.map((type) => {
        const count = counts[type];
        const isExpanded = expandedType === type;

        return (
          <Paper key={type} p="sm" withBorder>
            <UnstyledButton onClick={() => handleExpand(type)} style={{ width: '100%' }}>
              <Group justify="space-between" wrap="nowrap">
                <Group gap="sm">
                  {isExpanded ? <IconChevronDown size={16} /> : <IconChevronRight size={16} />}
                  <Text fw={600} size="sm">{type}</Text>
                </Group>
                {count === 'loading' && <Skeleton height={22} width={40} />}
                {count === 'error' && <Badge color="red" variant="light">Error</Badge>}
                {typeof count === 'number' && <Badge color="blue" variant="light">{count}</Badge>}
              </Group>
            </UnstyledButton>
            <Collapse in={isExpanded}>
              <Stack pt="sm">
                {expandedLoading && (
                  <Stack gap="xs">
                    <Skeleton height={28} />
                    <Skeleton height={28} />
                  </Stack>
                )}
                {!expandedLoading && expandedResources.length > 0 && (
                  <Table striped highlightOnHover withTableBorder>
                    <Table.Thead>
                      <Table.Tr>
                        <Table.Th>Summary</Table.Th>
                        <Table.Th>Date</Table.Th>
                        <Table.Th>ID</Table.Th>
                      </Table.Tr>
                    </Table.Thead>
                    <Table.Tbody>
                      {expandedResources.map((r) => (
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
                            <Text size="sm" ff="monospace" c="dimmed" truncate style={{ maxWidth: 150 }}>
                              {r.id}
                            </Text>
                          </Table.Td>
                        </Table.Tr>
                      ))}
                    </Table.Tbody>
                  </Table>
                )}
                {!expandedLoading && expandedResources.length === 0 && (
                  <Text size="sm" c="dimmed" ta="center" py="sm">No resources found.</Text>
                )}
              </Stack>
            </Collapse>
          </Paper>
        );
      })}
    </Stack>
  );
}
