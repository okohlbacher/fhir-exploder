/**
 * ResourceCountsPanel — sortable table of resource types + counts + an
 * inline Progress-bar distribution column.
 *
 * Behavior per UI-SPEC Counts tab:
 *   - Columns: Resource type (linked to /explorer/{type}), Count, Distribution
 *   - Column headers toggle sort on click; aria-sort reflects state
 *   - "Show empty types" Switch toggles includeEmpty on sortCounts
 *   - Per-row rendering:
 *       loading → <Loader size="xs" />
 *       error   → <Badge color="red" variant="light">Error</Badge>
 *       number  → right-aligned bold text + <Progress value={count/max*100} />
 *   - Default sort: count DESC (worst-first mirrors UI-SPEC)
 *   - maxCount = max numeric count across rows (ignores loading/error)
 */
import { useMemo, useState } from 'react';
import {
  Anchor,
  Badge,
  Group,
  Loader,
  Stack,
  Switch,
  Table,
  Text,
  UnstyledButton,
} from '@mantine/core';
import { BarChart } from '@mantine/charts';
import { IconArrowDown, IconArrowUp, IconArrowsSort } from '@tabler/icons-react';
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

  const rows = useMemo(
    () => sortCounts(counts, sortKey, sortDir, includeEmpty),
    [counts, sortKey, sortDir, includeEmpty],
  );

  const maxCount = useMemo(() => {
    let m = 0;
    for (const v of Object.values(counts)) {
      if (typeof v === 'number' && v > m) m = v;
    }
    return m;
  }, [counts]);

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
      <Group justify="space-between">
        <Text size="xs" c="dimmed">
          {rows.length} {rows.length === 1 ? 'row' : 'rows'}
        </Text>
        <Switch
          label="Show empty types"
          checked={includeEmpty}
          onChange={(e) => setIncludeEmpty(e.currentTarget.checked)}
        />
      </Group>

      {/* Bar chart overview of resource counts */}
      {rows.filter((r) => typeof r.count === 'number' && r.count > 0).length > 0 && (
        <BarChart
          h={Math.max(200, rows.filter((r) => typeof r.count === 'number' && r.count > 0).length * 28)}
          data={rows
            .filter((r) => typeof r.count === 'number' && r.count > 0)
            .map((r) => ({ type: r.type, count: r.count as number }))}
          dataKey="type"
          series={[{ name: 'count', color: 'blue.6' }]}
          orientation="vertical"
          gridAxis="x"
          tickLine="x"
          barProps={{ radius: [0, 4, 4, 0] }}
        />
      )}

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
          No resource types to display.
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
