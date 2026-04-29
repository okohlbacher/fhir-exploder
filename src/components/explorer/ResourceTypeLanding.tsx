import { Badge, Group, Loader, Select, Stack, Switch, Title, Text, Tooltip } from '@mantine/core';
import { useLocalStorage } from '@mantine/hooks';
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
 *
 * EXPL-01 (Phase 41): Empty resource types are SHOWN by default. A
 * `<Switch>` labeled "Hide empty resource types" allows the user to filter
 * out zero-count types; state persists across reloads via localStorage key
 * `explorer.hideEmptyResourceTypes.v1`. NOTE: this flips v1.5's prior
 * default (which hid empty types by default).
 */
export function ResourceTypeLanding() {
  const { capability } = useOutletContext<ExplorerOutletContext>();
  const navigate = useNavigate();

  // EXPL-01 / D-04: localStorage-persisted toggle for hiding zero-count types.
  // Inverted polarity vs the Switch UI: `hideEmpty=true` means hide, `false` means show.
  const [hideEmpty, setHideEmpty] = useLocalStorage<boolean>({
    key: 'explorer.hideEmptyResourceTypes.v1',
    defaultValue: false,
    getInitialValueInEffect: false,
  });

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

  // EXPL-01 / D-05: count zero-count types using the same `counts` map
  // already computed above. Used to power the helper subtitle
  // ("Hide empty (N)") and to disable the Switch when no zero-count types
  // exist (D-06).
  const zeroCount = useMemo(
    () => typeNames.filter((t) => counts[t] === 0).length,
    [typeNames, counts],
  );

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
        <Tooltip
          label="No empty types"
          disabled={zeroCount > 0 || !countsReady}
          withArrow
        >
          <Switch
            label={zeroCount > 0 ? `Hide empty (${zeroCount})` : 'Hide empty resource types'}
            checked={hideEmpty}
            onChange={(e) => setHideEmpty(e.currentTarget.checked)}
            disabled={countsReady && zeroCount === 0}
            size="sm"
            aria-label="Hide empty resource types"
          />
        </Tooltip>
      </Group>
      <Stack gap="sm">
        {orderedCategories.map((category) => {
          const types = grouped.get(category)!;

          // EXPL-01 / D-05: when hiding empty AND counts are ready, drop
          // types with count===0. Loading rows always render
          // (typeof !== 'number' → keep).
          const visibleTypes = countsReady && hideEmpty
            ? types.filter((t) => !(typeof counts[t.type] === 'number' && (counts[t.type] as number) === 0))
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
