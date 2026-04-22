/**
 * CodingDrillDown — /quality/coding/:type sub-page (Plan 05-04).
 *
 * Per-field coding coverage breakdown for a single resource type, using
 * the same sampling hook as the parent panel so cache hits carry across
 * the navigation. Renders an example CodeableConcept per path via
 * @medplum/react CodeableConceptDisplay so terminology-resolved display
 * values come "for free" from the Phase 4 TerminologyProvider.
 *
 * PARTIAL-wraps DrillDownShell (QDDEP-02 / Plan 25-03, Option A):
 *   The shell owns Back/Title/error-alert chrome; the bespoke per-path
 *   coverage body (Tabs + DrillDownTable + CodeableConceptDisplay tree)
 *   is rendered as a sibling below the shell. `issues={[]}` keeps the
 *   shell from rendering ResourceIssueTable; the bespoke body below is
 *   the one that renders the Resources tab with the normalized issues.
 *
 * Layout (05-UI-SPEC lines 289-306):
 *   Back button (auto-focused) → Title → Table rows of
 *     Field path | system+code % | text-only % | empty % | Example coded value
 */
import { useMemo, useState } from 'react';
import { useOutletContext, useParams } from 'react-router-dom';
import { Alert, Code, Skeleton, Stack, Table, Tabs, Text } from '@mantine/core';
import { CodeableConceptDisplay } from '@medplum/react';
import type { CodeableConcept } from '@medplum/fhirtypes';

import { useCodingCoverage } from '../../hooks/useCodingCoverage';
import { useSampleSize } from './SampleSizeControl';
import type { QualityOutletContext } from './QualityLayout';
import { ResourceIssueTable } from './ResourceIssueTable';
import { DrillDownShell, type DrillDownShellProps } from './DrillDownShell';
import type { NormalizedIssue } from '../../quality/types';

function pct(numerator: number, denominator: number): number {
  if (denominator <= 0) return 0;
  return Math.round((numerator / denominator) * 100);
}

export function CodingDrillDown() {
  const { type = '' } = useParams<{ type: string }>();
  const { client } = useOutletContext<QualityOutletContext>();
  const [sampleSize] = useSampleSize();

  const singleTypeList = useMemo(() => [type], [type]);
  const reports = useCodingCoverage(client, singleTypeList, sampleSize);
  const state = reports[type];

  // Phase 25 Plan 01 (QDDEP-01): examples come from the same
  // PerTypeCoverageReport the parent hook already produced — no second
  // sampleResources fetch. Guarded on `state?.perPathExamples` to tolerate
  // pre-QDDEP-01 cached report blobs (missing the field) without crashing.
  const examplesByPath = useMemo<Record<string, CodeableConcept | undefined>>(() => {
    if (!state || state === 'loading' || state === 'error') return {};
    return state.perPathExamples ?? {};
  }, [state]);

  const [activeTab, setActiveTab] = useState<string | null>('fields');
  const [fieldFilter, setFieldFilter] = useState('');

  const normalizedIssues = useMemo((): NormalizedIssue[] => {
    if (!state || state === 'loading' || state === 'error' || !state.perResource) return [];
    return state.perResource.flatMap((r) =>
      r.issues.map((issue) => ({
        resourceId: r.resourceId,
        resourceType: r.resourceType,
        field: issue.path,
        description: issue.classification === 'empty'
          ? 'CodeableConcept field is empty (no coding or text)'
          : 'CodeableConcept field has text only (no system+code)',
        severity: issue.classification === 'empty' ? 'warning' as const : 'info' as const,
      }))
    );
  }, [state]);

  // Map hook state to shell's AsyncRunStatus run-shape. progress.total=0 keeps
  // RunProgress silent (coding has no per-type sampled-count running progress).
  // Data state maps to 'cancelled' so the shell's empty-state green alert does
  // NOT fire — the bespoke body below renders the loaded content instead.
  const syntheticRun = useMemo<DrillDownShellProps['run']>(() => ({
    status:
      state === undefined || state === 'loading'
        ? 'running'
        : state === 'error'
          ? 'error'
          : 'cancelled',
    progress: { current: 0, total: 0 },
  }), [state]);

  const handleFieldClick = (path: string) => {
    setFieldFilter(path);
    setActiveTab('resources');
  };

  return (
    <>
      <DrillDownShell
        title={`${type} — Coding coverage breakdown`}
        backHref="/quality"
        run={syntheticRun}
        issues={[]}
        errorMessage={`Failed to sample ${type}. Return to the Coding Coverage tab and recompute metrics.`}
        emptyMessage="(no-op — bespoke body below)"
      />
      <Stack gap="md" p="xl" pt={0}>
        {state === undefined || state === 'loading' ? (
          <Stack gap="xs">
            {[0, 1, 2, 3].map((i) => (
              <Skeleton key={i} height={24} radius="sm" />
            ))}
          </Stack>
        ) : state === 'error' ? null : state.totalCodedFields === 0 ? (
          <Alert color="gray" variant="light">
            No CodeableConcept fields found in the first {state.sampleSize} sampled{' '}
            {type} resources.
          </Alert>
        ) : (
          <Tabs value={activeTab} onChange={setActiveTab}>
            <Tabs.List>
              <Tabs.Tab value="fields">Fields</Tabs.Tab>
              <Tabs.Tab value="resources">Resources</Tabs.Tab>
            </Tabs.List>
            <Tabs.Panel value="fields" pt="md">
              <DrillDownTable
                perPath={state.perPath}
                examplesByPath={examplesByPath}
                onFieldClick={handleFieldClick}
              />
            </Tabs.Panel>
            <Tabs.Panel value="resources" pt="md">
              <ResourceIssueTable issues={normalizedIssues} initialFieldFilter={fieldFilter} />
            </Tabs.Panel>
          </Tabs>
        )}
      </Stack>
    </>
  );
}

interface DrillDownTableProps {
  perPath: Record<string, { systemCode: number; textOnly: number; empty: number }>;
  examplesByPath: Record<string, CodeableConcept | undefined>;
  onFieldClick?: (path: string) => void;
}

function DrillDownTable({ perPath, examplesByPath, onFieldClick }: DrillDownTableProps) {
  const paths = Object.keys(perPath).sort();
  if (paths.length === 0) {
    return (
      <Text c="dimmed" size="sm">
        No CodeableConcept fields were found in the sampled resources.
      </Text>
    );
  }
  return (
    <Table striped highlightOnHover>
      <Table.Thead>
        <Table.Tr>
          <Table.Th>Field path</Table.Th>
          <Table.Th>system+code</Table.Th>
          <Table.Th>text-only</Table.Th>
          <Table.Th>empty</Table.Th>
          <Table.Th>Example coded value</Table.Th>
        </Table.Tr>
      </Table.Thead>
      <Table.Tbody>
        {paths.map((path) => {
          const row = perPath[path];
          const total = row.systemCode + row.textOnly + row.empty;
          const sys = pct(row.systemCode, total);
          const txt = pct(row.textOnly, total);
          const emp = pct(row.empty, total);
          const example = examplesByPath[path];
          return (
            <Table.Tr
              key={path}
              onClick={() => onFieldClick?.(path)}
              style={{ cursor: onFieldClick ? 'pointer' : undefined }}
              role={onFieldClick ? 'button' : undefined}
              tabIndex={onFieldClick ? 0 : undefined}
              onKeyDown={onFieldClick ? (e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); onFieldClick(path); } } : undefined}
            >
              <Table.Td>
                <Code c={onFieldClick ? 'blue.6' : undefined}>{path}</Code>
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
                {example ? (
                  <CodeableConceptDisplay value={example} />
                ) : (
                  <Text size="sm" c="dimmed">
                    —
                  </Text>
                )}
              </Table.Td>
            </Table.Tr>
          );
        })}
      </Table.Tbody>
    </Table>
  );
}
