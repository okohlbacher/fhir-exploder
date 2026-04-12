/**
 * OverviewStrip — the 4-card summary strip at the top of /quality.
 *
 * Cards 1-2 read from the `summary` prop (feed by useQualityMetrics in the
 * parent page). Cards 3-4 read overallCompleteness / overallCoverage from
 * QualityMetricsContext — Plans 03/04 push these values via their own
 * hooks' setCompleteness / setCoverage calls. Before those hooks settle,
 * the context values are undefined and cards 3-4 render an em-dash. This
 * is the empty state, not the permanent state.
 *
 * OverviewStripProps intentionally has EXACTLY two members (summary,
 * isLoading). Cards 3-4 are NOT props — they come from context so Plans
 * 03/04 don't need to thread values through every parent.
 */
import { SimpleGrid, Skeleton } from '@mantine/core';
import {
  IconCircleCheck,
  IconDatabase,
  IconLanguage,
  IconListDetails,
} from '@tabler/icons-react';
import { SummaryCard } from './SummaryCard';
import type { CountSummary } from '../../quality/counts';
import { useQualityMetrics } from '../../quality/QualityMetricsContext';

export interface OverviewStripProps {
  summary: CountSummary;
  isLoading: boolean;
}

export function OverviewStrip({ summary, isLoading }: OverviewStripProps) {
  const { overallCompleteness, overallCoverage } = useQualityMetrics();

  if (isLoading) {
    return (
      <SimpleGrid cols={{ base: 1, sm: 2, md: 4 }} spacing="md">
        {[0, 1, 2, 3].map((i) => (
          <Skeleton key={i} height={96} radius="sm" />
        ))}
      </SimpleGrid>
    );
  }

  return (
    <SimpleGrid cols={{ base: 1, sm: 2, md: 4 }} spacing="md">
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
      <SummaryCard
        label="Overall completeness"
        value={overallCompleteness !== undefined ? `${overallCompleteness}%` : '—'}
        icon={<IconCircleCheck size={18} />}
        ringValue={overallCompleteness}
      />
      <SummaryCard
        label="Overall coding coverage"
        value={overallCoverage !== undefined ? `${overallCoverage}%` : '—'}
        icon={<IconLanguage size={18} />}
        ringValue={overallCoverage}
      />
    </SimpleGrid>
  );
}
