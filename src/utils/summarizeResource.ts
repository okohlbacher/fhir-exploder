/**
 * summarizeResource.ts — pure-function FHIR resource summary registry.
 *
 * Phase 46 / NAV-01 — foundation of v1.7 Resource Navigation. Consumed by
 * Phases 47/48/49 for reference rendering, incoming-references panels, and
 * graph-node labels. Locks the public API + behavior so downstream phases can
 * rely on stable summary strings.
 *
 * Public contract:
 *   `summarizeResource(r, now?) -> { primary: string; secondary?: string }`
 *
 * Pure: no I/O, no clock (pass `now` for determinism), no RNG, no
 * MedplumClient resolution. Reference resolution lives in callers.
 *
 * Registry covers 8 R4 resource types (typed switch with cast inside each
 * case — required by TS strict mode):
 *   Patient, Observation, Condition, Encounter, MedicationStatement,
 *   Procedure, DiagnosticReport, AllergyIntolerance.
 *
 * All other resource types fall through to `summarizeGeneric`, a 7-step
 * walker over `code → type → category → name → description → identifier → id`.
 *
 * Sub-decisions pinned by tests:
 *   A1: gender 'other' → 'O' (genderToChar).
 *   A2: partial birthDate (length < 10) → omit parenthetical (fullYearsBetween → undefined).
 *   A3: HumanName legacy comma-join `family, given1, given2` (formatHumanName).
 *
 * D-03 fallback: name-missing Patient with non-short-alphanumeric identifier
 * value → djb2 base36-6 hash (deterministic, NOT cryptographic).
 */

import type {
  Resource,
  Patient,
  Observation,
  Condition,
  Encounter,
  MedicationStatement,
  Procedure,
  DiagnosticReport,
  AllergyIntolerance,
  HumanName,
} from '@medplum/fhirtypes';
import { getCodeDisplay, toRecord } from './fhir-helpers';

export interface Summary {
  primary: string;
  secondary?: string;
}

export function summarizeResource(r: Resource, now: Date = new Date()): Summary {
  switch (r.resourceType) {
    case 'Patient':              return summarizePatient(r as Patient, now);
    case 'Observation':          return summarizeObservation(r as Observation);
    case 'Condition':            return summarizeCondition(r as Condition);
    case 'Encounter':            return summarizeEncounter(r as Encounter);
    case 'MedicationStatement':  return summarizeMedicationStatement(r as MedicationStatement);
    case 'Procedure':            return summarizeProcedure(r as Procedure);
    case 'DiagnosticReport':     return summarizeDiagnosticReport(r as DiagnosticReport);
    case 'AllergyIntolerance':   return summarizeAllergyIntolerance(r as AllergyIntolerance);
    default:                     return summarizeGeneric(r);
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Format a HumanName as `family, given1, given2` (legacy convention; A3 pin).
 * Mirrors `SearchResultsPage.tsx` line 39-40 byte-for-byte.
 * If `name.text` is set, returns it verbatim (text wins over family/given).
 */
function formatHumanName(n: HumanName): string {
  if (typeof n.text === 'string' && n.text) return n.text;
  const parts = [n.family, ...(Array.isArray(n.given) ? n.given : [])].filter(Boolean);
  return parts.length > 0 ? parts.join(', ') : '';
}

/**
 * True iff `v` is ≤6 characters and entirely [A-Za-z0-9].
 * Used by Patient name-missing fallback (D-03) to decide passthrough vs. hash.
 * Regex is linear (no backreferences, no nested quantifiers) — ReDoS-safe.
 */
function isShortAlphanumeric(v: string): boolean {
  return v.length <= 6 && /^[A-Za-z0-9]+$/.test(v);
}

/**
 * Map FHIR Patient.gender → single-character glyph.
 * Sub-decision A1: 'other' → 'O' (NOT 'U').
 */
function genderToChar(g: 'male' | 'female' | 'other' | 'unknown'): 'M' | 'F' | 'O' | 'U' {
  if (g === 'male') return 'M';
  if (g === 'female') return 'F';
  if (g === 'other') return 'O';
  return 'U';
}

/**
 * Compute full years between an ISO birthDate (YYYY-MM-DD) and `now`.
 * Sub-decision A2: partial dates (length < 10) return undefined → caller
 * omits the parenthetical.
 * Returns undefined if parsing fails or yields a negative age.
 */
function fullYearsBetween(birthDateIso: string, now: Date): number | undefined {
  if (birthDateIso.length < 10) return undefined;
  const b = new Date(birthDateIso.slice(0, 10));
  if (Number.isNaN(b.getTime())) return undefined;
  let years = now.getFullYear() - b.getFullYear();
  const m = now.getMonth() - b.getMonth();
  if (m < 0 || (m === 0 && now.getDate() < b.getDate())) years -= 1;
  return years >= 0 ? years : undefined;
}

/**
 * djb2 hash → 6-character base36 string. PURE (no I/O, no clock, no RNG).
 * NOT cryptographic — display label only. Never use for auth or integrity.
 * Math: hash is unsigned 32-bit; 36^6 = 2,176,782,336 < Number.MAX_SAFE_INTEGER.
 */
function djb2Base36Six(input: string): string {
  let hash = 5381;
  for (let i = 0; i < input.length; i++) {
    hash = ((hash << 5) + hash + input.charCodeAt(i)) >>> 0;
  }
  return (hash % 2_176_782_336).toString(36).padStart(6, '0');
}

// ─────────────────────────────────────────────────────────────────────────────
// Typed helpers
// ─────────────────────────────────────────────────────────────────────────────

function summarizePatient(p: Patient, now: Date): Summary {
  const formatted = (p.name?.[0] && formatHumanName(p.name[0])) || '';

  let primary: string;
  if (formatted) {
    primary = formatted;
  } else {
    const idv = p.identifier?.[0]?.value;
    if (idv) {
      primary = isShortAlphanumeric(idv) ? idv : djb2Base36Six(idv);
    } else {
      primary = p.id ?? '';
    }
  }

  const age = p.birthDate ? fullYearsBetween(p.birthDate, now) : undefined;
  const sex = p.gender ? genderToChar(p.gender) : 'U';
  if (age !== undefined) {
    primary = `${primary} (${age}/${sex})`;
  }

  return { primary, secondary: p.birthDate };
}

/**
 * Module-private classifier — true iff Observation has any
 * `category[].coding[].code === 'laboratory'`. Lab observations get the
 * `<value> <unit> · <code>` middot rendering (D-04); non-lab observations
 * use code as primary and value/effective as secondary.
 */
function isLabObservation(o: Observation): boolean {
  const cats = o.category ?? [];
  for (const cat of cats) {
    const codings = cat.coding ?? [];
    for (const c of codings) {
      if (c.code === 'laboratory') return true;
    }
  }
  return false;
}

function summarizeObservation(o: Observation): Summary {
  const codeDisplay = getCodeDisplay(o.code);
  const effective = o.effectiveDateTime?.slice(0, 10);

  // Build value+unit fragment from valueQuantity / valueString / valueCodeableConcept
  let valueFragment = '';
  if (o.valueQuantity) {
    const value = o.valueQuantity.value;
    const unit = o.valueQuantity.unit ?? o.valueQuantity.code ?? '';
    if (value !== undefined && unit) {
      valueFragment = `${value} ${unit}`;
    } else if (value !== undefined) {
      valueFragment = String(value);
    }
  } else if (o.valueString) {
    valueFragment = o.valueString;
  } else if (o.valueCodeableConcept) {
    valueFragment = getCodeDisplay(o.valueCodeableConcept);
  }

  if (isLabObservation(o)) {
    // Lab: "<value> <unit> · <code display>" (middot U+00B7)
    const primary = valueFragment && codeDisplay
      ? `${valueFragment} · ${codeDisplay}`
      : (valueFragment || codeDisplay || '');
    return { primary, secondary: effective };
  }

  // Non-lab: primary = code display, secondary = value+unit if present else effectiveDateTime
  return {
    primary: codeDisplay,
    secondary: valueFragment || effective,
  };
}

function summarizeCondition(c: Condition): Summary {
  return {
    primary: getCodeDisplay(c.code),
    secondary: c.onsetDateTime?.slice(0, 10),
  };
}

function summarizeEncounter(e: Encounter): Summary {
  // Defensive `?.` on class — schema says required Coding, but Blaze data may violate.
  const primary = e.class?.display ?? getCodeDisplay(e.type?.[0]);
  return {
    primary,
    secondary: e.period?.start?.slice(0, 10),
  };
}

function summarizeMedicationStatement(m: MedicationStatement): Summary {
  let primary = getCodeDisplay(m.medicationCodeableConcept);
  if (!primary && m.medicationReference?.display) {
    primary = m.medicationReference.display;
  }
  if (!primary) {
    primary = m.id ?? '';
  }
  return {
    primary,
    secondary: m.effectiveDateTime?.slice(0, 10),
  };
}

function summarizeProcedure(p: Procedure): Summary {
  return {
    primary: getCodeDisplay(p.code),
    secondary: p.performedDateTime?.slice(0, 10),
  };
}

function summarizeDiagnosticReport(d: DiagnosticReport): Summary {
  const dateSrc = d.issued ?? d.effectiveDateTime;
  return {
    primary: getCodeDisplay(d.code),
    secondary: dateSrc?.slice(0, 10),
  };
}

function summarizeAllergyIntolerance(a: AllergyIntolerance): Summary {
  const secondary = a.category?.[0] ?? a.type;
  return {
    primary: getCodeDisplay(a.code),
    secondary,
  };
}

// Generic walker stub — Task 3 replaces this with the full 7-step walker.
function summarizeGeneric(r: Resource): Summary {
  void toRecord;
  return { primary: r.id ?? '' };
}
