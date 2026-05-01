/**
 * reverseReferenceCatalog.test.ts — unit tests for src/utils/reverseReferenceCatalog.ts
 *
 * Phase 48 / REVR-01 — verifies the curated reverse-reference catalog (D-14).
 *
 * Drift-detection guarantees:
 *   - 9 source-type keys present (Patient, Observation, Condition, Encounter,
 *     MedicationStatement, Procedure, DiagnosticReport, AllergyIntolerance, Practitioner)
 *   - Patient key contains the 11 entries that previously lived inline in
 *     PatientRelatedResources.tsx (regression baseline for D-05 refactor)
 *   - Each non-Patient key has at least one entry with a valid R4 ResourceType
 *     and a non-empty `param`
 *   - 48-RESEARCH §1.b correction baked in: Condition source list does NOT
 *     include `{ MedicationStatement, 'reason-reference' }` (no such SearchParameter
 *     in R4)
 *   - 48-RESEARCH §1.a confirmation baked in: Encounter source list DOES include
 *     `{ MedicationStatement, 'context' }` (R4 uses `context`, not `encounter`)
 *   - Non-Patient entries omit `icon` (D-09 default)
 */

import { describe, it, expect } from 'vitest';
import {
  reverseReferenceCatalog,
  type ReverseReferenceCatalog,
  type ReverseReferenceEntry,
} from '../reverseReferenceCatalog';

// Wider-typed view for runtime drift-detection assertions that need to look up
// `{type, param}` pairs the literal type narrows away (e.g. asserting
// `MedicationStatement.reason-reference` is NOT present in Condition's entries —
// the literal types correctly know that already, but the runtime test is the
// drift-detection guarantee for future edits).
const catalog: ReverseReferenceCatalog = reverseReferenceCatalog;

const expectedPatient = [
  { type: 'Condition',           param: 'patient', icon: '🩺' },
  { type: 'Procedure',           param: 'patient', icon: '🔧' },
  { type: 'Observation',         param: 'patient', icon: '📊' },
  { type: 'Encounter',           param: 'patient', icon: '🏥' },
  { type: 'MedicationStatement', param: 'patient', icon: '💊' },
  { type: 'MedicationRequest',   param: 'patient', icon: '📋' },
  { type: 'DiagnosticReport',    param: 'patient', icon: '🧪' },
  { type: 'ImagingStudy',        param: 'patient', icon: '🖼' },
  { type: 'AllergyIntolerance',  param: 'patient', icon: '⚠' },
  { type: 'Immunization',        param: 'patient', icon: '💉' },
  { type: 'Consent',             param: 'patient', icon: '✍' },
] as const;

const NON_PATIENT_KEYS = [
  'Observation',
  'Condition',
  'Encounter',
  'MedicationStatement',
  'Procedure',
  'DiagnosticReport',
  'AllergyIntolerance',
  'Practitioner',
] as const;

describe('reverseReferenceCatalog — shape & coverage (D-14)', () => {
  it('exports 9 source-type keys', () => {
    const keys = Object.keys(reverseReferenceCatalog).sort();
    expect(keys).toEqual([
      'AllergyIntolerance',
      'Condition',
      'DiagnosticReport',
      'Encounter',
      'MedicationStatement',
      'Observation',
      'Patient',
      'Practitioner',
      'Procedure',
    ]);
  });

  it('Patient entry has 11 entries (regression baseline)', () => {
    const patient = reverseReferenceCatalog.Patient;
    expect(patient).toBeDefined();
    expect(patient!.length).toBe(11);
    // Order-preserving deep-equal against the byte-string of the existing RELATED_TYPES array.
    expect(patient).toEqual(expectedPatient);
  });

  it('every non-Patient key has at least one entry', () => {
    for (const key of NON_PATIENT_KEYS) {
      const entries = reverseReferenceCatalog[key];
      expect(entries, `expected catalog key ${key} to have entries`).toBeDefined();
      expect(entries!.length).toBeGreaterThanOrEqual(1);
    }
  });

  it('every entry has a ResourceType-shaped `type` and non-empty `param`', () => {
    for (const [key, entries] of Object.entries(reverseReferenceCatalog)) {
      expect(entries, `entries for ${key}`).toBeDefined();
      for (const entry of entries!) {
        expect(entry.type, `entry.type in ${key}`).toMatch(/^[A-Z][A-Za-z]+$/);
        expect(entry.param.length, `entry.param length in ${key}`).toBeGreaterThan(0);
      }
    }
  });
});

describe('reverseReferenceCatalog — RESEARCH §1 corrections (D-03)', () => {
  it('Condition entry does NOT include MedicationStatement.reason-reference (R4 invalid per RESEARCH §1.b)', () => {
    const condition = catalog.Condition;
    expect(condition).toBeDefined();
    const offending = (condition as readonly ReverseReferenceEntry[]).find(
      (e) => e.type === 'MedicationStatement' && e.param === 'reason-reference',
    );
    expect(offending).toBeUndefined();
  });

  it('Encounter entry includes MedicationStatement.context (R4 valid per RESEARCH §1.a)', () => {
    const encounter = catalog.Encounter;
    expect(encounter).toBeDefined();
    const found = (encounter as readonly ReverseReferenceEntry[]).find(
      (e) => e.type === 'MedicationStatement' && e.param === 'context',
    );
    expect(found).toBeDefined();
  });
});

describe('reverseReferenceCatalog — D-09 icon defaults', () => {
  it('non-Patient entries omit `icon`', () => {
    for (const key of NON_PATIENT_KEYS) {
      const entries = catalog[key];
      expect(entries, `expected catalog key ${key} to be defined`).toBeDefined();
      for (const entry of entries as readonly ReverseReferenceEntry[]) {
        expect(entry.icon, `entry ${key}/${entry.type}/${entry.param}`).toBeUndefined();
      }
    }
  });
});
