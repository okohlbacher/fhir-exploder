/**
 * SummaryCard — one tile in the Data Quality OverviewStrip.
 *
 * Phase 18 adds breach signaling: when `breached={true}`, the ring color
 * flips from blue.6 to red.6 and the numeric value renders in red. The
 * optional `threshold` prop renders a "threshold: {N}%" annotation, but
 * ONLY when `breached={true}` — the annotation is context for the alert,
 * not a permanent label.
 *
 * When `onClick` is provided, the Card becomes a button (component="button")
 * so the whole tile is clickable — per UI-SPEC I-05 for the 7 metric tiles
 * in OverviewStrip. Informational tiles (Total/Types) omit onClick and
 * remain plain Cards.
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
  /** When true, ring + value turn red.6 (Phase 18 / DQ-12). */
  breached?: boolean;
  /** Rendered as "threshold: {N}%" subtitle when breached. */
  threshold?: number;
  /** When provided, wraps the Card as component="button" and invokes on click. */
  onClick?: () => void;
  /** aria-label override for clickable tiles (e.g., "Completeness: 72%, breached..."). */
  ariaLabel?: string;
}

export function SummaryCard({
  label,
  value,
  icon,
  ringValue,
  subtitle,
  breached,
  threshold,
  onClick,
  ariaLabel,
}: SummaryCardProps) {
  const ringColor = breached ? 'red.6' : 'blue.6';
  const valueColor = breached ? 'red.6' : undefined;

  const cardProps = onClick
    ? ({
        component: 'button' as const,
        type: 'button' as const,
        onClick,
        'aria-label': ariaLabel,
        style: { cursor: 'pointer', textAlign: 'left' as const, width: '100%' },
      } as const)
    : {};

  return (
    <Card padding="md" withBorder radius="sm" {...cardProps}>
      <Group justify="space-between" align="flex-start" wrap="nowrap">
        <Stack gap={4}>
          <Group gap="xs">
            {icon}
            <Text size="sm" fw={600}>
              {label}
            </Text>
          </Group>
          <Text size="xl" fw={700} c={valueColor}>
            {value}
          </Text>
          {subtitle && (
            <Text size="xs" c="dimmed">
              {subtitle}
            </Text>
          )}
          {breached && threshold !== undefined && (
            <Text size="xs" c="dimmed">
              threshold: {threshold}%
            </Text>
          )}
        </Stack>
        {ringValue !== undefined && (
          <RingProgress
            size={80}
            thickness={6}
            sections={[{ value: ringValue, color: ringColor }]}
          />
        )}
      </Group>
    </Card>
  );
}
