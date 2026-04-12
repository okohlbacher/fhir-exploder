/**
 * Cache key helpers for the quality metrics cache.
 *
 * Key format: `{serverUrl}|{metric}|{resourceType}|{sampleSize}`.
 *
 * The serverUrl prefix namespaces entries per Blaze server so a
 * settings.yaml URL swap does not surface stale metrics from a different
 * server. Mirrors the Phase 4 TerminologyCache key convention.
 */

export const LOCAL_STORAGE_PREFIX = 'quality-metrics:v1:';

export type QualityMetricKind = 'counts' | 'completeness' | 'coverage' | 'validation';

export function buildMetricsKey(
  serverUrl: string,
  resourceType: string,
  sampleSize: number,
  metric: QualityMetricKind,
): string {
  return `${serverUrl}|${metric}|${resourceType}|${sampleSize}`;
}
