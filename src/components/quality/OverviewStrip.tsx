/**
 * OverviewStrip — the 9-tile summary strip at the top of /quality.
 *
 * Layout (per UI-SPEC.md Layout Contract):
 *   Tiles 1-2: Informational (Total resources, Resource types) — fed by `summary` prop, not clickable.
 *   Tiles 3-9: Metric tiles in Kahn order (completeness, coverage, validation, plausibility,
 *              lab ranges, duplicates, references) — value from QualityMetricsContext, threshold
 *              from useThresholds, breach computed via isBreached, click navigates to /quality?tab=...
 *
 * Per D-12 only OVERALL scores breach-color; per-type rows inside panels are untouched.
 * Per D-14 undefined values render as em-dash via SummaryCard (no breach signal).
 * Per D-15 breaches are visual-only — no toasts, no banners.
 * Per D-16 every metric tile is clickable and deep-links into the corresponding tab.
 */
import { SimpleGrid, Skeleton } from '@mantine/core';
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
import type { ReactNode } from 'react';
import { useNavigate } from 'react-router-dom';
import { SummaryCard } from './SummaryCard';
import type { CountSummary } from '../../quality/counts';
import { useQualityMetrics } from '../../quality/QualityMetricsContext';
import { useThresholds } from '../../hooks/useThresholds';
import {
  METRIC_LABELS,
  METRIC_ROUTES,
  type MetricKey,
} from '../../quality/thresholds';

export interface OverviewStripProps {
  summary: CountSummary;
  isLoading: boolean;
}

const METRIC_ORDER: MetricKey[] = [
  'completeness',
  'coverage',
  'validation',
  'plausibility',
  'labRanges',
  'duplicates',
  'references',
];

const METRIC_ICONS: Record<MetricKey, ReactNode> = {
  completeness: <IconCircleCheck size={18} />,
  coverage: <IconLanguage size={18} />,
  validation: <IconShieldCheck size={18} />,
  plausibility: <IconClipboardCheck size={18} />,
  labRanges: <IconMicroscope size={18} />,
  duplicates: <IconCopy size={18} />,
  references: <IconLink size={18} />,
};

const GRID_COLS = { base: 1, xs: 2, sm: 3, md: 4, lg: 5, xl: 9 };

export function OverviewStrip({ summary, isLoading }: OverviewStripProps) {
  const metrics = useQualityMetrics();
  const { isBreached, getActiveThreshold } = useThresholds();
  const navigate = useNavigate();

  if (isLoading) {
    return (
      <SimpleGrid cols={GRID_COLS} spacing="sm">
        {Array.from({ length: 9 }, (_, i) => (
          <Skeleton key={i} height={96} radius="sm" />
        ))}
      </SimpleGrid>
    );
  }

  const metricValueOf = (key: MetricKey): number | undefined => {
    switch (key) {
      case 'completeness':
        return metrics.overallCompleteness;
      case 'coverage':
        return metrics.overallCoverage;
      case 'validation':
        return metrics.overallValidation;
      case 'plausibility':
        return metrics.overallPlausibility;
      case 'labRanges':
        return metrics.overallLabRanges;
      case 'duplicates':
        return metrics.overallDuplicates;
      case 'references':
        return metrics.overallReferences;
    }
  };

  return (
    <SimpleGrid cols={GRID_COLS} spacing="sm">
      {/* Tiles 1-2: informational (NOT clickable, no onClick prop) */}
      <SummaryCard
        label="Total resources"
        value={summary.total.toLocaleString()}
        icon={<IconDatabase size={18} />}
      />
      <SummaryCard
        label="Resource types"
        value={summary.typeCount}
        icon={<IconListDetails size={18} />}
      />

      {/* Tiles 3-9: metric tiles, all clickable, all breach-aware */}
      {METRIC_ORDER.map((key) => {
        const value = metricValueOf(key);
        const threshold = getActiveThreshold(key);
        const breached = isBreached(key, value);
        const label = METRIC_LABELS[key];
        const tabRoute = METRIC_ROUTES[key];

        // aria-label per UI-SPEC Copywriting Contract
        const ariaLabel =
          value === undefined
            ? `${label}: no data yet. Click to open ${label} tab.`
            : breached
              ? `${label}: ${value}%, breached, threshold: ${threshold}%. Click to open ${label} tab.`
              : `${label}: ${value}%. Click to open ${label} tab.`;

        return (
          <SummaryCard
            key={key}
            label={label}
            value={value !== undefined ? `${value}%` : '—'}
            icon={METRIC_ICONS[key]}
            ringValue={value}
            breached={breached}
            threshold={breached && threshold !== null ? threshold : undefined}
            onClick={() => navigate(`/quality?tab=${tabRoute}`)}
            ariaLabel={ariaLabel}
          />
        );
      })}
    </SimpleGrid>
  );
}
