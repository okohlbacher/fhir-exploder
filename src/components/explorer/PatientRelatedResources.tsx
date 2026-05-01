import { reverseReferenceCatalog } from '../../utils/reverseReferenceCatalog';
import { RelatedResourcesPanel } from './RelatedResourcesPanel';

export interface PatientRelatedResourcesProps {
  patientId: string;
}

/**
 * Patient-detail "Related Resources" panel (D-05).
 *
 * Thin wrapper around <RelatedResourcesPanel> that consumes the Patient
 * entry from the reverseReferenceCatalog. Same export name, same prop
 * signature as before — D-19 backwards-compat invariant. The internal
 * RELATED_TYPES array was promoted to src/utils/reverseReferenceCatalog.ts
 * (Plan 48-01) so this wrapper now reads it from a single source of truth.
 */
export function PatientRelatedResources({ patientId }: PatientRelatedResourcesProps) {
  const entries = reverseReferenceCatalog.Patient ?? [];
  const refValue = `Patient/${patientId}`;
  return (
    <RelatedResourcesPanel
      title="Related Resources"
      entries={entries}
      refValue={refValue}
      onCardNavigate={(e) => `/explorer/${e.type}?${e.param}=${refValue}`}
    />
  );
}
