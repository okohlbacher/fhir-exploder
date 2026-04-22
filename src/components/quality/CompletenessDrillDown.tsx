/**
 * CompletenessDrillDown — /quality/completeness/:type sub-page.
 *
 * Per-field breakdown of populated/total counts for a single resource type,
 * using the same sampling hook as the parent panel so cache hits carry
 * across navigation. PARTIAL-wraps DrillDownShell (QDDEP-02 / Plan 25-03,
 * Option A): the shell owns Back/Title/error-alert chrome; the Tabs +
 * DrillDownList + "note" body is rendered as a sibling below the shell.
 *
 * `useCompletenessReport` is hook-driven (`state === 'loading' | 'error' | data`)
 * rather than AsyncRunStatus-driven. The syntheticRun helper maps hook state
 * into the shell's `run` shape so the shell's unified chrome applies.
 */
import { useMemo, useState } from 'react';
import { useOutletContext, useParams } from 'react-router-dom';
import {
  Alert,
  Code,
  Group,
  Progress,
  Skeleton,
  Stack,
  Tabs,
  Text,
} from '@mantine/core';

import { useCompletenessReport } from '../../hooks/useCompletenessReport';
import { useSampleSize } from './SampleSizeControl';
import type { QualityOutletContext } from './QualityLayout';
import { getProfileForType } from '../../quality/profiles';
import { ResourceIssueTable } from './ResourceIssueTable';
import { DrillDownShell, type DrillDownShellProps } from './DrillDownShell';
import type { NormalizedIssue } from '../../quality/types';

export function CompletenessDrillDown() {
  const { type = '' } = useParams<{ type: string }>();
  const { client } = useOutletContext<QualityOutletContext>();
  const [sampleSize] = useSampleSize();

  // Scope to a single type — same hook, single-element array. Memoise the
  // array so its identity is stable across renders (parity with
  // CodingDrillDown).
  const singleTypeList = useMemo(() => [type], [type]);
  const reports = useCompletenessReport(client, singleTypeList, sampleSize);
  const state = reports[type];

  const [activeTab, setActiveTab] = useState<string | null>('fields');
  const [fieldFilter, setFieldFilter] = useState('');

  const normalizedIssues = useMemo((): NormalizedIssue[] => {
    if (!state || state === 'loading' || state === 'error' || !state.perResource) return [];
    return state.perResource.flatMap((r) =>
      r.missingPaths.map((path) => ({
        resourceId: r.resourceId,
        resourceType: r.resourceType,
        field: path,
        description: `Required field is missing or empty`,
        severity: (state.perPath[path] === 0 ? 'error' : 'warning') as NormalizedIssue['severity'],
      }))
    );
  }, [state]);

  // Map hook-driven state into shell's AsyncRunStatus run-shape. Completeness
  // has no progress concept exposed by the hook, so progress is {0,0} and
  // RunProgress renders null — expected for this asymmetric drill-down.
  // Data state maps to 'cancelled' so that the shell (with issues=[]) stays
  // silent on the complete-empty green alert; the bespoke Tabs body below
  // is what actually renders the loaded data.
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

  const profile = getProfileForType(type);

  return (
    <>
      <DrillDownShell
        title={`${type} — Completeness breakdown`}
        backHref="/quality"
        run={syntheticRun}
        issues={[]}
        errorMessage={`Failed to sample ${type}. Return to the Completeness tab and recompute metrics.`}
        emptyMessage="(no-op — bespoke body below)"
      />
      <Stack gap="md" p="xl" pt={0}>
        {!profile && (
          <Alert color="yellow" variant="light">
            No MII profile bundled for {type}. Structural validation skipped for this type.
          </Alert>
        )}
        {state === undefined || state === 'loading' ? (
          <Stack gap="xs">
            {[0, 1, 2, 3].map((i) => (
              <Skeleton key={i} height={24} radius="sm" />
            ))}
          </Stack>
        ) : state === 'error' ? null : (
          <Tabs value={activeTab} onChange={setActiveTab}>
            <Tabs.List>
              <Tabs.Tab value="fields">Fields</Tabs.Tab>
              <Tabs.Tab value="resources">Resources</Tabs.Tab>
            </Tabs.List>
            <Tabs.Panel value="fields" pt="md">
              <DrillDownList
                perPath={state.perPath}
                sampleSize={state.sampleSize}
                onFieldClick={handleFieldClick}
              />
              <Text size="xs" c="dimmed" mt="sm">
                Note: for array-valued paths, only the first element is
                inspected. A path counts as populated when the first entry in
                the array is non-empty. Slice-level gaps are surfaced in the
                Coding Coverage tab.
              </Text>
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

interface DrillDownListProps {
  perPath: Record<string, number>;
  sampleSize: number;
  onFieldClick?: (path: string) => void;
}

function DrillDownList({ perPath, sampleSize, onFieldClick }: DrillDownListProps) {
  const paths = Object.keys(perPath);
  if (paths.length === 0 || sampleSize === 0) {
    return (
      <Text c="dimmed" size="sm">
        No required paths configured for this type.
      </Text>
    );
  }

  return (
    <Stack gap="sm">
      {paths.map((path) => {
        const count = perPath[path];
        const pct = sampleSize > 0 ? Math.round((count / sampleSize) * 100) : 0;
        return (
          <Group
            key={path}
            justify="space-between"
            wrap="nowrap"
            onClick={() => onFieldClick?.(path)}
            style={{ cursor: onFieldClick ? 'pointer' : undefined }}
            role={onFieldClick ? 'button' : undefined}
            tabIndex={onFieldClick ? 0 : undefined}
            onKeyDown={onFieldClick ? (e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); onFieldClick(path); } } : undefined}
          >
            <Code c={onFieldClick ? 'blue.6' : undefined}>{path}</Code>
            <Group gap="sm" wrap="nowrap" style={{ minWidth: 240 }}>
              <Progress value={pct} style={{ flex: 1 }} />
              <Text size="sm" c="dimmed" style={{ whiteSpace: 'nowrap' }}>
                {pct}% ({count}/{sampleSize})
              </Text>
            </Group>
          </Group>
        );
      })}
    </Stack>
  );
}
