/**
 * ValidationIssueList — Plan 05-05.
 *
 * Renders OperationOutcomeIssue[] as a scrollable table with sticky header.
 * Row ordering: severity (fatal > error > warning > information) then
 * resource id ASC (UI-SPEC line 333). Each resource id is a blue link to
 * /explorer/{type}/{id} reusing Phase 2's resource detail view.
 *
 * Severity palette (UI-SPEC):
 *   fatal   → red
 *   error   → red
 *   warning → yellow
 *   information → blue
 *
 * The underlying data is never mutated — `[...issues].sort()` operates on
 * a copy so parent component state is preserved.
 */
import { Anchor, Badge, Code, Table } from '@mantine/core';
import { Link } from 'react-router-dom';
import type { OperationOutcomeIssue } from '@medplum/fhirtypes';

export type AttributedIssue = OperationOutcomeIssue & {
  _resourceId?: string;
};

const SEVERITY_COLOR: Record<string, string> = {
  fatal: 'red',
  error: 'red',
  warning: 'yellow',
  information: 'blue',
};

const SEVERITY_ORDER: Record<string, number> = {
  fatal: 0,
  error: 1,
  warning: 2,
  information: 3,
};

export interface ValidationIssueListProps {
  issues: AttributedIssue[];
}

export function ValidationIssueList({ issues }: ValidationIssueListProps) {
  const sorted = [...issues].sort((a, b) => {
    const sa = SEVERITY_ORDER[a.severity ?? 'information'] ?? 99;
    const sb = SEVERITY_ORDER[b.severity ?? 'information'] ?? 99;
    if (sa !== sb) return sa - sb;
    const ra = a._resourceId ?? '';
    const rb = b._resourceId ?? '';
    return ra.localeCompare(rb);
  });

  return (
    <div style={{ maxHeight: 600, overflow: 'auto' }}>
      <Table striped highlightOnHover stickyHeader>
        <Table.Thead>
          <Table.Tr>
            <Table.Th>#</Table.Th>
            <Table.Th>Severity</Table.Th>
            <Table.Th>Resource</Table.Th>
            <Table.Th>Location</Table.Th>
            <Table.Th>Issue</Table.Th>
          </Table.Tr>
        </Table.Thead>
        <Table.Tbody>
          {sorted.map((issue, i) => {
            const resourceId = issue._resourceId;
            const parts = (resourceId ?? '').split('/');
            const type = parts[0];
            const id = parts[1];
            const severity = issue.severity ?? 'information';
            return (
              <Table.Tr key={i}>
                <Table.Td>{i + 1}</Table.Td>
                <Table.Td>
                  <Badge
                    color={SEVERITY_COLOR[severity] ?? 'gray'}
                    variant="light"
                    size="sm"
                  >
                    {severity}
                  </Badge>
                </Table.Td>
                <Table.Td>
                  {resourceId && type && id ? (
                    <Anchor
                      component={Link}
                      to={`/explorer/${type}/${id}`}
                      c="blue.6"
                      size="sm"
                    >
                      {resourceId}
                    </Anchor>
                  ) : (
                    <Code>—</Code>
                  )}
                </Table.Td>
                <Table.Td>
                  <Code>
                    {issue.expression?.[0] ?? issue.location?.[0] ?? '—'}
                  </Code>
                </Table.Td>
                <Table.Td>
                  {issue.code} — {issue.diagnostics ?? issue.details?.text ?? ''}
                </Table.Td>
              </Table.Tr>
            );
          })}
        </Table.Tbody>
      </Table>
    </div>
  );
}
