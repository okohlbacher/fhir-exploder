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
  validate(resource: Resource): Promise<OperationOutcomeIssue[]>;
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
