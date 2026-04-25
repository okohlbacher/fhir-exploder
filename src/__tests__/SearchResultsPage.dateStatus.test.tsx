/**
 * UAT-FU-01 — Date/Status per-resource-type extractor RED baseline.
 *
 * This file is the FIRST half of the TDD baseline-drift commit pair (CONTEXT D-03 / D-26).
 * It captures the CURRENT behavior of the SearchResultsPage Date and Status columns across
 * the 6 target FHIR resource types — Patient, Condition, Observation, MedicationStatement,
 * Encounter, Procedure — so that the GREEN commit (Task 2 of plan 35-02) can deliberately
 * FLIP these assertions in a single reviewable diff. The reviewer compares the GREEN diff
 * against this baseline and sees exactly which assertions changed and why.
 *
 * Today's situation:
 *   - Date column uses a single legacy `getResourceDate(resource)` helper that walks a
 *     fixed list of common date-like fields (`effectiveDateTime`, `performedDateTime`,
 *     `dateTime`, `date`, `issued`, `recordedDate`, `onsetDateTime`, `authoredOn`,
 *     `period`). It happens to extract a value for Condition / Observation /
 *     MedicationStatement / Encounter / Procedure via this fallback, but Patient's
 *     `birthDate` is NOT in the list — Patient renders empty.
 *   - Status column reads `toRecord(r).status` inline in the JSX. Patient has no
 *     `.status` field (it has `.active`); Condition has no `.status` field (it has
 *     `.clinicalStatus`, a CodeableConcept). So both render no Badge today. The four
 *     enum-status types (Observation, MedicationStatement, Encounter, Procedure) render
 *     their raw enum string.
 *
 * After Task 2 (GREEN), per-type extractors will be introduced and the assertions in this
 * file will be flipped to assert the NEW typed behavior (e.g. Patient → '1980-01-15' /
 * 'active', Condition → '2024-03-10' / 'active' from clinicalStatus.coding[0].code).
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

import { getResourceDate } from '../components/explorer/SearchResultsPage';
import { toRecord } from '../utils/fhir-helpers';

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

/**
 * Mirrors the current SearchResultsPage Status-cell render expression at lines 405-419:
 *   {toRecord(r).status && (<Badge ...>{String(toRecord(r).status)}</Badge>)}
 * If toRecord(r).status is falsy → no Badge → effectively empty string in the cell.
 * Otherwise the badge renders String(status), which produces "[object Object]" for any
 * non-string status value (Pitfall P-01 if a CodeableConcept ever flowed in here).
 */
function currentStatusRender(resource: Patient | Condition | Observation | MedicationStatement | Encounter | Procedure): string {
  const status = toRecord(resource).status;
  if (!status) return '';
  return String(status);
}

// --- Date column — current "empty = empty" baseline -------------------------------------

describe('UAT-FU-01: Date extractor — current baseline (RED)', () => {
  it('Patient → returns empty string today (birthDate is NOT in the legacy field list)', () => {
    // CURRENT: getResourceDate falls through every field in its hard-coded list and never
    // reaches `birthDate`, so Patient rows have an empty Date cell. The GREEN flip in
    // Task 2 will introduce per-type dispatch and switch this to '1980-01-15'.
    expect(getResourceDate(patientFixture)).toBe('');
  });

  it('Condition → returns sliced onsetDateTime (legacy fallback already covers this)', () => {
    // CURRENT: `onsetDateTime` IS in the legacy field list (line 65), so Condition already
    // works via the generic extractor. The GREEN flip will keep the same string but route
    // through a typed Condition.onsetDateTime accessor for safety.
    expect(getResourceDate(conditionFixture)).toBe('2024-03-10');
  });

  it('Observation → returns sliced effectiveDateTime (legacy fallback already covers this)', () => {
    expect(getResourceDate(observationFixture)).toBe('2024-05-22');
  });

  it('MedicationStatement → returns sliced effectiveDateTime (legacy fallback already covers this)', () => {
    // CURRENT: `effectiveDateTime` is the FIRST entry in the legacy field list, and Medplum
    // exposes it FLAT (not under .effective.dateTime), so this works today.
    expect(getResourceDate(medicationStatementFixture)).toBe('2024-06-01');
  });

  it('Encounter → returns sliced period.start via the legacy period branch', () => {
    // CURRENT: Encounter has NO `.date` field (Pitfall P-03); the legacy extractor's
    // object-branch at line 71 reads `period.start` — accidentally correct.
    expect(getResourceDate(encounterFixture)).toBe('2024-04-15');
  });

  it('Procedure → returns sliced performedDateTime (legacy fallback already covers this)', () => {
    expect(getResourceDate(procedureFixture)).toBe('2024-02-20');
  });
});

// --- Status column — current "empty = empty" baseline ----------------------------------

describe('UAT-FU-01: Status extractor — current baseline (RED)', () => {
  it('Patient → renders no badge today (Patient.active is boolean, not status; no .status field)', () => {
    // CURRENT: Patient has `.active: boolean` — no `.status` field at all. The inline JSX
    // condition `{toRecord(r).status && ...}` is falsy → no Badge rendered. Effective
    // string in cell is ''. The GREEN flip will map active=true → 'active'.
    expect(currentStatusRender(patientFixture)).toBe('');
  });

  it('Condition → renders no badge today (Condition.clinicalStatus exists; no .status field)', () => {
    // CURRENT: Condition has `.clinicalStatus: CodeableConcept` — NOT `.status`. So
    // `toRecord(r).status` is undefined → no Badge. The GREEN flip will read
    // clinicalStatus.coding[0].code and render 'active' (Pitfall P-01 mitigated).
    expect(currentStatusRender(conditionFixture)).toBe('');
  });

  it('Observation → renders raw status enum (status is a top-level code field)', () => {
    expect(currentStatusRender(observationFixture)).toBe('final');
  });

  it('MedicationStatement → renders raw status enum (status is a top-level code field)', () => {
    expect(currentStatusRender(medicationStatementFixture)).toBe('active');
  });

  it('Encounter → renders raw status enum (status is a top-level code field, REQUIRED)', () => {
    expect(currentStatusRender(encounterFixture)).toBe('finished');
  });

  it('Procedure → renders raw status enum (status is a top-level code field)', () => {
    expect(currentStatusRender(procedureFixture)).toBe('completed');
  });
});
