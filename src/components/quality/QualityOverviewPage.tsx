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
import { IconAdjustmentsAlt, IconRefresh } from '@tabler/icons-react';
import { useMemo } from 'react';
import { useNavigate, useOutletContext, useSearchParams } from 'react-router-dom';
import { notifications } from '@mantine/notifications';
import type { QualityOutletContext } from './QualityLayout';
import { parseResourceTypes } from '../../fhir/capability';
import { useQualityMetrics } from '../../hooks/useQualityMetrics';
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
import { CohortSelector } from './CohortSelector';

const VALID_TABS = new Set([
  'counts',
  'completeness',
  'coverage',
  'validation',
  'plausibility',
  'lab-ranges',
  'duplicates',
  'references',
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

  const [cohortTypes, setCohortTypes] = useLocalStorage<string[]>({
    key: 'quality.cohort.v1',
    defaultValue: [],
  });
  const effectiveTypes = cohortTypes.length > 0 ? cohortTypes : types;

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

  const { counts, summary, lastComputed, recompute } = useQualityMetrics(client, types);

  const handleRecompute = () => {
    recompute();
    notifications.show({
      color: 'blue',
      title: 'Recomputing',
      message: 'Re-fetching counts…',
    });
  };

  const typesLoaded =
    Object.keys(counts).length > 0 &&
    Object.values(counts).some((v) => v !== 'loading');

  return (
    <Stack gap="lg" p="xl">
      <Title order={2}>Data Quality</Title>

      <Group justify="space-between" align="flex-end">
        <Group gap="md" align="flex-end">
          <CohortSelector types={types} value={cohortTypes} onChange={setCohortTypes} />
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
      </Tabs>
    </Stack>
  );
}
