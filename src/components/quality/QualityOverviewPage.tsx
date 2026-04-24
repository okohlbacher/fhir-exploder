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
import {
  Alert,
  Anchor,
  Button,
  Card,
  Group,
  SimpleGrid,
  Stack,
  Tabs,
  Text,
  Title,
} from '@mantine/core';
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
import {
  useCompletenessRollup,
  useCoverageRollup,
  useValidationRollup,
  usePlausibilityRollup,
  useLabRangesRollup,
  useReferencesRollup,
  useDuplicatesRollup,
} from '../../quality/metrics';
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

/**
 * Phase 30 Step 4 — render a Tabs.Tab label with an inline overall-%
 * badge when the metric has been computed, or a bare label otherwise.
 * The handoff proposed a raw issue count next to each tab; the context
 * currently exposes only overall percentages, so we surface those (the
 * most analytically meaningful number available) until per-tab issue
 * totals are plumbed into QualityMetricsContext.
 */
function metricTabLabel(label: string, overall: number | undefined): string {
  if (overall === undefined) return label;
  return `${label} · ${overall}%`;
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

  // Plan 21-06: cohort resolver state
  // Phase 23 Plan 05 (CLOSE-06 Bug A): moved above the useResourceCountsMetrics
  // call so scopedPatientIds can be passed into it and the OverviewStrip tiles
  // 'Total resources' / 'Resource types' re-compute on cohort activation.
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

  // Phase 23 Plan 05: scopedPatientIds is now threaded into the metrics hook
  // so the OverviewStrip tiles re-fetch scoped counts when a cohort activates.
  const { counts, summary, lastComputed, recompute } = useResourceCountsMetrics(
    client,
    types,
    scopedPatientIds,
  );

  // Plan 19-03: capture snapshot + export PDF handlers (facade read for bulk).
  const metrics = useQualityMetrics();
  // Phase 32 (EFF-R14): per-metric hooks feed the 7 tab labels below so a
  // single metric update re-renders only its tab label, not all 7.
  const completeness = useCompletenessRollup();
  const coverage = useCoverageRollup();
  const validation = useValidationRollup();
  const plausibility = usePlausibilityRollup();
  const labRanges = useLabRangesRollup();
  const references = useReferencesRollup();
  const duplicates = useDuplicatesRollup();
  const { getActiveThreshold } = useThresholds();
  const { snapshots, append } = useTrendsHistory();
  const [exporting, setExporting] = useState(false);

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
      {/* Phase 30 Step 4 redesign: toolbar split into Tier 1 (scope Card,
          3-col grid) and Tier 2 (right-aligned actions row under the title).
          Keeps every handler and button label unchanged so existing
          quality-overview test contracts still pass. */}
      <Group justify="space-between" align="flex-start" wrap="wrap">
        <Title order={2}>Data Quality</Title>
        <Group gap="sm" wrap="wrap" justify="flex-end">
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

      {/* Tier 1 — scope selection. 3-col SimpleGrid on md+, stacks on sm. */}
      <Card p="sm" radius="md">
        <SimpleGrid cols={{ base: 1, md: 3 }} spacing="md">
          <ResourceTypeSelector
            types={types}
            value={resourceTypes}
            onChange={setResourceTypes}
          />
          <Stack gap={4} style={{ minWidth: 0 }}>
            <ActiveCohortSelect
              resolvedPatientCount={resolvedPatientCount}
              resolutionStatus={resolutionStatus}
            />
            <Button
              variant="subtle"
              size="compact-xs"
              leftSection={<IconUsersGroup size={12} />}
              onClick={() => navigate('/quality/cohorts')}
              aria-label="Manage cohorts. Define, view, and activate patient cohorts."
              style={{ alignSelf: 'flex-start' }}
            >
              Manage cohorts
            </Button>
          </Stack>
          <SampleSizeControl value={sampleSize} onChange={setSampleSize} />
        </SimpleGrid>
      </Card>

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

      {/*
        QDDEP-04 (Plan 25-04): parent-level keep-mount flag flipped to `false`.
        Mantine TabsPanel OR-combines the parent flag with its own: the parent
        default of `true` forces every panel to stay rendered regardless of a
        panel's own prop (verified against the installed Mantine source). Only
        panels that need to unmount on tab switch (Completeness + Coverage --
        see the two dropped panel props below) get the behavior change. All
        other panels retain an explicit panel-level flag to opt back in.
      */}
      <Tabs
        value={activeTab}
        onChange={handleTabChange}
        keepMounted={false}
        variant="pills"
      >
        <Tabs.List>
          <Tabs.Tab value="counts">Counts</Tabs.Tab>
          <Tabs.Tab value="completeness">
            {metricTabLabel('Completeness', completeness.value)}
          </Tabs.Tab>
          <Tabs.Tab value="coverage">
            {metricTabLabel('Coding Coverage', coverage.value)}
          </Tabs.Tab>
          <Tabs.Tab value="validation">
            {metricTabLabel('Validation', validation.value)}
          </Tabs.Tab>
          <Tabs.Tab value="plausibility">
            {metricTabLabel('Plausibility', plausibility.value)}
          </Tabs.Tab>
          <Tabs.Tab value="lab-ranges">
            {metricTabLabel('Lab Ranges', labRanges.value)}
          </Tabs.Tab>
          <Tabs.Tab value="duplicates">
            {metricTabLabel('Duplicates', duplicates.overall)}
          </Tabs.Tab>
          <Tabs.Tab value="references">
            {metricTabLabel('References', references.value)}
          </Tabs.Tab>
          <Tabs.Tab value="trends">Trends</Tabs.Tab>
        </Tabs.List>

        <Tabs.Panel value="counts" pt="md" keepMounted>
          <ResourceCountsPanel counts={counts} />
        </Tabs.Panel>
        {/* QDDEP-04: prop dropped so panel unmounts on tab switch and Completeness sampling does not run in the background */}
        <Tabs.Panel value="completeness" pt="md">
          <CompletenessPanel types={effectiveTypes} client={client} sampleSize={sampleSize} patientIds={scopedPatientIds} />
        </Tabs.Panel>
        {/* QDDEP-04: prop dropped so panel unmounts on tab switch and Coding Coverage sampling does not run in the background */}
        <Tabs.Panel value="coverage" pt="md">
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
