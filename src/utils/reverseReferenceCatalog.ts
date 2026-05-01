/**
 * Reverse-reference catalog — REVR-01.
 *
 * Maps each "currently-viewed" FHIR R4 resource type to the FHIR resource types that
 * may carry a Reference back to it, plus the SearchParameter name to use for filtering.
 *
 * Consumed by:
 *   - PatientRelatedResources (Patient key) — Phase 48-03
 *   - IncomingReferencesPanel (all keys)    — Phase 48-02
 *   - ResourceGraphView                       — Phase 49 (G1 incoming-edge discovery)
 *
 * Verification: every {type, param} pair was verified against
 *   1. The Blaze CapabilityStatement live probe (curl http://localhost:8080/fhir/metadata, 2026-05-01)
 *   2. The FHIR R4 SearchParameter registry (https://hl7.org/fhir/R4/searchparameter-registry.html)
 *
 * Catalog corrections from the original CONTEXT D-03 proposal (per 48-RESEARCH.md Findings §1):
 *   - DROPPED: { MedicationStatement, 'reason-reference' } from Condition source list — does not exist in R4
 *   - KEPT (already correct in D-03): { MedicationStatement, 'context' } in Encounter source list
 *
 * NOT consumed: Phase 47's useReferenceResolver cache (count queries are bundle.total fetches,
 * cache populates nothing useful per CONTEXT D-18).
 */
import type { ResourceType } from '@medplum/fhirtypes';

export interface ReverseReferenceEntry {
  type: ResourceType;
  param: string;
  icon?: string;
}

export type ReverseReferenceCatalog = Partial<Record<ResourceType, readonly ReverseReferenceEntry[]>>;

export const reverseReferenceCatalog = {
  Patient: [
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
  ],
  Observation: [
    { type: 'DiagnosticReport', param: 'result' },
    { type: 'Observation',      param: 'has-member' },
    { type: 'Observation',      param: 'derived-from' },
    { type: 'Provenance',       param: 'target' },
  ],
  Condition: [
    { type: 'Encounter',  param: 'reason-reference' },
    { type: 'Procedure',  param: 'reason-reference' },
    // NOTE: D-03 originally listed { MedicationStatement, 'reason-reference' } here.
    // Removed per 48-RESEARCH.md Findings §1.b — the SearchParameter does not exist in R4.
    { type: 'Provenance', param: 'target' },
  ],
  Encounter: [
    { type: 'Observation',         param: 'encounter' },
    { type: 'Condition',           param: 'encounter' },
    { type: 'Procedure',           param: 'encounter' },
    { type: 'DiagnosticReport',    param: 'encounter' },
    { type: 'MedicationStatement', param: 'context' },          // R4 uses 'context' not 'encounter' (Pitfall 1.a)
    { type: 'MedicationRequest',   param: 'encounter' },
  ],
  MedicationStatement: [
    { type: 'Provenance', param: 'target' },
  ],
  Procedure: [
    { type: 'DiagnosticReport', param: 'based-on' },
    { type: 'Provenance',       param: 'target' },
  ],
  DiagnosticReport: [
    { type: 'Observation', param: 'has-member' },
    { type: 'Provenance',  param: 'target' },
  ],
  AllergyIntolerance: [
    { type: 'Provenance', param: 'target' },
  ],
  Practitioner: [
    { type: 'Encounter',        param: 'practitioner' },
    { type: 'Procedure',        param: 'performer' },
    { type: 'Observation',      param: 'performer' },
    { type: 'DiagnosticReport', param: 'performer' },
    { type: 'Condition',        param: 'asserter' },
  ],
} as const satisfies ReverseReferenceCatalog;
