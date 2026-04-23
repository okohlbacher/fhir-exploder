/**
 * SummaryCard — one tile in the Data Quality OverviewStrip.
 *
 * Phase 30 Step 4 restyle (handoff/INSTRUCTIONS.md §Step 4): the prior
 * `RingProgress`-based layout is replaced with an uppercase label, big
 * tabular-numerals mono value, a 3-px `<Progress>` fill bar, and a compact
 * breach-state badge (`within` / `near` / `breach`) at the top-right.
 *
 * Props retained for backward compatibility with the current OverviewStrip
 * callsite:
 *   - `ringValue` still controls the fill-bar percentage; when omitted the
 *     bar is not rendered (used by the informational Total resources /
 *     Resource types tiles).
 *   - `breached` still drives the red accent and threshold subtitle.
 *   - `onClick` still makes the whole tile a semantic button.
 *   - `ariaLabel` still wraps the clickable tile.
 *
 * Backward compat: label, value, icon, subtitle text continue to render as
 * before so the `quality-overview.test.tsx` assertions (getByText on labels
 * and "X%" values) keep passing.
 */
import { Badge, Card, Group, Progress, Stack, Text } from '@mantine/core';
import type { ReactNode } from 'react';

export interface SummaryCardProps {
  label: string;
  value: string | number;
  icon: ReactNode;
  /** 0-100 — when provided, renders a 3-px horizontal fill bar beneath the value. */
  ringValue?: number;
  subtitle?: string;
  /** When true, value + fill bar turn red.6 and the breach badge reads "breach". */
  breached?: boolean;
  /** Rendered as "threshold: {N}%" subtitle when breached. */
  threshold?: number;
  /** When provided, wraps the Card as component="button" and invokes on click. */
  onClick?: () => void;
  /** aria-label override for clickable tiles. */
  ariaLabel?: string;
}

const MONO_NUMERIC = {
  fontFamily: 'var(--font-mono, var(--mantine-font-family-monospace))',
  fontVariantNumeric: 'tabular-nums' as const,
};

/**
 * Classify a metric value against its threshold into within / near / breach
 * for the top-right badge. `near` = not breached but within 10 pp of the
 * threshold (flags metrics trending toward breach).
 */
function classifyBreach(
  breached: boolean | undefined,
  ringValue: number | undefined,
  threshold: number | undefined,
): { label: string; color: string } | null {
  if (ringValue === undefined) return null;
  if (breached) return { label: 'breach', color: 'red' };
  if (threshold !== undefined && ringValue <= threshold + 10) {
    return { label: 'near', color: 'yellow' };
  }
  return { label: 'within', color: 'green' };
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
  const valueColor = breached ? 'red.6' : undefined;
  const barColor = breached ? 'red' : 'indigo';
  const badge = classifyBreach(breached, ringValue, threshold);

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
      <Stack gap={6} align="stretch">
        <Group gap="xs" wrap="nowrap" justify="space-between">
          <Group gap="xs" wrap="nowrap" style={{ minWidth: 0 }}>
            {icon}
            <Text
              size="xs"
              fw={600}
              tt="uppercase"
              lts="0.5px"
              c="dimmed"
              truncate
            >
              {label}
            </Text>
          </Group>
          {badge && (
            <Badge size="xs" color={badge.color} variant="light">
              {badge.label}
            </Badge>
          )}
        </Group>

        <Text fw={600} c={valueColor} style={{ ...MONO_NUMERIC, fontSize: 26, lineHeight: 1.1 }}>
          {value}
        </Text>

        {ringValue !== undefined && (
          <Progress
            value={Math.max(0, Math.min(100, ringValue))}
            color={barColor}
            size={3}
            radius="xl"
          />
        )}

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
    </Card>
  );
}
