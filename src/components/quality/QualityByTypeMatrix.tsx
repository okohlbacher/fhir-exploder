/**
 * QualityByTypeMatrix — Plan 35-04 (UAT-FU-05).
 *
 * Per-type quality matrix card under /quality?tab=counts. Reads the byType
 * slot from each per-metric Phase 32 context (Completeness, Coverage,
 * Validation, References, Duplicates) plus the validationIssuesByType slot
 * from ValidationContext, and renders an 8-column sortable table:
 *
 *   Resource type | Complete % | Coverage % | Validation % | References % | Dup | Issues | chevron
 *
 * Contracts (locked):
 * - D-17: 7 data columns + 1 chevron column, in that order
 * - D-18: per-cell breach via curried useThresholds().isBreached(metricKey, value);
 *         numeric Text c="red.6" + Progress color="red" on breach
 * - D-19: row-click + chevron-click navigate to
 *         /quality?tab=<firstNonEmpty>&type=<resourceType>;
 *         fall back to /explorer/<resourceType> when ALL metrics empty
 * - D-20: default sort Issues DESC, Resource type ASC tiebreaker
 * - D-21: row inclusion = types with `count === 'loading'` OR (`count > 0`);
 *         empty types omitted
 * - D-22: read-projection only — NO new FHIR fetches
 * - Pitfall P-05: sparse cells render em-dash (—), NEVER 0%
 * - Pitfall P-08: chevron click is navigation only — does NOT auto-fire
 *   validation/reference runs (PHI gate preserved)
 *
 * Phase 32 invariant: subscribes to per-metric hooks directly, NOT to the
 * facade `useQualityMetrics()` — preserves per-tile re-render isolation
 * (EFF-R14-04).
 */
import { useCallback, useMemo, useState } from 'react';
import {
  Button,
  Card,
  Group,
  Progress,
  Skeleton,
  Stack,
  Table,
  Text,
  UnstyledButton,
} from '@mantine/core';
import { IconChevronRight, IconDownload } from '@tabler/icons-react';
import { useNavigate } from 'react-router-dom';
import { useMedplum } from '@medplum/react-hooks';
import {
  useCompletenessRollup,
  useCoverageRollup,
  useValidationRollup,
  useReferencesRollup,
  useDuplicatesRollup,
} from '../../quality/metrics';
import { useThresholds } from '../../hooks/useThresholds';
import type { MetricKey } from '../../quality/thresholds';
import { SortableTh } from './SortableTh';
import type { CountValue } from '../../quality/types';
import { downloadString } from '../../utils/export';

export interface QualityByTypeMatrixProps {
  counts: Record<string, CountValue>;
}

/** QUAL-03: exported so colocated CSV export tests can type-check fixtures. */
export interface MatrixRow {
  type: string;
  countLoading: boolean;
  completeness: number | undefined;
  coverage: number | undefined;
  validation: number | undefined;
  references: number | undefined;
  dup: number | undefined;
  issues: number | undefined;
}

type SortKey =
  | 'type'
  | 'completeness'
  | 'coverage'
  | 'validation'
  | 'references'
  | 'dup'
  | 'issues';
type SortDir = 'asc' | 'desc';

const SUBTITLE_COPY =
  'Per-resource-type rollup. Cells with — indicate metrics not yet measured for this type.';

/** Maps the matrix sort key (and metric column) → first-non-empty heuristic
 * route name (D-19). Order in this array matches column display order. */
const FIRST_NON_EMPTY_ORDER: Array<{
  field: 'completeness' | 'coverage' | 'validation' | 'references' | 'dup';
  route: string;
}> = [
  { field: 'completeness', route: 'completeness' },
  { field: 'coverage', route: 'coverage' },
  { field: 'validation', route: 'validation' },
  { field: 'references', route: 'references' },
  { field: 'dup', route: 'duplicates' },
];

/** QUAL-03: CSV-escape one cell — wrap in quotes if it contains comma, quote,
 * or newline. Mirrors src/utils/export.ts escapeCSV but kept inline so the
 * helper is self-contained for the colocated regression test. */
function csvEscape(value: string): string {
  if (value.includes(',') || value.includes('"') || value.includes('\n')) {
    return `"${value.replace(/"/g, '""')}"`;
  }
  return value;
}

/**
 * QUAL-03: Build CSV body from matrix rows (post-sort, post-filter — D-20).
 *
 * Format invariants (locked by colocated regression test):
 * - Output is prefixed with the UTF-8 BOM character (U+FEFF) so Excel
 *   auto-detects UTF-8 encoding.
 * - Header row matches visible columns verbatim:
 *   `Resource type, Complete %, Coverage %, Validation %, References %, Dup, Issues`.
 * - Sparse cells (`undefined`) render as empty string `""` — never `0` or `0%`
 *   (Pitfall P-05 mirror).
 * - Populated numeric cells render as bare numeric strings (no `%` suffix —
 *   keeps spreadsheet apps happy with numeric coercion).
 * - Loading rows (`countLoading=true`) are SKIPPED — no skeleton placeholders
 *   in the export.
 * - Resource-type cell is CSV-escaped (commas / quotes / newlines).
 *
 * Exported for unit tests in QualityByTypeMatrix.csvExport.test.tsx.
 */
export function buildMatrixCsv(rows: ReadonlyArray<MatrixRow>): string {
  const header = [
    'Resource type',
    'Complete %',
    'Coverage %',
    'Validation %',
    'References %',
    'Dup',
    'Issues',
  ];
  const lines: string[] = [header.join(',')];
  for (const row of rows) {
    if (row.countLoading) continue;
    const cells = [
      csvEscape(row.type),
      row.completeness !== undefined ? String(row.completeness) : '',
      row.coverage !== undefined ? String(row.coverage) : '',
      row.validation !== undefined ? String(row.validation) : '',
      row.references !== undefined ? String(row.references) : '',
      row.dup !== undefined ? String(row.dup) : '',
      row.issues !== undefined ? String(row.issues) : '',
    ];
    lines.push(cells.join(','));
  }
  return '﻿' + lines.join('\n');
}

/**
 * QUAL-03: Build CSV filename — `quality-matrix-{host}-{YYYY-MM-DD}.csv`.
 *
 * - `host` derived from `client.getBaseUrl()` via `new URL(...).host` and
 *   sanitized to filesystem-safe chars: `[^a-z0-9.-]` → `-`, lowercased.
 *   Threat T-41-03-02: filename injection via getBaseUrl is mitigated by this
 *   sanitization. Invalid URLs fall back to `unknown`.
 * - Date is UTC `YYYY-MM-DD` (`toISOString().slice(0, 10)`).
 *
 * Exported for unit tests.
 */
export function buildMatrixCsvFilename(serverUrl: string, now: Date = new Date()): string {
  let host = 'unknown';
  try {
    host = new URL(serverUrl).host;
  } catch {
    host = 'unknown';
  }
  const safeHost = host.toLowerCase().replace(/[^a-z0-9.-]/g, '-');
  const date = now.toISOString().slice(0, 10);
  return `quality-matrix-${safeHost}-${date}.csv`;
}

export function QualityByTypeMatrix({ counts }: QualityByTypeMatrixProps): JSX.Element | null {
  const completeness = useCompletenessRollup();
  const coverage = useCoverageRollup();
  const validation = useValidationRollup();
  const references = useReferencesRollup();
  const duplicates = useDuplicatesRollup();
  const navigate = useNavigate();
  const medplum = useMedplum();

  const [sort, setSort] = useState<{ key: SortKey; dir: SortDir }>({
    key: 'issues',
    dir: 'desc',
  });

  // D-21 + Pitfall P-06: include rows for types with count > 0 OR loading.
  const includedTypes = useMemo(() => {
    return Object.entries(counts)
      .filter(([, c]) => c === 'loading' || (typeof c === 'number' && c > 0))
      .map(([t]) => t);
  }, [counts]);

  const rows = useMemo<MatrixRow[]>(() => {
    return includedTypes.map((type) => ({
      type,
      countLoading: counts[type] === 'loading',
      completeness: completeness.byType[type],
      coverage: coverage.byType[type],
      validation: validation.byType[type],
      references: references.byType[type],
      dup: duplicates.byType[type],
      issues: validation.validationIssuesByType[type],
    }));
  }, [
    includedTypes,
    counts,
    completeness.byType,
    coverage.byType,
    validation.byType,
    validation.validationIssuesByType,
    references.byType,
    duplicates.byType,
  ]);

  const sortedRows = useMemo<MatrixRow[]>(() => {
    const r = [...rows];
    r.sort((a, b) => {
      if (sort.key === 'type') {
        return sort.dir === 'desc'
          ? b.type.localeCompare(a.type)
          : a.type.localeCompare(b.type);
      }
      const av = a[sort.key as keyof MatrixRow];
      const bv = b[sort.key as keyof MatrixRow];
      // Treat undefined as -Infinity for desc / +Infinity for asc — sparse
      // cells sort to bottom regardless of direction.
      const aNum =
        typeof av === 'number' ? av : sort.dir === 'desc' ? -Infinity : Infinity;
      const bNum =
        typeof bv === 'number' ? bv : sort.dir === 'desc' ? -Infinity : Infinity;
      if (aNum === bNum) return a.type.localeCompare(b.type); // tiebreaker
      return sort.dir === 'desc' ? bNum - aNum : aNum - bNum;
    });
    return r;
  }, [rows, sort]);

  const handleRowClick = useCallback(
    (row: MatrixRow) => {
      // D-19: first-non-empty heuristic over (completeness, coverage,
      // validation, references, dup) in display order. Falls back to
      // /explorer/<type> when ALL metrics empty (Pitfall P-08 — navigation
      // only, no auto-fetch).
      for (const { field, route } of FIRST_NON_EMPTY_ORDER) {
        if (row[field] !== undefined) {
          navigate(`/quality?tab=${route}&type=${row.type}`);
          return;
        }
      }
      navigate(`/explorer/${row.type}`);
    },
    [navigate],
  );

  // QUAL-03: build CSV from CURRENT visible/sorted rows (D-20) and trigger
  // browser download. Filename pattern locked by buildMatrixCsvFilename
  // regression test.
  const handleDownloadCsv = useCallback(() => {
    const csv = buildMatrixCsv(sortedRows);
    const filename = buildMatrixCsvFilename(medplum.getBaseUrl());
    downloadString(csv, filename, 'text/csv;charset=utf-8');
  }, [sortedRows, medplum]);

  // Empty matrix → render nothing (consistent with ResourceCountsPanel empty state).
  if (includedTypes.length === 0) {
    return null;
  }

  function toggleSort(key: SortKey) {
    setSort((prev) => {
      if (prev.key === key) {
        return { key, dir: prev.dir === 'asc' ? 'desc' : 'asc' };
      }
      return { key, dir: key === 'type' ? 'asc' : 'desc' };
    });
  }

  return (
    <Card withBorder radius="lg" padding="lg">
      <Stack gap="sm">
        <Group justify="space-between" align="flex-start" wrap="wrap" gap="xs">
          <Stack gap={2}>
            <Text fw={600} size="sm">
              Quality by resource type
            </Text>
            <Text size="xs" c="dimmed">
              {SUBTITLE_COPY}
            </Text>
          </Stack>
          <Button
            variant="subtle"
            size="xs"
            leftSection={<IconDownload size={16} />}
            onClick={handleDownloadCsv}
          >
            Download CSV
          </Button>
        </Group>

        <Table striped highlightOnHover verticalSpacing="xs" horizontalSpacing="md">
          <Table.Thead>
            <Table.Tr>
              <SortableTh
                active={sort.key === 'type'}
                dir={sort.dir}
                onClick={() => toggleSort('type')}
              >
                Resource type
              </SortableTh>
              <SortableTh
                active={sort.key === 'completeness'}
                dir={sort.dir}
                onClick={() => toggleSort('completeness')}
              >
                Complete %
              </SortableTh>
              <SortableTh
                active={sort.key === 'coverage'}
                dir={sort.dir}
                onClick={() => toggleSort('coverage')}
              >
                Coverage %
              </SortableTh>
              <SortableTh
                active={sort.key === 'validation'}
                dir={sort.dir}
                onClick={() => toggleSort('validation')}
              >
                Validation %
              </SortableTh>
              <SortableTh
                active={sort.key === 'references'}
                dir={sort.dir}
                onClick={() => toggleSort('references')}
              >
                References %
              </SortableTh>
              <SortableTh
                active={sort.key === 'dup'}
                dir={sort.dir}
                onClick={() => toggleSort('dup')}
              >
                Dup
              </SortableTh>
              <SortableTh
                active={sort.key === 'issues'}
                dir={sort.dir}
                onClick={() => toggleSort('issues')}
              >
                Issues
              </SortableTh>
              <Table.Th aria-hidden style={{ width: 32 }} />
            </Table.Tr>
          </Table.Thead>
          <Table.Tbody>
            {sortedRows.map((row) => (
              <Table.Tr
                key={row.type}
                style={{ cursor: 'pointer' }}
                onClick={() => handleRowClick(row)}
              >
                <Table.Td>
                  {row.countLoading ? (
                    <Skeleton height={14} width={80} />
                  ) : (
                    <Text size="sm" fw={500}>
                      {row.type}
                    </Text>
                  )}
                </Table.Td>
                <PercentTd
                  metricKey="completeness"
                  value={row.completeness}
                  loading={row.countLoading}
                />
                <PercentTd
                  metricKey="coverage"
                  value={row.coverage}
                  loading={row.countLoading}
                />
                <PercentTd
                  metricKey="validation"
                  value={row.validation}
                  loading={row.countLoading}
                />
                <PercentTd
                  metricKey="references"
                  value={row.references}
                  loading={row.countLoading}
                />
                <PercentTd
                  metricKey="duplicates"
                  value={row.dup}
                  loading={row.countLoading}
                  hideBar
                />
                <Table.Td>
                  {row.countLoading ? (
                    <Skeleton height={14} width={40} />
                  ) : (
                    <IssuesCell
                      count={row.issues}
                      validationPct={row.validation}
                    />
                  )}
                </Table.Td>
                <Table.Td onClick={(e) => e.stopPropagation()}>
                  <UnstyledButton
                    aria-label="Open per-type drill-down"
                    onClick={() => handleRowClick(row)}
                  >
                    <IconChevronRight size={16} />
                  </UnstyledButton>
                </Table.Td>
              </Table.Tr>
            ))}
          </Table.Tbody>
        </Table>
      </Stack>
    </Card>
  );
}

interface PercentTdProps {
  metricKey: MetricKey;
  value: number | undefined;
  loading: boolean;
  /** When true, render only the numeric % (no Progress fill bar). Used for the Dup column. */
  hideBar?: boolean;
}

function PercentTd({ metricKey, value, loading, hideBar }: PercentTdProps) {
  const { getActiveThreshold } = useThresholds();
  if (loading) {
    return (
      <Table.Td>
        <Skeleton height={14} width={40} />
      </Table.Td>
    );
  }
  if (value === undefined) {
    // Pitfall P-05: NEVER render 0% for sparse cells — em-dash only.
    return (
      <Table.Td>
        <Text size="sm" c="dimmed">
          —
        </Text>
      </Table.Td>
    );
  }

  // QUAL-02 (D-12/D-13): 3-stop heat gradient via Mantine theme tokens.
  //   green ≥100%, yellow at threshold..<100%, red below threshold.
  // When threshold is null (metric disabled per Phase 18), fall back to
  // green-when-100, no color otherwise — matches pre-Phase-41 behavior.
  // D-14: numeric Text remains the primary semantic carrier; color is supplementary.
  const threshold = getActiveThreshold(metricKey);
  let bg: string | undefined;
  let fg: string | undefined;
  if (value >= 100) {
    bg = 'var(--mantine-color-green-1)';
    fg = 'var(--mantine-color-green-9)';
  } else if (threshold !== null && value >= threshold) {
    bg = 'var(--mantine-color-yellow-1)';
    fg = 'var(--mantine-color-yellow-9)';
  } else if (threshold !== null && value < threshold) {
    bg = 'var(--mantine-color-red-1)';
    fg = 'var(--mantine-color-red-9)';
  }

  // Progress bar color tracks the same 3-stop gradient.
  const barColor =
    value >= 100
      ? 'green'
      : threshold !== null && value < threshold
        ? 'red'
        : threshold !== null && value >= threshold
          ? 'yellow'
          : 'indigo';

  return (
    <Table.Td style={bg ? { backgroundColor: bg } : undefined}>
      <Stack gap={2}>
        <Text
          size="sm"
          fw={600}
          style={{ fontVariantNumeric: 'tabular-nums', color: fg }}
        >
          {value}%
        </Text>
        {!hideBar && <Progress size="xs" value={value} color={barColor} />}
      </Stack>
    </Table.Td>
  );
}

interface IssuesCellProps {
  count: number | undefined;
  validationPct: number | undefined;
}

function IssuesCell({ count, validationPct }: IssuesCellProps) {
  const { getActiveThreshold } = useThresholds();
  if (count === undefined) {
    // Pitfall P-05: em-dash for sparse Issues cell.
    return (
      <Text size="sm" c="dimmed">
        —
      </Text>
    );
  }

  // QUAL-02 (D-12): mirror the PercentTd 3-stop gradient on Issues text color
  // using the validationPct as the driver (same metric, same threshold).
  const threshold = getActiveThreshold('validation');
  let fg: string | undefined;
  if (validationPct !== undefined) {
    if (validationPct >= 100) {
      fg = 'var(--mantine-color-green-9)';
    } else if (threshold !== null && validationPct >= threshold) {
      fg = 'var(--mantine-color-yellow-9)';
    } else if (threshold !== null && validationPct < threshold) {
      fg = 'var(--mantine-color-red-9)';
    }
  }

  return (
    <Text
      size="sm"
      fw={600}
      style={{ fontVariantNumeric: 'tabular-nums', color: fg }}
    >
      {count}
    </Text>
  );
}
