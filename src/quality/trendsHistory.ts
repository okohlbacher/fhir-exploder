/**
 * trendsHistory — pure-data layer for Phase 19 quality trend snapshots +
 * PDF filename helpers.
 *
 * This module is intentionally dependency-free and contains no React, no
 * Mantine, no localStorage access. It defines:
 *   - The locked `QualitySnapshot` payload shape (D-02).
 *   - Persistence constants (`TRENDS_STORAGE_KEY`, `TRENDS_SOFT_LIMIT` per D-03/D-04).
 *   - `captureSnapshot` — pure factory that reads current metrics + active
 *     thresholds and produces a new snapshot.
 *   - `filterSnapshotsByServer` — exact-match filter for rendering the
 *     current server's chart only.
 *   - `serverUrlSlug` + `pdfFilename` — filesystem-safe filename builder
 *     for the PDF export (T-19-02 mitigation: strip [:/\\?#&]).
 *   - `computeBreachedFlag` — mirrors Phase 18 `isBreached` strict-less-than
 *     semantics for per-snapshot breach coloring in the mini-chart dot
 *     renderer.
 *
 * Downstream consumers (Plan 02 trend UI, Plan 03 PDF export) import from
 * this module. No hooks, no components are defined here.
 */
import type { MetricKey } from './thresholds';

/** localStorage key for the snapshot history array (D-03). */
export const TRENDS_STORAGE_KEY = 'quality.trends.v1';

/** Soft warning threshold before the user is nudged to clear history (D-04). */
export const TRENDS_SOFT_LIMIT = 500;

/**
 * Locked payload shape per D-02 + UI-SPEC Component Inventory, evolved in
 * Plan 21-04 (CHRT-04) with the Cohort → Resource-types rename:
 *
 * - `id`: `crypto.randomUUID()` — stable row key for React lists.
 * - `capturedAt`: `new Date().toISOString()` (UTC, Z-suffixed).
 * - `serverUrl`: verbatim current server URL (exact-match filter in Plan 02).
 * - `sampleSize`: SampleSizeControl value at capture (10..1000).
 * - `resourceTypes`: ResourceTypeSelector values at capture ([] = all
 *   resource types). Renamed from `cohort` in Phase 21; legacy snapshots
 *   with the old `cohort` field are normalized via `migrateSnapshot`.
 * - `cohortId` / `cohortName` / `cohortPatientCount`: denormalized cohort
 *   metadata at capture. `null`/undefined when no cohort was active. Plan
 *   21-06 will populate these when the dashboard is wired up; until then
 *   new captures write `cohortId: null`.
 * - `scores`: 7 "% clean" values (0..100). `null` means metric was
 *   unavailable at capture (disabled tab or error) — renders as "—" in UI.
 * - `thresholds`: threshold at capture (immutable history — users tuning
 *   thresholds later must NOT retroactively rewrite breach flags).
 *
 * @deprecated-field `cohort: string[]` — pre-Phase-21 field name for the
 *   resource-types list. Still recognized by `migrateSnapshot` when
 *   reading persisted snapshots; new captures never write it.
 */
export interface QualitySnapshot {
  id: string;
  capturedAt: string;
  serverUrl: string;
  sampleSize: number;
  resourceTypes: string[];
  cohortId: string | null;
  cohortName?: string;
  cohortPatientCount?: number;
  /** @deprecated Pre-Phase-21; readers use migrateSnapshot. */
  cohort?: string[];
  scores: Record<MetricKey, number | null>;
  thresholds: Record<MetricKey, number | null>;
}

/**
 * Shape the factory consumes from QualityMetricsContext. Kept as a plain
 * interface rather than coupling to the context type so the factory is
 * trivially unit-testable with a plain object.
 */
export interface MetricsReadSource {
  overallCompleteness: number | undefined;
  overallCoverage: number | undefined;
  overallValidation: number | undefined;
  overallPlausibility: number | undefined;
  overallLabRanges: number | undefined;
  overallDuplicates: number | undefined;
  overallReferences: number | undefined;
}

/**
 * Input to `captureSnapshot`. Plan 21-04 renames `cohort` → `resourceTypes`
 * and adds an optional `cohort` object that Plan 21-06 will populate with
 * the active cohort's id/name/patientCount. For backward compat during the
 * rename, the legacy `cohort: string[]` parameter is still accepted (with
 * the same meaning as `resourceTypes`); callers should migrate to the new
 * name and Phase 22 may remove the legacy form.
 */
export interface CaptureSnapshotParams {
  metrics: MetricsReadSource;
  serverUrl: string;
  sampleSize: number;
  /** Canonical field (Plan 21-04). */
  resourceTypes?: string[];
  /** @deprecated Legacy alias for `resourceTypes`. Removed in Phase 22. */
  cohort?: string[];
  /** Active cohort at capture; null or undefined when no cohort is active. */
  activeCohort?: {
    id: string;
    name: string;
    patientCount: number;
  } | null;
  getActiveThreshold: (key: MetricKey) => number | null;
}

/**
 * Ordered metric keys — matches `MetricKey` union declaration order in
 * `./thresholds` and guarantees deterministic `Object.keys(scores)` output
 * across platforms (Object property ordering in ES2015+ preserves insertion
 * order for string keys).
 */
const METRIC_KEYS: readonly MetricKey[] = [
  'completeness',
  'coverage',
  'validation',
  'plausibility',
  'labRanges',
  'duplicates',
  'references',
] as const;

export function captureSnapshot(params: CaptureSnapshotParams): QualitySnapshot {
  const {
    metrics,
    serverUrl,
    sampleSize,
    resourceTypes,
    cohort, // legacy alias (Plan 21-04 back-compat)
    activeCohort,
    getActiveThreshold,
  } = params;
  // Resolve the resource-type list with precedence: canonical wins over
  // the deprecated alias; both missing → empty array ("all types").
  const effectiveResourceTypes = resourceTypes ?? cohort ?? [];
  const rawScores: Record<MetricKey, number | undefined> = {
    completeness: metrics.overallCompleteness,
    coverage: metrics.overallCoverage,
    validation: metrics.overallValidation,
    plausibility: metrics.overallPlausibility,
    labRanges: metrics.overallLabRanges,
    duplicates: metrics.overallDuplicates,
    references: metrics.overallReferences,
  };
  const scores = Object.fromEntries(
    METRIC_KEYS.map((k) => [k, rawScores[k] ?? null]),
  ) as Record<MetricKey, number | null>;
  const thresholds = Object.fromEntries(
    METRIC_KEYS.map((k) => [k, getActiveThreshold(k)]),
  ) as Record<MetricKey, number | null>;
  return {
    id: crypto.randomUUID(),
    capturedAt: new Date().toISOString(),
    serverUrl,
    sampleSize,
    // Defensive copy — caller's array must not alias storage.
    resourceTypes: [...effectiveResourceTypes],
    cohortId: activeCohort?.id ?? null,
    cohortName: activeCohort?.name,
    cohortPatientCount: activeCohort?.patientCount,
    scores,
    thresholds,
  };
}

/**
 * Normalize a persisted snapshot shape across the Phase 21 rename.
 *
 * Contract:
 *   - Returns `null` for non-object inputs (`null`, `undefined`, strings,
 *     numbers, booleans) — protects readers against corrupt localStorage
 *     payloads (T-21-13).
 *   - Returns `null` when the resolved `resourceTypes` is not an array
 *     after considering both the canonical field and the legacy `cohort`
 *     alias. This catches tampered objects where either field is the
 *     wrong type.
 *   - Otherwise returns a QualitySnapshot with `resourceTypes` always an
 *     array (preferring the canonical field over the legacy alias), and
 *     `cohortId` defaulted to `null` when absent so the field is never
 *     undefined for downstream TypeScript consumers.
 *   - Never mutates the input. No logging (T-21-03: no PHI / patient IDs
 *     surface via console even when the shape is corrupt).
 */
export function migrateSnapshot(raw: unknown): QualitySnapshot | null {
  if (raw === null || raw === undefined) return null;
  if (typeof raw !== 'object') return null;
  const s = raw as Partial<QualitySnapshot> & { cohort?: unknown };

  // Prefer canonical field. Both may be present on mixed-era payloads.
  const candidate = s.resourceTypes ?? s.cohort;

  // Empty case: neither field present → treat as "all types" ([]).
  const resourceTypes = candidate === undefined ? [] : candidate;

  if (!Array.isArray(resourceTypes)) return null;

  // Normalize to a fresh object — never mutate the caller's reference,
  // never pass through the deprecated `cohort` field.
  const rest = s as Partial<QualitySnapshot>;
  return {
    ...rest,
    resourceTypes: [...resourceTypes],
    cohortId: s.cohortId ?? null,
    cohortName: s.cohortName,
    cohortPatientCount: s.cohortPatientCount,
  } as QualitySnapshot;
}

export function filterSnapshotsByServer(
  snapshots: QualitySnapshot[],
  serverUrl: string,
): QualitySnapshot[] {
  return snapshots.filter((s) => s.serverUrl === serverUrl);
}

/**
 * Produce a filesystem-safe slug from a server URL.
 *
 * Strips: scheme (http[s]://), trailing /fhir[/], and any of the chars in
 * the set `[:/\\?#&]` (path/query separators + Windows backslash). Trims
 * edge dashes and caps to 60 chars so the final filename stays well under
 * the 255-byte POSIX / 260-char Windows path limits.
 *
 * Returns `'unknown-server'` for empty input so a download from an
 * unconfigured app still produces a valid filename.
 *
 * Trust boundary (T-19-02): this function is the only sanitizer between
 * user-supplied `serverUrl` (from settings.yaml) and the suggested
 * download filename. Tests assert no forbidden char survives.
 */
export function serverUrlSlug(url: string): string {
  const cleaned = url
    .replace(/^https?:\/\//i, '')
    .replace(/\/fhir\/?$/i, '')
    .replace(/[:/\\?#&]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 60);
  return cleaned || 'unknown-server';
}

/**
 * Build the canonical PDF filename:
 *   `fhir-exploder-quality-report_[slug]_[YYYY-MM-DD]_[HHMMSS].pdf`
 *
 * The timestamp is UTC (derived from `Date.toISOString()` which always
 * returns UTC with a `Z` suffix) so the same snapshot produces the same
 * filename regardless of local timezone.
 */
export function pdfFilename(serverUrl: string, at: Date): string {
  const iso = at.toISOString(); // e.g. 2026-04-14T18:30:42.123Z
  const datePart = iso.slice(0, 10); // 2026-04-14
  const timePart = iso.slice(11, 19).replace(/:/g, ''); // 183042
  return `fhir-exploder-quality-report_${serverUrlSlug(serverUrl)}_${datePart}_${timePart}.pdf`;
}

/**
 * Strict-less-than breach check. Mirrors Phase 18 `isBreached(value, threshold)`:
 *   - `null`/`undefined` score OR null threshold → false (no breach)
 *   - equality → false (80 === 80 is not a breach)
 *   - score < threshold → true
 *
 * Used by the mini-chart dot renderer (UI-SPEC I-03) and the PDF breach
 * table to color per-snapshot indicators independently from the current
 * global threshold value.
 */
export function computeBreachedFlag(
  score: number | null | undefined,
  threshold: number | null,
): boolean {
  if (score == null) return false;
  if (threshold == null) return false;
  return score < threshold;
}
