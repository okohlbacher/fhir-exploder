/**
 * ResourceCountsPanel — sortable, filterable table of resource types + counts
 * with inline Progress-bar distribution.
 *
 * Default: sorted by count DESC (most frequent on top), empty types hidden.
 */
import { useMemo, useState } from 'react';
import {
  Anchor,
  Badge,
  Group,
  Loader,
  Progress,
  Stack,
  Switch,
  Table,
  Text,
  TextInput,
  UnstyledButton,
} from '@mantine/core';
import { IconArrowDown, IconArrowUp, IconArrowsSort, IconSearch } from '@tabler/icons-react';
import { Link } from 'react-router-dom';
import type { CountValue } from '../../quality/types';
import { sortCounts } from '../../quality/counts';

type SortKey = 'name' | 'count';
type SortDir = 'asc' | 'desc';

interface ResourceCountsPanelProps {
  counts: Record<string, CountValue>;
}

export function ResourceCountsPanel({ counts }: ResourceCountsPanelProps) {
  const [sortKey, setSortKey] = useState<SortKey>('count');
  const [sortDir, setSortDir] = useState<SortDir>('desc');
  const [includeEmpty, setIncludeEmpty] = useState(false);
  const [filter, setFilter] = useState('');

  const rows = useMemo(() => {
    let sorted = sortCounts(counts, sortKey, sortDir, includeEmpty);

    // When hiding empty, also hide loading rows (they clutter the view
    // while counts are being fetched)
    if (!includeEmpty) {
      sorted = sorted.filter(
        (r) => typeof r.count === 'number' && r.count > 0
      );
    }

    // Apply text filter
    if (filter.trim()) {
      const lc = filter.toLowerCase();
      sorted = sorted.filter((r) => r.type.toLowerCase().includes(lc));
    }

    return sorted;
  }, [counts, sortKey, sortDir, includeEmpty, filter]);

  const maxCount = useMemo(() => {
    let m = 0;
    for (const v of Object.values(counts)) {
      if (typeof v === 'number' && v > m) m = v;
    }
    return m;
  }, [counts]);

  const totalNonEmpty = useMemo(
    () => Object.values(counts).filter((v) => typeof v === 'number' && v > 0).length,
    [counts]
  );

  function toggleSort(key: SortKey) {
    if (sortKey === key) {
      setSortDir((d) => (d === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortKey(key);
      setSortDir(key === 'count' ? 'desc' : 'asc');
    }
  }

  const ariaSortFor = (key: SortKey): 'ascending' | 'descending' | 'none' =>
    sortKey === key ? (sortDir === 'asc' ? 'ascending' : 'descending') : 'none';

  return (
    <Stack gap="md">
      <Group justify="space-between" wrap="wrap">
        <TextInput
          placeholder="Filter resource types..."
          leftSection={<IconSearch size={14} />}
          value={filter}
          onChange={(e) => setFilter(e.currentTarget.value)}
          size="sm"
          style={{ minWidth: 250 }}
        />
        <Group gap="md">
          <Text size="xs" c="dimmed">
            {rows.length} of {totalNonEmpty} types with data
          </Text>
          <Switch
            label="Show empty types"
            checked={includeEmpty}
            onChange={(e) => setIncludeEmpty(e.currentTarget.checked)}
          />
        </Group>
      </Group>

      <Table striped highlightOnHover>
        <Table.Thead>
          <Table.Tr>
            <Table.Th aria-sort={ariaSortFor('name')}>
              <SortHeader
                label="Resource type"
                active={sortKey === 'name'}
                dir={sortDir}
                onClick={() => toggleSort('name')}
              />
            </Table.Th>
            <Table.Th aria-sort={ariaSortFor('count')} style={{ textAlign: 'right' }}>
              <SortHeader
                label="Count"
                active={sortKey === 'count'}
                dir={sortDir}
                onClick={() => toggleSort('count')}
              />
            </Table.Th>
            <Table.Th>Distribution</Table.Th>
          </Table.Tr>
        </Table.Thead>
        <Table.Tbody>
          {rows.map((row) => {
            const pct =
              typeof row.count === 'number' && maxCount > 0
                ? (row.count / maxCount) * 100
                : 0;
            return (
              <Table.Tr key={row.type}>
                <Table.Td>
                  <Anchor component={Link} to={`/explorer/${row.type}`} c="blue.6">
                    {row.type}
                  </Anchor>
                </Table.Td>
                <Table.Td style={{ textAlign: 'right' }}>
                  {row.count === 'loading' ? (
                    <Loader size="xs" />
                  ) : row.count === 'error' ? (
                    <Badge color="red" variant="light" size="sm">
                      Error
                    </Badge>
                  ) : (
                    <Text fw={600} ta="right">
                      {row.count.toLocaleString()}
                    </Text>
                  )}
                </Table.Td>
                <Table.Td>
                  {typeof row.count === 'number' && maxCount > 0 ? (
                    <Progress
                      value={pct}
                      color="blue.6"
                      style={{ maxWidth: 240 }}
                      aria-label={`${Math.round(pct)}% of max`}
                    />
                  ) : null}
                </Table.Td>
              </Table.Tr>
            );
          })}
        </Table.Tbody>
      </Table>

      {rows.length === 0 && (
        <Text size="sm" c="dimmed" ta="center" py="xl">
          {filter ? `No resource types matching "${filter}".` : 'No resource types to display.'}
        </Text>
      )}
    </Stack>
  );
}

interface SortHeaderProps {
  label: string;
  active: boolean;
  dir: SortDir;
  onClick: () => void;
}

function SortHeader({ label, active, dir, onClick }: SortHeaderProps) {
  const Icon = !active ? IconArrowsSort : dir === 'asc' ? IconArrowUp : IconArrowDown;
  return (
    <UnstyledButton onClick={onClick} style={{ width: '100%', textAlign: 'inherit' }}>
      <Group gap={4} wrap="nowrap" justify="inherit">
        <Text size="sm" fw={600}>
          {label}
        </Text>
        <Icon size={14} stroke={1.5} />
      </Group>
    </UnstyledButton>
  );
}
