/**
 * OverviewStrip — the 9-tile summary strip at the top of /quality.
 *
 * Layout (per UI-SPEC.md Layout Contract):
 *   Tiles 1-2: Informational (Total resources, Resource types) — fed by `summary` prop, not clickable.
 *   Tiles 3-9: Metric tiles in Kahn order (completeness, coverage, validation, plausibility,
 *              lab ranges, duplicates, references) — each rendered as a <MetricTile/> that
 *              subscribes to exactly ONE per-metric context for render isolation.
 *
 * Phase 32 (EFF-R14) split: the metric-value switch previously in this file
 * has moved into the 7 leaf tile components inside MetricTile.tsx. Each
 * leaf subscribes to ONE per-metric hook; setCompleteness(42) re-renders
 * only CompletenessTile — verified by Plan 32-04's Profiler test.
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
import { SummaryCard } from './SummaryCard';
import type { CountSummary } from '../../quality/counts';
import { MetricTile } from './MetricTile';
import type { MetricKey } from '../../quality/thresholds';

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
  if (isLoading) {
    return (
      <SimpleGrid cols={GRID_COLS} spacing="sm">
        {Array.from({ length: 9 }, (_, i) => (
          <Skeleton key={i} height={96} radius="sm" />
        ))}
      </SimpleGrid>
    );
  }

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

      {/* Tiles 3-9: per-metric tiles — each subscribes to exactly ONE hook */}
      {METRIC_ORDER.map((key) => (
        <MetricTile key={key} metricKey={key} icon={METRIC_ICONS[key]} />
      ))}
    </SimpleGrid>
  );
}
