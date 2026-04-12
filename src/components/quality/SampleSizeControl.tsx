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
import { NumberInput } from '@mantine/core';
import { useLocalStorage } from '@mantine/hooks';

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
      label="Sample size"
      description="First N resources of each type are inspected. Increase for accuracy; decrease for speed."
      min={MIN}
      max={MAX}
      step={10}
      value={value}
      onChange={(v) => onChange(typeof v === 'number' ? v : Number(v) || DEFAULT)}
      aria-label="Sample size"
    />
  );
}
