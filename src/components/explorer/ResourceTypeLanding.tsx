import { Select, Stack, Title, Text } from '@mantine/core';
import { useOutletContext, useNavigate } from 'react-router-dom';
import type { ExplorerOutletContext } from './ExplorerLayout';
import { parseResourceTypes } from '../../fhir/capability';
import { groupByCategory, CATEGORY_ORDER } from '../../utils/fhir-categories';
import { useMemo } from 'react';

/**
 * Landing page for /explorer index.
 * Shows resource type selector and grouped resource type list.
 */
export function ResourceTypeLanding() {
  const { capability } = useOutletContext<ExplorerOutletContext>();
  const navigate = useNavigate();

  const parsedTypes = useMemo(() => parseResourceTypes(capability), [capability]);

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
                  <Text
                    key={t.type}
                    size="sm"
                    c="blue.6"
                    style={{ cursor: 'pointer' }}
                    onClick={() => navigate(`/explorer/${t.type}`)}
                  >
                    {t.type}
                  </Text>
                ))}
              </div>
            </div>
          );
        })}
      </Stack>
    </Stack>
  );
}
