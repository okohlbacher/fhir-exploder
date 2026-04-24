/**
 * MetricTile — per-metric tile components wrapped by OverviewStrip.
 *
 * Each Tile subscribes to EXACTLY ONE metric via its specific
 * use<Metric>Rollup() hook. This is load-bearing for EFF-R14-04:
 * Plan 32-04's Profiler test asserts per-tile render isolation, which
 * requires that a setCompleteness() update re-renders ONLY
 * CompletenessTile — if any tile subscribed to multiple hooks, it
 * would re-render on every metric update.
 *
 * MetricTile({ metricKey }) dispatches to the specific tile; each
 * specific tile component is tiny and does its own hook + render.
 */
import { useNavigate } from 'react-router-dom';
import { SummaryCard } from './SummaryCard';
import { useThresholds } from '../../hooks/useThresholds';
import { METRIC_LABELS, METRIC_ROUTES, type MetricKey } from '../../quality/thresholds';
import {
  useCompletenessRollup,
  useCoverageRollup,
  useValidationRollup,
  usePlausibilityRollup,
  useLabRangesRollup,
  useReferencesRollup,
  useDuplicatesRollup,
} from '../../quality/metrics';
import type { ReactNode } from 'react';

interface TileRenderProps {
  metricKey: MetricKey;
  icon: ReactNode;
  value: number | undefined;
}

/** Shared component — each per-metric tile supplies `value` from its own
 *  use<Metric>Rollup() hook; TileShell handles the uniform render path
 *  (breach coloring, aria label, navigate) without subscribing to any
 *  per-metric context itself. */
function TileShell({ metricKey, icon, value }: TileRenderProps) {
  const { isBreached, getActiveThreshold } = useThresholds();
  const navigate = useNavigate();
  const threshold = getActiveThreshold(metricKey);
  const breached = isBreached(metricKey, value);
  const label = METRIC_LABELS[metricKey];
  const tabRoute = METRIC_ROUTES[metricKey];
  const ariaLabel =
    value === undefined
      ? `${label}: no data yet. Click to open ${label} tab.`
      : breached
        ? `${label}: ${value}%, breached, threshold: ${threshold}%. Click to open ${label} tab.`
        : `${label}: ${value}%. Click to open ${label} tab.`;
  return (
    <SummaryCard
      label={label}
      value={value !== undefined ? `${value}%` : '—'}
      icon={icon}
      ringValue={value}
      breached={breached}
      threshold={breached && threshold !== null ? threshold : undefined}
      onClick={() => navigate(`/quality?tab=${tabRoute}`)}
      ariaLabel={ariaLabel}
    />
  );
}

function CompletenessTile({ icon }: { icon: ReactNode }) {
  const { value } = useCompletenessRollup();
  return <TileShell metricKey="completeness" icon={icon} value={value} />;
}
function CoverageTile({ icon }: { icon: ReactNode }) {
  const { value } = useCoverageRollup();
  return <TileShell metricKey="coverage" icon={icon} value={value} />;
}
function ValidationTile({ icon }: { icon: ReactNode }) {
  const { value } = useValidationRollup();
  return <TileShell metricKey="validation" icon={icon} value={value} />;
}
function PlausibilityTile({ icon }: { icon: ReactNode }) {
  const { value } = usePlausibilityRollup();
  return <TileShell metricKey="plausibility" icon={icon} value={value} />;
}
function LabRangesTile({ icon }: { icon: ReactNode }) {
  const { value } = useLabRangesRollup();
  return <TileShell metricKey="labRanges" icon={icon} value={value} />;
}
function ReferencesTile({ icon }: { icon: ReactNode }) {
  const { value } = useReferencesRollup();
  return <TileShell metricKey="references" icon={icon} value={value} />;
}
function DuplicatesTile({ icon }: { icon: ReactNode }) {
  // Special shape: read .overall (not .value) from useDuplicatesRollup
  const { overall } = useDuplicatesRollup();
  return <TileShell metricKey="duplicates" icon={icon} value={overall} />;
}

export function MetricTile({ metricKey, icon }: { metricKey: MetricKey; icon: ReactNode }) {
  switch (metricKey) {
    case 'completeness': return <CompletenessTile icon={icon} />;
    case 'coverage': return <CoverageTile icon={icon} />;
    case 'validation': return <ValidationTile icon={icon} />;
    case 'plausibility': return <PlausibilityTile icon={icon} />;
    case 'labRanges': return <LabRangesTile icon={icon} />;
    case 'references': return <ReferencesTile icon={icon} />;
    case 'duplicates': return <DuplicatesTile icon={icon} />;
  }
}
