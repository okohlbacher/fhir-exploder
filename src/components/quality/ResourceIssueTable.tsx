/**
 * ResourceIssueTable — Phase 15, Plan 02 (Phase 43 VAL-07 extension).
 *
 * Shared per-resource issue table used by all three quality drill-down panels
 * (Completeness, Coverage, Validation). Renders NormalizedIssue[] as a
 * scrollable, filterable, paginated table.
 *
 * Features:
 *   - 5 columns: #, Severity, Resource, Field, Description
 *   - Severity badges (error=red, warning=yellow, info=blue)
 *   - Clickable resource links to /explorer/:type/:id
 *   - Client-side pagination at 50 items per page
 *   - Severity dropdown filter + field path text filter
 *   - Empty state (green Alert) and filter-empty state
 *   - Sorted by severity (error > warning > info) then resourceId ASC
 *
 * Phase 43 VAL-07 — "Did you mean?" inline expandable rows:
 *   - Optional `suggestions` prop: Map<rowKey, NearMissSuggestion[]> where
 *     rowKey = `${resourceId}|${field}|${code}` (matches the cascade's
 *     onSuggestions emission).
 *   - For each issue with `code === 'code-invalid'` AND ≥1 suggestion in the
 *     map, a chevron renders next to the row; clicking expands a
 *     <Mantine.Collapse> with a small table (Display | Code | Relation).
 *   - Tooltip on the Display cell shows the full SNOMED display + system URL.
 *   - Default-off (D-11): when `suggestions` is undefined/empty, NO chevron
 *     and NO Collapse row render at all — exactly the same DOM as pre-43.
 *   - Pitfall 6 (Mantine Collapse striping fix): collapse rows carry
 *     `data-collapse-row="true"` + an inline `background: 'transparent'` style
 *     so they don't shift the alternating-stripe pattern.
 */
import { useState, useMemo, useEffect, Fragment } from 'react';
import {
  Anchor,
  Alert,
  Badge,
  Code,
  Group,
  Pagination,
  Select,
  Table,
  Text,
  TextInput,
  Collapse,
  ActionIcon,
  Tooltip,
} from '@mantine/core';
import { IconCheck, IconChevronDown, IconChevronRight } from '@tabler/icons-react';
import { Link } from 'react-router-dom';
import type { NormalizedIssue, IssueSeverity } from '../../quality/types';
import type { NearMissSuggestion } from '../../quality/semanticNearMissWalker';

const PAGE_SIZE = 50;

const SEVERITY_COLOR: Record<IssueSeverity, string> = {
  error: 'red',
  warning: 'yellow',
  info: 'blue',
};

const SEVERITY_ORDER: Record<IssueSeverity, number> = {
  error: 0,
  warning: 1,
  info: 2,
};

const SEVERITY_OPTIONS = ['All severities', 'error', 'warning', 'info'];

export interface ResourceIssueTableProps {
  issues: NormalizedIssue[];
  initialFieldFilter?: string;
  /**
   * Phase 43 VAL-07: "Did you mean?" suggestions keyed by
   * `${issue.resourceId}|${issue.field}|${issue.code}`. Threaded from
   * cascadingValidator.onSuggestions via useConformanceRun. When undefined
   * or empty, no chevron / no Collapse row renders (D-11 default-off).
   */
  suggestions?: Map<string, NearMissSuggestion[]>;
}

/** Compute the row key matching cascadingValidator.onSuggestions emission. */
function computeRowKey(issue: NormalizedIssue): string {
  return `${issue.resourceId}|${issue.field}|${issue.code ?? ''}`;
}

/** Inner suggestion table rendered inside the Collapse. */
function SuggestionTable({ suggestions }: { suggestions: NearMissSuggestion[] }) {
  return (
    <Table withTableBorder withColumnBorders={false} verticalSpacing="xs">
      <Table.Thead>
        <Table.Tr>
          <Table.Th>Display</Table.Th>
          <Table.Th>Code</Table.Th>
          <Table.Th>Relation</Table.Th>
        </Table.Tr>
      </Table.Thead>
      <Table.Tbody>
        {suggestions.map((s, i) => (
          <Table.Tr key={`${s.system}|${s.code}|${i}`}>
            <Table.Td>
              <Tooltip label={`${s.display} (${s.system})`} withArrow>
                <Text size="sm">{s.display}</Text>
              </Tooltip>
            </Table.Td>
            <Table.Td>
              <Code>{s.code}</Code>
            </Table.Td>
            <Table.Td>
              <Badge size="xs" variant="light">
                {s.relation}
              </Badge>
            </Table.Td>
          </Table.Tr>
        ))}
      </Table.Tbody>
    </Table>
  );
}

export function ResourceIssueTable({
  issues,
  initialFieldFilter,
  suggestions,
}: ResourceIssueTableProps) {
  const [page, setPage] = useState(1);
  const [severityFilter, setSeverityFilter] = useState('All severities');
  const [fieldFilter, setFieldFilter] = useState(initialFieldFilter ?? '');
  const [expandedRows, setExpandedRows] = useState<Set<string>>(new Set());

  useEffect(() => {
    if (initialFieldFilter !== undefined) {
      setFieldFilter(initialFieldFilter);
      setPage(1);
    }
  }, [initialFieldFilter]);

  const { filtered, pageItems, totalPages, start, end } = useMemo(() => {
    let result = issues;

    if (severityFilter !== 'All severities') {
      result = result.filter((issue) => issue.severity === severityFilter);
    }

    if (fieldFilter) {
      const lower = fieldFilter.toLowerCase();
      result = result.filter((issue) =>
        issue.field.toLowerCase().includes(lower),
      );
    }

    const filtered = [...result].sort((a, b) => {
      const sa = SEVERITY_ORDER[a.severity] ?? 99;
      const sb = SEVERITY_ORDER[b.severity] ?? 99;
      if (sa !== sb) return sa - sb;
      return a.resourceId.localeCompare(b.resourceId);
    });

    const totalPages = Math.ceil(filtered.length / PAGE_SIZE);
    const pageItems = filtered.slice(
      (page - 1) * PAGE_SIZE,
      page * PAGE_SIZE,
    );
    const start = (page - 1) * PAGE_SIZE + 1;
    const end = Math.min(page * PAGE_SIZE, filtered.length);

    return { filtered, pageItems, totalPages, start, end };
  }, [issues, severityFilter, fieldFilter, page]);

  // Empty state: no issues at all
  if (issues.length === 0) {
    return (
      <Alert
        color="green"
        variant="light"
        icon={<IconCheck size={20} />}
        title="No issues found"
      >
        All sampled resources passed this quality check. Increase the sample
        size to check more resources.
      </Alert>
    );
  }

  const filterBar = (
    <Group gap="sm" mb="sm">
      <Select
        data={SEVERITY_OPTIONS}
        value={severityFilter}
        onChange={(v) => {
          setSeverityFilter(v ?? 'All severities');
          setPage(1);
        }}
        size="sm"
        w={180}
        aria-label="Filter by severity"
      />
      <TextInput
        placeholder="Filter by field path..."
        value={fieldFilter}
        onChange={(e) => {
          setFieldFilter(e.currentTarget.value);
          setPage(1);
        }}
        size="sm"
        style={{ flex: 1 }}
        aria-label="Filter by field path"
      />
    </Group>
  );

  // Filter-empty state: filters yield nothing
  if (filtered.length === 0) {
    return (
      <>
        {filterBar}
        <Text c="dimmed" size="sm" ta="center">
          No matching issues. Clear filters to see all issues.
        </Text>
      </>
    );
  }

  const toggleRow = (rowKey: string) => {
    setExpandedRows((prev) => {
      const next = new Set(prev);
      if (next.has(rowKey)) next.delete(rowKey);
      else next.add(rowKey);
      return next;
    });
  };

  return (
    <>
      {filterBar}
      <Text size="sm" c="dimmed" mb="xs">
        Showing {start}–{end} of {filtered.length} issues
      </Text>
      <div style={{ maxHeight: 600, overflow: 'auto' }}>
        <Table striped highlightOnHover stickyHeader>
          <Table.Thead>
            <Table.Tr>
              <Table.Th>#</Table.Th>
              <Table.Th>Severity</Table.Th>
              <Table.Th>Resource</Table.Th>
              <Table.Th>Field</Table.Th>
              <Table.Th>Description</Table.Th>
            </Table.Tr>
          </Table.Thead>
          <Table.Tbody>
            {pageItems.map((issue, i) => {
              const parts = issue.resourceId.split('/');
              const type = parts[0];
              const id = parts.slice(1).join('/');
              const rowNum = (page - 1) * PAGE_SIZE + i + 1;
              const rowKey = computeRowKey(issue);
              const issueSuggestions = suggestions?.get(rowKey) ?? [];
              const isExpandable =
                issue.code === 'code-invalid' && issueSuggestions.length > 0;
              const isOpen = expandedRows.has(rowKey);
              return (
                <Fragment key={`${rowKey}|${i}`}>
                  <Table.Tr>
                    <Table.Td>
                      {isExpandable ? (
                        <Group gap={4} wrap="nowrap">
                          <ActionIcon
                            size="xs"
                            variant="subtle"
                            onClick={() => toggleRow(rowKey)}
                            aria-label={
                              isOpen
                                ? 'Hide suggestions'
                                : 'Show suggestions'
                            }
                          >
                            {isOpen ? (
                              <IconChevronDown size={14} />
                            ) : (
                              <IconChevronRight size={14} />
                            )}
                          </ActionIcon>
                          <Text size="sm">{rowNum}</Text>
                        </Group>
                      ) : (
                        rowNum
                      )}
                    </Table.Td>
                    <Table.Td>
                      <Badge
                        color={SEVERITY_COLOR[issue.severity]}
                        variant="light"
                        size="sm"
                      >
                        {issue.severity}
                      </Badge>
                    </Table.Td>
                    <Table.Td>
                      {type && id ? (
                        <Anchor
                          component={Link}
                          to={`/explorer/${type}/${id}`}
                          c="blue.6"
                          size="sm"
                        >
                          {issue.resourceId}
                        </Anchor>
                      ) : (
                        <Code>--</Code>
                      )}
                    </Table.Td>
                    <Table.Td>
                      <Code>{issue.field}</Code>
                    </Table.Td>
                    <Table.Td>{issue.description}</Table.Td>
                  </Table.Tr>
                  {isExpandable && (
                    <Table.Tr
                      data-collapse-row="true"
                      // Pitfall 6: skip the striped background pattern so the
                      // Collapse row doesn't offset alternating stripes.
                      style={{ background: 'transparent' }}
                    >
                      <Table.Td
                        colSpan={5}
                        style={{ padding: 0, background: 'transparent' }}
                      >
                        <Collapse in={isOpen}>
                          <SuggestionTable suggestions={issueSuggestions} />
                        </Collapse>
                      </Table.Td>
                    </Table.Tr>
                  )}
                </Fragment>
              );
            })}
          </Table.Tbody>
        </Table>
      </div>
      {totalPages > 1 && (
        <Group justify="center" mt="sm">
          <Pagination
            total={totalPages}
            value={page}
            onChange={setPage}
            size="sm"
          />
        </Group>
      )}
    </>
  );
}
