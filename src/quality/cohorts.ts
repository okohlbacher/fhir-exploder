/**
 * Cohorts domain module — pure types, storage-key constants, and helpers
 * for the Phase 21 interactive cohort builder (CHRT-01, CHRT-02, CHRT-04).
 *
 * Shape mirrors src/quality/thresholds.ts: no React, no Mantine, no async,
 * no MedplumClient imports. Async criterion resolution lives in the
 * forthcoming src/quality/cohortResolver.ts (Plan 21-02). The React-facing
 * localStorage binding + hydration gate live in src/hooks/useCohorts.ts
 * (Plan 21-02 / 21-04).
 *
 * Storage-key conventions (per 21-CONTEXT.md §Key Decisions +
 * 21-RESEARCH.md §Code Examples):
 *   - COHORTS_STORAGE_KEY        — real cohorts (new in v1.3)
 *   - RESOURCE_TYPES_STORAGE_KEY — target of the "Cohort" → "Resource types"
 *                                  rename (CHRT-04). Reads-migrate from
 *                                  LEGACY_COHORT_KEY on mount.
 *   - LEGACY_COHORT_KEY          — pre-rename resource-type list. Read once,
 *                                  copy-migrate, delete. Do NOT write here.
 *
 * Threat mitigations (see 21-PLAN.md §threat_model):
 *   - T-21-01 (Tampering/XSS): parsePatientRefs produces plain string[],
 *     never HTML. No dangerouslySetInnerHTML, no eval, no Function ctor.
 *   - T-21-02 (DoS): parsePatientRefs caps output at 10_000 unique IDs
 *     (Decision D-06). UI-level char cap (1MB) lives in the Textarea props
 *     added in Plan 21-05; this module is the defence-in-depth layer.
 */

// -----------------------------------------------------------------------------
// Criterion union — each entry is AND-composed at cohort-resolution time.
// Intersection semantics per 21-CONTEXT.md (Claude's Discretion → criterion
// semantics: Composition = AND).
// -----------------------------------------------------------------------------

export interface DateRangeCriterion {
  type: 'date-range';
  /** ISO date (YYYY-MM-DD) or null for open-ended lower bound. */
  start: string | null;
  /** ISO date (YYYY-MM-DD) or null for open-ended upper bound. */
  end: string | null;
}

export interface ConditionCodeCriterion {
  type: 'condition-code';
  /** e.g. 'http://snomed.info/sct' */
  system: string;
  /** e.g. '44054006' (diabetes) */
  code: string;
}

export interface ReferenceListCriterion {
  type: 'reference-list';
  /** Normalized bare IDs (no 'Patient/' prefix); already deduped + capped. */
  patientIds: string[];
}

export type CohortCriterion =
  | DateRangeCriterion
  | ConditionCodeCriterion
  | ReferenceListCriterion;

// -----------------------------------------------------------------------------
// CohortDefinition — the persisted shape that Phase 22 (edit/duplicate/delete)
// will reuse unchanged. `id` MUST be crypto.randomUUID() shaped so Phase 22
// operations and FHIRPath re-references work without a schema migration.
// -----------------------------------------------------------------------------

export interface CohortDefinition {
  /** crypto.randomUUID() — stable for Phase 22 edit/duplicate/delete. */
  id: string;
  /** User-supplied display name, unique within CohortsStorage.cohorts. */
  name: string;
  /** AND-composed criteria. Empty array = no-op cohort (returns all patients). */
  criteria: CohortCriterion[];
  /** ISO timestamp (new Date().toISOString()). */
  createdAt: string;
  /** ISO timestamp; updated on any criteria edit. Drives resolver cache key. */
  updatedAt: string;
}

export interface CohortsStorage {
  cohorts: CohortDefinition[];
  /** null = no cohort active (analyse all patients — D-04 default). */
  activeCohortId: string | null;
}

// -----------------------------------------------------------------------------
// Storage keys (per quality.X.vN convention established in
// PROJECT.md §"Key Decisions" + 21-CONTEXT.md §"Established Patterns").
// -----------------------------------------------------------------------------

export const COHORTS_STORAGE_KEY = 'quality.cohorts.v1';
export const RESOURCE_TYPES_STORAGE_KEY = 'quality.resourceTypes.v1';
export const LEGACY_COHORT_KEY = 'quality.cohort.v1';

export const DEFAULT_COHORTS_STORAGE: CohortsStorage = {
  cohorts: [],
  activeCohortId: null,
};

// -----------------------------------------------------------------------------
// Pure helpers
// -----------------------------------------------------------------------------

/**
 * Returns the currently-active cohort in `storage`, or `null` if none is
 * active or the stored activeCohortId doesn't correspond to a saved cohort.
 *
 * The "unknown id → null" branch matters for Phase 22 delete: if a cohort is
 * removed while active, findActiveCohort returns null and the dropdown will
 * fall back to "No cohort" without further coordination.
 */
export function findActiveCohort(storage: CohortsStorage): CohortDefinition | null {
  if (!storage.activeCohortId) return null;
  return storage.cohorts.find((c) => c.id === storage.activeCohortId) ?? null;
}

/**
 * Parses a raw Textarea string of patient references into a normalized,
 * deduped bare-ID array capped at 10,000 entries (Decision D-06).
 *
 * Accepted input shapes:
 *   - Line-separated:    "Patient/abc\nPatient/xyz\nbare-id"
 *   - Comma-separated:   "Patient/abc, Patient/xyz, bare-id"
 *   - Semicolon-sep:     "abc; xyz; another"
 *   - Mixed whitespace:  "abc\t xyz,  another\n\n bare-id"
 *
 * Normalisation:
 *   1. Split on /[\s,;]+/ (any whitespace, comma, or semicolon run).
 *   2. Trim each token; drop empties.
 *   3. Strip one leading "Patient/" prefix per token.
 *   4. Dedupe preserving first-occurrence order.
 *   5. Cap at 10_000 entries (T-21-02 defence-in-depth).
 *
 * Never produces HTML; callers can render results as plain text with no
 * escaping concern beyond normal React string interpolation.
 */
export function parsePatientRefs(raw: string): string[] {
  const tokens = raw
    .split(/[\s,;]+/)
    .map((t) => t.trim())
    .filter(Boolean);
  const ids = tokens.map((t) => t.replace(/^Patient\//, ''));
  return Array.from(new Set(ids)).slice(0, 10_000);
}
