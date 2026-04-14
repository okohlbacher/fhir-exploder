/**
 * Thresholds domain module — single source of truth for the per-metric
 * quality alerting system shipped in Phase 18 (DQ-11, DQ-12).
 *
 * Stored override semantics (D-10):
 *   - undefined (absent key in stored object): fall back to DEFAULT_THRESHOLDS
 *   - null: explicitly disabled — no alerting for this metric
 *   - number: custom active threshold
 *
 * Why this matters: a naive spread-merge collapses `null` onto the default
 * (see pitfall 1 in 18-RESEARCH.md). resolveThreshold implements the
 * three-state precedence explicitly.
 */

export type MetricKey =
  | 'completeness'
  | 'coverage'
  | 'validation'
  | 'plausibility'
  | 'labRanges'
  | 'duplicates'
  | 'references';

export const METRIC_LABELS: Record<MetricKey, string> = {
  completeness: 'Completeness',
  coverage: 'Coding coverage',
  validation: 'Validation',
  plausibility: 'Plausibility',
  labRanges: 'Lab ranges',
  duplicates: 'Duplicates',
  references: 'References',
};

/** Maps MetricKey → Tabs.Tab `value` in QualityOverviewPage. Must stay in sync with Tabs values. */
export const METRIC_ROUTES: Record<MetricKey, string> = {
  completeness: 'completeness',
  coverage: 'coverage',
  validation: 'validation',
  plausibility: 'plausibility',
  labRanges: 'lab-ranges',
  duplicates: 'duplicates',
  references: 'references',
};

/** Shipped defaults per D-08 in 18-CONTEXT.md. Breaches show on first load without user setup. */
export const DEFAULT_THRESHOLDS: Record<MetricKey, number> = {
  completeness: 80,
  coverage: 70,
  validation: 95,
  plausibility: 99,
  labRanges: 95,
  duplicates: 99,
  references: 98,
};

/** localStorage key per D-09. Global scope — NOT keyed by server URL. */
export const STORAGE_KEY = 'quality.thresholds.v1';

export type Thresholds = Partial<Record<MetricKey, number | null>>;

export function resolveThreshold(key: MetricKey, stored: Thresholds): number | null {
  if (!(key in stored)) return DEFAULT_THRESHOLDS[key];
  const v = stored[key];
  if (v === null) return null;
  if (typeof v === 'number') return v;
  // Present but neither null nor number (e.g. a stale localStorage payload
  // where the value is literally `undefined`) — treat as absent and fall
  // back to the default. Keeps the three-state contract from the module
  // header honest: undefined means "no opinion", not "disabled".
  return DEFAULT_THRESHOLDS[key];
}

export function isBreached(value: number | undefined, threshold: number | null): boolean {
  return value != null && threshold != null && value < threshold;
}
