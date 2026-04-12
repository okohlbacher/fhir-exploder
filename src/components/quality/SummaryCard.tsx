/**
 * SummaryCard — one tile in the Data Quality OverviewStrip.
 *
 * Presentational only. Accepts a label, a big numeric/string value, an
 * icon, and an optional ringValue (0-100) that draws a RingProgress at
 * the right edge. Used for all four cards in OverviewStrip.
 */
import { Card, Group, RingProgress, Stack, Text } from '@mantine/core';
import type { ReactNode } from 'react';

export interface SummaryCardProps {
  label: string;
  value: string | number;
  icon: ReactNode;
  /** 0-100 — if provided, draws an 80px RingProgress. */
  ringValue?: number;
  subtitle?: string;
}

export function SummaryCard({ label, value, icon, ringValue, subtitle }: SummaryCardProps) {
  return (
    <Card padding="md" withBorder radius="sm">
      <Group justify="space-between" align="flex-start" wrap="nowrap">
        <Stack gap={4}>
          <Group gap="xs">
            {icon}
            <Text size="sm" fw={600}>
              {label}
            </Text>
          </Group>
          <Text size="xl" fw={700}>
            {value}
          </Text>
          {subtitle && (
            <Text size="xs" c="dimmed">
              {subtitle}
            </Text>
          )}
        </Stack>
        {ringValue !== undefined && (
          <RingProgress
            size={80}
            thickness={6}
            sections={[{ value: ringValue, color: 'blue.6' }]}
          />
        )}
      </Group>
    </Card>
  );
}
