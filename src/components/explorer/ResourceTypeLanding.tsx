import { Badge, Button, Group, Loader, Select, Stack, Title, Text } from '@mantine/core';
import { IconEye, IconEyeOff } from '@tabler/icons-react';
import { useMedplum } from '@medplum/react-hooks';
import { useOutletContext, useNavigate } from 'react-router-dom';
import type { ExplorerOutletContext } from './ExplorerLayout';
import { parseResourceTypes } from '../../fhir/capability';
import { groupByCategory, CATEGORY_ORDER } from '../../utils/fhir-categories';
import { useResourceCounts } from '../../hooks/useResourceCounts';
import { useMemo, useState } from 'react';

/**
 * Landing page for /explorer index.
 * Shows resource type selector and grouped resource type list.
 * Empty resource types are hidden by default; a toggle reveals them.
 */
export function ResourceTypeLanding() {
  const { capability } = useOutletContext<ExplorerOutletContext>();
  const navigate = useNavigate();
  const [showEmpty, setShowEmpty] = useState(false);

  const client = useMedplum();
  const parsedTypes = useMemo(() => parseResourceTypes(capability), [capability]);
  const typeNames = useMemo(() => parsedTypes.map(t => t.type), [parsedTypes]);
  const counts = useResourceCounts(client, typeNames);

  const typeOptions = useMemo(
    () => parsedTypes.map((t) => t.type).sort((a, b) => a.localeCompare(b)),
    [parsedTypes]
  );

  const grouped = useMemo(() => groupByCategory(parsedTypes), [parsedTypes]);

  // Count how many types are still loading
  const loadingCount = useMemo(
    () => typeNames.filter((t) => counts[t] === 'loading').length,
    [typeNames, counts]
  );
  const countsReady = loadingCount === 0;

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

      <Group justify="space-between" align="center" mt="md">
        <Title order={4}>Available Resource Types</Title>
        {countsReady && (
          <Button
            variant="subtle"
            size="xs"
            leftSection={showEmpty ? <IconEyeOff size={14} /> : <IconEye size={14} />}
            onClick={() => setShowEmpty((v) => !v)}
          >
            {showEmpty ? 'Hide empty' : 'Show empty'}
          </Button>
        )}
      </Group>
      <Stack gap="sm">
        {orderedCategories.map((category) => {
          const types = grouped.get(category)!;

          // Filter types: when hiding empty, only show types with count > 0 or still loading
          const visibleTypes = countsReady && !showEmpty
            ? types.filter((t) => typeof counts[t.type] === 'number' && (counts[t.type] as number) > 0)
            : types;

          // Skip entire category if no visible types
          if (visibleTypes.length === 0) return null;

          return (
            <div key={category}>
              <Text fw={600} size="sm" c="dimmed" mb="xs">{category}</Text>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
                {visibleTypes.map((t) => (
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
