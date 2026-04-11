import { Badge, Group, Loader, Select, Stack, Title, Text } from '@mantine/core';
import { useMedplum } from '@medplum/react-hooks';
import { useOutletContext, useNavigate } from 'react-router-dom';
import type { ExplorerOutletContext } from './ExplorerLayout';
import { parseResourceTypes } from '../../fhir/capability';
import { groupByCategory, CATEGORY_ORDER } from '../../utils/fhir-categories';
import { useResourceCounts } from '../../hooks/useResourceCounts';
import { useMemo } from 'react';

/**
 * Landing page for /explorer index.
 * Shows resource type selector and grouped resource type list.
 */
export function ResourceTypeLanding() {
  const { capability } = useOutletContext<ExplorerOutletContext>();
  const navigate = useNavigate();

  const client = useMedplum();
  const parsedTypes = useMemo(() => parseResourceTypes(capability), [capability]);
  const typeNames = useMemo(() => parsedTypes.map(t => t.type), [parsedTypes]);
  const counts = useResourceCounts(client, typeNames);

  const typeOptions = useMemo(
    () => parsedTypes.map((t) => t.type).sort((a, b) => a.localeCompare(b)),
    [parsedTypes]
  );

  const grouped = useMemo(() => groupByCategory(parsedTypes), [parsedTypes]);

  const orderedCategories = useMemo(() => {
    const ordered = CATEGORY_ORDER.filter((cat) => grouped.has(cat));
    for (const cat of grouped.keys()) {
      if (!ordered.includes(cat)) {
        ordered.push(cat);
      }
    }
    return ordered;
  }, [grouped]);

  return (
    <Stack gap="lg" p="xl">
      <Title order={2}>Resource Explorer</Title>
      <Text c="dimmed">
        Use the filters above to search, or click Search with no filters to see all resources.
      </Text>

      <Select
        data={typeOptions}
        onChange={(value) => {
          if (value) {
            navigate(`/explorer/${value}`);
          }
        }}
        placeholder="Select resource type..."
        searchable
        size="md"
        label="Resource Type"
      />

      <Title order={4} mt="md">Available Resource Types</Title>
      <Stack gap="sm">
        {orderedCategories.map((category) => {
          const types = grouped.get(category)!;
          return (
            <div key={category}>
              <Text fw={600} size="sm" c="dimmed" mb="xs">{category}</Text>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
                {types.map((t) => (
                  <Group
                    key={t.type}
                    gap="xs"
                    wrap="nowrap"
                    style={{ cursor: 'pointer' }}
                    onClick={() => navigate(`/explorer/${t.type}`)}
                  >
                    <Text size="sm" c="blue.6">{t.type}</Text>
                    {counts[t.type] === 'loading' && <Loader size="xs" />}
                    {counts[t.type] === 'error' && (
                      <Badge color="red" size="sm" variant="light">Error</Badge>
                    )}
                    {typeof counts[t.type] === 'number' && (
                      <Badge color="blue" size="sm" variant="light">
                        {(counts[t.type] as number).toLocaleString()}
                      </Badge>
                    )}
                  </Group>
                ))}
              </div>
            </div>
          );
        })}
      </Stack>
    </Stack>
  );
}
