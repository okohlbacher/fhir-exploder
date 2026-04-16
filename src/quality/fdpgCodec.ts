/**
 * MII FDPG Codex Structured Query v3 codec — Phase 22 CHRT-06.
 *
 * Bidirectional transform between:
 *   - `CohortDefinition` (Phase 21 + Plan 22-01 extended criteria)
 *   - MII SQ v3 JSON (schema version `FDPG_SQ_VERSION`)
 *
 * Security contracts (see 22-RESEARCH.md §Security Domain):
 *   - 1 MB file-size cap enforced BEFORE `JSON.parse` (T-22-07 DoS)
 *   - Field-by-field read of parsed input into fresh literals; no
 *     property-copy-all helpers, no spread on untrusted objects
 *     (T-22-06 proto pollution)
 *   - Version string strictly equals `FDPG_SQ_VERSION`; no prefix match,
 *     no loose comparison (T-22-08 version confusion)
 *   - Errors never include patient IDs or PHI (T-22-09)
 *
 * Behaviour contracts (see 22-CONTEXT.md §D-06):
 *   - Export rejects cohorts containing a `fhirpath` criterion
 *   - Export skips `reference-list` criterion with a warning (no SQ analog)
 *   - Import rejects `exclusionCriteria` (non-empty), `OR-groups` (inner
 *     array > 1), `attributeFilters`, unknown contexts, unknown valueFilters
 */

import type { CohortCriterion, CohortDefinition } from './cohorts';
import {
  FDPG_SQ_VERSION,
  FDPG_CONTEXT_FALL,
  FDPG_CONTEXT_DIAGNOSE,
  type StructuredQuery,
  type FdpgCriterion,
  type FdpgTimeRestriction,
} from './fdpgTypes';

export class FdpgCodecError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'FdpgCodecError';
  }
}

export const MAX_FDPG_FILE_BYTES = 1_000_000;

/**
 * Forward-compatibility helper: Plan 22-01 (parallel Wave 1) extends the
 * canonical `CohortCriterion` union in `src/quality/cohorts.ts` with
 * `FhirpathCriterion = { type: 'fhirpath'; expression: string }`. This
 * codec must reject that variant on export, so we widen the iterator
 * element to include the fhirpath shape locally. When both branches merge,
 * the local type becomes a structural subtype of the canonical union.
 */
type FhirpathLike = { type: 'fhirpath'; expression: string; translatedQuery?: string };
type CodecCriterion = CohortCriterion | FhirpathLike;

/**
 * Serialize a CohortDefinition into a StructuredQuery-shaped object,
 * plus a list of human-readable warnings (e.g. skipped reference-list).
 *
 * Throws FdpgCodecError if the cohort contains a FHIRPath criterion
 * (D-06: not round-trippable).
 */
export function cohortToFdpgSq(
  cohort: CohortDefinition,
): { sq: StructuredQuery; warnings: string[] } {
  const warnings: string[] = [];
  const groups: FdpgCriterion[][] = [];

  for (const raw of cohort.criteria as CodecCriterion[]) {
    const c = raw;
    if (c.type === 'fhirpath') {
      throw new FdpgCodecError(
        'This cohort contains a FHIRPath criterion. FDPG Structured Query and FHIRPath are not equivalent formats.',
      );
    }
    if (c.type === 'reference-list') {
      warnings.push(
        'reference-list criterion was skipped — FDPG Structured Query does not support explicit patient lists.',
      );
      continue;
    }
    if (c.type === 'date-range') {
      const tr: FdpgTimeRestriction = {};
      if (c.start) tr.afterDate = c.start;
      if (c.end) tr.beforeDate = c.end;
      groups.push([
        {
          termCodes: [],
          context: FDPG_CONTEXT_FALL,
          timeRestriction: tr,
        },
      ]);
      continue;
    }
    if (c.type === 'condition-code') {
      groups.push([
        {
          termCodes: [{ system: c.system, code: c.code }],
          context: FDPG_CONTEXT_DIAGNOSE,
        },
      ]);
      continue;
    }
    // Defensive tail — if an unknown criterion variant slips through
    // a future union extension, fail loudly rather than emitting a
    // malformed SQ.
    throw new FdpgCodecError(
      `Unhandled criterion type during export: ${JSON.stringify(c)}`,
    );
  }

  const sq: StructuredQuery = {
    version: FDPG_SQ_VERSION,
    display: cohort.name,
    inclusionCriteria: groups,
  };
  return { sq, warnings };
}

/**
 * Parse a JSON string into a CohortDefinition, plus warnings.
 *
 * - Enforces MAX_FDPG_FILE_BYTES before parse
 * - Hardened against prototype pollution (field-by-field read)
 * - Version must equal FDPG_SQ_VERSION exactly
 */
export function fdpgSqToCohort(
  jsonText: string,
): { cohort: CohortDefinition; warnings: string[] } {
  const byteLength = new TextEncoder().encode(jsonText).byteLength;
  if (byteLength > MAX_FDPG_FILE_BYTES) {
    throw new FdpgCodecError(
      'File exceeds 1 MB cap. FDPG cohort exports are typically under 50 KB; this file may not be a valid FDPG export.',
    );
  }

  let parsed: unknown;
  try {
    parsed = JSON.parse(jsonText);
  } catch {
    throw new FdpgCodecError('Selected file is not valid JSON.');
  }
  if (typeof parsed !== 'object' || parsed === null || Array.isArray(parsed)) {
    throw new FdpgCodecError('Selected file is not valid JSON.');
  }

  // Field-by-field read from parsed input into local variables. Callers
  // downstream only see data placed into fresh object literals below.
  const raw = parsed as Record<string, unknown>;
  const version = raw['version'];
  const display = raw['display'];
  const inclusionCriteria = raw['inclusionCriteria'];
  const exclusionCriteria = raw['exclusionCriteria'];

  if (typeof version !== 'string') {
    throw new FdpgCodecError('FDPG file is missing the required "version" field.');
  }
  if (version !== FDPG_SQ_VERSION) {
    throw new FdpgCodecError(
      `FDPG file uses schema version "${version}". This tool supports "${FDPG_SQ_VERSION}".`,
    );
  }
  if (inclusionCriteria === undefined) {
    throw new FdpgCodecError('FDPG file is missing the required "inclusionCriteria" field.');
  }
  if (!Array.isArray(inclusionCriteria)) {
    throw new FdpgCodecError('"inclusionCriteria" must be a 2D array of criterion groups.');
  }
  for (const group of inclusionCriteria) {
    if (!Array.isArray(group)) {
      throw new FdpgCodecError('"inclusionCriteria" must be a 2D array of criterion groups.');
    }
  }
  if (exclusionCriteria !== undefined) {
    if (!Array.isArray(exclusionCriteria)) {
      throw new FdpgCodecError('"exclusionCriteria" must be a 2D array of criterion groups.');
    }
    // Non-empty exclusion → reject
    const hasAny = exclusionCriteria.some(
      (g) => Array.isArray(g) && g.length > 0,
    );
    if (hasAny) {
      throw new FdpgCodecError('Exclusion criteria are not yet supported.');
    }
  }

  const warnings: string[] = [];
  const criteria: CohortCriterion[] = [];
  const totalGroups = (inclusionCriteria as unknown[][]).filter(
    (g) => Array.isArray(g) && g.length > 0,
  ).length;
  if (totalGroups === 0) {
    throw new FdpgCodecError('FDPG file contains no inclusion criteria.');
  }

  for (const group of inclusionCriteria as unknown[][]) {
    if (group.length === 0) continue;
    if (group.length > 1) {
      throw new FdpgCodecError(
        'OR-composition within criterion groups is not yet supported.',
      );
    }
    const rawCrit = group[0];
    if (typeof rawCrit !== 'object' || rawCrit === null) {
      throw new FdpgCodecError('Criterion entry is not an object.');
    }
    const critObj = rawCrit as Record<string, unknown>;

    // attributeFilters rejection
    const attributeFilters = critObj['attributeFilters'];
    if (Array.isArray(attributeFilters) && attributeFilters.length > 0) {
      throw new FdpgCodecError('Attribute filters are not yet supported.');
    }

    // Context must be Fall or Diagnose
    const ctxRaw = critObj['context'];
    if (typeof ctxRaw !== 'object' || ctxRaw === null) {
      throw new FdpgCodecError('Criterion is missing the required "context" field.');
    }
    const ctx = ctxRaw as Record<string, unknown>;
    const ctxCode = ctx['code'];
    if (typeof ctxCode !== 'string') {
      throw new FdpgCodecError('Criterion "context.code" must be a string.');
    }

    // valueFilter rejection for non-'concept' types
    const vf = critObj['valueFilter'];
    if (vf !== undefined && vf !== null) {
      if (typeof vf !== 'object') {
        throw new FdpgCodecError('Criterion "valueFilter" must be an object.');
      }
      const vfType = (vf as Record<string, unknown>)['type'];
      if (vfType !== undefined && vfType !== 'concept') {
        throw new FdpgCodecError(
          `Value filter type "${String(vfType)}" is not yet supported.`,
        );
      }
    }

    if (ctxCode === 'Fall') {
      // Expect a timeRestriction; termCodes is typically []
      const trRaw = critObj['timeRestriction'];
      let start: string | null = null;
      let end: string | null = null;
      if (trRaw && typeof trRaw === 'object') {
        const tr = trRaw as Record<string, unknown>;
        const afterDate = tr['afterDate'];
        const beforeDate = tr['beforeDate'];
        if (typeof afterDate === 'string') start = afterDate;
        if (typeof beforeDate === 'string') end = beforeDate;
      }
      if (start === null && end === null) {
        warnings.push(
          'Fall criterion has no time restriction — imported as an empty date-range.',
        );
      }
      criteria.push({ type: 'date-range', start, end });
      continue;
    }

    if (ctxCode === 'Diagnose') {
      // Expect termCodes[]; take the first entry, warn if more
      const tcRaw = critObj['termCodes'];
      if (!Array.isArray(tcRaw) || tcRaw.length === 0) {
        throw new FdpgCodecError(
          'Diagnose criterion is missing required "termCodes".',
        );
      }
      const first = tcRaw[0] as Record<string, unknown>;
      const sys = first['system'];
      const code = first['code'];
      if (typeof sys !== 'string' || typeof code !== 'string') {
        throw new FdpgCodecError(
          'Diagnose criterion termCode must have string "system" and "code".',
        );
      }
      if (tcRaw.length > 1) {
        warnings.push(
          `Diagnose criterion had ${tcRaw.length} term codes — only the first was imported.`,
        );
      }
      criteria.push({ type: 'condition-code', system: sys, code });
      continue;
    }

    throw new FdpgCodecError(
      `Criterion with context "${ctxCode}" is not supported. Supported contexts: Fall, Diagnose.`,
    );
  }

  const now = new Date().toISOString();
  const name =
    typeof display === 'string' && display.length > 0
      ? display
      : 'Imported cohort';
  const cohort: CohortDefinition = {
    id: crypto.randomUUID(),
    name,
    criteria,
    createdAt: now,
    updatedAt: now,
  };
  return { cohort, warnings };
}
