/**
 * TrendMiniChart — Plan 19-02 Task 2.
 *
 * A single-metric card (320×200 default; 120×40 in `compact` mode used by
 * the PDF layout) that renders a Mantine `LineChart` with TWO series:
 *   1. `score` — solid monotone blue line, per-point custom dot via
 *      recharts `<Line dot={<BreachDot/>}>` escape hatch.
 *   2. `threshold` — dashed gray stepped line (per-snapshot thresholds
 *      per D-11 — NOT a static referenceLines at current threshold).
 *
 * Per-point BreachDot coloring (locked per D-12):
 *   - payload.threshold === null  → gray (disabled at capture)
 *   - payload.breached === true   → red (score < threshold)
 *   - otherwise                   → blue (ok)
 *   - payload.score === null      → render nothing (gap)
 *
 * Per-server shape rotation (UI-SPEC I-07) — when `includeOtherServers` is
 * ON and multiple distinct `serverUrl`s appear in the snapshot set, the dot
 * SHAPE varies per server: circle / outlined square / filled triangle /
 * outlined diamond, rotating by `serverIndex % 4`. This gives colorblind-
 * safe disambiguation between servers (shape, not color, is the channel).
 */
import { Card, Group, Paper, Stack, Text, VisuallyHidden } from '@mantine/core';
import { LineChart } from '@mantine/charts';
import {
  IconCircleCheck,
  IconClipboardCheck,
  IconCopy,
  IconLanguage,
  IconLink,
  IconMicroscope,
  IconShieldCheck,
} from '@tabler/icons-react';
import type { ReactNode } from 'react';
import { Line } from 'recharts';
import {
  METRIC_LABELS,
  type MetricKey,
} from '../../quality/thresholds';
import {
  computeBreachedFlag,
  serverUrlSlug,
  type QualitySnapshot,
} from '../../quality/trendsHistory';

const METRIC_ICONS: Record<MetricKey, ReactNode> = {
  completeness: <IconCircleCheck size={14} />,
  coverage: <IconLanguage size={14} />,
  validation: <IconShieldCheck size={14} />,
  plausibility: <IconClipboardCheck size={14} />,
  labRanges: <IconMicroscope size={14} />,
  duplicates: <IconCopy size={14} />,
  references: <IconLink size={14} />,
};

export interface TrendMiniChartProps {
  metric: MetricKey;
  snapshots: QualitySnapshot[];
  includeOtherServers: boolean;
  /**
   * When true, renders at 120×40 with all chrome stripped (no header strip,
   * no tooltip, no legend, no yAxis ticks, no VisuallyHidden summary). The
   * two-series chart config (score + stepped threshold) and BreachDot still
   * render identically — only chrome is suppressed. Used exclusively by
   * `PdfReportLayout` (Plan 03).
   */
  compact?: boolean;
}

interface TrendPoint {
  capturedAt: string;
  score: number | null;
  threshold: number | null;
  serverSlug: string;
  serverIndex: number;
  breached: boolean;
}

export interface BreachDotProps {
  cx?: number;
  cy?: number;
  payload?: TrendPoint;
  includeOtherServers: boolean;
}

export interface TrendPointForTest extends TrendPoint {}

// Exported for direct testing of the shape-rotation + breach-coloring logic
// without fighting recharts/jsdom rendering. See trends-panel.test.tsx test #13.
export function BreachDot(props: BreachDotProps) {
  const { cx, cy, payload, includeOtherServers } = props;
  if (cx == null || cy == null || payload == null || payload.score == null) {
    return null;
  }
  const fill =
    payload.threshold == null
      ? 'var(--mantine-color-gray-5)'
      : payload.breached
        ? 'var(--mantine-color-red-6)'
        : 'var(--mantine-color-blue-6)';
  const shapeIdx = includeOtherServers ? (payload.serverIndex ?? 0) % 4 : 0;
  if (shapeIdx === 0) {
    return (
      <circle
        cx={cx}
        cy={cy}
        r={4}
        fill={fill}
        stroke="white"
        strokeWidth={1}
        data-server-shape={shapeIdx}
      />
    );
  }
  if (shapeIdx === 1) {
    return (
      <rect
        x={cx - 4}
        y={cy - 4}
        width={8}
        height={8}
        fill="white"
        stroke={fill}
        strokeWidth={1.5}
        data-server-shape={shapeIdx}
      />
    );
  }
  if (shapeIdx === 2) {
    return (
      <polygon
        points={`${cx},${cy - 5} ${cx - 4.5},${cy + 3.5} ${cx + 4.5},${cy + 3.5}`}
        fill={fill}
        stroke="white"
        strokeWidth={1}
        data-server-shape={shapeIdx}
      />
    );
  }
  return (
    <polygon
      points={`${cx},${cy - 5} ${cx + 5},${cy} ${cx},${cy + 5} ${cx - 5},${cy}`}
      fill="white"
      stroke={fill}
      strokeWidth={1.5}
      data-server-shape={shapeIdx}
    />
  );
}

interface CustomTooltipProps {
  active?: boolean;
  payload?: Array<{ payload?: TrendPoint }>;
  includeOtherServers: boolean;
}

function CustomTooltip({ active, payload, includeOtherServers }: CustomTooltipProps) {
  if (!active || !payload || payload.length === 0) return null;
  const row = payload[0]?.payload;
  if (!row) return null;
  const timestamp = new Date(row.capturedAt).toLocaleString(undefined, {
    dateStyle: 'medium',
    timeStyle: 'medium',
  });
  const scoreText = row.score == null ? 'Score: —' : `Score: ${row.score}%`;
  const thresholdText =
    row.threshold == null ? 'Threshold: disabled' : `Threshold: ${row.threshold}%`;
  return (
    <Paper withBorder shadow="sm" p="xs" radius="sm">
      <Stack gap={2}>
        <Text size="xs" fw={600}>
          {timestamp}
        </Text>
        <Text size="xs">{scoreText}</Text>
        <Text size="xs" c="dimmed">
          {thresholdText}
        </Text>
        {row.breached ? (
          <Text size="xs" c="red.6" fw={600}>
            Breached
          </Text>
        ) : null}
        {includeOtherServers ? (
          <Text size="xs" c="dimmed">
            Server: {row.serverSlug}
          </Text>
        ) : null}
      </Stack>
    </Paper>
  );
}

export function TrendMiniChart({
  metric,
  snapshots,
  includeOtherServers,
  compact = false,
}: TrendMiniChartProps) {
  // Derive stable sorted list of unique servers for shape rotation.
  const sortedServers = Array.from(new Set(snapshots.map((s) => s.serverUrl))).sort();
  const chartData: TrendPoint[] = snapshots.map((s) => ({
    capturedAt: s.capturedAt,
    score: s.scores[metric],
    threshold: s.thresholds[metric],
    serverSlug: serverUrlSlug(s.serverUrl),
    serverIndex: sortedServers.indexOf(s.serverUrl),
    breached: computeBreachedFlag(s.scores[metric], s.thresholds[metric]),
  }));

  const latest = chartData.length > 0 ? chartData[chartData.length - 1]!.score : null;

  if (compact) {
    // PDF compact mode — strip all chrome.
    return (
      <Card
        withBorder
        radius="sm"
        padding={0}
        data-compact="true"
        style={{ width: 120, height: 40 }}
      >
        <LineChart
          h={40}
          data={chartData}
          dataKey="capturedAt"
          series={[
            { name: 'score', color: 'blue.6', label: METRIC_LABELS[metric] },
            {
              name: 'threshold',
              color: 'gray.6',
              label: 'Threshold',
              strokeDasharray: '4 4',
              curveType: 'step',
            },
          ]}
          curveType="monotone"
          connectNulls={false}
          withDots={false}
          withLegend={false}
          withTooltip={false}
          gridAxis="none"
        >
          <Line
            type="monotone"
            dataKey="score"
            stroke="var(--mantine-color-blue-6)"
            dot={<BreachDot includeOtherServers={includeOtherServers} />}
            isAnimationActive={false}
          />
        </LineChart>
      </Card>
    );
  }

  return (
    <Card
      withBorder
      radius="sm"
      padding="xs"
      style={{ width: '100%', maxWidth: 320, height: 200 }}
    >
      <Group
        gap="xs"
        bg="gray.0"
        p="xs"
        style={{ height: 32, borderRadius: 4 }}
      >
        {METRIC_ICONS[metric]}
        <Text size="sm" fw={600}>
          {METRIC_LABELS[metric]}
        </Text>
      </Group>
      <LineChart
        h={160}
        data={chartData}
        dataKey="capturedAt"
        series={[
          { name: 'score', color: 'blue.6', label: METRIC_LABELS[metric] },
          {
            name: 'threshold',
            color: 'gray.6',
            label: 'Threshold',
            strokeDasharray: '4 4',
            curveType: 'step',
          },
        ]}
        curveType="monotone"
        connectNulls={false}
        withDots={false}
        withLegend={false}
        withTooltip={true}
        yAxisProps={{ domain: [0, 100], ticks: [0, 50, 100] }}
        xAxisProps={{
          tickFormatter: (v: string) =>
            new Date(v).toLocaleDateString(undefined, {
              month: 'short',
              day: 'numeric',
            }),
          minTickGap: 24,
        }}
        valueFormatter={(v: number) => `${v}%`}
        tooltipProps={{
          content: (tooltipProps: unknown) => (
            <CustomTooltip
              {...(tooltipProps as CustomTooltipProps)}
              includeOtherServers={includeOtherServers}
            />
          ),
        }}
        gridAxis="x"
      >
        <Line
          type="monotone"
          dataKey="score"
          stroke="var(--mantine-color-blue-6)"
          dot={<BreachDot includeOtherServers={includeOtherServers} />}
          isAnimationActive={false}
        />
      </LineChart>
      <VisuallyHidden>
        <p>
          {METRIC_LABELS[metric]} across {snapshots.length} snapshots. Latest value:{' '}
          {latest == null ? 'no data' : `${latest}%`}.
        </p>
      </VisuallyHidden>
    </Card>
  );
}
