/**
 * ResourceIssueTable -- Phase 15, Plan 02.
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
 */
import { useState, useMemo, useEffect } from 'react';
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
} from '@mantine/core';
import { IconCheck } from '@tabler/icons-react';
import { Link } from 'react-router-dom';
import type { NormalizedIssue, IssueSeverity } from '../../quality/types';

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
}

export function ResourceIssueTable({
  issues,
  initialFieldFilter,
}: ResourceIssueTableProps) {
  const [page, setPage] = useState(1);
  const [severityFilter, setSeverityFilter] = useState('All severities');
  const [fieldFilter, setFieldFilter] = useState(initialFieldFilter ?? '');

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

  return (
    <>
      {filterBar}
      <Text size="sm" c="dimmed" mb="xs">
        Showing {start}--{end} of {filtered.length} issues
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
              return (
                <Table.Tr key={`${issue.resourceId}|${issue.field}|${i}`}>
                  <Table.Td>{rowNum}</Table.Td>
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
