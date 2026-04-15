/**
 * PdfReportLayout — Plan 19-03 Task 1.
 *
 * Off-screen layout rendered into an invisible portal by `exportQualityPdf`
 * at fixed 816×1056 pixels (US-Letter @ 96 DPI). Each page is captured to
 * PNG by `html-to-image.toPng`, then assembled into a multi-page PDF via
 * `jsPDF.addImage` + `addPage`.
 *
 * Page layout (UI-SPEC I-09):
 *   - Page 1: Cover — title, captured timestamp, server URL, sample size,
 *             cohort summary, `Local checks` badge.
 *   - Page 2: Overview — 3×3 grid of 9 SummaryCards (Total + Types + 7 metric
 *             rings at 232×200) + count totals + italic "no trend history"
 *             fallback when snapshots.length < 2.
 *   - Page 3 (conditional): Trends — 7 compact TrendMiniChart renders at
 *             120×40 each + summary line of capture date range.
 *
 * Every page has a bottom footer: `Generated <iso> · FHIR Exploder v<version>`
 * on the left, `Page N of total` on the right, in 12px gray-6.
 *
 * All DOM sizing is inline style (NOT Mantine variants) so html-to-image
 * captures deterministic pixel dimensions regardless of theme. See
 * RESEARCH.md Pattern 2.
 */
import {
  forwardRef,
  type ReactNode,
  type Ref,
  type RefObject,
} from 'react';
import { Badge, Card, Divider, Group, Stack, Text, Title } from '@mantine/core';
import {
  IconCircleCheck,
  IconClipboardCheck,
  IconCopy,
  IconDatabase,
  IconLanguage,
  IconLink,
  IconListDetails,
  IconMicroscope,
  IconShieldCheck,
} from '@tabler/icons-react';
import { METRIC_LABELS, type MetricKey } from '../../quality/thresholds';
import type { QualitySnapshot } from '../../quality/trendsHistory';
import { SummaryCard } from './SummaryCard';
import { TrendMiniChart } from './TrendMiniChart';

const METRIC_ORDER: readonly MetricKey[] = [
  'completeness',
  'coverage',
  'validation',
  'plausibility',
  'labRanges',
  'duplicates',
  'references',
] as const;

const METRIC_ICONS: Record<MetricKey, ReactNode> = {
  completeness: <IconCircleCheck size={18} />,
  coverage: <IconLanguage size={18} />,
  validation: <IconShieldCheck size={18} />,
  plausibility: <IconClipboardCheck size={18} />,
  labRanges: <IconMicroscope size={18} />,
  duplicates: <IconCopy size={18} />,
  references: <IconLink size={18} />,
};

const PAGE_WIDTH = 816;
const PAGE_HEIGHT = 1056;
const PAGE_PADDING = 48;
const FONT_STACK =
  '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif';

/**
 * Shape the PDF layout consumes for the overview page. `totalResources`
 * and `distinctTypes` feed the two informational tiles (1-2). `totals`
 * feeds the 7 metric SummaryCards (ring values).
 */
export interface CountSummary {
  totalResources: number;
  distinctTypes: number;
  totals: Record<MetricKey, number | undefined>;
}

/**
 * Plan 21-04: `cohort: string[]` renamed to `resourceTypes: string[]` (the
 * existing field has always held the dashboard's resource-type filter
 * list, CHRT-04). New optional `cohort` object carries the real cohort at
 * capture — rendered as a second informational line on the cover page
 * when non-null (wired in Plan 21-06).
 */
export interface PdfReportLayoutProps {
  snapshots: QualitySnapshot[];
  summary: CountSummary;
  sampleSize: number;
  resourceTypes: string[];
  cohort?: { id: string; name: string; patientCount: number } | null;
  thresholds: Record<MetricKey, number | null>;
  serverUrl: string;
  capturedAt: Date;
  appVersion: string;
  coverPageRef: RefObject<HTMLDivElement | null>;
  overviewPageRef: RefObject<HTMLDivElement | null>;
  trendsPageRef: RefObject<HTMLDivElement | null>;
}

interface PdfPageProps {
  children: ReactNode;
  pageNumber: number;
  totalPages: number;
  capturedAt: Date;
  appVersion: string;
}

const PdfPage = forwardRef<HTMLDivElement, PdfPageProps>(function PdfPage(
  { children, pageNumber, totalPages, capturedAt, appVersion }: PdfPageProps,
  ref: Ref<HTMLDivElement>,
) {
  return (
    <div
      ref={ref}
      style={{
        width: PAGE_WIDTH,
        height: PAGE_HEIGHT,
        padding: PAGE_PADDING,
        background: '#ffffff',
        fontFamily: FONT_STACK,
        boxSizing: 'border-box',
        position: 'relative',
      }}
    >
      <div
        style={{
          height: PAGE_HEIGHT - 2 * PAGE_PADDING - 48,
          overflow: 'hidden',
        }}
      >
        {children}
      </div>
      <div
        style={{
          position: 'absolute',
          bottom: 24,
          left: PAGE_PADDING,
          right: PAGE_PADDING,
          borderTop: '1px solid var(--mantine-color-gray-2)',
          paddingTop: 6,
          display: 'flex',
          justifyContent: 'space-between',
          fontSize: 12,
          color: 'var(--mantine-color-gray-6)',
          lineHeight: 1.4,
        }}
      >
        <span>
          Generated {capturedAt.toISOString()} · FHIR Exploder v{appVersion}
        </span>
        <span>
          Page {pageNumber} of {totalPages}
        </span>
      </div>
    </div>
  );
});

export { PdfPage };

function formatResourceTypes(resourceTypes: string[], totalTypes: number): string {
  if (resourceTypes.length === 0) return `All ${totalTypes} resource types`;
  if (resourceTypes.length === 1) return `1 resource type: ${resourceTypes[0]}`;
  if (resourceTypes.length < 4)
    return `${resourceTypes.length} of ${totalTypes}: ${resourceTypes.join(', ')}`;
  return `${resourceTypes.length} of ${totalTypes}: ${resourceTypes[0]}, ${resourceTypes[1]}, ${resourceTypes[2]}, and ${resourceTypes.length - 3} more`;
}

export function PdfReportLayout(props: PdfReportLayoutProps) {
  const {
    snapshots,
    summary,
    sampleSize,
    resourceTypes,
    cohort,
    thresholds,
    serverUrl,
    capturedAt,
    appVersion,
    coverPageRef,
    overviewPageRef,
    trendsPageRef,
  } = props;
  const hasTrends = snapshots.length >= 2;
  const totalPages = hasTrends ? 3 : 2;
  const resourceTypesLine = formatResourceTypes(
    resourceTypes,
    summary.distinctTypes,
  );

  return (
    <>
      {/* Page 1: Cover */}
      <PdfPage
        ref={coverPageRef}
        pageNumber={1}
        totalPages={totalPages}
        capturedAt={capturedAt}
        appVersion={appVersion}
      >
        <Stack gap="lg">
          <Title order={1} fz={28} fw={600}>
            FHIR Exploder — Quality Report
          </Title>
          <Divider />
          <Stack gap="xs">
            <Text size="sm">
              Captured:{' '}
              {capturedAt.toLocaleString(undefined, {
                dateStyle: 'medium',
                timeStyle: 'medium',
              })}
            </Text>
            <Text size="sm">Server: {serverUrl}</Text>
            <Text size="sm">Sample size: {sampleSize} resources per type</Text>
            <Text size="sm">Resource types: {resourceTypesLine}</Text>
            {cohort != null && (
              <Text size="sm">
                Cohort: &quot;{cohort.name}&quot; (
                {cohort.patientCount.toLocaleString()} patients)
              </Text>
            )}
            <Group gap="xs">
              <Text size="sm">Quality backend:</Text>
              <Badge color="gray" variant="light" size="sm">
                Local checks
              </Badge>
            </Group>
          </Stack>
        </Stack>
      </PdfPage>

      {/* Page 2: Overview — 3×3 fixed grid of 9 SummaryCards */}
      <PdfPage
        ref={overviewPageRef}
        pageNumber={2}
        totalPages={totalPages}
        capturedAt={capturedAt}
        appVersion={appVersion}
      >
        <Stack gap="lg">
          <Title order={2}>Overview</Title>
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(3, 232px)',
              gap: 8,
            }}
          >
            {/* Tile 1: Total resources */}
            <SummaryCard
              label="Total resources"
              value={summary.totalResources.toLocaleString()}
              icon={<IconDatabase size={18} />}
            />
            {/* Tile 2: Distinct resource types */}
            <SummaryCard
              label="Resource types"
              value={summary.distinctTypes}
              icon={<IconListDetails size={18} />}
            />
            {/* Tiles 3-9: one SummaryCard per metric with ring + breach */}
            {METRIC_ORDER.map((k) => {
              const value = summary.totals[k];
              const thr = thresholds[k];
              const breached =
                value != null && thr != null && value < thr;
              return (
                <SummaryCard
                  key={k}
                  label={METRIC_LABELS[k]}
                  value={value !== undefined ? `${value}%` : '—'}
                  icon={METRIC_ICONS[k]}
                  ringValue={value}
                  breached={breached}
                  threshold={breached && thr !== null ? thr : undefined}
                />
              );
            })}
          </div>
          <Stack gap={2}>
            <Text size="sm">
              Total resources on server: {summary.totalResources}
            </Text>
            <Text size="sm">Distinct resource types: {summary.distinctTypes}</Text>
          </Stack>
          {!hasTrends && (
            <Text size="xs" c="dimmed" fs="italic">
              No trend history — capture snapshots on the Trends tab to include
              them in future reports.
            </Text>
          )}
        </Stack>
      </PdfPage>

      {/* Page 3: Trends (conditional) */}
      {hasTrends && (
        <PdfPage
          ref={trendsPageRef}
          pageNumber={3}
          totalPages={totalPages}
          capturedAt={capturedAt}
          appVersion={appVersion}
        >
          <Stack gap="lg">
            <Title order={2}>Trends</Title>
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(4, 176px)',
                gap: 8,
              }}
            >
              {METRIC_ORDER.map((k) => (
                <Card
                  key={k}
                  withBorder
                  radius="sm"
                  padding="xs"
                  style={{ width: 176, height: 180 }}
                >
                  <Group gap={4} mb={4}>
                    {METRIC_ICONS[k]}
                    <Text size="xs" fw={600}>
                      {METRIC_LABELS[k]}
                    </Text>
                  </Group>
                  <TrendMiniChart
                    metric={k}
                    snapshots={snapshots}
                    includeOtherServers={false}
                    compact
                  />
                </Card>
              ))}
            </div>
            <Text size="sm" c="dimmed">
              {snapshots.length} snapshots captured between{' '}
              {new Date(snapshots[0].capturedAt).toLocaleDateString()} and{' '}
              {new Date(
                snapshots[snapshots.length - 1].capturedAt,
              ).toLocaleDateString()}
            </Text>
          </Stack>
        </PdfPage>
      )}
    </>
  );
}

// Re-export for import sites that only want the types.
export type { PdfPageProps };
