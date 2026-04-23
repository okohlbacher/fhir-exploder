/**
 * ResourceTypeRail — 240-px navigation rail shown alongside any `/explorer/*`
 * route (Phase 30 layout redesign Step 5). Displays a grouped-by-category
 * list of all FHIR resource types from the connected server's
 * CapabilityStatement, with a search filter at the top and an at-a-glance
 * count badge per type.
 *
 * Reuses the existing `groupByCategory` + `CATEGORY_ORDER` machinery from
 * `utils/fhir-categories.ts` and `useResourceCounts` so the rail stays in
 * sync with the ResourceTypeLanding page on first-mount cache. The active
 * type is highlighted with a 2-px indigo left rail (matching the redesigned
 * sidebar rows).
 */
import { useMemo, useState } from 'react';
import { useMatch, useNavigate } from 'react-router-dom';
import { Badge, Box, Group, ScrollArea, Stack, Text, TextInput, UnstyledButton } from '@mantine/core';
import { IconSearch } from '@tabler/icons-react';
import type { CapabilityStatement } from '@medplum/fhirtypes';
import type { MedplumClient } from '@medplum/core';
import { parseResourceTypes } from '../../fhir/capability';
import { groupByCategory, CATEGORY_ORDER } from '../../utils/fhir-categories';
import { useResourceCounts } from '../../hooks/useResourceCounts';

export interface ResourceTypeRailProps {
  capability: CapabilityStatement;
  client: MedplumClient;
}

export function ResourceTypeRail({ capability, client }: ResourceTypeRailProps) {
  const navigate = useNavigate();
  const [filter, setFilter] = useState('');

  const parsedTypes = useMemo(() => parseResourceTypes(capability), [capability]);
  const typeNames = useMemo(() => parsedTypes.map((t) => t.type), [parsedTypes]);
  const counts = useResourceCounts(client, typeNames);
  const grouped = useMemo(() => groupByCategory(parsedTypes), [parsedTypes]);

  const orderedCategories = useMemo(() => {
    const ordered = CATEGORY_ORDER.filter((cat) => grouped.has(cat));
    for (const cat of grouped.keys()) {
      if (!ordered.includes(cat)) ordered.push(cat);
    }
    return ordered;
  }, [grouped]);

  const lcFilter = filter.trim().toLowerCase();

  return (
    <Box
      style={{
        width: 240,
        flexShrink: 0,
        borderRight: '1px solid var(--mantine-color-gray-3)',
        background: 'var(--panel-2, var(--mantine-color-gray-0))',
        display: 'flex',
        flexDirection: 'column',
      }}
    >
      <Box p="sm" style={{ borderBottom: '1px solid var(--mantine-color-gray-3)' }}>
        <TextInput
          size="xs"
          placeholder="Filter types…"
          value={filter}
          onChange={(e) => setFilter(e.currentTarget.value)}
          leftSection={<IconSearch size={12} />}
        />
      </Box>
      <ScrollArea style={{ flex: 1 }}>
        <Stack gap={0} p={4}>
          {orderedCategories.map((category) => {
            const types = grouped.get(category)!;
            const visible = lcFilter
              ? types.filter((t) => t.type.toLowerCase().includes(lcFilter))
              : types;
            if (visible.length === 0) return null;
            return (
              <Box key={category} mb={6}>
                <Text
                  size="xs"
                  fw={600}
                  tt="uppercase"
                  c="dimmed"
                  lts="0.5px"
                  px="xs"
                  py={4}
                >
                  {category}
                </Text>
                {visible.map((t) => (
                  <ResourceTypeRow
                    key={t.type}
                    type={t.type}
                    count={counts[t.type]}
                    onClick={() => navigate(`/explorer/${t.type}`)}
                  />
                ))}
              </Box>
            );
          })}
        </Stack>
      </ScrollArea>
    </Box>
  );
}

interface RowProps {
  type: string;
  count: number | 'loading' | 'error' | undefined;
  onClick: () => void;
}

function ResourceTypeRow({ type, count, onClick }: RowProps) {
  // Matches /explorer/:resourceType (and its descendants e.g. /explorer/X/:id).
  const match = useMatch({ path: `/explorer/${type}`, end: false });
  const active = !!match;
  return (
    <UnstyledButton
      onClick={onClick}
      style={{
        display: 'block',
        width: '100%',
        borderLeft: active
          ? '2px solid var(--mantine-color-indigo-6)'
          : '2px solid transparent',
        padding: '4px 10px',
        background: active ? 'var(--panel, #fff)' : 'transparent',
      }}
    >
      <Group justify="space-between" wrap="nowrap" gap="xs">
        <Text
          size="xs"
          fw={active ? 600 : 400}
          style={{
            fontFamily:
              'var(--font-mono, var(--mantine-font-family-monospace))',
          }}
          truncate
        >
          {type}
        </Text>
        {typeof count === 'number' && (
          <Text
            size="xs"
            c="dimmed"
            style={{
              fontFamily:
                'var(--font-mono, var(--mantine-font-family-monospace))',
              fontVariantNumeric: 'tabular-nums',
              flexShrink: 0,
            }}
          >
            {count.toLocaleString()}
          </Text>
        )}
        {count === 'loading' && (
          <Text size="xs" c="dimmed" style={{ flexShrink: 0 }}>
            …
          </Text>
        )}
        {count === 'error' && (
          <Badge color="red" size="xs" variant="light" style={{ flexShrink: 0 }}>
            !
          </Badge>
        )}
      </Group>
    </UnstyledButton>
  );
}
