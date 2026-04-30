/**
 * Central contract module for Phase 05 data quality dashboard.
 *
 * Wave 2 executors (Plans 02-05) MUST import from this file rather than
 * redefining shapes locally. Every exported interface here is a stable
 * contract that downstream panels, hooks, and walkers implement against.
 *
 * Source of truth:
 * - PerTypeCompletenessReport — Plan 03 (Completeness) produces; OverviewStrip aggregates
 * - PerTypeCoverageReport — Plan 04 (Coverage) produces; OverviewStrip aggregates
 * - ValidationBackend — Plan 05 (Validation) implements twice (structural + remote)
 * - QualityMetricsCacheEntry — wraps anything the metricsCache persists
 */
import type {
  CodeableConcept,
  OperationOutcomeIssue,
  Resource,
  StructureDefinition,
} from '@medplum/fhirtypes';

/** Shared count state triple used by useResourceCounts and summaries. */
export type CountValue = number | 'loading' | 'error';

/**
 * Per-type completeness aggregation (Plan 03 output).
 *
 * `populated / total` gives the percentage. `total === 0` means no MII
 * profile was found for this type AND there were no `min >= 1` fallback
 * paths — treat as N/A, exclude from the overall rollup.
 */
export interface PerTypeCompletenessReport {
  /** Count of field-instances populated across the sampled resources. */
  populated: number;
  /** sampleSize * requiredPaths.length — the denominator. */
  total: number;
  /** Per-path populated counts (diagnostic drill-down). */
  perPath: Record<string, number>;
  /** Number of resources inspected (bounded by sampleSize and server total). */
  sampleSize: number;
  /** Full-table total for the type (from `_summary=count`), or null if unknown. */
  totalForType: number | null;
  /** Canonical URL of the MII StructureDefinition used, or null for min>=1 fallback. */
  profileUrl: string | null;
  /** Per-resource missing-path data for drill-down (Phase 15). */
  perResource?: Array<{
    resourceId: string;
    resourceType: string;
    missingPaths: string[];
  }>;
}

/** Coverage classifier output for a single CodeableConcept field. */
export type CodedClassification = 'systemCode' | 'textOnly' | 'empty';

/** One CodeableConcept observation from classifyCodedFields. */
export interface ClassifiedCodedField {
  /** JSON path like `Condition.code` or `Observation.category[0]`. */
  path: string;
  classification: CodedClassification;
  value?: CodeableConcept;
}

/** Per-type coding coverage aggregation (Plan 04 output). */
export interface PerTypeCoverageReport {
  systemCode: number;
  textOnly: number;
  empty: number;
  /** systemCode + textOnly + empty — the denominator. */
  totalCodedFields: number;
  /** Per-path breakdown for drill-down UI. */
  perPath: Record<string, { systemCode: number; textOnly: number; empty: number }>;
  sampleSize: number;
  /**
   * One representative CodeableConcept per aggregation path, selected
   * deterministically in a single pass by `aggregateCoverage` (Phase 25
   * Plan 01, QDDEP-01). Preference order per path: the FIRST `systemCode`
   * observation wins; if none exist, the first non-null `textOnly`/`empty`
   * value is used. Key format matches `perPath` (stripped resourceType
   * prefix, `[\d+]` collapsed to `[*]`). Enables `CodingDrillDown` to
   * render example codings without issuing a second sample fetch.
   */
  perPathExamples: Record<string, CodeableConcept>;
  /** Per-resource coding issues for drill-down (Phase 15). */
  perResource?: Array<{
    resourceId: string;
    resourceType: string;
    issues: Array<{ path: string; classification: CodedClassification }>;
  }>;
}

/** Severity levels for normalized quality issues (Phase 15 drill-down). */
export type IssueSeverity = 'error' | 'warning' | 'info';

/** Common issue format that all quality panels normalize into for ResourceIssueTable (D-05). */
export interface NormalizedIssue {
  resourceId: string;
  resourceType: string;
  field: string;
  description: string;
  severity: IssueSeverity;
  /**
   * Raw FHIR `OperationOutcome.issue.code` (e.g., 'code-invalid', 'invariant',
   * 'required'). Added Phase 43 VAL-07 so downstream routers (e.g., the
   * semanticNearMissWalker) can predicate on the raw FHIR code without
   * re-parsing the human-display `description` string. Optional for
   * backward compatibility — the existing description squash format is
   * preserved verbatim, so no UI consumer breaks. See 43-RESEARCH.md
   * Pitfall 5.
   */
  code?: string;
}

/** Validation backend kind — structural runs offline, remote POSTs $validate. */
export type ValidationBackendKind = 'structural' | 'remote';

/**
 * Uniform validation contract. Plan 05 provides two implementations
 * (createStructuralBackend, createRemoteBackend). Consumers iterate
 * without caring which backend produced the issues.
 */
export interface ValidationBackend {
  kind: ValidationBackendKind;
  validate(resource: Resource, options?: { signal?: AbortSignal }): Promise<OperationOutcomeIssue[]>;
}

/**
 * Wrapper envelope persisted by QualityMetricsCache. `T` is one of the
 * per-type report types above (Completeness, Coverage, Validation).
 */
export interface QualityMetricsCacheEntry<T = unknown> {
  value: T;
  /** Epoch ms when the metric was computed. */
  computedAt: number;
  /** FHIR server URL the metric was computed against. */
  serverUrl: string;
  /** Resource type (e.g., 'Condition'). */
  resourceType: string;
  /** Sample size that produced this metric. */
  sampleSize: number;
}

/**
 * Triple-state wrapper for per-type reports as they stream in from the
 * concurrency-limited worker pool in Plans 03/04.
 */
export type PerTypeReport<T> = T | 'loading' | 'error';

// Re-export FHIR types for convenient single-import in Wave 2 modules.
export type { CodeableConcept, OperationOutcomeIssue, Resource, StructureDefinition };
