/**
 * Key-fields registry for the 4-mode resource shell Summary tab (SHELL-02, D-06).
 *
 * Returns 4-6 clinically meaningful fields per R4 resource type, complementing
 * summarizeResource().primary without repeating it. Generic fallback returns
 * the first 4 non-meta fields as best-effort JSON previews.
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
} from '@medplum/fhirtypes';
import { toRecord } from './fhir-helpers';

export interface KeyFieldEntry {
  label: string;
  value: string | undefined;
}

export function getKeyFields(r: Resource): KeyFieldEntry[] {
  switch (r.resourceType) {
    case 'Patient':             return patientFields(r as Patient);
    case 'Observation':         return observationFields(r as Observation);
    case 'Condition':           return conditionFields(r as Condition);
    case 'Encounter':           return encounterFields(r as Encounter);
    case 'MedicationStatement': return medicationStatementFields(r as MedicationStatement);
    case 'Procedure':           return procedureFields(r as Procedure);
    case 'DiagnosticReport':    return diagnosticReportFields(r as DiagnosticReport);
    case 'AllergyIntolerance':  return allergyIntoleranceFields(r as AllergyIntolerance);
    default:                    return genericFields(r);
  }
}

function patientFields(p: Patient): KeyFieldEntry[] {
  const status =
    p.active === true ? 'Active' : p.active === false ? 'Inactive' : undefined;
  return [
    { label: 'Status',     value: status },
    { label: 'Gender',     value: p.gender },
    { label: 'Birth date', value: p.birthDate },
    { label: 'Identifier', value: p.identifier?.[0]?.value },
    { label: 'Phone',      value: p.telecom?.find((t) => t.system === 'phone')?.value },
  ];
}

function observationFields(o: Observation): KeyFieldEntry[] {
  return [
    { label: 'Status',    value: o.status },
    { label: 'Category',  value: o.category?.[0]?.coding?.[0]?.display ?? o.category?.[0]?.text },
    { label: 'Code',      value: o.code?.text ?? o.code?.coding?.[0]?.display },
    { label: 'Effective', value: o.effectiveDateTime ?? o.effectivePeriod?.start },
    { label: 'Subject',   value: o.subject?.reference },
  ];
}

function conditionFields(c: Condition): KeyFieldEntry[] {
  return [
    { label: 'Clinical status',      value: c.clinicalStatus?.coding?.[0]?.code ?? c.clinicalStatus?.text },
    { label: 'Verification status',  value: c.verificationStatus?.coding?.[0]?.code ?? c.verificationStatus?.text },
    { label: 'Category',             value: c.category?.[0]?.coding?.[0]?.display ?? c.category?.[0]?.text },
    { label: 'Onset',                value: c.onsetDateTime ?? c.onsetPeriod?.start },
    { label: 'Subject',              value: c.subject?.reference },
  ];
}

function encounterFields(e: Encounter): KeyFieldEntry[] {
  const periodStart = e.period?.start;
  const periodEnd = e.period?.end;
  const period =
    periodStart && periodEnd
      ? `${periodStart} → ${periodEnd}`
      : periodStart;
  return [
    { label: 'Status',  value: e.status },
    { label: 'Class',   value: e.class?.code ?? e.class?.display },
    { label: 'Type',    value: e.type?.[0]?.coding?.[0]?.display ?? e.type?.[0]?.text },
    { label: 'Period',  value: period },
    { label: 'Subject', value: e.subject?.reference },
  ];
}

function medicationStatementFields(ms: MedicationStatement): KeyFieldEntry[] {
  const medication =
    ms.medicationCodeableConcept?.text ??
    ms.medicationCodeableConcept?.coding?.[0]?.display ??
    ms.medicationReference?.reference;
  return [
    { label: 'Status',     value: ms.status },
    { label: 'Medication', value: medication },
    { label: 'Effective',  value: ms.effectiveDateTime ?? ms.effectivePeriod?.start },
    { label: 'Subject',    value: ms.subject?.reference },
    { label: 'Dosage',     value: ms.dosage?.[0]?.text },
  ];
}

function procedureFields(p: Procedure): KeyFieldEntry[] {
  return [
    { label: 'Status',    value: p.status },
    { label: 'Code',      value: p.code?.text ?? p.code?.coding?.[0]?.display },
    { label: 'Performed', value: p.performedDateTime ?? p.performedPeriod?.start },
    { label: 'Subject',   value: p.subject?.reference },
    { label: 'Outcome',   value: p.outcome?.text ?? p.outcome?.coding?.[0]?.display },
  ];
}

function diagnosticReportFields(dr: DiagnosticReport): KeyFieldEntry[] {
  return [
    { label: 'Status',    value: dr.status },
    { label: 'Category',  value: dr.category?.[0]?.coding?.[0]?.display ?? dr.category?.[0]?.text },
    { label: 'Code',      value: dr.code?.text ?? dr.code?.coding?.[0]?.display },
    { label: 'Effective', value: dr.effectiveDateTime ?? dr.effectivePeriod?.start },
    { label: 'Subject',   value: dr.subject?.reference },
  ];
}

function allergyIntoleranceFields(ai: AllergyIntolerance): KeyFieldEntry[] {
  return [
    { label: 'Clinical status',     value: ai.clinicalStatus?.coding?.[0]?.code ?? ai.clinicalStatus?.text },
    { label: 'Verification status', value: ai.verificationStatus?.coding?.[0]?.code ?? ai.verificationStatus?.text },
    { label: 'Category',            value: ai.category?.[0] },
    { label: 'Substance',           value: ai.code?.text ?? ai.code?.coding?.[0]?.display },
    { label: 'Patient',             value: ai.patient?.reference },
  ];
}

function genericFields(r: Resource): KeyFieldEntry[] {
  const obj = toRecord(r);
  const skip = new Set(['resourceType', 'id', 'meta', 'text']);
  const keys = Object.keys(obj).filter((k) => !skip.has(k)).slice(0, 4);
  return keys.map((k) => ({
    label: k,
    value: JSON.stringify(obj[k]).slice(0, 80),
  }));
}
