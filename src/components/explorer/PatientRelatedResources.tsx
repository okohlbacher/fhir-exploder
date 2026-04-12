import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Badge, Card, Group, Loader, SimpleGrid, Text, Title } from '@mantine/core';
import { useMedplum } from '@medplum/react-hooks';
import type { Bundle } from '@medplum/fhirtypes';

/** Resource types commonly linked to a Patient via the `patient` or `subject` search param */
const RELATED_TYPES = [
  { type: 'Condition', param: 'patient', icon: '🩺' },
  { type: 'Procedure', param: 'patient', icon: '🔧' },
  { type: 'Observation', param: 'patient', icon: '📊' },
  { type: 'Encounter', param: 'patient', icon: '🏥' },
  { type: 'MedicationStatement', param: 'patient', icon: '💊' },
  { type: 'MedicationRequest', param: 'patient', icon: '📋' },
  { type: 'DiagnosticReport', param: 'patient', icon: '🧪' },
  { type: 'ImagingStudy', param: 'patient', icon: '🖼' },
  { type: 'AllergyIntolerance', param: 'patient', icon: '⚠' },
  { type: 'Immunization', param: 'patient', icon: '💉' },
  { type: 'Consent', param: 'patient', icon: '✍' },
];

interface PatientRelatedResourcesProps {
  patientId: string;
}

/**
 * Shows a grid of related resource type cards for a Patient,
 * each with a count fetched via `?patient=Patient/{id}&_summary=count`.
 * Only non-zero types are shown. Cards are clickable to navigate to the Explorer.
 */
export function PatientRelatedResources({ patientId }: PatientRelatedResourcesProps) {
  const client = useMedplum();
  const navigate = useNavigate();
  const [counts, setCounts] = useState<Record<string, number | 'loading'>>({});

  useEffect(() => {
    let cancelled = false;
    const initial: Record<string, number | 'loading'> = {};
    for (const rt of RELATED_TYPES) initial[rt.type] = 'loading';
    setCounts(initial);

    for (const rt of RELATED_TYPES) {
      const url = `${rt.type}?${rt.param}=Patient/${patientId}&_summary=count&_count=0`;
      client
        .get(client.fhirUrl(url).toString())
        .then((raw) => {
          if (cancelled) return;
          const bundle: Bundle = typeof raw === 'string' ? JSON.parse(raw) : raw;
          setCounts((prev) => ({ ...prev, [rt.type]: bundle.total ?? 0 }));
        })
        .catch(() => {
          if (cancelled) return;
          setCounts((prev) => ({ ...prev, [rt.type]: 0 }));
        });
    }

    return () => { cancelled = true; };
  }, [client, patientId]);

  const populated = useMemo(
    () => RELATED_TYPES.filter((rt) => typeof counts[rt.type] === 'number' && (counts[rt.type] as number) > 0),
    [counts]
  );

  const loading = Object.values(counts).some((c) => c === 'loading');

  if (!loading && populated.length === 0) return null;

  return (
    <div>
      <Title order={5} mb="sm">Related Resources</Title>
      <SimpleGrid cols={{ base: 2, sm: 3, md: 4 }}>
        {loading &&
          populated.length === 0 &&
          RELATED_TYPES.slice(0, 4).map((rt) => (
            <Card key={rt.type} withBorder padding="sm">
              <Group justify="space-between">
                <Text size="sm">{rt.type}</Text>
                <Loader size="xs" />
              </Group>
            </Card>
          ))}
        {populated.map((rt) => (
          <Card
            key={rt.type}
            withBorder
            padding="sm"
            style={{ cursor: 'pointer' }}
            onClick={() =>
              navigate(`/explorer/${rt.type}?${rt.param}=Patient/${patientId}`)
            }
          >
            <Group justify="space-between">
              <Group gap="xs">
                <Text size="sm">{rt.icon}</Text>
                <Text size="sm" fw={500}>{rt.type}</Text>
              </Group>
              <Badge size="sm" variant="light" color="blue">
                {(counts[rt.type] as number).toLocaleString()}
              </Badge>
            </Group>
          </Card>
        ))}
      </SimpleGrid>
    </div>
  );
}
