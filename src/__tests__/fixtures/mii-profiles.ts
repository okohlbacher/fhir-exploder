/**
 * Trimmed MII StructureDefinition fixtures for Phase 05 validator tests.
 *
 * The bundled production profiles are large (200 KB+ each); tests need
 * only the shape `{ url, name, type, snapshot: { element: [{ path, min,
 * mustSupport }] } }`. Each fixture includes:
 * - at least one `mustSupport: true` element
 * - at least one `min: 1` element (cardinality-required)
 * - at least one `value[x]` choice-type element (Pitfall 3 coverage)
 *
 * These are NOT the real canonical profiles — just enough structural
 * shape for hermetic unit tests. Plan 05 bundles the real profiles
 * under src/quality/profiles/.
 */
import type { StructureDefinition } from '@medplum/fhirtypes';

const conditionProfile: StructureDefinition = {
  resourceType: 'StructureDefinition',
  url: 'https://www.medizininformatik-initiative.de/fhir/core/modul-diagnose/StructureDefinition/Diagnose',
  name: 'Diagnose',
  type: 'Condition',
  kind: 'resource',
  abstract: false,
  status: 'active',
  snapshot: {
    element: [
      { path: 'Condition', min: 0 },
      // mustSupport + min=1 — cardinality AND audit-required
      { path: 'Condition.code', min: 1, mustSupport: true },
      // mustSupport only (no min) — audit-required but not cardinality-enforced
      { path: 'Condition.subject', min: 1, mustSupport: true },
      // min=1 only (no mustSupport) — cardinality fallback
      { path: 'Condition.clinicalStatus', min: 1 },
      // neither — should be ignored by requiredElementPaths
      { path: 'Condition.note', min: 0 },
    ],
  },
};

const observationProfile: StructureDefinition = {
  resourceType: 'StructureDefinition',
  url: 'https://www.medizininformatik-initiative.de/fhir/core/modul-labor/StructureDefinition/ObservationLab',
  name: 'ObservationLab',
  type: 'Observation',
  kind: 'resource',
  abstract: false,
  status: 'active',
  snapshot: {
    element: [
      { path: 'Observation', min: 0 },
      { path: 'Observation.status', min: 1, mustSupport: true },
      { path: 'Observation.code', min: 1, mustSupport: true },
      { path: 'Observation.subject', min: 1, mustSupport: true },
      // Choice-type element (Pitfall 3) — stored as `value[x]` in
      // StructureDefinition but present as valueQuantity / valueString /
      // valueCodeableConcept / etc. on real resources.
      { path: 'Observation.value[x]', min: 0, mustSupport: true },
      { path: 'Observation.effective[x]', min: 0, mustSupport: true },
    ],
  },
};

export const miniProfiles = {
  condition: conditionProfile,
  observation: observationProfile,
} as const;
