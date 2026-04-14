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
 *
 * Layout (Phase 18 gap-closure — Option C):
 *   Vertical stack. Top = icon + label. Middle = either the RingProgress
 *   (with the numeric value rendered INSIDE the ring via the `label` slot)
 *   OR a large-text value when no ring is requested. Bottom = subtitle
 *   and/or breach-threshold annotation. Vertical stacking keeps the ring
 *   visible even at the 9-column `xl` breakpoint where tiles are ~130px
 *   wide — the old horizontal `Group wrap="nowrap"` layout clipped the
 *   80px ring via the Card's default `overflow: hidden`.
 */
import { Card, Group, RingProgress, Stack, Text } from '@mantine/core';
import type { ReactNode } from 'react';

export interface SummaryCardProps {
  label: string;
  value: string | number;
  icon: ReactNode;
  /** 0-100 — if provided, draws an 80px RingProgress with the value as its centered label. */
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

  const hasRing = ringValue !== undefined;

  return (
    <Card padding="md" withBorder radius="sm" {...cardProps}>
      <Stack gap="xs" align="stretch">
        <Group gap="xs" wrap="nowrap">
          {icon}
          <Text size="sm" fw={600}>
            {label}
          </Text>
        </Group>

        {hasRing ? (
          <Group justify="center">
            <RingProgress
              size={80}
              thickness={6}
              sections={[{ value: ringValue, color: ringColor }]}
              label={
                <Text ta="center" size="sm" fw={700} c={valueColor}>
                  {value}
                </Text>
              }
            />
          </Group>
        ) : (
          <Text size="xl" fw={700} c={valueColor}>
            {value}
          </Text>
        )}

        {subtitle && (
          <Text size="xs" c="dimmed" ta={hasRing ? 'center' : 'left'}>
            {subtitle}
          </Text>
        )}
        {breached && threshold !== undefined && (
          <Text size="xs" c="dimmed" ta={hasRing ? 'center' : 'left'}>
            threshold: {threshold}%
          </Text>
        )}
      </Stack>
    </Card>
  );
}
