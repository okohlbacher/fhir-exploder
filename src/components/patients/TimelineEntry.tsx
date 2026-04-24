import { Badge, Group, Paper, Text } from '@mantine/core';

import { formatTimelineDate, type TimelineData } from '../../utils/timeline-utils';
import { resolveMiiIcon } from '../../utils/mii-icons';

interface TimelineEntryProps {
  entry: TimelineData;
  onClick: () => void;
}

/**
 * Single clinical timeline entry card (D-07).
 *
 * Layout follows the 03-UI-SPEC Timeline Entry Structure: a fixed-width
 * date column on the left, followed by a Paper card whose left border is
 * colored to match the resource type. Clicking the card navigates to
 * the resource detail view (D-08); the wiring is provided by the parent.
 *
 * Plan 34-04 MII-EXT-11: a 14px Tabler icon leads the typeLabel Badge,
 * colored via CSS var to match the module's badgeColor. Missing/unknown
 * iconKey renders no icon (no crash, layout preserved).
 */
export function TimelineEntry({ entry, onClick }: TimelineEntryProps) {
  const Icon = resolveMiiIcon(entry.iconKey);
  return (
    <Group gap="md" align="flex-start" wrap="nowrap">
      <Text size="sm" c="dimmed" w={100} style={{ flexShrink: 0 }}>
        {formatTimelineDate(entry.date)}
      </Text>
      <Paper
        p="sm"
        withBorder
        style={{
          borderLeft: `3px solid var(--mantine-color-${entry.color}-6)`,
          cursor: 'pointer',
          flex: 1,
        }}
        onClick={onClick}
      >
        <Group gap="sm">
          {Icon ? (
            <Icon
              size={14}
              color={`var(--mantine-color-${entry.color}-6)`}
              aria-hidden
            />
          ) : null}
          <Badge color={entry.color} variant="light">
            {entry.typeLabel}
          </Badge>
          <Text size="sm">{entry.summary}</Text>
        </Group>
        <Text size="xs" c="dimmed">
          {entry.resourceType}/{entry.resourceId}
        </Text>
      </Paper>
    </Group>
  );
}
