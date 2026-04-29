/**
 * CodingCoveragePanel — Coding Coverage tab for /quality (Plan 05-04).
 *
 * Sortable per-type table with a stacked 3-segment Progress bar
 * (blue/orange/red for systemCode/textOnly/empty per 05-UI-SPEC). Each
 * row links to `/quality/coding/:type` (drill-down).
 *
 * Prop signature locked by Plan 05-02:
 *   { types: string[]; client: MedplumClient; sampleSize: number }
 *
 * Default sort: systemCode ASC (worst-first per 05-UI-SPEC).
 */
import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  Alert,
  Anchor,
  Badge,
  Box,
  Group,
  Progress,
  Skeleton,
  Stack,
  Table,
  Text,
} from '@mantine/core';
import type { MedplumClient } from '@medplum/core';

import { useCodingCoverage } from '../../hooks/useCodingCoverage';
import type { PerTypeCoverageReport, PerTypeReport } from '../../quality/types';
import { SortableTh } from './SortableTh';

export interface CodingCoveragePanelProps {
  types: string[];
  client: MedplumClient;
  sampleSize: number;
  patientIds?: string[];
}

type SortKey = 'type' | 'systemCode' | 'textOnly' | 'empty';
type SortDir = 'asc' | 'desc';

interface Row {
  type: string;
  state: PerTypeReport<PerTypeCoverageReport>;
  systemPct: number | null;
  textPct: number | null;
  emptyPct: number | null;
}

function pct(numerator: number, denominator: number): number {
  if (denominator <= 0) return 0;
  return Math.round((numerator / denominator) * 100);
}

// Exported for unit tests (compareRows.test.tsx — QUAL-01 regression suite).
export function toRow(type: string, state: PerTypeReport<PerTypeCoverageReport>): Row {
  if (state === 'loading' || state === 'error') {
    return { type, state, systemPct: null, textPct: null, emptyPct: null };
  }
  if (state.totalCodedFields === 0) {
    return { type, state, systemPct: null, textPct: null, emptyPct: null };
  }
  return {
    type,
    state,
    systemPct: pct(state.systemCode, state.totalCodedFields),
    textPct: pct(state.textOnly, state.totalCodedFields),
    emptyPct: pct(state.empty, state.totalCodedFields),
  };
}

// Exported for unit tests (compareRows.test.tsx — QUAL-01 regression suite).
export function compareRows(a: Row, b: Row, by: SortKey, dir: SortDir): number {
  const aSettled = a.state !== 'loading' && a.state !== 'error';
  const bSettled = b.state !== 'loading' && b.state !== 'error';
  if (aSettled !== bSettled) return aSettled ? -1 : 1;

  // QUAL-01 (D-08/D-09): N/A rows (totalCodedFields === 0 → all pcts null)
  // ALWAYS sort to the end regardless of dir. Mirrors CompletenessPanel —
  // single shared idiom across panels. Replaces the prior dir-independent
  // ±1 trick (which was correct-by-accident under DESC); now the regression
  // test in Task 4 locks both ASC and DESC behavior.
  const aIsNA = a.systemPct === null && a.textPct === null && a.emptyPct === null;
  const bIsNA = b.systemPct === null && b.textPct === null && b.emptyPct === null;
  if (aIsNA !== bIsNA) return aIsNA ? 1 : -1;
  if (aIsNA && bIsNA) return a.type.localeCompare(b.type);

  const sign = dir === 'asc' ? 1 : -1;
  if (by === 'type') {
    return sign * a.type.localeCompare(b.type);
  }
  const valA = by === 'systemCode' ? a.systemPct : by === 'textOnly' ? a.textPct : a.emptyPct;
  const valB = by === 'systemCode' ? b.systemPct : by === 'textOnly' ? b.textPct : b.emptyPct;
  // Both non-null after the isNA guard above.
  return sign * ((valA as number) - (valB as number));
}

export function CodingCoveragePanel({ types, client, sampleSize, patientIds }: CodingCoveragePanelProps) {
  const reports = useCodingCoverage(client, types, sampleSize, patientIds);

  const [sortKey, setSortKey] = useState<SortKey>('systemCode');
  const [sortDir, setSortDir] = useState<SortDir>('asc');

  const rows = useMemo(() => {
    const built = types.map((t) => toRow(t, reports[t] ?? 'loading'));
    built.sort((a, b) => compareRows(a, b, sortKey, sortDir));
    return built;
  }, [types, reports, sortKey, sortDir]);

  const toggleSort = (key: SortKey) => {
    if (sortKey !== key) {
      setSortKey(key);
      setSortDir('asc');
      return;
    }
    setSortDir(sortDir === 'asc' ? 'desc' : 'asc');
  };

  return (
    <Stack gap="md">
      <Alert color="blue" variant="light">
        Completeness and coverage are estimated from a sample of the first {sampleSize}{' '}
        resources per type. Full scans are not run to keep the dashboard responsive on large
        servers.
      </Alert>

      <Group gap="md" aria-label="Coverage buckets legend">
        <Group gap="xs">
          <Box w={12} h={12} bg="blue.6" style={{ borderRadius: 2 }} />
          <Text size="sm">system+code</Text>
        </Group>
        <Group gap="xs">
          <Box w={12} h={12} bg="orange.6" style={{ borderRadius: 2 }} />
          <Text size="sm">text-only</Text>
        </Group>
        <Group gap="xs">
          <Box w={12} h={12} bg="red.6" style={{ borderRadius: 2 }} />
          <Text size="sm">empty</Text>
        </Group>
      </Group>

      <Table striped highlightOnHover>
        <Table.Thead>
          <Table.Tr>
            <SortableTh
              active={sortKey === 'type'}
              dir={sortDir}
              onClick={() => toggleSort('type')}
            >
              Resource type
            </SortableTh>
            <Table.Th>Coverage</Table.Th>
            <SortableTh
              active={sortKey === 'systemCode'}
              dir={sortDir}
              onClick={() => toggleSort('systemCode')}
            >
              system+code
            </SortableTh>
            <SortableTh
              active={sortKey === 'textOnly'}
              dir={sortDir}
              onClick={() => toggleSort('textOnly')}
            >
              text-only
            </SortableTh>
            <SortableTh
              active={sortKey === 'empty'}
              dir={sortDir}
              onClick={() => toggleSort('empty')}
            >
              empty
            </SortableTh>
            <Table.Th>CC field count</Table.Th>
          </Table.Tr>
        </Table.Thead>
        <Table.Tbody>
          {rows.map((row) => (
            <CoverageRow key={row.type} row={row} />
          ))}
        </Table.Tbody>
      </Table>
    </Stack>
  );
}

function CoverageRow({ row }: { row: Row }) {
  const { type, state } = row;

  if (state === 'loading') {
    return (
      <Table.Tr>
        <Table.Td>
          <Anchor
            component={Link}
            to={`/quality/coding/${type}`}
            c="blue.6"
          >
            {type}
          </Anchor>
        </Table.Td>
        <Table.Td>
          <Skeleton height={8} width={240} />
        </Table.Td>
        <Table.Td colSpan={4}>
          <Skeleton height={12} width={160} />
        </Table.Td>
      </Table.Tr>
    );
  }

  if (state === 'error') {
    return (
      <Table.Tr>
        <Table.Td>
          <Anchor
            component={Link}
            to={`/quality/coding/${type}`}
            c="blue.6"
          >
            {type}
          </Anchor>
        </Table.Td>
        <Table.Td colSpan={5}>
          <Badge color="red" variant="light" size="sm">
            Error
          </Badge>
        </Table.Td>
      </Table.Tr>
    );
  }

  if (state.totalCodedFields === 0) {
    return (
      <Table.Tr>
        <Table.Td>
          <Anchor
            component={Link}
            to={`/quality/coding/${type}`}
            c="blue.6"
          >
            {type}
          </Anchor>
        </Table.Td>
        <Table.Td>
          <Text size="sm" c="dimmed">
            —
          </Text>
        </Table.Td>
        <Table.Td colSpan={3}>
          <Text size="xs" c="dimmed">
            no CodeableConcept fields
          </Text>
        </Table.Td>
        <Table.Td>
          <Text size="sm" c="dimmed">
            0 CC fields
          </Text>
        </Table.Td>
      </Table.Tr>
    );
  }

  const sys = pct(state.systemCode, state.totalCodedFields);
  const txt = pct(state.textOnly, state.totalCodedFields);
  const emp = pct(state.empty, state.totalCodedFields);

  return (
    <Table.Tr>
      <Table.Td>
        <Anchor component={Link} to={`/quality/coding/${type}`} c="blue.6">
          {type}
        </Anchor>
      </Table.Td>
      <Table.Td>
        <Progress.Root size="md" style={{ maxWidth: 240 }}>
          <Progress.Section value={sys} color="blue.6" />
          <Progress.Section value={txt} color="orange.6" />
          <Progress.Section value={emp} color="red.6" />
        </Progress.Root>
      </Table.Td>
      <Table.Td>
        <Text c="blue.6" size="sm">
          {sys}%
        </Text>
      </Table.Td>
      <Table.Td>
        <Text c="orange.6" size="sm">
          {txt}%
        </Text>
      </Table.Td>
      <Table.Td>
        <Text c="red.6" size="sm">
          {emp}%
        </Text>
      </Table.Td>
      <Table.Td>
        <Text size="sm" c="dimmed">
          {state.totalCodedFields} CC fields
        </Text>
      </Table.Td>
    </Table.Tr>
  );
}
