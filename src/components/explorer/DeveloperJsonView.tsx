import type { Resource } from '@medplum/fhirtypes';
import { JsonViewer } from '../json/JsonViewer';

export interface DeveloperJsonViewProps {
  resource: Resource;
}

/**
 * Developer/JSON display mode for ResourceDetailPage. Now a thin shim over
 * JsonViewer (PEEK-06 single source of truth). The h='calc(100vh - 250px)'
 * preserves the v1.7 in-page layout — the drawer call site uses h='100%'
 * (the JsonViewer default).
 *
 * Top-level keys are expanded by default. Nested objects and arrays
 * can be expanded/collapsed by clicking. Leaf values are color-coded.
 */
export function DeveloperJsonView({ resource }: DeveloperJsonViewProps) {
  return <JsonViewer resource={resource} h="calc(100vh - 250px)" />;
}
