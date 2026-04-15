/**
 * QualityOverviewPage — /quality landing.
 *
 * Layout per 05-UI-SPEC.md:
 *   1. Title "Data Quality"
 *   2. Toolbar: SampleSizeControl + Last computed + Recompute button
 *   3. OverviewStrip (4 summary cards, cards 3-4 fed by QualityMetricsContext)
 *   4. Tabs (Counts / Completeness / Coding Coverage / Validation) — keepMounted
 *
 * Plans 03/04/05 overwrite the three stub panels (CompletenessPanel,
 * CodingCoveragePanel, ValidationPanel) without editing this file again.
 */
import { Button, Group, Stack, Tabs, Text, Title } from '@mantine/core';
import { useLocalStorage } from '@mantine/hooks';
import {
  IconAdjustmentsAlt,
  IconCamera,
  IconFileDownload,
  IconRefresh,
} from '@tabler/icons-react';
import { useCallback, useMemo, useState } from 'react';
import { useNavigate, useOutletContext, useSearchParams } from 'react-router-dom';
import { notifications } from '@mantine/notifications';
import type { QualityOutletContext } from './QualityLayout';
import { parseResourceTypes } from '../../fhir/capability';
import { useResourceCountsMetrics } from '../../hooks/useResourceCountsMetrics';
import { useSampleSize, SampleSizeControl } from './SampleSizeControl';
import { OverviewStrip } from './OverviewStrip';
import { ResourceCountsPanel } from './ResourceCountsPanel';
import { CompletenessPanel } from './CompletenessPanel';
import { CodingCoveragePanel } from './CodingCoveragePanel';
import { ValidationPanel } from './ValidationPanel';
import { PlausibilityPanel } from './PlausibilityPanel';
import { LabRangesPanel } from './LabRangesPanel';
import { DuplicatesPanel } from './DuplicatesPanel';
import { ReferencesPanel } from './ReferencesPanel';
import { ResourceTypeSelector } from './ResourceTypeSelector';
import { TrendsPanel } from './TrendsPanel';
import { useThresholds } from '../../hooks/useThresholds';
import { useTrendsHistory } from '../../hooks/useTrendsHistory';
import { useQualityMetrics } from '../../quality/QualityMetricsContext';
import { captureSnapshot } from '../../quality/trendsHistory';
import { exportQualityPdf } from '../../quality/pdfExport';
import { RESOURCE_TYPES_STORAGE_KEY } from '../../quality/cohorts';
import type { MetricKey } from '../../quality/thresholds';

const VALID_TABS = new Set([
  'counts',
  'completeness',
  'coverage',
  'validation',
  'plausibility',
  'lab-ranges',
  'duplicates',
  'references',
  'trends',
] as const);
const DEFAULT_TAB = 'counts';

function formatRelative(d: Date | null): string {
  if (!d) return 'Never';
  const secs = Math.floor((Date.now() - d.getTime()) / 1000);
  if (secs < 60) return `${secs}s ago`;
  const mins = Math.floor(secs / 60);
  if (mins < 60) return `${mins}min ago`;
  const hrs = Math.floor(mins / 60);
  return `${hrs}h ago`;
}

export function QualityOverviewPage() {
  const { client, capability } = useOutletContext<QualityOutletContext>();
  const [sampleSize, setSampleSize] = useSampleSize();
  const navigate = useNavigate();

  const types = useMemo(
    () => parseResourceTypes(capability).map((t) => t.type),
    [capability],
  );

  const [resourceTypes, setResourceTypes] = useLocalStorage<string[]>({
    key: RESOURCE_TYPES_STORAGE_KEY,
    defaultValue: [],
  });
  const effectiveTypes = resourceTypes.length > 0 ? resourceTypes : types;

  const [searchParams, setSearchParams] = useSearchParams();
  const tabParam = searchParams.get('tab');
  const activeTab =
    tabParam && VALID_TABS.has(tabParam as never) ? tabParam : DEFAULT_TAB;

  const handleTabChange = (value: string | null) => {
    if (!value) return;
    // Preserve other params (none today, but defensive). `replace: true` so
    // the back button skips intra-tab navigation.
    const next = new URLSearchParams(searchParams);
    next.set('tab', value);
    setSearchParams(next, { replace: true });
  };

  const { counts, summary, lastComputed, recompute } = useResourceCountsMetrics(client, types);

  // Plan 19-03: capture snapshot + export PDF handlers.
  const metrics = useQualityMetrics();
  const { getActiveThreshold } = useThresholds();
  const { snapshots, append } = useTrendsHistory();
  const [exporting, setExporting] = useState(false);

  const handleRecompute = () => {
    recompute();
    notifications.show({
      color: 'blue',
      title: 'Recomputing',
      message: 'Re-fetching counts…',
    });
  };

  const handleCapture = useCallback(() => {
    const snap = captureSnapshot({
      metrics,
      serverUrl: client.getBaseUrl(),
      sampleSize,
      // Plan 21-04 (T-4.3): canonical field is `resourceTypes`; the legacy
      // `cohort: string[]` alias on `CaptureSnapshotParams` is retained only
      // for back-compat with older in-flight callers and will be removed in
      // Phase 22. Plan 21-06 will populate `activeCohort` here once the
      // dashboard has a cohort dropdown — until then no active cohort.
      resourceTypes,
      activeCohort: null,
      getActiveThreshold,
    });
    append(snap);
    notifications.show({
      color: 'blue',
      title: 'Snapshot captured',
      message: 'Added to trend history.',
      autoClose: 2500,
    });
  }, [metrics, client, sampleSize, resourceTypes, getActiveThreshold, append]);

  const handleExport = useCallback(async () => {
    setExporting(true);
    try {
      const METRIC_KEYS: MetricKey[] = [
        'completeness',
        'coverage',
        'validation',
        'plausibility',
        'labRanges',
        'duplicates',
        'references',
      ];
      const thresholds = Object.fromEntries(
        METRIC_KEYS.map((k) => [k, getActiveThreshold(k)]),
      ) as Record<MetricKey, number | null>;
      await exportQualityPdf({
        snapshots,
        summary: {
          totalResources: summary.total,
          distinctTypes: summary.typeCount,
          totals: {
            completeness: metrics.overallCompleteness,
            coverage: metrics.overallCoverage,
            validation: metrics.overallValidation,
            plausibility: metrics.overallPlausibility,
            labRanges: metrics.overallLabRanges,
            duplicates: metrics.overallDuplicates,
            references: metrics.overallReferences,
          },
        },
        sampleSize,
        // Plan 21-04 (T-4.3): `resourceTypes` is the canonical resource-type
        // filter list. The optional `cohort` object carries the active cohort
        // (id/name/patientCount); Plan 21-06 threads a real value from a
        // dashboard cohort dropdown — until then `null`.
        resourceTypes,
        cohort: null,
        thresholds,
        serverUrl: client.getBaseUrl(),
        capturedAt: new Date(),
        appVersion:
          ((import.meta as unknown as { env?: { VITE_APP_VERSION?: string } })
            .env?.VITE_APP_VERSION) ?? '0.0.0',
      });
      notifications.show({
        color: 'blue',
        title: 'Report downloaded',
        message:
          'Your browser saved the PDF to its default downloads folder.',
        autoClose: 4000,
      });
    } catch (err) {
      console.error(err);
      notifications.show({
        color: 'red',
        title: 'Export failed',
        message: 'Could not generate PDF. See browser console for details.',
        autoClose: 6000,
      });
    } finally {
      setExporting(false);
    }
  }, [
    snapshots,
    metrics,
    sampleSize,
    resourceTypes,
    client,
    getActiveThreshold,
    summary.total,
    summary.typeCount,
  ]);

  const typesLoaded =
    Object.keys(counts).length > 0 &&
    Object.values(counts).some((v) => v !== 'loading');

  return (
    <Stack gap="lg" p="xl">
      <Title order={2}>Data Quality</Title>

      <Group justify="space-between" align="flex-end">
        <Group gap="md" align="flex-end">
          <ResourceTypeSelector
            types={types}
            value={resourceTypes}
            onChange={setResourceTypes}
          />
          <SampleSizeControl value={sampleSize} onChange={setSampleSize} />
        </Group>
        <Group gap="sm">
          <Text size="sm" c="dimmed">
            Last computed {formatRelative(lastComputed)}
          </Text>
          <Button
            variant="light"
            leftSection={<IconAdjustmentsAlt size={16} />}
            onClick={() => navigate('/quality/thresholds')}
          >
            Configure thresholds
          </Button>
          <Button
            variant="light"
            color="blue"
            leftSection={<IconCamera size={16} />}
            onClick={handleCapture}
            aria-label="Capture snapshot. Records current quality metrics to trend history."
          >
            Capture snapshot
          </Button>
          <Button
            variant="filled"
            color="blue"
            leftSection={<IconFileDownload size={16} />}
            loading={exporting}
            onClick={handleExport}
            aria-label="Export PDF report of current quality dashboard state."
          >
            Export PDF
          </Button>
          <Button
            variant="light"
            leftSection={<IconRefresh size={16} />}
            onClick={handleRecompute}
          >
            Recompute metrics
          </Button>
        </Group>
      </Group>

      <OverviewStrip summary={summary} isLoading={!typesLoaded} />

      <Tabs value={activeTab} onChange={handleTabChange} keepMounted>
        <Tabs.List>
          <Tabs.Tab value="counts">Counts</Tabs.Tab>
          <Tabs.Tab value="completeness">Completeness</Tabs.Tab>
          <Tabs.Tab value="coverage">Coding Coverage</Tabs.Tab>
          <Tabs.Tab value="validation">Validation</Tabs.Tab>
          <Tabs.Tab value="plausibility">Plausibility</Tabs.Tab>
          <Tabs.Tab value="lab-ranges">Lab Ranges</Tabs.Tab>
          <Tabs.Tab value="duplicates">Duplicates</Tabs.Tab>
          <Tabs.Tab value="references">References</Tabs.Tab>
          <Tabs.Tab value="trends">Trends</Tabs.Tab>
        </Tabs.List>

        <Tabs.Panel value="counts" pt="md" keepMounted>
          <ResourceCountsPanel counts={counts} />
        </Tabs.Panel>
        <Tabs.Panel value="completeness" pt="md" keepMounted>
          <CompletenessPanel types={effectiveTypes} client={client} sampleSize={sampleSize} />
        </Tabs.Panel>
        <Tabs.Panel value="coverage" pt="md" keepMounted>
          <CodingCoveragePanel types={effectiveTypes} client={client} sampleSize={sampleSize} />
        </Tabs.Panel>
        <Tabs.Panel value="validation" pt="md" keepMounted>
          <ValidationPanel client={client} sampleSize={sampleSize} />
        </Tabs.Panel>
        <Tabs.Panel value="plausibility" pt="md" keepMounted>
          <PlausibilityPanel types={effectiveTypes} client={client} sampleSize={sampleSize} />
        </Tabs.Panel>
        <Tabs.Panel value="lab-ranges" pt="md" keepMounted>
          <LabRangesPanel client={client} sampleSize={sampleSize} />
        </Tabs.Panel>
        <Tabs.Panel value="duplicates" pt="md" keepMounted>
          <DuplicatesPanel types={effectiveTypes} client={client} sampleSize={sampleSize} />
        </Tabs.Panel>
        <Tabs.Panel value="references" pt="md" keepMounted>
          <ReferencesPanel types={effectiveTypes} client={client} sampleSize={sampleSize} />
        </Tabs.Panel>
        <Tabs.Panel value="trends" pt="md" keepMounted>
          <TrendsPanel
            serverUrl={client.getBaseUrl()}
            onCapture={handleCapture}
          />
        </Tabs.Panel>
      </Tabs>
    </Stack>
  );
}
