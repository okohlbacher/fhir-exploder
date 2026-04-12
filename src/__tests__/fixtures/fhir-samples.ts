/**
 * Hermetic FHIR sample resources for Phase 05 walker tests.
 *
 * These are trimmed to the minimum fields each walker needs:
 * - classifyCodedFields needs CodeableConcept shapes (coding/text keys)
 * - computeCompleteness needs fields referenced by mii-profiles.ts paths
 * - Pitfall 5 coverage: patientWithIdentifiers MUST carry an `identifier`
 *   array so the classifier's every-keys heuristic can be verified to
 *   exclude Identifier objects.
 */
import type { Condition, Observation, Patient } from '@medplum/fhirtypes';

/**
 * Condition with a properly coded ICD-10-GM + SNOMED CodeableConcept in
 * `code`. All three coding classifications are exercised across the
 * three Condition fixtures.
 */
const conditionSystemCode: Condition = {
  resourceType: 'Condition',
  id: 'cond-system-code',
  subject: { reference: 'Patient/pat-1' },
  code: {
    coding: [
      { system: 'http://hl7.org/fhir/sid/icd-10-gm', code: 'E11.9', display: 'Diabetes mellitus' },
      { system: 'http://snomed.info/sct', code: '44054006' },
    ],
    text: 'Type 2 diabetes mellitus',
  },
  onsetDateTime: '2024-03-01',
};

/** Condition where code has only `text` — no coding array. textOnly bucket. */
const conditionTextOnly: Condition = {
  resourceType: 'Condition',
  id: 'cond-text-only',
  subject: { reference: 'Patient/pat-1' },
  code: {
    text: 'Undiagnosed chest pain',
  },
};

/** Condition with empty code (neither coding nor text). empty bucket. */
const conditionEmpty: Condition = {
  resourceType: 'Condition',
  id: 'cond-empty',
  subject: { reference: 'Patient/pat-1' },
  code: {},
};

/**
 * Observation with `code` (CodeableConcept with one LOINC Coding) AND
 * `category` (array of CodeableConcept). Tests walker recursion into
 * arrays and counting of nested CCs.
 */
const observationMultipleCodings: Observation = {
  resourceType: 'Observation',
  id: 'obs-multi',
  status: 'final',
  subject: { reference: 'Patient/pat-1' },
  category: [
    {
      coding: [
        {
          system: 'http://terminology.hl7.org/CodeSystem/observation-category',
          code: 'laboratory',
        },
      ],
    },
  ],
  code: {
    coding: [{ system: 'http://loinc.org', code: '2345-7', display: 'Glucose' }],
  },
  valueQuantity: {
    value: 5.5,
    unit: 'mmol/L',
    system: 'http://unitsofmeasure.org',
    code: 'mmol/L',
  },
  effectiveDateTime: '2024-05-01',
};

/**
 * Observation with `valueString` instead of `valueQuantity` — exercises
 * Pitfall 3 (choice-type `value[x]`) from the other side: the field
 * present is neither the first alphabetical choice nor the common one.
 */
const observationValueString: Observation = {
  resourceType: 'Observation',
  id: 'obs-value-string',
  status: 'final',
  subject: { reference: 'Patient/pat-1' },
  code: {
    coding: [{ system: 'http://loinc.org', code: '11526-1' }],
  },
  valueString: 'Not detected',
  effectiveDateTime: '2024-06-01',
};

/**
 * Patient carrying `identifier` (which has `system` + `value`) — Pitfall
 * 5 target. classifyCodedFields MUST NOT classify `identifier` entries
 * as CodeableConcepts. The keys on Identifier (value, use, type, system)
 * fail the CC every-keys filter.
 */
const patientWithIdentifiers: Patient = {
  resourceType: 'Patient',
  id: 'pat-1',
  identifier: [
    {
      use: 'official',
      system: 'http://example.org/mrn',
      value: 'MRN-12345',
      type: {
        coding: [
          {
            system: 'http://terminology.hl7.org/CodeSystem/v2-0203',
            code: 'MR',
            display: 'Medical record number',
          },
        ],
      },
    },
  ],
  name: [{ family: 'Doe', given: ['Jane'] }],
  birthDate: '1980-01-15',
  gender: 'female',
};

export const codingSamples = {
  conditionSystemCode,
  conditionTextOnly,
  conditionEmpty,
  observationMultipleCodings,
  observationValueString,
  patientWithIdentifiers,
} as const;

/** Grouped view for tests that iterate per-type. */
export const sampleResourcesByType = {
  Condition: [conditionSystemCode, conditionTextOnly, conditionEmpty] as Condition[],
  Observation: [observationMultipleCodings, observationValueString] as Observation[],
  Patient: [patientWithIdentifiers] as Patient[],
} as const;
