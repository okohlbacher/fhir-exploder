import { describe, it, expect } from 'vitest';
import { getKeyFields } from '../keyFieldsRegistry';
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
} from '@medplum/fhirtypes';

describe('keyFieldsRegistry (SHELL-02)', () => {
  // Covers the "8 typed pickers + generic fallback" test name from RESEARCH §Test Map
  describe('8 typed pickers + generic fallback', () => {
    describe('Patient', () => {
      it('returns 5 typed fields with expected labels and values', () => {
        const p: Patient = {
          resourceType: 'Patient',
          id: 'p1',
          active: true,
          gender: 'male',
          birthDate: '1990-01-01',
          identifier: [{ value: 'MRN-1' }],
          telecom: [{ system: 'phone', value: '555-1234' }],
        };
        const fields = getKeyFields(p);
        expect(fields.map((f) => f.label)).toEqual(['Status', 'Gender', 'Birth date', 'Identifier', 'Phone']);
        expect(fields.map((f) => f.value)).toEqual(['Active', 'male', '1990-01-01', 'MRN-1', '555-1234']);
        expect(fields.length).toBe(5);
      });

      it('handles undefined active flag', () => {
        const p: Patient = { resourceType: 'Patient', id: 'p2' };
        const fields = getKeyFields(p);
        const statusField = fields.find((f) => f.label === 'Status');
        expect(statusField?.value).toBeUndefined();
      });

      it('maps active=false to Inactive', () => {
        const p: Patient = { resourceType: 'Patient', id: 'p3', active: false };
        const fields = getKeyFields(p);
        expect(fields[0].value).toBe('Inactive');
      });
    });

    describe('Observation', () => {
      it('returns 5 typed fields with expected labels and values', () => {
        const o: Observation = {
          resourceType: 'Observation',
          id: 'o1',
          status: 'final',
          code: { text: 'Heart rate', coding: [{ display: 'HR' }] },
          category: [{ coding: [{ display: 'Vital signs' }] }],
          effectiveDateTime: '2024-01-01T10:00:00Z',
          subject: { reference: 'Patient/p1' },
        };
        const fields = getKeyFields(o);
        expect(fields.map((f) => f.label)).toEqual(['Status', 'Category', 'Code', 'Effective', 'Subject']);
        expect(fields[0].value).toBe('final');
        expect(fields[1].value).toBe('Vital signs');
        expect(fields[2].value).toBe('Heart rate');
        expect(fields[3].value).toBe('2024-01-01T10:00:00Z');
        expect(fields[4].value).toBe('Patient/p1');
      });

      it('falls back to code.coding[0].display when code.text is absent', () => {
        const o: Observation = {
          resourceType: 'Observation',
          id: 'o2',
          status: 'final',
          code: { coding: [{ display: 'HR' }] },
        };
        const fields = getKeyFields(o);
        const codeField = fields.find((f) => f.label === 'Code');
        expect(codeField?.value).toBe('HR');
      });
    });

    describe('Condition', () => {
      it('returns 5 typed fields with expected labels and values', () => {
        const c: Condition = {
          resourceType: 'Condition',
          id: 'c1',
          clinicalStatus: { coding: [{ code: 'active' }] },
          verificationStatus: { coding: [{ code: 'confirmed' }] },
          category: [{ coding: [{ display: 'Encounter diagnosis' }] }],
          onsetDateTime: '2023-06-01',
          subject: { reference: 'Patient/p1' },
        };
        const fields = getKeyFields(c);
        expect(fields.map((f) => f.label)).toEqual([
          'Clinical status', 'Verification status', 'Category', 'Onset', 'Subject',
        ]);
        expect(fields[0].value).toBe('active');
        expect(fields[1].value).toBe('confirmed');
        expect(fields[2].value).toBe('Encounter diagnosis');
        expect(fields[3].value).toBe('2023-06-01');
        expect(fields[4].value).toBe('Patient/p1');
      });

      it('returns undefined for missing clinical status', () => {
        const c: Condition = { resourceType: 'Condition', id: 'c2', subject: { reference: 'Patient/p1' } };
        const fields = getKeyFields(c);
        const clinField = fields.find((f) => f.label === 'Clinical status');
        expect(clinField?.value).toBeUndefined();
      });
    });

    describe('Encounter', () => {
      it('returns 5 typed fields with period formatted as start → end', () => {
        const e: Encounter = {
          resourceType: 'Encounter',
          id: 'e1',
          status: 'finished',
          class: { code: 'AMB', display: 'ambulatory' },
          type: [{ coding: [{ display: 'Office visit' }] }],
          period: { start: '2024-01-01', end: '2024-01-02' },
          subject: { reference: 'Patient/p1' },
        };
        const fields = getKeyFields(e);
        expect(fields.map((f) => f.label)).toEqual(['Status', 'Class', 'Type', 'Period', 'Subject']);
        expect(fields[0].value).toBe('finished');
        expect(fields[1].value).toBe('AMB');
        expect(fields[2].value).toBe('Office visit');
        expect(fields[3].value).toBe('2024-01-01 → 2024-01-02');
        expect(fields[4].value).toBe('Patient/p1');
      });

      it('returns only start when period has no end', () => {
        const e: Encounter = {
          resourceType: 'Encounter',
          id: 'e2',
          status: 'in-progress',
          class: { code: 'IMP' },
          period: { start: '2024-01-01' },
          subject: { reference: 'Patient/p1' },
        };
        const fields = getKeyFields(e);
        const periodField = fields.find((f) => f.label === 'Period');
        expect(periodField?.value).toBe('2024-01-01');
      });
    });

    describe('MedicationStatement', () => {
      it('returns 5 typed fields', () => {
        const ms: MedicationStatement = {
          resourceType: 'MedicationStatement',
          id: 'ms1',
          status: 'active',
          medicationCodeableConcept: { text: 'Aspirin 100mg' },
          effectiveDateTime: '2024-01-01',
          subject: { reference: 'Patient/p1' },
          dosage: [{ text: '1 tablet once daily' }],
        };
        const fields = getKeyFields(ms);
        expect(fields.map((f) => f.label)).toEqual(['Status', 'Medication', 'Effective', 'Subject', 'Dosage']);
        expect(fields[0].value).toBe('active');
        expect(fields[1].value).toBe('Aspirin 100mg');
        expect(fields[2].value).toBe('2024-01-01');
        expect(fields[3].value).toBe('Patient/p1');
        expect(fields[4].value).toBe('1 tablet once daily');
      });

      it('falls back to medicationReference when no CodeableConcept', () => {
        const ms: MedicationStatement = {
          resourceType: 'MedicationStatement',
          id: 'ms2',
          status: 'active',
          medicationReference: { reference: 'Medication/med1' },
          subject: { reference: 'Patient/p1' },
        };
        const fields = getKeyFields(ms);
        const medField = fields.find((f) => f.label === 'Medication');
        expect(medField?.value).toBe('Medication/med1');
      });
    });

    describe('Procedure', () => {
      it('returns 5 typed fields', () => {
        const p: Procedure = {
          resourceType: 'Procedure',
          id: 'pr1',
          status: 'completed',
          code: { text: 'Appendectomy', coding: [{ display: 'App' }] },
          performedDateTime: '2024-01-15',
          subject: { reference: 'Patient/p1' },
          outcome: { text: 'Successful' },
        };
        const fields = getKeyFields(p);
        expect(fields.map((f) => f.label)).toEqual(['Status', 'Code', 'Performed', 'Subject', 'Outcome']);
        expect(fields[0].value).toBe('completed');
        expect(fields[1].value).toBe('Appendectomy');
        expect(fields[2].value).toBe('2024-01-15');
        expect(fields[3].value).toBe('Patient/p1');
        expect(fields[4].value).toBe('Successful');
      });

      it('returns undefined outcome when not set', () => {
        const p: Procedure = {
          resourceType: 'Procedure',
          id: 'pr2',
          status: 'in-progress',
          code: { text: 'Surgery' },
          subject: { reference: 'Patient/p1' },
        };
        const fields = getKeyFields(p);
        const outcomeField = fields.find((f) => f.label === 'Outcome');
        expect(outcomeField?.value).toBeUndefined();
      });
    });

    describe('DiagnosticReport', () => {
      it('returns 5 typed fields', () => {
        const dr: DiagnosticReport = {
          resourceType: 'DiagnosticReport',
          id: 'dr1',
          status: 'final',
          category: [{ coding: [{ display: 'Laboratory' }] }],
          code: { text: 'CBC' },
          effectiveDateTime: '2024-01-20',
          subject: { reference: 'Patient/p1' },
        };
        const fields = getKeyFields(dr);
        expect(fields.map((f) => f.label)).toEqual(['Status', 'Category', 'Code', 'Effective', 'Subject']);
        expect(fields[0].value).toBe('final');
        expect(fields[1].value).toBe('Laboratory');
        expect(fields[2].value).toBe('CBC');
        expect(fields[3].value).toBe('2024-01-20');
        expect(fields[4].value).toBe('Patient/p1');
      });

      it('falls back to code.coding display when code.text is absent', () => {
        const dr: DiagnosticReport = {
          resourceType: 'DiagnosticReport',
          id: 'dr2',
          status: 'preliminary',
          code: { coding: [{ display: 'Complete blood count' }] },
          subject: { reference: 'Patient/p1' },
        };
        const fields = getKeyFields(dr);
        const codeField = fields.find((f) => f.label === 'Code');
        expect(codeField?.value).toBe('Complete blood count');
      });
    });

    describe('AllergyIntolerance', () => {
      it('returns 5 typed fields', () => {
        const ai: AllergyIntolerance = {
          resourceType: 'AllergyIntolerance',
          id: 'ai1',
          clinicalStatus: { coding: [{ code: 'active' }] },
          verificationStatus: { coding: [{ code: 'confirmed' }] },
          category: ['food'],
          code: { text: 'Peanuts' },
          patient: { reference: 'Patient/p1' },
        };
        const fields = getKeyFields(ai);
        expect(fields.map((f) => f.label)).toEqual([
          'Clinical status', 'Verification status', 'Category', 'Substance', 'Patient',
        ]);
        expect(fields[0].value).toBe('active');
        expect(fields[1].value).toBe('confirmed');
        expect(fields[2].value).toBe('food');
        expect(fields[3].value).toBe('Peanuts');
        expect(fields[4].value).toBe('Patient/p1');
      });

      it('returns undefined category when category array is empty', () => {
        const ai: AllergyIntolerance = {
          resourceType: 'AllergyIntolerance',
          id: 'ai2',
          patient: { reference: 'Patient/p1' },
        };
        const fields = getKeyFields(ai);
        const catField = fields.find((f) => f.label === 'Category');
        expect(catField?.value).toBeUndefined();
      });
    });
  });

  describe('generic fallback', () => {
    it('returns 4 fields excluding resourceType/id/meta/text', () => {
      const r = {
        resourceType: 'MedicationRequest',
        id: 'm1',
        meta: {},
        text: { div: '' },
        status: 'active',
        intent: 'order',
        subject: { reference: 'Patient/p1' },
        requester: { reference: 'Practitioner/pr1' },
        authoredOn: '2024-01-01',
      } as unknown as Resource;
      const fields = getKeyFields(r);
      expect(fields).toHaveLength(4);
      expect(fields.map((f) => f.label)).not.toContain('resourceType');
      expect(fields.map((f) => f.label)).not.toContain('id');
      expect(fields.map((f) => f.label)).not.toContain('meta');
      expect(fields.map((f) => f.label)).not.toContain('text');
      fields.forEach((f) => expect(f.value!.length).toBeLessThanOrEqual(80));
    });

    it('returns values as JSON.stringify slices of length <= 80', () => {
      const longValue = 'x'.repeat(200);
      const r = {
        resourceType: 'Appointment',
        id: 'ap1',
        longField: longValue,
        shortField: 'hello',
        numField: 42,
        boolField: true,
      } as unknown as Resource;
      const fields = getKeyFields(r);
      expect(fields).toHaveLength(4);
      fields.forEach((f) => {
        if (f.value !== undefined) {
          expect(f.value.length).toBeLessThanOrEqual(80);
        }
      });
    });
  });
});
