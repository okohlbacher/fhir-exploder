/**
 * UAT-FU-01 — Date/Status per-resource-type extractor (GREEN).
 *
 * This file is the SECOND half of the TDD baseline-drift commit pair
 * (CONTEXT D-03 / D-26). The previous commit (RED) captured the CURRENT
 * "empty = empty" behavior of `getResourceDate` + the inline status JSX in
 * SearchResultsPage. This commit lands the per-type extractors AND flips the
 * assertions in lockstep so the deliberate baseline drift is visible to a
 * reviewer in a single diff.
 *
 * Coverage:
 *   - 6 Date tests (Patient.birthDate, Condition.onsetDateTime,
 *     Observation.effectiveDateTime, MedicationStatement.effectiveDateTime,
 *     Encounter.period.start, Procedure.performedDateTime)
 *   - 6 Status tests (Patient boolean→label, Condition CodeableConcept walk,
 *     plus 4 enum-status types reading `.status` directly)
 *   - 3 edge-case tests for missing fields per VALIDATION.md §1
 *     (Patient.birthDate undefined, Encounter.period undefined,
 *     Condition.clinicalStatus undefined)
 *
 * Pitfall mitigations exercised:
 *   - P-01: Condition status walks `clinicalStatus.coding[0].code`, NOT
 *     `String(clinicalStatus)` which would render `[object Object]`.
 *   - P-02: Patient.active boolean → 'active' / 'inactive' / '' explicit map.
 *   - P-03: Encounter date uses `period.start`, NOT a non-existent `.date`.
 *   - FLAT effectiveDateTime in Medplum types — verified against the runtime
 *     extractor output.
 */
import { describe, it, expect } from 'vitest';
import type {
  Patient,
  Condition,
  Observation,
  MedicationStatement,
  Encounter,
  Procedure,
} from '@medplum/fhirtypes';

import {
  getResourceDateByType,
  getResourceStatusByType,
} from '../components/explorer/SearchResultsPage';

// --- Typed fixtures (one per target resource type) -------------------------------------

const patientFixture: Patient = {
  resourceType: 'Patient',
  id: 'p1',
  birthDate: '1980-01-15',
  active: true,
};

const conditionFixture: Condition = {
  resourceType: 'Condition',
  id: 'c1',
  onsetDateTime: '2024-03-10T00:00:00Z',
  clinicalStatus: { coding: [{ code: 'active' }] },
  subject: { reference: 'Patient/p1' },
};

const observationFixture: Observation = {
  resourceType: 'Observation',
  id: 'o1',
  status: 'final',
  effectiveDateTime: '2024-05-22T08:30:00Z',
  code: { coding: [{ code: '1234-5' }] },
};

const medicationStatementFixture: MedicationStatement = {
  resourceType: 'MedicationStatement',
  id: 'm1',
  status: 'active',
  effectiveDateTime: '2024-06-01T00:00:00Z',
  medicationCodeableConcept: { coding: [{ code: 'med-1' }] },
  subject: { reference: 'Patient/p1' },
};

const encounterFixture: Encounter = {
  resourceType: 'Encounter',
  id: 'e1',
  status: 'finished',
  class: { code: 'AMB' },
  period: { start: '2024-04-15T10:00:00Z', end: '2024-04-15T11:00:00Z' },
};

const procedureFixture: Procedure = {
  resourceType: 'Procedure',
  id: 'pr1',
  status: 'completed',
  performedDateTime: '2024-02-20T14:00:00Z',
  subject: { reference: 'Patient/p1' },
};

// --- Date column — per-type extractor ----------------------------------------

describe('UAT-FU-01: getResourceDateByType — per-type Date extractor', () => {
  it('Patient → returns birthDate (formerly empty under legacy fallback)', () => {
    // FLIP from RED: legacy getResourceDate had no `birthDate` in its field
    // list; the typed Patient branch now returns the date verbatim.
    expect(getResourceDateByType(patientFixture)).toBe('1980-01-15');
  });

  it('Condition → returns sliced onsetDateTime', () => {
    expect(getResourceDateByType(conditionFixture)).toBe('2024-03-10');
  });

  it('Observation → returns sliced effectiveDateTime', () => {
    expect(getResourceDateByType(observationFixture)).toBe('2024-05-22');
  });

  it('MedicationStatement → returns sliced effectiveDateTime (FLAT in Medplum types)', () => {
    expect(getResourceDateByType(medicationStatementFixture)).toBe('2024-06-01');
  });

  it('Encounter → returns sliced period.start (NOT a non-existent .date — Pitfall P-03)', () => {
    expect(getResourceDateByType(encounterFixture)).toBe('2024-04-15');
  });

  it('Procedure → returns sliced performedDateTime', () => {
    expect(getResourceDateByType(procedureFixture)).toBe('2024-02-20');
  });
});

// --- Status column — per-type extractor --------------------------------------

describe('UAT-FU-01: getResourceStatusByType — per-type Status extractor', () => {
  it('Patient (active: true) → "active" (Pitfall P-02 boolean→label mitigation)', () => {
    // FLIP from RED: previously `String(toRecord(p).status)` was '' (no
    // `.status` field). The typed Patient branch maps `.active === true` to
    // the literal 'active' code per CONTEXT D-05.
    expect(getResourceStatusByType(patientFixture)).toBe('active');
  });

  it('Patient (active: false) → "inactive" (Pitfall P-02)', () => {
    expect(
      getResourceStatusByType({ ...patientFixture, active: false } as Patient)
    ).toBe('inactive');
  });

  it('Patient (active: undefined) → "" (Pitfall P-02 — empty fallback)', () => {
    expect(
      getResourceStatusByType({ ...patientFixture, active: undefined } as Patient)
    ).toBe('');
  });

  it('Condition → walks clinicalStatus.coding[0].code (Pitfall P-01 mitigation)', () => {
    // FLIP from RED: previously '' (no `.status` field). The new extractor
    // walks the CodeableConcept properly — NEVER renders "[object Object]".
    expect(getResourceStatusByType(conditionFixture)).toBe('active');
  });

  it('Observation → returns raw status enum', () => {
    expect(getResourceStatusByType(observationFixture)).toBe('final');
  });

  it('MedicationStatement → returns raw status enum', () => {
    expect(getResourceStatusByType(medicationStatementFixture)).toBe('active');
  });

  it('Encounter → returns raw status enum (REQUIRED 1..1 cardinality)', () => {
    expect(getResourceStatusByType(encounterFixture)).toBe('finished');
  });

  it('Procedure → returns raw status enum', () => {
    expect(getResourceStatusByType(procedureFixture)).toBe('completed');
  });
});

// --- Edge cases — missing fields (VALIDATION.md §1) --------------------------

describe('UAT-FU-01: extractors — missing field edge cases', () => {
  it('Date: Patient with undefined birthDate → ""', () => {
    expect(
      getResourceDateByType({ ...patientFixture, birthDate: undefined } as Patient)
    ).toBe('');
  });

  it('Date: Encounter with undefined period → "" (period.start optional-chain)', () => {
    expect(
      getResourceDateByType({ ...encounterFixture, period: undefined } as Encounter)
    ).toBe('');
  });

  it('Status: Condition with undefined clinicalStatus → "" (CodeableConcept optional-chain)', () => {
    expect(
      getResourceStatusByType({
        ...conditionFixture,
        clinicalStatus: undefined,
      } as Condition)
    ).toBe('');
  });
});
