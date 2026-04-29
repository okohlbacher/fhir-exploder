/**
 * SampleSizeControl — Mantine NumberInput bound to localStorage for the
 * Data Quality Dashboard sample-size setting.
 *
 * Persistence key: `quality.sampleSize.v1`.
 * Range: 10..1000 (T-05-03 mitigation — prevents accidental full-table scans).
 * Default: 100.
 *
 * Debouncing is intentionally NOT in the control — the downstream Wave 2
 * hooks (useCompletenessReport, useCodingCoverage) apply useDebouncedValue
 * on the raw sample size in their own effects so they can coordinate with
 * their own worker pools. The control just exposes a stateless
 * value/onChange pair.
 */
import { Group, NumberInput, Text, Tooltip } from '@mantine/core';
import { useLocalStorage } from '@mantine/hooks';
import { IconInfoCircle } from '@tabler/icons-react';

const KEY = 'quality.sampleSize.v1';
const DEFAULT = 100;
const MIN = 10;
const MAX = 1000;

function clamp(n: number): number {
  if (!Number.isFinite(n)) return DEFAULT;
  return Math.max(MIN, Math.min(MAX, Math.floor(n)));
}

/**
 * Hook for the sample-size value. Always returns a value within [MIN,MAX];
 * setter clamps inputs before persisting.
 */
export function useSampleSize(): [number, (n: number) => void] {
  const [raw, setRaw] = useLocalStorage<number>({ key: KEY, defaultValue: DEFAULT });
  const clamped = clamp(Number(raw));
  return [clamped, (n: number) => setRaw(clamp(n))];
}

export interface SampleSizeControlProps {
  value: number;
  onChange: (n: number) => void;
}

export function SampleSizeControl({ value, onChange }: SampleSizeControlProps) {
  return (
    <NumberInput
      label={
        <Group gap={4} wrap="nowrap">
          <Text size="sm" fw={500} component="span">Sample size</Text>
          <Tooltip
            label="First N resources of each type are inspected. Increase for accuracy; decrease for speed."
            multiline
            w={260}
            withArrow
          >
            <IconInfoCircle
              size={14}
              style={{ cursor: 'help', color: 'var(--mantine-color-dimmed)' }}
              aria-label="Sample size help"
            />
          </Tooltip>
        </Group>
      }
      min={MIN}
      max={MAX}
      step={10}
      value={value}
      onChange={(v) => {
        const n = typeof v === 'number' ? v : Number(v);
        onChange(Number.isFinite(n) && n >= MIN ? n : MIN);
      }}
      aria-label="Sample size"
    />
  );
}
