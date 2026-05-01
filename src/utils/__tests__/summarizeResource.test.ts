/**
 * summarizeResource.test.ts — unit tests for src/utils/summarizeResource.ts
 *
 * Phase 46 / NAV-01 — verifies the pure-function `summarizeResource(r, now?)`
 * registry over 8 typed R4 resource types (Patient, Observation, Condition,
 * Encounter, MedicationStatement, Procedure, DiagnosticReport,
 * AllergyIntolerance) plus a generic walker fallback.
 *
 * Sub-decision pins:
 *   A1: gender 'other' → 'O' (NOT 'U')
 *   A2: partial birthDate (length < 10) → omit parenthetical
 *   A3: HumanName legacy comma-join `family, given1, given2`
 *
 * D-12 pin: generic walker ALWAYS returns secondary undefined.
 *
 * Hash determinism (D-03 fallback):
 *   djb2 base36-6 hash on Patient.identifier[0].value when name missing
 *   AND identifier value is not short-alphanumeric (≤6 chars [A-Za-z0-9]).
 */

import { describe, it, expect } from 'vitest';
import type {
  Patient,
  Observation,
  Condition,
  Encounter,
  MedicationStatement,
  Procedure,
  DiagnosticReport,
  AllergyIntolerance,
  Resource,
} from '@medplum/fhirtypes';
import { summarizeResource } from '../summarizeResource';

const fixedNow = new Date('2026-05-01');

describe('summarizeResource - Patient', () => {
  it('formats name + age + gender code from family/given (D-02)', () => {
    const p: Patient = {
      resourceType: 'Patient',
      id: 'p1',
      name: [{ family: 'Mueller', given: ['Anna'] }],
      birthDate: '1958-03-15',
      gender: 'female',
    };
    expect(summarizeResource(p, fixedNow)).toEqual({
      primary: 'Mueller, Anna (68/F)',
      secondary: '1958-03-15',
    });
  });

  it('legacy comma-join with multiple givens — `Mueller, Anna, Maria` (A3 byte-string pin)', () => {
    const p: Patient = {
      resourceType: 'Patient',
      id: 'p-multi',
      name: [{ family: 'Mueller', given: ['Anna', 'Maria'] }],
      birthDate: '1958-03-15',
      gender: 'female',
    };
    const result = summarizeResource(p, fixedNow);
    expect(result.primary).toBe('Mueller, Anna, Maria (68/F)');
    expect(result.primary).toContain('Mueller, Anna, Maria');
  });

  it('uses HumanName.text verbatim when present (text wins over family/given)', () => {
    const p: Patient = {
      resourceType: 'Patient',
      id: 'p-text',
      name: [{ text: 'Dr. Max Mustermann', family: 'Ignored', given: ['Ignored'] }],
      birthDate: '1980-06-01',
      gender: 'male',
    };
    expect(summarizeResource(p, fixedNow)).toEqual({
      primary: 'Dr. Max Mustermann (45/M)',
      secondary: '1980-06-01',
    });
  });

  it('maps gender male → M', () => {
    const p: Patient = {
      resourceType: 'Patient',
      id: 'p-m',
      name: [{ family: 'X', given: ['Y'] }],
      birthDate: '1980-01-01',
      gender: 'male',
    };
    expect(summarizeResource(p, fixedNow).primary).toContain('/M)');
  });

  it('maps gender female → F', () => {
    const p: Patient = {
      resourceType: 'Patient',
      id: 'p-f',
      name: [{ family: 'X', given: ['Y'] }],
      birthDate: '1980-01-01',
      gender: 'female',
    };
    expect(summarizeResource(p, fixedNow).primary).toContain('/F)');
  });

  it("maps gender 'other' → 'O' (A1 pin — NOT 'U'); asserts (45/O)", () => {
    const p: Patient = {
      resourceType: 'Patient',
      id: 'p-o',
      name: [{ family: 'X', given: ['Y'] }],
      birthDate: '1981-01-15',
      gender: 'other',
    };
    const result = summarizeResource(p, fixedNow);
    expect(result.primary).toContain('(45/O)');
    expect(result.primary.endsWith('(45/O)')).toBe(true);
  });

  it("maps gender 'unknown' → 'U'", () => {
    const p: Patient = {
      resourceType: 'Patient',
      id: 'p-u',
      name: [{ family: 'X', given: ['Y'] }],
      birthDate: '1980-01-01',
      gender: 'unknown',
    };
    expect(summarizeResource(p, fixedNow).primary).toContain('/U)');
  });

  it('maps undefined gender → U', () => {
    const p: Patient = {
      resourceType: 'Patient',
      id: 'p-undef',
      name: [{ family: 'X', given: ['Y'] }],
      birthDate: '1980-01-01',
    };
    expect(summarizeResource(p, fixedNow).primary).toContain('/U)');
  });

  it('age boundary: birthday not yet reached → age is one less', () => {
    const p: Patient = {
      resourceType: 'Patient',
      id: 'p-age-pre',
      name: [{ family: 'X', given: ['Y'] }],
      birthDate: '1958-04-15',
      gender: 'female',
    };
    expect(summarizeResource(p, new Date('2026-04-14')).primary).toContain('(67/F)');
  });

  it('age boundary: birthday today → age increments', () => {
    const p: Patient = {
      resourceType: 'Patient',
      id: 'p-age-day',
      name: [{ family: 'X', given: ['Y'] }],
      birthDate: '1958-04-15',
      gender: 'female',
    };
    expect(summarizeResource(p, new Date('2026-04-15')).primary).toContain('(68/F)');
  });

  it('age boundary: day after birthday → still incremented', () => {
    const p: Patient = {
      resourceType: 'Patient',
      id: 'p-age-post',
      name: [{ family: 'X', given: ['Y'] }],
      birthDate: '1958-04-15',
      gender: 'female',
    };
    expect(summarizeResource(p, new Date('2026-04-16')).primary).toContain('(68/F)');
  });

  it('undefined birthDate → primary omits parenthetical; secondary undefined', () => {
    const p: Patient = {
      resourceType: 'Patient',
      id: 'p-nobd',
      name: [{ family: 'Mueller', given: ['Anna'] }],
      gender: 'female',
    };
    const result = summarizeResource(p, fixedNow);
    expect(result.primary).toBe('Mueller, Anna');
    expect(result.secondary).toBeUndefined();
  });

  it("partial birthDate '2026' (length < 10) → omit parenthetical (A2 pin); secondary='2026'", () => {
    const p: Patient = {
      resourceType: 'Patient',
      id: 'p-yearonly',
      name: [{ family: 'Mueller', given: ['Anna'] }],
      birthDate: '2026',
      gender: 'female',
    };
    const result = summarizeResource(p, fixedNow);
    expect(result.primary).toBe('Mueller, Anna');
    expect(result.secondary).toBe('2026');
  });

  it("partial birthDate '2026-05' (length < 10) → omit parenthetical (A2 pin); secondary='2026-05'", () => {
    const p: Patient = {
      resourceType: 'Patient',
      id: 'p-yearmonth',
      name: [{ family: 'Mueller', given: ['Anna'] }],
      birthDate: '2026-05',
      gender: 'female',
    };
    const result = summarizeResource(p, fixedNow);
    expect(result.primary).toBe('Mueller, Anna');
    expect(result.secondary).toBe('2026-05');
  });
});

describe('summarizeResource - Patient name-missing fallback', () => {
  it('short alphanumeric identifier (≤6 chars) → passthrough', () => {
    const p: Patient = {
      resourceType: 'Patient',
      id: 'p-passthru',
      identifier: [{ value: 'P1234' }],
    };
    const result = summarizeResource(p, fixedNow);
    expect(result.primary).toBe('P1234');
    expect(result.secondary).toBeUndefined();
  });

  it('long/non-alphanumeric identifier → djb2 base36-6 hash (deterministic)', () => {
    const p: Patient = {
      resourceType: 'Patient',
      id: 'p-hash',
      identifier: [{ value: 'urn:oid:1.2.3.4.5.6.7.8.9' }],
    };
    const a = summarizeResource(p, fixedNow);
    const b = summarizeResource(p, fixedNow);
    // Determinism (same input → same output)
    expect(a).toEqual(b);
    // 6-character base36 string
    expect(a.primary).toMatch(/^[0-9a-z]{6}$/);
    expect(a.primary.length).toBe(6);
  });

  it('different identifier values → different hashes', () => {
    const p1: Patient = {
      resourceType: 'Patient',
      id: 'p-h1',
      identifier: [{ value: 'urn:oid:1.2.3.4.5.6.7.8.9' }],
    };
    const p2: Patient = {
      resourceType: 'Patient',
      id: 'p-h2',
      identifier: [{ value: 'urn:oid:9.8.7.6.5.4.3.2.1' }],
    };
    const a = summarizeResource(p1, fixedNow);
    const b = summarizeResource(p2, fixedNow);
    expect(a.primary).not.toBe(b.primary);
  });

  it('no name + no identifier → falls back to id', () => {
    const p: Patient = {
      resourceType: 'Patient',
      id: 'pat-xyz-001',
    };
    const result = summarizeResource(p, fixedNow);
    expect(result.primary).toBe('pat-xyz-001');
    expect(result.secondary).toBeUndefined();
  });

  it('name-missing + birthDate present → adds parenthetical to id fallback', () => {
    const p: Patient = {
      resourceType: 'Patient',
      id: 'pat-xyz-001',
      birthDate: '1980-06-01',
      gender: 'male',
    };
    const result = summarizeResource(p, fixedNow);
    expect(result.primary).toBe('pat-xyz-001 (45/M)');
    expect(result.secondary).toBe('1980-06-01');
  });
});

describe('summarizeResource - Patient determinism', () => {
  it('two calls with same patient + same fixed now → identical output (no Date.now, no RNG)', () => {
    const p: Patient = {
      resourceType: 'Patient',
      id: 'p-det',
      name: [{ family: 'Mueller', given: ['Anna', 'Maria'] }],
      birthDate: '1958-03-15',
      gender: 'female',
      identifier: [{ value: 'urn:oid:1.2.3.4.5.6.7.8.9' }],
    };
    const a = summarizeResource(p, fixedNow);
    const b = summarizeResource(p, fixedNow);
    expect(a).toEqual(b);
  });

  it('hash determinism: name-missing + same identifier value → same hash output', () => {
    const p: Patient = {
      resourceType: 'Patient',
      id: 'p-hash-det',
      identifier: [{ value: 'urn:oid:1.2.3.4.5.6.7.8.9' }],
    };
    const a = summarizeResource(p, fixedNow);
    const b = summarizeResource(p, fixedNow);
    expect(a).toEqual(b);
  });
});

describe('summarizeResource - Observation', () => {
  it('lab observation with valueQuantity → "<value> <unit> · <code>" (middot U+00B7)', () => {
    const o: Observation = {
      resourceType: 'Observation',
      id: 'o-lab',
      status: 'final',
      category: [{ coding: [{ code: 'laboratory' }] }],
      code: { coding: [{ display: 'Glucose' }] },
      valueQuantity: { value: 5.4, unit: 'mmol/L' },
      effectiveDateTime: '2026-04-30T08:15:00Z',
    };
    expect(summarizeResource(o, fixedNow)).toEqual({
      primary: '5.4 mmol/L · Glucose',
      secondary: '2026-04-30',
    });
  });

  it('lab observation with valueQuantity.code (no unit) → uses code', () => {
    const o: Observation = {
      resourceType: 'Observation',
      id: 'o-lab-code',
      status: 'final',
      category: [{ coding: [{ code: 'laboratory' }] }],
      code: { coding: [{ display: 'Mass' }] },
      valueQuantity: { value: 100, code: 'mg' },
    };
    const result = summarizeResource(o, fixedNow);
    expect(result.primary).toContain('mg');
    expect(result.primary).toBe('100 mg · Mass');
  });

  it('lab observation with valueString (no Quantity) → renders string · code', () => {
    const o: Observation = {
      resourceType: 'Observation',
      id: 'o-lab-str',
      status: 'final',
      category: [{ coding: [{ code: 'laboratory' }] }],
      code: { coding: [{ display: 'Influenza' }] },
      valueString: 'positive',
    };
    expect(summarizeResource(o, fixedNow).primary).toBe('positive · Influenza');
  });

  it('lab observation with valueCodeableConcept.text → renders text · code', () => {
    const o: Observation = {
      resourceType: 'Observation',
      id: 'o-lab-cc',
      status: 'final',
      category: [{ coding: [{ code: 'laboratory' }] }],
      code: { coding: [{ display: 'SARS-CoV-2' }] },
      valueCodeableConcept: { text: 'Detected' },
    };
    expect(summarizeResource(o, fixedNow).primary).toBe('Detected · SARS-CoV-2');
  });

  it('non-lab observation with valueQuantity → primary=code, secondary=value+unit', () => {
    const o: Observation = {
      resourceType: 'Observation',
      id: 'o-vital',
      status: 'final',
      category: [{ coding: [{ code: 'vital-signs' }] }],
      code: { coding: [{ display: 'Heart rate' }] },
      valueQuantity: { value: 72, unit: '/min' },
      effectiveDateTime: '2026-04-30',
    };
    expect(summarizeResource(o, fixedNow)).toEqual({
      primary: 'Heart rate',
      secondary: '72 /min',
    });
  });

  it('non-lab observation without valueQuantity → secondary=effectiveDateTime', () => {
    const o: Observation = {
      resourceType: 'Observation',
      id: 'o-vital-novq',
      status: 'final',
      category: [{ coding: [{ code: 'vital-signs' }] }],
      code: { coding: [{ display: 'Note' }] },
      effectiveDateTime: '2026-04-30',
    };
    expect(summarizeResource(o, fixedNow)).toEqual({
      primary: 'Note',
      secondary: '2026-04-30',
    });
  });
});

describe('summarizeResource - Condition', () => {
  it('renders code display + onsetDateTime (D-05)', () => {
    const c: Condition = {
      resourceType: 'Condition',
      id: 'c1',
      subject: { reference: 'Patient/p1' },
      code: { coding: [{ display: 'Hypertension' }] },
      onsetDateTime: '2024-01-15',
    };
    expect(summarizeResource(c, fixedNow)).toEqual({
      primary: 'Hypertension',
      secondary: '2024-01-15',
    });
  });

  it('Condition without onset → secondary undefined', () => {
    const c: Condition = {
      resourceType: 'Condition',
      id: 'c2',
      subject: { reference: 'Patient/p1' },
      code: { coding: [{ display: 'Diabetes' }] },
    };
    const result = summarizeResource(c, fixedNow);
    expect(result.primary).toBe('Diabetes');
    expect(result.secondary).toBeUndefined();
  });
});

describe('summarizeResource - Encounter', () => {
  it('renders class.display + period.start (D-06)', () => {
    const e: Encounter = {
      resourceType: 'Encounter',
      id: 'e1',
      status: 'finished',
      class: { code: 'AMB', display: 'ambulatory' },
      period: { start: '2025-06-10T14:00:00Z' },
    };
    expect(summarizeResource(e, fixedNow)).toEqual({
      primary: 'ambulatory',
      secondary: '2025-06-10',
    });
  });

  it('class.display absent → falls through to type[0] display', () => {
    const e: Encounter = {
      resourceType: 'Encounter',
      id: 'e2',
      status: 'finished',
      class: { code: 'AMB' },
      type: [{ coding: [{ display: 'Routine visit' }] }],
    };
    expect(summarizeResource(e, fixedNow).primary).toBe('Routine visit');
  });

  it('class undefined (defensive — schema violation) → uses type[0]', () => {
    const e = {
      resourceType: 'Encounter',
      id: 'e3',
      status: 'finished',
      type: [{ coding: [{ display: 'Routine visit' }] }],
    } as unknown as Encounter;
    expect(summarizeResource(e, fixedNow).primary).toBe('Routine visit');
  });
});

describe('summarizeResource - MedicationStatement', () => {
  it('uses medicationCodeableConcept display + effectiveDateTime (D-07)', () => {
    const m: MedicationStatement = {
      resourceType: 'MedicationStatement',
      id: 'm1',
      status: 'active',
      subject: { reference: 'Patient/p1' },
      medicationCodeableConcept: { coding: [{ display: 'Aspirin' }] },
      effectiveDateTime: '2025-09-01',
    };
    expect(summarizeResource(m, fixedNow)).toEqual({
      primary: 'Aspirin',
      secondary: '2025-09-01',
    });
  });

  it('no medicationCodeableConcept → uses medicationReference.display literal (no resolution)', () => {
    const m: MedicationStatement = {
      resourceType: 'MedicationStatement',
      id: 'm2',
      status: 'active',
      subject: { reference: 'Patient/p1' },
      medicationReference: { reference: 'Medication/abc', display: 'Aspirin 100mg' },
    };
    expect(summarizeResource(m, fixedNow).primary).toBe('Aspirin 100mg');
  });

  it('neither medicationCodeableConcept nor medicationReference → falls back to id', () => {
    const m: MedicationStatement = {
      resourceType: 'MedicationStatement',
      id: 'med-001',
      status: 'active',
      subject: { reference: 'Patient/p1' },
    };
    expect(summarizeResource(m, fixedNow).primary).toBe('med-001');
  });
});

describe('summarizeResource - Procedure', () => {
  it('renders code + performedDateTime (D-08)', () => {
    const p: Procedure = {
      resourceType: 'Procedure',
      id: 'pr1',
      status: 'completed',
      subject: { reference: 'Patient/p1' },
      code: { coding: [{ display: 'Appendectomy' }] },
      performedDateTime: '2024-03-12',
    };
    expect(summarizeResource(p, fixedNow)).toEqual({
      primary: 'Appendectomy',
      secondary: '2024-03-12',
    });
  });
});

describe('summarizeResource - DiagnosticReport', () => {
  it('issued wins over effectiveDateTime (D-09)', () => {
    const d: DiagnosticReport = {
      resourceType: 'DiagnosticReport',
      id: 'd1',
      status: 'final',
      code: { coding: [{ display: 'Lab Report' }] },
      issued: '2026-04-30T10:00:00Z',
      effectiveDateTime: '2026-04-29',
    };
    expect(summarizeResource(d, fixedNow)).toEqual({
      primary: 'Lab Report',
      secondary: '2026-04-30',
    });
  });

  it('no issued → falls back to effectiveDateTime', () => {
    const d: DiagnosticReport = {
      resourceType: 'DiagnosticReport',
      id: 'd2',
      status: 'final',
      code: { coding: [{ display: 'Lab Report' }] },
      effectiveDateTime: '2026-04-29',
    };
    expect(summarizeResource(d, fixedNow).secondary).toBe('2026-04-29');
  });
});

describe('summarizeResource - AllergyIntolerance', () => {
  it('category[0] wins over type (D-10)', () => {
    const a: AllergyIntolerance = {
      resourceType: 'AllergyIntolerance',
      id: 'a1',
      patient: { reference: 'Patient/p1' },
      code: { coding: [{ display: 'Penicillin' }] },
      category: ['medication'],
      type: 'allergy',
    };
    expect(summarizeResource(a, fixedNow)).toEqual({
      primary: 'Penicillin',
      secondary: 'medication',
    });
  });

  it('no category → falls back to type', () => {
    const a: AllergyIntolerance = {
      resourceType: 'AllergyIntolerance',
      id: 'a2',
      patient: { reference: 'Patient/p1' },
      code: { coding: [{ display: 'Latex' }] },
      type: 'intolerance',
    };
    expect(summarizeResource(a, fixedNow)).toEqual({
      primary: 'Latex',
      secondary: 'intolerance',
    });
  });
});

describe('summarizeResource - lab classification', () => {
  it('category[].coding[].code === "laboratory" → lab', () => {
    const o: Observation = {
      resourceType: 'Observation',
      id: 'lab',
      status: 'final',
      category: [{ coding: [{ code: 'laboratory' }] }],
      code: { coding: [{ display: 'Glucose' }] },
      valueQuantity: { value: 5.4, unit: 'mmol/L' },
    };
    expect(summarizeResource(o, fixedNow).primary).toContain('·');
  });

  it('no category → non-lab (no middot in primary)', () => {
    const o: Observation = {
      resourceType: 'Observation',
      id: 'nolab',
      status: 'final',
      code: { coding: [{ display: 'X' }] },
      valueQuantity: { value: 1, unit: 'mg' },
    };
    expect(summarizeResource(o, fixedNow).primary).not.toContain('·');
  });
});

describe('summarizeResource - generic fallback', () => {
  // Use Resource types NOT in the typed registry (Specimen, Practitioner, Device, Location)
  // and assert ONLY the field being tested is present (and resourceType + id).

  it('step 1: code (CodeableConcept) wins', () => {
    const r = {
      resourceType: 'Specimen',
      id: 's1',
      code: { coding: [{ display: 'Blood' }] },
    } as unknown as Resource;
    const result = summarizeResource(r, fixedNow);
    expect(result).toEqual({ primary: 'Blood' });
  });

  it('step 2: type as string', () => {
    const r = {
      resourceType: 'Specimen',
      id: 's2',
      type: 'Tube',
    } as unknown as Resource;
    expect(summarizeResource(r, fixedNow)).toEqual({ primary: 'Tube' });
  });

  it('step 2: type as CodeableConcept', () => {
    const r = {
      resourceType: 'Specimen',
      id: 's3',
      type: { text: 'EDTA Tube' },
    } as unknown as Resource;
    expect(summarizeResource(r, fixedNow)).toEqual({ primary: 'EDTA Tube' });
  });

  it('step 3: category (array, first element)', () => {
    const r = {
      resourceType: 'Specimen',
      id: 's4',
      category: [{ coding: [{ display: 'Specimen Cat' }] }],
    } as unknown as Resource;
    expect(summarizeResource(r, fixedNow)).toEqual({ primary: 'Specimen Cat' });
  });

  it('step 4: name as HumanName[] → formatted (legacy comma-join)', () => {
    const r = {
      resourceType: 'Practitioner',
      id: 'pr1',
      name: [{ family: 'Doe', given: ['John'] }],
    } as unknown as Resource;
    expect(summarizeResource(r, fixedNow)).toEqual({ primary: 'Doe, John' });
  });

  it('step 4: name as string literal', () => {
    const r = {
      resourceType: 'Practitioner',
      id: 'pr2',
      name: 'Dr. Smith',
    } as unknown as Resource;
    expect(summarizeResource(r, fixedNow)).toEqual({ primary: 'Dr. Smith' });
  });

  it('step 5: description (string)', () => {
    const r = {
      resourceType: 'Device',
      id: 'dv1',
      description: 'Pacemaker XYZ',
    } as unknown as Resource;
    expect(summarizeResource(r, fixedNow)).toEqual({ primary: 'Pacemaker XYZ' });
  });

  it('step 6: identifier[0].value', () => {
    const r = {
      resourceType: 'Location',
      id: 'l1',
      identifier: [{ value: 'LOC-001' }],
    } as unknown as Resource;
    expect(summarizeResource(r, fixedNow)).toEqual({ primary: 'LOC-001' });
  });

  it('step 7: id last resort', () => {
    const r = {
      resourceType: 'Specimen',
      id: 'spec-fallback',
    } as unknown as Resource;
    expect(summarizeResource(r, fixedNow)).toEqual({ primary: 'spec-fallback' });
  });

  it('D-12: generic ALWAYS returns secondary undefined (no `secondary` key)', () => {
    const r = {
      resourceType: 'Specimen',
      id: 'sX',
      code: { coding: [{ display: 'X' }] },
    } as unknown as Resource;
    const result = summarizeResource(r, fixedNow);
    expect(result).toEqual({ primary: 'X' });
    expect('secondary' in result).toBe(false);
  });
});
