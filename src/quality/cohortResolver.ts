/**
 * cohortResolver — async CohortDefinition → Patient ID set.
 *
 * Plan 21-02 Task 2.2. Takes a `CohortDefinition` (types from
 * `./cohorts`), resolves each criterion against Blaze via MedplumClient,
 * AND-intersects the resulting Patient ID sets, and returns a de-duped
 * `string[]` consumed by Plan 21-03 (`sampleResources`) and Plan 21-06
 * (dashboard dropdown activation).
 *
 * Design decisions (sourced from 21-CONTEXT.md + 21-RESEARCH.md):
 *   - D-05: date-range criterion applies to Encounter.period ONLY. Single
 *     FHIR query: `Encounter?date=geYYYY-MM-DD&date=leYYYY-MM-DD
 *     &_elements=subject&_count=1000`.
 *   - Condition-code criterion uses the FHIR token "pipe form":
 *     `Condition?code=system|code&_elements=subject&_count=1000`. Forces
 *     explicit system (MII data spans ICD-10-GM / SNOMED / LOINC).
 *   - reference-list criterion is trusted — already parsed + capped +
 *     deduped by `parsePatientRefs` (Plan 21-01). No server roundtrip.
 *   - AND-intersection: smallest set first, short-circuit on miss.
 *   - D-06: per-criterion 10 000-ID hard cap (matches parsePatientRefs).
 *   - Per-cohort result cache keyed on `cohort.id + cohort.updatedAt`. A
 *     cohort-builder "Save" bumps `updatedAt`, invalidating naturally.
 *     Matches the `QualityMetricsCache` module-scope pattern in
 *     `useCompletenessReport.ts`.
 *
 * Threat mitigations (see 21-PLAN.md §threat_model):
 *   - T-21-05 (URL injection): all criterion values passed as object
 *     properties to `client.searchResourcePages(...)`. Medplum serializes
 *     via `URLSearchParams` — never string-concatenated into the URL.
 *     The `system|code` pipe-join is constructed from two form-bound
 *     inputs; no user-controlled separator.
 *   - T-21-03 (PHI in logs): error/warn messages reference COUNTS only,
 *     never patient IDs or references. Malformed-subject path uses
 *     `console.warn('…skipped N…')`.
 *   - T-21-02 (DoS): criterion loops break at `ids.size >= 10_000`.
 *     reference-list input already capped upstream.
 *
 * NOT in this module:
 *   - UI state / React bindings (those live in useCohorts / dashboard).
 *   - Panel-level scoping (that's Plan 21-03 `sampleResources`).
 *   - FHIRPath cohorts (Phase 22 / CHRT-05).
 */
import type { MedplumClient, QueryTypes } from '@medplum/core';
import type { Resource } from '@medplum/fhirtypes';
import type { CohortCriterion, CohortDefinition } from './cohorts';
import {
  PREFIX_FOR_OPERATOR,
  SEARCH_PARAM_MAP,
  translateFhirpath,
} from './fhirpathTranslator';

const MAX_IDS_PER_CRITERION = 10_000;
const DEFAULT_PAGE_COUNT = '1000';

/**
 * Module-scoped resolution cache.
 *
 * Key = cohort.id. Value = { updatedAt, ids }. A resolve call re-uses
 * cached IDs iff the stored `updatedAt` matches the incoming cohort's
 * `updatedAt`. This means editing a cohort (which MUST bump `updatedAt`
 * per CohortDefinition contract in Plan 21-01) invalidates the cache
 * automatically without explicit invalidation calls from callers.
 *
 * Cleared explicitly on server-URL change (Plan 21-06 will wire a
 * `clearCohortResolutionCache()` call into the settings-updated effect).
 */
const resolvedCache = new Map<string, { updatedAt: string; ids: string[] }>();

/** Empty the module-scoped resolver cache — called on server-URL change. */
export function clearCohortResolutionCache(): void {
  resolvedCache.clear();
}

/**
 * Resolve a CohortDefinition into the AND-intersected set of Patient IDs.
 *
 * Caching: If `resolvedCache` holds an entry for `cohort.id` with a
 * matching `updatedAt`, returns the cached IDs without re-querying. This
 * keeps dashboard activation O(1) for an unchanged cohort.
 *
 * Empty-cohort semantics:
 *   - No criteria → returns `[]` (nothing to intersect; an inactive
 *     cohort should never reach this function, but we fail safe).
 *   - Any server-queried criterion returns an empty set → cohort is
 *     immediately empty (AND intersection can never grow).
 *   - reference-list alone → returns the (already-deduped) patient IDs.
 */
export async function resolveCohort(
  client: MedplumClient,
  cohort: CohortDefinition,
): Promise<string[]> {
  const cached = resolvedCache.get(cohort.id);
  if (cached && cached.updatedAt === cohort.updatedAt) {
    return cached.ids;
  }

  if (cohort.criteria.length === 0) {
    resolvedCache.set(cohort.id, { updatedAt: cohort.updatedAt, ids: [] });
    return [];
  }

  const sets: Set<string>[] = [];
  for (const c of cohort.criteria) {
    const set = await resolveCriterion(client, c);
    // Short-circuit: a server-queried criterion yielding zero subjects
    // means the AND-intersection is empty. reference-list is skipped
    // here because an empty user-provided list should not collapse the
    // cohort to zero — callers typically treat empty reference-lists as
    // "no constraint applied", but per D-06 we keep the strict AND
    // semantic (a declared reference-list criterion with 0 patientIds
    // IS a zero-patient constraint).
    if (set.size === 0) {
      resolvedCache.set(cohort.id, { updatedAt: cohort.updatedAt, ids: [] });
      return [];
    }
    sets.push(set);
  }

  // Smallest-first for best-case short-circuit on `every`.
  sets.sort((a, b) => a.size - b.size);
  const smallest = sets[0]!;
  const rest = sets.slice(1);
  const result: string[] = [];
  for (const id of smallest) {
    if (rest.every((s) => s.has(id))) {
      result.push(id);
    }
  }

  resolvedCache.set(cohort.id, { updatedAt: cohort.updatedAt, ids: result });
  return result;
}

/**
 * Resolve a single criterion to the set of Patient IDs that match it.
 *
 * - `date-range` → Encounter search over `Encounter.period` (D-05).
 *   Emits `date=geSTART&date=leEND` via an ARRAY param so Medplum's
 *   URLSearchParams-backed serializer repeats the key (FHIR R4 §date
 *   semantics for AND-bounded ranges).
 * - `condition-code` → Condition search with `code=system|code` pipe form.
 * - `reference-list` → local Set construction, no server query.
 */
async function resolveCriterion(
  client: MedplumClient,
  c: CohortCriterion,
): Promise<Set<string>> {
  if (c.type === 'reference-list') {
    return new Set(c.patientIds);
  }

  if (c.type === 'fhirpath') {
    // Re-translate on every resolve — the cached `translatedQuery` on the
    // criterion object is a UI-only convenience (populated by Validate
    // click; cleared on edit). The resolver stays deterministic by always
    // running the translator, which keeps behaviour identical between the
    // "opened the cohort editor and saved without re-validating" path and
    // the "loaded from storage and activated without visiting the editor"
    // path. The translator is pure and cheap (~1ms per call). TranslationError
    // propagates to resolveCohort's caller — the UI is expected to
    // pre-validate via the Validate button (Plan 22-03 S1/S7).
    const tq = translateFhirpath(c.expression);
    const sp = SEARCH_PARAM_MAP[tq.resourceType]?.[tq.fieldPath];
    if (!sp) {
      // T-22-05 mitigation: no patient IDs in the error message.
      throw new Error(
        `Unsupported field: ${tq.resourceType}.${tq.fieldPath}`,
      );
    }
    const value = `${PREFIX_FOR_OPERATOR[tq.operator]}${String(tq.literal.value)}`;
    const params: Record<string, string | string[]> = {
      [sp.searchParam]: value,
      _elements: sp.elements,
      _count: DEFAULT_PAGE_COUNT,
    };
    // Patient-rooted searches: the resource IS the Patient. Pull `id`
    // directly via collectIdField. Encounter/Condition/Observation return
    // non-Patient resources; fall back to the existing Phase-21
    // collectSubjectPatientIds (which extracts `subject.reference`).
    if (sp.elements === 'id' && tq.resourceType === 'Patient') {
      return await collectIdField(client, tq.resourceType, params);
    }
    return await collectSubjectPatientIds(
      client,
      tq.resourceType as 'Encounter' | 'Condition',
      params,
    );
  }

  if (c.type === 'date-range') {
    const params: Record<string, string | string[]> = {
      _elements: 'subject',
      _count: DEFAULT_PAGE_COUNT,
    };
    const dates: string[] = [];
    if (c.start) dates.push(`ge${c.start}`);
    if (c.end) dates.push(`le${c.end}`);
    if (dates.length === 0) {
      // Both bounds null → no meaningful query. Return empty set;
      // resolveCohort short-circuits to an empty cohort.
      return new Set();
    }
    params.date = dates;
    return await collectSubjectPatientIds(client, 'Encounter', params);
  }

  if (c.type === 'condition-code') {
    const params: Record<string, string | string[]> = {
      _elements: 'subject',
      _count: DEFAULT_PAGE_COUNT,
      code: `${c.system}|${c.code}`,
    };
    return await collectSubjectPatientIds(client, 'Condition', params);
  }

  // Exhaustiveness — if a new CohortCriterion variant is added without a
  // matching branch above, TS flags this line at compile time with
  // "Argument of type 'X' is not assignable to parameter of type 'never'".
  const _exhaustive: never = c;
  throw new Error(
    `Unhandled criterion type: ${JSON.stringify(_exhaustive)}`,
  );
}

/**
 * Paginate a `searchResourcePages` generator and collect unique Patient
 * IDs from each resource's `subject.reference`. Stops at MAX_IDS_PER_CRITERION.
 *
 * Malformed subject handling:
 *   - Missing `subject` → skipped silently (common on bad data).
 *   - Non-Patient reference type (e.g., Group) → skipped silently; a
 *     Condition.subject can legitimately point at a Group per FHIR R4,
 *     so this isn't an error condition.
 *   - Malformed reference string → counted and surfaced via a single
 *     `console.warn` after the iteration completes.
 *
 * Per T-21-03: the warn message contains counts only, NEVER reference
 * strings.
 */
async function collectSubjectPatientIds(
  client: MedplumClient,
  resourceType: 'Encounter' | 'Condition',
  params: Record<string, string | string[]>,
): Promise<Set<string>> {
  const ids = new Set<string>();
  let malformed = 0;
  // `QueryTypes` declares `Record<string, string | number | boolean | undefined>`
  // (no array values) but at runtime Medplum hands the object to
  // `URLSearchParams(...)` which coerces arrays to comma-joined strings.
  // Our date-range criterion needs repeated `date=` params for an AND-bounded
  // FHIR search, which means passing an array here is the correct runtime
  // shape — the mock test locks this contract explicitly. We narrow the cast
  // at the call boundary rather than looseningly typing the local param.
  for await (const page of client.searchResourcePages(
    resourceType,
    params as unknown as QueryTypes,
  )) {
    for (const r of page as Resource[]) {
      const ref = (r as { subject?: { reference?: string } }).subject
        ?.reference;
      if (typeof ref !== 'string' || ref.length === 0) {
        // Missing subject is common for malformed source data; silent skip.
        continue;
      }
      const parts = ref.split('/');
      if (parts.length !== 2 || !parts[0] || !parts[1]) {
        malformed += 1;
        continue;
      }
      const [type, id] = parts;
      if (type !== 'Patient') {
        // Non-Patient subject (Group, etc.) — not an error, but not a
        // patient ID either. Skip silently.
        continue;
      }
      ids.add(id);
      if (ids.size >= MAX_IDS_PER_CRITERION) break;
    }
    if (ids.size >= MAX_IDS_PER_CRITERION) break;
  }
  if (malformed > 0) {
    // T-21-03: count only, no refs.
    console.warn(
      `Cohort resolver: skipped ${malformed} malformed subject references`,
    );
  }
  return ids;
}

/**
 * Paginate a `searchResourcePages` generator and collect unique resource
 * `id` values. Sibling of `collectSubjectPatientIds` — used for
 * Patient-rooted searches where the result IS the Patient and we want the
 * `id` field directly rather than `subject.reference`.
 *
 * Shares the Phase-21 `MAX_IDS_PER_CRITERION` cap (10,000) so FHIRPath
 * Patient queries behave identically to Encounter/Condition queries wrt
 * T-22-03 (DoS / result-set size cap).
 *
 * No malformed-data accounting: a Patient resource without an `id` is
 * silently skipped (a read-only explorer doesn't emit warnings for data
 * quality issues outside the quality engines).
 */
async function collectIdField(
  client: MedplumClient,
  resourceType: string,
  params: Record<string, string | string[]>,
): Promise<Set<string>> {
  const ids = new Set<string>();
  for await (const page of client.searchResourcePages(
    resourceType as never,
    params as unknown as QueryTypes,
  )) {
    for (const r of page as Resource[]) {
      const rid = (r as { id?: string }).id;
      if (typeof rid === 'string' && rid.length > 0) {
        ids.add(rid);
        if (ids.size >= MAX_IDS_PER_CRITERION) break;
      }
    }
    if (ids.size >= MAX_IDS_PER_CRITERION) break;
  }
  return ids;
}
