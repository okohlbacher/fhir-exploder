/**
 * TrendOverlayChart — Plan 19-02 Task 2.
 *
 * Single 7-series overlay LineChart (h=420) — one monotone series per
 * MetricKey, using Mantine's categorical shade-6 palette for colorblind-
 * safe differentiation. No breach coloring, no threshold lines (D-09 +
 * UI-SPEC I-06 — overlaying 7 stepped thresholds + 7 scores would be
 * visual noise).
 *
 * Per-server shape rotation (UI-SPEC I-07): when `includeOtherServers` is
 * ON and snapshots span 2+ distinct servers, each dot SHAPE varies per
 * server via `serverIndex % 4` (circle / outlined square / filled triangle /
 * outlined diamond). Otherwise, default filled-circle dots.
 */
import { LineChart } from '@mantine/charts';
import { Line } from 'recharts';
import { METRIC_LABELS } from '../../quality/thresholds';
import type { QualitySnapshot } from '../../quality/trendsHistory';

export interface TrendOverlayChartProps {
  snapshots: QualitySnapshot[];
  includeOtherServers: boolean;
}

const OVERLAY_SERIES = [
  { name: 'completeness', color: 'blue.6', label: METRIC_LABELS.completeness },
  { name: 'coverage', color: 'grape.6', label: METRIC_LABELS.coverage },
  { name: 'validation', color: 'teal.6', label: METRIC_LABELS.validation },
  { name: 'plausibility', color: 'orange.6', label: METRIC_LABELS.plausibility },
  { name: 'labRanges', color: 'cyan.6', label: METRIC_LABELS.labRanges },
  { name: 'duplicates', color: 'pink.6', label: METRIC_LABELS.duplicates },
  { name: 'references', color: 'indigo.6', label: METRIC_LABELS.references },
] as const;

interface OverlayPoint {
  capturedAt: string;
  completeness: number | null;
  coverage: number | null;
  validation: number | null;
  plausibility: number | null;
  labRanges: number | null;
  duplicates: number | null;
  references: number | null;
  serverIndex: number;
}

interface ServerShapeDotProps {
  cx?: number;
  cy?: number;
  payload?: OverlayPoint;
  fill?: string;
}

function makeServerShapeDot(color: string) {
  function ServerShapeDot(props: ServerShapeDotProps) {
    const { cx, cy, payload } = props;
    if (cx == null || cy == null || payload == null) return null;
    const shapeIdx = (payload.serverIndex ?? 0) % 4;
    const cssColor = `var(--mantine-color-${color.replace('.', '-')})`;
    if (shapeIdx === 0) {
      return (
        <circle
          cx={cx}
          cy={cy}
          r={4}
          fill={cssColor}
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
          stroke={cssColor}
          strokeWidth={1.5}
          data-server-shape={shapeIdx}
        />
      );
    }
    if (shapeIdx === 2) {
      return (
        <polygon
          points={`${cx},${cy - 5} ${cx - 4.5},${cy + 3.5} ${cx + 4.5},${cy + 3.5}`}
          fill={cssColor}
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
        stroke={cssColor}
        strokeWidth={1.5}
        data-server-shape={shapeIdx}
      />
    );
  }
  return ServerShapeDot;
}

export function TrendOverlayChart({
  snapshots,
  includeOtherServers,
}: TrendOverlayChartProps) {
  const sortedServers = Array.from(new Set(snapshots.map((s) => s.serverUrl))).sort();
  const overlayData: OverlayPoint[] = snapshots.map((s) => ({
    capturedAt: s.capturedAt,
    completeness: s.scores.completeness,
    coverage: s.scores.coverage,
    validation: s.scores.validation,
    plausibility: s.scores.plausibility,
    labRanges: s.scores.labRanges,
    duplicates: s.scores.duplicates,
    references: s.scores.references,
    serverIndex: sortedServers.indexOf(s.serverUrl),
  }));

  // Only activate shape rotation when user opted in AND multiple servers exist.
  const applyShapeRotation = includeOtherServers && sortedServers.length > 1;

  return (
    <div data-testid="trend-overlay-chart">
      <LineChart
        h={420}
        data={overlayData}
        dataKey="capturedAt"
        series={OVERLAY_SERIES as unknown as typeof OVERLAY_SERIES[number][]}
        curveType="monotone"
        connectNulls={false}
        withDots={!applyShapeRotation}
        withLegend={true}
        legendProps={{ verticalAlign: 'top', height: 36 }}
        withTooltip={true}
        yAxisProps={{ domain: [0, 100], ticks: [0, 25, 50, 75, 100] }}
        xAxisProps={{
          tickFormatter: (v: string) =>
            new Date(v).toLocaleDateString(undefined, {
              month: 'short',
              day: 'numeric',
            }),
          minTickGap: 24,
        }}
        valueFormatter={(v: number) => `${v}%`}
        gridAxis="xy"
      >
        {applyShapeRotation
          ? OVERLAY_SERIES.map((s) => {
              const DotComponent = makeServerShapeDot(s.color);
              return (
                <Line
                  key={s.name}
                  type="monotone"
                  dataKey={s.name}
                  stroke={`var(--mantine-color-${s.color.replace('.', '-')})`}
                  dot={<DotComponent />}
                  isAnimationActive={false}
                />
              );
            })
          : null}
      </LineChart>
    </div>
  );
}
