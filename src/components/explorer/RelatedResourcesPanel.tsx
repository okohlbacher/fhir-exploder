import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Badge, Card, Group, Loader, SimpleGrid, Text, Title } from '@mantine/core';
import { useMedplum } from '@medplum/react-hooks';
import type { Bundle } from '@medplum/fhirtypes';
import type { ReverseReferenceEntry } from '../../utils/reverseReferenceCatalog';

export interface RelatedResourcesPanelProps {
  title: string;
  entries: readonly ReverseReferenceEntry[];
  refValue: string;
  onCardNavigate: (entry: ReverseReferenceEntry) => string;
}

/**
 * Shared render component for reverse-reference / related-reference panels (D-04).
 *
 * Owns: parallel _summary=count fetch, in-flight skeleton, populated grid, click-navigate.
 * Knows nothing about Patient vs non-Patient — that is the wrapper's job (D-05 / D-06).
 *
 * Mirrors PatientRelatedResources.tsx render path byte-identical (UI-SPEC §"Card Anatomy").
 */
export function RelatedResourcesPanel({
  title,
  entries,
  refValue,
  onCardNavigate,
}: RelatedResourcesPanelProps) {
  const client = useMedplum();
  const navigate = useNavigate();
  const [counts, setCounts] = useState<Record<string, number | 'loading'>>({});

  useEffect(() => {
    let cancelled = false;
    const initial: Record<string, number | 'loading'> = {};
    for (const e of entries) initial[e.type] = 'loading';
    setCounts(initial);

    for (const e of entries) {
      const url = `${e.type}?${e.param}=${refValue}&_summary=count&_count=0`;
      client
        .get(client.fhirUrl(url).toString())
        .then((raw) => {
          if (cancelled) return;
          const bundle: Bundle = typeof raw === 'string' ? JSON.parse(raw) : raw;
          setCounts((prev) => ({ ...prev, [e.type]: bundle.total ?? 0 }));
        })
        .catch(() => {
          if (cancelled) return;
          setCounts((prev) => ({ ...prev, [e.type]: 0 }));
        });
    }

    return () => { cancelled = true; };
  }, [client, refValue, entries]);

  const populated = useMemo(
    () => entries.filter((e) => typeof counts[e.type] === 'number' && (counts[e.type] as number) > 0),
    [counts, entries],
  );

  const loading = Object.values(counts).some((c) => c === 'loading');

  if (!loading && populated.length === 0) return null;

  return (
    <div>
      <Title order={5} mb="sm">{title}</Title>
      <SimpleGrid cols={{ base: 2, sm: 3, md: 4 }}>
        {loading &&
          populated.length === 0 &&
          entries.slice(0, 4).map((e) => (
            <Card key={e.type} withBorder padding="sm">
              <Group justify="space-between">
                <Text size="sm">{e.type}</Text>
                <Loader size="xs" />
              </Group>
            </Card>
          ))}
        {populated.map((e) => (
          <Card
            key={e.type}
            withBorder
            padding="sm"
            style={{ cursor: 'pointer' }}
            onClick={() => navigate(onCardNavigate(e))}
          >
            <Group justify="space-between">
              <Group gap="xs">
                {e.icon && <Text size="sm">{e.icon}</Text>}
                <Text size="sm" fw={500}>{e.type}</Text>
              </Group>
              <Badge size="sm" variant="light" color="blue">
                {(counts[e.type] as number).toLocaleString()}
              </Badge>
            </Group>
          </Card>
        ))}
      </SimpleGrid>
    </div>
  );
}
