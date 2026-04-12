import { Badge, Group, Paper, Text } from '@mantine/core';

import { formatTimelineDate, type TimelineData } from '../../utils/timeline-utils';

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
 */
export function TimelineEntry({ entry, onClick }: TimelineEntryProps) {
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
