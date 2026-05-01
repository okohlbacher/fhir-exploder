import type { Resource } from '@medplum/fhirtypes';
import { reverseReferenceCatalog } from '../../utils/reverseReferenceCatalog';
import { RelatedResourcesPanel } from './RelatedResourcesPanel';

export interface IncomingReferencesPanelProps {
  resource: Resource;
}

/**
 * Renders the "Referenced By" panel for any non-Patient FHIR resource (D-06).
 * Looks up the source-type's catalog entry; returns null when not in catalog or
 * when the resource has no id. Delegates render to <RelatedResourcesPanel>.
 *
 * Title text "Referenced By" is locked per CONTEXT D-06 + UI-SPEC line 87.
 */
export function IncomingReferencesPanel({ resource }: IncomingReferencesPanelProps) {
  const entries = reverseReferenceCatalog[resource.resourceType] ?? [];
  if (entries.length === 0) return null;
  if (!resource.id) return null;
  const refValue = `${resource.resourceType}/${resource.id}`;
  return (
    <RelatedResourcesPanel
      title="Referenced By"
      entries={entries}
      refValue={refValue}
      onCardNavigate={(e) => `/explorer/${e.type}?${e.param}=${refValue}`}
    />
  );
}
