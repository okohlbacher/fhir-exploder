/**
 * MII FDPG Codex Structured Query v3 — minimal TypeScript interfaces.
 *
 * Phase 22 CHRT-06 implements the subset needed for round-tripping
 * Phase-21 interactive criteria (date-range → Fall + timeRestriction;
 * condition-code → Diagnose + termCodes). FHIRPath criteria do not
 * round-trip — export rejects them per D-06.
 *
 * Schema URL:
 *   https://medizininformatik-initiative.de/fdpg/StructuredQuery/v3/schema
 *
 * This file defines types only. Encoding/decoding logic lives in
 * `fdpgCodec.ts`. No `ajv` or external validator is used — the codec
 * performs shape validation manually (see 22-RESEARCH.md §Standard Stack).
 */

export const FDPG_SQ_VERSION =
  'https://medizininformatik-initiative.de/fdpg/StructuredQuery/v3/schema' as const;

export interface FdpgTermCode {
  code: string;
  system: string;
  display?: string;
  version?: string;
}

export interface FdpgTimeRestriction {
  afterDate?: string; // ISO YYYY-MM-DD
  beforeDate?: string; // ISO YYYY-MM-DD
}

export interface FdpgValueFilter {
  type: 'concept' | 'quantity-comparator' | 'quantity-range' | 'reference';
  // Phase 22 NEVER emits valueFilter. On import, only type='concept' is
  // tolerated when attached to a condition-code-shaped criterion; all
  // other shapes cause a hard reject.
}

export interface FdpgCriterion {
  termCodes: FdpgTermCode[];
  context: FdpgTermCode;
  valueFilter?: FdpgValueFilter;
  timeRestriction?: FdpgTimeRestriction;
  attributeFilters?: unknown[];
}

export interface StructuredQuery {
  version: typeof FDPG_SQ_VERSION;
  display?: string;
  inclusionCriteria: FdpgCriterion[][];
  exclusionCriteria?: FdpgCriterion[][];
}

export const FDPG_CONTEXT_FALL: FdpgTermCode = {
  system: 'fdpg.mii.cds',
  code: 'Fall',
  display: 'Fall',
  version: '1.0.0',
};

export const FDPG_CONTEXT_DIAGNOSE: FdpgTermCode = {
  system: 'fdpg.mii.cds',
  code: 'Diagnose',
  display: 'Diagnose',
  version: '1.0.0',
};
