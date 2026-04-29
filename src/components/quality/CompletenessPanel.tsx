/**
 * CompletenessPanel — Completeness tab for /quality (Plan 05-03).
 *
 * Sortable per-type table (default sort: completeness ASC / worst-first
 * per 05-UI-SPEC). Each row shows a RingProgress with the populated/total
 * percentage, the raw populated/total counts, the sample size, and the
 * MII profile name (or "Structural (min>=1)" fallback for types without
 * a bundled profile).
 *
 * Clicking a row navigates to /quality/completeness/:type (drill-down).
 *
 * Prop signature locked by Plan 05-02:
 *   { types: string[]; client: MedplumClient; sampleSize: number }
 */
import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  Alert,
  Anchor,
  Badge,
  RingProgress,
  Skeleton,
  Stack,
  Table,
  Text,
} from '@mantine/core';
import type { MedplumClient } from '@medplum/core';

import { useCompletenessReport } from '../../hooks/useCompletenessReport';
import { getProfileForType } from '../../quality/profiles';
import type { PerTypeCompletenessReport, PerTypeReport } from '../../quality/types';
import { SortableTh } from './SortableTh';

export interface CompletenessPanelProps {
  types: string[];
  client: MedplumClient;
  sampleSize: number;
  patientIds?: string[];
}

type SortKey = 'type' | 'completeness';
type SortDir = 'asc' | 'desc';

interface Row {
  type: string;
  state: PerTypeReport<PerTypeCompletenessReport>;
  pct: number | null;
}

// Exported for unit tests (compareRows.test.tsx — QUAL-01 regression suite).
export function toRow(type: string, state: PerTypeReport<PerTypeCompletenessReport>): Row {
  if (state === 'loading' || state === 'error') {
    return { type, state, pct: null };
  }
  const pct = state.total > 0 ? (state.populated / state.total) * 100 : null;
  return { type, state, pct };
}

// Exported for unit tests (compareRows.test.tsx — QUAL-01 regression suite).
export function compareRows(a: Row, b: Row, by: SortKey, dir: SortDir): number {
  // Non-settled rows (loading/error) always sort to the end regardless of dir.
  const aSettled = a.state !== 'loading' && a.state !== 'error';
  const bSettled = b.state !== 'loading' && b.state !== 'error';
  if (aSettled !== bSettled) return aSettled ? -1 : 1;

  // QUAL-01 (D-07/D-08): N/A rows (pct === null — types with total === 0)
  // ALWAYS sort to the end, regardless of sort direction. Mirrors the
  // aSettled pattern above. Treats null as "not applicable", not
  // "worst possible".
  const aIsNA = a.pct === null;
  const bIsNA = b.pct === null;
  if (aIsNA !== bIsNA) return aIsNA ? 1 : -1;
  if (aIsNA && bIsNA) return a.type.localeCompare(b.type); // stable tiebreak

  const sign = dir === 'asc' ? 1 : -1;
  if (by === 'type') {
    return sign * a.type.localeCompare(b.type);
  }
  // Both pcts are non-null at this point.
  return sign * ((a.pct as number) - (b.pct as number));
}

export function CompletenessPanel({ types, client, sampleSize, patientIds }: CompletenessPanelProps) {
  const reports = useCompletenessReport(client, types, sampleSize, patientIds);

  const [sortKey, setSortKey] = useState<SortKey>('completeness');
  const [sortDir, setSortDir] = useState<SortDir>('asc');

  const rows = useMemo(() => {
    const built = types.map((t) => toRow(t, reports[t] ?? 'loading'));
    built.sort((a, b) => compareRows(a, b, sortKey, sortDir));
    return built;
  }, [types, reports, sortKey, sortDir]);

  const toggleSort = (key: SortKey) => {
    if (sortKey !== key) {
      setSortKey(key);
      setSortDir(key === 'type' ? 'asc' : 'asc');
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
            <SortableTh
              active={sortKey === 'completeness'}
              dir={sortDir}
              onClick={() => toggleSort('completeness')}
            >
              Completeness
            </SortableTh>
            <Table.Th>Populated / total</Table.Th>
            <Table.Th>Sample</Table.Th>
            <Table.Th>Profile</Table.Th>
          </Table.Tr>
        </Table.Thead>
        <Table.Tbody>
          {rows.map((row) => (
            <CompletenessRow key={row.type} row={row} />
          ))}
        </Table.Tbody>
      </Table>
    </Stack>
  );
}

function CompletenessRow({ row }: { row: Row }) {
  const { type, state } = row;
  const profile = getProfileForType(type);
  const profileLabel = profile ? profile.name ?? profile.url ?? 'MII' : null;

  if (state === 'loading') {
    return (
      <Table.Tr>
        <Table.Td>
          <Anchor
            component={Link}
            to={`/quality/completeness/${type}`}
            c="blue.6"
          >
            {type}
          </Anchor>
        </Table.Td>
        <Table.Td>
          <Skeleton height={48} width={48} circle />
        </Table.Td>
        <Table.Td>
          <Skeleton height={12} width={72} />
        </Table.Td>
        <Table.Td>
          <Skeleton height={12} width={60} />
        </Table.Td>
        <Table.Td>
          <Skeleton height={12} width={90} />
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
            to={`/quality/completeness/${type}`}
            c="blue.6"
          >
            {type}
          </Anchor>
        </Table.Td>
        <Table.Td colSpan={4}>
          <Badge color="red" variant="light">
            Error
          </Badge>
        </Table.Td>
      </Table.Tr>
    );
  }

  // QUAL-01 (D-10): N/A rows (total === 0) render an em-dash in the
  // Completeness column instead of a misleading "0%" RingProgress. The
  // compareRows pair above guarantees these rows have already sunk to the
  // bottom of the table regardless of sort direction.
  if (state.total === 0) {
    return (
      <Table.Tr>
        <Table.Td>
          <Anchor
            component={Link}
            to={`/quality/completeness/${type}`}
            c="blue.6"
          >
            {type}
          </Anchor>
        </Table.Td>
        <Table.Td>
          <Text c="dimmed" size="sm">—</Text>
        </Table.Td>
        <Table.Td>
          <Text c="dimmed" size="sm">
            {state.populated} / {state.total}
          </Text>
        </Table.Td>
        <Table.Td>
          <Text c="dimmed" size="sm">
            {state.sampleSize}
            {state.totalForType != null ? ` of ${state.totalForType}` : ''}
          </Text>
        </Table.Td>
        <Table.Td>
          {profileLabel ? (
            <Text size="sm" c="dimmed">{profileLabel}</Text>
          ) : (
            <Text c="dimmed" size="sm">
              Structural (min&gt;=1)
            </Text>
          )}
        </Table.Td>
      </Table.Tr>
    );
  }

  const pct = Math.round((state.populated / state.total) * 100);
  return (
    <Table.Tr>
      <Table.Td>
        <Anchor
          component={Link}
          to={`/quality/completeness/${type}`}
          c="blue.6"
        >
          {type}
        </Anchor>
      </Table.Td>
      <Table.Td>
        <RingProgress
          size={48}
          thickness={4}
          sections={[{ value: pct, color: 'blue.6' }]}
          label={
            <Text size="xs" ta="center">
              {pct}%
            </Text>
          }
        />
      </Table.Td>
      <Table.Td>
        <Text c="dimmed" size="sm">
          {state.populated} / {state.total}
        </Text>
      </Table.Td>
      <Table.Td>
        <Text c="dimmed" size="sm">
          {state.sampleSize}
          {state.totalForType != null ? ` of ${state.totalForType}` : ''}
        </Text>
      </Table.Td>
      <Table.Td>
        {profileLabel ? (
          <Text size="sm">{profileLabel}</Text>
        ) : (
          <Text c="dimmed" size="sm">
            Structural (min&gt;=1)
          </Text>
        )}
      </Table.Td>
    </Table.Tr>
  );
}
