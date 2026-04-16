/**
 * QualityOverviewPage -- /quality landing.
 *
 * Layout per 05-UI-SPEC.md + 21-UI-SPEC.md:
 *   1. Title "Data Quality"
 *   2. Toolbar: ResourceTypeSelector + ActiveCohortSelect + SampleSizeControl
 *      | Last computed + Manage cohorts + Configure thresholds + Capture +
 *      Export + Recompute
 *   3. Zero-match Alert (above Tabs when active cohort resolves to 0 patients)
 *   4. OverviewStrip (4 summary cards, cards 3-4 fed by QualityMetricsContext)
 *   5. Tabs (Counts / Completeness / Coding Coverage / Validation /
 *      Plausibility / Lab Ranges / Duplicates / References / Trends)
 *
 * Plan 21-06: adds ActiveCohortSelect, Manage cohorts button, cohort
 * resolver effect, patientIds threading through panels, and cohort-aware
 * capture/export.
 */
import { Alert, Anchor, Button, Group, Stack, Tabs, Text, Title } from '@mantine/core';
import { useLocalStorage } from '@mantine/hooks';
import {
  IconAdjustmentsAlt,
  IconAlertTriangle,
  IconCamera,
  IconFileDownload,
  IconRefresh,
  IconUsersGroup,
} from '@tabler/icons-react';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { Link, useNavigate, useOutletContext, useSearchParams } from 'react-router-dom';
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
import { ActiveCohortSelect } from './ActiveCohortSelect';
import { TrendsPanel } from './TrendsPanel';
import { useThresholds } from '../../hooks/useThresholds';
import { useTrendsHistory } from '../../hooks/useTrendsHistory';
import { useCohorts } from '../../hooks/useCohorts';
import { resolveCohort, clearCohortResolutionCache } from '../../quality/cohortResolver';
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

  // Plan 21-06: cohort resolver state
  const { activeCohort, hydrated: cohortsHydrated } = useCohorts();
  const [resolvedPatientIds, setResolvedPatientIds] = useState<string[] | null>(null);
  const [resolutionStatus, setResolutionStatus] = useState<'idle' | 'resolving' | 'failed'>('idle');
  const [recomputeToken, setRecomputeToken] = useState(0);

  // Cohort resolution effect -- Threat T-21-15: uses `cancelled` flag to
  // prevent toast spam; only one resolution toast per mount/change.
  useEffect(() => {
    if (!cohortsHydrated) return;
    if (!activeCohort) {
      setResolvedPatientIds(null);
      setResolutionStatus('idle');
      return;
    }
    let cancelled = false;
    setResolutionStatus('resolving');
    resolveCohort(client, activeCohort)
      .then((ids) => {
        if (!cancelled) {
          setResolvedPatientIds(ids);
          setResolutionStatus('idle');
        }
      })
      .catch(() => {
        if (!cancelled) {
          setResolvedPatientIds(null);
          setResolutionStatus('failed');
          notifications.show({
            color: 'red',
            title: 'Cohort resolution failed',
            message: `Could not resolve "${activeCohort.name}" against the server. Panels running unscoped.`,
            autoClose: 6000,
          });
        }
      });
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeCohort?.id, activeCohort?.updatedAt, cohortsHydrated, recomputeToken, client]);

  // Threat T-21-16: clear cohort resolution cache on server-URL change.
  useEffect(() => {
    clearCohortResolutionCache();
  }, [client]);

  const resolvedPatientCount = resolvedPatientIds?.length ?? null;
  const hasZeroMatch =
    activeCohort != null &&
    resolutionStatus === 'idle' &&
    resolvedPatientCount === 0;

  // Compute scoped patient IDs for panels (Pitfall 8: 0-patient or failed
  // resolution means panels run unscoped).
  const scopedPatientIds =
    resolutionStatus === 'idle'
      ? resolvedPatientIds ?? undefined
      : undefined;

  const handleRecompute = () => {
    recompute();
    // Bump recompute token so the resolver re-runs for the active cohort
    setRecomputeToken((t) => t + 1);
    notifications.show({
      color: 'blue',
      title: 'Recomputing',
      message: 'Re-fetching counts\u2026',
    });
  };

  const handleCapture = useCallback(() => {
    // Plan 21-06: pass cohort metadata to captureSnapshot
    const cohort =
      activeCohort && resolutionStatus === 'idle' && resolvedPatientIds
        ? {
            id: activeCohort.id,
            name: activeCohort.name,
            patientCount: resolvedPatientIds.length,
          }
        : null;
    const snap = captureSnapshot({
      metrics,
      serverUrl: client.getBaseUrl(),
      sampleSize,
      resourceTypes,
      activeCohort: cohort,
      getActiveThreshold,
    });
    append(snap);
    notifications.show({
      color: 'blue',
      title: 'Snapshot captured',
      message: 'Added to trend history.',
      autoClose: 2500,
    });
  }, [metrics, client, sampleSize, resourceTypes, getActiveThreshold, append, activeCohort, resolutionStatus, resolvedPatientIds]);

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

      // Plan 21-06: pass cohort metadata to PDF export
      const cohort =
        activeCohort && resolutionStatus === 'idle' && resolvedPatientIds
          ? {
              id: activeCohort.id,
              name: activeCohort.name,
              patientCount: resolvedPatientIds.length,
            }
          : null;

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
        resourceTypes,
        cohort,
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
    activeCohort,
    resolutionStatus,
    resolvedPatientIds,
  ]);

  const typesLoaded =
    Object.keys(counts).length > 0 &&
    Object.values(counts).some((v) => v !== 'loading');

  return (
    <Stack gap="lg" p="xl">
      <Title order={2}>Data Quality</Title>

      <Group justify="space-between" align="flex-end" wrap="wrap">
        <Group gap="md" align="flex-end" wrap="wrap">
          <ResourceTypeSelector
            types={types}
            value={resourceTypes}
            onChange={setResourceTypes}
          />
          <ActiveCohortSelect
            resolvedPatientCount={resolvedPatientCount}
            resolutionStatus={resolutionStatus}
          />
          <SampleSizeControl value={sampleSize} onChange={setSampleSize} />
        </Group>
        <Group gap="sm" wrap="wrap">
          <Text size="sm" c="dimmed">
            Last computed {formatRelative(lastComputed)}
          </Text>
          <Button
            variant="light"
            leftSection={<IconUsersGroup size={16} />}
            onClick={() => navigate('/quality/cohorts')}
            aria-label="Manage cohorts. Define, view, and activate patient cohorts."
          >
            Manage cohorts
          </Button>
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

      {hasZeroMatch && (
        <Alert
          color="yellow"
          icon={<IconAlertTriangle size={16} />}
          title="Active cohort matches 0 patients"
        >
          Panels are currently running unscoped (all patients). Review the
          cohort&apos;s criteria on the Cohorts page.{' '}
          <Anchor component={Link} to="/quality/cohorts" ml="xs">
            Open Cohorts page
          </Anchor>
        </Alert>
      )}

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
          <CompletenessPanel types={effectiveTypes} client={client} sampleSize={sampleSize} patientIds={scopedPatientIds} />
        </Tabs.Panel>
        <Tabs.Panel value="coverage" pt="md" keepMounted>
          <CodingCoveragePanel types={effectiveTypes} client={client} sampleSize={sampleSize} patientIds={scopedPatientIds} />
        </Tabs.Panel>
        <Tabs.Panel value="validation" pt="md" keepMounted>
          <ValidationPanel client={client} sampleSize={sampleSize} patientIds={scopedPatientIds} />
        </Tabs.Panel>
        <Tabs.Panel value="plausibility" pt="md" keepMounted>
          <PlausibilityPanel types={effectiveTypes} client={client} sampleSize={sampleSize} patientIds={scopedPatientIds} />
        </Tabs.Panel>
        <Tabs.Panel value="lab-ranges" pt="md" keepMounted>
          <LabRangesPanel client={client} sampleSize={sampleSize} patientIds={scopedPatientIds} />
        </Tabs.Panel>
        <Tabs.Panel value="duplicates" pt="md" keepMounted>
          <DuplicatesPanel types={effectiveTypes} client={client} sampleSize={sampleSize} patientIds={scopedPatientIds} />
        </Tabs.Panel>
        <Tabs.Panel value="references" pt="md" keepMounted>
          <ReferencesPanel types={effectiveTypes} client={client} sampleSize={sampleSize} patientIds={scopedPatientIds} />
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
